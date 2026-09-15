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
  PLANT_SHEETS,
  PLANT_CLIENT_HEADERS,
  SUBCATS,
  MOVEMENT,
  MISSING_COMMENT,
  buildAnnualAnalysis,
  appendAnnualCategorySheets,
} = require("../lib/arr-annual-category-analysis");

const ARTIFACT_DIR = path.join(__dirname, "artifacts");
const ARTIFACT = path.join(ARTIFACT_DIR, "arr-annual-plant-sheets-sample.xlsx");

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

function findRow(ws, text) {
  const last = Math.max(ws.rowCount || 0, 80);
  for (let i = 1; i <= last; i += 1) {
    if (ws.getCell(i, 1).value === text) return i;
  }
  return null;
}

function headerValues(ws, row) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => ws.getCell(row, c).value);
}

function clientsUnder(ws, title) {
  const start = findRow(ws, title);
  assert.ok(start, `falta sección ${title}`);
  const names = [];
  for (let r = start + 2; r <= (ws.rowCount || start + 2) + 40; r += 1) {
    const a = ws.getCell(r, 1).value;
    if (a == null || a === "") break;
    if (typeof a === "string" && (a.startsWith("CLIENTES ") || a.includes("ANÁLISIS ANUAL"))) break;
    names.push(ws.getCell(r, 2).value);
  }
  return names;
}

function summaryValues(ws, title) {
  const start = findRow(ws, title);
  assert.ok(start, `falta resumen ${title}`);
  return {
    autotanque: ws.getCell(start + 2, 1).value,
    portatil: ws.getCell(start + 2, 2).value,
    carburacion: ws.getCell(start + 2, 3).value,
  };
}

function consolidatedRow(ws, planta) {
  const idx = PLANT_ROWS.indexOf(planta);
  assert.ok(idx >= 0, planta);
  const excelRow = 5 + idx;
  return {
    autotanque: ws.getCell(excelRow, 2).value,
    portatil: ws.getCell(excelRow, 3).value,
    carburacion: ws.getCell(excelRow, 4).value,
  };
}

function seedLegacySheets(wb) {
  const evalSheet = wb.addWorksheet("EVALUACION");
  evalSheet.getCell("F7").value = { formula: "(CASA!B7+CASA!B9+COMISIONISTA!B9)*1000" };
  const casa = wb.addWorksheet("CASA");
  casa.getCell("B7").value = 12.5;
  casa.getCell("A1").value = "Resumen por subcategoría · CASA";
  const comi = wb.addWorksheet("COMISIONISTA");
  comi.getCell("B7").value = 3.2;
  comi.getCell("A1").value = "Resumen por subcategoría · COMISIONISTA";
}

describe("IMPL-ARR-ANNUAL-PLANT-SHEETS-001", () => {
  const payload = fixture();
  let wb;
  let reload;

  it("genera workbook con seis hojas de planta y conservadas las consolidadas", async () => {
    wb = new ExcelJS.Workbook();
    seedLegacySheets(wb);
    appendAnnualCategorySheets(wb, payload);

    for (const spec of PLANT_SHEETS) {
      assert.ok(wb.getWorksheet(spec.sheet), spec.sheet);
    }
    assert.ok(wb.getWorksheet(SHEET_CASA));
    assert.ok(wb.getWorksheet(SHEET_COMISIONISTA));
    assert.ok(wb.getWorksheet("CASA"));
    assert.ok(wb.getWorksheet("COMISIONISTA"));
    assert.ok(wb.getWorksheet("EVALUACION"));

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await wb.xlsx.writeFile(ARTIFACT);
    reload = new ExcelJS.Workbook();
    await reload.xlsx.readFile(ARTIFACT);
    assert.ok(reload.getWorksheet("PUEBLA"));
    assert.ok(reload.getWorksheet("MORELOS"));
    assert.equal(reload.getWorksheet("CASA").getCell("B7").value, 12.5);
    assert.equal(
      reload.getWorksheet("EVALUACION").getCell("F7").value.formula,
      "(CASA!B7+CASA!B9+COMISIONISTA!B9)*1000"
    );
  });

  it("cada hoja tiene CASA y COMISIONISTA", () => {
    for (const spec of PLANT_SHEETS) {
      const ws = wb.getWorksheet(spec.sheet);
      assert.ok(findRow(ws, "CASA · ANÁLISIS ANUAL YTD"), spec.sheet);
      assert.ok(findRow(ws, "COMISIONISTA · ANÁLISIS ANUAL YTD"), spec.sheet);
      assert.ok(findRow(ws, "CLIENTES CASA CON IMPACTO NEGATIVO"), spec.sheet);
      assert.ok(findRow(ws, "CLIENTES CASA CON IMPACTO POSITIVO"), spec.sheet);
      assert.ok(findRow(ws, "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO"), spec.sheet);
      assert.ok(findRow(ws, "CLIENTES COMISIONISTA CON IMPACTO POSITIVO"), spec.sheet);
    }
  });

  it("no mezcla plantas y no escribe columna PLANTA", () => {
    const allClients = [
      ...payload.casa.negative,
      ...payload.casa.positive,
      ...payload.comisionista.negative,
      ...payload.comisionista.positive,
    ];
    for (const spec of PLANT_SHEETS) {
      const ws = wb.getWorksheet(spec.sheet);
      const casaNegHdr = findRow(ws, "CLIENTES CASA CON IMPACTO NEGATIVO") + 1;
      const headers = headerValues(ws, casaNegHdr).filter((v) => v != null);
      assert.deepEqual(headers, PLANT_CLIENT_HEADERS);
      assert.equal(headers.includes("PLANTA"), false);

      const names = [
        ...clientsUnder(ws, "CLIENTES CASA CON IMPACTO NEGATIVO"),
        ...clientsUnder(ws, "CLIENTES CASA CON IMPACTO POSITIVO"),
        ...clientsUnder(ws, "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO"),
        ...clientsUnder(ws, "CLIENTES COMISIONISTA CON IMPACTO POSITIVO"),
      ];
      const expected = allClients.filter((c) => c.planta === spec.planta).map((c) => c.cliente);
      assert.deepEqual([...names].sort(), [...expected].sort(), spec.sheet);
      for (const c of allClients) {
        if (c.planta !== spec.planta) {
          assert.equal(names.includes(c.cliente), false, `${c.cliente} no debe estar en ${spec.sheet}`);
        }
      }
    }
  });

  it("equivalencia de totales contra CASA ANUAL y COMISIONISTA ANUAL", () => {
    const casaAnual = wb.getWorksheet(SHEET_CASA);
    const comiAnual = wb.getWorksheet(SHEET_COMISIONISTA);
    for (const spec of PLANT_SHEETS) {
      const ws = wb.getWorksheet(spec.sheet);
      const casa = summaryValues(ws, "CASA · ANÁLISIS ANUAL YTD");
      const comi = summaryValues(ws, "COMISIONISTA · ANÁLISIS ANUAL YTD");
      assert.deepEqual(casa, consolidatedRow(casaAnual, spec.planta), `CASA ${spec.sheet}`);
      assert.deepEqual(comi, consolidatedRow(comiAnual, spec.planta), `COMISIONISTA ${spec.sheet}`);
    }
  });

  it("cliente negativo y positivo quedan en planta/categoría/subcategoría correctas", () => {
    const puebla = wb.getWorksheet("PUEBLA");
    const tehuacan = wb.getWorksheet("TEHUACAN");
    const acapulco = wb.getWorksheet("ACAPULCO");
    const morelos = wb.getWorksheet("MORELOS");

    const bajaRow = findRow(puebla, "CLIENTES CASA CON IMPACTO NEGATIVO") + 2;
    assert.equal(puebla.getCell(bajaRow, 1).value, SUBCATS.AUTOTANQUE);
    assert.equal(puebla.getCell(bajaRow, 2).value, "CLIENTE BAJA");
    assert.equal(puebla.getCell(bajaRow, 6).value, MOVEMENT.DISMINUYERON);

    const dejoNames = clientsUnder(puebla, "CLIENTES CASA CON IMPACTO NEGATIVO");
    assert.ok(dejoNames.includes("CLIENTE DEJO"));
    assert.ok(clientsUnder(puebla, "CLIENTES CASA CON IMPACTO POSITIVO").includes("CLIENTE NUEVO"));
    assert.equal(clientsUnder(puebla, "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO").length, 0);

    assert.ok(clientsUnder(tehuacan, "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO").includes("CLIENTE COMI BAJA"));
    assert.equal(clientsUnder(tehuacan, "CLIENTES CASA CON IMPACTO NEGATIVO").length, 0);
    assert.ok(clientsUnder(acapulco, "CLIENTES CASA CON IMPACTO POSITIVO").includes("CLIENTE ALZA"));
    assert.ok(clientsUnder(morelos, "CLIENTES CASA CON IMPACTO NEGATIVO").includes("OTRA PLANTA"));
    assert.equal(clientsUnder(puebla, "CLIENTES CASA CON IMPACTO NEGATIVO").includes("OTRA PLANTA"), false);
  });

  it("comentarios correctos y sin comentario no inventa causa", () => {
    const puebla = wb.getWorksheet("PUEBLA");
    const negStart = findRow(puebla, "CLIENTES CASA CON IMPACTO NEGATIVO") + 2;
    assert.equal(puebla.getCell(negStart, 2).value, "CLIENTE BAJA");
    assert.equal(puebla.getCell(negStart, 8).value, "Competencia en zona norte");

    const dejoRow = negStart + 1;
    assert.equal(puebla.getCell(dejoRow, 2).value, "CLIENTE DEJO");
    assert.equal(puebla.getCell(dejoRow, 8).value, MISSING_COMMENT);
    assert.notEqual(puebla.getCell(dejoRow, 8).value, "No debe pegar a CLIENTE BAJA");

    const posStart = findRow(puebla, "CLIENTES CASA CON IMPACTO POSITIVO") + 2;
    assert.equal(puebla.getCell(posStart, 2).value, "CLIENTE NUEVO");
    assert.equal(puebla.getCell(posStart, 8).value, MISSING_COMMENT);
    assert.equal(/porque|causa/i.test(String(puebla.getCell(posStart, 8).value)), false);
  });

  it("CASA ANUAL, COMISIONISTA ANUAL, CASA, COMISIONISTA y EVALUACION intactas", () => {
    const anual = wb.getWorksheet(SHEET_CASA);
    assert.equal(anual.getCell("A4").value, "PLANTA");
    assert.equal(anual.getCell("B4").value, "AUTOTANQUE Δ TON");
    assert.deepEqual(
      [5, 6, 7, 8, 9, 10].map((r) => anual.getCell(`A${r}`).value),
      PLANT_ROWS
    );
    assert.equal(anual.getCell("A11").value, "TOTAL");
    assert.equal(anual.getCell("E5").value.formula, "B5+C5+D5");
    assert.equal(anual.getCell("A13").value, "CLIENTES CON IMPACTO NEGATIVO");

    const comiAnual = wb.getWorksheet(SHEET_COMISIONISTA);
    assert.equal(comiAnual.getCell("A4").value, "PLANTA");
    assert.equal(comiAnual.getCell("A1").value, "COMISIONISTA · análisis anual YTD");

    assert.equal(wb.getWorksheet("CASA").getCell("B7").value, 12.5);
    assert.equal(wb.getWorksheet("CASA").getCell("A1").value, "Resumen por subcategoría · CASA");
    assert.equal(wb.getWorksheet("COMISIONISTA").getCell("B7").value, 3.2);
    assert.equal(
      wb.getWorksheet("EVALUACION").getCell("F7").value.formula,
      "(CASA!B7+CASA!B9+COMISIONISTA!B9)*1000"
    );
  });
});
