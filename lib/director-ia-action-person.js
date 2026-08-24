"use strict";

/**
 * Consultas Action Register por responsable/acción (chat legado, estrategia C).
 * No es un intent nuevo. No es phrasebook. No evalúa desempeño de personas.
 */

const { buildActionRegisterBoardPayload, pgCalendarDateToYmd } = require("./action-register-board");
const {
  getDedupedBoardItems,
  normalizePersonNameKey,
  todayYmdMexicoCity,
  isValidOverdueItem,
  computeDiasVencido,
  SIN_RESPONSABLE,
} = require("./director-ia-action-register");
const { assertActionRegisterAccess } = require("./director-ia-m12-revision-notes");
const { loadHistorialBatch } = require("./dicf-acciones");

const ACCION_TOKEN_RE = /\baccion(es)?\b/;
const VENCID_TOKEN_RE = /\b(vencid|atrasad|overdue)\b/;

const PERSON_SPAN_SKIP = new Set([
  "que",
  "como",
  "hay",
  "esta",
  "estas",
  "estan",
  "tiene",
  "tienen",
  "tuvo",
  "lo",
  "la",
  "el",
  "un",
  "una",
  "por",
  "y",
  "si",
  "no",
  "me",
  "te",
  "se",
  "al",
  "de",
  "del",
  "con",
  "para",
  "esa",
  "ese",
  "eso",
  "esto",
  "este",
]);

function normalizeQuestion(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionTokens(raw) {
  const n = normalizeQuestion(raw);
  return n ? n.split(" ").filter(Boolean) : [];
}

function isNameLikeToken(token) {
  const raw = String(token || "").replace(/[¿?¡!.,;:]+/g, "");
  if (!raw || raw.length < 2) return false;
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(raw)) return false;
  const n = normalizeQuestion(raw);
  if (!n || PERSON_SPAN_SKIP.has(n)) return false;
  return true;
}

/**
 * Dos tokens consecutivos con forma de nombre propio. No es lista de responsables.
 * @param {string} question
 */
function hasProperPersonSpan(question) {
  const parts = String(question || "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    if (isNameLikeToken(parts[i]) && isNameLikeToken(parts[i + 1])) return true;
  }
  return false;
}

function hasAccionToken(question) {
  return ACCION_TOKEN_RE.test(normalizeQuestion(question));
}

function hasVencidToken(question) {
  return VENCID_TOKEN_RE.test(normalizeQuestion(question));
}

function personKeyOfItem(item) {
  const raw = String((item && item.responsable) || "").trim();
  if (!raw) return null;
  const key = normalizePersonNameKey(raw);
  if (!key || key === SIN_RESPONSABLE.toLowerCase()) return null;
  return key;
}

function collectPeople(items) {
  const byKey = new Map();
  for (const item of items || []) {
    const key = personKeyOfItem(item);
    if (!key) continue;
    const display = String(item.responsable || "").trim();
    const uid =
      item.responsable_usuario_id != null && Number.isFinite(Number(item.responsable_usuario_id))
        ? Number(item.responsable_usuario_id)
        : null;
    if (!byKey.has(key)) {
      byKey.set(key, { key, display, usuario_id: uid });
    } else if (uid != null && byKey.get(key).usuario_id == null) {
      byKey.get(key).usuario_id = uid;
    }
  }
  return byKey;
}

function itemMatchesPerson(item, person) {
  if (!person) return false;
  if (person.usuario_id != null && Number.isFinite(Number(person.usuario_id))) {
    if (Number(item.responsable_usuario_id) === Number(person.usuario_id)) return true;
  }
  const key = personKeyOfItem(item);
  if (person.key && key === person.key) return true;
  if (person.name_key && key === person.name_key) return true;
  return false;
}

/**
 * Match whole-token, sin fuzzy. Prefiere nombre completo. Parcial solo si es único.
 * @param {Map<string, { key: string, display: string, usuario_id: number | null }>} people
 * @param {string} question
 */
function matchPeopleInQuestion(people, question) {
  const qTokens = new Set(questionTokens(question));
  if (qTokens.size === 0 || people.size === 0) {
    return { status: "none", matches: [] };
  }

  const full = [];
  for (const person of people.values()) {
    const nameTokens = person.key.split(" ").filter(Boolean);
    if (nameTokens.length === 0) continue;
    if (nameTokens.every((t) => qTokens.has(t))) {
      full.push({ person, strength: nameTokens.length });
    }
  }

  if (full.length > 0) {
    const max = Math.max(...full.map((x) => x.strength));
    const strongest = full.filter((x) => x.strength === max).map((x) => x.person);
    const uniqueKeys = [...new Map(strongest.map((p) => [p.key, p])).values()];
    if (uniqueKeys.length > 1) return { status: "ambiguous", matches: uniqueKeys };
    return { status: "unique", matches: uniqueKeys };
  }

  const givenHits = [];
  for (const person of people.values()) {
    const given = person.key.split(" ").filter(Boolean)[0];
    if (given && qTokens.has(given)) givenHits.push(person);
  }
  const uniqueGiven = [...new Map(givenHits.map((p) => [p.key, p])).values()];
  if (uniqueGiven.length === 1) return { status: "unique", matches: uniqueGiven };
  if (uniqueGiven.length > 1) return { status: "ambiguous", matches: uniqueGiven };
  return { status: "none", matches: [] };
}

function echoPerson(entity) {
  if (!entity || typeof entity !== "object") return null;
  const kind = String(entity.kind || "");
  if (kind !== "ar_responsable" && kind !== "ar_action") return null;
  const display = String(entity.display || "").trim();
  if (!display) return null;
  const uid = Number(entity.usuario_id);
  return {
    key: entity.name_key || entity.key || normalizePersonNameKey(display),
    display,
    usuario_id: Number.isFinite(uid) && uid > 0 ? uid : null,
    action_id: entity.action_id != null && Number.isFinite(Number(entity.action_id)) ? Number(entity.action_id) : null,
    kind,
  };
}

function buildEvidenceRow(item, todayYmd) {
  const due = pgCalendarDateToYmd(item.due_date) || null;
  const closed = item.closed === true;
  const overdue = !closed && isValidOverdueItem(item, todayYmd);
  const created = pgCalendarDateToYmd(item.created_at || item.creada_ymd || item.dicf_creada_ymd) || null;
  const isDicf = item.dicf === true || item.dicf_id != null;
  const resultado =
    item.dicf_resultado_cierre != null && String(item.dicf_resultado_cierre).trim()
      ? String(item.dicf_resultado_cierre).trim()
      : item.resultado_cierre != null && String(item.resultado_cierre).trim()
        ? String(item.resultado_cierre).trim()
        : null;
  const historial = Array.isArray(item.historial) ? item.historial : [];
  const lastUpdate =
    (item.cerrado_at && String(item.cerrado_at).trim()) ||
    (historial.length && (historial[historial.length - 1].at || historial[historial.length - 1].fecha)) ||
    null;
  return {
    id: Number(item.id),
    title: String(item.title || "").trim() || "(sin título)",
    tema: String(item.tema || "").trim() || null,
    closed,
    status: closed ? "cerrada" : "abierta",
    responsable: String(item.responsable || "").trim() || null,
    responsable_usuario_id:
      item.responsable_usuario_id != null && Number.isFinite(Number(item.responsable_usuario_id))
        ? Number(item.responsable_usuario_id)
        : null,
    due_date: due,
    created_at: created,
    overdue,
    dias_vencido: overdue ? computeDiasVencido(item, todayYmd) : 0,
    last_update: lastUpdate ? String(lastUpdate) : null,
    resultado_cierre: resultado,
    historial,
    provenance: isDicf
      ? ["arr.dicf_acciones", "arr.action_register_board"]
      : ["arr.action_register_items"],
    dicf_id: isDicf && item.dicf_id != null ? Number(item.dicf_id) : null,
    dicf_public_code: isDicf ? item.dicf_public_code || null : null,
  };
}

function limitationsForRows(rows) {
  const out = [
    "responsable_registrado_no_es_responsable_del_problema",
    "responsable_registrado_no_es_culpable",
    "vencida_no_es_negligencia",
  ];
  const anyResultado = rows.some((r) => r.resultado_cierre);
  const anyHistorial = rows.some((r) => Array.isArray(r.historial) && r.historial.length > 0);
  const anyLast = rows.some((r) => r.last_update);
  if (!anyResultado) out.push("sin_resultado_cierre_en_el_item");
  if (!anyHistorial) out.push("sin_historial_de_eventos_en_el_item");
  if (!anyLast) out.push("sin_ultima_actualizacion_registrada");
  if (rows.some((r) => r.overdue) && !anyResultado && !anyHistorial) {
    out.push("sin_explicacion_registrada_del_retraso");
  }
  return out;
}

/**
 * @param {{ items: object[], question: string, echoedEntity?: object | null, todayYmd?: string }} opts
 */
function resolveActionPersonFocus(opts) {
  const items = Array.isArray(opts && opts.items) ? opts.items : [];
  const question = String((opts && opts.question) || "");
  const todayYmd = (opts && opts.todayYmd) || todayYmdMexicoCity();
  const people = collectPeople(items);
  const echoed = echoPerson(opts && opts.echoedEntity);
  const named = matchPeopleInQuestion(people, question);
  const attempted =
    named.status !== "none" ||
    Boolean(echoed) ||
    hasProperPersonSpan(question);

  if (!attempted) {
    return { mode: "none", people: [], rows: [], responsable: null, action: null, limitations: [], provenance: [] };
  }

  if (named.status === "ambiguous") {
    return {
      mode: "ambiguous_people",
      people: named.matches,
      rows: [],
      responsable: null,
      action: null,
      limitations: ["responsable_ambiguo"],
      provenance: ["arr.action_register_items"],
    };
  }

  let person = named.status === "unique" ? named.matches[0] : null;
  if (!person && echoed) person = echoed;
  if (!person && hasProperPersonSpan(question)) {
    return {
      mode: "no_responsible",
      people: [],
      rows: [],
      responsable: null,
      action: null,
      limitations: ["DATA_NOT_FOUND"],
      provenance: ["arr.action_register_items"],
    };
  }
  if (!person) {
    return { mode: "none", people: [], rows: [], responsable: null, action: null, limitations: [], provenance: [] };
  }

  let matched = items.filter((item) => itemMatchesPerson(item, person));
  const personItemCount = matched.length;
  if (hasVencidToken(question) && matched.length > 1) {
    const overdue = matched.filter((item) => !item.closed && isValidOverdueItem(item, todayYmd));
    if (overdue.length >= 1) matched = overdue;
  }

  const rows = matched.map((item) => buildEvidenceRow(item, todayYmd));
  const provenance = [...new Set(rows.flatMap((r) => r.provenance))];
  if (provenance.length === 0) provenance.push("arr.action_register_items");
  const limitations = limitationsForRows(rows);

  if (rows.length === 0) {
    return {
      mode: "zero_actions",
      people: [person],
      rows: [],
      responsable: person,
      action: null,
      person_item_count: personItemCount,
      limitations: [...limitations, "DATA_NOT_FOUND"],
      provenance,
    };
  }
  if (rows.length === 1) {
    return {
      mode: "one_action",
      people: [person],
      rows,
      responsable: person,
      action: rows[0],
      person_item_count: personItemCount,
      limitations,
      provenance,
    };
  }
  return {
    mode: "many_actions",
    people: [person],
    rows,
    responsable: person,
    action: null,
    person_item_count: personItemCount,
    limitations: [...limitations, "multiples_acciones_no_elegir_en_silencio"],
    provenance,
  };
}

function formatEvidenceText(focus) {
  const lines = [
    "EVIDENCIA ACTION REGISTER (requery de este turno; no es memoria; no es causa del problema):",
    `responsable_registrado=${focus.responsable ? focus.responsable.display : "ninguno"}`,
    "El responsable registrado es de la ACCIÓN, no del problema. No es culpable por aparecer aquí.",
    `acciones_en_scope=${(focus.rows || []).length}`,
  ];
  for (const row of focus.rows || []) {
    lines.push(
      [
        `accion_id=${row.id}`,
        `titulo=${row.title}`,
        `tema=${row.tema || "—"}`,
        `status=${row.status}`,
        `responsable=${row.responsable || "—"}`,
        `fecha_compromiso=${row.due_date || "no registrada"}`,
        `vencida=${row.overdue ? "si" : "no"}`,
        `ultima_actualizacion=${row.last_update || "no registrada"}`,
        `resultado_cierre=${row.resultado_cierre || "no registrado"}`,
        `historial=${row.historial && row.historial.length ? JSON.stringify(row.historial) : "no registrado"}`,
        `provenance=${(row.provenance || []).join(",")}`,
      ].join(" | ")
    );
  }
  if (focus.mode === "many_actions") {
    lines.push("Hay varias acciones. No elijas una. Lista o pide cuál.");
  }
  if ((focus.limitations || []).length) {
    lines.push(`limitations=${focus.limitations.join(" | ")}`);
  }
  lines.push(
    "Si no hay explicación registrada del retraso, dilo con naturalidad y pide actualización de la acción. No inventes motivo, culpa ni negligencia."
  );
  return lines.join("\n");
}

const ACTION_PERSON_SYSTEM_PROMPT = `Eres un Gerente General que informa al Director General sobre acciones del Action Register.

Reglas:
- Usa únicamente la evidencia de este turno.
- El responsable registrado es de la ACCIÓN, no del problema, y no es culpable por estar asignado.
- Una acción vencida no es prueba de negligencia.
- No inventes historial, resultado_cierre, motivo de retraso ni última actualización.
- Si falta explicación del retraso, dilo con naturalidad y pide una actualización de la acción (bloqueo, resultado parcial/final, nueva fecha). No uses una frase rígida de culpa.
- Si hay varias acciones, no elijas una en silencio; lista o pide acotar.
- No evalúes el desempeño de la persona.
- No menciones bases de datos ni JSON.`;

function buildActionPersonPrompt(focus, question) {
  const userContent = [
    formatEvidenceText(focus),
    "",
    "Pregunta del ejecutivo:",
    String(question || "").trim(),
  ].join("\n");
  return { systemPrompt: ACTION_PERSON_SYSTEM_PROMPT, userContent };
}

function activeEntitiesFromFocus(focus) {
  if (!focus || !focus.responsable) return [];
  const uniquePersonAction = Number(focus.person_item_count) === 1 && focus.action;
  const entity = {
    kind: uniquePersonAction ? "ar_action" : "ar_responsable",
    display: focus.responsable.display,
    usuario_id: focus.responsable.usuario_id,
    name_key: focus.responsable.key,
    action_id: uniquePersonAction ? focus.action.id : null,
  };
  return [entity];
}

function pendingGapFromFocus(focus) {
  if (!focus || (focus.mode !== "one_action" && focus.mode !== "many_actions")) return null;
  const missing = (focus.limitations || []).filter((x) =>
    /sin_resultado|sin_historial|sin_ultima|sin_explicacion/.test(x)
  );
  if (!missing.length) return null;
  return {
    missing_fields: missing,
    why_blocks:
      "El registro muestra estado y fecha de la acción; no hay una explicación documentada del retraso ni un resultado de cierre en este path.",
    physical_source: (focus.provenance || [])[0] || "arr.action_register_items",
    physical_person: focus.responsable ? focus.responsable.display : null,
  };
}

async function attachDicfHistorial(client, rows) {
  const ids = (rows || []).map((r) => r.dicf_id).filter((id) => Number.isFinite(id) && id > 0);
  if (!client || ids.length === 0) return rows;
  try {
    const histMap = await loadHistorialBatch(client, ids);
    return rows.map((row) => {
      if (!row.dicf_id) return row;
      const hist = histMap.get(Number(row.dicf_id)) || row.historial || [];
      return { ...row, historial: hist };
    });
  } catch (_e) {
    return rows;
  }
}

async function attachDicfHistorialFromPool(pool, rows) {
  const ids = (rows || []).map((r) => r.dicf_id).filter((id) => Number.isFinite(id) && id > 0);
  if (!pool || typeof pool.connect !== "function" || ids.length === 0) return rows;
  const client = await pool.connect();
  try {
    return await attachDicfHistorial(client, rows);
  } finally {
    client.release();
  }
}

/**
 * @param {import("pg").Pool} pool
 * @param {number} plantaId
 * @param {object} req
 * @param {{ ensureActionRegisterTables?: Function }} [opts]
 */
async function loadActionPersonBoardForChat(pool, plantaId, req, opts = {}) {
  const authz = assertActionRegisterAccess(req && req.dashboardAuth, plantaId);
  if (!authz.ok) return authz;
  if (!pool || typeof pool.connect !== "function") {
    return { ok: false, status: 500, code: "TOOL_ERROR", error: "Contexto Action Register no configurado" };
  }
  let client;
  try {
    client = await pool.connect();
    const ensure =
      typeof opts.ensureActionRegisterTables === "function" ? opts.ensureActionRegisterTables : async () => {};
    const board = await buildActionRegisterBoardPayload(client, plantaId, {
      ensureActionRegisterTables: ensure,
      includeDicf: true,
      includeNotes: false,
    });
    return { ok: true, items: getDedupedBoardItems(board) };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: "TOOL_ERROR",
      error: (e && e.message) || "No se pudo cargar Action Register",
    };
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  ACCION_TOKEN_RE,
  VENCID_TOKEN_RE,
  hasProperPersonSpan,
  hasAccionToken,
  hasVencidToken,
  matchPeopleInQuestion,
  resolveActionPersonFocus,
  formatEvidenceText,
  limitationsForRows,
  buildActionPersonPrompt,
  activeEntitiesFromFocus,
  pendingGapFromFocus,
  attachDicfHistorial,
  attachDicfHistorialFromPool,
  loadActionPersonBoardForChat,
  ACTION_PERSON_SYSTEM_PROMPT,
};
