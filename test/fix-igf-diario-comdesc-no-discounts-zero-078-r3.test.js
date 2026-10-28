"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const grafica = require("../lib/igf-diario-grafica");
const forecast = require("../lib/dashboard-arr-forecast");
const weekly = require("../lib/igf-diario-weekly-plant");
const monthly = require("../lib/igf-diario-monthly-financials");
const { applyFinancialsToMiniRow } = require("../frontend-dashboard/lib/igf-october-mini");

const PLANT = "San Luis";
const SUNDAYS = ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"];
const VENTA_25 = 1798.74;
const PRIOR_RATE = -3.54;
const GRAFICA = fs.readFileSync(path.join(__dirname, "..", "lib", "igf-diario-grafica.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(__dirname, "..", "lib", "dashboard-arr-forecast.js"), "utf8");

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function evidenceOf(spec) {
  const groups = new Map();
  for (const row of spec.sales || []) {
    const key = `${row.plant}|${row.fecha}`;
    const bucket = groups.get(key) || { plant_code: row.plant, fecha: row.fecha, kg: 0, count: 0, monto: 0 };
    bucket.kg += Number(row.kg) || 0;
    groups.set(key, bucket);
  }
  for (const row of spec.discounts || []) {
    const key = `${row.plant}|${row.fecha}`;
    const bucket = groups.get(key) || { plant_code: row.plant, fecha: row.fecha, kg: 0, count: 0, monto: 0 };
    bucket.count += 1;
    bucket.monto += Number(row.monto) || 0;
    groups.set(key, bucket);
  }
  const rows = [];
  for (const bucket of groups.values()) {
    if (!(bucket.kg > 0)) continue;
    rows.push({
      plant_code: bucket.plant_code,
      fecha: bucket.fecha,
      descuento_por_kg: bucket.count === 0 ? 0 : round2(bucket.monto / bucket.kg),
    });
  }
  return rows;
}

function clientFor(spec) {
  const calls = [];
  return {
    calls,
    async query(sql) {
      const text = String(sql);
      calls.push(text);
      if (/^(?:insert|update|delete|create|alter|drop|truncate)\b/i.test(text.trim())) {
        throw new Error("escritura");
      }
      if (text.includes("descuento_por_kilo_diario_provincia")) return { rows: spec.primary || [] };
      if (text.includes("FROM arr.provincia_plants") && !text.includes("ventas_diarias_cliente")) {
        return { rows: [{ plant_code: PLANT }] };
      }
      if (text.includes("forecast_mensual")) return { rows: [] };
      if (text.includes("ventas_diarias_cliente") && text.includes("descuentos_diarios_cliente")) {
        if (spec.evidenceThrows) throw new Error("evidencia no disponible");
        return { rows: evidenceOf(spec) };
      }
      return { rows: [] };
    },
  };
}

function baseSpec() {
  return {
    primary: [
      { plant_code: PLANT, fecha: "2026-10-24", descuento_por_kg: PRIOR_RATE },
      { plant_code: PLANT, fecha: "2026-10-20", descuento_por_kg: 0 },
    ],
    sales: [
      ...SUNDAYS.map((fecha) => ({ plant: PLANT, fecha, kg: fecha === "2026-10-25" ? VENTA_25 : 1000 })),
      { plant: PLANT, fecha: "2026-10-10", kg: 500 },
      { plant: PLANT, fecha: "2026-10-12", kg: 400 },
      { plant: PLANT, fecha: "2026-10-15", kg: 0 },
      { plant: PLANT, fecha: "2026-10-20", kg: 800 },
    ],
    discounts: [
      { plant: PLANT, fecha: "2026-10-10", monto: -250, canal: "CASA" },
      { plant: PLANT, fecha: "2026-10-12", monto: 5, canal: "SIN_CLASIFICAR" },
      { plant: PLANT, fecha: "2026-10-12", monto: -5, canal: "CASA" },
      { plant: PLANT, fecha: "2026-10-20", monto: -999, canal: "CASA" },
    ],
  };
}

function rateOf(index, fecha) {
  return index.rows.find((row) => row.plant_code === PLANT && row.fecha === fecha);
}

function dayInput(fecha, ventaKg, cdKg) {
  return {
    fecha,
    ventaKg,
    precio: 20,
    costoKg: 10,
    fleteKg: 1,
    hgImporte: -50,
    cdKg,
    cdSource: cdKg === 0 ? "REAL" : "LAST_REAL_FALLBACK",
    expenses: {
      gasto_corporativo: 0,
      inversiones: 0,
      impuestos_federales: 0,
      presupuesto_nomina_gastos: 0,
      presupuesto_imss_sua: 0,
      extraordinarios: 0,
      provisiones_planta: 0,
    },
  };
}

test("A–H venta sin descuentos es cero y la evidencia desconocida conserva el fallback", async () => {
  const spec = baseSpec();
  const client = clientFor(spec);
  const index = await grafica.loadCdMonthIndex(client, 2026, 10);
  const grid = await forecast.getDescuentoPorKiloGrid(client, 2026, 10, "");
  const cell = (fecha) => grid.byDate.find((day) => day.fecha === fecha).byPlant[PLANT];

  for (const fecha of SUNDAYS) {
    assert.equal(rateOf(index, fecha).descuento_por_kg, 0);
    assert.equal(cell(fecha), 0);
  }
  assert.equal(cell("2026-10-10"), -0.5);
  assert.equal(rateOf(index, "2026-10-10").descuento_por_kg, -0.5);
  assert.equal(cell("2026-10-12"), 0);
  assert.equal(cell("2026-10-20"), 0);
  assert.equal(cell("2026-10-24"), PRIOR_RATE);
  assert.equal(cell("2026-10-15"), undefined);
  assert.equal(forecast.descuentoCategoriaRate(VENTA_25, 0), 0);
  assert.equal(forecast.descuentoCategoriaRate(0, 0), null);

  const evidenceSql = client.calls.filter((sql) => sql.includes("ventas_diarias_cliente") && sql.includes("descuentos_diarios_cliente"));
  assert.equal(evidenceSql.length, 2);
  assert.match(forecast.SQL_COMDESC_EVIDENCE, /COUNT\(\*\)/);
  assert.match(forecast.SQL_COMDESC_EVIDENCE, /LEFT JOIN d/);
  assert.match(forecast.SQL_COMDESC_EVIDENCE, /total_kg > 0/);
  assert.match(forecast.SQL_COMDESC_EVIDENCE, /row_count, 0\) = 0 THEN 0/);
  assert.doesNotMatch(forecast.SQL_COMDESC_EVIDENCE, /SIN_CLASIFICAR/);
  assert.equal(client.calls.some((sql) => /^(?:insert|update|delete|create|alter|drop|truncate)\b/i.test(sql.trim())), false);
  for (const source of [GRAFICA, FORECAST]) {
    assert.equal(source.includes(`if (${PLANT})`), false);
    assert.equal(source.includes("2026-10-25"), false);
    assert.equal(source.includes("2026-10-04"), false);
  }

  const unknown = clientFor({ ...spec, evidenceThrows: true });
  const partial = await grafica.loadCdMonthIndex(unknown, 2026, 10);
  assert.equal(rateOf(partial, "2026-10-25"), undefined);
  const inherited = grafica.resolveRealDayComDesc({
    fecha: "2026-10-25",
    ventaKg: VENTA_25,
    ownRate: null,
    sameMonthRates: new Map([["2026-10-24", PRIOR_RATE]]),
    priorMonthRates: new Map(),
  });
  assert.equal(inherited.cdKg, PRIOR_RATE);
  assert.equal(inherited.source, "LAST_REAL_FALLBACK");
  assert.equal(inherited.sourceDate, "2026-10-24");
});

test("I–L el cero real mueve C&D y resultado, y deja iguales venta, precio, costo, flete, margen, gastos y HG", () => {
  const beforeDay = dayInput("2026-10-25", VENTA_25, PRIOR_RATE);
  const afterDay = dayInput("2026-10-25", VENTA_25, 0);
  const before = weekly.dayMetrics(beforeDay).metrics;
  const after = weekly.dayMetrics(afterDay).metrics;
  assert.equal(before.venta_kg, after.venta_kg);
  assert.equal(before.precio_kg, after.precio_kg);
  assert.equal(before.costo_kg, after.costo_kg);
  assert.equal(before.flete_kg, after.flete_kg);
  assert.equal(before.margen_kg, after.margen_kg);
  assert.equal(before.gasto_corporativo_kg, after.gasto_corporativo_kg);
  assert.equal(before.hg_kg, after.hg_kg);
  assert.equal(before.sobrante_antes_hg_kg, after.sobrante_antes_hg_kg);
  assert.equal(before.sobrante_con_hg_kg, after.sobrante_con_hg_kg);
  assert.equal(after.com_desc_kg, 0);
  assert.equal(before.com_desc_kg, PRIOR_RATE);
  assert.ok(Math.abs((after.resultado_mxn - before.resultado_mxn) - (0 - PRIOR_RATE) * VENTA_25) < 1e-6);

  const other = dayInput("2026-10-26", 1000, -1);
  const weekBefore = weekly.aggregateWeek([beforeDay, other], "2026-11-01");
  const weekAfter = weekly.aggregateWeek([afterDay, other], "2026-11-01");
  assert.equal(weekBefore.metrics.venta_kg, weekAfter.metrics.venta_kg);
  assert.equal(weekBefore.metrics.precio_kg, weekAfter.metrics.precio_kg);
  assert.equal(weekBefore.metrics.costo_kg, weekAfter.metrics.costo_kg);
  assert.equal(weekBefore.metrics.flete_kg, weekAfter.metrics.flete_kg);
  assert.equal(weekBefore.metrics.margen_kg, weekAfter.metrics.margen_kg);
  assert.equal(weekBefore.metrics.hg_kg, weekAfter.metrics.hg_kg);
  assert.notEqual(weekBefore.metrics.com_desc_kg, weekAfter.metrics.com_desc_kg);
  assert.ok(Math.abs((weekAfter.metrics.resultado_mxn - weekBefore.metrics.resultado_mxn) - (0 - PRIOR_RATE) * VENTA_25) < 1e-6);

  const monthDay = (cd) => ({ fecha: "2026-10-25", ventaKg: VENTA_25, precio: 20, costoKg: 10, fleteKg: 1, hgKg: before.hg_kg, cdKg: cd });
  const monthBefore = monthly.summarizeDays([monthDay(PRIOR_RATE)]);
  const monthAfter = monthly.summarizeDays([monthDay(0)]);
  assert.equal(monthBefore.ventaKg, monthAfter.ventaKg);
  assert.equal(monthBefore.margenKg, monthAfter.margenKg);
  assert.equal(monthBefore.hgKg, monthAfter.hgKg);
  assert.notEqual(monthBefore.comDescKg, monthAfter.comDescKg);
  assert.equal(monthAfter.comDescKg, 0);
  const mini = (fin) => applyFinancialsToMiniRow({ plant_code: PLANT }, {
    margenKg: fin.margenKg,
    comDescKg: fin.comDescKg,
    hgKg: fin.hgKg,
    ventaTon: fin.ventaTon,
    operativosImporte: 100,
    corporativosImporte: 40,
    impuestosFederalesImporte: 10,
  });
  const shownBefore = mini(monthBefore);
  const shownAfter = mini(monthAfter);
  assert.equal(shownBefore.ventaTon, shownAfter.ventaTon);
  assert.equal(shownBefore.margen, shownAfter.margen);
  assert.equal(shownBefore.hgKg, shownAfter.hgKg);
  assert.equal(shownBefore.operativos, shownAfter.operativos);
  assert.equal(shownBefore.corporativos, shownAfter.corporativos);
  assert.notEqual(shownBefore.ingreso, shownAfter.ingreso);
  assert.notEqual(shownBefore.utilOperImporte, shownAfter.utilOperImporte);
  assert.notEqual(shownBefore.resultadoFinalImporte, shownAfter.resultadoFinalImporte);
  assert.equal(shownAfter.ingreso - shownBefore.ingreso, shownAfter.resultadoFinalImporte - shownBefore.resultadoFinalImporte);

  const selected = new Map();
  for (let day = 1; day <= 31; day += 1) selected.set(`2026-10-${String(day).padStart(2, "0")}`, true);
  const lookback = {
    enableLookback: true,
    lookbackStartYmd: "2026-10-01",
    lookbackEndYmd: "2026-10-31",
    lookbackQueryFromYmd: "2026-10-01",
    selectedByYmd: selected,
  };
  const without = new Map([["2026-10-24", PRIOR_RATE]]);
  const withZeros = new Map(without);
  for (const fecha of SUNDAYS) withZeros.set(fecha, 0);
  assert.equal(forecast.computePromMesByDow(without, lookback)[6], "");
  assert.equal(forecast.computePromMesByDow(withZeros, lookback)[6], 0);
});
