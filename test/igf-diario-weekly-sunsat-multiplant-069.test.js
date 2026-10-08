"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const weekly = require("../lib/igf-diario-weekly-plant");
const forecast = require("../lib/dashboard-arr-forecast");

const ROOT = path.join(__dirname, "..");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyPlantPanel.tsx"), "utf8");
const ALL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyAllPlantsPanel.tsx"), "utf8");
const ROWS = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-diario-weekly-rows.ts"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");

function utcDow(value) {
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))).getUTCDay();
}

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
    legacyResultadoKg: null,
    ...extra,
  };
}

test("06/10 abre domingo 04/10 a sábado 10/10, semana 41, sin ISO", () => {
  const opened = weekly.weekOf("2026-10-06");
  assert.equal(opened.fecha_desde, "2026-10-04");
  assert.equal(opened.fecha_hasta, "2026-10-10");
  assert.equal(utcDow(opened.fecha_desde), 0);
  assert.equal(utcDow(opened.fecha_hasta), 6);
  assert.equal(opened.week_number, 41);
  assert.equal(opened.week_year, 2026);
  assert.equal(weekly.sundayOfWeekContainingDate("2026-10-04"), "2026-10-04");
  assert.equal(weekly.saturdayOfWeekContainingDate("2026-10-10"), "2026-10-10");
  const nav = weekly.navigationFor("2026-10-06", 2026, 10);
  assert.equal(nav.prev_anchor, "2026-09-27");
  assert.equal(weekly.weekOf(nav.prev_anchor).fecha_hasta, "2026-10-03");
  assert.equal(nav.next_anchor, "2026-10-11");
  assert.equal(weekly.weekOf(nav.next_anchor).fecha_hasta, "2026-10-17");
  assert.equal(weekly.weekOf("2026-10-01").fecha_desde, "2026-09-27");
  assert.equal(weekly.weekOf("2026-10-01").fecha_hasta, "2026-10-03");
  const newYear = weekly.weekOf("2027-01-01");
  assert.equal(newYear.fecha_desde, "2026-12-27");
  assert.equal(newYear.fecha_hasta, "2027-01-02");
  assert.equal(newYear.week_year, 2027);
  assert.equal(newYear.week_number, 1);
  assert.equal(weekly.weekOf("2026-12-26").week_year, 2026);
  assert.equal(weekly.weekOf("2026-01-01").week_number, 1);
  assert.equal(weekly.weekOf("2026-01-01").fecha_desde, "2025-12-28");
  assert.doesNotMatch(WEEKLY, /mondayOfIsoWeekContainingDate|sundayOfIsoWeekContainingDate|function isoWeek|isoWeekYear|SEMANA ISO/);
  assert.doesNotMatch(PANEL, /SEMANA ISO/);
  assert.doesNotMatch(ALL, /SEMANA ISO/);
  assert.match(ROWS, /SEMANA \$\{weekNumber\}/);
});

test("la planta individual devuelve Semana y exactamente siete días con la misma fórmula", () => {
  const fechas = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
  const days = fechas.map((fecha, index) => day(fecha, {
    ventaKg: 100 + index,
    precio: 10 + index / 10,
    legacyResultadoMxn: null,
  }));
  const pack = weekly.aggregateWeek(days, "2026-10-08");
  const records = weekly.weekDayRecords(days, "2026-10-08");
  assert.equal(records.length, 7);
  assert.deepEqual(records.map((item) => item.weekday), ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]);
  assert.equal(records[0].estado, "real");
  assert.equal(records[4].estado, "proyectada");
  assert.equal(pack.estado, "parcial");
  records.forEach((record, index) => {
    const alone = weekly.aggregateWeek([days[index]], "2026-10-08");
    assert.equal(record.metrics.venta_kg, days[index].ventaKg);
    assert.equal(record.metrics.precio_kg, days[index].precio);
    assert.equal(record.metrics.resultado_kg, alone.metrics.resultado_kg);
    assert.equal(record.metrics.resultado_mxn, alone.metrics.resultado_mxn);
  });
  assert.equal(pack.metrics.venta_kg, days.reduce((sum, item) => sum + item.ventaKg, 0));
  assert.equal(pack.metrics.resultado_kg, pack.metrics.resultado_mxn / pack.metrics.venta_kg);
  const blank = weekly.weekDayRecords([day("2026-10-04", { ventaKg: null, precio: null, expenses: null, hgImporte: null, cdKg: null })], "2026-10-08");
  assert.equal(blank[0].metrics.venta_kg, null);
  assert.equal(blank[0].metrics.resultado_mxn, null);
  assert.notEqual(blank[0].metrics.venta_kg, 0);
  const headers = ["Concepto", "Semana", "Dom 04/10", "Lun 05/10", "Mar 06/10", "Mié 07/10", "Jue 08/10", "Vie 09/10", "Sáb 10/10"];
  assert.match(PANEL, />Concepto</);
  assert.match(PANEL, />Semana</);
  assert.ok(PANEL.indexOf(">Concepto<") < PANEL.indexOf(">Semana<"));
  assert.match(PANEL, /dayHeader\(day\.fecha\)/);
  assert.equal(headers[1], "Semana");
  const dayFn = WEEKLY.slice(WEEKLY.indexOf("function weekDayRecords"), WEEKLY.indexOf("function fiveDayWindow"));
  assert.match(dayFn, /dayMetrics\(day\)/);
  assert.doesNotMatch(dayFn, /aggregateWeek\(\[day\]/);
  assert.doesNotMatch(dayFn, /query\(/);
});

test("Todas usa una request, el catálogo existente y queda antes de Folios", () => {
  const labels = ["Puebla", "Tehuacan", "Acapulco", "Queretaro", "San Luis", "Morelos"].map((name) => forecast.igfLabelForForecastPlant(name));
  assert.deepEqual(labels, ["GT Puebla", "Tehuacan", "Acapulco", "GTM Queretaro", "GTM San Luis", "Morelos"]);
  const route = SERVER.slice(SERVER.indexOf('app.get("/api/dashboard/igf-diario-semanal"'), SERVER.indexOf('app.get("/api/dashboard/igf-diario-folios-deposito"'));
  assert.match(route, /query\.todas/);
  assert.match(route, /listIgfDiarioProvinciaPlants/);
  assert.match(route, /assertPlantaPermitidaDashboard/);
  assert.match(route, /igfLabelForForecastPlant/);
  assert.match(route, /zona\\s\+provincia/);
  assert.match(route, /loadWeeklyAll/);
  assert.equal(route.split("comprasCache = new Map()").length, 2);
  const allFn = WEEKLY.slice(WEEKLY.indexOf("async function loadWeeklyAll"), WEEKLY.indexOf("async function loadWeeklySeries"));
  assert.match(allFn, /comprasCache: cache/);
  assert.match(allFn, /aggregateWeek\(days, opts\.corteYmd\)/);
  assert.doesNotMatch(allFn, /for \(const key of METRICS\)/);
  assert.doesNotMatch(allFn, /for \(const key of EXPENSE_KEYS\)/);
  assert.equal(ALL.split("fetchIgfDiarioSemanal(").length, 2);
  assert.match(ALL, /todas: true/);
  assert.doesNotMatch(ALL, /plantCode/);
  assert.match(ALL, /plants\.map/);
  assert.match(API, /params\.set\("todas", "1"\)/);
  const blockStart = CLIENT.indexOf("<IgfDiarioWeeklyAllPlantsPanel");
  const folios = CLIENT.indexOf("<IgfDiarioFoliosDepositoMatrix");
  const forecastTitle = CLIENT.indexOf("Comparación IGF Forecast vs última versión del mes anterior");
  assert.ok(blockStart > 0 && blockStart < folios && folios < forecastTitle);
  assert.equal(CLIENT.split("<IgfDiarioWeeklyAllPlantsPanel").length, 2);
  const forecastBlock = CLIENT.slice(forecastTitle);
  assert.doesNotMatch(forecastBlock, /IgfDiarioWeeklyAllPlantsPanel/);
  assert.match(CLIENT, /igfTableMode === "igf_diario" && token && igfForecast && \(\s*<IgfDiarioWeeklyAllPlantsPanel/);
});

test("filas, separadores visuales y resaltado no meten registros falsos", () => {
  assert.match(ROWS, /label: "Margen Bruto"/);
  assert.doesNotMatch(ROWS, /label: "Margen"/);
  for (const label of [
    "Venta en Kilos",
    "Precio de Venta al Público",
    "Ingreso Generado",
    "Margen Bruto",
    "Margen Neto",
    "Sobrante de Operación antes del HG",
    "Sobrante de Operación con el HG",
    "RESULTADO ($/kg)",
    "RESULTADO (Importe)",
  ]) {
    assert.match(ROWS, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(ROWS, /resultado_mxn[\s\S]*strongest: true/);
  assert.match(ROWS, /separatorBefore: true/);
  assert.match(PANEL, /data-separator/);
  assert.match(PANEL, /bg-amber-900\/45/);
  assert.match(PANEL, /bg-amber-800\/50/);
  assert.match(ROWS, /text-red-400/);
  assert.match(ROWS, /text-emerald-300/);
  assert.match(ROWS, /return "—"/);
  assert.doesNotMatch(PANEL, /key: "separator"|ventaKg: 0/);
  assert.doesNotMatch(ALL, /Gráfica/);
  assert.match(PANEL, /Gráfica/);
  assert.match(PANEL, /weekly-day-proyectado/);
});
