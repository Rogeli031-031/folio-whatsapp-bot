"use strict";

/**
 * R-RENT-IGF-001..061 — rentabilidad / utilidad operativa / resultado final → igf_status.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const { getDirectorIaTool, listDirectorIaTools } = require("../lib/director-ia-tools");
const { resolveYearMonthFromQuestion, extractIgfComposition, IGF_COMPOSITION_SOURCE } =
  require("../lib/director-ia-igf-arr");
const { isCommercialTrendQuestion } = require("../lib/director-ia-commercial-trend");
const { isHistoricalMarginQuestion } = require("../lib/director-ia-historical-margin");
const {
  resolveExecutiveNeed,
  isExecutiveStatusQuestion,
  shouldHandleExecutiveStatus,
  NEED_TYPES,
} = require("../lib/director-ia-conversational-executive-layer");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-09T12:00:00-06:00");

const Q = Object.freeze({
  S1: "¿Qué rentabilidad tenemos?",
  S2: "¿Qué rentabilidad tenemos en Acapulco?",
  S3: "¿Cuál es nuestra rentabilidad?",
  S4: "¿Cómo estamos de rentabilidad?",
  S5: "¿Qué utilidad operativa tenemos?",
  S6: "¿Cuál es el resultado final?",
  S7: "¿Cuál es la rentabilidad operativa?",
  S8: "¿Cuál es la rentabilidad final?",
  MARGEN: "¿Cuál fue el margen en mayo?",
  MARGEN_BARE: "¿Qué margen tenemos?",
  DESCUENTO: "¿Qué descuento tenemos?",
  COMO_VAMOS: "¿Cómo vamos?",
  CASA_30: "¿Cómo vamos en CASA últimos 30 días?",
  DETERIORO: "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?",
});

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function compositionFromRow(row, meta) {
  return extractIgfComposition(row, meta);
}

function igfRow(over = {}) {
  return {
    empresa: "GTM ACAPULCO",
    venta_ton: 120.5,
    margen_kg: 1.25,
    com_desc_kg: -0.4,
    impuesto_kg: -0.1,
    hg_kg: -0.05,
    gasto_kg: -0.8,
    util_oper_kg: 0.7,
    util_oper_importe: 845000,
    gtos_apoyos_corp_kg: -0.12,
    resultado_final_kg: 0.45,
    resultado_final_importe: 540000,
    ...over,
  };
}

function assembledOk(over = {}) {
  const row = over.row !== undefined ? over.row : igfRow(over.rowOver);
  const year = over.year != null ? over.year : 2026;
  const month = over.month != null ? over.month : 9;
  const composition =
    row &&
    compositionFromRow(row, {
      year,
      month,
      version_id: 77,
      version_number: 3,
    });
  return {
    ok: true,
    abort: false,
    year,
    month,
    plant: { planta_id: 1, planta_nombre: "Acapulco", plant_code: "E3" },
    igf: {
      version_id: row ? 77 : null,
      version_number: row ? 3 : null,
      row,
      composition,
      load_error: null,
    },
    arr: {},
    ...over,
  };
}

function route(q, inheritParentIntent) {
  const planned = planDirectorIaQuestion(q, inheritParentIntent ? { inheritParentIntent } : {});
  const need = resolveExecutiveNeed(q);
  const cel = shouldHandleExecutiveStatus(need, {}, planned.intent);
  return { planned, need, cel, intent: planned.intent };
}

function gitChanged() {
  return execSync("git diff --name-only HEAD", { encoding: "utf8", cwd: ROOT })
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

async function askS(question, extras = {}) {
  process.env.ENABLE_DIRECTOR_IA = "true";
  const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
  let openaiHits = 0;
  let loadHits = 0;
  const snap = extras.assembled !== undefined ? extras.assembled : assembledOk();
  configureDirectorIaChat({
    pool: { connect: async () => ({ release() {} }) },
    now: extras.now || NOW,
    openaiChat: async () => {
      openaiHits += 1;
      return "LLM no debe inventar métricas";
    },
    loadIgfArrSourceBlocksForChat: async () => {
      loadHits += 1;
      if (typeof extras.load === "function") return extras.load();
      return snap;
    },
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
      conversation_state: extras.conversation_state || undefined,
    },
  };
  const result = await askDirectorIa(req, 1, question);
  configureDirectorIaChat({
    pool: null,
    openaiChat: undefined,
    loadIgfArrSourceBlocksForChat: undefined,
    loadCommercialTrendForChat: undefined,
    loadPlantDiagnosisForChat: undefined,
    now: undefined,
  });
  return { result, openaiHits, loadHits };
}

describe("R-RENT-IGF planner 001-008", () => {
  it("001 S1 planner = igf_status", () => {
    assert.equal(detectDirectorIaIntent(Q.S1).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.S1).intent, "igf_status");
  });
  it("002 S2 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S2).intent, "igf_status");
  });
  it("003 S3 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S3).intent, "igf_status");
  });
  it("004 S4 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S4).intent, "igf_status");
  });
  it("005 S5 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S5).intent, "igf_status");
  });
  it("006 S6 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S6).intent, "igf_status");
  });
  it("007 S7 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S7).intent, "igf_status");
  });
  it("008 S8 planner = igf_status", () => {
    assert.equal(planDirectorIaQuestion(Q.S8).intent, "igf_status");
  });
});

describe("R-RENT-IGF period tool source 009-012", () => {
  it("009 S1 period 2026-09 with now 2026-09-09", () => {
    const ym = resolveYearMonthFromQuestion(Q.S1, { year: 2026, month: 9 });
    assert.equal(ym.year, 2026);
    assert.equal(ym.month, 9);
  });
  it("010 S1 no trailing 30d", () => {
    assert.equal(isCommercialTrendQuestion(Q.S1), false);
    const plan = planDirectorIaQuestion(Q.S1);
    assert.notEqual(plan.intent, "commercial_trend");
  });
  it("011 S1 uses get_igf_snapshot", () => {
    const tool = getDirectorIaTool("get_igf_snapshot");
    assert.ok(tool);
    assert.equal(tool.executor, "loadIgfArrAnnexForChat");
    const toolPlan = buildDirectorIaToolPlan(planDirectorIaQuestion(Q.S1), {
      planta_id: 1,
      question: Q.S1,
    });
    assert.ok(toolPlan.tools.some((t) => t.tool_id === "get_igf_snapshot"));
  });
  it("012 S1 source is existing IGF", () => {
    assert.equal(IGF_COMPOSITION_SOURCE, "igf.compromiso_lines");
  });
});

describe("R-RENT-IGF answer shape 013-031", () => {
  it("013-015 S1 headlines util and resultado distinct", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.ok, true);
    const a = String(result.answer || "");
    assert.match(a, /Utilidad operativa/i);
    assert.match(a, /845,?000|\$845000/);
    assert.match(a, /Resultado final/i);
    assert.match(a, /540,?000|\$540000/);
    const utilIdx = a.toLowerCase().indexOf("utilidad operativa");
    const finIdx = a.toLowerCase().indexOf("resultado final");
    assert.ok(utilIdx >= 0 && finIdx > utilIdx);
    assert.notEqual(a.match(/845/) && a.match(/540/) && a.match(/845/)[0], a.match(/540/)[0]);
  });
  it("016-021 S1 variables present", async () => {
    const { result } = await askS(Q.S1);
    const a = String(result.answer || "");
    assert.match(a, /120(?:[.,]5)?\s*t/i);
    assert.match(a, /1[.,]25\s*MXN\/kg/);
    assert.match(a, /Comisiones y descuentos/i);
    assert.match(a, /Impuestos/i);
    assert.match(a, /\bHG\b/);
    assert.match(a, /corporativ/i);
  });
  it("022-026 S1 does not invent forbidden money or formulas", async () => {
    const { result } = await askS(Q.S1);
    const a = String(result.answer || "");
    assert.doesNotMatch(a, /Ingreso:\s*\$/);
    assert.doesNotMatch(a, /ingreso aprox/i);
    assert.doesNotMatch(a, /gasto operativo/i);
    assert.doesNotMatch(a, /gasto total/i);
    assert.doesNotMatch(a, /Utilidad Operativa\s*=\s*Ingreso/i);
    assert.doesNotMatch(a, /Resultado Final\s*=\s*Utilidad/i);
    assert.doesNotMatch(a, /gasto_kg/);
    assert.doesNotMatch(a, /Gasto operativo:\s*\$/);
  });
  it("027-031 S1 no commercial trend shape", async () => {
    const { result } = await askS(Q.S1);
    const a = String(result.answer || "");
    assert.doesNotMatch(a, /\bCASA\b/);
    assert.doesNotMatch(a, /COMISIONISTA/i);
    assert.doesNotMatch(a, /\bOLS\b/);
    assert.doesNotMatch(a, /\bUP\b|\bDOWN\b/);
    assert.doesNotMatch(a, /30\s*d[ií]as/i);
    assert.notEqual(result.context_meta && result.context_meta.mode, "commercial_trend");
    assert.equal(result.context_meta && result.context_meta.openai_called, false);
    assert.ok((result.sources || []).includes("igf.compromiso_lines"));
  });
});

describe("R-RENT-IGF CEL and inherit 032-040", () => {
  it("032 S4 does not activate EXECUTIVE_STATUS", () => {
    const r = route(Q.S4);
    assert.equal(r.intent, "igf_status");
    assert.equal(r.cel, false);
    assert.notEqual(r.need.need_type === NEED_TYPES.EXECUTIVE_STATUS && r.cel, true);
  });
  it("033 financial cue beats generic status cue", () => {
    const r = route(Q.S4);
    assert.equal(r.intent, "igf_status");
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q.S4), {}, "igf_status"), false);
  });
  it("034 parent commercial_trend + S1 => igf_status", () => {
    const planned = planDirectorIaQuestion(Q.S1, { inheritParentIntent: "commercial_trend" });
    assert.equal(planned.intent, "igf_status");
    assert.ok(!(planned.evidence || []).some((e) => String(e.value) === "inherit_parent_intent"));
  });
  it("035 financial explicit cue breaks commercial inherit", () => {
    assert.equal(planDirectorIaQuestion(Q.S5, { inheritParentIntent: "commercial_trend" }).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.S6, { inheritParentIntent: "commercial_trend" }).intent, "igf_status");
  });
  it("036 cómo vamos generic keeps executive status", () => {
    const r = route(Q.COMO_VAMOS);
    assert.ok(["unknown", "plant_diagnosis"].includes(r.intent), r.intent);
    assert.equal(isExecutiveStatusQuestion(Q.COMO_VAMOS), true);
    assert.equal(r.cel, true);
  });
  it("037 CASA 30d keeps commercial_trend", () => {
    assert.equal(isCommercialTrendQuestion(Q.CASA_30), true);
    assert.equal(planDirectorIaQuestion(Q.CASA_30).intent, "commercial_trend");
    assert.equal(shouldHandleExecutiveStatus(resolveExecutiveNeed(Q.CASA_30), {}, "commercial_trend"), false);
  });
  it("038 explicit margin keeps margin semantics", () => {
    assert.equal(isHistoricalMarginQuestion(Q.MARGEN), true);
    assert.equal(planDirectorIaQuestion(Q.MARGEN).intent, "historical_margin");
    assert.notEqual(planDirectorIaQuestion(Q.MARGEN).intent, "igf_status");
  });
  it("039 margen != rentabilidad", () => {
    assert.notEqual(planDirectorIaQuestion(Q.MARGEN_BARE).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.S1).intent, "igf_status");
  });
  it("040 descuento != margen and not igf_status", () => {
    assert.notEqual(planDirectorIaQuestion(Q.DESCUENTO).intent, "igf_status");
    assert.notEqual(planDirectorIaQuestion(Q.DESCUENTO).intent, "historical_margin");
  });
});

describe("R-RENT-IGF lead fields and absence 041-047", () => {
  it("041 S5 opens with utilidad operativa", async () => {
    const { result } = await askS(Q.S5);
    const a = String(result.answer || "");
    const utilIdx = a.toLowerCase().indexOf("utilidad operativa");
    const finIdx = a.toLowerCase().indexOf("resultado final");
    assert.ok(utilIdx >= 0);
    assert.ok(finIdx < 0 || utilIdx < finIdx);
  });
  it("042 S6 opens with resultado final", async () => {
    const { result } = await askS(Q.S6);
    const a = String(result.answer || "");
    const utilIdx = a.toLowerCase().indexOf("utilidad operativa");
    const finIdx = a.toLowerCase().indexOf("resultado final");
    assert.ok(finIdx >= 0);
    assert.ok(utilIdx < 0 || finIdx < utilIdx);
  });
  it("043 S7 opens with utilidad operativa", async () => {
    const { result } = await askS(Q.S7);
    const a = String(result.answer || "");
    assert.ok(a.toLowerCase().indexOf("utilidad operativa") >= 0);
    const utilIdx = a.toLowerCase().indexOf("utilidad operativa");
    const finIdx = a.toLowerCase().indexOf("resultado final");
    assert.ok(finIdx < 0 || utilIdx < finIdx);
  });
  it("044 S8 opens with resultado final", async () => {
    const { result } = await askS(Q.S8);
    const a = String(result.answer || "");
    const utilIdx = a.toLowerCase().indexOf("utilidad operativa");
    const finIdx = a.toLowerCase().indexOf("resultado final");
    assert.ok(finIdx >= 0);
    assert.ok(utilIdx < 0 || finIdx < utilIdx);
  });
  it("045 missing util_oper is n.d.", async () => {
    const { result } = await askS(Q.S5, {
      assembled: assembledOk({
        rowOver: { util_oper_importe: null, util_oper_kg: null },
      }),
    });
    assert.match(String(result.answer || ""), /n\.d\./i);
    assert.doesNotMatch(String(result.answer || ""), /845,?000/);
  });
  it("046 missing resultado_final is n.d.", async () => {
    const { result } = await askS(Q.S6, {
      assembled: assembledOk({
        rowOver: { resultado_final_importe: null, resultado_final_kg: null },
      }),
    });
    assert.match(String(result.answer || ""), /n\.d\./i);
    assert.doesNotMatch(String(result.answer || ""), /540,?000/);
  });
  it("047 missing snapshot does not fall back to commercial", async () => {
    const { result, openaiHits } = await askS(Q.S1, {
      assembled: assembledOk({ row: null, igf: { version_id: null, row: null, composition: null } }),
    });
    const a = String(result.answer || result.error || "");
    assert.match(a, /DATA_NOT_FOUND|n\.d\./i);
    assert.doesNotMatch(a, /\bCASA\b/);
    assert.doesNotMatch(a, /COMISIONISTA/i);
    assert.equal(openaiHits, 0);
    assert.notEqual(result.context_meta && result.context_meta.mode, "commercial_trend");
  });
});

describe("R-RENT-IGF constraints and suites 048-061", () => {
  it("048 no SQL nuevo", () => {
    assert.equal(gitChanged().some((f) => f.endsWith(".sql")), false);
  });
  it("049 no tool nueva", () => {
    assert.equal(gitChanged().includes("lib/director-ia-tools.js"), false);
    assert.ok(getDirectorIaTool("get_igf_snapshot"));
    assert.equal(listDirectorIaTools().filter((t) => t.id === "get_igf_rentabilidad").length, 0);
  });
  it("050 no server.js", () => {
    assert.equal(gitChanged().includes("server.js"), false);
  });
  it("051 no schema", () => {
    assert.equal(gitChanged().some((f) => /schema/i.test(f)), false);
  });
  it("052 no deps", () => {
    assert.equal(gitChanged().includes("package.json"), false);
  });
  it("053 no LIVE_DB", () => {
    assert.equal(gitChanged().some((f) => /LIVE_DB|DATABASE_URL/.test(f)), false);
    assert.doesNotMatch(read("lib/director-ia-planner.js"), /process\.env\.DATABASE_URL/);
    assert.doesNotMatch(read("lib/director-ia-chat.js").slice(0, 400), /process\.env\.DATABASE_URL/);
  });
  it("054 no OpenAI inventing metrics", async () => {
    const { result, openaiHits } = await askS(Q.S1);
    assert.equal(openaiHits, 0);
    assert.equal(result.context_meta.openai_called, false);
  });
  it("055 planner focal PASS", () => {
    for (const q of [Q.S1, Q.S2, Q.S3, Q.S4, Q.S5, Q.S6, Q.S7, Q.S8]) {
      assert.equal(planDirectorIaQuestion(q).intent, "igf_status", q);
    }
    assert.equal(planDirectorIaQuestion(Q.DETERIORO).intent, "financial_diagnosis");
  });
  it("056 IGF focal PASS", async () => {
    const { result } = await askS(Q.S1);
    assert.equal(result.context_meta.mode, "igf_status");
    assert.equal(result.context_meta.period, "2026-09");
    assert.ok((result.sources || []).includes("igf.compromiso_lines"));
  });
  it("057 CEL focal PASS", () => {
    assert.equal(route(Q.COMO_VAMOS).cel, true);
    assert.equal(route(Q.S4).cel, false);
    assert.equal(route(Q.S1).cel, false);
  });
  it("058 continuity/inheritance focal PASS", () => {
    assert.equal(planDirectorIaQuestion(Q.S1, { inheritParentIntent: "commercial_trend" }).intent, "igf_status");
    assert.equal(planDirectorIaQuestion(Q.CASA_30).intent, "commercial_trend");
  });
  it("059 Tier1 script present", () => {
    assert.match(read("scripts/director-ia-golden-regression.js"), /TIER 1|tier1/i);
  });
  it("060 pre-deploy --gate present", () => {
    assert.match(read("scripts/director-ia-golden-regression.js"), /--gate/);
  });
  it("061 NEW FAILURE surface limited", () => {
    const forbidden = gitChanged().filter(
      (f) =>
        !/^docs\/dev-loop\//.test(f) &&
        f !== "lib/director-ia-planner.js" &&
        f !== "lib/director-ia-chat.js" &&
        !/^test\/director-ia-rentabilidad-executive-routing\.test\.js$/.test(f) &&
        f !== "test/director-ia-sprint1-core-conversational-recovery.test.js"
    );
    assert.deepEqual(forbidden, []);
  });
});
