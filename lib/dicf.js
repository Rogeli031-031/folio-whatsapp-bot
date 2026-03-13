"use strict";

/**
 * Delta Ingreso Cliente Forecast (DICF).
 * Oportunidades al día de hoy por cliente (dejaron, nuevos, aumentaron, disminuyeron)
 * con proyección a cierre del mes en curso. Usa 60 días de historial desde la última fecha real.
 * Sin periodo A/B; margen = IGF versión máxima del mes; descuento = real (suma descuentos / suma kg).
 */

const WINDOW_DAYS = 60;
const HALF_LIFE_WEEKS = 3;
const SUM_LAST_14_FOR_INACTIVE = 14;

function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Devuelve YYYY-MM-DD para usar como clave (pg puede devolver Date o string). */
function toDateKey(val) {
  if (val == null) return "";
  if (val instanceof Date) return dateToStr(val);
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : dateToStr(d);
}

function medianGapFromSeries(series) {
  const indices = [];
  for (let i = 0; i < series.length; i++) {
    if (series[i] > 0) indices.push(i);
  }
  if (indices.length === 0) return 9999;
  if (indices.length === 1) return 14;
  const gaps = [];
  for (let j = 1; j < indices.length; j++) gaps.push(indices[j] - indices[j - 1]);
  gaps.sort((a, b) => a - b);
  const n = gaps.length;
  return n % 2 === 1 ? gaps[(n - 1) / 2] : (gaps[n / 2 - 1] + gaps[n / 2]) / 2;
}

function daysSinceLastFromSeries(series) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] > 0) return series.length - 1 - i;
  }
  return series.length;
}

function sumLastN(series, n) {
  const start = Math.max(0, series.length - n);
  let s = 0;
  for (let i = start; i < series.length; i++) s += series[i];
  return s;
}

function clientState(series, freq, daysSince, toleranciaDias) {
  const s14 = sumLastN(series, SUM_LAST_14_FOR_INACTIVE);
  if (s14 === 0) return { state: "Inactivo", atten: 0 };
  if (freq >= 9999) return { state: "Inactivo", atten: 0 };
  const tol = toleranciaDias != null && Number.isFinite(toleranciaDias) ? Number(toleranciaDias) : 2;
  if (daysSince <= tol) return { state: "Activo", atten: 1 };
  if (daysSince <= 1.5 * freq) return { state: "Activo", atten: 1 };
  if (daysSince <= 3 * freq) return { state: "Latente", atten: 0.35 };
  return { state: "Inactivo", atten: 0.2 };
}

function projectKgToMonthEnd(series, startDateStr, endDateStr, monthEndStr) {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const monthEnd = parseDate(monthEndStr);
  if (!start || !end || !monthEnd || end >= monthEnd) return 0;
  const totalDays = series.length;
  const lam = Math.LN2 / (HALF_LIFE_WEEKS * 7);
  const wsum = [0, 0, 0, 0, 0, 0, 0];
  const wcnt = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const ageDays = totalDays - 1 - i;
    const w = Math.exp(-lam * ageDays);
    wcnt[dow] += w;
    if (series[i] > 0) wsum[dow] += series[i] * w;
  }
  const avgByDow = wsum.map((s, j) => (wcnt[j] > 0 ? s / wcnt[j] : 0));
  const remStart = new Date(end);
  remStart.setDate(remStart.getDate() + 1);
  let proj = 0;
  for (let d = new Date(remStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    proj += avgByDow[d.getDay()];
  }
  const last7 = sumLastN(series, 7);
  const last14 = sumLastN(series, 14);
  const cap = last7 > 0 && last14 > 0 ? Math.min(last7, last14 / 2) : (last7 || last14);
  if (cap > 0 && proj > cap) proj = cap;
  return Math.max(0, proj);
}

/**
 * Calcula Delta Ingreso Cliente Forecast para una planta.
 * @param {object} client - pg client
 * @param {string} plantCode - código planta en arr
 * @param {string} plantaNombre - nombre planta para margen (IGF)
 * @param {function} getMargenKg - (client, plantName, year, month) => Promise<number|null>
 * @returns {Promise<object>} { planta, last_date, window_days, periodoMes, dejaron, nuevos, aumentaron, disminuyeron, byCategoria }
 */
const PROV_MAP_CTE = `
  WITH prov_map AS (
    SELECT DISTINCT p.nombre AS prov_name,
           UPPER(TRIM(p.nombre)) AS key_nombre,
           UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
      FROM public.plantas p
      JOIN arr.provincia_plants ap
        ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
        OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
     WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
       AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
  )`;

async function computeDicf(client, plantCode, plantaNombre, getMargenKg) {
  const plantaParam = (plantaNombre || plantCode || "").trim();
  let maxFecha = null;
  let canonicalPlantCode = plantCode;
  let useProvMap = true;

  const rMax = await client.query(
    `${PROV_MAP_CTE}
     SELECT MAX(v.fecha) AS max_fecha
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                       OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1))`,
    [plantaParam]
  );
  maxFecha = rMax.rows?.[0]?.max_fecha;
  if (maxFecha) {
    const rPlant = await client.query(
      `${PROV_MAP_CTE}
       SELECT v.plant_code FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
        LIMIT 1`,
      [plantaParam]
    );
    if (rPlant.rows?.[0]?.plant_code != null) canonicalPlantCode = String(rPlant.rows[0].plant_code).trim();
  }
  if (!maxFecha) {
    const rFallback = await client.query(
      `SELECT MAX(fecha) AS max_fecha FROM arr.ventas_diarias_cliente WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))`,
      [plantaParam]
    );
    maxFecha = rFallback.rows?.[0]?.max_fecha;
    if (maxFecha) {
      useProvMap = false;
      const rCode = await client.query(
        `SELECT plant_code FROM arr.ventas_diarias_cliente WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) LIMIT 1`,
        [plantaParam]
      );
      if (rCode.rows?.[0]?.plant_code != null) canonicalPlantCode = String(rCode.rows[0].plant_code).trim();
    }
  }

  if (!maxFecha) {
    return {
      planta: plantaParam || plantCode,
      last_date: null,
      window_days: WINDOW_DAYS,
      periodoMes: null,
      dejaron: { totalDeltaIngresoStr: "$0", clientes: [] },
      nuevos: { totalDeltaIngresoStr: "$0", clientes: [] },
      aumentaron: { totalDeltaIngresoStr: "$0", clientes: [] },
      disminuyeron: { totalDeltaIngresoStr: "$0", clientes: [] },
      byCategoria: [],
    };
  }

  const lastDate = new Date(maxFecha);
  const lastDateStr = dateToStr(lastDate);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = dateToStr(yesterday);
  const effectiveLastDateStr = lastDateStr > yesterdayStr ? yesterdayStr : lastDateStr;
  const year = lastDate.getFullYear();
  const month = lastDate.getMonth() + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endMesStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
  const firstDayMes = `${year}-${String(month).padStart(2, "0")}-01`;

  const configRow = await client.query(
    `SELECT window_days, tolerancia_dias FROM arr.dicf_config WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND year = $2 AND month = $3`,
    [canonicalPlantCode, year, month]
  );
  const row0 = configRow.rows?.[0];
  const window_days = (row0?.window_days != null && row0.window_days > 0)
    ? Number(row0.window_days)
    : WINDOW_DAYS;
  const tolerancia_dias = (row0?.tolerancia_dias != null && row0.tolerancia_dias >= 0)
    ? Number(row0.tolerancia_dias)
    : 2;

  const windowStart = new Date(lastDate);
  windowStart.setDate(windowStart.getDate() - (window_days - 1));
  const startStr = dateToStr(windowStart);

  const ventas = useProvMap
    ? await client.query(
        `${PROV_MAP_CTE}
         SELECT v.fecha, v.cliente_norm, v.canal, COALESCE(v.subcanal, '') AS subcanal, SUM(v.kg) AS kg
           FROM arr.ventas_diarias_cliente v
           JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
            AND v.fecha >= $2::date AND v.fecha <= $3::date
          GROUP BY v.fecha, v.cliente_norm, v.canal, v.subcanal`,
        [plantaParam, startStr, lastDateStr]
      )
    : await client.query(
        `SELECT fecha, cliente_norm, canal, COALESCE(subcanal, '') AS subcanal, SUM(kg) AS kg
           FROM arr.ventas_diarias_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY fecha, cliente_norm, canal, subcanal`,
        [canonicalPlantCode, startStr, lastDateStr]
      );

  const descuentos = useProvMap
    ? await client.query(
        `${PROV_MAP_CTE}
         SELECT d.fecha, d.cliente_norm, SUM(d.monto) AS monto
           FROM arr.descuentos_diarios_cliente d
           JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
            AND d.fecha >= $2::date AND d.fecha <= $3::date
          GROUP BY d.fecha, d.cliente_norm`,
        [plantaParam, startStr, lastDateStr]
      )
    : await client.query(
        `SELECT fecha, cliente_norm, SUM(monto) AS monto
           FROM arr.descuentos_diarios_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY fecha, cliente_norm`,
        [canonicalPlantCode, startStr, lastDateStr]
      );

  const catMes = useProvMap
    ? await client.query(
        `${PROV_MAP_CTE}
         SELECT c.cliente_norm, c.canal, COALESCE(c.subcanal, '') AS subcanal
           FROM arr.cliente_categoria_mes c
           JOIN prov_map pm ON UPPER(TRIM(c.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(c.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1))) AND c.year = $2 AND c.month = $3`,
        [plantaParam, year, month]
      )
    : await client.query(
        `SELECT cliente_norm, canal, COALESCE(subcanal, '') AS subcanal
           FROM arr.cliente_categoria_mes
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND year = $2 AND month = $3`,
        [canonicalPlantCode, year, month]
      );
  const catMap = new Map((catMes.rows || []).map((r) => [r.cliente_norm, { canal: r.canal || "Casa", subcanal: r.subcanal || "" }]));

  let yearPrev = year;
  let monthPrev = month - 1;
  if (monthPrev < 1) {
    monthPrev += 12;
    yearPrev -= 1;
  }
  const firstDayPrev = `${yearPrev}-${String(monthPrev).padStart(2, "0")}-01`;
  const lastDayPrev = new Date(yearPrev, monthPrev, 0).getDate();
  const lastDayPrevStr = `${yearPrev}-${String(monthPrev).padStart(2, "0")}-${String(lastDayPrev).padStart(2, "0")}`;

  const ventasMesAnterior = useProvMap
    ? await client.query(
        `${PROV_MAP_CTE}
         SELECT v.cliente_norm, SUM(v.kg) AS kg
           FROM arr.ventas_diarias_cliente v
           JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
            AND v.fecha >= $2::date AND v.fecha <= $3::date
          GROUP BY v.cliente_norm`,
        [plantaParam, firstDayPrev, lastDayPrevStr]
      )
    : await client.query(
        `SELECT cliente_norm, SUM(kg) AS kg
           FROM arr.ventas_diarias_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY cliente_norm`,
        [canonicalPlantCode, firstDayPrev, lastDayPrevStr]
      );
  const descMesAnterior = useProvMap
    ? await client.query(
        `${PROV_MAP_CTE}
         SELECT d.cliente_norm, SUM(d.monto) AS monto
           FROM arr.descuentos_diarios_cliente d
           JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
            AND d.fecha >= $2::date AND d.fecha <= $3::date
          GROUP BY d.cliente_norm`,
        [plantaParam, firstDayPrev, lastDayPrevStr]
      )
    : await client.query(
        `SELECT cliente_norm, SUM(monto) AS monto
           FROM arr.descuentos_diarios_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY cliente_norm`,
        [canonicalPlantCode, firstDayPrev, lastDayPrevStr]
      );

  const kgAnteriorByClient = new Map((ventasMesAnterior.rows || []).map((r) => [r.cliente_norm, Number(r.kg) || 0]));
  const descAnteriorByClient = new Map((descMesAnterior.rows || []).map((r) => [r.cliente_norm, Number(r.monto) || 0]));

  const nDays = Math.round((new Date(lastDateStr) - new Date(startStr)) / 86400000) + 1;
  const seriesByClient = new Map();

  for (const r of ventas.rows || []) {
    const key = r.cliente_norm;
    if (!key) continue;
    if (!seriesByClient.has(key)) {
      seriesByClient.set(key, {
        kg: new Array(nDays).fill(0),
        desc: new Array(nDays).fill(0),
        canal: r.canal || "Casa",
        subcanal: r.subcanal != null ? r.subcanal : "",
      });
    }
    const rec = seriesByClient.get(key);
    const f = r.fecha ? String(r.fecha).slice(0, 10) : "";
    const idx = f ? Math.round((new Date(f) - new Date(startStr)) / 86400000) : -1;
    if (idx >= 0 && idx < nDays) rec.kg[idx] += Number(r.kg || 0);
    if (r.canal) rec.canal = r.canal;
    if (r.subcanal != null) rec.subcanal = r.subcanal;
  }

  const descByDateCliente = new Map();
  for (const r of descuentos.rows || []) {
    const f = r.fecha ? String(r.fecha).slice(0, 10) : "";
    if (!f) continue;
    const k = `${f}|${r.cliente_norm}`;
    descByDateCliente.set(k, (descByDateCliente.get(k) || 0) + Number(r.monto || 0));
  }
  for (const [cliente, rec] of seriesByClient) {
    const cat = catMap.get(cliente);
    if (cat) {
      rec.canal = cat.canal;
      rec.subcanal = cat.subcanal;
    }
    for (let i = 0; i < nDays; i++) {
      const d = new Date(startStr);
      d.setDate(d.getDate() + i);
      const fs = dateToStr(d);
      const monto = descByDateCliente.get(`${fs}|${cliente}`);
      if (monto != null) rec.desc[i] = monto;
    }
  }

  let margen = (await getMargenKg(client, plantaNombre || plantCode, year, month)) ?? 0;
  if (margen == null || Number(margen) <= 0 || !Number.isFinite(margen)) margen = 1;
  let margenAnterior = (await getMargenKg(client, plantaNombre || plantCode, yearPrev, monthPrev)) ?? 0;
  if (margenAnterior == null || Number(margenAnterior) <= 0 || !Number.isFinite(margenAnterior)) margenAnterior = 1;
  const daysInMonth = lastDayOfMonth;

  const lookback365 = new Date(lastDate);
  lookback365.setDate(lookback365.getDate() - 365);
  const lookback365Str = dateToStr(lookback365);
  let lastPurchaseDateByClient = new Map();
  try {
    const lastPurchaseQuery = useProvMap
      ? await client.query(
          `${PROV_MAP_CTE}
           SELECT t.cliente_norm, MAX(t.fecha) AS last_fecha
             FROM (
               SELECT v.cliente_norm, v.fecha, SUM(v.kg) AS tot
                 FROM arr.ventas_diarias_cliente v
                 JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                                 OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
                WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
                  AND v.fecha >= $2::date AND v.fecha <= $3::date
                GROUP BY v.cliente_norm, v.fecha
             ) t
            WHERE t.tot > 0
            GROUP BY t.cliente_norm`,
          [plantaParam, lookback365Str, lastDateStr]
        )
      : await client.query(
          `SELECT t.cliente_norm, MAX(t.fecha) AS last_fecha
             FROM (
               SELECT cliente_norm, fecha, SUM(kg) AS tot
                 FROM arr.ventas_diarias_cliente
                WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND fecha >= $2::date AND fecha <= $3::date
                GROUP BY cliente_norm, fecha
             ) t
            WHERE t.tot > 0
            GROUP BY t.cliente_norm`,
          [canonicalPlantCode, lookback365Str, lastDateStr]
        );
    lastPurchaseDateByClient = new Map((lastPurchaseQuery.rows || []).map((r) => [r.cliente_norm, r.last_fecha ? dateToStr(new Date(r.last_fecha)) : null]).filter(([, d]) => d));
  } catch (e) {
    // no romper el flujo
  }

  const rows = [];
  const allClientes = new Set([...seriesByClient.keys(), ...kgAnteriorByClient.keys()]);

  for (const cliente of allClientes) {
    const rec = seriesByClient.get(cliente) || { kg: [], desc: [], canal: "Casa", subcanal: "" };
    const kgSeries = rec.kg.length ? rec.kg : [];
    const freq = medianGapFromSeries(kgSeries);
    const daysSince = daysSinceLastFromSeries(kgSeries);
    const { state, atten } = clientState(kgSeries, freq, daysSince, tolerancia_dias);

    const kg_hist = kgSeries.reduce((s, k) => s + (Number(k) || 0), 0);
    const desc_hist = (rec.desc || []).reduce((s, d) => s + Math.abs(Number(d) || 0), 0);
    const desc_kg_hist = kg_hist > 0 ? desc_hist / kg_hist : 0;

    const kg_mes_anterior = kgAnteriorByClient.get(cliente) || 0;
    const desc_monto_ant = descAnteriorByClient.get(cliente) || 0;
    const desc_kg_anterior = kg_mes_anterior > 0 ? desc_monto_ant / kg_mes_anterior : 0;
    const ingreso_anterior = Math.max(0, kg_mes_anterior * (margenAnterior - Math.abs(desc_kg_anterior)));

    let kg_mes_real = 0;
    const firstDayIdx = Math.round((new Date(firstDayMes) - new Date(startStr)) / 86400000);
    const lastDateIdx = Math.round((new Date(lastDateStr) - new Date(startStr)) / 86400000);
    const effectiveLastDateIdx = Math.round((new Date(effectiveLastDateStr) - new Date(startStr)) / 86400000);
    const lastIdxReal = Math.min(lastDateIdx, effectiveLastDateIdx >= 0 ? effectiveLastDateIdx : lastDateIdx);
    for (let i = firstDayIdx; i <= lastIdxReal && i < kgSeries.length; i++) {
      if (i >= 0) kg_mes_real += kgSeries[i] || 0;
    }

    const hasActivity = kg_mes_real > 0 || sumLastN(kgSeries, 14) > 0;
    let kg_mes_forecast = kg_mes_real;
    if (lastDateStr < endMesStr && hasActivity) {
      const extraKg = projectKgToMonthEnd(kgSeries, startStr, lastDateStr, endMesStr);
      const scale = state === "Activo" ? 1 : state === "Latente" ? 0.35 : 0.2;
      kg_mes_forecast = kg_mes_real + extraKg * scale;
    }

    const ingreso_forecast = Math.max(0, kg_mes_forecast * (margen - Math.abs(desc_kg_hist)));
    const delta_kg = kg_mes_forecast - kg_mes_anterior;
    const delta_ingreso = ingreso_forecast - ingreso_anterior;

    const es_dejaron = ingreso_anterior > 0 && ingreso_forecast <= 0 && kg_mes_real <= 0;
    const es_nuevo = ingreso_anterior <= 0 && ingreso_forecast > 0;
    const es_aumentaron = ingreso_anterior > 0 && ingreso_forecast > 0 && delta_ingreso > 0;
    const es_disminuyeron = ingreso_anterior > 0 && ingreso_forecast > 0 && delta_ingreso < 0;

    const last4Weeks = [];
    const numLast = Math.min(28, kgSeries.length);
    for (let i = kgSeries.length - numLast; i < kgSeries.length; i++) {
      if (i >= 0) {
        const d = new Date(startStr);
        d.setDate(d.getDate() + i);
        const kgVal = Number(kgSeries[i]) || 0;
        if (kgVal > 0) last4Weeks.push({ fecha: dateToStr(d), kg: kgVal });
      }
    }

    const lastPurchaseDateReal = lastPurchaseDateByClient.get(cliente) || null;
    const daysSinceLastReal = lastPurchaseDateReal
      ? Math.round((lastDate - new Date(lastPurchaseDateReal)) / 86400000)
      : null;

    rows.push({
      cliente,
      canal: rec.canal,
      subcanal: rec.subcanal,
      estado: state,
      kgSeries: rec.kg || [],
      descSeries: rec.desc || [],
      freqDays: freq,
      daysSinceLast: daysSince,
      lastPurchaseDate: lastPurchaseDateReal,
      daysSinceLastReal,
      historyLast4Weeks: last4Weeks,
      kg_hist,
      desc_kg_hist,
      kg_mes_anterior,
      kg_mes_real,
      kg_mes_forecast,
      ingreso_anterior,
      ingreso_forecast,
      delta_kg,
      delta_ingreso,
      es_dejaron,
      es_nuevo,
      es_aumentaron,
      es_disminuyeron,
    });
  }

  try {
    await client.query(
      `DELETE FROM arr.dicf_cliente_mes WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1)) AND year = $2 AND month = $3`,
      [canonicalPlantCode, year, month]
    );
    const insertText = `
      INSERT INTO arr.dicf_cliente_mes (
        plant_code, year, month, cliente_norm, canal, subcanal, estado, window_days, last_date,
        freq_days, days_since_last, kg_hist, desc_hist, desc_kg_hist, kg_mes_real, kg_mes_forecast,
        margen_mes_kg, ingreso_forecast, es_nuevo, es_recuperable
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    `;
    for (const r of rows) {
      await client.query(insertText, [
        canonicalPlantCode,
        year,
        month,
        r.cliente,
        r.canal,
        r.subcanal,
        r.estado,
        window_days,
        lastDateStr,
        Number.isFinite(r.freqDays) ? r.freqDays : null,
        Number.isFinite(r.daysSinceLast) ? r.daysSinceLast : null,
        r.kg_hist,
        r.desc_kg_hist * r.kg_hist,
        r.desc_kg_hist,
        r.kg_mes_real,
        r.kg_mes_forecast,
        margen,
        r.ingreso_forecast,
        r.es_nuevo || false,
        r.es_dejaron || false,
      ]);
    }
  } catch (e) {
    console.warn("dicf_cliente_mes cache error:", e.message);
  }

  const fmtMxn = (m) => (m != null && !Number.isNaN(m) ? m.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "$0");
  const fmtTon = (kg) => (kg != null && !Number.isNaN(kg) ? (Number(kg) / 1000).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0");
  const periodoMes = `${year}-${String(month).padStart(2, "0")}`;

  const build = (filterFn, sortFn, totalReduceKg, totalReduceIngreso, mapCliente) => {
    const candidatos = rows.filter(filterFn).sort(sortFn);
    const totalKg = candidatos.reduce(totalReduceKg, 0);
    const totalIngreso = candidatos.reduce(totalReduceIngreso, 0);
    const clientes = candidatos.map(mapCliente);
    return {
      totalDeltaKgStr: fmtTon(totalKg),
      totalDeltaIngresoStr: fmtMxn(totalIngreso),
      clientes,
    };
  };

  const dejaron = build(
    (r) => r.es_dejaron,
    (a, b) => (b.ingreso_anterior || 0) - (a.ingreso_anterior || 0),
    (sum, r) => sum + (r.kg_mes_anterior != null ? Number(r.kg_mes_anterior) : 0),
    (sum, r) => sum + (r.ingreso_anterior != null ? Number(r.ingreso_anterior) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: (r.freqDays != null && Number.isFinite(r.freqDays)) ? r.freqDays : 9999,
      daysSinceLast: (r.daysSinceLast != null && Number.isFinite(r.daysSinceLast)) ? r.daysSinceLast : window_days,
      lastPurchaseDate: r.lastPurchaseDate || null,
      daysSinceLastReal: (r.daysSinceLastReal != null && Number.isFinite(r.daysSinceLastReal)) ? r.daysSinceLastReal : null,
      historyLast4Weeks: Array.isArray(r.historyLast4Weeks) ? r.historyLast4Weeks : [],
      kgAStr: fmtTon(r.kg_mes_anterior),
      kgBStr: "0.0",
      deltaKgStr: fmtTon(-(r.kg_mes_anterior || 0)),
      ingresoAStr: fmtMxn(r.ingreso_anterior),
      ingresoBStr: "$0",
      deltaIngresoStr: fmtMxn(-(r.ingreso_anterior || 0)),
    })
  );

  const nuevos = build(
    (r) => r.es_nuevo,
    (a, b) => (b.ingreso_forecast || 0) - (a.ingreso_forecast || 0),
    (sum, r) => sum + (r.kg_mes_forecast != null ? Number(r.kg_mes_forecast) : 0),
    (sum, r) => sum + (r.ingreso_forecast != null ? Number(r.ingreso_forecast) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: (r.freqDays != null && Number.isFinite(r.freqDays)) ? r.freqDays : 9999,
      daysSinceLast: (r.daysSinceLast != null && Number.isFinite(r.daysSinceLast)) ? r.daysSinceLast : 0,
      lastPurchaseDate: r.lastPurchaseDate || null,
      daysSinceLastReal: (r.daysSinceLastReal != null && Number.isFinite(r.daysSinceLastReal)) ? r.daysSinceLastReal : null,
      historyLast4Weeks: Array.isArray(r.historyLast4Weeks) ? r.historyLast4Weeks : [],
      kgAStr: "0.0",
      kgBStr: fmtTon(r.kg_mes_forecast),
      deltaKgStr: fmtTon(r.kg_mes_forecast || 0),
      ingresoAStr: "$0",
      ingresoBStr: fmtMxn(r.ingreso_forecast),
      deltaIngresoStr: fmtMxn(r.ingreso_forecast),
    })
  );

  const aumentaron = build(
    (r) => r.es_aumentaron,
    (a, b) => (b.delta_ingreso || 0) - (a.delta_ingreso || 0),
    (sum, r) => sum + (r.delta_kg != null ? Number(r.delta_kg) : 0),
    (sum, r) => sum + (r.delta_ingreso != null ? Number(r.delta_ingreso) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: (r.freqDays != null && Number.isFinite(r.freqDays)) ? r.freqDays : 9999,
      daysSinceLast: (r.daysSinceLast != null && Number.isFinite(r.daysSinceLast)) ? r.daysSinceLast : 0,
      lastPurchaseDate: r.lastPurchaseDate || null,
      daysSinceLastReal: (r.daysSinceLastReal != null && Number.isFinite(r.daysSinceLastReal)) ? r.daysSinceLastReal : null,
      historyLast4Weeks: Array.isArray(r.historyLast4Weeks) ? r.historyLast4Weeks : [],
      kgAStr: fmtTon(r.kg_mes_anterior),
      kgBStr: fmtTon(r.kg_mes_forecast),
      deltaKgStr: fmtTon(r.delta_kg),
      ingresoAStr: fmtMxn(r.ingreso_anterior),
      ingresoBStr: fmtMxn(r.ingreso_forecast),
      deltaIngresoStr: fmtMxn(r.delta_ingreso),
    })
  );

  const disminuyeron = build(
    (r) => r.es_disminuyeron,
    (a, b) => (a.delta_ingreso || 0) - (b.delta_ingreso || 0),
    (sum, r) => sum + (r.delta_kg != null ? Number(r.delta_kg) : 0),
    (sum, r) => sum + (r.delta_ingreso != null ? Number(r.delta_ingreso) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: (r.freqDays != null && Number.isFinite(r.freqDays)) ? r.freqDays : 9999,
      daysSinceLast: (r.daysSinceLast != null && Number.isFinite(r.daysSinceLast)) ? r.daysSinceLast : 0,
      lastPurchaseDate: r.lastPurchaseDate || null,
      daysSinceLastReal: (r.daysSinceLastReal != null && Number.isFinite(r.daysSinceLastReal)) ? r.daysSinceLastReal : null,
      historyLast4Weeks: Array.isArray(r.historyLast4Weeks) ? r.historyLast4Weeks : [],
      kgAStr: fmtTon(r.kg_mes_anterior),
      kgBStr: fmtTon(r.kg_mes_forecast),
      deltaKgStr: fmtTon(r.delta_kg),
      ingresoAStr: fmtMxn(r.ingreso_anterior),
      ingresoBStr: fmtMxn(r.ingreso_forecast),
      deltaIngresoStr: fmtMxn(r.delta_ingreso),
    })
  );

  const byCategoria = new Map();
  for (const r of rows) {
    const key = `${r.canal}|${r.subcanal}`;
    if (!byCategoria.has(key)) byCategoria.set(key, { canal: r.canal, subcanal: r.subcanal, dejaron: [], nuevos: [], aumentaron: [], disminuyeron: [] });
    const cat = byCategoria.get(key);
    if (r.es_dejaron) cat.dejaron.push(r);
    else if (r.es_nuevo) cat.nuevos.push(r);
    else if (r.es_aumentaron) cat.aumentaron.push(r);
    else if (r.es_disminuyeron) cat.disminuyeron.push(r);
  }
  const byCategoriaArr = [];
  for (const [, cat] of byCategoria) {
    const sumDejaronKg = cat.dejaron.reduce((s, r) => s + (r.kg_mes_anterior || 0), 0);
    const sumDejaronIng = cat.dejaron.reduce((s, r) => s + (r.ingreso_anterior || 0), 0);
    const sumNuevosKg = cat.nuevos.reduce((s, r) => s + (r.kg_mes_forecast || 0), 0);
    const sumNuevosIng = cat.nuevos.reduce((s, r) => s + (r.ingreso_forecast || 0), 0);
    const sumAumKg = cat.aumentaron.reduce((s, r) => s + (r.delta_kg || 0), 0);
    const sumAumIng = cat.aumentaron.reduce((s, r) => s + (r.delta_ingreso || 0), 0);
    const sumDisKg = cat.disminuyeron.reduce((s, r) => s + (r.delta_kg || 0), 0);
    const sumDisIng = cat.disminuyeron.reduce((s, r) => s + (r.delta_ingreso || 0), 0);
    byCategoriaArr.push({
      canal: cat.canal,
      subcanal: cat.subcanal,
      dejaron: {
        count: cat.dejaron.length,
        totalDeltaKgStr: fmtTon(sumDejaronKg),
        totalDeltaIngresoStr: fmtMxn(sumDejaronIng),
      },
      nuevos: {
        count: cat.nuevos.length,
        totalDeltaKgStr: fmtTon(sumNuevosKg),
        totalDeltaIngresoStr: fmtMxn(sumNuevosIng),
      },
      aumentaron: {
        count: cat.aumentaron.length,
        totalDeltaKgStr: fmtTon(sumAumKg),
        totalDeltaIngresoStr: fmtMxn(sumAumIng),
      },
      disminuyeron: {
        count: cat.disminuyeron.length,
        totalDeltaKgStr: fmtTon(Math.abs(sumDisKg)),
        totalDeltaIngresoStr: fmtMxn(Math.abs(sumDisIng)),
      },
    });
  }

  const EXCEL_DAYS = 30;
  const startIdx = Math.max(0, nDays - EXCEL_DAYS);
  const excelDates = [];
  for (let i = startIdx; i < nDays; i++) {
    const d = new Date(startStr);
    d.setDate(d.getDate() + i);
    excelDates.push(dateToStr(d));
  }
  const excelClientes = rows.map((r) => {
    const kgArr = (r.kgSeries || []).slice(startIdx, nDays);
    const descArr = (r.descSeries || []).slice(startIdx, nDays);
    const kgLast30 = kgArr.map((k) => (Number(k) || 0) / 1000);
    const descKgLast30 = kgArr.map((k, i) => {
      const kg = Number(k) || 0;
      const desc = Number(descArr[i]) || 0;
      return kg > 0 ? Math.abs(desc) / kg : null;
    });
    let estadoLabel = r.estado || "";
    if (r.es_dejaron) estadoLabel = "Dejaron de comprar";
    else if (r.es_nuevo) estadoLabel = "Nuevo";
    else if (r.es_aumentaron) estadoLabel = "Aumentaron";
    else if (r.es_disminuyeron) estadoLabel = "Disminuyeron";
    return {
      cliente: r.cliente,
      estado: estadoLabel,
      kgLast30,
      descKgLast30,
    };
  });

  return {
    planta: plantaNombre || plantCode,
    last_date: lastDateStr,
    window_days,
    periodoMes,
    margenStr: margen != null && !Number.isNaN(margen) ? `${margen.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/kg` : "0.00 $/kg",
    dejaron,
    nuevos,
    aumentaron,
    disminuyeron,
    byCategoria: byCategoriaArr,
    excelData: {
      dates: excelDates,
      margen: margen != null && Number.isFinite(margen) ? margen : 0,
      clientes: excelClientes,
    },
  };
}

/**
 * Excel DICF: SIEMPRE últimos 30 días reales (last_date - 29 .. last_date),
 * independiente de window_days. Reutiliza el estatus por cliente del computeDicf.
 */
async function computeDicfExcel(client, plantCode, plantaNombre, getMargenKg) {
  const base = await computeDicf(client, plantCode, plantaNombre, getMargenKg);
  if (!base || !base.last_date) {
    return {
      planta: (plantaNombre || plantCode || "").trim(),
      last_date: null,
      periodoMes: null,
      excelData: { dates: [], margen: 0, clientes: [] },
    };
  }

  const lastDate = new Date(String(base.last_date).slice(0, 10));
  if (isNaN(lastDate.getTime())) {
    return {
      planta: (plantaNombre || plantCode || "").trim(),
      last_date: null,
      periodoMes: base.periodoMes || null,
      excelData: { dates: [], margen: 0, clientes: [] },
    };
  }
  const excelDays = Math.max(1, Math.min(365, parseInt(String(base.window_days ?? 30), 10) || 30));
  const start30 = new Date(lastDate);
  start30.setDate(start30.getDate() - (excelDays - 1));
  const start30Str = dateToStr(start30);
  const lastDateStr = dateToStr(lastDate);

  const dates = [];
  for (let i = 0; i < excelDays; i++) {
    const d = new Date(start30);
    d.setDate(d.getDate() + i);
    dates.push(dateToStr(d));
  }

  const plantaParam = (plantaNombre || plantCode || "").trim();

  // Intentar por provincia (mismo criterio que computeDicf); si no hay nada, fallback directo por plant_code.
  let ventasRows = [];
  let descRows = [];
  try {
    const ventasProv = await client.query(
      `${PROV_MAP_CTE}
       SELECT v.fecha, v.cliente_norm, SUM(v.kg) AS kg
         FROM arr.ventas_diarias_cliente v
         JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
                         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
        WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
          AND v.fecha >= $2::date AND v.fecha <= $3::date
        GROUP BY v.fecha, v.cliente_norm`,
      [plantaParam, start30Str, lastDateStr]
    );
    ventasRows = ventasProv.rows || [];

    const descProv = await client.query(
      `${PROV_MAP_CTE}
       SELECT d.fecha, d.cliente_norm, SUM(d.monto) AS monto
         FROM arr.descuentos_diarios_cliente d
         JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
                         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
        WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
          AND d.fecha >= $2::date AND d.fecha <= $3::date
        GROUP BY d.fecha, d.cliente_norm`,
      [plantaParam, start30Str, lastDateStr]
    );
    descRows = descProv.rows || [];
  } catch (e) {
    ventasRows = [];
    descRows = [];
  }

  if (!ventasRows.length && !descRows.length) {
    try {
      const ventasDirect = await client.query(
        `SELECT fecha, cliente_norm, SUM(kg) AS kg
           FROM arr.ventas_diarias_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
            AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY fecha, cliente_norm`,
        [plantaParam, start30Str, lastDateStr]
      );
      ventasRows = ventasDirect.rows || [];
      const descDirect = await client.query(
        `SELECT fecha, cliente_norm, SUM(monto) AS monto
           FROM arr.descuentos_diarios_cliente
          WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
            AND fecha >= $2::date AND fecha <= $3::date
          GROUP BY fecha, cliente_norm`,
        [plantaParam, start30Str, lastDateStr]
      );
      descRows = descDirect.rows || [];
    } catch (e) {
      ventasRows = [];
      descRows = [];
    }
  }

  const idxByDate = new Map(dates.map((d, i) => [d, i]));
  const kgByClient = new Map();
  for (const r of ventasRows) {
    const c = r.cliente_norm;
    if (!c) continue;
    const f = toDateKey(r.fecha);
    if (!f) continue;
    const idx = idxByDate.get(f);
    if (idx == null) continue;
    if (!kgByClient.has(c)) kgByClient.set(c, new Array(excelDays).fill(0));
    kgByClient.get(c)[idx] += Number(r.kg || 0);
  }
  const descByClient = new Map();
  for (const r of descRows) {
    const c = r.cliente_norm;
    if (!c) continue;
    const f = toDateKey(r.fecha);
    if (!f) continue;
    const idx = idxByDate.get(f);
    if (idx == null) continue;
    if (!descByClient.has(c)) descByClient.set(c, new Array(excelDays).fill(0));
    descByClient.get(c)[idx] += Number(r.monto || 0);
  }

  const clientesBase = (base.excelData && Array.isArray(base.excelData.clientes)) ? base.excelData.clientes : [];
  const clientesOut = clientesBase.map((c) => {
    const key = c.cliente;
    const kgArr = kgByClient.get(key) || new Array(excelDays).fill(0);
    const descArr = descByClient.get(key) || new Array(excelDays).fill(0);
    const kgLast30 = kgArr.map((kg) => (Number(kg) || 0) / 1000);
    const descKgLast30 = kgArr.map((kg, i) => {
      const k = Number(kg) || 0;
      const m = Number(descArr[i]) || 0;
      return k > 0 ? Math.abs(m) / k : null;
    });
    return { ...c, kgLast30, descKgLast30 };
  });

  return {
    planta: base.planta,
    last_date: base.last_date,
    periodoMes: base.periodoMes,
    excelData: {
      dates,
      margen: base.excelData?.margen != null && Number.isFinite(base.excelData.margen) ? base.excelData.margen : 0,
      clientes: clientesOut,
    },
  };
}

module.exports = {
  computeDicf,
  computeDicfExcel,
  WINDOW_DAYS,
};
