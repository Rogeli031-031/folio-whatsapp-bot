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
  if (indicator && indicator.id === "hg") return delta < 0 ? "good" : "bad";
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

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const LINE_COLOR = {
  precio: "#f59e0b",
  gasto: "#60a5fa",
  margen: "#cbd5e1",
  com_desc: "#fbbf24",
  hg: "#f87171",
  kilos: "#c084fc",
  costo: "#38bdf8",
  flete: "#22d3ee",
  venta_casa: "#3b82f6",
  venta_comisionista: "#a78bfa",
  resultado: "#fb7185",
};
const LABEL_W = 210;
const DELTA_W = 118;
const MIN_CHART_W = 300;
const FULL_W = 1680;
const ROW_H = 132;
const HEADER_H = 54;
const TITLE_H = 40;

function gridWidth(weekCount) {
  const count = Math.max(0, weekCount || 0);
  const min = 12 + LABEL_W + count * MIN_CHART_W + Math.max(0, count - 1) * DELTA_W;
  if (count > 0 && count <= 3) return Math.max(FULL_W, min);
  return min;
}

function chartWidth(weekCount, width) {
  const count = Math.max(1, weekCount || 1);
  const free = width - 12 - LABEL_W - Math.max(0, count - 1) * DELTA_W;
  return free / count;
}

function columnX(index, chartW) {
  return 6 + LABEL_W + index * (chartW + DELTA_W);
}

function renderExecutiveSvg(view, options) {
  const weeks = (view && view.weeks) || [];
  const indicators = (view && view.indicators) || [];
  const width = gridWidth(weeks.length);
  const chartW = weeks.length ? chartWidth(weeks.length, width) : MIN_CHART_W;
  const height = TITLE_H + HEADER_H + indicators.length * ROW_H + 8;
  const stamp = options && options.exportedAt ? `Exportado ${options.exportedAt}` : "";
  const font = "Segoe UI, sans-serif";
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-executive-chart="svg" data-layout="week-grid" data-week-count="${weeks.length}" data-full-width="${weeks.length > 0 && weeks.length <= 3 ? "1" : "0"}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#071422"/>`);
  parts.push(`<text x="16" y="26" fill="#f8fafc" font-family="${font}" font-size="18" font-weight="700">${escapeXml(view && view.title)}${stamp ? ` · ${escapeXml(stamp)}` : ""}</text>`);
  const headerY = TITLE_H;
  parts.push(`<rect x="6" y="${headerY}" width="${LABEL_W}" height="${HEADER_H}" fill="#10283f" stroke="#245074"/>`);
  weeks.forEach((week, index) => {
    const x = columnX(index, chartW);
    parts.push(`<g data-col="week" data-week="${week.week_number}" data-x="${x}">`);
    parts.push(`<rect x="${x}" y="${headerY}" width="${chartW}" height="${HEADER_H}" fill="#10283f" stroke="#245074"/>`);
    parts.push(`<text x="${x + chartW / 2}" y="${headerY + 22}" text-anchor="middle" fill="#f8fafc" font-family="${font}" font-size="14" font-weight="700">Semana ${week.week_number}</text>`);
    parts.push(`<text x="${x + chartW / 2}" y="${headerY + 40}" text-anchor="middle" fill="#93c5fd" font-family="${font}" font-size="11">${escapeXml(week.range)}</text>`);
    parts.push("</g>");
    if (index < weeks.length - 1) {
      const dx = x + chartW;
      parts.push(`<g data-col="delta" data-vs="${week.week_number}" data-x="${dx}">`);
      parts.push(`<rect x="${dx}" y="${headerY}" width="${DELTA_W}" height="${HEADER_H}" fill="#0c2238" stroke="#245074"/>`);
      parts.push(`<text x="${dx + DELTA_W / 2}" y="${headerY + 32}" text-anchor="middle" fill="#e2e8f0" font-family="${font}" font-size="12" font-weight="700">Δ vs. S${week.week_number}</text>`);
      parts.push("</g>");
    }
  });
  indicators.forEach((indicator, rowIndex) => {
    const y = headerY + HEADER_H + rowIndex * ROW_H;
    const fill = rowIndex % 2 === 0 ? "#0c1e33" : "#10283f";
    const color = LINE_COLOR[indicator.id] || "#7dd3fc";
    parts.push(`<g data-indicator="${indicator.id}" data-scale="${indicator.scale ? `${indicator.scale.min},${indicator.scale.max}` : "none"}">`);
    parts.push(`<rect x="6" y="${y}" width="${LABEL_W}" height="${ROW_H}" fill="${fill}" stroke="#245074"/>`);
    parts.push(`<text x="16" y="${y + 28}" fill="#f8fafc" font-family="${font}" font-size="13" font-weight="700">${escapeXml(indicator.group)}</text>`);
    if (indicator.label && indicator.label !== indicator.group) {
      parts.push(`<text x="16" y="${y + 48}" fill="#cbd5e1" font-family="${font}" font-size="11">${escapeXml(indicator.label)}</text>`);
    }
    parts.push(`<text x="16" y="${y + 68}" fill="#93c5fd" font-family="${font}" font-size="11">(${escapeXml(indicator.unit)})</text>`);
    indicator.columns.forEach((column, index) => {
      const x = columnX(index, chartW);
      parts.push(`<g data-week-chart="${column.week_number}" data-x="${x}" data-w="${chartW}">`);
      parts.push(`<rect x="${x}" y="${y}" width="${chartW}" height="${ROW_H}" fill="${fill}" stroke="#245074"/>`);
      const valueText = indicator.pending ? "Pendiente" : `Acumulado: ${formatNumber(column.value, indicator.unit)}`;
      parts.push(`<text x="${x + chartW / 2}" y="${y + 16}" text-anchor="middle" fill="#f8fafc" font-family="${font}" font-size="12" font-weight="700" data-acumulado="${indicator.id}-${column.week_number}"${indicator.pending ? ' data-pending="1"' : ""}>${escapeXml(valueText)}</text>`);
      if (column.coverage_note) {
        parts.push(`<text x="${x + 8}" y="${y + ROW_H - 6}" fill="#fcd34d" font-family="${font}" font-size="9">${escapeXml(column.coverage_note)}</text>`);
      }
      if (!indicator.pending && indicator.scale) {
        const plotX = x + 42;
        const plotY = y + 22;
        const plotW = Math.max(20, chartW - 52);
        const plotH = 78;
        const min = indicator.scale.min;
        const max = indicator.scale.max;
        const span = max === min ? 1 : max - min;
        const yOf = (point) => plotY + plotH - ((point - min) / span) * plotH;
        [max, (min + max) / 2, min].forEach((tick, tickIndex) => {
          const ty = yOf(max === min ? min : tick);
          parts.push(`<text x="${x + 38}" y="${ty + 3}" text-anchor="end" fill="#64748b" font-family="${font}" font-size="8">${escapeXml(formatNumber(tick, indicator.unit))}</text>`);
          if (tickIndex === 1) parts.push(`<line x1="${plotX}" y1="${ty}" x2="${plotX + plotW}" y2="${ty}" stroke="#1e3a5f" stroke-width="1"/>`);
        });
        let segment = [];
        const flush = () => {
          if (segment.length) {
            parts.push(`<polyline fill="none" stroke="${color}" stroke-width="2" points="${segment.join(" ")}"/>`);
            segment = [];
          }
        };
        column.points.forEach((point, pointIndex) => {
          const px = plotX + (pointIndex * plotW) / 6;
          if (point == null || !Number.isFinite(point)) {
            flush();
            return;
          }
          const py = yOf(point);
          segment.push(`${px},${py}`);
          parts.push(`<circle cx="${px}" cy="${py}" r="2.4" fill="${color}"/>`);
        });
        flush();
        DAY_LABELS.forEach((label, dayIndex) => {
          const px = plotX + (dayIndex * plotW) / 6;
          parts.push(`<text x="${px}" y="${plotY + plotH + 12}" text-anchor="middle" fill="#94a3b8" font-family="${font}" font-size="8" data-day="${label}">${label}</text>`);
        });
      }
      parts.push("</g>");
      if (index < indicator.columns.length - 1) {
        const next = indicator.columns[index + 1];
        const dx = x + chartW;
        parts.push(`<g data-delta-column="${next.week_number}" data-vs-week="${column.week_number}" data-x="${dx}" data-tone="${next.tone || "neutral"}">`);
        parts.push(`<rect x="${dx}" y="${y}" width="${DELTA_W}" height="${ROW_H}" fill="#0a1a2c" stroke="#245074"/>`);
        if (indicator.pending || !next.delta) {
          parts.push(`<text x="${dx + DELTA_W / 2}" y="${y + 68}" text-anchor="middle" fill="#94a3b8" font-family="${font}" font-size="13">—</text>`);
        } else {
          const pct = formatPercent(next.delta.percent);
          const arrow = next.delta.absolute > 0 ? "▲" : next.delta.absolute < 0 ? "▼" : "";
          parts.push(`<text x="${dx + DELTA_W / 2}" y="${y + 58}" text-anchor="middle" fill="${toneColor(next.tone)}" font-family="${font}" font-size="14" font-weight="700" data-delta="${indicator.id}-${next.week_number}">${escapeXml(formatDelta(next.delta.absolute, indicator.unit))}</text>`);
          parts.push(`<text x="${dx + DELTA_W / 2}" y="${y + 78}" text-anchor="middle" fill="${toneColor(next.tone)}" font-family="${font}" font-size="12">${escapeXml(`${arrow} ${pct || ""}`.trim())}</text>`);
        }
        parts.push("</g>");
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
  gridWidth,
  downloadName,
  formatRange,
};
