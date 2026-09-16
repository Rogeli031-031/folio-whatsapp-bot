"use strict";

/**
 * CLIENT_EVIDENCE_AND_ACTIONS — preserva source_type.
 * Nunca recategoriza ACTION_REGISTER como DICF ni viceversa.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");

const SEMANTIC_CLASS = "client_evidence_and_actions";
const SOURCE_TYPES = Object.freeze({
  ARR_COMMENT: "ARR_COMMENT",
  CLIENT_COMMENT: "CLIENT_COMMENT",
  DICF: "DICF",
  ACTION_REGISTER: "ACTION_REGISTER",
  BITACORA: "BITACORA",
});

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isActionRegisterThemeQuestion(raw) {
  const n = normalizeText(raw);
  if (/\bgrupo\b/.test(n)) return false;
  if (/\btema\b/.test(n) && /\bclientes\b/.test(n)) return true;
  return Boolean(
    /\baction\s+register\b/.test(n) &&
      /\bclientes\b/.test(n) &&
      !/\btiene\b/.test(n)
  );
}

function isClientEvidenceQuestion(question) {
  const n = normalizeText(question);
  if (!n) return false;
  if (isActionRegisterThemeQuestion(n)) return false;
  const evidenceCue = Boolean(
    /\bcomentarios?\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      /\bseguimiento\b/.test(n) ||
      /\bdicf\b/.test(n) ||
      /\baction\s+register\b/.test(n) ||
      /\bpendientes?\b/.test(n) ||
      /\bresponsable\b/.test(n) ||
      /\bantecedentes\b/.test(n) ||
      /\bbitacora\b/.test(n) ||
      /\brecuperacion\b/.test(n)
  );
  if (!evidenceCue) return false;
  if (/\b(folios?|apoyos?|extintor|estaciones?|gasto)\b/.test(n)) return false;
  return Boolean(
    /\bclientes?\b/.test(n) ||
      /\bgrupo\b/.test(n) ||
      /\btiene/.test(n) ||
      /\btenemos\b/.test(n) ||
      /\bcon\b/.test(n) ||
      /\bhay\b/.test(n) ||
      /\brecuperacion\b/.test(n)
  );
}

function isClientEvidenceFollowUp(question) {
  const n = normalizeText(question);
  if (!n) return false;
  return Boolean(
    /\bcomentarios?\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      /\bdicf\b/.test(n) ||
      /\baction\s+register\b/.test(n) ||
      /\bresponsable\b/.test(n) ||
      /\bfecha\b/.test(n) ||
      /\bestado\b/.test(n) ||
      /\bultimo\s+comentario\b/.test(n) ||
      /\bpendientes?\b/.test(n) ||
      /\bresponsable\b/.test(n) ||
      /\bbitacora\b/.test(n) ||
      /\bcuando\s+se\s+abrio\b/.test(n) ||
      /\bquien\s+atiende\b/.test(n)
  );
}

function extractClientNameHint(question, priorNames) {
  const raw = String(question || "").trim();
  const named = raw.match(/\b(?:cliente|grupo)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’ -]{2,})/i);
  if (named && named[1]) return named[1].replace(/[?¿!.]+$/g, "").trim();
  if (Array.isArray(priorNames) && priorNames.length === 1) return priorNames[0];
  return null;
}

function extractClientEvidenceSpec(question, prior, opts = {}) {
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : null;
  const follow = Boolean(usable && isClientEvidenceFollowUp(question));
  if (!isClientEvidenceQuestion(question) && !follow) return { ok: false };
  const names =
    (usable && Array.isArray(usable.entity_names) && usable.entity_names.length && follow
      ? usable.entity_names
      : null) || [];
  const hint = extractClientNameHint(question, names);
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    client_hint: hint,
    entity_names: hint ? [hint] : names,
    wants_comments: /\bcomentarios?\b/.test(n) || /\bantecedentes\b/.test(n) || /\bdame\s+comentarios/.test(n),
    wants_dicf: /\bdicf\b/.test(n),
    wants_action_register: /\baction\s+register\b/.test(n),
    wants_bitacora: /\bbitacora\b/.test(n),
    wants_actions: /\bacciones?\b/.test(n) || /\bseguimiento\b/.test(n) || /\bpendientes?\b/.test(n),
    follow,
  };
}

function labelSourceType(item) {
  return item && item.source_type ? item.source_type : null;
}

function formatEvidenceBlock(title, items, emptyText) {
  if (!items || !items.length) return `${title}:\n${emptyText}`;
  const lines = items.map((item) => {
    const bits = [item.summary || item.body || "sin texto"].filter(Boolean);
    if (item.responsable) bits.push(`Responsable: ${item.responsable}`);
    if (item.fecha) bits.push(`Fecha: ${item.fecha}`);
    if (item.estado) bits.push(`Estado: ${item.estado}`);
    bits.push(`Fuente: ${item.source_type}`);
    return `- ${bits.join(" | ")}`;
  });
  return `${title}:\n${items.length} registro(s)\n${lines.join("\n")}`;
}

function buildClientEvidenceAnswer(payload) {
  if (!payload) return "No pude consultar la evidencia del cliente.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar la evidencia del cliente.";
  const name = payload.client_name || (payload.spec && payload.spec.client_hint) || "el cliente";
  const byType = payload.by_type || {};
  const sections = [
    name,
    "",
    formatEvidenceBlock(
      "Comentario comercial / ARR",
      [...(byType.ARR_COMMENT || []), ...(byType.CLIENT_COMMENT || [])],
      "No encontré comentarios registrados."
    ),
    "",
    formatEvidenceBlock("DICF", byType.DICF || [], "No encontré acciones DICF abiertas."),
    "",
    formatEvidenceBlock(
      "Action Register",
      byType.ACTION_REGISTER || [],
      "No encontré acciones en Action Register."
    ),
    "",
    formatEvidenceBlock("Bitácora", byType.BITACORA || [], "No encontré notas de bitácora."),
  ];
  return sections.join("\n");
}

function groupBySourceType(items) {
  const by_type = {
    ARR_COMMENT: [],
    CLIENT_COMMENT: [],
    DICF: [],
    ACTION_REGISTER: [],
    BITACORA: [],
  };
  for (const item of items || []) {
    const type = labelSourceType(item);
    if (!type || !by_type[type]) continue;
    by_type[type].push(item);
  }
  return by_type;
}

async function loadClientEvidenceForChat(pool, plantaId, req, opts = {}) {
  const question = opts.question || "";
  const spec = extractClientEvidenceSpec(question, opts.priorSpec, opts);
  if (!spec.ok) return { ok: false, error: "No pude determinar la evidencia de cliente.", spec };
  const names = spec.entity_names || [];
  if (!names.length) {
    return {
      ok: true,
      clarification: "Precisa el cliente. No mezclo evidencia de todo el universo comercial.",
      spec,
      by_type: groupBySourceType([]),
      items: [],
    };
  }
  let items = Array.isArray(opts.evidenceItems) ? opts.evidenceItems.slice() : [];
  if (!items.length && pool && typeof opts.queryEvidence === "function") {
    items = await opts.queryEvidence(opts.db || pool, plantaId, names);
  }
  const scoped = items.filter((item) => {
    const target = normalizeText(item.cliente || item.cliente_nombre || "");
    return names.some((name) => target && target.includes(normalizeText(name)));
  });
  const by_type = groupBySourceType(scoped);
  return {
    ok: true,
    spec,
    client_name: names.length === 1 ? names[0] : names.join(" / "),
    items: scoped,
    by_type,
    planta_id: Number(plantaId) || null,
    source_types_present: Object.keys(by_type).filter((k) => by_type[k].length),
  };
}

function buildClientEvidenceChatResult(payload, opts = {}) {
  const answer = buildClientEvidenceAnswer(payload);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const names = (payload && payload.spec && payload.spec.entity_names) || [];
  return {
    ok: true,
    answer,
    sources: (payload && payload.source_types_present) || [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      planta_id: plantaId,
      conversation_state: {
        parent_intent: "client_evidence",
        planta_id: plantaId,
        active_subtopic: "client_evidence",
        active_entities: [
          {
            kind: "client_entity_set",
            display: (payload && payload.client_name) || "CLIENT_EVIDENCE",
            domain: "client_evidence",
            entity_names: names,
            entities: names.map((display) => ({ display, key: display })),
          },
        ],
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_TYPES,
  isClientEvidenceQuestion,
  isClientEvidenceFollowUp,
  isActionRegisterThemeQuestion,
  extractClientEvidenceSpec,
  groupBySourceType,
  loadClientEvidenceForChat,
  buildClientEvidenceAnswer,
  buildClientEvidenceChatResult,
};
