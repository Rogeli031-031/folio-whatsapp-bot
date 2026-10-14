"use strict";

const { buildComprasDailyEstimateContext } = require("./compras-excel");

function classifiers() {
  return require("./dicf-excel-2027");
}

function weekNumber(fecha) {
  return require("./igf-diario-weekly-plant").weekNumber(fecha);
}

const SHEET_NAME = "DatosPlanta";

const LAST_COL = 33;
const SEPARATORS = Object.freeze([12, 15, 19, 22, 25, 29, 31]);
const EMPTY_DATA = Object.freeze([14, 18]);

const PROVIDER_KEYS = Object.freeze([
  Object.freeze({ key: "pemex", name: "PEMEX TUXPAN", kg: 16, costo: 17, tarifa: 26 }),
  Object.freeze({ key: "tomzaTuxpan", name: "TOMZA TUXPAN", kg: 20, costo: 21, tarifa: 27 }),
  Object.freeze({ key: "tomzaTepeji", name: "TOMZA TEPEJI", kg: 23, costo: 24, tarifa: 28 }),
]);

const FMT_KG = "#,##0.000";
const FMT_COSTO = "0.000";
const FMT_TARIFA = "0.00";
const FMT_PRECIO = "0.00000000";
const FMT_MXN = "#,##0.00";
const FMT_WEEK = '"Semana "0';
const FMT_DATE = "dd/mm/yyyy";
const BORDER = { style: "thin", color: { argb: "FFBFBFBF" } };
const BOX = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

function foldName(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fechaKey(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function excelSerial(year, month, day) {
  const utc = Date.UTC(year, month - 1, day);
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((utc - epoch) / 86400000);
}

function blankSide() {
  return { portatil: null, autotanque: null, carburacion: null, total: null };
}

function addKg(side, key, kg) {
  side[key] = (side[key] == null ? 0 : side[key]) + kg;
}

function plantTotal(sales) {
  if (!sales) return null;
  const casa = sales.casa.total;
  const com = sales.comisionista.total;
  if (casa == null && com == null) return null;
  return (casa == null ? 0 : casa) + (com == null ? 0 : com);
}

/** Una pasada sobre filas ya agrupadas. No mezcla otra fuente de kilos. */
function classifyDailySales(rows) {
  const byFecha = new Map();
  for (const row of rows || []) {
    const fecha = fechaKey(row && row.fecha);
    const kg = finite(row && row.kg);
    if (!fecha || kg == null) continue;
    const kind = classifiers();
    const canal = kind.classifyCanal(row.canal);
    if (!canal) continue;
    if (!byFecha.has(fecha)) byFecha.set(fecha, { casa: blankSide(), comisionista: blankSide() });
    const sales = byFecha.get(fecha);
    const side = canal === "CASA" ? sales.casa : sales.comisionista;
    addKg(side, "total", kg);
    const sub = kind.classifySubcanal(row.subcanal);
    if (sub === "PORTATIL") addKg(side, "portatil", kg);
    else if (sub === "AUTOTANQUE") addKg(side, "autotanque", kg);
    else if (sub === "CARBURACION") addKg(side, "carburacion", kg);
  }
  return byFecha;
}

function matchProvider(providers, canonical) {
  const want = foldName(canonical);
  const hits = (providers || []).filter((p) => foldName(p && p.nombre) === want);
  hits.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));
  return hits[0] || null;
}

function listedTarifa(payload, providerId) {
  const hit = (payload && payload.tarifas_flete ? payload.tarifas_flete : []).find(
    (row) => Number(row.proveedor_id) === Number(providerId)
  );
  if (!hit || !Object.prototype.hasOwnProperty.call(hit, "tarifa")) return null;
  return finite(hit.tarifa);
}

function providerTarifa(day, provider, payload) {
  const bag = day && day.flete && day.flete.providers;
  const cell = bag ? bag[provider.id] || bag[String(provider.id)] : null;
  if (cell && cell.tarifa != null) return finite(cell.tarifa);
  return listedTarifa(payload, provider.id);
}

function rawPurchase(day, providerId) {
  const cells = day && day.cells;
  if (!cells) return {};
  return cells[providerId] || cells[String(providerId)] || {};
}

function isProjectedDay(fecha, corteYmd) {
  const corte = fechaKey(corteYmd);
  return Boolean(corte) && fecha >= corte;
}

function canonicalCost(slot) {
  const kg = finite(slot && slot.kg);
  const importe = finite(slot && slot.importe);
  const real = slot && slot.kg_estimated !== true && slot.importe_estimated !== true;
  if (real && kg != null && kg > 0 && importe != null) return importe / kg;
  const projected = finite(slot && slot.costo_kg);
  if (projected != null) return projected;
  if (kg != null && kg > 0 && importe != null) return importe / kg;
  return null;
}

function purchaseOf(day, provider, est, projected) {
  const raw = rawPurchase(day, provider.id);
  const rawKg = finite(raw.kg);
  const rawImporte = finite(raw.importe);
  if (!projected) {
    if (rawKg == null || rawKg <= 0) return { kg: null, costo: null };
    return { kg: rawKg, costo: rawImporte == null ? null : rawImporte / rawKg };
  }
  return { kg: finite(est && est.kg), costo: canonicalCost(est) };
}

function resolveComprasDays(payload, corteYmd) {
  const out = new Map();
  if (!payload || !payload.grid || !Array.isArray(payload.grid.days)) return out;
  const matched = PROVIDER_KEYS.map((spec) => ({
    spec,
    provider: matchProvider(payload.providers, spec.name),
  }));
  const estimate = buildComprasDailyEstimateContext(payload, corteYmd || "");
  for (const day of payload.grid.days) {
    const fecha = fechaKey(day && day.ymd);
    if (!fecha) continue;
    const slot = estimate.byYmd.get(day.ymd) || estimate.byYmd.get(fecha) || { providers: {}, hg: {} };
    const purchases = {};
    for (const item of matched) {
      const provider = item.provider;
      if (!provider) {
        purchases[item.spec.key] = { kg: null, costo: null, tarifa: null };
        continue;
      }
      const est = slot.providers[provider.id] || slot.providers[String(provider.id)] || {};
      const bought = purchaseOf(day, provider, est, isProjectedDay(fecha, corteYmd));
      purchases[item.spec.key] = {
        kg: bought.kg,
        costo: bought.costo,
        tarifa: providerTarifa(day, provider, payload),
      };
    }
    const hg = slot.hg && slot.hg.kilos != null ? finite(slot.hg.kilos) : null;
    out.set(fecha, { purchases, hg });
  }
  return out;
}

function monthDays(year, month) {
  const last = new Date(year, month, 0).getDate();
  const out = [];
  for (let day = 1; day <= last; day += 1) out.push(ymd(year, month, day));
  return out;
}

function buildRows(spec) {
  const year = Number(spec && spec.year);
  const month = Number(spec && spec.month);
  const sales = classifyDailySales(spec && spec.salesRows);
  const compras = resolveComprasDays(spec && spec.comprasPayload, spec && spec.corteYmd);
  const discounts = spec && spec.discountByFecha instanceof Map ? spec.discountByFecha : new Map();
  return monthDays(year, month).map((fecha) => ({
    fecha,
    week: weekNumber(fecha),
    sales: sales.get(fecha) || { casa: blankSide(), comisionista: blankSide() },
    compras: compras.get(fecha) || null,
    discounts: discounts.get(fecha) || null,
  }));
}

function precioByFecha(ws) {
  const book = ws && ws.workbook;
  const sheet = book && typeof book.getWorksheet === "function" ? book.getWorksheet("PRECIO") : null;
  const out = new Map();
  if (!sheet) return out;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fecha = fechaKey(row.getCell(1).value);
    const value = finite(row.getCell(2).value);
    if (!fecha || value == null || out.has(fecha)) return;
    out.set(fecha, { row: rowNumber, value });
  });
  return out;
}

function paintHeader(cell, size) {
  cell.font = { name: "Calibri", size: size || 10, bold: true, color: { argb: "FF000000" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  cell.border = BOX;
}

function paintData(cell) {
  cell.font = { name: "Calibri", size: 10, color: { argb: "FF000000" } };
  cell.alignment = { horizontal: "right", vertical: "middle" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  cell.border = BOX;
}

function writeNumber(cell, value, fmt) {
  const n = finite(value);
  if (n == null) return;
  paintData(cell);
  cell.value = n;
  cell.numFmt = fmt;
}

function header(ws, row, col, text) {
  const cell = ws.getCell(row, col);
  cell.value = text;
  paintHeader(cell, row === 1 ? 11 : 9);
}

function applyColumns(ws) {
  const widths = [];
  for (let col = 1; col <= LAST_COL; col += 1) widths[col] = 13;
  widths[1] = 16;
  widths[2] = 14;
  widths[13] = 16;
  widths[14] = 14;
  widths[26] = 16;
  widths[27] = 16;
  widths[28] = 16;
  widths[30] = 12;
  widths[32] = 24;
  widths[33] = 28;
  for (const col of SEPARATORS) widths[col] = 2.5;
  for (let col = 1; col <= LAST_COL; col += 1) ws.getColumn(col).width = widths[col];
}

function writeHeaders(ws) {
  header(ws, 2, 1, "Semana");
  header(ws, 2, 2, "Fecha");
  header(ws, 1, 3, "VENTA");
  header(ws, 2, 3, "Venta Total (kg)");
  ws.mergeCells(1, 4, 1, 7);
  header(ws, 1, 4, "CASA");
  header(ws, 2, 4, "Portátil (kg)");
  header(ws, 2, 5, "Autotanque (kg)");
  header(ws, 2, 6, "Carburación (kg)");
  header(ws, 2, 7, "Total CASA (kg)");
  ws.mergeCells(1, 8, 1, 11);
  header(ws, 1, 8, "COMISIONISTA");
  header(ws, 2, 8, "Portátil (kg)");
  header(ws, 2, 9, "Autotanque (kg)");
  header(ws, 2, 10, "Carburación (kg)");
  header(ws, 2, 11, "Total COMISIONISTA (kg)");
  ws.mergeCells(1, 13, 1, 14);
  header(ws, 1, 13, "PRECIO");
  header(ws, 2, 13, "PRECIO ($/kg)");
  header(ws, 2, 14, "Subsidio ($)");
  ws.mergeCells(1, 16, 1, 18);
  header(ws, 1, 16, "PEMEX TUXPAN");
  header(ws, 2, 16, "COMPRA KG");
  header(ws, 2, 17, "COSTO KG");
  header(ws, 2, 18, "CIRCULAR");
  ws.mergeCells(1, 20, 1, 21);
  header(ws, 1, 20, "TOMZA TUXPAN");
  header(ws, 2, 20, "COMPRA KG");
  header(ws, 2, 21, "COSTO KG");
  ws.mergeCells(1, 23, 1, 24);
  header(ws, 1, 23, "TOMZA TEPEJI");
  header(ws, 2, 23, "COMPRA KG");
  header(ws, 2, 24, "COSTO KG");
  ws.mergeCells(1, 26, 1, 28);
  header(ws, 1, 26, "FLETE (TARIFA)");
  header(ws, 2, 26, "PEMEX TUXPAN");
  header(ws, 2, 27, "TOMZA TUXPAN");
  header(ws, 2, 28, "TOMZA TEPEJI");
  header(ws, 1, 30, "HG");
  header(ws, 2, 30, "HG Kilos");
  ws.mergeCells(1, 32, 1, 33);
  header(ws, 1, 32, "DESCUENTOS");
  header(ws, 2, 32, "Descuento CASA ($)");
  header(ws, 2, 33, "Descuento COMISIONISTA ($)");
  for (let col = 1; col <= LAST_COL; col += 1) {
    if (SEPARATORS.includes(col)) continue;
    if (ws.getCell(1, col).value == null && col !== 1 && col !== 2) paintHeader(ws.getCell(1, col), 11);
    if (col === 1 || col === 2) paintHeader(ws.getCell(1, col), 11);
  }
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 32;
}

function writeSales(ws, row, sales) {
  const casa = sales.casa;
  const com = sales.comisionista;
  writeNumber(ws.getCell(row, 3), plantTotal(sales), FMT_KG);
  writeNumber(ws.getCell(row, 4), casa.portatil, FMT_KG);
  writeNumber(ws.getCell(row, 5), casa.autotanque, FMT_KG);
  writeNumber(ws.getCell(row, 6), casa.carburacion, FMT_KG);
  writeNumber(ws.getCell(row, 7), casa.total, FMT_KG);
  writeNumber(ws.getCell(row, 8), com.portatil, FMT_KG);
  writeNumber(ws.getCell(row, 9), com.autotanque, FMT_KG);
  writeNumber(ws.getCell(row, 10), com.carburacion, FMT_KG);
  writeNumber(ws.getCell(row, 11), com.total, FMT_KG);
}

function writePrice(ws, excelRow, fecha, prices) {
  const hit = prices.get(fecha);
  if (!hit) return;
  const cell = ws.getCell(excelRow, 13);
  paintData(cell);
  cell.value = { formula: `PRECIO!B${hit.row}`, result: hit.value };
  cell.numFmt = FMT_PRECIO;
}

function writeDiscounts(ws, excelRow, discounts) {
  writeNumber(ws.getCell(excelRow, 32), discounts && discounts.casa, FMT_MXN);
  writeNumber(ws.getCell(excelRow, 33), discounts && discounts.comisionista, FMT_MXN);
}

function writeDay(ws, excelRow, item, year, month, prices) {
  const day = Number(item.fecha.slice(8, 10));
  const weekCell = ws.getCell(excelRow, 1);
  paintData(weekCell);
  weekCell.alignment = { horizontal: "center", vertical: "middle" };
  weekCell.value = item.week;
  weekCell.numFmt = FMT_WEEK;
  const dateCell = ws.getCell(excelRow, 2);
  paintData(dateCell);
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  dateCell.value = excelSerial(year, month, day);
  dateCell.numFmt = FMT_DATE;
  writeSales(ws, excelRow, item.sales);
  const bag = item.compras;
  for (const spec of PROVIDER_KEYS) {
    const slot = bag && bag.purchases ? bag.purchases[spec.key] : null;
    writeNumber(ws.getCell(excelRow, spec.kg), slot && slot.kg, FMT_KG);
    writeNumber(ws.getCell(excelRow, spec.costo), slot && slot.costo, FMT_COSTO);
    writeNumber(ws.getCell(excelRow, spec.tarifa), slot && slot.tarifa, FMT_TARIFA);
  }
  writeNumber(ws.getCell(excelRow, 30), bag && bag.hg, FMT_KG);
  writePrice(ws, excelRow, item.fecha, prices);
  writeDiscounts(ws, excelRow, item.discounts);
  for (let col = 1; col <= LAST_COL; col += 1) {
    if (SEPARATORS.includes(col)) continue;
    const cell = ws.getCell(excelRow, col);
    if (cell.value == null) paintData(cell);
  }
  ws.getRow(excelRow).height = 18;
}

function ensureSheet(wb) {
  const existing = wb.getWorksheet(SHEET_NAME);
  if (existing) return existing;
  return wb.addWorksheet(SHEET_NAME, {
    views: [{ state: "frozen", ySplit: 2, showGridLines: true }],
  });
}

function fillDatosPlanta(ws, spec) {
  const year = Number(spec && spec.year);
  const month = Number(spec && spec.month);
  applyColumns(ws);
  writeHeaders(ws);
  const rows = buildRows(spec);
  const prices = precioByFecha(ws);
  rows.forEach((item, index) => writeDay(ws, index + 3, item, year, month, prices));
  return ws;
}

module.exports = {
  SHEET_NAME,
  LAST_COL,
  SEPARATORS,
  EMPTY_DATA,
  PROVIDER_KEYS,
  FMT_WEEK,
  FMT_DATE,
  foldName,
  excelSerial,
  fechaKey,
  plantTotal,
  classifyDailySales,
  matchProvider,
  canonicalCost,
  resolveComprasDays,
  buildRows,
  ensureSheet,
  fillDatosPlanta,
};
