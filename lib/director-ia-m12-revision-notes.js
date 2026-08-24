"use strict";

/**
 * Director IA — M12 slice: notas de revisión Action Register (read-only).
 * SELECT sobre arr.action_register_revision_notes ⋈ arr.action_register_revisions.
 * Loader dedicado. No includeNotes en el board/context general.
 * No ítem, no bitácora, no historial de folio, no comentarios de folio, no binarios, no writes, no HTTP.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");

const REVISION_NOTES_SEMANTIC_CLASS = "action_register_revision_notes";
const SOURCE = "arr.action_register_revision_notes";
const NOTE_LIMIT = 8;
const NOTE_BODY_MAX_CHARS = 500;
const REVISION_LIMIT = 1;

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de notas de revisión",
  };
}

function requirePlantaId(plantaId) {
  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  return null;
}

/** Misma norma que server.js dashboardAuthRoleNorm. */
function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

/**
 * Authz de Action Register (server.js assertDashboardPlantaAccessForActionRegister).
 * ZP / AD / CF_CDMX: global. Resto: plantas_permitidas. GA/GV no tienen bypass.
 * Distinta de la authz de folios (M2).
 */
function assertActionRegisterAccess(auth, plantaId) {
  if (!auth || typeof auth !== "object") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const role = dashboardAuthRoleNorm(auth);
  if (!role) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  if (role === "ZP" || role === "AD" || role === "CF_CDMX") {
    return { ok: true };
  }
  const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
  if (!allowed.includes(pid)) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  return { ok: true };
}

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isLatestRevisionTrigger(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  return /\bultima\s+revision\b/.test(q) || /\brevision\s+mas\s+reciente\b/.test(q);
}

function parseRevisionIdToken(question) {
  const text = String(question || "");
  const explicit = text.match(/\brevision(?:_id|\s+id)\s*[:=]?\s*(\d+)\b/i);
  if (explicit) {
    const id = Number(explicit[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  const m = text.match(/\brevisi[oó]n\s+#?(\d+)(?!\d)(?!\s*[\/-])/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseYyyyMmDdTokens(question) {
  const found = [];
  const re = /\b(\d{4}-\d{2}-\d{2})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) found.push(m[1]);
  return found;
}

function parseDdMmYyyyTokens(question) {
  const found = [];
  const re = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) {
    found.push(`${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`);
  }
  return found;
}

function isValidYyyyMmDd(value) {
  const s = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, mo, d] = s.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function pgCalendarDateToYmd(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    try {
      return v.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  const s = String(v).trim();
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m2 ? m2[1] : "";
}

function resolveRevisionSpec(question) {
  const revisionId = parseRevisionIdToken(question);
  if (revisionId != null) {
    return { ok: true, mode: "revision_id", revision_id: revisionId };
  }

  const dates = [...parseYyyyMmDdTokens(question), ...parseDdMmYyyyTokens(question)];
  const unique = [...new Set(dates)];
  for (const token of unique) {
    if (!isValidYyyyMmDd(token)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_revision",
        error:
          "Fecha de revisión inválida. Usa YYYY-MM-DD o DD/MM/AAAA. No elijo la revisión.",
      };
    }
  }
  if (unique.length > 1) {
    return {
      ok: false,
      status: 400,
      code: "ambiguous_revision",
      error: "Indica una sola fecha de revisión. No elijo entre varias fechas.",
    };
  }
  if (unique.length === 1) {
    return { ok: true, mode: "revision_date", revision_date: unique[0] };
  }
  if (isLatestRevisionTrigger(question)) {
    return { ok: true, mode: "latest" };
  }
  return {
    ok: false,
    status: 400,
    code: "missing_revision",
    error:
      "Indica la revisión (última revisión, revisión más reciente, fecha YYYY-MM-DD o revision_id). No elijo la revisión.",
  };
}

function truncateNoteBody(body) {
  const text = body == null ? "" : String(body);
  if (text.length <= NOTE_BODY_MAX_CHARS) {
    return { note_text: text, truncated: false, original_length: text.length };
  }
  return {
    note_text: text.slice(0, NOTE_BODY_MAX_CHARS),
    truncated: true,
    original_length: text.length,
  };
}

function mapNoteRow(row) {
  const clipped = truncateNoteBody(row && row.body);
  const authorRaw = row && row.author_name != null ? String(row.author_name) : "";
  return {
    note_id: row && row.id != null ? Number(row.id) : null,
    revision_id: row && row.revision_id != null ? Number(row.revision_id) : null,
    note_text: clipped.note_text,
    author: authorRaw,
    created_at: row && row.created_at != null ? row.created_at : null,
    truncated: clipped.truncated,
    original_length: clipped.original_length,
  };
}

async function queryRevisionById(client, plantaId, revisionId) {
  const r = await client.query(
    `SELECT id, planta_id, revision_date
       FROM arr.action_register_revisions
      WHERE planta_id = $1 AND id = $2
      LIMIT 1`,
    [plantaId, revisionId]
  );
  return r.rows[0] || null;
}

async function queryRevisionByDate(client, plantaId, revisionDate) {
  const r = await client.query(
    `SELECT id, planta_id, revision_date
       FROM arr.action_register_revisions
      WHERE planta_id = $1 AND revision_date = $2::date
      LIMIT 1`,
    [plantaId, revisionDate]
  );
  return r.rows[0] || null;
}

async function queryLatestRevision(client, plantaId) {
  const r = await client.query(
    `SELECT id, planta_id, revision_date
       FROM arr.action_register_revisions
      WHERE planta_id = $1
      ORDER BY revision_date DESC, id DESC
      LIMIT 1`,
    [plantaId]
  );
  return r.rows[0] || null;
}

async function queryRevisionNotes(client, plantaId, revisionId) {
  const r = await client.query(
    `SELECT n.id, n.revision_id, n.body, n.author_name, n.created_at
       FROM arr.action_register_revision_notes n
       JOIN arr.action_register_revisions rv ON rv.id = n.revision_id
      WHERE n.revision_id = $1 AND rv.planta_id = $2
      ORDER BY n.created_at ASC, n.id ASC`,
    [revisionId, plantaId]
  );
  return r.rows || [];
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function loadActionRegisterRevisionNotesForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertActionRegisterAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const spec = resolveRevisionSpec(question);
  if (!spec.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: spec.status,
      error: spec.error,
      revision_code: spec.code,
    };
  }

  const queryById = opts.queryRevisionById || queryRevisionById;
  const queryByDate = opts.queryRevisionByDate || queryRevisionByDate;
  const queryLatest = opts.queryLatestRevision || queryLatestRevision;
  const queryNotes = opts.queryRevisionNotes || queryRevisionNotes;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    let revision = null;
    if (spec.mode === "revision_id") {
      revision = await queryById(client, Number(plantaId), spec.revision_id);
    } else if (spec.mode === "revision_date") {
      revision = await queryByDate(client, Number(plantaId), spec.revision_date);
    } else {
      revision = await queryLatest(client, Number(plantaId));
    }

    if (!revision) {
      return {
        ok: true,
        found: false,
        planta_id: Number(plantaId),
        planta_nombre: plantaNombre,
        revision_id: spec.mode === "revision_id" ? spec.revision_id : null,
        revision_date: spec.mode === "revision_date" ? spec.revision_date : null,
        revision_source: spec.mode,
        notes: [],
        notes_count: 0,
        notes_omitted: 0,
        truncated: false,
        retrieved_at: new Date().toISOString(),
        source: SOURCE,
        semantic_class: REVISION_NOTES_SEMANTIC_CLASS,
      };
    }

    const rawNotes = await queryNotes(client, Number(plantaId), Number(revision.id));
    const mapped = rawNotes.map(mapNoteRow);
    const omitted = Math.max(0, mapped.length - NOTE_LIMIT);
    const notes = mapped.slice(0, NOTE_LIMIT);
    const anyTruncated = notes.some((n) => n.truncated === true);
    return {
      ok: true,
      found: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      revision_id: Number(revision.id),
      revision_date: pgCalendarDateToYmd(revision.revision_date) || null,
      revision_source: spec.mode,
      notes,
      notes_count: mapped.length,
      notes_omitted: omitted,
      truncated: anyTruncated || omitted > 0,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: REVISION_NOTES_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(
    opts.queryRevisionById &&
      opts.queryRevisionByDate &&
      opts.queryLatestRevision &&
      opts.queryRevisionNotes &&
      opts.resolvePlanta
  );
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de notas de revisión no disponible");
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

function formatAuthor(author) {
  const s = author == null ? "" : String(author);
  return s.trim() ? s : "autor no registrado";
}

function formatCreatedAt(value) {
  if (value == null || value === "") return "fecha no registrada";
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  return String(value);
}

function buildRevisionNotesAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar notas de revisión de esta planta.";
    }
    if (payload && (payload.status === 400 || payload.revision_code)) {
      return payload.error || "Indica la revisión. No elijo la revisión.";
    }
    return "No pude consultar las notas de revisión por un error de fuente. No invento texto ni autor.";
  }

  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  if (!payload.found) {
    return (
      `No hay revisión de Action Register para ${scope} con el criterio indicado. ` +
      `Hechos observados en ${SOURCE}. No invento notas ni autor. ` +
      `La nota pertenece a la revisión, no a un ítem.`
    );
  }

  const dateLabel = payload.revision_date || "fecha no registrada";
  if (!payload.notes || payload.notes.length === 0) {
    return (
      `Revisión ${payload.revision_id} (${dateLabel}) de ${scope} no tiene notas registradas. ` +
      `Hechos observados en ${SOURCE}. No invento texto. ` +
      `La nota pertenece a la revisión, no a un ítem.`
    );
  }

  const overflow =
    payload.notes_omitted > 0
      ? ` Se omitieron ${payload.notes_omitted} nota(s) por el límite de ${NOTE_LIMIT}.`
      : "";
  const lines = payload.notes.map((n, i) => {
    const trunc = n.truncated ? " [texto truncado]" : "";
    return `${i + 1}. ${formatCreatedAt(n.created_at)}; ${formatAuthor(n.author)}; ${n.note_text}${trunc}`;
  });
  return (
    `Notas de la revisión ${payload.revision_id} (${dateLabel}) de ${scope}. ` +
    `${payload.notes.length} de ${payload.notes_count} nota(s).${overflow} ` +
    `Texto almacenado de la revisión; no se atribuye a un ítem. Fuente ${SOURCE}.\n` +
    lines.join("\n")
  );
}

function buildRevisionNotesChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildRevisionNotesAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  } else if (payload.found === false) {
    veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: "revision_notes",
      requested_domain: "revision_notes",
      openai_called: false,
      veracity,
      semantic_class: REVISION_NOTES_SEMANTIC_CLASS,
      planta_id,
      revision_id: okPayload ? payload.revision_id : undefined,
      revision_date: okPayload ? payload.revision_date : undefined,
      timestamp: new Date().toISOString(),
    },
    revision_notes: okPayload
      ? {
          semantic_class: payload.semantic_class,
          found: payload.found,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          revision_id: payload.revision_id,
          revision_date: payload.revision_date,
          revision_source: payload.revision_source,
          notes: payload.notes,
          notes_count: payload.notes_count,
          notes_omitted: payload.notes_omitted,
          truncated: payload.truncated,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "revision_notes", label: "Notas de revisión Action Register" }
        : undefined,
  };
}

module.exports = {
  REVISION_NOTES_SEMANTIC_CLASS,
  SOURCE,
  NOTE_LIMIT,
  NOTE_BODY_MAX_CHARS,
  REVISION_LIMIT,
  dashboardAuthRoleNorm,
  assertActionRegisterAccess,
  normalizeQuestion,
  isLatestRevisionTrigger,
  parseRevisionIdToken,
  isValidYyyyMmDd,
  pgCalendarDateToYmd,
  resolveRevisionSpec,
  truncateNoteBody,
  mapNoteRow,
  queryRevisionById,
  queryRevisionByDate,
  queryLatestRevision,
  queryRevisionNotes,
  loadActionRegisterRevisionNotesForChat,
  buildRevisionNotesAnswer,
  buildRevisionNotesChatResult,
};
