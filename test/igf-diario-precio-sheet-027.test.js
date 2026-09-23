"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const forecast = require("../lib/dashboard-arr-forecast");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

function grid(plant) {
  return {
    year: 2026,
    month: 9,
    ventaTonGrid: {
      plants: [plant],
      cutoffDay: 99,
      forecastByPlant: new Map([[plant, 1]]),
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { [plant]: 1 }, tot: 1 }],
    },
    descuentoGrid: {
      plants: [plant],
      cutoffDay: 99,
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { [plant]: 0 } }],
    },
    comprasPayload: { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
    comprasPlantName: plant,
  };
}

function precioClient() {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      const plant = params[0];
      if (plant === "Acapulco") {
        return { rows: [{ fecha: "2026-09-01", precio: "99.12345678" }] };
      }
      return {
        rows: [
          { fecha: "2026-09-22", precio: "19.7690271" },
          { fecha: "2026-09-01", precio: "18.8657443" },
          { fecha: "2026-09-05", precio: null },
          { fecha: "2026-09-21", precio: "19.7724741" },
        ],
      };
    },
  };
  return { client, calls };
}

test("A–D) PRECIO queda tercera y CONTROL DE COMPRAS cuarta", async () => {
  const { client } = precioClient();
  const rows = await forecast.loadPrecioDiario(client, "Puebla", 2026, 9);
  const wb = forecast.renderProvinciaDiariaSheets({ ...grid("Puebla"), precioDiario: rows });
  assert.equal(wb.worksheets[0].name, "Provincia Venta Diaria");
  assert.equal(wb.worksheets[1].name, "Provincia Comisiones");
  assert.equal(wb.worksheets[2].name, "PRECIO");
  assert.equal(wb.worksheets[3].name, "CONTROL DE COMPRAS");
});

test("E–L) fechas del mes, valores de la base y vacíos", async () => {
  const { client, calls } = precioClient();
  const rows = await forecast.loadPrecioDiario(client, "Puebla", 2026, 9);
  const wb = forecast.appendPrecioWorksheet(new (require("exceljs").Workbook)(), 2026, 9, rows);
  assert.equal(wb.getCell(1, 1).value, "Fecha");
  assert.equal(wb.getCell(1, 2).value, "PRECIO");
  assert.equal(wb.rowCount, 31);
  const day1 = wb.getCell(2, 1).value;
  const day22 = wb.getCell(23, 1).value;
  const day30 = wb.getCell(31, 1).value;
  assert.equal(day1.getUTCFullYear(), 2026);
  assert.equal(day1.getUTCMonth(), 8);
  assert.equal(day1.getUTCDate(), 1);
  assert.equal(day22.getUTCDate(), 22);
  assert.equal(day30.getUTCDate(), 30);
  assert.equal(wb.getCell(2, 1).numFmt, "dd-mmm");
  assert.equal(wb.getCell(2, 2).value, 18.8657443);
  assert.equal(wb.getCell(22, 2).value, 19.7724741);
  assert.equal(wb.getCell(23, 2).value, 19.7690271);
  assert.equal(wb.getCell(6, 2).value, null);
  assert.equal(wb.getCell(24, 2).value, null);
  assert.equal(wb.getCell(31, 2).value, null);
  assert.equal(calls[0].params[0], "Puebla");
  assert.match(calls[0].sql, /FROM arr\.precio_diario/);
  assert.match(calls[0].sql, /plant_code = \$1/);
  assert.match(calls[0].sql, /fecha >= \$2::date/);
  assert.match(calls[0].sql, /fecha < \$3::date/);
  assert.match(calls[0].sql, /ORDER BY fecha ASC/);
  assert.deepEqual(calls[0].params.slice(1), ["2026-09-01", "2026-10-01"]);
});

test("M–O) el precio conserva el número y se muestra a 8 decimales", async () => {
  const { client } = precioClient();
  const rows = await forecast.loadPrecioDiario(client, "Puebla", 2026, 9);
  const wb = forecast.appendPrecioWorksheet(new (require("exceljs").Workbook)(), 2026, 9, rows);
  const cell = wb.getCell(23, 2);
  assert.equal(cell.value, 19.7690271);
  assert.notEqual(cell.value, 19.77);
  assert.equal(typeof cell.value, "number");
  assert.equal(cell.numFmt, "0.00000000");
  assert.equal(wb.getColumn(1).width, 15);
  assert.equal(wb.getColumn(2).width, 17);
});

test("P–S) la planta es exacta y el libro global no agrega PRECIO", async () => {
  const { client, calls } = precioClient();
  const puebla = await forecast.loadPrecioDiario(client, "Puebla", 2026, 9);
  const acapulco = await forecast.loadPrecioDiario(client, "Acapulco", 2026, 9);
  const wb = forecast.renderProvinciaDiariaSheets({ ...grid("Puebla"), precioDiario: puebla });
  const sheet = wb.getWorksheet("PRECIO");
  let sawAcapulco = false;
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value === 99.12345678) sawAcapulco = true;
    });
  });
  assert.equal(sawAcapulco, false);
  assert.equal(acapulco[0].precio, 99.12345678);
  assert.equal(calls[0].params[0], "Puebla");
  assert.equal(calls[1].params[0], "Acapulco");
  assert.equal(calls[0].sql.includes("LIKE"), false);

  const comprasOnly = forecast.renderProvinciaDiariaSheets(grid("Puebla"));
  assert.equal(comprasOnly.getWorksheet("PRECIO"), undefined);
  assert.equal(comprasOnly.worksheets[2].name, "CONTROL DE COMPRAS");
  const plain = forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    ventaTonGrid: grid("Puebla").ventaTonGrid,
    descuentoGrid: grid("Puebla").descuentoGrid,
  });
  assert.equal(plain.getWorksheet("PRECIO"), undefined);
  assert.equal(plain.getWorksheet("CONTROL DE COMPRAS"), undefined);

  const start = SERVER.indexOf('app.get("/api/arr/dashboard-excel"');
  const slice = SERVER.slice(start, start + 12000);
  const gated = slice.slice(slice.indexOf("if (requirePlant)"), slice.indexOf("const excelIgfOpts"));
  assert.match(gated, /loadPrecioDiario\(client, plantCode, year, month\)/);
  assert.doesNotMatch(slice.slice(0, slice.indexOf("if (requirePlant)")), /loadPrecioDiario/);
  assert.match(slice, /Selecciona una planta para descargar el Excel Forecast/);
  assert.match(slice, /assertPlantaPermitidaDashboard\(req, resolvedPlant\.plantaId\)/);
  assert.match(slice, /status\(403\)/);
  assert.match(slice, /Planta no reconocida para exportar el Excel Forecast/);
  assert.match(slice, /if \(Array\.isArray\(precioDiario\)\)/);

  const loader = LIB.slice(LIB.indexOf("async function loadPrecioDiario"), LIB.indexOf("function appendPrecioWorksheet"));
  assert.match(loader, /FROM arr\.precio_diario/);
  assert.doesNotMatch(loader, /precio_detalle|precio_lleno|subsidio|total_kilos/);
  const painter = LIB.slice(LIB.indexOf("function appendPrecioWorksheet"), LIB.indexOf("function renderProvinciaDiariaSheets"));
  assert.doesNotMatch(painter, /formula/);
});
