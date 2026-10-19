"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const weekly = require("../lib/igf-diario-weekly-plant");
const weeklyExcel = require("../lib/igf-diario-weekly-excel");

const ROOT = path.join(__dirname, "..");
const MODAL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CORTE = "2026-10-19";

let rows;

test.before(async () => {
  rows = await import("../frontend-dashboard/lib/igf-diario-weekly-rows.ts");
});

function href(excelUrl, weekAnchor, metric) {
  const url = new URL(excelUrl, "http://local");
  const anchor = String(weekAnchor || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(anchor)) url.searchParams.set("week_anchor", anchor);
  url.searchParams.set("summary_metric", String(metric || "").trim() || "resultado_mxn");
  return `${url.pathname}${url.search}`;
}

function choice(year, month, number) {
  return rows.excelWeekChoices(year, month, CORTE).find((item) => item.week_number === number);
}

test("A-E. octubre 2026 lista las semanas 40 a 44 con su estado", () => {
  const list = rows.excelWeekChoices(2026, 10, CORTE);
  assert.deepEqual(list.map((item) => item.week_number), [40, 41, 42, 43, 44]);
  assert.deepEqual(list.map((item) => [item.fecha_desde, item.fecha_hasta]), [
    ["2026-09-27", "2026-10-03"],
    ["2026-10-04", "2026-10-10"],
    ["2026-10-11", "2026-10-17"],
    ["2026-10-18", "2026-10-24"],
    ["2026-10-25", "2026-10-31"],
  ]);
  assert.equal(choice(2026, 10, 40).estado, "REAL");
  assert.equal(choice(2026, 10, 42).estado, "REAL");
  assert.equal(choice(2026, 10, 43).estado, "PARCIAL");
  assert.equal(choice(2026, 10, 44).estado, "PROYECTADA");
  assert.equal(choice(2026, 10, 43).label, "Semana 43 · 18/10–24/10 · PARCIAL");
  for (const item of list) {
    const backend = weekly.weekOf(item.fecha_desde);
    assert.equal(item.week_number, backend.week_number);
    assert.equal(item.fecha_desde, backend.fecha_desde);
    assert.equal(item.fecha_hasta, backend.fecha_hasta);
    assert.equal(weekly.weekOf(item.fecha_desde).fecha_desde, weekly.sundayOfWeekContainingDate(item.fecha_desde));
  }
});

test("F-H. la semana elegida entra como week_anchor y conserva summary_metric", () => {
  const semana42 = choice(2026, 10, 42);
  const semana44 = choice(2026, 10, 44);
  const historica = href("/api/arr/dashboard-excel?plant=Norte", semana42.fecha_desde, "resultado_kg");
  const proyectada = href("/api/arr/dashboard-excel?plant=Norte", semana44.fecha_desde, "resultado_kg");
  assert.match(historica, /week_anchor=2026-10-11/);
  assert.match(proyectada, /week_anchor=2026-10-25/);
  assert.match(historica, /summary_metric=resultado_kg/);
  assert.match(proyectada, /summary_metric=resultado_kg/);
  assert.match(MODAL, /excelDownloadHref\(excelUrl, excelWeekAnchor \|\| weekAnchor, seriesMetric\)/);
});

test("I. elegir la semana del Excel no entra en la carga de la gráfica", () => {
  const load = MODAL.slice(MODAL.indexOf("let cancel = false"), MODAL.indexOf("const chart"));
  assert.match(load, /weekAnchor,/);
  assert.doesNotMatch(load, /excelWeekAnchor/);
  assert.match(load, /\[token, year, month, range, uploadDay, versionAsOfCorte, plantCode, todas, seriesMetric, scopeLabel, weekAnchor\]/);
  const select = MODAL.slice(MODAL.indexOf("<select"), MODAL.indexOf("</select>"));
  assert.match(select, /setExcelWeekAnchor\(event\.target\.value\)/);
  assert.doesNotMatch(select, /setRange|setData|setMetric/);
});

test("J. un mes nuevo descarta un domingo que ya no pertenece", () => {
  const octubre = rows.excelWeekChoices(2026, 10, CORTE);
  assert.equal(rows.defaultExcelWeekAnchor(octubre, "2026-10-19", CORTE), "2026-10-18");
  const noviembre = rows.excelWeekChoices(2026, 11, CORTE);
  assert.equal(rows.defaultExcelWeekAnchor(noviembre, "2026-10-11", CORTE), noviembre[noviembre.length - 1].fecha_desde);
  assert.ok(noviembre.every((item) => item.fecha_desde !== "2026-10-11"));
  assert.equal(rows.defaultExcelWeekAnchor(octubre, "", ""), octubre[octubre.length - 1].fecha_desde);
});

test("K. el cruce de año usa la misma numeración domingo-sábado del backend", () => {
  for (const fecha of ["2025-12-28", "2026-01-03", "2026-12-27", "2027-01-02"]) {
    const backend = weekly.weekOf(fecha);
    const list = rows.excelWeekChoices(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)), CORTE);
    const found = list.find((item) => item.fecha_desde === backend.fecha_desde);
    assert.ok(found, fecha);
    assert.equal(found.week_number, backend.week_number);
    assert.equal(found.week_year, backend.week_year);
    assert.equal(found.fecha_hasta, backend.fecha_hasta);
  }
});

test("L. TODAS usa el mismo selector y el mismo week_anchor", () => {
  const header = MODAL.slice(MODAL.indexOf("Semana a descargar:"), MODAL.indexOf("Descargar Excel"));
  assert.doesNotMatch(header, /todas \?/);
  const todas = SERVER.slice(SERVER.indexOf("const rawTodasAnchor"), SERVER.indexOf("igfWeeklyTodasSummary") + 80);
  assert.match(todas, /week_anchor/);
  assert.match(todas, /weekAnchor: todasAnchor/);
  const plant = SERVER.slice(SERVER.indexOf("const rawAnchor"), SERVER.indexOf("igfWeeklySummaryMetric"));
  assert.match(plant, /weekAnchor,/);
  assert.match(plant, /corteYmd: uploadDay/);
  assert.match(plant, /rawAnchor\) \? rawAnchor/);
});

function summaryFor(anchor, venta) {
  const week = weekly.weekOf(anchor);
  const days = [];
  for (let index = 0; index < 7; index += 1) {
    days.push({
      fecha: weekly.addDays(week.fecha_desde, index),
      ventaKg: index === 0 ? venta : 1000 + index,
      precio: 10,
      costoKg: 4,
      fleteKg: 1,
      hgImporte: 10,
      hgKilos: 2,
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
    });
  }
  const packed = weekly.aggregateWeek(days, CORTE);
  return {
    empresa: "Norte",
    week,
    metrics: packed.metrics,
    coverage: packed.coverage,
    days: weekly.weekDayRecords(days, CORTE),
  };
}

async function resumenFor(anchor, venta) {
  const workbook = new ExcelJS.Workbook();
  await weeklyExcel.fillResumen(workbook, summaryFor(anchor, venta), "resultado_mxn");
  const buffer = await workbook.xlsx.writeBuffer();
  const read = new ExcelJS.Workbook();
  await read.xlsx.load(buffer);
  return read.getWorksheet("RESUMEN");
}

test("el RESUMEN histórico, parcial y proyectado sigue la semana elegida", async () => {
  const cases = [
    ["2026-10-11", 42, "11/10/2026", "17/10/2026", "Dom 11/10", "Sáb 17/10", 42000],
    ["2026-10-18", 43, "18/10/2026", "24/10/2026", "Dom 18/10", "Sáb 24/10", 43000],
    ["2026-10-25", 44, "25/10/2026", "31/10/2026", "Dom 25/10", "Sáb 31/10", 44000],
  ];
  for (const [anchor, number, desde, hasta, first, last, venta] of cases) {
    const sheet = await resumenFor(anchor, venta);
    const title = String(sheet.getCell("A2").value);
    assert.match(title, new RegExp(`SEMANA ${number}`));
    assert.match(title, new RegExp(desde.replaceAll("/", "\\/")));
    assert.match(title, new RegExp(hasta.replaceAll("/", "\\/")));
    const headers = [];
    for (let col = 3; col <= 9; col += 1) headers.push(String(sheet.getCell(4, col).value));
    assert.equal(headers.length, 7);
    assert.equal(headers[0], first);
    assert.equal(headers[6], last);
    let ventaRow = 0;
    for (let row = 5; row <= 40; row += 1) {
      if (sheet.getCell(row, 1).value === "Venta en Kilos") ventaRow = row;
    }
    assert.ok(ventaRow);
    assert.equal(sheet.getCell(ventaRow, 3).value, venta);
    assert.equal(sheet.getCell(ventaRow, 4).value, 1001);
  }
});
