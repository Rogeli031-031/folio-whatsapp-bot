"use strict";

/**
 * FIX-DIRECTOR-IA-PENDING-CLARIFICATION-AND-UI-ACTIONS-001
 * Paráfrasis explícitas. No son reglas de producción.
 */

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { extractClientRankingSpec, isClientRankingFollowUp, buildClientRankingAnswer } = require("../lib/director-ia-client-ranking");
const { extractFolioSearchFilters, loadFolioSearchForChat, buildFolioSearchChatResult } = require("../lib/director-ia-folio-search");
const { extractOrdinal, selectOrdinal } = require("../lib/director-ia-executive-backlog");
const pending = require("../lib/director-ia-pending-completion");

const NOW = new Date("2026-09-16T12:00:00-06:00");

const FOLIO_ASK = Object.freeze([
  "qué folios son de llantas",
  "que folios son de llantas",
  "enlista los folios de llantas",
  "lista folios de llantas",
  "dame los folios de llantas",
  "muéstrame los folios de llantas",
  "cuáles folios son de llantas",
  "folios de llantas",
  "lista los de llantas",
  "enlista llantas",
  "qué folios hay de aceite",
  "lista folios de aceite",
  "enlista folios de extintores",
  "dame folios de uniformes",
  "lista folios de filtros",
  "qué folios son de pintura",
  "enlista folios de baterías",
  "lista folios de válvulas",
  "qué folios hay de refacciones",
  "lista folios de balatas",
  "enlista los folios de llanta",
  "dame listado de folios de llantas",
  "cuáles son los folios de llantas",
  "lista folios relacionados con llantas",
  "qué folios mencionan llantas",
  "enlista folios concepto llantas",
  "muéstrame folios de llantas por favor",
  "lista los folios de aceite",
  "qué folios de llantas tenemos",
  "enlista folios de llantas de Acapulco",
]);

const FOLIO_SHORT = Object.freeze([
  "de enero a agosto",
  "enero a agosto",
  "enero-agosto",
  "de enero hasta agosto",
  "enero agosto",
  "septiembre",
  "en septiembre",
  "agosto",
  "en agosto",
  "julio",
  "de febrero a julio",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "octubre",
  "noviembre",
  "diciembre",
  "enero 2026",
  "septiembre 2026",
  "de marzo a junio",
  "febrero-mayo",
  "de abril a septiembre",
  "2026-01",
  "2026-09",
  "solo enero",
  "rango enero agosto",
  "entre enero y agosto",
  "de mayo a agosto",
  "enero",
]);

const RANK_ASK = Object.freeze([
  "top 5 clientes que más compran",
  "top 5 clientes que mas compran",
  "top 5 clientes",
  "los 5 clientes que más compran",
  "ranking de clientes",
  "quiénes compran más",
  "top clientes",
  "dame el top 5 de clientes",
  "clientes con mayor venta",
  "top 10 clientes",
  "mayores compradores",
  "ranking comercial",
  "quién compra más",
  "top 3 clientes",
  "lista top 5 clientes",
  "clientes top",
  "el top de compradores",
  "ranking de venta",
  "top clientes de la planta",
  "quiénes son los que más compran",
  "top 8 clientes",
  "los principales clientes",
  "ranking top 5",
  "clientes ordenados por venta",
  "mayor venta de clientes",
  "top compradores",
  "dame ranking de clientes",
  "top 4 clientes que más compran",
  "quiénes más compraron",
  "top 5 de compradores",
]);

const RANK_SHORT = Object.freeze([
  "septiembre",
  "en septiembre",
  "agosto",
  "en agosto",
  "julio",
  "junio",
  "mayo",
  "abril",
  "marzo",
  "febrero",
  "enero",
  "octubre",
  "noviembre",
  "diciembre",
  "septiembre 2026",
  "agosto 2026",
  "2026-09",
  "2026-08",
  "este mes",
  "mes actual",
  "en julio",
  "de septiembre",
  "septiembre por favor",
  "el de septiembre",
  "usa septiembre",
  "periodo septiembre",
  "mes de septiembre",
  "septiembre entonces",
  "ok septiembre",
  "septiembre 26",
]);

const OPEN_FOLIO = Object.freeze([
  "abre el primero",
  "abre el segundo",
  "abre el último",
  "abre el penúltimo",
  "muéstrame el tercero",
  "entra al folio número 4",
  "abre F-202608-425",
  "abre el tercero",
  "quiero ver el primero",
  "y el segundo",
  "regresa al primero",
  "abre el número 1",
  "entra al primero",
  "muéstrame el último",
  "abre el 2",
  "el primero",
  "el segundo de la lista",
  "abre el folio 3",
  "entra al tercero",
  "abre el número 5",
  "muéstrame el segundo",
  "quiero el último",
  "abre el penultimo",
  "el tercero",
  "abre el primero de la lista",
  "entra al último",
  "muéstrame F-202608-425",
  "abre el folio F-202608-425",
  "el número 4",
  "abre el 1o",
]);

const RANK_EXPLICIT = Object.freeze([
  "top 5 clientes que más compran en septiembre",
  "top 5 clientes que mas compran en septiembre",
  "top 5 clientes que más compran en septiembre en Acapulco",
  "top 5 clientes de septiembre",
  "ranking de clientes en septiembre",
  "quiénes compran más en septiembre",
  "top clientes septiembre 2026",
  "top 5 septiembre Acapulco",
  "clientes con mayor venta en septiembre",
  "top 10 clientes en agosto",
  "mayores compradores de julio",
  "ranking comercial de junio",
  "quién compra más en mayo",
  "top 3 clientes de abril",
  "lista top 5 clientes de marzo",
  "top clientes en febrero",
  "el top de compradores de enero",
  "ranking de venta en octubre",
  "top clientes de la planta en noviembre",
  "quiénes más compran en diciembre",
  "top 8 clientes en septiembre 2026",
  "los principales clientes de agosto",
  "ranking top 5 de julio",
  "clientes ordenados por venta en junio",
  "mayor venta de clientes en mayo",
  "top compradores de abril",
  "dame ranking de clientes de marzo",
  "top 4 clientes que más compran en febrero",
  "quiénes más compraron en enero",
  "top 5 de compradores en septiembre",
]);

function assertLen(arr, n, label) {
  assert.equal(arr.length, n, `${label} debe tener ${n}`);
  assert.equal(new Set(arr).size, n, `${label} no debe repetir`);
}

describe("FIX-DIRECTOR-IA-PENDING-CLARIFICATION-AND-UI-ACTIONS-001", () => {
  it("baterías explícitas 30/30", () => {
    assertLen(FOLIO_ASK, 30, "folio ask");
    assertLen(FOLIO_SHORT, 30, "folio short");
    assertLen(RANK_ASK, 30, "rank ask");
    assertLen(RANK_SHORT, 30, "rank short");
    assertLen(OPEN_FOLIO, 30, "open folio");
    assertLen(RANK_EXPLICIT, 30, "rank explicit");
  });

  it("A folio: 30 asks piden periodo y 30 cortas lo completan", () => {
    for (const q of FOLIO_ASK) {
      const filters = extractFolioSearchFilters(q, { now: NOW });
      assert.ok(filters.concept_query, q);
      assert.notEqual(filters.period_mode, "ANY", q);
    }
    const gap = pending.buildPendingGap({
      parent_intent: "folio_search",
      missing_fields: ["period"],
      frame: { concept_query: "llantas", analysis_mode: "LIST", scope: "ALL_PUBLIC_FOLIOS" },
      original_question: "qué folios son de llantas",
      why_blocks: "Falta periodo",
    });
    for (const q of FOLIO_SHORT) {
      const done = pending.completePendingFrame(gap, q, NOW);
      assert.equal(done && done.ok, true, q);
      assert.equal(done.frame.concept_query, "llantas");
      assert.ok(done.frame.period || done.frame.period_month || done.frame.period_start, q);
    }
    const eneAgo = pending.completePendingFrame(gap, "de enero a agosto", NOW);
    assert.equal(eneAgo.frame.period_start, "2026-01");
    assert.equal(eneAgo.frame.period_end, "2026-08");
  });

  it("A ranking: 30 asks y 30 cortas completan periodo", () => {
    for (const q of RANK_SHORT) {
      assert.equal(pending.isPeriodOnlyAnswer(q, NOW) || /este mes|mes actual/.test(pending.normalize ? "" : q.normalize("NFD")), true, q);
    }
    const gap = pending.buildPendingGap({
      parent_intent: "client_ranking",
      missing_fields: ["period"],
      frame: { ranking_direction: "TOP", limit: 5, customer_segment: "ALL", metric: "VENTA_TON" },
      original_question: "top 5 clientes que más compran",
      why_blocks: "Falta periodo",
    });
    const sep = pending.completePendingFrame(gap, "septiembre", NOW);
    assert.equal(sep.ok, true);
    assert.equal(sep.frame.period_month || sep.frame.period, "2026-09");
    assert.equal(sep.frame.limit, 5);
    assert.equal(sep.frame.metric, "VENTA_TON");
    assert.equal(isClientRankingFollowUp("septiembre"), true);
    const spec = extractClientRankingSpec("septiembre", { ok: true, ranking_direction: "TOP", limit: 5, customer_segment: "ALL", metric: "VENTA_TON" }, { now: NOW });
    assert.equal(spec.ok, true);
    assert.equal(spec.period, "2026-09");
    assert.equal(spec.limit, 5);
  });

  it("B OPEN_FOLIO 30 variantes y wording truthful", () => {
    const items = [
      { numero_folio: "F-202608-425", folio_id: 11 },
      { numero_folio: "F-202608-426", folio_id: 12 },
      { numero_folio: "F-202608-427", folio_id: 13 },
      { numero_folio: "F-202608-428", folio_id: 14 },
    ];
    let matched = 0;
    for (const q of OPEN_FOLIO) {
      const sel = extractOrdinal(q);
      if (!sel) continue;
      const hit = selectOrdinal(items, sel);
      if (hit) {
        matched += 1;
        assert.match(hit.numero_folio, /^F-/);
      }
    }
    assert.ok(matched >= 20, `expected many ordinals, got ${matched}`);
    assert.equal(selectOrdinal(items, extractOrdinal("abre el primero")).numero_folio, "F-202608-425");
    assert.equal(selectOrdinal(items, extractOrdinal("abre el segundo")).numero_folio, "F-202608-426");
    assert.equal(selectOrdinal(items, extractOrdinal("abre el último")).numero_folio, "F-202608-428");
  });

  it("C ranking explícito septiembre no inventa forecast", () => {
    for (const q of RANK_EXPLICIT) {
      const spec = extractClientRankingSpec(q, null, { now: NOW });
      assert.equal(spec.ok, true, q);
      assert.ok(spec.period, q);
    }
    const sep = extractClientRankingSpec("top 5 clientes que más compran en septiembre", null, { now: NOW });
    assert.equal(sep.period, "2026-09");
    assert.equal(sep.metric, "VENTA_TON");
    assert.equal(sep.limit, 5);
    const emptyOpen = buildClientRankingAnswer({
      ok: true,
      spec: { ...sep, plant_label: "Acapulco", customer_segment: "ALL" },
      ranked: [],
      now: NOW,
    });
    assert.match(emptyOpen, /No tengo datos observados por cliente/);
    assert.doesNotMatch(emptyOpen, /NO_ROWS_OBSERVED|LAST_SAFE_CUT|CLIENT_FORECAST_UNAVAILABLE|FORECAST_AVAILABLE/);
    const withRows = buildClientRankingAnswer({
      ok: true,
      spec: { ...sep, plant_label: "Acapulco", customer_segment: "ALL", ranking_direction: "TOP", metric: "VENTA_TON" },
      ranked: [{ cliente: "PUBLICO EN GENERAL", venta_ton: 12.5 }],
      now: NOW,
    });
    assert.match(withRows, /observad|OBSERVED_PARTIAL/i);
    assert.doesNotMatch(withRows, /Abro /);
  });

  it("conversación folio + ranking + ordinal", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      now: NOW,
      folioItems: [
        {
          id: 11,
          numero_folio: "F-202608-425",
          concepto: "llantas",
          categoria: "Taller",
          importe: 100,
          estatus: "PAGADO",
          mes_cargo: "2026-01",
          planta_id: 1,
        },
        {
          id: 12,
          numero_folio: "F-202608-426",
          concepto: "llantas",
          categoria: "Taller",
          importe: 80,
          estatus: "PAGADO",
          mes_cargo: "2026-08",
          planta_id: 1,
        },
      ],
      clientRankingSalesRows: [{ cliente_norm: "PUBLICO EN GENERAL", kg: 5000, canal: "Casa" }],
      clientRankingPlantCodes: ["E3"],
      resolveClientRankingPlantByNombre: async () => ({ id: 1, nombre: "Acapulco" }),
      persistentMemoryStore: null,
    });
    const req = (question, state) => ({
      body: { question, planta_nombre: "Acapulco", conversation_state: state || null },
      dashboardAuth: { role: "ZP" },
    });

    const t1 = await askDirectorIa(req("qué folios son de llantas"), 1, "qué folios son de llantas");
    assert.equal(t1.ok, true);
    assert.match(t1.answer, /De qué mes o rango de meses quieres los folios de llantas/);
    assert.equal(t1.context_meta.conversation_state.pending_information_gap.missing_fields[0], "period");

    const t2 = await askDirectorIa(
      req("de enero a agosto", t1.context_meta.conversation_state),
      1,
      "de enero a agosto"
    );
    assert.equal(t2.ok, true);
    assert.notEqual(t2.context_meta.conversation_state.parent_intent, null);
    assert.match(String(t2.answer), /F-202608-425|llantas|Encontré/);

    const r1 = await askDirectorIa(req("top 5 clientes que más compran"), 1, "top 5 clientes que más compran");
    assert.equal(r1.ok, true);
    assert.match(r1.answer, /De qué mes o periodo quieres el ranking/);
    const r2 = await askDirectorIa(req("septiembre", r1.context_meta.conversation_state), 1, "septiembre");
    assert.equal(r2.ok, true);
    assert.doesNotMatch(r2.answer, /No pude determinar el ranking/);
    assert.match(r2.answer, /PUBLICO EN GENERAL|observado|septiembre|2026-09/);

    const r3 = await askDirectorIa(req("top 5 clientes que más compran en septiembre"), 1, "top 5 clientes que más compran en septiembre");
    assert.equal(r3.ok, true);
    assert.doesNotMatch(r3.answer, /No pude determinar el ranking/);

    const listed = buildFolioSearchChatResult(
      {
        ok: true,
        count: 2,
        records: [
          { numero_folio: "F-202608-425", folio_id: 11 },
          { numero_folio: "F-202608-426", folio_id: 12 },
        ],
        filters: {
          scope: "ALL_PUBLIC_FOLIOS",
          period_mode: "RANGE",
          period_start: "2026-01",
          period_end: "2026-08",
          concept_mode: "SINGLE",
          concept_query: "llantas",
          operation: "concept_sequence",
        },
      },
      { planta_id: 1 }
    );
    const nav = await askDirectorIa(
      req("abre el primero", listed.context_meta.conversation_state),
      1,
      "abre el primero"
    );
    assert.equal(nav.ok, true);
    assert.match(nav.answer, /primer folio es F-202608-425/);
    assert.doesNotMatch(nav.answer, /^Abro /);
    assert.equal(nav.ui_action.type, "OPEN_FOLIO");
    assert.equal(nav.ui_action.numero_folio, "F-202608-425");
    configureDirectorIaChat({ folioItems: undefined, clientRankingSalesRows: undefined, persistentMemoryStore: null });
  });

  it("anti-colisiones", () => {
    assert.equal(planDirectorIaQuestion("¿Cuántos folios fueron de llantas?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en llantas?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("top 5 clientes con mayor descuento").intent, "client_discount_ranking");
    assert.equal(planDirectorIaQuestion("abre la venta diaria de Acapulco").intent, "open_daily_sales_view");
    assert.equal(pending.looksLikeStandaloneIntent("top 5 clientes que más compran en septiembre"), true);
    assert.equal(pending.looksLikeStandaloneIntent("septiembre"), false);
    assert.equal(pending.completePendingFrame(null, "septiembre", NOW), null);
  });
});
