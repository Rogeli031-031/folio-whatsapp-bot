"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");

const igf = require("../lib/igf-diario-puebla");

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
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
    if (day === 18) {
      compras.getCell(row, 15).value = { formula: "11+0.965423104349892", result: 11.965423104349892 };
      compras.getCell(row, 36).value = { formula: "1+0.23", result: 1.23 };
    }
  }
  return wb;
}

test("F28 y G28 se pintan con una condición local y AI/AJ ocultas", async () => {
  const wb = book();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.match(formulaOf(ws.getCell(28, 6)), /CONTROL DE COMPRAS/);
  assert.match(formulaOf(ws.getCell(28, 7)), /CONTROL DE COMPRAS/);
  assert.match(formulaOf(ws.getCell(28, 8)), /C28-F28-G28/);
  assert.match(formulaOf(ws.getCell(28, 35)), /CONTROL DE COMPRAS/);
  assert.match(formulaOf(ws.getCell(28, 36)), /CONTROL DE COMPRAS/);
  const rules = ws.conditionalFormattings || [];
  const fRule = rules.find((item) => item.ref === "F28");
  const gRule = rules.find((item) => item.ref === "G28");
  assert.equal(fRule.rules[0].formulae[0], "AND(ISNUMBER(F28),AI28=1)");
  assert.equal(gRule.rules[0].formulae[0], "AND(ISNUMBER(G28),AJ28=1)");
  assert.equal(ws.getColumn(34).hidden, false);
  assert.equal(ws.getColumn(35).hidden, true);
  assert.equal(ws.getColumn(36).hidden, true);
  const file = path.join(os.tmpdir(), "igf-042-yellow.xlsx");
  await wb.xlsx.writeFile(file);
  const bytes = fs.readFileSync(file);
  fs.unlinkSync(file);
  const zip = await JSZip.loadAsync(bytes);
  const sheets = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .map((name) => zip.file(name).async("string"))
  );
  const sheet = sheets.find((text) => text.includes('sqref="F28"'));
  const styles = await zip.file("xl/styles.xml").async("string");
  for (const ref of ["F28", "G28"]) {
    const block = sheet.match(new RegExp(`<conditionalFormatting sqref="${ref}">([\\s\\S]*?)</conditionalFormatting>`));
    assert.ok(block, ref);
    assert.doesNotMatch(block[1], /CONTROL DE COMPRAS/);
    assert.doesNotMatch(block[1], /!/);
    const dxfId = block[1].match(/dxfId="(\d+)"/)[1];
    const dxfs = [...styles.matchAll(/<dxf>([\s\S]*?)<\/dxf>/g)].map((item) => item[1]);
    assert.match(dxfs[Number(dxfId)], /<fgColor rgb="FFFFFF00"\/>/);
  }
  assert.match(sheet, /min="35"[^>]*hidden="1"/);
  assert.match(sheet, /min="36"[^>]*hidden="1"/);
  assert.doesNotMatch(sheet, /min="34"[^>]*hidden="1"/);
});
