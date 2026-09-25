"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");

const igf = require("../lib/igf-diario-puebla");

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
    precio.getCell(day + 1, 2).value = 19;
    const row = day + 5;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (day === 18) {
      compras.getCell(row, 15).value = { formula: "11+0.965423104349892", result: 11.965423104349892 };
      compras.getCell(row, 36).value = { formula: "1+0.23", result: 1.23 };
    }
  }
  return wb;
}

test("el amarillo condicional de F28 y G28 se guarda como fgColor", async () => {
  const wb = book();
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  const f = String(ws.getCell(28, 6).value.formula);
  const g = String(ws.getCell(28, 7).value.formula);
  assert.ok(f.indexOf("O23") < f.lastIndexOf("O"));
  assert.match(f, /O23/);
  assert.match(g, /AJ23/);
  const file = path.join(os.tmpdir(), "igf-041-yellow.xlsx");
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
  assert.ok(sheet);
  const styles = await zip.file("xl/styles.xml").async("string");
  for (const ref of ["F28", "G28"]) {
    const rule = sheet.match(new RegExp(`sqref="${ref}"[\\s\\S]*?dxfId="(\\d+)"`));
    assert.ok(rule, ref);
    const dxfs = [...styles.matchAll(/<dxf>([\s\S]*?)<\/dxf>/g)].map((item) => item[1]);
    const dxf = dxfs[Number(rule[1])];
    assert.match(dxf, /patternFill patternType="solid"/);
    assert.match(dxf, /<fgColor rgb="FFFFFF00"\/>/);
    assert.doesNotMatch(dxf, /<bgColor/);
  }
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(bytes);
  const re = again.getWorksheet("IGF Diario Puebla");
  const rules = JSON.stringify(re.conditionalFormattings || []);
  assert.match(rules, /F28/);
  assert.match(rules, /G28/);
  assert.equal(re.getCell(3, 13).value, 1034293);
  assert.equal(re.getCell(3, 20).value, 2998518);
  assert.equal(re.getCell(45, 1).value, "Semana 5");
  assert.equal(re.getCell(47, 1).value, "TOTAL MES");
});
