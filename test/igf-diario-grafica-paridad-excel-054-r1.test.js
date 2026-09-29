"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const forecast = require("../lib/dashboard-arr-forecast");
const comprasExcel = require("../lib/compras-excel");
const igf = require("../lib/igf-diario-puebla");
const grafica = require("../lib/igf-diario-grafica");

const GRAFICA_SRC = fs.readFileSync(path.join(__dirname, "..", "lib", "igf-diario-grafica.js"), "utf8");
const MODAL_SRC = fs.readFileSync(path.join(__dirname, "..", "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const FALLBACK_B = 0.19;
const CORTE = "2026-09-03";
const CORP = 206858.6;
const OPER = 59970.36;

function colIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function formulaOf(cell) {
  return cell && cell.value && cell.value.formula ? String(cell.value.formula) : "";
}

function splitArgs(inner) {
  const args = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of String(inner)) {
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") depth -= 1;
    else if (!quote && ch === "," && depth === 0) {
      args.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur !== "") args.push(cur);
  return args;
}

function matchCall(expr, name) {
  const text = String(expr).trim();
  const head = text.match(new RegExp(`^${name}\\(`, "i"));
  if (!head) return null;
  let depth = 1;
  let quote = false;
  for (let i = head[0].length; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") {
      depth -= 1;
      if (depth === 0) return i === text.length - 1 ? text.slice(head[0].length, i) : null;
    }
  }
  return null;
}

function splitOp(expr, op) {
  let depth = 0;
  let quote = false;
  const text = String(expr);
  let found = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") depth -= 1;
    else if (!quote && depth === 0 && text.startsWith(op, i)) found = i;
  }
  if (found == null) return null;
  return [text.slice(0, found), text.slice(found + op.length)];
}

function stripParens(text) {
  let s = String(text).trim();
  while (s.startsWith("(") && s.endsWith(")")) {
    let depth = 0;
    let wraps = true;
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === "(") depth += 1;
      else if (s[i] === ")") depth -= 1;
      if (depth === 0 && i < s.length - 1) wraps = false;
    }
    if (!wraps) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

function cellNumber(wb, ws, row, col, stack) {
  if (!ws) return null;
  const key = `${ws.name}!${col}!${row}`;
  if (stack.has(key)) return undefined;
  stack.add(key);
  try {
    const value = ws.getCell(row, col).value;
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value === "object" && value.formula) return evalFormula(wb, ws, value.formula, stack);
    return null;
  } finally {
    stack.delete(key);
  }
}

function evalFormula(wb, ws, expr, stack = new Set()) {
  const text = stripParens(String(expr).trim().replace(/^=/, ""));
  if (text === '""' || text === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.endsWith("*-1")) {
    const inner = evalFormula(wb, ws, text.slice(0, -3), stack);
    return typeof inner === "number" ? inner * -1 : undefined;
  }
  const xref = text.match(/^(?:'([^']+)'|([^'!]+))!\$?([A-Z]+)\$?(\d+)$/);
  if (xref) return cellNumber(wb, wb.getWorksheet(xref[1] || xref[2]), Number(xref[4]), colIndex(xref[3]), stack);
  const local = text.match(/^\$?([A-Z]+)\$?(\d+)$/);
  if (local) return cellNumber(wb, ws, Number(local[2]), colIndex(local[1]), stack);
  const call = ["IF", "AND", "OR", "NOT", "ISNUMBER", "COUNT", "SUM"].find((name) => matchCall(text, name) != null);
  if (call === "IF") {
    const [cond, yes, no] = splitArgs(matchCall(text, "IF"));
    return evalFormula(wb, ws, cond, stack) ? evalFormula(wb, ws, yes == null ? '""' : yes, stack) : evalFormula(wb, ws, no == null ? '""' : no, stack);
  }
  if (call === "AND") return splitArgs(matchCall(text, "AND")).every((part) => evalFormula(wb, ws, part, stack));
  if (call === "OR") return splitArgs(matchCall(text, "OR")).some((part) => evalFormula(wb, ws, part, stack));
  if (call === "NOT") return !evalFormula(wb, ws, matchCall(text, "NOT"), stack);
  if (call === "ISNUMBER") {
    const n = evalFormula(wb, ws, matchCall(text, "ISNUMBER"), stack);
    return typeof n === "number" && Number.isFinite(n);
  }
  if (call === "COUNT" || call === "SUM") {
    const nums = [];
    for (const part of splitArgs(matchCall(text, call))) {
      const range = String(part).trim().match(/^(?:'([^']+)'|([^'!]+))!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/);
      const localRange = String(part).trim().match(/^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/);
      const spec = range || localRange;
      if (spec) {
        const sheet = range ? wb.getWorksheet(range[1] || range[2]) : ws;
        const col = colIndex(range ? range[3] : localRange[1]);
        const from = Number(range ? range[4] : localRange[2]);
        const to = Number(range ? range[6] : localRange[4]);
        for (let row = from; row <= to; row += 1) {
          const n = cellNumber(wb, sheet, row, col, stack);
          if (typeof n === "number" && Number.isFinite(n)) nums.push(n);
        }
        continue;
      }
      const n = evalFormula(wb, ws, part, stack);
      if (typeof n === "number" && Number.isFinite(n)) nums.push(n);
    }
    return call === "COUNT" ? nums.length : nums.reduce((sum, n) => sum + n, 0);
  }
  for (const op of ["<>", ">=", "<=", ">", "<", "=", "+", "-", "/", "*"]) {
    const parts = splitOp(text, op);
    if (!parts || parts[0].trim() === "") continue;
    const left = evalFormula(wb, ws, parts[0], stack);
    const right = evalFormula(wb, ws, parts[1], stack);
    if (op === "<>") return left !== right;
    if (op === "=") return left === right;
    if (op === ">=") return left >= right;
    if (op === "<=") return left <= right;
    if (op === ">") return left > right;
    if (op === "<") return left < right;
    if (typeof left !== "number" || typeof right !== "number") return undefined;
    if (op === "+") return left + right;
    if (op === "-") return left - right;
    if (op === "/") return right === 0 ? undefined : left / right;
    return left * right;
  }
  return undefined;
}

function valueAt(wb, ws, row, col) {
  const formula = formulaOf(ws.getCell(row, col));
  if (!formula) {
    const value = ws.getCell(row, col).value;
    return typeof value === "number" ? value : null;
  }
  const value = evalFormula(wb, ws, formula);
  if (value === undefined) throw new Error(`formula no evaluada ${ws.name}!${colLetter(col)}${row}: ${formula}`);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function colLetter(col) {
  let n = col;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function close(actual, expected, label) {
  assert.equal(typeof actual, "number", `${label}: gráfica ${actual}`);
  assert.equal(typeof expected, "number", `${label}: excel ${expected}`);
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: gráfica ${actual} ≠ excel ${expected}`);
}

function same(actual, expected, label) {
  if (actual == null || expected == null) {
    assert.equal(actual == null, expected == null, `${label}: gráfica ${actual} excel ${expected}`);
    return;
  }
  close(actual, expected, label);
}

function ymd(day) {
  return `2026-09-${String(day).padStart(2, "0")}`;
}

function projectionFor(plant) {
  return {
    corteYmdStr: CORTE,
    byPlant: new Map([[plant, {
      promVentaCasa: ["", "", "", 10.25, 8, "", ""],
      promVentaComisionista: ["", "", "", 20.5, 4, "", ""],
      promDescTotal: ["", "", "", -0.35, -0.22, "", ""],
      promVentaTotal: ["", "", "", "", "", "", ""],
      proyVentaTotal: 0,
    }]]),
  };
}

function monthDays() {
  const days = [];
  for (let day = 1; day <= 30; day += 1) days.push({ day, fecha: ymd(day) });
  return days;
}

function compraDay(fecha, kg, importe, tarifa, hgKilos) {
  const own = kg > 0;
  return {
    ymd: fecha,
    captured: own,
    cells: { 1: { kg, importe, costo_kg: own ? importe / kg : null } },
    consolidado: { kg, importe, costo_kg: own ? importe / kg : null },
    flete: {
      providers: {
        1: { kg, tarifa, importe: tarifa == null || !own ? null : kg * tarifa },
      },
      consolidado: { kg, tarifa, importe: tarifa == null || !own ? null : kg * tarifa },
    },
    hg_kilos: hgKilos,
  };
}

function compraPayload(costoAnterior, tarifa) {
  const days = monthDays().map((day) => {
    if (day.fecha === "2026-09-02") return compraDay(day.fecha, 1000, 13000, tarifa, 10);
    return compraDay(day.fecha, 0, 0, tarifa, null);
  });
  return {
    year: 2026,
    month: 9,
    providers: [{ id: 1, nombre: "GAS" }],
    tarifas_flete: tarifa == null ? [] : [{ proveedor_id: 1, tarifa }],
    costo_kg_anterior: costoAnterior,
    grid: {
      days,
      weeks: [],
      month: { providers: {}, consolidado: { kg: 0, importe: 0, costo_kg: null }, flete: { providers: {}, consolidado: { tarifa } } },
      rows: days.map((day) => ({ type: "day", ymd: day.ymd })),
    },
  };
}

function rowForFecha(ws, fecha) {
  for (let row = 1; row <= 80; row += 1) {
    const value = ws.getCell(row, 1).value;
    if (value instanceof Date && value.toISOString().slice(0, 10) === fecha) return row;
  }
  throw new Error(`sin fila ${fecha} en ${ws.name}`);
}

async function buildPlantOracle(opts) {
  const plant = opts.plant || "Puebla";
  const corte = opts.corte || CORTE;
  const projection = opts.projection || projectionFor(plant);
  projection.corteYmdStr = corte;
  const captured = opts.captured || {
    "2026-09-01": { casa: 6, com: 4 },
    "2026-09-02": { casa: 5, com: 5 },
  };
  const cdPrimary = opts.cdPrimary || {
    "2026-09-01": -0.55,
    "2026-09-02": -0.4,
    "2026-09-10": -0.77,
  };
  const days = monthDays();
  const wb = new ExcelJS.Workbook();
  const ventaTon = days.map((day) => ({ day: day.day, fecha: day.fecha, byPlant: { [plant]: null } }));
  const canal = days.map((day) => ({
    day: day.day,
    fecha: day.fecha,
    byPlant: {
      [plant]: {
        CASA: captured[day.fecha] ? captured[day.fecha].casa : null,
        COMISIONISTA: captured[day.fecha] ? captured[day.fecha].com : null,
      },
    },
  }));
  forecast.hojaA(wb, {
    plants: [plant],
    byDate: ventaTon,
    forecastByPlant: new Map(),
    cutoffDay: 4,
  }, 2026, 9, 0, "", "", {
    ventaCanal: { byDate: canal },
    pronosticoProjection: projection,
    omitTotProvincia: true,
    sheetName: opts.ventaSheet,
  });
  const cdGrid = days.map((day) => ({
    day: day.day,
    fecha: day.fecha,
    byPlant: { [plant]: Object.prototype.hasOwnProperty.call(cdPrimary, day.fecha) ? cdPrimary[day.fecha] : null },
  }));
  forecast.hojaB(wb, {
    plants: [plant],
    byDate: cdGrid,
    cutoffDay: 4,
  }, { byDate: ventaTon }, 2026, 9, "", "", null, {
    pronosticoProjection: projection,
    sheetName: opts.comisionesSheet,
  });
  forecast.appendPrecioWorksheet(wb, 2026, 9, opts.precioRows || [
    { fecha: "2026-09-01", precio: 20.5 },
    { fecha: "2026-09-04", precio: 20.7 },
  ], opts.precioSheet);
  const payload = opts.payload || compraPayload(
    opts.costoAnterior === undefined ? null : opts.costoAnterior,
    opts.tarifa === undefined ? 2 : opts.tarifa
  );
  await comprasExcel.appendComprasWorksheet(wb, payload, {
    plantName: plant,
    corteYmd: corte,
    sheetName: opts.comprasSheet,
  });
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: corte,
    corporativos: CORP,
    operativos: OPER,
    sheetLabel: opts.sheetLabel,
    humanName: plant,
    plantEquivalent: (name) => String(name || "").toUpperCase().includes(String(plant).toUpperCase()),
    supports: {
      venta: opts.ventaSheet,
      comisiones: opts.comisionesSheet,
      precio: opts.precioSheet,
      compras: opts.comprasSheet,
    },
  });
  const casaTon = new Map();
  const comTon = new Map();
  for (const [fecha, pair] of Object.entries(captured)) {
    if (pair.casa != null) casaTon.set(fecha, pair.casa);
    if (pair.com != null) comTon.set(fecha, pair.com);
  }
  const cdByFecha = new Map(Object.entries(cdPrimary));
  const resolvedCompras = comprasExcel.resolveControlComprasDays(payload, corte);
  const series = grafica.materializePlantMonth({
    year: 2026,
    month: 9,
    plant,
    corteYmd: corte,
    project: opts.project !== false,
    projection,
    corporativos: CORP,
    operativos: OPER,
    precioRows: opts.precioRows || [
      { fecha: "2026-09-01", precio: 20.5 },
      { fecha: "2026-09-04", precio: 20.7 },
    ],
    casaTon,
    comTon,
    cdByFecha,
    comprasByFecha: new Map(resolvedCompras.map((row) => [row.fecha, row])),
    skipDay1Fallback: true,
  });
  return { wb, ws, series, resolvedCompras };
}

function compareDay(built, fecha) {
  const point = built.series.points.find((row) => row.fecha === fecha);
  const resolved = built.series.resolved.find((row) => row.fecha === fecha);
  const firstProjected = built.series.points.find((row) => row.estado === "proyectado");
  const carried = grafica.resolveCarry(built.series.resolved, firstProjected ? firstProjected.fecha : "2026-10-01", null);
  const input = carried.find((row) => row.fecha === fecha);
  const row = rowForFecha(built.ws, fecha);
  const excel = {
    B: valueAt(built.wb, built.ws, row, 2),
    C: valueAt(built.wb, built.ws, row, 3),
    F: valueAt(built.wb, built.ws, row, 6),
    G: valueAt(built.wb, built.ws, row, 7),
    X: valueAt(built.wb, built.ws, row, 24),
    AC: valueAt(built.wb, built.ws, row, 29),
    AE: valueAt(built.wb, built.ws, row, 31),
    AF: valueAt(built.wb, built.ws, row, 32),
  };
  same(point.venta_kg, excel.B, `${fecha} B`);
  same(resolved.precio, excel.C, `${fecha} C`);
  same(input.costoKg, excel.F, `${fecha} F`);
  same(input.fleteKg, excel.G, `${fecha} G`);
  same(resolved.hgImporte, excel.X, `${fecha} X`);
  same(resolved.cdKg, excel.AC, `${fecha} AC`);
  same(point.resultado_per_kg, excel.AE, `${fecha} AE`);
  same(point.resultado_mxn, excel.AF, `${fecha} AF`);
  return { fecha, estado: point.estado, excel, grafica: {
    B: point.venta_kg,
    C: resolved.precio,
    F: input.costoKg,
    G: input.fleteKg,
    X: resolved.hgImporte,
    AC: resolved.cdKg,
    AE: point.resultado_per_kg,
    AF: point.resultado_mxn,
  } };
}

test("paridad diaria Excel vs gráfica en real, corte y proyectado", async () => {
  const built = await buildPlantOracle({ corte: CORTE, costoAnterior: null, tarifa: 2 });
  const table = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-10"].map((fecha) => compareDay(built, fecha));
  const corte = table.find((row) => row.fecha === CORTE);
  assert.equal(corte.estado, "proyectado");
  close(corte.grafica.B, 30750, "venta forecast del corte");
  assert.equal(corte.excel.B, 30750);
  const after = table.find((row) => row.fecha === "2026-09-04");
  assert.equal(after.estado, "proyectado");
  close(after.grafica.B, 12000, "venta posterior al corte");
  close(after.grafica.C, 20.7, "precio propio");
  close(table[1].grafica.C, 20.5, "precio carry 02");
  close(corte.grafica.C, 20.5, "precio carry 03");
  assert.notEqual(corte.grafica.AC, FALLBACK_B);
  close(table[0].grafica.AC, -0.55, "C&D primario real");
  assert.ok(table[0].grafica.AC !== FALLBACK_B);
  close(corte.grafica.AC, -0.35, "C&D proyectado");
  assert.equal(typeof after.grafica.F, "number");
  assert.equal(typeof after.grafica.G, "number");
  assert.equal(typeof after.grafica.X, "number");
  assert.equal(table[0].estado, "real");
});

test("C&D del 10/09 usa la fuente primaria y no el fallback", async () => {
  const built = await buildPlantOracle({
    corte: "2026-09-15",
    cdPrimary: { "2026-09-10": -0.77, "2026-09-01": -0.55, "2026-09-02": -0.4 },
  });
  const day = compareDay(built, "2026-09-10");
  assert.equal(day.estado, "real");
  close(day.grafica.AC, -0.77, "AC primario 10/09");
  assert.notEqual(day.excel.AC, FALLBACK_B);
  assert.notEqual(day.grafica.AC, FALLBACK_B);
});

test("día 1 sin histórico hereda el costo del día 2 y con histórico usa el anterior", async () => {
  const none = await buildPlantOracle({ corte: CORTE, costoAnterior: null, tarifa: 2 });
  const day1 = compareDay(none, "2026-09-01");
  const day2 = compareDay(none, "2026-09-02");
  close(day1.grafica.F, day2.grafica.F, "F día 1 = F día 2");
  const prior = await buildPlantOracle({ corte: CORTE, costoAnterior: 11.5, tarifa: 2 });
  const inherited = compareDay(prior, "2026-09-01");
  close(inherited.grafica.F, 11.5, "F día 1 con histórico");
  close(inherited.excel.F, 11.5, "F excel día 1 con histórico");
});

test("semana real, semana mixta y tendencia con índices reales", async () => {
  const mixed = await buildPlantOracle({ corte: CORTE });
  assert.equal(mixed.series.weeks[0].estado, "mixto");
  let weekRow = null;
  for (let row = 6; row < 80; row += 1) {
    if (mixed.ws.getCell(row, 1).value === "Semana 1") weekRow = row;
  }
  assert.ok(weekRow);
  close(mixed.series.weeks[0].resultado_mxn, valueAt(mixed.wb, mixed.ws, weekRow, 32), "AF semana mixta");
  close(mixed.series.weeks[0].resultado_per_kg, valueAt(mixed.wb, mixed.ws, weekRow, 31), "AE semana mixta");

  const realWeek = await buildPlantOracle({ corte: "2026-09-07" });
  assert.equal(realWeek.series.weeks[0].estado, "real");
  weekRow = null;
  for (let row = 6; row < 80; row += 1) {
    if (realWeek.ws.getCell(row, 1).value === "Semana 1") weekRow = row;
  }
  close(realWeek.series.weeks[0].resultado_mxn, valueAt(realWeek.wb, realWeek.ws, weekRow, 32), "AF semana real");
  close(realWeek.series.weeks[0].resultado_per_kg, valueAt(realWeek.wb, realWeek.ws, weekRow, 31), "AE semana real");

  const points = [
    { estado: "real", complete: true, resultado_mxn: 10, resultado_per_kg: 1 },
    { estado: "real", complete: true, resultado_mxn: 20, resultado_per_kg: 2 },
    { estado: "real", complete: false, resultado_mxn: 100, resultado_per_kg: 9 },
    { estado: "proyectado", complete: true, resultado_mxn: 50, resultado_per_kg: 4 },
    { estado: "real", complete: true, resultado_mxn: 40, resultado_per_kg: 5 },
    { estado: "proyectado", complete: true, resultado_mxn: 1, resultado_per_kg: 0 },
  ];
  const trend = grafica.trendOf(points, "resultado_mxn");
  const reindexed = grafica.linearTrendIndexed([
    { x: 0, y: 10 },
    { x: 1, y: 20 },
    { x: 2, y: 40 },
  ]);
  assert.equal(trend.xFirst, 0);
  assert.equal(trend.xLast, 4);
  assert.notEqual(trend.b, reindexed.b);
  const perKg = grafica.trendOf(points, "resultado_per_kg");
  assert.equal(perKg.xFirst, 0);
  assert.equal(perKg.xLast, 4);
  assert.notEqual(perKg.b, trend.b);
  assert.match(MODAL_SRC, /function linearTrendIndexed/);
  assert.match(MODAL_SRC, /chart\.trend\.xFirst/);
  assert.match(MODAL_SRC, /chart\.trend\.xLast/);
  assert.doesNotMatch(MODAL_SRC, /chart\.xOf\(chart\.points\.length - 1\)/);
});

test("Provincia suma AF numérico y AE = AF/B con una planta incompleta", async () => {
  const plants = [
    { name: "Puebla", tarifa: 2, captured: { "2026-09-02": { casa: 5, com: 5 } } },
    { name: "Acapulco", tarifa: 2, captured: { "2026-09-02": { casa: 3, com: 2 } } },
    { name: "San Luis", tarifa: null, captured: { "2026-09-02": { casa: 2, com: 2 } } },
  ];
  const built = [];
  for (const plant of plants) {
    built.push(await buildPlantOracle({
      plant: plant.name,
      sheetLabel: plant.name,
      ventaSheet: `VENTA ${plant.name}`,
      comisionesSheet: `CD ${plant.name}`,
      precioSheet: `PRECIO ${plant.name}`,
      comprasSheet: `COMPRAS ${plant.name}`,
      tarifa: plant.tarifa,
      captured: plant.captured,
      cdPrimary: { "2026-09-02": -0.4 },
      corte: CORTE,
    }));
  }
  const provinciaWb = new ExcelJS.Workbook();
  for (const item of built) {
    for (const sheet of item.wb.worksheets) {
      const copy = provinciaWb.addWorksheet(sheet.name);
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          copy.getCell(rowNumber, colNumber).value = cell.value;
        });
      });
    }
  }
  const names = plants.map((plant) => `IGF Diario ${plant.name}`);
  const provinceWs = igf.fillIgfDiarioProvincia(provinciaWb, {
    year: 2026,
    month: 9,
    plantSheets: names,
  });
  const province = grafica.buildProvinceMonth(built.map((item, index) => ({ ...item.series, plant: plants[index].name })));
  const fecha = "2026-09-02";
  const point = province.points.find((row) => row.fecha === fecha);
  const row = rowForFecha(provinceWs, fecha);
  assert.equal(point.complete, false);
  assert.ok(point.missing_plants.includes("San Luis"));
  close(point.resultado_mxn, valueAt(provinciaWb, provinceWs, row, 32), "AF provincia");
  close(point.resultado_per_kg, valueAt(provinciaWb, provinceWs, row, 31), "AE provincia");
  close(point.venta_kg, valueAt(provinciaWb, provinceWs, row, 2), "B provincia");
  const projected = province.points.find((item) => item.fecha === CORTE);
  const projectedRow = rowForFecha(provinceWs, CORTE);
  same(projected.resultado_mxn, valueAt(provinciaWb, provinceWs, projectedRow, 32), "AF provincia corte");
  same(projected.resultado_per_kg, valueAt(provinciaWb, provinceWs, projectedRow, 31), "AE provincia corte");
});

test("el loader no reconstruye inputs ni genera Excel en runtime", () => {
  assert.match(GRAFICA_SRC, /materializePlantMonth/);
  assert.match(GRAFICA_SRC, /resolveControlComprasDays/);
  assert.match(GRAFICA_SRC, /resolvePrecioDailySeries/);
  assert.match(GRAFICA_SRC, /resolveCanalTon/);
  assert.match(GRAFICA_SRC, /resolveComisionCd/);
  assert.match(GRAFICA_SRC, /descuento_por_kilo_diario_provincia/);
  assert.match(GRAFICA_SRC, /if \(primary\.length\) return pack\(primary, "primary", 1\)/);
  assert.doesNotMatch(GRAFICA_SRC, /require\("exceljs"\)/);
  assert.doesNotMatch(GRAFICA_SRC, /require\(["']openai|api\.openai|OPENAI_API/);
  assert.doesNotMatch(GRAFICA_SRC, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|CREATE TABLE|ALTER TABLE/);
  const loader = GRAFICA_SRC.slice(GRAFICA_SRC.indexOf("async function loadLiveGrafica"), GRAFICA_SRC.indexOf("module.exports"));
  assert.doesNotMatch(loader, /ventaKgFromRows\(|cdKgFromRows\(/);
});
