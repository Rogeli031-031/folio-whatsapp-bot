"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const datos = require("../lib/igf-diario-datos-planta");
const forecast = require("../lib/dashboard-arr-forecast");
const weekly = require("../lib/igf-diario-weekly-plant");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const EVIDENCE = path.join(ROOT, "docs", "dev-loop", "reports", "evidence-082");

function ymd(day, month = 10) {
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function payload(providers, tarifas, marks) {
  const days = [];
  for (let day = 1; day <= 31; day += 1) {
    const fecha = ymd(day);
    const mark = marks[fecha] || {};
    const cells = {};
    const fleteProviders = {};
    for (const provider of providers) {
      const cell = (mark.cells && mark.cells[provider.id]) || { kg: 0, importe: 0 };
      cells[provider.id] = cell;
      const tarifa = tarifas.find((row) => row.proveedor_id === provider.id);
      fleteProviders[provider.id] = {
        kg: cell.kg,
        tarifa: tarifa ? tarifa.tarifa : null,
        importe: null,
      };
    }
    const row = { ymd: fecha, cells, flete: { providers: fleteProviders } };
    if (mark.hg !== undefined) row.hg_kilos = mark.hg;
    days.push(row);
  }
  return { year: 2026, month: 10, providers, tarifas_flete: tarifas, grid: { days } };
}

function sanLuisSpec() {
  const providers = [
    { id: 1, orden: 1, nombre: "PEMEX TUXPAN" },
    { id: 2, orden: 2, nombre: "TOMZA TUXPAN" },
    { id: 3, orden: 3, nombre: "TOMZA TEPEJI" },
  ];
  const tarifas = [
    { proveedor_id: 1, tarifa: 1.23 },
    { proveedor_id: 2, tarifa: 1.25 },
    { proveedor_id: 3, tarifa: 0 },
  ];
  return {
    year: 2026,
    month: 10,
    corteYmd: "2026-10-11",
    salesRows: [
      { fecha: ymd(4), canal: "Casa", subcanal: "Portátil", kg: 1000 },
      { fecha: ymd(4), canal: "Casa", subcanal: "Autotanque", kg: 200 },
      { fecha: ymd(4), canal: "Casa", subcanal: "Predios", kg: 50 },
      { fecha: ymd(4), canal: "Comisionista", subcanal: "Carburación", kg: 300 },
      { fecha: ymd(4), canal: "Comisionista", subcanal: "Portátil", kg: 100 },
      { fecha: ymd(4), canal: "Predio", subcanal: "Portátil", kg: 999 },
      { fecha: ymd(6), canal: "Casa", subcanal: "Portátil", kg: 10 },
      { fecha: ymd(7), canal: "Casa", subcanal: "Portátil", kg: 0 },
      { fecha: ymd(7), canal: "Comisionista", subcanal: "Autotanque", kg: 0 },
      { fecha: ymd(8), canal: "Casa", subcanal: "Portátil", kg: 100 },
      { fecha: ymd(8), canal: "Casa", subcanal: "Portatil", kg: 25 },
    ],
    comprasPayload: payload(providers, tarifas, {
      [ymd(4)]: {
        hg: -787,
        cells: {
          1: { kg: 1000, importe: 12000 },
          2: { kg: 500, importe: 0 },
        },
      },
      [ymd(5)]: { hg: 0 },
      [ymd(1)]: { cells: { 1: { kg: 400, importe: 4800 } } },
    }),
  };
}

function morelosSpec() {
  const providers = [
    { id: 9, orden: 3, nombre: "TOMZA TEPEJI" },
    { id: 8, orden: 1, nombre: "PEMEX TUXPAN" },
  ];
  const tarifas = [
    { proveedor_id: 9, tarifa: 1.33 },
    { proveedor_id: 8, tarifa: 1.23 },
  ];
  return {
    year: 2026,
    month: 10,
    corteYmd: "2026-10-06",
    salesRows: [
      { fecha: ymd(2), canal: "Comisionista", subcanal: "Autotanque", kg: 80 },
      { fecha: ymd(2), canal: "Casa", subcanal: "Carburación", kg: 20 },
    ],
    comprasPayload: payload(providers, tarifas, {
      [ymd(2)]: {
        hg: 4012,
        cells: {
          8: { kg: 10, importe: 50 },
          9: { kg: 200, importe: 300 },
        },
      },
    }),
  };
}

function buildBook(spec, plant) {
  const wb = new ExcelJS.Workbook();
  const resumen = wb.addWorksheet("RESUMEN");
  resumen.getCell("A1").value = `IGF DIARIO SEMANAL · ${plant}`;
  resumen.getCell("B2").value = { formula: "1+1", result: 2 };
  const sheet = datos.ensureSheet(wb);
  const igf = wb.addWorksheet(`IGF Diario ${plant}`);
  igf.getCell("C4").value = 42;
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell("A2").value = 3.5;
  datos.fillDatosPlanta(sheet, spec);
  return wb;
}

function cell(ws, row, col) {
  return ws.getCell(row, col);
}

function assertEmpty(ws, row, col) {
  const value = cell(ws, row, col).value;
  assert.equal(value, null);
  assert.notEqual(value, 0);
  assert.notEqual(value, "");
}

test("DatosPlanta queda entre RESUMEN y la hoja de la planta", () => {
  const wb = buildBook(sanLuisSpec(), "San Luis");
  assert.deepEqual(wb.worksheets.map((sheet) => sheet.name), [
    "RESUMEN",
    "DatosPlanta",
    "IGF Diario San Luis",
    "Provincia Venta Diaria",
  ]);
  assert.equal(wb.worksheets.filter((sheet) => sheet.name === "DatosPlanta").length, 1);
  assert.equal(wb.getWorksheet("RESUMEN").getCell("A1").value, "IGF DIARIO SEMANAL · San Luis");
  assert.equal(wb.getWorksheet("RESUMEN").getCell("B2").value.formula, "1+1");
  assert.equal(wb.getWorksheet("IGF Diario San Luis").getCell("C4").value, 42);
  assert.equal(wb.getWorksheet("Provincia Venta Diaria").getCell("A2").value, 3.5);
});

test("encabezados A–AG, separadores y columnas vacías autorizadas", () => {
  const ws = buildBook(sanLuisSpec(), "San Luis").getWorksheet("DatosPlanta");
  assert.equal(cell(ws, 2, 1).value, "Semana");
  assert.equal(cell(ws, 2, 2).value, "Fecha");
  assert.equal(cell(ws, 2, 3).value, "Venta Total (kg)");
  assert.equal(cell(ws, 1, 4).value, "CASA");
  assert.equal(cell(ws, 2, 7).value, "Total CASA (kg)");
  assert.equal(cell(ws, 1, 8).value, "COMISIONISTA");
  assert.equal(cell(ws, 2, 11).value, "Total COMISIONISTA (kg)");
  assert.equal(cell(ws, 1, 32).value, "DESCUENTOS");
  assert.equal(cell(ws, 2, 13).value, "PRECIO ($/kg)");
  assert.equal(cell(ws, 2, 14).value, "Subsidio ($)");
  assert.equal(cell(ws, 1, 16).value, "PEMEX TUXPAN");
  assert.equal(cell(ws, 2, 18).value, "CIRCULAR");
  assert.equal(cell(ws, 1, 20).value, "TOMZA TUXPAN");
  assert.equal(cell(ws, 1, 23).value, "TOMZA TEPEJI");
  assert.equal(cell(ws, 1, 26).value, "FLETE (TARIFA)");
  assert.equal(cell(ws, 2, 26).value, "PEMEX TUXPAN");
  assert.equal(cell(ws, 2, 27).value, "TOMZA TUXPAN");
  assert.equal(cell(ws, 2, 28).value, "TOMZA TEPEJI");
  assert.equal(cell(ws, 2, 30).value, "HG Kilos");
  assert.equal(cell(ws, 2, 32).value, "Descuento CASA ($)");
  assert.equal(cell(ws, 2, 33).value, "Descuento COMISIONISTA ($)");
  assert.equal(cell(ws, 1, 1).font.bold, true);
  assert.equal(cell(ws, 1, 4).fill.fgColor.argb, "FFFFFFFF");
  assert.equal(ws.getRow(1).height, 22);
  assert.equal(ws.getRow(2).height, 32);
  assert.equal(ws.getColumn(1).width, 16);
  assert.equal(ws.getColumn(12).width, 2.5);
  assert.equal(ws.getCell("G1").master.address, "D1");
  assert.equal(ws.getCell("K1").master.address, "H1");
  assert.equal(ws.getCell("R1").master.address, "P1");
  assert.equal(ws.getCell("AB1").master.address, "Z1");
  for (let row = 3; row <= 33; row += 1) {
    for (const col of datos.SEPARATORS) assertEmpty(ws, row, col);
    for (const col of datos.EMPTY_DATA) assertEmpty(ws, row, col);
    for (let col = 1; col <= datos.LAST_COL; col += 1) {
      const value = cell(ws, row, col).value;
      assert.ok(value == null || typeof value !== "object");
    }
  }
});

test("octubre 2026 conserva domingo–sábado y las fechas del mes", () => {
  const ws = buildBook(sanLuisSpec(), "San Luis").getWorksheet("DatosPlanta");
  const seen = new Set();
  const expected = { 1: 40, 3: 40, 4: 41, 10: 41, 11: 42, 17: 42, 18: 43, 24: 43, 25: 44, 31: 44 };
  for (let day = 1; day <= 31; day += 1) {
    const row = day + 2;
    const fecha = ymd(day);
    assert.equal(cell(ws, row, 2).value, datos.excelSerial(2026, 10, day));
    assert.equal(typeof cell(ws, row, 2).value, "number");
    assert.equal(cell(ws, row, 2).numFmt, "dd/mm/yyyy");
    assert.equal(cell(ws, row, 1).value, weekly.weekNumber(fecha));
    assert.equal(cell(ws, row, 1).numFmt, '"Semana "0');
    assert.equal(seen.has(fecha), false);
    seen.add(fecha);
  }
  assert.equal(seen.size, 31);
  assert.equal(cell(ws, 3, 1).value, expected[1]);
  assert.equal(cell(ws, 5, 1).value, expected[3]);
  assert.equal(cell(ws, 6, 1).value, expected[4]);
  assert.equal(cell(ws, 12, 1).value, expected[10]);
  assert.equal(cell(ws, 13, 1).value, expected[11]);
  assert.equal(cell(ws, 19, 1).value, expected[17]);
  assert.equal(cell(ws, 20, 1).value, expected[18]);
  assert.equal(cell(ws, 26, 1).value, expected[24]);
  assert.equal(cell(ws, 27, 1).value, expected[25]);
  assert.equal(cell(ws, 33, 1).value, expected[31]);
  assert.equal(ws.getRow(34).hasValues, false);
});

test("San Luis separa casa, comisionista y proveedores sin duplicar", () => {
  const ws = buildBook(sanLuisSpec(), "San Luis").getWorksheet("DatosPlanta");
  const row = 6;
  assert.equal(cell(ws, row, 4).value, 1000);
  assert.equal(cell(ws, row, 5).value, 200);
  assert.equal(cell(ws, row, 6).value, null);
  assert.equal(cell(ws, row, 7).value, 1250);
  assert.equal(cell(ws, row, 8).value, 100);
  assert.equal(cell(ws, row, 10).value, 300);
  assert.equal(cell(ws, row, 11).value, 400);
  assert.equal(cell(ws, row, 3).value, 1650);
  assert.notEqual(cell(ws, row, 3).value, 1650 + 999);
  assert.notEqual(cell(ws, row, 7).value, 1000 + 200);
  const onlyCasa = 8;
  assert.equal(cell(ws, onlyCasa, 3).value, 10);
  assert.equal(cell(ws, onlyCasa, 7).value, 10);
  assert.equal(cell(ws, onlyCasa, 11).value, null);
  const zeros = 9;
  assert.equal(cell(ws, zeros, 4).value, 0);
  assert.equal(cell(ws, zeros, 7).value, 0);
  assert.equal(cell(ws, zeros, 9).value, 0);
  assert.equal(cell(ws, zeros, 11).value, 0);
  assert.equal(cell(ws, zeros, 3).value, 0);
  assert.equal(cell(ws, 10, 4).value, 125);
  assert.equal(cell(ws, row, 16).value, 1000);
  assert.equal(cell(ws, row, 17).value, 12);
  assert.equal(cell(ws, row, 20).value, 500);
  assert.equal(cell(ws, row, 21).value, 0);
  assert.equal(cell(ws, row, 23).value, null);
  assert.equal(cell(ws, row, 24).value, null);
  assert.equal(cell(ws, row, 26).value, 1.23);
  assert.equal(cell(ws, row, 27).value, 1.25);
  assert.equal(cell(ws, row, 28).value, 0);
  assert.equal(cell(ws, row, 30).value, -787);
  assert.equal(cell(ws, 7, 30).value, 0);
  assert.equal(cell(ws, 8, 30).value, null);
  assert.equal(cell(ws, 8, 16).value, null);
  assert.equal(typeof cell(ws, row, 16).value, "number");
  assert.equal(typeof cell(ws, row, 17).value, "number");
});

test("Morelos no identifica proveedores por su posición", () => {
  const ws = buildBook(morelosSpec(), "Morelos").getWorksheet("DatosPlanta");
  const row = 4;
  assert.equal(cell(ws, row, 7).value, 20);
  assert.equal(cell(ws, row, 9).value, 80);
  assert.equal(cell(ws, row, 11).value, 80);
  assert.equal(cell(ws, row, 3).value, 100);
  assert.equal(cell(ws, row, 16).value, 10);
  assert.equal(cell(ws, row, 17).value, 5);
  assert.equal(cell(ws, row, 20).value, null);
  assert.equal(cell(ws, row, 23).value, 200);
  assert.equal(cell(ws, row, 24).value, 1.5);
  assert.equal(cell(ws, row, 26).value, 1.23);
  assert.equal(cell(ws, row, 27).value, null);
  assert.equal(cell(ws, row, 28).value, 1.33);
  assert.equal(cell(ws, row, 30).value, 4012);
});

test("desde el corte reutiliza la estimación de compras ya resuelta", () => {
  const ws = buildBook(sanLuisSpec(), "San Luis").getWorksheet("DatosPlanta");
  const projected = cell(ws, 13, 16).value;
  assert.equal(projected, 1400 / 10);
  assert.equal(typeof projected, "number");
  assert.notEqual(cell(ws, 5, 16).value, projected);
});

test("el libro de provincia y TODAS no ganan DatosPlanta", () => {
  const wb = forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 10,
    ventaTonGrid: { plants: ["San Luis"], cutoffDay: 99, byDate: [], forecastByPlant: new Map() },
    descuentoGrid: { plants: ["San Luis"], cutoffDay: 99, byDate: [] },
  });
  assert.equal(wb.getWorksheet("DatosPlanta"), undefined);
  assert.equal(wb.worksheets[0].name, "Provincia Venta Diaria");
  const plantFn = LIB.slice(LIB.indexOf("async function generarDashboardArrForecast"), LIB.indexOf("async function fetchForecastKgByPlantMap"));
  const resumenAt = plantFn.indexOf('wb.addWorksheet("RESUMEN")');
  const sheetAt = plantFn.indexOf("datosPlanta.ensureSheet");
  const reserveAt = plantFn.indexOf("reserveSheet");
  assert.ok(resumenAt >= 0 && sheetAt > resumenAt && reserveAt > sheetAt);
  const todas = LIB.slice(LIB.indexOf("async function appendIgfDiarioTodas"), LIB.indexOf("function normEmpresaKey"));
  assert.equal(todas.includes("DatosPlanta"), false);
  assert.equal(todas.includes("ensureSheet"), false);
});

test("la consulta clasificada no suma otra planta ni otra fuente", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      return {
        rows: [
          { plant_code: "San Luis", fecha: "2026-10-04", canal: "Casa", subcanal: "Portátil", kg: "1000" },
          { plant_code: "Morelos", fecha: "2026-10-04", canal: "Casa", subcanal: "Portátil", kg: "9" },
        ],
      };
    },
  };
  const rows = await forecast.getVentaDiariaClasificadaRows(client, 2026, 10, "San Luis");
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /arr\.ventas_diarias_cliente/);
  assert.doesNotMatch(calls[0].sql, /descuentos_diarios_cliente/);
  assert.deepEqual(rows, [{ fecha: "2026-10-04", canal: "Casa", subcanal: "Portátil", kg: 1000 }]);
});

test("el xlsx reabierto conserva estructura y valores de fixture", async () => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const books = [
    ["san-luis.xlsx", sanLuisSpec(), "San Luis"],
    ["morelos.xlsx", morelosSpec(), "Morelos"],
  ];
  for (const [name, spec, plant] of books) {
    const wb = buildBook(spec, plant);
    const target = path.join(EVIDENCE, name);
    await wb.xlsx.writeFile(target);
    const opened = new ExcelJS.Workbook();
    await opened.xlsx.readFile(target);
    assert.equal(opened.worksheets[0].name, "RESUMEN");
    assert.equal(opened.worksheets[1].name, "DatosPlanta");
    assert.equal(opened.worksheets[2].name, `IGF Diario ${plant}`);
    const ws = opened.getWorksheet("DatosPlanta");
    assert.equal(ws.getCell(2, 11).value, "Total COMISIONISTA (kg)");
    assert.equal(ws.getCell(6, 13).value, null);
    assert.equal(ws.getCell(6, 32).value, null);
    const fecha = ws.getCell(3, 2).value;
    assert.equal(fecha instanceof Date, true);
    assert.equal(fecha.toISOString().slice(0, 10), "2026-10-01");
  }
  const san = new ExcelJS.Workbook();
  await san.xlsx.readFile(path.join(EVIDENCE, "san-luis.xlsx"));
  assert.equal(san.getWorksheet("DatosPlanta").getCell(6, 30).value, -787);
  assert.equal(san.getWorksheet("RESUMEN").getCell("B2").value.formula, "1+1");
});
