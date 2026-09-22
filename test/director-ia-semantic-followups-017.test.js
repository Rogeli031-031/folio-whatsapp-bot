"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion, inheritBlockedByExplicitMetric } = require("../lib/director-ia-planner");
const {
  extractExpenseAnalyticsSpec,
  loadExpenseAnalyticsForChat,
  buildExpenseAnalyticsAnswer,
} = require("../lib/director-ia-expense-analytics");
const {
  normalizeKeywordConcept,
  keywordAliases,
  rowMatchesKeywordConcept,
} = require("../lib/director-ia-executive-context-sales-entity-010");
const {
  extractClientRankingSpec,
  isClientRankingFollowUp,
  loadClientRankingForChat,
  buildClientRankingAnswer,
  buildClientRankingChatResult,
  previousYearMonth,
} = require("../lib/director-ia-client-ranking");
const {
  LLANTA_PARAPHRASES_25,
  DISCOUNT_RELATIVE_26_43,
  DISCOUNT_AUGUST_44_50,
} = require("./fixtures/director-ia-semantic-followups-017");

const NOW = new Date("2026-09-21T12:00:00-06:00");
const PRIOR_RANKING = {
  parent_intent: "client_discount_ranking",
  active_subtopic: "client_discount_ranking",
  metric: "DISCOUNT",
};
const PRIOR_SPEC = {
  ok: true,
  ranking_direction: "TOP",
  limit: 10,
  customer_segment: "ALL",
  metric: "DISCOUNT",
  discount_metric: "DISCOUNT_PER_KG",
  period: "2026-09",
  period_kind: "SINGLE",
  plant_label: "Acapulco",
  plant_id: 1,
};

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-01",
    importe: 1000,
    estatus: "AUTORIZADO",
    categoria: "TALLER",
    subcategoria: null,
    concepto: "compra de llanta",
    beneficiario: "Proveedor",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function llantaRows() {
  return [
    row({ id: 1, numero_folio: "F-ENE", mes_cargo: "2026-01", importe: 400, concepto: "compra de llanta" }),
    row({ id: 2, numero_folio: "F-MAR", mes_cargo: "2026-03", importe: 600, concepto: "neumaticos" }),
    row({ id: 3, numero_folio: "F-AGO", mes_cargo: "2026-08", importe: 500, concepto: "llantas y parrilla" }),
    row({ id: 4, numero_folio: "F-SEP", mes_cargo: "2026-09", importe: 9999, concepto: "llantas" }),
    row({ id: 5, numero_folio: "F-ACE", mes_cargo: "2026-02", importe: 800, concepto: "aceite" }),
  ];
}

function injectExpense(question) {
  const rows = llantaRows();
  return {
    now: NOW,
    question,
    auth: { role: "ZP" },
    resolveEquivalentIds: (id) => [Number(id)],
    queryPublicFolios: async (_c, plantaId, mesCargo) =>
      rows.filter((r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)),
  };
}

function discountRows(period) {
  const ym = period || "2026-08";
  return [
    { cliente_norm: "CLIENTE A", cliente: "CLIENTE A", monto: 2000, kg: 1000, canal: "Casa", periodo: ym },
    { cliente_norm: "CLIENTE B", cliente: "CLIENTE B", monto: 500, kg: 1000, canal: "Casa", periodo: ym },
  ];
}

async function loadDiscountFollow(question, priorPeriod, rows) {
  return loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
    question,
    now: NOW,
    plant_label: "Acapulco",
    forceDiscount: true,
    discountRows: rows == null ? discountRows(priorPeriod === "2026-08" ? "2026-08" : "2026-08") : rows,
    priorSpec: { ...PRIOR_SPEC, period: priorPeriod || "2026-09" },
  });
}

describe("017 aliases de gasto llanta", () => {
  it("auditoría: el matcher canónico vive en 010 y no se duplica en expense analytics", () => {
    const expense = fs.readFileSync(path.join(__dirname, "..", "lib", "director-ia-expense-analytics.js"), "utf8");
    assert.match(expense, /normalizeKeywordConcept/);
    assert.match(expense, /rowMatchesKeywordConcept/);
    assert.doesNotMatch(expense, /const LLANTA_ALIASES/);
    assert.deepEqual(keywordAliases("llanta"), ["llanta", "llantas", "neumatico", "neumaticos"]);
    assert.equal(rowMatchesKeywordConcept({ concepto: "neumáticos" }, "llanta"), true);
    assert.equal(rowMatchesKeywordConcept({ concepto: "llanta" }, "llanta"), true);
    assert.equal(rowMatchesKeywordConcept({ concepto: "aceite" }, "llanta"), false);
  });

  it("25 paráfrasis canonicalizan llanta y suman enero-agosto 2026", async () => {
    assert.equal(LLANTA_PARAPHRASES_25.length, 25);
    for (const q of LLANTA_PARAPHRASES_25) {
      assert.equal(normalizeKeywordConcept(q), "llanta", q);
      const spec = extractExpenseAnalyticsSpec(q, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(normalizeKeywordConcept(spec.keyword), "llanta", q);
      assert.equal(spec.period_start, "2026-01", q);
      assert.equal(spec.period_end, "2026-08", q);
      const payload = await loadExpenseAnalyticsForChat(null, 1, { dashboardAuth: { role: "ZP" } }, injectExpense(q));
      assert.equal(payload.analysis.sum, 1500, q);
      assert.equal(payload.records.some((r) => r.numero_folio === "F-SEP"), false, q);
      const ans = buildExpenseAnalyticsAnswer({ ...payload, spec: { ...payload.spec, question: q } });
      assert.match(ans, /1500|1,500|\$1,500/);
      assert.match(ans, /no todo el importe necesariamente corresponde exclusivamente|importes completos/i);
    }
  });
});

describe("017 continuidad ranking descuento", () => {
  it("auditoría: el follow-up suelto cae a IGF y el estado de septiembre conserva el ranking", () => {
    const loose = detectDirectorIaIntent("que descuentos tenia el mes anterior?");
    assert.notEqual(loose.intent, "client_discount_ranking");
    assert.ok(
      loose.intent === "igf_direct_metric" ||
        loose.intent === "executive_sales_context" ||
        loose.intent === "client_profile",
      loose.intent
    );
    const first = {
      ok: true,
      spec: { ...PRIOR_SPEC },
      ranked: [
        { cliente: "CLIENTE A", desc_kg: 2, kg: 1000, monto: 2000 },
      ],
      question: "septiembre",
    };
    const chat = buildClientRankingChatResult(first, { planta_id: 1 });
    const state = chat.context_meta.conversation_state;
    assert.equal(state.parent_intent, "client_discount_ranking");
    assert.equal(state.active_entities[0].metric, "DISCOUNT");
    assert.equal(state.active_entities[0].limit, 10);
    assert.equal(state.active_entities[0].ranking_direction, "TOP");
    assert.equal(state.active_entities[0].period, "2026-09");
    assert.equal(state.active_entities[0].discount_metric, "DISCOUNT_PER_KG");
  });

  it("25 paráfrasis heredan ranking y resuelven agosto 2026", async () => {
    const all = DISCOUNT_RELATIVE_26_43.concat(DISCOUNT_AUGUST_44_50);
    assert.equal(all.length, 25);
    for (const q of all) {
      assert.equal(isClientRankingFollowUp(q), true, q);
      const detected = detectDirectorIaIntent(q, { prior: PRIOR_RANKING });
      assert.equal(detected.intent, "client_discount_ranking", q);
      const plan = planDirectorIaQuestion(q, {
        prior: PRIOR_RANKING,
        inheritParentIntent: "client_discount_ranking",
      });
      assert.equal(plan.intent, "client_discount_ranking", q);
      assert.notEqual(plan.intent, "igf_direct_metric", q);
      assert.notEqual(plan.intent, "plant_metric_comparison", q);
      const spec = extractClientRankingSpec(q, PRIOR_SPEC, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "DISCOUNT", q);
      assert.equal(spec.discount_metric, "DISCOUNT_PER_KG", q);
      assert.equal(spec.limit, 10, q);
      assert.equal(spec.ranking_direction, "TOP", q);
      assert.equal(spec.period, "2026-08", q);
      const payload = await loadDiscountFollow(q, "2026-09");
      assert.equal(payload.spec.period, "2026-08", q);
      assert.equal(payload.spec.metric, "DISCOUNT", q);
      assert.equal(payload.spec.limit, 10, q);
      const ans = buildClientRankingAnswer(payload);
      assert.match(ans, /agosto de 2026|agosto/, q);
      assert.doesNotMatch(ans, /septiembre de 2026/, q);
      assert.doesNotMatch(ans, /RESULT_WITH_EVIDENCE|El descuento de septiembre/, q);
    }
  });

  it("precedencia: explícito gana a herencia", async () => {
    const fiveDisc = extractClientRankingSpec("ahora los 5 con mayor descuento de agosto", PRIOR_SPEC, { now: NOW });
    assert.equal(fiveDisc.limit, 5);
    assert.equal(fiveDisc.metric, "DISCOUNT");
    assert.equal(fiveDisc.period, "2026-08");

    const ventaQ = "ahora los 5 clientes con mayor venta de agosto";
    assert.equal(inheritBlockedByExplicitMetric(ventaQ, "client_discount_ranking"), true);
    const ventaPlan = planDirectorIaQuestion(ventaQ, {
      prior: PRIOR_RANKING,
      inheritParentIntent: "client_discount_ranking",
    });
    assert.notEqual(ventaPlan.intent, "client_discount_ranking");
    const venta = extractClientRankingSpec(ventaQ, PRIOR_SPEC, { now: NOW });
    assert.equal(venta.metric, "VENTA_TON");
    assert.equal(venta.limit, 5);
    assert.equal(venta.period, "2026-08");

    const low = extractClientRankingSpec("y el mes anterior pero de menor descuento", PRIOR_SPEC, { now: NOW });
    assert.equal(low.metric, "DISCOUNT");
    assert.equal(low.period, "2026-08");
    assert.equal(low.ranking_direction, "BOTTOM");
  });

  it("enero 2026 + mes anterior → diciembre 2025", () => {
    const spec = extractClientRankingSpec("mes anterior", { ...PRIOR_SPEC, period: "2026-01" }, { now: NOW });
    assert.equal(spec.period, "2025-12");
    assert.equal(previousYearMonth("2026-01"), "2025-12");
  });

  it("agosto sin datos no reutiliza septiembre", async () => {
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "que descuentos tenia el mes anterior?",
      now: NOW,
      plant_label: "Acapulco",
      forceDiscount: true,
      discountRows: [],
      lastSafeCutDiscountRows: [{ cliente_norm: "SEP CLIENTE", monto: 170, kg: 1000, canal: "Casa" }],
      lastSafeCutPeriod: "2026-09",
      priorSpec: PRIOR_SPEC,
    });
    assert.equal(payload.spec.period, "2026-08");
    assert.equal((payload.ranked || []).length, 0);
    const ans = buildClientRankingAnswer(payload);
    assert.match(ans, /No tengo descuentos observados por cliente para agosto de 2026/);
    assert.doesNotMatch(ans, /SEP CLIENTE|septiembre de 2026|-0\.17/);
  });
});

describe("017 las 50 frases no viven en producción", () => {
  it("ningún módulo de producción incrusta las 50 paráfrasis", () => {
    const libs = [
      "lib/director-ia-expense-analytics.js",
      "lib/director-ia-executive-context-sales-entity-010.js",
      "lib/director-ia-planner.js",
      "lib/director-ia-chat.js",
      "lib/director-ia-client-ranking.js",
    ];
    const banned = "cuanto gastamos en llantas de enero a agosto?";
    for (const rel of libs) {
      const src = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
      assert.equal(src.includes(banned), false, rel);
      assert.doesNotMatch(src, /LLANTA_PARAPHRASES_25/);
    }
  });
});
