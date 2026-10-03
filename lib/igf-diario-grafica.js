"use strict";

const { totalMesMarginAndHg } = require("./igf-diario-puebla");

/**
 * Serie de rentabilidad IGF Diario para la gráfica.
 * AF = RESULTADO (MXN). AE = RESULTADO POR KG.
 * La semana usa SUM(AF) / SUM(B), no el promedio de los AE diarios.
 * Read-only. No Excel de salida, no OpenAI, no DDL.
 */

const { addDaysYmd, businessTodayYmd } = require("./director-ia-daily-deviation");
const { SQL_PROV_MAP, newClientEvents, maxEligibleInsightYmd } = require("./igf-diario-daily-insights");
const { monthBusinessDays, weeksOf } = require("./igf-diario-puebla");

const RANGES = Object.freeze(["1d", "5d", "1m", "3m", "ytd", "1a", "5a", "todo"]);
const QUERIES_PER_PLANT = 2;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function monthEnd(year, month) {
  return ymd(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nonZero(value) {
  const n = num(value);
  return n != null && n !== 0 ? n : null;
}

function sumNums(values) {
  const nums = (values || []).filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0);
}

function linearTrendIndexed(pairs) {
  const usable = (pairs || []).filter((pair) => pair && Number.isFinite(pair.x) && Number.isFinite(pair.y));
  const n = usable.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const pair of usable) {
    sumX += pair.x;
    sumY += pair.y;
    sumXY += pair.x * pair.y;
    sumXX += pair.x * pair.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const xs = usable.map((pair) => pair.x);
  return { a, b, xFirst: Math.min(...xs), xLast: Math.max(...xs) };
}

function linearTrend(values) {
  return linearTrendIndexed((values || []).map((y, x) => ({ x, y })));
}

function normalizeRange(range) {
  const id = String(range || "1m").trim().toLowerCase();
  return RANGES.includes(id) ? id : "1m";
}

function rangeWindow(endYmd, range, firstYmd) {
  const end = String(endYmd || "").slice(0, 10);
  const id = normalizeRange(range);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return { desde: null, hasta: null, range: id };
  if (id === "todo") {
    return { desde: firstYmd && firstYmd < end ? firstYmd : end, hasta: end, range: id };
  }
  if (id === "1d") return { desde: end, hasta: end, range: id };
  if (id === "5d") return { desde: addDaysYmd(end, -4), hasta: end, range: id };
  if (id === "1m") return { desde: addDaysYmd(end, -29), hasta: end, range: id };
  if (id === "3m") return { desde: addDaysYmd(end, -89), hasta: end, range: id };
  if (id === "ytd") return { desde: `${end.slice(0, 4)}-01-01`, hasta: end, range: id };
  if (id === "1a") return { desde: addDaysYmd(end, -364), hasta: end, range: id };
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCFullYear(start.getUTCFullYear() - 5);
  const desde = `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`;
  return { desde, hasta: end, range: id };
}

function monthsTouched(desde, hasta) {
  const out = [];
  if (!desde || !hasta) return out;
  let year = Number(desde.slice(0, 4));
  let month = Number(desde.slice(5, 7));
  const endKey = hasta.slice(0, 7);
  while (`${year}-${pad2(month)}` <= endKey) {
    out.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

/**
 * Un día de planta. Los importes ya resueltos (incluido carry) entran como costoKg/fleteKg.
 * AE = AA + AC. AF = AE * B. Igual que las columnas del IGF Diario.
 */
function computePlantDay(input) {
  const missing = [];
  const venta = num(input && input.ventaKg);
  const precio = num(input && input.precio);
  const costo = num(input && input.costoKg);
  const flete = num(input && input.fleteKg);
  const hg = num(input && input.hgImporte);
  const cd = num(input && input.cdKg);
  const corp = num(input && input.corporativos);
  const oper = num(input && input.operativos);
  const habiles = Number(input && input.habiles);
  const inhabil = Boolean(input && input.inhabil);
  if (venta == null) missing.push("VENTA");
  if (precio == null) missing.push("PRECIO");
  if (costo == null) missing.push("COSTO");
  if (flete == null) missing.push("FLETE");
  if (hg == null) missing.push("HG");
  if (cd == null) missing.push("C&D");
  let corpKg = null;
  let operKg = null;
  if (!inhabil) {
    if (corp == null) missing.push("CORPORATIVO");
    if (oper == null) missing.push("OPERATIVO");
    if (corp != null && habiles > 0 && venta != null && venta !== 0) corpKg = corp / habiles / venta;
    if (oper != null && habiles > 0 && venta != null && venta !== 0) operKg = oper / habiles / venta;
  }
  const margen = precio != null && costo != null && flete != null ? precio - costo - flete : null;
  const despuesCorp = inhabil ? margen : margen != null && corpKg != null ? margen - corpKg : null;
  const despuesOper = inhabil ? despuesCorp : despuesCorp != null && operKg != null ? despuesCorp - operKg : null;
  const hgKg = hg != null && venta != null && venta !== 0 ? hg / venta : null;
  const aa = despuesOper != null && hgKg != null ? despuesOper - hgKg : null;
  const ae = aa != null && cd != null ? aa + cd : null;
  const af = ae != null && venta != null ? ae * venta : null;
  return {
    venta_kg: venta,
    margen,
    hg_kg: hgKg,
    resultado_mxn: af,
    resultado_per_kg: ae,
    missing_components: missing,
    complete: missing.length === 0 && af != null && ae != null,
  };
}

function resolveCarry(days, corteYmd, seed) {
  let lastCosto = nonZero(seed && seed.costoKg);
  let lastFlete = nonZero(seed && seed.fleteKg);
  const corte = String(corteYmd || "").slice(0, 10);
  return (days || []).map((day) => {
    const historical = !corte || day.fecha < corte;
    const ownCosto = nonZero(day.costoKg);
    const ownFlete = nonZero(day.fleteKg);
    const costoKg = ownCosto != null ? ownCosto : historical ? lastCosto : null;
    const fleteKg = ownFlete != null ? ownFlete : historical ? lastFlete : null;
    if (costoKg != null && costoKg !== 0) lastCosto = costoKg;
    if (fleteKg != null && fleteKg !== 0) lastFlete = fleteKg;
    return { ...day, costoKg, fleteKg };
  });
}

function applyDay1CostFallback(days, seed) {
  if (!days || !days.length) return days || [];
  const first = { ...days[0] };
  const second = days[1];
  const seeded = nonZero(seed && seed.costoKg) != null;
  if (!seeded && nonZero(first.costoKg) == null && second && nonZero(second.costoKg) != null) {
    first.costoKg = nonZero(second.costoKg);
  }
  return [first, ...days.slice(1)];
}

function buildPlantMonth(input) {
  const year = Number(input.year);
  const month = Number(input.month);
  const cal = monthBusinessDays(year, month, input.cierresEmpresariales);
  const corte = String(input.corteYmd || "").slice(0, 10);
  const byFecha = new Map((input.days || []).map((day) => [day.fecha, day]));
  const raw = cal.days.map((day) => {
    const src = byFecha.get(day.fecha) || {};
    return {
      fecha: day.fecha,
      inhabil: day.inhabil,
      ventaKg: src.ventaKg,
      precio: src.precio,
      costoKg: src.costoKg,
      fleteKg: src.fleteKg,
      hgImporte: src.hgImporte,
      cdKg: src.cdKg,
      corporativos: input.corporativos,
      operativos: input.operativos,
      habiles: cal.habiles,
    };
  });
  const carried = input.skipDay1Fallback
    ? resolveCarry(raw, corte, null)
    : resolveCarry(applyDay1CostFallback(raw, input.seed), corte, input.seed);
  const points = carried.map((day) => {
    const metrics = computePlantDay(day);
    const estado = corte && day.fecha >= corte ? "proyectado" : "real";
    return {
      fecha: day.fecha,
      resultado_mxn: metrics.resultado_mxn,
      resultado_per_kg: metrics.resultado_per_kg,
      venta_kg: metrics.venta_kg,
      estado,
      complete: metrics.complete,
      missing_components: metrics.missing_components,
      missing_plants: [],
      margen: metrics.margen,
      hg_kg: metrics.hg_kg,
    };
  });
  const acumulado = totalMesMarginAndHg(points.map((point) => ({
    ventaKg: point.venta_kg,
    margen: point.margen,
    hgKg: point.hg_kg,
  })));
  // El contrato hacia el forecast es solo `acumulado`. Los puntos públicos no llevan margen/hg diarios.
  const publicPoints = points.map(({ margen, hg_kg, ...point }) => point);
  return {
    year,
    month,
    plant: input.plant || "",
    habiles: cal.habiles,
    points: publicPoints,
    weeks: weeksFromPoints(year, month, publicPoints, cal),
    acumulado,
  };
}

function provincePoint(fecha, plantPoints) {
  const missingPlants = [];
  const missingComponents = [];
  for (const point of plantPoints) {
    if (point.venta_kg != null && point.venta_kg > 0 && !point.complete) {
      missingPlants.push(point.plant);
      for (const component of point.missing_components || []) {
        missingComponents.push(`${point.plant} · ${component}`);
      }
    }
  }
  const venta = sumNums(plantPoints.map((point) => point.venta_kg));
  const af = sumNums(plantPoints.map((point) => point.resultado_mxn));
  const ae = af != null && venta != null && venta !== 0 ? af / venta : null;
  const estados = new Set(plantPoints.map((point) => point.estado));
  return {
    fecha,
    resultado_mxn: af,
    resultado_per_kg: ae,
    venta_kg: venta,
    estado: estados.has("proyectado") && !estados.has("real") ? "proyectado" : "real",
    complete: missingPlants.length === 0 && af != null && ae != null,
    missing_components: missingComponents,
    missing_plants: missingPlants,
  };
}

function buildProvinceMonth(plantMonths) {
  const first = (plantMonths || [])[0];
  if (!first) return { points: [], weeks: [] };
  const points = first.points.map((point, index) => {
    const sameDay = plantMonths.map((month) => ({ ...month.points[index], plant: month.plant }));
    const estado = sameDay.some((item) => item.estado === "proyectado") ? "proyectado" : "real";
    const row = provincePoint(point.fecha, sameDay);
    row.estado = estado;
    return row;
  });
  return {
    year: first.year,
    month: first.month,
    plant: "PROVINCIA",
    points,
    weeks: weeksFromPoints(first.year, first.month, points, monthBusinessDays(first.year, first.month)),
  };
}

function weeksFromPoints(year, month, points, cal) {
  const calendar = cal || monthBusinessDays(year, month);
  const byFecha = new Map(points.map((point) => [point.fecha, point]));
  return weeksOf(calendar.days).map((week, index) => {
    const days = week.map((day) => byFecha.get(day.fecha)).filter(Boolean);
    const venta = sumNums(days.map((day) => day.venta_kg));
    const af = sumNums(days.map((day) => day.resultado_mxn));
    const ae = af != null && venta != null && venta !== 0 ? af / venta : null;
    const hasReal = days.some((day) => day.estado === "real");
    const hasProy = days.some((day) => day.estado === "proyectado");
    return {
      label: `Semana ${index + 1}`,
      fecha_desde: week[0].fecha,
      fecha_hasta: week[week.length - 1].fecha,
      resultado_mxn: af,
      resultado_per_kg: ae,
      complete: days.length > 0 && days.every((day) => day.complete),
      estado: hasReal && hasProy ? "mixto" : hasProy ? "proyectado" : "real",
    };
  });
}

function filterPoints(points, desde, hasta) {
  return (points || []).filter((point) => point.fecha >= desde && point.fecha <= hasta);
}

function trendOf(points, metric) {
  const pairs = [];
  (points || []).forEach((point, index) => {
    if (point.estado === "real" && point.complete && typeof point[metric] === "number") {
      pairs.push({ x: index, y: point[metric] });
    }
  });
  return linearTrendIndexed(pairs);
}

function isoDow(fecha) {
  const date = new Date(`${fecha}T12:00:00Z`);
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

const WEEKDAY = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function newClientsPanel(bundles, opts) {
  const year = Number(opts.year);
  const month = Number(opts.month);
  const today = opts.todayYmd || businessTodayYmd();
  const anchor = maxEligibleInsightYmd({
    year,
    month,
    corteYmd: opts.corteYmd,
    todayYmd: today,
  });
  const events = [];
  for (const bundle of bundles || []) {
    for (const event of newClientEvents(bundle.salesRows || [], year, month)) {
      events.push({ ...event, plant: bundle.plant || null, plantaId: bundle.plantaId });
    }
  }
  const chart = [];
  if (anchor) {
    const monday = addDaysYmd(anchor, 1 - isoDow(anchor));
    const weekTotal = (start) => {
      const end = addDaysYmd(start, 6);
      const rows = events.filter((event) => event.fecha >= start && event.fecha <= end);
      return {
        count: rows.length,
        kg: rows.reduce((sum, event) => sum + Number(event.kg || 0), 0),
      };
    };
    const older = weekTotal(addDaysYmd(monday, -14));
    const previous = weekTotal(addDaysYmd(monday, -7));
    chart.push({ label: "SEM -2", tipo: "week", count: older.count, kg: older.kg });
    chart.push({ label: "SEM -1", tipo: "week", count: previous.count, kg: previous.kg });
    for (let cursor = monday; cursor && cursor <= anchor; cursor = addDaysYmd(cursor, 1)) {
      const rows = events.filter((event) => event.fecha === cursor);
      const day = Number(cursor.slice(8, 10));
      chart.push({
        label: `${WEEKDAY[isoDow(cursor)]} ${pad2(day)}`,
        tipo: "day",
        count: rows.length,
        kg: rows.reduce((sum, event) => sum + Number(event.kg || 0), 0),
      });
    }
  }
  const top = [];
  for (const bundle of bundles || []) {
    const plantEvents = newClientEvents(bundle.salesRows || [], year, month);
    for (const event of plantEvents) {
      if (anchor && event.fecha > anchor) continue;
      let kg = 0;
      let monto = 0;
      let sawMonto = false;
      for (const row of bundle.salesRows || []) {
        if (row.cliente_norm !== event.cliente) continue;
        if (row.fecha < event.fecha || (anchor && row.fecha > anchor)) continue;
        kg += Number(row.kg) || 0;
      }
      for (const row of bundle.discountRows || []) {
        if (row.cliente_norm !== event.cliente) continue;
        if (row.fecha < event.fecha || (anchor && row.fecha > anchor)) continue;
        if (row.monto == null || !Number.isFinite(Number(row.monto))) continue;
        monto += Number(row.monto);
        sawMonto = true;
      }
      top.push({
        planta: bundle.plant || null,
        cliente: event.cliente,
        fecha_ingreso: event.fecha,
        kg,
        descuento_per_kg: sawMonto && kg > 0 ? monto / kg : null,
      });
    }
  }
  top.sort((a, b) => b.kg - a.kg || String(a.cliente).localeCompare(String(b.cliente), "es"));
  return { anchor, new_clients_chart: chart, new_clients_top: top.slice(0, 10) };
}

function assembleGrafica(opts) {
  const end = monthEnd(opts.year, opts.month);
  const first = opts.firstYmd || ((opts.points || [])[0] && opts.points[0].fecha) || end;
  const window = rangeWindow(end, opts.range, first);
  const points = filterPoints(opts.points || [], window.desde, window.hasta);
  const weeks = (opts.weeks || []).filter((week) => week.fecha_hasta >= window.desde && week.fecha_desde <= window.hasta);
  return {
    ok: true,
    scope: opts.scope,
    range: window.range,
    corte_ymd: opts.corteYmd || null,
    points,
    weeks,
    new_clients_chart: opts.new_clients_chart || [],
    new_clients_top: opts.new_clients_top || [],
  };
}

async function safeQuery(client, sql, params, label) {
  try {
    const result = await client.query(sql, params);
    return (result && result.rows) || [];
  } catch (error) {
    console.error(`[igf-diario-grafica] ${label}`, error && error.message ? error.message : error);
    return [];
  }
}

async function loadPlantFacts(client, opts) {
  const plantaNombre = String(opts.plantaNombre || "").trim();
  const start = opts.start;
  const end = opts.end;
  let queryCount = 0;
  queryCount += 1;
  const salesRaw = await safeQuery(
    client,
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT v.fecha::text AS fecha, v.cliente_norm, COALESCE(v.canal, '') AS canal, SUM(v.kg) AS kg
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm
         ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1 AND v.fecha >= $2::date AND v.fecha <= $3::date
      GROUP BY v.fecha, v.cliente_norm, v.canal`,
    [plantaNombre, start, end],
    "ventas"
  );
  queryCount += 1;
  const discountRaw = await safeQuery(
    client,
    `WITH prov_map AS (${SQL_PROV_MAP})
     SELECT d.fecha::text AS fecha, d.cliente_norm, SUM(d.monto) AS monto
       FROM arr.descuentos_diarios_cliente d
       JOIN prov_map pm
         ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
      WHERE pm.prov_name = $1 AND d.fecha >= $2::date AND d.fecha <= $3::date
      GROUP BY d.fecha, d.cliente_norm`,
    [plantaNombre, start, end],
    "descuentos"
  );
  queryCount += 1;
  return {
    plant: opts.plant || plantaNombre,
    plantaId: plantaIdOf(opts),
    salesRows: salesRaw.map((row) => ({
      fecha: String(row.fecha).slice(0, 10),
      cliente_norm: String(row.cliente_norm || "").trim(),
      canal: String(row.canal || "").trim(),
      kg: Number(row.kg),
    })).filter((row) => row.fecha && Number.isFinite(row.kg)),
    discountRows: discountRaw.map((row) => ({
      fecha: String(row.fecha).slice(0, 10),
      cliente_norm: String(row.cliente_norm || "").trim(),
      monto: Number(row.monto),
    })).filter((row) => row.fecha && Number.isFinite(row.monto)),
    queryCount,
  };
}

function plantaIdOf(opts) {
  const id = Number(opts && opts.plantaId);
  return Number.isFinite(id) ? id : null;
}

function indexNum(rows, field) {
  const map = new Map();
  for (const row of rows || []) {
    const fecha = String(row.fecha || "").slice(0, 10);
    const value = num(row[field]);
    if (fecha && value != null) map.set(fecha, value);
  }
  return map;
}

function indexCosto(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const fecha = String(row.fecha || "").slice(0, 10);
    const kg = num(row.kg);
    const importe = num(row.importe);
    if (fecha && kg != null && kg > 0 && importe != null) map.set(fecha, importe / kg);
  }
  return map;
}

function ventaKgFromRows(rows, fecha) {
  let casa = null;
  let com = null;
  for (const row of rows || []) {
    if (row.fecha !== fecha) continue;
    const canal = String(row.canal || "").toUpperCase();
    if (canal.includes("COMISION")) com = (com || 0) + row.kg;
    else if (canal.includes("CASA")) casa = (casa || 0) + row.kg;
  }
  if (casa == null && com == null) return null;
  return (casa || 0) + (com || 0);
}

function cdKgFromRows(salesRows, discountRows, fecha) {
  let kg = 0;
  let monto = 0;
  let sawKg = false;
  let sawMonto = false;
  for (const row of salesRows || []) {
    if (row.fecha !== fecha) continue;
    kg += row.kg;
    sawKg = true;
  }
  for (const row of discountRows || []) {
    if (row.fecha !== fecha) continue;
    monto += row.monto;
    sawMonto = true;
  }
  if (!sawKg || !sawMonto || kg === 0) return null;
  return monto / kg;
}

const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function seedBeforeFecha(byDate, fecha, fallback) {
  let costoKg = fallback && fallback.costoKg;
  let fleteKg = null;
  for (const key of [...byDate.keys()].filter((day) => fecha && day < fecha).sort()) {
    const day = byDate.get(key) || {};
    if (nonZero(day.costoKg) != null) costoKg = nonZero(day.costoKg);
    if (nonZero(day.fleteKg) != null) fleteKg = nonZero(day.fleteKg);
  }
  return { costoKg, fleteKg };
}

function previousMonthStart(year, month) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return ymd(prevYear, prevMonth, 1);
}

function countingClient(client, bucket) {
  return {
    query(sql, params) {
      bucket.n += 1;
      return client.query(sql, params);
    },
  };
}

async function loadComprasDayMap(client, plantaId, months, corteYmd, cache) {
  const byDate = new Map();
  if (plantaId == null || !client) return byDate;
  const compras = require("./compras-dashboard");
  const comprasExcel = require("./compras-excel");
  const store = cache || new Map();
  for (const part of months || []) {
    const key = `${Number(plantaId)}|${part.year}|${part.month}`;
    let payload = store.get(key);
    if (!payload) {
      try {
        payload = await compras.loadMonthReadOnly(client, plantaId, part.year, part.month);
      } catch (error) {
        console.error("[igf-diario-grafica] compras", error && error.message ? error.message : error);
        throw error;
      }
      store.set(key, payload);
    }
    for (const row of comprasExcel.resolveControlComprasDays(payload, corteYmd)) byDate.set(row.fecha, row);
  }
  return byDate;
}

function canalTonMaps(rows) {
  const forecast = require("./dashboard-arr-forecast");
  const casaKg = new Map();
  const comKg = new Map();
  for (const row of rows || []) {
    const fecha = String(row.fecha || "").slice(0, 10);
    const canal = forecast.canonicalArrCanal(row.canal);
    const kg = Number(row.kg) || 0;
    if (!fecha || !canal) continue;
    const map = canal === "COMISIONISTA" ? comKg : casaKg;
    map.set(fecha, (map.get(fecha) || 0) + kg);
  }
  const toTon = (source) => {
    const out = new Map();
    for (const [fecha, kg] of source) out.set(fecha, kg / 1000);
    return out;
  };
  return { casa: toTon(casaKg), com: toTon(comKg) };
}

function plantLabels(plant) {
  if (typeof plant === "string") return [plant].map((value) => String(value || "").trim()).filter(Boolean);
  return [plant && plant.nombre, plant && plant.canon, plant && plant.provinciaPlantCode, plant && plant.clave]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function precioPlantKey(plant) {
  if (typeof plant === "string") return String(plant || "").trim();
  return String((plant && (plant.provinciaPlantCode || plant.canon || plant.nombre)) || "").trim();
}

function cdMapForPlant(index, plant) {
  const forecast = require("./dashboard-arr-forecast");
  const labels = plantLabels(plant);
  const map = new Map();
  for (const row of (index && index.rows) || []) {
    const code = String(row.plant_code || "").trim();
    const fecha = String(row.fecha || "").slice(0, 10);
    const value = num(row.descuento_por_kg);
    if (!code || !fecha || value == null) continue;
    if (!labels.some((label) => code === label || forecast.plantsEquivalent(code, label))) continue;
    map.set(fecha, value);
  }
  return map;
}

function miniRowForPlant(mini, plant) {
  const forecast = require("./dashboard-arr-forecast");
  const labels = plantLabels(plant);
  return ((mini && mini.rows) || []).find((item) => labels.some((label) =>
    forecast.plantsEquivalent(item && item.plant_code, label)
    || forecast.plantsEquivalent(item && item.empresa, label)
    || forecast.plantsEquivalent(item && item.clave, label)
  )) || null;
}

async function loadCdMonthIndex(client, year, month) {
  const start = ymd(year, month, 1);
  const end = monthEnd(year, month);
  const primary = await safeQuery(
    client,
    `SELECT plant_code, fecha::text AS fecha, descuento_por_kg
       FROM arr.descuento_por_kilo_diario_provincia
      WHERE fecha >= $1::date AND fecha <= $2::date`,
    [start, end],
    "cd-primario"
  );
  const pack = (rows, mode, queryCount) => ({
    year: Number(year),
    month: Number(month),
    mode,
    queryCount,
    rows: rows.map((row) => ({
      plant_code: row.plant_code,
      fecha: String(row.fecha).slice(0, 10),
      descuento_por_kg: num(row.descuento_por_kg),
    })),
  });
  if (primary.length) return pack(primary, "primary", 1);
  const fallback = await safeQuery(
    client,
    `WITH prov_map AS (
       SELECT DISTINCT p.nombre AS prov_name, UPPER(TRIM(p.nombre)) AS key_nombre, UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
       FROM public.plantas p
       JOIN arr.provincia_plants ap ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
         OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
       WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
     ),
     k AS (
       SELECT pm.prov_name AS plant_code, v.fecha, SUM(v.kg) AS total_kg
       FROM arr.ventas_diarias_cliente v
       JOIN prov_map pm ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
       WHERE v.fecha >= $1::date AND v.fecha <= $2::date
       GROUP BY pm.prov_name, v.fecha
     ),
     d AS (
       SELECT pm.prov_name AS plant_code, d.fecha, SUM(d.monto) AS total_monto
       FROM arr.descuentos_diarios_cliente d
       JOIN prov_map pm ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
         OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
       WHERE d.fecha >= $1::date AND d.fecha <= $2::date
       GROUP BY pm.prov_name, d.fecha
     )
     SELECT k.plant_code, k.fecha::text AS fecha,
            ROUND((d.total_monto / NULLIF(k.total_kg, 0))::numeric, 2) AS descuento_por_kg
       FROM k
       JOIN d ON k.plant_code = d.plant_code AND k.fecha = d.fecha`,
    [start, end],
    "cd-fallback"
  );
  return pack(fallback, "fallback", 2);
}

function materializePlantMonth(spec) {
  const forecast = require("./dashboard-arr-forecast");
  const year = Number(spec.year);
  const month = Number(spec.month);
  const resolverCorte = spec.project ? String(spec.corteYmd || "").slice(0, 10) : "";
  const precioSeries = forecast.resolvePrecioDailySeries(year, month, spec.precioRows || []);
  const precioByFecha = new Map(precioSeries.map((item) => [item.fecha, item.precio]));
  const pack = spec.project && spec.projection ? forecast.projectionForPlant(spec.projection, spec.plant) : null;
  const last = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    const fecha = ymd(year, month, day);
    const dt = new Date(year, month - 1, day);
    const casa = forecast.resolveCanalTon(
      spec.casaTon && spec.casaTon.has(fecha) ? spec.casaTon.get(fecha) : null,
      fecha,
      resolverCorte,
      day,
      null,
      pack ? forecast.weekdayPromAt(pack.promVentaCasa, dt) : null
    );
    const com = forecast.resolveCanalTon(
      spec.comTon && spec.comTon.has(fecha) ? spec.comTon.get(fecha) : null,
      fecha,
      resolverCorte,
      day,
      null,
      pack ? forecast.weekdayPromAt(pack.promVentaComisionista, dt) : null
    );
    const ventaKg = typeof casa === "number" && typeof com === "number" ? (casa + com) * 1000 : null;
    const cdKg = forecast.resolveComisionCd(
      spec.cdByFecha && spec.cdByFecha.has(fecha) ? spec.cdByFecha.get(fecha) : null,
      fecha,
      resolverCorte,
      pack ? forecast.weekdayPromAt(pack.promDescTotal, dt) : null
    );
    const compra = (spec.comprasByFecha && spec.comprasByFecha.get(fecha)) || {};
    days.push({
      fecha,
      ventaKg,
      precio: precioByFecha.has(fecha) ? precioByFecha.get(fecha) : null,
      costoKg: compra.costoKg,
      fleteKg: compra.fleteKg,
      hgImporte: compra.hgImporte,
      cdKg,
    });
  }
  const built = buildPlantMonth({
    year,
    month,
    plant: spec.plant,
    corteYmd: spec.corteYmd,
    corporativos: spec.corporativos,
    operativos: spec.operativos,
    cierresEmpresariales: spec.cierresEmpresariales,
    days,
    skipDay1Fallback: spec.skipDay1Fallback !== false,
  });
  built.resolved = days;
  return built;
}

const COVERAGE_COMPONENTS = ["VENTA", "PRECIO", "COSTO", "FLETE", "HG", "C&D", "CORPORATIVO", "OPERATIVO"];

function coverageSummary(points) {
  const missing = Object.fromEntries(COVERAGE_COMPONENTS.map((key) => [key, 0]));
  const byPlant = {};
  let numericPoints = 0;
  let completePoints = 0;
  let firstMissing = null;
  for (const point of points || []) {
    if (typeof point.resultado_mxn === "number" || typeof point.resultado_per_kg === "number") numericPoints += 1;
    if (point.complete) completePoints += 1;
    const names = new Set();
    const plants = new Set(point.missing_plants || []);
    for (const raw of point.missing_components || []) {
      const text = String(raw);
      const parts = text.split(" · ");
      if (parts.length > 1) {
        plants.add(parts[0]);
        names.add(parts.slice(1).join(" · "));
      } else names.add(text);
    }
    if (names.size && !firstMissing) firstMissing = { fecha: point.fecha, components: [...names] };
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(missing, name)) missing[name] += 1;
    }
    for (const plant of plants) byPlant[plant] = (byPlant[plant] || 0) + 1;
  }
  const summary = {
    total_points: (points || []).length,
    numeric_points: numericPoints,
    complete_points: completePoints,
    missing_by_component: missing,
    first_missing_date: firstMissing,
  };
  if (Object.keys(byPlant).length) summary.missing_by_plant = byPlant;
  return summary;
}

const MES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function niceStep(span, targetCount) {
  const slots = Math.max(1, (targetCount || 5) - 1);
  const rough = span / slots;
  if (!(rough > 0) || !Number.isFinite(rough)) return 1;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  let base = 10;
  if (residual <= 1) base = 1;
  else if (residual <= 2) base = 2;
  else if (residual <= 2.5) base = 2.5;
  else if (residual <= 5) base = 5;
  return base * mag;
}

function buildNiceYTicks(yMin, yMax, _metric, targetCount = 5) {
  let lo = Math.min(Number(yMin) || 0, Number(yMax) || 0, 0);
  let hi = Math.max(Number(yMin) || 0, Number(yMax) || 0, 0);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const step = niceStep(hi - lo, targetCount);
  const start = Math.floor((lo / step) + 1e-9) * step;
  const end = Math.ceil((hi / step) - 1e-9) * step;
  const ticks = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    const clean = Number((Math.round(value / step) * step).toPrecision(12));
    if (!ticks.length || Math.abs(ticks[ticks.length - 1] - clean) > step * 1e-6) ticks.push(clean);
  }
  if (!ticks.some((tick) => Math.abs(tick) < step * 1e-6)) ticks.push(0);
  ticks.sort((a, b) => a - b);
  return ticks;
}

function formatXLabel(fecha, range) {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(fecha || "");
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const mon = MES_ABREV[Number(month) - 1] || month;
  const id = String(range || "1m").trim().toLowerCase();
  if (id === "3m") return `${day} ${mon}`;
  if (id === "ytd" || id === "1a" || id === "5a" || id === "todo") return `${mon} ${year.slice(2)}`;
  return `${day}/${month}`;
}

function buildXAxisTicks(points, range, maxTicks = 7) {
  const list = points || [];
  const n = list.length;
  if (!n) return [];
  const limit = Math.max(1, maxTicks);
  const indexes = [];
  if (n === 1 || limit === 1) indexes.push(0);
  else {
    const count = Math.min(limit, n);
    for (let i = 0; i < count; i += 1) indexes.push(Math.round((i * (n - 1)) / (count - 1)));
  }
  const uniqueIdx = [];
  for (const index of indexes) {
    if (!uniqueIdx.includes(index)) uniqueIdx.push(index);
  }
  const ticks = uniqueIdx.map((index) => ({
    index,
    fecha: list[index].fecha,
    label: formatXLabel(list[index].fecha, range),
  }));
  const seen = new Set();
  const kept = [];
  ticks.forEach((tick, i) => {
    const edge = i === 0 || i === ticks.length - 1;
    if (!edge && seen.has(tick.label)) return;
    seen.add(tick.label);
    kept.push(tick);
  });
  return kept;
}

function buildWeeklyClientTrend(chart) {
  const rows = chart || [];
  const weeks = rows.filter((item) => item && item.tipo === "week");
  const days = rows.filter((item) => item && item.tipo === "day");
  const sem2 = weeks.find((item) => item.label === "SEM -2") || { label: "SEM -2", count: 0, kg: 0 };
  const sem1 = weeks.find((item) => item.label === "SEM -1") || { label: "SEM -1", count: 0, kg: 0 };
  const count = days.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const kg = days.reduce((sum, item) => sum + (Number(item.kg) || 0), 0);
  return [
    { label: "SEM -2", count: Number(sem2.count) || 0, kg: Number(sem2.kg) || 0, partial: false },
    { label: "SEM -1", count: Number(sem1.count) || 0, kg: Number(sem1.kg) || 0, partial: false },
    { label: "SEM ACTUAL · PARCIAL", count, kg, partial: true },
  ];
}

function componentName(raw) {
  const text = String(raw || "");
  const parts = text.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : text;
}

function buildMonthClose(points, meta) {
  const year = Number(meta && meta.year);
  const month = Number(meta && meta.month);
  const rows = points || [];
  const hasProjection = rows.some((point) => point && point.estado === "proyectado");
  const missing = new Set();
  let venta = 0;
  let ventaAny = false;
  let af = 0;
  let afAny = false;
  let realMxn = 0;
  let realAny = false;
  let projectedMxn = 0;
  let projectedAny = false;
  let complete = true;
  for (const point of rows) {
    const b = num(point && point.venta_kg);
    if (b != null) {
      venta += b;
      ventaAny = true;
    }
    if (b != null && b > 0 && (num(point.resultado_mxn) == null || num(point.resultado_per_kg) == null)) {
      complete = false;
      for (const item of point.missing_components || []) {
        const name = componentName(item);
        if (name) missing.add(name);
      }
    }
    const afv = num(point && point.resultado_mxn);
    if (afv == null) continue;
    af += afv;
    afAny = true;
    if (point.estado === "real") {
      realMxn += afv;
      realAny = true;
    } else if (point.estado === "proyectado") {
      projectedMxn += afv;
      projectedAny = true;
    }
  }
  const ventaKg = ventaAny ? venta : null;
  const resultadoMxn = complete && afAny ? af : null;
  const resultadoPerKg = resultadoMxn != null && ventaKg ? resultadoMxn / ventaKg : null;
  return {
    label: hasProjection ? "CIERRE PROYECTADO" : "CIERRE DEL MES",
    year,
    month,
    resultado_mxn: resultadoMxn,
    resultado_per_kg: resultadoPerKg,
    venta_kg: ventaKg,
    real_mxn: realAny ? realMxn : null,
    projected_mxn: projectedAny ? projectedMxn : null,
    complete,
    missing_components: [...missing].sort(),
    has_projection: hasProjection,
  };
}

async function loadLiveGrafica(client, opts) {
  const { mexicoTodayYmd } = require("./compras-excel");
  const year = Number(opts.year);
  const month = Number(opts.month);
  const corteRaw = String(opts.corteYmd || opts.uploadDay || "").slice(0, 10);
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(corteRaw) ? corteRaw : mexicoTodayYmd();
  const end = monthEnd(year, month);
  let first = ymd(year, month, 1);
  if (normalizeRange(opts.range) === "todo") {
    const found = await safeQuery(
      client,
      `SELECT MIN(fecha)::text AS fecha FROM arr.ventas_diarias_cliente`,
      [],
      "primera-venta"
    );
    const fecha = found[0] && String(found[0].fecha || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) first = fecha;
  }
  const window = rangeWindow(end, opts.range, first);
  const months = monthsTouched(window.desde, window.hasta);
  const financialStart = months.length ? ymd(months[0].year, months[0].month, 1) : window.desde;
  const prevCustomer = previousMonthStart(year, month);
  const customerFactsStart = financialStart < prevCustomer ? financialStart : prevCustomer;
  const openKey = `${year}-${pad2(month)}`;
  let queryCount = 0;
  const cdByMonth = new Map();
  for (const part of months) {
    const index = await loadCdMonthIndex(client, part.year, part.month);
    queryCount += index.queryCount;
    cdByMonth.set(`${part.year}-${pad2(part.month)}`, index);
  }
  const comprasBucket = { n: 0 };
  const comprasClient = client && typeof client.query === "function" ? countingClient(client, comprasBucket) : client;
  const comprasCache = new Map();
  const perPlant = [];
  for (const plant of opts.plants || []) {
    const nombre = String(plant.nombre || plant.canon || "").trim();
    const facts = await loadPlantFacts(client, {
      plantaNombre: nombre,
      plantaId: plant.plantaId,
      plant: nombre,
      start: customerFactsStart,
      end: window.hasta,
    });
    queryCount += facts.queryCount;
    let comprasByFecha = new Map();
    if (plant.plantaId != null) {
      comprasByFecha = await loadComprasDayMap(comprasClient, plant.plantaId, months, corte, comprasCache);
    }
    const canals = canalTonMaps(facts.salesRows);
    const monthsBuilt = [];
    for (const part of months) {
      let corp = null;
      let oper = null;
      if (typeof opts.gastosForMonth === "function") {
        let mini = null;
        try {
          mini = await opts.gastosForMonth(part.year, part.month);
        } catch (error) {
          console.error("[igf-diario-grafica] gastos", error && error.message ? error.message : error);
          throw error;
        }
        const row = miniRowForPlant(mini, plant);
        if (row) {
          corp = num(row.corporativos);
          oper = num(row.operativos);
        }
      }
      const partKey = `${part.year}-${pad2(part.month)}`;
      const cdByFecha = cdMapForPlant(cdByMonth.get(partKey), plant);
      let precioRows = [];
      if (typeof opts.loadPrecio === "function") {
        try {
          precioRows = await opts.loadPrecio(precioPlantKey(plant), part.year, part.month);
          queryCount += 1;
        } catch (error) {
          console.error("[igf-diario-grafica] precio", error && error.message ? error.message : error);
          throw error;
        }
      }
      const built = materializePlantMonth({
        year: part.year,
        month: part.month,
        plant: nombre,
        corteYmd: corte,
        project: partKey === openKey,
        projection: partKey === openKey ? opts.projection : null,
        corporativos: corp,
        operativos: oper,
        precioRows,
        casaTon: canals.casa,
        comTon: canals.com,
        cdByFecha,
        comprasByFecha,
        skipDay1Fallback: true,
      });
      monthsBuilt.push(built);
    }
    perPlant.push({ plant: nombre, plantaId: plant.plantaId, facts, monthsBuilt });
  }
  queryCount += comprasBucket.n;
  const many = perPlant.length > 1;
  const points = [];
  const weeks = [];
  let selectedMonthPoints = [];
  let selectedAcumulado = null;
  for (let index = 0; index < months.length; index += 1) {
    const part = months[index];
    const builtMonths = perPlant.map((item) => item.monthsBuilt[index]);
    const monthView = many ? buildProvinceMonth(builtMonths.map((item, plantIndex) => ({ ...item, plant: perPlant[plantIndex].plant }))) : builtMonths[0];
    if (!monthView) continue;
    if (part.year === year && part.month === month) {
      selectedMonthPoints = monthView.points;
      selectedAcumulado = monthView.acumulado || null;
    }
    for (const point of monthView.points) {
      if (point.fecha >= window.desde && point.fecha <= window.hasta) points.push(point);
    }
    const prefix = months.length > 1 ? `${MES_CORTO[part.month - 1]} · ` : "";
    for (const week of monthView.weeks) {
      if (week.fecha_hasta < window.desde || week.fecha_desde > window.hasta) continue;
      weeks.push({ ...week, label: `${prefix}${week.label}` });
    }
  }
  const panel = newClientsPanel(perPlant.map((item) => ({
    plant: item.plant,
    plantaId: item.plantaId,
    salesRows: item.facts.salesRows,
    discountRows: item.facts.discountRows,
  })), { year, month, corteYmd: corte, todayYmd: opts.todayYmd });
  return {
    ok: true,
    scope: many ? "Provincia" : (opts.scope || (perPlant[0] && perPlant[0].plant) || ""),
    range: window.range,
    corte_ymd: corte,
    points,
    weeks,
    new_clients_chart: panel.new_clients_chart,
    new_clients_top: panel.new_clients_top,
    coverage_summary: coverageSummary(points),
    month_close: buildMonthClose(selectedMonthPoints, { year, month }),
    acumulado: selectedAcumulado,
    query_count: queryCount,
  };
}

module.exports = {
  RANGES,
  QUERIES_PER_PLANT,
  normalizeRange,
  rangeWindow,
  monthsTouched,
  linearTrend,
  linearTrendIndexed,
  computePlantDay,
  resolveCarry,
  applyDay1CostFallback,
  buildPlantMonth,
  buildProvinceMonth,
  materializePlantMonth,
  filterPoints,
  trendOf,
  newClientsPanel,
  assembleGrafica,
  loadPlantFacts,
  loadLiveGrafica,
  buildNiceYTicks,
  buildXAxisTicks,
  buildWeeklyClientTrend,
  buildMonthClose,
  loadCdMonthIndex,
  ventaKgFromRows,
  cdKgFromRows,
};
