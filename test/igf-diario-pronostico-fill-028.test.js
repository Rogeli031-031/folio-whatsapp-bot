"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const forecast = require("../lib/dashboard-arr-forecast");

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function pueblaCtx() {
  const venta = new Map([
    ["2026-09-01", 61.5],
    ["2026-09-08", 61.5],
    ["2026-09-15", 61.5],
    ["2026-09-22", 61.5],
    ["2026-09-09", 37.5],
    ["2026-09-04", 1054],
  ]);
  const desc = new Map([["2026-09-16", -4.72]]);
  return {
    plants: ["Puebla"],
    ventaMapByPlant: new Map([["Puebla", venta]]),
    descMapByPlant: new Map([["Puebla", desc]]),
    lastDay: 30,
    corteDt: new Date(2026, 8, 23),
    isCorteEnMes: true,
    enableLookback: true,
    lookbackStartYmd: "2026-08-27",
    lookbackEndYmd: "2026-09-23",
    lookbackVisualStartYmd: "2026-08-24",
    lookbackQueryFromYmd: "2026-08-24",
    corteYmdStr: "2026-09-23",
    fmtYmd: ymd,
    isoDow: (d) => (d.getDay() === 0 ? 7 : d.getDay()),
    sum: (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0),
  };
}

function selection() {
  const sel = new Map([
    ["2026-09-01", true],
    ["2026-09-08", true],
    ["2026-09-15", true],
    ["2026-09-22", true],
    ["2026-09-09", true],
    ["2026-09-16", true],
    ["2026-09-04", false],
    ["2026-09-07", true],
  ]);
  return new Map([["Puebla", sel]]);
}

function canal() {
  const ventaByFecha = new Map([
    ["2026-09-07", { Puebla: { CASA: 10000, COMISIONISTA: 5000 } }],
  ]);
  const descByFecha = new Map([
    ["2026-09-07", {
      Puebla: {
        CASA: { kg: 1000, monto: -4720 },
        COMISIONISTA: { kg: 500, monto: -1000 },
      },
    }],
  ]);
  return { ventaByFecha, descByFecha };
}

function monthGrid() {
  const byDate = [];
  for (let day = 1; day <= 30; day += 1) {
    const fecha = `2026-09-${String(day).padStart(2, "0")}`;
    const venta = day >= 23 ? 0 : (day === 3 ? 0 : day === 22 ? 61.5 : day === 4 ? 1054 : day === 9 ? 37.5 : day === 1 || day === 8 || day === 15 ? 61.5 : "");
    const desc = day >= 23 ? 0 : (day === 16 ? -4.72 : day === 2 ? -1 : "");
    byDate.push({
      day,
      fecha,
      byPlant: { Puebla: venta },
      tot: typeof venta === "number" ? venta : 0,
    });
  }
  const descByDate = byDate.map((d) => ({
    day: d.day,
    fecha: d.fecha,
    byPlant: { Puebla: d.day >= 23 ? 0 : d.day === 16 ? -4.72 : d.day === 2 ? -1 : null },
  }));
  const canalByDate = byDate.map((d) => ({
    day: d.day,
    fecha: d.fecha,
    byPlant: {
      Puebla: d.day === 7
        ? { CASA: 10, COMISIONISTA: 5, }
        : { CASA: 0, COMISIONISTA: 0 },
    },
  }));
  const descCanalByDate = byDate.map((d) => ({
    day: d.day,
    fecha: d.fecha,
    byPlant: {
      Puebla: d.day === 7
        ? { CASA: { kg: 1000, monto: -4720 }, COMISIONISTA: { kg: 500, monto: -1000 } }
        : { CASA: { kg: 0, monto: 0 }, COMISIONISTA: { kg: 0, monto: 0 } },
    },
  }));
  return {
    year: 2026,
    month: 9,
    ventaTonGrid: {
      plants: ["Puebla"],
      cutoffDay: 24,
      forecastByPlant: new Map([["Puebla", 999]]),
      byDate,
    },
    descuentoGrid: { plants: ["Puebla"], cutoffDay: 24, byDate: descByDate },
    ventaCanal: { byDate: canalByDate },
    descuentoCanal: { byDate: descCanalByDate },
    omitTotProvincia: true,
    precioDiario: [],
    comprasPayload: { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
    comprasPlantName: "Puebla",
  };
}

function rowOf(day) {
  return day + 1;
}

test("A–E) el setup es el del corte y el default del modal", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes("pronostico_dias_seleccion") && params[2] === "2026-09-23") {
        return { rows: [{ plant_code: "Puebla", fecha: "2026-09-04", selected: false }] };
      }
      if (String(sql).includes("pronostico_dias_seleccion")) {
        return { rows: [{ plant_code: "Puebla", fecha: "2026-09-04", selected: true }] };
      }
      return { rows: [] };
    },
  };
  const loaded = await forecast.loadPronosticoDiasSeleccionMap(client, 2026, 9, "2026-09-23");
  assert.equal(calls[0].params[2], "2026-09-23");
  assert.match(calls[0].sql, /corte_day = \$3::date/);
  assert.equal(loaded.get("Puebla").get("2026-09-04"), false);
  const other = await forecast.loadPronosticoDiasSeleccionMap(client, 2026, 9, "2026-09-22");
  assert.equal(other.get("Puebla").get("2026-09-04"), true);
  assert.notEqual(loaded.get("Puebla").get("2026-09-04"), other.get("Puebla").get("2026-09-04"));

  const ctx = pueblaCtx();
  const withSkip = forecast.assemblePronosticoProjection(ctx, selection(), canal());
  const without = forecast.assemblePronosticoProjection(ctx, new Map(), { ventaByFecha: new Map(), descByFecha: new Map() });
  assert.equal(withSkip.byPlant.get("Puebla").promVentaTotal[1], 61.5);
  assert.notEqual(without.byPlant.get("Puebla").promVentaTotal[4], withSkip.byPlant.get("Puebla").promVentaTotal[4]);
  assert.equal(withSkip.byPlant.get("Puebla").promVentaTotal[4], "");
});

test("modal y hoja Pronostico comparten PROM y PROY", async () => {
  const projection = forecast.assemblePronosticoProjection(pueblaCtx(), selection(), canal());
  const pack = projection.byPlant.get("Puebla");
  assert.equal(pack.promVentaTotal[1], 61.5);
  assert.equal(pack.proyVentaTotal, 1474);
  const wb = new ExcelJS.Workbook();
  await forecast.appendHojaAcapulcoSemanaDow({ async query() { throw new Error("no debe consultar"); } }, wb, 2026, 9, {
    plantCode: "Puebla",
    fechaCorte: "2026-09-23",
    projection,
  });
  const ws = wb.getWorksheet("Pronostico");
  let promRow = 0;
  let proyRow = 0;
  ws.eachRow((row, n) => {
    if (row.getCell(1).value === "PROM mes (por día de semana)") promRow = n;
    if (row.getCell(1).value === "PROY") proyRow = n;
  });
  assert.equal(ws.getCell(promRow, 3).value, 61.5);
  assert.equal(ws.getCell(proyRow, 9).value, 1474);
  assert.equal(pack.ventaSheet.prom_mes_dow[1], ws.getCell(promRow, 3).value);
  assert.equal(pack.ventaSheet.proy_total_ton, ws.getCell(proyRow, 9).value);
});

test("F–L) venta futura usa el weekday y PROY reconcilia", () => {
  const projection = forecast.assemblePronosticoProjection(pueblaCtx(), selection(), canal());
  const partial = monthGrid();
  partial.pronosticoProjection = projection;
  const wb = forecast.renderProvinciaDiariaSheets(partial);
  const ws = wb.getWorksheet("Provincia Venta Diaria");
  assert.equal(ws.getCell(rowOf(22), 2).value, 61.5);
  assert.equal(ws.getCell(rowOf(3), 2).value, 0);
  assert.equal(ws.getCell(rowOf(23), 2).value, 37.5);
  assert.equal(ws.getCell(rowOf(29), 2).value, 61.5);
  assert.equal(ws.getCell(rowOf(24), 2).value, null);
  let proy = null;
  ws.eachRow((row) => {
    if (row.getCell(1).value === "PROY") proy = row.getCell(2).value;
  });
  assert.equal(proy, 1474);
  assert.equal(proy, projection.byPlant.get("Puebla").proyVentaTotal);
});

test("M–P) CASA y COMISIONISTA futuros y canal desconocido", () => {
  const unknown = forecast.aggregateVentaDiariaPorCanal(
    [{ fecha: "2026-09-07", plant_code: "Puebla", canal: "OTRO", kg: 9000 }],
    ["Puebla"]
  );
  assert.equal(unknown.unclassifiedKg, 9000);
  assert.equal(unknown.byFecha.size, 0);
  const projection = forecast.assemblePronosticoProjection(pueblaCtx(), selection(), canal());
  const partial = monthGrid();
  partial.pronosticoProjection = projection;
  const wb = forecast.renderProvinciaDiariaSheets(partial);
  const ws = wb.getWorksheet("Provincia Venta Diaria");
  assert.equal(ws.getCell(rowOf(28), 10).value, 10);
  assert.equal(ws.getCell(rowOf(28), 11).value, 5);
  assert.equal(ws.getCell(rowOf(23), 10).value, null);
});

test("Q–Y) descuento futuro, ratio de categoría y selección", () => {
  assert.equal(forecast.descuentoCategoriaRate(0, 10), null);
  assert.equal(forecast.descuentoCategoriaRate(1000, -4720), 4.72);
  const projection = forecast.assemblePronosticoProjection(pueblaCtx(), selection(), canal());
  const pack = projection.byPlant.get("Puebla");
  assert.equal(pack.promDescTotal[2], -4.72);
  assert.equal(pack.promDescCasa[0], 4.72);
  assert.equal(pack.promDescComisionista[0], 2);
  const partial = monthGrid();
  partial.pronosticoProjection = projection;
  const wb = forecast.renderProvinciaDiariaSheets(partial);
  const ws = wb.getWorksheet("Provincia Comisiones");
  assert.equal(ws.getCell(rowOf(2), 2).value, -1);
  assert.equal(ws.getCell(rowOf(23), 2).value, -4.72);
  assert.equal(ws.getCell(rowOf(28), 10).value, 4.72);
  assert.equal(ws.getCell(rowOf(28), 11).value, 2);
  const skipped = forecast.assemblePronosticoProjection(pueblaCtx(), new Map([["Puebla", new Map([["2026-09-16", false]])]]), canal());
  assert.equal(skipped.byPlant.get("Puebla").promDescTotal[2], "");
});

test("Z–AB) el orden de hojas no cambia", () => {
  const projection = forecast.assemblePronosticoProjection(pueblaCtx(), selection(), canal());
  const partial = monthGrid();
  partial.pronosticoProjection = projection;
  const wb = forecast.renderProvinciaDiariaSheets(partial);
  assert.equal(wb.worksheets[0].name, "Provincia Venta Diaria");
  assert.equal(wb.worksheets[1].name, "Provincia Comisiones");
  assert.equal(wb.worksheets[2].name, "PRECIO");
  assert.equal(wb.worksheets[3].name, "CONTROL DE COMPRAS");
  assert.equal(wb.getWorksheet("PRECIO").getCell(1, 1).value, "Fecha");
  assert.equal(wb.getWorksheet("PRECIO").getCell(1, 2).value, "PRECIO");
  assert.equal(wb.getWorksheet("CONTROL DE COMPRAS").getCell(1, 1).value, "CONTROL DE COMPRAS");
});
