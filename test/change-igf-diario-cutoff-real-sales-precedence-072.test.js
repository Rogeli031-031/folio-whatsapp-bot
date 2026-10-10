"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const forecast = require("../lib/dashboard-arr-forecast");
const grafica = require("../lib/igf-diario-grafica");
const weekly = require("../lib/igf-diario-weekly-plant");

const CORTE = "2026-10-04";
const PRECIO = 21.13;

function pack(casa, com) {
  return {
    promVentaCasa: casa,
    promVentaComisionista: com,
    promDescTotal: [],
    promVentaTotal: [],
    proyVentaTotal: 0,
  };
}

function month(plant, corte, casaTon, comTon, forecastPack, precioRows) {
  return grafica.materializePlantMonth({
    year: Number(String(corte).slice(0, 4)),
    month: Number(String(corte).slice(5, 7)),
    plant,
    corteYmd: corte,
    project: true,
    projection: {
      corteYmdStr: corte,
      byPlant: new Map([[plant, forecastPack]]),
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

test("A. antes del corte la captura real se conserva", () => {
  assert.equal(forecast.resolveCanalTon(4, "2026-10-03", CORTE, 3, null, 9), 4);
  assert.equal(forecast.resolveCanalTon(0, "2026-10-03", CORTE, 3, null, 9), 0);
  assert.equal(forecast.resolveCanalTon(null, "2026-10-03", CORTE, 3, null, 9), 9);
});

test("B. en el corte los dos canales reales prevalecen sobre el forecast", () => {
  const corte = "2026-09-16";
  const series = month(
    "Puebla",
    corte,
    new Map([[corte, 1.2]]),
    new Map([[corte, 0.8]]),
    pack([7, 7, 7, 7, 7, 7, 7], [6, 6, 6, 6, 6, 6, 6])
  );
  assert.equal(forecast.resolveCanalTon(1.2, corte, corte, 16, null, 7), 1.2);
  assert.equal(forecast.resolveCanalTon(0.8, corte, corte, 16, null, 6), 0.8);
  assert.equal(ventaOf(series, corte), 2000);
});

test("C. en el corte Casa real y Comisionista solo forecast", () => {
  const series = month("Puebla", CORTE, new Map([[CORTE, 1.2]]), new Map(), pack([], [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]));
  assert.equal(forecast.resolveCanalTon(1.2, CORTE, CORTE, 4, null, null), 1.2);
  assert.equal(forecast.resolveCanalTon(null, CORTE, CORTE, 4, null, 0.8), 0.8);
  assert.equal(ventaOf(series, CORTE), 2000);
});

test("D. en el corte Casa solo forecast y Comisionista real", () => {
  const series = month("Puebla", CORTE, new Map(), new Map([[CORTE, 0.8]]), pack([1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2], []));
  assert.equal(forecast.resolveCanalTon(null, CORTE, CORTE, 4, null, 1.2), 1.2);
  assert.equal(forecast.resolveCanalTon(0.8, CORTE, CORTE, 4, null, 9), 0.8);
  assert.equal(ventaOf(series, CORTE), 2000);
});

test("E. en el corte sin reales se usan los dos forecast", () => {
  const series = month("Puebla", CORTE, new Map(), new Map(), pack([1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2], [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]));
  assert.equal(ventaOf(series, CORTE), 2000);
});

test("F. en el corte un canal resuelto y el otro ausente conserva el canal presente", () => {
  const series = month("Puebla", CORTE, new Map([[CORTE, 1.2]]), new Map(), pack([], []));
  assert.equal(forecast.resolveCanalTon(1.2, CORTE, CORTE, 4, null, null), 1.2);
  assert.equal(forecast.resolveCanalTon(null, CORTE, CORTE, 4, null, null), null);
  assert.equal(ventaOf(series, CORTE), 1200);
});

test("G. despues del corte el forecast sigue prevaleciendo", () => {
  assert.equal(forecast.resolveCanalTon(1.2, "2026-10-05", CORTE, 5, null, 0.8), 0.8);
  assert.equal(forecast.resolveCanalTon(1.2, "2026-10-05", CORTE, 5, null, null), 0);
  const series = month(
    "Puebla",
    CORTE,
    new Map([["2026-10-05", 1.2]]),
    new Map([["2026-10-05", 0.4]]),
    pack([0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
  );
  assert.equal(ventaOf(series, "2026-10-05"), 800);
});

test("H. un domingo de corte con captura real conserva la captura", () => {
  const series = month(
    "Puebla",
    CORTE,
    new Map([[CORTE, 1.2]]),
    new Map([[CORTE, 0.8]]),
    pack([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9])
  );
  assert.equal(new Date(2026, 9, 4).getDay(), 0);
  assert.equal(ventaOf(series, CORTE), 2000);
});

test("I. un domingo de corte sin real ni forecast queda null y no anula la semana", () => {
  const series = month("Puebla", CORTE, new Map(), new Map(), pack([], []));
  assert.equal(ventaOf(series, CORTE), null);
  const days = [
    { fecha: CORTE, ventaKg: null, precio: PRECIO },
    { fecha: "2026-10-05", ventaKg: 1000, precio: 10 },
  ];
  const agg = weekly.aggregateWeek(days, CORTE);
  assert.equal(agg.metrics.venta_kg, 1000);
  assert.equal(weekly.weekDayRecords(days, CORTE)[0].metrics.venta_kg, null);
});

test("J. un cero real explicito prevalece sobre el forecast en el corte", () => {
  assert.equal(forecast.resolveCanalTon(0, CORTE, CORTE, 4, null, 1.5), 0);
  assert.equal(forecast.resolveCanalTon(0, CORTE, CORTE, 4, null, null), 0);
  assert.equal(forecast.resolveCanalTon(null, CORTE, CORTE, 4, null, 0), 0);
  assert.equal(forecast.resolveCanalTon("", CORTE, CORTE, 4, null, 1.5), 1.5);
  assert.equal(forecast.resolveCanalTon(Number.NaN, CORTE, CORTE, 4, null, 1.5), 1.5);
  const series = month("Puebla", CORTE, new Map([[CORTE, 0]]), new Map([[CORTE, 0.8]]), pack([1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]));
  assert.equal(ventaOf(series, CORTE), 800);
});

test("K. San Luis 04/10/2026 reconcilia 2.000 t desde los canales", () => {
  const series = month(
    "San Luis",
    CORTE,
    new Map([[CORTE, 1.2]]),
    new Map([[CORTE, 0.8]]),
    pack([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9, 9, 9, 9]),
    [{ fecha: CORTE, precio: PRECIO }]
  );
  assert.equal(forecast.resolveCanalTon(1.2, CORTE, CORTE, 4, null, 9), 1.2);
  assert.equal(forecast.resolveCanalTon(0.8, CORTE, CORTE, 4, null, 9), 0.8);
  assert.equal(ventaOf(series, CORTE), 2000);
});

test("L. la semana 41 incorpora los 2,000 kg por la suma existente", () => {
  const series = month(
    "San Luis",
    CORTE,
    new Map([[CORTE, 1.2]]),
    new Map([[CORTE, 0.8]]),
    pack([], []),
    [{ fecha: CORTE, precio: PRECIO }]
  );
  const span = weekly.weekOf("2026-10-06");
  assert.equal(span.fecha_desde, CORTE);
  assert.equal(span.fecha_hasta, "2026-10-10");
  assert.equal(span.week_number, 41);
  const days = series.resolved.filter((row) => row.fecha >= span.fecha_desde && row.fecha <= span.fecha_hasta);
  assert.equal(days.length, 7);
  const records = weekly.weekDayRecords(days, CORTE);
  assert.equal(records[0].fecha, CORTE);
  assert.equal(records[0].metrics.venta_kg, 2000);
  const agg = weekly.aggregateWeek(days, CORTE);
  assert.equal(agg.metrics.venta_kg, 2000);
  assert.equal(agg.metrics.ingreso_mxn, PRECIO * 2000);
});
