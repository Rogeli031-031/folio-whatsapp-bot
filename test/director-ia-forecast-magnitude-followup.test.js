"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  AVAILABILITY,
  NEED_TYPES,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
  isExecutiveStatusQuestion,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
  classifyForecastMagnitudeFollowUp,
  isAuthoritativeForecastMagnitudeFollowUp,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  sanitizeEchoedState,
  sanitizeForecastMagnitudes,
  forecastRunIdentityKey,
  forecastMagnitudesFromAuthoritativePack,
} = require("../lib/director-ia-conversation-state");
const { buildAuthoritativeForecastRunPack } = require("../lib/director-ia-authoritative-forecast-run-pack");
const { dashboardDescSigned } = require("../lib/director-ia-dashboard-forecast-adapter");

const Q1 = "¿Cómo vamos?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";

const CATALOG = [
  { planta_id: 1, nombre: "Acapulco", clave: "E3" },
  { planta_id: 2, nombre: "Zihuatanejo", clave: "E4" },
];

/** Evidencia de la clase de producción; no son constantes de producto. */
const AUTH = {
  venta: 1491.5,
  comDesc: 0.08,
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

const DECOY = {
  arr_venta: 1432,
  stored_venta: 1536.5405,
  stored_desc: 0.1137,
  stored_util: 1723201,
  stored_resultado: -642764,
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

function miniPayload(auth) {
  return {
    ok: true,
    year: 2026,
    month: 8,
    rows: [
      {
        empresa: "Acapulco",
        plant_code: "Acapulco",
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
      truth_semantics: "FORECAST_PROJECTION",
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

function packFor(question, auth) {
  return buildExecutiveStatusPack({
    assembled: assembledWithDecoys(),
    trend: {
      ok: true,
      channels: {
        casa: { channel: "casa", direction: "down", availability: "AVAILABLE" },
        comisionista: { channel: "comisionista", direction: "up", availability: "AVAILABLE" },
      },
    },
    scope: { scope_source: "ui_plant_anchor", planta_id: 1, plant_name: "Acapulco" },
    forecastParity: forecastParity(auth || AUTH),
  });
}

describe("SPRINT1 FORECAST-MAGNITUDE-FOLLOWUP — detector acotado", () => {
  const runOpts = { has_authoritative_run: true, executive_hilo: true };

  it("no convierte Q3 ni «cómo vamos» en follow-up de magnitud", () => {
    assert.equal(isExecutiveStatusQuestion(Q1), true);
    assert.equal(isExecutiveStatusQuestion(Q3), true);
    assert.equal(classifyForecastMagnitudeFollowUp(Q1, runOpts), null);
    assert.equal(classifyForecastMagnitudeFollowUp(Q3, runOpts), null);
    assert.equal(isAuthoritativeForecastMagnitudeFollowUp(Q3, runOpts), false);
    const planned = planDirectorIaQuestion(Q3);
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q3), {}, planned.intent), true);
    assert.equal(resolveExecutiveNeed(Q3).need_type, NEED_TYPES.EXECUTIVE_STATUS);
  });

  it("cubre las frases contractuales de magnitud sin relajar descuento genérico", () => {
    assert.equal(classifyForecastMagnitudeFollowUp("¿Cuál es el descuento forecast?", runOpts).kind, "descuento");
    assert.equal(
      classifyForecastMagnitudeFollowUp("¿Cuál es el descuento forecast al corte que estás usando?", runOpts).kind,
      "descuento"
    );
    assert.equal(classifyForecastMagnitudeFollowUp("¿Qué descuento estás usando?", runOpts).kind, "descuento");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Y el descuento?", runOpts).kind, "descuento");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Cuál fue la utilidad operativa forecast?", runOpts).kind, "utilidad");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Y la utilidad operativa?", runOpts).kind, "utilidad");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Y el resultado final?", runOpts).kind, "resultado");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Cuál era la venta proyectada?", runOpts).kind, "venta");
    assert.equal(classifyForecastMagnitudeFollowUp("¿Cuál es el forecast?", runOpts).kind, "venta");
    assert.equal(classifyForecastMagnitudeFollowUp("cómo va el descuento de Acapulco este mes", runOpts), null);
    assert.equal(classifyForecastMagnitudeFollowUp("¿Y el descuento?", { has_authoritative_run: false }), null);
  });
});

describe("SPRINT1 FORECAST-MAGNITUDE-FOLLOWUP — Estado Ejecutivo aditivo", () => {
  it("1–4 baseline protegido + Descuento (Forecast) del pack, stored separado", () => {
    const pack = packFor(Q1);
    const actual = itemByMetric(pack, "venta_ton");
    const forecast = itemByMetric(pack, "forecast_venta_desc");
    const forecastDesc = itemByMetric(pack, "forecast_desc_kg");
    const storedVenta = (pack.items || []).find(
      (i) => i.truth_semantics === "FORECAST_STORED" && i.payload && i.payload.metric === "venta_ton"
    );
    const storedDesc = itemByMetric(pack, "com_desc_kg");
    const util = itemByMetric(pack, "util_oper_importe");
    const resultado = itemByMetric(pack, "resultado_final_importe");
    const trends = (pack.items || []).filter((i) => i.slot === "TREND");

    assert.ok(actual);
    assert.equal(actual.truth_semantics, "ACTUAL_TO_DATE");
    assert.equal(actual.payload.venta_ton, AUTH.actual);
    assert.equal(forecast.payload.venta_ton, AUTH.venta);
    assert.equal(forecast.payload.desc_kg, AUTH.descuento);
    assert.equal(forecast.payload.governed_by, "dashboard_authoritative_mini");
    assert.notEqual(forecast.payload.venta_ton, DECOY.arr_venta);
    assert.equal(forecastDesc.payload.desc_kg, AUTH.descuento);
    assert.equal(forecastDesc.availability, AVAILABILITY.OPTIONAL);
    assert.match(forecastDesc.summary, /Descuento \(Forecast\):/);
    assert.equal(forecastDesc.payload.desc_kg, forecast.payload.desc_kg);
    assert.equal(forecastDesc.payload.run_identity.upload_day, forecast.payload.run_identity.upload_day);
    assert.equal(storedVenta.payload.venta_ton, DECOY.stored_venta);
    assert.equal(storedDesc.payload.desc_kg, DECOY.stored_desc);
    assert.equal(storedDesc.truth_semantics, "FORECAST_STORED");
    assert.notEqual(forecastDesc.payload.desc_kg, storedDesc.payload.desc_kg);
    assert.equal(util.payload.util_oper_importe, AUTH.utilidad);
    assert.equal(resultado.payload.resultado_final_importe, AUTH.resultado);
    assert.ok(trends.length >= 1);

    const prompt = buildExecutiveStatusPrompt(pack, Q1);
    assert.match(prompt.userContent, /Descuento \(Forecast\):/);
    assert.match(prompt.userContent, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.match(prompt.userContent, /IGF descuento almacenado/);
    assert.match(prompt.userContent, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
    assert.match(prompt.userContent, /forecast_desc_kg está AVAILABLE/);
  });
});

describe("SPRINT1 FORECAST-MAGNITUDE-FOLLOWUP — conversation_state ligado a identity", () => {
  it("magnitudes no sobreviven planta o identity distinta", () => {
    const runA = {
      plant_code: "E3",
      year: 2026,
      month: 8,
      upload_day: AUTH.cutoff,
      effective_cutoff_date: AUTH.cutoff,
      corte_day: AUTH.cutoff,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
    };
    const mags = sanitizeForecastMagnitudes(
      {
        venta: AUTH.venta,
        descuento: AUTH.descuento,
        utilidad_operativa: AUTH.utilidad,
        resultado_final: AUTH.resultado,
        semantics: "FORECAST",
      },
      runA
    );
    assert.equal(mags.run_key, forecastRunIdentityKey(runA));
    const plantSwitch = sanitizeEchoedState(
      { planta_id: 1, parent_intent: "plant_diagnosis", forecast_run: runA, forecast_magnitudes: mags },
      2
    );
    assert.equal(plantSwitch.plant_mismatch, true);
    assert.equal(plantSwitch.forecast_run, null);
    assert.equal(plantSwitch.forecast_magnitudes, null);

    const runB = { ...runA, upload_day: AUTH_B.cutoff, effective_cutoff_date: AUTH_B.cutoff, corte_day: AUTH_B.cutoff };
    const stale = sanitizeForecastMagnitudes(mags, runB);
    assert.equal(stale, null);

    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "E3",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: AUTH.cutoff,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: miniPayload(AUTH),
      mini_loader_invoked: true,
    });
    const bound = forecastMagnitudesFromAuthoritativePack(pack, runA);
    assert.equal(bound.venta, AUTH.venta);
    assert.equal(bound.descuento, AUTH.descuento);
    assert.equal(bound.utilidad_operativa, AUTH.utilidad);
    assert.equal(bound.resultado_final, AUTH.resultado);
    assert.equal(bound.semantics, "FORECAST");
  });
});

describe("SPRINT1 FORECAST-MAGNITUDE-FOLLOWUP — conversación multiturno askDirectorIa", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let isCutoffExplainQuestion;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat, isCutoffExplainQuestion } = require("../lib/director-ia-chat"));
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
          throw new Error("plant_diagnosis no debe ejecutarse en follow-up de magnitud");
        }
        return assembledWithDecoys();
      },
      loadCommercialTrendForChat: async () => ({
        ok: true,
        channels: {
          casa: { channel: "casa", direction: "down" },
          comisionista: { channel: "comisionista", direction: "up" },
        },
      }),
      loadDashboardForecastParity: async () => {
        counts.forecastParity += 1;
        if (over.forbidParity) {
          throw new Error("loadDashboardForecastParity no debe correr en follow-up");
        }
        return forecastParity(over.auth || AUTH);
      },
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        counts.mini.push(opts);
        const byCutoff = over.miniByCutoff || {};
        if (opts && byCutoff[opts.upload_day]) return miniPayload(byCutoff[opts.upload_day]);
        return miniPayload(over.auth || AUTH);
      },
    });
    return counts;
  }

  function reqOf(question, extra) {
    return {
      body: {
        planta_nombre: "Acapulco",
        upload_day: AUTH.cutoff,
        conversation_state: extra && extra.conversation_state,
        ...(extra && extra.body),
      },
      dashboardAuth: { role: "ZP" },
    };
  }

  async function turn1(countsOver) {
    const counts = wire(countsOver);
    const result = await askDirectorIa(reqOf(Q1), 1, Q1);
    return { counts, result };
  }

  it("5–13 conversación: descuento/util/resultado/venta/cutoff de la misma corrida; no ARR ni stored", async () => {
    assert.equal(isCutoffExplainQuestion("¿De qué corte es esa cifra?"), true);
    assert.equal(isCutoffExplainQuestion("¿Qué fecha de corte usaste?"), true);

    const { counts, result } = await turn1();
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.semantic_need, "EXECUTIVE_STATUS");
    assert.equal(counts.plantDiagnosis, 1);
    assert.equal(counts.openai, 1);
    const state = result.context_meta.conversation_state;
    assert.ok(state.forecast_run);
    assert.equal(state.forecast_run.effective_cutoff_date, AUTH.cutoff);
    assert.ok(state.forecast_magnitudes);
    assert.equal(state.forecast_magnitudes.venta, AUTH.venta);
    assert.equal(state.forecast_magnitudes.descuento, AUTH.descuento);
    assert.equal(state.forecast_magnitudes.utilidad_operativa, AUTH.utilidad);
    assert.equal(state.forecast_magnitudes.resultado_final, AUTH.resultado);
    const runKey = state.forecast_magnitudes.run_key;

    const followCounts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const t2 = await askDirectorIa(
      reqOf("¿Cuál es el descuento forecast al corte que estás usando?", { conversation_state: state }),
      1,
      "¿Cuál es el descuento forecast al corte que estás usando?"
    );
    assert.equal(t2.ok, true);
    assert.equal(t2.context_meta.mode, "forecast_magnitude_followup");
    assert.equal(t2.context_meta.used_plant_diagnosis, false);
    assert.equal(t2.context_meta.used_materialidad, false);
    assert.equal(t2.context_meta.used_arr_legacy, false);
    assert.equal(t2.context_meta.used_forecast_stored, false);
    assert.equal(t2.context_meta.computePronosticoProyByPlant, false);
    assert.equal(followCounts.plantDiagnosis, 0);
    assert.equal(followCounts.openai, 0);
    assert.equal(followCounts.forecastParity, 0);
    assert.match(t2.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.match(t2.answer, /27 de agosto de 2026/);
    assert.doesNotMatch(t2.answer, /MATERIALIDAD COMERCIAL/);
    assert.doesNotMatch(t2.answer, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(t2.answer, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
    assert.equal(t2.context_meta.conversation_state.forecast_magnitudes.run_key, runKey);

    const t3 = await askDirectorIa(
      reqOf("¿Y la utilidad operativa?", { conversation_state: t2.context_meta.conversation_state }),
      1,
      "¿Y la utilidad operativa?"
    );
    assert.match(t3.answer, new RegExp(String(AUTH.utilidad)));
    assert.equal(t3.context_meta.conversation_state.forecast_magnitudes.run_key, runKey);
    assert.equal(t3.context_meta.answered_metric, "utilidad");

    const t4 = await askDirectorIa(
      reqOf("¿Y el resultado final?", { conversation_state: t3.context_meta.conversation_state }),
      1,
      "¿Y el resultado final?"
    );
    assert.match(t4.answer, new RegExp(String(AUTH.resultado)));
    assert.equal(t4.context_meta.conversation_state.forecast_magnitudes.run_key, runKey);

    const t5 = await askDirectorIa(
      reqOf("¿Cuál era la venta proyectada?", { conversation_state: t4.context_meta.conversation_state }),
      1,
      "¿Cuál era la venta proyectada?"
    );
    assert.match(t5.answer, new RegExp(String(AUTH.venta).replace(".", "\\.")));
    assert.equal(t5.context_meta.conversation_state.forecast_magnitudes.run_key, runKey);

    const t6 = await askDirectorIa(
      reqOf("¿Qué fecha de corte usaste?", { conversation_state: t5.context_meta.conversation_state }),
      1,
      "¿Qué fecha de corte usaste?"
    );
    assert.equal(t6.context_meta.mode, "cutoff_explain");
    assert.match(t6.answer, /27 de agosto de 2026/);
    assert.equal(t6.context_meta.effective_cutoff_date, AUTH.cutoff);
  });

  it("14 corte A→B no contamina magnitudes A", async () => {
    const { result } = await turn1({
      miniByCutoff: { [AUTH.cutoff]: AUTH, [AUTH_B.cutoff]: AUTH_B },
    });
    const state = result.context_meta.conversation_state;
    wire({
      forbidPlantDiagnosis: true,
      forbidParity: true,
      miniByCutoff: { [AUTH.cutoff]: AUTH, [AUTH_B.cutoff]: AUTH_B },
    });
    const t2 = await askDirectorIa(
      reqOf("¿Cuál es el descuento forecast?", {
        conversation_state: state,
        body: { upload_day: AUTH_B.cutoff, planta_nombre: "Acapulco" },
      }),
      1,
      "¿Cuál es el descuento forecast?"
    );
    assert.match(t2.answer, new RegExp(String(AUTH_B.descuento).replace(".", "\\.")));
    assert.doesNotMatch(t2.answer, new RegExp(`${String(AUTH.descuento).replace(".", "\\.")} \\$/kg`));
    assert.notEqual(t2.context_meta.conversation_state.forecast_magnitudes.run_key, state.forecast_magnitudes.run_key);
    assert.equal(t2.context_meta.effective_cutoff_date, AUTH_B.cutoff);
  });

  it("15 planta A→B no contamina magnitudes A", async () => {
    const { result } = await turn1();
    const state = result.context_meta.conversation_state;
    wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const t2 = await askDirectorIa(
      {
        body: { planta_nombre: "Zihuatanejo", conversation_state: state },
        dashboardAuth: { role: "ZP" },
      },
      2,
      "¿Cuál es el descuento forecast?"
    );
    assert.match(t2.answer, /No tengo una corrida de forecast autoritativa vigente/);
    assert.doesNotMatch(t2.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.doesNotMatch(t2.answer, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(t2.answer, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
  });

  it("16 periodo distinto no contamina magnitudes anteriores", async () => {
    const { result } = await turn1();
    const state = result.context_meta.conversation_state;
    wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const t2 = await askDirectorIa(
      reqOf("¿Cuál es el descuento forecast de julio 2026?", { conversation_state: state }),
      1,
      "¿Cuál es el descuento forecast de julio 2026?"
    );
    assert.match(t2.answer, /No tengo una corrida de forecast autoritativa vigente/);
    assert.doesNotMatch(t2.answer, new RegExp(String(AUTH.descuento).replace(".", "\\.")));
    assert.notEqual(t2.context_meta.run_identity.month, 8);
  });

  it("17 sin corrida vigente: no inventa, no ARR, no stored", async () => {
    const counts = wire({ forbidPlantDiagnosis: true, forbidParity: true });
    const t = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuál es el descuento forecast?"
    );
    assert.equal(t.ok, true);
    assert.equal(t.context_meta.mode, "forecast_magnitude_followup");
    assert.match(t.answer, /No tengo una corrida de forecast autoritativa vigente/);
    assert.match(t.answer, /No sustituyo con ARR ni con IGF almacenado/);
    assert.equal(counts.plantDiagnosis, 0);
    assert.equal(counts.mini.length, 0);
    assert.doesNotMatch(t.answer, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(t.answer, new RegExp(String(DECOY.stored_desc).replace(".", "\\.")));
  });

  it("18 las cuatro magnitudes quedan ligadas a una sola run_identity", async () => {
    const { result } = await turn1();
    const m = result.context_meta.conversation_state.forecast_magnitudes;
    assert.equal(m.venta, AUTH.venta);
    assert.equal(m.descuento, AUTH.descuento);
    assert.equal(m.utilidad_operativa, AUTH.utilidad);
    assert.equal(m.resultado_final, AUTH.resultado);
    assert.ok(m.run_key);
    assert.equal(m.semantics, "FORECAST");
  });
});
