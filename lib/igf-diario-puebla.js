"use strict";

const { mexicoTodayYmd } = require("./compras-excel");

const SHEET_NAME = "IGF Diario Puebla";
const YELLOW = "FFFFFF00";
const DATE_BLUE = "FFB8CCE4";
const RESULT_BLUE = "FFDCE6F1";
const AF_BLUE = "FF95B3D7";
const WEEK_BLACK = "FF000000";
const WEEK_GRAY = "FFF2F2F2";
const SUB_HEADER = "FF2F2F2F";
const WHITE = "FFFFFFFF";
const BLACK = "FF000000";
const FMT_INT = '#,##0;[Red]-#,##0';
const FMT_2 = '#,##0.00;[Red]-#,##0.00';
const FMT_MONEY = '"$"#,##0;[Red]-"$"#,##0';
const FMT_MONEY_2 = '"$"#,##0.00;[Red]-"$"#,##0.00';

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nthMonday(year, month, n) {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const delta = (1 - firstDow + 7) % 7;
  return ymd(year, month, 1 + delta + (n - 1) * 7);
}

/** Descansos obligatorios LFT art. 74. No usa lib/feriados-mx.js. */
function federalRestDays(year) {
  const y = Number(year);
  const days = [
    ymd(y, 1, 1),
    nthMonday(y, 2, 1),
    nthMonday(y, 3, 3),
    ymd(y, 5, 1),
    ymd(y, 9, 16),
    nthMonday(y, 11, 3),
    ymd(y, 12, 25),
  ];
  if (y === 2018) days.push(ymd(y, 12, 1));
  else if (Number.isFinite(y) && y >= 2024 && (y - 2024) % 6 === 0) days.push(ymd(y, 10, 1));
  return days;
}

function isSunday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

function monthBusinessDays(year, month, extraClosures) {
  const last = new Date(year, month, 0).getDate();
  const closed = new Set(federalRestDays(year));
  for (const raw of extraClosures || []) {
    const s = String(raw || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) closed.add(s);
  }
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    const fecha = ymd(year, month, day);
    const inhabil = isSunday(year, month, day) || closed.has(fecha);
    days.push({ day, fecha, inhabil });
  }
  const habiles = days.filter((d) => !d.inhabil).length;
  return { days, habiles, last };
}

function weeksOf(days) {
  const weeks = [];
  let current = [];
  for (const day of days) {
    current.push(day);
    const dow = new Date(Date.UTC(Number(day.fecha.slice(0, 4)), Number(day.fecha.slice(5, 7)) - 1, day.day)).getUTCDay();
    if (dow === 0) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length) weeks.push(current);
  return weeks;
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

function cellYmd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value == null ? "" : value).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

function headerText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().toUpperCase();
}

function findHeader(ws, row, pred) {
  const max = ws.columnCount || 40;
  for (let c = 1; c <= Math.max(max, 40); c += 1) {
    if (pred(headerText(ws.getCell(row, c).value), c)) return c;
  }
  return null;
}

function mapDayRows(ws, year, month, read) {
  const map = new Map();
  const max = Math.max(ws.rowCount || 0, 80);
  for (let r = 1; r <= max; r += 1) {
    const fecha = read(ws.getCell(r, 1).value, r);
    if (fecha && fecha.startsWith(`${year}-${String(month).padStart(2, "0")}-`)) map.set(fecha, r);
  }
  return map;
}

function ventaDayRow(ws, day) {
  const max = Math.max(ws.rowCount || 0, 40);
  for (let r = 2; r <= max; r += 1) {
    const v = ws.getCell(r, 1).value;
    if (Number(v) === day) return r;
  }
  return null;
}

function canalCols(ws, plantEquivalent) {
  let casa = null;
  let com = null;
  for (let c = 1; c <= Math.max(ws.columnCount || 0, 40); c += 1) {
    const folded = foldSheetIdentity(headerText(ws.getCell(1, c).value));
    const kind = folded.includes("COMISIONISTA") ? "com" : (folded.includes("CASA") ? "casa" : "");
    if (!kind) continue;
    const plantPart = folded.replace("COMISIONISTA", "").replace("CASA", "").trim();
    const matches = typeof plantEquivalent === "function"
      ? plantEquivalent(plantPart)
      : folded.includes("PUEBLA");
    if (!matches) continue;
    if (kind === "casa") casa = c;
    else com = c;
  }
  return { casa, com };
}

function comprasCols(ws) {
  let costo = null;
  let tarifa = null;
  let hgImporte = null;
  for (let c = 1; c <= Math.max(ws.columnCount || 0, 50); c += 1) {
    const top = headerText(ws.getCell(4, c).value);
    const sub = headerText(ws.getCell(5, c).value);
    if (sub === "COSTO KG" && top.includes("CONSOLIDADO") && costo == null) costo = c;
    if (sub === "TARIFA" && top.includes("CONSOLIDADO")) tarifa = c;
    if (sub === "IMPORTE" && top.includes("HG")) hgImporte = c;
  }
  return { costo, tarifa, hgImporte };
}

function ref(sheet, col, row) {
  const quoted = sheet.includes(" ") ? `'${sheet}'` : sheet;
  return `${quoted}!${colLetter(col)}${row}`;
}

function numRef(addr) {
  return `ISNUMBER(${addr})`;
}

function both(a, b, expr) {
  return `IF(AND(${numRef(a)},${numRef(b)}),${expr},"")`;
}

function paint(cell, argb, font) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  if (font) cell.font = font;
}

function foldSheetIdentity(value) {
  return String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function sheetTitleFor(label) {
  const name = String(label || "").trim();
  return name ? `IGF Diario ${name}` : SHEET_NAME;
}

function findSheetByIdentity(wb, label) {
  const wanted = foldSheetIdentity(sheetTitleFor(label));
  for (const ws of wb.worksheets || []) {
    if (foldSheetIdentity(ws.name) === wanted) return ws;
  }
  return null;
}

function reserveSheet(wb, label) {
  if (label == null || String(label).trim() === "") {
    if (!wb.getWorksheet(SHEET_NAME)) wb.addWorksheet(SHEET_NAME);
    return wb.getWorksheet(SHEET_NAME);
  }
  const existing = findSheetByIdentity(wb, label);
  if (existing) return existing;
  wb.addWorksheet(sheetTitleFor(label));
  return findSheetByIdentity(wb, label);
}

function fillIgfDiarioPuebla(wb, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const sheetLabel = opts && opts.sheetLabel != null ? String(opts.sheetLabel).trim() : "";
  const humanName = opts && opts.humanName != null ? String(opts.humanName).trim() : "";
  const ws = sheetLabel ? reserveSheet(wb, sheetLabel) : reserveSheet(wb);
  const cal = monthBusinessDays(year, month, opts && opts.cierresEmpresariales);
  const weeks = weeksOf(cal.days);
  const venta = wb.getWorksheet("Provincia Venta Diaria");
  const comisiones = wb.getWorksheet("Provincia Comisiones");
  const precio = wb.getWorksheet("PRECIO");
  const compras = wb.getWorksheet("CONTROL DE COMPRAS");
  const canals = venta ? canalCols(venta, opts && opts.plantEquivalent) : { casa: null, com: null };
  const cols = compras ? comprasCols(compras) : { costo: null, tarifa: null, hgImporte: null };
  const precioRows = precio ? mapDayRows(precio, year, month, cellYmd) : new Map();
  const compraRows = compras ? mapDayRows(compras, year, month, cellYmd) : new Map();

  const corte = resolveCorteYmd(opts);
  ws.getCell(1, 1).value = "IGF DIARIO";
  ws.getCell(1, 1).font = { bold: true, color: { argb: BLACK }, name: "Calibri", size: 20 };
  ws.getRow(1).height = 25.8;
  const yearCell = ws.getCell(1, 15);
  yearCell.value = year;
  yearCell.font = { bold: true, name: "Calibri", size: 18 };
  yearCell.alignment = { horizontal: "center" };
  const monthCell = ws.getCell(2, 15);
  monthCell.value = MESES[month - 1] || "";
  monthCell.font = { bold: true, name: "Calibri", size: 11 };
  monthCell.alignment = { horizontal: "center" };
  ws.getCell(2, 1).value = humanName ? `PLANTA ${humanName.toUpperCase()}` : "PLANTA PUEBLA";
  const corp = finiteAmount(opts && opts.corporativos);
  const oper = finiteAmount(opts && opts.operativos);
  ws.getCell(3, 13).value = corp;
  ws.getCell(3, 20).value = oper;
  const moneyFont = { bold: true, name: "Calibri", size: 14 };
  const moneyAlign = { horizontal: "center", vertical: "middle" };
  const moneyBorder = { bottom: { style: "thin", color: { argb: BLACK } } };
  ws.getCell(3, 13).font = moneyFont;
  ws.getCell(3, 13).alignment = moneyAlign;
  ws.getCell(3, 13).border = moneyBorder;
  ws.getCell(3, 20).font = moneyFont;
  ws.getCell(3, 20).alignment = moneyAlign;
  ws.getCell(3, 20).border = moneyBorder;
  if (corp != null) ws.getCell(3, 13).numFmt = FMT_MONEY_2;
  if (oper != null) ws.getCell(3, 20).numFmt = FMT_MONEY_2;
  ws.getRow(3).height = 18;

  const groups = [
    [1, "FECHA"], [2, "VENTA E INGRESO"], [6, "COSTO DEL GAS (COSTO Y FLETE)"],
    [13, "GASTOS CORPORATIVOS"], [15, "MARGEN NETO"], [20, "GASTOS OPERATIVOS"],
    [22, "SOBRANTE OPERACIÓN"], [24, "HG"], [27, "SOBRANTE OPERACIÓN"],
    [29, "C&D"], [31, "RESULTADO"], [34, "COMENTARIO DEL DIA"],
  ];
  const subs = [
    [1, "FECHA"], [2, "VENTA KG"], [3, "PRECIO"], [4, "INGRESO"],
    [6, "COSTO KG"], [7, "FLETE KG"], [8, "MARGEN BRUTO"],
    [13, "IMPORTE"], [15, "MARGEN NETO"], [20, "IMPORTE"],
    [22, "SOBRANTE OPERACIÓN"], [24, "IMPORTE HG"], [25, "IMPORTE HG POR KG"],
    [27, "SOBRANTE OPERACIÓN"], [29, "C&D"],     [31, "RESULTADO POR KG"], [32, "RESULTADO"], [34, "COMENTARIO DEL DIA"],
  ];
  for (const [c, label] of groups) {
    ws.getCell(4, c).value = label;
    paint(ws.getCell(4, c), WHITE, { bold: true, color: { argb: BLACK }, name: "Calibri", size: 10 });
  }
  for (const [c, label] of subs) {
    ws.getCell(5, c).value = label;
    paint(ws.getCell(5, c), SUB_HEADER, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 10 });
  }
  ws.getRow(4).height = 14.4;
  ws.getRow(5).height = 23.4;
  ws.mergeCells("A1:D1");
  ws.mergeCells("A4:A5");
  ws.mergeCells("B4:D4");
  ws.mergeCells("F4:H4");
  ws.mergeCells("X4:Y4");
  ws.mergeCells("AE4:AF4");
  for (const addr of ["B4", "F4", "X4", "AE4"]) {
    const cell = ws.getCell(addr);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
  }

  const dayRows = [];
  const weekRows = [];
  const history = [];
  let r = 6;
  const habiles = cal.habiles;
  weeks.forEach((week, index) => {
    const start = r;
    let includedEnd = null;
    for (const day of week) {
      const prior = history.filter((item) => item.fecha < day.fecha && item.fecha < corte);
      const future = Boolean(corte) && day.fecha > corte;
      writeDay(ws, r, day, {
        year, month, habiles, venta, comisiones, compras, canals, cols, precioRows, compraRows, corte, prior, future,
      });
      if (!future) {
        dayRows.push(r);
        includedEnd = r;
      }
      history.push({
        fecha: day.fecha,
        row: r,
        costo: !future && compraRows.get(day.fecha) && cols.costo ? ref("CONTROL DE COMPRAS", cols.costo, compraRows.get(day.fecha)) : null,
        flete: !future && compraRows.get(day.fecha) && cols.tarifa ? ref("CONTROL DE COMPRAS", cols.tarifa, compraRows.get(day.fecha)) : null,
      });
      r += 1;
    }
    if (index === weeks.length - 1) r += 1;
    writeWeek(ws, r, index + 1, includedEnd == null ? null : start, includedEnd, index === 0);
    if (includedEnd != null) weekRows.push(r);
    r += 2;
  });
  writeTotal(ws, r, dayRows, weekRows);
  applyColumnWidths(ws);
  ws.getColumn(35).hidden = true;
  ws.getColumn(36).hidden = true;
  return ws;
}

function writeDay(ws, r, day, ctx) {
  const fecha = new Date(Date.UTC(ctx.year, ctx.month - 1, day.day));
  const a = ws.getCell(r, 1);
  a.value = fecha;
  a.numFmt = "dd/mm/yyyy";
  paint(a, DATE_BLUE, { name: "Calibri", size: 11 });
  if (ctx.future) return;

  const ventaRow = ctx.venta ? ventaDayRow(ctx.venta, day.day) : null;
  const b = `B${r}`;
  if (ventaRow && ctx.canals.casa && ctx.canals.com) {
    const casa = ref("Provincia Venta Diaria", ctx.canals.casa, ventaRow);
    const com = ref("Provincia Venta Diaria", ctx.canals.com, ventaRow);
    ws.getCell(r, 2).value = { formula: `IF(AND(${numRef(casa)},${numRef(com)}),(${casa}+${com})*1000,"")` };
  }
  const precioRow = ctx.precioRows.get(day.fecha);
  if (precioRow) ws.getCell(r, 3).value = { formula: both(ref("PRECIO", 2, precioRow), ref("PRECIO", 2, precioRow), ref("PRECIO", 2, precioRow)) };
  ws.getCell(r, 4).value = { formula: both(`C${r}`, b, `C${r}*${b}`) };

  const compraRow = ctx.compraRows.get(day.fecha);
  const historical = day.fecha < ctx.corte;
  const ownCosto = compraRow && ctx.cols.costo ? ref("CONTROL DE COMPRAS", ctx.cols.costo, compraRow) : null;
  const ownFlete = compraRow && ctx.cols.tarifa ? ref("CONTROL DE COMPRAS", ctx.cols.tarifa, compraRow) : null;
  if (ownCosto || (historical && ctx.prior.some((item) => item.costo))) {
    const priors = historical ? ctx.prior.map((item) => item.costo).filter(Boolean) : [];
    ws.getCell(r, 6).value = { formula: carryExpr(ownCosto, historical ? priors : []) };
    if (historical && priors.length) {
      markCarry(ws, ws.getCell(r, 6), ownCosto, 35);
      if (usesCarry(ctx.compras, ownCosto, priors)) paint(ws.getCell(r, 6), YELLOW);
    }
  }
  if (ownFlete || (historical && ctx.prior.some((item) => item.flete))) {
    const priors = historical ? ctx.prior.map((item) => item.flete).filter(Boolean) : [];
    ws.getCell(r, 7).value = { formula: carryExpr(ownFlete, historical ? priors : []) };
    if (historical && priors.length) {
      markCarry(ws, ws.getCell(r, 7), ownFlete, 36);
      if (usesCarry(ctx.compras, ownFlete, priors)) paint(ws.getCell(r, 7), YELLOW);
    }
  }
  ws.getCell(r, 8).value = { formula: `IF(AND(${numRef(`C${r}`)},${numRef(`F${r}`)},${numRef(`G${r}`)}),C${r}-F${r}-G${r},"")` };

  if (!day.inhabil && ctx.habiles > 0) {
    ws.getCell(r, 13).value = { formula: `IF(AND(${numRef("$M$3")},${numRef(b)},${b}<>0),($M$3/${ctx.habiles})/${b},"")` };
    ws.getCell(r, 20).value = { formula: `IF(AND(${numRef("$T$3")},${numRef(b)},${b}<>0),($T$3/${ctx.habiles})/${b},"")` };
  } else {
    paint(ws.getCell(r, 13), YELLOW);
    paint(ws.getCell(r, 20), YELLOW);
  }
  if (day.inhabil) {
    ws.getCell(r, 15).value = { formula: `IF(${numRef(`H${r}`)},H${r},"")` };
    ws.getCell(r, 22).value = { formula: `IF(${numRef(`O${r}`)},O${r},"")` };
  } else {
    ws.getCell(r, 15).value = { formula: `IF(AND(${numRef(`H${r}`)},${numRef(`M${r}`)}),H${r}-M${r},"")` };
    ws.getCell(r, 22).value = { formula: `IF(AND(${numRef(`O${r}`)},${numRef(`T${r}`)}),O${r}-T${r},"")` };
  }

  if (compraRow && ctx.cols.hgImporte) {
    const hg = ref("CONTROL DE COMPRAS", ctx.cols.hgImporte, compraRow);
    ws.getCell(r, 24).value = { formula: both(hg, hg, hg) };
  }
  ws.getCell(r, 25).value = { formula: `IF(AND(${numRef(`X${r}`)},${numRef(b)},${b}<>0),X${r}/${b},"")` };
  ws.getCell(r, 27).value = { formula: both(`V${r}`, `Y${r}`, `V${r}-Y${r}`) };

  const comRow = ctx.comisiones ? ventaDayRow(ctx.comisiones, day.day) : null;
  if (comRow) {
    const cd = ref("Provincia Comisiones", 2, comRow);
    ws.getCell(r, 29).value = { formula: both(cd, cd, cd) };
  }
  ws.getCell(r, 31).value = { formula: both(`AA${r}`, `AC${r}`, `AA${r}+AC${r}`) };
  ws.getCell(r, 32).value = { formula: both(`AE${r}`, b, `AE${r}*${b}`) };
  for (const c of [2, 4, 24]) {
    if (typeof ws.getCell(r, c).value === "object") ws.getCell(r, c).numFmt = FMT_INT;
  }
  for (const c of [3, 6, 7, 8, 13, 15, 20, 22, 25, 27, 29, 31]) {
    if (typeof ws.getCell(r, c).value === "object") ws.getCell(r, c).numFmt = FMT_2;
  }
  if (typeof ws.getCell(r, 32).value === "object") ws.getCell(r, 32).numFmt = FMT_MONEY;
  for (const c of [8, 15, 22, 27]) paint(ws.getCell(r, c), RESULT_BLUE);
  paint(ws.getCell(r, 32), AF_BLUE);
  if (day.inhabil) {
    paint(ws.getCell(r, 13), YELLOW);
    paint(ws.getCell(r, 20), YELLOW);
  }
}

function finiteAmount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveCorteYmd(opts) {
  const raw = opts && opts.corteYmd != null ? String(opts.corteYmd).trim().slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return mexicoTodayYmd(opts && opts.now);
}

function rawNonZero(ws, row, col) {
  if (!ws || !row || !col) return false;
  const value = ws.getCell(row, col).value;
  if (value && typeof value === "object") return false;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n !== 0;
}

function rawNonZeroAddr(ws, addr) {
  const match = String(addr).match(/!([A-Z]+)(\d+)$/);
  if (!match || !ws) return false;
  return rawNonZero(ws, Number(match[2]), colLetterToIndex(match[1]));
}

function carryExpr(own, priors) {
  let expr = '""';
  for (const addr of priors) {
    expr = `IF(AND(ISNUMBER(${addr}),${addr}<>0),${addr},${expr})`;
  }
  if (own) expr = `IF(AND(ISNUMBER(${own}),${own}<>0),${own},${expr})`;
  return expr;
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
  const match = String(expr).trim().match(new RegExp(`^${name}\\(([\\s\\S]*)\\)$`, "i"));
  return match ? match[1] : null;
}

function splitOp(expr, op) {
  let depth = 0;
  let quote = false;
  const text = String(expr);
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth += 1;
    else if (!quote && ch === ")") depth -= 1;
    else if (!quote && depth === 0 && text.startsWith(op, i)) {
      return [text.slice(0, i), text.slice(i + op.length)];
    }
  }
  return null;
}

function shiftFormula(formula, dRow, dCol) {
  if (!dRow && !dCol) return formula;
  return String(formula).replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, (_, absCol, letters, absRow, row) => {
    const col = absCol ? letters : colLetter(colLetterToIndex(letters) + dCol);
    const nextRow = absRow ? row : String(Number(row) + dRow);
    return `${absCol}${col}${absRow}${nextRow}`;
  });
}

function sharedFormulaText(ws, value, row, col) {
  const ref = String(value.sharedFormula || "").match(/([A-Z]+)(\d+)$/);
  if (!ref) return null;
  const masterRow = Number(ref[2]);
  const masterCol = colLetterToIndex(ref[1]);
  const master = ws.getCell(masterRow, masterCol).value;
  if (!master || !master.formula) return null;
  return shiftFormula(master.formula, row - masterRow, col - masterCol);
}

function originNumber(ws, row, col, stack) {
  const key = `${row}:${col}`;
  if (stack.has(key)) return undefined;
  stack.add(key);
  try {
    const value = ws.getCell(row, col).value;
    if (value == null || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
      if (value.trim() === "") return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof value !== "object") return undefined;
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      if (typeof value.result === "number" && Number.isFinite(value.result)) return value.result;
      if (value.result == null || value.result === "") return null;
    }
    const formula = value.formula || sharedFormulaText(ws, value, row, col);
    if (!formula) return undefined;
    return evalExpr(ws, formula, stack);
  } finally {
    stack.delete(key);
  }
}

function evalExpr(ws, expr, stack) {
  const text = String(expr).trim().replace(/^=/, "");
  if (text === '""') return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const ref = text.match(/^(?:'[^']+'!)?\$?([A-Z]+)\$?(\d+)$/);
  if (ref) return originNumber(ws, Number(ref[2]), colLetterToIndex(ref[1]), stack);
  const call = ["IF", "AND", "OR", "ISNUMBER", "COUNT", "SUM"].find((name) => matchCall(text, name) != null);
  if (call === "IF") {
    const [cond, yes, no] = splitArgs(matchCall(text, "IF"));
    return evalExpr(ws, cond, stack) ? evalExpr(ws, yes == null ? '""' : yes, stack) : evalExpr(ws, no == null ? '""' : no, stack);
  }
  if (call === "AND") return splitArgs(matchCall(text, "AND")).every((part) => evalExpr(ws, part, stack));
  if (call === "OR") return splitArgs(matchCall(text, "OR")).some((part) => evalExpr(ws, part, stack));
  if (call === "ISNUMBER") {
    const n = evalExpr(ws, matchCall(text, "ISNUMBER"), stack);
    return typeof n === "number" && Number.isFinite(n);
  }
  if (call === "COUNT" || call === "SUM") {
    const nums = splitArgs(matchCall(text, call)).map((part) => evalExpr(ws, part, stack)).filter((n) => typeof n === "number");
    return call === "COUNT" ? nums.length : nums.reduce((sum, n) => sum + n, 0);
  }
  for (const op of ["<>", ">=", "<=", "=", "+", "/", "*"]) {
    const parts = splitOp(text, op);
    if (!parts) continue;
    const left = evalExpr(ws, parts[0], stack);
    const right = evalExpr(ws, parts[1], stack);
    if (op === "<>") return left !== right;
    if (op === ">=") return left >= right;
    if (op === "<=") return left <= right;
    if (op === "=") return left === right;
    if (typeof left !== "number" || typeof right !== "number") return undefined;
    if (op === "+") return left + right;
    if (op === "/") return right === 0 ? undefined : left / right;
    return left * right;
  }
  return undefined;
}

function resolveAddr(ws, addr) {
  const match = String(addr).match(/!([A-Z]+)(\d+)$/);
  if (!match || !ws) return undefined;
  return originNumber(ws, Number(match[2]), colLetterToIndex(match[1]), new Set());
}

function usesCarry(ws, own, priors) {
  if (own) {
    const n = resolveAddr(ws, own);
    if (n === undefined) return false;
    if (typeof n === "number" && n !== 0) return false;
  }
  return priors.some((addr) => {
    const n = resolveAddr(ws, addr);
    return typeof n === "number" && n !== 0;
  });
}

function markCarry(ws, cell, own, helperCol) {
  const addr = cell.address;
  const helper = ws.getCell(cell.row, helperCol);
  helper.value = own
    ? { formula: `IF(OR(NOT(ISNUMBER(${own})),${own}=0),1,0)` }
    : 1;
  ws.addConditionalFormatting({
    ref: addr,
    rules: [{
      type: "expression",
      formulae: [`AND(ISNUMBER(${addr}),${helper.address}=1)`],
      style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } } },
    }],
  });
}

function weighted(col, start, end) {
  const nums = [];
  const dens = [];
  for (let row = start; row <= end; row += 1) {
    nums.push(`IF(AND(ISNUMBER(${col}${row}),ISNUMBER(B${row})),${col}${row}*B${row},0)`);
    dens.push(`IF(AND(ISNUMBER(${col}${row}),ISNUMBER(B${row})),B${row},0)`);
  }
  return `IF((${dens.join("+")})=0,"",(${nums.join("+")})/(${dens.join("+")}))`;
}

function paintSubtotal(ws, r) {
  paint(ws.getCell(r, 1), WEEK_BLACK, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 11 });
  const font = { bold: true, color: { argb: BLACK }, name: "Calibri", size: 11 };
  for (let c = 2; c <= 32; c += 1) paint(ws.getCell(r, c), WEEK_GRAY, font);
}

function sumIfNumeric(addr) {
  return `IF(COUNT(${addr})=0,"",SUM(${addr}))`;
}

function writeWeek(ws, r, n, start, end, first) {
  ws.getCell(r, 1).value = `Semana ${n}`;
  if (start == null || end == null || end < start) {
    paintSubtotal(ws, r);
    ws.getRow(r).height = 18.6;
    return;
  }
  ws.getCell(r, 2).value = { formula: sumIfNumeric(`B${start}:B${end}`) };
  ws.getCell(r, 4).value = { formula: sumIfNumeric(`D${start}:D${end}`) };
  ws.getCell(r, 24).value = { formula: sumIfNumeric(`X${start}:X${end}`) };
  ws.getCell(r, 32).value = { formula: sumIfNumeric(`AF${start}:AF${end}`) };
  for (const col of ["C", "F", "G", "H", "M", "O", "T", "V", "Y", "AA", "AC"]) {
    const idx = colLetterToIndex(col);
    ws.getCell(r, idx).value = { formula: weighted(col, start, end) };
  }
  ws.getCell(r, 31).value = { formula: `IF(OR(NOT(ISNUMBER(B${r})),B${r}=0),"",AF${r}/B${r})` };
  paintSubtotal(ws, r);
  ws.getRow(r).height = 18.6;
  ws.getCell(r, 2).numFmt = FMT_INT;
  for (const c of [3, 4, 6, 7, 8, 13, 15, 20, 22, 24, 25, 27, 29, 31, 32]) ws.getCell(r, c).numFmt = FMT_2;
}

function writeTotal(ws, r, dayRows, weekRows) {
  ws.getCell(r, 1).value = "TOTAL MES";
  const sumCols = [[2, "B"], [4, "D"], [24, "X"], [32, "AF"]];
  for (const [idx, letter] of sumCols) {
    const parts = weekRows.map((row) => `${letter}${row}`);
    if (parts.length) ws.getCell(r, idx).value = { formula: sumIfNumeric(parts.join(",")) };
  }
  for (const col of ["C", "F", "G", "H", "M", "O", "T", "V", "Y", "AA", "AC"]) {
    if (!dayRows.length) continue;
    const nums = dayRows.map((row) => `IF(AND(ISNUMBER(${col}${row}),ISNUMBER(B${row})),${col}${row}*B${row},0)`);
    const dens = dayRows.map((row) => `IF(AND(ISNUMBER(${col}${row}),ISNUMBER(B${row})),B${row},0)`);
    ws.getCell(r, colLetterToIndex(col)).value = {
      formula: `IF((${dens.join("+")})=0,"",(${nums.join("+")})/(${dens.join("+")}))`,
    };
  }
  ws.getCell(r, 31).value = { formula: `IF(OR(NOT(ISNUMBER(B${r})),B${r}=0),"",AF${r}/B${r})` };
  paintSubtotal(ws, r);
  ws.getRow(r).height = 18.6;
  ws.getCell(r, 2).numFmt = FMT_INT;
  for (const c of [3, 4, 6, 7, 8, 13, 15, 20, 22, 24, 25, 27, 29, 31, 32]) ws.getCell(r, c).numFmt = FMT_2;
}

function applyColumnWidths(ws) {
  const widths = {
    1: 16.5547, 2: 14, 4: 15.2188, 8: 13.5547, 13: 23.2188, 15: 15.5547,
    20: 21.332, 22: 20.7773, 24: 14.7773, 25: 13, 27: 20.7773, 29: 20.7773,
    31: 16.5547, 32: 16.5547, 34: 65.8867,
  };
  for (const [col, width] of Object.entries(widths)) ws.getColumn(Number(col)).width = width;
  for (const col of [5, 9, 10, 11, 12, 14, 16, 17, 18, 19, 21, 23, 26, 28, 30, 33]) {
    ws.getColumn(col).width = 2.2188;
  }
}

function colLetterToIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

module.exports = {
  SHEET_NAME,
  federalRestDays,
  monthBusinessDays,
  weeksOf,
  reserveSheet,
  fillIgfDiarioPuebla,
};
