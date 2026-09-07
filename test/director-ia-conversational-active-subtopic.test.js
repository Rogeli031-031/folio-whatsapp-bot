"use strict";

/**
 * R-CONV-SUBTOPIC: T1 rentabilidad → T2 gasto → T3 corporativos vía askDirectorIa.
 * Profundidad estructurada. No LIVE_DB. Fixture: director-ia-rent-cut.
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fx = require("./fixtures/director-ia-rent-cut");

const Q1 = "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?";
const Q2 = "y gasto?";
const Q3 = "y corporativos?";
const Q4 = "¿cuánto subieron?";
const Q_UNKNOWN_CHILD = "y foobarxyz?";
const PLANTA_ID = 7;
const OTHER_PLANTA_ID = 8;
const PERIODO_A = `${fx.YEAR_A}-${String(fx.MONTH_A).padStart(2, "0")}`;
const PERIODO_B = `${fx.YEAR_B}-${String(fx.MONTH_B).padStart(2, "0")}`;

const GENERIC_CLARIFICATION_RE =
  /No pude anclar esta frase|No se pudo determinar una intenci[oó]n|No asumo el hilo/i;
const AR_OR_PLANT_RE = /Action Register|acciones abiertas|diagn[oó]stico de (la )?planta/i;
const T1_FULL_REPORT_RE =
  /A\.\s*RESULTADO DE RENTABILIDAD[\s\S]*B\.\s*PRESI[OÓ]N COMERCIAL[\s\S]*C\.\s*L[IÍ]MITES DE ATRIBUCI[OÓ]N/;

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

function isExpenseSubtopic(raw) {
  const s = String(raw || "");
  return s === "expense" || s.startsWith("expense.");
}

function isCorporateExpenseSubtopic(raw) {
  const s = String(raw || "");
  return s === "expense.corporate" || s === "corporate" || s.endsWith(".corporate");
}

describe("R-CONV-SUBTOPIC askDirectorIa T1→T2 gasto→T3 corporativos", () => {
  let askDirectorIa;
  let configureDirectorIaChat;
  let openaiCalls;

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
    configureDirectorIaChat({
      now: fx.NOW,
      pool: emptyLogPool(),
      plantCatalog: [
        { planta_id: PLANTA_ID, nombre: fx.PLANT, clave: "E3" },
        { planta_id: OTHER_PLANTA_ID, nombre: "OtraPlantaFix", clave: "E9" },
      ],
      openaiChat: async () => {
        openaiCalls += 1;
        return "Diagnóstico genérico de planta / Action Register (no debe usarse en T3).";
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
      loadIgfForecastMiniPayload: async (_client, opts) =>
        fx.computeRentCutMiniPayload({
          year: opts && opts.year,
          month: opts && opts.month,
          upload_day: (opts && opts.upload_day) || null,
          now: fx.NOW,
        }),
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

  async function runCanon() {
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const t3 = await runTurn(Q3, { t1, t2, state: stateOf(t2) });
    return { t1, t2, t3 };
  }

  it("R-CONV-SUBTOPIC-001: T1 deja parent profitability_deterioro_snapshot", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    assert.equal(t1.ok, true, t1.error || "T1 no ok");
    assert.equal(stateOf(t1) && stateOf(t1).parent_intent, "profitability_deterioro_snapshot");
  });

  it("R-CONV-SUBTOPIC-002: T2 y gasto? deja active_subtopic expense", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    assert.equal(t2.ok, true, t2.error || "T2 no ok");
    assert.ok(isExpenseSubtopic(stateOf(t2) && stateOf(t2).active_subtopic), stateOf(t2) && stateOf(t2).active_subtopic);
  });

  it("R-CONV-SUBTOPIC-003: T2 conserva planta y A/B", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const st = stateOf(t2);
    assert.equal(st && st.planta_id, PLANTA_ID);
    assert.ok(st && st.active_period_months && st.active_period_months.includes(PERIODO_A));
    assert.ok(st && st.active_period_months && st.active_period_months.includes(PERIODO_B));
  });

  it("R-CONV-SUBTOPIC-004: T3 recibe parent snapshot + subtopic expense", async () => {
    wire();
    const { t2, t3 } = await runCanon();
    const incoming = stateOf(t2);
    assert.equal(incoming.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(isExpenseSubtopic(incoming.active_subtopic), incoming.active_subtopic);
    assert.equal(t3.ok, true, t3.error || "T3 no ok");
    assert.equal(stateOf(t3) && stateOf(t3).parent_intent, "profitability_deterioro_snapshot");
  });

  it("R-CONV-SUBTOPIC-005: T3 resuelve corporativos relativo a expense", async () => {
    wire();
    const { t3 } = await runCanon();
    const st = stateOf(t3);
    assert.ok(isCorporateExpenseSubtopic(st && st.active_subtopic), st && st.active_subtopic);
    assert.match(String(t3.answer || ""), /corporativ/i);
    assert.match(String(t3.answer || ""), /gasto/i);
    assert.doesNotMatch(String(t3.answer || ""), T1_FULL_REPORT_RE);
    assert.notEqual(t3.context_meta && t3.context_meta.mode, "plant_diagnosis");
  });

  it("R-CONV-SUBTOPIC-006: T3 no cae a plant diagnosis / AR / GPT", async () => {
    wire();
    const { t3 } = await runCanon();
    assert.equal(t3.ok, true, t3.error || "T3 no ok");
    assert.notEqual(t3.context_meta && t3.context_meta.mode, "plant_diagnosis");
    assert.notEqual(t3.context_meta && t3.context_meta.openai_called, true);
    assert.equal(openaiCalls, 0);
    assert.doesNotMatch(String(t3.answer || ""), AR_OR_PLANT_RE);
    assert.doesNotMatch(String(t3.answer || ""), GENERIC_CLARIFICATION_RE);
  });

  it("R-CONV-SUBTOPIC-007: T3 deja conversation_state válido para T4", async () => {
    wire();
    const { t3 } = await runCanon();
    const st = stateOf(t3);
    assert.equal(st.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(isExpenseSubtopic(st.active_subtopic) || isCorporateExpenseSubtopic(st.active_subtopic));
    assert.equal(st.planta_id, PLANTA_ID);
    assert.ok(Array.isArray(st.active_period_months) && st.active_period_months.length >= 2);
  });

  it("R-CONV-SUBTOPIC-008: plant mismatch limpia parent y active_subtopic", async () => {
    wire();
    const { t2 } = await runCanon();
    const t3x = await runTurn(Q3, { t1: { answer: "x" }, t2, state: stateOf(t2) }, {
      planta_id: OTHER_PLANTA_ID,
      planta_nombre: "OtraPlantaFix",
    });
    const st = stateOf(t3x);
    assert.notEqual(st && st.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(!st || st.active_subtopic == null || st.active_subtopic === "");
    assert.doesNotMatch(String(t3x.answer || ""), /seguimos/i);
  });

  it("R-CONV-SUBTOPIC-009: corporativos sin state no inventa rentabilidad/gasto", async () => {
    wire();
    const isolated = await runTurn(Q3, null);
    const st = stateOf(isolated);
    assert.notEqual(st && st.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(!st || st.active_subtopic == null || st.active_subtopic === "");
    assert.doesNotMatch(String(isolated.answer || ""), /seguimos/i);
    assert.doesNotMatch(String(isolated.answer || ""), /deterioro de rentabilidad/i);
    assert.doesNotMatch(String(isolated.answer || ""), /rama gasto/i);
    assert.match(String(isolated.answer || ""), GENERIC_CLARIFICATION_RE);
  });

  it("R-CONV-SUBTOPIC-010: child no reconocido conserva hilo y no salta de dominio", async () => {
    wire();
    const t1 = await runTurn(Q1, null);
    const t2 = await runTurn(Q2, { t1, state: stateOf(t1) });
    const unknown = await runTurn(Q_UNKNOWN_CHILD, { t1, t2, state: stateOf(t2) });
    const st = stateOf(unknown);
    assert.equal(unknown.ok, true, unknown.error || "unknown child no ok");
    assert.equal(st && st.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(isExpenseSubtopic(st && st.active_subtopic), st && st.active_subtopic);
    assert.notEqual(unknown.context_meta && unknown.context_meta.mode, "plant_diagnosis");
    assert.notEqual(unknown.context_meta && unknown.context_meta.openai_called, true);
    assert.doesNotMatch(String(unknown.answer || ""), AR_OR_PLANT_RE);
  });

  it("R-CONV-SUBTOPIC-T4: cuánto subieron? conserva hilo corporate/expense y no inventa cifra", async () => {
    wire();
    const { t1, t2, t3 } = await runCanon();
    const t4 = await runTurn(Q4, { t1, t2, t3, state: stateOf(t3) });
    const st = stateOf(t4);
    assert.equal(t4.ok, true, t4.error || "T4 no ok");
    assert.equal(st && st.parent_intent, "profitability_deterioro_snapshot");
    assert.ok(
      isCorporateExpenseSubtopic(st && st.active_subtopic) || isExpenseSubtopic(st && st.active_subtopic),
      st && st.active_subtopic
    );
    assert.notEqual(t4.context_meta && t4.context_meta.mode, "plant_diagnosis");
    assert.notEqual(t4.context_meta && t4.context_meta.openai_called, true);
    assert.equal(openaiCalls, 0);
    assert.doesNotMatch(String(t4.answer || ""), AR_OR_PLANT_RE);
    assert.doesNotMatch(String(t4.answer || ""), /\$\s*\d{2,}/);
    assert.match(String(t4.answer || ""), /no (tengo|puedo|est[aá] conectad)|todav[ií]a no/i);
  });
});
