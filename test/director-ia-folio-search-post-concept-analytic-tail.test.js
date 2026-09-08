"use strict";

/**
 * R-FOLIO-TAIL-001..059 — post-concept analytic tail suffix boundary.
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
  A: "¿Cuánto suman los folios de enero a agosto de liquidaciones? suma los montos en un acumulado por mes",
  H: "¿Cuánto suman los folios de enero a agosto de liquidaciones? dame el monto por mes y acumulado",
  C: "¿Cuánto suman los folios de enero a agosto de liquidaciones?",
  D: "¿Cuánto suman los folios de enero a agosto de liquidaciones por mes?",
  E: "¿Cuánto suman los folios de enero a agosto de liquidaciones? por mes",
  F: "¿Cuánto suman los folios de enero a agosto de liquidaciones? acumulado por mes",
  G: "¿Cuánto suman los folios de enero a agosto de liquidaciones? suma los montos",
  PMS_LIST: "que folios de agosto fueron de POR MES SERVICIOS",
  PMS_AGG: "dame el total de los folios de agosto de POR MES SERVICIOS",
  SMS_LIST: "que folios de agosto fueron de SUMA LOS MONTOS SA",
  SMS_AGG: "suma los montos de los folios de agosto de SUMA LOS MONTOS SA",
  ITS: "que folios de agosto fueron de IMPORTE TOTAL SEGUROS",
  NORTH:
    "cuanto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes",
  ESTAN: "¿Qué apoyos de llantas están en septiembre?",
  ESTAN_BIZ: "que folios de agosto fueron de ESTAN?",
  SERVICIOS_ESTAN: "que folios de agosto fueron de SERVICIOS ESTAN?",
  RENTA: "que folios de agosto fueron de RENTA DEL MES?",
  CURSO: "que folios de agosto fueron de CURSO?",
  TP_LIST: "dame los folios de agosto de TOTAL PLAY",
  TP_AGG: "cuanto suman los folios de agosto de TOTAL PLAY",
  BONOS: "que folios de agosto fueron de bonos o bono?",
  GAS: "qué apoyos de julio fueron de gas?",
  ORING: "que apoyos de enero a agosto fueron de O-RING?",
  ACEITE: "qué apoyos de agosto fueron de aceite de motor?",
  MAYAN: "que apoyos de enero a agosto fueron de MAYAN PALACE?",
  PARTIAL: "que apoyos de enero a agosto fueron de impresora?",
  INVERTED: "folios de agosto a julio de llantas",
  OVER12: "folios de enero 2025 a febrero 2026 de llantas",
  H_EL: "¿Cuánto suman los folios de enero a agosto de liquidaciones? dame el monto por mes y el acumulado",
  G_SING: "¿Cuánto suman los folios de enero a agosto de liquidaciones? suma el monto",
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
    concepto: "LIQUIDACIONES",
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

describe("R-FOLIO-TAIL CASE A/H/C", () => {
  it("R-FOLIO-TAIL-001: CASE A concept", () => {
    assert.equal(filters(Q.A).concept_query, "liquidaciones");
    assert.equal(filters(Q.A).concept_mode, "SINGLE");
  });

  it("R-FOLIO-TAIL-002: CASE A aggregate", () => {
    const f = filters(Q.A);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
  });

  it("R-FOLIO-TAIL-003: CASE A month", () => {
    assert.equal(filters(Q.A).group_by, "MONTH");
  });

  it("R-FOLIO-TAIL-004: CASE A cumulative", () => {
    assert.equal(filters(Q.A).cumulative, "YES");
  });

  it("R-FOLIO-TAIL-005: CASE H concept", () => {
    assert.equal(filters(Q.H).concept_query, "liquidaciones");
  });

  it("R-FOLIO-TAIL-006: CASE H aggregate", () => {
    const f = filters(Q.H);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
  });

  it("R-FOLIO-TAIL-007: CASE H month", () => {
    assert.equal(filters(Q.H).group_by, "MONTH");
  });

  it("R-FOLIO-TAIL-008: CASE H cumulative", () => {
    assert.equal(filters(Q.H).cumulative, "YES");
  });

  it("R-FOLIO-TAIL-009: CASE C", () => {
    const f = filters(Q.C);
    assert.equal(f.concept_query, "liquidaciones");
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.group_by, "NONE");
    assert.equal(f.cumulative, "NO");
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
  });
});

describe("R-FOLIO-TAIL CASE D/E/F/G", () => {
  it("R-FOLIO-TAIL-010: CASE D concept", () => {
    assert.equal(filters(Q.D).concept_query, "liquidaciones");
  });

  it("R-FOLIO-TAIL-011: CASE D MONTH", () => {
    const f = filters(Q.D);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.group_by, "MONTH");
    assert.equal(f.cumulative, "NO");
  });

  it("R-FOLIO-TAIL-012: CASE E", () => {
    const f = filters(Q.E);
    assert.equal(f.concept_query, "liquidaciones");
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.group_by, "MONTH");
    assert.equal(f.cumulative, "NO");
  });

  it("R-FOLIO-TAIL-013: CASE F concept", () => {
    assert.equal(filters(Q.F).concept_query, "liquidaciones");
  });

  it("R-FOLIO-TAIL-014: CASE F cumulative", () => {
    const f = filters(Q.F);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.group_by, "MONTH");
    assert.equal(f.cumulative, "YES");
  });

  it("R-FOLIO-TAIL-015: CASE G concept", () => {
    assert.equal(filters(Q.G).concept_query, "liquidaciones");
  });

  it("R-FOLIO-TAIL-016: CASE G aggregate", () => {
    const f = filters(Q.G);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
    assert.equal(f.group_by, "NONE");
    assert.equal(f.cumulative, "NO");
  });
});

describe("R-FOLIO-TAIL BUSINESS DATA y North Star", () => {
  it("R-FOLIO-TAIL-017: POR MES SERVICIOS LIST", () => {
    const f = filters(Q.PMS_LIST);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "por mes servicios");
  });

  it("R-FOLIO-TAIL-018: POR MES SERVICIOS AGG", () => {
    const f = filters(Q.PMS_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "por mes servicios");
  });

  it("R-FOLIO-TAIL-019: SUMA LOS MONTOS SA LIST", () => {
    const f = filters(Q.SMS_LIST);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "suma los montos sa");
  });

  it("R-FOLIO-TAIL-020: SUMA LOS MONTOS SA AGG", () => {
    const f = filters(Q.SMS_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "suma los montos sa");
  });

  it("R-FOLIO-TAIL-021: IMPORTE TOTAL SEGUROS", () => {
    const f = filters(Q.ITS);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "importe total seguros");
  });

  it("R-FOLIO-TAIL-022: North Star concept", () => {
    assert.equal(filters(Q.NORTH).concept_query, "remodelacion de taller");
  });

  it("R-FOLIO-TAIL-023: North Star RANGE", () => {
    const f = filters(Q.NORTH);
    assert.equal(f.scope, SCOPE_SUPPORT_FAMILIES);
    assert.equal(f.period_mode, "RANGE");
    assert.equal(f.period_start, "2026-01");
    assert.equal(f.period_end, "2026-08");
  });

  it("R-FOLIO-TAIL-024: North Star MONTH", () => {
    const f = filters(Q.NORTH);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
    assert.equal(f.group_by, "MONTH");
  });

  it("R-FOLIO-TAIL-025: North Star cumulative", () => {
    assert.equal(filters(Q.NORTH).cumulative, "YES");
  });
});

describe("R-FOLIO-TAIL ESTAN y protected span", () => {
  it("R-FOLIO-TAIL-026: ESTAN regression", () => {
    const f = filters(Q.ESTAN);
    assert.equal(f.concept_query, "llantas");
    assert.equal(f.period_month, "2026-09");
    assert.equal(f.analysis_mode, "LIST");
  });

  it("R-FOLIO-TAIL-027: ESTAN business data", () => {
    assert.equal(filters(Q.ESTAN_BIZ).concept_query, "estan");
    assert.equal(filters(Q.SERVICIOS_ESTAN).concept_query, "servicios estan");
  });

  it("R-FOLIO-TAIL-028: RENTA DEL MES", () => {
    assert.equal(filters(Q.RENTA).concept_query, "renta del mes");
  });

  it("R-FOLIO-TAIL-029: CURSO", () => {
    assert.equal(filters(Q.CURSO).concept_query, "curso");
  });

  it("R-FOLIO-TAIL-030: TOTAL PLAY LIST", () => {
    const f = filters(Q.TP_LIST);
    assert.equal(f.analysis_mode, "LIST");
    assert.equal(f.concept_query, "total play");
  });

  it("R-FOLIO-TAIL-031: TOTAL PLAY AGG", () => {
    const f = filters(Q.TP_AGG);
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.concept_query, "total play");
  });
});

describe("R-FOLIO-TAIL NULL / full-set / monthly", () => {
  it("R-FOLIO-TAIL-032: NULL != 0", () => {
    assert.notEqual(Number(null), classifyImporte(null).amount);
    assert.equal(classifyImporte(null).kind, "UNKNOWN");
    assert.equal(classifyImporte(0).kind, "KNOWN");
    assert.equal(classifyImporte(0).amount, 0);
  });

  it("R-FOLIO-TAIL-033: zero known", () => {
    assert.deepEqual(classifyImporte(0), { kind: "KNOWN", amount: 0 });
  });

  it("R-FOLIO-TAIL-034: null unknown", () => {
    assert.equal(classifyImporte(null).kind, "UNKNOWN");
  });

  it("R-FOLIO-TAIL-035: blank unknown", () => {
    assert.equal(classifyImporte("").kind, "UNKNOWN");
    assert.equal(classifyImporte("   ").kind, "UNKNOWN");
  });

  it("R-FOLIO-TAIL-036: nonfinite unknown", () => {
    assert.equal(classifyImporte("x").kind, "UNKNOWN");
    assert.equal(classifyImporte(undefined).kind, "UNKNOWN");
  });

  it("R-FOLIO-TAIL-037/038/039/040: unknown no suma; count; complete flags", async () => {
    const mixed = await search(Q.C, {
      rows: [row({ importe: 10 }), row({ id: 2, numero_folio: "F-2", importe: null })],
    });
    assert.equal(mixed.payload.analysis.known_total, 10);
    assert.equal(mixed.payload.analysis.unknown_amount_count, 1);
    assert.equal(mixed.payload.analysis.is_complete, false);
    assert.match(buildFolioSearchAnswer(mixed.payload), /importe conocido/i);
    const complete = await search(Q.C, { rows: [row({ importe: 10 })] });
    assert.equal(complete.payload.analysis.is_complete, true);
    assert.match(buildFolioSearchAnswer(complete.payload), /importe total/i);
  });

  it("R-FOLIO-TAIL-041: CANCELADO excluded", async () => {
    const cancelled = await search(Q.C, {
      rows: [row({ importe: null, estatus: "CANCELADO" }), row({ id: 2, numero_folio: "F-2", importe: 8 })],
    });
    assert.equal(cancelled.payload.analysis.unknown_amount_count, 0);
    assert.equal(cancelled.payload.analysis.known_total, 8);
  });

  it("R-FOLIO-TAIL-042: PAGADO null unknown", async () => {
    const paid = await search(Q.C, {
      rows: [row({ importe: null, estatus: "PAGADO" })],
    });
    assert.equal(paid.payload.analysis.unknown_amount_count, 1);
    assert.equal(paid.payload.analysis.is_complete, false);
  });

  it("R-FOLIO-TAIL-043/044/045/046: empty month complete; null month incomplete; running", async () => {
    const { payload } = await search(Q.A, {
      rows: [
        row({ id: 1, mes_cargo: "2026-01", concepto: "LIQUIDACIONES", importe: 10 }),
        row({ id: 2, mes_cargo: "2026-03", concepto: "LIQUIDACIONES", importe: null }),
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

  it("R-FOLIO-TAIL-047: aggregate >40 full set", async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      row({ id: i + 1, numero_folio: `F-${i + 1}`, importe: 1, concepto: "LIQUIDACIONES" })
    );
    const agg = await search(Q.C, { rows: many });
    assert.equal(agg.payload.analysis.aggregate_eligible_count, 45);
    assert.equal(agg.payload.analysis.known_total, 45);
  });

  it("R-FOLIO-TAIL-048: LIST cap40", async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      row({ id: i + 1, numero_folio: `F-${i + 1}`, importe: 1, concepto: "TOTAL PLAY" })
    );
    const list = await search(Q.TP_LIST, { rows: many });
    assert.equal(list.payload.count, 45);
    assert.equal(list.payload.records.length, 40);
  });
});

describe("R-FOLIO-TAIL composition, range y freeze", () => {
  it("R-FOLIO-TAIL-049: ANY bonos|bono", () => {
    const f = filters(Q.BONOS);
    assert.equal(f.concept_mode, "ANY");
    assert.deepEqual(f.concept_alternatives, ["bonos", "bono"]);
  });

  it("R-FOLIO-TAIL-050: gas != gasolina", async () => {
    const hit = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "Carga de GAS LP" })] });
    const miss = await search(Q.GAS, { rows: [row({ mes_cargo: "2026-07", concepto: "GASOLINA magna" })] });
    assert.equal(hit.payload.count, 1);
    assert.equal(miss.payload.count, 0);
  });

  it("R-FOLIO-TAIL-051: O-RING", () => {
    assert.equal(filters(Q.ORING).concept_query, "o-ring");
  });

  it("R-FOLIO-TAIL-052: aceite de motor", () => {
    assert.equal(filters(Q.ACEITE).concept_query, "aceite de motor");
  });

  it("R-FOLIO-TAIL-053: MAYAN PALACE", () => {
    assert.equal(filters(Q.MAYAN).concept_query, "mayan palace");
  });

  it("R-FOLIO-TAIL-054: partial range fail closed", async () => {
    const { payload } = await search(Q.PARTIAL, {
      queryPublicFolios: async (_c, _p, mesCargo) => {
        if (mesCargo === "2026-04") throw new Error("fuente abril");
        return [];
      },
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.period_code, "partial_month_failure");
  });

  it("R-FOLIO-TAIL-055: inverted range 0 calls", async () => {
    const { payload, calls } = await search(Q.INVERTED);
    assert.equal(payload.period_code, "inverted_range");
    assert.equal(calls.length, 0);
  });

  it("R-FOLIO-TAIL-056: range >12 0 calls", async () => {
    const { payload, calls } = await search(Q.OVER12);
    assert.equal(payload.period_code, "range_too_long");
    assert.equal(calls.length, 0);
  });

  it("R-FOLIO-TAIL-057: planner unchanged", () => {
    const planner = read("lib/director-ia-planner.js");
    assert.doesNotMatch(planner, /locateConceptSpan/);
    assert.doesNotMatch(planner, /shrinkPostConceptAnalyticTail/);
    assert.doesNotMatch(planner, /POST_CONCEPT_ANALYTIC_TAIL/);
    assert.doesNotMatch(planner, /analysis_mode/);
  });

  it("R-FOLIO-TAIL-058: routing unchanged", () => {
    const tools = read("lib/director-ia-tools.js");
    const caps = read("lib/director-ia-capabilities.js");
    const orch = read("lib/director-ia-tool-orchestrator.js");
    assert.doesNotMatch(tools, /shrinkPostConceptAnalyticTail/);
    assert.doesNotMatch(caps, /shrinkPostConceptAnalyticTail/);
    assert.doesNotMatch(orch, /shrinkPostConceptAnalyticTail/);
    assert.doesNotMatch(tools, /POST_CONCEPT_ANALYTIC_TAIL/);
    assert.doesNotMatch(caps, /POST_CONCEPT_ANALYTIC_TAIL/);
    assert.doesNotMatch(orch, /POST_CONCEPT_ANALYTIC_TAIL/);
  });

  it("R-FOLIO-TAIL-059: SQL/dependency unchanged", () => {
    const helper = read("lib/director-ia-folio-search.js");
    assert.doesNotMatch(helper, /\bSELECT\b/);
    assert.doesNotMatch(helper, /FROM public\.folios/);
    assert.match(helper, /queryReviewableSupportFolios/);
    assert.doesNotMatch(helper, /require\(["'](?!\.\/)[^"']+/);
    assert.match(helper, /shrinkEstanPeriodBridge/);
    assert.match(helper, /shrinkPostConceptAnalyticTail/);
    assert.doesNotMatch(helper, /STRUCTURAL_TOKENS\.pop\(/);
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.dependencies["analytic-tail"], undefined);
  });
});

describe("R-FOLIO-TAIL suffix grammar extras", () => {
  it("R-FOLIO-TAIL dame el monto por mes y el acumulado", () => {
    const f = filters(Q.H_EL);
    assert.equal(f.concept_query, "liquidaciones");
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.group_by, "MONTH");
    assert.equal(f.cumulative, "YES");
  });

  it("R-FOLIO-TAIL suma el monto singular", () => {
    const f = filters(Q.G_SING);
    assert.equal(f.concept_query, "liquidaciones");
    assert.equal(f.analysis_mode, "AGGREGATE");
    assert.equal(f.aggregation, "SUM");
    assert.equal(f.group_by, "NONE");
    assert.equal(f.cumulative, "NO");
  });
});
