"use strict";

const { canAccessPlant } = require("./igf-dashboard-scope");
const { monthBusinessDays } = require("./igf-diario-puebla");
const grafica = require("./igf-diario-grafica");
const forecast = require("./dashboard-arr-forecast");
const margenManual = require("./igf-diario-margen-manual");
const compras = require("./compras-dashboard");
const comprasExcel = require("./compras-excel");
const { loadPrecioDiario, plantsEquivalent } = forecast;

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

function canalTonMaps(rows) {
  const casaKg = new Map();
  const comKg = new Map();
  for (const row of rows || []) {
    const fecha = ymd(row.fecha);
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

async function loadFinancial(ctx) {
  const { client, route, plant } = ctx;
  const year = route.period.year;
  const month = route.period.month;
  let overrides = [];
  let components = null;
  let distribution = {};
  try {
    overrides = await readRows(client, MARGIN_OVERRIDE_SQL, [year, month]);
  } catch (_error) {
    overrides = [];
  }
  try {
    const rows = await readRows(client, DESGLOSE_SQL, [year, month]);
    components = rows.find((row) => matchesPlant(row.plant_code, plant)) || null;
  } catch (_error) {
    components = null;
  }
  try {
    const rows = await readRows(client, DISTRIBUTION_SQL, [year, month]);
    for (const row of rows.filter((row) => matchesPlant(row.plant_code, plant))) {
      const key = String(row.concepto || "");
      if (!distribution[key]) distribution[key] = {};
      distribution[key][ymd(row.fecha)] = num(row.importe);
    }
  } catch (_error) {
    distribution = null;
  }
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const sales = await grafica.loadSalesRows(client, { plant, start, end });
  const canals = canalTonMaps(sales.salesRows || []);
  const payload = await compras.loadMonthReadOnly(client, plant.plantaId, year, month);
  const comprasByFecha = new Map();
  for (const row of comprasExcel.resolveControlComprasDays(payload, route.cutoff)) comprasByFecha.set(row.fecha, row);
  const precioRows = await loadPrecioDiario(client, plant.nombre, year, month);
  const built = grafica.materializePlantMonth({
    year,
    month,
    plant: plant.nombre,
    corteYmd: route.cutoff,
    project: true,
    projection: null,
    corporativos: null,
    operativos: null,
    precioRows: precioRows || [],
    casaTon: canals.casa,
    comTon: canals.com,
    cdByFecha: null,
    comprasByFecha,
    skipDay1Fallback: true,
    marginOverrides: margenManual.overridesForPlant(overrides, [plant.nombre, plant.clave, plant.canon]),
  });
  const days = (built.financial_days || []).filter((day) => ymd(day.fecha) <= route.cutoff).map((day) => ({
    fecha: ymd(day.fecha),
    ventaKg: num(day.ventaKg),
    precio: num(day.precio),
    costoKg: num(day.costoKg),
    fleteKg: num(day.fleteKg),
    cdKg: num(day.cdKg),
    hgImporte: num(day.hgImporte),
    hgKilos: num(day.hgKilos),
  }));
  const calendar = monthBusinessDays(year, month).days || [];
  return {
    incomplete: !components,
    missingDistribution: distribution == null,
    days,
    components,
    calendar,
    overrides: distribution || {},
  };
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
  return rows.map((row) => ({
    id: Number(row.id),
    fecha: ymd(row.fecha),
    kg: num(row.kg),
    importe: num(row.importe),
    excel_kg: row.excel_kg == null ? null : num(row.excel_kg),
    excel_importe: row.excel_importe == null ? null : num(row.excel_importe),
    proveedor: row.proveedor,
    provenance: row.provenance || null,
    discrepant: row.excel_kg != null && num(row.kg) !== num(row.excel_kg),
    has_document: documented.has(Number(row.id)),
  }));
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
  if (needs.forecast) snapshot.forecast = input.forecast || null;
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
