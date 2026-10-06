"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const financials = require("../lib/igf-diario-monthly-financials");
const { totalMesMarginAndHg } = require("../lib/igf-diario-puebla");
const { computePromMesByDow } = require("../lib/dashboard-arr-forecast");
const mini = require("../frontend-dashboard/lib/igf-october-mini");

const HELPER = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-monthly-financials.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "app", "arr", "ArrClient.tsx"), "utf8");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");

function round2(value) {
  return Math.round(value * 100) / 100;
}

function legacyDowDiscount(pairs) {
  const money = pairs.reduce((sum, pair) => sum + round2(pair.cd * pair.ton), 0);
  const tons = pairs.reduce((sum, pair) => sum + pair.ton, 0);
  return round2(round2(money) / tons);
}

test("septiembre queda en el contrato anterior y octubre entra al 066", () => {
  assert.equal(financials.usesOctoberContract(2026, 9), false);
  assert.equal(financials.usesOctoberContract(2026, 10), true);
  assert.equal(financials.usesOctoberContract(2026, 11), true);
  const fn = FORECAST.slice(FORECAST.indexOf("async function computePronosticoProyByPlant"), FORECAST.indexOf("async function getVentaRealTonProvinciaByPlant"));
  const gate = fn.indexOf("usesOctoberContract");
  const legacyRound = fn.indexOf("Math.round((sum(proyDescMxn) / proyVentaTon) * 100) / 100");
  assert.ok(gate > 0 && legacyRound > gate);
  assert.match(fn, /const proyVentaTon = Math\.round\(sum\(proyVenta\) \* 100\) \/ 100/);
});

test("margen H, descuento AD y los tres cierres salen del mismo ponderado", () => {
  const days = [
    { ventaKg: 250, precio: 20, costoKg: 10, fleteKg: 2, cdKg: -4.2, hgImporte: -500 },
    { ventaKg: 750, precio: 20, costoKg: 10, fleteKg: 2, cdKg: -4.36, hgImporte: -1500 },
  ];
  const summary = financials.summarizeDays(days);
  const expectedDesc = (-4.2 * 250 + -4.36 * 750) / 1000;
  const expectedMargen = financials.weightedByVenta(days, (day) => financials.margenOf(day), (day) => day.ventaKg);
  assert.equal(summary.margenKg, expectedMargen);
  assert.equal(summary.comDescKg, expectedDesc);
  assert.equal(round2(expectedDesc), -4.32);
  assert.equal(summary.comDescKg, summary.comDescKg);
  assert.ok(summary.comDescKg < 0);
  const positive = financials.weightedByVenta(
    [{ ventaKg: 100, cdKg: 1.25 }, { ventaKg: 300, cdKg: 2.25 }],
    (day) => day.cdKg,
    (day) => day.ventaKg
  );
  assert.equal(positive, (1.25 * 100 + 2.25 * 300) / 400);
  assert.ok(positive > 0);
  const dow = legacyDowDiscount([{ cd: -4.204, ton: 0.251 }, { cd: -4.361, ton: 0.749 }]);
  assert.notEqual(dow, financials.weightedByVenta(
    [{ ventaKg: 251, cdKg: -4.204 }, { ventaKg: 749, cdKg: -4.361 }],
    (day) => day.cdKg,
    (day) => day.ventaKg
  ));
  assert.equal(mini.applyFinancialsToMiniRow({ ventaTon: 1 }, summary).comDesc, expectedDesc);
});

test("el cierre mensual no redondea primero por día de semana", () => {
  const pairs = [
    { cd: -10.004, ton: 1.006 },
    { cd: -0.004, ton: 1.006 },
  ];
  const days = pairs.map((pair) => ({ ventaKg: pair.ton * 1000, cdKg: pair.cd }));
  const exact = financials.weightedByVenta(days, (day) => day.cdKg, (day) => day.ventaKg);
  const rounded = legacyDowDiscount(pairs);
  assert.notEqual(exact, rounded);
  assert.equal(exact, pairs.reduce((sum, pair) => sum + pair.cd * pair.ton, 0) / pairs.reduce((sum, pair) => sum + pair.ton, 0));
});

test("PROM y lookback siguen decidiendo el futuro y un cambio de selección recalcula AD", () => {
  const desc = new Map([
    ["2026-09-28", -4],
    ["2026-10-05", -8],
  ]);
  const base = {
    enableLookback: true,
    lookbackStartYmd: "2026-09-14",
    lookbackEndYmd: "2026-10-05",
    lookbackQueryFromYmd: "2026-09-14",
  };
  assert.deepEqual(computePromMesByDow(desc, { ...base, enableLookback: false }), ["", "", "", "", "", "", ""]);
  const all = computePromMesByDow(desc, { ...base, selectedByYmd: new Map() });
  const dropped = computePromMesByDow(desc, { ...base, selectedByYmd: new Map([["2026-10-05", false]]) });
  assert.notEqual(all[0], dropped[0]);
  const shared = {
    year: 2026,
    month: 10,
    corteYmd: "2026-10-06",
    corteInMonth: true,
    ventaByFecha: new Map([["2026-10-01", 2], ["2026-10-02", 2]]),
    promVenta: [1, 1, 1, 1, 1, 1, 1],
  };
  const open = financials.discountSeriesFromMaps({ ...shared, descByFecha: desc, promDesc: all });
  const next = financials.discountSeriesFromMaps({ ...shared, descByFecha: desc, promDesc: dropped });
  const openAd = financials.weightedByVenta(open, (day) => day.cdKg, (day) => day.ventaKg);
  const nextAd = financials.weightedByVenta(next, (day) => day.cdKg, (day) => day.ventaKg);
  assert.notEqual(openAd, nextAd);
  assert.equal(openAd, financials.summarizeDays(open).comDescKg);
});

test("operativos, corporativos sin impuestos, gasto e impuesto por kilo", () => {
  const summary = financials.applyExpenses(financials.summarizeDays([{ ventaKg: 1000, precio: 10, costoKg: 4, fleteKg: 1, cdKg: -1, hgImporte: -200 }]), {
    presupuesto_nomina_gastos: 100,
    presupuesto_imss_sua: 20,
    extraordinarios: 5,
    provisiones_planta: 7,
    gasto_corporativo: 30,
    inversiones: 10,
    impuestos_federales: 40,
  });
  assert.equal(summary.operativosImporte, 132);
  assert.equal(summary.corporativosImporte, 40);
  assert.equal(summary.gastoImporte, 172);
  assert.notEqual(summary.corporativosImporte, 80);
  assert.equal(summary.impuestoKg, 40 / 1000);
  assert.equal(summary.gastoImporte, summary.operativosImporte + summary.corporativosImporte);
  const ingreso = mini.ingresoImporte(summary.margenKg, summary.comDescKg, summary.hgKg, 1);
  const resultado = ingreso - summary.operativosImporte - summary.corporativosImporte;
  assert.equal(resultado, ingreso - summary.gastoImporte);
  assert.notEqual(resultado, ingreso - summary.gastoImporte - summary.impuestosFederalesImporte);
  const incomplete = financials.applyExpenses({ contract: "066", ventaKg: 1000 }, { gasto_corporativo: 30, impuestos_federales: 40 });
  assert.equal(incomplete.corporativosImporte, null);
  assert.equal(incomplete.impuestoKg, 0.04);
  assert.equal(incomplete.gastoImporte, null);
  const noVenta = financials.applyExpenses({ ...summary, ventaKg: 0 }, {
    gasto_corporativo: 1,
    inversiones: 1,
    impuestos_federales: 5,
    presupuesto_nomina_gastos: 1,
    presupuesto_imss_sua: 1,
    extraordinarios: 1,
    provisiones_planta: 1,
  }, 0);
  assert.equal(noVenta.impuestoKg, null);
});

test("HG$ es F+G, HG% conserva la escala y Z conserva el signo", () => {
  const summary = financials.summarizeDays([
    { ventaKg: 100, precio: 10, costoKg: 4, fleteKg: 2, cdKg: -1, hgImporte: -300 },
    { ventaKg: 300, precio: 10, costoKg: 6, fleteKg: 2, cdKg: -1, hgImporte: -600 },
  ]);
  assert.equal(summary.hgDollar, summary.costoKg + summary.fleteKg);
  assert.equal(summary.hgPct, (summary.hgKg / summary.hgDollar) * -1);
  assert.ok(summary.hgKg < 0);
  assert.equal(Math.round(summary.hgPct * 100 * 10000) / 10000, Math.round(((summary.hgKg / summary.hgDollar) * -1) * 100 * 10000) / 10000);
  const zero = financials.summarizeDays([{ ventaKg: 100, precio: 10, costoKg: 0, fleteKg: 0, hgImporte: -50 }]);
  assert.equal(zero.hgDollar, 0);
  assert.equal(zero.hgPct, null);
  const same = totalMesMarginAndHg([
    { ventaKg: 100, margen: 4, hgKg: -3 },
    { ventaKg: 300, margen: 2, hgKg: -2 },
  ]);
  const via = financials.summarizeDays([
    { ventaKg: 100, margen: 4, hgKg: -3 },
    { ventaKg: 300, margen: 2, hgKg: -2 },
  ]);
  assert.equal(via.margenKg, same.margen);
  assert.equal(via.hgKg, same.hg);
});

test("precio, costo y flete manuales mueven F, G, H y HG$", () => {
  const base = [
    { ventaKg: 100, precio: 20, costoKg: 10, fleteKg: 1 },
    { ventaKg: 300, precio: 20, costoKg: 10, fleteKg: 1 },
  ];
  const plain = financials.summarizeDays(base);
  const precio = financials.summarizeDays(base.map((day, index) => index === 0 ? { ...day, precio: 22 } : day));
  const costo = financials.summarizeDays(base.map((day) => ({ ...day, costoKg: 12.55 })));
  const flete = financials.summarizeDays(base.map((day) => ({ ...day, fleteKg: 1.27 })));
  assert.notEqual(precio.margenKg, plain.margenKg);
  assert.equal(precio.costoKg, plain.costoKg);
  assert.notEqual(costo.costoKg, plain.costoKg);
  assert.notEqual(costo.margenKg, plain.margenKg);
  assert.notEqual(costo.hgDollar, plain.hgDollar);
  assert.notEqual(flete.fleteKg, plain.fleteKg);
  assert.notEqual(flete.margenKg, plain.margenKg);
  assert.notEqual(flete.hgDollar, plain.hgDollar);
});

test("ARR de octubre usa la mini y conserva el signo; septiembre sigue con el valor absoluto", () => {
  const metrics = ARR.slice(ARR.indexOf("function resumenMesMetrics"), ARR.indexOf("function fmtDeltaMoney"));
  assert.match(metrics, /vals\.hgPct \* 100/);
  assert.match(metrics, /\? vals\.comDescKg/);
  assert.match(metrics, /-Math\.abs\(vals\.comDescKg\)/);
  assert.match(metrics, /vals\.hgDollar/);
  const october = ARR.slice(ARR.indexOf("if (periodOctober(periodKey))"), ARR.indexOf("function periodoLabel"));
  const arm = october.slice(0, october.indexOf("margenKg: forecastRow"));
  assert.match(arm, /miniRow\?\.margen/);
  assert.match(arm, /miniRow\?\.comDesc/);
  assert.match(arm, /miniRow\?\.hgPct/);
  assert.doesNotMatch(arm, /forecastRow\?\.hg_pct/);
  assert.doesNotMatch(arm, /Math\.abs/);
  assert.match(ARR, /overlayMiniRows/);
  assert.match(ARR, /return Math\.round\(sumIng - gastoImporte\)/);
  const overlay = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-october-mini.js"), "utf8");
  assert.match(overlay, /utilOperImporte - corporativos/);
  assert.match(overlay, /\(margen \+ com - hg\) \* Number\(ventaTon\) \* 1000/);
  const september = -Math.abs(4.1);
  const octoberValue = -4.32;
  assert.equal(octoberValue - september, -4.32 - (-4.1));
});

test("zona pondera margen, descuento e impuesto y respeta la identidad de planta", () => {
  const rows = [
    mini.applyFinancialsToMiniRow({ empresa: "GT Puebla", plant_code: "Puebla", ventaTon: 1 }, {
      margenKg: 8, comDescKg: -4, hgKg: -1, impuestosFederalesImporte: 1000, operativosImporte: 10, corporativosImporte: 4, hgPct: 0.2, hgDollar: 5,
    }),
    mini.applyFinancialsToMiniRow({ empresa: "Tehuacán", plant_code: "Tehuacan", ventaTon: 3 }, {
      margenKg: 4, comDescKg: -2, hgKg: -1, impuestosFederalesImporte: 3000, operativosImporte: 6, corporativosImporte: 2, hgPct: 0.1, hgDollar: 3,
    }),
  ];
  const zona = mini.zonaFromPlantRows(rows);
  assert.equal(zona.margen, Math.round(((8 * 1 + 4 * 3) / 4) * 10000) / 10000);
  assert.equal(zona.comDesc, Math.round(((-4 * 1 + -2 * 3) / 4) * 10000) / 10000);
  assert.equal(zona.impuestos, Math.round(((rows[0].impuestos * 1 + rows[1].impuestos * 3) / 4) * 10000) / 10000);
  assert.equal(mini.plantsShareCanon("Puebla", "GT Puebla"), true);
  assert.equal(mini.plantsShareCanon("Tehuacan", "Tehuacán"), true);
  assert.equal(mini.plantsShareCanon("Queretaro", "Querétaro"), true);
  assert.equal(mini.plantsShareCanon("GTM Queretaro", "Querétaro"), true);
  assert.equal(mini.plantsShareCanon("San Luis", "GTM San Luis"), true);
  const overlaid = mini.overlayMiniRows(
    [{ empresa: "GTM San Luis", plant_code: "San Luis", ventaTon: 2 }],
    [{ plant_code: "GTM San Luis", financials: { margenKg: 5, comDescKg: -4.32, hgKg: -1, costoKg: 3, fleteKg: 1, hgDollar: 4, hgPct: 0.25, operativosImporte: 8, corporativosImporte: 2, impuestosFederalesImporte: 20 } }]
  );
  assert.equal(overlaid[0].comDesc, -4.32);
  assert.equal(overlaid[0].margen, 5);
});

test("no hay fila fija, ni lectura de XLSX, ni una consulta por planta", () => {
  assert.doesNotMatch(HELPER, /H48|AD48|F48|G48|Z48|fila 48|xlsx|exceljs|Math\.abs/);
  const loader = GRAFICA.slice(GRAFICA.indexOf("async function loadIgfDiarioAcumulado"), GRAFICA.indexOf("async function loadMarginDetail"));
  const loop = loader.slice(loader.indexOf("for (const plant"));
  assert.doesNotMatch(loop, /listMonth\(|descuentos_diarios/);
  assert.equal(loader.split("listMonthOverrides").length, 2);
  const routeStart = SERVER.indexOf('app.get("/api/dashboard/igf-diario-acumulado"');
  const route = SERVER.slice(routeStart, SERVER.indexOf('app.get("/api/dashboard/igf-diario-grafica"'));
  assert.equal(route.split("listMonth(").length, 2);
  assert.doesNotMatch(route, /for \(const plant/);
  assert.match(CLIENT, /expenseInputsFromComponentes/);
  assert.doesNotMatch(CLIENT.slice(CLIENT.indexOf("function applyDesgloseTotals"), CLIENT.indexOf("const CORP_MODAL_FIELDS")), /corporativos_total_desglose/);
});
