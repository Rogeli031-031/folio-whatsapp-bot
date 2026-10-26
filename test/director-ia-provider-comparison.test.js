"use strict";

const { it } = require("node:test");
const assert = require("node:assert/strict");
const semantic = require("../lib/director-ia-013-semantic");

const purchases = [
  { fecha: "2026-10-20", proveedor: "TOMZA TUXPAN", kg: 500, excel_kg: 200, importe: 2000 },
  { fecha: "2026-10-20", proveedor: "TOMZA TEPEJI", kg: 300, importe: 3000 },
  { fecha: "2026-10-20", proveedor: "PEMEX TUXPAN", kg: 400, importe: 4000 },
  { fecha: "2026-10-20", proveedor: "PEMEX", kg: 100, importe: 1000 },
  { fecha: "2026-10-20", proveedor: "NOTA DE CARGO", kg: 999, importe: 50 },
  { fecha: "2026-10-27", proveedor: "TOMZA TUXPAN", kg: 9000, importe: 90000 },
  { fecha: "2026-09-20", proveedor: "TOMZA TEPEJI", kg: 9000, importe: 90000 },
];

function ask(text, rows = purchases) {
  return semantic.turnDirectorIa013({ text, cutoffYmd: "2026-10-26", snapshot: { plant: "Planta de prueba", purchases: rows } });
}

it("desglosa ambos proveedores y divide por todos los kilos efectivos del periodo", () => {
  for (const text of [
    "cuanto compramos de tuxpan y cuanto de tepeji?",
    "cuanto compramos de tuxpan y tepeji en octubre y que porcentaje de cada uno?",
    "que porcentaje de compras de gas lp es de tepeji y de tuxpan",
  ]) {
    const got = ask(text);
    assert.equal(got.domain, "GAS_LP_PURCHASES");
    assert.match(got.answer, /Tuxpan \(TOMZA\): 200 kg \(20\.00%/);
    assert.match(got.answer, /Tepeji \(TOMZA\): 300 kg \(30\.00%/);
    assert.match(got.answer, /todos los proveedores: 1,000 kg/);
    assert.match(got.answer, /2026-10-01 al 2026-10-26/);
    assert.match(got.answer, /CONTROL DE COMPRAS/);
    assert.doesNotMatch(got.answer, /9,000|999 kg/);
  }
});

it("mantiene PEMEX TUXPAN separado y no duplica un proveedor mencionado dos veces", () => {
  const got = ask("compras de pemex tuxpan, tomza tuxpan y tepeji y tomza tepeji en octubre");
  assert.deepEqual(got.providerDimensions, ["PEMEX_TUXPAN", "TOMZA_TUXPAN", "TOMZA_TEPEJI"]);
  assert.match(got.answer, /PEMEX TUXPAN: 400 kg \(40\.00%/);
  assert.match(got.answer, /Tuxpan \(TOMZA\): 200 kg \(20\.00%/);
  assert.equal(got.answer.match(/Tepeji \(TOMZA\):/g).length, 1);
});

it("sin kilos totales no inventa un porcentaje y un proveedor ausente es cero sobre total positivo", () => {
  const empty = ask("compras de tuxpan y tepeji en octubre", []);
  assert.match(empty.answer, /porcentaje no disponible/);
  assert.doesNotMatch(empty.answer, /NaN|Infinity|0\.00%/);
  const absent = ask("compras de tuxpan y tepeji en octubre", [purchases[3]]);
  assert.match(absent.answer, /Tuxpan \(TOMZA\): 0 kg \(0\.00%/);
  assert.match(absent.answer, /todos los proveedores: 100 kg/);
});

it("respeta el rango al corte y preserva la consulta de proveedor único", () => {
  const range = ask("compras de tuxpan y tepeji del 20 al 31 de octubre");
  assert.match(range.answer, /2026-10-20 al 2026-10-26/);
  const single = ask("cuanto compramos de tepeji en octubre");
  assert.match(single.answer, /TOMZA_TEPEJI 300 kg/);
  assert.doesNotMatch(single.answer, /todos los proveedores/);
});
