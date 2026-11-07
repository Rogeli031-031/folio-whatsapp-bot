"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const igf = require("../lib/igf-diario-puebla");
const { appendComprasWorksheet, controlComprasLayout } = require("../lib/compras-excel");
const { aggregatePurchases } = require("../lib/compras-dashboard");

const plants = ["Puebla", "Tehuacán", "Acapulco", "Querétaro", "San Luis", "Morelos"];
const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
function dateRow(ws, fecha) {
  let found;
  ws.eachRow((row) => {
    const value = row.getCell(1).value;
    const ymd = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
    if (ymd === fecha) found = row.number;
  });
  return found;
}

async function fixture(wb, plant, index, month) {
  const mm = String(month).padStart(2, "0");
  const fecha = `2026-${mm}-06`;
  const supports = { venta: `Venta ${index}`, compras: `Compras ${index}`, precio: `Precio ${index}`, comisiones: `Comisiones ${index}` };
  const venta = wb.addWorksheet(supports.venta);
  // Extra unrelated columns ensure selection is by the requested plant.
  venta.addRow(["DÍA", "Otra CASA", "Otra COMISIONISTA", `${plant} CASA`, `${plant} COMISIONISTA`]);
  venta.addRow([6, 500, 400, 2.9256, 9.334]);
  const providers = Array.from({ length: index % 3 + 1 }, (_, i) => ({ id: i + 1, nombre: `Proveedor ${i + 1}` }));
  const grid = aggregatePurchases([
    { id: 1, fecha: `2026-${mm}-05`, proveedor_id: 1, kg: 1000, importe: 13000 },
    { id: 2, fecha, proveedor_id: 1, kg: 23670, importe: 313781.43 },
  ], providers, 2026, month);
  await appendComprasWorksheet(wb, { year: 2026, month, providers, grid }, { plantName: plant, corteYmd: `2026-${mm}-07`, sheetName: supports.compras });
  const source = wb.getWorksheet(supports.compras);
  const layout = controlComprasLayout(providers.length);
  const sr = dateRow(source, fecha);
  // Set raw HG separately from the monetary HG to catch sign/unit confusion.
  const hgCol = source.getRow(5).values.indexOf("HG EN KILOS");
  source.getCell(sr, hgCol).value = 388;
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026, month, sheetLabel: plant, humanName: plant, supports,
    plantEquivalent: (label) => fold(label) === fold(plant), corteYmd: `2026-${mm}-07`,
    dailyInsights: { [fecha]: { comentario: "Comentario conservado", ventas: "Ventas conservadas", descuentosCell: "Descuentos conservados", descuentosPlain: "Descuentos conservados" } },
  });
  return { ws, sr, source, hgCol, row: dateRow(ws, fecha), layout, supports };
}

for (const month of [9, 11]) {
  test(`AL usa compras y HG del día correcto en seis plantas y formato ${month}`, async () => {
    const wb = new ExcelJS.Workbook();
    for (let i = 0; i < plants.length; i++) {
      const { ws, row, sr, source, hgCol, supports } = await fixture(wb, plants[i], i, month);
      const formula = ws.getCell(row, 38).value.formula;
      // First consolidated purchase, never the later freight consolidation.
      const compraCol = source.getRow(5).values.findIndex((v, c) => v === "COMPRA KG" && String(source.getCell(4, c).value).includes("CONSOLIDADO"));
      const purchaseAddr = `'${supports.compras}'!${source.getCell(sr, compraCol).address}`;
      const hgAddr = `'${supports.compras}'!${source.getCell(sr, hgCol).address}`;
      assert.ok(formula.includes(purchaseAddr));
      assert.ok(formula.includes(`TEXT(${hgAddr}/B${row},"0.00%")`));
      assert.ok(formula.includes(`TEXT(${purchaseAddr}-B${row},`));
      assert.match(ws.getCell(row, 2).value.formula, /D2/);
      assert.match(ws.getCell(row, 2).value.formula, /E2/);
      assert.match(ws.getCell(row, 2).value.formula, /1000/);
      assert.doesNotMatch(formula, /PROYECTADO|inventario|generando/i);
      assert.equal(ws.getCell(5, 38).value, "COMPRAS, VENTA Y HG");
      assert.equal(ws.getColumn(38).hidden, false);
      assert.equal(ws.getColumn(39).hidden, true);
      if (month === 11) assert.equal(ws.getColumn(40).hidden, true);
      assert.equal(ws.getCell(row, month === 11 ? 35 : 34).value, "Comentario conservado");
      assert.equal(ws.getCell(row, 37).value, "Descuentos conservados");
      assert.ok(ws.getRow(row).height >= 105);
      const rules = ws.conditionalFormattings.flatMap((c) => c.rules.flatMap((r) => r.formulae));
      assert.ok(rules.some((f) => f.includes(`AM${row}=1`)));
      if (month === 11) assert.ok(rules.some((f) => f.includes(`AN${row}=1`)));
      assert.ok(rules.every((f) => !/AL\d+=1/.test(f)));
      const future = dateRow(ws, `2026-${String(month).padStart(2, "0")}-07`);
      assert.match(ws.getCell(future, 38).value.formula, /PROYECTADO/);
      assert.match(ws.getCell(future, 38).value.formula, /Compras previstas/);
      assert.match(ws.getCell(future, 38).value.formula, /HG proyectado/);
      assert.equal(ws.getCell(row, 38).alignment.wrapText, true);
    }
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(await wb.xlsx.writeBuffer());
    for (const plant of plants) {
      const ws = restored.getWorksheet(igf.sheetTitleFor(plant));
      const row = dateRow(ws, `2026-${String(month).padStart(2, "0")}-06`);
      assert.ok(ws.getCell(row, 38).value.formula.includes("HG / venta total"));
      assert.equal(ws.getColumn(38).hidden, false);
    }
  });
}

test("sin fuentes conserva faltantes y la división requiere venta positiva", () => {
  const wb = new ExcelJS.Workbook();
  const ws = igf.fillIgfDiarioPuebla(wb, { year: 2026, month: 11, corteYmd: "2026-11-07" });
  const f = ws.getCell("AL11").value.formula;
  assert.match(f, /sin dato/);
  assert.match(f, /IFERROR\(ISNUMBER\(""\),FALSE\)/);
  assert.match(f, /IF\(B11>0,/);
  assert.match(f, /sin base de venta positiva/);
  assert.doesNotMatch(f, /#REF!|undefined|null/);
  ws.eachRow((row) => {
    if (typeof row.getCell(1).value === "string" && /SEMANA|TOTAL MES/i.test(row.getCell(1).value)) assert.equal(row.getCell(38).value, null);
  });
});
