"use strict";

/**
 * Director IA — M2 documents metadata: registros de public.folio_archivos (read-only).
 * SELECT propio sin columnas de almacenamiento. Authz reutiliza folio_status.
 * Sin HTTP. Sin almacenamiento externo. Sin mutaciones.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  assertFolioStatusAccess,
  parseFolioRefs,
  getFolioById,
  getFolioByNumero,
  folioVisibleToAuth,
  folioInPlantScope,
  requirePlantaId,
} = require("./director-ia-m2-folio-status");

const FOLIO_DOCUMENTS_SEMANTIC_CLASS = "folio_documents_metadata";
const SOURCE = "public.folio_archivos";
const DOC_LIMIT = 50;

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de metadata documental",
  };
}

function observedText(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function projectDocument(row) {
  return {
    document_id: row && row.id != null ? Number(row.id) : null,
    tipo: observedText(row && row.tipo),
    status: observedText(row && row.status),
    file_name: observedText(row && row.file_name),
    subido_en: row && row.subido_en != null ? row.subido_en : null,
    source: SOURCE,
  };
}

const METADATA_SELECT = `
      SELECT fa.id, fa.folio_id, fa.numero_folio, fa.tipo, fa.status, fa.file_name, fa.subido_en
        FROM public.folio_archivos fa`;

async function listDocumentsMetadataForFolio(client, folio, opts = {}) {
  const folioId = folio && folio.id != null ? Number(folio.id) : null;
  const numero = folio && folio.numero_folio != null ? String(folio.numero_folio).trim() : "";
  const limit = opts.limit != null ? Number(opts.limit) : DOC_LIMIT;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 80) : DOC_LIMIT;
  const r = await client.query(
    `${METADATA_SELECT}
       WHERE ($1::int IS NOT NULL AND fa.folio_id = $1)
          OR ($2::text <> '' AND fa.numero_folio = $2)
       ORDER BY fa.subido_en ASC NULLS LAST, fa.id ASC NULLS LAST
       LIMIT $3`,
    [Number.isFinite(folioId) && folioId > 0 ? folioId : null, numero, safeLimit + 1]
  );
  const rows = r.rows || [];
  const truncated = rows.length > safeLimit;
  return { rows: truncated ? rows.slice(0, safeLimit) : rows, truncated, limit: safeLimit };
}

function resolveLookup(question) {
  const refs = parseFolioRefs(question);
  if (refs.ids.length > 1 && refs.numeros.length === 0) {
    return { ok: false, status: 400, error: "Indica un solo folio para consultar los registros documentales." };
  }
  if (refs.numeros.length > 1) {
    return { ok: false, status: 400, error: "Indica un solo folio para consultar los registros documentales." };
  }
  if (refs.ids.length === 1 && refs.numeros.length === 1) {
    return { ok: true, lookup: "id_or_numero", id: refs.ids[0], numero: refs.numeros[0] };
  }
  if (refs.ids.length === 1) {
    return { ok: true, lookup: "id", id: refs.ids[0], numero: null };
  }
  if (refs.numeros.length === 1) {
    return { ok: true, lookup: "numero_folio", id: null, numero: refs.numeros[0] };
  }
  return {
    ok: false,
    status: 400,
    error: "Indica el folio (id o numero_folio) para consultar los registros documentales.",
  };
}

async function loadFolioDocumentsMetadataForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const lookup = resolveLookup(question);
  if (!lookup.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: lookup.status,
      error: lookup.error,
    };
  }

  const byId = opts.getFolioById || getFolioById;
  const byNumero = opts.getFolioByNumero || getFolioByNumero;
  const listFn = opts.listDocumentsMetadataForFolio || listDocumentsMetadataForFolio;

  async function resolveFolio(client) {
    if (lookup.lookup === "id") return byId(client, lookup.id);
    if (lookup.lookup === "numero_folio") return byNumero(client, lookup.numero);
    const byIdRow = await byId(client, lookup.id);
    const byNumRow = await byNumero(client, lookup.numero);
    if (byIdRow && byNumRow && Number(byIdRow.id) !== Number(byNumRow.id)) {
      return { __ambiguous: true };
    }
    return byIdRow || byNumRow;
  }

  async function run(client) {
    const folio = await resolveFolio(client);
    if (folio && folio.__ambiguous) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
        status: 400,
        error: "Identificador de folio ambiguo. Indica solo el id o solo el numero_folio.",
      };
    }
    if (!folio) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Folio no encontrado",
        lookup: lookup.lookup,
      };
    }
    const vis = folioVisibleToAuth(auth, folio);
    if (!vis.ok) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Folio no encontrado",
        lookup: lookup.lookup,
      };
    }
    if (!folioInPlantScope(folio, Number(plantaId), opts.resolveEquivalentIds)) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para este folio",
        lookup: lookup.lookup,
      };
    }

    const listed = await listFn(client, folio, { limit: opts.limit });
    const documents = (listed.rows || []).map((row) => projectDocument(row));
    return {
      ok: true,
      planta_id: Number(plantaId),
      folio_id: folio.id != null ? Number(folio.id) : null,
      numero_folio: folio.numero_folio || null,
      folio_codigo: folio.folio_codigo || null,
      planta_nombre: folio.planta_nombre || null,
      lookup: lookup.lookup,
      count: documents.length,
      truncated: !!listed.truncated,
      documents,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: FOLIO_DOCUMENTS_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.getFolioById && opts.getFolioByNumero && opts.listDocumentsMetadataForFolio);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de metadata documental no disponible");
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message);
  } finally {
    client.release();
  }
}

function buildFolioDocumentsMetadataAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar los registros documentales de este folio.";
    }
    if (payload && payload.status === 404) {
      return "No encontré ese folio en el alcance de la planta autorizada. No invento registros documentales.";
    }
    if (payload && payload.status === 400) {
      return payload.error || "Indica un folio para consultar los registros documentales.";
    }
    return "No pude consultar la metadata documental por un error de fuente. No invento registros.";
  }

  const id = payload.numero_folio || payload.folio_id;
  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  if (!payload.documents || payload.documents.length === 0) {
    return (
      `Folio ${id} (${scope}): no hay registros documentales encontrados. ` +
      "Estos son los registros documentales que existen para este folio. " +
      "No infiero documentos obligatorios ni cumplimiento documental."
    );
  }
  const trunc = payload.truncated ? ` Listado truncado a ${payload.count} registros.` : "";
  const lines = payload.documents.slice(0, 16).map((doc, i) => {
    const when = doc.subido_en != null ? String(doc.subido_en) : "fecha no registrada";
    const tipo = doc.tipo || "tipo no registrado";
    const status = doc.status || "status no registrado";
    const name = doc.file_name || "nombre no registrado";
    return `${i + 1}. ${tipo} (${status}); ${name}; ${when}`;
  });
  return (
    `${payload.count} registro(s) documental(es) de folio ${id} (${scope}).${trunc} ` +
    `Estos son los registros documentales que existen para este folio. ` +
    `Hechos observados en ${SOURCE}. No es contenido, PDF ni Action Register. ` +
    `No infiero documentos obligatorios ni cumplimiento documental.\n` +
    lines.join("\n")
  );
}

function buildFolioDocumentsMetadataChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildFolioDocumentsMetadataAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else if (payload && payload.code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) {
      veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: "folio_documents_metadata",
      requested_domain: "documentos",
      openai_called: false,
      veracity,
      semantic_class: FOLIO_DOCUMENTS_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
    },
    folio_documents: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          folio_id: payload.folio_id,
          numero_folio: payload.numero_folio,
          planta_nombre: payload.planta_nombre,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
          count: payload.count,
          truncated: payload.truncated,
          documents: payload.documents,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "documentos", label: "Documentos y medios de folio" }
        : undefined,
  };
}

module.exports = {
  FOLIO_DOCUMENTS_SEMANTIC_CLASS,
  SOURCE,
  DOC_LIMIT,
  projectDocument,
  listDocumentsMetadataForFolio,
  loadFolioDocumentsMetadataForChat,
  buildFolioDocumentsMetadataAnswer,
  buildFolioDocumentsMetadataChatResult,
};
