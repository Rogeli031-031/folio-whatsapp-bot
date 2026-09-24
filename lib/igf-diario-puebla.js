"use strict";

const SHEET_NAME = "IGF Diario Puebla";
const YELLOW = "FFFFFF00";
const DATE_BLUE = "FFBDD7EE";
const WEEK_FILL = "FF1F4E79";
const HEADER_FILL = "FF1F4E79";
const WHITE = "FFFFFFFF";

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
  if (Number.isFinite(y) && (y - 2024) % 6 === 0) days.push(ymd(y, 12, 1));
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

function canalCols(ws) {
  let casa = null;
  let com = null;
  for (let c = 1; c <= Math.max(ws.columnCount || 0, 40); c += 1) {
    const text = headerText(ws.getCell(1, c).value);
    if (!text.includes("PUEBLA")) continue;
    if (text.includes("CASA")) casa = c;
    if (text.includes("COMISIONISTA")) com = c;
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

function reserveSheet(wb) {
  if (!wb.getWorksheet(SHEET_NAME)) wb.addWorksheet(SHEET_NAME);
  return wb.getWorksheet(SHEET_NAME);
}

function fillIgfDiarioPuebla(wb, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const ws = reserveSheet(wb);
  const cal = monthBusinessDays(year, month, opts && opts.cierresEmpresariales);
  const weeks = weeksOf(cal.days);
  const venta = wb.getWorksheet("Provincia Venta Diaria");
  const comisiones = wb.getWorksheet("Provincia Comisiones");
  const precio = wb.getWorksheet("PRECIO");
  const compras = wb.getWorksheet("CONTROL DE COMPRAS");
  const canals = venta ? canalCols(venta) : { casa: null, com: null };
  const cols = compras ? comprasCols(compras) : { costo: null, tarifa: null, hgImporte: null };
  const precioRows = precio ? mapDayRows(precio, year, month, cellYmd) : new Map();
  const compraRows = compras ? mapDayRows(compras, year, month, cellYmd) : new Map();

  ws.getCell(1, 1).value = "IGF DIARIO";
  paint(ws.getCell(1, 1), HEADER_FILL, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 14 });
  ws.getCell(1, 15).value = year;
  ws.getCell(2, 1).value = "PLANTA PUEBLA";
  ws.getCell(2, 15).value = MESES[month - 1] || "";
  const corp = opts && Number.isFinite(Number(opts.corporativos)) ? Number(opts.corporativos) : null;
  const oper = opts && Number.isFinite(Number(opts.operativos)) ? Number(opts.operativos) : null;
  ws.getCell(3, 13).value = corp;
  ws.getCell(3, 20).value = oper;
  if (corp != null) ws.getCell(3, 13).numFmt = '"$"#,##0.00';
  if (oper != null) ws.getCell(3, 20).numFmt = '"$"#,##0.00';

  const groups = [
    [1, "FECHA"], [2, "VENTA E INGRESO"], [6, "COSTO DEL GAS (COSTO Y FLETE)"],
    [13, "GASTOS CORPORATIVOS"], [15, "MARGEN NETO"], [20, "GASTOS OPERATIVOS"],
    [22, "SOBRANTE OPERACIÓN"], [24, "HG"], [27, "SOBRANTE OPERACIÓN"],
    [29, "C&D"], [31, "RESULTADO"],
  ];
  const subs = [
    [1, "FECHA"], [2, "VENTA KG"], [3, "PRECIO"], [4, "INGRESO"],
    [6, "COSTO KG"], [7, "FLETE KG"], [8, "MARGEN BRUTO"],
    [13, "IMPORTE"], [15, "MARGEN NETO"], [20, "IMPORTE"],
    [22, "SOBRANTE OPERACIÓN"], [24, "IMPORTE HG"], [25, "IMPORTE HG POR KG"],
    [27, "SOBRANTE OPERACIÓN"], [29, "C&D"], [31, "RESULTADO POR KG"], [32, "RESULTADO"],
  ];
  for (const [c, label] of groups) {
    ws.getCell(4, c).value = label;
    paint(ws.getCell(4, c), HEADER_FILL, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 10 });
  }
  for (const [c, label] of subs) {
    ws.getCell(5, c).value = label;
    paint(ws.getCell(5, c), HEADER_FILL, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 10 });
  }

  const dayRows = [];
  const weekRows = [];
  let r = 6;
  const habiles = cal.habiles;
  weeks.forEach((week, index) => {
    const start = r;
    for (const day of week) {
      writeDay(ws, r, day, {
        year, month, habiles, venta, comisiones, canals, cols, precioRows, compraRows,
      });
      dayRows.push(r);
      r += 1;
    }
    writeWeek(ws, r, index + 1, start, r - 1);
    weekRows.push(r);
    r += 2;
  });
  writeTotal(ws, r - 1, dayRows, weekRows);
  ws.getColumn(1).width = 16;
  return ws;
}

function writeDay(ws, r, day, ctx) {
  const fecha = new Date(Date.UTC(ctx.year, ctx.month - 1, day.day));
  const a = ws.getCell(r, 1);
  a.value = fecha;
  a.numFmt = "dd/mm/yyyy";
  paint(a, DATE_BLUE, { name: "Calibri", size: 11 });

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
  if (compraRow && ctx.cols.costo) {
    ws.getCell(r, 6).value = { formula: both(ref("CONTROL DE COMPRAS", ctx.cols.costo, compraRow), ref("CONTROL DE COMPRAS", ctx.cols.costo, compraRow), ref("CONTROL DE COMPRAS", ctx.cols.costo, compraRow)) };
  }
  if (compraRow && ctx.cols.tarifa) {
    ws.getCell(r, 7).value = { formula: both(ref("CONTROL DE COMPRAS", ctx.cols.tarifa, compraRow), ref("CONTROL DE COMPRAS", ctx.cols.tarifa, compraRow), ref("CONTROL DE COMPRAS", ctx.cols.tarifa, compraRow)) };
  }
  ws.getCell(r, 8).value = { formula: `IF(AND(${numRef(`C${r}`)},${numRef(`F${r}`)},${numRef(`G${r}`)}),C${r}-F${r}-G${r},"")` };

  if (!day.inhabil && ctx.habiles > 0) {
    ws.getCell(r, 13).value = { formula: `IF(AND(${numRef("$M$3")},${numRef(b)},${b}<>0),($M$3/${ctx.habiles})/${b},"")` };
    ws.getCell(r, 20).value = { formula: `IF(AND(${numRef("$T$3")},${numRef(b)},${b}<>0),($T$3/${ctx.habiles})/${b},"")` };
  } else {
    paint(ws.getCell(r, 13), YELLOW);
    paint(ws.getCell(r, 20), YELLOW);
  }
  ws.getCell(r, 15).value = { formula: `IF(${numRef(`M${r}`)},IF(${numRef(`H${r}`)},H${r}-M${r},""),IF(${numRef(`H${r}`)},H${r},""))` };
  ws.getCell(r, 22).value = { formula: `IF(${numRef(`T${r}`)},IF(${numRef(`O${r}`)},O${r}-T${r},""),IF(${numRef(`O${r}`)},O${r},""))` };

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
  for (const c of [2, 3, 4, 6, 7, 8, 13, 15, 20, 22, 24, 25, 27, 29, 31, 32]) {
    if (typeof ws.getCell(r, c).value === "object") ws.getCell(r, c).numFmt = c === 4 || c === 32 || c === 24 ? "#,##0.00" : "0.00";
  }
}

function weighted(col, start, end) {
  const c = `${col}${start}:${col}${end}`;
  const b = `B${start}:B${end}`;
  return `IF(SUMPRODUCT((ISNUMBER(${c}))*(ISNUMBER(${b}))*(${b}))=0,"",SUMPRODUCT((ISNUMBER(${c}))*(ISNUMBER(${b}))*(${c})*(${b}))/SUMPRODUCT((ISNUMBER(${c}))*(ISNUMBER(${b}))*(${b})))`;
}

function writeWeek(ws, r, n, start, end) {
  ws.getCell(r, 1).value = `Semana ${n}`;
  ws.getCell(r, 2).value = { formula: `SUM(B${start}:B${end})` };
  ws.getCell(r, 4).value = { formula: `SUM(D${start}:D${end})` };
  ws.getCell(r, 24).value = { formula: `SUM(X${start}:X${end})` };
  ws.getCell(r, 32).value = { formula: `SUM(AF${start}:AF${end})` };
  for (const col of ["C", "F", "G", "H", "M", "O", "T", "V", "Y", "AA", "AC"]) {
    const idx = colLetterToIndex(col);
    ws.getCell(r, idx).value = { formula: weighted(col, start, end) };
  }
  ws.getCell(r, 31).value = { formula: `IF(OR(NOT(ISNUMBER(B${r})),B${r}=0),"",AF${r}/B${r})` };
  for (let c = 1; c <= 32; c += 1) {
    paint(ws.getCell(r, c), WEEK_FILL, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 11 });
  }
}

function writeTotal(ws, r, dayRows, weekRows) {
  ws.getCell(r, 1).value = "TOTAL MES";
  const sumCols = [[2, "B"], [4, "D"], [24, "X"], [32, "AF"]];
  for (const [idx, letter] of sumCols) {
    const parts = weekRows.map((row) => `${letter}${row}`);
    ws.getCell(r, idx).value = { formula: parts.length ? `SUM(${parts.join(",")})` : "SUM(0)" };
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
  for (let c = 1; c <= 32; c += 1) {
    paint(ws.getCell(r, c), WEEK_FILL, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 11 });
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
