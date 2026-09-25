"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function yellow(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function book() {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = "Puebla\nCASA";
  venta.getCell(1, 9).value = "Puebla\nCOMISIONISTA";
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 1;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = day === 19 ? 19.530989164349892 : 19;
    const row = day + 5;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(row, 50).value = null;
    compras.getCell(row, 51).value = null;
    if (day === 18) {
      compras.getCell(row, 50).value = 11.965423104349892;
      compras.getCell(row, 51).value = 1.23;
    }
    if (day === 20) compras.getCell(row, 51).value = 1.5;
    if (day === 16) compras.getCell(row, 50).value = 0;
    compras.getCell(row, 15).value = { formula: `IF(ISNUMBER(AX${row}),AX${row},"")` };
    compras.getCell(row, 36).value = { formula: `IF(ISNUMBER(AY${row}),AY${row},"")` };
  }
  return { wb, compras };
}

test("el 19 queda amarillo al exportar y una fórmula sin resultado no oculta una compra", async () => {
  const { wb } = book();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.match(formulaOf(ws.getCell(28, 6)), /CONTROL DE COMPRAS/);
  assert.match(formulaOf(ws.getCell(28, 8)), /C28-F28-G28/);
  assert.equal(yellow(ws.getCell(28, 6)), "FFFFFF00");
  assert.equal(yellow(ws.getCell(28, 7)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(27, 6)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(27, 7)), "FFFFFF00");
  assert.equal(yellow(ws.getCell(29, 6)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(29, 7)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(35, 6)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(35, 7)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(36, 6)), "FFFFFF00");
  const file = path.join(os.tmpdir(), "igf-043-yellow.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Puebla");
  assert.equal(yellow(re.getCell(28, 6)), "FFFFFF00");
  assert.equal(yellow(re.getCell(28, 7)), "FFFFFF00");
  assert.notEqual(yellow(re.getCell(27, 6)), "FFFFFF00");
  assert.equal(re.getCell(45, 1).value, "Semana 5");
  assert.equal(re.getCell(47, 1).value, "TOTAL MES");
  assert.equal(re.getColumn(35).hidden, true);
  assert.equal(re.getColumn(34).hidden, false);
});
