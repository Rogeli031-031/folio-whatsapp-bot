"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const ExcelJS = require("exceljs");

const {
  appendComprasWorksheet,
  buildComprasWorkbook,
  buildComprasDailyEstimateContext,
  ESTIMATED_BLUE,
  blockStarts,
} = require("../lib/compras-excel");
const forecast = require("../lib/dashboard-arr-forecast");

const PROVIDERS = [
  { id: 1, nombre: "PEMEX TUXPAN" },
  { id: 2, nombre: "TOMZA TUXPAN" },
  { id: 3, nombre: "TOMZA TEPEJI" },
];

function purchase(kg, importe) {
  return { kg, importe, costo_kg: kg > 0 ? importe / kg : null };
}

function day(ymd, opts = {}) {
  const cells = {
    1: purchase(0, 0),
    2: purchase(0, 0),
    3: purchase(0, 0),
  };
  if (opts.p1) cells[1] = purchase(opts.p1[0], opts.p1[1]);
  if (opts.p2) cells[2] = purchase(opts.p2[0], opts.p2[1]);
  if (opts.p3) cells[3] = purchase(opts.p3[0], opts.p3[1]);
  const fleteProviders = {};
  for (const p of PROVIDERS) {
    fleteProviders[p.id] = { kg: cells[p.id].kg, tarifa: 1 + p.id / 10, importe: null };
  }
  const row = {
    ymd,
    captured: Boolean(opts.captured),
    cells,
    consolidado: { kg: 130, importe: 1120, costo_kg: 1120 / 130 },
    flete: { providers: fleteProviders, consolidado: { kg: 130, tarifa: 1.2, importe: 156 } },
    hg_kilos: opts.hg === undefined ? null : opts.hg,
  };
  if (opts.t !== undefined) row.hg_importe_efectivo = opts.t;
  return row;
}

function payloadFrom(days) {
  return {
    year: 2026,
    month: 9,
    providers: PROVIDERS,
    tarifas_flete: PROVIDERS.map((p) => ({ proveedor_id: p.id, tarifa: 1 + p.id / 10 })),
    grid: {
      days,
      weeks: [{ week: 1, ymds: days.map((d) => d.ymd), providers: {}, consolidado: { kg: 0, importe: 0, costo_kg: null }, flete: { providers: {}, consolidado: { tarifa: 1.2 } } }],
      month: { providers: {}, consolidado: { kg: 0, importe: 0, costo_kg: null }, flete: { providers: {}, consolidado: { tarifa: 1.2 } } },
      rows: days.map((d) => ({ type: "day", ymd: d.ymd })).concat([{ type: "week", week: 1, ymds: days.map((d) => d.ymd) }]),
    },
  };
}

function sampleDays() {
  return [
    day("2026-09-01", { p1: [100, 1000], p2: [10, 40], p3: [20, 80], hg: 10, t: -100, captured: true }),
    day("2026-09-02", { p1: [200, 3000], hg: -5, t: -50, captured: true }),
    day("2026-09-03"),
    day("2026-09-04", { p1: [400, 8000], hg: 0, t: 0, captured: true }),
    day("2026-09-05"),
  ];
}

function slot(ctx, ymd, id) {
  return ctx.byYmd.get(ymd).providers[id];
}

function fillOf(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function formulaOf(cell) {
  return cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

test("A–F) el promedio usa solo reales anteriores", () => {
  const ctx = buildComprasDailyEstimateContext(payloadFrom(sampleDays()));
  assert.equal(slot(ctx, "2026-09-03", 1).kg, 150);
  assert.equal(slot(ctx, "2026-09-03", 1).kg_estimated, true);
  assert.equal(slot(ctx, "2026-09-05", 1).kg, (100 + 200 + 400) / 3);
  assert.notEqual(slot(ctx, "2026-09-05", 1).kg, (100 + 200 + 150 + 400) / 4);
  assert.equal(slot(ctx, "2026-09-03", 2).kg, 10);
  assert.equal(ctx.byYmd.get("2026-09-03").hg.kilos, 2.5);
  assert.equal(ctx.byYmd.get("2026-09-04").hg.kilos, 0);
  assert.equal(ctx.byYmd.get("2026-09-04").hg.kilos_estimated, false);
  assert.equal(ctx.byYmd.get("2026-09-03").hg.importe, -75);
  assert.equal(ctx.byYmd.get("2026-09-05").hg.importe, -50);

  const leading = buildComprasDailyEstimateContext(payloadFrom([
    day("2026-09-01"),
    day("2026-09-02", { p1: [100, 500], hg: 4, t: -20 }),
  ]));
  assert.equal(slot(leading, "2026-09-01", 1).kg, null);
  assert.equal(slot(leading, "2026-09-01", 1).kg_estimated, false);
});

test("G–J) solo las celdas base estimadas van en azul", async () => {
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payloadFrom(sampleDays()), { plantName: "Puebla" });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(ws.getCell(6, 2).value, 100);
  assert.notEqual(fillOf(ws.getCell(6, 2)), ESTIMATED_BLUE);
  assert.equal(ws.getCell(8, 2).value, 150);
  assert.equal(fillOf(ws.getCell(8, 2)), ESTIMATED_BLUE);
  assert.equal(fillOf(ws.getCell(8, 4)), ESTIMATED_BLUE);
  assert.equal(fillOf(ws.getCell(8, 19)), ESTIMATED_BLUE);
  assert.equal(fillOf(ws.getCell(8, 20)), ESTIMATED_BLUE);
  assert.equal(ws.getCell(9, 19).value, 0);
  assert.notEqual(fillOf(ws.getCell(9, 19)), ESTIMATED_BLUE);
  assert.equal(ws.getCell(11, 1).value, "Semana 1");
  assert.notEqual(fillOf(ws.getCell(11, 2)), ESTIMATED_BLUE);
  assert.equal(ws.getCell(13, 1).value, "TOTAL MES");
  assert.notEqual(fillOf(ws.getCell(13, 2)), ESTIMATED_BLUE);
  assert.notEqual(fillOf(ws.getCell(8, 3)), ESTIMATED_BLUE);
});

test("K–U) las derivadas diarias conservan las relaciones vigentes", async () => {
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payloadFrom(sampleDays()), { plantName: "Puebla" });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  const row = 8;
  assert.match(formulaOf(ws.getCell(row, 3)), /D8\/B8/);
  assert.match(formulaOf(ws.getCell(row, 7)), /H8\/F8/);
  assert.match(formulaOf(ws.getCell(row, 11)), /L8\/J8/);
  assert.match(formulaOf(ws.getCell(row, 14)), /B8\+F8\+J8/);
  assert.match(formulaOf(ws.getCell(row, 16)), /D8\+H8\+L8/);
  assert.match(formulaOf(ws.getCell(row, 15)), /P8\/N8/);
  assert.match(formulaOf(ws.getCell(6, 18)), /\+/);
  const starts = blockStarts(3);
  const hgImp = starts[starts.length - 1] + 6;
  const flete = starts.map((col) => col + hgImp + 1);
  assert.match(formulaOf(ws.getCell(row, flete[0])), /B8/);
  assert.match(formulaOf(ws.getCell(row, flete[0] + 2)), /\*/);
  assert.match(formulaOf(ws.getCell(row, flete[1])), /F8/);
  assert.match(formulaOf(ws.getCell(row, flete[1] + 2)), /\*/);
  assert.match(formulaOf(ws.getCell(row, flete[2])), /J8/);
  assert.match(formulaOf(ws.getCell(row, flete[2] + 2)), /\*/);
  assert.match(formulaOf(ws.getCell(row, flete[3])), /COUNT/);
  assert.match(formulaOf(ws.getCell(row, flete[3] + 1)), /\//);
  assert.match(formulaOf(ws.getCell(row, flete[3] + 2)), /COUNT/);
});

test("V–AA) semana y mes suman reales y estimados", async () => {
  const days = sampleDays();
  const ctx = buildComprasDailyEstimateContext(payloadFrom(days));
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payloadFrom(days), { plantName: "Puebla" });
  const ws = wb.getWorksheet("CONTROL DE COMPRAS");
  const kg = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]
    .reduce((sum, ymd) => sum + ctx.byYmd.get(ymd).providers[1].kg, 0);
  const importe = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]
    .reduce((sum, ymd) => sum + ctx.byYmd.get(ymd).providers[1].importe, 0);
  const hgImporte = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]
    .reduce((sum, ymd) => sum + ctx.byYmd.get(ymd).hg.importe, 0);
  assert.equal(ws.getCell(11, 2).value, kg);
  assert.equal(ws.getCell(11, 4).value, importe);
  assert.equal(ws.getCell(11, 20).value, Math.round(hgImporte * 100) / 100);
  assert.equal(ws.getCell(11, 3).value, importe / kg);
  const dailyCosts = [1000 / 100, 3000 / 200, 2000 / 150, 8000 / 400, 4000 / ((100 + 200 + 400) / 3)];
  const simple = dailyCosts.reduce((s, n) => s + n, 0) / dailyCosts.length;
  assert.notEqual(ws.getCell(11, 3).value, simple);
  assert.equal(ws.getCell(13, 2).value, kg);
  assert.equal(ws.getCell(13, 4).value, importe);
  assert.equal(ws.getCell(13, 3).value, importe / kg);
});

test("AB) Compras e IGFDiario escriben el mismo CONTROL DE COMPRAS", async () => {
  const payload = payloadFrom(sampleDays());
  const comprasWb = await buildComprasWorkbook(payload, { plantName: "Puebla" });
  const forecastWb = forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    ventaTonGrid: {
      plants: ["Puebla"],
      cutoffDay: 99,
      forecastByPlant: new Map([["Puebla", 1]]),
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 1 }, tot: 1 }],
    },
    descuentoGrid: {
      plants: ["Puebla"],
      cutoffDay: 99,
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 0 } }],
    },
    comprasPayload: payload,
    comprasPlantName: "Puebla",
  });
  const a = comprasWb.getWorksheet("CONTROL DE COMPRAS");
  const b = forecastWb.getWorksheet("CONTROL DE COMPRAS");
  assert.equal(b.getCell(8, 2).value, 150);
  assert.equal(b.getCell(8, 2).value, a.getCell(8, 2).value);
  assert.equal(formulaOf(b.getCell(8, 3)), formulaOf(a.getCell(8, 3)));
  assert.equal(b.getCell(11, 20).value, a.getCell(11, 20).value);
});
