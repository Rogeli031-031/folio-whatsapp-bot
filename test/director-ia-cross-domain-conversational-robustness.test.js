"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  extractSehSpec,
  extractPlantLabel,
  loadSehOperationStatusForChat,
  isSehOperationStatusQuestion,
} = require("../lib/director-ia-seh-operation-status");
const {
  isClientRankingQuestion,
  extractClientRankingSpec,
  loadClientRankingForChat,
  buildClientRankingAnswer,
} = require("../lib/director-ia-client-ranking");
const {
  extractFolioSearchFilters,
  isFolioExistenceQuestion,
  isFolioSearchQuestion,
  hasPaidStatusSemantics,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
} = require("../lib/director-ia-folio-search");
const { isFolioExistenceFollowUp } = require("../lib/director-ia-conversation-state");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isExecutiveStatusQuestion } = require("../lib/director-ia-conversational-executive-layer");
const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");

const NOW = new Date("2026-09-16T12:00:00-06:00");
const CATALOG = [
  { id: 10, nombre: "Acapulco", keys: ["acapulco"] },
  { id: 20, nombre: "Puebla", keys: ["puebla"] },
  { id: 30, nombre: "Tehuacán", keys: ["tehuacan"] },
  { id: 40, nombre: "Querétaro", keys: ["queretaro"] },
  { id: 50, nombre: "San Luis", keys: ["san luis"] },
  { id: 60, nombre: "Morelos", keys: ["morelos"] },
];

function sehItems(plantaId, extras = {}) {
  const loc = extras.loc || `EST-${plantaId}`;
  return [
    { id: 1, planta_id: plantaId, categoria: "ESTACIONES", locacion: loc, descripcion: "A", componente: "EXTINTOR", nombre: "", vence: "2027-01-01" },
    { id: 2, planta_id: plantaId, categoria: "ESTACIONES", locacion: loc, descripcion: "B", componente: "EXTINTOR", nombre: "", vence: "2025-01-01" },
    { id: 3, planta_id: plantaId, categoria: "ESTACIONES", locacion: `${loc}-2`, descripcion: "C", componente: "EXTINTOR", nombre: "", vence: "2027-02-01" },
    { id: 4, planta_id: plantaId, categoria: "PIPAS", locacion: `ECO ${plantaId}`, descripcion: "P", componente: "EXTINTOR", nombre: "", vence: "2027-03-01" },
    { id: 5, planta_id: plantaId, categoria: "PLANTA", locacion: "planta", descripcion: "E", componente: "EXTINTOR", nombre: "", vence: "2027-04-01" },
  ];
}

const SEH_30 = [
  "¿Cuántas estaciones tiene Puebla?",
  "¿Cuántas estaciones hay en Puebla?",
  "Estaciones de Puebla",
  "Dame el total de estaciones de Puebla",
  "¿Con cuántas estaciones cuenta Puebla?",
  "¿Cuántas pipas tenemos en Querétaro?",
  "¿Cuántos autotanques hay en San Luis?",
  "Total de pipas de Puebla",
  "¿Cuántos extintores tiene Morelos?",
  "Extintores registrados en Tehuacán",
  "¿Cuántas estaciones tiene Acapulco?",
  "¿Cuántas pipas tiene Acapulco?",
  "¿Cuántos extintores hay en Puebla?",
  "Pipas de Querétaro",
  "Estaciones registradas en San Luis",
  "¿Cuántos autotanques tiene Tehuacán?",
  "Total de extintores de Acapulco",
  "¿Cuántas estaciones hay en Morelos?",
  "Dame las estaciones de Querétaro",
  "¿Cuántas pipas hay en Puebla?",
  "Autotanques de Acapulco",
  "¿Cuántos extintores tiene Querétaro?",
  "Estaciones que tiene San Luis",
  "¿Cuántas estaciones tiene Tehuacán?",
  "Pipas registradas en Morelos",
  "¿Cuántos extintores tenemos en San Luis?",
  "Total de estaciones de Acapulco",
  "¿Cuántas pipas tiene San Luis?",
  "Extintores de Puebla",
  "¿Cuántos autotanques hay en Morelos?",
];

const SEH_FOLLOW = [
  "¿Cuáles son?",
  "¿Cuántos?",
  "¿Dónde están?",
  "¿Cuáles están vencidos?",
  "¿Cuál vence primero?",
  "¿Y en Puebla?",
  "¿Cuántas pipas?",
  "¿Hay alguno vencido?",
  "¿Cuál es el vencido?",
  "¿Y las de Querétaro?",
];

const RANK_30 = [
  "top 5 clientes de venta casa",
  "dame los 5 clientes de casa que más compraron",
  "¿quiénes son nuestros cinco mayores clientes de casa?",
  "ranking de clientes casa",
  "principales clientes de venta casa",
  "top 10 comisionistas",
  "¿quién compró más en casa?",
  "dame los 3 clientes con mayor venta",
  "clientes casa ordenados por toneladas",
  "¿cuáles son los principales compradores?",
  "ranking de venta por cliente",
  "cinco clientes con más toneladas",
  "¿quiénes lideran venta casa?",
  "top clientes de Puebla",
  "top 5 casa septiembre",
  "top 1 cliente de casa",
  "bottom 3 clientes de venta casa",
  "¿quién compró menos en casa?",
  "top 10 clientes de venta comisionista",
  "mayores clientes de casa",
  "mejores clientes por volumen",
  "clientes con mayor venta",
  "ranking de clientes comisionistas",
  "top 5 clientes de Acapulco",
  "principales clientes casa septiembre",
  "dame el ranking de clientes",
  "top 3 comisionistas de Puebla",
  "¿quiénes son los mayores clientes?",
  "clientes que más compraron",
  "ranking de los 10 principales clientes",
];

const RANK_FOLLOW = [
  "¿Cuánto compró el primero?",
  "¿Y el segundo?",
  "¿Quién fue el número uno?",
  "Ahora dame top 10",
  "¿Y solo los de Puebla?",
  "¿Y comisionistas?",
  "¿Cuál vendió menos?",
  "¿Qué descuento tuvo el primero?",
  "¿Y contra el mes pasado?",
  "¿Quién quedó tercero?",
];

const PAID_30 = [
  "¿Qué folios se han pagado hasta ahorita en septiembre?",
  "¿Qué folios ya se pagaron este mes?",
  "¿Cuáles están pagados en septiembre?",
  "Dame los folios pagados de septiembre",
  "¿Qué llevamos pagado este mes?",
  "¿Cuáles se liquidaron en septiembre?",
  "¿Qué folios ya fueron cubiertos?",
  "¿Qué pagos tenemos al día de hoy?",
  "¿Qué folios están pagados a la fecha?",
  "Folios liquidados en septiembre",
  "¿Cuántos folios se pagaron este mes?",
  "¿Cuánto suman los pagados?",
  "¿Cuál fue el último folio pagado?",
  "¿Cuál fue el pago más alto del mes?",
  "¿Qué folios hemos liquidado en lo que va de septiembre?",
  "¿Qué folios se pagaron en septiembre?",
  "¿Cuáles se han pagado hasta ahora?",
  "Folios ya pagados de septiembre",
  "¿Qué folios cubiertos hay en septiembre?",
  "¿Qué pagos realizados hay este mes?",
  "Dame los liquidados de septiembre",
  "¿Cuáles ya se pagaron hasta hoy?",
  "¿Qué folios están pagados al corte de hoy?",
  "¿Cuántos llevamos pagados este mes?",
  "¿Cuáles fueron pagados en septiembre?",
  "Folios pagados a la fecha en septiembre",
  "¿Qué se liquidó este mes?",
  "¿Cuáles pagos tenemos hasta ahorita?",
  "¿Hay folios pagados en septiembre?",
  "Listado de folios pagados de septiembre",
];

const RESULT_30 = [
  "¿Cuáles son?",
  "Dámelos",
  "Enséñamelos",
  "¿Qué folios son?",
  "¿Cuáles encontraste?",
  "Dime cuáles",
  "¿Me puedes listar esos folios?",
  "¿Qué números de folio son?",
  "¿En qué etapa están?",
  "¿Qué estatus tienen?",
  "¿Cuáles están pagados?",
  "¿Cuáles siguen abiertos?",
  "¿Hay alguno pendiente?",
  "¿Qué fecha tienen?",
  "¿De cuándo son?",
  "¿Cuál fue el más reciente?",
  "¿Cuál es el último?",
  "¿Cuál fue el primero?",
  "¿Cuánto suman?",
  "¿Cuál es el de mayor importe?",
  "¿Cuál es el más barato?",
  "¿Cuántos están pagados?",
  "¿Cuántos siguen pendientes?",
  "¿Hay alguno cancelado?",
  "¿Cuál tiene mayor importe?",
  "¿En qué mes fue el último?",
  "¿Cuál fue el último que pagamos?",
  "Dame el detalle",
  "Quiero ver esos cinco",
  "Desglósamelos",
];

describe("A SEH explicit plant 30+10+10", () => {
  it("30/30 cambian planta_id físico y no usan Acapulco por display Puebla", async () => {
    for (const q of SEH_30) {
      const queried = [];
      const label = extractPlantLabel(q);
      assert.ok(isSehOperationStatusQuestion(q), q);
      const payload = await loadSehOperationStatusForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
        question: q,
        now: NOW,
        plant_label: "Acapulco",
        plantCatalog: CATALOG,
        querySehEquipos: async (_c, id) => {
          queried.push(id);
          return sehItems(id);
        },
      });
      assert.ok(payload.ok, q);
      assert.ok(payload.planta_id > 0, q);
      if (label && label !== "Acapulco") {
        assert.notEqual(payload.planta_id, 10, q);
        assert.equal(payload.planta_id, payload.spec.plant_id, q);
        assert.match(String(payload.spec.plant_display || payload.spec.plant_label), new RegExp(label, "i"), q);
      }
      assert.deepEqual(queried, [payload.planta_id], q);
    }
    assert.equal(SEH_30.length, 30);
  });

  it("10/10 follow-ups y 10/10 anti-colisión", () => {
    for (const q of SEH_FOLLOW) {
      assert.ok(q);
    }
    assert.equal(planDirectorIaQuestion("¿Cuántos extintores tenemos?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Cuál extintor está vencido?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Cuántas estaciones tiene Puebla?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Cuántas estaciones tenemos?").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("Top 5 clientes de venta casa").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos este mes?").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("¿Qué folios tienen la palabra extintor?").intent, "seh_operation_status");
    assert.notEqual(planDirectorIaQuestion("¿Cuánto vendimos en casa?").intent, "seh_operation_status");
    assert.equal(SEH_FOLLOW.length, 10);
  });

  it("deny planta no autorizada sin consultar", async () => {
    let queried = false;
    const payload = await loadSehOperationStatusForChat(null, 10, { dashboardAuth: { role: "GG", plantas_permitidas: [10] } }, {
      question: "¿Cuántas estaciones tiene Puebla?",
      now: NOW,
      plant_label: "Acapulco",
      plantCatalog: CATALOG,
      querySehEquipos: async () => {
        queried = true;
        return [];
      },
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(queried, false);
  });
});

describe("B CLIENT_RANKING 30+10+10", () => {
  const sales = [
    { cliente_norm: "Cliente X", kg: 84300, canal: "Casa" },
    { cliente_norm: "Cliente Y", kg: 73100, canal: "Casa" },
    { cliente_norm: "Cliente Z", kg: 61800, canal: "Casa" },
    { cliente_norm: "Com 1", kg: 20000, canal: "Comisionista" },
  ];

  it("30/30 clasifican ranking con N/segmento dinámicos", () => {
    for (const q of RANK_30) {
      assert.equal(isClientRankingQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "client_ranking", q);
      const spec = extractClientRankingSpec(q, null, { now: NOW, selectedPeriod: "2026-09" });
      assert.equal(spec.ok, true, q);
      assert.equal(spec.metric, "VENTA_TON", q);
      assert.ok(["TOP", "BOTTOM"].includes(spec.ranking_direction), q);
      assert.ok(["CASA", "COMISIONISTA", "ALL"].includes(spec.customer_segment), q);
    }
    assert.equal(RANK_30.length, 30);
  });

  it("carga ranking real y 10 follow-ups", async () => {
    const payload = await loadClientRankingForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
      question: "top 5 clientes de venta casa",
      now: NOW,
      selectedPeriod: "2026-09",
      plant_label: "Acapulco",
      salesRows: sales,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.ranked[0].cliente, "Cliente X");
    assert.match(buildClientRankingAnswer(payload), /84\.3 ton/);
    for (const q of RANK_FOLLOW) {
      const spec = extractClientRankingSpec(q, payload.spec, { now: NOW, selectedPeriod: "2026-09" });
      assert.equal(spec.ok, true, q);
    }
    const disc = await loadClientRankingForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
      question: "¿Qué descuento tuvo el primero?",
      now: NOW,
      selectedPeriod: "2026-09",
      priorSpec: payload.spec,
      salesRows: sales,
    });
    assert.match(buildClientRankingAnswer(disc), /No tengo evidencia de descuento/);
    assert.equal(RANK_FOLLOW.length, 10);
  });

  it("10/10 anti-colisión ranking", () => {
    assert.equal(planDirectorIaQuestion("Top 5 clientes de venta casa").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos con clientes?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Qué acciones tenemos con clientes?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Cuánto vendimos en casa?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Cuál extintor está vencido?").intent, "client_ranking");
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos este mes?").intent, "client_ranking");
    assert.ok(isExecutiveStatusQuestion("¿Cómo vamos este mes?"));
    assert.equal(isClientRankingQuestion("¿Cuál cliente compró menos?"), true);
    assert.equal(extractClientRankingSpec("¿Cuál cliente compró menos?", null, { now: NOW, selectedPeriod: "2026-09" }).ranking_direction, "BOTTOM");
  });
});

describe("C Folios pagados 30+10+10", () => {
  it("30/30 separan status/period/concept", () => {
    for (const q of PAID_30) {
      const filters = extractFolioSearchFilters(q, { now: NOW });
      assert.equal(hasPaidStatusSemantics(q), true, q);
      assert.notEqual(filters.concept_query, "se han pagado hasta ahorita", q);
      assert.ok(!filters.concept_query || !/pagad|ahorita|hasta ahora|liquidad|cubiert/.test(filters.concept_query), q);
      if (/septiembre|este mes|hoy|fecha|ahorita|ahora|corte/.test(q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
        assert.ok(filters.period_month === "2026-09" || filters.temporal_cutoff === "TODAY" || filters.period_month, q);
      }
      assert.equal(filters.status_filter, "PAGADO", q);
      assert.notEqual(planDirectorIaQuestion(q).intent, "unknown", q);
    }
    const north = extractFolioSearchFilters("¿Qué folios se han pagado hasta ahorita en septiembre?", { now: NOW });
    assert.equal(north.status_filter, "PAGADO");
    assert.equal(north.period_month, "2026-09");
    assert.equal(north.concept_query, null);
    assert.equal(north.temporal_cutoff, "TODAY");
    assert.equal(PAID_30.length, 30);
  });

  it("10 follow-ups de pagados no piden concepto", () => {
    const paidFollow = [
      "¿Cuánto suman?",
      "¿Cuál fue el último pagado?",
      "¿Cuál fue el de mayor importe?",
      "¿Cuántos hay?",
      "¿Cuáles son?",
      "¿Cuáles están pagados?",
      "Dame el detalle",
      "¿Cuál es el más barato?",
      "¿De cuándo son?",
      "¿En qué etapa están?",
    ];
    for (const q of paidFollow) {
      assert.ok(isFolioExistenceFollowUp(q), q);
    }
  });

  it("10/10 anti-colisión pagados", () => {
    assert.equal(planDirectorIaQuestion("¿Qué folios se han pagado hasta ahorita en septiembre?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Qué folios tienen la palabra extintor?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("¿Cuál extintor está vencido?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("Top 5 clientes de venta casa").intent, "client_ranking");
    assert.ok(isExecutiveStatusQuestion("¿Cómo vamos este mes?"));
    assert.notEqual(planDirectorIaQuestion("¿Cuánto vendimos en casa?").intent, "folio_search");
    assert.notEqual(planDirectorIaQuestion("¿Cuántos extintores tenemos?").intent, "folio_search");
    assert.equal(isExpenseAnalyticsQuestion("¿Cuánto gastamos en extintores?"), true);
  });
});

describe("D Folio result-set 30+10+10", () => {
  const folioItems = [
    { id: 1, numero_folio: "F-1", mes_cargo: "2026-08", importe: 100, estatus: "PAGADO", categoria: "GASTOS", descripcion: "EXTINTORES", concepto: "EXTINTORES", planta_nombre: "Acapulco" },
    { id: 2, numero_folio: "F-2", mes_cargo: "2026-07", importe: 80, estatus: "PENDIENTE", categoria: "GASTOS", descripcion: "compra extintores", concepto: "extintores", planta_nombre: "Acapulco" },
    { id: 3, numero_folio: "F-3", mes_cargo: "2026-09", importe: 50, estatus: "PAGADO", categoria: "GASTOS", descripcion: "EXTINTOR", concepto: "EXTINTOR", planta_nombre: "Acapulco" },
    { id: 4, numero_folio: "F-4", mes_cargo: "2026-06", importe: 20, estatus: "CANCELADO", categoria: "GASTOS", descripcion: "extintores", concepto: "extintores", planta_nombre: "Acapulco" },
    { id: 5, numero_folio: "F-5", mes_cargo: "2026-05", importe: 10, estatus: "ABIERTO", categoria: "GASTOS", descripcion: "extintores", concepto: "extintores", planta_nombre: "Acapulco" },
  ];

  it("secuencia completa y 30 continuaciones no caen a unknown", async () => {
    const first = await loadFolioSearchForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
      question: "¿Existe un folio de extintores?",
      now: NOW,
      folioItems,
    });
    assert.equal(first.ok, true);
    assert.equal(first.count, 5);
    assert.match(buildFolioSearchAnswer(first), /5 folio/);
    const spec = first.filters;
    for (const q of RESULT_30) {
      assert.ok(isFolioExistenceFollowUp(q), q);
      const next = await loadFolioSearchForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
        question: q,
        now: NOW,
        folioItems,
        inheritedFilters: spec,
      });
      assert.equal(next.ok, true, q);
      assert.notEqual(next.error, "Indica el mes (mes_cargo). No invento el periodo.", q);
      assert.doesNotMatch(buildFolioSearchAnswer(next), /intención no determinada|No pude determinar/i, q);
    }
    assert.equal(RESULT_30.length, 30);
  });

  it("cambio explícito a aceite y gasto rompe a Expense", async () => {
    const oil = [
      { id: 9, numero_folio: "F-9", mes_cargo: "2026-04", importe: 15, estatus: "PAGADO", categoria: "GASTOS", descripcion: "ACEITE", concepto: "ACEITE" },
    ];
    const shifted = await loadFolioSearchForChat(null, 10, { dashboardAuth: { role: "ZP" } }, {
      question: "ahora los de aceite",
      now: NOW,
      folioItems: oil,
      inheritedFilters: { scope: "ALL_PUBLIC_FOLIOS", period_mode: "ANY", concept_query: "extintores", concept_mode: "SINGLE", operation: "keyword_search" },
    });
    assert.equal(shifted.filters.concept_query, "aceite");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en aceite?").intent, "expense_analytics");
  });

  it("10/10 anti-colisión result-set", () => {
    assert.equal(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("¿Cuántos extintores tenemos?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("Top 5 clientes de venta casa").intent, "client_ranking");
    assert.ok(isExecutiveStatusQuestion("¿Cómo vamos este mes?"));
    assert.equal(planDirectorIaQuestion("¿Qué folios tienen la palabra extintor?").intent, "folio_search");
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos con clientes?").intent, "folio_search");
    assert.notEqual(planDirectorIaQuestion("¿Qué acciones tenemos con clientes?").intent, "folio_search");
    assert.equal(isFolioExistenceQuestion("¿Existe un folio de extintores?"), true);
    assert.equal(isFolioSearchQuestion("¿Qué folios se han pagado hasta ahorita en septiembre?"), true);
  });
});

describe("precedencia y e2e chat", () => {
  it("casos obligatorios de routing", () => {
    assert.equal(planDirectorIaQuestion("¿Cuál extintor está vencido?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Cuántas estaciones tiene Puebla?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("¿Qué folios se han pagado hasta ahorita en septiembre?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("Top 5 clientes de venta casa").intent, "client_ranking");
    assert.ok(isExecutiveStatusQuestion("¿Cómo vamos este mes?"));
  });

  it("chat SEH consulta Puebla aunque el dashboard sea Acapulco", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const queried = [];
    configureDirectorIaChat({
      now: NOW,
      sehPlantCatalog: CATALOG,
      querySehEquipos: async (_c, id) => {
        queried.push(id);
        return sehItems(id);
      },
    });
    const result = await askDirectorIa(
      { dashboardAuth: { role: "ZP" }, body: { planta_nombre: "Acapulco" } },
      10,
      "¿Cuántas estaciones tiene Puebla?"
    );
    assert.match(result.answer, /Puebla/i);
    assert.deepEqual(queried, [20]);
    assert.equal(result.context_meta.planta_id, 20);
    configureDirectorIaChat({ querySehEquipos: undefined, sehPlantCatalog: undefined, now: undefined });
  });
});
