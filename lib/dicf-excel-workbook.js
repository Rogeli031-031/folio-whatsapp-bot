"use strict";

const XLSX = require("xlsx");
const { assembleDicfExcel2027, applySheet2027Formats } = require("./dicf-excel-2027");

const EXISTING_SHEET_NAMES = Object.freeze([
  "Venta (Ton)",
  "Descuento ($ por kg)",
  "Margen ($ por kg)",
  "Ingreso por cliente",
]);

function pad(arr, len, fill) {
  const a = (arr || []).slice(0, len);
  while (a.length < len) a.push(fill);
  return a;
}

function monthValsForClient(c, numMeses, margenPorMes) {
  const ventaPorMes = (c.ventaPorMes || []).slice(0, numMeses);
  const descuentoPorMes = (c.descuentoPorMes || []).slice(0, numMeses);
  const out = [];
  for (let i = 0; i < numMeses; i++) {
    const v = ventaPorMes[i];
    const d = descuentoPorMes[i];
    const mg = margenPorMes[i];
    out.push(v != null && Number.isFinite(v) ? v : "");
    out.push(d != null && Number.isFinite(d) ? d : "");
    out.push(mg != null && Number.isFinite(mg) ? mg : "");
  }
  return out;
}

function buildExistingDicfExcelSheets(excelData, clientes) {
  const dates = excelData.dates;
  const margen = excelData.margen != null && Number.isFinite(excelData.margen) ? excelData.margen : 0;
  const meses = excelData.meses || [];
  const margenPorMes = excelData.margenPorMes || [];
  const monthHeaders = [];
  for (const m of meses) {
    monthHeaders.push(`Venta ${m.label}`, `Descuento ${m.label}`, `Margen ${m.label}`);
  }
  const headerRow = ["Cliente", "Estatus", "Categoría", "Subcategoría", ...monthHeaders, ...dates];
  const numCols = dates.length;
  const numMeses = meses.length;

  const sheet1Rows = [headerRow];
  for (const c of clientes) {
    const raw = (c.kgLast30 || []).map((v) => (v != null && Number.isFinite(v) ? v : ""));
    const tonValues = pad(raw, numCols, "");
    sheet1Rows.push([c.cliente || "", c.estado || "", c.canal || "", c.subcanal || "", ...monthValsForClient(c, numMeses, margenPorMes), ...tonValues]);
  }

  const sheet2Rows = [headerRow];
  for (const c of clientes) {
    const raw = (c.descKgLast30 || []).map((v) => (v != null && Number.isFinite(v) ? Number(v.toFixed(4)) : ""));
    const descValues = pad(raw, numCols, "");
    sheet2Rows.push([c.cliente || "", c.estado || "", c.canal || "", c.subcanal || "", ...monthValsForClient(c, numMeses, margenPorMes), ...descValues]);
  }

  const sheet3Rows = [headerRow];
  for (const c of clientes) {
    const margenValues = dates.map(() => margen);
    sheet3Rows.push([c.cliente || "", c.estado || "", c.canal || "", c.subcanal || "", ...monthValsForClient(c, numMeses, margenPorMes), ...margenValues]);
  }

  const ingresoHeaders = ["Cliente", "Estatus", "Categoría", "Subcategoría", ...meses.map((m) => `Ingreso ${m.label}`)];
  const ingresoRows = [ingresoHeaders];
  for (const c of clientes) {
    const ventaPorMes = (c.ventaPorMes || []).slice(0, numMeses);
    const descuentoPorMes = (c.descuentoPorMes || []).slice(0, numMeses);
    const ingresoVals = [];
    for (let i = 0; i < numMeses; i++) {
      const v = ventaPorMes[i] != null && Number.isFinite(ventaPorMes[i]) ? ventaPorMes[i] : 0;
      const d = descuentoPorMes[i] != null && Number.isFinite(descuentoPorMes[i]) ? descuentoPorMes[i] : 0;
      const mg = margenPorMes[i] != null && Number.isFinite(margenPorMes[i]) ? margenPorMes[i] : 0;
      const ingreso = v * 1000 * mg - Math.abs(Number(d));
      ingresoVals.push(Number.isFinite(ingreso) ? Math.round(ingreso * 100) / 100 : "");
    }
    ingresoRows.push([c.cliente || "", c.estado || "", c.canal || "", c.subcanal || "", ...ingresoVals]);
  }

  return {
    sheetNames: EXISTING_SHEET_NAMES.slice(),
    sheets: {
      "Venta (Ton)": sheet1Rows,
      "Descuento ($ por kg)": sheet2Rows,
      "Margen ($ por kg)": sheet3Rows,
      "Ingreso por cliente": ingresoRows,
    },
  };
}

function appendExistingSheets(wb, built) {
  for (const name of EXISTING_SHEET_NAMES) {
    const ws = XLSX.utils.aoa_to_sheet(built.sheets[name]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
}

function existingSheetsAoaEqual(a, b) {
  if (!a || !b) return false;
  for (const name of EXISTING_SHEET_NAMES) {
    const left = JSON.stringify(a.sheets[name]);
    const right = JSON.stringify(b.sheets[name]);
    if (left !== right) return false;
  }
  return true;
}

async function buildDicfClienteForecastWorkbook(excelData, clientes, sheet2027Opts) {
  const wb = XLSX.utils.book_new();
  const existing = buildExistingDicfExcelSheets(excelData, clientes);
  appendExistingSheets(wb, existing);
  let sheet2027 = null;
  if (sheet2027Opts && sheet2027Opts.include !== false) {
    sheet2027 = await assembleDicfExcel2027(sheet2027Opts.client || null, sheet2027Opts);
    const ws = XLSX.utils.aoa_to_sheet(sheet2027.aoa);
    applySheet2027Formats(ws);
    XLSX.utils.book_append_sheet(wb, ws, "2027");
  }
  return { wb, existing, sheet2027 };
}

module.exports = {
  EXISTING_SHEET_NAMES,
  buildExistingDicfExcelSheets,
  existingSheetsAoaEqual,
  buildDicfClienteForecastWorkbook,
  appendExistingSheets,
};
