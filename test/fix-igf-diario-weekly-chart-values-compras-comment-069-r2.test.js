"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const comment = require("../lib/igf-diario-compras-comment");
const compras = require("../lib/compras-dashboard");
const excel = require("../lib/igf-diario-weekly-excel");
const igf = require("../lib/igf-diario-puebla");
const weekly = require("../lib/igf-diario-weekly-plant");

const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

function gridDay(fecha, cost, cells) {
  return {
    ymd: fecha,
    cells: cells || {},
    consolidado: { kg: cost ? 1 : 0, importe: cost || 0, costo_kg: cost },
  };
}

function payload(days, priors) {
  return {
    year: 2026,
    month: 10,
    providers: [
      { id: 1, nombre: "TOMZA TEPEJI" },
      { id: 2, nombre: "PEMEX TUXPAN" },
    ],
    grid: { days },
    costos_previos_validos: priors || [],
  };
}

test("Puebla 07/10 usa el promedio de los dos consolidados anteriores", () => {
  const block = comment.comprasComment(
    { costo_kg: 12.918, providers: [{ nombre: "TOMZA TEPEJI", kg: 20220 }] },
    [{ fecha: "2026-10-05", costo_kg: 12.465 }, { fecha: "2026-10-06", costo_kg: 12.465 }]
  );
  assert.equal(block.reference, 12.465);
  assert.equal(block.delta, 0.453);
  assert.match(block.plain, /^COMPRAS: Incrementó el costo de compra \+0\.453 \$\/kg/);
  assert.match(block.plain, /referencia promedio de 12\.465 \$\/kg en los 2 días anteriores a 12\.918 \$\/kg hoy/);
  assert.match(block.plain, /Compra: TOMZA TEPEJI — 20,220 kg/);
  assert.equal(block.mark.deltaText, "+0.453 $/kg");
  assert.equal(block.mark.color, comment.RED);
});

test("la variación se colorea sola y el comentario de venta permanece", async () => {
  const up = comment.comprasComment(
    { costo_kg: 12.918, providers: [{ nombre: "TOMZA TEPEJI", kg: 20220 }] },
    [{ costo_kg: 12.465 }, { costo_kg: 12.465 }]
  );
  const down = comment.comprasComment(
    { costo_kg: 12.000, providers: [{ nombre: "TOMZA TEPEJI", kg: 1000 }] },
    [{ costo_kg: 12.465 }, { costo_kg: 12.465 }]
  );
  const flat = comment.comprasComment(
    { costo_kg: 12.465, providers: [{ nombre: "TOMZA TEPEJI", kg: 1000 }] },
    [{ costo_kg: 12.465 }, { costo_kg: 12.465 }]
  );
  assert.match(down.plain, /Disminuyó/);
  assert.equal(down.mark.color, comment.GREEN);
  assert.ok(down.delta < 0);
  assert.match(flat.plain, /Sin cambio/);
  assert.equal(flat.mark.color, comment.NEUTRAL);
  assert.equal(flat.delta, 0);
  const venta = "Venta: 100 kg vs ref 90 kg.";
  const pack = {
    comentario: `${up.plain}\n${venta}`,
    comprasMark: { ...up.mark, rest: venta },
  };
  const wb = new ExcelJS.Workbook();
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: "Puebla",
    humanName: "Puebla",
    dailyInsights: { "2026-10-07": pack },
  });
  const sheet = wb.getWorksheet("IGF Diario Puebla");
  let found = null;
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const value = sheet.getCell(row, 35).value;
    if (value && typeof value === "object" && value.richText) found = value;
  }
  assert.ok(found);
  const joined = found.richText.map((part) => part.text).join("");
  assert.match(joined, /Incrementó/);
  assert.match(joined, /Venta: 100 kg vs ref 90 kg/);
  const colored = found.richText.find((part) => part.text === "+0.453 $/kg");
  assert.equal(colored.font.color.argb, comment.RED);
  for (const part of found.richText) {
    if (part.text === "+0.453 $/kg") continue;
    const argb = part.font && part.font.color && part.font.color.argb;
    assert.notEqual(argb, comment.RED);
    assert.notEqual(argb, comment.GREEN);
  }
  const raw = await wb.xlsx.writeBuffer();
  const opened = new ExcelJS.Workbook();
  await opened.xlsx.load(raw);
  const again = opened.getWorksheet("IGF Diario Puebla");
  let reloaded = null;
  again.eachRow((row) => {
    const value = row.getCell(35).value;
    if (value && value.richText) reloaded = value;
  });
  assert.equal(reloaded.richText.find((part) => String(part.text).includes("+0.453")).font.color.argb, comment.RED);
});

test("sin compra no compara, salta huecos y cruza semana y mes", () => {
  const none = comment.applyPayload({
    eligibleEnd: "2026-10-07",
    byDate: { "2026-10-04": { comentario: "Venta: 10 kg.", ventas: "" } },
  }, payload([
    gridDay("2026-10-04", null),
  ]));
  assert.equal(none.byDate["2026-10-04"].comentario, "Venta: 10 kg.");
  assert.equal(none.byDate["2026-10-04"].comprasMark || null, null);

  const skipped = comment.applyPayload({
    eligibleEnd: "2026-10-05",
    byDate: {},
  }, payload([
    gridDay("2026-10-01", 10),
    gridDay("2026-10-02", 0),
    gridDay("2026-10-03", 11),
    gridDay("2026-10-04", null),
    gridDay("2026-10-05", 12, { 1: { kg: 100 } }),
  ]));
  assert.match(skipped.byDate["2026-10-05"].comentario, /referencia promedio de 10\.500/);
  assert.equal(skipped.byDate["2026-10-02"], undefined);

  const week = comment.applyPayload({
    eligibleEnd: "2026-10-05",
    byDate: { "2026-10-05": { comentario: "Venta: sigue.", ventas: "NUEVO: CASA — 1 kg" } },
  }, payload([
    gridDay("2026-10-02", 10),
    gridDay("2026-10-03", 11),
    gridDay("2026-10-05", 12, { 1: { kg: 20220 } }),
  ]));
  assert.match(week.byDate["2026-10-05"].comentario, /10\.500 \$\/kg en los 2 días anteriores/);
  assert.match(week.byDate["2026-10-05"].comentario, /Venta: sigue\./);
  assert.match(week.byDate["2026-10-05"].ventas, /NUEVO: CASA/);

  const month = comment.applyPayload({
    eligibleEnd: "2026-10-01",
    byDate: {},
  }, payload([
    gridDay("2026-10-01", 12.918, { 1: { kg: 20220 } }),
  ], [
    { fecha: "2026-09-29", costo_kg: 12.465 },
    { fecha: "2026-09-30", costo_kg: 12.465 },
  ]));
  assert.match(month.byDate["2026-10-01"].comentario, /12\.465 \$\/kg en los 2 días anteriores a 12\.918/);
});

test("el proveedor sale de la compra real y varios se enumeran", () => {
  const rows = compras.listValidConsolidatedDays([
    { fecha: "2026-10-05", kg: 100, importe: 1246.5 },
    { fecha: "2026-10-06", kg: 0, importe: 0 },
    { fecha: "2026-10-07", kg: 10, importe: 0 },
  ]);
  assert.deepEqual(rows.map((row) => row.fecha), ["2026-10-05"]);
  assert.equal(rows[0].costo_kg, 12.465);
  const several = comment.comprasComment({
    costo_kg: 12.918,
    providers: comment.providerBuys({
      cells: {
        1: { kg: 20220 },
        2: { kg: 0 },
      },
    }, [
      { id: 1, nombre: "Tomza Tepeji" },
      { id: 2, nombre: "PEMEX TUXPAN" },
    ]),
  }, [{ costo_kg: 12.465 }, { costo_kg: 12.465 }]);
  assert.match(several.plain, /Compra: TOMZA TEPEJI — 20,220 kg/);
  assert.doesNotMatch(several.plain, /PEMEX/);
  const both = comment.comprasComment({
    costo_kg: 12,
    providers: comment.providerBuys({
      cells: { 1: { kg: 10000 }, 2: { kg: 5000 } },
    }, [
      { id: 1, nombre: "PEMEX TUXPAN" },
      { id: 2, nombre: "TOMZA TEPEJI" },
    ]),
  }, [{ costo_kg: 10 }]);
  assert.match(both.plain, /respecto al último día con compra/);
  assert.match(both.plain, /Compras: PEMEX TUXPAN — 10,000 kg; TOMZA TEPEJI — 5,000 kg/);
  const alone = comment.comprasComment({ costo_kg: 12.918, providers: [{ nombre: "TOMZA TEPEJI", kg: 1 }] }, []);
  assert.match(alone.plain, /Costo de compra 12\.918/);
  assert.doesNotMatch(alone.plain, /Incrementó|Disminuyó|Sin cambio/);
  assert.equal(alone.mark, null);
});

test("la gráfica muestra el valor, el cero y no dibuja null", () => {
  const summary = {
    empresa: "Puebla",
    week: weekly.weekOf("2026-10-06"),
    days: [
      { fecha: "2026-10-04", estado: "real", metrics: { resultado_mxn: 55745.73, margen_kg: 1.25 } },
      { fecha: "2026-10-05", estado: "real", metrics: { resultado_mxn: null, margen_kg: null } },
      { fecha: "2026-10-06", estado: "proyectada", metrics: { resultado_mxn: -50465.74, margen_kg: -0.5 } },
    ],
  };
  const svg = excel.chartSvg(summary, "resultado_mxn");
  assert.match(svg, /RESULTADO \(Importe\)/);
  assert.match(svg, /\+\$55,746/);
  assert.match(svg, /-\$50,466/);
  assert.match(svg, /data-zero="1"/);
  assert.match(svg, /#15803d/);
  assert.match(svg, /#dc2626/);
  assert.match(svg, /stroke-dasharray="6 4"/);
  assert.equal((svg.match(/<circle /g) || []).length, 2);
  assert.doesNotMatch(svg, /\$0/);
  const margen = excel.chartSvg(summary, "margen_kg");
  assert.match(margen, /Margen Bruto/);
  assert.match(margen, /\+1\.25/);
  assert.match(margen, /-0\.50/);
  assert.match(excel.chartSvg(summary, "inventada"), /RESULTADO \(Importe\)/);
  assert.equal(excel.formatChartLabel(55745.73, "mxn"), "+$55,746");
  assert.equal(excel.formatChartLabel(-50465.74, "mxn"), "-$50,466");
  assert.equal(excel.formatChartLabel(0, "mxn"), "$0");
});

test("el comentario de compras reutiliza el consolidado y no toca la fórmula financiera", () => {
  assert.match(SERVER, /igfDiarioComprasComment\.applyPayload/);
  assert.match(fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8"), /function listValidConsolidatedDays/);
  assert.match(fs.readFileSync(path.join(ROOT, "lib", "igf-diario-weekly-excel.js"), "utf8"), /data-zero/);
  const source = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-compras-comment.js"), "utf8");
  assert.doesNotMatch(source, /tarifa/);
  assert.match(source, /consolidado\.costo_kg|cons\.costo_kg/);
});
