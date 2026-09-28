"use strict";

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
const QUERIES_PER_PLANT = 4;

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

function linearTrend(values) {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
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
  const carried = resolveCarry(applyDay1CostFallback(raw, input.seed), corte, input.seed);
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
    };
  });
  return { year, month, plant: input.plant || "", habiles: cal.habiles, points, weeks: weeksFromPoints(year, month, points, cal) };
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
  const usable = (points || []).filter((point) => point.estado === "real" && point.complete && typeof point[metric] === "number");
  return linearTrend(usable.map((point) => point[metric]));
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
  const precioRaw = await safeQuery(
    client,
    `SELECT fecha::text AS fecha, precio
       FROM arr.precio_diario
      WHERE UPPER(TRIM(plant_code)) = UPPER(TRIM($1))
        AND fecha >= $2::date AND fecha <= $3::date`,
    [plantaNombre, start, end],
    "precio"
  );
  queryCount += 1;
  const comprasRaw = plantaIdOf(opts) == null ? [] : await safeQuery(
    client,
    `SELECT fecha::text AS fecha, SUM(kg) AS kg, SUM(importe) AS importe
       FROM arr.compras
      WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date
      GROUP BY fecha`,
    [plantaIdOf(opts), start, end],
    "compras"
  );
  if (plantaIdOf(opts) == null) queryCount -= 1;
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
    precioByDate: indexNum(precioRaw, "precio"),
    costoByDate: indexCosto(comprasRaw),
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

async function loadComprasDayMap(client, plantaId, start, end) {
  const empty = { byDate: new Map(), seed: null, queryCount: 0 };
  if (plantaId == null || !client) return empty;
  const compras = require("./compras-dashboard");
  let queryCount = 0;
  const providerRows = await safeQuery(
    client,
    `SELECT id, planta_id, nombre, activo, orden
       FROM arr.compras_proveedores
      WHERE planta_id = $1
      ORDER BY orden ASC, id ASC`,
    [plantaId],
    "proveedores"
  );
  const providers = providerRows.map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    activo: row.activo,
    orden: Number(row.orden) || 0,
  }));
  queryCount += 1;
  const purchaseRows = await safeQuery(
    client,
    `SELECT id, planta_id, proveedor_id, fecha, kg, importe
       FROM arr.compras
      WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date`,
    [plantaId, start, end],
    "compras-detalle"
  );
  queryCount += 1;
  const hgRows = await safeQuery(
    client,
    `SELECT id, planta_id, fecha, hg_kilos
       FROM arr.compras_hg
      WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date`,
    [plantaId, start, end],
    "hg"
  );
  queryCount += 1;
  const tarifaRows = await safeQuery(
    client,
    `SELECT id, planta_id, proveedor_id, year, month, tarifa
       FROM arr.compras_flete_tarifas
      WHERE planta_id = $1`,
    [plantaId],
    "tarifas"
  );
  queryCount += 1;
  let seed = null;
  try {
    queryCount += 1;
    const costoKg = await compras.loadLatestConsolidatedCostBeforeDate(client, plantaId, start);
    const hg = await compras.loadLatestHgCostBeforeDate(client, plantaId, start);
    seed = { costoKg, hg };
  } catch (error) {
    console.error("[igf-diario-grafica] semilla", error && error.message ? error.message : error);
    seed = null;
  }
  const purchases = purchaseRows.map((row) => ({
    id: Number(row.id),
    planta_id: Number(row.planta_id),
    proveedor_id: Number(row.proveedor_id),
    fecha: String(row.fecha).slice(0, 10),
    kg: num(row.kg),
    importe: num(row.importe),
  }));
  const byDate = new Map();
  for (const part of monthsTouched(start, end)) {
    const grid = compras.aggregatePurchases(purchases, providers, part.year, part.month);
    compras.attachHgToGrid(grid, hgRows);
    const monthTarifas = tarifaRows.filter((row) => Number(row.year) === part.year && Number(row.month) === part.month);
    compras.attachFleteToGrid(grid, monthTarifas, providers);
    compras.applyHgCostCarryForward(grid, seed && seed.hg);
    for (const day of grid.days || []) {
      const tarifa = day.flete && day.flete.consolidado ? day.flete.consolidado.tarifa : null;
      byDate.set(day.ymd, {
        costoKg: day.consolidado ? day.consolidado.costo_kg : null,
        fleteKg: tarifa,
        hgImporte: day.hg_importe_efectivo,
      });
    }
  }
  return { byDate, seed: { costoKg: seed && seed.costoKg }, queryCount };
}

async function loadLiveGrafica(client, opts) {
  const forecast = require("./dashboard-arr-forecast");
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
  const factsStart = previousMonthStart(year, month) < window.desde ? previousMonthStart(year, month) : window.desde;
  let queryCount = 0;
  const perPlant = [];
  for (const plant of opts.plants || []) {
    const nombre = String(plant.nombre || plant.canon || "").trim();
    const facts = await loadPlantFacts(client, {
      plantaNombre: nombre,
      plantaId: plant.plantaId,
      plant: nombre,
      start: factsStart,
      end: window.hasta,
    });
    queryCount += facts.queryCount;
    const compras = await loadComprasDayMap(client, plant.plantaId, window.desde, window.hasta);
    queryCount += compras.queryCount;
    const monthsBuilt = [];
    for (const part of months) {
      let corp = null;
      let oper = null;
      if (typeof opts.gastosForMonth === "function") {
        const mini = await opts.gastosForMonth(part.year, part.month);
        const row = ((mini && mini.rows) || []).find((item) =>
          forecast.plantsEquivalent(item && item.plant_code, nombre)
          || forecast.plantsEquivalent(item && item.empresa, nombre)
          || forecast.plantsEquivalent(item && item.plant_code, plant.canon)
          || forecast.plantsEquivalent(item && item.empresa, plant.canon)
        );
        if (row) {
          corp = num(row.corporativos);
          oper = num(row.operativos);
        }
      }
      const cal = monthBusinessDays(part.year, part.month);
      const seed = seedBeforeFecha(compras.byDate, cal.days[0] && cal.days[0].fecha, compras.seed);
      const days = cal.days.map((day) => {
        const compra = compras.byDate.get(day.fecha) || {};
        return {
          fecha: day.fecha,
          ventaKg: ventaKgFromRows(facts.salesRows, day.fecha),
          precio: facts.precioByDate.has(day.fecha) ? facts.precioByDate.get(day.fecha) : null,
          costoKg: compra.costoKg,
          fleteKg: compra.fleteKg,
          hgImporte: compra.hgImporte,
          cdKg: cdKgFromRows(facts.salesRows, facts.discountRows, day.fecha),
        };
      });
      const built = buildPlantMonth({
        year: part.year,
        month: part.month,
        plant: nombre,
        corteYmd: corte,
        corporativos: corp,
        operativos: oper,
        days,
        seed,
      });
      monthsBuilt.push(built);
    }
    perPlant.push({ plant: nombre, plantaId: plant.plantaId, facts, monthsBuilt });
  }
  const many = perPlant.length > 1;
  const points = [];
  const weeks = [];
  for (let index = 0; index < months.length; index += 1) {
    const part = months[index];
    const builtMonths = perPlant.map((item) => item.monthsBuilt[index]);
    const monthView = many ? buildProvinceMonth(builtMonths.map((item, plantIndex) => ({ ...item, plant: perPlant[plantIndex].plant }))) : builtMonths[0];
    if (!monthView) continue;
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
  })), { year, month, corteYmd: corte });
  return {
    ok: true,
    scope: many ? "Provincia" : (opts.scope || (perPlant[0] && perPlant[0].plant) || ""),
    range: window.range,
    corte_ymd: corte,
    points,
    weeks,
    new_clients_chart: panel.new_clients_chart,
    new_clients_top: panel.new_clients_top,
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
  computePlantDay,
  resolveCarry,
  applyDay1CostFallback,
  buildPlantMonth,
  buildProvinceMonth,
  filterPoints,
  trendOf,
  newClientsPanel,
  assembleGrafica,
  loadPlantFacts,
  loadLiveGrafica,
  ventaKgFromRows,
  cdKgFromRows,
};
