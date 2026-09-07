"use strict";

/**
 * R-FOLIO-TRUTH-001..028 — búsqueda veraz de folios/apoyos.
 * Conceptos y categorías sintéticas solo en este archivo.
 */

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent, planDirectorIaQuestion } = require("../lib/director-ia-planner");
const { buildDirectorIaToolPlan } = require("../lib/director-ia-tool-orchestrator");
const { getDirectorIaTool } = require("../lib/director-ia-tools");
const { isIgfReviewableSupportsQuestion } = require("../lib/director-ia-igf-reviewable-supports");
const { isM4ClasificacionQuery } = require("../lib/director-ia-capabilities");
const {
  extractFolioSearchFilters,
  resolveFolioSearchScope,
  isFolioSearchQuestion,
  loadFolioSearchForChat,
  buildFolioSearchChatResult,
  SUPPORT_FAMILIES,
  SCOPE_ALL_PUBLIC_FOLIOS,
  SCOPE_SUPPORT_FAMILIES,
} = require("../lib/director-ia-folio-search");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-07T12:00:00-06:00");
const NOW_2025 = new Date("2025-04-01T12:00:00-06:00");

const Q = Object.freeze({
  NORTH: "que apoyos/folios tenemos para septiembre de llantas?",
  APOYOS_ONLY: "qué apoyos de llantas tenemos en septiembre?",
  FOLIOS_ONLY: "qué folios tenemos en septiembre de llantas?",
  FOLIO_STATUS: "estatus del folio 123",
  IGF: "qué apoyos podemos recortar del IGF?",
  M4: "clasificación de apoyos",
  H: "qué gastos de llantas tenemos en septiembre?",
  UNIFORMES: "folios de uniformes de agosto",
  YEAR: "qué folios tenemos en septiembre 2024 de llantas?",
});

const PRODUCT = [
  "lib/director-ia-folio-search.js",
  "lib/director-ia-planner.js",
  "lib/director-ia-capabilities.js",
  "lib/director-ia-tools.js",
  "lib/director-ia-chat.js",
  "lib/director-ia-igf-reviewable-supports.js",
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function row(over = {}) {
  return {
    id: 10,
    numero_folio: "F-202609-010",
    folio_codigo: "F-202609-010",
    planta_id: 1,
    mes_cargo: "2026-09",
    importe: 4200,
    estatus: "AUTORIZADO",
    categoria: "GASTOS",
    subcategoria: "REFACCIONES",
    concepto: "Compra de llantas",
    beneficiario: "Proveedor A",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function fixtureRows() {
  return [
    row(),
    row({
      id: 11,
      numero_folio: "F-202609-011",
      categoria: "INVERSIONES",
      concepto: "Llantas de montacargas",
      importe: 8000,
    }),
    row({
      id: 12,
      numero_folio: "F-202609-012",
      categoria: "TALLER",
      concepto: "Cambio de llantas",
      importe: 1500,
    }),
    row({
      id: 13,
      numero_folio: "F-202609-013",
      categoria: "DYO",
      concepto: "Llantas DYO",
      importe: 250,
    }),
    row({
      id: 14,
      numero_folio: "F-202609-014",
      planta_id: 2,
      concepto: "Llantas otra planta",
      importe: 99,
    }),
    row({
      id: 15,
      numero_folio: "F-202609-015",
      categoria: "COMISIONES",
      concepto: "Comisión ajena",
      importe: 10,
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

describe("R-FOLIO-TRUTH planner y scope", () => {
  it("R-FOLIO-TRUTH-001/002: North Star es folio_search", () => {
    assert.equal(detectDirectorIaIntent(Q.NORTH).intent, "folio_search");
    assert.equal(planDirectorIaQuestion(Q.NORTH).intent, "folio_search");
  });

  it("R-FOLIO-TRUTH-003/005: folios o apoyos/folios → ALL_PUBLIC_FOLIOS", () => {
    assert.equal(resolveFolioSearchScope(Q.NORTH), SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(resolveFolioSearchScope(Q.FOLIOS_ONLY), SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(extractFolioSearchFilters(Q.NORTH, { now: NOW }).scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("R-FOLIO-TRUTH-004: apoyos sin folios → SUPPORT_FAMILIES", () => {
    assert.equal(resolveFolioSearchScope(Q.APOYOS_ONLY), SCOPE_SUPPORT_FAMILIES);
    assert.equal(isFolioSearchQuestion(Q.APOYOS_ONLY), true);
    assert.equal(planDirectorIaQuestion(Q.APOYOS_ONLY).intent, "folio_search");
  });

  it("R-FOLIO-TRUTH-019/020/021: prioridades específicas se conservan", () => {
    assert.equal(planDirectorIaQuestion(Q.FOLIO_STATUS).intent, "folio_status");
    assert.equal(isIgfReviewableSupportsQuestion(Q.IGF), true);
    assert.equal(planDirectorIaQuestion(Q.IGF).intent, "igf_reviewable_supports");
    assert.equal(isM4ClasificacionQuery("clasificacion de apoyos"), true);
    assert.equal(planDirectorIaQuestion(Q.M4).intent, "clasificacion_apoyos_query");
  });

  it("R-FOLIO-TRUTH-028: H no se fuerza a folio_search", () => {
    assert.notEqual(planDirectorIaQuestion(Q.H).intent, "folio_search");
  });
});

describe("R-FOLIO-TRUTH extractor", () => {
  it("R-FOLIO-TRUTH-013/014/016: North Star mes_cargo y concepto genérico", () => {
    const f = extractFolioSearchFilters(Q.NORTH, { now: NOW });
    assert.equal(f.period_month, "2026-09");
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("R-FOLIO-TRUTH-014: mes sin año usa deps.now", () => {
    assert.equal(extractFolioSearchFilters(Q.FOLIOS_ONLY, { now: NOW_2025 }).period_month, "2025-09");
  });

  it("R-FOLIO-TRUTH-015: año explícito gana", () => {
    const f = extractFolioSearchFilters(Q.YEAR, { now: NOW });
    assert.equal(f.period_month, "2024-09");
    assert.equal(f.concept_query, "llantas");
  });

  it("R-FOLIO-TRUTH-017: otro concepto no está hardcodeado", () => {
    const f = extractFolioSearchFilters(Q.UNIFORMES, { now: NOW });
    assert.equal(f.period_month, "2026-08");
    assert.equal(f.concept_query, "uniformes");
    assert.equal(planDirectorIaQuestion(Q.UNIFORMES).intent, "folio_search");
  });
});

describe("R-FOLIO-TRUTH loader y wording", () => {
  it("R-FOLIO-TRUTH-006/007/026: ALL_PUBLIC_FOLIOS incluye DYO y no recorta a tres familias", async () => {
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(Q.NORTH));
    assert.equal(payload.ok, true);
    assert.equal(payload.filters.scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(payload.filters.planta_id, 1);
    assert.equal(payload.filters.period_month, "2026-09");
    const cats = payload.records.map((r) => r.categoria);
    assert.ok(cats.includes("GASTOS"));
    assert.ok(cats.includes("INVERSIONES"));
    assert.ok(cats.includes("TALLER"));
    assert.ok(cats.includes("DYO"));
    assert.equal(cats.includes("COMISIONES"), false);
    assert.equal(
      payload.records.some((r) => r.numero_folio === "F-202609-014"),
      false
    );
  });

  it("R-FOLIO-TRUTH-008/027: SUPPORT_FAMILIES = GASTOS+INVERSIONES+TALLER y excluye DYO", async () => {
    assert.deepEqual(SUPPORT_FAMILIES, ["GASTOS", "INVERSIONES", "TALLER"]);
    const payload = await loadFolioSearchForChat(
      null,
      1,
      { body: {}, dashboardAuth: { role: "ZP" } },
      inject(Q.APOYOS_ONLY)
    );
    assert.equal(payload.filters.scope, SCOPE_SUPPORT_FAMILIES);
    const cats = payload.records.map((r) => r.categoria);
    assert.ok(cats.includes("GASTOS"));
    assert.ok(cats.includes("INVERSIONES"));
    assert.ok(cats.includes("TALLER"));
    assert.equal(cats.includes("DYO"), false);
    assert.equal(cats.includes("COMISIONES"), false);
  });

  it("R-FOLIO-TRUTH-009: wording ALL_PUBLIC_FOLIOS dice folios", async () => {
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(Q.NORTH));
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.match(result.answer, /folios/i);
    assert.doesNotMatch(result.answer, /GASTOS, INVERSIONES y TALLER/);
  });

  it("R-FOLIO-TRUTH-010: wording SUPPORT_FAMILIES declara las tres familias", async () => {
    const payload = await loadFolioSearchForChat(
      null,
      1,
      { body: {}, dashboardAuth: { role: "ZP" } },
      inject(Q.APOYOS_ONLY)
    );
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.match(result.answer, /GASTOS, INVERSIONES y TALLER/);
    assert.doesNotMatch(result.answer, /todos los folios/i);
  });

  it("R-FOLIO-TRUTH-011: empty ALL_PUBLIC_FOLIOS solo tras consultar scope completo", async () => {
    let queried = false;
    const payload = await loadFolioSearchForChat(
      null,
      1,
      { body: {}, dashboardAuth: { role: "ZP" } },
      inject(Q.NORTH, {
        queryPublicFolios: async (_c, plantaId, mesCargo) => {
          queried = true;
          assert.equal(Number(plantaId), 1);
          assert.equal(mesCargo, "2026-09");
          return [row({ concepto: "Aceite", categoria: "DYO" })];
        },
      })
    );
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(queried, true);
    assert.equal(payload.count, 0);
    assert.match(result.answer, /no encontr[eé] folios/i);
  });

  it("R-FOLIO-TRUTH-012: empty SUPPORT_FAMILIES declara scope limitado", async () => {
    const payload = await loadFolioSearchForChat(
      null,
      1,
      { body: {}, dashboardAuth: { role: "ZP" } },
      inject(Q.APOYOS_ONLY, {
        rows: [row({ categoria: "DYO", concepto: "Llantas DYO" })],
      })
    );
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(payload.count, 0);
    assert.match(result.answer, /GASTOS, INVERSIONES o TALLER/i);
  });

  it("R-FOLIO-TRUTH-018: planta_id viene del chat", async () => {
    const payload = await loadFolioSearchForChat(null, 7, { body: {}, dashboardAuth: { role: "ZP" } }, inject(Q.NORTH));
    assert.equal(payload.filters.planta_id, 7);
  });

  it("R-FOLIO-TRUTH-022/025: no Action Register ni semántica IGF", async () => {
    let ar = 0;
    const payload = await loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, {
      ...inject(Q.NORTH),
      loadActionRegister: async () => {
        ar += 1;
        return {};
      },
      categoryFeedsIgfSupportCalc: () => {
        throw new Error("IGF filter no debe usarse");
      },
    });
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(ar, 0);
    assert.doesNotMatch(result.answer, /Action Register/i);
    assert.doesNotMatch(result.answer, /reviewable/i);
    assert.ok(payload.records.some((r) => r.categoria === "DYO"));
  });
});

describe("R-FOLIO-TRUTH chat, SQL y tools", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  it("askDirectorIa North Star declara folios y ve DYO", async () => {
    configureDirectorIaChat({
      now: NOW,
      queryPublicFolios: async (_c, plantaId, mesCargo) => {
        assert.equal(Number(plantaId), 1);
        assert.equal(mesCargo, "2026-09");
        return fixtureRows().filter((r) => Number(r.planta_id) === 1 && r.mes_cargo === mesCargo);
      },
    });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, Q.NORTH);
    assert.equal(result.ok, true, result.error || result.answer);
    assert.equal(result.context_meta.mode, "folio_search");
    assert.equal(result.context_meta.scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.match(result.answer, /folios/i);
    assert.match(result.answer, /F-202609-013/);
    assert.doesNotMatch(result.answer, /intención clara/i);
  });

  it("R-FOLIO-TRUTH-023/024: helper no tiene SQL y no duplica el SELECT ancho", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /\bINSERT\b/);
    assert.match(helper, /queryReviewableSupportFolios/);
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const selects = igf.match(/FROM public\.folios f/g) || [];
    assert.equal(selects.length, 1);
  });

  it("tool get_folio_search existe", () => {
    const tool = getDirectorIaTool("get_folio_search");
    assert.ok(tool);
    assert.equal(tool.executor, "loadFolioSearchForChat");
    const plan = planDirectorIaQuestion(Q.NORTH);
    const toolPlan = buildDirectorIaToolPlan(plan, { planta_id: 1, question: Q.NORTH });
    assert.ok(toolPlan.tools.some((t) => t.tool_id === "get_folio_search"));
  });

  it("producto no hardcodea llantas/uniformes/mantenimiento", () => {
    for (const rel of PRODUCT) {
      if (rel.endsWith("folio-search.js") || rel.endsWith("planner.js") || rel.endsWith("chat.js")) {
        const src = read(rel);
        assert.doesNotMatch(src, /llantas/i, rel);
        assert.doesNotMatch(src, /uniformes/i, rel);
      }
    }
  });
});
