"use strict";

const { canAccessPlant } = require("./igf-dashboard-scope");
const { monthBusinessDays } = require("./igf-diario-puebla");
const { plantsEquivalent } = require("./dashboard-arr-forecast");
const compras = require("./compras-dashboard");
const desglose = require("./igf-diario-gastos-desglose");
const { loadIgfDiarioAcumuladoPlantView, loadMarginDetailReadOnly } = require("./director-ia-013-acumulado");
const { findMiniRowForPlant, readIgfForecastMiniAuthoritative } = require("./director-ia-dashboard-forecast-adapter");

const DESGLOSE_SQL = `SELECT plant_code, gasto_corporativo, inversiones, impuestos_federales,
  presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta
FROM arr.igf_diario_gastos_desglose
WHERE year = $1 AND month = $2`;

const DISTRIBUTION_SQL = `SELECT plant_code, concepto, fecha, importe
FROM arr.igf_diario_gastos_distribucion_manual
WHERE year = $1 AND month = $2`;

const MARGIN_OVERRIDE_SQL = `SELECT plant_code, year, month, fecha, costo_kg, flete_kg, precio
FROM arr.igf_diario_margen_manual
WHERE year = $1 AND month = $2`;

const PURCHASE_SQL = `SELECT c.id, c.fecha, c.kg, c.importe, p.nombre AS proveedor,
       e.excel_kg, e.excel_importe, e.provenance
FROM arr.compras c
JOIN arr.compras_proveedores p ON p.id = c.proveedor_id
LEFT JOIN arr.compras_effective e ON e.compra_id = c.id
WHERE c.planta_id = $1 AND c.fecha >= $2::date AND c.fecha <= $3::date
ORDER BY c.fecha ASC, c.id ASC`;

const DOCUMENT_SQL = `SELECT compra_id FROM arr.compras_documentos WHERE compra_id = ANY($1::int[])`;

const HG_SQL = `SELECT fecha, hg_kilos
FROM arr.compras_hg
WHERE planta_id = $1 AND fecha >= $2::date AND fecha <= $3::date
ORDER BY fecha ASC, id ASC`;

const PLANT_SQL = `SELECT id, nombre, clave FROM public.plantas WHERE id = $1`;

function requiredSources(route) {
  const domain = route && route.domain;
  const truth = route && route.truth;
  const metric = route && route.metric;
  const financial = ["FINANCIAL", "FINANCIAL_DIAGNOSIS", "EXECUTIVE_SUMMARY", "COST_MARGIN_BRIDGE", "ACTUAL_VS_FORECAST", "HG_BOTH"].includes(domain)
    || metric === "hg_financial"
    || metric === "hg_both"
    || truth === "FINANCIAL_ACTUAL";
  const forecast = truth === "FINANCIAL_FORECAST" || truth === "BOTH" || domain === "ACTUAL_VS_FORECAST";
  const purchases = domain === "GAS_LP_PURCHASES" || domain === "EXECUTIVE_SUMMARY";
  const hg = domain === "HG_PHYSICAL" || domain === "HG_BOTH" || metric === "hg_physical" || metric === "hg_both" || domain === "EXECUTIVE_SUMMARY";
  return {
    financial: Boolean(financial && truth !== "FINANCIAL_FORECAST"),
    forecast: Boolean(forecast),
    purchases: Boolean(purchases),
    hg: Boolean(hg && domain !== "FINANCIAL"),
  };
}

function isFinancialRoute(route) {
  return requiredSources(route).financial || requiredSources(route).forecast;
}

function assertPlantAccess(auth, plantaId) {
  if (!canAccessPlant(auth, plantaId)) {
    const error = new Error("Planta no permitida");
    error.status = 403;
    throw error;
  }
  const role = String(auth && auth.role || "").toUpperCase();
  return role;
}

async function readRows(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows || [];
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ymd(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").slice(0, 10);
}

function matchesPlant(code, plant) {
  return [plant && plant.nombre, plant && plant.clave, plant && plant.canon].some((name) => plantsEquivalent(code, name));
}

async function loadPlant(client, plantaId) {
  const rows = await readRows(client, PLANT_SQL, [plantaId]);
  const row = rows[0];
  if (!row) return null;
  return {
    plantaId: Number(row.id),
    nombre: String(row.nombre || "").trim(),
    clave: String(row.clave || "").trim(),
    canon: String(row.nombre || "").trim(),
  };
}

async function loadDistribution(client, plant, year, month) {
  try {
    const rows = await readRows(client, DISTRIBUTION_SQL, [year, month]);
    const distribution = {};
    for (const row of rows.filter((item) => matchesPlant(item.plant_code, plant))) {
      const key = String(row.concepto || "");
      if (!distribution[key]) distribution[key] = {};
      distribution[key][ymd(row.fecha)] = num(row.importe);
    }
    return distribution;
  } catch (_error) {
    return null;
  }
}

function partialScope(route) {
  const scope = route && route.period && route.period.time_scope;
  return scope !== "MONTH" && scope !== "CUTOFF";
}

async function loadExpenseComponents(client, plant, year, month) {
  const rows = await desglose.listMonthReadOnly(client, year, month);
  if (rows == null) return { components: null, unavailable: true };
  const found = desglose.findRow(rows, [plant && plant.nombre, plant && plant.clave, plant && plant.canon]);
  const view = found ? desglose.publicRow(found, year, month) : null;
  return { components: view && view.componentes, unavailable: false };
}

function marginDays(detail, cutoff) {
  return (detail && detail.financial_days || []).map((day) => ({
    fecha: ymd(day.fecha),
    ventaKg: num(day.ventaKg),
    precio: num(day.precio),
    costoKg: num(day.costoKg),
    fleteKg: num(day.fleteKg),
    cdKg: num(day.cdKg),
  })).filter((day) => day.fecha && (!cutoff || day.fecha <= cutoff));
}

async function loadFinancial(ctx) {
  const { client, route, plant } = ctx;
  const year = route.period.year;
  const month = route.period.month;
  const partial = partialScope(route);
  if (partial) {
    const detail = await loadMarginDetailReadOnly(client, {
      year,
      month,
      cutoff: route.cutoff,
      plant,
    });
    const expenses = await loadExpenseComponents(client, plant, year, month);
    const distribution = await loadDistribution(client, plant, year, month);
    return {
      incomplete: false,
      missingDistribution: distribution == null || expenses.unavailable,
      days: marginDays(detail, route.cutoff),
      components: expenses.components,
      calendar: monthBusinessDays(year, month).days || [],
      overrides: distribution || {},
      authoritative: null,
      projection: detail.projection,
      cutoff: route.cutoff,
      marginSource: "loadMarginDetail",
    };
  }
  const view = await loadIgfDiarioAcumuladoPlantView(client, {
    year,
    month,
    cutoff: route.cutoff,
    plant,
    versionAsOfCorte: ctx.versionAsOfCorte,
  });
  const authoritative = view.authoritative;
  return {
    incomplete: !authoritative || (authoritative.margenKg == null && authoritative.ventaTon == null),
    missingDistribution: view.expensesUnavailable === true,
    days: [],
    components: view.components,
    calendar: monthBusinessDays(year, month).days || [],
    overrides: {},
    authoritative,
    projection: view.projection,
    cutoff: route.cutoff,
    marginSource: "loadIgfDiarioAcumulado",
  };
}

const FORECAST_FIELDS = {
  margen: "margen",
  venta: "ventaTon",
  operativos: "operativos",
  corporativos: "corporativos",
  gasto: "gasto",
  util_oper: "utilOperImporte",
  resultado_final: "resultadoFinalImporte",
  hg_financial: "hgKg",
  com_desc: "comDesc",
  impuestos: "impuestos",
  ingreso: "ingreso",
  inversiones: "inversiones",
};

function forecastMetrics(mini, plant) {
  const row = findMiniRowForPlant(mini && mini.rows, plant && plant.nombre, plant && plant.clave);
  readIgfForecastMiniAuthoritative(mini, plant && plant.nombre, plant && plant.clave);
  const metrics = {};
  for (const [metric, key] of Object.entries(FORECAST_FIELDS)) {
    const value = row && row[key];
    metrics[metric] = value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  }
  return { metrics, absent: !row };
}

async function loadForecast(ctx) {
  if (typeof ctx.loadForecast !== "function") {
    return { status: "LOADER_NOT_IMPLEMENTED", metrics: null };
  }
  const mini = await ctx.loadForecast(ctx.client, {
    year: ctx.route.period.year,
    month: ctx.route.period.month,
    upload_day: ctx.route.cutoff,
  });
  const mapped = forecastMetrics(mini, ctx.plant);
  return { status: mapped.absent ? "DATA_ABSENT" : "DATA_PRESENT", metrics: mapped.metrics };
}

async function loadPurchases(ctx) {
  const end = ctx.route.period.to > ctx.route.cutoff ? ctx.route.cutoff : ctx.route.period.to;
  const rows = await readRows(ctx.client, PURCHASE_SQL, [ctx.plantaId, ctx.route.period.from, end]);
  const ids = rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id));
  let documented = new Set();
  if (ids.length) {
    const docs = await readRows(ctx.client, DOCUMENT_SQL, [ids]);
    documented = new Set(docs.map((row) => Number(row.compra_id)));
  }
  return rows.map((row) => {
    const mapped = compras.mapPurchase({
      id: row.id,
      planta_id: ctx.plantaId,
      proveedor_id: row.proveedor_id || 0,
      fecha: row.fecha,
      kg: row.kg,
      importe: row.importe,
      excel_kg: row.excel_kg,
      excel_importe: row.excel_importe,
      provenance: row.provenance,
    });
    return {
      id: Number(row.id),
      fecha: ymd(row.fecha),
      kg: num(row.kg),
      importe: num(row.importe),
      excel_kg: row.excel_kg == null ? null : num(row.excel_kg),
      excel_importe: row.excel_importe == null ? null : num(row.excel_importe),
      proveedor: row.proveedor,
      provenance: mapped.provenance || row.provenance || null,
      discrepant: mapped.discrepant === true,
      has_document: documented.has(Number(row.id)),
    };
  });
}

async function loadHg(ctx) {
  const end = ctx.route.period.to > ctx.route.cutoff ? ctx.route.cutoff : ctx.route.period.to;
  const rows = await readRows(ctx.client, HG_SQL, [ctx.plantaId, ctx.route.period.from, end]);
  return rows.map((row) => ({ fecha: ymd(row.fecha), kg: num(row.hg_kilos) }));
}

async function loadDirectorIa013Snapshot(input) {
  const route = input && input.route;
  const plantaId = Number(input && input.plantaId);
  const auth = input && input.auth;
  const role = assertPlantAccess(auth, plantaId);
  if (role === "GA" && isFinancialRoute(route)) {
    const error = new Error("GA no tiene acceso a KPIs financieros.");
    error.status = 403;
    throw error;
  }
  const needs = requiredSources(route);
  const client = input.client;
  const plant = input.plant || await loadPlant(client, plantaId);
  if (!plant) {
    const error = new Error("Planta no permitida");
    error.status = 403;
    throw error;
  }
  if (Number(plant.plantaId) !== plantaId) {
    const error = new Error("Planta no permitida");
    error.status = 403;
    throw error;
  }
  const snapshot = { plant: plant.nombre };
  const ctx = { ...input, plant, plantaId };
  if (needs.financial) snapshot.financial = await loadFinancial(ctx);
  if (needs.forecast) {
    const forecastLoad = await loadForecast(ctx);
    snapshot.forecastStatus = forecastLoad.status;
    snapshot.forecast = forecastLoad.metrics;
  }
  if (needs.purchases) snapshot.purchases = await loadPurchases(ctx);
  if (needs.hg) snapshot.hgPhysical = await loadHg(ctx);
  snapshot.loaded = needs;
  return snapshot;
}

module.exports = {
  DESGLOSE_SQL,
  DISTRIBUTION_SQL,
  MARGIN_OVERRIDE_SQL,
  PURCHASE_SQL,
  DOCUMENT_SQL,
  HG_SQL,
  PLANT_SQL,
  requiredSources,
  isFinancialRoute,
  loadDirectorIa013Snapshot,
};
