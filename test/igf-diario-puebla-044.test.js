"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

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
    const row = day + 5;
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 1;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 19;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (day === 17) compras.getCell(row, 50).value = 9.5;
    if (day === 18) {
      compras.getCell(row, 15).value = { sharedFormula: "O6", result: 11.965423104349892 };
      compras.getCell(row, 36).value = { sharedFormula: "AJ6", result: 1.23 };
    } else if (day === 20) {
      compras.getCell(row, 15).value = { sharedFormula: "O6" };
      compras.getCell(row, 36).value = { sharedFormula: "AJ6", result: 1.5 };
    } else if (day === 1) {
      compras.getCell(row, 15).value = {
        formula: `IF(ISNUMBER(AX${row}),AX${row},"")`,
        ref: "O6:O31",
        shareType: "shared",
      };
      compras.getCell(row, 36).value = {
        formula: `IF(ISNUMBER(AY${row}),AY${row},"")`,
        ref: "AJ6:AJ31",
        shareType: "shared",
      };
    } else {
      compras.getCell(row, 15).value = { sharedFormula: "O6" };
      compras.getCell(row, 36).value = { sharedFormula: "AJ6" };
    }
  }
  return wb;
}

test("una fórmula compartida con result se arrastra y el XLSX reabierto conserva el amarillo", async () => {
  const wb = book();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.match(String(ws.getCell(28, 6).value.formula), /CONTROL DE COMPRAS/);
  assert.equal(yellow(ws.getCell(28, 6)), "FFFFFF00");
  assert.equal(yellow(ws.getCell(28, 7)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(27, 6)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(26, 6)), "FFFFFF00");
  assert.equal(yellow(ws.getCell(29, 6)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(29, 7)), "FFFFFF00");
  assert.notEqual(yellow(ws.getCell(35, 6)), "FFFFFF00");
  const file = path.join(os.tmpdir(), "igf-044-shared.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Puebla");
  assert.equal(yellow(re.getCell(28, 6)), "FFFFFF00");
  assert.equal(yellow(re.getCell(28, 7)), "FFFFFF00");
  assert.notEqual(yellow(re.getCell(27, 6)), "FFFFFF00");
});
