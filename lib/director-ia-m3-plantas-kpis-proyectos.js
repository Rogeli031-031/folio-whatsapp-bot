"use strict";

/**
 * Director IA — M3 Plantas / KPIs / Proyectos (read-only, in-process).
 * Extrae la semántica de GET /api/dashboard/kpis y helpers de public.proyectos.
 * No HTTP. No mutaciones. No catálogo global de plantas.
 */

const usuarioPermisos = require("./usuario-permisos");
const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");

const KPI_SEMANTIC_CLASS = "dashboard_folio_kpis";
const PROJECT_SEMANTIC_CLASS = "plant_projects_listing";

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function authCanVerFoliosSoloZpAd(auth) {
  return usuarioPermisos.authHasPermiso(auth, "acceso_ver_folios_solo_zp_ad");
}

/**
 * Mismo mapa que server.js getPlantaIdsEquivalentesForPendientes.
 * IDs: 1 Acapulco, 2 Puebla, 3 Tehuacán, 4 Querétaro, 5 San Luis, 6 Morelos, 7 Corporativo;
 * 11 E9, 12 E10, 13 E15, 14 E7, 15 E8, 16 E12, 17 E11, 18 E13.
 */
function getPlantaIdsEquivalentesForPendientes(plantaId) {
  if (plantaId == null) return [];
  const id = parseInt(plantaId, 10);
  if (!Number.isFinite(id)) return [plantaId];
  const grupos = {
    1: [1, 11, 12],
    11: [1, 11, 12],
    12: [1, 11, 12],
    2: [2, 14],
    14: [2, 14],
    3: [3, 15],
    15: [3, 15],
    4: [4, 16],
    16: [4, 16],
    5: [5, 18],
    18: [5, 18],
    6: [6, 13],
    13: [6, 13],
    7: [7],
    17: [17],
  };
  return grupos[id] || [id];
}

function assertPlantaPermitidaM3(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
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

function assertM3KpisAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "GA no tiene acceso a KPIs financieros.",
    };
  }
  if (role === "GV") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta.",
    };
  }
  return assertPlantaPermitidaM3(auth, plantaId);
}

function assertM3ProyectosAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GV") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Tu rol (GV) solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta.",
    };
  }
  return assertPlantaPermitidaM3(auth, plantaId);
}

function parseDashboardFilters(q) {
  const src = q || {};
  const plantas = (src.planta_id || src.plantas || src.planta || "")
    .toString()
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const categorias = (src.categoria || src.categorias || "")
    .toString()
    .split(",")
    .map((s) => String(s).trim().toUpperCase())
    .filter(Boolean);
  const etapas = (src.etapa || src.etapas || "")
    .toString()
    .split(",")
    .map((s) => String(s).trim().toUpperCase())
    .filter(Boolean);
  const soloActivos = src.solo_activos === "true" || src.solo_activos === "1" || src.activos === "1";
  const miSemana = src.mi_semana === "true" || src.mi_semana === "1";
  let fechaDesde = src.fecha_desde || src.desde || null;
  let fechaHasta = src.fecha_hasta || src.hasta || null;
  let fechaAprobDesde = src.fecha_aprob_desde || null;
  let fechaAprobHasta = src.fecha_aprob_hasta || null;
  const mes = src.mes && /^\d{4}-\d{2}$/.test(String(src.mes).trim()) ? String(src.mes).trim() : null;
  const mesesExtra = (src.meses_extra || src.meses || "")
    .toString()
    .split(",")
    .map((s) => String(s).trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s));
  const ventanaDefault =
    src.ventana === "0" || src.ventana === "false" || src.sin_ventana === "1" || src.sin_ventana === "true"
      ? false
      : true;
  if (fechaDesde && !/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde)) fechaDesde = null;
  if (fechaHasta && !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) fechaHasta = null;
  if (fechaAprobDesde && !/^\d{4}-\d{2}-\d{2}$/.test(fechaAprobDesde)) fechaAprobDesde = null;
  if (fechaAprobHasta && !/^\d{4}-\d{2}-\d{2}$/.test(fechaAprobHasta)) fechaAprobHasta = null;
  return {
    plantas,
    categorias,
    etapas,
    soloActivos,
    miSemana,
    fechaDesde,
    fechaHasta,
    fechaAprobDesde,
    fechaAprobHasta,
    mes,
    mesesExtra,
    ventanaDefault,
  };
}

function getMesActualYAnteriorMx() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const mesActual = `${y}-${String(m).padStart(2, "0")}`;
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  const mesAnterior = `${py}-${String(pm).padStart(2, "0")}`;
  return { mesActual, mesAnterior };
}

function buildDashboardWhere(auth, filters, deps = {}) {
  const conditions = [];
  const params = [];
  let n = 1;
  const canVerSoloZpAd = deps.authCanVerFoliosSoloZpAd || authCanVerFoliosSoloZpAd;
  const getEquivalentIds = deps.getEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const etapaToTecnicos = deps.etapaVisualToEstatusTecnicos || ((ev) => [String(ev || "").trim().toUpperCase()]);
  const etapasVisualOrder = Array.isArray(deps.ETAPAS_VISUAL_ORDER) ? deps.ETAPAS_VISUAL_ORDER : [];
  const mesFn = deps.getMesActualYAnteriorMx || getMesActualYAnteriorMx;

  const roleNorm =
    (auth && auth.role != null && auth.role !== "" ? String(auth.role).replace(/\s/g, "").toUpperCase() : "") || "";
  const esZP = roleNorm === "ZP";
  const esAD = roleNorm === "AD";
  const esCFCDMX = roleNorm === "CF_CDMX";
  if (!canVerSoloZpAd(auth)) {
    conditions.push("(COALESCE(f.solo_zp_ad, false) = false)");
  }
  if (!esZP && !esAD && !esCFCDMX) {
    conditions.push("(f.creado_por_rol_clave IS NULL OR UPPER(TRIM(COALESCE(f.creado_por_rol_clave,''))) <> 'AD')");
  }
  if (roleNorm === "GG" || roleNorm === "GA") {
    if (auth.plantas_permitidas && auth.plantas_permitidas.length > 0) {
      conditions.push(`f.planta_id = ANY($${n}::INT[])`);
      params.push(auth.plantas_permitidas);
      n++;
    } else {
      conditions.push("f.planta_id = -1");
    }
  }
  if (filters.plantas && filters.plantas.length > 0) {
    const plantasExpandidas = [];
    for (const pid of filters.plantas) {
      plantasExpandidas.push(...getEquivalentIds(pid));
    }
    const plantasUnicas = [...new Set(plantasExpandidas)].filter((id) => Number.isFinite(id) && id > 0);
    if (plantasUnicas.length > 0) {
      conditions.push(`f.planta_id = ANY($${n}::INT[])`);
      params.push(plantasUnicas);
      n++;
    }
  }
  if (filters.categorias && filters.categorias.length > 0) {
    conditions.push(`UPPER(TRIM(COALESCE(f.categoria,''))) = ANY($${n}::TEXT[])`);
    params.push(filters.categorias);
    n++;
  }
  if (filters.etapas && filters.etapas.length > 0) {
    const estatusList = [];
    for (const e of filters.etapas) {
      const ev = String(e).trim().toUpperCase();
      if (etapasVisualOrder.includes(ev)) {
        estatusList.push(...etapaToTecnicos(ev));
      } else {
        estatusList.push(ev);
      }
    }
    const uniq = [...new Set(estatusList)];
    if (uniq.length > 0) {
      conditions.push(`UPPER(TRIM(COALESCE(f.estatus,''))) = ANY($${n}::TEXT[])`);
      params.push(uniq);
      n++;
    }
  }
  if (filters.soloActivos) {
    conditions.push(`UPPER(TRIM(COALESCE(f.estatus,''))) NOT IN ('CERRADO','CANCELADO')`);
  }
  if (filters.miSemana) {
    conditions.push(`UPPER(TRIM(COALESCE(f.estatus,''))) = 'SELECCIONADO_SEMANA'`);
  }
  if (filters.mes) {
    conditions.push(`(f.mes_cargo = $${n}::TEXT)`);
    params.push(filters.mes);
    n++;
  }
  if (filters.ventanaDefault !== false && !filters.mes) {
    const { mesActual, mesAnterior } = mesFn();
    const extras = Array.isArray(filters.mesesExtra) ? filters.mesesExtra : [];
    const mesesCreado = [...new Set([mesActual, mesAnterior, ...extras])];
    conditions.push(
      `(
        (
          f.mes_cargo IS NOT NULL AND TRIM(f.mes_cargo) <> ''
          AND (
            f.mes_cargo = $${n}::TEXT
            OR f.mes_cargo >= $${n + 1}::TEXT
            OR (cardinality($${n + 2}::TEXT[]) > 0 AND f.mes_cargo = ANY($${n + 2}::TEXT[]))
          )
        )
        OR to_char((f.creado_en AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM') = ANY($${n + 3}::TEXT[])
      )`
    );
    params.push(mesAnterior);
    params.push(mesActual);
    params.push(extras);
    params.push(mesesCreado);
    n += 4;
  } else if (filters.mesesExtra && filters.mesesExtra.length > 0 && !filters.mes) {
    const extras = filters.mesesExtra;
    conditions.push(
      `(
        (f.mes_cargo IS NOT NULL AND TRIM(f.mes_cargo) <> '' AND f.mes_cargo = ANY($${n}::TEXT[]))
        OR to_char((f.creado_en AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM') = ANY($${n}::TEXT[])
      )`
    );
    params.push(extras);
    n++;
  }
  if (filters.fechaDesde) {
    conditions.push(`((f.creado_en AT TIME ZONE 'America/Mexico_City')::DATE >= $${n}::DATE)`);
    params.push(filters.fechaDesde);
    n++;
  }
  if (filters.fechaHasta) {
    conditions.push(`((f.creado_en AT TIME ZONE 'America/Mexico_City')::DATE <= $${n}::DATE)`);
    params.push(filters.fechaHasta);
    n++;
  }
  if (filters.fechaAprobDesde) {
    conditions.push(
      `(f.aprobado_en IS NOT NULL AND (f.aprobado_en AT TIME ZONE 'America/Mexico_City')::DATE >= $${n}::DATE)`
    );
    params.push(filters.fechaAprobDesde);
    n++;
  }
  if (filters.fechaAprobHasta) {
    conditions.push(
      `(f.aprobado_en IS NOT NULL AND (f.aprobado_en AT TIME ZONE 'America/Mexico_City')::DATE <= $${n}::DATE)`
    );
    params.push(filters.fechaAprobHasta);
    n++;
  }
  const where = conditions.length ? " AND " + conditions.join(" AND ") : "";
  return { where, params };
}

function describeKpiFilters(filters) {
  const { mesActual, mesAnterior } = getMesActualYAnteriorMx();
  return {
    plantas: filters.plantas || [],
    solo_activos: !!filters.soloActivos,
    ventana_default: filters.ventanaDefault !== false && !filters.mes,
    mes: filters.mes || null,
    mes_actual: mesActual,
    mes_anterior: mesAnterior,
    meses_extra: filters.mesesExtra || [],
    fuente: "GET /api/dashboard/kpis",
    dominio: "agregados de public.folios (dashboard); no IGF/ARR/commercial_state",
  };
}

/**
 * Misma semántica JSON que GET /api/dashboard/kpis.
 * @param {import("pg").PoolClient} client
 * @param {{ where: string, params: any[], soloActivos?: boolean }} opts
 */
async function queryDashboardKpis(client, opts) {
  const where = opts.where || "";
  const params = opts.params || [];
  const whereActivos =
    where + (opts.soloActivos ? " AND UPPER(TRIM(COALESCE(f.estatus,''))) NOT IN ('CERRADO','CANCELADO')" : "");
  const r = await client.query(
    `SELECT COUNT(*)::INT AS total_activos, COALESCE(SUM(f.importe), 0)::NUMERIC AS total_mxn
       FROM public.folios f WHERE 1=1 ${whereActivos}`,
    params
  );
  const row = r.rows[0] || {};
  const totalActivos = parseInt(row.total_activos, 10) || 0;
  const totalMxn = row.total_mxn != null ? Number(row.total_mxn) : null;
  const rZp = await client.query(
    `SELECT COUNT(*)::INT AS c FROM public.folios f WHERE 1=1 ${where} AND UPPER(TRIM(COALESCE(f.estatus,''))) = 'PENDIENTE_APROB_ZP'`,
    params
  );
  const pendientesZp = parseInt((rZp.rows[0] || {}).c, 10) || 0;
  const rAging = await client.query(
    `SELECT f.id, f.numero_folio, f.folio_codigo, f.estatus, f.creado_en, p.nombre AS planta_nombre,
              EXTRACT(DAY FROM (NOW() - f.creado_en))::INT AS aging
       FROM public.folios f LEFT JOIN public.plantas p ON p.id = f.planta_id
       WHERE 1=1 ${whereActivos} AND f.creado_en IS NOT NULL
       ORDER BY f.creado_en ASC NULLS LAST LIMIT 1`,
    params
  );
  const oldestRow = rAging.rows[0] || null;
  const oldest = oldestRow
    ? {
        folio_codigo: oldestRow.folio_codigo,
        aging: parseInt(oldestRow.aging, 10) || 0,
        etapa: oldestRow.estatus,
        planta: oldestRow.planta_nombre || null,
      }
    : null;
  const avgAgingRes = await client.query(
    `SELECT AVG(EXTRACT(DAY FROM (NOW() - f.creado_en)))::NUMERIC AS avg_aging
       FROM public.folios f WHERE 1=1 ${whereActivos} AND f.creado_en IS NOT NULL`,
    params
  );
  const avgAging =
    avgAgingRes.rows[0] && avgAgingRes.rows[0].avg_aging != null
      ? Math.round(Number(avgAgingRes.rows[0].avg_aging))
      : null;
  const rTopPlanta = await client.query(
    `SELECT f.planta_id, p.nombre AS planta_nombre, COUNT(*)::INT AS cnt, COALESCE(SUM(f.importe), 0)::NUMERIC AS total_mxn
       FROM public.folios f LEFT JOIN public.plantas p ON p.id = f.planta_id
       WHERE 1=1 ${whereActivos}
       GROUP BY f.planta_id, p.nombre ORDER BY cnt DESC, total_mxn DESC NULLS LAST LIMIT 1`,
    params
  );
  const topPlantaRow = rTopPlanta.rows[0] || null;
  const topPlanta = topPlantaRow
    ? {
        nombre: topPlantaRow.planta_nombre || "Sin planta",
        count: parseInt(topPlantaRow.cnt, 10) || 0,
        total_mxn: Number(topPlantaRow.total_mxn) || null,
      }
    : null;
  const rTopCat = await client.query(
    `SELECT UPPER(TRIM(COALESCE(f.categoria,''))) AS cat, COUNT(*)::INT AS cnt, COALESCE(SUM(f.importe), 0)::NUMERIC AS total_mxn
       FROM public.folios f WHERE 1=1 ${whereActivos}
       GROUP BY UPPER(TRIM(COALESCE(f.categoria,''))) ORDER BY cnt DESC, total_mxn DESC NULLS LAST LIMIT 1`,
    params
  );
  const topCatRow = rTopCat.rows[0] || null;
  const topCategoria = topCatRow
    ? {
        nombre: topCatRow.cat || "N/A",
        count: parseInt(topCatRow.cnt, 10) || 0,
        total_mxn: topCatRow.total_mxn != null ? Number(topCatRow.total_mxn) : null,
      }
    : null;
  return {
    total_activos: totalActivos,
    total_mxn: totalMxn,
    pendientes_zp: pendientesZp,
    avg_aging: avgAging,
    top_planta: topPlanta,
    top_categoria: topCategoria,
    oldest,
  };
}

async function listarProyectosPorPlanta(client, plantaId, soloEnCurso = true) {
  let q = `SELECT p.id, p.codigo, p.nombre, p.fecha_inicio, p.fecha_cierre_estimada, p.estatus, p.aprobado_zp
           FROM public.proyectos p WHERE p.planta_id = $1`;
  if (soloEnCurso) q += " AND p.estatus = 'EN_CURSO'";
  q += " ORDER BY p.creado_en DESC";
  const r = await client.query(q, [plantaId]);
  return r.rows || [];
}

async function listarProyectosPorPlantaOEquivalentes(client, plantaId, soloEnCurso = true, deps = {}) {
  const getEquivalentIds = deps.getEquivalentIds || getPlantaIdsEquivalentesForPendientes;
  const ids = getEquivalentIds(plantaId);
  if (ids.length === 0) return listarProyectosPorPlanta(client, plantaId, soloEnCurso);
  if (ids.length === 1) return listarProyectosPorPlanta(client, ids[0], soloEnCurso);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  let q = `SELECT p.id, p.codigo, p.nombre, p.fecha_inicio, p.fecha_cierre_estimada, p.estatus, p.aprobado_zp
           FROM public.proyectos p WHERE p.planta_id IN (${placeholders})`;
  if (soloEnCurso) q += " AND p.estatus = 'EN_CURSO'";
  q += " ORDER BY p.creado_en DESC";
  const r = await client.query(q, ids);
  return r.rows || [];
}

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

function sourceError(message, domain) {
  return {
    ok: false,
    code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
    status: 500,
    error: message || "Error de fuente",
    domain,
  };
}

function requirePlantaId(plantaId) {
  if (!Number.isFinite(Number(plantaId)) || Number(plantaId) <= 0) {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
      status: 400,
      error: "planta_id es obligatorio",
    };
  }
  return null;
}

function todayYmdMexico() {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function ymdFromDateValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

function mapProyectoRow(row, todayYmd) {
  const fechaCierre = ymdFromDateValue(row.fecha_cierre_estimada);
  const fechaInicio = ymdFromDateValue(row.fecha_inicio);
  const estatus = row.estatus || null;
  let cierreEstimadoVencidoDerivado = null;
  if (fechaCierre && todayYmd && estatus === "EN_CURSO") {
    cierreEstimadoVencidoDerivado = fechaCierre < todayYmd;
  }
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    fecha_inicio: fechaInicio,
    fecha_cierre_estimada: fechaCierre,
    estatus,
    aprobado_zp: !!row.aprobado_zp,
    cierre_estimado_vencido_derivado: cierreEstimadoVencidoDerivado,
  };
}

/**
 * Executor read-only de get_dashboard_kpis.
 */
async function loadDashboardKpisForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertM3KpisAccess(auth, plantaId);
  if (!denied.ok) return denied;

  const filters = parseDashboardFilters({
    planta_id: String(plantaId),
    ventana: "1",
  });
  const filtersApplied = describeKpiFilters(filters);
  const queryKpis = opts.queryKpis || queryDashboardKpis;
  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const buildWhere = opts.buildDashboardWhere || buildDashboardWhere;

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
    const { where, params } = buildWhere(auth, filters, opts.whereDeps || {});
    const kpis = await queryKpis(client, { where, params, soloActivos: filters.soloActivos });
    return {
      ok: true,
      semantic_class: KPI_SEMANTIC_CLASS,
      planta_id: Number(plantaId),
      planta_nombre: planta.nombre || null,
      planta_clave: planta.clave || null,
      filters_applied: filtersApplied,
      kpis,
    };
  }

  const injected = Boolean(opts.queryKpis && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message, "dashboard_kpis");
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de KPIs no disponible", "dashboard_kpis");
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message, "dashboard_kpis");
  } finally {
    client.release();
  }
}

/**
 * Executor read-only de get_project_status.
 */
async function loadProyectosForChat(pool, plantaId, req, opts = {}) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertM3ProyectosAccess(auth, plantaId);
  if (!denied.ok) return denied;

  const listProyectos = opts.listProyectos || listarProyectosPorPlantaOEquivalentes;
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
    const rows = await listProyectos(client, plantaId, true, {
      getEquivalentIds: opts.getEquivalentIds || getPlantaIdsEquivalentesForPendientes,
    });
    const todayYmd = todayYmdMexico();
    const proyectos = (rows || []).map((row) => mapProyectoRow(row, todayYmd));
    return {
      ok: true,
      semantic_class: PROJECT_SEMANTIC_CLASS,
      planta_id: Number(plantaId),
      planta_nombre: planta.nombre || null,
      planta_clave: planta.clave || null,
      solo_en_curso: true,
      incluye_equivalentes: true,
      today_ymd: todayYmd,
      derived_delay_criterion:
        "cierre_estimado_vencido_derivado = (fecha_cierre_estimada < hoy TZ Mexico) AND estatus = EN_CURSO. No es un estatus almacenado.",
      proyectos_count: proyectos.length,
      proyectos,
    };
  }

  const injected = Boolean(opts.listProyectos && opts.resolvePlanta);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message, "proyectos");
    }
  }

  if (!pool || typeof pool.connect !== "function") {
    return sourceError("Fuente de proyectos no disponible", "proyectos");
  }

  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message, "proyectos");
  } finally {
    client.release();
  }
}

function fmtMxn(n) {
  if (n == null || Number.isNaN(Number(n))) return "n/d";
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildDashboardKpisAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar KPIs del dashboard en esta planta.";
    }
    if (payload && payload.status === 404) {
      return "No encontré la planta indicada. No puedo completar la consulta de KPIs del dashboard.";
    }
    return "No pude completar la consulta de KPIs del dashboard por un error de fuente. No puedo afirmar valores de folios activos, montos ni aging.";
  }

  const k = payload.kpis || {};
  const f = payload.filters_applied || {};
  const windowLabel = f.ventana_default
    ? `ventana default del dashboard (mes_cargo ${f.mes_anterior} / ≥ ${f.mes_actual} o creados en esos meses)`
    : f.mes
      ? `mes_cargo ${f.mes}`
      : "filtros explícitos";
  const scope = `${payload.planta_nombre || `planta ${payload.planta_id}`}${
    payload.planta_clave ? ` (${payload.planta_clave})` : ""
  }`;

  const avg = k.avg_aging != null ? `${k.avg_aging} días` : "n/d";
  const oldest = k.oldest
    ? `${k.oldest.folio_codigo} (${k.oldest.aging} d)`
    : "n/d";
  const topPlanta = k.top_planta ? `${k.top_planta.nombre} (${k.top_planta.count})` : "n/d";
  const topCat = k.top_categoria ? `${k.top_categoria.nombre} (${k.top_categoria.count})` : "n/d";

  return (
    `KPIs del dashboard de folios para ${scope}. ` +
    `Son agregados observados de public.folios (misma fuente que GET /api/dashboard/kpis), no IGF, ARR ni commercial_state. ` +
    `No expresan salud, desempeño ni causalidad. Alcance: ${windowLabel}.\n` +
    `- Folios en el filtro (total_activos): ${k.total_activos}\n` +
    `- Importe agregado (total_mxn; COALESCE de la fuente): ${fmtMxn(k.total_mxn)}\n` +
    `- Pendientes aprobación ZP: ${k.pendientes_zp}\n` +
    `- Aging promedio: ${avg}\n` +
    `- Más antiguo: ${oldest}\n` +
    `- Top planta en el filtro: ${topPlanta}\n` +
    `- Top categoría: ${topCat}`
  );
}

function buildProyectosAnswer(payload) {
  if (!payload || payload.ok !== true) {
    if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
      return payload.error || "Sin permiso para consultar proyectos de esta planta.";
    }
    if (payload && payload.status === 404) {
      return "No encontré la planta indicada. No puedo completar la consulta de proyectos.";
    }
    return "No pude completar la consulta de proyectos por un error de fuente. No puedo afirmar qué proyectos existen o no.";
  }

  const scope = `${payload.planta_nombre || `planta ${payload.planta_id}`}${
    payload.planta_clave ? ` (${payload.planta_clave})` : ""
  }`;
  if (!payload.proyectos_count) {
    return (
      `No hay proyectos con estatus EN_CURSO en el alcance de ${scope} ` +
      `(public.proyectos, incluye plantas equivalentes). ` +
      "Esto no demuestra que no existan proyectos en otros estatus o fuera de ese alcance. " +
      "Esta lista es del módulo Proyectos, no de Action Register."
    );
  }

  const shown = payload.proyectos.slice(0, 12).map((p, i) => {
    const cierre = p.fecha_cierre_estimada || "sin fecha_cierre_estimada";
    const derived =
      p.cierre_estimado_vencido_derivado === true
        ? "; fecha_cierre_estimada anterior a hoy (derivado; no es un estatus almacenado)"
        : "";
    return `${i + 1}. ${p.codigo} — ${p.nombre} (estatus ${p.estatus}; cierre estimado ${cierre}${derived})`;
  });
  const more =
    payload.proyectos_count > shown.length
      ? `\n… y ${payload.proyectos_count - shown.length} proyecto(s) adicional(es) en la evidencia.`
      : "";

  return (
    `Proyectos EN_CURSO del módulo Proyectos en ${scope} ` +
    `(public.proyectos; no es Action Register): ${payload.proyectos_count}.\n` +
    shown.join("\n") +
    more
  );
}

function chatVeracity(payload) {
  if (payload && payload.ok) return DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE;
  if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
    return DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED;
  }
  if (payload && payload.code === DIRECTOR_IA_VERACITY.DATA_NOT_FOUND) {
    return DIRECTOR_IA_VERACITY.DATA_NOT_FOUND;
  }
  return DIRECTOR_IA_VERACITY.SOURCE_ERROR;
}

function buildDashboardKpisChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? opts.planta_id : payload && payload.planta_id;
  const answer = buildDashboardKpisAnswer(payload);
  const okPayload = Boolean(payload && payload.ok);
  const veracity = chatVeracity(payload);
  return {
    ok: true,
    answer,
    sources: okPayload ? ["dashboard.kpis.folios"] : [],
    context_meta: {
      mode: "dashboard_kpis",
      requested_domain: "dashboard_kpis",
      openai_called: false,
      veracity,
      semantic_class: KPI_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
    },
    dashboard_kpis: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          planta_clave: payload.planta_clave,
          filters_applied: payload.filters_applied,
          kpis: payload.kpis,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "dashboard_kpis", label: "KPIs de dashboard" }
        : undefined,
  };
}

function buildProyectosChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? opts.planta_id : payload && payload.planta_id;
  const answer = buildProyectosAnswer(payload);
  const okPayload = Boolean(payload && payload.ok);
  const veracity = chatVeracity(payload);
  return {
    ok: true,
    answer,
    sources: okPayload ? ["public.proyectos"] : [],
    context_meta: {
      mode: "project_status",
      requested_domain: "proyectos",
      openai_called: false,
      veracity,
      semantic_class: PROJECT_SEMANTIC_CLASS,
      planta_id,
      timestamp: new Date().toISOString(),
      proyectos_count: okPayload ? payload.proyectos_count : undefined,
    },
    proyectos: okPayload
      ? {
          semantic_class: payload.semantic_class,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          planta_clave: payload.planta_clave,
          solo_en_curso: payload.solo_en_curso,
          derived_delay_criterion: payload.derived_delay_criterion,
          proyectos_count: payload.proyectos_count,
          proyectos: payload.proyectos,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: "proyectos", label: "Proyectos" }
        : undefined,
  };
}

function buildProjectStatusClarificationChatResult(opts = {}) {
  const reason =
    opts.clarification_reason ||
    "No se distingue si 'proyectos' se refiere al módulo Proyectos o a acciones/temas de Action Register";
  return {
    ok: true,
    answer:
      `${reason}. ` +
      "Indica si quieres el listado de public.proyectos o el Action Register. No mezclo ambas fuentes.",
    sources: [],
    context_meta: {
      mode: "project_status_clarification",
      requested_domain: "proyectos",
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_PARTIAL,
      planta_id: opts.planta_id,
      timestamp: new Date().toISOString(),
      requires_clarification: true,
    },
  };
}

module.exports = {
  KPI_SEMANTIC_CLASS,
  PROJECT_SEMANTIC_CLASS,
  parseDashboardFilters,
  getMesActualYAnteriorMx,
  buildDashboardWhere,
  queryDashboardKpis,
  listarProyectosPorPlanta,
  listarProyectosPorPlantaOEquivalentes,
  getPlantaIdsEquivalentesForPendientes,
  assertM3KpisAccess,
  assertM3ProyectosAccess,
  loadDashboardKpisForChat,
  loadProyectosForChat,
  buildDashboardKpisAnswer,
  buildProyectosAnswer,
  buildDashboardKpisChatResult,
  buildProyectosChatResult,
  buildProjectStatusClarificationChatResult,
};
