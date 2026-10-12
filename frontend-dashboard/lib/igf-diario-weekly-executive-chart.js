"use strict";

const GASTO_COMPONENTS = [
  "gasto_corporativo_kg",
  "inversiones_kg",
  "impuestos_federales_kg",
  "presupuesto_nomina_gastos_kg",
  "presupuesto_imss_sua_kg",
  "extraordinarios_kg",
  "provisiones_planta_kg",
];
const EXCLUDED_FROM_GASTO = ["costo_kg", "flete_kg", "hg_mxn", "hg_kg"];

const INDICATORS = [
  { id: "precio", group: "RENTABILIDAD", label: "Precio de Venta al Público", unit: "$/kg", weeklyKey: "precio_kg", dailyKey: "precio_kg", sense: "up" },
  { id: "gasto", group: "GASTO", label: "GASTO", unit: "$/kg", sense: "down", gasto: true },
  { id: "margen", group: "MARGEN BRUTO", label: "Margen Bruto", unit: "$/kg", weeklyKey: "margen_kg", dailyKey: "margen_kg", sense: "up" },
  { id: "com_desc", group: "COMISIONES Y DESCUENTOS", label: "Comisiones y Descuentos", unit: "$/kg", weeklyKey: "com_desc_kg", dailyKey: "com_desc_kg", sense: "up" },
  { id: "hg", group: "HG ($)", label: "HG", unit: "$", weeklyKey: "hg_mxn", dailyKey: "hg_mxn", sense: "down" },
  { id: "kilos", group: "KILOS / VENTA", label: "Kilos / Venta", unit: "kg", weeklyKey: "venta_kg", dailyKey: "venta_kg", sense: "up" },
  { id: "costo", group: "COSTO DEL GAS LP", label: "Costo del Gas LP", unit: "$/kg", weeklyKey: "costo_kg", dailyKey: "costo_kg", sense: "down" },
  { id: "flete", group: "FLETE TERRESTRE", label: "Flete Terrestre", unit: "$/kg", weeklyKey: "flete_kg", dailyKey: "flete_kg", sense: "down" },
  { id: "descuento_compra", group: "DESCUENTO COMPRA", label: "Descuento Compra", unit: "$/kg", pending: true },
  { id: "venta_casa", group: "VENTA CASA", label: "Venta Casa", unit: "kg", channel: "venta_casa_kg", sense: "up" },
  { id: "venta_comisionista", group: "VENTA COMISIONISTA", label: "Venta Comisionista", unit: "kg", channel: "venta_comisionista_kg", sense: "up" },
  { id: "resultado", group: "RESULTADO", label: "Resultado", unit: "$", weeklyKey: "resultado_mxn", dailyKey: "resultado_mxn", sense: "up" },
];

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function weekId(week) {
  return String(week && (week.id || week.fecha_desde) || "");
}

function byDate(left, right) {
  return String(left.fecha_desde).localeCompare(String(right.fecha_desde));
}

function defaultSelectedIds(weeks, count) {
  const limit = count == null ? 3 : count;
  return [...(weeks || [])].sort(byDate).slice(-limit).map(weekId);
}

function selectedWeeks(weeks, selectedIds) {
  const chosen = new Set(selectedIds || []);
  return [...(weeks || [])].filter((week) => chosen.has(weekId(week))).sort(byDate);
}

function dayGastoRate(metrics) {
  const rates = [];
  for (const key of GASTO_COMPONENTS) {
    const rate = finite(metrics && metrics[key]);
    if (rate == null) return null;
    rates.push(rate);
  }
  for (const key of EXCLUDED_FROM_GASTO) {
    if (GASTO_COMPONENTS.includes(key)) return null;
  }
  return rates.reduce((sum, rate) => sum + rate, 0);
}

function weeklyGastoKg(days) {
  let numerator = 0;
  let denominator = 0;
  for (const day of days || []) {
    const venta = finite(day && day.metrics && day.metrics.venta_kg);
    if (!(venta > 0)) continue;
    const rate = dayGastoRate(day.metrics);
    if (rate == null) continue;
    numerator += rate * venta;
    denominator += venta;
  }
  return denominator > 0 ? numerator / denominator : null;
}

function channelTotal(days, key) {
  let sum = 0;
  let any = false;
  for (const day of days || []) {
    const value = finite(day && day[key]);
    if (value == null) continue;
    sum += value;
    any = true;
  }
  return any ? sum : null;
}

function weeklyValue(week, indicator) {
  if (indicator.pending) return null;
  if (indicator.gasto) return weeklyGastoKg(week.days);
  if (indicator.channel) return channelTotal(week.days, indicator.channel);
  return finite(week.metrics && week.metrics[indicator.weeklyKey]);
}

function dailyPoints(week, indicator) {
  const days = [...(week.days || [])].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return days.map((day) => {
    if (indicator.pending) return null;
    if (indicator.gasto) return dayGastoRate(day.metrics);
    if (indicator.channel) return finite(day[indicator.channel]);
    return finite(day.metrics && day.metrics[indicator.dailyKey]);
  });
}

function deltaTone(indicator, delta) {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return "neutral";
  if (indicator.sense === "down") return delta < 0 ? "good" : "bad";
  return delta > 0 ? "good" : "bad";
}

function deltaOf(current, previous) {
  if (current == null || previous == null) return { absolute: null, percent: null };
  const absolute = current - previous;
  const percent = previous !== 0 ? (absolute / Math.abs(previous)) * 100 : null;
  return { absolute, percent };
}

function formatNumber(value, unit) {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = unit === "kg" ? 0 : 2;
  return value.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDelta(delta, unit) {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const body = formatNumber(Math.abs(delta), unit);
  if (delta > 0) return `+${body}`;
  if (delta < 0) return `-${body}`;
  return formatNumber(0, unit);
}

function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return null;
  const body = Math.abs(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value > 0) return `+${body}%`;
  if (value < 0) return `-${body}%`;
  return "0%";
}

function formatRange(desde, hasta) {
  const one = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  };
  return `${one(desde)}–${one(hasta)}`;
}

function buildExecutiveView(input) {
  const title = input && input.scope === "all"
    ? "IGF Diario semanal · Todas"
    : `IGF Diario semanal · ${String((input && input.plant) || "").trim() || "Planta"}`;
  const chosen = selectedWeeks(input && input.weeks, input && input.selectedIds);
  const indicators = INDICATORS.map((indicator) => {
    const columns = chosen.map((week, index) => {
      const value = weeklyValue(week, indicator);
      const previous = index > 0 ? weeklyValue(chosen[index - 1], indicator) : null;
      const delta = index > 0 ? deltaOf(value, previous) : null;
      return {
        id: weekId(week),
        week_number: week.week_number,
        range: formatRange(week.fecha_desde, week.fecha_hasta),
        value,
        delta,
        tone: delta ? deltaTone(indicator, delta.absolute) : "neutral",
        points: dailyPoints(week, indicator),
        coverage_note: week.coverage_note || null,
      };
    });
    const samples = columns.flatMap((column) => column.points).filter((point) => point != null && Number.isFinite(point));
    const scale = samples.length
      ? { min: Math.min(...samples), max: Math.max(...samples) }
      : null;
    return {
      id: indicator.id,
      group: indicator.group,
      label: indicator.label,
      unit: indicator.unit,
      pending: Boolean(indicator.pending),
      scale,
      columns,
    };
  });
  return {
    title,
    scope: input && input.scope === "all" ? "all" : "plant",
    weeks: chosen.map((week) => ({
      id: weekId(week),
      week_number: week.week_number,
      fecha_desde: week.fecha_desde,
      fecha_hasta: week.fecha_hasta,
      label: `Semana ${week.week_number}`,
      range: formatRange(week.fecha_desde, week.fecha_hasta),
    })),
    indicators,
  };
}

function escapeXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toneColor(tone) {
  if (tone === "good") return "#34d399";
  if (tone === "bad") return "#f87171";
  return "#94a3b8";
}

function lineColor(index) {
  return ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7"][index % 5];
}

function renderExecutiveSvg(view, options) {
  const weeks = (view && view.weeks) || [];
  const indicators = (view && view.indicators) || [];
  const width = Math.max(1080, 220 + weeks.length * 210);
  const cardH = 188;
  const height = 92 + indicators.length * (cardH + 14) + 36;
  const stamp = options && options.exportedAt ? `Exportado ${options.exportedAt}` : "";
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-executive-chart="svg">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#020617"/>`);
  parts.push(`<text x="24" y="36" fill="#f8fafc" font-family="Segoe UI, sans-serif" font-size="22" font-weight="700">${escapeXml(view && view.title)}</text>`);
  const range = weeks.length ? `${weeks[0].range.split("–")[0]} – ${weeks[weeks.length - 1].range.split("–")[1] || weeks[weeks.length - 1].range}` : "";
  parts.push(`<text x="24" y="58" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="13">${escapeXml(range)}${stamp ? ` · ${escapeXml(stamp)}` : ""}</text>`);
  indicators.forEach((indicator, index) => {
    const y = 78 + index * (cardH + 14);
    parts.push(`<g data-indicator="${indicator.id}" data-scale="${indicator.scale ? `${indicator.scale.min},${indicator.scale.max}` : "none"}">`);
    parts.push(`<rect x="16" y="${y}" width="${width - 32}" height="${cardH}" rx="12" fill="#0f172a" stroke="#0369a1" stroke-width="1.5"/>`);
    parts.push(`<text x="32" y="${y + 24}" fill="#7dd3fc" font-family="Segoe UI, sans-serif" font-size="12" font-weight="700">${escapeXml(indicator.group)}</text>`);
    parts.push(`<text x="32" y="${y + 44}" fill="#e2e8f0" font-family="Segoe UI, sans-serif" font-size="14">${escapeXml(indicator.label)} · ${escapeXml(indicator.unit)}</text>`);
    const chartX = 32;
    const chartY = y + 56;
    const chartW = Math.min(280, width * 0.28);
    const chartH = 108;
    parts.push(`<rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" rx="8" fill="#020617" stroke="#1e293b"/>`);
    if (indicator.pending) {
      parts.push(`<text x="${chartX + 16}" y="${chartY + 58}" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="16" data-pending="1">Pendiente</text>`);
    } else if (indicator.scale) {
      const min = indicator.scale.min;
      const max = indicator.scale.max;
      const span = max === min ? 1 : max - min;
      indicator.columns.forEach((column, columnIndex) => {
        const coords = column.points.map((point, pointIndex) => {
          if (point == null || !Number.isFinite(point)) return null;
          const px = chartX + 12 + (pointIndex * (chartW - 24)) / 6;
          const py = chartY + chartH - 12 - ((point - min) / span) * (chartH - 24);
          return `${px},${py}`;
        }).filter(Boolean);
        if (coords.length) {
          parts.push(`<polyline data-week="${column.week_number}" fill="none" stroke="${lineColor(columnIndex)}" stroke-width="2.4" points="${coords.join(" ")}"/>`);
        }
      });
    }
    const colW = weeks.length ? Math.max(150, (width - chartX - chartW - 48) / weeks.length) : 180;
    indicator.columns.forEach((column, columnIndex) => {
      const x = chartX + chartW + 24 + columnIndex * colW;
      const valueText = indicator.pending ? "Pendiente" : formatNumber(column.value, indicator.unit);
      parts.push(`<text x="${x}" y="${y + 78}" fill="#f8fafc" font-family="Segoe UI, sans-serif" font-size="13" font-weight="700">Semana ${column.week_number}</text>`);
      parts.push(`<text x="${x}" y="${y + 96}" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="11">${escapeXml(column.range)}</text>`);
      parts.push(`<text x="${x}" y="${y + 118}" fill="#e2e8f0" font-family="Segoe UI, sans-serif" font-size="16" data-acumulado="${indicator.id}-${column.week_number}">${escapeXml(valueText)}</text>`);
      if (column.delta) {
        const pct = formatPercent(column.delta.percent);
        const deltaText = `Δ ${formatDelta(column.delta.absolute, indicator.unit)}${pct ? ` (${pct})` : ""}`;
        parts.push(`<text x="${x}" y="${y + 142}" fill="${toneColor(column.tone)}" font-family="Segoe UI, sans-serif" font-size="13" data-delta="${indicator.id}-${column.week_number}" data-tone="${column.tone}">${escapeXml(deltaText)}</text>`);
      }
      if (column.coverage_note) {
        parts.push(`<text x="${x}" y="${y + 164}" fill="#fcd34d" font-family="Segoe UI, sans-serif" font-size="10">${escapeXml(column.coverage_note)}</text>`);
      }
    });
    parts.push("</g>");
  });
  parts.push("</svg>");
  return parts.join("");
}

function downloadName(view) {
  const slug = String((view && view.title) || "igf-diario")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "igf-diario-semanal"}.png`;
}

module.exports = {
  GASTO_COMPONENTS,
  EXCLUDED_FROM_GASTO,
  INDICATORS,
  defaultSelectedIds,
  selectedWeeks,
  dayGastoRate,
  weeklyGastoKg,
  deltaTone,
  deltaOf,
  buildExecutiveView,
  renderExecutiveSvg,
  downloadName,
  formatRange,
};
