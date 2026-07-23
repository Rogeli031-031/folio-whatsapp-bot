"use strict";

/**
 * Excel "Taller por AT": hoja Resumen (unidad × meses) + una hoja de detalle por mes.
 */

const ExcelJS = require("exceljs");

const FONT = "Calibri";
const HDR_FILL = "FF1E293B";
const NUM_FMT = '"$"#,##0.00';
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const borderAll = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};

function formatMesLabel(yyyyMm) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(yyyyMm || "").trim());
  if (!m) return String(yyyyMm || "");
  const idx = parseInt(m[2], 10) - 1;
  return `${MESES_CORTOS[idx] || m[2]} ${m[1]}`;
}

/** Lista YYYY-MM de mesDesde..mesHasta inclusive, orden descendente (más reciente primero). */
function monthsDescending(mesDesde, mesHasta) {
  let a = String(mesDesde || "").trim();
  let b = String(mesHasta || "").trim();
  if (!/^\d{4}-\d{2}$/.test(a) || !/^\d{4}-\d{2}$/.test(b)) return [];
  if (a > b) {
    const t = a;
    a = b;
    b = t;
  }
  const out = [];
  let [y, m] = a.split("-").map(Number);
  const [yEnd, mEnd] = b.split("-").map(Number);
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  out.sort((x, y2) => (x < y2 ? 1 : x > y2 ? -1 : 0));
  return out;
}

function normalizeAt(unidad) {
  const s = String(unidad || "").trim();
  return s || "SIN AT";
}

function colLetter(n) {
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function safeSheetName(label) {
  const raw = String(label || "Mes")
    .replace(/[\\/*?:\[\]]/g, " ")
    .trim()
    .slice(0, 31);
  return raw || "Mes";
}

/**
 * @param {Array<{ unidad: string, concepto: string, importe: number, mes_cargo: string }>} rows
 * @param {{ mesDesde: string, mesHasta: string, plantaNombre?: string|null }} opts
 */
async function buildTallerAtWorkbook(rows, opts) {
  const mesDesde = opts.mesDesde;
  const mesHasta = opts.mesHasta;
  const meses = monthsDescending(mesDesde, mesHasta);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dashboard Folios";
  wb.created = new Date();

  const list = (rows || []).map((r) => ({
    unidad: normalizeAt(r.unidad),
    concepto: String(r.concepto || "").trim() || "—",
    importe: Math.round((Number(r.importe) || 0) * 100) / 100,
    mes_cargo: String(r.mes_cargo || "").trim(),
  }));

  // --- Resumen ---
  const wsR = wb.addWorksheet("Resumen", { views: [{ showGridLines: true }] });
  const atSet = new Set();
  const byAtMes = new Map();
  for (const r of list) {
    if (!meses.includes(r.mes_cargo)) continue;
    atSet.add(r.unidad);
    const key = `${r.unidad}|${r.mes_cargo}`;
    byAtMes.set(key, (byAtMes.get(key) || 0) + r.importe);
  }
  const ats = [...atSet].sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

  const headerRow = 5;
  const firstData = 6;
  const nMes = meses.length;
  const totalColIdx = 2 + nMes; // 1=A AT, 2..=meses, last=Total

  wsR.getCell("A1").value = "Gasto taller por unidad (AT)";
  wsR.getCell("A1").font = { name: FONT, bold: true, size: 14, color: { argb: "FF0F172A" } };
  wsR.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsR.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  if (opts.plantaNombre) {
    wsR.getCell("A3").value = `Planta: ${opts.plantaNombre}`;
    wsR.getCell("A3").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  }

  const headers = ["AT", ...meses.map(formatMesLabel), "Total"];
  headers.forEach((text, i) => {
    const cell = wsR.getCell(headerRow, i + 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });
  wsR.getRow(headerRow).height = 22;

  ats.forEach((at, idx) => {
    const row = firstData + idx;
    const a = wsR.getCell(row, 1);
    a.value = at;
    a.font = { name: FONT, size: 10 };
    a.border = borderAll;
    a.alignment = { horizontal: "center" };

    for (let mi = 0; mi < nMes; mi++) {
      const mes = meses[mi];
      const cell = wsR.getCell(row, 2 + mi);
      const v = byAtMes.get(`${at}|${mes}`) || 0;
      cell.value = v;
      cell.numFmt = NUM_FMT;
      cell.font = { name: FONT, size: 10 };
      cell.border = borderAll;
      cell.alignment = { horizontal: "right" };
    }

    const firstMesCol = colLetter(2);
    const lastMesCol = colLetter(1 + nMes);
    const tot = wsR.getCell(row, totalColIdx);
    if (nMes > 0) {
      tot.value = { formula: `SUM(${firstMesCol}${row}:${lastMesCol}${row})` };
    } else {
      tot.value = 0;
    }
    tot.numFmt = NUM_FMT;
    tot.font = { name: FONT, bold: true, size: 10 };
    tot.border = borderAll;
    tot.alignment = { horizontal: "right" };
  });

  const lastData = ats.length ? firstData + ats.length - 1 : firstData - 1;
  if (ats.length) {
    const sumRow = lastData + 1;
    const sA = wsR.getCell(sumRow, 1);
    sA.value = "SUMA";
    sA.font = { name: FONT, bold: true, size: 10 };
    sA.border = borderAll;
    for (let c = 2; c <= totalColIdx; c++) {
      const cell = wsR.getCell(sumRow, c);
      const L = colLetter(c);
      cell.value = { formula: `SUM(${L}${firstData}:${L}${lastData})` };
      cell.numFmt = NUM_FMT;
      cell.font = { name: FONT, bold: true, size: 10 };
      cell.border = borderAll;
      cell.alignment = { horizontal: "right" };
    }
  }

  wsR.getColumn(1).width = 14;
  for (let c = 2; c <= totalColIdx; c++) wsR.getColumn(c).width = 14;

  if (!ats.length) {
    wsR.getCell("A6").value = "Sin folios de TALLER en la ventana (con póliza o en Depósito y cierre / posteriores).";
    wsR.getCell("A6").font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  }

  // --- Detalle por mes ---
  const usedNames = new Set(["Resumen"]);
  for (const mes of meses) {
    let name = safeSheetName(formatMesLabel(mes));
    let n = 2;
    while (usedNames.has(name)) {
      name = safeSheetName(`${formatMesLabel(mes)} (${n})`);
      n += 1;
    }
    usedNames.add(name);

    const ws = wb.addWorksheet(name, { views: [{ showGridLines: true }] });
    const monthRows = list
      .filter((r) => r.mes_cargo === mes)
      .sort((a, b) => {
        const c = a.unidad.localeCompare(b.unidad, "es", { numeric: true, sensitivity: "base" });
        if (c !== 0) return c;
        return a.concepto.localeCompare(b.concepto, "es");
      });

    ws.getCell("A1").value = `Detalle taller — ${formatMesLabel(mes)}`;
    ws.getCell("A1").font = { name: FONT, bold: true, size: 12 };
    if (opts.plantaNombre) {
      ws.getCell("A2").value = `Planta: ${opts.plantaNombre}`;
      ws.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
    }

    const hRow = 4;
    ["AT", "Concepto", "Importe", "Total"].forEach((text, i) => {
      const cell = ws.getCell(hRow, i + 1);
      cell.value = text;
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderAll;
    });

    const d0 = hRow + 1;
    monthRows.forEach((r, i) => {
      const row = d0 + i;
      const cAt = ws.getCell(row, 1);
      cAt.value = r.unidad;
      cAt.font = { name: FONT, size: 10 };
      cAt.border = borderAll;
      cAt.alignment = { horizontal: "center" };

      const cConc = ws.getCell(row, 2);
      cConc.value = r.concepto;
      cConc.font = { name: FONT, size: 9 };
      cConc.border = borderAll;
      cConc.alignment = { horizontal: "left", wrapText: true };

      const cImp = ws.getCell(row, 3);
      cImp.value = r.importe;
      cImp.numFmt = NUM_FMT;
      cImp.font = { name: FONT, size: 10 };
      cImp.border = borderAll;
      cImp.alignment = { horizontal: "right" };

      const cTot = ws.getCell(row, 4);
      // Total por AT en este mes (misma unidad)
      cTot.value = {
        formula: `SUMIF($A$${d0}:$A$${d0 + monthRows.length - 1},A${row},$C$${d0}:$C$${d0 + monthRows.length - 1})`,
      };
      cTot.numFmt = NUM_FMT;
      cTot.font = { name: FONT, size: 10 };
      cTot.border = borderAll;
      cTot.alignment = { horizontal: "right" };
    });

    if (monthRows.length) {
      const sumRow = d0 + monthRows.length;
      ws.getCell(sumRow, 1).value = "SUMA";
      ws.getCell(sumRow, 1).font = { name: FONT, bold: true, size: 10 };
      ws.getCell(sumRow, 1).border = borderAll;
      ws.getCell(sumRow, 2).border = borderAll;
      const sImp = ws.getCell(sumRow, 3);
      sImp.value = { formula: `SUM(C${d0}:C${sumRow - 1})` };
      sImp.numFmt = NUM_FMT;
      sImp.font = { name: FONT, bold: true, size: 10 };
      sImp.border = borderAll;
      const sTot = ws.getCell(sumRow, 4);
      sTot.value = { formula: `C${sumRow}` };
      sTot.numFmt = NUM_FMT;
      sTot.font = { name: FONT, bold: true, size: 10 };
      sTot.border = borderAll;
    } else {
      ws.getCell(d0, 1).value = "Sin folios en este mes.";
      ws.getCell(d0, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
    }

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 55;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 14;
  }

  return wb;
}

module.exports = {
  buildTallerAtWorkbook,
  monthsDescending,
  formatMesLabel,
};
