"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const compras = require("../lib/compras-dashboard");
const { buildComprasWorkbook, controlComprasLayout } = require("../lib/compras-excel");

function fixture() {
  const providers = [
    { id: 9, nombre: "TOMZA TEPEJI" },
    { id: 4, nombre: " PEMEX  TUXPAN " },
    { id: 7, nombre: "tomza tuxpan" },
    { id: 2, nombre: "NOTA DE CARGO" },
  ];
  const purchases = [["2026-10-02", 9, 70], ["2026-10-02", 4, 10], ["2026-10-03", 7, 20], ["2026-10-05", 4, 900]]
    .map(([fecha, proveedor_id, kg], i) => ({ id: i + 1, fecha, proveedor_id, kg, importe: kg * 10 }));
  const grid = compras.aggregatePurchases(purchases, providers, 2026, 10);
  return { year: 2026, month: 10, providers, grid };
}
const build = (payload = fixture(), corteYmd = "2026-11-01") => buildComprasWorkbook(payload, { plantName: "Prueba", corteYmd });
const layout = controlComprasLayout(3);

test("cada semana y mes tienen porcentaje grande y kilos debajo, conservando flete", async () => {
  const wb = await build();
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(layout.fleteConsStart, 35);
  assert.equal(layout.fleteTarifaCol, 36);
  assert.equal(ws.getCell(4, layout.tuxpanCol).value, "TUXPAN");
  assert.equal(ws.getCell(4, layout.tepejiCol).value, "TEPEJI");
  assert.equal(ws.getCell(6, layout.tuxpanCol).value.result, 0.3);
  assert.equal(ws.getCell(8, layout.tuxpanCol).value.result, 30);
  assert.equal(ws.getCell(6, layout.tepejiCol).value.result, 0.7);
  assert.equal(ws.getCell(8, layout.tepejiCol).value.result, 70);
  assert.ok(ws.getCell(6, layout.tuxpanCol).font.size > ws.getCell(8, layout.tuxpanCol).font.size);
  assert.match(ws.getCell(8, layout.tuxpanCol).numFmt, /kg/);
  assert.equal(ws.getCell(9, 1).value, "Semana 1");
  assert.match(ws.getCell(8, layout.tuxpanCol).value.formula, /SUM\(F9,J9\)/);
  assert.match(ws.getCell(6, layout.tuxpanCol).value.formula, /AM8\/O9/);
  const month = ws.getColumn(1).values.findIndex((value) => value === "TOTAL MES");
  assert.equal(ws.getCell(month, layout.tuxpanCol).value.result, 0.93);
  assert.equal(ws.getCell(month + 1, layout.tuxpanCol).value.result, 930);
  assert.equal(ws.getCell(month, layout.tepejiCol).value.result, 0.07);
  assert.equal(ws.getCell(month + 1, layout.tepejiCol).value.result, 70);
});

test("semana sin compras no divide entre cero y un origen ausente queda en 0%", async () => {
  const ws = (await build()).getWorksheet("CONTROL DE COMPRAS");
  assert.equal(ws.getCell(11, layout.tepejiCol).result, 0);
  assert.equal(ws.getCell(20, layout.tuxpanCol).value.result, "—");
  assert.equal(ws.getCell(24, layout.tuxpanCol).result, 0);
});

test("la participación incluye los kilos estimados que ya muestra el Excel", async () => {
  const payload = fixture();
  const ws = (await build(payload, "2026-10-04")).getWorksheet("CONTROL DE COMPRAS");
  const month = ws.getColumn(1).values.findIndex((value) => value === "TOTAL MES");
  const tuxpan = Number(ws.getCell(month, layout.providerStarts[1]).value) + Number(ws.getCell(month, layout.providerStarts[2]).value);
  const tepeji = Number(ws.getCell(month, layout.providerStarts[0]).value);
  assert.equal(ws.getCell(month + 1, layout.tuxpanCol).value.result, tuxpan);
  assert.equal(ws.getCell(month + 1, layout.tepejiCol).value.result, tepeji);
  assert.ok(Math.abs(ws.getCell(month, layout.tuxpanCol).result - tuxpan / (tuxpan + tepeji)) < 1e-12);
});

test("el xlsx serializado conserva fórmulas, resultados, combinaciones y tamaños", async () => {
  const buffer = await (await build()).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(ws.getCell(6, layout.tuxpanCol).value.result, 0.3);
  assert.equal(ws.getCell(8, layout.tuxpanCol).value.result, 30);
  assert.equal(ws.getCell(7, layout.tuxpanCol).master.address, ws.getCell(6, layout.tuxpanCol).address);
  assert.equal(ws.getCell(6, layout.tuxpanCol).font.size, 18);
  assert.equal(ws.getCell(8, layout.tuxpanCol).font.size, 10);
});
