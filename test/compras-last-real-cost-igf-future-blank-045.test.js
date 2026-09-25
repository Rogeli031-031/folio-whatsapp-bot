"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const { buildComprasDailyEstimateContext } = require("../lib/compras-excel");
const igf = require("../lib/igf-diario-puebla");

const PROVIDERS = [
  { id: 1, nombre: "PEMEX TUXPAN" },
  { id: 2, nombre: "OTRO" },
];

function purchase(kg, importe) {
  return { kg, importe, costo_kg: kg > 0 && importe > 0 ? importe / kg : null };
}

function day(ymd, cells) {
  return {
    ymd,
    cells: {
      1: purchase(0, 0),
      2: purchase(0, 0),
      ...cells,
    },
    consolidado: { kg: 0, importe: 0, costo_kg: null },
    flete: { providers: {}, consolidado: { kg: 0, tarifa: null, importe: null } },
    hg_kilos: null,
  };
}

function payload(days) {
  return { year: 2026, month: 9, providers: PROVIDERS, grid: { days } };
}

test("el importe proyectado usa el último costo real del proveedor", () => {
  const kgProj = 38709.16666666667;
  const earlier = kgProj * 23 - 19370;
  const days = [
    day("2026-09-01", { 1: purchase(earlier, 1000), 2: purchase(10, 0) }),
    day("2026-09-23", { 1: purchase(19370, 236938.17) }),
    day("2026-09-24"),
    day("2026-09-25"),
  ];
  const ctx = buildComprasDailyEstimateContext(payload(days), "2026-09-24");
  const unit = 236938.17 / 19370;
  const d25 = ctx.byYmd.get("2026-09-25").providers[1];
  const d24 = ctx.byYmd.get("2026-09-24").providers[1];
  assert.equal(d25.kg, kgProj);
  assert.equal(d25.importe, kgProj * unit);
  assert.equal(d24.importe, kgProj * unit);
  assert.equal(d25.importe_estimated, true);
  assert.equal(ctx.byYmd.get("2026-09-25").providers[2].importe, null);

  const withCorte = [
    day("2026-09-01", { 1: purchase(230, 230) }),
    day("2026-09-24", { 1: purchase(100, 500) }),
    day("2026-09-25"),
  ];
  const next = buildComprasDailyEstimateContext(payload(withCorte), "2026-09-24");
  assert.equal(next.byYmd.get("2026-09-24").providers[1].importe, 500);
  assert.equal(next.byYmd.get("2026-09-25").providers[1].importe, (230 / 23) * 5);

  const none = buildComprasDailyEstimateContext(payload([
    day("2026-09-24"),
    day("2026-09-25"),
  ]), "2026-09-24");
  assert.equal(none.byYmd.get("2026-09-25").providers[1].kg, null);
  assert.equal(none.byYmd.get("2026-09-25").providers[1].importe, null);
});

test("IGF Diario deja vacíos los días posteriores al corte", async () => {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = "Puebla\nCASA";
  venta.getCell(1, 9).value = "Puebla\nCOMISIONISTA";
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = 1;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 19;
    compras.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(day + 5, 15).value = 10;
    compras.getCell(day + 5, 36).value = 1;
  }
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.equal(typeof ws.getCell(35, 2).value, "object");
  assert.equal(ws.getCell(36, 2).value, null);
  assert.equal(ws.getCell(36, 32).value, null);
  assert.equal(ws.getCell(36, 1).value instanceof Date, true);
  assert.match(String(ws.getCell(39, 2).value.formula), /B32:B35/);
  assert.doesNotMatch(String(ws.getCell(39, 2).value.formula), /B36/);
  assert.equal(ws.getCell(45, 2).value, null);
  assert.match(String(ws.getCell(47, 2).value.formula), /B39/);
  assert.doesNotMatch(String(ws.getCell(47, 2).value.formula), /B45/);
  const file = path.join(os.tmpdir(), "igf-045-future.xlsx");
  await wb.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  const re = again.getWorksheet("IGF Diario Puebla");
  assert.equal(re.getCell(36, 2).value, null);
  assert.equal(typeof re.getCell(35, 2).value, "object");
  assert.equal(re.getCell(3, 13).value, 1034293);
  assert.equal(re.getCell(3, 20).value, 2998518);
});
