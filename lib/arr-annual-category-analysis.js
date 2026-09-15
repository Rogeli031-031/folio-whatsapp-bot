"use strict";

/**
 * Análisis anual CASA / COMISIONISTA para el Excel ARR.
 * Fuente de venta: arr.ventas_diarias_cliente (SUM kg, enero→mes seleccionado).
 * Fuente de comentarios: arr.cliente_comentarios (último body activo).
 * No inventa causa. No toca hojas CASA / COMISIONISTA / EVALUACION.
 * Las hojas por planta reutilizan el mismo payload anual; no recalculan YTD.
 */

const ExcelJS = require("exceljs");

const SHEET_CASA = "CASA ANUAL";
const SHEET_COMISIONISTA = "COMISIONISTA ANUAL";

const PLANT_ROWS = Object.freeze([
  "Puebla",
  "Tehuacán",
  "Acapulco",
  "Querétaro",
  "San Luis",
  "Morelos",
]);

const PLANT_SHEETS = Object.freeze([
  { sheet: "PUEBLA", planta: "Puebla" },
  { sheet: "TEHUACAN", planta: "Tehuacán" },
  { sheet: "ACAPULCO", planta: "Acapulco" },
  { sheet: "QUERETARO", planta: "Querétaro" },
  { sheet: "SAN LUIS", planta: "San Luis" },
  { sheet: "MORELOS", planta: "Morelos" },
]);

const SUBCATS = Object.freeze({
  AUTOTANQUE: "Autotanque",
  PORTATIL: "Portátil",
  CARBURACION: "Carburación",
});

const MOVEMENT = Object.freeze({
  DISMINUYERON: "DISMINUYERON",
  DEJARON: "DEJARON DE COMPRAR",
  AUMENTARON: "AUMENTARON",
  NUEVOS: "NUEVOS",
});

const MISSING_COMMENT = "Sin comentario registrado";

const MONTHS_ES = Object.freeze([
  "",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]);

const F_HEADER = "FF1F3864";
const FONT_HEADER = "FFFFFFFF";
const F_TITLE = "FFE8EEF4";
const F_TOTAL = "FFDDE4EC";
const F_NEG_SECTION = "FFB91C1C";
const F_POS_SECTION = "FF047857";
const F_NEG = "FFFECACA";
const F_POS = "FFBBF7D0";
const F_DATA = "FFF7F7F7";

function normText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function kgToTon(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1000) * 10000) / 10000;
}

function roundTon(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ytdRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const endDay = lastDayOfMonth(y, m);
  return {
    year: y,
    month: m,
    start: `${y}-01-01`,
    end: `${y}-${pad2(m)}-${pad2(endDay)}`,
    months: Array.from({ length: m }, (_, i) => i + 1),
  };
}

function compareRanges(year, month) {
  const current = ytdRange(year, month);
  const previous = ytdRange(year - 1, month);
  if (!current || !previous) return null;
  return { current, previous };
}

function formatPeriodLabel(ranges) {
  if (!ranges) return "";
  const m = MONTHS_ES[ranges.current.month];
  return `enero–${m} ${ranges.current.year} vs enero–${m} ${ranges.previous.year}`;
}

function resolvePlantLabel(plantCode) {
  const n = normText(plantCode);
  if (!n) return null;
  if (n.includes("puebla")) return "Puebla";
  if (n.includes("tehuacan")) return "Tehuacán";
  if (n.includes("acapulco")) return "Acapulco";
  if (n.includes("queretaro")) return "Querétaro";
  if (n.includes("san luis")) return "San Luis";
  if (n.includes("morelos")) return "Morelos";
  return null;
}

function resolveSubcategoria(subcanal) {
  const n = normText(subcanal);
  if (!n) return null;
  if (n.includes("autotanque")) return SUBCATS.AUTOTANQUE;
  if (n.includes("portatil")) return SUBCATS.PORTATIL;
  if (n.includes("carburacion")) return SUBCATS.CARBURACION;
  return null;
}

function resolveCategoria(canal) {
  const n = normText(canal);
  if (n === "comisionista" || n.startsWith("comisionista ") || n.includes(" comisionista")) {
    return "COMISIONISTA";
  }
  return "CASA";
}

function classifyMovement(prevTon, currTon) {
  const prev = Number(prevTon) || 0;
  const curr = Number(currTon) || 0;
  if (prev > 0 && curr <= 0) return MOVEMENT.DEJARON;
  if (prev <= 0 && curr > 0) return MOVEMENT.NUEVOS;
  if (prev > 0 && curr > 0 && curr < prev) return MOVEMENT.DISMINUYERON;
  if (prev > 0 && curr > 0 && curr > prev) return MOVEMENT.AUMENTARON;
  return null;
}

function isNegativeMovement(type) {
  return type === MOVEMENT.DISMINUYERON || type === MOVEMENT.DEJARON;
}

function contributionRatio(clientDelta, denom) {
  const d = Number(clientDelta);
  const den = Number(denom);
  if (!Number.isFinite(d) || !Number.isFinite(den) || den === 0) return null;
  return d / den;
}

function emptyMatrixRow(planta) {
  return {
    planta,
    autotanque: 0,
    portatil: 0,
    carburacion: 0,
    total: 0,
  };
}

function addToMatrixRow(row, subcat, delta) {
  if (subcat === SUBCATS.AUTOTANQUE) row.autotanque = roundTon(row.autotanque + delta);
  else if (subcat === SUBCATS.PORTATIL) row.portatil = roundTon(row.portatil + delta);
  else if (subcat === SUBCATS.CARBURACION) row.carburacion = roundTon(row.carburacion + delta);
  row.total = roundTon(row.autotanque + row.portatil + row.carburacion);
}

function commentKey(planta, cliente) {
  return `${normText(planta)}|${normText(cliente)}`;
}

function buildCommentMap(commentRows) {
  const map = new Map();
  const list = Array.isArray(commentRows) ? commentRows.slice() : [];
  list.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  for (const row of list) {
    const planta = resolvePlantLabel(row.planta_nombre || row.planta || row.plant_code);
    const cliente = row.cliente_nombre || row.cliente_norm || "";
    if (!planta || !cliente) continue;
    const key = commentKey(planta, cliente);
    if (map.has(key)) continue;
    const body = String(row.body || "").trim();
    map.set(key, body || MISSING_COMMENT);
  }
  return map;
}

function lookupComment(map, planta, cliente) {
  const body = map.get(commentKey(planta, cliente));
  if (!body) return MISSING_COMMENT;
  return body;
}

function aggregateSales(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const planta = resolvePlantLabel(row.plant_code);
    const categoria = resolveCategoria(row.canal);
    const subcategoria = resolveSubcategoria(row.subcanal);
    const cliente = String(row.cliente_norm || row.cliente || "").trim();
    if (!planta || !subcategoria || !cliente) continue;
    const key = `${planta}|${categoria}|${subcategoria}|${normText(cliente)}`;
    const prev = map.get(key) || {
      planta,
      categoria,
      subcategoria,
      cliente,
      kg: 0,
    };
    prev.kg += Number(row.kg) || 0;
    map.set(key, prev);
  }
  return map;
}

function buildAnnualAnalysis(opts) {
  const year = Number(opts && opts.year);
  const month = Number(opts && opts.month);
  const ranges = compareRanges(year, month);
  if (!ranges) {
    return {
      ok: false,
      error: "Indica year y month válidos. No invento el periodo.",
    };
  }

  const prevMap = aggregateSales(opts.prevRows || []);
  const currMap = aggregateSales(opts.currRows || []);
  const comments = buildCommentMap(opts.commentRows || []);
  const keys = new Set([...prevMap.keys(), ...currMap.keys()]);

  const matrices = {
    CASA: new Map(PLANT_ROWS.map((p) => [p, emptyMatrixRow(p)])),
    COMISIONISTA: new Map(PLANT_ROWS.map((p) => [p, emptyMatrixRow(p)])),
  };
  const clients = { CASA: [], COMISIONISTA: [] };

  for (const key of keys) {
    const prev = prevMap.get(key);
    const curr = currMap.get(key);
    const base = curr || prev;
    const prevTon = kgToTon(prev ? prev.kg : 0);
    const currTon = kgToTon(curr ? curr.kg : 0);
    const delta = roundTon(currTon - prevTon);
    const movement = classifyMovement(prevTon, currTon);
    if (!movement) continue;
    addToMatrixRow(matrices[base.categoria].get(base.planta), base.subcategoria, delta);
    clients[base.categoria].push({
      planta: base.planta,
      subcategoria: base.subcategoria,
      cliente: base.cliente,
      ytd_prev_ton: prevTon,
      ytd_curr_ton: currTon,
      delta_ton: delta,
      movimiento: movement,
      comment: lookupComment(comments, base.planta, base.cliente),
    });
  }

  function finalizeCategory(categoria) {
    const matrix = PLANT_ROWS.map((p) => {
      const row = matrices[categoria].get(p);
      row.total = roundTon(row.autotanque + row.portatil + row.carburacion);
      return row;
    });
    const total = emptyMatrixRow("TOTAL");
    for (const row of matrix) {
      total.autotanque = roundTon(total.autotanque + row.autotanque);
      total.portatil = roundTon(total.portatil + row.portatil);
      total.carburacion = roundTon(total.carburacion + row.carburacion);
    }
    total.total = roundTon(total.autotanque + total.portatil + total.carburacion);

    const denomOf = (c) => {
      const row = matrices[categoria].get(c.planta);
      if (!row) return 0;
      if (c.subcategoria === SUBCATS.AUTOTANQUE) return row.autotanque;
      if (c.subcategoria === SUBCATS.PORTATIL) return row.portatil;
      return row.carburacion;
    };

    const withContrib = clients[categoria].map((c) => ({
      ...c,
      contribucion: contributionRatio(c.delta_ton, denomOf(c)),
    }));

    const negative = withContrib
      .filter((c) => isNegativeMovement(c.movimiento))
      .sort((a, b) => a.delta_ton - b.delta_ton);
    const positive = withContrib
      .filter((c) => !isNegativeMovement(c.movimiento))
      .sort((a, b) => b.delta_ton - a.delta_ton);

    return { matrix, total, negative, positive };
  }

  return {
    ok: true,
    period_label: formatPeriodLabel(ranges),
    ranges,
    casa: finalizeCategory("CASA"),
    comisionista: finalizeCategory("COMISIONISTA"),
  };
}

const VENTAS_PLANT_CODES = Object.freeze([
  "Puebla",
  "Tehuacan",
  "Tehuacán",
  "Acapulco",
  "Queretaro",
  "Querétaro",
  "San Luis",
  "Morelos",
]);

async function queryYtdSales(client, start, end) {
  const r = await client.query(
    `SELECT plant_code, cliente_norm, canal, subcanal, SUM(kg) AS kg
       FROM arr.ventas_diarias_cliente
      WHERE fecha >= $1::date
        AND fecha <= $2::date
        AND plant_code = ANY($3::text[])
      GROUP BY plant_code, cliente_norm, canal, subcanal`,
    [start, end, VENTAS_PLANT_CODES.slice()]
  );
  return r.rows || [];
}

async function queryLatestComments(client) {
  const r = await client.query(
    `SELECT DISTINCT ON (c.planta_id, lower(trim(c.cliente_nombre)))
            c.planta_id,
            p.nombre AS planta_nombre,
            c.cliente_nombre,
            c.body,
            c.created_at
       FROM arr.cliente_comentarios c
       JOIN public.plantas p ON p.id = c.planta_id
      WHERE c.is_active = true
      ORDER BY c.planta_id, lower(trim(c.cliente_nombre)), c.created_at DESC, c.id DESC`
  );
  return r.rows || [];
}

async function loadAnnualCategoryAnalysis(client, opts = {}) {
  const ranges = compareRanges(opts.year, opts.month);
  if (!ranges) {
    return { ok: false, status: 400, error: "Faltan year y month válidos" };
  }
  const querySales = opts.queryYtdSales || queryYtdSales;
  const queryComments = opts.queryLatestComments || queryLatestComments;
  let prevRows;
  let currRows;
  let commentRows = [];
  try {
    prevRows = await querySales(client, ranges.previous.start, ranges.previous.end);
    currRows = await querySales(client, ranges.current.start, ranges.current.end);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: e && e.message ? e.message : "No se pudo leer arr.ventas_diarias_cliente",
    };
  }
  try {
    commentRows = await queryComments(client);
  } catch (_e) {
    commentRows = [];
  }
  return buildAnnualAnalysis({
    year: ranges.current.year,
    month: ranges.current.month,
    prevRows,
    currRows,
    commentRows,
  });
}

function sanitizeExcelText(v) {
  if (v == null) return "";
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function styleHeader(row, lastCol, fill) {
  row.height = 20;
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > lastCol) return;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill || F_HEADER } };
    cell.font = { bold: true, color: { argb: FONT_HEADER }, size: 10 };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
}

function paintDelta(cell, value) {
  cell.value = value;
  cell.numFmt = "#,##0.000";
  cell.alignment = { horizontal: "right" };
  if (value > 0) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_POS } };
    cell.font = { color: { argb: "FF14532D" } };
  } else if (value < 0) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_NEG } };
    cell.font = { color: { argb: "FF7F1D1D" } };
  }
}

function writeMatrix(ws, categoria, block, periodLabel) {
  ws.mergeCells(1, 1, 1, 5);
  const title = ws.getCell(1, 1);
  title.value = `${categoria} · análisis anual YTD`;
  title.font = { bold: true, size: 13 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TITLE } };

  ws.mergeCells(2, 1, 2, 5);
  const period = ws.getCell(2, 1);
  period.value = sanitizeExcelText(periodLabel);
  period.font = { italic: true, size: 9, color: { argb: "FF555555" } };

  const hdr = ws.getRow(4);
  hdr.values = [
    "PLANTA",
    "AUTOTANQUE Δ TON",
    "PORTÁTIL Δ TON",
    "CARBURACIÓN Δ TON",
    "TOTAL Δ TON",
  ];
  styleHeader(hdr, 5);

  block.matrix.forEach((row, i) => {
    const excelRow = 5 + i;
    const r = ws.getRow(excelRow);
    r.getCell(1).value = row.planta;
    paintDelta(r.getCell(2), row.autotanque);
    paintDelta(r.getCell(3), row.portatil);
    paintDelta(r.getCell(4), row.carburacion);
    r.getCell(5).value = { formula: `B${excelRow}+C${excelRow}+D${excelRow}` };
    r.getCell(5).numFmt = "#,##0.000";
  });

  const totalExcelRow = 11;
  const tot = ws.getRow(totalExcelRow);
  tot.getCell(1).value = "TOTAL";
  tot.getCell(1).font = { bold: true };
  tot.getCell(2).value = { formula: "SUM(B5:B10)" };
  tot.getCell(3).value = { formula: "SUM(C5:C10)" };
  tot.getCell(4).value = { formula: "SUM(D5:D10)" };
  tot.getCell(5).value = { formula: "B11+C11+D11" };
  for (const col of [2, 3, 4, 5]) {
    tot.getCell(col).numFmt = "#,##0.000";
    tot.getCell(col).font = { bold: true };
    tot.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TOTAL } };
  }
  tot.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TOTAL } };
  return 13;
}

const CLIENT_HEADERS = [
  "PLANTA",
  "SUBCATEGORÍA",
  "CLIENTE",
  "VENTA YTD AÑO ANTERIOR (TON)",
  "VENTA YTD AÑO ACTUAL (TON)",
  "DELTA VENTA (TON)",
  "TIPO DE MOVIMIENTO",
  "CONTRIBUCIÓN AL MOVIMIENTO (%)",
  "COMENTARIO / EVIDENCIA REGISTRADA",
];

function writeClientSection(ws, startRow, title, fill, rows) {
  ws.mergeCells(startRow, 1, startRow, 9);
  const cell = ws.getCell(startRow, 1);
  cell.value = title;
  cell.font = { bold: true, color: { argb: FONT_HEADER }, size: 11 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };

  const hdrRow = startRow + 1;
  const hdr = ws.getRow(hdrRow);
  hdr.values = CLIENT_HEADERS;
  styleHeader(hdr, 9);

  let r = hdrRow + 1;
  const dataStart = r;
  for (const item of rows) {
    const row = ws.getRow(r);
    row.values = [
      item.planta,
      item.subcategoria,
      sanitizeExcelText(item.cliente),
      item.ytd_prev_ton,
      item.ytd_curr_ton,
      item.delta_ton,
      item.movimiento,
      item.contribucion == null ? "—" : item.contribucion,
      sanitizeExcelText(item.comment || MISSING_COMMENT),
    ];
    row.getCell(4).numFmt = "#,##0.000";
    row.getCell(5).numFmt = "#,##0.000";
    paintDelta(row.getCell(6), item.delta_ton);
    if (item.contribucion == null) {
      row.getCell(8).alignment = { horizontal: "center" };
    } else {
      row.getCell(8).numFmt = "0.0%";
    }
    row.getCell(9).alignment = { wrapText: true, vertical: "top" };
    if (r % 2 === 0) {
      for (const col of [1, 2, 3, 4, 5, 7, 8, 9]) {
        if (!row.getCell(col).fill || !row.getCell(col).fill.fgColor) {
          row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_DATA } };
        }
      }
    }
    r += 1;
  }
  if (rows.length) {
    ws.autoFilter = ws.autoFilter
      ? ws.autoFilter
      : { from: { row: hdrRow, column: 1 }, to: { row: r - 1, column: 9 } };
    const dataEnd = r - 1;
    try {
      ws.autoFilter = {
        from: { row: hdrRow, column: 1 },
        to: { row: dataEnd, column: 9 },
      };
    } catch (_e) {
      /* una hoja solo admite un autofilter */
    }
  }
  return r + 1;
}

function writeCategorySheet(wb, name, categoria, block, periodLabel) {
  const existing = wb.getWorksheet(name);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(name, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 4, showGridLines: true }],
  });
  writeMatrix(ws, categoria, block, periodLabel);
  let next = writeClientSection(
    ws,
    13,
    "CLIENTES CON IMPACTO NEGATIVO",
    F_NEG_SECTION,
    block.negative
  );
  writeClientSection(ws, next, "CLIENTES CON IMPACTO POSITIVO", F_POS_SECTION, block.positive);
  ws.columns = [
    { width: 16 },
    { width: 16 },
    { width: 36 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
    { width: 18 },
    { width: 48 },
  ];
  return ws;
}

const PLANT_CLIENT_HEADERS = [
  "SUBCATEGORÍA",
  "CLIENTE",
  "VENTA YTD AÑO ANTERIOR (TON)",
  "VENTA YTD AÑO ACTUAL (TON)",
  "DELTA VENTA (TON)",
  "TIPO DE MOVIMIENTO",
  "CONTRIBUCIÓN AL MOVIMIENTO (%)",
  "COMENTARIO / EVIDENCIA REGISTRADA",
];

function clientsForPlant(rows, planta) {
  return (rows || []).filter((c) => c.planta === planta);
}

function writePlantSummary(ws, startRow, title, row) {
  ws.mergeCells(startRow, 1, startRow, 8);
  const cell = ws.getCell(startRow, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TITLE } };

  const hdr = ws.getRow(startRow + 1);
  hdr.values = ["AUTOTANQUE Δ TON", "PORTÁTIL Δ TON", "CARBURACIÓN Δ TON", "TOTAL Δ TON"];
  styleHeader(hdr, 4);

  const valRow = startRow + 2;
  const r = ws.getRow(valRow);
  paintDelta(r.getCell(1), row.autotanque);
  paintDelta(r.getCell(2), row.portatil);
  paintDelta(r.getCell(3), row.carburacion);
  r.getCell(4).value = { formula: `A${valRow}+B${valRow}+C${valRow}` };
  r.getCell(4).numFmt = "#,##0.000";
  r.getCell(4).font = { bold: true };
  return startRow + 4;
}

function writePlantClientSection(ws, startRow, title, fill, rows) {
  ws.mergeCells(startRow, 1, startRow, 8);
  const cell = ws.getCell(startRow, 1);
  cell.value = title;
  cell.font = { bold: true, color: { argb: FONT_HEADER }, size: 11 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };

  const hdrRow = startRow + 1;
  const hdr = ws.getRow(hdrRow);
  hdr.values = PLANT_CLIENT_HEADERS;
  styleHeader(hdr, 8);

  let r = hdrRow + 1;
  for (const item of rows) {
    const row = ws.getRow(r);
    row.values = [
      item.subcategoria,
      sanitizeExcelText(item.cliente),
      item.ytd_prev_ton,
      item.ytd_curr_ton,
      item.delta_ton,
      item.movimiento,
      item.contribucion == null ? "—" : item.contribucion,
      sanitizeExcelText(item.comment || MISSING_COMMENT),
    ];
    row.getCell(3).numFmt = "#,##0.000";
    row.getCell(4).numFmt = "#,##0.000";
    paintDelta(row.getCell(5), item.delta_ton);
    if (item.contribucion == null) {
      row.getCell(7).alignment = { horizontal: "center" };
    } else {
      row.getCell(7).numFmt = "0.0%";
    }
    row.getCell(8).alignment = { wrapText: true, vertical: "top" };
    if (r % 2 === 0) {
      for (const col of [1, 2, 3, 4, 6, 7, 8]) {
        if (!row.getCell(col).fill || !row.getCell(col).fill.fgColor) {
          row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_DATA } };
        }
      }
    }
    r += 1;
  }
  if (rows.length && !ws.autoFilter) {
    try {
      ws.autoFilter = {
        from: { row: hdrRow, column: 1 },
        to: { row: r - 1, column: 8 },
      };
    } catch (_e) {
      /* una hoja solo admite un autofilter */
    }
  }
  return r + 1;
}

function writePlantSheet(wb, spec, payload) {
  const existing = wb.getWorksheet(spec.sheet);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(spec.sheet, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 2, showGridLines: true }],
  });

  ws.mergeCells(1, 1, 1, 8);
  const title = ws.getCell(1, 1);
  title.value = `${spec.sheet} · análisis anual YTD`;
  title.font = { bold: true, size: 13 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: F_TITLE } };

  ws.mergeCells(2, 1, 2, 8);
  const period = ws.getCell(2, 1);
  period.value = sanitizeExcelText(payload.period_label);
  period.font = { italic: true, size: 9, color: { argb: "FF555555" } };

  const casaRow =
    (payload.casa.matrix || []).find((row) => row.planta === spec.planta) || emptyMatrixRow(spec.planta);
  const comiRow =
    (payload.comisionista.matrix || []).find((row) => row.planta === spec.planta) ||
    emptyMatrixRow(spec.planta);

  let next = 4;
  next = writePlantSummary(ws, next, "CASA · ANÁLISIS ANUAL YTD", casaRow);
  next = writePlantClientSection(
    ws,
    next,
    "CLIENTES CASA CON IMPACTO NEGATIVO",
    F_NEG_SECTION,
    clientsForPlant(payload.casa.negative, spec.planta)
  );
  next = writePlantClientSection(
    ws,
    next,
    "CLIENTES CASA CON IMPACTO POSITIVO",
    F_POS_SECTION,
    clientsForPlant(payload.casa.positive, spec.planta)
  );
  next += 1;
  next = writePlantSummary(ws, next, "COMISIONISTA · ANÁLISIS ANUAL YTD", comiRow);
  next = writePlantClientSection(
    ws,
    next,
    "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO",
    F_NEG_SECTION,
    clientsForPlant(payload.comisionista.negative, spec.planta)
  );
  writePlantClientSection(
    ws,
    next,
    "CLIENTES COMISIONISTA CON IMPACTO POSITIVO",
    F_POS_SECTION,
    clientsForPlant(payload.comisionista.positive, spec.planta)
  );

  ws.columns = [
    { width: 16 },
    { width: 36 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
    { width: 18 },
    { width: 48 },
  ];
  return ws;
}

function appendAnnualPlantSheets(wb, payload) {
  if (!wb || !payload || payload.ok === false) return [];
  return PLANT_SHEETS.map((spec) => {
    writePlantSheet(wb, spec, payload);
    return spec.sheet;
  });
}

function appendAnnualCategorySheets(wb, payload) {
  if (!wb || !payload || payload.ok === false) return null;
  writeCategorySheet(wb, SHEET_CASA, "CASA", payload.casa, payload.period_label);
  writeCategorySheet(wb, SHEET_COMISIONISTA, "COMISIONISTA", payload.comisionista, payload.period_label);
  const plants = appendAnnualPlantSheets(wb, payload);
  return { casa: SHEET_CASA, comisionista: SHEET_COMISIONISTA, plants };
}

function emptyAnnualPayload(year, month) {
  const ranges = compareRanges(year, month);
  const emptyCat = () => ({
    matrix: PLANT_ROWS.map((p) => emptyMatrixRow(p)),
    total: emptyMatrixRow("TOTAL"),
    negative: [],
    positive: [],
  });
  return {
    ok: true,
    period_label: ranges ? formatPeriodLabel(ranges) : "",
    ranges,
    casa: emptyCat(),
    comisionista: emptyCat(),
  };
}

module.exports = {
  SHEET_CASA,
  SHEET_COMISIONISTA,
  PLANT_ROWS,
  PLANT_SHEETS,
  PLANT_CLIENT_HEADERS,
  SUBCATS,
  MOVEMENT,
  MISSING_COMMENT,
  ytdRange,
  compareRanges,
  formatPeriodLabel,
  resolvePlantLabel,
  resolveSubcategoria,
  resolveCategoria,
  classifyMovement,
  contributionRatio,
  buildAnnualAnalysis,
  loadAnnualCategoryAnalysis,
  appendAnnualCategorySheets,
  appendAnnualPlantSheets,
  emptyAnnualPayload,
  kgToTon,
};
