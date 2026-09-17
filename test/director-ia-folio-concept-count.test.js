"use strict";

/**
 * FIX-DIRECTOR-IA-FOLIO-CONCEPT-COUNT-AND-IGF-CHAT-SIZING-001
 * Conteo de folios por concepto libre. Las 30 paráfrasis viven solo aquí.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  extractFolioSearchFilters,
  isFolioConceptCountQuestion,
  isFolioSearchQuestion,
  isFolioExistenceQuestion,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  classifyFolioExistenceFollowUp,
} = require("../lib/director-ia-folio-search");
const { isExpenseAnalyticsQuestion } = require("../lib/director-ia-expense-analytics");
const { isFolioExistenceFollowUp } = require("../lib/director-ia-conversation-state");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-16T12:00:00-06:00");

const DIRECT_30 = Object.freeze([
  "¿Cuántos folios fueron de llantas?",
  "¿Cuántos folios tenemos de llantas?",
  "¿Cuántos folios hay de llantas?",
  "¿Cuántos folios contienen la palabra llantas?",
  "¿Cuántos folios mencionan llantas?",
  "¿Cuántos folios están relacionados con llantas?",
  "¿Cuántos folios tenemos relacionados con llantas?",
  "¿Cuántos folios hablan de llantas?",
  "¿Cuántos folios traen llantas?",
  "¿Cuántos folios incluyen llantas?",
  "¿Cuántos folios aparecen con llantas?",
  "¿Cuántos registros de folios tenemos de llantas?",
  "¿Cuántos apoyos en folios hay de llantas?",
  "¿Cuántos folios se hicieron por llantas?",
  "¿Cuántos folios se generaron por llantas?",
  "¿Cuántos folios se levantaron por llantas?",
  "¿Cuántos folios existen sobre llantas?",
  "¿Cuántos folios tenemos donde salga llantas?",
  "¿En cuántos folios aparece la palabra llantas?",
  "¿En cuántos folios aparece llanta?",
  "¿Cuántos folios coinciden con llantas?",
  "¿Cuántos folios encontramos con llantas?",
  "¿Cuántos folios hay vinculados a llantas?",
  "¿Cuántos folios corresponden a temas de llantas?",
  "¿Cuántos folios de taller mencionan llantas?",
  "¿Cuántos folios de llantas hubo en septiembre?",
  "¿Cuántos folios de llantas tuvimos de enero a agosto?",
  "¿Cuántos folios relacionados con llantas hay en Acapulco?",
  "Dame el número de folios que contienen llantas",
  "Cuenta los folios que tengan relación con llantas",
]);

const FREE_CONCEPTS = Object.freeze([
  "aceite",
  "baterías",
  "pintura",
  "extintores",
  "uniformes",
  "filtros",
  "válvulas",
  "refacciones",
  "balatas",
]);

const FOLLOW_UPS = Object.freeze([
  "¿Cuáles son?",
  "Dámelos",
  "Enséñamelos",
  "¿Qué folios son?",
  "¿Cuánto suman?",
  "¿Cuál fue el más reciente?",
  "¿Cuál fue el primero?",
  "¿Cuál tiene mayor importe?",
  "¿Cuál tiene menor importe?",
  "¿Cuáles están pagados?",
  "¿Cuáles están pendientes?",
  "¿Cuántos están pagados?",
  "¿Qué fecha tienen?",
  "¿Qué estatus tienen?",
  "Dame el detalle",
]);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-01",
    importe: 1000,
    estatus: "PAGADO",
    categoria: "TALLER",
    subcategoria: "REFACCIONES",
    concepto: "Compra de llantas",
    beneficiario: "Proveedor A",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function llantaRows() {
  return [
    row({ id: 1, numero_folio: "F-ENE", mes_cargo: "2026-01", importe: 1000, estatus: "PAGADO" }),
    row({ id: 2, numero_folio: "F-AGO", mes_cargo: "2026-08", importe: 2500, estatus: "PENDIENTE", concepto: "llanta rota" }),
    row({ id: 3, numero_folio: "F-SEP", mes_cargo: "2026-09", importe: 900, estatus: "PAGADO", concepto: "servicio de llantas" }),
    row({ id: 4, numero_folio: "F-ACE", mes_cargo: "2026-08", importe: 400, concepto: "aceite de motor" }),
  ];
}

function inject(question, extra = {}) {
  const rows = extra.rows || llantaRows();
  return {
    question,
    now: NOW,
    auth: { role: "ZP" },
    folioItems: rows,
    queryPublicFolios: async (_c, plantaId, mesCargo) =>
      rows.filter((r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)),
  };
}

function conceptOf(q) {
  return extractFolioSearchFilters(q, { now: NOW });
}

describe("FIX folio concept COUNT — 30 paráfrasis", () => {
  it("30/30 van a folio_search COUNT y no a expense", () => {
    for (const q of DIRECT_30) {
      assert.equal(isFolioConceptCountQuestion(q), true, q);
      assert.equal(isExpenseAnalyticsQuestion(q), false, q);
      const plan = planDirectorIaQuestion(q);
      assert.equal(plan.intent, "folio_search", q);
      assert.notEqual(plan.evidence[0].value, "folio_existence_by_concept", q);
      const filters = conceptOf(q);
      assert.equal(filters.analysis_mode, "COUNT", q);
      const term = `${filters.concept_query || ""} ${(filters.concept_alternatives || []).join(" ")}`.toLowerCase();
      assert.match(term, /llant/, q);
    }
  });

  it("producción no contiene phrasebook de las 30", () => {
    const src = `${read("lib/director-ia-folio-search.js")}\n${read("lib/director-ia-planner.js")}`;
    assert.equal(src.includes("¿Cuántos folios fueron de llantas?"), false);
    assert.equal(src.includes("Cuenta los folios que tengan relación con llantas"), false);
  });
});

describe("FIX folio concept COUNT — periodo", () => {
  it("rango explícito enero-agosto", () => {
    const q = "¿Cuántos folios de llantas tuvimos de enero a agosto?";
    const filters = conceptOf(q);
    assert.equal(filters.period_mode, "RANGE");
    assert.equal(filters.period_start, "2026-01");
    assert.equal(filters.period_end, "2026-08");
    assert.equal(filters.analysis_mode, "COUNT");
  });

  it("sin periodo pide aclaración y no historial silencioso", async () => {
    const q = "¿Cuántos folios fueron de llantas?";
    const filters = conceptOf(q);
    assert.notEqual(filters.period_mode, "ANY");
    assert.equal(filters.existence, false);
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(q));
    assert.equal(payload.ok, true);
    assert.equal(payload.pending_period, true);
    assert.equal(payload.period_code, "missing_period");
    assert.match(payload.clarification || payload.error, /De qué mes o rango de meses quieres los folios de llantas/);
    assert.equal(/exclusivamente/.test(payload.error), false);
  });
});

describe("FIX folio concept COUNT — generalización", () => {
  it("conceptos libres sin whitelist", () => {
    for (const concept of FREE_CONCEPTS) {
      const q = `¿Cuántos folios fueron de ${concept} de enero a agosto?`;
      assert.equal(isFolioConceptCountQuestion(q), true, q);
      assert.equal(planDirectorIaQuestion(q).intent, "folio_search", q);
      const filters = conceptOf(q);
      assert.equal(filters.analysis_mode, "COUNT", q);
      const hay = `${filters.concept_query || ""} ${(filters.concept_alternatives || []).join(" ")}`.toLowerCase();
      assert.match(hay, new RegExp(concept.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 5)), q);
    }
  });
});

describe("FIX folio concept COUNT — truth + result-set", () => {
  it("COUNT con rango no afirma exclusividad", async () => {
    const q = "¿Cuántos folios contienen llantas de enero a agosto?";
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(q));
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 2);
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /Encontré 2 folios relacionados con/);
    assert.match(answer, /enero/);
    assert.match(answer, /agosto/);
    assert.equal(/exclusivamente/.test(answer), false);
  });

  it("15 follow-ups no son unknown y heredan el result-set", async () => {
    const seed = "¿Cuántos folios contienen llantas de enero a agosto?";
    const seeded = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(seed));
    assert.equal(seeded.ok, true);
    for (const follow of FOLLOW_UPS) {
      assert.equal(isFolioExistenceFollowUp(follow), true, follow);
      assert.ok(classifyFolioExistenceFollowUp(follow), follow);
      const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, {
        ...inject(follow),
        inheritedFilters: seeded.filters,
      });
      assert.equal(payload.ok, true, follow);
      assert.equal(payload.filters.concept_query, seeded.filters.concept_query, follow);
      assert.equal(payload.filters.period_start, "2026-01", follow);
      assert.equal(payload.filters.period_end, "2026-08", follow);
    }
  });

  it("¿Cuáles son? lista los mismos 2", async () => {
    const seed = await loadFolioSearchForChat(
      null,
      1,
      { body: {}, dashboardAuth: { role: "ZP" } },
      inject("¿Cuántos folios contienen llantas de enero a agosto?")
    );
    const listed = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, {
      ...inject("¿Cuáles son?"),
      inheritedFilters: seed.filters,
      analysisOverride: { analysis_mode: "LIST" },
    });
    assert.equal(listed.count, 2);
    const ids = (listed.records || []).map((r) => r.numero_folio).sort();
    assert.deepEqual(ids, ["F-AGO", "F-ENE"]);
  });
});

describe("FIX folio concept COUNT — anti-collisions", () => {
  it("COUNT no cae a SPEND", () => {
    const q = "¿Cuántos folios fueron de llantas?";
    assert.equal(planDirectorIaQuestion(q).intent, "folio_search");
    assert.equal(isExpenseAnalyticsQuestion(q), false);
  });

  it("gastamos sigue expense", () => {
    const q = "¿Cuánto gastamos en llantas?";
    assert.equal(isFolioConceptCountQuestion(q), false);
    assert.equal(planDirectorIaQuestion(q).intent, "expense_analytics");
  });

  it("suman folios no es COUNT", () => {
    const q = "¿Cuánto suman los folios de llantas?";
    assert.equal(isFolioConceptCountQuestion(q), false);
    const plan = planDirectorIaQuestion(q);
    assert.notEqual(plan.evidence && plan.evidence[0] && plan.evidence[0].value, "folio_concept_count");
  });

  it("precio unitario / proveedores / beneficiarios / list / existence no son COUNT", () => {
    const collisions = [
      "¿Cuánto cuesta cada llanta?",
      "¿Qué proveedores nos venden llantas?",
      "¿Qué beneficiarios tenemos en llantas?",
      "¿Qué folios contienen llantas?",
      "¿Existe un folio de llantas?",
    ];
    for (const q of collisions) {
      assert.equal(isFolioConceptCountQuestion(q), false, q);
    }
    assert.equal(isFolioSearchQuestion("¿Qué folios contienen llantas de enero?"), true);
    assert.equal(isFolioExistenceQuestion("¿Existe un folio de llantas?"), true);
    assert.equal(planDirectorIaQuestion("¿Existe un folio de llantas?").evidence[0].value, "folio_existence_by_concept");
  });

  it("Taller COUNT de categoría no se roba", () => {
    const q = "¿Cuántos folios de Taller hubo en agosto?";
    assert.equal(isFolioConceptCountQuestion(q), false);
    assert.equal(planDirectorIaQuestion(q).intent, "expense_analytics");
  });
});
