"use strict";

// Scope of the authenticated dashboard session, never of a client-selected filter.
function hasGlobalScope(auth) {
  const role = String(auth && auth.role || "").replace(/\s/g, "").toUpperCase();
  return ["ZP", "AD", "CF_CDMX"].includes(role);
}

function canAccessPlant(auth, plantaId) {
  if (hasGlobalScope(auth)) return true;
  const id = Number(plantaId);
  const allowed = auth && Array.isArray(auth.plantas_permitidas) ? auth.plantas_permitidas : [];
  return Number.isInteger(id) && id > 0 && allowed.some((item) => Number(item) === id);
}

async function filterRows(client, auth, rows, resolvePlant) {
  if (hasGlobalScope(auth)) return rows;
  const visible = [];
  for (const row of rows || []) {
    const plant = await resolvePlant(client, row.plant_code || row.empresa);
    if (plant && canAccessPlant(auth, plant.plantaId)) visible.push(row);
  }
  return visible;
}

async function scopeForecast(client, auth, payload, forecast) {
  if (hasGlobalScope(auth)) return payload;
  const rows = await filterRows(client, auth, payload.rows, forecast.resolveForecastExportPlant);
  const scoped = { ...payload, rows, totales: null };
  if (payload.mini) {
    scoped.mini = await scopeMini(client, auth, payload.mini, rows, forecast);
  }
  return scoped;
}

async function scopeMini(client, auth, mini, forecastRows, forecast) {
  if (hasGlobalScope(auth)) return mini;
  const rows = await filterRows(client, auth, mini.rows, forecast.resolveForecastExportPlant);
  return {
    ...mini,
    rows: rows.map((row) => {
      // The selector uses Forecast labels; preserve the code used by the editors.
      const source = (forecastRows || []).find((item) =>
        forecast.plantsEquivalent(item.empresa, row.plant_code || row.empresa));
      return source ? { ...row, empresa: source.empresa } : row;
    }),
    zona: null,
  };
}

module.exports = { hasGlobalScope, canAccessPlant, filterRows, scopeForecast, scopeMini };
