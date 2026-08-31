"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const CATALOG = [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }];

/** Cifras deliberadamente distintas de cualquier fallback ARR/adapter/stored. No son evidencia de producción. */
const AUTH = {
  venta_ton: 7011.25,
  desc_kg: -4.44,
  util_oper_importe: 555001,
  resultado_final_importe: -888002,
  casa_ton: 300.11,
  comisionista_ton: 200.22,
};

/** Decoys de la clase que ganó en producción (ARR/adapter + IGF stored). */
const DECOY = {
  venta_ton: 1307,
  desc_kg: 0.12,
  util_oper_importe: 1723201,
  resultado_final_importe: -642764,
  actual_to_date: 1305.32,
  stored_venta: 1536.54,
  casa_ton: 111.11,
  comisionista_ton: 222.22,
};

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembledWithDecoys() {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: {
      period: { kind: "snapshot", as_of: "2026-08-23" },
      payload: { summary: { overdue: 0 } },
    },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: DECOY.venta_ton, desc_kg: DECOY.desc_kg, load_error: null },
    igfRaw: {
      version_id: 12,
      row: { empresa: "E3", venta_ton: DECOY.stored_venta },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", value: DECOY.stored_venta, unit: "ton" },
          { line_key: "com_desc_kg", value: 1.72, unit: "$/kg" },
          { line_key: "util_oper_importe", value: DECOY.util_oper_importe, unit: "MXN" },
          { line_key: "resultado_final_importe", value: DECOY.resultado_final_importe, unit: "MXN" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

function authoritativeMiniPayload() {
  return {
    ok: true,
    year: 2026,
    month: 8,
    rows: [
      {
        empresa: "Acapulco",
        plant_code: "Acapulco",
        ventaTon: AUTH.venta_ton,
        comDesc: 4.44,
        utilOperImporte: AUTH.util_oper_importe,
        resultadoFinalImporte: AUTH.resultado_final_importe,
      },
    ],
  };
}

function decoyParity() {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08" },
    forecast: {
      venta_ton: DECOY.venta_ton,
      desc_kg: DECOY.desc_kg,
      source: "computePronosticoProyByPlant",
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: { venta_ton: DECOY.actual_to_date, truth_semantics: "ACTUAL_TO_DATE" },
  };
}

function itemByMetric(pack, metric) {
  return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
}

describe("SPRINT1 AUTHORITATIVE-KPI-PARITY — Golden Set routing", () => {
  it("Q1–Q3 van a CEL; Q4 queda en commercial_trend", () => {
    for (const q of [Q1, Q2, Q3]) {
      const need = resolveExecutiveNeed(q);
      const planned = planDirectorIaQuestion(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true, q);
    }
    assert.equal(isCommercialTrendQuestion(Q4), true);
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q4), {}, "commercial_trend"), false);
  });
});

describe("SPRINT1 AUTHORITATIVE-KPI-PARITY — pack no deja ganar fallback", () => {
  it("mini AVAILABLE pisa adapter/ARR y stored no gobierna util/resultado", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledWithDecoys(),
      trend: { ok: false },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: {
        ...decoyParity(),
        mini: {
          venta_ton: AUTH.venta_ton,
          desc_kg: AUTH.desc_kg,
          util_oper_importe: AUTH.util_oper_importe,
          resultado_final_importe: AUTH.resultado_final_importe,
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    const util = itemByMetric(pack, "util_oper_importe");
    const resultado = itemByMetric(pack, "resultado_final_importe");
    assert.equal(forecast.payload.venta_ton, AUTH.venta_ton);
    assert.equal(forecast.payload.desc_kg, AUTH.desc_kg);
    assert.equal(forecast.payload.governed_by, "dashboard_authoritative_mini");
    assert.notEqual(forecast.payload.venta_ton, DECOY.venta_ton);
    assert.equal(util.payload.util_oper_importe, AUTH.util_oper_importe);
    assert.equal(resultado.payload.resultado_final_importe, AUTH.resultado_final_importe);
    assert.notEqual(util.payload.util_oper_importe, DECOY.util_oper_importe);
    assert.notEqual(resultado.payload.resultado_final_importe, DECOY.resultado_final_importe);
    const prompt = buildExecutiveStatusPrompt(pack, Q2);
    assert.match(prompt.userContent, new RegExp(String(AUTH.venta_ton)));
    assert.match(prompt.userContent, new RegExp(String(AUTH.util_oper_importe)));
    assert.match(prompt.userContent, new RegExp(String(AUTH.resultado_final_importe)));
    assert.match(prompt.userContent, /dashboard_authoritative_mini/);
    assert.match(prompt.userContent, /FORECAST_PROJECTION del mini IGF cuando AVAILABLE/);
    assert.doesNotMatch(prompt.userContent, /prioriza util_oper_importe y resultado_final_importe FORECAST_STORED/);
    assert.match(prompt.userContent, new RegExp(`venta_ton=${DECOY.stored_venta}`));
    assert.match(prompt.userContent, /FORECAST_STORED/);
  });
});

describe("SPRINT1 AUTHORITATIVE-KPI-PARITY — ruta conversacional askDirectorIa", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      openaiChat: undefined,
      loadPlantDiagnosisForChat: undefined,
      loadCommercialTrendForChat: undefined,
      loadIgfForecastMiniPayload: undefined,
      loadDashboardForecastParity: undefined,
      plantCatalog: undefined,
    });
  });

  function wireCel(over = {}) {
    let lastPrompt = null;
    let miniCalls = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return over.answer || "Estado con cifras del pack.";
      },
      loadPlantDiagnosisForChat: async () => assembledWithDecoys(),
      loadCommercialTrendForChat: async () => over.trend || { ok: false },
      loadDashboardForecastParity: async () => decoyParity(),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniCalls.push(opts);
        return authoritativeMiniPayload();
      },
    });
    return {
      get lastPrompt() {
        return lastPrompt;
      },
      get miniCalls() {
        return miniCalls;
      },
    };
  }

  function assertAuthoritativePrompt(userContent) {
    assert.match(userContent, new RegExp(String(AUTH.venta_ton)));
    assert.match(userContent, new RegExp(String(AUTH.desc_kg).replace(".", "\\.")));
    assert.match(userContent, new RegExp(String(AUTH.util_oper_importe)));
    assert.match(userContent, new RegExp(String(AUTH.resultado_final_importe)));
    assert.match(userContent, /governed_by=dashboard_authoritative_mini|dashboard_authoritative_mini/);
    assert.doesNotMatch(userContent, new RegExp(`venta_ton=${DECOY.venta_ton}\\b`));
    assert.doesNotMatch(userContent, new RegExp(`util_oper_importe=${DECOY.util_oper_importe}`));
    assert.doesNotMatch(userContent, new RegExp(`resultado_final_importe=${DECOY.resultado_final_importe}`));
  }

  it("Q1 cómo vamos: loader mini corre y el prompt final conserva el payload autoritativo", async () => {
    const ctx = wireCel();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(ctx.miniCalls.length, 1);
    assert.equal(ctx.miniCalls[0].year, 2026);
    assert.equal(ctx.miniCalls[0].month, 8);
    assertAuthoritativePrompt(ctx.lastPrompt.user);
    assert.match(ctx.lastPrompt.user, new RegExp(String(DECOY.actual_to_date)));
    assert.notEqual(DECOY.actual_to_date, AUTH.venta_ton);
  });

  it("Q2 rentabilidad: decoy stored no gana precedencia en pack ni prompt", async () => {
    const ctx = wireCel();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q2
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assertAuthoritativePrompt(ctx.lastPrompt.user);
    assert.match(ctx.lastPrompt.user, /FORECAST_PROJECTION del mini IGF cuando AVAILABLE/);
    assert.doesNotMatch(
      ctx.lastPrompt.user,
      /prioriza util_oper_importe y resultado_final_importe FORECAST_STORED/
    );
  });

  it("Q3 descuento: desc autoritativo atraviesa; decoy adapter no gobierna", async () => {
    const ctx = wireCel();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q3
    );
    assert.equal(result.ok, true);
    assertAuthoritativePrompt(ctx.lastPrompt.user);
    assert.match(ctx.lastPrompt.user, /FORECAST_PROJECTION desc_kg cuando AVAILABLE/);
  });

  it("Q4 CASA/COMI: ruta commercial_trend recibe toneladas de la fuente ARR, no decoy trailing", async () => {
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return "CASA y Comisionista del mes calendario.";
      },
      loadCommercialTrendForChat: async () => ({
        ok: true,
        period_kind: "calendar_month",
        period: "2026-08",
        channel: "both",
        compare: true,
        channels: {
          casa: {
            channel: "casa",
            period_kind: "calendar_month",
            period: "2026-08",
            venta_ton: AUTH.casa_ton,
            truth_semantics: "FORECAST_PROJECTION",
            provenance: { source: "dashboard-arr-forecast.computeClientesDescuentoMes", canal: "casa" },
          },
          comisionista: {
            channel: "comisionista",
            period_kind: "calendar_month",
            period: "2026-08",
            venta_ton: AUTH.comisionista_ton,
            truth_semantics: "FORECAST_PROJECTION",
            provenance: { source: "dashboard-arr-forecast.computeClientesDescuentoMes", canal: "comisionista" },
          },
        },
        limitations: ["calendar_month_not_trailing_30d"],
      }),
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q4
    );
    assert.equal(result.ok, true);
    assert.match(lastPrompt.user, new RegExp(String(AUTH.casa_ton)));
    assert.match(lastPrompt.user, new RegExp(String(AUTH.comisionista_ton)));
    assert.doesNotMatch(lastPrompt.user, new RegExp(String(DECOY.casa_ton)));
    assert.doesNotMatch(lastPrompt.user, new RegExp(String(DECOY.comisionista_ton)));
    assert.match(lastPrompt.user, /calendar_month/);
  });
});
