import ExcelJS from "exceljs";

export type ArrExportMetahgLine = {
  categoria: string;
  prom: number | null;
  kilos: number | null;
  comision: number | null;
  total: number | null;
  pct: number | null;
  kilos_h: number | null;
  is_total_row: boolean;
};

export type ArrExportMetahgForMeta = {
  empresa: string;
  mesLabel?: string;
  version_number?: number | null;
  lines: ArrExportMetahgLine[];
};

const META_SHEET_NAME = "META";
const START_ROW = 30;

const FILL_NAVY = "FF1F4E78";
const FILL_TITLE = "FFE8EEF4";
const FILL_TOTAL_COL = "FFFFFF00";
const FILL_ALT = "FFF7F7F7";
const FONT_HEADER = "FFFFFFFF";
const BORDER_GRID = {
  top: { style: "thin" as const, color: { argb: "FFBFBFBF" } },
  left: { style: "thin" as const, color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin" as const, color: { argb: "FFBFBFBF" } },
  right: { style: "thin" as const, color: { argb: "FFBFBFBF" } },
};

const COL = {
  categoria: 1,
  prom: 2,
  kilos: 3,
  comision: 4,
  total: 5,
  pct: 7,
  kilos_h: 8,
} as const;

const LAST_COL = 8;

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = BORDER_GRID;
}

function styleHeaderCell(cell: ExcelJS.Cell, value: string, yellow = false) {
  cell.value = value;
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: yellow ? FILL_TOTAL_COL : FILL_NAVY },
  };
  cell.font = {
    bold: true,
    color: { argb: yellow ? "FF000000" : FONT_HEADER },
    size: 10,
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  applyBorder(cell);
}

function setNumCell(
  cell: ExcelJS.Cell,
  v: number | null,
  numFmt: string,
  opts?: { bold?: boolean; fillArgb?: string; fontColor?: string }
) {
  if (v == null || !Number.isFinite(v)) {
    cell.value = null;
  } else {
    cell.value = v;
  }
  cell.numFmt = numFmt;
  cell.alignment = { vertical: "middle", horizontal: "right" };
  if (opts?.fillArgb) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fillArgb } };
  }
  if (opts?.bold) cell.font = { bold: true, color: opts?.fontColor ? { argb: opts.fontColor } : undefined };
  applyBorder(cell);
}

function pctDisplay(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (Math.abs(v) <= 1.5) return v;
  return v / 100;
}

/**
 * Inserta bloque METAHG de la planta en hoja META desde A30 (mismo layout que Excel Evaluacion).
 */
export function appendMetahgToMetaSheet(
  wb: ExcelJS.Workbook,
  block: ArrExportMetahgForMeta
): void {
  const ws = wb.getWorksheet(META_SHEET_NAME);
  if (!ws || !block.lines.length) return;

  let r = START_ROW;

  ws.mergeCells(r, 1, r, LAST_COL);
  const titleCell = ws.getCell(r, 1);
  const sub = block.mesLabel
    ? ` · ${block.mesLabel}${block.version_number != null ? ` · v${block.version_number}` : ""}`
    : "";
  titleCell.value = `METAHG · ${block.empresa}${sub}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_TITLE } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  r += 1;

  const hdr = ws.getRow(r);
  styleHeaderCell(hdr.getCell(COL.categoria), "VENTAS");
  styleHeaderCell(hdr.getCell(COL.prom), "PROM.");
  styleHeaderCell(hdr.getCell(COL.kilos), "KILOS");
  styleHeaderCell(hdr.getCell(COL.comision), "COMISION");
  styleHeaderCell(hdr.getCell(COL.total), "TOTAL", true);
  styleHeaderCell(hdr.getCell(COL.pct), "%");
  styleHeaderCell(hdr.getCell(COL.kilos_h), "KILOS");
  hdr.height = 20;
  r += 1;

  let alt = 0;
  for (const line of block.lines) {
    const row = ws.getRow(r);
    const isTotal = line.is_total_row || line.categoria.toUpperCase() === "TOTAL";
    const catCell = row.getCell(COL.categoria);
    catCell.value = line.categoria;
    catCell.alignment = { vertical: "middle", horizontal: "left" };
    applyBorder(catCell);

    const rowFill = isTotal ? FILL_NAVY : alt % 2 === 0 ? FILL_ALT : undefined;
    const fontWhite = isTotal ? FONT_HEADER : undefined;

    if (isTotal) {
      catCell.font = { bold: true, color: { argb: FONT_HEADER } };
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_NAVY } };
    } else if (rowFill) {
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
    }

    setNumCell(row.getCell(COL.prom), line.prom, "#,##0.000", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : rowFill,
      fontColor: fontWhite,
    });
    setNumCell(row.getCell(COL.kilos), line.kilos, "#,##0", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : rowFill,
      fontColor: fontWhite,
    });
    setNumCell(row.getCell(COL.comision), line.comision, "#,##0", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : rowFill,
      fontColor: fontWhite,
    });
    setNumCell(row.getCell(COL.total), line.total, "#,##0", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : FILL_TOTAL_COL,
      fontColor: isTotal ? FONT_HEADER : "FF000000",
    });
    setNumCell(row.getCell(COL.pct), pctDisplay(line.pct), "0.00%", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : rowFill,
      fontColor: fontWhite,
    });
    setNumCell(row.getCell(COL.kilos_h), line.kilos_h, "#,##0.000", {
      bold: isTotal,
      fillArgb: isTotal ? FILL_NAVY : rowFill,
      fontColor: fontWhite,
    });

    r += 1;
    alt += 1;
  }

  ws.getColumn(COL.categoria).width = 22;
  ws.getColumn(COL.prom).width = 10;
  ws.getColumn(COL.kilos).width = 12;
  ws.getColumn(COL.comision).width = 12;
  ws.getColumn(COL.total).width = 14;
  ws.getColumn(COL.pct).width = 8;
  ws.getColumn(COL.kilos_h).width = 12;
}
