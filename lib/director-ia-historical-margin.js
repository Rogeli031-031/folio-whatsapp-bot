"use strict";

/**
 * Director IA — margen histórico $/kg (FINAL cerrado / FORECAST abierto).
 * Read-only. Determinista. Sin OpenAI. Sin helper ponderado legacy.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { canViewFinancialActual, FINANCIAL_ACTUAL_CODES } = require("./director-ia-financial-actual");
const { PLANTS_PROVINCIA } = require("./delta-ingreso-commands");

const SEMANTIC_CLASS = "historical_margin";
const CLOSED_SOURCES = Object.freeze(["igf.versions", "igf.compromiso_lines"]);
const OPEN_SOURCES = Object.freeze(["igf.versions", "igf.compromiso_lines"]);

const MESES_ES = Object.freeze([
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

const MONTH_NAME_TO_NUM = Object.freeze({
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

function normalizeQuestion(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cdmxTodayParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const pick = (type) => Number((parts.find((p) => p.type === type) || {}).value);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function ymIndex(year, month) {
  return Number(year) * 12 + Number(month);
}

function formatYyyyMm(year, month) {
  return `${Number(year)}-${String(Number(month)).padStart(2, "0")}`;
}

function monthTitle(year, month) {
  const name = MESES_ES[Number(month) - 1] || String(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function monthBare(month) {
  return MESES_ES[Number(month) - 1] || String(month);
}

function namesMargin(q) {
  return /\bmargen\b/.test(q);
}

function findMonthMentions(q) {
  const found = [];
  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    const re = new RegExp(`\\b${name}\\b`, "g");
    let m;
    while ((m = re.exec(q))) {
      found.push({ name, month: num, index: m.index, end: m.index + name.length });
    }
  }
  found.sort((a, b) => a.index - b.index || a.month - b.month);
  const uniq = [];
  const seen = new Set();
  for (const hit of found) {
    const key = `${hit.index}:${hit.month}`;
    if (seen.has(key)) continue;
    if (hit.name === "setiembre" && uniq.some((u) => u.month === 9 && Math.abs(u.index - hit.index) < 2)) {
      continue;
    }
    seen.add(key);
    uniq.push(hit);
  }
  return uniq;
}

function yearNearMention(q, mention) {
  const after = q.slice(mention.end, mention.end + 22);
  const mAfter = after.match(/^\s*(de\s+)?(20\d{2})\b/);
  if (mAfter) return Number(mAfter[2]);
  const before = q.slice(Math.max(0, mention.index - 22), mention.index);
  const mBefore = before.match(/\b(20\d{2})\s*(de\s+)?$/);
  if (mBefore) return Number(mBefore[1]);
  return null;
}

function extractExplicitYear(q) {
  const named = q.match(/\b(?:ano|year)\s+(20\d{2})\b/);
  if (named) return Number(named[1]);
  const deYear = q.match(/\bde\s+(20\d{2})\b/);
  if (deYear) return Number(deYear[1]);
  const bare = q.match(/\b(20\d{2})\b/);
  if (bare) return Number(bare[1]);
  return null;
}

function hasYearExtrema(q) {
  const extrema = /\b(mejor|mayor|maximo|maxima|tope|menor|minimo|minima|peor)\b/.test(q);
  if (!extrema || !namesMargin(q)) return false;
  return /\b(ano|year|20\d{2})\b/.test(q) || /\bdel\s+ano\b/.test(q);
}

function yearExtremaKind(q) {
  if (/\b(menor|minimo|minima|peor)\b/.test(q)) return "year_min";
  if (/\b(mejor|mayor|maximo|maxima|tope)\b/.test(q)) return "year_max";
  return null;
}

function isDiagnosisHoldout(q) {
  if (/\b(por\s+que|porque)\b/.test(q) && /\b(cayo|caida|bajo|baj[o]|disminuy)\b/.test(q)) return true;
  if (/\bcomo\s+va\b/.test(q) && /\bplanta\b/.test(q) && !findMonthMentions(q).length && !hasYearExtrema(q)) {
    return true;
  }
  if (/\bcomo\s+se\s+comport/.test(q) && !findMonthMentions(q).length && !hasYearExtrema(q)) return true;
  if (/\bdescuento\b/.test(q) && /\b(cambio|cambi|vario|variacion|delta)\b/.test(q)) return true;
  if (/\b(tendencia|ols)\b/.test(q) && !hasYearExtrema(q) && findMonthMentions(q).length === 0) return true;
  if (/\bventa\b/.test(q) && !namesMargin(q)) return true;
  if (/\bclientes?\s+nuev/.test(q) || /\bnuev[oa]s?\s+clientes?\b/.test(q)) return true;
  return false;
}

function isHistoricalMarginQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (!namesMargin(q)) return false;
  if (isDiagnosisHoldout(q)) return false;
  if (hasYearExtrema(q)) return true;
  if (findMonthMentions(q).length >= 1) return true;
  if (/\b(20\d{2})-(\d{1,2})\b/.test(q)) return true;
  return false;
}

function classifyPeriodKind(year, month, today) {
  const idx = ymIndex(year, month);
  const nowIdx = ymIndex(today.year, today.month);
  if (idx > nowIdx) return "future_month";
  if (idx === nowIdx) return "open_current_month";
  return "closed_month";
}

function annualCandidateMonths(year, today) {
  const y = Number(year);
  if (!Number.isFinite(y)) return [];
  if (y > today.year) return [];
  const last = y === today.year ? today.month - 1 : 12;
  const out = [];
  for (let m = 1; m <= last; m += 1) out.push({ year: y, month: m });
  return out;
}

function resolveHistoricalMarginRequest(raw, now = new Date()) {
  const q = normalizeQuestion(raw);
  const today = cdmxTodayParts(now);
  const extrema = yearExtremaKind(q);
  const mentions = findMonthMentions(q);
  const ym = q.match(/\b(20\d{2})-(\d{1,2})\b/);

  if (extrema && hasYearExtrema(q)) {
    const year = extractExplicitYear(q) || today.year;
    return {
      operation: extrema,
      year,
      periods: annualCandidateMonths(year, today),
      period_source: extractExplicitYear(q) ? "explicit_year" : "current_year",
    };
  }

  if (mentions.length >= 2) {
    const periods = mentions.slice(0, 2).map((hit) => {
      const yearHint = yearNearMention(q, hit);
      const year = Number.isFinite(yearHint) ? yearHint : today.year;
      return { year, month: hit.month, kind: classifyPeriodKind(year, hit.month, today) };
    });
    return {
      operation: "compare_months",
      periods,
      period_source: "two_named_months",
    };
  }

  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) {
      return {
        operation: "single_month",
        periods: [{ year, month, kind: classifyPeriodKind(year, month, today) }],
        period_source: "yyyy_mm",
      };
    }
  }

  if (mentions.length === 1) {
    const yearHint = yearNearMention(q, mentions[0]);
    const year = Number.isFinite(yearHint) ? yearHint : today.year;
    const month = mentions[0].month;
    return {
      operation: "single_month",
      periods: [{ year, month, kind: classifyPeriodKind(year, month, today) }],
      period_source: yearHint ? "named_month_year" : "named_month",
    };
  }

  return { operation: null, periods: [], year: null, period_source: null };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNamedPlant(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return null;
  const names = [...PLANTS_PROVINCIA].sort((a, b) => b.length - a.length);
  for (const name of names) {
    const key = normalizeQuestion(name);
    if (!key) continue;
    if (new RegExp(`\\b${escapeRegExp(key)}\\b`).test(q)) {
      return name;
    }
  }
  return null;
}

function normalizePlantKey(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripGtPrefix(key) {
  return String(key || "").replace(/^(gtm|gt)\s+/, "").trim();
}

function isValidStoredMargin(raw) {
  if (raw == null || raw === "") return false;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n);
}

function storedMarginNumber(raw) {
  if (!isValidStoredMargin(raw)) return null;
  return typeof raw === "number" ? raw : Number(raw);
}

function formatMarginKg(raw) {
  const n = storedMarginNumber(raw);
  if (n == null) return "—";
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 1 planta fuente → 1 fila única. Sin substring / ILIKE / first-row.
 */
function findUniquePlantRow(rows, plantCode, plantaNombre) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && String(r.empresa || "").trim()) : [];
  const wantCode = normalizePlantKey(plantCode);
  const wantName = normalizePlantKey(plantaNombre);
  const collected = [];
  const pushUnique = (row) => {
    if (!row || collected.includes(row)) return;
    collected.push(row);
  };

  if (wantCode) {
    for (const r of list) {
      if (normalizePlantKey(r.empresa) === wantCode) pushUnique(r);
    }
  }
  if (wantName) {
    for (const r of list) {
      if (normalizePlantKey(r.empresa) === wantName) pushUnique(r);
    }
  }

  const strippedWants = [...new Set([stripGtPrefix(wantCode), stripGtPrefix(wantName)].filter(Boolean))];
  for (const want of strippedWants) {
    for (const r of list) {
      const emp = normalizePlantKey(r.empresa);
      if (emp === want || stripGtPrefix(emp) === want) pushUnique(r);
    }
  }

  if (collected.length === 1) {
    return { ok: true, row: collected[0], ambiguous: false, candidates: 1 };
  }
  if (collected.length > 1) {
    return { ok: false, row: null, ambiguous: true, candidates: collected.length };
  }
  return { ok: false, row: null, ambiguous: false, candidates: 0 };
}

function restricted(error) {
  return {
    ok: false,
    abort: true,
    code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
    status: 403,
    error: error || "Sin permiso para margen histórico en esta planta.",
  };
}

function notFound(error, extra) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
    status: 404,
    error,
    facts_consulted: extra && extra.facts_consulted != null ? extra.facts_consulted : false,
    sources: extra && extra.sources ? extra.sources : [],
    ...(extra || {}),
  };
}

function sourceError(error, extra) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: error || "Error de fuente",
    ...(extra || {}),
  };
}

async function defaultResolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return (r.rows && r.rows[0]) || null;
}

async function defaultResolvePlantByNombre(client, nombre) {
  const r = await client.query(
    `SELECT id, nombre, clave FROM public.plantas
      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
         OR LOWER(TRIM(COALESCE(clave, ''))) = LOWER(TRIM($1))
      LIMIT 2`,
    [nombre]
  );
  if (!r.rows || r.rows.length !== 1) return null;
  return r.rows[0];
}

async function defaultQueryVersions(client, year, month) {
  const r = await client.query(
    `SELECT id, version_number, financial_state
       FROM igf.versions
      WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int`,
    [year, month]
  );
  return r.rows || [];
}

async function defaultQueryLatestVersion(client, year, month) {
  const r = await client.query(
    `SELECT id, version_number, financial_state
       FROM igf.versions
      WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
      ORDER BY version_number DESC
      LIMIT 1`,
    [year, month]
  );
  return (r.rows && r.rows[0]) || null;
}

async function defaultQueryLines(client, versionId) {
  const r = await client.query(
    `SELECT empresa, margen_kg FROM igf.compromiso_lines WHERE version_id = $1::int ORDER BY empresa`,
    [versionId]
  );
  return r.rows || [];
}

function plantFromRow(row, fallbackId) {
  if (!row) return null;
  return {
    id: Number(row.id || fallbackId),
    nombre: row.nombre || null,
    clave: row.clave || null,
    plant_code: row.clave || row.nombre || null,
  };
}

function assertClosedAuth(auth, plantaId) {
  if (!canViewFinancialActual(auth, plantaId)) {
    return restricted("Sin permiso para ACTUAL_FINANCIAL / margen histórico cerrado en esta planta.");
  }
  return { ok: true };
}

function assertOpenAuth(auth, plantaId) {
  if (!canViewFinancialActual(auth, plantaId)) {
    return restricted("Sin permiso para margen forecast del mes abierto en esta planta.");
  }
  return { ok: true };
}

async function loadClosedMonth(deps, plant, year, month) {
  const versions = await deps.queryVersions(deps.client, year, month);
  if (!Array.isArray(versions) || versions.length === 0) {
    return {
      status: "missing",
      reason: "NO_VERSION",
      year,
      month,
      period_kind: "closed_month",
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
    };
  }
  const finals = versions.filter((v) => String(v.financial_state || "") === "FINAL");
  if (finals.length === 0) {
    return {
      status: "missing",
      reason: "NOT_FINAL",
      year,
      month,
      period_kind: "closed_month",
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
    };
  }
  if (finals.length > 1) {
    return {
      status: "error",
      reason: "VERSION_AMBIGUOUS",
      year,
      month,
      period_kind: "closed_month",
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
    };
  }
  const version = finals[0];
  const lines = await deps.queryLines(deps.client, version.id);
  const match = findUniquePlantRow(lines, plant.plant_code, plant.nombre);
  if (match.ambiguous) {
    return {
      status: "error",
      reason: "PLANT_AMBIGUOUS",
      year,
      month,
      period_kind: "closed_month",
      plant_match_ambiguous: true,
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
      financial_state: "FINAL",
    };
  }
  if (!match.ok || !match.row) {
    return {
      status: "missing",
      reason: "NO_PLANT_ROW",
      year,
      month,
      period_kind: "closed_month",
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
      financial_state: "FINAL",
    };
  }
  const margin = storedMarginNumber(match.row.margen_kg);
  if (margin == null) {
    return {
      status: "missing",
      reason: "NULL_MARGIN",
      year,
      month,
      period_kind: "closed_month",
      truth_class: "ACTUAL_FINANCIAL",
      margin_kg: null,
      facts_consulted: true,
      sources: [...CLOSED_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
      financial_state: "FINAL",
      empresa: String(match.row.empresa || "").trim() || null,
    };
  }
  return {
    status: "valid",
    reason: null,
    year,
    month,
    period_kind: "closed_month",
    truth_class: "ACTUAL_FINANCIAL",
    margin_kg: margin,
    presented_as_closed_actual: true,
    forecast_used: false,
    facts_consulted: true,
    sources: [...CLOSED_SOURCES],
    version_id: Number(version.id),
    version_number: version.version_number != null ? Number(version.version_number) : null,
    financial_state: "FINAL",
    empresa: String(match.row.empresa || "").trim() || null,
  };
}

async function loadOpenMonth(deps, plant, year, month) {
  const version = await deps.queryLatestVersion(deps.client, year, month);
  if (!version) {
    return {
      status: "missing",
      reason: "NO_VERSION",
      year,
      month,
      period_kind: "open_current_month",
      truth_class: null,
      margin_kg: null,
      presented_as_closed_actual: false,
      forecast_used: false,
      facts_consulted: true,
      sources: [...OPEN_SOURCES],
    };
  }
  const lines = await deps.queryLines(deps.client, version.id);
  const match = findUniquePlantRow(lines, plant.plant_code, plant.nombre);
  if (match.ambiguous) {
    return {
      status: "error",
      reason: "PLANT_AMBIGUOUS",
      year,
      month,
      period_kind: "open_current_month",
      plant_match_ambiguous: true,
      truth_class: null,
      margin_kg: null,
      presented_as_closed_actual: false,
      forecast_used: false,
      facts_consulted: true,
      sources: [...OPEN_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
    };
  }
  if (!match.ok || !match.row) {
    return {
      status: "missing",
      reason: "NO_PLANT_ROW",
      year,
      month,
      period_kind: "open_current_month",
      truth_class: null,
      margin_kg: null,
      presented_as_closed_actual: false,
      forecast_used: false,
      facts_consulted: true,
      sources: [...OPEN_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
    };
  }
  const margin = storedMarginNumber(match.row.margen_kg);
  if (margin == null) {
    return {
      status: "missing",
      reason: "NULL_MARGIN",
      year,
      month,
      period_kind: "open_current_month",
      truth_class: "FORECAST",
      margin_kg: null,
      presented_as_closed_actual: false,
      forecast_used: false,
      facts_consulted: true,
      sources: [...OPEN_SOURCES],
      version_id: Number(version.id),
      version_number: version.version_number != null ? Number(version.version_number) : null,
      empresa: String(match.row.empresa || "").trim() || null,
    };
  }
  return {
    status: "valid",
    reason: null,
    year,
    month,
    period_kind: "open_current_month",
    truth_class: "FORECAST",
    margin_kg: margin,
    presented_as_closed_actual: false,
    forecast_used: true,
    facts_consulted: true,
    sources: [...OPEN_SOURCES],
    version_id: Number(version.id),
    version_number: version.version_number != null ? Number(version.version_number) : null,
    financial_state: version.financial_state != null ? String(version.financial_state) : null,
    empresa: String(match.row.empresa || "").trim() || null,
  };
}

function futureMonth(year, month) {
  return {
    status: "missing",
    reason: "FUTURE",
    year,
    month,
    period_kind: "future_month",
    truth_class: null,
    margin_kg: null,
    presented_as_closed_actual: false,
    forecast_used: false,
    facts_consulted: false,
    sources: [],
  };
}

async function loadPeriod(deps, plant, year, month, today) {
  const kind = classifyPeriodKind(year, month, today);
  try {
    if (kind === "future_month") return futureMonth(year, month);
    if (kind === "open_current_month") return loadOpenMonth(deps, plant, year, month);
    return await loadClosedMonth(deps, plant, year, month);
  } catch (e) {
    return {
      status: "error",
      reason: "SOURCE_UNAVAILABLE",
      year,
      month,
      period_kind: kind,
      truth_class: null,
      margin_kg: null,
      facts_consulted: true,
      sources: kind === "future_month" ? [] : [...CLOSED_SOURCES],
      error: e && e.message,
    };
  }
}

function payloadVeracityCode(payload) {
  return (payload && payload.veracity) || (payload && payload.code) || null;
}

function resolveSourceErrorReason(payload) {
  if (!payload) return null;
  if (payload.evidence && payload.evidence.reason) return payload.evidence.reason;
  if (payload.reason) return payload.reason;
  if (Array.isArray(payload.periods)) {
    const err = payload.periods.find((p) => p && p.status === "error" && p.reason);
    if (err) return err.reason;
  }
  const raw = String(payload.error || "");
  if (raw === "VERSION_AMBIGUOUS" || raw === "PLANT_AMBIGUOUS" || raw === "SOURCE_UNAVAILABLE") return raw;
  return null;
}

function buildSourceErrorAnswer(payload) {
  const reason = resolveSourceErrorReason(payload);
  if (reason === "VERSION_AMBIGUOUS") {
    return "No puedo validar el margen: existen múltiples versiones FINAL para el periodo y no elijo una arbitrariamente.";
  }
  if (reason === "PLANT_AMBIGUOUS") {
    return "No puedo validar el margen: no hay una única fila de planta defendible para este periodo.";
  }
  return "No pude consultar o validar la fuente de margen histórico. No afirmo un valor.";
}

function periodErrorLine(ev) {
  if (ev.reason === "VERSION_AMBIGUOUS") {
    return `${monthTitle(ev.year, ev.month)}: múltiples versiones FINAL; no elijo una arbitrariamente.`;
  }
  if (ev.reason === "PLANT_AMBIGUOUS") {
    return `${monthTitle(ev.year, ev.month)}: no hay una única fila de planta defendible.`;
  }
  return `${monthTitle(ev.year, ev.month)}: no pude consultar o validar la fuente.`;
}

function buildSingleAnswer(ev, plantaNombre) {
  if (!ev) return "No pude completar el margen histórico. No afirmo valores.";
  if (ev.status === "error") {
    return buildSourceErrorAnswer({ evidence: ev, code: DIRECTOR_IA_VERACITY.SOURCE_ERROR });
  }
  if (ev.period_kind === "future_month") {
    return `${monthTitle(ev.year, ev.month)} es un periodo futuro. Esta capacidad no presenta un margen histórico para ese periodo.`;
  }
  if (ev.status !== "valid") {
    if (ev.period_kind === "open_current_month") {
      return `No hay un margen forecast defendible para ${monthTitle(ev.year, ev.month)}.`;
    }
    return `No hay un margen histórico FINAL defendible para ${monthBare(ev.month)} ${ev.year}.`;
  }
  if (ev.period_kind === "open_current_month") {
    return [
      `Margen forecast de ${monthBare(ev.month)} ${ev.year}: ${formatMarginKg(ev.margin_kg)} $/kg.`,
      `${monthTitle(ev.year, ev.month).split(" ")[0]} está abierto; no lo presento como cierre real.`,
    ].join(" ");
  }
  return `${monthTitle(ev.year, ev.month)}: ${formatMarginKg(ev.margin_kg)} $/kg.\nFuente: cierre financiero FINAL.${plantaNombre ? ` Planta: ${plantaNombre}.` : ""}`;
}

function buildCompareAnswer(a, b) {
  const comparable =
    a.status === "valid" &&
    b.status === "valid" &&
    a.period_kind === "closed_month" &&
    b.period_kind === "closed_month" &&
    a.truth_class === "ACTUAL_FINANCIAL" &&
    b.truth_class === "ACTUAL_FINANCIAL";
  const lines = [];
  if (a.status === "valid") {
    const tag = a.truth_class === "FORECAST" ? " (forecast, mes abierto)" : "";
    lines.push(`${monthTitle(a.year, a.month)}: ${formatMarginKg(a.margin_kg)} $/kg${tag}`);
  } else if (a.status === "error") {
    lines.push(periodErrorLine(a));
  } else if (a.period_kind === "future_month") {
    lines.push(`${monthTitle(a.year, a.month)}: periodo futuro. Sin margen histórico.`);
  } else {
    lines.push(`${monthTitle(a.year, a.month)}: sin margen FINAL defendible.`);
  }
  if (b.status === "valid") {
    const tag = b.truth_class === "FORECAST" ? " (forecast, mes abierto)" : "";
    lines.push(`${monthTitle(b.year, b.month)}: ${formatMarginKg(b.margin_kg)} $/kg${tag}`);
  } else if (b.status === "error") {
    lines.push(periodErrorLine(b));
  } else if (b.period_kind === "future_month") {
    lines.push(`${monthTitle(b.year, b.month)}: periodo futuro. Sin margen histórico.`);
  } else {
    lines.push(`${monthTitle(b.year, b.month)}: sin margen FINAL defendible.`);
  }
  if (!comparable) {
    lines.push("No calculo variación: los periodos no comparten semántica histórica FINAL homogénea.");
    return { answer: lines.join("\n"), delta_raw: null, comparable: false };
  }
  const deltaRaw = Number(b.margin_kg) - Number(a.margin_kg);
  const sign = deltaRaw > 0 ? "+" : "";
  lines.push(
    `Variación ${monthBare(b.month)} − ${monthBare(a.month)}: ${sign}${formatMarginKg(deltaRaw)} $/kg`
  );
  return { answer: lines.join("\n"), delta_raw: deltaRaw, comparable: true };
}

function rankMonths(evidenceMonths, direction) {
  const included = evidenceMonths.filter((m) => m.status === "valid" && m.period_kind === "closed_month");
  if (!included.length) return { winners: [], included, value: null };
  const raws = included.map((m) => m.margin_kg);
  const value = direction === "min" ? Math.min(...raws) : Math.max(...raws);
  const winners = included.filter((m) => m.margin_kg === value);
  return { winners, included, value };
}

function buildAnnualAnswer(payload) {
  const year = payload.year;
  const op = payload.operation;
  const label = op === "year_min" ? "Menor" : "Mejor";
  if (!payload.included_months || payload.included_months.length === 0) {
    return `No hay meses cerrados con margen FINAL defendible para ranking de ${year}.`;
  }
  const caveat = payload.coverage_complete
    ? ""
    : ` Entre los ${payload.included_months.length} meses cerrados con evidencia FINAL disponible`;
  const head = payload.coverage_complete
    ? `${label} margen de ${year}:`
    : `${label} margen de ${year}:${caveat}:`;
  const lines = [head];
  for (const w of payload.winners) {
    lines.push(`${monthTitle(w.year, w.month)} — ${formatMarginKg(w.margin_kg)} $/kg`);
  }
  if (payload.winners.length > 1) {
    lines.push("Empate en valor raw; reporto todos los meses empatados.");
  }
  return lines.join("\n");
}

async function loadHistoricalMarginForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const question = opts.question != null ? opts.question : req && req.body && req.body.question;
  const now = opts.now || new Date();

  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return sourceError("planta_id es obligatorio", { status: 400 });
  }

  const requested = resolveHistoricalMarginRequest(question, now);
  if (!requested.operation || !requested.periods || !requested.periods.length) {
    return notFound("No pude resolver un periodo de margen histórico. No invento el mes.");
  }

  const today = cdmxTodayParts(now);
  const injected = Boolean(opts.resolvePlanta || opts.queryVersions || opts.queryLatestVersion || opts.queryLines);
  const resolvePlantaRow = opts.resolvePlanta || defaultResolvePlantaRow;
  const resolveByNombre = opts.resolvePlantByNombre || defaultResolvePlantByNombre;

  const run = async (client) => {
    const sessionPlant = await resolvePlantaRow(client, Number(plantaId));
    if (!sessionPlant) return notFound("Planta no encontrada");

    let target = plantFromRow(sessionPlant, plantaId);
    const named = extractNamedPlant(question);
    if (named) {
      const found = await resolveByNombre(client, named);
      if (!found) return notFound("Planta nombrada no encontrada");
      const namedId = Number(found.id);
      const needsClosed = requested.periods.some((p) => classifyPeriodKind(p.year, p.month, today) === "closed_month");
      const authz = needsClosed ? assertClosedAuth(auth, namedId) : assertOpenAuth(auth, namedId);
      if (!authz.ok) return authz;
      target = plantFromRow(found, namedId);
    } else {
      const kinds = requested.periods.map((p) => p.kind || classifyPeriodKind(p.year, p.month, today));
      const needsClosed = kinds.includes("closed_month") || requested.operation === "year_max" || requested.operation === "year_min";
      const authz = needsClosed ? assertClosedAuth(auth, Number(target.id)) : assertOpenAuth(auth, Number(target.id));
      if (!authz.ok) return authz;
    }

    const deps = {
      client,
      queryVersions: opts.queryVersions || defaultQueryVersions,
      queryLatestVersion: opts.queryLatestVersion || defaultQueryLatestVersion,
      queryLines: opts.queryLines || defaultQueryLines,
    };

    const base = {
      ok: true,
      semantic_class: SEMANTIC_CLASS,
      operation: requested.operation,
      planta_id: Number(target.id),
      planta_nombre: target.nombre,
      plant_code: target.plant_code,
      period_source: requested.period_source,
      presented_as_closed_actual: false,
      forecast_used: false,
      facts_consulted: false,
      sources: [],
    };

    if (requested.operation === "single_month") {
      const p = requested.periods[0];
      const ev = await loadPeriod(deps, target, p.year, p.month, today);
      if (ev.period_kind === "future_month") {
        return {
          ...base,
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error: `${monthTitle(ev.year, ev.month)} es un periodo futuro. Esta capacidad no presenta un margen histórico para ese periodo.`,
          period_kind: "future_month",
          periods: [ev],
          truth_class: null,
          facts_consulted: false,
          sources: [],
          evidence: ev,
        };
      }
      if (ev.status === "error") {
        return {
          ...base,
          ok: false,
          code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
          status: 500,
          error: ev.reason === "PLANT_AMBIGUOUS" ? "Más de una fila de planta coincide de forma defendible." : ev.reason,
          period_kind: ev.period_kind,
          plant_match_ambiguous: Boolean(ev.plant_match_ambiguous),
          periods: [ev],
          evidence: ev,
          facts_consulted: ev.facts_consulted,
          sources: ev.sources || [],
        };
      }
      if (ev.status !== "valid") {
        return {
          ...base,
          ok: false,
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
          status: 404,
          error:
            ev.period_kind === "open_current_month"
              ? `No hay un margen forecast defendible para ${monthTitle(ev.year, ev.month)}.`
              : `No hay un margen histórico FINAL defendible para ${monthBare(ev.month)} ${ev.year}.`,
          reason: ev.reason,
          period_kind: ev.period_kind,
          periods: [ev],
          evidence: ev,
          facts_consulted: ev.facts_consulted,
          sources: ev.sources || [],
        };
      }
      return {
        ...base,
        period_kind: ev.period_kind,
        truth_class: ev.truth_class,
        presented_as_closed_actual: Boolean(ev.presented_as_closed_actual),
        forecast_used: Boolean(ev.forecast_used),
        facts_consulted: true,
        sources: ev.sources || [],
        periods: [ev],
        evidence: ev,
        margin_kg: ev.margin_kg,
        version_id: ev.version_id,
        version_number: ev.version_number,
        financial_state: ev.financial_state || null,
      };
    }

    if (requested.operation === "compare_months") {
      const [pa, pb] = requested.periods;
      const a = await loadPeriod(deps, target, pa.year, pa.month, today);
      const b = await loadPeriod(deps, target, pb.year, pb.month, today);
      const compared = buildCompareAnswer(a, b);
      const anyError = a.status === "error" || b.status === "error";
      const bothValidComparable = compared.comparable;
      let code = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
      let ok = true;
      if (anyError && (a.status === "valid" || b.status === "valid")) code = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
      else if (anyError) {
        ok = false;
        code = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
      } else if (!bothValidComparable && (a.status !== "valid" || b.status !== "valid")) {
        ok = a.status === "valid" || b.status === "valid";
        code = ok ? DIRECTOR_IA_VERACITY.SOURCE_PARTIAL : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
      } else if (!bothValidComparable) {
        code = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
      }
      const sources = [...new Set([...(a.sources || []), ...(b.sources || [])])];
      return {
        ...base,
        ok,
        code: ok && code === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE ? undefined : code,
        veracity: code,
        period_kind: "compare_months",
        periods: [a, b],
        delta_raw: compared.delta_raw,
        comparable: compared.comparable,
        compare_answer: compared.answer,
        presented_as_closed_actual: bothValidComparable,
        forecast_used: a.forecast_used || b.forecast_used,
        facts_consulted: Boolean(a.facts_consulted || b.facts_consulted),
        sources,
        truth_class: bothValidComparable ? "ACTUAL_FINANCIAL" : null,
      };
    }

    const year = requested.year;
    const evidenceMonths = [];
    for (const p of requested.periods) {
      evidenceMonths.push(await loadPeriod(deps, target, p.year, p.month, today));
    }
    const ranked = rankMonths(evidenceMonths, requested.operation === "year_min" ? "min" : "max");
    const excluded = evidenceMonths.filter((m) => m.status !== "valid" || m.period_kind !== "closed_month");
    const errorExcluded = excluded.filter((m) => m.status === "error");
    const coverage_complete = excluded.length === 0 && ranked.included.length === requested.periods.length;
    let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
    if (ranked.included.length === 0) veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    else if (errorExcluded.length > 0) veracity = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;
    else if (!coverage_complete) veracity = DIRECTOR_IA_VERACITY.SOURCE_PARTIAL;

    const sources = ranked.included.length ? [...CLOSED_SOURCES] : [];
    return {
      ...base,
      ok: ranked.included.length > 0,
      code: ranked.included.length ? (veracity === DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE ? undefined : veracity) : DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      veracity,
      year,
      period_kind: requested.operation,
      candidate_months: requested.periods.map((p) => formatYyyyMm(p.year, p.month)),
      included_months: ranked.included,
      excluded_months: excluded,
      winners: ranked.winners,
      coverage_complete,
      presented_as_closed_actual: ranked.included.length > 0,
      forecast_used: false,
      facts_consulted: evidenceMonths.some((m) => m.facts_consulted),
      sources,
      truth_class: ranked.included.length ? "ACTUAL_FINANCIAL" : null,
    };
  };

  try {
    if (injected) return await run(null);
    if (!pool || typeof pool.connect !== "function") {
      return sourceError("Fuente de historical_margin no disponible");
    }
    const client = await pool.connect();
    try {
      return await run(client);
    } finally {
      client.release();
    }
  } catch (e) {
    return sourceError(e && e.message);
  }
}

function buildHistoricalMarginAnswer(payload) {
  if (!payload) return "No pude completar el margen histórico. No afirmo valores.";
  const veracity = payloadVeracityCode(payload);
  if (veracity === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
    return payload.error || "Sin permiso para consultar margen histórico en esta planta.";
  }
  if (veracity === DIRECTOR_IA_VERACITY.SOURCE_ERROR) {
    return buildSourceErrorAnswer(payload);
  }
  if (payload.operation === "single_month" && payload.evidence) {
    return buildSingleAnswer(payload.evidence, payload.planta_nombre);
  }
  if (payload.operation === "compare_months") {
    if (payload.compare_answer) return payload.compare_answer;
    if (payload.periods && payload.periods.length === 2) {
      return buildCompareAnswer(payload.periods[0], payload.periods[1]).answer;
    }
  }
  if (payload.operation === "year_max" || payload.operation === "year_min") {
    return buildAnnualAnswer(payload);
  }
  if (payload.error) return payload.error;
  return "No pude completar el margen histórico. No afirmo valores.";
}

function buildHistoricalMarginChatResult(payload, opts = {}) {
  const answer = buildHistoricalMarginAnswer(payload);
  const veracity =
    (payload && payload.veracity) ||
    (payload && payload.code) ||
    (payload && payload.ok ? DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE : DIRECTOR_IA_VERACITY.SOURCE_ERROR);
  const sources = Array.isArray(payload && payload.sources) ? [...payload.sources] : [];
  const ev = payload && payload.evidence;
  return {
    ok: Boolean(payload && payload.ok),
    answer,
    sources,
    context_meta: {
      mode: "historical_margin",
      operation: payload && payload.operation,
      openai_called: false,
      veracity,
      semantic_class: SEMANTIC_CLASS,
      planta_id: opts.planta_id != null ? opts.planta_id : payload && payload.planta_id,
      period_kind: payload && payload.period_kind,
      periods: payload && payload.periods,
      truth_class: (payload && payload.truth_class) || (ev && ev.truth_class) || null,
      forecast_used: Boolean(payload && payload.forecast_used),
      presented_as_closed_actual: Boolean(payload && payload.presented_as_closed_actual),
      coverage_complete: payload && payload.coverage_complete,
      version_id: (payload && payload.version_id) || (ev && ev.version_id) || null,
      version_number: (payload && payload.version_number) || (ev && ev.version_number) || null,
      financial_state: (payload && payload.financial_state) || (ev && ev.financial_state) || null,
      facts_consulted: Boolean(payload && payload.facts_consulted),
      plant_match_ambiguous: Boolean(payload && payload.plant_match_ambiguous),
      delta_raw: payload && payload.delta_raw,
    },
    conversation_state: opts.conversation_state || null,
    limitation:
      veracity && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "historical_margin" }
        : undefined,
    status: payload && payload.status,
    error: payload && payload.error,
    code: payload && payload.code,
  };
}

module.exports = {
  SEMANTIC_CLASS,
  CLOSED_SOURCES,
  OPEN_SOURCES,
  FINANCIAL_ACTUAL_CODES,
  isHistoricalMarginQuestion,
  resolveHistoricalMarginRequest,
  classifyPeriodKind,
  annualCandidateMonths,
  extractNamedPlant,
  normalizePlantKey,
  findUniquePlantRow,
  isValidStoredMargin,
  storedMarginNumber,
  formatMarginKg,
  cdmxTodayParts,
  loadHistoricalMarginForChat,
  buildHistoricalMarginAnswer,
  buildHistoricalMarginChatResult,
};
