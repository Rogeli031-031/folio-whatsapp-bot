"use strict";

/**
 * Materialización física FORECAST / FINAL / SUPERSEDED sobre igf.versions.
 * Slice B: finalize + supersede + guardas de mutación. No expone ACTUAL_FINANCIAL.
 */

const path = require("path");
const fs = require("fs");
const { isDirectorZPForDashboard } = require("./dashboard-es-zp");

const FINANCIAL_STATES = Object.freeze({
  FORECAST: "FORECAST",
  FINAL: "FINAL",
  SUPERSEDED: "SUPERSEDED",
});

const MIGRATION_SQL_PATH = path.join(__dirname, "..", "sql", "018_igf_financial_final.sql");

function httpError(status, error, extra) {
  const err = new Error(error);
  err.status = status;
  err.body = extra && typeof extra === "object" ? { error, ...extra } : { error };
  return err;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s+/g, "").toUpperCase();
}

function canFinalizeOrSupersede(auth) {
  if (!auth) return false;
  const role = auth.role;
  const nombre = auth.actor_nombre || auth.rol_nombre || "";
  if (isDirectorZPForDashboard(role, nombre)) return true;
  return dashboardAuthRoleNorm(auth) === "AD";
}

function canonicalFinalizeRole(auth) {
  if (isDirectorZPForDashboard(auth && auth.role, auth && (auth.actor_nombre || auth.rol_nombre))) {
    return "ZP";
  }
  return dashboardAuthRoleNorm(auth);
}

function finalizedByFromAuth(auth) {
  if (!auth || auth.actor_id == null || auth.actor_id === "") return null;
  const id = String(auth.actor_id).trim();
  if (!id) return null;
  return `usuario:${id}|role:${canonicalFinalizeRole(auth)}`;
}

function requireFinalizeActor(auth) {
  if (!canFinalizeOrSupersede(auth)) {
    throw httpError(403, "No autorizado para finalizar o corregir una versión financiera.");
  }
  const finalizedBy = finalizedByFromAuth(auth);
  if (!finalizedBy) {
    throw httpError(403, "No se puede registrar el actor autenticado.");
  }
  return finalizedBy;
}

function parseYearMonth(input) {
  const year = input && input.year != null ? parseInt(String(input.year), 10) : NaN;
  const month = input && input.month != null ? parseInt(String(input.month), 10) : NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw httpError(400, "year y month inválidos");
  }
  return { year, month };
}

function parseVersionRef(input) {
  const versionId =
    input && input.version_id != null && input.version_id !== ""
      ? parseInt(String(input.version_id), 10)
      : null;
  const versionNumber =
    input && input.version_number != null && input.version_number !== ""
      ? parseInt(String(input.version_number), 10)
      : null;
  if (versionId != null && Number.isFinite(versionId) && versionId >= 1) {
    return {
      version_id: versionId,
      version_number: versionNumber != null && Number.isFinite(versionNumber) ? versionNumber : null,
    };
  }
  if (versionNumber != null && Number.isFinite(versionNumber) && versionNumber >= 1) {
    return { version_id: null, version_number: versionNumber };
  }
  throw httpError(400, "Indica version_id o version_number (entero >= 1)");
}

async function applyIgfFinancialFinalMigration(client) {
  const sql = fs.readFileSync(MIGRATION_SQL_PATH, "utf8");
  await client.query(sql);
}

async function loadGlobalVersionForUpdate(client, year, month, ref) {
  let row = null;
  if (ref.version_id != null) {
    const r = await client.query(
      `SELECT id, plant_code, year, month, version_number, financial_state,
              finalized_at, finalized_by, superseded_by_version_id
         FROM igf.versions
        WHERE id = $1::int
        FOR UPDATE`,
      [ref.version_id]
    );
    row = r.rows && r.rows[0] ? r.rows[0] : null;
  } else {
    const r = await client.query(
      `SELECT id, plant_code, year, month, version_number, financial_state,
              finalized_at, finalized_by, superseded_by_version_id
         FROM igf.versions
        WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
          AND version_number = $3::int
        FOR UPDATE`,
      [year, month, ref.version_number]
    );
    row = r.rows && r.rows[0] ? r.rows[0] : null;
  }
  if (!row) throw httpError(404, "No hay versión IGF para ese periodo");
  if (String(row.plant_code || "").trim() !== "GLOBAL") {
    throw httpError(409, "Solo se puede finalizar una versión GLOBAL");
  }
  if (Number(row.year) !== year || Number(row.month) !== month) {
    throw httpError(409, "La versión no corresponde al periodo YYYY-MM indicado");
  }
  if (ref.version_number != null && Number(row.version_number) !== ref.version_number) {
    throw httpError(409, "version_number no coincide con la versión indicada");
  }
  return row;
}

async function loadAuthoritativeFinalForUpdate(client, year, month) {
  const r = await client.query(
    `SELECT id, plant_code, year, month, version_number, financial_state,
            finalized_at, finalized_by, superseded_by_version_id
       FROM igf.versions
      WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
        AND financial_state = 'FINAL'
      FOR UPDATE`,
    [year, month]
  );
  const rows = r.rows || [];
  if (rows.length > 1) {
    throw httpError(409, "Hay más de una versión FINAL vigente para ese periodo");
  }
  return rows[0] || null;
}

function mapVersionRow(row) {
  return {
    version_id: Number(row.id),
    year: Number(row.year),
    month: Number(row.month),
    version_number: row.version_number != null ? Number(row.version_number) : null,
    financial_state: String(row.financial_state || ""),
    finalized_at: row.finalized_at || null,
    finalized_by: row.finalized_by || null,
    superseded_by_version_id:
      row.superseded_by_version_id != null ? Number(row.superseded_by_version_id) : null,
  };
}

async function markFinal(client, versionId, finalizedBy) {
  const r = await client.query(
    `UPDATE igf.versions
        SET financial_state = 'FINAL',
            finalized_at = now(),
            finalized_by = $1,
            superseded_by_version_id = NULL
      WHERE id = $2::int
      RETURNING id, plant_code, year, month, version_number, financial_state,
                finalized_at, finalized_by, superseded_by_version_id`,
    [finalizedBy, versionId]
  );
  return r.rows[0];
}

async function markSuperseded(client, oldId, newId) {
  const r = await client.query(
    `UPDATE igf.versions
        SET financial_state = 'SUPERSEDED',
            superseded_by_version_id = $1::int
      WHERE id = $2::int
      RETURNING id, plant_code, year, month, version_number, financial_state,
                finalized_at, finalized_by, superseded_by_version_id`,
    [newId, oldId]
  );
  return r.rows[0];
}

async function withTransaction(client, fn) {
  await client.query("BEGIN");
  try {
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  }
}

async function finalizeFinancialVersion(client, input, auth) {
  const finalizedBy = requireFinalizeActor(auth);
  const { year, month } = parseYearMonth(input);
  const ref = parseVersionRef(input);

  return withTransaction(client, async () => {
    const target = await loadGlobalVersionForUpdate(client, year, month, ref);
    if (String(target.financial_state || "") === FINANCIAL_STATES.SUPERSEDED) {
      throw httpError(409, "No se puede finalizar una versión SUPERSEDED");
    }
    if (String(target.financial_state || "") === FINANCIAL_STATES.FINAL) {
      throw httpError(409, "La versión ya es FINAL");
    }
    if (String(target.financial_state || FINANCIAL_STATES.FORECAST) !== FINANCIAL_STATES.FORECAST) {
      throw httpError(409, "Solo una versión FORECAST puede pasar a FINAL");
    }
    const existingFinal = await loadAuthoritativeFinalForUpdate(client, year, month);
    if (existingFinal && Number(existingFinal.id) !== Number(target.id)) {
      throw httpError(409, "Ya existe una versión FINAL para ese periodo. Use el flujo de SUPERSEDE.", {
        existing_final_version_id: Number(existingFinal.id),
        require_supersede: true,
      });
    }
    const row = await markFinal(client, Number(target.id), finalizedBy);
    return { ok: true, operation: "finalize", version: mapVersionRow(row) };
  });
}

async function supersedeFinancialVersion(client, input, auth) {
  const finalizedBy = requireFinalizeActor(auth);
  const { year, month } = parseYearMonth(input);
  const newRef = parseVersionRef({
    version_id: input && (input.version_id != null ? input.version_id : input.new_version_id),
    version_number: input && (input.version_number != null ? input.version_number : input.new_version_number),
  });

  return withTransaction(client, async () => {
    const existingFinal = await loadAuthoritativeFinalForUpdate(client, year, month);
    if (!existingFinal) {
      throw httpError(409, "No hay versión FINAL vigente para corregir. Use FINALIZE.");
    }
    const incoming = await loadGlobalVersionForUpdate(client, year, month, newRef);
    if (Number(incoming.id) === Number(existingFinal.id)) {
      throw httpError(409, "La versión de corrección debe ser distinta de la FINAL vigente");
    }
    if (String(incoming.financial_state || "") === FINANCIAL_STATES.SUPERSEDED) {
      throw httpError(409, "No se puede usar una versión SUPERSEDED como corrección");
    }
    if (String(incoming.financial_state || "") === FINANCIAL_STATES.FINAL) {
      throw httpError(409, "La versión de corrección no puede ser FINAL");
    }
    if (String(incoming.financial_state || FINANCIAL_STATES.FORECAST) !== FINANCIAL_STATES.FORECAST) {
      throw httpError(409, "La versión de corrección debe estar en FORECAST");
    }
    const oldRow = await markSuperseded(client, Number(existingFinal.id), Number(incoming.id));
    const newRow = await markFinal(client, Number(incoming.id), finalizedBy);
    return {
      ok: true,
      operation: "supersede",
      superseded: mapVersionRow(oldRow),
      version: mapVersionRow(newRow),
    };
  });
}

const IMMUTABILITY_SQL_PATH = path.join(__dirname, "..", "sql", "019_igf_financial_final_immutability.sql");

async function applyIgfFinancialFinalImmutabilityMigration(client) {
  const sql = fs.readFileSync(IMMUTABILITY_SQL_PATH, "utf8");
  await client.query(sql);
}

async function getVersionFinancialState(client, versionId) {
  const id = parseInt(String(versionId), 10);
  if (!Number.isFinite(id)) return null;
  const r = await client.query(
    `SELECT financial_state FROM igf.versions WHERE id = $1::int LIMIT 1`,
    [id]
  );
  const row = r.rows && r.rows[0] ? r.rows[0] : null;
  if (!row) return null;
  return String(row.financial_state || FINANCIAL_STATES.FORECAST);
}

async function lockVersionFinancialStateForUpdate(client, versionId) {
  const id = parseInt(String(versionId), 10);
  if (!Number.isFinite(id)) {
    return { ok: false, status: 404, error: "No hay versión IGF para ese mes", financial_state: null };
  }
  const r = await client.query(
    `SELECT financial_state FROM igf.versions WHERE id = $1::int FOR UPDATE`,
    [id]
  );
  const row = r.rows && r.rows[0] ? r.rows[0] : null;
  if (!row) {
    return { ok: false, status: 404, error: "No hay versión IGF para ese mes", financial_state: null };
  }
  const state = String(row.financial_state || FINANCIAL_STATES.FORECAST);
  const guard = mutationGuardForState(state);
  return { ...guard, financial_state: state };
}

/** PATCH HG: lock igf.versions.id first (same row as FINALIZE), then UPDATE lines, then COMMIT. */
async function updateCompromisoLinesHgIfForecast(client, versionId, empresa, fields) {
  await client.query("BEGIN");
  try {
    const locked = await lockVersionFinancialStateForUpdate(client, versionId);
    if (!locked.ok) {
      await client.query("ROLLBACK");
      return locked;
    }
    await client.query(
      `UPDATE igf.compromiso_lines SET
         hg_pct = $1, hg_kg = $2,
         util_oper_kg = $3, util_oper_importe = $4,
         resultado_final_kg = $5, resultado_final_importe = $6
       WHERE version_id = $7 AND empresa = $8`,
      [
        fields.hg_pct,
        fields.hg_kg,
        fields.util_oper_kg,
        fields.util_oper_importe,
        fields.resultado_final_kg,
        fields.resultado_final_importe,
        versionId,
        empresa,
      ]
    );
    await client.query("COMMIT");
    return { ok: true, financial_state: FINANCIAL_STATES.FORECAST };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  }
}

function mutationGuardForState(state) {
  const s = String(state || FINANCIAL_STATES.FORECAST);
  if (s === FINANCIAL_STATES.FORECAST) {
    return { ok: true, financial_state: s };
  }
  if (s === FINANCIAL_STATES.FINAL || s === FINANCIAL_STATES.SUPERSEDED) {
    return {
      ok: false,
      status: 409,
      financial_state: s,
      error: "La evidencia financiera FINAL/SUPERSEDED no se puede mutar. Cargue una versión nueva y use SUPERSEDE.",
    };
  }
  return {
    ok: false,
    status: 409,
    financial_state: s,
    error: "Estado financiero desconocido; mutación denegada.",
  };
}

async function assertCompromisoLinesMutable(client, versionId) {
  const state = await getVersionFinancialState(client, versionId);
  if (state == null) {
    return { ok: false, status: 404, error: "No hay versión IGF para ese mes" };
  }
  return mutationGuardForState(state);
}

module.exports = {
  FINANCIAL_STATES,
  MIGRATION_SQL_PATH,
  IMMUTABILITY_SQL_PATH,
  canFinalizeOrSupersede,
  finalizedByFromAuth,
  applyIgfFinancialFinalMigration,
  applyIgfFinancialFinalImmutabilityMigration,
  finalizeFinancialVersion,
  supersedeFinancialVersion,
  assertCompromisoLinesMutable,
  lockVersionFinancialStateForUpdate,
  updateCompromisoLinesHgIfForecast,
  mutationGuardForState,
  getVersionFinancialState,
};
