"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const { appendComprasWorksheet, ESTIMATED_BLUE } = require("../lib/compras-excel");
const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

const PLANTS = ["Acapulco", "Tehuacán"];

function prom(n) {
  return [n, n, n, n, n, n, n];
}

function projection(corte) {
  return {
    corteYmdStr: corte,
    byPlant: new Map([
      ["Acapulco", { promVentaTotal: prom(3), promVentaCasa: prom(1), promVentaComisionista: prom(2) }],
      ["Tehuacán", { promVentaTotal: prom(8), promVentaCasa: prom(5), promVentaComisionista: prom(6) }],
    ]),
  };
}

function monthGrids() {
  const byDate = [];
  const canalByDate = [];
  for (let day = 1; day <= 30; day += 1) {
    const fecha = `2026-09-${String(day).padStart(2, "0")}`;
    const byPlant = {};
    const canals = {};
    if (day === 20) {
      byPlant.Acapulco = 0;
      byPlant["Tehuacán"] = 4;
      canals.Acapulco = { CASA: 0, COMISIONISTA: 0 };
      canals["Tehuacán"] = { CASA: 1, COMISIONISTA: 3 };
    }
    if (day === 25) {
      byPlant.Acapulco = 9;
      byPlant["Tehuacán"] = 7;
      canals.Acapulco = { CASA: 4, COMISIONISTA: 0 };
      canals["Tehuacán"] = { CASA: 1.5, COMISIONISTA: 2.5 };
    }
    byDate.push({ day, fecha, byPlant, tot: 0 });
    canalByDate.push({ day, fecha, byPlant: canals });
  }
  return {
    ventaTonGrid: {
      plants: PLANTS,
      cutoffDay: 99,
      forecastByPlant: new Map(),
      byDate,
    },
    ventaCanal: { byDate: canalByDate },
    descuentoGrid: {
      plants: PLANTS,
      cutoffDay: 99,
      byDate: byDate.map((d) => ({ day: d.day, fecha: d.fecha, byPlant: {} })),
    },
  };
}

function book(corte) {
  const grids = monthGrids();
  const wb = forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    ...grids,
    omitTotProvincia: true,
    pronosticoProjection: projection(corte),
  });
  const aca = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: "Acapulco",
    humanName: "Acapulco",
    plantEquivalent: (label) => forecast.plantsEquivalent(label, "Acapulco"),
    corteYmd: corte,
  });
  const teh = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: "Tehuacán",
    humanName: "Tehuacán",
    plantEquivalent: (label) => forecast.plantsEquivalent(label, "Tehuacán"),
    corteYmd: corte,
  });
  return { wb, aca, teh, venta: wb.getWorksheet("Provincia Venta Diaria") };
}

function assertFutureBlank(ws, row) {
  assert.equal(ws.getCell(row, 1).value instanceof Date, true);
  for (let c = 2; c <= 32; c += 1) assert.equal(ws.getCell(row, c).value, null);
}

test("corte 27: real el 25, proyección el 26 y el 27, y del 28 al 30 solo la fecha", async () => {
  const { wb, aca, teh, venta } = book("2026-09-27");
  assert.equal(venta.getCell(21, 2).value, 0);
  assert.equal(venta.getCell(21, 3).value, 4);
  assert.equal(venta.getCell(26, 2).value, 9);
  assert.equal(venta.getCell(26, 3).value, 7);
  assert.equal(venta.getCell(26, 10).value, 4);
  assert.equal(venta.getCell(26, 11).value, 0);
  assert.equal(venta.getCell(26, 12).value, 1.5);
  assert.equal(venta.getCell(26, 13).value, 2.5);
  assert.equal(venta.getCell(27, 2).value, 3);
  assert.equal(venta.getCell(27, 10).value, 1);
  assert.equal(venta.getCell(27, 11).value, 2);
  assert.equal(venta.getCell(28, 3).value, 8);
  assert.equal(venta.getCell(28, 12).value, 5);
  assert.equal(venta.getCell(28, 13).value, 6);

  assert.match(String(aca.getCell(36, 2).value.formula), /J26/);
  assert.match(String(aca.getCell(36, 2).value.formula), /K26/);
  assert.match(String(aca.getCell(37, 2).value.formula), /J27/);
  assert.match(String(aca.getCell(38, 2).value.formula), /J28/);
  assert.match(String(teh.getCell(36, 2).value.formula), /L26/);
  assert.match(String(teh.getCell(36, 2).value.formula), /M26/);
  assert.match(String(teh.getCell(37, 2).value.formula), /L27/);
  assert.match(String(teh.getCell(38, 2).value.formula), /L28/);
  assert.match(String(aca.getCell(39, 2).value.formula), /B32:B38/);
  assertFutureBlank(aca, 41);
  assertFutureBlank(aca, 42);
  assertFutureBlank(aca, 43);
  assertFutureBlank(teh, 41);
  assertFutureBlank(teh, 43);
  assert.equal(aca.getCell(2, 1).value, "PLANTA ACAPULCO");
  assert.equal(teh.getCell(2, 1).value, "PLANTA TEHUACÁN");

  const file = path.join(os.tmpdir(), "igf-049-corte-27.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const ventaAgain = again.getWorksheet("Provincia Venta Diaria");
  const acaAgain = again.getWorksheet("IGF Diario Acapulco");
  const tehAgain = again.getWorksheet("IGF Diario Tehuacán");
  assert.equal(ventaAgain.getCell(26, 11).value, 0);
  assert.equal(ventaAgain.getCell(27, 10).value, 1);
  assert.equal(ventaAgain.getCell(28, 13).value, 6);
  assert.match(String(acaAgain.getCell(38, 2).value.formula), /J28/);
  assert.match(String(tehAgain.getCell(37, 2).value.formula), /L27/);
  assertFutureBlank(acaAgain, 41);
  assertFutureBlank(tehAgain, 42);
});

test("corte 25: del 26 al 30, B:AF vacías", () => {
  const { aca, teh } = book("2026-09-25");
  assert.equal(typeof aca.getCell(36, 2).value, "object");
  assert.equal(typeof teh.getCell(36, 2).value, "object");
  assertFutureBlank(aca, 37);
  assertFutureBlank(aca, 38);
  assertFutureBlank(aca, 41);
  assertFutureBlank(aca, 42);
  assertFutureBlank(aca, 43);
  assertFutureBlank(teh, 37);
  assertFutureBlank(teh, 43);
  assert.match(String(aca.getCell(39, 2).value.formula), /B32:B36/);
  assert.doesNotMatch(String(aca.getCell(39, 2).value.formula), /B37/);
});

function purchase(kg, importe) {
  return { kg, importe, costo_kg: kg > 0 && importe > 0 ? importe / kg : null };
}

function compraDay(ymd, cells) {
  return {
    ymd,
    cells: { 1: purchase(0, 0), 2: purchase(0, 0), 3: purchase(0, 0), ...cells },
    consolidado: { kg: 0, importe: 0, costo_kg: null },
    flete: { providers: {}, consolidado: { kg: 0, tarifa: null, importe: null } },
    hg_kilos: null,
  };
}

test("el importe proyectado de cada proveedor es sus kilos por su costo", async () => {
  const providers = [
    { id: 1, nombre: "PEMEX TUXPAN" },
    { id: 2, nombre: "TOMZA TUXPAN" },
    { id: 3, nombre: "TOMZA TEPEJI" },
  ];
  const days = [
    compraDay("2026-09-01", { 1: purchase(100, 1000), 2: purchase(40, 200), 3: purchase(20, 0) }),
    compraDay("2026-09-20", { 1: purchase(19370, 236938.17) }),
    compraDay("2026-09-25"),
    compraDay("2026-09-26"),
    compraDay("2026-09-27", { 1: purchase(50, 250) }),
  ];
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, {
    year: 2026,
    month: 9,
    providers,
    grid: { days, rows: days.map((d) => ({ type: "day", ymd: d.ymd })) },
  }, { plantName: "Acapulco", corteYmd: "2026-09-25" });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(ws.getCell(7, 2).value, 19370);
  assert.equal(ws.getCell(7, 4).value, 236938.17);
  assert.equal(ws.getCell(7, 4).value.formula, undefined);
  const row = 8;
  assert.equal(ws.getCell(row, 4).value.formula, `IF(AND(ISNUMBER(B${row}),ISNUMBER(C${row})),B${row}*C${row},"")`);
  assert.equal(ws.getCell(row, 8).value.formula, `IF(AND(ISNUMBER(F${row}),ISNUMBER(G${row})),F${row}*G${row},"")`);
  assert.equal(ws.getCell(row, 12).value, null);
  assert.notEqual(typeof ws.getCell(row, 11).value, "number");
  assert.equal(ws.getCell(row, 4).fill.fgColor.argb, ESTIMATED_BLUE);
  assert.match(String(ws.getCell(row, 14).value.formula), /SUM\(B8,F8,J8\)/);
  assert.match(String(ws.getCell(row, 16).value.formula), /SUM\(D8,H8,L8\)/);
  assert.equal(ws.getCell(9, 4).value.formula, 'IF(AND(ISNUMBER(B9),ISNUMBER(C9)),B9*C9,"")');
  assert.equal(ws.getCell(10, 4).value, 250);
  assert.equal(ws.getCell(10, 4).value.formula, undefined);

  const file = path.join(os.tmpdir(), "compras-049-importe.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(re.getCell(7, 4).value, 236938.17);
  assert.equal(re.getCell(8, 4).value.formula, 'IF(AND(ISNUMBER(B8),ISNUMBER(C8)),B8*C8,"")');
  assert.equal(re.getCell(8, 8).value.formula, 'IF(AND(ISNUMBER(F8),ISNUMBER(G8)),F8*G8,"")');
  assert.equal(re.getCell(8, 12).value, null);
  assert.match(String(re.getCell(8, 16).value.formula), /SUM\(D8,H8,L8\)/);
  assert.equal(re.getCell(10, 4).value, 250);
});
