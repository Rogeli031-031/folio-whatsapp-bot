"use strict";

/**
 * 011 — Clientes inactivos, última compra directa, respuesta corta y UI Delta Ingreso.
 * Las 200 formas viven en fixtures de test. No hay phrasebook de producción.
 */

const runtime009 = require("./director-ia-purchase-evidence-enrichment-009");
const runtime010 = require("./director-ia-executive-context-sales-entity-010");

const FAMILY_IDS = Object.freeze([
  "INACTIVE_CLIENTS",
  "LAST_PURCHASE_DIRECT",
  "DIRECT_ANSWER_COMPRESSION",
  "OPEN_CLIENT_DELTA_FORECAST",
]);

const UI_ACTION = "OPEN_CLIENT_DELTA_FORECAST";

const FORBIDDEN_EXPANSION = Object.freeze([
  "MATERIALIDAD COMERCIAL",
  "Action Register",
  "kg_mes_real",
  "share observado",
  "RESUMEN GLOBAL DE PLANTA",
  "CONTEXTO DICF",
]);

const LIST_CAP = 8;

function nq(raw) {
  return runtime010.nq ? runtime010.nq(raw) : runtime009.nq(raw);
}

function nclient(raw) {
  return runtime009.nclient(raw);
}

function formatDmy(ymd) {
  return runtime009.formatDmy(ymd);
}

function daysBetween(ymd, now) {
  const last = runtime009.isValidYmd(ymd);
  if (!last) return null;
  const end = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date(`${last}T00:00:00`);
  const a = new Date(`${last}T00:00:00`);
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

function isVolumeOrShareQuestion(n) {
  return Boolean(
    /\btoneladas?\b/.test(n) ||
      /\bvolumen\b/.test(n) ||
      /\bperdimos\b/.test(n) && /\b(cuanto|cuantas)\b/.test(n) ||
      /\bdisminuy/.test(n) ||
      /\bbajaron\b/.test(n) ||
      /\bcompraron\s+(menos|poco)\b/.test(n) ||
      /\bmenor\s+volumen\b/.test(n) ||
      /\bbaja\s+participacion\b/.test(n) ||
      /\bshare\b/.test(n) ||
      /\bmezcla\b/.test(n)
  );
}

function isExpansionRequest(question) {
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /\bpor\s+que\b/.test(n) ||
      /\bdiagnostico\b/.test(n) ||
      /\banalisis\b/.test(n) ||
      /\bcontexto\s+completo\b/.test(n) ||
      /\btodo\s+el\s+contexto\b/.test(n) ||
      /\bresumen\s+ejecutivo\b/.test(n) ||
      /\bque\s+evidencia\b/.test(n) ||
      /\bexplicame\s+que\s+esta\s+pasando\b/.test(n) ||
      /\bdame\s+todo\b/.test(n)
  );
}

function isOpenPronosticoCollision(n) {
  return /\bventa\s+diaria\b/.test(n) || (/\bpronostico\b/.test(n) && !/\b(cliente|ficha|detalle|informacion|forecast)\b/.test(n));
}

function isCategoryMovementCollision(n) {
  return (
    /\bmovimiento\s+por\s+categoria\b/.test(n) ||
    /\bcomision(?:es)?\s+de\s+(casa|comisionista)\b/.test(n) ||
    (/\btabla\b/.test(n) && /\bcomision/.test(n))
  );
}

function isInactiveClientsQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isVolumeOrShareQuestion(n)) return false;
  if (isOpenClientDeltaQuestion(question)) return false;
  if (/\briesgo\b/.test(n) && /\bdejar\s+de\s+comprar\b/.test(n)) return false;
  if (/\bnuevos?\b/.test(n)) return false;
  if (/\bcuantos\b/.test(n) && !/\b(que\s+clientes|quienes|lista)\b/.test(n)) return false;
  if (/\bdejo\s+de\b/.test(n) && !/\b(clientes?|quienes|quien|lista)\b/.test(n)) return false;
  return Boolean(
    /\bno\s+han\s+comprado\b/.test(n) ||
      /\bno\s+ha\s+comprado\b/.test(n) ||
      /\bno\s+tienen\s+compras?\b/.test(n) ||
      /\bsin\s+compra\b/.test(n) ||
      /\bsin\s+compras\b/.test(n) ||
      /\bsin\s+movimiento\b/.test(n) ||
      /\binactiv/.test(n) ||
      /\bdejaron\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\bdejo\s+de\s+(comprar|consumir|pedir|comprarnos)\b/.test(n) ||
      /\bya\s+no\s+esta\s+comprando\b/.test(n) ||
      /\bno\s+han\s+vuelto\s+a\s+comprar\b/.test(n) ||
      /\bno\s+han\s+(consumido|pedido|regresado|hecho\s+compra)\b/.test(n) ||
      /\bdejaron\s+de\s+pedir/.test(n) ||
      /\bno\s+tienen\s+movimiento\b/.test(n) ||
      /\bno\s+han\s+vuelto\b/.test(n) ||
      /\bsiguen\s+sin\s+comprar\b/.test(n) ||
      /\bno\s+compran\b/.test(n) ||
      /\bno\s+compraron\b/.test(n) ||
      /\bsin\s+actividad\s+de\s+compra\b/.test(n) ||
      /\bquietos\s+comercialmente\b/.test(n) ||
      /\bdormidos\s+comercialmente\b/.test(n) ||
      /\bestan\s+parados\b/.test(n) ||
      /\bllevan?\s+tiempo\s+sin\s+comprar\b/.test(n) ||
      /\bmas\s+tiempo\s+sin\s+comprar\b/.test(n) ||
      /\batrasados?\s+en\s+compra\b/.test(n) ||
      /\bcompras\s+recientes\b/.test(n) && /\bno\b/.test(n)
  );
}

function isLastPurchaseDirectQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isInactiveClientsQuestion(question)) return false;
  if (/\besperamos\s+que\s+vuelva\b/.test(n) || /\bcuando\s+vuelve\b/.test(n)) return false;
  if (isOpenClientDeltaQuestion(question)) return false;
  return Boolean(
    /\bultima\s+(vez|compra|fecha)\b/.test(n) ||
      /\bcompra\s+(mas\s+)?(reciente|ultima)\b/.test(n) ||
      /\bfecha\s+de\s+(la\s+)?ultima\b/.test(n) ||
      /\bultima\s+fecha\b/.test(n) ||
      /\bhace\s+cuanto\s+(no\s+)?(nos\s+)?compra\b/.test(n) ||
      /\bdesde\s+(cuando|que\s+dia)\s+no\s+(nos\s+)?compra\b/.test(n) ||
      /\bque\s+dia\s+(nos\s+)?compro\b/.test(n) ||
      /\bcuando\s+nos\s+compro\b/.test(n) ||
      (/\bcuando\s+compro\b/.test(n) && /\b(ultima|reciente)\b/.test(n)) ||
      /\bcuando\s+fue\s+(su\s+)?(ultima|la\s+ultima|la\s+compra|su\s+compra)\b/.test(n) ||
      /\bcompro\s+mas\s+recientemente\b/.test(n) ||
      /\bcual\s+fue\s+(su\s+)?(ultima|la\s+ultima)\b/.test(n) ||
      /\bcual\s+es\s+(su\s+)?(fecha|ultima|la\s+ultima|la\s+compra)\b/.test(n) ||
      /\bhace\s+cuanto\s+no\s+hay\s+compra\b/.test(n)
  );
}

function isDirectCompressionQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isOpenClientDeltaQuestion(question) || isInactiveClientsQuestion(question) || isLastPurchaseDirectQuestion(question)) {
    return false;
  }
  if (isExpansionRequest(question)) return false;
  return Boolean(
    /\bcada\s+cuanto\b/.test(n) ||
      /\bcada\s+cuantos\s+dias\b/.test(n) ||
      /\bfrecuencia\b/.test(n) ||
      /\bciclo\s+de\s+compra\b/.test(n) ||
      /\batras/.test(n) && !/\baction\s+register\b/.test(n) ||
      /\bdias\s+(lleva|van|cumple|tiene)\b/.test(n) ||
      /\bdias\s+sin\s+(comprar|compra|movimiento)\b/.test(n) ||
      /\bsin\s+movimiento\b/.test(n) && /\bdias\b/.test(n) ||
      /\bcuando\s+(deberia|esperamos|vuelve|le\s+toca|se\s+espera|toca|cae)\b/.test(n) ||
      /\bcuantos\b/.test(n) && (/\binactiv/.test(n) || /\bno\s+han\s+comprado\b/.test(n) || /\bsin\s+compra\b/.test(n)) ||
      (/\bcuando\s+compro\b/.test(n) && !/\bultima\b/.test(n)) ||
      /\bvencido\s+el\s+ciclo\b/.test(n) ||
      /\bsiguiente\s+compra\b/.test(n) ||
      /\bdeberia\s+haber\s+(vuelto|comprado)\b/.test(n) ||
      /\ble\s+toca\s+(volver|comprar)\b/.test(n) ||
      /\bdias\s+tiene\s+de\s+inactividad\b/.test(n)
  );
}

function isOpenClientDeltaQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (isOpenPronosticoCollision(n) || isCategoryMovementCollision(n)) return false;
  if (/\btabla\b/.test(n) && /\b(casa|comisionista|categoria|comision)/.test(n)) return false;
  if (/\bfolio\b/.test(n) || (/\btaller\b/.test(n) && !/\bcliente\b/.test(n))) return false;
  const open =
    /\babre\b/.test(n) ||
    /\babrela\b/.test(n) ||
    /\babrir\b/.test(n) ||
    /\bmuestra/.test(n) ||
    /\bensena/.test(n) ||
    /\bquiero\s+ver\b/.test(n);
  if (!open) return false;
  const target =
    /\binformacion\b/.test(n) ||
    /\bdetalle\b/.test(n) ||
    /\bficha\b/.test(n) ||
    /\bforecast\b/.test(n) ||
    /\bdelta\s+de\s+ingreso\b/.test(n) ||
    /\bdatos\b/.test(n) ||
    /\bcliente\b/.test(n) ||
    /\bsu\s+informacion\b/.test(n) ||
    /\bese\s+cliente\b/.test(n) ||
    /\besa\s+cliente\b/.test(n);
  if (target) return true;
  const leftover = extractClientHint(question, prior);
  return Boolean(leftover && leftover.length >= 3);
}

function extractClientHint(question, prior, rows) {
  const n = nq(question);
  const catalog = Array.isArray(rows) ? rows : (prior && prior.catalog_rows) || [];
  const catalogHits = [];
  const seen = new Set();
  for (const row of catalog) {
    const name = String((row && (row.cliente || row.canonical_name)) || "").trim();
    const key = nclient(name);
    if (!key || seen.has(key) || key.length < 3) continue;
    if (n.includes(key)) {
      seen.add(key);
      catalogHits.push(name);
    }
  }
  if (catalogHits.length === 1) return catalogHits[0];
  const leftover = n
    .replace(
      /\b(abre|abrir|abrela|muestra|muestrame|ensename|ensena|quiero|ver|la|el|los|las|de|del|en|para|informacion|detalle|ficha|forecast|delta|ingreso|datos|cliente|clientes|su|sus|ese|esa|este|esta|me|te|se|un|una|al|con|por|favor|ahora|tambien|y|cuando|fue|ultima|vez|que|compro|compra|fecha|hace|cuanto|desde|dia|tabla|tablas|comision|comisiones|categoria|categorias|casa|comisionista|movimiento|venta|diaria)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (
    leftover &&
    leftover.length >= 3 &&
    leftover.split(" ").length <= 6 &&
    !/^(cual|que|dame|dime|su|sus|este|esta|ese|esa)$/.test(leftover) &&
    !runtime010.isNonPlantBusinessToken(leftover)
  ) {
    return leftover;
  }
  const active = runtime010.resolveActiveClient({ prior, conversation_state: prior });
  return active && active.canonical_name ? active.canonical_name : null;
}

function classify011Family(question, prior) {
  if (isOpenClientDeltaQuestion(question, prior)) return "OPEN_CLIENT_DELTA_FORECAST";
  if (isInactiveClientsQuestion(question)) return "INACTIVE_CLIENTS";
  if (isLastPurchaseDirectQuestion(question)) return "LAST_PURCHASE_DIRECT";
  if (isDirectCompressionQuestion(question)) return "DIRECT_ANSWER_COMPRESSION";
  return null;
}

function isDirectClientFamily(family) {
  return FAMILY_IDS.includes(family);
}

function wantsCompressedAnswer(question, family) {
  if (isExpansionRequest(question)) return false;
  return (
    family === "INACTIVE_CLIENTS" ||
    family === "LAST_PURCHASE_DIRECT" ||
    family === "DIRECT_ANSWER_COMPRESSION" ||
    family === "LAST_PURCHASE" ||
    family === "PURCHASE_FREQUENCY" ||
    family === "DAYS_SINCE_LAST" ||
    family === "OVERDUE_STATUS" ||
    family === "EXPECTED_NEXT_PURCHASE"
  );
}

function answerHasForbiddenExpansion(answer) {
  const text = String(answer || "");
  return FORBIDDEN_EXPANSION.some((tok) => text.includes(tok));
}

function rowLastYmd(row) {
  return (
    runtime009.isValidYmd(row && row.lastPurchaseDate) ||
    runtime009.isValidYmd(row && row.last_date) ||
    runtime009.isValidYmd(row && row.max_fecha) ||
    null
  );
}

function isPhysicallyInactive(row, now, source) {
  const last = rowLastYmd(row);
  if (!last) return false;
  const days = daysBetween(last, now);
  const freq = runtime009.isValidFreqDays(row.freqDays != null ? row.freqDays : row.freq_days);
  const status = String(row.estatus || row.status || row.estado || "").toLowerCase();
  if (source === "commercial_state" && /dejaron|inactiv/.test(String(row.movement || row.estado || "").toLowerCase())) {
    return true;
  }
  if (status === "inactivo") return true;
  if (freq != null && days != null && days > freq) return true;
  const month = now instanceof Date ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : null;
  if (month && last.slice(0, 7) < month) return true;
  return false;
}

function listInactiveClients(rows, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const source = opts.source || "computeDicf";
  const seen = new Set();
  const list = [];
  for (const row of rows || []) {
    const name = String((row && (row.cliente || row.canonical_name || row.display)) || "").trim();
    const key = nclient(name);
    if (!name || !key || seen.has(key)) continue;
    if (!isPhysicallyInactive(row, now, source)) continue;
    const last = rowLastYmd(row);
    const days = daysBetween(last, now);
    const freq = runtime009.isValidFreqDays(row.freqDays != null ? row.freqDays : row.freq_days);
    seen.add(key);
    list.push({
      cliente: name,
      lastPurchaseDate: last,
      days_since_last_purchase: days,
      freqDays: freq,
      source,
    });
  }
  list.sort((a, b) => (b.days_since_last_purchase || 0) - (a.days_since_last_purchase || 0));
  return list;
}

function buildInactiveClientsAnswer(list, opts = {}) {
  if (!list || !list.length) {
    return "INSUFFICIENT_EVIDENCE: no encontré clientes sin compra/inactivos con fecha de última compra en la fuente disponible. No invento la lista.";
  }
  const showAll = Boolean(opts.showAll);
  const slice = showAll ? list : list.slice(0, LIST_CAP);
  const lines = ["Clientes que no han comprado / están inactivos:", ""];
  slice.forEach((row, i) => {
    const last = formatDmy(row.lastPurchaseDate);
    const days = Number.isFinite(row.days_since_last_purchase) ? `${row.days_since_last_purchase} días sin comprar` : "días sin comprar no disponibles";
    const freq = Number.isFinite(row.freqDays) ? ` — frecuencia ~${row.freqDays} días` : "";
    lines.push(`${i + 1}. ${row.cliente} — última compra ${last} — ${days}${freq}`);
  });
  if (!showAll && list.length > LIST_CAP) {
    lines.push("", "¿Quieres que te muestre todos?");
  }
  return lines.join("\n");
}

function buildDirectLastPurchaseAnswer(row, now) {
  if (!row || !rowLastYmd(row)) {
    return "INSUFFICIENT_EVIDENCE: no hay fecha de última compra en computeDicf, arr.dicf_cliente_mes ni MAX(fecha) de ventas.";
  }
  const last = rowLastYmd(row);
  const name = row.cliente || row.canonical_name;
  const lines = [`${name} compró por última vez el ${formatDmy(last)}.`];
  const freq = runtime009.isValidFreqDays(row.freqDays != null ? row.freqDays : row.historical_frequency);
  const days = daysBetween(last, now);
  if (freq != null) lines.push(`Frecuencia histórica: cada ${freq} días.`);
  if (days != null) lines.push(`Lleva ${days} días sin comprar.`);
  return lines.join("\n");
}

function buildDirectFrequencyAnswer(row) {
  const freq = runtime009.isValidFreqDays(row && (row.freqDays != null ? row.freqDays : row.historical_frequency));
  if (freq == null) return "INSUFFICIENT_EVIDENCE: no hay frecuencia histórica usable.";
  return `${row.cliente} compra aproximadamente cada ${freq} días.`;
}

function buildDirectDaysSinceAnswer(row, now) {
  const last = rowLastYmd(row);
  const days = daysBetween(last, now);
  if (days == null) return "INSUFFICIENT_EVIDENCE: no puedo calcular los días sin compra.";
  return `${row.cliente} lleva ${days} días sin comprar (última compra ${formatDmy(last)}).`;
}

function buildDirectOverdueAnswer(row, now) {
  const last = rowLastYmd(row);
  const freq = runtime009.isValidFreqDays(row && (row.freqDays != null ? row.freqDays : row.historical_frequency));
  const days = daysBetween(last, now);
  if (last == null || freq == null || days == null) {
    return "INSUFFICIENT_EVIDENCE: falta última compra o frecuencia para decir si está atrasado.";
  }
  if (days > freq) return `${row.cliente} está atrasado: lleva ${days} días sin comprar y su frecuencia es ~${freq} días.`;
  return `${row.cliente} no está atrasado: lleva ${days} días sin comprar frente a una frecuencia de ~${freq} días.`;
}

function buildDirectExpectedAnswer(row) {
  const last = rowLastYmd(row);
  const freq = runtime009.isValidFreqDays(row && (row.freqDays != null ? row.freqDays : row.historical_frequency));
  const expected = row.expected_next || runtime009.addDaysYmd(last, freq);
  if (!expected) return "INSUFFICIENT_EVIDENCE: no puedo estimar la siguiente compra.";
  return `${row.cliente}: la siguiente compra esperada por frecuencia histórica sería alrededor del ${formatDmy(expected)}.`;
}

function buildDirectClientAnswer(row, question, now) {
  const family = classify011Family(question) || runtime009.classifyPurchaseEvidenceFamily(question);
  if (family === "INACTIVE_CLIENTS") return null;
  if (family === "LAST_PURCHASE_DIRECT" || family === "LAST_PURCHASE") return buildDirectLastPurchaseAnswer(row, now);
  if (family === "PURCHASE_FREQUENCY" || /\bcada\s+cuanto\b/.test(nq(question)) || /\bfrecuencia\b/.test(nq(question))) {
    return buildDirectFrequencyAnswer(row);
  }
  if (/\bdias\s+lleva\b/.test(nq(question)) || /\bdias\s+sin\s+comprar\b/.test(nq(question))) {
    return buildDirectDaysSinceAnswer(row, now);
  }
  if (/\batrasad/.test(nq(question))) return buildDirectOverdueAnswer(row, now);
  if (family === "EXPECTED_NEXT_PURCHASE" || family === "EXPECTED_NEXT_PURCHASE_ENRICHED" || /\b(vuelve|esperamos|deberia\s+volver)\b/.test(nq(question))) {
    return buildDirectExpectedAnswer(row);
  }
  return buildDirectLastPurchaseAnswer(row, now);
}

function resolveClientInCatalog(hint, rows) {
  const want = nclient(hint);
  if (!want) return { status: "missing" };
  const matches = [];
  const seen = new Set();
  for (const row of rows || []) {
    const name = String((row && (row.cliente || row.canonical_name || row.display)) || "").trim();
    const key = nclient(name);
    if (!name || !key || seen.has(key)) continue;
    if (key === want || key.startsWith(want) || want.startsWith(key)) {
      seen.add(key);
      matches.push({ cliente: name, row });
    }
  }
  if (matches.length === 1) return { status: "unique", cliente: matches[0].cliente, row: matches[0].row };
  if (matches.length > 1) {
    const exact = matches.find((m) => nclient(m.cliente) === want);
    if (exact) return { status: "unique", cliente: exact.cliente, row: exact.row };
    return { status: "ambiguous", candidates: matches.map((m) => m.cliente) };
  }
  return { status: "not_found" };
}

function buildOpenClientUiAction(opts) {
  return {
    type: UI_ACTION,
    client: opts.client || null,
    plant: opts.plant || null,
    plant_id: opts.plant_id != null ? Number(opts.plant_id) : null,
    period: opts.period || null,
  };
}

function buildOpenClientAnswer(resolution, plantLabel) {
  if (resolution.status === "ambiguous") {
    return `Hay más de un cliente parecido (${resolution.candidates.join(", ")}). ¿Cuál quieres abrir?`;
  }
  if (resolution.status === "not_found" || resolution.status === "missing") {
    return "No encontré ese cliente en el catálogo de la planta. No abro otro cliente.";
  }
  return `Abro Delta Ingreso Cliente Forecast de ${resolution.cliente}${plantLabel ? ` · ${plantLabel}` : ""}.`;
}

function sanitizeOpenClientUiAction(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (String(raw.type || "") !== UI_ACTION) return null;
  const client = raw.client ? String(raw.client).trim() : "";
  if (!client) return null;
  return {
    type: UI_ACTION,
    client,
    plant: raw.plant ? String(raw.plant) : null,
    plant_id: Number.isFinite(Number(raw.plant_id)) ? Number(raw.plant_id) : null,
    period: raw.period ? String(raw.period) : null,
  };
}

module.exports = {
  FAMILY_IDS,
  UI_ACTION,
  FORBIDDEN_EXPANSION,
  nq,
  classify011Family,
  isDirectClientFamily,
  isInactiveClientsQuestion,
  isVolumeOrShareQuestion,
  isLastPurchaseDirectQuestion,
  isDirectCompressionQuestion,
  isOpenClientDeltaQuestion,
  isExpansionRequest,
  wantsCompressedAnswer,
  answerHasForbiddenExpansion,
  listInactiveClients,
  buildInactiveClientsAnswer,
  buildDirectLastPurchaseAnswer,
  buildDirectClientAnswer,
  extractClientHint,
  resolveClientInCatalog,
  buildOpenClientUiAction,
  buildOpenClientAnswer,
  sanitizeOpenClientUiAction,
  daysBetween,
  rowLastYmd,
};
