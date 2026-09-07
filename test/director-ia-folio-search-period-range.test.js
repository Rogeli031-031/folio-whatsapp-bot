"use strict";

/**
 * R-FOLIO-RANGE-001..040 — rangos mensuales naturales.
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

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-07T12:00:00-06:00");

const Q = Object.freeze({
  NORTH: "que apoyos de enero a agosto fueron de IMPRESORA?",
  DE: "apoyos de enero a agosto de impresora",
  DESDE: "folios desde enero hasta agosto de llantas",
  HYPHEN: "folios enero-agosto de llantas",
  JUL_AGO: "folios de julio a agosto de isuzu",
  AGO_AGO: "folios de agosto a agosto de isuzu",
  MULTI: "folios de diciembre 2025 a febrero 2026 de llantas",
  INVERT: "folios de agosto a julio de llantas",
  OVER12: "folios de enero 2025 a febrero 2026 de llantas",
  YEAR: "apoyos de enero a agosto de 2026 de impresora",
  NO_CONCEPT: "qué apoyos de enero a agosto?",
  SINGLE_LLANTA: "qué apoyos de julio fueron de llantas?",
  SINGLE_ACEITE: "qué apoyos de agosto fueron de aceite?",
  SINGLE_GAS: "qué apoyos de julio fueron de gas?",
  FOLIOS: "folios de enero a agosto de llantas",
  APOYOS: "apoyos de enero a agosto de impresora",
  BOTH: "que apoyos/folios tenemos para enero a agosto de llantas?",
});

function row(over = {}) {
  return {
    id: 1,
    numero_folio: "F-1",
    folio_codigo: "F-1",
    planta_id: 1,
    mes_cargo: "2026-01",
    importe: 10,
    estatus: "AUTORIZADO",
    categoria: "GASTOS",
    subcategoria: "",
    concepto: "IMPRESORA LASER",
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
        if (typeof extras.onMonth === "function") extras.onMonth(mesCargo);
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

function monthList(start, end) {
  const out = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

describe("R-FOLIO-RANGE North Star", () => {
  it("R-FOLIO-RANGE-001/002/003/004/005/006: North Star RANGE impresora", async () => {
    const f = extractFolioSearchFilters(Q.NORTH, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_month, null);
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "impresora");
    assert.notEqual(f.concept_query, "a fueron de impresora");
    assert.equal(f.scope, SCOPE_SUPPORT_FAMILIES);

    const jan = row({ id: 11, numero_folio: "F-JAN", mes_cargo: "2026-01", concepto: "IMPRESORA LASER" });
    const aug = row({ id: 18, numero_folio: "F-AUG", mes_cargo: "2026-08", concepto: "TONER IMPRESORA" });
    const { payload, calls } = await search(Q.NORTH, { rows: [jan, aug] });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 2);
    assert.deepEqual(calls, monthList("2026-01", "2026-08"));
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /mes_cargo 2026-01 a 2026-08/);
    assert.doesNotMatch(answer, /Filtros: mes_cargo 2026-01,/);
  });
});

describe("R-FOLIO-RANGE formas de span", () => {
  it("R-FOLIO-RANGE-007: de enero a agosto", () => {
    const f = extractFolioSearchFilters(Q.DE, { now: NOW });
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "impresora");
  });

  it("R-FOLIO-RANGE-008: desde enero hasta agosto", () => {
    const f = extractFolioSearchFilters(Q.DESDE, { now: NOW });
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.scope, SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("R-FOLIO-RANGE-009: enero-agosto", () => {
    const f = extractFolioSearchFilters(Q.HYPHEN, { now: NOW });
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "llantas");
  });

  it("R-FOLIO-RANGE-010: julio a agosto", () => {
    const f = extractFolioSearchFilters(Q.JUL_AGO, { now: NOW });
    assert.equal(f.period_start, "2026-07");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "isuzu");
  });

  it("R-FOLIO-RANGE-011: agosto a agosto RANGE un mes", () => {
    const f = extractFolioSearchFilters(Q.AGO_AGO, { now: NOW });
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-08");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.period_month, null);
    assert.equal(f.concept_query, "isuzu");
  });

  it("R-FOLIO-RANGE-012/013: diciembre 2025 a febrero 2026", () => {
    const f = extractFolioSearchFilters(Q.MULTI, { now: NOW });
    assert.equal(f.period_start, "2025-12");
    assert.equal(f.period_end, "2026-02");
    assert.equal(f.concept_query, "llantas");
  });

  it("R-FOLIO-RANGE año explícito único", () => {
    const f = extractFolioSearchFilters(Q.YEAR, { now: NOW });
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.concept_query, "impresora");
  });
});

describe("R-FOLIO-RANGE fail-closed", () => {
  it("R-FOLIO-RANGE-014/015: agosto a julio no rollover", async () => {
    const f = extractFolioSearchFilters(Q.INVERT, { now: NOW });
    assert.equal(f.period_code, "inverted_range");
    const { payload, calls } = await search(Q.INVERT);
    assert.equal(payload.ok, false);
    assert.equal(payload.period_code, "inverted_range");
    assert.match(String(payload.error), /rango inicial es posterior al final/i);
    assert.equal(calls.length, 0);
    assert.notEqual(f.period_start, "2025-08");
  });

  it("R-FOLIO-RANGE-016: más de 12 meses fail-closed", async () => {
    const f = extractFolioSearchFilters(Q.OVER12, { now: NOW });
    assert.equal(f.period_code, "range_too_long");
    const { payload, calls } = await search(Q.OVER12);
    assert.equal(payload.ok, false);
    assert.equal(payload.period_code, "range_too_long");
    assert.equal(calls.length, 0);
  });
});

describe("R-FOLIO-RANGE fetch", () => {
  it("R-FOLIO-RANGE-017/018/019: 8 llamadas cronológicas", async () => {
    const { calls } = await search(Q.NORTH, {
      rows: [row({ mes_cargo: "2026-01" }), row({ id: 8, mes_cargo: "2026-08" })],
    });
    assert.deepEqual(calls, ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  it("R-FOLIO-RANGE-020/021/022: misma fuente, no SQL nuevo ni copiado", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.match(helper, /queryReviewableSupportFolios/);
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /\bINSERT\b/);
    assert.doesNotMatch(helper, /\bBETWEEN\b/i);
    assert.doesNotMatch(helper, /FROM public\.folios/);
    const igf = read("lib/director-ia-igf-reviewable-supports.js");
    const selects = igf.match(/FROM public\.folios f/g) || [];
    assert.equal(selects.length, 1);
    assert.match(igf, /WHERE f\.mes_cargo = \$1/);
  });

  it("R-FOLIO-RANGE-023/024: partial failure fail-closed", async () => {
    const { payload } = await search(Q.NORTH, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        if (mesCargo === "2026-04") throw new Error("fuente abril");
        return [];
      },
    });
    assert.equal(payload.ok, false);
    assert.match(String(payload.error), /abril|2026-04|fuente/i);
    const answer = buildFolioSearchAnswer(payload);
    assert.doesNotMatch(answer, /Encontré \d+ apoyos/);
  });
});

describe("R-FOLIO-RANGE merge y límite", () => {
  it("R-FOLIO-RANGE-025: dedup por folio id", async () => {
    const same = row({ id: 77, numero_folio: "F-77", mes_cargo: "2026-01", concepto: "IMPRESORA" });
    const { payload } = await search(Q.NORTH, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        if (mesCargo === "2026-01" || mesCargo === "2026-02") {
          return [{ ...same, mes_cargo: mesCargo }];
        }
        return [];
      },
    });
    assert.equal(payload.count, 1);
    assert.equal(payload.records[0].folio_id, 77);
  });

  it("R-FOLIO-RANGE-026/027: RECORD_LIMIT global 40", async () => {
    let n = 0;
    const { payload } = await search(Q.NO_CONCEPT, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        const batch = [];
        for (let i = 0; i < 6; i += 1) {
          n += 1;
          batch.push(
            row({
              id: n,
              numero_folio: `F-${n}`,
              mes_cargo: mesCargo,
              concepto: `APOYO ${n}`,
            })
          );
        }
        return batch;
      },
    });
    assert.equal(payload.count, 48);
    assert.equal(payload.truncated, true);
    assert.equal(payload.records.length, 40);
  });

  it("R-FOLIO-RANGE-028: respuesta declara start/end", async () => {
    const { payload } = await search(Q.NORTH, {
      rows: [row({ concepto: "IMPRESORA" })],
    });
    const answer = buildFolioSearchAnswer(payload);
    assert.match(answer, /mes_cargo 2026-01 a 2026-08/);
    assert.match(answer, /concepto impresora/);
  });

  it("R-FOLIO-RANGE-029: sin concepto lista el rango", async () => {
    const f = extractFolioSearchFilters(Q.NO_CONCEPT, { now: NOW });
    assert.equal(f.concept_query, null);
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    const { payload } = await search(Q.NO_CONCEPT, {
      rows: [
        row({ id: 1, mes_cargo: "2026-01", concepto: "SIN CONCEPTO FILTRO" }),
        row({ id: 2, mes_cargo: "2026-08", concepto: "OTRO" }),
      ],
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 2);
    assert.equal(payload.filters.scope, SCOPE_SUPPORT_FAMILIES);
  });
});

describe("R-FOLIO-RANGE SINGLE y contratos congelados", () => {
  it("R-FOLIO-RANGE-030: SINGLE julio llantas", async () => {
    const f = extractFolioSearchFilters(Q.SINGLE_LLANTA, { now: NOW });
    assert.equal(f.period_mode, "SINGLE");
    assert.equal(f.period_month, "2026-07");
    assert.equal(f.period_start, null);
    assert.equal(f.period_end, null);
    assert.equal(f.concept_query, "llantas");
    const { payload, calls } = await search(Q.SINGLE_LLANTA, {
      rows: [row({ id: 36, mes_cargo: "2026-07", concepto: "AT-36 (4) LLANTA 11R22.5 LINEAL" })],
    });
    assert.deepEqual(calls, ["2026-07"]);
    assert.equal(payload.count, 1);
    assert.match(buildFolioSearchAnswer(payload), /mes_cargo 2026-07/);
    assert.doesNotMatch(buildFolioSearchAnswer(payload), /mes_cargo 2026-07 a /);
  });

  it("R-FOLIO-RANGE-031: SINGLE agosto aceite", () => {
    const f = extractFolioSearchFilters(Q.SINGLE_ACEITE, { now: NOW });
    assert.equal(f.period_mode, "SINGLE");
    assert.equal(f.period_month, "2026-08");
    assert.equal(f.concept_query, "aceite");
  });

  it("R-FOLIO-RANGE-032/035: SINGLE julio gas != gasolina", async () => {
    const f = extractFolioSearchFilters(Q.SINGLE_GAS, { now: NOW });
    assert.equal(f.period_mode, "SINGLE");
    assert.equal(f.period_month, "2026-07");
    assert.equal(f.concept_query, "gas");
    const hit = await search(Q.SINGLE_GAS, {
      rows: [row({ mes_cargo: "2026-07", concepto: "Carga de GAS LP" })],
    });
    const miss = await search(Q.SINGLE_GAS, {
      rows: [row({ mes_cargo: "2026-07", concepto: "GASOLINA magna" })],
    });
    assert.equal(hit.payload.count, 1);
    assert.equal(miss.payload.count, 0);
  });

  it("R-FOLIO-RANGE-033: frame vigente no cambia", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.match(
      helper,
      /\/\^\(\?:\(\?:fueron\|son\|eran\)\\s\+de\|relacionad\[oa\]s\?\\s\+con\)\\s\+\//
    );
    assert.equal(extractFolioSearchFilters(Q.SINGLE_LLANTA, { now: NOW }).concept_query, "llantas");
  });

  it("R-FOLIO-RANGE-034: morphology vigente no cambia", async () => {
    const { payload } = await search(Q.SINGLE_LLANTA, {
      rows: [row({ mes_cargo: "2026-07", concepto: "AT-36 (4) LLANTA 11R22.5 LINEAL" })],
    });
    assert.equal(payload.count, 1);
    const helper = read("lib/director-ia-folio-search.js");
    assert.match(helper, /function tokenEquivalent/);
    assert.match(helper, /function isControlledPluralPair/);
    assert.doesNotMatch(helper, /stem/i);
  });

  it("R-FOLIO-RANGE-036/037/038: scopes congelados", () => {
    assert.equal(resolveFolioSearchScope(Q.FOLIOS), SCOPE_ALL_PUBLIC_FOLIOS);
    assert.equal(resolveFolioSearchScope(Q.APOYOS), SCOPE_SUPPORT_FAMILIES);
    assert.equal(resolveFolioSearchScope(Q.BOTH), SCOPE_ALL_PUBLIC_FOLIOS);
  });

  it("R-FOLIO-RANGE-039: no Action Register", async () => {
    let ar = 0;
    const { payload } = await search(Q.NORTH, {
      rows: [row()],
      loadActionRegister: async () => {
        ar += 1;
        return {};
      },
    });
    const result = buildFolioSearchChatResult(payload, { planta_id: 1 });
    assert.equal(ar, 0);
    assert.doesNotMatch(result.answer, /Action Register/i);
  });

  it("R-FOLIO-RANGE-040: no dependencia nueva ni a global", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /require\(["'](?!\.\/)[^"']+/);
    assert.doesNotMatch(helper, /STRUCTURAL_TOKENS[\s\S]*"[\\]?a"/);
    assert.match(helper, /"apoyos"/);
  });
});
