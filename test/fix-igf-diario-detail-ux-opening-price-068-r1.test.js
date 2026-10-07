"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const forecast = require("../lib/dashboard-arr-forecast");
const grafica = require("../lib/igf-diario-grafica");
const margen = require("../lib/igf-diario-margen-manual");

const ROOT = path.join(__dirname, "..");
const UI = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioFoliosDepositoMatrix.tsx"), "utf8");
const DRAWER = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "FolioDrawer.tsx"), "utf8");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const EXPENSE = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-expense-excel.js"), "utf8");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");
const MATRIX = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-folios-deposito-matrix.js"), "utf8");

const PRIOR = 19.95;
const OWN = 20.05;

function precioClient(rows) {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = String(sql);
      calls.push({ sql: text, params });
      const selected = rows.filter((row) => {
        const codes = Array.isArray(params[0]) ? params[0] : [params[0], params[3]].filter((value) => value != null);
        if (!codes.includes(row.plant_code)) return false;
        const fecha = String(row.fecha).slice(0, 10);
        if (text.includes("fecha < $2")) return fecha < String(params[1]);
        return fecha >= String(params[1]) && fecha < String(params[2]);
      });
      return { rows: selected };
    },
  };
  return { client, calls };
}

function octoberRows() {
  return [
    { plant_code: "Morelos", fecha: "2026-09-30", precio: PRIOR },
    { plant_code: "Morelos", fecha: "2026-10-01", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-02", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-03", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-04", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-05", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-06", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-07", precio: OWN },
    { plant_code: "Morelos", fecha: "2026-10-08", precio: null },
    { plant_code: "Querétaro", fecha: "2026-09-30", precio: 50 },
    { plant_code: "Puebla", fecha: "2026-09-28", precio: 11.5 },
  ];
}

function priceOn(series, day) {
  return series[day - 1].precio;
}

test("Morelos 01–08 usa el antecedente y no el precio futuro", async () => {
  const { client, calls } = precioClient(octoberRows());
  const loaded = await forecast.loadPrecioDiario(client, "Morelos", 2026, 10);
  const series = forecast.resolvePrecioDailySeries(2026, 10, loaded);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /fecha >= \$2::date/);
  assert.match(calls[1].sql, /fecha < \$2::date/);
  assert.match(calls[1].sql, /precio > 0/);
  assert.equal(calls[1].sql.split("client.query").length, 1);
  assert.equal(calls[1].params[1], "2026-10-01");
  assert.deepEqual(calls[1].params[0], ["Morelos"]);
  for (let day = 1; day <= 6; day += 1) assert.equal(priceOn(series, day), PRIOR);
  assert.equal(priceOn(series, 7), OWN);
  assert.equal(priceOn(series, 8), OWN);
  assert.notEqual(priceOn(series, 1), OWN);

  const wb = forecast.appendPrecioWorksheet(new ExcelJS.Workbook(), 2026, 10, loaded);
  assert.equal(wb.getCell(2, 2).value, PRIOR);
  assert.equal(wb.getCell(7, 2).value, PRIOR);
  assert.equal(wb.getCell(8, 2).value, OWN);
  assert.equal(wb.getCell(9, 2).value, OWN);
  assert.equal(wb.getCell(2, 2).numFmt, "0.00000000");
});

test("sin antecedente válido el inicio queda vacío y cero o null no cuentan", async () => {
  const none = await forecast.loadPrecioDiario(precioClient([
    { plant_code: "Morelos", fecha: "2026-10-07", precio: OWN },
  ]).client, "Morelos", 2026, 10);
  const emptyStart = forecast.resolvePrecioDailySeries(2026, 10, none);
  assert.equal(priceOn(emptyStart, 1), null);
  assert.equal(priceOn(emptyStart, 6), null);
  assert.equal(priceOn(emptyStart, 7), OWN);

  const zero = await forecast.loadPrecioDiario(precioClient([
    { plant_code: "Morelos", fecha: "2026-09-30", precio: 0 },
    { plant_code: "Morelos", fecha: "2026-09-29", precio: null },
    { plant_code: "Morelos", fecha: "2026-10-07", precio: OWN },
  ]).client, "Morelos", 2026, 10);
  const zeroSeries = forecast.resolvePrecioDailySeries(2026, 10, zero);
  assert.equal(priceOn(zeroSeries, 1), null);
  assert.equal(priceOn(zeroSeries, 6), null);
  assert.equal(priceOn(zeroSeries, 7), OWN);
});

test("enero toma el último precio del año anterior y conserva la precisión", async () => {
  const precise = 19.95000001;
  const { client, calls } = precioClient([
    { plant_code: "Morelos", fecha: "2026-12-18", precio: precise },
    { plant_code: "Morelos", fecha: "2027-01-04", precio: OWN },
  ]);
  const loaded = await forecast.loadPrecioDiario(client, "Morelos", 2027, 1);
  const series = forecast.resolvePrecioDailySeries(2027, 1, loaded);
  assert.equal(calls[1].params[1], "2027-01-01");
  assert.equal(priceOn(series, 1), precise);
  assert.equal(priceOn(series, 3), precise);
  assert.equal(priceOn(series, 4), OWN);
  assert.notEqual(priceOn(series, 1), 19.95);
});

test("la identidad no cruza plantas y el código exacto gana en la fecha previa", async () => {
  const rows = [
    { plant_code: "Morelos", fecha: "2026-09-30", precio: PRIOR },
    { plant_code: "Queretaro", fecha: "2026-09-30", precio: 11.1 },
    { plant_code: "Querétaro", fecha: "2026-09-30", precio: 22.2 },
    { plant_code: "Querétaro", fecha: "2026-09-20", precio: 33.3 },
    { plant_code: "Tehuacán", fecha: "2026-09-30", precio: 77 },
  ];
  const morelos = await forecast.loadPrecioDiario(precioClient(rows).client, "Morelos", 2026, 10);
  assert.equal(forecast.resolvePrecioDailySeries(2026, 10, morelos)[0].precio, PRIOR);
  assert.equal(morelos.some((row) => row.precio === 11.1 || row.precio === 77), false);

  const queretaro = await forecast.loadPrecioDiario(precioClient(rows).client, "Queretaro", 2026, 10);
  assert.equal(forecast.resolvePrecioDailySeries(2026, 10, queretaro)[0].precio, 11.1);

  const accent = await forecast.loadPrecioDiario(precioClient(rows).client, "Querétaro", 2026, 10);
  assert.equal(forecast.resolvePrecioDailySeries(2026, 10, accent)[0].precio, 22.2);

  const tehuacan = await forecast.loadPrecioDiario(precioClient(rows).client, "Tehuacán", 2026, 10);
  assert.equal(forecast.resolvePrecioDailySeries(2026, 10, tehuacan)[0].precio, 77);
  assert.equal(tehuacan.some((row) => row.precio === PRIOR), false);

  const opener = LIB.slice(LIB.indexOf("async function loadUltimoPrecioPrevio"), LIB.indexOf("async function loadPrecioDiario"));
  assert.equal(opener.split("client.query(").length, 2);
  assert.doesNotMatch(opener, /Morelos|Puebla|Queretaro|Querétaro|Tehuacan|Tehuacán/);
});

test("el override manual gana y el precio inicial alimenta ingreso, margen y resultado", () => {
  const rows = [
    { fecha: "2026-09-30", precio: PRIOR },
    { fecha: "2026-10-07", precio: OWN },
  ];
  const series = forecast.resolvePrecioDailySeries(2026, 10, rows);
  const compras = new Map();
  const casa = new Map();
  const com = new Map();
  const cd = new Map();
  for (let day = 1; day <= 8; day += 1) {
    const fecha = `2026-10-${String(day).padStart(2, "0")}`;
    casa.set(fecha, 0.1);
    com.set(fecha, 0);
    cd.set(fecha, 0.5);
    compras.set(fecha, { costoKg: 10, fleteKg: 2, hgImporte: 50 });
  }
  const built = grafica.materializePlantMonth({
    year: 2026,
    month: 10,
    plant: "Morelos",
    corteYmd: "2026-10-09",
    precioRows: rows,
    casaTon: casa,
    comTon: com,
    cdByFecha: cd,
    comprasByFecha: compras,
    corporativos: 1000,
    operativos: 500,
    skipDay1Fallback: true,
  });
  assert.equal(built.financial_days[0].precio, PRIOR);
  assert.equal(built.financial_days[5].precio, PRIOR);
  assert.equal(built.financial_days[6].precio, OWN);
  assert.equal(built.financial_days[7].precio, OWN);
  const metrics = grafica.computePlantDay({
    ventaKg: 100,
    precio: built.financial_days[0].precio,
    costoKg: 10,
    fleteKg: 2,
    hgImporte: 50,
    cdKg: 0.5,
    corporativos: 1000,
    operativos: 500,
    habiles: 22,
    inhabil: false,
  });
  assert.equal(100 * built.financial_days[0].precio, 1995);
  assert.equal(metrics.margen, PRIOR - 10 - 2);
  assert.notEqual(metrics.resultado_mxn, null);
  assert.notEqual(metrics.resultado_per_kg, null);

  const overridden = margen.applyMarginOverrides(
    [{ fecha: "2026-10-01", precio: series[0].precio, costoKg: 10, fleteKg: 2 }],
    new Map([["2026-10-01", { precio: 21, costo_kg: null, flete_kg: null }]]),
    "2026-10-01",
    2026,
    10
  );
  assert.equal(overridden[0].precio, 21);
  assert.equal(overridden[0].precio_manual, true);

  const beforeCorte = margen.applyMarginOverrides(
    [{ fecha: "2026-10-01", precio: PRIOR, costoKg: 10, fleteKg: 2 }],
    new Map([["2026-10-01", { precio: 21, costo_kg: null, flete_kg: null }]]),
    "2026-10-07",
    2026,
    10
  );
  assert.equal(beforeCorte[0].precio, PRIOR);
  assert.equal(beforeCorte[0].precio_manual, false);

  const manualBeforeSheet = (source, start, end) => {
    const slice = source.slice(source.indexOf(start), source.indexOf(end));
    const manual = slice.indexOf("manualPrecio != null");
    const sheet = slice.indexOf("supports.precio");
    assert.ok(manual >= 0 && sheet > manual);
  };
  manualBeforeSheet(PUEBLA, "function writeDay", "function writeWeek");
  manualBeforeSheet(EXPENSE, "function writeDetailedDay", "function weightedPresent");
  assert.match(WEEKLY, /materializePlantMonth/);
  assert.match(LIB, /resolvePrecioDailySeries/);
  assert.doesNotMatch(MATRIX, /precio_diario|19\.95|FolioDrawer/);
});

test("el detalle diario usa tarjetas y abre FolioDrawer sin cerrar la lista", () => {
  const dialog = UI.slice(UI.indexOf('aria-label="Detalle de folios"'), UI.indexOf("<FolioDrawer"));
  assert.doesNotMatch(dialog, /<table|<th|Folio \| Estado/);
  assert.match(dialog, /FolioCard/);
  assert.match(dialog, /fechaVisible\(selected\.fecha\)/);
  assert.match(dialog, /moneyText\(selectedCell\.amount_total/);
  assert.match(dialog, /countText\(selectedCell\.folio_count\)/);
  assert.match(UI, /function FolioCard/);
  assert.match(UI, /line-clamp-3/);
  assert.match(UI, /break-words/);
  assert.match(UI, /Depósito y cierre/);
  assert.match(UI, /Abrir folio →/);
  assert.match(UI, /onOpen\(folio\.id\)/);
  assert.match(UI, /folio\.folio/);
  assert.match(UI, /money\.format\(folio\.importe\)/);
  assert.match(UI, /getRoleFromDashboardToken\(props\.token\)/);
  assert.match(UI, /const handleOpenFolio/);
  assert.match(UI, /role=\{resolvedRole\}/);
  assert.doesNotMatch(UI, /role=\{dashboardRole \|\| ""\}|role=""/);
  assert.doesNotMatch(UI, /role="GG"|role=\{"GG"\}/);
  assert.match(UI, /onClose=\{\(\) => setOpenFolioId\(null\)\}/);
  assert.match(UI, /z-30/);
  assert.match(DRAWER, /z-40/);
  assert.match(DRAWER, /z-50/);
  assert.doesNotMatch(MATRIX, /FolioDrawer|description_short \+/);
});
