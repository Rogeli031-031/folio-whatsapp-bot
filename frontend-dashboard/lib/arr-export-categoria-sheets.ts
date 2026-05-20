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

function fmtMxn(v: number): string {
  return v.toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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

function styleSectionRow(row: ExcelJS.Row, lastCol: number, fillArgb: string) {
  row.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > lastCol) return;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
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
  ws.mergeCells(r, 1, r, 8);
  const title = ws.getCell(r, 1);
  title.value = `Resumen por subcategoría · ${categoriaLabel}`;
  title.font = { bold: true, size: 12 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TITLE } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  r += 1;

  if (mesForecastLabel) {
    ws.mergeCells(r, 1, r, 8);
    ws.getCell(r, 1).value = `Forecast: ${mesForecastLabel}`;
    ws.getCell(r, 1).font = { size: 9, italic: true, color: { argb: "FF555555" } };
    r += 1;
  }

  ws.mergeCells(r, 1, r + 1, 8);
  const desc = ws.getCell(r, 1);
  desc.value = DESC_RESUMEN;
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
      row.subcategoria,
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
  ws.getCell(r, 1).value = "Movimiento de clientes";
  ws.getCell(r, 1).font = { bold: true, size: 11 };
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
    const sec = ws.getRow(r);
    sec.getCell(1).value = mov.toUpperCase();
    styleSectionRow(sec, LAST_COL_CLIENTES, sectionFill(mov));
    r += 1;

    const hdr = ws.getRow(r);
    hdr.values = [...CLIENTE_HEADERS];
    styleHeaderRow(hdr, LAST_COL_CLIENTES);
    r += 1;

    let alt = 0;
    for (const c of grupo) {
      const data = ws.getRow(r);
      data.values = [
        c.cliente,
        c.categoria,
        c.subcategoria,
        c.deltaTon,
        c.deltaIngreso,
        c.ultimaCompra,
        c.estado,
        c.frecuenciaDias,
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
    ws.getCell(r, 1).value = "Sin datos de movimiento (DICF no disponible).";
    ws.getCell(r, 1).font = { italic: true, color: { argb: "FF888888" } };
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
      views: [{ state: "frozen", ySplit: 0 }],
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
