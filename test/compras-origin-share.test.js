"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("../frontend-dashboard/node_modules/typescript");
const source = fs.readFileSync(require.resolve("../frontend-dashboard/lib/compras-origin-share.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsForTest = {};
new Function("exports", compiled)(exportsForTest);
const { comprasOriginShare } = exportsForTest;
const providers = [
  { id: 30, nombre: "TOMZA TEPEJI" },
  { id: 10, nombre: " PEMEX  TUXPAN " },
  { id: 20, nombre: "tomza tuxpan" },
];
const totals = (pemex, tomza, tepeji) => ({ providers: { 10: { kg: pemex }, 20: { kg: tomza }, 30: { kg: tepeji } }, consolidado: { kg: pemex + tomza + tepeji } });

test("agrupa ambos Tuxpan por nombre y calcula participación en kilos, no en importe", () => {
  const result = comprasOriginShare(providers, totals(426170, 23650, 429960));
  assert.equal(result.tuxpan.kg, 449820);
  assert.equal(result.tepeji.kg, 429960);
  assert.equal(result.tuxpan.percent.toFixed(2), "51.13");
  assert.ok(Math.abs(result.tuxpan.percent + result.tepeji.percent - 100) < 1e-10);
});
test("el total mensual usa kilos acumulados, no el promedio de porcentajes semanales", () => {
  const first = comprasOriginShare(providers, totals(100, 0, 0));
  const second = comprasOriginShare(providers, totals(0, 0, 900));
  const month = comprasOriginShare(providers, totals(100, 0, 900));
  assert.equal(first.tuxpan.percent, 100);
  assert.equal(second.tuxpan.percent, 0);
  assert.equal(month.tuxpan.percent, 10);
  assert.equal(month.tepeji.percent, 90);
});
test("sin compras no divide entre cero; un origen sin kilos conserva 0% si hay compras", () => {
  assert.deepEqual(comprasOriginShare(providers, totals(0, 0, 0)).tuxpan, { kg: 0, percent: null });
  assert.deepEqual(comprasOriginShare(providers, totals(0, 0, 100)).tuxpan, { kg: 0, percent: 0 });
});
test("otros proveedores forman parte del total sin clasificarse como Tuxpan o Tepeji", () => {
  const result = comprasOriginShare([...providers, { id: 40, nombre: "OTRO PROVEEDOR" }], {
    providers: { 10: { kg: 20 }, 30: { kg: 30 }, 40: { kg: 50 } }, consolidado: { kg: 100 },
  });
  assert.deepEqual(result.tuxpan, { kg: 20, percent: 20 });
  assert.deepEqual(result.tepeji, { kg: 30, percent: 30 });
});
