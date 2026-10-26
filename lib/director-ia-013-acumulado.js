"use strict";

const grafica = require("./igf-diario-grafica");
const forecast = require("./dashboard-arr-forecast");
const monthly = require("./igf-diario-monthly-financials");
const desglose = require("./igf-diario-gastos-desglose");
const { applyFinancialsToMiniRow } = require("../frontend-dashboard/lib/igf-october-mini");

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

async function loadIgfDiarioAcumuladoPlantView(client, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const cutoff = String((opts && opts.cutoff) || "").slice(0, 10);
  const plant = opts && opts.plant;
  let projection = null;
  if (opts && Object.prototype.hasOwnProperty.call(opts, "projection")) {
    projection = opts.projection;
  } else {
    try {
      projection = await forecast.buildPronosticoProjectionContext(client, year, month, cutoff);
    } catch (_error) {
      projection = null;
    }
  }
  const payload = await grafica.loadIgfDiarioAcumulado(client, {
    plants: [plant],
    year,
    month,
    uploadDay: cutoff,
    corteYmd: cutoff,
    versionAsOfCorte: Boolean(opts && opts.versionAsOfCorte),
    projection,
    loadPrecio: (plantName, y, m) => forecast.loadPrecioDiario(client, plantName, y, m),
  });
  let row = (payload && payload.rows && payload.rows[0]) || null;
  let components = null;
  if (row && monthly.usesOctoberContract(year, month)) {
    const expenseRows = await desglose.listMonth(client, year, month);
    const found = desglose.findRow(expenseRows, [
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
  const days = [];
  return {
    payload,
    row,
    projection,
    components,
    authoritative,
    days,
  };
}

module.exports = {
  loadIgfDiarioAcumuladoPlantView,
  viewFromFinancials,
};
