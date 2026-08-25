"use strict";

/**
 * Loader crudo ACTUAL_FINANCIAL (ARCH B, first slice B).
 * Lee igf.versions + igf.compromiso_lines de la única FINAL GLOBAL del YYYY-MM.
 * No HTTP. No GET overlay. Solo financial_state FINAL.
 */

const { isDirectorZPForDashboard } = require("./dashboard-es-zp");
const { findIgfRowForPlant } = require("./director-ia-igf-arr");

const FINANCE_PROVIDED_FIELDS = Object.freeze([
  "venta_ton",
  "margen_kg",
  "com_desc_kg",
  "gasto_kg",
  "impuesto_kg",
  "hg_pct",
  "hg_kg",
  "bancos_planta_kg",
  "provision_planta_kg",
  "util_oper_kg",
  "util_oper_importe",
  "gtos_apoyos_corp_kg",
  "bancos_corp_kg",
  "otros_programas_kg",
  "inversiones_kg",
  "resultado_final_kg",
  "resultado_final_importe",
]);

const FINANCIAL_ACTUAL_CODES = Object.freeze({
  SUPPORTED: "SUPPORTED",
  UNAUTHORIZED: "FINANCIAL_ACTUAL_UNAUTHORIZED",
  MISSING_FOR_PERIOD: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD",
  NOT_FINAL: "FINANCIAL_ACTUAL_NOT_FINAL",
  VERSION_AMBIGUOUS: "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS",
  SOURCE_UNAVAILABLE: "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE",
  LINE_NOT_FOUND_FOR_PLANT: "FINANCIAL_ACTUAL_LINE_NOT_FOUND_FOR_PLANT",
  RECONCILIATION_GAP: "FINANCIAL_ACTUAL_RECONCILIATION_GAP",
});

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s+/g, "").toUpperCase();
}

function canViewFinancialActual(auth, plantaId) {
  if (!auth) return false;
  const nombre = auth.actor_nombre || auth.rol_nombre || "";
  if (isDirectorZPForDashboard(auth.role, nombre)) return true;
  const role = dashboardAuthRoleNorm(auth);
  if (role === "AD") return true;
  if (role === "GG") {
    const pid = Number(plantaId);
    if (!pid) return false;
    const allowed = (auth.plantas_permitidas || []).map((x) => Number(x)).filter(Number.isFinite);
    return allowed.includes(pid);
  }
  return false;
}

function toStoredNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractFinanceProvided(row) {
  const fields = {};
  const field_origin = {};
  for (const key of FINANCE_PROVIDED_FIELDS) {
    fields[key] = toStoredNumber(row[key]);
    field_origin[key] = "FINANCE_PROVIDED";
  }
  return { fields, field_origin };
}

function failFinancialActual(status, extra) {
  return {
    ok: false,
    status,
    truth_class: null,
    source_owner: "FINANZAS",
    source: "igf.compromiso_lines",
    fields: null,
    field_origin: null,
    ...(extra && typeof extra === "object" ? extra : {}),
  };
}

async function loadFinancialActualEvidence(client, input = {}) {
  const year = input.year != null ? parseInt(String(input.year), 10) : NaN;
  const month = input.month != null ? parseInt(String(input.month), 10) : NaN;
  const plant = input.plant || {};
  const plantaId = plant.planta_id != null ? plant.planta_id : input.planta_id;
  const auth = input.auth || {};

  if (!canViewFinancialActual(auth, plantaId)) {
    return failFinancialActual(FINANCIAL_ACTUAL_CODES.UNAUTHORIZED);
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return failFinancialActual(FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE);
  }
  if (!client || typeof client.query !== "function") {
    return failFinancialActual(FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE);
  }

  try {
    const ver = await client.query(
      `SELECT id, version_number, financial_state, finalized_at, finalized_by, created_at
         FROM igf.versions
        WHERE plant_code = 'GLOBAL'
          AND year = $1::int
          AND month = $2::int`,
      [year, month]
    );
    const versions = Array.isArray(ver && ver.rows) ? ver.rows : [];
    const finals = versions.filter((row) => String(row.financial_state || "") === "FINAL");

    if (versions.length === 0) {
      return failFinancialActual(FINANCIAL_ACTUAL_CODES.MISSING_FOR_PERIOD, { year, month });
    }
    if (finals.length === 0) {
      return failFinancialActual(FINANCIAL_ACTUAL_CODES.NOT_FINAL, { year, month });
    }
    if (finals.length > 1) {
      return failFinancialActual(FINANCIAL_ACTUAL_CODES.VERSION_AMBIGUOUS, { year, month });
    }

    const version = finals[0];
    const versionId = Number(version.id);
    const lines = await client.query(
      `SELECT * FROM igf.compromiso_lines WHERE version_id = $1::int ORDER BY empresa`,
      [versionId]
    );
    const matcher = typeof input.findIgfRowForPlant === "function" ? input.findIgfRowForPlant : findIgfRowForPlant;
    const row = matcher(lines.rows || [], plant.plant_code, plant.planta_nombre);
    if (!row) {
      return failFinancialActual(FINANCIAL_ACTUAL_CODES.LINE_NOT_FOUND_FOR_PLANT, {
        year,
        month,
        version_id: versionId,
        version_number: version.version_number != null ? Number(version.version_number) : null,
        financial_state: "FINAL",
      });
    }

    const extracted = extractFinanceProvided(row);
    return {
      ok: true,
      status: FINANCIAL_ACTUAL_CODES.SUPPORTED,
      truth_class: "ACTUAL_FINANCIAL",
      source_owner: "FINANZAS",
      source: "igf.compromiso_lines",
      source_persistence: Object.freeze(["igf.versions", "igf.compromiso_lines"]),
      year,
      month,
      version_id: versionId,
      version_number: version.version_number != null ? Number(version.version_number) : null,
      financial_state: "FINAL",
      finalized_at: version.finalized_at || null,
      finalized_by: version.finalized_by || null,
      created_at: version.created_at || null,
      created_at_role: "upload_timestamp",
      empresa: String(row.empresa || "").trim() || null,
      plant: {
        planta_id: plantaId != null && Number.isFinite(Number(plantaId)) ? Number(plantaId) : null,
        plant_code: plant.plant_code || null,
        planta_nombre: plant.planta_nombre || null,
      },
      fields: extracted.fields,
      field_origin: extracted.field_origin,
    };
  } catch (_err) {
    return failFinancialActual(FINANCIAL_ACTUAL_CODES.SOURCE_UNAVAILABLE, { year, month });
  }
}

module.exports = {
  FINANCE_PROVIDED_FIELDS,
  FINANCIAL_ACTUAL_CODES,
  dashboardAuthRoleNorm,
  canViewFinancialActual,
  extractFinanceProvided,
  loadFinancialActualEvidence,
};
