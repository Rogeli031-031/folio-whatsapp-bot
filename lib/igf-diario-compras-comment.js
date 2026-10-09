"use strict";

/**
 * Bloque COMPRAS al inicio de COMENTARIO DEL DIA.
 * El costo es el consolidado ya calculado por CONTROL DE COMPRAS (importe / kg).
 * Los proveedores salen de la compra real del día, con kg > 0.
 */

const RED = "FFDC2626";
const GREEN = "FF15803D";
const NEUTRAL = "FF334155";

function round3(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

function format3(value) {
  const n = round3(value);
  if (n == null) return "";
  return n.toFixed(3);
}

function formatSigned3(value) {
  const n = round3(value);
  if (n == null) return "";
  if (n > 0) return `+${n.toFixed(3)}`;
  return n.toFixed(3);
}

function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10) / 10;
  const intLike = Math.abs(rounded - Math.round(rounded)) < 1e-6;
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: intLike ? 0 : 1,
  }).format(intLike ? Math.round(rounded) : rounded);
}

function validCost(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function providerBuys(day, providers) {
  const cells = (day && day.cells) || {};
  const buys = [];
  for (const provider of providers || []) {
    const cell = cells[provider.id] != null ? cells[provider.id] : cells[String(provider.id)];
    const kg = cell ? Number(cell.kg) : 0;
    if (!(kg > 0)) continue;
    const nombre = String(provider.nombre || "").trim().toUpperCase();
    if (!nombre) continue;
    buys.push({ nombre, kg });
  }
  return buys;
}

function dayRecord(day, providers) {
  const cons = day && day.consolidado;
  return {
    fecha: day && (day.ymd || day.fecha),
    costo_kg: validCost(cons && cons.costo_kg),
    providers: providerBuys(day, providers),
  };
}

function purchaseClause(providers) {
  const rows = providers || [];
  if (!rows.length) return "";
  const body = rows.map((row) => `${row.nombre} — ${formatKg(row.kg)} kg`).join("; ");
  return rows.length === 1 ? ` Compra: ${body}.` : ` Compras: ${body}.`;
}

function comprasComment(today, priors) {
  const cost = validCost(today && today.costo_kg);
  if (cost == null) return null;
  const todayText = format3(cost);
  const clause = purchaseClause(today.providers);
  const used = (priors || []).filter((day) => validCost(day && day.costo_kg) != null).slice(-2);
  if (!used.length) {
    return {
      plain: `COMPRAS: Costo de compra ${todayText} $/kg hoy.${clause}`,
      mark: null,
    };
  }
  const average = used.reduce((sum, day) => sum + Number(day.costo_kg), 0) / used.length;
  const delta = round3(cost - average);
  const deltaText = `${formatSigned3(delta)} $/kg`;
  const lead = delta > 0
    ? "COMPRAS: Incrementó el costo de compra "
    : delta < 0
      ? "COMPRAS: Disminuyó el costo de compra "
      : "COMPRAS: Sin cambio en el costo de compra ";
  const color = delta > 0 ? RED : delta < 0 ? GREEN : NEUTRAL;
  const refText = format3(average);
  const middle = used.length >= 2
    ? `, de una referencia promedio de ${refText} $/kg en los 2 días anteriores a ${todayText} $/kg hoy.`
    : `, respecto al último día con compra de ${refText} $/kg a ${todayText} $/kg hoy.`;
  const tail = `${middle}${clause}`;
  return {
    plain: `${lead}${deltaText}${tail}`,
    mark: { lead, deltaText, tail, color },
    reference: round3(average),
    delta,
  };
}

function commentCellValue(pack) {
  if (!pack || !pack.comentario) return null;
  const mark = pack.comprasMark;
  if (!mark || !mark.deltaText) return pack.comentario;
  return {
    richText: [
      { text: mark.lead },
      { text: mark.deltaText, font: { color: { argb: mark.color } } },
      { text: `${mark.tail}${mark.rest ? `\n${mark.rest}` : ""}` },
    ],
  };
}

function applyPayload(insights, payload) {
  if (!insights || !payload || !payload.grid) return insights;
  const eligibleEnd = insights.eligibleEnd;
  if (!eligibleEnd) return insights;
  const year = Number(payload.year);
  const month = Number(payload.month);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const providers = payload.providers || [];
  const monthByFecha = new Map();
  for (const day of payload.grid.days || []) {
    const rec = dayRecord(day, providers);
    if (rec.fecha) monthByFecha.set(rec.fecha, rec);
  }
  const series = [];
  for (const prior of payload.costos_previos_validos || []) {
    const cost = validCost(prior && prior.costo_kg);
    if (!prior || !prior.fecha || cost == null) continue;
    series.push({ fecha: prior.fecha, costo_kg: cost, providers: [] });
  }
  for (const rec of monthByFecha.values()) {
    if (rec.costo_kg == null) continue;
    series.push(rec);
  }
  series.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const byDate = insights.byDate || {};
  insights.byDate = byDate;
  for (const rec of series) {
    if (!rec.fecha || rec.fecha < start || rec.fecha > eligibleEnd) continue;
    if (!monthByFecha.has(rec.fecha)) continue;
    const existing = byDate[rec.fecha] || { comentario: "", ventas: "" };
    if (existing.comprasMark || String(existing.comentario || "").startsWith("COMPRAS:")) continue;
    const priors = series.filter((day) => day.fecha < rec.fecha);
    const block = comprasComment(rec, priors);
    if (!block) continue;
    const rest = existing.comentario || "";
    byDate[rec.fecha] = {
      ...existing,
      comentario: rest ? `${block.plain}\n${rest}` : block.plain,
      comprasMark: block.mark ? { ...block.mark, rest } : null,
    };
  }
  return insights;
}

module.exports = {
  RED,
  GREEN,
  NEUTRAL,
  round3,
  format3,
  formatKg,
  validCost,
  providerBuys,
  dayRecord,
  comprasComment,
  commentCellValue,
  applyPayload,
};
