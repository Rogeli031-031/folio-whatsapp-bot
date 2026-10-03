"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const { totalMesMarginAndHg } = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");
const compras = require("../lib/compras-dashboard");
const { appendComprasWorksheet } = require("../lib/compras-excel");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const PUEBLA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-puebla.js"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const DASH = fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "compras-excel.js"), "utf8");
const YELLOW = "FFFFFF00";
const PROVIDERS = [
  { id: 1, nombre: "PEMEX TUXPAN" },
  { id: 2, nombre: "TOMZA TUXPAN" },
  { id: 3, nombre: "TOMZA TEPEJI" },
];

function dayRow(ymd, kg, importe, tarifa) {
  const cells = {
    1: { kg, importe, costo_kg: kg > 0 ? importe / kg : null },
    2: { kg: 0, importe: 0, costo_kg: null },
    3: { kg: 0, importe: 0, costo_kg: null },
  };
  const fleteProviders = {};
  for (const p of PROVIDERS) {
    const pkg = cells[p.id].kg;
    fleteProviders[p.id] = {
      kg: pkg,
      tarifa,
      importe: tarifa == null || pkg == null ? null : Math.round(pkg * tarifa * 100) / 100,
    };
  }
  return {
    ymd,
    captured: kg > 0,
    cells,
    consolidado: { kg, importe, costo_kg: kg > 0 ? importe / kg : null },
    flete: {
      providers: fleteProviders,
      consolidado: {
        kg,
        tarifa: kg > 0 ? tarifa : null,
        importe: kg > 0 && tarifa != null ? Math.round(kg * tarifa * 100) / 100 : null,
        incomplete: false,
      },
    },
    hg_kilos: null,
  };
}

function sheetPayload(days, extra) {
  return {
    year: 2026,
    month: 10,
    providers: PROVIDERS,
    tarifas_flete: PROVIDERS.map((p) => ({ proveedor_id: p.id, tarifa: 0.8 })),
    costo_kg_anterior: null,
    tarifa_consolidada_anterior: null,
    ...extra,
    grid: {
      days,
      weeks: [],
      month: { providers: {}, consolidado: { kg: 0, importe: 0, costo_kg: null }, flete: { providers: {}, consolidado: { tarifa: null } } },
      rows: days.map((d) => ({ type: "day", ymd: d.ymd })),
    },
  };
}

async function buildSheet(payload) {
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payload, { plantName: "Acapulco", corteYmd: "2026-10-20" });
  const buf = await wb.xlsx.writeBuffer();
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(buf);
  return again.getWorksheet("CONTROL DE COMPRAS");
}

function rowOf(ws, ymd) {
  const [yy, mm, dd] = ymd.split("-");
  const label = `${dd}/${mm}/${yy}`;
  for (let r = 6; r < 80; r += 1) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  throw new Error(`sin fila ${label}`);
}

function lastTarifaCol(ws) {
  let col = 0;
  for (let c = 1; c <= 80; c += 1) {
    if (String(ws.getCell(5, c).value || "") === "TARIFA") col = c;
  }
  return col;
}

test("Forecast conserva el mini original y el selector ofrece los dos modos", () => {
  assert.match(CLIENT, /Forecast\s*<\/button>/);
  assert.match(CLIENT, /IGF Diario acumulado\s*<\/button>/);
  assert.match(CLIENT, /setIgfTableMode\("forecast"\)/);
  assert.match(CLIENT, /setIgfTableMode\("igf_diario"\)/);
  assert.match(CLIENT, /igfTableMode === "igf_diario" && !acumuladoLoading && !acumuladoError && acumuladoMissing\.length === 0 && acumuladoByPlant/);
  assert.match(CLIENT, /IGFDiario/);
  assert.doesNotMatch(CLIENT, /H48|Y48/);
  assert.doesNotMatch(PUEBLA, /H48|Y48/);
  const original = {
    rows: [{ empresa: "Acapulco", plant_code: "Acapulco", ventaTon: 10, margen: 1.25, comDesc: 0.2, impuestos: 0.1, hgKg: 0.4, ingreso: 10500, operativos: 1000, corporativos: 500, gasto: 1500, utilOperImporte: 9500, resultadoFinalImporte: 9000 }],
    zona: { empresa: "Zona Provincia", margen: 1.25 },
  };
  const next = forecast.applyIgfDiarioAcumuladoMini(original, {});
  assert.equal(next.rows[0].margen, 1.25);
  assert.equal(next.rows[0].hgKg, 0.4);
  assert.equal(next.rows[0].ingreso, 10500);
  assert.equal(original.rows[0].margen, 1.25);
});

test("Margen es H ponderado de TOTAL MES y no una fila fija", () => {
  assert.match(PUEBLA, /function totalMesMarginAndHg/);
  assert.match(PUEBLA, /ws\.getCell\(r, 1\)\.value = "TOTAL MES"/);
  assert.match(GRAFICA, /totalMesMarginAndHg/);
  const out = totalMesMarginAndHg([
    { ventaKg: 1000, margen: 8, hgKg: 0.5 },
    { ventaKg: null, margen: 99, hgKg: 9 },
    { ventaKg: 3000, margen: 9.32, hgKg: 0.6466666667 },
  ]);
  assert.equal(Math.round(out.margen * 100) / 100, 8.99);
  assert.equal(out.y == null, false);
});

test("HG es el Y ponderado de TOTAL MES con signo cambiado", () => {
  const out = totalMesMarginAndHg([
    { ventaKg: 1000, margen: 8, hgKg: 0.5 },
    { ventaKg: 1000, margen: 10, hgKg: 0.72 },
  ]);
  assert.equal(Math.round(out.y * 100) / 100, 0.61);
  assert.equal(Math.round(out.hg * 100) / 100, -0.61);
});

test("Zona Provincia se recalcula con los Margen y HG de las plantas y el modo es reversible", () => {
  const mini = {
    rows: [
      { empresa: "Acapulco", plant_code: "Acapulco", ventaTon: 10, margen: 1, comDesc: 0.2, impuestos: 0, hgKg: 0.4, ingreso: 1, operativos: 100, corporativos: 50, gasto: 150, utilOperImporte: 1, resultadoFinalImporte: 1 },
      { empresa: "Puebla", plant_code: "Puebla", ventaTon: 30, margen: 2, comDesc: 0.1, impuestos: 0, hgKg: 0.2, ingreso: 1, operativos: 300, corporativos: 90, gasto: 390, utilOperImporte: 1, resultadoFinalImporte: 1 },
    ],
    zona: { empresa: "Zona Provincia", margen: 1, hgKg: 0.4, ingreso: 1 },
  };
  const next = forecast.applyIgfDiarioAcumuladoMini(mini, {
    Acapulco: { margen: 8.99, hg: -0.61 },
    Puebla: { margen: 4, hg: -1 },
  });
  assert.equal(next.rows[0].margen, 8.99);
  assert.equal(next.rows[0].hgKg, -0.61);
  assert.equal(next.rows[0].ingreso, Math.round((8.99 + 0.2 - (-0.61)) * 10 * 1000));
  assert.equal(next.rows[0].operativos, 100);
  assert.equal(next.rows[0].utilOperImporte, next.rows[0].ingreso - 100);
  assert.equal(next.rows[0].resultadoFinalImporte, next.rows[0].utilOperImporte - 50);
  const zonaMargen = Math.round(((8.99 * 10 + 4 * 30) / 40) * 10000) / 10000;
  assert.equal(next.zona.margen, zonaMargen);
  assert.equal(next.zona.ingreso, next.rows[0].ingreso + next.rows[1].ingreso);
  assert.notEqual(next.zona.margen, mini.zona.margen);
  const back = forecast.applyIgfDiarioAcumuladoMini(mini, {});
  assert.equal(back.rows[0].margen, 1);
  assert.equal(back.rows[0].ingreso, 1);
  assert.equal(mini.rows[0].margen, 1);
});

test("TARIFA día 1 hereda el consolidado histórico y no una tarifa suelta", () => {
  const rows = [
    { fecha: "2026-08-15", proveedor_id: 1, kg: 100, importe: 1000 },
    { fecha: "2026-08-15", proveedor_id: 2, kg: 100, importe: 1000 },
    { fecha: "2026-09-30", proveedor_id: 1, kg: 100, importe: 1100 },
  ];
  const tarifas = [
    { proveedor_id: 1, year: 2026, month: 8, tarifa: 1 },
    { proveedor_id: 2, year: 2026, month: 8, tarifa: 2 },
  ];
  assert.equal(compras.latestConsolidatedTarifaFromHistory(rows, tarifas), 1.5);
  const later = compras.latestConsolidatedTarifaFromHistory(rows, [
    ...tarifas,
    { proveedor_id: 1, year: 2026, month: 9, tarifa: 4 },
  ]);
  assert.equal(later, 4);
  assert.equal(compras.latestConsolidatedTarifaFromHistory([], tarifas), null);
  assert.match(DASH, /fecha < \$2::date/);
  assert.equal(/INSERT[\s\S]{0,80}tarifa_consolidada_anterior/.test(DASH), false);
  const fn = EXCEL.slice(EXCEL.indexOf("function applyDayOneTarifaFallback"), EXCEL.indexOf("function applyDayOneTarifaFallback") + 500);
  assert.match(fn, /fleteTarifaCol/);
  assert.doesNotMatch(fn, /day2|AJ8|AJ/);
});

test("sin histórico la TARIFA del día 1 queda vacía y el dato propio prevalece", async () => {
  const empty = await buildSheet(sheetPayload([
    dayRow("2026-10-01", 0, 0, null),
    dayRow("2026-10-02", 1000, 11000, 0.9),
  ]));
  const col = lastTarifaCol(empty);
  assert.ok(col > 0);
  const r1 = rowOf(empty, "2026-10-01");
  const formula = empty.getCell(r1, col).value;
  assert.equal(formula && formula.formula ? String(formula.formula).includes('""') : false, true);
  assert.notEqual(empty.getCell(r1, col).value, 0);

  const inherited = await buildSheet(sheetPayload([
    dayRow("2026-10-01", 0, 0, null),
    dayRow("2026-10-02", 1000, 11000, 0.9),
  ], { tarifa_consolidada_anterior: 1.5 }));
  const inhCol = lastTarifaCol(inherited);
  const inhRow = rowOf(inherited, "2026-10-01");
  assert.equal(inherited.getCell(inhRow, inhCol).value, 1.5);
  assert.equal(inherited.getCell(inhRow, inhCol).fill.fgColor.argb, YELLOW);
  assert.notEqual(inherited.getCell(inhRow, inhCol).value, 0.9);

  const own = await buildSheet(sheetPayload([
    dayRow("2026-10-01", 800, 8800, 0.7),
  ], { tarifa_consolidada_anterior: 1.5 }));
  const ownCol = lastTarifaCol(own);
  const ownRow = rowOf(own, "2026-10-01");
  const ownValue = own.getCell(ownRow, ownCol).value;
  assert.equal(Boolean(ownValue && ownValue.formula), true);
  assert.notEqual(ownValue, 1.5);
});
