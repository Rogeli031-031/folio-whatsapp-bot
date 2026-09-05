"use strict";

/**
 * Target IGF efectivo de mes abierto para Clientes por mes.
 * Extrae la overlay PROY ya usada por GET /api/dashboard/igf-forecast
 * (loadProyVentaDescByPlantForIgf) y el last-upload de GET /api/arr/last-upload-day.
 * No inventa corte. No es compromiso_lines.venta_ton crudo.
 */

const dashboardArrForecast = require("./dashboard-arr-forecast");
const { targetKgDesdeIgfVentaTon } = require("./ingreso-cliente-marginal");

function parseUploadDayYmd(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function uploadDayMatchesMonth(day, year, month) {
  const ymd = parseUploadDayYmd(day);
  if (!ymd) return false;
  const y = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(5, 7), 10);
  return y === Number(year) && m === Number(month);
}

/**
 * Misma fuente que IGF Forecast / mini: snapshot + computePronosticoProyByPlant.
 * @returns {Promise<Map<string,{proy_venta_ton:number,proy_desc_kg:number}>>}
 */
async function loadProyVentaDescByPlantForIgf(client, year, month, uploadDay) {
  const fechaCorteStr = (uploadDay || "").toString().trim().slice(0, 10);
  const corteYmdFast = dashboardArrForecast.getPronosticoCorteYmdStr(year, month, fechaCorteStr);
  const snapMini = await dashboardArrForecast.loadPronosticoMiniSnapshot(client, year, month, corteYmdFast);
  const ctxProno = await dashboardArrForecast.buildPronosticoVentaDescMaps(client, year, month, fechaCorteStr);
  let computed = await dashboardArrForecast.computePronosticoProyByPlant(client, year, month, {
    fechaCorte: fechaCorteStr,
    prebuiltVentaDescCtx: ctxProno,
  });
  if (snapMini && snapMini.size > 0) {
    computed = new Map(computed);
    for (const [k, v] of snapMini.entries()) {
      if (v && Number.isFinite(Number(v.proy_venta_ton))) {
        computed.set(k, {
          proy_venta_ton: Number(v.proy_venta_ton),
          proy_desc_kg: v.proy_desc_kg != null && Number.isFinite(Number(v.proy_desc_kg)) ? Number(v.proy_desc_kg) : 0,
        });
      }
    }
  }
  return computed;
}

/**
 * Misma semántica que ArrClient.resolveUploadDayForMonth + GET /api/arr/last-upload-day:
 * upload_day explícito si coincide year/month; si no, último arr.upload_log del mes
 * ORDER BY uploaded_at DESC LIMIT 1 (no plant-aware).
 */
async function resolveUploadDayLikeClientesPorMes(client, year, month, opts = {}) {
  const requested = parseUploadDayYmd(opts.upload_day || opts.fechaCorte || opts.cutoff_date);
  if (uploadDayMatchesMonth(requested, year, month)) return requested;
  if (!client || typeof client.query !== "function") return null;
  const r = await client.query(
    `SELECT plant_code, uploaded_day, uploaded_at, uploaded_by
       FROM arr.upload_log
      WHERE year = $1::int AND month = $2::int
      ORDER BY uploaded_at DESC
      LIMIT 1`,
    [year, month]
  );
  const row = r.rows && r.rows[0] ? r.rows[0] : null;
  if (!row) return null;
  const uploadDay =
    row.uploaded_day &&
    (typeof row.uploaded_day === "string" ? row.uploaded_day : row.uploaded_day.toISOString?.().slice(0, 10));
  const ymd = parseUploadDayYmd(uploadDay);
  return ymd || null;
}

async function resolveEffectiveIgfTarget(client, plantLabel, year, month, opts = {}) {
  if (typeof opts.loadEffectiveIgfTarget === "function") {
    return opts.loadEffectiveIgfTarget(client, plantLabel, year, month, opts);
  }
  try {
    const uploadDay = await resolveUploadDayLikeClientesPorMes(client, year, month, opts);
    const proyByPlant = await loadProyVentaDescByPlantForIgf(client, year, month, uploadDay || "");
    const proy = dashboardArrForecast.resolveProyFromPlantMap(proyByPlant, plantLabel);
    const ventaTon =
      proy && Number.isFinite(Number(proy.proy_venta_ton)) && Number(proy.proy_venta_ton) > 0
        ? Number(proy.proy_venta_ton)
        : null;
    const targetKg = targetKgDesdeIgfVentaTon(ventaTon);
    return {
      ventaTon,
      targetKg: targetKg != null ? Number(targetKg) : null,
      upload_day: uploadDay || null,
      target_source: targetKg ? "proy" : null,
    };
  } catch (_err) {
    return { ventaTon: null, targetKg: null, upload_day: null, target_source: null };
  }
}

module.exports = {
  parseUploadDayYmd,
  uploadDayMatchesMonth,
  loadProyVentaDescByPlantForIgf,
  resolveUploadDayLikeClientesPorMes,
  resolveEffectiveIgfTarget,
};
