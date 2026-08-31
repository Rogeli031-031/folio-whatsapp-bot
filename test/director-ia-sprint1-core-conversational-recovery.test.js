"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  NEED_TYPES,
  AVAILABILITY,
  isExecutiveStatusQuestion,
  isSpecializedStandaloneQuestion,
  isPlantLevelExecutiveFinancialQuestion,
  shouldHandleExecutiveStatus,
  resolveExecutiveNeed,
  resolveSemanticScope,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
} = require("../lib/director-ia-conversational-executive-layer");
const {
  isClientProfileQuestion,
  isPlantWideMonthlyFinancialQuestion,
  queryMonthlyDiscount,
} = require("../lib/director-ia-client-profile");
const {
  isCommercialTrendQuestion,
  resolveCommercialTrendSlots,
  namesCalendarMonth,
  formatCommercialTrendContext,
} = require("../lib/director-ia-commercial-trend");
const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  loadDashboardForecastParity,
  parseYearMonth,
  aggregateCasaComiFromClientesMes,
  dashboardDescSigned,
  readIgfForecastMiniAuthoritative,
} = require("../lib/director-ia-dashboard-forecast-adapter");

const ROOT = path.join(__dirname, "..");
const CLIENT_PROFILE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-client-profile.js"), "utf8");
const DASHBOARD_FORECAST_SRC = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const ADAPTER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-dashboard-forecast-adapter.js"), "utf8");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const CATALOG = [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }];

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembleOk(over = {}) {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: {
      period: { kind: "snapshot", as_of: "2026-08-23" },
      payload: { summary: { open: 3, closed: 1, overdue: 1 }, top_overdue: [], responsables: [] },
    },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [], limit: 8 } },
    bitacoraRaw: {
      period: { kind: "bitacora_window", months: 3, from: "2026-06" },
      payload: { sessions: [] },
    },
    arrRaw: { venta_ton: 1212, desc_kg: 1.85, load_error: null },
    igfRaw: {
      version_id: 12,
      row: { empresa: "E3" },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", line_label: "Venta", value: 1536.54, unit: "ton" },
          { line_key: "com_desc_kg", line_label: "Com. y Desc.", value: 1.72, unit: "$/kg" },
          { line_key: "util_oper_importe", line_label: "Util. operación", value: 420000, unit: "MXN" },
          { line_key: "resultado_final_importe", line_label: "Resultado", value: 310000, unit: "MXN" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07", year: 2026, month: 7 },
      payload: { materialized: true, counts: { dejaron: 0 }, clients_shown: [] },
    },
    ...over,
  });
}

function packFor(question, over = {}) {
  return buildExecutiveStatusPack({
    assembled: assembleOk(),
    trend: {
      ok: true,
      range_start: "2026-07-24",
      range_end: "2026-08-23",
      compare: true,
      channels: {
        casa: { channel: "casa", ols: { direction: "UP" }, range_start: "2026-07-24", range_end: "2026-08-23" },
        comisionista: {
          channel: "comisionista",
          ols: { direction: "DOWN" },
          range_start: "2026-07-24",
          range_end: "2026-08-23",
        },
      },
    },
    scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
    forecastParity: {
      ok: true,
      reachable: true,
      period: { year: 2026, month: 8, yyyy_mm: "2026-08" },
      forecast: { venta_ton: 1212, desc_kg: 1.85, truth_semantics: "FORECAST_PROJECTION" },
      actual_to_date: { venta_ton: 880.4, truth_semantics: "ACTUAL_TO_DATE" },
      mini: {
        util_oper_importe: 420000,
        resultado_final_importe: 310000,
        source: "GET /api/dashboard/igf-forecast include_mini → mini.rows[]",
      },
    },
    ...over,
  });
}

function itemByMetric(pack, metric) {
  return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
}

describe("SPRINT1 Golden Set — routing", () => {
  it("Q1 cómo vamos → CEL EXECUTIVE_STATUS, planner unknown/plant_diagnosis cede", () => {
    const need = resolveExecutiveNeed(Q1);
    const planned = planDirectorIaQuestion(Q1);
    assert.equal(isExecutiveStatusQuestion(Q1), true);
    assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS);
    assert.notEqual(need.specialized, true);
    assert.ok(["unknown", "plant_diagnosis"].includes(planned.intent), planned.intent);
    assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true);
  });

  it("Q2 rentabilidad planta-mes → CEL, no client_profile, no financial_actual", () => {
    const need = resolveExecutiveNeed(Q2);
    const planned = planDirectorIaQuestion(Q2);
    assert.equal(isPlantLevelExecutiveFinancialQuestion(Q2), true);
    assert.equal(isClientProfileQuestion(Q2), false);
    assert.equal(isSpecializedStandaloneQuestion(Q2), false);
    assert.equal(isExecutiveStatusQuestion(Q2), true);
    assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS);
    assert.ok(["unknown", "plant_diagnosis"].includes(planned.intent), planned.intent);
    assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true);
    assert.notEqual(planned.intent, "client_profile");
    assert.notEqual(planned.intent, "financial_diagnosis");
  });

  it("Q3 descuento planta-mes → CEL, no client_profile (no ruta d.canal)", () => {
    assert.equal(isPlantWideMonthlyFinancialQuestion("como va el descuento de acapulco este mes"), true);
    assert.equal(isClientProfileQuestion(Q3), false);
    assert.equal(isSpecializedStandaloneQuestion(Q3), false);
    assert.equal(isExecutiveStatusQuestion(Q3), true);
    const planned = planDirectorIaQuestion(Q3);
    assert.notEqual(planned.intent, "client_profile");
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q3), {}, planned.intent), true);
  });

  it("Q4 CASA y Comisionista → commercial_trend especializado, CEL no secuestra", () => {
    assert.equal(isCommercialTrendQuestion(Q4), true);
    assert.equal(isSpecializedStandaloneQuestion(Q4), true);
    assert.equal(isExecutiveStatusQuestion(Q4), false);
    const planned = planDirectorIaQuestion(Q4);
    assert.equal(planned.intent, "commercial_trend");
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q4), {}, planned.intent), false);
    assert.equal(namesCalendarMonth("como van casa y comisionista en acapulco este mes"), true);
    const slots = resolveCommercialTrendSlots(Q4);
    assert.equal(slots.period_kind, "calendar_month");
    assert.equal(slots.range_days, null);
    assert.equal(slots.channel, "both");
    const trailing = resolveCommercialTrendSlots("¿Cómo van CASA y Comisionista los últimos 30 días?");
    assert.equal(trailing.period_kind, "trailing");
    assert.equal(trailing.range_days, 30);
  });
});

describe("SPRINT1 Golden Set — planta / periodo / verdad / campos", () => {
  it("scope explícito resuelve planta del catálogo, no hardcode de cifras", () => {
    const scope = resolveSemanticScope(Q2, {
      ui_planta_id: 1,
      ui_plant_label: "Acapulco",
      plant_catalog: CATALOG,
      auth: { role: "ZP" },
    });
    assert.equal(scope.action, "RESOLVED");
    assert.equal(scope.planta_id, 1);
    assert.equal(scope.plant_name, "Acapulco");
    assert.doesNotMatch(ADAPTER_SRC, /Acapulco/);
    assert.doesNotMatch(ADAPTER_SRC, /1212|880\.4|420000/);
  });

  it("Q1 pack dispone venta al corte, forecast, desc, util, resultado, tendencias", () => {
    const pack = packFor(Q1);
    const actual = itemByMetric(pack, "venta_ton") && pack.items.find((i) => i.truth_semantics === "ACTUAL_TO_DATE");
    const forecast = pack.items.find((i) => i.source === "arr.proyeccion_planta");
    const util = itemByMetric(pack, "util_oper_importe");
    const resultado = itemByMetric(pack, "resultado_final_importe");
    const descStored = itemByMetric(pack, "com_desc_kg");
    const trend = pack.items.find((i) => i.slot === "TREND");
    assert.equal(actual.truth_semantics, "ACTUAL_TO_DATE");
    assert.equal(actual.payload.venta_ton, 880.4);
    assert.equal(forecast.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(forecast.payload.venta_ton, 1212);
    assert.equal(forecast.payload.desc_kg, 1.85);
    assert.equal(util.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(util.payload.util_oper_importe, 420000);
    assert.equal(resultado.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(resultado.payload.resultado_final_importe, 310000);
    assert.equal(descStored.payload.com_desc_kg, 1.72);
    assert.equal(trend.truth_semantics, "OLS_PER_CHANNEL");
    assert.ok(trend.payload.casa);
    assert.ok(trend.payload.comisionista);
    assert.notEqual(trend.payload.casa.direction, trend.payload.comisionista.direction);
    const target = pack.items.find((i) => i.slot === "TARGET_COMMITMENT");
    assert.equal(target.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(target.truth_semantics, "TARGET");
  });

  it("Q2 pack expone rentabilidad stored y no la etiqueta actual/TARGET", () => {
    const pack = packFor(Q2);
    const resultado = itemByMetric(pack, "resultado_final_importe");
    const util = itemByMetric(pack, "util_oper_importe");
    assert.equal(resultado.period, "2026-08");
    assert.equal(resultado.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(util.truth_semantics, "FORECAST_PROJECTION");
    const prompt = buildExecutiveStatusPrompt(pack, Q2);
    assert.match(prompt.userContent, /resultado_final_importe=310000/);
    assert.match(prompt.userContent, /utilOperImporte|Utilidad operativa 420000/);
    assert.match(prompt.userContent, /rentabilidad/);
    assert.match(prompt.userContent, /No infieras TARGET/);
    assert.equal(pack.demand.actual_financial, AVAILABILITY.NOT_APPLICABLE);
  });

  it("Q3 pack expone descuento forecast y stored; ausencia no es 0", () => {
    const pack = packFor(Q3);
    const forecast = pack.items.find((i) => i.source === "arr.proyeccion_planta");
    const descStored = itemByMetric(pack, "com_desc_kg");
    assert.equal(forecast.payload.desc_kg, 1.85);
    assert.equal(forecast.truth_semantics, "FORECAST_PROJECTION");
    assert.equal(descStored.truth_semantics, "FORECAST_STORED");
    const missing = buildExecutiveStatusPack({
      assembled: assembleOk({ arrRaw: { venta_ton: null, desc_kg: null }, igfRaw: { version_id: 12, composition: { ok: true, lines: [] } } }),
      trend: null,
      scope: { planta_id: 1, plant_name: "Acapulco" },
      forecastParity: { reachable: false, actual_to_date: { venta_ton: null }, forecast: { venta_ton: null, desc_kg: null } },
    });
    const missingForecast = missing.items.find((i) => i.source === "arr.proyeccion_planta");
    const missingDesc = missing.items.find((i) => i.payload && i.payload.metric === "com_desc_kg");
    assert.equal(missingForecast.payload.desc_kg, null);
    assert.notEqual(missingForecast.payload.desc_kg, 0);
    assert.equal(missingDesc.availability, AVAILABILITY.UNAVAILABLE);
    const prompt = buildExecutiveStatusPrompt(pack, Q3);
    assert.match(prompt.userContent, /descuento/);
    assert.match(prompt.userContent, /desc_kg=1\.85/);
  });

  it("periodos: actual al corte ≠ forecast ≠ TARGET", () => {
    const pack = packFor(Q1);
    const labels = pack.items
      .filter((i) => i.slot === "MAGNITUDE")
      .map((i) => i.truth_semantics);
    assert.ok(labels.includes("ACTUAL_TO_DATE"));
    assert.ok(labels.includes("FORECAST_PROJECTION"));
    assert.ok(labels.includes("FORECAST_STORED"));
    assert.equal(labels.includes("TARGET"), false);
    assert.equal(labels.includes("ACTUAL_FINANCIAL"), false);
  });
});

describe("SPRINT1 — paridad Dashboard y bug d.canal", () => {
  it("adaptador reutiliza helpers Dashboard y no recalcula", () => {
    assert.match(ADAPTER_SRC, /computePronosticoProyByPlant/);
    assert.match(ADAPTER_SRC, /getVentaRealTonProvinciaByPlant/);
    assert.match(ADAPTER_SRC, /resolveProyFromPlantMap/);
    assert.doesNotMatch(ADAPTER_SRC, /generarDashboardArrForecast/);
    assert.match(DASHBOARD_FORECAST_SRC, /function computePronosticoProyByPlant/);
  });

  it("queryMonthlyDiscount ya no lee d.canal / d.subcanal", () => {
    const fn = queryMonthlyDiscount.toString();
    assert.doesNotMatch(fn, /d\.canal/);
    assert.doesNotMatch(fn, /d\.subcanal/);
    assert.doesNotMatch(CLIENT_PROFILE_SRC, /COALESCE\(cat\.canal,\s*d\.canal/);
    assert.match(fn, /COALESCE\(cat\.canal,\s*'Casa'\)/);
  });

  it("Q4 este mes agrega CASA/COMI de tabla ARR, no trailing 30d", () => {
    const openMonth = aggregateCasaComiFromClientesMes({
      historico: false,
      rows: [
        { categoria: "Casa", kg: 10000, kgProy: 20000 },
        { categoria: "Comisionista", kg: 4000, kgProy: 8000 },
      ],
    });
    assert.equal(openMonth.casa_ton, 20);
    assert.equal(openMonth.comisionista_ton, 8);
    const closed = aggregateCasaComiFromClientesMes({
      historico: true,
      rows: [
        { categoria: "Casa", kg: 10000, kgProy: 20000 },
        { categoria: "Comisionista", kg: 4000, kgProy: 8000 },
      ],
    });
    assert.equal(closed.casa_ton, 10);
    assert.equal(closed.comisionista_ton, 4);
    const ctx = formatCommercialTrendContext({
      plant: plant(),
      range_days: null,
      period_kind: "calendar_month",
      channel: "both",
      compare: true,
      channels: {
        casa: {
          period_kind: "calendar_month",
          period: "2026-08",
          venta_ton: 20,
          truth_semantics: "FORECAST_PROJECTION",
        },
        comisionista: {
          period_kind: "calendar_month",
          period: "2026-08",
          venta_ton: 8,
          truth_semantics: "FORECAST_PROJECTION",
        },
      },
      limitations: ["calendar_month_not_trailing_30d", "ols_not_applicable_to_calendar_month"],
    });
    assert.match(ctx, /period_kind=calendar_month/);
    assert.match(ctx, /NO trailing 30d/);
    assert.doesNotMatch(ctx, /trailing; ancla MAX\(fecha\)/);
  });

  it("util/resultado salen del mini IGF, no de stored ni recalcularUtilYResultado", () => {
    const missingEco = packFor(Q2, { forecastParity: { reachable: true, mini: {} } });
    const utilMissing = missingEco.items.find((i) => i.payload && i.payload.metric === "util_oper_importe");
    assert.equal(utilMissing.availability, AVAILABILITY.UNAVAILABLE);
    assert.notEqual(utilMissing.payload.util_oper_importe, 0);
    assert.equal(utilMissing.source, "igf-forecast-mini.utilOperImporte");
    assert.doesNotMatch(ADAPTER_SRC, /recalcularUtilYResultado/);
    assert.equal(utilMissing.source, "igf-forecast-mini.utilOperImporte");
  });

  it("adaptador sin pool no inventa 0", async () => {
    const empty = await loadDashboardForecastParity(null, {
      assembled: { requested_period: { igf_arr_yyyy_mm: "2026-08" }, plant: plant() },
    });
    assert.equal(empty.forecast.venta_ton, null);
    assert.equal(empty.actual_to_date.venta_ton, null);
    assert.equal(empty.reachable, false);
    assert.deepEqual(parseYearMonth({ requested_period: { igf_arr_yyyy_mm: "2026-08" } }), {
      year: 2026,
      month: 8,
      yyyy_mm: "2026-08",
    });
  });
});

describe("SPRINT1 — paridad UI Acapulco Agosto 2026", () => {
  const WRONG = {
    venta_ton: 1260,
    desc_kg: 0.12,
    util_oper_importe: 9247518,
    resultado_final_importe: 7307370,
    casa_ton: 1560.01,
    comisionista_ton: 1205.53,
  };
  const AUTH = {
    venta_ton: 1488,
    desc_kg: -0.11,
    util_oper_importe: 3169502,
    resultado_final_importe: 803537,
    casa_ton: 839.36,
    comisionista_ton: 648.64,
  };

  const miniPayload = {
    rows: [
      {
        empresa: "Acapulco",
        ventaTon: 1488,
        comDesc: 0.11,
        utilOperImporte: 3169502,
        resultadoFinalImporte: 803537,
      },
    ],
  };

  function figuresFromAuthoritativeUi(plantLabel) {
    const mini = readIgfForecastMiniAuthoritative(miniPayload, plantLabel);
    const channels = aggregateCasaComiFromClientesMes({
      historico: false,
      rows: [
        { categoria: "Casa", kg: 1, kgProy: 839360 },
        { categoria: "Comisionista", kg: 1, kgProy: 648640 },
      ],
    });
    return {
      venta_ton: mini.venta_ton,
      desc_kg: mini.desc_kg,
      util_oper_importe: mini.util_oper_importe,
      resultado_final_importe: mini.resultado_final_importe,
      casa_ton: channels.casa_ton,
      comisionista_ton: channels.comisionista_ton,
    };
  }

  it("extractor mini + CASA/COMI ARR coinciden con las 6 cifras de UI y rechazan las incorrectas", () => {
    assert.equal(dashboardDescSigned(0.11), -0.11);
    assert.equal(dashboardDescSigned(-0.11), -0.11);
    const got = figuresFromAuthoritativeUi("Acapulco");
    assert.deepEqual(got, AUTH);
    assert.notEqual(got.venta_ton, WRONG.venta_ton);
    assert.notEqual(got.desc_kg, WRONG.desc_kg);
    assert.notEqual(got.util_oper_importe, WRONG.util_oper_importe);
    assert.notEqual(got.resultado_final_importe, WRONG.resultado_final_importe);
    assert.notEqual(got.casa_ton, WRONG.casa_ton);
    assert.notEqual(got.comisionista_ton, WRONG.comisionista_ton);
    assert.equal(got.casa_ton + got.comisionista_ton, got.venta_ton);
  });

  it("Q1–Q4 pack usa esas 6 cifras, no 1260 / +0.12 / 9.2M / 1560", () => {
    const pack = packFor(Q1, {
      forecastParity: {
        ok: true,
        reachable: true,
        period: { year: 2026, month: 8, yyyy_mm: "2026-08" },
        forecast: { venta_ton: AUTH.venta_ton, desc_kg: AUTH.desc_kg, truth_semantics: "FORECAST_PROJECTION" },
        actual_to_date: { venta_ton: 1258.81, truth_semantics: "ACTUAL_TO_DATE" },
        mini: {
          venta_ton: AUTH.venta_ton,
          desc_kg: AUTH.desc_kg,
          util_oper_importe: AUTH.util_oper_importe,
          resultado_final_importe: AUTH.resultado_final_importe,
          source: "GET /api/dashboard/igf-forecast include_mini → mini.rows[]",
        },
      },
    });
    const forecast = pack.items.find((i) => i.source === "arr.proyeccion_planta");
    const actual = pack.items.find((i) => i.truth_semantics === "ACTUAL_TO_DATE");
    const util = pack.items.find((i) => i.payload && i.payload.metric === "util_oper_importe");
    const resultado = pack.items.find((i) => i.payload && i.payload.metric === "resultado_final_importe");
    assert.equal(forecast.payload.venta_ton, 1488);
    assert.equal(forecast.payload.desc_kg, -0.11);
    assert.equal(actual.payload.venta_ton, 1258.81);
    assert.notEqual(forecast.payload.venta_ton, 1260);
    assert.equal(util.payload.util_oper_importe, 3169502);
    assert.equal(resultado.payload.resultado_final_importe, 803537);
    const promptRent = buildExecutiveStatusPrompt(pack, Q2);
    assert.match(promptRent.userContent, /3169502/);
    assert.match(promptRent.userContent, /803537/);
    const promptDesc = buildExecutiveStatusPrompt(pack, Q3);
    assert.match(promptDesc.userContent, /desc_kg=-0\.11/);
    const channels = aggregateCasaComiFromClientesMes({
      historico: false,
      rows: [
        { categoria: "Casa", kg: 1, kgProy: 839360 },
        { categoria: "Comisionista", kg: 1, kgProy: 648640 },
      ],
    });
    assert.equal(channels.casa_ton, 839.36);
    assert.equal(channels.comisionista_ton, 648.64);
  });
});
