"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { buildIgfForecastAccionesHref } = require("../frontend-dashboard/lib/igf-to-acciones-href");
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
const IGF_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"),
  "utf8"
);
const ACCIONES_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "app", "acciones", "page.tsx"),
  "utf8"
);
const MODAL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatModal.tsx"),
  "utf8"
);
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatPanel.tsx"),
  "utf8"
);
const HREF_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "lib", "igf-to-acciones-href.js"),
  "utf8"
);
const CHAT_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-chat.js"), "utf8");

const Q1 = "¿Cómo vamos?";
const Q2 = "¿Cómo va la rentabilidad de Acapulco este mes?";
const Q3 = "¿Cómo va el descuento de Acapulco este mes?";
const Q4 = "¿Cómo van CASA y Comisionista en Acapulco este mes?";

const TOKEN = "tok-igf-acciones";
const CUTOFF_D = "2026-08-27";
const CUTOFF_B = "2026-08-12";
const MONTH_END = "2026-08-31";

function plant() {
  return { planta_id: 1, planta_nombre: "Acapulco", plant_code: "Acapulco" };
}

function assembledAcapulco() {
  return assemblePlantDiagnosisEvidence({
    plant: plant(),
    year: 2026,
    month: 8,
    actionRegisterRaw: { period: { kind: "snapshot", as_of: "2026-08-23" }, payload: { summary: { overdue: 0 } } },
    dicfRaw: { period: { kind: "action_dates" }, payload: { actions: [] } },
    bitacoraRaw: { period: { kind: "bitacora_window", months: 3, from: "2026-06" }, payload: { sessions: [] } },
    arrRaw: { venta_ton: 9991, desc_kg: 0.91, load_error: null },
    igfRaw: {
      version_id: 11,
      composition: { ok: true, lines: [{ line_key: "venta_ton", value: 8882, unit: "ton" }] },
    },
    commercialStateRaw: {
      period: { kind: "materialized_cache", yyyy_mm: "2026-07" },
      payload: { materialized: true, counts: {}, clients_shown: [] },
    },
  });
}

describe("SPRINT1 IGF-TO-ACTIONS-CUTOFF-TRANSPORT — contrato de transporte", () => {
  it("IGF Forecast usa el helper; no hardcodea /acciones?t= sin upload_day", () => {
    assert.match(IGF_SRC, /buildIgfForecastAccionesHref/);
    assert.match(IGF_SRC, /accionesPageHref/);
    assert.doesNotMatch(IGF_SRC, /href=\{token \? `\/acciones\?t=/);
    assert.match(HREF_SRC, /No inventa fecha/);
    assert.doesNotMatch(HREF_SRC, /pronostico_dias|MAX\(corte_day\)|MAX\(updated_at\)|\/api\/arr\/last-upload-day/);
  });

  it("/acciones entrega searchParams.upload_day al modal; panel/API reutilizan el transporte existente", () => {
    assert.match(ACCIONES_SRC, /searchParams\.get\("upload_day"\)/);
    assert.match(ACCIONES_SRC, /uploadDay=/);
    assert.match(MODAL_SRC, /uploadDay=\{uploadDay\}/);
    assert.match(PANEL_SRC, /uploadDayProp/);
    assert.match(PANEL_SRC, /buildDirectorIaChatBody|fetchDirectorIaChat/);
  });

  it("no consulta last-upload global ni cambia fórmula PROM", () => {
    assert.doesNotMatch(HREF_SRC, /\/api\/arr\/last-upload-day/);
    assert.doesNotMatch(CHAT_SRC, /function computeIgfForecastMiniPayload/);
    assert.match(CHAT_SRC, /source: "req\.body\.upload_day"/);
    assert.match(CHAT_SRC, /REQUEST_UPLOAD_DAY/);
  });
});

describe("SPRINT1 IGF-TO-ACTIONS-CUTOFF-TRANSPORT — href IGF → /acciones", () => {
  it("1 corte D se preserva exactamente en la URL", () => {
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_D });
    assert.match(href, /^\/acciones\?/);
    assert.equal(resolveDirectorIaUploadDayFromSearch(href), CUTOFF_D);
    assert.match(href, /upload_day=2026-08-27/);
  });

  it("2 corte B no reutiliza D", () => {
    const hrefB = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_B });
    assert.equal(resolveDirectorIaUploadDayFromSearch(hrefB), CUTOFF_B);
    assert.notEqual(resolveDirectorIaUploadDayFromSearch(hrefB), CUTOFF_D);
  });

  it("3 parámetros t y back se conservan", () => {
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_D });
    const q = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    assert.equal(q.get("t"), TOKEN);
    assert.equal(q.get("back"), "1");
    assert.equal(q.get("upload_day"), CUTOFF_D);
  });

  it("10 sin upload_day no inventa fecha ni fin de mes", () => {
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: "" });
    assert.equal(resolveDirectorIaUploadDayFromSearch(href), null);
    assert.doesNotMatch(href, /upload_day=/);
    assert.doesNotMatch(href, new RegExp(MONTH_END));
    const junk = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: "27 de agosto" });
    assert.doesNotMatch(junk, /upload_day=/);
    const noToken = buildIgfForecastAccionesHref({ token: null, upload_day: CUTOFF_D });
    assert.equal(noToken, "/acciones");
  });
});

describe("SPRINT1 IGF-TO-ACTIONS-CUTOFF-TRANSPORT — request boundary", () => {
  it("4-7 URL D → modal/panel/body conservan D sin convertirlo", () => {
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_D });
    const fromSearch = resolveDirectorIaUploadDayFromSearch(href);
    assert.equal(fromSearch, CUTOFF_D);
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      search: href,
      upload_day: fromSearch,
    });
    assert.equal(body.upload_day, CUTOFF_D);
    assert.equal(body.question, Q1);
  });
});

describe("SPRINT1 IGF-TO-ACTIONS-CUTOFF-TRANSPORT — backend REQUEST_UPLOAD_DAY", () => {
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

  function wire() {
    const lastUploadCalls = [];
    const miniOpts = [];
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      plantCatalog: [{ planta_id: 1, nombre: "Acapulco", clave: "E3" }],
      openaiChat: async () => "ok",
      loadPlantDiagnosisForChat: async () => assembledAcapulco(),
      loadCommercialTrendForChat: async () => ({ ok: false }),
      loadArrLastUploadDay: async (_pool, year, month, opts) => {
        lastUploadCalls.push({ year, month, plant_code: opts && opts.plant_code });
        return { upload_day: "2026-08-01" };
      },
      loadDashboardForecastParity: async (_pool, opts) => ({
        ok: true,
        reachable: true,
        period: { year: 2026, month: 8, yyyy_mm: "2026-08", cutoff_date: opts.upload_day },
        forecast: { venta_ton: 611.25, desc_kg: -1.8, cutoff_date: opts.upload_day },
        actual_to_date: { venta_ton: 401.1, cutoff_date: opts.upload_day },
      }),
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
              ventaTon: 611.25,
              comDesc: 1.8,
              utilOperImporte: 101001,
              resultadoFinalImporte: -202002,
            },
          ],
        };
      },
    });
    return { lastUploadCalls, miniOpts };
  }

  it("8 y regression: IGF D → /acciones → ¿Cómo vamos? conserva identidad D como REQUEST_UPLOAD_DAY", async () => {
    const ctx = wire();
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_D });
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      planta_nombre: "Acapulco",
      search: href,
    });
    assert.equal(body.upload_day, CUTOFF_D);
    const result = await askDirectorIa(
      { body, dashboardAuth: { role: "ZP" } },
      1,
      Q1
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.requested_upload_day, CUTOFF_D);
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_D);
    assert.equal(result.context_meta.cutoff_origin, "REQUEST_UPLOAD_DAY");
    assert.equal(result.context_meta.forecast_run.effective_cutoff_date, CUTOFF_D);
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_D);
    assert.equal(ctx.lastUploadCalls.length, 0);
  });

  it("9 cutoff explícito en la pregunta gana sobre request upload_day", async () => {
    const ctx = wire();
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: CUTOFF_D });
    const question = `¿Cómo va la rentabilidad de Acapulco este mes? ${CUTOFF_B}`;
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question,
      planta_nombre: "Acapulco",
      search: href,
    });
    assert.equal(body.upload_day, CUTOFF_D);
    const result = await askDirectorIa(
      { body, dashboardAuth: { role: "ZP" } },
      1,
      question
    );
    assert.equal(result.context_meta.effective_cutoff_date, CUTOFF_B);
    assert.equal(result.context_meta.cutoff_origin, "EXPLICIT_QUESTION");
    assert.equal(ctx.miniOpts[0].upload_day, CUTOFF_B);
    assert.notEqual(result.context_meta.effective_cutoff_date, CUTOFF_D);
  });

  it("sin upload_day en la navegación no se inventa D ni fin de mes", async () => {
    const href = buildIgfForecastAccionesHref({ token: TOKEN, upload_day: null });
    const body = buildDirectorIaChatBody({
      planta_id: 1,
      question: Q1,
      planta_nombre: "Acapulco",
      search: href,
    });
    assert.equal(Object.prototype.hasOwnProperty.call(body, "upload_day"), false);
    assert.doesNotMatch(href, new RegExp(CUTOFF_D));
    assert.doesNotMatch(href, new RegExp(MONTH_END));
  });
});

describe("SPRINT1 IGF-TO-ACTIONS-CUTOFF-TRANSPORT — Golden Set routing", () => {
  it("Q1–Q3 van a CEL; Q4 commercial_trend", () => {
    for (const q of [Q1, Q2, Q3]) {
      const need = resolveExecutiveNeed(q);
      const planned = planDirectorIaQuestion(q);
      assert.equal(need.need_type, NEED_TYPES.EXECUTIVE_STATUS, q);
      assert.equal(shouldHandleExecutiveStatus(need, {}, planned.intent), true, q);
    }
    assert.equal(isCommercialTrendQuestion(Q4), true);
  });
});
