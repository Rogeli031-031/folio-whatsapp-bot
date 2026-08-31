"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  AVAILABILITY,
  NEED_TYPES,
  buildExecutiveStatusPack,
  isExecutiveStatusQuestion,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { dashboardDescSigned } = require("../lib/director-ia-dashboard-forecast-adapter");

const Q1 = "¿Cómo vamos?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q_DESC_CORTE = "¿Cuál es el descuento forecast al corte que estás usando?";
const Q_DESC = "¿Cuál es el descuento forecast?";
const Q_VENTA = "¿Cuál es el forecast de venta al corte?";
const Q_UTIL = "¿Cuál es la utilidad operativa forecast?";
const Q_RES = "¿Cuál es el resultado final forecast?";

const CATALOG = [
  { planta_id: 1, nombre: "Acapulco", clave: "E3" },
  { planta_id: 2, nombre: "Zihuatanejo", clave: "E4" },
];

const AUTH = {
  venta: 1491.5,
  comDesc: 0.11,
  utilidad: 3197215,
  resultado: 831250,
  cutoff: "2026-08-27",
  actual: 1261,
};
AUTH.descuento = dashboardDescSigned(AUTH.comDesc);

const AUTH_B = {
  venta: 1402.25,
  comDesc: 0.21,
  utilidad: 2800100,
  resultado: 610040,
  cutoff: "2026-08-12",
};
AUTH_B.descuento = dashboardDescSigned(AUTH_B.comDesc);

const AUTH_ZI = {
  venta: 880.4,
  comDesc: 0.33,
  utilidad: 111000,
  resultado: 22000,
  cutoff: "2026-08-27",
};
AUTH_ZI.descuento = dashboardDescSigned(AUTH_ZI.comDesc);

const DECOY = {
  arr_venta: 1432,
  stored_venta: 1536.5405,
  stored_desc: 0.1137,
  stored_util: 1723201,
  stored_resultado: -642764,
};

function plant(over) {
  return {
    planta_id: 1,
    planta_nombre: "Acapulco",
    plant_code: "E3",
    ...over,
  };
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
    arrRaw: { venta_ton: DECOY.arr_venta, desc_kg: DECOY.stored_desc, load_error: null },
    igfRaw: {
      version_id: 12,
      row: { empresa: "E3", venta_ton: DECOY.stored_venta },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", value: DECOY.stored_venta, unit: "ton" },
          { line_key: "com_desc_kg", value: DECOY.stored_desc, unit: "$/kg" },
          { line_key: "util_oper_importe", value: DECOY.stored_util, unit: "MXN" },
          { line_key: "resultado_final_importe", value: DECOY.stored_resultado, unit: "MXN" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

function miniPayload(auth, plantName) {
  const name = plantName || "Acapulco";
  return {
    ok: true,
    year: 2026,
    month: 8,
    rows: [
      {
        empresa: name,
        plant_code: name,
        ventaTon: auth.venta,
        comDesc: auth.comDesc,
        utilOperImporte: auth.utilidad,
        resultadoFinalImporte: auth.resultado,
      },
    ],
  };
}

function forecastParity(auth) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: auth.cutoff },
    forecast: {
      venta_ton: DECOY.arr_venta,
      desc_kg: DECOY.stored_desc,
      cutoff_date: auth.cutoff,
      source: "computePronosticoProyByPlant",
    },
    actual_to_date: {
      venta_ton: AUTH.actual,
      cutoff_date: auth.cutoff,
      truth_semantics: "ACTUAL_TO_DATE",
    },
    mini: {
      venta_ton: auth.venta,
      desc_kg: auth.descuento,
      util_oper_importe: auth.utilidad,
      resultado_final_importe: auth.resultado,
      cutoff_date: auth.cutoff,
      source: "computeIgfForecastMiniPayload",
    },
  };
}

function itemByMetric(pack, metric) {
  return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
}

describe("SPRINT1 FORECAST-DIRECT-BOOTSTRAP — year/month desde upload_day", () => {
  let yearMonthFromCutoffYmd;

  before(() => {
    ({ yearMonthFromCutoffYmd } = require("../lib/director-ia-chat"));
  });

  it("5 deriva year/month del YMD; no inventa fin de mes", () => {
    assert.deepEqual(yearMonthFromCutoffYmd("2026-08-27"), { year: 2026, month: 8 });
    assert.deepEqual(yearMonthFromCutoffYmd("2026-08-31"), { year: 2026, month: 8 });
    assert.equal(yearMonthFromCutoffYmd(""), null);
    assert.equal(yearMonthFromCutoffYmd("27 de agosto"), null);
  });
});

describe("SPRINT1 FORECAST-DIRECT-BOOTSTRAP — Estado Ejecutivo protegido + Golden Set routing", () => {
  it("10 pack ejecutivo conserva magnitudes y no pierde Descuento (Forecast)", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledWithDecoys(),
      trend: { ok: false },
      scope: { scope_source: "ui_plant_anchor", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: forecastParity(AUTH),
    });
    assert.equal(itemByMetric(pack, "venta_ton").payload.venta_ton, AUTH.actual);
    assert.equal(itemByMetric(pack, "forecast_venta_desc").payload.venta_ton, AUTH.venta);
    assert.equal(itemByMetric(pack, "forecast_desc_kg").payload.desc_kg, AUTH.descuento);
    assert.equal(itemByMetric(pack, "forecast_desc_kg").availability, AVAILABILITY.OPTIONAL);
    assert.equal(itemByMetric(pack, "com_desc_kg").payload.desc_kg, DECOY.stored_desc);
    assert.equal(itemByMetric(pack, "util_oper_importe").payload.util_oper_importe, AUTH.utilidad);
    assert.equal(itemByMetric(pack, "resultado_final_importe").payload.resultado_final_importe, AUTH.resultado);
  });

  it("15 Q1–Q3 siguen CEL; Q3 no es bootstrap de magnitud", () => {
    for (const q of [Q1, Q3]) {
      const need = resolveExecutiveNeed(q);
      const planned = planDirectorIaQuestion(q);
      assert.equal(isExecutiveStatusQuestion(q), true, q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true, q);
    }
  });
});

describe("SPRINT1 FORECAST-DIRECT-BOOTSTRAP — primer turno askDirectorIa", () => {
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
      loadArrLastUploadDay: undefined,
    });
  });

  function wire(over = {}) {
    const counts = {
      plantDiagnosis: 0,
      forecastParity: 0,
      openai: 0,
      mini: [],
    };
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async () => {
        counts.openai += 1;
        return over.answer || "Estado Ejecutivo con cifras del pack.";
      },
      loadPlantDiagnosisForChat: async () => {
        counts.plantDiagnosis += 1;
        if (over.forbidPlantDiagnosis) {
          throw new Error("plant_diagnosis no debe ejecutarse en bootstrap directo");
        }
        return assembledWithDecoys();
      },
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadDashboardForecastParity: async () => {
        counts.forecastParity += 1;
        if (over.forbidParity) throw new Error("parity no debe correr en bootstrap");
        return forecastParity(over.auth || AUTH);
      },
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        counts.mini.push(opts);
        if (opts && opts.plantName === "Zihuatanejo") return miniPayload(AUTH_ZI, "Zihuatanejo");
        const byCutoff = over.miniByCutoff || {};
        if (opts && byCutoff[opts.upload_day]) return miniPayload(byCutoff[opts.upload_day]);
        return miniPayload(over.auth || AUTH);
      },
    });
    return counts;
  }

  function firstTurnReq(question, extra) {
    return {
      body: {
        planta_nombre: (extra && extra.planta_nombre) || "Acapulco",
        upload_day: extra && Object.prototype.hasOwnProperty.call(extra, "upload_day")
          ? extra.upload_day
          : AUTH.cutoff,
      },
      dashboardAuth: { role: "ZP" },
    };
  }

  function assertDirectMagnitude(result, kind, value, counts) {
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "forecast_magnitude_followup");
    assert.equal(result.context_meta.answered_metric, kind);
    assert.equal(result.context_meta.used_plant_diagnosis, false);
    assert.equal(result.context_meta.used_materialidad, false);
    assert.equal(result.context_meta.used_arr_legacy, false);
    assert.equal(result.context_meta.used_forecast_stored, false);
    assert.equal(counts.plantDiagnosis, 0);
    assert.equal(counts.openai, 0);
    assert.equal(counts.mini.length, 1);
    assert.equal(counts.mini[0].year, 2026);
    assert.equal(counts.mini[0].month, 8);
    assert.equal(counts.mini[0].upload_day, AUTH.cutoff);
    assert.match(result.answer, new RegExp(String(value).replace(".", "\\.")));
    assert.doesNotMatch(result.answer, /MATERIALIDAD COMERCIAL/);
    assert.doesNotMatch(result.answer, /Venta Actual|IGF almacenado|Tendencia CASA/);
    assert.doesNotMatch(result.answer, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(result.answer, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
  }

  it("1 primer turno + upload_day + descuento forecast → pack autoritativo", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_DESC_CORTE), 1, Q_DESC_CORTE);
    assertDirectMagnitude(result, "descuento", AUTH.descuento, counts);
    assert.match(result.answer, /27 de agosto de 2026/);
  });

  it("2 primer turno + venta forecast", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_VENTA), 1, Q_VENTA);
    assertDirectMagnitude(result, "venta", AUTH.venta, counts);
  });

  it("3 primer turno + utilidad operativa forecast", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_UTIL), 1, Q_UTIL);
    assertDirectMagnitude(result, "utilidad", AUTH.utilidad, counts);
  });

  it("4 primer turno + resultado final forecast", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_RES), 1, Q_RES);
    assertDirectMagnitude(result, "resultado", AUTH.resultado, counts);
  });

  it("6 sin upload_day ni run → UNAVAILABLE", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_DESC, { upload_day: null }), 1, Q_DESC);
    assert.equal(result.context_meta.mode, "forecast_magnitude_followup");
    assert.match(result.answer, /No tengo una corrida de forecast autoritativa vigente/);
    assert.equal(counts.mini.length, 0);
    assert.doesNotMatch(result.answer, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(result.answer, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
  });

  it("7–8, 13–14 no ARR, no stored, no materialidad, no Estado Ejecutivo completo", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const result = await askDirectorIa(firstTurnReq(Q_DESC), 1, Q_DESC);
    assertDirectMagnitude(result, "descuento", AUTH.descuento, counts);
    assert.equal(result.context_meta.semantic_need, "FORECAST_MAGNITUDE_FOLLOWUP");
    assert.notEqual(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
  });

  it("9 continuidad cómo vamos → follow-up no cambia", async () => {
    const first = wire();
    const t1 = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: AUTH.cutoff }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(t1.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(first.openai, 1);
    assert.equal(first.plantDiagnosis, 1);
    const state = t1.context_meta.conversation_state;
    const follow = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const t2 = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          upload_day: AUTH.cutoff,
          conversation_state: state,
        },
        dashboardAuth: { role: "ZP" },
      },
      1,
      Q_DESC_CORTE
    );
    assert.equal(t2.context_meta.mode, "forecast_magnitude_followup");
    assert.match(t2.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.match(t2.answer, /27 de agosto de 2026/);
    assert.equal(t2.context_meta.conversation_state.forecast_magnitudes.run_key, state.forecast_magnitudes.run_key);
    assert.equal(follow.plantDiagnosis, 0);
    assert.equal(follow.openai, 0);
  });

  it("11 corte A y corte B no se contaminan", async () => {
    wire({
      forbidPlantDiagnosis: true,
      forbidParity: true,
      miniByCutoff: { [AUTH.cutoff]: AUTH, [AUTH_B.cutoff]: AUTH_B },
    });
    const a = await askDirectorIa(firstTurnReq(Q_DESC, { upload_day: AUTH.cutoff }), 1, Q_DESC);
    const b = await askDirectorIa(firstTurnReq(Q_DESC, { upload_day: AUTH_B.cutoff }), 1, Q_DESC);
    assert.match(a.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.match(b.answer, new RegExp(String(AUTH_B.descuento).replace(".", "\\.")));
    assert.notEqual(a.context_meta.effective_cutoff_date, b.context_meta.effective_cutoff_date);
    assert.notEqual(
      a.context_meta.conversation_state.forecast_magnitudes.run_key,
      b.context_meta.conversation_state.forecast_magnitudes.run_key
    );
  });

  it("12 planta A y planta B no se contaminan", async () => {
    wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const a = await askDirectorIa(firstTurnReq(Q_DESC), 1, Q_DESC);
    const b = await askDirectorIa(
      {
        body: { planta_nombre: "Zihuatanejo", upload_day: AUTH.cutoff },
        dashboardAuth: { role: "ZP" },
      },
      2,
      Q_DESC
    );
    assert.match(a.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.match(b.answer, new RegExp(String(AUTH_ZI.descuento).replace(".", "\\.")));
    assert.doesNotMatch(b.answer, new RegExp(`${String(AUTH.descuento).replace(".", "\\.")} \\$/kg`));
  });
});
