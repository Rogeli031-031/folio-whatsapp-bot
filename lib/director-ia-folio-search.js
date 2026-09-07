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
  new RegExp(`\\bdesde\\s+${MONTH_POINT_SRC}\\s+hasta\\s+${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\bde\\s+${MONTH_POINT_SRC}\\s+a\\s+${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\b${MONTH_POINT_SRC}-${MONTH_POINT_SRC}\\b`),
  new RegExp(`\\b${MONTH_POINT_SRC}\\s+a\\s+${MONTH_POINT_SRC}\\b`),
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

function extractPeriodRange(q, now) {
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
  if (period_start > period_end) {
    return {
      ok: false,
      code: "inverted_range",
      error: "el rango inicial es posterior al final; solicita corregirlo.",
      period_start,
      period_end,
      remainder,
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
    };
  }
  return {
    ok: true,
    period_start,
    period_end,
    months,
    remainder,
  };
}

function extractConceptQuery(q) {
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

function extractFolioSearchFilters(question, opts = {}) {
  const q = normalizeQuestion(question);
  const scope = resolveFolioSearchScope(question);
  if (!q) {
    return {
      scope,
      period_mode: "SINGLE",
      period_month: null,
      period_start: null,
      period_end: null,
      concept_query: null,
    };
  }
  const range = extractPeriodRange(q, opts.now);
  if (range) {
    return {
      scope,
      period_mode: "RANGE",
      period_month: null,
      period_start: range.period_start,
      period_end: range.period_end,
      period_code: range.ok ? undefined : range.code,
      error: range.ok ? undefined : range.error,
      concept_query: extractConceptQuery(range.remainder),
    };
  }
  return {
    scope,
    period_mode: "SINGLE",
    period_month: extractPeriodMonth(q, opts.now),
    period_start: null,
    period_end: null,
    concept_query: extractConceptQuery(q),
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
      filters.concept_query
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

function rowMatchesConcept(row, conceptQuery) {
  if (!conceptQuery) return true;
  const queryTokens = tokenizeConcept(conceptQuery);
  if (!queryTokens.length) return true;
  return (
    fieldHasQuerySequence(queryTokens, tokenizeConcept(row && row.concepto)) ||
    fieldHasQuerySequence(queryTokens, tokenizeConcept(row && row.subcategoria))
  );
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
    planta_id: row.planta_id != null ? Number(row.planta_id) : null,
    planta_nombre: row.planta_nombre || null,
    periodo: row.mes_cargo || null,
    categoria: row.categoria || null,
    partida: row.subcategoria || null,
    concepto: row.concepto || null,
    importe: row.importe != null ? Number(row.importe) : null,
    estatus: row.estatus || null,
    source: SOURCE_FOLIOS,
  };
}

async function loadFolioSearchForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question =
    opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const filters = extractFolioSearchFilters(question, { now: opts.now });
  const shaped = {
    planta_id: Number(plantaId),
    scope: filters.scope,
    period_mode: filters.period_mode || "SINGLE",
    period_month: filters.period_month,
    period_start: filters.period_start || null,
    period_end: filters.period_end || null,
    concept_query: filters.concept_query,
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
    const matched = scoped.filter((row) => rowMatchesConcept(row, shaped.concept_query));
    const deduped = dedupFolioRows(matched);
    const records = deduped.map(projectRecord);
    const truncated = records.length > RECORD_LIMIT;
    return {
      ok: true,
      filters: shaped,
      planta_id: Number(plantaId),
      planta_nombre: (records[0] && records[0].planta_nombre) || null,
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
  if (filters.concept_query) bits.push(`concepto ${filters.concept_query}`);
  const filterBit = bits.length ? ` Filtros: ${bits.join(", ")}.` : "";
  const trunc = payload.truncated ? ` Listado truncado a ${RECORD_LIMIT} de ${payload.count} registros.` : "";

  if (!payload.records || payload.records.length === 0) {
    if (filters.scope === SCOPE_SUPPORT_FAMILIES) {
      return `No encontré apoyos en GASTOS, INVERSIONES o TALLER con esos filtros.${filterBit}`;
    }
    return `No encontré folios con esos filtros.${filterBit}`;
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
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
    },
    folio_search: okPayload
      ? {
          semantic_class: SEMANTIC_CLASS,
          filters: payload.filters,
          source: payload.source || SOURCE_FOLIOS,
          count: payload.count,
          truncated: payload.truncated,
          records: payload.records,
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
  resolveFolioSearchScope,
  extractFolioSearchFilters,
  isFolioSearchQuestion,
  supportFamilyOf,
  loadFolioSearchForChat,
  buildFolioSearchAnswer,
  buildFolioSearchChatResult,
};
