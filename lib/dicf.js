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

function clientState(series, freq, daysSince) {
  const s14 = sumLastN(series, SUM_LAST_14_FOR_INACTIVE);
  if (s14 === 0) return { state: "Inactivo", atten: 0 };
  if (freq >= 9999) return { state: "Inactivo", atten: 0 };
  if (daysSince <= 1.5 * freq) return { state: "Activo", atten: 1 };
  if (daysSince <= 3 * freq) return { state: "Latente", atten: 0.2 };
  return { state: "Inactivo", atten: 0 };
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
  const year = lastDate.getFullYear();
  const month = lastDate.getMonth() + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endMesStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
  const firstDayMes = `${year}-${String(month).padStart(2, "0")}-01`;

  const windowStart = new Date(lastDate);
  windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
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
           FROM arr.descuentos_diarias_cliente d
           JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
                           OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
          WHERE (pm.prov_name = $1 OR UPPER(TRIM(pm.prov_name)) = UPPER(TRIM($1)))
            AND d.fecha >= $2::date AND d.fecha <= $3::date
          GROUP BY d.fecha, d.cliente_norm`,
        [plantaParam, startStr, lastDateStr]
      )
    : await client.query(
        `SELECT fecha, cliente_norm, SUM(monto) AS monto
           FROM arr.descuentos_diarias_cliente
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

  const margen = (await getMargenKg(client, plantaNombre || plantCode, year, month)) ?? 0;
  const daysInMonth = lastDayOfMonth;

  const rows = [];
  const allClientes = new Set(seriesByClient.keys());

  for (const cliente of allClientes) {
    const rec = seriesByClient.get(cliente) || { kg: [], desc: [], canal: "Casa", subcanal: "" };
    const kgSeries = rec.kg.length ? rec.kg : [];
    const freq = medianGapFromSeries(kgSeries);
    const daysSince = daysSinceLastFromSeries(kgSeries);
    const { state, atten } = clientState(kgSeries, freq, daysSince);

    const kg_hist = kgSeries.reduce((s, k) => s + (Number(k) || 0), 0);
    const desc_hist = (rec.desc || []).reduce((s, d) => s + Math.abs(Number(d) || 0), 0);
    const desc_kg_hist = kg_hist > 0 ? desc_hist / kg_hist : 0;

    let kg_mes_real = 0;
    const firstDayIdx = Math.round((new Date(firstDayMes) - new Date(startStr)) / 86400000);
    const lastDateIdx = Math.round((new Date(lastDateStr) - new Date(startStr)) / 86400000);
    for (let i = firstDayIdx; i <= lastDateIdx && i < kgSeries.length; i++) {
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

    const kg_esperado_mes = kg_hist > 0 ? (kg_hist / WINDOW_DAYS) * daysInMonth : 0;
    const ingreso_esperado = kg_esperado_mes * (margen - Math.abs(desc_kg_hist));
    const delta_ingreso = ingreso_forecast - ingreso_esperado;

    const umbral_pct_pos = 0;
    const umbral_pct_neg = 0;
    const min_kg_dejaron = 1;
    const es_dejaron = kg_hist >= min_kg_dejaron && kg_mes_forecast <= 0;
    const es_nuevo = kg_hist < min_kg_dejaron && kg_mes_forecast > 0;
    const es_aumentaron = ingreso_esperado > 0 && ingreso_forecast > 0 && delta_ingreso > ingreso_esperado * umbral_pct_pos;
    const es_disminuyeron = ingreso_esperado > 0 && ingreso_forecast >= 0 && delta_ingreso < -ingreso_esperado * umbral_pct_neg;

    rows.push({
      cliente,
      canal: rec.canal,
      subcanal: rec.subcanal,
      estado: state,
      freqDays: freq,
      daysSinceLast: daysSince,
      kg_hist,
      desc_kg_hist,
      kg_mes_real,
      kg_mes_forecast,
      ingreso_forecast,
      ingreso_esperado,
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
        WINDOW_DAYS,
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
  const periodoMes = `${year}-${String(month).padStart(2, "0")}`;

  const build = (filterFn, sortFn, totalReduce, mapCliente) => {
    const candidatos = rows.filter(filterFn).sort(sortFn);
    const total = candidatos.reduce(totalReduce, 0);
    const clientes = candidatos.map(mapCliente);
    return {
      totalDeltaIngresoStr: fmtMxn(Math.abs(total)),
      clientes,
    };
  };

  const dejaron = build(
    (r) => r.es_dejaron,
    (a, b) => (b.ingreso_esperado || 0) - (a.ingreso_esperado || 0),
    (sum, r) => sum + (r.ingreso_esperado != null ? Number(r.ingreso_esperado) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: r.freqDays,
      daysSinceLast: r.daysSinceLast,
      ingresoAStr: fmtMxn(r.ingreso_esperado),
      ingresoBStr: "$0",
      deltaIngresoStr: fmtMxn(-(r.ingreso_esperado || 0)),
    })
  );

  const nuevos = build(
    (r) => r.es_nuevo,
    (a, b) => (b.ingreso_forecast || 0) - (a.ingreso_forecast || 0),
    (sum, r) => sum + (r.ingreso_forecast != null ? Number(r.ingreso_forecast) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: r.freqDays,
      daysSinceLast: r.daysSinceLast,
      ingresoAStr: "$0",
      ingresoBStr: fmtMxn(r.ingreso_forecast),
      deltaIngresoStr: fmtMxn(r.ingreso_forecast),
    })
  );

  const aumentaron = build(
    (r) => r.es_aumentaron,
    (a, b) => (b.delta_ingreso || 0) - (a.delta_ingreso || 0),
    (sum, r) => sum + (r.delta_ingreso != null ? Number(r.delta_ingreso) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: r.freqDays,
      daysSinceLast: r.daysSinceLast,
      ingresoAStr: fmtMxn(r.ingreso_esperado),
      ingresoBStr: fmtMxn(r.ingreso_forecast),
      deltaIngresoStr: fmtMxn(r.delta_ingreso),
    })
  );

  const disminuyeron = build(
    (r) => r.es_disminuyeron,
    (a, b) => (a.delta_ingreso || 0) - (b.delta_ingreso || 0),
    (sum, r) => sum + (r.delta_ingreso != null ? -Number(r.delta_ingreso) : 0),
    (r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: r.freqDays,
      daysSinceLast: r.daysSinceLast,
      ingresoAStr: fmtMxn(r.ingreso_esperado),
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
    byCategoriaArr.push({
      canal: cat.canal,
      subcanal: cat.subcanal,
      dejaron: {
        count: cat.dejaron.length,
        totalDeltaIngresoStr: fmtMxn(cat.dejaron.reduce((s, r) => s + (r.ingreso_esperado || 0), 0)),
      },
      nuevos: {
        count: cat.nuevos.length,
        totalDeltaIngresoStr: fmtMxn(cat.nuevos.reduce((s, r) => s + (r.ingreso_forecast || 0), 0)),
      },
      aumentaron: {
        count: cat.aumentaron.length,
        totalDeltaIngresoStr: fmtMxn(cat.aumentaron.reduce((s, r) => s + (r.delta_ingreso || 0), 0)),
      },
      disminuyeron: {
        count: cat.disminuyeron.length,
        totalDeltaIngresoStr: fmtMxn(Math.abs(cat.disminuyeron.reduce((s, r) => s + (r.delta_ingreso || 0), 0))),
      },
    });
  }

  return {
    planta: plantaNombre || plantCode,
    last_date: lastDateStr,
    window_days: WINDOW_DAYS,
    periodoMes,
    margenStr: margen != null && !Number.isNaN(margen) ? `${margen.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/kg` : "0.00 $/kg",
    dejaron,
    nuevos,
    aumentaron,
    disminuyeron,
    byCategoria: byCategoriaArr,
  };
}

module.exports = {
  computeDicf,
  WINDOW_DAYS,
};
