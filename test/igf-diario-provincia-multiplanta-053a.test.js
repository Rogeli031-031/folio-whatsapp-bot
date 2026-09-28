"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const forecast = require("../lib/dashboard-arr-forecast");

const ROOT = path.join(__dirname, "..");
const LIB = fs.readFileSync(path.join(ROOT, "lib", "dashboard-arr-forecast.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");

const PLANTS = ["IGF Diario Puebla", "IGF Diario Acapulco", "IGF Diario Tehuacán"];

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
    else if (!quote && depth === 0 && text.startsWith(op, i)) {
      found = i;
      if (op.length > 1) i += op.length - 1;
    }
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
      if (depth === 0 && i < s.length - 1) {
        wraps = false;
        break;
      }
    }
    if (!wraps || depth !== 0) break;
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
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof value === "object" && value.formula) return evalFormula(wb, ws, value.formula, stack);
    return null;
  } finally {
    stack.delete(key);
  }
}

function evalFormula(wb, ws, expr, stack = new Set()) {
  const text = stripParens(String(expr).trim().replace(/^=/, ""));
  if (text === '""') return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const xref = text.match(/^(?:'([^']+)'|([^'!]+))!\$?([A-Z]+)\$?(\d+)$/);
  if (xref) {
    const sheet = wb.getWorksheet(xref[1] || xref[2]);
    return cellNumber(wb, sheet, Number(xref[4]), colIndex(xref[3]), stack);
  }
  const local = text.match(/^\$?([A-Z]+)\$?(\d+)$/);
  if (local) return cellNumber(wb, ws, Number(local[2]), colIndex(local[1]), stack);
  const call = ["IF", "AND", "OR", "NOT", "ISNUMBER", "COUNT", "SUM"].find((name) => matchCall(text, name) != null);
  if (call === "IF") {
    const [cond, yes, no] = splitArgs(matchCall(text, "IF"));
    return evalFormula(wb, ws, cond, stack)
      ? evalFormula(wb, ws, yes == null ? '""' : yes, stack)
      : evalFormula(wb, ws, no == null ? '""' : no, stack);
  }
  if (call === "AND") return splitArgs(matchCall(text, "AND")).every((part) => evalFormula(wb, ws, part, stack));
  if (call === "OR") return splitArgs(matchCall(text, "OR")).some((part) => evalFormula(wb, ws, part, stack));
  if (call === "NOT") return !evalFormula(wb, ws, matchCall(text, "NOT"), stack);
  if (call === "ISNUMBER") {
    const n = evalFormula(wb, ws, matchCall(text, "ISNUMBER"), stack);
    return typeof n === "number" && Number.isFinite(n);
  }
  if (call === "COUNT" || call === "SUM") {
    const nums = splitArgs(matchCall(text, call))
      .map((part) => evalFormula(wb, ws, part, stack))
      .filter((n) => typeof n === "number");
    return call === "COUNT" ? nums.length : nums.reduce((sum, n) => sum + n, 0);
  }
  for (const op of ["<>", ">=", "<=", ">", "<", "=", "+", "-", "/", "*"]) {
    const parts = splitOp(text, op);
    if (!parts) continue;
    const left = evalFormula(wb, ws, parts[0], stack);
    const right = evalFormula(wb, ws, parts[1], stack);
    if (op === "<>") return left !== right;
    if (op === ">=") return typeof left === "number" && typeof right === "number" && left >= right;
    if (op === "<=") return typeof left === "number" && typeof right === "number" && left <= right;
    if (op === ">") return typeof left === "number" && typeof right === "number" && left > right;
    if (op === "<") return typeof left === "number" && typeof right === "number" && left < right;
    if (op === "=") return left === right;
    if (typeof left !== "number" || typeof right !== "number") return undefined;
    if (op === "+") return left + right;
    if (op === "-") return left - right;
    if (op === "/") return right === 0 ? undefined : left / right;
    return left * right;
  }
  return undefined;
}

function close(actual, expected, label) {
  assert.equal(typeof actual, "number", `${label} no es número: ${actual}`);
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} ≠ ${expected}`);
}

function putDay(ws, row, metrics) {
  const cols = { B: 2, D: 4, F: 6, G: 7, M: 13, T: 20, X: 24, AC: 29, AF: 32 };
  for (const [letter, col] of Object.entries(cols)) {
    if (Object.prototype.hasOwnProperty.call(metrics, letter)) ws.getCell(row, col).value = metrics[letter];
  }
}

function provinceBook() {
  const wb = new ExcelJS.Workbook();
  const puebla = wb.addWorksheet("IGF Diario Puebla");
  const acapulco = wb.addWorksheet("IGF Diario Acapulco");
  const tehuacan = wb.addWorksheet("IGF Diario Tehuacán");
  puebla.getCell(3, 13).value = 25000;
  puebla.getCell(3, 20).value = 8000;
  acapulco.getCell(3, 13).value = 90000;
  acapulco.getCell(3, 20).value = 42000;
  tehuacan.getCell(3, 13).value = 12000;
  tehuacan.getCell(3, 20).value = 6000;
  putDay(puebla, 6, { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, X: -1000, AC: 0.4, AF: 50000 });
  putDay(acapulco, 6, { B: 30000, D: 660000, F: 14, G: 2, M: 2, T: 1.5, X: -3000, AC: 0.2, AF: 90000 });
  putDay(puebla, 7, { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, X: -1000, AC: 0.4, AF: 50000 });
  putDay(acapulco, 7, { B: 30000, D: 660000, F: 14, G: 2, M: 2, T: 1.5, X: -3000, AC: 0.2, AF: 90000 });
  putDay(tehuacan, 7, { B: 20000, D: 500000, F: 10, G: 0.5, M: 0.5, T: 1, X: -2000, AC: 0.1, AF: 40000 });
  const user = wb.addWorksheet("IGF Forecast");
  user.getCell(1, 1).value = "se conserva";
  const ws = igf.fillIgfDiarioProvincia(wb, { year: 2026, month: 9, plantSheets: PLANTS });
  igf.orderIgfSheetsFirst(wb, ["IGF Diario Provincia", ...PLANTS]);
  return { wb, ws };
}

function valueAt(wb, ws, row, col) {
  return evalFormula(wb, ws, formulaOf(ws.getCell(row, col)));
}

test("Provincia pondera venta, precio, costo, flete, corporativo, operativo, HG, C&D y resultado", async () => {
  const { wb, ws } = provinceBook();
  const row = 6;
  const b = formulaOf(ws.getCell(row, 2));
  const c = formulaOf(ws.getCell(row, 3));
  const f = formulaOf(ws.getCell(row, 6));
  const g = formulaOf(ws.getCell(row, 7));
  const m = formulaOf(ws.getCell(row, 13));
  const t = formulaOf(ws.getCell(row, 20));
  const x = formulaOf(ws.getCell(row, 24));
  const y = formulaOf(ws.getCell(row, 25));
  const ac = formulaOf(ws.getCell(row, 29));
  const af = formulaOf(ws.getCell(row, 32));
  const ae = formulaOf(ws.getCell(row, 31));
  assert.match(b, /SUM\('IGF Diario Puebla'!B6,'IGF Diario Acapulco'!B6,'IGF Diario Tehuacán'!B6\)/);
  assert.match(c, /D6\/B6/);
  assert.doesNotMatch(c, /'IGF Diario Puebla'!C6/);
  assert.match(f, /'IGF Diario Puebla'!F6\*'IGF Diario Puebla'!B6/);
  assert.match(f, /'IGF Diario Acapulco'!F6\*'IGF Diario Acapulco'!B6/);
  assert.match(f, /\/B6/);
  assert.doesNotMatch(f, /SUM\('IGF Diario Puebla'!F6,'IGF Diario Acapulco'!F6/);
  assert.match(g, /'IGF Diario Puebla'!G6\*'IGF Diario Puebla'!B6/);
  assert.match(m, /'IGF Diario Puebla'!M6\*'IGF Diario Puebla'!B6/);
  assert.match(m, /'IGF Diario Acapulco'!M6\*'IGF Diario Acapulco'!B6/);
  assert.doesNotMatch(m, /SUM\('IGF Diario Puebla'!M6,'IGF Diario Acapulco'!M6/);
  assert.match(t, /'IGF Diario Puebla'!T6\*'IGF Diario Puebla'!B6/);
  assert.match(x, /SUM\('IGF Diario Puebla'!X6,'IGF Diario Acapulco'!X6,'IGF Diario Tehuacán'!X6\)/);
  assert.match(y, /X6\/B6/);
  assert.match(ac, /'IGF Diario Puebla'!AC6\*'IGF Diario Puebla'!B6/);
  assert.match(af, /SUM\('IGF Diario Puebla'!AF6,'IGF Diario Acapulco'!AF6,'IGF Diario Tehuacán'!AF6\)/);
  assert.match(ae, /AF6\/B6/);
  assert.match(formulaOf(ws.getCell(row, 8)), /C6-F6-G6/);
  assert.match(formulaOf(ws.getCell(row, 15)), /H6-M6/);
  assert.match(formulaOf(ws.getCell(row, 22)), /O6-T6/);
  assert.match(formulaOf(ws.getCell(row, 27)), /V6-Y6/);

  close(valueAt(wb, ws, row, 2), 40000, "venta");
  close(valueAt(wb, ws, row, 4), 860000, "ingreso");
  close(valueAt(wb, ws, row, 3), 21.5, "precio ponderado");
  assert.ok(Math.abs(valueAt(wb, ws, row, 3) - 21) > 0.1);
  close(valueAt(wb, ws, row, 6), 13.5, "costo ponderado");
  close(valueAt(wb, ws, row, 7), 1.75, "flete ponderado");
  close(valueAt(wb, ws, row, 8), 6.25, "margen bruto");
  close(valueAt(wb, ws, row, 13), 1.75, "corporativo ponderado");
  close(valueAt(wb, ws, row, 15), 4.5, "margen neto");
  close(valueAt(wb, ws, row, 20), 1.25, "operativo ponderado");
  close(valueAt(wb, ws, row, 22), 3.25, "sobrante");
  close(valueAt(wb, ws, row, 24), -4000, "HG importe");
  close(valueAt(wb, ws, row, 25), -0.1, "HG por kg");
  close(valueAt(wb, ws, row, 27), 3.35, "AA");
  close(valueAt(wb, ws, row, 29), 0.25, "C&D ponderado");
  close(valueAt(wb, ws, row, 32), 140000, "resultado importe");
  close(valueAt(wb, ws, row, 31), 3.5, "resultado por kg");
  assert.ok(Math.abs(valueAt(wb, ws, row, 31) - (3.35 + 0.25)) > 0.01);

  close(valueAt(wb, ws, 7, 2), 60000, "venta 3 plantas");
  close(valueAt(wb, ws, 7, 3), 1360000 / 60000, "precio 3 plantas");
  close(valueAt(wb, ws, 7, 6), 740000 / 60000, "costo 3 plantas");
  close(valueAt(wb, ws, 7, 7), 80000 / 60000, "flete 3 plantas");
  close(valueAt(wb, ws, 7, 13), 80000 / 60000, "corporativo 3 plantas");
  close(valueAt(wb, ws, 7, 20), 70000 / 60000, "operativo 3 plantas");
  close(valueAt(wb, ws, 7, 24), -6000, "HG 3 plantas");
  close(valueAt(wb, ws, 7, 29), 0.2, "C&D 3 plantas");
  close(valueAt(wb, ws, 7, 32), 180000, "resultado 3 plantas");
  close(valueAt(wb, ws, 7, 31), 3, "resultado kg 3 plantas");

  close(valueAt(wb, ws, 3, 13), 127000, "corporativo mensual");
  close(valueAt(wb, ws, 3, 20), 56000, "operativo mensual");
  assert.match(formulaOf(ws.getCell(3, 13)), /SUM\('IGF Diario Puebla'!M3,'IGF Diario Acapulco'!M3,'IGF Diario Tehuacán'!M3\)/);
  assert.match(formulaOf(ws.getCell(3, 20)), /SUM\('IGF Diario Puebla'!T3,'IGF Diario Acapulco'!T3,'IGF Diario Tehuacán'!T3\)/);

  const sunday = formulaOf(ws.getCell(11, 13));
  assert.equal(sunday, "");
  assert.match(formulaOf(ws.getCell(11, 15)), /H11/);
  assert.doesNotMatch(formulaOf(ws.getCell(11, 15)), /H11-M11/);

  const semana = formulaOf(ws.getCell(12, 3));
  assert.match(semana, /C6\*B6/);
  assert.match(semana, /C7\*B7/);
  assert.doesNotMatch(semana, /IGF Diario Puebla/);
  let totalRow = null;
  for (let r = 6; r <= ws.rowCount; r += 1) {
    if (ws.getCell(r, 1).value === "TOTAL MES") totalRow = r;
  }
  assert.ok(totalRow);
  const totalPrecio = formulaOf(ws.getCell(totalRow, 3));
  assert.match(totalPrecio, /C6\*B6/);
  assert.doesNotMatch(totalPrecio, /IGF Diario Puebla/);
  assert.match(formulaOf(ws.getCell(totalRow, 31)), /AF\d+\/B\d+/);

  const raw = await wb.xlsx.writeBuffer();
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(raw);
  const re = again.getWorksheet("IGF Diario Provincia");
  assert.equal(again.worksheets[0].name, "IGF Diario Provincia");
  assert.equal(again.worksheets.filter((sheet) => sheet.state !== "hidden").map((sheet) => sheet.name).join("|"), [
    "IGF Diario Provincia",
    "IGF Diario Puebla",
    "IGF Diario Acapulco",
    "IGF Diario Tehuacán",
    "IGF Forecast",
  ].join("|"));
  close(evalFormula(again, re, formulaOf(re.getCell(6, 3))), 21.5, "precio reabierto");
  close(evalFormula(again, re, formulaOf(re.getCell(6, 6))), 13.5, "costo reabierto");
  close(evalFormula(again, re, formulaOf(re.getCell(6, 13))), 1.75, "corporativo reabierto");
  close(evalFormula(again, re, formulaOf(re.getCell(6, 32))), 140000, "resultado reabierto");
  assert.equal(again.worksheets.length > 0, true);
});

function supportBook(names, sheetLabel) {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet(names.venta);
  const com = wb.addWorksheet(names.comisiones);
  const precio = wb.addWorksheet(names.precio);
  const compras = wb.addWorksheet(names.compras);
  venta.getCell(1, 1).value = "DÍA";
  venta.getCell(1, 2).value = "Otra";
  venta.getCell(1, 10).value = "Querétaro\nCASA";
  venta.getCell(1, 11).value = "Querétaro\nCOMISIONISTA";
  com.getCell(1, 1).value = "DÍA";
  com.getCell(1, 2).value = "Querétaro";
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 20).value = "HG EN KILOS";
  compras.getCell(5, 20).value = "IMPORTE";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  for (let day = 1; day <= 30; day += 1) {
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 10).value = 8;
    venta.getCell(day + 1, 11).value = 1;
    com.getCell(day + 1, 1).value = day;
    com.getCell(day + 1, 2).value = -0.4;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    precio.getCell(day + 1, 2).value = 19.5;
    compras.getCell(day + 5, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    compras.getCell(day + 5, 15).value = 11.2;
    compras.getCell(day + 5, 20).value = -80;
    compras.getCell(day + 5, 36).value = 1.23;
  }
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    sheetLabel,
    humanName: "Querétaro",
    supports: names.venta === "Provincia Venta Diaria" ? undefined : names,
    plantEquivalent: (label) => forecast.plantsEquivalent(label, "Queretaro"),
    corporativos: 1034293,
    operativos: 880000,
    corteYmd: "2026-09-25",
  });
  return { wb, ws };
}

function normalizeSupports(formula) {
  return String(formula)
    .replace(/'~1 Venta'/g, "'Provincia Venta Diaria'")
    .replace(/'~1 Comis'/g, "'Provincia Comisiones'")
    .replace(/'~1 Precio'/g, "PRECIO")
    .replace(/'~1 Compras'/g, "'CONTROL DE COMPRAS'");
}

test("la hoja de Querétaro dentro de Todas coincide con su export individual", () => {
  const individual = supportBook({
    venta: "Provincia Venta Diaria",
    comisiones: "Provincia Comisiones",
    precio: "PRECIO",
    compras: "CONTROL DE COMPRAS",
  }, "Queretaro");
  const todas = supportBook({
    venta: "~1 Venta",
    comisiones: "~1 Comis",
    precio: "~1 Precio",
    compras: "~1 Compras",
  }, "Querétaro");
  assert.equal(individual.ws.name, "IGF Diario Queretaro");
  assert.equal(todas.ws.name, "IGF Diario Querétaro");
  assert.equal(todas.wb.getWorksheet("IGF Diario Queretaro"), undefined);
  for (const day of [1, 24, 25, 30]) {
    const row = day <= 6 ? 5 + day : day <= 13 ? 7 + day : day <= 20 ? 8 + day : day <= 27 ? 11 + day : 13 + day;
    for (const col of [2, 3, 4, 6, 7, 8, 13, 15, 20, 24, 29, 31, 32]) {
      assert.equal(
        normalizeSupports(formulaOf(todas.ws.getCell(row, col))),
        formulaOf(individual.ws.getCell(row, col)),
        `día ${day} col ${col}`
      );
    }
  }
  assert.match(formulaOf(individual.ws.getCell(11 + 24, 6)), /O28/);
  assert.match(formulaOf(individual.ws.getCell(11 + 25, 6)), /O30/);
  assert.doesNotMatch(formulaOf(individual.ws.getCell(11 + 25, 6)), /O28/);
  const individualSlice = LIB.slice(LIB.indexOf("if (includeIgfDiario) {"), LIB.indexOf("const pronosticoMeta"));
  assert.match(individualSlice, /fillIgfDiarioPuebla/);
  assert.doesNotMatch(individualSlice, /supports/);
  assert.match(LIB, /const includeIgfDiario = Boolean\(exportPlant\)/);
  assert.match(LIB, /if \(!exportPlant\) \{\s*await appendIgfDiarioTodas/);
});

test("Provincia agrega el corte de cada hoja y no inventa otro pronóstico", () => {
  const { wb, ws } = supportBook({
    venta: "Provincia Venta Diaria",
    comisiones: "Provincia Comisiones",
    precio: "PRECIO",
    compras: "CONTROL DE COMPRAS",
  }, "Puebla");
  assert.equal(ws.name, "IGF Diario Puebla");
  const before = 11 + 24;
  const after = 11 + 25;
  assert.match(formulaOf(ws.getCell(before, 6)), /CONTROL DE COMPRAS'!O/);
  assert.match(formulaOf(ws.getCell(after, 6)), /CONTROL DE COMPRAS'!O30/);
  const prov = igf.fillIgfDiarioProvincia(wb, {
    year: 2026,
    month: 9,
    plantSheets: ["IGF Diario Puebla"],
  });
  const provBefore = formulaOf(prov.getCell(before, 6));
  const provAfter = formulaOf(prov.getCell(after, 6));
  assert.match(provBefore, new RegExp(`'IGF Diario Puebla'!F${before}`));
  assert.match(provAfter, new RegExp(`'IGF Diario Puebla'!F${after}`));
  assert.doesNotMatch(provBefore, /CONTROL DE COMPRAS|PRECIO|Provincia Venta/);
  assert.doesNotMatch(provAfter, /CONTROL DE COMPRAS|PRECIO|Provincia Venta/);
  assert.match(formulaOf(prov.getCell(after, 2)), /'IGF Diario Puebla'!B/);
});

test("catálogo deduplica Querétaro y Tehuacán por acento", async () => {
  const rows = [
    { id: 1, nombre: "Puebla", clave: "Puebla" },
    { id: 2, nombre: "Acapulco", clave: "Acapulco" },
    { id: 3, nombre: "Tehuacan", clave: "Tehuacan" },
    { id: 4, nombre: "Tehuacán", clave: "Tehuacan" },
    { id: 5, nombre: "Queretaro", clave: "Queretaro" },
    { id: 6, nombre: "Querétaro", clave: "Queretaro" },
    { id: 7, nombre: "San Luis", clave: "San Luis" },
    { id: 8, nombre: "Morelos", clave: "Morelos" },
    { id: 9, nombre: "Corporativo", clave: "CORP" },
  ];
  const client = {
    async query(sql) {
      const text = String(sql);
      if (text.includes("public.plantas")) return { rows };
      if (text.includes("compromiso_lines")) return { rows: [] };
      if (text.includes("provincia_plants")) {
        return {
          rows: rows
            .filter((row) => row.nombre !== "Corporativo")
            .map((row) => ({ plant_code: row.nombre })),
        };
      }
      return { rows: [] };
    },
  };
  const plants = await forecast.listIgfDiarioProvinciaPlants(client, 2026, 9);
  const names = plants.map((row) => row.nombre);
  assert.deepEqual(names, ["Puebla", "Tehuacán", "Acapulco", "Querétaro", "San Luis", "Morelos"]);
  const folds = names.map((name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
  assert.equal(new Set(folds).size, folds.length);
  assert.equal(names.includes("Queretaro"), false);
  assert.equal(names.includes("Tehuacan"), false);
});

test("Todas arma un solo libro y deja IGF Diario Provincia primero", async () => {
  const { wb } = provinceBook();
  const hidden = wb.addWorksheet("~1 Venta");
  hidden.state = "hidden";
  igf.orderIgfSheetsFirst(wb, ["IGF Diario Provincia", ...PLANTS]);
  assert.equal(wb.worksheets[0].name, "IGF Diario Provincia");
  assert.equal(wb.worksheets[1].name, "IGF Diario Puebla");
  assert.equal(wb.worksheets[2].name, "IGF Diario Acapulco");
  assert.equal(wb.worksheets[3].name, "IGF Diario Tehuacán");
  assert.notEqual(wb.getWorksheet("IGF Forecast").state, "hidden");
  assert.equal(hidden.state, "hidden");
  assert.match(SERVER, /igf_diario_todas/);
  assert.match(SERVER, /listIgfDiarioProvinciaPlants/);
  assert.match(SERVER, /loadPrecioDiario\(client, plantCode, year, month\)/);
  assert.match(SERVER, /Selecciona una planta para descargar el Excel Forecast/);
  const gated = SERVER.slice(SERVER.indexOf("if (requirePlant)"), SERVER.indexOf("const excelIgfOpts"));
  assert.match(gated, /loadPrecioDiario/);
  const ui = UI.slice(UI.indexOf("<span>Planta:</span>"), UI.indexOf("<span>Planta:</span>") + 2200);
  assert.match(ui, /const todas = !plantaFilter/);
  assert.match(ui, /!todas,\s*todas/);
  assert.match(LIB, /hidden\.state = "hidden"/);
  assert.equal((LIB.match(/xlsx\.writeBuffer\(/g) || []).length, 1);
});
