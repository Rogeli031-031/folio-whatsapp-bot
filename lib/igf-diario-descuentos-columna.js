"use strict";

const { SQL_PROV_MAP } = require("./igf-diario-daily-insights");

const GREEN = "FF15803D";
const RED = "FFDC2626";
const COLUMN = 37;

function round3(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

function money3(value) {
  const n = round3(value);
  if (n == null) return "";
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(3)}`;
}

function deltaToken(delta) {
  const n = round3(delta);
  if (n == null) return "";
  if (n > 0) return `+$${n.toFixed(3)}/kg`;
  if (n < 0) return `-$${Math.abs(n).toFixed(3)}/kg`;
  return "$0.000/kg";
}

function purchases(events) {
  const grouped = new Map();
  for (const event of events || []) {
    const cliente = String(event && event.cliente || "").trim();
    const fecha = String(event && event.fecha || "").slice(0, 10);
    const kg = Number(event && event.kg);
    if (!cliente || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !(kg > 0)) continue;
    const key = `${cliente}|${fecha}`;
    const row = grouped.get(key) || { cliente, fecha, kg: 0, monto: 0, saw: false, missing: false };
    row.kg += kg;
    if (event.monto == null || !Number.isFinite(Number(event.monto))) row.missing = true;
    else {
      row.monto += Number(event.monto);
      row.saw = true;
    }
    grouped.set(key, row);
  }
  return [...grouped.values()]
    .map((row) => ({
      cliente: row.cliente,
      fecha: row.fecha,
      kg: row.kg,
      monto: row.saw && !row.missing ? row.monto : null,
    }))
    .sort((a, b) => a.cliente.localeCompare(b.cliente, "es") || a.fecha.localeCompare(b.fecha));
}

function ratio(row) {
  if (!row || !(row.kg > 0) || row.monto == null || !Number.isFinite(Number(row.monto))) return null;
  return Number(row.monto) / Number(row.kg);
}

function discountLines(events, fecha) {
  const target = String(fecha || "").slice(0, 10);
  const rows = purchases(events);
  const byClient = new Map();
  for (const row of rows) {
    const list = byClient.get(row.cliente) || [];
    list.push(row);
    byClient.set(row.cliente, list);
  }
  const lines = [];
  for (const [cliente, list] of byClient) {
    const index = list.findIndex((row) => row.fecha === target);
    if (index <= 0) continue;
    const current = round3(ratio(list[index]));
    const previous = round3(ratio(list[index - 1]));
    if (current == null || previous == null || current === previous) continue;
    const delta = round3(current - previous);
    lines.push({
      cliente,
      prev: previous,
      cur: current,
      delta,
      up: delta > 0,
    });
  }
  lines.sort((a, b) => a.cliente.localeCompare(b.cliente, "es"));
  return lines;
}

function plainLine(line) {
  const verb = line.up ? "Subió" : "Bajó";
  return `${line.cliente} — ${verb} su comisión respecto a su última compra de ${money3(line.prev)}/kg a ${money3(line.cur)}/kg = ${deltaToken(line.delta)}`;
}

function plain(lines) {
  return (lines || []).map(plainLine).join("\n");
}

function cellValue(lines) {
  const rows = lines || [];
  if (!rows.length) return null;
  const richText = [];
  rows.forEach((line, index) => {
    if (index) richText.push({ text: "\n" });
    richText.push({ text: plainLine(line).replace(deltaToken(line.delta), "") });
    richText.push({
      text: deltaToken(line.delta),
      font: { color: { argb: line.up ? RED : GREEN } },
    });
  });
  return { richText };
}

function applyEvents(byDate, events, opts) {
  const bag = byDate || {};
  const end = String((opts && opts.endYmd) || "9999-12-31").slice(0, 10);
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const prefix = Number.isFinite(year) && month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, "0")}-`
    : "";
  const fechas = new Set();
  for (const event of events || []) {
    const fecha = String(event && event.fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > end) continue;
    if (prefix && !fecha.startsWith(prefix)) continue;
    fechas.add(fecha);
  }
  for (const fecha of fechas) {
    const lines = discountLines(events, fecha);
    if (!lines.length) continue;
    if (!bag[fecha]) bag[fecha] = { comentario: "", ventas: "" };
    bag[fecha].descuentosCell = cellValue(lines);
    bag[fecha].descuentosPlain = plain(lines);
  }
  return bag;
}

async function loadPurchaseEvents(client, plantaNombre, endYmd) {
  const plant = String(plantaNombre || "").trim();
  const end = String(endYmd || "").slice(0, 10);
  if (!client || typeof client.query !== "function" || !plant || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
  const sales = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT v.fecha::text AS fecha,
            v.cliente_norm,
            SUM(v.kg)::float8 AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm
         ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
        AND v.fecha <= $2::date
      GROUP BY v.fecha, v.cliente_norm`,
    [plant, end]
  );
  const discounts = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT d.fecha::text AS fecha,
            d.cliente_norm,
            SUM(d.monto)::float8 AS monto
       FROM arr.descuentos_diarios_cliente d
       JOIN prov_map pm
         ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
        AND d.fecha <= $2::date
      GROUP BY d.fecha, d.cliente_norm`,
    [plant, end]
  );
  const montos = new Map();
  for (const row of discounts.rows || []) {
    montos.set(`${String(row.fecha).slice(0, 10)}|${String(row.cliente_norm || "").trim()}`, row.monto);
  }
  return (sales.rows || []).map((row) => {
    const fecha = String(row.fecha || "").slice(0, 10);
    const cliente = String(row.cliente_norm || "").trim();
    const key = `${fecha}|${cliente}`;
    return {
      cliente,
      fecha,
      kg: row.kg,
      monto: montos.has(key) ? montos.get(key) : null,
    };
  });
}

async function attachToInsights(client, insights, opts) {
  if (!insights || !insights.byDate) return insights;
  const events = await loadPurchaseEvents(
    client,
    (opts && opts.plantaNombre) || insights.plantaNombre,
    (opts && opts.endYmd) || insights.eligibleEnd
  );
  applyEvents(insights.byDate, events, {
    endYmd: (opts && opts.endYmd) || insights.eligibleEnd,
    year: opts && opts.year,
    month: opts && opts.month,
  });
  return insights;
}

module.exports = {
  GREEN,
  RED,
  COLUMN,
  round3,
  money3,
  deltaToken,
  discountLines,
  plainLine,
  plain,
  cellValue,
  applyEvents,
  loadPurchaseEvents,
  attachToInsights,
};
