"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const forecast = require("../lib/dashboard-arr-forecast");

const ROOT = path.join(__dirname, "..");
const CLIENT = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const FMT3 = "#,##0.000";

function text(cell) {
  const v = cell && cell.value;
  if (v == null) return "";
  return String(v);
}

function findLabelRow(ws, label) {
  for (let r = 1; r <= 40; r++) {
    if (ws.getCell(r, 1).value === label) return r;
  }
  return null;
}

function scopedSheet() {
  const plants = ["Puebla", "Acapulco"];
  const ventaTonGrid = forecast.scopeProvinciaGrid(
    {
      plants,
      cutoffDay: 99,
      forecastByPlant: new Map([
        ["Puebla", 64.1234],
        ["Acapulco", 99],
      ]),
      byDate: [
        { day: 1, fecha: "2026-09-01", byPlant: { Puebla: 45, Acapulco: 7 }, tot: 52 },
        { day: 2, fecha: "2026-09-02", byPlant: { Puebla: 51.2, Acapulco: 8 }, tot: 59.2 },
      ],
    },
    "Puebla"
  );
  const ventaCanal = forecast.scopeProvinciaGrid(
    {
      plants,
      cutoffDay: 99,
      byDate: [
        {
          day: 1,
          fecha: "2026-09-01",
          byPlant: {
            Puebla: { CASA: 45, COMISIONISTA: 12 },
            Acapulco: { CASA: 7, COMISIONISTA: 1 },
          },
        },
        {
          day: 2,
          fecha: "2026-09-02",
          byPlant: {
            Puebla: { CASA: 51.2, COMISIONISTA: 3 },
            Acapulco: { CASA: 3, COMISIONISTA: 4 },
          },
        },
      ],
    },
    "Puebla"
  );
  const wb = forecast.renderProvinciaDiariaSheets({
    year: 2026,
    month: 9,
    compTotalKg: 3000,
    ventaTonGrid,
    descuentoGrid: {
      plants: ["Puebla"],
      cutoffDay: 99,
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 1.5 } }],
    },
    ventaCanal,
    omitTotProvincia: true,
    comprasPayload: { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
    comprasPlantName: "Puebla",
  });
  return wb.getWorksheet("Provincia Venta Diaria");
}

describe("IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025 UI", () => {
  const mainAt = CLIENT.indexOf("<main");
  const topBar = CLIENT.slice(0, mainAt);
  const header = CLIENT.slice(CLIENT.indexOf("<span>Planta:</span>"), CLIENT.indexOf("<span>Planta:</span>") + 2200);

  it("A) la barra superior no tiene Descargar Excel (Forecast)", () => {
    assert.doesNotMatch(topBar, /Descargar Excel \(Forecast\)/);
    assert.doesNotMatch(CLIENT, /Descargar Excel \(Forecast\)/);
  });

  it("B) existe el botón IGFDiario", () => {
    assert.match(CLIENT, />\s*IGFDiario\s*</);
    assert.doesNotMatch(CLIENT, />\s*IGF Diario\s*</);
  });

  it("C) IGFDiario queda junto al selector Planta", () => {
    assert.match(header, /<select[\s\S]*IGFDiario/);
    assert.ok(header.indexOf("</select>") < header.indexOf("IGFDiario"));
    assert.ok(header.indexOf("IGFDiario") < header.indexOf("MESES[igfForecast.month - 1]"));
  });

  it("D) un solo selector Planta", () => {
    assert.equal((CLIENT.match(/<select/g) || []).length, 1);
    assert.equal((CLIENT.match(/Planta:/g) || []).length, 1);
  });

  it("E) Todas no descarga y muestra el mensaje", () => {
    assert.match(header, /if \(!plantaFilter\)/);
    assert.match(header, /Selecciona una planta para descargar el Excel Forecast\./);
    assert.doesNotMatch(header, /disabled=\{!plantaFilter\}/);
  });

  it("F) planta usa plant_code y require_plant=1", () => {
    assert.match(header, /getDashboardExcelDownloadUrl\([\s\S]*plantaFilter,\s*true/);
  });

  it("G–H) el título es siempre IGF Forecast", () => {
    assert.match(CLIENT, /<h2 className="text-lg font-medium text-slate-200">IGF Forecast<\/h2>/);
    assert.doesNotMatch(CLIENT, /Comparación por planta/);
  });

  it("I–J) la tabla principal sigue presente con y sin planta", () => {
    const loadingAt = CLIENT.indexOf("{igfLoading &&");
    assert.doesNotMatch(CLIENT.slice(loadingAt - 120, loadingAt), /!plantaFilter/);
    assert.match(CLIENT, /label: "Empresa"|Empresa<\/th>/);
    assert.match(CLIENT, /plantaFilter\s*\?\s*igfMini\.rows\.filter/);
  });

  it("K–M) Puebla filtra la fila y Zona Provincia solo con Todas", () => {
    assert.match(CLIENT, /\(r\.empresa \|\| ""\)\.trim\(\) === plantaFilter/);
    assert.match(CLIENT, /\{!plantaFilter && zona \? renderRow\(zona, true\) : null\}/);
    assert.match(CLIENT, /forecastRows\.filter\(\(r\) => \(r\.empresa\?\.trim\(\) \|\| ""\) === plantaFilter\)/);
  });
});

describe("IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025 Excel", () => {
  const ws = scopedSheet();

  it("N–P) encabezado plant-scoped: DÍA, planta y C vacía", () => {
    assert.equal(ws.getCell(1, 1).value, "DÍA");
    assert.equal(ws.getCell(1, 2).value, "Puebla");
    assert.equal(ws.getCell(1, 3).value, null);
    assert.notEqual(ws.getCell(1, 3).value, "Tot Provincia");
  });

  it("Q–R) C queda vacía en días y en ACUM/PROM/PROY/Comp/Dif Comp", () => {
    assert.equal(ws.getCell(2, 3).value, null);
    assert.equal(ws.getCell(3, 3).value, null);
    for (const label of ["ACUM", "PROM", "PROY", "Comp", "Dif Comp"]) {
      const row = findLabelRow(ws, label);
      assert.ok(row);
      assert.equal(ws.getCell(row, 3).value, null);
    }
  });

  it("S–T) B conserva el valor y el formato de 3 decimales", () => {
    assert.equal(ws.getCell(2, 2).value, 45);
    assert.equal(ws.getCell(2, 2).numFmt, FMT3);
    assert.equal(ws.getCell(3, 2).value, 51.2);
    assert.equal(findLabelRow(ws, "PROY") && ws.getCell(findLabelRow(ws, "PROY"), 2).value, 64.1234);
  });

  it("U–V) J y K siguen siendo CASA y COMISIONISTA", () => {
    assert.equal(text(ws.getCell(1, 9)), "");
    assert.equal(text(ws.getCell(1, 10)), "Puebla\nCASA");
    assert.equal(text(ws.getCell(1, 11)), "Puebla\nCOMISIONISTA");
    assert.equal(ws.getCell(2, 10).value, 45);
  });

  it("W) CONTROL DE COMPRAS sigue en tercera posición", () => {
    const wb = forecast.renderProvinciaDiariaSheets({
      year: 2026,
      month: 9,
      ventaTonGrid: {
        plants: ["Puebla"],
        cutoffDay: 99,
        forecastByPlant: new Map([["Puebla", 1]]),
        byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 1 }, tot: 1 }],
      },
      descuentoGrid: {
        plants: ["Puebla"],
        cutoffDay: 99,
        byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 0 } }],
      },
      omitTotProvincia: true,
      comprasPayload: { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
      comprasPlantName: "Puebla",
    });
    assert.equal(wb.worksheets[0].name, "Provincia Venta Diaria");
    assert.equal(wb.worksheets[1].name, "Provincia Comisiones");
    assert.equal(wb.worksheets[2].name, "CONTROL DE COMPRAS");
  });

  it("X) el workbook global conserva Tot Provincia", () => {
    const wb = forecast.renderProvinciaDiariaSheets({
      year: 2026,
      month: 9,
      ventaTonGrid: {
        plants: ["Puebla", "Acapulco"],
        cutoffDay: 99,
        forecastByPlant: new Map([
          ["Puebla", 10],
          ["Acapulco", 20],
        ]),
        byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 45, Acapulco: 7 }, tot: 52 }],
      },
      descuentoGrid: {
        plants: ["Puebla", "Acapulco"],
        cutoffDay: 99,
        byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { Puebla: 1, Acapulco: 2 } }],
      },
    });
    const globalWs = wb.getWorksheet("Provincia Venta Diaria");
    assert.equal(globalWs.getCell(1, 2).value, "Puebla");
    assert.equal(globalWs.getCell(1, 3).value, "Acapulco");
    assert.equal(globalWs.getCell(1, 4).value, "Tot Provincia");
    assert.equal(globalWs.getCell(2, 4).value, 52);
    assert.equal(wb.getWorksheet("CONTROL DE COMPRAS"), undefined);
    assert.match(LIB, /omitTotProvincia: Boolean\(exportPlant\)/);
  });
});
