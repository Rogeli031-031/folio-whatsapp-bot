"use strict";

const FIELDS = {
  precio: { value: "precio", auto: "precioAutomatico", restore: "precioRestore", text: "precioText" },
  costo_kg: { value: "costo", auto: "costoAutomatico", restore: "costoRestore", text: "costoText" },
  flete_kg: { value: "flete", auto: "fleteAutomatico", restore: "fleteRestore", text: "fleteText" },
};

function fechaKey(value) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function storedNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean" || typeof value === "object") return null;
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatManualDisplay(value) {
  const n = storedNumber(value);
  if (n == null) return "";
  let text = n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  if (!text.includes(".")) return `${text}.00`;
  if (text.split(".")[1].length < 2) return n.toFixed(2);
  return text;
}

function calendarDates(desde, hasta) {
  const out = [];
  const cursor = new Date(`${desde}T00:00:00`);
  const end = new Date(`${hasta}T00:00:00`);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function validateMargenRange({ desde, hasta, corte, year, month }) {
  const start = fechaKey(desde);
  const end = fechaKey(hasta);
  const cut = fechaKey(corte);
  if (!start || !end) return { ok: false, error: "Indica desde y hasta" };
  if (start > end) return { ok: false, error: "Desde debe ser menor o igual que Hasta" };
  const prefix = `${Number(year)}-${String(Number(month)).padStart(2, "0")}-`;
  if (!start.startsWith(prefix) || !end.startsWith(prefix)) {
    return { ok: false, error: "La fecha está fuera del mes" };
  }
  if (!cut || start < cut || end < cut) {
    return { ok: false, error: "La fecha es anterior al corte" };
  }
  return { ok: true, fechas: calendarDates(start, end) };
}

function applyDraftField(days, spec) {
  const meta = FIELDS[spec && spec.field];
  if (!meta) return { ok: false, error: "Campo de rango inválido" };
  const range = validateMargenRange(spec);
  if (!range.ok) return range;
  if (!spec.restore) {
    const value = storedNumber(spec.value);
    if (value == null) return { ok: false, error: "El valor debe ser numérico. 0 es válido." };
    spec = { ...spec, value };
  }
  const included = new Set(range.fechas);
  const next = (days || []).map((day) => {
    if (!included.has(day.fecha) || !day.editable) return day;
    if (spec.restore) {
      const auto = day[meta.auto];
      return {
        ...day,
        [meta.value]: auto,
        [meta.restore]: true,
        [meta.text]: formatManualDisplay(auto),
      };
    }
    return {
      ...day,
      [meta.value]: spec.value,
      [meta.restore]: false,
      [meta.text]: formatManualDisplay(spec.value),
    };
  });
  return { ok: true, days: next, fechas: range.fechas };
}

module.exports = {
  FIELDS,
  formatManualDisplay,
  calendarDates,
  validateMargenRange,
  applyDraftField,
};
