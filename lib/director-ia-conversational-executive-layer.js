"use strict";

/**
 * Conversational Executive Layer — first slice C.
 * Semantic need + UI plant anchor + executive plant-status composer.
 * Planner/tools remain the execution layer. No IES. No N5. No new truth source.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { ACTION_REGISTER_TEMAS } = require("./action-register-temas");
const { isCommercialTrendQuestion } = require("./director-ia-commercial-trend");
// CEL_SHIP_DEPENDENCY=PRE_CLOSE_SHARED_COMPOSER. ISOLATED_CEL_SHIP=NO.
// isPreCloseQuestion vive en el composer compartido aprobado. CEL no es aislable de ese módulo.
const { isPreCloseQuestion } = require("./director-ia-executive-cycle-composer");
const { isMonthCloseQuestion } = require("./director-ia-month-close-result");
const { isPreMeetingQuestion } = require("./director-ia-pre-meeting");
const { isClientProfileQuestion } = require("./director-ia-client-profile");
const { assertOperationalPlantAccess } = require("./director-ia-plant-diagnosis");

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
  CASA: { availability: "PARTIAL", independent: true, note: "Tendencia CASA vs comisionista cuando el motor es reachable." },
  COMISIONISTA: { availability: "PARTIAL", independent: true, note: "Mismo motor; no es Portátil ni Carburación." },
  PORTATIL: { availability: "NOT_AVAILABLE", independent: true, note: "No existe canal independiente actual." },
  CARBURACION: { availability: "NOT_AVAILABLE", independent: true, note: "No existe canal independiente actual." },
});

const ANSWER_HIERARCHY = Object.freeze([
  "SITUATION",
  "MAGNITUDE",
  "TREND",
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
    planned_integration_point: "EXECUTIVE_STATUS CONDITIONAL",
    orphan_risk: "alto",
    first_slice_bridge: "CONDITIONAL",
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

function isExecutiveStatusQuestion(raw) {
  const q = normalizeExecutiveText(raw);
  if (!q) return false;
  if (isSpecializedStandaloneQuestion(raw)) return false;
  if (isSteeringReadQuestion(raw)) return false;
  if (isRiskFocusQuestion(q) || isCauseQuestion(q) || isRecommendationQuestion(q) || isComparisonQuestion(q)) {
    return false;
  }
  if (hasArTheme(q) && /\bcomo\s+va\b/.test(q) && !/\bplanta\b/.test(q)) return false;
  if (/\b(folio|accion(?:es)?|vencid|descuento|ingreso|presupuesto)\b/.test(q) && !/\bplanta\b/.test(q)) {
    return false;
  }
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
  if (trend && trend.range_start && trend.range_end) {
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
  const trendAv = trendAvailability(trend);
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

  const arrTon =
    sources.arr && sources.arr.payload && sources.arr.payload.venta_ton != null
      ? sources.arr.payload.venta_ton
      : sources.arr && sources.arr.payload && sources.arr.payload.proy_venta_ton != null
        ? sources.arr.payload.proy_venta_ton
        : null;
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "arr.proyeccion_planta",
      scope: plantName,
      period: periodLabel(sources.arr && sources.arr.period) || (assembled.alignment && assembled.alignment.arr_period),
      truth_semantics: "FORECAST_PROJECTION",
      availability: arrTon == null ? AVAILABILITY.UNAVAILABLE : mapSourceAvailability(sources.arr),
      provenance: "ARR proy_venta_ton",
      payload: { venta_ton: arrTon },
      summary:
        arrTon == null
          ? "No hay cifra de proyección ARR usable. Ausencia no es cero."
          : `Proyección ARR ${arrTon} t (no es venta actual ni ACTUAL_FINANCIAL).`,
    })
  );

  const igfTon =
    sources.igf && sources.igf.payload && sources.igf.payload.venta_ton != null
      ? sources.igf.payload.venta_ton
      : sources.igf &&
          sources.igf.payload &&
          sources.igf.payload.composition &&
          sources.igf.payload.composition.lines
        ? (sources.igf.payload.composition.lines.find((l) => l.line_key === "venta_ton") || {}).value
        : null;
  items.push(
    evidenceItem({
      slot: "MAGNITUDE",
      source: "igf.compromiso_lines",
      scope: plantName,
      period: periodLabel(sources.igf && sources.igf.period) || (assembled.alignment && assembled.alignment.igf_period),
      truth_semantics: "FORECAST_STORED",
      availability: igfTon == null ? mapSourceAvailability(sources.igf) : mapSourceAvailability(sources.igf),
      provenance: "IGF stored FORECAST",
      payload: { venta_ton: igfTon },
      summary:
        igfTon == null
          ? "No hay valor IGF almacenado usable. Ausencia no es cero ni se sustituye con forecast inventado."
          : `IGF almacenado ${igfTon} t (FORECAST stored, no actual).`,
    })
  );

  items.push(
    evidenceItem({
      slot: "TREND",
      source: "commercial-trend-engine",
      scope: plantName,
      period: trend && trend.range_start ? `${trend.range_start}→${trend.range_end || ""}` : null,
      truth_semantics: "OLS_CASA_COMISIONISTA",
      availability: trendAv,
      provenance: "commercial_trend CONDITIONAL",
      payload: trend && trend.ok !== false && !trend.abort ? { direction: (trend.ols && trend.ols.direction) || (trend.primary && trend.primary.ols && trend.primary.ols.direction) || null, compare: Boolean(trend.compare), limitations: trend.limitations || [] } : null,
      summary:
        trendAv === AVAILABILITY.NOT_AUTHORIZED
          ? "La tendencia comercial no está autorizada para este rol."
          : trendAv === AVAILABILITY.UNAVAILABLE
            ? "No tengo una tendencia defendible en este turno."
            : "Tendencia del motor CASA/comisionista. No implica Portátil ni Carburación.",
    })
  );

  items.push(
    evidenceItem({
      slot: "TARGET_COMMITMENT",
      source: "igf_meta",
      availability: AVAILABILITY.UNAVAILABLE,
      truth_semantics: "TARGET",
      summary: "Meta/compromiso (igf_meta) no se carga en este first slice salvo modo especializado.",
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
  };
}

function formatPackForPrompt(pack) {
  const lines = [
    "PACK EJECUTIVO DETERMINÍSTICO (no es dump de fuentes; no es IES; no es N5).",
    `need=${pack.need_type} composer=${pack.composer} slice=${pack.first_slice}`,
    `planta=${(pack.plant && pack.plant.planta_nombre) || "—"} id=${pack.plant && pack.plant.planta_id != null ? pack.plant.planta_id : "—"} scope=${pack.scope && pack.scope.scope_source}`,
    `period_strategy=${pack.periods && pack.periods.strategy} fuse=${Boolean(pack.periods && pack.periods.fuse)}`,
    pack.periods && pack.periods.user_note ? `period_note=${pack.periods.user_note}` : "period_note=—",
    `canales: CASA=${CHANNEL_REGISTRY.CASA.availability}; PORTATIL=${CHANNEL_REGISTRY.PORTATIL.availability}; CARBURACION=${CHANNEL_REGISTRY.CARBURACION.availability}`,
    `slots_incluidos=${(pack.included_slots || []).join("→") || "ninguno"}`,
    "Jerarquía condicional: SITUATION → MAGNITUDE → TREND → TARGET/COMMITMENT → DRIVERS → RISKS → EXECUTION → NEXT_DECISION.",
    "Omite slots sin evidencia. El orden de fuentes no es el orden de respuesta.",
    "No empieces por clientes ni por materialidad salvo que sea el hallazgo más importante del pack.",
    "",
  ];
  for (const item of pack.items || []) {
    lines.push(
      `SLOT ${item.slot} | availability=${item.availability} | source=${item.source || "—"} | period=${item.period || "—"} | truth=${item.truth_semantics || "—"}`
    );
    if (item.summary) lines.push(`  ${item.summary}`);
    if (item.payload && item.payload.venta_ton != null) {
      lines.push(`  cifra=${item.payload.venta_ton} (si falta, no escribas 0)`);
    }
    if (item.payload && item.payload.direction) {
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
    "NO_DICF_ACTION no es NO_MEASURES_TAKEN.",
  ].join(" ");
  const userContent = [
    formatPackForPrompt(pack),
    "",
    "Pregunta del ejecutivo:",
    String(question || ""),
    "",
    "Redacta una composición ejecutiva. Incluye solo slots soportados.",
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
  isSpecializedStandaloneQuestion,
  isUnequivocalDailyBriefQuestion,
  isSteeringReadQuestion,
  plannerIntentYieldsToExecutiveStatus,
  buildExecutiveStatusEvidenceDemand,
  buildExecutiveStatusPack,
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
  formatPackForPrompt,
};
