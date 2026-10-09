"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const descuentos = require("../lib/igf-diario-descuentos-columna");
const weekly = require("../lib/igf-diario-weekly-plant");
const weeklyExcel = require("../lib/igf-diario-weekly-excel");
const igf = require("../lib/igf-diario-puebla");

const ROOT = path.join(__dirname, "..");
const PANEL = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioWeeklyAllPlantsPanel.tsx"), "utf8");
const FORECAST = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

const JOSE = "JOSE ALBERTO LAYNES PEREZ";

function jose(fecha, monto) {
  return { cliente: JOSE, fecha, kg: 1000, monto };
}

test("JOSE baja 5.185 a 4.907 y solo el delta queda verde", () => {
  const lines = descuentos.discountLines([
    jose("2026-09-20", 5185),
    jose("2026-10-06", 4907),
  ], "2026-10-06");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].prev, 5.185);
  assert.equal(lines[0].cur, 4.907);
  assert.equal(lines[0].delta, 0.278);
  assert.equal(lines[0].up, false);
  const text = descuentos.plain(lines);
  assert.equal(text, `${JOSE} — Bajó su comisión respecto a su última compra de $5.185/kg a $4.907/kg = $0.278/kg`);
  const cell = descuentos.cellValue(lines);
  assert.equal(cell.richText.length, 2);
  assert.equal(cell.richText[1].text, "$0.278/kg");
  assert.equal(cell.richText[1].font.color.argb, descuentos.GREEN);
  assert.equal(cell.richText[0].font, undefined);
  assert.match(cell.richText[0].text, /Bajó su comisión/);
});

test("el alza inversa pinta solo el delta en rojo", () => {
  const lines = descuentos.discountLines([
    jose("2026-10-01", 4907),
    jose("2026-10-06", 5185),
  ], "2026-10-06");
  assert.equal(lines[0].delta, 0.278);
  assert.match(descuentos.plain(lines), /Subió su comisión/);
  const cell = descuentos.cellValue(lines);
  assert.equal(cell.richText[1].text, "$0.278/kg");
  assert.equal(cell.richText[1].font.color.argb, descuentos.RED);
  assert.equal(cell.richText[0].font, undefined);
});

test("sin cambio, sin compra anterior o sin monto no se lista", () => {
  assert.deepEqual(descuentos.discountLines([
    jose("2026-10-01", 5185),
    jose("2026-10-06", 5185),
  ], "2026-10-06"), []);
  assert.deepEqual(descuentos.discountLines([
    jose("2026-10-06", 4907),
  ], "2026-10-06"), []);
  assert.deepEqual(descuentos.discountLines([
    jose("2026-10-01", null),
    jose("2026-10-06", 4907),
  ], "2026-10-06"), []);
  assert.equal(descuentos.cellValue([]), null);
});

test("la compra anterior cruza semana y mes, y omite al cliente sin cambio", () => {
  const events = [
    jose("2026-09-30", 5185),
    jose("2026-10-06", 4907),
    { cliente: "CLIENTE SIN CAMBIO", fecha: "2026-09-29", kg: 100, monto: 200 },
    { cliente: "CLIENTE SIN CAMBIO", fecha: "2026-10-06", kg: 100, monto: 200 },
    { cliente: "OTRA PLANTA NO", fecha: "2026-10-03", kg: 80, monto: 100 },
    { cliente: "OTRA PLANTA NO", fecha: "2026-10-06", kg: 80, monto: 200 },
  ];
  const week = descuentos.discountLines([
    jose("2026-10-03", 5185),
    jose("2026-10-06", 4907),
  ], "2026-10-06");
  assert.equal(week[0].delta, 0.278);
  const month = descuentos.discountLines(events, "2026-10-06");
  assert.equal(month.length, 2);
  assert.equal(month.find((line) => line.cliente === JOSE).prev, 5.185);
  assert.ok(month.some((line) => line.cliente === "OTRA PLANTA NO"));
  assert.equal(month.find((line) => line.cliente === "CLIENTE SIN CAMBIO"), undefined);
  assert.equal(descuentos.plain(month).split("\n").length, 2);
});

test("el rich text de descuentos sobrevive al XLSX", async () => {
  const lines = descuentos.discountLines([
    jose("2026-09-30", 5185),
    jose("2026-10-06", 4907),
  ], "2026-10-06");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("IGF");
  ws.getCell("AK6").value = descuentos.cellValue(lines);
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(await wb.xlsx.writeBuffer());
  const value = again.getWorksheet("IGF").getCell("AK6").value;
  const joined = value.richText.map((part) => part.text).join("");
  assert.match(joined, new RegExp(JOSE));
  assert.match(joined, /Bajó su comisión/);
  const colored = value.richText.find((part) => String(part.text).includes("$0.278/kg"));
  assert.equal(colored.font.color.argb, descuentos.GREEN);
  for (const part of value.richText) {
    if (part !== colored) assert.equal(part.font && part.font.color, undefined);
  }
});

test("AK queda en la columna 37 y el comentario no se mueve", () => {
  const lines = descuentos.discountLines([
    jose("2026-09-02", 5185),
    jose("2026-09-10", 4907),
  ], "2026-09-10");
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    corteYmd: "2026-09-20",
    dailyInsights: {
      "2026-09-10": {
        comentario: "COMENTARIO DEL DIA intacto",
        ventas: "venta casa",
        descuentosCell: descuentos.cellValue(lines),
        descuentosPlain: descuentos.plain(lines),
      },
    },
  });
  const ws = wb.getWorksheet("IGF Diario Puebla");
  let row = null;
  for (let r = 1; r <= 80; r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.getUTCDate() === 10) row = r;
  }
  assert.equal(ws.getCell(5, 34).value, "COMENTARIO DEL DIA");
  assert.equal(ws.getCell(5, 37).value, "DESCUENTOS");
  assert.equal(ws.getCell(row, 34).value, "COMENTARIO DEL DIA intacto");
  assert.equal(ws.getCell(row, 35).value, "venta casa");
  assert.equal(ws.getCell(row, 37).value.richText[1].text, "$0.278/kg");
  assert.equal(ws.getColumn(36).hidden, true);
  assert.equal(ws.getColumn(37).hidden, false);
  assert.equal(ws.getColumn(38).hidden, true);
});

test("octubre inserta DESCUENTOS en AK y corre los auxiliares a AL y AM", () => {
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: "Morelos",
    humanName: "Morelos",
    corteYmd: "2026-10-20",
    dailyInsights: {
      "2026-10-06": {
        comentario: "nota",
        descuentosCell: descuentos.cellValue(descuentos.discountLines([
          jose("2026-10-01", 4907),
          jose("2026-10-06", 5185),
        ], "2026-10-06")),
        descuentosPlain: "delta",
      },
    },
  });
  const ws = wb.getWorksheet("IGF Diario Morelos");
  assert.equal(ws.getCell(5, 35).value, "COMENTARIO DEL DIA");
  assert.equal(ws.getCell(5, 36).value, "VENTAS");
  assert.equal(ws.getCell(5, 37).value, "DESCUENTOS");
  assert.equal(ws.getColumn(37).hidden, false);
  assert.equal(ws.getColumn(38).hidden, true);
  assert.equal(ws.getColumn(39).hidden, true);
  let row = null;
  for (let r = 1; r <= 80; r += 1) {
    const value = ws.getCell(r, 1).value;
    if (value instanceof Date && value.getUTCMonth() === 9 && value.getUTCDate() === 6) row = r;
  }
  assert.equal(ws.getCell(row, 35).value, "nota");
  assert.equal(ws.getCell(row, 37).value.richText[1].font.color.argb, descuentos.RED);
});

function plant(extra) {
  return {
    venta_kg: 0,
    precio_kg: null,
    ingreso_mxn: null,
    costo_kg: null,
    flete_kg: null,
    margen_kg: null,
    gasto_corporativo_kg: null,
    inversiones_kg: null,
    impuestos_federales_kg: null,
    margen_neto_kg: null,
    presupuesto_nomina_gastos_kg: null,
    presupuesto_imss_sua_kg: null,
    extraordinarios_kg: null,
    provisiones_planta_kg: null,
    sobrante_antes_hg_kg: null,
    hg_mxn: null,
    hg_kg: null,
    sobrante_con_hg_kg: null,
    com_desc_kg: null,
    resultado_kg: null,
    resultado_mxn: null,
    ...extra,
  };
}

test("Todas pondera por venta y suma los importes", () => {
  const a = plant({
    venta_kg: 100000,
    precio_kg: 20,
    costo_kg: 10,
    flete_kg: 1,
    margen_kg: 9,
    gasto_corporativo_kg: 0.5,
    inversiones_kg: 0.1,
    impuestos_federales_kg: 0.2,
    margen_neto_kg: 8.2,
    presupuesto_nomina_gastos_kg: 0.3,
    presupuesto_imss_sua_kg: 0.05,
    extraordinarios_kg: 0.01,
    provisiones_planta_kg: 0.02,
    sobrante_antes_hg_kg: 7.82,
    sobrante_con_hg_kg: 7.5,
    com_desc_kg: 0.4,
    resultado_kg: 5,
    ingreso_mxn: 2000000,
    hg_mxn: 32000,
    resultado_mxn: 500000,
  });
  const b = plant({
    venta_kg: 50000,
    precio_kg: 22,
    costo_kg: 12,
    flete_kg: 2,
    margen_kg: 8,
    gasto_corporativo_kg: 1,
    inversiones_kg: 0.4,
    impuestos_federales_kg: 0.5,
    margen_neto_kg: 6.1,
    presupuesto_nomina_gastos_kg: 0.6,
    presupuesto_imss_sua_kg: 0.2,
    extraordinarios_kg: 0.04,
    provisiones_planta_kg: 0.08,
    sobrante_antes_hg_kg: 5.18,
    sobrante_con_hg_kg: 4.8,
    com_desc_kg: 0.7,
    resultado_kg: 3,
    ingreso_mxn: 1100000,
    hg_mxn: 19000,
    resultado_mxn: 150000,
  });
  const all = weekly.consolidateMetrics([a, b]);
  assert.equal(all.venta_kg, 150000);
  assert.equal(all.ingreso_mxn, 3100000);
  assert.equal(all.hg_mxn, 51000);
  assert.equal(all.resultado_mxn, 650000);
  assert.ok(Math.abs(all.precio_kg - ((100000 * 20) + (50000 * 22)) / 150000) < 1e-9);
  assert.notEqual(all.precio_kg, 21);
  assert.ok(Math.abs(all.costo_kg - ((100000 * 10) + (50000 * 12)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.flete_kg - ((100000 * 1) + (50000 * 2)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.margen_kg - ((100000 * 9) + (50000 * 8)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.com_desc_kg - ((100000 * 0.4) + (50000 * 0.7)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.resultado_kg - (650000 / 150000)) < 1e-9);
  assert.ok(Math.abs(all.gasto_corporativo_kg - ((100000 * 0.5) + (50000 * 1)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.margen_neto_kg - ((100000 * 8.2) + (50000 * 6.1)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.sobrante_antes_hg_kg - ((100000 * 7.82) + (50000 * 5.18)) / 150000) < 1e-9);
  assert.ok(Math.abs(all.sobrante_con_hg_kg - ((100000 * 7.5) + (50000 * 4.8)) / 150000) < 1e-9);
});

test("null y venta 0 no entran al ponderado", () => {
  const priced = weekly.consolidateMetrics([
    plant({ venta_kg: 100000, precio_kg: 20, costo_kg: 10 }),
    plant({ venta_kg: 50000, precio_kg: null, costo_kg: 12 }),
  ]);
  assert.equal(priced.precio_kg, 20);
  assert.ok(Math.abs(priced.costo_kg - ((100000 * 10) + (50000 * 12)) / 150000) < 1e-9);
  const zero = weekly.consolidateMetrics([
    plant({ venta_kg: 100000, precio_kg: 20 }),
    plant({ venta_kg: 0, precio_kg: 99 }),
    plant({ venta_kg: null, precio_kg: 50 }),
  ]);
  assert.equal(zero.precio_kg, 20);
  assert.equal(zero.venta_kg, 100000);
});

test("RESULTADO $/kg coincide con importe/venta cuando la planta está completa", () => {
  const rows = [
    plant({ venta_kg: 100000, resultado_kg: 5, resultado_mxn: 500000 }),
    plant({ venta_kg: 50000, resultado_kg: 3, resultado_mxn: 150000 }),
  ];
  const all = weekly.consolidateMetrics(rows);
  assert.ok(Math.abs(all.resultado_kg - (all.resultado_mxn / all.venta_kg)) < 1e-9);
  const partial = weekly.consolidateMetrics([
    plant({ venta_kg: 100000, resultado_kg: 5, resultado_mxn: 500000 }),
    plant({ venta_kg: 50000, resultado_kg: null, resultado_mxn: null }),
  ]);
  assert.equal(partial.resultado_kg, 5);
  assert.equal(partial.resultado_mxn, 500000);
  assert.notEqual(partial.resultado_kg, partial.resultado_mxn / partial.venta_kg);
});

test("RESUMEN SEMANAL va antes de la primera planta", () => {
  const header = PANEL.indexOf("RESUMEN SEMANAL");
  const plants = PANEL.indexOf("plants.map");
  assert.ok(header > 0);
  assert.ok(header < plants);
  assert.match(PANEL, /data-resumen="1"/);
});

test("el RESUMEN de Todas y su gráfica usan el mismo consolidado", async () => {
  const days = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
  const pooled = (100000 * 20 + 50000 * 22) / 150000;
  const dayMetrics = days.map((fecha, index) => ({
    fecha,
    estado: index === 6 ? "proyectada" : "real",
    metrics: index === 1
      ? plant({ venta_kg: 150000, precio_kg: pooled, resultado_mxn: 100, resultado_kg: 100 / 150000 })
      : index === 2
        ? plant({ venta_kg: 150000, precio_kg: 10, resultado_mxn: -50, resultado_kg: -50 / 150000 })
        : index === 6
          ? plant({ venta_kg: 1000, precio_kg: 1, resultado_mxn: 25, resultado_kg: 0.025 })
          : plant({}),
  }));
  const summary = {
    empresa: "TODAS CONSOLIDADO",
    week: { week_number: 41, fecha_desde: days[0], fecha_hasta: days[6] },
    metrics: plant({
      venta_kg: 150000,
      precio_kg: pooled,
      ingreso_mxn: 3100000,
      resultado_mxn: 650000,
      resultado_kg: 650000 / 150000,
    }),
    days: dayMetrics,
  };
  const wb = new ExcelJS.Workbook();
  await weeklyExcel.fillResumen(wb, summary, "precio_kg");
  const ws = wb.getWorksheet("RESUMEN");
  assert.equal(ws.getCell("A1").value, "IGF DIARIO SEMANAL · TODAS CONSOLIDADO");
  assert.equal(ws.getCell(4, 2).value, "Semana");
  assert.equal(ws.getCell(4, 3).value, "Dom 04/10");
  let precioRow = null;
  for (let r = 1; r <= 40; r += 1) {
    if (ws.getCell(r, 1).value === "Precio de Venta al Público") precioRow = r;
  }
  assert.ok(Math.abs(ws.getCell(precioRow, 2).value - pooled) < 1e-9);
  assert.equal(ws.getCell(precioRow, 3).value, "—");
  assert.equal(ws.getCell(precioRow, 4).value, pooled);
  assert.equal(ws.getCell(precioRow, 5).value, 10);
  const svg = weeklyExcel.chartSvg(summary, "resultado_mxn");
  assert.match(svg, /data-zero="1"/);
  assert.match(svg, /\+\$100/);
  assert.match(svg, /-\$50/);
  assert.match(svg, /stroke-dasharray="6 4"/);
  assert.doesNotMatch(svg, /points="[^"]*56\.0,/);
  const individual = FORECAST.indexOf('if (includeIgfDiario && options && options.igfWeeklySummary) wb.addWorksheet("RESUMEN")');
  const todasFill = FORECAST.indexOf("if (!exportPlant && options && options.igfWeeklyTodasSummary)");
  assert.ok(individual > 0);
  assert.ok(todasFill > individual);
  assert.match(SERVER, /igfWeeklyTodasSummary = todasWeek\.resumen/);
  assert.match(SERVER, /attachToInsights/);
});
