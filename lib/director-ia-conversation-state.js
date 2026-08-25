"use strict";

/**
 * Continuidad conversacional del chat legado — estado estructurado EFÍMERO.
 * No DB. No cross-session. No evidence cache. History no es evidencia.
 */

const { namesDailySalesMetric, namesDailyDiscountMetric } = require("./director-ia-planner");
const { isCommercialTrendQuestion } = require("./director-ia-commercial-trend");
const { isClientProfileFollowUp, sanitizePeriodMonths } = require("./director-ia-client-profile");
const { isTallerMayorFollowUp } = require("./director-ia-taller-mayor");
const { isIgfReviewableSupportsQuestion } = require("./director-ia-igf-reviewable-supports");
const { isPreMeetingFollowUp } = require("./director-ia-pre-meeting");
const { isMonthCloseQuestion, isMonthCloseFollowUp, wantsFirstMover } = require("./director-ia-month-close-result");

const INHERITABLE_INTENTS = Object.freeze([
  "plant_diagnosis",
  "expediente_comercial",
  "daily_sales_deviation",
  "daily_discount_deviation",
  "daily_executive_brief",
  "commercial_trend",
  "client_profile",
  "taller_mayor",
  "action_status",
  "igf_reviewable_supports",
  "pre_meeting_brief",
  "month_close_result",
]);

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
    active_date: null,
    active_range_days: null,
    active_channel: null,
    active_period_months: [],
    meeting_type: null,
    previous_frame: null,
  };
}

function sanitizeActiveEntities(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (!first || typeof first !== "object") return [];
  const display = String(first.display || first.cliente_nombre || "").trim();
  if (!display) return [];
  const kind = String(first.kind || "client").trim() || "client";
  if (kind === "unit" || kind === "folio") {
    const unit_token = String(first.unit_token || display).trim();
    if (!unit_token) return [];
    const folio_id =
      first.folio_id != null && first.folio_id !== "" && Number.isFinite(Number(first.folio_id))
        ? Number(first.folio_id)
        : null;
    const numero_folio = first.numero_folio ? String(first.numero_folio).trim() : null;
    return [
      {
        kind: folio_id != null ? "folio" : "unit",
        display: folio_id != null && numero_folio ? numero_folio : unit_token,
        unit_token,
        folio_id,
        numero_folio: numero_folio || null,
        cliente_key: null,
        cliente_keys: [],
      },
    ];
  }
  const keys = Array.isArray(first.cliente_keys)
    ? first.cliente_keys.map((k) => String(k).trim()).filter(Boolean)
    : first.cliente_key
      ? [String(first.cliente_key).trim()]
      : [];
  const entity = {
    kind,
    display,
    cliente_key: kind === "client" ? keys[0] || null : null,
    cliente_keys: kind === "client" ? keys : [],
  };
  if (kind === "ar_responsable" || kind === "ar_action") {
    const uid = Number(first.usuario_id);
    entity.usuario_id = Number.isFinite(uid) && uid > 0 ? uid : null;
    entity.name_key = first.name_key ? String(first.name_key).trim() : first.key ? String(first.key).trim() : null;
    const aid = first.action_id;
    entity.action_id =
      aid != null && aid !== "" && Number.isFinite(Number(aid)) ? Number(aid) : null;
  }
  return [entity];
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
    active_date: plantMismatch ? null : sanitizeActiveDate(echoed.active_date),
    active_range_days: plantMismatch ? null : sanitizeActiveRangeDays(echoed.active_range_days),
    active_channel: plantMismatch ? null : sanitizeActiveChannel(echoed.active_channel),
    active_period_months: plantMismatch ? [] : sanitizePeriodMonths(echoed.active_period_months).map((m) => m.yyyymm),
    meeting_type: plantMismatch ? null : sanitizeMeetingType(echoed.meeting_type),
    previous_frame: plantMismatch ? null : sanitizePreviousFrame(echoed.previous_frame, requestPlant),
    plant_mismatch: plantMismatch,
    echoed_planta_id: Number.isFinite(echoedPlant) ? echoedPlant : null,
  };
}

function snapshotCurrentFrame(state) {
  if (!state || typeof state !== "object") return null;
  if (!INHERITABLE_INTENTS.includes(state.parent_intent)) return null;
  const plantaId = Number(state.planta_id);
  return {
    parent_intent: state.parent_intent,
    planta_id: Number.isFinite(plantaId) ? plantaId : null,
    active_entities: sanitizeActiveEntities(state.active_entities),
    last_evidence_bundle_type: state.last_evidence_bundle_type ? String(state.last_evidence_bundle_type) : null,
    pending_information_gap: state.pending_information_gap || null,
    active_date: sanitizeActiveDate(state.active_date),
    active_range_days: sanitizeActiveRangeDays(state.active_range_days),
    active_channel: sanitizeActiveChannel(state.active_channel),
    active_period_months: sanitizePeriodMonths(state.active_period_months).map((m) => m.yyyymm),
    meeting_type: sanitizeMeetingType(state.meeting_type),
  };
}

function sanitizePreviousFrame(raw, requestPlantaId) {
  if (!raw || typeof raw !== "object") return null;
  const framePlant = Number(raw.planta_id);
  const requestPlant = Number(requestPlantaId);
  if (Number.isFinite(framePlant) && Number.isFinite(requestPlant) && framePlant !== requestPlant) {
    return null;
  }
  const snap = snapshotCurrentFrame({
    ...raw,
    planta_id: Number.isFinite(requestPlant) ? requestPlant : framePlant,
  });
  return snap;
}

function isDailyMetricIntent(intent) {
  return intent === "daily_sales_deviation" || intent === "daily_discount_deviation";
}

function isDailyParentIntent(intent) {
  return isDailyMetricIntent(intent) || intent === "daily_executive_brief";
}

function shouldCapturePrevious(incoming, newIntent) {
  const snap = snapshotCurrentFrame(incoming);
  if (!snap) return false;
  if (!newIntent || !INHERITABLE_INTENTS.includes(newIntent)) return true;
  return snap.parent_intent !== newIntent;
}

function resolveOutgoingPreviousFrame(incoming, newIntent, restorePrevious) {
  if (restorePrevious) return snapshotCurrentFrame(incoming);
  if (shouldCapturePrevious(incoming, newIntent)) return snapshotCurrentFrame(incoming);
  return sanitizePreviousFrame(incoming && incoming.previous_frame, incoming && incoming.planta_id);
}

function preserveFramesOnClarify(incoming, plantaId) {
  const current = snapshotCurrentFrame(incoming);
  const parked =
    sanitizePreviousFrame(incoming && incoming.previous_frame, plantaId) || current;
  return buildConversationState({
    plantaId,
    parent_intent: current ? current.parent_intent : null,
    active_entities: current ? current.active_entities : [],
    last_evidence_bundle_type: current ? current.last_evidence_bundle_type : null,
    pending_information_gap: current ? current.pending_information_gap : null,
    active_date: current ? current.active_date : null,
    active_range_days: current ? current.active_range_days : null,
    active_channel: current ? current.active_channel : null,
    active_period_months: current ? current.active_period_months : [],
    meeting_type: current ? current.meeting_type : null,
    previous_frame: parked,
  });
}

function parkCurrentAndClear(incoming, plantaId) {
  const current = snapshotCurrentFrame(incoming);
  const parked =
    sanitizePreviousFrame(incoming && incoming.previous_frame, plantaId) || current;
  return buildConversationState({
    plantaId,
    parent_intent: null,
    active_entities: [],
    last_evidence_bundle_type: null,
    pending_information_gap: null,
    active_date: null,
    active_range_days: null,
    active_channel: null,
    active_period_months: [],
    meeting_type: null,
    previous_frame: parked,
  });
}

function topicReturnCue(question) {
  const q = normalizeText(question);
  if (/\bventa\b/.test(q) || /\bvendi/.test(q)) return { kind: "intent", intent: "daily_sales_deviation" };
  if (/\bdescuento\b/.test(q)) return { kind: "intent", intent: "daily_discount_deviation" };
  if (/\baccion/.test(q)) return { kind: "intent", intent: "action_status" };
  if (/\bexpediente\b/.test(q)) return { kind: "intent", intent: "expediente_comercial" };
  if (/\bplanta\b/.test(q)) return { kind: "intent", intent: "plant_diagnosis" };
  if (/\b(lo anterior|tema anterior)\b/.test(q)) return { kind: "previous" };
  const m = String(question || "").match(
    /(?:volvamos|volviendo|retomemos)\s+(?:a\s+)?(?:la\s+|el\s+|lo\s+)?(.+?)(?:\s*[?¿!.]*)$/i
  );
  if (m && m[1]) {
    const name = m[1].trim();
    const n = normalizeText(name);
    if (!n || n === "eso" || n === "esto" || n === "ello") return { kind: "previous" };
    return { kind: "name", name };
  }
  return { kind: "previous" };
}

function frameMatchesReturnCue(frame, cue) {
  if (!frame || !cue) return false;
  if (cue.kind === "intent") return frame.parent_intent === cue.intent;
  if (cue.kind === "name") {
    const ent = Array.isArray(frame.active_entities) && frame.active_entities[0];
    if (!ent || !ent.display) return false;
    const display = normalizeText(ent.display);
    const name = normalizeText(cue.name);
    if (!name) return false;
    return display === name || display.split(/\s+/).includes(name) || display.includes(name);
  }
  return false;
}

function sanitizeActiveDate(raw) {
  const s = String(raw || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function sanitizeActiveRangeDays(raw) {
  const n = Number(raw);
  if (n === 90) return 90;
  if (n === 30) return 30;
  return null;
}

function sanitizeActiveChannel(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "casa" || s === "comisionista" || s === "both") return s;
  return null;
}

function sanitizeMeetingType(raw) {
  return raw === "monthly_close" ? "monthly_close" : null;
}

function isCommercialTrendParent(intent) {
  return intent === "commercial_trend";
}

function isClientProfileParent(intent) {
  return intent === "client_profile";
}

function isTallerMayorParent(intent) {
  return intent === "taller_mayor";
}

function isPreMeetingParent(intent) {
  return intent === "pre_meeting_brief";
}

function isMonthCloseParent(intent) {
  return intent === "month_close_result";
}

function hasCanonicalUnitEntity(echoed) {
  const e = echoed && Array.isArray(echoed.active_entities) ? echoed.active_entities[0] : null;
  if (!e || (e.kind !== "unit" && e.kind !== "folio")) return false;
  return Boolean(String(e.unit_token || "").trim());
}

function hasActiveFolioEntity(echoed) {
  const e = echoed && Array.isArray(echoed.active_entities) ? echoed.active_entities[0] : null;
  if (!e) return false;
  return e.folio_id != null && Number.isFinite(Number(e.folio_id));
}

function hasCanonicalClientEntity(echoed) {
  const e = echoed && Array.isArray(echoed.active_entities) ? echoed.active_entities[0] : null;
  if (!e || e.kind === "ar_responsable" || e.kind === "ar_action") return false;
  const key = String(e.cliente_key || "").trim();
  const keys = Array.isArray(e.cliente_keys) ? e.cliente_keys.map((k) => String(k || "").trim()).filter(Boolean) : [];
  return Boolean(key || keys.length);
}

function namedDailyMetricSignal(question) {
  const q = normalizeText(question);
  const sales = namesDailySalesMetric(q);
  const discount = namesDailyDiscountMetric(q);
  if (sales && discount) return null;
  if (sales) return "daily_sales_deviation";
  if (discount) return "daily_discount_deviation";
  return null;
}

function hasMonthlyPeriodSignal(question) {
  const q = normalizeText(question);
  return /\b(mensual|este mes|del mes|el mes)\b/.test(q) || /\bmes\b/.test(q);
}

function hasHoyDateSignal(question) {
  return /\bhoy\b/.test(normalizeText(question));
}

function extractExplicitYmd(question) {
  const m = String(question || "").match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return m ? sanitizeActiveDate(m[1]) : null;
}

function hasUnresolvedExplicitDate(question) {
  return /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(normalizeText(question));
}

/** Identity KEEP: these are not client names. Not a follow-up phrasebook. */
const NON_IDENTITY_TOKENS = Object.freeze([
  "ayer",
  "la",
  "el",
  "ello",
  "ella",
  "ellos",
  "ellas",
  "eso",
  "esa",
  "ese",
  "esto",
  "esta",
  "este",
  "aquello",
  "lo",
  "le",
  "les",
  "me",
  "te",
  "se",
  "nos",
  "yo",
  "tu",
  "usted",
]);

const PRONOUN_TOKENS = Object.freeze(["el", "ella", "ellos", "ellas", "lo", "le"]);

function isNonIdentityToken(token) {
  return NON_IDENTITY_TOKENS.includes(normalizeText(token).split(" ")[0] || "");
}

function isPronounToken(token) {
  return PRONOUN_TOKENS.includes(normalizeText(token).split(" ")[0] || "");
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
  if (
    /^volvamos\b/.test(q) ||
    /^volviendo a lo anterior\b/.test(q) ||
    /^volviendo a\b/.test(q) ||
    /^retomemos\b/.test(q) ||
    /^hablemos de\b/.test(q) ||
    /^hablando de\b/.test(q)
  ) {
    return "topic_return";
  }
  if (
    /^y ayer\b/.test(q) ||
    /^y la anterior\b/.test(q) ||
    /^y la semana anterior\b/.test(q)
  ) {
    return "period_switch";
  }
  if (
    /^contra que\b/.test(q) ||
    /\bcomparado contra que\b/.test(q) ||
    /\bcontra que (la |lo )?(estas )?compar/.test(q)
  ) {
    return "reference_probe";
  }
  if (
    /^y (los )?comisionistas?\b/.test(q) ||
    /^y casa\b/.test(q)
  ) {
    return "channel_switch";
  }
  if (/^compar/.test(q) && !/\bcontra que\b/.test(q)) {
    return "comparison";
  }
  if (
    /^quien explica\b/.test(q) ||
    /^que clientes explican\b/.test(q) ||
    /^quienes explican\b/.test(q) ||
    /^que cliente explica\b/.test(q) ||
    /^quien movio mas\b/.test(q) ||
    /^quien lo movio mas\b/.test(q)
  ) {
    return "contributors";
  }
  if (/^fue general\b/.test(q) || /^es general\b/.test(q)) {
    return "attention";
  }
  if (
    /^y por canal\b/.test(q) ||
    /^por canal\b/.test(q) ||
    /^que canales? explican\b/.test(q)
  ) {
    return "channel_probe";
  }
  if (/^sabemos por que\b/.test(q) || /^ya sabemos por que\b/.test(q)) {
    return "why_know";
  }

  if (
    /^que te llama la atencion\b/.test(q) ||
    /^que es lo que mas te llama/.test(q) ||
    /^que te llama\b/.test(q) ||
    /^que mas ves\b/.test(q) ||
    /^que deberia revisar\b/.test(q)
  ) {
    return "attention";
  }
  if (/^por que$/.test(q) || /^por que\?$/.test(q)) {
    return "why";
  }
  if (
    /^que falta saber\b/.test(q) ||
    /^que (informacion )?te falta\b/.test(q) ||
    /^que te falta\b/.test(q) ||
    /^que falta investigar\b/.test(q) ||
    /^que falta$/.test(q) ||
    /^que sigue sin explicacion\b/.test(q)
  ) {
    return "gap_what";
  }
  if (
    /^quien puede (darnos|darme|dar)\b/.test(q) ||
    /^quien puede aclarar/.test(q)
  ) {
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
    const restNorm = q.replace(/^y\s+/, "");
    const afterY = restNorm.split(" ")[0] || "";
    if (isPronounToken(afterY) || /^(ese|esta|este|esa)\s+cliente/.test(restNorm)) {
      if (namedDailyMetricSignal(q)) return "other";
      return "pronoun";
    }
    if (isNonIdentityToken(afterY)) {
      return "other";
    }
    const afterRaw = String(question || "").trim().replace(/^\s*¿?\s*[yY]\s+/, "");
    const firstRaw = (afterRaw.split(/\s+/)[0] || "").replace(/[?¿!.]+$/g, "");
    if (/^[A-ZÁÉÍÓÚÑ]/.test(firstRaw)) {
      return "entity_intro";
    }
    return "other";
  }
  return "other";
}

function isDailyFollowUpKind(kind) {
  return (
    kind === "reference_probe" ||
    kind === "contributors" ||
    kind === "channel_probe" ||
    kind === "channel_switch" ||
    kind === "comparison" ||
    kind === "why_know" ||
    kind === "attention" ||
    kind === "why" ||
    kind === "gap_what" ||
    kind === "gap_who" ||
    kind === "gap_why_need" ||
    kind === "confirm" ||
    kind === "pronoun" ||
    kind === "action" ||
    kind === "entity_intro"
  );
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

  const yMatch = raw.match(/^\s*¿?\s*[yY]\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’-]+)/);
  if (yMatch && yMatch[1]) {
    const name = yMatch[1].replace(/[?¿!.]+$/g, "").trim();
    if (name && !isNonIdentityToken(name) && !isPronounToken(name)) return name;
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
  const clienteNamed = raw.match(/\bcliente\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’-]+)/i);
  if (clienteNamed && clienteNamed[1] && !isNonIdentityToken(clienteNamed[1]) && !isPronounToken(clienteNamed[1])) {
    return clienteNamed[1].replace(/[?¿!.]+$/g, "").trim();
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
    if (kind === "period_switch") {
      lastEntityHint = null;
      parent_intent = null;
      continue;
    }
    const detected = typeof detectIntent === "function" ? detectIntent(u) : null;
    if (detected && isStandaloneDetected(detected)) {
      if (INHERITABLE_INTENTS.includes(detected.intent)) {
        parent_intent = detected.intent;
      } else {
        parent_intent = null;
        lastEntityHint = null;
      }
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
  const switchInvalidates = plantMismatch;

  const previousFrame = plantMismatch ? null : sanitizePreviousFrame(echoed.previous_frame, plantaId);
  let parent_intent = echoed.parent_intent;
  if (!parent_intent && !previousFrame) {
    parent_intent = reconstructed.parent_intent;
  }
  if (switchInvalidates && parent_intent && !INHERITABLE_INTENTS.includes(parent_intent)) {
    parent_intent = null;
  }

  const dailyParent = isDailyParentIntent(parent_intent);
  const trendParent = isCommercialTrendParent(parent_intent);
  const profileParent = isClientProfileParent(parent_intent);
  const tallerMayorParent = isTallerMayorParent(parent_intent);
  const preMeetingParent = isPreMeetingParent(parent_intent);
  const monthCloseParent = isMonthCloseParent(parent_intent);
  const isolatedUnknownEarly = !detected || detected.intent === "unknown";
  const dailyFollowUp = dailyParent && isDailyFollowUpKind(kind);
  const profileHandoffFromTrend =
    trendParent &&
    hasCanonicalClientEntity(echoed) &&
    !switchInvalidates &&
    !isCommercialTrendQuestion(question) &&
    isClientProfileFollowUp(question, kind, { hasActiveClient: true });
  const trendFollowUp =
    trendParent &&
    !profileHandoffFromTrend &&
    (isDailyFollowUpKind(kind) || isolatedUnknownEarly);
  const profileFollowUp =
    profileParent && (isDailyFollowUpKind(kind) || isolatedUnknownEarly || isClientProfileFollowUp(question, kind, { hasActiveClient: true }));
  const tallerMayorFollowUp =
    tallerMayorParent &&
    !switchInvalidates &&
    (isDailyFollowUpKind(kind) ||
      isolatedUnknownEarly ||
      isTallerMayorFollowUp(question, kind, {
        hasActiveUnit: hasCanonicalUnitEntity(echoed),
        hasActiveFolio: hasActiveFolioEntity(echoed),
      }) ||
      ((hasCanonicalUnitEntity(echoed) || hasActiveFolioEntity(echoed)) &&
        typeof isIgfReviewableSupportsQuestion === "function" &&
        isIgfReviewableSupportsQuestion(question)));
  const preMeetingFollowUp =
    preMeetingParent &&
    !switchInvalidates &&
    typeof isPreMeetingFollowUp === "function" &&
    isPreMeetingFollowUp(question, kind);
  const monthCloseHandoffFromPreMeeting =
    preMeetingParent &&
    !switchInvalidates &&
    typeof isMonthCloseQuestion === "function" &&
    isMonthCloseQuestion(question);
  const profileHandoffFromMonthClose =
    monthCloseParent &&
    !switchInvalidates &&
    hasCanonicalClientEntity(echoed) &&
    typeof isClientProfileFollowUp === "function" &&
    isClientProfileFollowUp(question, kind, { hasActiveClient: true }) &&
    !(typeof wantsFirstMover === "function" && wantsFirstMover(question));
  const monthCloseFollowUp =
    monthCloseParent &&
    !switchInvalidates &&
    !profileHandoffFromMonthClose &&
    typeof isMonthCloseFollowUp === "function" &&
    isMonthCloseFollowUp(question, kind);
  const standalone = isStandaloneDetected(detected) && !dailyFollowUp && !trendFollowUp && !profileHandoffFromTrend && !profileFollowUp && !tallerMayorFollowUp && !preMeetingFollowUp && !monthCloseHandoffFromPreMeeting && !monthCloseFollowUp && !profileHandoffFromMonthClose;
  const qNorm = normalizeText(question);
  const isSwitchVerb = /^hablemos de\b/.test(qNorm) || /^hablando de\b/.test(qNorm);
  const isReturnVerb = kind === "topic_return" && !isSwitchVerb;
  const returnCue = isReturnVerb ? topicReturnCue(question) : { kind: "none" };
  const currentForMatch = {
    parent_intent,
    active_entities: echoed.active_entities,
  };
  const prevMatch = frameMatchesReturnCue(previousFrame, returnCue);
  const currMatch = frameMatchesReturnCue(currentForMatch, returnCue);
  const restorePrevious =
    !standalone &&
    !plantMismatch &&
    isReturnVerb &&
    Boolean(previousFrame) &&
    (returnCue.kind === "previous" ||
      prevMatch ||
      (returnCue.kind === "name" &&
        !currMatch &&
        (!INHERITABLE_INTENTS.includes(parent_intent) ||
          (previousFrame.parent_intent === "plant_diagnosis" && parent_intent !== "plant_diagnosis"))));
  const stayOnCurrent =
    !standalone &&
    !restorePrevious &&
    isReturnVerb &&
    INHERITABLE_INTENTS.includes(parent_intent) &&
    (currMatch || (returnCue.kind === "name" && parent_intent === "plant_diagnosis"));
  const topicConflict =
    kind === "period_switch" ||
    plantMismatch ||
    (kind === "plant_switch" && !standalone) ||
    (kind === "topic_return" && !restorePrevious && !stayOnCurrent);
  const bundleType = echoed.last_evidence_bundle_type;
  const bundleOk =
    !bundleType || bundleType === parent_intent || INHERITABLE_INTENTS.includes(String(bundleType));
  const validInheritContext =
    INHERITABLE_INTENTS.includes(parent_intent) && bundleOk && !topicConflict;
  const isolatedUnknown = !detected || detected.intent === "unknown";

  let inherit = false;
  if (restorePrevious || stayOnCurrent) {
    inherit = true;
  } else if (
    validInheritContext &&
    !standalone &&
    (isolatedUnknown ||
      dailyFollowUp ||
      trendFollowUp ||
      profileFollowUp ||
      profileHandoffFromTrend ||
      tallerMayorFollowUp ||
      preMeetingFollowUp ||
      monthCloseHandoffFromPreMeeting ||
      monthCloseFollowUp ||
      profileHandoffFromMonthClose)
  ) {
    inherit = true;
  }

  const inheritedDate = sanitizeActiveDate(echoed.active_date);
  const namedMetric = namedDailyMetricSignal(question);
  const monthlyBlocks = hasMonthlyPeriodSignal(question);
  const weekdayBlocks = hasUnresolvedExplicitDate(question);
  const hoySignal = hasHoyDateSignal(question);
  const explicitYmd = extractExplicitYmd(question);
  const dailyDateReady = Boolean(dailyParent && inheritedDate);
  const canConsiderCrossMetric =
    isolatedUnknown &&
    !standalone &&
    !restorePrevious &&
    !stayOnCurrent &&
    !topicConflict &&
    dailyDateReady &&
    namedMetric &&
    namedMetric !== parent_intent;

  if (monthlyBlocks && dailyParent && isolatedUnknown && !standalone && !restorePrevious) {
    inherit = false;
  }
  if (weekdayBlocks && canConsiderCrossMetric) {
    inherit = false;
  }

  const crossMetricSwitch =
    canConsiderCrossMetric && !monthlyBlocks && !weekdayBlocks && inherit;
  if (crossMetricSwitch) {
    inherit = true;
  }

  const currentHint = extractEntityHint(question);
  if (
    !inherit &&
    !standalone &&
    kind === "entity_intro" &&
    currentHint &&
    INHERITABLE_INTENTS.includes(parent_intent)
  ) {
    inherit = true;
  }
  let entity_hint = currentHint;
  if (restorePrevious && !entity_hint && previousFrame.active_entities[0]) {
    entity_hint = previousFrame.active_entities[0].display;
  }
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

  const inheritParent = restorePrevious
    ? previousFrame.parent_intent
    : crossMetricSwitch
      ? namedMetric
      : profileHandoffFromTrend || profileHandoffFromMonthClose
        ? "client_profile"
        : monthCloseHandoffFromPreMeeting
          ? "month_close_result"
          : inherit || stayOnCurrent
            ? parent_intent
            : null;

  const unknownNeedsClarification =
    !standalone &&
    !inherit &&
    detected.intent === "unknown" &&
    kind !== "plant_switch";

  const outOfSliceClarify =
    !standalone &&
    !restorePrevious &&
    !stayOnCurrent &&
    (kind === "period_switch" ||
      kind === "topic_return" ||
      (kind === "reference_probe" && parent_intent && !isDailyParentIntent(parent_intent)));

  const restoredDate = restorePrevious ? sanitizeActiveDate(previousFrame.active_date) : null;
  let active_date =
    plantMismatch || kind === "period_switch"
      ? null
      : restorePrevious
        ? restoredDate
        : standalone
          ? null
          : sanitizeActiveDate(echoed.active_date);
  if (crossMetricSwitch) {
    if (explicitYmd) active_date = explicitYmd;
    else if (hoySignal) active_date = null;
    else active_date = inheritedDate;
  }

  const dropCarriedEntity =
    (standalone &&
      parent_intent &&
      detected.intent &&
      parent_intent !== detected.intent &&
      INHERITABLE_INTENTS.includes(detected.intent)) ||
    crossMetricSwitch;

  return {
    kind,
    detected_intent: detected.intent,
    detected_confidence: detected.confidence,
    standalone,
    inherit,
    inherit_parent_intent: inheritParent,
    parent_intent: restorePrevious
      ? previousFrame.parent_intent
      : crossMetricSwitch
        ? namedMetric
        : profileHandoffFromTrend || profileHandoffFromMonthClose
          ? "client_profile"
          : monthCloseHandoffFromPreMeeting
            ? "month_close_result"
            : parent_intent,
    planta_id: Number.isFinite(plantaId) ? plantaId : null,
    entity_hint,
    active_date,
    plant_mismatch: plantMismatch,
    invalidate_entity: switchInvalidates || dropCarriedEntity,
    invalidate_gap: switchInvalidates || crossMetricSwitch,
    unknown_needs_clarification: unknownNeedsClarification,
    out_of_slice_clarify: outOfSliceClarify,
    restore_previous: restorePrevious,
    previous_frame: previousFrame,
    drop_carried_entity: dropCarriedEntity,
    cross_metric_switch: Boolean(crossMetricSwitch),
    last_evidence_bundle_type: restorePrevious
      ? previousFrame.last_evidence_bundle_type
      : crossMetricSwitch
        ? namedMetric
        : profileHandoffFromTrend || profileHandoffFromMonthClose
          ? "client_profile"
          : monthCloseHandoffFromPreMeeting
            ? "month_close_result"
            : echoed.last_evidence_bundle_type || null,
    profile_handoff_from_trend: Boolean(profileHandoffFromTrend),
    month_close_handoff_from_pre_meeting: Boolean(monthCloseHandoffFromPreMeeting),
    profile_handoff_from_month_close: Boolean(profileHandoffFromMonthClose),
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
  const dailyCustomers = assembled && assembled.customer_contributors;
  for (const c of dailyCustomers || []) {
    if (!c || !c.cliente_norm) continue;
    out.push({
      display: c.cliente_norm,
      cliente_keys: c.cliente_keys || [],
      cliente_key: c.cliente_key || (Array.isArray(c.cliente_keys) ? c.cliente_keys[0] : null),
      coverage_status: null,
      has_dicf_action: null,
    });
  }
  const movers = assembled && assembled.top_movers;
  for (const c of movers || []) {
    if (!c || !(c.cliente || c.cliente_norm)) continue;
    out.push({
      display: c.cliente || c.cliente_norm,
      cliente_keys: c.cliente_keys || [],
      cliente_key: c.cliente_key || (Array.isArray(c.cliente_keys) ? c.cliente_keys[0] : null),
      coverage_status: null,
      has_dicf_action: null,
    });
  }
  const closeClients = assembled && assembled.clients;
  for (const list of [
    (closeClients && closeClients.top_negative_movers) || [],
    (closeClients && closeClients.top_positive_movers) || [],
    (closeClients && closeClients.new) || [],
    (closeClients && closeClients.lost) || [],
  ]) {
    for (const c of list) {
      if (!c || !c.cliente_norm) continue;
      out.push({
        display: c.cliente_norm,
        cliente_keys: c.cliente_keys || [],
        cliente_key: c.cliente_key || (Array.isArray(c.cliente_keys) ? c.cliente_keys[0] : null),
        coverage_status: null,
        has_dicf_action: null,
      });
    }
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

  const dailyGaps = assembled && assembled.information_gaps;
  if (Array.isArray(dailyGaps) && dailyGaps.length) {
    const unexplained = dailyGaps.filter((g) => g && g.explanation_gap);
    if (unexplained.length) {
      missing.push("evidencia_que_explique_contribuidores_materiales");
      why_blocks =
        "Hay contribuidores matemáticos sin evidencia registrada suficiente; eso no prueba una causa.";
    }
    if (!physical_person) {
      const named = dailyGaps.find((g) => g && g.physical_person);
      if (named) {
        physical_person = String(named.physical_person).trim();
        physical_source = named.physical_source || "dicf_accion";
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
    active_date: sanitizeActiveDate(opts && opts.active_date),
    active_range_days: sanitizeActiveRangeDays(opts && opts.active_range_days),
    active_channel: sanitizeActiveChannel(opts && opts.active_channel),
    active_period_months: sanitizePeriodMonths(opts && opts.active_period_months).map((m) => m.yyyymm),
    meeting_type: sanitizeMeetingType(opts && opts.meeting_type),
    previous_frame: sanitizePreviousFrame(opts && opts.previous_frame, plantaId),
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
      ? `active_entity=${entity.display}${entity.kind ? ` kind=${entity.kind}` : ""}${
          entity.cliente_key ? ` key=${entity.cliente_key}` : ""
        }${entity.unit_token ? ` unit=${entity.unit_token}` : ""}${
          entity.folio_id != null ? ` folio_id=${entity.folio_id}` : ""
        }${entity.action_id != null ? ` action_id=${entity.action_id}` : ""}`
      : "active_entity=ninguna",
    `last_evidence_bundle_type=${s.last_evidence_bundle_type || "ninguno"}`,
    `active_date=${s.active_date || "ninguna"}`,
    `active_range_days=${s.active_range_days != null ? s.active_range_days : "ninguno"}`,
    `active_channel=${s.active_channel || "ninguno"}`,
    `active_period_months=${(s.active_period_months || []).join(",") || "ninguno"}`,
    `meeting_type=${s.meeting_type || "ninguno"}`,
    `previous_parent_intent=${
      s.previous_frame && s.previous_frame.parent_intent ? s.previous_frame.parent_intent : "ninguno"
    }`,
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

function carryActiveEntities(turn, echoedState, entityResolution) {
  if (entityResolution && entityResolution.status === "unique") {
    return [entityResolution.entity];
  }
  if (turn && turn.invalidate_entity) return [];
  if (turn && turn.restore_previous) {
    return sanitizeActiveEntities(turn.previous_frame && turn.previous_frame.active_entities);
  }
  return sanitizeActiveEntities(echoedState && echoedState.active_entities);
}

module.exports = {
    INHERITABLE_INTENTS,
    isNonIdentityToken,
    isPronounToken,
    HILO_PREAMBLE,
  normalizeText,
  emptyConversationState,
  sanitizeActiveEntities,
  sanitizeEchoedState,
  snapshotCurrentFrame,
  sanitizePreviousFrame,
    isDailyMetricIntent,
    isDailyParentIntent,
    isCommercialTrendParent,
    isClientProfileParent,
    isTallerMayorParent,
    isPreMeetingParent,
    isMonthCloseParent,
    hasCanonicalClientEntity,
    hasCanonicalUnitEntity,
    hasActiveFolioEntity,
    sanitizeActiveRangeDays,
    sanitizeActiveChannel,
  shouldCapturePrevious,
  resolveOutgoingPreviousFrame,
  namedDailyMetricSignal,
  hasMonthlyPeriodSignal,
  preserveFramesOnClarify,
  parkCurrentAndClear,
  topicReturnCue,
  frameMatchesReturnCue,
  stripCurrentFromHistory,
  classifyTurnKind,
  isDefensibleFollowUpKind,
  isDailyFollowUpKind,
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
  carryActiveEntities,
};
