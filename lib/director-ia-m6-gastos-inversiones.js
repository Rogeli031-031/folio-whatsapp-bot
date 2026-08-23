"use strict";

/**
 * Director IA — M6 primer slice: query read-only de GASTOS / INVERSIONES.
 * SELECT sobre public.folios + expandCategoriaRows.
 * No Excel. No HTTP. No writes. No IGF. No Taller AT.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");
const {
  parseDashboardFilters,
  buildDashboardWhere,
  getPlantaIdsEquivalentesForPendientes,
} = require("./director-ia-m3-plantas-kpis-proyectos");
const { assertFolioStatusAccess, requirePlantaId } = require("./director-ia-m2-folio-status");
const { expandCategoriaRows } = require("./categoria-rango-excel");

const GASTOS_INVERSIONES_SEMANTIC_CLASS = "gastos_inversiones_folios";
const SOURCE = "public.folios";
const RECORD_LIMIT = 40;
const CATEGORIES = Object.freeze({ GASTOS: "GASTOS", INVERSIONES: "INVERSIONES" });

function sourceError(message) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente de GASTOS/INVERSIONES",
  };
}

function normalizeCategory(category) {
  const raw = String(category || "")
    .trim()
    .toUpperCase();
  if (raw === CATEGORIES.INVERSIONES) return CATEGORIES.INVERSIONES;
  if (raw === CATEGORIES.GASTOS) return CATEGORIES.GASTOS;
  return null;
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

function parsePartidaFilter(question) {
  const m = /\b(?:partida|subcategoria|concepto)\s+([a-z0-9áéíóúüñ /._-]{2,60})/i.exec(
    String(question || "")
  );
  if (!m) return null;
  const raw = String(m[1] || "")
    .replace(/\b\d{4}-\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw || null;
}

function categoryPredicateSql(category) {
  if (category === CATEGORIES.INVERSIONES) {
    return `(
        UPPER(TRIM(COALESCE(f.categoria,''))) = 'INVERSIONES'
        OR UPPER(TRIM(COALESCE(f.categoria,''))) LIKE '%INVERSION%'
      )`;
  }
  return `(
        UPPER(TRIM(COALESCE(f.categoria,''))) = 'GASTOS'
        OR UPPER(TRIM(COALESCE(f.categoria,''))) LIKE '%GASTO%'
      )
      AND UPPER(TRIM(COALESCE(f.categoria,''))) NOT LIKE '%TALLER%'
      AND UPPER(TRIM(COALESCE(f.categoria,''))) NOT LIKE '%INVERSION%'`;
}

function authForM6Query(auth) {
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

function projectRecord(row, category, plantaId, plantaNombre, plantaClave) {
  return {
    folio_id: row.folio_id != null ? Number(row.folio_id) : null,
    numero_folio: row.numero_folio ? String(row.numero_folio) : null,
    planta_id: row.planta_id != null ? Number(row.planta_id) : Number(plantaId),
    planta_nombre: row.planta_nombre || plantaNombre || null,
    planta_clave: row.planta_clave || plantaClave || null,
    periodo: row.mes_cargo || null,
    categoria: category,
    partida: row.subcategoria || null,
    concepto: row.concepto || null,
    importe: row.importe != null ? Number(row.importe) : null,
    estatus: row.estatus || null,
    beneficiario: row.beneficiario && row.beneficiario !== "—" ? row.beneficiario : row.beneficiario || null,
    source: SOURCE,
  };
}

function applyPartidaFilter(records, partida) {
  if (!partida) return records;
  const needle = String(partida)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!needle) return records;
  return records.filter((r) => {
    const partidaText = String(r.partida || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const conceptoText = String(r.concepto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return partidaText.includes(needle) || conceptoText.includes(needle);
  });
}

function derivedTotal(records) {
  let total = 0;
  for (const row of records) {
    const n = row && row.importe != null ? Number(row.importe) : 0;
    if (Number.isFinite(n)) total += n;
  }
  return Math.round(total * 100) / 100;
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [
    plantaId,
  ]);
  return r.rows[0] || null;
}

async function queryGastosInversionesFolios(client, auth, plantaId, category, mesDesde, mesHasta, opts = {}) {
  const filters = parseDashboardFilters({});
  const { where, params } = buildDashboardWhere(authForM6Query(auth), {
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
  extra.push(categoryPredicateSql(category));
  extra.push(`UPPER(TRIM(COALESCE(f.estatus,''))) <> 'CANCELADO'`);
  const ids = plantScopeIds(plantaId, opts.resolveEquivalentIds);
  n += 1;
  extra.push(`f.planta_id = ANY($${n}::int[])`);
  params.push(ids.length ? ids : [Number(plantaId)]);
  const q = `
      SELECT f.id,
             f.numero_folio,
             f.planta_id,
             f.beneficiario,
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
       ORDER BY f.mes_cargo DESC, f.subcategoria NULLS LAST, f.id`;
  const r = await client.query(q, params);
  return r.rows || [];
}

function expandFolioRows(rows, expandFn) {
  const expand = expandFn || expandCategoriaRows;
  return expand(rows || []);
}

function recordsFromExpanded(expanded, folioRows, category, plantaId, plantaNombre, plantaClave) {
  const byId = new Map((folioRows || []).map((row) => [Number(row.id), row]));
  return (expanded || []).map((row) => {
    const folio = byId.get(Number(row.folio_id)) || {};
    return projectRecord(
      {
        ...row,
        planta_id: folio.planta_id,
        planta_nombre: folio.planta_nombre,
        planta_clave: folio.planta_clave,
      },
      category,
      plantaId,
      plantaNombre,
      plantaClave
    );
  });
}

async function loadGastosInversionesForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertFolioStatusAccess(auth, Number(plantaId));
  if (!denied.ok) return denied;

  const category = normalizeCategory(opts.category);
  if (!category) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "categoria debe ser GASTOS o INVERSIONES",
    };
  }

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

  const partida = parsePartidaFilter(question);
  const queryFn = opts.queryGastosInversionesFolios || queryGastosInversionesFolios;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const expandFn = opts.expandCategoriaRows || expandCategoriaRows;

  async function run(client) {
    const planta = await resolvePlanta(client, Number(plantaId));
    const plantaNombre = planta && planta.nombre ? String(planta.nombre) : null;
    const plantaClave = planta && planta.clave ? String(planta.clave) : null;
    const folioRows = await queryFn(client, auth, Number(plantaId), category, period.mes_desde, period.mes_hasta, {
      resolveEquivalentIds: opts.resolveEquivalentIds,
    });
    const expanded = expandFolioRows(folioRows, expandFn).filter((row) => {
      const mes = String(row.mes_cargo || "");
      return mes >= period.mes_desde && mes <= period.mes_hasta;
    });
    const allRecords = applyPartidaFilter(
      recordsFromExpanded(expanded, folioRows, category, Number(plantaId), plantaNombre, plantaClave),
      partida
    );
    const truncated = allRecords.length > RECORD_LIMIT;
    const records = truncated ? allRecords.slice(0, RECORD_LIMIT) : allRecords;
    return {
      ok: true,
      planta_id: Number(plantaId),
      planta_nombre: plantaNombre,
      planta_clave: plantaClave,
      categoria: category,
      periodo: {
        mes_desde: period.mes_desde,
        mes_hasta: period.mes_hasta,
      },
      partida: partida || null,
      count: allRecords.length,
      total: derivedTotal(allRecords),
      truncated,
      records,
      retrieved_at: new Date().toISOString(),
      source: SOURCE,
      semantic_class: GASTOS_INVERSIONES_SEMANTIC_CLASS,
    };
  }

  const injected = Boolean(opts.queryGastosInversionesFolios && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message);
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de GASTOS/INVERSIONES no disponible");
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

function buildGastosInversionesAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar GASTOS/INVERSIONES de esta planta.";
    }
    if (payload && payload.status === 400) {
      return payload.error || "Indica el periodo YYYY-MM. No invento el mes.";
    }
    return "No pude consultar GASTOS/INVERSIONES por un error de fuente. No invento partidas ni importes.";
  }

  const cat = payload.categoria;
  const scope = payload.planta_nombre || `planta ${payload.planta_id}`;
  const desde = payload.periodo && payload.periodo.mes_desde;
  const hasta = payload.periodo && payload.periodo.mes_hasta;
  const rango = desde === hasta ? desde : `${desde} a ${hasta}`;
  const partidaBit = payload.partida ? ` Partida/concepto filtrado: ${payload.partida}.` : "";

  if (!payload.records || payload.records.length === 0) {
    return (
      `No hay registros de ${cat} en ${scope} para ${rango}.${partidaBit} ` +
      `Hechos observados en ${SOURCE}. No es IGF, no es Export y no invento partidas.`
    );
  }

  const trunc = payload.truncated ? ` Listado truncado a ${RECORD_LIMIT} de ${payload.count} registros.` : "";
  const lines = payload.records.slice(0, 16).map((row, i) => {
    const folio = row.numero_folio || row.folio_id || "folio no registrado";
    const partida = row.partida || "SIN SUBCATEGORÍA";
    const concepto = row.concepto || "concepto no registrado";
    const importe = formatMoney(row.importe);
    const estatus = row.estatus || "estatus no registrado";
    return `${i + 1}. ${folio}; ${partida}; ${concepto}; ${importe}; ${row.periodo || rango}; ${estatus}`;
  });
  return (
    `${payload.count} registro(s) de ${cat} en ${scope} (${rango}). Total ${formatMoney(payload.total)}.${partidaBit}${trunc} ` +
    `Hechos observados en ${SOURCE}. No es IGF ni Export. ` +
    `No afirmo desviación, causa ni comparación.\n` +
    lines.join("\n")
  );
}

function buildGastosInversionesChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? Number(opts.planta_id) : payload && payload.planta_id;
  const category = (payload && payload.categoria) || opts.category || null;
  const domain = category === CATEGORIES.INVERSIONES ? "inversiones" : "gastos";
  const okPayload = payload && payload.ok === true;
  const answer = buildGastosInversionesAnswer(payload);
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
      mode: "gastos_inversiones",
      requested_domain: domain,
      openai_called: false,
      veracity,
      semantic_class: GASTOS_INVERSIONES_SEMANTIC_CLASS,
      planta_id,
      categoria: category,
      timestamp: new Date().toISOString(),
      count: okPayload ? payload.count : undefined,
      total: okPayload ? payload.total : undefined,
    },
    gastos_inversiones: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          categoria: payload.categoria,
          periodo: payload.periodo,
          partida: payload.partida,
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
        ? { code: veracity, domain, label: category === CATEGORIES.INVERSIONES ? "Inversiones" : "Gastos" }
        : undefined,
  };
}

module.exports = {
  GASTOS_INVERSIONES_SEMANTIC_CLASS,
  SOURCE,
  RECORD_LIMIT,
  CATEGORIES,
  normalizeCategory,
  parseYyyyMmTokens,
  isValidYyyyMm,
  resolvePeriodRange,
  parsePartidaFilter,
  categoryPredicateSql,
  derivedTotal,
  queryGastosInversionesFolios,
  loadGastosInversionesForChat,
  buildGastosInversionesAnswer,
  buildGastosInversionesChatResult,
};
