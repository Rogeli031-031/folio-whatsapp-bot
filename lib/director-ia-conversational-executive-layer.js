"use strict";

/**
 * Conversational Executive Layer — first slice C.
 * Semantic need + UI plant anchor + executive plant-status composer.
 * Planner/tools remain the execution layer. No IES. No N5. No new truth source.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { ACTION_REGISTER_TEMAS } = require("./action-register-temas");
const {
  isCommercialTrendQuestion,
  formatMoverTipoLabel,
  formatRegisteredComments,
} = require("./director-ia-commercial-trend");
// CEL_SHIP_DEPENDENCY=PRE_CLOSE_SHARED_COMPOSER. ISOLATED_CEL_SHIP=NO.
// isPreCloseQuestion vive en el composer compartido aprobado. CEL no es aislable de ese módulo.
const { isPreCloseQuestion } = require("./director-ia-executive-cycle-composer");
const { isMonthCloseQuestion } = require("./director-ia-month-close-result");
const { isPreMeetingQuestion } = require("./director-ia-pre-meeting");
const { isClientProfileQuestion } = require("./director-ia-client-profile");
const { assertOperationalPlantAccess } = require("./director-ia-plant-diagnosis");
const { resolveAuthoritativeForecastRunPack } = require("./director-ia-authoritative-forecast-run-pack");

const SEMANTIC_CLASS = "conversational_executive_layer";
const FIRST_SLICE = "C_semantic_need_ui_anchor_plus_executive_composer_plant_status";
const COMPOSER_KIND = "deterministic_pack_plus_gpt_wording";
const PERIOD_STRATEGY = "COMPARE_WITH_LABELS";
const CEL_SHIP_DEPENDENCY = "PRE_CLOSE_SHARED_COMPOSER";
const ISOLATED_CEL_SHIP = false;
const CEL_OVERRIDABLE_PLANNER_INTENTS = Object.freeze([
  "unknown",
  "plant_diagnosis",
  "daily_executive_brief",
]);
const NON_CALENDAR_PERIOD_KINDS = new Set([
  "snapshot",
  "bitacora_window",
  "action_dates",
  "materialized_cache",
]);
const NON_PLANT_SCOPE_TOKENS = new Set([
  "todo",
  "todos",
  "todas",
  "esto",
  "eso",
  "aqui",
  "aca",
  "alli",
  "hoy",
  "ahora",
  "bien",
  "mal",
  "asi",
  "planta",
]);
const DICF_MEASURES_OVERCLAIM_RE =
  /no se han tomado medidas\.?|no se tomaron medidas(?:[^.]*?)?\.?|no se ha tomado(?: ninguna)? medida\.?|no se tom[oó] ninguna medida\.?|no se hizo nada\.?|nadie actu[oó]\.?|no se han hecho (?:nada|medidas)\.?/gi;

const NEED_TYPES = Object.freeze({
  EXECUTIVE_STATUS: "EXECUTIVE_STATUS",
  RISK_FOCUS: "RISK_FOCUS",
  CAUSE_EXPLANATION: "CAUSE_EXPLANATION",
  RECOMMENDATION: "RECOMMENDATION",
  COMPARISON: "COMPARISON",
  FOLLOW_UP: "FOLLOW_UP",
  PREPARATION: "PREPARATION",
  CLOSE_STATUS: "CLOSE_STATUS",
});

const AVAILABILITY = Object.freeze({
  REQUIRED: "REQUIRED",
  OPTIONAL: "OPTIONAL",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  PERIOD_INCOMPATIBLE: "PERIOD_INCOMPATIBLE",
});

const SCOPE_SOURCE = Object.freeze({
  UI_PLANT_ANCHOR: "ui_plant_anchor",
  EXPLICIT_PLANT: "explicit_plant",
  UNRESOLVED: "unresolved",
});

const CHANNEL_REGISTRY = Object.freeze({
  CASA: {
    availability: "PARTIAL",
    independent: true,
    note: "OLS CASA independiente en EXECUTIVE_STATUS TREND. No se fusiona con Comisionista.",
  },
  COMISIONISTA: {
    availability: "PARTIAL",
    independent: true,
    note: "OLS Comisionista independiente en EXECUTIVE_STATUS TREND. No es Portátil ni Carburación.",
  },
  PORTATIL: { availability: "NOT_AVAILABLE", independent: true, note: "No existe canal independiente actual." },
  CARBURACION: { availability: "NOT_AVAILABLE", independent: true, note: "No existe canal independiente actual." },
});
const TREND_DIRECTIONS = Object.freeze(["UP", "DOWN", "FLAT"]);
const FUSED_CHANNEL_TREND_RE = /\bCASA\/comisionistas?\b/gi;

const ANSWER_HIERARCHY = Object.freeze([
  "SITUATION",
  "MAGNITUDE",
  "TREND",
  "COMMERCIAL_MOVERS",
  "TARGET_COMMITMENT",
  "DRIVERS",
  "RISKS",
  "EXECUTION",
  "NEXT_DECISION",
]);

const IMPLEMENTED_THIS_SLICE = Object.freeze([NEED_TYPES.EXECUTIVE_STATUS]);

const CAPABILITY_INTEGRATION_LEDGER = Object.freeze([
  {
    capability: "commercial_trend",
    physical_status: "IMPLEMENTED",
    conversational_status: "IMPLEMENTED_BUT_PARTIALLY_REACHABLE",
    planned_integration_point: "EXECUTIVE_STATUS TREND CASA + COMISIONISTA independent",
    orphan_risk: "bajo",
    first_slice_bridge: "PER_CHANNEL_OLS",
  },
  {
    capability: "commercial_trend.casa",
    physical_status: "IMPLEMENTED",
    conversational_status: "IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE",
    planned_integration_point: "EXECUTIVE_STATUS TREND",
    orphan_risk: "bajo",
    first_slice_bridge: "PER_CHANNEL_OLS",
  },
  {
    capability: "commercial_trend.comisionista",
    physical_status: "IMPLEMENTED",
    conversational_status: "IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE",
    planned_integration_point: "EXECUTIVE_STATUS TREND",
    orphan_risk: "bajo",
    first_slice_bridge: "PER_CHANNEL_OLS",
  },
  {
    capability: "ACTUAL_FINANCIAL",
    physical_status: "IMPLEMENTED",
    conversational_status: "SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE",
    planned_integration_point: "CLOSE_STATUS only",
    orphan_risk: "bajo",
    first_slice_bridge: "NOT_APPLICABLE",
  },
  {
    capability: "PRE_CLOSE",
    physical_status: "IMPLEMENTED",
    conversational_status: "SUPPORTED_ONLY_WITHIN_SPECIALIZED_MODE",
    planned_integration_point: "PREPARATION",
    orphan_risk: "medio",
    first_slice_bridge: "NOT_THIS_SLICE",
  },
  {
    capability: "EXECUTIVE_STEERING_CAPTURE",
    physical_status: "IMPLEMENTED",
    conversational_status: "PHYSICAL_INFRASTRUCTURE_ONLY",
    planned_integration_point: "CEL STEERING_RECORDED",
    orphan_risk: "alto",
    first_slice_bridge: "NOT_APPLICABLE",
  },
  {
    capability: "POST_CAPTURE_READ",
    physical_status: "PENDING",
    conversational_status: "PENDING",
    planned_integration_point: "ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-POST-CAPTURE-READ-001",
    orphan_risk: "rastreado",
    first_slice_bridge: "NOT_THIS_SLICE",
  },
  {
    capability: "Plaud",
    physical_status: "NOT_IMPLEMENTED",
    conversational_status: "PENDING_INTEGRATION",
    planned_integration_point:
      "Plaud transcript → candidate extraction → governed human record → Steering → POST_CAPTURE_READ → CEL",
    orphan_risk: "rastreado",
    first_slice_bridge: "NOT_THIS_SLICE",
  },
  {
    capability: "Council",
    physical_status: "NOT_IMPLEMENTED",
    conversational_status: "PENDING",
    planned_integration_point: "CEL interface",
    orphan_risk: "rastreado",
    first_slice_bridge: "NOT_THIS_SLICE",
  },
  {
    capability: "live_copilot",
    physical_status: "NOT_IMPLEMENTED",
    conversational_status: "PENDING",
    planned_integration_point: "out of first slice",
    orphan_risk: "rastreado",
    first_slice_bridge: "NOT_THIS_SLICE",
  },
]);

const AR_THEME_RE =
  /\b(mantenimiento|seguridad|calidad|taller|mejora\s+continua|medio\s+ambiente|ambiente|produccion|logistica|contrataciones|apoyos|licencias|oficinas|imagen\s+corporativa|erp)\b/;

function normalizeExecutiveText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasArTheme(q) {
  if (AR_THEME_RE.test(q)) return true;
  return ACTION_REGISTER_TEMAS.some((tema) => {
    const t = normalizeExecutiveText(tema);
    return t && q.includes(t);
  });
}

function isGreetingUtterance(q) {
  return /^(hola|hola director|hola director ia|buenos dias|buen dia|buenas tardes|buenas noches|que tal|saludos)$/.test(
    q
  );
}

function isSteeringReadQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (typeof isPreCloseQuestion === "function" && isPreCloseQuestion(raw)) return false;
  if (typeof isPreMeetingQuestion === "function" && isPreMeetingQuestion(raw)) return false;
  const junta = /\b(junta|steering|consejo|plaud)\b/.test(q);
  const readCue =
    /\b(que decidimos|que se decidio|que se compromet|compromisos? de junta|que se corrigio|que acordamos en (la )?junta|lee(r)? (el )?steering|eventos? de steering)\b/.test(
      q
    );
  return junta && readCue;
}

function isSpecializedStandaloneQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (/\b(igf|arr)\b/.test(q) && !/\bdelta\b/.test(q)) return true;
  if (typeof isPreCloseQuestion === "function" && isPreCloseQuestion(raw)) return true;
  if (typeof isMonthCloseQuestion === "function" && isMonthCloseQuestion(raw)) return true;
  if (typeof isPreMeetingQuestion === "function" && isPreMeetingQuestion(raw)) return true;
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(raw)) return true;
  if (typeof isClientProfileQuestion === "function" && isClientProfileQuestion(raw)) return true;
  if (isUnequivocalDailyBriefQuestion(raw)) return true;
  if (/\bayer\b/.test(q) && /\b(venta|descuento)\b/.test(q)) return true;
  if (/\bactual\s+financ/i.test(String(raw || "")) || /\bfinancial\.actual\b/.test(q)) return true;
  return false;
}

function isRiskFocusQuestion(q) {
  return (
    /\b(que te preocupa|que te preocupa mas|que preocupa|cual es el riesgo|que riesgo)\b/.test(q) &&
    !/\bplanta(s)?\b/.test(q) &&
    !/\bpre[\s-]?cierre\b/.test(q)
  );
}

function isCauseQuestion(q) {
  return /^(por que|porque|y eso por que|a que se debe)\b/.test(q);
}

function isRecommendationQuestion(q) {
  return /\b(que harias|que hago primero|que me recomiendas|que conviene hacer)\b/.test(q);
}

function isComparisonQuestion(q) {
  return /\b(compara(las)?|comparame|versus|vs)\b/.test(q) && !/\bcasa\b/.test(q);
}

function isUnequivocalDailyBriefQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (
    /\b(brief|resumen|reporte|overview|panorama)\b/.test(q) &&
    /\b(diario|del dia|de hoy|de ayer|ayer)\b/.test(q)
  ) {
    return true;
  }
  if (/\bbrief ejecutivo\b/.test(q)) return true;
  const dayStory =
    /\b(como nos fue|que tal estuvo|que paso|cuentame|algo importante|que debo saber)\b/.test(q) &&
    /\b(ayer|el dia|hoy)\b/.test(q);
  if (!dayStory) return false;
  if (/\bcomo\s+(vamos|andamos|estamos|va|esta)\b/.test(q)) return false;
  return true;
}

function hasExecutiveStatusCue(q) {
  const howStatus =
    /\bcomo\b/.test(q) &&
    /\b(va|vamos|van|anda|andamos|estamos|esta|estan|venimos|se ve|se esta|esta yendo)\b/.test(q);
  const situation =
    /\b(que esta pasando|que pasa|situacion( general)?|diagnostico|estado general|como se ve|cual es el estado)\b/.test(
      q
    );
  return howStatus || situation;
}

function isPlantLevelExecutiveFinancialQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (/\bayer\b/.test(q)) return false;
  if (/\bcliente\b/.test(q)) return false;
  if (!/\b(rentabilidad|descuento|utilidad operativa|resultado final|utilidad)\b/.test(q)) return false;
  return hasExecutiveStatusCue(q);
}

function isCutoffAwareMagnitudeQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q || /\bcliente\b/.test(q) || /\bayer\b/.test(q)) return false;
  if (/\b(llevamos vendido|vendido al corte|acumulado al corte|forecast con el corte|corte actual)\b/.test(q)) {
    return true;
  }
  if (/\b(meta|compromiso)\b/.test(q) && /\b(venta|descuento)\b/.test(q)) return true;
  if (/\bdescuento acumulado\b/.test(q) && /\b(proyecta|forecast|cerrar)\b/.test(q)) return true;
  return false;
}

const CALENDAR_MONTHS_ES = Object.freeze({
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
});

function namedCalendarPeriodFromQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return null;
  const ym = q.match(/\b(20\d{2})-(\d{1,2})\b/);
  if (ym) {
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) return { year: Number(ym[1]), month };
  }
  let month = null;
  for (const [name, n] of Object.entries(CALENDAR_MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      month = n;
      break;
    }
  }
  const yearM = q.match(/\b(20\d{2})\b/);
  if (month == null && !yearM) return null;
  return {
    year: yearM ? Number(yearM[1]) : null,
    month,
  };
}

function classifyForecastMagnitudeFollowUp(raw, opts) {
  const q = normalizeExecutiveText(raw);
  if (!q) return null;
  if (isExecutiveStatusQuestion(raw)) return null;
  if (hasExecutiveStatusCue(q)) return null;
  if (isSpecializedStandaloneQuestion(raw)) return null;
  if (/\b(cliente|ayer)\b/.test(q)) return null;
  if (
    isCutoffAwareMagnitudeQuestion(raw) &&
    /\b(llevamos vendido|vendido al corte|acumulado al corte)\b/.test(q)
  ) {
    return null;
  }

  const hasRun = Boolean(opts && opts.has_authoritative_run);
  const executiveHilo = Boolean(opts && opts.executive_hilo);

  if (
    /\b(venta proyectada|cual era la venta proyectada|cual es la venta proyectada|cual es el forecast|cual era el forecast|y el forecast)\b/.test(
      q
    )
  ) {
    return { kind: "venta" };
  }

  if (/\bdescuento\b/.test(q) && /\b(forecast|proyectad|al corte|estas usando)\b/.test(q)) {
    return { kind: "descuento" };
  }
  if ((/^y el descuento$/.test(q) || /^el descuento$/.test(q)) && hasRun && executiveHilo) {
    return { kind: "descuento" };
  }

  if (/\butilidad operativa\b/.test(q)) {
    if (/\b(forecast|al corte|estas usando|cual|y la)\b/.test(q) || (hasRun && executiveHilo)) {
      return { kind: "utilidad" };
    }
  }

  if (/\bresultado final\b/.test(q)) {
    if (/\b(forecast|al corte|estas usando|cual|y el)\b/.test(q) || (hasRun && executiveHilo)) {
      return { kind: "resultado" };
    }
  }

  return null;
}

function isAuthoritativeForecastMagnitudeFollowUp(raw, opts) {
  return classifyForecastMagnitudeFollowUp(raw, opts) != null;
}

function formatForecastMagnitudeFollowUpAnswer(kind, pack) {
  const unavailable =
    "No tengo una corrida de forecast autoritativa vigente para esa magnitud. No sustituyo con ARR ni con IGF almacenado.";
  if (!pack || pack.status !== "AVAILABLE" || !pack.forecast) return unavailable;
  const fecha = formatForecastCutoffDateEs(pack.run_identity && pack.run_identity.upload_day);
  const corte = fecha || "corte vigente";
  const f = pack.forecast;
  if (kind === "descuento") {
    if (f.descuento == null) return unavailable;
    return `El descuento forecast al corte del ${corte} es ${f.descuento} $/kg.`;
  }
  if (kind === "utilidad") {
    if (f.utilidad_operativa == null) return unavailable;
    return `La utilidad operativa forecast para ese mismo corte es $${f.utilidad_operativa}.`;
  }
  if (kind === "resultado") {
    if (f.resultado_final == null) return unavailable;
    return `El resultado final forecast para ese mismo corte es $${f.resultado_final}.`;
  }
  if (kind === "venta") {
    if (f.venta == null) return unavailable;
    return `El forecast para ese corte es ${f.venta} t.`;
  }
  return unavailable;
}

function isExecutiveStatusQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (isSpecializedStandaloneQuestion(raw)) return false;
  if (isSteeringReadQuestion(raw)) return false;
  if (isRiskFocusQuestion(q) || isCauseQuestion(q) || isRecommendationQuestion(q) || isComparisonQuestion(q)) {
    return false;
  }
  if (hasArTheme(q) && /\bcomo\s+va\b/.test(q) && !/\bplanta\b/.test(q)) return false;
  if (
    /\b(folio|accion(?:es)?|vencid|ingreso|presupuesto)\b/.test(q) &&
    !/\bplanta\b/.test(q) &&
    !isPlantLevelExecutiveFinancialQuestion(raw)
  ) {
    return false;
  }
  if (
    /\bdescuento\b/.test(q) &&
    !/\bplanta\b/.test(q) &&
    !isPlantLevelExecutiveFinancialQuestion(raw) &&
    !isCutoffAwareMagnitudeQuestion(raw)
  ) {
    return false;
  }
  if (isCutoffAwareMagnitudeQuestion(raw)) return true;
  if (!hasExecutiveStatusCue(q)) return false;
  return true;
}

function resolveExecutiveNeed(raw, _opts) {
  const q = normalizeExecutiveText(raw);
  if (!q) {
    return { need_type: null, implemented: false, reason: "empty" };
  }
  if (isGreetingUtterance(q)) {
    return { need_type: null, implemented: false, greeting: true, reason: "greeting" };
  }
  if (isSteeringReadQuestion(raw)) {
    return {
      need_type: null,
      implemented: false,
      steering_frontier: true,
      reason: "steering_read_pending",
    };
  }
  if (isSpecializedStandaloneQuestion(raw)) {
    return { need_type: null, implemented: false, specialized: true, reason: "specialized_standalone" };
  }
  if (isRiskFocusQuestion(q)) {
    return { need_type: NEED_TYPES.RISK_FOCUS, implemented: false, reason: "later_slice" };
  }
  if (isCauseQuestion(q)) {
    return { need_type: NEED_TYPES.CAUSE_EXPLANATION, implemented: false, reason: "later_slice" };
  }
  if (isRecommendationQuestion(q)) {
    return { need_type: NEED_TYPES.RECOMMENDATION, implemented: false, reason: "later_slice" };
  }
  if (isComparisonQuestion(q)) {
    return { need_type: NEED_TYPES.COMPARISON, implemented: false, reason: "later_slice" };
  }
  if (isExecutiveStatusQuestion(raw)) {
    return {
      need_type: NEED_TYPES.EXECUTIVE_STATUS,
      implemented: true,
      subject: "plant_or_we",
      reason: "executive_status_cue",
    };
  }
  return { need_type: null, implemented: false, reason: "no_need" };
}

function normalizePlantKey(value) {
  return normalizeExecutiveText(value).replace(/\s+/g, " ");
}

function catalogEntries(catalog) {
  return (Array.isArray(catalog) ? catalog : [])
    .map((p) => ({
      planta_id: Number(p.planta_id != null ? p.planta_id : p.id),
      nombre: String(p.nombre || p.planta_nombre || "").trim(),
      clave: p.clave != null ? String(p.clave).trim() : "",
    }))
    .filter((p) => Number.isFinite(p.planta_id) && p.planta_id > 0 && p.nombre);
}

function extractExplicitPlant(raw, catalog) {
  const q = normalizeExecutiveText(raw);
  const entries = catalogEntries(catalog).sort((a, b) => b.nombre.length - a.nombre.length);
  for (const plant of entries) {
    const name = normalizePlantKey(plant.nombre);
    const clave = normalizePlantKey(plant.clave);
    if (name && (q.includes(name) || new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q))) {
      return { ...plant, match: "catalog_name" };
    }
    if (clave && clave.length >= 2 && new RegExp(`\\b${clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)) {
      return { ...plant, match: "catalog_clave" };
    }
  }
  const named = q.match(
    /\b(?:como va|como vamos|como van|como andamos|como estamos|como esta|como se ve|estado de|situacion de|diagnostico de)\s+(?:en\s+)?(?:la\s+planta\s+)?([a-z0-9][a-z0-9\s]{2,40})\b/
  );
  if (named && named[1]) {
    const token = named[1]
      .replace(/\b(la|el|los|las|una|un|esta|este|estos|estas|planta|hoy|ahora|este mes)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (
      token &&
      token.length >= 3 &&
      !NON_PLANT_SCOPE_TOKENS.has(token) &&
      !hasArTheme(token)
    ) {
      return { planta_id: null, nombre: token, clave: "", match: "utterance_token" };
    }
  }
  return null;
}

function uiPlantAnchorUsable(opts) {
  if (opts && opts.ui_plant_anchor === false) return false;
  const id = Number(opts && opts.ui_planta_id);
  if (!Number.isFinite(id) || id <= 0) return false;
  if (opts && opts.auth && typeof assertOperationalPlantAccess === "function") {
    const access = assertOperationalPlantAccess(opts.auth, id);
    if (!access.ok) return false;
  }
  return true;
}

function resolveSemanticScope(raw, opts) {
  const catalog = catalogEntries(opts && opts.plant_catalog);
  const explicit = extractExplicitPlant(raw, catalog);
  const uiId = Number(opts && opts.ui_planta_id);
  const uiLabel = opts && opts.ui_plant_label ? String(opts.ui_plant_label).trim() : "";
  const uiUsable = uiPlantAnchorUsable(opts);

  if (explicit && explicit.planta_id) {
    const access =
      opts && opts.auth && typeof assertOperationalPlantAccess === "function"
        ? assertOperationalPlantAccess(opts.auth, explicit.planta_id)
        : { ok: true };
    if (!access.ok) {
      return {
        action: "NOT_AUTHORIZED",
        scope_source: SCOPE_SOURCE.EXPLICIT_PLANT,
        planta_id: explicit.planta_id,
        plant_name: explicit.nombre,
        code: access.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        error: access.error || "Sin acceso a esta planta",
        status: access.status || 403,
      };
    }
    return {
      action: "RESOLVED",
      scope_source: SCOPE_SOURCE.EXPLICIT_PLANT,
      planta_id: explicit.planta_id,
      plant_name: explicit.nombre,
    };
  }

  if (explicit && explicit.nombre) {
    const uiNorm = normalizePlantKey(uiLabel);
    const expNorm = normalizePlantKey(explicit.nombre);
    const syntheticUi = /^planta\s+\d+$/.test(uiNorm);
    if (uiNorm && !syntheticUi && uiNorm === expNorm && uiUsable) {
      return {
        action: "RESOLVED",
        scope_source: SCOPE_SOURCE.EXPLICIT_PLANT,
        planta_id: uiId,
        plant_name: uiLabel || explicit.nombre,
      };
    }
    return {
      action: "ASK_CLARIFICATION",
      scope_source: SCOPE_SOURCE.UNRESOLVED,
      plant_name: explicit.nombre,
      reason: "explicit_plant_unresolved",
      clarification:
        `Mencionaste ${explicit.nombre}, pero no pude resolver esa planta con el catálogo disponible. ¿A cuál te refieres?`,
    };
  }

  if (uiUsable) {
    return {
      action: "RESOLVED",
      scope_source: SCOPE_SOURCE.UI_PLANT_ANCHOR,
      planta_id: uiId,
      plant_name: uiLabel || null,
    };
  }

  return {
    action: "ASK_CLARIFICATION",
    scope_source: SCOPE_SOURCE.UNRESOLVED,
    reason: "missing_ui_plant_anchor",
    clarification: "¿De qué planta quieres el estado?",
  };
}

function mapSourceAvailability(block) {
  const st = block && block.status;
  if (st === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) return AVAILABILITY.NOT_AUTHORIZED;
  if (st === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) return AVAILABILITY.UNAVAILABLE;
  if (st === DIRECTOR_IA_VERACITY.SOURCE_ERROR) return AVAILABILITY.UNAVAILABLE;
  if (st === DIRECTOR_IA_VERACITY.SOURCE_PARTIAL) return AVAILABILITY.OPTIONAL;
  if (st === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE) return AVAILABILITY.REQUIRED;
  if (!block) return AVAILABILITY.UNAVAILABLE;
  return AVAILABILITY.OPTIONAL;
}

function evidenceItem(over) {
  return {
    source: over.source || null,
    scope: over.scope || null,
    period: over.period || null,
    as_of: over.as_of || null,
    truth_semantics: over.truth_semantics || null,
    availability: over.availability || AVAILABILITY.UNAVAILABLE,
    provenance: over.provenance || null,
    slot: over.slot || null,
    summary: over.summary || null,
    payload: over.payload != null ? over.payload : null,
  };
}

function periodLabel(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim()) {
    const s = value.trim();
    if (NON_CALENDAR_PERIOD_KINDS.has(s)) return null;
    return s;
  }
  if (typeof value === "object") {
    if (value.yyyy_mm) return String(value.yyyy_mm);
    if (value.as_of) return String(value.as_of);
    if (value.from) return value.to ? `${value.from}→${value.to}` : String(value.from);
    if (value.kind && !NON_CALENDAR_PERIOD_KINDS.has(String(value.kind))) {
      return String(value.kind);
    }
  }
  return null;
}

function collectPeriodLabels(assembled, trend) {
  const labels = [];
  const push = (source, label, truth) => {
    if (!label) return;
    labels.push({ source, period: label, truth_semantics: truth });
  };
  if (!assembled) return labels;
  const src = assembled.sources || {};
  push("commercial_state", periodLabel(src.commercial_state && src.commercial_state.period), "commercial_actual_cached");
  push("arr", periodLabel(src.arr && src.arr.period), "FORECAST_PROJECTION");
  push("igf", periodLabel(src.igf && src.igf.period), "FORECAST_STORED");
  push("bitacora", periodLabel(src.bitacora && src.bitacora.period), "field_window");
  push("action_register", periodLabel(src.action_register && src.action_register.period), "action_snapshot");
  if (assembled.alignment) {
    push("igf", assembled.alignment.igf_period, "FORECAST_STORED");
    push("arr", assembled.alignment.arr_period, "FORECAST_PROJECTION");
    push("commercial_state", assembled.alignment.commercial_state_period, "commercial_actual_cached");
  }
  const casa = trend && trend.channels && trend.channels.casa;
  const comi = trend && trend.channels && trend.channels.comisionista;
  if (casa && casa.range_start && casa.range_end) {
    push("commercial_trend.casa", `${casa.range_start}→${casa.range_end}`, "OLS_CASA");
  }
  if (comi && comi.range_start && comi.range_end) {
    push("commercial_trend.comisionista", `${comi.range_start}→${comi.range_end}`, "OLS_COMISIONISTA");
  }
  if (
    trend &&
    trend.range_start &&
    trend.range_end &&
    !(casa && casa.range_start) &&
    !(comi && comi.range_start)
  ) {
    push("commercial_trend", `${trend.range_start}→${trend.range_end}`, "OLS_TRAILING");
  }
  return labels;
}

function evaluatePeriodComposition(labels) {
  const unique = [...new Set((labels || []).map((l) => l.period).filter(Boolean))];
  const strategy = unique.length > 1 ? PERIOD_STRATEGY : "ALIGN";
  return {
    strategy,
    distinct_periods: unique,
    labels: labels || [],
    fuse: false,
    user_note:
      unique.length > 1
        ? "Estas cifras corresponden a periodos distintos, por lo que no las tomo como una comparación directa."
        : null,
  };
}

function trendAvailability(trend) {
  if (!trend) return AVAILABILITY.UNAVAILABLE;
  if (trend.abort || trend.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) return AVAILABILITY.NOT_AUTHORIZED;
  if (trend.ok === false) return AVAILABILITY.UNAVAILABLE;
  if (trend.assembly_status === "empty") return AVAILABILITY.UNAVAILABLE;
  return AVAILABILITY.REQUIRED;
}

function normalizeTrendDirection(raw) {
  if (raw == null || raw === "") return null;
  const d = String(raw).trim().toUpperCase();
  if (d === "STABLE") return "FLAT";
  if (TREND_DIRECTIONS.includes(d)) return d;
  return null;
}

function channelBlockFromTrend(trend, key) {
  if (!trend || typeof trend !== "object") return null;
  const channels = trend.channels && typeof trend.channels === "object" ? trend.channels : null;
  if (channels && channels[key]) return channels[key];
  if (trend.channel === key) {
    if (trend.primary && (trend.primary.channel === key || trend.primary.ols)) return trend.primary;
    if (trend.ols) {
      return {
        channel: key,
        ols: trend.ols,
        range_start: trend.range_start,
        range_end: trend.range_end,
        limitations: trend.limitations || [],
        provenance: trend.provenance || null,
      };
    }
  }
  return null;
}

function emptyChannelProjection(key, availability) {
  return {
    channel: key === "casa" ? "CASA" : "COMISIONISTA",
    availability,
    direction: null,
    period: null,
    provenance: null,
    source: "commercial-trend-engine",
    limitations: [],
  };
}

function projectOneTrendChannel(trend, key, overallAv) {
  if (overallAv === AVAILABILITY.NOT_AUTHORIZED) {
    return emptyChannelProjection(key, AVAILABILITY.NOT_AUTHORIZED);
  }
  const block = channelBlockFromTrend(trend, key);
  if (!block) return emptyChannelProjection(key, AVAILABILITY.UNAVAILABLE);
  const lim = Array.isArray(block.limitations) ? block.limitations : [];
  const dirRaw = block.ols && block.ols.direction;
  const direction = normalizeTrendDirection(dirRaw);
  const missing =
    lim.includes("no_rows") ||
    lim.includes(`${key}_missing`) ||
    lim.includes("insufficient_observations") ||
    dirRaw === "INSUFFICIENT_DATA" ||
    direction == null;
  const period =
    block.range_start && block.range_end ? `${block.range_start}→${block.range_end}` : null;
  const provenance =
    (block.provenance && (block.provenance.source || block.provenance.canal)) ||
    "commercial-trend-engine";
  return {
    channel: key === "casa" ? "CASA" : "COMISIONISTA",
    availability: missing ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.REQUIRED,
    direction: missing ? null : direction,
    period,
    provenance,
    source: "commercial-trend-engine",
    limitations: lim,
  };
}

function trendSlotAvailability(overallAv, casa, comi) {
  if (overallAv === AVAILABILITY.NOT_AUTHORIZED) return AVAILABILITY.NOT_AUTHORIZED;
  if (
    casa.availability === AVAILABILITY.REQUIRED ||
    comi.availability === AVAILABILITY.REQUIRED
  ) {
    return AVAILABILITY.REQUIRED;
  }
  return AVAILABILITY.UNAVAILABLE;
}

const EXECUTIVE_MOVERS_PER_SIGN = 2;

function moverIsNegative(m) {
  const tipo = String((m && m.tipo) || "").toLowerCase();
  if (tipo === "perdido" || tipo === "disminucion") return true;
  if (tipo === "aumento" || tipo === "nuevo") return false;
  return m && Number(m.delta_ton) < 0;
}

function moverIsPositive(m) {
  const tipo = String((m && m.tipo) || "").toLowerCase();
  if (tipo === "aumento" || tipo === "nuevo") return true;
  if (tipo === "perdido" || tipo === "disminucion") return false;
  return m && Number(m.delta_ton) > 0;
}

function projectChannelMoversVerbal(movers) {
  const list = Array.isArray(movers) ? movers : [];
  const neg = list.filter(moverIsNegative).slice(0, EXECUTIVE_MOVERS_PER_SIGN);
  const pos = list.filter(moverIsPositive).slice(0, EXECUTIVE_MOVERS_PER_SIGN);
  return [...neg, ...pos];
}

function collectChannelMovers(trend, key) {
  const block = channelBlockFromTrend(trend, key);
  if (!block || !Array.isArray(block.top_movers)) return [];
  return block.top_movers.map((m) => ({
    cliente: m.cliente || m.cliente_norm || null,
    channel: key === "casa" ? "CASA" : "COMISIONISTA",
    tipo: m.tipo || null,
    tipo_label: formatMoverTipoLabel(m.tipo) || m.tipo || null,
    delta_ton: m.delta_ton,
    venta_ton_prev: m.venta_ton_prev,
    venta_ton_actual: m.venta_ton_actual,
    registered_comments: Array.isArray(m.registered_comments)
      ? m.registered_comments
      : Array.isArray(m.comentarios)
        ? m.comentarios
        : [],
  }));
}

function formatOneMoverLine(m) {
  const label = m.tipo_label || formatMoverTipoLabel(m.tipo) || m.tipo || "movimiento";
  const delta = m.delta_ton != null && Number.isFinite(Number(m.delta_ton)) ? Number(m.delta_ton) : null;
  const deltaBit = delta == null ? "" : ` ${delta} t`;
  const fact = `${m.cliente || "Cliente"}: ${String(label).toLowerCase()}${deltaBit}.`;
  const comments = Array.isArray(m.registered_comments) ? m.registered_comments : [];
  if (!comments.length) return `${fact} Sin comentario reciente.`;
  const registered = comments
    .map((c) => {
      const body = String((c && c.body) || "").replace(/\s+/g, " ").trim();
      return body ? `Comentario registrado: «${body}».` : null;
    })
    .filter(Boolean)
    .join(" ");
  return `${fact} ${registered || "Sin comentario reciente."} El comentario no es la causa.`;
}

function formatCommercialMoversSummary(casaMovers, comiMovers) {
  const casaFull = Array.isArray(casaMovers) ? casaMovers : [];
  const comiFull = Array.isArray(comiMovers) ? comiMovers : [];
  if (!casaFull.length && !comiFull.length) return null;
  const casa = projectChannelMoversVerbal(casaFull);
  const comi = projectChannelMoversVerbal(comiFull);
  const lines = [
    "Movimientos del motor commercial-trend-engine (top_movers). Proyección ejecutiva compacta; el ranking Top 6 del motor no cambia. No es DRIVERS/DICF. Mover != causa. Comentario registrado != causa.",
  ];
  if (casa.length) {
    lines.push("CASA:");
    for (const m of casa) lines.push(`- ${formatOneMoverLine(m)}`);
  }
  if (comi.length) {
    lines.push("COMISIONISTA:");
    for (const m of comi) lines.push(`- ${formatOneMoverLine(m)}`);
  }
  return lines.join(" ");
}

function formatIndependentTrendSummary(overallAv, casa, comi, diverge) {
  if (overallAv === AVAILABILITY.NOT_AUTHORIZED) {
    return "La tendencia comercial no está autorizada para este rol.";
  }
  if (
    casa.availability !== AVAILABILITY.REQUIRED &&
    comi.availability !== AVAILABILITY.REQUIRED
  ) {
    return "No tengo una tendencia defendible por canal en este turno. Ausencia no es cero ni una tendencia combinada.";
  }
  const casaBit =
    casa.availability === AVAILABILITY.REQUIRED
      ? `CASA=${casa.direction}`
      : "CASA=UNAVAILABLE";
  const comiBit =
    comi.availability === AVAILABILITY.REQUIRED
      ? `Comisionista=${comi.direction}`
      : "Comisionista=UNAVAILABLE";
  if (diverge) {
    return `${casaBit}; ${comiBit}. Divergen. No hay tendencia combinada. Tendencia ≠ venta actual ≠ forecast ≠ contribución ≠ causa.`;
  }
  return `${casaBit}; ${comiBit}. Cada canal conserva su evidencia. No es una serie agregada CASA+Comisionista. Tendencia ≠ venta actual ≠ forecast ≠ contribución ≠ causa.`;
}

function projectExecutiveTrendChannels(trend) {
  const overallAv = trendAvailability(trend);
  const casa = projectOneTrendChannel(trend, "casa", overallAv);
  const comi = projectOneTrendChannel(trend, "comisionista", overallAv);
  const diverge =
    casa.availability === AVAILABILITY.REQUIRED &&
    comi.availability === AVAILABILITY.REQUIRED &&
    casa.direction != null &&
    comi.direction != null &&
    casa.direction !== comi.direction;
  return {
    casa,
    comisionista: comi,
    diverge,
    compare: Boolean(trend && (trend.compare || trend.channel === "both")),
    availability: trendSlotAvailability(overallAv, casa, comi),
    overall: overallAv,
  };
}

function formatMaterialityNatural(mat) {
  if (!mat || !mat.categories) return null;
  const parts = [];
  for (const cat of mat.categories) {
    const names = (cat.top_clients || []).map((c) => c.cliente_display).filter(Boolean);
    if (!names.length) continue;
    if (cat.category === "dejaron") {
      parts.push(
        `Clientes que el cache comercial marca como «dejaron de comprar», ordenados por los kg que tenían en el mes previo (${cat.period || "sin periodo"}): ${names.join(", ")}. No son la lista de mayores clientes actuales ni la causa de una caída.`
      );
    } else if (cat.category === "disminuyeron") {
      parts.push(
        `Clientes que el cache marca como «disminuyeron», ordenados por kg observados en ${cat.period || "ese mes"}: ${names.join(", ")}. Es magnitud dentro de esa categoría, no clientes perdidos.`
      );
    }
  }
  return parts.length ? parts.join(" ") : null;
}

function dicfWithoutAction(mat) {
  if (!mat || !Array.isArray(mat.categories)) return false;
  return mat.categories.some((cat) =>
    (cat.top_clients || []).some((c) => c.coverage_status === "material_without_action" || c.has_dicf_action === false)
  );
}

function buildExecutiveStatusEvidenceDemand(opts) {
  const trendReachable = Boolean(opts && opts.trend_reachable);
  return {
    commercial_situation: AVAILABILITY.REQUIRED,
    commercial_trend: trendReachable ? AVAILABILITY.REQUIRED : AVAILABILITY.OPTIONAL,
    arr_projection: AVAILABILITY.OPTIONAL,
    igf_stored: AVAILABILITY.OPTIONAL,
    igf_meta_target: AVAILABILITY.OPTIONAL,
    commercial_state_drivers: AVAILABILITY.OPTIONAL,
    action_register_execution: AVAILABILITY.OPTIONAL,
    dicf_execution: AVAILABILITY.OPTIONAL,
    actual_financial: AVAILABILITY.NOT_APPLICABLE,
    steering_recorded: AVAILABILITY.NOT_APPLICABLE,
    plaud: AVAILABILITY.NOT_APPLICABLE,
    council: AVAILABILITY.NOT_APPLICABLE,
    live_copilot: AVAILABILITY.NOT_APPLICABLE,
  };
}

function buildExecutiveStatusPack(input) {
  const assembled = input.assembled || {};
  const trend = input.trend || null;
  const scope = input.scope || {};
  const sources = assembled.sources || {};
  const plantName = scope.plant_name || (assembled.plant && assembled.plant.planta_nombre) || null;
  const plantId = scope.planta_id || (assembled.plant && assembled.plant.planta_id) || null;
  const demand = buildExecutiveStatusEvidenceDemand({
    trend_reachable: Boolean(trend && !trend.abort && trend.ok !== false),
  });
  const periods = evaluatePeriodComposition(collectPeriodLabels(assembled, trend));
  const mat = assembled.commercial_materiality || null;
  const channelTrends = projectExecutiveTrendChannels(trend);
  const items = [];

  items.push(
    evidenceItem({
      slot: "SITUATION",
      source: "commercial_state+arr+igf",
      scope: plantName,
      period: periods.distinct_periods.join(" | ") || null,
      truth_semantics: "mixed_labeled",
      availability: mapSourceAvailability(sources.commercial_state) || AVAILABILITY.OPTIONAL,
      provenance: "plant_diagnosis loaders",
      summary: `Estado ejecutivo de ${plantName || "la planta"}. No es cierre FINAL ni ACTUAL_FINANCIAL.`,
    })
  );

  const adapterActual = input.forecastParity && input.forecastParity.actual_to_date;
  const authPack = resolveAuthoritativeForecastRunPack(input);
  const forecastAvailable = authPack && authPack.forecast && authPack.forecast.status === "AVAILABLE";
  const forecastVenta = forecastAvailable ? finiteOrNull(authPack.forecast.venta) : null;
  const forecastDesc = forecastAvailable ? finiteOrNull(authPack.forecast.descuento) : null;
  const igfUtilOper = forecastAvailable ? finiteOrNull(authPack.forecast.utilidad_operativa) : null;
  const igfResultado = forecastAvailable ? finiteOrNull(authPack.forecast.resultado_final) : null;
  const actualToDateVenta = finiteOrNull(
    authPack && authPack.actual_to_date && authPack.actual_to_date.venta != null
      ? authPack.actual_to_date.venta
      : adapterActual && adapterActual.venta_ton
  );
  const actualToDateDesc = null;
  const cutoffDate = (authPack && authPack.run_identity && authPack.run_identity.upload_day) || null;
  const hasCutoff = Boolean(cutoffDate);
  const miniForecastAvailable = forecastAvailable;
  const governedBy =
    (authPack && authPack.provenance && authPack.provenance.governed_by) ||
    (!hasCutoff ? "unavailable_no_cutoff" : "unavailable_no_forecast");
  const cutoffLabel = formatForecastCutoffDateEs(cutoffDate);
  const arrPeriod =
    periodLabel(sources.arr && sources.arr.period) || (assembled.alignment && assembled.alignment.arr_period);
  const igfPeriod =
    periodLabel(sources.igf && sources.igf.period) || (assembled.alignment && assembled.alignment.igf_period);
  const adapterPeriod =
    input.forecastParity && input.forecastParity.period && input.forecastParity.period.yyyy_mm
      ? input.forecastParity.period.yyyy_mm
      : arrPeriod;

  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "dashboard-arr-forecast.getPronosticoPlantDetail.venta_sheet.total_mes_sum",
      scope: plantName,
      period: adapterPeriod,
      truth_semantics: "ACTUAL_TO_DATE",
      availability: actualToDateVenta == null ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.OPTIONAL,
      provenance: "Dashboard TOTAL mes cerrado hasta el corte; no es proyección ni ACTUAL_FINANCIAL de cierre",
      payload: {
        venta_ton: actualToDateVenta,
        unit: "t",
        year: input.forecastParity && input.forecastParity.period && input.forecastParity.period.year,
        month: input.forecastParity && input.forecastParity.period && input.forecastParity.period.month,
        cutoff_date: cutoffDate,
        metric: "venta_ton",
      },
      summary:
        actualToDateVenta == null
          ? "Venta acumulada al corte no disponible. Ausencia no es cero. No es proyección."
          : cutoffDate
            ? `Al corte del ${cutoffDate} se han vendido ${actualToDateVenta} t (ACTUAL_TO_DATE; no es forecast ni meta).`
            : `Venta acumulada ${actualToDateVenta} t (ACTUAL_TO_DATE; corte no resuelto; no es forecast ni meta).`,
    })
  );
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "dashboard-arr-forecast.descuento_acumulado_al_corte",
      scope: plantName,
      period: adapterPeriod,
      truth_semantics: "ACTUAL_TO_DATE",
      availability: actualToDateDesc == null ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.OPTIONAL,
      provenance:
        "Mismo corte que venta acumulada. No se estima desde forecast ni se reutiliza IGF stored.",
      payload: {
        desc_kg: actualToDateDesc,
        unit: "$/kg",
        year: input.forecastParity && input.forecastParity.period && input.forecastParity.period.year,
        month: input.forecastParity && input.forecastParity.period && input.forecastParity.period.month,
        cutoff_date: cutoffDate,
        metric: "actual_desc_kg",
      },
      summary:
        actualToDateDesc == null
          ? "Descuento acumulado al corte no disponible (Dashboard no exporta esa cifra lista). Ausencia no es cero. No se estima desde forecast ni stored."
          : `Descuento acumulado al corte ${cutoffDate || "n/d"}: ${actualToDateDesc} $/kg (ACTUAL_TO_DATE; no es forecast ni meta).`,
    })
  );

  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: miniForecastAvailable
        ? "igf-forecast-mini.ventaTon"
        : "igf-forecast-mini.unavailable",
      scope: plantName,
      period: hasCutoff ? adapterPeriod : arrPeriod,
      truth_semantics: "FORECAST_PROJECTION",
      availability:
        !hasCutoff || !miniForecastAvailable || (forecastVenta == null && forecastDesc == null)
          ? AVAILABILITY.UNAVAILABLE
          : AVAILABILITY.OPTIONAL,
      provenance: !hasCutoff
        ? "PROM forecast requiere cutoff explícito, upload_day o last-upload de esta planta. No se usa ARR, stored ni fin de mes."
        : miniForecastAvailable
          ? "authoritative forecast runtime pack ← computeIgfForecastMiniPayload.rows[]"
          : "authoritative pack sin row usable; no ARR ni adapter",
      payload: {
        venta_ton: forecastVenta,
        desc_kg: forecastDesc,
        util_oper_importe: igfUtilOper,
        resultado_final_importe: igfResultado,
        unit_venta: "t",
        unit_desc: "$/kg",
        year: authPack && authPack.run_identity && authPack.run_identity.year,
        month: authPack && authPack.run_identity && authPack.run_identity.month,
        cutoff_date: cutoffDate,
        corte_day: authPack && authPack.run_identity && authPack.run_identity.corte_day,
        metric: "forecast_venta_desc",
        governed_by: governedBy,
        run_identity: authPack && authPack.run_identity,
      },
      summary: !hasCutoff
        ? "Forecast dependiente de PROM no disponible: no hay cutoff explícito, upload_day ni last-upload de esta planta. No se usa ARR, stored ni fin de mes como sustituto. UNAVAILABLE."
        : !miniForecastAvailable || (forecastVenta == null && forecastDesc == null)
          ? "No hay cifra de proyección usable. Ausencia no es cero."
          : `Forecast al corte del ${cutoffLabel || cutoffDate}: venta ${forecastVenta == null ? "n/d" : forecastVenta + " t"}; desc ${forecastDesc == null ? "n/d" : forecastDesc + " $/kg"} (FORECAST_PROJECTION pack autoritativo; misma corrida; no es acumulado ni meta ni ARR).`,
    })
  );
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: miniForecastAvailable ? "igf-forecast-mini.comDesc" : "igf-forecast-mini.unavailable",
      scope: plantName,
      period: hasCutoff ? adapterPeriod : arrPeriod,
      truth_semantics: "FORECAST_PROJECTION",
      availability: forecastDesc == null ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.OPTIONAL,
      provenance:
        "authoritative forecast runtime pack ← forecast.descuento (comDesc, signo UI). No es FORECAST_STORED com_desc_kg.",
      payload: {
        desc_kg: forecastDesc,
        unit: "$/kg",
        year: authPack && authPack.run_identity && authPack.run_identity.year,
        month: authPack && authPack.run_identity && authPack.run_identity.month,
        cutoff_date: cutoffDate,
        corte_day: authPack && authPack.run_identity && authPack.run_identity.corte_day,
        metric: "forecast_desc_kg",
        governed_by: governedBy,
        run_identity: authPack && authPack.run_identity,
      },
      summary:
        forecastDesc == null
          ? "Descuento (Forecast) no disponible. Ausencia no es cero. No se usa IGF almacenado ni ARR."
          : `Descuento (Forecast): ${forecastDesc} $/kg (FORECAST_PROJECTION pack autoritativo; misma run_identity; no es IGF descuento almacenado).`,
    })
  );

  const igfTon = igfCompositionLine(sources, "venta_ton");
  const igfDesc = igfCompositionLine(sources, "com_desc_kg");
  const igfPayload = sources.igf && sources.igf.payload;
  const igfVersionId = igfPayload && igfPayload.version_id != null ? igfPayload.version_id : null;
  const igfVersionNumber = igfPayload && igfPayload.version_number != null ? igfPayload.version_number : null;
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "igf.compromiso_lines",
      scope: plantName,
      period: igfPeriod,
      truth_semantics: "FORECAST_STORED",
      availability: igfTon == null ? mapSourceAvailability(sources.igf) : mapSourceAvailability(sources.igf),
      provenance: "igf.compromiso_lines de la última igf.versions GLOBAL del YYYY-MM (ORDER BY version_number DESC). No es igf_meta. No es TARGET_COMMITMENT.",
      payload: {
        venta_ton: igfTon,
        metric: "venta_ton",
        version_id: igfVersionId,
        version_number: igfVersionNumber,
        table: "igf.compromiso_lines",
      },
      summary:
        igfTon == null
          ? "No hay valor IGF almacenado usable. Ausencia no es cero ni se sustituye con forecast inventado."
          : `IGF almacenado ${igfTon} t (FORECAST_STORED igf.compromiso_lines v${igfVersionNumber != null ? igfVersionNumber : "?"} id=${igfVersionId != null ? igfVersionId : "?"}; no es actual, no es TARGET/igf_meta, no es el forecast al corte).`,
    })
  );
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "igf.compromiso_lines",
      scope: plantName,
      period: igfPeriod,
      truth_semantics: "FORECAST_STORED",
      availability: igfDesc == null ? AVAILABILITY.UNAVAILABLE : mapSourceAvailability(sources.igf),
      provenance: "igf.compromiso_lines.com_desc_kg del mismo version_id que la venta FORECAST_STORED. No es igf_meta.",
      payload: {
        desc_kg: igfDesc,
        com_desc_kg: igfDesc,
        metric: "com_desc_kg",
        version_id: igfVersionId,
        version_number: igfVersionNumber,
        table: "igf.compromiso_lines",
      },
      summary:
        igfDesc == null
          ? "Descuento IGF almacenado no disponible. Ausencia no es cero. No es TARGET."
          : `IGF descuento almacenado ${igfDesc} $/kg (FORECAST_STORED com_desc_kg mismo version_id=${igfVersionId != null ? igfVersionId : "?"}; no es actual ni TARGET/igf_meta).`,
    })
  );
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "igf-forecast-mini.utilOperImporte",
      scope: plantName,
      period: igfPeriod,
      truth_semantics: "FORECAST_PROJECTION",
      availability: igfUtilOper == null ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.OPTIONAL,
      provenance: "authoritative forecast runtime pack ← computeIgfForecastMiniPayload.rows[].utilOperImporte",
      payload: { util_oper_importe: igfUtilOper, metric: "util_oper_importe", cutoff_date: cutoffDate },
      summary:
        igfUtilOper == null
          ? "Utilidad operativa del mini IGF Forecast no disponible. No se usa stored ni recalcularUtilYResultado. Ausencia no es cero."
          : `Utilidad operativa ${igfUtilOper} (FORECAST_PROJECTION mini IGF Forecast utilOperImporte; Forecast al corte del ${cutoffLabel || cutoffDate || "n/d"}; no es stored ni ACTUAL_FINANCIAL ni TARGET).`,
    })
  );
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "igf-forecast-mini.resultadoFinalImporte",
      scope: plantName,
      period: igfPeriod,
      truth_semantics: "FORECAST_PROJECTION",
      availability: igfResultado == null ? AVAILABILITY.UNAVAILABLE : AVAILABILITY.OPTIONAL,
      provenance: "authoritative forecast runtime pack ← computeIgfForecastMiniPayload.rows[].resultadoFinalImporte",
      payload: { resultado_final_importe: igfResultado, metric: "resultado_final_importe", cutoff_date: cutoffDate },
      summary:
        igfResultado == null
          ? "Resultado final del mini IGF Forecast no disponible. No se usa stored ni recalcularUtilYResultado. Ausencia no es cero. No se infiere TARGET."
          : `Resultado final ${igfResultado} (FORECAST_PROJECTION mini IGF Forecast resultadoFinalImporte; Forecast al corte del ${cutoffLabel || cutoffDate || "n/d"}; no es stored ni ACTUAL_FINANCIAL ni TARGET).`,
    })
  );

  const casaPeriod = channelTrends.casa.period;
  const comiPeriod = channelTrends.comisionista.period;
  const trendPeriod =
    casaPeriod && comiPeriod && casaPeriod !== comiPeriod
      ? `${casaPeriod} | ${comiPeriod}`
      : casaPeriod || comiPeriod || (trend && trend.range_start ? `${trend.range_start}→${trend.range_end || ""}` : null);
  items.push(
    evidenceItem({
      slot: "TREND",
      source: "commercial-trend-engine",
      scope: plantName,
      period: trendPeriod,
      truth_semantics: "OLS_PER_CHANNEL",
      availability: channelTrends.availability,
      provenance: "commercial_trend CONDITIONAL per-channel",
      payload: {
        casa: channelTrends.casa,
        comisionista: channelTrends.comisionista,
        diverge: channelTrends.diverge,
        compare: channelTrends.compare,
      },
      summary: formatIndependentTrendSummary(
        channelTrends.overall,
        channelTrends.casa,
        channelTrends.comisionista,
        channelTrends.diverge
      ),
    })
  );

  const casaMovers = collectChannelMovers(trend, "casa");
  const comiMovers = collectChannelMovers(trend, "comisionista");
  const moversSummary = formatCommercialMoversSummary(casaMovers, comiMovers);
  items.push(
    evidenceItem({
      slot: "COMMERCIAL_MOVERS",
      source: "commercial-trend-engine",
      scope: plantName,
      period: trendPeriod,
      truth_semantics: "TOP_MOVERS_ABS_DELTA",
      availability: moversSummary ? AVAILABILITY.REQUIRED : AVAILABILITY.UNAVAILABLE,
      provenance: "commercial_trend.top_movers per channel; same engine as TREND. Not arr.dicf_cliente_mes.",
      payload: {
        casa: casaMovers,
        comisionista: comiMovers,
        verbal_projection: {
          casa: projectChannelMoversVerbal(casaMovers),
          comisionista: projectChannelMoversVerbal(comiMovers),
          per_sign: EXECUTIVE_MOVERS_PER_SIGN,
          engine_top_n_unchanged: true,
        },
      },
      summary: moversSummary,
    })
  );

  items.push(
    evidenceItem({
      slot: "TARGET_COMMITMENT",
      source: "igf_meta",
      availability: AVAILABILITY.UNAVAILABLE,
      truth_semantics: "TARGET_OR_COMMITMENT",
      payload: { venta_ton: null, desc_kg: null, metric: "target_or_commitment", version_id: null },
      summary:
        "Meta/compromiso (TARGET_OR_COMMITMENT / igf_meta) no está cargado. FORECAST_STORED de igf.compromiso_lines no es meta. No se infiere TARGET desde  IGF stored ni desde el forecast al corte.",
    })
  );

  const driverText = formatMaterialityNatural(mat);
  items.push(
    evidenceItem({
      slot: "DRIVERS",
      source: "arr.dicf_cliente_mes",
      scope: plantName,
      period: mat && mat.current_period ? mat.current_period : periodLabel(sources.commercial_state && sources.commercial_state.period),
      truth_semantics: "cached_category_magnitude",
      availability: driverText ? AVAILABILITY.OPTIONAL : AVAILABILITY.UNAVAILABLE,
      provenance: "commercial_materiality",
      summary: driverText,
      payload: mat,
    })
  );

  const ar = sources.action_register && sources.action_register.payload;
  const overdue = ar && ar.summary ? ar.summary.overdue : null;
  items.push(
    evidenceItem({
      slot: "RISKS",
      source: "arr.action_register_revisions",
      scope: plantName,
      period: periodLabel(sources.action_register && sources.action_register.period),
      truth_semantics: "open_overdue_actions",
      availability: mapSourceAvailability(sources.action_register),
      summary:
        overdue == null
          ? "Sin conteo de acciones vencidas usable."
          : `${overdue} acciones vencidas registradas. Eso no prueba causa comercial.`,
    })
  );

  items.push(
    evidenceItem({
      slot: "EXECUTION",
      source: "arr.action_register_revisions+arr.dicf_acciones",
      scope: plantName,
      availability: mapSourceAvailability(sources.dicf),
      truth_semantics: "registered_actions_only",
      summary: dicfWithoutAction(mat)
        ? "Hay clientes materiales sin acción DICF asociada. Eso no prueba que no se hayan tomado medidas en otras fuentes."
        : "Ejecución = acciones registradas (AR/DICF), no historial de junta.",
    })
  );

  items.push(
    evidenceItem({
      slot: "NEXT_DECISION",
      source: null,
      availability: overdue > 0 ? AVAILABILITY.OPTIONAL : AVAILABILITY.UNAVAILABLE,
      truth_semantics: "execution_followup",
      summary: overdue > 0 ? "Hay vencidas registradas que pueden pedir actualización." : null,
    })
  );

  items.push(
    evidenceItem({
      slot: "STEERING",
      source: "EXECUTIVE_STEERING_CAPTURE",
      availability: AVAILABILITY.NOT_APPLICABLE,
      truth_semantics: "RECORDED_NOT_READ",
      summary: "Steering no se lee en este slice. POST_CAPTURE_READ pendiente.",
    })
  );

  const includedSlots = ANSWER_HIERARCHY.filter((slot) =>
    items.some(
      (it) =>
        it.slot === slot &&
        it.availability !== AVAILABILITY.UNAVAILABLE &&
        it.availability !== AVAILABILITY.NOT_APPLICABLE &&
        it.availability !== AVAILABILITY.PERIOD_INCOMPATIBLE &&
        (it.summary || it.payload)
    )
  );

  return {
    semantic_class: SEMANTIC_CLASS,
    need_type: NEED_TYPES.EXECUTIVE_STATUS,
    first_slice: FIRST_SLICE,
    composer: COMPOSER_KIND,
    scope,
    plant: { planta_id: plantId, planta_nombre: plantName },
    demand,
    items,
    included_slots: includedSlots,
    periods,
    channels: CHANNEL_REGISTRY,
    dicf_no_action: dicfWithoutAction(mat),
    dicf_measures_supported: false,
    alignment: assembled.alignment || null,
    assembly_status: assembled.assembly_status || null,
    limitations: assembled.limitations || [],
    ledger: CAPABILITY_INTEGRATION_LEDGER,
    effective_cutoff_date: cutoffDate || null,
    authoritative_forecast: authPack,
  };
}

const MONTHS_ES = Object.freeze([
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

function formatForecastCutoffDateEs(ymd) {
  const s = String(ymd || "").trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
}

function finiteOrNull(v) {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function igfCompositionLine(sources, lineKey) {
  const payload = sources && sources.igf && sources.igf.payload;
  if (payload && payload[lineKey] != null) return finiteOrNull(payload[lineKey]);
  const lines = payload && payload.composition && payload.composition.lines;
  if (!Array.isArray(lines)) return null;
  const found = lines.find((l) => l && l.line_key === lineKey);
  return found ? finiteOrNull(found.value) : null;
}

function executiveQuestionFocusLines(question) {
  const q = normalizeExecutiveText(question);
  const lines = [
    "Contrato de foco (no phrase patch): usa solo slots del pack; prioriza el tema nombrado.",
    "Forecast no es actual. Actual al corte no es proyección. IGF stored (compromiso_lines) no es TARGET/igf_meta. No infieras TARGET desde IGF/Forecast.",
    "Si cutoff_date está AVAILABLE, dilo con el acumulado y con el forecast. Expresa el forecast como «Forecast al corte del <fecha en español>», no como «forecast de agosto» genérico. Venta, descuento, utilidad y resultado forecast son de la misma corrida/corte. Venta y descuento stored son del mismo version_id.",
  ];
  if (/\b(corte|acumulado|llevamos vendido)\b/.test(q)) {
    lines.push(
      "La pregunta nombra acumulado/corte: prioriza MAGNITUDE ACTUAL_TO_DATE (venta y descuento al mismo cutoff_date). No lo llames forecast ni meta."
    );
  }
  if (/\bforecast\b/.test(q) || /\bproyecta cerrar\b/.test(q)) {
    lines.push(
      "La pregunta nombra forecast/cierre proyectado: prioriza FORECAST_PROJECTION del mini con su cutoff_date. No uses ACTUAL_TO_DATE ni FORECAST_STORED como forecast."
    );
  }
  if (/\b(meta|compromiso)\b/.test(q)) {
    lines.push(
      "La pregunta nombra meta/compromiso: solo afirma TARGET_OR_COMMITMENT si el slot igf_meta está AVAILABLE. FORECAST_STORED no es meta. Si UNAVAILABLE, dilo; no infieras."
    );
  }
  if (/\bdescuento\b/.test(q)) {
    lines.push(
      "La pregunta nombra descuento: prioriza MAGNITUDE FORECAST_PROJECTION desc_kg cuando AVAILABLE. FORECAST_STORED com_desc_kg no sustituye el forecast autoritativo vigente."
    );
  }
  if (/\b(rentabilidad|utilidad|resultado)\b/.test(q)) {
    lines.push(
      "La pregunta nombra rentabilidad/utilidad/resultado: usa util_oper_importe y resultado_final_importe FORECAST_PROJECTION del mini IGF cuando AVAILABLE. FORECAST_STORED no sustituye ese forecast autoritativo. No uses ACTUAL_FINANCIAL como sustituto del mes abierto."
    );
  }
  if (/\b(como vamos|como andamos|como estamos|que esta pasando|estado)\b/.test(q)) {
    lines.push(
      "Estado general: no hagas dump. Selecciona por materialidad entre slots disponibles. Etiquetas deterministas."
    );
    lines.push(
      "Si MAGNITUDE forecast_desc_kg está AVAILABLE, incluye la línea «Descuento (Forecast): <desc_kg> $/kg» en Magnitudes Clave. No la omitas. No la sustituyas por IGF descuento almacenado. FORECAST.descuento ≠ FORECAST_STORED.descuento."
    );
    lines.push(
      "Si MAGNITUDE FORECAST_STORED venta_ton está AVAILABLE, incluye «IGF almacenado: <venta_ton> t» en Magnitudes Clave. Si MAGNITUDE FORECAST_STORED com_desc_kg está AVAILABLE, incluye «IGF descuento almacenado: <desc_kg> $/kg». Coexisten con Forecast. No las omitas para dejar espacio a COMMERCIAL_MOVERS. FORECAST ≠ FORECAST_STORED. ACTUAL_TO_DATE ≠ FORECAST ≠ FORECAST_STORED."
    );
    lines.push(
      "Si COMMERCIAL_MOVERS está AVAILABLE, incluye el bloque «Movimientos comerciales relevantes» DESPUÉS de Tendencias y ANTES de Riesgos, usando solo la proyección verbal compacta del pack (no imprimas los 12 del motor). Separa CASA y COMISIONISTA. Comentario registrado no es causa: no lo pongas entre paréntesis como si explicara el delta. DRIVERS (dicf_cliente_mes) no sustituye este bloque."
    );
  }
  return lines;
}

function formatPackForPrompt(pack) {
  const lines = [
    "PACK EJECUTIVO DETERMINÍSTICO (no es dump de fuentes; no es IES; no es N5).",
    `need=${pack.need_type} composer=${pack.composer} slice=${pack.first_slice}`,
    `planta=${(pack.plant && pack.plant.planta_nombre) || "—"} id=${pack.plant && pack.plant.planta_id != null ? pack.plant.planta_id : "—"} scope=${pack.scope && pack.scope.scope_source}`,
    `period_strategy=${pack.periods && pack.periods.strategy} fuse=${Boolean(pack.periods && pack.periods.fuse)}`,
    `effective_cutoff_date=${pack.effective_cutoff_date || "UNAVAILABLE"}`,
    `authoritative_forecast_status=${(pack.authoritative_forecast && pack.authoritative_forecast.status) || "UNAVAILABLE"}`,
    pack.authoritative_forecast && pack.authoritative_forecast.run_identity
      ? `authoritative_run plant_code=${pack.authoritative_forecast.run_identity.plant_code || "—"} upload_day=${pack.authoritative_forecast.run_identity.upload_day || "UNAVAILABLE"} corte_day=${pack.authoritative_forecast.run_identity.corte_day || "UNAVAILABLE"} origin=${pack.authoritative_forecast.run_identity.cutoff_origin || "UNAVAILABLE"}`
      : "authoritative_run=UNAVAILABLE",
    pack.periods && pack.periods.user_note ? `period_note=${pack.periods.user_note}` : "period_note=—",
    `canales: CASA=${CHANNEL_REGISTRY.CASA.availability} independent; COMISIONISTA=${CHANNEL_REGISTRY.COMISIONISTA.availability} independent; PORTATIL=${CHANNEL_REGISTRY.PORTATIL.availability}; CARBURACION=${CHANNEL_REGISTRY.CARBURACION.availability}`,
    `slots_incluidos=${(pack.included_slots || []).join("→") || "ninguno"}`,
    "Jerarquía condicional: SITUATION → MAGNITUDE → TREND → COMMERCIAL_MOVERS → TARGET/COMMITMENT → DRIVERS → RISKS → EXECUTION → NEXT_DECISION.",
    "PRECEDENCIA KPI: si el authoritative forecast runtime pack está AVAILABLE (governed_by=dashboard_authoritative_mini), las cuatro magnitudes FORECAST (venta, descuento, utilidad operativa, resultado final) de la misma run_identity gobiernan. ARR crudo, computePronosticoProyByPlant, adapter paralelo y FORECAST_STORED no los pisan. ACTUAL_TO_DATE no es forecast. FORECAST_STORED, cuando AVAILABLE, COEXISTE en Magnitudes Clave; no se omite ni se fusiona con Forecast.",
    "Omite slots sin evidencia. El orden de fuentes no es el orden de respuesta.",
    "No empieces por clientes ni por materialidad salvo que sea el hallazgo más importante del pack.",
    "Tras Tendencias, si COMMERCIAL_MOVERS está AVAILABLE, verbaliza «Movimientos comerciales relevantes» antes de Riesgos. No es DRIVERS. Comentario registrado ≠ causa. No reconcilies un comentario contradictorio con el delta.",
    "CASA y Comisionista son canales independientes. Conserva la dirección de cada uno. Si divergen, dilo. No inventes una tendencia combinada. No unas ambos canales con una barra en un solo rótulo. Tendencia ≠ venta actual ≠ forecast ≠ contribución ≠ causa.",
    "",
  ];
  for (const item of pack.items || []) {
    lines.push(
      `SLOT ${item.slot} | availability=${item.availability} | source=${item.source || "—"} | period=${item.period || "—"} | truth=${item.truth_semantics || "—"}`
    );
    if (item.summary) lines.push(`  ${item.summary}`);
    if (item.payload) {
      for (const key of [
        "venta_ton",
        "desc_kg",
        "com_desc_kg",
        "util_oper_importe",
        "resultado_final_importe",
        "cutoff_date",
        "version_id",
        "version_number",
      ]) {
        if (item.payload[key] != null) {
          lines.push(`  ${key}=${item.payload[key]} (si falta, no escribas 0)`);
        }
      }
    }
    if (item.slot === "TREND" && item.payload && item.payload.casa) {
      const casa = item.payload.casa;
      const comi = item.payload.comisionista || {};
      lines.push(
        `  CASA availability=${casa.availability} direction=${casa.direction || "null"} period=${casa.period || "—"} provenance=${casa.provenance || "—"}`
      );
      lines.push(
        `  COMISIONISTA availability=${comi.availability} direction=${comi.direction || "null"} period=${comi.period || "—"} provenance=${comi.provenance || "—"}`
      );
      lines.push(`  diverge=${item.payload.diverge === true} (no tendencia combinada; no uses primary=casa)`);
    }
    if (item.slot === "COMMERCIAL_MOVERS" && item.payload) {
      const verbal =
        item.payload.verbal_projection || {
          casa: projectChannelMoversVerbal(item.payload.casa),
          comisionista: projectChannelMoversVerbal(item.payload.comisionista),
        };
      lines.push(
        `  motor_casa=${(item.payload.casa || []).length} motor_comisionista=${(item.payload.comisionista || []).length} verbal_cap=${EXECUTIVE_MOVERS_PER_SIGN}+${EXECUTIVE_MOVERS_PER_SIGN} por canal (no cambia Top 6 del motor)`
      );
      for (const key of ["casa", "comisionista"]) {
        const list = verbal[key] || [];
        lines.push(`  ${key === "casa" ? "CASA" : "COMISIONISTA"} proyección=${list.length}`);
        for (const m of list) {
          lines.push(`    ${formatOneMoverLine(m)}`);
        }
      }
    } else if (item.payload && item.payload.direction && !item.payload.casa) {
      lines.push(`  tendencia_ols=${item.payload.direction}`);
    }
  }
  if (pack.dicf_no_action) {
    lines.push("");
    lines.push("DICF: hay al menos un cliente sin acción DICF asociada.");
    lines.push("Frase permitida: «No encontré una acción DICF asociada.»");
    lines.push("Frases prohibidas: «No se han tomado medidas.» «No se tomaron medidas.» «No se hizo nada.» «Nadie actuó.»");
  }
  lines.push("");
  lines.push("No uses jerga interna (mismatch, null no es cero, source fusion, SOURCE_RESTRICTED) en la respuesta al director.");
  lines.push("Si hay periodos distintos, dilo en lenguaje natural.");
  lines.push("No inventes Portátil ni Carburación. No prometas Steering, Plaud, Consejo ni copilot en vivo.");
  return lines.join("\n");
}

function buildExecutiveStatusPrompt(pack, question) {
  const systemPrompt = [
    "Eres Director IA. Responde en español, breve y ejecutivo.",
    "Redacta SOLO sobre el pack. No inventes cifras, canales, causas ni medidas no evidenciadas.",
    "Prioriza qué significa el estado para el director, no enumerar fuentes.",
    "Títulos internos (MATERIALIDAD COMERCIAL, BLOQUE, SOURCE_RESTRICTED) no son UX.",
    "Ausencia no es cero. Forecast no es actual. IGF almacenado no es ARR. Periodos distintos no se fusionan.",
    "CASA y Comisionista son tendencias independientes. Si divergen, conserva ambas. No inventes una tendencia combinada ni un rótulo con barra que una ambos canales.",
    "NO_DICF_ACTION no es NO_MEASURES_TAKEN.",
  ].join(" ");
  const userContent = [
    formatPackForPrompt(pack),
    "",
    ...executiveQuestionFocusLines(question),
    "",
    "Pregunta del ejecutivo:",
    String(question || ""),
    "",
    "Redacta una composición ejecutiva. Incluye solo slots soportados. No hagas dump.",
  ].join("\n");
  return { systemPrompt, userContent };
}

function applyExecutiveLanguageGuard(answer, pack) {
  let text = String(answer || "").trim();
  if (!text) return text;
  if (!pack || !pack.dicf_measures_supported) {
    text = text.replace(DICF_MEASURES_OVERCLAIM_RE, "No encontré una acción DICF asociada.");
  }
  text = text.replace(/\bperiod mismatch\b/gi, "periodos distintos");
  text = text.replace(/\bnull no es cero\b/gi, "esa cifra no está disponible");
  text = text.replace(/\bno source fusion\b/gi, "");
  text = text.replace(/\bSOURCE_RESTRICTED\b/g, "sin permiso para esa fuente");
  text = text.replace(FUSED_CHANNEL_TREND_RE, "CASA y Comisionista");
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

function buildNeutralGreeting(plantLabel) {
  const plant = plantLabel && String(plantLabel).trim();
  if (plant) return `Hola. Estoy en ${plant}. ¿Qué quieres revisar?`;
  return "Hola. ¿Qué quieres revisar?";
}

function buildSteeringFrontierAnswer() {
  return "Todavía no leo compromisos ni decisiones de junta. Esa lectura queda pendiente; no invento un acuerdo.";
}

function buildScopeClarificationResult(opts) {
  return {
    ok: true,
    answer: opts.clarification || "¿De qué planta quieres el estado?",
    sources: [],
    context_meta: {
      mode: "executive_status_clarify",
      semantic_need: NEED_TYPES.EXECUTIVE_STATUS,
      requires_clarification: true,
      openai_called: false,
      openai_call_count: 0,
      planta_id: opts.planta_id != null ? Number(opts.planta_id) : null,
      timestamp: new Date().toISOString(),
      scope_source: opts.scope_source || SCOPE_SOURCE.UNRESOLVED,
      executive_composer: false,
      ies_runtime: false,
      reasoning_engine: false,
    },
  };
}

function buildSteeringFrontierResult(opts) {
  return {
    ok: true,
    answer: buildSteeringFrontierAnswer(),
    sources: [],
    context_meta: {
      mode: "steering_frontier",
      semantic_need: null,
      steering_chat: "PENDING",
      post_capture_read: "PENDING",
      openai_called: false,
      openai_call_count: 0,
      planta_id: opts && opts.planta_id != null ? Number(opts.planta_id) : null,
      timestamp: new Date().toISOString(),
      ies_runtime: false,
      reasoning_engine: false,
    },
  };
}

function buildExecutiveStatusChatResult(assembled, pack, opts) {
  const planta_id =
    opts.planta_id != null ? Number(opts.planta_id) : pack.plant && pack.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: [
      "arr.action_register_revisions",
      "arr.dicf_acciones",
      "arr.director_ia_bitacora",
      "arr.proyeccion_planta",
      "igf.compromiso_lines",
      "arr.dicf_cliente_mes",
      ...(pack.items.some((i) => i.slot === "TREND" && i.availability === AVAILABILITY.REQUIRED)
        ? ["arr.ventas_diarias_cliente"]
        : []),
    ],
    context_meta: {
      mode: "plant_diagnosis",
      requested_domain: "plant_diagnosis",
      semantic_need: NEED_TYPES.EXECUTIVE_STATUS,
      executive_composer: true,
      composer: COMPOSER_KIND,
      first_slice: FIRST_SLICE,
      scope_source: pack.scope && pack.scope.scope_source,
      period_strategy: pack.periods && pack.periods.strategy,
      included_slots: pack.included_slots,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled && assembled.assembly_status,
      commercial_materiality: assembled && assembled.commercial_materiality,
      alignment: assembled && assembled.alignment,
      limitations: assembled && assembled.limitations,
      prompt_mode: "executive_status",
      focus_type: "executive_status",
      igf_arr_annex: false,
      ies_runtime: false,
      reasoning_engine: false,
      m9_included: false,
      steering_chat: "PENDING",
      post_capture_read: "PENDING",
      plaud: "PENDING_INTEGRATION",
      council: "PENDING",
      live_copilot: "PENDING",
    },
    plant_diagnosis: assembled
      ? {
          semantic_class: assembled.semantic_class,
          plant: assembled.plant,
          requested_period: assembled.requested_period,
          sources: assembled.sources,
          alignment: assembled.alignment,
          limitations: assembled.limitations,
          assembly_status: assembled.assembly_status,
          commercial_materiality: assembled.commercial_materiality || null,
        }
      : null,
    executive_status: {
      need_type: NEED_TYPES.EXECUTIVE_STATUS,
      pack_slots: pack.included_slots,
      periods: pack.periods,
      channels: CHANNEL_REGISTRY,
      scope: pack.scope,
    },
  };
}

async function loadPlantCatalog(pool, injected) {
  if (Array.isArray(injected) && injected.length) return catalogEntries(injected);
  if (!pool || typeof pool.query !== "function") return [];
  try {
    const r = await pool.query(`SELECT id, nombre, clave FROM public.plantas`);
    return catalogEntries(
      (r.rows || []).map((row) => ({
        planta_id: row.id,
        nombre: row.nombre,
        clave: row.clave,
      }))
    );
  } catch (_e) {
    return [];
  }
}

function plannerIntentYieldsToExecutiveStatus(intent) {
  return CEL_OVERRIDABLE_PLANNER_INTENTS.includes(intent);
}

function shouldHandleExecutiveStatus(need, continuityTurn, plannerIntent) {
  if (!need || need.need_type !== NEED_TYPES.EXECUTIVE_STATUS || !need.implemented) return false;
  if (need.specialized || need.steering_frontier) return false;
  if (continuityTurn && continuityTurn.entity_hint && continuityTurn.inherit) {
    const kind = continuityTurn.kind;
    if (kind === "entity_intro" || kind === "pronoun" || kind === "action") return false;
  }
  if (plannerIntent != null && !plannerIntentYieldsToExecutiveStatus(plannerIntent)) return false;
  return true;
}

module.exports = {
  SEMANTIC_CLASS,
  FIRST_SLICE,
  COMPOSER_KIND,
  PERIOD_STRATEGY,
  CEL_SHIP_DEPENDENCY,
  ISOLATED_CEL_SHIP,
  CEL_OVERRIDABLE_PLANNER_INTENTS,
  NEED_TYPES,
  AVAILABILITY,
  SCOPE_SOURCE,
  CHANNEL_REGISTRY,
  ANSWER_HIERARCHY,
  IMPLEMENTED_THIS_SLICE,
  CAPABILITY_INTEGRATION_LEDGER,
  normalizeExecutiveText,
  resolveExecutiveNeed,
  extractExplicitPlant,
  resolveSemanticScope,
  uiPlantAnchorUsable,
  isExecutiveStatusQuestion,
  isPlantLevelExecutiveFinancialQuestion,
  isCutoffAwareMagnitudeQuestion,
  classifyForecastMagnitudeFollowUp,
  isAuthoritativeForecastMagnitudeFollowUp,
  formatForecastMagnitudeFollowUpAnswer,
  namedCalendarPeriodFromQuestion,
  isSpecializedStandaloneQuestion,
  isUnequivocalDailyBriefQuestion,
  isSteeringReadQuestion,
  plannerIntentYieldsToExecutiveStatus,
  buildExecutiveStatusEvidenceDemand,
  buildExecutiveStatusPack,
  collectChannelMovers,
  projectChannelMoversVerbal,
  formatCommercialMoversSummary,
  projectExecutiveTrendChannels,
  evaluatePeriodComposition,
  buildExecutiveStatusPrompt,
  applyExecutiveLanguageGuard,
  buildNeutralGreeting,
  buildSteeringFrontierAnswer,
  buildScopeClarificationResult,
  buildSteeringFrontierResult,
  buildExecutiveStatusChatResult,
  loadPlantCatalog,
  shouldHandleExecutiveStatus,
  formatForecastCutoffDateEs,
  formatPackForPrompt,
};
