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
const insights = require("../lib/igf-diario-daily-insights");

const ROOT = path.join(__dirname, "..");
const GRAFICA_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const FORECAST_SRC = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const MODAL_SRC = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const CLIENT_SRC = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");

const CORTE = "2026-09-03";
const CORP = 206858.6;
const OPER = 59970.36;
const CAPTURE_KG = 9000;
const FORECAST_KG = 30750;

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
  if (value === undefined) throw new Error(`formula no evaluada ${ws.name}!${col}${row}: ${formula}`);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
      providers: { 1: { kg, tarifa, importe: tarifa == null || !own ? null : kg * tarifa } },
      consolidado: { kg, tarifa, importe: tarifa == null || !own ? null : kg * tarifa },
    },
    hg_kilos: hgKilos,
  };
}

function compraPayload() {
  const days = monthDays().map((day) => (
    day.fecha === "2026-09-02" ? compraDay(day.fecha, 1000, 13000, 2, 10) : compraDay(day.fecha, 0, 0, 2, null)
  ));
  return {
    year: 2026,
    month: 9,
    providers: [{ id: 1, nombre: "GAS" }],
    tarifas_flete: [{ proveedor_id: 1, tarifa: 2 }],
    costo_kg_anterior: null,
    grid: {
      days,
      weeks: [],
      month: { providers: {}, consolidado: { kg: 0, importe: 0, costo_kg: null }, flete: { providers: {}, consolidado: { tarifa: 2 } } },
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

const CAPTURED = {
  "2026-09-01": { casa: 6, com: 4 },
  "2026-09-02": { casa: 5, com: 5 },
  "2026-09-03": { casa: 4, com: 5 },
};

let corteBuilt;
function corteCase() {
  if (!corteBuilt) corteBuilt = buildCorteOracle();
  return corteBuilt;
}

async function buildCorteOracle() {
  const plant = "Puebla";
  const projection = projectionFor(plant);
  const days = monthDays();
  const wb = new ExcelJS.Workbook();
  const ventaTon = days.map((day) => ({ day: day.day, fecha: day.fecha, byPlant: { [plant]: null } }));
  const canal = days.map((day) => ({
    day: day.day,
    fecha: day.fecha,
    byPlant: {
      [plant]: {
        CASA: CAPTURED[day.fecha] ? CAPTURED[day.fecha].casa : null,
        COMISIONISTA: CAPTURED[day.fecha] ? CAPTURED[day.fecha].com : null,
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
  });
  const cdPrimary = {
    "2026-09-01": -0.55,
    "2026-09-02": -0.4,
    "2026-09-03": -0.99,
    "2026-09-10": -0.77,
  };
  forecast.hojaB(wb, {
    plants: [plant],
    byDate: days.map((day) => ({
      day: day.day,
      fecha: day.fecha,
      byPlant: { [plant]: Object.prototype.hasOwnProperty.call(cdPrimary, day.fecha) ? cdPrimary[day.fecha] : null },
    })),
    cutoffDay: 4,
  }, { byDate: ventaTon }, 2026, 9, "", "", null, { pronosticoProjection: projection });
  forecast.appendPrecioWorksheet(wb, 2026, 9, [
    { fecha: "2026-09-01", precio: 20.5 },
    { fecha: "2026-09-04", precio: 20.7 },
  ]);
  const payload = compraPayload();
  await comprasExcel.appendComprasWorksheet(wb, payload, { plantName: plant, corteYmd: CORTE });
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    corporativos: CORP,
    operativos: OPER,
    humanName: plant,
    plantEquivalent: (name) => String(name || "").toUpperCase().includes("PUEBLA"),
  });
  const casaTon = new Map();
  const comTon = new Map();
  for (const [fecha, pair] of Object.entries(CAPTURED)) {
    casaTon.set(fecha, pair.casa);
    comTon.set(fecha, pair.com);
  }
  const series = grafica.materializePlantMonth({
    year: 2026,
    month: 9,
    plant,
    corteYmd: CORTE,
    project: true,
    projection,
    corporativos: CORP,
    operativos: OPER,
    precioRows: [
      { fecha: "2026-09-01", precio: 20.5 },
      { fecha: "2026-09-04", precio: 20.7 },
    ],
    casaTon,
    comTon,
    cdByFecha: new Map(Object.entries(cdPrimary)),
    comprasByFecha: new Map(comprasExcel.resolveControlComprasDays(payload, CORTE).map((row) => [row.fecha, row])),
    skipDay1Fallback: true,
  });
  return { wb, ws, series };
}

function dayView(built, fecha) {
  const point = built.series.points.find((row) => row.fecha === fecha);
  const resolved = built.series.resolved.find((row) => row.fecha === fecha);
  const row = rowForFecha(built.ws, fecha);
  return {
    estado: point.estado,
    grafica: {
      B: point.venta_kg,
      AC: resolved.cdKg,
      AE: point.resultado_per_kg,
      AF: point.resultado_mxn,
    },
    excel: {
      B: valueAt(built.wb, built.ws, row, 2),
      AC: valueAt(built.wb, built.ws, row, 29),
      AE: valueAt(built.wb, built.ws, row, 31),
      AF: valueAt(built.wb, built.ws, row, 32),
    },
  };
}

function fakeClient(classify) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      const text = String(sql);
      const values = params || [];
      calls.push({ sql: text, params: values });
      return { rows: classify(text, values) || [] };
    },
  };
}

function isPrimaryCd(sql) {
  return sql.includes("descuento_por_kilo_diario_provincia");
}

function isFallbackCd(sql) {
  return sql.includes("ROUND((d.total_monto");
}

function isVentasFacts(sql) {
  return sql.includes("ventas_diarias_cliente") && sql.includes("cliente_norm");
}

function isComprasDetail(sql) {
  return sql.includes("FROM arr.compras") && sql.includes("fecha >=");
}

function cdCalls(calls, kind) {
  return calls.filter((call) => (kind === "primary" ? isPrimaryCd(call.sql) : isFallbackCd(call.sql)));
}

function plantMap(index, plant) {
  const map = new Map();
  for (const row of index.rows) {
    if (row.plant_code === plant) map.set(row.fecha, row.descuento_por_kg);
  }
  return map;
}

test("1. la fecha de corte con captura real distinta del forecast queda proyectada", async () => {
  assert.equal(forecast.resolveCanalTon(4, CORTE, CORTE, 3, null, 10.25), 10.25);
  assert.equal(forecast.resolveCanalTon(5, CORTE, CORTE, 3, null, 20.5), 20.5);
  assert.equal(forecast.resolveCanalTon(4, CORTE, CORTE, 3, null, null), null);
  assert.equal(forecast.resolveCanalTon(99, "2026-09-04", CORTE, 4, null, null), 0);
  assert.equal(forecast.resolveCanalTon(99, "2026-09-02", "", 2, 2, null), 0);
  assert.match(FORECAST_SRC, /String\(fecha\) >= String\(corteYmd\)/);
  const built = await corteCase();
  const corte = dayView(built, CORTE);
  assert.equal(corte.estado, "proyectado");
  assert.notEqual(corte.excel.B, CAPTURE_KG);
  assert.notEqual(corte.grafica.B, CAPTURE_KG);
});

test("2. B del corte usa el forecast de 30,750 kg", async () => {
  const corte = dayView(await corteCase(), CORTE);
  assert.equal(corte.excel.B, FORECAST_KG);
  assert.equal(corte.grafica.B, FORECAST_KG);
});

test("3. AC del corte usa el forecast y no el primario capturado", async () => {
  const corte = dayView(await corteCase(), CORTE);
  close(corte.excel.AC, -0.35, "AC excel corte");
  close(corte.grafica.AC, -0.35, "AC gráfica corte");
  assert.notEqual(corte.grafica.AC, -0.99);
});

test("4. AE y AF del corte empatan entre Excel y gráfica", async () => {
  const corte = dayView(await corteCase(), CORTE);
  close(corte.grafica.AE, corte.excel.AE, "AE corte");
  close(corte.grafica.AF, corte.excel.AF, "AF corte");
  assert.equal(typeof corte.grafica.AE, "number");
  assert.equal(typeof corte.grafica.AF, "number");
});

test("5. el día anterior al corte sigue real", async () => {
  const built = await corteCase();
  const prev = dayView(built, "2026-09-02");
  assert.equal(prev.estado, "real");
  assert.equal(prev.excel.B, 10000);
  assert.equal(prev.grafica.B, 10000);
  close(prev.grafica.AC, -0.4, "AC 02");
  close(prev.excel.AC, prev.grafica.AC, "AC 02 excel");
});

test("6. el día posterior al corte sigue en forecast", async () => {
  const next = dayView(await corteCase(), "2026-09-04");
  assert.equal(next.estado, "proyectado");
  assert.equal(next.excel.B, 12000);
  assert.equal(next.grafica.B, 12000);
  close(next.grafica.AC, -0.22, "AC 04");
  close(next.excel.AC, next.grafica.AC, "AC 04 excel");
});

function monthCdClient(tables) {
  return fakeClient((sql, params) => {
    const start = params[0];
    if (isPrimaryCd(sql)) return tables[start] ? tables[start].primary : [];
    if (isFallbackCd(sql)) return tables[start] ? tables[start].fallback : [];
    return [];
  });
}

test("7. agosto en fallback no queda bloqueado por el primary de septiembre", async () => {
  const client = monthCdClient({
    "2026-08-01": { primary: [], fallback: [{ plant_code: "Puebla", fecha: "2026-08-15", descuento_por_kg: -0.44 }] },
    "2026-09-01": { primary: [{ plant_code: "Puebla", fecha: "2026-09-10", descuento_por_kg: -0.77 }], fallback: [] },
  });
  const august = await grafica.loadCdMonthIndex(client, 2026, 8);
  const september = await grafica.loadCdMonthIndex(client, 2026, 9);
  assert.equal(august.mode, "fallback");
  assert.equal(september.mode, "primary");
  assert.equal(august.queryCount, 2);
  assert.equal(september.queryCount, 1);
  const augSeries = grafica.materializePlantMonth({
    year: 2026, month: 8, plant: "Puebla", corteYmd: "2026-09-20", project: false,
    cdByFecha: plantMap(august, "Puebla"),
  });
  const sepSeries = grafica.materializePlantMonth({
    year: 2026, month: 9, plant: "Puebla", corteYmd: "2026-09-20", project: true,
    cdByFecha: plantMap(september, "Puebla"),
  });
  assert.equal(augSeries.resolved.find((row) => row.fecha === "2026-08-15").cdKg, -0.44);
  assert.equal(sepSeries.resolved.find((row) => row.fecha === "2026-09-10").cdKg, -0.77);
  assert.equal(sepSeries.points.find((row) => row.fecha === "2026-09-10").estado, "real");
});

test("8. septiembre sin primary usa fallback real y el post-corte sigue en promDescTotal", async () => {
  const corte = "2026-09-15";
  const dow = new Date(2026, 8, 15).getDay();
  const index = (dow === 0 ? 7 : dow) - 1;
  const promDesc = ["", "", "", "", "", "", ""];
  promDesc[index] = -0.35;
  const client = monthCdClient({
    "2026-08-01": { primary: [{ plant_code: "Puebla", fecha: "2026-08-15", descuento_por_kg: -0.44 }], fallback: [{ plant_code: "Puebla", fecha: "2026-08-15", descuento_por_kg: -9 }] },
    "2026-09-01": {
      primary: [],
      fallback: [
        { plant_code: "Puebla", fecha: "2026-09-10", descuento_por_kg: 0.19 },
        { plant_code: "Puebla", fecha: corte, descuento_por_kg: 0.19 },
      ],
    },
  });
  const august = await grafica.loadCdMonthIndex(client, 2026, 8);
  const september = await grafica.loadCdMonthIndex(client, 2026, 9);
  assert.equal(august.mode, "primary");
  assert.equal(september.mode, "fallback");
  assert.equal(cdCalls(client.calls, "fallback").length, 1);
  assert.equal(cdCalls(client.calls, "fallback")[0].params[0], "2026-09-01");
  const sepSeries = grafica.materializePlantMonth({
    year: 2026,
    month: 9,
    plant: "Puebla",
    corteYmd: corte,
    project: true,
    projection: {
      corteYmdStr: corte,
      byPlant: new Map([["Puebla", {
        promVentaCasa: [],
        promVentaComisionista: [],
        promDescTotal: promDesc,
        promVentaTotal: [],
        proyVentaTotal: 0,
      }]]),
    },
    cdByFecha: plantMap(september, "Puebla"),
  });
  assert.equal(sepSeries.points.find((row) => row.fecha === "2026-09-10").estado, "real");
  assert.equal(sepSeries.resolved.find((row) => row.fecha === "2026-09-10").cdKg, 0.19);
  assert.equal(sepSeries.points.find((row) => row.fecha === corte).estado, "proyectado");
  assert.equal(sepSeries.resolved.find((row) => row.fecha === corte).cdKg, -0.35);
  const augSeries = grafica.materializePlantMonth({
    year: 2026, month: 8, plant: "Puebla", corteYmd: corte, project: false,
    cdByFecha: plantMap(august, "Puebla"),
  });
  assert.equal(augSeries.resolved.find((row) => row.fecha === "2026-08-15").cdKg, -0.44);
});

test("9. la consulta C&D se resuelve una vez por mes y se comparte entre plantas", async () => {
  const tables = {
    "2026-07-01": { primary: [{ plant_code: "Puebla", fecha: "2026-07-15", descuento_por_kg: -0.1 }], fallback: [] },
    "2026-08-01": { primary: [], fallback: [{ plant_code: "Puebla", fecha: "2026-08-15", descuento_por_kg: -0.44 }] },
    "2026-09-01": { primary: [{ plant_code: "Puebla", fecha: "2026-09-10", descuento_por_kg: -0.77 }], fallback: [] },
  };
  const client = fakeClient((sql, params) => {
    if (isPrimaryCd(sql) || isFallbackCd(sql)) {
      const bucket = tables[params[0]];
      return bucket ? (isPrimaryCd(sql) ? bucket.primary : bucket.fallback) : [];
    }
    return [];
  });
  const live = await grafica.loadLiveGrafica(client, {
    year: 2026,
    month: 9,
    range: "3m",
    corteYmd: "2026-09-20",
    todayYmd: "2026-09-28",
    plants: [
      { nombre: "Puebla", plantaId: 1 },
      { nombre: "Acapulco", plantaId: 2 },
    ],
  });
  const primary = cdCalls(client.calls, "primary");
  const fallback = cdCalls(client.calls, "fallback");
  assert.deepEqual(primary.map((call) => call.params[0]).sort(), ["2026-07-01", "2026-08-01", "2026-09-01"]);
  assert.equal(primary.length, 3);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].params[0], "2026-08-01");
  assert.equal(fallback[0].params[1], "2026-08-31");
  assert.ok(live.points.some((point) => point.fecha === "2026-08-15" && point.estado === "real"));
  assert.ok(live.points.some((point) => point.fecha === "2026-09-10" && point.estado === "real"));
  const loader = GRAFICA_SRC.slice(GRAFICA_SRC.indexOf("async function loadLiveGrafica"), GRAFICA_SRC.indexOf("module.exports"));
  assert.match(loader, /for \(const part of months\) \{[\s\S]*loadCdMonthIndex\(client, part\.year, part\.month\)/);
  assert.ok(loader.indexOf("loadCdMonthIndex") < loader.indexOf("for (const plant of opts.plants"));
});

function salesClient(rows, discounts) {
  return fakeClient((sql) => {
    if (isVentasFacts(sql)) return rows;
    if (sql.includes("descuentos_diarios_cliente") && sql.includes("cliente_norm")) return discounts || [];
    return [];
  });
}

async function septemberClients(rows, discounts) {
  const client = salesClient(rows, discounts);
  const live = await grafica.loadLiveGrafica(client, {
    year: 2026,
    month: 9,
    range: "1m",
    corteYmd: "2026-09-18",
    todayYmd: "2026-09-28",
    plants: [{ nombre: "Puebla", plantaId: 1 }],
  });
  return { client, live };
}

const AUGUST_BUYER = [
  { fecha: "2026-08-10", cliente_norm: "CLIENTE A", canal: "CASA", kg: 100 },
  { fecha: "2026-09-17", cliente_norm: "CLIENTE A", canal: "CASA", kg: 850 },
  { fecha: "2026-09-17", cliente_norm: "CLIENTE B", canal: "CASA", kg: 850 },
];

test("10. range 1m de septiembre consulta agosto para clasificar clientes", async () => {
  const { client } = await septemberClients(AUGUST_BUYER, [
    { fecha: "2026-09-17", cliente_norm: "CLIENTE B", monto: 603.5 },
  ]);
  const ventas = client.calls.filter((call) => isVentasFacts(call.sql));
  assert.equal(ventas.length, 1);
  assert.equal(ventas[0].params[1], "2026-08-01");
  assert.equal(ventas[0].params[2], "2026-09-30");
  const compras = client.calls.filter((call) => isComprasDetail(call.sql));
  assert.ok(compras.every((call) => call.params[1] === "2026-09-01"));
  const primary = cdCalls(client.calls, "primary");
  assert.deepEqual(primary.map((call) => call.params[0]), ["2026-09-01"]);
});

test("11. un cliente con compra en agosto no aparece como nuevo", async () => {
  const { live } = await septemberClients(AUGUST_BUYER);
  assert.equal(live.new_clients_top.some((row) => row.cliente === "CLIENTE A"), false);
  const events = insights.newClientEvents(AUGUST_BUYER, 2026, 9);
  assert.equal(events.some((row) => row.cliente === "CLIENTE A"), false);
});

test("12. un cliente sin compra en agosto sí es nuevo el 17/09", async () => {
  const { live } = await septemberClients(AUGUST_BUYER);
  const events = insights.newClientEvents(AUGUST_BUYER, 2026, 9);
  assert.deepEqual(events.map((row) => row.cliente), ["CLIENTE B"]);
  assert.equal(events[0].fecha, "2026-09-17");
  assert.equal(live.new_clients_top.some((row) => row.cliente === "CLIENTE B" && row.fecha_ingreso === "2026-09-17"), true);
});

test("13. enero consulta diciembre solo para la clasificación", async () => {
  const client = salesClient([
    { fecha: "2026-12-10", cliente_norm: "CLIENTE D", canal: "CASA", kg: 100 },
    { fecha: "2027-01-17", cliente_norm: "CLIENTE D", canal: "CASA", kg: 850 },
  ]);
  await grafica.loadLiveGrafica(client, {
    year: 2027,
    month: 1,
    range: "1m",
    corteYmd: "2027-01-18",
    todayYmd: "2027-01-20",
    plants: [{ nombre: "Puebla", plantaId: 1 }],
  });
  const ventas = client.calls.find((call) => isVentasFacts(call.sql));
  assert.equal(ventas.params[1], "2026-12-01");
  assert.equal(ventas.params[2], "2027-01-31");
  const compras = client.calls.filter((call) => isComprasDetail(call.sql));
  assert.ok(compras.every((call) => call.params[1] === "2027-01-01"));
  assert.equal(cdCalls(client.calls, "primary").some((call) => call.params[0] === "2026-12-01"), false);
});

test("14. compra en diciembre impide marcarlo nuevo en enero", async () => {
  const rows = [
    { fecha: "2026-12-10", cliente_norm: "CLIENTE D", canal: "CASA", kg: 100 },
    { fecha: "2027-01-17", cliente_norm: "CLIENTE D", canal: "CASA", kg: 850 },
  ];
  const live = await grafica.loadLiveGrafica(salesClient(rows), {
    year: 2027, month: 1, range: "1m", corteYmd: "2027-01-18", todayYmd: "2027-01-20",
    plants: [{ nombre: "Puebla", plantaId: 1 }],
  });
  assert.equal(insights.newClientEvents(rows, 2027, 1).length, 0);
  assert.equal(live.new_clients_top.length, 0);
});

test("15. sin compra en diciembre el cliente es nuevo en enero", async () => {
  const rows = [{ fecha: "2027-01-17", cliente_norm: "CLIENTE E", canal: "CASA", kg: 850 }];
  const live = await grafica.loadLiveGrafica(salesClient(rows), {
    year: 2027, month: 1, range: "1m", corteYmd: "2027-01-18", todayYmd: "2027-01-20",
    plants: [{ nombre: "Puebla", plantaId: 1 }],
  });
  const events = insights.newClientEvents(rows, 2027, 1);
  assert.equal(events[0].fecha, "2027-01-17");
  assert.equal(live.new_clients_top[0].cliente, "CLIENTE E");
  assert.equal(live.new_clients_top[0].fecha_ingreso, "2027-01-17");
});

test("16. el mes previo cargado para clasificar no entra en points", async () => {
  const { live } = await septemberClients(AUGUST_BUYER);
  assert.equal(live.points.some((point) => point.fecha.startsWith("2026-08")), false);
  assert.ok(live.points.every((point) => point.fecha >= "2026-09-01" && point.fecha <= "2026-09-30"));
});

test("17. Top 10 acumula kg y descuento del cliente nuevo", async () => {
  const { live } = await septemberClients(AUGUST_BUYER, [
    { fecha: "2026-09-17", cliente_norm: "CLIENTE B", monto: 603.5 },
  ]);
  assert.equal(live.new_clients_top.length, 1);
  assert.equal(live.new_clients_top[0].cliente, "CLIENTE B");
  assert.equal(live.new_clients_top[0].kg, 850);
  assert.ok(Math.abs(live.new_clients_top[0].descuento_per_kg - (603.5 / 850)) < 1e-9);
});

test("18. la mini gráfica sigue anclada a la semana del mes seleccionado", async () => {
  const { live } = await septemberClients(AUGUST_BUYER);
  assert.equal(live.new_clients_chart[0].label, "SEM -2");
  assert.equal(live.new_clients_chart[1].label, "SEM -1");
  assert.equal(live.new_clients_chart[0].tipo, "week");
  const day = live.new_clients_chart.find((item) => item.label === "Jue 17");
  assert.ok(day);
  assert.equal(day.tipo, "day");
  assert.equal(day.count, 1);
  assert.equal(day.kg, 850);
  assert.equal(live.new_clients_chart.some((item) => String(item.label).includes("Ago")), false);
});

test("19. la tendencia sigue usando los índices reales y no reindexa huecos", () => {
  const points = [
    { estado: "real", complete: true, resultado_mxn: 10, resultado_per_kg: 1 },
    { estado: "real", complete: true, resultado_mxn: 20, resultado_per_kg: 2 },
    { estado: "real", complete: false, resultado_mxn: 100, resultado_per_kg: 9 },
    { estado: "proyectado", complete: true, resultado_mxn: 50, resultado_per_kg: 4 },
    { estado: "real", complete: true, resultado_mxn: 40, resultado_per_kg: 5 },
  ];
  const trend = grafica.trendOf(points, "resultado_mxn");
  const reindexed = grafica.linearTrendIndexed([{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 40 }]);
  assert.equal(trend.xFirst, 0);
  assert.equal(trend.xLast, 4);
  assert.notEqual(trend.b, reindexed.b);
  const perKg = grafica.trendOf(points, "resultado_per_kg");
  assert.equal(perKg.xFirst, trend.xFirst);
  assert.equal(perKg.xLast, trend.xLast);
  assert.notEqual(perKg.b, trend.b);
  assert.match(MODAL_SRC, /chart\.trend\.xFirst/);
  assert.match(MODAL_SRC, /chart\.trend\.xLast/);
});

test("20. el gate Todas queda antes de la lectura y la UI 054 sigue intacta", () => {
  const server = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
  const start = server.indexOf('app.get("/api/dashboard/igf-diario-grafica"');
  const handler = server.slice(start, start + 2500);
  const gate = handler.indexOf("igfDiarioTodasRequestBlock(req)");
  const connect = handler.indexOf("pool.connect()");
  assert.ok(start > 0 && gate >= 0 && gate < connect);
  assert.match(MODAL_SRC, /useState<Metric>\("mxn"\)/);
  assert.match(MODAL_SRC, /useState<RangeId>\("1m"\)/);
  assert.match(MODAL_SRC, /metric === "mxn" \? "\$" : "\$\/kg"/);
  assert.match(MODAL_SRC, /Descargar Excel/);
  assert.doesNotMatch(MODAL_SRC, /Math\.max\(0/);
  const button = CLIENT_SRC.slice(CLIENT_SRC.indexOf("IGFDiario") - 700, CLIENT_SRC.indexOf("IGFDiario"));
  assert.match(button, /setIgfGraficaOpen\(true\)/);
  assert.doesNotMatch(button, /window\.open/);
  assert.doesNotMatch(GRAFICA_SRC, /require\("exceljs"\)/);
  assert.doesNotMatch(GRAFICA_SRC, /require\(["']openai|api\.openai|OPENAI_API/);
  assert.doesNotMatch(GRAFICA_SRC, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|CREATE TABLE|ALTER TABLE/);
  assert.match(GRAFICA_SRC, /if \(primary\.length\) return pack\(primary, "primary", 1\)/);
});
