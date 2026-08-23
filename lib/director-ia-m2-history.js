"use strict";

/**
 * Director IA — M2 history: eventos de public.folio_historial (read-only, in-process).
 * SELECT equivalente a getHistorialByFolioId / getHistorial, con id + OR numero.
 * Authz/resolución reutiliza folio_status. Sin HTTP. Sin maybeAdvance. Sin dedupe.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  ESTADOS,
  estatusToEtapaVisual,
  getEtapaVisibleLabel,
  assertFolioStatusAccess,
  parseFolioRefs,
  getFolioById,
  getFolioByNumero,
  folioVisibleToAuth,
  folioInPlantScope,
  requirePlantaId,
} = require("./director-ia-m2-folio-status");

const FOLIO_HISTORY_SEMANTIC_CLASS = "folio_history_events";
const SOURCE = "public.folio_historial";
const EVENT_LIMIT = 80;

const KNOWN_ESTATUS = new Set(Object.values(ESTADOS));

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de historial",
  };
}

function eventEtapaFromEstatus(estatus) {
  const raw = estatus != null ? String(estatus).trim() : "";
  if (!raw) {
    return { estatus: null, etapa: null, etapa_derived: false, etapa_label: null };
  }
  const upper = raw.toUpperCase();
  const mapeable = KNOWN_ESTATUS.has(upper) || /RECHAZADO_ZP/.test(upper);
  if (!mapeable) {
    return { estatus: raw, etapa: null, etapa_derived: false, etapa_label: null };
  }
  const etapa = estatusToEtapaVisual(raw);
  return {
    estatus: raw,
    etapa,
    etapa_derived: true,
    etapa_label: getEtapaVisibleLabel(raw),
  };
}

function sortHistorialRows(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a && a.creado_en != null ? new Date(a.creado_en).getTime() : Number.POSITIVE_INFINITY;
    const tb = b && b.creado_en != null ? new Date(b.creado_en).getTime() : Number.POSITIVE_INFINITY;
    const na = Number.isFinite(ta) ? ta : Number.POSITIVE_INFINITY;
    const nb = Number.isFinite(tb) ? tb : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return (Number(a && a.id) || 0) - (Number(b && b.id) || 0);
  });
}

function projectEvent(row, index) {
  const mapped = eventEtapaFromEstatus(row && row.estatus);
  return {
    event_id: row && row.id != null ? Number(row.id) : null,
    event_index: index,
    estatus: mapped.estatus,
    etapa: mapped.etapa,
    etapa_derived: mapped.etapa_derived,
    etapa_label: mapped.etapa_label,
    comentario: row && row.comentario != null && String(row.comentario).trim() !== "" ? String(row.comentario) : null,
    actor_telefono:
      row && row.actor_telefono != null && String(row.actor_telefono).trim() !== ""
        ? String(row.actor_telefono)
        : null,
    actor_rol: row && row.actor_rol != null && String(row.actor_rol).trim() !== "" ? String(row.actor_rol) : null,
    creado_en: row && row.creado_en != null ? row.creado_en : null,
    source: SOURCE,
  };
}

const HISTORY_SELECT = `
      SELECT h.id, h.folio_id, h.numero_folio, h.folio_codigo,
             h.estatus, h.comentario, h.actor_telefono, h.actor_rol, h.creado_en
        FROM public.folio_historial h`;

async function listHistorialForFolio(client, folio, opts = {}) {
  const folioId = folio && folio.id != null ? Number(folio.id) : null;
  const numero = folio && folio.numero_folio != null ? String(folio.numero_folio).trim() : "";
  const limit = opts.limit != null ? Number(opts.limit) : EVENT_LIMIT;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 120) : EVENT_LIMIT;
  const r = await client.query(
    `${HISTORY_SELECT}
       WHERE ($1::int IS NOT NULL AND h.folio_id = $1)
          OR ($2::text <> '' AND h.numero_folio = $2)
       ORDER BY h.creado_en ASC NULLS LAST, h.id ASC NULLS LAST
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
    return { ok: false, status: 400, error: "Indica un solo folio para consultar el historial." };
  }
  if (refs.numeros.length > 1) {
    return { ok: false, status: 400, error: "Indica un solo folio para consultar el historial." };
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
    error: "Indica el folio (id o numero_folio) para consultar el historial.",
  };
}

async function loadFolioHistoryForChat(pool, plantaId, req, opts = {}) {
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
  const listFn = opts.listHistorialForFolio || listHistorialForFolio;

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
    const ordered = sortHistorialRows(listed.rows || []);
    const events = ordered.map((row, i) => projectEvent(row, i));
    return {
      ok: true,
      planta_id: Number(plantaId),
      folio_id: folio.id != null ? Number(folio.id) : null,
      numero_folio: folio.numero_folio || null,
      folio_codigo: folio.folio_codigo || null,
      planta_nombre: folio.planta_nombre || null,
      lookup: lookup.lookup,
      count: events.length,
      truncated: !!listed.truncated,
      events,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: FOLIO_HISTORY_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.getFolioById && opts.getFolioByNumero && opts.listHistorialForFolio);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de historial no disponible");
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

function formatActor(event) {
  if (event.actor_rol && event.actor_telefono) return `${event.actor_rol} (${event.actor_telefono})`;
  if (event.actor_rol) return event.actor_rol;
  if (event.actor_telefono) return event.actor_telefono;
  return "actor no registrado";
}

function buildFolioHistoryAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar el historial de este folio.";
    }
    if (payload && payload.status === 404) {
      return "No encontré ese folio en el alcance de la planta autorizada. No invento historial.";
    }
    if (payload && payload.status === 400) {
      return payload.error || "Indica un folio para consultar el historial.";
    }
    return "No pude consultar el historial del folio por un error de fuente. No invento eventos.";
  }

  const id = payload.numero_folio || payload.folio_id;
  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  if (!payload.events || payload.events.length === 0) {
    return (
      `Folio ${id} (${scope}): no hay eventos registrados en el historial. ` +
      "No reconstruyo movimientos ni invento actores."
    );
  }
  const trunc = payload.truncated ? ` Listado truncado a ${payload.count} eventos.` : "";
  const lines = payload.events.slice(0, 16).map((ev, i) => {
    const when = ev.creado_en != null ? String(ev.creado_en) : "fecha no registrada";
    const estatusBit = ev.estatus ? `estatus ${ev.estatus}` : "estatus no registrado";
    const etapaBit = ev.etapa_derived ? ` → etapa ${ev.etapa_label}` : "";
    const note = ev.comentario ? `; ${ev.comentario}` : "";
    return `${i + 1}. ${when}: ${estatusBit}${etapaBit}; ${formatActor(ev)}${note}`;
  });
  return (
    `${payload.count} evento(s) del historial de folio ${id} (${scope}).${trunc} ` +
    `Hechos observados en ${SOURCE}. No es estatus actual, Action Register ni KPIs. ` +
    `No deduplico por etapa. Actor ausente no se interpreta como sistema.\n` +
    lines.join("\n")
  );
}

function buildFolioHistoryChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildFolioHistoryAnswer(payload);
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
      mode: "folio_history",
      requested_domain: "folio_historial",
      openai_called: false,
      veracity,
      semantic_class: FOLIO_HISTORY_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
    },
    folio_history: okPayload
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
          events: payload.events,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "folio_historial", label: "Historial de folios" }
        : undefined,
  };
}

module.exports = {
  FOLIO_HISTORY_SEMANTIC_CLASS,
  SOURCE,
  EVENT_LIMIT,
  eventEtapaFromEstatus,
  projectEvent,
  listHistorialForFolio,
  loadFolioHistoryForChat,
  buildFolioHistoryAnswer,
  buildFolioHistoryChatResult,
};
