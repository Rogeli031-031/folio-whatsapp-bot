import * as XLSX from "xlsx";

/** Métricas del resumen ARR (mismos campos que en pantalla). */
export type ArrExportResumenMetrics = {
  operativos: number | null;
  corporativos: number | null;
  gastoImporte: number | null;
  margenKg: number | null;
  hgDisplay: number | null;
  hgDinero: number | null;
  descuentoSigned: number | null;
  ventaTon: number | null;
  rentabilidadImporte: number | null;
};

export type ArrExportClienteRow = {
  cliente: string;
  ventaA: number | null;
  ventaB: number | null;
  descA: number | null;
  descB: number | null;
};

function enc(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

/** Referencias absolutas tipo $L$7 para copiar fórmulas en Excel. */
function absRef(r: number, c: number): string {
  const addr = enc(r, c);
  const m = addr.match(/^([A-Z]+)(\d+)$/);
  if (!m) return addr;
  return `$${m[1]}$${m[2]}`;
}

function numOrBlank(v: number | null | undefined): number | string {
  if (v == null || Number.isNaN(v)) return "";
  return v;
}

function safeFilePart(s: string): string {
  return s.replace(/[/\\?*[\]:'"]/g, "_").trim().replace(/\s+/g, "_");
}

export type ArrExportOptions = {
  empresa: string;
  selA: string;
  selB: string;
  labelMesA: string;
  labelMesB: string;
  comparacionLabel: string;
  mA: ArrExportResumenMetrics;
  mB: ArrExportResumenMetrics;
  /** Una fila de encabezado para la tabla de clientes (como en UI). */
  headerVentaA: string;
  headerVentaB: string;
  headerDescA: string;
  headerDescB: string;
  headerIngresoA: string;
  headerIngresoB: string;
  filasClientesMesPrimero: ArrExportClienteRow[];
  filasClientesSoloMesSegundo: ArrExportClienteRow[];
  /** Si ambos meses tienen filas de resumen, la fila COMPARACION usa fórmulas (mes B − mes A). */
  usarFormulasComparacion: boolean;
  /** Mini IGF ingreso planta y ∑kg clientes (misma lógica que la pantalla ARR). Fila en columnas L–O. */
  ingresoPlantaMesA: number | null;
  sumKgClientesMesA: number;
  ingresoPlantaMesB: number | null;
  sumKgClientesMesB: number;
};

/**
 * Genera un .xlsx con resumen ARR y clientes por mes.
 * Deltas del resumen y por cliente son fórmulas de Excel cuando aplica.
 */
export function downloadArrDashboardExcel(opts: ArrExportOptions): void {
  const {
    empresa,
    labelMesA,
    labelMesB,
    comparacionLabel,
    mA,
    mB,
    headerVentaA,
    headerVentaB,
    headerDescA,
    headerDescB,
    headerIngresoA,
    headerIngresoB,
    filasClientesMesPrimero,
    filasClientesSoloMesSegundo,
    usarFormulasComparacion,
    ingresoPlantaMesA,
    sumKgClientesMesA,
    ingresoPlantaMesB,
    sumKgClientesMesB,
  } = opts;

  const resumenHeader = [
    "Mes",
    "Operativos",
    "Corporativos",
    "Gasto",
    "Margen",
    "HG",
    "HG$",
    "Descuento",
    "Venta",
    "Nuevos",
    "Previos",
    "Rentabilidad",
  ];

  function resumenDataRow(label: string, m: ArrExportResumenMetrics): (string | number)[] {
    return [
      label,
      numOrBlank(m.operativos),
      numOrBlank(m.corporativos),
      numOrBlank(m.gastoImporte),
      numOrBlank(m.margenKg),
      numOrBlank(m.hgDisplay),
      numOrBlank(m.hgDinero),
      numOrBlank(m.descuentoSigned),
      numOrBlank(m.ventaTon),
      "",
      "",
      numOrBlank(m.rentabilidadImporte),
    ];
  }

  const aoa: (string | number)[][] = [];
  aoa.push(["ARR · IGF Forecast · exportación"]);
  aoa.push(["Empresa", empresa]);
  aoa.push(["Comparación", comparacionLabel || ""]);
  aoa.push(resumenHeader);

  const idxMesA = aoa.length;
  aoa.push(resumenDataRow(labelMesA || "(Mes A)", mA));
  const idxMesB = aoa.length;
  aoa.push(resumenDataRow(labelMesB || "(Mes B)", mB));
  const idxComparacion = aoa.length;
  const filaComparBase: (string | number)[] = [
    "COMPARACION",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  aoa.push(filaComparBase);

  aoa.push([]);
  aoa.push(["Clientes por mes"]);
  /** L–O: anclas para =ROUND(ingreso_planta*kg_col/sum_kg,0) (misma prorrata que el dashboard). */
  const idxProrrataParams = aoa.length;
  const filaParams = new Array<string | number>(15).fill("");
  filaParams[0] =
    "Prorrata ingreso mini IGF: L = ingreso planta mes A, M = ∑kg clientes mes A, N = ingreso planta mes B, O = ∑kg clientes mes B";
  filaParams[11] =
    ingresoPlantaMesA != null && Number.isFinite(ingresoPlantaMesA) ? ingresoPlantaMesA : "";
  filaParams[12] = sumKgClientesMesA > 0 ? sumKgClientesMesA : "";
  filaParams[13] =
    ingresoPlantaMesB != null && Number.isFinite(ingresoPlantaMesB) ? ingresoPlantaMesB : "";
  filaParams[14] = sumKgClientesMesB > 0 ? sumKgClientesMesB : "";
  aoa.push(filaParams);

  aoa.push([
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
  ]);

  const idxFirstCliente = aoa.length;

  for (const row of filasClientesMesPrimero) {
    aoa.push([
      row.cliente,
      numOrBlank(row.ventaA),
      numOrBlank(row.ventaB),
      "",
      numOrBlank(row.descA),
      numOrBlank(row.descB),
      "",
      "",
      "",
      "",
    ]);
  }

  if (filasClientesSoloMesSegundo.length > 0 && filasClientesMesPrimero.length > 0) {
    aoa.push([]);
  }

  for (const row of filasClientesSoloMesSegundo) {
    aoa.push([
      row.cliente,
      0,
      numOrBlank(row.ventaB),
      "",
      0,
      numOrBlank(row.descB),
      "",
      "",
      "",
      "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const rA = idxMesA;
  const rB = idxMesB;
  const rC = idxComparacion;

  if (usarFormulasComparacion) {
    ws[enc(rC, 0)] = {
      t: "s",
      v: comparacionLabel
        ? `COMPARACION (${comparacionLabel})`
        : "COMPARACION",
    };
    for (let c = 1; c <= 11; c++) {
      if (c === 9 || c === 10) {
        ws[enc(rC, c)] = { t: "s", v: "" };
        continue;
      }
      ws[enc(rC, c)] = {
        f: `${enc(rB, c)}-${enc(rA, c)}`,
        t: "n",
      };
    }
  } else {
    ws[enc(rC, 0)] = { t: "s", v: "COMPARACION (selecciona dos meses con datos para fórmulas)" };
  }

  const spacer =
    filasClientesSoloMesSegundo.length > 0 && filasClientesMesPrimero.length > 0 ? 1 : 0;
  const lastClienteIdx = idxFirstCliente + filasClientesMesPrimero.length + spacer + filasClientesSoloMesSegundo.length - 1;

  const absLA = absRef(idxProrrataParams, 11);
  const absMA = absRef(idxProrrataParams, 12);
  const absNB = absRef(idxProrrataParams, 13);
  const absOB = absRef(idxProrrataParams, 14);

  const fIngresoA = (r: number) =>
    `IF(OR(ISBLANK(${absLA}),ISBLANK(${absMA}),${absMA}=0),"",ROUND(${absLA}*${enc(r, 1)}/${absMA},0))`;
  const fIngresoB = (r: number) =>
    `IF(OR(ISBLANK(${absNB}),ISBLANK(${absOB}),${absOB}=0),"",ROUND(${absNB}*${enc(r, 2)}/${absOB},0))`;

  for (let r = idxFirstCliente; r <= lastClienteIdx; r++) {
    const row = aoa[r];
    if (!row || row.length === 0) continue;
    if (typeof row[0] !== "string" || !row[0]) continue;

    ws[enc(r, 3)] = { f: `${enc(r, 2)}-${enc(r, 1)}`, t: "n" };
    ws[enc(r, 6)] = { f: `${enc(r, 5)}-${enc(r, 4)}`, t: "n" };
    ws[enc(r, 7)] = { f: fIngresoA(r), t: "n" };
    ws[enc(r, 8)] = { f: fIngresoB(r), t: "n" };
    ws[enc(r, 9)] = { f: `${enc(r, 8)}-${enc(r, 7)}`, t: "n" };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ARR");

  const name = `ARR_${safeFilePart(empresa || "export")}_${safeFilePart(opts.selA)}_${safeFilePart(opts.selB)}.xlsx`;
  XLSX.writeFile(wb, name);
}
