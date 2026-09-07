"use strict";

/**
 * Adaptador read-only: Director IA consume resultados del motor Dashboard Forecast.
 * No modifica dashboard-arr-forecast.js ni recalcula sus fórmulas.
 */

const dashboardArrForecast = require("./dashboard-arr-forecast");

/** Mismo convenio que ArrClient.resumenMesMetrics: descuento pintado = −|com_desc|. */
function dashboardDescSigned(comDescKg) {
  if (comDescKg == null || !Number.isFinite(Number(comDescKg))) return null;
  return -Math.abs(Number(comDescKg));
}

function normalizeEmpresaLabel(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ");
}

function findMiniRowForPlant(miniRows, plantLabel, plantCode) {
  if (!Array.isArray(miniRows)) return null;
  const wants = [plantLabel, plantCode]
    .filter(Boolean)
    .map(normalizeEmpresaLabel)
    .filter(Boolean);
  if (!wants.length) return null;
  const scoreLabel = (val) => {
    const n = normalizeEmpresaLabel(val);
    if (!n) return -1;
    if (wants.includes(n)) return 100;
    for (const w of wants) {
      if (n.includes(w) || w.includes(n)) return 50;
    }
    return -1;
  };
  let best = null;
  let bestScore = -1;
  for (const r of miniRows) {
    const s = Math.max(scoreLabel(r && r.empresa), scoreLabel(r && r.plant_code));
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return bestScore >= 50 ? best : null;
}

/**
 * Cifras que pinta la UI desde el payload mini (GET /igf-forecast?include_mini=1).
 * No recalcula. No usa stored de compromiso_lines.
 */
function parseCutoffYmd(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const ACTUAL_TO_DATE_KIND = Object.freeze({
  NO_CLOSED_DAYS_YET: "NO_CLOSED_DAYS_YET",
  ZERO_OBSERVED: "ZERO_OBSERVED",
  VALUE_OBSERVED: "VALUE_OBSERVED",
  UNAVAILABLE: "UNAVAILABLE",
  NULL: "NULL",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
});

/** Misma regla que el sheet: no recalcula TOTAL; solo deriva la ventana de días cerrados. */
function deriveLastClosedDay(year, month, cutoffYmd) {
  const cutoff = parseCutoffYmd(cutoffYmd);
  if (!cutoff || !Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null;
  const y = Number(year);
  const m = Number(month);
  const [cy, cm] = cutoff.split("-").map(Number);
  const isCorteEnMes = cy === y && cm === m;
  const corteYmd = dashboardArrForecast.getPronosticoCorteYmdStr(y, m, cutoff);
  const corteDay = Number(String(corteYmd || "").slice(8, 10));
  if (!Number.isFinite(corteDay) || corteDay < 1) return null;
  return isCorteEnMes ? Math.max(0, corteDay - 1) : corteDay;
}

function classifyActualToDateKind(ventaTon, lastClosedDay, flags = {}) {
  if (flags.source_error) return ACTUAL_TO_DATE_KIND.SOURCE_UNAVAILABLE;
  if (ventaTon == null || ventaTon === "") {
    return flags.no_cutoff ? ACTUAL_TO_DATE_KIND.UNAVAILABLE : ACTUAL_TO_DATE_KIND.NULL;
  }
  const n = Number(ventaTon);
  if (!Number.isFinite(n)) return ACTUAL_TO_DATE_KIND.NULL;
  if (lastClosedDay === 0) return ACTUAL_TO_DATE_KIND.NO_CLOSED_DAYS_YET;
  if (n === 0) return ACTUAL_TO_DATE_KIND.ZERO_OBSERVED;
  return ACTUAL_TO_DATE_KIND.VALUE_OBSERVED;
}

function readIgfForecastMiniAuthoritative(miniPayload, plantLabel, plantCode) {
  const row = findMiniRowForPlant(miniPayload && miniPayload.rows, plantLabel, plantCode);
  if (!row) {
    return {
      venta_ton: null,
      desc_kg: null,
      util_oper_importe: null,
      resultado_final_importe: null,
      operativos: null,
      corporativos: null,
      gasto: null,
    };
  }
  return {
    venta_ton: Number.isFinite(Number(row.ventaTon)) ? Number(row.ventaTon) : null,
    desc_kg: dashboardDescSigned(row.comDesc),
    util_oper_importe: Number.isFinite(Number(row.utilOperImporte)) ? Number(row.utilOperImporte) : null,
    resultado_final_importe: Number.isFinite(Number(row.resultadoFinalImporte))
      ? Number(row.resultadoFinalImporte)
      : null,
    operativos: Number.isFinite(Number(row.operativos)) ? Number(row.operativos) : null,
    corporativos: Number.isFinite(Number(row.corporativos)) ? Number(row.corporativos) : null,
    gasto: Number.isFinite(Number(row.gasto)) ? Number(row.gasto) : null,
    source: "GET /api/dashboard/igf-forecast include_mini → mini.rows[]",
    cutoff_date: parseCutoffYmd(miniPayload && miniPayload.upload_day),
  };
}

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

  const requestedCutoff = parseCutoffYmd(opts.upload_day || opts.fechaCorte || opts.cutoff_date);
  const empty = {
    ok: true,
    reachable: false,
    period: ym ? { ...ym, cutoff_date: requestedCutoff } : { cutoff_date: requestedCutoff },
    forecast: {
      venta_ton: null,
      desc_kg: null,
      cutoff_date: requestedCutoff,
      source: "dashboard-arr-forecast.computePronosticoProyByPlant",
    },
    actual_to_date: {
      venta_ton: null,
      desc_kg: null,
      cutoff_date: requestedCutoff,
      source: "dashboard-arr-forecast.getPronosticoPlantDetail.venta_sheet.total_mes_sum",
      last_closed_day: null,
      period_start_status: ACTUAL_TO_DATE_KIND.UNAVAILABLE,
    },
    helper:
      "getPronosticoPlantDetail + computeIgfForecastMiniPayload(upload_day) — no se usa último día del mes como corte inventado",
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
    const fechaCorteStr = requestedCutoff || "";
    let cutoffDate = requestedCutoff;
    let forecast = { venta_ton: null, desc_kg: null, cutoff_date: cutoffDate };
    if (fechaCorteStr) {
      try {
        const corteYmd = dashboardArrForecast.getPronosticoCorteYmdStr(ym.year, ym.month, fechaCorteStr);
        cutoffDate = corteYmd || requestedCutoff;
        const snapMini = await dashboardArrForecast.loadPronosticoMiniSnapshot(
          client,
          ym.year,
          ym.month,
          corteYmd
        );
        let computed = await dashboardArrForecast.computePronosticoProyByPlant(client, ym.year, ym.month, {
          fechaCorte: fechaCorteStr,
        });
        if (snapMini && snapMini.size > 0) {
          computed = new Map(computed);
          for (const [k, v] of snapMini.entries()) {
            if (v && Number.isFinite(Number(v.proy_venta_ton))) {
              computed.set(k, {
                proy_venta_ton: Number(v.proy_venta_ton),
                proy_desc_kg:
                  v.proy_desc_kg != null && Number.isFinite(Number(v.proy_desc_kg))
                    ? Number(v.proy_desc_kg)
                    : 0,
              });
            }
          }
        }
        const proy = dashboardArrForecast.resolveProyFromPlantMap(computed, lookKey);
        forecast = {
          venta_ton:
            proy && Number.isFinite(Number(proy.proy_venta_ton)) ? Number(proy.proy_venta_ton) : null,
          desc_kg: dashboardDescSigned(proy && proy.proy_desc_kg),
          cutoff_date: cutoffDate,
        };
      } catch (_e) {
        forecast = { venta_ton: null, desc_kg: null, cutoff_date: requestedCutoff };
      }
    }

    let actualTon = null;
    let actualCutoff = cutoffDate;
    try {
      if (fechaCorteStr && typeof dashboardArrForecast.getPronosticoPlantDetail === "function") {
        const detail = await dashboardArrForecast.getPronosticoPlantDetail(
          client,
          ym.year,
          ym.month,
          lookKey,
          fechaCorteStr
        );
        const sheet = detail && detail.venta_sheet;
        if (sheet && Number.isFinite(Number(sheet.total_mes_sum))) actualTon = Number(sheet.total_mes_sum);
        if (detail && detail.corte_day) actualCutoff = parseCutoffYmd(detail.corte_day) || actualCutoff;
      }
    } catch (_e) {
      actualTon = null;
    }

    const windowCutoff = actualCutoff || requestedCutoff;
    const lastClosedDay = deriveLastClosedDay(ym.year, ym.month, windowCutoff);

    return {
      ok: true,
      reachable: true,
      period: { ...ym, cutoff_date: actualCutoff || requestedCutoff },
      forecast: {
        ...forecast,
        cutoff_date: forecast.cutoff_date || actualCutoff || requestedCutoff,
        source: fechaCorteStr
          ? "loadPronosticoMiniSnapshot overlay + computePronosticoProyByPlant (upload_day)"
          : "cutoff_unresolved",
        truth_semantics: "FORECAST_PROJECTION",
      },
      actual_to_date: {
        venta_ton: actualTon,
        desc_kg: null,
        cutoff_date: actualCutoff || requestedCutoff,
        source: "dashboard-arr-forecast.getPronosticoPlantDetail.venta_sheet.total_mes_sum",
        truth_semantics: "ACTUAL_TO_DATE",
        desc_availability: "UNAVAILABLE",
        desc_note:
          "Dashboard no exporta descuento acumulado al corte como cifra lista; no se estima ni se toma del stored/forecast.",
        last_closed_day: lastClosedDay,
        period_start_status: classifyActualToDateKind(actualTon, lastClosedDay, {
          no_cutoff: !fechaCorteStr,
        }),
      },
      helper:
        "getPronosticoPlantDetail (ACTUAL venta) + computeIgfForecastMiniPayload(upload_day) para FORECAST",
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

module.exports = {
  loadDashboardForecastParity,
  parseYearMonth,
  loadDashboardCasaComiMonth,
  aggregateCasaComiFromClientesMes,
  categoriaEsComisionistaDashboard,
  isMesHistoricoArrClientes,
  dashboardDescSigned,
  readIgfForecastMiniAuthoritative,
  findMiniRowForPlant,
  parseCutoffYmd,
  deriveLastClosedDay,
  classifyActualToDateKind,
  ACTUAL_TO_DATE_KIND,
};
