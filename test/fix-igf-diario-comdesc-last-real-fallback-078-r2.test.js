"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const grafica = require("../lib/igf-diario-grafica");
const forecast = require("../lib/dashboard-arr-forecast");
const weekly = require("../lib/igf-diario-weekly-plant");
const excel = require("../lib/igf-diario-weekly-excel");

const ROOT = path.join(__dirname, "..");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

function expenses() {
  return {
    gasto_corporativo: 0,
    inversiones: 0,
    impuestos_federales: 0,
    presupuesto_nomina_gastos: 0,
    presupuesto_imss_sua: 0,
    extraordinarios: 0,
    provisiones_planta: 0,
  };
}

function promPack(desc) {
  return {
    promVentaCasa: [],
    promVentaComisionista: [],
    promDescTotal: desc,
    promVentaTotal: [],
    proyVentaTotal: 0,
  };
}

function monthOf(opts) {
  const plant = opts.plant || "Planta";
  return grafica.materializePlantMonth({
    year: opts.year,
    month: opts.month,
    plant,
    corteYmd: opts.corte,
    project: true,
    projection: {
      corteYmdStr: opts.corte,
      byPlant: new Map([[plant, promPack(opts.promDesc || ["-9", "-9", "-9", "-9", "-9", "-9", "-9"])]]),
    },
    casaTon: opts.casa || new Map(),
    comTon: opts.com || new Map(),
    cdByFecha: opts.rates || new Map(),
    priorCdByFecha: opts.prior || new Map(),
    skipDay1Fallback: true,
  });
}

function dayOf(series, fecha) {
  const day = series.resolved.find((row) => row.fecha === fecha);
  assert.ok(day, fecha);
  return day;
}

function rate(fecha, ventaKg, ownRate, sameMonthRates, priorMonthRates) {
  return grafica.resolveRealDayComDesc({
    fecha,
    ventaKg,
    ownRate,
    sameMonthRates,
    priorMonthRates,
  });
}

test("A–J la tasa real propia y el antecedente capturado tienen precedencia cerrada", () => {
  const october = new Map([
    ["2026-10-02", -1],
    ["2026-10-03", 0],
    ["2026-10-05", -8],
  ]);
  const september = new Map([
    ["2026-09-28", -2.5],
    ["2026-09-30", -1.25],
  ]);
  const august = new Map([["2026-08-31", -7]]);

  const own = rate("2026-10-04", 10, -3, october, september);
  assert.equal(own.cdKg, -3);
  assert.equal(own.source, "REAL");
  assert.equal(own.sourceDate, null);

  const zero = rate("2026-10-04", 10, 0, october, september);
  assert.equal(zero.cdKg, 0);
  assert.equal(zero.source, "REAL");

  const zeroFallback = rate("2026-10-04", 10, null, new Map([["2026-10-03", 0]]), september);
  assert.equal(zeroFallback.cdKg, 0);
  assert.equal(zeroFallback.source, "LAST_REAL_FALLBACK");
  assert.equal(zeroFallback.sourceDate, "2026-10-03");

  const recent = rate("2026-10-04", 10, null, october, september);
  assert.equal(recent.cdKg, 0);
  assert.equal(recent.sourceDate, "2026-10-03");

  const dayOne = rate("2026-10-01", 10, null, new Map(), september);
  assert.equal(dayOne.cdKg, -1.25);
  assert.equal(dayOne.source, "LAST_REAL_FALLBACK");
  assert.equal(dayOne.sourceDate, "2026-09-30");

  const none = rate("2026-10-04", 10, null, new Map(), new Map());
  assert.equal(none.cdKg, null);
  assert.equal(none.source, "NULL");

  const tooOld = rate("2026-10-01", 10, null, new Map(), august);
  assert.equal(tooOld.cdKg, null);
  assert.equal(tooOld.source, "NULL");

  const future = rate("2026-10-04", 10, null, new Map([["2026-10-05", -8]]), september);
  assert.equal(future.cdKg, -1.25);
  assert.equal(future.sourceDate, "2026-09-30");

  const noSale = rate("2026-10-04", 0, null, october, september);
  assert.equal(noSale.cdKg, null);
  assert.equal(noSale.source, "NULL");
});

test("el fallback no reutiliza una tasa ya rellenada ni un forecast", () => {
  const captured = new Map([["2026-10-01", -2]]);
  const first = rate("2026-10-02", 10, null, captured, new Map());
  const second = rate("2026-10-03", 10, null, captured, new Map());
  assert.equal(first.sourceDate, "2026-10-01");
  assert.equal(second.sourceDate, "2026-10-01");
  assert.equal(second.cdKg, -2);

  const series = monthOf({
    year: 2026,
    month: 10,
    corte: "2026-10-09",
    casa: new Map([
      ["2026-10-02", 1],
      ["2026-10-03", 1],
      ["2026-10-04", 1],
    ]),
    rates: captured,
    promDesc: ["-9", "-9", "-9", "-9", "-9", "-9", "-9"],
  });
  for (const fecha of ["2026-10-02", "2026-10-03", "2026-10-04"]) {
    const day = dayOf(series, fecha);
    assert.equal(day.cdKg, -2);
    assert.equal(day.cdSource, "LAST_REAL_FALLBACK");
    assert.equal(day.cdSourceDate, "2026-10-01");
    assert.notEqual(day.cdKg, -9);
  }
});

test("San Luis 04/10 usa la tasa real del 03/10 y el día proyectado conserva el forecast", () => {
  const series = monthOf({
    year: 2026,
    month: 10,
    plant: "San Luis",
    corte: "2026-10-09",
    casa: new Map([["2026-10-04", 1.701], ["2026-10-09", 2], ["2026-10-10", 3]]),
    rates: new Map([
      ["2026-10-03", -4.33],
      ["2026-10-10", 0],
    ]),
    promDesc: ["-4", "-4.19", "-4.12", "-3.87", "-3.85", "-4.3", ""],
  });
  const sunday = dayOf(series, "2026-10-04");
  assert.equal(sunday.ventaKg, 1701);
  assert.equal(sunday.cdKg, -4.33);
  assert.equal(sunday.cdSource, "LAST_REAL_FALLBACK");
  assert.equal(sunday.cdSourceDate, "2026-10-03");

  const projected = dayOf(series, "2026-10-09");
  assert.equal(projected.cdKg, -3.85);
  assert.equal(projected.cdSource, "FORECAST");
  assert.equal(forecast.resolveComisionCd(null, "2026-10-09", "2026-10-09", -3.85), -3.85);

  const capturedZero = dayOf(series, "2026-10-10");
  assert.equal(capturedZero.cdKg, -4.3);
  assert.equal(capturedZero.cdSource, "FORECAST");
  assert.equal(forecast.resolveComisionCd(0, "2026-10-10", "2026-10-09", -4.3), -4.3);
});

test("el resultado diario usa la fórmula existente y la cobertura de 077 incorpora el kilo", async () => {
  const series = monthOf({
    year: 2026,
    month: 10,
    plant: "San Luis",
    corte: "2026-10-09",
    casa: new Map([["2026-10-04", 1.701]]),
    rates: new Map([["2026-10-03", -4.33]]),
  });
  const resolved = dayOf(series, "2026-10-04");
  const day = {
    fecha: resolved.fecha,
    ventaKg: resolved.ventaKg,
    precio: 21,
    costoKg: 11,
    fleteKg: 1,
    hgImporte: -100,
    cdKg: resolved.cdKg,
    cdSource: resolved.cdSource,
    cdSourceDate: resolved.cdSourceDate,
    expenses: expenses(),
  };
  const metrics = weekly.dayMetrics(day).metrics;
  assert.equal(metrics.venta_kg, 1701);
  assert.equal(metrics.com_desc_kg, -4.33);
  close(metrics.resultado_kg, metrics.sobrante_con_hg_kg + metrics.com_desc_kg);
  close(metrics.resultado_mxn, weekly.dayResultMxn(day));
  close(metrics.resultado_mxn, metrics.resultado_kg * metrics.venta_kg);
  assert.ok(metrics.resultado_mxn != null);

  const covered = weekly.aggregateWeek([
    day,
    { ...day, fecha: "2026-10-05", ventaKg: 10, cdKg: -1, cdSource: "REAL", cdSourceDate: null },
  ], "2026-10-09");
  assert.equal(covered.coverage.resultado.days_covered, 2);
  assert.equal(covered.coverage.resultado.days_with_sales, 2);
  assert.equal(covered.coverage.resultado.kg_covered, covered.metrics.venta_kg);
  assert.equal(covered.coverage.resultado.coverage_kg_pct, 100);
  assert.equal(covered.coverage.resultado.coverage_days_pct, 100);

  const gap = weekly.aggregateWeek([
    { ...day, cdKg: null, cdSource: "NULL", cdSourceDate: null },
  ], "2026-10-09");
  assert.equal(gap.metrics.resultado_mxn, null);
  assert.equal(gap.coverage.resultado.kg_covered, 0);
  assert.equal(gap.coverage.resultado.days_covered, 0);

  const records = weekly.weekDayRecords([day], "2026-10-09");
  assert.equal(records[0].com_desc_source, "LAST_REAL_FALLBACK");
  assert.equal(records[0].com_desc_source_date, "2026-10-03");
  assert.equal(records[0].missing_components.length, 0);

  const otras = weekly.aggregateWeek([
    { ...day, fecha: "2026-10-05", ventaKg: 100, cdKg: -2, cdSource: "REAL", cdSourceDate: null },
  ], "2026-10-09");
  const todas = weekly.consolidateCovered([
    { metrics: covered.metrics, coverage: covered.coverage },
    { metrics: otras.metrics, coverage: otras.coverage },
  ]);
  close(todas.metrics.resultado_kg, todas.metrics.resultado_mxn / todas.coverage.resultado.kg_covered);
  assert.equal(
    todas.coverage.resultado.kg_covered,
    covered.coverage.resultado.kg_covered + otras.coverage.resultado.kg_covered
  );
  assert.ok(todas.coverage.resultado.kg_covered >= 1701);

  const summary = {
    empresa: "SAN LUIS",
    week: { week_number: 41, fecha_desde: "2026-10-04", fecha_hasta: "2026-10-04" },
    metrics: covered.metrics,
    coverage: covered.coverage,
    days: records,
  };
  const svg = excel.chartSvg(summary, "resultado_kg");
  assert.match(svg, /<circle /);
  const wb = new ExcelJS.Workbook();
  await excel.fillResumen(wb, summary, "resultado_kg");
  const ws = wb.getWorksheet("RESUMEN");
  let excelRate = null;
  let excelKg = null;
  let excelMxn = null;
  for (let row = 1; row <= ws.rowCount; row += 1) {
    const label = ws.getCell(row, 1).value;
    if (label === "Comisiones y Descuentos") excelRate = ws.getCell(row, 3).value;
    if (label === "RESULTADO ($/kg)") excelKg = ws.getCell(row, 3).value;
    if (label === "RESULTADO (Importe)") excelMxn = ws.getCell(row, 3).value;
  }
  close(excelRate, records[0].metrics.com_desc_kg);
  close(excelKg, records[0].metrics.resultado_kg);
  close(excelMxn, records[0].metrics.resultado_mxn);
});

test("el producto no fija la planta, la fecha ni la tasa del caso", () => {
  for (const source of [GRAFICA, WEEKLY]) {
    assert.equal(source.includes("San Luis"), false);
    assert.equal(source.includes("-4.33"), false);
    assert.equal(source.includes("2026-10-04"), false);
    assert.equal(source.includes("2026-10-03"), false);
  }
  assert.match(FORECAST, /function resolveComisionCd\(primary, fecha, corteYmd, forecastValue\)/);
  assert.match(FORECAST, /Día desmarcado no entra\./);
  assert.equal(GRAFICA.includes("pronostico_dias_seleccion"), false);
  assert.equal(WEEKLY.includes("computePromMesByDow"), false);
  assert.equal(WEEKLY.includes("weekdayPromAt"), false);
});
