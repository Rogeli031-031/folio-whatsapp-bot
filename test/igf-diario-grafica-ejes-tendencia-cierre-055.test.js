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

const ROOT = path.join(__dirname, "..");
const GRAFICA_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const MODAL_SRC = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const API_SRC = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "lib", "api.ts"), "utf8");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

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



function covers(ticks, lo, hi) {
  assert.ok(ticks.some((tick) => Math.abs(tick) < 1e-9), `incluye cero: ${ticks.join(",")}`);
  assert.ok(Math.min(...ticks) <= lo + 1e-9, `cubre mínimo ${ticks.join(",")}`);
  assert.ok(Math.max(...ticks) >= hi - 1e-9, `cubre máximo ${ticks.join(",")}`);
}

test("eje Y incluye cero y cubre dominio positivo y negativo", () => {
  const mixed = grafica.buildNiceYTicks(-100, 300, "mxn", 5);
  covers(mixed, -100, 300);
  assert.ok(mixed.length >= 4 && mixed.length <= 6, mixed.join(","));
  const positive = grafica.buildNiceYTicks(40, 180, "mxn", 5);
  covers(positive, 40, 180);
  assert.ok(positive.every((tick) => tick >= -1e-9));
  const negative = grafica.buildNiceYTicks(-220, -15, "mxn", 5);
  covers(negative, -220, -15);
  assert.ok(negative.every((tick) => tick <= 1e-9));
  const perKg = grafica.buildNiceYTicks(-0.44, 1.59, "per_kg", 5);
  covers(perKg, -0.44, 1.59);
  assert.ok(perKg.length >= 4 && perKg.length <= 6, perKg.join(","));
  assert.ok(perKg.every((tick) => Math.abs(tick) <= 4), perKg.join(","));
  assert.match(MODAL_SRC, /function fmtYTick/);
  assert.match(MODAL_SRC, /toFixed\(2\)/);
  assert.match(MODAL_SRC, /\$\{text\}k/);
});

test("eje X muestra como máximo 7 labels e incluye extremos", () => {
  const month = [];
  for (let day = 1; day <= 30; day += 1) {
    month.push({ fecha: `2026-09-${String(day).padStart(2, "0")}` });
  }
  const labels = grafica.buildXAxisTicks(month, "1m", 7);
  assert.ok(labels.length <= 7, String(labels.length));
  assert.equal(labels[0].fecha, "2026-09-01");
  assert.equal(labels[labels.length - 1].fecha, "2026-09-30");
  assert.match(labels[0].label, /^\d{2}\/\d{2}$/);
  const five = grafica.buildXAxisTicks(month.slice(0, 5), "5d", 7);
  assert.equal(five.length, 5);
  assert.match(five[0].label, /^\d{2}\/\d{2}$/);
  const quarter = [];
  for (let i = 0; i < 90; i += 1) {
    const date = new Date(Date.UTC(2026, 6, 3 + i));
    quarter.push({ fecha: date.toISOString().slice(0, 10) });
  }
  const wide = grafica.buildXAxisTicks(quarter, "3m", 7);
  assert.ok(wide.length <= 7);
  assert.equal(wide[0].fecha, quarter[0].fecha);
  assert.equal(wide[wide.length - 1].fecha, quarter[quarter.length - 1].fecha);
  assert.match(wide[0].label, /^\d{2} [a-z]{3}$/);
  const uniqueMiddle = new Set(wide.slice(1, -1).map((tick) => tick.label));
  assert.equal(uniqueMiddle.size, wide.length - 2);
  assert.match(MODAL_SRC, /buildXAxisTicks\(points, range\)/);
  assert.doesNotMatch(MODAL_SRC, /chart\.xOf\(chart\.points\.length - 1\)/);
});

test("tendencia semanal suma solo los días ocurridos", () => {
  const trend = grafica.buildWeeklyClientTrend([
    { label: "SEM -2", tipo: "week", count: 10, kg: 20000 },
    { label: "SEM -1", tipo: "week", count: 7, kg: 15000 },
    { label: "Lun", tipo: "day", count: 1, kg: 1000 },
    { label: "Mar", tipo: "day", count: 2, kg: 2000 },
    { label: "Mié", tipo: "day", count: 0, kg: 0 },
    { label: "Jue", tipo: "day", count: 3, kg: 3000 },
  ]);
  assert.deepEqual(trend.map((item) => item.count), [10, 7, 6]);
  assert.equal(trend[2].partial, true);
  assert.equal(trend[2].label, "SEM ACTUAL · PARCIAL");
  assert.equal(trend[2].kg, 6000);
  assert.equal(trend[0].kg, 20000);
  assert.equal(trend[1].kg, 15000);
  assert.match(MODAL_SRC, /Tendencia semanal/);
  assert.match(MODAL_SRC, /SEM ACTUAL/);
});

test("cierre suma AF y B del mes y anula resultado si falta cobertura", () => {
  const points = [
    { fecha: "2026-09-01", estado: "real", venta_kg: 100, resultado_mxn: 40, resultado_per_kg: 0.4, missing_components: [] },
    { fecha: "2026-09-02", estado: "real", venta_kg: 50, resultado_mxn: 10, resultado_per_kg: 0.2, missing_components: [] },
    { fecha: "2026-09-03", estado: "proyectado", venta_kg: 25, resultado_mxn: 5, resultado_per_kg: 0.2, missing_components: [] },
  ];
  const close = grafica.buildMonthClose(points, { year: 2026, month: 9 });
  assert.equal(close.label, "CIERRE PROYECTADO");
  assert.equal(close.complete, true);
  assert.equal(close.venta_kg, 175);
  assert.equal(close.resultado_mxn, 55);
  assert.ok(Math.abs(close.resultado_per_kg - 55 / 175) < 1e-12);
  assert.equal(close.real_mxn, 50);
  assert.equal(close.projected_mxn, 5);
  assert.equal(close.has_projection, true);
  const broken = grafica.buildMonthClose([
    points[0],
    {
      fecha: "2026-09-02",
      estado: "proyectado",
      venta_kg: 10,
      resultado_mxn: null,
      resultado_per_kg: null,
      missing_components: ["Puebla · HG", "FLETE"],
    },
  ], { year: 2026, month: 9 });
  assert.equal(broken.complete, false);
  assert.equal(broken.resultado_mxn, null);
  assert.equal(broken.resultado_per_kg, null);
  assert.equal(broken.venta_kg, 110);
  assert.deepEqual(broken.missing_components, ["FLETE", "HG"]);
  assert.equal(broken.real_mxn, 40);
  const closed = grafica.buildMonthClose([points[0], points[1]], { year: 2026, month: 9 });
  assert.equal(closed.label, "CIERRE DEL MES");
  assert.equal(closed.has_projection, false);
});

function providers() {
  return [
    { id: 1, planta_id: 7, nombre: "PEMEX TUXPAN", activo: true, orden: 0 },
    { id: 2, planta_id: 7, nombre: "TOMZA TUXPAN", activo: true, orden: 1 },
    { id: 3, planta_id: 7, nombre: "TOMZA TEPEJI", activo: true, orden: 2 },
  ];
}

function purchases() {
  return [{ id: 10, planta_id: 7, proveedor_id: 1, fecha: "2026-09-02", kg: 1000, importe: 13000 }];
}

function inRange(fecha, start, end) {
  return String(fecha) >= String(start) && String(fecha) <= String(end);
}

function fakeClient() {
  return {
    async query(sql, params) {
      const text = String(sql);
      const values = params || [];
      if (/\b(INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP)\b/i.test(text)) {
        throw new Error("write inesperado");
      }
      if (text.includes("arr.compras_proveedores")) return { rows: providers() };
      if (text.includes("arr.compras_documentos")) return { rows: [] };
      if (text.includes("arr.compras_hg")) return { rows: [{ id: 4, planta_id: 7, fecha: "2026-09-02", hg_kilos: 10 }] };
      if (text.includes("arr.compras_flete_tarifas")) {
        return { rows: [{ id: 8, planta_id: 7, proveedor_id: 1, year: 2026, month: 9, tarifa: 2 }] };
      }
      if (/FROM arr\.compras\b/.test(text) && text.includes("fecha >=")) {
        return { rows: purchases().filter((row) => inRange(row.fecha, values[1], values[2])) };
      }
      if (/FROM arr\.compras\b/.test(text)) return { rows: [] };
      if (text.includes("ventas_diarias_cliente")) {
        return {
          rows: [
            { fecha: "2026-09-02", cliente_norm: "CLIENTE", canal: "CASA", kg: 5000 },
            { fecha: "2026-09-02", cliente_norm: "CLIENTE", canal: "COMISIONISTA", kg: 5000 },
          ],
        };
      }
      if (text.includes("descuento_por_kilo_diario_provincia")) {
        return { rows: [{ plant_code: "Puebla", fecha: "2026-09-02", descuento_por_kg: -0.4 }] };
      }
      return { rows: [] };
    },
  };
}

function liveOpts(range, plants) {
  return {
    year: 2026,
    month: 9,
    range,
    corteYmd: "2026-09-03",
    todayYmd: "2026-09-28",
    plants,
    projection: projectionFor("Puebla"),
    loadPrecio: async (key) => {
      if (key !== "Puebla" && key !== "Acapulco") return [];
      return [{ fecha: "2026-09-01", precio: 20.5 }, { fecha: "2026-09-04", precio: 20.7 }];
    },
    gastosForMonth: async () => ({
      rows: [
        { plant_code: "Puebla", empresa: "GT Puebla", corporativos: CORP, operativos: OPER },
        { plant_code: "Acapulco", empresa: "Acapulco", corporativos: CORP, operativos: OPER },
      ],
    }),
  };
}

test("el rango no cambia el cierre del mes seleccionado", async () => {
  const plant = { nombre: "GT Puebla", canon: "Puebla", provinciaPlantCode: "Puebla", clave: "E1", plantaId: 7 };
  const closes = [];
  const lengths = [];
  for (const range of ["1m", "5d", "3m"]) {
    const result = await grafica.loadLiveGrafica(fakeClient(), liveOpts(range, [plant]));
    closes.push(result.month_close);
    lengths.push(result.points.length);
  }
  assert.deepEqual(closes[1], closes[0]);
  assert.deepEqual(closes[2], closes[0]);
  assert.notEqual(lengths[1], lengths[0]);
  assert.ok(lengths[2] > lengths[0]);
  assert.equal(closes[0].label, "CIERRE PROYECTADO");
});

function totalRow(ws) {
  for (let row = 1; row <= 90; row += 1) {
    if (ws.getCell(row, 1).value === "TOTAL MES") return row;
  }
  throw new Error("sin TOTAL MES");
}

test("cierre de planta iguala TOTAL MES B, AF y AE", async () => {
  const built = await buildPlantOracle({
    corte: CORTE,
    costoAnterior: null,
    tarifa: 2,
    captured: { "2026-09-02": { casa: 5, com: 5 } },
    cdPrimary: { "2026-09-02": -0.4 },
  });
  const monthClose = grafica.buildMonthClose(built.series.points, { year: 2026, month: 9 });
  const row = totalRow(built.ws);
  assert.equal(monthClose.complete, true);
  close(monthClose.venta_kg, valueAt(built.wb, built.ws, row, 2), "TOTAL MES B");
  close(monthClose.resultado_mxn, valueAt(built.wb, built.ws, row, 32), "TOTAL MES AF");
  close(monthClose.resultado_per_kg, valueAt(built.wb, built.ws, row, 31), "TOTAL MES AE");
  const real = built.series.points.filter((point) => point.estado === "real").reduce((sum, point) => sum + point.resultado_mxn, 0);
  const projected = built.series.points.filter((point) => point.estado === "proyectado").reduce((sum, point) => sum + point.resultado_mxn, 0);
  close(monthClose.real_mxn, real, "AF real");
  close(monthClose.projected_mxn, projected, "AF proyectado");
});

test("cierre Provincia suma AF diario y no promedia AE", async () => {
  const plants = [
    { name: "Puebla", captured: { "2026-09-02": { casa: 5, com: 5 } } },
    { name: "Acapulco", captured: { "2026-09-02": { casa: 3, com: 2 } } },
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
      tarifa: 2,
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
  const provinceWs = igf.fillIgfDiarioProvincia(provinciaWb, {
    year: 2026,
    month: 9,
    plantSheets: plants.map((plant) => `IGF Diario ${plant.name}`),
  });
  const province = grafica.buildProvinceMonth(built.map((item, index) => ({ ...item.series, plant: plants[index].name })));
  const monthClose = grafica.buildMonthClose(province.points, { year: 2026, month: 9 });
  const row = totalRow(provinceWs);
  assert.equal(monthClose.complete, true);
  close(monthClose.venta_kg, valueAt(provinciaWb, provinceWs, row, 2), "Provincia B");
  close(monthClose.resultado_mxn, valueAt(provinciaWb, provinceWs, row, 32), "Provincia AF");
  close(monthClose.resultado_per_kg, valueAt(provinciaWb, provinceWs, row, 31), "Provincia AE");
  const averaged = province.points.reduce((sum, point) => sum + point.resultado_per_kg, 0) / province.points.length;
  assert.ok(Math.abs(monthClose.resultado_per_kg - averaged) > 1e-6);
});

test("la gráfica conserva 054-R3 y no escribe ni llama OpenAI", () => {
  assert.match(MODAL_SRC, /línea de cero/);
  assert.match(MODAL_SRC, /Resultado/);
  assert.match(MODAL_SRC, /Resultado\/kg/);
  assert.match(MODAL_SRC, /Real/);
  assert.match(MODAL_SRC, /Proyectado/);
  assert.match(MODAL_SRC, /chart\.trend\.xFirst/);
  assert.match(MODAL_SRC, /chart\.trend\.xLast/);
  assert.match(MODAL_SRC, /Descargar Excel/);
  assert.match(MODAL_SRC, /Top 10 nuevos/);
  assert.match(MODAL_SRC, /Sin rentabilidad calculable para este periodo\./);
  assert.match(MODAL_SRC, /month_close\.label/);
  assert.match(MODAL_SRC, /Cobertura incompleta/);
  assert.match(MODAL_SRC, /Real \+ proyectado/);
  assert.match(API_SRC, /month_close\?:/);
  assert.match(GRAFICA_SRC, /loadMonthReadOnly/);
  assert.doesNotMatch(GRAFICA_SRC, /require\("exceljs"\)/);
  assert.doesNotMatch(GRAFICA_SRC, /require\(["']openai|api\.openai|OPENAI_API/);
  assert.doesNotMatch(GRAFICA_SRC, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|CREATE TABLE|ALTER TABLE/);
  assert.doesNotMatch(GRAFICA_SRC, /ensureRequiredProviders/);
  const start = SERVER_SRC.indexOf('app.get("/api/dashboard/igf-diario-grafica"');
  const gate = SERVER_SRC.slice(start, start + 2500);
  assert.ok(gate.indexOf("igfDiarioTodasRequestBlock(req)") < gate.indexOf("pool.connect()"));
  assert.doesNotMatch(MODAL_SRC, /Math\.max\(0/);
});
