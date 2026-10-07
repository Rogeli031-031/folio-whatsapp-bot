"use strict";

const grafica = require("./igf-diario-grafica");
const { monthBusinessDays } = require("./igf-diario-puebla");
const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");
const { CONCEPTS, buildExpenseDailySchedule, overridesForPlant } = require("./igf-diario-gastos-distribucion");
const desglose = require("./igf-diario-gastos-desglose");
const margenManual = require("./igf-diario-margen-manual");

const EXPENSE_KEYS = CONCEPTS.slice();

const METRICS = [
  ["venta_kg", "kg"],
  ["precio_kg", "per_kg"],
  ["ingreso_mxn", "mxn"],
  ["costo_kg", "per_kg"],
  ["flete_kg", "per_kg"],
  ["margen_kg", "per_kg"],
  ["gasto_corporativo_kg", "per_kg"],
  ["inversiones_kg", "per_kg"],
  ["impuestos_federales_kg", "per_kg"],
  ["margen_neto_kg", "per_kg"],
  ["presupuesto_nomina_gastos_kg", "per_kg"],
  ["presupuesto_imss_sua_kg", "per_kg"],
  ["extraordinarios_kg", "per_kg"],
  ["provisiones_planta_kg", "per_kg"],
  ["sobrante_antes_hg_kg", "per_kg"],
  ["hg_mxn", "mxn"],
  ["hg_kg", "per_kg"],
  ["sobrante_con_hg_kg", "per_kg"],
  ["com_desc_kg", "per_kg"],
  ["resultado_kg", "per_kg"],
  ["resultado_mxn", "mxn"],
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseYmd(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatYmd(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addDays(value, days) {
  const date = parseYmd(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return formatYmd(date);
}

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function sundayOfWeekContainingDate(value) {
  const date = parseYmd(value);
  if (!date) return null;
  return addDays(String(value).slice(0, 10), -date.getUTCDay());
}

function saturdayOfWeekContainingDate(value) {
  const sunday = sundayOfWeekContainingDate(value);
  return sunday ? addDays(sunday, 6) : null;
}

function addWeeks(value, weeks) {
  return addDays(value, Number(weeks || 0) * 7);
}

function weekYear(value) {
  const sunday = sundayOfWeekContainingDate(value);
  const saturday = saturdayOfWeekContainingDate(value);
  if (!sunday || !saturday) return null;
  const startYear = Number(sunday.slice(0, 4));
  const endYear = Number(saturday.slice(0, 4));
  return startYear === endYear ? startYear : endYear;
}

function weekNumber(value) {
  const year = weekYear(value);
  if (year == null) return null;
  const first = sundayOfWeekContainingDate(`${year}-01-01`);
  const current = sundayOfWeekContainingDate(value);
  const start = parseYmd(first);
  const cursor = parseYmd(current);
  return Math.round((cursor - start) / 86400000 / 7) + 1;
}

function monthEnd(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(last)}`;
}

function weekIntersectsMonth(weekStart, year, month) {
  const weekEnd = addDays(weekStart, 6);
  const start = `${year}-${pad2(month)}-01`;
  const end = monthEnd(year, month);
  return Boolean(weekStart && weekEnd && weekStart <= end && weekEnd >= start);
}

function weekOf(anchor) {
  const sunday = sundayOfWeekContainingDate(anchor);
  if (!sunday) return null;
  return {
    week_year: weekYear(sunday),
    week_number: weekNumber(sunday),
    fecha_desde: sunday,
    fecha_hasta: saturdayOfWeekContainingDate(sunday),
  };
}

function navigationFor(anchor, year, month) {
  const current = weekOf(anchor);
  if (!current) return null;
  const prev = addWeeks(current.fecha_desde, -1);
  const next = addWeeks(current.fecha_desde, 1);
  return {
    prev_anchor: prev,
    next_anchor: next,
    prev_enabled: weekIntersectsMonth(prev, year, month),
    next_enabled: weekIntersectsMonth(next, year, month),
  };
}

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function datesOfWeek(weekStart) {
  const out = [];
  for (let i = 0; i < 7; i += 1) out.push(addDays(weekStart, i));
  return out;
}

function buildConceptSchedules(calendarDays, amounts, overridesByConcept) {
  const out = {};
  for (const key of EXPENSE_KEYS) {
    const monthly = amounts ? finite(amounts[key]) : null;
    if (monthly == null) {
      out[key] = null;
      continue;
    }
    const built = buildExpenseDailySchedule({
      monthlyAmount: monthly,
      days: calendarDays,
      overrides: (overridesByConcept && overridesByConcept[key]) || {},
    });
    out[key] = built.ok ? built.byFecha : null;
  }
  return out;
}

function expenseMoney(day) {
  if (!day || !day.expenses) return null;
  const money = {};
  for (const key of EXPENSE_KEYS) {
    const value = finite(day.expenses[key]);
    if (value == null) return null;
    money[key] = value;
  }
  return money;
}

function dayIngreso(day) {
  const venta = finite(day && day.ventaKg);
  const precio = finite(day && day.precio);
  if (venta == null || precio == null) return null;
  return precio * venta;
}

function dayResultMxn(day) {
  const venta = finite(day && day.ventaKg);
  const precio = finite(day && day.precio);
  const costo = finite(day && day.costoKg);
  const flete = finite(day && day.fleteKg);
  const hg = finite(day && day.hgImporte);
  const cd = finite(day && day.cdKg);
  const money = expenseMoney(day);
  if (venta != null && precio != null && costo != null && flete != null && hg != null && cd != null && money) {
    const margen = precio - costo - flete;
    const gastos = EXPENSE_KEYS.reduce((sum, key) => sum + money[key], 0);
    return margen * venta - gastos - hg + cd * venta;
  }
  if (!day || day.expenses != null) return null;
  return finite(day.legacyResultadoMxn);
}

function weighted(days, read) {
  let numerator = 0;
  let denominator = 0;
  for (const day of days) {
    const venta = finite(day.ventaKg);
    if (venta == null) return null;
    if (venta === 0) continue;
    const value = read(day);
    if (value == null) return null;
    numerator += value * venta;
    denominator += venta;
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}

function sumOf(days, read) {
  let total = 0;
  for (const day of days) {
    const value = read(day);
    if (value == null) return null;
    total += value;
  }
  return total;
}

function perKg(money, venta) {
  if (money == null || venta == null || venta === 0) return null;
  return money / venta;
}

function aggregateWeek(days, corteYmd) {
  const list = days || [];
  const venta = sumOf(list, (day) => finite(day.ventaKg));
  const ingreso = sumOf(list, (day) => dayIngreso(day));
  const precio = venta != null && venta !== 0 && ingreso != null ? ingreso / venta : null;
  const costo = weighted(list, (day) => finite(day.costoKg));
  const flete = weighted(list, (day) => finite(day.fleteKg));
  const margen = precio != null && costo != null && flete != null ? precio - costo - flete : null;
  const detailed = list.every((day) => day && day.expenses != null);
  const expenseTotals = {};
  for (const key of EXPENSE_KEYS) {
    expenseTotals[key] = detailed ? sumOf(list, (day) => finite(day.expenses[key])) : null;
  }
  const gasto = perKg(expenseTotals.gasto_corporativo, venta);
  const inversiones = perKg(expenseTotals.inversiones, venta);
  const impuestos = perKg(expenseTotals.impuestos_federales, venta);
  const nomina = perKg(expenseTotals.presupuesto_nomina_gastos, venta);
  const imss = perKg(expenseTotals.presupuesto_imss_sua, venta);
  const extra = perKg(expenseTotals.extraordinarios, venta);
  const provisiones = perKg(expenseTotals.provisiones_planta, venta);
  const margenNeto = margen != null && gasto != null && inversiones != null && impuestos != null
    ? margen - gasto - inversiones - impuestos
    : null;
  const sobranteAntes = margenNeto != null && nomina != null && imss != null && extra != null && provisiones != null
    ? margenNeto - nomina - imss - extra - provisiones
    : null;
  const hgMxn = sumOf(list, (day) => finite(day.hgImporte));
  const hgKg = perKg(hgMxn, venta);
  const sobranteCon = sobranteAntes != null && hgKg != null ? sobranteAntes - hgKg : null;
  const comDesc = weighted(list, (day) => finite(day.cdKg));
  let resultadoKg = sobranteCon != null && comDesc != null ? sobranteCon + comDesc : null;
  if (resultadoKg == null && list.length === 1 && list[0] && list[0].expenses == null) {
    resultadoKg = finite(list[0].legacyResultadoKg);
  }
  const resultadoMxn = sumOf(list, (day) => dayResultMxn(day));
  if (resultadoKg == null && resultadoMxn != null && venta != null && venta !== 0) {
    resultadoKg = resultadoMxn / venta;
  }
  const metrics = {
    venta_kg: venta,
    precio_kg: precio,
    ingreso_mxn: ingreso,
    costo_kg: costo,
    flete_kg: flete,
    margen_kg: margen,
    gasto_corporativo_kg: gasto,
    inversiones_kg: inversiones,
    impuestos_federales_kg: impuestos,
    margen_neto_kg: margenNeto,
    presupuesto_nomina_gastos_kg: nomina,
    presupuesto_imss_sua_kg: imss,
    extraordinarios_kg: extra,
    provisiones_planta_kg: provisiones,
    sobrante_antes_hg_kg: sobranteAntes,
    hg_mxn: hgMxn,
    hg_kg: hgKg,
    sobrante_con_hg_kg: sobranteCon,
    com_desc_kg: comDesc,
    resultado_kg: resultadoKg,
    resultado_mxn: resultadoMxn,
  };
  const corte = String(corteYmd || "").slice(0, 10);
  let hasReal = false;
  let hasProy = false;
  for (const day of list) {
    const projected = Boolean(corte) && day.fecha >= corte;
    if (projected) hasProy = true;
    else hasReal = true;
  }
  const estado = hasReal && hasProy ? "parcial" : hasProy ? "proyectada" : "real";
  const missing = Object.entries(metrics).filter((entry) => entry[1] == null).map((entry) => entry[0]);
  return { metrics, estado, complete: missing.length === 0, missing_components: missing };
}

function dailyMetric(day, key) {
  const pack = aggregateWeek([day], null);
  return pack.metrics[key];
}

function weekDayRecords(days, corteYmd) {
  return (days || []).map((day) => {
    const pack = aggregateWeek([day], corteYmd);
    const date = parseYmd(day && day.fecha);
    return {
      fecha: day.fecha,
      weekday: date ? WEEKDAY_NAMES[date.getUTCDay()] : null,
      estado: pack.estado,
      metrics: pack.metrics,
    };
  });
}

function seriesPoints(days, metric, corteYmd) {
  const corte = String(corteYmd || "").slice(0, 10);
  return (days || []).map((day) => {
    const value = dailyMetric(day, metric);
    const projected = Boolean(corte) && day.fecha >= corte;
    return {
      fecha: day.fecha,
      value,
      resultado_mxn: value,
      resultado_per_kg: value,
      venta_kg: finite(day.ventaKg),
      estado: projected ? "proyectado" : "real",
      complete: value != null,
      missing_components: value == null ? [metric] : [],
      missing_plants: [],
    };
  });
}

function plantLabels(plant) {
  if (!plant) return [];
  if (typeof plant === "string") return [plant];
  return [plant.canon, plant.nombre, plant.provinciaPlantCode, plant.clave, plant.igfLabel]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function countingClient(client, bucket) {
  return {
    query(sql, params) {
      bucket.n += 1;
      return client.query(sql, params);
    },
  };
}

async function loadMonthBundle(client, plant, part, opts, bucket) {
  const year = part.year;
  const month = part.month;
  const counted = countingClient(client, bucket);
  const corte = String(opts.corteYmd || "").slice(0, 10);
  const open = year === Number(opts.year) && month === Number(opts.month);
  const cdIndex = await grafica.loadCdMonthIndex(counted, year, month);
  const facts = await grafica.loadPlantFacts(counted, {
    plantaNombre: plant.nombre,
    plantaId: plant.plantaId,
    plant: plant.nombre,
    start: `${year}-${pad2(month)}-01`,
    end: monthEnd(year, month),
  });
  const comprasByFecha = plant.plantaId == null
    ? new Map()
    : await grafica.loadComprasDayMap(counted, plant.plantaId, [part], corte, opts.comprasCache);
  const canals = grafica.canalTonMaps(facts.salesRows);
  let precioRows = [];
  if (typeof opts.loadPrecio === "function") {
    precioRows = await opts.loadPrecio(grafica.precioPlantKey(plant), year, month) || [];
  }
  const marginRows = await margenManual.listMonthOverrides(counted, year, month);
  const marginOverrides = margenManual.overridesForPlant(marginRows, plantLabels(plant));
  const built = grafica.materializePlantMonth({
    year,
    month,
    plant: plant.nombre,
    corteYmd: corte,
    project: open,
    projection: open ? opts.projection : null,
    precioRows,
    casaTon: canals.casa,
    comTon: canals.com,
    cdByFecha: grafica.cdMapForPlant(cdIndex, plant),
    comprasByFecha,
    skipDay1Fallback: true,
    marginOverrides,
  });
  let schedules = null;
  if (usesDetailedExpenseLayout(year, month)) {
    const rows = await desglose.listMonth(counted, year, month);
    const row = desglose.findRow(rows, plantLabels(plant));
    const amounts = row ? desglose.publicRow(row, year, month).componentes : null;
    const overrideMaps = await overridesForPlant(counted, year, month, plant.canon || plant.nombre);
    schedules = buildConceptSchedules(monthBusinessDays(year, month).days, amounts, overrideMaps);
  }
  return daysFromBuilt(built, schedules);
}

function daysFromBuilt(built, schedules) {
  const points = new Map((built && built.points || []).map((point) => [String(point.fecha).slice(0, 10), point]));
  const byFecha = new Map();
  for (const day of (built && built.financial_days) || []) {
    const fecha = String(day.fecha).slice(0, 10);
    const point = points.get(fecha) || null;
    const expenses = schedules
      ? Object.fromEntries(EXPENSE_KEYS.map((key) => [key, schedules[key] ? finite(schedules[key][fecha]) : null]))
      : null;
    byFecha.set(fecha, {
      fecha,
      ventaKg: day.ventaKg,
      precio: day.precio,
      costoKg: day.costoKg,
      fleteKg: day.fleteKg,
      hgImporte: day.hgImporte,
      cdKg: day.cdKg,
      expenses,
      legacyResultadoMxn: expenses == null && point ? finite(point.resultado_mxn) : null,
      legacyResultadoKg: expenses == null && point ? finite(point.resultado_per_kg) : null,
    });
  }
  return byFecha;
}

function stitchWeek(bundles, weekStart) {
  const days = [];
  for (const fecha of datesOfWeek(weekStart)) {
    let found = null;
    for (const bundle of bundles) {
      if (bundle.has(fecha)) found = bundle.get(fecha);
    }
    days.push(found || {
      fecha,
      ventaKg: null,
      precio: null,
      costoKg: null,
      fleteKg: null,
      hgImporte: null,
      cdKg: null,
      expenses: usesDetailedExpenseLayout(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7))) ? blankExpenses() : null,
      legacyResultadoMxn: null,
      legacyResultadoKg: null,
    });
  }
  return days;
}

function blankExpenses() {
  return Object.fromEntries(EXPENSE_KEYS.map((key) => [key, null]));
}

async function loadBundles(client, plant, desde, hasta, opts) {
  const bucket = { n: 0 };
  const months = grafica.monthsTouched(desde, hasta);
  const bundles = [];
  for (const part of months) {
    bundles.push(await loadMonthBundle(client, plant, part, opts, bucket));
  }
  return { bundles, queryCount: bucket.n };
}

async function loadWeeklyPlant(client, opts) {
  const anchor = String(opts.weekAnchor || opts.corteYmd || "").slice(0, 10);
  const week = weekOf(anchor);
  if (!week) {
    const error = new Error("week_anchor inválido");
    error.status = 400;
    throw error;
  }
  const loaded = await loadBundles(client, opts.plant, week.fecha_desde, week.fecha_hasta, opts);
  const days = stitchWeek(loaded.bundles, week.fecha_desde);
  const summary = aggregateWeek(days, opts.corteYmd);
  return {
    ok: true,
    scope: "plant",
    year: Number(opts.year),
    month: Number(opts.month),
    plant_code: opts.plant.canon || opts.plant.nombre,
    empresa: opts.plant.nombre || opts.plant.canon,
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    version_as_of_corte: Boolean(opts.versionAsOfCorte),
    week: {
      ...week,
      estado: summary.estado,
      complete: summary.complete,
      missing_components: summary.missing_components,
    },
    metrics: summary.metrics,
    days: weekDayRecords(days, opts.corteYmd),
    nav: navigationFor(anchor, Number(opts.year), Number(opts.month)),
    query_count: loaded.queryCount,
  };
}

function plantLabel(plant, opts) {
  if (opts && typeof opts.labelPlant === "function") {
    const label = opts.labelPlant(plant);
    if (label) return String(label).trim();
  }
  return String((plant && (plant.nombre || plant.canon)) || "").trim();
}

async function loadWeeklyAll(client, opts) {
  const anchor = String(opts.weekAnchor || opts.corteYmd || "").slice(0, 10);
  const week = weekOf(anchor);
  if (!week) {
    const error = new Error("week_anchor inválido");
    error.status = 400;
    throw error;
  }
  const cache = opts.comprasCache || new Map();
  const plants = [];
  let queryCount = 0;
  for (const plant of opts.plants || []) {
    const loaded = await loadBundles(client, plant, week.fecha_desde, week.fecha_hasta, { ...opts, comprasCache: cache });
    queryCount += loaded.queryCount;
    const days = stitchWeek(loaded.bundles, week.fecha_desde);
    const summary = aggregateWeek(days, opts.corteYmd);
    const label = plantLabel(plant, opts);
    plants.push({
      plant_code: label,
      empresa: label,
      metrics: summary.metrics,
      complete: summary.complete,
      missing_components: summary.missing_components,
    });
  }
  const calendar = weekDayRecords(datesOfWeek(week.fecha_desde).map((fecha) => ({ fecha })), opts.corteYmd);
  const estado = calendar.some((day) => day.estado === "real") && calendar.some((day) => day.estado === "proyectada")
    ? "parcial"
    : calendar.some((day) => day.estado === "proyectada")
      ? "proyectada"
      : "real";
  return {
    ok: true,
    scope: "all",
    year: Number(opts.year),
    month: Number(opts.month),
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    version_as_of_corte: Boolean(opts.versionAsOfCorte),
    week: { ...week, estado },
    plants,
    nav: navigationFor(anchor, Number(opts.year), Number(opts.month)),
    query_count: queryCount,
  };
}

async function loadWeeklySeries(client, opts) {
  const end = monthEnd(Number(opts.year), Number(opts.month));
  let first = `${opts.year}-${pad2(opts.month)}-01`;
  if (grafica.normalizeRange(opts.range) === "todo") {
    const found = await client.query(`SELECT MIN(fecha)::text AS fecha FROM arr.ventas_diarias_cliente`, []);
    const fecha = found.rows && found.rows[0] && String(found.rows[0].fecha || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) first = fecha;
  }
  const window = grafica.rangeWindow(end, opts.range, first);
  const loaded = await loadBundles(client, opts.plant, window.desde, window.hasta, opts);
  const unique = [];
  for (let cursor = window.desde; cursor && cursor <= window.hasta; cursor = addDays(cursor, 1)) {
    unique.push(stitchWeek(loaded.bundles, sundayOfWeekContainingDate(cursor)).find((day) => day.fecha === cursor));
  }
  return {
    ok: true,
    range: window.range,
    corte_ymd: String(opts.corteYmd || "").slice(0, 10) || null,
    metric: opts.metric,
    points: seriesPoints(unique, opts.metric, opts.corteYmd),
    query_count: loaded.queryCount,
  };
}

module.exports = {
  METRICS,
  EXPENSE_KEYS,
  addDays,
  addWeeks,
  sundayOfWeekContainingDate,
  saturdayOfWeekContainingDate,
  weekNumber,
  weekYear,
  weekOf,
  weekIntersectsMonth,
  navigationFor,
  buildConceptSchedules,
  aggregateWeek,
  daysFromBuilt,
  dailyMetric,
  weekDayRecords,
  seriesPoints,
  dayResultMxn,
  loadWeeklyPlant,
  loadWeeklyAll,
  loadWeeklySeries,
};
