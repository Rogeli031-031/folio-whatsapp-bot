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
/** Importe entero MXN: negativos en rojo (sin CF). */
const FMT_CURRENCY_MXN_INT = '"$"#,##0;[Red]"$"#,##0';
const FMT_HG_DECIMALS = "#,##0.0000";
const FMT_DESC_KG_COL = "0.00";
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
const FILL_IGF_HEADER = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const FILL_IGF_LABEL_ROW = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
const FILL_IGF_ZONA_A = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F7F7F" } };
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
/** Días del mes aún no transcurridos (posteriores a fecha de corte): mismo tono que “azul claro” típico de Excel. */
const FILL_PRONOSTICO_PENDING = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
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

      try {
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
        const vpend = b.ventaPendingMask && b.ventaPendingMask[i];
        if (Array.isArray(vpend)) {
          for (let k = 0; k < 7 && k < vpend.length; k++) {
            if (vpend[k] && !(vm && vm[k])) worksheet.getCell(excelR, k + 2).fill = FILL_PRONOSTICO_PENDING;
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
        const dpend = b.descPendingMask && b.descPendingMask[i];
        if (Array.isArray(dpend)) {
          for (let k = 0; k < 7 && k < dpend.length; k++) {
            if (dpend[k] && !(dm && dm[k])) worksheet.getCell(excelR, cStart + 1 + k).fill = FILL_PRONOSTICO_PENDING;
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
      } finally {
        const dkg = worksheet.getCell(excelR, cEnd);
        if (typeof dkg.value === "number" && Number.isFinite(dkg.value)) {
          dkg.numFmt = FMT_DESC_KG_COL;
          dkg.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
        }
      }
    }
  }
}

/**
 * Sustituye valores fijos de PROM mes, POR COMPRAR y PROY por fórmulas Excel (venta ton + descuento).
 * PROM mes por día: promedio de los **dos últimos valores no vacíos y no cero** (MAX+INDEX; sin "<" en XML).
 * Debe ejecutarse después de writeAoa y applyPronosticoPlantBlocks.
 * @param {number} COLK - índice 0-based de la columna K (inicio bloque descuento).
 * @param {number[]} remainingByDow - 7 enteros: ocurrencias de cada DOW desde corte (inclusive) a fin de mes.
 */
function applyPronosticoSummaryFormulas(worksheet, blocks, COLK, remainingByDow) {
  const R = remainingByDow;
  if (!blocks || !R || R.length !== 7) return;

  for (const b of blocks) {
    const s = b.summaryRows;
    if (!s) continue;
    const {
      firstWeekExcelRow,
      lastWeekExcelRow,
      promRowExcel,
      totalRowExcel,
      promDescMxnRowExcel,
      porRowExcel,
      proyRowExcel,
    } = s;
    const fwr = firstWeekExcelRow;
    const lwr = lastWeekExcelRow;
    const pr = promRowExcel;
    const tr = totalRowExcel;
    const pdr = promDescMxnRowExcel;
    const porr = porRowExcel;
    const proyr = proyRowExcel;

    const dFirst = col0ToLetter(COLK + 1);
    const dLast = col0ToLetter(COLK + 7);
    const descKgCol0 = COLK + (b.descColCount != null && b.descColCount > 0 ? b.descColCount : 10) - 1;

    /**
     * PROM mes por columna: promedio de los 2 últimos valores no vacíos y distintos de cero (orden arriba→abajo).
     * AGGREGATE(14,6,…) = LARGE ignorando #DIV/0! cuando (<>"")*(<>0)=0 en el denominador; evita MAX(rel*ok) que a menudo
     * no vectoriza y deja INDEX en 0 → celda en blanco.
     */
    const promLastTwoAvg = (colLetter) => {
      const rng = `${colLetter}${fwr}:${colLetter}${lwr}`;
      const s = `${colLetter}${fwr}`;
      const ok = `((${rng}<>"")*(${rng}<>0))`;
      const relOverOk = `(ROW(${rng})-ROW(${s})+1)/${ok}`;
      const i1 = `AGGREGATE(14,6,${relOverOk},1)`;
      const i2 = `AGGREGATE(14,6,${relOverOk},2)`;
      return (
        `IFERROR(IFERROR(AVERAGE(INDEX(${rng},${i1}),INDEX(${rng},${i2})),` +
        `LOOKUP(2,1/${ok},${rng})),"")`
      );
    };

    // —— Venta (ton): PROM, POR COMPRAR, PROY ——
    for (let j = 0; j < 7; j++) {
      const lett = col0ToLetter(1 + j);
      setCellFormula(worksheet, pr - 1, 1 + j, promLastTwoAvg(lett));
    }
    setCellFormula(worksheet, pr - 1, 8, `IFERROR(SUM(B${pr}:H${pr}),"")`);

    for (let j = 0; j < 7; j++) {
      const lett = col0ToLetter(1 + j);
      const n = Number(R[j]) || 0;
      setCellFormula(worksheet, porr - 1, 1 + j, `IFERROR(ROUND(${lett}${pr}*${n},2),"")`);
    }
    setCellFormula(worksheet, porr - 1, 8, `IFERROR(SUM(B${porr}:H${porr}),"")`);

    for (let j = 0; j < 7; j++) {
      const lett = col0ToLetter(1 + j);
      setCellFormula(worksheet, proyr - 1, 1 + j, `IFERROR(ROUND(${lett}${tr}+${lett}${porr},2),"")`);
    }
    setCellFormula(worksheet, proyr - 1, 8, `IFERROR(SUM(B${proyr}:H${proyr}),"")`);

    // —— Descuento: PROM mes ($/kg), PROM dinero, POR COMPRAR, PROY ——
    for (let j = 0; j < 7; j++) {
      const dLett = col0ToLetter(COLK + 1 + j);
      setCellFormula(worksheet, pr - 1, COLK + 1 + j, promLastTwoAvg(dLett));
    }
    setCellFormula(worksheet, pr - 1, COLK + 8, `IFERROR(AVERAGE(${dFirst}${pr}:${dLast}${pr}),"")`);

    for (let j = 0; j < 7; j++) {
      const vLett = col0ToLetter(1 + j);
      const dLett = col0ToLetter(COLK + 1 + j);
      setCellFormula(worksheet, pdr - 1, COLK + 1 + j, `IFERROR(ROUND(${dLett}${pr}*${vLett}${pr},2),"")`);
    }
    setCellFormula(worksheet, pdr - 1, COLK + 8, `IFERROR(SUM(${dFirst}${pdr}:${dLast}${pdr}),"")`);

    for (let j = 0; j < 7; j++) {
      const dLett = col0ToLetter(COLK + 1 + j);
      const n = Number(R[j]) || 0;
      setCellFormula(worksheet, porr - 1, COLK + 1 + j, `IFERROR(ROUND(${dLett}${pdr}*${n},2),"")`);
    }
    setCellFormula(worksheet, porr - 1, COLK + 8, `IFERROR(SUM(${dFirst}${porr}:${dLast}${porr}),"")`);

    for (let j = 0; j < 7; j++) {
      const dLett = col0ToLetter(COLK + 1 + j);
      setCellFormula(worksheet, proyr - 1, COLK + 1 + j, `IFERROR(ROUND(${dLett}${tr}+${dLett}${porr},2),"")`);
    }
    setCellFormula(worksheet, proyr - 1, COLK + 8, `IFERROR(SUM(${dFirst}${proyr}:${dLast}${proyr}),"")`);
    setCellFormula(
      worksheet,
      proyr - 1,
      descKgCol0,
      `IFERROR(SUM(${dFirst}${proyr}:${dLast}${proyr})/SUM(B${proyr}:H${proyr}),"")`
    );

    // Formatos numéricos (tras reemplazar por fórmulas)
    for (const er of [pr, porr, proyr]) {
      for (let j = 0; j < 7; j++) {
        worksheet.getCell(er, j + 2).numFmt = FMT_NUMBER;
      }
      worksheet.getCell(er, 9).numFmt = FMT_NUMBER;
    }
    for (const er of [pdr, porr, proyr]) {
      for (let j = 0; j < 7; j++) {
        worksheet.getCell(er, COLK + 2 + j).numFmt = FMT_CURRENCY_MXN;
      }
      worksheet.getCell(er, COLK + 9).numFmt = FMT_CURRENCY_MXN;
    }
    for (let j = 0; j < 7; j++) {
      worksheet.getCell(pr, COLK + 2 + j).numFmt = FMT_NUMBER;
    }
    worksheet.getCell(pr, COLK + 9).numFmt = FMT_NUMBER;
    const dkg = worksheet.getCell(proyr, descKgCol0 + 1);
    dkg.numFmt = FMT_DESC_KG_COL;
    dkg.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  }
}

function igfNumFmtForColumn(nCol, c0) {
  if (nCol === 18) {
    if (c0 === 1) return FMT_NUMBER_INT;
    if (c0 === 6) return FMT_HG_DECIMALS;
    if (c0 === 11 || c0 === 17) return FMT_CURRENCY_MXN_INT;
    return FMT_NUMBER;
  }
  if (nCol === 20) {
    if (c0 === 1) return FMT_NUMBER_INT;
    if (c0 === 8) return FMT_PCT_DISPLAY;
    if (c0 === 13 || c0 === 19) return FMT_CURRENCY_MXN_INT;
    return FMT_NUMBER;
  }
  return FMT_NUMBER;
}

function applyBordersRangeBlack(worksheet, r0Top, c0Left, r0Bottom, c0Right) {
  for (let r = r0Top; r <= r0Bottom; r++) {
    for (let c = c0Left; c <= c0Right; c++) {
      const cell = worksheet.getCell(r + 1, c + 1);
      cell.border = {
        top: BORDER_BLACK,
        left: BORDER_BLACK,
        bottom: BORDER_BLACK,
        right: BORDER_BLACK,
      };
    }
  }
}

/**
 * Hoja "IGF Forecast": fusiones fila 6, encabezados azul #1F4E78, título mes, formatos numéricos,
 * bloque provincia (etiquetas grises, fila Zona), bordes negros.
 * @param {import('exceljs').Worksheet} worksheet
 * @param {object} opt
 * @param {number} opt.nCol - 18 (Compromiso) o 20 (Forecast API)
 * @param {string[]} opt.headerRow6 - celdas fila 6 para fusionar consecutivos
 * @param {number} opt.dataStartRow0 - primera fila datos tabla superior (típ. 8)
 * @param {number} opt.dataRowCount
 * @param {number} opt.row0Header - fila 0-based del encabezado del bloque resumen provincia
 * @param {number} opt.resumenPlantCount - típ. 6
 * @param {number} opt.lastRow0 - última fila 0-based del AOA (para bordes)
 */
function applyIgfForecastSheetLayout(worksheet, opt) {
  const nCol = opt.nCol;
  const hr6 = opt.headerRow6 || [];
  const excelRow6 = 6;
  const excelRow7 = 7;
  let i = 0;
  while (i < hr6.length) {
    let j = i + 1;
    while (j < hr6.length && String(hr6[j] || "") === String(hr6[i] || "")) j++;
    if (j - i > 1) {
      try {
        worksheet.mergeCells(excelRow6, i + 1, excelRow6, j);
      } catch {
        /* ignore */
      }
    }
    i = j;
  }
  for (const er of [excelRow6, excelRow7]) {
    for (let c = 1; c <= nCol; c++) {
      const cell = worksheet.getCell(er, c);
      cell.fill = FILL_IGF_HEADER;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { top: BORDER_BLACK, left: BORDER_BLACK, bottom: BORDER_BLACK, right: BORDER_BLACK };
    }
  }
  const t = worksheet.getCell(1, 1);
  if (t.value != null && String(t.value).trim() !== "") {
    t.font = { bold: true, color: { argb: "FF000000" }, size: 12 };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    t.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  }
  const dataStart = opt.dataStartRow0;
  const dataEnd = dataStart + opt.dataRowCount - 1;
  for (let r0 = dataStart; r0 <= dataEnd; r0++) {
    const er = r0 + 1;
    for (let c0 = 0; c0 < nCol; c0++) {
      const cell = worksheet.getCell(er, c0 + 1);
      const v = cell.value;
      if (c0 === 0) {
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        continue;
      }
      const isFormula = v && typeof v === "object" && v.formula != null;
      if (typeof v === "number" && Number.isFinite(v)) {
        cell.numFmt = igfNumFmtForColumn(nCol, c0);
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (isFormula) {
        cell.numFmt = igfNumFmtForColumn(nCol, c0);
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    }
  }
  const hR0 = opt.row0Header;
  const nP = opt.resumenPlantCount != null ? opt.resumenPlantCount : 6;
  if (hR0 != null && hR0 >= 0) {
    const hdrExcel = hR0 + 1;
    for (let c = 1; c <= nCol; c++) {
      const cell = worksheet.getCell(hdrExcel, c);
      cell.fill = FILL_IGF_HEADER;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { top: BORDER_BLACK, left: BORDER_BLACK, bottom: BORDER_BLACK, right: BORDER_BLACK };
    }
    for (let p = 0; p < nP; p++) {
      const er = hR0 + 2 + p;
      for (let c0 = 0; c0 < nCol; c0++) {
        const cell = worksheet.getCell(er, c0 + 1);
        const v = cell.value;
        const isFormula = v && typeof v === "object" && v.formula != null;
        if (c0 === 0) {
          cell.fill = FILL_IGF_LABEL_ROW;
          cell.font = { bold: true, color: { argb: "FF000000" }, size: 11 };
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else if ((typeof v === "number" && Number.isFinite(v)) || isFormula) {
          cell.numFmt = igfNumFmtForColumn(nCol, c0);
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
        cell.border = { top: BORDER_BLACK, left: BORDER_BLACK, bottom: BORDER_BLACK, right: BORDER_BLACK };
      }
    }
    const erZona = hR0 + 2 + nP;
    const zonaImporteCols =
      nCol === 18 ? [11, 17] : nCol === 20 ? [13, 19] : [];
    for (let c0 = 0; c0 < nCol; c0++) {
      const cell = worksheet.getCell(erZona, c0 + 1);
      const v = cell.value;
      const isFormula = v && typeof v === "object" && v.formula != null;
      if (c0 === 0) {
        cell.fill = FILL_IGF_ZONA_A;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if ((typeof v === "number" && Number.isFinite(v)) || isFormula) {
        if (c0 === 1) cell.numFmt = FMT_NUMBER_INT;
        else if (nCol === 18 && (c0 === 11 || c0 === 17)) cell.numFmt = FMT_CURRENCY_MXN_INT;
        else if (nCol === 20 && (c0 === 13 || c0 === 19)) cell.numFmt = FMT_CURRENCY_MXN_INT;
        else cell.numFmt = igfNumFmtForColumn(nCol, c0);
        const impZona = zonaImporteCols.includes(c0);
        cell.fill = impZona ? FILL_IGF_ZONA_A : FILL_WHITE;
        cell.font = {
          bold: true,
          color: { argb: impZona ? "FFFFFFFF" : "FF000000" },
          size: 11,
        };
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      cell.border = { top: BORDER_BLACK, left: BORDER_BLACK, bottom: BORDER_BLACK, right: BORDER_BLACK };
    }
  }
  const lastR = opt.lastRow0 != null ? opt.lastRow0 : dataEnd;
  applyBordersRangeBlack(worksheet, 5, 0, lastR, nCol - 1);
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
  applyPronosticoSummaryFormulas,
  applyIgfForecastSheetLayout,
  applyBordersRangeBlack,
};
