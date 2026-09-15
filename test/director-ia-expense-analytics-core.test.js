"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { isClientProfileQuestion } = require("../lib/director-ia-client-profile");
const {
  isFolioSearchQuestion,
  loadFolioSearchForChat,
} = require("../lib/director-ia-folio-search");
const {
  isExpenseAnalyticsQuestion,
  extractExpenseAnalyticsSpec,
  loadExpenseAnalyticsForChat,
  buildExpenseAnalyticsAnswer,
  CLASSIFICATIONS,
  METRICS,
  DOMAINS,
  SEMANTIC_LABELS,
} = require("../lib/director-ia-expense-analytics");
const {
  isExecutiveStatusQuestion,
  isDiagnosisObservationRiskQuestion,
} = require("../lib/director-ia-conversational-executive-layer");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-15T12:00:00-06:00");

const Q = Object.freeze({
  TALLER_SUM_AGO: "¿Cuánto gasté en Taller en agosto?",
  TALLER_SUM_RANGE: "¿Cuánto gasté en Taller de enero a agosto?",
  TALLER_COUNT: "¿Cuántos folios de Taller hubo en agosto?",
  TALLER_AVG: "¿Cuál fue el promedio por folio de Taller en agosto?",
  TALLER_MAX: "¿Cuál fue el folio de Taller más caro en agosto?",
  TALLER_PAGADOS: "¿Cuánto gasté solo en folios PAGADOS de Taller en agosto?",
  APOYOS_TALLER: "¿Cuánto gasté en apoyos de taller en enero?",
  LLANTAS_FOLIOS: "¿Cuánto suman los folios que contienen llantas en enero?",
  LLANTAS_EXACT: "¿Cuánto gasté exactamente en llantas?",
  REFACCIONES_EXACT: "¿Cuánto gasté en refacciones en enero?",
  GASTOS_SUM: "¿Cuánto gasté en Gastos en agosto?",
  INVERSIONES_SUM: "¿Cuánto gasté en Inversiones en agosto?",
  CLIENT: "¿Cuánto compró Arturo en agosto?",
  FOLIO_SEARCH: "qué folios tenemos en septiembre de llantas?",
  GREETING: "hola",
  EXEC_STATUS: "¿Cómo vamos?",
  DIAGNOSIS: "qué está fallando en la planta",
});

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-08",
    importe: 1000,
    estatus: "AUTORIZADO",
    categoria: "TALLER",
    subcategoria: null,
    concepto: "servicio taller",
    beneficiario: "Taller Central",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function fixtureRows() {
  return [
    row({ id: 1, numero_folio: "F-AGO-1", importe: 1000, estatus: "PAGADO", concepto: "servicio taller" }),
    row({ id: 2, numero_folio: "F-AGO-2", importe: 3000, estatus: "AUTORIZADO", concepto: "apoyos de taller" }),
    row({ id: 3, numero_folio: "F-AGO-3", importe: 500, estatus: "CANCELADO", concepto: "taller cancelado" }),
    row({ id: 4, numero_folio: "F-AGO-4", importe: 2000, estatus: "PAGADO", concepto: "cambio de llantas" }),
    row({
      id: 5,
      numero_folio: "F-ENE-5",
      mes_cargo: "2026-01",
      importe: 4000,
      estatus: "PAGADO",
      concepto: "apoyos de unidad",
    }),
    row({
      id: 6,
      numero_folio: "F-ENE-6",
      mes_cargo: "2026-01",
      importe: 1500,
      estatus: "AUTORIZADO",
      concepto: "refacciones y llantas",
    }),
    row({
      id: 7,
      numero_folio: "F-GAS-7",
      categoria: "GASTOS",
      importe: 800,
      estatus: "PAGADO",
      concepto: "papeleria",
    }),
    row({
      id: 8,
      numero_folio: "F-INV-8",
      categoria: "INVERSIONES",
      importe: 10000,
      estatus: "PAGADO",
      concepto: "equipo",
    }),
    row({
      id: 9,
      numero_folio: "F-P2-9",
      planta_id: 2,
      importe: 99999,
      concepto: "taller otra planta",
    }),
    row({
      id: 10,
      numero_folio: "F-SEP-10",
      mes_cargo: "2026-09",
      importe: 50,
      concepto: "taller septiembre",
    }),
    row({
      id: 11,
      numero_folio: "F-ENE-11",
      mes_cargo: "2026-01",
      categoria: "GASTOS",
      importe: 250,
      concepto: "compra de llantas",
    }),
  ];
}

function inject(question, extras = {}) {
  const rows = extras.rows || fixtureRows();
  return {
    now: extras.now || NOW,
    question,
    auth: extras.auth || { role: "ZP" },
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    queryPublicFolios:
      extras.queryPublicFolios ||
      (async (_c, plantaId, mesCargo) =>
        rows.filter(
          (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
        )),
  };
}

async function load(question, extras = {}) {
  return loadExpenseAnalyticsForChat(null, extras.plantaId || 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(question, extras));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001 descomposición", () => {
  it("1. Taller + SUM + agosto no es cliente y dispara SUM", () => {
    const spec = extractExpenseAnalyticsSpec(Q.TALLER_SUM_AGO, { now: NOW });
    assert.equal(spec.ok, true);
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.period_month, "2026-08");
    assert.equal(spec.keyword, null);
    assert.equal(spec.semantic_label, SEMANTIC_LABELS.CATEGORY_SUM);
    assert.equal(detectDirectorIaIntent(Q.TALLER_SUM_AGO).intent, "expense_analytics");
    assert.equal(planDirectorIaQuestion(Q.TALLER_SUM_AGO).intent, "expense_analytics");
    assert.equal(isClientProfileQuestion(Q.TALLER_SUM_AGO), true);
  });

  it("2. Taller + SUM + rango enero-agosto", () => {
    const spec = extractExpenseAnalyticsSpec(Q.TALLER_SUM_RANGE, { now: NOW });
    assert.equal(spec.ok, true);
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.period_mode, "RANGE");
    assert.equal(spec.period_start, "2026-01");
    assert.equal(spec.period_end, "2026-08");
    assert.deepEqual(spec.months, ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
    assert.equal(extractExpenseAnalyticsSpec("¿Cuánto gasté en Taller enero a agosto?", { now: NOW }).period_start, "2026-01");
  });

  it("3-5. COUNT / AVG / MAX de Taller", () => {
    assert.equal(extractExpenseAnalyticsSpec(Q.TALLER_COUNT, { now: NOW }).metric, METRICS.COUNT);
    assert.equal(extractExpenseAnalyticsSpec(Q.TALLER_AVG, { now: NOW }).metric, METRICS.AVG);
    assert.equal(extractExpenseAnalyticsSpec(Q.TALLER_MAX, { now: NOW }).metric, METRICS.MAX);
  });

  it("6. PAGADOS se extrae como estatus", () => {
    const spec = extractExpenseAnalyticsSpec(Q.TALLER_PAGADOS, { now: NOW });
    assert.equal(spec.status, "PAGADO");
    assert.equal(spec.metric, METRICS.SUM);
  });

  it("7. apoyos de taller se separa en categoría + keyword", () => {
    const spec = extractExpenseAnalyticsSpec(Q.APOYOS_TALLER, { now: NOW });
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.period_month, "2026-01");
    assert.equal(spec.keyword, "apoyos");
    assert.notEqual(spec.keyword, "apoyos de taller");
  });

  it("8. llantas + folios coincidentes es TOTAL_FOLIOS_MATCHING_KEYWORD", () => {
    const spec = extractExpenseAnalyticsSpec(Q.LLANTAS_FOLIOS, { now: NOW });
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.keyword, "llantas");
    assert.equal(spec.semantic_label, SEMANTIC_LABELS.TOTAL_FOLIOS_MATCHING_KEYWORD);
    assert.equal(spec.classification, CLASSIFICATIONS.KEYWORD_MATCH_ONLY);
  });

  it("9-10. llantas/refacciones exactos fallan cerrado", () => {
    const llantas = extractExpenseAnalyticsSpec(Q.LLANTAS_EXACT, { now: NOW });
    assert.equal(llantas.metric, METRICS.ATTRIBUTABLE_COMPONENT_COST);
    assert.equal(llantas.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    const refacciones = extractExpenseAnalyticsSpec(Q.REFACCIONES_EXACT, { now: NOW });
    assert.equal(refacciones.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    assert.equal(refacciones.keyword, "refacciones");
  });
});

describe("IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001 agregaciones", () => {
  it("1. Taller SUM agosto", async () => {
    const payload = await load(Q.TALLER_SUM_AGO);
    assert.equal(payload.ok, true);
    assert.equal(payload.analysis.sum, 6000);
    assert.match(buildExpenseAnalyticsAnswer(payload), /categoría Taller suman \$6,000\.00 MXN/);
    assert.equal(payload.records.every((r) => r.planta_id === 1), true);
    assert.equal(payload.records.every((r) => r.mes_cargo === "2026-08"), true);
  });

  it("2. Taller SUM enero-agosto no cruza septiembre", async () => {
    const payload = await load(Q.TALLER_SUM_RANGE);
    assert.equal(payload.analysis.sum, 11500);
    assert.equal(payload.records.some((r) => r.mes_cargo === "2026-09"), false);
  });

  it("3. Taller COUNT agosto", async () => {
    const payload = await load(Q.TALLER_COUNT);
    assert.equal(payload.analysis.eligible_count, 3);
    assert.match(buildExpenseAnalyticsAnswer(payload), /fueron 3/);
  });

  it("4. Taller AVG agosto", async () => {
    const payload = await load(Q.TALLER_AVG);
    assert.equal(payload.analysis.avg, 2000);
  });

  it("5. Taller MAX agosto", async () => {
    const payload = await load(Q.TALLER_MAX);
    assert.equal(payload.analysis.max.amount, 3000);
    assert.equal(payload.analysis.max.row.numero_folio, "F-AGO-2");
  });

  it("6. Taller PAGADOS agosto", async () => {
    const payload = await load(Q.TALLER_PAGADOS);
    assert.equal(payload.analysis.sum, 3000);
    assert.equal(payload.records.every((r) => r.estatus === "PAGADO"), true);
  });

  it("7. apoyos + Taller + enero", async () => {
    const payload = await load(Q.APOYOS_TALLER);
    assert.equal(payload.spec.domain, DOMAINS.TALLER);
    assert.equal(payload.spec.keyword, "apoyos");
    assert.equal(payload.analysis.sum, 4000);
    assert.equal(payload.records.every((r) => /apoyos/i.test(r.concepto)), true);
  });

  it("8. llantas SUM de folios coincidentes + limitación", async () => {
    const payload = await load(Q.LLANTAS_FOLIOS);
    assert.equal(payload.analysis.sum, 1750);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /Los folios coincidentes suman \$1,750\.00 MXN/);
    assert.match(answer, /importes completos de los folios coincidentes/);
    assert.match(answer, /no necesariamente al gasto exclusivo en llantas/);
  });

  it("9. llantas exacto → BREAKDOWN_MISSING", async () => {
    const payload = await load(Q.LLANTAS_EXACT);
    assert.equal(payload.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /exclusivamente a llantas/);
    assert.match(answer, /no tiene desglose atribuible usable/);
    assert.equal(payload.analysis, null);
  });

  it("10. refacciones exacto → BREAKDOWN_MISSING", async () => {
    const payload = await load(Q.REFACCIONES_EXACT);
    assert.equal(payload.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    assert.match(buildExpenseAnalyticsAnswer(payload), /exclusivamente a refacciones/);
  });

  it("11. Gastos SUM agosto", async () => {
    const payload = await load(Q.GASTOS_SUM);
    assert.equal(payload.spec.domain, DOMAINS.GASTOS);
    assert.equal(payload.analysis.sum, 800);
  });

  it("12. Inversiones SUM agosto", async () => {
    const payload = await load(Q.INVERSIONES_SUM);
    assert.equal(payload.spec.domain, DOMAINS.INVERSIONES);
    assert.equal(payload.analysis.sum, 10000);
  });

  it("16. no cruza planta", async () => {
    const payload = await load(Q.TALLER_SUM_AGO);
    assert.equal(payload.records.some((r) => Number(r.planta_id) === 2), false);
    assert.equal(payload.analysis.sum, 6000);
  });

  it("17. no cruza periodo", async () => {
    const payload = await load(Q.TALLER_SUM_AGO);
    assert.equal(payload.records.some((r) => r.mes_cargo !== "2026-08"), false);
    assert.equal(payload.records.some((r) => r.id === 10), false);
  });
});

describe("IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001 protecciones", () => {
  it("13. Taller en gasto no cae a client_profile en el planner", () => {
    assert.equal(planDirectorIaQuestion(Q.TALLER_SUM_AGO).intent, "expense_analytics");
    assert.notEqual(planDirectorIaQuestion(Q.TALLER_SUM_AGO).intent, "client_profile");
  });

  it("14. cliente real sigue funcionando", () => {
    assert.equal(isClientProfileQuestion(Q.CLIENT), true);
    assert.equal(planDirectorIaQuestion(Q.CLIENT).intent, "client_profile");
    assert.equal(isExpenseAnalyticsQuestion(Q.CLIENT), false);
  });

  it("15. folio_search sigue funcionando", async () => {
    assert.equal(isFolioSearchQuestion(Q.FOLIO_SEARCH), true);
    assert.equal(planDirectorIaQuestion(Q.FOLIO_SEARCH).intent, "folio_search");
    assert.equal(isExpenseAnalyticsQuestion(Q.FOLIO_SEARCH), false);
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(Q.FOLIO_SEARCH, {
      rows: [
        row({
          id: 20,
          numero_folio: "F-SEP-LL",
          mes_cargo: "2026-09",
          categoria: "GASTOS",
          concepto: "Compra de llantas",
          importe: 4200,
        }),
      ],
    }));
    assert.equal(payload.ok, true);
    assert.equal(payload.count >= 1, true);
  });

  it("18. EXECUTIVE_STATUS sin regresión", () => {
    assert.equal(isExpenseAnalyticsQuestion(Q.EXEC_STATUS), false);
    assert.notEqual(planDirectorIaQuestion(Q.EXEC_STATUS).intent, "expense_analytics");
    assert.equal(isExecutiveStatusQuestion(Q.EXEC_STATUS), true);
  });

  it("19. DIAGNOSIS sin regresión", () => {
    assert.equal(isExpenseAnalyticsQuestion(Q.DIAGNOSIS), false);
    assert.notEqual(planDirectorIaQuestion(Q.DIAGNOSIS).intent, "expense_analytics");
    assert.equal(typeof isDiagnosisObservationRiskQuestion, "function");
    assert.equal(isDiagnosisObservationRiskQuestion(Q.DIAGNOSIS), true);
  });

  it("20. greeting sin regresión", () => {
    assert.equal(isExpenseAnalyticsQuestion(Q.GREETING), false);
    assert.equal(planDirectorIaQuestion(Q.GREETING).intent, "smalltalk");
  });

  it("no usa detalle_lineas ni prorratea", () => {
    const src = read("lib/director-ia-expense-analytics.js");
    assert.equal(src.includes("detalle_lineas"), false);
    assert.equal(/\bprorrat/.test(src), false);
    assert.match(src, /queryReviewableSupportFolios/);
    assert.match(read("lib/director-ia-planner.js"), /expense_analytics/);
    assert.match(read("lib/director-ia-chat.js"), /expense_analytics in-process/);
  });
});
