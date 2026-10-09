"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const descuentos = require("../lib/igf-diario-descuentos-columna");

const ARTURO = "ARTURO ANDRADE SANCHEZ";

function buy(cliente, fecha, perKg) {
  return { cliente, fecha, kg: 1000, monto: perKg * 1000 };
}

function lineOf(cliente, previous, current) {
  const lines = descuentos.discountLines([
    buy(cliente, "2026-09-01", previous),
    buy(cliente, "2026-10-06", current),
  ], "2026-10-06");
  return lines;
}

function assertMove(cliente, previous, current, direction, deltaText, color) {
  const lines = lineOf(cliente, previous, current);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].up, direction === "Subió");
  const text = descuentos.plain(lines);
  assert.match(text, new RegExp(`${direction} su comisión`));
  assert.ok(text.endsWith(`= ${deltaText}`));
  assert.doesNotMatch(text, /= \+\$/);
  assert.doesNotMatch(text, /= -\$/);
  const cell = descuentos.cellValue(lines);
  assert.equal(cell.richText[1].text, deltaText);
  assert.equal(cell.richText[1].font.color.argb, color);
  assert.equal(cell.richText[0].font, undefined);
  assert.match(cell.richText[0].text, /de /);
  return text;
}

test("ARTURO baja de magnitud 4.630 a 4.352 y el delta verde no lleva signo", () => {
  const text = assertMove(ARTURO, -4.63, -4.352, "Bajó", "$0.278/kg", descuentos.GREEN);
  assert.equal(
    text,
    `${ARTURO} — Bajó su comisión respecto a su última compra de -$4.630/kg a -$4.352/kg = $0.278/kg`
  );
  assert.doesNotMatch(text, /Subió su comisión/);
  assert.doesNotMatch(text, /\+\$0\.278\/kg/);
  assert.doesNotMatch(text, /-\$0\.278\/kg/);
});

test("la magnitud decide Subió o Bajó en negativos, positivos y cambio de signo", () => {
  assertMove("CASO UNO", -3, -4, "Subió", "$1.000/kg", descuentos.RED);
  assertMove("CASO DOS", -2.5, -2, "Bajó", "$0.500/kg", descuentos.GREEN);
  assertMove("CASO CUATRO", -4.352, -4.63, "Subió", "$0.278/kg", descuentos.RED);
  assertMove("CASO CINCO", 3, 4, "Subió", "$1.000/kg", descuentos.RED);
  assertMove("CASO SEIS", 4, 3, "Bajó", "$1.000/kg", descuentos.GREEN);
  assertMove("CASO SIETE", -3, 4, "Subió", "$1.000/kg", descuentos.RED);
  assertMove("CASO OCHO", 4, -3, "Bajó", "$1.000/kg", descuentos.GREEN);
  const down = lineOf("CASO MENOS", -4, -3);
  assert.equal(down[0].up, false);
  assert.equal(descuentos.cellValue(down).richText[1].text, "$1.000/kg");
  assert.equal(descuentos.cellValue(down).richText[1].font.color.argb, descuentos.GREEN);
});

test("la misma magnitud con signo distinto no se lista", () => {
  assert.deepEqual(lineOf("CASO NUEVE", -3, 3), []);
});

test("el rich text de ARTURO conserva el verde sin signo al reabrir el XLSX", async () => {
  const lines = lineOf(ARTURO, -4.63, -4.352);
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("IGF").getCell("AK6").value = descuentos.cellValue(lines);
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(await wb.xlsx.writeBuffer());
  const value = again.getWorksheet("IGF").getCell("AK6").value;
  const joined = value.richText.map((part) => part.text).join("");
  assert.match(joined, /Bajó su comisión/);
  assert.match(joined, /de -\$4\.630\/kg a -\$4\.352\/kg/);
  assert.doesNotMatch(joined, /Subió su comisión/);
  assert.doesNotMatch(joined, /\+\$0\.278\/kg/);
  assert.doesNotMatch(joined, /-\$0\.278\/kg/);
  const colored = value.richText.find((part) => part.text === "$0.278/kg");
  assert.equal(colored.font.color.argb, descuentos.GREEN);
  for (const part of value.richText) {
    if (part !== colored) assert.equal(part.font && part.font.color, undefined);
  }
});
