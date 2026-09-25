"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const { buildComprasDailyEstimateContext, appendComprasWorksheet } = require("../lib/compras-excel");
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
    cells: { 1: purchase(0, 0), 2: purchase(0, 0), ...cells },
    consolidado: { kg: 0, importe: 0, costo_kg: null },
    flete: { providers: {}, consolidado: { kg: 0, tarifa: null, importe: null } },
    hg_kilos: null,
  };
}

test("el importe proyectado multiplica el último costo por la venta del día", async () => {
  const kgProj = 38709.16666666667;
  const earlier = kgProj * 23 - 19370;
  const unit = 236938.17 / 19370;
  const venta25 = kgProj;
  const venta26 = 449819 / unit;
  const days = [
    day("2026-09-01", { 1: purchase(earlier, 1000) }),
    day("2026-09-23", { 1: purchase(19370, 236938.17) }),
    day("2026-09-24"),
    day("2026-09-25"),
    day("2026-09-26"),
  ];
  const venta = {
    "2026-09-24": 1000,
    "2026-09-25": venta25,
    "2026-09-26": venta26,
  };
  const ctx = buildComprasDailyEstimateContext({ year: 2026, month: 9, providers: PROVIDERS, grid: { days } }, "2026-09-24", venta);
  const d23 = ctx.byYmd.get("2026-09-23").providers[1];
  const d24 = ctx.byYmd.get("2026-09-24").providers[1];
  const d25 = ctx.byYmd.get("2026-09-25").providers[1];
  const d26 = ctx.byYmd.get("2026-09-26").providers[1];
  assert.equal(d23.kg, 19370);
  assert.equal(d23.importe, 236938.17);
  assert.equal(d25.kg, kgProj);
  assert.equal(d26.kg, kgProj);
  assert.equal(d25.costo_kg, unit);
  assert.equal(d26.costo_kg, unit);
  assert.equal(d25.importe, unit * venta25);
  assert.equal(d26.importe, 449819);
  assert.notEqual(d25.importe, d26.importe);
  assert.equal(d24.importe, unit * 1000);
  assert.equal(ctx.byYmd.get("2026-09-25").providers[2].importe, null);

  const wb = new ExcelJS.Workbook();
  const rows = days.map((d) => ({ type: "day", ymd: d.ymd }));
  await appendComprasWorksheet(wb, {
    year: 2026,
    month: 9,
    providers: [PROVIDERS[0]],
    grid: { days, rows },
  }, { plantName: "Puebla", corteYmd: "2026-09-24", ventaKgByYmd: venta });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  const row25 = 9;
  const row26 = 10;
  assert.equal(ws.getCell(row25, 2).value, kgProj);
  assert.equal(ws.getCell(row26, 2).value, kgProj);
  assert.equal(ws.getCell(row25, 3).value, unit);
  assert.equal(ws.getCell(row26, 3).value, unit);
  assert.equal(ws.getCell(row25, 3).numFmt, "0.000");
  assert.equal(ws.getCell(row25, 4).value, unit * venta25);
  assert.equal(ws.getCell(row26, 4).value, 449819);
  assert.equal(ws.getCell(row26, 4).numFmt, "#,##0.00");
});

function plantBook(plant) {
  const wb = new ExcelJS.Workbook();
  igf.reserveSheet(wb, plant);
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = `${plant}\nCASA`;
  venta.getCell(1, 9).value = `${plant}\nCOMISIONISTA`;
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = plant === "Querétaro" ? 4 : 1;
    venta.getCell(day + 1, 9).value = 1;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = plant === "Querétaro" ? 21 : 19;
    compras.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(day + 5, 15).value = 10;
  }
  return wb;
}

test("IGF Diario de la planta exportada deja en blanco los días posteriores al corte", async () => {
  const puebla = plantBook("Puebla");
  const ws = igf.fillIgfDiarioPuebla(puebla, {
    year: 2026,
    month: 9,
    plantName: "Puebla",
    corteYmd: "2026-09-24",
    corporativos: 1034293,
    operativos: 2998518,
  });
  assert.equal(puebla.worksheets[0].name, "IGF Diario Puebla");
  assert.equal(ws.getCell(2, 1).value, "PLANTA PUEBLA");
  assert.equal(ws.getCell(36, 2).value, null);
  assert.equal(ws.getCell(36, 32).value, null);
  assert.equal(ws.getCell(3, 13).value, 1034293);
  assert.equal(ws.getCell(3, 20).value, 2998518);
  assert.match(String(ws.getCell(6, 2).value.formula), /\*1000/);

  const qro = plantBook("Querétaro");
  const q = igf.fillIgfDiarioPuebla(qro, {
    year: 2026,
    month: 9,
    plantName: "Querétaro",
    corteYmd: "2026-09-24",
    corporativos: 800,
    operativos: 900,
  });
  assert.equal(qro.worksheets[0].name, "IGF Diario Querétaro");
  assert.equal(q.getCell(2, 1).value, "PLANTA QUERÉTARO");
  assert.equal(q.getCell(36, 1).value instanceof Date, true);
  assert.equal(q.getCell(36, 2).value, null);
  assert.equal(q.getCell(36, 32).value, null);
  assert.equal(q.getCell(3, 13).value, 800);
  assert.match(String(q.getCell(6, 2).value.formula), /\*1000/);
  assert.match(String(q.getCell(6, 3).value.formula), /PRECIO/);

  const file = path.join(os.tmpdir(), "igf-046-qro.xlsx");
  await qro.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  assert.equal(again.worksheets[0].name, "IGF Diario Querétaro");
  assert.equal(again.worksheets[0].getCell(36, 2).value, null);
});
