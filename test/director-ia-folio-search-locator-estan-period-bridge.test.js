"use strict";

/**
 * R-FOLIO-ESTAN-001..052 — period-adjacent estan bridge.
 * Vocabulario de negocio solo en este archivo de tests.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  extractFolioSearchFilters,
  classifyImporte,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  SCOPE_SUPPORT_FAMILIES,
} = require("../lib/director-ia-folio-search");

const ROOT = path.join(__dirname, "..");
const NOW = new Date("2026-09-07T12:00:00-06:00");

const Q = Object.freeze({
  LLANTAS_ESTAN_SEP: "que apoyos de llantas estan en septiembre?",
  LLANTAS_ESTAN_AUG: "que folios de llantas estan en agosto?",
  LLANTAS_ESTAN_PARA: "que apoyos de llantas estan para septiembre?",
  APOYOS_ESTAN: "que apoyos estan en septiembre?",
  FOLIOS_ESTAN: "que folios estan en agosto?",
  ESTAN: "que folios de agosto fueron de ESTAN?",
  DAME_ESTAN: "dame los folios de agosto de ESTAN",
  SUM_ESTAN: "cuanto suman los folios de agosto de ESTAN?",
  SERVICIOS_ESTAN: "que folios de agosto fueron de SERVICIOS ESTAN?",
  TENEMOS: "que apoyos de llantas tenemos en septiembre?",
  HAY: "que apoyos de llantas hay en septiembre?",
  EXISTEN: "que apoyos de llantas existen en septiembre?",
  RENTA: "que folios de agosto fueron de RENTA DEL MES?",
  CURSO: "que folios de agosto fueron de CURSO?",
  TP_LIST: "dame los folios de agosto de TOTAL PLAY",
  TP_AGG: "cuanto suman los folios de agosto de TOTAL PLAY",
  ITS_AGG: "cual es el importe total de los folios de agosto de IMPORTE TOTAL SEGUROS?",
  PMS_AGG: "dame el total de los folios de agosto de POR MES SERVICIOS",
  NORTH:
    "cuanto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes",
  BONOS: "que folios de agosto fueron de bonos o bono?",
  GAS: "qué apoyos de julio fueron de gas?",
  ORING: "que apoyos de enero a agosto fueron de O-RING?",
  ACEITE: "qué apoyos de agosto fueron de aceite de motor?",
  MAYAN: "que apoyos de enero a agosto fueron de MAYAN PALACE?",
  PARTIAL: "que apoyos de enero a agosto fueron de impresora?",
  INVERTED: "folios de agosto a julio de llantas",
  OVER12: "folios de enero 2025 a febrero 2026 de llantas",
});

function filters(q) {
  return extractFolioSearchFilters(q, { now: NOW });
}

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
    concepto: "ESTAN",
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

describe("R-FOLIO-ESTAN period bridge", () => {
  it("R-FOLIO-ESTAN-001: llantas estan en septiembre", () => {
    const f = filters(Q.LLANTAS_ESTAN_SEP);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.period_month, "2026-09");
  });

  it("R-FOLIO-ESTAN-002: llantas estan en agosto", () => {
    const f = filters(Q.LLANTAS_ESTAN_AUG);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.period_month, "2026-08");
  });

  it("R-FOLIO-ESTAN-003: llantas estan para septiembre", () => {
    const f = filters(Q.LLANTAS_ESTAN_PARA);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.period_month, "2026-09");
  });

  it("R-FOLIO-ESTAN-004: apoyos estan en septiembre no concept", () => {
    const f = filters(Q.APOYOS_ESTAN);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, null);
    assert.equal(f.period_month, "2026-09");
  });

  it("R-FOLIO-ESTAN-005: folios estan en agosto no concept", () => {
    const f = filters(Q.FOLIOS_ESTAN);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, null);
    assert.equal(f.period_month, "2026-08");
  });
});

describe("R-FOLIO-ESTAN business data", () => {
  it("R-FOLIO-ESTAN-006: ESTAN como concepto", () => {
    const f = filters(Q.ESTAN);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "estan");
  });

  it("R-FOLIO-ESTAN-007: dame ESTAN como concepto", () => {
    const f = filters(Q.DAME_ESTAN);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "estan");
  });

  it("R-FOLIO-ESTAN-008: aggregate ESTAN", () => {
    const f = filters(Q.SUM_ESTAN);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "estan");
  });

  it("R-FOLIO-ESTAN-009: SERVICIOS ESTAN", () => {
    const f = filters(Q.SERVICIOS_ESTAN);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "servicios estan");
  });
});

describe("R-FOLIO-ESTAN controles congelados", () => {
  it("R-FOLIO-ESTAN-010: tenemos control", () => {
    assert.equal(filters(Q.TENEMOS).concept_query, "llantas");
  });

  it("R-FOLIO-ESTAN-011: hay control", () => {
    assert.equal(filters(Q.HAY).concept_query, "llantas");
  });

  it("R-FOLIO-ESTAN-012: existen control", () => {
    assert.equal(filters(Q.EXISTEN).concept_query, "llantas");
  });

  it("R-FOLIO-ESTAN-013: RENTA DEL MES", () => {
    assert.equal(filters(Q.RENTA).concept_query, "renta del mes");
    assert.equal(filters(Q.RENTA).analysis_mode, "LIST");
  });

  it("R-FOLIO-ESTAN-014: CURSO", () => {
    assert.equal(filters(Q.CURSO).concept_query, "curso");
  });

  it("R-FOLIO-ESTAN-015: TOTAL PLAY LIST", () => {
    const f = filters(Q.TP_LIST);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "total play");
  });

  it("R-FOLIO-ESTAN-016: TOTAL PLAY AGG", () => {
    const f = filters(Q.TP_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "total play");
  });

  it("R-FOLIO-ESTAN-017: IMPORTE TOTAL SEGUROS AGG", () => {
    const f = filters(Q.ITS_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "importe total seguros");
  });

  it("R-FOLIO-ESTAN-018: POR MES SERVICIOS AGG", () => {
    const f = filters(Q.PMS_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "por mes servicios");
    assert.equal(f.group_by, "NONE");
  });
});

describe("R-FOLIO-ESTAN North Star y Option B", () => {
  it("R-FOLIO-ESTAN-019/020/021/022: North Star", () => {
    const f = filters(Q.NORTH);
    assert.equal(f.scope, SCOPE_SUPPORT_FAMILIES);
    assert.equal(f.concept_query, "remodelacion de taller");
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
    assert.equal(f.group_by, "MONTH");
    assert.equal(f.cumulative, "YES");
  });

  it("R-FOLIO-ESTAN-023/024/025/026/027/028: classify states", () => {
    assert.deepEqual(classifyImporte(0), { kind: "KNOWN", amount: 0 });
    assert.deepEqual(classifyImporte(12.5), { kind: "KNOWN", amount: 12.5 });
    assert.equal(classifyImporte(null).kind, "UNKNOWN");
    assert.equal(classifyImporte(undefined).kind, "UNKNOWN");
    assert.equal(classifyImporte("").kind, "UNKNOWN");
    assert.equal(classifyImporte("   ").kind, "UNKNOWN");
    assert.equal(classifyImporte("x").kind, "UNKNOWN");
  });

  it("R-FOLIO-ESTAN-029/030/031/032: unknown no suma; complete flags", async () => {
    const mixed = await search(Q.SUM_ESTAN, {
      rows: [row({ importe: 10 }), row({ id: 2, numero_folio: "F-2", importe: null })],
    });
    assert.equal(mixed.payload.analysis.known_total, 10);
    assert.equal(mixed.payload.analysis.unknown_amount_count, 1);
    assert.equal(mixed.payload.analysis.is_complete, false);
    assert.match(buildFolioSearchAnswer(mixed.payload), /importe conocido/i);
    const complete = await search(Q.SUM_ESTAN, { rows: [row({ importe: 10 })] });
    assert.equal(complete.payload.analysis.is_complete, true);
    assert.match(buildFolioSearchAnswer(complete.payload), /importe total/i);
  });

  it("R-FOLIO-ESTAN-033/034: CANCELADO null excluido; PAGADO null unknown", async () => {
    const cancelled = await search(Q.SUM_ESTAN, {
      rows: [row({ importe: null, estatus: "CANCELADO" }), row({ id: 2, numero_folio: "F-2", importe: 8 })],
    });
    assert.equal(cancelled.payload.analysis.unknown_amount_count, 0);
    assert.equal(cancelled.payload.analysis.known_total, 8);
    const paid = await search(Q.SUM_ESTAN, {
      rows: [row({ importe: null, estatus: "PAGADO" })],
    });
    assert.equal(paid.payload.analysis.unknown_amount_count, 1);
    assert.equal(paid.payload.analysis.is_complete, false);
  });
});

describe("R-FOLIO-ESTAN monthly, caps y preservación", () => {
  it("R-FOLIO-ESTAN-035/036/037/038/039: mes vacío, null, running", async () => {
    const { payload } = await search(Q.NORTH, {
      rows: [
        row({ id: 1, mes_cargo: "2026-01", concepto: "REMODELACION DE TALLER", importe: 10 }),
        row({ id: 2, mes_cargo: "2026-03", concepto: "REMODELACION DE TALLER", importe: null }),
      ],
    });
    const months = payload.analysis.months;
    const jan = months.find((m) => m.mes_cargo === "2026-01");
    const feb = months.find((m) => m.mes_cargo === "2026-02");
    const mar = months.find((m) => m.mes_cargo === "2026-03");
    assert.equal(feb.eligible_count, 0);
    assert.equal(feb.is_complete, true);
    assert.equal(mar.unknown_amount_count, 1);
    assert.equal(mar.running_is_complete, false);
    assert.equal(jan.running_known, 10);
    assert.equal(payload.analysis.known_total, months[months.length - 1].running_known);
  });

  it("R-FOLIO-ESTAN-040/041: full set vs LIST cap 40", async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      row({ id: i + 1, numero_folio: `F-${i + 1}`, importe: 1, concepto: "TOTAL PLAY" })
    );
    const agg = await search(Q.TP_AGG, { rows: many });
    assert.equal(agg.payload.analysis.aggregate_eligible_count, 45);
    assert.equal(agg.payload.analysis.known_total, 45);
    const list = await search(Q.TP_LIST, { rows: many });
    assert.equal(list.payload.count, 45);
    assert.equal(list.payload.records.length, 40);
  });

  it("R-FOLIO-ESTAN-042: ANY bonos|bono", () => {
    const f = filters(Q.BONOS);
    assert.equal(f.concept_mode, "ANY");
    assert.deepEqual(f.concept_alternatives, ["bonos", "bono"]);
  });

  it("R-FOLIO-ESTAN-043: gas != gasolina", async () => {
    const hit = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "Carga de GAS LP" })] });
    const miss = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "GASOLINA magna" })] });
    assert.equal(hit.payload.count, 1);
    assert.equal(miss.payload.count, 0);
  });

  it("R-FOLIO-ESTAN-044: O-RING", () => {
    assert.equal(filters(Q.ORING).concept_query, "o-ring");
  });

  it("R-FOLIO-ESTAN-045: aceite de motor", () => {
    assert.equal(filters(Q.ACEITE).concept_query, "aceite de motor");
  });

  it("R-FOLIO-ESTAN-046: MAYAN PALACE", () => {
    assert.equal(filters(Q.MAYAN).concept_query, "mayan palace");
  });

  it("R-FOLIO-ESTAN-047: partial range fail closed", async () => {
    const { payload } = await search(Q.PARTIAL, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        if (mesCargo === "2026-04") throw new Error("fuente abril");
        return [];
      },
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.period_code, "partial_month_failure");
  });

  it("R-FOLIO-ESTAN-048: inverted range 0 calls", async () => {
    const { payload, calls } = await search(Q.INVERTED);
    assert.equal(payload.period_code, "inverted_range");
    assert.equal(calls.length, 0);
  });

  it("R-FOLIO-ESTAN-049: range >12 0 calls", async () => {
    const { payload, calls } = await search(Q.OVER12);
    assert.equal(payload.period_code, "range_too_long");
    assert.equal(calls.length, 0);
  });

  it("R-FOLIO-ESTAN-050/051/052: planner/SQL/deps unchanged; estan no es leftover global", () => {
    const planner = read("lib/director-ia-planner.js");
    assert.doesNotMatch(planner, /locateConceptSpan/);
    assert.doesNotMatch(planner, /analysis_mode/);
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /FROM public\.folios/);
    assert.match(helper, /queryReviewableSupportFolios/);
    assert.doesNotMatch(helper, /require\(["'](?!\.\/)[^"']+/);
    assert.match(helper, /shrinkEstanPeriodBridge/);
    assert.doesNotMatch(
      helper,
      /CONTROL_LEFTOVER[^\n]*estan/
    );
    const leftover = helper.match(/CONTROL_LEFTOVER_TRAIL_RE =\s*\/[^/]+\//);
    assert.ok(leftover);
    assert.doesNotMatch(leftover[0], /estan/);
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.dependencies["estan-bridge"], undefined);
  });
});
