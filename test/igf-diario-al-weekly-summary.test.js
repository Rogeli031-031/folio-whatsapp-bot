"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { weeklyFixture } = require("./helpers/igf-al-weekly-fixture");

for (const month of [9, 11]) {
  for (const plant of ["Puebla", "Tehuacán", "Acapulco", "Querétaro", "San Luis", "Morelos"]) {
    test(`AL semanal: fechas, proveedores, colores y conservación en ${plant}, formato ${month}`, async () => {
      const { wb, ws, compras } = await weeklyFixture(plant, month);
      const weeks = [];
      ws.eachRow(row => { if (/^SEMANA\s+\d+/i.test(String(row.getCell(1).value))) weeks.push(row.number); });
      assert.ok(weeks.length >= 4);
      for (const r of weeks) {
        const summary = ws.getCell(r, 38).value.formula;
        assert.match(summary, new RegExp(`TEXT\\(AP${r}/B${r},"0.00%"\\)`));
        assert.match(summary, new RegExp(`TEXT\\(AQ${r}/AO${r},"0.00%"\\)`));
        assert.match(summary, new RegExp(`TEXT\\(AR${r}/AO${r},"0.00%"\\)`));
        assert.doesNotMatch(summary, /#REF!|undefined|AVERAGE|inventario/i);
        const references = col => [...ws.getCell(r, col).value.formula.matchAll(/'Compras prueba'!([A-Z]+)(\d+)/g)];
        for (const col of [41, 42, 43, 44]) {
          assert.equal(ws.getColumn(col).hidden, true);
          for (const [, letter, number] of references(col)) {
            assert.doesNotMatch(String(compras.getCell(Number(number), 1).value), /SEMANA|TOTAL/i);
            const header = String(compras.getCell(`${letter}4`).value);
            if (col === 43) assert.match(header, /^(PEMEX|TOMZA) TUXPAN$/);
            if (col === 44) assert.equal(header, "TOMZA TEPEJI");
            if (col === 41) assert.equal(header, "CONSOLIDADO");
          }
        }
        const addr = `AL${r + 1}`;
        assert.match(ws.getCell(addr).value.formula, new RegExp(`AO${r}-B${r}`));
        const rules = ws.conditionalFormattings.find(item => item.ref === addr).rules;
        assert.equal(rules[0].formulae[0], `AND(ISNUMBER(${addr}),${addr}<0)`);
        assert.equal(rules[0].style.font.color.argb, "FFFF0000");
        assert.equal(rules[1].formulae[0], `AND(ISNUMBER(${addr}),${addr}>0)`);
        assert.equal(rules[1].style.font.color.argb, "FF008000");
        assert.equal(ws.getCell(addr).font.color.argb, "FF000000");
      }
      assert.doesNotMatch(ws.getCell(weeks[0], 38).value.formula, /Incluye proyección/);
      assert.match(ws.getCell(weeks.at(-1), 38).value.formula, /Incluye proyección/);
      // First and last weeks are clipped to the month, not forced to seven days.
      const last = ws.getCell(weeks.at(-1), 42).value.formula;
      const lastDays = month === 11 ? 2 : 4;
      assert.equal([...last.matchAll(/'Compras prueba'!/g)].length, lastDays * 2);
      assert.match(ws.getCell("AL6").value.formula, /HG \/ venta total/);
      const restored = new ExcelJS.Workbook();
      await restored.xlsx.load(await wb.xlsx.writeBuffer());
      const exported = restored.getWorksheet(ws.name);
      assert.equal(exported.getCell(weeks[0], 38).value.formula, ws.getCell(weeks[0], 38).value.formula);
      assert.equal(exported.getCell(weeks[0] + 1, 38).numFmt, ws.getCell(weeks[0] + 1, 38).numFmt);
      assert.ok(exported.conditionalFormattings.some(item => item.ref === `AL${weeks[0] + 1}`));
    });
  }
}
