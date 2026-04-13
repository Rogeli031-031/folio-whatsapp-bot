import type { PronosticoDetalleResponse, PronosticoVentaSheet } from "./api";

function isoDow(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

function meanNonEmpty(vals: number[]): number | null {
  const a = vals.filter((x) => Number.isFinite(x));
  if (!a.length) return null;
  return Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 100) / 100;
}

/**
 * Recalcula PROM / POR COMPRAR / PROY a partir de los días marcados (misma lógica que el servidor).
 * Mantiene `total_mes_dow` del snapshot del servidor (ventas realizadas hasta corte).
 */
export function recomputeVentaSheetFromDays(detail: PronosticoDetalleResponse): PronosticoVentaSheet | undefined {
  const vs = detail.venta_sheet;
  if (!vs || !detail.days?.length || !detail.corte_day) return vs;

  const [y, m] = [detail.year, detail.month];
  const lastDay = new Date(y, m, 0).getDate();
  const corteParts = detail.corte_day.split("-").map((x) => parseInt(x, 10));
  if (corteParts.length !== 3) return vs;
  const [, , cd] = corteParts;
  const corteDt = new Date(y, m - 1, cd);
  const isCorteEnMes =
    corteDt.getFullYear() === y && corteDt.getMonth() + 1 === m && cd >= 1 && cd <= lastDay;

  const countRemainingDowInMonth = (dow1to7: number) => {
    let c = 0;
    const startDay = isCorteEnMes ? corteDt.getDate() : corteDt.getDate() + 1;
    for (let day = startDay; day <= lastDay; day++) {
      const d = new Date(y, m - 1, day);
      if (isoDow(d) === dow1to7) c += 1;
    }
    return c;
  };

  const visStart = detail.lookback_visual_start || detail.lookback_start;
  const lookbackVisualStart = visStart ? new Date(visStart + "T12:00:00") : null;
  const lookbackEnd = detail.lookback_end ? new Date(detail.lookback_end + "T12:00:00") : null;
  if (!lookbackVisualStart || !lookbackEnd) return vs;

  const valsByDow: number[][] = [[], [], [], [], [], [], []];
  for (const d of detail.days) {
    if (d.selected === false) continue;
    const dt = new Date(d.fecha + "T12:00:00");
    if (dt < lookbackVisualStart || dt > lookbackEnd) continue;
    const v = d.venta_ton;
    if (v == null || !Number.isFinite(Number(v))) continue;
    valsByDow[isoDow(dt) - 1].push(Number(v));
  }

  const promMesVenta: (number | string)[] = ["", "", "", "", "", "", ""];
  for (let k = 0; k < 7; k++) {
    const mn = meanNonEmpty(valsByDow[k]);
    promMesVenta[k] = mn != null ? mn : "";
  }

  const porComprarVenta = promMesVenta.map((v, idx) => {
    const n = countRemainingDowInMonth(idx + 1);
    return v !== "" ? Math.round(Number(v) * n * 100) / 100 : "";
  });

  const totalMes = vs.total_mes_dow;
  const proyVenta = totalMes.map((v, i) => {
    const pc = porComprarVenta[i] !== "" ? Number(porComprarVenta[i]) : 0;
    return Math.round((Number(v) + pc) * 100) / 100;
  });
  const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
  const proyVentaTon = Math.round(sum(proyVenta) * 100) / 100;
  const promFiltered = promMesVenta.filter((x) => x !== "");
  const porcFiltered = porComprarVenta.filter((x) => x !== "");

  return {
    ...vs,
    prom_mes_dow: promMesVenta,
    prom_mes_total: sum(promFiltered.map((x) => Number(x))),
    por_comprar_dow: porComprarVenta,
    por_comprar_sum: sum(porcFiltered.map((x) => Number(x))),
    proy_dow: proyVenta,
    proy_total_ton: proyVentaTon,
  };
}

/** Actualiza bordes rojos (PROM) según `days[].selected` tras recalcular filas resumen. */
export function mergeVentaSheetHighlights(
  sheet: PronosticoVentaSheet,
  detail: PronosticoDetalleResponse
): PronosticoVentaSheet {
  const dayMap = new Map(detail.days.map((x) => [x.fecha, x]));
  const weeks = sheet.weeks.map((w) => ({
    ...w,
    prom_highlight: w.cell_fecha
      ? w.cell_fecha.map((fecha) => {
          if (!fecha) return false;
          const row = dayMap.get(fecha);
          if (!row || row.venta_ton == null || !Number.isFinite(Number(row.venta_ton))) return false;
          return row.selected !== false;
        })
      : w.prom_highlight,
  }));
  return { ...sheet, weeks };
}
