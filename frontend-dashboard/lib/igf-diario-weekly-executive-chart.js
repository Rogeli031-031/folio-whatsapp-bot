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

const FRAMES = [
  { id: "resultado", title: "RESULTADO" },
  { id: "gastos", title: "GASTOS" },
  { id: "margen", title: "MARGEN / PRECIO / COSTOS" },
  { id: "hg", title: "HG / VOLUMEN" },
  { id: "canal", title: "VENTAS POR CANAL" },
];

const INDICATORS = [
  { id: "resultado", frame: "resultado", label: "RESULTADO", tip: "Resultado", unit: "$", weeklyKey: "resultado_mxn", dailyKey: "resultado_mxn", sense: "up" },
  { id: "gasto_corporativo", frame: "gastos", label: "GASTO CORPORATIVO", tip: "Gasto Corporativo", unit: "$", money: "gasto_corporativo_mxn", sense: "down" },
  { id: "gasto_operativo", frame: "gastos", label: "GASTO OPERATIVO", tip: "Gasto Operativo", unit: "$", money: "gasto_operativo_mxn", sense: "down" },
  { id: "margen", frame: "margen", label: "MARGEN BRUTO", tip: "Margen Bruto", unit: "$/kg", weeklyKey: "margen_kg", dailyKey: "margen_kg", sense: "up" },
  { id: "com_desc", frame: "margen", label: "COMISIONES Y DESCUENTOS", tip: "Comisiones y Descuentos", unit: "$/kg", weeklyKey: "com_desc_kg", dailyKey: "com_desc_kg", sense: "up" },
  { id: "precio", frame: "margen", label: "PRECIO DE VENTA AL PÚBLICO", tip: "Precio de Venta al Público", unit: "$/kg", weeklyKey: "precio_kg", dailyKey: "precio_kg", sense: "up" },
  { id: "costo", frame: "margen", label: "COSTO GAS LP", tip: "Costo Gas LP", unit: "$/kg", weeklyKey: "costo_kg", dailyKey: "costo_kg", sense: "down" },
  { id: "flete", frame: "margen", label: "FLETE", tip: "Flete", unit: "$/kg", weeklyKey: "flete_kg", dailyKey: "flete_kg", sense: "down" },
  { id: "descuento_compra", frame: "margen", label: "DESCUENTO COMPRA", tip: "Descuento Compra", unit: "$/kg", pending: true },
  { id: "hg", frame: "hg", label: "HG", tip: "HG", unit: "$", weeklyKey: "hg_mxn", dailyKey: "hg_mxn", sense: "down" },
  { id: "kilos", frame: "hg", label: "HG EN KILOS", tip: "HG en kilos (Control de compras)", unit: "kg", channel: "hg_kilos", sense: "down" },
  { id: "venta_casa", frame: "canal", label: "VENTA CASA", tip: "Venta Casa", unit: "kg", channel: "venta_casa_kg", sense: "up" },
  { id: "venta_comisionista", frame: "canal", label: "VENTA COMISIONISTA", tip: "Venta Comisionista", unit: "kg", channel: "venta_comisionista_kg", sense: "up" },
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
  if (indicator.money) return channelTotal(week.days, indicator.money);
  if (indicator.channel) return channelTotal(week.days, indicator.channel);
  return finite(week.metrics && week.metrics[indicator.weeklyKey]);
}

function pointValue(point) {
  if (point == null) return null;
  if (typeof point === "object") return finite(point.value);
  return finite(point);
}

function dailyPoints(week, indicator) {
  const days = [...(week.days || [])].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return days.map((day) => {
    const fecha = day && day.fecha ? String(day.fecha).slice(0, 10) : "";
    let value = null;
    if (!indicator.pending && indicator.gasto) value = dayGastoRate(day.metrics);
    else if (!indicator.pending && indicator.money) value = finite(day[indicator.money]);
    else if (!indicator.pending && indicator.channel) value = finite(day[indicator.channel]);
    else if (!indicator.pending) value = finite(day.metrics && day.metrics[indicator.dailyKey]);
    return { fecha, value };
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

function formatShown(value, unit) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kg") {
    return `${value.toLocaleString("es-MX", { maximumFractionDigits: 0 })} kg`;
  }
  const body = Math.abs(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signed = value < 0 ? `-$${body}` : `$${body}`;
  return unit === "$/kg" ? `${signed}/kg` : signed;
}

function formatFecha(fecha) {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function tooltipLines(fecha, label, value, unit) {
  return [formatFecha(fecha), label, formatShown(value, unit)];
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
    const samples = columns.flatMap((column) => column.points).map(pointValue).filter((point) => point != null);
    const scale = samples.length
      ? { min: Math.min(...samples), max: Math.max(...samples) }
      : null;
    return {
      id: indicator.id,
      frame: indicator.frame,
      label: indicator.label,
      tip: indicator.tip || indicator.label,
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
  gasto_corporativo: "#60a5fa",
  gasto_operativo: "#93c5fd",
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
const LABEL_W = 268;
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
  const FRAME_H = 28;
  const FRAME_GAP = 12;
  const frames = FRAMES.map((frame) => ({
    ...frame,
    rows: indicators.filter((item) => item.frame === frame.id),
  })).filter((frame) => frame.rows.length);
  let cursor = TITLE_H + HEADER_H;
  const placed = frames.map((frame) => {
    const y = cursor;
    const frameHeight = FRAME_H + frame.rows.length * ROW_H;
    const rows = frame.rows.map((indicator, index) => ({
      indicator,
      y: y + FRAME_H + index * ROW_H,
    }));
    cursor += frameHeight + FRAME_GAP;
    return { ...frame, y, height: frameHeight, rows };
  });
  const height = Math.max(cursor + 8, TITLE_H + HEADER_H + 8);
  const stamp = options && options.exportedAt ? `Exportado ${options.exportedAt}` : "";
  const font = (options && options.fontFamily) || "Segoe UI, sans-serif";
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-executive-chart="svg" data-layout="week-grid" data-week-count="${weeks.length}" data-frame-count="${placed.length}" data-full-width="${weeks.length > 0 && weeks.length <= 3 ? "1" : "0"}">`);
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
  placed.forEach((frame) => {
    const frameRight = 6 + LABEL_W + weeks.length * chartW + Math.max(0, weeks.length - 1) * DELTA_W;
    parts.push(`<g data-frame="${frame.id}" data-frame-title="${escapeXml(frame.title)}" data-frame-rows="${frame.rows.map((row) => row.indicator.id).join(",")}">`);
    parts.push(`<rect x="4" y="${frame.y}" width="${Math.max(frameRight - 4, LABEL_W)}" height="${frame.height}" rx="8" fill="none" stroke="#60a5fa" stroke-width="2"/>`);
    parts.push(`<text x="16" y="${frame.y + 18}" fill="#93c5fd" font-family="${font}" font-size="12" font-weight="700">${escapeXml(frame.title)}</text>`);
    frame.rows.forEach((row, rowIndex) => {
    const indicator = row.indicator;
    const y = row.y;
    const fill = rowIndex % 2 === 0 ? "#0c1e33" : "#10283f";
    const color = LINE_COLOR[indicator.id] || "#7dd3fc";
    parts.push(`<g data-indicator="${indicator.id}" data-scale="${indicator.scale ? `${indicator.scale.min},${indicator.scale.max}` : "none"}">`);
    parts.push(`<rect x="6" y="${y}" width="${LABEL_W}" height="${ROW_H}" fill="${fill}" stroke="#245074"/>`);
    parts.push(`<text x="16" y="${y + 36}" fill="#f8fafc" font-family="${font}" font-size="12" font-weight="700">${escapeXml(indicator.label)}</text>`);
    parts.push(`<text x="16" y="${y + 56}" fill="#93c5fd" font-family="${font}" font-size="11">(${escapeXml(indicator.unit)})</text>`);
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
          const amount = pointValue(point);
          const px = plotX + (pointIndex * plotW) / 6;
          if (amount == null) {
            flush();
            return;
          }
          const py = yOf(amount);
          segment.push(`${px},${py}`);
          const fecha = point && point.fecha ? point.fecha : "";
          const lines = tooltipLines(fecha, indicator.tip, amount, indicator.unit);
          const hover = options && options.tooltip
            && options.tooltip.indicatorId === indicator.id
            && Number(options.tooltip.weekNumber) === Number(column.week_number)
            && options.tooltip.fecha === fecha;
          parts.push(`<circle cx="${px}" cy="${py}" r="2.4" fill="${color}" data-point="1" data-week="${column.week_number}" data-fecha="${escapeXml(fecha)}" data-fecha-label="${escapeXml(lines[0])}" data-label="${escapeXml(indicator.tip)}" data-value="${amount}" data-unit="${escapeXml(indicator.unit)}" data-shown="${escapeXml(lines[2])}"><title>${escapeXml(lines.join("\n"))}</title></circle>`);
          if (hover) {
            const boxW = 210;
            const boxH = 54;
            const bx = Math.min(px + 8, width - boxW - 8);
            const by = Math.max(8, py - boxH - 8);
            parts.push(`<g data-tooltip="open" data-tooltip-week="${column.week_number}" data-tooltip-indicator="${indicator.id}">`);
            parts.push(`<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="6" fill="#0b1c30" stroke="#60a5fa"/>`);
            lines.forEach((line, lineIndex) => {
              parts.push(`<text x="${bx + 10}" y="${by + 16 + lineIndex * 14}" fill="#f8fafc" font-family="${font}" font-size="11">${escapeXml(line)}</text>`);
            });
            parts.push("</g>");
          }
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
          const color = toneColor(next.tone);
          const cx = dx + DELTA_W / 2;
          parts.push(`<text x="${cx}" y="${y + 58}" text-anchor="middle" fill="${color}" font-family="${font}" font-size="14" font-weight="700" data-delta="${indicator.id}-${next.week_number}">${escapeXml(formatDelta(next.delta.absolute, indicator.unit))}</text>`);
          if (next.delta.absolute > 0 || next.delta.absolute < 0) {
            const up = next.delta.absolute > 0;
            const points = up
              ? `${cx},${y + 64} ${cx - 4.5},${y + 71} ${cx + 4.5},${y + 71}`
              : `${cx - 4.5},${y + 64} ${cx + 4.5},${y + 64} ${cx},${y + 71}`;
            parts.push(`<polygon data-arrow="${up ? "up" : "down"}" points="${points}" fill="${color}"/>`);
          }
          if (pct) {
            parts.push(`<text x="${cx}" y="${y + 86}" text-anchor="middle" fill="${color}" font-family="${font}" font-size="12" data-delta-pct="${indicator.id}-${next.week_number}">${escapeXml(pct)}</text>`);
          }
        }
        parts.push("</g>");
      }
    });
    parts.push("</g>");
    });
    parts.push("</g>");
  });
  parts.push("</svg>");
  return parts.join("");
}

function filePart(value) {
  const clean = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean.slice(0, 60);
}

function downloadSubject(view) {
  if (view && view.scope === "all") return "Todas";
  const title = String((view && view.title) || "");
  const parts = title.split("·");
  const name = parts.length > 1 ? parts.slice(1).join(" ") : title;
  if (/todas|provincia/i.test(name)) return "Todas";
  return filePart(name) || "Planta";
}

function downloadName(view) {
  const weeks = (view && view.weeks) || [];
  const first = weeks[0] || {};
  const last = weeks[weeks.length - 1] || first;
  const from = String(first.fecha_desde || "").slice(0, 10) || "sin-inicio";
  const to = String(last.fecha_hasta || "").slice(0, 10) || "sin-fin";
  return `IGF_Diario_${downloadSubject(view)}_${from}_a_${to}.pdf`;
}

function canExportExecutivePdf(state) {
  if (!state || state.loading || state.loadError || state.exporting) return false;
  return Number(state.weekCount) > 0;
}

function createPdfExportGate() {
  let busy = false;
  return {
    isBusy() {
      return busy;
    },
    tryBegin() {
      if (busy) return false;
      busy = true;
      return true;
    },
    end() {
      busy = false;
    },
  };
}

module.exports = {
  GASTO_COMPONENTS,
  EXCLUDED_FROM_GASTO,
  FRAMES,
  INDICATORS,
  formatShown,
  tooltipLines,
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
  canExportExecutivePdf,
  createPdfExportGate,
  formatRange,
};
