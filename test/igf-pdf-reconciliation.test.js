"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildAnalyticalReport, freezePlantExport, PARTIDAS } = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-report");
const { buildExecutiveView } = require("../frontend-dashboard/lib/igf-diario-weekly-executive-chart");
const weekly = require("../lib/igf-diario-weekly-plant");
const grafica = require("../lib/igf-diario-grafica");
const analyticalPdf = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-pdf");

function syntheticWeeks() {
  return [
    { kg: 2000, rates: [20,10,1,1,2,3,0.5,0.5,0.5,0.5,-1,-0.5] },
    { kg: 3000, rates: [20,10,1,1,1,2,1,1,0.5,0.5,-0.2,-0.5] },
  ].map(({ kg, rates }, i) => {
    const metrics = Object.fromEntries(PARTIDAS.map((p, j) => [p.key, rates[j]]));
    const result = PARTIDAS.reduce((sum, p, j) => sum + p.sign * rates[j], 0);
    Object.assign(metrics, { venta_kg: kg, resultado_kg: result, resultado_mxn: kg * result, hg_mxn: kg * rates[10] });
    return { id: `w${i}`, fecha_desde: `2026-10-${i ? "11" : "04"}`, fecha_hasta: `2026-10-${i ? "17" : "10"}`, metrics,
      coverage: { resultado: { kg_covered: kg }, com_desc_kg: { kg_covered: kg } } };
  });
}

test("Excel expense groups preserve the original twelve-part reconciliation without double counting", () => {
  const weeks = syntheticWeeks();
  const r = buildAnalyticalReport(freezePlantExport({ weeks, selectedIds: ["w0", "w1"] }));
  const t = r.transitions[0];
  assert.equal(t.conciliable, true);
  assert.equal(t.lines.length, 12); assert.equal(t.displayLines.length, 7);
  assert.equal(t.displayLines[3].anterior, 6); assert.equal(t.displayLines[3].actual, 4);
  assert.equal(t.displayLines[4].anterior, 2); assert.equal(t.displayLines[4].actual, 3);
  assert.ok(Math.abs(t.displayEffects.reduce((n, l) => n + l.pesos, 0) + t.volume_effect - t.official.delta_R) < 0.01);
  // Corporate dollars are unchanged, but the lower rate has a positive attributed effect.
  assert.equal(t.displayLines[3].actual * t.current.V - t.displayLines[3].anterior * t.previous.V, 0);
  assert.equal(t.displayEffects[3].pesos, 5000);
  // HG dollar delta and signed rate attribution have different meanings and signs.
  assert.equal(weeks[1].metrics.hg_mxn - weeks[0].metrics.hg_mxn, 1400);
  assert.equal(t.displayEffects[5].pesos, -2000);
});

test("Missing expense components keep the whole group unavailable and suppress the waterfall", () => {
  const weeks = syntheticWeeks(); weeks[1].metrics.inversiones_kg = null;
  const t = buildAnalyticalReport(freezePlantExport({ weeks, selectedIds: ["w0", "w1"] })).transitions[0];
  assert.equal(t.displayLines[3].actual, null); assert.equal(t.waterfall, null);
});

test("Physical HG travels from Control de compras to weekly chart without replacing financial HG or sales", () => {
  const built = grafica.materializePlantMonth({ year: 2026, month: 10, plant: "Fixture", corteYmd: "2026-10-15", project: false,
    casaTon: new Map([["2026-10-04", 2]]), comTon: new Map(), precioRows: [],
    comprasByFecha: new Map([["2026-10-04", { hgKilos: 17, hgImporte: -221, costoKg: 12, fleteKg: 1 }]]),
    cdByFecha: new Map(), priorCdByFecha: new Map() });
  const days = weekly.daysFromBuilt(built, null);
  const day = days.get("2026-10-04");
  assert.equal(day.hgKilos, 17); assert.equal(day.hgImporte, -221);
  const records = weekly.weekDayRecords([day, { ...day, fecha: "2026-10-05", hgKilos: -3 }], "2026-10-15");
  const view = buildExecutiveView({ scope: "plant", weeks: [{ id: "w", days: records, metrics: { venta_kg: 4000, hg_mxn: -442 } }], selectedIds: ["w"] });
  const hg = view.indicators.find((i) => i.id === "kilos");
  assert.equal(hg.label, "HG EN KILOS"); assert.equal(hg.columns[0].value, 14);
  assert.deepEqual(hg.columns[0].points.map((p) => p.value), [17,-3]);
  assert.equal(view.indicators.find((i) => i.id === "hg").columns[0].value, -442);
});

test("Unavailable physical HG is not replaced by sales, and captured zero remains zero", () => {
  const weeks = [{ id: "a", metrics: { venta_kg: 9000 }, days: [{ fecha: "2026-10-04", metrics: { venta_kg: 9000 } }] },
    { id: "b", metrics: { venta_kg: 8000 }, days: [{ fecha: "2026-10-11", metrics: { venta_kg: 8000 }, hg_kilos: 0 }] }];
  const hg = buildExecutiveView({ weeks, selectedIds: ["a", "b"] }).indicators.find((i) => i.id === "kilos");
  assert.equal(hg.columns[0].value, null); assert.equal(hg.columns[1].value, 0);
});

test("Weekly monetary amounts use the same source as the charts, including partial data and zero", () => {
  const weeks = syntheticWeeks();
  weeks[0].days = [
    { gasto_corporativo_mxn: 100, gasto_operativo_mxn: 200 },
    { gasto_corporativo_mxn: 50, gasto_operativo_mxn: null },
  ];
  weeks[1].days = [{ gasto_corporativo_mxn: 0, gasto_operativo_mxn: null }];
  // Amounts must not be inferred from the rates or the total sales volume.
  weeks[1].metrics.hg_mxn = null;
  const selectedIds = ["w0", "w1"];
  const frozen = freezePlantExport({ weeks, selectedIds });
  const r = buildAnalyticalReport(frozen);
  const view = buildExecutiveView({ weeks, selectedIds });
  for (const [key, indicator] of [["corporativo", "gasto_corporativo"], ["operativo", "gasto_operativo"], ["hg", "hg"]]) {
    assert.deepEqual(r.weeks.map((w) => w.amounts[key]), view.indicators.find((i) => i.id === indicator).columns.map((c) => c.value));
  }
  assert.deepEqual(r.weeks[0].amounts, { corporativo: 150, operativo: 200, hg: -2000 });
  assert.deepEqual(r.weeks[1].amounts, { corporativo: 0, operativo: null, hg: null });
  weeks[0].days[0].gasto_corporativo_mxn = 999;
  assert.equal(buildAnalyticalReport(frozen).weeks[0].amounts.corporativo, 150);
  assert.equal(buildAnalyticalReport(freezePlantExport({ weeks: syntheticWeeks(), selectedIds })).weeks[0].amounts.corporativo, null);
});

test("PDF shows actual monetary differences and omits the average-volume attribution table", () => {
  const weeks = syntheticWeeks();
  weeks[0].days = [{ gasto_corporativo_mxn: 12000, gasto_operativo_mxn: 4000 }];
  weeks[1].days = [{ gasto_corporativo_mxn: 12000, gasto_operativo_mxn: 9000 }];
  const report = buildAnalyticalReport(freezePlantExport({ weeks, selectedIds: ["w0", "w1"] }));
  const { jsPDF } = require("../frontend-dashboard/node_modules/jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  for (const [file, style] of [["DejaVuSans.ttf", "normal"], ["DejaVuSans-Bold.ttf", "bold"]]) {
    analyticalPdf.installFace(pdf, fs.readFileSync(path.join(__dirname, "../frontend-dashboard/public/fonts", file)), file, "DejaVuSans", style);
  }
  const text = [];
  const original = pdf.text.bind(pdf);
  pdf.text = (value, ...args) => {
    text.push(...(Array.isArray(value) ? value : [value]));
    return original(value, ...args);
  };
  analyticalPdf.drawAnalytical(pdf, report);
  const start = text.indexOf("Importes semanales y variación real ($)");
  assert.ok(start >= 0);
  assert.deepEqual(text.slice(start + 5, start + 17), [
    "Gasto corporativo total", "12,000.00", "12,000.00", "0.00",
    "Gasto operativo total", "4,000.00", "9,000.00", "+5,000.00",
    "HG (importe)", "-2,000.00", "-600.00", "+1,400.00",
  ]);
  assert.equal(text[text.indexOf("Cambio del RESULTADO total") + 1], "+2,100.00");
  assert.doesNotMatch(text.join("\n"), /Aporte al resultado por cambio de tasas|Efectos en pesos|Volumen sobre kilos cubiertos|kilos promedio|Residual/);
});
