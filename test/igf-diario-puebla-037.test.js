"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function fillOf(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function rowByDate(ws, year, month, day) {
  const want = Date.UTC(year, month - 1, day);
  for (let r = 6; r <= ws.rowCount; r += 1) {
    const v = ws.getCell(r, 1).value;
    if (v instanceof Date && v.getTime() === want) return r;
  }
  return null;
}

function book(month) {
  const wb = new ExcelJS.Workbook();
  const last = new Date(2026, month, 0).getDate();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 12).value = "Puebla\nCASA";
  venta.getCell(1, 13).value = "Puebla\nCOMISIONISTA";
  const com = wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 20).value = "HG EN KILOS";
  compras.getCell(5, 20).value = "IMPORTE";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= last; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 12).value = 2;
    venta.getCell(day + 1, 13).value = 3;
    com.getCell(day + 1, 1).value = day;
    com.getCell(day + 1, 2).value = -0.4;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, month - 1, day));
    precio.getCell(day + 1, 2).value = 19.5;
    compras.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/2026`;
    compras.getCell(day + 5, 15).value = 11;
    compras.getCell(day + 5, 20).value = -80;
    compras.getCell(day + 5, 36).value = 1.23;
  }
  return wb;
}

test("hábil sin presupuesto no copia el margen; cero explícito sí se usa", () => {
  const missing = book(9);
  igf.fillIgfDiarioPuebla(missing, { year: 2026, month: 9, corporativos: null, operativos: "" });
  const ws = missing.getWorksheet("IGF Diario Puebla");
  const habil = rowByDate(ws, 2026, 9, 1);
  const domingo = rowByDate(ws, 2026, 9, 6);
  assert.equal(ws.getCell(3, 13).value, null);
  assert.equal(ws.getCell(3, 20).value, null);
  assert.match(formulaOf(ws.getCell(habil, 15)), /AND\(ISNUMBER\(H\d+\),ISNUMBER\(M\d+\)\)/);
  assert.doesNotMatch(formulaOf(ws.getCell(habil, 15)), /IF\(ISNUMBER\(H\d+\),H\d+,""\)$/);
  assert.match(formulaOf(ws.getCell(habil, 22)), /AND\(ISNUMBER\(O\d+\),ISNUMBER\(T\d+\)\)/);
  assert.match(formulaOf(ws.getCell(habil, 27)), /V\d+-Y\d+/);
  assert.equal(ws.getCell(domingo, 13).value, null);
  assert.equal(fillOf(ws.getCell(domingo, 13)), "FFFFFF00");
  assert.equal(fillOf(ws.getCell(domingo, 20)), "FFFFFF00");
  assert.equal(formulaOf(ws.getCell(domingo, 15)), `IF(ISNUMBER(H${domingo}),H${domingo},"")`);
  assert.equal(formulaOf(ws.getCell(domingo, 22)), `IF(ISNUMBER(O${domingo}),O${domingo},"")`);

  const zero = book(9);
  igf.fillIgfDiarioPuebla(zero, { year: 2026, month: 9, corporativos: 0, operativos: 0 });
  const z = zero.getWorksheet("IGF Diario Puebla");
  assert.equal(z.getCell(3, 13).value, 0);
  assert.equal(z.getCell(3, 20).value, 0);
  assert.match(formulaOf(z.getCell(rowByDate(z, 2026, 9, 1), 13)), /\(\$M\$3\/25\)\//);
});

test("subtotales no multiplican rangos con texto y quedan vacíos sin números", () => {
  const wb = book(9);
  igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9, corporativos: 1034293, operativos: 2998518 });
  const ws = wb.getWorksheet("IGF Diario Puebla");
  const week = ws.getCell(12, 3);
  assert.match(formulaOf(week), /IF\(AND\(ISNUMBER\(C6\),ISNUMBER\(B6\)\),C6\*B6,0\)/);
  assert.match(formulaOf(week), /IF\(AND\(ISNUMBER\(C6\),ISNUMBER\(B6\)\),B6,0\)/);
  assert.doesNotMatch(formulaOf(week), /\*\(C6:C11\)\*\(B6:B11\)/);
  assert.match(formulaOf(ws.getCell(12, 2)), /IF\(COUNT\(B6:B11\)=0,"",SUM\(B6:B11\)\)/);
  assert.match(formulaOf(ws.getCell(12, 4)), /IF\(COUNT\(D6:D11\)=0,"",SUM\(D6:D11\)\)/);
  const totalRow = ws.rowCount;
  assert.equal(ws.getCell(totalRow, 1).value, "TOTAL MES");
  assert.match(formulaOf(ws.getCell(totalRow, 2)), /IF\(COUNT\(/);
  assert.match(formulaOf(ws.getCell(totalRow, 2)), /SUM\(/);
  assert.doesNotMatch(formulaOf(ws.getCell(totalRow, 2)), /SUM\(0\)/);
});

test("transmisión presidencial es el 1 de octubre y septiembre 2026 sigue en 25", () => {
  for (const year of [2024, 2030, 2036]) {
    assert.equal(igf.federalRestDays(year).includes(`${year}-10-01`), true);
    assert.equal(igf.federalRestDays(year).includes(`${year}-12-01`), false);
    assert.equal(igf.monthBusinessDays(year, 10).days.find((d) => d.day === 1).inhabil, true);
  }
  const dec = igf.monthBusinessDays(2036, 12);
  const dec1 = dec.days.find((d) => d.day === 1);
  assert.equal(igf.federalRestDays(2036).includes("2036-12-01"), false);
  assert.equal(dec1.inhabil, dec1.fecha && new Date(Date.UTC(2036, 11, 1)).getUTCDay() === 0);
  const sep = igf.monthBusinessDays(2026, 9);
  assert.equal(sep.habiles, 25);
  assert.equal(sep.days.filter((d) => d.inhabil).map((d) => d.day).join(","), "6,13,16,20,27");
});

test("la ruta no convierte null ni vacío en cero", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const start = server.indexOf('app.get("/api/arr/dashboard-excel"');
  const slice = server.slice(start, start + 18000);
  assert.match(slice, /if \(value == null \|\| value === ""\) return null/);
  assert.doesNotMatch(slice, /corporativos: Number\(pueblaMini\.corporativos\)/);
  assert.doesNotMatch(slice, /operativos: Number\(pueblaMini\.operativos\)/);
});
