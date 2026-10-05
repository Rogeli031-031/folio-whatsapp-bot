"use strict";

const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");
const { monthBusinessDays } = require("./igf-diario-puebla");
const gastosManuales = require("./igf-diario-gastos-manuales");

const CONCEPTS = [
  "gasto_corporativo",
  "inversiones",
  "impuestos_federales",
  "presupuesto_nomina_gastos",
  "presupuesto_imss_sua",
  "extraordinarios",
  "provisiones_planta",
];
const CORP_KEYS = CONCEPTS.slice(0, 3);
const OPER_KEYS = CONCEPTS.slice(3);
const IMPOSSIBLE = "No hay días hábiles posteriores para redistribuir esta diferencia.";

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.igf_diario_gastos_distribucion_manual (
  plant_code VARCHAR(40) NOT NULL,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  concepto VARCHAR(40) NOT NULL,
  fecha DATE NOT NULL,
  importe NUMERIC(18,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  PRIMARY KEY (plant_code, year, month, concepto, fecha)
)`;

const SELECT_PLANT_SQL = `SELECT concepto, fecha, importe
FROM arr.igf_diario_gastos_distribucion_manual
WHERE plant_code = $1 AND year = $2 AND month = $3`;

const SELECT_DESGLOSE_SQL = `SELECT plant_code, gasto_corporativo, inversiones, impuestos_federales,
  presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta
FROM arr.igf_diario_gastos_desglose
WHERE plant_code = $1 AND year = $2 AND month = $3`;

const UPSERT_SQL = `INSERT INTO arr.igf_diario_gastos_distribucion_manual (
  plant_code, year, month, concepto, fecha, importe, updated_at, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
ON CONFLICT (plant_code, year, month, concepto, fecha) DO UPDATE SET
  importe = EXCLUDED.importe,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by`;

const DELETE_SQL = `DELETE FROM arr.igf_diario_gastos_distribucion_manual
WHERE plant_code = $1 AND year = $2 AND month = $3 AND concepto = $4 AND fecha = $5`;

function toCents(value) {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function fromCents(cents) {
  return cents / 100;
}

function fechaKey(value) {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function roundedShare(remainingCents, remainingDays) {
  if (remainingDays <= 1) return remainingCents;
  return Math.round(remainingCents / remainingDays);
}

function normalizeOverrides(overrides) {
  const map = new Map();
  if (!overrides) return map;
  if (overrides instanceof Map) {
    for (const [fecha, cents] of overrides.entries()) {
      const key = fechaKey(fecha);
      if (key && Number.isInteger(cents)) map.set(key, cents);
    }
    return map;
  }
  for (const [fecha, raw] of Object.entries(overrides)) {
    const key = fechaKey(fecha);
    const cents = toCents(raw);
    if (key && cents != null) map.set(key, cents);
  }
  return map;
}

function buildExpenseDailySchedule({ monthlyAmount, days, overrides }) {
  const monthlyCents = toCents(monthlyAmount);
  const list = Array.isArray(days) ? days : [];
  if (monthlyCents == null) {
    return failSchedule("Monto mensual inválido", list);
  }
  const map = normalizeOverrides(overrides);
  let remaining = monthlyCents;
  let remainingDays = list.filter((day) => day && !day.inhabil).length;
  const out = [];
  let negative = false;
  for (const day of list) {
    const fecha = fechaKey(day && day.fecha);
    const habil = Boolean(day && !day.inhabil);
    if (!habil) {
      out.push({ fecha, habil: false, cents: 0, manual: false, editable: false });
      continue;
    }
    const manual = map.has(fecha);
    const cents = manual ? map.get(fecha) : roundedShare(remaining, remainingDays);
    if (!Number.isInteger(cents) || cents < 0) negative = true;
    out.push({
      fecha,
      habil: true,
      cents: Number.isInteger(cents) ? cents : 0,
      manual,
      editable: true,
    });
    remaining -= Number.isInteger(cents) ? cents : 0;
    remainingDays -= 1;
  }
  const sum = out.reduce((acc, day) => acc + day.cents, 0);
  const closed = !negative && sum === monthlyCents;
  return viewFrom(monthlyCents, out, closed ? null : IMPOSSIBLE);
}

function failSchedule(error, list) {
  const out = (list || []).map((day) => ({
    fecha: fechaKey(day && day.fecha),
    habil: Boolean(day && !day.inhabil),
    cents: 0,
    manual: false,
    editable: Boolean(day && !day.inhabil),
  }));
  return viewFrom(0, out, error);
}

function viewFrom(monthlyCents, out, error) {
  const manualAssigned = out.filter((day) => day.manual).reduce((acc, day) => acc + day.cents, 0);
  const businessDays = out.filter((day) => day.habil).length;
  const autoDays = out.filter((day) => day.habil && !day.manual).length;
  const remainingAmountCents = monthlyCents - manualAssigned;
  const byFecha = {};
  for (const day of out) byFecha[day.fecha] = fromCents(day.cents);
  return {
    ok: error == null,
    error,
    monthly_amount: fromCents(monthlyCents),
    monthly_cents: monthlyCents,
    business_days: businessDays,
    manual_assigned: fromCents(manualAssigned),
    remaining_amount: fromCents(remainingAmountCents),
    remaining_business_days: autoDays,
    remaining_average: autoDays > 0 ? Math.round(remainingAmountCents / autoDays) / 100 : null,
    initial_average: businessDays > 0 ? Math.round(monthlyCents / businessDays) / 100 : null,
    days: out.map((day) => ({
      fecha: day.fecha,
      habil: day.habil,
      importe_asignado: fromCents(day.cents),
      manual: day.manual,
      editable: day.editable,
    })),
    byFecha,
  };
}

function validateExpenseDailySchedule(spec) {
  const built = buildExpenseDailySchedule(spec);
  return { ok: built.ok, error: built.error };
}

function sumAssignedForWeek(schedule, weekDays) {
  const byFecha = schedule && schedule.byFecha ? schedule.byFecha : schedule || {};
  let cents = 0;
  for (const day of weekDays || []) {
    const money = byFecha[fechaKey(day && day.fecha)];
    const part = toCents(money);
    if (part != null) cents += part;
  }
  return fromCents(cents);
}

function findManualOverride(overrides, fecha) {
  const map = normalizeOverrides(overrides);
  const key = fechaKey(fecha);
  return map.has(key) ? map.get(key) : null;
}

function conceptKeys(concepto) {
  if (CORP_KEYS.includes(concepto)) return CORP_KEYS;
  if (OPER_KEYS.includes(concepto)) return OPER_KEYS;
  return null;
}

function activeAmount(row, concepto) {
  const keys = conceptKeys(concepto);
  if (!row || !keys) return null;
  if (!keys.every((key) => row[key] != null && Number.isFinite(Number(row[key])))) return null;
  return Number(row[concepto]);
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status || 400;
  return error;
}

function periodOf(year, month) {
  const period = gastosManuales.parsePeriod(year, month);
  if (!period.ok) return period;
  if (!usesDetailedExpenseLayout(period.year, period.month)) {
    return { ok: false, error: "La distribución diaria aplica desde octubre 2026" };
  }
  return period;
}

function parseQuery(query) {
  const period = periodOf(query && query.year, query && query.month);
  if (!period.ok) return period;
  const plantCode = String((query && query.plant_code) || "").trim();
  if (!plantCode || plantCode.length > 40) return { ok: false, error: "plant_code inválido" };
  const concepto = String((query && query.concepto) || "").trim();
  if (!CONCEPTS.includes(concepto)) return { ok: false, error: "concepto inválido" };
  return { ok: true, year: period.year, month: period.month, plantCode, concepto };
}

function parseImporte(value) {
  if (value == null) return { restore: true, cents: null };
  if (typeof value === "boolean" || (typeof value === "object" && !Array.isArray(value) && value !== null && !(value instanceof Number))) {
    return { error: "importe debe ser numérico" };
  }
  if (typeof value === "string" && value.trim() === "") return { error: "importe debe ser numérico" };
  const cents = toCents(value);
  if (cents == null) return { error: "importe debe ser numérico" };
  if (cents < 0) return { error: "importe no puede ser negativo" };
  return { restore: false, cents, amount: fromCents(cents) };
}

function parsePatch(body) {
  const query = parseQuery(body || {});
  if (!query.ok) return query;
  const fecha = fechaKey(body && body.fecha);
  const prefix = `${query.year}-${String(query.month).padStart(2, "0")}-`;
  if (!fecha.startsWith(prefix)) return { ok: false, error: "La fecha está fuera del mes" };
  if (!body || !Object.prototype.hasOwnProperty.call(body, "importe")) {
    return { ok: false, error: "importe es obligatorio" };
  }
  const money = parseImporte(body.importe);
  if (money.error) return { ok: false, error: money.error };
  return { ...query, fecha, restore: money.restore, cents: money.cents, amount: money.amount };
}

function rowsToMaps(rows) {
  const grouped = new Map();
  for (const row of rows || []) {
    const concepto = String(row.concepto || "");
    if (!CONCEPTS.includes(concepto)) continue;
    if (!grouped.has(concepto)) grouped.set(concepto, new Map());
    const cents = toCents(row.importe);
    const fecha = fechaKey(row.fecha);
    if (fecha && cents != null) grouped.get(concepto).set(fecha, cents);
  }
  return grouped;
}

async function ensureTable(client) {
  await client.query(ENSURE_SQL);
}

async function loadOverrides(client, plantCode, year, month) {
  const result = await client.query(SELECT_PLANT_SQL, [plantCode, year, month]);
  return rowsToMaps(result.rows || []);
}

async function loadDesglose(client, plantCode, year, month) {
  const result = await client.query(SELECT_DESGLOSE_SQL, [plantCode, year, month]);
  return (result.rows || [])[0] || null;
}

function publicSchedule(plantCode, year, month, concepto, built) {
  return {
    ok: built.ok,
    error: built.error,
    year,
    month,
    plant_code: plantCode,
    concepto,
    monthly_amount: built.monthly_amount,
    business_days: built.business_days,
    manual_assigned: built.manual_assigned,
    remaining_amount: built.remaining_amount,
    remaining_business_days: built.remaining_business_days,
    remaining_average: built.remaining_average,
    initial_average: built.initial_average,
    days: built.days,
  };
}

async function scheduleFor(client, spec) {
  const amount = activeAmount(await loadDesglose(client, spec.plantCode, spec.year, spec.month), spec.concepto);
  if (amount == null) throw fail("El concepto no tiene un monto mensual activo");
  const grouped = await loadOverrides(client, spec.plantCode, spec.year, spec.month);
  const cal = monthBusinessDays(spec.year, spec.month);
  const built = buildExpenseDailySchedule({
    monthlyAmount: amount,
    days: cal.days,
    overrides: grouped.get(spec.concepto) || new Map(),
  });
  return publicSchedule(spec.plantCode, spec.year, spec.month, spec.concepto, built);
}

async function getSchedule(client, spec) {
  await ensureTable(client);
  return scheduleFor(client, spec);
}

async function patchDistribucion(client, patch, updatedBy) {
  await client.query("BEGIN");
  try {
    await ensureTable(client);
    const cal = monthBusinessDays(patch.year, patch.month);
    const day = cal.days.find((item) => item.fecha === patch.fecha);
    if (!day) throw fail("La fecha está fuera del mes");
    if (day.inhabil) throw fail("La fecha no es hábil");
    const amount = activeAmount(await loadDesglose(client, patch.plantCode, patch.year, patch.month), patch.concepto);
    if (amount == null) throw fail("El concepto no tiene un monto mensual activo");
    const grouped = await loadOverrides(client, patch.plantCode, patch.year, patch.month);
    const next = new Map(grouped.get(patch.concepto) || []);
    if (patch.restore) next.delete(patch.fecha);
    else next.set(patch.fecha, patch.cents);
    const built = buildExpenseDailySchedule({
      monthlyAmount: amount,
      days: cal.days,
      overrides: next,
    });
    if (!built.ok) throw fail(built.error);
    if (patch.restore) {
      await client.query(DELETE_SQL, [patch.plantCode, patch.year, patch.month, patch.concepto, patch.fecha]);
    } else {
      await client.query(UPSERT_SQL, [
        patch.plantCode,
        patch.year,
        patch.month,
        patch.concepto,
        patch.fecha,
        patch.amount,
        updatedBy || null,
      ]);
    }
    await client.query("COMMIT");
    return publicSchedule(patch.plantCode, patch.year, patch.month, patch.concepto, built);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  }
}

async function assertAmountsCompatible(client, spec) {
  await ensureTable(client);
  const grouped = await loadOverrides(client, spec.plantCode, spec.year, spec.month);
  if (!grouped.size) return;
  const cal = monthBusinessDays(spec.year, spec.month);
  for (const [concepto, amount] of Object.entries(spec.amounts || {})) {
    const overrides = grouped.get(concepto);
    if (!overrides || !overrides.size) continue;
    const built = buildExpenseDailySchedule({
      monthlyAmount: amount,
      days: cal.days,
      overrides,
    });
    if (!built.ok) {
      throw fail(`${built.error} Ajusta o restaura los días fijos antes de cambiar el monto mensual.`);
    }
  }
}

async function overridesForPlant(client, year, month, plantCode) {
  if (!plantCode || !usesDetailedExpenseLayout(year, month)) return null;
  await ensureTable(client);
  const grouped = await loadOverrides(client, plantCode, year, month);
  const out = {};
  for (const [concepto, map] of grouped.entries()) {
    out[concepto] = {};
    for (const [fecha, cents] of map.entries()) out[concepto][fecha] = fromCents(cents);
  }
  return out;
}

module.exports = {
  CONCEPTS,
  CORP_KEYS,
  OPER_KEYS,
  IMPOSSIBLE,
  ENSURE_SQL,
  toCents,
  fromCents,
  fechaKey,
  buildExpenseDailySchedule,
  validateExpenseDailySchedule,
  sumAssignedForWeek,
  findManualOverride,
  parseQuery,
  parsePatch,
  ensureTable,
  getSchedule,
  patchDistribucion,
  assertAmountsCompatible,
  overridesForPlant,
};
