"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const forecast = require("../lib/dashboard-arr-forecast");

function sheet(rows) {
  return forecast.appendPrecioWorksheet(new (require("exceljs").Workbook)(), 2026, 9, rows);
}

function price(wb, day) {
  return wb.getCell(day + 1, 2).value;
}

function grid(plant) {
  return {
    year: 2026,
    month: 9,
    ventaTonGrid: {
      plants: [plant],
      cutoffDay: 99,
      forecastByPlant: new Map([[plant, 1]]),
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { [plant]: 1 }, tot: 1 }],
    },
    descuentoGrid: {
      plants: [plant],
      cutoffDay: 99,
      byDate: [{ day: 1, fecha: "2026-09-01", byPlant: { [plant]: 0 } }],
    },
    comprasPayload: { year: 2026, month: 9, providers: [], grid: { days: [], weeks: [], month: null } },
    comprasPlantName: plant,
  };
}

test("A–E) el precio propio manda y los huecos heredan hasta el siguiente", () => {
  const wb = sheet([
    { fecha: "2026-09-22", precio: 19.76902713 },
    { fecha: "2026-09-26", precio: 19.81234567 },
  ]);
  assert.equal(price(wb, 22), 19.76902713);
  assert.equal(price(wb, 23), 19.76902713);
  assert.equal(price(wb, 24), 19.76902713);
  assert.equal(price(wb, 25), 19.76902713);
  assert.equal(price(wb, 26), 19.81234567);
  assert.equal(price(wb, 27), 19.81234567);
  assert.equal(price(wb, 30), 19.81234567);
});

test("F–G) cero y null no reemplazan el último válido", () => {
  const wb = sheet([
    { fecha: "2026-09-22", precio: 19.76902713 },
    { fecha: "2026-09-23", precio: 0 },
    { fecha: "2026-09-24", precio: null },
    { fecha: "2026-09-25", precio: "" },
    { fecha: "2026-09-26", precio: Number.NaN },
  ]);
  assert.equal(price(wb, 23), 19.76902713);
  assert.equal(price(wb, 24), 19.76902713);
  assert.equal(price(wb, 25), 19.76902713);
  assert.equal(price(wb, 26), 19.76902713);
});

test("H) el inicio de mes sin valor previo queda vacío", () => {
  const wb = sheet([
    { fecha: "2026-09-03", precio: 19.76902713 },
  ]);
  assert.equal(price(wb, 1), null);
  assert.equal(price(wb, 2), null);
  assert.equal(price(wb, 3), 19.76902713);
  assert.equal(price(wb, 4), 19.76902713);
});

test("I–J) el valor conserva precisión y el formato de 8 decimales", () => {
  const wb = sheet([{ fecha: "2026-09-22", precio: 19.76902713 }]);
  const cell = wb.getCell(23, 2);
  assert.equal(cell.value, 19.76902713);
  assert.notEqual(cell.value, 19.77);
  assert.equal(typeof cell.value, "number");
  assert.equal(cell.numFmt, "0.00000000");
  assert.equal(wb.getCell(24, 2).value, 19.76902713);
  assert.equal(wb.getCell(24, 2).numFmt, "0.00000000");
  assert.equal(wb.getCell(31, 2).value, 19.76902713);
});

test("K) PRECIO sigue tercera y CONTROL DE COMPRAS cuarta", () => {
  const wb = forecast.renderProvinciaDiariaSheets({
    ...grid("Puebla"),
    precioDiario: [{ fecha: "2026-09-22", precio: 19.76902713 }],
  });
  assert.equal(wb.worksheets[0].name, "Provincia Venta Diaria");
  assert.equal(wb.worksheets[1].name, "Provincia Comisiones");
  assert.equal(wb.worksheets[2].name, "PRECIO");
  assert.equal(wb.worksheets[3].name, "CONTROL DE COMPRAS");
  assert.equal(wb.getWorksheet("PRECIO").getCell(1, 1).value, "Fecha");
  assert.equal(wb.getWorksheet("PRECIO").getCell(1, 2).value, "PRECIO");
  assert.equal(wb.getWorksheet("PRECIO").getCell(23, 2).value, 19.76902713);
  assert.equal(wb.getWorksheet("PRECIO").getCell(31, 2).value, 19.76902713);
});
