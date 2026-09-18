"use strict";

/**
 * 009 — Enriquecimiento de última compra cuando computeDicf trae freqDays
 * pero lastPurchaseDate es null. Fixtures de 30/20 formas viven en test/.
 */

const FAMILY_IDS = Object.freeze([
  "EXPECTED_NEXT_PURCHASE_ENRICHED",
  "LAST_PURCHASE",
  "PURCHASE_FREQUENCY",
  "PURCHASE_OVERDUE",
]);

const SOURCE_PRIORITY = Object.freeze({
  lastPurchaseDate: ["computeDicf.lastPurchaseDate", "arr.dicf_cliente_mes.last_date", "arr.ventas_diarias_cliente.MAX(fecha)"],
  freqDays: ["computeDicf.freqDays", "arr.dicf_cliente_mes.freq_days"],
});

function nq(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nclient(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isValidYmd(value) {
  const s = value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const dt = new Date(`${s}T00:00:00`);
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
  return s;
}

function isValidFreqDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n >= 9999) return null;
  return n;
}

function addDaysYmd(ymd, days) {
  const base = isValidYmd(ymd);
  const freq = isValidFreqDays(days);
  if (!base || freq == null) return null;
  const dt = new Date(`${base}T00:00:00`);
  dt.setDate(dt.getDate() + freq);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function formatDmy(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd || "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function indexByClient(rows, dateField) {
  const map = new Map();
  for (const row of rows || []) {
    const key = nclient(row.cliente || row.cliente_norm);
    if (!key || map.has(key)) continue;
    const ymd = isValidYmd(row[dateField] || row.lastPurchaseDate || row.last_date || row.max_fecha);
    const freq = isValidFreqDays(row.freqDays != null ? row.freqDays : row.freq_days);
    map.set(key, { ymd, freq, raw: row });
  }
  return map;
}

function rowNeedsLastDate(row) {
  return Boolean(nclient(row && row.cliente)) && !isValidYmd(row && row.lastPurchaseDate);
}

function rowNeedsFreq(row) {
  return Boolean(nclient(row && row.cliente)) && isValidFreqDays(row && row.freqDays) == null;
}

async function loadCacheLastDates(db, codes, now) {
  if (!db || typeof db.query !== "function" || !codes || !codes.length) return [];
  const year = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getFullYear() : new Date().getFullYear();
  const month = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getMonth() + 1 : new Date().getMonth() + 1;
  try {
    const cached = await db.query(
      `SELECT cliente_norm AS cliente, freq_days AS "freqDays", last_date AS "lastPurchaseDate"
         FROM arr.dicf_cliente_mes
        WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
          AND year = $2 AND month = $3`,
      [codes.map((c) => String(c).toUpperCase()), year, month]
    );
    return cached.rows || [];
  } catch (_e) {
    return [];
  }
}

async function loadVentasMaxDates(db, codes, clientKeys) {
  if (!db || typeof db.query !== "function" || !codes || !codes.length) return [];
  const keys = (clientKeys || []).filter(Boolean);
  try {
    const ventas = await db.query(
      `SELECT cliente_norm AS cliente, MAX(fecha)::date AS max_fecha
         FROM arr.ventas_diarias_cliente
        WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])
          AND kg > 0
        GROUP BY cliente_norm`,
      [codes.map((c) => String(c).toUpperCase())]
    );
    const rows = ventas.rows || [];
    if (!keys.length) return rows;
    const want = new Set(keys.map(nclient));
    return rows.filter((r) => want.has(nclient(r.cliente)));
  } catch (_e) {
    return [];
  }
}

async function enrichDicfClientsLastPurchase(rows, opts = {}) {
  const list = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  if (!list.length) return list;
  const cacheRows = Array.isArray(opts.dicfCacheRows)
    ? opts.dicfCacheRows
    : await loadCacheLastDates(opts.db, opts.plantCodes, opts.now);
  const cacheMap = indexByClient(cacheRows, "lastPurchaseDate");
  const needVentas = list.filter(rowNeedsLastDate).filter((r) => {
    const hit = cacheMap.get(nclient(r.cliente));
    return !(hit && hit.ymd);
  });
  let ventasRows = [];
  if (Array.isArray(opts.ventasMaxByClient)) {
    ventasRows = opts.ventasMaxByClient;
  } else if (opts.ventasMaxByClient && typeof opts.ventasMaxByClient === "object") {
    ventasRows = Object.entries(opts.ventasMaxByClient).map(([cliente, max_fecha]) => ({ cliente, max_fecha }));
  } else if (needVentas.length) {
    ventasRows = await loadVentasMaxDates(
      opts.db,
      opts.plantCodes,
      needVentas.map((r) => r.cliente)
    );
  }
  const ventasMap = indexByClient(ventasRows, "max_fecha");

  return list.map((row) => {
    const key = nclient(row.cliente);
    let last = isValidYmd(row.lastPurchaseDate);
    let lastSource = last ? "computeDicf.lastPurchaseDate" : null;
    let freq = isValidFreqDays(row.freqDays);
    let freqSource = freq != null ? "computeDicf.freqDays" : null;
    const cache = cacheMap.get(key);
    if (!last && cache && cache.ymd) {
      last = cache.ymd;
      lastSource = "arr.dicf_cliente_mes.last_date";
    }
    if (freq == null && cache && cache.freq != null) {
      freq = cache.freq;
      freqSource = "arr.dicf_cliente_mes.freq_days";
    }
    const venta = ventasMap.get(key);
    if (!last && venta && venta.ymd) {
      last = venta.ymd;
      lastSource = "arr.ventas_diarias_cliente.MAX(fecha)";
    }
    return {
      ...row,
      lastPurchaseDate: last,
      freqDays: freq != null ? freq : row.freqDays,
      last_source: lastSource,
      freq_source: freqSource,
    };
  });
}

function isLastPurchaseQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /\bultima\s+compra\b/.test(n) ||
      /\bcuando\s+compro\s+por\s+ultima\b/.test(n) ||
      /\bque\s+dia\s+compro\s+por\s+ultima\b/.test(n) ||
      /\bfecha\s+de\s+la\s+ultima\s+compra\b/.test(n)
  );
}

function isFrequencyQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\bcuando\b/.test(n) || /\bproxima\s+compra\b/.test(n) || /\bsiguiente\s+(compra|pedido)\b/.test(n)) return false;
  if (/\b(rompiendo|rompieron|respecto|fuera|patron)\b/.test(n)) return false;
  if (/\bquien(?:es)?\b/.test(n) || /\bque\s+clientes\b/.test(n)) return false;
  return Boolean(
    /\bcada\s+cuantos\s+dias\b/.test(n) ||
      /\bque\s+frecuencia\b/.test(n) ||
      /\bfrecuencia\s+de\b/.test(n) ||
      /\bcual\s+es\s+su\s+frecuencia\b/.test(n) ||
      /\by\s+su\s+frecuencia\b/.test(n) ||
      /\bfreqdays\b/.test(n) ||
      /\bcon\s+que\s+frecuencia\b/.test(n)
  );
}

function isOverdueQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (/\baction\s+register\b/.test(n) || /\bacciones?\b/.test(n)) return false;
  if (/\bquien(?:es)?\b/.test(n) || /\bque\s+clientes\b/.test(n) || /\bcuentas\s+estan\b/.test(n)) return false;
  if (/\b(fuente|tabla|datos|informacion|corte)\b/.test(n)) return false;
  return Boolean(
    /\besta\s+atrasad/.test(n) ||
      /\bcuantos\s+dias\s+lleva\s+sin\s+comprar\b/.test(n) ||
      /\bdias\s+sin\s+comprar\b/.test(n) ||
      /\bcuando\s+deberia\s+haber\s+comprado\b/.test(n) ||
      /\bse\s+paso\s+de\s+su\s+frecuencia\b/.test(n)
  );
}

function isEnrichedExpectedNextQuestion(question) {
  const { isExpectedNextPurchaseQuestion } = require("./director-ia-predictive-commercial");
  if (isLastPurchaseQuestion(question) || isFrequencyQuestion(question) || isOverdueQuestion(question)) {
    return false;
  }
  return typeof isExpectedNextPurchaseQuestion === "function" && isExpectedNextPurchaseQuestion(question);
}

function classifyPurchaseEvidenceFamily(question) {
  if (isLastPurchaseQuestion(question)) return "LAST_PURCHASE";
  if (isFrequencyQuestion(question)) return "PURCHASE_FREQUENCY";
  if (isOverdueQuestion(question)) return "PURCHASE_OVERDUE";
  if (isEnrichedExpectedNextQuestion(question)) return "EXPECTED_NEXT_PURCHASE_ENRICHED";
  return null;
}

function buildLastPurchaseAnswer(row) {
  return `${row.cliente} compró por última vez el ${formatDmy(row.lastPurchaseDate)} (${row.lastPurchaseDate}).`;
}

function buildFrequencyAnswer(row) {
  return `La frecuencia histórica de ${row.cliente} es aproximadamente cada ${row.historical_frequency || row.freqDays} días (freqDays).`;
}

function buildOverdueAnswer(row, asOf) {
  const expected = row.expected_next || addDaysYmd(row.lastPurchaseDate, row.historical_frequency || row.freqDays);
  const days = Number(row.days_since_last_purchase);
  const overdue = Number(row.overdue_days);
  const lines = [
    `${row.cliente} compró por última vez el ${formatDmy(row.lastPurchaseDate)}.`,
    `Lleva ${Number.isFinite(days) ? days : "n/d"} días sin comprar (corte ${asOf || "el corte observado"}).`,
  ];
  if (Number.isFinite(overdue) && overdue > 0) {
    lines.push(`Está atrasada ${overdue} días respecto de su frecuencia histórica de ${row.historical_frequency || row.freqDays} días.`);
    lines.push(`Debió comprar otra vez alrededor del ${formatDmy(expected)} (${expected}).`);
  } else {
    lines.push(`No está atrasada respecto de su frecuencia histórica de ${row.historical_frequency || row.freqDays} días.`);
    lines.push(`La siguiente compra esperada por ese patrón sería alrededor del ${formatDmy(expected)} (${expected}).`);
  }
  lines.push("");
  lines.push("Es una estimación histórica / estimación basada en frecuencia histórica (last_purchase_date + freqDays), no un compromiso ni forecast contractual.");
  return lines.join("\n");
}

function buildEnrichedExpectedAnswer(row) {
  return [
    `${row.cliente} compró por última vez el ${formatDmy(row.lastPurchaseDate)}.`,
    `Su frecuencia histórica es aproximadamente cada ${row.historical_frequency || row.freqDays} días.`,
    `La siguiente compra esperada por ese patrón sería alrededor del ${formatDmy(row.expected_next)} (${row.expected_next}).`,
    "",
    "Es una estimación histórica / estimación basada en frecuencia histórica (last_purchase_date + freqDays), no un compromiso ni forecast contractual.",
  ].join("\n");
}

function buildPurchaseEvidenceAnswer(row, question, asOf) {
  const family = classifyPurchaseEvidenceFamily(question);
  if (family === "LAST_PURCHASE") return buildLastPurchaseAnswer(row);
  if (family === "PURCHASE_FREQUENCY") return buildFrequencyAnswer(row);
  if (family === "PURCHASE_OVERDUE") return buildOverdueAnswer(row, asOf);
  return buildEnrichedExpectedAnswer(row);
}

function folioStatusBreakdown(records) {
  const list = Array.isArray(records) ? records : [];
  const paid = list.filter((r) => String(r.estatus || "").toUpperCase() === "PAGADO").length;
  const pending = list.filter((r) => String(r.estatus || "").toUpperCase().includes("PENDIENTE")).length;
  const other = Math.max(0, list.length - paid - pending);
  return { total: list.length, paid, pending, other };
}

function formatTallerStatusLines(breakdown) {
  const lines = [`${breakdown.total} folios`, `${breakdown.paid} pagados`, `${breakdown.pending} pendientes`];
  if (breakdown.total !== breakdown.paid + breakdown.pending) {
    lines.push(`${breakdown.other} en otros estados`);
  }
  return lines;
}

module.exports = {
  FAMILY_IDS,
  SOURCE_PRIORITY,
  nq,
  nclient,
  isValidYmd,
  isValidFreqDays,
  addDaysYmd,
  formatDmy,
  enrichDicfClientsLastPurchase,
  loadCacheLastDates,
  loadVentasMaxDates,
  isLastPurchaseQuestion,
  isFrequencyQuestion,
  isOverdueQuestion,
  classifyPurchaseEvidenceFamily,
  buildLastPurchaseAnswer,
  buildFrequencyAnswer,
  buildOverdueAnswer,
  buildEnrichedExpectedAnswer,
  buildPurchaseEvidenceAnswer,
  folioStatusBreakdown,
  formatTallerStatusLines,
};
