"use strict";

const FMT_INT = '#,##0;[Red]-#,##0';
const FMT_2 = '#,##0.00;[Red]-#,##0.00';
const FMT_MONEY = '"$"#,##0;[Red]-"$"#,##0';
const FMT_MONEY_2 = '"$"#,##0.00;[Red]-"$"#,##0.00';
const YELLOW = "FFFFFF00";
const DATE_BLUE = "FFB8CCE4";
const RESULT_BLUE = "FFDCE6F1";
const AF_BLUE = "FF95B3D7";
const WEEK_BLACK = "FF000000";
const WEEK_GRAY = "FFF2F2F2";
const SUB_HEADER = "FF2F2F2F";
const WHITE = "FFFFFFFF";
const BLACK = "FF000000";

const distribucion = require("./igf-diario-gastos-distribucion");

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

const CORP = [
  [10, "J", "gasto_corporativo"],
  [11, "K", "inversiones"],
  [12, "L", "impuestos_federales"],
];
const OPER = [
  [17, "Q", "presupuesto_nomina_gastos"],
  [18, "R", "presupuesto_imss_sua"],
  [19, "S", "extraordinarios"],
  [20, "T", "provisiones_planta"],
];

function flagsOf(opts) {
  const bag = (opts && opts.desglose) || {};
  const c = bag.componentes || {};
  return {
    corporate: bag.corporativos_desglosados === true,
    operative: bag.operativos_desglosados === true,
    amounts: c,
  };
}

function amountOf(flags, key) {
  if (!flags || !flags.amounts) return null;
  const value = flags.amounts[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function paintMoney(h, ws, col, value) {
  const cell = ws.getCell(3, col);
  cell.value = value == null ? null : value;
  cell.font = { bold: true, name: "Calibri", size: 14 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
  if (value != null) cell.numFmt = FMT_MONEY_2;
}

function paintHeader(h, ws, row, col, label, fill, font) {
  const cell = ws.getCell(row, col);
  cell.value = label;
  h.paint(cell, fill, font);
}

function paintDetailedChrome(h, ws, opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const flags = flagsOf(opts);
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
  ws.getCell(2, 1).value = opts && opts.plantTitle ? opts.plantTitle : "PLANTA PUEBLA";
  const names = (opts && opts.plantSheets) || [];
  if (names.length) {
    for (const col of [10, 11, 12, 13, 17, 18, 19, 20, 21]) {
      const cell = ws.getCell(3, col);
      cell.value = { formula: h.sumAcross(col, 3, names) };
      cell.font = { bold: true, name: "Calibri", size: 14 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.numFmt = FMT_MONEY_2;
    }
  } else {
    if (flags.corporate) {
      paintMoney(h, ws, 10, amountOf(flags, "gasto_corporativo"));
      paintMoney(h, ws, 11, amountOf(flags, "inversiones"));
      paintMoney(h, ws, 12, amountOf(flags, "impuestos_federales"));
      const total = ws.getCell(3, 13);
      total.value = { formula: "J3+K3+L3" };
      total.font = { bold: true, name: "Calibri", size: 14 };
      total.numFmt = FMT_MONEY_2;
    } else {
      paintMoney(h, ws, 10, null);
      paintMoney(h, ws, 11, null);
      paintMoney(h, ws, 12, null);
      paintMoney(h, ws, 13, h.finiteAmount(opts && opts.corporativos));
    }
    if (flags.operative) {
      paintMoney(h, ws, 17, amountOf(flags, "presupuesto_nomina_gastos"));
      paintMoney(h, ws, 18, amountOf(flags, "presupuesto_imss_sua"));
      paintMoney(h, ws, 19, amountOf(flags, "extraordinarios"));
      paintMoney(h, ws, 20, amountOf(flags, "provisiones_planta"));
      const total = ws.getCell(3, 21);
      total.value = { formula: "Q3+R3+S3+T3" };
      total.font = { bold: true, name: "Calibri", size: 14 };
      total.numFmt = FMT_MONEY_2;
    } else {
      paintMoney(h, ws, 17, null);
      paintMoney(h, ws, 18, null);
      paintMoney(h, ws, 19, null);
      paintMoney(h, ws, 20, null);
      paintMoney(h, ws, 21, h.finiteAmount(opts && opts.operativos));
    }
  }
  ws.getRow(3).height = 18;
  const groups = [
    [1, "FECHA"], [2, "VENTA E INGRESO"], [6, "COSTO DEL GAS (COSTO Y FLETE)"],
    [10, "GASTOS CORPORATIVOS"], [15, "MARGEN NETO"], [17, "GASTOS OPERATIVOS"],
    [23, "SOBRANTE OPERACIÓN"], [25, "HG"], [28, "SOBRANTE OPERACIÓN"],
    [30, "C&D"], [32, "RESULTADO"], [35, "COMENTARIO DEL DIA"], [36, "VENTAS"],
  ];
  const subs = [
    [1, "FECHA"], [2, "VENTA KG"], [3, "PRECIO"], [4, "INGRESO"],
    [6, "COSTO KG"], [7, "FLETE KG"], [8, "MARGEN BRUTO"],
    [10, "Gasto Corporativo"], [11, "Inversiones"], [12, "Impuestos Federales"], [13, "IMPORTE"],
    [15, "MARGEN NETO"],
    [17, "Presupuesto Nómina/Gastos"], [18, "Presupuesto IMSS/SUA"], [19, "Extraordinarios"],
    [20, "Provisiones de la Planta"], [21, "IMPORTE"],
    [23, "SOBRANTE OPERACIÓN"], [25, "IMPORTE HG"], [26, "IMPORTE HG POR KG"],
    [28, "SOBRANTE OPERACIÓN"], [30, "C&D"], [32, "RESULTADO POR KG"], [33, "RESULTADO"],
    [35, "COMENTARIO DEL DIA"], [36, "VENTAS"],
  ];
  const headFont = { bold: true, color: { argb: BLACK }, name: "Calibri", size: 10 };
  const subFont = { bold: true, color: { argb: WHITE }, name: "Calibri", size: 10 };
  for (const [c, label] of groups) paintHeader(h, ws, 4, c, label, WHITE, headFont);
  for (const [c, label] of subs) paintHeader(h, ws, 5, c, label, SUB_HEADER, subFont);
  ws.getRow(4).height = 14.4;
  ws.getRow(5).height = 30;
  ws.mergeCells("A1:D1");
  ws.mergeCells("A4:A5");
  ws.mergeCells("B4:D4");
  ws.mergeCells("F4:H4");
  ws.mergeCells("J4:M4");
  ws.mergeCells("Q4:U4");
  ws.mergeCells("Y4:Z4");
  ws.mergeCells("AF4:AG4");
  for (const addr of ["B4", "F4", "J4", "Q4", "Y4", "AF4"]) {
    const cell = ws.getCell(addr);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
  }
}

function moneyLiteral(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function componentDayFormula(cents, row) {
  const b = `B${row}`;
  return `IF(AND(ISNUMBER(${b}),${b}<>0),${moneyLiteral(cents)}/${b},"")`;
}

function writeComponentDay(h, ws, row, col, day, active, assignedCents) {
  if (!active) return;
  const cell = ws.getCell(row, col);
  if (day.inhabil) {
    cell.value = 0;
    cell.numFmt = FMT_2;
    h.paint(cell, YELLOW);
    return;
  }
  cell.value = { formula: componentDayFormula(assignedCents, row) };
  cell.numFmt = FMT_2;
}

function writeDetailedInsights(h, ws, r, day, insights) {
  const pack = h.insightText(insights, day && day.fecha);
  if (!pack) return;
  const align = { wrapText: true, vertical: "top" };
  const comprasComment = require("./igf-diario-compras-comment");
  if (pack.comentario) {
    const cell = ws.getCell(r, 35);
    cell.value = comprasComment.commentCellValue(pack);
    cell.alignment = align;
  }
  if (pack.ventas) {
    const cell = ws.getCell(r, 36);
    cell.value = pack.ventas;
    cell.alignment = align;
  }
  const lines = Math.max(h.visualLines(pack.comentario, 62), h.visualLines(pack.ventas, 40));
  ws.getRow(r).height = Math.min(140, Math.max(18, lines * 15));
}

function writeDetailedDay(h, ws, r, day, ctx) {
  if (!ctx.supports) ctx.supports = h.supportNames();
  const fecha = new Date(Date.UTC(ctx.year, ctx.month - 1, day.day));
  const a = ws.getCell(r, 1);
  a.value = fecha;
  a.numFmt = "dd/mm/yyyy";
  h.paint(a, DATE_BLUE, { name: "Calibri", size: 11 });
  const ventaRow = ctx.venta ? h.ventaDayRow(ctx.venta, day.day) : null;
  const b = `B${r}`;
  if (ventaRow && ctx.canals && ctx.canals.casa && ctx.canals.com) {
    const casa = h.ref(ctx.supports.venta, ctx.canals.casa, ventaRow);
    const comisionista = h.ref(ctx.supports.venta, ctx.canals.com, ventaRow);
    ws.getCell(r, 2).value = { formula: h.both(casa, comisionista, `(${casa}+${comisionista})*1000`) };
  }
  const precioRow = ctx.precioRows.get(day.fecha);
  const manualPrecio = require("./igf-diario-margen-manual").appliedManualNumber(
    ctx.marginOverrides, day.fecha, ctx.corte, ctx.year, ctx.month, "precio"
  );
  if (manualPrecio != null) {
    const cell = ws.getCell(r, 3);
    cell.value = manualPrecio;
    cell.numFmt = FMT_2;
  } else if (precioRow) {
    ws.getCell(r, 3).value = {
      formula: h.both(h.ref(ctx.supports.precio, 2, precioRow), h.ref(ctx.supports.precio, 2, precioRow), h.ref(ctx.supports.precio, 2, precioRow)),
    };
  }
  ws.getCell(r, 4).value = { formula: h.both(`C${r}`, b, `C${r}*${b}`) };
  const compraRow = ctx.compraRows.get(day.fecha);
  const historical = day.fecha < ctx.corte;
  const ownCosto = compraRow && ctx.cols.costo ? h.ref(ctx.supports.compras, ctx.cols.costo, compraRow) : null;
  const ownFlete = compraRow && ctx.cols.tarifa ? h.ref(ctx.supports.compras, ctx.cols.tarifa, compraRow) : null;
  const manualCosto = require("./igf-diario-margen-manual").appliedManualNumber(
    ctx.marginOverrides, day.fecha, ctx.corte, ctx.year, ctx.month, "costo_kg"
  );
  const manualFlete = require("./igf-diario-margen-manual").appliedManualNumber(
    ctx.marginOverrides, day.fecha, ctx.corte, ctx.year, ctx.month, "flete_kg"
  );
  if (manualCosto != null) {
    const cell = ws.getCell(r, 6);
    cell.value = manualCosto;
    cell.numFmt = FMT_2;
  } else if (ownCosto || (historical && ctx.prior.some((item) => item.costo))) {
    const priors = historical ? ctx.prior.map((item) => item.costo).filter(Boolean) : [];
    ws.getCell(r, 6).value = { formula: h.carryExpr(ownCosto, historical ? priors : []) };
    if (historical && priors.length) {
      h.markCarry(ws, ws.getCell(r, 6), ownCosto, 37);
      if (h.usesCarry(ctx.compras, ownCosto, priors)) h.paint(ws.getCell(r, 6), YELLOW);
    }
  }
  if (manualFlete != null) {
    const cell = ws.getCell(r, 7);
    cell.value = manualFlete;
    cell.numFmt = FMT_2;
  } else if (ownFlete || (historical && ctx.prior.some((item) => item.flete))) {
    const priors = historical ? ctx.prior.map((item) => item.flete).filter(Boolean) : [];
    ws.getCell(r, 7).value = { formula: h.carryExpr(ownFlete, historical ? priors : []) };
    if (historical && priors.length) {
      h.markCarry(ws, ws.getCell(r, 7), ownFlete, 38);
      if (h.usesCarry(ctx.compras, ownFlete, priors)) h.paint(ws.getCell(r, 7), YELLOW);
    }
  }
  ws.getCell(r, 8).value = { formula: `IF(AND(${h.numRef(`C${r}`)},${h.numRef(`F${r}`)},${h.numRef(`G${r}`)}),C${r}-F${r}-G${r},"")` };

  const flags = ctx.flags;
  for (const [col, , key] of CORP) {
    writeComponentDay(h, ws, r, col, day, flags.corporate, assignedCents(ctx.schedules, key, day.fecha));
  }
  for (const [col, , key] of OPER) {
    writeComponentDay(h, ws, r, col, day, flags.operative, assignedCents(ctx.schedules, key, day.fecha));
  }
  if (flags.corporate) {
    const cell = ws.getCell(r, 13);
    cell.value = { formula: `J${r}+K${r}+L${r}` };
    cell.numFmt = FMT_2;
  } else if (!day.inhabil && ctx.habiles > 0) {
    ws.getCell(r, 13).value = { formula: `IF(AND(${h.numRef("$M$3")},${h.numRef(b)},${b}<>0),($M$3/${ctx.habiles})/${b},"")` };
  } else {
    h.paint(ws.getCell(r, 13), YELLOW);
  }
  if (flags.operative) {
    const cell = ws.getCell(r, 21);
    cell.value = { formula: `Q${r}+R${r}+S${r}+T${r}` };
    cell.numFmt = FMT_2;
  } else if (!day.inhabil && ctx.habiles > 0) {
    ws.getCell(r, 21).value = { formula: `IF(AND(${h.numRef("$U$3")},${h.numRef(b)},${b}<>0),($U$3/${ctx.habiles})/${b},"")` };
  } else {
    h.paint(ws.getCell(r, 21), YELLOW);
  }
  if (day.inhabil && !flags.corporate) {
    ws.getCell(r, 15).value = { formula: `IF(${h.numRef(`H${r}`)},H${r},"")` };
  } else {
    ws.getCell(r, 15).value = { formula: `IF(AND(${h.numRef(`H${r}`)},${h.numRef(`M${r}`)}),H${r}-M${r},"")` };
  }
  if (day.inhabil && !flags.operative) {
    ws.getCell(r, 23).value = { formula: `IF(${h.numRef(`O${r}`)},O${r},"")` };
  } else {
    ws.getCell(r, 23).value = { formula: `IF(AND(${h.numRef(`O${r}`)},${h.numRef(`U${r}`)}),O${r}-U${r},"")` };
  }
  if (compraRow && ctx.cols.hgImporte) {
    const hg = h.ref(ctx.supports.compras, ctx.cols.hgImporte, compraRow);
    ws.getCell(r, 25).value = { formula: h.both(hg, hg, hg) };
  }
  ws.getCell(r, 26).value = { formula: `IF(AND(${h.numRef(`Y${r}`)},${h.numRef(b)},${b}<>0),Y${r}/${b},"")` };
  ws.getCell(r, 28).value = { formula: h.both(`W${r}`, `Z${r}`, `W${r}-Z${r}`) };
  const comRow = ctx.comisiones ? h.ventaDayRow(ctx.comisiones, day.day) : null;
  if (comRow) {
    const cd = h.ref(ctx.supports.comisiones, 2, comRow);
    ws.getCell(r, 30).value = { formula: h.both(cd, cd, cd) };
  }
  ws.getCell(r, 32).value = { formula: h.both(`AB${r}`, `AD${r}`, `AB${r}+AD${r}`) };
  ws.getCell(r, 33).value = { formula: h.both(`AF${r}`, b, `AF${r}*${b}`) };
  for (const c of [2, 4, 25]) {
    if (typeof ws.getCell(r, c).value === "object") ws.getCell(r, c).numFmt = FMT_INT;
  }
  for (const c of [3, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 23, 26, 28, 30, 32]) {
    if (typeof ws.getCell(r, c).value === "object" || typeof ws.getCell(r, c).value === "number") ws.getCell(r, c).numFmt = FMT_2;
  }
  if (typeof ws.getCell(r, 33).value === "object") ws.getCell(r, 33).numFmt = FMT_MONEY;
  for (const c of [8, 15, 23, 28]) h.paint(ws.getCell(r, c), RESULT_BLUE);
  h.paint(ws.getCell(r, 33), AF_BLUE);
  if (day.inhabil && !flags.corporate) h.paint(ws.getCell(r, 13), YELLOW);
  if (day.inhabil && !flags.operative) h.paint(ws.getCell(r, 21), YELLOW);
  writeDetailedInsights(h, ws, r, day, ctx.insights);
}

function weightedPresent(h, col, row, names) {
  const refs = h.sheetRefs(col, row, names);
  const kilos = h.sheetRefs(2, row, names);
  if (!refs.length) return '""';
  const nums = refs.map((addr, i) => `IF(AND(ISNUMBER(${addr}),ISNUMBER(${kilos[i]})),${addr}*${kilos[i]},0)`);
  return `IF(OR(NOT(ISNUMBER(B${row})),B${row}=0,COUNT(${refs.join(",")})=0),"",(${nums.join("+")})/B${row})`;
}

function writeDetailedProvinceDay(h, ws, r, day, ctx) {
  const fecha = new Date(Date.UTC(ctx.year, ctx.month - 1, day.day));
  const a = ws.getCell(r, 1);
  a.value = fecha;
  a.numFmt = "dd/mm/yyyy";
  h.paint(a, DATE_BLUE, { name: "Calibri", size: 11 });
  const names = ctx.plantSheets;
  const b = `B${r}`;
  ws.getCell(r, 2).value = { formula: h.sumAcross(2, r, names) };
  ws.getCell(r, 4).value = { formula: h.completeSumAcross(4, r, names) };
  ws.getCell(r, 3).value = { formula: `IF(AND(${h.numRef(`D${r}`)},${h.numRef(b)},${b}<>0),D${r}/${b},"")` };
  ws.getCell(r, 6).value = { formula: h.weightedAcross(6, r, names) };
  ws.getCell(r, 7).value = { formula: h.weightedAcross(7, r, names) };
  ws.getCell(r, 8).value = { formula: `IF(AND(${h.numRef(`C${r}`)},${h.numRef(`F${r}`)},${h.numRef(`G${r}`)}),C${r}-F${r}-G${r},"")` };
  for (const [col] of CORP.concat(OPER)) {
    ws.getCell(r, col).value = {
      formula: day.inhabil ? h.sumAcross(col, r, names) : weightedPresent(h, col, r, names),
    };
    ws.getCell(r, col).numFmt = FMT_2;
  }
  ws.getCell(r, 13).value = { formula: day.inhabil ? h.sumAcross(13, r, names) : h.weightedAcross(13, r, names) };
  ws.getCell(r, 21).value = { formula: day.inhabil ? h.sumAcross(21, r, names) : h.weightedAcross(21, r, names) };
  ws.getCell(r, 15).value = { formula: `IF(AND(${h.numRef(`H${r}`)},${h.numRef(`M${r}`)}),H${r}-M${r},IF(${h.numRef(`H${r}`)},H${r},""))` };
  ws.getCell(r, 23).value = { formula: `IF(AND(${h.numRef(`O${r}`)},${h.numRef(`U${r}`)}),O${r}-U${r},IF(${h.numRef(`O${r}`)},O${r},""))` };
  ws.getCell(r, 25).value = { formula: h.sumAcross(25, r, names) };
  ws.getCell(r, 26).value = { formula: `IF(AND(${h.numRef(`Y${r}`)},${h.numRef(b)},${b}<>0),Y${r}/${b},"")` };
  ws.getCell(r, 28).value = { formula: h.both(`W${r}`, `Z${r}`, `W${r}-Z${r}`) };
  ws.getCell(r, 30).value = { formula: h.weightedAcross(30, r, names) };
  ws.getCell(r, 33).value = { formula: h.sumAcross(33, r, names) };
  ws.getCell(r, 32).value = { formula: `IF(OR(NOT(ISNUMBER(${b})),${b}=0),"",AG${r}/${b})` };
  for (const c of [2, 4, 25]) ws.getCell(r, c).numFmt = FMT_INT;
  for (const c of [3, 6, 7, 8, 13, 15, 21, 23, 26, 28, 30, 32]) ws.getCell(r, c).numFmt = FMT_2;
  ws.getCell(r, 33).numFmt = FMT_MONEY;
  for (const c of [8, 15, 23, 28]) h.paint(ws.getCell(r, c), RESULT_BLUE);
  h.paint(ws.getCell(r, 33), AF_BLUE);
  writeDetailedInsights(h, ws, r, day, ctx.insights);
}

function paintDetailedSubtotal(h, ws, r) {
  h.paint(ws.getCell(r, 1), WEEK_BLACK, { bold: true, color: { argb: WHITE }, name: "Calibri", size: 11 });
  const font = { bold: true, color: { argb: BLACK }, name: "Calibri", size: 11 };
  for (let c = 2; c <= 33; c += 1) h.paint(ws.getCell(r, c), WEEK_GRAY, font);
}

function assignedCents(schedules, key, fecha) {
  const map = schedules && schedules[key];
  const money = map ? map[fecha] : null;
  const cents = distribucion.toCents(money);
  return cents == null ? 0 : cents;
}

function weekCents(schedules, key, weekDays) {
  const map = (schedules && schedules[key]) || {};
  let cents = 0;
  for (const day of weekDays || []) {
    const part = distribucion.toCents(map[day.fecha]);
    if (part != null) cents += part;
  }
  return cents;
}

function componentWeekFormula(cents, row) {
  return `IF(OR(NOT(ISNUMBER(B${row})),B${row}<=0),"",${moneyLiteral(cents)}/B${row})`;
}

function componentMonthFormula(letter, row) {
  return `IF(OR(NOT(ISNUMBER($${letter}$3)),NOT(ISNUMBER(B${row})),B${row}<=0),"",$${letter}$3/B${row})`;
}

function writeDetailedWeek(h, ws, r, n, start, end, spec) {
  ws.getCell(r, 1).value = `Semana ${n}`;
  if (start == null || end == null || end < start) {
    paintDetailedSubtotal(h, ws, r);
    ws.getRow(r).height = 18.6;
    return;
  }
  const flags = spec.flags || {};
  const strict = Boolean(spec.strict);
  const skip = spec.skip || [];
  const rows = [];
  for (let row = start; row <= end; row += 1) rows.push(row);
  ws.getCell(r, 2).value = { formula: h.sumIfNumeric(`B${start}:B${end}`) };
  ws.getCell(r, 4).value = {
    formula: strict ? h.withCoverage(rows, "D", h.sumIfNumeric(`D${start}:D${end}`)) : h.sumIfNumeric(`D${start}:D${end}`),
  };
  if (spec.province) {
    for (const [col] of CORP.concat(OPER)) {
      ws.getCell(r, col).value = { formula: h.weightedAcross(col, r, spec.plantSheets) };
    }
    ws.getCell(r, 13).value = { formula: h.weightedAcross(13, r, spec.plantSheets) };
    ws.getCell(r, 21).value = { formula: h.weightedAcross(21, r, spec.plantSheets) };
  } else {
    if (flags.corporate) {
      for (const [col, , key] of CORP) {
        ws.getCell(r, col).value = { formula: componentWeekFormula(weekCents(spec.schedules, key, spec.weekDays), r) };
      }
      ws.getCell(r, 13).value = { formula: `J${r}+K${r}+L${r}` };
    }
    if (flags.operative) {
      for (const [col, , key] of OPER) {
        ws.getCell(r, col).value = { formula: componentWeekFormula(weekCents(spec.schedules, key, spec.weekDays), r) };
      }
      ws.getCell(r, 21).value = { formula: `Q${r}+R${r}+S${r}+T${r}` };
    }
  }
  ws.getCell(r, 25).value = { formula: h.sumIfNumeric(`Y${start}:Y${end}`) };
  ws.getCell(r, 33).value = { formula: h.sumIfNumeric(`AG${start}:AG${end}`) };
  const weightedCols = ["C", "F", "G", "H", "O", "W", "Z", "AB", "AD"];
  if (!spec.province && !flags.corporate) weightedCols.push("M");
  if (!spec.province && !flags.operative) weightedCols.push("U");
  for (const col of weightedCols) {
    const idx = h.colLetterToIndex(col);
    const base = h.weighted(col, start, end);
    const skipRows = col === "M" || col === "U" ? skip : [];
    ws.getCell(r, idx).value = { formula: strict ? h.withCoverage(rows, col, base, skipRows) : base };
  }
  ws.getCell(r, 32).value = { formula: `IF(OR(NOT(ISNUMBER(B${r})),B${r}=0),"",AG${r}/B${r})` };
  paintDetailedSubtotal(h, ws, r);
  ws.getRow(r).height = 18.6;
  ws.getCell(r, 2).numFmt = FMT_INT;
  for (const c of [3, 4, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 23, 25, 26, 28, 30, 32, 33]) {
    ws.getCell(r, c).numFmt = c === 33 ? FMT_MONEY : FMT_2;
  }
}

function writeDetailedTotal(h, ws, r, dayRows, spec) {
  ws.getCell(r, 1).value = "TOTAL MES";
  const flags = spec.flags || {};
  const strict = Boolean(spec.strict);
  const skip = spec.skip || [];
  const sumCols = [[2, "B"], [4, "D"], [25, "Y"], [33, "AG"]];
  for (const [idx, letter] of sumCols) {
    const parts = spec.weekRows.map((row) => `${letter}${row}`);
    if (!parts.length) continue;
    const base = h.sumIfNumeric(parts.join(","));
    if (strict && letter === "D") {
      ws.getCell(r, idx).value = { formula: h.withCoverage(dayRows, "D", h.sumIfNumeric(dayRows.map((row) => `D${row}`).join(","))) };
    } else {
      ws.getCell(r, idx).value = { formula: base };
    }
  }
  if (spec.province) {
    for (const [col, letter] of CORP.concat(OPER)) {
      ws.getCell(r, col).value = { formula: componentMonthFormula(letter, r) };
    }
    ws.getCell(r, 13).value = { formula: h.weightedAcross(13, r, spec.plantSheets) };
    ws.getCell(r, 21).value = { formula: h.weightedAcross(21, r, spec.plantSheets) };
  } else {
    if (flags.corporate) {
      for (const [col, letter] of CORP) ws.getCell(r, col).value = { formula: componentMonthFormula(letter, r) };
      ws.getCell(r, 13).value = { formula: `J${r}+K${r}+L${r}` };
    }
    if (flags.operative) {
      for (const [col, letter] of OPER) ws.getCell(r, col).value = { formula: componentMonthFormula(letter, r) };
      ws.getCell(r, 21).value = { formula: `Q${r}+R${r}+S${r}+T${r}` };
    }
  }
  const weightedCols = ["C", "F", "G", "H", "O", "W", "Z", "AB", "AD"];
  if (!spec.province && !flags.corporate) weightedCols.push("M");
  if (!spec.province && !flags.operative) weightedCols.push("U");
  for (const col of weightedCols) {
    if (!dayRows.length) continue;
    const base = h.weightedRows(col, dayRows);
    const skipRows = col === "M" || col === "U" ? skip : [];
    ws.getCell(r, h.colLetterToIndex(col)).value = {
      formula: strict ? h.withCoverage(dayRows, col, base, skipRows) : base,
    };
  }
  ws.getCell(r, 32).value = { formula: `IF(OR(NOT(ISNUMBER(B${r})),B${r}=0),"",AG${r}/B${r})` };
  paintDetailedSubtotal(h, ws, r);
  ws.getRow(r).height = 18.6;
  ws.getCell(r, 2).numFmt = FMT_INT;
  for (const c of [3, 4, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 23, 25, 26, 28, 30, 32, 33]) {
    ws.getCell(r, c).numFmt = c === 33 ? FMT_MONEY : FMT_2;
  }
}

function applyDetailedWidths(ws) {
  const widths = {
    1: 16.5547, 2: 14, 4: 15.2188, 8: 13.5547,
    10: 18, 11: 16, 12: 18, 13: 23.2188, 15: 15.5547,
    17: 22, 18: 20, 19: 16, 20: 22, 21: 21.332,
    23: 20.7773, 25: 14.7773, 26: 13, 28: 20.7773, 30: 20.7773,
    32: 16.5547, 33: 16.5547, 35: 65.8867, 36: 48,
  };
  for (const [col, width] of Object.entries(widths)) ws.getColumn(Number(col)).width = width;
  for (const col of [5, 9, 14, 16, 22, 24, 27, 29, 31, 34]) ws.getColumn(col).width = 2.2188;
}

function hideDetailedCarry(ws) {
  ws.getColumn(35).hidden = false;
  ws.getColumn(36).hidden = false;
  ws.getColumn(37).hidden = true;
  ws.getColumn(38).hidden = true;
}

function schedulesFor(opts, cal, flags) {
  const provided = (opts && opts.distribucionOverrides) || {};
  const amounts = (flags && flags.amounts) || {};
  const keys = [];
  if (flags && flags.corporate) keys.push("gasto_corporativo", "inversiones", "impuestos_federales");
  if (flags && flags.operative) keys.push("presupuesto_nomina_gastos", "presupuesto_imss_sua", "extraordinarios", "provisiones_planta");
  const out = {};
  for (const key of keys) {
    const built = distribucion.buildExpenseDailySchedule({
      monthlyAmount: amounts[key] == null ? 0 : amounts[key],
      days: cal.days,
      overrides: provided[key] || {},
    });
    out[key] = built.byFecha;
  }
  return out;
}

function fillPlant(wb, opts, h) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const sheetLabel = opts && opts.sheetLabel != null ? String(opts.sheetLabel).trim() : "";
  const humanName = opts && opts.humanName != null ? String(opts.humanName).trim() : "";
  const supports = h.supportNames(opts);
  const ws = sheetLabel ? h.reserveSheet(wb, sheetLabel) : h.reserveSheet(wb);
  const cal = h.monthBusinessDays(year, month, opts && opts.cierresEmpresariales);
  const weeks = h.weeksOf(cal.days);
  const venta = wb.getWorksheet(supports.venta);
  const comisiones = wb.getWorksheet(supports.comisiones);
  const precio = wb.getWorksheet(supports.precio);
  const compras = wb.getWorksheet(supports.compras);
  const canals = venta ? h.canalCols(venta, opts && opts.plantEquivalent) : { casa: null, com: null };
  const cols = compras ? h.comprasCols(compras) : { costo: null, tarifa: null, hgImporte: null };
  const precioRows = precio ? h.mapDayRows(precio, year, month, h.cellYmd) : new Map();
  const compraRows = compras ? h.mapDayRows(compras, year, month, h.cellYmd) : new Map();
  const corte = h.resolveCorteYmd(opts);
  const flags = flagsOf(opts);
  const schedules = schedulesFor(opts, cal, flags);
  paintDetailedChrome(h, ws, {
    year,
    month,
    plantTitle: humanName ? `PLANTA ${humanName.toUpperCase()}` : "PLANTA PUEBLA",
    corporativos: opts && opts.corporativos,
    operativos: opts && opts.operativos,
    desglose: opts && opts.desglose,
  });
  const dayRows = [];
  const weekRows = [];
  const history = [];
  let r = 6;
  weeks.forEach((week, index) => {
    const start = r;
    let includedEnd = null;
    for (const day of week) {
      const historical = Boolean(corte) && day.fecha < corte;
      const prior = history.filter((item) => item.fecha < day.fecha && item.fecha < corte);
      writeDetailedDay(h, ws, r, day, {
        year, month, habiles: cal.habiles, venta, comisiones, compras, canals, cols,
        precioRows, compraRows, corte, prior, supports, flags, schedules,
        insights: opts && opts.dailyInsights,
        marginOverrides: opts && opts.marginOverrides,
      });
      dayRows.push(r);
      includedEnd = r;
      history.push({
        fecha: day.fecha,
        row: r,
        costo: historical && compraRows.get(day.fecha) && cols.costo ? h.ref(supports.compras, cols.costo, compraRows.get(day.fecha)) : null,
        flete: historical && compraRows.get(day.fecha) && cols.tarifa ? h.ref(supports.compras, cols.tarifa, compraRows.get(day.fecha)) : null,
      });
      r += 1;
    }
    if (index === weeks.length - 1) r += 1;
    writeDetailedWeek(h, ws, r, index + 1, includedEnd == null ? null : start, includedEnd, {
      habiles: cal.habiles,
      weekHabiles: week.filter((day) => !day.inhabil).length,
      weekDays: week,
      schedules,
      flags,
    });
    if (includedEnd != null) weekRows.push(r);
    r += 2;
  });
  writeDetailedTotal(h, ws, r, dayRows, { flags, weekRows });
  applyDetailedWidths(ws);
  hideDetailedCarry(ws);
  return ws;
}

function fillProvince(wb, opts, h) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const plantSheets = (opts && opts.plantSheets) || [];
  const ws = h.reserveSheet(wb, "Provincia");
  if (ws.name !== "IGF Diario Provincia") ws.name = "IGF Diario Provincia";
  const cal = h.monthBusinessDays(year, month, opts && opts.cierresEmpresariales);
  const weeks = h.weeksOf(cal.days);
  paintDetailedChrome(h, ws, {
    year,
    month,
    plantTitle: "PLANTA PROVINCIA",
    plantSheets,
    desglose: opts && opts.desglose,
  });
  const dayRows = [];
  const weekRows = [];
  const inhabilRows = [];
  let r = 6;
  weeks.forEach((week, index) => {
    const start = r;
    let includedEnd = null;
    const weekInhabil = [];
    for (const day of week) {
      writeDetailedProvinceDay(h, ws, r, day, {
        year, month, plantSheets, insights: opts && opts.dailyInsights,
      });
      dayRows.push(r);
      if (day.inhabil) {
        inhabilRows.push(r);
        weekInhabil.push(r);
      }
      includedEnd = r;
      r += 1;
    }
    if (index === weeks.length - 1) r += 1;
    writeDetailedWeek(h, ws, r, index + 1, includedEnd == null ? null : start, includedEnd, {
      habiles: cal.habiles,
      weekHabiles: week.filter((day) => !day.inhabil).length,
      province: true,
      plantSheets,
      strict: true,
      skip: weekInhabil,
    });
    if (includedEnd != null) weekRows.push(r);
    r += 2;
  });
  writeDetailedTotal(h, ws, r, dayRows, {
    province: true,
    plantSheets,
    strict: true,
    skip: inhabilRows,
    weekRows,
  });
  applyDetailedWidths(ws);
  hideDetailedCarry(ws);
  return ws;
}

module.exports = {
  fillPlant,
  fillProvince,
};
