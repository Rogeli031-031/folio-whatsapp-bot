"use strict";

/**
 * R-EXP-SUBTOPIC: transportar operativos/corporativos/gasto del mini a T4.
 * Fixture sintético. No hardcodes LIVE. No LIVE_DB.
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const fx = require("./fixtures/director-ia-rent-cut");
const { readIgfForecastMiniAuthoritative } = require("../lib/director-ia-dashboard-forecast-adapter");
const { loadKpiForMonth } = require("../lib/director-ia-rentabilidad-deterioro-snapshot");

const Q1 = "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?";
const Q2 = "y gasto?";
const Q3 = "y corporativos?";
const Q4 = "¿cuánto subieron?";
const Q_OPER = "y operativos?";
const PLANTA_ID = 7;
const OTHER_PLANTA_ID = 8;
const PERIODO_A = `${fx.YEAR_A}-${String(fx.MONTH_A).padStart(2, "0")}`;
const PERIODO_B = `${fx.YEAR_B}-${String(fx.MONTH_B).padStart(2, "0")}`;

const KPI_A = Object.freeze({
  operativos: 111000,
  corporativos: 222000,
  gasto: 333000,
  utilOperImporte: 888000,
  resultadoFinalImporte: 500000,
});
const KPI_B = Object.freeze({
  operativos: 150000,
  corporativos: 280000,
  gasto: 430000,
  utilOperImporte: 800000,
  resultadoFinalImporte: 400000,
});

const GENERIC_CLARIFICATION_RE =
  /No pude anclar esta frase|No se pudo determinar una intenci[oó]n|No asumo el hilo/i;
const AR_OR_PLANT_RE = /Action Register|acciones abiertas|diagn[oó]stico de (la )?planta/i;
const DELTA_GASTOS_RE = /Delta Gastos|computeDeltaGastos|delta_gastos|deltaGastos/i;
const CAUSAL_RE = /provoca(n)? la ca[ií]da|explica(n)? la ca[ií]da|parte exacta de la ca[ií]da/i;

function digits(n) {
  return String(n);
}

function hasAmount(text, n) {
  const raw = String(text || "");
  if (raw.includes(digits(n))) return true;
  const grouped = Math.round(n).toLocaleString("es-MX");
  if (raw.includes(grouped)) return true;
  return raw.replace(/[^\d-]/g, "").includes(digits(n));
}

function miniForMonth(year, month) {
  const kpi = Number(year) === fx.YEAR_A && Number(month) === fx.MONTH_A ? KPI_A : KPI_B;
  return {
    ok: true,
    year,
    month,
    rows: [
      {
        empresa: fx.PLANT,
        plant_code: "E3",
        ventaTon: 100,
        comDesc: 0.2,
        operativos: kpi.operativos,
        corporativos: kpi.corporativos,
        gasto: kpi.gasto,
        utilOperImporte: kpi.utilOperImporte,
        resultadoFinalImporte: kpi.resultadoFinalImporte,
      },
    ],
  };
}

function deltaRows() {
  return {
    planta: fx.PLANT,
    periodoA: PERIODO_A,
    periodoB: PERIODO_B,
    margenA: 8,
    margenB: 7.5,
    rows: [{ cliente: "CLIENTE_N1", deltaIngreso: -250000, kgA: 10000, kgB: 4000 }],
    source_helper: "computeDeltaIngresoClientesPorMes",
    physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
  };
}

function emptyLogPool() {
  const query = async () => ({ rows: [] });
  return {
    query,
    connect: async () => ({
      query,
      release() {},
    }),
  };
}

function stateOf(result) {
  return result && result.context_meta && result.context_meta.conversation_state;
}

function snapshotOf(result) {
  return result && result.profitability_deterioro_snapshot;
}

function expenseCompare(result) {
  return result && result.context_meta && result.context_meta.expense_compare;
}

function stateHasExpenseImporte(st) {
  if (!st || typeof st !== "object") return false;
  const keys = ["operativos", "corporativos", "gasto", "gasto_operativo", "gasto_corporativo", "gasto_total"];
  if (keys.some((k) => st[k] != null && st[k] !== "")) return true;
  const blob = JSON.stringify(st);
  return [KPI_A, KPI_B].some((kpi) =>
    [kpi.operativos, kpi.corporativos, kpi.gasto].some((n) => blob.includes(String(n)))
  );
}

describe("R-EXP-SUBTOPIC adapter y loadKpiForMonth", () => {
  it("R-EXP-SUBTOPIC-001: adapter conserva rows[].operativos", () => {
    const row = readIgfForecastMiniAuthoritative(miniForMonth(fx.YEAR_A, fx.MONTH_A), fx.PLANT, "E3");
    assert.equal(row.operativos, KPI_A.operativos);
  });

  it("R-EXP-SUBTOPIC-002: adapter conserva rows[].corporativos", () => {
    const row = readIgfForecastMiniAuthoritative(miniForMonth(fx.YEAR_A, fx.MONTH_A), fx.PLANT, "E3");
    assert.equal(row.corporativos, KPI_A.corporativos);
  });

  it("R-EXP-SUBTOPIC-003: adapter conserva rows[].gasto", () => {
    const row = readIgfForecastMiniAuthoritative(miniForMonth(fx.YEAR_A, fx.MONTH_A), fx.PLANT, "E3");
    assert.equal(row.gasto, KPI_A.gasto);
  });

  it("R-EXP-SUBTOPIC-004: loadKpiForMonth conserva los tres campos", async () => {
    const kpi = await loadKpiForMonth(
      {
        now: fx.NOW,
        loadIgfForecastMiniPayload: async (_c, opts) => miniForMonth(opts.year, opts.month),
      },
      fx.PLANT,
      "E3",
      fx.YEAR_A,
      fx.MONTH_A
    );
    assert.equal(kpi.ok, true, kpi.reason);
    assert.equal(kpi.operativos, KPI_A.operativos);
    assert.equal(kpi.corporativos, KPI_A.corporativos);
    assert.equal(kpi.gasto, KPI_A.gasto);
    assert.equal(kpi.util_oper_importe, KPI_A.utilOperImporte);
    assert.equal(kpi.resultado_final_importe, KPI_A.resultadoFinalImporte);
    assert.notEqual(kpi.operativos, kpi.util_oper_importe);
  });
});

describe("R-EXP-SUBTOPIC askDirectorIa T1→T4", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let openaiCalls;
  let miniCalls;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({
      pool: null,
      now: undefined,
      openaiChat: undefined,
      loadIgfForecastMiniPayload: undefined,
      loadRentabilidadKpis: undefined,
      resolveDeltaIngresoForecastPlanta: undefined,
      computeDeltaIngresoClientesPorMes: undefined,
      loadRecentCommentsByClienteNombres: undefined,
      loadPlantDiagnosisForChat: undefined,
      plantCatalog: undefined,
    });
  });

  function wire() {
    openaiCalls = 0;
    miniCalls = [];
    configureDirectorIaChat({
      now: fx.NOW,
      pool: emptyLogPool(),
      plantCatalog: [
        { planta_id: PLANTA_ID, nombre: fx.PLANT, clave: "E3" },
        { planta_id: OTHER_PLANTA_ID, nombre: "OtraPlantaFix", clave: "E9" },
      ],
      openaiChat: async () => {
        openaiCalls += 1;
        return "Diagnóstico genérico de planta / Action Register (no debe usarse).";
      },
      loadPlantDiagnosisForChat: async () => {
        openaiCalls += 1;
        return { ok: true, plant: { planta_id: PLANTA_ID, planta_nombre: fx.PLANT } };
      },
      loadRentabilidadKpis: undefined,
      resolveDeltaIngresoForecastPlanta: async () => ({
        id: PLANTA_ID,
        nombre: fx.PLANT,
        clave: "E3",
      }),
      computeDeltaIngresoClientesPorMes: async () => deltaRows(),
      loadRecentCommentsByClienteNombres: async () => new Map(),
      loadIgfForecastMiniPayload: async (_client, opts) => {
        miniCalls.push({ year: opts && opts.year, month: opts && opts.month });
        return miniForMonth(opts && opts.year, opts && opts.month);
      },
    });
  }

  function reqOf(extra) {
    return {
      body: {
        planta_id: PLANTA_ID,
        planta_nombre: fx.PLANT,
        upload_day: fx.UPLOAD_DAY_B,
        ...(extra || {}),
      },
      dashboardAuth: { role: "ZP" },
    };
  }

  async function runTurn(question, prev, extra) {
    const history = [];
    if (prev && prev.t1) {
      history.push({ role: "user", content: Q1 }, { role: "assistant", content: prev.t1.answer });
    }
    if (prev && prev.t2) {
      history.push({ role: "user", content: Q2 }, { role: "assistant", content: prev.t2.answer });
    }
    if (prev && prev.t3) {
      history.push({ role: "user", content: Q3 }, { role: "assistant", content: prev.t3.answer });
    }
    if (prev && prev.tOper) {
      history.push({ role: "user", content: Q_OPER }, { role: "assistant", content: prev.tOper.answer });
    }
    history.push({ role: "user", content: question });
    const echoed =
      extra && Object.prototype.hasOwnProperty.call(extra, "conversation_state")
        ? extra.conversation_state
        : prev && prev.state;
    const plantaId = extra && extra.planta_id != null ? extra.planta_id : PLANTA_ID;
    const bodyExtra = { ...(extra || {}) };
    delete bodyExtra.planta_id;
    return askDirectorIa(
      reqOf({
        conversation_state: echoed,
        history,
        ...bodyExtra,
      }),
      plantaId,
      question
    );
  }

  async function runCanonToT3() {
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const t3 = await runTurn(Q3, { t1, t2, state: stateOf(t2) });
    return { t1, t2, t3 };
  }

  it("R-EXP-SUBTOPIC-005: T1 conserva resultado_final_importe", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const snap = snapshotOf(t1);
    assert.equal(t1.ok, true, t1.error);
    assert.equal(snap && snap.rentabilidad_final && snap.rentabilidad_final.a, KPI_A.resultadoFinalImporte);
    assert.equal(snap && snap.rentabilidad_final && snap.rentabilidad_final.b, KPI_B.resultadoFinalImporte);
  });

  it("R-EXP-SUBTOPIC-006: T1 no sustituye util_oper_importe por operativos", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const snap = snapshotOf(t1);
    const op = snap && snap.rentabilidad_operativa;
    assert.equal(op && op.a, KPI_A.utilOperImporte);
    assert.equal(op && op.b, KPI_B.utilOperImporte);
    assert.notEqual(op && op.a, KPI_A.operativos);
    assert.notEqual(op && op.b, KPI_B.operativos);
    assert.doesNotMatch(String(t1.answer || ""), new RegExp(`Rentabilidad operativa[\\s\\S]*${KPI_A.operativos}`));
  });

  it("R-EXP-SUBTOPIC-007: T3 conserva expense.corporate", async () => {
    wire();
    const { t3 } = await runCanonToT3();
    assert.equal(stateOf(t3) && stateOf(t3).active_subtopic, "expense.corporate");
    assert.equal(stateOf(t3) && stateOf(t3).parent_intent, "profitability_deterioro_snapshot");
  });

  it("R-EXP-SUBTOPIC-008: T4 vuelve a consultar A/B", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const before = miniCalls.length;
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    const added = miniCalls.slice(before);
    assert.equal(t4.ok, true, t4.error);
    assert.ok(added.length >= 2, `T4 mini calls=${added.length}`);
    const months = added.map((c) => `${c.year}-${String(c.month).padStart(2, "0")}`);
    assert.ok(months.includes(PERIODO_A), months.join(","));
    assert.ok(months.includes(PERIODO_B), months.join(","));
  });

  it("R-EXP-SUBTOPIC-009: T4 corporate usa exclusivamente rows[].corporativos", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    const cmp = expenseCompare(t4);
    assert.equal(cmp && cmp.field, "corporativos");
    assert.equal(cmp && cmp.a, KPI_A.corporativos);
    assert.equal(cmp && cmp.b, KPI_B.corporativos);
    assert.notEqual(cmp && cmp.a, KPI_A.utilOperImporte - KPI_A.resultadoFinalImporte);
    assert.notEqual(cmp && cmp.field, "operativos");
    assert.notEqual(cmp && cmp.field, "gasto");
    assert.notEqual(cmp && cmp.a, KPI_A.operativos);
    assert.match(String((cmp && cmp.source) || ""), /corporativos/);
  });

  it("R-EXP-SUBTOPIC-010: T4 responde A, B y B-A", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    const cmp = expenseCompare(t4);
    const delta = KPI_B.corporativos - KPI_A.corporativos;
    assert.equal(cmp && cmp.delta, delta);
    assert.ok(hasAmount(t4.answer, KPI_A.corporativos), t4.answer);
    assert.ok(hasAmount(t4.answer, KPI_B.corporativos), t4.answer);
    assert.ok(hasAmount(t4.answer, delta), t4.answer);
    assert.match(String(t4.answer || ""), /variaci[oó]n/i);
  });

  it("R-EXP-SUBTOPIC-011: no llama Delta Gastos a B-A", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    assert.doesNotMatch(String(t4.answer || ""), DELTA_GASTOS_RE);
    const src = [
      fs.readFileSync(path.join(__dirname, "../lib/director-ia-profitability-subtopic.js"), "utf8"),
      fs.readFileSync(path.join(__dirname, "../lib/director-ia-chat.js"), "utf8"),
      fs.readFileSync(path.join(__dirname, "../lib/director-ia-dashboard-forecast-adapter.js"), "utf8"),
      fs.readFileSync(path.join(__dirname, "../lib/director-ia-rentabilidad-deterioro-snapshot.js"), "utf8"),
    ].join("\n");
    assert.doesNotMatch(src, /computeDeltaGastos|delta_gastos|deltaGastos/);
  });

  it("R-EXP-SUBTOPIC-012: no atribuye causalidad monetaria exacta", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    assert.doesNotMatch(String(t4.answer || ""), CAUSAL_RE);
  });

  it("R-EXP-SUBTOPIC-013: operativos usa exclusivamente rows[].operativos", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const tOper = await runTurn(Q_OPER, { t1, t2, state: stateOf(t2) });
    const t4 = await runTurn(Q4, { t1, t2, tOper, state: stateOf(tOper) });
    const cmp = expenseCompare(t4);
    assert.equal(stateOf(tOper) && stateOf(tOper).active_subtopic, "expense.operational");
    assert.equal(cmp && cmp.field, "operativos");
    assert.equal(cmp && cmp.a, KPI_A.operativos);
    assert.equal(cmp && cmp.b, KPI_B.operativos);
    assert.notEqual(cmp && cmp.a, KPI_A.utilOperImporte);
    assert.notEqual(cmp && cmp.b, KPI_B.utilOperImporte);
  });

  it("R-EXP-SUBTOPIC-014: gasto total usa exclusivamente rows[].gasto", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const t4 = await runTurn(Q4, { t1, t2, state: stateOf(t2) });
    const cmp = expenseCompare(t4);
    assert.equal(stateOf(t2) && stateOf(t2).active_subtopic, "expense");
    assert.equal(cmp && cmp.field, "gasto");
    assert.equal(cmp && cmp.a, KPI_A.gasto);
    assert.equal(cmp && cmp.b, KPI_B.gasto);
    assert.notEqual(cmp && cmp.a, KPI_A.operativos);
    assert.notEqual(cmp && cmp.a, KPI_A.corporativos);
  });

  it("R-EXP-SUBTOPIC-015: sin conversation_state no inventa hilo financiero", async () => {
    wire();
    const isolated = await runTurn(Q4, null);
    assert.notEqual(stateOf(isolated) && stateOf(isolated).parent_intent, "profitability_deterioro_snapshot");
    assert.equal(expenseCompare(isolated), undefined);
    assert.doesNotMatch(String(isolated.answer || ""), /variaci[oó]n de gasto/i);
    assert.match(String(isolated.answer || ""), GENERIC_CLARIFICATION_RE);
  });

  it("R-EXP-SUBTOPIC-016: plant mismatch no reutiliza contexto", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4x = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) }, {
      planta_id: OTHER_PLANTA_ID,
      planta_nombre: "OtraPlantaFix",
    });
    const st = stateOf(t4x);
    assert.notEqual(st && st.parent_intent, "profitability_deterioro_snapshot");
    assert.equal(expenseCompare(t4x), undefined);
    assert.doesNotMatch(String(t4x.answer || ""), /variaci[oó]n de gasto/i);
  });

  it("R-EXP-SUBTOPIC-017: conversation_state no contiene importes de gasto", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    assert.equal(stateHasExpenseImporte(stateOf(t1)), false, JSON.stringify(stateOf(t1)));
    assert.equal(stateHasExpenseImporte(stateOf(t3)), false, JSON.stringify(stateOf(t3)));
    assert.equal(stateHasExpenseImporte(stateOf(t4)), false, JSON.stringify(stateOf(t4)));
  });

  it("R-EXP-SUBTOPIC-018: T4 con evidencia no usa Action Register ni OpenAI", async () => {
    wire();
    const { t1, t2, t3 } = await runCanonToT3();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    assert.equal(t4.ok, true, t4.error);
    assert.equal(openaiCalls, 0);
    assert.notEqual(t4.context_meta && t4.context_meta.openai_called, true);
    assert.notEqual(t4.context_meta && t4.context_meta.mode, "plant_diagnosis");
    assert.doesNotMatch(String(t4.answer || ""), AR_OR_PLANT_RE);
  });
});
