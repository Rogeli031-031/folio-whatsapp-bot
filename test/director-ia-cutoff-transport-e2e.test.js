"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  buildDirectorIaChatBody,
  resolveDirectorIaUploadDayFromSearch,
} = require("../frontend-dashboard/modules/director-ia/lib/chat-request");
const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");

const ROOT = path.join(__dirname, "..");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatPanel.tsx"),
  "utf8"
);
const API_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "lib", "api.ts"),
  "utf8"
);

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const CATALOG = [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }];

const CUTOFF_A = "2026-08-12";
const CUTOFF_B = "2026-08-20";
const LAST_UPLOAD = "2026-08-18";
const MONTH_END_INVENTED = "2026-08-31";

const RUN_A = {
  cutoff_date: CUTOFF_A,
  forecast_venta: 811.25,
  forecast_desc: -2.21,
  util: 111001,
  resultado: -222002,
  actual_venta: 501.1,
};

const RUN_B = {
  cutoff_date: CUTOFF_B,
  forecast_venta: 922.5,
  forecast_desc: -3.08,
  util: 333003,
  resultado: -444004,
  actual_venta: 640.4,
};

const DECOY = {
  arr_venta: 9991,
  arr_desc: 0.91,
  stored_venta: 8882,
  stored_desc: 0.82,
};

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" };
}

function assembledWithDecoy() {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: DECOY.arr_venta, desc_kg: DECOY.arr_desc, load_error: null },
    igfRaw: {
      version_id: 11,
      version_number: 3,
      row: { empresa: "E3", venta_ton: DECOY.stored_venta },
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

function parityForRun(run, extras = {}) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: run.cutoff_date },
    forecast: {
      venta_ton: DECOY.arr_venta,
      desc_kg: DECOY.arr_desc,
      cutoff_date: run.cutoff_date,
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: {
      venta_ton: run.actual_venta,
      desc_kg: null,
      cutoff_date: run.cutoff_date,
      truth_semantics: "ACTUAL_TO_DATE",
    },
    ...extras,
  };
}

describe("SPRINT1 CUTOFF-TRANSPORT-E2E — traza de pérdida", () => {
  it("la petición real de Acciones no lleva upload_day en la URL", () => {
    assert.equal(resolveDirectorIaUploadDayFromSearch(""), null);
    assert.equal(resolveDirectorIaUploadDayFromSearch("?planta_id=1"), null);
    assert.equal(resolveDirectorIaUploadDayFromSearch("/acciones"), null);
  });

  it("DirectorIaChatPanel y api.ts usan el helper de transporte", () => {
    assert.match(PANEL_SRC, /resolveDirectorIaUploadDayFromSearch/);
    assert.match(PANEL_SRC, /uploadDayProp/);
    assert.match(API_SRC, /buildDirectorIaChatBody/);
    assert.doesNotMatch(API_SRC, /require\(["'].\/chat-request["']\)/);
  });

  it("el backend no invoca mini autoritativo si el cutoff efectivo es nulo", () => {
    assert.match(CHAT_SRC, /if \(typeof loadMini === "function" && chatDeps\.pool && resolvedCutoff\)/);
    assert.match(CHAT_SRC, /requested_upload_day/);
    assert.match(CHAT_SRC, /effective_cutoff_date/);
    assert.match(CHAT_SRC, /authoritative_mini_available/);
    assert.match(CHAT_SRC, /fallback_used/);
  });
});

describe("SPRINT1 CUTOFF-TRANSPORT-E2E — 1 request boundary", () => {
  it("URL/context A produce body POST /chat con upload_day A", () => {
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      search: `?planta_id=1&upload_day=${CUTOFF_A}`,
    });
    assert.equal(body.upload_day, CUTOFF_A);
    assert.equal(body.planta_id, 1);
    assert.equal(body.question, Q1);
  });

  it("URL/context B produce body POST /chat con upload_day B y A != B", () => {
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      search: `/acciones?upload_day=${CUTOFF_B}`,
    });
    assert.equal(body.upload_day, CUTOFF_B);
    assert.notEqual(CUTOFF_A, CUTOFF_B);
    assert.notEqual(body.upload_day, CUTOFF_A);
  });

  it("prop explícita gana sobre search; sin ninguno el body omite upload_day", () => {
    const fromProp = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      upload_day: CUTOFF_A,
      search: `?upload_day=${CUTOFF_B}`,
    });
    assert.equal(fromProp.upload_day, CUTOFF_A);
    const empty = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      search: "/acciones?token=x",
    });
    assert.equal(Object.prototype.hasOwnProperty.call(empty, "upload_day"), false);
  });
});

describe("SPRINT1 CUTOFF-TRANSPORT-E2E — 2 HTTP/chat y 3 decoy", () => {
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

  function wire(run, lastUploadDay) {
    let lastPrompt = null;
    const miniOpts = [];
    const lastUploadCalls = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (sys, user) => {
        lastPrompt = { sys, user };
        return "Respuesta con cifras del pack.";
      },
      loadPlantDiagnosisForChat: async () => assembledWithDecoy(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async (_pool, year, month) => {
        lastUploadCalls.push({ year, month });
        return { upload_day: lastUploadDay };
      },
      loadDashboardForecastParity: async (_pool, opts) =>
        parityForRun({ ...run, cutoff_date: opts.upload_day || run.cutoff_date }),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        miniOpts.push(opts);
        const chosen = opts.upload_day === CUTOFF_B ? RUN_B : RUN_A;
        return {
          ok: true,
          year: 2026,
          month: 8,
          upload_day: opts.upload_day,
          rows: [
            {
              empresa: "Acapulco",
              ventaTon: chosen.forecast_venta,
              comDesc: Math.abs(chosen.forecast_desc),
              utilOperImporte: chosen.util,
              resultadoFinalImporte: chosen.resultado,
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
      get lastUploadCalls() {
        return lastUploadCalls;
      },
    };
  }

  async function askHow(body) {
    return askDirectorIa(
      { body: { planta_nombre: "Acapulco", ...body }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
  }

  it("body upload_day A → mini A, prompt con corte A y valores A", async () => {
    const ctx = wire(RUN_A, null);
    const result = await askHow({ upload_day: CUTOFF_A });
    assert.equal(result.ok, true);
    assert.equal(ctx.miniOpts.length, 1);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_A);
    assert.equal(result.context_meta.requested_upload_day, CUTOFF_A);
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_A);
    assert.equal(result.context_meta.authoritative_mini_available, true);
    assert.equal(result.context_meta.fallback_used, false);
    assert.equal(result.context_meta.mini_loader_invoked, true);
    assert.equal(ctx.lastUploadCalls.length, 0);
    const user = ctx.lastPrompt.user;
    assert.match(user, new RegExp(CUTOFF_A));
    assert.match(user, new RegExp(String(RUN_A.forecast_venta)));
    assert.match(user, new RegExp(String(RUN_A.forecast_desc)));
    assert.match(user, new RegExp(String(RUN_A.util)));
    assert.match(user, new RegExp(String(RUN_A.resultado)));
    assert.doesNotMatch(user, new RegExp(CUTOFF_B));
    assert.doesNotMatch(user, new RegExp(String(RUN_B.forecast_venta)));
    assert.doesNotMatch(user, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
  });

  it("body upload_day B → mini B, prompt con corte B y valores B", async () => {
    const ctx = wire(RUN_B, null);
    const result = await askHow({ upload_day: CUTOFF_B });
    assert.equal(result.ok, true);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_B);
    assert.equal(result.context_meta.requested_upload_day, CUTOFF_B);
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_B);
    const user = ctx.lastPrompt.user;
    assert.match(user, new RegExp(CUTOFF_B));
    assert.match(user, new RegExp(String(RUN_B.forecast_venta)));
    assert.match(user, new RegExp(String(RUN_B.forecast_desc)));
    assert.match(user, new RegExp(String(RUN_B.util)));
    assert.match(user, new RegExp(String(RUN_B.resultado)));
    assert.doesNotMatch(user, new RegExp(CUTOFF_A));
    assert.doesNotMatch(user, new RegExp(String(RUN_A.forecast_venta)));
  });

  it("decoy ARR/stored B no gobierna el forecast si mini A está AVAILABLE", async () => {
    const ctx = wire(RUN_A, null);
    await askHow({ upload_day: CUTOFF_A });
    const user = ctx.lastPrompt.user;
    assert.match(user, new RegExp(String(RUN_A.forecast_venta)));
    assert.match(user, /dashboard_authoritative_mini|FORECAST_PROJECTION mini IGF/);
    assert.doesNotMatch(user, new RegExp(`venta_ton=${DECOY.arr_venta}\\b`));
    assert.match(user, new RegExp(String(DECOY.stored_venta)));
    assert.match(user, /FORECAST_STORED|no es TARGET/);
  });
});

describe("SPRINT1 CUTOFF-TRANSPORT-E2E — 4 absence", () => {
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

  it("sin upload_day usa last-upload-day y no inventa fin de mes", async () => {
    const miniOpts = [];
    let lastPrompt = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (_sys, user) => {
        lastPrompt = user;
        return "ok";
      },
      loadPlantDiagnosisForChat: async () => assembledWithDecoy(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: LAST_UPLOAD }),
      loadDashboardForecastParity: async (_pool, opts) => {
        assert.equal(opts.upload_day, LAST_UPLOAD);
        return parityForRun({ ...RUN_A, cutoff_date: LAST_UPLOAD });
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
              ventaTon: RUN_A.forecast_venta,
              comDesc: Math.abs(RUN_A.forecast_desc),
              utilOperImporte: RUN_A.util,
              resultadoFinalImporte: RUN_A.resultado,
            },
          ],
        };
      },
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.requested_upload_day, null);
    assert.equal(result.context_meta.effective_cutoff_date, LAST_UPLOAD);
    assert.equal(result.context_meta.cutoff_source, "arr.upload_log");
    assert.equal(result.context_meta.mini_loader_invoked, true);
    assert.equal(miniOpts[0].upload_day, LAST_UPLOAD);
    assert.notEqual(miniOpts[0].upload_day, MONTH_END_INVENTED);
    assert.match(lastPrompt, new RegExp(LAST_UPLOAD));
    assert.doesNotMatch(lastPrompt, new RegExp(MONTH_END_INVENTED));
  });

  it("sin upload_day y sin last-upload el cutoff queda no disponible", async () => {
    const miniOpts = [];
    let lastPrompt = null;
    let lastParityOpts = null;
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (_sys, user) => {
        lastPrompt = user;
        return "ok";
      },
      loadPlantDiagnosisForChat: async () => assembledWithDecoy(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadDashboardForecastParity: async (_pool, opts) => {
        lastParityOpts = opts;
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
        return { ok: true, rows: [] };
      },
    });
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.requested_upload_day, null);
    assert.equal(result.context_meta.effective_cutoff_date, null);
    assert.equal(result.context_meta.authoritative_mini_available, false);
    assert.equal(result.context_meta.fallback_used, true);
    assert.equal(result.context_meta.mini_loader_invoked, false);
    assert.equal(miniOpts.length, 0);
    assert.equal(lastParityOpts.upload_day, null);
    assert.doesNotMatch(lastPrompt, new RegExp(MONTH_END_INVENTED));
    assert.match(lastPrompt, /corte no resuelto|n\/d|UNAVAILABLE|No hay cifra de proyección/i);
  });
});

describe("SPRINT1 CUTOFF-TRANSPORT-E2E — Golden Set", () => {
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

  it("cambio de cutoff A → B cambia el forecast gobernante", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    const prompts = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (_sys, user) => {
        prompts.push(user);
        return "ok";
      },
      loadPlantDiagnosisForChat: async () => assembledWithDecoy(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async () => ({ upload_day: null }),
      loadDashboardForecastParity: async (_pool, opts) =>
        parityForRun(opts.upload_day === CUTOFF_B ? RUN_B : RUN_A),
      loadIgfForecastMiniPayload: async (_pool, opts) => {
        const chosen = opts.upload_day === CUTOFF_B ? RUN_B : RUN_A;
        return {
          ok: true,
          year: 2026,
          month: 8,
          upload_day: opts.upload_day,
          rows: [
            {
              empresa: "Acapulco",
              ventaTon: chosen.forecast_venta,
              comDesc: Math.abs(chosen.forecast_desc),
              utilOperImporte: chosen.util,
              resultadoFinalImporte: chosen.resultado,
            },
          ],
        };
      },
    });
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_A }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_B }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.match(prompts[0], new RegExp(CUTOFF_A));
    assert.match(prompts[0], new RegExp(String(RUN_A.forecast_venta)));
    assert.match(prompts[1], new RegExp(CUTOFF_B));
    assert.match(prompts[1], new RegExp(String(RUN_B.forecast_venta)));
    assert.doesNotMatch(prompts[1], new RegExp(String(RUN_A.forecast_venta)));
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
});
