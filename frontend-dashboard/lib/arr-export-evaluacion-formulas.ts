import ExcelJS from "exceljs";
import type { ArrExportSubcategoriaResumenRow } from "@/lib/arr-export-movimiento-categoria";
import {
  buildMetahgRowMap,
  empresaToPlantCode,
  type MetahgCanonicalRowKey,
} from "@/lib/metahg-canonical";

const EVAL_SHEET = "EVALUACION";
const META_SHEET = "META";
const ARR_SHEET = "ARR";
const CASA_SHEET = "CASA";
const COMI_SHEET = "COMISIONISTA";

function setFormula(cell: ExcelJS.Cell, formula: string) {
  cell.value = { formula };
}

function metaRef(row: number, col: string): string {
  return `${META_SHEET}!${col}${row}`;
}

function tonFromResumen(
  rows: ArrExportSubcategoriaResumenRow[],
  match: (sub: string) => boolean
): number {
  for (const r of rows) {
    if (r.esTotal) continue;
    const sub = String(r.subcategoria || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (match(sub)) return Number.isFinite(r.ventaTon) ? r.ventaTon : 0;
  }
  return 0;
}

/** B7–B9 en CASA / COMISIONISTA: venta (t) por subcategoría para fórmulas F7–F9. */
export function writeCategoriaSheetEvalHelpers(
  wb: ExcelJS.Workbook,
  resumen: {
    casa: ArrExportSubcategoriaResumenRow[];
    comisionista: ArrExportSubcategoriaResumenRow[];
  }
): void {
  const write = (sheetName: string, rows: ArrExportSubcategoriaResumenRow[]) => {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) return;
    ws.getCell(7, 2).value = tonFromResumen(rows, (s) => s.includes("autotanque"));
    ws.getCell(8, 2).value = tonFromResumen(rows, (s) => s.includes("carbur"));
    ws.getCell(9, 2).value = tonFromResumen(rows, (s) =>
      s.includes("portatil") || s.includes("portátil")
    );
  };
  write(CASA_SHEET, resumen.casa);
  write(COMI_SHEET, resumen.comisionista);
}

/**
 * Fórmulas EVALUACION (D1, D2, E/F/G por fila, Tehuacan en sección VENTA).
 * Requiere hojas META, ARR, CASA, COMISIONISTA y filas METAHG 32–45.
 */
export function applyEvaluacionFormulas(
  wb: ExcelJS.Workbook,
  empresa: string,
  metaRows: Record<MetahgCanonicalRowKey, number>
): void {
  const ws = wb.getWorksheet(EVAL_SHEET);
  if (!ws) return;

  const m = metaRows;
  const plant = empresaToPlantCode(empresa);
  const isTehuacan = plant === "tehuacan";

  ws.getCell(1, 4).value = `Empresa: ${empresa}`;
  setFormula(ws.getCell(2, 4), "SUM(G6:G38)");

  if (isTehuacan) {
    setFormula(
      ws.getCell(7, 5),
      `${metaRef(m.pipasCasa, "C")}+${metaRef(m.portatil, "C")}`
    );
    setFormula(ws.getCell(8, 5), metaRef(m.estacionesCarb, "C"));
    setFormula(
      ws.getCell(9, 5),
      `${metaRef(m.pipasComisionista, "C")}+${metaRef(m.predieros, "C")}+${metaRef(m.recuperacion1, "C")}`
    );
    setFormula(ws.getCell(10, 5), metaRef(m.vtaAnioAnterior, "C"));
    setFormula(ws.getCell(11, 5), `SUM(${metaRef(m.pipasCasa, "C")}:${metaRef(m.vtaAnioAnterior, "C")})`);

    setFormula(
      ws.getCell(7, 6),
      `(${CASA_SHEET}!B7+${CASA_SHEET}!B9+${COMI_SHEET}!B9)*1000`
    );
    setFormula(ws.getCell(8, 6), `(${CASA_SHEET}!B8)*1000`);
    setFormula(
      ws.getCell(9, 6),
      `(${COMI_SHEET}!B7+${COMI_SHEET}!B8)*1000`
    );
    setFormula(ws.getCell(11, 6), "SUM(F7:F9)");
  }

  setFormula(ws.getCell(7, 7), `IF(F7>=E7,D7,0)`);
  setFormula(ws.getCell(8, 7), `IF(F8>=E8,D8,0)`);
  setFormula(ws.getCell(9, 7), `IF(F9>=E9,D9,0)`);
  setFormula(ws.getCell(10, 7), `IF(F11>E10,D10,0)`);
  setFormula(ws.getCell(11, 7), `IF(F11>=E11,D11,0)`);

  setFormula(ws.getCell(14, 6), `${ARR_SHEET}!M6+${ARR_SHEET}!F6`);
  setFormula(ws.getCell(15, 6), `${ARR_SHEET}!M6`);
  setFormula(ws.getCell(14, 7), `IF(F15>0,10,0)+IF(F14>0,10,0)`);

  ws.getCell(17, 7).value = 8;

  setFormula(ws.getCell(21, 6), `${ARR_SHEET}!H6`);
  setFormula(
    ws.getCell(21, 7),
    `IF(F21>10.04,20,IF(F21>=9.05,14,IF(F21>=8.05,8,IF(F21>=7.05,4,IF(F21>=6,2,0)))))`
  );

  setFormula(ws.getCell(28, 5), metaRef(m.total, "D"));
  setFormula(ws.getCell(28, 6), `${ARR_SHEET}!D6*-1`);
  setFormula(
    ws.getCell(28, 7),
    `IF(ROUND(F28,2)<=ROUND(E28,2)+0.04,12,IF(ROUND(F28,2)<=ROUND(E28,2)+0.1,8,IF(ROUND(F28,2)<=ROUND(E28,2)+0.15,4,0)))`
  );

  ws.getCell(33, 7).value = 20;
}
