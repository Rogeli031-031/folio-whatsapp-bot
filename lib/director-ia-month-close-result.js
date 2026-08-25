"use strict";

/**
 * Chat legado: month_close_result (ARCH B, first slice C).
 * Una planta + un mes calendario. ACTUAL / TARGET_COMMITMENT / FORECAST / DERIVED_MODEL
 * permanecen separados. Read-only. Sin HTTP interno. Sin Plaud. Sin phrasebook.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  assertClientProfileAccess,
  cdmxTodayParts,
  queryMonthlySales,
  queryMonthlyDiscount,
  discountPerKg,
  deriveClienteKeys,
  queryCommentsByKeys,
  isClientProfileQuestion,
  isClientProfileFollowUp,
} = require("./director-ia-client-profile");
const { resolvePlantCodes, classifyCanalGrp } = require("./commercial-trend-engine");
const { isCommercialTrendQuestion } = require("./director-ia-commercial-trend");
const { isTallerMayorQuestion } = require("./director-ia-taller-mayor");
const { isIgfReviewableSupportsQuestion } = require("./director-ia-igf-reviewable-supports");
const { isDailyExecutiveBriefQuestion } = require("./director-ia-daily-executive-brief");
const {
  listMetaVersions,
  loadMetaLinesForVersion,
  schemaMetaExists,
} = require("./igf-meta-excel");
const { loadIgfCommitSnapshot, findIgfRowForPlant, extractIgfComposition } = require("./director-ia-igf-arr");
const {
  loadFinancialActualEvidence,
  FINANCIAL_ACTUAL_CODES,
  FINANCE_PROVIDED_FIELDS,
} = require("./director-ia-financial-actual");
const { buildActionRegisterBoardPayload } = require("./action-register-board");
const {
  summarizeActionRegisterBoard,
  summarizeTopOverdueActions,
  collectResponsableUsuarioIds,
  loadUsuarioRolesByIds,
  todayYmdMexicoCity,
} = require("./director-ia-action-register");
const { assertActionRegisterAccess } = require("./director-ia-m12-revision-notes");

const SEMANTIC_CLASS = "month_close_result";

const FINANCIAL_TARGET_FIELDS = Object.freeze([
  "margen_kg",
  "com_desc_kg",
  "gasto_kg",
  "impuesto_kg",
  "hg_pct",
  "hg_kg",
  "bancos_planta_kg",
  "provision_planta_kg",
  "util_oper_kg",
  "util_oper_importe",
  "gtos_apoyos_corp_kg",
  "bancos_corp_kg",
  "otros_programas_kg",
  "inversiones_kg",
  "resultado_final_kg",
  "resultado_final_importe",
]);

const SYSTEM_ADDENDUM = [
  "EVIDENCIA DE RESULTADO MENSUAL DE CIERRE (chat legado; ARCH B; first slice C).",
  "No es IES. No es Reasoning Engine N5. No es Plaud. No es commercial_trend 30/90.",
  "Cinco clases: ACTUAL comercial (ARR), ACTUAL_FINANCIAL (FINAL stored Finanzas), TARGET/COMMITMENT (igf_meta), FORECAST (IGF latest), DERIVED_MODEL.",
  "igf_meta es el compromiso gerencial del mes. No es forecast. No es actual.",
  "IGF es proyección. financial.actual solo es ACTUAL_FINANCIAL si hay versión FINAL. Si está SUPPORTED usa esos stored FINANCE_PROVIDED; no sustituyas forecast, target ni ARR por actual. Gap != causa.",
  "Si falta META del YYYY-MM pedido: TARGET_MISSING_FOR_PERIOD. No uses la de otro mes.",
  "Mover != causa. Comentario != causa. Gap != causa. missing != 0. target 0 no se usa como denominador.",
  "Tú sintetizas: qué destaca, tensiones, qué necesita explicación y limitations. No inventes target, actual financiero ni causa.",
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYyyyMm(year, month) {
  return `${Number(year)}-${pad2(Number(month))}`;
}

function addMonths(year, month, delta) {
  const idx = Number(year) * 12 + (Number(month) - 1) + Number(delta);
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { year: y, month: m };
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthBounds(year, month) {
  const last = lastDayOfMonth(year, month);
  return {
    start: `${toYyyyMm(year, month)}-01`,
    end: `${toYyyyMm(year, month)}-${pad2(last)}`,
  };
}

function priorYearMonth(year, month) {
  return addMonths(year, month, -1);
}

function identityKey(clienteNorm, canal, subcanal) {
  return [String(clienteNorm || "").trim(), String(canal || "").trim(), String(subcanal || "").trim()].join("|");
}

function isPrepMeetingCue(q) {
  return (
    /\bprepar/.test(q) ||
    /\bantes de entrar\b/.test(q) ||
    /\bantes de (la\s+)?(junta|reunion)\b/.test(q) ||
    /\bdebo (llevar|revisar|saber)\b/.test(q) ||
    /\bbriefing\b/.test(q) ||
    /\barmar\b/.test(q) ||
    /\barmame\b/.test(q) ||
    /\bpre-?cierre\b/.test(q) ||
    /\bprecierre\b/.test(q)
  );
}

function isMonthCloseQuestion(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bayer\b/.test(q)) return false;
  if (typeof isDailyExecutiveBriefQuestion === "function" && isDailyExecutiveBriefQuestion(raw)) return false;
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(raw)) return false;
  if (typeof isClientProfileQuestion === "function" && isClientProfileQuestion(raw)) return false;
  if (typeof isTallerMayorQuestion === "function" && isTallerMayorQuestion(raw)) return false;
  if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(raw)) {
    return false;
  }
  if (isPrepMeetingCue(q)) return false;
  if (/\bacciones?\b/.test(q) && /\bvencid/.test(q)) return false;
  if (/\bhablame\b/.test(q) && /\b(cliente|primero)\b/.test(q)) return false;

  const closeCue =
    /\bcerramos\b/.test(q) ||
    /\bcerr[oó]\b/.test(q) ||
    /\bcierre\b/.test(q) ||
    /\bcomo quedo\b/.test(q) ||
    /\bcomo quedamos\b/.test(q);
  const metaCue =
    /\bcontra la meta\b/.test(q) ||
    (/\bmeta\b/.test(q) &&
      (/\bfalto\b/.test(q) ||
        /\bcumpl/.test(q) ||
        /\bporcentaje\b/.test(q) ||
        /\b%\b/.test(q) ||
        /\bcompromet/.test(q) ||
        /\bobjetivo\b/.test(q) ||
        closeCue));
  const monthCue =
    /\bmes\b/.test(q) ||
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(
      q
    ) ||
    /\b20\d{2}[-\/](0?[1-9]|1[0-2])\b/.test(q) ||
    /\bmes pasado\b/.test(q);

  if (metaCue) return true;
  if (/\bporcentaje\b/.test(q) && /\bcumpl/.test(q)) return true;
  if (closeCue && (monthCue || /\bplanta\b/.test(q))) return true;
  if (closeCue && /\bventa\b/.test(q) && (monthCue || /\bmeta\b/.test(q) || /\bcierre\b/.test(q))) return true;
  if (/\bcomo cerr/.test(q)) return true;
  const realCue = /\breal(mente|es)?\b/.test(q);
  const financialLineCue =
    /\butil(idad)?\s+oper/.test(q) ||
    /\bresultado\s+final\b/.test(q) ||
    /\bfinancieramente\b/.test(q) ||
    /\bcierre\s+financier/.test(q);
  if (financialLineCue && (realCue || closeCue || monthCue)) return true;
  if (/\butil(idad)?\b/.test(q) && realCue) return true;
  const vsCloseCue =
    (/\bforecast\b/.test(q) || /\bproyeccion\b/.test(q) || /\bigf\b/.test(q)) &&
    (/\bcierre\b/.test(q) || /\bfinal\b/.test(q) || realCue) &&
    (/\bdiferenc/.test(q) || /\bversus\b/.test(q) || /\bvs\b/.test(q) || /\bcontra\b/.test(q) || /\bcompar/.test(q));
  if (vsCloseCue) return true;
  return false;
}

function isMonthCloseFollowUp(raw, kind) {
  if (
    kind === "attention" ||
    kind === "gap_what" ||
    kind === "gap_who" ||
    kind === "gap_why_need" ||
    kind === "confirm" ||
    kind === "why"
  ) {
    if (typeof isClientProfileFollowUp === "function" && isClientProfileFollowUp(raw, kind, { hasActiveClient: true })) {
      return false;
    }
    return true;
  }
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (typeof isCommercialTrendQuestion === "function" && isCommercialTrendQuestion(raw)) return false;
  if (typeof isClientProfileQuestion === "function" && isClientProfileQuestion(raw)) return false;
  if (typeof isTallerMayorQuestion === "function" && isTallerMayorQuestion(raw)) return false;
  if (typeof isIgfReviewableSupportsQuestion === "function" && isIgfReviewableSupportsQuestion(raw)) {
    return false;
  }
  if (/\bhablame\b/.test(q) && /\bcliente\b/.test(q)) return false;
  if (/\b(el )?primero\b/.test(q) || /\bhablame del primero\b/.test(q)) return true;
  if (/\bacciones?\b/.test(q) && /\bvencid/.test(q)) return false;
  if (isMonthCloseQuestion(raw)) return true;
  if (/\bcomo quedo\b/.test(q) || /\bcomo quedamos\b/.test(q)) return true;
  if (/\bcontra la meta\b/.test(q) || (/\bmeta\b/.test(q) && (/\bfalto\b/.test(q) || /\bcumpl/.test(q) || /\bporcentaje\b/.test(q)))) {
    return true;
  }
  if (/\bdescuento\b/.test(q)) return true;
  if (/\b(casa|comisionistas?)\b/.test(q) && !/\b90\b/.test(q) && !/\b30\b/.test(q)) return true;
  if (/\bclientes?\b/.test(q) && (/\bperdi/.test(q) || /\bganamos\b/.test(q) || /\bnuev/.test(q) || /\bmovi/.test(q))) {
    return true;
  }
  return false;
}

function wantsFirstMover(raw) {
  const q = normalizeQuestion(raw);
  return /\b(el )?primero\b/.test(q) || /\bhablame del primero\b/.test(q);
}

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

function parseCloseMonth(raw, now) {
  const q = normalizeQuestion(raw);
  if (!q) return null;
  const today = cdmxTodayParts(now);
  const ym = q.match(/\b(20\d{2})[-\/](0?[1-9]|1[0-2])\b/);
  if (ym) {
    return { year: parseInt(ym[1], 10), month: parseInt(ym[2], 10), source: "explicit" };
  }
  let month = null;
  for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      month = num;
      break;
    }
  }
  if (!month) return null;
  const yOnly = q.match(/\b(20\d{2})\b/);
  let year = yOnly ? parseInt(yOnly[1], 10) : today.year;
  if (!yOnly && month > today.month) year -= 1;
  return { year, month, source: "explicit" };
}

function resolveCloseMonth(question, inherited, now) {
  const today = cdmxTodayParts(now);
  const lastComplete = addMonths(today.year, today.month, -1);
  const explicit = parseCloseMonth(question, now);
  const q = normalizeQuestion(question);
  if (explicit) {
    return { year: explicit.year, month: explicit.month, source: "explicit" };
  }
  if (/\bmes actual\b/.test(q) || /\beste mes\b/.test(q)) {
    return { year: today.year, month: today.month, source: "current_explicit" };
  }
  if (/\bmes pasado\b/.test(q) || /\bmes anterior\b/.test(q)) {
    return { year: lastComplete.year, month: lastComplete.month, source: "prior_named" };
  }
  const inheritedYm = Array.isArray(inherited && inherited.active_period_months)
    ? inherited.active_period_months[0]
    : null;
  if (inheritedYm && /^\d{4}-\d{2}$/.test(String(inheritedYm)) && inherited && inherited.reuse_inherited_month) {
    const [y, m] = String(inheritedYm).split("-").map((x) => parseInt(x, 10));
    return { year: y, month: m, source: "inherited" };
  }
  return { year: lastComplete.year, month: lastComplete.month, source: "default_last_complete" };
}

function periodStatus(year, month, now) {
  const today = cdmxTodayParts(now);
  if (today.year === year && today.month === month) return "PARTIAL";
  return "COMPLETE";
}

function toTon(kg) {
  if (kg == null || !Number.isFinite(Number(kg))) return null;
  return Number(kg) / 1000;
}

function sharePct(part, total) {
  if (part == null || total == null || !Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return (part / total) * 100;
}

function pickCurrentMetaVersion(versions) {
  const list = Array.isArray(versions) ? versions : [];
  const current = list.find((v) => v && v.is_current === true);
  return current || null;
}

function pickMetaRowForPlant(lines, plantCode, plantaNombre, matcher) {
  const fn = matcher || findIgfRowForPlant;
  return fn(lines || [], plantCode, plantaNombre);
}

function extractFinancialTarget(row) {
  if (!row) return null;
  const out = {};
  for (const key of FINANCIAL_TARGET_FIELDS) {
    const n = row[key];
    out[key] = n == null || n === "" || !Number.isFinite(Number(n)) ? null : Number(n);
  }
  return out;
}

function composeFinancialActual(raw, arrVentaTon, limitations) {
  if (raw == null) {
    return { status: "UNSUPPORTED_METRIC", truth_class: null };
  }
  if (!raw.ok || raw.status !== FINANCIAL_ACTUAL_CODES.SUPPORTED) {
    const status = raw.status || FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE;
    if (!limitations.includes(status)) limitations.push(status);
    return {
      status,
      truth_class: null,
      year: raw.year != null ? raw.year : null,
      month: raw.month != null ? raw.month : null,
    };
  }
  const financeVenta =
    raw.fields && raw.fields.venta_ton != null && Number.isFinite(Number(raw.fields.venta_ton))
      ? Number(raw.fields.venta_ton)
      : null;
  const arrVenta = arrVentaTon != null && Number.isFinite(Number(arrVentaTon)) ? Number(arrVentaTon) : null;
  const actual = {
    status: FINANCIAL_ACTUAL_CODES.SUPPORTED,
    truth_class: "ACTUAL_FINANCIAL",
    source_owner: "FINANZAS",
    source: raw.source || "igf.compromiso_lines",
    source_persistence: raw.source_persistence || ["igf.versions", "igf.compromiso_lines"],
    year: raw.year,
    month: raw.month,
    version_id: raw.version_id,
    version_number: raw.version_number,
    financial_state: "FINAL",
    finalized_at: raw.finalized_at || null,
    finalized_by: raw.finalized_by || null,
    created_at: raw.created_at || null,
    created_at_role: "upload_timestamp",
    empresa: raw.empresa || null,
    plant: raw.plant || null,
    fields: raw.fields,
    field_origin: raw.field_origin,
  };
  if (financeVenta != null && arrVenta != null && financeVenta !== arrVenta) {
    if (!limitations.includes(FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP)) {
      limitations.push(FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP);
    }
    actual.reconciliation = {
      status: FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP,
      finance_venta_ton: financeVenta,
      finance_truth_class: "ACTUAL_FINANCIAL",
      finance_origin: "FINANCE_PROVIDED",
      arr_venta_ton: arrVenta,
      arr_truth_class: "ACTUAL_COMMERCIAL",
      overwrite: false,
    };
  } else if (financeVenta != null && arrVenta != null) {
    actual.reconciliation = {
      status: "OK",
      finance_venta_ton: financeVenta,
      finance_truth_class: "ACTUAL_FINANCIAL",
      arr_venta_ton: arrVenta,
      arr_truth_class: "ACTUAL_COMMERCIAL",
      overwrite: false,
    };
  }
  return actual;
}

function aggregateSales(rows, yyyymm) {
  let kg = 0;
  let casa = 0;
  let comi = 0;
  let seen = false;
  const byClient = new Map();
  for (const row of rows || []) {
    if (row.month && row.month !== yyyymm) continue;
    seen = true;
    const kgN = Number(row.kg) || 0;
    kg += kgN;
    const grp = classifyCanalGrp(row.canal);
    if (grp === "COMISIONISTA") comi += kgN;
    else casa += kgN;
    const id = identityKey(row.cliente_norm, row.canal, row.subcanal);
    if (!row.cliente_norm) continue;
    const prev = byClient.get(id) || {
      cliente_norm: row.cliente_norm,
      canal: row.canal,
      subcanal: row.subcanal,
      kg: 0,
    };
    prev.kg += kgN;
    byClient.set(id, prev);
  }
  return { kg: seen ? kg : null, casa_kg: seen ? casa : null, comisionista_kg: seen ? comi : null, byClient, seen };
}

function aggregateDiscount(rows, yyyymm) {
  let monto = 0;
  let seen = false;
  for (const row of rows || []) {
    if (row.month && row.month !== yyyymm) continue;
    seen = true;
    monto += Number(row.monto) || 0;
  }
  return { monto: seen ? monto : null, seen };
}

function classifyClients(currentMap, priorMap, plantaId) {
  const keys = new Set([...currentMap.keys(), ...priorMap.keys()]);
  const newClients = [];
  const lostClients = [];
  const movers = [];
  for (const id of keys) {
    const cur = currentMap.get(id);
    const pri = priorMap.get(id);
    const kgCur = cur ? Number(cur.kg) || 0 : 0;
    const kgPri = pri ? Number(pri.kg) || 0 : 0;
    const base = cur || pri;
    const cliente_keys = deriveClienteKeys(plantaId, base.canal, base.subcanal, base.cliente_norm);
    const rec = {
      cliente_norm: base.cliente_norm,
      canal: base.canal,
      subcanal: base.subcanal,
      kg_current: kgCur,
      kg_prior: kgPri,
      delta_kg: kgCur - kgPri,
      cliente_key: cliente_keys[0] || null,
      cliente_keys,
    };
    if (kgPri <= 0 && kgCur > 0) newClients.push(rec);
    if (kgPri > 0 && kgCur <= 0) lostClients.push(rec);
    if (kgCur !== kgPri) movers.push(rec);
  }
  newClients.sort((a, b) => b.kg_current - a.kg_current);
  lostClients.sort((a, b) => b.kg_prior - a.kg_prior);
  const pos = movers.filter((m) => m.delta_kg > 0).sort((a, b) => b.delta_kg - a.delta_kg);
  const neg = movers.filter((m) => m.delta_kg < 0).sort((a, b) => a.delta_kg - b.delta_kg);
  return {
    new: newClients.slice(0, 8),
    lost: lostClients.slice(0, 8),
    top_positive_movers: pos.slice(0, 5),
    top_negative_movers: neg.slice(0, 5),
  };
}

async function safeLoad(fn, ...args) {
  try {
    return await fn(...args);
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "TOOL_ERROR",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  }
}

async function defaultLoadActions(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const authz = assertActionRegisterAccess(auth, plantaId);
  if (!authz.ok) {
    return {
      ok: false,
      abort: true,
      status: authz.status || 403,
      code: authz.code || DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      error: authz.error || "Sin acceso a Action Register",
    };
  }
  if (opts.board) {
    const asOf = opts.asOf || todayYmdMexicoCity();
    return {
      ok: true,
      summary: summarizeActionRegisterBoard(opts.board),
      top_overdue: summarizeTopOverdueActions(opts.board, { limit: 5 }),
      provenance: { source: "arr.action_register_items", requery: true },
    };
  }
  if (!pool || typeof pool.connect !== "function") {
    return { ok: false, abort: false, status: 500, error: "Pool no configurado para acciones" };
  }
  const client = await pool.connect();
  try {
    const board = await buildActionRegisterBoardPayload(client, Number(plantaId), {
      ensureActionRegisterTables: opts.ensureActionRegisterTables,
      includeDicf: false,
      includeNotes: false,
    });
    const roleMap = await loadUsuarioRolesByIds(client, collectResponsableUsuarioIds(board));
    return {
      ok: true,
      summary: summarizeActionRegisterBoard(board),
      top_overdue: summarizeTopOverdueActions(board, { roleMap, limit: 5 }),
      provenance: { source: "arr.action_register_items", requery: true },
    };
  } catch (e) {
    return {
      ok: false,
      abort: false,
      status: 500,
      error: (e && e.message) || "Error Action Register",
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    };
  } finally {
    client.release();
  }
}

function deriveGaps(pack) {
  const gaps = [];
  if (pack.sales && pack.sales.target_status === "TARGET_MISSING_FOR_PERIOD") {
    gaps.push({
      kind: "TARGET_MISSING_FOR_PERIOD",
      statement: "No encuentro una META/COMPROMISO cargada para este periodo; no usaré la de otro mes.",
    });
  }
  const actualStatus =
    pack.financial && pack.financial.actual && pack.financial.actual.status
      ? String(pack.financial.actual.status)
      : "UNSUPPORTED_METRIC";
  if (actualStatus === "SUPPORTED") {
    if ((pack.limitations || []).includes(FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP)) {
      gaps.push({
        kind: FINANCIAL_ACTUAL_CODES.RECONCILIATION_GAP,
        statement: "La venta stored de Finanzas y el ARR comercial del mismo periodo no coinciden. Se conservan ambos.",
      });
    }
  } else if (actualStatus === "UNSUPPORTED_METRIC") {
    gaps.push({
      kind: "FINANCIAL_ACTUAL_UNSUPPORTED",
      statement: "No dispongo de resultado financiero actual para afirmar el cumplimiento financiero.",
    });
  } else {
    gaps.push({
      kind: actualStatus,
      statement: "No hay ACTUAL_FINANCIAL usable para este periodo. No sustituyo forecast ni pongo cero.",
    });
  }
  for (const m of (pack.clients && pack.clients.top_negative_movers) || []) {
    if (!m.has_comment && Math.abs(Number(m.delta_kg) || 0) > 0) {
      gaps.push({
        kind: "material_movement_unexplained",
        statement: "Hay movimiento material de cliente sin evidencia explicativa cargada. Mover != causa.",
        cliente_key: m.cliente_key,
      });
      break;
    }
  }
  const overdue = (pack.actions && pack.actions.top_overdue) || [];
  if (overdue.some((a) => !a.resultado_cierre && !a.resultado)) {
    gaps.push({
      kind: "action_missing_result",
      statement: "Hay acciones vencidas sin resultado/cierre registrado.",
    });
  }
  for (const lim of pack.limitations || []) {
    if (String(lim).includes("unavailable") || String(lim).includes("source_")) {
      gaps.push({
        kind: "source_unavailable",
        statement: "Una fuente no estuvo disponible; las demás secciones independientes se conservan.",
      });
      break;
    }
  }
  return gaps;
}

function assembleMonthClosePack(input) {
  const year = input.year;
  const month = input.month;
  const yyyymm = toYyyyMm(year, month);
  const prior = priorYearMonth(year, month);
  const priorYm = toYyyyMm(prior.year, prior.month);
  const limitations = [...(input.limitations || [])];
  const information_gaps = [];

  const salesAgg = aggregateSales(input.salesRows, yyyymm);
  const priorAgg = aggregateSales(input.priorSalesRows != null ? input.priorSalesRows : input.salesRows, priorYm);
  const discAgg = aggregateDiscount(input.discountRows, yyyymm);

  const actual_kg = salesAgg.seen ? salesAgg.kg : null;
  const actual_ton = toTon(actual_kg);
  if (!salesAgg.seen) limitations.push("sales_actual_unavailable");

  let target_ton = null;
  let target_status = "TARGET_MISSING_FOR_PERIOD";
  let target_meta = null;
  if (input.target === "error") {
    limitations.push("target_source_unavailable");
    target_status = "TARGET_MISSING_FOR_PERIOD";
  } else if (input.target && input.target.row && input.target.venta_ton != null && Number.isFinite(Number(input.target.venta_ton))) {
    target_ton = Number(input.target.venta_ton);
    target_status = "OK";
    target_meta = {
      version_id: input.target.version_id,
      version_number: input.target.version_number,
      empresa: input.target.empresa,
      truth_class: "TARGET_COMMITMENT",
    };
  } else {
    target_status = "TARGET_MISSING_FOR_PERIOD";
    limitations.push("TARGET_MISSING_FOR_PERIOD");
  }

  let delta_ton = null;
  let attainment_pct = null;
  if (actual_ton != null && target_status === "OK" && target_ton != null) {
    delta_ton = actual_ton - target_ton;
    if (target_ton === 0) {
      limitations.push("target_zero_no_attainment");
    } else {
      attainment_pct = (actual_ton / target_ton) * 100;
    }
  }

  const totalKg = salesAgg.seen ? salesAgg.kg : null;
  const channels = {
    casa_kg: salesAgg.casa_kg,
    comisionista_kg: salesAgg.comisionista_kg,
    casa_ton: toTon(salesAgg.casa_kg),
    comisionista_ton: toTon(salesAgg.comisionista_kg),
    casa_share_pct: sharePct(salesAgg.casa_kg, totalKg),
    comisionista_share_pct: sharePct(salesAgg.comisionista_kg, totalKg),
  };

  let discount_per_kg = null;
  let discount_status = "DATA_NOT_FOUND";
  if (!salesAgg.seen || !discAgg.seen) {
    discount_status = "DATA_NOT_FOUND";
    limitations.push("discount_unavailable");
  } else if (!actual_kg || actual_kg <= 0) {
    discount_status = "NO_DENOMINATOR";
    limitations.push("discount_no_denominator");
  } else {
    discount_per_kg = discountPerKg(discAgg.monto, actual_kg);
    discount_status = "OK";
  }

  const clients = classifyClients(salesAgg.byClient || new Map(), priorAgg.byClient || new Map(), input.planta_id);
  const commentKeys = new Set();
  for (const list of [clients.top_negative_movers, clients.top_positive_movers]) {
    for (const m of list) {
      for (const k of m.cliente_keys || []) commentKeys.add(k);
    }
  }
  const commentsByKey = new Set((input.comments || []).map((c) => String(c.cliente_key || "").trim()).filter(Boolean));
  const markComments = (list) =>
    list.map((m) => ({
      ...m,
      has_comment: (m.cliente_keys || []).some((k) => commentsByKey.has(k)),
    }));
  clients.top_negative_movers = markComments(clients.top_negative_movers);
  clients.top_positive_movers = markComments(clients.top_positive_movers);

  const financial_target = target_status === "OK" ? extractFinancialTarget(input.target.row) : null;
  let financial_forecast = null;
  if (input.forecast === "error") {
    limitations.push("igf_forecast_unavailable");
  } else if (input.forecast && input.forecast.row) {
    financial_forecast = {
      truth_class: "FORECAST",
      version_id: input.forecast.version_id,
      version_number: input.forecast.version_number,
      composition: input.forecast.composition || extractIgfComposition(input.forecast.row, { year, month }),
    };
  } else if (input.forecast && input.forecast.missing) {
    limitations.push("igf_forecast_missing_for_period");
  }

  const financial_actual = composeFinancialActual(input.financial_actual, actual_ton, limitations);

  const actions = input.actions && input.actions.ok
    ? {
        open: input.actions.summary && input.actions.summary.open,
        closed: input.actions.summary && input.actions.summary.closed,
        overdue: input.actions.summary && input.actions.summary.overdue,
        top_overdue: input.actions.top_overdue || [],
        provenance: input.actions.provenance,
      }
    : null;
  if (!actions) limitations.push("actions_unavailable");

  const firstNeg = (clients.top_negative_movers || [])[0] || null;
  const firstPos = (clients.top_positive_movers || [])[0] || null;
  const first_mover = firstNeg || firstPos;

  const pack = {
    ok: true,
    semantic_class: SEMANTIC_CLASS,
    plant: input.plant,
    month: yyyymm,
    year,
    month_number: month,
    period_status: input.period_status,
    generated_at: input.generated_at,
    sales: {
      actual_kg,
      actual_ton,
      target_ton,
      target_kg: target_ton != null ? target_ton * 1000 : null,
      delta_ton,
      attainment_pct,
      target_status,
      actual_class: "ACTUAL",
      target_class: "TARGET_COMMITMENT",
      target_meta,
    },
    channels,
    discount: {
      per_kg: discount_per_kg,
      monto_sum: discAgg.monto,
      kg_sum: actual_kg,
      formula: "SUM(monto)/SUM(kg)",
      status: discount_status,
      truth_class: "ACTUAL",
    },
    clients: {
      ...clients,
      compare: { current: yyyymm, previous: priorYm },
      rule: "actual kg; mover != cause",
    },
    financial: {
      target: financial_target
        ? { truth_class: "TARGET_COMMITMENT", ...financial_target, meta: target_meta }
        : null,
      forecast: financial_forecast,
      actual: financial_actual,
    },
    actions,
    first_mover,
    limitations: [...new Set(limitations)],
    provenance: {
      sales: "arr.ventas_diarias_cliente",
      discount: "arr.descuentos_diarios_cliente",
      target: "igf_meta.meta_lines",
      forecast: "igf.compromiso_lines",
      financial_actual: "igf.versions+igf.compromiso_lines",
      actions: "arr.action_register_items",
      requery: true,
      join: "cliente_key",
      name_join: false,
    },
    partial: Boolean(
      target_status === "TARGET_MISSING_FOR_PERIOD" ||
        !salesAgg.seen ||
        !actions ||
        input.period_status === "PARTIAL" ||
        limitations.length
    ),
    assembly_status: "ok",
  };
  pack.information_gaps = deriveGaps(pack);
  if (target_status === "TARGET_MISSING_FOR_PERIOD") {
    information_gaps.push("TARGET_MISSING_FOR_PERIOD");
  }
  return pack;
}

async function loadMonthCloseResultForChat(pool, plantaId, req, opts = {}) {
  const access = assertClientProfileAccess((req && req.dashboardAuth) || opts.auth || {}, plantaId);
  if (!access.ok) return access;

  const now = opts.now || new Date();
  const inherited = {
    active_period_months: opts.active_period_months || [],
    reuse_inherited_month: Boolean(opts.reuse_inherited_month),
  };
  const resolved = resolveCloseMonth(opts.question || "", inherited, now);
  const year = resolved.year;
  const month = resolved.month;
  const yyyymm = toYyyyMm(year, month);
  const prior = priorYearMonth(year, month);
  const status = periodStatus(year, month, now);
  const bounds = monthBounds(year, month);
  const priorBounds = monthBounds(prior.year, prior.month);

  const resolvePlanta = opts.resolvePlanta;
  const injected =
    typeof resolvePlanta === "function" ||
    typeof opts.queryMonthlySales === "function" ||
    typeof opts.loadTarget === "function";

  let client = opts.client || null;
  const acquire = async () => {
    if (client) return client;
    if (injected && (!pool || typeof pool.connect !== "function")) return null;
    if (!pool || typeof pool.connect !== "function") {
      throw new Error("Pool no configurado para month_close_result");
    }
    client = await pool.connect();
    return client;
  };

  try {
    const db = await acquire();
    let plant = opts.plant || { planta_id: Number(plantaId), planta_nombre: null, plant_code: null };
    if (!opts.plant && db && (resolvePlanta || true)) {
      const fn = resolvePlanta || (async (c, id) => {
        const r = await c.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [id]);
        return r.rows[0] || null;
      });
      const row = await fn(db, Number(plantaId));
      if (row) {
        plant = {
          planta_id: Number(row.id || plantaId),
          planta_nombre: row.nombre || row.planta_nombre || null,
          plant_code: row.clave || row.plant_code || null,
        };
      }
    }

    const resolveCodes = opts.resolvePlantCodes || resolvePlantCodes;
    let codesUpper = opts.plantCodesUpper || [];
    if (!codesUpper.length && db && plant.planta_nombre) {
      const codes = await resolveCodes(db, plant.planta_nombre);
      codesUpper = (codes || []).map((c) => String(c).toUpperCase());
    }

    const qSales = opts.queryMonthlySales || queryMonthlySales;
    const qDisc = opts.queryMonthlyDiscount || queryMonthlyDiscount;
    let salesRows = opts.salesRows;
    let priorSalesRows = opts.priorSalesRows;
    let discountRows = opts.discountRows;
    const lim = [];

    if (salesRows == null) {
      if (!db || !codesUpper.length) {
        lim.push("sales_actual_unavailable");
        salesRows = [];
        priorSalesRows = [];
      } else {
        const cur = await qSales(db, codesUpper, bounds.start, bounds.end, "ambos");
        const pri = await qSales(db, codesUpper, priorBounds.start, priorBounds.end, "ambos");
        salesRows = (cur && cur.rows) || [];
        priorSalesRows = (pri && pri.rows) || [];
      }
    }
    if (discountRows == null) {
      if (!db || !codesUpper.length) {
        lim.push("discount_unavailable");
        discountRows = [];
      } else {
        const d = await qDisc(db, codesUpper, bounds.start, bounds.end, "ambos");
        discountRows = (d && d.rows) || [];
      }
    }

    let target = null;
    if (typeof opts.loadTarget === "function") {
      target = await opts.loadTarget({ year, month, plant });
    } else if (db) {
      try {
        const existsFn = opts.schemaMetaExists || schemaMetaExists;
        const okSchema = await existsFn(db);
        if (!okSchema) {
          target = null;
          lim.push("target_schema_unavailable");
        } else {
          const versions = await (opts.listMetaVersions || listMetaVersions)(db, year, month);
          const current = pickCurrentMetaVersion(versions);
          if (!current) {
            target = null;
          } else {
            const pack = await (opts.loadMetaLinesForVersion || loadMetaLinesForVersion)(
              db,
              year,
              month,
              current.version_number
            );
            const matcher = opts.findIgfRowForPlant || findIgfRowForPlant;
            const row = pack ? pickMetaRowForPlant(pack.lines, plant.plant_code, plant.planta_nombre, matcher) : null;
            if (row) {
              target = {
                version_id: pack.version_id,
                version_number: pack.version_number,
                empresa: row.empresa,
                venta_ton: row.venta_ton,
                row,
              };
            }
          }
        }
      } catch (_e) {
        target = "error";
      }
    } else {
      target = null;
    }

    let forecast = null;
    if (typeof opts.loadForecast === "function") {
      forecast = await opts.loadForecast({ year, month, plant });
    } else if (db) {
      try {
        const snap = await (opts.loadIgfCommitSnapshot || loadIgfCommitSnapshot)(
          db,
          year,
          month,
          plant.plant_code,
          plant.planta_nombre
        );
        if (!snap || !snap.row) forecast = { missing: true };
        else {
          forecast = {
            version_id: snap.version_id,
            version_number: snap.version_number,
            row: snap.row,
            composition: extractIgfComposition(snap.row, { year, month }),
          };
        }
      } catch (_e) {
        forecast = "error";
      }
    } else {
      forecast = { missing: true };
    }

    let financial_actual = null;
    if (typeof opts.loadFinancialActual === "function") {
      financial_actual = await opts.loadFinancialActual({
        year,
        month,
        plant,
        auth: opts.auth || (req && req.dashboardAuth),
      });
    } else if (db) {
      try {
        const loadFn = opts.loadFinancialActualEvidence || loadFinancialActualEvidence;
        financial_actual = await loadFn(db, {
          year,
          month,
          plant,
          planta_id: Number(plantaId),
          auth: opts.auth || (req && req.dashboardAuth),
          findIgfRowForPlant: opts.findIgfRowForPlant || findIgfRowForPlant,
        });
      } catch (_e) {
        financial_actual = { ok: false, status: FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE };
      }
    } else if (injected) {
      financial_actual = null;
    } else {
      financial_actual = { ok: false, status: FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE };
    }

    const actionsRaw = await safeLoad(opts.loadActions || defaultLoadActions, pool, Number(plantaId), req, {
      auth: opts.auth || (req && req.dashboardAuth),
      board: opts.actionBoard,
      ensureActionRegisterTables: opts.ensureActionRegisterTables,
    });

    const preview = classifyClients(
      aggregateSales(salesRows, yyyymm).byClient,
      aggregateSales(priorSalesRows != null ? priorSalesRows : salesRows, toYyyyMm(prior.year, prior.month)).byClient,
      Number(plantaId)
    );
    const keys = [];
    for (const list of [preview.top_negative_movers, preview.top_positive_movers]) {
      for (const m of list) keys.push(...(m.cliente_keys || []));
    }
    let comments = opts.comments || [];
    if (!opts.comments && db && keys.length) {
      const qCom = opts.queryCommentsByKeys || queryCommentsByKeys;
      comments = await qCom(db, Number(plantaId), [...new Set(keys)]);
    }

    return assembleMonthClosePack({
      plant,
      planta_id: Number(plantaId),
      year,
      month,
      period_status: status,
      generated_at: (now && now.toISOString && now.toISOString()) || new Date().toISOString(),
      salesRows,
      priorSalesRows,
      discountRows,
      target,
      forecast,
      financial_actual,
      actions: actionsRaw,
      comments,
      limitations: lim,
    });
  } finally {
    if (client && !opts.client && typeof client.release === "function") client.release();
  }
}

function formatStoredContextValue(value) {
  if (value == null || value === "") return "null";
  if (!Number.isFinite(Number(value))) return "null";
  return String(Number(value));
}

function forecastVentaTon(forecast) {
  const lines = forecast && forecast.composition && Array.isArray(forecast.composition.lines)
    ? forecast.composition.lines
    : [];
  const hit = lines.find((line) => line && line.line_key === "venta_ton");
  return hit && hit.value != null ? hit.value : null;
}

function formatFinancialActualContext(actual) {
  if (!actual || !actual.status) {
    return [
      "financial.actual.status=UNSUPPORTED_METRIC",
      "No hay ACTUAL_FINANCIAL. No inventes P&L actual. MISSING != 0.",
    ];
  }
  const lines = [`financial.actual.status=${actual.status}`];
  if (actual.status !== FINANCIAL_ACTUAL_CODES.SUPPORTED || actual.truth_class !== "ACTUAL_FINANCIAL") {
    lines.push(`financial.actual.truth_class=${actual.truth_class || "null"}`);
    if (actual.status === FINANCIAL_ACTUAL_CODES.NOT_FINAL) {
      lines.push("FINANCIAL_ACTUAL_NOT_FINAL != FORECAST. No uses financial.forecast como actual.");
    } else if (actual.status === FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD) {
      lines.push("FINANCIAL_ACTUAL_MISSING_FOR_PERIOD != 0. No inventes actual.");
    } else if (actual.status === FINANCIAL_ACTUAL_CODES.UNAUTHORIZED) {
      lines.push("FINANCIAL_ACTUAL_UNAUTHORIZED != MISSING. No afirmes ausencia de cierre.");
    } else {
      lines.push("No hay ACTUAL_FINANCIAL usable. No proyectes campos stored como actual.");
    }
    return lines;
  }
  const plant = actual.plant || {};
  lines.push("financial.actual.truth_class=ACTUAL_FINANCIAL");
  lines.push("financial.actual.field_origin=FINANCE_PROVIDED");
  lines.push("financial.actual.source_owner=FINANZAS");
  lines.push("financial.actual.financial_state=FINAL");
  lines.push(`financial.actual.year=${actual.year}`);
  lines.push(`financial.actual.month=${actual.month}`);
  lines.push(`financial.actual.version_id=${actual.version_id}`);
  lines.push(`financial.actual.version_number=${actual.version_number}`);
  lines.push(`financial.actual.finalized_at=${actual.finalized_at || "null"}`);
  lines.push(`financial.actual.finalized_by=${actual.finalized_by || "null"}`);
  lines.push(`financial.actual.empresa=${actual.empresa || "null"}`);
  lines.push(`financial.actual.plant=${plant.planta_nombre || plant.plant_code || "null"}`);
  if (actual.created_at != null) {
    lines.push(`financial.actual.created_at=${actual.created_at} role=upload_timestamp`);
  }
  const fields = actual.fields || {};
  for (const key of FINANCE_PROVIDED_FIELDS) {
    lines.push(`financial.actual.fields.${key}=${formatStoredContextValue(fields[key])} origin=FINANCE_PROVIDED`);
  }
  const rec = actual.reconciliation;
  if (rec) {
    lines.push(`financial.actual.reconciliation.status=${rec.status}`);
    lines.push(
      `financial.actual.reconciliation.finance_venta_ton=${formatStoredContextValue(rec.finance_venta_ton)} class=ACTUAL_FINANCIAL`
    );
    lines.push(
      `financial.actual.reconciliation.arr_venta_ton=${formatStoredContextValue(rec.arr_venta_ton)} class=ACTUAL_COMMERCIAL`
    );
    lines.push("No elijas un ganador entre Finance venta_ton y ARR. Conserva ambos. No overwrite.");
  }
  return lines;
}

function formatMonthCloseContext(assembled) {
  const actual = assembled.financial && assembled.financial.actual;
  const forecast = assembled.financial && assembled.financial.forecast;
  const lines = [
    "BLOQUE month_close_result — ACTUAL_COMMERCIAL vs TARGET_COMMITMENT vs FORECAST vs ACTUAL_FINANCIAL.",
    `planta=${assembled.plant && assembled.plant.planta_nombre} month=${assembled.month} period_status=${assembled.period_status}`,
    `sales.actual_ton=${assembled.sales && assembled.sales.actual_ton} class=ACTUAL_COMMERCIAL`,
    `sales.target_ton=${assembled.sales && assembled.sales.target_ton} class=TARGET_COMMITMENT status=${assembled.sales && assembled.sales.target_status}`,
    `sales.delta_ton=${assembled.sales && assembled.sales.delta_ton} attainment_pct=${assembled.sales && assembled.sales.attainment_pct}`,
    `channels CASA_kg=${assembled.channels && assembled.channels.casa_kg} COMISIONISTA_kg=${assembled.channels && assembled.channels.comisionista_kg}`,
    `discount/kg=${assembled.discount && assembled.discount.per_kg} formula=SUM(monto)/SUM(kg)`,
    ...formatFinancialActualContext(actual),
    `financial.target=${assembled.financial && assembled.financial.target ? "TARGET_COMMITMENT" : "absent"}`,
    `financial.target.venta_ton=${formatStoredContextValue(assembled.sales && assembled.sales.target_ton)} class=TARGET_COMMITMENT`,
    `financial.forecast=${forecast && forecast.truth_class === "FORECAST" ? "FORECAST" : "absent"}`,
    `financial.forecast.venta_ton=${formatStoredContextValue(forecastVentaTon(forecast))} class=FORECAST`,
    `gaps=${((assembled.information_gaps || []).map((g) => g.kind) || []).join(",")}`,
    `limitations=${(assembled.limitations || []).join(",")}`,
    "Mover != causa. No carry-forward de meta. No llames actual al IGF ni forecast a la meta. ARR != ACTUAL_FINANCIAL.",
  ];
  return lines.join("\n");
}

function buildMonthClosePrompt(assembled, question) {
  return {
    systemPrompt: SYSTEM_ADDENDUM,
    userContent: [formatMonthCloseContext(assembled), "", `Pregunta: ${question || ""}`].join("\n"),
  };
}

function deriveMonthCloseGap(assembled) {
  const missing = [];
  if (assembled.sales && assembled.sales.target_status === "TARGET_MISSING_FOR_PERIOD") {
    missing.push("target_commitment");
  }
  const actualStatus =
    assembled.financial && assembled.financial.actual && assembled.financial.actual.status
      ? assembled.financial.actual.status
      : "UNSUPPORTED_METRIC";
  if (actualStatus !== FINANCIAL_ACTUAL_CODES.SUPPORTED) {
    missing.push("financial_actual");
  }
  return {
    missing_fields: missing,
    why_blocks: "faltan hechos físicos para afirmar cumplimiento completo",
    physical_source: null,
    physical_person: null,
  };
}

function buildMonthCloseChatResult(assembled, opts) {
  return {
    ok: true,
    answer: opts.answer,
    sources: ["arr.ventas_diarias_cliente", "igf_meta.meta_lines", "igf.compromiso_lines"],
    context_meta: {
      mode: "month_close_result",
      prompt_mode: "month_close_result",
      openai_called: Boolean(opts.openai_called),
      openai_call_count: opts.openai_called ? 1 : 0,
      writes: false,
      plaud: false,
      planta_id: opts.planta_id,
      month: assembled.month,
      period_status: assembled.period_status,
      truth_classes: {
        actual: "ARR",
        target: "igf_meta",
        forecast: "igf.compromiso_lines",
        financial_actual:
          assembled.financial &&
          assembled.financial.actual &&
          assembled.financial.actual.truth_class === "ACTUAL_FINANCIAL"
            ? "ACTUAL_FINANCIAL"
            : (assembled.financial && assembled.financial.actual && assembled.financial.actual.status) ||
              "UNSUPPORTED_METRIC",
      },
      month_close: {
        month: assembled.month,
        period_status: assembled.period_status,
        sales: assembled.sales,
        financial_actual: assembled.financial && assembled.financial.actual,
        information_gaps: assembled.information_gaps,
        limitations: assembled.limitations,
        provenance: assembled.provenance,
        partial: Boolean(assembled.partial),
        assembly_status: assembled.assembly_status,
      },
    },
  };
}

module.exports = {
  SEMANTIC_CLASS,
  SYSTEM_ADDENDUM,
  FINANCIAL_TARGET_FIELDS,
  FINANCIAL_ACTUAL_CODES,
  composeFinancialActual,
  normalizeQuestion,
  isMonthCloseQuestion,
  isMonthCloseFollowUp,
  wantsFirstMover,
  resolveCloseMonth,
  periodStatus,
  toYyyyMm,
  toTon,
  pickCurrentMetaVersion,
  pickMetaRowForPlant,
  extractFinancialTarget,
  aggregateSales,
  aggregateDiscount,
  classifyClients,
  assembleMonthClosePack,
  loadMonthCloseResultForChat,
  formatMonthCloseContext,
  formatFinancialActualContext,
  buildMonthClosePrompt,
  buildMonthCloseChatResult,
  deriveMonthCloseGap,
};
