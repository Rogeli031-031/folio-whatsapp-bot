export const COMPRAS_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function formatKg(value: number | null | undefined, showZero = false): string {
  const n = Number(value);
  if (!Number.isFinite(n) || (n === 0 && !showZero)) return "";
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);
}

export function formatImporte(value: number | null | undefined, showZero = false): string {
  const n = Number(value);
  if (!Number.isFinite(n) || (n === 0 && !showZero)) return "";
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatCosto(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
}

export function formatFechaGrid(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function toYmd(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

export function formatTarifa(value: number | null | undefined): string {
  if (value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatFleteImporte(value: number | null | undefined, showZero = false): string {
  if (value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n) || (n === 0 && !showZero)) return "";
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function hgCosto(costoKg: number | null | undefined, tarifa: number | null | undefined): number | null {
  if (costoKg == null || !Number.isFinite(Number(costoKg))) return null;
  if (tarifa == null || !Number.isFinite(Number(tarifa))) return null;
  return Math.round((Number(costoKg) + Number(tarifa)) * 1000) / 1000;
}

type HgDay = {
  hg_kilos?: number | null;
  hg_costo_efectivo?: number | null;
  hg_importe_efectivo?: number | null;
  consolidado?: { costo_kg?: number | null };
  flete?: { consolidado?: { tarifa?: number | null } };
};

export function hgCostoDiario(day: HgDay | null | undefined): number | null {
  if (day && day.hg_costo_efectivo !== undefined) return day.hg_costo_efectivo ?? null;
  return hgCosto(day?.consolidado?.costo_kg, day?.flete?.consolidado?.tarifa);
}

export function hgImporteDiario(day: HgDay | null | undefined): number | null {
  if (day && day.hg_importe_efectivo !== undefined) return day.hg_importe_efectivo ?? null;
  return hgImporte(hgCosto(day?.consolidado?.costo_kg, day?.flete?.consolidado?.tarifa), day?.hg_kilos ?? null);
}

export function hgImporte(costo: number | null | undefined, hgKilos: number | null | undefined): number | null {
  if (costo == null || !Number.isFinite(Number(costo))) return null;
  if (hgKilos == null || !Number.isFinite(Number(hgKilos))) return null;
  const n = Math.round(Number(costo) * Number(hgKilos) * -1 * 100) / 100;
  return n === 0 ? 0 : n;
}

export function hgImporteSum(
  days: {
    hg_kilos?: number | null;
    hg_importe_efectivo?: number | null;
    consolidado?: { costo_kg?: number | null };
    flete?: { consolidado?: { tarifa?: number | null } };
  }[]
): number | null {
  let sum = 0;
  let saw = false;
  for (const d of days || []) {
    if (d == null || d.hg_kilos == null || !Number.isFinite(Number(d.hg_kilos))) continue;
    const imp = d.hg_importe_efectivo !== undefined
      ? d.hg_importe_efectivo
      : hgImporte(hgCosto(d.consolidado?.costo_kg, d.flete?.consolidado?.tarifa), d.hg_kilos);
    if (imp == null) return null;
    sum += imp;
    saw = true;
  }
  return saw ? Math.round(sum * 100) / 100 : null;
}

export function formatHgImporte(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

export function formatHgKilos(value: number | null | undefined): string {
  if (value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(n);
}

export function parseLocaleNumber(raw: string): number | null {
  const s = String(raw || "").trim().replace(/\s/g, "").replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Las 6 plantas operativas del menú Compras. Códigos E* y el resto del catálogo no se listan. */
export const COMPRAS_MENU_PLANTAS = [
  "acapulco",
  "puebla",
  "tehuacan",
  "queretaro",
  "san luis",
  "morelos",
] as const;

export function normComprasPlantaNombre(nombre: string): string {
  return String(nombre || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function filterComprasPlantasMenu<T extends { nombre: string }>(plantas: T[]): T[] {
  return (plantas || []).filter((p) => {
    const n = normComprasPlantaNombre(p.nombre);
    if (!n) return false;
    return (COMPRAS_MENU_PLANTAS as readonly string[]).includes(n);
  });
}
