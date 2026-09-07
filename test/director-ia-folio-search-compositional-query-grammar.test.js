"use strict";

/**
 * R-FOLIO-COMP-001..040 — scope phrase, boundary residual, ANY conceptual.
 * Vocabulario de negocio solo en este archivo de tests.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  extractFolioSearchFilters,
  resolveFolioSearchScope,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  buildFolioSearchChatResult,
  SCOPE_ALL_PUBLIC_FOLIOS,
  SCOPE_SUPPORT_FAMILIES,
} = require("../lib/director-ia-folio-search");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-07T12:00:00-06:00");

const Q = Object.freeze({
  BONOS_OR: "que folios fueron de bonos o bono para agosto?",
  BONOS_VALES: "que folios de agosto fueron de bonos o vales?",
  ACEITE_OR: "que folios de agosto fueron de aceite de motor o filtros de aire?",
  O_RING: "que apoyos de enero a agosto fueron de O-RING?",
  SELLO: "que apoyos de enero a agosto fueron de SELLO O-RING?",
  SON_DE: "que folios son de agosto de bonos?",
  FUERON_DE: "que folios de agosto fueron de bonos?",
  ACEITE: "qué apoyos de agosto fueron de aceite de motor?",
  CON_ADITIVO: "que folios de agosto fueron de aceite con aditivo?",
  MAYAN: "que apoyos o inversiones de enero a agosto fueron de MAYAN PALACE?",
  MAYAN_PLAIN: "que apoyos de enero a agosto fueron de MAYAN PALACE?",
  APOYOS_FOLIOS: "que apoyos o folios de enero a agosto fueron de impresora?",
  FOLIOS_APOYOS: "que folios o apoyos de enero a agosto fueron de impresora?",
  SLASH: "que apoyos/folios de enero a agosto fueron de MAYAN PALACE?",
  IMPRESORA: "que apoyos de enero a agosto fueron de IMPRESORA?",
  LLANTA: "qué apoyos de julio fueron de llantas?",
  MOTORES: "qué apoyos de julio fueron de motores?",
  GAS: "qué apoyos de julio fueron de gas?",
  OVER12: "folios de enero 2025 a febrero 2026 de llantas",
  NO_CONCEPT: "qué apoyos de enero a agosto?",
});

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-08",
    importe: 10,
    estatus: "AUTORIZADO",
    categoria: "GASTOS",
    subcategoria: "",
    concepto: "BONO MENSUAL",
    beneficiario: "X",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function inject(question, extras = {}) {
  const rows = extras.rows || [row()];
  const calls = extras.calls || [];
  return {
    now: extras.now || NOW,
    question,
    auth: extras.auth || { role: "ZP" },
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    queryPublicFolios:
      extras.queryPublicFolios ||
      (async (_c, plantaId, mesCargo) => {
        calls.push(mesCargo);
        return rows.filter(
          (r) => Number(r.planta_id) === Number(plantaId) && String(r.mes_cargo) === String(mesCargo)
        );
      }),
    calls,
  };
}

async function search(question, extras = {}) {
  const opts = inject(question, extras);
  const payload = await loadFolioSearchForChat(
    null,
    1,
    { body: {}, dashboardAuth: extras.auth || { role: "ZP" } },
    opts
  );
  return { payload, calls: opts.calls };
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("R-FOLIO-COMP ANY bonos", () => {
  it("R-FOLIO-COMP-001/002/003/004/005/006: bonos o bono", async () => {
    const f = extractFolioSearchFilters(Q.BONOS_OR, { now: NOW });
    assert.equal(f.period_month, "2026-08");
    assert.equal(f.scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(f.concept_mode, "ANY");
    assert.equal(f.concept_query, null);
    assert.deepEqual(f.concept_alternatives, ["bonos", "bono"]);
    const bonos = await search(Q.BONOS_OR, {
      rows: [row({ concepto: "PAGO DE BONOS OPERATIVOS" })],
    });
    const bono = await search(Q.BONOS_OR, {
      rows: [row({ concepto: "BONO MENSUAL" })],
    });
    const noOr = await search(Q.BONOS_OR, {
      rows: [row({ concepto: "BONO SIN LETRA O EN MEDIO" })],
    });
    assert.equal(bonos.payload.count, 1);
    assert.equal(bono.payload.count, 1);
    assert.equal(noOr.payload.count, 1);
  });

  it("R-FOLIO-COMP-007: bonos o vales", async () => {
    const f = extractFolioSearchFilters(Q.BONOS_VALES, { now: NOW });
    assert.equal(f.concept_mode, "ANY");
    assert.deepEqual(f.concept_alternatives, ["bonos", "vales"]);
    const hit = await search(Q.BONOS_VALES, { rows: [row({ concepto: "VALES DE DESPENSA" })] });
    assert.equal(hit.payload.count, 1);
  });

  it("R-FOLIO-COMP-008/009: aceite de motor o filtros de aire no es bolsa", async () => {
    const f = extractFolioSearchFilters(Q.ACEITE_OR, { now: NOW });
    assert.equal(f.concept_mode, "ANY");
    assert.deepEqual(f.concept_alternatives, ["aceite de motor", "filtros de aire"]);
    const aceite = await search(Q.ACEITE_OR, {
      rows: [row({ concepto: "COMPRA DE ACEITE DE MOTOR" })],
    });
    const filtros = await search(Q.ACEITE_OR, {
      rows: [row({ concepto: "FILTRO DE AIRE cabina" })],
    });
    const bag = await search(Q.ACEITE_OR, {
      rows: [row({ concepto: "MOTOR ACEITE para unidad" })],
    });
    assert.equal(aceite.payload.count, 1);
    assert.equal(filtros.payload.count, 1);
    assert.equal(bag.payload.count, 0);
  });
});

describe("R-FOLIO-COMP O-RING y boundary", () => {
  it("R-FOLIO-COMP-010/011/012: O-RING SINGLE", () => {
    const ring = extractFolioSearchFilters(Q.O_RING, { now: NOW });
    assert.equal(ring.concept_mode, "SINGLE");
    assert.equal(ring.concept_query, "o-ring");
    assert.deepEqual(ring.concept_alternatives, []);
    const sello = extractFolioSearchFilters(Q.SELLO, { now: NOW });
    assert.equal(sello.concept_mode, "SINGLE");
    assert.equal(sello.concept_query, "sello o-ring");
    assert.ok(!sello.concept_alternatives.includes(""));
    assert.ok(!sello.concept_alternatives.includes("sello"));
  });

  it("R-FOLIO-COMP-013/014: residual de y frame vigente", () => {
    assert.equal(extractFolioSearchFilters(Q.SON_DE, { now: NOW }).concept_query, "bonos");
    assert.equal(extractFolioSearchFilters(Q.SON_DE, { now: NOW }).concept_mode, "SINGLE");
    assert.equal(extractFolioSearchFilters(Q.FUERON_DE, { now: NOW }).concept_query, "bonos");
  });

  it("R-FOLIO-COMP-015/016: de/con medial se conservan", () => {
    assert.equal(extractFolioSearchFilters(Q.ACEITE, { now: NOW }).concept_query, "aceite de motor");
    assert.equal(extractFolioSearchFilters(Q.CON_ADITIVO, { now: NOW }).concept_query, "aceite con aditivo");
  });
});

describe("R-FOLIO-COMP scope phrase", () => {
  it("R-FOLIO-COMP-017/018/019/020: apoyos o inversiones + MAYAN", async () => {
    const f = extractFolioSearchFilters(Q.MAYAN, { now: NOW });
    assert.equal(f.scope, SCOPE_SUPPORT_FAMILIES);
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_mode, "SINGLE");
    assert.equal(f.concept_query, "mayan palace");
    assert.notEqual(f.concept_query, "o inversiones fueron de mayan palace");
    const { payload } = await search(Q.MAYAN, {
      rows: [
        row({
          id: 29,
          numero_folio: "F-202605-029",
          mes_cargo: "2026-05",
          categoria: "INVERSIONES",
          concepto: "MAYAN PALACE PUERTA 4",
        }),
      ],
    });
    assert.equal(payload.count, 1);
  });

  it("R-FOLIO-COMP-021/022/023: apoyos/folios scope", () => {
    assert.equal(extractFolioSearchFilters(Q.APOYOS_FOLIOS, { now: NOW }).scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(extractFolioSearchFilters(Q.APOYOS_FOLIOS, { now: NOW }).concept_query, "impresora");
    assert.equal(extractFolioSearchFilters(Q.FOLIOS_APOYOS, { now: NOW }).scope, SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(extractFolioSearchFilters(Q.FOLIOS_APOYOS, { now: NOW }).concept_query, "impresora");
    assert.equal(resolveFolioSearchScope(Q.SLASH), SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(extractFolioSearchFilters(Q.SLASH, { now: NOW }).concept_query, "mayan palace");
  });

  it("R-FOLIO-COMP-024/025/026: no stopwords globales", () => {
    const helper = read("lib/director-ia-folio-search.js");
    const structural = helper.slice(helper.indexOf("const STRUCTURAL_TOKENS"), helper.indexOf("function normalizeQuestion"));
    assert.doesNotMatch(structural, /inversiones/);
    assert.doesNotMatch(structural, /"o"/);
    assert.doesNotMatch(structural, /"de"/);
    assert.doesNotMatch(structural, /"con"/);
  });
});

describe("R-FOLIO-COMP contratos congelados", () => {
  it("R-FOLIO-COMP-027: RANGE impresora", () => {
    const f = extractFolioSearchFilters(Q.IMPRESORA, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "impresora");
  });

  it("R-FOLIO-COMP-028: SINGLE julio llantas", async () => {
    const f = extractFolioSearchFilters(Q.LLANTA, { now: NOW });
    assert.equal(f.period_mode, "SINGLE");
    assert.equal(f.period_month, "2026-07");
    assert.equal(f.concept_query, "llantas");
    const { payload, calls } = await search(Q.LLANTA, {
      rows: [row({ mes_cargo: "2026-07", concepto: "AT-36 (4) LLANTA 11R22.5 LINEAL" })],
    });
    assert.deepEqual(calls, ["2026-07"]);
    assert.equal(payload.count, 1);
  });

  it("R-FOLIO-COMP-029: motores ↔ MOTOR", async () => {
    const { payload } = await search(Q.MOTORES, {
      rows: [row({ mes_cargo: "2026-07", concepto: "MOTOR diesel" })],
    });
    assert.equal(payload.count, 1);
  });

  it("R-FOLIO-COMP-030: gas != gasolina", async () => {
    const hit = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "Carga de GAS LP" })] });
    const miss = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "GASOLINA magna" })] });
    assert.equal(hit.payload.count, 1);
    assert.equal(miss.payload.count, 0);
  });

  it("R-FOLIO-COMP-031/032: partial y cap 12", async () => {
    const partial = await search(Q.IMPRESORA, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        if (mesCargo === "2026-04") throw new Error("fuente abril");
        return [];
      },
    });
    assert.equal(partial.payload.ok, false);
    assert.equal(extractFolioSearchFilters(Q.OVER12, { now: NOW }).period_code, "range_too_long");
    const over = await search(Q.OVER12);
    assert.equal(over.calls.length, 0);
  });

  it("R-FOLIO-COMP-033/034/035/036: fuente y sin SQL/deps", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.match(helper, /queryReviewableSupportFolios/);
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /\bBETWEEN\b/i);
    assert.doesNotMatch(helper, /FROM public\.folios/);
    assert.doesNotMatch(helper, /require\(["'](?!\.\/)[^"']+/);
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    assert.equal((igf.match(/FROM public\.folios f/g) || []).length, 1);
  });

  it("R-FOLIO-COMP-037: no intent nuevo de inversiones", () => {
    const plan = planDirectorIaQuestion("que inversiones hay en agosto?");
    assert.notEqual(plan.intent, "folio_search");
    assert.equal(planDirectorIaQuestion(Q.MAYAN).intent, "folio_search");
  });

  it("R-FOLIO-COMP-038/039: wording ANY vs SINGLE", async () => {
    const any = await search(Q.BONOS_OR, { rows: [row({ concepto: "BONO MENSUAL" })] });
    const anyAns = buildFolioSearchAnswer(any.payload);
    assert.match(anyAns, /concepto cualquiera de: bonos \| bono/);
    assert.doesNotMatch(anyAns, /concepto null/);
    const single = await search(Q.LLANTA, {
      rows: [row({ mes_cargo: "2026-07", concepto: "AT-36 (4) LLANTA 11R22.5 LINEAL" })],
    });
    assert.match(buildFolioSearchAnswer(single.payload), /concepto llantas/);
    assert.doesNotMatch(buildFolioSearchAnswer(single.payload), /cualquiera de/);
  });

  it("R-FOLIO-COMP-040: no Action Register; rango sin concepto", async () => {
    let ar = 0;
    const { payload } = await search(Q.NO_CONCEPT, {
      rows: [row({ mes_cargo: "2026-01", concepto: "SIN FILTRO" }), row({ id: 2, mes_cargo: "2026-08", concepto: "OTRO" })],
      loadActionRegister: async () => {
        ar += 1;
        return {};
      },
    });
    const f = extractFolioSearchFilters(Q.NO_CONCEPT, { now: NOW });
    assert.equal(f.concept_query, null);
    assert.equal(f.concept_mode, "SINGLE");
    assert.deepEqual(f.concept_alternatives, []);
    assert.equal(payload.count, 2);
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(ar, 0);
    assert.doesNotMatch(result.answer, /Action Register/i);
  });
});
