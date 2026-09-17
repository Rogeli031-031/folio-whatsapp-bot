"use strict";

/**
 * Completa un pending_information_gap con una respuesta corta.
 * No es phrasebook: extrae la dimensión pedida (period/plant/channel/entity)
 * y la aplica sobre el frame persistido.
 */

const { extractPeriodRange, MONTHS_ES } = require("./director-ia-folio-search");
const { extractPlant, extractChannel, normalize, refineFrame } = require("./director-ia-executive-backlog");

const GAP_KIND = "dimension_completion";

function resolveNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  return { year, month };
}

function extractSingleMonth(question, now) {
  const n = normalize(question);
  if (!n) return null;
  for (const [name, mm] of Object.entries(MONTHS_ES || {})) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : resolveNow(now).year;
      return `${year}-${mm}`;
    }
  }
  const ym = n.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  return ym ? ym[0] : null;
}

function extractJuxtaposedMonthRange(n, now) {
  const monthAlt = Object.keys(MONTHS_ES || {}).join("|");
  if (!monthAlt) return null;
  const cleaned = String(n || "")
    .replace(/\b(rango|periodo|entre|de|hasta|solo)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const two = cleaned.match(new RegExp(`\\b(${monthAlt})\\s+(?:a\\s+|y\\s+)?(${monthAlt})\\b`));
  if (!two || two[1] === two[2]) return null;
  const year = resolveNow(now).year;
  const start = `${year}-${MONTHS_ES[two[1]]}`;
  const end = `${year}-${MONTHS_ES[two[2]]}`;
  if (start > end) return null;
  return {
    period: `${start}..${end}`,
    period_mode: "RANGE",
    period_start: start,
    period_end: end,
    period_month: null,
  };
}

function extractPeriodPatch(question, now) {
  const n = normalize(question);
  if (!n) return null;
  const range = extractPeriodRange(n, now);
  if (range && range.period_start && range.period_end) {
    return {
      period: `${range.period_start}..${range.period_end}`,
      period_mode: "RANGE",
      period_start: range.period_start,
      period_end: range.period_end,
      period_month: null,
    };
  }
  const juxtaposed = extractJuxtaposedMonthRange(n, now);
  if (juxtaposed) return juxtaposed;
  if (/\b(este mes|mes actual)\b/.test(n)) {
    const cur = resolveNow(now);
    const ym = `${cur.year}-${cur.month}`;
    return { period: ym, period_mode: "SINGLE", period_month: ym, period_start: null, period_end: null };
  }
  const single = extractSingleMonth(question, now);
  if (!single) return null;
  return {
    period: single,
    period_mode: "SINGLE",
    period_month: single,
    period_start: null,
    period_end: null,
  };
}

function looksLikeStandaloneIntent(question) {
  const n = normalize(question);
  if (!n) return false;
  return Boolean(
    /\btop\s+\d+\b/.test(n) ||
      /\bcuantos\s+folios\b/.test(n) ||
      /\bque\s+folios\b/.test(n) ||
      /\benlista\b/.test(n) && /\bfolios?\b/.test(n) ||
      /\babre\s+la\s+venta\s+diaria\b/.test(n) ||
      /F-\d{6}-\d+/i.test(String(question || "")) ||
      (/\b(abre|entra|muestrame|ensename|llevame)\b/.test(n) && /\b(\d{1,2}|primero|segundo|tercero|ultimo)\b/.test(n)) ||
      /\bextintor/.test(n) ||
      (/\bfolios?\b/.test(n) && /\b(llantas?|aceite|taller|liquidacion)/.test(n) && /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(n))
  );
}

function extractDimensionPatch(question, missingFields, now) {
  const missing = Array.isArray(missingFields) ? missingFields : [];
  const patch = {};
  if (missing.includes("period")) {
    const period = extractPeriodPatch(question, now);
    if (period) Object.assign(patch, period);
  }
  if (missing.includes("plant")) {
    const plant = extractPlant(question);
    if (plant) patch.plant = plant;
  }
  if (missing.includes("channel")) {
    const channel = extractChannel(normalize(question));
    if (channel && channel !== "ALL") patch.channel = channel;
  }
  if (missing.includes("entity") || missing.includes("client")) {
    const n = normalize(question).replace(/\b(el|la|los|las|cliente|de)\b/g, " ").replace(/\s+/g, " ").trim();
    if (n && n.split(" ").length >= 1 && n.length >= 3) patch.entity = n;
  }
  return Object.keys(patch).length ? patch : null;
}

function sanitizePendingGap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (raw.kind !== GAP_KIND) return raw;
  const missing = Array.isArray(raw.missing_fields)
    ? raw.missing_fields.map((f) => String(f)).filter(Boolean).slice(0, 6)
    : [];
  if (!missing.length) return null;
  const frame = raw.frame && typeof raw.frame === "object" && !Array.isArray(raw.frame) ? raw.frame : null;
  if (!frame) return null;
  return {
    kind: GAP_KIND,
    parent_intent: raw.parent_intent ? String(raw.parent_intent) : null,
    missing_fields: missing,
    frame,
    original_question: raw.original_question ? String(raw.original_question).slice(0, 400) : null,
    why_blocks: raw.why_blocks ? String(raw.why_blocks).slice(0, 240) : null,
  };
}

function buildPendingGap(opts) {
  return sanitizePendingGap({
    kind: GAP_KIND,
    parent_intent: opts.parent_intent,
    missing_fields: opts.missing_fields,
    frame: opts.frame,
    original_question: opts.original_question,
    why_blocks: opts.why_blocks,
  });
}

function isPendingDimensionAnswer(question, gap, now) {
  const clean = sanitizePendingGap(gap);
  if (!clean) return false;
  if (looksLikeStandaloneIntent(question)) return false;
  const patch = extractDimensionPatch(question, clean.missing_fields, now);
  if (!patch) return false;
  return clean.missing_fields.some((field) => {
    if (field === "period") return Boolean(patch.period || patch.period_month || patch.period_start);
    if (field === "plant") return Boolean(patch.plant);
    if (field === "channel") return Boolean(patch.channel);
    if (field === "entity" || field === "client") return Boolean(patch.entity);
    return false;
  });
}

function completePendingFrame(gap, question, now) {
  const clean = sanitizePendingGap(gap);
  if (!clean || !isPendingDimensionAnswer(question, clean, now)) return null;
  const patch = extractDimensionPatch(question, clean.missing_fields, now);
  return {
    ok: true,
    parent_intent: clean.parent_intent,
    frame: refineFrame(clean.frame, patch),
    patch,
    original_question: clean.original_question,
  };
}

function isPeriodOnlyAnswer(question, now) {
  const n = normalize(question);
  if (!n || looksLikeStandaloneIntent(question)) return false;
  return Boolean(extractPeriodPatch(question, now));
}

module.exports = {
  GAP_KIND,
  buildPendingGap,
  sanitizePendingGap,
  extractPeriodPatch,
  extractDimensionPatch,
  isPendingDimensionAnswer,
  completePendingFrame,
  isPeriodOnlyAnswer,
  looksLikeStandaloneIntent,
};
