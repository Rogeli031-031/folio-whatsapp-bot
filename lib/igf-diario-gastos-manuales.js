"use strict";

const { plantsEquivalent } = require("./dashboard-arr-forecast");

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.igf_diario_gastos_manual (
  plant_code VARCHAR(40) NOT NULL,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  operativos NUMERIC(18,2) NULL,
  corporativos NUMERIC(18,2) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  PRIMARY KEY (plant_code, year, month)
)`;

const SELECT_MONTH_SQL = `SELECT plant_code, year, month, operativos, corporativos, updated_at, updated_by
FROM arr.igf_diario_gastos_manual
WHERE year = $1 AND month = $2`;

const SELECT_ONE_SQL = `SELECT plant_code, year, month, operativos, corporativos, updated_at, updated_by
FROM arr.igf_diario_gastos_manual
WHERE plant_code = $1 AND year = $2 AND month = $3`;

const UPSERT_SQL = `INSERT INTO arr.igf_diario_gastos_manual (
  plant_code, year, month, operativos, corporativos, updated_at, updated_by
) VALUES ($1, $2, $3, $4, $5, now(), $6)
ON CONFLICT (plant_code, year, month) DO UPDATE SET
  operativos = EXCLUDED.operativos,
  corporativos = EXCLUDED.corporativos,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by
RETURNING plant_code, year, month, operativos, corporativos, updated_at, updated_by`;

const DELETE_SQL = `DELETE FROM arr.igf_diario_gastos_manual
WHERE plant_code = $1 AND year = $2 AND month = $3`;

function parsePeriod(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return { ok: false, error: "year y month inválidos" };
  }
  return { ok: true, year: y, month: m };
}

function readField(body, key) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) {
    return { present: false, value: null };
  }
  const value = body[key];
  if (value == null) return { present: true, value: null };
  if (typeof value === "boolean" || (typeof value === "object")) {
    return { error: `${key} debe ser numérico o null` };
  }
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return { error: `${key} debe ser numérico o null` };
  return { present: true, value: n };
}

function parsePatch(body) {
  const period = parsePeriod(body && body.year, body && body.month);
  if (!period.ok) return period;
  const plantCode = String((body && body.plant_code) || "").trim();
  if (!plantCode || plantCode.length > 40) return { ok: false, error: "plant_code inválido" };
  const operativos = readField(body, "operativos");
  const corporativos = readField(body, "corporativos");
  if (operativos.error) return { ok: false, error: operativos.error };
  if (corporativos.error) return { ok: false, error: corporativos.error };
  if (!operativos.present && !corporativos.present) {
    return { ok: false, error: "Indica operativos o corporativos" };
  }
  return {
    ok: true,
    year: period.year,
    month: period.month,
    plantCode,
    operativos,
    corporativos,
  };
}

function coerceNullable(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceRow(row) {
  if (!row) return null;
  return {
    plant_code: String(row.plant_code),
    year: Number(row.year),
    month: Number(row.month),
    operativos: coerceNullable(row.operativos),
    corporativos: coerceNullable(row.corporativos),
    updated_at: row.updated_at == null ? null : row.updated_at,
    updated_by: row.updated_by == null ? null : String(row.updated_by),
  };
}

function overrideVisible(auth, plantaId) {
  const role = String((auth && auth.role) || "").toUpperCase();
  const allowed = ((auth && auth.plantas_permitidas) || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  if (["GG", "GA", "AD"].includes(role) && allowed.length > 0) {
    return plantaId != null && allowed.includes(Number(plantaId));
  }
  return true;
}

function effectiveExpense(manual, automatic) {
  if (manual != null) {
    const n = Number(manual);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  if (automatic == null || automatic === "") return null;
  const n = Number(automatic);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function findOverride(overrides, labels) {
  const list = Array.isArray(labels) ? labels : [labels && labels.plant_code, labels && labels.empresa];
  for (const item of overrides || []) {
    if (!item) continue;
    if (list.some((label) => plantsEquivalent(item.plant_code, label))) return item;
  }
  return null;
}

function effectivePair(automatic, overrides, labels) {
  const hit = findOverride(overrides, labels);
  return {
    operativos: effectiveExpense(hit ? hit.operativos : null, automatic && automatic.operativos),
    corporativos: effectiveExpense(hit ? hit.corporativos : null, automatic && automatic.corporativos),
  };
}

function rowExpense(manual, automatic) {
  const value = effectiveExpense(manual, automatic);
  return value == null ? 0 : value;
}

function applyManualGastosToRow(row, overrides) {
  const hit = findOverride(overrides, row);
  const manualOperativos = hit ? hit.operativos : null;
  const manualCorporativos = hit ? hit.corporativos : null;
  const operativos = rowExpense(manualOperativos, row && row.operativos);
  const corporativos = rowExpense(manualCorporativos, row && row.corporativos);
  const ingreso = Number(row && row.ingreso) || 0;
  const gasto = operativos + corporativos;
  const utilOperImporte = ingreso - operativos;
  const resultadoFinalImporte = utilOperImporte - corporativos;
  return {
    ...row,
    ingreso,
    operativos,
    corporativos,
    gasto,
    utilOperImporte,
    resultadoFinalImporte,
    operativosManual: manualOperativos != null,
    corporativosManual: manualCorporativos != null,
  };
}

function applyManualGastosToMini(mini, overrides) {
  if (!mini) return null;
  const source = mini.rows || [];
  const rows = source.map((row) => applyManualGastosToRow(row, overrides));
  const sumB = rows.reduce((sum, row) => sum + (Number(row.ventaTon) || 0), 0);
  const wAvg = (getter) => (
    sumB > 0
      ? Math.round((rows.reduce((sum, row) => sum + getter(row) * (Number(row.ventaTon) || 0), 0) / sumB) * 10000) / 10000
      : 0
  );
  return {
    ...mini,
    rows,
    zona: {
      empresa: "Zona Provincia",
      plant_code: null,
      ventaTon: Math.round(sumB * 100) / 100,
      margen: wAvg((row) => Number(row.margen) || 0),
      comDesc: wAvg((row) => Number(row.comDesc) || 0),
      impuestos: wAvg((row) => Number(row.impuestos) || 0),
      hgKg: wAvg((row) => Number(row.hgKg) || 0),
      ingreso: rows.reduce((sum, row) => sum + (Number(row.ingreso) || 0), 0),
      operativos: rows.reduce((sum, row) => sum + (Number(row.operativos) || 0), 0),
      corporativos: rows.reduce((sum, row) => sum + (Number(row.corporativos) || 0), 0),
      gasto: rows.reduce((sum, row) => sum + (Number(row.gasto) || 0), 0),
      utilOperImporte: rows.reduce((sum, row) => sum + (Number(row.utilOperImporte) || 0), 0),
      resultadoFinalImporte: rows.reduce((sum, row) => sum + (Number(row.resultadoFinalImporte) || 0), 0),
    },
  };
}

async function ensureTable(client) {
  await client.query(ENSURE_SQL);
}

async function listMonth(client, year, month) {
  const period = parsePeriod(year, month);
  if (!period.ok) {
    const error = new Error(period.error);
    error.status = 400;
    throw error;
  }
  await ensureTable(client);
  const result = await client.query(SELECT_MONTH_SQL, [period.year, period.month]);
  return (result.rows || []).map(coerceRow);
}

async function patchManual(client, patch, updatedBy) {
  await ensureTable(client);
  const existingResult = await client.query(SELECT_ONE_SQL, [patch.plantCode, patch.year, patch.month]);
  const existing = coerceRow((existingResult.rows || [])[0]);
  const operativos = patch.operativos.present ? patch.operativos.value : (existing ? existing.operativos : null);
  const corporativos = patch.corporativos.present ? patch.corporativos.value : (existing ? existing.corporativos : null);
  if (operativos == null && corporativos == null) {
    await client.query(DELETE_SQL, [patch.plantCode, patch.year, patch.month]);
    return { ok: true, deleted: true, row: null };
  }
  const saved = await client.query(UPSERT_SQL, [
    patch.plantCode,
    patch.year,
    patch.month,
    operativos,
    corporativos,
    updatedBy || null,
  ]);
  return { ok: true, deleted: false, row: coerceRow((saved.rows || [])[0]) };
}

module.exports = {
  ENSURE_SQL,
  SELECT_MONTH_SQL,
  SELECT_ONE_SQL,
  UPSERT_SQL,
  DELETE_SQL,
  parsePeriod,
  parsePatch,
  coerceRow,
  overrideVisible,
  effectiveExpense,
  effectivePair,
  findOverride,
  applyManualGastosToRow,
  applyManualGastosToMini,
  ensureTable,
  listMonth,
  patchManual,
};
