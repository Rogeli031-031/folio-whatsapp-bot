"use strict";

/**
 * AUDIT-FIX-DIRECTOR-IA-DISCOUNT-UI-VS-CHAT-SOURCE-001
 * Utterances explícitas de cobertura. No son reglas de producción.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const backlog = require("../lib/director-ia-executive-backlog");
const {
  extractClientRankingSpec,
  buildClientRankingAnswer,
  loadClientRankingForChat,
  arrUiDiscountPerKg,
  yearMonthsInclusive,
  DISCOUNT_METRIC_CANONICAL,
  isClientRankingFollowUp,
} = require("../lib/director-ia-client-ranking");

const NOW = new Date("2026-09-16T12:00:00-06:00");
const INTERNAL = /NO_ROWS_OBSERVED|LAST_SAFE_CUT|CLIENT_FORECAST_UNAVAILABLE|proyecci[oó]n|forecast/i;

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

const ANTI_25 = Object.freeze([
  ["cuánto descuento dimos en septiembre", "!client_discount_ranking"],
  ["qué descuento tiene GRUPO MOVE", "client_profile"],
  ["top 10 clientes que más compran", "client_ranking"],
  ["qué clientes dejaron de comprar", "!client_discount_ranking"],
  ["qué clientes tienen mayor descuento", "client_discount_ranking"],
  ["descuento de Casa vs Comisionista", "!client_discount_ranking"],
  ["qué descuento tenemos contra meta", "!client_discount_ranking"],
  ["qué cliente compró más en septiembre", "client_ranking"],
  ["qué teléfono tiene GRUPO MOVE", "client_contact_lookup"],
  ["hola", "smalltalk"],
  ["cómo vamos en IGF", "igf_status"],
  ["cuánto gastamos en llantas", "expense_analytics"],
  ["abre F-202602-148", "folio_search"],
  ["top 10 folios", "!client_discount_ranking"],
  ["cuánto vendimos en septiembre", "!client_discount_ranking"],
  ["qué clientes nuevos entraron", "!client_discount_ranking"],
  ["clientes que aumentaron compra", "!client_discount_ranking"],
  ["qué folios tienen descuento", "folio_search"],
  ["qué descuento tiene el cliente GRUPO MOVE", "client_profile"],
  ["quién compra más en septiembre", "client_ranking"],
  ["estaciones de Acapulco", "!client_discount_ranking"],
  ["abre el IGF", "!client_discount_ranking"],
  ["comentario de GRUPO MOVE", "!client_discount_ranking"],
  ["top 10 clientes con mayor descuento en septiembre", "client_discount_ranking"],
  ["qué descuento tuvo el primero", "!client_profile"],
]);

const FOLLOW_20 = Object.freeze([
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
  "cuánto descuento tuvo el segundo",
  "contra agosto",
  "contra el mes pasado",
  "solo los de Casa",
  "ahora Comisionista",
  "compáralos",
  "ahora solo septiembre",
  "y de enero a agosto?",
  "ahora el primero",
]);

function arrLikeRows() {
  return [
    { cliente_norm: "YOLI DE ACAPULCO", kg: 10000, monto: 37000, canal: "Casa" },
    { cliente_norm: "GRUPO MOVE EMPRESARIAL", kg: 100000, monto: 301000, canal: "Casa" },
    { cliente_norm: "21 DURANGO", kg: 10000, monto: 13200, canal: "Casa" },
    { cliente_norm: "PUBLICO EN GENERAL", kg: 20000, monto: 0, canal: "Casa" },
  ];
}

describe("AUDIT-FIX-DIRECTOR-IA-DISCOUNT-UI-VS-CHAT-SOURCE-001", () => {
  it("fórmula ARR UI = |monto| / kg y no AVG de ratios", () => {
    assert.equal(Number(arrUiDiscountPerKg(37000, 10000).toFixed(2)), 3.7);
    assert.equal(Number(arrUiDiscountPerKg(-37000, 10000).toFixed(2)), 3.7);
    assert.equal(arrUiDiscountPerKg(37000, 0), null);
    assert.equal(arrUiDiscountPerKg(null, 10000), 0);
    assert.equal(DISCOUNT_METRIC_CANONICAL, "DISCOUNT_PER_KG");
    assert.deepEqual(yearMonthsInclusive("2026-01", "2026-09"), [
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("50 utterances de ranking de descuento conservan CLIENT_DISCOUNT_RANKING", () => {
    assert.equal(DISCOUNT_50.length, 50);
    for (const q of DISCOUNT_50) {
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "client_discount_ranking", q);
      assert.equal(backlog.isIndividualDiscountLookupQuestion(q), false, q);
      const spec = extractClientRankingSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "DISCOUNT", q);
      assert.equal(spec.discount_metric, "DISCOUNT_PER_KG", q);
    }
  });

  it("casos obligatorios: mes, rango, top 10, individual", async () => {
    const cases = [
      "qué cliente tiene mayor descuento",
      "qué cliente tiene mayor descuento en septiembre",
      "qué clientes tienen mayor descuento en septiembre",
      "top 10 clientes con mayor descuento en septiembre",
      "qué cliente tiene mayor descuento de enero a septiembre",
    ];
    for (const q of cases) {
      assert.equal(planDirectorIaQuestion(q).intent, "client_discount_ranking", q);
    }
    const individual = "qué descuento tiene GRUPO MOVE";
    assert.equal(planDirectorIaQuestion(individual).intent, "client_profile");
    assert.equal(backlog.isIndividualDiscountLookupQuestion(individual), true);
    assert.equal(backlog.isClientDiscountRankingQuestion(individual), false);

    const singular = extractClientRankingSpec("qué cliente tiene mayor descuento en septiembre", null, { now: NOW });
    assert.equal(singular.limit, 1);
    assert.equal(singular.period, "2026-09");
    const top10 = extractClientRankingSpec("top 10 clientes con mayor descuento en septiembre", null, { now: NOW });
    assert.equal(top10.limit, 10);
    const range = extractClientRankingSpec("qué cliente tiene mayor descuento de enero a septiembre", null, { now: NOW });
    assert.equal(range.period_kind, "RANGE");
    assert.equal(range.period_start, "2026-01");
    assert.equal(range.period_end, "2026-09");

    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: arrLikeRows(),
      forceDiscount: true,
    });
    assert.equal(payload.ranked[0].cliente, "YOLI DE ACAPULCO");
    assert.equal(Number(payload.ranked[0].desc_kg.toFixed(2)), 3.7);
    assert.equal(payload.ranked.length, 1);
    const answer = buildClientRankingAnswer(payload);
    assert.match(answer, /YOLI DE ACAPULCO/);
    assert.match(answer, /descuento por kg observado/);
    assert.doesNotMatch(answer, /total observado \(MXN/);
    assert.doesNotMatch(answer, INTERNAL);
  });

  it("misma semántica UI/chat: mayor $/kg, no mayor MXN", async () => {
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: arrLikeRows(),
      forceDiscount: true,
    });
    assert.equal(payload.ranked[0].cliente, "YOLI DE ACAPULCO");
    assert.notEqual(payload.ranked[0].cliente, "GRUPO MOVE EMPRESARIAL");
    assert.ok(payload.ranked[0].desc_kg > payload.ranked.find((r) => r.cliente === "GRUPO MOVE EMPRESARIAL").desc_kg);
  });

  it("reutiliza computeClientesDescuentoMes con plant_code ARR, no query E3-only", async () => {
    let seenPlant = null;
    const compute = async (_c, year, month, plantCode) => {
      seenPlant = plantCode;
      assert.equal(year, 2026);
      assert.equal(month, 9);
      return {
        rows: [
          { cliente: "YOLI DE ACAPULCO", kg: 10000, monto: 37000, categoria: "Casa" },
          { cliente: "GRUPO MOVE EMPRESARIAL", kg: 100000, monto: 301000, categoria: "Casa" },
        ],
      };
    };
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      arrPlantCode: "Acapulco",
      computeClientesDescuentoMes: compute,
      queryMonthlyDiscount: async () => ({ rows: [] }),
      plantCodes: ["E3"],
      forceDiscount: true,
    });
    assert.equal(seenPlant, "Acapulco");
    assert.equal(payload.ranked[0].cliente, "YOLI DE ACAPULCO");
  });

  it("alias de planta: resolveArrPlantCode canónico, no mapping paralelo", async () => {
    let asked = null;
    const payload = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento en septiembre",
      now: NOW,
      plant_label: "GTM Acapulco",
      resolveArrPlantCode: async (_db, empresa) => {
        asked = empresa;
        return "Acapulco";
      },
      computeClientesDescuentoMes: async (_c, _y, _m, plantCode) => {
        assert.equal(plantCode, "Acapulco");
        return { rows: [{ cliente: "YOLI DE ACAPULCO", kg: 10000, monto: 37000, categoria: "Casa" }] };
      },
      forceDiscount: true,
    });
    assert.equal(asked, "GTM Acapulco");
    assert.equal(payload.ranked[0].cliente, "YOLI DE ACAPULCO");
  });

  it("Casa / Comisionista / ALL y top 1 / 5 / 10", async () => {
    assert.equal(extractClientRankingSpec("mayor descuento de Casa en septiembre", null, { now: NOW }).customer_segment, "CASA");
    assert.equal(extractClientRankingSpec("mayor descuento de Comisionista en septiembre", null, { now: NOW }).customer_segment, "COMISIONISTA");
    assert.equal(extractClientRankingSpec("mayor descuento en septiembre", null, { now: NOW }).customer_segment, "ALL");
    assert.equal(extractClientRankingSpec("qué cliente tiene mayor descuento en septiembre", null, { now: NOW }).limit, 1);
    assert.equal(extractClientRankingSpec("top 5 clientes con mayor descuento en septiembre", null, { now: NOW }).limit, 5);
    assert.equal(extractClientRankingSpec("top 10 clientes con mayor descuento en septiembre", null, { now: NOW }).limit, 10);
    const mixed = [
      { cliente_norm: "CASA UNO", kg: 1000, monto: 4000, canal: "Casa" },
      { cliente_norm: "COMI UNO", kg: 1000, monto: 9000, canal: "Comisionista" },
    ];
    const casa = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento de Casa en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: mixed,
      forceDiscount: true,
    });
    assert.equal(casa.spec.customer_segment, "CASA");
    const compute = async () => ({
      rows: [
        { cliente: "CASA UNO", kg: 1000, monto: 4000, categoria: "Casa" },
        { cliente: "COMI UNO", kg: 1000, monto: 9000, categoria: "Comisionista" },
      ],
    });
    const onlyCasa = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento de Casa en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      arrPlantCode: "Acapulco",
      computeClientesDescuentoMes: compute,
      forceDiscount: true,
    });
    assert.equal(onlyCasa.ranked.length, 1);
    assert.equal(onlyCasa.ranked[0].cliente, "CASA UNO");
  });

  it("kg=0, monto null y no-data distinguen la métrica", async () => {
    const noKg = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [{ cliente_norm: "SIN KG", monto: 5000, kg: 0, canal: "Casa" }],
      forceDiscount: true,
    });
    const noKgAnswer = buildClientRankingAnswer(noKg);
    assert.match(noKgAnswer, /No tengo datos suficientes para calcular descuento por kg por cliente en septiembre de 2026/);
    assert.doesNotMatch(noKgAnswer, INTERNAL);

    const empty = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué cliente tiene mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [],
      forceDiscount: true,
    });
    const emptyAnswer = buildClientRankingAnswer(empty);
    assert.match(emptyAnswer, /No tengo descuentos observados por cliente para septiembre de 2026/);
    assert.doesNotMatch(emptyAnswer, INTERNAL);

    const nullMonto = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "qué clientes tienen mayor descuento en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      discountRows: [
        { cliente_norm: "SIN MONTO", monto: null, kg: 8000, canal: "Casa" },
        { cliente_norm: "YOLI DE ACAPULCO", monto: 37000, kg: 10000, canal: "Casa" },
      ],
      forceDiscount: true,
    });
    assert.equal(nullMonto.ranked[0].cliente, "YOLI DE ACAPULCO");
  });

  it("quién tiene mejor precio vía descuento es ranking, no phrasebook runtime", () => {
    const q = "quién tiene mejor precio vía descuento";
    assert.equal(planDirectorIaQuestion(q).intent, "client_discount_ranking");
    const rankingSrc = fs.readFileSync(path.join(__dirname, "../lib/director-ia-client-ranking.js"), "utf8");
    const backlogSrc = fs.readFileSync(path.join(__dirname, "../lib/director-ia-executive-backlog.js"), "utf8");
    assert.doesNotMatch(rankingSrc, /quién tiene mejor precio vía descuento/);
    assert.doesNotMatch(backlogSrc, /DISCOUNT_50/);
  });

  it("25 anti-colisiones", () => {
    assert.equal(ANTI_25.length, 25);
    for (const [q, intent] of ANTI_25) {
      const plan = planDirectorIaQuestion(q);
      if (intent.startsWith("!")) assert.notEqual(plan.intent, intent.slice(1), `${q} → ${plan.intent}`);
      else assert.equal(plan.intent, intent, `${q} → ${plan.intent}`);
    }
  });

  it("20 follow-ups conservan DISCOUNT_PER_KG", () => {
    assert.equal(FOLLOW_20.length, 20);
    const prior = {
      ok: true,
      ranking_direction: "TOP",
      limit: 5,
      customer_segment: "ALL",
      metric: "DISCOUNT",
      discount_metric: "DISCOUNT_PER_KG",
      period: "2026-09",
      period_kind: "SINGLE",
      plant_label: "Acapulco",
    };
    for (const q of FOLLOW_20) {
      assert.equal(isClientRankingFollowUp(q) || backlog.isClientDiscountRankingQuestion(q), true, q);
      const spec = extractClientRankingSpec(q, prior, { now: NOW });
      assert.equal(spec.ok, true, q);
      if (!/\b(compra|venta|tonelada)/.test(q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
        assert.equal(spec.metric, "DISCOUNT", q);
        assert.equal(spec.discount_metric, "DISCOUNT_PER_KG", q);
      }
    }
  });
});
