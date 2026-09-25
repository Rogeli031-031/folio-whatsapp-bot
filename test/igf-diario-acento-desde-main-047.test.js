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

test("Queretaro y Querétaro reservan la misma hoja", async () => {
  const wb = new ExcelJS.Workbook();
  const first = igf.reserveSheet(wb, "Queretaro");
  const second = igf.reserveSheet(wb, "Querétaro");
  assert.equal(second, first);
  assert.equal(igfSheets(wb).length, 1);
  assert.equal(first.name, "IGF Diario Queretaro");

  const file = path.join(os.tmpdir(), "igf-047-main-qro.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  assert.equal(igfSheets(again).length, 1);
  assert.equal(again.worksheets[0].name, "IGF Diario Queretaro");
});

test("Puebla conserva una sola hoja IGF Diario Puebla", () => {
  const wb = new ExcelJS.Workbook();
  const reserved = igf.reserveSheet(wb);
  const filled = igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9 });
  assert.equal(igfSheets(wb).length, 1);
  assert.equal(reserved.name, "IGF Diario Puebla");
  assert.equal(filled.name, "IGF Diario Puebla");
  assert.equal(filled.getCell(2, 1).value, "PLANTA PUEBLA");
});
