"use strict";

/**
 * Snapshot ejecutivo de deterioro de rentabilidad.
 * Reutiliza KPIs físicos existentes y computeDeltaIngresoClientesPorMes.
 * No crea Delta Gastos, bridge, atribución monetaria ni controlabilidad.
 */

const { resolveCalendarCompareMonths, calendarMonthBounds } = require("./director-ia-commercial-trend");
const { readIgfForecastMiniAuthoritative } = require("./director-ia-dashboard-forecast-adapter");

const MONTH_NAMES = Object.freeze([
  "",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

function prevCalendarMonth(year, month) {
  if (Number(month) <= 1) return { year: Number(year) - 1, month: 12 };
  return { year: Number(year), month: Number(month) - 1 };
}

function yyyyMm(year, month) {
  return `${Number(year)}-${String(Number(month)).padStart(2, "0")}`;
}

function titleMonth(year, month) {
  const name = MONTH_NAMES[Number(month)] || String(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function formatMxn(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/d";
  const abs = Math.abs(Math.round(n)).toLocaleString("es-MX");
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/d";
  return `${Math.round(n).toLocaleString("es-MX")} kg`;
}

function formatDescKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/d";
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} $/kg`;
}

function commentDateOnly(raw) {
  if (!raw) return "";
  return String(raw instanceof Date ? raw.toISOString() : raw).slice(0, 10);
}

function formatRegisteredComment(comment) {
  if (!comment || !String(comment.body || comment.text || "").trim()) {
    return "Sin comentario registrado";
  }
  const body = String(comment.body || comment.text || "").replace(/\s+/g, " ").trim();
  const day = commentDateOnly(comment.created_at || comment.date);
  const when = day ? ` (${day})` : "";
  return `Comentario registrado${when}: "${body}"`;
}

function volumeFact(kgA, kgB) {
  if (!Number.isFinite(Number(kgA)) || !Number.isFinite(Number(kgB))) return null;
  const a = Number(kgA);
  const b = Number(kgB);
  if (b < a) return `Volumen: bajó (${formatKg(a)} → ${formatKg(b)}).`;
  if (b > a) return `Volumen: subió (${formatKg(a)} → ${formatKg(b)}).`;
  return `Volumen: sin cambio (${formatKg(a)}).`;
}

function discountFact(descA, descB) {
  if (!Number.isFinite(Number(descA)) || !Number.isFinite(Number(descB))) return null;
  const a = Number(descA);
  const b = Number(descB);
  if (b > a) return `Descuento/kg: aumentó (${formatDescKg(a)} → ${formatDescKg(b)}).`;
  if (b < a) return `Descuento/kg: bajó (${formatDescKg(a)} → ${formatDescKg(b)}).`;
  return `Descuento/kg: sin cambio (${formatDescKg(a)}).`;
}

function resolveRentabilidadSnapshotMonths(raw, now) {
  const named = resolveCalendarCompareMonths(raw, now);
  if (named && named.month_a && named.month_b) {
    return {
      month_a: named.month_a,
      month_b: named.month_b,
      period_source: "named_calendar_months",
    };
  }
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : null;
  if (!ref) return null;
  const yearB = ref.getFullYear();
  const monthB = ref.getMonth() + 1;
  if (!Number.isFinite(yearB) || monthB < 1 || monthB > 12) return null;
  const a = prevCalendarMonth(yearB, monthB);
  return {
    month_a: calendarMonthBounds(a.year, a.month),
    month_b: calendarMonthBounds(yearB, monthB),
    period_source: "calendar_now_standalone",
  };
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kpiDelta(a, b) {
  if (a == null || b == null) return null;
  return b - a;
}

async function loadKpiForMonth(deps, plantLabel, plantCode, year, month) {
  if (typeof deps.loadRentabilidadKpis === "function") {
    return deps.loadRentabilidadKpis(deps.client || null, plantLabel, year, month);
  }
  if (typeof deps.loadIgfForecastMiniPayload !== "function") {
    return { ok: false, reason: "kpi_source_unavailable" };
  }
  const mini = await deps.loadIgfForecastMiniPayload(deps.client || deps.pool, {
    year,
    month,
    upload_day: deps.upload_day || null,
  });
  const row = readIgfForecastMiniAuthoritative(mini, plantLabel, plantCode);
  if (row.util_oper_importe == null && row.resultado_final_importe == null) {
    return { ok: false, reason: "kpi_row_missing" };
  }
  return {
    ok: true,
    util_oper_importe: row.util_oper_importe,
    resultado_final_importe: row.resultado_final_importe,
    source_operativa: "util_oper_importe",
    source_final: "resultado_final_importe",
    year,
    month,
  };
}

function buildRentabilidadDeterioroSnapshotAnswer(payload) {
  if (!payload || payload.ok !== true) {
    return (
      (payload && payload.error) ||
      "No pude armar el snapshot de rentabilidad con evidencia disponible. No invento el periodo ni los importes."
    );
  }
  const plant = payload.planta_nombre || "la planta";
  const aLabel = titleMonth(payload.yearA, payload.monthA);
  const bLabel = titleMonth(payload.yearB, payload.monthB);
  const fin = payload.rentabilidad_final || {};
  const op = payload.rentabilidad_operativa || {};
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const lines = [
    `Rentabilidad de ${plant} — ${aLabel} real vs ${bLabel} forecast`,
    "",
    "A. RESULTADO DE RENTABILIDAD",
    `Rentabilidad final (KPI principal; fuente resultado_final_importe):`,
    `A ${payload.periodo_a}: ${formatMxn(fin.a)}`,
    `B ${payload.periodo_b}: ${formatMxn(fin.b)}`,
    `Delta: ${formatMxn(fin.delta)}`,
    `Rentabilidad operativa (contexto; fuente util_oper_importe):`,
    `A ${payload.periodo_a}: ${formatMxn(op.a)}`,
    `B ${payload.periodo_b}: ${formatMxn(op.b)}`,
    `Delta: ${formatMxn(op.delta)}`,
    "",
    "B. PRESIÓN COMERCIAL OBSERVADA",
    `Principales presiones comerciales observadas (Top ${payload.top_n || rows.length}; Delta Ingreso = computeDeltaIngresoClientesPorMes):`,
  ];
  rows.forEach((r, i) => {
    const kgA = r.kg_a != null ? r.kg_a : r.kgA;
    const kgB = r.kg_b != null ? r.kg_b : r.kgB;
    const descA = r.desc_kg_a != null ? r.desc_kg_a : r.descKgA;
    const descB = r.desc_kg_b != null ? r.desc_kg_b : r.descKgB;
    const vol = volumeFact(kgA, kgB);
    const desc = discountFact(descA, descB);
    lines.push(`${i + 1}. ${r.cliente}`);
    lines.push(`   Delta Ingreso: ${formatMxn(r.delta_ingreso)} MXN`);
    if (vol) lines.push(`   ${vol}`);
    if (desc) lines.push(`   ${desc}`);
    lines.push(`   ${formatRegisteredComment(r.comment)}`);
  });
  if (payload.margen_planta_a != null && payload.margen_planta_b != null) {
    lines.push(
      `Margen de planta (contexto, no margen de cliente): A ${payload.margen_planta_a} → B ${payload.margen_planta_b}.`
    );
  }
  lines.push("");
  lines.push("Qué revisar primero:");
  lines.push("- clientes con mayor presión comercial observada;");
  lines.push("- caídas de volumen;");
  lines.push("- cambios de descuento observables.");
  lines.push(
    "Por ahora, las variables comerciales observables que conviene revisar primero son esas. No afirmo cuánto peso tiene cada una."
  );
  lines.push("");
  lines.push("C. LÍMITES DE ATRIBUCIÓN");
  lines.push("- Todavía no existe un Delta Gastos reconciliado con esa rentabilidad.");
  lines.push("- No atribuyo pesos monetarios exactos por driver (volumen, descuento u otro).");
  lines.push("- Los comentarios registrados son contexto, no prueba de causalidad.");
  lines.push("- No existe todavía una clasificación formal de controlabilidad.");
  return lines.join("\n");
}

function buildRentabilidadDeterioroSnapshotPack(payload) {
  if (!payload || payload.ok !== true) return null;
  return {
    period_kind: "forecast_compare",
    period_source: payload.period_source || "calendar_now_standalone",
    periodo_a: payload.periodo_a,
    periodo_b: payload.periodo_b,
    periodoA: { year: payload.yearA, month: payload.monthA, kind: "actual" },
    periodoB: { year: payload.yearB, month: payload.monthB, kind: "forecast" },
    kpi_principal: "resultado_final_importe",
    source_operativa: "util_oper_importe",
    source_final: "resultado_final_importe",
    rentabilidad_final: payload.rentabilidad_final,
    rentabilidad_operativa: payload.rentabilidad_operativa,
    source: payload.source_helper || "computeDeltaIngresoClientesPorMes",
    source_helper: payload.source_helper || "computeDeltaIngresoClientesPorMes",
    physical_source: payload.physical_source || "dashboard-arr-forecast.computeClientesDescuentoMes",
    unit: "MXN",
    top_n: payload.top_n,
    requested_n: payload.requested_n,
    list_total_negative: payload.list_total_negative,
    list_truncated: payload.list_truncated,
    impacto_top_n: payload.impacto_top_n,
    top_negatives: payload.rows,
    rows: payload.rows,
    rows_all: payload.rows_all || [],
    margen_planta_a: payload.margen_planta_a,
    margen_planta_b: payload.margen_planta_b,
  };
}

function buildRentabilidadDeterioroSnapshotChatResult(payload, opts = {}) {
  const planta_id = opts.planta_id != null ? opts.planta_id : payload && payload.planta_id;
  const answer = buildRentabilidadDeterioroSnapshotAnswer(payload);
  const ok = Boolean(payload && payload.ok);
  return {
    ok: true,
    answer,
    sources: ok ? [payload.source_helper || "computeDeltaIngresoClientesPorMes"] : [],
    context_meta: {
      mode: "profitability_deterioro_snapshot",
      requested_domain: "profitability_deterioro_snapshot",
      openai_called: false,
      period_kind: "forecast_compare",
      period_source: (payload && payload.period_source) || null,
      source_helper: (payload && payload.source_helper) || "computeDeltaIngresoClientesPorMes",
      planta_id,
      periodo_a: ok ? payload.periodo_a : undefined,
      periodo_b: ok ? payload.periodo_b : undefined,
      timestamp: new Date().toISOString(),
    },
    profitability_deterioro_snapshot: buildRentabilidadDeterioroSnapshotPack(payload),
  };
}

async function assembleRentabilidadDeterioroSnapshot(deps = {}) {
  const question = deps.question || "";
  const now = deps.now instanceof Date && !Number.isNaN(deps.now.getTime()) ? deps.now : new Date();
  const months = resolveRentabilidadSnapshotMonths(question, now);
  if (!months || !months.month_a || !months.month_b) {
    return {
      ok: false,
      clarification: true,
      error:
        "No pude resolver un periodo seguro para comparar rentabilidad. Precisa los meses. No uso MAX(fecha) ni invento el corte.",
    };
  }
  if (typeof deps.loadDeltaTopN !== "function") {
    return { ok: false, error: "No hay fuente de Delta Ingreso para el snapshot." };
  }
  const delta = await deps.loadDeltaTopN(months, { question, now });
  if (!delta || delta.ok !== true) {
    return {
      ok: false,
      error:
        (delta && delta.error) ||
        "No pude completar la presión comercial con computeDeltaIngresoClientesPorMes. No invento clientes ni importes.",
    };
  }
  const plantLabel = delta.planta_nombre || deps.plantLabel || "";
  const plantCode = deps.plantCode || plantLabel;
  const kpiA = await loadKpiForMonth(deps, plantLabel, plantCode, months.month_a.year, months.month_a.month);
  const kpiB = await loadKpiForMonth(deps, plantLabel, plantCode, months.month_b.year, months.month_b.month);
  const finalA = numOrNull(kpiA && kpiA.resultado_final_importe);
  const finalB = numOrNull(kpiB && kpiB.resultado_final_importe);
  const operA = numOrNull(kpiA && kpiA.util_oper_importe);
  const operB = numOrNull(kpiB && kpiB.util_oper_importe);
  return {
    ok: true,
    planta_id: delta.planta_id,
    planta_nombre: plantLabel,
    yearA: months.month_a.year,
    monthA: months.month_a.month,
    yearB: months.month_b.year,
    monthB: months.month_b.month,
    periodo_a: yyyyMm(months.month_a.year, months.month_a.month),
    periodo_b: yyyyMm(months.month_b.year, months.month_b.month),
    period_source: months.period_source,
    rentabilidad_final: {
      source: "resultado_final_importe",
      a: finalA,
      b: finalB,
      delta: kpiDelta(finalA, finalB),
      periodo_a: yyyyMm(months.month_a.year, months.month_a.month),
      periodo_b: yyyyMm(months.month_b.year, months.month_b.month),
    },
    rentabilidad_operativa: {
      source: "util_oper_importe",
      a: operA,
      b: operB,
      delta: kpiDelta(operA, operB),
    },
    source_helper: delta.source_helper || "computeDeltaIngresoClientesPorMes",
    physical_source: delta.physical_source,
    top_n: delta.top_n,
    requested_n: delta.requested_n,
    list_total_negative: delta.list_total_negative,
    list_truncated: delta.list_truncated,
    impacto_top_n: delta.impacto_top_n,
    rows: delta.rows || [],
    rows_all: delta.rows_all || [],
    margen_planta_a: numOrNull(delta.margen_a != null ? delta.margen_a : delta.margenA),
    margen_planta_b: numOrNull(delta.margen_b != null ? delta.margen_b : delta.margenB),
  };
}

module.exports = {
  resolveRentabilidadSnapshotMonths,
  assembleRentabilidadDeterioroSnapshot,
  buildRentabilidadDeterioroSnapshotAnswer,
  buildRentabilidadDeterioroSnapshotChatResult,
};
