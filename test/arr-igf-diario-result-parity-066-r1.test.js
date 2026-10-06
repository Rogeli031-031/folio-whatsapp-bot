"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const mini = require("../frontend-dashboard/lib/igf-october-mini");
const financials = require("../lib/igf-diario-monthly-financials");

const MINI = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "igf-october-mini.js"), "utf8");
const ARR = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "app", "arr", "ArrClient.tsx"), "utf8");
const GRAFICA = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-expense-excel.js"), "utf8");

function plant(fin, legacyTon) {
  return mini.applyFinancialsToMiniRow({ empresa: "Planta", plant_code: "Planta", ventaTon: legacyTon }, fin);
}

test("octubre usa la venta TOTAL MES y septiembre conserva la venta anterior", () => {
  const row = plant({
    ventaTon: 1.164953,
    margenKg: 6,
    comDescKg: -1,
    hgKg: -0.5,
    operativosImporte: 10,
    corporativosImporte: 4,
    impuestosFederalesImporte: 2,
  }, 9);
  assert.equal(row.ventaTon, 1.164953);
  assert.notEqual(row.ventaTon, 9);
  assert.match(MINI, /const ventaTon = finite\(fin && fin\.ventaTon\)/);
  assert.doesNotMatch(MINI.slice(MINI.indexOf("function applyFinancialsToMiniRow"), MINI.indexOf("function blankOctoberMini")), /row && row\.ventaTon/);
  const october = ARR.slice(ARR.indexOf("if (periodOctober(periodKey))"), ARR.indexOf("margenKg: forecastRow"));
  const legacy = ARR.slice(ARR.indexOf("margenKg: forecastRow"), ARR.indexOf("function periodoLabel"));
  assert.match(october, /ventaTon: miniRow\?\.ventaTon/);
  assert.match(october, /rentabilidadImporte: miniRow\?\.resultadoFinalImporte/);
  assert.doesNotMatch(october, /forecastRow\?\.venta_ton/);
  assert.match(legacy, /forecastRow\?\.venta_ton/);
  assert.equal(financials.usesOctoberContract(2026, 9), false);
  assert.equal(financials.usesOctoberContract(2026, 10), true);
});

test("el resultado resta los impuestos federales una vez y equivale a AG", () => {
  const ventaKg = 250000.25;
  const ventaTon = ventaKg / 1000;
  const margenKg = 6.391234;
  const comDescKg = -4.271111;
  const hgKg = -0.412345;
  const operativos = 1620.29;
  const corporativos = 900.33 + 144.15;
  const impuestosFederales = 422.07;
  const fin = {
    ventaTon,
    ventaKg,
    margenKg,
    comDescKg,
    hgKg,
    operativosImporte: operativos,
    corporativosImporte: corporativos,
    impuestosFederalesImporte: impuestosFederales,
  };
  const row = plant(fin, 1);
  const ingreso = Math.round((margenKg + comDescKg - hgKg) * ventaTon * 1000);
  const ag = ingreso - operativos - corporativos - impuestosFederales;
  assert.equal(row.ventaTon, ventaTon);
  assert.equal(row.ingreso, ingreso);
  assert.equal(row.impuestos, impuestosFederales / (ventaTon * 1000));
  assert.equal(row.corporativos, corporativos);
  assert.equal(row.gasto, operativos + corporativos);
  assert.notEqual(row.gasto, operativos + corporativos + impuestosFederales);
  assert.equal(row.utilOperImporte, ingreso - operativos);
  assert.equal(row.resultadoFinalImporte, ag);
  assert.equal(row.resultadoFinalImporte, mini.closeResultadoFinal(ingreso, operativos, corporativos, impuestosFederales));
  assert.notEqual(row.resultadoFinalImporte, ingreso - operativos - corporativos);
  const rounded = Math.round((6.39 + -4.27 - -0.41) * ventaTon * 1000) - operativos - corporativos - impuestosFederales;
  assert.notEqual(row.resultadoFinalImporte, rounded);
});

test("cero es válido y un dato faltante deja el resultado vacío", () => {
  const base = {
    ventaTon: 2,
    margenKg: 5,
    comDescKg: -1,
    hgKg: 0,
    operativosImporte: 8,
    corporativosImporte: 3,
    impuestosFederalesImporte: 0,
  };
  const zeroTax = plant(base, 4);
  assert.equal(zeroTax.impuestos, 0);
  assert.equal(zeroTax.resultadoFinalImporte, zeroTax.ingreso - 8 - 3 - 0);
  assert.equal(plant({ ...base, impuestosFederalesImporte: null }, 4).resultadoFinalImporte, null);
  assert.equal(plant({ ...base, ventaTon: null }, 4).ventaTon, null);
  assert.equal(plant({ ...base, ventaTon: null }, 4).resultadoFinalImporte, null);
  assert.equal(plant({ ...base, operativosImporte: null }, 4).resultadoFinalImporte, null);
  assert.equal(plant({ ...base, corporativosImporte: null }, 4).resultadoFinalImporte, null);
});

test("la zona suma ventas y resultados corregidos", () => {
  const left = plant({
    ventaTon: 1.5, margenKg: 4, comDescKg: -1, hgKg: -0.2,
    operativosImporte: 10, corporativosImporte: 5, impuestosFederalesImporte: 3,
  }, 8);
  const right = plant({
    ventaTon: 2.5, margenKg: 4, comDescKg: -1, hgKg: -0.2,
    operativosImporte: 20, corporativosImporte: 7, impuestosFederalesImporte: 4,
  }, 8);
  const zona = mini.zonaFromPlantRows([left, right]);
  assert.equal(zona.ventaTon, 4);
  assert.equal(zona.resultadoFinalImporte, left.resultadoFinalImporte + right.resultadoFinalImporte);
  const gap = mini.zonaFromPlantRows([left, { ...right, resultadoFinalImporte: null }]);
  assert.equal(gap.resultadoFinalImporte, null);
});

test("ARR sin simulación lee la mini y el producto no inventa la fila ni el Excel", () => {
  const october = ARR.slice(ARR.indexOf("if (periodOctober(periodKey))"), ARR.indexOf("margenKg: forecastRow"));
  assert.match(october, /ventaTon: miniRow\?\.ventaTon/);
  assert.match(october, /rentabilidadImporte: miniRow\?\.resultadoFinalImporte/);
  assert.match(ARR, /return Math\.round\(sumIng - gastoImporte\)/);
  assert.doesNotMatch(MINI, /1164953|201192|H48|AD48|xlsx|exceljs/);
  assert.match(EXCEL, /J\$\{r\}\+K\$\{r\}\+L\$\{r\}/);
  const loader = GRAFICA.slice(GRAFICA.indexOf("async function loadIgfDiarioAcumulado"), GRAFICA.indexOf("async function loadMarginDetail"));
  assert.equal(loader.split("listMonthOverrides").length, 2);
  assert.doesNotMatch(loader.slice(loader.indexOf("for (const plant")), /listMonth\(/);
  const route = SERVER.slice(SERVER.indexOf('app.get("/api/dashboard/igf-diario-acumulado"'), SERVER.indexOf('app.get("/api/dashboard/igf-diario-grafica"'));
  assert.equal(route.split("listMonth(").length, 2);
});
