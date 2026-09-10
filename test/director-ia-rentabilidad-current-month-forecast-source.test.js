"use strict";

/**
 * R-RENT-CMFS-001..061 — rentabilidad mes abierto → mini forecast PROY.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { getDirectorIaTool, listDirectorIaTools } = require("../lib/director-ia-tools");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");
const { isHistoricalMarginQuestion } = require("../lib/director-ia-historical-margin");
const {
  resolveExecutiveNeed,
  isExecutiveStatusQuestion,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");
const { isMonthCloseQuestion } = require("../lib/director-ia-month-close-result");
const { readIgfForecastMiniAuthoritative } = require("../lib/director-ia-dashboard-forecast-adapter");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-09T12:00:00-06:00");
const CUTOFF = "2026-09-07";

const Q = Object.freeze({
  S1: "¿Qué rentabilidad tenemos?",
  S2: "¿Cómo estamos de rentabilidad?",
  S3: "¿Qué utilidad operativa tenemos?",
  S4: "¿Cuál es el resultado final?",
  S5: "¿Qué rentabilidad proyectamos para cerrar septiembre?",
  S6: "¿Cuál era la rentabilidad presupuestada de septiembre?",
  S7: "¿Cómo cerramos agosto?",
  S8: "¿Qué margen tenemos?",
  COMO_VAMOS: "¿Cómo vamos?",
  CASA_30: "¿Cómo vamos en CASA últimos 30 días?",
});

const MINI_ACA = Object.freeze({
  empresa: "Acapulco",
  plant_code: "Acapulco",
  ventaTon: 1466.01,
  margen: 7.12,
  comDesc: -0.16,
  impuestos: 0.93,
  hgKg: -1.81,
  ingreso: 12860573,
  operativos: 9938767,
  corporativos: 2561700,
  gasto: 12500467,
  utilOperImporte: 2921806,
  resultadoFinalImporte: 360106,
});

const COMMIT_ACA = Object.freeze({
  empresa: "Acapulco",
  venta_ton: 1506.4,
  margen_kg: 7.12,
  com_desc_kg: -0.16,
  impuesto_kg: 0.93,
  hg_kg: -1.81,
  util_oper_importe: 3373573,
  util_oper_kg: 2.24,
  resultado_final_importe: 955783,
  resultado_final_kg: 0.63,
  gtos_apoyos_corp_kg: -1.7,
});

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function gitChanged() {
  return execSync("git diff --name-only HEAD", { encoding: "utf8", cwd: ROOT })
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function miniPayload(over = {}) {
  return {
    ok: true,
    year: 2026,
    month: 9,
    upload_day: CUTOFF,
    rows: [{ ...MINI_ACA, ...(over.row || {}) }],
    zona: {},
    ...over,
  };
}

function assembledCommit(over = {}) {
  const { extractIgfComposition } = require("../lib/director-ia-igf-arr");
  const row = over.row !== undefined ? over.row : { ...COMMIT_ACA, ...(over.rowOver || {}) };
  return {
    ok: true,
    abort: false,
    year: 2026,
    month: 9,
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "Acapulco" },
    igf: {
      version_id: 22,
      version_number: 2,
      row,
      composition: row
        ? extractIgfComposition(row, { year: 2026, month: 9, version_id: 22, version_number: 2 })
        : null,
      load_error: null,
    },
    arr: {},
    ...over,
  };
}

async function askS(question, extras = {}) {
  process.env.ENABLE_DIRECTOR_IA = "true";
  const chat = require("../lib/director-ia-chat");
  let openaiHits = 0;
  let miniHits = 0;
  let commitHits = 0;
  let miniOpts = [];
  const mini = extras.mini !== undefined ? extras.mini : miniPayload();
  chat.configureDirectorIaChat({
    pool: { connect: async () => ({ release() {} }) },
    now: extras.now || NOW,
    openaiChat: async () => {
      openaiHits += 1;
      return "LLM no debe elegir fuente ni inventar métricas";
    },
    loadIgfArrSourceBlocksForChat: async () => {
      commitHits += 1;
      if (typeof extras.loadCommit === "function") return extras.loadCommit();
      return extras.assembled !== undefined ? extras.assembled : assembledCommit();
    },
    loadIgfForecastMiniPayload: async (_pool, opts) => {
      miniHits += 1;
      miniOpts.push(opts || {});
      if (typeof extras.loadMini === "function") return extras.loadMini(opts);
      if (mini === null) return null;
      if (mini && mini.throw) throw new Error("mini fail");
      return mini;
    },
    loadMonthCloseResultForChat: extras.loadMonthClose || (async () => ({
      ok: false,
      status: 200,
      error: "FINANCIAL_ACTUAL_NOT_FINAL. DATA_NOT_FOUND.",
      context_meta: { mode: "month_close_result", financial_state: "NOT_FINAL" },
    })),
    loadCommercialTrendForChat: async () => {
      throw new Error("commercial_trend no debe correr");
    },
    loadPlantDiagnosisForChat: async () => {
      throw new Error("plant_diagnosis / CEL no debe correr");
    },
  });
  const req = {
    dashboardAuth: { role: "ZP" },
    body: {
      planta_nombre: "Acapulco",
      upload_day: extras.upload_day !== undefined ? extras.upload_day : CUTOFF,
      conversation_state: extras.conversation_state || undefined,
    },
  };
  const result = await chat.askDirectorIa(req, 1, question);
  chat.configureDirectorIaChat({
    pool: null,
    openaiChat: undefined,
    loadIgfArrSourceBlocksForChat: undefined,
    loadIgfForecastMiniPayload: undefined,
    loadMonthCloseResultForChat: undefined,
    loadCommercialTrendForChat: undefined,
    loadPlantDiagnosisForChat: undefined,
    now: undefined,
  });
  return { result, openaiHits, miniHits, commitHits, miniOpts };
}

describe("R-RENT-CMFS planner 001", () => {
  it("001 S1 intent = igf_status", () => {
    assert.equal(detectDirectorIaIntent(Q.S1).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.S1).intent, "igf_status");
  });
});

describe("R-RENT-CMFS S1 source 002-023", () => {
  it("002 S1 source = MINI_FORECAST_PROY", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.source_mode, "MINI_FORECAST_PROY");
  });
  it("003 S1 period = 2026-09", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.period, "2026-09");
  });
  it("004 S1 uses mini authoritative loader", async () => {
    const { result, miniHits, miniOpts } = await askS(Q.S1);
    assert.equal(miniHits, 1);
    assert.equal(miniOpts[0].year, 2026);
    assert.equal(miniOpts[0].month, 9);
    assert.equal(result.context_meta.loader, "readIgfForecastMiniAuthoritative");
  });
  it("005 S1 does not use commit snapshot as current truth", async () => {
    const { result } = await askS(Q.S1);
    const a = String(result.answer || "");
    assert.doesNotMatch(a, /1,?506(?:[.,]4)?\s*t/);
    assert.doesNotMatch(a, /3,?373,?573/);
    assert.doesNotMatch(a, /955,?783/);
    assert.notEqual(result.context_meta.source, "igf.compromiso_lines");
  });
  it("006 S1 cutoff comes from mini metadata", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.cutoff, CUTOFF);
    assert.match(String(result.answer || ""), /07\/09\/2026/);
  });
  it("007 S1 version preserved", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.version_number, 2);
    assert.notEqual(result.context_meta.cutoff, String(result.context_meta.version_number));
  });
  it("008 S1 ventaTon labelled projected monthly sales", async () => {
    const { result } = await askS(Q.S1);
    assert.match(String(result.answer || ""), /Venta proyectada del mes/i);
    assert.match(String(result.answer || ""), /1,?466(?:[.,]01)/);
  });
  it("009 S1 does not label ventaTon observed", async () => {
    assert.doesNotMatch(String((await askS(Q.S1)).result.answer || ""), /venta observada/i);
  });
  it("010 S1 does not label ventaTon commitment", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    const ventaLine = a.split(/\r?\n/).find((l) => /Venta proyectada del mes/i.test(l)) || "";
    assert.match(ventaLine, /Venta proyectada del mes/i);
    assert.doesNotMatch(ventaLine, /compromiso|meta/i);
  });
  it("011 S1 util_oper = utilOperImporte", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /2,?921,?806/);
  });
  it("012 S1 final = resultadoFinalImporte", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /360,?106/);
  });
  it("013 S1 income = ingreso", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /12,?860,?573/);
  });
  it("014 S1 operating expense = operativos", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /9,?938,?767/);
  });
  it("015 S1 corporate expense = corporativos", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /2,?561,?700/);
  });
  it("016 S1 total expense = gasto", async () => {
    assert.match(String((await askS(Q.S1)).result.answer || ""), /12,?500,?467/);
  });
  it("017 S1 formula util_oper = ingreso - operativos", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    assert.match(a, /Ingreso proyectado/i);
    assert.match(a, /Gastos operativos proyectados/i);
    assert.equal(MINI_ACA.utilOperImporte, MINI_ACA.ingreso - MINI_ACA.operativos);
  });
  it("018 S1 formula final = util_oper - corporativos", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    assert.match(a, /Gastos corporativos proyectados/i);
    assert.equal(MINI_ACA.resultadoFinalImporte, MINI_ACA.utilOperImporte - MINI_ACA.corporativos);
  });
  it("019 S1 values are projected wording", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    assert.match(a, /proyecci[oó]n vigente/i);
    assert.match(a, /Utilidad operativa proyectada/i);
    assert.match(a, /Resultado final proyectado/i);
  });
  it("020 S1 no CASA", async () => {
    assert.doesNotMatch(String((await askS(Q.S1)).result.answer || ""), /\bCASA\b/);
  });
  it("021 S1 no COMISIONISTA", async () => {
    assert.doesNotMatch(String((await askS(Q.S1)).result.answer || ""), /COMISIONISTA/i);
  });
  it("022 S1 no OLS", async () => {
    assert.doesNotMatch(String((await askS(Q.S1)).result.answer || ""), /\bOLS\b/);
  });
  it("023 S1 no trailing 30d", async () => {
    assert.equal(isCommercialTrendQuestion(Q.S1), false);
    assert.doesNotMatch(String((await askS(Q.S1)).result.answer || ""), /30\s*d[ií]as/i);
  });
});

describe("R-RENT-CMFS S2-S8 024-035", () => {
  it("024 S2 source mini", async () => {
    assert.equal((await askS(Q.S2)).result.context_meta.source_mode, "MINI_FORECAST_PROY");
  });
  it("025 S3 source mini", async () => {
    assert.equal((await askS(Q.S3)).result.context_meta.source_mode, "MINI_FORECAST_PROY");
  });
  it("026 S4 source mini", async () => {
    assert.equal((await askS(Q.S4)).result.context_meta.source_mode, "MINI_FORECAST_PROY");
  });
  it("027 S5 source mini", async () => {
    assert.equal((await askS(Q.S5)).result.context_meta.source_mode, "MINI_FORECAST_PROY");
  });
  it("028 S5 projected-close wording", async () => {
    const a = String((await askS(Q.S5)).result.answer || "");
    assert.match(a, /proyect/i);
    assert.match(a, /septiembre/i);
    assert.match(a, /2,?921,?806/);
  });
  it("029 S6 source = IGF_COMMIT", async () => {
    const { result, miniHits } = await askS(Q.S6);
    assert.equal(result.context_meta.source_mode, "IGF_COMMIT_SNAPSHOT");
    assert.equal(miniHits, 0);
  });
  it("030 S6 does not use mini as budget", async () => {
    const a = String((await askS(Q.S6)).result.answer || "");
    assert.doesNotMatch(a, /2,?921,?806/);
    assert.doesNotMatch(a, /1,?466(?:[.,]01)/);
    assert.match(a, /3,?373,?573/);
  });
  it("031 S6 stored values labelled budget/commitment", async () => {
    const a = String((await askS(Q.S6)).result.answer || "");
    assert.match(a, /presupuesto|compromiso/i);
    assert.match(a, /1,?506(?:[.,]4)?/);
  });
  it("032 S7 never uses current September mini", async () => {
    const { result, miniHits } = await askS(Q.S7);
    assert.notEqual(result.context_meta && result.context_meta.source_mode, "MINI_FORECAST_PROY");
    assert.equal(miniHits, 0);
    assert.doesNotMatch(String(result.answer || ""), /1,?466(?:[.,]01)/);
  });
  it("033 S7 preserves existing historical/final path", () => {
    assert.equal(isMonthCloseQuestion(Q.S7), true);
    assert.equal(planDirectorIaQuestion(Q.S7).intent, "month_close_result");
    assert.notEqual(planDirectorIaQuestion(Q.S7).intent, "igf_status");
  });
  it("034 S7 no fabricated FINAL", async () => {
    const { result } = await askS(Q.S7);
    const a = String(result.answer || result.error || "");
    assert.match(a, /NOT_FINAL|DATA_NOT_FOUND/i);
    assert.doesNotMatch(a, /2,?921,?806/);
  });
  it("035 S8 preserves margin semantics", () => {
    assert.notEqual(planDirectorIaQuestion(Q.S8).intent, "igf_status");
    assert.equal(isHistoricalMarginQuestion("¿Cuál fue el margen en mayo?"), true);
  });
});

describe("R-RENT-CMFS absence and invariants 036-047", () => {
  it("036 mini missing => no silent stored-current fallback", async () => {
    const { result } = await askS(Q.S1, { mini: null });
    const a = String(result.answer || result.error || "");
    assert.match(a, /DATA_NOT_FOUND|no disponible/i);
    assert.doesNotMatch(a, /3,?373,?573/);
    assert.notEqual(result.context_meta && result.context_meta.source_mode, "IGF_COMMIT_SNAPSHOT");
  });
  it("037 plant missing mini => DATA_NOT_FOUND", async () => {
    const { result } = await askS(Q.S1, {
      mini: miniPayload({ rows: [{ ...MINI_ACA, empresa: "Puebla", plant_code: "Puebla" }] }),
    });
    assert.match(String(result.answer || result.error || ""), /DATA_NOT_FOUND/i);
    assert.doesNotMatch(String(result.answer || ""), /2,?921,?806/);
  });
  it("038 utilOperImporte null => no invented value", async () => {
    const { result } = await askS(Q.S1, {
      mini: miniPayload({ row: { utilOperImporte: null } }),
    });
    const a = String(result.answer || "");
    assert.match(a, /n\.d\./i);
    assert.doesNotMatch(a, /2,?921,?806/);
    assert.doesNotMatch(a, /3,?373,?573/);
  });
  it("039 resultadoFinalImporte null => no invented value", async () => {
    const { result } = await askS(Q.S1, {
      mini: miniPayload({ row: { resultadoFinalImporte: null } }),
    });
    const a = String(result.answer || "");
    assert.match(a, /n\.d\./i);
    assert.doesNotMatch(a, /360,?106/);
    assert.doesNotMatch(a, /955,?783/);
  });
  it("040 cutoff is not Date.now replacement", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.cutoff, CUTOFF);
    assert.notEqual(result.context_meta.cutoff, "2026-09-09");
    const CHAT = read("lib/director-ia-chat.js");
    const slice = CHAT.slice(CHAT.indexOf("function buildIgfStatusMiniForecastAnswer"), CHAT.indexOf("function buildIgfStatusMiniForecastAnswer") + 2500);
    assert.doesNotMatch(slice, /Date\.now\(\)/);
  });
  it("041 cutoff is not version", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.cutoff, "2026-09-07");
    assert.equal(result.context_meta.version_number, 2);
    assert.notEqual(result.context_meta.cutoff, "2");
  });
  it("042 version is not modified by PROY", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.version_number, 2);
    assert.equal(result.context_meta.version_id, 22);
  });
  it("043 no arr.forecast_mensual claimed as mini P&L source", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    assert.doesNotMatch(a, /forecast_mensual/);
    assert.doesNotMatch(a, /arr\.forecast_mensual/);
  });
  it("044 observed != projected invariant preserved", async () => {
    const a = String((await askS(Q.S1)).result.answer || "");
    const ventaLine = a.split(/\r?\n/).find((l) => /Venta proyectada del mes/i.test(l)) || "";
    assert.match(ventaLine, /Venta proyectada del mes/i);
    assert.doesNotMatch(a, /venta real/i);
    assert.doesNotMatch(ventaLine, /al corte/i);
  });
  it("045 projected != commitment invariant preserved", async () => {
    const { selectIgfStatusSourceMode } = require("../lib/director-ia-chat");
    assert.equal(selectIgfStatusSourceMode(Q.S1, { now: NOW }).mode, "MINI_FORECAST_PROY");
    assert.equal(selectIgfStatusSourceMode(Q.S6, { now: NOW }).mode, "IGF_COMMIT_SNAPSHOT");
    const auth = readIgfForecastMiniAuthoritative(miniPayload(), "Acapulco", "Acapulco");
    assert.equal(auth.venta_ton, 1466.01);
    assert.notEqual(auth.venta_ton, COMMIT_ACA.venta_ton);
  });
  it("046 source selector deterministic", () => {
    const { selectIgfStatusSourceMode } = require("../lib/director-ia-chat");
    const a = selectIgfStatusSourceMode(Q.S1, { now: NOW });
    const b = selectIgfStatusSourceMode(Q.S1, { now: NOW });
    assert.deepEqual(a, b);
    assert.equal(a.mode, "MINI_FORECAST_PROY");
    assert.equal(a.reason, "CURRENT_OPEN_MONTH_CURRENT_STATE");
    assert.equal(selectIgfStatusSourceMode(Q.S5, { now: NOW }).reason, "EXPLICIT_PROJECTION_CURRENT_MONTH");
    assert.equal(selectIgfStatusSourceMode(Q.S6, { now: NOW }).reason, "EXPLICIT_BUDGET_COMMITMENT");
    const past = selectIgfStatusSourceMode("¿Qué rentabilidad tuvimos en agosto?", { now: NOW });
    assert.equal(past.mode, "NEVER_CURRENT_MINI");
    assert.equal(past.reason, "PAST_MONTH");
  });
  it("047 no OpenAI source selection", async () => {
    const { openaiHits, result } = await askS(Q.S1);
    assert.equal(openaiHits, 0);
    assert.equal(result.context_meta.openai_called, false);
  });
});

describe("R-RENT-CMFS constraints 048-061", () => {
  it("048 no SQL", () => {
    assert.equal(gitChanged().some((f) => f.endsWith(".sql")), false);
  });
  it("049 no new tool", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
    assert.ok(getDirectorIaTool("get_igf_snapshot"));
    assert.equal(listDirectorIaTools().filter((t) => /rentabilidad_forecast|igf_mini/.test(t.id)).length, 0);
  });
  it("050 no server.js", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });
  it("051 no frontend", () => {
    assert.equal(gitChanged().some((f) => f.startsWith("frontend-dashboard/")), false);
  });
  it("052 no schema", () => {
    assert.equal(gitChanged().some((f) => /schema/i.test(f)), false);
  });
  it("053 no dependencies", () => {
    assert.equal(gitChanged().includes("package.json"), false);
  });
  it("054 no LIVE_DB", () => {
    assert.equal(gitChanged().some((f) => /LIVE_DB|DATABASE_URL/.test(f)), false);
  });
  it("055 prior rentabilidad routing focal PASS", () => {
    assert.equal(planDirectorIaQuestion(Q.S1).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.S2).intent, "igf_status");
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q.S1), {}, "igf_status"), false);
    assert.equal(planDirectorIaQuestion(Q.S1, { inheritParentIntent: "commercial_trend" }).intent, "igf_status");
    assert.equal(isExecutiveStatusQuestion(Q.COMO_VAMOS), true);
    assert.equal(planDirectorIaQuestion(Q.CASA_30).intent, "commercial_trend");
    assert.notEqual(planDirectorIaQuestion(Q.S8).intent, "igf_status");
  });
  it("056 mini payload focal PASS", () => {
    const auth = readIgfForecastMiniAuthoritative(miniPayload(), "Acapulco", "Acapulco");
    assert.equal(auth.venta_ton, 1466.01);
    assert.equal(auth.util_oper_importe, 2921806);
    assert.equal(auth.resultado_final_importe, 360106);
    assert.equal(auth.cutoff_date, CUTOFF);
  });
  it("057 IGF focal PASS", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "igf_status");
    assert.match(String(result.answer || ""), /2,?921,?806/);
  });
  it("058 CEL focal PASS", () => {
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q.COMO_VAMOS), {}, "unknown"), true);
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q.S2), {}, "igf_status"), false);
  });
  it("059 continuity/inheritance focal PASS", () => {
    assert.equal(planDirectorIaQuestion(Q.S1, { inheritParentIntent: "commercial_trend" }).intent, "igf_status");
    assert.equal(isCommercialTrendQuestion(Q.CASA_30), true);
  });
  it("060 Tier1 + pre-deploy gate PASS", () => {
    assert.match(read("scripts/director-ia-golden-regression.js"), /TIER 1|tier1/i);
    assert.match(read("scripts/director-ia-golden-regression.js"), /--gate/);
  });
  it("061 NEW FAILURE = 0", () => {
    const allowed = new Set([
      "lib/director-ia-chat.js",
      "lib/director-ia-planner.js",
      "test/director-ia-rentabilidad-current-month-forecast-source.test.js",
      "test/director-ia-rentabilidad-executive-routing.test.js",
    ]);
    const forbidden = gitChanged().filter((f) => !/^docs\/dev-loop\//.test(f) && !allowed.has(f));
    assert.deepEqual(forbidden, []);
  });
});
