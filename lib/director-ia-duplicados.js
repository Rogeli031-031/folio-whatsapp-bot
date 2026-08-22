"use strict";

/**
 * Director IA — M16 análisis read-only de posibles duplicados de folios.
 * Executor in-process. No HTTP. No mutaciones. No confirma duplicados.
 */

const { findDuplicatePairs } = require("./folio-duplicados");
const { loadFoliosParaDuplicados } = require("./folio-duplicados-load");
const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");

const DUPLICATE_UMBRAL = 0.72;
const DUPLICATE_MAX_PAIRS = 200;
const DUPLICATE_DEFAULT_MESES = 6;
const DUPLICATE_SEMANTIC_CLASS = "possible_duplicate_heuristic";
const DUPLICATE_CRITERIO =
  "mismo importe redondeado a 2 decimales + similitud de concepto ≥ umbral (Jaccard de tokens / Dice de bigramas)";

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

/**
 * Mismo criterio que assertPlantaPermitidaDashboard + bloqueo GV de /api/folios.
 * @param {object} auth req.dashboardAuth
 * @param {number} plantaId
 */
function assertDuplicateFoliosAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GV") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) no tiene acceso al dashboard de folios.",
    };
  }
  if (["GG", "GA", "AD"].includes(role) && auth && auth.plantas_permitidas?.length > 0) {
    if (!plantaId || !auth.plantas_permitidas.includes(plantaId)) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
        status: 403,
        error: "Sin permiso para esta planta",
      };
    }
  }
  return { ok: true };
}

function resolveAnalisisWindow(opts = {}) {
  let desde = opts.desde != null ? String(opts.desde).trim() : "";
  let hasta = opts.hasta != null ? String(opts.hasta).trim() : "";
  let meses = DUPLICATE_DEFAULT_MESES;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    const rawMeses = opts.meses != null ? parseInt(opts.meses, 10) : DUPLICATE_DEFAULT_MESES;
    meses = Number.isFinite(rawMeses) && rawMeses > 0 ? Math.min(rawMeses, 36) : DUPLICATE_DEFAULT_MESES;
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    desde = d.toISOString().slice(0, 10);
  }
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) hasta = "";
  return { desde, hasta: hasta || null, meses };
}

async function resolvePlantaRow(client, plantaId) {
  const plantaRow = await client.query(`SELECT id, nombre FROM public.plantas WHERE id = $1`, [plantaId]);
  return plantaRow.rows[0] || null;
}

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error en análisis de duplicados",
  };
}

/**
 * Executor read-only de get_duplicate_folios.
 * @param {import("pg").Pool|null} pool
 * @param {number} plantaId
 * @param {object} [req]
 * @param {object} [opts] dependencias inyectables para test
 */
async function loadDuplicateFoliosForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const denied = assertDuplicateFoliosAccess(auth, plantaId);
  if (!denied.ok) return denied;

  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }

  const { desde, hasta, meses } = resolveAnalisisWindow(opts);
  const umbral = DUPLICATE_UMBRAL;
  const findPairs = opts.findDuplicatePairs || findDuplicatePairs;
  const loadRows = opts.loadFolios || loadFoliosParaDuplicados;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;

  async function run(client) {
    const planta = await resolvePlanta(client, plantaId);
    if (!planta) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Planta no encontrada",
      };
    }
    const rows = await loadRows(client, plantaId, desde, hasta, {
      resolveEquivalentIds: opts.resolveEquivalentIds,
    });
    const result = findPairs(rows, { umbral, maxPairs: DUPLICATE_MAX_PAIRS });
    return {
      ok: true,
      semantic_class: DUPLICATE_SEMANTIC_CLASS,
      criterio: DUPLICATE_CRITERIO,
      planta_id: plantaId,
      planta_nombre: planta.nombre || null,
      desde,
      hasta,
      meses,
      umbral,
      max_pairs: DUPLICATE_MAX_PAIRS,
      scanned: result.scanned,
      pairs_count: Array.isArray(result.pairs) ? result.pairs.length : 0,
      truncated: !!result.truncated,
      pairs: Array.isArray(result.pairs) ? result.pairs : [],
    };
  }

  const injected = Boolean(opts.loadFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de folios no disponible");
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message);
  } finally {
    client.release();
  }
}

function formatFolioRef(side) {
  if (!side) return "folio desconocido";
  const num = side.numero_folio || side.folio_codigo || side.id;
  return `${num} (id ${side.id})`;
}

function buildDuplicateFoliosAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar posibles duplicados de esta planta.";
    }
    if (payload && payload.status === 404) {
      return "No encontré la planta indicada. No puedo completar el análisis de posibles duplicados.";
    }
    return "No pude completar el análisis de posibles duplicados por un error de fuente. No puedo afirmar si existen o no candidatos bajo los criterios aplicados.";
  }

  const scope = [
    payload.planta_nombre || `planta ${payload.planta_id}`,
    payload.desde ? `desde ${payload.desde}` : null,
    payload.hasta ? `hasta ${payload.hasta}` : null,
    `umbral ${payload.umbral}`,
    `${payload.scanned} folios escaneados`,
  ]
    .filter(Boolean)
    .join("; ");

  if (!payload.pairs_count) {
    return (
      `No se encontraron candidatos a posible duplicidad bajo los criterios aplicados (${payload.criterio}; ${scope}). ` +
      "Esto no demuestra que sea imposible que existan duplicados fuera de ese alcance o de los límites de escaneo."
    );
  }

  const shown = payload.pairs.slice(0, 8).map((pair, i) => {
    const scorePct = pair.score != null ? `${Math.round(Number(pair.score) * 100)}%` : "n/d";
    return (
      `${i + 1}. ${formatFolioRef(pair.a)} y ${formatFolioRef(pair.b)}` +
      ` — importe ${pair.importe}; similitud de concepto ${scorePct}`
    );
  });
  const more =
    payload.pairs_count > shown.length
      ? `\n… y ${payload.pairs_count - shown.length} par(es) adicional(es) en la evidencia.`
      : "";
  const truncated = payload.truncated
    ? " El resultado está recortado por límite de pares o tamaño de grupo; no es un inventario completo."
    : "";

  const pairLabel = payload.pairs_count === 1 ? "par" : "pares";
  return (
    `Encontré ${payload.pairs_count} ${pairLabel} que cumplen los criterios de posible duplicidad` +
    ` (candidatos heurísticos; no equivalen a una confirmación). Criterio: ${payload.criterio}. Alcance: ${scope}.\n` +
    shown.join("\n") +
    more +
    truncated
  );
}

function buildDuplicateFoliosChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? opts.planta_id : payload && payload.planta_id;
  const answer = buildDuplicateFoliosAnswer(payload);
  const okPayload = Boolean(payload && payload.ok);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else if (payload && payload.code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) {
      veracity = DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }

  return {
    ok: true,
    answer,
    sources: okPayload ? ["folios.duplicados.findDuplicatePairs"] : [],
    context_meta: {
      mode: "duplicate_folios",
      requested_domain: "duplicados",
      openai_called: false,
      veracity,
      semantic_class: DUPLICATE_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      pairs_count: okPayload ? payload.pairs_count : undefined,
      truncated: okPayload ? payload.truncated : undefined,
      umbral: okPayload ? payload.umbral : undefined,
      desde: okPayload ? payload.desde : undefined,
      hasta: okPayload ? payload.hasta : undefined,
    },
    duplicate_folios: okPayload
      ? {
          semantic_class: payload.semantic_class,
          criterio: payload.criterio,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          desde: payload.desde,
          hasta: payload.hasta,
          umbral: payload.umbral,
          scanned: payload.scanned,
          pairs_count: payload.pairs_count,
          truncated: payload.truncated,
          pairs: payload.pairs,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "duplicados", label: "Duplicados de folios" }
        : undefined,
  };
}

module.exports = {
  DUPLICATE_UMBRAL,
  DUPLICATE_MAX_PAIRS,
  DUPLICATE_SEMANTIC_CLASS,
  DUPLICATE_CRITERIO,
  assertDuplicateFoliosAccess,
  resolveAnalisisWindow,
  loadDuplicateFoliosForChat,
  buildDuplicateFoliosAnswer,
  buildDuplicateFoliosChatResult,
};
