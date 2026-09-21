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

export function parseLocaleNumber(raw: string): number | null {
  const s = String(raw || "").trim().replace(/\s/g, "").replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
