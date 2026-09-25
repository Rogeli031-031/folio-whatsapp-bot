"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const { buildComprasDailyEstimateContext, appendComprasWorksheet } = require("../lib/compras-excel");
const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

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

function fold(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function igfSheets(wb) {
  return wb.worksheets.filter((ws) => fold(ws.name).startsWith("IGF DIARIO"));
}

test("el importe proyectado usa la venta del día y no los kilos de compra", async () => {
  const providers = [{ id: 1, nombre: "PEMEX TUXPAN" }, { id: 2, nombre: "OTRO" }];
  const kgProj = 38709.16666666667;
  const earlier = kgProj * 23 - 19370;
  const unit = 236938.17 / 19370;
  const venta25 = kgProj;
  const venta26 = 449819 / unit;
  const days = [
    day("2026-09-01", { 1: purchase(earlier, 1000), 2: purchase(10, 0) }),
    day("2026-09-23", { 1: purchase(19370, 236938.17) }),
    day("2026-09-24"),
    day("2026-09-25"),
    day("2026-09-26"),
  ];
  const venta = { "2026-09-24": 1000, "2026-09-25": venta25, "2026-09-26": venta26 };
  const ctx = buildComprasDailyEstimateContext({ year: 2026, month: 9, providers, grid: { days } }, "2026-09-24", venta);
  const d23 = ctx.byYmd.get("2026-09-23").providers[1];
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
  assert.equal(ctx.byYmd.get("2026-09-24").providers[1].importe, unit * 1000);
  assert.equal(ctx.byYmd.get("2026-09-25").providers[2].importe, null);

  const noSale = buildComprasDailyEstimateContext({ year: 2026, month: 9, providers, grid: { days } }, "2026-09-24", {});
  assert.equal(noSale.byYmd.get("2026-09-25").providers[1].kg, kgProj);
  assert.equal(noSale.byYmd.get("2026-09-25").providers[1].importe, null);

  const corteBuy = [
    day("2026-09-01", { 1: purchase(230, 230) }),
    day("2026-09-24", { 1: purchase(100, 500) }),
    day("2026-09-25"),
  ];
  const after = buildComprasDailyEstimateContext(
    { year: 2026, month: 9, providers, grid: { days: corteBuy } },
    "2026-09-24",
    { "2026-09-25": 10 }
  );
  assert.equal(after.byYmd.get("2026-09-24").providers[1].importe, 500);
  assert.equal(after.byYmd.get("2026-09-25").providers[1].importe, 50);
  assert.equal(after.byYmd.get("2026-09-25").providers[1].costo_kg, 5);

  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, {
    year: 2026,
    month: 9,
    providers: [providers[0]],
    grid: { days, rows: days.map((d) => ({ type: "day", ymd: d.ymd })) },
  }, { plantName: "Puebla", corteYmd: "2026-09-24", ventaKgByYmd: venta });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(ws.getCell(9, 3).value, unit);
  assert.equal(ws.getCell(10, 3).value, unit);
  assert.equal(ws.getCell(9, 4).value, unit * venta25);
  assert.equal(ws.getCell(10, 4).value, 449819);
});

function sources(wb, plant, ventaCasa, price) {
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = `${plant}\nCASA`;
  venta.getCell(1, 9).value = `${plant}\nCOMISIONISTA`;
  wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  for (let d = 1; d <= 30; d += 1) {
    venta.getCell(d + 1, 1).value = d;
    venta.getCell(d + 1, 8).value = ventaCasa;
    venta.getCell(d + 1, 9).value = 1;
    precio.getCell(d + 1, 1).value = new Date(Date.UTC(2026, 8, d));
    precio.getCell(d + 1, 2).value = price;
    compras.getCell(d + 5, 1).value = `${String(d).padStart(2, "0")}/09/2026`;
    compras.getCell(d + 5, 15).value = 10;
  }
}

function fillPlant(wb, code, human, ventaCasa, price, corp, oper) {
  igf.reserveSheet(wb, code);
  sources(wb, human, ventaCasa, price);
  return igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: code,
    humanName: human,
    plantEquivalent: (label) => forecast.plantsEquivalent(label, code),
    corteYmd: "2026-09-24",
    corporativos: corp,
    operativos: oper,
  });
}

test("Puebla, Querétaro y Acapulco tienen una sola hoja IGF de su planta", async () => {
  const puebla = new ExcelJS.Workbook();
  const p = fillPlant(puebla, "Puebla", "Puebla", 1, 19, 1034293, 2998518);
  assert.equal(igfSheets(puebla).length, 1);
  assert.equal(puebla.worksheets[0].name, "IGF Diario Puebla");
  assert.equal(p.getCell(2, 1).value, "PLANTA PUEBLA");
  assert.equal(p.getCell(3, 13).value, 1034293);
  assert.equal(p.getCell(3, 20).value, 2998518);
  assert.match(String(p.getCell(6, 2).value.formula), /H2/);
  assert.equal(p.getCell(36, 2).value, null);
  assert.equal(p.getCell(36, 32).value, null);

  const qro = new ExcelJS.Workbook();
  igf.reserveSheet(qro, "Queretaro");
  sources(qro, "Querétaro", 4, 21);
  const q = igf.fillIgfDiarioPuebla(qro, {
    year: 2026,
    month: 9,
    sheetLabel: "Querétaro",
    humanName: "Querétaro",
    plantEquivalent: (label) => forecast.plantsEquivalent(label, "Queretaro"),
    corteYmd: "2026-09-24",
    corporativos: 800,
    operativos: 900,
  });
  assert.equal(igfSheets(qro).length, 1);
  assert.equal(qro.worksheets[0].name, "IGF Diario Queretaro");
  assert.equal(q.getCell(2, 1).value, "PLANTA QUERÉTARO");
  assert.equal(q.getCell(3, 13).value, 800);
  assert.equal(q.getCell(3, 20).value, 900);
  assert.match(String(q.getCell(6, 2).value.formula), /H2/);
  assert.doesNotMatch(String(q.getCell(6, 2).value.formula), /PUEBLA/);
  assert.match(String(q.getCell(6, 3).value.formula), /PRECIO/);
  assert.equal(q.getCell(36, 1).value instanceof Date, true);
  assert.equal(q.getCell(36, 2).value, null);

  const file = path.join(os.tmpdir(), "igf-048-qro.xlsx");
  await qro.xlsx.writeFile(file);
  const again = new ExcelJS.Workbook();
  await again.xlsx.readFile(file);
  fs.unlinkSync(file);
  assert.equal(igfSheets(again).length, 1);
  assert.equal(again.worksheets[0].name, "IGF Diario Queretaro");
  assert.equal(again.worksheets[0].getCell(2, 1).value, "PLANTA QUERÉTARO");
  assert.equal(again.worksheets[0].getCell(36, 2).value, null);

  const aca = new ExcelJS.Workbook();
  const a = fillPlant(aca, "Acapulco", "Acapulco", 7, 15, 11, 22);
  assert.equal(igfSheets(aca).length, 1);
  assert.equal(aca.worksheets[0].name, "IGF Diario Acapulco");
  assert.equal(a.getCell(2, 1).value, "PLANTA ACAPULCO");
  assert.equal(a.getCell(3, 13).value, 11);
  assert.match(String(a.getCell(6, 2).value.formula), /H2/);
  assert.doesNotMatch(String(a.getCell(6, 2).value.formula), /PUEBLA|QUERETARO/);
});

test("sin planta el llenado de Puebla no inventa otra hoja", () => {
  const wb = new ExcelJS.Workbook();
  sources(wb, "Puebla", 1, 19);
  const ws = igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 9, corporativos: 1, operativos: 2 });
  assert.equal(igfSheets(wb).length, 1);
  assert.equal(ws.name, "IGF Diario Puebla");
  assert.equal(ws.getCell(2, 1).value, "PLANTA PUEBLA");
});
