"use strict";

/**
 * Búsqueda veraz de folios/apoyos.
 * Reutiliza queryReviewableSupportFolios como lectura de public.folios.
 * No aplica filtros IGF-reviewable. No SQL nuevo.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const {
  SOURCE_FOLIOS,
  queryReviewableSupportFolios,
} = require("./director-ia-igf-reviewable-supports");
const usuarioPermisos = require("./usuario-permisos");

const SEMANTIC_CLASS = "folio_search";
const SCOPE_ALL_PUBLIC_FOLIOS = "ALL_PUBLIC_FOLIOS";
const SCOPE_SUPPORT_FAMILIES = "SUPPORT_FAMILIES";
const SUPPORT_FAMILIES = Object.freeze(["GASTOS", "INVERSIONES", "TALLER"]);
const RECORD_LIMIT = 40;

const MONTHS_ES = Object.freeze({
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
});

const SEARCH_STOPWORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "en",
  "para",
  "por",
  "y",
  "e",
  "o",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "que",
  "su",
  "se",
]);

const STRUCTURAL_TOKENS = new Set([
  "que",
  "cuales",
  "cual",
  "tenemos",
  "hay",
  "existen",
  "estan",
  "muestrame",
  "muestra",
  "mostrar",
  "los",
  "las",
  "el",
  "la",
  "un",
  "una",
  "para",
  "en",
  "del",
  "este",
  "mes",
  "actual",
  "curso",
  "apoyos",
  "apoyo",
  "folios",
  "folio",
  ...Object.keys(MONTHS_ES),
]);

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function extractPeriodMonth(q, now) {
  const ym = q.match(/\b(20\d{2})-(\d{1,2})\b/);
  if (ym) {
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) return `${ym[1]}-${pad2(month)}`;
  }
  let monthToken = null;
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      monthToken = mm;
      break;
    }
  }
  const yearM = q.match(/\b(20\d{2})\b/);
  if (monthToken) {
    const year = yearM ? yearM[1] : String(resolveNow(now).year);
    return `${year}-${monthToken}`;
  }
  if (/\b(este mes|mes actual|el mes en curso)\b/.test(q)) {
    const n = resolveNow(now);
    return `${n.year}-${pad2(n.month)}`;
  }
  return null;
}

const MONTH_NAME_ALT = Object.keys(MONTHS_ES)
  .slice()
  .sort((a, b) => b.length - a.length)
  .join("|");
const MONTH_POINT_SRC = `(${MONTH_NAME_ALT})(?:\\s+(?:de\\s+)?(20\\d{2}))?`;
const RANGE_SPAN_RES = [
  new RegExp(`\\bentre\\s+${MONTH_POINT_SRC}\\s+y\\s+${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\bdesde\\s+${MONTH_POINT_SRC}\\s+hasta\\s+${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\bde\\s+${MONTH_POINT_SRC}\\s+a\\s+${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\b${MONTH_POINT_SRC}-${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\b${MONTH_POINT_SRC}\\s+a\\s+${MONTH_POINT_SRC}\\b`),
];
const TO_TODAY_SPAN_RES = [
  new RegExp(`\\bde\\s+${MONTH_POINT_SRC}\\s+a\\s+hoy\\b`),
  new RegExp(`\\bdesde\\s+${MONTH_POINT_SRC}\\s+(?:hasta\\s+)?hoy\\b`),
  new RegExp(`\\b${MONTH_POINT_SRC}\\s+a\\s+hoy\\b`),
];
const TRAILING_RANGE_YEAR_RE = /^(?:de\s+)?(20\d{2})\b/;
const MAX_RANGE_MONTHS = 12;

function ymKey(year, monthName) {
  return `${year}-${MONTHS_ES[monthName]}`;
}

function enumerateInclusiveMonths(startYm, endYm) {
  if (!startYm || !endYm) return [];
  if (startYm > endYm) return null;
  const out = [];
  let year = Number(startYm.slice(0, 4));
  let month = Number(startYm.slice(5, 7));
  const endYear = Number(endYm.slice(0, 4));
  const endMonth = Number(endYm.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    out.push(`${year}-${pad2(month)}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (out.length > MAX_RANGE_MONTHS) return null;
  }
  return out;
}

function finishExtractedRange(period_start, period_end, remainder, span_start, span_end) {
  if (period_start > period_end) {
    return {
      ok: false,
      code: "inverted_range",
      error: "el rango inicial es posterior al final; solicita corregirlo.",
      period_start,
      period_end,
      remainder,
      span_start,
      span_end,
    };
  }
  const months = enumerateInclusiveMonths(period_start, period_end);
  if (!months) {
    return {
      ok: false,
      code: "range_too_long",
      error: "El rango supera 12 meses. Solicita un rango menor. No invento un recorte.",
      period_start,
      period_end,
      remainder,
      span_start,
      span_end,
    };
  }
  return {
    ok: true,
    period_start,
    period_end,
    months,
    remainder,
    span_start,
    span_end,
  };
}

function extractToTodayRange(q, now) {
  const text = String(q || "");
  if (!text) return null;
  let match = null;
  for (const re of TO_TODAY_SPAN_RES) {
    re.lastIndex = 0;
    const hit = re.exec(text);
    if (hit) {
      match = hit;
      break;
    }
  }
  if (!match) return null;
  const startName = match[1];
  const startYearHit = match[2] || null;
  if (!startName || !MONTHS_ES[startName]) return null;
  const n = resolveNow(now);
  const nowYear = String(n.year);
  const startYear = startYearHit || nowYear;
  const period_start = ymKey(startYear, startName);
  const period_end = `${nowYear}-${pad2(n.month)}`;
  const consumedEnd = match.index + match[0].length;
  const remainder = `${text.slice(0, match.index)} ${text.slice(consumedEnd)}`.replace(/\s+/g, " ").trim();
  return finishExtractedRange(period_start, period_end, remainder, match.index, consumedEnd);
}

function extractPeriodRange(q, now) {
  const toToday = extractToTodayRange(q, now);
  if (toToday) return toToday;
  const text = String(q || "");
  if (!text) return null;
  let match = null;
  for (const re of RANGE_SPAN_RES) {
    re.lastIndex = 0;
    const hit = re.exec(text);
    if (hit) {
      match = hit;
      break;
    }
  }
  if (!match) return null;

  const startName = match[1];
  const startYearHit = match[2] || null;
  const endName = match[3];
  const endYearHit = match[4] || null;
  if (!startName || !endName || !MONTHS_ES[startName] || !MONTHS_ES[endName]) return null;

  let consumedEnd = match.index + match[0].length;
  const after = text.slice(consumedEnd).trimStart();
  const skipped = text.slice(consumedEnd).length - after.length;
  const trail = after.match(TRAILING_RANGE_YEAR_RE);
  let trailingYear = null;
  if (trail && (!startYearHit || !endYearHit)) {
    trailingYear = trail[1];
    consumedEnd += skipped + trail[0].length;
  }

  const nowYear = String(resolveNow(now).year);
  let startYear;
  let endYear;
  if (startYearHit && endYearHit) {
    startYear = startYearHit;
    endYear = endYearHit;
  } else {
    const shared = trailingYear || startYearHit || endYearHit || nowYear;
    startYear = startYearHit || shared;
    endYear = endYearHit || shared;
  }

  const period_start = ymKey(startYear, startName);
  const period_end = ymKey(endYear, endName);
  const remainder = `${text.slice(0, match.index)} ${text.slice(consumedEnd)}`.replace(/\s+/g, " ").trim();
  return finishExtractedRange(period_start, period_end, remainder, match.index, consumedEnd);
}

function stripClosedScopePhrases(q) {
  return String(q || "")
    .replace(/\bapoyos?\s+o\s+inversiones?\b/g, " ")
    .replace(/\bapoyos?\s+o\s+folios?\b/g, " ")
    .replace(/\bfolios?\s+o\s+apoyos?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ANALYTIC_FRAME_PHRASES = [
  /\bcuanto\s+hemos\s+gastado\b/g,
  /\bcuanto\s+gastamos\b/g,
  /\bcuanto\s+suman\b/g,
  /\bcuanto\s+llevamos\s+acumulado\b/g,
  /\bcuanto\s+llevamos\b/g,
  /\bsuma\s+los\s+montos\b/g,
  /\bcual\s+es\s+el\s+importe\s+total\b/g,
  /\bcual\s+es\s+el\s+total\b/g,
  /\bdame\s+el\s+total\b/g,
  /\bes\s+el\s+total\b/g,
  /\bimporte\s+total\b/g,
  /\bel\s+total\b/g,
  /\bacumulado\s+por\s+mes\b/g,
  /\bpor\s+mes\b/g,
  /\bsuma\s+el\s+monto\b/g,
  /\bdame\s+el\s+monto\s+por\s+mes\s+y\s+(?:el\s+)?acumulado\b/g,
];

const POST_CONCEPT_ANALYTIC_TAIL_RES = [
  /(?:^|\s)(suma\s+(?:los\s+montos|el\s+monto)\s+en\s+un\s+acumulado\s+por\s+mes)$/,
  /(?:^|\s)(dame\s+el\s+monto\s+por\s+mes\s+y\s+el\s+acumulado)$/,
  /(?:^|\s)(dame\s+el\s+monto\s+por\s+mes\s+y\s+acumulado)$/,
  /(?:^|\s)(suma\s+(?:los\s+montos|el\s+monto)\s+por\s+mes)$/,
  /(?:^|\s)(acumulado\s+por\s+mes)$/,
  /(?:^|\s)(suma\s+(?:los\s+montos|el\s+monto))$/,
  /(?:^|\s)(por\s+mes)$/,
];

const REQUEST_WRAPPER_RE = /^(?:dame(?:\s+los)?|muestrame|muestra|mostrar|listar|lista|busca(?:r)?(?:\s+los)?|buscame)\s+/;
const SEARCH_WRAPPER_RES = [
  /^(?:busca(?:r)?(?:\s+los)?|buscame)\s+/,
  /^(?:contienen|contiene|contenga|contengan)\s+(?:la\s+)?palabra\s+/,
  /^(?:contienen|contiene|contenga|contengan)\s+/,
  /^(?:que\s+tengan|que\s+tenga)\s+/,
  /^(?:donde\s+aparezca|donde\s+aparezcan)\s+/,
  /^(?:con)\s+/,
];
const KEYWORD_HINT_RE =
  /\b(?:contienen|contiene|contenga|contengan|que\s+tengan|que\s+tenga|donde\s+aparezca|donde\s+aparezcan|busca(?:r)?|buscame)\b/;

function stripSearchWrappers(span) {
  let s = String(span || "").trim();
  let prev;
  do {
    prev = s;
    for (const re of SEARCH_WRAPPER_RES) s = s.replace(re, "").trim();
  } while (s !== prev);
  return s;
}

function isKeywordSearchQuestion(question) {
  return KEYWORD_HINT_RE.test(normalizeQuestion(question));
}
const RELATIONAL_LOCATOR_RE = /(?:(?:fueron|son|eran)\s+de|relacionad[oa]s?\s+con)\s+/g;
const CONTROL_LEFTOVER_RE = /^(?:dame(?:\s+los)?|muestrame|muestra|mostrar|listar|lista|tenemos|hay|existen)\b/;
const CONTROL_LEFTOVER_TRAIL_RE =
  /(?:^|\s)(dame(?:\s+los)?|muestrame|muestra|mostrar|listar|lista|tenemos|hay|existen)$/;

function locateSingleMonthSpan(text) {
  const q = String(text || "");
  const ym = q.match(/\b(20\d{2})-(\d{1,2})\b/);
  if (ym) return { start: ym.index, end: ym.index + ym[0].length };
  let found = null;
  for (const name of Object.keys(MONTHS_ES)) {
    const hit = new RegExp(`\\b${name}\\b`).exec(q);
    if (!hit) continue;
    if (!found || hit.index < found.index) {
      found = { index: hit.index, end: hit.index + hit[0].length };
    }
  }
  if (!found) {
    const rel = q.match(/\b(este mes|mes actual|el mes en curso)\b/);
    if (rel) return { start: rel.index, end: rel.index + rel[0].length };
    return null;
  }
  let start = found.index;
  const linked = q.slice(0, found.end).match(/(?:^|\s)((?:de|para|en)\s+\S+)$/);
  if (linked) start = found.end - linked[1].length;
  const year = q.slice(found.end).match(/^(?:\s+(?:de\s+)?20\d{2})/);
  return { start, end: found.end + (year ? year[0].length : 0) };
}

function maskSpan(text, start, end) {
  if (start == null || end == null || start >= end) return String(text || "");
  return `${text.slice(0, start)}${" ".repeat(end - start)}${text.slice(end)}`;
}

function trimCharSpan(text, start, end) {
  let from = start;
  let to = end;
  while (from < to && /\s/.test(text[from])) from += 1;
  while (to > from && /\s/.test(text[to - 1])) to -= 1;
  if (from >= to) return null;
  return { start: from, end: to, raw: text.slice(from, to) };
}

function skipSpaces(text, start) {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

function skipControlLeftovers(text, start) {
  let i = skipSpaces(text, start);
  while (i < text.length) {
    const hit = CONTROL_LEFTOVER_RE.exec(text.slice(i));
    if (!hit) break;
    i = skipSpaces(text, i + hit[0].length);
  }
  return i;
}

function skipSpacesAndLoneDe(text, start) {
  let i = skipSpaces(text, start);
  if (text.slice(i, i + 3) === "de ") i += 3;
  else if (text.slice(i, i + 2) === "de" && (i + 2 === text.length || /\s/.test(text[i + 2]))) i += 2;
  return skipSpaces(text, i);
}

function shrinkControlLeftoversFromSpan(text, start, end) {
  let from = start;
  let to = end;
  while (from < to) {
    while (from < to && /\s/.test(text[from])) from += 1;
    const hit = CONTROL_LEFTOVER_RE.exec(text.slice(from, to));
    if (!hit) break;
    from += hit[0].length;
  }
  while (to > from) {
    while (to > from && /\s/.test(text[to - 1])) to -= 1;
    const trail = text.slice(from, to).match(CONTROL_LEFTOVER_TRAIL_RE);
    if (!trail) break;
    to -= trail[1].length;
  }
  return trimCharSpan(text, from, to);
}

function shrinkEstanPeriodBridge(text, span, periodSpan) {
  if (!span || !periodSpan) return span;
  if (span.end > periodSpan.start) return span;
  if (/[^\s]/.test(text.slice(span.end, periodSpan.start))) return span;
  const periodHead = text.slice(periodSpan.start, periodSpan.end);
  if (!/^(?:en|para)\b/.test(periodHead)) return span;
  const body = text.slice(span.start, span.end);
  const hit = body.match(/(?:^|\s)(estan)$/);
  if (!hit) return span;
  return trimCharSpan(text, span.start, span.end - hit[1].length);
}

function matchClosedAnalyticTailSuffix(body) {
  const text = String(body || "");
  if (!text) return null;
  for (const re of POST_CONCEPT_ANALYTIC_TAIL_RES) {
    re.lastIndex = 0;
    const hit = re.exec(text);
    if (hit) return hit[1];
  }
  return null;
}

function shrinkPostConceptAnalyticTail(text, span) {
  if (!span) return span;
  if (String(text || "").slice(span.end).trim()) return span;
  const tail = matchClosedAnalyticTailSuffix(text.slice(span.start, span.end));
  if (!tail) return span;
  return trimCharSpan(text, span.start, span.end - tail.length);
}

function boundConceptSpan(text, start, end, periodSpan) {
  const leftover = shrinkControlLeftoversFromSpan(text, start, end);
  const estan = shrinkEstanPeriodBridge(text, leftover, periodSpan);
  return shrinkPostConceptAnalyticTail(text, estan);
}

function locateConceptSpan(subject, periodSpan) {
  const text = String(subject || "");
  if (!text) return null;
  const masked = periodSpan ? maskSpan(text, periodSpan.start, periodSpan.end) : text;
  RELATIONAL_LOCATOR_RE.lastIndex = 0;
  let rel = null;
  let hit;
  while ((hit = RELATIONAL_LOCATOR_RE.exec(masked))) rel = hit;
  if (rel) {
    const start = skipSpacesAndLoneDe(text, rel.index + rel[0].length);
    const end = periodSpan && periodSpan.start > start ? periodSpan.start : text.length;
    return boundConceptSpan(text, start, end, periodSpan);
  }
  if (periodSpan) {
    const afterControl = skipControlLeftovers(text, periodSpan.end);
    if (text.slice(afterControl, afterControl + 3) === "de ") {
      const after = boundConceptSpan(text, afterControl + 3, text.length, periodSpan);
      if (after) return after;
    }
    const before = text.slice(0, periodSpan.start);
    const enRe = /\ben\s+/g;
    let lastEn = null;
    while ((hit = enRe.exec(before))) lastEn = hit;
    if (lastEn) {
      const enSpan = boundConceptSpan(text, lastEn.index + lastEn[0].length, periodSpan.start, periodSpan);
      if (enSpan) return enSpan;
    }
  }
  const deRe = /\bde\s+/g;
  let lastDe = null;
  while ((hit = deRe.exec(masked))) {
    const rest = masked.slice(hit.index + hit[0].length).trim();
    if (rest) lastDe = hit;
  }
  if (lastDe) {
    const start = lastDe.index + lastDe[0].length;
    const end = periodSpan && periodSpan.start > start ? periodSpan.start : text.length;
    return boundConceptSpan(text, start, end, periodSpan);
  }
  return null;
}

function controlLanguageView(subject, conceptSpan) {
  if (!conceptSpan) return String(subject || "");
  return maskSpan(subject, conceptSpan.start, conceptSpan.end).replace(/\s+/g, " ").trim();
}

function extractAnalyticModelFromControl(control) {
  const text = String(control || "");
  const aggregate = ANALYTIC_FRAME_PHRASES.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
  if (!aggregate) {
    return { analysis_mode: "LIST", aggregation: "NONE", group_by: "NONE", cumulative: "NO" };
  }
  const byMonth = /\bpor\s+mes\b/.test(text) || /\bacumulado\s+por\s+mes\b/.test(text);
  const cumulative =
    /\bacumulado\s+por\s+mes\b/.test(text) ||
    /\bcuanto\s+llevamos\s+acumulado\b/.test(text) ||
    /\bpor\s+mes\s+y\s+(?:el\s+)?acumulado\b/.test(text);
  return {
    analysis_mode: "AGGREGATE",
    aggregation: "SUM",
    group_by: byMonth ? "MONTH" : "NONE",
    cumulative: cumulative ? "YES" : "NO",
  };
}

function askedSpendWording(control) {
  return /\b(gastado|gastamos)\b/.test(String(control || ""));
}

function conceptModelFromProtectedSpan(span) {
  let bounded = String(span || "").trim();
  bounded = bounded.replace(/^(?:de|con)\s+/, "").trim();
  bounded = bounded.replace(new RegExp(`\\s+(?:de|para|en)\\s+(?:${MONTH_NAME_ALT})(?:\\s+(?:de\\s+)?20\\d{2})?$`), "").trim();
  bounded = stripSearchWrappers(bounded);
  if (!bounded) {
    return { concept_mode: "SINGLE", concept_query: null, concept_alternatives: [] };
  }
  const parts = bounded.split(" o ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { concept_mode: "ANY", concept_query: null, concept_alternatives: parts };
  }
  return { concept_mode: "SINGLE", concept_query: bounded, concept_alternatives: [] };
}

function extractConceptSpan(q) {
  let work = String(q || "")
    .replace(/\b20\d{2}-\d{1,2}\b/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\b(este mes|mes actual|el mes en curso)\b/g, " ");
  for (const name of Object.keys(MONTHS_ES)) {
    work = work.replace(new RegExp(`\\b${name}\\b`, "g"), " ");
  }
  const tokens = work
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !STRUCTURAL_TOKENS.has(tok));
  while (tokens[0] === "de") tokens.shift();
  while (tokens.length && tokens[tokens.length - 1] === "de") tokens.pop();
  const joined = tokens.join(" ").trim();
  if (!joined) return null;
  return stripRelationalFrame(joined) || null;
}

function stripLeadingBoundaryConnector(span) {
  const s = String(span || "").trim();
  if (!s) return s;
  const stripped = s.replace(/^(?:de|con)\s+/, "").trim();
  return stripped;
}

function extractConceptModel(q) {
  const framed = extractConceptSpan(q);
  const bounded = stripSearchWrappers(stripLeadingBoundaryConnector(framed));
  if (!bounded) {
    return { concept_mode: "SINGLE", concept_query: null, concept_alternatives: [] };
  }
  const parts = bounded.split(" o ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { concept_mode: "ANY", concept_query: null, concept_alternatives: parts };
  }
  return { concept_mode: "SINGLE", concept_query: bounded, concept_alternatives: [] };
}

function extractConceptQuery(q) {
  return extractConceptModel(q).concept_query;
}

const RELATIONAL_FRAME_RE = /^(?:(?:fueron|son|eran)\s+de|relacionad[oa]s?\s+con)\s+/;

function stripRelationalFrame(span) {
  const s = String(span || "").trim();
  if (!s) return s;
  const stripped = s.replace(RELATIONAL_FRAME_RE, "").trim();
  return stripped || s;
}

function resolveFolioSearchScope(question) {
  const q = normalizeQuestion(question);
  if (/\bfolios?\b/.test(q)) return SCOPE_ALL_PUBLIC_FOLIOS;
  if (/\bapoyos?\b/.test(q)) return SCOPE_SUPPORT_FAMILIES;
  return SCOPE_ALL_PUBLIC_FOLIOS;
}

function conversationStateLib() {
  return require("./director-ia-conversation-state");
}

function buildFolioSearchSpecFromFilters(filters, plantaId) {
  if (!filters || typeof filters !== "object") return null;
  return conversationStateLib().sanitizeFolioSearchSpec(
    {
      version: 1,
      planta_id: Number(plantaId),
      scope: filters.scope,
      period_mode: filters.period_mode,
      period_month: filters.period_month,
      period_start: filters.period_start,
      period_end: filters.period_end,
      period_field: "mes_cargo",
      concept_mode: filters.concept_mode || "SINGLE",
      concept_query: filters.concept_query,
      concept_alternatives: filters.concept_alternatives,
      operation: filters.operation,
    },
    plantaId
  );
}

function filtersFromFolioSearchSpec(spec) {
  if (!spec) return null;
  return {
    scope: spec.scope,
    period_mode: spec.period_mode,
    period_month: spec.period_month,
    period_start: spec.period_start,
    period_end: spec.period_end,
    concept_query: spec.concept_query,
    concept_mode: spec.concept_mode || "SINGLE",
    concept_alternatives: Array.isArray(spec.concept_alternatives) ? spec.concept_alternatives : [],
    operation: spec.operation,
    spend_asked: false,
    analysis_mode: "LIST",
    aggregation: "NONE",
    group_by: "NONE",
    cumulative: "NO",
  };
}

function resolveInheritedFolioSearchFilters(opts, plantaId) {
  const raw = (opts && (opts.inheritedFilters || opts.filtersOverride || opts.searchSpec)) || null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const spec = conversationStateLib().sanitizeFolioSearchSpec(
    {
      version: raw.version != null ? raw.version : 1,
      planta_id: raw.planta_id != null ? raw.planta_id : plantaId,
      scope: raw.scope,
      period_mode: raw.period_mode,
      period_month: raw.period_month,
      period_start: raw.period_start,
      period_end: raw.period_end,
      period_field: raw.period_field || "mes_cargo",
      concept_mode: raw.concept_mode || "SINGLE",
      concept_query: raw.concept_query,
      concept_alternatives: raw.concept_alternatives,
      operation: raw.operation,
    },
    plantaId
  );
  return spec ? filtersFromFolioSearchSpec(spec) : null;
}

function applyAnalysisOverride(filters, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return filters;
  const next = { ...filters };
  if (override.analysis_mode) next.analysis_mode = String(override.analysis_mode);
  if (override.aggregation) next.aggregation = String(override.aggregation);
  if (override.group_by) next.group_by = String(override.group_by);
  if (override.cumulative) next.cumulative = String(override.cumulative);
  if (Object.prototype.hasOwnProperty.call(override, "spend_asked")) {
    next.spend_asked = Boolean(override.spend_asked);
  }
  return next;
}

function extractFolioSearchFilters(question, opts = {}) {
  const q = normalizeQuestion(question);
  const scope = resolveFolioSearchScope(question);
  const emptyAnalytic = { analysis_mode: "LIST", aggregation: "NONE", group_by: "NONE", cumulative: "NO" };
  const emptyConcept = { concept_mode: "SINGLE", concept_query: null, concept_alternatives: [] };
  const operation = isKeywordSearchQuestion(question) ? "keyword_search" : "concept_sequence";
  if (!q) {
    return {
      scope,
      period_mode: "SINGLE",
      period_month: null,
      period_start: null,
      period_end: null,
      ...emptyConcept,
      ...emptyAnalytic,
      spend_asked: false,
      operation,
    };
  }
  const subject = stripClosedScopePhrases(q);
  const range = extractPeriodRange(subject, opts.now);
  const periodSpan = range
    ? { start: range.span_start, end: range.span_end }
    : locateSingleMonthSpan(subject);
  const conceptSpan = locateConceptSpan(subject, periodSpan);
  const control = controlLanguageView(subject, conceptSpan);
  const analytic = extractAnalyticModelFromControl(control);
  let concept;
  if (conceptSpan && conceptSpan.raw) {
    concept = conceptModelFromProtectedSpan(conceptSpan.raw);
  } else {
    const fallback = REQUEST_WRAPPER_RE.test(subject)
      ? subject.replace(REQUEST_WRAPPER_RE, " ").replace(/\s+/g, " ").trim()
      : subject;
    concept = extractConceptModel(range ? range.remainder : fallback);
  }
  if (range) {
    return {
      scope,
      period_mode: "RANGE",
      period_month: null,
      period_start: range.period_start,
      period_end: range.period_end,
      period_code: range.ok ? undefined : range.code,
      error: range.ok ? undefined : range.error,
      ...concept,
      ...analytic,
      spend_asked: askedSpendWording(control),
      operation,
    };
  }
  return {
    scope,
    period_mode: "SINGLE",
    period_month: extractPeriodMonth(subject, opts.now),
    period_start: null,
    period_end: null,
    ...concept,
    ...analytic,
    spend_asked: askedSpendWording(control),
    operation,
  };
}

function isFolioSearchQuestion(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  if (/\bgastos?\b/.test(q) && !/\b(apoyos?|folios?)\b/.test(q)) return false;
  if (/\bgastos?\b/.test(q) && /\b(folio|categoria|listad|rango\s+de\s+meses)\b/.test(q)) return false;
  if (!/\b(apoyos?|folios?)\b/.test(q)) return false;
  if (/\b(tablero|kanban|listar|listado)\b/.test(q)) return false;
  if (/\bfolios?\s+en\s+(la\s+)?(etapa|carro|comprobaciones|evidencias|aprobacion)\b/.test(q)) return false;
  if (/\bfolios?\s+activos\b/.test(q)) return false;
  if (/\b(etapa|estatus)\b/.test(q) && /\bfolio/.test(q)) return false;
  if (/\b(historial|documentos?|cheque|poliza|duplicad|comentarios?)\b/.test(q)) return false;
  if (/\bclasificacion\b/.test(q)) return false;
  if (/\b(recortar|revisar|cancel|igf|riesgo)\b/.test(q)) return false;
  if (/\b(acciones?|responsable|vencid)\b/.test(q)) return false;
  if (/\b(presupuesto|proyectos?|kpis?|excel|xlsx|export|descarg)\b/.test(q)) return false;
  const filters = extractFolioSearchFilters(question, { now: new Date() });
  return Boolean(
    filters.period_month ||
      (filters.period_start && filters.period_end) ||
      filters.period_code === "inverted_range" ||
      filters.period_code === "range_too_long" ||
      filters.concept_query ||
      (filters.concept_alternatives && filters.concept_alternatives.length)
  );
}

function supportFamilyOf(categoria) {
  const s = String(categoria || "")
    .trim()
    .toUpperCase();
  if (!s) return null;
  if (s === "TALLER" || s.includes("TALLER")) return "TALLER";
  if (s === "INVERSIONES" || s.includes("INVERSION")) return "INVERSIONES";
  if (s === "GASTOS" || s.includes("GASTO")) return "GASTOS";
  return null;
}

function normalizeNeedle(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const TOKEN_VOWELS = "aeiou";

function tokenizeConcept(raw) {
  const n = normalizeNeedle(raw);
  if (!n) return [];
  return n.split(/[^a-z0-9]+/).filter(Boolean);
}

function tokenEndsWithVowel(token) {
  return TOKEN_VOWELS.includes(token.charAt(token.length - 1));
}

function isControlledPluralPair(singular, plural) {
  if (!singular || !plural || singular === plural) return false;
  if (singular.endsWith("z") && plural === `${singular.slice(0, -1)}ces`) return true;
  if (singular.length >= 5 && tokenEndsWithVowel(singular) && plural === `${singular}s`) return true;
  if (
    singular.length >= 5 &&
    !tokenEndsWithVowel(singular) &&
    !singular.endsWith("s") &&
    !singular.endsWith("z") &&
    plural === `${singular}es`
  ) {
    return true;
  }
  return false;
}

function tokenEquivalent(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  return isControlledPluralPair(left, right) || isControlledPluralPair(right, left);
}

function fieldHasQuerySequence(queryTokens, fieldTokens) {
  if (!queryTokens.length) return true;
  if (queryTokens.length > fieldTokens.length) return false;
  const last = fieldTokens.length - queryTokens.length;
  for (let i = 0; i <= last; i += 1) {
    let matched = true;
    for (let j = 0; j < queryTokens.length; j += 1) {
      if (!tokenEquivalent(queryTokens[j], fieldTokens[i + j])) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function phraseMatchesRow(row, phrase) {
  if (!phrase) return true;
  const queryTokens = tokenizeConcept(phrase);
  if (!queryTokens.length) return true;
  return (
    fieldHasQuerySequence(queryTokens, tokenizeConcept(row && row.concepto)) ||
    fieldHasQuerySequence(queryTokens, tokenizeConcept(row && row.subcategoria))
  );
}

function normalizeForSearch(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantSearchTokens(text) {
  const n = normalizeForSearch(text);
  if (!n) return [];
  return n.split(" ").filter((t) => t.length > 1 && !SEARCH_STOPWORDS.has(t));
}

function textMatchesSearch(haystack, needle) {
  const q = normalizeForSearch(needle || "");
  if (!q) return true;
  const h = normalizeForSearch(haystack || "");
  if (!h) return false;
  if (h.includes(q)) return true;
  const qTok = significantSearchTokens(needle || "");
  const hTok = significantSearchTokens(haystack || "");
  if (qTok.length >= 2 && hTok.length >= 2) {
    const hSet = new Set(hTok);
    const hit = qTok.filter((t) => hSet.has(t)).length;
    if (hit / qTok.length >= 0.85) return true;
  }
  return false;
}

function formatImporteForSearch(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function rowMatchesKeywordSearch(row, phrase) {
  if (!phrase) return true;
  const fields = [
    row && row.numero_folio,
    row && row.folio_codigo,
    row && row.descripcion,
    row && row.concepto,
    row && row.beneficiario,
    row && row.categoria,
    row && row.subcategoria,
    row && row.proyecto_codigo,
    row && row.proyecto_nombre,
    row && row.planta_nombre,
    row && row.numero_cheque,
    formatImporteForSearch(row && row.importe),
  ];
  return fields.some((f) => textMatchesSearch(f, phrase));
}

function rowMatchesConcept(row, conceptQuery, alternatives, operation) {
  const phrases =
    Array.isArray(alternatives) && alternatives.length
      ? alternatives.filter(Boolean)
      : conceptQuery
        ? [conceptQuery]
        : [];
  if (!phrases.length) return true;
  const matchFn = operation === "keyword_search" ? rowMatchesKeywordSearch : phraseMatchesRow;
  return phrases.some((phrase) => matchFn(row, phrase));
}

function folioStableId(row) {
  if (row && row.id != null && Number.isFinite(Number(row.id))) return `id:${Number(row.id)}`;
  if (row && row.folio_id != null && Number.isFinite(Number(row.folio_id))) {
    return `folio_id:${Number(row.folio_id)}`;
  }
  return null;
}

function dedupFolioRows(rows) {
  const seen = new Set();
  const out = [];
  let anon = 0;
  for (const row of rows || []) {
    const key = folioStableId(row) || `row:${anon}`;
    anon += 1;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function projectRecord(row) {
  return {
    folio_id: row.id != null ? Number(row.id) : row.folio_id != null ? Number(row.folio_id) : null,
    numero_folio: row.numero_folio ? String(row.numero_folio) : null,
    folio_codigo: row.folio_codigo ? String(row.folio_codigo) : null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    planta_nombre: row.planta_nombre || null,
    periodo: row.mes_cargo || null,
    categoria: row.categoria || null,
    partida: row.subcategoria || null,
    concepto: row.concepto || null,
    beneficiario: row.beneficiario || null,
    numero_cheque: row.numero_cheque || null,
    proyecto_codigo: row.proyecto_codigo || null,
    proyecto_nombre: row.proyecto_nombre || null,
    importe: row.importe != null ? Number(row.importe) : null,
    estatus: row.estatus || null,
    source: SOURCE_FOLIOS,
  };
}

function isCancelledStatus(estatus) {
  return String(estatus || "").trim().toUpperCase() === "CANCELADO";
}

function isBlankImporte(value) {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function classifyImporte(value) {
  if (isBlankImporte(value)) return { kind: "UNKNOWN", amount: null };
  const n = Number(value);
  if (!Number.isFinite(n)) return { kind: "UNKNOWN", amount: null };
  return { kind: "KNOWN", amount: n };
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function emptyMonthBucket(mes_cargo) {
  return {
    mes_cargo,
    eligible_count: 0,
    known_amount_count: 0,
    unknown_amount_count: 0,
    known_subtotal: 0,
    is_complete: true,
  };
}

function buildAggregate(eligibleRows, analytic, fetchMonths) {
  const classified = (eligibleRows || []).map((row) => ({
    row,
    mes: row.mes_cargo || row.periodo || null,
    amount: classifyImporte(row.importe),
  }));
  const known = classified.filter((item) => item.amount.kind === "KNOWN");
  const unknown = classified.filter((item) => item.amount.kind === "UNKNOWN");
  const known_total = roundMoney(known.reduce((acc, item) => acc + item.amount.amount, 0));
  const unknown_amount_count = unknown.length;
  const known_amount_count = known.length;
  const aggregate_eligible_count = classified.length;
  const is_complete = unknown_amount_count === 0;
  const has_pagado = classified.some(
    (item) => String((item.row && item.row.estatus) || "").trim().toUpperCase() === "PAGADO"
  );
  const base = {
    measure: is_complete ? "importe_total_encontrado" : "importe_conocido_encontrado",
    known_total,
    aggregate_eligible_count,
    known_amount_count,
    unknown_amount_count,
    is_complete,
    has_pagado,
    months: [],
  };
  if (!analytic || analytic.group_by !== "MONTH") return base;
  const months = Array.isArray(fetchMonths) ? fetchMonths.slice() : [];
  const byMonth = new Map(months.map((mes) => [mes, emptyMonthBucket(mes)]));
  for (const item of classified) {
    const bucket = byMonth.get(item.mes);
    if (!bucket) continue;
    bucket.eligible_count += 1;
    if (item.amount.kind === "KNOWN") {
      bucket.known_amount_count += 1;
      bucket.known_subtotal = roundMoney(bucket.known_subtotal + item.amount.amount);
    } else {
      bucket.unknown_amount_count += 1;
    }
    bucket.is_complete = bucket.unknown_amount_count === 0;
  }
  let running_known = 0;
  let running_complete = true;
  const monthRows = months.map((mes_cargo) => {
    const bucket = byMonth.get(mes_cargo) || emptyMonthBucket(mes_cargo);
    running_known = roundMoney(running_known + bucket.known_subtotal);
    running_complete = running_complete && bucket.is_complete;
    return { ...bucket, running_known, running_is_complete: running_complete };
  });
  const last = monthRows[monthRows.length - 1];
  return { ...base, known_total: last ? last.running_known : 0, months: monthRows };
}

async function loadFolioSearchForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question =
    opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const inherited = resolveInheritedFolioSearchFilters(opts, plantaId);
  const parsed = inherited ? null : extractFolioSearchFilters(question, { now: opts.now });
  const filters = applyAnalysisOverride(inherited || parsed, opts.analysisOverride);
  const shaped = {
    planta_id: Number(plantaId),
    scope: filters.scope,
    period_mode: filters.period_mode || "SINGLE",
    period_month: filters.period_month,
    period_start: filters.period_start || null,
    period_end: filters.period_end || null,
    concept_query: filters.concept_query,
    concept_mode: filters.concept_mode || "SINGLE",
    concept_alternatives: Array.isArray(filters.concept_alternatives) ? filters.concept_alternatives : [],
    analysis_mode: filters.analysis_mode || "LIST",
    aggregation: filters.aggregation || "NONE",
    group_by: filters.group_by || "NONE",
    cumulative: filters.cumulative || "NO",
    spend_asked: Boolean(filters.spend_asked),
    operation: filters.operation || "concept_sequence",
  };

  if (filters.period_code === "inverted_range" || filters.period_code === "range_too_long") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: filters.error,
      period_code: filters.period_code,
      filters: shaped,
      source: SOURCE_FOLIOS,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  const fetchMonths =
    shaped.period_mode === "RANGE"
      ? enumerateInclusiveMonths(shaped.period_start, shaped.period_end)
      : shaped.period_month
        ? [shaped.period_month]
        : [];

  if (!fetchMonths || !fetchMonths.length) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "Indica el mes (mes_cargo). No invento el periodo.",
      period_code: "missing_period",
      filters: shaped,
      source: SOURCE_FOLIOS,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  const queryFn = opts.queryPublicFolios || queryReviewableSupportFolios;
  const canSeeSoloZpAd = usuarioPermisos.authHasPermiso(auth, "acceso_ver_folios_solo_zp_ad");

  async function run(client) {
    const rawAll = [];
    for (const mesCargo of fetchMonths) {
      let part;
      try {
        part = await queryFn(client, Number(plantaId), mesCargo, {
          resolveEquivalentIds: opts.resolveEquivalentIds,
        });
      } catch (e) {
        const detail = e && e.message ? String(e.message) : "SOURCE_ERROR";
        const err = new Error(`No pude consultar el mes_cargo ${mesCargo}. ${detail}. No invento un listado parcial del rango.`);
        err.period_code = "partial_month_failure";
        err.failed_month = mesCargo;
        throw err;
      }
      rawAll.push(...(part || []));
    }
    const visible = rawAll.filter((row) => {
      if (row && row.solo_zp_ad && !canSeeSoloZpAd) return false;
      return true;
    });
    const scoped =
      shaped.scope === SCOPE_SUPPORT_FAMILIES
        ? visible.filter((row) => supportFamilyOf(row.categoria))
        : visible;
        const matched = scoped.filter((row) =>
      rowMatchesConcept(row, shaped.concept_query, shaped.concept_alternatives, shaped.operation)
    );
    const deduped = dedupFolioRows(matched);
    const plantaNombre = (deduped[0] && (deduped[0].planta_nombre || null)) || null;
    if (shaped.analysis_mode === "AGGREGATE") {
      const eligible = deduped.filter((row) => !isCancelledStatus(row.estatus));
      const analysis = buildAggregate(eligible, shaped, fetchMonths);
      return {
        ok: true,
        filters: shaped,
        planta_id: Number(plantaId),
        planta_nombre: plantaNombre,
        match_count: deduped.length,
        count: analysis.aggregate_eligible_count,
        truncated: false,
        records: [],
        analysis,
        retrieved_at: new Date().toISOString(),
        source: SOURCE_FOLIOS,
        semantic_class: SEMANTIC_CLASS,
      };
    }
    const records = deduped.map(projectRecord);
    const truncated = records.length > RECORD_LIMIT;
    return {
      ok: true,
      filters: shaped,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      match_count: records.length,
      count: records.length,
      truncated,
      records: truncated ? records.slice(0, RECORD_LIMIT) : records,
      retrieved_at: new Date().toISOString(),
      source: SOURCE_FOLIOS,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  const injected = typeof opts.queryPublicFolios === "function";
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
        status: 500,
        error: e && e.message,
        period_code: e && e.period_code,
        filters: shaped,
        source: SOURCE_FOLIOS,
        semantic_class: SEMANTIC_CLASS,
      };
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 500,
      error: "Fuente de folios no disponible",
      filters: shaped,
      source: SOURCE_FOLIOS,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 500,
      error: e && e.message,
      period_code: e && e.period_code,
      filters: shaped,
      source: SOURCE_FOLIOS,
      semantic_class: SEMANTIC_CLASS,
    };
  } finally {
    client.release();
  }
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "importe no registrado";
  return n.toFixed(2);
}

function formatImporteRegistrado(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "importe no registrado";
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`;
}

function formatKeywordRangeLabel(filters) {
  if (filters.period_mode === "RANGE" && filters.period_start && filters.period_end) {
    const y1 = String(filters.period_start).slice(0, 4);
    const y2 = String(filters.period_end).slice(0, 4);
    const a = labelMonth(filters.period_start).toLowerCase();
    const b = labelMonth(filters.period_end).toLowerCase();
    if (y1 === y2) return `${a} a ${b} de ${y1}`;
    return `${a} ${y1} a ${b} ${y2}`;
  }
  if (filters.period_month) {
    return `${labelMonth(filters.period_month).toLowerCase()} ${String(filters.period_month).slice(0, 4)}`;
  }
  return "";
}

function formatKeywordRecord(row) {
  const folio = row.numero_folio || row.folio_id || "folio no registrado";
  const mes = row.periodo ? `${labelMonth(row.periodo).toLowerCase()} ${String(row.periodo).slice(0, 4)}` : "mes_cargo no registrado";
  const cat = row.categoria || "categoria no registrada";
  const desc = row.concepto || "concepto no registrado";
  const benef = row.beneficiario || "beneficiario no registrado";
  const estatus = row.estatus || "estatus no registrado";
  return [
    `${folio}`,
    `Mes de cargo: ${mes}`,
    `Categoría: ${cat}`,
    `Descripción: ${desc}`,
    `Beneficiario: ${benef}`,
    `Importe registrado en el folio: ${formatImporteRegistrado(row.importe)}`,
    `Estatus: ${estatus}`,
  ].join("\n");
}

function subjectNoun(filters) {
  return filters && filters.scope === SCOPE_SUPPORT_FAMILIES ? "apoyos" : "folios";
}

function formatUnknownFolioCount(n) {
  return n === 1 ? "1 folio" : `${n} folios`;
}

function labelMonth(ym) {
  const mm = String(ym || "").slice(5, 7);
  const names = {
    "01": "Enero",
    "02": "Febrero",
    "03": "Marzo",
    "04": "Abril",
    "05": "Mayo",
    "06": "Junio",
    "07": "Julio",
    "08": "Agosto",
    "09": "Septiembre",
    "10": "Octubre",
    "11": "Noviembre",
    "12": "Diciembre",
  };
  return names[mm] || String(ym || "mes");
}

function formatMonthAnswerLine(month, cumulative) {
  const label = labelMonth(month.mes_cargo);
  const known = formatMoney(month.known_subtotal);
  let body;
  if (month.eligible_count === 0 || month.is_complete) {
    body = `${label}: ${known}.`;
  } else {
    body = `${label}: importe conocido ${known}; ${formatUnknownFolioCount(month.unknown_amount_count)} con importe no registrado; subtotal incompleto.`;
  }
  if (!cumulative) return body;
  const running = formatMoney(month.running_known);
  if (month.running_is_complete) {
    return `${body} Acumulado hasta ${label.toLowerCase()}: ${running}.`;
  }
  return `${body} Acumulado conocido hasta ${label.toLowerCase()}: ${running} (incompleto).`;
}

function buildAggregateAnswer(payload, filterBit) {
  const filters = payload.filters || {};
  const analysis = payload.analysis || {};
  const noun = subjectNoun(filters);
  const known = formatMoney(analysis.known_total);
  const unknown = Number(analysis.unknown_amount_count) || 0;
  const lines = [];
  if (analysis.is_complete) {
    if (filters.spend_asked) {
      lines.push("No puedo afirmar gasto contable realizado desde public.folios.");
    }
    lines.push(`El importe total de los ${noun} encontrados, excluyendo CANCELADO, es ${known}.`);
  } else {
    lines.push(
      `El importe conocido de los ${noun} encontrados, excluyendo CANCELADO, suma ${known}. Hay ${formatUnknownFolioCount(unknown)} con importe no registrado, por lo que el total completo no puede determinarse.`
    );
    if (filters.spend_asked) {
      lines.push("public.folios no prueba gasto contable realizado.");
    }
  }
  if (analysis.has_pagado) {
    lines.push("PAGADO no prueba gasto contable.");
  }
  if (Array.isArray(analysis.months) && analysis.months.length) {
    for (const month of analysis.months) {
      lines.push(formatMonthAnswerLine(month, filters.cumulative === "YES"));
    }
  }
  return `${lines.join(" ")}${filterBit}`;
}

function buildFolioSearchAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar folios de esta planta.";
    }
    return payload && payload.error
      ? String(payload.error)
      : "No pude consultar folios por un error de fuente. No invento listados.";
  }

  const filters = payload.filters || {};
  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const bits = [];
  if (filters.period_mode === "RANGE" && filters.period_start && filters.period_end) {
    bits.push(`mes_cargo ${filters.period_start} a ${filters.period_end}`);
  } else if (filters.period_month) {
    bits.push(`mes_cargo ${filters.period_month}`);
  }
  if (filters.concept_mode === "ANY" && filters.concept_alternatives && filters.concept_alternatives.length) {
    bits.push(`concepto cualquiera de: ${filters.concept_alternatives.join(" | ")}`);
  } else if (filters.concept_query) {
    bits.push(`concepto ${filters.concept_query}`);
  }
  const filterBit = bits.length ? ` Filtros: ${bits.join(", ")}.` : "";
  const trunc = payload.truncated ? ` Listado truncado a ${RECORD_LIMIT} de ${payload.count} registros.` : "";
  const matchCount = payload.match_count != null ? payload.match_count : (payload.records || []).length;
  const isKeyword = filters.operation === "keyword_search";
  const term = filters.concept_query || "";

  if (filters.analysis_mode === "AGGREGATE") {
    if (matchCount === 0) {
      if (filters.scope === SCOPE_SUPPORT_FAMILIES) {
        return `No encontré apoyos en GASTOS, INVERSIONES o TALLER con esos filtros.${filterBit}`;
      }
      return `No encontré folios con esos filtros.${filterBit}`;
    }
    return buildAggregateAnswer(payload, filterBit);
  }

  if (!payload.records || payload.records.length === 0) {
    if (isKeyword && term) {
      return `No encontré folios que coincidan con "${term}" en el rango indicado.`;
    }
    if (filters.scope === SCOPE_SUPPORT_FAMILIES) {
      return `No encontré apoyos en GASTOS, INVERSIONES o TALLER con esos filtros.${filterBit}`;
    }
    return `No encontré folios con esos filtros.${filterBit}`;
  }

  if (isKeyword) {
    const rangeLabel = formatKeywordRangeLabel(filters);
    const shownNote = payload.truncated ? ` Muestro los primeros ${RECORD_LIMIT}.` : "";
    const header = `Encontré ${payload.count} folios${rangeLabel ? ` de ${rangeLabel}` : ""} que coinciden con "${term}" en ${scope}.${shownNote}`;
    const lines = payload.records.map((r) => formatKeywordRecord(r));
    return `${header}\n${lines.join("\n")}`;
  }

  const lines = payload.records.slice(0, 16).map((row, i) => {
    const folio = row.numero_folio || row.folio_id || "folio no registrado";
    const concepto = row.concepto || "concepto no registrado";
    const importe = formatMoney(row.importe);
    const estatus = row.estatus || "estatus no registrado";
    const periodo = row.periodo || filters.period_month || "mes_cargo no registrado";
    const cat = row.categoria || "categoria no registrada";
    return `${i + 1}. ${folio}; ${cat}; ${concepto}; ${importe}; ${estatus}; ${periodo}`;
  });

  const header =
    filters.scope === SCOPE_SUPPORT_FAMILIES
      ? `Encontré ${payload.count} apoyos en GASTOS, INVERSIONES y TALLER en ${scope}.${filterBit}${trunc}`
      : `Encontré ${payload.count} folios en ${scope}.${filterBit}${trunc}`;

  return `${header} Hechos observados en ${SOURCE_FOLIOS}.\n${lines.join("\n")}`;
}

function buildFolioSearchChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildFolioSearchAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    veracity =
      payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        ? DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        : DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  } else if (payload.count === 0) {
    veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE_FOLIOS] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: "folio_search",
      openai_called: false,
      veracity,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      scope: payload && payload.filters ? payload.filters.scope : null,
      period_mode: payload && payload.filters ? payload.filters.period_mode : null,
      period_month: payload && payload.filters ? payload.filters.period_month : null,
      period_start: payload && payload.filters ? payload.filters.period_start : null,
      period_end: payload && payload.filters ? payload.filters.period_end : null,
      concept_query: payload && payload.filters ? payload.filters.concept_query : null,
      concept_mode: payload && payload.filters ? payload.filters.concept_mode : null,
      concept_alternatives: payload && payload.filters ? payload.filters.concept_alternatives : undefined,
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
      conversation_state: (() => {
        const spec = okPayload ? buildFolioSearchSpecFromFilters(payload.filters, planta_id) : null;
        const stateLib = conversationStateLib();
        if (!spec) return stateLib.emptyConversationState(planta_id);
        return stateLib.buildConversationState({
          plantaId: planta_id,
          parent_intent: "folio_search",
          last_evidence_bundle_type: "folio_search",
          folio_search_spec: spec,
        });
      })(),
    },
    folio_search: okPayload
      ? {
          semantic_class: SEMANTIC_CLASS,
          filters: payload.filters,
          source: payload.source || SOURCE_FOLIOS,
          count: payload.count,
          truncated: payload.truncated,
          records: payload.records,
          analysis: payload.analysis,
        }
      : null,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SCOPE_ALL_PUBLIC_FOLIOS,
  SCOPE_SUPPORT_FAMILIES,
  SUPPORT_FAMILIES,
  MONTHS_ES,
  normalizeQuestion,
  normalizeForSearch,
  textMatchesSearch,
  resolveFolioSearchScope,
  extractFolioSearchFilters,
  buildFolioSearchSpecFromFilters,
  resolveInheritedFolioSearchFilters,
  classifyImporte,
  isFolioSearchQuestion,
  supportFamilyOf,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  buildFolioSearchChatResult,
};
