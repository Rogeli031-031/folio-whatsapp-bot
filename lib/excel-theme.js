/**
 * Estilos reutilizables para exportación Excel con ExcelJS (Dashboard ARR Forecast).
 * Paleta sobria: grises/azules corporativos. Sin plantilla .xlsx.
 *
 * Coexiste con `xlsx` (SheetJS) en otras rutas del servidor; este módulo solo usa ExcelJS.
 */

"use strict";

const ExcelJS = require("exceljs");

/** Formato numérico con separador de miles (es-MX compatible en Excel). */
const FMT_NUMBER = "#,##0.00";
const FMT_NUMBER_INT = "#,##0";
const FMT_CURRENCY_MXN = '"$"#,##0.00';
/** Valores HG % ya vienen como 12.3 (no como 0.123). */
const FMT_PCT_DISPLAY = "#,##0.0";

const BORDER_THIN = { style: "thin", color: { argb: "FFBFBFBF" } };
const FILL_HEADER = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5496" } };
const FILL_TITLE = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEF7" } };
const FILL_ALT_ROW = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
const FILL_BAND_REAL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
const FILL_BAND_PROY = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
const FILL_LOOKBACK = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };

/** Índice de columna 0-based → letra Excel. */
function col0ToLetter(col0) {
  let n = col0 + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rcToA1(r0, c0) {
  return `${col0ToLetter(c0)}${r0 + 1}`;
}

/**
 * Fórmula Excel: acepta "=A1+B1" o "A1+B1" (ExcelJS no usa '=' al inicio).
 */
function setCellFormula(worksheet, r0, c0, formula) {
  const f = String(formula || "").trim().replace(/^=/, "");
  worksheet.getCell(r0 + 1, c0 + 1).value = { formula: f };
}

function setCellNumber(worksheet, r0, c0, n, numFmt) {
  const cell = worksheet.getCell(r0 + 1, c0 + 1);
  cell.value = n;
  if (numFmt) cell.numFmt = numFmt;
}

/**
 * Escribe matriz (AOA) en la hoja; fila/columna 0-based inicio opcional.
 */
function writeAoa(worksheet, aoa, startR0 = 0, startC0 = 0) {
  if (!aoa || !aoa.length) return;
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      const cell = worksheet.getCell(startR0 + r + 1, startC0 + c + 1);
      if (v === undefined) continue;
      if (v === null || v === "") {
        cell.value = null;
        continue;
      }
      if (typeof v === "number" && Number.isFinite(v)) cell.value = v;
      else cell.value = v;
    }
  }
}

function applyHeaderRow(worksheet, excelRow1Based, fromCol0, toCol0) {
  for (let c = fromCol0; c <= toCol0; c++) {
    const cell = worksheet.getCell(excelRow1Based, c + 1);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = FILL_HEADER;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: BORDER_THIN,
      left: BORDER_THIN,
      bottom: BORDER_THIN,
      right: BORDER_THIN,
    };
  }
}

function applyTitleStyle(worksheet, excelRow1Based, fromCol0, toCol0) {
  for (let c = fromCol0; c <= toCol0; c++) {
    const cell = worksheet.getCell(excelRow1Based, c + 1);
    cell.font = { bold: true, size: 12, color: { argb: "FF1F2937" } };
    cell.fill = FILL_TITLE;
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  }
}

function applyBordersRange(worksheet, r0Top, c0Left, r0Bottom, c0Right) {
  for (let r = r0Top; r <= r0Bottom; r++) {
    for (let c = c0Left; c <= c0Right; c++) {
      const cell = worksheet.getCell(r + 1, c + 1);
      cell.border = {
        top: BORDER_THIN,
        left: BORDER_THIN,
        bottom: BORDER_THIN,
        right: BORDER_THIN,
      };
    }
  }
}

function applyTotalRow(worksheet, excelRow1Based, fromCol0, toCol0) {
  for (let c = fromCol0; c <= toCol0; c++) {
    const cell = worksheet.getCell(excelRow1Based, c + 1);
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  }
}

function setColumnWidths(worksheet, widths) {
  widths.forEach((w, i) => {
    if (w != null && w > 0) worksheet.getColumn(i + 1).width = w;
  });
}

function freezeTopRows(worksheet, rowCount) {
  if (!rowCount || rowCount < 1) return;
  worksheet.views = [{ state: "frozen", ySplit: rowCount, showGridLines: true }];
}

function applyCurrencyFormat(worksheet, r0, c0) {
  worksheet.getCell(r0 + 1, c0 + 1).numFmt = FMT_CURRENCY_MXN;
}

function applyPercentFormat(worksheet, r0, c0) {
  worksheet.getCell(r0 + 1, c0 + 1).numFmt = FMT_PCT_DISPLAY;
}

function applyNumberFormat(worksheet, r0, c0, intOnly) {
  worksheet.getCell(r0 + 1, c0 + 1).numFmt = intOnly ? FMT_NUMBER_INT : FMT_NUMBER;
}

/**
 * Añade hoja desde AOA con encabezado en fila 1 y bordes en bloque de datos.
 * @param {import('exceljs').Workbook} workbook
 */
function addSheetFromAoa(workbook, sheetName, aoa, options = {}) {
  const name = String(sheetName || "Sheet").slice(0, 31);
  const ws = workbook.addWorksheet(name, {
    views: options.freezeRows ? [{ state: "frozen", ySplit: options.freezeRows, showGridLines: true }] : [{ showGridLines: true }],
  });
  writeAoa(ws, aoa);
  const maxR = aoa.length;
  const maxC = Math.max(0, ...aoa.map((row) => (row ? row.length : 0))) - 1;
  if (options.headerRows >= 1 && maxC >= 0) {
    for (let h = 0; h < options.headerRows; h++) {
      applyHeaderRow(ws, h + 1, 0, maxC);
    }
  }
  if (options.applyTableBorders && maxR > 0 && maxC >= 0) {
    const rStart = options.borderStartRow0 != null ? options.borderStartRow0 : 0;
    applyBordersRange(ws, rStart, 0, maxR - 1, maxC);
  }
  if (options.columnWidths && options.columnWidths.length) setColumnWidths(ws, options.columnWidths);
  return ws;
}

module.exports = {
  ExcelJS,
  FMT_NUMBER,
  FMT_NUMBER_INT,
  FMT_CURRENCY_MXN,
  FMT_PCT_DISPLAY,
  FILL_BAND_REAL,
  FILL_BAND_PROY,
  FILL_LOOKBACK,
  col0ToLetter,
  rcToA1,
  setCellFormula,
  setCellNumber,
  writeAoa,
  applyHeaderRow,
  applyTitleStyle,
  applyBordersRange,
  applyTotalRow,
  setColumnWidths,
  freezeTopRows,
  applyCurrencyFormat,
  applyPercentFormat,
  applyNumberFormat,
  addSheetFromAoa,
};
