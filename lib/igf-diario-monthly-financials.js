"use strict";

const { finiteMetric } = require("./igf-diario-puebla");
const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");

function usesOctoberContract(year, month) {
  return usesDetailedExpenseLayout(year, month);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function weightedByVenta(days, valueOf, ventaOf) {
  const readValue = typeof valueOf === "function" ? valueOf : (day) => day && day[valueOf];
  const readVenta = typeof ventaOf === "function" ? ventaOf : (day) => day && day[ventaOf || "ventaKg"];
  let numerator = 0;
  let denominator = 0;
  let any = false;
  for (const day of days || []) {
    const venta = finiteMetric(readVenta(day));
    const value = finiteMetric(readValue(day));
    if (venta == null || value == null) continue;
    numerator += value * venta;
    denominator += venta;
    any = true;
  }
  if (!any || denominator === 0) return null;
  return numerator / denominator;
}

function promAt(prom, isoDow) {
  if (!prom || isoDow < 1 || isoDow > 7) return null;
  const value = prom[isoDow - 1];
  if (value === "" || value == null) return null;
  return finiteMetric(value);
}

function mapValue(map, fecha) {
  if (!map || typeof map.get !== "function" || !map.has(fecha)) return null;
  return finiteMetric(map.get(fecha));
}

/**
 * Serie diaria de C&D y venta. Antes del corte: valor capturado.
 * Desde el corte: el PROM del día de semana, sin resumir el mes por DOW.
 * La venta entra en toneladas y sale en kilogramos.
 */
function discountSeriesFromMaps(spec) {
  const year = Number(spec && spec.year);
  const month = Number(spec && spec.month);
  const last = new Date(year, month, 0).getDate();
  const corte = String((spec && spec.corteYmd) || "").slice(0, 10);
  const corteInMonth = Boolean(spec && spec.corteInMonth);
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    const fecha = `${year}-${pad2(month)}-${pad2(day)}`;
    const dt = new Date(year, month - 1, day);
    const iso = dt.getDay() === 0 ? 7 : dt.getDay();
    const projected = corteInMonth && fecha >= corte;
    const ventaTon = projected ? promAt(spec.promVenta, iso) : mapValue(spec.ventaByFecha, fecha);
    const cdKg = projected ? promAt(spec.promDesc, iso) : mapValue(spec.descByFecha, fecha);
    days.push({
      fecha,
      ventaKg: ventaTon == null ? null : ventaTon * 1000,
      cdKg,
    });
  }
  return days;
}

function margenOf(day) {
  const precio = finiteMetric(day && day.precio);
  const costo = finiteMetric(day && day.costoKg);
  const flete = finiteMetric(day && day.fleteKg);
  if (precio != null && costo != null && flete != null) return precio - costo - flete;
  return finiteMetric(day && day.margen);
}

function hgOf(day) {
  if (day && Object.prototype.hasOwnProperty.call(day, "hgKg")) return finiteMetric(day.hgKg);
  const venta = finiteMetric(day && day.ventaKg);
  const importe = finiteMetric(day && day.hgImporte);
  if (venta == null || venta === 0 || importe == null) return null;
  return importe / venta;
}

function hgPctOf(hgKg, hgDollar) {
  if (hgKg == null || hgDollar == null || hgDollar === 0) return null;
  return (hgKg / hgDollar) * -1;
}

function sumComplete(values) {
  let cents = 0;
  for (const value of values) {
    const n = finiteMetric(value);
    if (n == null) return null;
    cents += Math.round(n * 100);
  }
  return cents / 100;
}

function emptyExpenses() {
  return {
    operativosImporte: null,
    gastoCorporativoImporte: null,
    inversionesImporte: null,
    impuestosFederalesImporte: null,
    corporativosImporte: null,
    impuestoKg: null,
    gastoImporte: null,
  };
}

function summarizeDays(days) {
  const list = days || [];
  let ventaKg = null;
  for (const day of list) {
    const venta = finiteMetric(day && day.ventaKg);
    if (venta == null) continue;
    ventaKg = (ventaKg || 0) + venta;
  }
  const costoKg = weightedByVenta(list, (day) => day.costoKg, (day) => day.ventaKg);
  const fleteKg = weightedByVenta(list, (day) => day.fleteKg, (day) => day.ventaKg);
  const margenKg = weightedByVenta(list, (day) => margenOf(day), (day) => day.ventaKg);
  const comDescKg = weightedByVenta(list, (day) => day.cdKg, (day) => day.ventaKg);
  const hgKg = weightedByVenta(list, (day) => hgOf(day), (day) => day.ventaKg);
  const hgDollar = costoKg != null && fleteKg != null ? costoKg + fleteKg : null;
  return {
    contract: "066",
    ventaKg,
    ventaTon: ventaKg == null ? null : ventaKg / 1000,
    costoKg,
    fleteKg,
    margenKg,
    comDescKg,
    hgKg,
    hgDollar,
    hgPct: hgPctOf(hgKg, hgDollar),
    ...emptyExpenses(),
  };
}

function applyExpenses(summary, components, ventaKgOverride) {
  const base = summary || { contract: "066", ...emptyExpenses() };
  const source = components || {};
  const gastoCorporativoImporte = finiteMetric(source.gasto_corporativo);
  const inversionesImporte = finiteMetric(source.inversiones);
  const impuestosFederalesImporte = finiteMetric(source.impuestos_federales);
  const operativosImporte = sumComplete([
    source.presupuesto_nomina_gastos,
    source.presupuesto_imss_sua,
    source.extraordinarios,
    source.provisiones_planta,
  ]);
  const corporativosImporte = gastoCorporativoImporte != null && inversionesImporte != null
    ? Math.round((gastoCorporativoImporte + inversionesImporte) * 100) / 100
    : null;
  const ventaKg = finiteMetric(ventaKgOverride) != null ? finiteMetric(ventaKgOverride) : finiteMetric(base.ventaKg);
  const impuestoKg = impuestosFederalesImporte != null && ventaKg != null && ventaKg > 0
    ? impuestosFederalesImporte / ventaKg
    : null;
  const gastoImporte = operativosImporte != null && corporativosImporte != null
    ? Math.round((operativosImporte + corporativosImporte) * 100) / 100
    : null;
  return {
    ...base,
    contract: "066",
    operativosImporte,
    gastoCorporativoImporte,
    inversionesImporte,
    impuestosFederalesImporte,
    corporativosImporte,
    impuestoKg,
    gastoImporte,
  };
}

module.exports = {
  usesOctoberContract,
  weightedByVenta,
  discountSeriesFromMaps,
  summarizeDays,
  applyExpenses,
  margenOf,
  hgPctOf,
};
