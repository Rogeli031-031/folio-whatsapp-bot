"use strict";

const grafica = require("./igf-diario-grafica");
const forecast = require("./dashboard-arr-forecast");
const monthly = require("./igf-diario-monthly-financials");
const desglose = require("./igf-diario-gastos-desglose");
const { applyFinancialsToMiniRow } = require("../frontend-dashboard/lib/igf-october-mini");

const MARGIN_OVERRIDE_SQL = `SELECT plant_code, year, month, fecha, costo_kg, flete_kg, precio
FROM arr.igf_diario_margen_manual
WHERE year = $1 AND month = $2`;

function missingRelation(error) {
  if (error && error.code === "42P01") return true;
  return /does not exist|no existe|undefined_table/i.test(String(error && error.message || ""));
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function viewFromFinancials(financials) {
  const applied = financials || {};
  const row = applyFinancialsToMiniRow({ plant_code: "planta" }, applied);
  return {
    ventaTon: row.ventaTon,
    margenKg: row.margen,
    comDescKg: row.comDesc,
    hgKg: row.hgKg,
    ingreso: row.ingreso,
    operativosImporte: row.operativos,
    corporativosImporte: row.corporativos,
    gastoImporte: row.gasto,
    utilOperImporte: row.utilOperImporte,
    resultadoFinalImporte: row.resultadoFinalImporte,
    inversionesImporte: num(applied.inversionesImporte),
    impuestosFederalesImporte: num(applied.impuestosFederalesImporte),
    impuestoKg: row.impuestos,
  };
}

async function loadProjection(client, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, "projection")) return opts.projection;
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const cutoff = String((opts && opts.cutoff) || "").slice(0, 10);
  try {
    return await forecast.buildPronosticoProjectionContext(client, year, month, cutoff);
  } catch (_error) {
    return null;
  }
}

async function listMarginOverridesReadOnly(client, year, month) {
  try {
    const result = await client.query(MARGIN_OVERRIDE_SQL, [year, month]);
    return result.rows || [];
  } catch (error) {
    if (missingRelation(error)) return [];
    throw error;
  }
}

function loadPrecio(client) {
  return (plantName, year, month) => forecast.loadPrecioDiario(client, plantName, year, month);
}

async function loadIgfDiarioAcumuladoPlantView(client, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const cutoff = String((opts && opts.cutoff) || "").slice(0, 10);
  const plant = opts && opts.plant;
  const projection = await loadProjection(client, opts);
  const marginOverrides = await listMarginOverridesReadOnly(client, year, month);
  const payload = await grafica.loadIgfDiarioAcumulado(client, {
    plants: [plant],
    year,
    month,
    uploadDay: cutoff,
    corteYmd: cutoff,
    versionAsOfCorte: Boolean(opts && opts.versionAsOfCorte),
    projection,
    marginOverrides,
    loadPrecio: loadPrecio(client),
  });
  let row = (payload && payload.rows && payload.rows[0]) || null;
  let components = null;
  let expensesUnavailable = false;
  if (row && monthly.usesOctoberContract(year, month)) {
    const expenseRows = await desglose.listMonthReadOnly(client, year, month);
    expensesUnavailable = expenseRows == null;
    const found = desglose.findRow(expenseRows || [], [
      row.plant_code,
      row.empresa,
      row.canon,
      plant && plant.nombre,
      plant && plant.clave,
      plant && plant.canon,
    ]);
    const view = found ? desglose.publicRow(found, year, month) : null;
    components = view && view.componentes;
    const financials = monthly.applyExpenses(row.financials, components);
    row = { ...row, financials, margen: financials.margenKg, hg: financials.hgKg };
  }
  const authoritative = row && row.financials ? viewFromFinancials(row.financials) : null;
  return {
    payload,
    row,
    projection,
    components,
    expensesUnavailable,
    authoritative,
    days: [],
  };
}

async function loadMarginDetailReadOnly(client, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const cutoff = String((opts && opts.cutoff) || "").slice(0, 10);
  const plant = opts && opts.plant;
  const projection = await loadProjection(client, opts);
  const marginOverrides = await listMarginOverridesReadOnly(client, year, month);
  const detail = await grafica.loadMarginDetail(client, {
    plant,
    plantCode: plant && (plant.clave || plant.nombre),
    year,
    month,
    uploadDay: cutoff,
    corteYmd: cutoff,
    projection,
    marginOverrides,
    includeFinancialDays: true,
    loadPrecio: loadPrecio(client),
  });
  return { ...detail, projection };
}

module.exports = {
  loadIgfDiarioAcumuladoPlantView,
  loadMarginDetailReadOnly,
  listMarginOverridesReadOnly,
  viewFromFinancials,
};
