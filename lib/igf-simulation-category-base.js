"use strict";
const {canonicalForecastPlantKey, computeClientesDescuentoMes} = require("./dashboard-arr-forecast");

// The monthly category editor and the closing-plan export must use the same ARR mix.
async function loadCategoryBase(client, plant, period, cutoff, targetKg, computeCategories = computeClientesDescuentoMes) {
  const date = new Date(cutoff + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - 1);
  const through = date.toISOString().slice(0, 10);
  const plantCode = plant.provinciaPlantCode || plant.canon;
  const options = {
    historico: false, targetKgOverride: targetKg, forecastKgByPlant: {[plantCode]: targetKg}, salesThrough: through, fechaHasta: through,
  };
  let data = await computeCategories(client, period.year, period.month, plantCode, options);
  // The province catalog uses Querétaro / Tehuacán while some ARR captures use unaccented codes.
  // Select one reference, never add the two projections together.
  const canonical = canonicalForecastPlantKey(plantCode);
  if (canonical && canonical.toUpperCase() !== plantCode.toUpperCase() && !data.rows?.some(row=>row.kgProy>0))
    data = await computeCategories(client, period.year, period.month, canonical, options);
  const groups = new Map();
  for (const row of data.rows || []) {
    const kg = Number(row.kgProy);
    if (!(kg > 0)) continue;
    const category = /comision/i.test(String(row.categoria)) ? "COMISIONISTA" : "CASA";
    const subcategory = String(row.subcategoria || "").trim() || "Sin subcategoría";
    const key = JSON.stringify([category, subcategory.toLocaleUpperCase("es")]);
    const group = groups.get(key) || {category, subcategory, kg: 0, discount_amount: 0, missing_discount_kg: 0};
    group.kg += kg;
    const discount = row.hasDiscountRow === false && Number(row.kg) > 0 ? 0 : row.descKg;
    if (discount == null || !Number.isFinite(Number(discount))) group.missing_discount_kg += kg;
    else group.discount_amount += kg * Math.abs(Number(discount));
    groups.set(key, group);
  }
  return {ok: true, cutoff, through, rows: [...groups.values()].map(g => ({
    ...g, discount_amount: g.missing_discount_kg > 0 ? null : g.discount_amount,
    discount_kg: g.missing_discount_kg > 0 ? null : g.discount_amount / g.kg,
  }))};
}
module.exports = {loadCategoryBase};
