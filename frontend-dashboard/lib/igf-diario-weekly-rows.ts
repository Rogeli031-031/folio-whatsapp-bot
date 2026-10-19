import type { IgfDiarioSemanalCoverage, IgfDiarioSemanalCoverageMap, IgfDiarioSemanalMetrics } from "@/lib/api";

export type WeeklyUnit = "kg" | "mxn" | "per_kg";

export type WeeklyDataRow = {
  key: keyof IgfDiarioSemanalMetrics;
  label: string;
  unit: WeeklyUnit;
  highlight?: boolean;
  strongest?: boolean;
  separatorBefore?: boolean;
};

export const WEEKLY_ROWS: WeeklyDataRow[] = [
  { key: "venta_kg", label: "Venta en Kilos", unit: "kg", highlight: true },
  { key: "precio_kg", label: "Precio de Venta al Público", unit: "per_kg", highlight: true },
  { key: "ingreso_mxn", label: "Ingreso Generado", unit: "mxn", highlight: true },
  { key: "costo_kg", label: "Costo del Gas LP", unit: "per_kg", separatorBefore: true },
  { key: "flete_kg", label: "Flete Terrestre", unit: "per_kg" },
  { key: "margen_kg", label: "Margen Bruto", unit: "per_kg", highlight: true },
  { key: "gasto_corporativo_kg", label: "Gasto Corporativo", unit: "per_kg", separatorBefore: true },
  { key: "inversiones_kg", label: "Inversiones", unit: "per_kg" },
  { key: "impuestos_federales_kg", label: "Impuestos Federales", unit: "per_kg" },
  { key: "margen_neto_kg", label: "Margen Neto", unit: "per_kg", highlight: true },
  { key: "presupuesto_nomina_gastos_kg", label: "Presupuesto Nómina/Gastos", unit: "per_kg", separatorBefore: true },
  { key: "presupuesto_imss_sua_kg", label: "Presupuesto IMSS/SUA", unit: "per_kg" },
  { key: "extraordinarios_kg", label: "Extraordinarios", unit: "per_kg" },
  { key: "provisiones_planta_kg", label: "Provisiones de la Planta", unit: "per_kg" },
  { key: "sobrante_antes_hg_kg", label: "Sobrante de Operación antes del HG", unit: "per_kg", highlight: true },
  { key: "hg_mxn", label: "HG", unit: "mxn", separatorBefore: true },
  { key: "sobrante_con_hg_kg", label: "Sobrante de Operación con el HG", unit: "per_kg", highlight: true },
  { key: "com_desc_kg", label: "Comisiones y Descuentos", unit: "per_kg", separatorBefore: true },
  { key: "resultado_kg", label: "RESULTADO ($/kg)", unit: "per_kg", highlight: true },
  { key: "resultado_mxn", label: "RESULTADO (Importe)", unit: "mxn", highlight: true, strongest: true },
];

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function fmtFecha(value: string): string {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function dayHeader(fecha: string): string {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fecha;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${WEEKDAY_SHORT[date.getUTCDay()]} ${match[3]}/${match[2]}`;
}

export function fmtValue(value: number | null, unit: WeeklyUnit): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kg") return value.toLocaleString("es-MX", { maximumFractionDigits: 0 });
  return value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function tone(key: string, value: number | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-slate-400";
  if (value < 0) return "text-red-400";
  if ((key === "resultado_kg" || key === "resultado_mxn") && value > 0) return "text-emerald-300";
  return "text-slate-100";
}

export function weekLabel(weekNumber: number, desde: string, hasta: string): string {
  return `SEMANA ${weekNumber} · ${fmtFecha(desde)}–${fmtFecha(hasta)}`;
}

export function coverageIsPartial(block: IgfDiarioSemanalCoverage | null | undefined): boolean {
  if (!block) return false;
  return block.days_with_sales > 0 && block.days_covered < block.days_with_sales;
}

function groupedKg(value: number | null | undefined): string {
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? "-" : "";
  const body = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${body}`;
}

export function coverageCaption(block: IgfDiarioSemanalCoverage | null | undefined): string | null {
  if (!coverageIsPartial(block) || !block) return null;
  const pct = block.coverage_kg_pct == null || !Number.isFinite(block.coverage_kg_pct)
    ? ""
    : `${block.coverage_kg_pct.toFixed(2)}%`;
  const total = block.kg_total == null ? "—" : groupedKg(block.kg_total);
  return `Cobertura financiera ${pct} · ${groupedKg(block.kg_covered)} / ${total} kg · ${block.days_covered}/${block.days_with_sales} días · Real ${groupedKg(block.covered_real_kg)} kg · Proyectado ${groupedKg(block.covered_projected_kg)} kg`;
}

export function coverageLines(coverage: IgfDiarioSemanalCoverageMap | null | undefined): string[] {
  if (!coverage) return [];
  const result = coverageCaption(coverage.resultado);
  const commission = coverageCaption(coverage.com_desc_kg);
  if (result && commission && result === commission) return [result];
  return [result, commission].filter((line): line is string => Boolean(line));
}

export type ExcelWeekEstado = "REAL" | "PARCIAL" | "PROYECTADA";

export type ExcelWeekChoice = {
  week_number: number;
  week_year: number;
  fecha_desde: string;
  fecha_hasta: string;
  estado: ExcelWeekEstado;
  label: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseUtc(value: string): Date | null {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addUtcDays(value: string, days: number): string | null {
  const date = parseUtc(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtc(date);
}

function sundayOf(value: string): string | null {
  const date = parseUtc(value);
  if (!date) return null;
  return addUtcDays(String(value).slice(0, 10), -date.getUTCDay());
}

function saturdayOf(value: string): string | null {
  const sunday = sundayOf(value);
  return sunday ? addUtcDays(sunday, 6) : null;
}

function weekYearOf(value: string): number | null {
  const sunday = sundayOf(value);
  const saturday = saturdayOf(value);
  if (!sunday || !saturday) return null;
  const startYear = Number(sunday.slice(0, 4));
  const endYear = Number(saturday.slice(0, 4));
  return startYear === endYear ? startYear : endYear;
}

function weekNumberOf(value: string): number | null {
  const year = weekYearOf(value);
  const sunday = sundayOf(value);
  const first = year == null ? null : sundayOf(`${year}-01-01`);
  const start = first ? parseUtc(first) : null;
  const cursor = sunday ? parseUtc(sunday) : null;
  if (!start || !cursor) return null;
  return Math.round((cursor.getTime() - start.getTime()) / 86400000 / 7) + 1;
}

function monthEndOf(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(last)}`;
}

function weekIntersects(weekStart: string, year: number, month: number): boolean {
  const weekEnd = addUtcDays(weekStart, 6);
  const start = `${year}-${pad2(month)}-01`;
  const end = monthEndOf(year, month);
  return Boolean(weekStart && weekEnd && weekStart <= end && weekEnd >= start);
}

function shortDay(value: string): string {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}`;
}

function excelWeekEstado(desde: string, hasta: string, corte: string): ExcelWeekEstado {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(corte)) return "REAL";
  if (hasta < corte) return "REAL";
  if (desde >= corte) return "PROYECTADA";
  return "PARCIAL";
}

export function excelWeekChoices(year: number, month: number, corte?: string | null): ExcelWeekChoice[] {
  const y = Number(year);
  const m = Number(month);
  const first = sundayOf(`${y}-${pad2(m)}-01`);
  if (!y || !m || !first) return [];
  const cut = String(corte || "").slice(0, 10);
  const out: ExcelWeekChoice[] = [];
  for (let cursor: string | null = first; cursor && weekIntersects(cursor, y, m); cursor = addUtcDays(cursor, 7)) {
    const hasta = saturdayOf(cursor);
    const number = weekNumberOf(cursor);
    const weekYear = weekYearOf(cursor);
    if (!hasta || number == null || weekYear == null) continue;
    const estado = excelWeekEstado(cursor, hasta, cut);
    out.push({
      week_number: number,
      week_year: weekYear,
      fecha_desde: cursor,
      fecha_hasta: hasta,
      estado,
      label: `Semana ${number} · ${shortDay(cursor)}–${shortDay(hasta)} · ${estado}`,
    });
  }
  return out;
}

export function defaultExcelWeekAnchor(
  choices: ExcelWeekChoice[],
  weekAnchor?: string | null,
  corte?: string | null,
): string {
  if (!choices.length) return "";
  const preferred = sundayOf(String(weekAnchor || "").slice(0, 10));
  if (preferred && choices.some((item) => item.fecha_desde === preferred)) return preferred;
  const corteSunday = sundayOf(String(corte || "").slice(0, 10));
  if (corteSunday && choices.some((item) => item.fecha_desde === corteSunday)) return corteSunday;
  return choices[choices.length - 1].fecha_desde;
}
