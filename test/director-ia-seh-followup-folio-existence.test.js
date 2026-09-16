"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  SCOPES,
  METRICS,
  extractSehSpec,
  isSehOperationStatusQuestion,
  isSehFollowUp,
  loadSehOperationStatusForChat,
  buildSehAnswer,
} = require("../lib/director-ia-seh-operation-status");
const {
  extractFolioSearchFilters,
  isFolioExistenceQuestion,
  isFolioSearchQuestion,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
} = require("../lib/director-ia-folio-search");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  isExecutiveStatusQuestion,
  isDiagnosisObservationRiskQuestion,
} = require("../lib/director-ia-conversational-executive-layer");

const NOW = new Date("2026-09-16T12:00:00-06:00");

const SEH_30 = [
  "¿Cuál extintor está vencido?",
  "¿Qué extintor está vencido?",
  "¿Cuál de los extintores está vencido?",
  "¿Qué extintores están vencidos?",
  "¿Cuál es el extintor vencido?",
  "¿Cuál fue el que venció?",
  "¿Qué equipo está vencido?",
  "¿Cuál de ellos está vencido?",
  "¿Cuál es el vencido?",
  "¿Qué extintor ya venció?",
  "¿Cuál extintor ya caducó?",
  "¿Qué extintor ya caducó?",
  "¿Cuál tiene la fecha vencida?",
  "¿Qué extintor tiene vencimiento atrasado?",
  "¿Cuál ya no está vigente?",
  "¿Qué extintor dejó de estar vigente?",
  "¿Cuál de los registrados ya venció?",
  "¿Qué extintor aparece como vencido?",
  "¿Cuál aparece en rojo por vencimiento?",
  "¿Cuál es el que tiene fecha pasada?",
  "¿Qué extintor tiene la fecha de vencimiento vencida?",
  "¿Cuál es el extintor fuera de vigencia?",
  "¿Qué equipo contra incendio está vencido?",
  "¿Cuál de esos extintores está fuera de vigencia?",
  "¿Cuál es el extintor que mencionaste como vencido?",
  "¿Cuál era el vencido?",
  "¿Me dices cuál está vencido?",
  "Dime cuál extintor está vencido",
  "Señálame el extintor vencido",
  "¿Cuál es exactamente el extintor vencido?",
];

const FOLIO_30 = [
  "¿Existe un folio de extintores?",
  "¿Hay algún folio de extintores?",
  "¿Tenemos algún folio de extintores?",
  "¿Hay folios de extintores?",
  "¿Existen folios relacionados con extintores?",
  "¿Tenemos folios relacionados con extintores?",
  "¿Hay algún folio que mencione extintores?",
  "¿Existe algún folio que contenga la palabra extintores?",
  "¿Tenemos algún folio con extintores?",
  "¿Hay algún registro de folio sobre extintores?",
  "¿Hay folios por compra de extintores?",
  "¿Existe algún folio por extintores?",
  "¿Tenemos algún apoyo registrado para extintores?",
  "¿Hay algún gasto registrado en folios por extintores?",
  "¿Aparecen extintores en algún folio?",
  "¿Se ha generado algún folio de extintores?",
  "¿Se registró algún folio relacionado con extintores?",
  "¿Existe algún folio histórico de extintores?",
  "¿Hay algún folio donde salga extintores?",
  "¿Tenemos antecedentes de folios de extintores?",
  "¿Hay folios asociados a extintores?",
  "¿Existe algún folio con concepto de extintores?",
  "¿Hay algún folio que tenga que ver con extintores?",
  "¿Tenemos compras de extintores registradas en folios?",
  "¿Hay algún folio abierto o pagado de extintores?",
  "¿Puedes revisar si existe un folio de extintores?",
  "Revisa si tenemos folios de extintores",
  "Búscame si hay algún folio de extintores",
  "Dime si existe algún folio de extintores",
  "Quiero saber si tenemos algún folio relacionado con extintores",
];

function sehRow(over = {}) {
  return {
    id: over.id || 1,
    planta_id: over.planta_id || 1,
    categoria: over.categoria || "ESTACIONES",
    locacion: over.locacion || "PIE DE LA CUESTA",
    descripcion: over.descripcion || "E1",
    componente: over.componente == null ? "EXTINTOR" : over.componente,
    nombre: over.nombre || "",
    vence: Object.prototype.hasOwnProperty.call(over, "vence") ? over.vence : "2026-12-31",
    sort_order: 0,
  };
}

function sehItems() {
  return [
    sehRow({ id: 1, locacion: "PIE DE LA CUESTA", descripcion: "E1", vence: "2026-12-31" }),
    sehRow({ id: 2, locacion: "PIE DE LA CUESTA", descripcion: "E2", vence: "2026-08-01" }),
    sehRow({ id: 3, locacion: "COSTERA", descripcion: "C1", vence: "2026-12-01" }),
    sehRow({ id: 4, categoria: "PIPAS", locacion: "AUTOTANQUE ECO 39", descripcion: "P1", vence: "2026-11-01" }),
    sehRow({ id: 5, categoria: "PLANTA", locacion: "CUARTO DE CONTROL", descripcion: "C1", vence: "2026-12-31" }),
  ];
}

function folioRow(over = {}) {
  return {
    id: over.id || 1,
    numero_folio: over.numero_folio || `F-${over.id || 1}`,
    planta_id: over.planta_id || 1,
    mes_cargo: over.mes_cargo || "2026-01",
    importe: over.importe != null ? over.importe : 100,
    estatus: over.estatus || "PAGADO",
    categoria: over.categoria || "GASTOS",
    subcategoria: over.subcategoria || "",
    concepto: over.concepto || "compra de extintores",
    beneficiario: "Proveedor",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
  };
}

function folioItems() {
  return [
    folioRow({ id: 1, concepto: "compra de extintores", mes_cargo: "2026-01", estatus: "PAGADO", importe: 500 }),
    folioRow({ id: 2, concepto: "recarga extintores", mes_cargo: "2026-03", estatus: "PENDIENTE", importe: 200 }),
    folioRow({ id: 3, concepto: "aceite de motor", mes_cargo: "2025-11", estatus: "PAGADO", importe: 80 }),
    folioRow({ id: 4, concepto: "llantas delanteras", mes_cargo: "2026-02", estatus: "PAGADO", importe: 300 }),
    folioRow({ id: 5, concepto: "baterías 12v", mes_cargo: "2026-04", estatus: "PAGADO", importe: 150 }),
    folioRow({ id: 6, concepto: "pintura de tanque", mes_cargo: "2026-05", estatus: "PAGADO", importe: 90 }),
    folioRow({ id: 7, concepto: "uniformes de planta", mes_cargo: "2026-06", estatus: "PAGADO", importe: 60 }),
    folioRow({ id: 8, concepto: "válvulas de seguridad", mes_cargo: "2026-07", estatus: "PAGADO", importe: 40 }),
  ];
}

async function loadSeh(question, extras = {}) {
  return loadSehOperationStatusForChat(null, extras.plantaId || 1, {
    body: { planta_nombre: extras.plant || "Acapulco" },
    dashboardAuth: extras.auth || { role: "ZP" },
  }, {
    question,
    now: NOW,
    items: extras.items || sehItems(),
    plant_label: extras.plant || "Acapulco",
    priorSpec: extras.priorSpec || null,
  });
}

async function loadFolio(question, extras = {}) {
  return loadFolioSearchForChat(null, extras.plantaId || 1, {
    body: {},
    dashboardAuth: extras.auth || { role: "ZP" },
  }, {
    question,
    now: NOW,
    folioItems: extras.items || folioItems(),
    inheritedFilters: extras.inheritedFilters || null,
  });
}

describe("FIX SEH follow-up 30/30", () => {
  it("hereda ALL_EXTINGUISHERS + Acapulco en las 30 frases", async () => {
    const prior = (await loadSeh("¿Cuántos extintores tenemos en Acapulco?")).spec;
    assert.equal(prior.scope, SCOPES.ALL_EXTINGUISHERS);
    SEH_30.forEach((q) => {
      assert.equal(isSehFollowUp(q), true, `follow ${q}`);
      assert.equal(isSehOperationStatusQuestion(q, prior), true, `isSeh ${q}`);
      if (/\bextintor/.test(q.replace(/ó/g, "o"))) {
        assert.equal(planDirectorIaQuestion(q).intent, "seh_operation_status", `plan ${q}`);
      }
      const spec = extractSehSpec(q, prior);
      assert.equal(spec.ok, true, q);
      assert.equal(spec.scope, SCOPES.ALL_EXTINGUISHERS, `scope ${q}`);
      assert.equal(spec.metric, METRICS.EXPIRED, `metric ${q}`);
    });
    const ans = await loadSeh(SEH_30[0], { priorSpec: prior });
    assert.match(buildSehAnswer(ans), /vencid/i);
    assert.match(buildSehAnswer(ans), /2026-08-01/);
    assert.doesNotMatch(buildSehAnswer(ans), /No pude determinar la consulta SEH/);
  });

  it("follow-ups secundarios y no hereda dominio incompatible", async () => {
    const first = await loadSeh("¿Cuántos extintores tenemos en Acapulco?");
    const expired = await loadSeh("¿Cuál extintor está vencido?", { priorSpec: first.spec });
    const where = await loadSeh("¿Dónde está?", { priorSpec: expired.spec });
    assert.equal(where.spec.metric, METRICS.LOCATION);
    assert.match(buildSehAnswer(where), /PIE DE LA CUESTA/i);
    const when = await loadSeh("¿Cuándo venció?", { priorSpec: where.spec });
    assert.equal(when.spec.metric, METRICS.EXPIRATION_DATE);
    assert.match(buildSehAnswer(when), /2026-08-01/);
    const other = await loadSeh("¿Hay otro vencido?", { priorSpec: expired.spec });
    assert.equal(other.spec.metric, METRICS.EXPIRED);
    const next = await loadSeh("¿Cuál vence primero?", { priorSpec: first.spec });
    assert.equal(next.spec.metric, METRICS.NEXT_EXPIRATION);
    const nextVig = await loadSeh("¿Cuál vence primero de los vigentes?", { priorSpec: first.spec });
    assert.equal(nextVig.spec.focus_status, "VIGENTE");
    assert.match(buildSehAnswer(nextVig), /2026-11-01|2026-12-01|2026-12-31/);
    assert.equal(isSehOperationStatusQuestion("¿Existe un folio de extintores?", first.spec), false);
    assert.equal(isSehFollowUp("¿Existe un folio de extintores?"), false);
  });
});

describe("FIX folio existence 30/30", () => {
  it("clasifica las 30 frases existenciales sin pedir mes", async () => {
    FOLIO_30.forEach((q) => {
      assert.equal(isFolioExistenceQuestion(q), true, `exist ${q} concept=${extractFolioSearchFilters(q).concept_query}`);
      assert.equal(isFolioSearchQuestion(q), true, `search ${q}`);
      assert.equal(planDirectorIaQuestion(q).intent, "folio_search", `plan ${q}`);
      assert.equal(extractFolioSearchFilters(q).period_mode, "ANY", `period ${q}`);
      assert.equal(extractFolioSearchFilters(q).period_month, null, `month ${q}`);
    });
  });

  it("responde existencia y conceptos libres", async () => {
    const found = await loadFolio("¿Existe un folio de extintores?");
    const answer = buildFolioSearchAnswer(found);
    assert.doesNotMatch(answer, /Indica el mes/);
    assert.match(answer, /relacionados con extintores/);
    assert.match(answer, /2 folio/);
    const missing = await loadFolio("¿Existe un folio de tornillos?");
    assert.match(buildFolioSearchAnswer(missing), /No encontré folios relacionados con tornillos/);
    for (const [q, term] of [
      ["¿Existe un folio de aceite?", "aceite"],
      ["¿Hay algún folio de llantas?", "llantas"],
      ["¿Tenemos folios de baterías?", "baterias"],
      ["¿Existe un folio de pintura?", "pintura"],
      ["¿Hay folios de uniformes?", "uniformes"],
      ["¿Tenemos algún folio de válvulas?", "valvulas"],
    ]) {
      const payload = await loadFolio(q);
      assert.match(buildFolioSearchAnswer(payload), new RegExp(`relacionados con ${term}`));
      assert.doesNotMatch(buildFolioSearchAnswer(payload), /Indica el mes/);
    }
  });

  it("continuidad del concepto extintores", async () => {
    const first = await loadFolio("¿Existe un folio de extintores?");
    const spec = first.filters;
    const count = await loadFolio("¿Cuántos hay?", { inheritedFilters: spec });
    assert.match(buildFolioSearchAnswer(count), /2 folio/);
    const latest = await loadFolio("¿Cuál fue el más reciente?", { inheritedFilters: spec });
    assert.match(buildFolioSearchAnswer(latest), /F-2|2026-03/);
    const paid = await loadFolio("¿Cuáles están pagados?", { inheritedFilters: spec });
    assert.match(buildFolioSearchAnswer(paid), /1 folio/);
    const sum = await loadFolio("¿Cuánto suman?", { inheritedFilters: spec });
    assert.match(buildFolioSearchAnswer(sum), /700|relacionados con extintores/);
    assert.match(buildFolioSearchAnswer(sum), /no necesariamente al gasto exclusivo/);
  });
});

describe("precedencia SEH / Folios / Expense", () => {
  it("no colisiona", () => {
    assert.equal(planDirectorIaQuestion("¿Cuál extintor está vencido?").intent, "seh_operation_status");
    assert.equal(planDirectorIaQuestion("¿Existe un folio de extintores?").intent, "folio_search");
    assert.equal(planDirectorIaQuestion("¿Cuánto gastamos en extintores?").intent, "expense_analytics");
    assert.equal(isExpenseAnalyticsQuestion("¿Cuánto gastamos en extintores?"), true);
    assert.equal(isSehOperationStatusQuestion("¿Cuánto gastamos en extintores?"), false);
    assert.equal(isFolioExistenceQuestion("¿Cuánto gastamos en extintores?"), false);
  });
});

describe("e2e chat + regresiones", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({ pool: null, sehItems: null, folioItems: null, now: undefined });
  });

  it("chat hereda vencido y existencia de folio", async () => {
    configureDirectorIaChat({ sehItems: sehItems(), folioItems: folioItems(), now: NOW });
    const first = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuántos extintores tenemos en Acapulco?"
    );
    const second = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: first.context_meta.conversation_state,
        },
        dashboardAuth: { role: "ZP" },
      },
      1,
      "¿Cuál extintor está vencido?"
    );
    assert.doesNotMatch(second.answer, /No pude determinar la consulta SEH/);
    assert.match(second.answer, /vencid/i);
    const folioFirst = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Existe un folio de extintores?"
    );
    assert.doesNotMatch(folioFirst.answer, /Indica el mes/);
    assert.match(folioFirst.answer, /relacionados con extintores/);
    const folioCount = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: folioFirst.context_meta.conversation_state,
        },
        dashboardAuth: { role: "ZP" },
      },
      1,
      "¿Cuántos hay?"
    );
    assert.match(folioCount.answer, /extintores/);
  });

  it("regresión EXECUTIVE_STATUS / DIAGNOSIS / Expense / smalltalk", () => {
    assert.equal(isExecutiveStatusQuestion("¿Cómo vamos?"), true);
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos?").intent, "seh_operation_status");
    assert.equal(isDiagnosisObservationRiskQuestion("qué está fallando"), true);
    assert.equal(isExpenseAnalyticsQuestion("¿Cuánto gasté en Taller en agosto?"), true);
    assert.equal(planDirectorIaQuestion("hola").intent, "smalltalk");
    assert.equal(detectDirectorIaIntent("hola").intent, "smalltalk");
  });
});
