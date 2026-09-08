"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { DIRECTOR_IA_VERACITY } = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  fmtKg,
  fmtDescKg,
  fmtMxn,
  fmtTon,
  FMT_UNAVAILABLE,
  getDeltaIngresoClientes,
  getDeltaIngresoDatosInternal,
  buildDeltaVentaDatosPayload,
  buildDeltaDescuentoDatosPayload,
  loadDeltaVentaForChat,
  loadDeltaDescuentoForChat,
  loadDeltaIngresoForChat,
  buildDeltaIngresoAnswer,
} = require("../lib/director-ia-m9-deltas");
const {
  assembleFinancialDiagnosisEvidence,
  formatFinancialDiagnosisContext,
} = require("../lib/director-ia-financial-diagnosis");
const { loadArrMetricsForPlant } = require("../lib/director-ia-igf-arr");
const { isArrForecastQuestion } = require("../lib/director-ia-igf-arr");

const ROOT = path.join(__dirname, "..");
const M9_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-m9-deltas.js"), "utf8");
const FD_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-financial-diagnosis.js"), "utf8");

function gitDiff(relPath) {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", relPath], {
    encoding: "utf8",
    cwd: ROOT,
  }).trim();
}

function ingresoClient(rows) {
  return {
    query: async () => ({ rows }),
  };
}

function plant() {
  return { planta_id: 1, planta_nombre: "Planta Norte", plant_code: "PN" };
}

function notFoundFamily() {
  return { ok: false, code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND, error: "No hay dos periodos" };
}

function errorFamily() {
  return { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR, error: "db down" };
}

function restrictedFamily() {
  return { ok: false, code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED, error: "GA" };
}

function availableVenta() {
  return {
    ok: true,
    family: "delta_venta",
    semantic_class: "delta_venta_period_compare",
    unit: "kg",
    planta_id: 1,
    planta_nombre: "Planta Norte",
    planta_clave: "PN",
    periodoA: "2026-01",
    periodoB: "2026-02",
    datos: {
      dejaron: { clientes: [{ cliente: "A", kgA: 1000, kgB: 0, deltaKg: -1000 }] },
      mas: { clientes: [] },
      disminuyeron: { clientes: [] },
    },
  };
}

describe("R-M9-ABSENT-NOT-ZERO", () => {
  it("R-M9-ABSENCE-001 missing margin preserved", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 2000, desc_kg_a: 1, desc_kg_b: 1 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async (_c, _p, _y, m) => (m === 1 ? null : 7.12) }
    );
    assert.equal(out.margenA, null);
    assert.equal(out.margenB, 7.12);
    assert.equal(out.exact_ingreso, false);
    assert.deepEqual(out.missing_inputs, ["margenA"]);
  });

  it("R-M9-ABSENCE-002 missing margin not numeric zero", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 2000, desc_kg_a: 1, desc_kg_b: 1 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async () => null }
    );
    assert.equal(out.margenA, null);
    assert.notEqual(out.margenA, 0);
    assert.equal(out.availability.margenA, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("R-M9-ABSENCE-003 no exact ingreso with missing margin", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 2000, desc_kg_a: 1, desc_kg_b: 1 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async (_c, _p, _y, m) => (m === 1 ? null : 7.12) }
    );
    assert.equal(out.rows[0].ingresoA, null);
    assert.equal(out.rows[0].ingresoB, null);
  });

  it("R-M9-ABSENCE-004 no exact deltaIngreso with missing margin", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 2000, desc_kg_a: 1, desc_kg_b: 1 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async (_c, _p, _y, m) => (m === 1 ? null : 7.12) }
    );
    assert.equal(out.rows[0].deltaIngreso, null);
  });

  it("R-M9-ABSENCE-005 formatter kg null != zero", () => {
    assert.equal(fmtKg(null), FMT_UNAVAILABLE);
    assert.notEqual(fmtKg(null), "0.0");
  });

  it("R-M9-ABSENCE-006 formatter desc null != zero", () => {
    assert.equal(fmtDescKg(null), FMT_UNAVAILABLE);
    assert.notEqual(fmtDescKg(null), "0.00 $/kg");
  });

  it("R-M9-ABSENCE-007 formatter mxn null != zero", () => {
    assert.equal(fmtMxn(null), FMT_UNAVAILABLE);
    assert.notEqual(fmtMxn(null), "");
    assert.notEqual(fmtMxn(null), "$0");
  });

  it("R-M9-ABSENCE-008 formatter ton null != zero", () => {
    assert.equal(fmtTon(null), FMT_UNAVAILABLE);
    assert.notEqual(fmtTon(null), "0.0 ton");
  });

  it("R-M9-ABSENCE-009 physical zero kg remains zero", () => {
    assert.equal(fmtKg(0), "0.0");
  });

  it("R-M9-ABSENCE-010 physical zero desc remains zero", () => {
    assert.equal(fmtDescKg(0), "0.00 $/kg");
  });

  it("R-M9-ABSENCE-011 physical zero mxn remains zero", () => {
    assert.match(fmtMxn(0), /\$0/);
  });

  it("R-M9-ABSENCE-012 period DATA_NOT_FOUND remains DATA_NOT_FOUND", async () => {
    const payload = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "PN", clave: "PN" }),
      listPeriodos: async () => [],
      loadDatos: async () => {
        throw new Error("no datos");
      },
      question: "como cambio la venta",
    });
    assert.equal(payload.ok, false);
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("R-M9-ABSENCE-013 SOURCE_ERROR remains error", async () => {
    const payload = await loadDeltaDescuentoForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "PN", clave: "PN" }),
      listPeriodos: async () => ["2026-02", "2026-01"],
      loadDatos: async () => {
        throw new Error("db down");
      },
    });
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_ERROR);
    assert.notEqual(payload.ok, true);
  });

  it("R-M9-ABSENCE-014 SOURCE_RESTRICTED remains restricted", async () => {
    const payload = await loadDeltaIngresoForChat(null, 1, { dashboardAuth: { role: "GA" } }, {
      loadDatos: async () => {
        throw new Error("no");
      },
    });
    assert.equal(payload.code, DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED);
  });

  it("R-M9-ABSENCE-015 SOURCE_PARTIAL remains partial", async () => {
    const payload = await loadDeltaIngresoForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "PN", clave: "PN" }),
      listPeriodos: async () => ["2026-02", "2026-01"],
      loadDatos: async () => ({
        exact_ingreso: false,
        missing_inputs: ["margenA"],
        dejaron: { clientes: [] },
        mas: { clientes: [] },
        disminuyeron: { clientes: [] },
      }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.availability_status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
  });

  it("R-M9-ABSENCE-016 family availability preserved", async () => {
    const payload = await loadDeltaIngresoForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "PN", clave: "PN" }),
      listPeriodos: async () => ["2026-02", "2026-01"],
      loadDatos: async () => ({
        exact_ingreso: false,
        missing_inputs: ["margenB"],
        margenA: 7.12,
        margenB: null,
      }),
    });
    assert.deepEqual(payload.missing_inputs, ["margenB"]);
  });

  it("R-M9-ABSENCE-017 aggregate M9 partial when one family partial", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: availableVenta(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: {
        ok: true,
        family: "delta_ingreso",
        exact_ingreso: false,
        availability_status: DIRECTOR_IA_VERACITY.SOURCE_PARTIAL,
        missing_inputs: ["margenA"],
        periodoA: "2026-01",
        periodoB: "2026-02",
        datos: { exact_ingreso: false, missing_inputs: ["margenA"] },
      },
    });
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
    assert.equal(assembled.sources.m9.payload.venta.status, DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE);
    assert.equal(assembled.sources.m9.payload.ingreso.status, DIRECTOR_IA_VERACITY.SOURCE_PARTIAL);
  });

  it("R-M9-ABSENCE-018 aggregate M9 not available when all not-found", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: notFoundFamily(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: notFoundFamily(),
    });
    assert.equal(assembled.sources.m9.status, DIRECTOR_IA_VERACITY.DATA_NOT_FOUND);
  });

  it("R-M9-ABSENCE-019 no sin cambios from missing", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: notFoundFamily(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: notFoundFamily(),
    });
    const ctx = formatFinancialDiagnosisContext(assembled);
    assert.doesNotMatch(ctx, /sin cambios|no hubo impacto/i);
    assert.match(ctx, /NO DISPONIBLE/);
  });

  it("R-M9-ABSENCE-020 no numeric M9 zero from missing family", () => {
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: notFoundFamily(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: notFoundFamily(),
    });
    const ctx = formatFinancialDiagnosisContext(assembled);
    assert.doesNotMatch(ctx, /0\.00 \$\/kg/);
    assert.doesNotMatch(ctx, /Delta Venta: 0\b/);
  });

  it("R-M9-ABSENCE-021 Delta Venta legitimate dejaron semantics intact", () => {
    const payload = buildDeltaVentaDatosPayload("PN", "2026-01", "2026-02", [
      { cliente: "Salio", kgA: 1000, kgB: 0, deltaKg: -1000 },
    ]);
    assert.equal(payload.dejaron.clientes[0].kgB, 0);
    assert.equal(payload.dejaron.clientes[0].deltaKg, -1000);
    assert.match(M9_SRC, /COALESCE\(a\.kg, 0\) AS kg_a/);
  });

  it("R-M9-ABSENCE-022 Delta Venta legitimate nuevos semantics intact", () => {
    const payload = buildDeltaVentaDatosPayload("PN", "2026-01", "2026-02", [
      { cliente: "Nuevo", kgA: 0, kgB: 2000, deltaKg: 2000 },
    ]);
    assert.equal(payload.mas.clientes[0].kgA, 0);
    assert.equal(payload.mas.clientes[0].kgB, 2000);
    assert.equal(payload.dejaron.clientes.length, 0);
  });

  it("R-M9-ABSENCE-023 Delta Descuento existing known cases intact", () => {
    const payload = buildDeltaDescuentoDatosPayload("PN", "2026-01", "2026-02", [
      { cliente: "D", ratioA: -1, ratioB: -2, deltaRatio: -1, kgA: 10, kgB: 10 },
    ]);
    assert.equal(payload.mas.clientes[0].deltaRatio, -1);
  });

  it("R-M9-ABSENCE-024 Delta Ingreso known-input calculation intact", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 2000, desc_kg_a: 1, desc_kg_b: 1 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async () => 7.12 }
    );
    assert.equal(out.exact_ingreso, true);
    assert.equal(out.rows[0].ingresoA, 1000 * (7.12 - 1));
    assert.equal(out.rows[0].ingresoB, 2000 * (7.12 - 1));
    assert.equal(out.rows[0].deltaIngreso, out.rows[0].ingresoB - out.rows[0].ingresoA);
  });

  it("R-M9-ABSENCE-025 known-input margin 0 remains 0", async () => {
    const out = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 1000, desc_kg_a: 0, desc_kg_b: 0 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async () => 0 }
    );
    assert.equal(out.margenA, 0);
    assert.equal(out.exact_ingreso, true);
    assert.equal(out.rows[0].ingresoA, 0);
  });

  it("R-M9-ABSENCE-026 missing margin distinct from margin 0", async () => {
    const missing = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 1000, desc_kg_a: 0, desc_kg_b: 0 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async () => null }
    );
    const zero = await getDeltaIngresoClientes(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 1000, desc_kg_a: 0, desc_kg_b: 0 }]),
      "PN",
      "2026-01",
      "2026-02",
      { getMargenKgPorPeriodo: async () => 0 }
    );
    assert.equal(missing.margenA, null);
    assert.equal(zero.margenA, 0);
    assert.notEqual(missing.exact_ingreso, zero.exact_ingreso);
  });

  it("R-M9-ABSENCE-027 invalid period not represented as margin 0", async () => {
    const out = await getDeltaIngresoClientes(ingresoClient([]), "PN", "bad", "also-bad", {
      getMargenKgPorPeriodo: async () => {
        throw new Error("no margen");
      },
    });
    assert.equal(out.margenA, null);
    assert.equal(out.margenB, null);
    assert.equal(out.exact_ingreso, false);
  });

  it("R-M9-ABSENCE-028 no Number(null)-style zero for missing margin", () => {
    assert.doesNotMatch(M9_SRC, /margenA = \(await loadMargen[\s\S]{0,80}\)\s*\?\?\s*0/);
    assert.equal(Number(null), 0);
    assert.notEqual(finiteProbe(), 0);
  });

  it("R-M9-ABSENCE-029 no || 0 for UNKNOWN essential inputs", () => {
    assert.doesNotMatch(M9_SRC, /margenA\s*\|\|\s*0/);
    assert.doesNotMatch(M9_SRC, /margenB\s*\|\|\s*0/);
  });

  it("R-M9-ABSENCE-030 no ?? 0 for UNKNOWN essential inputs", () => {
    assert.doesNotMatch(M9_SRC, /loadMargen\([^\n]+\) \?\? 0/);
    assert.doesNotMatch(M9_SRC, /margenA \?\? 0|margenB \?\? 0/);
  });

  it("R-M9-ABSENCE-031 financial evidence null_is_not_zero intact", () => {
    assert.match(FD_SRC, /null no es 0/);
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: notFoundFamily(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: notFoundFamily(),
    });
    assert.ok(assembled.limitations.includes("null_no_es_cero"));
  });

  it("R-M9-ABSENCE-032 causality prohibition intact", () => {
    assert.match(FD_SRC, /No afirmes causa|no_causalidad|Prohibido: causalidad/);
    const assembled = assembleFinancialDiagnosisEvidence({
      plant: plant(),
      year: 2026,
      month: 2,
      igfRaw: { version_id: 1, version_number: 1, row: { venta_ton: 1 }, composition: { ok: true, lines: [], omitted_null_keys: [] } },
      arrRaw: { observed_venta_ton: 1, projected_venta_ton: 2, desc_kg: 1 },
      m9Venta: notFoundFamily(),
      m9Descuento: notFoundFamily(),
      m9Ingreso: notFoundFamily(),
    });
    assert.ok(assembled.limitations.includes("no_causalidad"));
  });

  it("R-M9-ABSENCE-033 ARR Root1 semantics intact", async () => {
    const curr = await loadArrMetricsForPlant(null, 2026, 9, "PN", {
      fechaCorte: "2026-09-08",
      now: new Date(2026, 8, 8),
      loadParity: async (_p, opts) => {
        if (opts.month === 9) {
          return { actual_to_date: { venta_ton: 302 }, forecast: { venta_ton: 1522.76, desc_kg: -4.84 } };
        }
        return { actual_to_date: { venta_ton: 1176 }, forecast: { venta_ton: 9, desc_kg: -1 } };
      },
    });
    assert.equal(curr.observed_venta_ton, 302);
    assert.equal(curr.projected_venta_ton, 1522.76);
    assert.notEqual(curr.observed_venta_ton, curr.projected_venta_ton);
  });

  it("R-M9-ABSENCE-034 ARR projected/observed fields intact", () => {
    assert.equal(gitDiff("lib/director-ia-igf-arr.js"), "");
  });

  it("R-M9-ABSENCE-035 IGF commitment separation intact", () => {
    const igf = fs.readFileSync(path.join(ROOT, "lib", "director-ia-igf-arr.js"), "utf8");
    assert.match(igf, /Compromiso venta IGF/);
    assert.doesNotMatch(igf, /arrCurr\.venta_ton != null \? arrCurr\.venta_ton : ventaIgf/);
  });

  it("R-M9-ABSENCE-036 planner unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
    assert.equal(planDirectorIaQuestion("por qué cayó el ingreso").intent, "financial_diagnosis");
  });

  it("R-M9-ABSENCE-037 routing unchanged", () => {
    assert.equal(isArrForecastQuestion("cuánto proyectamos vender"), false);
    assert.equal(gitDiff("lib/director-ia-planner.js"), "");
  });

  it("R-M9-ABSENCE-038 DICF unchanged", () => {
    assert.equal(gitDiff("lib/dicf.js"), "");
  });

  it("R-M9-ABSENCE-039 commercial_state unchanged", () => {
    assert.equal(gitDiff("lib/director-ia-commercial-state.js"), "");
  });

  it("R-M9-ABSENCE-040 authz unchanged", async () => {
    const ga = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "GA" } }, {});
    const gv = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "GV" } }, {});
    assert.equal(ga.status, 403);
    assert.equal(gv.status, 403);
  });

  it("R-M9-ABSENCE-041 plant scope unchanged", async () => {
    const r = await loadDeltaVentaForChat(null, 2, { dashboardAuth: { role: "GG", plantas_permitidas: [1] } }, {});
    assert.equal(r.status, 403);
  });

  it("R-M9-ABSENCE-042 no schema change", () => {
    assert.doesNotMatch(M9_SRC, /ALTER TABLE|CREATE TABLE|DROP TABLE/i);
  });

  it("R-M9-ABSENCE-043 no dependency change", () => {
    assert.match(M9_SRC, /require\("\.\/director-ia-capabilities"\)/);
    assert.doesNotMatch(M9_SRC, /require\("(?!\.)[^"]+"\)/);
  });

  it("R-M9-ABSENCE-044 no LIVE_DB required", () => {
    assert.equal(typeof getDeltaIngresoClientes, "function");
  });

  it("R-M9-ABSENCE-045 no hardcoded plant/period values", () => {
    assert.doesNotMatch(M9_SRC, /Puebla/);
    assert.doesNotMatch(M9_SRC, /2026-09-08/);
  });

  it("R-M9-ABSENCE-046 no new source invented", () => {
    assert.match(M9_SRC, /arr\.ventas_diarias_cliente/);
    assert.match(M9_SRC, /arr\.descuentos_diarios_cliente/);
    assert.doesNotMatch(M9_SRC, /FROM arr\.[a-z_]+_nueva/);
  });

  it("R-M9-ABSENCE-047 dashboard formulas not redesigned", () => {
    assert.match(M9_SRC, /kg × \(margen/);
    assert.match(M9_SRC, /COALESCE\(a\.kg, 0\)/);
  });

  it("R-M9-ABSENCE-048 existing M9 known-data tests pass", async () => {
    const payload = await loadDeltaVentaForChat(null, 1, { dashboardAuth: { role: "ZP" } }, {
      resolvePlanta: async () => ({ id: 1, nombre: "PN", clave: "PN" }),
      listPeriodos: async () => ["2026-02", "2026-01"],
      loadDatos: async () =>
        buildDeltaVentaDatosPayload("PN", "2026-01", "2026-02", [
          { cliente: "Salio", kgA: 1000, kgB: 0, deltaKg: -1000 },
        ]),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.datos.dejaron.clientes[0].kgB, 0);
    const answer = buildDeltaIngresoAnswer({
      ok: true,
      availability_status: DIRECTOR_IA_VERACITY.SOURCE_PARTIAL,
      missing_inputs: ["margenA"],
      planta_nombre: "PN",
      periodoA: "2026-01",
      periodoB: "2026-02",
      datos: { exact_ingreso: false },
    });
    assert.match(answer, /NO DISPONIBLE/);
    assert.doesNotMatch(answer, /sin cambios/i);
    const datos = await getDeltaIngresoDatosInternal(
      ingresoClient([{ cliente_norm: "C1", kg_a: 1000, kg_b: 0, desc_kg_a: 1, desc_kg_b: 0 }]),
      "PN",
      "2026-01",
      "2026-02",
      false,
      { getMargenKgPorPeriodo: async (_c, _p, _y, m) => (m === 1 ? null : 2) }
    );
    assert.equal(datos.exact_ingreso, false);
    assert.equal(datos.dejaron.totalDeltaIngreso, null);
  });
});

function finiteProbe() {
  const v = null;
  return v == null || v === "" ? null : Number(v);
}
