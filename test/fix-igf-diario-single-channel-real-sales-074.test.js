"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const venta = require("../lib/igf-diario-venta-kg");
const grafica = require("../lib/igf-diario-grafica");
const forecast = require("../lib/dashboard-arr-forecast");
const weekly = require("../lib/igf-diario-weekly-plant");
const igf = require("../lib/igf-diario-puebla");

const PRECIO = 21.1269958848;
const CORTE = "2026-10-08";

function emptyPack() {
  return {
    promVentaCasa: [],
    promVentaComisionista: [],
    promDescTotal: [],
    promVentaTotal: [],
    proyVentaTotal: 0,
  };
}

function month(plant, year, monthNum, corte, casaTon, comTon, forecastPack, precioRows) {
  return grafica.materializePlantMonth({
    year,
    month: monthNum,
    plant,
    corteYmd: corte,
    project: true,
    projection: {
      corteYmdStr: corte,
      byPlant: new Map([[plant, forecastPack || emptyPack()]]),
    },
    casaTon,
    comTon,
    precioRows: precioRows || [],
    skipDay1Fallback: true,
  });
}

function ventaOf(series, fecha) {
  const day = series.resolved.find((row) => row.fecha === fecha);
  assert.ok(day, fecha);
  return day.ventaKg;
}

function rowByDate(ws, year, monthNum, day) {
  const want = Date.UTC(year, monthNum - 1, day);
  for (let r = 6; r <= ws.rowCount; r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.getTime() === want) return r;
  }
  return null;
}

function bookFor(year, monthNum) {
  const wb = new ExcelJS.Workbook();
  const ventaWs = wb.addWorksheet("Provincia Venta Diaria");
  ventaWs.getCell(1, 12).value = "Puebla\nCASA";
  ventaWs.getCell(1, 13).value = "Puebla\nCOMISIONISTA";
  const last = new Date(year, monthNum, 0).getDate();
  for (let day = 1; day <= last; day += 1) {
    ventaWs.getCell(day + 1, 1).value = day;
  }
  wb.addWorksheet("Provincia Comisiones");
  wb.addWorksheet("PRECIO");
  wb.addWorksheet("CONTROL DE COMPRAS");
  igf.fillIgfDiarioPuebla(wb, { year, month: monthNum, corteYmd: `${year}-${String(monthNum).padStart(2, "0")}-28` });
  return wb;
}

test("A. Casa 1.701 y Comisionista ausente producen 1,701 kg", () => {
  assert.equal(venta.ventaKgFromCanalTons(1.701, null), 1701);
  const series = month("San Luis", 2026, 10, CORTE, new Map([["2026-10-04", 1.701]]), new Map());
  assert.equal(forecast.resolveCanalTon(1.701, "2026-10-04", CORTE, 4, null, null), 1.701);
  assert.equal(forecast.resolveCanalTon(null, "2026-10-04", CORTE, 4, null, null), null);
  assert.equal(ventaOf(series, "2026-10-04"), 1701);
  assert.notEqual(ventaOf(series, "2026-10-04"), 2000);
  assert.notEqual(ventaOf(series, "2026-10-04"), 17251);
});

test("B. Casa ausente y Comisionista 0.900 producen 900 kg", () => {
  assert.equal(venta.ventaKgFromCanalTons(null, 0.9), 900);
  const series = month("San Luis", 2026, 10, CORTE, new Map(), new Map([["2026-10-06", 0.9]]));
  assert.equal(ventaOf(series, "2026-10-06"), 900);
});

test("C. los dos canales numéricos se suman", () => {
  assert.equal(venta.ventaKgFromCanalTons(1.2, 0.8), 2000);
});

test("D. ambos ausentes siguen en null", () => {
  assert.equal(venta.ventaKgFromCanalTons(null, null), null);
  assert.equal(venta.ventaKgFromCanalTons(undefined, undefined), null);
  assert.equal(venta.ventaKgFromCanalTons(Number.NaN, Number.NaN), null);
});

test("E. cero explícito más cinco conserva la suma", () => {
  assert.equal(venta.sumPresentChannels(0, 5), 5);
  assert.equal(venta.ventaKgFromCanalTons(0, 5), 5000);
});

test("F. cinco más cero explícito conserva la suma", () => {
  assert.equal(venta.sumPresentChannels(5, 0), 5);
  assert.equal(venta.ventaKgFromCanalTons(5, 0), 5000);
});

test("G. dos ceros explícitos producen 0 kg", () => {
  assert.equal(venta.sumPresentChannels(0, 0), 0);
  assert.equal(venta.ventaKgFromCanalTons(0, 0), 0);
});

test("H. antes del corte la captura real sigue ganando al forecast", () => {
  assert.equal(forecast.resolveCanalTon(4, "2026-10-03", CORTE, 3, null, 9), 4);
  assert.equal(forecast.resolveCanalTon(5, "2026-10-03", CORTE, 3, null, 8), 5);
  const series = month(
    "San Luis",
    2026,
    10,
    CORTE,
    new Map([["2026-10-03", 4]]),
    new Map([["2026-10-03", 5]]),
    {
      ...emptyPack(),
      promVentaCasa: [9, 9, 9, 9, 9, 9, 9],
      promVentaComisionista: [8, 8, 8, 8, 8, 8, 8],
    }
  );
  assert.equal(ventaOf(series, "2026-10-03"), 9000);
});

test("I. en la fecha de corte 072 sigue resolviendo cada canal", () => {
  const corte = "2026-10-04";
  assert.equal(forecast.resolveCanalTon(1.701, corte, corte, 4, null, 9), 1.701);
  assert.equal(forecast.resolveCanalTon(null, corte, corte, 4, null, 15.55), 15.55);
  const series = month(
    "San Luis",
    2026,
    10,
    corte,
    new Map([[corte, 1.701]]),
    new Map(),
    { ...emptyPack(), promVentaComisionista: ["", "", "", "", "", "", 15.55] }
  );
  assert.equal(ventaOf(series, corte), 17251);
});

test("J. después del corte el forecast sigue prevaleciendo", () => {
  assert.equal(forecast.resolveCanalTon(1.701, "2026-10-09", CORTE, 9, null, 2), 2);
  assert.equal(forecast.resolveCanalTon(0.9, "2026-10-09", CORTE, 9, null, 3), 3);
  assert.equal(forecast.resolveCanalTon(null, "2026-10-09", CORTE, 9, null, null), 0);
  const series = month(
    "San Luis",
    2026,
    10,
    CORTE,
    new Map([["2026-10-09", 1.701]]),
    new Map([["2026-10-09", 0.9]]),
    {
      ...emptyPack(),
      promVentaCasa: [2, 2, 2, 2, 2, 2, 2],
      promVentaComisionista: [3, 3, 3, 3, 3, 3, 3],
    }
  );
  assert.equal(ventaOf(series, "2026-10-09"), 5000);
});

test("K. el domingo con solo Casa es válido sin regla especial", () => {
  assert.equal(new Date(2026, 9, 4).getDay(), 0);
  const series = month("San Luis", 2026, 10, CORTE, new Map([["2026-10-04", 1.701]]), new Map());
  assert.equal(ventaOf(series, "2026-10-04"), 1701);
  assert.equal(new Date(2026, 9, 6).getDay(), 2);
  const weekday = month("San Luis", 2026, 10, CORTE, new Map([["2026-10-06", 2.25]]), new Map());
  assert.equal(ventaOf(weekday, "2026-10-06"), 2250);
});

test("L. un domingo con ambos canales ausentes queda null y la semana continúa", () => {
  const series = month("San Luis", 2026, 10, CORTE, new Map(), new Map());
  assert.equal(ventaOf(series, "2026-10-04"), null);
  const days = [
    { fecha: "2026-10-04", ventaKg: ventaOf(series, "2026-10-04"), precio: PRECIO },
    { fecha: "2026-10-05", ventaKg: 1000, precio: 10 },
  ];
  const agg = weekly.aggregateWeek(days, CORTE);
  assert.equal(agg.metrics.venta_kg, 1000);
});

test("M. Excel y materializePlantMonth comparten la suma de canales", () => {
  const casaRef = "'Provincia Venta Diaria'!L5";
  const comRef = "'Provincia Venta Diaria'!M5";
  const expected = venta.ventaKgFormula(casaRef, comRef);
  for (const monthNum of [9, 10]) {
    const wb = bookFor(2026, monthNum);
    const ws = wb.worksheets.find((sheet) => String(sheet.name).startsWith("IGF Diario"));
    const row = rowByDate(ws, 2026, monthNum, 4);
    assert.equal(ws.getCell(row, 2).value.formula, expected);
    assert.equal(ws.getCell(row, 4).value.formula.includes("AND(ISNUMBER"), true);
  }
  const cases = [
    [1.701, null, 1701],
    [null, 0.9, 900],
    [1.2, 0.8, 2000],
    [null, null, null],
    [0, 5, 5000],
    [5, 0, 5000],
    [0, 0, 0],
  ];
  for (const [casaTon, comTon, kg] of cases) {
    const fecha = "2026-10-06";
    const series = month(
      "San Luis",
      2026,
      10,
      CORTE,
      casaTon == null ? new Map() : new Map([[fecha, casaTon]]),
      comTon == null ? new Map() : new Map([[fecha, comTon]])
    );
    assert.equal(ventaOf(series, fecha), kg);
    assert.equal(venta.ventaKgFromCanalTons(casaTon, comTon), kg);
  }
});

test("N. la semana 41 incorpora 1,701 kg por el agregador", () => {
  const sunday = venta.ventaKgFromCanalTons(1.701, null);
  assert.equal(sunday, 1701);
  const known = [16585.100000000002, 19285.86, 11057.64, 28843.14, 22960, 29730];
  const before = known.reduce((sum, value) => sum + value, 0);
  assert.equal(before, 128461.74);
  const days = [
    { fecha: "2026-10-04", ventaKg: sunday, precio: PRECIO },
    { fecha: "2026-10-05", ventaKg: known[0], precio: 10 },
    { fecha: "2026-10-06", ventaKg: known[1], precio: 10 },
    { fecha: "2026-10-07", ventaKg: known[2], precio: 10 },
    { fecha: "2026-10-08", ventaKg: known[3], precio: 10 },
    { fecha: "2026-10-09", ventaKg: known[4], precio: 10 },
    { fecha: "2026-10-10", ventaKg: known[5], precio: 10 },
  ];
  const agg = weekly.aggregateWeek(days, CORTE);
  assert.equal(agg.metrics.venta_kg, before + sunday);
  assert.equal(agg.metrics.venta_kg, 130162.74);
  assert.equal(agg.metrics.venta_kg.toLocaleString("es-MX", { maximumFractionDigits: 0 }), "130,163");
  const only = weekly.aggregateWeek([{ fecha: "2026-10-04", ventaKg: sunday, precio: PRECIO }], CORTE);
  assert.equal(only.metrics.ingreso_mxn, PRECIO * sunday);
  assert.notEqual(only.metrics.ingreso_mxn, 21.13 * sunday);
});

test("O. Todas conserva una planta con venta de un solo canal", () => {
  const rows = [
    { venta_kg: venta.ventaKgFromCanalTons(1.701, null), precio_kg: PRECIO },
    { venta_kg: null, precio_kg: 10 },
    { venta_kg: 1000, precio_kg: 20 },
  ];
  const out = weekly.consolidateMetrics(rows);
  assert.equal(out.venta_kg, 2701);
  assert.equal(out.precio_kg, ((PRECIO * 1701) + (20 * 1000)) / 2701);
  const province = grafica.buildProvinceMonth([
    {
      year: 2026,
      month: 10,
      plant: "San Luis",
      points: [{ fecha: "2026-10-04", venta_kg: 1701, resultado_mxn: 100, estado: "real", complete: true, missing_components: [] }],
    },
    {
      year: 2026,
      month: 10,
      plant: "Puebla",
      points: [{ fecha: "2026-10-04", venta_kg: null, resultado_mxn: null, estado: "real", complete: false, missing_components: ["VENTA"] }],
    },
  ]);
  assert.equal(province.points[0].venta_kg, 1701);
});

test("20/09 y 27/09 Casa-only usan la misma suma", () => {
  assert.equal(new Date(2026, 8, 20).getDay(), 0);
  assert.equal(new Date(2026, 8, 27).getDay(), 0);
  const series = month(
    "San Luis",
    2026,
    9,
    "2026-09-30",
    new Map([["2026-09-20", 1.80306], ["2026-09-27", 1.42344]]),
    new Map()
  );
  assert.equal(ventaOf(series, "2026-09-20"), 1.80306 * 1000);
  assert.equal(ventaOf(series, "2026-09-27"), 1.42344 * 1000);
});

test("un día futuro con ambos canales sin resolver no se vuelve 0 en el agregador", () => {
  assert.equal(venta.ventaKgFromCanalTons(null, null), null);
  assert.equal(forecast.resolveCanalTon(null, "2026-10-11", CORTE, 11, null, null), 0);
});

test("filas de un solo canal en kilogramos no usan un operador falsy", () => {
  assert.equal(grafica.ventaKgFromRows([
    { fecha: "2026-10-04", canal: "Casa", kg: 0 },
    { fecha: "2026-10-04", canal: "Comisionista", kg: 5 },
  ], "2026-10-04"), 5);
  assert.equal(grafica.ventaKgFromRows([
    { fecha: "2026-10-04", canal: "Casa", kg: 1701 },
  ], "2026-10-04"), 1701);
  assert.equal(grafica.ventaKgFromRows([], "2026-10-04"), null);
  assert.equal(grafica.ventaKgFromRows([
    { fecha: "2026-10-04", canal: "Casa", kg: 0 },
    { fecha: "2026-10-04", canal: "Comisionista", kg: 0 },
  ], "2026-10-04"), 0);
});
