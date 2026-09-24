"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function fillOf(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function rowByDate(ws, day) {
  const want = Date.UTC(2026, 8, day);
  for (let r = 6; r <= ws.rowCount; r += 1) {
    const v = ws.getCell(r, 1).value;
    if (v instanceof Date && v.getTime() === want) return r;
  }
  return null;
}

function book() {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = "Puebla\nCASA";
  venta.getCell(1, 9).value = "Puebla\nCOMISIONISTA";
  const com = wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 20).value = "HG EN KILOS";
  compras.getCell(5, 20).value = "IMPORTE";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  const kg = [64469, 54377, 48822, 70830, 59019, 38595];
  const price = [18.87, 18.87, 18.87, 18.87, 18.87, 19.24];
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    const kilos = day <= 6 ? kg[day - 1] : 1000;
    venta.getCell(day + 1, 8).value = kilos / 2000;
    venta.getCell(day + 1, 9).value = kilos / 2000;
    com.getCell(day + 1, 1).value = day;
    com.getCell(day + 1, 2).value = -0.5;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = day <= 6 ? price[day - 1] : (day === 19 ? 19.530989164349892 : 19.5);
    const row = day + 10;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (day === 17) compras.getCell(row, 15).value = 0;
    if (day === 16) compras.getCell(row, 36).value = 1.11;
    if (day === 18) {
      compras.getCell(row, 15).value = 11.965423104349892;
      compras.getCell(row, 36).value = 1.23;
    }
    if (day !== 19 && day !== 20 && day !== 17 && day !== 18 && day !== 16) {
      compras.getCell(row, 15).value = 10 + day / 10;
      compras.getCell(row, 36).value = 1.2;
    }
    compras.getCell(row, 20).value = -80;
  }
  compras.getCell(29, 15).value = null;
  compras.getCell(29, 36).value = null;
  return { wb, compras };
}

test("el 19 arrastra costo y flete del 18 con fórmula y amarillo", () => {
  const { wb, compras } = book();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  const r19 = rowByDate(ws, 19);
  const r18 = rowByDate(ws, 18);
  const r20 = rowByDate(ws, 20);
  const r24 = rowByDate(ws, 24);
  const r25 = rowByDate(ws, 25);
  assert.equal(r19, 28);
  assert.equal(compras.getCell(29, 15).value, null);
  assert.equal(compras.getCell(29, 36).value, null);
  const f = formulaOf(ws.getCell(28, 6));
  const g = formulaOf(ws.getCell(28, 7));
  assert.match(f, /'CONTROL DE COMPRAS'!O28/);
  assert.match(f, /'CONTROL DE COMPRAS'!O29/);
  assert.doesNotMatch(f, /11\.965423104349892/);
  assert.match(g, /'CONTROL DE COMPRAS'!AJ28/);
  assert.match(g, /'CONTROL DE COMPRAS'!AJ29/);
  assert.equal(fillOf(ws.getCell(28, 6)), "FFFFFF00");
  assert.equal(fillOf(ws.getCell(28, 7)), "FFFFFF00");
  assert.match(formulaOf(ws.getCell(r20, 6)), /'CONTROL DE COMPRAS'!O28/);
  assert.doesNotMatch(formulaOf(ws.getCell(r24, 6)), /'CONTROL DE COMPRAS'!O28/);
  assert.doesNotMatch(formulaOf(ws.getCell(r25, 7)), /'CONTROL DE COMPRAS'!AJ28/);
  assert.equal(ws.getCell(3, 13).value, 1034293);
  assert.equal(ws.getCell(3, 20).value, 2998518);
  assert.equal(ws.getCell(5, 24).value, "IMPORTE HG");
  assert.equal(ws.getCell(45, 1).value, "Semana 5");
  assert.equal(ws.getCell(47, 1).value, "TOTAL MES");
  const c12 = formulaOf(ws.getCell(12, 3));
  assert.match(c12, /IF\(AND\(ISNUMBER\(C6\),ISNUMBER\(B6\)\),C6\*B6,0\)/);
  assert.doesNotMatch(c12, /N\(/);
  const pairs = [[64469.24, 18.86574428822639], [54377.06, 18.86515346456487], [48822.24, 18.86607724494229], [70829.6, 18.866564052107947], [59019.12, 18.86603279298867], [38594.88, 19.23624273478762]];
  const den = pairs.reduce((s, [k]) => s + k, 0);
  const num = pairs.reduce((s, [k, p]) => s + k * p, 0);
  assert.ok(Math.abs(num / den - 18.908463847) < 0.000001);
  assert.equal(ws.getCell(12, 3).numFmt, '#,##0.00;[Red]-#,##0.00');
  assert.equal(ws.getCell(28, 32).numFmt, '"$"#,##0;[Red]-"$"#,##0');
  assert.equal(ws.getColumn(1).width, 16.5547);
  assert.equal(ws.getColumn(34).width, 65.8867);
  assert.equal(ws.getRow(1).height, 25.8);
  assert.equal(fillOf(ws.getCell(12, 1)), "FF000000");
  assert.equal(fillOf(ws.getCell(21, 1)), "FFF2F2F2");
  assert.equal(r18 < r19 && r19 < r20, true);
});
