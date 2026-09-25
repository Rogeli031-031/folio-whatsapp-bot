"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function fillOf(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function buildBook() {
  const wb = new ExcelJS.Workbook();
  igf.reserveSheet(wb);
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 1).value = "DÍA";
  venta.getCell(1, 12).value = "Puebla\nCASA";
  venta.getCell(1, 13).value = "Puebla\nCOMISIONISTA";
  const com = wb.addWorksheet("Provincia Comisiones");
  com.getCell(1, 1).value = "DÍA";
  com.getCell(1, 2).value = "Puebla";
  const precio = wb.addWorksheet("PRECIO");
  precio.getCell(1, 1).value = "Fecha";
  precio.getCell(1, 2).value = "PRECIO";
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 20).value = "HG EN KILOS";
  compras.getCell(5, 20).value = "IMPORTE";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    const fecha = `2026-09-${String(day).padStart(2, "0")}`;
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 12).value = day === 16 ? 1.5 : 2;
    venta.getCell(day + 1, 13).value = 3;
    com.getCell(day + 1, 1).value = day;
    com.getCell(day + 1, 2).value = -0.4;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    if (day !== 23) precio.getCell(day + 1, 2).value = 19.5;
    const compraRow = day < 6 ? day + 5 : day + 7;
    compras.getCell(compraRow, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(compraRow, 15).value = 11.2;
    compras.getCell(compraRow, 20).value = day >= 23 ? -100 : -80;
    compras.getCell(compraRow, 36).value = 1.23;
  }
  return wb;
}

function rowByDate(ws, year, month, day) {
  const want = Date.UTC(year, month - 1, day);
  for (let r = 6; r <= ws.rowCount; r += 1) {
    const v = ws.getCell(r, 1).value;
    if (v instanceof Date && v.getTime() === want) return r;
  }
  return null;
}

test("septiembre 2026 tiene 25 hábiles y no usa el 5 de febrero fijo", () => {
  const sep = igf.monthBusinessDays(2026, 9);
  assert.equal(sep.habiles, 25);
  assert.equal(sep.days.filter((d) => d.inhabil).map((d) => d.day).join(","), "6,13,16,20,27");
  assert.equal(sep.days.some((d) => d.day === 31), false);
  const feb = igf.monthBusinessDays(2026, 2);
  assert.equal(feb.days.find((d) => d.day === 2).inhabil, true);
  assert.equal(feb.days.find((d) => d.day === 5).inhabil, false);
  const nov = igf.monthBusinessDays(2026, 11);
  assert.equal(nov.days.find((d) => d.day === 2).inhabil, false);
  assert.equal(nov.days.find((d) => d.day === 16).inhabil, true);
  const extra = igf.monthBusinessDays(2026, 9, ["2026-09-18"]);
  assert.equal(extra.habiles, 24);
  assert.equal(extra.days.find((d) => d.day === 18).inhabil, true);
});

test("la hoja queda primera y liga cada fecha, incluido el 6 y el día posterior al 23", () => {
  const wb = buildBook();
  igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9, corporativos: 1034293, operativos: 2998518 });
  assert.equal(wb.worksheets[0].name, "IGF Diario Puebla");
  assert.deepEqual(wb.worksheets.slice(1, 5).map((ws) => ws.name), [
    "Provincia Venta Diaria",
    "Provincia Comisiones",
    "PRECIO",
    "CONTROL DE COMPRAS",
  ]);
  const ws = wb.getWorksheet("IGF Diario Puebla");
  assert.equal(ws.getCell(3, 13).value, 1034293);
  assert.equal(ws.getCell(3, 20).value, 2998518);
  assert.equal(ws.getCell(5, 24).value, "IMPORTE HG");
  assert.equal(ws.getCell(5, 25).value, "IMPORTE HG POR KG");
  const r1 = rowByDate(ws, 2026, 9, 1);
  const r6 = rowByDate(ws, 2026, 9, 6);
  const r16 = rowByDate(ws, 2026, 9, 16);
  const r23 = rowByDate(ws, 2026, 9, 23);
  const r30 = rowByDate(ws, 2026, 9, 30);
  assert.equal(rowByDate(ws, 2026, 9, 31), null);
  assert.match(formulaOf(ws.getCell(r1, 2)), /'Provincia Venta Diaria'!L2\+'Provincia Venta Diaria'!M2\)\*1000/);
  assert.equal(formulaOf(ws.getCell(r1, 2)).includes("!H2"), false);
  assert.equal(formulaOf(ws.getCell(r6, 3)), 'IF(AND(ISNUMBER(PRECIO!B7),ISNUMBER(PRECIO!B7)),PRECIO!B7,"")');
  assert.match(formulaOf(ws.getCell(r6, 6)), /'CONTROL DE COMPRAS'!O13/);
  assert.match(formulaOf(ws.getCell(r6, 7)), /'CONTROL DE COMPRAS'!AJ13/);
  assert.match(formulaOf(ws.getCell(r6, 24)), /'CONTROL DE COMPRAS'!T13/);
  assert.equal(ws.getCell(r6, 13).value, null);
  assert.equal(fillOf(ws.getCell(r6, 13)), "FFFFFF00");
  assert.equal(ws.getCell(r6, 20).value, null);
  assert.match(formulaOf(ws.getCell(r6, 2)), /\*1000/);
  assert.match(formulaOf(ws.getCell(r16, 2)), /\*1000/);
  assert.equal(ws.getCell(r16, 13).value, null);
  assert.equal(fillOf(ws.getCell(r16, 13)), "FFFFFF00");
  assert.match(formulaOf(ws.getCell(r1, 13)), /\(\$M\$3\/25\)\/B/);
  assert.match(formulaOf(ws.getCell(r23, 6)), /'CONTROL DE COMPRAS'!O/);
  assert.match(formulaOf(ws.getCell(r23, 7)), /'CONTROL DE COMPRAS'!AJ/);
  assert.match(formulaOf(ws.getCell(r23, 24)), /'CONTROL DE COMPRAS'!T/);
  assert.match(formulaOf(ws.getCell(r23, 25)), /X\d+\/B\d+/);
  assert.match(formulaOf(ws.getCell(r23, 29)), /'Provincia Comisiones'!B/);
  assert.match(formulaOf(ws.getCell(r23, 31)), /AA\d+\+AC\d+/);
  assert.match(formulaOf(ws.getCell(r23, 32)), /AE\d+\*B\d+/);
  assert.match(formulaOf(ws.getCell(r23, 3)), /PRECIO!B24/);
  assert.doesNotMatch(formulaOf(ws.getCell(r23, 3)), /,0\)/);
  assert.equal(ws.getCell(r6, 1).numFmt, "dd/mm/yyyy");
  assert.equal(ws.getCell(r1 + 6, 1).value, "Semana 1");
  assert.match(formulaOf(ws.getCell(r1 + 6, 2)), /SUM\(B6:B11\)/);
  assert.match(formulaOf(ws.getCell(r1 + 6, 4)), /SUM\(D6:D11\)/);
  assert.equal(ws.getCell(r30, 1).value.getUTCDate(), 30);
  const total = ws.getCell(ws.rowCount, 1).value;
  assert.equal(total, "TOTAL MES");
  assert.match(formulaOf(ws.getCell(ws.rowCount, 2)), /SUM\(/);
  assert.doesNotMatch(formulaOf(ws.getCell(r16, 13)), /IFERROR/);
});

test("sin precio, con B en cero y sin gastos no inventa ceros", () => {
  const wb = buildBook();
  const venta = wb.getWorksheet("Provincia Venta Diaria");
  venta.getCell(2, 12).value = 0;
  venta.getCell(2, 13).value = 0;
  igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9 });
  const ws = wb.getWorksheet("IGF Diario Puebla");
  const r1 = rowByDate(ws, 2026, 9, 1);
  assert.equal(ws.getCell(3, 13).value, null);
  assert.equal(ws.getCell(3, 20).value, null);
  assert.match(formulaOf(ws.getCell(r1, 13)), /B\d+<>0/);
  assert.match(formulaOf(ws.getCell(r1, 13)), /ISNUMBER\(\$M\$3\)/);
  assert.doesNotMatch(formulaOf(ws.getCell(r1, 13)), /IFERROR\([^)]+,0\)/);
});

test("otras plantas y el libro global no reservan la hoja", () => {
  const fn = LIB.slice(LIB.indexOf("async function generarDashboardArrForecast"), LIB.indexOf("async function fetchForecastKgByPlantMap"));
  assert.match(fn, /const includeIgfDiario = Boolean\(exportPlant\)/);
  assert.match(fn, /igfDiarioPuebla\.reserveSheet\(wb, exportPlant\)/);
  assert.match(fn, /igfDiarioPuebla\.fillIgfDiarioPuebla\(wb/);
  const reserveAt = fn.indexOf("igfDiarioPuebla.reserveSheet");
  const hojaA = fn.indexOf("hojaA(wb");
  const fillAt = fn.indexOf("igfDiarioPuebla.fillIgfDiarioPuebla");
  const comprasAt = fn.indexOf("appendComprasWorksheet");
  assert.ok(reserveAt > 0 && reserveAt < hojaA);
  assert.ok(comprasAt < fillAt);
  assert.equal(forecast.plantsEquivalent("Acapulco", "Puebla"), false);
  assert.equal(forecast.plantsEquivalent("GT Puebla", "Puebla"), true);
  const start = SERVER.indexOf('app.get("/api/arr/dashboard-excel"');
  const slice = SERVER.slice(start, start + 18000);
  assert.match(slice, /computeIgfForecastMiniPayload\(client, igfForecast, year, month, uploadDay\)/);
  assert.match(slice, /plantsEquivalent\(row && row\.plant_code, plantCode\)/);
  assert.match(slice, /igfDiarioGastos/);
  assert.match(slice, /importeArrMini\(plantMini && plantMini\.corporativos\)/);
  assert.match(slice, /importeArrMini\(plantMini && plantMini\.operativos\)/);
  assert.match(slice, /if \(value == null \|\| value === ""\) return null/);
});
