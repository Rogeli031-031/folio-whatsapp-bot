"use strict";

/**
 * Director IA — M9 Delta Venta / Descuento / Ingreso (read-only, in-process).
 * Extrae la semántica de los modales delta-* de periodos reales.
 * No HTTP. No forecast con escritura. No M19.
 */

const { DIRECTOR_IA_VERACITY } = require("./director-ia-capabilities");

const VENTA_SEMANTIC_CLASS = "delta_venta_period_compare";
const DESCUENTO_SEMANTIC_CLASS = "delta_descuento_period_compare";
const INGRESO_SEMANTIC_CLASS = "delta_ingreso_period_compare";

const SQL_PROV_MAP = `
       SELECT DISTINCT
              p.nombre AS prov_name,
              UPPER(TRIM(p.nombre)) AS key_nombre,
              UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
         FROM public.plantas p
         JOIN arr.provincia_plants ap
           ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
          AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
`;

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

function assertPlantaPermitidaM9(auth, plantaId) {
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

function assertM9DeltasAccess(auth, plantaId) {
  const role = dashboardAuthRoleNorm(auth);
  if (role === "GA") {
    return {
      ok: false,
      code: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para Delta (GA restringido).",
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
  return assertPlantaPermitidaM9(auth, plantaId);
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

async function resolvePlantaRow(client, plantaId) {
  const r = await client.query(`SELECT id, nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  return r.rows[0] || null;
}

function parseYyyyMmList(question) {
  const found = [];
  const re = /\b(\d{4}-\d{2})\b/g;
  const text = String(question || "");
  let m;
  while ((m = re.exec(text))) found.push(m[1]);
  return found;
}

function resolvePeriodPair(question, periodos) {
  const found = parseYyyyMmList(question);
  if (found.length >= 2) {
    if (found[0] === found[1]) {
      return { ok: false, code: "equal_periods", error: "Los dos periodos deben ser distintos" };
    }
    if (!/^\d{4}-\d{2}$/.test(found[0]) || !/^\d{4}-\d{2}$/.test(found[1])) {
      return { ok: false, code: "invalid_periods", error: "Periodos inválidos" };
    }
    return { ok: true, periodoA: found[0], periodoB: found[1], source: "question" };
  }
  const unique = [];
  for (const p of periodos || []) {
    if (/^\d{4}-\d{2}$/.test(p) && !unique.includes(p)) unique.push(p);
  }
  if (unique.length < 2) {
    return {
      ok: false,
      code: "insufficient_periods",
      error: "No hay dos periodos YYYY-MM con datos para comparar. No invento periodos.",
    };
  }
  return { ok: true, periodoA: unique[1], periodoB: unique[0], source: "default_latest_two" };
}

async function getPeriodosDeltaVenta(client, plantaNombre) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT DISTINCT to_char(v.fecha, 'YYYY-MM') AS periodo
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm
         ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
      ORDER BY periodo DESC`,
    [plantaNombre]
  );
  return (r.rows || []).map((row) => row.periodo).filter(Boolean);
}

async function getDeltaVentaClientes(client, plantaNombre, periodoA, periodoB) {
  const [yA, mA] = String(periodoA).split("-").map((s) => parseInt(s, 10));
  const [yB, mB] = String(periodoB).split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(yA) || !Number.isFinite(mA) || !Number.isFinite(yB) || !Number.isFinite(mB)) {
    return [];
  }
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP}),
     ventas_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', v.fecha)::INT AS year,
              DATE_PART('month', v.fecha)::INT AS month,
              v.cliente_norm,
              SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        GROUP BY pm.prov_name, year, month, v.cliente_norm
     ),
     mesA AS (
       SELECT cliente_norm, kg
         FROM ventas_mes
        WHERE planta = $1 AND year = $2 AND month = $3
     ),
     mesB AS (
       SELECT cliente_norm, kg
         FROM ventas_mes
        WHERE planta = $1 AND year = $4 AND month = $5
     )
     SELECT
       COALESCE(a.cliente_norm, b.cliente_norm) AS cliente_norm,
       COALESCE(a.kg, 0) AS kg_a,
       COALESCE(b.kg, 0) AS kg_b,
       COALESCE(b.kg, 0) - COALESCE(a.kg, 0) AS delta_kg
       FROM mesA a
       FULL OUTER JOIN mesB b ON a.cliente_norm = b.cliente_norm`,
    [plantaNombre, yA, mA, yB, mB]
  );
  return (r.rows || []).map((row) => ({
    cliente: row.cliente_norm,
    kgA: row.kg_a != null ? Number(row.kg_a) : 0,
    kgB: row.kg_b != null ? Number(row.kg_b) : 0,
    deltaKg: row.delta_kg != null ? Number(row.delta_kg) : 0,
  }));
}

async function getPlantasDeltaDescuento(client) {
  const r = await client.query(`
    WITH prov_map AS (${SQL_PROV_MAP})
    SELECT DISTINCT pm.prov_name AS nombre
      FROM arr.descuentos_diarios_cliente d
      JOIN prov_map pm
        ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
        OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
     ORDER BY pm.prov_name
  `);
  return (r.rows || []).map((row) => row.nombre).filter(Boolean);
}

async function getPeriodosDeltaDescuento(client, plantaNombre) {
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT DISTINCT to_char(d.fecha, 'YYYY-MM') AS periodo
       FROM arr.descuentos_diarios_cliente d
       JOIN prov_map pm
         ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1
      ORDER BY periodo DESC`,
    [plantaNombre]
  );
  return (r.rows || []).map((row) => row.periodo).filter(Boolean);
}

async function getDeltaDescuentoClientes(client, plantaNombre, periodoA, periodoB) {
  const [yA, mA] = String(periodoA).split("-").map((s) => parseInt(s, 10));
  const [yB, mB] = String(periodoB).split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(yA) || !Number.isFinite(mA) || !Number.isFinite(yB) || !Number.isFinite(mB)) {
    return [];
  }
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP}),
     desc_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', d.fecha)::INT AS year,
              DATE_PART('month', d.fecha)::INT AS month,
              d.cliente_norm,
              SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm
           ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        GROUP BY pm.prov_name, year, month, d.cliente_norm
     ),
     ventas_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', v.fecha)::INT AS year,
              DATE_PART('month', v.fecha)::INT AS month,
              v.cliente_norm,
              SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        GROUP BY pm.prov_name, year, month, v.cliente_norm
     ),
     desc_a AS (SELECT cliente_norm, monto AS monto_a FROM desc_mes WHERE planta = $1 AND year = $2 AND month = $3),
     ventas_a AS (SELECT cliente_norm, kg AS kg_a FROM ventas_mes WHERE planta = $1 AND year = $2 AND month = $3),
     desc_b AS (SELECT cliente_norm, monto AS monto_b FROM desc_mes WHERE planta = $1 AND year = $4 AND month = $5),
     ventas_b AS (SELECT cliente_norm, kg AS kg_b FROM ventas_mes WHERE planta = $1 AND year = $4 AND month = $5),
     period_a AS (
       SELECT COALESCE(d.cliente_norm, v.cliente_norm) AS cliente_norm,
              COALESCE(d.monto_a, 0) AS monto_a,
              COALESCE(v.kg_a, 0) AS kg_a
         FROM desc_a d
         FULL OUTER JOIN ventas_a v ON d.cliente_norm = v.cliente_norm
     ),
     period_b AS (
       SELECT COALESCE(d.cliente_norm, v.cliente_norm) AS cliente_norm,
              COALESCE(d.monto_b, 0) AS monto_b,
              COALESCE(v.kg_b, 0) AS kg_b
         FROM desc_b d
         FULL OUTER JOIN ventas_b v ON d.cliente_norm = v.cliente_norm
     )
     SELECT
       COALESCE(a.cliente_norm, b.cliente_norm) AS cliente_norm,
       a.monto_a, a.kg_a, b.monto_b, b.kg_b,
       (CASE WHEN (a.kg_a IS NULL OR a.kg_a = 0) THEN 0 ELSE a.monto_a::numeric / a.kg_a END) AS ratio_a,
       (CASE WHEN (b.kg_b IS NULL OR b.kg_b = 0) THEN 0 ELSE b.monto_b::numeric / b.kg_b END) AS ratio_b,
       (CASE WHEN (b.kg_b IS NULL OR b.kg_b = 0) THEN 0 ELSE b.monto_b::numeric / b.kg_b END)
       - (CASE WHEN (a.kg_a IS NULL OR a.kg_a = 0) THEN 0 ELSE a.monto_a::numeric / a.kg_a END) AS delta_ratio
       FROM period_a a
       FULL OUTER JOIN period_b b ON a.cliente_norm = b.cliente_norm`,
    [plantaNombre, yA, mA, yB, mB]
  );
  return (r.rows || []).map((row) => ({
    cliente: row.cliente_norm,
    montoA: row.monto_a != null ? Number(row.monto_a) : 0,
    montoB: row.monto_b != null ? Number(row.monto_b) : 0,
    kgA: row.kg_a != null ? Number(row.kg_a) : 0,
    kgB: row.kg_b != null ? Number(row.kg_b) : 0,
    ratioA: row.ratio_a != null ? Number(row.ratio_a) : 0,
    ratioB: row.ratio_b != null ? Number(row.ratio_b) : 0,
    deltaRatio: row.delta_ratio != null ? Number(row.delta_ratio) : 0,
  }));
}

function defaultQuitarTildes(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function getMargenKgPorPeriodo(client, plantaNombre, year, month, opts = {}) {
  const quitarTildes = opts.quitarTildes || defaultQuitarTildes;
  try {
    const ver = await client.query(
      `SELECT id FROM igf.versions WHERE plant_code = 'GLOBAL' AND year = $1 AND month = $2 ORDER BY version_number DESC LIMIT 1`,
      [year, month]
    );
    const versionId = ver.rows && ver.rows[0] && ver.rows[0].id;
    if (versionId == null) return null;
    const nombre = (plantaNombre || "").trim();
    const patternConTilde = "%" + nombre + "%";
    const patternSinTilde = "%" + quitarTildes(nombre) + "%";
    const r = await client.query(
      `SELECT SUM(margen_kg * COALESCE(venta_ton, 0)) / NULLIF(SUM(COALESCE(venta_ton, 0)), 0) AS margen_kg
       FROM igf.compromiso_lines WHERE version_id = $1 AND (empresa ILIKE $2 OR empresa ILIKE $3)`,
      [versionId, patternConTilde, patternSinTilde]
    );
    const val = r.rows && r.rows[0] && r.rows[0].margen_kg != null ? Number(r.rows[0].margen_kg) : null;
    return val;
  } catch (_e) {
    return null;
  }
}

async function getDeltaIngresoClientes(client, plantaNombre, periodoA, periodoB, opts = {}) {
  const [yA, mA] = String(periodoA).split("-").map((s) => parseInt(s, 10));
  const [yB, mB] = String(periodoB).split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(yA) || !Number.isFinite(mA) || !Number.isFinite(yB) || !Number.isFinite(mB)) {
    return { rows: [], margenA: 0, margenB: 0 };
  }
  const loadMargen = opts.getMargenKgPorPeriodo || getMargenKgPorPeriodo;
  const margenA = (await loadMargen(client, plantaNombre, yA, mA, opts)) ?? 0;
  const margenB = (await loadMargen(client, plantaNombre, yB, mB, opts)) ?? 0;
  const r = await client.query(
    `WITH prov_map AS (${SQL_PROV_MAP}),
     desc_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', d.fecha)::INT AS year,
              DATE_PART('month', d.fecha)::INT AS month,
              d.cliente_norm,
              SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm
           ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        GROUP BY pm.prov_name, year, month, d.cliente_norm
     ),
     ventas_mes AS (
       SELECT pm.prov_name AS planta,
              DATE_PART('year', v.fecha)::INT AS year,
              DATE_PART('month', v.fecha)::INT AS month,
              v.cliente_norm,
              SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm
           ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        GROUP BY pm.prov_name, year, month, v.cliente_norm
     ),
     desc_a AS (SELECT cliente_norm, monto AS monto_a FROM desc_mes WHERE planta = $1 AND year = $2 AND month = $3),
     ventas_a AS (SELECT cliente_norm, kg AS kg_a FROM ventas_mes WHERE planta = $1 AND year = $2 AND month = $3),
     desc_b AS (SELECT cliente_norm, monto AS monto_b FROM desc_mes WHERE planta = $1 AND year = $4 AND month = $5),
     ventas_b AS (SELECT cliente_norm, kg AS kg_b FROM ventas_mes WHERE planta = $1 AND year = $4 AND month = $5),
     period_a AS (
       SELECT COALESCE(d.cliente_norm, v.cliente_norm) AS cliente_norm,
              COALESCE(d.monto_a, 0) AS monto_a,
              COALESCE(v.kg_a, 0) AS kg_a
         FROM desc_a d
         FULL OUTER JOIN ventas_a v ON d.cliente_norm = v.cliente_norm
     ),
     period_b AS (
       SELECT COALESCE(d.cliente_norm, v.cliente_norm) AS cliente_norm,
              COALESCE(d.monto_b, 0) AS monto_b,
              COALESCE(v.kg_b, 0) AS kg_b
         FROM desc_b d
         FULL OUTER JOIN ventas_b v ON d.cliente_norm = v.cliente_norm
     )
     SELECT
       COALESCE(a.cliente_norm, b.cliente_norm) AS cliente_norm,
       a.monto_a, a.kg_a, b.monto_b, b.kg_b,
       (CASE WHEN (a.kg_a IS NULL OR a.kg_a = 0) THEN 0 ELSE a.monto_a::numeric / a.kg_a END) AS desc_kg_a,
       (CASE WHEN (b.kg_b IS NULL OR b.kg_b = 0) THEN 0 ELSE b.monto_b::numeric / b.kg_b END) AS desc_kg_b
       FROM period_a a
       FULL OUTER JOIN period_b b ON a.cliente_norm = b.cliente_norm`,
    [plantaNombre, yA, mA, yB, mB]
  );
  const rows = (r.rows || []).map((row) => {
    const kgA = row.kg_a != null ? Number(row.kg_a) : 0;
    const kgB = row.kg_b != null ? Number(row.kg_b) : 0;
    const descKgA = row.desc_kg_a != null ? Number(row.desc_kg_a) : 0;
    const descKgB = row.desc_kg_b != null ? Number(row.desc_kg_b) : 0;
    const ingresoA = kgA * (margenA - Math.abs(descKgA));
    const ingresoB = kgB * (margenB - Math.abs(descKgB));
    return {
      cliente: row.cliente_norm,
      ingresoA,
      ingresoB,
      deltaIngreso: ingresoB - ingresoA,
      kgA,
      kgB,
      descKgA,
      descKgB,
    };
  });
  return { rows, margenA, margenB };
}

function fmtKg(kg) {
  return kg != null && !isNaN(kg)
    ? (kg / 1000).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "0.0";
}

function fmtDescKg(r) {
  return r != null && !isNaN(r)
    ? `${r.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/kg`
    : "0.00 $/kg";
}

function fmtMxn(m) {
  return m != null && !isNaN(m)
    ? m.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : "$0";
}

function fmtTon(ton) {
  return ton != null && !isNaN(ton)
    ? ton.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ton"
    : "0.0 ton";
}

function buildDeltaVentaDatosPayload(planta, periodoA, periodoB, rows) {
  const build = (filterFn, sortFn, totalReduce, signPositive) => {
    const candidatos = (rows || []).filter(filterFn).sort(sortFn);
    const totalDeltaKg = candidatos.reduce(totalReduce, 0);
    const top20 = Math.max(1, Math.ceil(candidatos.length * 0.2));
    const clientes = candidatos.slice(0, top20).map((r) => ({
      cliente: r.cliente,
      kgA: r.kgA,
      kgB: r.kgB,
      deltaKg: r.deltaKg,
      kgAStr: fmtKg(r.kgA),
      kgBStr: fmtKg(r.kgB),
      deltaKgStr: fmtKg(r.deltaKg),
    }));
    return { totalDeltaKg, totalDeltaKgStr: fmtKg(Math.abs(totalDeltaKg)), signPositive, clientes };
  };
  return {
    planta: String(planta || "").trim(),
    periodoA,
    periodoB,
    dejaron: build(
      (r) => r.kgA > 0 && r.kgB <= 0,
      (a, b) => b.kgA - a.kgA,
      (sum, r) => sum + (r.kgA != null ? Number(r.kgA) : 0),
      false
    ),
    mas: build(
      (r) => r.deltaKg > 0,
      (a, b) => b.deltaKg - a.deltaKg,
      (sum, r) => sum + (r.deltaKg != null ? Number(r.deltaKg) : 0),
      true
    ),
    disminuyeron: build(
      (r) => r.kgA > 0 && r.kgB > 0 && r.deltaKg < 0,
      (a, b) => a.deltaKg - b.deltaKg,
      (sum, r) => sum + (r.deltaKg != null ? -Number(r.deltaKg) : 0),
      false
    ),
  };
}

function buildDeltaDescuentoDatosPayload(planta, periodoA, periodoB, rows) {
  const build = (filterFn, sortFn, totalReduce, signPositive) => {
    const candidatos = (rows || []).filter(filterFn).sort(sortFn);
    const totalDeltaRatio = candidatos.length ? candidatos.reduce(totalReduce, 0) / candidatos.length : 0;
    const top20 = Math.max(1, Math.ceil(candidatos.length * 0.2));
    const clientes = candidatos.slice(0, top20).map((r) => ({
      cliente: r.cliente,
      ratioA: r.ratioA,
      ratioB: r.ratioB,
      deltaRatio: r.deltaRatio,
      ratioAStr: fmtDescKg(r.ratioA),
      ratioBStr: fmtDescKg(r.ratioB),
      deltaRatioStr: fmtDescKg(r.deltaRatio),
    }));
    return { totalDeltaRatio, totalDeltaRatioStr: fmtDescKg(totalDeltaRatio), signPositive, clientes };
  };
  return {
    planta: String(planta || "").trim(),
    periodoA,
    periodoB,
    dejaron: build(
      (r) => r.ratioA < 0 && (r.kgB === 0 || r.ratioB >= 0),
      (a, b) => a.ratioA - b.ratioA,
      (sum, r) => sum + (r.ratioA != null ? Number(r.ratioA) : 0),
      false
    ),
    mas: build(
      (r) => r.deltaRatio < 0,
      (a, b) => a.deltaRatio - b.deltaRatio,
      (sum, r) => sum + (r.deltaRatio != null ? Number(r.deltaRatio) : 0),
      false
    ),
    disminuyeron: build(
      (r) => r.kgA > 0 && r.kgB > 0 && r.ratioA < 0 && r.ratioB < 0 && r.deltaRatio > 0,
      (a, b) => b.deltaRatio - a.deltaRatio,
      (sum, r) => sum + (r.deltaRatio != null ? Number(r.deltaRatio) : 0),
      true
    ),
  };
}

async function getDeltaIngresoDatosInternal(client, planta, periodoA, periodoB, sinRegla8020, opts = {}) {
  const pa = typeof periodoA === "string" && /^\d{4}-\d{2}$/.test(periodoA) ? periodoA : null;
  const pb = typeof periodoB === "string" && /^\d{4}-\d{2}$/.test(periodoB) ? periodoB : null;
  if (!planta || !pa || !pb || pa === pb) return null;
  const sinCorte8020 = !!sinRegla8020;
  const { rows, margenA, margenB } = await getDeltaIngresoClientes(client, planta.trim(), pa, pb, opts);
  const margenAStr = fmtDescKg(margenA);
  const margenBStr = fmtDescKg(margenB);
  const build = (filterFn, sortFn, totalReduce, signPositive) => {
    const candidatos = (rows || []).filter(filterFn).sort(sortFn);
    const totalDeltaIngreso = candidatos.reduce(totalReduce, 0);
    const top20 = sinCorte8020 ? candidatos.length : Math.max(1, Math.ceil(candidatos.length * 0.2));
    const clientes = candidatos.slice(0, top20).map((r) => ({
      cliente: r.cliente,
      ingresoA: r.ingresoA,
      ingresoB: r.ingresoB,
      deltaIngreso: r.deltaIngreso,
      ingresoAStr: fmtMxn(r.ingresoA),
      ingresoBStr: fmtMxn(r.ingresoB),
      deltaIngresoStr: fmtMxn(r.deltaIngreso),
      kgA: r.kgA,
      kgB: r.kgB,
      kgAStr: fmtKg(r.kgA),
      kgBStr: fmtKg(r.kgB),
      descKgAStr: fmtDescKg(r.descKgA),
      descKgBStr: fmtDescKg(r.descKgB),
      margenAStr,
      margenBStr,
    }));
    const totalTonA = clientes.reduce((s, c) => s + (c.kgA || 0) / 1000, 0);
    const totalTonB = clientes.reduce((s, c) => s + (c.kgB || 0) / 1000, 0);
    return {
      totalDeltaIngreso,
      totalDeltaIngresoStr: fmtMxn(Math.abs(totalDeltaIngreso)),
      signPositive,
      clientes,
      totalTonA,
      totalTonB,
      totalTonAStr: fmtTon(totalTonA),
      totalTonBStr: fmtTon(totalTonB),
    };
  };
  const dejaron = build(
    (r) => r.ingresoA > 0 && r.ingresoB <= 0,
    (a, b) => b.ingresoA - a.ingresoA,
    (sum, r) => sum + (r.ingresoA != null ? Number(r.ingresoA) : 0),
    false
  );
  const mas = build(
    (r) => r.deltaIngreso > 0 && (r.kgA || 0) > 0,
    (a, b) => b.deltaIngreso - a.deltaIngreso,
    (sum, r) => sum + (r.deltaIngreso != null ? Number(r.deltaIngreso) : 0),
    true
  );
  const disminuyeron = build(
    (r) => r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso < 0,
    (a, b) => a.deltaIngreso - b.deltaIngreso,
    (sum, r) => sum + (r.deltaIngreso != null ? -Number(r.deltaIngreso) : 0),
    false
  );
  const clientesNuevos = build(
    (r) => (r.kgA || 0) <= 0 && (r.kgB || 0) > 0,
    (a, b) => (b.kgB || 0) - (a.kgB || 0),
    (sum, r) => sum + (r.ingresoB != null ? Number(r.ingresoB) : 0),
    true
  );
  const crecen = build(
    (r) => (r.kgA || 0) < (r.kgB || 0),
    (a, b) => (b.kgB || 0) - (b.kgA || 0) - ((a.kgB || 0) - (a.kgA || 0)),
    (sum, r) => sum + (r.deltaIngreso != null ? Number(r.deltaIngreso) : 0),
    true
  );
  const estables = build(
    (r) => (r.kgA || 0) > 0 && Math.abs((r.kgB || 0) - (r.kgA || 0)) / (r.kgA || 1) < 0.05,
    (a, b) => Math.abs((b.kgB || 0) - (b.kgA || 0)) - Math.abs((a.kgA || 0) - (a.kgB || 0)),
    (sum, r) => sum + (r.deltaIngreso != null ? Number(r.deltaIngreso) : 0),
    false
  );
  const esDejaron = (r) => r.ingresoA > 0 && r.ingresoB <= 0;
  const esMas = (r) => r.deltaIngreso > 0 && (r.kgA || 0) > 0;
  const esDisminuyeron = (r) => r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso < 0;
  const esNuevo = (r) => (r.kgA || 0) <= 0 && (r.kgB || 0) > 0;
  const otrosClientes = build(
    (r) => !esDejaron(r) && !esMas(r) && !esDisminuyeron(r) && !esNuevo(r),
    (a, b) => (b.kgA || 0) + (b.kgB || 0) - ((a.kgA || 0) + (a.kgB || 0)),
    (sum, r) => sum + (r.deltaIngreso != null ? Number(r.deltaIngreso) : 0),
    false
  );
  const totalTonAGeneral = (rows || []).reduce((s, r) => s + (r.kgA || 0) / 1000, 0);
  const totalTonBGeneral = (rows || []).reduce((s, r) => s + (r.kgB || 0) / 1000, 0);
  return {
    planta: planta.trim(),
    periodoA: pa,
    periodoB: pb,
    margenAStr,
    margenBStr,
    totalTonAGeneralStr: fmtTon(totalTonAGeneral),
    totalTonBGeneralStr: fmtTon(totalTonBGeneral),
    dejaron,
    mas,
    disminuyeron,
    clientesNuevos,
    crecen,
    estables,
    otrosClientes,
  };
}

function percentChangeOrUnknown(base, delta) {
  if (base == null || !Number.isFinite(Number(base)) || Number(base) === 0) {
    return null;
  }
  if (delta == null || !Number.isFinite(Number(delta))) return null;
  return Number(delta) / Number(base);
}

async function runWithClient(pool, opts, domain, run) {
  const injected = Boolean(opts.injected);
  if (injected) {
    try {
      return await run(null);
    } catch (e) {
      return sourceError(e && e.message, domain);
    }
  }
  if (!pool || typeof pool.connect !== "function") {
    return sourceError(`Fuente de ${domain} no disponible`, domain);
  }
  const client = await pool.connect();
  try {
    return await run(client);
  } catch (e) {
    return sourceError(e && e.message, domain);
  } finally {
    client.release();
  }
}

async function loadFamilyForChat(pool, plantaId, req, opts, family) {
  const auth = (req && req.dashboardAuth) || opts.auth || {};
  const missing = requirePlantaId(plantaId);
  if (missing) return missing;
  const denied = assertM9DeltasAccess(auth, plantaId);
  if (!denied.ok) return denied;

  const resolvePlanta = opts.resolvePlanta || resolvePlantaRow;
  const question = opts.question != null ? opts.question : req && req.body && req.body.question;

  return runWithClient(pool, { injected: Boolean(opts.resolvePlanta && opts.listPeriodos && opts.loadDatos) }, family.domain, async (client) => {
    const planta = await resolvePlanta(client, plantaId);
    if (!planta) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 404,
        error: "Planta no encontrada",
      };
    }
    const periodos = await opts.listPeriodos(client, planta.nombre);
    const pair = resolvePeriodPair(question, periodos);
    if (!pair.ok) {
      return {
        ok: false,
        code: pair.code === "insufficient_periods" ? DIRECTOR_IA_VERACITY.DATA_NOT_FOUND : DIRECTOR_IA_VERACITY.SOURCE_ERROR,
        status: pair.code === "insufficient_periods" ? 404 : 400,
        error: pair.error,
        periodos_disponibles: periodos || [],
      };
    }
    const datos = await opts.loadDatos(client, planta.nombre, pair.periodoA, pair.periodoB);
    if (!datos) {
      return {
        ok: false,
        code: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
        status: 400,
        error: "Datos no disponibles",
      };
    }
    return {
      ok: true,
      semantic_class: family.semantic_class,
      family: family.id,
      unit: family.unit,
      planta_id: Number(plantaId),
      planta_nombre: planta.nombre || null,
      planta_clave: planta.clave || null,
      periodoA: pair.periodoA,
      periodoB: pair.periodoB,
      period_source: pair.source,
      periodos_disponibles: periodos || [],
      percent_change_not_computed: true,
      source_coercion: family.source_coercion,
      not: family.not,
      datos,
    };
  });
}

async function loadDeltaVentaForChat(pool, plantaId, req, opts = {}) {
  return loadFamilyForChat(pool, plantaId, req, {
    ...opts,
    listPeriodos: opts.listPeriodos || getPeriodosDeltaVenta,
    loadDatos:
      opts.loadDatos ||
      (async (client, nombre, pa, pb) => {
        const rows = await getDeltaVentaClientes(client, nombre, pa, pb);
        return buildDeltaVentaDatosPayload(nombre, pa, pb, rows);
      }),
  }, {
    id: "delta_venta",
    domain: "delta_venta",
    semantic_class: VENTA_SEMANTIC_CLASS,
    unit: "kg",
    source_coercion: "Cliente ausente en un mes = 0 kg (COALESCE de la fuente).",
    not: ["delta_descuento", "delta_ingreso", "igf_annex", "arr_snapshot", "dashboard_kpis", "m19"],
  });
}

async function loadDeltaDescuentoForChat(pool, plantaId, req, opts = {}) {
  return loadFamilyForChat(pool, plantaId, req, {
    ...opts,
    listPeriodos: opts.listPeriodos || getPeriodosDeltaDescuento,
    loadDatos:
      opts.loadDatos ||
      (async (client, nombre, pa, pb) => {
        const rows = await getDeltaDescuentoClientes(client, nombre, pa, pb);
        return buildDeltaDescuentoDatosPayload(nombre, pa, pb, rows);
      }),
  }, {
    id: "delta_descuento",
    domain: "delta_descuento",
    semantic_class: DESCUENTO_SEMANTIC_CLASS,
    unit: "$/kg",
    source_coercion: "kg=0 → ratio 0 en la fuente; no es un porcentaje inventado.",
    not: ["delta_venta", "delta_ingreso", "weekly_discount_ld", "igf_annex", "arr_snapshot", "m19"],
  });
}

async function loadDeltaIngresoForChat(pool, plantaId, req, opts = {}) {
  return loadFamilyForChat(pool, plantaId, req, {
    ...opts,
    listPeriodos: opts.listPeriodos || getPeriodosDeltaVenta,
    loadDatos:
      opts.loadDatos ||
      ((client, nombre, pa, pb) => getDeltaIngresoDatosInternal(client, nombre, pa, pb, false, opts)),
  }, {
    id: "delta_ingreso",
    domain: "delta_ingreso",
    semantic_class: INGRESO_SEMANTIC_CLASS,
    unit: "MXN",
    source_coercion: "margen IGF ausente → 0 en la fórmula del modal; kg=0 → desc $/kg 0.",
    not: ["delta_venta", "delta_descuento", "delta_ingreso_forecast", "m19", "igf_annex", "arr_snapshot"],
  });
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

function failAnswer(payload, label) {
  if (payload && payload.code === DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED) {
    return payload.error || `Sin permiso para consultar ${label} en esta planta.`;
  }
  if (payload && payload.status === 404) {
    return payload.error || `No pude completar ${label}: planta o periodos insuficientes. No invento periodos.`;
  }
  return payload && payload.error
    ? `No pude completar ${label}: ${payload.error}. No afirmo valores.`
    : `No pude completar ${label} por un error de fuente. No afirmo valores.`;
}

function bucketLine(name, bucket, valueKey, strKey) {
  const n = bucket && Array.isArray(bucket.clientes) ? bucket.clientes.length : 0;
  const shown = n ? ` top20%=${n}` : " (sin clientes en el corte 80/20 de esta muestra)";
  const total = bucket && bucket[strKey] != null ? bucket[strKey] : "n/d";
  return `- ${name}: total ${total}${shown}`;
}

function buildDeltaVentaAnswer(payload) {
  if (!payload || payload.ok !== true) return failAnswer(payload, "Delta Venta");
  const d = payload.datos || {};
  const scope = `${payload.planta_nombre || `planta ${payload.planta_id}`}`;
  return (
    `Delta Venta (kg) de ${scope}: ${payload.periodoA} → ${payload.periodoB} ` +
    `(periodos ${payload.period_source === "question" ? "indicados en la pregunta" : "default: los dos YYYY-MM más recientes con datos"}). ` +
    `Fuente: arr.ventas_diarias_cliente, misma semántica que POST /api/dashboard/delta-venta-datos. ` +
    `No es Delta Descuento, Delta Ingreso, IGF, ARR snapshot, KPIs de folios ni M19. ` +
    `No afirma causalidad. El corte 80/20 es de esta muestra, no el universo. ` +
    `${payload.source_coercion} No calculo porcentaje de variación (base 0 no es % válido).\n` +
    bucketLine("Dejaron", d.dejaron, "totalDeltaKg", "totalDeltaKgStr") + "\n" +
    bucketLine("Más", d.mas, "totalDeltaKg", "totalDeltaKgStr") + "\n" +
    bucketLine("Disminuyeron", d.disminuyeron, "totalDeltaKg", "totalDeltaKgStr")
  );
}

function buildDeltaDescuentoAnswer(payload) {
  if (!payload || payload.ok !== true) return failAnswer(payload, "Delta Descuento");
  const d = payload.datos || {};
  const scope = `${payload.planta_nombre || `planta ${payload.planta_id}`}`;
  return (
    `Delta Descuento ($/kg) de ${scope}: ${payload.periodoA} → ${payload.periodoB}. ` +
    `Fuente: arr.descuentos_diarios_cliente + kg de ventas, misma semántica que POST /api/dashboard/delta-descuento-datos. ` +
    `No es Delta Venta, Delta Ingreso, narrativa weekly LD, IGF annex ni M19. ` +
    `«Más» aquí es deltaRatio < 0 (más descuento $/kg); no afirma deterioro. ` +
    `${payload.source_coercion} No invento % sobre base 0.\n` +
    bucketLine("Dejaron", d.dejaron, "totalDeltaRatio", "totalDeltaRatioStr") + "\n" +
    bucketLine("Más", d.mas, "totalDeltaRatio", "totalDeltaRatioStr") + "\n" +
    bucketLine("Disminuyeron", d.disminuyeron, "totalDeltaRatio", "totalDeltaRatioStr")
  );
}

function buildDeltaIngresoAnswer(payload) {
  if (!payload || payload.ok !== true) return failAnswer(payload, "Delta Ingreso");
  const d = payload.datos || {};
  const scope = `${payload.planta_nombre || `planta ${payload.planta_id}`}`;
  return (
    `Delta Ingreso (MXN) de ${scope}: ${payload.periodoA} → ${payload.periodoB}. ` +
    `Fórmula del modal: kg × (margen_$/kg − |desc_$/kg|). El margen IGF es insumo de esa fórmula, no un anexo IGF/ARR. ` +
    `No es Delta Venta, Delta Descuento, forecast de ingreso ni M19. ` +
    `${payload.source_coercion} No afirma causalidad. Corte 80/20 de esta muestra.\n` +
    `Margen A: ${d.margenAStr || "n/d"}; Margen B: ${d.margenBStr || "n/d"}.\n` +
    bucketLine("Dejaron", d.dejaron, "totalDeltaIngreso", "totalDeltaIngresoStr") + "\n" +
    bucketLine("Más", d.mas, "totalDeltaIngreso", "totalDeltaIngresoStr") + "\n" +
    bucketLine("Disminuyeron", d.disminuyeron, "totalDeltaIngreso", "totalDeltaIngresoStr")
  );
}

function buildFamilyChatResult(payload, opts, meta) {
  const planta_id = opts.planta_id != null ? opts.planta_id : payload && payload.planta_id;
  const answer = meta.buildAnswer(payload);
  const okPayload = Boolean(payload && payload.ok);
  const veracity = chatVeracity(payload);
  return {
    ok: true,
    answer,
    sources: okPayload ? [meta.source] : [],
    context_meta: {
      mode: meta.mode,
      requested_domain: meta.domain,
      openai_called: false,
      veracity,
      semantic_class: meta.semantic_class,
      planta_id,
      periodoA: okPayload ? payload.periodoA : undefined,
      periodoB: okPayload ? payload.periodoB : undefined,
      timestamp: new Date().toISOString(),
    },
    [meta.payloadKey]: okPayload
      ? {
          semantic_class: payload.semantic_class,
          family: payload.family,
          unit: payload.unit,
          planta_id: payload.planta_id,
          planta_nombre: payload.planta_nombre,
          periodoA: payload.periodoA,
          periodoB: payload.periodoB,
          period_source: payload.period_source,
          percent_change_not_computed: true,
          source_coercion: payload.source_coercion,
          not: payload.not,
          datos: payload.datos,
        }
      : null,
    limitation:
      !okPayload && veracity !== DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE
        ? { code: veracity, domain: meta.domain, label: meta.label }
        : undefined,
  };
}

function buildDeltaVentaChatResult(payload, opts = {}) {
  return buildFamilyChatResult(payload, opts, {
    buildAnswer: buildDeltaVentaAnswer,
    source: "dashboard.delta_venta",
    mode: "delta_sales",
    domain: "delta_venta",
    semantic_class: VENTA_SEMANTIC_CLASS,
    payloadKey: "delta_venta",
    label: "Delta Venta",
  });
}

function buildDeltaDescuentoChatResult(payload, opts = {}) {
  return buildFamilyChatResult(payload, opts, {
    buildAnswer: buildDeltaDescuentoAnswer,
    source: "dashboard.delta_descuento",
    mode: "delta_discount",
    domain: "delta_descuento",
    semantic_class: DESCUENTO_SEMANTIC_CLASS,
    payloadKey: "delta_descuento",
    label: "Delta Descuento",
  });
}

function buildDeltaIngresoChatResult(payload, opts = {}) {
  return buildFamilyChatResult(payload, opts, {
    buildAnswer: buildDeltaIngresoAnswer,
    source: "dashboard.delta_ingreso",
    mode: "delta_income",
    domain: "delta_ingreso",
    semantic_class: INGRESO_SEMANTIC_CLASS,
    payloadKey: "delta_ingreso",
    label: "Delta Ingreso",
  });
}

module.exports = {
  VENTA_SEMANTIC_CLASS,
  DESCUENTO_SEMANTIC_CLASS,
  INGRESO_SEMANTIC_CLASS,
  assertM9DeltasAccess,
  parseYyyyMmList,
  resolvePeriodPair,
  percentChangeOrUnknown,
  getPeriodosDeltaVenta,
  getDeltaVentaClientes,
  getPlantasDeltaDescuento,
  getPeriodosDeltaDescuento,
  getDeltaDescuentoClientes,
  getMargenKgPorPeriodo,
  getDeltaIngresoClientes,
  getDeltaIngresoDatosInternal,
  buildDeltaVentaDatosPayload,
  buildDeltaDescuentoDatosPayload,
  loadDeltaVentaForChat,
  loadDeltaDescuentoForChat,
  loadDeltaIngresoForChat,
  buildDeltaVentaAnswer,
  buildDeltaDescuentoAnswer,
  buildDeltaIngresoAnswer,
  buildDeltaVentaChatResult,
  buildDeltaDescuentoChatResult,
  buildDeltaIngresoChatResult,
};
