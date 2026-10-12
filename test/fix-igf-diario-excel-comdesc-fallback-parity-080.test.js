"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const grafica = require("../lib/igf-diario-grafica");
const forecast = require("../lib/dashboard-arr-forecast");
const igf = require("../lib/igf-diario-puebla");
const weekly = require("../lib/igf-diario-weekly-plant");

const ROOT = path.join(__dirname, "..");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const EXPENSE = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-expense-excel.js"), "utf8");
const WEEKLY = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-plant.js"), "utf8");

const PLANT = "San Luis";
const CORTE = "2026-10-09";
const SOBRANTE = 10.021022975903595;
const VENTA = 1701;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function prom() {
  return {
    promVentaCasa: [],
    promVentaComisionista: [],
    promDescTotal: ["-4", "-4.19", "-4.12", "-3.87", "-3.85", "-4.3", ""],
    promVentaTotal: [],
    proyVentaTotal: 0,
  };
}

function monthGrid(plant, values) {
  const byDate = [];
  for (let day = 1; day <= 31; day += 1) {
    const fecha = `2026-10-${String(day).padStart(2, "0")}`;
    const byPlant = {};
    if (values && Object.prototype.hasOwnProperty.call(values, fecha)) byPlant[plant] = values[fecha];
    byDate.push({ day, fecha, byPlant });
  }
  return { plants: [plant], byDate, cutoffDay: 10 };
}

function priorDays(entries) {
  return entries.map(([fecha, rate]) => ({ fecha, byPlant: { [PLANT]: rate } }));
}

function workbook(opts) {
  const plant = (opts && opts.plant) || PLANT;
  const wb = new ExcelJS.Workbook();
  forecast.hojaB(
    wb,
    monthGrid(plant, opts && opts.rates),
    monthGrid(plant, opts && opts.venta),
    2026,
    10,
    "2026-10-31",
    "2026-10-12",
    null,
    {
      pronosticoProjection: {
        corteYmdStr: (opts && opts.corte) || CORTE,
        byPlant: new Map([[plant, prom()]]),
      },
      priorDescuentoByDate: (opts && opts.prior) || [],
    }
  );
  const precio = wb.addWorksheet("PRECIO");
  for (let day = 1; day <= 31; day += 1) {
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 9, day));
    precio.getCell(day + 1, 2).value = 21.13;
  }
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: plant,
    humanName: plant,
    corteYmd: (opts && opts.corte) || CORTE,
    plantEquivalent: () => true,
  });
  return wb;
}

function formulaOf(cell) {
  const value = cell && cell.value;
  return value && typeof value === "object" && value.formula ? String(value.formula) : "";
}

function rowByDate(ws, fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  for (let row = 1; row <= Math.max(ws.rowCount || 0, 90); row += 1) {
    const value = ws.getCell(row, 1).value;
    if (value instanceof Date && value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day) {
      return row;
    }
  }
  return null;
}

function rowByLabel(ws, label) {
  const found = [];
  for (let row = 1; row <= Math.max(ws.rowCount || 0, 90); row += 1) {
    if (ws.getCell(row, 1).value === label) found.push(row);
  }
  return found;
}

function dashboardDay(fecha, rates, ventaTon, prior) {
  const casa = new Map();
  for (const [day, ton] of Object.entries(ventaTon || {})) casa.set(day, ton);
  const series = grafica.materializePlantMonth({
    year: 2026,
    month: 10,
    plant: PLANT,
    corteYmd: CORTE,
    project: true,
    projection: { corteYmdStr: CORTE, byPlant: new Map([[PLANT, prom()]]) },
    casaTon: casa,
    comTon: new Map(),
    cdByFecha: new Map(Object.entries(rates || {})),
    priorCdByFecha: new Map((prior || []).map((day) => [day.fecha, day.byPlant[PLANT]])),
    skipDay1Fallback: true,
  });
  const day = series.resolved.find((row) => row.fecha === fecha);
  assert.ok(day, fecha);
  return day;
}

test("San Luis 04/10 muestra en Excel la misma comisión y el mismo resultado que el dashboard", () => {
  const rates = { "2026-10-03": -4.33, "2026-10-05": -3.86, "2026-10-10": 0 };
  const venta = { "2026-10-03": 1, "2026-10-04": 1.701, "2026-10-05": 1, "2026-10-10": 2.973 };
  const wb = workbook({ rates, venta });
  const dashboard = dashboardDay("2026-10-04", rates, venta);
  assert.equal(dashboard.ventaKg, VENTA);
  assert.equal(dashboard.cdKg, -4.33);
  assert.equal(dashboard.cdSource, "LAST_REAL_FALLBACK");
  assert.equal(dashboard.cdSourceDate, "2026-10-03");

  const comisiones = wb.getWorksheet("Provincia Comisiones");
  assert.equal(comisiones.getCell(5, 2).value, -4.33);
  assert.equal(comisiones.getCell(4, 2).value, -4.33);
  assert.equal(comisiones.getCell(6, 2).value, -3.86);
  assert.equal(comisiones.getCell(11, 2).value, -4.3);

  const ws = wb.getWorksheet("IGF Diario San Luis");
  const row = rowByDate(ws, "2026-10-04");
  assert.equal(row, 11);
  assert.equal(ws.getCell(5, 30).value, "C&D");
  assert.equal(ws.getCell(5, 32).value, "RESULTADO POR KG");
  assert.equal(ws.getCell(5, 33).value, "RESULTADO");
  assert.equal(
    formulaOf(ws.getCell(row, 30)),
    "IF(AND(ISNUMBER('Provincia Comisiones'!B5),ISNUMBER('Provincia Comisiones'!B5)),'Provincia Comisiones'!B5,\"\")"
  );
  assert.equal(formulaOf(ws.getCell(row, 32)), "IF(AND(ISNUMBER(AB11),ISNUMBER(AD11)),AB11+AD11,\"\")");
  assert.equal(formulaOf(ws.getCell(row, 33)), "IF(AND(ISNUMBER(AF11),ISNUMBER(B11)),AF11*B11,\"\")");
  assert.equal(ws.getCell(row, 30).numFmt, "#,##0.00;[Red]-#,##0.00");
  assert.equal(ws.getCell(row, 32).numFmt, "#,##0.00;[Red]-#,##0.00");
  assert.equal(ws.getCell(row, 33).numFmt, '"$"#,##0.00;[Red]-"$"#,##0.00');

  const resultadoKg = SOBRANTE + dashboard.cdKg;
  const resultadoMxn = resultadoKg * VENTA;
  assert.equal(round2(dashboard.cdKg), -4.33);
  assert.equal(round2(resultadoKg), 5.69);
  assert.equal(round2(resultadoMxn), 9680.43);
  assert.ok(Math.abs(resultadoKg - 5.6910229759) < 1e-9);
  assert.ok(Math.abs(resultadoMxn - 9680.430082) < 1e-6);

  const own = dashboardDay("2026-10-03", rates, venta);
  assert.equal(own.cdKg, -4.33);
  assert.equal(own.cdSource, "REAL");
  assert.equal(own.cdSourceDate, null);
  const later = dashboardDay("2026-10-05", rates, venta);
  assert.equal(later.cdKg, -3.86);
  assert.equal(later.cdSource, "REAL");
  const projected = dashboardDay("2026-10-10", rates, venta);
  assert.equal(projected.cdKg, -4.3);
  assert.equal(projected.cdSource, "FORECAST");
  assert.equal(projected.cdSourceDate, null);
  assert.equal(comisiones.getCell(11, 2).value, projected.cdKg);
});

test("la tasa propia, el cero, el mes anterior y la ausencia conservan la regla 078-R2", () => {
  const zeroBook = workbook({
    rates: { "2026-10-02": 0, "2026-10-01": -1 },
    venta: { "2026-10-02": 1 },
  });
  assert.equal(zeroBook.getWorksheet("Provincia Comisiones").getCell(3, 2).value, 0);

  const none = workbook({
    rates: {},
    venta: { "2026-10-04": 1.701 },
  });
  assert.equal(none.getWorksheet("Provincia Comisiones").getCell(5, 2).value, null);

  const prior = workbook({
    rates: {},
    venta: { "2026-10-01": 1 },
    prior: priorDays([["2026-09-30", -1.25], ["2026-08-31", -7]]),
  });
  assert.equal(prior.getWorksheet("Provincia Comisiones").getCell(2, 2).value, -1.25);
  const fromPrior = dashboardDay("2026-10-01", {}, { "2026-10-01": 1 }, priorDays([["2026-09-30", -1.25]]));
  assert.equal(fromPrior.cdKg, -1.25);
  assert.equal(fromPrior.cdSource, "LAST_REAL_FALLBACK");
  assert.equal(fromPrior.cdSourceDate, "2026-09-30");

  const tooOld = workbook({
    rates: {},
    venta: { "2026-10-01": 1 },
    prior: priorDays([["2026-08-31", -7]]),
  });
  assert.equal(tooOld.getWorksheet("Provincia Comisiones").getCell(2, 2).value, null);
});

test("octubre 2026 conserva el cierre domingo-sábado y el resumen semanal no vuelve a 05-11", () => {
  const wb = workbook({
    rates: { "2026-10-03": -4.33 },
    venta: { "2026-10-04": 1.701 },
  });
  const ws = wb.getWorksheet("IGF Diario San Luis");
  assert.equal(rowByDate(ws, "2026-10-04"), 11);
  assert.equal(rowByDate(ws, "2026-10-10"), 17);
  assert.equal(rowByDate(ws, "2026-10-11"), 20);
  assert.equal(rowByDate(ws, "2026-10-17"), 26);
  assert.deepEqual(rowByLabel(ws, "Semana 40"), [9]);
  assert.deepEqual(rowByLabel(ws, "Semana 41"), [18]);
  assert.deepEqual(rowByLabel(ws, "Semana 42"), [27]);
  assert.deepEqual(rowByLabel(ws, "Semana 43"), [36]);
  assert.deepEqual(rowByLabel(ws, "Semana 44"), [46]);
  assert.equal(formulaOf(ws.getCell(18, 2)), "IF(COUNT(B11:B17)=0,\"\",SUM(B11:B17))");
  assert.equal(formulaOf(ws.getCell(27, 2)), "IF(COUNT(B20:B26)=0,\"\",SUM(B20:B26))");
  assert.equal(formulaOf(ws.getCell(18, 2)).includes("B12:B18"), false);

  const week41 = weekly.weekOf("2026-10-04");
  const week42 = weekly.weekOf("2026-10-11");
  assert.equal(week41.week_number, 41);
  assert.equal(week41.fecha_desde, "2026-10-04");
  assert.equal(week41.fecha_hasta, "2026-10-10");
  assert.equal(week42.week_number, 42);
  assert.equal(week42.fecha_desde, "2026-10-11");
  assert.equal(week42.fecha_hasta, "2026-10-17");
  assert.equal(WEEKLY.includes("resolveRealDayComDesc"), false);

  igf.fillIgfDiarioProvincia(wb, {
    year: 2026,
    month: 10,
    plantSheets: ["IGF Diario San Luis"],
  });
  const provincia = wb.getWorksheet("IGF Diario Provincia");
  assert.equal(rowByDate(provincia, "2026-10-10"), 17);
  assert.equal(rowByDate(provincia, "2026-10-11"), 20);
  assert.deepEqual(rowByLabel(provincia, "Semana 41"), [18]);
  assert.match(formulaOf(provincia.getCell(11, 30)), /IGF Diario San Luis/);
  const resolver = FORECAST.slice(FORECAST.indexOf("function capturedRateMap"), FORECAST.indexOf("function hojaB"));
  assert.equal(resolver.includes("San Luis"), false);
  assert.equal(resolver.includes("2026-10-04"), false);
  assert.equal(resolver.includes("-4.33"), false);
  assert.match(FORECAST, /resolveRealDayComDesc\(/);
  assert.equal(EXPENSE.includes("resolveRealDayComDesc"), false);
  assert.equal(EXPENSE.includes("2026-10-04"), false);
});
