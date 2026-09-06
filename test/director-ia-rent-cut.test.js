"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fx = require("./fixtures/director-ia-rent-cut");
const { resolveUploadDayLikeClientesPorMes } = require("../lib/igf-effective-proy-target");
const { assembleRentabilidadDeterioroSnapshot } = require("../lib/director-ia-rentabilidad-deterioro-snapshot");

function deltaTopN() {
  return {
    ok: true,
    planta_id: 1,
    planta_nombre: fx.PLANT,
    source_helper: "computeDeltaIngresoClientesPorMes",
    physical_source: "dashboard-arr-forecast.computeClientesDescuentoMes",
    top_n: 5,
    requested_n: 5,
    list_total_negative: 7,
    list_truncated: true,
    impacto_top_n: -690000,
    rows: [
      { cliente: "CLIENTE_N1", delta_ingreso: -250000, kg_a: 10000, kg_b: 4000 },
      { cliente: "CLIENTE_N2", delta_ingreso: -180000, kg_a: 8000, kg_b: 3500 },
      { cliente: "CLIENTE_N3", delta_ingreso: -120000, kg_a: 7000, kg_b: 3200 },
      { cliente: "CLIENTE_N4", delta_ingreso: -90000, kg_a: 5000, kg_b: 2200 },
      { cliente: "CLIENTE_N5", delta_ingreso: -50000, kg_a: 4000, kg_b: 2100 },
    ],
    margen_a: 8,
    margen_b: 7.5,
  };
}

function miniLoader(calls) {
  return async (_client, opts) => {
    calls.push({ year: opts.year, month: opts.month, upload_day: opts.upload_day || null });
    return fx.computeRentCutMiniPayload(opts);
  };
}

describe("R-RENT-CUT fixture / B_UPLOAD_DAY", () => {
  it("R-RENT-CUT-001: A cerrado no depende del upload_day de B", async () => {
    const withNull = fx.computeRentCutMiniPayload({
      year: fx.YEAR_A,
      month: fx.MONTH_A,
      upload_day: null,
      now: fx.NOW,
    });
    const withB = fx.computeRentCutMiniPayload({
      year: fx.YEAR_A,
      month: fx.MONTH_A,
      upload_day: fx.UPLOAD_DAY_B,
      now: fx.NOW,
    });
    assert.equal(withNull.rows[0].ventaTon, fx.EXPECTED_A.ventaTon);
    assert.equal(withB.rows[0].ventaTon, fx.EXPECTED_A.ventaTon);
    assert.equal(withNull.rows[0].resultadoFinalImporte, withB.rows[0].resultadoFinalImporte);
    assert.equal(withNull.rows[0].utilOperImporte, fx.EXPECTED_A.utilOperImporte);
  });

  it("R-RENT-CUT-002: B abierto + upload_day=null llega al mini como MTD", () => {
    const mtd = fx.computeRentCutMiniPayload({
      year: fx.YEAR_B,
      month: fx.MONTH_B,
      upload_day: null,
      now: fx.NOW,
    });
    const forecast = fx.computeRentCutMiniPayload({
      year: fx.YEAR_B,
      month: fx.MONTH_B,
      upload_day: fx.UPLOAD_DAY_B,
      now: fx.NOW,
    });
    assert.equal(mtd.rows[0].ventaTon, fx.BRES.B_MTD);
    assert.equal(mtd.rows[0].utilOperImporte, fx.EXPECTED_B_MTD.utilOperImporte);
    assert.equal(mtd.rows[0].resultadoFinalImporte, fx.EXPECTED_B_MTD.resultadoFinalImporte);
    assert.notEqual(mtd.rows[0].ventaTon, forecast.rows[0].ventaTon);
    assert.notEqual(mtd.rows[0].utilOperImporte, forecast.rows[0].utilOperImporte);
    assert.notEqual(mtd.rows[0].resultadoFinalImporte, forecast.rows[0].resultadoFinalImporte);
    assert.equal(forecast.rows[0].ventaTon, fx.EXPECTED_B_DASHBOARD.ventaTon);
  });

  it("R-RENT-CUT-003: resolver canónico last-upload de B", async () => {
    const client = fx.makeUploadLogClient({
      "2026-09": fx.CANONICAL_UPLOAD_LOG_B,
    });
    const day = await resolveUploadDayLikeClientesPorMes(client, fx.YEAR_B, fx.MONTH_B);
    assert.equal(day, fx.UPLOAD_DAY_B);
  });

  it("R-RENT-CUT-004: upload_day resuelto llega a loadIgfForecastMiniPayload", async () => {
    const calls = [];
    await assembleRentabilidadDeterioroSnapshot({
      question: "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?",
      now: fx.NOW,
      loadIgfForecastMiniPayload: miniLoader(calls),
      resolveUploadDay: async (_c, year, month) =>
        Number(year) === fx.YEAR_B && Number(month) === fx.MONTH_B ? fx.UPLOAD_DAY_B : null,
      loadDeltaTopN: async () => deltaTopN(),
    });
    const b = calls.find((c) => Number(c.month) === fx.MONTH_B);
    assert.ok(b, "mini no fue llamado para B");
    assert.equal(b.upload_day, fx.UPLOAD_DAY_B);
  });

  it("R-RENT-CUT-005..008: snapshot B coincide con Dashboard fixture", async () => {
    const calls = [];
    const payload = await assembleRentabilidadDeterioroSnapshot({
      question: "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?",
      now: fx.NOW,
      loadIgfForecastMiniPayload: miniLoader(calls),
      resolveUploadDay: async (_c, year, month) =>
        Number(year) === fx.YEAR_B && Number(month) === fx.MONTH_B ? fx.UPLOAD_DAY_B : null,
      loadDeltaTopN: async () => deltaTopN(),
    });
    assert.equal(payload.ok, true);
    const bCall = calls.find((c) => Number(c.month) === fx.MONTH_B);
    assert.equal(bCall && bCall.upload_day, fx.UPLOAD_DAY_B);
    const miniB = fx.computeRentCutMiniPayload({
      year: fx.YEAR_B,
      month: fx.MONTH_B,
      upload_day: fx.UPLOAD_DAY_B,
      now: fx.NOW,
    });
    assert.equal(miniB.rows[0].ventaTon, fx.EXPECTED_B_DASHBOARD.ventaTon);
    assert.equal(payload.rentabilidad_operativa.b, fx.EXPECTED_B_DASHBOARD.utilOperImporte);
    assert.equal(payload.rentabilidad_final.b, fx.EXPECTED_B_DASHBOARD.resultadoFinalImporte);
    assert.equal(payload.rentabilidad_final.delta, fx.EXPECTED_DELTA_AB);
    assert.notEqual(payload.rentabilidad_final.b, fx.EXPECTED_B_MTD.resultadoFinalImporte);
  });

  it("R-RENT-CUT-009: corporativos no cambian con el corte", () => {
    assert.equal(fx.EXPECTED_A.corporativos, fx.EXPECTED_B_MTD.corporativos);
    assert.equal(fx.EXPECTED_B_MTD.corporativos, fx.EXPECTED_B_DASHBOARD.corporativos);
  });

  it("R-RENT-CUT-010: Delta Ingreso permanece independiente", async () => {
    const payload = await assembleRentabilidadDeterioroSnapshot({
      question: "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?",
      now: fx.NOW,
      loadIgfForecastMiniPayload: miniLoader([]),
      resolveUploadDay: async () => fx.UPLOAD_DAY_B,
      loadDeltaTopN: async () => deltaTopN(),
    });
    assert.equal(payload.source_helper, "computeDeltaIngresoClientesPorMes");
    assert.equal(payload.rows[0].cliente, "CLIENTE_N1");
    assert.equal(payload.rows[0].delta_ingreso, -250000);
  });
});
