"use strict";

/**
 * Adaptador read-only: Director IA consume resultados del motor Dashboard Forecast.
 * No modifica dashboard-arr-forecast.js ni recalcula sus fórmulas.
 */

const dashboardArrForecast = require("./dashboard-arr-forecast");

function parseYearMonth(assembled) {
  const raw =
    (assembled && assembled.requested_period && assembled.requested_period.igf_arr_yyyy_mm) ||
    (assembled && assembled.alignment && assembled.alignment.arr_period) ||
    null;
  const m = String(raw || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), yyyy_mm: `${m[1]}-${m[2]}` };
}

function resolveTonFromMap(map, plantCode, plantName) {
  if (!map || typeof map.get !== "function") return null;
  const keys = [plantCode, plantName].filter(Boolean).map((k) => String(k).trim());
  for (const key of keys) {
    if (map.has(key) && Number.isFinite(Number(map.get(key)))) return Number(map.get(key));
  }
  const resolver = dashboardArrForecast.resolveProyFromPlantMap;
  if (typeof resolver === "function") {
    for (const key of keys) {
      const asProy = resolver(map, key);
      if (asProy != null && Number.isFinite(Number(asProy))) return Number(asProy);
      if (asProy && Number.isFinite(Number(asProy.proy_venta_ton))) return Number(asProy.proy_venta_ton);
    }
  }
  return null;
}

/**
 * @param {import("pg").Pool | { query: Function, connect?: Function } | null} pool
 * @param {{ assembled?: object, plantCode?: string, plantName?: string, year?: number, month?: number }} opts
 */
async function loadDashboardForecastParity(pool, opts = {}) {
  const assembled = opts.assembled || {};
  const plant = assembled.plant || {};
  const plantCode = opts.plantCode || plant.plant_code || null;
  const plantName = opts.plantName || plant.planta_nombre || null;
  const ym =
    opts.year != null && opts.month != null
      ? {
          year: Number(opts.year),
          month: Number(opts.month),
          yyyy_mm: `${opts.year}-${String(opts.month).padStart(2, "0")}`,
        }
      : parseYearMonth(assembled);

  const empty = {
    ok: true,
    reachable: false,
    period: ym,
    forecast: { venta_ton: null, desc_kg: null, source: "dashboard-arr-forecast.computePronosticoProyByPlant" },
    actual_to_date: { venta_ton: null, source: "dashboard-arr-forecast.getVentaRealTonProvinciaByPlant" },
    helper: "computePronosticoProyByPlant + getVentaRealTonProvinciaByPlant + resolveProyFromPlantMap",
  };

  if (!pool || typeof pool.connect !== "function" && typeof pool.query !== "function") {
    return empty;
  }
  if (!ym || !Number.isFinite(ym.year) || !Number.isFinite(ym.month)) {
    return empty;
  }

  let client = null;
  let released = false;
  try {
    if (typeof pool.connect === "function") {
      client = await pool.connect();
    } else {
      client = pool;
    }
    const lookKey = plantCode || plantName;
    let forecast = { venta_ton: null, desc_kg: null };
    try {
      const proyByPlant = await dashboardArrForecast.computePronosticoProyByPlant(client, ym.year, ym.month, {
        fechaCorte: "",
      });
      const proy = dashboardArrForecast.resolveProyFromPlantMap(proyByPlant, lookKey);
      forecast = {
        venta_ton:
          proy && Number.isFinite(Number(proy.proy_venta_ton)) ? Number(proy.proy_venta_ton) : null,
        desc_kg: proy && Number.isFinite(Number(proy.proy_desc_kg)) ? Number(proy.proy_desc_kg) : null,
      };
    } catch (_e) {
      forecast = { venta_ton: null, desc_kg: null };
    }

    let actualTon = null;
    try {
      const realMap = await dashboardArrForecast.getVentaRealTonProvinciaByPlant(client, ym.year, ym.month);
      actualTon = resolveTonFromMap(realMap, plantCode, plantName);
    } catch (_e) {
      actualTon = null;
    }

    return {
      ok: true,
      reachable: true,
      period: ym,
      forecast: {
        ...forecast,
        source: "dashboard-arr-forecast.computePronosticoProyByPlant",
        truth_semantics: "FORECAST_PROJECTION",
      },
      actual_to_date: {
        venta_ton: actualTon,
        source: "dashboard-arr-forecast.getVentaRealTonProvinciaByPlant",
        truth_semantics: "ACTUAL_TO_DATE",
      },
      helper: "computePronosticoProyByPlant + getVentaRealTonProvinciaByPlant + resolveProyFromPlantMap",
    };
  } catch (_e) {
    return empty;
  } finally {
    if (client && !released && typeof client.release === "function") {
      client.release();
      released = true;
    }
  }
}

function categoriaEsComisionistaDashboard(categoria) {
  const n = String(categoria || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!n) return false;
  return n === "comisionista" || n.startsWith("comisionista ") || n.includes(" comisionista");
}

function kgToTonDashboard(kg) {
  return Math.round((Number(kg) / 1000) * 100) / 100;
}

function isMesHistoricoArrClientes(year, month, now = new Date()) {
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

/**
 * Agrega CASA/COMI como la tabla ARR: mes cerrado = kg real; mes abierto = kgProy.
 * No aplica exclusiones/simulaciones de UI. No es OLS trailing.
 */
function aggregateCasaComiFromClientesMes(resp) {
  const historico = Boolean(resp && resp.historico);
  const rows = (resp && resp.rows) || [];
  if (!rows.length) {
    return { casa_ton: null, comisionista_ton: null, historico, any: false };
  }
  let casaKg = 0;
  let comiKg = 0;
  for (const r of rows) {
    const kg = historico ? Number(r.kg) || 0 : Number(r.kgProy) || 0;
    if (categoriaEsComisionistaDashboard(r.categoria)) comiKg += kg;
    else casaKg += kg;
  }
  return {
    casa_ton: kgToTonDashboard(casaKg),
    comisionista_ton: kgToTonDashboard(comiKg),
    historico,
    any: true,
  };
}

async function loadDashboardCasaComiMonth(client, year, month, plantCode) {
  const historico = isMesHistoricoArrClientes(year, month);
  const resp = await dashboardArrForecast.computeClientesDescuentoMes(client, year, month, plantCode, {
    historico,
  });
  const agg = aggregateCasaComiFromClientesMes(resp);
  return {
    ok: true,
    period: { year, month, yyyy_mm: `${year}-${String(month).padStart(2, "0")}` },
    historico: agg.historico,
    casa_ton: agg.casa_ton,
    comisionista_ton: agg.comisionista_ton,
    truth_semantics: agg.historico ? "ACTUAL_MONTH" : "FORECAST_PROJECTION",
    helper: "dashboard-arr-forecast.computeClientesDescuentoMes + agregación CASA/COMI de tabla ARR",
  };
}

function overlayProyOnIgfRow(row, proy) {
  if (!row || typeof row !== "object") return null;
  const next = { ...row };
  if (proy && Number.isFinite(Number(proy.proy_venta_ton))) next.venta_ton = Number(proy.proy_venta_ton);
  if (proy && Number.isFinite(Number(proy.proy_desc_kg))) next.com_desc_kg = Number(proy.proy_desc_kg);
  return next;
}

function economicsFromIgfRow(row, proy) {
  const { recalcularUtilYResultado } = require("./director-ia-igf-reviewable-supports");
  const overlaid = overlayProyOnIgfRow(row, proy);
  if (!overlaid) {
    return {
      util_oper_importe: null,
      resultado_final_importe: null,
      truth_semantics: "FORECAST_PROJECTION",
      helper: "recalcularUtilYResultado after computePronosticoProyByPlant overlay",
    };
  }
  const calc = recalcularUtilYResultado(overlaid);
  return {
    util_oper_importe: Number.isFinite(Number(calc.util_oper_importe)) ? Number(calc.util_oper_importe) : null,
    resultado_final_importe: Number.isFinite(Number(calc.resultado_final_importe))
      ? Number(calc.resultado_final_importe)
      : null,
    truth_semantics: "FORECAST_PROJECTION",
    helper: "recalcularUtilYResultado (lockstep server.js) after computePronosticoProyByPlant overlay",
    limitation:
      "buildIgfForecastPayload no está exportado; no se duplica overlay live presupuesto/folios ni GEND/CDJZ de UI.",
  };
}

async function loadDashboardIgfForecastEconomics(client, opts = {}) {
  const year = opts.year;
  const month = opts.month;
  const plantCode = opts.plantCode || null;
  const plantName = opts.plantName || null;
  const row = opts.igfRow || null;
  if (!client || !row || !Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) {
    return economicsFromIgfRow(null, null);
  }
  let proy = null;
  try {
    const fechaCorteStr = "";
    const corteYmd = dashboardArrForecast.getPronosticoCorteYmdStr(year, month, fechaCorteStr);
    const snapMini = await dashboardArrForecast.loadPronosticoMiniSnapshot(client, year, month, corteYmd);
    let computed = await dashboardArrForecast.computePronosticoProyByPlant(client, year, month, {
      fechaCorte: fechaCorteStr,
    });
    if (snapMini && snapMini.size > 0) {
      computed = new Map(computed);
      for (const [k, v] of snapMini.entries()) {
        if (v && Number.isFinite(Number(v.proy_venta_ton))) {
          computed.set(k, {
            proy_venta_ton: Number(v.proy_venta_ton),
            proy_desc_kg:
              v.proy_desc_kg != null && Number.isFinite(Number(v.proy_desc_kg)) ? Number(v.proy_desc_kg) : 0,
          });
        }
      }
    }
    proy = dashboardArrForecast.resolveProyFromPlantMap(computed, plantCode || plantName);
  } catch (_e) {
    proy = null;
  }
  return economicsFromIgfRow(row, proy);
}

module.exports = {
  loadDashboardForecastParity,
  parseYearMonth,
  loadDashboardCasaComiMonth,
  aggregateCasaComiFromClientesMes,
  categoriaEsComisionistaDashboard,
  isMesHistoricoArrClientes,
  economicsFromIgfRow,
  overlayProyOnIgfRow,
  loadDashboardIgfForecastEconomics,
};
