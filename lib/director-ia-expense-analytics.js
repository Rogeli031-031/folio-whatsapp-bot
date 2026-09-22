"use strict";

/**
 * Director IA — núcleo de Expense Analytics.
 * Agrega cabeceras de public.folios por dominio, métrica, periodo, estatus y keyword.
 * Reutiliza queryReviewableSupportFolios + extractFolioSearchFilters + textMatchesSearch.
 * No lee desglose de partidas. No inventa importes parciales. No continuidad de result-set.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { isM5TallerAtQuery, isTallerMayorQuery } = require("./director-ia-capabilities");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const {
  SOURCE_FOLIOS,
  queryReviewableSupportFolios,
} = require("./director-ia-igf-reviewable-supports");
const {
  MONTHS_ES,
  normalizeQuestion,
  extractFolioSearchFilters,
  textMatchesSearch,
  supportFamilyOf,
  isFolioConceptCountQuestion,
} = require("./director-ia-folio-search");
const usuarioPermisos = require("./usuario-permisos");
const runtime008 = require("./director-ia-seh-taller-purchase-evidence-008");
const runtime010 = require("./director-ia-executive-context-sales-entity-010");

const SEMANTIC_CLASS = "expense_analytics";
const SOURCE = SOURCE_FOLIOS || "public.folios";

const DOMAINS = Object.freeze({
  TALLER: "TALLER",
  GASTOS: "GASTOS",
  INVERSIONES: "INVERSIONES",
});

const METRICS = Object.freeze({
  SUM: "SUM",
  COUNT: "COUNT",
  AVG: "AVG",
  MAX: "MAX",
  MIN: "MIN",
  ATTRIBUTABLE_COMPONENT_COST: "ATTRIBUTABLE_COMPONENT_COST",
});

const CLASSIFICATIONS = Object.freeze({
  EXACT_SUPPORTED: "EXACT_SUPPORTED",
  FOLIO_TOTAL_ONLY: "FOLIO_TOTAL_ONLY",
  KEYWORD_MATCH_ONLY: "KEYWORD_MATCH_ONLY",
  BREAKDOWN_MISSING: "BREAKDOWN_MISSING",
});

const SEMANTIC_LABELS = Object.freeze({
  CATEGORY_SUM: "CATEGORY_SUM",
  TOTAL_FOLIOS_MATCHING_KEYWORD: "TOTAL_FOLIOS_MATCHING_KEYWORD",
  ATTRIBUTABLE_COMPONENT_COST: "ATTRIBUTABLE_COMPONENT_COST",
});

const EXCLUSIVE_COMPONENT_KEYWORDS = Object.freeze(["llantas", "llanta", "refacciones", "refaccion"]);

const MONTH_LABELS = Object.freeze({
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
});

const KEYWORD_STOP = new Set([
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
  "u",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "que",
  "cual",
  "cuales",
  "como",
  "cuanto",
  "cuantos",
  "cuanta",
  "cuantas",
  "fue",
  "fueron",
  "es",
  "son",
  "hay",
  "hubo",
  "tiene",
  "tienen",
  "tienen",
  "folio",
  "folios",
  "categoria",
  "se",
  "gasto",
  "gaste",
  "gastamos",
  "gastado",
  "suman",
  "suma",
  "total",
  "promedio",
  "caro",
  "barato",
  "mayor",
  "menor",
  "importe",
  "mas",
  "solo",
  "exactamente",
  "exclusivo",
  "exclusiva",
  "exclusivamente",
  "pagado",
  "pagados",
  "pendiente",
  "pendientes",
  "mes",
  "meses",
  "contienen",
  "contiene",
  "contenga",
  "contengan",
  "palabra",
  "taller",
  "gastos",
  "inversion",
  "inversiones",
  "este",
  "actual",
  "curso",
  "rango",
  "desde",
  "hasta",
  "entre",
  "hoy",
  "he",
  "has",
  "ha",
  "han",
  "habia",
  "habiamos",
  "hemos",
  "cuando",
  "llevamos",
]);

const LIST_WRAPPER_RE =
  /^(?:dame(?:\s+los)?|muestrame|muestra|mostrar|listar|lista|busca(?:r)?(?:\s+los)?|buscame)\s+/;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isCancelledStatus(estatus) {
  return String(estatus || "").trim().toUpperCase() === "CANCELADO";
}

function classifyImporte(value) {
  if (value == null || value === "") return { kind: "UNKNOWN", amount: null };
  const n = Number(value);
  if (!Number.isFinite(n)) return { kind: "UNKNOWN", amount: null };
  return { kind: "KNOWN", amount: n };
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function formatMxn(n) {
  return `$${roundMoney(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
}

function labelMonth(ym) {
  const key = String(ym || "").slice(5, 7);
  return MONTH_LABELS[key] || String(ym || "");
}

function formatPeriodLabel(spec) {
  if (!spec) return "el periodo solicitado";
  if (spec.period_mode === "RANGE" && spec.period_start && spec.period_end) {
    const y1 = String(spec.period_start).slice(0, 4);
    const y2 = String(spec.period_end).slice(0, 4);
    const a = labelMonth(spec.period_start);
    const b = labelMonth(spec.period_end);
    if (y1 === y2) return `${a} a ${b} ${y1}`;
    return `${a} ${y1} a ${b} ${y2}`;
  }
  if (spec.period_month) {
    return `${labelMonth(spec.period_month)} ${String(spec.period_month).slice(0, 4)}`;
  }
  return "el periodo solicitado";
}

function domainLabel(domain) {
  if (domain === DOMAINS.TALLER) return "Taller";
  if (domain === DOMAINS.GASTOS) return "Gastos";
  if (domain === DOMAINS.INVERSIONES) return "Inversiones";
  return null;
}

function hasExportCollision(q) {
  return /\b(excel|xlsx|export|descarg)\b/.test(q);
}

function hasFinancialCollision(q) {
  return /\b(igf|margen|rentabilidad|utilidad)\b/.test(q);
}

function hasTallerMayorProgram(q) {
  return /\btaller\s+mayor\b/.test(q) || /\breparacion\s+mayor\b/.test(q);
}

function hasFolioMatchFrame(q) {
  return (
    /\b(folios?|apoyos?)\s+que\s+(contienen|contiene|tienen|tiene)\b/.test(q) ||
    /\bcontienen\b/.test(q) ||
    /\bsuman\s+los\s+folios?\b/.test(q)
  );
}

function hasExclusiveComponentToken(q) {
  return EXCLUSIVE_COMPONENT_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(q));
}

function hasExactCostCue(q) {
  return (
    /\bexactamente\b/.test(q) ||
    /\bexclusiv/.test(q) ||
    /\bsolo\s+(?:en\s+)?(?!folios?\b|apoyos?\b|estatus\b|pagados?\b)/.test(q)
  );
}

function detectDomain(q) {
  if (/\btaller\b/.test(q)) return DOMAINS.TALLER;
  if (/\binversiones?\b/.test(q)) return DOMAINS.INVERSIONES;
  if (/\bgastos\b/.test(q)) return DOMAINS.GASTOS;
  return null;
}

function detectStatus(q) {
  if (/\bpagados?\b/.test(q)) return "PAGADO";
  if (/\bpendientes?\b/.test(q)) return "PENDIENTE";
  return null;
}

function hasCountCue(q) {
  return /\bcuantos\s+(folios?|apoyos?|hubo|fueron|hay)\b/.test(q) || /\bcuantos\s+fueron\b/.test(q);
}

function hasAvgCue(q) {
  return /\bpromedio\b/.test(q);
}

function hasMaxCue(q) {
  return (
    /\bmas\s+caro\b/.test(q) ||
    /\bmayor\s+(gasto|importe|folio)\b/.test(q) ||
    /\bfolio\s+de\s+mayor\s+importe\b/.test(q)
  );
}

function hasMinCue(q) {
  return /\bmas\s+barato\b/.test(q) || /\bmenor\s+(gasto|importe)\b/.test(q);
}

function hasSumCue(q) {
  return (
    /\b(gaste|gastamos|gastado)\b/.test(q) ||
    /\bse\s+gasto\b/.test(q) ||
    /\bcuanto\s+(fue|suman|suma)\b/.test(q) ||
    /\bcuanto\s+fue\b/.test(q) ||
    /\btotal\b/.test(q) ||
    /\bsuman\b/.test(q)
  );
}

function hasMetricCue(q) {
  return hasSumCue(q) || hasCountCue(q) || hasAvgCue(q) || hasMaxCue(q) || hasMinCue(q) || hasExactCostCue(q);
}

function detectMetric(q, opts = {}) {
  if (opts.forceAttributable) return METRICS.ATTRIBUTABLE_COMPONENT_COST;
  if (hasCountCue(q)) return METRICS.COUNT;
  if (hasAvgCue(q)) return METRICS.AVG;
  if (hasMaxCue(q)) return METRICS.MAX;
  if (hasMinCue(q)) return METRICS.MIN;
  if (hasSumCue(q) || opts.spendContext) return METRICS.SUM;
  return null;
}

function normalizeStopToken(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isKeywordStopToken(raw) {
  const token = normalizeStopToken(raw);
  return !token || KEYWORD_STOP.has(token);
}

function extractKeyword(q) {
  let work = String(q || "");
  work = work.replace(/\b20\d{2}-\d{1,2}\b/g, " ");
  work = work.replace(/\b20\d{2}\b/g, " ");
  for (const name of Object.keys(MONTHS_ES)) {
    work = work.replace(new RegExp(`\\b${name}\\b`, "g"), " ");
  }
  const tokens = work
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !isKeywordStopToken(t) && !/^\d+$/.test(t));
  if (!tokens.length) return null;
  return tokens.join(" ");
}

function exclusiveKeywordOf(keyword) {
  const k = String(keyword || "").trim();
  if (!k) return null;
  const hit = EXCLUSIVE_COMPONENT_KEYWORDS.find((item) => new RegExp(`\\b${item}\\b`).test(k));
  return hit || null;
}

function keywordLimitation(keyword) {
  const term = exclusiveKeywordOf(keyword) || keyword || "ese concepto";
  return `Ese total corresponde a los importes completos de los folios coincidentes y no necesariamente al gasto exclusivo en ${term}.`;
}

function exactCostMissingAnswer(keyword) {
  const term = exclusiveKeywordOf(keyword) || keyword || "esa subpartida";
  return `No puedo determinar con exactitud cuánto corresponde exclusivamente a ${term} con esta fuente, porque la ruta actual no tiene desglose atribuible usable.`;
}

function isListOnlyQuestion(q) {
  if (!LIST_WRAPPER_RE.test(q) && !/\b(que|cuales)\s+(folios?|apoyos?)\b/.test(q)) return false;
  return !hasMetricCue(q);
}

function isExpenseAnalyticsQuestion(question) {
  const q = normalizeQuestion(question);
  if (!q) return false;
  if (typeof isFolioConceptCountQuestion === "function" && isFolioConceptCountQuestion(question)) return false;
  if (hasExportCollision(q) || hasFinancialCollision(q)) return false;
  if (hasTallerMayorProgram(q)) return false;
  if (typeof isM5TallerAtQuery === "function" && isM5TallerAtQuery(q)) return false;
  if (typeof isTallerMayorQuery === "function" && /\btaller\s+mayor\b/.test(q) && isTallerMayorQuery(q)) {
    return false;
  }
  if (isListOnlyQuestion(q)) return false;
  if (runtime008.isTallerExpenseQuestion(question)) return true;
  if (!hasMetricCue(q)) return false;
  const domain = detectDomain(q);
  if (domain) return true;
  if (hasFolioMatchFrame(q)) return true;
  if (hasExclusiveComponentToken(q)) return true;
  if (extractKeyword(q)) return true;
  return false;
}

function enumerateMonths(startYm, endYm) {
  if (!startYm || !endYm || startYm > endYm) return [];
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
    if (out.length > 12) return [];
  }
  return out;
}

function extractExpenseAnalyticsSpec(question, opts = {}) {
  const q = normalizeQuestion(question);
  const empty = {
    ok: false,
    domain: null,
    metric: null,
    period_mode: "SINGLE",
    period_month: null,
    period_start: null,
    period_end: null,
    months: [],
    status: null,
    keyword: null,
    classification: null,
    semantic_label: null,
    folio_match_frame: false,
  };
  if (!q) return { ...empty, code: "empty_question", error: "Pregunta vacía." };

  const domain = detectDomain(q) || opts.inheritedDomain || null;
  const status = detectStatus(q);
  const folioMatch = hasFolioMatchFrame(q);
  const keyword = extractKeyword(q);
  const exclusive = exclusiveKeywordOf(keyword);
  const exactCue = hasExactCostCue(q);
  const llantaConcept = runtime010.normalizeKeywordConcept(keyword) === "llanta";
  const attributable =
    !folioMatch && Boolean(keyword) && (exactCue || (Boolean(exclusive) && !llantaConcept));

  const metric =
    detectMetric(q, {
      forceAttributable: attributable,
      spendContext: Boolean(domain || folioMatch || exclusive || runtime008.isTallerExpenseQuestion(question)),
    }) || opts.inheritedMetric || null;

  const filters = runtime008.enrichExpensePeriod(
    question,
    extractFolioSearchFilters(question, { now: opts.now }),
    opts.now
  );
  let period_mode = filters.period_mode || "SINGLE";
  let period_month = filters.period_month || null;
  let period_start = filters.period_start || null;
  let period_end = filters.period_end || null;
  let months = [];
  if (filters.period_code === "inverted_range" || filters.period_code === "range_too_long") {
    return {
      ...empty,
      ok: false,
      domain,
      metric,
      status,
      keyword,
      period_mode: "RANGE",
      period_start,
      period_end,
      code: filters.period_code,
      error: filters.error,
    };
  }
  if (period_mode === "RANGE" && period_start && period_end) {
    months = enumerateMonths(period_start, period_end);
  } else if (period_month) {
    months = [period_month];
    period_mode = "SINGLE";
  }

  let classification = CLASSIFICATIONS.EXACT_SUPPORTED;
  let semantic_label = SEMANTIC_LABELS.CATEGORY_SUM;
  if (attributable) {
    classification = CLASSIFICATIONS.BREAKDOWN_MISSING;
    semantic_label = SEMANTIC_LABELS.ATTRIBUTABLE_COMPONENT_COST;
  } else if (keyword) {
    classification = folioMatch
      ? CLASSIFICATIONS.KEYWORD_MATCH_ONLY
      : CLASSIFICATIONS.FOLIO_TOTAL_ONLY;
    semantic_label = SEMANTIC_LABELS.TOTAL_FOLIOS_MATCHING_KEYWORD;
  } else if (domain) {
    classification = CLASSIFICATIONS.EXACT_SUPPORTED;
    semantic_label = SEMANTIC_LABELS.CATEGORY_SUM;
  }

  const needsPeriod = classification !== CLASSIFICATIONS.BREAKDOWN_MISSING;
  if (needsPeriod && !months.length) {
    return {
      ok: false,
      domain,
      metric: metric || METRICS.SUM,
      period_mode,
      period_month,
      period_start,
      period_end,
      months: [],
      status,
      keyword,
      classification,
      semantic_label,
      folio_match_frame: folioMatch,
      code: "missing_period",
      error: "Indica el mes o el rango de meses. No invento el periodo.",
    };
  }

  return {
    ok: true,
    domain,
    metric: metric || (attributable ? METRICS.ATTRIBUTABLE_COMPONENT_COST : METRICS.SUM),
    period_mode,
    period_month: period_mode === "SINGLE" ? period_month : null,
    period_start: period_mode === "RANGE" ? period_start : null,
    period_end: period_mode === "RANGE" ? period_end : null,
    months,
    status,
    keyword,
    classification,
    semantic_label,
    folio_match_frame: folioMatch,
  };
}

function rowMatchesDomain(row, domain) {
  if (!domain) return true;
  return supportFamilyOf(row && row.categoria) === domain;
}

function rowMatchesStatus(row, status) {
  if (!status) return true;
  const current = String((row && row.estatus) || "")
    .trim()
    .toUpperCase();
  if (status === "PAGADO") return current === "PAGADO";
  if (status === "PENDIENTE") return current.includes("PENDIENTE");
  return current === status;
}

function rowMatchesKeyword(row, keyword) {
  if (!keyword) return true;
  const concept = runtime010.normalizeKeywordConcept(keyword);
  const aliases = runtime010.keywordAliases(concept);
  if (concept && aliases.length > 1) {
    return runtime010.rowMatchesKeywordConcept(row, concept);
  }
  const fields = [row && row.concepto, row && row.descripcion, row && row.subcategoria, row && row.beneficiario];
  return fields.some((field) => textMatchesSearch(field, keyword));
}

function rowMatchesPeriod(row, months) {
  const mes = String((row && row.mes_cargo) || "");
  return months.includes(mes);
}

function folioIdOf(row) {
  return (row && (row.numero_folio || row.folio_codigo)) || (row && row.id != null ? String(row.id) : null);
}

function aggregateRows(rows, spec) {
  const eligible = rows.filter((row) => !isCancelledStatus(row && row.estatus));
  const known = [];
  let unknownCount = 0;
  for (const row of eligible) {
    const amount = classifyImporte(row && row.importe);
    if (amount.kind === "KNOWN") known.push({ row, amount: amount.amount });
    else unknownCount += 1;
  }

  const sum = roundMoney(known.reduce((acc, item) => acc + item.amount, 0));
  const count = eligible.length;
  const avg = known.length ? roundMoney(sum / known.length) : null;
  let max = null;
  let min = null;
  for (const item of known) {
    if (!max || item.amount > max.amount) max = item;
    if (!min || item.amount < min.amount) min = item;
  }

  return {
    match_count: rows.length,
    eligible_count: count,
    known_count: known.length,
    unknown_count: unknownCount,
    sum,
    avg,
    max,
    min,
    metric: spec.metric,
  };
}

function notFoundAnswer(spec) {
  if (spec.domain === DOMAINS.TALLER) {
    return "No encontré folios de Taller con esos filtros.";
  }
  const category = domainLabel(spec.domain);
  if (category) return `No encontré folios de ${category} con esos filtros.`;
  if (spec.keyword) return `No encontré folios que coincidan con "${spec.keyword}" con esos filtros.`;
  return "No encontré folios con esos filtros.";
}

function missingImporteAnswer(spec) {
  if (spec.domain === DOMAINS.TALLER) {
    return "Encontré folios de Taller, pero no tienen importe registrado.";
  }
  return `${buildCategoryLead(spec)} no tienen importe registrado.`;
}

function resolveSumVerbalization(spec, analysis) {
  const eligible = Number((analysis && analysis.eligible_count) || 0);
  const known = Number((analysis && analysis.known_count) || 0);
  if (eligible === 0) {
    return { kind: "NOT_FOUND", text: notFoundAnswer(spec) };
  }
  if (known === 0) {
    return { kind: "UNKNOWN_AMOUNT", text: missingImporteAnswer(spec) };
  }
  return { kind: "SUM", amount: analysis.sum };
}

function buildCategoryLead(spec) {
  const period = formatPeriodLabel(spec);
  const category = domainLabel(spec.domain);
  const statusBit = spec.status ? ` ${spec.status}` : "";
  if (category && spec.keyword) {
    return `En ${period}, los folios${statusBit ? ` ${spec.status}` : ""} de categoría ${category} que coinciden con "${spec.keyword}"`;
  }
  if (category) {
    return `En ${period}, los folios${statusBit ? ` ${spec.status}` : ""} de categoría ${category}`;
  }
  if (spec.keyword) {
    return `Los folios${statusBit ? ` ${spec.status}` : ""} de ${period} que contienen "${spec.keyword}"`;
  }
  return `En ${period}, los folios${statusBit}`;
}

function buildExpenseAnalyticsAnswer(payload) {
  if (!payload) return "No pude resolver la consulta de gasto.";
  if (payload.clarification) return payload.clarification;
  if (payload.classification === CLASSIFICATIONS.BREAKDOWN_MISSING) {
    return exactCostMissingAnswer(payload.spec && payload.spec.keyword);
  }
  if (payload.ok === false) {
    return payload.error || "No pude consultar los folios.";
  }
  const spec = payload.spec || {};
  const analysis = payload.analysis || {};
  const lead = buildCategoryLead(spec);
  if (spec.metric === METRICS.COUNT) {
    const runtime009 = require("./director-ia-purchase-evidence-enrichment-009");
    const breakdown = runtime009.folioStatusBreakdown(payload.records || []);
    const q = runtime009.nq((payload.spec && payload.spec.question) || "");
    if (spec.domain === DOMAINS.TALLER && /\botros\s+estados\b/.test(q)) {
      return `${breakdown.other} en otros estados.`;
    }
    const extra =
      spec.domain === DOMAINS.TALLER && breakdown.total !== breakdown.paid + breakdown.pending
        ? `\n${runtime009.formatTallerStatusLines(breakdown).join("\n")}`
        : "";
    return `${lead} fueron ${analysis.eligible_count || 0}.${extra}`;
  }
  if (spec.metric === METRICS.AVG) {
    if (analysis.avg == null) {
      return `${lead} no tienen importe registrado. No invento el promedio.`;
    }
    return `${lead} tienen un promedio por folio de ${formatMxn(analysis.avg)}.`;
  }
  if (spec.metric === METRICS.MAX) {
    if (!analysis.max) {
      return `${lead} no tienen importe registrado. No invento el mayor gasto.`;
    }
    const folio = folioIdOf(analysis.max.row) || "folio no registrado";
    return `En ${formatPeriodLabel(spec)}, el folio de ${domainLabel(spec.domain) || "mayor importe"} más caro es ${folio} con ${formatMxn(analysis.max.amount)}.`;
  }
  if (spec.metric === METRICS.MIN) {
    if (!analysis.min) {
      return `${lead} no tienen importe registrado. No invento el menor gasto.`;
    }
    const folio = folioIdOf(analysis.min.row) || "folio no registrado";
    return `En ${formatPeriodLabel(spec)}, el folio de ${domainLabel(spec.domain) || "menor importe"} más barato es ${folio} con ${formatMxn(analysis.min.amount)}.`;
  }
  const sumState = resolveSumVerbalization(spec, analysis);
  if (sumState.kind === "NOT_FOUND" || sumState.kind === "UNKNOWN_AMOUNT") {
    return sumState.text;
  }
  const total = formatMxn(sumState.amount);
  if (spec.domain === DOMAINS.TALLER) {
    const runtime009 = require("./director-ia-purchase-evidence-enrichment-009");
    if (/\botros\s+estados\b/.test(runtime009.nq(spec.question || ""))) {
      const breakdown = runtime009.folioStatusBreakdown(payload.records || []);
      return `${breakdown.other} en otros estados.`;
    }
  }
  if (spec.domain === DOMAINS.TALLER && spec.metric === METRICS.SUM) {
    const extras = [];
    if (analysis.eligible_count) extras.push(`${analysis.eligible_count} folios`);
    const records = payload.records || [];
    if (records.length) {
      const runtime009 = require("./director-ia-purchase-evidence-enrichment-009");
      const breakdown = runtime009.folioStatusBreakdown(records);
      extras.push(...runtime009.formatTallerStatusLines(breakdown).slice(1));
      const concepts = [...new Set(records.map((r) => String(r.concepto || "").trim()).filter(Boolean))].slice(0, 3);
      if (concepts.length) extras.push(`principales conceptos: ${concepts.join(", ")}`);
    }
    if (analysis.unknown_count) {
      extras.push(`${analysis.unknown_count} folios no tienen importe registrado`);
    }
    return [
      `De ${formatPeriodLabel(spec)} se gastaron ${total} en Taller.`,
      `Los folios de la categoría Taller suman ${total}.`,
      extras.length ? extras.join("\n") : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (spec.semantic_label === SEMANTIC_LABELS.TOTAL_FOLIOS_MATCHING_KEYWORD || spec.keyword) {
    const runtime010 = require("./director-ia-executive-context-sales-entity-010");
    const concept = runtime010.normalizeKeywordConcept(spec.keyword);
    const period =
      spec.period_mode === "RANGE" && spec.period_start && spec.period_end
        ? `${spec.period_start} a ${spec.period_end}`
        : formatPeriodLabel(spec);
    const built = runtime010.buildKeywordExpenseAnswer({
      records: payload.records || [],
      concept,
      period_label: period,
      paidOnly: /\bpagad/.test(runtime010.nq(spec.question || "")),
    });
    return built.answer;
  }
  return `${lead} suman ${total}.`;
}

function buildExpenseAnalyticsChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const answer = buildExpenseAnalyticsAnswer(payload);
  const okPayload = payload && payload.ok === true;
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (payload && payload.classification === CLASSIFICATIONS.BREAKDOWN_MISSING) {
    veracity = DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED;
  } else if (!okPayload) {
    veracity =
      payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        ? DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED
        : DIRECTOR_IA_VERACITY.SOURCE_ERROR;
  } else if (payload.analysis && payload.analysis.eligible_count === 0) {
    veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  }
  return {
    ok: true,
    answer,
    sources: okPayload || (payload && payload.classification === CLASSIFICATIONS.BREAKDOWN_MISSING) ? [SOURCE] : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: "expense_analytics",
      openai_called: false,
      veracity,
      semantic_class: SEMANTIC_CLASS,
      classification: payload && payload.classification,
      semantic_label: payload && payload.spec ? payload.spec.semantic_label : null,
      domain: payload && payload.spec ? payload.spec.domain : null,
      metric: payload && payload.spec ? payload.spec.metric : null,
      keyword: payload && payload.spec ? payload.spec.keyword : null,
      period_mode: payload && payload.spec ? payload.spec.period_mode : null,
      period_month: payload && payload.spec ? payload.spec.period_month : null,
      period_start: payload && payload.spec ? payload.spec.period_start : null,
      period_end: payload && payload.spec ? payload.spec.period_end : null,
      planta_id,
      timestamp: new Date().toISOString(),
    },
    expense_analytics: payload || null,
  };
}

function sourceError(message, status = 500, extra = {}) {
  return {
    ok: false,
    code: extra.code || DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status,
    error: message || "Error de fuente de Expense Analytics",
    spec: extra.spec || null,
    classification: extra.classification || null,
    source: SOURCE,
    semantic_class: SEMANTIC_CLASS,
  };
}

async function loadExpenseAnalyticsForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question =
    opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const spec = extractExpenseAnalyticsSpec(question, {
    now: opts.now,
    inheritedDomain: opts.inheritedDomain,
    inheritedMetric: opts.inheritedMetric,
  });
  spec.question = question;

  if (spec.classification === CLASSIFICATIONS.BREAKDOWN_MISSING) {
    return {
      ok: true,
      spec,
      classification: CLASSIFICATIONS.BREAKDOWN_MISSING,
      analysis: null,
      records: [],
      planta_id: Number(plantaId),
      source: SOURCE,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  if (!spec.ok && spec.code === "missing_period") {
    return {
      ok: true,
      spec,
      classification: spec.classification,
      analysis: null,
      records: [],
      planta_id: Number(plantaId),
      source: SOURCE,
      semantic_class: SEMANTIC_CLASS,
      missing_period: true,
      clarification: "¿De qué mes o periodo?",
    };
  }

  if (!spec.ok) {
    return sourceError(spec.error, 400, { spec, code: spec.code, classification: spec.classification });
  }

  const queryFn = opts.queryPublicFolios || queryReviewableSupportFolios;
  const canSeeSoloZpAd = usuarioPermisos.authHasPermiso(auth, "acceso_ver_folios_solo_zp_ad");
  const months = spec.months.slice();

  async function run(client) {
    const rawAll = [];
    for (const mesCargo of months) {
      const part = await queryFn(client, Number(plantaId), mesCargo, {
        resolveEquivalentIds: opts.resolveEquivalentIds,
      });
      rawAll.push(...(part || []));
    }
    const scoped = rawAll.filter((row) => {
      if (row && row.solo_zp_ad && !canSeeSoloZpAd) return false;
      if (!rowMatchesPeriod(row, months)) return false;
      if (!rowMatchesDomain(row, spec.domain)) return false;
      if (!rowMatchesStatus(row, spec.status)) return false;
      if (!rowMatchesKeyword(row, spec.keyword)) return false;
      return true;
    });
    const analysis = aggregateRows(scoped, spec);
    return {
      ok: true,
      spec,
      classification: spec.classification,
      analysis,
      records: scoped,
      planta_id: Number(plantaId),
      source: SOURCE,
      semantic_class: SEMANTIC_CLASS,
    };
  }

  const injected = typeof opts.queryPublicFolios === "function";
  if (injected) {
    return run(null);
  }
  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Pool no configurado", 500, { spec });
  }
  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message, 500, { spec });
  } finally {
    client.release();
  }
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE,
  DOMAINS,
  METRICS,
  CLASSIFICATIONS,
  SEMANTIC_LABELS,
  EXCLUSIVE_COMPONENT_KEYWORDS,
  isExpenseAnalyticsQuestion,
  extractExpenseAnalyticsSpec,
  loadExpenseAnalyticsForChat,
  buildExpenseAnalyticsAnswer,
  buildExpenseAnalyticsChatResult,
  keywordLimitation,
  exactCostMissingAnswer,
};
