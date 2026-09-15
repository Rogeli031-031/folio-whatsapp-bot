"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const {
  SHEET_CASA,
  SHEET_COMISIONISTA,
  PLANT_ROWS,
  SUBCATS,
  MOVEMENT,
  MISSING_COMMENT,
  ytdRange,
  compareRanges,
  classifyMovement,
  contributionRatio,
  buildAnnualAnalysis,
  appendAnnualCategorySheets,
  emptyAnnualPayload,
} = require("../lib/arr-annual-category-analysis");

const ROOT = path.join(__dirname, "..");
const ARTIFACT_DIR = path.join(__dirname, "artifacts");
const ARTIFACT = path.join(ARTIFACT_DIR, "arr-annual-category-analysis-sample.xlsx");

function sale(plant, cliente, canal, subcanal, kg) {
  return { plant_code: plant, cliente_norm: cliente, canal, subcanal, kg };
}

function fixture() {
  return buildAnnualAnalysis({
    year: 2026,
    month: 9,
    prevRows: [
      sale("Puebla", "CLIENTE BAJA", "Casa", "Autotanque", 5000),
      sale("Puebla", "CLIENTE DEJO", "Casa", "Portátil", 2000),
      sale("Acapulco", "CLIENTE ALZA", "Casa", "Carburación", 1000),
      sale("Tehuacan", "CLIENTE COMI BAJA", "Comisionista", "Autotanque", 3000),
      sale("Morelos", "OTRA PLANTA", "Casa", "Autotanque", 800),
    ],
    currRows: [
      sale("Puebla", "CLIENTE BAJA", "Casa", "Autotanque", 2000),
      sale("Puebla", "CLIENTE NUEVO", "Casa", "Autotanque", 1500),
      sale("Acapulco", "CLIENTE ALZA", "Casa", "Carburación", 4000),
      sale("Tehuacan", "CLIENTE COMI BAJA", "Comisionista", "Autotanque", 1000),
      sale("Morelos", "OTRA PLANTA", "Casa", "Autotanque", 500),
    ],
    commentRows: [
      {
        planta_nombre: "Puebla",
        cliente_nombre: "CLIENTE BAJA",
        body: "Competencia en zona norte",
        created_at: "2026-08-01T00:00:00Z",
      },
      {
        planta_nombre: "Puebla",
        cliente_nombre: "CLIENTE OTRO",
        body: "No debe pegar a CLIENTE BAJA",
        created_at: "2026-08-02T00:00:00Z",
      },
    ],
  });
}

describe("IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001 periodo", () => {
  it("9. YTD actual es enero → mes seleccionado", () => {
    const r = ytdRange(2026, 9);
    assert.equal(r.start, "2026-01-01");
    assert.equal(r.end, "2026-09-30");
    assert.deepEqual(r.months, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(r.months.includes(10), false);
  });

  it("10. comparación usa el mismo rango del año anterior", () => {
    const c = compareRanges(2026, 9);
    assert.equal(c.previous.start, "2025-01-01");
    assert.equal(c.previous.end, "2025-09-30");
    assert.deepEqual(c.previous.months, c.current.months);
  });
});

describe("IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001 matriz", () => {
  const payload = fixture();

  it("3. aparecen las seis plantas + TOTAL", () => {
    assert.deepEqual(
      payload.casa.matrix.map((r) => r.planta),
      PLANT_ROWS
    );
    assert.equal(payload.casa.total.planta, "TOTAL");
  });

  it("4-7. B Autotanque, C Portátil, D Carburación, E = B+C+D", () => {
    const puebla = payload.casa.matrix.find((r) => r.planta === "Puebla");
    assert.equal(puebla.autotanque, -1.5);
    assert.equal(puebla.portatil, -2);
    assert.equal(puebla.carburacion, 0);
    assert.equal(puebla.total, puebla.autotanque + puebla.portatil + puebla.carburacion);
  });

  it("8. TOTAL es consistente", () => {
    const sumB = payload.casa.matrix.reduce((s, r) => s + r.autotanque, 0);
    const sumC = payload.casa.matrix.reduce((s, r) => s + r.portatil, 0);
    const sumD = payload.casa.matrix.reduce((s, r) => s + r.carburacion, 0);
    assert.ok(Math.abs(payload.casa.total.autotanque - sumB) < 1e-9);
    assert.ok(Math.abs(payload.casa.total.portatil - sumC) < 1e-9);
    assert.ok(Math.abs(payload.casa.total.carburacion - sumD) < 1e-9);
    assert.ok(
      Math.abs(
        payload.casa.total.total -
          (payload.casa.total.autotanque + payload.casa.total.portatil + payload.casa.total.carburacion)
      ) < 1e-9
    );
  });
});

describe("IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001 clientes", () => {
  const payload = fixture();

  it("11-12. disminuyó y dejó de comprar van a NEGATIVO", () => {
    const names = payload.casa.negative.map((c) => c.cliente);
    assert.ok(names.includes("CLIENTE BAJA"));
    assert.ok(names.includes("CLIENTE DEJO"));
    assert.equal(payload.casa.negative.find((c) => c.cliente === "CLIENTE BAJA").movimiento, MOVEMENT.DISMINUYERON);
    assert.equal(payload.casa.negative.find((c) => c.cliente === "CLIENTE DEJO").movimiento, MOVEMENT.DEJARON);
  });

  it("13-14. aumentó y nuevo van a POSITIVO", () => {
    const names = payload.casa.positive.map((c) => c.cliente);
    assert.ok(names.includes("CLIENTE ALZA"));
    assert.ok(names.includes("CLIENTE NUEVO"));
    assert.equal(payload.casa.positive.find((c) => c.cliente === "CLIENTE ALZA").movimiento, MOVEMENT.AUMENTARON);
    assert.equal(payload.casa.positive.find((c) => c.cliente === "CLIENTE NUEVO").movimiento, MOVEMENT.NUEVOS);
  });

  it("15-17. hoja, planta y subcategoría correctas", () => {
    const comi = payload.comisionista.negative.find((c) => c.cliente === "CLIENTE COMI BAJA");
    assert.ok(comi);
    assert.equal(comi.planta, "Tehuacán");
    assert.equal(comi.subcategoria, SUBCATS.AUTOTANQUE);
    assert.equal(payload.casa.negative.some((c) => c.cliente === "CLIENTE COMI BAJA"), false);
    const dejo = payload.casa.negative.find((c) => c.cliente === "CLIENTE DEJO");
    assert.equal(dejo.planta, "Puebla");
    assert.equal(dejo.subcategoria, SUBCATS.PORTATIL);
  });

  it("18. delta correcto", () => {
    const baja = payload.casa.negative.find((c) => c.cliente === "CLIENTE BAJA");
    assert.equal(baja.ytd_prev_ton, 5);
    assert.equal(baja.ytd_curr_ton, 2);
    assert.equal(baja.delta_ton, -3);
  });

  it("19. comentario pertenece al cliente correcto", () => {
    const baja = payload.casa.negative.find((c) => c.cliente === "CLIENTE BAJA");
    assert.equal(baja.comment, "Competencia en zona norte");
    const dejo = payload.casa.negative.find((c) => c.cliente === "CLIENTE DEJO");
    assert.equal(dejo.comment, MISSING_COMMENT);
    assert.notEqual(dejo.comment, "No debe pegar a CLIENTE BAJA");
  });

  it("20. sin comentario no inventa causa", () => {
    const nuevo = payload.casa.positive.find((c) => c.cliente === "CLIENTE NUEVO");
    assert.equal(nuevo.comment, MISSING_COMMENT);
    assert.equal(/porque|causa/i.test(nuevo.comment), false);
  });

  it("contribución usa denominador de planta/subcategoría o queda nula", () => {
    const baja = payload.casa.negative.find((c) => c.cliente === "CLIENTE BAJA");
    assert.ok(baja.contribucion != null);
    assert.ok(Math.abs(baja.contribucion - -3 / -1.5) < 1e-9);
    assert.equal(contributionRatio(-1, 0), null);
    assert.equal(classifyMovement(0, 0), null);
  });
});

describe("IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001 workbook", () => {
  it("1-2/21-24. hojas nuevas, CASA/COMISIONISTA/EVALUACION intactas, workbook válido", async () => {
    const wb = new ExcelJS.Workbook();
    const evalSheet = wb.addWorksheet("EVALUACION");
    evalSheet.getCell("F7").value = { formula: "(CASA!B7+CASA!B9+COMISIONISTA!B9)*1000" };
    const casa = wb.addWorksheet("CASA");
    casa.getCell("B7").value = 12.5;
    casa.getCell("A1").value = "Resumen por subcategoría · CASA";
    const comi = wb.addWorksheet("COMISIONISTA");
    comi.getCell("B7").value = 3.2;
    comi.getCell("A1").value = "Resumen por subcategoría · COMISIONISTA";

    const payload = fixture();
    appendAnnualCategorySheets(wb, payload);

    assert.ok(wb.getWorksheet(SHEET_CASA));
    assert.ok(wb.getWorksheet(SHEET_COMISIONISTA));
    assert.equal(wb.getWorksheet("CASA").getCell("B7").value, 12.5);
    assert.equal(wb.getWorksheet("CASA").getCell("A1").value, "Resumen por subcategoría · CASA");
    assert.equal(wb.getWorksheet("COMISIONISTA").getCell("B7").value, 3.2);
    assert.equal(
      wb.getWorksheet("EVALUACION").getCell("F7").value.formula,
      "(CASA!B7+CASA!B9+COMISIONISTA!B9)*1000"
    );

    const anual = wb.getWorksheet(SHEET_CASA);
    assert.equal(anual.getCell("A4").value, "PLANTA");
    assert.equal(anual.getCell("B4").value, "AUTOTANQUE Δ TON");
    assert.equal(anual.getCell("C4").value, "PORTÁTIL Δ TON");
    assert.equal(anual.getCell("D4").value, "CARBURACIÓN Δ TON");
    assert.equal(anual.getCell("E4").value, "TOTAL Δ TON");
    assert.deepEqual(
      [5, 6, 7, 8, 9, 10].map((r) => anual.getCell(`A${r}`).value),
      PLANT_ROWS
    );
    assert.equal(anual.getCell("A11").value, "TOTAL");
    assert.equal(anual.getCell("E5").value.formula, "B5+C5+D5");
    assert.equal(anual.getCell("E11").value.formula, "B11+C11+D11");

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await wb.xlsx.writeFile(ARTIFACT);
    const reload = new ExcelJS.Workbook();
    await reload.xlsx.readFile(ARTIFACT);
    assert.ok(reload.getWorksheet(SHEET_CASA));
    assert.ok(reload.getWorksheet(SHEET_COMISIONISTA));
    assert.ok(reload.getWorksheet("CASA"));
    assert.ok(reload.getWorksheet("COMISIONISTA"));
    assert.ok(reload.getWorksheet("EVALUACION"));
    assert.equal(reload.getWorksheet("CASA").getCell("B7").value, 12.5);
  });

  it("empty payload no inventa clientes", () => {
    const empty = emptyAnnualPayload(2026, 9);
    assert.equal(empty.casa.negative.length, 0);
    assert.equal(empty.casa.positive.length, 0);
    assert.match(empty.period_label, /enero–septiembre 2026 vs enero–septiembre 2025/);
  });
});

describe("IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001 frontera", () => {
  it("EVALUACION sigue apuntando a CASA no a CASA ANUAL", () => {
    const src = fs.readFileSync(path.join(ROOT, "frontend-dashboard/lib/arr-export-evaluacion-formulas.ts"), "utf8");
    assert.match(src, /CASA_SHEET = "CASA"/);
    assert.match(src, /COMI_SHEET = "COMISIONISTA"/);
    assert.equal(src.includes("CASA ANUAL"), false);
  });

  it("exportador añade las hojas nuevas sin sustituir las actuales", () => {
    const excel = fs.readFileSync(path.join(ROOT, "frontend-dashboard/lib/arr-export-excel.ts"), "utf8");
    assert.match(excel, /appendCategoriaMovimientoSheets/);
    assert.match(excel, /appendAnnualCategorySheets/);
    assert.match(excel, /annualCategory/);
    const chat = fs.readFileSync(path.join(ROOT, "lib/director-ia-chat.js"), "utf8");
    assert.equal(chat.includes("CASA ANUAL"), false);
  });
});
