"use strict";

const A4W = 595.276;
const A4H = 841.89;
const LEFT = 42;
const RIGHT = 553;
const INK = [23, 48, 66];
const MUTED = [94, 106, 114];
const TEAL = [22, 107, 104];
const NEGATIVE = [165, 42, 54];
const BAND = [232, 240, 240];
const WHITE = [255, 255, 255];

function binaryFromBuffer(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let out = "";
  const size = 8192;
  for (let index = 0; index < bytes.length; index += size) {
    out += String.fromCharCode.apply(null, bytes.subarray(index, index + size));
  }
  return out;
}

function installFace(pdf, bytes, fileName, family, style) {
  pdf.addFileToVFS(fileName, binaryFromBuffer(bytes));
  pdf.addFont(fileName, family, style, "Identity-H");
}

function money(value, digits) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function rate(value) {
  return money(value, 3);
}

function pesos(value) {
  return money(value, 2);
}

function kilos(value) {
  return money(value, 0);
}

function percent(value) {
  if (value == null || !Number.isFinite(Number(value))) return "No aplica";
  const text = `${(Number(value) * 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
  return Number(value) > 0 ? `+${text}` : text;
}

function signedRate(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const text = rate(Math.abs(value));
  if (value > 0) return `+${text}`;
  if (value < 0) return `-${text}`;
  return text;
}

function setFill(pdf, color) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setInk(pdf, color) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function resetGraphics(pdf) {
  pdf.setLineDashPattern([], 0);
  setFill(pdf, INK);
  pdf.setDrawColor(INK[0], INK[1], INK[2]);
  setInk(pdf, INK);
  pdf.setFont("DejaVuSans", "normal");
  pdf.setFontSize(8.2);
}

function pageHeader(cursor) {
  const pdf = cursor.pdf;
  resetGraphics(pdf);
  pdf.setFont("DejaVuSans", "bold");
  pdf.setFontSize(8);
  setInk(pdf, TEAL);
  pdf.text("RESULTADO SEMANAL POR PLANTA", RIGHT, 28, { align: "right" });
  cursor.y = 48;
}

function ensure(cursor, height) {
  if (cursor.y + height <= 800) return;
  cursor.pdf.addPage("a4", "portrait");
  pageHeader(cursor);
}

function textBlock(cursor, text, options) {
  const pdf = cursor.pdf;
  const size = options.size || 9.2;
  const width = options.width || RIGHT - LEFT;
  pdf.setFont("DejaVuSans", options.bold ? "bold" : "normal");
  pdf.setFontSize(size);
  setInk(pdf, options.color || INK);
  const lines = pdf.splitTextToSize(String(text || ""), width);
  const lineHeight = size + 2.4;
  ensure(cursor, lines.length * lineHeight + 2);
  pdf.text(lines, options.x == null ? LEFT : options.x, cursor.y);
  cursor.y += lines.length * lineHeight;
}

function bandRow(cursor, cells, options) {
  const pdf = cursor.pdf;
  const height = options.height || 16;
  ensure(cursor, height);
  const top = cursor.y - 11;
  setFill(pdf, options.fill || WHITE);
  pdf.rect(LEFT, top, RIGHT - LEFT, height, "F");
  pdf.setFont("DejaVuSans", options.bold ? "bold" : "normal");
  pdf.setFontSize(options.size || 8.2);
  cells.forEach((cell) => {
    setInk(pdf, cell.color || INK);
    pdf.text(String(cell.text), cell.x, cursor.y, cell.align ? { align: cell.align } : undefined);
  });
  cursor.y += height;
}

function headerRow(cursor, cells) {
  bandRow(cursor, cells.map((cell) => ({ ...cell, color: WHITE })), {
    fill: TEAL,
    bold: true,
    size: 8,
  });
}

function drawWaterfall(cursor, transition) {
  const chart = transition.waterfall;
  if (!chart) return;
  const pdf = cursor.pdf;
  const labels = [
    { name: "Anterior", value: chart.anterior, kind: "end" },
    ...chart.top.map((line) => ({
      name: line.label,
      value: line.aporte,
      kind: line.aporte < 0 ? "neg" : "pos",
    })),
    { name: "Otras partidas", value: chart.otras, kind: chart.otras < 0 ? "neg" : "pos" },
    { name: "Actual", value: chart.actual, kind: "end" },
  ];
  let running = chart.anterior;
  const spans = labels.map((item, index) => {
    if (index === 0 || index === labels.length - 1) return { ...item, from: 0, to: item.value };
    const from = running;
    running += item.value;
    return { ...item, from, to: running };
  });
  const values = spans.flatMap((item) => [item.from, item.to, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const slot = (RIGHT - LEFT) / labels.length;
  const plot = 96;
  const axisGap = 12;
  pdf.setFont("DejaVuSans", "normal");
  pdf.setFontSize(7);
  const names = spans.map((item) => pdf.splitTextToSize(item.name, Math.max(8, slot - 2)).slice(0, 2));
  const lineHeight = typeof pdf.getLineHeight === "function" ? pdf.getLineHeight() : 8.05;
  const maxLines = names.reduce((count, lines) => Math.max(count, lines.length), 1);
  const belowLabels = 12;
  ensure(cursor, plot + axisGap + maxLines * lineHeight + belowLabels);
  const bottom = cursor.y + plot;
  const yOf = (value) => bottom - ((value - min) / span) * 90;
  pdf.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setLineWidth(0.4);
  pdf.line(LEFT, yOf(0), RIGHT, yOf(0));
  spans.forEach((item, index) => {
    const x = LEFT + index * slot + 4;
    const width = Math.max(8, slot - 10);
    const y1 = yOf(item.from);
    const y2 = yOf(item.to);
    const top = Math.min(y1, y2);
    const barH = Math.max(1.2, Math.abs(y2 - y1));
    if (item.kind === "end") {
      pdf.setLineDashPattern([1.2, 1.2], 0);
      pdf.setDrawColor(INK[0], INK[1], INK[2]);
      pdf.rect(x, top, width, barH);
      pdf.setLineDashPattern([], 0);
    } else if (item.kind === "neg") {
      setFill(pdf, [214, 228, 227]);
      pdf.rect(x, top, width, barH, "F");
      pdf.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
      const steps = Math.max(2, Math.floor(barH / 4));
      for (let step = 0; step < steps; step += 1) {
        const y = top + (step * barH) / steps;
        pdf.line(x, Math.min(top + barH, y), x + width, Math.min(top + barH, y + 4));
      }
    } else {
      setFill(pdf, TEAL);
      pdf.rect(x, top, width, barH, "F");
    }
    pdf.setFont("DejaVuSans", "normal");
    pdf.setFontSize(7);
    setInk(pdf, item.value < 0 ? NEGATIVE : INK);
    pdf.text(signedRate(item.value), x + width / 2, Math.max(cursor.y, top - 3), { align: "center" });
    setInk(pdf, MUTED);
    pdf.text(names[index], x + width / 2, bottom + axisGap, { align: "center" });
  });
  resetGraphics(pdf);
  cursor.y = bottom + axisGap + maxLines * lineHeight + belowLabels;
}

function drawOpening(cursor, report) {
  pageHeader(cursor);
  textBlock(cursor, "Qué cambió en el resultado", { size: 21, bold: true });
  cursor.y += 2;
  const ranges = report.weeks.map((week) => `${week.fecha_desde}–${week.fecha_hasta}`).join(" | ");
  textBlock(cursor, `${report.plant} | ${ranges || "sin semanas"}`, { size: 10, color: MUTED });
  textBlock(cursor, `Exportado ${report.exportedAt || "—"} | Corte ${report.corte_ymd || "no informado"} | Versión a corte ${report.version_as_of_corte ? "sí" : "no"}`, {
    size: 8,
    color: MUTED,
  });
  cursor.y += 4;
  headerRow(cursor, [
    { text: "Semana", x: LEFT + 4 },
    { text: "Venta kg", x: 250, align: "right" },
    { text: "RESULTADO $/kg", x: 390, align: "right" },
    { text: "Pesos", x: RIGHT - 4, align: "right" },
  ]);
  report.weeks.forEach((week, index) => {
    bandRow(cursor, [
      { text: `${week.fecha_desde}–${week.fecha_hasta}`, x: LEFT + 4 },
      { text: kilos(week.V), x: 250, align: "right" },
      { text: rate(week.r), x: 390, align: "right", color: week.r != null && week.r < 0 ? NEGATIVE : INK },
      { text: pesos(week.R), x: RIGHT - 4, align: "right", color: week.R != null && week.R < 0 ? NEGATIVE : INK },
    ], { fill: index % 2 ? BAND : WHITE, size: 8.2 });
    textBlock(cursor, `Clasificación temporal: ${week.time_label}. Cobertura del resultado: ${week.result_coverage_label}. Cobertura de C&D: ${week.cd_coverage_label}. Venta total ${kilos(week.V)} kg. Kilos cubiertos ${kilos(week.Q)} kg.`, {
      size: 7.7,
      color: MUTED,
    });
  });
  if (report.single_week) {
    cursor.y += 6;
    textBlock(cursor, "Sin comparación: una semana seleccionada", { size: 10, bold: true });
    textBlock(cursor, "No hay semana anterior dentro de la selección. No se inventa un periodo ni una cascada.", { size: 9.2 });
  }
}

function drawTransition(cursor, report, transition) {
  ensure(cursor, 160);
  cursor.y += 8;
  textBlock(cursor, report.plant, { size: 21, bold: true });
  const link = transition.consecutive
    ? "periodos seleccionados adyacentes"
    : "periodos seleccionados no consecutivos";
  const year = transition.year_change ? " Cambio de año identificado por las fechas." : "";
  textBlock(cursor, `Resultado y explicación de la variación | ${transition.previous_label} vs. ${transition.current_label}. ${link}.${year}`, {
    size: 10,
    color: MUTED,
  });
  headerRow(cursor, [
    { text: "RESULTADO anterior, $/kg", x: LEFT + 4 },
    { text: "RESULTADO actual, $/kg", x: 280 },
    { text: "Cambio, $/kg", x: RIGHT - 4, align: "right" },
  ]);
  bandRow(cursor, [
    { text: rate(transition.previous.r), x: LEFT + 4 },
    { text: rate(transition.current.r), x: 280, color: transition.current.r < 0 ? NEGATIVE : INK },
    { text: signedRate(transition.official.delta_r), x: RIGHT - 4, align: "right", color: transition.official.delta_r < 0 ? NEGATIVE : INK },
  ], { fill: BAND });
  bandRow(cursor, [
    { text: `Venta anterior, kg  ${kilos(transition.previous.V)}`, x: LEFT + 4 },
    { text: `Venta actual, kg  ${kilos(transition.current.V)}`, x: 280 },
    { text: `Cambio de volumen  ${percent(transition.official.percent_V)}`, x: RIGHT - 4, align: "right" },
  ], { fill: WHITE, size: 8 });
  textBlock(cursor, `Kilos cubiertos del resultado: ${kilos(transition.previous.Q)} → ${kilos(transition.current.Q)}.`, {
    size: 7.7,
    color: MUTED,
  });
  if (transition.conciliable) {
    const pressure = transition.pressure
      ? `${transition.pressure.label} (${signedRate(transition.pressure.aporte)} $/kg)`
      : "No se identifica presión entre las partidas con datos";
    const support = transition.support
      ? `${transition.support.label} (${signedRate(transition.support.aporte)} $/kg)`
      : "No se identifica apoyo positivo entre las partidas con datos";
    textBlock(cursor, `Mayor presión: ${pressure}. Mayor apoyo: ${support}.`, { size: 9.2 });
    drawWaterfall(cursor, transition);
  } else {
    textBlock(cursor, transition.label, { size: 10, bold: true, color: NEGATIVE });
    textBlock(cursor, transition.reasons.join(". "), { size: 8.2 });
    textBlock(cursor, "No se dibuja una cascada conciliada ni se atribuye el cambio de kilos cubiertos a venta física.", { size: 8.2 });
  }
  headerRow(cursor, [
    { text: "Partida ($/kg)", x: LEFT + 4 },
    { text: "Anterior", x: 330, align: "right" },
    { text: "Actual", x: 420, align: "right" },
    { text: "Aporte al cambio", x: RIGHT - 4, align: "right" },
  ]);
  transition.lines.forEach((line, index) => {
    bandRow(cursor, [
      { text: line.label, x: LEFT + 4 },
      { text: rate(line.anterior), x: 330, align: "right", color: line.anterior < 0 ? NEGATIVE : INK },
      { text: rate(line.actual), x: 420, align: "right", color: line.actual < 0 ? NEGATIVE : INK },
      { text: transition.conciliable ? signedRate(line.aporte) : "—", x: RIGHT - 4, align: "right", color: line.aporte < 0 ? NEGATIVE : INK },
    ], { fill: index % 2 ? BAND : WHITE, size: 8.2 });
  });
  textBlock(cursor, "C&D conserva el signo del Dashboard y se suma algebraicamente al resultado. HG/XK es $/kg y se resta.", {
    size: 7.7,
    color: MUTED,
  });
  if (transition.conciliable) {
    cursor.y += 4;
    textBlock(cursor, "Efectos en pesos", { size: 12, bold: true });
    transition.effects.forEach((line) => {
      if (line.aporte == null || Math.abs(line.aporte) < 0.0005) return;
      bandRow(cursor, [
        { text: line.label, x: LEFT + 4 },
        { text: pesos(line.pesos), x: RIGHT - 4, align: "right", color: line.pesos < 0 ? NEGATIVE : INK },
      ], { fill: WHITE, size: 8.2 });
    });
    bandRow(cursor, [
      { text: "Volumen sobre kilos cubiertos", x: LEFT + 4 },
      { text: pesos(transition.volume_effect), x: RIGHT - 4, align: "right" },
    ], { fill: BAND, size: 8.2 });
    bandRow(cursor, [
      { text: "Cambio del RESULTADO", x: LEFT + 4 },
      { text: pesos(transition.official.delta_R), x: RIGHT - 4, align: "right", color: transition.official.delta_R < 0 ? NEGATIVE : INK },
    ], { fill: WHITE, bold: true, size: 8.2 });
    textBlock(cursor, `Residual ${pesos(transition.residual)}. La identidad es algebraica y no demuestra causa comercial ni ahorro pagado.`, {
      size: 7.7,
      color: MUTED,
    });
  }
  const sources = transition.current.provenance.com_desc;
  textBlock(cursor, `Procedencia de C&D: ${sources.length ? sources.join("; ") : "no informada"}. Las demás partidas: ${transition.current.provenance.otras}.`, {
    size: 7.7,
    color: MUTED,
  });
}

function drawMethod(cursor) {
  cursor.y += 8;
  textBlock(cursor, "Método y límites", { size: 12, bold: true });
  textBlock(cursor, "El RESULTADO es el oficial del Dashboard, después de inversiones y del resto de partidas. No es utilidad antes de inversiones. El informe histórico de referencia usa RESULTADO final; la utilidad antes de inversiones pertenece a otro documento que ese informe cita.", { size: 8.2 });
  textBlock(cursor, "Las cifras salen del snapshot ya cargado del Dashboard. No se recalcularon tasas diarias ni se usaron celdas de Excel. Q es el kilo cubierto del resultado y V es la venta total. El puente de doce partidas solo aparece cuando, dentro de cada semana, Q=V, la base de C&D coincide y las identidades cierran.", { size: 8.2 });
  textBlock(cursor, "El anexo siguiente es la gráfica vectorial de las semanas seleccionadas, en su tamaño original.", { size: 8.2 });
}

function drawAnalytical(pdf, report) {
  const cursor = { pdf, y: 48 };
  drawOpening(cursor, report);
  if (report.single_week && report.weeks[0]) {
    textBlock(cursor, "Partidas oficiales de la semana seleccionada", { size: 12, bold: true });
    report.weeks[0].rates.forEach((line, index) => {
      bandRow(cursor, [
        { text: line.label, x: LEFT + 4 },
        { text: rate(line.value), x: RIGHT - 4, align: "right", color: line.value < 0 ? NEGATIVE : INK },
      ], { fill: index % 2 ? BAND : WHITE, size: 8.2 });
    });
    textBlock(cursor, "C&D conserva el signo del Dashboard y se suma algebraicamente al resultado.", {
      size: 7.7,
      color: MUTED,
    });
    const sources = report.weeks[0].provenance.com_desc;
    textBlock(cursor, `Procedencia de C&D: ${sources.length ? sources.join("; ") : "no informada"}. Las demás partidas: ${report.weeks[0].provenance.otras}.`, {
      size: 7.7,
      color: MUTED,
    });
  } else {
    report.transitions.forEach((transition) => drawTransition(cursor, report, transition));
  }
  drawMethod(cursor);
  resetGraphics(pdf);
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la fuente del PDF");
  return new Uint8Array(await response.arrayBuffer());
}

async function composePlantPdf(options) {
  const report = options && options.report;
  const svg = options && options.svg;
  if (!report || !svg) throw new Error("No se pudo componer el informe");
  const [{ jsPDF }, executive] = await Promise.all([
    import("jspdf"),
    import("./igf-diario-weekly-executive-pdf"),
  ]);
  const pdf = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const regular = await fetchBytes("/fonts/DejaVuSans.ttf");
  const bold = await fetchBytes("/fonts/DejaVuSans-Bold.ttf");
  installFace(pdf, regular, "DejaVuSans.ttf", "DejaVuSans", "normal");
  installFace(pdf, bold, "DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  drawAnalytical(pdf, report);
  await executive.appendExecutiveSvg(pdf, svg);
  const blob = pdf.output("blob");
  if (!(blob instanceof Blob) || blob.size < 8) throw new Error("El PDF generado está vacío");
  return blob;
}

module.exports = {
  A4W,
  A4H,
  drawAnalytical,
  installFace,
  composePlantPdf,
};
