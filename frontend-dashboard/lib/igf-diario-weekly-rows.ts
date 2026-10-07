import type { IgfDiarioSemanalMetrics } from "@/lib/api";

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
