"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");

const LIB = fs.readFileSync(path.join(__dirname, "..", "lib", "igf-diario-puebla.js"), "utf8");
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
  if (xref) return cellNumber(wb, wb.getWorksheet(xref[1] || xref[2]), Number(xref[4]), colIndex(xref[3]), stack);
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

function valueAt(wb, ws, row, col) {
  const formula = formulaOf(ws.getCell(row, col));
  if (!formula) return ws.getCell(row, col).value;
  return evalFormula(wb, ws, formula);
}

function close(actual, expected, label) {
  assert.equal(typeof actual, "number", `${label} no es número: ${actual}`);
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} ≠ ${expected}`);
}

function blank(actual, label) {
  assert.ok(actual == null || actual === "", `${label} debía quedar vacío y dio ${actual}`);
}

const COL = { B: 2, D: 4, F: 6, G: 7, M: 13, T: 20, X: 24, AC: 29, AF: 32 };

function put(ws, row, metrics) {
  for (const [letter, value] of Object.entries(metrics)) {
    if (Object.prototype.hasOwnProperty.call(metrics, letter)) ws.getCell(row, COL[letter]).value = value;
  }
}

function book(days) {
  const wb = new ExcelJS.Workbook();
  const sheets = {
    Puebla: wb.addWorksheet("IGF Diario Puebla"),
    Acapulco: wb.addWorksheet("IGF Diario Acapulco"),
    Tehuacán: wb.addWorksheet("IGF Diario Tehuacán"),
  };
  for (const day of days) {
    for (const [plant, metrics] of Object.entries(day)) {
      if (plant === "row") continue;
      put(sheets[plant], day.row, metrics);
    }
  }
  const ws = igf.fillIgfDiarioProvincia(wb, { year: 2026, month: 9, plantSheets: PLANTS });
  return { wb, ws };
}

test("venta positiva con métrica faltante deja Provincia vacía y no usa cero", () => {
  const { wb, ws } = book([{
    row: 6,
    Puebla: { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, AC: 0.4, X: -1000, AF: 50000 },
    Acapulco: { B: 30000, X: -3000, AF: 90000 },
  }]);
  const f = formulaOf(ws.getCell(6, 6));
  assert.match(f, /NOT\(ISNUMBER\('IGF Diario Acapulco'!F6\)\)/);
  assert.match(f, /'IGF Diario Acapulco'!B6>0/);
  close(valueAt(wb, ws, 6, 2), 40000, "venta");
  blank(valueAt(wb, ws, 6, 6), "costo");
  assert.notEqual(valueAt(wb, ws, 6, 6), 3);
  blank(valueAt(wb, ws, 6, 7), "flete");
  blank(valueAt(wb, ws, 6, 13), "corporativo");
  blank(valueAt(wb, ws, 6, 20), "operativo");
  blank(valueAt(wb, ws, 6, 29), "C&D");
  blank(valueAt(wb, ws, 6, 4), "ingreso");
  blank(valueAt(wb, ws, 6, 3), "precio");
  close(valueAt(wb, ws, 6, 24), -4000, "HG");
  close(valueAt(wb, ws, 6, 32), 140000, "resultado");
  close(valueAt(wb, ws, 6, 31), 3.5, "resultado por kg");
});

test("venta cero o vacía no bloquea la métrica", () => {
  const { wb, ws } = book([{
    row: 6,
    Puebla: { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, AC: 0.4 },
    Acapulco: { B: 0 },
  }]);
  close(valueAt(wb, ws, 6, 2), 10000, "venta");
  close(valueAt(wb, ws, 6, 6), 12, "costo");
  close(valueAt(wb, ws, 6, 7), 1, "flete");
  close(valueAt(wb, ws, 6, 13), 1, "corporativo");
  close(valueAt(wb, ws, 6, 20), 0.5, "operativo");
  close(valueAt(wb, ws, 6, 29), 0.4, "C&D");
  close(valueAt(wb, ws, 6, 4), 200000, "ingreso");
  close(valueAt(wb, ws, 6, 3), 20, "precio");
});

test("con datos completos se conserva la ponderación", () => {
  const { wb, ws } = book([{
    row: 6,
    Puebla: { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, AC: 0.4 },
    Acapulco: { B: 30000, D: 660000, F: 14, G: 2, M: 2, T: 1.5, AC: 0.2 },
  }]);
  close(valueAt(wb, ws, 6, 3), 21.5, "precio");
  close(valueAt(wb, ws, 6, 6), 13.5, "costo");
  close(valueAt(wb, ws, 6, 7), 1.75, "flete");
  close(valueAt(wb, ws, 6, 13), 1.75, "corporativo");
  close(valueAt(wb, ws, 6, 20), 1.25, "operativo");
  close(valueAt(wb, ws, 6, 29), 0.25, "C&D");
});

test("semana y TOTAL MES quedan vacíos si un día con venta tiene la métrica vacía", async () => {
  const { wb, ws } = book([
    {
      row: 6,
      Puebla: { B: 10000, D: 200000, F: 12, G: 1, M: 1, T: 0.5, AC: 0.4 },
      Acapulco: { B: 30000 },
    },
    {
      row: 7,
      Puebla: { B: 30000, D: 600000, F: 13, G: 2, M: 2, T: 1, AC: 0.3 },
    },
  ]);
  blank(valueAt(wb, ws, 6, 6), "costo día incompleto");
  close(valueAt(wb, ws, 7, 6), 13, "costo día completo");
  close(valueAt(wb, ws, 7, 2), 30000, "venta día completo");
  let totalRow = null;
  for (let r = 6; r <= ws.rowCount; r += 1) {
    if (ws.getCell(r, 1).value === "TOTAL MES") totalRow = r;
  }
  assert.ok(totalRow);
  for (const col of [3, 4, 6, 7, 13, 20, 29]) {
    blank(valueAt(wb, ws, 12, col), `semana col ${col}`);
    blank(valueAt(wb, ws, totalRow, col), `total col ${col}`);
    assert.match(formulaOf(ws.getCell(12, col)), /B6>0/);
    assert.match(formulaOf(ws.getCell(totalRow, col)), /B6>0/);
  }
  const raw = await wb.xlsx.writeBuffer();
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(raw);
  const re = again.getWorksheet("IGF Diario Provincia");
  blank(evalFormula(again, re, formulaOf(re.getCell(6, 6))), "costo reabierto");
  blank(evalFormula(again, re, formulaOf(re.getCell(12, 6))), "semana reabierta");
  assert.match(LIB, /writeWeek\(ws, r, index \+ 1, includedEnd == null \? null : start, includedEnd, index === 0\);/);
  assert.match(LIB, /writeTotal\(ws, r, dayRows, weekRows\);/);
  assert.match(LIB, /strictCoverage: true/);
});
