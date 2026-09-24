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

function colIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function sourceNumber(ws, addr) {
  const match = String(addr).match(/!([A-Z]+)(\d+)$/);
  if (!match) return null;
  const value = ws.getCell(Number(match[2]), colIndex(match[1])).value;
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "result")) {
    return typeof value.result === "number" ? value.result : null;
  }
  return typeof value === "number" ? value : null;
}

function evalCarry(formula, compras) {
  const text = String(formula);
  if (text === '""') return null;
  const match = text.match(/^IF\(AND\(ISNUMBER\((.+)\),\1<>0\),\1,([\s\S]*)\)$/);
  if (!match) throw new Error(`formula no reconocida: ${text}`);
  const n = sourceNumber(compras, match[1]);
  if (typeof n === "number" && n !== 0) return n;
  return evalCarry(match[2], compras);
}

function book(costo18, flete18) {
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
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 20;
    venta.getCell(day + 1, 9).value = 20;
    com.getCell(day + 1, 1).value = day;
    com.getCell(day + 1, 2).value = -0.5;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = day === 19 ? 19.530989164349892 : 19;
    const row = day === 1 ? 6 : day === 16 ? 25 : day === 18 ? 27 : day === 19 ? 28 : day === 20 ? 29 : day + 40;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (day === 1) compras.getCell(row, 15).value = { formula: "10+1.095423176409726", result: 11.095423176409726 };
    if (day === 16) compras.getCell(row, 36).value = { formula: "1+0.5", result: 1.5 };
    if (day === 18) {
      compras.getCell(row, 15).value = { formula: "11+0.965423104349892", result: costo18 };
      compras.getCell(row, 36).value = { formula: "1+0.23", result: flete18 };
    }
  }
  return { wb, compras };
}

test("F28 prueba O27 antes que O6 y el amarillo es condicional", async () => {
  const { wb, compras } = book(11.965423104349892, 1.23);
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  const f = formulaOf(ws.getCell(28, 6));
  const g = formulaOf(ws.getCell(28, 7));
  assert.ok(f.indexOf("O27") < f.indexOf("O6"));
  assert.ok(g.indexOf("AJ27") < g.indexOf("AJ25"));
  assert.equal(evalCarry(f, compras), 11.965423104349892);
  assert.equal(evalCarry(g, compras), 1.23);
  assert.ok(Math.abs(19.530989164349892 - 11.965423104349892 - 1.23 - 6.33556606) < 0.0000001);
  const f20 = formulaOf(ws.getCell(29, 6));
  assert.equal(evalCarry(f20, compras), 11.965423104349892);
  compras.getCell(27, 15).value = { formula: "12", result: 12 };
  assert.equal(evalCarry(f, compras), 12);
  const rules = JSON.stringify(ws.conditionalFormattings || []);
  assert.match(rules, /F28/);
  assert.match(rules, /G28/);
  assert.doesNotMatch(formulaOf(ws.getCell(35, 6)), /!O27\b/);
  assert.doesNotMatch(formulaOf(ws.getCell(36, 6)), /!O6\b/);
  assert.equal(ws.getCell(12, 1).fill.fgColor.argb, "FF000000");
  assert.equal(ws.getCell(12, 2).fill.fgColor.argb, "FFF2F2F2");
  assert.equal(ws.getCell(47, 1).fill.fgColor.argb, "FF000000");
  assert.equal(ws.getCell(47, 2).fill.fgColor.argb, "FFF2F2F2");
  assert.equal(ws.getCell(3, 13).value, 1034293);
  assert.equal(ws.getCell(3, 20).value, 2998518);
  const file = path.join(os.tmpdir(), "igf-040-check.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Puebla");
  const merges = re.model.merges || [];
  for (const range of ["A1:D1", "A4:A5", "B4:D4", "F4:H4", "X4:Y4", "AE4:AF4"]) {
    assert.ok(merges.includes(range), range);
  }
  assert.equal(re.getCell(1, 15).font.size, 18);
  assert.equal(re.getCell(3, 13).font.size, 14);
  assert.equal(re.getCell(3, 13).alignment.horizontal, "center");
  assert.equal(re.getCell(45, 1).value, "Semana 5");
  assert.equal(re.getCell(47, 1).value, "TOTAL MES");
  assert.equal(re.getCell(12, 3).numFmt, "#,##0.00;[Red]-#,##0.00");
});
