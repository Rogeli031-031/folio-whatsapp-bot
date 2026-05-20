import ExcelJS from "exceljs";
import type {
  ArrExportMovimientoClienteRow,
  ArrExportSubcategoriaResumenRow,
} from "@/lib/arr-export-movimiento-categoria";

const F_HEADER = "FF1F3864";
const FONT_HEADER = "FFFFFFFF";
const F_TITLE = "FFE8EEF4";
const F_SECTION_DEJARON = "FF4A5568";
const F_SECTION_DIS = "FFB91C1C";
const F_SECTION_AUM = "FF047857";
const F_SECTION_NUE = "FF334155";
const F_DATA = "FFF7F7F7";
const F_TOTAL = "FFDDE4EC";

const DESC_RESUMEN =
  "Venta en toneladas y comisión proyectada del mes (kg × $/kg desc. en magnitud positiva; en plan el descuento firmado se invierte para alinear con clientes), alineado al forecast del tablero: exclusiones «Sin venta», simulación «Con venta» y clientes nuevos del plan manual que suman al mes.";

/** Quita caracteres de control que invalidan el XML del .xlsx. */
function sanitizeExcelText(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function styleMergedTitleCell(
  cell: ExcelJS.Cell,
  value: string,
  opts?: { font?: Partial<ExcelJS.Font>; fillArgb?: string }
) {
  cell.value = sanitizeExcelText(value);
  cell.font = opts?.font ?? { bold: true, size: 11 };
  if (opts?.fillArgb) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fillArgb } };
  }
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function fmtComisionPorKg(ventaTon: number, comisionMxn: number): number | null {
  const kg = ventaTon * 1000;
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const porKg = comisionMxn / kg;
  return Number.isFinite(porKg) ? porKg : null;
}

function styleHeaderRow(row: ExcelJS.Row, lastCol: number) {
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 20;
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > lastCol) return;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_HEADER } };
    cell.font = { bold: true, color: { argb: FONT_HEADER }, size: 10 };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
}

/** Estilo solo en la celda maestra de un rango ya combinado (evita corrupción en B:H). */
function styleSectionMasterCell(cell: ExcelJS.Cell, fillArgb: string) {
  cell.value = sanitizeExcelText(cell.value);
  cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
}

function sectionFill(movimiento: string): string {
  if (movimiento === "Dejaron de comprar") return F_SECTION_DEJARON;
  if (movimiento === "Disminuyeron") return F_SECTION_DIS;
  if (movimiento === "Aumentaron") return F_SECTION_AUM;
  return F_SECTION_NUE;
}

function writeResumenSubcategoria(
  ws: ExcelJS.Worksheet,
  categoriaLabel: "CASA" | "COMISIONISTA",
  rows: ArrExportSubcategoriaResumenRow[],
  mesForecastLabel?: string
): number {
  let r = 1;
  ws.mergeCells(r, 1, r, 4);
  styleMergedTitleCell(ws.getCell(r, 1), `Resumen por subcategoría · ${categoriaLabel}`, {
    font: { bold: true, size: 12 },
    fillArgb: F_TITLE,
  });
  r += 1;

  if (mesForecastLabel) {
    ws.mergeCells(r, 1, r, 4);
    styleMergedTitleCell(ws.getCell(r, 1), `Forecast: ${mesForecastLabel}`, {
      font: { size: 9, italic: true, color: { argb: "FF555555" } },
    });
    r += 1;
  }

  ws.mergeCells(r, 1, r + 1, 4);
  const desc = ws.getCell(r, 1);
  desc.value = sanitizeExcelText(DESC_RESUMEN);
  desc.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
  desc.font = { size: 9, color: { argb: "FF555555" } };
  ws.getRow(r).height = 28;
  ws.getRow(r + 1).height = 14;
  r += 3;

  const hdr = ws.getRow(r);
  hdr.values = [
    "Subcategoría",
    "Venta (t)",
    "Comisión proyectada ($)",
    "Comisión proyectada $/kg",
  ];
  styleHeaderRow(hdr, 4);
  r += 1;

  for (const row of rows) {
    const data = ws.getRow(r);
    const porKg = fmtComisionPorKg(row.ventaTon, row.comisionProyectadaMxn);
    data.values = [
      sanitizeExcelText(row.subcategoria),
      row.ventaTon,
      row.comisionProyectadaMxn,
      porKg,
    ];
    data.getCell(2).numFmt = "#,##0.00";
    data.getCell(3).numFmt = '"$"#,##0';
    data.getCell(4).numFmt = porKg != null ? '"$"#,##0.000' : "@";
    if (row.esTotal) {
      data.font = { bold: true };
      data.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 4) return;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TOTAL } };
      });
    } else {
      data.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 4) return;
        if (col === 1) {
          cell.alignment = { horizontal: "left" };
        } else {
          cell.alignment = { horizontal: "right" };
        }
        if (r % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_DATA } };
        }
      });
    }
    r += 1;
  }

  return r + 1;
}

const CLIENTE_HEADERS = [
  "Cliente",
  "Categoría",
  "Subcategoría",
  "Δ Toneladas",
  "Δ Ingreso",
  "Última compra",
  "Estado",
  "Frecuencia",
] as const;

const LAST_COL_CLIENTES = CLIENTE_HEADERS.length;

function writeClientesMovimiento(
  ws: ExcelJS.Worksheet,
  startRow: number,
  clientes: ArrExportMovimientoClienteRow[]
): number {
  let r = startRow;
  ws.mergeCells(r, 1, r, LAST_COL_CLIENTES);
  styleMergedTitleCell(ws.getCell(r, 1), "Movimiento de clientes", {
    font: { bold: true, size: 11 },
  });
  r += 2;

  const ordenMov = [
    "Dejaron de comprar",
    "Disminuyeron",
    "Aumentaron",
    "Nuevos",
  ];

  for (const mov of ordenMov) {
    const grupo = clientes.filter((c) => c.movimiento === mov);
    if (!grupo.length) continue;

    ws.mergeCells(r, 1, r, LAST_COL_CLIENTES);
    const secCell = ws.getCell(r, 1);
    secCell.value = mov.toUpperCase();
    styleSectionMasterCell(secCell, sectionFill(mov));
    r += 1;

    const hdr = ws.getRow(r);
    hdr.values = [...CLIENTE_HEADERS];
    styleHeaderRow(hdr, LAST_COL_CLIENTES);
    r += 1;

    let alt = 0;
    for (const c of grupo) {
      const data = ws.getRow(r);
      data.values = [
        sanitizeExcelText(c.cliente),
        sanitizeExcelText(c.categoria),
        sanitizeExcelText(c.subcategoria),
        sanitizeExcelText(c.deltaTon),
        sanitizeExcelText(c.deltaIngreso),
        sanitizeExcelText(c.ultimaCompra),
        sanitizeExcelText(c.estado),
        sanitizeExcelText(c.frecuenciaDias),
      ];
      data.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      data.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      data.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
      for (let col = 4; col <= LAST_COL_CLIENTES; col++) {
        data.getCell(col).alignment = { horizontal: "center", vertical: "middle" };
      }
      if (alt % 2 === 0) {
        data.eachCell({ includeEmpty: true }, (cell, col) => {
          if (col > LAST_COL_CLIENTES) return;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_DATA } };
        });
      }
      if (c.origen === "plan") {
        data.getCell(1).font = { italic: true };
      }
      alt += 1;
      r += 1;
    }
    r += 1;
  }

  if (!clientes.length) {
    ws.mergeCells(r, 1, r, LAST_COL_CLIENTES);
    styleMergedTitleCell(ws.getCell(r, 1), "Sin datos de movimiento (DICF no disponible).", {
      font: { italic: true, color: { argb: "FF888888" } },
    });
    r += 1;
  }

  return r;
}

export function appendCategoriaMovimientoSheets(
  wb: ExcelJS.Workbook,
  opts: {
    resumenSubcategoria: {
      casa: ArrExportSubcategoriaResumenRow[];
      comisionista: ArrExportSubcategoriaResumenRow[];
    };
    clientesCasa: ArrExportMovimientoClienteRow[];
    clientesComisionista: ArrExportMovimientoClienteRow[];
    mesForecastLabel?: string;
  }
): void {
  const pairs: Array<{
    name: "CASA" | "COMISIONISTA";
    resumen: ArrExportSubcategoriaResumenRow[];
    clientes: ArrExportMovimientoClienteRow[];
  }> = [
    { name: "CASA", resumen: opts.resumenSubcategoria.casa, clientes: opts.clientesCasa },
    {
      name: "COMISIONISTA",
      resumen: opts.resumenSubcategoria.comisionista,
      clientes: opts.clientesComisionista,
    },
  ];

  for (const { name, resumen, clientes } of pairs) {
    const ws = wb.addWorksheet(name, {
      properties: { defaultRowHeight: 18 },
      views: [{ showGridLines: true }],
    });
    const afterResumen = writeResumenSubcategoria(ws, name, resumen, opts.mesForecastLabel);
    writeClientesMovimiento(ws, afterResumen + 1, clientes);
    ws.columns = [
      { width: 36 },
      { width: 14 },
      { width: 18 },
      { width: 14 },
      { width: 16 },
      { width: 22 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
    ];
  }
}
