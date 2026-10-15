"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");
const engine = require("../lib/commercial-trend-engine");
const { workbookReader, extractDailyWorkbook, DAILY_COLUMNS } = require("../frontend-dashboard/lib/igf-pdf-workbook");
const { drawAnnexes, trend } = require("../frontend-dashboard/lib/igf-pdf-annexes");
const { installFace } = require("../frontend-dashboard/lib/igf-diario-weekly-analytical-pdf");
const { workbook, channel } = require("./helpers/igf-pdf-annex-fixture");
const { jsPDF } = require("../frontend-dashboard/node_modules/jspdf");
const scope = { year: 2026, month: 10 };

test("Top 15 preserves ARR absolute-delta ordering, default 6 and limit bounds", () => {
  const current = Array.from({ length: 25 }, (_, i) => ({ cliente: `Cliente ${i}`, venta_ton: i + 1 }));
  const previous = [{ cliente: "Perdido", venta_ton: 100 }];
  const input = { cliCurRows: current, cliPrevRows: previous };
  const def = engine.assembleCommercialTrend(input).clientes_top;
  const fifteen = engine.assembleCommercialTrend({ ...input, topLimit: 15 }).clientes_top;
  assert.equal(def.length, 6); assert.equal(fifteen.length, 15);
  assert.deepEqual(fifteen.slice(0, 6), def); assert.equal(fifteen[0].tipo, "perdido");
  assert.equal(engine.selectTopMovers(current, previous, 1000).length, 6);
});

test("Top 15 propagates through the real engine loader without changing its period", async () => {
  const q = async () => ({ rows: [] });
  const result = await engine.loadCommercialTrend({}, { empresa: "Puebla", range: "1m", canal: "casa", topLimit: 15,
    resolvePlantCodes: async () => ({ uniqueCodes: ["Puebla"], plantCode: "Puebla" }),
    queryBounds: async () => ({ rows: [{ min_f: "2026-01-01", max_f: "2026-10-14" }] }),
    querySalesSeries: q, queryDiscountSeries: q,
    queryClientTons: async (_, __, desde) => ({ rows: desde === "2026-09-15" ? Array.from({ length: 20 }, (_, i) => ({ cliente: `Cliente ${i}`, venta_ton: i + 1 })) : [] }),
  });
  assert.equal(result.clientes_top.length, 15); assert.equal(result.fecha_hasta, "2026-10-14");
});

test("Reads actual generated Excel formulas after XLSX roundtrip; exact columns and units", async () => {
  const source = workbook(), loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await source.xlsx.writeBuffer());
  const data = extractDailyWorkbook(loaded, scope);
  assert.equal(data.rows.length, 31);
  assert.deepEqual(DAILY_COLUMNS.map((c) => c.col), ["A", "B", "H", "AD", "Z", "M", "U", "AF", "AG", "AI", "AJ", "AK"]);
  const day = data.rows[0];
  assert.deepEqual(day.slice(0, 7), ["2026-10-01", 30000, 7, -3.5, -0.1, 1, 2]);
  assert.ok(Math.abs(day[7] - 0.6) < 1e-10);
  assert.ok(Math.abs(day[8] - 18000) < 1e-8);
  assert.match(day[9], /Comentario de muestra/); assert.match(day[10], /CLIENTE MUESTRA/);
});

test("Detailed expense components, carry cost and one missing sales channel keep Excel semantics", () => {
  const wb = workbook({ desglose: { corporativos_desglosados: true, operativos_desglosados: true, componentes: {
    gasto_corporativo: 810000, inversiones: 0, impuestos_federales: 0,
    presupuesto_nomina_gastos: 1620000, presupuesto_imss_sua: 0, extraordinarios: 0, provisiones_planta: 0,
  } } });
  wb.getWorksheet("Provincia Venta Diaria").getCell("C2").value = null;
  wb.getWorksheet("CONTROL DE COMPRAS").getCell("B7").value = 0;
  const data = extractDailyWorkbook(wb, scope);
  assert.equal(data.rows[0][1], 10000); assert.equal(data.rows[0][5], 3); assert.equal(data.rows[0][6], 6);
  assert.equal(data.rows[1][2], 7); // zero cost carries prior nonzero cost, just like the workbook.
});

test("Missing and zero remain distinct; unsupported formulas, cycles and old layouts fail closed", () => {
  const wb = workbook();
  const sales = wb.getWorksheet("Provincia Venta Diaria");
  sales.getCell("B2").value = null; sales.getCell("C2").value = null;
  sales.getCell("B3").value = 0; sales.getCell("C3").value = 0;
  const data = extractDailyWorkbook(wb, scope);
  assert.equal(data.rows[0][1], ""); assert.equal(data.rows[1][1], 0);
  const ws = wb.getWorksheet("IGF Diario Puebla");
  ws.getCell("H6").value = { formula: "WEBSERVICE(\"https://example.com\")" };
  assert.throws(() => extractDailyWorkbook(wb, scope), /no compatible/);
  ws.getCell("H6").value = { formula: "H6" };
  assert.throws(() => extractDailyWorkbook(wb, scope), /circular/);
  ws.getCell("AF5").value = "OTRO CAMPO";
  assert.throws(() => extractDailyWorkbook(wb, scope), /columnas aprobadas/);
});

test("Formula reader handles precedence, sheet references, lazy IF, ranges and rich text", () => {
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Origen con espacios");
  ws.getCell("A1").value = 2; ws.getCell("A2").value = 3;
  ws.getCell("B1").value = { formula: "IF(ISNUMBER(A1),(A1+A2)*1000/2-3,1/0)" };
  ws.getCell("B2").value = { formula: "SUM(A1:A2)" };
  ws.getCell("C1").value = { richText: [{ text: "Uno " }, { text: "dos" }] };
  const other = wb.addWorksheet("Destino");
  other.getCell("A1").value = { formula: "'Origen con espacios'!$B$1" };
  const read = workbookReader(wb);
  assert.equal(read("Destino", "A1"), 2497); assert.equal(read(ws.name, "B2"), 5);
  assert.equal(read(ws.name, "C1"), "Uno dos");
});

test("PDF keeps all 15 clients, full long comments and every day inside landscape page bounds", () => {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  for (const [file, style] of [["DejaVuSans.ttf", "normal"], ["DejaVuSans-Bold.ttf", "bold"]]) {
    installFace(pdf, fs.readFileSync(path.join(__dirname, "../frontend-dashboard/public/fonts", file)), file, "DejaVuSans", style);
  }
  const marks = [], original = pdf.text.bind(pdf);
  pdf.text = (text, x, y, options) => {
    const lines = Array.isArray(text) ? text : [text];
    marks.push(...lines.map((line, i) => ({ text: line, x, y: y + i * pdf.getLineHeight() })));
    return original(text, x, y, options);
  };
  const casa = channel("casa"), comisionista = channel("comisionista"), daily = extractDailyWorkbook(workbook(), scope);
  casa.clientes_top[0].comentarios = [{ body: "Texto largo verificable. ".repeat(180) + "FIN-COMENTARIO" }];
  daily.rows[0][9] = "Detalle diario extenso. ".repeat(200) + "FIN-DETALLE";
  drawAnnexes(pdf, { casa, comisionista, daily }, "Puebla - MUESTRA", "15/10/2026");
  const text = marks.map((m) => m.text).join("\n");
  assert.match(text, /FIN-COMENTARIO/); assert.match(text, /FIN-DETALLE/); assert.match(text, /31\/10\/2026/);
  assert.equal((text.match(/CLIENTE DE MUESTRA 15/g) || []).length, 2);
  for (const m of marks) { assert.ok(m.y >= 0 && m.y < 595.28, `${m.text} y=${m.y}`); assert.ok(m.x >= 0 && m.x < 841.89); }
  assert.deepEqual(trend([1, 3, 5]), { a: 1, b: 2 });
});
