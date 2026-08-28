"use strict";

/**
 * Composer compartido del ciclo ejecutivo (ARCH B).
 * First slice: cycle_mode=PRE_CLOSE, portafolio planta a planta.
 * No ACTUAL_FINANCIAL. No commitment/scenario/what-if. No total zonal financiero.
 * Reusa loaders existentes. Read-only. Sin HTTP interno.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { isDirectorZPForDashboard } = require("./dashboard-es-zp");
const {
  assertClientProfileAccess,
  cdmxTodayParts,
  queryMonthlySales,
  queryMonthlyDiscount,
} = require("./director-ia-client-profile");
const { resolvePlantCodes } = require("./commercial-trend-engine");
const { listMetaVersions, loadMetaLinesForVersion, schemaMetaExists } = require("./igf-meta-excel");
const { loadIgfCommitSnapshot, findIgfRowForPlant } = require("./director-ia-igf-arr");
const { loadIgfReviewableSupportsForChat } = require("./director-ia-igf-reviewable-supports");
const { loadCommercialTrendForChat } = require("./director-ia-commercial-trend");
const {
  aggregateSales,
  aggregateDiscount,
  classifyClients,
  pickCurrentMetaVersion,
  pickMetaRowForPlant,
  toTon,
  toYyyyMm,
} = require("./director-ia-month-close-result");
const { defaultLoadActions } = require("./director-ia-pre-meeting");

const CYCLE_MODE = "PRE_CLOSE";
const SEMANTIC_CLASS = "executive_cycle_pre_close";
const FUTURE_CHAIN = Object.freeze(["TARGET", "FORECAST", "COMMITMENT", "FINAL", "LESSON", "ACTION"]);

const FORECAST_FIELDS = Object.freeze([
  "venta_ton",
  "margen_kg",
  "com_desc_kg",
  "hg_kg",
  "hg_pct",
  "gasto_kg",
  "gtos_apoyos_corp_kg",
  "inversiones_kg",
  "util_oper_importe",
  "resultado_final_importe",
]);

const SYSTEM_ADDENDUM = [
  "EVIDENCIA PRE_CLOSE (composer ciclo ejecutivo; first slice B; portafolio planta a planta).",
  "No es IES. No es Consejo. No es Plaud. No es cierre FINAL. No es ACTUAL_FINANCIAL.",
  "current = ACTUAL_COMMERCIAL to-date. target = TARGET_COMMITMENT (igf_meta, YYYY-MM exacto). base_forecast = FORECAST (IGF latest operacional).",
  "FORECAST != target != actual. BASE_FORECAST no es FINAL ni commitment ni escenario.",
  "No inventes intervención, compromiso humano, escenario de cierre ni what-if.",
  "Riesgo = condición de evidencia, no causa. Gap != causa. missing != 0. reviewable != ahorro != cancelación aprobada.",
  "Action Register != historial de compromisos de cierre.",
  "DECISION_NEEDED: solo redacta preguntas a partir de los kinds tipados. No añadas kinds. No apruebes decisiones.",
  "Prohibido total financiero regional. Una planta no autorizada no existe en este pack.",
  "commitment_ref/scenario_ref/lesson_ref son nulos: MISSING_INFRASTRUCTURE / NOT_DEFENSIBLE.",
].join(" ");

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s+/g, "").toUpperCase();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthBounds(year, month) {
  const last = new Date(year, month, 0).getDate();
  return {
    start: `${toYyyyMm(year, month)}-01`,
    end: `${toYyyyMm(year, month)}-${pad2(last)}`,
  };
}

function priorYearMonth(year, month) {
  const idx = Number(year) * 12 + (Number(month) - 1) - 1;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

function isFinalCloseCue(q) {
  return (
    /\bcomo cerramos\b/.test(q) ||
    /\bcomo quedamos\b/.test(q) ||
    /\bcomo quedo\b/.test(q) ||
    /\bcerramos realmente\b/.test(q) ||
    (/\butil(idad)?\s+oper/.test(q) && /\breal/.test(q))
  );
}

function isWhatIfQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  return (
    /\bque pasa si\b/.test(q) ||
    /\bsi doy\b/.test(q) ||
    /\bsi quito\b/.test(q) ||
    /\bsi damos\b/.test(q) ||
    /\bwhat\s*if\b/.test(q) ||
    (/\b10 centavos\b/.test(q) && /\brecupero\b/.test(q))
  );
}

function isCommitmentHistoryQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  return (
    /\bque se comprometio\b/.test(q) ||
    /\bcompromiso de cierre\b/.test(q) ||
    /\bva por\s+\d/.test(q) ||
    /\bhistorial de compromisos\b/.test(q)
  );
}

function isPreCloseQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (isFinalCloseCue(q)) return false;
  if (/\bigf\b/.test(q) && !/\bjunta\b/.test(q) && !/\bprepar/.test(q) && !/\bpara cerrar\b/.test(q)) {
    return false;
  }
  if (/\b(zona\s+)?provincia\b/.test(q) && (/\bcierre\b/.test(q) || /\bjunta\b/.test(q) || /\bprepar/.test(q))) {
    return true;
  }
  if (/\bpre-?cierre\b/.test(q) || /\bprecierre\b/.test(q)) return true;
  if (/\bpara cerrar\b/.test(q)) return true;
  if (/\bplantas?\b/.test(q) && /\bpreocup/.test(q)) return true;
  if (/\bresolver\b/.test(q) && /\bjunta\b/.test(q)) return true;
  if (/\bpeor\b/.test(q) && (/\bcontra la meta\b/.test(q) || /\bmeta\b/.test(q))) return true;
  if (/\bdonde estamos peor\b/.test(q)) return true;
  if (
    (/\bjunta\b/.test(q) || /\bpre-?cierre\b/.test(q) || /\bprecierre\b/.test(q) || /\bcierre\b/.test(q)) &&
    /\bde\b/.test(q) &&
    !/\bde cierre\b/.test(q) &&
    !/\bde mes\b/.test(q) &&
    !/\bde la junta\b/.test(q)
  ) {
    return true;
  }
  return false;
}

function portfolioAuthzScope(auth) {
  const nombre = auth && (auth.actor_nombre || auth.rol_nombre);
  if (isDirectorZPForDashboard(auth && auth.role, nombre)) return "ALL_PLANTS";
  const role = dashboardAuthRoleNorm(auth);
  if (role === "AD") return "ALL_PLANTS";
  if (role === "GG") return "ASSIGNED_PLANTS";
  return "NONE";
}

function assignedPlantIds(auth) {
  return (auth && auth.plantas_permitidas ? auth.plantas_permitidas : [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function canAccessPlant(auth, plantaId) {
  const scope = portfolioAuthzScope(auth);
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (scope === "NONE") return false;
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA" || role === "GV") return false;
  if (scope === "ALL_PLANTS") return true;
  return assignedPlantIds(auth).includes(pid);
}

function wantsPortfolio(q) {
  return (
    /\b(zona\s+)?provincia\b/.test(q) ||
    /\bplantas\b/.test(q) ||
    /\bpara cerrar\b/.test(q) ||
    (/\bpeor\b/.test(q) && /\bmeta\b/.test(q)) ||
    (/\bresolver\b/.test(q) && /\bjunta\b/.test(q))
  );
}

function matchNamedPlant(q, plants) {
  const list = Array.isArray(plants) ? plants : [];
  const hits = [];
  for (const p of list) {
    const nombre = String(p.planta_nombre || p.nombre || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const clave = String(p.plant_code || p.clave || "")
      .trim()
      .toLowerCase();
    if (nombre && q.includes(nombre)) hits.push(p);
    else if (clave && clave.length >= 2 && new RegExp(`\\b${clave}\\b`, "i").test(q)) hits.push(p);
  }
  return hits.length === 1 ? hits[0] : null;
}

async function safeLoad(fn, ...args) {
  try {
    return await fn(...args);
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "TOOL_ERROR",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  }
}

function emptyPlant(plantaId) {
  return { planta_id: Number(plantaId) || null, planta_nombre: null, plant_code: null };
}

function pickNum(row, key) {
  if (!row) return null;
  const n = Number(row[key]);
  return Number.isFinite(n) ? n : null;
}

function discountPerKg(monto, kg) {
  if (monto == null || kg == null || !Number.isFinite(monto) || !Number.isFinite(kg) || kg <= 0) return null;
  return monto / kg;
}

function defaultListPortfolioPlantsSql() {
  return `
    SELECT p.id, p.nombre, p.clave
      FROM public.plantas p
      JOIN arr.provincia_plants ap
        ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
        OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
     WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
       AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
     ORDER BY p.id
  `;
}

async function defaultListPortfolioPlants(client) {
  if (!client || typeof client.query !== "function") return { rows: [], unavailable: true };
  try {
    const r = await client.query(defaultListPortfolioPlantsSql());
    return {
      rows: (r.rows || []).map((row) => ({
        planta_id: Number(row.id),
        planta_nombre: row.nombre || null,
        plant_code: row.clave || null,
      })),
      unavailable: false,
    };
  } catch (_e) {
    return { rows: [], unavailable: true };
  }
}

function filterAuthorizedPlants(plants, auth) {
  const out = [];
  const seen = new Set();
  for (const p of plants || []) {
    const pid = Number(p.planta_id || p.id);
    if (!Number.isFinite(pid) || pid <= 0 || seen.has(pid)) continue;
    if (!canAccessPlant(auth, pid)) continue;
    seen.add(pid);
    out.push({
      planta_id: pid,
      planta_nombre: p.planta_nombre || p.nombre || null,
      plant_code: p.plant_code || p.clave || null,
    });
  }
  return out;
}

function forbiddenKeysPresent(obj) {
  if (!obj || typeof obj !== "object") return [];
  const banned = [
    "proposed_intervention",
    "human_commitment",
    "closing_scenario",
    "what_if_result",
    "actual_financial",
    "regional_total",
    "regional_financial_total",
  ];
  return banned.filter((k) => Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null);
}

function deriveRisksAndGaps(block) {
  const risks = [];
  const gaps = [];
  const decisions = [];
  const pid = block.identity && block.identity.planta_id;
  const pname = (block.identity && block.identity.planta_nombre) || null;

  const current = block.current;
  const target = block.target;
  const forecast = block.base_forecast;
  const actions = block.actions;
  const reviewable = block.reviewable;

  const forecastVenta = forecast && forecast.status === "OK" ? forecast.fields.venta_ton : null;
  const targetVenta = target && target.status === "OK" ? target.venta_ton : null;
  const actualTon = current && current.status === "OK" ? current.venta_ton : null;
  const resultado = forecast && forecast.status === "OK" ? forecast.fields.resultado_final_importe : null;

  if (target && target.status === "TARGET_MISSING_FOR_PERIOD") {
    gaps.push({
      kind: "TARGET_MISSING_FOR_PERIOD",
      truth_class: "INFORMATION_GAP",
      plant_id: pid,
      statement: "No hay TARGET_COMMITMENT (igf_meta) para este YYYY-MM. Sin carry-forward. missing != 0.",
    });
    decisions.push({
      decision_kind: "TARGET_ABSENT",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["target.status=TARGET_MISSING_FOR_PERIOD"],
      question_seed: "¿Contra qué meta se conduce este mes en esta planta?",
    });
  }

  if (forecast && forecast.status === "FORECAST_MISSING_FOR_PERIOD") {
    gaps.push({
      kind: "FORECAST_MISSING_FOR_PERIOD",
      truth_class: "INFORMATION_GAP",
      plant_id: pid,
      statement: "No hay FORECAST IGF para este YYYY-MM. missing != 0.",
    });
  }

  if (current && current.status === "SOURCE_UNAVAILABLE") {
    gaps.push({
      kind: "SOURCE_UNAVAILABLE",
      truth_class: "INFORMATION_GAP",
      plant_id: pid,
      source: "ARR",
      statement: "ACTUAL_COMMERCIAL to-date no pudo establecerse. missing != 0.",
    });
  }

  if (
    forecastVenta != null &&
    targetVenta != null &&
    Number.isFinite(forecastVenta) &&
    Number.isFinite(targetVenta) &&
    forecastVenta < targetVenta
  ) {
    risks.push({
      risk_code: "FORECAST_BELOW_TARGET",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [
        `forecast.venta_ton=${forecastVenta}`,
        `target.venta_ton=${targetVenta}`,
      ],
      condition: "FORECAST venta_ton es menor que TARGET_COMMITMENT venta_ton del mismo YYYY-MM.",
    });
    decisions.push({
      decision_kind: "VOLUME_DEFENDABLE",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["FORECAST_BELOW_TARGET"],
      question_seed: "¿Qué supuesto de volumen hay que validar para el cierre?",
    });
  }

  if (resultado != null && Number.isFinite(resultado) && resultado < 0) {
    risks.push({
      risk_code: "FORECAST_RESULT_NEGATIVE",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [`forecast.resultado_final_importe=${resultado}`],
      condition: "FORECAST resultado_final_importe es negativo. No es ACTUAL_FINANCIAL.",
    });
    decisions.push({
      decision_kind: "FORECAST_NEGATIVE",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["FORECAST_RESULT_NEGATIVE"],
      question_seed: "¿Qué hay que resolver para el cierre de esta planta?",
    });
  }

  if (current && current.trend_direction === "DOWN") {
    risks.push({
      risk_code: "COMMERCIAL_DETERIORATION",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [`commercial_trend.ols.direction=DOWN`],
      condition: "La tendencia comercial 90d tiene direction=DOWN. Mover != causa.",
    });
  }

  const lost = (current && current.lost_clients) || [];
  if (lost.length) {
    const top = lost[0];
    risks.push({
      risk_code: "LOST_HIGH_VOLUME_CLIENT",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [`lost.cliente=${top.cliente_norm} kg_prior=${top.kg_prior}`],
      condition: "Cliente con kg del mes previo > 0 y kg to-date = 0. No afirma por qué se fue.",
    });
  }

  const overdue = actions && actions.status === "OK" ? Number(actions.overdue) || 0 : 0;
  if (overdue > 0) {
    risks.push({
      risk_code: "OVERDUE_ACTION",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [`actions.overdue=${overdue}`],
      condition: "Hay acciones vencidas en Action Register. Acción != compromiso de cierre.",
    });
    decisions.push({
      decision_kind: "ACTION_OWNER",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["OVERDUE_ACTION"],
      question_seed: "¿Qué acción vencida sigue abierta y quién la cierra?",
    });
  }

  if (
    actualTon != null &&
    forecastVenta != null &&
    Number.isFinite(actualTon) &&
    Number.isFinite(forecastVenta) &&
    forecastVenta > actualTon + 0.05
  ) {
    risks.push({
      risk_code: "REMAINING_FORECAST_DEPENDENCE",
      plant_id: pid,
      plant_name: pname,
      evidence_refs: [`forecast.venta_ton=${forecastVenta}`, `current.venta_ton=${actualTon}`],
      condition:
        "FORECAST venta_ton aún excede ACTUAL_COMMERCIAL to-date. No afirma que el remanente ocurrirá.",
    });
  }

  if (
    actualTon != null &&
    forecastVenta != null &&
    Number.isFinite(actualTon) &&
    Number.isFinite(forecastVenta) &&
    Math.abs(actualTon - forecastVenta) >= 0.05
  ) {
    gaps.push({
      kind: "ARR_VS_IGF_VENTA",
      truth_class: "RECONCILIATION_GAP",
      plant_id: pid,
      statement:
        "ACTUAL_COMMERCIAL venta_ton y FORECAST venta_ton difieren. Se conservan ambos. No se elige ganador.",
      evidence_refs: [`current.venta_ton=${actualTon}`, `forecast.venta_ton=${forecastVenta}`],
    });
    decisions.push({
      decision_kind: "RECONCILE_DISCREPANCY",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["ARR_VS_IGF_VENTA"],
      question_seed: "¿Qué discrepancia hay que reconciliar antes de usar el número?",
    });
  }

  if (reviewable && reviewable.status === "OK" && reviewable.has_reviewable) {
    decisions.push({
      decision_kind: "EXPENSE_STILL_OPEN",
      plant_id: pid,
      plant_name: pname,
      trigger_refs: ["reviewable.has_reviewable"],
      question_seed: "¿Qué apoyo reviewable sigue sin validar? reviewable != ahorro.",
    });
  }

  if (actions && actions.status === "SOURCE_UNAVAILABLE") {
    gaps.push({
      kind: "SOURCE_UNAVAILABLE",
      truth_class: "INFORMATION_GAP",
      plant_id: pid,
      source: "action_register",
      statement: "Action Register no pudo establecerse. missing != 0.",
    });
  }

  if (reviewable && reviewable.status === "SOURCE_UNAVAILABLE") {
    gaps.push({
      kind: "SOURCE_UNAVAILABLE",
      truth_class: "INFORMATION_GAP",
      plant_id: pid,
      source: "reviewable",
      statement: "Reviewable no pudo establecerse. missing != 0.",
    });
  }

  return { risks, gaps, decisions };
}

function portfolioFlagCounts(plants) {
  const counts = {
    plants_in_pack: plants.length,
    forecast_below_target: 0,
    forecast_result_negative: 0,
    missing_target: 0,
    overdue_actions: 0,
  };
  for (const p of plants) {
    if ((p.risks || []).some((r) => r.risk_code === "FORECAST_BELOW_TARGET")) counts.forecast_below_target += 1;
    if ((p.risks || []).some((r) => r.risk_code === "FORECAST_RESULT_NEGATIVE")) {
      counts.forecast_result_negative += 1;
    }
    if ((p.gaps || []).some((g) => g.kind === "TARGET_MISSING_FOR_PERIOD")) counts.missing_target += 1;
    if ((p.risks || []).some((r) => r.risk_code === "OVERDUE_ACTION")) counts.overdue_actions += 1;
  }
  return counts;
}

async function loadCurrentSection(input) {
  const { salesRows, priorSalesRows, discountRows, yyyymm, priorYm, plant, cutoffDate, trend } = input;
  if (salesRows === "error") {
    return {
      status: "SOURCE_UNAVAILABLE",
      truth_class: "ACTUAL_COMMERCIAL",
      source: "arr.ventas_diarias_cliente",
    };
  }
  const agg = aggregateSales(salesRows || [], yyyymm);
  const priorAgg = aggregateSales(priorSalesRows || [], priorYm);
  const clients = classifyClients(agg.byClient || new Map(), priorAgg.byClient || new Map(), plant.planta_id);
  const disc = aggregateDiscount(discountRows || [], yyyymm);
  const venta_kg = agg.kg;
  const venta_ton = venta_kg != null ? toTon(venta_kg) : null;
  let trend_direction = null;
  if (trend && trend.ok && trend.assembled) {
    const ols = (trend.assembled.both && trend.assembled.both.ols) || trend.assembled.ols || null;
    if (ols && ols.direction) trend_direction = ols.direction;
  }
  return {
    status: agg.seen ? "OK" : "OK",
    truth_class: "ACTUAL_COMMERCIAL",
    source: "arr.ventas_diarias_cliente",
    period: yyyymm,
    cutoff_date: cutoffDate || null,
    venta_kg,
    venta_ton,
    casa_kg: agg.casa_kg,
    comisionista_kg: agg.comisionista_kg,
    discount_monto: disc.monto,
    discount_per_kg: discountPerKg(disc.monto, venta_kg),
    lost_clients: (clients.lost || []).slice(0, 3).map((c) => ({
      cliente_norm: c.cliente_norm,
      kg_prior: c.kg_prior,
    })),
    top_negative_movers: (clients.top_negative_movers || []).slice(0, 3).map((c) => ({
      cliente_norm: c.cliente_norm,
      delta_kg: c.delta_kg,
    })),
    trend_direction,
    trend_window: trend_direction ? "90d" : null,
  };
}

function loadTargetSection(target, yyyymm) {
  if (target === "error") {
    return {
      status: "SOURCE_UNAVAILABLE",
      truth_class: "TARGET_COMMITMENT",
      source: "igf_meta.meta_lines",
      period: yyyymm,
    };
  }
  if (!target || target.venta_ton == null || !Number.isFinite(Number(target.venta_ton))) {
    return {
      status: "TARGET_MISSING_FOR_PERIOD",
      truth_class: "TARGET_COMMITMENT",
      source: "igf_meta.meta_lines",
      period: yyyymm,
      venta_ton: null,
    };
  }
  return {
    status: "OK",
    truth_class: "TARGET_COMMITMENT",
    source: "igf_meta.meta_lines",
    period: yyyymm,
    venta_ton: Number(target.venta_ton),
    version_id: target.version_id || null,
    version_number: target.version_number || null,
    empresa: target.empresa || null,
  };
}

function loadForecastSection(forecast, yyyymm) {
  if (forecast === "error") {
    return {
      status: "SOURCE_UNAVAILABLE",
      truth_class: "FORECAST",
      section_role: "BASE_FORECAST",
      label: "BASE_FORECAST",
      source: "igf.compromiso_lines",
      period: yyyymm,
    };
  }
  if (!forecast || forecast.missing || !forecast.row) {
    return {
      status: "FORECAST_MISSING_FOR_PERIOD",
      truth_class: "FORECAST",
      section_role: "BASE_FORECAST",
      label: "BASE_FORECAST",
      source: "igf.compromiso_lines",
      period: yyyymm,
    };
  }
  const fields = {};
  for (const key of FORECAST_FIELDS) {
    fields[key] = pickNum(forecast.row, key);
  }
  return {
    status: "OK",
    truth_class: "FORECAST",
    section_role: "BASE_FORECAST",
    label: "BASE_FORECAST",
    source: "igf.compromiso_lines",
    period: yyyymm,
    version_id: forecast.version_id || null,
    version_number: forecast.version_number || null,
    created_at_role: "upload_timestamp",
    fields,
  };
}

function loadActionsSection(raw, plant) {
  if (!raw || raw.ok === false) {
    return {
      status: raw && raw.abort ? "SOURCE_RESTRICTED" : "SOURCE_UNAVAILABLE",
      truth_class: "ACTION",
      source: "arr.action_register_items",
      plant_id: plant.planta_id,
    };
  }
  const summary = raw.summary || {};
  return {
    status: "OK",
    truth_class: "ACTION",
    source: "arr.action_register_items",
    plant_id: plant.planta_id,
    open: summary.open != null ? Number(summary.open) : null,
    overdue: summary.overdue != null ? Number(summary.overdue) : null,
    top_overdue: (raw.top_overdue || []).slice(0, 3).map((a) => ({
      titulo: a.titulo || null,
      responsable: a.responsable || null,
      dias_vencido: a.dias_vencido != null ? a.dias_vencido : null,
    })),
    note: "Action Register != commitment history",
  };
}

function loadReviewableSection(raw, plant) {
  if (!raw || raw.ok === false) {
    return {
      status: raw && raw.abort ? "SOURCE_RESTRICTED" : "SOURCE_UNAVAILABLE",
      truth_class: "REVIEWABLE",
      source: "igf_reviewable_supports",
      plant_id: plant.planta_id,
    };
  }
  const assembled = raw.assembled || raw;
  const folios = assembled.folios || assembled.reviewable_folios || assembled.items || assembled.reviewable || [];
  const count = Number(assembled.reviewable_count);
  const n = Number.isFinite(count) && count > 0 ? count : Array.isArray(folios) ? folios.length : 0;
  const has = Boolean(assembled.has_reviewable) || n > 0;
  return {
    status: "OK",
    truth_class: "REVIEWABLE",
    source: "igf_reviewable_supports",
    plant_id: plant.planta_id,
    has_reviewable: has,
    reviewable_count: n,
    note: "reviewable != saving != approved cancellation",
  };
}

async function loadOnePlantBlock(pool, req, plant, ctx) {
  const auth = ctx.auth;
  if (!canAccessPlant(auth, plant.planta_id)) {
    return null;
  }
  const limitations = [];
  if (portfolioAuthzScope(auth) !== "ALL_PLANTS") {
    const commercialAccess = assertClientProfileAccess(auth || {}, plant.planta_id);
    if (!commercialAccess.ok) limitations.push("CROSS_PLANT_SECTION_RESTRICTED");
  }

  const yyyymm = ctx.yyyymm;
  const priorYm = ctx.priorYm;
  const bounds = ctx.bounds;
  const priorBounds = ctx.priorBounds;

  let salesRows = ctx.salesRowsByPlant && ctx.salesRowsByPlant[plant.planta_id];
  let priorSalesRows = ctx.priorSalesRowsByPlant && ctx.priorSalesRowsByPlant[plant.planta_id];
  let discountRows = ctx.discountRowsByPlant && ctx.discountRowsByPlant[plant.planta_id];
  let cutoffDate = ctx.cutoffByPlant && ctx.cutoffByPlant[plant.planta_id];

  if (salesRows == null && typeof ctx.queryMonthlySales === "function" && ctx.db) {
    try {
      const resolveCodes = ctx.resolvePlantCodes || resolvePlantCodes;
      let codesUpper = ctx.plantCodesById && ctx.plantCodesById[plant.planta_id];
      if (!codesUpper && plant.planta_nombre) {
        const codes = await resolveCodes(ctx.db, plant.planta_nombre);
        codesUpper = (codes || []).map((c) => String(c).toUpperCase());
      }
      if (!codesUpper || !codesUpper.length) {
        limitations.push("sales_actual_unavailable");
        salesRows = [];
        priorSalesRows = [];
        discountRows = [];
      } else {
        const cur = await ctx.queryMonthlySales(ctx.db, codesUpper, bounds.start, bounds.end, "ambos");
        const pri = await ctx.queryMonthlySales(ctx.db, codesUpper, priorBounds.start, priorBounds.end, "ambos");
        salesRows = (cur && cur.rows) || [];
        priorSalesRows = (pri && pri.rows) || [];
        if (typeof ctx.queryMonthlyDiscount === "function") {
          const d = await ctx.queryMonthlyDiscount(ctx.db, codesUpper, bounds.start, bounds.end, "ambos");
          discountRows = (d && d.rows) || [];
        } else {
          discountRows = [];
        }
        if (typeof ctx.queryCutoff === "function") {
          cutoffDate = await ctx.queryCutoff(ctx.db, codesUpper, bounds.start, bounds.end);
        }
      }
    } catch (_e) {
      salesRows = "error";
      priorSalesRows = [];
      discountRows = [];
    }
  } else if (salesRows == null) {
    salesRows = [];
    priorSalesRows = priorSalesRows || [];
    discountRows = discountRows || [];
    limitations.push("sales_actual_unavailable");
  }

  let target = ctx.targetByPlant && ctx.targetByPlant[plant.planta_id];
  if (target === undefined && ctx.db && typeof ctx.loadTarget !== "function") {
    try {
      const existsFn = ctx.schemaMetaExists || schemaMetaExists;
      const okSchema = await existsFn(ctx.db);
      if (!okSchema) {
        target = null;
        limitations.push("target_schema_unavailable");
      } else {
        const versions = await (ctx.listMetaVersions || listMetaVersions)(ctx.db, ctx.year, ctx.month);
        const current = pickCurrentMetaVersion(versions);
        if (!current) {
          target = null;
        } else {
          const pack = await (ctx.loadMetaLinesForVersion || loadMetaLinesForVersion)(
            ctx.db,
            ctx.year,
            ctx.month,
            current.version_number
          );
          const row = pack
            ? pickMetaRowForPlant(pack.lines, plant.plant_code, plant.planta_nombre, findIgfRowForPlant)
            : null;
          target = row
            ? {
                version_id: pack.version_id,
                version_number: pack.version_number,
                empresa: row.empresa,
                venta_ton: row.venta_ton,
              }
            : null;
        }
      }
    } catch (_e) {
      target = "error";
    }
  } else if (typeof ctx.loadTarget === "function" && target === undefined) {
    target = await ctx.loadTarget({ year: ctx.year, month: ctx.month, plant });
  }

  let forecast = ctx.forecastByPlant && ctx.forecastByPlant[plant.planta_id];
  if (forecast === undefined && typeof ctx.loadForecast === "function") {
    forecast = await ctx.loadForecast({ year: ctx.year, month: ctx.month, plant });
  } else if (forecast === undefined && ctx.db) {
    try {
      const snap = await (ctx.loadIgfCommitSnapshot || loadIgfCommitSnapshot)(
        ctx.db,
        ctx.year,
        ctx.month,
        plant.plant_code,
        plant.planta_nombre
      );
      forecast = !snap || !snap.row ? { missing: true } : { version_id: snap.version_id, version_number: snap.version_number, row: snap.row };
    } catch (_e) {
      forecast = "error";
    }
  } else if (forecast === undefined) {
    forecast = { missing: true };
  }

  const actionsRaw = await safeLoad(ctx.loadActions || defaultLoadActions, pool, plant.planta_id, req, {
    auth,
    board: ctx.actionBoardByPlant && ctx.actionBoardByPlant[plant.planta_id],
    asOf: ctx.actionAsOf,
    ensureActionRegisterTables: ctx.ensureActionRegisterTables,
  });

  const supportsRaw = await safeLoad(ctx.loadSupports || loadIgfReviewableSupportsForChat, pool, plant.planta_id, req, {
    question: "apoyos reviewable",
    nowYearMonth: { year: ctx.year, month: ctx.month },
    auth,
    resolvePlanta: ctx.resolvePlanta,
  });

  let trend = null;
  if (ctx.trendByPlant && ctx.trendByPlant[plant.planta_id] !== undefined) {
    trend = ctx.trendByPlant[plant.planta_id];
  } else if (ctx.loadTrend) {
    trend = await safeLoad(ctx.loadTrend, pool, plant.planta_id, req, {
      question: "como vamos en casa y comisionistas los ultimos 3 meses",
      range_days: 90,
      channel: "both",
      compare: true,
      now: ctx.now,
      auth,
    });
  } else if (ctx.skipTrend) {
    trend = null;
  } else {
    trend = await safeLoad(loadCommercialTrendForChat, pool, plant.planta_id, req, {
      question: "como vamos en casa y comisionistas los ultimos 3 meses",
      range_days: 90,
      channel: "both",
      compare: true,
      now: ctx.now,
      auth,
    });
  }

  const current = await loadCurrentSection({
    salesRows,
    priorSalesRows,
    discountRows,
    yyyymm,
    priorYm,
    plant,
    cutoffDate: cutoffDate || ctx.defaultCutoff || null,
    trend,
  });
  const targetSec = loadTargetSection(target, yyyymm);
  const forecastSec = loadForecastSection(forecast, yyyymm);
  const actionsSec = loadActionsSection(actionsRaw, plant);
  const reviewableSec = loadReviewableSection(supportsRaw, plant);

  const block = {
    identity: {
      planta_id: plant.planta_id,
      planta_nombre: plant.planta_nombre,
      plant_code: plant.plant_code,
    },
    current,
    target: targetSec,
    base_forecast: forecastSec,
    actions: actionsSec,
    reviewable: reviewableSec,
    provenance: {
      current: { source: current.source, truth_class: "ACTUAL_COMMERCIAL", period: yyyymm, cutoff: current.cutoff_date },
      target: { source: targetSec.source, truth_class: "TARGET_COMMITMENT", period: yyyymm },
      base_forecast: {
        source: forecastSec.source,
        truth_class: "FORECAST",
        section_role: "BASE_FORECAST",
        period: yyyymm,
        version_id: forecastSec.version_id || null,
        created_at_role: "upload_timestamp",
      },
      actions: { source: actionsSec.source, truth_class: "ACTION" },
      reviewable: { source: reviewableSec.source, truth_class: "REVIEWABLE" },
      requery: true,
    },
    limitations,
  };
  const derived = deriveRisksAndGaps(block);
  block.risks = derived.risks;
  block.gaps = derived.gaps;
  block.decision_needed = derived.decisions;
  return block;
}

async function composeExecutiveCycle(pool, requestPlantaId, req, opts = {}) {
  const cycle_mode = opts.cycle_mode || CYCLE_MODE;
  if (cycle_mode !== CYCLE_MODE) {
    return {
      ok: false,
      abort: true,
      status: 400,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: "cycle_mode no soportado en este slice",
    };
  }

  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const now = opts.now || new Date();
  const open = opts.openYearMonth || cdmxTodayParts(now);
  const year = Number(open.year);
  const month = Number(open.month);
  const yyyymm = toYyyyMm(year, month);
  const prior = priorYearMonth(year, month);
  const question = opts.question != null ? String(opts.question) : "";
  const q = normalizeQuestion(question);
  const scopeAuthz = portfolioAuthzScope(auth);

  if (scopeAuthz === "NONE") {
    return {
      ok: false,
      abort: true,
      status: 403,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: "Sin acceso a PRE_CLOSE",
    };
  }

  let client = opts.client || null;
  const acquire = async () => {
    if (client) return client;
    if (opts.injected && (!pool || typeof pool.connect !== "function")) return null;
    if (!pool || typeof pool.connect !== "function") return null;
    client = await pool.connect();
    return client;
  };

  try {
    const db = await acquire();
    let listed = { rows: [], unavailable: false };
    if (typeof opts.listPortfolioPlants === "function") {
      listed = await opts.listPortfolioPlants(db, auth);
      if (Array.isArray(listed)) listed = { rows: listed, unavailable: false };
    } else if (db) {
      listed = await defaultListPortfolioPlants(db);
    } else {
      listed = { rows: opts.portfolioPlants || [], unavailable: !opts.portfolioPlants };
    }

    const authorizedCatalog = filterAuthorizedPlants(listed.rows || [], auth);
    const named = matchNamedPlant(q, authorizedCatalog);
    let portfolio_scope = "ONE_PLANT";
    let selected = [];

    if (named && !wantsPortfolio(q)) {
      portfolio_scope = "ONE_PLANT";
      selected = [named];
    } else if (wantsPortfolio(q) || opts.forcePortfolio) {
      portfolio_scope = "PORTFOLIO";
      selected = authorizedCatalog.slice();
    } else {
      const reqId = Number(requestPlantaId);
      const fromCatalog = authorizedCatalog.find((p) => p.planta_id === reqId);
      if (fromCatalog) {
        selected = [fromCatalog];
      } else if (canAccessPlant(auth, reqId)) {
        selected = [
          {
            planta_id: reqId,
            planta_nombre: opts.requestPlantNombre || null,
            plant_code: opts.requestPlantCode || null,
          },
        ];
      } else {
        return {
          ok: false,
          abort: true,
          status: 403,
          code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
          error: "Sin acceso a esta planta",
        };
      }
    }

    selected = filterAuthorizedPlants(selected, auth);
    if (!selected.length) {
      return {
        ok: false,
        abort: true,
        status: 403,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        error: "Ninguna planta autorizada para PRE_CLOSE",
      };
    }

    const limitations = [];
    if (listed.unavailable && portfolio_scope === "PORTFOLIO") {
      limitations.push("ZONE_MEMBERSHIP_UNAVAILABLE");
    }
    limitations.push("ACTUAL_FINANCIAL_EXCLUDED_PRE_CLOSE");
    limitations.push("COMMITMENT_HISTORY_MISSING");
    limitations.push("SCENARIO_HISTORY_NOT_DEFENSIBLE");
    limitations.push("WHAT_IF_UNSUPPORTED");
    limitations.push("NO_REGIONAL_FINANCIAL_TOTAL");
    limitations.push("CHANNEL_DATA_QUALITY_UNSUPPORTED");
    if (isWhatIfQuestion(question)) limitations.push("WHAT_IF_QUESTION_UNSUPPORTED");
    if (isCommitmentHistoryQuestion(question)) limitations.push("COMMITMENT_HISTORY_QUESTION_UNSUPPORTED");

    const ctx = {
      auth,
      now,
      year,
      month,
      yyyymm,
      priorYm: toYyyyMm(prior.year, prior.month),
      bounds: monthBounds(year, month),
      priorBounds: monthBounds(prior.year, prior.month),
      db,
      queryMonthlySales: opts.queryMonthlySales || queryMonthlySales,
      queryMonthlyDiscount: opts.queryMonthlyDiscount || queryMonthlyDiscount,
      queryCutoff: opts.queryCutoff,
      resolvePlantCodes: opts.resolvePlantCodes,
      plantCodesById: opts.plantCodesById || {},
      salesRowsByPlant: opts.salesRowsByPlant || {},
      priorSalesRowsByPlant: opts.priorSalesRowsByPlant || {},
      discountRowsByPlant: opts.discountRowsByPlant || {},
      cutoffByPlant: opts.cutoffByPlant || {},
      defaultCutoff: opts.defaultCutoff || null,
      targetByPlant: opts.targetByPlant || {},
      forecastByPlant: opts.forecastByPlant || {},
      loadTarget: opts.loadTarget,
      loadForecast: opts.loadForecast,
      loadIgfCommitSnapshot: opts.loadIgfCommitSnapshot,
      schemaMetaExists: opts.schemaMetaExists,
      listMetaVersions: opts.listMetaVersions,
      loadMetaLinesForVersion: opts.loadMetaLinesForVersion,
      loadActions: opts.loadActions,
      loadSupports: opts.loadSupports,
      loadTrend: opts.loadTrend,
      skipTrend: opts.skipTrend === true,
      trendByPlant: opts.trendByPlant || {},
      actionBoardByPlant: opts.actionBoardByPlant || {},
      actionAsOf: opts.actionAsOf,
      ensureActionRegisterTables: opts.ensureActionRegisterTables,
      resolvePlanta: opts.resolvePlanta,
    };

    const plants = [];
    for (const plant of selected) {
      const block = await loadOnePlantBlock(pool, req, plant, ctx);
      if (block) plants.push(block);
    }

    if (!plants.length) {
      return {
        ok: false,
        abort: true,
        status: 403,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        error: "Ninguna planta autorizada para PRE_CLOSE",
      };
    }

    const pack = {
      ok: true,
      abort: false,
      semantic_class: SEMANTIC_CLASS,
      cycle_mode: CYCLE_MODE,
      portfolio_scope,
      year,
      month,
      period: yyyymm,
      cutoff: opts.defaultCutoff || (plants[0].current && plants[0].current.cutoff_date) || null,
      generated_at: new Date(now).toISOString(),
      requested_plant_id: Number(requestPlantaId) || null,
      authorized_plant_ids: plants.map((p) => p.identity.planta_id),
      plants,
      portfolio_counts: portfolioFlagCounts(plants),
      commitment_ref: null,
      scenario_ref: null,
      lesson_ref: null,
      council_runtime: false,
      live_copilot_runtime: false,
      future_chain: FUTURE_CHAIN.slice(),
      requery: true,
      limitations,
      provenance: {
        cycle_mode: CYCLE_MODE,
        period: yyyymm,
        requery: true,
        created_at_role: "pack_generated_at_not_business_as_of",
      },
    };

    const leaked = forbiddenKeysPresent(pack);
    if (leaked.length) {
      return {
        ok: false,
        abort: true,
        status: 500,
        code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
        error: "PRE_CLOSE pack contained forbidden keys",
      };
    }

    pack.pending_information_gap = {
      missing_fields: plants
        .flatMap((p) => (p.gaps || []).map((g) => g.kind))
        .filter(Boolean)
        .slice(0, 16),
      why_blocks: "Un hueco dice que falta evidencia. No afirma causa ni inventa el dato.",
      physical_source: null,
      physical_person: null,
    };
    return pack;
  } finally {
    if (client && !opts.client && typeof client.release === "function") client.release();
  }
}

function formatPreCloseContext(assembled) {
  const lines = [
    `BLOQUE PRE_CLOSE cycle_mode=${assembled.cycle_mode} period=${assembled.period} scope=${assembled.portfolio_scope}`,
    `cutoff=${assembled.cutoff || "null"} requery=${assembled.requery === true}`,
    "current=ACTUAL_COMMERCIAL to-date | target=TARGET_COMMITMENT | base_forecast=FORECAST (BASE_FORECAST role)",
    "No ACTUAL_FINANCIAL. No commitment. No scenario. No what-if. No total regional.",
    `commitment_ref=null scenario_ref=null lesson_ref=null council_runtime=false live_copilot_runtime=false`,
    `future_chain=${(assembled.future_chain || []).join(">")}`,
    `authorized_plant_ids=${(assembled.authorized_plant_ids || []).join(",")}`,
    `portfolio_counts=${JSON.stringify(assembled.portfolio_counts || {})}`,
    `limitations=${(assembled.limitations || []).join(" | ")}`,
    "",
  ];
  for (const p of assembled.plants || []) {
    const id = p.identity || {};
    lines.push(`--- PLANTA id=${id.planta_id} name=${id.planta_nombre || "null"} code=${id.plant_code || "null"}`);
    const c = p.current || {};
    lines.push(
      `CURRENT truth=${c.truth_class} status=${c.status} venta_ton=${c.venta_ton} venta_kg=${c.venta_kg} cutoff=${c.cutoff_date} casa_kg=${c.casa_kg} comi_kg=${c.comisionista_kg} desc_kg=${c.discount_per_kg} trend=${c.trend_direction}`
    );
    const t = p.target || {};
    lines.push(
      `TARGET truth=${t.truth_class} status=${t.status} venta_ton=${t.venta_ton} version=${t.version_number} (no carry-forward)`
    );
    const f = p.base_forecast || {};
    const fields = f.fields || {};
    lines.push(
      `BASE_FORECAST truth=${f.truth_class} role=${f.section_role} label=${f.label} status=${f.status} venta_ton=${fields.venta_ton} resultado_final_importe=${fields.resultado_final_importe} hg_kg=${fields.hg_kg} margen_kg=${fields.margen_kg} gasto_kg=${fields.gasto_kg} created_at_role=${f.created_at_role}`
    );
    lines.push("  FORECAST != actual != final != commitment != scenario");
    const a = p.actions || {};
    lines.push(`ACTIONS truth=${a.truth_class} status=${a.status} open=${a.open} overdue=${a.overdue} != commitment`);
    const r = p.reviewable || {};
    lines.push(
      `REVIEWABLE truth=${r.truth_class} status=${r.status} has=${r.has_reviewable} count=${r.reviewable_count} != saving`
    );
    for (const risk of p.risks || []) {
      lines.push(
        `RISK code=${risk.risk_code} plant=${risk.plant_id} condition=${risk.condition} refs=${(risk.evidence_refs || []).join(";")}`
      );
    }
    for (const g of p.gaps || []) {
      lines.push(`GAP kind=${g.kind} class=${g.truth_class} plant=${g.plant_id} ${g.statement}`);
    }
    for (const d of p.decision_needed || []) {
      lines.push(
        `DECISION_NEEDED kind=${d.decision_kind} plant=${d.plant_id} seed=${d.question_seed} triggers=${(d.trigger_refs || []).join(",")}`
      );
    }
    lines.push("");
  }
  lines.push("GPT: redacta solo las DECISION_NEEDED tipadas. No inventes intervención, compromiso, escenario ni what-if.");
  return lines.join("\n");
}

function buildPreClosePrompt(assembled, question) {
  return {
    systemPrompt: SYSTEM_ADDENDUM,
    userContent: `${formatPreCloseContext(assembled)}\n\nPregunta: ${question || ""}`,
  };
}

function buildPreCloseChatResult(assembled, extra) {
  return {
    ok: true,
    answer: extra.answer,
    planta_id: extra.planta_id,
    openai_called: extra.openai_called === true,
    context_meta: {
      semantic_class: SEMANTIC_CLASS,
      cycle_mode: CYCLE_MODE,
      period: assembled.period,
      portfolio_scope: assembled.portfolio_scope,
      authorized_plant_ids: assembled.authorized_plant_ids,
      requery: true,
      meeting_pack_not_persisted: true,
    },
  };
}

module.exports = {
  CYCLE_MODE,
  SEMANTIC_CLASS,
  SYSTEM_ADDENDUM,
  FUTURE_CHAIN,
  isPreCloseQuestion,
  isWhatIfQuestion,
  isCommitmentHistoryQuestion,
  portfolioAuthzScope,
  canAccessPlant,
  filterAuthorizedPlants,
  composeExecutiveCycle,
  formatPreCloseContext,
  buildPreClosePrompt,
  buildPreCloseChatResult,
  deriveRisksAndGaps,
  forbiddenKeysPresent,
  normalizeQuestion,
};
