"use strict";

/**
 * Ingreso cliente (pesos): misma expresión que Clientes por mes / Excel exportado.
 * No es la fórmula OLS de computeDeltaIngresoForecast.
 *
 * @param {number} kg
 * @param {number|null|undefined} descKg
 * @param {{ margenKg?: number|null, hgDisplay?: number|null, hgDinero?: number|null }} m
 * @param {number|null} [hgCliente]
 * @param {number|null} [hgCompra]
 * @returns {number|null}
 */
function ingresoClienteMarginal(kg, descKg, m, hgCliente, hgCompra) {
  if (kg <= 0) return null;
  const metrics = m || {};
  const margen = metrics.margenKg;
  const hgMes = metrics.hgDisplay;
  const hgDinMes = metrics.hgDinero;
  if (margen == null) return null;
  const hg = hgCliente != null && Number.isFinite(hgCliente) ? hgCliente : hgMes;
  const hgDin = hgCompra != null && Number.isFinite(hgCompra) ? hgCompra : hgDinMes;
  if (hg == null || hgDin == null) return null;
  const d = descKg ?? 0;
  const dMag = Number.isFinite(d) ? Math.abs(d) : 0;
  const raw = kg * (margen - dMag) + (hg * kg * hgDin) / 100;
  return Math.round(raw);
}

/**
 * target_kg que Clientes por mes manda a computeClientesDescuentoMes.
 * @param {number|null|undefined} ventaTon
 * @returns {number|undefined}
 */
function targetKgDesdeIgfVentaTon(ventaTon) {
  const ton = ventaTon == null ? NaN : Number(ventaTon);
  if (!Number.isFinite(ton) || ton <= 0) return undefined;
  return Math.round(ton * 1000 * 100) / 100;
}

/**
 * HG de fila IGF: hg_pct decimal (0.02 → display 2) y hgDinero = |hg_kg / hg_pct|.
 * @param {{ hg_pct?: number|null, hg_kg?: number|null, hgPct?: number|null, hgKg?: number|null }} row
 */
function metricsFromIgfLine(row) {
  const src = row || {};
  const hgPct = src.hgPct != null ? Number(src.hgPct) : src.hg_pct != null ? Number(src.hg_pct) : null;
  const hgKg = src.hgKg != null ? Number(src.hgKg) : src.hg_kg != null ? Number(src.hg_kg) : null;
  const hgDisplay = hgPct != null && Number.isFinite(hgPct) ? hgPct * 100 : null;
  const hgDinero =
    hgKg != null && hgPct != null && Number.isFinite(hgKg) && Number.isFinite(hgPct) && hgPct !== 0
      ? Math.abs(hgKg / hgPct)
      : null;
  return { hgDisplay, hgDinero, hgPct, hgKg };
}

module.exports = {
  ingresoClienteMarginal,
  targetKgDesdeIgfVentaTon,
  metricsFromIgfLine,
};
