"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const weekly = require("../lib/igf-diario-weekly-plant");
const grafica = require("../lib/igf-diario-grafica");
const forecast = require("../lib/dashboard-arr-forecast");
const desglose = require("../lib/igf-diario-gastos-desglose");
const margenManual = require("../lib/igf-diario-margen-manual");
const gastos = require("../lib/igf-diario-gastos-distribucion");

const CORTE = "2026-10-19";
const PLANT = { nombre: "Norte", canon: "Norte", plantaId: 7 };

function prom(total) {
  return {
    promVentaTotal: total,
    promVentaCasa: [14, 14, 14, 14, 14, 14, 14],
    promVentaComisionista: [10, 10, 10, 10, 10, 10, 10],
    promDescTotal: [],
  };
}

function projection(total) {
  return { byPlant: new Map([["Norte", prom(total)]]) };
}

function expenses() {
  return {
    gasto_corporativo: 10,
    inversiones: 5,
    impuestos_federales: 4,
    presupuesto_nomina_gastos: 8,
    presupuesto_imss_sua: 3,
    extraordinarios: 2,
    provisiones_planta: 1,
  };
}

function storedDay(fecha, ventaKg, extra) {
  return {
    fecha,
    ventaKg,
    casaKg: 4000,
    comKg: 2351,
    precio: 10,
    costoKg: 4,
    fleteKg: 1,
    hgImporte: 100,
    hgKilos: 20,
    cdKg: -0.5,
    expenses: expenses(),
    ...extra,
  };
}

test("A. el corte con captura parcial usa PROM Venta Total", () => {
  const captured = forecast.resolveCanalTon(6.351, "2026-10-19", CORTE, 19, null, 14);
  assert.equal(captured, 6.351);
  const day = storedDay("2026-10-19", 6351);
  const days = new Map([[day.fecha, day]]);
  weekly.applyWeeklyProjectedTotalSale(days, projection([30, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, 30000);
  assert.notEqual(day.ventaKg, 6351);
});

test("B. PROM Total manda aunque los canales sumen otra cifra", () => {
  const day = storedDay("2026-10-20", 24000, { casaKg: 14000, comKg: 10000 });
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([30, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, 29000);
  assert.equal(day.casaKg, 14000);
  assert.equal(day.comKg, 10000);
  assert.notEqual(day.ventaKg, day.casaKg + day.comKg);
});

test("C. antes del corte la venta real queda intacta", () => {
  const day = storedDay("2026-10-18", 4200, { casaKg: 4200, comKg: null });
  const before = { ...day, expenses: { ...day.expenses } };
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([30, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, before.ventaKg);
  assert.equal(day.casaKg, before.casaKg);
  assert.equal(day.precio, before.precio);
});

test("D. PROM Total cero es cero kilos", () => {
  const day = storedDay("2026-10-19", 6351);
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([0, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, 0);
});

test("E. PROM Total ausente deja ventaKg null sin fallback", () => {
  const day = storedDay("2026-10-19", 6351, { casaKg: 4000, comKg: 2351 });
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([null, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, null);
  assert.equal(day.casaKg, 4000);
  assert.equal(day.comKg, 2351);
});

test("F. Casa y Comisionista no se reescalan", () => {
  const day = storedDay("2026-10-19", 6351, { casaKg: 4000, comKg: 2351, precio: 21, costoKg: 8, fleteKg: 2 });
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([30, 29, 28, 27, 26, 25, 10]), PLANT, CORTE);
  assert.equal(day.ventaKg, 30000);
  assert.equal(day.casaKg, 4000);
  assert.equal(day.comKg, 2351);
  assert.equal(day.precio, 21);
  assert.equal(day.costoKg, 8);
  assert.equal(day.fleteKg, 2);
  assert.equal(day.hgImporte, 100);
  assert.equal(day.cdKg, -0.5);
});

test("G. el agregador semanal usa la venta ya sustituida", () => {
  const day = storedDay("2026-10-19", 6351);
  const previous = weekly.dayResultMxn({ ...day, expenses: expenses() });
  weekly.applyWeeklyProjectedTotalSale(new Map([[day.fecha, day]]), projection([30]), PLANT, CORTE);
  const pack = weekly.aggregateWeek([day], CORTE);
  assert.equal(pack.metrics.venta_kg, 30000);
  assert.equal(pack.metrics.ingreso_mxn, 10 * 30000);
  assert.equal(pack.metrics.resultado_mxn, weekly.dayResultMxn(day));
  assert.notEqual(pack.metrics.resultado_mxn, previous);
  assert.equal(pack.metrics.resultado_kg, pack.metrics.resultado_mxn / pack.metrics.venta_kg);
});

test("H. TODAS suma las ventas ya corregidas", () => {
  const norte = storedDay("2026-10-19", 6351);
  const surDay = storedDay("2026-10-19", 1000, { casaKg: 600, comKg: 400 });
  const sur = { nombre: "Sur", canon: "Sur" };
  const both = {
    byPlant: new Map([
      ["Norte", prom([30, 29, 28, 27, 26, 25, 10])],
      ["Sur", prom([12, 11, 10, 9, 8, 7, 6])],
    ]),
  };
  weekly.applyWeeklyProjectedTotalSale(new Map([[norte.fecha, norte]]), both, PLANT, CORTE);
  weekly.applyWeeklyProjectedTotalSale(new Map([[surDay.fecha, surDay]]), both, sur, CORTE);
  const metrics = weekly.consolidateMetrics([
    weekly.aggregateWeek([norte], CORTE).metrics,
    weekly.aggregateWeek([surDay], CORTE).metrics,
  ]);
  assert.equal(norte.ventaKg, 30000);
  assert.equal(surDay.ventaKg, 12000);
  assert.equal(metrics.venta_kg, 42000);
  assert.equal(metrics.ingreso_mxn, 10 * 42000);
});

test("I. al avanzar el corte, el lunes queda real y el martes usa PROM Total", () => {
  const lunes = storedDay("2026-10-19", 6351);
  const martes = storedDay("2026-10-20", 24000, { casaKg: 14000, comKg: 10000 });
  const days = new Map([[lunes.fecha, lunes], [martes.fecha, martes]]);
  weekly.applyWeeklyProjectedTotalSale(days, projection([30, 29, 28, 27, 26, 25, 10]), PLANT, "2026-10-20");
  assert.equal(lunes.ventaKg, 6351);
  assert.equal(martes.ventaKg, 29000);
});

function installLoaders() {
  const saved = {
    loadCdMonthIndex: grafica.loadCdMonthIndex,
    loadPlantFacts: grafica.loadPlantFacts,
    loadComprasDayMap: grafica.loadComprasDayMap,
    canalTonMaps: grafica.canalTonMaps,
    listMonth: desglose.listMonth,
    listMonthOverrides: margenManual.listMonthOverrides,
    overridesForPlant: gastos.overridesForPlant,
  };
  grafica.loadCdMonthIndex = async () => ({ rows: [] });
  grafica.loadPlantFacts = async () => ({ salesRows: [] });
  grafica.loadComprasDayMap = async () => new Map();
  grafica.canalTonMaps = () => ({
    casa: new Map([
      ["2026-10-18", 4.2],
      ["2026-10-19", 6.351],
    ]),
    com: new Map(),
  });
  desglose.listMonth = async () => [];
  margenManual.listMonthOverrides = async () => [];
  gastos.overridesForPlant = async () => null;
  return () => {
    grafica.loadCdMonthIndex = saved.loadCdMonthIndex;
    grafica.loadPlantFacts = saved.loadPlantFacts;
    grafica.loadComprasDayMap = saved.loadComprasDayMap;
    grafica.canalTonMaps = saved.canalTonMaps;
    desglose.listMonth = saved.listMonth;
    margenManual.listMonthOverrides = saved.listMonthOverrides;
    gastos.overridesForPlant = saved.overridesForPlant;
  };
}

function weeklyOpts(corte) {
  return {
    plant: PLANT,
    year: 2026,
    month: 10,
    weekAnchor: "2026-10-19",
    corteYmd: corte,
    projection: projection([30, 29, 28, 27, 26, 25, 10]),
    comprasCache: new Map(),
    loadPrecio: async () => [{ fecha: "2026-10-01", precio: 20 }],
  };
}

test("el mes abierto sustituye la venta del corte y conserva canales e histórico", async () => {
  const restore = installLoaders();
  try {
    const materialized = grafica.materializePlantMonth({
      year: 2026,
      month: 10,
      plant: "Norte",
      corteYmd: CORTE,
      project: true,
      projection: projection([30, 29, 28, 27, 26, 25, 10]),
      casaTon: new Map([["2026-10-18", 4.2], ["2026-10-19", 6.351]]),
      comTon: new Map(),
      precioRows: [{ fecha: "2026-10-01", precio: 20 }],
      skipDay1Fallback: true,
    });
    const capturedSunday = materialized.financial_days.find((day) => day.fecha === "2026-10-18");
    const capturedMonday = materialized.financial_days.find((day) => day.fecha === "2026-10-19");
    const capturedTuesday = materialized.financial_days.find((day) => day.fecha === "2026-10-20");
    const channelsMonday = materialized.resolved.find((day) => day.fecha === "2026-10-19");
    const channelsTuesday = materialized.resolved.find((day) => day.fecha === "2026-10-20");
    assert.notEqual(capturedMonday.ventaKg, 30000);
    assert.notEqual(capturedTuesday.ventaKg, 29000);
    const payload = await weekly.loadWeeklyPlant({ query() { throw new Error("query"); } }, weeklyOpts(CORTE));
    const byFecha = new Map(payload.days.map((day) => [day.fecha, day]));
    assert.equal(byFecha.get("2026-10-18").metrics.venta_kg, capturedSunday.ventaKg);
    assert.equal(byFecha.get("2026-10-19").metrics.venta_kg, 30000);
    assert.equal(byFecha.get("2026-10-19").venta_casa_kg, channelsMonday.casaKg);
    assert.equal(byFecha.get("2026-10-19").venta_comisionista_kg, channelsMonday.comKg);
    assert.equal(byFecha.get("2026-10-20").metrics.venta_kg, 29000);
    assert.equal(byFecha.get("2026-10-20").venta_casa_kg, channelsTuesday.casaKg);
    assert.equal(byFecha.get("2026-10-20").venta_comisionista_kg, channelsTuesday.comKg);
    assert.equal(payload.metrics.ingreso_mxn, payload.metrics.venta_kg * 20);
    const historical = grafica.materializePlantMonth({
      year: 2026,
      month: 10,
      plant: "Norte",
      corteYmd: "2026-10-20",
      project: true,
      projection: projection([30, 29, 28, 27, 26, 25, 10]),
      casaTon: new Map([["2026-10-18", 4.2], ["2026-10-19", 6.351]]),
      comTon: new Map(),
      precioRows: [{ fecha: "2026-10-01", precio: 20 }],
      skipDay1Fallback: true,
    });
    const mondayReal = historical.financial_days.find((day) => day.fecha === "2026-10-19");
    const advanced = await weekly.loadWeeklyPlant({ query() { throw new Error("query"); } }, weeklyOpts("2026-10-20"));
    const next = new Map(advanced.days.map((day) => [day.fecha, day]));
    assert.equal(next.get("2026-10-19").metrics.venta_kg, mondayReal.ventaKg);
    assert.notEqual(next.get("2026-10-19").metrics.venta_kg, 30000);
    assert.equal(next.get("2026-10-20").metrics.venta_kg, 29000);
    const todas = await weekly.loadWeeklyAll({ query() { throw new Error("query"); } }, {
      ...weeklyOpts(CORTE),
      plants: [PLANT, { nombre: "Norte", canon: "Norte", plantaId: 8 }],
    });
    const monday = todas.resumen.days.find((day) => day.fecha === "2026-10-19");
    assert.equal(monday.metrics.venta_kg, 60000);
  } finally {
    restore();
  }
});
