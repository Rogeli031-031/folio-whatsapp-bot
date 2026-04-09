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
const BORDER_BLACK = { style: "thin", color: { argb: "FF000000" } };
const PRONOSTICO_BORDER = {
  top: BORDER_BLACK,
  left: BORDER_BLACK,
  bottom: BORDER_BLACK,
  right: BORDER_BLACK,
};
const FILL_PRONOSTICO_BLUE = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
const FILL_PRONOSTICO_LABEL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
const FILL_PRONOSTICO_PROM = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA6A6A6" } };
const FILL_PRONOSTICO_YELLOW = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
const FILL_PRONOSTICO_BLACK = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
const FILL_WHITE = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };

/**
 * Formato visual hoja "Pronostico": bloques venta (ton) + descuento ($/kg) por planta.
 * Encabezados azul oscuro / blanco, etiquetas semana gris, lookback amarillo, PROM gris + total negro,
 * fila PROY azul, bordes negros. Sin plantilla .xlsx.
 * Si venta y desc tienen distinto número de filas, la etiqueta se toma de col. A o de col. K (inicio desc).
 */
function applyPronosticoPlantBlocks(worksheet, aoa, styleBlocks, COLK) {
  const VENTA_COLS = 9;

  function primaryLabel(row) {
    const a = row[0] != null && String(row[0]).trim() !== "" ? String(row[0]).trim() : "";
    const k = row[COLK] != null && String(row[COLK]).trim() !== "" ? String(row[COLK]).trim() : "";
    return a || k;
  }

  for (const b of styleBlocks) {
    const descCols = b.descColCount != null && b.descColCount > 0 ? b.descColCount : 10;
    const hr = b.header1Row + 1;
    const rowTitle = aoa[b.header1Row] || [];
    const cStart = COLK + 1;
    const cEnd = COLK + descCols;

    const tLeft = [String(rowTitle[0] || "").trim(), String(rowTitle[1] || "").trim()].filter(Boolean).join(" ");
    const tRight = [String(rowTitle[COLK] || "").trim(), String(rowTitle[COLK + 1] || "").trim()].filter(Boolean).join(" ");

    try {
      worksheet.mergeCells(hr, 1, hr, VENTA_COLS);
      const c0 = worksheet.getCell(hr, 1);
      c0.value = tLeft;
      c0.fill = FILL_PRONOSTICO_BLUE;
      c0.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      c0.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      c0.border = PRONOSTICO_BORDER;
    } catch {
      for (let cc = 1; cc <= VENTA_COLS; cc++) {
        const cell = worksheet.getCell(hr, cc);
        if (cc === 1) cell.value = tLeft;
        cell.fill = FILL_PRONOSTICO_BLUE;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        cell.border = PRONOSTICO_BORDER;
      }
    }

    try {
      worksheet.mergeCells(hr, cStart, hr, cEnd);
      const c0 = worksheet.getCell(hr, cStart);
      c0.value = tRight;
      c0.fill = FILL_PRONOSTICO_BLUE;
      c0.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      c0.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      c0.border = PRONOSTICO_BORDER;
    } catch {
      for (let cc = cStart; cc <= cEnd; cc++) {
        const cell = worksheet.getCell(hr, cc);
        if (cc === cStart) cell.value = tRight;
        cell.fill = FILL_PRONOSTICO_BLUE;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        cell.border = PRONOSTICO_BORDER;
      }
    }

    for (let i = 0; i < b.height; i++) {
      const r0 = b.tableStartRow + i;
      const excelR = r0 + 1;
      const row = aoa[r0] || [];
      const lab = primaryLabel(row);

      if (lab === "Semana (año)") {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_PRONOSTICO_BLUE;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = PRONOSTICO_BORDER;
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_PRONOSTICO_BLUE;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = PRONOSTICO_BORDER;
        }
        continue;
      }

      if (lab.indexOf("Semana ") === 0 && lab.indexOf("(") > 0) {
        worksheet.getCell(excelR, 1).fill = FILL_PRONOSTICO_LABEL;
        worksheet.getCell(excelR, 1).font = { color: { argb: "FF000000" }, size: 11 };
        worksheet.getCell(excelR, 1).alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getCell(excelR, 1).border = PRONOSTICO_BORDER;
        worksheet.getCell(excelR, cStart).fill = FILL_PRONOSTICO_LABEL;
        worksheet.getCell(excelR, cStart).font = { color: { argb: "FF000000" }, size: 11 };
        worksheet.getCell(excelR, cStart).alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getCell(excelR, cStart).border = PRONOSTICO_BORDER;
        for (let cc = 2; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_WHITE;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = PRONOSTICO_BORDER;
          if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
        }
        const vm = b.ventaMask[i];
        if (Array.isArray(vm)) {
          for (let k = 0; k < 7 && k < vm.length; k++) {
            if (vm[k]) worksheet.getCell(excelR, k + 2).fill = FILL_PRONOSTICO_YELLOW;
          }
        }
        for (let cc = cStart + 1; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_WHITE;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = PRONOSTICO_BORDER;
          if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
        }
        const dm = b.descMask[i];
        if (Array.isArray(dm)) {
          for (let k = 0; k < 7 && k < dm.length; k++) {
            if (dm[k]) worksheet.getCell(excelR, cStart + 1 + k).fill = FILL_PRONOSTICO_YELLOW;
          }
        }
        continue;
      }

      if (lab.indexOf("PROM mes (por día de semana)") === 0) {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (cc === 1) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (cc === VENTA_COLS) {
            cell.fill = FILL_PRONOSTICO_BLACK;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
          } else {
            cell.fill = FILL_PRONOSTICO_PROM;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
          }
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (cc === cStart) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_PRONOSTICO_PROM;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
          }
        }
        continue;
      }

      if (lab.indexOf("TOTAL mes (por día de semana)") === 0) {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === 1) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === cStart) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (cc <= cStart + 7) {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_CURRENCY_MXN;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        continue;
      }

      if (lab === "PROM") {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === 1) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === cStart) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_CURRENCY_MXN;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        continue;
      }

      if (lab === "POR COMPRAR") {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === 1) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.border = PRONOSTICO_BORDER;
          if (cc === cStart) {
            cell.fill = FILL_PRONOSTICO_LABEL;
            cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.fill = FILL_WHITE;
            if (typeof cell.value === "number") cell.numFmt = FMT_CURRENCY_MXN;
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        }
        continue;
      }

      if (lab === "PROY") {
        for (let cc = 1; cc <= VENTA_COLS; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_PRONOSTICO_BLUE;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.border = PRONOSTICO_BORDER;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (typeof cell.value === "number") cell.numFmt = FMT_NUMBER;
        }
        for (let cc = cStart; cc <= cEnd; cc++) {
          const cell = worksheet.getCell(excelR, cc);
          cell.fill = FILL_PRONOSTICO_BLUE;
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.border = PRONOSTICO_BORDER;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (typeof cell.value === "number") {
            cell.numFmt = cc === cEnd ? FMT_NUMBER : FMT_CURRENCY_MXN;
          }
        }
      }
    }
  }
}

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
  applyPronosticoPlantBlocks,
};
