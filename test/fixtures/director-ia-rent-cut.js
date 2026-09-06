"use strict";

/**
 * Fixture R-RENT-CUT: frontera física upload_day → mini → util_oper → resultado_final.
 *
 * No mockea loadRentabilidadKpis. Replica las fórmulas de
 * computeIgfForecastMiniPayload (server.js) sobre bRes determinístico.
 *
 * Expected Dashboard se calcula con upload_day resuelto.
 * Actual Director IA pasa por loadKpiForMonth → loadIgfForecastMiniPayload(upload_day).
 * No es circular: el branch es el corte, no una constante de KPI.
 *
 * R-RENT-SNAPSHOT sigue existiendo pero no basta: mockea loadRentabilidadKpis
 * y no vería un futuro upload_day=null en B abierto.
 */

const { parseUploadDayYmd } = require("../../lib/igf-effective-proy-target");

const NOW = new Date("2026-09-01T12:00:00-06:00");
const YEAR_A = 2026;
const MONTH_A = 8;
const YEAR_B = 2026;
const MONTH_B = 9;
const UPLOAD_DAY_B = "2026-09-12";
const PLANT = "Acapulco";

/** Fila IGF cruda (bIgf). Fixture, no cifra LIVE. */
const IGF_ROW = Object.freeze({
  venta_ton: 1000,
  margen_kg: 5,
  com_desc_kg: 2,
  hg_kg: 1,
  hg_pct: 0,
  impuesto_kg: 0.1,
  gasto_kg: 1,
  bancos_planta_kg: 0.2,
  provision_planta_kg: 0.1,
  gtos_apoyos_corp_kg: 0.5,
  bancos_corp_kg: 0.2,
  otros_programas_kg: 0.1,
  inversiones_kg: 0.2,
});

/**
 * bRes por semántica de corte (misma que buildPronosticoVentaDescMaps):
 * mes cerrado → venta real;
 * B abierto + upload_day=null → MTD (sin remaining-day);
 * B abierto + corte en mes → forecast (observado + días restantes).
 */
const BRES = Object.freeze({
  A_REAL: 1200,
  B_MTD: 400,
  B_FORECAST: 800,
});

function n(x) {
  return x != null && Number.isFinite(Number(x)) ? Number(x) : 0;
}

function pad2(v) {
  return String(v).padStart(2, "0");
}

function lastYmdOfMonth(year, month) {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${Number(year)}-${pad2(month)}-${pad2(lastDay)}`;
}

/** Misma regla que isIgfMesCerradoPorCorte (server.js) sin cargar server. */
function isIgfMesCerradoPorCorte(year, month, uploadDayYmd, now) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return false;
  const corte = (uploadDayYmd || "").toString().trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(corte)) {
    return corte > lastYmdOfMonth(y, m);
  }
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : NOW;
  return y < ref.getFullYear() || (y === ref.getFullYear() && m < ref.getMonth() + 1);
}

/**
 * Fórmulas G..L de computeIgfForecastMiniPayload.
 * corporativos = rawCorpKg * bIgf * 1000 (independiente de bRes).
 */
function applyIgfMiniFormulas(bRes, igf) {
  const row = igf || IGF_ROW;
  const bIgf = n(row.venta_ton);
  const scale = bRes > 0 ? bIgf / bRes : 0;
  const C = n(row.margen_kg);
  const D = n(row.com_desc_kg);
  const F = n(row.impuesto_kg);
  const H = n(row.hg_kg);
  const E = n(row.gasto_kg) * scale;
  const I = n(row.bancos_planta_kg) * scale;
  const J = n(row.provision_planta_kg) * scale;
  const M = n(row.gtos_apoyos_corp_kg) * scale;
  const N = n(row.bancos_corp_kg) * scale;
  const O = n(row.otros_programas_kg) * scale;
  const P = n(row.inversiones_kg) * scale;
  const ingreso = Math.round((C + D - H) * bRes * 1000);
  const operativos = Math.round((E + I + J + F) * bRes * 1000);
  const corporativos = Math.round((M + N + O + P) * bRes * 1000);
  const utilOperImporte = ingreso - operativos;
  const resultadoFinalImporte = utilOperImporte - corporativos;
  return {
    ventaTon: bRes,
    ingreso,
    operativos,
    corporativos,
    utilOperImporte,
    resultadoFinalImporte,
  };
}

function resolveBres({ year, month, upload_day, now }) {
  if (isIgfMesCerradoPorCorte(year, month, upload_day, now)) {
    return BRES.A_REAL;
  }
  if (parseUploadDayYmd(upload_day)) return BRES.B_FORECAST;
  return BRES.B_MTD;
}

function computeRentCutMiniPayload(opts = {}) {
  const year = Number(opts.year);
  const month = Number(opts.month);
  const upload_day = opts.upload_day || null;
  const now = opts.now || NOW;
  const bRes = resolveBres({ year, month, upload_day, now });
  const mini = applyIgfMiniFormulas(bRes, IGF_ROW);
  return {
    ok: true,
    year,
    month,
    upload_day,
    rows: [
      {
        empresa: PLANT,
        plant_code: PLANT,
        ventaTon: mini.ventaTon,
        ingreso: mini.ingreso,
        operativos: mini.operativos,
        corporativos: mini.corporativos,
        utilOperImporte: mini.utilOperImporte,
        resultadoFinalImporte: mini.resultadoFinalImporte,
      },
    ],
  };
}

const EXPECTED_A = Object.freeze(applyIgfMiniFormulas(BRES.A_REAL, IGF_ROW));
const EXPECTED_B_MTD = Object.freeze(applyIgfMiniFormulas(BRES.B_MTD, IGF_ROW));
const EXPECTED_B_DASHBOARD = Object.freeze(applyIgfMiniFormulas(BRES.B_FORECAST, IGF_ROW));
const EXPECTED_DELTA_AB = EXPECTED_B_DASHBOARD.resultadoFinalImporte - EXPECTED_A.resultadoFinalImporte;
const EXPECTED_DELTA_OPER_AB = EXPECTED_B_DASHBOARD.utilOperImporte - EXPECTED_A.utilOperImporte;

function makeUploadLogClient(rowsByYm) {
  return {
    query: async (sql, params) => {
      const y = params && Number(params[0]);
      const m = params && Number(params[1]);
      const key = `${y}-${pad2(m)}`;
      if (String(sql).includes("arr.upload_log") && rowsByYm[key]) {
        return { rows: [rowsByYm[key]] };
      }
      return { rows: [] };
    },
  };
}

const CANONICAL_UPLOAD_LOG_B = Object.freeze({
  plant_code: PLANT,
  uploaded_day: UPLOAD_DAY_B,
  uploaded_at: "2026-09-12T18:00:00Z",
  uploaded_by: "rent-cut-fixture",
});

module.exports = {
  NOW,
  YEAR_A,
  MONTH_A,
  YEAR_B,
  MONTH_B,
  UPLOAD_DAY_B,
  PLANT,
  IGF_ROW,
  BRES,
  EXPECTED_A,
  EXPECTED_B_MTD,
  EXPECTED_B_DASHBOARD,
  EXPECTED_DELTA_AB,
  EXPECTED_DELTA_OPER_AB,
  CANONICAL_UPLOAD_LOG_B,
  applyIgfMiniFormulas,
  isIgfMesCerradoPorCorte,
  resolveBres,
  computeRentCutMiniPayload,
  makeUploadLogClient,
};
