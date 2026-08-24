"use strict";

/**
 * Director IA — M5 primer slice: query read-only de TALLER por unidad.
 * SELECT public.folios + expandTallerRows + token de folios.unidad.
 * No Excel. No workbook. No duplicados. No HTTP. No writes. No Action Register.
 * No at_id. No catálogo AT.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  parseDashboardFilters,
  buildDashboardWhere,
  getPlantaIdsEquivalentesForPendientes,
} = require("./director-ia-m3-plantas-kpis-proyectos");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const { expandTallerRows } = require("./taller-at-excel");
const unidadTaller = require("./unidad-taller");

const TALLER_AT_SEMANTIC_CLASS = "taller_at_unidad";
const SOURCE = "public.folios";
const RECORD_LIMIT = 40;
const ZERO_ROWS_ANSWER =
  "No se encontraron registros TALLER para esa planta/unidad/periodo.";

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de Taller por AT",
  };
}

function parseYyyyMmTokens(question) {
  const found = [];
  const re = /\b(\d{4}-\d{2})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) found.push(m[1]);
  return found;
}

function isValidYyyyMm(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
}

function resolvePeriodRange(question) {
  const tokens = parseYyyyMmTokens(question);
  if (tokens.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "missing_period",
      error: "Indica el periodo YYYY-MM. No invento el mes.",
    };
  }
  if (tokens.length > 2) {
    return {
      ok: false,
      status: 400,
      code: "invalid_period",
      error: "Indica un mes YYYY-MM o un rango de dos YYYY-MM.",
    };
  }
  for (const token of tokens) {
    if (!isValidYyyyMm(token)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_period",
        error: "Periodo inválido. Usa YYYY-MM.",
      };
    }
  }
  let mesDesde = tokens[0];
  let mesHasta = tokens.length === 2 ? tokens[1] : tokens[0];
  if (mesDesde > mesHasta) {
    const tmp = mesDesde;
    mesDesde = mesHasta;
    mesHasta = tmp;
  }
  return { ok: true, mes_desde: mesDesde, mes_hasta: mesHasta };
}

function homologarUnidadToken(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const list = unidadTaller.parseUnidadesList(text);
  if (list.length) return list;
  const one = unidadTaller.normalizeUnidadToken(text);
  return one ? [one] : [];
}

function parseUnidadFilter(question) {
  const q = String(question || "");
  const found = [];
  const tokenRe = /\b((?:AT|PT|S|C|U|T)[-\s]?\d{1,4})\b/gi;
  let m;
  while ((m = tokenRe.exec(q))) {
    found.push(...homologarUnidadToken(m[1]));
  }
  const unidadNum = /\bunidad\s+(\d{1,4})\b/i.exec(q);
  if (unidadNum) {
    found.push(...homologarUnidadToken(unidadNum[1]));
  }
  return [...new Set(found.filter(Boolean))];
}

function tallerPredicateSql() {
  return `UPPER(TRIM(COALESCE(f.categoria,''))) LIKE '%TALLER%'`;
}

function authForM5Query(auth) {
  return {
    ...(auth || {}),
    permisos: {
      ...((auth && auth.permisos) || {}),
      acceso_ver_folios_solo_zp_ad: false,
    },
  };
}

function plantScopeIds(plantaId, resolveEquivalentIds) {
  const fn = resolveEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const ids = fn(plantaId) || [];
  return [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
}

function derivedTotal(records) {
  let total = 0;
  for (const row of records) {
    const n = row && row.importe != null ? Number(row.importe) : 0;
    if (Number.isFinite(n)) total += n;
  }
  return Math.round(total * 100) / 100;
}

function projectRecord(row, plantaId, plantaNombre, plantaClave) {
  return {
    folio_id: row.folio_id != null ? Number(row.folio_id) : null,
    numero_folio: row.numero_folio ? String(row.numero_folio) : null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : Number(plantaId),
    planta_nombre: row.planta_nombre || plantaNombre || null,
    planta_clave: plantaClave || null,
    unidad: row.unidad != null && String(row.unidad).trim() !== "" ? String(row.unidad).trim() : null,
    periodo: row.mes_cargo || null,
    concepto: row.concepto || null,
    importe: row.importe != null ? Number(row.importe) : null,
    estatus: row.estatus || null,
    source: SOURCE,
  };
}

function rowMatchesUnidad(row, unidades) {
  if (!unidades || !unidades.length) return true;
  const tokens = new Set(homologarUnidadToken(row.unidad));
  if (row.unidad) tokens.add(String(row.unidad).trim());
  return unidades.some((u) => tokens.has(u));
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function queryTallerFolios(client, auth, plantaId, mesDesde, mesHasta, opts = {}) {
  const filters = parseDashboardFilters({});
  const { where, params } = buildDashboardWhere(authForM5Query(auth), {
    ...filters,
    soloActivos: false,
    ventanaDefault: false,
  });
  let n = params.length;
  const extra = [];
  n += 1;
  extra.push(`f.mes_cargo >= $${n}::text`);
  params.push(mesDesde);
  n += 1;
  extra.push(`f.mes_cargo <= $${n}::text`);
  params.push(mesHasta);
  extra.push(tallerPredicateSql());
  extra.push(`UPPER(TRIM(COALESCE(f.estatus,''))) <> 'CANCELADO'`);
  const ids = plantScopeIds(plantaId, opts.resolveEquivalentIds);
  n += 1;
  extra.push(`f.planta_id = ANY($${n}::int[])`);
  params.push(ids.length ? ids : [Number(plantaId)]);
  const q = `
      SELECT f.id,
             f.numero_folio,
             f.planta_id,
             f.unidad,
             f.subcategoria,
             COALESCE(NULLIF(TRIM(f.descripcion), ''), NULLIF(TRIM(f.concepto), ''), '') AS concepto,
             f.importe,
             f.detalle_lineas,
             f.mes_cargo,
             f.estatus,
             p.nombre AS planta_nombre,
             p.clave AS planta_clave
        FROM public.folios f
        LEFT JOIN public.plantas p ON p.id = f.planta_id
       WHERE 1=1 ${where}
         AND ${extra.join(" AND ")}
       ORDER BY f.mes_cargo DESC, f.unidad NULLS LAST, f.id`;
  const r = await client.query(q, params);
  return r.rows || [];
}

async function loadTallerAtForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const question = opts.question != null ? String(opts.question) : String((req && req.body && req.body.question) || "");
  const period = resolvePeriodRange(question);
  if (!period.ok) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: period.status,
      error: period.error,
      period_code: period.code,
    };
  }

  const unidades = Array.isArray(opts.unidad)
    ? opts.unidad
    : opts.unidad
      ? homologarUnidadToken(opts.unidad)
      : parseUnidadFilter(question);
  if (/\bunidad\b/i.test(question) && unidades.length === 0 && !/\b(?:AT|PT|S|C|U|T)[-\s]?\d{1,4}\b/i.test(question)) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "Indica la unidad (AT-15, PT-03). No invento la unidad.",
      unidad_code: "missing_unidad",
    };
  }

  const queryFn = opts.queryTallerFolios || queryTallerFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const expandFn = opts.expandTallerRows || expandTallerRows;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    const plantaClave = planta && planta.clave ? String(planta.clave) : null;
    const folioRows = await queryFn(client, auth, Number(plantaId), period.mes_desde, period.mes_hasta, {
      resolveEquivalentIds: opts.resolveEquivalentIds,
    });
    const expanded = expandFn(folioRows || []).filter((row) => {
      if (!row || row.row_kind === "grupo") return false;
      const mes = String(row.mes_cargo || "");
      if (mes < period.mes_desde || mes > period.mes_hasta) return false;
      return rowMatchesUnidad(row, unidades);
    });
    const allRecords = expanded.map((row) => projectRecord(row, Number(plantaId), plantaNombre, plantaClave));
    const truncated = allRecords.length > RECORD_LIMIT;
    const records = truncated ? allRecords.slice(0, RECORD_LIMIT) : allRecords;
    return {
      ok: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      planta_clave: plantaClave,
      unidades: unidades.length ? unidades : null,
      periodo: {
        mes_desde: period.mes_desde,
        mes_hasta: period.mes_hasta,
      },
      count: allRecords.length,
      total: derivedTotal(allRecords),
      truncated,
      records,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: TALLER_AT_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.queryTallerFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de Taller por AT no disponible");
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
  return n.toFixed(2);
}

function buildTallerAtAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar Taller por AT de esta planta.";
    }
    if (payload && payload.status === 400) {
      return payload.error || "Indica el periodo YYYY-MM. No invento el mes.";
    }
    return "No pude consultar Taller por AT por un error de fuente. No invento unidades ni importes.";
  }

  if (!payload.records || payload.records.length === 0) {
    return ZERO_ROWS_ANSWER;
  }

  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const desde = payload.periodo && payload.periodo.mes_desde;
  const hasta = payload.periodo && payload.periodo.mes_hasta;
  const rango = desde === hasta ? desde : `${desde} a ${hasta}`;
  const unidadBit = payload.unidades && payload.unidades.length ? ` Unidad: ${payload.unidades.join(", ")}.` : "";
  const trunc = payload.truncated ? ` Listado truncado a ${RECORD_LIMIT} de ${payload.count} registros.` : "";
  const lines = payload.records.slice(0, 16).map((row, i) => {
    const folio = row.numero_folio || row.folio_id || "folio no registrado";
    const unidad = row.unidad || "unidad no registrada";
    const concepto = row.concepto || "concepto no registrado";
    const importe = formatMoney(row.importe);
    const estatus = row.estatus || "estatus no registrado";
    return `${i + 1}. ${unidad}; ${folio}; ${concepto}; ${importe}; ${row.periodo || rango}; ${estatus}`;
  });
  return (
    `${payload.count} registro(s) TALLER en ${scope} (${rango}).${unidadBit} Total ${formatMoney(payload.total)}.${trunc} ` +
    `Hechos observados en ${SOURCE}.unidad. No es GASTOS, INVERSIONES, M4 ni Action Register. ` +
    `No afirmo causa, responsable, atraso ni desviación.\n` +
    lines.join("\n")
  );
}

function buildTallerAtChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const okPayload = payload && payload.ok === true;
  const answer = buildTallerAtAnswer(payload);
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
      mode: "taller_at",
      requested_domain: "taller_at",
      openai_called: false,
      veracity,
      semantic_class: TALLER_AT_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
      total: okPayload ? payload.total : undefined,
    },
    taller_at: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          unidades: payload.unidades,
          periodo: payload.periodo,
          source: payload.source,
          retrieved_at: payload.retrieved_at,
          count: payload.count,
          total: payload.total,
          truncated: payload.truncated,
          records: payload.records,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "taller_at", label: "Taller por AT" }
        : undefined,
  };
}

module.exports = {
  TALLER_AT_SEMANTIC_CLASS,
  SOURCE,
  RECORD_LIMIT,
  ZERO_ROWS_ANSWER,
  parseYyyyMmTokens,
  isValidYyyyMm,
  resolvePeriodRange,
  parseUnidadFilter,
  homologarUnidadToken,
  tallerPredicateSql,
  derivedTotal,
  queryTallerFolios,
  loadTallerAtForChat,
  buildTallerAtAnswer,
  buildTallerAtChatResult,
};
