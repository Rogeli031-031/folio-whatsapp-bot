"use strict";

/**
 * Apertura de Pronóstico desde query/chat. Sin phrasebook.
 * Fallback a primera fila solo si NO hay plantHint.
 */

function normalizePlantLabel(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeMiniRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && typeof r === "object");
}

function findPronosticoMiniRow(rows, plantHint) {
  const list = safeMiniRows(rows);
  if (!list.length) return null;
  const n = normalizePlantLabel(plantHint);
  if (!n) return list[0] || null;
  const exact = list.find((r) => {
    const emp = normalizePlantLabel(r.empresa);
    const code = normalizePlantLabel(r.plant_code);
    return emp === n || code === n;
  });
  if (exact) return exact;
  const loose = list.find((r) => {
    const emp = normalizePlantLabel(r.empresa);
    const code = normalizePlantLabel(r.plant_code);
    return (emp && (emp.includes(n) || n.includes(emp))) || (code && (code.includes(n) || n.includes(code)));
  });
  return loose || null;
}

function forecastRowsForRender(igfForecast) {
  if (!igfForecast || !Array.isArray(igfForecast.rows)) return [];
  return igfForecast.rows;
}

/**
 * Decide si la query open_pronostico debe esperar, abrir o consumirse sin abrir.
 * No lanza con mini/forecast/token incompletos.
 */
function decideOpenPronosticoFromQuery(input) {
  const alreadyOpened = Boolean(input && input.alreadyOpened);
  if (alreadyOpened) return { action: "skip" };
  const flag = input && input.openFlag;
  if (flag !== "1" && flag !== 1 && flag !== true) return { action: "skip" };
  const token = input && input.token;
  if (!token) return { action: "wait" };
  const forecast = input && input.igfForecast;
  if (!forecast || forecast.year == null || forecast.month == null) return { action: "wait" };
  const mini = input && input.igfMini;
  if (mini == null) return { action: "wait" };
  if (!Object.prototype.hasOwnProperty.call(mini, "rows")) return { action: "wait" };
  if (!Array.isArray(mini.rows)) return { action: "wait" };
  if (mini.rows.length === 0) return { action: "wait" };
  const plantHint = input && input.plantHint != null ? String(input.plantHint).trim() : "";
  const row = findPronosticoMiniRow(mini.rows, plantHint || null);
  if (plantHint && !row) return { action: "consume_without_open", row: null };
  if (!row) return { action: "wait" };
  return { action: "open", row };
}

function buildOpenPronosticoHref(currentSearch, opts) {
  const params = new URLSearchParams(currentSearch || "");
  params.set("open_pronostico", "1");
  const plant = opts && opts.plant;
  if (plant) params.set("empresa", String(plant));
  const qs = params.toString();
  return qs ? `/igf-forecast?${qs}` : "/igf-forecast?open_pronostico=1";
}

function canOpenPronosticoMiniRow(row, token, igfForecast) {
  if (!row || typeof row !== "object") return false;
  const pc = String(row.plant_code || "").trim();
  if (!pc) return false;
  if (!token) return false;
  if (!igfForecast || igfForecast.year == null || igfForecast.month == null) return false;
  return true;
}

module.exports = {
  normalizePlantLabel,
  safeMiniRows,
  findPronosticoMiniRow,
  forecastRowsForRender,
  decideOpenPronosticoFromQuery,
  buildOpenPronosticoHref,
  canOpenPronosticoMiniRow,
};
