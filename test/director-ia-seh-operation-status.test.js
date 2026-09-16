"use strict";

const { describe, it, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  SOURCE_TABLE,
  SOURCE_ENDPOINT,
  SEH_SELECT_SQL,
  SCOPES,
  METRICS,
  EXPIRATION,
  classifyExpiration,
  distinctAssets,
  entityMatches,
  extractSehSpec,
  isSehOperationStatusQuestion,
  analyze,
  loadSehOperationStatusForChat,
  buildSehAnswer,
} = require("../lib/director-ia-seh-operation-status");
const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const {
  isExecutiveStatusQuestion,
  isDiagnosisObservationRiskQuestion,
} = require("../lib/director-ia-conversational-executive-layer");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-16T12:00:00-06:00");

const PLANT = Object.freeze({
  COUNT: [
    "¿Cuántas estaciones tenemos en Acapulco?",
    "¿Cuántas estaciones de carburación hay en Acapulco?",
    "Dime el número de estaciones que tenemos en Acapulco",
    "¿Cuáles son nuestras estaciones de Acapulco?",
    "¿Cómo están los extintores de las estaciones de Acapulco?",
    "¿Están vigentes los extintores de las estaciones en Acapulco?",
    "¿Tenemos algún extintor vencido en las estaciones de Acapulco?",
    "¿Qué extintores de estaciones están por vencer en Acapulco?",
    "¿Cuántas pipas tenemos en Acapulco?",
    "¿Cuántos autotanques tenemos en Acapulco?",
    "Dime cuántas unidades de autotanque hay en Acapulco",
    "¿Cuáles son las pipas de Acapulco?",
    "¿Cómo están los extintores de los autotanques de Acapulco?",
    "¿Están vigentes todos los extintores de las pipas de Acapulco?",
    "¿Hay alguna pipa con extintor vencido en Acapulco?",
    "¿Qué extintores de los autotanques vencen pronto?",
    "¿Cómo están los extintores de la planta de Acapulco?",
    "¿Cuál es el estatus del sistema contra incendio de Acapulco?",
    "¿Están vigentes los extintores de Acapulco?",
    "Dame el estatus de seguridad contra incendio de Acapulco",
  ],
  LOCATION: [
    "¿Cuántos extintores tenemos en Pie de la Cuesta?",
    "¿Cuántos extintores hay en Pie de la Cuesta?",
    "Dime cuántos extintores tiene Pie de la Cuesta",
    "¿Cuál es el total de extintores en Pie de la Cuesta?",
    "¿Cuántos equipos extintores están registrados en Pie de la Cuesta?",
    "¿Cuántos extintores aparecen para Pie de la Cuesta?",
    "¿Qué cantidad de extintores tiene la estación Pie de la Cuesta?",
    "¿Cuántos extintores tiene la estación de Pie de la Cuesta?",
    "¿Cuál es el estatus de los extintores de Pie de la Cuesta?",
    "¿Cómo están los extintores de Pie de la Cuesta?",
    "¿Están vigentes los extintores de Pie de la Cuesta?",
    "¿Todos los extintores de Pie de la Cuesta están vigentes?",
    "¿Hay extintores vencidos en Pie de la Cuesta?",
    "¿Tenemos algún extintor por vencer en Pie de la Cuesta?",
    "¿Qué extintores están vencidos en Pie de la Cuesta?",
    "¿Qué extintores vencen pronto en Pie de la Cuesta?",
    "Dame el estado de los extintores de Pie de la Cuesta",
    "Revísame los extintores de Pie de la Cuesta",
    "¿Cómo está Pie de la Cuesta en tema de extintores?",
    "¿Cuántos extintores tiene Pie de la Cuesta y cuál es su estatus?",
  ],
});

function row(over = {}) {
  return {
    id: over.id || 1,
    planta_id: over.planta_id || 1,
    categoria: over.categoria || "ESTACIONES",
    locacion: over.locacion || "",
    descripcion: over.descripcion || "",
    componente: over.componente == null ? "EXTINTOR" : over.componente,
    nombre: over.nombre || "",
    vence: Object.prototype.hasOwnProperty.call(over, "vence") ? over.vence : "2026-12-31",
    sort_order: over.sort_order || 0,
  };
}

function fixtureItems() {
  const pie = [
    row({ id: 1, locacion: "PIE DE LA CUESTA", descripcion: "E1", vence: "2026-12-31" }),
    row({ id: 2, locacion: "PIE DE LA CUESTA", descripcion: "E2", vence: "2026-09-30" }),
    row({ id: 3, locacion: "PIE DE LA CUESTA", descripcion: "E3", vence: "2026-08-01" }),
    row({ id: 4, locacion: "PIE DE LA CUESTA", descripcion: "E4", vence: null }),
    row({ id: 5, locacion: "Pie de la Cuesta", descripcion: "E5", vence: "2026-12-15" }),
    row({ id: 6, locacion: "PIE DE LA CUESTA", descripcion: "E6", vence: "2026-11-01" }),
  ];
  return [
    ...pie,
    row({ id: 7, locacion: "COSTERA", descripcion: "C1", vence: "2026-12-01" }),
    row({
      id: 8,
      categoria: "PIPAS",
      locacion: "AUTOTANQUE ECO 39",
      descripcion: "P1",
      vence: "2026-12-31",
    }),
    row({
      id: 9,
      categoria: "PIPAS",
      locacion: "AUTOTANQUE ECO 39",
      descripcion: "P2",
      vence: "2026-08-15",
    }),
    row({
      id: 10,
      categoria: "PIPAS",
      locacion: "AUTOTANQUE ECO 39",
      descripcion: "P3",
      vence: "2026-10-01",
    }),
    row({
      id: 11,
      categoria: "PIPAS",
      locacion: "AUTOTANQUE ECO 12",
      descripcion: "Q1",
      vence: "2026-12-01",
    }),
    row({
      id: 12,
      categoria: "PLANTA",
      locacion: "CUARTO DE CONTROL",
      descripcion: "C1",
      vence: "2026-12-31",
    }),
    row({
      id: 13,
      categoria: "PLANTA",
      locacion: "Cuarto de control",
      descripcion: "C2",
      vence: "2026-09-20",
    }),
    row({
      id: 14,
      categoria: "SISTEMA CONTRA INCENDIO",
      nombre: "Red húmeda",
      vence: "2026-12-31",
    }),
    row({
      id: 15,
      categoria: "SISTEMA CONTRA INCENDIO",
      nombre: "Hidrante norte",
      vence: null,
    }),
  ];
}

async function load(question, extras = {}) {
  return loadSehOperationStatusForChat(null, extras.plantaId || 1, {
    body: { planta_nombre: extras.plant || "Acapulco" },
    dashboardAuth: extras.auth || { role: "ZP" },
  }, {
    question,
    now: extras.now || NOW,
    items: extras.items || fixtureItems(),
    plant_label: extras.plant || "Acapulco",
    priorSpec: extras.priorSpec || null,
  });
}

describe("SEH source contract", () => {
  it("usa public.seh_equipos y GET /api/seh, sin HTML", () => {
    assert.equal(SOURCE_TABLE, "public.seh_equipos");
    assert.equal(SOURCE_ENDPOINT, "GET /api/seh");
    assert.match(SEH_SELECT_SQL, /FROM public\.seh_equipos/);
    assert.match(SEH_SELECT_SQL, /WHERE planta_id = \$1/);
    const src = fs.readFileSync(path.join(ROOT, "lib/director-ia-seh-operation-status.js"), "utf8");
    assert.equal(src.includes("cheerio"), false);
    assert.equal(src.includes("jsdom"), false);
    assert.equal(src.includes("querySelector"), false);
    assert.equal(src.includes("INSERT INTO public.seh"), false);
    assert.doesNotMatch(src, /app\.put\("\/api\/seh"/);
  });
});

describe("SEH vigencia", () => {
  it("regla visual >30 / 0-30 / <hoy / nula", () => {
    assert.equal(classifyExpiration("2026-12-31", NOW), EXPIRATION.VIGENTE);
    assert.equal(classifyExpiration("2026-09-16", NOW), EXPIRATION.POR_VENCER);
    assert.equal(classifyExpiration("2026-10-16", NOW), EXPIRATION.POR_VENCER);
    assert.equal(classifyExpiration("2026-09-15", NOW), EXPIRATION.VENCIDO);
    assert.equal(classifyExpiration(null, NOW), EXPIRATION.SIN_FECHA);
    assert.equal(classifyExpiration("no-date", NOW), EXPIRATION.SIN_FECHA);
    assert.notEqual(classifyExpiration(null, NOW), EXPIRATION.VIGENTE);
  });
});

describe("SEH estaciones vs extintores", () => {
  it("6 renglones de la misma locación = 1 estación y 6 extintores", () => {
    const items = fixtureItems();
    const spec = { scope: SCOPES.STATION, metric: METRICS.COUNT, entity: null };
    const a = analyze(items, spec, NOW);
    assert.equal(a.countAssets, 2);
    const pie = analyze(items, { scope: SCOPES.STATION, metric: METRICS.COUNT, entity: "pie de la cuesta" }, NOW);
    assert.equal(pie.countAssets, 1);
    assert.equal(pie.countExtinguishers, 6);
    assert.equal(distinctAssets(pie.scoped).length, 1);
  });

  it("misma pipa repetida = 1 autotanque y N extintores", () => {
    const eco = analyze(fixtureItems(), { scope: SCOPES.AUTOTANK, metric: METRICS.COUNT, entity: "eco 39" }, NOW);
    assert.equal(eco.countAssets, 1);
    assert.equal(eco.countExtinguishers, 3);
  });
});

describe("SEH entity resolution", () => {
  it("Pie de la Cuesta / ECO 39 / cuarto de control, acentos, no fuzzy", () => {
    const items = fixtureItems();
    assert.equal(entityMatches(items[0], "pie de la cuesta"), true);
    assert.equal(entityMatches(items[0], "PIÉ DE LA CUESTA"), true);
    assert.equal(entityMatches(items[8], "eco 39"), true);
    assert.equal(entityMatches(items[11], "cuarto de control"), true);
    assert.equal(entityMatches(items[0], "cuesta"), false);
    assert.equal(entityMatches(items[0], "pie"), false);
    assert.equal(entityMatches(items[7], "eco 12"), false);
  });
});

describe("SEH battery plant-level 20/20", () => {
  const expected = [
    SCOPES.STATION, SCOPES.STATION, SCOPES.STATION, SCOPES.STATION,
    SCOPES.STATION, SCOPES.STATION, SCOPES.STATION, SCOPES.STATION,
    SCOPES.AUTOTANK, SCOPES.AUTOTANK, SCOPES.AUTOTANK, SCOPES.AUTOTANK,
    SCOPES.AUTOTANK, SCOPES.AUTOTANK, SCOPES.AUTOTANK, SCOPES.AUTOTANK,
    SCOPES.PLANT, SCOPES.FIRE_SYSTEM, SCOPES.ALL_EXTINGUISHERS, SCOPES.ALL_SEH,
  ];
  const metrics = [
    METRICS.COUNT, METRICS.COUNT, METRICS.COUNT, METRICS.LIST,
    METRICS.STATUS, METRICS.STATUS, METRICS.EXPIRED, METRICS.EXPIRING_SOON,
    METRICS.COUNT, METRICS.COUNT, METRICS.COUNT, METRICS.LIST,
    METRICS.STATUS, METRICS.STATUS, METRICS.EXPIRED, METRICS.EXPIRING_SOON,
    METRICS.STATUS, METRICS.STATUS, METRICS.STATUS, METRICS.STATUS,
  ];
  it("clasifica las 20 frases de planta", () => {
    PLANT.COUNT.forEach((q, i) => {
      assert.equal(isSehOperationStatusQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "seh_operation_status", q);
      const spec = extractSehSpec(q);
      assert.equal(spec.scope, expected[i], `${i + 1} ${q} scope=${spec.scope}`);
      assert.equal(spec.metric, metrics[i], `${i + 1} ${q} metric=${spec.metric}`);
    });
  });
});

describe("SEH battery location-specific 20/20", () => {
  it("clasifica las 20 frases de Pie de la Cuesta", () => {
    PLANT.LOCATION.forEach((q, i) => {
      assert.equal(isSehOperationStatusQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "seh_operation_status", q);
      const spec = extractSehSpec(q);
      assert.equal(spec.scope, SCOPES.STATION, q);
      assert.ok(spec.entity && spec.entity.includes("pie"), `${q} entity=${spec.entity}`);
      if (i < 8) assert.equal(spec.metric, i === 7 ? METRICS.COUNT : METRICS.COUNT, q);
    });
  });
});

describe("SEH answers", () => {
  it("COUNT estaciones y extintores de Pie de la Cuesta", async () => {
    const stations = await load("¿Cuántas estaciones tenemos en Acapulco?");
    assert.match(buildSehAnswer(stations), /2 estaciones/);
    const pie = await load("¿Cuántos extintores tenemos en Pie de la Cuesta?");
    assert.match(buildSehAnswer(pie), /6 extintores/);
    assert.equal(pie.analysis.tallies.VIGENTE, 3);
    assert.equal(pie.analysis.tallies.POR_VENCER, 1);
    assert.equal(pie.analysis.tallies.VENCIDO, 1);
    assert.equal(pie.analysis.tallies.SIN_FECHA, 1);
  });

  it("ALL_EXTINGUISHERS agrega estación+pipa+planta y no SCI", async () => {
    const payload = await load("¿Están vigentes los extintores de Acapulco?");
    assert.equal(payload.spec.scope, SCOPES.ALL_EXTINGUISHERS);
    assert.equal(payload.analysis.countExtinguishers, 13);
    assert.doesNotMatch(buildSehAnswer(payload), /Red húmeda/);
  });

  it("sistema contra incendio reporta sin fecha", async () => {
    const payload = await load("¿Tenemos algún equipo del sistema contra incendio sin fecha?");
    assert.equal(payload.spec.scope, SCOPES.FIRE_SYSTEM);
    assert.match(buildSehAnswer(payload), /Hidrante norte/);
  });

  it("ECO 39 y cuarto de control", async () => {
    const eco = await load("¿Cuántos extintores tiene el autotanque ECO 39?");
    assert.equal(eco.analysis.countExtinguishers, 3);
    const ecoStatus = await load("¿Están vigentes los del ECO 39?", { priorSpec: eco.spec });
    assert.equal(ecoStatus.spec.scope, SCOPES.AUTOTANK);
    assert.match(String(ecoStatus.spec.entity), /eco 39/);
    const plant = await load("¿Cómo están los extintores del cuarto de control?");
    assert.equal(plant.spec.scope, SCOPES.PLANT);
    assert.equal(plant.analysis.countExtinguishers, 2);
    const next = await load("¿Qué extintor vence primero en la planta?");
    assert.equal(next.spec.metric, METRICS.NEXT_EXPIRATION);
    assert.match(buildSehAnswer(next), /2026-09-20/);
  });

  it("no cruza planta", async () => {
    const denied = await load("¿Cuántas estaciones tenemos en Acapulco?", {
      auth: { role: "GA", plantas_permitidas: [2] },
      plantaId: 1,
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
  });
});

describe("SEH continuidad", () => {
  it("estatus / vencido / vence primero heredan Pie de la Cuesta", async () => {
    const first = await load("¿Cuántos extintores tenemos en Pie de la Cuesta?");
    const prior = first.spec;
    const status = await load("¿Y cuál es su estatus?", { priorSpec: prior });
    assert.equal(status.spec.entity.includes("pie"), true);
    assert.equal(status.spec.scope, SCOPES.STATION);
    assert.match(buildSehAnswer(status), /6 extintores/);
    const expired = await load("¿Hay alguno vencido?", { priorSpec: status.spec });
    assert.equal(expired.spec.metric, METRICS.EXPIRED);
    assert.equal(expired.spec.entity.includes("pie"), true);
    const next = await load("¿Cuál vence primero?", { priorSpec: expired.spec });
    assert.equal(next.spec.metric, METRICS.NEXT_EXPIRATION);
    assert.match(buildSehAnswer(next), /2026-08-01/);
  });
});

describe("SEH chat e2e + regresiones", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  afterEach(() => {
    configureDirectorIaChat({ pool: null, sehItems: null, now: undefined });
  });

  it("askDirectorIa responde Pie de la Cuesta y hereda estatus", async () => {
    configureDirectorIaChat({ sehItems: fixtureItems(), now: NOW });
    const first = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cuántos extintores tenemos en Pie de la Cuesta?"
    );
    assert.match(first.answer, /6 extintores/);
    const second = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: first.context_meta.conversation_state,
        },
        dashboardAuth: { role: "ZP" },
      },
      1,
      "¿Y cuál es su estatus?"
    );
    assert.match(second.answer, /vigentes/);
    assert.doesNotMatch(second.answer, /Estoy en Acapulco/);
  });

  it("regresión EXECUTIVE_STATUS / DIAGNOSIS / Expense / smalltalk", () => {
    assert.equal(isSehOperationStatusQuestion("¿Cómo vamos?"), false);
    assert.equal(isExecutiveStatusQuestion("¿Cómo vamos?"), true);
    assert.notEqual(planDirectorIaQuestion("¿Cómo vamos?").intent, "seh_operation_status");
    assert.equal(isDiagnosisObservationRiskQuestion("qué está fallando"), true);
    assert.equal(isExpenseAnalyticsQuestion("¿Cuánto gasté en Taller en agosto?"), true);
    assert.equal(isSehOperationStatusQuestion("¿cuánto se gastó en extintores en febrero?"), false);
    assert.equal(planDirectorIaQuestion("¿cuánto se gastó en extintores en febrero?").intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion("hola").intent, "smalltalk");
    assert.equal(detectDirectorIaIntent("hola").intent, "smalltalk");
  });
});
