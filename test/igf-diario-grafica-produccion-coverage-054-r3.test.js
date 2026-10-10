"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const forecast = require("../lib/dashboard-arr-forecast");
const comprasExcel = require("../lib/compras-excel");
const comprasDash = require("../lib/compras-dashboard");
const igf = require("../lib/igf-diario-puebla");
const grafica = require("../lib/igf-diario-grafica");

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


const ROOT = path.join(__dirname, "..");
const GRAFICA_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
const MODAL_SRC = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const CORTE = "2026-09-03";
const CORP = 206858.6;
const OPER = 59970.36;

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

function inRange(fecha, start, end) {
  return fecha >= start && fecha <= end;
}

function providers() {
  return [
    { id: 1, planta_id: 7, nombre: "PEMEX TUXPAN", activo: true, orden: 0 },
    { id: 2, planta_id: 7, nombre: "TOMZA TUXPAN", activo: true, orden: 1 },
    { id: 3, planta_id: 7, nombre: "TOMZA TEPEJI", activo: true, orden: 2 },
  ];
}

function purchases() {
  return [
    { id: 10, planta_id: 7, proveedor_id: 1, fecha: "2026-09-02", kg: 1000, importe: 13000 },
  ];
}

function hgRows(include) {
  if (!include) return [];
  return [{ id: 4, planta_id: 7, fecha: "2026-09-02", hg_kilos: 10 }];
}

function tarifas() {
  return [{ id: 8, planta_id: 7, proveedor_id: 1, year: 2026, month: 9, tarifa: 2 }];
}

function fakeCompras(opts = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      const text = String(sql);
      const values = params || [];
      calls.push({ sql: text, params: values });
      if (/\b(INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP)\b/i.test(text)) {
        throw new Error(`write inesperado: ${text.slice(0, 80)}`);
      }
      if (opts.failHg && text.includes("arr.compras_hg")) {
        const error = new Error("relation arr.compras_hg does not exist");
        error.code = "42P01";
        throw error;
      }
      if (text.includes("arr.compras_proveedores")) return { rows: providers().map((row) => ({ ...row })) };
      if (text.includes("arr.compras_documentos")) return { rows: [] };
      if (text.includes("arr.compras_hg")) {
        return { rows: hgRows(opts.hg !== false).filter((row) => !values[1] || inRange(row.fecha, values[1], values[2])) };
      }
      if (text.includes("arr.compras_flete_tarifas")) return { rows: tarifas() };
      if (/FROM arr\.compras\b/.test(text) && text.includes("fecha >=")) {
        return { rows: purchases().filter((row) => inRange(row.fecha, values[1], values[2])) };
      }
      if (/FROM arr\.compras\b/.test(text)) return { rows: [] };
      if (text.includes("ventas_diarias_cliente") && text.includes("cliente_norm")) {
        return { rows: opts.sales || [] };
      }
      if (text.includes("descuentos_diarios_cliente") && text.includes("cliente_norm")) return { rows: [] };
      if (text.includes("descuento_por_kilo_diario_provincia")) {
        return { rows: opts.cd || [{ plant_code: "Puebla", fecha: "2026-09-02", descuento_por_kg: -0.4 }] };
      }
      return { rows: [] };
    },
  };
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

function rowForFecha(ws, fecha) {
  for (let row = 1; row <= 80; row += 1) {
    const value = ws.getCell(row, 1).value;
    if (value instanceof Date && value.toISOString().slice(0, 10) === fecha) return row;
  }
  throw new Error(`sin fila ${fecha}`);
}

async function parityBundle(plantName) {
  const client = fakeCompras();
  const payload = await comprasDash.loadMonthReadOnly(client, 7, 2026, 9);
  const writable = await comprasDash.loadMonth(client, 7, 2026, 9);
  const readResolved = comprasExcel.resolveControlComprasDays(payload, CORTE);
  const writeResolved = comprasExcel.resolveControlComprasDays(writable, CORTE);
  const plant = plantName;
  const projection = projectionFor(plant);
  const captured = {
    "2026-09-01": { casa: 6, com: 4 },
    "2026-09-02": { casa: 5, com: 5 },
    "2026-09-03": { casa: 4, com: 5 },
  };
  const days = [];
  for (let day = 1; day <= 30; day += 1) days.push({ day, fecha: ymd(day) });
  const wb = new ExcelJS.Workbook();
  const ventaTon = days.map((day) => ({ day: day.day, fecha: day.fecha, byPlant: { [plant]: null } }));
  forecast.hojaA(wb, {
    plants: [plant], byDate: ventaTon, forecastByPlant: new Map(), cutoffDay: 4,
  }, 2026, 9, 0, "", "", {
    ventaCanal: { byDate: days.map((day) => ({
      day: day.day,
      fecha: day.fecha,
      byPlant: { [plant]: { CASA: captured[day.fecha] ? captured[day.fecha].casa : null, COMISIONISTA: captured[day.fecha] ? captured[day.fecha].com : null } },
    })) },
    pronosticoProjection: projection,
    omitTotProvincia: true,
  });
  const cdPrimary = { "2026-09-01": -0.55, "2026-09-02": -0.4, "2026-09-03": -0.99 };
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
  await comprasExcel.appendComprasWorksheet(wb, payload, { plantName: plant, corteYmd: CORTE });
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: CORTE,
    corporativos: CORP,
    operativos: OPER,
    humanName: plant,
    plantEquivalent: (name) => String(name || "").toUpperCase().includes(String(plant).toUpperCase()),
  });
  const casaTon = new Map(Object.entries(captured).map(([fecha, pair]) => [fecha, pair.casa]));
  const comTon = new Map(Object.entries(captured).map(([fecha, pair]) => [fecha, pair.com]));
  const series = grafica.materializePlantMonth({
    year: 2026,
    month: 9,
    plant,
    corteYmd: CORTE,
    project: true,
    projection,
    corporativos: CORP,
    operativos: OPER,
    precioRows: [{ fecha: "2026-09-01", precio: 20.5 }, { fecha: "2026-09-04", precio: 20.7 }],
    casaTon,
    comTon,
    cdByFecha: new Map(Object.entries(cdPrimary)),
    comprasByFecha: new Map(readResolved.map((row) => [row.fecha, row])),
    skipDay1Fallback: true,
  });
  return { payload, writable, readResolved, writeResolved, wb, ws, series, calls: client.calls };
}

test("loadMonth y la variante read-only comparten F, G y X", async () => {
  const built = await parityBundle("Puebla");
  assert.equal(built.calls.some((call) => /\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(call.sql)), false);
  for (const fecha of ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]) {
    const left = built.readResolved.find((row) => row.fecha === fecha);
    const right = built.writeResolved.find((row) => row.fecha === fecha);
    same(left.costoKg, right.costoKg, `${fecha} F`);
    same(left.fleteKg, right.fleteKg, `${fecha} G`);
    same(left.hgImporte, right.hgImporte, `${fecha} X`);
  }
  const day1 = built.readResolved.find((row) => row.fecha === "2026-09-01");
  const day2 = built.readResolved.find((row) => row.fecha === "2026-09-02");
  close(day1.costoKg, day2.costoKg, "día 1 hereda costo");
  close(day2.fleteKg, 2, "flete del día con compra");
  close(day2.hgImporte, -150, "HG del día con compra");
});

test("paridad Excel contra el payload productivo en real, corte y día posterior", async () => {
  const built = await parityBundle("Puebla");
  for (const fecha of ["2026-09-02", "2026-09-03", "2026-09-04"]) {
    const point = built.series.points.find((row) => row.fecha === fecha);
    const resolved = built.series.resolved.find((row) => row.fecha === fecha);
    const carried = grafica.resolveCarry(built.series.resolved, CORTE, null);
    const input = carried.find((row) => row.fecha === fecha);
    const row = rowForFecha(built.ws, fecha);
    same(point.venta_kg, valueAt(built.wb, built.ws, row, 2), `${fecha} B`);
    same(resolved.precio, valueAt(built.wb, built.ws, row, 3), `${fecha} C`);
    same(input.costoKg, valueAt(built.wb, built.ws, row, 6), `${fecha} F`);
    same(input.fleteKg, valueAt(built.wb, built.ws, row, 7), `${fecha} G`);
    same(resolved.hgImporte, valueAt(built.wb, built.ws, row, 24), `${fecha} X`);
    same(resolved.cdKg, valueAt(built.wb, built.ws, row, 29), `${fecha} AC`);
    same(point.resultado_per_kg, valueAt(built.wb, built.ws, row, 31), `${fecha} AE`);
    same(point.resultado_mxn, valueAt(built.wb, built.ws, row, 32), `${fecha} AF`);
  }
  const corte = built.series.points.find((row) => row.fecha === CORTE);
  assert.equal(corte.estado, "proyectado");
  assert.equal(corte.venta_kg, 9000);
});

function livePlant(nombre, canon, code) {
  return { nombre, canon, provinciaPlantCode: code, clave: code === "Puebla" ? "E1" : "E3", plantaId: 7 };
}

function liveOpts(plant, extra = {}) {
  const keys = [];
  return {
    keys,
    opts: {
      year: 2026,
      month: 9,
      range: extra.range || "1m",
      corteYmd: extra.corte || "2026-09-20",
      todayYmd: "2026-09-28",
      plants: [plant],
      projection: projectionFor(plant.canon),
      loadPrecio: async (key) => {
        keys.push(key);
        if (key !== "Puebla" && key !== "Acapulco") return [];
        return [{ fecha: "2026-09-01", precio: 20.5 }, { fecha: "2026-09-04", precio: 20.7 }];
      },
      gastosForMonth: async () => ({
        rows: [
          { plant_code: "Puebla", empresa: "GT Puebla", corporativos: CORP, operativos: OPER },
          { plant_code: "Acapulco", empresa: "Acapulco", corporativos: CORP, operativos: OPER },
        ],
      }),
    },
  };
}

function salesRows() {
  const rows = [];
  for (const day of [1, 2, 4, 10]) {
    rows.push({ fecha: ymd(day), cliente_norm: "CLIENTE", canal: "CASA", kg: 5000 });
    rows.push({ fecha: ymd(day), cliente_norm: "CLIENTE", canal: "COMISIONISTA", kg: 5000 });
  }
  return rows;
}

test("GT Puebla resuelve PRECIO guardado como Puebla y produce AF/AE", async () => {
  const plant = livePlant("GT Puebla", "Puebla", "Puebla");
  const live = liveOpts(plant, { corte: CORTE });
  const client = fakeCompras({ sales: salesRows(), cd: [
    { plant_code: "Puebla", fecha: "2026-09-01", descuento_por_kg: -0.55 },
    { plant_code: "Puebla", fecha: "2026-09-02", descuento_por_kg: -0.4 },
  ] });
  const result = await grafica.loadLiveGrafica(client, live.opts);
  assert.deepEqual([...new Set(live.keys)], ["Puebla"]);
  assert.ok(result.coverage_summary.numeric_points > 0);
  const point = result.points.find((row) => row.fecha === "2026-09-02");
  assert.equal(typeof point.resultado_mxn, "number");
  assert.equal(typeof point.resultado_per_kg, "number");
  assert.equal(point.missing_components.includes("PRECIO"), false);
  assert.equal(point.missing_components.includes("CORPORATIVO"), false);
  assert.equal(point.missing_components.includes("OPERATIVO"), false);
});

test("Acapulco con el shape de loadMonth produce puntos numéricos", async () => {
  const plant = livePlant("Acapulco", "Acapulco", "Acapulco");
  const live = liveOpts(plant, { corte: "2026-09-20" });
  const client = fakeCompras({
    sales: salesRows(),
    cd: [{ plant_code: "Acapulco", fecha: "2026-09-02", descuento_por_kg: -0.4 }],
  });
  const result = await grafica.loadLiveGrafica(client, live.opts);
  assert.deepEqual([...new Set(live.keys)], ["Acapulco"]);
  assert.ok(result.coverage_summary.numeric_points > 0);
  const point = result.points.find((row) => row.fecha === "2026-09-02");
  assert.equal(typeof point.resultado_mxn, "number");
  assert.equal(typeof point.resultado_per_kg, "number");
  assert.ok(result.coverage_summary.total_points > 0);
});

test("HG vacío deja AE/AF null y la cobertura lo cuenta", async () => {
  const plant = livePlant("Acapulco", "Acapulco", "Acapulco");
  const live = liveOpts(plant, { corte: "2026-09-20" });
  const client = fakeCompras({ sales: salesRows(), hg: false, cd: [{ plant_code: "Acapulco", fecha: "2026-09-02", descuento_por_kg: -0.4 }] });
  const result = await grafica.loadLiveGrafica(client, live.opts);
  const point = result.points.find((row) => row.fecha === "2026-09-02");
  assert.equal(point.resultado_mxn, null);
  assert.equal(point.resultado_per_kg, null);
  assert.ok(result.coverage_summary.missing_by_component.HG > 0);
  assert.equal(result.coverage_summary.numeric_points, 0);
  assert.equal(result.coverage_summary.first_missing_date.fecha <= "2026-09-02", true);
});

test("un error SQL de HG rechaza la gráfica y el endpoint no responde 200", async () => {
  const plant = livePlant("Acapulco", "Acapulco", "Acapulco");
  const live = liveOpts(plant);
  await assert.rejects(() => grafica.loadLiveGrafica(fakeCompras({ failHg: true, sales: salesRows() }), live.opts));
  const start = SERVER_SRC.indexOf('app.get("/api/dashboard/igf-diario-grafica"');
  const handler = SERVER_SRC.slice(start, SERVER_SRC.indexOf("app.get(", start + 10));
  assert.match(handler, /res\.status\(500\)\.json\(\{ error: "No se pudo armar la gráfica IGF Diario" \}\)/);
  const responseLine = handler.split(/\r?\n/).find((line) => line.includes("status(500)"));
  assert.doesNotMatch(responseLine, /error\.message/);
  const gate = SERVER_SRC.slice(start, start + 2500);
  assert.ok(gate.indexOf("igfDiarioTodasRequestBlock(req)") < gate.indexOf("pool.connect()"));
});

test("1M y 3M consultan compras por mes y no por día", async () => {
  const plant = livePlant("Acapulco", "Acapulco", "Acapulco");
  const one = fakeCompras({ sales: salesRows() });
  await grafica.loadLiveGrafica(one, liveOpts(plant, { range: "1m" }).opts);
  const monthLoads = one.calls.filter((call) => /FROM arr\.compras\b/.test(call.sql) && call.sql.includes("fecha >="));
  assert.deepEqual(monthLoads.map((call) => call.params[1]), ["2026-09-01"]);
  assert.equal(one.calls.filter((call) => call.sql.includes("arr.compras_hg")).length, 1);
  const threeClient = fakeCompras({ sales: salesRows() });
  const threeOpts = liveOpts(plant, { range: "3m" }).opts;
  threeOpts.plants = [plant, { ...plant, plantaId: 8, nombre: "Acapulco Norte" }];
  await grafica.loadLiveGrafica(threeClient, threeOpts);
  const loads = threeClient.calls.filter((call) => /FROM arr\.compras\b/.test(call.sql) && call.sql.includes("fecha >="));
  const keys = loads.map((call) => `${call.params[0]}|${call.params[1]}`).sort();
  assert.deepEqual(keys, [
    "7|2026-07-01", "7|2026-08-01", "7|2026-09-01",
    "8|2026-07-01", "8|2026-08-01", "8|2026-09-01",
  ]);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(threeClient.calls.some((call) => /\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(call.sql)), false);
  assert.doesNotMatch(GRAFICA_SRC, /ensureRequiredProviders/);
  assert.doesNotMatch(GRAFICA_SRC, /require\("exceljs"\)|require\(["']openai/);
});

test("la zona vacía explica la cobertura y no esconde clientes nuevos", () => {
  assert.match(MODAL_SRC, /Sin rentabilidad calculable para este periodo\./);
  assert.match(MODAL_SRC, /Falta:/);
  assert.match(MODAL_SRC, /días/);
  assert.match(MODAL_SRC, /Clientes nuevos/);
  assert.match(MODAL_SRC, /Top 10 nuevos/);
  assert.match(MODAL_SRC, /useState<Metric>\("mxn"\)/);
  assert.match(MODAL_SRC, /useState<RangeId>\("1m"\)/);
  assert.match(MODAL_SRC, /Descargar Excel/);
  assert.match(GRAFICA_SRC, /coverage_summary/);
  assert.match(GRAFICA_SRC, /loadMonthReadOnly/);
});

