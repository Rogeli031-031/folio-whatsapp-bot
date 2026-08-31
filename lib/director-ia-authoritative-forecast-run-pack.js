"use strict";

/**
 * Authoritative forecast runtime pack (arquitectura C).
 * Extrae las cuatro magnitudes FORECAST de computeIgfForecastMiniPayload.rows[].
 * No recalcula. No usa ARR. No usa FORECAST_STORED. No HTTP al Dashboard.
 */

const { getPronosticoCorteYmdStr } = require("./dashboard-arr-forecast");
const {
  findMiniRowForPlant,
  dashboardDescSigned,
  parseCutoffYmd,
} = require("./director-ia-dashboard-forecast-adapter");

const PACK_STATUS = Object.freeze({
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  SOURCE_ERROR: "SOURCE_ERROR",
});

const PACK_SEMANTICS = Object.freeze({
  ACTUAL_TO_DATE: "ACTUAL_TO_DATE",
  FORECAST: "FORECAST",
  FORECAST_STORED: "FORECAST_STORED",
  TARGET_COMMITMENT: "TARGET_COMMITMENT",
});

function finiteOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function emptyForecast(status) {
  return {
    venta: null,
    descuento: null,
    utilidad_operativa: null,
    resultado_final: null,
    status: status || PACK_STATUS.UNAVAILABLE,
    semantics: PACK_SEMANTICS.FORECAST,
  };
}

function emptyActual(ventaTon) {
  const venta = finiteOrNull(ventaTon);
  return {
    venta,
    descuento: null,
    venta_status: venta == null ? PACK_STATUS.UNAVAILABLE : PACK_STATUS.AVAILABLE,
    descuento_status: PACK_STATUS.UNAVAILABLE,
    semantics: PACK_SEMANTICS.ACTUAL_TO_DATE,
  };
}

function emptyTarget() {
  return {
    venta: null,
    descuento: null,
    status: PACK_STATUS.UNAVAILABLE,
    semantics: PACK_SEMANTICS.TARGET_COMMITMENT,
  };
}

function buildRunIdentity(input, uploadDay) {
  const year = input && Number.isFinite(Number(input.year)) ? Number(input.year) : null;
  const month = input && Number.isFinite(Number(input.month)) ? Number(input.month) : null;
  const corteDay =
    uploadDay && year != null && month != null ? getPronosticoCorteYmdStr(year, month, uploadDay) : null;
  return {
    plant_code: input && input.plant_code ? String(input.plant_code).trim() : null,
    plant_label: input && input.plant_label ? String(input.plant_label).trim() : null,
    year,
    month,
    upload_day: uploadDay,
    corte_day: uploadDay ? corteDay : null,
    cutoff_origin: uploadDay ? input.cutoff_origin || "UNAVAILABLE" : "UNAVAILABLE",
    igf_version_id: input && input.igf_version_id != null ? input.igf_version_id : null,
    igf_version_number: input && input.igf_version_number != null ? input.igf_version_number : null,
  };
}

function readForecastFromMiniPayload(miniPayload, plantLabel, plantCode) {
  if (!miniPayload || !Array.isArray(miniPayload.rows)) {
    return { row: null, row_found: false };
  }
  const row = findMiniRowForPlant(miniPayload.rows, plantLabel, plantCode);
  if (!row) return { row: null, row_found: false };
  return {
    row,
    row_found: true,
    venta: finiteOrNull(row.ventaTon),
    descuento: dashboardDescSigned(row.comDesc),
    utilidad_operativa: finiteOrNull(row.utilOperImporte),
    resultado_final: finiteOrNull(row.resultadoFinalImporte),
  };
}

function readForecastFromMiniAuth(miniAuth) {
  if (!miniAuth || typeof miniAuth !== "object") {
    return { row_found: false };
  }
  const venta = finiteOrNull(miniAuth.venta_ton);
  const descuento = finiteOrNull(miniAuth.desc_kg);
  const utilidad_operativa = finiteOrNull(miniAuth.util_oper_importe);
  const resultado_final = finiteOrNull(miniAuth.resultado_final_importe);
  const row_found = venta != null || descuento != null || utilidad_operativa != null || resultado_final != null;
  return { row_found, venta, descuento, utilidad_operativa, resultado_final };
}

/**
 * @param {object} input
 * @param {string|null} [input.upload_day]
 * @param {object} [input.miniPayload] salida de computeIgfForecastMiniPayload
 * @param {object} [input.miniAuth] fila ya leída (compat CEL tests)
 * @param {boolean} [input.mini_loader_invoked]
 * @param {object} [input.actual_to_date]
 */
function buildAuthoritativeForecastRunPack(input) {
  const src = input && typeof input === "object" ? input : {};
  const uploadDay = parseCutoffYmd(src.upload_day);
  const run_identity = buildRunIdentity(src, uploadDay);
  const actualFromInput = src.actual_to_date || {};

  const target_commitment = emptyTarget();
  const forecast_stored = {
    semantics: PACK_SEMANTICS.FORECAST_STORED,
    note: "FORECAST_STORED vive en assembled/igf.compromiso_lines; no entra a este pack.",
  };

  if (src.source_error) {
    return {
      status: PACK_STATUS.SOURCE_ERROR,
      run_identity,
      forecast: emptyForecast(PACK_STATUS.SOURCE_ERROR),
      actual_to_date: emptyActual(null),
      forecast_stored,
      target_commitment,
      provenance: {
        source: "computeIgfForecastMiniPayload",
        governed_by: "source_error",
        mini_loader_invoked: Boolean(src.mini_loader_invoked),
        row_found: false,
      },
    };
  }

  if (!uploadDay) {
    return {
      status: PACK_STATUS.UNAVAILABLE,
      run_identity,
      forecast: emptyForecast(PACK_STATUS.UNAVAILABLE),
      actual_to_date: emptyActual(null),
      forecast_stored,
      target_commitment,
      provenance: {
        source: "computeIgfForecastMiniPayload",
        governed_by: "unavailable_no_cutoff",
        mini_loader_invoked: false,
        row_found: false,
      },
    };
  }

  const fromRows = readForecastFromMiniPayload(src.miniPayload, src.plant_label, src.plant_code);
  const fromAuth = fromRows.row_found ? fromRows : readForecastFromMiniAuth(src.miniAuth);
  const miniInvoked = src.mini_loader_invoked != null ? Boolean(src.mini_loader_invoked) : Boolean(src.miniPayload || src.miniAuth);
  const available =
    fromAuth.row_found &&
    (fromAuth.venta != null ||
      fromAuth.descuento != null ||
      fromAuth.utilidad_operativa != null ||
      fromAuth.resultado_final != null);

  return {
    status: available ? PACK_STATUS.AVAILABLE : PACK_STATUS.UNAVAILABLE,
    run_identity,
    forecast: {
      venta: available ? fromAuth.venta : null,
      descuento: available ? fromAuth.descuento : null,
      utilidad_operativa: available ? fromAuth.utilidad_operativa : null,
      resultado_final: available ? fromAuth.resultado_final : null,
      status: available ? PACK_STATUS.AVAILABLE : PACK_STATUS.UNAVAILABLE,
      semantics: PACK_SEMANTICS.FORECAST,
    },
    actual_to_date: emptyActual(actualFromInput.venta_ton),
    forecast_stored,
    target_commitment,
    provenance: {
      source: "computeIgfForecastMiniPayload",
      governed_by: available ? "dashboard_authoritative_mini" : "unavailable_no_forecast",
      mini_loader_invoked: miniInvoked,
      row_found: Boolean(fromAuth.row_found),
    },
  };
}

function resolveAuthoritativeForecastRunPack(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.authoritativeForecast && src.authoritativeForecast.forecast) {
    return src.authoritativeForecast;
  }
  const assembled = src.assembled || {};
  const plant = assembled.plant || {};
  const period = (src.forecastParity && src.forecastParity.period) || {};
  const miniAuth = (src.forecastParity && src.forecastParity.mini) || {};
  const actual = (src.forecastParity && src.forecastParity.actual_to_date) || {};
  const igf = assembled.sources && assembled.sources.igf && assembled.sources.igf.payload;
  const uploadDay =
    parseCutoffYmd(src.upload_day) ||
    parseCutoffYmd(miniAuth.cutoff_date) ||
    parseCutoffYmd(period.cutoff_date) ||
    parseCutoffYmd(actual.cutoff_date);
  return buildAuthoritativeForecastRunPack({
    plant_code: src.plant_code || plant.plant_code || null,
    plant_label: src.plant_label || (src.scope && src.scope.plant_name) || plant.planta_nombre || null,
    year: src.year != null ? src.year : period.year,
    month: src.month != null ? src.month : period.month,
    upload_day: uploadDay,
    cutoff_origin: src.cutoff_origin || period.cutoff_origin || (uploadDay ? "UNAVAILABLE" : "UNAVAILABLE"),
    miniPayload: src.miniPayload || null,
    miniAuth,
    mini_loader_invoked: src.mini_loader_invoked,
    actual_to_date: actual,
    igf_version_id: src.igf_version_id != null ? src.igf_version_id : igf && igf.version_id,
    igf_version_number: src.igf_version_number != null ? src.igf_version_number : igf && igf.version_number,
    source_error: src.source_error,
  });
}

module.exports = {
  PACK_STATUS,
  PACK_SEMANTICS,
  buildAuthoritativeForecastRunPack,
  resolveAuthoritativeForecastRunPack,
  readForecastFromMiniPayload,
};
