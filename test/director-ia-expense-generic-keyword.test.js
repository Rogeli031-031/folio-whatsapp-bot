"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  isExpenseAnalyticsQuestion,
  extractExpenseAnalyticsSpec,
  loadExpenseAnalyticsForChat,
  buildExpenseAnalyticsAnswer,
  CLASSIFICATIONS,
  SEMANTIC_LABELS,
  METRICS,
} = require("../lib/director-ia-expense-analytics");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-15T12:00:00-06:00");

const Q = Object.freeze({
  ACEITE: "¿cuánto gastamos en aceite en febrero?",
  BATERIAS: "¿cuánto gasté en baterías en marzo?",
  PINTURA: "¿cuánto se gastó en pintura en enero?",
  FILTROS: "¿cuánto gastamos en filtros de aceite de enero a marzo?",
  UNIFORMES: "¿cuánto gastamos en uniformes en agosto?",
  EXTINTORES: "¿cuánto se gastó en extintores en febrero?",
  ACEITE_EXACT: "¿cuánto gastamos exactamente en aceite en febrero?",
  SIN_CONCEPTO: "¿cuánto gastamos en febrero?",
  IGF: "¿cuánto gastamos en aceite y cómo va IGF?",
  EXCEL: "exporta a excel cuanto gastamos en aceite en febrero",
  TALLER_MAYOR: "cuánto gastamos en taller mayor en febrero",
});

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-02",
    importe: 1000,
    estatus: "AUTORIZADO",
    categoria: "GASTOS",
    subcategoria: null,
    concepto: "compra de aceite",
    beneficiario: "Proveedor",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function fixtureRows() {
  return [
    row({ id: 1, numero_folio: "F-ACE-1", mes_cargo: "2026-02", importe: 800, concepto: "compra de aceite" }),
    row({ id: 2, numero_folio: "F-BAT-2", mes_cargo: "2026-03", importe: 1500, concepto: "baterias nuevas" }),
    row({ id: 3, numero_folio: "F-PIN-3", mes_cargo: "2026-01", importe: 400, concepto: "pintura de unidad" }),
    row({ id: 4, numero_folio: "F-FIL-4", mes_cargo: "2026-02", importe: 250, concepto: "filtros de aceite" }),
    row({ id: 5, numero_folio: "F-UNI-5", mes_cargo: "2026-08", importe: 900, concepto: "uniformes de planta" }),
    row({ id: 6, numero_folio: "F-EXT-6", mes_cargo: "2026-02", importe: 300, concepto: "recarga de extintores" }),
    row({ id: 7, numero_folio: "F-OTR-7", mes_cargo: "2026-02", importe: 9999, concepto: "papeleria" }),
  ];
}

function inject(question) {
  const rows = fixtureRows();
  return {
    now: NOW,
    question,
    auth: { role: "ZP" },
    resolveEquivalentIds: (id) => [Number(id)],
    queryPublicFolios: async (_c, plantaId, mesCargo) =>
      rows.filter(
        (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
      ),
  };
}

async function load(question) {
  return loadExpenseAnalyticsForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(question));
}

describe("FIX generic expense keyword — routing", () => {
  it("aceite / baterías / pintura / filtros / uniformes / extintores entran sin catálogo", () => {
    for (const q of [Q.ACEITE, Q.BATERIAS, Q.PINTURA, Q.FILTROS, Q.UNIFORMES, Q.EXTINTORES]) {
      assert.equal(isExpenseAnalyticsQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "expense_analytics", q);
      assert.equal(detectDirectorIaIntent(q).intent, "expense_analytics", q);
    }
    const src = fs.readFileSync(path.join(ROOT, "lib/director-ia-expense-analytics.js"), "utf8");
    assert.equal(/\baceite\b/.test(src.replace(/test\//g, "")), false);
    assert.doesNotMatch(src, /EXCLUSIVE_COMPONENT_KEYWORDS[\s\S]*aceite/);
    assert.doesNotMatch(src, /["']aceite["']/);
    assert.doesNotMatch(src, /["']baterias["']/);
    assert.doesNotMatch(src, /["']pintura["']/);
    assert.doesNotMatch(src, /["']uniformes["']/);
    assert.doesNotMatch(src, /["']extintores["']/);
  });

  it("keyword y periodo correctos", () => {
    const aceite = extractExpenseAnalyticsSpec(Q.ACEITE, { now: NOW });
    assert.equal(aceite.ok, true);
    assert.equal(aceite.domain, null);
    assert.equal(aceite.keyword, "aceite");
    assert.equal(aceite.metric, METRICS.SUM);
    assert.equal(aceite.period_month, "2026-02");
    assert.equal(aceite.semantic_label, SEMANTIC_LABELS.TOTAL_FOLIOS_MATCHING_KEYWORD);
    assert.equal(aceite.classification, CLASSIFICATIONS.FOLIO_TOTAL_ONLY);

    const baterias = extractExpenseAnalyticsSpec(Q.BATERIAS, { now: NOW });
    assert.equal(baterias.keyword, "baterias");
    assert.equal(baterias.period_month, "2026-03");

    const pintura = extractExpenseAnalyticsSpec(Q.PINTURA, { now: NOW });
    assert.equal(pintura.keyword, "pintura");
    assert.equal(pintura.period_month, "2026-01");

    const filtros = extractExpenseAnalyticsSpec(Q.FILTROS, { now: NOW });
    assert.equal(filtros.keyword, "filtros aceite");
    assert.equal(filtros.period_mode, "RANGE");
    assert.equal(filtros.period_start, "2026-01");
    assert.equal(filtros.period_end, "2026-03");

    const uniformes = extractExpenseAnalyticsSpec(Q.UNIFORMES, { now: NOW });
    assert.equal(uniformes.keyword, "uniformes");
    assert.equal(uniformes.period_month, "2026-08");

    const extintores = extractExpenseAnalyticsSpec(Q.EXTINTORES, { now: NOW });
    assert.equal(extintores.keyword, "extintores");
    assert.equal(extintores.period_month, "2026-02");
  });

  it("sin concepto usable, IGF, excel y Taller Mayor no entran", () => {
    assert.equal(isExpenseAnalyticsQuestion(Q.SIN_CONCEPTO), false);
    assert.equal(isExpenseAnalyticsQuestion(Q.IGF), false);
    assert.equal(isExpenseAnalyticsQuestion(Q.EXCEL), false);
    assert.equal(isExpenseAnalyticsQuestion(Q.TALLER_MAYOR), false);
  });
});

describe("FIX generic expense keyword — veracidad", () => {
  it("aceite suma folios coincidentes y declara que no es costo exclusivo", async () => {
    const payload = await load(Q.ACEITE);
    assert.equal(payload.ok, true);
    assert.equal(payload.analysis.sum, 1050);
    const answer = buildExpenseAnalyticsAnswer(payload);
    assert.match(answer, /folios coincidentes suman \$1,050\.00 MXN/);
    assert.match(answer, /no necesariamente al gasto exclusivo en aceite/);
  });

  it("filtros de aceite en rango no cruza agosto", async () => {
    const payload = await load(Q.FILTROS);
    assert.equal(payload.analysis.sum, 250);
    assert.equal(payload.records.every((r) => r.mes_cargo >= "2026-01" && r.mes_cargo <= "2026-03"), true);
  });

  it("exacto/exclusivo de aceite falla cerrado", async () => {
    const spec = extractExpenseAnalyticsSpec(Q.ACEITE_EXACT, { now: NOW });
    assert.equal(spec.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    const payload = await load(Q.ACEITE_EXACT);
    assert.equal(payload.classification, CLASSIFICATIONS.BREAKDOWN_MISSING);
    assert.match(buildExpenseAnalyticsAnswer(payload), /exclusivamente a aceite/);
    assert.equal(payload.analysis, null);
  });
});
