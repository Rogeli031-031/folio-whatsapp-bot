"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const weekly = require("../lib/igf-diario-weekly-plant");
const excel = require("../lib/igf-diario-weekly-excel");

const ROOT = path.join(__dirname, "..");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyPlantPanel.tsx"), "utf8");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const PKG = fs.readFileSync(path.join(ROOT, "package.json"), "utf8");

function expenses(extra) {
  return {
    gasto_corporativo: 10,
    inversiones: 5,
    impuestos_federales: 4,
    presupuesto_nomina_gastos: 8,
    presupuesto_imss_sua: 3,
    extraordinarios: 2,
    provisiones_planta: 1,
    ...extra,
  };
}

function day(fecha, ventaKg, extra) {
  return {
    fecha,
    ventaKg,
    precio: 10,
    costoKg: 4,
    fleteKg: 1,
    hgImporte: 10,
    cdKg: -0.2,
    expenses: expenses(),
    legacyResultadoMxn: null,
    legacyResultadoKg: null,
    ...extra,
  };
}

const SALES = [null, 16585, 19286, 24210, 30260, 22960, 29730];
const FECHAS = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];

test("San Luis suma la venta conocida y no convierte el domingo null en cero", () => {
  const days = FECHAS.map((fecha, index) => day(fecha, SALES[index], index === 0 ? { precio: 21.5, costoKg: 8.25, fleteKg: 1.5 } : {}));
  const pack = weekly.aggregateWeek(days, "2026-10-06");
  assert.equal(pack.metrics.venta_kg, 143031);
  assert.equal(weekly.weekDayRecords(days, "2026-10-06")[0].metrics.venta_kg, null);
  assert.notEqual(weekly.weekDayRecords(days, "2026-10-06")[0].metrics.venta_kg, 0);
  assert.equal(weekly.dayMetrics(days[0]).metrics.precio_kg, 21.5);
  assert.equal(weekly.dayMetrics(days[0]).metrics.costo_kg, 8.25);
  assert.equal(weekly.dayMetrics(days[0]).metrics.flete_kg, 1.5);
  assert.equal(weekly.dayMetrics(days[0]).metrics.margen_kg, 21.5 - 8.25 - 1.5);
  assert.equal(weekly.dayMetrics(days[0]).metrics.ingreso_mxn, null);
  assert.equal(weekly.dayMetrics(days[0]).metrics.hg_mxn, 10);
  const sold = days.slice(1);
  const precio = sold.reduce((sum, item) => sum + item.precio * item.ventaKg, 0) / 143031;
  assert.equal(pack.metrics.precio_kg, precio);
  assert.equal(pack.metrics.costo_kg, 4);
  assert.equal(pack.metrics.flete_kg, 1);
  assert.equal(pack.metrics.ingreso_mxn, sold.reduce((sum, item) => sum + item.precio * item.ventaKg, 0));
  assert.equal(pack.metrics.hg_mxn, 70);
  assert.notEqual(pack.metrics.resultado_mxn, null);
  assert.equal(pack.metrics.resultado_kg, pack.metrics.resultado_mxn / pack.metrics.venta_kg);
  assert.ok(Math.abs(pack.metrics.resultado_kg * 143031 - pack.metrics.resultado_mxn) < 1e-6);
  const broken = days.map((item, index) => (index === 1 ? { ...item, precio: null } : item));
  assert.equal(weekly.aggregateWeek(broken, "2026-10-06").metrics.ingreso_mxn, null);
  assert.equal(weekly.aggregateWeek(broken, "2026-10-06").metrics.precio_kg, null);
  const missingCost = days.map((item, index) => (index === 2 ? { ...item, costoKg: null } : item));
  assert.equal(weekly.aggregateWeek(missingCost, "2026-10-06").metrics.costo_kg, null);
  assert.equal(weekly.aggregateWeek(missingCost, "2026-10-06").metrics.venta_kg, 143031);
  const incomplete = days.map((item, index) => (index === 3 ? { ...item, cdKg: null } : item));
  const partialWeek = weekly.aggregateWeek(incomplete, "2026-10-06");
  assert.equal(weekly.dayMetrics(incomplete[3]).metrics.com_desc_kg, null);
  assert.equal(weekly.dayMetrics(incomplete[3]).metrics.resultado_mxn, null);
  const coveredMxn = incomplete.reduce((sum, item) => {
    const value = weekly.dayResultMxn(item);
    return value == null ? sum : sum + value;
  }, 0);
  assert.equal(partialWeek.metrics.resultado_mxn, coveredMxn);
  assert.equal(partialWeek.metrics.resultado_kg, coveredMxn / partialWeek.coverage.resultado.kg_covered);
  assert.notEqual(partialWeek.coverage.resultado.kg_covered, partialWeek.metrics.venta_kg);
});

test("5D usa los primeros cinco días de la semana seleccionada", () => {
  const current = weekly.fiveDayWindow("2026-10-06");
  assert.equal(current.desde, "2026-10-04");
  assert.equal(current.hasta, "2026-10-08");
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((offset) => weekly.addDays(current.desde, offset)),
    ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]
  );
  assert.notEqual(current.desde, "2026-10-27");
  const previous = weekly.fiveDayWindow("2026-09-28");
  assert.equal(previous.desde, "2026-09-27");
  assert.equal(previous.hasta, "2026-10-01");
  const series = WEEKLY.slice(WEEKLY.indexOf("async function loadWeeklySeries"), WEEKLY.indexOf("module.exports"));
  const five = series.slice(0, series.indexOf("} else {"));
  assert.match(five, /fiveDayWindow/);
  assert.doesNotMatch(five, /monthEnd/);
  assert.match(series, /monthEnd/);
  const route = SERVER.slice(SERVER.indexOf('app.get("/api/dashboard/igf-diario-semanal"'), SERVER.indexOf('app.get("/api/dashboard/igf-diario-folios-deposito"'));
  const seriesCall = route.slice(route.indexOf("loadWeeklySeries"), route.indexOf("loadWeeklyPlant"));
  assert.match(seriesCall, /weekAnchor/);
  assert.match(MODAL, /weekAnchor/);
  assert.match(MODAL, /view: "series"/);
  assert.match(PANEL, /weekAnchor=\{anchor\}/);
});

test("el Excel individual abre RESUMEN como primera hoja con la gráfica", async () => {
  const days = FECHAS.map((fecha, index) => day(fecha, SALES[index]));
  const summary = {
    empresa: "San Luis",
    plant_code: "San Luis",
    week: weekly.weekOf("2026-10-06"),
    metrics: weekly.aggregateWeek(days, "2026-10-06").metrics,
    days: weekly.weekDayRecords(days, "2026-10-06"),
  };
  summary.week.estado = "parcial";
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("RESUMEN");
  wb.addWorksheet("IGF Diario San Luis");
  await excel.fillResumen(wb, summary, "resultado_mxn");
  const raw = await wb.xlsx.writeBuffer();
  const opened = new ExcelJS.Workbook();
  await opened.xlsx.load(raw);
  assert.equal(opened.worksheets[0].name, "RESUMEN");
  assert.ok(opened.worksheets.some((sheet) => sheet.name === "IGF Diario San Luis"));
  const sheet = opened.getWorksheet("RESUMEN");
  assert.equal(sheet.getCell("A1").value, "IGF DIARIO SEMANAL · SAN LUIS");
  assert.equal(sheet.getCell("A2").value, "SEMANA 41 · 04/10/2026–10/10/2026");
  assert.equal(sheet.getCell(4, 1).value, "Concepto");
  assert.equal(sheet.getCell(4, 2).value, "Semana");
  assert.equal(sheet.getCell(4, 3).value, "Dom 04/10");
  assert.equal(sheet.getCell(4, 9).value, "Sáb 10/10");
  const ventaRow = excel.ROWS.findIndex((row) => row.key === "venta_kg");
  const ventaExcelRow = 5 + ventaRow;
  assert.equal(sheet.getCell(ventaExcelRow, 1).value, "Venta en Kilos");
  assert.equal(sheet.getCell(ventaExcelRow, 2).value, 143031);
  assert.equal(sheet.getCell(ventaExcelRow, 2).numFmt, "#,##0");
  assert.equal(sheet.getCell(ventaExcelRow, 3).value, "—");
  assert.equal(sheet.getCell(ventaExcelRow, 4).value, 16585);
  const resultRow = excel.ROWS.findIndex((row) => row.key === "resultado_mxn");
  const separatorsBeforeResult = excel.ROWS.slice(0, resultRow).filter((row) => row.separatorBefore).length;
  const resultExcelRow = 5 + resultRow + separatorsBeforeResult;
  assert.equal(sheet.getCell(resultExcelRow, 2).value, summary.metrics.resultado_mxn);
  assert.equal(sheet.getCell(resultExcelRow, 2).numFmt, "#,##0.00");
  assert.ok(sheet.getImages().length >= 1);
  const margen = await excel.chartPng(summary, "margen_kg");
  assert.ok(Buffer.isBuffer(margen));
  assert.match(excel.chartSvg(summary, "margen_kg"), /Margen Bruto/);
  assert.match(excel.chartSvg(summary, "no-existe"), /RESULTADO \(Importe\)/);
  assert.equal(excel.knownMetric("margen_kg"), "margen_kg");
  assert.equal(excel.knownMetric("inventada"), "resultado_mxn");
  const svg = excel.chartSvg(summary, "resultado_mxn");
  assert.doesNotMatch(svg, /points="56\.0,/);
});

test("RESUMEN individual no reordena Todas y no agrega dependencias", () => {
  const fn = FORECAST.slice(FORECAST.indexOf("async function generarDashboardArrForecast"), FORECAST.indexOf("async function fetchForecastKgByPlantMap"));
  assert.ok(fn.indexOf('wb.addWorksheet("RESUMEN")') < fn.indexOf("reserveSheet"));
  assert.match(fn, /igfWeeklySummary/);
  assert.match(fn, /if \(!exportPlant\)/);
  const excelRoute = SERVER.slice(SERVER.indexOf('app.get("/api/arr/dashboard-excel"'), SERVER.indexOf("Lista periodos IGF"));
  assert.match(excelRoute, /week_anchor/);
  assert.match(excelRoute, /summary_metric/);
  assert.match(excelRoute, /loadWeeklyPlant/);
  assert.match(excelRoute, /pronosticoProjection/);
  assert.match(MODAL, /summary_metric/);
  assert.match(MODAL, /week_anchor/);
  assert.match(MODAL, /URLSearchParams|new URL\(/);
  assert.match(PKG, /"sharp"/);
  assert.match(PKG, /"exceljs"/);
  assert.doesNotMatch(excel.chartSvg({ days: [], week: { week_number: 41 } }, "resultado_mxn"), /<image|href="https?:/);
});
