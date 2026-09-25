"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

function fold(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function igfSheets(wb) {
  return wb.worksheets.filter((ws) => fold(ws.name).startsWith("IGF DIARIO"));
}

function addSources(wb, plant) {
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = `${plant}\nCASA`;
  venta.getCell(1, 9).value = `${plant}\nCOMISIONISTA`;
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 4;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 21;
    compras.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(day + 5, 15).value = 10;
  }
}

test("Queretaro y Querétaro llenan la hoja ya reservada", async () => {
  const wb = new ExcelJS.Workbook();
  igf.reserveSheet(wb, "Queretaro");
  addSources(wb, "Querétaro");
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    plantName: "Querétaro",
    corteYmd: "2026-09-24",
    corporativos: 800,
    operativos: 900,
  });
  assert.equal(igfSheets(wb).length, 1);
  assert.equal(wb.worksheets[0].name, "IGF Diario Queretaro");
  assert.equal(ws, wb.worksheets[0]);
  assert.equal(ws.getCell(3, 13).value, 800);
  assert.equal(ws.getCell(3, 20).value, 900);
  assert.match(String(ws.getCell(6, 2).value.formula), /\*1000/);
  assert.match(String(ws.getCell(6, 3).value.formula), /PRECIO/);
  assert.equal(ws.getCell(36, 1).value instanceof Date, true);
  assert.equal(ws.getCell(36, 2).value, null);
  assert.equal(ws.getCell(36, 32).value, null);

  const file = path.join(os.tmpdir(), "igf-047-qro.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  assert.equal(igfSheets(again).length, 1);
  assert.equal(again.worksheets[0].name, "IGF Diario Queretaro");
  assert.equal(again.worksheets[0].getCell(36, 2).value, null);
  assert.equal(again.worksheets[0].getCell(3, 13).value, 800);
});

test("Puebla conserva una sola hoja IGF Diario Puebla", () => {
  const wb = new ExcelJS.Workbook();
  igf.reserveSheet(wb, "Puebla");
  addSources(wb, "Puebla");
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    plantName: "Puebla",
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.equal(igfSheets(wb).length, 1);
  assert.equal(wb.worksheets[0].name, "IGF Diario Puebla");
  assert.equal(ws.getCell(3, 13).value, 1034293);
  assert.equal(ws.getCell(3, 20).value, 2998518);
  assert.match(String(ws.getCell(6, 2).value.formula), /\*1000/);
});
