"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const compras = require("../lib/compras-dashboard");
const excel = require("../lib/compras-excel");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ComprasClient.tsx"), "utf8");
const DASH = fs.readFileSync(path.join(ROOT, "lib", "compras-dashboard.js"), "utf8");

const PEMEX = { id: 1, nombre: "PEMEX TUXPAN" };
const NOTA = { id: 9, nombre: "Nota de Cargo" };

function day(ymd, cells, extra = {}) {
  return {
    ymd,
    captured: true,
    cells,
    consolidado: extra.consolidado || { kg: 0, importe: 0, costo_kg: null },
    hg_kilos: extra.hg_kilos == null ? 4 : extra.hg_kilos,
    flete: extra.flete || {
      providers: { 1: { kg: 10, tarifa: 1, importe: 10 } },
      consolidado: { kg: 10, tarifa: 1, importe: 10, incomplete: false },
    },
  };
}

function payload(providers, days) {
  const ymds = days.map((item) => item.ymd);
  return {
    year: 2026,
    month: 10,
    providers,
    tarifas_flete: [{ proveedor_id: 1, tarifa: 1 }],
    grid: {
      rows: days.map((item) => ({ type: "day", ymd: item.ymd })).concat([{ type: "week", week: 41, ymds }]),
      days,
      weeks: [{ week: 41, ymds, flete: { consolidado: { tarifa: 1 } } }],
      month: { flete: { consolidado: { tarifa: 1 } } },
    },
  };
}

function formulaOf(cell) {
  const value = cell && cell.value;
  return value && value.formula ? String(value.formula) : "";
}

function headerCol(ws, row, text) {
  for (let c = 1; c <= 80; c += 1) {
    if (ws.getCell(row, c).value === text) return c;
  }
  return 0;
}

function colspan(providerCount, fleteExpanded) {
  const n = Number.isFinite(providerCount) && providerCount > 0 ? Math.floor(providerCount) : 0;
  const fecha = 1;
  const comprasCols = n * 3 + n;
  const notaCargo = 1;
  const consolidado = 3;
  const sepHg = 1;
  const hg = 3;
  const participacion = 2;
  const sepFlete = 1;
  const flete = fleteExpanded ? n * 3 + n + 3 : 0;
  return fecha + comprasCols + notaCargo + consolidado + sepHg + hg + participacion + sepFlete + flete;
}

describe("FIX-COMPRAS-NOTA-CARGO-VISIBLE-088-R3", () => {
  it("A) sin proveedor la columna fija sigue definida", async () => {
    const wb = await excel.buildComprasWorkbook(payload([PEMEX], [day("2026-10-01", { 1: { kg: 10, importe: 100 } })]), { plantName: "Puebla", corteYmd: "2026-11-01" });
    const ws = wb.getWorksheet("CONTROL DE COMPRAS");
    const notaCol = headerCol(ws, 4, "NOTA DE CARGO");
    const consCol = headerCol(ws, 4, "CONSOLIDADO");
    assert.ok(notaCol > 0);
    assert.equal(consCol, notaCol + 1);
    assert.equal(ws.getCell(5, notaCol).value, "IMPORTE");
    assert.match(CLIENT, /NOTA DE CARGO/);
    assert.match(CLIENT, /const notaCargo = 1;/);
  });

  it("B) con proveedor no aparece como triple físico", () => {
    const split = compras.splitComprasProviders([PEMEX, NOTA, { id: 2, nombre: "TOMZA TUXPAN" }]);
    assert.deepEqual(split.physicalProviders.map((p) => p.nombre), ["PEMEX TUXPAN", "TOMZA TUXPAN"]);
    assert.equal(split.notaCargoProvider.id, 9);
    assert.equal(compras.isNotaCargoProvider({ nombre: "  nota   de   cáRGO " }), true);
    assert.doesNotMatch(DASH, /DEFAULT_PROVIDER_NAMES = Object\.freeze\(\[[^\]]*NOTA DE CARGO/);
    const notaFn = CLIENT.slice(CLIENT.indexOf("function NotaCargoCell"), CLIENT.indexOf("function ReadOnlyTriple"));
    assert.doesNotMatch(notaFn, /onClick|TarifaCell|COMPRA KG|COSTO KG/);
    assert.match(CLIENT, /manageableProviders/);
  });

  it("C) PEMEX 10 kg / $100 + nota $15 consolida kg 10 e importe 115", () => {
    const grid = compras.aggregatePurchases([
      { id: 1, proveedor_id: 1, fecha: "2026-10-01", kg: 10, importe: 100 },
      { id: 2, proveedor_id: 9, fecha: "2026-10-01", kg: 0, importe: 15 },
    ], [PEMEX, NOTA], 2026, 10);
    const found = grid.days.find((item) => item.ymd === "2026-10-01");
    assert.equal(found.cells[9].importe, 15);
    assert.equal(found.cells[9].kg, 0);
    assert.equal(found.consolidado.kg, 10);
    assert.equal(found.consolidado.importe, 115);
    assert.equal(found.consolidado.costo_kg, 11.5);
  });

  it("D) dos notas del mismo día se suman y siguen siendo dos compras", () => {
    const purchases = [
      { id: 1, proveedor_id: 9, fecha: "2026-10-02", kg: 0, importe: 10 },
      { id: 2, proveedor_id: 9, fecha: "2026-10-02", kg: 0, importe: 5 },
    ];
    const grid = compras.aggregatePurchases(purchases, [NOTA], 2026, 10);
    const found = grid.days.find((item) => item.ymd === "2026-10-02");
    assert.equal(found.cells[9].importe, 15);
    assert.equal(found.cells[9].count, 2);
    assert.equal(purchases.length, 2);
  });

  it("E/F) semana y mes suman solo importes de notas", () => {
    const grid = compras.aggregatePurchases([
      { id: 1, proveedor_id: 1, fecha: "2026-10-05", kg: 10, importe: 100 },
      { id: 2, proveedor_id: 9, fecha: "2026-10-05", kg: 0, importe: 15 },
      { id: 3, proveedor_id: 9, fecha: "2026-10-06", kg: 0, importe: 5 },
    ], [PEMEX, NOTA], 2026, 10);
    const week = grid.weeks.find((item) => item.ymds.includes("2026-10-05") && item.ymds.includes("2026-10-06"));
    assert.ok(week);
    assert.equal(week.providers[9].importe, 20);
    assert.equal(week.providers[9].kg, 0);
    assert.equal(week.consolidado.kg, 10);
    assert.equal(grid.month.providers[9].importe, 20);
    assert.equal(grid.month.providers[9].kg, 0);
    assert.equal(grid.month.consolidado.kg, 10);
    assert.equal(grid.month.consolidado.importe, 120);
  });

  it("G/H/O) nota fuera de flete y proyección; HG kilos no cambia", () => {
    const real = day("2026-10-01", {
      1: { kg: 10, importe: 100 },
      9: { kg: 0, importe: 15 },
    }, { hg_kilos: 4 });
    const future = day("2026-10-03", { 1: { kg: 0, importe: 0 } }, { hg_kilos: null });
    const withNote = payload([PEMEX, NOTA], [real, future]);
    const without = payload([PEMEX], [day("2026-10-01", { 1: { kg: 10, importe: 100 } }, { hg_kilos: 4 })]);
    const noted = excel.resolveControlComprasDays(withNote, "2026-10-02");
    const plain = excel.resolveControlComprasDays(without, "2026-10-02");
    assert.equal(noted[0].hgKilos, plain[0].hgKilos);
    assert.equal(noted[0].hgKilos, 4);
    assert.equal(noted[0].fleteKg, plain[0].fleteKg);
    assert.equal(noted[0].costoKg, 11.5);
    assert.equal(plain[0].costoKg, 10);
    const ctx = excel.buildComprasDailyEstimateContext(withNote, "2026-10-02");
    const slot = ctx.byYmd.get("2026-10-03").providers[9];
    assert.equal(slot.kg, null);
    assert.equal(slot.importe, null);
    assert.equal(slot.kg_estimated, false);
    assert.equal(slot.importe_estimated, false);
  });

  it("I–M) Excel deja una columna IMPORTE antes de CONSOLIDADO", async () => {
    const body = payload([PEMEX, NOTA], [
      day("2026-10-01", { 1: { kg: 10, importe: 100 }, 9: { kg: 0, importe: 15 } }),
      day("2026-10-02", { 1: { kg: 0, importe: 0 } }),
    ]);
    const wb = await excel.buildComprasWorkbook(body, { plantName: "Puebla", corteYmd: "2026-11-01" });
    const ws = wb.getWorksheet("CONTROL DE COMPRAS");
    const notaCol = headerCol(ws, 4, "NOTA DE CARGO");
    const consCol = headerCol(ws, 4, "CONSOLIDADO");
    assert.equal(consCol, notaCol + 1);
    assert.equal(ws.getCell(5, notaCol).value, "IMPORTE");
    assert.notEqual(ws.getCell(5, notaCol - 1).value, "COMPRA KG");
    assert.equal(ws.getCell(6, notaCol).value, 15);
    assert.equal(ws.getCell(7, notaCol).value, null);
    const kgFormula = formulaOf(ws.getCell(6, consCol));
    const impFormula = formulaOf(ws.getCell(6, consCol + 2));
    const noteRef = `${excelLetter(notaCol)}6`;
    assert.match(kgFormula, /SUM\(B6\)/);
    assert.doesNotMatch(kgFormula, new RegExp(noteRef));
    assert.match(impFormula, new RegExp(`SUM\\(D6,${noteRef}\\)`));
    let fleteFormula = "";
    for (let c = consCol + 4; c <= 80; c += 1) {
      if (ws.getCell(4, c).value === "CONSOLIDADO" && ws.getCell(5, c + 1).value === "TARIFA") {
        fleteFormula = formulaOf(ws.getCell(6, c)) + formulaOf(ws.getCell(6, c + 2));
      }
    }
    assert.ok(fleteFormula);
    assert.doesNotMatch(fleteFormula, new RegExp(noteRef));
    const projected = await excel.buildComprasWorkbook(body, { plantName: "Puebla", corteYmd: "2026-10-02" });
    const future = projected.getWorksheet("CONTROL DE COMPRAS").getCell(7, notaCol);
    assert.equal(future.value, null);
    const fill = future.fill && future.fill.fgColor && future.fill.fgColor.argb;
    assert.notEqual(fill, excel.ESTIMATED_BLUE);
  });

  it("N) colspan cuenta la nota con flete cerrado y abierto", () => {
    assert.match(CLIENT, /const notaCargo = 1;/);
    assert.match(CLIENT, /const flete = fleteExpanded \? n \* 3 \+ n \+ 3 : 0;/);
    assert.equal(colspan(0, false), 12);
    assert.equal(colspan(3, false), 24);
    assert.equal(colspan(0, true), 15);
    assert.equal(colspan(3, true), 39);
    assert.match(CLIENT, /const participacion = 2;/);
    assert.match(CLIENT, /return fecha \+ compras \+ notaCargo \+ consolidado \+ sepHg \+ hg \+ participacion \+ sepFlete \+ flete;/);
  });

  it("P) el importador 088 conserva la nota con kg 0", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("OCTUBRE");
    ws.getCell("A1").value = "PUEBLA";
    ws.getCell("A6").value = "NOTA DE CARGO";
    ws.getCell("G6").value = new Date("2026-10-05T00:00:00.000Z");
    ws.getCell("J6").value = 15;
    ws.getCell("A7").value = "PEMEX TUXPAN";
    ws.getCell("E7").value = 10;
    ws.getCell("G7").value = new Date("2026-10-05T00:00:00.000Z");
    ws.getCell("J7").value = 100;
    const parsed = await compras.parseComprasExcelBuffer(Buffer.from(await wb.xlsx.writeBuffer()));
    const plan = compras.planComprasExcelImport(parsed, {
      desde: "2026-10-01",
      hasta: "2026-10-31",
      plantName: "Puebla",
      existing: [],
      documents: [],
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.notas, 1);
    assert.equal(plan.by_provider["NOTA DE CARGO"].kg, 0);
    assert.equal(plan.by_provider["NOTA DE CARGO"].importe, 15);
    assert.equal(plan.kg_excel, 10);
    assert.equal(plan.importe_excel, 115);
  });
});

function excelLetter(n) {
  let s = "";
  let x = Number(n);
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
