"use strict";

/**
 * Chat legado: client_profile (read model longitudinal B).
 * Runtime alinea meses. Sin persistencia. Sin HTTP.
 * Comments: cliente_key primero; complemento nombre+planta (loader existente).
 * Ingreso actual: no soportado. AR board: sin cliente_key.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { buildClienteKey, getCanonicalPlantaId, getPlantaIdsEquivalentes } = require("./dicf-acciones");
const { isCommercialTrendQuestion, formatOneRegisteredComment } = require("./director-ia-commercial-trend");
const { loadRecentCommentsByClienteNombres } = require("./cliente-comentarios");
const { ACCION_TOKEN_RE, hasProperPersonSpan } = require("./director-ia-action-person");
const { isExpedienteComercialQuestion } = require("./director-ia-m11-commercial-dossier");
const { resolvePlantCodes, canalSqlFor } = require("./commercial-trend-engine");

const SEMANTIC_CLASS = "client_profile";

const DICF_GRUPO_LABELS = Object.freeze([
  "Dejaron de comprar",
  "Disminuyeron",
  "Aumentaron",
  "Nuevo",
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

const CLIENT_PROFILE_SYSTEM_ADDENDUM = [
  "EVIDENCIA DE PERFIL LONGITUDINAL DE CLIENTE (chat legado; read model B).",
  "No es IES. No es Reasoning Engine N5. No es commercial_trend OLS. No es brief diario.",
  "El runtime ya resolvió cliente_key, planta, meses calendario alineados, kg/mes y descuento/kg = SUM(monto)/SUM(kg).",
  "Mes actual abierto = PARTIAL. 3 meses calendario != 90 días trailing de commercial_trend.",
  "Si el pack trae requested_range y query_start/query_end, no afirmes cobertura completa de ese rango. Verbaliza solo meses en MESES ALINEADOS. DATA_NOT_FOUND/null no es 0. ZERO_OBSERVED solo si el pack lo marca.",
  "Ingreso mensual actual del cliente NO está disponible. No inventes un número. No pongas 0. No llames actual a la fórmula DICF kg_forecast × (margen − |descuento|).",
  "Comentario = declaración registrada, no causa. Acción DICF = acción registrada, no outcome. Action Register no tiene cliente_key; no lo uses como acción de este cliente.",
  "Coincidencia temporal descuento↑ y volumen↑ != el descuento causó el volumen.",
  "missing != 0. NOT_FOUND_IN_CURRENT_SOURCE != ABSENCE_CONFIRMED.",
  "Prohibido verbalizar «no se han registrado comentarios», «no hay comentarios» o «no existen comentarios» salvo ABSENCE_CONFIRMED (esta ruta no confirma ausencia global).",
  "Prohibido verbalizar «no se han registrado acciones», «no existen acciones» o «no hay acciones para este cliente» de forma global. DICF vacío = no encontré una acción DICF asociada en esta ruta. Action Register no se consultó; no es ABSENCE_CONFIRMED.",
  "Si el pack trae un display/cliente, responde SOLO de ese cliente. No uses un cliente de un turno anterior.",
  "Prohibido: disminuyó porque [comentario] / cayó porque [comentario].",
  "No programes buen/mal. No atribuyas causalidad.",
].join(" ");

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
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

function ymKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(year, month, delta) {
  const idx = year * 12 + (month - 1) + delta;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { year: y, month: m };
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthStartEnd(year, month) {
  const last = lastDayOfMonth(year, month);
  return {
    start: `${ymKey(year, month)}-01`,
    end: `${ymKey(year, month)}-${String(last).padStart(2, "0")}`,
    last_day: last,
  };
}

function defaultThreeMonths(now) {
  const today = cdmxTodayParts(now);
  const m0 = { year: today.year, month: today.month };
  const m1 = addMonths(today.year, today.month, -1);
  const m2 = addMonths(today.year, today.month, -2);
  return [m2, m1, m0].map((m) => ({
    year: m.year,
    month: m.month,
    yyyymm: ymKey(m.year, m.month),
    completeness: m.year === today.year && m.month === today.month ? "PARTIAL" : "COMPLETE",
  }));
}

const LAST_N_WORDS = Object.freeze({
  un: 1,
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
  once: 11,
  doce: 12,
});

const MAX_EXPLICIT_MONTHS = 24;

function monthSpec(year, month, today) {
  return {
    year,
    month,
    yyyymm: ymKey(year, month),
    completeness: year === today.year && month === today.month ? "PARTIAL" : "COMPLETE",
  };
}

function ymIndex(year, month) {
  return Number(year) * 12 + (Number(month) - 1);
}

const AFTER_MONTH_STOP = new Set([
  "a",
  "al",
  "de",
  "del",
  "en",
  "la",
  "el",
  "los",
  "las",
  "fecha",
  "ano",
  "mes",
  "meses",
  "hasta",
  "desde",
  "hoy",
  "contra",
  "versus",
  "vs",
  "y",
  "o",
  ...Object.keys(MONTH_NAME_TO_NUM),
]);

function isPersonLikeMonthMention(q, mention) {
  const after = String(q || "")
    .slice(mention.end)
    .trim();
  const next = (after.match(/^([a-z0-9]+)/) || [])[1];
  if (!next || AFTER_MONTH_STOP.has(next) || /^\d+$/.test(next)) return false;
  return next.length >= 3;
}

function findMonthMentions(q) {
  const found = [];
  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    const re = new RegExp(`\\b${name}\\b`, "g");
    let m;
    while ((m = re.exec(q))) {
      const hit = { name, month: num, index: m.index, end: m.index + name.length };
      if (isPersonLikeMonthMention(q, hit)) continue;
      found.push(hit);
    }
  }
  return found.sort((a, b) => a.index - b.index || a.month - b.month);
}

function singleMonthHasCue(q, mention) {
  const before = q.slice(Math.max(0, mention.index - 24), mention.index);
  return (
    /\b(en|solo|durante)\s+(el\s+)?(mes\s+de\s+)?$/.test(before) ||
    /\bmes de\s+$/.test(before)
  );
}

function yearNearMonth(q, mention) {
  const after = q.slice(mention.end, mention.end + 18);
  const mAfter = after.match(/^\s*(de\s+)?(20\d{2})\b/);
  if (mAfter) return Number(mAfter[2]);
  const before = q.slice(Math.max(0, mention.index - 18), mention.index);
  const mBefore = before.match(/\b(20\d{2})\s*(de\s+)?$/);
  if (mBefore) return Number(mBefore[1]);
  return null;
}

function assignYear(month, yearHint, today) {
  if (Number.isFinite(yearHint) && yearHint >= 2000 && yearHint <= 2100) {
    return { year: yearHint, month };
  }
  let year = today.year;
  if (month > today.month) year -= 1;
  return { year, month };
}

function clipToToday(spec, today) {
  if (ymIndex(spec.year, spec.month) > ymIndex(today.year, today.month)) {
    return { year: today.year, month: today.month };
  }
  return spec;
}

function expandInclusive(start, end, today) {
  const s = clipToToday(start, today);
  const e = clipToToday(end, today);
  if (ymIndex(s.year, s.month) > ymIndex(e.year, e.month)) return [];
  const out = [];
  let cur = { year: s.year, month: s.month };
  while (ymIndex(cur.year, cur.month) <= ymIndex(e.year, e.month)) {
    out.push(monthSpec(cur.year, cur.month, today));
    cur = addMonths(cur.year, cur.month, 1);
  }
  return out.length > MAX_EXPLICIT_MONTHS ? [] : out;
}

function parseLastNMonths(q, today) {
  if (/\b90\s+dias\b/.test(q) || /\bultimos?\s+90\b/.test(q)) return null;
  const m = q.match(
    /\bultimos?\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+meses?\b/
  );
  if (m) {
    let n = Number(m[1]);
    if (!Number.isFinite(n)) n = LAST_N_WORDS[m[1]];
    if (!Number.isFinite(n) || n < 1 || n > MAX_EXPLICIT_MONTHS) return { error: "invalid_last_n" };
    const start = addMonths(today.year, today.month, -(n - 1));
    return expandInclusive(start, { year: today.year, month: today.month }, today);
  }
  if (/\bultimo mes\b/.test(q)) {
    return expandInclusive({ year: today.year, month: today.month }, { year: today.year, month: today.month }, today);
  }
  return null;
}

function parseYearSpan(q, today) {
  if (/\b(todo el ano|este ano|durante este ano|todo este ano)\b/.test(q)) {
    return expandInclusive({ year: today.year, month: 1 }, { year: today.year, month: today.month }, today);
  }
  const namedYear = q.match(/\b(?:todo|durante)\s+(20\d{2})\b/);
  if (namedYear) {
    const y = Number(namedYear[1]);
    if (y > today.year) return { error: "future_year" };
    const end = y === today.year ? { year: y, month: today.month } : { year: y, month: 12 };
    return expandInclusive({ year: y, month: 1 }, end, today);
  }
  return null;
}

function twoMonthConnector(q, first, second) {
  const between = q.slice(first.end, second.index);
  if (/\b(contra|versus|vs)\b/.test(q) || /\bcompar/.test(q)) return "compare";
  if (/\ba la fecha\b/.test(q) || /\bhasta la fecha\b/.test(q)) return "open_end";
  if (/\b(hasta|a)\b/.test(between) || /\bdesde\b/.test(q)) return "range";
  if (/^\s*y\s+$/.test(between)) return "compare";
  return "range";
}

function resolveTwoMonthRange(first, second, q, today) {
  let start = assignYear(first.month, yearNearMonth(q, first), today);
  let end = assignYear(second.month, yearNearMonth(q, second), today);
  if (ymIndex(start.year, start.month) > ymIndex(end.year, end.month) && first.month > second.month) {
    if (!yearNearMonth(q, first)) start = { year: start.year - 1, month: start.month };
  }
  if (ymIndex(start.year, start.month) > ymIndex(end.year, end.month)) return [];
  return expandInclusive(start, end, today);
}

function parseExplicitPeriod(raw, now) {
  const q = normalizeQuestion(raw);
  if (!q) return { months: null, error: null, source: null };
  const today = cdmxTodayParts(now);
  const todaySpec = { year: today.year, month: today.month };

  const lastN = parseLastNMonths(q, today);
  if (lastN && lastN.error) return { months: null, error: lastN.error, source: "explicit" };
  if (Array.isArray(lastN) && lastN.length) return { months: lastN, error: null, source: "explicit" };

  const yearSpan = parseYearSpan(q, today);
  if (yearSpan && yearSpan.error) return { months: null, error: yearSpan.error, source: "explicit" };
  if (Array.isArray(yearSpan) && yearSpan.length) return { months: yearSpan, error: null, source: "explicit" };

  const mentions = findMonthMentions(q);
  const openEnd = /\ba la fecha\b/.test(q) || /\bhasta la fecha\b/.test(q) || /\bhasta hoy\b/.test(q);
  const desde = /\bdesde\b/.test(q);

  if (mentions.length >= 1 && (desde || openEnd)) {
    if (mentions.length >= 2 && !openEnd) {
      const months = resolveTwoMonthRange(mentions[0], mentions[1], q, today);
      if (!months.length) return { months: null, error: "ambiguous_period", source: "explicit" };
      return { months, error: null, source: "explicit" };
    }
    const start = assignYear(mentions[0].month, yearNearMonth(q, mentions[0]), today);
    const months = expandInclusive(start, todaySpec, today);
    if (!months.length) return { months: null, error: "ambiguous_period", source: "explicit" };
    return { months, error: null, source: "explicit" };
  }

  if (mentions.length >= 2) {
    const kind = twoMonthConnector(q, mentions[0], mentions[1]);
    if (kind === "compare") {
      const a = assignYear(mentions[0].month, yearNearMonth(q, mentions[0]), today);
      const b = assignYear(mentions[1].month, yearNearMonth(q, mentions[1]), today);
      const months = [monthSpec(a.year, a.month, today), monthSpec(b.year, b.month, today)].sort((x, y) =>
        x.yyyymm.localeCompare(y.yyyymm)
      );
      return { months, error: null, source: "explicit" };
    }
    const months = resolveTwoMonthRange(mentions[0], mentions[1], q, today);
    if (!months.length) return { months: null, error: "ambiguous_period", source: "explicit" };
    return { months, error: null, source: "explicit" };
  }

  if (mentions.length === 1 && singleMonthHasCue(q, mentions[0])) {
    const one = assignYear(mentions[0].month, yearNearMonth(q, mentions[0]), today);
    return { months: [monthSpec(one.year, one.month, today)], error: null, source: "explicit" };
  }

  return { months: null, error: null, source: null };
}

function parseExplicitMonths(raw, now) {
  const parsed = parseExplicitPeriod(raw, now);
  return parsed.months && parsed.months.length ? parsed.months : null;
}

function chronologicalQueryWindow(months) {
  const sorted = (months || [])
    .filter((m) => m && m.yyyymm)
    .slice()
    .sort((a, b) => String(a.yyyymm).localeCompare(String(b.yyyymm)));
  if (!sorted.length) return { start: null, end: null, first: null, last: null };
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    start: monthStartEnd(first.year, first.month).start,
    end: monthStartEnd(last.year, last.month).end,
    first,
    last,
  };
}

function requestedRangeFromMonths(months) {
  const window = chronologicalQueryWindow(months);
  if (!window.first || !window.last) return null;
  return { start: window.first.yyyymm, end: window.last.yyyymm };
}

function asksTrailingNinetyDays(raw) {
  const q = normalizeQuestion(raw);
  return /\b90\s+dias\b/.test(q) || /\bultimos?\s+90\b/.test(q);
}

function sanitizePeriodMonths(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      if (typeof m === "string" && /^\d{4}-\d{2}$/.test(m)) {
        const [y, mo] = m.split("-").map(Number);
        return { year: y, month: mo, yyyymm: m };
      }
      if (m && typeof m === "object" && m.yyyymm && /^\d{4}-\d{2}$/.test(m.yyyymm)) {
        return {
          year: Number(m.year) || Number(m.yyyymm.slice(0, 4)),
          month: Number(m.month) || Number(m.yyyymm.slice(5, 7)),
          yyyymm: m.yyyymm,
          completeness: m.completeness === "PARTIAL" ? "PARTIAL" : "COMPLETE",
        };
      }
      return null;
    })
    .filter(Boolean);
}

function hasExplicitClientAnchor(q) {
  return (
    /\bclientes?\b/.test(q) ||
    /\beste cliente\b/.test(q) ||
    /\bese cliente\b/.test(q) ||
    /\beste senor\b/.test(q)
  );
}

const NAME_STOP = new Set([
  "que",
  "de",
  "el",
  "la",
  "los",
  "las",
  "en",
  "un",
  "una",
  "del",
  "este",
  "ese",
  "esta",
  "puebla",
  "casa",
  "comisionista",
  "comisionistas",
  "cliente",
  "clientes",
  "mes",
  "meses",
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
  "director",
  "hola",
]);

function hasNamedClientToken(raw) {
  const tokens = String(raw || "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.some((t, i) => {
    if (i === 0) return false;
    if (/^(?:at|pt|s|c|u)[-\s]?\d+/i.test(t)) return false;
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(t)) return false;
    const n = t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return n.length >= 3 && !NAME_STOP.has(n);
  });
}

function isTopVolumeQuestion(q) {
  if (/\b(mayor|mas)\b/.test(q) && /\b(volumen|kg)\b/.test(q)) return true;
  if (/\bquien\b/.test(q) && /\bmas\b/.test(q) && /\b(compr|volumen|kg)\b/.test(q)) return true;
  return false;
}

function namesMonthlyMetric(q) {
  const monthly = /\bmes(es)?\b/.test(q) || /\bmensual\b/.test(q);
  const metric =
    /\bcompr/.test(q) ||
    /\bdescuento/.test(q) ||
    /\bvolumen\b/.test(q) ||
    /\bkg\b/.test(q) ||
    /\bcomport/.test(q) ||
    /\bmovid/.test(q);
  return monthly && metric;
}

function namesIncomeQuestion(q) {
  return /\bingreso/.test(q);
}

function namesProfileContext(q, opts = {}) {
  if (/\bsabemos\b/.test(q)) return true;
  if (/\bcomentari/.test(q) && !/\bfolio/.test(q)) return true;
  if (/\bhistorial comercial\b/.test(q)) return true;
  if (/\bviene\b/.test(q) && (hasExplicitClientAnchor(q) || opts.hasActiveClient)) return true;
  if (/\bhablame\b/.test(q) && /\bcliente\b/.test(q)) return true;
  if (/\baccion/.test(q) && !/\bvencid/.test(q) && !/\batrasad/.test(q)) {
    return Boolean(hasExplicitClientAnchor(q) || opts.hasActiveClient);
  }
  return false;
}

function isPlantWideMonthlyFinancialQuestion(q) {
  if (/\bcliente\b/.test(q)) return false;
  if (!/\b(descuento|rentabilidad|utilidad|resultado\s+final)\b/.test(q)) return false;
  return /\bcomo\s+va/.test(q);
}

function isClientProfileQuestion(raw, opts = {}) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (isPlantWideMonthlyFinancialQuestion(q) && !opts.hasActiveClient && !hasExplicitClientAnchor(q)) {
    return false;
  }
  if (/\bayer\b/.test(q) && !/\bmes/.test(q)) return false;
  if (/\bexpediente\b/.test(q)) return false;
  if (typeof isExpedienteComercialQuestion === "function" && isExpedienteComercialQuestion(raw)) return false;
  if (/\bsabemos\s+comercialmente\b/.test(q)) return false;
  if (/\bbitacora\b/.test(q) || /\bplaud\b/.test(q)) return false;
  if (/\bdejaron\s+de\s+comprar\b/.test(q) || /\bdisminuyeron\b/.test(q)) return false;
  if (/\banalisis\b/.test(q) || /\bexplica\b/.test(q)) return false;
  if (/\bfolio/.test(q)) return false;
  if (isCommercialTrendQuestion(raw) && !opts.hasActiveClient && !hasExplicitClientAnchor(q)) {
    return false;
  }
  if (ACCION_TOKEN_RE.test(q) && hasProperPersonSpan(raw) && !hasExplicitClientAnchor(q)) {
    return false;
  }
  if (isTopVolumeQuestion(q)) return true;
  if (hasExplicitClientAnchor(q) && (namesMonthlyMetric(q) || namesProfileContext(q, opts) || namesIncomeQuestion(q))) {
    return true;
  }
  if (opts.hasActiveClient && (namesMonthlyMetric(q) || namesProfileContext(q, opts) || namesIncomeQuestion(q))) {
    return true;
  }
  if (namesProfileContext(q, opts) && (hasExplicitClientAnchor(q) || opts.hasActiveClient || hasNamedClientToken(raw))) {
    return true;
  }
  if (namesMonthlyMetric(q) && (hasExplicitClientAnchor(q) || hasNamedClientToken(raw))) return true;
  const explicitPeriod = parseExplicitPeriod(raw, opts.now);
  if (explicitPeriod.months && explicitPeriod.months.length) {
    if (hasExplicitClientAnchor(q) || opts.hasActiveClient || hasNamedClientToken(raw)) return true;
  }
  return false;
}

function isClientProfileFollowUp(raw, kind, opts = {}) {
  if (kind === "pronoun" || kind === "action") return true;
  return isClientProfileQuestion(raw, { ...opts, hasActiveClient: true });
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function assertClientProfileAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA") {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para KPIs financieros (GA restringido).",
    };
  }
  if (role === "GV") {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) no tiene acceso a la serie comercial ARR.",
    };
  }
  if (["GG", "AD"].includes(role) && auth && auth.plantas_permitidas?.length > 0) {
    const pid = Number(plantaId);
    const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
    if (!pid || !allowed.includes(pid)) {
      return {
        ok: false,
        abort: true,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para esta planta",
      };
    }
  }
  if (!role) {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    };
  }
  const pid = Number(plantaId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return {
      ok: false,
      abort: true,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  return { ok: true };
}

function deriveClienteKeys(plantaId, canal, subcanal, clienteNorm) {
  const canon = getCanonicalPlantaId(plantaId);
  if (!Number.isFinite(Number(canon)) || Number(canon) <= 0) return [];
  const keys = [];
  for (const grupo of DICF_GRUPO_LABELS) {
    const k = buildClienteKey(canon, grupo, canal || "", subcanal || "", clienteNorm || "");
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

function discountPerKg(montoSum, kgSum) {
  if (kgSum == null || !Number.isFinite(Number(kgSum)) || Number(kgSum) <= 0) return null;
  if (montoSum == null || !Number.isFinite(Number(montoSum))) return null;
  return Number(montoSum) / Number(kgSum);
}

function identityKey(clienteNorm, canal, subcanal) {
  return [String(clienteNorm || "").trim(), String(canal || "").trim(), String(subcanal || "").trim()].join("|");
}

function canalLabelFromFilter(channel) {
  if (channel === "comisionista") return "Comisionista";
  if (channel === "casa") return "Casa";
  return "";
}

function resolveClientProfileSlots(question, inherited = {}, now) {
  const parsed = parseExplicitPeriod(question, now);
  const inheritedMonths = sanitizePeriodMonths(inherited.active_period_months);
  const today = cdmxTodayParts(now);
  let months;
  let period_source;
  if (parsed.months && parsed.months.length) {
    months = parsed.months;
    period_source = "explicit";
  } else if (parsed.error) {
    months = [];
    period_source = "explicit";
  } else if (inheritedMonths.length) {
    months = inheritedMonths.map((m) => monthSpec(m.year, m.month, today));
    period_source = "inherited";
  } else {
    months = defaultThreeMonths(now);
    period_source = "default";
  }
  const window = chronologicalQueryWindow(months);
  let channel = inherited.channel || inherited.active_channel || null;
  const q = normalizeQuestion(question);
  if (/\bcomisionistas?\b/.test(q) && !/\bcasa\b/.test(q)) channel = "comisionista";
  else if (/\bcasa\b/.test(q) && !/\bcomisionistas?\b/.test(q)) channel = "casa";
  return {
    months,
    channel: channel === "casa" || channel === "comisionista" ? channel : null,
    trailing_90_asked: asksTrailingNinetyDays(question),
    top_volume: isTopVolumeQuestion(q),
    period_source,
    period_error: parsed.error || null,
    requested_range: requestedRangeFromMonths(months),
    query_start: window.start,
    query_end: window.end,
  };
}

function markPartialMonths(months, today, plantMaxFechaByMonth) {
  return (months || []).map((m) => {
    const bounds = monthStartEnd(m.year, m.month);
    const isCurrent = today.year === m.year && today.month === m.month;
    const maxF = plantMaxFechaByMonth && plantMaxFechaByMonth.get(m.yyyymm);
    let completeness = m.completeness || "COMPLETE";
    if (isCurrent && today.day < bounds.last_day) completeness = "PARTIAL";
    if (isCurrent && maxF && maxF < bounds.end) completeness = "PARTIAL";
    return { ...m, completeness, start: bounds.start, end: bounds.end };
  });
}

function alignMonthlyRows(months, clientSalesByMonth, clientDiscountByMonth, plantSalesMonths, plantDiscountMonths) {
  return (months || []).map((m) => {
    const salesCovered = plantSalesMonths.has(m.yyyymm);
    const discountCovered = plantDiscountMonths.has(m.yyyymm);
    const sales = clientSalesByMonth.get(m.yyyymm);
    const disc = clientDiscountByMonth.get(m.yyyymm);
    let kg = null;
    let kg_status = "DATA_NOT_FOUND";
    if (!salesCovered) {
      kg = null;
      kg_status = "DATA_NOT_FOUND";
    } else if (sales == null) {
      kg = 0;
      kg_status = "ZERO_OBSERVED";
    } else {
      kg = Number(sales.kg) || 0;
      kg_status = "OK";
    }

    let monto = null;
    let discount_per_kg = null;
    let discount_status = "DATA_NOT_FOUND";
    if (!discountCovered && !salesCovered) {
      monto = null;
      discount_per_kg = null;
      discount_status = "DATA_NOT_FOUND";
    } else if (!discountCovered) {
      monto = null;
      discount_per_kg = null;
      discount_status = "DATA_NOT_FOUND";
    } else if (disc == null) {
      monto = 0;
      discount_per_kg = kg != null && kg > 0 ? 0 : null;
      discount_status = kg != null && kg > 0 ? "ZERO_OBSERVED" : "NULL_DENOMINATOR";
    } else {
      monto = Number(disc.monto) || 0;
      discount_per_kg = discountPerKg(monto, kg);
      discount_status = discount_per_kg == null ? "NULL_DENOMINATOR" : "OK";
    }

    return {
      month: m.yyyymm,
      completeness: m.completeness,
      kg,
      kg_status,
      discount_monto: monto,
      discount_per_kg,
      discount_status,
      income_actual: null,
      income_status: "UNSUPPORTED_METRIC",
    };
  });
}

function monthOverMonth(rows, field) {
  const out = [];
  for (let i = 1; i < (rows || []).length; i++) {
    const prev = rows[i - 1][field];
    const cur = rows[i][field];
    if (prev == null || cur == null || !Number.isFinite(Number(prev)) || !Number.isFinite(Number(cur))) {
      out.push({ from: rows[i - 1].month, to: rows[i].month, delta: null, direction: "INSUFFICIENT_DATA" });
      continue;
    }
    const delta = Number(cur) - Number(prev);
    out.push({
      from: rows[i - 1].month,
      to: rows[i].month,
      delta,
      direction: delta > 0 ? "UP" : delta < 0 ? "DOWN" : "FLAT",
    });
  }
  return out;
}

function firstVsLast(rows, field) {
  if (!rows || rows.length < 2) return { delta: null, direction: "INSUFFICIENT_DATA" };
  const first = rows[0][field];
  const last = rows[rows.length - 1][field];
  if (first == null || last == null || !Number.isFinite(Number(first)) || !Number.isFinite(Number(last))) {
    return { delta: null, direction: "INSUFFICIENT_DATA" };
  }
  const delta = Number(last) - Number(first);
  return { delta, direction: delta > 0 ? "UP" : delta < 0 ? "DOWN" : "FLAT" };
}

function rankClientsByKg(salesRows, monthsSet) {
  const totals = new Map();
  for (const row of salesRows || []) {
    if (monthsSet && !monthsSet.has(row.month)) continue;
    const id = identityKey(row.cliente_norm, row.canal, row.subcanal);
    if (!row.cliente_norm) continue;
    const prev = totals.get(id) || {
      cliente_norm: row.cliente_norm,
      canal: row.canal,
      subcanal: row.subcanal,
      kg: 0,
    };
    prev.kg += Number(row.kg) || 0;
    totals.set(id, prev);
  }
  return [...totals.values()].sort((a, b) => b.kg - a.kg);
}

function exactNorm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function explicitClientHintTakesPrecedence(entityHint, inheritedNorm) {
  const hint = exactNorm(entityHint);
  const inherited = exactNorm(inheritedNorm);
  if (!hint) return false;
  if (!inherited) return true;
  return hint !== inherited;
}

function channelNamedInQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (/\bcomisionistas?\b/.test(q) && !/\bcasa\b/.test(q)) return "comisionista";
  if (/\bcasa\b/.test(q) && !/\bcomisionistas?\b/.test(q)) return "casa";
  return null;
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

async function queryMonthlySales(client, codesUpper, startStr, endStr, canalFilter) {
  const canalSql = canalSqlFor(canalFilter || "ambos", "sales");
  return client.query(
    `SELECT to_char(v.fecha::date, 'YYYY-MM') AS month,
            TRIM(v.cliente_norm) AS cliente_norm,
            TRIM(COALESCE(cat.canal, v.canal, 'Casa')) AS canal,
            TRIM(COALESCE(cat.subcanal, v.subcanal, '')) AS subcanal,
            SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       LEFT JOIN arr.cliente_categoria_mes cat
         ON UPPER(TRIM(cat.plant_code)) = UPPER(TRIM(v.plant_code))
        AND cat.year = EXTRACT(YEAR FROM v.fecha)::int
        AND cat.month = EXTRACT(MONTH FROM v.fecha)::int
        AND cat.cliente_norm = v.cliente_norm
      WHERE UPPER(TRIM(v.plant_code)) = ANY($1::text[])
        AND v.fecha >= $2::date
        AND v.fecha <= $3::date
        ${canalSql}
      GROUP BY 1, 2, 3, 4`,
    [codesUpper, startStr, endStr]
  );
}

async function queryMonthlyDiscount(client, codesUpper, startStr, endStr, canalFilter) {
  const canalSql = canalSqlFor(canalFilter || "ambos", "discount");
  return client.query(
    `SELECT to_char(d.fecha::date, 'YYYY-MM') AS month,
            TRIM(d.cliente_norm) AS cliente_norm,
            TRIM(COALESCE(cat.canal, 'Casa')) AS canal,
            TRIM(COALESCE(cat.subcanal, '')) AS subcanal,
            SUM(d.monto) AS monto
       FROM arr.descuentos_diarios_cliente d
       LEFT JOIN arr.cliente_categoria_mes cat
         ON UPPER(TRIM(cat.plant_code)) = UPPER(TRIM(d.plant_code))
        AND cat.year = EXTRACT(YEAR FROM d.fecha)::int
        AND cat.month = EXTRACT(MONTH FROM d.fecha)::int
        AND cat.cliente_norm = d.cliente_norm
      WHERE UPPER(TRIM(d.plant_code)) = ANY($1::text[])
        AND d.fecha >= $2::date
        AND d.fecha <= $3::date
        ${canalSql}
      GROUP BY 1, 2, 3, 4`,
    [codesUpper, startStr, endStr]
  );
}

async function queryCommentsByKeys(client, plantaId, keys) {
  if (!keys.length) return [];
  const r = await client.query(
    `SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal, body,
            author_name, created_at
       FROM arr.cliente_comentarios
      WHERE planta_id = $1
        AND is_active = true
        AND cliente_key IS NOT NULL
        AND TRIM(cliente_key) <> ''
        AND cliente_key = ANY($2::text[])
      ORDER BY created_at DESC, id DESC`,
    [plantaId, keys]
  );
  return r.rows || [];
}

function commentDedupeKey(c) {
  const body = String((c && c.body) || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const raw = c && c.created_at;
  const day = raw
    ? String(raw instanceof Date ? raw.toISOString() : raw)
        .trim()
        .slice(0, 10)
    : "";
  return `${body}|${day}`;
}

function mergeCommentsByKeyThenNombre(byKey, byNombre) {
  const out = [];
  const seen = new Set();
  for (const c of byKey || []) {
    if (!c || !String(c.body || "").trim()) continue;
    const k = commentDedupeKey(c);
    seen.add(k);
    out.push({ ...c, source_join: c.source_join || "cliente_key" });
  }
  for (const c of byNombre || []) {
    if (!c || !String(c.body || "").trim()) continue;
    const k = commentDedupeKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      body: String(c.body || "").trim(),
      author_name: String((c && c.author_name) || "").trim(),
      created_at: c.created_at || "",
      cliente_key: c.cliente_key || null,
      source_join: "nombre_planta",
    });
  }
  return out;
}

async function loadNombrePlantaComments(client, plantaId, nombre, opts = {}) {
  const label = String(nombre || "").trim();
  if (!label) return [];
  const loadFn = opts.loadRecentCommentsByClienteNombres || loadRecentCommentsByClienteNombres;
  const canon = getCanonicalPlantaId(plantaId);
  const plantaIds = Number.isFinite(Number(canon)) && Number(canon) > 0 ? getPlantaIdsEquivalentes(canon) : [];
  if (!plantaIds.length) return [];
  try {
    const byNombre = await loadFn(client, { plantaIds, nombres: [label], limitPerCliente: 2 });
    const mapKey = label.toLowerCase();
    if (byNombre && typeof byNombre.get === "function") {
      const found = byNombre.get(mapKey);
      return Array.isArray(found) ? found : [];
    }
    return [];
  } catch (_e) {
    return [];
  }
}

async function queryActionsByKeys(client, plantaIds, keys) {
  if (!keys.length || !plantaIds.length) return [];
  const r = await client.query(
    `SELECT a.id, a.public_code, a.planta_id, a.cliente_key, a.cliente_nombre,
            a.canal, a.subcanal, a.grupo_tipo, a.descripcion, a.estado,
            a.fecha_compromiso, a.resultado_cierre, a.cerrado_at, a.created_at,
            COALESCE(NULLIF(TRIM(COALESCE(rp.nombre_persona,'')), ''), rp.nombre) AS responsable
       FROM arr.dicf_acciones a
       LEFT JOIN public.usuarios rp ON rp.id = a.responsable_usuario_id
      WHERE a.planta_id = ANY($1::int[])
        AND a.cliente_key = ANY($2::text[])
      ORDER BY a.created_at DESC, a.id DESC`,
    [plantaIds, keys]
  );
  return r.rows || [];
}

async function queryHistorialForActions(client, actionIds) {
  const ids = [...new Set((actionIds || []).map((x) => Number(x)).filter(Number.isFinite))];
  if (!ids.length) return new Map();
  const r = await client.query(
    `SELECT h.accion_id, h.evento, h.detalle, h.creado_en,
            COALESCE(NULLIF(TRIM(COALESCE(u.nombre_persona,'')), ''), u.nombre) AS actor_nombre
       FROM arr.dicf_accion_historial h
       LEFT JOIN public.usuarios u ON u.id = h.actor_usuario_id
      WHERE h.accion_id = ANY($1::int[])
      ORDER BY h.accion_id ASC, h.creado_en ASC, h.id ASC`,
    [ids]
  );
  const map = new Map();
  for (const row of r.rows || []) {
    const id = Number(row.accion_id);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

function filterRowsForIdentity(rows, identity) {
  return (rows || []).filter((r) => {
    if (identity.cliente_norm && exactNorm(r.cliente_norm) !== exactNorm(identity.cliente_norm)) return false;
    if (identity.canal && exactNorm(r.canal) !== exactNorm(identity.canal)) return false;
    if (identity.subcanal != null && identity.subcanal !== "" && exactNorm(r.subcanal) !== exactNorm(identity.subcanal)) {
      return false;
    }
    return true;
  });
}

function mapByMonth(rows, valueKey) {
  const m = new Map();
  for (const r of rows || []) {
    const prev = m.get(r.month) || { kg: 0, monto: 0 };
    if (valueKey === "kg") prev.kg += Number(r.kg) || 0;
    if (valueKey === "monto") prev.monto += Number(r.monto) || 0;
    m.set(r.month, prev);
  }
  return m;
}

function assembleClientProfilePack(input) {
  const months = input.months || [];
  const identity = input.identity;
  const salesForClient = filterRowsForIdentity(input.salesRows, identity);
  const discForClient = filterRowsForIdentity(input.discountRows, identity);
  const plantSalesMonths = new Set((input.salesRows || []).map((r) => r.month));
  const plantDiscountMonths = new Set((input.discountRows || []).map((r) => r.month));
  const rows = alignMonthlyRows(
    months,
    mapByMonth(salesForClient, "kg"),
    mapByMonth(discForClient, "monto"),
    plantSalesMonths,
    plantDiscountMonths
  );

  const limitations = [...(input.limitations || [])];
  limitations.push("income_actual_unsupported");
  limitations.push("action_register_has_no_cliente_key");
  if (input.trailing_90_asked) limitations.push("trailing_90_days_is_commercial_trend_grain");
  if (!input.commentsQueried) limitations.push("comments_not_queried");
  else if (!(input.comments || []).length) {
    limitations.push("comments_none_for_requested_joins");
    limitations.push("comments_absence_not_confirmed");
    if (input.commentsKeyEmpty !== false) limitations.push("comments_none_for_cliente_key");
    if (input.commentsNombreQueried && input.commentsNombreEmpty) {
      limitations.push("comments_none_for_nombre_planta");
    }
  }
  if (!input.actionsQueried) limitations.push("dicf_actions_not_queried");
  else if (!(input.actions || []).length) {
    limitations.push("dicf_actions_none_for_cliente_key");
    limitations.push("actions_absence_not_confirmed");
  }
  if (rows.some((r) => r.kg_status === "DATA_NOT_FOUND")) limitations.push("one_or_more_months_sales_missing");
  if (rows.some((r) => r.discount_status === "DATA_NOT_FOUND")) limitations.push("one_or_more_months_discount_missing");

  const keys = identity.cliente_keys || [];
  return {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    identity: {
      cliente_key: keys[0] || null,
      cliente_keys: keys,
      display_name: identity.display_name,
      cliente_norm: identity.cliente_norm,
      canal: identity.canal || null,
      subcanal: identity.subcanal || "",
      plant: input.plant,
    },
    period: {
      months: months.map((m) => m.yyyymm),
      markers: months.map((m) => ({ month: m.yyyymm, completeness: m.completeness })),
      grain: "calendar_month",
      not: "commercial_trend_trailing_90d",
      requested_range: input.requested_range || requestedRangeFromMonths(months),
      query_start: input.query_start || chronologicalQueryWindow(months).start,
      query_end: input.query_end || chronologicalQueryWindow(months).end,
      source: input.period_source || null,
    },
    monthly_rows: rows,
    trends: {
      kg_mom: monthOverMonth(rows, "kg"),
      discount_mom: monthOverMonth(rows, "discount_per_kg"),
      kg_first_vs_last: firstVsLast(rows, "kg"),
      discount_first_vs_last: firstVsLast(rows, "discount_per_kg"),
      engine: "monthly_buckets_not_ols",
    },
    comments: input.comments || [],
    dicf_actions: input.actions || [],
    action_register: {
      supported: false,
      reason: "arr.action_register_items has no cliente_key",
    },
    income: {
      actual_supported: false,
      status: "UNSUPPORTED_METRIC",
      physical_existing: "DICF formula kg_forecast * (margen - |descuento|) is not actual income",
    },
    limitations: [...new Set(limitations)],
    provenance: {
      sales: "arr.ventas_diarias_cliente",
      discount: "arr.descuentos_diarios_cliente",
      comments: input.commentsNombreQueried
        ? "arr.cliente_comentarios by cliente_key then nombre+planta complement"
        : "arr.cliente_comentarios by cliente_key",
      dicf: "arr.dicf_acciones by cliente_key",
      historial: "arr.dicf_accion_historial",
      join: input.commentsNombreUsed ? "cliente_key+nombre_planta" : "cliente_key",
      name_join: Boolean(input.commentsNombreUsed),
      name_join_attempted: Boolean(input.commentsNombreQueried),
      aligned_before_gpt: true,
    },
    assembly_status: "ok",
    partial: rows.some((r) => r.completeness === "PARTIAL") || rows.some((r) => r.kg_status !== "OK"),
  };
}

async function loadClientProfileForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || {};
  const access = assertClientProfileAccess(auth, plantaId);
  if (!access.ok) return access;

  const now = opts.now || new Date();
  const slots = resolveClientProfileSlots(opts.question, opts, now);
  if (slots.period_error && !(slots.months && slots.months.length)) {
    return {
      ok: true,
      needs_clarification: true,
      clarification: { status: "ambiguous_period", hint: slots.period_error },
      period: {
        months: [],
        requested_range: null,
        query_start: null,
        query_end: null,
        source: "explicit",
      },
      semantic_class: SEMANTIC_CLASS,
    };
  }
  const currentHintEarly = String(opts.entity_hint || "").trim();
  const inheritedNormEarly = opts.cliente_norm ? String(opts.cliente_norm).trim() : "";
  const hintTakesPrecedence = explicitClientHintTakesPrecedence(currentHintEarly, inheritedNormEarly);
  if (hintTakesPrecedence) {
    slots.channel = channelNamedInQuestion(opts.question);
  }
  const today = cdmxTodayParts(now);

  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const injectedRead =
    typeof opts.resolvePlanta === "function" &&
    (typeof opts.queryMonthlySales === "function" || typeof opts.resolvePlantCodes === "function");
  let client = null;
  const acquire = async () => {
    if (opts.client) return opts.client;
    if (injectedRead && (!pool || typeof pool.connect !== "function")) {
      return { query: async () => ({ rows: [] }) };
    }
    if (!pool || typeof pool.connect !== "function") {
      throw new Error("Pool no configurado para client_profile");
    }
    client = await pool.connect();
    return client;
  };

  try {
    const db = await acquire();
    const planta = await resolvePlanta(db, plantaId);
    if (!planta) {
      return {
        ok: false,
        status: 404,
        error: "Planta no encontrada",
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      };
    }
    const plant = {
      planta_id: Number(planta.id) || Number(plantaId),
      planta_nombre: String(planta.nombre || "").trim(),
      plant_code: planta.clave || null,
    };

    const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
    const codes = await resolveCodes(db, plant.planta_nombre);
    if (!codes || codes.not_found || !(codes.uniqueCodes || []).length) {
      return {
        ok: false,
        status: 404,
        error: "Planta sin códigos ARR",
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      };
    }
    const codesUpper = codes.uniqueCodes.map((c) => String(c).trim().toUpperCase());

    const queryWindow = chronologicalQueryWindow(slots.months);
    const windowStart = queryWindow.start || slots.query_start;
    const windowEnd = queryWindow.end || slots.query_end;
    const canalFilter = slots.channel || "ambos";

    const qSales = opts.queryMonthlySales || queryMonthlySales;
    const qDisc = opts.queryMonthlyDiscount || queryMonthlyDiscount;
    const [salesRes, discRes] = await Promise.all([
      qSales(db, codesUpper, windowStart, windowEnd, canalFilter),
      qDisc(db, codesUpper, windowStart, windowEnd, canalFilter),
    ]);
    const salesRows = (salesRes && salesRes.rows) || salesRes || [];
    const discountRows = (discRes && discRes.rows) || discRes || [];

    const maxByMonth = new Map();
    for (const r of salesRows) {
      const prev = maxByMonth.get(r.month);
      const candidate = `${r.month}-28`;
      if (!prev) maxByMonth.set(r.month, candidate);
    }
    const months = markPartialMonths(slots.months, today, maxByMonth);

    let identity = null;
    let clarification = null;
    const inheritedKeys = []
      .concat(opts.cliente_keys || [])
      .concat(opts.cliente_key ? [opts.cliente_key] : [])
      .map((k) => String(k).trim())
      .filter(Boolean);
    const inheritedNorm = inheritedNormEarly;
    const inheritedCanal = hintTakesPrecedence
      ? canalLabelFromFilter(slots.channel)
      : opts.identity_canal || canalLabelFromFilter(slots.channel);
    const inheritedSub = hintTakesPrecedence
      ? ""
      : opts.identity_subcanal != null
        ? String(opts.identity_subcanal)
        : "";

    if (hintTakesPrecedence) {
      const want = exactNorm(currentHintEarly);
      const ranked = rankClientsByKg(salesRows, new Set(months.map((m) => m.yyyymm)));
      const hits = ranked.filter((c) => exactNorm(c.cliente_norm) === want);
      if (hits.length > 1) {
        clarification = { status: "ambiguous", hint: currentHintEarly, candidates: hits.map((h) => h.cliente_norm) };
      } else if (hits.length === 1) {
        const hit = hits[0];
        identity = {
          cliente_norm: hit.cliente_norm,
          canal: hit.canal,
          subcanal: hit.subcanal,
          display_name: hit.cliente_norm,
          cliente_keys: deriveClienteKeys(plant.planta_id, hit.canal, hit.subcanal, hit.cliente_norm),
        };
      } else {
        identity = {
          cliente_norm: currentHintEarly,
          canal: inheritedCanal || "",
          subcanal: "",
          display_name: currentHintEarly,
          cliente_keys: deriveClienteKeys(plant.planta_id, inheritedCanal || "", "", currentHintEarly),
        };
      }
    } else if (inheritedNorm) {
      identity = {
        cliente_norm: inheritedNorm,
        canal: inheritedCanal || "",
        subcanal: inheritedSub,
        display_name: opts.display_name || inheritedNorm,
        cliente_keys:
          inheritedKeys.length > 0
            ? [...new Set(inheritedKeys)]
            : deriveClienteKeys(plant.planta_id, inheritedCanal, inheritedSub, inheritedNorm),
      };
    } else if (slots.top_volume) {
      const ranked = rankClientsByKg(salesRows, new Set(months.map((m) => m.yyyymm)));
      if (!ranked.length) {
        return {
          ok: false,
          status: 404,
          error: "Sin ventas en la ventana de 3 meses",
          code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        };
      }
      if (ranked.length > 1 && ranked[0].kg === ranked[1].kg) {
        clarification = {
          status: "ambiguous",
          hint: "mayor volumen",
          candidates: ranked.slice(0, 4).map((c) => c.cliente_norm),
        };
      } else {
        const top = ranked[0];
        identity = {
          cliente_norm: top.cliente_norm,
          canal: top.canal,
          subcanal: top.subcanal,
          display_name: top.cliente_norm,
          cliente_keys: deriveClienteKeys(plant.planta_id, top.canal, top.subcanal, top.cliente_norm),
        };
      }
    } else if (opts.entity_hint) {
      const want = exactNorm(opts.entity_hint);
      const ranked = rankClientsByKg(salesRows, new Set(months.map((m) => m.yyyymm)));
      const hits = ranked.filter((c) => exactNorm(c.cliente_norm) === want);
      if (hits.length > 1) {
        clarification = { status: "ambiguous", hint: opts.entity_hint, candidates: hits.map((h) => h.cliente_norm) };
      } else if (hits.length === 1) {
        const hit = hits[0];
        identity = {
          cliente_norm: hit.cliente_norm,
          canal: hit.canal,
          subcanal: hit.subcanal,
          display_name: hit.cliente_norm,
          cliente_keys: deriveClienteKeys(plant.planta_id, hit.canal, hit.subcanal, hit.cliente_norm),
        };
      } else if (inheritedKeys.length && !hintTakesPrecedence) {
        identity = {
          cliente_norm: opts.display_name || opts.entity_hint,
          canal: inheritedCanal || "",
          subcanal: inheritedSub,
          display_name: opts.display_name || opts.entity_hint,
          cliente_keys: [...new Set(inheritedKeys)],
        };
      } else {
        clarification = { status: "not_found", hint: opts.entity_hint };
      }
    } else if (inheritedKeys.length) {
      identity = {
        cliente_norm: opts.display_name || "",
        canal: inheritedCanal || "",
        subcanal: inheritedSub,
        display_name: opts.display_name || "",
        cliente_keys: [...new Set(inheritedKeys)],
      };
    } else {
      return {
        ok: false,
        status: 400,
        error: "cliente_key es obligatorio para el perfil",
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        needs_identity: true,
      };
    }

    if (clarification) {
      return {
        ok: true,
        needs_clarification: true,
        clarification,
        plant,
        period: {
          months: months.map((m) => m.yyyymm),
          requested_range: slots.requested_range,
          query_start: windowStart,
          query_end: windowEnd,
          source: slots.period_source,
        },
        semantic_class: SEMANTIC_CLASS,
      };
    }

    if (!identity.cliente_keys || !identity.cliente_keys.length) {
      return {
        ok: false,
        status: 400,
        error: "No se pudo derivar cliente_key",
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
      };
    }

    const plantaIds = getPlantaIdsEquivalentes(plant.planta_id);
    const qComments = opts.queryCommentsByKeys || queryCommentsByKeys;
    const qActions = opts.queryActionsByKeys || queryActionsByKeys;
    const qHist = opts.queryHistorialForActions || queryHistorialForActions;
    const commentsByKey = await qComments(db, plant.planta_id, identity.cliente_keys);
    const nombre = identity.cliente_norm || identity.display_name || opts.entity_hint || "";
    const commentsNombreQueried = Boolean(String(nombre || "").trim());
    const commentsByNombre = commentsNombreQueried
      ? await loadNombrePlantaComments(db, plant.planta_id, nombre, opts)
      : [];
    const comments = mergeCommentsByKeyThenNombre(commentsByKey, commentsByNombre);
    const actionsRaw = await qActions(db, plantaIds, identity.cliente_keys);
    const histMap = await qHist(
      db,
      (actionsRaw || []).map((a) => a.id)
    );
    const actions = (actionsRaw || []).map((a) => ({
      id: a.id,
      public_code: a.public_code,
      cliente_key: a.cliente_key,
      descripcion: a.descripcion,
      estado: a.estado,
      responsable: a.responsable,
      fecha_compromiso: a.fecha_compromiso,
      resultado_cierre: a.resultado_cierre,
      cerrado_at: a.cerrado_at,
      historial: histMap.get(Number(a.id)) || [],
    }));

    return assembleClientProfilePack({
      plant,
      identity,
      months,
      salesRows,
      discountRows,
      comments,
      actions,
      commentsQueried: true,
      commentsKeyEmpty: !(commentsByKey || []).length,
      commentsNombreQueried,
      commentsNombreEmpty: commentsNombreQueried && !(commentsByNombre || []).length,
      commentsNombreUsed: comments.some((c) => c && c.source_join === "nombre_planta"),
      actionsQueried: true,
      trailing_90_asked: slots.trailing_90_asked,
      requested_range: slots.requested_range,
      query_start: windowStart,
      query_end: windowEnd,
      period_source: slots.period_source,
      limitations: [],
    });
  } finally {
    if (client && typeof client.release === "function") client.release();
  }
}

function formatClientProfileContext(assembled) {
  if (assembled && assembled.needs_clarification) {
    return [
      "=== PERFIL CLIENTE ===",
      "clarification_required=true",
      `hint=${assembled.clarification && assembled.clarification.hint}`,
      "No elijas un homónimo en silencio.",
    ].join("\n");
  }
  const id = (assembled && assembled.identity) || {};
  const lines = [
    "=== PERFIL LONGITUDINAL CLIENTE ===",
    `cliente_key=${id.cliente_key || "—"}`,
    `cliente_keys=${(id.cliente_keys || []).join(",") || "—"}`,
    `display=${id.display_name || "—"} planta=${(id.plant && id.plant.planta_nombre) || "—"}`,
    `canal=${id.canal || "—"}`,
    `meses=${((assembled.period && assembled.period.months) || []).join(",")}`,
    `requested_range=${
      assembled.period && assembled.period.requested_range
        ? `${assembled.period.requested_range.start}→${assembled.period.requested_range.end}`
        : "—"
    }`,
    `query_start=${(assembled.period && assembled.period.query_start) || "—"} query_end=${
      (assembled.period && assembled.period.query_end) || "—"
    }`,
    `period_source=${(assembled.period && assembled.period.source) || "—"}`,
    `markers=${((assembled.period && assembled.period.markers) || [])
      .map((m) => `${m.month}:${m.completeness}`)
      .join(" | ")}`,
    "grain=calendar_month (NO 90d trailing)",
    "income_actual=UNSUPPORTED_METRIC (no es 0; no uses fórmula DICF como actual)",
    "action_register=unsupported (sin cliente_key)",
    `join=${(assembled.provenance && assembled.provenance.join) || "cliente_key"}`,
    "descuento/kg = SUM(monto)/SUM(kg) por mes. No AVG de ratios.",
    "comentario != causa. accion DICF != outcome. coincidencia temporal != causalidad.",
    "NO_ENCONTRADO_EN_ESTA_RUTA != ABSENCE_CONFIRMED. Prohibido: «no se han registrado comentarios/acciones».",
    "",
    "=== MESES ALINEADOS ===",
  ];
  for (const r of assembled.monthly_rows || []) {
    lines.push(
      `  ${r.month} ${r.completeness} kg=${r.kg == null ? "null" : r.kg} kg_status=${r.kg_status} desc_kg=${
        r.discount_per_kg == null ? "null" : r.discount_per_kg
      } desc_status=${r.discount_status} income=unsupported`
    );
  }
  const kgFl = assembled.trends && assembled.trends.kg_first_vs_last;
  const dFl = assembled.trends && assembled.trends.discount_first_vs_last;
  lines.push(`kg first_vs_last=${kgFl ? kgFl.direction : "—"} discount first_vs_last=${dFl ? dFl.direction : "—"}`);
  lines.push("");
  lines.push("=== COMMENTS ===");
  if (!(assembled.comments || []).length) {
    lines.push(
      "  (NO_ENCONTRADO_EN_ESTA_RUTA. No es ABSENCE_CONFIRMED. Prohibido: «no se han registrado comentarios», «no hay comentarios», «no existen comentarios».)"
    );
  }
  for (const c of (assembled.comments || []).slice(0, 8)) {
    const clause = formatOneRegisteredComment(c, { quoted: true });
    lines.push(`  ${clause || "Comentario registrado: (vacío)"} El comentario no es la causa.`);
  }
  lines.push("");
  lines.push("=== DICF ACCIONES (cliente_key) ===");
  if (!(assembled.dicf_actions || []).length) {
    lines.push(
      "  (NO_ENCONTRADA_EN_ESTA_RUTA: no encontré una acción DICF asociada en esta ruta. Action Register no consultado. No es ABSENCE_CONFIRMED. Prohibido: «no existen acciones», «no se han registrado acciones», «no hay acciones para este cliente».)"
    );
  }
  for (const a of (assembled.dicf_actions || []).slice(0, 8)) {
    lines.push(
      `  ${a.public_code || a.id} estado=${a.estado || "—"} resp=${a.responsable || "—"} cierre=${
        a.resultado_cierre || "—"
      } key=${a.cliente_key}`
    );
    for (const h of (a.historial || []).slice(0, 4)) {
      lines.push(`    hist ${h.evento || ""} ${h.detalle || ""}`);
    }
  }
  lines.push("");
  lines.push("=== LIMITATIONS ===");
  lines.push((assembled.limitations || []).join(" | ") || "—");
  return lines.join("\n");
}

function buildClientProfilePrompt(assembled, question) {
  const systemPrompt = `${CLIENT_PROFILE_SYSTEM_ADDENDUM} Responde en español. Una sola respuesta.`;
  const userContent = [`Pregunta del usuario: ${String(question || "").trim()}`, "", formatClientProfileContext(assembled)].join(
    "\n"
  );
  return { systemPrompt, userContent };
}

function deriveClientProfileGap(pack) {
  const missing = [...(pack.limitations || [])];
  return {
    missing_fields: [...new Set(missing)].slice(0, 12),
    why_blocks:
      "El perfil alinea kg y descuento/kg por mes. Ingreso actual no está disponible. Comentario y acción no prueban causa ni resultado.",
    physical_source: "director-ia-client-profile",
    physical_person: null,
  };
}

function buildClientProfileChatResult(assembled, opts = {}) {
  const planta_id =
    opts.planta_id != null
      ? Number(opts.planta_id)
      : assembled.identity && assembled.identity.plant && assembled.identity.plant.planta_id;
  const openaiCalled = opts.openai_called !== false;
  return {
    ok: true,
    answer: opts.answer || "",
    sources: [
      "arr.ventas_diarias_cliente",
      "arr.descuentos_diarios_cliente",
      "arr.cliente_comentarios",
      "arr.dicf_acciones",
    ],
    context_meta: {
      mode: SEMANTIC_CLASS,
      requested_domain: SEMANTIC_CLASS,
      openai_called: openaiCalled,
      openai_call_count: openaiCalled ? 1 : 0,
      semantic_class: SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      assembly_status: assembled.assembly_status,
      limitations: assembled.limitations || [],
      prompt_mode: SEMANTIC_CLASS,
      focus_type: SEMANTIC_CLASS,
      ies_runtime: false,
      reasoning_engine: false,
      partial: Boolean(assembled.partial),
    },
    client_profile: {
      semantic_class: SEMANTIC_CLASS,
      identity: assembled.identity,
      period: assembled.period,
      monthly_rows: assembled.monthly_rows,
      trends: assembled.trends,
      comments: assembled.comments,
      dicf_actions: assembled.dicf_actions,
      action_register: assembled.action_register,
      income: assembled.income,
      limitations: assembled.limitations,
      provenance: assembled.provenance,
      partial: Boolean(assembled.partial),
      assembly_status: assembled.assembly_status,
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  CLIENT_PROFILE_SYSTEM_ADDENDUM,
  normalizeQuestion,
  cdmxTodayParts,
  defaultThreeMonths,
  parseExplicitMonths,
  parseExplicitPeriod,
  chronologicalQueryWindow,
  sanitizePeriodMonths,
  isClientProfileQuestion,
  isPlantWideMonthlyFinancialQuestion,
  isClientProfileFollowUp,
  isTopVolumeQuestion,
  assertClientProfileAccess,
  deriveClienteKeys,
  exactNorm,
  explicitClientHintTakesPrecedence,
  discountPerKg,
  resolveClientProfileSlots,
  markPartialMonths,
  alignMonthlyRows,
  monthOverMonth,
  firstVsLast,
  rankClientsByKg,
  assembleClientProfilePack,
  mergeCommentsByKeyThenNombre,
  loadClientProfileForChat,
  formatClientProfileContext,
  buildClientProfilePrompt,
  buildClientProfileChatResult,
  deriveClientProfileGap,
  queryMonthlySales,
  queryMonthlyDiscount,
  queryCommentsByKeys,
  queryActionsByKeys,
};
