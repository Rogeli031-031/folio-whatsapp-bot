"use strict";

const W = 841.89, H = 595.28, M = 28, BOTTOM = H - 38;
const TEAL = [22, 107, 104], INK = [23, 48, 66], MUTED = [94, 106, 114];
const RED = [165, 42, 54], GREEN = [0, 136, 91], BAND = [239, 245, 246];
function font(pdf, size = 8, bold = false, color = INK) {
  pdf.setFont("DejaVuSans", bold ? "bold" : "normal");
  pdf.setFontSize(size); pdf.setTextColor(...color);
}
function format(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";
}
function dateLabel(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join("/") : String(value || "—");
}
function page(pdf, title, subtitle, source, exportedAt) {
  pdf.addPage("a4", "landscape");
  pdf.setLineDashPattern([], 0); pdf.setLineWidth(0.4);
  pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, "F");
  pdf.setFillColor(...TEAL); pdf.rect(M, 22, W - 2 * M, 54, "F");
  font(pdf, 18, true, [255, 255, 255]); pdf.text(title, M + 12, 46);
  font(pdf, 8, false, [255, 255, 255]);
  pdf.text(pdf.splitTextToSize(subtitle, W - 2 * M - 24), M + 12, 63);
  pdf.setDrawColor(...TEAL); pdf.line(M, H - 30, W - M, H - 30);
  font(pdf, 6.5, false, MUTED); pdf.text(source, M, H - 18);
  pdf.text(`Exportado ${exportedAt}`, W - M, H - 8, { align: "right" });
}

// Render every line. A long row continues on a new page instead of being clipped.
function table(pdf, columns, rows, x, width, startY, nextPage, options = {}) {
  const size = options.size || 7.2, line = size * 1.25, pad = options.pad ?? 4;
  const total = columns.reduce((n, c) => n + c.width, 0);
  const widths = columns.map((c) => c.width * width / total);
  let y = startY;
  function header() {
    font(pdf, size, true);
    const cells = columns.map((c, i) => pdf.splitTextToSize(c.title, widths[i] - 2 * pad));
    const height = Math.max(...cells.map((c) => c.length)) * line + 2 * pad;
    pdf.setFillColor(...TEAL); pdf.rect(x, y, width, height, "F");
    let left = x;
    cells.forEach((lines, i) => { font(pdf, size, true, [255, 255, 255]); pdf.text(lines, left + pad, y + pad + size); left += widths[i]; });
    y += height;
  }
  header();
  rows.forEach((row, rowIndex) => {
    font(pdf, size);
    let cells = row.map((cell, i) => pdf.splitTextToSize(String(cell.text ?? "—"), widths[i] - pad * 2));
    const identity = cells[0];
    let continued = false;
    while (cells.some((c) => c.length)) {
      const needed = Math.max(...cells.map((c) => c.length));
      let capacity = Math.floor((BOTTOM - y - pad * 2) / line);
      // Move an intact row when it fits a fresh page; split only truly oversized rows.
      if (capacity < 1 || (!continued && needed > capacity && needed * line + 2 * pad < BOTTOM - startY - 50)) {
        nextPage(); y = startY; header(); capacity = Math.floor((BOTTOM - y - pad * 2) / line);
      }
      const take = Math.min(needed, capacity);
      const height = take * line + pad * 2;
      pdf.setFillColor(...(rowIndex % 2 ? BAND : [255, 255, 255])); pdf.rect(x, y, width, height, "F");
      let left = x;
      cells.forEach((lines, i) => {
        const shown = lines.slice(0, take);
        if (i === 0 && continued && !shown.length) shown.push(...identity.slice(0, take));
        font(pdf, size, false, row[i].color || INK);
        const right = row[i].align === "right";
        if (shown.length) pdf.text(shown, right ? left + widths[i] - pad : left + pad, y + pad + size, right ? { align: "right" } : undefined);
        pdf.setDrawColor(218, 229, 231); pdf.line(left, y, left, y + height);
        left += widths[i];
      });
      y += height;
      cells = cells.map((lines) => lines.slice(take));
      continued = true;
      if (cells.some((c) => c.length)) { nextPage(); y = startY; header(); }
    }
  });
}

function trend(values) {
  if (values.length < 2) return null;
  const n = values.length, sx = n * (n - 1) / 2;
  const sy = values.reduce((a, b) => a + b, 0);
  const sxy = values.reduce((a, b, i) => a + i * b, 0);
  const sxx = values.reduce((a, _, i) => a + i * i, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { a: (sy - b * sx) / n, b };
}
function chart(pdf, points, color) {
  const x = 61, y = 134, width = 339, height = 340;
  font(pdf, 10, true); pdf.text("Venta diaria (toneladas)", M, 102);
  if (!points.length) { font(pdf); pdf.text("Sin datos de venta para esta ventana", M, 145); return; }
  if (points.some((p) => typeof p.venta_ton !== "number" || !Number.isFinite(p.venta_ton))) throw new Error("Serie ARR con valores no válidos");
  const vals = points.map((p) => p.venta_ton), fit = trend(vals);
  const bounds = [...vals, ...(fit ? [fit.a, fit.a + fit.b * (vals.length - 1)] : [])];
  const lo = Math.min(...bounds), hi = Math.max(...bounds), span = Math.max(hi - lo, 0.01);
  const min = Math.max(0, lo - span * 0.08), max = hi + span * 0.08;
  const xp = (i) => x + (points.length === 1 ? width / 2 : i / (points.length - 1) * width);
  const yp = (v) => y + height - (v - min) / Math.max(max - min, 0.01) * height;
  font(pdf, 7, false, MUTED);
  for (let i = 0; i < 5; i++) {
    const value = min + (max - min) * i / 4, yy = yp(value);
    pdf.setDrawColor(219, 229, 233); pdf.line(x, yy, x + width, yy);
    pdf.text(format(value), x - 6, yy + 2, { align: "right" });
  }
  pdf.setDrawColor(...color); pdf.setLineWidth(1.2);
  points.forEach((p, i) => {
    if (i) pdf.line(xp(i - 1), yp(vals[i - 1]), xp(i), yp(p.venta_ton));
    pdf.setFillColor(...color); pdf.circle(xp(i), yp(p.venta_ton), 1.4, "F");
  });
  const ticks = Math.min(6, points.length);
  for (let i = 0; i < ticks; i++) {
    const idx = ticks === 1 ? 0 : Math.round(i * (points.length - 1) / (ticks - 1));
    pdf.text(dateLabel(points[idx].fecha).slice(0, 5), xp(idx), y + height + 17, { align: "center" });
  }
  if (fit) {
    pdf.setDrawColor(...GREEN); pdf.setLineDashPattern([4, 2], 0);
    pdf.line(xp(0), yp(fit.a), xp(points.length - 1), yp(fit.a + fit.b * (points.length - 1)));
    pdf.setLineDashPattern([], 0);
  }
  font(pdf, 7.5, false, MUTED); pdf.text("Fecha · Línea verde: tendencia lineal", x, y + height + 37);
  pdf.setLineWidth(0.4);
}

function drawChannel(pdf, data, plant, exportedAt) {
  const casa = data.canal === "casa", name = casa ? "CASA" : "COMISIONISTA";
  const title = `VENTA ${name}`;
  const subtitle = `${plant} · ARR 1M · ${dateLabel(data.fecha_desde)} – ${dateLabel(data.fecha_hasta)}`;
  const source = `Fuente: ARR · Venta ${name} · 1M · Δ vs. ${dateLabel(data.fecha_prev_desde)} – ${dateLabel(data.fecha_prev_hasta)}`;
  const next = () => { page(pdf, title, subtitle, source, exportedAt); chart(pdf, data.points, casa ? [199, 144, 0] : [0, 169, 215]); };
  next();
  font(pdf, 9, true, TEAL); pdf.text("Top 15 clientes · Δ venta", 425, 100);
  const rows = (data.clientes_top || []).slice(0, 15).map((c, i) => [
    { text: `${i + 1}. ${c.cliente}` },
    { text: `${c.delta_ton > 0 ? "+" : ""}${format(c.delta_ton)} t`, align: "right", color: c.delta_ton < 0 ? RED : GREEN },
    { text: (c.comentarios || []).slice(0, 2).map((comment) => `${comment.body}\n${[comment.created_at?.slice(0, 10), comment.author_name].filter(Boolean).join(" · ")}`).join("\n\n") || "Sin comentarios" },
  ]);
  if (!rows.length) { font(pdf); pdf.text("Sin movimientos de clientes en esta ventana", 425, 124); return; }
  table(pdf, [{ title: "Cliente", width: 145 }, { title: "Δ venta", width: 55 }, { title: "Últimos comentarios", width: 185 }], rows, 425, W - M - 425, 112, next, { size: 7 });
}

function drawAnnexes(pdf, annexes, plant, exportedAt) {
  drawChannel(pdf, annexes.casa, plant, exportedAt);
  drawChannel(pdf, annexes.comisionista, plant, exportedAt);
}

module.exports = { drawAnnexes, drawChannel, trend };
