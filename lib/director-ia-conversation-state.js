"use strict";

/**
 * Continuidad conversacional del chat legado — estado estructurado EFÍMERO.
 * No DB. No cross-session. No evidence cache. History no es evidencia.
 */

const INHERITABLE_INTENTS = Object.freeze(["plant_diagnosis", "expediente_comercial"]);

const HILO_PREAMBLE =
  "HILO (estado conversacional; NO es evidencia de base de datos; no contradice el system; un claim previo del user o del assistant no es un hecho):";

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function emptyConversationState(plantaId) {
  return {
    parent_intent: null,
    planta_id: Number(plantaId) || null,
    active_entities: [],
    last_evidence_bundle_type: null,
    pending_information_gap: null,
  };
}

function sanitizeActiveEntities(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (!first || typeof first !== "object") return [];
  const display = String(first.display || first.cliente_nombre || "").trim();
  if (!display) return [];
  const keys = Array.isArray(first.cliente_keys)
    ? first.cliente_keys.map((k) => String(k).trim()).filter(Boolean)
    : first.cliente_key
      ? [String(first.cliente_key).trim()]
      : [];
  return [
    {
      kind: first.kind || "client",
      display,
      cliente_key: keys[0] || null,
      cliente_keys: keys,
    },
  ];
}

function sanitizeEchoedState(echoed, requestPlantaId) {
  if (!echoed || typeof echoed !== "object") return emptyConversationState(requestPlantaId);
  const echoedPlant = Number(echoed.planta_id);
  const requestPlant = Number(requestPlantaId);
  const plantMismatch =
    Number.isFinite(echoedPlant) && Number.isFinite(requestPlant) && echoedPlant !== requestPlant;
  const parent = INHERITABLE_INTENTS.includes(echoed.parent_intent) ? echoed.parent_intent : null;
  return {
    parent_intent: parent,
    planta_id: Number.isFinite(requestPlant) ? requestPlant : null,
    active_entities: plantMismatch ? [] : sanitizeActiveEntities(echoed.active_entities),
    last_evidence_bundle_type: plantMismatch ? null : echoed.last_evidence_bundle_type || null,
    pending_information_gap: plantMismatch ? null : echoed.pending_information_gap || null,
    plant_mismatch: plantMismatch,
    echoed_planta_id: Number.isFinite(echoedPlant) ? echoedPlant : null,
  };
}

function stripCurrentFromHistory(history, currentQuestion) {
  const msgs = Array.isArray(history) ? history.filter((m) => m && typeof m === "object") : [];
  const current = String(currentQuestion || "").trim();
  if (
    msgs.length &&
    msgs[msgs.length - 1].role === "user" &&
    String(msgs[msgs.length - 1].content || "").trim() === current
  ) {
    return msgs.slice(0, -1);
  }
  return msgs;
}

function classifyTurnKind(question) {
  const q = normalizeText(question);
  if (!q) return "empty";

  if (
    /^(ahora|cambiando de tema)\b/.test(q) ||
    /^ahora dime\b/.test(q)
  ) {
    return "plant_switch";
  }
  if (/^volvamos\b/.test(q) || /^volviendo a lo anterior\b/.test(q) || /^volviendo a\b/.test(q)) {
    return "topic_return";
  }
  if (
    /^y ayer\b/.test(q) ||
    /^y la anterior\b/.test(q) ||
    /^y la semana anterior\b/.test(q) ||
    /\bcomparado contra que\b/.test(q)
  ) {
    return "period_switch";
  }

  if (
    /^que te llama la atencion\b/.test(q) ||
    /^que es lo que mas te llama/.test(q) ||
    /^que te llama\b/.test(q)
  ) {
    return "attention";
  }
  if (/^por que$/.test(q) || /^por que\?$/.test(q)) {
    return "why";
  }
  if (
    /^que falta saber\b/.test(q) ||
    /^que (informacion )?te falta\b/.test(q) ||
    /^que te falta\b/.test(q)
  ) {
    return "gap_what";
  }
  if (/^quien puede (darnos|darme|dar)\b/.test(q)) {
    return "gap_who";
  }
  if (/^para que (la |lo )?necesitas\b/.test(q)) {
    return "gap_why_need";
  }
  if (/^estas seguro\b/.test(q)) {
    return "confirm";
  }
  if (/^que sabemos de (el|ella)\b/.test(q) || /^que sabemos de el\b/.test(q)) {
    return "pronoun";
  }
  if (/^tiene( alguna)? accion(es)?\b/.test(q) || /^y tiene( alguna)? accion(es)?\b/.test(q)) {
    return "action";
  }
  if (/^y [a-z0-9]/.test(q) && q.split(" ").length <= 6) {
    return "entity_intro";
  }
  return "other";
}

function isDefensibleFollowUpKind(kind) {
  return (
    kind === "attention" ||
    kind === "why" ||
    kind === "entity_intro" ||
    kind === "pronoun" ||
    kind === "action" ||
    kind === "gap_what" ||
    kind === "gap_who" ||
    kind === "gap_why_need" ||
    kind === "confirm"
  );
}

function isStandaloneDetected(detected) {
  if (!detected || !detected.intent || detected.intent === "unknown") return false;
  if (detected.requires_clarification && Number(detected.confidence) < 0.55) return false;
  return Number(detected.confidence) >= 0.55;
}

function extractEntityHint(question) {
  const raw = String(question || "").trim();
  if (!raw) return null;
  const q = normalizeText(raw);
  if (/^que sabemos de (el|ella)\b/.test(q)) return null;
  if (/\b(el|ella|ese cliente|este cliente)\b/.test(q) && !/\by [a-z]/.test(q)) {
    if (!/\bdejo de comprar\b/.test(q) && !/\bexpediente\b/.test(q)) return null;
  }

  const yMatch = raw.match(/^\s*¿?\s*y\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’-]+)/i);
  if (yMatch && yMatch[1]) {
    const name = yMatch[1].replace(/[?¿!.]+$/g, "").trim();
    if (name && !/^(ayer|la|el|eso|esa|este|esta)$/i.test(name)) return name;
  }

  const stopMatch = raw.match(/dej[oó]\s+de\s+comprar\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (stopMatch && stopMatch[1]) {
    const name = stopMatch[1].replace(/[?¿!.]+$/g, "").trim();
    if (name && !/^(el|ella|ese cliente)$/i.test(name)) return name;
  }

  const sabemos = raw.match(/sabemos(?:\s+comercialmente)?\s+de\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (sabemos && sabemos[1] && !/^(él|el|ella)\b/i.test(sabemos[1].trim())) {
    return sabemos[1].replace(/[?¿!.]+$/g, "").trim();
  }

  const pasoCon = raw.match(/pas[oó]\s+con\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (pasoCon && pasoCon[1] && !/^(el|ella|eso|esto|este|esta)\b/i.test(pasoCon[1].trim())) {
    return pasoCon[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const quedoLoDe = raw.match(/qued[oó]\s+lo\s+de\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (quedoLoDe && quedoLoDe[1]) {
    return quedoLoDe[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const seguimos = raw.match(/seguimos\s+con\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (seguimos && seguimos[1] && !/^(el|ella|eso)\b/i.test(seguimos[1].trim())) {
    return seguimos[1].replace(/[?¿!.]+$/g, "").trim();
  }
  const revisando = raw.match(/revisando\s+(.+?)(?:\s*[?¿!.]*)$/i);
  if (revisando && revisando[1]) {
    return revisando[1].replace(/[?¿!.]+$/g, "").trim();
  }

  return null;
}

function reconstructFromUserHistory(history, detectIntent) {
  const users = (history || [])
    .filter((m) => m && m.role === "user")
    .map((m) => String(m.content || "").trim())
    .filter(Boolean);

  let parent_intent = null;
  let lastEntityHint = null;

  for (const u of users) {
    const kind = classifyTurnKind(u);
    if (kind === "plant_switch" || kind === "topic_return" || kind === "period_switch") {
      lastEntityHint = null;
      if (kind === "plant_switch" && parent_intent && INHERITABLE_INTENTS.includes(parent_intent)) {
        continue;
      }
      if (kind === "topic_return" || kind === "period_switch") {
        continue;
      }
    }
    const detected = typeof detectIntent === "function" ? detectIntent(u) : null;
    if (detected && isStandaloneDetected(detected) && INHERITABLE_INTENTS.includes(detected.intent)) {
      parent_intent = detected.intent;
    }
    const hint = extractEntityHint(u);
    if (hint) lastEntityHint = hint;
  }

  return { parent_intent, lastEntityHint };
}

function resolveConversationTurn(opts) {
  const question = String((opts && opts.question) || "").trim();
  const plantaId = Number(opts && opts.plantaId);
  const detectIntent = opts && opts.detectIntent;
  const history = stripCurrentFromHistory(opts && opts.history, question);
  const echoed = sanitizeEchoedState(opts && opts.echoedState, plantaId);
  const reconstructed = reconstructFromUserHistory(history, detectIntent);
  const detected = typeof detectIntent === "function" ? detectIntent(question) : { intent: "unknown", confidence: 0.35 };

  const kind = classifyTurnKind(question);
  const plantMismatch = Boolean(echoed.plant_mismatch);
  const switchInvalidates = kind === "plant_switch" || plantMismatch;

  let parent_intent = echoed.parent_intent || reconstructed.parent_intent;
  if (switchInvalidates && parent_intent && !INHERITABLE_INTENTS.includes(parent_intent)) {
    parent_intent = null;
  }

  const standalone = isStandaloneDetected(detected);
  const defensible = isDefensibleFollowUpKind(kind) && INHERITABLE_INTENTS.includes(parent_intent);

  let inherit = false;
  if (!standalone && defensible && parent_intent && kind !== "period_switch" && kind !== "topic_return") {
    inherit = true;
  }

  const currentHint = extractEntityHint(question);
  let entity_hint = currentHint;
  if (!entity_hint && (kind === "pronoun" || kind === "action" || kind === "gap_what" || kind === "gap_who" || kind === "gap_why_need")) {
    if (!switchInvalidates && echoed.active_entities[0]) {
      entity_hint = echoed.active_entities[0].display;
    } else if (!switchInvalidates) {
      entity_hint = reconstructed.lastEntityHint;
    }
  }
  if (switchInvalidates && kind !== "entity_intro") {
    entity_hint = currentHint;
  }

  const unknownNeedsClarification =
    !standalone &&
    !inherit &&
    detected.intent === "unknown" &&
    kind !== "plant_switch";

  const outOfSliceClarify = kind === "period_switch" || kind === "topic_return";

  return {
    kind,
    detected_intent: detected.intent,
    detected_confidence: detected.confidence,
    standalone,
    inherit,
    inherit_parent_intent: inherit ? parent_intent : null,
    parent_intent,
    planta_id: Number.isFinite(plantaId) ? plantaId : null,
    entity_hint,
    plant_mismatch: plantMismatch,
    invalidate_entity: switchInvalidates,
    invalidate_gap: switchInvalidates,
    unknown_needs_clarification: unknownNeedsClarification,
    out_of_slice_clarify: outOfSliceClarify,
    last_evidence_bundle_type: switchInvalidates ? null : echoed.last_evidence_bundle_type || null,
  };
}

function resolveUniqueEntity(hint, candidates) {
  const h = normalizeText(hint);
  if (!h) return { status: "none" };
  const hits = [];
  const seenKeys = new Set();
  for (const c of candidates || []) {
    const display = String((c && (c.display || c.cliente_nombre || c.nombre_canonico)) || "").trim();
    const dn = normalizeText(display);
    if (!dn) continue;
    const tokens = dn.split(" ").filter(Boolean);
    const hintTokens = h.split(" ").filter(Boolean);
    const exact = dn === h;
    const wholeWord = hintTokens.length === 1 ? tokens.includes(h) : hintTokens.every((t) => tokens.includes(t));
    if (!exact && !wholeWord) continue;
    const keys = Array.isArray(c.cliente_keys)
      ? c.cliente_keys.map((k) => String(k).trim()).filter(Boolean)
      : c.cliente_key
        ? [String(c.cliente_key).trim()]
        : [];
    const identity = keys[0] || `name:${dn}`;
    if (seenKeys.has(identity)) continue;
    seenKeys.add(identity);
    hits.push({
      kind: "client",
      display,
      cliente_key: keys[0] || null,
      cliente_keys: keys,
      coverage_status: c.coverage_status || null,
      has_dicf_action: c.has_dicf_action,
      latest_action: c.latest_action || null,
    });
  }
  if (hits.length === 1) return { status: "unique", entity: hits[0] };
  if (hits.length > 1) return { status: "ambiguous", matches: hits };
  return { status: "none" };
}

function collectEntityCandidatesFromEvidence(assembled) {
  const out = [];
  const mat = assembled && assembled.commercial_materiality;
  for (const cat of (mat && mat.categories) || []) {
    for (const c of [...(cat.top_clients || []), ...(cat.magnitude_unknown_clients || [])]) {
      out.push({
        display: c.cliente_display || c.cliente_nombre,
        cliente_keys: c.cliente_keys || [],
        cliente_key: Array.isArray(c.cliente_keys) ? c.cliente_keys[0] : null,
        coverage_status: c.coverage_status,
        has_dicf_action: c.has_dicf_action,
        latest_action: c.latest_action || null,
      });
    }
  }
  const dicf =
    assembled &&
    assembled.sources &&
    assembled.sources.dicf &&
    assembled.sources.dicf.payload &&
    assembled.sources.dicf.payload.actions;
  for (const a of dicf || []) {
    if (!a || !a.cliente_nombre) continue;
    out.push({
      display: a.cliente_nombre,
      cliente_keys: a.cliente_key ? [String(a.cliente_key)] : [],
      cliente_key: a.cliente_key ? String(a.cliente_key) : null,
      latest_action: {
        responsable: a.responsable || null,
        public_code: a.public_code || null,
      },
    });
  }
  return out;
}

function derivePendingInformationGap(assembled, activeEntity) {
  const missing = [];
  for (const L of (assembled && assembled.limitations) || []) {
    if (L) missing.push(String(L));
  }

  let physical_person = null;
  let physical_source = null;
  let why_blocks =
    "Sin un hecho adicional observado no se puede atribuir causa ni cerrar el diagnóstico.";

  const sources = assembled && assembled.sources;
  if (sources && typeof sources === "object") {
    for (const [name, block] of Object.entries(sources)) {
      if (block && block.status === "SOURCE_RESTRICTED") {
        missing.push(`${name}:SOURCE_RESTRICTED`);
      }
    }
  }

  if (activeEntity && activeEntity.display) {
    const resolved = resolveUniqueEntity(activeEntity.display, collectEntityCandidatesFromEvidence(assembled));
    if (resolved.status === "unique") {
      const cov = resolved.entity.coverage_status;
      if (cov === "coverage_unknown" || cov === "without_action" || resolved.entity.has_dicf_action === false) {
        missing.push("hecho_que_explique_el_movimiento_comercial");
        why_blocks =
          "Falta un hecho de cobertura o una observación que explique el movimiento; sin eso no se atribuye causa.";
      }
      const latest = resolved.entity.latest_action;
      if (latest && latest.responsable && String(latest.responsable).trim()) {
        physical_person = String(latest.responsable).trim();
        physical_source = latest.public_code
          ? `dicf_accion:${latest.public_code}`
          : "dicf_accion";
      }
    }
  }

  if (!missing.length) {
    missing.push("motivo_no_observado_en_fuentes_disponibles");
  }

  return {
    missing_fields: [...new Set(missing)].slice(0, 12),
    why_blocks,
    physical_source,
    physical_person,
  };
}

function buildConversationState(opts) {
  const plantaId = Number(opts && opts.plantaId);
  const parent_intent = opts && INHERITABLE_INTENTS.includes(opts.parent_intent) ? opts.parent_intent : null;
  const entities = sanitizeActiveEntities(opts && opts.active_entities);
  return {
    parent_intent,
    planta_id: Number.isFinite(plantaId) ? plantaId : null,
    active_entities: entities,
    last_evidence_bundle_type: opts && opts.last_evidence_bundle_type ? String(opts.last_evidence_bundle_type) : null,
    pending_information_gap: opts && opts.pending_information_gap ? opts.pending_information_gap : null,
  };
}

function formatConversationHiloForModel(state) {
  const s = state && typeof state === "object" ? state : emptyConversationState(null);
  const entity = Array.isArray(s.active_entities) && s.active_entities[0] ? s.active_entities[0] : null;
  const gap = s.pending_information_gap;
  const lines = [
    HILO_PREAMBLE,
    `parent_intent=${s.parent_intent || "ninguno"}`,
    `planta_id=${s.planta_id != null ? s.planta_id : "desconocida"}`,
    entity
      ? `active_entity=${entity.display}${entity.cliente_key ? ` key=${entity.cliente_key}` : ""}`
      : "active_entity=ninguna",
    `last_evidence_bundle_type=${s.last_evidence_bundle_type || "ninguno"}`,
    gap
      ? `pending_information_gap.missing=${(gap.missing_fields || []).join(" | ") || "—"}`
      : "pending_information_gap=ninguno",
    gap ? `pending_information_gap.why=${gap.why_blocks || "—"}` : null,
    gap && gap.physical_person
      ? `pending_information_gap.physical_person=${gap.physical_person} (vínculo físico en evidencia fresca)`
      : "pending_information_gap.physical_person=no hay vínculo físico nombrable",
    "Los hechos están solo en los bloques de evidencia de este turno (requery). No uses este hilo como dato de DB.",
  ];
  return lines.filter((x) => x != null).join("\n");
}

function buildUnknownClarificationResult(opts) {
  const planta_id = opts && opts.planta_id;
  const reason =
    (opts && opts.reason) ||
    "No pude anclar esta frase a un tema en curso ni clasificarla como consulta independiente.";
  return {
    ok: true,
    answer:
      `${reason} ` +
      "Indica si quieres el diagnóstico de la planta actual, un cliente concreto u otro tema. " +
      "No asumo el hilo ni consulto Action Register a ciegas.",
    sources: [],
    context_meta: {
      mode: "conversation_clarification",
      prompt_mode: "clarification",
      requires_clarification: true,
      openai_called: false,
      planta_id,
      timestamp: new Date().toISOString(),
      conversation_state: (opts && opts.conversation_state) || emptyConversationState(planta_id),
    },
  };
}

function buildEntityClarificationResult(opts) {
  const planta_id = opts && opts.planta_id;
  const hint = (opts && opts.hint) || "ese nombre";
  const status = opts && opts.status;
  const reason =
    status === "ambiguous"
      ? `«${hint}» coincide con más de un cliente en la planta actual. Precisa el nombre. No elijo en silencio.`
      : `No encontré un cliente único para «${hint}» en la planta actual. Precisa el nombre. No invento ni reutilizo otra planta.`;
  return {
    ok: true,
    answer: reason,
    sources: [],
    context_meta: {
      mode: "entity_clarification",
      prompt_mode: "clarification",
      requires_clarification: true,
      openai_called: false,
      planta_id,
      timestamp: new Date().toISOString(),
      conversation_state: (opts && opts.conversation_state) || emptyConversationState(planta_id),
    },
  };
}

function buildGapWhoAnswer(gap) {
  const person = gap && gap.physical_person ? String(gap.physical_person).trim() : "";
  if (person) {
    const src = gap.physical_source ? ` Vínculo físico: ${gap.physical_source}.` : "";
    return `La evidencia fresca nombra a ${person} como responsable de una acción asociada.${src} Eso no prueba que sea dueño de la causa comercial.`;
  }
  return "No hay un responsable nombrable con vínculo físico en la evidencia de este turno. No invento una persona.";
}

function buildGapWhatAnswer(gap) {
  const fields = (gap && gap.missing_fields) || [];
  const why = (gap && gap.why_blocks) || "";
  const listed = fields.length ? fields.join("; ") : "un hecho observado que hoy no está en las fuentes";
  return `Me falta: ${listed}. ${why}`.trim();
}

function buildGapWhyNeedAnswer(gap) {
  return (
    (gap && gap.why_blocks) ||
    "Ese dato desbloquearía atribuir o descartar una causa con un hecho, no con una hipótesis."
  );
}

function prependHiloToUserContent(userContent, state) {
  const hilo = formatConversationHiloForModel(state);
  return `${hilo}\n\n${userContent || ""}`;
}

module.exports = {
  INHERITABLE_INTENTS,
  HILO_PREAMBLE,
  normalizeText,
  emptyConversationState,
  sanitizeActiveEntities,
  sanitizeEchoedState,
  stripCurrentFromHistory,
  classifyTurnKind,
  isDefensibleFollowUpKind,
  isStandaloneDetected,
  extractEntityHint,
  reconstructFromUserHistory,
  resolveConversationTurn,
  resolveUniqueEntity,
  collectEntityCandidatesFromEvidence,
  derivePendingInformationGap,
  buildConversationState,
  formatConversationHiloForModel,
  buildUnknownClarificationResult,
  buildEntityClarificationResult,
  buildGapWhoAnswer,
  buildGapWhatAnswer,
  buildGapWhyNeedAnswer,
  prependHiloToUserContent,
};
