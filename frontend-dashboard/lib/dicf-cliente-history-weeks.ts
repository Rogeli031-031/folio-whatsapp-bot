/** Semanas de historial de compras mostrables en Delta / DICF (máx. coincide con backend: 8 × 7 días). */
export const DICF_HISTORY_WEEK_OPTIONS = [4, 5, 6, 7, 8] as const;

export type DicfHistoryWeeks = (typeof DICF_HISTORY_WEEK_OPTIONS)[number];

/**
 * Filtra filas diarias de compras a la ventana de N semanas respecto a la fecha más reciente del arreglo.
 */
export function filterDicfClienteHistoryByWeeks(
  rows: { fecha: string; kg: number }[] | undefined,
  weeks: DicfHistoryWeeks
): { fecha: string; kg: number }[] {
  if (!rows?.length) return [];
  const msWindow = weeks * 7 * 86400000;
  const times = rows.map((r) => {
    const t = Date.parse(String(r.fecha).trim() + "T12:00:00");
    return Number.isFinite(t) ? t : NaN;
  });
  const valid = times.filter((t) => Number.isFinite(t));
  if (!valid.length) return [];
  const lastMs = Math.max(...valid);
  const cutoff = lastMs - msWindow;
  return rows.filter((r, i) => {
    const t = times[i];
    return Number.isFinite(t) && t >= cutoff;
  });
}
