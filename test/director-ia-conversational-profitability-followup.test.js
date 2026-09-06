"use strict";

/**
 * R-CONV-PROFIT: T1 deterioro de rentabilidad → T2 "gasto" vía askDirectorIa.
 * Cruza askDirectorIa. No inventa hilo. No LIVE_DB. Fixture: director-ia-rent-cut.
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fx = require("./fixtures/director-ia-rent-cut");
const { detectDirectorIaIntent } = require("../lib/director-ia-planner");
const { resolveConversationTurn } = require("../lib/director-ia-conversation-state");

const Q1 = "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?";
const Q2 = "gasto";
const PLANTA_ID = 7;
const OTHER_PLANTA_ID = 8;
const PERIODO_A = `${fx.YEAR_A}-${String(fx.MONTH_A).padStart(2, "0")}`;
const PERIODO_B = `${fx.YEAR_B}-${String(fx.MONTH_B).padStart(2, "0")}`;

const GENERIC_CLARIFICATION_RE =
  /No pude anclar esta frase|No se pudo determinar una intenci[oó]n|No asumo el hilo/i;
const T1_FULL_REPORT_RE = /A\.\s*RESULTADO DE RENTABILIDAD[\s\S]*B\.\s*PRESI[OÓ]N COMERCIAL[\s\S]*C\.\s*L[IÍ]MITES DE ATRIBUCI[OÓ]N/;
const DELTA_GASTOS_EXISTS_RE = /(?<!no\s)(?<!todav[ií]a no\s)existe un Delta Gastos reconciliado/i;

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

function t1State(result) {
  return result && result.context_meta && result.context_meta.conversation_state;
}

function inheritFromT2(t1, t2Question, plantaId) {
  return resolveConversationTurn({
    question: t2Question,
    history: [],
    plantaId,
    echoedState: t1State(t1),
    detectIntent: detectDirectorIaIntent,
  });
}

describe("R-CONV-PROFIT askDirectorIa T1 rentabilidad → T2 gasto", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

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
      plantCatalog: undefined,
    });
  });

  function wire() {
    configureDirectorIaChat({
      now: fx.NOW,
      pool: emptyLogPool(),
      plantCatalog: [
        { planta_id: PLANTA_ID, nombre: fx.PLANT, clave: "E3" },
        { planta_id: OTHER_PLANTA_ID, nombre: "OtraPlantaFix", clave: "E9" },
      ],
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

  function reqOf(question, extra) {
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

  async function runT1() {
    return askDirectorIa(reqOf(Q1), PLANTA_ID, Q1);
  }

  async function runT2(t1, extra) {
    const state = t1State(t1);
    return askDirectorIa(
      reqOf(Q2, {
        conversation_state: state,
        history: [
          { role: "user", content: Q1 },
          { role: "assistant", content: t1.answer },
          { role: "user", content: Q2 },
        ],
        ...(extra || {}),
      }),
      extra && extra.planta_id != null ? extra.planta_id : PLANTA_ID,
      Q2
    );
  }

  it("R-CONV-PROFIT-001: T1 produce parent_intent heredable profitability_deterioro_snapshot", async () => {
    wire();
    const t1 = await runT1();
    assert.equal(t1.ok, true, t1.error || "T1 no ok");
    const state = t1State(t1);
    assert.ok(state, "T1 no produjo conversation_state");
    assert.equal(state.parent_intent, "profitability_deterioro_snapshot");
  });

  it("R-CONV-PROFIT-002: T1 conserva planta", async () => {
    wire();
    const t1 = await runT1();
    const state = t1State(t1);
    assert.equal(state && state.planta_id, PLANTA_ID);
  });

  it("R-CONV-PROFIT-003: T1 conserva periodo A/B en active_period_months", async () => {
    wire();
    const t1 = await runT1();
    const months = (t1State(t1) && t1State(t1).active_period_months) || [];
    assert.ok(months.includes(PERIODO_A), `falta periodo A ${PERIODO_A}; got=${JSON.stringify(months)}`);
    assert.ok(months.includes(PERIODO_B), `falta periodo B ${PERIODO_B}; got=${JSON.stringify(months)}`);
  });

  it("R-CONV-PROFIT-004: T2 gasto + echoed state produce inherit=true", async () => {
    wire();
    const t1 = await runT1();
    const turn = inheritFromT2(t1, Q2, PLANTA_ID);
    assert.equal(turn.inherit, true, `resolveConversationTurn.inherit=${turn.inherit}`);
    assert.equal(turn.inherit_parent_intent, "profitability_deterioro_snapshot");
    const t2 = await runT2(t1);
    assert.equal(t2.ok, true, t2.error || "T2 no ok");
    assert.equal(t2.context_meta && t2.context_meta.inherit, true);
    assert.equal(
      t2.context_meta && t2.context_meta.conversation_state && t2.context_meta.conversation_state.parent_intent,
      "profitability_deterioro_snapshot"
    );
  });

  it("R-CONV-PROFIT-005: T2 no termina en unknown clarification genérica", async () => {
    wire();
    const t1 = await runT1();
    const t2 = await runT2(t1);
    assert.equal(t2.ok, true, t2.error || "T2 no ok");
    assert.notEqual(t2.context_meta && t2.context_meta.mode, "conversation_clarification");
    assert.notEqual(t2.context_meta && t2.context_meta.requires_clarification, true);
    assert.doesNotMatch(String(t2.answer || ""), GENERIC_CLARIFICATION_RE);
  });

  it("R-CONV-PROFIT-006: T2 no reimprime íntegramente el reporte T1", async () => {
    wire();
    const t1 = await runT1();
    const t2 = await runT2(t1);
    assert.equal(t2.ok, true, t2.error || "T2 no ok");
    assert.notEqual(t2.context_meta && t2.context_meta.mode, "conversation_clarification");
    assert.doesNotMatch(String(t2.answer || ""), T1_FULL_REPORT_RE);
    assert.ok(String(t2.answer || "").length < String(t1.answer || "").length, "T2 no es más breve que T1");
  });

  it("R-CONV-PROFIT-007: T2 no afirma Delta Gastos reconciliado", async () => {
    wire();
    const t1 = await runT1();
    const t2 = await runT2(t1);
    const answer = String(t2.answer || "");
    assert.doesNotMatch(answer, DELTA_GASTOS_EXISTS_RE);
    assert.match(answer, /Delta Gastos/i);
    assert.match(answer, /todav[ií]a no existe|no existe/i);
  });

  it("R-CONV-PROFIT-008: cambio de planta invalida el contexto", async () => {
    wire();
    const t1 = await runT1();
    const turn = inheritFromT2(t1, Q2, OTHER_PLANTA_ID);
    assert.equal(turn.inherit, false);
    assert.equal(turn.plant_mismatch, true);
    const t2 = await askDirectorIa(
      {
        body: {
          planta_id: OTHER_PLANTA_ID,
          planta_nombre: "OtraPlantaFix",
          conversation_state: t1State(t1),
        },
        dashboardAuth: { role: "ZP" },
      },
      OTHER_PLANTA_ID,
      Q2
    );
    const state = t2.context_meta && t2.context_meta.conversation_state;
    assert.notEqual(t2.context_meta && t2.context_meta.inherit, true);
    assert.notEqual(state && state.parent_intent, "profitability_deterioro_snapshot");
    assert.doesNotMatch(String(t2.answer || ""), /seguimos con/i);
  });

  it("R-CONV-PROFIT-009: gasto sin conversation_state no inventa hilo", async () => {
    wire();
    const isolated = await askDirectorIa(reqOf(Q2), PLANTA_ID, Q2);
    assert.equal(isolated.ok, true, isolated.error || "gasto aislado no ok");
    const state = isolated.context_meta && isolated.context_meta.conversation_state;
    assert.notEqual(isolated.context_meta && isolated.context_meta.inherit, true);
    assert.equal(state && state.parent_intent, null);
    assert.doesNotMatch(String(isolated.answer || ""), /seguimos con/i);
    assert.doesNotMatch(String(isolated.answer || ""), /deterioro de rentabilidad/i);
    assert.match(String(isolated.answer || ""), GENERIC_CLARIFICATION_RE);
  });
});
