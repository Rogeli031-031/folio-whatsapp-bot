"use strict";

const LOOKBACK_DAYS = 120;
const HALF_LIFE_WEEKS = 3;
const SUM_LAST_14_FOR_INACTIVE = 14;

/**
 * Delta Ingreso Forecast: ingreso A = real mes anterior; ingreso B = forecast a cierre (venta proyectada × (margen IGF B − desc $/kg proyectado)).
 * Clasificación: dejaron de comprar, nuevos, aumentaron, disminuyeron. Por planta y canal/subcanal.
 */

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

/** Normaliza nombre cliente para emparejar entre ventas y descuentos (trim, mayúsculas, colapsar espacios). */
function normalizeClienteKey(s) {
  if (s == null || typeof s !== "string") return "";
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Mediana de huecos (días entre compras). Si no hay compras devuelve 9999. */
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

/** Días desde la última compra (índice del último > 0 al final de la serie). */
function daysSinceLastFromSeries(series) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] > 0) return series.length - 1 - i;
  }
  return series.length;
}

/** Suma últimos N días. */
function sumLastN(series, n) {
  const start = Math.max(0, series.length - n);
  let s = 0;
  for (let i = start; i < series.length; i++) s += series[i];
  return s;
}

/** Estado: Activo, Latente, Inactivo. Considera fin de semana (no marcar inactivo solo por no comprar sáb/dom si frecuencia es semanal). */
function clientState(series, freq, daysSince) {
  const s14 = sumLastN(series, SUM_LAST_14_FOR_INACTIVE);
  if (s14 === 0) return { state: "Inactivo", atten: 0 };
  if (freq >= 9999) return { state: "Inactivo", atten: 0 };
  if (daysSince <= 1.5 * freq) return { state: "Activo", atten: 1 };
  if (daysSince <= 3 * freq) return { state: "Latente", atten: 0.2 };
  return { state: "Inactivo", atten: 0 };
}

/**
 * Proyección a cierre de mes: promedio por día de semana (ponderado por recencia) × días restantes por DOW, con tope.
 * @param {number[]} series - kg por día (índice 0 = startDate)
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - último día con dato (max fecha)
 * @param {string} monthEndStr - último día del mes a proyectar
 * @returns {number} kg proyectados desde el día después de endDateStr hasta monthEndStr
 */
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
    const ageDays = (totalDays - 1 - i);
    const w = Math.exp(-lam * ageDays);
    wcnt[dow] += w;
    if (series[i] > 0) wsum[dow] += series[i] * w;
  }

  const avgByDow = wsum.map((s, j) => (wcnt[j] > 0 ? s / wcnt[j] : 0));
  const factorFreq = 1;
  let proj = 0;
  const remStart = new Date(end);
  remStart.setDate(remStart.getDate() + 1);
  for (let d = new Date(remStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    proj += avgByDow[d.getDay()] * factorFreq;
  }

  const last7 = sumLastN(series, 7);
  const last14 = sumLastN(series, 14);
  const cap = last7 > 0 && last14 > 0 ? Math.min(last7, last14 / 2) : (last7 || last14);
  if (cap > 0 && proj > cap) proj = cap;
  return Math.max(0, proj);
}

/**
 * Calcula Delta Ingreso Forecast para una planta.
 * @param {object} client - pg client
 * @param {string} plantCode - código planta en arr (ej. Acapulco, Puebla)
 * @param {number} yearA - mes anterior
 * @param {number} monthA
 * @param {number} yearB - mes forecast (actual)
 * @param {number} monthB
 * @param {function} getMargenKg - (client, plantName, year, month) => Promise<number|null>
 * @param {string} plantaNombre - nombre planta para margen (puede ser igual a plantCode)
 * @returns {Promise<object>} { periodoA, periodoB, margenA, margenB, rows, dejaron, nuevos, aumentaron, disminuyeron, byCategoria }
 */
async function computeDeltaIngresoForecast(client, plantCode, yearA, monthA, yearB, monthB, getMargenKg, plantaNombre) {
  const periodoA = `${yearA}-${String(monthA).padStart(2, "0")}`;
  const periodoB = `${yearB}-${String(monthB).padStart(2, "0")}`;
  const margenA = (await getMargenKg(client, plantaNombre || plantCode, yearA, monthA)) ?? 0;
  const margenB = (await getMargenKg(client, plantaNombre || plantCode, yearB, monthB)) ?? 0;

  const lastDayB = new Date(yearB, monthB, 0).getDate();
  const endMesB = `${yearB}-${String(monthB).padStart(2, "0")}-${String(lastDayB).padStart(2, "0")}`;
  const firstDayB = `${yearB}-${String(monthB).padStart(2, "0")}-01`;

  const today = new Date();
  const todayStr = dateToStr(today);
  const isCurrentMonthB = today.getFullYear() === yearB && today.getMonth() + 1 === monthB;
  const maxFechaStr = isCurrentMonthB ? todayStr : endMesB;

  const lookbackStart = new Date(maxFechaStr + "T12:00:00Z");
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);
  const startStr = dateToStr(lookbackStart);

  const ventas = await client.query(
    `SELECT fecha, cliente_norm, canal, COALESCE(subcanal, '') AS subcanal, SUM(kg) AS kg
     FROM arr.ventas_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date
     GROUP BY fecha, cliente_norm, canal, subcanal`,
    [plantCode, startStr, maxFechaStr]
  );

  const descuentos = await client.query(
    `SELECT fecha, cliente_norm, SUM(monto) AS monto
     FROM arr.descuentos_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date
     GROUP BY fecha, cliente_norm`,
    [plantCode, startStr, maxFechaStr]
  );

  const catMesB = await client.query(
    `SELECT cliente_norm, canal, COALESCE(subcanal, '') AS subcanal
     FROM arr.cliente_categoria_mes
     WHERE plant_code = $1 AND year = $2 AND month = $3`,
    [plantCode, yearB, monthB]
  );
  const catMap = new Map((catMesB.rows || []).map((r) => [r.cliente_norm, { canal: r.canal || "Casa", subcanal: r.subcanal || "" }]));

  const nDays = Math.round((new Date(maxFechaStr) - new Date(startStr)) / 86400000) + 1;
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

  const firstA = `${yearA}-${String(monthA).padStart(2, "0")}-01`;
  const lastDayA = new Date(yearA, monthA, 0).getDate();
  const endMesA = `${yearA}-${String(monthA).padStart(2, "0")}-${String(lastDayA).padStart(2, "0")}`;

  const ventasA = await client.query(
    `SELECT cliente_norm, SUM(kg) AS kg FROM arr.ventas_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date GROUP BY cliente_norm`,
    [plantCode, firstA, endMesA]
  );
  const descA = await client.query(
    `SELECT cliente_norm, SUM(monto) AS monto FROM arr.descuentos_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date GROUP BY cliente_norm`,
    [plantCode, firstA, endMesA]
  );
  const kgAMap = new Map((ventasA.rows || []).map((r) => [r.cliente_norm, Number(r.kg || 0)]));
  const descAMap = new Map();
  for (const r of descA.rows || []) {
    const key = normalizeClienteKey(r.cliente_norm);
    if (!key) continue;
    const monto = Number(r.monto || 0);
    descAMap.set(key, (descAMap.get(key) || 0) + monto);
  }

  const toDateB = isCurrentMonthB ? todayStr : endMesB;
  const ventasB = await client.query(
    `SELECT cliente_norm, SUM(kg) AS kg FROM arr.ventas_diarias_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date GROUP BY cliente_norm`,
    [plantCode, firstDayB, toDateB]
  );
  const descB = await client.query(
    `SELECT cliente_norm, SUM(monto) AS monto FROM arr.descuentos_diarios_cliente
     WHERE plant_code = $1 AND fecha >= $2::date AND fecha <= $3::date GROUP BY cliente_norm`,
    [plantCode, firstDayB, toDateB]
  );
  const kgBRealMap = new Map((ventasB.rows || []).map((r) => [r.cliente_norm, Number(r.kg || 0)]));
  const descBRealMap = new Map((descB.rows || []).map((r) => [r.cliente_norm, Number(r.monto || 0)]));

  const allClientes = new Set([...seriesByClient.keys(), ...kgAMap.keys(), ...kgBRealMap.keys()]);
  const rows = [];

  for (const cliente of allClientes) {
    const rec = seriesByClient.get(cliente) || { kg: [], desc: [], canal: "Casa", subcanal: "" };
    const kgSeries = rec.kg.length ? rec.kg : [];
    const freq = medianGapFromSeries(kgSeries);
    const daysSince = daysSinceLastFromSeries(kgSeries);
    const { state, atten } = clientState(kgSeries, freq, daysSince);

    const historyLast4Weeks = [];
    if (kgSeries.length > 0) {
      const windowDays = 28;
      const startIdx = Math.max(0, kgSeries.length - windowDays);
      for (let i = startIdx; i < kgSeries.length; i++) {
        const kgv = kgSeries[i];
        if (kgv > 0) {
          const d = new Date(startStr);
          d.setDate(d.getDate() + i);
          historyLast4Weeks.push({
            fecha: dateToStr(d),
            kg: kgv,
          });
        }
      }
    }

    const kgA = kgAMap.get(cliente) || 0;
    const kgBReal = kgBRealMap.get(cliente) || 0;
    const descAVal = descAMap.get(normalizeClienteKey(cliente)) ?? descAMap.get(cliente) ?? 0;
    const descBReal = descBRealMap.get(cliente) || 0;

    const descKgA = kgA > 0 ? Math.abs(descAVal) / kgA : 0;
    let descKgBProj = 0;
    let kgBProj = kgBReal;
    const hasActivityB = kgBReal > 0 || sumLastN(kgSeries, 14) > 0;
    const shouldProject = isCurrentMonthB && hasActivityB;
    if (shouldProject) {
      const extraKg = projectKgToMonthEnd(kgSeries, startStr, maxFechaStr, endMesB);
      const scale = state === "Activo" ? 1 : state === "Latente" ? 0.35 : 0.2;
      kgBProj = kgBReal + extraKg * scale;
      const numWithKg = kgSeries.filter((k) => k > 0).length;
      const descRate = numWithKg > 0
        ? kgSeries.reduce((s, k, i) => s + (k > 0 ? Math.abs(rec.desc[i] || 0) / k : 0), 0) / numWithKg
        : (kgBReal > 0 ? Math.abs(descBReal) / kgBReal : descKgA);
      const descProj = descBReal + descRate * (extraKg * scale);
      descKgBProj = kgBProj > 0 ? Math.abs(descProj) / kgBProj : (kgBReal > 0 ? Math.abs(descBReal) / kgBReal : 0);
    } else {
      descKgBProj = kgBReal > 0 ? Math.abs(descBReal) / kgBReal : 0;
    }

    const ingresoA = kgA * (margenA - Math.abs(descKgA));
    const ingresoB = kgBProj * (margenB - Math.abs(descKgBProj));
    const deltaIngreso = ingresoB - ingresoA;

    rows.push({
      cliente,
      canal: rec.canal,
      subcanal: rec.subcanal,
      estado: state,
      freqDays: freq,
      daysSinceLast: daysSince,
      historyLast4Weeks,
      kgA,
      kgB: kgBProj,
      kgBReal,
      descKgA,
      descKgB: descKgBProj,
      ingresoA,
      ingresoB,
      deltaIngreso,
    });
  }

  const fmtMxn = (m) => (m != null && !Number.isNaN(m) ? m.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "$0");
  const fmtKg = (kg) => (kg != null && !Number.isNaN(kg) ? (kg / 1000).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0");
  const fmtDescKg = (r) => (r != null && !Number.isNaN(r) ? `${r.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $/kg` : "0.00 $/kg");

  const build = (filterFn, sortFn, totalReduce) => {
    const candidatos = rows.filter(filterFn).sort(sortFn);
    const totalDeltaIngreso = candidatos.reduce(totalReduce, 0);
    const clientes = candidatos.map((r) => ({
      cliente: r.cliente,
      canal: r.canal,
      subcanal: r.subcanal,
      estado: r.estado,
      freqDays: r.freqDays,
      daysSinceLast: r.daysSinceLast,
      historyLast4Weeks: r.historyLast4Weeks,
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
    }));
    const totalTonA = clientes.reduce((s, c) => s + (c.kgA || 0) / 1000, 0);
    const totalTonB = clientes.reduce((s, c) => s + (c.kgB || 0) / 1000, 0);
    return {
      totalDeltaIngreso,
      totalDeltaIngresoStr: fmtMxn(Math.abs(totalDeltaIngreso)),
      clientes,
      totalTonA,
      totalTonB,
      totalTonAStr: (totalTonA != null && !Number.isNaN(totalTonA) ? totalTonA.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0") + " ton",
      totalTonBStr: (totalTonB != null && !Number.isNaN(totalTonB) ? totalTonB.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0") + " ton",
    };
  };

  const dejaron = build((r) => r.ingresoA > 0 && r.ingresoB <= 0, (a, b) => b.ingresoA - a.ingresoA, (sum, r) => sum + (r.ingresoA != null ? Number(r.ingresoA) : 0));
  const nuevos = build((r) => (r.kgA || 0) <= 0 && (r.kgB || 0) > 0, (a, b) => (b.kgB || 0) - (a.kgB || 0), (sum, r) => sum + (r.ingresoB != null ? Number(r.ingresoB) : 0));
  const aumentaron = build((r) => r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso > 0, (a, b) => b.deltaIngreso - a.deltaIngreso, (sum, r) => sum + (r.deltaIngreso != null ? Number(r.deltaIngreso) : 0));
  const disminuyeron = build((r) => r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso < 0, (a, b) => a.deltaIngreso - b.deltaIngreso, (sum, r) => sum + (r.deltaIngreso != null ? -Number(r.deltaIngreso) : 0));

  const byCategoria = new Map();
  for (const r of rows) {
    const key = `${r.canal}|${r.subcanal}`;
    if (!byCategoria.has(key)) byCategoria.set(key, { canal: r.canal, subcanal: r.subcanal, dejaron: [], nuevos: [], aumentaron: [], disminuyeron: [] });
    const cat = byCategoria.get(key);
    if (r.ingresoA > 0 && r.ingresoB <= 0) cat.dejaron.push(r);
    else if ((r.kgA || 0) <= 0 && (r.kgB || 0) > 0) cat.nuevos.push(r);
    else if (r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso > 0) cat.aumentaron.push(r);
    else if (r.ingresoA > 0 && r.ingresoB > 0 && r.deltaIngreso < 0) cat.disminuyeron.push(r);
  }

  const byCategoriaArr = [];
  for (const [key, cat] of byCategoria) {
    byCategoriaArr.push({
      canal: cat.canal,
      subcanal: cat.subcanal,
      dejaron: { count: cat.dejaron.length, totalDeltaIngresoStr: fmtMxn(cat.dejaron.reduce((s, r) => s + (r.ingresoA || 0), 0)) },
      nuevos: { count: cat.nuevos.length, totalDeltaIngresoStr: fmtMxn(cat.nuevos.reduce((s, r) => s + (r.ingresoB || 0), 0)) },
      aumentaron: { count: cat.aumentaron.length, totalDeltaIngresoStr: fmtMxn(cat.aumentaron.reduce((s, r) => s + (r.deltaIngreso || 0), 0)) },
      disminuyeron: { count: cat.disminuyeron.length, totalDeltaIngresoStr: fmtMxn(Math.abs(cat.disminuyeron.reduce((s, r) => s + (r.deltaIngreso || 0), 0))) },
    });
  }

  return {
    planta: plantCode,
    periodoA,
    periodoB,
    margenA,
    margenB,
    margenAStr: fmtDescKg(margenA),
    margenBStr: fmtDescKg(margenB),
    rows,
    dejaron,
    nuevos,
    aumentaron,
    disminuyeron,
    byCategoria: byCategoriaArr,
  };
}

module.exports = {
  computeDeltaIngresoForecast,
  LOOKBACK_DAYS,
};
