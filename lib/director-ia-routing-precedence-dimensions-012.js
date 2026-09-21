"use strict";

/**
 * 012 — Precedencia de routing y conservación de dimensiones.
 * Las 300 formas viven en fixtures. No hay phrasebook de producción.
 */

const runtime007 = require("./director-ia-category-commission-007");
const runtime010 = require("./director-ia-executive-context-sales-entity-010");
const { extractChannel } = require("./director-ia-executive-backlog");

function resolveCreatedYmd(item) {
  const raw = item && (item.created_at || item.creada_ymd || item.dicf_creada_ymd);
  const s = String(raw || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function knownSubcategoryHint(n) {
  if (/\bautotanque/.test(n)) return "Autotanque";
  if (/\bcarburacion/.test(n)) return "Carburación";
  if (/\bportatil/.test(n)) return "Portátil";
  return null;
}

const MONTHS_ES = Object.freeze({
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
});

const FAMILY_IDS = Object.freeze([
  "CHANNEL_SALES_STATUS",
  "CLIENT_MOVEMENT_DEJARON",
  "CLIENT_COMMENTS_PERIOD",
  "ACTION_REGISTER_DIRECT",
  "ACTION_REGISTER_RECENT",
  "BITACORA_TOPIC_LOOKUP",
]);

function nq(raw) {
  return runtime010.nq(raw);
}

function formatTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return "no disponible";
  return `${(n / 1000).toFixed(1)} t`;
}

function formatDmy(value) {
  const s = String(value || "").slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s || "sin fecha";
}

function extractPeriodYm(question, now, prior) {
  const n = nq(question);
  const months = MONTHS_ES;
  for (const [name, mm] of Object.entries(months)) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : now instanceof Date ? String(now.getFullYear()) : "2026";
      return `${year}-${String(mm).padStart(2, "0")}`;
    }
  }
  const ym = n.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (ym) return ym[0];
  if (prior && prior.period && /^\d{4}-\d{2}$/.test(String(prior.period))) return String(prior.period);
  return null;
}

function extractLimit(question, fallback) {
  const n = nq(question);
  const hit = n.match(/\b(?:top|ultimas?|ultimos?|primeros?|dame)\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\b/);
  if (hit) {
    const v = Number(hit[1]);
    if (v >= 1 && v <= 50) return v;
  }
  return fallback;
}

function extractChannelDim(question, prior) {
  const n = nq(question);
  const fromQ = extractChannel(n);
  if (fromQ && fromQ !== "ALL") return fromQ;
  if (
    prior &&
    (prior.channel === "CASA" || prior.channel === "COMISIONISTA") &&
    prior.family === "CHANNEL_SALES_STATUS" &&
    (/^y\s+/.test(n) ||
      /\ben\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n) ||
      /\bsolo\b/.test(n))
  ) {
    return prior.channel;
  }
  return null;
}

function extractSubcategoryDim(question, prior) {
  const known = knownSubcategoryHint(nq(question));
  if (known) return known;
  if (prior && prior.subcategory) return prior.subcategory;
  return null;
}

function isCommentsQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  return Boolean(
    /\bcomentarios?\b/.test(n) ||
      /\bobservaciones?\b/.test(n) ||
      /\bnota\s+comercial\b/.test(n) ||
      /\bnotas\s+de\s+cliente\b/.test(n) ||
      /\bse\s+comento\b/.test(n) ||
      /\bque\s+se\s+comento\b/.test(n)
  );
}

function isActionRecentQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  const action =
    /\bacciones?\b/.test(n) ||
    /\baction\s+register\b/.test(n) ||
    /\bcompromisos?\b/.test(n) ||
    /\bpuntos?\s+de\s+accion\b/.test(n);
  if (
    (/\bvencid/.test(n) || /\bcritic/.test(n) || /\batras/.test(n) || /\boverdue\b/.test(n)) &&
    !/\bultimas?\b/.test(n) &&
    !/\brecientes?\b/.test(n) &&
    !/\bno\s+(las\s+)?(vencidas?|criticas?|atrasadas?)\b/.test(n)
  ) {
    return false;
  }
  const recentCue = Boolean(
    /\bultimas?\b/.test(n) ||
      /\bmas\s+recientes?\b/.test(n) ||
      /\bnuevas?\b/.test(n) ||
      /\brecientemente\b/.test(n) ||
      /\brecien\s+agregad/.test(n) ||
      /\brecien\b/.test(n) ||
      /\bultimos?\s+registros?\b/.test(n) ||
      /\bultima\s+revision\b/.test(n) ||
      /\bmas\s+nueva/.test(n) ||
      /\bentraron\s+esta\s+semana\b/.test(n) ||
      /\bde\s+mas\s+nueva\s+a\s+mas\s+antigua\b/.test(n) ||
      /\bagrego\b/.test(n) ||
      /\bagregaron\b/.test(n) ||
      /\bhay\s+nuevo\b/.test(n) ||
      /\bde\s+nuevo\b/.test(n) ||
      /\brecientes?\b/.test(n) ||
      /\bultimo\b/.test(n) ||
      /\bcrearon\b/.test(n) ||
      /\bcargaron\b/.test(n) ||
      /\bregistro\b/.test(n)
  );
  if (!recentCue) return false;
  return Boolean(
    action ||
      /\bultimas?\s+\d+\b/.test(n) ||
      /\bagrego\b/.test(n) ||
      /\bagregaron\b/.test(n) ||
      /\bhay\s+nuevo\b/.test(n) ||
      /\brevision\b/.test(n) ||
      /\bregister\b/.test(n) ||
      /\bmas\s+nueva/.test(n) ||
      /\brecientes?\b/.test(n) ||
      /\bno\s+las\s+(vencidas|criticas)\b/.test(n)
  );
}

function isActionDirectQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isCommentsQuestion(question) || isActionRecentQuestion(question)) return false;
  if (/\bdiagnostico\b/.test(n) || /\bresumen\s+ejecutivo\b/.test(n) || /\banalisis\b/.test(n)) return false;
  if (/\btiene\s+alguna\s+accion\b/.test(n) && !/\b(acciones|action\s+register)\b/.test(n)) return false;
  if (
    /\b(regulacion|documentos?|folios?|zp|aprobacion|sehs?)\b/.test(n) &&
    !/\b(acciones?|action\s+register|compromisos?)\b/.test(n)
  ) {
    return false;
  }
  return Boolean(
    /\bacciones?\b/.test(n) ||
      /\baction\s+register\b/.test(n) ||
      /\bpendientes?\b/.test(n) ||
      /\bcompromisos?\b/.test(n) ||
      /\bpuntos?\s+de\s+accion\b/.test(n) ||
      (/\b(abiertas?|cerradas?|vencidas?)\b/.test(n) && /\b(acciones?|tenemos|hay|estan|cuantas)\b/.test(n)) ||
      /\ben\s+el\s+register\b/.test(n)
  );
}

function isDejaronMovementQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isCommentsQuestion(question)) return false;
  if (/\bdisminuy/.test(n) && !/\bdejaron\b/.test(n) && !/\bdejo\b/.test(n)) return false;
  return Boolean(
    /\bdejaron\s+de\s+(comprar|consumir|pedir)\b/.test(n) ||
      /\b(quien|quienes)\s+dejo\s+de\s+(comprar|consumir|pedir|comprarnos)\b/.test(n) ||
      /\bdejo\s+de\s+comprarnos\b/.test(n) ||
      /\bya\s+no\s+(compran|compra|consumen)\b/.test(n) ||
      /\bcayeron\s+a\s+cero\b/.test(n) ||
      /\bclientes?\s+perdidos?\b/.test(n) ||
      /\bque\s+clientes\s+perdimos\b/.test(n) ||
      /\bclientes?\s+perdimos\b/.test(n) ||
      /\bquienes\s+perdimos\b/.test(n) ||
      /\bse\s+fueron\s+este\s+mes\b/.test(n) ||
      /\bcompraba(?:n)?\s+el\s+mes\s+pasado\b/.test(n) ||
      /\bcompraba\s+y\s+ahora\s+no\b/.test(n) ||
      /\bdejaron\s+de\s+comprarnos\b/.test(n) ||
      /\bdejo\s+de\s+comprarnos\b/.test(n) ||
      /\bya\s+no\s+nos\s+compran\b/.test(n) ||
      /\bse\s+perdieron\b/.test(n) && /\bcero\b/.test(n)
  );
}

function isChannelSalesQuestion(question, prior) {
  const n = nq(question);
  if (!n) return false;
  if (isCommentsQuestion(question) || isDejaronMovementQuestion(question) || isActionDirectQuestion(question)) return false;
  if (/\babre\b/.test(n) && /\b(venta\s+diaria|movimiento|pronostico|categoria)\b/.test(n)) return false;
  if (/\b(proyectad[oa]s?|forecast|pronostico)\b/.test(n)) return false;
  if (/\bporcentaje\b/.test(n) && /\bcasa\b/.test(n) && /\bcomisionista/.test(n)) return false;
  if (/\b(mix|share|participacion|\bpp\b)\b/.test(n) && !/\brepresenta\b/.test(n)) return false;
  if (/\bcomision(?:es)?\b/.test(n) && !/\bventa/.test(n) && !/\btoneladas?\b/.test(n) && !/\bcomo\s+va\b/.test(n)) {
    return false;
  }
  if (/\bclientes?\b/.test(n) && (/\btop\b/.test(n) || /\bdejaron\b/.test(n) || /\bnuevos?\b/.test(n))) return false;
  const channel = extractChannelDim(question, prior);
  const sub = extractSubcategoryDim(question, null);
  const saleCue =
    /\bventas?\b/.test(n) ||
    /\bvendiendo\b/.test(n) ||
    /\bvendio\b/.test(n) ||
    /\bvendimos\b/.test(n) ||
    /\btoneladas?\b/.test(n) ||
    /\bacumulado\b/.test(n) ||
    /\brepresenta\b/.test(n) ||
    /\bcompara\b/.test(n) ||
    /\bcomo\s+(va|vamos|esta|andan|andamos)\b/.test(n) ||
    /\bcuanto\s+lleva\b/.test(n) ||
    /\bcuanto\s+acumula\b/.test(n) ||
    /\bacumula\b/.test(n) && /\b(casa|comisionista)\b/.test(n) ||
    /\bque\s+tal\s+va\b/.test(n) ||
    /\bpinta\b/.test(n);
  const follow =
    prior &&
    prior.channel &&
    prior.family === "CHANNEL_SALES_STATUS" &&
    (/^y\s+/.test(n) || /\ben\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n));
  if (!saleCue && !follow && !(channel && /^y\s+/.test(n)) && !(sub && /^y\s+/.test(n))) return false;
  if (channel || sub || follow) return true;
  return false;
}

function isExplicitPlantSwitch(question) {
  const n = nq(question);
  return Boolean(
    /\bcambia\s+a\b/.test(n) ||
      /\ben\s+la\s+planta\b/.test(n) ||
      /\bconsulta\s+(la\s+)?planta\b/.test(n) ||
      /\bconsulta\b/.test(n) && /\b(como\s+planta|planta)\b/.test(n) ||
      /\bplanta\s+[a-z]/.test(n) && /\b(cambia|consulta|abre)\b/.test(n)
  );
}

function isBitacoraTopicQuestion(question) {
  const n = nq(question);
  if (!n) return false;
  if (isCommentsQuestion(question) || isActionDirectQuestion(question) || isActionRecentQuestion(question)) return false;
  if (isDejaronMovementQuestion(question) || isChannelSalesQuestion(question)) return false;
  if (isExplicitPlantSwitch(question)) return false;
  if (/\bque\s+sabemos\s+de\s+(el|ella|ellos|ellas|ese|esa|esto|este)\b/.test(n)) return false;
  if (/\bbitacoras?\b/.test(n) && (/\bdel\s+cliente\b/.test(n) || /\bclientes?\b/.test(n))) return false;
  if (
    /\b(taller|regulaciones?|seh|llantas?|comision(?:es)?|diagnostico|pronostico|venta\s+diaria|folios?)\b/.test(n) &&
    !/\b(bitacoras?|plaud)\b/.test(n)
  ) {
    return false;
  }
  return Boolean(
    /\bque\s+sabemos\b/.test(n) ||
      /\balguna\s+(informacion|nota|referencia|antecedente)\b/.test(n) ||
      /\balgun\s+antecedente\b/.test(n) ||
      /\bque\s+tenemos\b/.test(n) ||
      /\bque\s+se\s+ha\s+(dicho|mencionado|documentado)\b/.test(n) ||
      /\bse\s+ha\s+dicho\s+algo\b/.test(n) ||
      /\bhay\s+(algo|informacion|antecedentes|registro|contexto|menciones)\b/.test(n) ||
      /\btenemos\s+(algo|antecedentes|bitacora)\b/.test(n) ||
      /\bbusca\s+(informacion|menciones)\b/.test(n) ||
      (/\bbusca\b/.test(n) && /\b(bitacoras?|plaud)\b/.test(n)) ||
      /\bque\s+aparece\b/.test(n) ||
      /\b(en\s+(las\s+)?bitacoras|bitacoras?\b|en\s+plaud|plaud)\b/.test(n) ||
      /\bque\s+fue\s+lo\s+ultimo\b/.test(n) ||
      /\bque\s+hay\s+de\b/.test(n) ||
      /\bque\s+se\s+dijo\b/.test(n) ||
      /\bse\s+dijo\s+de\b/.test(n) ||
      /\bque\s+tenemos\s+(escrito|registrado)\b/.test(n)
  );
}

function classify012Family(question, prior) {
  if (isCommentsQuestion(question)) return "CLIENT_COMMENTS_PERIOD";
  if (prior && prior.family === "CLIENT_COMMENTS_PERIOD") {
    const n = nq(question);
    if (
      (/^y\s+/.test(n) || /^\s*solo\b/.test(n) || /\bsolo\s+(casa|comisionista|ellos|ese)\b/.test(n)) &&
      !/\bventa/.test(n) &&
      !isDejaronMovementQuestion(question) &&
      !isActionRecentQuestion(question) &&
      !isActionDirectQuestion(question)
    ) {
      return "CLIENT_COMMENTS_PERIOD";
    }
  }
  if (isActionRecentQuestion(question)) return "ACTION_REGISTER_RECENT";
  if (isActionDirectQuestion(question)) return "ACTION_REGISTER_DIRECT";
  if (isDejaronMovementQuestion(question)) return "CLIENT_MOVEMENT_DEJARON";
  if (isChannelSalesQuestion(question, prior)) return "CHANNEL_SALES_STATUS";
  if (isBitacoraTopicQuestion(question)) return "BITACORA_TOPIC_LOOKUP";
  if (prior && prior.family === "CHANNEL_SALES_STATUS" && isChannelSalesQuestion(question, prior)) {
    return "CHANNEL_SALES_STATUS";
  }
  if (prior && prior.family === "BITACORA_TOPIC_LOOKUP") {
    const n = nq(question);
    if (/\b(resumelo|resumelos|lo\s+ultimo|mas\s+reciente|cuantos)\b/.test(n)) return "BITACORA_TOPIC_LOOKUP";
  }
  if (prior && prior.family === "ACTION_REGISTER_RECENT") {
    const n = nq(question);
    if (/^\s*(dame\s+)?\d+\s*$/.test(n) || /\bsolo\s+de\b/.test(n) || /\bmantenimiento\b/.test(n)) {
      return "ACTION_REGISTER_RECENT";
    }
  }
  return null;
}

function extractTopic(question) {
  const n = nq(question);
  const leftover = n
    .replace(
      /\b(que|sabemos|de|alguna|informacion|tenemos|sobre|se|ha|dicho|hay|algo|antecedentes|busca|aparece|en|las|bitacoras|plaud|fue|lo|ultimo|fue|dijo|tenemos|y|la|el|los|las|un|una|del|al)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  return leftover || null;
}

function rowCanal(row) {
  const n = String((row && (row.canal || row.categoria)) || "").toLowerCase();
  if (n.includes("comisionista")) return "COMISIONISTA";
  if (n.includes("casa") || n) return n.includes("casa") || !n ? (n.includes("comisionista") ? "COMISIONISTA" : "CASA") : "CASA";
  return "CASA";
}

function rowSubcategory(row) {
  return String((row && (row.subcategoria || row.subcanal)) || "").trim();
}

function rowMatchesChannel(row, channel) {
  if (!channel || channel === "ALL") return true;
  return rowCanal(row) === channel;
}

function rowMatchesSubcategory(row, sub) {
  if (!sub) return true;
  const have = nq(rowSubcategory(row));
  const want = nq(sub);
  return have && (have === want || have.includes(want) || want.includes(have));
}

function extractChannelSalesDims(question, prior, now) {
  const channel = extractChannelDim(question, prior) || "ALL";
  const n = nq(question);
  const compare = /\bcompara\b/.test(n) && /\bcasa\b/.test(n) && /\bcomisionista/.test(n);
  const represent = /\brepresenta\b/.test(n);
  let subcategory = extractSubcategoryDim(question, prior);
  if (/^y\s+/.test(n) && extractChannel(n) !== "ALL") subcategory = extractSubcategoryDim(question, null);
  const period = extractPeriodYm(question, now, prior);
  return {
    family: "CHANNEL_SALES_STATUS",
    plant: (prior && prior.plant) || null,
    channel: compare ? "ALL" : channel,
    subcategory,
    period,
    compare,
    represent,
    operation: compare ? "COMPARE" : represent ? "SHARE" : "STATUS",
  };
}

function analyzeChannelSales(question, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const prior = opts.prior || null;
  const dims = extractChannelSalesDims(question, prior, now);
  const rows = Array.isArray(opts.salesRows) ? opts.salesRows : [];
  const cutoff = runtime010.physicalCutoff ? runtime010.physicalCutoff(rows, now) : null;
  const period = dims.period || (cutoff ? cutoff.slice(0, 7) : null);
  const inPeriod = (row) => !period || String(row.fecha || "").slice(0, 7) === period;
  const kgOf = (pred) =>
    rows.reduce((acc, row) => {
      if (!inPeriod(row) || !pred(row)) return acc;
      const kg = Number(row.kg != null ? row.kg : row.venta_kg);
      return acc + (Number.isFinite(kg) && kg > 0 ? kg : 0);
    }, 0);
  const casaKg = kgOf((r) => rowMatchesChannel(r, "CASA") && rowMatchesSubcategory(r, dims.subcategory));
  const comiKg = kgOf((r) => rowMatchesChannel(r, "COMISIONISTA") && rowMatchesSubcategory(r, dims.subcategory));
  const scopedKg =
    dims.channel === "COMISIONISTA" ? comiKg : dims.channel === "CASA" ? casaKg : casaKg + comiKg;
  return {
    ok: true,
    dims: { ...dims, period, plant: opts.plant_label || dims.plant },
    cutoff,
    casaKg,
    comiKg,
    scopedKg,
    plant_label: opts.plant_label || null,
  };
}

function buildChannelSalesAnswer(payload) {
  if (!payload) return "INSUFFICIENT_EVIDENCE: no pude materializar la venta por canal.";
  const d = payload.dims || {};
  const label = [d.channel && d.channel !== "ALL" ? d.channel : null, d.subcategory].filter(Boolean).join(" / ") || "planta";
  if (d.compare || d.operation === "COMPARE") {
    const total = payload.casaKg + payload.comiKg;
    const casaShare = total ? ((payload.casaKg / total) * 100).toFixed(1) : "n/d";
    return [
      `Venta observada Casa vs Comisionista${payload.plant_label ? ` · ${payload.plant_label}` : ""}${d.period ? ` · ${d.period}` : ""}:`,
      `CASA: ${formatTon(payload.casaKg)} (${casaShare}%).`,
      `COMISIONISTA: ${formatTon(payload.comiKg)}.`,
    ].join("\n");
  }
  if (d.represent || d.operation === "SHARE") {
    const total = payload.casaKg + payload.comiKg;
    const part = d.channel === "COMISIONISTA" ? payload.comiKg : payload.casaKg;
    const pct = total ? ((part / total) * 100).toFixed(1) : "n/d";
    return `${d.channel || "CASA"} representa ${pct}% de la venta observada (${formatTon(part)} de ${formatTon(total)}).`;
  }
  return [
    `Venta observada de ${label}${payload.plant_label ? ` · ${payload.plant_label}` : ""}${d.period ? ` · ${d.period}` : ""}.`,
    `Venta observada: ${formatTon(payload.scopedKg)}.`,
    payload.cutoff ? `Corte físico: ${payload.cutoff}.` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractDejaronDims(question, prior, now) {
  const n = nq(question);
  return {
    family: "CLIENT_MOVEMENT",
    movement: "DEJARON_DE_COMPRAR",
    operation: /\bcuanto\s+volumen\b/.test(n) || /\btoneladas?\b/.test(n) ? "AGGREGATE" : "RANK",
    limit: extractLimit(question, (prior && prior.limit) || 10),
    period: extractPeriodYm(question, now, prior),
    channel: extractChannelDim(question, prior) || "ALL",
    plant: (prior && prior.plant) || null,
  };
}

function buildCommentsAnswer(rows, dims) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return "INSUFFICIENT_EVIDENCE: no hay comentarios de clientes en ese filtro. No invento observaciones.";
  }
  const lines = [`Comentarios de clientes${dims && dims.period ? ` en ${dims.period}` : ""}:`, ""];
  list.slice(0, dims && dims.limit ? dims.limit : 10).forEach((row, i) => {
    const attr = row.movement || row.canal || "";
    lines.push(
      `${i + 1}. ${row.cliente_nombre || row.cliente || "CLIENTE"} — ${formatDmy(row.created_at || row.fecha)} — ${String(row.body || row.comentario || "").trim()}${attr ? ` (${attr})` : ""}`
    );
  });
  return lines.join("\n");
}

function filterComments(rows, question, prior, now) {
  const n = nq(question);
  const period = extractPeriodYm(question, now, prior);
  const channel = extractChannelDim(question, prior);
  const client = runtime010.resolveActiveClient({ conversation_state: prior, prior }) || null;
  let out = (rows || []).slice();
  if (period) out = out.filter((r) => String(r.created_at || r.fecha || "").slice(0, 7) === period);
  if (channel && channel !== "ALL") {
    out = out.filter((r) => nq(r.canal || r.categoria || "") === nq(channel) || nq(r.canal || "").includes(nq(channel.toLowerCase())));
  }
  const leftover = n
    .replace(/\b(que|cual|cuales|dame|los|las|de|del|en|comentarios?|observaciones?|clientes?|tenemos|hay|este|mes|ultimo|reciente|mas|recientes|fecha|cliente|solo|y)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const months = Object.keys(MONTHS_ES);
  const nameHint = leftover
    .split(" ")
    .filter((t) => t && !months.includes(t) && !/^(casa|comisionista|20\d{2})$/.test(t))
    .join(" ")
    .trim();
  const want = nameHint || (client && client.canonical_name) || null;
  if (want) {
    const key = nq(want);
    out = out.filter((r) => nq(r.cliente_nombre || r.cliente || "").includes(key));
  }
  return { rows: out, period, channel, client: want, limit: extractLimit(question, 10) };
}

function summarizeActions(items) {
  const list = Array.isArray(items) ? items : [];
  let open = 0;
  let closed = 0;
  let overdue = 0;
  for (const it of list) {
    const st = String(it.estatus || it.status || "").toLowerCase();
    if (/cerrad/.test(st)) closed += 1;
    else open += 1;
    if (it.vencida || it.overdue || Number(it.dias_vencido) > 0 && !/cerrad/.test(st)) overdue += 1;
  }
  return { open, closed, overdue, total: list.length };
}

function buildActionDirectAnswer(items, plantLabel, question) {
  const n = nq(question);
  const counts = summarizeActions(items);
  const lines = [
    `Action Register${plantLabel ? ` — ${plantLabel}` : ""}`,
    "",
    `Abiertas: ${counts.open}`,
    `Cerradas: ${counts.closed}`,
    `Vencidas: ${counts.overdue}`,
  ];
  if (/\blista\b/.test(n) || /\bmu[eé]strame\b/.test(n) || /\bdame\s+las\b/.test(n) || /\babiertas?\b/.test(n)) {
    lines.push("");
    (items || []).slice(0, extractLimit(question, 8)).forEach((it, i) => {
      lines.push(
        `${i + 1}. ${it.titulo || it.title || "Acción"} — ${it.responsable || it.responsable_nombre || "sin responsable"} — ${it.estatus || it.status || "abierta"} — ${formatDmy(it.due_date || it.fecha_compromiso || it.created_at)}`
      );
    });
  }
  return lines.join("\n");
}

function sortActionsRecent(items) {
  return (items || [])
    .slice()
    .sort((a, b) => {
      const da = resolveCreatedYmd(a) || String(a.created_at || "").slice(0, 10) || "";
      const db = resolveCreatedYmd(b) || String(b.created_at || "").slice(0, 10) || "";
      return db.localeCompare(da);
    });
}

function filterActionsByTheme(items, question, prior) {
  const n = nq(question);
  const theme =
    (/\bmantenimiento\b/.test(n) && "Mantenimiento") ||
    (prior && prior.theme) ||
    null;
  const personHit = n.match(/\btiene\s+(?!el\s+tema\b)((?:[a-z]+\s+){0,2}[a-z]+)/);
  const person = personHit && !/^(mantenimiento|acciones?|pendientes?|register)\b/.test(personHit[1]) ? personHit[1].trim() : null;
  let out = (items || []).slice();
  if (theme) {
    out = out.filter((it) => nq(it.tema || it.theme || "").includes(nq(theme)));
  }
  if (person) {
    out = out.filter((it) => nq(it.responsable || it.responsable_nombre || "").includes(nq(person)));
  }
  return { items: out, theme };
}

function buildActionRecentAnswer(items, limit) {
  const list = sortActionsRecent(items).slice(0, limit || 10);
  if (!list.length) return "INSUFFICIENT_EVIDENCE: no hay acciones recientes con fecha de registro.";
  const lines = ["Últimas acciones del Action Register:", ""];
  list.forEach((it, i) => {
    const when = resolveCreatedYmd(it) || String(it.created_at || "").slice(0, 10);
    lines.push(
      `${i + 1}. ${formatDmy(when)} — ${it.titulo || it.title || "Acción"} — ${it.responsable || it.responsable_nombre || "sin responsable"} — ${it.estatus || it.status || "abierta"}`
    );
  });
  return lines.join("\n");
}

function searchBitacoraTopic(entries, topic) {
  const key = nq(topic);
  if (!key) return [];
  return (entries || []).filter((row) => {
    const blob = nq([row.titulo, row.resumen_ia, row.contenido, row.vista_previa, row.texto].filter(Boolean).join(" "));
    return blob.includes(key);
  });
}

function buildBitacoraTopicAnswer(hits, topic, plantLabel) {
  if (!hits.length) {
    return `INSUFFICIENT_EVIDENCE: no encontré «${topic}» en las bitácoras${plantLabel ? ` de ${plantLabel}` : ""}. No cambio la planta ni invento registros.`;
  }
  const lines = [
    `Encontré información relacionada con ${topic} en las bitácoras${plantLabel ? ` de ${plantLabel}` : ""}:`,
    "",
  ];
  hits.slice(0, 8).forEach((row, i) => {
    const summary = String(row.resumen_ia || row.contenido || "").replace(/\s+/g, " ").trim().slice(0, 160);
    lines.push(`${i + 1}. ${formatDmy(row.fecha || row.created_at)} — ${row.titulo || "Bitácora"} — ${summary}`);
  });
  lines.push("", "¿Quieres que te resuma lo más importante?");
  return lines.join("\n");
}

function summarizeBitacoraHits(hits, topic) {
  if (!hits.length) return `No hay result set de bitácora para ${topic || "ese tema"}.`;
  const first = hits[0];
  return `Resumen del result set (${hits.length}): lo más reciente es ${formatDmy(first.fecha || first.created_at)} — ${first.titulo || "Bitácora"}. ${String(first.resumen_ia || "").replace(/\s+/g, " ").trim().slice(0, 220)}`;
}

module.exports = {
  FAMILY_IDS,
  nq,
  classify012Family,
  isCommentsQuestion,
  isActionRecentQuestion,
  isActionDirectQuestion,
  isDejaronMovementQuestion,
  isChannelSalesQuestion,
  isBitacoraTopicQuestion,
  isExplicitPlantSwitch,
  extractTopic,
  extractPeriodYm,
  extractChannelSalesDims,
  extractDejaronDims,
  analyzeChannelSales,
  buildChannelSalesAnswer,
  buildCommentsAnswer,
  filterComments,
  buildActionDirectAnswer,
  buildActionRecentAnswer,
  filterActionsByTheme,
  sortActionsRecent,
  searchBitacoraTopic,
  buildBitacoraTopicAnswer,
  summarizeBitacoraHits,
  rowCanal,
  extractLimit,
};
