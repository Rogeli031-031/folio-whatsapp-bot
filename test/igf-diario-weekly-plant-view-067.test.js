"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const weekly = require("../lib/igf-diario-weekly-plant");
const margen = require("../lib/igf-diario-margen-manual");
const { monthBusinessDays } = require("../lib/igf-diario-puebla");
const { buildExpenseDailySchedule } = require("../lib/igf-diario-gastos-distribucion");

const ROOT = path.join(__dirname, "..");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyPlantPanel.tsx"), "utf8");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

function day(fecha, extra) {
  return {
    fecha,
    ventaKg: 100,
    precio: 10,
    costoKg: 4,
    fleteKg: 1,
    hgImporte: 10,
    cdKg: -0.2,
    expenses: {
      gasto_corporativo: 10,
      inversiones: 5,
      impuestos_federales: 4,
      presupuesto_nomina_gastos: 8,
      presupuesto_imss_sua: 3,
      extraordinarios: 2,
      provisiones_planta: 1,
    },
    legacyResultadoMxn: null,
    ...extra,
  };
}

test("la semana ISO cruza de mes y el corte 06/10 abre 05/10–11/10", () => {
  assert.equal(weekly.mondayOfIsoWeekContainingDate("2026-09-28"), "2026-09-28");
  assert.equal(weekly.sundayOfIsoWeekContainingDate("2026-09-28"), "2026-10-04");
  assert.equal(weekly.isoWeek("2026-09-28"), 40);
  assert.equal(weekly.isoWeekYear("2026-09-28"), 2026);
  const opened = weekly.weekOf("2026-10-06");
  assert.equal(opened.fecha_desde, "2026-10-05");
  assert.equal(opened.fecha_hasta, "2026-10-11");
  assert.equal(opened.iso_week, weekly.isoWeek("2026-10-05"));
  assert.equal(weekly.addWeeks(opened.fecha_desde, -1), "2026-09-28");
  assert.equal(weekly.addWeeks(opened.fecha_desde, 1), "2026-10-12");
  assert.equal(weekly.addDays("2026-10-05", -7), "2026-09-28");
  assert.equal(weekly.addDays("2026-10-05", 7), "2026-10-12");
  const nav = weekly.navigationFor("2026-10-06", 2026, 10);
  assert.equal(nav.prev_enabled, true);
  assert.equal(nav.next_enabled, true);
  assert.equal(weekly.navigationFor("2026-09-28", 2026, 10).prev_enabled, false);
  assert.equal(weekly.weekIntersectsMonth("2026-09-28", 2026, 10), true);
  assert.equal(weekly.weekIntersectsMonth("2026-09-21", 2026, 10), false);
});

test("el estado sigue al corte y la fórmula semanal equivale a la fila de semana", () => {
  const days = [
    day("2026-10-05", { ventaKg: 100, precio: 10.123456, costoKg: 4.111, fleteKg: 1.01, cdKg: -0.5, hgImporte: 20 }),
    day("2026-10-06", { ventaKg: 300, precio: 12.2, costoKg: 5.01, fleteKg: 1.02, cdKg: -0.25, hgImporte: 30 }),
  ];
  const pack = weekly.aggregateWeek(days, "2026-10-06");
  assert.equal(pack.estado, "parcial");
  assert.equal(pack.metrics.venta_kg, 400);
  const ingreso = 10.123456 * 100 + 12.2 * 300;
  assert.equal(pack.metrics.ingreso_mxn, ingreso);
  assert.equal(pack.metrics.precio_kg, ingreso / 400);
  const costo = (4.111 * 100 + 5.01 * 300) / 400;
  const flete = (1.01 * 100 + 1.02 * 300) / 400;
  assert.equal(pack.metrics.costo_kg, costo);
  assert.equal(pack.metrics.flete_kg, flete);
  assert.equal(pack.metrics.margen_kg, pack.metrics.precio_kg - costo - flete);
  assert.equal(pack.metrics.gasto_corporativo_kg, 20 / 400);
  assert.equal(pack.metrics.inversiones_kg, 10 / 400);
  assert.equal(pack.metrics.impuestos_federales_kg, 8 / 400);
  assert.equal(pack.metrics.margen_neto_kg, pack.metrics.margen_kg - 20 / 400 - 10 / 400 - 8 / 400);
  assert.equal(pack.metrics.presupuesto_nomina_gastos_kg, 16 / 400);
  assert.equal(pack.metrics.presupuesto_imss_sua_kg, 6 / 400);
  assert.equal(pack.metrics.extraordinarios_kg, 4 / 400);
  assert.equal(pack.metrics.provisiones_planta_kg, 2 / 400);
  assert.equal(pack.metrics.hg_mxn, 50);
  assert.equal(pack.metrics.sobrante_con_hg_kg, pack.metrics.sobrante_antes_hg_kg - 50 / 400);
  const ad = (-0.5 * 100 + -0.25 * 300) / 400;
  assert.equal(pack.metrics.com_desc_kg, ad);
  assert.ok(pack.metrics.com_desc_kg < 0);
  assert.equal(pack.metrics.resultado_kg, pack.metrics.sobrante_con_hg_kg + ad);
  const ag = days.reduce((sum, item) => sum + weekly.dayResultMxn(item), 0);
  assert.equal(pack.metrics.resultado_mxn, ag);
  assert.ok(Math.abs(pack.metrics.resultado_kg * pack.metrics.venta_kg - ag) < 1e-6);
  const rounded = (Math.round(pack.metrics.precio_kg * 100) / 100
    - Math.round(costo * 100) / 100
    - Math.round(flete * 100) / 100) * 400;
  assert.notEqual(pack.metrics.resultado_mxn, rounded);
  assert.equal(weekly.aggregateWeek(days.map((item) => ({ ...item, fecha: "2026-10-01" })), "2026-10-06").estado, "real");
  assert.equal(weekly.aggregateWeek(days.map((item) => ({ ...item, fecha: "2026-10-08" })), "2026-10-06").estado, "proyectada");
});

test("cero es válido, null no se inventa y septiembre no clasifica gastos nuevos", () => {
  const zeroBase = day("2026-10-05", { hgImporte: 0, cdKg: 0 });
  const zero = weekly.aggregateWeek([
    { ...zeroBase, expenses: { ...zeroBase.expenses, impuestos_federales: 0 } },
  ], "2026-10-06");
  assert.equal(zero.metrics.impuestos_federales_kg, 0);
  assert.equal(zero.metrics.hg_mxn, 0);
  assert.notEqual(zero.metrics.resultado_mxn, null);
  const missing = weekly.aggregateWeek([
    day("2026-10-05", { ventaKg: null }),
  ], "2026-10-06");
  assert.equal(missing.metrics.venta_kg, null);
  assert.equal(missing.metrics.resultado_mxn, null);
  assert.equal(missing.complete, false);
  const legacy = weekly.aggregateWeek([
    day("2026-09-30", { expenses: null, legacyResultadoMxn: 125.5, ventaKg: 80 }),
    day("2026-10-01", { expenses: null, legacyResultadoMxn: 40, ventaKg: 20 }),
  ], "2026-10-06");
  assert.equal(legacy.metrics.gasto_corporativo_kg, null);
  assert.equal(legacy.metrics.inversiones_kg, null);
  assert.equal(legacy.metrics.impuestos_federales_kg, null);
  assert.equal(legacy.metrics.presupuesto_nomina_gastos_kg, null);
  assert.equal(legacy.metrics.margen_neto_kg, null);
  assert.equal(legacy.metrics.venta_kg, 100);
  assert.equal(legacy.metrics.resultado_mxn, 165.5);
});

test("064-R1 mueve el importe del día y 065-R1 mueve precio, costo y flete", () => {
  const calendar = monthBusinessDays(2026, 10).days;
  const plain = buildExpenseDailySchedule({ monthlyAmount: 3100, days: calendar, overrides: {} });
  const moved = buildExpenseDailySchedule({
    monthlyAmount: 3100,
    days: calendar,
    overrides: { "2026-10-05": 100 },
  });
  const weekDates = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
  const sum = (schedule) => weekDates.reduce((total, fecha) => total + schedule.byFecha[fecha], 0);
  assert.notEqual(sum(plain), sum(moved));
  assert.equal(moved.byFecha["2026-10-05"], 100);
  const baseDays = weekDates.map((fecha) => day(fecha, { ventaKg: 10, hgImporte: 0, cdKg: 0, expenses: {
    gasto_corporativo: plain.byFecha[fecha],
    inversiones: 0,
    impuestos_federales: 0,
    presupuesto_nomina_gastos: 0,
    presupuesto_imss_sua: 0,
    extraordinarios: 0,
    provisiones_planta: 0,
  } }));
  const movedDays = baseDays.map((item) => ({
    ...item,
    expenses: { ...item.expenses, gasto_corporativo: moved.byFecha[item.fecha] },
  }));
  assert.notEqual(weekly.aggregateWeek(baseDays, "2026-10-06").metrics.gasto_corporativo_kg, weekly.aggregateWeek(movedDays, "2026-10-06").metrics.gasto_corporativo_kg);
  const overridden = margen.applyMarginOverrides(
    [{ fecha: "2026-10-06", precio: 10, costoKg: 4, fleteKg: 1 }],
    { "2026-10-06": { precio: 20, costo_kg: 7, flete_kg: 2 } },
    "2026-10-06",
    2026,
    10
  )[0];
  const priced = weekly.aggregateWeek([day("2026-10-06", {
    precio: overridden.precio,
    costoKg: overridden.costoKg,
    fleteKg: overridden.fleteKg,
  })], "2026-10-06");
  assert.equal(priced.metrics.precio_kg, 20);
  assert.equal(priced.metrics.costo_kg, 7);
  assert.equal(priced.metrics.flete_kg, 2);
  assert.equal(priced.metrics.margen_kg, 11);
});

test("la gráfica deja hueco cuando la métrica histórica no existe", () => {
  const points = weekly.seriesPoints([
    day("2026-09-30", { expenses: null, legacyResultadoMxn: 10 }),
    day("2026-10-01"),
  ], "gasto_corporativo_kg", "2026-10-06");
  assert.equal(points[0].value, null);
  assert.equal(points[0].complete, false);
  assert.equal(points[1].value, 10 / 100);
  assert.deepEqual(weekly.METRICS.map((item) => item[0]).filter((key) => key === "resultado_mxn"), ["resultado_mxn"]);
});

test("el panel vive solo en IGF Diario y no pide el mes anterior ni el Excel", () => {
  assert.match(CLIENT, /igfTableMode === "igf_diario" && token && igfForecast/);
  assert.match(CLIENT, /igfTableMode === "forecast" && igfForecast/);
  assert.match(CLIENT, /Comparación IGF Forecast vs última versión del mes anterior/);
  assert.match(CLIENT, /igfTableMode === "igf_diario"\) \{\s*setIgfMesAnterior\(null\)/);
  assert.match(PANEL, /Venta en kilos/);
  assert.match(PANEL, /RESULTADO \(Importe\)/);
  assert.match(PANEL, /SEMANA ISO/);
  assert.match(PANEL, /seriesMetric=\{selectedRow.key\}/);
  assert.match(PANEL, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  for (const label of ["1D", "5D", "1M", "3M", "YTD", "1A", "5A", "Todo"]) {
    assert.match(MODAL, new RegExp(label));
  }
  assert.match(MODAL, /Gráfica · /);
  assert.match(MODAL, /Real/);
  assert.match(MODAL, /Proyectado/);
  assert.match(SERVER, /app.get\("\/api\/dashboard\/igf-diario-semanal"/);
  const schedules = WEEKLY.slice(WEEKLY.indexOf("function buildConceptSchedules"), WEEKLY.indexOf("function expenseMoney"));
  assert.doesNotMatch(schedules, /query\(/);
  const bundle = WEEKLY.slice(WEEKLY.indexOf("async function loadMonthBundle"), WEEKLY.indexOf("function stitchWeek"));
  assert.equal(bundle.split("overridesForPlant(").length, 3);
  assert.equal(bundle.split("listMonth(").length, 2);
  assert.equal(bundle.split("listMonthOverrides(").length, 2);
  assert.doesNotMatch(bundle, /for \(const key of EXPENSE_KEYS\)[\s\S]*query\(/);
  assert.doesNotMatch(WEEKLY, /xlsx|exceljs|H48|AD48|201192/);
  assert.doesNotMatch(PANEL, /201192|H48|xlsx/);
});
