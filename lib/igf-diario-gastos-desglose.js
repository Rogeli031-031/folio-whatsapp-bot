"use strict";

const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");
const gastosManuales = require("./igf-diario-gastos-manuales");
const { plantsEquivalent } = require("./dashboard-arr-forecast");

const CORP_KEYS = ["gasto_corporativo", "inversiones", "impuestos_federales"];
const OPER_KEYS = ["presupuesto_nomina_gastos", "presupuesto_imss_sua", "extraordinarios", "provisiones_planta"];
const ALL_KEYS = CORP_KEYS.concat(OPER_KEYS);

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.igf_diario_gastos_desglose (
  plant_code VARCHAR(40) NOT NULL,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  gasto_corporativo NUMERIC(18,2) NULL,
  inversiones NUMERIC(18,2) NULL,
  impuestos_federales NUMERIC(18,2) NULL,
  presupuesto_nomina_gastos NUMERIC(18,2) NULL,
  presupuesto_imss_sua NUMERIC(18,2) NULL,
  extraordinarios NUMERIC(18,2) NULL,
  provisiones_planta NUMERIC(18,2) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  PRIMARY KEY (plant_code, year, month)
)`;

const SELECT_MONTH_SQL = `SELECT plant_code, year, month, gasto_corporativo, inversiones, impuestos_federales,
  presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta, updated_at, updated_by
FROM arr.igf_diario_gastos_desglose
WHERE year = $1 AND month = $2`;

const UPSERT_CORP_SQL = `INSERT INTO arr.igf_diario_gastos_desglose (
  plant_code, year, month, gasto_corporativo, inversiones, impuestos_federales, updated_at, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
ON CONFLICT (plant_code, year, month) DO UPDATE SET
  gasto_corporativo = EXCLUDED.gasto_corporativo,
  inversiones = EXCLUDED.inversiones,
  impuestos_federales = EXCLUDED.impuestos_federales,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by
RETURNING plant_code, year, month, gasto_corporativo, inversiones, impuestos_federales,
  presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta, updated_at, updated_by`;

const UPSERT_OPER_SQL = `INSERT INTO arr.igf_diario_gastos_desglose (
  plant_code, year, month, presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta, updated_at, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8)
ON CONFLICT (plant_code, year, month) DO UPDATE SET
  presupuesto_nomina_gastos = EXCLUDED.presupuesto_nomina_gastos,
  presupuesto_imss_sua = EXCLUDED.presupuesto_imss_sua,
  extraordinarios = EXCLUDED.extraordinarios,
  provisiones_planta = EXCLUDED.provisiones_planta,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by
RETURNING plant_code, year, month, gasto_corporativo, inversiones, impuestos_federales,
  presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta, updated_at, updated_by`;

function sumMoney(values) {
  const cents = (values || []).reduce((sum, value) => sum + Math.round(Number(value) * 100), 0);
  return cents / 100;
}

function moneyOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function readRequiredMoney(body, key) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key) || body[key] == null || body[key] === "") {
    return { error: `${key} es obligatorio` };
  }
  if (typeof body[key] === "boolean" || typeof body[key] === "object") {
    return { error: `${key} debe ser numérico` };
  }
  const raw = typeof body[key] === "string" ? body[key].trim() : body[key];
  if (raw === "") return { error: `${key} es obligatorio` };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { error: `${key} debe ser numérico` };
  return { value: Math.round(n * 100) / 100 };
}

function parsePatch(body) {
  const period = gastosManuales.parsePeriod(body && body.year, body && body.month);
  if (!period.ok) return period;
  if (!usesDetailedExpenseLayout(period.year, period.month)) {
    return { ok: false, error: "El desglose aplica desde octubre 2026" };
  }
  const plantCode = String((body && body.plant_code) || "").trim();
  if (!plantCode || plantCode.length > 40) return { ok: false, error: "plant_code inválido" };
  const group = body && body.group;
  if (group !== "corporativos" && group !== "operativos") {
    return { ok: false, error: "group debe ser corporativos u operativos" };
  }
  const keys = group === "corporativos" ? CORP_KEYS : OPER_KEYS;
  const values = {};
  for (const key of keys) {
    const read = readRequiredMoney(body, key);
    if (read.error) return { ok: false, error: read.error };
    values[key] = read.value;
  }
  return {
    ok: true,
    year: period.year,
    month: period.month,
    plantCode,
    group,
    values,
    total: sumMoney(keys.map((key) => values[key])),
  };
}

function coerceRow(row) {
  if (!row) return null;
  const out = {
    plant_code: String(row.plant_code),
    year: Number(row.year),
    month: Number(row.month),
    updated_at: row.updated_at == null ? null : row.updated_at,
    updated_by: row.updated_by == null ? null : String(row.updated_by),
  };
  for (const key of ALL_KEYS) out[key] = moneyOrNull(row[key]);
  return out;
}

function groupActive(row, keys) {
  return keys.every((key) => row && row[key] != null && Number.isFinite(Number(row[key])));
}

function publicRow(row, year, month) {
  const source = row || {
    plant_code: "",
    year,
    month,
  };
  const componentes = {};
  for (const key of ALL_KEYS) componentes[key] = source[key] == null ? null : moneyOrNull(source[key]);
  const corporativos = groupActive(source, CORP_KEYS);
  const operativos = groupActive(source, OPER_KEYS);
  return {
    plant_code: source.plant_code || "",
    year: Number(source.year == null ? year : source.year),
    month: Number(source.month == null ? month : source.month),
    componentes,
    corporativos_desglosados: corporativos,
    operativos_desglosados: operativos,
    corporativos_total_desglose: corporativos ? sumMoney(CORP_KEYS.map((key) => source[key])) : null,
    operativos_total_desglose: operativos ? sumMoney(OPER_KEYS.map((key) => source[key])) : null,
  };
}

function findRow(rows, labels) {
  const list = Array.isArray(labels) ? labels : [labels];
  for (const item of rows || []) {
    if (!item) continue;
    if (list.some((label) => plantsEquivalent(item.plant_code, label))) return item;
  }
  return null;
}

function excelPacket(year, month, effective, row) {
  const packet = {
    corporativos: effective && effective.corporativos != null ? effective.corporativos : null,
    operativos: effective && effective.operativos != null ? effective.operativos : null,
    desglose: null,
  };
  if (!usesDetailedExpenseLayout(year, month)) return packet;
  const view = publicRow(row, year, month);
  if (view.corporativos_desglosados) packet.corporativos = view.corporativos_total_desglose;
  if (view.operativos_desglosados) packet.operativos = view.operativos_total_desglose;
  packet.desglose = view;
  return packet;
}

async function ensureTable(client) {
  await client.query(ENSURE_SQL);
}

async function listMonth(client, year, month) {
  const period = gastosManuales.parsePeriod(year, month);
  if (!period.ok) {
    const error = new Error(period.error);
    error.status = 400;
    throw error;
  }
  await ensureTable(client);
  const result = await client.query(SELECT_MONTH_SQL, [period.year, period.month]);
  return (result.rows || []).map(coerceRow);
}

async function patchDesglose(client, patch, updatedBy) {
  await client.query("BEGIN");
  try {
    await ensureTable(client);
    const params = patch.group === "corporativos"
      ? [
        patch.plantCode,
        patch.year,
        patch.month,
        patch.values.gasto_corporativo,
        patch.values.inversiones,
        patch.values.impuestos_federales,
        updatedBy || null,
      ]
      : [
        patch.plantCode,
        patch.year,
        patch.month,
        patch.values.presupuesto_nomina_gastos,
        patch.values.presupuesto_imss_sua,
        patch.values.extraordinarios,
        patch.values.provisiones_planta,
        updatedBy || null,
      ];
    const saved = await client.query(patch.group === "corporativos" ? UPSERT_CORP_SQL : UPSERT_OPER_SQL, params);
    const row = coerceRow((saved.rows || [])[0]);
    await gastosManuales.upsertGroupTotal(client, {
      plantCode: patch.plantCode,
      year: patch.year,
      month: patch.month,
      field: patch.group,
      value: patch.total,
      updatedBy,
    });
    await client.query("COMMIT");
    return { ok: true, row: publicRow(row, patch.year, patch.month) };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  }
}

module.exports = {
  ENSURE_SQL,
  SELECT_MONTH_SQL,
  UPSERT_CORP_SQL,
  UPSERT_OPER_SQL,
  CORP_KEYS,
  OPER_KEYS,
  usesDetailedExpenseLayout,
  sumMoney,
  parsePatch,
  coerceRow,
  publicRow,
  findRow,
  excelPacket,
  ensureTable,
  listMonth,
  patchDesglose,
};
