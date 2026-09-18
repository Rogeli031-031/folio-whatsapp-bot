"use strict";

/**
 * FIX-DIRECTOR-IA-CLIENT-DISCOUNT-RANGE-AND-NO-DATA-001
 * Utterances explícitas de cobertura. No son reglas de producción.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const backlog = require("../lib/director-ia-executive-backlog");
const {
  extractClientRankingSpec,
  extractRankingPeriod,
  extractPeriodYm,
  buildClientRankingAnswer,
  loadClientRankingForChat,
  queryBoundsForSpec,
  isClientRankingFollowUp,
} = require("../lib/director-ia-client-ranking");

const NOW = new Date("2026-09-16T12:00:00-06:00");
const INTERNAL = /NO_ROWS_OBSERVED|LAST_SAFE_CUT|CLIENT_FORECAST_UNAVAILABLE|proyecci[oó]n|forecast/i;

const RANGE_50 = Object.freeze([
  "qué cliente tiene mayor descuento de enero a septiembre",
  "qué clientes tienen mayor descuento de enero a septiembre",
  "quién tuvo más descuento de enero a septiembre",
  "quién recibió mayor descuento de enero a septiembre",
  "top 10 clientes con mayor descuento de enero a septiembre",
  "ranking de descuentos de enero a septiembre",
  "ordéname los clientes por descuento de enero a septiembre",
  "mayor descuento entre enero y septiembre",
  "desde enero hasta septiembre quién tuvo más descuento",
  "enero a septiembre quién tiene mayor descuento",
  "qué clientes tienen más descuento de enero a septiembre",
  "quiénes tienen mayor descuento de enero a septiembre",
  "top 5 clientes con mayor descuento de enero a septiembre",
  "top 20 clientes con mayor descuento de enero a septiembre",
  "clientes con mayor descuento de febrero a abril",
  "mayor descuento de marzo a junio",
  "ranking de descuento de julio a agosto",
  "qué cliente tiene más descuento de enero a diciembre",
  "qué clientes tienen mayor descuento de enero a septiembre de 2026",
  "de enero de 2026 a septiembre de 2026 quién tiene mayor descuento",
  "marzo a junio 2026 clientes con mayor descuento",
  "de enero a agosto clientes con más descuento",
  "entre abril y julio quién tiene mayor descuento",
  "enero-septiembre ranking de descuentos",
  "desde marzo hasta junio mayor descuento",
  "enero hasta septiembre quién recibió más descuento",
  "top 10 descuentos de Casa de enero a septiembre",
  "mayor descuento de Comisionista de enero a septiembre",
  "qué clientes tienen mayor descuento de enero a septiembre en Acapulco",
  "quién tiene mayor descuento de marzo a junio en Puebla",
  "lista los clientes con mayor descuento de enero a septiembre",
  "dame el ranking de descuentos de febrero a abril",
  "ordena los clientes por descuento de marzo a junio",
  "principales clientes por descuento de julio a agosto",
  "quiénes lideran en descuento de enero a septiembre",
  "clientes que reciben mayor descuento de enero a diciembre",
  "top clientes con más descuento de enero a septiembre",
  "qué cliente tiene el descuento más alto de enero a septiembre",
  "cuáles son los clientes con mayor descuento de enero a septiembre",
  "mayor descuento por cliente de enero a septiembre",
  "descuentos más altos de enero a septiembre",
  "quién tiene mejor descuento de enero a septiembre",
  "ranking de clientes por descuento de enero a septiembre",
  "top 10 de Casa por descuento de marzo a junio",
  "top 5 de Comisionista con mayor descuento de julio a agosto",
  "qué clientes tienen mayor descuento entre enero y septiembre",
  "desde enero hasta septiembre ranking de descuentos",
  "de enero a septiembre de 2026 top 10 descuentos",
  "quién recibió más descuento de febrero a abril",
  "muéstrame el ranking de clientes con mayor descuento de enero a septiembre",
]);

const ANTI_20 = Object.freeze([
  ["qué cliente compró más de enero a septiembre", "client_ranking"],
  ["cuánto descuento dimos de enero a septiembre", "!client_discount_ranking"],
  ["qué descuento tiene GRUPO MOVE de enero a septiembre", "client_profile"],
  ["qué clientes dejaron de comprar de enero a septiembre", "!client_discount_ranking"],
  ["qué cliente tiene mayor descuento en septiembre", "client_discount_ranking"],
  ["top 10 clientes que más compran de enero a septiembre", "client_ranking"],
  ["qué clientes nuevos entraron", "!client_discount_ranking"],
  ["qué folios tienen descuento", "folio_search"],
  ["top 10 folios", "!client_discount_ranking"],
  ["qué teléfono tiene GRUPO MOVE", "client_contact_lookup"],
  ["cuánto vendimos de enero a septiembre", "!client_discount_ranking"],
  ["hola", "smalltalk"],
  ["cómo vamos en IGF", "igf_status"],
  ["cuánto gastamos en llantas", "expense_analytics"],
  ["qué clientes tienen mayor descuento", "client_discount_ranking"],
  ["quién compra más en septiembre", "client_ranking"],
  ["qué descuento tiene el cliente GRUPO MOVE", "client_profile"],
  ["clientes que aumentaron compra", "!client_discount_ranking"],
  ["abre F-202602-148", "folio_search"],
  ["top 10 clientes con mayor descuento de enero a septiembre", "client_discount_ranking"],
]);

const FOLLOW_15 = Object.freeze([
  "y de enero a agosto?",
  "ahora solo septiembre",
  "y en agosto?",
  "solo Casa",
  "solo Comisionista",
  "top 5",
  "ahora el primero",
  "cuánto descuento tuvo el segundo",
  "septiembre",
  "agosto",
  "top 10",
  "quién quedó primero",
  "contra agosto",
  "ahora Comisionista",
  "compáralos",
]);

function discountRows() {
  return [
    { cliente_norm: "GRUPO MOVE", monto: 37000, kg: 10000, canal: "Casa" },
    { cliente_norm: "PUBLICO EN GENERAL", monto: 18000, kg: 20000, canal: "Casa" },
    { cliente_norm: "CLIENTE TRES", monto: 9000, kg: 7000, canal: "Comisionista" },
  ];
}

describe("FIX-DIRECTOR-IA-CLIENT-DISCOUNT-RANGE-AND-NO-DATA-001", () => {
  it("reproduce: extractPeriodYm colapsaba el primer mes; el rango ahora gana", () => {
    const n = "que cliente tiene mayor descuento de enero a septiembre";
    const firstMonth = Object.entries({
      enero: "01",
      febrero: "02",
      marzo: "03",
      abril: "04",
      mayo: "05",
      junio: "06",
      julio: "07",
      agosto: "08",
      septiembre: "09",
    }).find(([name]) => new RegExp(`\\b${name}\\b`).test(n));
    assert.equal(firstMonth[0], "enero");
    const frame = extractRankingPeriod(n, NOW, null, null);
    assert.equal(frame.period_kind, "RANGE");
    assert.equal(frame.period_start, "2026-01");
    assert.equal(frame.period_end, "2026-09");
    assert.equal(extractPeriodYm(n, NOW, null, null), null);
  });

  it("50 utterances de ranking de descuento con rango", () => {
    assert.equal(RANGE_50.length, 50);
    for (const q of RANGE_50) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "client_discount_ranking", q);
      assert.equal(backlog.isIndividualDiscountLookupQuestion(q), false, q);
      const spec = extractClientRankingSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "DISCOUNT", q);
      assert.equal(spec.period_kind, "RANGE", q);
      assert.ok(spec.period_start && spec.period_end, q);
      assert.ok(spec.period_start <= spec.period_end, q);
    }
  });

  it("caso A: singular enero-septiembre limit=1 y bounds físicos", async () => {
    const q = "que cliente tiene mayor descuento de enero a septiembre?";
    const disc = backlog.extractClientDiscountRankingSpec(q);
    assert.equal(disc.limit, 1);
    assert.equal(disc.direction, "HIGH");
    assert.equal(disc.discount_metric, "DISCOUNT_PER_KG");
    const spec = extractClientRankingSpec(q, null, { now: NOW });
    assert.equal(spec.period_kind, "RANGE");
    assert.equal(spec.period_start, "2026-01");
    assert.equal(spec.period_end, "2026-09");
    const bounds = queryBoundsForSpec(spec);
    assert.equal(bounds.startStr, "2026-01-01");
    assert.equal(bounds.endStr, "2026-09-30");
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: q,
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
    });
    assert.equal(payload.spec.limit, 1);
    assert.equal(payload.spec.metric, "DISCOUNT");
    assert.equal(payload.spec.discount_metric, "DISCOUNT_PER_KG");
    assert.equal(payload.spec.period_kind, "RANGE");
    assert.equal(payload.ranked[0].cliente, "GRUPO MOVE");
    assert.equal(payload.ranked.length, 1);
    const answer = buildClientRankingAnswer(payload);
    assert.match(answer, /De enero a septiembre de 2026/);
    assert.match(answer, /GRUPO MOVE/);
    assert.match(answer, /descuento por kg observado/);
    assert.doesNotMatch(answer, INTERNAL);
  });

  it("plural default y top explícito", async () => {
    const plural = backlog.extractClientDiscountRankingSpec("qué clientes tienen mayor descuento de enero a septiembre");
    assert.notEqual(plural.limit, 1);
    const top10 = extractClientRankingSpec("top 10 clientes con mayor descuento de enero a septiembre", null, { now: NOW });
    assert.equal(top10.limit, 10);
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento de enero a septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
    });
    assert.ok(payload.ranked.length >= 2);
    assert.match(buildClientRankingAnswer(payload), /Clientes con mayor descuento por kg observado/);
  });

  it("rangos de un solo año y con año explícito", () => {
    const cases = [
      ["enero a septiembre", "2026-01", "2026-09"],
      ["febrero a abril", "2026-02", "2026-04"],
      ["marzo a junio", "2026-03", "2026-06"],
      ["julio a agosto", "2026-07", "2026-08"],
      ["enero a diciembre", "2026-01", "2026-12"],
      ["enero a septiembre de 2026", "2026-01", "2026-09"],
      ["de enero de 2026 a septiembre de 2026", "2026-01", "2026-09"],
      ["marzo a junio 2026", "2026-03", "2026-06"],
    ];
    for (const [span, start, end] of cases) {
      const frame = extractRankingPeriod(`mayor descuento ${span}`, NOW, null, null);
      assert.equal(frame.period_start, start, span);
      assert.equal(frame.period_end, end, span);
    }
  });

  it("rango inválido no intercambia extremos", async () => {
    const frame = extractRankingPeriod("septiembre a enero de 2026", NOW, null, null);
    assert.equal(frame.invalid_range, true);
    assert.equal(frame.period_start, "2026-09");
    assert.equal(frame.period_end, "2026-01");
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento de septiembre a enero de 2026",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: discountRows(),
      forceDiscount: true,
    });
    assert.match(payload.clarification, /No lo invierto/);
    assert.doesNotMatch(payload.clarification, INTERNAL);
  });

  it("mes único septiembre y no-data de descuento no menciona forecast", async () => {
    const spec = extractClientRankingSpec("que cliente tiene mayor descuento en septiembre?", null, { now: NOW });
    assert.equal(spec.period, "2026-09");
    assert.notEqual(spec.period_kind, "RANGE");
    const empty = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "que cliente tiene mayor descuento en septiembre?",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [],
      forceDiscount: true,
    });
    const answer = buildClientRankingAnswer(empty);
    assert.match(answer, /No tengo descuentos observados por cliente para septiembre de 2026/);
    assert.doesNotMatch(answer, INTERNAL);
    const emptyRange = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento de enero a septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [],
      forceDiscount: true,
    });
    const rangeAnswer = buildClientRankingAnswer(emptyRange);
    assert.match(rangeAnswer, /No tengo descuentos observados por cliente de enero a septiembre de 2026/);
    assert.doesNotMatch(rangeAnswer, INTERNAL);
    assert.notEqual(emptyRange.data_semantics, "LAST_SAFE_CUT");
  });

  it("last-safe-cut de descuento no reutiliza ventas", async () => {
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [],
      salesRows: [{ cliente_norm: "VENTAS ONLY", kg: 9000, canal: "Casa" }],
      forceDiscount: true,
      lastSafeCutDiscountRowsByPeriod: {
        "2026-08": [{ cliente_norm: "GRUPO MOVE", monto: 12000, kg: 4000, canal: "Casa" }],
      },
      lastSafeCutSalesRowsByPeriod: {
        "2026-08": [{ cliente_norm: "VENTAS ONLY", kg: 9000, canal: "Casa" }],
      },
    });
    assert.equal(payload.data_semantics, "LAST_SAFE_CUT");
    assert.equal(payload.spec.period, "2026-08");
    const answer = buildClientRankingAnswer(payload);
    assert.match(answer, /No tengo descuentos observados en septiembre/);
    assert.match(answer, /último periodo con descuentos registrados es agosto de 2026/);
    assert.match(answer, /GRUPO MOVE/);
    assert.doesNotMatch(answer, /VENTAS ONLY/);
    assert.doesNotMatch(answer, INTERNAL);
  });

  it("Casa / Comisionista / ALL", () => {
    assert.equal(extractClientRankingSpec("top 10 descuentos de Casa de enero a septiembre", null, { now: NOW }).customer_segment, "CASA");
    assert.equal(extractClientRankingSpec("mayor descuento de Comisionista de enero a septiembre", null, { now: NOW }).customer_segment, "COMISIONISTA");
    assert.equal(extractClientRankingSpec("mayor descuento de enero a septiembre", null, { now: NOW }).customer_segment, "ALL");
  });

  it("20 anti-colisiones", () => {
    assert.equal(ANTI_20.length, 20);
    for (const [q, intent] of ANTI_20) {
      const plan = planDirectorIaQuestion(q);
      if (intent.startsWith("!")) assert.notEqual(plan.intent, intent.slice(1), `${q} → ${plan.intent}`);
      else assert.equal(plan.intent, intent, `${q} → ${plan.intent}`);
    }
  });

  it("15 follow-ups conservan DISCOUNT_PER_KG", () => {
    assert.equal(FOLLOW_15.length, 15);
    const prior = {
      ok: true,
      ranking_direction: "TOP",
      limit: 5,
      customer_segment: "ALL",
      metric: "DISCOUNT",
      discount_metric: "DISCOUNT_PER_KG",
      period_kind: "RANGE",
      period_start: "2026-01",
      period_end: "2026-09",
      plant_label: "Acapulco",
    };
    for (const q of FOLLOW_15) {
      assert.equal(isClientRankingFollowUp(q) || backlog.isClientDiscountRankingQuestion(q), true, q);
      const spec = extractClientRankingSpec(q, prior, { now: NOW });
      assert.equal(spec.ok, true, q);
      if (!/\b(compra|venta|tonelada)/.test(q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
        assert.equal(spec.metric, "DISCOUNT", q);
        assert.equal(spec.discount_metric, "DISCOUNT_PER_KG", q);
      }
    }
    const toSingle = extractClientRankingSpec("ahora solo septiembre", prior, { now: NOW });
    assert.equal(toSingle.period, "2026-09");
    assert.notEqual(toSingle.period_kind, "RANGE");
    const toAug = extractClientRankingSpec("y de enero a agosto?", prior, { now: NOW });
    assert.equal(toAug.period_start, "2026-01");
    assert.equal(toAug.period_end, "2026-08");
  });

  it("rango usa SUM(monto)/SUM(kg), no promedio de ratios mensuales", async () => {
    const rows = [
      { cliente_norm: "A", kg: 10, monto: 100, canal: "Casa" },
      { cliente_norm: "A", kg: 990, monto: 100, canal: "Casa" },
      { cliente_norm: "B", kg: 100, monto: 50, canal: "Casa" },
    ];
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento de enero a septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: rows,
      forceDiscount: true,
    });
    assert.equal(payload.ranked[0].cliente, "B");
    assert.equal(payload.ranked[0].desc_kg, 0.5);
    const a = payload.ranked.find((r) => r.cliente === "A");
    assert.equal(a.desc_kg, 0.2);
  });
});
