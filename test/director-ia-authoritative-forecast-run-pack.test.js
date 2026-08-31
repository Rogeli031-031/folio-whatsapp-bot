"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  AVAILABILITY,
  buildExecutiveStatusPack,
  buildExecutiveStatusPrompt,
} = require("../lib/director-ia-conversational-executive-layer");
const { dashboardDescSigned } = require("../lib/director-ia-dashboard-forecast-adapter");
const { getPronosticoCorteYmdStr } = require("../lib/dashboard-arr-forecast");
const {
  PACK_STATUS,
  PACK_SEMANTICS,
  buildAuthoritativeForecastRunPack,
} = require("../lib/director-ia-authoritative-forecast-run-pack");

const ROOT = path.join(__dirname, "..");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const CEL_SRC = fs.readFileSync(
  path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"),
  "utf8"
);
const PACK_SRC = fs.readFileSync(
  path.join(ROOT, "lib", "director-ia-authoritative-forecast-run-pack.js"),
  "utf8"
);
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

const CUTOFF_A = "2026-08-05";
const CUTOFF_B = "2026-08-19";
const MONTH_END = "2026-08-31";

const ROW_A = {
  empresa: "Acapulco",
  plant_code: "Acapulco",
  ventaTon: 611.25,
  comDesc: 1.81,
  utilOperImporte: 101001,
  resultadoFinalImporte: -202002,
};

const ROW_B = {
  empresa: "Acapulco",
  plant_code: "Acapulco",
  ventaTon: 722.5,
  comDesc: 2.64,
  utilOperImporte: 303003,
  resultadoFinalImporte: -404004,
};

const ROW_PUEBLA = {
  empresa: "GT Puebla",
  plant_code: "Puebla",
  ventaTon: 900.01,
  comDesc: 3.33,
  utilOperImporte: 777001,
  resultadoFinalImporte: -888002,
};

const DECOY = {
  arr_venta: 9991,
  arr_desc: 0.91,
  stored_venta: 8882,
  stored_desc: 0.82,
  stored_util: 1723201,
  stored_resultado: -642764,
  month_end_venta: 1307,
};

function miniPayload(rows, uploadDay) {
  return {
    ok: true,
    year: 2026,
    month: 8,
    upload_day: uploadDay,
    rows: rows.slice(),
  };
}

function assembledAcapulco() {
  return assemblePlantDiagnosisEvidence({
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "Acapulco" },
    year: 2026,
    month: 8,
    actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: DECOY.arr_venta, desc_kg: DECOY.arr_desc, load_error: null },
    igfRaw: {
      version_id: 11,
      version_number: 3,
      row: { empresa: "Acapulco", venta_ton: DECOY.stored_venta },
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

function decoyParity(uploadDay) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: uploadDay || MONTH_END },
    forecast: {
      venta_ton: DECOY.arr_venta,
      desc_kg: DECOY.arr_desc,
      cutoff_date: uploadDay || MONTH_END,
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: { venta_ton: 401.1, desc_kg: null, cutoff_date: uploadDay },
  };
}

function itemByMetric(pack, metric) {
  return (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
}

function assertNumericParity(pack, dashboardRow) {
  assert.equal(pack.forecast.venta, dashboardRow.ventaTon);
  assert.equal(pack.forecast.descuento, dashboardDescSigned(dashboardRow.comDesc));
  assert.equal(pack.forecast.utilidad_operativa, dashboardRow.utilOperImporte);
  assert.equal(pack.forecast.resultado_final, dashboardRow.resultadoFinalImporte);
  assert.equal(pack.forecast.status, PACK_STATUS.AVAILABLE);
  assert.equal(pack.forecast.semantics, PACK_SEMANTICS.FORECAST);
}

describe("SPRINT1 AUTHORITATIVE-FORECAST-RUN-PACK — contrato de no-fórmula", () => {
  it("no copia computeIgfForecastMiniPayload; Dashboard sigue siendo el motor", () => {
    assert.match(PACK_SRC, /findMiniRowForPlant/);
    assert.match(PACK_SRC, /dashboardDescSigned/);
    assert.doesNotMatch(PACK_SRC, /function computeIgfForecastMiniPayload/);
    assert.doesNotMatch(PACK_SRC, /function loadProyVentaDescByPlantForIgf/);
    assert.match(SERVER_SRC, /async function computeIgfForecastMiniPayload/);
    assert.match(CHAT_SRC, /buildAuthoritativeForecastRunPack/);
    assert.match(CEL_SRC, /resolveAuthoritativeForecastRunPack/);
    assert.doesNotMatch(CEL_SRC, /forecastVenta = !hasCutoff \? null : miniVenta != null \? miniVenta : adapterVenta/);
  });
});

describe("SPRINT1 AUTHORITATIVE-FORECAST-RUN-PACK — igualdad numérica vs mini.rows[]", () => {
  it("PASS principal: pack.forecast.* === dashboard_row de computeIgfForecastMiniPayload shape", () => {
    const dashboardMini = miniPayload([ROW_A, ROW_PUEBLA], CUTOFF_A);
    const dashboard_row = dashboardMini.rows.find((r) => r.empresa === "Acapulco");
    const authoritative_pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: dashboardMini,
      mini_loader_invoked: true,
    });
    assertNumericParity(authoritative_pack, dashboard_row);
    assert.notEqual(authoritative_pack.forecast.venta, DECOY.arr_venta);
    assert.notEqual(authoritative_pack.forecast.venta, DECOY.stored_venta);
    assert.notEqual(authoritative_pack.forecast.venta, DECOY.month_end_venta);
    assert.notEqual(authoritative_pack.forecast.venta, ROW_PUEBLA.ventaTon);
    assert.notEqual(authoritative_pack.forecast.utilidad_operativa, DECOY.stored_util);
  });

  it("CEL consume el pack: las cuatro magnitudes del prompt coinciden con mini.rows[]", () => {
    const dashboardMini = miniPayload([ROW_A], CUTOFF_A);
    const dashboard_row = dashboardMini.rows[0];
    const authoritativeForecast = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: dashboardMini,
      mini_loader_invoked: true,
    });
    const cel = buildExecutiveStatusPack({
      assembled: assembledAcapulco(),
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: decoyParity(CUTOFF_A),
      authoritativeForecast,
    });
    const forecast = itemByMetric(cel, "forecast_venta_desc");
    const util = itemByMetric(cel, "util_oper_importe");
    const resultado = itemByMetric(cel, "resultado_final_importe");
    assert.equal(forecast.payload.venta_ton, dashboard_row.ventaTon);
    assert.equal(forecast.payload.desc_kg, dashboardDescSigned(dashboard_row.comDesc));
    assert.equal(forecast.payload.util_oper_importe, dashboard_row.utilOperImporte);
    assert.equal(forecast.payload.resultado_final_importe, dashboard_row.resultadoFinalImporte);
    assert.equal(util.payload.util_oper_importe, dashboard_row.utilOperImporte);
    assert.equal(resultado.payload.resultado_final_importe, dashboard_row.resultadoFinalImporte);
    assert.equal(forecast.payload.governed_by, "dashboard_authoritative_mini");
    const prompt = buildExecutiveStatusPrompt(cel, "¿Cómo vamos?");
    assert.match(prompt.userContent, new RegExp(String(dashboard_row.ventaTon)));
    assert.match(prompt.userContent, new RegExp(String(dashboard_row.utilOperImporte)));
    assert.match(prompt.userContent, new RegExp(String(dashboard_row.resultadoFinalImporte)));
    assert.doesNotMatch(prompt.userContent, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
    assert.doesNotMatch(prompt.userContent, new RegExp(`util_oper_importe=${DECOY.stored_util}`));
  });
});

describe("SPRINT1 AUTHORITATIVE-FORECAST-RUN-PACK — no contaminación", () => {
  it("corte A + PROM A ≠ corte B + PROM B", () => {
    const packA = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: miniPayload([ROW_A], CUTOFF_A),
    });
    const packB = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_B,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: miniPayload([ROW_B], CUTOFF_B),
    });
    assertNumericParity(packA, ROW_A);
    assertNumericParity(packB, ROW_B);
    assert.notEqual(packA.forecast.venta, packB.forecast.venta);
    assert.notEqual(packA.forecast.utilidad_operativa, packB.forecast.utilidad_operativa);
    assert.equal(packA.run_identity.upload_day, CUTOFF_A);
    assert.equal(packB.run_identity.upload_day, CUTOFF_B);
    assert.equal(packA.run_identity.corte_day, getPronosticoCorteYmdStr(2026, 8, CUTOFF_A));
    assert.equal(packB.run_identity.corte_day, getPronosticoCorteYmdStr(2026, 8, CUTOFF_B));
  });

  it("otra planta no contamina la row de Acapulco", () => {
    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      miniPayload: miniPayload([ROW_PUEBLA, ROW_A], CUTOFF_A),
    });
    assertNumericParity(pack, ROW_A);
    assert.notEqual(pack.forecast.venta, ROW_PUEBLA.ventaTon);
  });

  it("ARR, FORECAST_STORED y fin de mes no ganan", () => {
    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      miniPayload: miniPayload([ROW_A], CUTOFF_A),
    });
    assert.notEqual(pack.forecast.venta, DECOY.arr_venta);
    assert.notEqual(pack.forecast.venta, DECOY.stored_venta);
    assert.notEqual(pack.forecast.venta, DECOY.month_end_venta);
    const cel = buildExecutiveStatusPack({
      assembled: assembledAcapulco(),
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: {
        ...decoyParity(MONTH_END),
        forecast: { venta_ton: DECOY.month_end_venta, desc_kg: -0.12, cutoff_date: MONTH_END },
      },
      authoritativeForecast: pack,
    });
    const forecast = itemByMetric(cel, "forecast_venta_desc");
    assert.equal(forecast.payload.venta_ton, ROW_A.ventaTon);
    assert.notEqual(forecast.payload.venta_ton, DECOY.month_end_venta);
    assert.notEqual(forecast.payload.venta_ton, DECOY.arr_venta);
  });
});

describe("SPRINT1 AUTHORITATIVE-FORECAST-RUN-PACK — fail-closed e identidad", () => {
  it("sin cutoff: FORECAST UNAVAILABLE y mini no cuenta aunque se inyecte payload", () => {
    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: null,
      miniPayload: miniPayload([ROW_A], MONTH_END),
      mini_loader_invoked: true,
    });
    assert.equal(pack.status, PACK_STATUS.UNAVAILABLE);
    assert.equal(pack.forecast.status, PACK_STATUS.UNAVAILABLE);
    assert.equal(pack.forecast.venta, null);
    assert.equal(pack.forecast.utilidad_operativa, null);
    assert.equal(pack.provenance.mini_loader_invoked, false);
    assert.equal(pack.provenance.governed_by, "unavailable_no_cutoff");
    assert.equal(pack.run_identity.corte_day, null);
  });

  it("las cuatro magnitudes comparten run_identity y provenance autoritativa", () => {
    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      cutoff_origin: "REQUEST_UPLOAD_DAY",
      miniPayload: miniPayload([ROW_A], CUTOFF_A),
      igf_version_id: 11,
      igf_version_number: 3,
    });
    assert.equal(pack.run_identity.upload_day, CUTOFF_A);
    assert.equal(pack.run_identity.corte_day, CUTOFF_A);
    assert.equal(pack.run_identity.cutoff_origin, "REQUEST_UPLOAD_DAY");
    assert.equal(pack.run_identity.igf_version_id, 11);
    assert.equal(pack.provenance.source, "computeIgfForecastMiniPayload");
    assert.equal(pack.provenance.row_found, true);
    const cel = buildExecutiveStatusPack({
      assembled: assembledAcapulco(),
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      authoritativeForecast: pack,
    });
    const forecast = itemByMetric(cel, "forecast_venta_desc");
    assert.equal(forecast.payload.run_identity.upload_day, CUTOFF_A);
    assert.equal(forecast.payload.util_oper_importe, ROW_A.utilOperImporte);
    assert.equal(forecast.payload.resultado_final_importe, ROW_A.resultadoFinalImporte);
    assert.equal(cel.authoritative_forecast.status, PACK_STATUS.AVAILABLE);
  });

  it("FORECAST_STORED permanece separado; TARGET y desc ACTUAL UNAVAILABLE", () => {
    const pack = buildAuthoritativeForecastRunPack({
      plant_code: "Acapulco",
      plant_label: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      miniPayload: miniPayload([ROW_A], CUTOFF_A),
      actual_to_date: { venta_ton: 401.1, desc_kg: 0.55 },
    });
    assert.equal(pack.forecast.semantics, PACK_SEMANTICS.FORECAST);
    assert.equal(pack.actual_to_date.semantics, PACK_SEMANTICS.ACTUAL_TO_DATE);
    assert.equal(pack.actual_to_date.descuento, null);
    assert.equal(pack.actual_to_date.descuento_status, PACK_STATUS.UNAVAILABLE);
    assert.equal(pack.target_commitment.status, PACK_STATUS.UNAVAILABLE);
    assert.equal(pack.target_commitment.semantics, PACK_SEMANTICS.TARGET_COMMITMENT);
    const cel = buildExecutiveStatusPack({
      assembled: assembledAcapulco(),
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: decoyParity(CUTOFF_A),
      authoritativeForecast: pack,
    });
    const stored = cel.items.find(
      (i) => i.truth_semantics === "FORECAST_STORED" && i.payload && i.payload.metric === "venta_ton"
    );
    const target = cel.items.find((i) => i.slot === "TARGET_COMMITMENT");
    const actualDesc = cel.items.find(
      (i) => i.truth_semantics === "ACTUAL_TO_DATE" && i.payload && i.payload.metric === "actual_desc_kg"
    );
    assert.equal(stored.payload.venta_ton, DECOY.stored_venta);
    assert.notEqual(stored.payload.venta_ton, pack.forecast.venta);
    assert.equal(target.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(actualDesc.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(actualDesc.payload.desc_kg, null);
  });
});

describe("SPRINT1 AUTHORITATIVE-FORECAST-RUN-PACK — runtime chat", () => {
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

  function wire(over = {}) {
    const miniCalls = [];
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return "Estado con pack autoritativo.";
      },
      loadPlantDiagnosisForChat: async () => assembledAcapulco(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadDashboardForecastParity: async () =>
        over.parity || decoyParity(over.upload_day || CUTOFF_A),
      loadArrLastUploadDay: async () => ({ upload_day: over.last_upload || null }),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniCalls.push(opts);
        return over.mini || miniPayload([ROW_A], opts.upload_day);
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

  it("REQUEST_UPLOAD_DAY: mini se invoca y el prompt tiene las cuatro magnitudes de esa row", async () => {
    const ctx = wire();
    const dashboardMini = miniPayload([ROW_A], CUTOFF_A);
    const dashboard_row = dashboardMini.rows[0];
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.equal(result.ok, true);
    assert.equal(ctx.miniCalls.length, 1);
    assert.equal(ctx.miniCalls[0].upload_day, CUTOFF_A);
    assert.equal(result.context_meta.cutoff_origin, "REQUEST_UPLOAD_DAY");
    assert.equal(result.context_meta.authoritative_forecast_status, PACK_STATUS.AVAILABLE);
    assert.equal(result.context_meta.mini_loader_invoked, true);
    const user = ctx.lastPrompt.user;
    assert.match(user, new RegExp(String(dashboard_row.ventaTon)));
    assert.match(user, new RegExp(String(dashboardDescSigned(dashboard_row.comDesc)).replace(".", "\\.")));
    assert.match(user, new RegExp(String(dashboard_row.utilOperImporte)));
    assert.match(user, new RegExp(String(dashboard_row.resultadoFinalImporte)));
    assert.doesNotMatch(user, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
    assert.doesNotMatch(user, new RegExp(`util_oper_importe=${DECOY.stored_util}`));
  });

  it("cutoff explícito en la pregunta gana sobre REQUEST_UPLOAD_DAY", async () => {
    const ctx = wire({
      mini: miniPayload([ROW_B], CUTOFF_B),
    });
    const result = await askDirectorIa(
      {
        body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A },
        dashboardAuth: { role: "ZP" },
      },
      1,
      `¿Cómo vamos en Acapulco ${CUTOFF_B}?`
    );
    assert.equal(result.ok, true);
    assert.equal(ctx.miniCalls.length, 1);
    assert.equal(ctx.miniCalls[0].upload_day, CUTOFF_B);
    assert.equal(result.context_meta.cutoff_origin, "EXPLICIT_QUESTION");
    assert.match(ctx.lastPrompt.user, new RegExp(String(ROW_B.ventaTon)));
    assert.doesNotMatch(ctx.lastPrompt.user, new RegExp(`venta_ton=${ROW_A.ventaTon}\\b`));
  });

  it("sin cutoff: mini no se invoca y FORECAST queda UNAVAILABLE", async () => {
    const ctx = wire();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo vamos?"
    );
    assert.equal(result.ok, true);
    assert.equal(ctx.miniCalls.length, 0);
    assert.equal(result.context_meta.mini_loader_invoked, false);
    assert.equal(result.context_meta.authoritative_forecast_status, PACK_STATUS.UNAVAILABLE);
    assert.equal(result.context_meta.cutoff_origin, "UNAVAILABLE");
    assert.match(ctx.lastPrompt.user, /unavailable_no_cutoff|UNAVAILABLE/);
    assert.doesNotMatch(ctx.lastPrompt.user, new RegExp(`venta_ton=${ROW_A.ventaTon}\\b`));
    assert.doesNotMatch(ctx.lastPrompt.user, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
    assert.doesNotMatch(ctx.lastPrompt.user, new RegExp(MONTH_END));
  });
});
