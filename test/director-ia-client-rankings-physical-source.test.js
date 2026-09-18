"use strict";

/**
 * FIX-DIRECTOR-IA-CLIENT-RANKINGS-PHYSICAL-SOURCE-001
 * Utterances explícitas de cobertura. No son reglas de producción.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const backlog = require("../lib/director-ia-executive-backlog");
const {
  extractClientRankingSpec,
  isClientRankingQuestion,
  isClientRankingFollowUp,
  buildClientRankingAnswer,
  loadClientRankingForChat,
  buildClientRankingChatResult,
  walkBackYearMonths,
  formatMonthLabel,
  previousYearMonth,
} = require("../lib/director-ia-client-ranking");

const NOW = new Date("2026-09-16T12:00:00-06:00");
const INTERNAL_TOKENS = /NO_ROWS_OBSERVED|LAST_SAFE_CUT|CLIENT_FORECAST_UNAVAILABLE|OBSERVED_PARTIAL|PROJECTED_ESTIMATE/;

const PURCHASE_50 = Object.freeze([
  "top 10 clientes que más compran",
  "top 10 clientes que más compraron",
  "top 10 compradores",
  "dame los 10 clientes que más compran",
  "cuáles son los 10 clientes que más compran",
  "quiénes son los 10 mayores compradores",
  "ranking de los 10 clientes con más venta",
  "top 10 por toneladas",
  "top 10 clientes por toneladas",
  "clientes con mayor compra",
  "clientes con mayor venta",
  "los que más compran",
  "quién compra más",
  "quiénes compran más",
  "quiénes lideran en compras",
  "principales clientes por venta",
  "los mayores compradores",
  "ranking de compradores",
  "ranking de clientes por compra",
  "ranking de clientes por venta",
  "ordéname los clientes por compra",
  "ordéname los clientes por venta",
  "dame el top de clientes",
  "top clientes por venta",
  "top clientes por toneladas",
  "qué clientes compran más",
  "qué clientes tienen más toneladas",
  "quién lidera la venta",
  "quiénes lideran la venta",
  "cuáles son nuestros mayores compradores",
  "top 10 de septiembre",
  "top 10 clientes de septiembre",
  "top 10 compradores de septiembre",
  "ranking de clientes de septiembre",
  "quién compró más en septiembre",
  "quiénes compraron más en septiembre",
  "clientes con más venta en septiembre",
  "clientes con más toneladas en septiembre",
  "top 10 de Casa en septiembre",
  "top 10 de Comisionista en septiembre",
  "mayores compradores de Casa",
  "mayores compradores de Comisionista",
  "top 5 clientes en septiembre",
  "top 20 clientes en septiembre",
  "principales compradores de septiembre",
  "muéstrame los clientes que más compraron este mes",
  "ranking comercial de clientes de septiembre",
  "quiénes fueron los mayores compradores este mes",
  "qué clientes encabezan la venta en septiembre",
  "lista los 10 clientes con mayor compra en septiembre",
]);

const DISCOUNT_50 = Object.freeze([
  "qué clientes tienen mayor descuento",
  "qué clientes tienen más descuento",
  "qué clientes reciben mayor descuento",
  "qué clientes reciben más descuento",
  "cuáles clientes tienen mayor descuento",
  "cuáles clientes tienen más descuento",
  "cuáles son los clientes con mayor descuento",
  "cuáles son los clientes con más descuento",
  "quién tiene mayor descuento",
  "quién tiene más descuento",
  "quiénes tienen mayor descuento",
  "quiénes tienen más descuento",
  "quién recibe mayor descuento",
  "quién recibe más descuento",
  "quiénes reciben mayor descuento",
  "quiénes reciben más descuento",
  "qué cliente tiene el descuento más alto",
  "qué clientes tienen el descuento más alto",
  "quién tiene el descuento más alto",
  "quiénes tienen los descuentos más altos",
  "clientes con mayor descuento",
  "clientes con más descuento",
  "clientes con los descuentos más altos",
  "clientes que reciben más descuento",
  "clientes que reciben mayor descuento",
  "top clientes con mayor descuento",
  "top clientes con más descuento",
  "top 5 clientes con mayor descuento",
  "top 10 clientes con mayor descuento",
  "top 20 clientes con mayor descuento",
  "ranking de clientes por descuento",
  "ranking de descuento por cliente",
  "ranking de descuentos de clientes",
  "ordéname los clientes por descuento",
  "ordena los clientes de mayor a menor descuento",
  "lista los clientes con mayor descuento",
  "muéstrame los clientes con más descuento",
  "dame los clientes con mayor descuento",
  "dame el top de clientes por descuento",
  "cuáles lideran en descuento",
  "quién lidera en descuento",
  "quiénes lideran los descuentos",
  "principales clientes por descuento",
  "mayores descuentos por cliente",
  "descuentos más altos por cliente",
  "qué clientes tienen mejor descuento",
  "cuáles tienen el mejor descuento",
  "quién tiene mejor descuento",
  "lista los 10 clientes con más descuento",
  "muéstrame el ranking de clientes con mayor descuento",
]);

const PURCHASE_FOLLOW_20 = Object.freeze([
  "septiembre",
  "agosto",
  "y en agosto",
  "ahora septiembre",
  "solo Casa",
  "solo Comisionista",
  "top 5",
  "top 20",
  "quién quedó primero",
  "quién quedó segundo",
  "cuánto compró el primero",
  "y el tercero",
  "contra agosto",
  "contra el mes pasado",
  "solo los de Casa",
  "ahora Comisionista",
  "compáralos",
  "cuánto disminuyó el primero",
  "qué comentarios tiene",
  "qué acciones tiene",
]);

const DISCOUNT_FOLLOW_20 = Object.freeze([
  "septiembre",
  "agosto",
  "y en agosto",
  "ahora septiembre",
  "solo Casa",
  "solo Comisionista",
  "top 5",
  "top 10",
  "top 20",
  "quién quedó primero",
  "quién quedó segundo",
  "cuánto descuento tiene el primero",
  "y el tercero",
  "contra agosto",
  "contra el mes pasado",
  "solo Casa",
  "ahora Comisionista",
  "compáralos",
  "cuánto compró el primero",
  "qué comentarios tiene",
]);

const ANTI_25 = Object.freeze([
  ["qué descuento tiene GRUPO MOVE", "client_profile"],
  ["cuánto descuento dimos en septiembre", "!client_discount_ranking"],
  ["qué clientes dejaron de comprar", "!client_ranking"],
  ["qué clientes nuevos entraron", "!client_ranking"],
  ["top 10 clientes que más compran", "client_ranking"],
  ["qué cliente compró más", "client_ranking"],
  ["qué clientes tienen mayor descuento", "client_discount_ranking"],
  ["qué descuento tenemos contra meta", "!client_discount_ranking"],
  ["qué folios tienen descuento", "folio_search"],
  ["top 10 folios", "!client_ranking"],
  ["qué teléfono tiene GRUPO MOVE", "client_contact_lookup"],
  ["cuánto vendimos en septiembre", "!client_ranking"],
  ["abre F-202602-148", "folio_search"],
  ["cuántos folios de llantas hay", "folio_search"],
  ["cómo vamos en IGF", "igf_status"],
  ["cómo vamos en ARR", "arr_status"],
  ["cuánto gastamos en llantas", "expense_analytics"],
  ["qué equipos SEH hay", "!client_ranking"],
  ["hola", "smalltalk"],
  ["clientes que aumentaron compra", "!client_ranking"],
  ["quiénes están inactivos", "!client_ranking"],
  ["qué descuento tiene el cliente GRUPO MOVE", "client_profile"],
  ["top 10 clientes que más compran en septiembre", "client_ranking"],
  ["quién tiene mayor descuento", "client_discount_ranking"],
  ["qué clientes reciben más descuento", "client_discount_ranking"],
]);

const COMPOUND = Object.freeze([
  ["top 10 clientes que más compran en septiembre en Acapulco", "client_ranking", { period: "2026-09", limit: 10 }],
  ["top 5 de Casa en agosto", "client_ranking", { period: "2026-08", limit: 5, segment: "CASA" }],
  ["qué clientes tienen mayor descuento en septiembre", "client_discount_ranking", { period: "2026-09" }],
  ["top 10 descuentos de Comisionista", "client_discount_ranking", { limit: 10, segment: "COMISIONISTA" }],
  ["quién tiene mayor descuento en Puebla", "client_discount_ranking", { limit: 1 }],
]);

function salesRows() {
  return [
    { cliente_norm: "PUBLICO EN GENERAL", kg: 12000, canal: "Casa" },
    { cliente_norm: "GRUPO MOVE", kg: 8000, canal: "Casa" },
    { cliente_norm: "CLIENTE TRES", kg: 3000, canal: "Comisionista" },
  ];
}

function discountRows() {
  return [
    { cliente_norm: "GRUPO MOVE", monto: 45000, kg: 15000, canal: "Casa" },
    { cliente_norm: "PUBLICO EN GENERAL", monto: 22000, kg: 20000, canal: "Casa" },
    { cliente_norm: "CLIENTE TRES", monto: 9000, kg: 6000, canal: "Comisionista" },
  ];
}

describe("FIX-DIRECTOR-IA-CLIENT-RANKINGS-PHYSICAL-SOURCE-001", () => {
  it("50 utterances de ranking de compra", () => {
    assert.equal(PURCHASE_50.length, 50);
    for (const q of PURCHASE_50) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "client_ranking", q);
      assert.equal(isClientRankingQuestion(q), true, q);
      const spec = extractClientRankingSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "VENTA_TON", q);
      assert.equal(spec.ranking_direction, "TOP", q);
    }
  });

  it("50 utterances de ranking de descuento", () => {
    assert.equal(DISCOUNT_50.length, 50);
    for (const q of DISCOUNT_50) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "client_discount_ranking", q);
      assert.equal(backlog.isClientDiscountRankingQuestion(q), true, q);
      assert.equal(backlog.isIndividualDiscountLookupQuestion(q), false, q);
      const spec = backlog.extractClientDiscountRankingSpec(q);
      assert.equal(spec.ok, true, q);
      assert.equal(spec.family, "CLIENT_DISCOUNT_RANKING", q);
      assert.equal(spec.domain, "ARR", q);
      assert.equal(spec.operation, "RANK", q);
      assert.equal(spec.entity_type, "CLIENT", q);
      assert.equal(spec.metric, "DISCOUNT", q);
      assert.equal(spec.direction, "HIGH", q);
    }
  });

  it("20 follow-ups de compra conservan frame", () => {
    assert.equal(PURCHASE_FOLLOW_20.length, 20);
    const prior = {
      ok: true,
      ranking_direction: "TOP",
      limit: 10,
      customer_segment: "ALL",
      metric: "VENTA_TON",
      period: "2026-09",
      plant_label: "Acapulco",
    };
    for (const q of PURCHASE_FOLLOW_20) {
      assert.equal(isClientRankingFollowUp(q), true, q);
      const spec = extractClientRankingSpec(q, prior, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.notEqual(spec.metric, "DISCOUNT", q);
    }
  });

  it("20 follow-ups de descuento no caen a cliente individual", () => {
    assert.equal(DISCOUNT_FOLLOW_20.length, 20);
    const prior = {
      ok: true,
      ranking_direction: "TOP",
      limit: 5,
      customer_segment: "ALL",
      metric: "DISCOUNT",
      period: "2026-09",
      plant_label: "Acapulco",
    };
    for (const q of DISCOUNT_FOLLOW_20) {
      assert.equal(backlog.isIndividualDiscountLookupQuestion(q), false, q);
      if (!/\bcompro\b/.test(q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
        assert.equal(isClientRankingFollowUp(q) || backlog.isClientDiscountRankingQuestion(q), true, q);
      }
    }
  });

  it("25 anti-colisiones", () => {
    assert.equal(ANTI_25.length, 25);
    for (const [q, intent] of ANTI_25) {
      const plan = planDirectorIaQuestion(q);
      if (intent && intent.startsWith("!")) {
        assert.notEqual(plan.intent, intent.slice(1), `${q} → ${plan.intent}`);
      } else if (intent) {
        assert.equal(plan.intent, intent, `${q} → ${plan.intent}`);
      }
      if (q === "qué descuento tiene GRUPO MOVE") {
        assert.notEqual(plan.intent, "client_discount_ranking", q);
        assert.equal(backlog.isIndividualDiscountLookupQuestion(q), true);
      }
      if (q === "qué clientes tienen mayor descuento") {
        assert.equal(plan.intent, "client_discount_ranking", q);
        assert.equal(backlog.isIndividualDiscountLookupQuestion(q), false);
      }
      if (q === "cuánto descuento dimos en septiembre") {
        assert.notEqual(plan.intent, "client_discount_ranking", q);
        assert.notEqual(plan.intent, "client_ranking", q);
      }
      if (q === "cuánto vendimos en septiembre") {
        assert.notEqual(plan.intent, "client_ranking", q);
      }
    }
  });

  it("variantes compuestas periodo/canal/planta/limit", () => {
    for (const [q, intent, expect] of COMPOUND) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, intent, q);
      if (intent === "client_ranking") {
        const spec = extractClientRankingSpec(q, null, { now: NOW });
        if (expect.period) assert.equal(spec.period, expect.period, q);
        if (expect.limit) assert.equal(spec.limit, expect.limit, q);
        if (expect.segment) assert.equal(spec.customer_segment, expect.segment, q);
      } else {
        const spec = backlog.extractClientDiscountRankingSpec(q);
        if (expect.limit) assert.equal(spec.limit, expect.limit, q);
        if (expect.segment) assert.equal(spec.channel, expect.segment, q);
      }
    }
  });

  it("secuencia A: top 10 + septiembre conserva limit=10 y VENTA_TON", async () => {
    const first = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que mas compran",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: salesRows(),
    });
    assert.match(first.clarification, /De qué mes o periodo quieres el ranking/);
    assert.equal(first.spec.limit, 10);
    assert.equal(first.spec.metric, "VENTA_TON");
    const chat = buildClientRankingChatResult(first, { planta_id: 1 });
    assert.equal(chat.context_meta.conversation_state.pending_information_gap.parent_intent, "client_ranking");
    const second = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "septiembre",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: salesRows(),
      priorSpec: { ok: true, ...first.spec, period: null },
    });
    assert.equal(second.spec.limit, 10);
    assert.equal(second.spec.metric, "VENTA_TON");
    assert.equal(second.spec.ranking_direction, "TOP");
    assert.equal(second.spec.period, "2026-09");
    assert.equal(second.spec.customer_segment, "ALL");
    assert.doesNotMatch(buildClientRankingAnswer(second), INTERNAL_TOKENS);
  });

  it("secuencia B: top 10 en septiembre equivale a A", async () => {
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que mas compran en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: salesRows(),
    });
    assert.equal(payload.spec.limit, 10);
    assert.equal(payload.spec.metric, "VENTA_TON");
    assert.equal(payload.spec.ranking_direction, "TOP");
    assert.equal(payload.spec.period, "2026-09");
    assert.equal(payload.spec.customer_segment, "ALL");
  });

  it("secuencia C: mayor descuento + septiembre es ranking agregado", async () => {
    const first = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "que clientes tienen mayor descuento?",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
    });
    assert.match(first.clarification, /De qué mes o periodo quieres comparar los descuentos/);
    assert.equal(first.spec.metric, "DISCOUNT");
    assert.doesNotMatch(first.clarification, /ese cliente|cliente_key/i);
    const chat = buildClientRankingChatResult(first, { planta_id: 1 });
    assert.equal(chat.context_meta.conversation_state.pending_information_gap.parent_intent, "client_discount_ranking");
    const second = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
      priorSpec: { ok: true, ...first.spec, metric: "DISCOUNT", period: null },
    });
    assert.equal(second.spec.metric, "DISCOUNT");
    assert.equal(second.spec.period, "2026-09");
    assert.equal(second.spec.ranking_direction, "TOP");
    const answer = buildClientRankingAnswer(second);
    assert.match(answer, /mayor descuento por kg observado/);
    assert.doesNotMatch(answer, /No tengo evidencia de descuento para ese cliente/);
    assert.doesNotMatch(answer, INTERNAL_TOKENS);
    assert.match(answer, /GRUPO MOVE/);
  });

  it("secuencia D: GRUPO MOVE sigue siendo individual", () => {
    const q = "qué descuento tiene GRUPO MOVE";
    const plan = planDirectorIaQuestion(q);
    assert.equal(plan.intent, "client_profile");
    assert.equal(backlog.isIndividualDiscountLookupQuestion(q), true);
    assert.equal(backlog.isClientDiscountRankingQuestion(q), false);
  });

  it("quién tiene mayor descuento es ranking top 1, no profile", () => {
    const q = "quién tiene mayor descuento";
    assert.equal(planDirectorIaQuestion(q).intent, "client_discount_ranking");
    const spec = backlog.extractClientDiscountRankingSpec(q);
    assert.equal(spec.limit, 1);
    assert.equal(spec.direction, "HIGH");
  });

  it("Casa / Comisionista / ALL", () => {
    assert.equal(extractClientRankingSpec("top 10 de Casa en septiembre", null, { now: NOW }).customer_segment, "CASA");
    assert.equal(extractClientRankingSpec("top 10 de Comisionista en septiembre", null, { now: NOW }).customer_segment, "COMISIONISTA");
    assert.equal(extractClientRankingSpec("top 10 clientes en septiembre", null, { now: NOW }).customer_segment, "ALL");
    assert.equal(backlog.extractClientDiscountRankingSpec("top 10 descuentos de Casa").channel, "CASA");
    assert.equal(backlog.extractClientDiscountRankingSpec("top 10 descuentos de Comisionista").channel, "COMISIONISTA");
  });

  it("mes con filas, mes vacío y walk-back a julio", async () => {
    const withRows = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que más compran en julio",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: salesRows(),
    });
    assert.equal(withRows.data_semantics, "OBSERVED_CLOSED");
    assert.match(buildClientRankingAnswer(withRows), /julio de 2026/);
    assert.doesNotMatch(buildClientRankingAnswer(withRows), INTERNAL_TOKENS);

    const empty = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que más compran en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: [],
      lastSafeCutSalesRowsByPeriod: {
        "2026-08": [],
        "2026-07": [{ cliente_norm: "PUBLICO EN GENERAL", kg: 9000, canal: "Casa" }],
      },
    });
    assert.equal(empty.data_semantics, "LAST_SAFE_CUT");
    assert.equal(empty.asked_period, "2026-09");
    assert.equal(empty.spec.period, "2026-07");
    const human = buildClientRankingAnswer(empty);
    assert.match(human, /No tengo datos observados por cliente cargados para septiembre de 2026/);
    assert.match(human, /último ranking disponible es julio de 2026/);
    assert.match(human, /PUBLICO EN GENERAL/);
    assert.doesNotMatch(human, INTERNAL_TOKENS);
    assert.deepEqual(walkBackYearMonths("2026-09", 3), ["2026-08", "2026-07", "2026-06"]);
    assert.equal(previousYearMonth("2026-09"), "2026-08");
    assert.equal(formatMonthLabel("2026-07"), "julio de 2026");
  });

  it("ningún dato disponible y descuento last-safe-cut", async () => {
    const none = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que más compran en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: [],
      lastSafeCutSalesRowsByPeriod: { "2026-08": [], "2026-07": [] },
    });
    const noneAnswer = buildClientRankingAnswer(none);
    assert.match(noneAnswer, /No tengo datos observados por cliente/);
    assert.doesNotMatch(noneAnswer, INTERNAL_TOKENS);

    const disc = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [],
      forceDiscount: true,
      lastSafeCutDiscountRowsByPeriod: {
        "2026-08": [],
        "2026-07": [{ cliente_norm: "GRUPO MOVE", monto: 18000, kg: 6000, canal: "Casa" }],
      },
    });
    assert.equal(disc.data_semantics, "LAST_SAFE_CUT");
    assert.equal(disc.spec.period, "2026-07");
    const discAnswer = buildClientRankingAnswer(disc);
    assert.match(discAnswer, /julio de 2026/);
    assert.doesNotMatch(discAnswer, INTERNAL_TOKENS);
    assert.doesNotMatch(discAnswer, /ese cliente/);
  });

  it("10 meses con datos y 10 meses sin datos", async () => {
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
    for (const mm of months) {
      const hit = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
        question: `top 10 clientes que más compran en ${mm === "01" ? "enero" : mm === "02" ? "febrero" : mm === "03" ? "marzo" : mm === "04" ? "abril" : mm === "05" ? "mayo" : mm === "06" ? "junio" : mm === "07" ? "julio" : mm === "08" ? "agosto" : mm === "09" ? "septiembre" : "octubre"}`,
        now: NOW,
        plant_label: "Acapulco",
        salesRows: salesRows(),
      });
      assert.equal(hit.spec.period, `2026-${mm}`);
      assert.ok(hit.ranked.length > 0);
      assert.doesNotMatch(buildClientRankingAnswer(hit), INTERNAL_TOKENS);
    }
    for (const mm of months) {
      const empty = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
        question: `top 5 clientes en ${mm === "01" ? "enero" : mm === "02" ? "febrero" : mm === "03" ? "marzo" : mm === "04" ? "abril" : mm === "05" ? "mayo" : mm === "06" ? "junio" : mm === "07" ? "julio" : mm === "08" ? "agosto" : mm === "09" ? "septiembre" : "octubre"}`,
        now: NOW,
        plant_label: "Acapulco",
        salesRows: [],
        lastSafeCutSalesRowsByPeriod: {},
      });
      assert.match(buildClientRankingAnswer(empty), /No tengo datos observados por cliente/);
      assert.doesNotMatch(buildClientRankingAnswer(empty), INTERNAL_TOKENS);
    }
  });

  it("métrica canónica de descuento es DISCOUNT_PER_KG y no aclara total vs kg", async () => {
    const spec = backlog.extractClientDiscountRankingSpec("qué clientes tienen mayor descuento");
    assert.equal(spec.discount_metric, "DISCOUNT_PER_KG");
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
    });
    const answer = buildClientRankingAnswer(payload);
    assert.match(answer, /descuento por kg observado/);
    assert.doesNotMatch(answer, /¿Quieres comparar el descuento total/);
  });

  it("presentación humana no filtra tokens internos", () => {
    const human = buildClientRankingAnswer({
      ok: true,
      spec: { period: "2026-09", plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP", metric: "VENTA_TON" },
      ranked: [],
      now: NOW,
      data_semantics: "NO_ROWS_OBSERVED",
    });
    assert.doesNotMatch(human, INTERNAL_TOKENS);
    const last = buildClientRankingAnswer({
      ok: true,
      spec: { period: "2026-07", plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP", metric: "VENTA_TON" },
      ranked: [{ cliente: "PUBLICO EN GENERAL", venta_ton: 9 }],
      now: NOW,
      data_semantics: "LAST_SAFE_CUT",
      asked_period: "2026-09",
    });
    assert.doesNotMatch(last, INTERNAL_TOKENS);
    const partial = buildClientRankingAnswer({
      ok: true,
      spec: { period: "2026-09", plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP", metric: "VENTA_TON" },
      ranked: [{ cliente: "PUBLICO EN GENERAL", venta_ton: 4.2 }],
      now: NOW,
      uniform_projection_factor: 2,
    });
    assert.doesNotMatch(partial, INTERNAL_TOKENS);
  });

  it("multi-turn chat A–C no pierde intent ni tokens", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      now: NOW,
      clientRankingSalesRows: salesRows(),
      clientRankingDiscountRows: discountRows(),
      clientRankingPlantCodes: ["E3"],
      resolveClientRankingPlantByNombre: async () => ({ id: 1, nombre: "Acapulco" }),
      persistentMemoryStore: null,
    });
    const req = (question, state) => ({
      body: { question, planta_nombre: "Acapulco", conversation_state: state || null },
      dashboardAuth: { role: "ZP" },
    });
    const a1 = await askDirectorIa(req("top 10 clientes que mas compran"), 1, "top 10 clientes que mas compran");
    assert.match(a1.answer, /De qué mes o periodo quieres el ranking/);
    const a2 = await askDirectorIa(req("septiembre", a1.context_meta.conversation_state), 1, "septiembre");
    assert.equal(a2.ok, true);
    assert.doesNotMatch(a2.answer, /No pude determinar el ranking/);
    assert.doesNotMatch(a2.answer, INTERNAL_TOKENS);
    assert.match(a2.answer, /PUBLICO EN GENERAL|septiembre/);

    const b = await askDirectorIa(req("top 10 clientes que mas compran en septiembre"), 1, "top 10 clientes que mas compran en septiembre");
    assert.equal(b.ok, true);
    assert.doesNotMatch(b.answer, INTERNAL_TOKENS);

    const c1 = await askDirectorIa(req("que clientes tienen mayor descuento?"), 1, "que clientes tienen mayor descuento?");
    assert.match(c1.answer, /comparar los descuentos/);
    assert.doesNotMatch(c1.answer, /ese cliente/);
    const c2 = await askDirectorIa(req("septiembre", c1.context_meta.conversation_state), 1, "septiembre");
    assert.equal(c2.ok, true);
    assert.match(c2.answer, /descuento por kg observado|GRUPO MOVE/);
    assert.doesNotMatch(c2.answer, /No tengo evidencia de descuento para ese cliente/);
    assert.doesNotMatch(c2.answer, INTERNAL_TOKENS);

    const d = await askDirectorIa(req("qué descuento tiene GRUPO MOVE"), 1, "qué descuento tiene GRUPO MOVE");
    assert.notEqual(d.context_meta && d.context_meta.conversation_state && d.context_meta.conversation_state.parent_intent, "client_discount_ranking");
    configureDirectorIaChat({
      clientRankingSalesRows: undefined,
      clientRankingDiscountRows: undefined,
      persistentMemoryStore: null,
    });
  });
});
