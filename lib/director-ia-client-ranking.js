"use strict";

/**
 * Director IA — CLIENT_RANKING.
 * Ranking comercial TOP/BOTTOM por VENTA_TON sobre arr.ventas_diarias_cliente.
 * Reutiliza queryMonthlySales / canalSqlFor / resolvePlantCodes. Solo lectura.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { queryMonthlySales, queryMonthlyDiscount } = require("./director-ia-client-profile");
const { resolvePlantCodes, canalSqlFor } = require("./commercial-trend-engine");
const { extractNamedPlant } = require("./director-ia-historical-margin");
const { extractPlantLabel, assertSehPlantaAccess } = require("./director-ia-seh-operation-status");
const { extractPeriodRange } = require("./director-ia-folio-search");

const SEMANTIC_CLASS = "client_ranking";
const SOURCE_TABLE = "arr.ventas_diarias_cliente";
const DISCOUNT_SOURCE_TABLES = Object.freeze([
  "arr.descuentos_diarios_cliente",
  "arr.ventas_diarias_cliente",
]);
const DISCOUNT_METRIC_CANONICAL = "DISCOUNT_PER_KG";

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

const NUMBER_WORDS = Object.freeze({
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
});

function normalizeText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function resolveNow(now) {
  const d = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function kgToTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / 1000) * 10) / 10;
}

function formatTon(ton) {
  if (ton == null) return "sin toneladas observadas";
  return `${ton.toFixed(1)} ton`;
}

function hasRankingCue(n) {
  return Boolean(
    /\btop\b/.test(n) ||
      /\bbottom\b/.test(n) ||
      /\branking\b/.test(n) ||
      /\bprincipales?\b/.test(n) ||
      /\bmayores?\b/.test(n) ||
      /\bmejores?\b/.test(n) ||
      /\blideran\b/.test(n) ||
      /\blidera\b/.test(n) ||
      /\blider\b/.test(n) ||
      /\bcompradores?\b/.test(n) ||
      /\bmayor\s+comprador\b/.test(n) ||
      /\blider\s+de\s+cada\s+canal\b/.test(n) ||
      /\bquien\s+vendio\s+mas\b/.test(n) ||
      /\bpor\s+canal\b/.test(n) ||
      /\bquien(es)?\s+compr[oó]\s+mas\b/.test(n) ||
      /\bquien(es)?\s+compro\s+menos\b/.test(n) ||
      /\bcompr[oó]\s+menos\b/.test(n) ||
      /\bvendio\s+menos\b/.test(n) ||
      /\bquien\s+compro\s+mas\b/.test(n) ||
      /\bcliente\s+compro\s+mas\b/.test(n) ||
      /\bcompro\s+mas\b/.test(n) ||
      /\bquien\s+compra\s+mas\b/.test(n) ||
      /\bcompra\s+mas\b/.test(n) ||
      /\bcompran\s+mas\b/.test(n) ||
      /\bquienes\s+compran\s+mas\b/.test(n) ||
      /\bquienes\s+mas\s+compran\b/.test(n) ||
      /\bmas\s+compran\b/.test(n) ||
      /\bvenden\s+mas\b/.test(n) ||
      /\bmas\s+compraron\b/.test(n) ||
      /\bcompraron\s+mas\b/.test(n) ||
      /\bmas\s+compra\b/.test(n) ||
      /\bpor\s+compra\b/.test(n) ||
      /\bpor\s+toneladas\b/.test(n) ||
      /\blos\s+que\s+mas\s+compran\b/.test(n) ||
      /\bencabezan\b/.test(n) ||
      /\borden/.test(n) && (/\bcompra/.test(n) || /\bventa/.test(n) || /\bdescuento/.test(n)) ||
      /\bordenad[oa]s?\s+por\s+venta\b/.test(n) ||
      /\bmayor\s+venta\b/.test(n) ||
      /\bmas\s+venta\b/.test(n) ||
      /\bmayor\s+compra\b/.test(n) ||
      /\bmas\s+toneladas\b/.test(n) ||
      /\bordenad[oa]s?\s+por\s+toneladas\b/.test(n) ||
      /\bclientes?\s+con\s+mayor\s+venta\b/.test(n) ||
      /\bclientes?\s+con\s+mas\s+toneladas\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bel\s+primero\b/.test(n) ||
      /\bdescuento/.test(n) && (/\btop\b/.test(n) || /\bmayor/.test(n) || /\bmenor/.test(n) || /\bquien/.test(n))
  );
}

function hasClientSalesCue(n) {
  return Boolean(
    /\bclientes?\b/.test(n) ||
      /\bcomprador(?:es)?\b/.test(n) ||
      /\bventa\s+casa\b/.test(n) ||
      /\bventa\s+comisionista\b/.test(n) ||
      /\bcomisionistas?\b/.test(n) ||
      /\bcasa\b/.test(n) ||
      /\bcanal(?:es)?\b/.test(n) ||
      /\bdescuento/.test(n) ||
      /\bquien(?:es)?\s+(?:compra|compran|compro|compraron)\b/.test(n) ||
      /\bquien(?:es)?\s+mas\s+(?:compra|compran|compro|compraron)\b/.test(n) ||
      /\bcomercial\b/.test(n) ||
      (/\bventa\b/.test(n) && (/\branking\b/.test(n) || /\btop\b/.test(n) || /\bmayor\b/.test(n) || /\bencabezan\b/.test(n) || /\blider/.test(n))) ||
      /\btoneladas\b/.test(n) ||
      /\bcompran\b/.test(n) ||
      /\bcompras\b/.test(n) ||
      (/\btop\b/.test(n) && !isClientRankingDomainConflict(n))
  );
}

function isClientRankingDomainConflict(n) {
  return Boolean(
    (/\babre\b/.test(n) && !/\bclientes?\b/.test(n) && !/\bcomprador/.test(n)) ||
    /\b(folios?|apoyos?)\b/.test(n) ||
      /\b(gasto|gastos|gaste|gastamos|gastado)\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      /\bbitacora\b/.test(n) ||
      /\bcomo\s+vamos\b/.test(n) ||
      /\bestaciones?\b/.test(n) ||
      /\bextintor/.test(n)
  );
}

function isClientRankingQuestion(question) {
  const n = normalizeText(question);
  if (!n || isClientRankingDomainConflict(n)) return false;
  if (require("./director-ia-executive-backlog").isClientMovementQuestion(question)) return false;
  if (require("./director-ia-executive-coverage").isOpenPronosticoQuestion(question)) return false;
  const trend = require("./director-ia-commercial-trend");
  if (typeof trend.isLargestSalesLossQuestion === "function" && trend.isLargestSalesLossQuestion(question)) {
    return false;
  }
  if (/\bcomo\s+vamos\s+con\s+clientes\b/.test(n) && !hasRankingCue(n)) return false;
  if (/\bcuanto\s+vendimos\b/.test(n) && !hasRankingCue(n)) return false;
  return hasRankingCue(n) && hasClientSalesCue(n);
}

function isClientRankingFollowUp(question) {
  const n = normalizeText(question);
  if (!n) return false;
  if (require("./director-ia-executive-backlog").isIndividualDiscountLookupQuestion(question)) return false;
  if (isClientRankingDomainConflict(n) && !/\b(acciones?|comentarios?)\b/.test(n)) return false;
  return Boolean(
    /\bcuanto\s+compro\s+el\s+(primero|segundo|tercero)\b/.test(n) ||
      /\by\s+el\s+(segundo|tercero|primero)\b/.test(n) ||
      /\bquien\s+fue\s+el\s+numero\s+uno\b/.test(n) ||
      /\bahora\s+dame\s+top\b/.test(n) ||
      /\by\s+solo\s+los\s+de\b/.test(n) ||
      /\by\s+comisionistas?\b/.test(n) ||
      /\bcual\s+vendio\s+menos\b/.test(n) ||
      /\bque\s+descuento\s+tuvo\b/.test(n) ||
      /\bcontra\s+el\s+mes\s+pasado\b/.test(n) ||
      /\bquien\s+quedo\s+tercero\b/.test(n) ||
      /\bquien\s+quedo\s+segundo\b/.test(n) ||
      /\bquedo\s+(primero|segundo|tercero)\b/.test(n) ||
      /\bel\s+primero\b/.test(n) ||
      /\bnumero\s+uno\b/.test(n) ||
      /\bcuanto\s+disminuy/.test(n) ||
      /\bcompraban\b/.test(n) ||
      /\bcomparalos\b/.test(n) ||
      /\bcompar/.test(n) ||
      /\bcual\s+cayo\s+mas\b/.test(n) ||
      /\bbajaron\b/.test(n) ||
      /\bdescuento/.test(n) ||
      /\bcomentarios?\b/.test(n) ||
      /\bacciones?\b/.test(n) ||
      require("./director-ia-pending-completion").isPeriodOnlyAnswer(question) ||
      /\bsolo\s+casa\b/.test(n) ||
      /\bsolo\s+los\s+de\s+(casa|comisionistas?)\b/.test(n) ||
      /\bsolo\s+comisionistas?\b/.test(n) ||
      /\bahora\s+(los\s+de\s+)?comisionistas?\b/.test(n) ||
      /\bahora\s+top\s+\d+\b/.test(n) ||
      /\btop\s+\d+\b/.test(n) ||
      /\bcompara\b/.test(n) ||
      /\bcontra\s+(agosto|septiembre|el\s+mes\s+pasado)\b/.test(n) ||
      /\b(y\s+en|ahora)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(n) ||
      /\b(este mes|mes actual|mes pasado)\b/.test(n) ||
      /\by\s+de\b/.test(n) ||
      /\bahora\s+solo\b/.test(n)
  );
}

function extractLimit(n, prior) {
  const digit = n.match(/\btop\s+(\d{1,2})\b/) || n.match(/\blos\s+(\d{1,2})\s+clientes\b/) || n.match(/\b(\d{1,2})\s+clientes\b/);
  if (digit) {
    const v = Number(digit[1]);
    if (v >= 1 && v <= 20) return v;
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\s+clientes\\b`).test(n) || new RegExp(`\\btop\\s+${word}\\b`).test(n)) {
      return value;
    }
  }
  if (/\bnumero\s+uno\b/.test(n) || /\bel\s+primero\b/.test(n) && !/\btop\b/.test(n)) return prior && prior.limit ? prior.limit : 1;
  if (
    /\bdescuento/.test(n) &&
    !/\bclientes\b/.test(n) &&
    !/\btop\b/.test(n) &&
    (/\bquien\s+(tiene|tuvo|recibe)\b/.test(n) || /\bque\s+cliente\s+(tiene|tuvo|recibe)\b/.test(n))
  ) {
    return 1;
  }
  return prior && prior.limit ? prior.limit : 5;
}

function extractDirection(n, prior) {
  if (/\bmenos\b/.test(n) || /\bbottom\b/.test(n) || /\bpeores\b/.test(n)) return "BOTTOM";
  if (hasRankingCue(n) || !prior) return "TOP";
  return prior.ranking_direction || "TOP";
}

function extractSegment(n, prior) {
  const hasCasa = /\bcasa\b/.test(n) || /\bventa\s+casa\b/.test(n);
  const hasCom = /\bcomisionistas?\b/.test(n) || /\bventa\s+comisionista\b/.test(n);
  if (hasCasa && hasCom) return "DUAL";
  if (hasCom) return "COMISIONISTA";
  if (hasCasa) return "CASA";
  if (prior && prior.customer_segment) return prior.customer_segment;
  return "ALL";
}

function isOpenCalendarMonth(period, now) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return false;
  const cur = resolveNow(now);
  return period === `${cur.year}-${pad2(cur.month)}`;
}

function previousYearMonth(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  let year = Number(period.slice(0, 4));
  let month = Number(period.slice(5, 7)) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${pad2(month)}`;
}

function nextYearMonth(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  let year = Number(period.slice(0, 4));
  let month = Number(period.slice(5, 7)) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${pad2(month)}`;
}

function yearMonthsInclusive(startYm, endYm) {
  const out = [];
  let cur = startYm;
  while (cur && endYm && cur <= endYm) {
    out.push(cur);
    cur = nextYearMonth(cur);
    if (out.length > 24) break;
  }
  return out;
}

function arrUiDiscountPerKg(monto, kg) {
  const k = Number(kg || 0);
  const m = Number(monto || 0);
  if (!(k > 0) || !Number.isFinite(m)) return null;
  return Math.abs(m) / k;
}

function formatDescKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "sin descuento por kg";
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`;
}

function rowMatchesCanal(categoria, canalFilter) {
  const n = String(categoria || "Casa").toLowerCase();
  if (canalFilter === "casa") return !n.includes("comisionista");
  if (canalFilter === "comisionista") return n.includes("comisionista");
  return true;
}

function walkBackYearMonths(period, maxSteps = 12) {
  const out = [];
  let cur = period;
  for (let i = 0; i < maxSteps; i += 1) {
    cur = previousYearMonth(cur);
    if (!cur) break;
    out.push(cur);
  }
  return out;
}

const MONTH_LABELS_ES = Object.freeze({
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  "10": "octubre",
  "11": "noviembre",
  "12": "diciembre",
});

function formatMonthLabel(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || "ese periodo";
  const name = MONTH_LABELS_ES[period.slice(5, 7)];
  return name ? `${name} de ${period.slice(0, 4)}` : period;
}

function periodBounds(period) {
  const [y, m] = String(period || "").split("-").map(Number);
  if (!y || !m) return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { startStr: `${period}-01`, endStr: `${period}-${pad2(lastDay)}` };
}

function extractPeriodYm(n, now, prior, selectedPeriod) {
  const frame = extractRankingPeriod(n, now, prior, selectedPeriod);
  if (frame && frame.invalid_range) return null;
  if (frame && frame.period_kind === "RANGE") return null;
  if (frame && frame.period) return frame.period;
  return null;
}

function monthNameAlt() {
  return Object.keys(MONTHS_ES)
    .slice()
    .sort((a, b) => b.length - a.length)
    .join("|");
}

function yearFromHits(startYearHit, endYearHit, now) {
  const nowYear = String(resolveNow(now).year);
  const shared = startYearHit || endYearHit || nowYear;
  return { startYear: startYearHit || shared, endYear: endYearHit || shared };
}

function extractHastaMonthPair(n, now) {
  const point = `(${monthNameAlt()})(?:\\s+(?:de\\s+)?(20\\d{2}))?`;
  const hit = n.match(new RegExp(`\\b${point}\\s+hasta\\s+${point}\\b`));
  if (!hit) return null;
  const years = yearFromHits(hit[2], hit[4], now);
  const period_start = `${years.startYear}-${MONTHS_ES[hit[1]]}`;
  const period_end = `${years.endYear}-${MONTHS_ES[hit[3]]}`;
  return { period_start, period_end };
}

function rangeFrameFromBounds(period_start, period_end) {
  if (!period_start || !period_end) return null;
  if (period_start > period_end) {
    return {
      ok: false,
      invalid_range: true,
      period_kind: "RANGE",
      period: null,
      period_start,
      period_end,
    };
  }
  if (period_start === period_end) {
    return { ok: true, period_kind: "SINGLE", period: period_start, period_start: null, period_end: null };
  }
  return { ok: true, period_kind: "RANGE", period: null, period_start, period_end };
}

function extractExplicitRange(n, now) {
  const extracted = extractPeriodRange(n, now);
  if (extracted && extracted.ok === false && extracted.code === "inverted_range") {
    return {
      ok: false,
      invalid_range: true,
      period_kind: "RANGE",
      period: null,
      period_start: extracted.period_start,
      period_end: extracted.period_end,
    };
  }
  if (extracted && extracted.ok !== false && extracted.period_start && extracted.period_end) {
    return rangeFrameFromBounds(extracted.period_start, extracted.period_end);
  }
  const hasta = extractHastaMonthPair(n, now);
  if (hasta) return rangeFrameFromBounds(hasta.period_start, hasta.period_end);
  return null;
}

function extractSingleMonthYm(n, now) {
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(n)) {
      const yearM = n.match(/\b(20\d{2})\b/);
      const year = yearM ? yearM[1] : String(resolveNow(now).year);
      return `${year}-${mm}`;
    }
  }
  if (/\b(este mes|mes actual)\b/.test(n)) {
    const cur = resolveNow(now);
    return `${cur.year}-${pad2(cur.month)}`;
  }
  if (/\bmes\s+pasado\b/.test(n) && !/\bcontra\b/.test(n)) {
    const cur = resolveNow(now);
    return previousYearMonth(`${cur.year}-${pad2(cur.month)}`);
  }
  return null;
}

function extractRankingPeriod(n, now, prior, selectedPeriod) {
  const explicitRange = extractExplicitRange(n, now);
  if (explicitRange) return explicitRange;
  const single = extractSingleMonthYm(n, now);
  if (single) {
    return { ok: true, period_kind: "SINGLE", period: single, period_start: null, period_end: null };
  }
  if (prior && prior.period_kind === "RANGE" && prior.period_start && prior.period_end) {
    return {
      ok: true,
      period_kind: "RANGE",
      period: null,
      period_start: prior.period_start,
      period_end: prior.period_end,
    };
  }
  if (prior && prior.period && /^\d{4}-\d{2}$/.test(prior.period)) {
    return { ok: true, period_kind: "SINGLE", period: prior.period, period_start: null, period_end: null };
  }
  if (selectedPeriod && /^\d{4}-\d{2}$/.test(selectedPeriod)) {
    return { ok: true, period_kind: "SINGLE", period: selectedPeriod, period_start: null, period_end: null };
  }
  return { ok: false, period_kind: null, period: null, period_start: null, period_end: null };
}

function hasPeriod(spec) {
  if (!spec) return false;
  if (spec.invalid_range) return false;
  if (spec.period_kind === "RANGE" && spec.period_start && spec.period_end) return true;
  return Boolean(spec.period && /^\d{4}-\d{2}$/.test(spec.period));
}

function formatRangeLabel(start, end) {
  if (!start || !end) return "ese periodo";
  const a = MONTH_LABELS_ES[start.slice(5, 7)] || start;
  const b = MONTH_LABELS_ES[end.slice(5, 7)] || end;
  const ys = start.slice(0, 4);
  const ye = end.slice(0, 4);
  if (ys === ye) return `de ${a} a ${b} de ${ys}`;
  return `de ${a} de ${ys} a ${b} de ${ye}`;
}

function formatPeriodHuman(spec) {
  if (!spec) return "ese periodo";
  if (spec.period_kind === "RANGE" && spec.period_start && spec.period_end) {
    return formatRangeLabel(spec.period_start, spec.period_end);
  }
  return formatMonthLabel(spec.period);
}

function queryBoundsForSpec(spec) {
  if (spec && spec.period_kind === "RANGE" && spec.period_start && spec.period_end) {
    const startB = periodBounds(spec.period_start);
    const endB = periodBounds(spec.period_end);
    if (!startB || !endB) return null;
    return { startStr: startB.startStr, endStr: endB.endStr };
  }
  return spec && spec.period ? periodBounds(spec.period) : null;
}

function extractOrdinalIndex(n) {
  if (/\b(primero|numero\s+uno|1)\b/.test(n) && !/\btop\s+1\b/.test(n) || /\bel\s+primero\b/.test(n) || /\bnumero\s+uno\b/.test(n)) {
    if (/\bsegundo\b/.test(n)) return 2;
    if (/\btercero\b/.test(n)) return 3;
    return 1;
  }
  if (/\bsegundo\b/.test(n)) return 2;
  if (/\btercero\b/.test(n)) return 3;
  return null;
}

function extractClientRankingSpec(question, prior, opts = {}) {
  const n = normalizeText(question);
  const usable = prior && prior.ok ? prior : null;
  const follow = Boolean(usable && isClientRankingFollowUp(question));
  if (
    !isClientRankingQuestion(question) &&
    !follow &&
    !require("./director-ia-executive-backlog").isClientDiscountRankingQuestion(question)
  ) {
    return { ok: false };
  }
  const plant_label = extractNamedPlant(question) || extractPlantLabel(question) || (follow && usable ? usable.plant_label : null);
  const periodFrame = extractRankingPeriod(n, opts.now, usable, opts.selectedPeriod);
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    ranking_direction: extractDirection(n, usable),
    limit: extractLimit(n, usable),
    customer_segment: extractSegment(n, usable),
    metric:
      /\bdescuento/.test(n)
        ? "DISCOUNT"
        : usable && usable.metric === "DISCOUNT" && !/\b(compra|venta|tonelada)/.test(n)
          ? "DISCOUNT"
          : "VENTA_TON",
    plant_label,
    period: periodFrame.period || null,
    period_kind: periodFrame.period_kind || (periodFrame.period ? "SINGLE" : null),
    period_start: periodFrame.period_start || null,
    period_end: periodFrame.period_end || null,
    invalid_range: Boolean(periodFrame.invalid_range),
    ordinal: extractOrdinalIndex(n),
    wants_discount: /\bdescuento\b/.test(n),
    wants_prior_month: /\bmes\s+pasado\b/.test(n),
    discount_metric:
      /\bdescuento/.test(n) || (usable && usable.metric === "DISCOUNT")
        ? DISCOUNT_METRIC_CANONICAL
        : null,
    follow,
  };
}

function canalFilterForSegment(segment) {
  if (segment === "CASA") return "casa";
  if (segment === "COMISIONISTA") return "comisionista";
  return "ambos";
}

function rankByDiscount(rows, spec) {
  const perKg = (spec && spec.discount_metric ? spec.discount_metric : DISCOUNT_METRIC_CANONICAL) === DISCOUNT_METRIC_CANONICAL;
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && (row.cliente_norm || row.cliente)) || "").trim();
    if (!name) continue;
    const monto = Number(row.monto);
    const kg = Number(row.kg);
    const prev = map.get(name) || {
      cliente: name,
      monto: 0,
      kg: 0,
      canal: row.canal || row.categoria || null,
    };
    if (Number.isFinite(monto)) prev.monto += monto;
    if (Number.isFinite(kg)) prev.kg += kg;
    map.set(name, prev);
  }
  let list = [...map.values()].map((item) => ({
    cliente: item.cliente,
    monto: item.monto,
    kg: item.kg,
    desc_kg: arrUiDiscountPerKg(item.monto, item.kg),
    venta_ton: 0,
    canal: item.canal,
  }));
  const low = spec && (spec.ranking_direction === "BOTTOM" || spec.direction === "LOW");
  if (perKg) {
    list = list.filter((item) => item.desc_kg != null && Number.isFinite(item.desc_kg));
    list.sort((a, b) => (low ? a.desc_kg - b.desc_kg : b.desc_kg - a.desc_kg));
  } else {
    list = list.filter((item) => Number.isFinite(item.monto));
    list.sort((a, b) => (low ? a.monto - b.monto : b.monto - a.monto));
  }
  return list.slice(0, spec.limit || 5);
}

function discountEmptyKind(rows) {
  const list = rows || [];
  const hasMonto = list.some((row) => Number.isFinite(Number(row && row.monto)) && Number(row.monto) !== 0);
  const hasKg = list.some((row) => Number(row && row.kg) > 0);
  if (hasMonto && !hasKg) return "INSUFFICIENT_KG";
  return "NO_DISCOUNT_ROWS";
}

function rankClients(rows, spec) {
  const map = new Map();
  for (const row of rows || []) {
    const name = String((row && row.cliente_norm) || "").trim();
    if (!name) continue;
    const kg = Number(row.kg);
    if (!Number.isFinite(kg)) continue;
    const prev = map.get(name) || { cliente: name, kg: 0, canal: row.canal || null };
    prev.kg += kg;
    map.set(name, prev);
  }
  const list = [...map.values()].map((item) => ({
    cliente: item.cliente,
    kg: item.kg,
    venta_ton: kgToTon(item.kg),
    canal: item.canal,
  }));
  list.sort((a, b) => (spec.ranking_direction === "BOTTOM" ? a.kg - b.kg : b.kg - a.kg));
  return list.slice(0, spec.limit || 5);
}

function buildClientRankingAnswer(payload) {
  if (!payload) return "No pude consultar el ranking de clientes.";
  if (payload.clarification) return payload.clarification;
  if (payload.ok === false) return payload.error || "No pude consultar el ranking de clientes.";
  const spec = payload.spec || {};
  const ranked = payload.ranked || [];
  const aggregateDiscount = spec.metric === "DISCOUNT";
  if (spec.wants_discount && !aggregateDiscount && spec.ordinal && payload.discount_available !== true) {
    return "No tengo evidencia de descuento para ese cliente en el periodo consultado. No invento el valor.";
  }
  if (spec.ordinal) {
    const hit = ranked[spec.ordinal - 1];
    if (!hit) return `No hay un cliente en la posición ${spec.ordinal} del ranking actual.`;
    if (spec.wants_discount) {
      return `${hit.cliente} tuvo descuento observado de ${payload.discount_label}.`;
    }
    return `${spec.ordinal === 1 ? "El primero" : spec.ordinal === 2 ? "El segundo" : "El tercero"} es ${hit.cliente} con ${formatTon(hit.venta_ton)}.`;
  }
  if (payload.data_semantics === "LAST_SAFE_CUT" && ranked.length) {
    const asked = payload.asked_period || spec.period;
    const lines = ranked.map((row, i) =>
      spec.metric === "DISCOUNT"
        ? `${i + 1}. ${row.cliente} — ${formatDescKg(row.desc_kg)}`
        : `${i + 1}. ${row.cliente} — ${formatTon(row.venta_ton)}`
    );
    if (aggregateDiscount) {
      return [
        `No tengo descuentos observados en ${formatMonthLabel(asked)}.`,
        `El último periodo con descuentos registrados es ${formatMonthLabel(spec.period)}:`,
        ...lines,
      ].join("\n");
    }
    return [
      `No tengo datos observados por cliente cargados para ${formatMonthLabel(asked)}.`,
      `El último ranking disponible es ${formatMonthLabel(spec.period)}:`,
      ...lines,
    ].join("\n");
  }
  if (!ranked.length) {
    if (aggregateDiscount) {
      const insufficient = payload.discount_empty_kind === "INSUFFICIENT_KG";
      if (insufficient) {
        return spec.period_kind === "RANGE"
          ? `No tengo datos suficientes para calcular descuento por kg por cliente ${formatPeriodHuman(spec)}.`
          : `No tengo datos suficientes para calcular descuento por kg por cliente en ${formatMonthLabel(spec.period)}.`;
      }
      return spec.period_kind === "RANGE"
        ? `No tengo descuentos observados por cliente ${formatPeriodHuman(spec)}.`
        : `No tengo descuentos observados por cliente para ${formatMonthLabel(spec.period)}.`;
    }
    return `No tengo datos observados por cliente cargados para ${formatMonthLabel(spec.period)}. El ARR visible puede mostrar una proyección de planta, pero no tengo una proyección contractual distribuida por cliente.`;
  }
  const open =
    spec.period_kind === "RANGE"
      ? isOpenCalendarMonth(spec.period_end, payload.now)
      : isOpenCalendarMonth(spec.period, payload.now);
  const discountDir = spec.ranking_direction === "BOTTOM" ? "menor" : "mayor";
  let title;
  if (aggregateDiscount && spec.period_kind === "RANGE") {
    title =
      ranked.length === 1
        ? `${formatPeriodHuman(spec).replace(/^de /, "De ")}, el cliente con ${discountDir} descuento por kg observado es:`
        : `Clientes con ${discountDir} descuento por kg observado ${formatPeriodHuman(spec)}:`;
  } else if (aggregateDiscount) {
    title =
      ranked.length === 1
        ? `En ${formatMonthLabel(spec.period)}, el cliente con ${discountDir} descuento por kg observado${open ? " — mes aún abierto, no es cierre" : ""} es:`
        : `En ${formatMonthLabel(spec.period)}, los clientes con ${discountDir} descuento por kg observado${open ? " — mes aún abierto, no es cierre" : ""}:`;
  } else {
    title = `Top ${ranked.length} clientes por compra observada en ${formatMonthLabel(spec.period)}${open ? " (mes aún abierto; no es el cierre)" : ""}:`;
  }
  const factor = Number(payload.uniform_projection_factor);
  const uniformNote =
    open && !aggregateDiscount && Number.isFinite(factor) && factor > 0
      ? "El orden del ranking observado no cambia si se aplica el mismo factor de proyección de planta a todos los clientes."
      : null;
  const lines = ranked.map((row, i) => {
    if (aggregateDiscount) {
      return `${i + 1}. ${row.cliente} — ${formatDescKg(row.desc_kg)}`;
    }
    const projected =
      uniformNote && Number.isFinite(Number(row.venta_ton))
        ? `; estimación proyectada ${formatTon(Math.round(row.venta_ton * factor * 10) / 10)}`
        : "";
    return `${i + 1}. ${row.cliente} — ${formatTon(row.venta_ton)}${projected}`;
  });
  return [title, uniformNote, ...lines].filter(Boolean).join("\n");
}

async function resolveArrPlantCodeForDiscount(opts, pool, plantLabel) {
  if (opts.arrPlantCode) return String(opts.arrPlantCode).trim();
  const db = opts.db || pool;
  if (typeof opts.resolveArrPlantCode === "function") {
    const hit = await opts.resolveArrPlantCode(db, plantLabel);
    if (hit) return String(hit).trim();
  }
  if (db && typeof db.query === "function") {
    try {
      const { resolveArrClientesMesPlantCode } = require("./dashboard-arr-forecast");
      const hit = await resolveArrClientesMesPlantCode(db, plantLabel);
      if (hit) return String(hit).trim();
    } catch (_e) {
      /* fall through to resolvePlantCodes.plantCode */
    }
  }
  const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
  const resolved = await resolveCodes(db, plantLabel);
  return (resolved && (resolved.plantCode || (resolved.uniqueCodes && resolved.uniqueCodes[0]))) || "";
}

async function queryDiscountPerKgViaArrUi(opts, pool, spec, plantLabel, canalFilter) {
  const compute = opts.computeClientesDescuentoMes || require("./dashboard-arr-forecast").computeClientesDescuentoMes;
  const plantCode = await resolveArrPlantCodeForDiscount(opts, pool, plantLabel);
  if (!plantCode) return [];
  const months =
    spec.period_kind === "RANGE"
      ? yearMonthsInclusive(spec.period_start, spec.period_end)
      : spec.period
        ? [spec.period]
        : [];
  const acc = new Map();
  for (const ym of months) {
    const year = Number(String(ym).slice(0, 4));
    const month = Number(String(ym).slice(5, 7));
    if (!year || !month) continue;
    const resp = await compute(opts.db || pool, year, month, plantCode, { historico: true });
    for (const r of (resp && resp.rows) || []) {
      if (!rowMatchesCanal(r.categoria, canalFilter)) continue;
      const name = String(r.cliente || "").trim();
      if (!name) continue;
      const prev = acc.get(name) || { cliente_norm: name, kg: 0, monto: 0, canal: r.categoria || "Casa" };
      prev.kg += Number(r.kg) || 0;
      prev.monto += Number(r.monto) || 0;
      acc.set(name, prev);
    }
  }
  return [...acc.values()];
}

async function loadClientRankingForChat(pool, plantaId, req, opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  const question = opts.question || "";
  const prior = opts.priorSpec && opts.priorSpec.ok ? opts.priorSpec : null;
  let spec = extractClientRankingSpec(question, prior, {
    now,
    selectedPeriod: opts.selectedPeriod,
  });
  const nQuestion = normalizeText(question);
  const purchaseFollow =
    /\b(compro|compran|compra|venta|toneladas)\b/.test(nQuestion) && !/\bdescuento/.test(nQuestion);
  if ((opts.forceDiscount || (prior && prior.metric === "DISCOUNT")) && !purchaseFollow) {
    const backlog = require("./director-ia-executive-backlog");
    const disc = backlog.extractClientDiscountRankingSpec(question, prior);
    if (disc.ok || spec.ok) {
      const periodFrame = extractRankingPeriod(nQuestion, now, prior, opts.selectedPeriod);
      spec = {
        ok: true,
        ranking_direction:
          disc.ok && disc.direction === "LOW" ? "BOTTOM" : spec.ok ? spec.ranking_direction : "TOP",
        limit: disc.ok ? disc.limit : spec.limit || 5,
        customer_segment: spec.ok ? spec.customer_segment : disc.channel || "ALL",
        metric: "DISCOUNT",
        discount_metric: DISCOUNT_METRIC_CANONICAL,
        plant_label: (spec && spec.plant_label) || (disc && disc.plant) || (prior && prior.plant_label) || null,
        period: spec.ok && spec.period ? spec.period : periodFrame.period,
        period_kind: spec.period_kind || periodFrame.period_kind,
        period_start: spec.period_start || periodFrame.period_start,
        period_end: spec.period_end || periodFrame.period_end,
        invalid_range: Boolean(spec.invalid_range || periodFrame.invalid_range),
        wants_discount: false,
        plant_id: spec.plant_id || (prior && prior.plant_id) || null,
      };
    }
  }
  if (!spec.ok) {
    return { ok: false, error: "No pude determinar el ranking de clientes.", spec, now };
  }
  if (spec.invalid_range) {
    return {
      ok: true,
      clarification: `El rango empieza en ${formatMonthLabel(spec.period_start)} y termina en ${formatMonthLabel(spec.period_end)}. No lo invierto. Indica un periodo válido.`,
      spec,
      now,
      ranked: [],
      question,
    };
  }
  if (!hasPeriod(spec)) {
    return {
      ok: true,
      clarification:
        spec.metric === "DISCOUNT"
          ? "¿De qué mes o periodo quieres comparar los descuentos?"
          : "¿De qué mes o periodo quieres el ranking?",
      spec,
      now,
      ranked: [],
      question,
    };
  }
  const selectedId = Number(plantaId);
  let plantIdToUse = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
  let plantLabel = spec.plant_label || opts.plant_label || null;
  if (spec.plant_label && typeof opts.resolvePlantByNombre === "function") {
    const row = await opts.resolvePlantByNombre(opts.db || pool, spec.plant_label);
    if (!row || !Number(row.id)) {
      return {
        ok: true,
        clarification: `No pude resolver la planta "${spec.plant_label}". No consulto otra planta.`,
        spec,
        now,
        ranked: [],
      };
    }
    plantIdToUse = Number(row.id);
    plantLabel = row.nombre || spec.plant_label;
  } else if (spec.plant_label && opts.plantCatalog) {
    const n = normalizeText(spec.plant_label);
    const row = (opts.plantCatalog || []).find(
      (p) => normalizeText(p.nombre || p.label) === n || (p.keys || []).map(normalizeText).includes(n)
    );
    if (!row) {
      return {
        ok: true,
        clarification: `No pude resolver la planta "${spec.plant_label}". No consulto otra planta.`,
        spec,
        now,
        ranked: [],
      };
    }
    plantIdToUse = Number(row.id);
    plantLabel = row.nombre || row.label || spec.plant_label;
  }
  if (!plantIdToUse) {
    return {
      ok: true,
      clarification: "¿De qué planta quieres el ranking de clientes?",
      spec,
      now,
      ranked: [],
    };
  }
  spec.plant_id = plantIdToUse;
  spec.plant_label = plantLabel;
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertSehPlantaAccess(auth, plantIdToUse);
  if (!denied.ok) return { ...denied, spec, now };

  const bounds = queryBoundsForSpec(spec);
  if (!bounds) {
    return {
      ok: true,
      clarification:
        spec.metric === "DISCOUNT"
          ? "¿De qué mes o periodo quieres comparar los descuentos?"
          : "¿De qué mes o periodo quieres el ranking?",
      spec,
      now,
      ranked: [],
      question,
    };
  }
  const startStr = bounds.startStr;
  const endStr = bounds.endStr;
  const canalFilter = canalFilterForSegment(spec.customer_segment);

  let rows = [];
  try {
    if (spec.metric === "DISCOUNT" && Array.isArray(opts.discountRows)) {
      rows = opts.discountRows;
    } else if (Array.isArray(opts.salesRows) && spec.metric !== "DISCOUNT") {
      rows = opts.salesRows;
    } else if (spec.metric === "DISCOUNT") {
      rows = await queryDiscountPerKgViaArrUi(opts, pool, spec, plantLabel || spec.plant_label, canalFilter);
    } else {
      const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
      const qSales = opts.queryMonthlySales || queryMonthlySales;
      let codes = opts.plantCodes;
      if (!codes) {
        const plantName = plantLabel || spec.plant_label;
        const resolved = await resolveCodes(opts.db || pool, plantName);
        codes = resolved && resolved.uniqueCodes;
      }
      if (!codes || !codes.length) {
        return {
          ok: false,
          status: 400,
          code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
          error: "No pude resolver el código ARR de la planta. No invento clientes.",
          spec,
          now,
        };
      }
      const result = await qSales(opts.db || pool, codes, startStr, endStr, canalFilter);
      rows = (result && result.rows) || result || [];
    }
    if (spec.metric === "DISCOUNT" && canalFilter !== "ambos") {
      rows = (rows || []).filter((r) => rowMatchesCanal((r && (r.canal || r.categoria)) || "Casa", canalFilter));
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      error: e && e.message ? e.message : "No se pudo leer arr.ventas_diarias_cliente",
      spec,
      now,
    };
  }

  let ranked = spec.metric === "DISCOUNT" ? rankByDiscount(rows, spec) : rankClients(rows, spec);
  const openAsked =
    spec.period_kind === "RANGE"
      ? isOpenCalendarMonth(spec.period_end, now)
      : isOpenCalendarMonth(spec.period, now);
  let data_semantics = openAsked
    ? ranked.length
      ? "OBSERVED_PARTIAL"
      : "NO_ROWS_OBSERVED"
    : ranked.length
      ? "OBSERVED_CLOSED"
      : "NO_ROWS_OBSERVED";
  const asked_period = spec.period_kind === "RANGE" ? `${spec.period_start}..${spec.period_end}` : spec.period;
  if (!ranked.length && spec.period_kind !== "RANGE") {
    const byPeriod = spec.metric === "DISCOUNT"
      ? (opts.lastSafeCutDiscountRowsByPeriod && typeof opts.lastSafeCutDiscountRowsByPeriod === "object"
        ? opts.lastSafeCutDiscountRowsByPeriod
        : null)
      : (opts.lastSafeCutSalesRowsByPeriod && typeof opts.lastSafeCutSalesRowsByPeriod === "object"
        ? opts.lastSafeCutSalesRowsByPeriod
        : null);
    const injectedRows = spec.metric === "DISCOUNT" ? opts.lastSafeCutDiscountRows : opts.lastSafeCutSalesRows;
    const injectedPeriod = spec.metric === "DISCOUNT" ? opts.lastSafeCutPeriod : opts.lastSafeCutPeriod;
    const injectedPrimary = spec.metric === "DISCOUNT" ? opts.discountRows : opts.salesRows;
    const liveQuery = opts.queryMonthlySales || queryMonthlySales;
    for (const ym of walkBackYearMonths(asked_period, 12)) {
      let fallbackRows = null;
      if (byPeriod && Array.isArray(byPeriod[ym])) {
        fallbackRows = byPeriod[ym];
      } else if (!byPeriod && Array.isArray(injectedRows) && injectedPeriod === ym) {
        fallbackRows = injectedRows;
      } else if (!byPeriod && Array.isArray(injectedRows) && !injectedPeriod && ym === previousYearMonth(asked_period)) {
        fallbackRows = injectedRows;
      } else if (!Array.isArray(injectedPrimary)) {
        if (spec.metric === "DISCOUNT") {
          fallbackRows = await queryDiscountPerKgViaArrUi(
            opts,
            pool,
            { ...spec, period_kind: "SINGLE", period: ym, period_start: null, period_end: null },
            plantLabel || spec.plant_label,
            canalFilter
          );
        } else {
          const monthBounds = periodBounds(ym);
          const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
          let codes = opts.plantCodes;
          if (!codes) {
            const resolved = await resolveCodes(opts.db || pool, plantLabel || spec.plant_label);
            codes = resolved && resolved.uniqueCodes;
          }
          if (monthBounds && codes && codes.length) {
            const result = await liveQuery(opts.db || pool, codes, monthBounds.startStr, monthBounds.endStr, canalFilter);
            fallbackRows = (result && result.rows) || result || [];
          }
        }
      }
      if (fallbackRows && fallbackRows.length) {
        const fallbackRanked = spec.metric === "DISCOUNT" ? rankByDiscount(fallbackRows, spec) : rankClients(fallbackRows, spec);
        if (fallbackRanked.length) {
          ranked = fallbackRanked;
          spec = { ...spec, period: ym };
          data_semantics = "LAST_SAFE_CUT";
          break;
        }
      }
    }
  }
  let discount_available = false;
  let discount_label = null;
  if (spec.wants_discount) {
    if (opts.discountByClient && spec.ordinal && ranked[spec.ordinal - 1]) {
      const name = ranked[spec.ordinal - 1].cliente;
      if (Object.prototype.hasOwnProperty.call(opts.discountByClient, name)) {
        discount_available = true;
        discount_label = opts.discountByClient[name];
      }
    } else if (typeof opts.queryMonthlyDiscount === "function" || queryMonthlyDiscount) {
      discount_available = false;
    }
  }
  return {
    ok: true,
    spec,
    ranked,
    now,
    planta_id: plantIdToUse,
    discount_available,
    discount_label,
    source: spec.metric === "DISCOUNT" ? DISCOUNT_SOURCE_TABLES[0] : SOURCE_TABLE,
    sources: spec.metric === "DISCOUNT" ? DISCOUNT_SOURCE_TABLES.slice() : [SOURCE_TABLE],
    canal_sql_helper: typeof canalSqlFor === "function",
    data_semantics,
    asked_period,
    discount_empty_kind: spec.metric === "DISCOUNT" && !ranked.length ? discountEmptyKind(rows) : null,
    uniform_projection_factor:
      data_semantics === "OBSERVED_PARTIAL" && Number(opts.uniformProjectionFactor) > 0
        ? Number(opts.uniformProjectionFactor)
        : null,
  };
}

function encodeRankingPrior(spec, ranked) {
  if (!spec || !spec.ok) return null;
  return {
    kind: "client_ranking",
    key: spec.period || "",
    display: spec.plant_label || "CLIENT_RANKING",
    ranking_direction: spec.ranking_direction,
    limit: spec.limit,
    customer_segment: spec.customer_segment,
    metric: spec.metric,
    plant_label: spec.plant_label,
    plant_id: spec.plant_id,
    period: spec.period,
    period_kind: spec.period_kind || (spec.period_start && spec.period_end ? "RANGE" : spec.period ? "SINGLE" : null),
    period_start: spec.period_start || null,
    period_end: spec.period_end || null,
    discount_metric: spec.discount_metric || (spec.metric === "DISCOUNT" ? DISCOUNT_METRIC_CANONICAL : null),
    ranked_names: (ranked || []).map((row) => row.cliente).slice(0, 20),
  };
}

function priorRankingFromState(state) {
  if (!state || (state.parent_intent !== "client_ranking" && state.parent_intent !== "client_discount_ranking")) {
    return null;
  }
  const ent = Array.isArray(state.active_entities) ? state.active_entities[0] : null;
  if (!ent) return null;
  const names =
    Array.isArray(ent.ranked_names) && ent.ranked_names.length
      ? ent.ranked_names
      : Array.isArray(ent.names)
        ? ent.names
        : [];
  return {
    ok: true,
    ranking_direction: ent.ranking_direction || "TOP",
    limit: Number(ent.limit) || 5,
    customer_segment: ent.customer_segment || "ALL",
    metric: ent.metric === "DISCOUNT" ? "DISCOUNT" : "VENTA_TON",
    plant_label: ent.plant_label || null,
    plant_id: ent.plant_id || null,
    period: ent.period || (ent.key && !String(ent.key).includes("..") ? ent.key : null),
    period_kind: ent.period_kind || (ent.period_start && ent.period_end ? "RANGE" : ent.period || ent.key ? "SINGLE" : null),
    period_start: ent.period_start || null,
    period_end: ent.period_end || null,
    discount_metric: ent.discount_metric || (ent.metric === "DISCOUNT" ? DISCOUNT_METRIC_CANONICAL : null),
    ranked_names: names,
  };
}

function buildEntitySetFollowUpAnswer(names, question) {
  const list = (names || []).filter(Boolean);
  if (!list.length) return null;
  const n = String(question || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return [
    `Me refiero solo al conjunto previo: ${list.join(" y ")}.`,
    n.includes("disminuy") || n.includes("bajaron") || n.includes("cayo")
      ? "Calculo la variación de ESOS clientes, no del universo global DISMINUYERON."
      : n.includes("descuento")
        ? "Consultaré el descuento observado de esos clientes. No invento el valor."
        : n.includes("comentario")
          ? "Los comentarios son declaraciones/evidencia, no causa demostrada."
          : n.includes("accion")
            ? "Solo asocio acciones cuando la relación cliente↔acción es defendible."
            : "Conservo las entidades del turno anterior y reemplazo solo la dimensión pedida.",
    "Si no hay venta previa/actual de alguno, lo declaro. No salto a otra lista DICF.",
  ].join(" ");
}

function buildClientRankingChatResult(payload, opts = {}) {
  const answer = buildClientRankingAnswer(payload);
  const spec = payload && payload.spec;
  const entity = encodeRankingPrior(spec, payload && payload.ranked);
  const plantaId = payload && payload.planta_id != null ? payload.planta_id : opts.planta_id;
  const parentIntent = spec && spec.metric === "DISCOUNT" ? "client_discount_ranking" : "client_ranking";
  return {
    ok: true,
    answer,
    sources:
      payload && payload.ok !== false
        ? spec && spec.metric === "DISCOUNT"
          ? DISCOUNT_SOURCE_TABLES.slice()
          : [SOURCE_TABLE]
        : [],
    context_meta: {
      mode: SEMANTIC_CLASS,
      openai_called: false,
      veracity:
        payload && payload.ok === false
          ? payload.code || DIRECTOR_IA_VERACITY.SOURCE_ERROR
          : DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
      semantic_class: SEMANTIC_CLASS,
      planta_id: plantaId,
      data_semantics: payload && payload.data_semantics ? payload.data_semantics : null,
      conversation_state: {
        parent_intent: parentIntent,
        planta_id: plantaId,
        active_subtopic: parentIntent,
        active_entities: entity ? [entity] : [],
        pending_information_gap:
          payload && payload.clarification && spec && !hasPeriod(spec)
            ? {
                kind: "dimension_completion",
                parent_intent: parentIntent,
                missing_fields: ["period"],
                frame: {
                  ranking_direction: spec.ranking_direction,
                  limit: spec.limit,
                  customer_segment: spec.customer_segment,
                  metric: spec.metric,
                  discount_metric: spec.discount_metric || null,
                  plant_label: spec.plant_label,
                  plant_id: spec.plant_id,
                },
                original_question: payload.question || null,
                why_blocks: "Falta periodo del ranking. No invento el mes.",
              }
            : null,
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SOURCE_TABLE,
  DISCOUNT_SOURCE_TABLES,
  DISCOUNT_METRIC_CANONICAL,
  arrUiDiscountPerKg,
  yearMonthsInclusive,
  isClientRankingQuestion,
  isClientRankingFollowUp,
  extractClientRankingSpec,
  extractRankingPeriod,
  extractPeriodYm,
  hasPeriod,
  queryBoundsForSpec,
  formatRangeLabel,
  formatPeriodHuman,
  previousYearMonth,
  walkBackYearMonths,
  formatMonthLabel,
  isOpenCalendarMonth,
  rankClients,
  loadClientRankingForChat,
  buildClientRankingAnswer,
  buildClientRankingChatResult,
  priorRankingFromState,
  rankByDiscount,
  buildEntitySetFollowUpAnswer,
};
