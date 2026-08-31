"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { assemblePlantDiagnosisEvidence } = require("../lib/director-ia-plant-diagnosis");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
  buildExecutiveStatusPack,
} = require("../lib/director-ia-conversational-executive-layer");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");
const {
  resolveDirectorIaPlantCode,
  parseExplicitCutoffFromQuestion,
  resolveDirectorIaEffectiveCutoff,
  queryArrLastUploadDayPlantAware,
} = require("../lib/director-ia-chat");

const ROOT = path.join(__dirname, "..");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const CUTOFF_A = "2026-08-12";
const CUTOFF_B = "2026-08-20";
const CUTOFF_C = "2026-08-27";

const RUN_A = {
  cutoff_date: CUTOFF_A,
  forecast_venta: 811.25,
  forecast_desc: -2.21,
  util: 111001,
  resultado: -222002,
  actual_venta: 501.1,
};

const CATALOG = [
  { planta_id: 1, nombre: "Acapulco", clave: "E3" },
  { planta_id: 2, nombre: "Puebla", clave: "E1" },
];

function plantAcapulco() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "Acapulco" };
}

function plantPuebla() {
  return { planta_id: 2, planta_nombre: "Puebla", plant_code: "Puebla" };
}

function assembledFor(plant) {
  return assemblePlantDiagnosisEvidence({
    plant,
    year: 2026,
    month: 8,
    actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: 9991, desc_kg: 0.91, load_error: null },
    igfRaw: {
      version_id: 11,
      version_number: 3,
      row: { empresa: plant.plant_code, venta_ton: 8882 },
      composition: {
        ok: true,
        lines: [
          { line_key: "venta_ton", value: 8882, unit: "ton" },
          { line_key: "com_desc_kg", value: 0.82, unit: "$/kg" },
        ],
      },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

function parityFor(run) {
  return {
    ok: true,
    reachable: true,
    period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: run.cutoff_date },
    forecast: {
      venta_ton: 9991,
      desc_kg: 0.91,
      cutoff_date: run.cutoff_date,
      truth_semantics: "FORECAST_PROJECTION",
    },
    actual_to_date: {
      venta_ton: run.actual_venta,
      desc_kg: null,
      cutoff_date: run.cutoff_date,
      truth_semantics: "ACTUAL_TO_DATE",
    },
  };
}

describe("SPRINT1 PLANT-AWARE-CUTOFF — resolución plant_code", () => {
  it("planta_id → assembled.plant.plant_code es el código ARR ya resuelto, sin mapping nuevo", () => {
    const assembled = assembledFor(plantAcapulco());
    assert.equal(resolveDirectorIaPlantCode(assembled), "Acapulco");
    assert.equal(assembled.plant.planta_id, 1);
    assert.equal(assembled.plant.planta_nombre, "Acapulco");
    assert.match(CHAT_SRC, /getPlantCodeArrFromPlantaNombre|assembled\.plant\.plant_code/);
    assert.match(SERVER_SRC, /async function getPlantCodeArrFromPlantaNombre/);
    assert.match(SERVER_SRC, /arr\.provincia_plants/);
  });

  it("sin plant_code no se consulta last-upload global", () => {
    const assembled = assembledFor({ planta_id: 1, planta_nombre: "Acapulco", plant_code: null });
    assert.equal(resolveDirectorIaPlantCode(assembled), null);
  });

  it("la inyección Director IA usa query plant-aware; GET Dashboard last-upload-day no se reescribe", () => {
    assert.match(SERVER_SRC, /queryArrLastUploadDayPlantAware/);
    assert.match(CHAT_SRC, /UPPER\(TRIM\(plant_code\)\) = UPPER\(TRIM\(\$3::text\)\)/);
    const dash = SERVER_SRC.match(/app\.get\("\/api\/arr\/last-upload-day"[\s\S]*?app\.get\("/);
    assert.ok(dash);
    assert.doesNotMatch(dash[0], /AND UPPER\(TRIM\(plant_code\)\)/);
  });
});

describe("SPRINT1 PLANT-AWARE-CUTOFF — 1 aislamiento por planta", () => {
  it("query plant-aware ignora uploaded_at posterior de otra planta", async () => {
    const captured = [];
    const client = {
      query: async (sql, params) => {
        captured.push({ sql, params });
        assert.match(sql, /arr\.upload_log/);
        assert.match(sql, /UPPER\(TRIM\(plant_code\)\) = UPPER\(TRIM\(\$3::text\)\)/);
        assert.equal(params[0], 2026);
        assert.equal(params[1], 8);
        assert.equal(params[2], "Acapulco");
        return {
          rows: [{ plant_code: "Acapulco", uploaded_day: CUTOFF_A, uploaded_at: "2026-08-12T10:00:00Z" }],
        };
      },
    };
    const aca = await queryArrLastUploadDayPlantAware(client, 2026, 8, "Acapulco");
    assert.equal(aca.upload_day, CUTOFF_A);
    assert.equal(aca.plant_code, "Acapulco");
    const pueblaClient = {
      query: async (_sql, params) => {
        assert.equal(params[2], "Puebla");
        return {
          rows: [{ plant_code: "Puebla", uploaded_day: CUTOFF_B, uploaded_at: "2026-08-20T18:00:00Z" }],
        };
      },
    };
    const pue = await queryArrLastUploadDayPlantAware(pueblaClient, 2026, 8, "Puebla");
    assert.equal(pue.upload_day, CUTOFF_B);
    assert.notEqual(aca.upload_day, pue.upload_day);
  });

  it("sin plant_code la query no corre y el cutoff queda null", async () => {
    let queried = false;
    const client = {
      query: async () => {
        queried = true;
        return { rows: [{ uploaded_day: CUTOFF_B }] };
      },
    };
    const out = await queryArrLastUploadDayPlantAware(client, 2026, 8, null);
    assert.equal(queried, false);
    assert.equal(out.upload_day, null);
  });
});

describe("SPRINT1 PLANT-AWARE-CUTOFF — 2 cutoff explícito gana", () => {
  it("pregunta YYYY-MM-DD gana sobre body y last-upload", () => {
    const r = resolveDirectorIaEffectiveCutoff({
      question: `¿Cómo íbamos al ${CUTOFF_C}?`,
      body: { upload_day: CUTOFF_A },
      lastUpload: { upload_day: CUTOFF_B },
    });
    assert.equal(r.cutoff, CUTOFF_C);
    assert.equal(r.source, "question.explicit_cutoff");
  });

  it("body upload_day C gana sobre last-upload A/B", () => {
    const r = resolveDirectorIaEffectiveCutoff({
      question: Q1,
      body: { upload_day: CUTOFF_C },
      lastUpload: { upload_day: CUTOFF_A },
    });
    assert.equal(r.cutoff, CUTOFF_C);
    assert.equal(r.source, "req.body.upload_day");
  });

  it("parse explícito acepta ISO y DMY; no parsea '27 de agosto' sin año", () => {
    assert.equal(parseExplicitCutoffFromQuestion("corte 2026-08-27"), CUTOFF_C);
    assert.equal(parseExplicitCutoffFromQuestion("al 27/08/2026"), CUTOFF_C);
    assert.equal(parseExplicitCutoffFromQuestion("¿Cómo íbamos al 27 de agosto?"), null);
  });
});

describe("SPRINT1 PLANT-AWARE-CUTOFF — 3 ausencia y 4 E2E", () => {
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

  function logsByPlant() {
    return {
      Acapulco: { upload_day: CUTOFF_A, uploaded_at: "2026-08-12T10:00:00Z" },
      Puebla: { upload_day: CUTOFF_B, uploaded_at: "2026-08-28T18:00:00Z" },
    };
  }

  function wire(assembled, lastMap) {
    let lastPrompt = null;
    const miniOpts = [];
    const lastCalls = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: CATALOG,
      openaiChat: async (_sys, user) => {
        lastPrompt = user;
        return "ok";
      },
      loadPlantDiagnosisForChat: async () => assembled,
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async (_pool, year, month, opts) => {
        lastCalls.push({ year, month, plant_code: opts && opts.plant_code });
        const row = lastMap[opts && opts.plant_code];
        return { upload_day: row ? row.upload_day : null, plant_code: opts && opts.plant_code };
      },
      loadDashboardForecastParity: async (_pool, opts) =>
        parityFor({ ...RUN_A, cutoff_date: opts.upload_day || null }),
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
    return {
      get lastPrompt() {
        return lastPrompt;
      },
      get miniOpts() {
        return miniOpts;
      },
      get lastCalls() {
        return lastCalls;
      },
    };
  }

  it("1 Acapulco resuelve A aunque Puebla tenga uploaded_at posterior", async () => {
    const ctx = wire(assembledFor(plantAcapulco()), logsByPlant());
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(ctx.lastCalls[0].plant_code, "Acapulco");
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_A);
    assert.equal(result.context_meta.cutoff_source, "arr.upload_log.plant");
    assert.equal(result.context_meta.plant_code, "Acapulco");
    assert.notEqual(result.context_meta.effective_cutoff_date, CUTOFF_B);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_A);
  });

  it("2 body cutoff C gana sobre last-upload A y B", async () => {
    const ctx = wire(assembledFor(plantAcapulco()), logsByPlant());
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", upload_day: CUTOFF_C }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_C);
    assert.equal(result.context_meta.cutoff_source, "req.body.upload_day");
    assert.equal(ctx.lastCalls.length, 0);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_C);
  });

  it("3 sin carga de la planta: UNAVAILABLE y no se llama mini", async () => {
    const ctx = wire(assembledFor(plantAcapulco()), {});
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.context_meta.effective_cutoff_date, null);
    assert.equal(result.context_meta.mini_loader_invoked, false);
    assert.equal(result.context_meta.fallback_used, true);
    assert.equal(ctx.miniOpts.length, 0);
    assert.doesNotMatch(ctx.lastPrompt, /2026-08-31/);
  });

  it("4 ¿Cómo vamos? transporta el mismo cutoff a mini, CEL y prompt", async () => {
    const ctx = wire(assembledFor(plantAcapulco()), logsByPlant());
    const result = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_A);
    const user = ctx.lastPrompt;
    assert.match(user, new RegExp(CUTOFF_A));
    assert.match(user, /effective_cutoff_date=2026-08-12/);
    assert.match(user, new RegExp(String(RUN_A.forecast_venta)));
    assert.match(user, new RegExp(String(RUN_A.forecast_desc)));
    assert.match(user, new RegExp(String(RUN_A.util)));
    assert.match(user, new RegExp(String(RUN_A.resultado)));
    const cutoffs = user.match(/cutoff_date=2026-08-12/g) || [];
    assert.ok(cutoffs.length >= 4, `mismas magnitudes deben llevar ${CUTOFF_A}, found ${cutoffs.length}`);
    assert.doesNotMatch(user, new RegExp(CUTOFF_B));
  });
});

describe("SPRINT1 PLANT-AWARE-CUTOFF — Golden Set + mismo cutoff en pack", () => {
  it("Q1–Q3 van a CEL; Q4 commercial_trend", () => {
    for (const q of [Q1, Q2, Q3]) {
      const need = resolveExecutiveNeed(q);
      const planned = planDirectorIaQuestion(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true, q);
    }
    assert.equal(isCommercialTrendQuestion(Q4), true);
  });

  it("venta actual, forecast, desc, util y resultado comparten effective_cutoff_date", () => {
    const pack = buildExecutiveStatusPack({
      assembled: assembledFor(plantAcapulco()),
      trend: { ok: false },
      scope: { scope_source: "explicit_plant", planta_id: 1, plant_name: "Acapulco" },
      forecastParity: {
        ...parityFor(RUN_A),
        mini: {
          venta_ton: RUN_A.forecast_venta,
          desc_kg: RUN_A.forecast_desc,
          util_oper_importe: RUN_A.util,
          resultado_final_importe: RUN_A.resultado,
          cutoff_date: CUTOFF_A,
          source: "computeIgfForecastMiniPayload",
        },
      },
    });
    assert.equal(pack.effective_cutoff_date, CUTOFF_A);
    const wanted = ["venta_ton", "forecast_venta_desc", "actual_desc_kg", "util_oper_importe", "resultado_final_importe"];
    for (const metric of wanted) {
      const item = (pack.items || []).find((i) => i.payload && i.payload.metric === metric);
      assert.ok(item, metric);
      if (metric === "actual_desc_kg") {
        assert.equal(item.payload.cutoff_date, CUTOFF_A);
        continue;
      }
      assert.equal(item.payload.cutoff_date, CUTOFF_A, metric);
    }
  });
});
