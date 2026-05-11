import ExcelJS from "exceljs";

/** Métricas del resumen ARR (mismos campos que en pantalla). */
export type ArrExportResumenMetrics = {
  operativos: number | null;
  corporativos: number | null;
  gastoImporte: number | null;
  margenKg: number | null;
  hgDisplay: number | null;
  hgDinero: number | null;
  descuentoSigned: number | null;
  impuestoKg: number | null;
  ventaTon: number | null;
  rentabilidadImporte: number | null;
};

export type ArrExportClienteRow = {
  cliente: string;
  ventaA: number | null;
  ventaB: number | null;
  descA: number | null;
  descB: number | null;
  /** Solo hoja ARR Plan (export). */
  sinVentaForecast?: boolean;
  conVentaForecastSim?: boolean;
};

function safeFilePart(s: string): string {
  return s.replace(/[/\\?*[\]:'"]/g, "_").trim().replace(/\s+/g, "_");
}

/** Convierte número o vacío en valor de celda (sin escribir 0 fantasma). */
function cellNum(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return v;
}

/** Índice de columna 1-based → letra Excel (A, B, …, Z, AA…). */
function excelColLetter(colIndex: number): string {
  let n = colIndex;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Toneladas CASA / COMISIONISTA (misma fuente que el dashboard). */
export type ArrExportResumenCategoriaTon = {
  casaTon: number | null;
  comisionistaTon: number | null;
};

export type ArrExportOptions = {
  empresa: string;
  selA: string;
  selB: string;
  labelMesA: string;
  labelMesB: string;
  comparacionLabel: string;
  mA: ArrExportResumenMetrics;
  mB: ArrExportResumenMetrics;
  resumenExtrasA: ArrExportResumenCategoriaTon;
  resumenExtrasB: ArrExportResumenCategoriaTon;
  headerVentaA: string;
  headerVentaB: string;
  headerDescA: string;
  headerDescB: string;
  headerIngresoA: string;
  headerIngresoB: string;
  filasClientesMesPrimero: ArrExportClienteRow[];
  filasClientesSoloMesSegundo: ArrExportClienteRow[];
  usarFormulasComparacion: boolean;
  /**
   * Si true (mes cerrado), M5/M6 de rentabilidad = SUM(ingresos clientes)−Gasto cuando hay filas.
   * Si false (mes forecast), se usa siempre mA/mB.rentabilidadImporte (IGF).
   * Por defecto true para no cambiar exportaciones antiguas.
   */
  rentabilidadMesAFormulaClientes?: boolean;
  rentabilidadMesBFormulaClientes?: boolean;
  /** Solo para la hoja ARR Plan. */
  nuevosClientesPlan?: {
    nombre: string;
    kg: number;
    descKg: number;
    gastoMxn: number;
    responsable: string;
    categoria: "CASA" | "COMISIONISTA";
    subcategoria: string;
    /** null/undefined: fórmula usa HG del mes resumen. */
    hgCliente?: number | null;
    /** null/undefined: fórmula usa HG$ del mes resumen. */
    hgCompra?: number | null;
  }[];
  /** Columnas «Sin venta» / «Con venta» en clientes (solo ARR Plan). */
  marcasForecastEnClientes?: boolean;
};

type ArrExportBuildOptions = {
  workbook?: ExcelJS.Workbook;
  sheetName?: string;
  skipDownload?: boolean;
  filename?: string;
};

const F_HEADER = "FF1F3864";
const FONT_HEADER = "FFFFFFFF";
const F_DATA = "FFF7E7D7";
const F_COMP = "FFDEC8A0";
const F_SEP = "FFEEE6DD";

function styleHeaderRow(row: ExcelJS.Row, lastCol: number) {
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 22;
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

function styleDataRow(
  row: ExcelJS.Row,
  lastCol: number,
  centerCols: number[],
  clienteCol = 1
) {
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > lastCol) return;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_DATA } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFC8C8C8" } },
      left: { style: "thin", color: { argb: "FFC8C8C8" } },
      bottom: { style: "thin", color: { argb: "FFC8C8C8" } },
      right: { style: "thin", color: { argb: "FFC8C8C8" } },
    };
    if (col === clienteCol) {
      cell.alignment = { vertical: "middle", horizontal: "left" };
    } else if (centerCols.includes(col)) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });
}

function styleCompRow(row: ExcelJS.Row, lastCol: number) {
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.font = { bold: true };
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > lastCol) return;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_COMP } };
    cell.border = {
      top: { style: "medium", color: { argb: "FFB8860B" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
}

/**
 * ARR export: estilos y fórmulas. Los nombres de función deben ir en inglés (ROUND/IFERROR/SUM):
 * el .xlsx (OOXML) los evalúa así; si se escriben REDONDEAR/SI.ERROR/SUMA, Excel muestra #¿NOMBRE?
 * hasta reconfirmar la celda. Excel en español sigue mostrando las fórmulas localizadas en la barra.
 */
export async function downloadArrDashboardExcel(opts: ArrExportOptions): Promise<void> {
  return downloadArrDashboardExcelInternal(opts, {});
}

async function downloadArrDashboardExcelInternal(
  opts: ArrExportOptions,
  build: ArrExportBuildOptions
): Promise<void> {
  const {
    empresa,
    labelMesA,
    labelMesB,
    comparacionLabel,
    mA,
    mB,
    resumenExtrasA,
    resumenExtrasB,
    headerVentaA,
    headerVentaB,
    headerDescA,
    headerDescB,
    headerIngresoA,
    headerIngresoB,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    usarFormulasComparacion,
    rentabilidadMesAFormulaClientes = true,
    rentabilidadMesBFormulaClientes = true,
    nuevosClientesPlan = [],
    marcasForecastEnClientes = false,
  } = opts;

  const wb = build.workbook ?? new ExcelJS.Workbook();
  const wsName = build.sheetName || "ARR";
  const ws = wb.addWorksheet(wsName, {
    properties: { defaultRowHeight: 18 },
    views: [{ showGridLines: true }],
  });

  const LAST_SUMMARY_COL = 13;
  const MES_A_R = 5;
  const MES_B_R = 6;

  let cur = 1;
  ws.getRow(cur).getCell(1).value = `${wsName} · IGF Forecast · exportación`;
  cur++;
  ws.getRow(cur).getCell(1).value = "Empresa";
  ws.getRow(cur).getCell(2).value = empresa;
  cur++;
  ws.getRow(cur).getCell(1).value = "Comparación";
  ws.getRow(cur).getCell(2).value = comparacionLabel || "";
  cur++;

  const headerLabels = [
    "Mes",
    "Venta",
    "Margen",
    "Descuento",
    "Operativos",
    "Corporativos",
    "Gasto",
    "HG",
    "HG$",
    "Impuestos",
    "CASA (t)",
    "COMISIONISTA (t)",
    "Rentabilidad",
  ];
  const hRow = ws.getRow(cur);
  headerLabels.forEach((t, i) => {
    hRow.getCell(i + 1).value = t;
  });
  styleHeaderRow(hRow, LAST_SUMMARY_COL);
  cur++;

  function fillMesRow(
    rowNum: number,
    label: string,
    m: ArrExportResumenMetrics,
    ex: ArrExportResumenCategoriaTon,
    skipRentab: boolean
  ) {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(2).value = cellNum(m.ventaTon);
    row.getCell(2).numFmt = "#,##0";
    row.getCell(3).value = cellNum(m.margenKg);
    row.getCell(3).numFmt = "#,##0.00";
    row.getCell(4).value = cellNum(m.descuentoSigned);
    row.getCell(4).numFmt = "#,##0.00";
    row.getCell(5).value = cellNum(m.operativos);
    row.getCell(5).numFmt = '"$" #,##0';
    row.getCell(6).value = cellNum(m.corporativos);
    row.getCell(6).numFmt = '"$" #,##0';
    row.getCell(7).value = cellNum(m.gastoImporte);
    row.getCell(7).numFmt = "#,##0";
    row.getCell(8).value = cellNum(m.hgDisplay);
    row.getCell(8).numFmt = "#,##0.00";
    row.getCell(9).value = cellNum(m.hgDinero);
    row.getCell(9).numFmt = '"$" #,##0.00';
    row.getCell(10).value = cellNum(m.impuestoKg);
    row.getCell(10).numFmt = "#,##0.00";
    row.getCell(11).value = cellNum(ex.casaTon);
    row.getCell(11).numFmt = "#,##0.00";
    row.getCell(12).value = cellNum(ex.comisionistaTon);
    row.getCell(12).numFmt = "#,##0.00";
    if (!skipRentab) {
      row.getCell(13).value = cellNum(m.rentabilidadImporte);
      row.getCell(13).numFmt = '"$" #,##0';
    }
    styleDataRow(row, LAST_SUMMARY_COL, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  }

  fillMesRow(cur, labelMesA || "(Mes A)", mA, resumenExtrasA, true);
  cur++;
  fillMesRow(cur, labelMesB || "(Mes B)", mB, resumenExtrasB, true);
  cur++;

  const compRow = ws.getRow(cur);
  compRow.getCell(1).value = comparacionLabel
    ? `COMPARACION (${comparacionLabel})`
    : "COMPARACION";
  if (usarFormulasComparacion) {
    for (let c = 2; c <= LAST_SUMMARY_COL; c++) {
      if (c === 13) {
        compRow.getCell(c).value = {
          formula: `M${MES_B_R}-M${MES_A_R}`,
        };
        compRow.getCell(c).numFmt = '"$" #,##0';
        continue;
      }
      const letter = ws.getColumn(c).letter;
      compRow.getCell(c).value = { formula: `${letter}${MES_B_R}-${letter}${MES_A_R}` };
      if (c === 2 || c === 7) compRow.getCell(c).numFmt = "#,##0";
      else if (c === 5 || c === 6) compRow.getCell(c).numFmt = '"$" #,##0';
      else if (c === 9) compRow.getCell(c).numFmt = '"$" #,##0.00';
      else if (c === 11 || c === 12) compRow.getCell(c).numFmt = "#,##0.00";
      else compRow.getCell(c).numFmt = "#,##0.00";
    }
  } else {
    for (let c = 2; c <= LAST_SUMMARY_COL; c++) {
      compRow.getCell(c).value = "";
    }
  }
  styleCompRow(compRow, LAST_SUMMARY_COL);
  cur++;

  if ((build.sheetName || "ARR") === "ARR Plan" && nuevosClientesPlan.length > 0) {
    ws.getRow(cur).getCell(1).value = "";
    cur++;
    ws.getRow(cur).getCell(1).value = "Nuevos clientes (plan)";
    ws.getRow(cur).font = { bold: true, size: 11 };
    cur++;
    const hdr = ws.getRow(cur);
    const labels = [
      "Cliente",
      "Categoría",
      "Subcategoría",
      "Responsable",
      "Kg",
      "Desc. $/kg",
      "Gasto",
      "HG cliente",
      "HG compra",
      "Ingreso marginal",
    ];
    labels.forEach((t, i) => (hdr.getCell(i + 1).value = t));
    styleHeaderRow(hdr, 10);
    cur++;
    const centerCols = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const n of nuevosClientesPlan) {
      const r = ws.getRow(cur);
      r.getCell(1).value = n.nombre;
      r.getCell(2).value = n.categoria;
      r.getCell(3).value = n.subcategoria;
      r.getCell(4).value = n.responsable;
      r.getCell(5).value = cellNum(n.kg);
      r.getCell(5).numFmt = "#,##0";
      r.getCell(6).value = cellNum(n.descKg);
      r.getCell(6).numFmt = "#,##0.00";
      r.getCell(7).value = cellNum(n.gastoMxn);
      r.getCell(7).numFmt = "#,##0";
      const hgC = n.hgCliente;
      if (hgC != null && Number.isFinite(hgC)) {
        r.getCell(8).value = cellNum(hgC);
        r.getCell(8).numFmt = "#,##0.00";
      } else {
        r.getCell(8).value = null;
      }
      const hgCp = n.hgCompra;
      if (hgCp != null && Number.isFinite(hgCp)) {
        r.getCell(9).value = cellNum(hgCp);
        r.getCell(9).numFmt = "#,##0.00";
      } else {
        r.getCell(9).value = null;
      }
      r.getCell(10).value = {
        formula: `ROUND(IFERROR((E${cur}*($C$${MES_B_R}-ABS(F${cur})))+(IF(ISBLANK(H${cur}),$H$${MES_B_R},H${cur})*E${cur}*IF(ISBLANK(I${cur}),$I$${MES_B_R},I${cur})/100),0),0)`,
      };
      r.getCell(10).numFmt = '"$" #,##0';
      styleDataRow(r, 10, centerCols);
      cur++;
    }
  }

  ws.getRow(cur).getCell(1).value = "";
  cur++;
  ws.getRow(cur).getCell(1).value = "Clientes por mes";
  ws.getRow(cur).font = { bold: true, size: 11 };
  cur++;
  ws.getRow(cur).getCell(1).value = "";
  cur++;

  const MF = marcasForecastEnClientes;
  const C = MF
    ? {
        sinV: 1,
        conV: 2,
        cli: 3,
        vA: 4,
        vB: 5,
        dV: 6,
        dA: 7,
        dB: 8,
        dDesc: 9,
        ingA: 10,
        ingB: 11,
        dIng: 12,
        last: 12,
      }
    : {
        sinV: 0,
        conV: 0,
        cli: 1,
        vA: 2,
        vB: 3,
        dV: 4,
        dA: 5,
        dB: 6,
        dDesc: 7,
        ingA: 8,
        ingB: 9,
        dIng: 10,
        last: 10,
      };
  const Lc = (i: number) => excelColLetter(i);

  const cliHeaders = MF
    ? [
        "Sin venta",
        "Con venta",
        "Cliente",
        headerVentaA,
        headerVentaB,
        "Delta venta",
        headerDescA,
        headerDescB,
        "Delta descuento",
        headerIngresoA,
        headerIngresoB,
        "Delta ingreso",
      ]
    : [
        "Cliente",
        headerVentaA,
        headerVentaB,
        "Delta venta",
        headerDescA,
        headerDescB,
        "Delta descuento",
        headerIngresoA,
        headerIngresoB,
        "Delta ingreso",
      ];
  const cliHdr = ws.getRow(cur);
  cliHeaders.forEach((t, i) => {
    cliHdr.getCell(i + 1).value = t;
  });
  styleHeaderRow(cliHdr, C.last);
  cur++;

  const centerCli = MF
    ? [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const clienteColStyle = MF ? C.cli : 1;

  const firstClienteDataRow = cur;

  for (const row of filasClientesMesPrimero) {
    const rowX = ws.getRow(cur);
    if (MF) {
      rowX.getCell(C.sinV).value = row.sinVentaForecast ? "Sí" : "";
      rowX.getCell(C.conV).value = row.conVentaForecastSim ? "Sí" : "";
    }
    rowX.getCell(C.cli).value = row.cliente;
    rowX.getCell(C.vA).value = cellNum(row.ventaA);
    rowX.getCell(C.vA).numFmt = "#,##0";
    rowX.getCell(C.vB).value = cellNum(row.ventaB);
    rowX.getCell(C.vB).numFmt = "#,##0";
    rowX.getCell(C.dV).value = {
      formula: `ROUND(IFERROR(${Lc(C.vB)}${cur}-${Lc(C.vA)}${cur},0),0)`,
    };
    rowX.getCell(C.dV).numFmt = "#,##0";
    rowX.getCell(C.dA).value = cellNum(row.descA);
    rowX.getCell(C.dA).numFmt = "#,##0.00";
    rowX.getCell(C.dB).value = cellNum(row.descB);
    rowX.getCell(C.dB).numFmt = "#,##0.00";
    rowX.getCell(C.dDesc).value = {
      formula: `ROUND(IFERROR(${Lc(C.dB)}${cur}-${Lc(C.dA)}${cur},0),2)`,
    };
    rowX.getCell(C.dDesc).numFmt = "#,##0.00";
    rowX.getCell(C.ingA).value = {
      formula: `ROUND(IFERROR((${Lc(C.vA)}${cur}*($C$${MES_A_R}-ABS(${Lc(C.dA)}${cur})))+($H$${MES_A_R}*${Lc(C.vA)}${cur}*$I$${MES_A_R}/100),0),0)`,
    };
    rowX.getCell(C.ingA).numFmt = '"$" #,##0';
    rowX.getCell(C.ingB).value = {
      formula: `ROUND(IFERROR((${Lc(C.vB)}${cur}*($C$${MES_B_R}-ABS(${Lc(C.dB)}${cur})))+($H$${MES_B_R}*${Lc(C.vB)}${cur}*$I$${MES_B_R}/100),0),0)`,
    };
    rowX.getCell(C.ingB).numFmt = '"$" #,##0';
    rowX.getCell(C.dIng).value = {
      formula: `ROUND(IFERROR(${Lc(C.ingB)}${cur}-${Lc(C.ingA)}${cur},0),0)`,
    };
    rowX.getCell(C.dIng).numFmt = '"$" #,##0';
    styleDataRow(rowX, C.last, centerCli, clienteColStyle);
    cur++;
  }

  if (filasClientesSoloMesSegundo.length > 0 && filasClientesMesPrimero.length > 0) {
    const sep = ws.getRow(cur);
    for (let c = 1; c <= C.last; c++) {
      sep.getCell(c).value = "";
      sep.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: F_SEP },
      };
    }
    cur++;
  }

  for (const row of filasClientesSoloMesSegundo) {
    const rowX = ws.getRow(cur);
    if (MF) {
      rowX.getCell(C.sinV).value = row.sinVentaForecast ? "Sí" : "";
      rowX.getCell(C.conV).value = row.conVentaForecastSim ? "Sí" : "";
    }
    rowX.getCell(C.cli).value = row.cliente;
    rowX.getCell(C.vA).value = 0;
    rowX.getCell(C.vA).numFmt = "#,##0";
    rowX.getCell(C.vB).value = cellNum(row.ventaB);
    rowX.getCell(C.vB).numFmt = "#,##0";
    rowX.getCell(C.dV).value = {
      formula: `ROUND(IFERROR(${Lc(C.vB)}${cur}-${Lc(C.vA)}${cur},0),0)`,
    };
    rowX.getCell(C.dV).numFmt = "#,##0";
    rowX.getCell(C.dA).value = 0;
    rowX.getCell(C.dA).numFmt = "#,##0.00";
    rowX.getCell(C.dB).value = cellNum(row.descB);
    rowX.getCell(C.dB).numFmt = "#,##0.00";
    rowX.getCell(C.dDesc).value = {
      formula: `ROUND(IFERROR(${Lc(C.dB)}${cur}-${Lc(C.dA)}${cur},0),2)`,
    };
    rowX.getCell(C.dDesc).numFmt = "#,##0.00";
    rowX.getCell(C.ingA).value = {
      formula: `ROUND(IFERROR((${Lc(C.vA)}${cur}*($C$${MES_A_R}-ABS(${Lc(C.dA)}${cur})))+($H$${MES_A_R}*${Lc(C.vA)}${cur}*$I$${MES_A_R}/100),0),0)`,
    };
    rowX.getCell(C.ingA).numFmt = '"$" #,##0';
    rowX.getCell(C.ingB).value = {
      formula: `ROUND(IFERROR((${Lc(C.vB)}${cur}*($C$${MES_B_R}-ABS(${Lc(C.dB)}${cur})))+($H$${MES_B_R}*${Lc(C.vB)}${cur}*$I$${MES_B_R}/100),0),0)`,
    };
    rowX.getCell(C.ingB).numFmt = '"$" #,##0';
    rowX.getCell(C.dIng).value = {
      formula: `ROUND(IFERROR(${Lc(C.ingB)}${cur}-${Lc(C.ingA)}${cur},0),0)`,
    };
    rowX.getCell(C.dIng).numFmt = '"$" #,##0';
    styleDataRow(rowX, C.last, centerCli, clienteColStyle);
    cur++;
  }

  const lastDataR = cur - 1;
  const celL5 = ws.getCell(`M${MES_A_R}`);
  const celL6 = ws.getCell(`M${MES_B_R}`);
  const colIngA = Lc(C.ingA);
  const colIngB = Lc(C.ingB);
  if (lastDataR >= firstClienteDataRow && rentabilidadMesAFormulaClientes) {
    const sumIngA = `SUM(${colIngA}${firstClienteDataRow}:${colIngA}${lastDataR})`;
    celL5.value = { formula: `${sumIngA}-G${MES_A_R}` };
  } else {
    celL5.value = cellNum(mA.rentabilidadImporte);
  }
  celL5.numFmt = '"$" #,##0';

  if (lastDataR >= firstClienteDataRow && rentabilidadMesBFormulaClientes) {
    const sumIngB = `SUM(${colIngB}${firstClienteDataRow}:${colIngB}${lastDataR})`;
    celL6.value = { formula: `${sumIngB}-G${MES_B_R}` };
  } else {
    celL6.value = cellNum(mB.rentabilidadImporte);
  }
  celL6.numFmt = '"$" #,##0';

  ws.columns = MF
    ? [
        { width: 10 },
        { width: 10 },
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 16 },
      ]
    : [
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 16 },
      ];

  if (build.skipDownload) return;
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    build.filename ??
    `ARR_${safeFilePart(empresa || "export")}_${safeFilePart(opts.selA)}_${safeFilePart(opts.selB)}.xlsx`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function downloadArrDashboardExcelDual(opts: {
  arr: ArrExportOptions;
  plan: ArrExportOptions;
}): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await downloadArrDashboardExcelInternal(opts.arr, {
    workbook: wb,
    sheetName: "ARR",
    skipDownload: true,
  });
  await downloadArrDashboardExcelInternal(opts.plan, {
    workbook: wb,
    sheetName: "ARR Plan",
    skipDownload: true,
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ARR_${safeFilePart(opts.arr.empresa || "export")}_${safeFilePart(opts.arr.selA)}_${safeFilePart(opts.arr.selB)}.xlsx`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
