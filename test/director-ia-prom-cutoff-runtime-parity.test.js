"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  NEED_TYPES,
  AVAILABILITY,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
  buildExecutiveStatusPack,
  formatForecastCutoffDateEs,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");
const { getPronosticoCorteYmdStr } = require("../lib/dashboard-arr-forecast");
const { sanitizeForecastRun, sanitizeEchoedState } = require("../lib/director-ia-conversation-state");
const { buildDirectorIaChatBody } = require("../frontend-dashboard/modules/director-ia/lib/chat-request");
const {
  resolveDirectorIaEffectiveCutoff,
  parseExplicitCutoffFromQuestion,
  queryArrLastUploadDayPlantAware,
  isCutoffExplainQuestion,
  buildForecastRunIdentity,
  mapCutoffSourceToOrigin,
} = require("../lib/director-ia-chat");

const ROOT = path.join(__dirname, "..");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const CEL_SRC = fs.readFileSync(
  path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"),
  "utf8"
);
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatPanel.tsx"),
  "utf8"
);
const CHAT_REQ_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "lib", "chat-request.js"),
  "utf8"
);
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const CUTOFF_A = "2026-08-05";
const CUTOFF_B = "2026-08-19";
const LAST_UPLOAD_ACA = "2026-08-14";
const LAST_UPLOAD_PUE = "2026-08-22";
const MONTH_END = "2026-08-31";
const NUMERIC_DECOY = "1491.50";

const RUN_A = {
  cutoff_date: CUTOFF_A,
  ventaTon: 611.25,
  comDesc: 1.81,
  utilOperImporte: 101001,
  resultadoFinalImporte: -202002,
  actual_venta: 401.1,
};

const RUN_B = {
  cutoff_date: CUTOFF_B,
  ventaTon: 722.5,
  comDesc: 2.64,
  utilOperImporte: 303003,
  resultadoFinalImporte: -404004,
  actual_venta: 518.4,
};

const DECOY = {
  arr_venta: 9991,
  arr_desc: 0.91,
  stored_venta: 8882,
  stored_desc: 0.82,
};

function plantAcapulco() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "Acapulco" };
}

function assembledAcapulco() {
  return assemblePlantDiagnosisEvidence({
    plant: plantAcapulco(),
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
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

function miniPayload(run, uploadDay) {
  return {
    ok: true,
    year: 2026,
    month: 8,
    upload_day: uploadDay,
    rows: [
      {
        empresa: "Acapulco",
        ventaTon: run.ventaTon,
        comDesc: run.comDesc,
        utilOperImporte: run.utilOperImporte,
        resultadoFinalImporte: run.resultadoFinalImporte,
      },
    ],
  };
}

function parityFor(run, uploadDay) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: uploadDay || run.cutoff_date },
    forecast: {
      venta_ton: DECOY.arr_venta,
      desc_kg: DECOY.arr_desc,
      cutoff_date: uploadDay || run.cutoff_date,
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: {
      venta_ton: run.actual_venta,
      desc_kg: null,
      cutoff_date: uploadDay || run.cutoff_date,
      truth_semantics: "ACTUAL_TO_DATE",
    },
  };
}

function forecastItems(pack) {
  return (pack.items || []).filter((i) => i.truth_semantics === "FORECAST_PROJECTION");
}

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — contrato de no-fórmula", () => {
  it("Director IA sigue la ruta autoritativa; no copia computeIgfForecastMiniPayload", () => {
    assert.match(CHAT_SRC, /loadIgfForecastMiniPayload/);
    assert.match(CHAT_SRC, /resolvedCutoff/);
    assert.doesNotMatch(CHAT_SRC, /function computeIgfForecastMiniPayload/);
    assert.doesNotMatch(CHAT_SRC, /function loadProyVentaDescByPlantForIgf/);
    assert.match(SERVER_SRC, /async function loadProyVentaDescByPlantForIgf/);
    assert.match(SERVER_SRC, /async function computeIgfForecastMiniPayload/);
    assert.match(SERVER_SRC, /loadIgfForecastMiniPayload:/);
  });

  it("CEL no usa ARR como forecast si no hay cutoff", () => {
    assert.match(CEL_SRC, /unavailable_no_cutoff/);
    assert.match(CEL_SRC, /No se usa ARR, stored ni fin de mes/);
    assert.doesNotMatch(CEL_SRC, /forecastVenta = .*arrTon/);
  });

  it("panel y chat-request ecoan conversation_state; no tocan selector PROM", () => {
    assert.match(CHAT_REQ_SRC, /conversation_state/);
    assert.match(PANEL_SRC, /conversation_state/);
    assert.doesNotMatch(PANEL_SRC, /pronostico_dias_seleccion|pronostico-dias/);
  });
});

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — identidad y precedencia", () => {
  it("origen de cutoff mapea a EXPLICIT_QUESTION / REQUEST_UPLOAD_DAY / PLANT_LAST_UPLOAD / UNAVAILABLE", () => {
    assert.equal(mapCutoffSourceToOrigin("question.explicit_cutoff"), "EXPLICIT_QUESTION");
    assert.equal(mapCutoffSourceToOrigin("req.body.upload_day"), "REQUEST_UPLOAD_DAY");
    assert.equal(mapCutoffSourceToOrigin("arr.upload_log.plant"), "PLANT_LAST_UPLOAD");
    assert.equal(mapCutoffSourceToOrigin(null), "UNAVAILABLE");
  });

  it("corte_day se deriva del cutoff resuelto; no se llama con cutoff vacío", () => {
    const run = buildForecastRunIdentity({
      plant_code: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      cutoff: CUTOFF_A,
      source: "req.body.upload_day",
    });
    assert.equal(run.corte_day, getPronosticoCorteYmdStr(2026, 8, CUTOFF_A));
    assert.equal(run.corte_day, CUTOFF_A);
    assert.equal(run.cutoff_origin, "REQUEST_UPLOAD_DAY");
    const empty = buildForecastRunIdentity({ cutoff: null, source: null, year: 2026, month: 8 });
    assert.equal(empty.corte_day, null);
    assert.equal(empty.cutoff_origin, "UNAVAILABLE");
  });

  it("cutoff explícito gana sobre request y last-upload", () => {
    const r = resolveDirectorIaEffectiveCutoff({
      question: `¿Cómo vamos al corte ${CUTOFF_B}?`,
      body: { upload_day: CUTOFF_A },
      lastUpload: { upload_day: LAST_UPLOAD_ACA },
    });
    assert.equal(r.cutoff, CUTOFF_B);
    assert.equal(r.source, "question.explicit_cutoff");
    assert.equal(parseExplicitCutoffFromQuestion("corte 19/08/2026"), CUTOFF_B);
  });

  it("request upload_day gana sobre plant-last-upload", () => {
    const r = resolveDirectorIaEffectiveCutoff({
      question: Q1,
      body: { upload_day: CUTOFF_A },
      lastUpload: { upload_day: LAST_UPLOAD_ACA },
    });
    assert.equal(r.cutoff, CUTOFF_A);
    assert.equal(r.source, "req.body.upload_day");
  });

  it("Puebla con carga posterior no cambia last-upload de Acapulco", async () => {
    const client = {
      query: async (sql, params) => {
        assert.match(sql, /UPPER\(TRIM\(plant_code\)\) = UPPER\(TRIM\(\$3::text\)\)/);
        assert.equal(params[2], "Acapulco");
        return {
          rows: [{ plant_code: "Acapulco", uploaded_day: LAST_UPLOAD_ACA, uploaded_at: "2026-08-14T10:00:00Z" }],
        };
      },
    };
    const aca = await queryArrLastUploadDayPlantAware(client, 2026, 8, "Acapulco");
    assert.equal(aca.upload_day, LAST_UPLOAD_ACA);
    assert.notEqual(aca.upload_day, LAST_UPLOAD_PUE);
  });
});

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — pack misma corrida", () => {
  it("corte A + PROM A y corte B + PROM B no se contaminan; cuatro magnitudes comparten cutoff", () => {
    const assembled = assembledAcapulco();
    const packA = buildExecutiveStatusPack({
      assembled,
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: {
        ...parityFor(RUN_A, CUTOFF_A),
        mini: {
          venta_ton: RUN_A.ventaTon,
          desc_kg: -RUN_A.comDesc,
          util_oper_importe: RUN_A.utilOperImporte,
          resultado_final_importe: RUN_A.resultadoFinalImporte,
          cutoff_date: CUTOFF_A,
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
    const packB = buildExecutiveStatusPack({
      assembled,
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: {
        ...parityFor(RUN_B, CUTOFF_B),
        mini: {
          venta_ton: RUN_B.ventaTon,
          desc_kg: -RUN_B.comDesc,
          util_oper_importe: RUN_B.utilOperImporte,
          resultado_final_importe: RUN_B.resultadoFinalImporte,
          cutoff_date: CUTOFF_B,
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
    const itemsA = forecastItems(packA);
    const itemsB = forecastItems(packB);
    const ventaA = itemsA.find((i) => i.payload && i.payload.metric === "forecast_venta_desc");
    const ventaB = itemsB.find((i) => i.payload && i.payload.metric === "forecast_venta_desc");
    const utilA = itemsA.find((i) => i.payload && i.payload.metric === "util_oper_importe");
    const resA = itemsA.find((i) => i.payload && i.payload.metric === "resultado_final_importe");
    assert.equal(ventaA.payload.venta_ton, RUN_A.ventaTon);
    assert.equal(ventaB.payload.venta_ton, RUN_B.ventaTon);
    assert.notEqual(ventaA.payload.venta_ton, ventaB.payload.venta_ton);
    assert.equal(ventaA.payload.cutoff_date, CUTOFF_A);
    assert.equal(ventaB.payload.cutoff_date, CUTOFF_B);
    assert.equal(utilA.payload.util_oper_importe, RUN_A.utilOperImporte);
    assert.equal(resA.payload.resultado_final_importe, RUN_A.resultadoFinalImporte);
    assert.equal(utilA.payload.cutoff_date, CUTOFF_A);
    assert.equal(resA.payload.cutoff_date, CUTOFF_A);
    assert.equal(ventaA.payload.governed_by, "dashboard_authoritative_mini");
    assert.match(ventaA.summary, /Forecast al corte del 5 de agosto de 2026/);
    assert.doesNotMatch(ventaA.summary, new RegExp(String(RUN_B.ventaTon)));
    assert.doesNotMatch(ventaB.summary, new RegExp(String(RUN_A.ventaTon)));
  });

  it("sin cutoff el forecast PROM es UNAVAILABLE y no usa ARR/stored", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledAcapulco(),
      trend: { ok: false },
      scope: { plant_name: "Acapulco", planta_id: 1 },
      forecastParity: {
        ok: true,
        reachable: false,
        period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: null },
        forecast: { venta_ton: DECOY.arr_venta, desc_kg: DECOY.arr_desc, cutoff_date: null },
        actual_to_date: { venta_ton: null, desc_kg: null, cutoff_date: null },
      },
    });
    const venta = forecastItems(pack).find((i) => i.payload && i.payload.metric === "forecast_venta_desc");
    assert.equal(venta.availability, AVAILABILITY.UNAVAILABLE);
    assert.equal(venta.payload.venta_ton, null);
    assert.equal(venta.payload.governed_by, "unavailable_no_cutoff");
    assert.match(venta.summary, /UNAVAILABLE/);
    assert.doesNotMatch(venta.summary, new RegExp(String(DECOY.arr_venta)));
    assert.doesNotMatch(venta.summary, new RegExp(MONTH_END));
  });
});

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — runtime chat", () => {
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

  function wireByUploadDay() {
    const miniOpts = [];
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async (_sys, user) => {
        lastPrompt = user;
        return "Respuesta con cifras del pack.";
      },
      loadPlantDiagnosisForChat: async () => assembledAcapulco(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: LAST_UPLOAD_ACA }),
      loadDashboardForecastParity: async (_pool, opts) =>
        parityFor(opts.upload_day === CUTOFF_B ? RUN_B : RUN_A, opts.upload_day),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniOpts.push(opts);
        const chosen = opts.upload_day === CUTOFF_B ? RUN_B : RUN_A;
        return miniPayload(chosen, opts.upload_day);
      },
    });
    return {
      miniOpts,
      get lastPrompt() {
        return lastPrompt;
      },
    };
  }

  it("1-3 mismo mes, corte A vs B: forecast A ≠ B y no se contaminan", async () => {
    const ctx = wireByUploadDay();
    const a = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    const b = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_B }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_A);
    assert.equal(ctx.miniOpts[1].upload_day, CUTOFF_B);
    assert.equal(a.context_meta.effective_cutoff_date, CUTOFF_A);
    assert.equal(b.context_meta.effective_cutoff_date, CUTOFF_B);
    assert.equal(a.context_meta.corte_day, CUTOFF_A);
    assert.equal(b.context_meta.corte_day, CUTOFF_B);
    assert.equal(a.context_meta.cutoff_origin, "REQUEST_UPLOAD_DAY");
    assert.equal(a.context_meta.forecast_run.plant_code, "Acapulco");
    assert.equal(a.context_meta.conversation_state.forecast_run.effective_cutoff_date, CUTOFF_A);
    assert.match(ctx.lastPrompt, new RegExp(String(RUN_B.ventaTon)));
    assert.match(ctx.lastPrompt, new RegExp(String(RUN_B.utilOperImporte)));
    assert.match(ctx.lastPrompt, new RegExp(String(RUN_B.resultadoFinalImporte)));
    assert.doesNotMatch(ctx.lastPrompt, new RegExp(String(RUN_A.ventaTon)));
    assert.doesNotMatch(ctx.lastPrompt, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
  });

  it("8 cuatro magnitudes del mini pertenecen al mismo effective cutoff", async () => {
    const ctx = wireByUploadDay();
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A }, dashboardAuth: { role: "ZP" } },
      1,
      Q2
    );
    assert.equal(result.ok, true);
    const user = ctx.lastPrompt;
    assert.match(user, new RegExp(CUTOFF_A));
    assert.match(user, new RegExp(String(RUN_A.ventaTon)));
    assert.match(user, new RegExp(String(RUN_A.utilOperImporte)));
    assert.match(user, new RegExp(String(RUN_A.resultadoFinalImporte)));
    assert.equal(result.context_meta.forecast_run.effective_cutoff_date, CUTOFF_A);
    assert.equal(result.context_meta.forecast_run.corte_day, CUTOFF_A);
  });

  it("7 ausencia total → UNAVAILABLE y mini no corre", async () => {
    const miniOpts = [];
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async (_sys, user) => {
        lastPrompt = user;
        return "ok";
      },
      loadPlantDiagnosisForChat: async () => assembledAcapulco(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadDashboardForecastParity: async (_pool, opts) => {
        assert.equal(opts.upload_day, null);
        return {
          ok: true,
          reachable: false,
          period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: null },
          forecast: { venta_ton: DECOY.arr_venta, desc_kg: DECOY.arr_desc, cutoff_date: null },
          actual_to_date: { venta_ton: null, desc_kg: null, cutoff_date: null },
        };
      },
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniOpts.push(opts);
        return miniPayload(RUN_A, opts.upload_day);
      },
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.effective_cutoff_date, null);
    assert.equal(result.context_meta.cutoff_origin, "UNAVAILABLE");
    assert.equal(result.context_meta.mini_loader_invoked, false);
    assert.equal(miniOpts.length, 0);
    assert.match(lastPrompt, /UNAVAILABLE/);
    assert.doesNotMatch(lastPrompt, new RegExp(MONTH_END));
    assert.doesNotMatch(lastPrompt, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
  });

  it("9-10 follow-up «qué fecha de corte usaste» recupera metadata de la corrida, no UNKNOWN", async () => {
    const ctx = wireByUploadDay();
    const first = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(first.ok, true);
    const follow = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: first.context_meta.conversation_state,
          history: [
            { role: "user", content: Q1 },
            { role: "assistant", content: first.answer },
          ],
        },
        dashboardAuth: { role: "ZP" },
      },
      1,
      "¿Qué fecha de corte usaste para calcular esa proyección?"
    );
    assert.equal(follow.ok, true);
    assert.equal(follow.context_meta.mode, "cutoff_explain");
    assert.equal(follow.context_meta.openai_called, false);
    assert.match(follow.answer, /Usé el corte del 5 de agosto de 2026/);
    assert.doesNotMatch(follow.answer, /No pude anclar esta frase|Indica si quieres el diagnóstico/);
    assert.equal(follow.context_meta.forecast_run.effective_cutoff_date, CUTOFF_A);
    assert.equal(ctx.miniOpts.length, 1);
  });

  it("11 no se usa el valor numérico del forecast para adivinar fecha", async () => {
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async () => "no debería llamarse",
      loadPlantDiagnosisForChat: async () => assembledAcapulco(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadDashboardForecastParity: async () => ({ ok: true, reachable: false }),
      loadIgfForecastMiniPayload: async () => miniPayload(RUN_A, CUTOFF_A),
    });
    const follow = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      `¿Con qué corte calculaste las ${NUMERIC_DECOY} toneladas?`
    );
    assert.equal(follow.ok, true);
    assert.equal(follow.context_meta.mode, "cutoff_explain");
    assert.doesNotMatch(follow.answer, /27 de agosto/);
    assert.doesNotMatch(follow.answer, /2026-08-27/);
    assert.doesNotMatch(follow.answer, /Usé el corte del/);
    assert.match(follow.answer, /No adivino la fecha a partir de un número/);
  });

  it("follow-up con número conserva metadata real si existe forecast_run", async () => {
    const firstState = sanitizeEchoedState(
      {
        parent_intent: "plant_diagnosis",
        planta_id: 1,
        forecast_run: {
          plant_code: "Acapulco",
          year: 2026,
          month: 8,
          upload_day: CUTOFF_B,
          effective_cutoff_date: CUTOFF_B,
          corte_day: CUTOFF_B,
          cutoff_origin: "REQUEST_UPLOAD_DAY",
        },
      },
      1
    );
    const follow = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", conversation_state: firstState }, dashboardAuth: { role: "ZP" } },
      1,
      `¿Con qué corte calculaste las ${NUMERIC_DECOY} toneladas?`
    );
    assert.match(follow.answer, /Usé el corte del 19 de agosto de 2026/);
    assert.doesNotMatch(follow.answer, /27 de agosto/);
  });
});

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — explain + transport", () => {
  it("isCutoffExplainQuestion cubre las cuatro frases contractuales y no «cómo vamos»", () => {
    assert.equal(isCutoffExplainQuestion("¿Qué fecha de corte usaste?"), true);
    assert.equal(isCutoffExplainQuestion("¿Con qué corte calculaste las 1491.50 toneladas?"), true);
    assert.equal(isCutoffExplainQuestion("¿De qué fecha es esa proyección?"), true);
    assert.equal(isCutoffExplainQuestion("¿Qué fecha estás usando para el forecast?"), true);
    assert.equal(isCutoffExplainQuestion(Q1), false);
    assert.equal(isCutoffExplainQuestion(Q2), false);
  });

  it("formatForecastCutoffDateEs no hardcodea 27 de agosto", () => {
    assert.equal(formatForecastCutoffDateEs("2026-08-05"), "5 de agosto de 2026");
    assert.equal(formatForecastCutoffDateEs("2026-01-02"), "2 de enero de 2026");
    assert.equal(formatForecastCutoffDateEs(null), null);
  });

  it("sanitizeForecastRun conserva identidad y el body de chat reenvía conversation_state", () => {
    const run = sanitizeForecastRun({
      plant_code: "Acapulco",
      year: 2026,
      month: 8,
      upload_day: CUTOFF_A,
      effective_cutoff_date: CUTOFF_A,
      corte_day: CUTOFF_A,
      cutoff_origin: "PLANT_LAST_UPLOAD",
    });
    assert.equal(run.cutoff_origin, "PLANT_LAST_UPLOAD");
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: "¿Qué fecha de corte usaste?",
      conversation_state: { parent_intent: "plant_diagnosis", forecast_run: run },
    });
    assert.equal(body.conversation_state.forecast_run.effective_cutoff_date, CUTOFF_A);
  });
});

describe("SPRINT1 PROM-CUTOFF-RUNTIME-PARITY — Golden Set routing", () => {
  it("Q1–Q3 van a CEL; Q4 commercial_trend", () => {
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
