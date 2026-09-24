"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const compras = require("../lib/compras-dashboard");
const { appendComprasWorksheet, blockStarts, buildComprasWorkbook } = require("../lib/compras-excel");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ComprasClient.tsx"), "utf8");
const FORMAT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "compras-format.ts"), "utf8");
const DASH = fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");

function day(ymd, opts = {}) {
  return {
    ymd,
    captured: Boolean(opts.captured),
    cells: opts.cells || { 1: { kg: opts.kg || 0, importe: opts.importe || 0, costo_kg: opts.providerCosto ?? null } },
    consolidado: {
      kg: opts.kg || 0,
      importe: opts.importe || 0,
      costo_kg: opts.costo === undefined ? null : opts.costo,
    },
    flete: {
      providers: {},
      consolidado: { tarifa: opts.tarifa === undefined ? null : opts.tarifa },
    },
    hg_kilos: opts.hg === undefined ? null : opts.hg,
  };
}

function gridOf(days) {
  return { days };
}

test("A–H) el arrastre solo reemplaza días sin costo HG válido", () => {
  const days = [
    day("2026-09-18", { costo: 11.965, tarifa: 1.23, hg: 100, kg: 1000, importe: 11965, captured: true }),
    day("2026-09-19", { hg: 7685 }),
    day("2026-09-20", { hg: 10 }),
    day("2026-09-21", { hg: 10 }),
    day("2026-09-22", { hg: 10 }),
    day("2026-09-23", { hg: 10 }),
    day("2026-09-24", { costo: 0, tarifa: 1.23, hg: 10, kg: 1000, importe: 0 }),
    day("2026-09-25", { tarifa: null, hg: 10 }),
    day("2026-09-26", { costo: 10, tarifa: 1.23, hg: 4, kg: 100, importe: 1000, captured: true }),
    day("2026-09-27", { costo: 11.965, tarifa: 1.23, hg: null, kg: 100, importe: 1196.5, captured: true }),
    day("2026-09-28", { hg: 0 }),
  ];
  compras.applyHgCostCarryForward(gridOf(days), null);
  assert.equal(days[0].hg_costo_efectivo, 13.195);
  assert.equal(days[1].hg_costo_efectivo, 13.195);
  assert.equal(days[5].hg_costo_efectivo, 13.195);
  assert.equal(days[6].hg_costo_efectivo, 13.195);
  assert.notEqual(days[6].hg_costo_efectivo, 1.23);
  assert.equal(days[7].hg_costo_efectivo, 13.195);
  assert.equal(days[8].hg_costo_efectivo, 11.23);
  assert.equal(days[9].hg_costo_efectivo, 13.195);
  assert.equal(days[9].hg_importe_efectivo, null);
  assert.equal(days[10].hg_costo_efectivo, 13.195);
  assert.equal(days[10].hg_importe_efectivo, 0);
  assert.equal(days[1].cells[1].costo_kg, null);
  assert.equal(days[1].consolidado.costo_kg, null);
});

test("I–L) el mes sin compra usa el último costo anterior y no inventa cero", async () => {
  const july = { fecha: "2026-07-20", proveedor_id: 1, kg: 1000, importe: 11965 };
  const augustZero = { fecha: "2026-08-31", proveedor_id: 1, kg: 1000, importe: 0 };
  const august = { fecha: "2026-08-18", proveedor_id: 1, kg: 1000, importe: 11965 };
  const tarifas = [
    { proveedor_id: 1, year: 2026, month: 7, tarifa: 1.23 },
    { proveedor_id: 1, year: 2026, month: 8, tarifa: 1.23 },
  ];
  assert.equal(compras.latestHgCostFromHistory([july, august], tarifas), 13.195);
  assert.equal(compras.latestHgCostFromHistory([july, augustZero], tarifas), 13.195);
  assert.equal(compras.latestHgCostFromHistory([], tarifas), null);

  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes("FROM arr.compras") && !String(sql).includes("flete")) {
        return { rows: [august] };
      }
      return { rows: [{ proveedor_id: 1, year: 2026, month: 8, tarifa: 1.23 }] };
    },
  };
  const seed = await compras.loadLatestHgCostBeforeDate(client, 4, "2026-09-01");
  assert.equal(seed, 13.195);
  assert.match(calls[0].sql, /fecha < \$2::date/);
  assert.deepEqual(calls[0].params, [4, "2026-09-01"]);

  const leading = [day("2026-09-01", { hg: 5 }), day("2026-09-02", { hg: 5 }), day("2026-09-03", { hg: 5 })];
  compras.applyHgCostCarryForward(gridOf(leading), seed);
  assert.equal(leading[0].hg_costo_efectivo, 13.195);
  assert.equal(leading[2].hg_costo_efectivo, 13.195);

  const empty = [day("2026-09-01", { hg: 5 })];
  compras.applyHgCostCarryForward(gridOf(empty), null);
  assert.equal(empty[0].hg_costo_efectivo, null);
  assert.equal(empty[0].hg_importe_efectivo, null);
});

test("M–Q) importe diario, semanal y mensual usan el costo efectivo", () => {
  const contractual = compras.hgImporte(13.195, 7685);
  assert.equal(contractual, -101403.57);
  const days = [
    day("2026-09-18", { costo: 11.965, tarifa: 1.23, hg: 100, kg: 2000, importe: 23930, captured: true }),
    day("2026-09-19", { hg: 7685 }),
    day("2026-09-20", { costo: 10, tarifa: 1.23, hg: 4, kg: 2000, importe: 20000, captured: true }),
  ];
  compras.applyHgCostCarryForward(gridOf(days), null);
  assert.equal(days[1].hg_costo_efectivo, 13.195);
  assert.equal(days[1].hg_importe_efectivo, contractual);
  const weekImp = compras.hgImporteSum(days);
  assert.equal(weekImp, compras.hgImporte(13.195, 100) + contractual + compras.hgImporte(11.23, 4));
  const weekCosto = compras.hgCosto(10.9825, 1.23);
  assert.equal(weekCosto, 12.213);
  assert.notEqual(weekCosto, days[1].hg_costo_efectivo);
  assert.equal(compras.hgImporteSum(days), weekImp);
});

test("R–W) compra válida, tarifa cero y suma incompleta no cambian de contrato", () => {
  assert.equal(compras.rawDailyHgCost(day("2026-09-01", { costo: 11.095, tarifa: 1.23 })), 12.325);
  assert.equal(compras.rawDailyHgCost(day("2026-09-01", { costo: 11.095, tarifa: 0 })), 11.095);
  assert.equal(compras.hgImporte(12, 100), -1200);
  assert.equal(compras.hgImporte(12, -100), 1200);
  const incomplete = [day("2026-09-01", { hg: 10, tarifa: null })];
  compras.applyHgCostCarryForward(gridOf(incomplete), null);
  assert.equal(compras.hgImporteSum(incomplete), null);
  assert.match(DASH, /attachFleteToGrid\(grid, tarifas_flete, sheetProviders\);\s*const seed = await loadLatestHgCostBeforeDate/);
  assert.equal(DASH.includes("INSERT") && DASH.includes("hg_costo_efectivo") && /INSERT[\s\S]{0,80}hg_costo_efectivo/.test(DASH), false);
});

test("X) la UI diaria consume el costo y el importe efectivos", () => {
  assert.match(CLIENT, /hgCostoDiario\(day\)/);
  assert.match(CLIENT, /hgImporteDiario\(day\)/);
  assert.match(FORMAT, /hg_costo_efectivo/);
  assert.match(FORMAT, /hg_importe_efectivo/);
  const monthBlock = CLIENT.slice(CLIENT.lastIndexOf("TOTAL MES") - 400);
  assert.match(monthBlock, /hgCosto\(data\.grid\.month\.consolidado\?\.costo_kg/);
  assert.match(monthBlock, /hgImporteSum\(data\.grid\.days/);
});

function acceptancePayload() {
  const days = [
    day("2026-09-18", { costo: 11.965, tarifa: 1.23, hg: 100, kg: 1000, importe: 11965, captured: true, providerCosto: 11.965 }),
    day("2026-09-19", { hg: 7685 }),
  ];
  compras.applyHgCostCarryForward(gridOf(days), null);
  const weekCostoKg = 11.965;
  return {
    year: 2026,
    month: 9,
    providers: [{ id: 1, nombre: "PEMEX TUXPAN" }],
    tarifas_flete: [{ proveedor_id: 1, tarifa: 1.23 }],
    grid: {
      days,
      weeks: [{
        week: 3,
        ymds: ["2026-09-18", "2026-09-19"],
        providers: { 1: { kg: 1000, importe: 11965, costo_kg: 11.965 } },
        consolidado: { kg: 1000, importe: 11965, costo_kg: weekCostoKg },
        hg_kilos: 7785,
        flete: { providers: {}, consolidado: { kg: 1000, tarifa: 1.23, importe: 1230 } },
      }],
      month: {
        providers: { 1: { kg: 1000, importe: 11965, costo_kg: 11.965 } },
        consolidado: { kg: 1000, importe: 11965, costo_kg: weekCostoKg },
        hg_kilos: 7785,
        flete: { providers: {}, consolidado: { kg: 1000, tarifa: 1.23, importe: 1230 } },
      },
      rows: [
        { type: "day", ymd: "2026-09-18", day: 18, dow: 5 },
        { type: "day", ymd: "2026-09-19", day: 19, dow: 6 },
        { type: "week", week: 3, ymds: ["2026-09-18", "2026-09-19"] },
      ],
    },
  };
}

function hgCols() {
  const starts = blockStarts(1);
  const consStart = starts[starts.length - 1];
  return { costo: consStart + 4, hg: consStart + 5, importe: consStart + 6, providerCosto: starts[0] + 1 };
}

test("Y–AA) Excel y CONTROL DE COMPRAS comparten el costo efectivo", async () => {
  const payload = acceptancePayload();
  const built = await buildComprasWorkbook(payload, { plantName: "Puebla", corteYmd: "2026-09-24" });
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payload, { plantName: "Puebla", corteYmd: "2026-09-24" });
  const a = built.getWorksheet("CONTROL DE COMPRAS");
  const b = wb.getWorksheet("CONTROL DE COMPRAS");
  const cols = hgCols();
  assert.ok(String(a.getCell(6, cols.costo).value.formula || "").includes("+"));
  assert.equal(a.getCell(7, cols.costo).value, 13.195);
  assert.equal(b.getCell(7, cols.costo).value, 13.195);
  assert.equal(a.getCell(7, blockStarts(1)[0]).value, null);
  assert.match(String(a.getCell(7, cols.importe).value.formula || ""), /\*-1/);
  assert.equal(a.getCell(7, cols.hg).value, 7685);
  assert.equal(String(b.getCell(7, cols.importe).value.formula), String(a.getCell(7, cols.importe).value.formula));
  const weekCosto = a.getCell(8, cols.costo).value;
  assert.equal(weekCosto, compras.hgCosto(11.965, 1.23));
  assert.equal(typeof weekCosto, "number");
  assert.equal(a.getCell(8, cols.importe).value, compras.hgImporteSum(payload.grid.days));
  const providerCosto = a.getCell(7, cols.providerCosto).value;
  assert.match(String(providerCosto && providerCosto.formula || ""), /ISNUMBER\(/);
  assert.match(FORECAST, /appendComprasWorksheet\(wb, options\.comprasPayload/);
});
