"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const weekly = require("../lib/igf-diario-weekly-plant");
const excel = require("../lib/igf-diario-weekly-excel");

const ROOT = path.join(__dirname, "..");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyPlantPanel.tsx"), "utf8");
const ALL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyAllPlantsPanel.tsx"), "utf8");
const ROWS = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-diario-weekly-rows.ts"), "utf8");
const PRODUCT = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");

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

function day(fecha, ventaKg, extra) {
  return {
    fecha,
    ventaKg,
    precio: 10,
    costoKg: 4,
    fleteKg: 1,
    hgImporte: 0,
    cdKg: -1,
    expenses: expenses(),
    legacyResultadoMxn: null,
    legacyResultadoKg: null,
    ...extra,
  };
}

function legacyDay(fecha, ventaKg, cdKg, resultadoMxn) {
  return day(fecha, ventaKg, {
    cdKg,
    expenses: null,
    legacyResultadoMxn: resultadoMxn,
    hgImporte: null,
  });
}

const FIXTURE = [
  legacyDay("2026-10-04", 1701, null, null),
  legacyDay("2026-10-05", 16585.100000000002, -3.86, 6585.961215788164),
  legacyDay("2026-10-06", 19285.86, -4.08, -47035.396328334944),
  legacyDay("2026-10-07", 11057.64, -3.37, -70570.08970776577),
  legacyDay("2026-10-08", 28843.14, -3.95, 2974.970516945963),
  legacyDay("2026-10-09", 22960, -4.07, -26792.778011636736),
  legacyDay("2026-10-10", 29730, -4.3, -11560.137598473855),
];

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test("cobertura 100% conserva el resultado anterior", () => {
  const days = ["2026-10-05", "2026-10-06", "2026-10-07"].map((fecha, index) => day(fecha, 100 * (index + 1)));
  const pack = weekly.aggregateWeek(days, "2026-10-09");
  const mxn = days.reduce((sum, item) => sum + weekly.dayResultMxn(item), 0);
  assert.equal(pack.metrics.resultado_mxn, mxn);
  assert.equal(pack.metrics.resultado_kg, mxn / pack.metrics.venta_kg);
  assert.equal(pack.coverage.resultado.days_covered, 3);
  assert.equal(pack.coverage.resultado.days_with_sales, 3);
  assert.equal(pack.coverage.resultado.coverage_days_pct, 100);
  assert.equal(pack.coverage.resultado.coverage_kg_pct, 100);
  assert.equal(pack.coverage.resultado.kg_covered, pack.metrics.venta_kg);
  assert.equal(weekly.coverageCaption(pack.coverage.resultado), null);
});

test("fixture de semana parcial cubre kilos y días sin rellenar el día desconocido", () => {
  const pack = weekly.aggregateWeek(FIXTURE, "2026-10-09");
  const records = weekly.weekDayRecords(FIXTURE, "2026-10-09");
  assert.equal(records[0].metrics.venta_kg, 1701);
  assert.equal(records[0].metrics.com_desc_kg, null);
  assert.equal(records[0].metrics.resultado_kg, null);
  assert.equal(records[0].metrics.resultado_mxn, null);
  assert.deepEqual(records[0].missing_components, ["com_desc_kg", "resultado_kg", "resultado_mxn"]);
  assert.equal(pack.metrics.venta_kg, 130162.74);
  assert.equal(pack.coverage.resultado.kg_total, 130162.74);
  assert.equal(pack.coverage.resultado.kg_covered, 128461.74);
  assert.equal(pack.coverage.resultado.days_with_sales, 7);
  assert.equal(pack.coverage.resultado.days_covered, 6);
  close(pack.coverage.resultado.coverage_kg_pct, 98.69317440613189);
  close(pack.coverage.resultado.coverage_days_pct, 85.71428571428571);
  assert.equal(pack.coverage.resultado.covered_real_kg, 75771.74);
  assert.equal(pack.coverage.resultado.covered_projected_kg, 52690);
  close(pack.metrics.com_desc_kg, -4.010420881734904);
  close(pack.metrics.resultado_kg, -1.1396192353729382);
  close(pack.metrics.resultado_mxn, -146397.4699134772);
  close(pack.metrics.resultado_kg, pack.metrics.resultado_mxn / pack.coverage.resultado.kg_covered);
  assert.notEqual(pack.metrics.resultado_kg, pack.metrics.resultado_mxn / pack.metrics.venta_kg);
  assert.equal(pack.coverage.com_desc_kg.kg_covered, pack.coverage.resultado.kg_covered);
  assert.ok(!PRODUCT.includes("130162.74"));
  assert.ok(!PRODUCT.includes("98.69317440613189"));
  assert.ok(!PRODUCT.includes("San Luis"));
});

test("un día faltante grande o pequeño solo sale del denominador cubierto", () => {
  const smallGap = [
    legacyDay("2026-10-05", 10, null, null),
    legacyDay("2026-10-06", 1000, -2, -200),
  ];
  const largeGap = [
    legacyDay("2026-10-05", 1000, null, null),
    legacyDay("2026-10-06", 10, -2, -20),
  ];
  const small = weekly.aggregateWeek(smallGap, "2026-10-09");
  const large = weekly.aggregateWeek(largeGap, "2026-10-09");
  assert.equal(small.coverage.resultado.kg_covered, 1000);
  assert.equal(small.metrics.resultado_mxn, -200);
  assert.equal(small.metrics.resultado_kg, -0.2);
  assert.equal(large.coverage.resultado.kg_covered, 10);
  assert.equal(large.metrics.resultado_mxn, -20);
  assert.equal(large.metrics.resultado_kg, -2);
  assert.equal(small.metrics.venta_kg, 1010);
  assert.equal(large.metrics.venta_kg, 1010);
});

test("dos días faltantes, el primero y el último, quedan fuera de la suma", () => {
  const days = [
    legacyDay("2026-10-04", 50, null, null),
    legacyDay("2026-10-05", 100, -1, 30),
    legacyDay("2026-10-06", 80, null, null),
    legacyDay("2026-10-10", 70, null, null),
  ];
  const pack = weekly.aggregateWeek(days, "2026-10-09");
  assert.equal(pack.coverage.resultado.days_with_sales, 4);
  assert.equal(pack.coverage.resultado.days_covered, 1);
  assert.equal(pack.coverage.resultado.kg_covered, 100);
  assert.equal(pack.metrics.resultado_mxn, 30);
  assert.equal(pack.metrics.resultado_kg, 0.3);
  assert.equal(pack.metrics.com_desc_kg, -1);
  assert.equal(weekly.weekDayRecords(days, "2026-10-09")[0].missing_components.length, 3);
  assert.equal(weekly.weekDayRecords(days, "2026-10-09")[3].missing_components.length, 3);
});

test("cero explícito entra y null no se convierte en cero", () => {
  const zero = weekly.aggregateWeek([
    legacyDay("2026-10-05", 40, 0, 0),
    legacyDay("2026-10-06", 60, -2, -30),
  ], "2026-10-09");
  assert.equal(zero.metrics.com_desc_kg, (0 * 40 + -2 * 60) / 100);
  assert.equal(zero.metrics.resultado_mxn, -30);
  assert.equal(zero.coverage.resultado.days_covered, 2);
  const missing = weekly.aggregateWeek([
    legacyDay("2026-10-05", 40, null, null),
    legacyDay("2026-10-06", 60, -2, -30),
  ], "2026-10-09");
  assert.equal(missing.coverage.resultado.days_covered, 1);
  assert.equal(missing.metrics.resultado_mxn, -30);
  assert.notEqual(missing.metrics.com_desc_kg, 0);
});

test("sin ningún día cubierto la métrica queda null y la cobertura es 0%", () => {
  const pack = weekly.aggregateWeek([
    legacyDay("2026-10-05", 20, null, null),
    legacyDay("2026-10-06", 30, null, null),
  ], "2026-10-09");
  assert.equal(pack.metrics.com_desc_kg, null);
  assert.equal(pack.metrics.resultado_kg, null);
  assert.equal(pack.metrics.resultado_mxn, null);
  assert.equal(pack.coverage.resultado.kg_covered, 0);
  assert.equal(pack.coverage.resultado.coverage_kg_pct, 0);
  assert.equal(pack.coverage.resultado.coverage_days_pct, 0);
  assert.equal(pack.metrics.venta_kg, 50);
  assert.ok(pack.missing_components.includes("com_desc_kg"));
  assert.ok(pack.missing_components.includes("resultado_mxn"));
});

test("semana sin venta conserva null y no publica cobertura 0%", () => {
  const pack = weekly.aggregateWeek([
    legacyDay("2026-10-05", null, null, null),
    legacyDay("2026-10-06", 0, -1, -5),
  ], "2026-10-09");
  assert.equal(pack.metrics.venta_kg, 0);
  assert.equal(pack.metrics.resultado_mxn, null);
  assert.equal(pack.coverage.resultado.days_with_sales, 0);
  assert.equal(pack.coverage.resultado.coverage_kg_pct, null);
  assert.equal(pack.coverage.resultado.coverage_days_pct, null);
});

test("separa kilos reales y proyectados ya clasificados por el corte", () => {
  const pack = weekly.aggregateWeek(FIXTURE, "2026-10-09");
  assert.equal(pack.coverage.resultado.covered_real_kg, 75771.74);
  assert.equal(pack.coverage.resultado.covered_projected_kg, 52690);
  const records = weekly.weekDayRecords(FIXTURE, "2026-10-09");
  assert.equal(records[4].estado, "real");
  assert.equal(records[5].estado, "proyectada");
  assert.equal(records[6].estado, "proyectada");
});

test("Todas suma importes cubiertos y no usa la venta total como denominador", () => {
  const complete = weekly.aggregateWeek([
    legacyDay("2026-10-05", 100, -1, -100),
  ], "2026-10-09");
  const partial = weekly.aggregateWeek([
    legacyDay("2026-10-04", 1701, null, null),
    legacyDay("2026-10-05", 1000, -2, -2000),
  ], "2026-10-09");
  const another = weekly.aggregateWeek([
    legacyDay("2026-10-05", 50, null, null),
    legacyDay("2026-10-06", 25, -4, -40),
  ], "2026-10-09");
  const plants = [complete, partial, another].map((pack, index) => ({
    metrics: pack.metrics,
    coverage: pack.coverage,
    plant_code: `P${index}`,
  }));
  const full = weekly.consolidateCovered([plants[0]]);
  assert.equal(full.metrics.resultado_mxn, -100);
  assert.equal(full.metrics.resultado_kg, -1);
  assert.equal(full.coverage.resultado.coverage_kg_pct, 100);
  const mixed = weekly.consolidateCovered(plants);
  assert.equal(mixed.metrics.venta_kg, 100 + 1701 + 1000 + 50 + 25);
  assert.equal(mixed.metrics.resultado_mxn, -100 + -2000 + -40);
  assert.equal(mixed.coverage.resultado.kg_covered, 100 + 1000 + 25);
  assert.equal(mixed.metrics.resultado_kg, mixed.metrics.resultado_mxn / mixed.coverage.resultado.kg_covered);
  assert.notEqual(mixed.metrics.resultado_kg, mixed.metrics.resultado_mxn / mixed.metrics.venta_kg);
  const comNum = (-1 * 100) + (-2 * 1000) + (-4 * 25);
  assert.equal(mixed.metrics.com_desc_kg, comNum / (100 + 1000 + 25));
});

test("Excel y gráfica usan el parcial y no dibujan el día desconocido", async () => {
  const pack = weekly.aggregateWeek(FIXTURE, "2026-10-09");
  const summary = {
    empresa: "Planta",
    plant_code: "Planta",
    week: weekly.weekOf("2026-10-04"),
    metrics: pack.metrics,
    coverage: pack.coverage,
    days: weekly.weekDayRecords(FIXTURE, "2026-10-09"),
  };
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("RESUMEN");
  await excel.fillResumen(wb, summary, "resultado_mxn");
  const sheet = wb.getWorksheet("RESUMEN");
  assert.equal(sheet.getCell("A3").value, weekly.coverageCaption(pack.coverage.resultado));
  const ventaRow = 5 + excel.ROWS.findIndex((row) => row.key === "venta_kg");
  assert.equal(sheet.getCell(ventaRow, 3).value, 1701);
  const resultIndex = excel.ROWS.findIndex((row) => row.key === "resultado_mxn");
  const separators = excel.ROWS.slice(0, resultIndex).filter((row) => row.separatorBefore).length;
  const resultRow = 5 + resultIndex + separators;
  assert.equal(sheet.getCell(resultRow, 2).value, pack.metrics.resultado_mxn);
  assert.equal(sheet.getCell(resultRow, 3).value, "—");
  const svg = excel.chartSvg(summary, "resultado_mxn");
  assert.match(svg, /Cobertura financiera/);
  assert.equal(svg.split("<circle ").length - 1, 6);
  const points = weekly.seriesPoints(FIXTURE, "resultado_mxn", "2026-10-09");
  assert.equal(points[0].value, null);
  assert.equal(points[0].complete, false);
  assert.deepEqual(points[0].missing_components, ["resultado_mxn"]);
  assert.equal(points[1].value, 6585.961215788164);
});

test("la UI publica cobertura parcial y conserva el faltante diario", () => {
  assert.match(PANEL, /coverageLines\(data\.coverage \|\| data\.week\.coverage\)/);
  assert.match(PANEL, /Días incompletos/);
  assert.match(PANEL, /Faltantes:/);
  assert.match(ALL, /coverageLines\(data\.resumen\?\.coverage \|\| data\.week\.coverage\)/);
  assert.match(ROWS, /function coverageCaption/);
  assert.match(ROWS, /days_covered < block.days_with_sales/);
  const pack = weekly.aggregateWeek(FIXTURE, "2026-10-09");
  const caption = weekly.coverageCaption(pack.coverage.resultado);
  assert.equal(caption, "Cobertura financiera 98.69% · 128,462 / 130,163 kg · 6/7 días · Real 75,772 kg · Proyectado 52,690 kg");
  assert.match(ROWS, /Cobertura financiera/);
});
