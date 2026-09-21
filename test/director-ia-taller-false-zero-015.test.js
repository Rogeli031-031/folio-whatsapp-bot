"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const {
  extractExpenseAnalyticsSpec,
  loadExpenseAnalyticsForChat,
  buildExpenseAnalyticsAnswer,
  buildExpenseAnalyticsChatResult,
  DOMAINS,
  METRICS,
} = require("../lib/director-ia-expense-analytics");

const NOW = new Date("2026-09-21T14:00:00-06:00");

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
    concepto: "servicio taller",
    beneficiario: "Taller Central",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function fixtureRows() {
  return [
    row({ id: 1, numero_folio: "F-ENE-1", mes_cargo: "2026-01", importe: 4000, concepto: "refacciones y llantas" }),
    row({ id: 2, numero_folio: "F-ENE-2", mes_cargo: "2026-01", importe: 1500, concepto: "servicio taller" }),
    row({ id: 3, numero_folio: "F-AGO-1", mes_cargo: "2026-08", importe: 2200, concepto: "preventivo" }),
    row({ id: 4, numero_folio: "F-SEP-1", mes_cargo: "2026-09", importe: 800, concepto: "llantas" }),
    row({ id: 5, numero_folio: "F-GAS", mes_cargo: "2026-01", categoria: "GASTOS", importe: 250, concepto: "papeleria" }),
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
  return loadExpenseAnalyticsForChat(
    null,
    extras.plantaId || 1,
    { body: {}, dashboardAuth: extras.auth || { role: "ZP" } },
    inject(question, extras)
  );
}

describe("FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015 keyword residual", () => {
  it("A) cuanto he gastado en taller en enero → TALLER SUM 2026-01 keyword null", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto he gastado en taller en enero?", { now: NOW });
    assert.equal(spec.ok, true);
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.period_month, "2026-01");
    assert.equal(spec.keyword, null);
    assert.equal(planDirectorIaQuestion("cuanto he gastado en taller en enero?").intent, "expense_analytics");
  });

  it("B) cuando he gastado + rango → keyword null RANGE 2026-01 a 2026-09", () => {
    const spec = extractExpenseAnalyticsSpec("cuando he gastado en taller? de enero a septiembre", { now: NOW });
    assert.equal(spec.ok, true);
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.metric, METRICS.SUM);
    assert.equal(spec.period_mode, "RANGE");
    assert.equal(spec.period_start, "2026-01");
    assert.equal(spec.period_end, "2026-09");
    assert.equal(spec.keyword, null);
  });

  it("C) cuanto hemos gastado en taller en enero → keyword null", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto hemos gastado en taller en enero?", { now: NOW });
    assert.equal(spec.keyword, null);
    assert.equal(spec.domain, DOMAINS.TALLER);
  });

  it("D) cuanto gastamos en taller en enero → keyword null", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto gastamos en taller en enero?", { now: NOW });
    assert.equal(spec.keyword, null);
    assert.equal(spec.domain, DOMAINS.TALLER);
  });

  it("E) cuanto he gastado en llantas en enero → keyword real", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto he gastado en llantas en enero?", { now: NOW });
    assert.equal(spec.keyword, "llantas");
    assert.notEqual(spec.keyword, "he");
  });

  it("F) cuanto gastamos en herramientas en enero → keyword real", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto gastamos en herramientas en enero?", { now: NOW });
    assert.equal(spec.keyword, "herramientas");
  });

  it("refacciones de taller conserva el concepto real", () => {
    const spec = extractExpenseAnalyticsSpec("cuanto he gastado en refacciones de taller en enero?", { now: NOW });
    assert.equal(spec.domain, DOMAINS.TALLER);
    assert.equal(spec.keyword, "refacciones");
  });

  it("continuidad: periodo only sobre original cuando he gastado", () => {
    const first = extractExpenseAnalyticsSpec("cuando he gastado en taller?", { now: NOW });
    assert.equal(first.ok, false);
    assert.equal(first.code, "missing_period");
    assert.equal(first.domain, DOMAINS.TALLER);
    assert.equal(first.keyword, null);
    const combined = extractExpenseAnalyticsSpec("cuando he gastado en taller? de enero a septiembre", { now: NOW });
    assert.equal(combined.keyword, null);
    assert.equal(combined.period_start, "2026-01");
    assert.equal(combined.period_end, "2026-09");
  });
});

describe("FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015 veracidad de suma", () => {
  it("G) 0 matches → DATA_NOT_FOUND y no $0.00", async () => {
    const payload = await load("cuanto he gastado en taller en enero?", { rows: [] });
    assert.equal(payload.analysis.eligible_count, 0);
    const chat = buildExpenseAnalyticsChatResult(payload, { planta_id: 1 });
    assert.equal(chat.context_meta.veracity, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
    assert.match(chat.answer, /No encontré folios de Taller con esos filtros/);
    assert.doesNotMatch(chat.answer, /\$0\.00/);
    assert.doesNotMatch(chat.answer, /se gastaron cero/i);
  });

  it("H) folios con importe conocido 0 → sí $0.00", async () => {
    const payload = await load("cuanto he gastado en taller en enero?", {
      rows: [row({ id: 20, importe: 0, concepto: "ajuste" })],
    });
    assert.equal(payload.analysis.eligible_count, 1);
    assert.equal(payload.analysis.known_count, 1);
    assert.equal(payload.analysis.sum, 0);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /\$0\.00/);
    assert.doesNotMatch(answer, /No encontré folios/);
  });

  it("I) folios sin importe → no $0.00", async () => {
    const payload = await load("cuanto he gastado en taller en enero?", {
      rows: [row({ id: 21, importe: null, concepto: "pendiente de captura" })],
    });
    assert.equal(payload.analysis.eligible_count, 1);
    assert.equal(payload.analysis.known_count, 0);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /Encontré folios de Taller, pero no tienen importe registrado/);
    assert.doesNotMatch(answer, /\$0\.00/);
  });

  it("J) fixture Taller enero suma correcta y no filtra por he", async () => {
    const payload = await load("cuanto he gastado en taller en enero?");
    assert.equal(payload.spec.keyword, null);
    assert.equal(payload.analysis.sum, 5500);
    assert.equal(payload.analysis.eligible_count, 2);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /\$5,500\.00 MXN/);
    assert.doesNotMatch(answer, /No encontré/);
  });

  it("K) rango enero-septiembre suma todos los meses sin residual", async () => {
    const payload = await load("cuando he gastado en taller? de enero a septiembre");
    assert.equal(payload.spec.keyword, null);
    assert.equal(payload.spec.period_start, "2026-01");
    assert.equal(payload.spec.period_end, "2026-09");
    assert.equal(payload.analysis.sum, 8500);
    assert.equal(payload.records.some((r) => r.mes_cargo === "2026-01"), true);
    assert.equal(payload.records.some((r) => r.mes_cargo === "2026-08"), true);
    assert.equal(payload.records.some((r) => r.mes_cargo === "2026-09"), true);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /\$8,500\.00 MXN/);
  });
});
