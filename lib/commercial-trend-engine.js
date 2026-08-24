"use strict";

/**
 * Motor compartido de tendencia comercial ARR (gráfica venta-serie).
 * Dashboard GET /api/arr/venta-serie y Director IA commercial_trend delegan aquí.
 * No comments. No HTTP. No causalidad.
 */

const RANGE_OK = Object.freeze(["1d", "5d", "1m", "3m", "ytd", "1a", "5a", "todo"]);
const RANGE_DAYS = Object.freeze({ "1m": 30, "3m": 90 });

function normalizeAccents(s) {
  if (s == null || s === "") return "";
  return String(s).normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase();
}

function dateToPg(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function pgCalendarDateToYmd(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    try {
      return v.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  return "";
}

function round3(n) {
  return Math.round(Number(n || 0) * 1000) / 1000;
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function stripEmpresa(s) {
  return normalizeAccents(s)
    .replace(/^GTM\s*-?\s*/, "")
    .replace(/^GT\s*-?\s*/, "")
    .trim();
}

function normalizeRangeToken(rangeRaw) {
  const rangeOk = RANGE_OK.includes(String(rangeRaw || "").trim().toLowerCase())
    ? String(rangeRaw).trim().toLowerCase()
    : "1m";
  return rangeOk;
}

function rangeDaysToToken(days) {
  const n = Number(days);
  if (n === 90) return "3m";
  return "1m";
}

function tokenToRangeDays(rangeOk) {
  if (rangeOk === "3m") return 90;
  if (rangeOk === "1m") return 30;
  return RANGE_DAYS[rangeOk] || null;
}

function normalizeCanalFilter(canalRaw) {
  const raw = String(canalRaw || "ambos").trim().toLowerCase();
  return raw === "casa" || raw === "comisionista" ? raw : "ambos";
}

function canalExprSales() {
  return "LOWER(TRIM(COALESCE(cat.canal, v.canal, 'Casa')))";
}

function canalExprDiscount() {
  return "LOWER(TRIM(COALESCE(cat.canal, 'Casa')))";
}

function canalSqlFor(canalFilter, kind) {
  const expr = kind === "discount" ? canalExprDiscount() : canalExprSales();
  if (canalFilter === "casa") return `AND ${expr} NOT LIKE '%comisionista%'`;
  if (canalFilter === "comisionista") return `AND ${expr} LIKE '%comisionista%'`;
  return "";
}

function classifyCanalGrp(canalRaw) {
  const n = String(canalRaw || "").toLowerCase().trim();
  return n.includes("comisionista") ? "COMISIONISTA" : "CASA";
}

/**
 * OLS idéntico a ArrVentaGraficaModal.tsx linearTrend.
 * x = índice 0..n-1 de puntos ya filtrados. y = venta_ton.
 */
function linearTrend(values) {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

function trendDirection(slope) {
  if (slope == null || !Number.isFinite(slope)) return "INSUFFICIENT_DATA";
  if (slope > 0) return "UP";
  if (slope < 0) return "DOWN";
  return "FLAT";
}

function computeTrendFromPoints(points) {
  const values = (points || []).map((p) => Number(p.venta_ton) || 0);
  const n = values.length;
  const fit = linearTrend(values);
  if (!fit) {
    return {
      a: null,
      b: null,
      slope: null,
      intercept: null,
      observation_count: n,
      direction: "INSUFFICIENT_DATA",
    };
  }
  return {
    a: fit.a,
    b: fit.b,
    slope: fit.b,
    intercept: fit.a,
    observation_count: n,
    direction: trendDirection(fit.b),
  };
}

function resolveRangeWindow(minF, maxF, rangeOk) {
  const end = new Date(`${maxF}T12:00:00Z`);
  const start = new Date(end);
  if (Number.isNaN(end.getTime())) {
    return { error: "Fecha máxima inválida en ventas diarias" };
  }
  if (rangeOk === "1d") start.setUTCDate(end.getUTCDate());
  else if (rangeOk === "5d") start.setUTCDate(end.getUTCDate() - 4);
  else if (rangeOk === "1m") start.setUTCDate(end.getUTCDate() - 29);
  else if (rangeOk === "3m") start.setUTCDate(end.getUTCDate() - 89);
  else if (rangeOk === "ytd") start.setUTCFullYear(end.getUTCFullYear(), 0, 1);
  else if (rangeOk === "1a") start.setUTCDate(end.getUTCDate() - 364);
  else if (rangeOk === "5a") start.setUTCFullYear(end.getUTCFullYear() - 5);
  else {
    const [y, m, d] = String(minF).split("-").map(Number);
    start.setUTCFullYear(y, m - 1, d);
  }
  const startStr = dateToPg(start);
  const endStr = maxF;
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (spanDays - 1));
  return {
    fecha_desde: startStr,
    fecha_hasta: endStr,
    fecha_prev_desde: dateToPg(prevStart),
    fecha_prev_hasta: dateToPg(prevEnd),
    span_days: spanDays,
  };
}

function assemblePoints(salesRows, discountRows) {
  const byFecha = new Map();
  for (const row of salesRows || []) {
    const f = pgCalendarDateToYmd(row.fecha);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) continue;
    if (!byFecha.has(f)) byFecha.set(f, { fecha: f, venta_ton: 0, descuento_mxn: 0 });
    byFecha.get(f).venta_ton += row.venta_ton != null ? Number(row.venta_ton) : 0;
  }
  for (const row of discountRows || []) {
    const f = pgCalendarDateToYmd(row.fecha);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) continue;
    if (!byFecha.has(f)) byFecha.set(f, { fecha: f, venta_ton: 0, descuento_mxn: 0 });
    byFecha.get(f).descuento_mxn += row.descuento_mxn != null ? Number(row.descuento_mxn) : 0;
  }
  return [...byFecha.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .filter((p) => p.venta_ton !== 0 || p.descuento_mxn !== 0)
    .map((p) => ({
      fecha: p.fecha,
      venta_ton: round3(p.venta_ton),
      descuento_mxn: round2(p.descuento_mxn),
    }));
}

function selectTopMovers(cliCurRows, cliPrevRows) {
  const curMap = new Map();
  for (const row of cliCurRows || []) {
    const name = String(row.cliente || "").trim();
    if (name) curMap.set(name, Number(row.venta_ton) || 0);
  }
  const prevMap = new Map();
  for (const row of cliPrevRows || []) {
    const name = String(row.cliente || "").trim();
    if (name) prevMap.set(name, Number(row.venta_ton) || 0);
  }
  const allClientes = new Set([...curMap.keys(), ...prevMap.keys()]);
  const clientesDelta = [];
  for (const nombre of allClientes) {
    const actual = curMap.get(nombre) || 0;
    const previo = prevMap.get(nombre) || 0;
    const delta = round3(actual - previo);
    if (Math.abs(delta) < 0.001) continue;
    let tipo = "aumento";
    if (previo <= 0 && actual > 0) tipo = "nuevo";
    else if (previo > 0 && actual <= 0) tipo = "perdido";
    else if (delta < 0) tipo = "disminucion";
    else tipo = "aumento";
    clientesDelta.push({
      cliente: nombre,
      venta_ton_actual: round3(actual),
      venta_ton_prev: round3(previo),
      delta_ton: delta,
      tipo,
    });
  }
  clientesDelta.sort((a, b) => Math.abs(b.delta_ton) - Math.abs(a.delta_ton));
  return clientesDelta.slice(0, 6);
}

function assembleCommercialTrend(input) {
  const points = assemblePoints(input.salesRows, input.discountRows);
  const clientes_top = selectTopMovers(input.cliCurRows, input.cliPrevRows);
  const trend = computeTrendFromPoints(points);
  const period_total = round3(points.reduce((acc, p) => acc + Number(p.venta_ton || 0), 0));
  return {
    ok: true,
    plant_code: input.plant_code || "",
    plant_codes: input.plant_codes || [],
    range: input.range,
    canal: input.canal,
    fecha_desde: input.fecha_desde,
    fecha_hasta: input.fecha_hasta,
    fecha_prev_desde: input.fecha_prev_desde,
    fecha_prev_hasta: input.fecha_prev_hasta,
    range_days: tokenToRangeDays(input.range),
    points,
    clientes_top,
    trend,
    period_total,
    observation_count: trend.observation_count,
  };
}

function emptyEngineResult(opts) {
  return {
    ok: true,
    empty: true,
    plant_code: (opts && opts.plant_code) || "",
    plant_codes: (opts && opts.plant_codes) || [],
    range: opts && opts.range,
    canal: opts && opts.canal,
    fecha_desde: null,
    fecha_hasta: null,
    fecha_prev_desde: null,
    fecha_prev_hasta: null,
    range_days: tokenToRangeDays(opts && opts.range),
    points: [],
    clientes_top: [],
    trend: computeTrendFromPoints([]),
    period_total: 0,
    observation_count: 0,
  };
}

function toVentaSerieHttpBody(result, empresa) {
  return {
    ok: true,
    empresa,
    plant_code: result.plant_code || "",
    range: result.range,
    canal: result.canal,
    fecha_desde: result.fecha_desde || undefined,
    fecha_hasta: result.fecha_hasta || undefined,
    fecha_prev_desde: result.fecha_prev_desde || undefined,
    fecha_prev_hasta: result.fecha_prev_hasta || undefined,
    points: result.points || [],
    clientes_top: result.clientes_top || [],
    trend: result.trend || null,
  };
}

async function resolvePlantCodes(client, empresa) {
  const [mapRes, codesRes] = await Promise.all([
    client.query(
      `SELECT DISTINCT p.nombre AS prov_name,
              TRIM(COALESCE(p.clave, '')) AS clave,
              TRIM(ap.plant_code) AS ap_plant_code
         FROM public.plantas p
         JOIN arr.provincia_plants ap
           ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
           OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
        WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
          AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'`
    ),
    client.query(`SELECT DISTINCT TRIM(plant_code) AS plant_code FROM arr.ventas_diarias_cliente`),
  ]);

  const empNorm = normalizeAccents(empresa);
  const empCore = stripEmpresa(empresa);
  const matchedMeta = (mapRes.rows || []).filter((row) => {
    const names = [row.prov_name, row.ap_plant_code, row.clave]
      .map((x) => normalizeAccents(x || ""))
      .filter(Boolean);
    return names.some((n) => {
      const core = stripEmpresa(n);
      return (
        empNorm === n ||
        empNorm.includes(n) ||
        n.includes(empNorm) ||
        (empCore && (empCore === core || empCore.includes(core) || core.includes(empCore)))
      );
    });
  });
  matchedMeta.sort((a, b) => {
    const score = (r) => Math.max(String(r.prov_name || "").length, String(r.ap_plant_code || "").length);
    return score(b) - score(a);
  });

  const aliasSet = new Set();
  for (const row of matchedMeta) {
    for (const x of [row.prov_name, row.ap_plant_code, row.clave]) {
      const t = String(x || "").trim();
      if (!t) continue;
      aliasSet.add(normalizeAccents(t));
      aliasSet.add(stripEmpresa(t));
    }
  }
  if (!aliasSet.size) {
    const provRes = await client.query("SELECT plant_code FROM arr.provincia_plants");
    for (const r of provRes.rows || []) {
      const p = String(r.plant_code || "").trim();
      const pNorm = normalizeAccents(p);
      const pCore = stripEmpresa(p);
      if (
        empNorm === pNorm ||
        empNorm.includes(pNorm) ||
        pNorm.includes(empNorm) ||
        (empCore && (empCore === pCore || empCore.includes(pCore) || pCore.includes(empCore)))
      ) {
        aliasSet.add(pNorm);
        aliasSet.add(pCore);
      }
    }
  }
  if (!aliasSet.size) {
    return { not_found: true, uniqueCodes: [], plantCode: "", matchedMeta: [] };
  }

  const plantCodes = [];
  for (const row of codesRes.rows || []) {
    const pc = String(row.plant_code || "").trim();
    if (!pc) continue;
    const n = normalizeAccents(pc);
    const c = stripEmpresa(pc);
    if (aliasSet.has(n) || aliasSet.has(c)) {
      plantCodes.push(pc);
      continue;
    }
    const hit = [...aliasSet].some(
      (a) => a && a.length >= 5 && (n === a || c === a || n.includes(a) || a.includes(n))
    );
    if (hit) plantCodes.push(pc);
  }
  if (!plantCodes.length) {
    for (const row of matchedMeta) {
      for (const x of [row.ap_plant_code, row.prov_name, row.clave]) {
        const t = String(x || "").trim();
        if (t) plantCodes.push(t);
      }
    }
  }
  const uniqueCodes = [...new Set(plantCodes.map((c) => c.trim()).filter(Boolean))];
  const plantCode = String(
    (matchedMeta[0] && (matchedMeta[0].ap_plant_code || matchedMeta[0].prov_name)) || uniqueCodes[0] || ""
  ).trim();
  return { not_found: false, uniqueCodes, plantCode, matchedMeta };
}

async function queryFechaBounds(client, codesUpper) {
  return client.query(
    `SELECT to_char(MIN(fecha), 'YYYY-MM-DD') AS min_f,
            to_char(MAX(fecha), 'YYYY-MM-DD') AS max_f
       FROM arr.ventas_diarias_cliente
      WHERE UPPER(TRIM(plant_code)) = ANY($1::text[])`,
    [codesUpper]
  );
}

async function querySalesSeries(client, codesUpper, startStr, endStr, canalFilter) {
  const canalSql = canalSqlFor(canalFilter, "sales");
  return client.query(
    `SELECT to_char(v.fecha::date, 'YYYY-MM-DD') AS fecha,
            CASE
              WHEN LOWER(TRIM(COALESCE(cat.canal, v.canal, 'Casa'))) LIKE '%comisionista%'
                THEN 'COMISIONISTA'
              ELSE 'CASA'
            END AS canal_grp,
            ROUND((SUM(v.kg) / 1000.0)::numeric, 3) AS venta_ton
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
      GROUP BY v.fecha::date,
               CASE
                 WHEN LOWER(TRIM(COALESCE(cat.canal, v.canal, 'Casa'))) LIKE '%comisionista%'
                   THEN 'COMISIONISTA'
                 ELSE 'CASA'
               END
      ORDER BY fecha ASC`,
    [codesUpper, startStr, endStr]
  );
}

async function queryDiscountSeries(client, codesUpper, startStr, endStr, canalFilter) {
  const canalSql = canalSqlFor(canalFilter, "discount");
  return client.query(
    `SELECT to_char(d.fecha::date, 'YYYY-MM-DD') AS fecha,
            CASE
              WHEN LOWER(TRIM(COALESCE(cat.canal, 'Casa'))) LIKE '%comisionista%'
                THEN 'COMISIONISTA'
              ELSE 'CASA'
            END AS canal_grp,
            ROUND(SUM(d.monto)::numeric, 2) AS descuento_mxn
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
      GROUP BY d.fecha::date,
               CASE
                 WHEN LOWER(TRIM(COALESCE(cat.canal, 'Casa'))) LIKE '%comisionista%'
                   THEN 'COMISIONISTA'
                 ELSE 'CASA'
               END
      ORDER BY fecha ASC`,
    [codesUpper, startStr, endStr]
  );
}

async function queryClientTons(client, codesUpper, startStr, endStr, canalFilter) {
  const canalSql = canalSqlFor(canalFilter, "sales");
  return client.query(
    `SELECT TRIM(v.cliente_norm) AS cliente,
            ROUND((SUM(v.kg) / 1000.0)::numeric, 3) AS venta_ton
       FROM arr.ventas_diarias_cliente v
       LEFT JOIN arr.cliente_categoria_mes cat
         ON UPPER(TRIM(cat.plant_code)) = UPPER(TRIM(v.plant_code))
        AND cat.year = EXTRACT(YEAR FROM v.fecha)::int
        AND cat.month = EXTRACT(MONTH FROM v.fecha)::int
        AND cat.cliente_norm = v.cliente_norm
      WHERE UPPER(TRIM(v.plant_code)) = ANY($1::text[])
        AND v.fecha >= $2::date AND v.fecha <= $3::date
        ${canalSql}
      GROUP BY TRIM(v.cliente_norm)`,
    [codesUpper, startStr, endStr]
  );
}

/**
 * Carga la misma verdad que GET /api/arr/venta-serie (sin comments).
 */
async function loadCommercialTrend(client, opts = {}) {
  const empresa = String((opts && opts.empresa) || "").trim();
  const rangeOk = normalizeRangeToken(opts && opts.range);
  const canalFilter = normalizeCanalFilter(opts && opts.canal);
  if (!empresa) {
    return { ok: false, status: 400, error: "Falta empresa" };
  }

  const resolvePlant = opts.resolvePlantCodes || resolvePlantCodes;
  const plant = await resolvePlant(client, empresa);
  if (plant && plant.not_found) {
    return { ok: false, status: 404, error: `No se encontró planta provincia para empresa "${empresa}"` };
  }
  const uniqueCodes = (plant && plant.uniqueCodes) || [];
  const plantCode = (plant && plant.plantCode) || "";
  if (!uniqueCodes.length) {
    return emptyEngineResult({ plant_code: "", range: rangeOk, canal: canalFilter, plant_codes: [] });
  }
  const codesUpper = uniqueCodes.map((c) => c.toUpperCase());

  const queryBounds = opts.queryBounds || queryFechaBounds;
  const bounds = await queryBounds(client, codesUpper);
  const minF = pgCalendarDateToYmd(bounds.rows[0] && bounds.rows[0].min_f);
  const maxF = pgCalendarDateToYmd(bounds.rows[0] && bounds.rows[0].max_f);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(minF) || !/^\d{4}-\d{2}-\d{2}$/.test(maxF)) {
    return emptyEngineResult({
      plant_code: plantCode,
      range: rangeOk,
      canal: canalFilter,
      plant_codes: uniqueCodes,
    });
  }

  const window = resolveRangeWindow(minF, maxF, rangeOk);
  if (window.error) {
    return { ok: false, status: 500, error: window.error };
  }

  const querySales = opts.querySalesSeries || querySalesSeries;
  const queryDisc = opts.queryDiscountSeries || queryDiscountSeries;
  const queryCli = opts.queryClientTons || queryClientTons;

  const [salesRes, discRes, cliCur, cliPrev] = await Promise.all([
    querySales(client, codesUpper, window.fecha_desde, window.fecha_hasta, canalFilter),
    queryDisc(client, codesUpper, window.fecha_desde, window.fecha_hasta, canalFilter),
    queryCli(client, codesUpper, window.fecha_desde, window.fecha_hasta, canalFilter),
    queryCli(client, codesUpper, window.fecha_prev_desde, window.fecha_prev_hasta, canalFilter),
  ]);

  return assembleCommercialTrend({
    plant_code: plantCode,
    plant_codes: uniqueCodes,
    range: rangeOk,
    canal: canalFilter,
    fecha_desde: window.fecha_desde,
    fecha_hasta: window.fecha_hasta,
    fecha_prev_desde: window.fecha_prev_desde,
    fecha_prev_hasta: window.fecha_prev_hasta,
    salesRows: salesRes.rows || [],
    discountRows: discRes.rows || [],
    cliCurRows: cliCur.rows || [],
    cliPrevRows: cliPrev.rows || [],
  });
}

module.exports = {
  RANGE_OK,
  RANGE_DAYS,
  normalizeAccents,
  dateToPg,
  pgCalendarDateToYmd,
  round3,
  round2,
  normalizeRangeToken,
  rangeDaysToToken,
  tokenToRangeDays,
  normalizeCanalFilter,
  canalSqlFor,
  classifyCanalGrp,
  linearTrend,
  trendDirection,
  computeTrendFromPoints,
  resolveRangeWindow,
  assemblePoints,
  selectTopMovers,
  assembleCommercialTrend,
  emptyEngineResult,
  toVentaSerieHttpBody,
  resolvePlantCodes,
  loadCommercialTrend,
};
