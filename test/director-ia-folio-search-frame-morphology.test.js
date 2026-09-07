"use strict";

/**
 * R-FOLIO-LANG-001..038 — frame relacional + morfología controlada.
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
  buildFolioSearchChatResult,
  SCOPE_ALL_PUBLIC_FOLIOS,
  SCOPE_SUPPORT_FAMILIES,
} = require("../lib/director-ia-folio-search");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-07T12:00:00-06:00");

const Q = Object.freeze({
  NORTH: "qué apoyos de julio fueron de llantas?",
  ACEITE: "qué apoyos de agosto fueron de aceite de motor?",
  BOMBAS: "qué apoyos de julio fueron de bombas?",
  BOMBA: "qué apoyos de julio fueron de bomba?",
  MOTORES: "qué apoyos de julio fueron de motores?",
  MOTOR: "qué apoyos de julio fueron de motor?",
  LUCES: "qué apoyos de julio fueron de luces?",
  LUZ: "qué apoyos de julio fueron de luz?",
  GAS: "qué apoyos de julio fueron de gas?",
  PARABRISAS: "qué apoyos de julio fueron de parabrisas?",
  FILTROS: "qué apoyos de julio fueron de filtros de aire?",
  BOMBA_AGUA: "qué apoyos de julio fueron de bomba de agua?",
  SON: "qué apoyos de julio son de llantas?",
  ERAN: "qué apoyos de julio eran de llantas?",
  REL_OS: "qué apoyos de julio relacionados con llantas?",
  REL_AS: "qué apoyos de julio relacionadas con llantas?",
  FOLIOS_JUL: "folios de llantas de julio",
  SEP: "que apoyos/folios tenemos para septiembre de llantas?",
  AUG: "qué apoyos de agosto fueron de llantas?",
});

function row(over = {}) {
  return {
    id: 36,
    numero_folio: "F-AT-36",
    folio_codigo: "F-AT-36",
    planta_id: 1,
    mes_cargo: "2026-07",
    importe: 100,
    estatus: "AUTORIZADO",
    categoria: "GASTOS",
    subcategoria: "",
    concepto: "AT-36 (4) LLANTA 11R22.5 LINEAL",
    beneficiario: "X",
    solo_zp_ad: false,
    planta_nombre: "Acapulco",
    ...over,
  };
}

function inject(question, extras = {}) {
  const rows = extras.rows || [row()];
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

async function search(question, extras = {}) {
  return loadFolioSearchForChat(null, 1, { body: {}, dashboardAuth: { role: "ZP" } }, inject(question, extras));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("R-FOLIO-LANG frame y North Star", () => {
  it("R-FOLIO-LANG-001/002/003/004: North Star julio + LLANTA", async () => {
    const f = extractFolioSearchFilters(Q.NORTH, { now: NOW });
    assert.equal(f.period_month, "2026-07");
    assert.equal(f.concept_query, "llantas");
    assert.notEqual(f.concept_query, "fueron de llantas");
    const payload = await search(Q.NORTH);
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].numero_folio, "F-AT-36");
  });

  it("R-FOLIO-LANG-005: llanta ↔ LLANTAS", async () => {
    const payload = await search("qué apoyos de julio fueron de llanta?", {
      rows: [row({ concepto: "Juego de LLANTAS mixtas" })],
    });
    assert.equal(payload.count, 1);
  });

  it("R-FOLIO-LANG-023/024/025/026/027: frames auditados", () => {
    assert.equal(extractFolioSearchFilters(Q.NORTH, { now: NOW }).concept_query, "llantas");
    assert.equal(extractFolioSearchFilters(Q.SON, { now: NOW }).concept_query, "llantas");
    assert.equal(extractFolioSearchFilters(Q.ERAN, { now: NOW }).concept_query, "llantas");
    assert.equal(extractFolioSearchFilters(Q.REL_OS, { now: NOW }).concept_query, "llantas");
    assert.equal(extractFolioSearchFilters(Q.REL_AS, { now: NOW }).concept_query, "llantas");
  });

  it("R-FOLIO-LANG-028: folios de llantas de julio", () => {
    const f = extractFolioSearchFilters(Q.FOLIOS_JUL, { now: NOW });
    assert.equal(f.period_month, "2026-07");
    assert.equal(f.concept_query, "llantas");
  });
});

describe("R-FOLIO-LANG morfología controlada", () => {
  it("R-FOLIO-LANG-006/007: bombas ↔ BOMBA", async () => {
    assert.equal((await search(Q.BOMBAS, { rows: [row({ concepto: "BOMBA hidraulica" })] })).count, 1);
    assert.equal((await search(Q.BOMBA, { rows: [row({ concepto: "BOMBAS hidraulicas" })] })).count, 1);
  });

  it("R-FOLIO-LANG-008/009: motores ↔ MOTOR", async () => {
    assert.equal((await search(Q.MOTORES, { rows: [row({ concepto: "MOTOR diesel" })] })).count, 1);
    assert.equal((await search(Q.MOTOR, { rows: [row({ concepto: "MOTORES diesel" })] })).count, 1);
  });

  it("R-FOLIO-LANG-010/011: luces ↔ LUZ", async () => {
    assert.equal((await search(Q.LUCES, { rows: [row({ concepto: "LUZ direccional" })] })).count, 1);
    assert.equal((await search(Q.LUZ, { rows: [row({ concepto: "LUCES direccionales" })] })).count, 1);
  });

  it("R-FOLIO-LANG-012/013/014/015: gas token-safe", async () => {
    const f = extractFolioSearchFilters(Q.GAS, { now: NOW });
    assert.equal(f.concept_query, "gas");
    assert.notEqual(f.concept_query, "ga");
    assert.equal((await search(Q.GAS, { rows: [row({ concepto: "Carga de GAS LP" })] })).count, 1);
    assert.equal((await search(Q.GAS, { rows: [row({ concepto: "GASTO operativo" })] })).count, 0);
    assert.equal((await search(Q.GAS, { rows: [row({ concepto: "GASOLINA magna" })] })).count, 0);
    assert.equal((await search(Q.GAS, { rows: [row({ concepto: "GA de prueba" })] })).count, 0);
  });

  it("R-FOLIO-LANG-016: parabrisas no se mutila", async () => {
    const f = extractFolioSearchFilters(Q.PARABRISAS, { now: NOW });
    assert.equal(f.concept_query, "parabrisas");
    assert.notEqual(f.concept_query, "parabrisa");
    const payload = await search(Q.PARABRISAS, { rows: [row({ concepto: "PARABRISAS delantero" })] });
    assert.equal(payload.count, 1);
  });
});

describe("R-FOLIO-LANG multiword", () => {
  it("R-FOLIO-LANG-017/018/019: aceite de motor secuencia", async () => {
    const f = extractFolioSearchFilters(Q.ACEITE, { now: NOW });
    assert.equal(f.period_month, "2026-08");
    assert.equal(f.concept_query, "aceite de motor");
    assert.notEqual(f.concept_query, "aceite motor");
    const hit = await search(Q.ACEITE, {
      rows: [row({ mes_cargo: "2026-08", concepto: "COMPRA DE ACEITE DE MOTOR PARA UNIDAD" })],
    });
    assert.equal(hit.count, 1);
    const reorder = await search(Q.ACEITE, {
      rows: [row({ mes_cargo: "2026-08", concepto: "MOTOR ACEITE para unidad" })],
    });
    assert.equal(reorder.count, 0);
  });

  it("R-FOLIO-LANG-020/021: filtros de aire", async () => {
    const f = extractFolioSearchFilters(Q.FILTROS, { now: NOW });
    assert.equal(f.concept_query, "filtros de aire");
    const payload = await search(Q.FILTROS, {
      rows: [row({ concepto: "FILTRO DE AIRE cabina" })],
    });
    assert.equal(payload.count, 1);
  });

  it("R-FOLIO-LANG-022: bomba de agua", async () => {
    const f = extractFolioSearchFilters(Q.BOMBA_AGUA, { now: NOW });
    assert.equal(f.concept_query, "bomba de agua");
    const payload = await search(Q.BOMBA_AGUA, {
      rows: [row({ concepto: "BOMBA DE AGUA motor" })],
    });
    assert.equal(payload.count, 1);
  });
});

describe("R-FOLIO-LANG periodo y scope congelados", () => {
  it("R-FOLIO-LANG-029/030: mes explícito del turno actual", () => {
    assert.equal(extractFolioSearchFilters(Q.NORTH, { now: NOW }).period_month, "2026-07");
    assert.equal(extractFolioSearchFilters(Q.AUG, { now: NOW }).period_month, "2026-08");
    assert.equal(extractFolioSearchFilters(Q.SEP, { now: NOW }).period_month, "2026-09");
  });

  it("R-FOLIO-LANG-031/032/033: scopes", () => {
    assert.equal(resolveFolioSearchScope(Q.FOLIOS_JUL), SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(resolveFolioSearchScope(Q.NORTH), SCOPE_SUPPORT_FAMILIES);
    assert.equal(resolveFolioSearchScope(Q.SEP), SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("R-FOLIO-LANG-034: no Action Register", async () => {
    let ar = 0;
    const payload = await search(Q.NORTH, {
      loadActionRegister: async () => {
        ar += 1;
        return {};
      },
    });
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(ar, 0);
    assert.doesNotMatch(result.answer, /Action Register/i);
    assert.equal(payload.count, 1);
  });
});

describe("R-FOLIO-LANG contratos de archivo", () => {
  it("R-FOLIO-LANG-035/037: no SQL nuevo ni query IGF alterada", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /\bINSERT\b/);
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const selects = igf.match(/FROM public\.folios f/g) || [];
    assert.equal(selects.length, 1);
  });

  it("R-FOLIO-LANG-036: no dependencia nueva", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /require\(["'](?!\.\/)[^"']+/);
  });

  it("R-FOLIO-LANG-038: no vocabulario de negocio en producto", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /llantas?/i);
    assert.doesNotMatch(helper, /bombas?/i);
    assert.doesNotMatch(helper, /motores?/i);
    assert.doesNotMatch(helper, /\bluces?\b/i);
    assert.doesNotMatch(helper, /parabrisas/i);
    assert.doesNotMatch(helper, /gasolina/i);
    assert.doesNotMatch(helper, /aceite de motor/i);
  });
});
