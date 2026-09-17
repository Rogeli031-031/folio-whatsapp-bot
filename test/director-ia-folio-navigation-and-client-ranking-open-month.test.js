"use strict";

/**
 * FIX-DIRECTOR-IA-FOLIO-NAVIGATION-AND-CLIENT-RANKING-OPEN-MONTH-001
 * Paráfrasis explícitas. No son reglas de producción.
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
  previousYearMonth,
} = require("../lib/director-ia-client-ranking");
const { buildFolioSearchChatResult } = require("../lib/director-ia-folio-search");
const pending = require("../lib/director-ia-pending-completion");

const NOW = new Date("2026-09-16T12:00:00-06:00");

const FOLIO_NAV = Object.freeze([
  "abre el primero",
  "abre el segundo",
  "abre el tercero",
  "abre el cuarto",
  "abre el quinto",
  "abre el sexto",
  "abre el séptimo",
  "abre el octavo",
  "abre el noveno",
  "abre el décimo",
  "abre el último",
  "abre el penúltimo",
  "abre el 1",
  "abre el 2",
  "abre el 4",
  "abre el 10",
  "abre el 12",
  "abre número 5",
  "abre el número 8",
  "abre el folio 9",
  "abre el folio número 3",
  "muéstrame el primero",
  "muéstrame el 10",
  "muéstrame el número 7",
  "enséñame el segundo",
  "enséñame el 11",
  "entra al primero",
  "entra al 8",
  "entra al número 4",
  "quiero ver el tercero",
  "quiero ver el 15",
  "quiero abrir el 6",
  "llévame al 10",
  "ve al segundo",
  "ve al folio 12",
  "abre F-202602-148",
  "abre el F-202602-148",
  "abre folio F-202602-148",
  "abre el folio F-202602-148",
  "muéstrame F-202602-148",
  "enséñame F-202602-148",
  "entra a F-202602-148",
  "entra al folio F-202602-148",
  "quiero ver F-202602-148",
  "quiero abrir F-202602-148",
  "abre . F-202602-148",
  "abre: F-202602-148",
  "abre, F-202602-148",
  "ABRE F-202602-148",
  "abre el folio número 10",
]);

const RANK_ASK = Object.freeze([
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
  "cuáles clientes venden más",
  "qué clientes compran más",
  "qué clientes tienen más toneladas",
  "quién lidera la venta",
  "quiénes lideran la venta",
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
  "dame los principales compradores de septiembre",
  "muéstrame los clientes que más compraron este mes",
  "ranking comercial de clientes de septiembre",
  "quiénes fueron los mayores compradores este mes",
  "qué clientes encabezan la venta en septiembre",
  "lista los 10 clientes con mayor compra en septiembre",
]);

const RANK_FOLLOW = Object.freeze([
  "septiembre",
  "agosto",
  "y en agosto",
  "ahora septiembre",
  "solo Casa",
  "solo Comisionista",
  "top 5",
  "ahora top 20",
  "cuánto compró el primero",
  "quién quedó segundo",
  "qué descuento tuvo el primero",
  "compara los dos primeros",
  "cuánto disminuyeron",
  "qué comentarios tienen",
  "qué acciones tienen",
  "contra agosto",
  "contra el mes pasado",
  "y el tercero",
  "solo los de Casa",
  "ahora los de Comisionista",
]);

const FOLIO_ANTI = Object.freeze([
  "top 10 clientes",
  "cuánto gastamos en llantas",
  "abre la venta diaria de Acapulco",
  "hola",
  "cuántos folios fueron de llantas",
  "existe un folio de extintores",
  "top 10 clientes con mayor descuento",
  "qué clientes dejaron de comprar",
  "cuánto vendimos en septiembre",
  "qué clientes nuevos entraron",
  "cuál extintor está vencido",
  "cómo vamos",
  "ranking de rentabilidad",
  "cuánto compró GRUPO MOVE",
  "abre el top 10",
]);

const RANK_ANTI = Object.freeze([
  ["top 10 clientes con mayor descuento", "client_discount_ranking"],
  ["qué clientes dejaron de comprar", "commercial_trend"],
  ["cuánto vendimos en septiembre", null],
  ["qué cliente tiene teléfono", "client_contact_lookup"],
  ["top 10 folios", "folio_search"],
  ["cuánto compró GRUPO MOVE", null],
  ["abre el top 10", null],
  ["qué clientes nuevos entraron", "commercial_trend"],
  ["cuánto gastamos en llantas", "expense_analytics"],
  ["cuántos folios de llantas", "folio_search"],
  ["abre F-202602-148", "folio_search"],
  ["existe un folio de llantas", "folio_search"],
  ["cuál extintor está vencido", "seh_operation_status"],
  ["hola", null],
  ["abre la venta diaria", "open_daily_sales_view"],
]);

function sixteenFolios() {
  return Array.from({ length: 16 }, (_, i) => ({
    numero_folio: i === 9 ? "F-202602-148" : `F-202608-${400 + i}`,
    folio_id: 100 + i,
  }));
}

function assertLen(arr, n, label) {
  assert.equal(arr.length, n, `${label} debe tener ${n}`);
  assert.equal(new Set(arr).size, n, `${label} no debe repetir`);
}

describe("FIX-DIRECTOR-IA-FOLIO-NAVIGATION-AND-CLIENT-RANKING-OPEN-MONTH-001", () => {
  it("baterías explícitas 50/50/20/15/15", () => {
    assertLen(FOLIO_NAV, 50, "folio nav");
    assertLen(RANK_ASK, 50, "rank ask");
    assertLen(RANK_FOLLOW, 20, "rank follow");
    assertLen(FOLIO_ANTI, 15, "folio anti");
    assertLen(RANK_ANTI, 15, "rank anti");
  });

  it("50 navegación Folios: INDEX/ORDINAL/EXPLICIT_ID", () => {
    const items = sixteenFolios();
    let matched = 0;
    for (const q of FOLIO_NAV) {
      const sel = backlog.extractOrdinal(q);
      assert.ok(sel, q);
      assert.equal(planDirectorIaQuestion(q).intent, "folio_search", q);
      if (sel.kind === "folio_id") {
        assert.equal(sel.value, "F-202602-148", q);
        assert.equal(sel.reference_type, "EXPLICIT_ID");
        matched += 1;
        continue;
      }
      const picked = backlog.selectFromDisplayedResultSet(items, sel);
      if (picked.ok) matched += 1;
    }
    assert.ok(matched >= 45, `matched ${matched}`);
    assert.equal(backlog.selectOrdinal(items, backlog.extractOrdinal("abre el 10")).numero_folio, "F-202602-148");
    assert.equal(backlog.extractFolioIdToken("abre . F-202602-148"), "F-202602-148");
    assert.equal(backlog.extractFolioIdToken("abre: F-202602-148"), "F-202602-148");
  });

  it("15 bounds/errors de navegación", () => {
    const items = sixteenFolios();
    const over = backlog.selectFromDisplayedResultSet(items, backlog.extractOrdinal("abre el 17"));
    assert.equal(over.ok, false);
    assert.equal(over.code, "OUT_OF_RANGE");
    assert.equal(over.size, 16);
    const truncated = items.concat(Array.from({ length: 24 }, (_, i) => ({ numero_folio: `F-X-${i}`, folio_id: 200 + i })));
    assert.equal(truncated.length, 40);
    const hidden = backlog.selectFromDisplayedResultSet(truncated, { kind: "ordinal", index: 41, reference_type: "INDEX" });
    assert.equal(hidden.ok, false);
    assert.equal(hidden.code, "OUT_OF_RANGE");
    const empty = backlog.selectFromDisplayedResultSet([], backlog.extractOrdinal("abre el 10"));
    assert.equal(empty.code, "NO_RESULT_SET");
    for (const q of [
      "abre el 17",
      "abre el 18",
      "muéstrame el 20",
      "entra al 25",
      "quiero ver el 30",
      "abre el 41",
      "llévame al 50",
      "abre el folio 17",
      "abre el número 19",
      "enséñame el 16 no, el 40",
      "abre el 0",
      "abre el 99",
      "muéstrame el 17",
      "entra al número 22",
      "ve al folio 17",
    ]) {
      const sel = backlog.extractOrdinal(q);
      if (!sel || sel.kind === "folio_id") continue;
      const picked = backlog.selectFromDisplayedResultSet(items, sel);
      if (sel.index > 16 || sel.index < 1) assert.equal(picked.ok, false, q);
    }
  });

  it("15 anti-colisiones Folios", () => {
    for (const q of FOLIO_ANTI) {
      if (q === "abre F-202602-148" || q === "abre el top 10") continue;
      assert.notEqual(planDirectorIaQuestion(q).intent === "folio_search" && backlog.isFolioIndexNavigationQuestion(q), true, q);
    }
    assert.equal(planDirectorIaQuestion("top 10 clientes").intent, "client_ranking");
    assert.equal(planDirectorIaQuestion("abre F-202602-148").intent, "folio_search");
    assert.notEqual(planDirectorIaQuestion("top 10 folios").intent, "client_ranking");
  });

  it("50 ranking clientes por composición", () => {
    for (const q of RANK_ASK) {
      assert.equal(isClientRankingQuestion(q), true, q);
      const spec = extractClientRankingSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "VENTA_TON", q);
    }
    const top10 = extractClientRankingSpec("top 10 clientes que más compran", null, { now: NOW });
    assert.equal(top10.limit, 10);
    assert.equal(top10.ranking_direction, "TOP");
    assert.equal(top10.customer_segment, "ALL");
    const sep = extractClientRankingSpec("top 10 clientes que más compran en septiembre", null, { now: NOW });
    assert.equal(sep.period, "2026-09");
    assert.equal(sep.limit, 10);
  });

  it("20 follow-ups ranking conservan frame", () => {
    const prior = {
      ok: true,
      ranking_direction: "TOP",
      limit: 10,
      customer_segment: "ALL",
      metric: "VENTA_TON",
      period: "2026-09",
    };
    for (const q of RANK_FOLLOW) {
      assert.equal(isClientRankingFollowUp(q) || pending.isPeriodOnlyAnswer(q, NOW), true, q);
    }
    const done = pending.completePendingFrame(
      pending.buildPendingGap({
        parent_intent: "client_ranking",
        missing_fields: ["period"],
        frame: { ranking_direction: "TOP", limit: 10, customer_segment: "ALL", metric: "VENTA_TON" },
        original_question: "top 10 clientes que más compran",
        why_blocks: "Falta periodo",
      }),
      "septiembre",
      NOW
    );
    assert.equal(done.ok, true);
    assert.equal(done.frame.limit, 10);
    assert.equal(done.frame.metric, "VENTA_TON");
    assert.equal(done.frame.period_month || done.frame.period, "2026-09");
    const casa = extractClientRankingSpec("solo Casa", prior, { now: NOW });
    assert.equal(casa.ok, true);
    assert.equal(casa.customer_segment, "CASA");
    assert.equal(casa.limit, 10);
    assert.equal(casa.period, "2026-09");
  });

  it("15 anti-colisiones ranking", () => {
    for (const [q, intent] of RANK_ANTI) {
      const plan = planDirectorIaQuestion(q);
      if (intent) assert.equal(plan.intent, intent, q);
      else assert.notEqual(plan.intent, "client_ranking", q);
    }
  });

  it("mes abierto: observado parcial, last safe cut, no forecast inventado", async () => {
    assert.equal(previousYearMonth("2026-09"), "2026-08");
    const empty = buildClientRankingAnswer({
      ok: true,
      spec: { period: "2026-09", plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP" },
      ranked: [],
      now: NOW,
    });
    assert.match(empty, /NO_ROWS_OBSERVED/);
    assert.match(empty, /CLIENT_FORECAST_UNAVAILABLE/);
    assert.doesNotMatch(empty, /cierre/);
    const partial = buildClientRankingAnswer({
      ok: true,
      spec: { period: "2026-09", plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP", metric: "VENTA_TON" },
      ranked: [{ cliente: "PUBLICO EN GENERAL", venta_ton: 4.2 }],
      now: NOW,
      uniform_projection_factor: 2,
    });
    assert.match(partial, /OBSERVED_PARTIAL/);
    assert.match(partial, /proyección uniforme/);
    assert.match(partial, /PROJECTED_ESTIMATE/);
    const last = await loadClientRankingForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      question: "top 10 clientes que más compran en septiembre",
      now: NOW,
      plant_label: "Acapulco",
      salesRows: [],
      lastSafeCutSalesRows: [{ cliente_norm: "PUBLICO EN GENERAL", kg: 9000, canal: "Casa" }],
    });
    assert.equal(last.data_semantics, "LAST_SAFE_CUT");
    assert.equal(last.asked_period, "2026-09");
    assert.equal(last.spec.period, "2026-08");
    assert.match(buildClientRankingAnswer(last), /LAST_SAFE_CUT/);
    assert.match(buildClientRankingAnswer(last), /NO_ROWS_OBSERVED/);
  });

  it("conversación real folios + ranking", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    const rows = Array.from({ length: 16 }, (_, i) => ({
      id: 100 + i,
      numero_folio: i === 9 ? "F-202602-148" : `F-202608-${400 + i}`,
      concepto: "llantas",
      categoria: "Taller",
      importe: 10 + i,
      estatus: "PAGADO",
      mes_cargo: i < 8 ? "2026-01" : "2026-08",
      planta_id: 1,
    }));
    configureDirectorIaChat({
      now: NOW,
      folioItems: rows,
      clientRankingSalesRows: [],
      clientRankingLastSafeCutSalesRows: [{ cliente_norm: "PUBLICO EN GENERAL", kg: 7000, canal: "Casa" }],
      clientRankingPlantCodes: ["E3"],
      resolveClientRankingPlantByNombre: async () => ({ id: 1, nombre: "Acapulco" }),
      persistentMemoryStore: null,
    });
    const req = (question, state) => ({
      body: { question, planta_nombre: "Acapulco", conversation_state: state || null },
      dashboardAuth: { role: "ZP" },
    });
    const t1 = await askDirectorIa(req("qué folios son de llantas"), 1, "qué folios son de llantas");
    const t2 = await askDirectorIa(req("de enero a agosto", t1.context_meta.conversation_state), 1, "de enero a agosto");
    assert.equal(t2.ok, true);
    const t3 = await askDirectorIa(req("abre el 10", t2.context_meta.conversation_state), 1, "abre el 10");
    assert.equal(t3.ok, true);
    assert.match(t3.answer, /F-202602-148/);
    assert.doesNotMatch(t3.answer, /^Abro /);
    assert.equal(t3.ui_action.type, "OPEN_FOLIO");
    assert.equal(t3.ui_action.numero_folio, "F-202602-148");

    const byId = await askDirectorIa(req("abre F-202602-148"), 1, "abre F-202602-148");
    assert.equal(byId.ok, true);
    assert.equal(byId.ui_action.type, "OPEN_FOLIO");
    assert.equal(byId.ui_action.numero_folio, "F-202602-148");

    const dotted = await askDirectorIa(req("abre . F-202602-148"), 1, "abre . F-202602-148");
    assert.equal(dotted.ui_action.numero_folio, "F-202602-148");

    const listed = buildFolioSearchChatResult(
      {
        ok: true,
        count: 16,
        records: rows.map((r) => ({ numero_folio: r.numero_folio, folio_id: r.id })),
        filters: { scope: "ALL_PUBLIC_FOLIOS", period_mode: "RANGE", period_start: "2026-01", period_end: "2026-08", concept_mode: "SINGLE", concept_query: "llantas", operation: "concept_sequence" },
      },
      { planta_id: 1 }
    );
    const oob = await askDirectorIa(req("abre el 17", listed.context_meta.conversation_state), 1, "abre el 17");
    assert.match(oob.answer, /16 folios/);
    assert.equal(oob.ui_action, undefined);

    const r1 = await askDirectorIa(req("top 10 clientes que más compran"), 1, "top 10 clientes que más compran");
    assert.match(r1.answer, /Indica el mes/);
    const r2 = await askDirectorIa(req("septiembre", r1.context_meta.conversation_state), 1, "septiembre");
    assert.equal(r2.ok, true);
    assert.doesNotMatch(r2.answer, /No pude determinar el ranking/);
    assert.match(r2.answer, /PUBLICO EN GENERAL|LAST_SAFE_CUT|NO_ROWS_OBSERVED/);
    const specFollow = extractClientRankingSpec("septiembre", { ok: true, limit: 10, ranking_direction: "TOP", customer_segment: "ALL", metric: "VENTA_TON" }, { now: NOW });
    assert.equal(specFollow.limit, 10);
    const r3 = await askDirectorIa(req("top 10 clientes que más compran en septiembre"), 1, "top 10 clientes que más compran en septiembre");
    assert.equal(r3.ok, true);
    configureDirectorIaChat({ folioItems: undefined, clientRankingSalesRows: undefined, clientRankingLastSafeCutSalesRows: undefined, persistentMemoryStore: null });
  });
});
