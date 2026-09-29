"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");

const igf = require("../lib/igf-diario-puebla");
const grafica = require("../lib/igf-diario-grafica");

const ROOT = path.join(__dirname, "..");

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
  if (text === '""') return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
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
      const range = String(part).trim().match(/^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/);
      if (range) {
        for (let row = Number(range[2]); row <= Number(range[4]); row += 1) {
          const n = cellNumber(wb, ws, row, colIndex(range[1]), stack);
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
    if (!parts) continue;
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
  return evalFormula(wb, ws, formula);
}

function close(actual, expected, label) {
  assert.equal(typeof actual, "number", `${label}: ${actual}`);
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} ≠ ${expected}`);
}

function supportBook(dayValues) {
  const wb = new ExcelJS.Workbook();
  const venta = wb.addWorksheet("Provincia Venta Diaria");
  venta.getCell(1, 8).value = "Puebla\nCASA";
  venta.getCell(1, 9).value = "Puebla\nCOMISIONISTA";
  const comisiones = wb.addWorksheet("Provincia Comisiones");
  const precio = wb.addWorksheet("PRECIO");
  const compras = wb.addWorksheet("CONTROL DE COMPRAS");
  compras.getCell(4, 15).value = "CONSOLIDADO";
  compras.getCell(5, 15).value = "COSTO KG";
  compras.getCell(4, 36).value = "CONSOLIDADO";
  compras.getCell(5, 36).value = "TARIFA";
  compras.getCell(4, 40).value = "HG";
  compras.getCell(5, 40).value = "IMPORTE";
  for (let day = 1; day <= 30; day += 1) {
    const spec = dayValues[day] || {};
    venta.getCell(day + 1, 1).value = day;
    venta.getCell(day + 1, 8).value = spec.casa == null ? null : spec.casa;
    venta.getCell(day + 1, 9).value = spec.com == null ? null : spec.com;
    precio.getCell(day + 1, 1).value = new Date(Date.UTC(2026, 8, day));
    if (spec.precio != null) precio.getCell(day + 1, 2).value = spec.precio;
    comisiones.getCell(day + 1, 1).value = day;
    if (spec.cd != null) comisiones.getCell(day + 1, 2).value = spec.cd;
    const row = day + 5;
    compras.getCell(row, 1).value = `${String(day).padStart(2, "0")}/09/2026`;
    if (spec.costo != null) compras.getCell(row, 15).value = spec.costo;
    if (spec.flete != null) compras.getCell(row, 36).value = spec.flete;
    if (spec.hg != null) compras.getCell(row, 40).value = spec.hg;
  }
  return wb;
}

function plantSeries(dayValues, extra) {
  const days = [];
  for (let day = 1; day <= 30; day += 1) {
    const spec = dayValues[day];
    if (!spec) continue;
    const venta = (Number(spec.casa) || 0) + (Number(spec.com) || 0);
    days.push({
      fecha: `2026-09-${String(day).padStart(2, "0")}`,
      ventaKg: spec.casa == null && spec.com == null ? null : venta * 1000,
      precio: spec.precio,
      costoKg: spec.costo,
      fleteKg: spec.flete,
      hgImporte: spec.hg,
      cdKg: spec.cd,
    });
  }
  return grafica.buildPlantMonth({
    year: 2026,
    month: 9,
    plant: "Puebla",
    corteYmd: "2026-09-28",
    corporativos: 206858.6,
    operativos: 59970.36,
    days,
    ...extra,
  });
}

const BASE = {
  1: { casa: 6, com: 4, precio: 20, costo: 12, flete: 1, hg: -1000, cd: 0.4 },
};

test("AF y AE del día coinciden con el Excel, en positivo y en negativo", () => {
  const positiveBook = supportBook(BASE);
  const ws = igf.fillIgfDiarioPuebla(positiveBook, {
    year: 2026,
    month: 9,
    corteYmd: "2026-10-01",
    corporativos: 206858.6,
    operativos: 59970.36,
    plantEquivalent: () => true,
  });
  const series = plantSeries(BASE, { corteYmd: "2026-10-01" });
  const af = valueAt(positiveBook, ws, 6, 32);
  const ae = valueAt(positiveBook, ws, 6, 31);
  const venta = valueAt(positiveBook, ws, 6, 2);
  close(series.points[0].venta_kg, venta, "venta");
  close(series.points[0].resultado_mxn, af, "AF");
  close(series.points[0].resultado_per_kg, ae, "AE");
  assert.ok(af > 0, "AF positivo");
  assert.ok(ae > 0, "AE positivo");

  const negativeDays = { 1: { casa: 6, com: 4, precio: 20, costo: 30, flete: 2, hg: -1000, cd: 0.4 } };
  const negativeBook = supportBook(negativeDays);
  const negativeWs = igf.fillIgfDiarioPuebla(negativeBook, {
    year: 2026,
    month: 9,
    corteYmd: "2026-10-01",
    corporativos: 206858.6,
    operativos: 59970.36,
    plantEquivalent: () => true,
  });
  const negative = plantSeries(negativeDays, { corteYmd: "2026-10-01" });
  const afNeg = valueAt(negativeBook, negativeWs, 6, 32);
  const aeNeg = valueAt(negativeBook, negativeWs, 6, 31);
  close(negative.points[0].resultado_mxn, afNeg, "AF negativo");
  close(negative.points[0].resultado_per_kg, aeNeg, "AE negativo");
  assert.ok(afNeg < 0);
  assert.ok(aeNeg < 0);
});

test("la semana usa SUM(AF)/SUM(B) y no el promedio de AE", () => {
  const days = {
    1: { casa: 10, com: 0, precio: 20, costo: 12, flete: 1, hg: -1000, cd: 0.4 },
    2: { casa: 30, com: 0, precio: 22, costo: 14, flete: 2, hg: -3000, cd: 0.2 },
  };
  const wb = supportBook(days);
  const ws = igf.fillIgfDiarioPuebla(wb, {
    year: 2026,
    month: 9,
    corteYmd: "2026-10-01",
    corporativos: 206858.6,
    operativos: 59970.36,
    plantEquivalent: () => true,
  });
  const series = plantSeries(days, { corteYmd: "2026-10-01" });
  let weekRow = null;
  for (let row = 6; row < 20; row += 1) {
    if (ws.getCell(row, 1).value === "Semana 1") weekRow = row;
  }
  assert.ok(weekRow);
  const af = valueAt(wb, ws, weekRow, 32);
  const ae = valueAt(wb, ws, weekRow, 31);
  close(series.weeks[0].resultado_mxn, af, "AF semana");
  close(series.weeks[0].resultado_per_kg, ae, "AE semana");
  const daily = [series.points[0].resultado_per_kg, series.points[1].resultado_per_kg];
  const promedio = (daily[0] + daily[1]) / 2;
  assert.ok(Math.abs(ae - promedio) > 1e-6, "AE semanal no es promedio simple");
  close(ae, af / valueAt(wb, ws, weekRow, 2), "AE = AF/B");
});

test("un día sin flete queda incompleto y no entra a la tendencia", () => {
  const days = {
    1: { casa: 6, com: 4, precio: 20, costo: 12, flete: 1, hg: -1000, cd: 0.4 },
    2: { casa: 6, com: 4, precio: 20, costo: 12, flete: 1, cd: 0.4 },
  };
  const series = plantSeries(days, { corteYmd: "2026-10-01" });
  assert.equal(series.points[1].complete, false);
  assert.ok(series.points[1].missing_components.includes("HG"));
  assert.equal(series.points[1].resultado_mxn, null);
  const trend = grafica.trendOf(series.points, "resultado_mxn");
  const onlyComplete = grafica.trendOf([series.points[0]], "resultado_mxn");
  assert.equal(trend, null);
  assert.equal(onlyComplete, null);
  const two = plantSeries({
    1: BASE[1],
    2: { casa: 8, com: 2, precio: 21, costo: 11, flete: 1, hg: -500, cd: 0.2 },
  }, { corteYmd: "2026-10-01" });
  const mxn = grafica.trendOf(two.points.filter((point) => point.fecha <= "2026-09-02"), "resultado_mxn");
  const perKg = grafica.trendOf(two.points.filter((point) => point.fecha <= "2026-09-02"), "resultado_per_kg");
  assert.ok(mxn && perKg);
  assert.notEqual(mxn.b, perKg.b);
  const corte = plantSeries(BASE, { corteYmd: "2026-09-01" });
  assert.equal(corte.points[0].estado, "proyectado");
  assert.equal(series.points[0].estado, "real");
});

test("semana mixta y cobertura de Provincia", () => {
  const full = plantSeries(BASE, { corteYmd: "2026-09-03" });
  const gapDays = { 1: { casa: 6, com: 4, precio: 20, costo: 12, hg: -1000, cd: 0.4 } };
  const gap = grafica.buildPlantMonth({
    year: 2026,
    month: 9,
    plant: "San Luis",
    corteYmd: "2026-09-03",
    corporativos: 206858.6,
    operativos: 59970.36,
    days: [{
      fecha: "2026-09-01",
      ventaKg: 10000,
      precio: 20,
      costoKg: 12,
      hgImporte: -1000,
      cdKg: 0.4,
    }],
  });
  assert.equal(full.weeks[0].estado, "mixto");
  const province = grafica.buildProvinceMonth([
    { ...full, plant: "Puebla" },
    { ...gap, plant: "San Luis" },
  ]);
  assert.equal(province.points[0].complete, false);
  assert.ok(province.points[0].missing_plants.includes("San Luis"));
  assert.ok(province.points[0].missing_components.some((item) => item.includes("San Luis") && item.includes("FLETE")));
  assert.equal(grafica.trendOf([province.points[0]], "resultado_mxn"), null);
  const same = grafica.buildProvinceMonth([{ ...full, plant: "Puebla" }]);
  assert.equal(same.points[0].resultado_mxn, full.points[0].resultado_mxn);
});

test("clientes nuevos: semanas, día futuro ausente, top acumulado y homónimos", () => {
  const sales = (plant, rows) => rows.map(([fecha, kg]) => ({ fecha, cliente_norm: "CLIENTE UNO", canal: "CASA", kg }));
  const panel = grafica.newClientsPanel([
    {
      plant: "Puebla",
      plantaId: 1,
      salesRows: [
        { fecha: "2026-09-07", cliente_norm: "TORTILLERIA ERICK", canal: "CASA", kg: 850 },
        { fecha: "2026-09-10", cliente_norm: "TORTILLERIA ERICK", canal: "CASA", kg: 400 },
        { fecha: "2026-08-20", cliente_norm: "VIEJO", canal: "CASA", kg: 100 },
        { fecha: "2026-09-14", cliente_norm: "VIEJO", canal: "CASA", kg: 50 },
      ],
      discountRows: [
        { fecha: "2026-09-07", cliente_norm: "TORTILLERIA ERICK", monto: 603.5 },
        { fecha: "2026-09-10", cliente_norm: "TORTILLERIA ERICK", monto: 284 },
      ],
    },
    {
      plant: "Acapulco",
      plantaId: 2,
      salesRows: [
        { fecha: "2026-09-14", cliente_norm: "CLIENTE UNO", canal: "CASA", kg: 900 },
        { fecha: "2026-09-20", cliente_norm: "CLIENTE UNO", canal: "CASA", kg: 100 },
      ],
      discountRows: [{ fecha: "2026-09-14", cliente_norm: "CLIENTE UNO", monto: 180 }],
    },
    {
      plant: "Puebla",
      plantaId: 1,
      salesRows: [{ fecha: "2026-09-08", cliente_norm: "CLIENTE UNO", canal: "CASA", kg: 2000 }],
      discountRows: [],
    },
  ], { year: 2026, month: 9, corteYmd: "2026-09-18", todayYmd: "2026-09-18" });
  assert.equal(panel.anchor, "2026-09-17");
  assert.equal(panel.new_clients_chart[0].label, "SEM -2");
  assert.equal(panel.new_clients_chart[1].label, "SEM -1");
  assert.equal(panel.new_clients_chart.filter((item) => item.tipo === "day").length, 4);
  assert.ok(panel.new_clients_chart.every((item) => !item.label.includes("18")));
  const erick = panel.new_clients_top.find((item) => item.cliente === "TORTILLERIA ERICK");
  assert.equal(erick.kg, 1250);
  assert.ok(Math.abs(erick.descuento_per_kg - (603.5 + 284) / 1250) < 1e-9);
  const homonimos = panel.new_clients_top.filter((item) => item.cliente === "CLIENTE UNO");
  assert.equal(homonimos.length, 2);
  assert.deepEqual(homonimos.map((item) => item.planta).sort(), ["Acapulco", "Puebla"]);
  assert.equal(homonimos.find((item) => item.planta === "Puebla").kg, 2000);
  assert.equal(homonimos.find((item) => item.planta === "Acapulco").kg, 900);
  assert.equal(panel.new_clients_top.some((item) => item.cliente === "VIEJO"), false);
});

test("rangos no inventan ceros y el gate queda antes de la lectura", () => {
  const points = [
    { fecha: "2026-08-15", resultado_mxn: 10, resultado_per_kg: 1, venta_kg: 10, estado: "real", complete: true, missing_components: [], missing_plants: [] },
    { fecha: "2026-09-30", resultado_mxn: null, resultado_per_kg: null, venta_kg: null, estado: "proyectado", complete: false, missing_components: ["COSTO"], missing_plants: [] },
  ];
  const oneDay = grafica.assembleGrafica({ year: 2026, month: 9, range: "1d", corteYmd: "2026-09-28", points, scope: "Puebla" });
  assert.equal(oneDay.range, "1d");
  assert.equal(oneDay.points.length, 1);
  assert.equal(oneDay.points[0].resultado_mxn, null);
  const five = grafica.assembleGrafica({ year: 2026, month: 9, range: "5d", corteYmd: "2026-09-28", points, scope: "Puebla" });
  assert.equal(five.points.length, 1);
  const month = grafica.assembleGrafica({ year: 2026, month: 9, range: "1m", corteYmd: "2026-09-28", points, scope: "Puebla" });
  assert.equal(month.points.length, 1);
  const three = grafica.assembleGrafica({ year: 2026, month: 9, range: "3m", corteYmd: "2026-09-28", points, scope: "Puebla", firstYmd: "2026-08-15" });
  assert.equal(three.points.length, 2);
  assert.ok(three.points[0].resultado_mxn === 10);
  const ytd = grafica.rangeWindow("2026-09-30", "ytd");
  const year = grafica.rangeWindow("2026-09-30", "1a");
  const fiveYear = grafica.rangeWindow("2026-09-30", "5a");
  const all = grafica.rangeWindow("2026-09-30", "todo", "2024-02-01");
  assert.equal(ytd.desde, "2026-01-01");
  assert.equal(year.desde, "2025-10-01");
  assert.equal(fiveYear.desde, "2021-09-30");
  assert.equal(all.desde, "2024-02-01");
  const server = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
  const start = server.indexOf('app.get("/api/dashboard/igf-diario-grafica"');
  assert.ok(start > 0);
  const handler = server.slice(start, start + 2500);
  const gate = handler.indexOf("igfDiarioTodasRequestBlock(req)");
  const connect = handler.indexOf("pool.connect()");
  assert.ok(gate >= 0 && gate < connect);
  const lib = fs.readFileSync(path.join(ROOT, "lib", "igf-diario-grafica.js"), "utf8");
  assert.doesNotMatch(lib, /openaiDirectorIaChat|ensureClienteContactosTable|ensureComprasTables|\b(INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/);
});

test("IGFDiario abre el modal y Descargar Excel conserva la URL", () => {
  const client = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"), "utf8");
  const modal = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "IgfDiarioGraficaModal.tsx"), "utf8");
  const venta = fs.readFileSync(path.join(ROOT, "frontend-dashboard", "components", "ArrVentaGraficaModal.tsx"), "utf8");
  const button = client.slice(client.indexOf("IGFDiario") - 700, client.indexOf("IGFDiario"));
  assert.match(button, /setIgfGraficaOpen\(true\)/);
  assert.doesNotMatch(button, /window\.open/);
  assert.match(client, /getDashboardExcelDownloadUrl\([\s\S]*todas \? null : plantaFilter,\s*\n\s*!todas,\s*\n\s*todas/);
  assert.match(modal, /Gráfica · Rentabilidad IGF Diario/);
  assert.match(modal, /Descargar Excel/);
  assert.match(modal, /Cerrar/);
  assert.match(modal, /metric === "mxn" \? "\$" : "\$\/kg"/);
  assert.doesNotMatch(modal, /Math\.max\(0/);
  assert.match(modal, /y === 0|Cero|línea de cero|stroke="#0f172a"/);
  assert.match(modal, /Resultado/);
  assert.match(modal, /Resultado\/kg/);
  assert.match(modal, /Real/);
  assert.match(modal, /Proyectado/);
  assert.match(venta, /const yMin = Math\.max\(0, minV - span \* 0\.08\)/);
  assert.match(modal, /useState<Metric>\("mxn"\)/);
  assert.match(modal, /useState<RangeId>\("1m"\)/);
});
