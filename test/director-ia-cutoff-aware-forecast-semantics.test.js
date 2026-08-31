"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  NEED_TYPES,
  AVAILABILITY,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
  isCutoffAwareMagnitudeQuestion,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";
const Q5 = "¿Cuánto llevamos vendido al corte?";
const Q6 = "¿Cuál es el forecast con el corte actual?";
const Q7 = "¿Cómo va el descuento acumulado y cómo proyecta cerrar?";
const Q8 = "¿Cuál es la meta/compromiso de venta y descuento?";

const CATALOG = [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }];

const CUTOFF_A = "2026-08-12";
const CUTOFF_B = "2026-08-20";

const RUN_A = {
  cutoff_date: CUTOFF_A,
  actual_venta: 501.1,
  actual_desc: null,
  forecast_venta: 811.25,
  forecast_desc: -2.21,
};

const RUN_B = {
  cutoff_date: CUTOFF_B,
  actual_venta: 640.4,
  actual_desc: null,
  forecast_venta: 922.5,
  forecast_desc: -3.08,
};

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembledWithStored(versionId, versionNumber, ventaStored, descStored) {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: 1307, desc_kg: 0.12, load_error: null },
    igfRaw: {
      version_id: versionId,
      version_number: versionNumber,
      row: { empresa: "E3", venta_ton: ventaStored },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", value: ventaStored, unit: "ton" },
          { line_key: "com_desc_kg", value: descStored, unit: "$/kg" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

function parityForRun(run) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: run.cutoff_date },
    forecast: {
      venta_ton: 1307,
      desc_kg: 0.12,
      cutoff_date: run.cutoff_date,
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: {
      venta_ton: run.actual_venta,
      desc_kg: run.actual_desc,
      cutoff_date: run.cutoff_date,
      truth_semantics: "ACTUAL_TO_DATE",
    },
    mini: {
      venta_ton: run.forecast_venta,
      desc_kg: run.forecast_desc,
      util_oper_importe: 555001,
      resultado_final_importe: -888002,
      cutoff_date: run.cutoff_date,
      source: "computeIgfForecastMiniPayload",
    },
  };
}

function itemByMetric(pack, metric) {
  return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
}

describe("SPRINT1 CUTOFF-AWARE — Golden Set routing", () => {
  it("Q1–Q3 y Q5–Q8 van a CEL; Q4 commercial_trend", () => {
    for (const q of [Q1, Q2, Q3, Q5, Q6, Q7, Q8]) {
      const need = resolveExecutiveNeed(q);
      const planned = planDirectorIaQuestion(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true, `${q} intent=${planned.intent}`);
    }
    assert.equal(isCutoffAwareMagnitudeQuestion(Q5), true);
    assert.equal(isCutoffAwareMagnitudeQuestion(Q6), true);
    assert.equal(isCutoffAwareMagnitudeQuestion(Q8), true);
    assert.equal(isCommercialTrendQuestion(Q4), true);
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q4), {}, "commercial_trend"), false);
  });
});

describe("SPRINT1 CUTOFF-AWARE — tests obligatorios", () => {
  it("1 cutoff A y B producen forecasts distintos y no se reutilizan", () => {
    const packA = buildExecutiveStatusPack({
      assembled: assembledWithStored(11, 3, 9001, 0.55),
      trend: { ok: false },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_A),
    });
    const packB = buildExecutiveStatusPack({
      assembled: assembledWithStored(11, 3, 9001, 0.55),
      trend: { ok: false },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_B),
    });
    const fA = itemByMetric(packA, "forecast_venta_desc");
    const fB = itemByMetric(packB, "forecast_venta_desc");
    assert.equal(fA.payload.cutoff_date, CUTOFF_A);
    assert.equal(fB.payload.cutoff_date, CUTOFF_B);
    assert.equal(fA.payload.venta_ton, RUN_A.forecast_venta);
    assert.equal(fB.payload.venta_ton, RUN_B.forecast_venta);
    assert.notEqual(fA.payload.venta_ton, fB.payload.venta_ton);
    assert.notEqual(fA.payload.desc_kg, fB.payload.desc_kg);
  });

  it("2 ACTUAL_TO_DATE ≠ FORECAST_PROJECTION llegan separados", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledWithStored(11, 3, 9001, 0.55),
      trend: { ok: false },
      scope: { planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_A),
    });
    const actual = pack.items.find((i) => i.truth_semantics === "ACTUAL_TO_DATE" && i.payload.metric === "venta_ton");
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    assert.equal(actual.payload.venta_ton, RUN_A.actual_venta);
    assert.equal(forecast.payload.venta_ton, RUN_A.forecast_venta);
    assert.notEqual(actual.payload.venta_ton, forecast.payload.venta_ton);
    assert.match(actual.summary, /ACTUAL_TO_DATE/);
    assert.match(forecast.summary, /FORECAST_PROJECTION/);
    assert.doesNotMatch(actual.summary, /forecast de cierre/i);
  });

  it("3 venta y descuento simétricos al mismo cutoff y misma corrida", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledWithStored(11, 3, 9001, 0.55),
      trend: { ok: false },
      scope: { planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_B),
    });
    const actualV = pack.items.find((i) => i.payload && i.payload.metric === "venta_ton" && i.truth_semantics === "ACTUAL_TO_DATE");
    const actualD = itemByMetric(pack, "actual_desc_kg");
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    assert.equal(actualV.payload.cutoff_date, actualD.payload.cutoff_date);
    assert.equal(forecast.payload.cutoff_date, CUTOFF_B);
    assert.equal(forecast.payload.venta_ton, RUN_B.forecast_venta);
    assert.equal(forecast.payload.desc_kg, RUN_B.forecast_desc);
    assert.equal(forecast.payload.governed_by, "dashboard_authoritative_mini");
  });

  it("4 meta/compromiso UNAVAILABLE; stored venta/desc solo se emparejan del mismo version_id", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledWithStored(44, 7, 7777.7, 0.77),
      trend: { ok: false },
      scope: { planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_A),
    });
    const target = pack.items.find((i) => i.slot === "TARGET_COMMITMENT");
    assert.equal(target.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(target.payload.venta_ton, null);
    assert.equal(target.payload.desc_kg, null);
    const storedV = pack.items.find((i) => i.truth_semantics === "FORECAST_STORED" && i.payload.metric === "venta_ton");
    const storedD = pack.items.find((i) => i.truth_semantics === "FORECAST_STORED" && i.payload.metric === "com_desc_kg");
    assert.equal(storedV.payload.version_id, 44);
    assert.equal(storedD.payload.version_id, 44);
    assert.equal(storedV.payload.venta_ton, 7777.7);
    assert.equal(storedD.payload.com_desc_kg, 0.77);
    assert.match(storedV.summary, /no es TARGET/);
    const other = buildExecutiveStatusPack({
      assembled: assembledWithStored(45, 8, 8888.8, 0.88),
      trend: { ok: false },
      scope: { planta_id: 1, plant_name: "Acapulco" },
      forecastParity: parityForRun(RUN_A),
    });
    const otherV = other.items.find((i) => i.truth_semantics === "FORECAST_STORED" && i.payload.metric === "venta_ton");
    const otherD = other.items.find((i) => i.truth_semantics === "FORECAST_STORED" && i.payload.metric === "com_desc_kg");
    assert.equal(otherV.payload.version_id, otherD.payload.version_id);
    assert.notEqual(otherV.payload.version_id, storedV.payload.version_id);
    assert.notEqual(otherV.payload.venta_ton, storedV.payload.venta_ton);
  });
});

describe("SPRINT1 CUTOFF-AWARE — E2E askDirectorIa", () => {
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
      loadArrLastUploadDay: undefined,
      plantCatalog: undefined,
    });
  });

  function wire(run) {
    let lastPrompt = null;
    let miniOpts = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return "Respuesta con cifras del pack.";
      },
      loadPlantDiagnosisForChat: async () => assembledWithStored(11, 3, 9001, 0.55),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadDashboardForecastParity: async (_pool, opts) => {
        assert.equal(opts.upload_day, run.cutoff_date);
        return {
          ...parityForRun(run),
          forecast: { venta_ton: 1307, desc_kg: 0.12, cutoff_date: run.cutoff_date },
        };
      },
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniOpts.push(opts);
        return {
          ok: true,
          year: 2026,
          month: 8,
          upload_day: opts.upload_day,
          rows: [
            {
              empresa: "Acapulco",
              ventaTon: run.forecast_venta,
              comDesc: Math.abs(run.forecast_desc),
              utilOperImporte: 555001,
              resultadoFinalImporte: -888002,
            },
          ],
        };
      },
    });
    return {
      get lastPrompt() {
        return lastPrompt;
      },
      get miniOpts() {
        return miniOpts;
      },
    };
  }

  it("5 ¿Cómo vamos? distingue acumulado, forecast+corte y no afirma meta", async () => {
    const ctx = wire(RUN_A);
    const result = await askDirectorIa(
      {
        body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A },
        dashboardAuth: { role: "ZP" },
      },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_A);
    const user = ctx.lastPrompt.user;
    assert.match(user, /ACTUAL_TO_DATE/);
    assert.match(user, new RegExp(String(RUN_A.actual_venta)));
    assert.match(user, new RegExp(String(RUN_A.forecast_venta)));
    assert.match(user, new RegExp(CUTOFF_A));
    assert.match(user, /FORECAST_PROJECTION/);
    assert.match(user, /TARGET_OR_COMMITMENT|igf_meta/);
    assert.match(user, /UNAVAILABLE/);
    assert.doesNotMatch(user, /venta_ton=1307\b/);
    assert.match(user, /version_id=11/);
  });

  it("cutoff B no reutiliza forecast A en la ruta conversacional", async () => {
    const ctx = wire(RUN_B);
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_B }, dashboardAuth: { role: "ZP" } },
      1,
      Q6
    );
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_B);
    assert.match(ctx.lastPrompt.user, new RegExp(String(RUN_B.forecast_venta)));
    assert.doesNotMatch(ctx.lastPrompt.user, new RegExp(String(RUN_A.forecast_venta)));
    assert.match(ctx.lastPrompt.user, new RegExp(CUTOFF_B));
  });
});
