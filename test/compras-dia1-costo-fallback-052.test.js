"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const compras = require("../lib/compras-dashboard");
const { appendComprasWorksheet, blockStarts } = require("../lib/compras-excel");

const YELLOW = "FFFFFF00";
const PROVIDERS = [
  { id: 1, nombre: "PEMEX TUXPAN" },
  { id: 2, nombre: "TOMZA TUXPAN" },
  { id: 3, nombre: "TOMZA TEPEJI" },
];
const DASH = fs.readFileSync(path.join(__dirname, "..", "lib", "compras-dashboard.js"), "utf8");
const EXCEL = fs.readFileSync(path.join(__dirname, "..", "lib", "compras-excel.js"), "utf8");

function colLetter(n) {
  let s = "";
  let x = Number(n);
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function sheetCols() {
  const starts = blockStarts(PROVIDERS.length);
  const consStart = starts[starts.length - 1];
  const hgCostoCol = consStart + 4;
  return {
    consKg: consStart,
    consCosto: consStart + 1,
    consImp: consStart + 2,
    hgCosto: hgCostoCol,
  };
}

function emptyCells() {
  return {
    1: { kg: 0, importe: 0, costo_kg: null },
    2: { kg: 0, importe: 0, costo_kg: null },
    3: { kg: 0, importe: 0, costo_kg: null },
  };
}

function dayRow(ymd, kg, importe, tarifa) {
  const cells = emptyCells();
  const own = kg > 0;
  cells[1] = { kg, importe, costo_kg: own ? importe / kg : null };
  const fleteProviders = {};
  for (const p of PROVIDERS) {
    const pkg = cells[p.id].kg;
    fleteProviders[p.id] = {
      kg: pkg,
      tarifa,
      importe: tarifa == null ? null : Math.round(pkg * tarifa * 100) / 100,
    };
  }
  return {
    ymd,
    captured: own,
    cells,
    consolidado: { kg, importe, costo_kg: own ? importe / kg : null },
    flete: {
      providers: fleteProviders,
      consolidado: {
        kg,
        tarifa,
        importe: tarifa == null ? null : Math.round(kg * tarifa * 100) / 100,
      },
    },
    hg_kilos: null,
  };
}

function sheetPayload(year, month, days, costoKgAnterior) {
  return {
    year,
    month,
    providers: PROVIDERS,
    tarifas_flete: PROVIDERS.map((p) => ({ proveedor_id: p.id, tarifa: 0.8 })),
    costo_kg_anterior: costoKgAnterior == null ? null : costoKgAnterior,
    grid: {
      days,
      weeks: [],
      month: {
        providers: {},
        consolidado: { kg: 0, importe: 0, costo_kg: null },
        flete: { providers: {}, consolidado: { tarifa: 0.8 } },
      },
      rows: days.map((d) => ({ type: "day", ymd: d.ymd })),
    },
  };
}

function fillOf(cell) {
  return cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb;
}

function formulaOf(cell) {
  return cell.value && typeof cell.value === "object" && cell.value.formula ? String(cell.value.formula) : "";
}

function rowOf(ws, ymd) {
  const [yy, mm, dd] = ymd.split("-");
  const label = `${dd}/${mm}/${yy}`;
  for (let r = 6; r < 80; r += 1) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  throw new Error(`sin fila ${label}`);
}

async function buildSheet(payload, corteYmd) {
  const wb = new ExcelJS.Workbook();
  await appendComprasWorksheet(wb, payload, { plantName: "Queretaro", corteYmd });
  return wb.getWorksheet("CONTROL DE COMPRAS");
}

async function reopen(ws) {
  const buf = await ws.workbook.xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb.getWorksheet("CONTROL DE COMPRAS");
}

test("layout actual: O es COSTO KG consolidado y R es COSTO HG", () => {
  const cols = sheetCols();
  assert.equal(colLetter(cols.consCosto), "O");
  assert.equal(colLetter(cols.hgCosto), "R");
  assert.match(EXCEL, /consCostoCol/);
  assert.match(EXCEL, /hgCostoCol/);
  assert.doesNotMatch(EXCEL, /ISNUMBER\(O7\)/);
  assert.doesNotMatch(EXCEL, /hg_costo|hg_importe/);
  assert.match(DASH, /const seed = await loadLatestHgCostBeforeDate/);
  assert.match(DASH, /costo_kg_anterior/);
  assert.equal(/INSERT[\s\S]{0,80}costo_kg_anterior/.test(DASH), false);
});

test("A) sin histórico, día 1 referencia O y R del día 2 y queda amarillo", async () => {
  const cols = sheetCols();
  const day2 = dayRow("2026-09-02", 1000, 11380, 0.8);
  const payload = sheetPayload(2026, 9, [dayRow("2026-09-01", 0, 0, 0.8), day2], null);
  const ws = await buildSheet(payload, "2026-09-20");
  const again = await reopen(ws);
  const r1 = rowOf(again, "2026-09-01");
  const r2 = rowOf(again, "2026-09-02");
  const oRef = `${colLetter(cols.consCosto)}${r2}`;
  const rRef = `${colLetter(cols.hgCosto)}${r2}`;
  assert.equal(formulaOf(again.getCell(r1, cols.consCosto)), `IF(ISNUMBER(${oRef}),${oRef},"")`);
  assert.equal(formulaOf(again.getCell(r1, cols.hgCosto)), `IF(ISNUMBER(${rRef}),${rRef},"")`);
  assert.equal(fillOf(again.getCell(r1, cols.consCosto)), YELLOW);
  assert.equal(fillOf(again.getCell(r1, cols.hgCosto)), YELLOW);
  assert.equal(Math.round((11380 / 1000) * 1000) / 1000, 11.38);
  assert.equal(compras.hgCosto(11380 / 1000, 0.8), 12.18);
  assert.match(formulaOf(again.getCell(r2, cols.consCosto)), new RegExp(`<>0[\\s\\S]*${r2}`));
  assert.match(formulaOf(again.getCell(r2, cols.hgCosto)), /\+/);
  assert.equal(again.getCell(r2, 2).value, 1000);
  assert.equal(again.getCell(r2, 4).value, 11380);
  assert.notEqual(fillOf(again.getCell(r2, cols.consCosto)), YELLOW);
  assert.notEqual(fillOf(again.getCell(r2, cols.hgCosto)), YELLOW);
});

test("B) el histórico de agosto gana sobre el día 2", async () => {
  const cols = sheetCols();
  const first = dayRow("2026-09-01", 0, 0, 0.8);
  first.hg_costo_efectivo = 12.3;
  const payload = sheetPayload(2026, 9, [first, dayRow("2026-09-02", 1000, 11380, 0.8)], 11.5);
  const again = await reopen(await buildSheet(payload, "2026-09-20"));
  const r1 = rowOf(again, "2026-09-01");
  const r2 = rowOf(again, "2026-09-02");
  assert.equal(again.getCell(r1, cols.consCosto).value, 11.5);
  assert.equal(again.getCell(r1, cols.hgCosto).value, 12.3);
  assert.equal(formulaOf(again.getCell(r1, cols.consCosto)), "");
  assert.equal(formulaOf(again.getCell(r1, cols.hgCosto)), "");
  assert.equal(fillOf(again.getCell(r1, cols.consCosto)), YELLOW);
  assert.equal(fillOf(again.getCell(r1, cols.hgCosto)), YELLOW);
  assert.notEqual(again.getCell(r1, cols.consCosto).value, 11.38);
  assert.notEqual(again.getCell(r1, cols.hgCosto).value, 12.18);
  assert.match(formulaOf(again.getCell(r2, cols.consCosto)), /<>0/);
  assert.match(formulaOf(again.getCell(r2, cols.hgCosto)), /\+/);
  assert.notEqual(fillOf(again.getCell(r2, cols.consCosto)), YELLOW);
});

test("C) día 1 con compra propia conserva su costo y no se pinta de fallback", async () => {
  const cols = sheetCols();
  const first = dayRow("2026-09-01", 1000, 12000, 0.8);
  first.hg_costo_efectivo = 12.3;
  const payload = sheetPayload(2026, 9, [first, dayRow("2026-09-02", 1000, 11380, 0.8)], 11.5);
  const again = await reopen(await buildSheet(payload, "2026-09-20"));
  const r1 = rowOf(again, "2026-09-01");
  const r2 = rowOf(again, "2026-09-02");
  const ownO = formulaOf(again.getCell(r1, cols.consCosto));
  const ownR = formulaOf(again.getCell(r1, cols.hgCosto));
  assert.match(ownO, new RegExp(`<>0[\\s\\S]*${r1}`));
  assert.doesNotMatch(ownO, new RegExp(`ISNUMBER\\(${colLetter(cols.consCosto)}${r2}\\)`));
  assert.match(ownR, /\+/);
  assert.match(ownR, new RegExp(`${r1}`));
  assert.doesNotMatch(ownR, new RegExp(`ISNUMBER\\(${colLetter(cols.hgCosto)}${r2}\\)`));
  assert.notEqual(again.getCell(r1, cols.consCosto).value, 11.5);
  assert.notEqual(again.getCell(r1, cols.hgCosto).value, 12.3);
  assert.notEqual(fillOf(again.getCell(r1, cols.consCosto)), YELLOW);
  assert.notEqual(fillOf(again.getCell(r1, cols.hgCosto)), YELLOW);
});

test("D) sin histórico y sin costo en día 2, la referencia queda en blanco", async () => {
  const cols = sheetCols();
  const payload = sheetPayload(2026, 9, [
    dayRow("2026-09-01", 0, 0, 0.8),
    dayRow("2026-09-02", 0, 0, 0.8),
  ], null);
  const again = await reopen(await buildSheet(payload, "2026-09-20"));
  const r1 = rowOf(again, "2026-09-01");
  const r2 = rowOf(again, "2026-09-02");
  const oRef = `${colLetter(cols.consCosto)}${r2}`;
  const rRef = `${colLetter(cols.hgCosto)}${r2}`;
  assert.equal(formulaOf(again.getCell(r1, cols.consCosto)), `IF(ISNUMBER(${oRef}),${oRef},"")`);
  assert.equal(formulaOf(again.getCell(r1, cols.hgCosto)), `IF(ISNUMBER(${rRef}),${rRef},"")`);
  assert.equal(again.getCell(r2, 2).value, null);
  assert.equal(again.getCell(r2, 4).value, null);
  assert.equal(typeof again.getCell(r2, cols.consCosto).value, "object");
  assert.match(formulaOf(again.getCell(r2, cols.consCosto)), /<>0/);
  assert.equal(again.getCell(r2, cols.hgCosto).value, null);
});

test("E) un hueco posterior no toma el día siguiente", async () => {
  const cols = sheetCols();
  const payload = sheetPayload(2026, 9, [
    dayRow("2026-09-08", 0, 0, 0.8),
    dayRow("2026-09-09", 1000, 11380, 0.8),
  ], null);
  const again = await reopen(await buildSheet(payload, "2026-09-20"));
  const gap = rowOf(again, "2026-09-08");
  const next = rowOf(again, "2026-09-09");
  const gapO = formulaOf(again.getCell(gap, cols.consCosto));
  assert.match(gapO, /<>0/);
  assert.match(gapO, new RegExp(`${gap}`));
  assert.doesNotMatch(gapO, new RegExp(`^IF\\(ISNUMBER\\(${colLetter(cols.consCosto)}${next}\\)`));
  assert.equal(formulaOf(again.getCell(gap, cols.hgCosto)), "");
  assert.equal(again.getCell(gap, cols.hgCosto).value, null);
  assert.notEqual(fillOf(again.getCell(gap, cols.consCosto)), YELLOW);
  assert.notEqual(fillOf(again.getCell(gap, cols.hgCosto)), YELLOW);
  assert.match(formulaOf(again.getCell(next, cols.hgCosto)), /\+/);
});

test("F) 01/01 usa el 31/12 del año anterior y no el día 2", async () => {
  const sameDay = [
    { fecha: "2026-12-31", proveedor_id: 1, kg: 1000, importe: 11500 },
    { fecha: "2026-12-31", proveedor_id: 2, kg: 400, importe: 4600 },
  ];
  const tarifas = [
    { proveedor_id: 1, year: 2026, month: 12, tarifa: 0.8 },
    { proveedor_id: 2, year: 2026, month: 12, tarifa: 0.8 },
  ];
  assert.equal(compras.latestConsolidatedCostFromHistory([
    { fecha: "2026-12-31", proveedor_id: 1, kg: 0, importe: 0 },
    { fecha: "2026-12-29", proveedor_id: 1, kg: 1000, importe: 11500 },
  ]), 11.5);
  assert.equal(compras.latestConsolidatedCostFromHistory(sameDay), 11.5);
  assert.equal(compras.latestHgCostFromHistory([
    { fecha: "2026-12-31", proveedor_id: 1, kg: 1000, importe: 11500 },
  ], [{ proveedor_id: 1, year: 2026, month: 12, tarifa: 0.8 }]), 12.3);

  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes("FROM arr.compras") && !String(sql).includes("flete")) {
        return { rows: [{ fecha: "2026-12-31", proveedor_id: 1, kg: 1000, importe: 11500 }] };
      }
      return { rows: tarifas };
    },
  };
  const hg = await compras.loadLatestHgCostBeforeDate(client, 7, "2027-01-01");
  const costo = await compras.loadLatestConsolidatedCostBeforeDate(client, 7, "2027-01-01");
  assert.equal(hg, 12.3);
  assert.equal(costo, 11.5);
  const purchaseCalls = calls.filter((c) => c.sql.includes("FROM arr.compras") && !c.sql.includes("flete"));
  assert.equal(purchaseCalls.length, 1);
  assert.match(purchaseCalls[0].sql, /fecha < \$2::date/);
  assert.doesNotMatch(purchaseCalls[0].sql, /EXTRACT\s*\(\s*MONTH|date_trunc/i);
  assert.deepEqual(purchaseCalls[0].params, [7, "2027-01-01"]);

  const cols = sheetCols();
  const first = dayRow("2027-01-01", 0, 0, 0.8);
  first.hg_costo_efectivo = hg;
  const payload = sheetPayload(2027, 1, [first, dayRow("2027-01-02", 1000, 11380, 0.8)], costo);
  const again = await reopen(await buildSheet(payload, "2027-01-20"));
  const r1 = rowOf(again, "2027-01-01");
  const r2 = rowOf(again, "2027-01-02");
  assert.equal(again.getCell(r1, cols.consCosto).value, 11.5);
  assert.equal(again.getCell(r1, cols.hgCosto).value, 12.3);
  assert.equal(fillOf(again.getCell(r1, cols.consCosto)), YELLOW);
  assert.equal(fillOf(again.getCell(r1, cols.hgCosto)), YELLOW);
  assert.match(formulaOf(again.getCell(r2, cols.consCosto)), /<>0/);
  assert.notEqual(fillOf(again.getCell(r2, cols.consCosto)), YELLOW);
  assert.notEqual(again.getCell(r1, cols.consCosto).value, 11.38);
});
