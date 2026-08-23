"use strict";

/**
 * Director IA — M4 primer slice: query JSON read-only de clasificación de apoyos.
 * SELECT public.folios + buildClasificacionMatrix.
 * No COMPARAR. No Excel. No HTTP. No writes. No fallback global de plantas.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const {
  PLANTAS_COMPARATIVO,
  buildClasificacionMatrix,
} = require("./clasificacion-apoyos-excel");

const CLASIFICACION_SEMANTIC_CLASS = "clasificacion_apoyos_matrix";
const SOURCE = "public.folios";
const FAMILIES = Object.freeze(["GASTOS", "INVERSIONES", "TALLER"]);

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de clasificación de apoyos",
  };
}

function isValidYyyyMm(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
}

function parseYyyyMmTokens(question) {
  const found = [];
  const re = /\b(\d{4}-\d{2})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) found.push(m[1]);
  return found;
}

function periodFailure(code, error) {
  return {
    ok: false,
    status: 400,
    code,
    error,
  };
}

function resolveComparePeriods(question, opts = {}) {
  const explicitA = opts.mes_a != null && String(opts.mes_a).trim() !== "" ? String(opts.mes_a).trim() : null;
  const explicitB = opts.mes_b != null && String(opts.mes_b).trim() !== "" ? String(opts.mes_b).trim() : null;
  if (explicitA || explicitB) {
    if (!explicitA) return periodFailure("missing_mes_a", "Indica mes_a YYYY-MM. No invento el mes.");
    if (!explicitB) return periodFailure("missing_mes_b", "Indica mes_b YYYY-MM. No invento el mes.");
    if (!isValidYyyyMm(explicitA)) return periodFailure("invalid_mes_a", "mes_a inválido. Usa YYYY-MM.");
    if (!isValidYyyyMm(explicitB)) return periodFailure("invalid_mes_b", "mes_b inválido. Usa YYYY-MM.");
    if (explicitA === explicitB) {
      return periodFailure("same_period", "mes_a y mes_b deben ser distintos.");
    }
    return { ok: true, mes_a: explicitA, mes_b: explicitB };
  }

  const tokens = parseYyyyMmTokens(question);
  if (tokens.length === 0) {
    return periodFailure("missing_period", "Indica mes_a y mes_b en formato YYYY-MM. No invento los meses.");
  }
  if (tokens.length === 1) {
    return periodFailure("missing_period", "Indica mes_a y mes_b en formato YYYY-MM. No invento el mes faltante.");
  }
  if (tokens.length > 2) {
    return periodFailure("invalid_period", "Indica exactamente dos meses YYYY-MM (mes_a y mes_b).");
  }
  for (const token of tokens) {
    if (!isValidYyyyMm(token)) {
      return periodFailure("invalid_period", "Periodo inválido. Usa YYYY-MM.");
    }
  }
  if (tokens[0] === tokens[1]) {
    return periodFailure("same_period", "mes_a y mes_b deben ser distintos.");
  }
  return { ok: true, mes_a: tokens[0], mes_b: tokens[1] };
}

function findComparativoGroup(plantaId) {
  const id = Number(plantaId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return PLANTAS_COMPARATIVO.find((p) => (p.ids || []).includes(id)) || null;
}

function assertComparativoGroupAccess(auth, group) {
  const permitted = Array.isArray(auth && auth.plantas_permitidas)
    ? auth.plantas_permitidas.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (permitted.length === 0) return { ok: true };
  const missing = (group.ids || []).filter((id) => !permitted.includes(Number(id)));
  if (missing.length > 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error:
        "El comparativo de esta planta incluye plantas fuera de tu alcance. No amplio el scope ni consulto un conjunto global.",
    };
  }
  return { ok: true };
}

function percentChange(valorA, valorB) {
  const a = Number(valorA);
  const b = Number(valorB);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Math.round(((a - b) / Math.abs(b)) * 10000) / 100;
}

function familyComparisons(bucketA, bucketB) {
  const a = bucketA || {};
  const b = bucketB || {};
  return FAMILIES.map((familia) => {
    const key = familia === "GASTOS" ? "gastos" : familia === "INVERSIONES" ? "inversiones" : "taller";
    const valor_a = Number(a[key]) || 0;
    const valor_b = Number(b[key]) || 0;
    return {
      categoria: familia,
      valor_a,
      valor_b,
      delta: valor_a - valor_b,
      percent_change: percentChange(valor_a, valor_b),
    };
  });
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function queryClasificacionFolios(client, mesA, mesB, plantIds) {
  const ids = (plantIds || []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  const r = await client.query(
    `SELECT f.planta_id, f.categoria, f.importe, f.mes_cargo
       FROM public.folios f
      WHERE f.mes_cargo = ANY($1::text[])
        AND UPPER(TRIM(COALESCE(f.estatus,''))) <> 'CANCELADO'
        AND f.planta_id IS NOT NULL
        AND f.planta_id = ANY($2::int[])
        AND COALESCE(f.solo_zp_ad, false) = false`,
    [[mesA, mesB], ids.length ? ids : [-1]]
  );
  return r.rows || [];
}

async function loadClasificacionApoyosForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const group = findComparativoGroup(plantaId);
  if (!group) {
    return {
      ok: false,
      code: "plant_not_in_comparativo",
      status: 400,
      error:
        "Esta planta no pertenece al comparativo de clasificación. No consulto un conjunto global de plantas.",
    };
  }

  const groupDenied = assertComparativoGroupAccess(auth, group);
  if (!groupDenied.ok) return groupDenied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const period = resolveComparePeriods(question, opts);
  if (!period.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: period.status,
      error: period.error,
      period_code: period.code,
    };
  }

  const queryFn = opts.queryClasificacionFolios || queryClasificacionFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const matrixFn = opts.buildClasificacionMatrix || buildClasificacionMatrix;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    const plantaClave = planta && planta.clave ? String(planta.clave) : null;
    const rows = await queryFn(client, period.mes_a, period.mes_b, group.ids);
    const matrix = matrixFn(rows, period.mes_a, period.mes_b, { plantaId: Number(plantaId) });
    const plantRow = Array.isArray(matrix.plantas) && matrix.plantas.length ? matrix.plantas[0] : null;
    const comparisons = familyComparisons(plantRow && plantRow.a, plantRow && plantRow.b);
    const totalA = plantRow ? Number(plantRow.a.total) || 0 : 0;
    const totalB = plantRow ? Number(plantRow.b.total) || 0 : 0;
    comparisons.push({
      categoria: "TOTAL",
      valor_a: totalA,
      valor_b: totalB,
      delta: totalA - totalB,
      percent_change: percentChange(totalA, totalB),
    });
    return {
      ok: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      planta_clave: plantaClave,
      planta_grupo: group.label,
      planta_ids: [...group.ids],
      mes_a: period.mes_a,
      mes_b: period.mes_b,
      mes_a_label: matrix.mes_a_label,
      mes_b_label: matrix.mes_b_label,
      vs_label: matrix.vs_label,
      families: [...FAMILIES],
      comparisons,
      matrix,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: CLASIFICACION_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.queryClasificacionFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de clasificación de apoyos no disponible");
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

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "importe no registrado";
  return String(Math.round(n));
}

function formatDelta(row) {
  const delta = Number(row.delta);
  if (!Number.isFinite(delta) || delta === 0) return "sin diferencia observada";
  const verb = delta > 0 ? "aumentó" : "disminuyó";
  const pct =
    row.percent_change == null
      ? "porcentaje no calculable (base cero)"
      : `${row.percent_change}%`;
  return `${verb} ${formatMoney(Math.abs(delta))} (${pct})`;
}

function buildClasificacionApoyosAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar la clasificación de apoyos de esta planta.";
    }
    if (payload && (payload.status === 400 || payload.period_code)) {
      return payload.error || "Indica mes_a y mes_b en formato YYYY-MM. No invento los meses.";
    }
    return "No pude consultar la clasificación de apoyos por un error de fuente. No invento importes ni diferencias.";
  }

  const scope = payload.planta_grupo || payload.planta_nombre || `planta ${payload.planta_id}`;
  const lines = (payload.comparisons || [])
    .filter((row) => row.categoria !== "TOTAL")
    .map((row) => {
      return `${row.categoria}: ${payload.mes_a} ${formatMoney(row.valor_a)} vs ${payload.mes_b} ${formatMoney(row.valor_b)}; ${formatDelta(row)}`;
    });
  const total = (payload.comparisons || []).find((row) => row.categoria === "TOTAL");
  const totalLine = total
    ? `Total: ${payload.mes_a} ${formatMoney(total.valor_a)} vs ${payload.mes_b} ${formatMoney(total.valor_b)}; ${formatDelta(total)}.`
    : "";
  return (
    `Clasificación de apoyos en ${scope} (${payload.vs_label || `${payload.mes_a} vs ${payload.mes_b}`}). Hechos observados en ${SOURCE}. ` +
    `GASTOS, INVERSIONES y TALLER van separados. No es IGF, no es listado M6, no es Taller por AT, no es COMPARAR ni Excel. ` +
    `El delta es factual. No infiero motivo, presupuesto ni dueño. ` +
    `${totalLine} ${lines.join(" ")}`
  );
}

function buildClasificacionApoyosChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildClasificacionApoyosAnswer(payload);
  let veracity = DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (!okPayload) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
    } else {
      veracity = DIRECTOR_IA_VERACITY.SOURCE_ERROR;
    }
  }
  return {
    ok: true,
    answer,
    sources: okPayload ? [SOURCE] : [],
    context_meta: {
      mode: "clasificacion_apoyos",
      requested_domain: "clasificacion_apoyos",
      openai_called: false,
      veracity,
      semantic_class: CLASIFICACION_SEMANTIC_CLASS,
      planta_id,
      mes_a: okPayload ? payload.mes_a : undefined,
      mes_b: okPayload ? payload.mes_b : undefined,
      timestamp: new Date().toISOString(),
    },
    clasificacion_apoyos: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          planta_grupo: payload.planta_grupo,
          planta_ids: payload.planta_ids,
          mes_a: payload.mes_a,
          mes_b: payload.mes_b,
          vs_label: payload.vs_label,
          families: payload.families,
          comparisons: payload.comparisons,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "clasificacion_apoyos", label: "Clasificación de apoyos" }
        : undefined,
  };
}

module.exports = {
  CLASIFICACION_SEMANTIC_CLASS,
  SOURCE,
  FAMILIES,
  isValidYyyyMm,
  parseYyyyMmTokens,
  resolveComparePeriods,
  findComparativoGroup,
  assertComparativoGroupAccess,
  percentChange,
  queryClasificacionFolios,
  loadClasificacionApoyosForChat,
  buildClasificacionApoyosAnswer,
  buildClasificacionApoyosChatResult,
};
