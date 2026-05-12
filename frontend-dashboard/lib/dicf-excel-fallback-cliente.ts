import type { DeltaIngresoForecastCliente } from "@/lib/api";

export type DicfMesRowParsed = {
  mes: string;
  ventaTon: number | null;
  descKg: number | null;
  ingresoMxn: number | null;
  _descMxn?: number | null;
  _margenKg?: number | null;
};

function normalizeClienteNombre(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function medianGapFromSeries(series: number[]): number {
  const indices: number[] = [];
  for (let i = 0; i < series.length; i++) {
    if (series[i] > 0) indices.push(i);
  }
  if (indices.length === 0) return 9999;
  if (indices.length === 1) return 14;
  const gaps: number[] = [];
  for (let j = 1; j < indices.length; j++) gaps.push(indices[j] - indices[j - 1]);
  gaps.sort((a, b) => a - b);
  const n = gaps.length;
  return n % 2 === 1 ? gaps[(n - 1) / 2] : (gaps[n / 2 - 1] + gaps[n / 2]) / 2;
}

function daysSinceLastFromSeries(series: number[]): number {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] > 0) return series.length - 1 - i;
  }
  return series.length;
}

function parseDateKey(s: string): Date | null {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Si el cliente no está en buckets DICF pero sí en la hoja «Venta (Ton)» del Excel completo,
 * reconstruye cliente + historial diario + filas mensuales (misma lógica que el modal).
 */
export function parseDicfVentaSheetForClienteFallback(
  aoa: unknown[][],
  clienteNombre: string,
  dicfLastDate: string | null
): {
  cliente: DeltaIngresoForecastCliente;
  mesRows: DicfMesRowParsed[];
} | null {
  const want = normalizeClienteNombre(clienteNombre);
  if (!want) return null;

  const header = (aoa?.[0] || []).map((x) => (x != null ? String(x).trim() : ""));
  if (!header.length) return null;

  const row = (aoa || []).find((r) => {
    const c = r?.[0] != null ? String(r[0]).trim() : "";
    return normalizeClienteNombre(c) === want || c.toLowerCase() === clienteNombre.trim().toLowerCase();
  });
  if (!row) return null;

  const r = row as unknown[];
  const clienteDisplay = r[0] != null ? String(r[0]).trim() : clienteNombre.trim();
  const estado = r[1] != null ? String(r[1]).trim() : "Otros";
  const canal = r[2] != null ? String(r[2]).trim() : "";
  const subcanal = r[3] != null ? String(r[3]).trim() : "";

  const monthLabels: string[] = [];
  for (const h of header) {
    if (/^venta\s+/i.test(h || "")) {
      const label = String(h).replace(/^venta\s+/i, "").trim();
      if (label) monthLabels.push(label);
    }
  }

  const findHeaderIdx = (fullLabel: string) =>
    header.findIndex((h) => (h || "").toLowerCase() === fullLabel.toLowerCase());

  const mesRows: DicfMesRowParsed[] = monthLabels.map((mes) => {
    const iV = findHeaderIdx(`Venta ${mes}`);
    const iD = findHeaderIdx(`Descuento ${mes}`);
    const iM = findHeaderIdx(`Margen ${mes}`);
    const ventaTonRaw = iV >= 0 ? Number(r[iV]) : NaN;
    const descMxnRaw = iD >= 0 ? Number(r[iD]) : NaN;
    const margenKgRaw = iM >= 0 ? Number(r[iM]) : NaN;
    const ventaTon = Number.isFinite(ventaTonRaw) ? ventaTonRaw : null;
    const descMxn = Number.isFinite(descMxnRaw) ? descMxnRaw : null;
    const margenKg = Number.isFinite(margenKgRaw) ? margenKgRaw : null;
    const ventaKg = ventaTon != null ? ventaTon * 1000 : null;
    const descKg = ventaKg != null && ventaKg > 0 && descMxn != null ? descMxn / ventaKg : null;
    const ingresoMxn =
      ventaKg != null && ventaKg > 0 && margenKg != null
        ? ventaKg * margenKg - Math.abs(descMxn != null ? descMxn : 0)
        : null;
    return { mes, ventaTon, descKg, ingresoMxn, _descMxn: descMxn, _margenKg: margenKg };
  });

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const dateHeaders: string[] = [];
  const kgSeries: number[] = [];
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (!dateRe.test(h)) continue;
    const ton = Number(r[i]);
    const kg = Number.isFinite(ton) ? ton * 1000 : 0;
    dateHeaders.push(h);
    kgSeries.push(kg);
  }

  const freqDays = medianGapFromSeries(kgSeries);
  const daysSinceLast = daysSinceLastFromSeries(kgSeries);
  let lastPurchaseDate: string | null = null;
  for (let k = kgSeries.length - 1; k >= 0; k--) {
    if (kgSeries[k] > 0) {
      lastPurchaseDate = dateHeaders[k] || null;
      break;
    }
  }

  let daysSinceLastReal: number | null = null;
  const ref = dicfLastDate ? parseDateKey(dicfLastDate) : null;
  const lastPur = lastPurchaseDate ? parseDateKey(lastPurchaseDate) : null;
  if (ref && lastPur) {
    daysSinceLastReal = Math.round((ref.getTime() - lastPur.getTime()) / 86400000);
  }

  const historyLast4Weeks: { fecha: string; kg: number }[] = [];
  const start = Math.max(0, kgSeries.length - 56);
  for (let k = start; k < kgSeries.length; k++) {
    const kgVal = kgSeries[k] || 0;
    if (kgVal > 0 && dateHeaders[k]) historyLast4Weeks.push({ fecha: dateHeaders[k], kg: kgVal });
  }

  const cliente: DeltaIngresoForecastCliente = {
    cliente: clienteDisplay,
    ingresoA: 0,
    ingresoB: 0,
    deltaIngreso: 0,
    canal,
    subcanal,
    estado,
    freqDays,
    daysSinceLast,
    lastPurchaseDate,
    daysSinceLastReal,
    historyLast4Weeks,
    kgAStr: "—",
    kgBStr: "—",
    deltaKgStr: "—",
    ingresoAStr: "—",
    ingresoBStr: "—",
    deltaIngresoStr: "—",
  };

  return { cliente, mesRows };
}
