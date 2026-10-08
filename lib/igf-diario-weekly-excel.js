"use strict";

const sharp = require("sharp");

const ROWS = [
  { key: "venta_kg", label: "Venta en Kilos", unit: "kg", highlight: true },
  { key: "precio_kg", label: "Precio de Venta al Público", unit: "per_kg", highlight: true },
  { key: "ingreso_mxn", label: "Ingreso Generado", unit: "mxn", highlight: true },
  { key: "costo_kg", label: "Costo del Gas LP", unit: "per_kg", separatorBefore: true },
  { key: "flete_kg", label: "Flete Terrestre", unit: "per_kg" },
  { key: "margen_kg", label: "Margen Bruto", unit: "per_kg", highlight: true },
  { key: "gasto_corporativo_kg", label: "Gasto Corporativo", unit: "per_kg", separatorBefore: true },
  { key: "inversiones_kg", label: "Inversiones", unit: "per_kg" },
  { key: "impuestos_federales_kg", label: "Impuestos Federales", unit: "per_kg" },
  { key: "margen_neto_kg", label: "Margen Neto", unit: "per_kg", highlight: true },
  { key: "presupuesto_nomina_gastos_kg", label: "Presupuesto Nómina/Gastos", unit: "per_kg", separatorBefore: true },
  { key: "presupuesto_imss_sua_kg", label: "Presupuesto IMSS/SUA", unit: "per_kg" },
  { key: "extraordinarios_kg", label: "Extraordinarios", unit: "per_kg" },
  { key: "provisiones_planta_kg", label: "Provisiones de la Planta", unit: "per_kg" },
  { key: "sobrante_antes_hg_kg", label: "Sobrante de Operación antes del HG", unit: "per_kg", highlight: true },
  { key: "hg_mxn", label: "HG", unit: "mxn", separatorBefore: true },
  { key: "sobrante_con_hg_kg", label: "Sobrante de Operación con el HG", unit: "per_kg", highlight: true },
  { key: "com_desc_kg", label: "Comisiones y Descuentos", unit: "per_kg", separatorBefore: true },
  { key: "resultado_kg", label: "RESULTADO ($/kg)", unit: "per_kg", highlight: true },
  { key: "resultado_mxn", label: "RESULTADO (Importe)", unit: "mxn", highlight: true, strongest: true },
];

const SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtFecha(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value || "");
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function dayHeader(fecha) {
  const match = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(fecha || "");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${SHORT[date.getUTCDay()]} ${match[3]}/${match[2]}`;
}

function numFmt(unit) {
  if (unit === "kg") return "#,##0";
  if (unit === "mxn") return "#,##0.00";
  return "0.00";
}

function knownMetric(metric) {
  return ROWS.some((row) => row.key === metric) ? metric : "resultado_mxn";
}

function rowByKey(key) {
  return ROWS.find((row) => row.key === key) || ROWS[ROWS.length - 1];
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function chartSvg(summary, metric) {
  const row = rowByKey(metric);
  const days = (summary && summary.days) || [];
  const values = days.map((day) => {
    const value = day && day.metrics ? day.metrics[row.key] : null;
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  });
  const numeric = values.filter((value) => value != null);
  const min = numeric.length ? Math.min(...numeric) : 0;
  const max = numeric.length ? Math.max(...numeric) : 1;
  const span = max === min ? Math.max(Math.abs(max), 1) : max - min;
  const yMin = min - span * 0.12;
  const yMax = max + span * 0.12;
  const width = 720;
  const height = 300;
  const padL = 56;
  const padR = 16;
  const padT = 42;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const xOf = (index) => (days.length <= 1 ? padL + innerW / 2 : padL + (index / (days.length - 1)) * innerW);
  const yOf = (value) => padT + (1 - (value - yMin) / (yMax - yMin)) * innerH;
  const segments = [];
  let current = [];
  let currentProjected = false;
  const flush = () => {
    if (current.length) segments.push({ projected: currentProjected, points: current });
    current = [];
  };
  values.forEach((value, index) => {
    const projected = days[index] && days[index].estado === "proyectada";
    if (value == null) {
      flush();
      return;
    }
    if (current.length && projected !== currentProjected) flush();
    currentProjected = projected;
    current.push(`${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`);
  });
  flush();
  const lines = segments.map((segment) => {
    const color = segment.projected ? "#d97706" : "#0284c7";
    const dash = segment.projected ? ` stroke-dasharray="6 4"` : "";
    return `<polyline fill="none" stroke="${color}" stroke-width="2.5"${dash} points="${segment.points.join(" ")}" />`;
  }).join("");
  const labels = days.map((day, index) => {
    const x = xOf(index);
    return `<text x="${x.toFixed(1)}" y="${height - 12}" text-anchor="middle" font-size="12" fill="#334155">${escapeXml(SHORT[index] || dayHeader(day.fecha).split(" ")[0])}</text>`;
  }).join("");
  const title = `${row.label} · Semana ${summary && summary.week ? summary.week.week_number : ""}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="${padL}" y="24" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="#cbd5e1"/>
  <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="#cbd5e1"/>
  ${lines}
  ${labels}
</svg>`;
}

async function chartPng(summary, metric) {
  const svg = chartSvg(summary, knownMetric(metric));
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function paintValue(cell, value, row) {
  if (value == null || !Number.isFinite(Number(value))) {
    cell.value = "—";
    cell.font = { color: { argb: "FF64748B" }, bold: Boolean(row.strongest) };
    cell.alignment = { horizontal: "right" };
    return;
  }
  const number = Number(value);
  cell.value = number;
  cell.numFmt = numFmt(row.unit);
  const green = (row.key === "resultado_kg" || row.key === "resultado_mxn") && number > 0;
  cell.font = {
    color: { argb: number < 0 ? "FFDC2626" : green ? "FF15803D" : "FF0F172A" },
    bold: Boolean(row.strongest) || Boolean(row.highlight),
  };
  cell.alignment = { horizontal: "right" };
}

async function fillResumen(wb, summary, metric) {
  if (!wb || !summary) return null;
  const selected = knownMetric(metric);
  let ws = wb.getWorksheet("RESUMEN");
  if (!ws) ws = wb.addWorksheet("RESUMEN");
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];
  ws.getColumn(1).width = 42;
  for (let col = 2; col <= 9; col += 1) ws.getColumn(col).width = 16;
  const planta = String(summary.empresa || summary.plant_code || "").trim().toUpperCase();
  const week = summary.week || {};
  ws.mergeCells("A1:I1");
  ws.mergeCells("A2:I2");
  ws.getCell("A1").value = `IGF DIARIO SEMANAL · ${planta}`;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
  ws.getCell("A2").value = `SEMANA ${week.week_number} · ${fmtFecha(week.fecha_desde)}–${fmtFecha(week.fecha_hasta)}`;
  ws.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF334155" } };
  const headers = ["Concepto", "Semana", ...((summary.days || []).map((day) => dayHeader(day.fecha)))];
  headers.forEach((label, index) => {
    const cell = ws.getCell(4, index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: "FFF8FAFC" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index === 1 ? "FF0F172A" : "FF1E293B" } };
    cell.alignment = { horizontal: index === 0 ? "left" : "right" };
  });
  let rowIndex = 5;
  for (const row of ROWS) {
    if (row.separatorBefore) rowIndex += 1;
    const labelCell = ws.getCell(rowIndex, 1);
    labelCell.value = row.label;
    labelCell.font = { bold: true, color: { argb: "FF0F172A" } };
    const fill = row.strongest ? "FFF6C445" : row.highlight ? "FFFDE68A" : "FFFFFFFF";
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    const weekCell = ws.getCell(rowIndex, 2);
    paintValue(weekCell, summary.metrics ? summary.metrics[row.key] : null, row);
    weekCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row.strongest ? "FFF8E7A0" : "FFF8FAFC" } };
    (summary.days || []).forEach((day, index) => {
      const cell = ws.getCell(rowIndex, index + 3);
      paintValue(cell, day && day.metrics ? day.metrics[row.key] : null, row);
      if (row.highlight) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row.strongest ? "FFFFF7D6" : "FFFFFBEB" } };
      }
    });
    if (row.separatorBefore) {
      for (let col = 1; col <= 9; col += 1) {
        ws.getCell(rowIndex, col).border = { top: { style: "medium", color: { argb: "FF94A3B8" } } };
      }
    }
    rowIndex += 1;
  }
  const png = await chartPng(summary, selected);
  const imageId = wb.addImage({ buffer: png, extension: "png" });
  ws.addImage(imageId, {
    tl: { col: 0, row: rowIndex + 1 },
    ext: { width: 720, height: 300 },
  });
  return ws;
}

module.exports = {
  ROWS,
  knownMetric,
  dayHeader,
  fmtFecha,
  chartSvg,
  chartPng,
  fillResumen,
};
