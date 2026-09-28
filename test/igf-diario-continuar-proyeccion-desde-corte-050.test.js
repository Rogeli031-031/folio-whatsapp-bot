"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

const TONS = { 25: 42, 26: 49.5, 27: 21.5, 28: 57, 29: 61.5, 30: 45.5 };

function igfRow(day) {
  if (day <= 6) return 5 + day;
  if (day <= 13) return 7 + day;
  if (day <= 20) return 8 + day;
  if (day <= 27) return 11 + day;
  return 13 + day;
}

function colLetter(col) {
  let n = col;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function build(opts) {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  const comisiones = wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  venta.getCell(1, 1).value = "DÍA";
  venta.getCell(1, 2).value = "Otra";
  venta.getCell(1, opts.totalCol).value = opts.header;
  venta.getCell(1, 10).value = `${opts.header}\nCASA`;
  venta.getCell(1, 11).value = `${opts.header}\nCOMISIONISTA`;
  comisiones.getCell(1, 1).value = "DÍA";
  comisiones.getCell(1, 2).value = opts.header;
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 20).value = "HG EN KILOS";
  compras.getCell(5, 20).value = "IMPORTE";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    const tons = Object.prototype.hasOwnProperty.call(opts.tons || TONS, day) ? (opts.tons || TONS)[day] : 10;
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 2).value = 1;
    venta.getCell(day + 1, opts.totalCol).value = tons;
    venta.getCell(day + 1, 10).value = opts.casa;
    venta.getCell(day + 1, 11).value = opts.com;
    comisiones.getCell(day + 1, 1).value = day;
    comisiones.getCell(day + 1, 2).value = day >= 25 ? -1.5 : -0.4;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = day >= 25 ? 21 : 19;
    const compraRow = day + 5;
    compras.getCell(compraRow, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(compraRow, 15).value = day >= 25 ? 12.5 : 11;
    compras.getCell(compraRow, 20).value = -90;
    compras.getCell(compraRow, 36).value = day >= 25 ? 1.8 : 1.2;
  }
  if (opts.clearDay) {
    compras.getCell(opts.clearDay + 5, 15).value = null;
    compras.getCell(opts.clearDay + 5, 36).value = null;
  }
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: opts.code,
    humanName: opts.human,
    plantEquivalent: (label) => forecast.plantsEquivalent(label, opts.code),
    corteYmd: opts.corte,
    corporativos: 1000,
    operativos: 2000,
  });
  return { wb, ws, venta };
}

function formula(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

test("Puebla corte 25 sigue hasta el 30 y usa la columna total", async () => {
  const totalCol = 4;
  const { wb, ws, venta } = build({
    corte: "2026-09-25",
    code: "Puebla",
    human: "Puebla",
    header: "Puebla",
    totalCol,
    casa: 10,
    com: 20,
    clearDay: 24,
  });
  assert.equal(ws.getCell(2, 1).value, "PLANTA PUEBLA");
  const letter = colLetter(totalCol);
  for (const day of [25, 26, 27, 28, 29, 30]) {
    const row = igfRow(day);
    const ventaRow = day + 1;
    const f = formula(ws.getCell(row, 2));
    assert.match(f, new RegExp(`${letter}${ventaRow}\\*1000`));
    assert.doesNotMatch(f, /J\d+\+|K\d+/);
    assert.doesNotMatch(f, new RegExp(`!B${ventaRow}\\*`));
    assert.equal(venta.getCell(ventaRow, totalCol).value * 1000, TONS[day] * 1000);
    assert.notEqual(venta.getCell(ventaRow, 10).value + venta.getCell(ventaRow, 11).value, TONS[day]);
    assert.match(formula(ws.getCell(row, 3)), new RegExp(`PRECIO!B${ventaRow}`));
    assert.match(formula(ws.getCell(row, 6)), new RegExp(`CONTROL DE COMPRAS'!O${day + 5}`));
    assert.match(formula(ws.getCell(row, 7)), new RegExp(`CONTROL DE COMPRAS'!AJ${day + 5}`));
    assert.match(formula(ws.getCell(row, 24)), new RegExp(`CONTROL DE COMPRAS'!T${day + 5}`));
    assert.match(formula(ws.getCell(row, 29)), new RegExp(`Provincia Comisiones'!B${ventaRow}`));
    assert.match(formula(ws.getCell(row, 4)), /C\d+\*B\d+/);
    assert.match(formula(ws.getCell(row, 8)), /C\d+-F\d+-G\d+/);
    assert.match(formula(ws.getCell(row, 32)), /AE\d+\*B\d+/);
    assert.notEqual(ws.getCell(row, 2).value, null);
    assert.notEqual(ws.getCell(row, 32).value, null);
  }
  assert.match(formula(ws.getCell(igfRow(26), 2)), /D27\*1000/);
  assert.equal(venta.getCell(27, totalCol).value, 49.5);
  const historical = formula(ws.getCell(igfRow(24), 6));
  assert.match(historical, /O28/);
  const projected = formula(ws.getCell(igfRow(25), 6));
  assert.match(projected, /O30/);
  assert.doesNotMatch(projected, /O28/);
  assert.match(formula(ws.getCell(39, 2)), /B32:B38/);
  assert.match(formula(ws.getCell(45, 2)), /B41:B43/);
  assert.match(formula(ws.getCell(47, 2)), /B39/);
  assert.match(formula(ws.getCell(47, 2)), /B45/);

  const file = path.join(os.tmpdir(), "igf-050-puebla.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Puebla");
  assert.match(formula(re.getCell(igfRow(26), 2)), /D27\*1000/);
  assert.match(formula(re.getCell(igfRow(30), 3)), /PRECIO!B31/);
  assert.match(formula(re.getCell(45, 2)), /B41:B43/);
});

test("Puebla corte 27 mantiene reales hasta el 26 y proyecta del 27 al 30", () => {
  const { ws } = build({
    corte: "2026-09-27",
    code: "Puebla",
    human: "Puebla",
    header: "Puebla",
    totalCol: 4,
    casa: 10,
    com: 20,
    clearDay: 26,
  });
  for (let day = 1; day <= 30; day += 1) {
    assert.equal(typeof ws.getCell(igfRow(day), 2).value, "object", `día ${day}`);
  }
  assert.match(formula(ws.getCell(igfRow(26), 6)), /O30/);
  const projected = formula(ws.getCell(igfRow(27), 6));
  assert.match(projected, /O32/);
  assert.doesNotMatch(projected, /O30/);
  assert.match(formula(ws.getCell(39, 2)), /B32:B38/);
  assert.match(formula(ws.getCell(45, 2)), /B41:B43/);
});

test("Acapulco usa su columna total y no la de otra planta", () => {
  const { ws } = build({
    corte: "2026-09-25",
    code: "Acapulco",
    human: "Acapulco",
    header: "Acapulco",
    totalCol: 5,
    casa: 3,
    com: 4,
  });
  assert.equal(ws.getCell(2, 1).value, "PLANTA ACAPULCO");
  const f = formula(ws.getCell(igfRow(26), 2));
  assert.match(f, /E27\*1000/);
  assert.doesNotMatch(f, /!B27\*/);
  assert.doesNotMatch(f, /PUEBLA|J27\+/);
});

test("Querétaro con código Queretaro encuentra su columna total", () => {
  const { wb, ws } = build({
    corte: "2026-09-25",
    code: "Queretaro",
    human: "Querétaro",
    header: "Querétaro",
    totalCol: 6,
    casa: 8,
    com: 1,
  });
  assert.equal(wb.getWorksheet("IGF Diario Queretaro").name, "IGF Diario Queretaro");
  assert.equal(ws.getCell(2, 1).value, "PLANTA QUERÉTARO");
  const f = formula(ws.getCell(igfRow(26), 2));
  assert.match(f, /F27\*1000/);
  assert.doesNotMatch(f, /!B27\*|PUEBLA|J27\+/);
});
