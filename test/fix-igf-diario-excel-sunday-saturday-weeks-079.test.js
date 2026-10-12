"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const weekly = require("../lib/igf-diario-weekly-plant");

const PUEBLA = fs.readFileSync(path.join(__dirname, "..", "lib", "igf-diario-puebla.js"), "utf8");

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function blocks(year, month) {
  return igf.weeksOf(igf.monthBusinessDays(year, month).days).map((days) => ({
    desde: days[0].fecha,
    hasta: days[days.length - 1].fecha,
    fechas: days.map((day) => day.fecha),
    week: weekly.weekNumber(days[0].fecha),
  }));
}

function rowByDate(ws, fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  for (let row = 1; row <= Math.max(ws.rowCount || 0, 90); row += 1) {
    const value = ws.getCell(row, 1).value;
    if (value instanceof Date && value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day) {
      return row;
    }
  }
  return null;
}

function rowByLabel(ws, label) {
  const found = [];
  for (let row = 1; row <= Math.max(ws.rowCount || 0, 90); row += 1) {
    if (ws.getCell(row, 1).value === label) found.push(row);
  }
  return found;
}

function formulaOf(cell) {
  const value = cell && cell.value;
  return value && typeof value === "object" && value.formula ? String(value.formula) : "";
}

function fillPlant(name) {
  const wb = new ExcelJS.Workbook();
  const precio = wb.addWorksheet("PRECIO");
  for (let day = 1; day <= 31; day += 1) {
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 9, day));
    precio.getCell(day + 1, 2).value = 20 + day / 100;
  }
  igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 10,
    sheetLabel: name,
    humanName: name,
    corteYmd: "2026-10-09",
    plantEquivalent: () => true,
  });
  return wb.getWorksheet(`IGF Diario ${name}`);
}

test("octubre 2026 parte en domingo-sábado sin repetir ni mezclar fechas", () => {
  const got = blocks(2026, 10);
  assert.deepEqual(got.map((block) => [block.desde, block.hasta, block.week]), [
    ["2026-10-01", "2026-10-03", 40],
    ["2026-10-04", "2026-10-10", 41],
    ["2026-10-11", "2026-10-17", 42],
    ["2026-10-18", "2026-10-24", 43],
    ["2026-10-25", "2026-10-31", 44],
  ]);
  const fechas = got.flatMap((block) => block.fechas);
  assert.equal(new Set(fechas).size, 31);
  assert.equal(fechas.length, 31);
  for (const block of got) {
    const saturday = weekly.saturdayOfWeekContainingDate(block.desde);
    assert.ok(block.fechas.every((fecha) => weekly.saturdayOfWeekContainingDate(fecha) === saturday));
    assert.equal(block.hasta <= saturday, true);
  }
  assert.equal(got[1].fechas[0], "2026-10-04");
  assert.equal(got[1].fechas.at(-1), "2026-10-10");
  assert.equal(got[2].fechas[0], "2026-10-11");
  assert.equal(got[2].fechas.at(-1), "2026-10-17");
  assert.equal(got[1].fechas.includes("2026-10-11"), false);
});

test("la misma regla cubre inicio domingo, lunes, jueves, sábado, cierre parcial y cambio de año", () => {
  const sunday = blocks(2026, 3);
  assert.equal(sunday[0].desde, "2026-03-01");
  assert.equal(sunday[0].hasta, "2026-03-07");
  assert.equal(new Date(Date.UTC(2026, 2, 1)).getUTCDay(), 0);

  const monday = blocks(2026, 6);
  assert.deepEqual([monday[0].desde, monday[0].hasta], ["2026-06-01", "2026-06-06"]);
  assert.equal(new Date(Date.UTC(2026, 5, 1)).getUTCDay(), 1);

  const saturday = blocks(2026, 8);
  assert.deepEqual([saturday[0].desde, saturday[0].hasta], ["2026-08-01", "2026-08-01"]);
  assert.equal(new Date(Date.UTC(2026, 7, 1)).getUTCDay(), 6);

  const april = blocks(2026, 4);
  assert.deepEqual([april.at(-1).desde, april.at(-1).hasta], ["2026-04-26", "2026-04-30"]);
  assert.ok(april.at(-1).fechas.length < 7);

  const december = blocks(2026, 12);
  const january = blocks(2027, 1);
  assert.deepEqual([december.at(-1).desde, december.at(-1).hasta], ["2026-12-27", "2026-12-31"]);
  assert.deepEqual([january[0].desde, january[0].hasta], ["2027-01-01", "2027-01-02"]);
  assert.equal(december.flatMap((block) => block.fechas).some((fecha) => fecha.startsWith("2027-")), false);
  assert.equal(january.flatMap((block) => block.fechas).some((fecha) => fecha.startsWith("2026-")), false);
  assert.equal(december.at(-1).week, january[0].week);
});

test("Morelos y otra planta colocan los cierres de octubre en las filas del bloque", () => {
  for (const name of ["Morelos", "Puebla"]) {
    const ws = fillPlant(name);
    const expected = [
      ["2026-10-01", 6], ["2026-10-03", 8], ["2026-10-04", 11], ["2026-10-10", 17],
      ["2026-10-11", 20], ["2026-10-17", 26], ["2026-10-18", 29], ["2026-10-24", 35],
      ["2026-10-25", 38], ["2026-10-31", 44],
    ];
    for (const [fecha, row] of expected) assert.equal(rowByDate(ws, fecha), row, `${name} ${fecha}`);
    const summaries = [
      [40, 9, 6, 8],
      [41, 18, 11, 17],
      [42, 27, 20, 26],
      [43, 36, 29, 35],
      [44, 46, 38, 44],
    ];
    const seen = new Set();
    for (const [week, row, start, end] of summaries) {
      assert.deepEqual(rowByLabel(ws, `Semana ${week}`), [row], `${name} Semana ${week}`);
      const formula = formulaOf(ws.getCell(row, 2));
      assert.equal(formula, `IF(COUNT(B${start}:B${end})=0,"",SUM(B${start}:B${end}))`);
      for (let cursor = start; cursor <= end; cursor += 1) seen.add(cursor);
    }
    assert.equal(seen.size, 31);
    const precioFour = formulaOf(ws.getCell(rowByDate(ws, "2026-10-04"), 3));
    const precioEleven = formulaOf(ws.getCell(rowByDate(ws, "2026-10-11"), 3));
    assert.match(precioFour, /PRECIO!B5/);
    assert.match(precioEleven, /PRECIO!B12/);
    assert.equal(precioFour, formulaOf(fillPlant("Puebla").getCell(11, 3)));
  }
  assert.equal(PUEBLA.includes("Morelos"), false);
  assert.equal(PUEBLA.includes("2026-10-04"), false);
});

test("Provincia usa los mismos bloques y RESUMEN conserva la semana 42", () => {
  const wb = new ExcelJS.Workbook();
  const ws = igf.fillIgfDiarioProvincia(wb, { year: 2026, month: 10, plantSheets: [] });
  assert.equal(ws.name, "IGF Diario Provincia");
  assert.equal(rowByDate(ws, "2026-10-04"), 11);
  assert.equal(rowByDate(ws, "2026-10-10"), 17);
  assert.equal(rowByDate(ws, "2026-10-11"), 20);
  assert.equal(rowByDate(ws, "2026-10-17"), 26);
  assert.deepEqual(rowByLabel(ws, "Semana 42"), [27]);
  assert.match(formulaOf(ws.getCell(27, 2)), /B20:B26/);
  assert.doesNotMatch(formulaOf(ws.getCell(18, 2)), /B20/);

  const resumen = weekly.weekOf("2026-10-11");
  assert.equal(resumen.fecha_desde, "2026-10-11");
  assert.equal(resumen.fecha_hasta, "2026-10-17");
  assert.equal(resumen.week_number, 42);
  assert.equal(weekly.weekOf("2026-10-04").week_number, 41);
  assert.equal(weekly.weekOf(ymd(2026, 10, 1)).fecha_hasta, "2026-10-03");
});
