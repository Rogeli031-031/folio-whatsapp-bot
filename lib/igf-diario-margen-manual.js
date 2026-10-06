"use strict";

const { usesDetailedExpenseLayout } = require("./igf-diario-expense-layout");
const { plantsEquivalent, canonicalForecastPlantKey } = require("./dashboard-arr-forecast");

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.igf_diario_margen_manual (
  plant_code VARCHAR(40) NOT NULL,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  fecha DATE NOT NULL,
  costo_kg NUMERIC(18,6) NULL,
  flete_kg NUMERIC(18,6) NULL,
  precio NUMERIC(18,6) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  PRIMARY KEY (plant_code, year, month, fecha)
)`;

const ALTER_PRECIO_SQL = `ALTER TABLE arr.igf_diario_margen_manual
ADD COLUMN IF NOT EXISTS precio NUMERIC(18,6) NULL`;

const SELECT_MONTH_SQL = `SELECT plant_code, year, month, fecha, costo_kg, flete_kg, precio
FROM arr.igf_diario_margen_manual
WHERE year = $1 AND month = $2`;

const UPSERT_SQL = `INSERT INTO arr.igf_diario_margen_manual (
  plant_code, year, month, fecha, costo_kg, flete_kg, updated_at, updated_by, precio
) VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8)
ON CONFLICT (plant_code, year, month, fecha) DO UPDATE SET
  costo_kg = EXCLUDED.costo_kg,
  flete_kg = EXCLUDED.flete_kg,
  precio = EXCLUDED.precio,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by`;

const DELETE_SQL = `DELETE FROM arr.igf_diario_margen_manual
WHERE plant_code = $1 AND year = $2 AND month = $3 AND fecha = $4`;

function fail(message, status) {
  const error = new Error(message);
  error.status = status || 400;
  return error;
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

function storedNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return null;
  if (typeof value === "object") return null;
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function periodOf(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return { ok: false, error: "year y month inválidos" };
  }
  return { ok: true, year: y, month: m };
}

function corteOf(value) {
  const corte = fechaKey(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(corte) ? corte : "";
}

function captureEnabled(year, month) {
  return usesDetailedExpenseLayout(year, month);
}

function manualApplies(fecha, corte, year, month) {
  return captureEnabled(year, month) && Boolean(corte) && fecha >= corte;
}

function margenBruto(precio, costo, flete) {
  if (precio == null || costo == null || flete == null) return null;
  if (!Number.isFinite(precio) || !Number.isFinite(costo) || !Number.isFinite(flete)) return null;
  return precio - costo - flete;
}

function plantMatches(row, labels) {
  return (labels || []).some((label) => label && plantsEquivalent(row && row.plant_code, label));
}

function preferField(current, incoming, canonical) {
  if (incoming == null) return current;
  if (canonical || current == null) return incoming;
  return current;
}

function overridesForPlant(rows, labels) {
  const map = new Map();
  const canon = (labels || []).map((label) => canonicalForecastPlantKey(label)).find(Boolean) || "";
  for (const row of rows || []) {
    if (!plantMatches(row, labels)) continue;
    const fecha = fechaKey(row.fecha);
    if (!fecha) continue;
    const prev = map.get(fecha) || { costo_kg: null, flete_kg: null, precio: null };
    const canonical = Boolean(canon) && plantsEquivalent(row.plant_code, canon);
    map.set(fecha, {
      costo_kg: preferField(prev.costo_kg, storedNumber(row.costo_kg), canonical),
      flete_kg: preferField(prev.flete_kg, storedNumber(row.flete_kg), canonical),
      precio: preferField(prev.precio, storedNumber(row.precio), canonical),
    });
  }
  return map;
}

function lookupOverride(overrides, fecha) {
  if (!overrides) return null;
  if (overrides instanceof Map) return overrides.get(fecha) || null;
  const raw = overrides[fecha];
  return raw || null;
}

function appliedManualNumber(overrides, fecha, corte, year, month, field) {
  if (!manualApplies(fechaKey(fecha), corteOf(corte), year, month)) return null;
  const row = lookupOverride(overrides, fechaKey(fecha));
  if (!row) return null;
  return storedNumber(row[field]);
}

function applyMarginOverrides(days, overrides, corte, year, month) {
  const cut = corteOf(corte);
  return (days || []).map((day) => {
    const fecha = fechaKey(day && day.fecha);
    const apply = manualApplies(fecha, cut, year, month);
    const row = apply ? lookupOverride(overrides, fecha) : null;
    const precioManual = row ? storedNumber(row.precio) : null;
    const costoManual = row ? storedNumber(row.costo_kg) : null;
    const fleteManual = row ? storedNumber(row.flete_kg) : null;
    return {
      ...day,
      fecha,
      precio_automatico: storedNumber(day && day.precio),
      costo_automatico: storedNumber(day && day.costoKg),
      flete_automatico: storedNumber(day && day.fleteKg),
      precio: precioManual != null ? precioManual : day && day.precio,
      costoKg: costoManual != null ? costoManual : day && day.costoKg,
      fleteKg: fleteManual != null ? fleteManual : day && day.fleteKg,
      precio_manual: precioManual != null,
      costo_manual: costoManual != null,
      flete_manual: fleteManual != null,
    };
  });
}

function detailFromDays(days, corte, year, month) {
  const cut = corteOf(corte);
  return (days || []).map((day) => {
    const fecha = fechaKey(day && day.fecha);
    const precio = storedNumber(day && day.precio);
    const costo = storedNumber(day && day.costoKg);
    const flete = storedNumber(day && day.fleteKg);
    return {
      fecha,
      precio,
      precio_automatico: day && Object.prototype.hasOwnProperty.call(day, "precio_automatico")
        ? storedNumber(day.precio_automatico)
        : precio,
      precio_manual: Boolean(day && day.precio_manual),
      costo_kg: costo,
      flete_kg: flete,
      costo_automatico: day && Object.prototype.hasOwnProperty.call(day, "costo_automatico")
        ? storedNumber(day.costo_automatico)
        : costo,
      flete_automatico: day && Object.prototype.hasOwnProperty.call(day, "flete_automatico")
        ? storedNumber(day.flete_automatico)
        : flete,
      margen_bruto: margenBruto(precio, costo, flete),
      editable: manualApplies(fecha, cut, year, month),
      costo_manual: Boolean(day && day.costo_manual),
      flete_manual: Boolean(day && day.flete_manual),
    };
  });
}

function readOptionalNumber(body, key) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) return { omitted: true };
  const value = body[key];
  if (value == null) return { omitted: false, value: null };
  if (typeof value === "boolean" || (typeof value === "object")) {
    return { error: `${key} debe ser numérico` };
  }
  if (typeof value === "string" && value.trim() === "") return { error: `${key} debe ser numérico` };
  const n = storedNumber(value);
  if (n == null) return { error: `${key} debe ser numérico` };
  return { omitted: false, value: n };
}

function monthLastDay(year, month) {
  return new Date(year, month, 0).getDate();
}

function parsePatch(body) {
  const period = periodOf(body && body.year, body && body.month);
  if (!period.ok) return period;
  if (!captureEnabled(period.year, period.month)) {
    return { ok: false, error: "La captura de margen diario aplica desde octubre 2026" };
  }
  const plantCode = String((body && body.plant_code) || "").trim();
  if (!plantCode || plantCode.length > 40) return { ok: false, error: "plant_code inválido" };
  const corte = corteOf(body && body.upload_day);
  if (!corte) return { ok: false, error: "upload_day debe ser YYYY-MM-DD" };
  const changes = Array.isArray(body && body.changes) ? body.changes : null;
  if (!changes || !changes.length) return { ok: false, error: "changes es obligatorio" };
  const prefix = `${period.year}-${String(period.month).padStart(2, "0")}-`;
  const last = monthLastDay(period.year, period.month);
  const parsed = [];
  for (const change of changes) {
    const fecha = fechaKey(change && change.fecha);
    if (!fecha.startsWith(prefix)) return { ok: false, error: "La fecha está fuera del mes" };
    const day = Number(fecha.slice(8, 10));
    if (day < 1 || day > last) return { ok: false, error: "La fecha está fuera del mes" };
    if (fecha < corte) return { ok: false, error: "La fecha es anterior al corte" };
    const precio = readOptionalNumber(change, "precio");
    if (precio.error) return { ok: false, error: precio.error };
    const costo = readOptionalNumber(change, "costo_kg");
    if (costo.error) return { ok: false, error: costo.error };
    const flete = readOptionalNumber(change, "flete_kg");
    if (flete.error) return { ok: false, error: flete.error };
    if (precio.omitted && costo.omitted && flete.omitted) return { ok: false, error: "Indica precio, costo_kg o flete_kg" };
    parsed.push({
      fecha,
      precio: precio.omitted ? undefined : precio.value,
      costo: costo.omitted ? undefined : costo.value,
      flete: flete.omitted ? undefined : flete.value,
    });
  }
  return {
    ok: true,
    year: period.year,
    month: period.month,
    plantCode,
    corte,
    changes: parsed,
  };
}

async function ensureTable(client) {
  await client.query(ENSURE_SQL);
  await client.query(ALTER_PRECIO_SQL);
}

async function listMonthOverrides(client, year, month) {
  await ensureTable(client);
  const result = await client.query(SELECT_MONTH_SQL, [year, month]);
  return result.rows || [];
}

async function patchMarginOverrides(client, patch, canon, updatedBy) {
  await client.query("BEGIN");
  try {
    await ensureTable(client);
    const existing = await listMonthOverrides(client, patch.year, patch.month);
    const mine = overridesForPlant(existing, [canon, patch.plantCode]);
    for (const change of patch.changes) {
      const prev = mine.get(change.fecha) || { costo_kg: null, flete_kg: null, precio: null };
      const precio = change.precio === undefined ? prev.precio : change.precio;
      const costo = change.costo === undefined ? prev.costo_kg : change.costo;
      const flete = change.flete === undefined ? prev.flete_kg : change.flete;
      const aliases = (existing || []).filter((row) => fechaKey(row.fecha) === change.fecha && plantMatches(row, [canon, patch.plantCode]));
      for (const row of aliases) {
        if (!plantsEquivalent(row.plant_code, canon)) {
          await client.query(DELETE_SQL, [row.plant_code, patch.year, patch.month, change.fecha]);
        }
      }
      if (precio == null && costo == null && flete == null) {
        await client.query(DELETE_SQL, [canon, patch.year, patch.month, change.fecha]);
        mine.delete(change.fecha);
      } else {
        await client.query(UPSERT_SQL, [canon, patch.year, patch.month, change.fecha, costo, flete, updatedBy || null, precio]);
        mine.set(change.fecha, { costo_kg: costo, flete_kg: flete, precio, plant_code: canon });
      }
    }
    await client.query("COMMIT");
    return mine;
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
  ALTER_PRECIO_SQL,
  storedNumber,
  margenBruto,
  manualApplies,
  captureEnabled,
  overridesForPlant,
  appliedManualNumber,
  applyMarginOverrides,
  detailFromDays,
  parsePatch,
  ensureTable,
  listMonthOverrides,
  patchMarginOverrides,
  fechaKey,
  corteOf,
};
