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
