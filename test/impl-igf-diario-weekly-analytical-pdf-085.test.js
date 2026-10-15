"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const report = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-report");
const analyticalPdf = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-pdf");

const FRONT = path.join(__dirname, "..", "frontend-dashboard");
const MODAL = fs.readFileSync(path.join(FRONT, "components", "IgfDiarioWeeklyExecutiveModal.tsx"), "utf8");
const BASE_RATES = [20, 12, 1, 0.5, 0.1, 0.2, 0.8, 0.15, 0.05, 0.2, -0.4, -3.2];

function covered(kg) {
  return {
    kg_total: kg,
    kg_covered: kg,
    days_with_sales: 7,
    days_covered: 7,
    covered_real_kg: kg,
    covered_projected_kg: 0,
  };
}

function weekFromRates(id, desde, hasta, rates, kg, extra) {
  const metrics = {};
  report.PARTIDAS.forEach((partida, index) => {
    metrics[partida.key] = rates[index];
  });
  const r = rates.reduce((sum, value, index) => sum + report.PARTIDAS[index].sign * value, 0);
  metrics.resultado_kg = extra && extra.r != null ? extra.r : r;
  metrics.resultado_mxn = extra && extra.R != null ? extra.R : metrics.resultado_kg * kg;
  metrics.venta_kg = extra && extra.V != null ? extra.V : kg;
  const q = extra && extra.Q != null ? extra.Q : kg;
  const qCd = extra && extra.qCd != null ? extra.qCd : q;
  return {
    id,
    fecha_desde: desde,
    fecha_hasta: hasta,
    week_number: extra && extra.week_number,
    week_year: extra && extra.week_year,
    estado: extra && extra.estado || "real",
    metrics,
    coverage: {
      resultado: { ...covered(q), kg_covered: q, kg_total: metrics.venta_kg },
      com_desc_kg: { ...covered(qCd), kg_covered: qCd, kg_total: metrics.venta_kg },
    },
    days: extra && extra.days || [],
    empresa: extra && extra.empresa,
    plant_code: extra && extra.plantCode,
  };
}

function pair(previous, current) {
  const frozen = report.freezePlantExport({
    weeks: [previous, current],
    selectedIds: [previous.id, current.id],
    empresa: "Tehuacán",
    plantCode: "TEHUACAN",
  });
  return report.buildAnalyticalReport(frozen, "14/10/2026, 21:13:50");
}

test("F01 conserva orden, campo y signo de las doce partidas", () => {
  assert.deepEqual(report.PARTIDAS.map((item) => item.key), [
    "precio_kg", "costo_kg", "flete_kg", "gasto_corporativo_kg", "inversiones_kg",
    "impuestos_federales_kg", "presupuesto_nomina_gastos_kg", "presupuesto_imss_sua_kg",
    "extraordinarios_kg", "provisiones_planta_kg", "hg_kg", "com_desc_kg",
  ]);
  assert.deepEqual(report.PARTIDAS.map((item) => item.sign), [1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1]);
});

test("F02 y F03 calculan C&D y HG con el signo oficial", () => {
  const previous = weekFromRates("a", "2026-10-04", "2026-10-10", BASE_RATES.map((value, index) => (index === 11 ? -3 : value)), 1000);
  const worse = weekFromRates("b", "2026-10-11", "2026-10-17", BASE_RATES.map((value, index) => (index === 11 ? -4 : value)), 1000);
  const better = weekFromRates("c", "2026-10-18", "2026-10-24", BASE_RATES.map((value, index) => (index === 11 ? -2.5 : value)), 1000);
  const down = pair(previous, worse).transitions[0];
  const up = pair(previous, better).transitions[0];
  assert.equal(down.lines[11].aporte, -1);
  assert.equal(up.lines[11].aporte, 0.5);
  const hgPrev = weekFromRates("h0", "2026-10-04", "2026-10-10", BASE_RATES.map((value, index) => (index === 10 ? -1 : value)), 1000);
  const hgNext = weekFromRates("h1", "2026-10-11", "2026-10-17", BASE_RATES.map((value, index) => (index === 10 ? -2 : value)), 1000);
  assert.equal(pair(hgPrev, hgNext).transitions[0].lines[10].aporte, 1);
});

test("F04 concilia el ejemplo sintético aunque las semanas tengan distinto volumen", () => {
  const actual = BASE_RATES.slice();
  actual[1] = 12.2;
  actual[10] = -0.1;
  actual[11] = -3.4;
  const built = pair(
    weekFromRates("s0", "2026-09-27", "2026-10-03", BASE_RATES, 1000, { week_year: 2026 }),
    weekFromRates("s1", "2026-10-04", "2026-10-10", actual, 800, { week_year: 2026 }),
  );
  const transition = built.transitions[0];
  assert.equal(transition.conciliable, true);
  assert.ok(Math.abs(transition.lines[1].aporte + 0.2) < 1e-9);
  assert.ok(Math.abs(transition.lines[10].aporte + 0.3) < 1e-9);
  assert.ok(Math.abs(transition.lines[11].aporte + 0.2) < 1e-9);
  assert.ok(Math.abs(transition.effects[1].pesos + 180) < 1e-9);
  assert.ok(Math.abs(transition.effects[10].pesos + 270) < 1e-9);
  assert.ok(Math.abs(transition.effects[11].pesos + 180) < 1e-9);
  assert.ok(Math.abs(transition.volume_effect + 370) < 1e-9);
  assert.ok(Math.abs(transition.residual) <= 0.01);
  assert.equal(transition.waterfall.top.length <= 5, true);
});

test("F05 F06 y F07 no arman puente cuando la base o la identidad fallan", () => {
  const actual = BASE_RATES.slice();
  actual[1] = 12.2;
  const mismatched = pair(
    weekFromRates("q0", "2026-10-04", "2026-10-10", BASE_RATES, 1000),
    weekFromRates("q1", "2026-10-11", "2026-10-17", actual, 800, { Q: 700, R: 1200, r: 1.5, V: 800 }),
  ).transitions[0];
  assert.equal(mismatched.conciliable, false);
  assert.equal(mismatched.waterfall, null);
  assert.match(mismatched.label, /No conciliable/);
  const brokenSum = weekFromRates("r1", "2026-10-11", "2026-10-17", actual, 800, { r: 9 });
  const sumCase = pair(weekFromRates("r0", "2026-10-04", "2026-10-10", BASE_RATES, 1000), brokenSum).transitions[0];
  assert.equal(sumCase.conciliable, false);
  assert.match(sumCase.reasons.join(" "), /no reproduce r|no cierra/);
});

test("F08 F09 y F13 distinguen ausencia, cero y porcentaje no aplicable", () => {
  const missing = BASE_RATES.slice();
  missing[2] = null;
  const assessed = report.assessWeek(weekFromRates("m", "2026-10-04", "2026-10-10", missing, 1000));
  assert.equal(assessed.rates[2].value, null);
  assert.equal(assessed.compatible, false);
  const zeroRates = BASE_RATES.map(() => 0);
  const zero = report.assessWeek(weekFromRates("z", "2026-10-04", "2026-10-10", zeroRates, 1000, { r: 0, R: 0 }));
  assert.equal(zero.rates[0].value, 0);
  const previous = weekFromRates("p", "2026-10-04", "2026-10-10", zeroRates, 0, { V: 0, Q: 0, r: 0, R: 0 });
  const current = weekFromRates("n", "2026-10-11", "2026-10-17", BASE_RATES, 1000);
  const transition = pair(previous, current).transitions[0];
  assert.equal(transition.official.percent_V, null);
});

test("F10 deja visible un residual mayor a un centavo", () => {
  const current = weekFromRates("e1", "2026-10-11", "2026-10-17", BASE_RATES, 1000, { R: 2300 });
  const transition = pair(weekFromRates("e0", "2026-10-04", "2026-10-10", BASE_RATES, 1000), current).transitions[0];
  assert.equal(transition.conciliable, false);
  assert.equal(transition.waterfall, null);
  assert.ok(transition.residual == null || Math.abs(transition.residual) > 0.01 || /no cierra|residual/.test(transition.reasons.join(" ")));
});

test("F11 desempatar el top cinco por el orden de la tabla", () => {
  const next = BASE_RATES.slice();
  next[2] = 1.1;
  next[4] = 0.2;
  const transition = pair(
    weekFromRates("t0", "2026-10-04", "2026-10-10", BASE_RATES, 1000),
    weekFromRates("t1", "2026-10-11", "2026-10-17", next, 1000),
  ).transitions[0];
  assert.equal(transition.conciliable, true);
  const names = transition.waterfall.top.map((line) => line.key);
  assert.deepEqual(names.slice(0, 2), ["flete_kg", "inversiones_kg"]);
});

test("F12 no inventa apoyo ni presión cuando todos los aportes son cero", () => {
  const transition = pair(
    weekFromRates("z0", "2026-10-04", "2026-10-10", BASE_RATES, 1000),
    weekFromRates("z1", "2026-10-11", "2026-10-17", BASE_RATES, 1000),
  ).transitions[0];
  assert.equal(transition.conciliable, true);
  assert.equal(transition.pressure, null);
  assert.equal(transition.support, null);
});

test("T01 T02 y T03 separan tiempo, cobertura y procedencia", () => {
  const mixed = report.assessWeek(weekFromRates("mx", "2026-10-04", "2026-10-10", BASE_RATES, 1000, {
    estado: "parcial",
    days: [{ com_desc_source: "LAST_REAL_FALLBACK", com_desc_source_date: "2026-10-03" }],
  }));
  assert.equal(mixed.time_label, "mixta");
  assert.equal(mixed.result_coverage_label, "completa");
  assert.deepEqual(mixed.provenance.com_desc, ["LAST_REAL_FALLBACK 2026-10-03"]);
  assert.equal(mixed.provenance.otras, "No informada");
});

test("S01 S02 y S03 respetan planta, selección y fechas", () => {
  const tehuacan = weekFromRates("w1", "2026-10-04", "2026-10-10", BASE_RATES, 1000, { empresa: "Tehuacán", plantCode: "TEH", week_year: 2026 });
  const other = weekFromRates("w9", "2026-10-04", "2026-10-10", BASE_RATES, 900, { empresa: "Puebla", plantCode: "PUE", week_year: 2026 });
  const next = weekFromRates("w2", "2026-12-27", "2027-01-02", BASE_RATES, 900, { empresa: "Tehuacán", plantCode: "TEH", week_year: 2027 });
  const middle = weekFromRates("w3", "2026-10-18", "2026-10-24", BASE_RATES, 950, { week_year: 2026 });
  const frozen = report.freezePlantExport({
    weeks: [other, tehuacan, next, middle],
    selectedIds: ["w2", "w1"],
    empresa: "Tehuacán",
    plantCode: "TEH",
  });
  assert.deepEqual(frozen.weeks.map((week) => week.id), ["w1", "w2"]);
  assert.equal(frozen.plant, "Tehuacán");
  assert.equal(JSON.stringify(frozen).includes("Puebla"), false);
  const built = report.buildAnalyticalReport(frozen, "sello");
  assert.equal(built.transitions.length, 1);
  assert.equal(built.transitions[0].consecutive, false);
  assert.equal(built.transitions[0].year_change, true);
  const one = report.buildAnalyticalReport(report.freezePlantExport({
    weeks: [tehuacan],
    selectedIds: ["w1"],
    empresa: "Tehuacán",
  }), "sello");
  assert.equal(one.single_week, true);
  assert.equal(one.transitions.length, 0);
});

test("el modal conserva el anexo 084 para TODAS y compone la planta desde el snapshot", () => {
  const start = MODAL.indexOf("async function download");
  const body = MODAL.slice(start, MODAL.indexOf("return (", start));
  assert.ok(body.indexOf("const snapshot = view") < body.indexOf("await"));
  assert.ok(body.indexOf("tryBegin()") < body.indexOf("await"));
  assert.match(body, /fontFamily:\s*"NotoSans"/);
  assert.match(body, /import\("@\/lib\/igf-diario-weekly-executive-pdf"\)/);
  assert.match(body, /svgToExecutivePdf\(stamped\)/);
  assert.match(body, /composePlantPdf/);
  assert.match(body, /downloadName\(snapshot\)/);
  assert.equal(body.includes("fetchIgfDiarioSemanal"), false);
  assert.doesNotMatch(body, /tooltip|setWeeks|setSelected|window\.print/);
});

test("P01 dibuja páginas A4 con DejaVu y texto del informe", () => {
  const jsPdfPath = [
    path.join(FRONT, "node_modules", "jspdf"),
    path.join(__dirname, "..", "..", "folio-084-wt", "frontend-dashboard", "node_modules", "jspdf"),
    path.join(__dirname, "..", "..", "folio-whatsapp-bot", "frontend-dashboard", "node_modules", "jspdf"),
  ].find((candidate) => fs.existsSync(candidate));
  assert.ok(jsPdfPath, "jspdf no está instalado");
  const { jsPDF } = require(jsPdfPath);
  const built = pair(
    weekFromRates("s0", "2026-09-27", "2026-10-03", BASE_RATES, 1000, { empresa: "Tehuacán" }),
    weekFromRates("s1", "2026-10-04", "2026-10-10", BASE_RATES.map((value, index) => (index === 1 ? 12.2 : value)), 800, { empresa: "Tehuacán" }),
  );
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const regular = fs.readFileSync(path.join(FRONT, "public", "fonts", "DejaVuSans.ttf"));
  const bold = fs.readFileSync(path.join(FRONT, "public", "fonts", "DejaVuSans-Bold.ttf"));
  analyticalPdf.installFace(pdf, regular, "DejaVuSans.ttf", "DejaVuSans", "normal");
  analyticalPdf.installFace(pdf, bold, "DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  analyticalPdf.drawAnalytical(pdf, built);
  const bytes = Buffer.from(pdf.output("arraybuffer"));
  assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-");
  const raw = bytes.toString("latin1");
  assert.match(raw, /\/BaseFont\s*\/DejaVuSans/);
  const boxes = [...raw.matchAll(/\/MediaBox\s*\[0 0 ([0-9.]+) ([0-9.]+)\]/g)];
  assert.ok(boxes.length >= 1);
  for (const box of boxes) {
    assert.ok(Math.abs(Number(box[1]) - 595.28) < 0.05);
    assert.ok(Math.abs(Number(box[2]) - 841.89) < 0.05);
  }
  assert.equal((raw.match(/\/Type\s*\/Page\b/g) || []).length >= 1, true);
  assert.equal(raw.includes("NotoSans"), false);
});

test("R2 deja las etiquetas de la cascada por encima de la tabla", () => {
  const jsPdfPath = [
    path.join(FRONT, "node_modules", "jspdf"),
    path.join(__dirname, "..", "..", "folio-084-wt", "frontend-dashboard", "node_modules", "jspdf"),
    path.join(__dirname, "..", "..", "folio-whatsapp-bot", "frontend-dashboard", "node_modules", "jspdf"),
  ].find((candidate) => fs.existsSync(candidate));
  assert.ok(jsPdfPath, "jspdf no está instalado");
  const { jsPDF } = require(jsPdfPath);
  const built = pair(
    weekFromRates("s0", "2026-10-04", "2026-10-10", BASE_RATES, 1000),
    weekFromRates("s1", "2026-10-18", "2026-10-24", BASE_RATES, 900),
  );
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const regular = fs.readFileSync(path.join(FRONT, "public", "fonts", "DejaVuSans.ttf"));
  const bold = fs.readFileSync(path.join(FRONT, "public", "fonts", "DejaVuSans-Bold.ttf"));
  analyticalPdf.installFace(pdf, regular, "DejaVuSans.ttf", "DejaVuSans", "normal");
  analyticalPdf.installFace(pdf, bold, "DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  const marks = [];
  const original = pdf.text.bind(pdf);
  pdf.text = (text, x, y, options) => {
    const lines = Array.isArray(text) ? text : [String(text)];
    pdf.setFontSize(pdf.getFontSize());
    const step = typeof pdf.getLineHeight === "function" ? pdf.getLineHeight() : 8;
    lines.forEach((line, index) => marks.push({ line: String(line), y: y + index * step }));
    return original(text, x, y, options);
  };
  analyticalPdf.drawAnalytical(pdf, built);
  const labels = marks.filter((mark) => mark.line === "Gasto" || mark.line === "corporativo" || mark.line === "Comisiones y" || mark.line === "descuentos");
  const header = marks.find((mark) => mark.line === "Partida ($/kg)");
  assert.ok(labels.length >= 1);
  assert.ok(header);
  const lowest = Math.max(...labels.map((mark) => mark.y));
  assert.ok(lowest + 2 < header.y - 11, `etiqueta ${lowest} entra en la tabla ${header.y}`);
});
