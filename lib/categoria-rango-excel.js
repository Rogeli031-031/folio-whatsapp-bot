"use strict";

/**
 * Excel por categoría (GASTOS / INVERSIONES) en un rango de meses:
 * Resumen (subcategoría × meses) + detalle por mes + Duplicados.
 * Misma dinámica que Taller por AT.
 */

const ExcelJS = require("exceljs");

const FONT = "Calibri";
const HDR_FILL = "FF1E293B";
const DUP_FILL = "FF7F1D1D";
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

function normalizeSubcat(s) {
  const t = String(s || "").trim();
  return t || "SIN SUBCATEGORÍA";
}

function normalizeConceptoKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseDetalleLineas(raw) {
  if (raw == null) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function expandCategoriaRows(rows) {
  const out = [];
  for (const r of rows || []) {
    const subcategoria = normalizeSubcat(r.subcategoria);
    const mes_cargo = String(r.mes_cargo || "").trim();
    const folioId = r.id != null ? Number(r.id) : null;
    const numero_folio = r.numero_folio != null ? String(r.numero_folio).trim() : "";
    const estatus = r.estatus != null ? String(r.estatus).trim() : "";
    const beneficiario = String(r.beneficiario || "").trim() || "—";
    const lineas = parseDetalleLineas(r.detalle_lineas);
    const usableLineas = (lineas || [])
      .map((L) => {
        if (!L || typeof L !== "object") return null;
        const concepto = String(L.concepto != null ? L.concepto : "").trim();
        const importe = L.importe != null ? Number(L.importe) : NaN;
        if (!concepto || !Number.isFinite(importe)) return null;
        return {
          concepto,
          importe: Math.round(importe * 100) / 100,
          beneficiario: String(L.beneficiario != null ? L.beneficiario : "").trim() || beneficiario,
        };
      })
      .filter(Boolean);

    if (usableLineas.length > 0) {
      for (const L of usableLineas) {
        if (L.importe === 0) continue;
        out.push({
          folio_id: folioId,
          numero_folio,
          subcategoria,
          concepto: L.concepto,
          beneficiario: L.beneficiario,
          importe: L.importe,
          mes_cargo,
          estatus,
        });
      }
      continue;
    }

    const concepto = String(r.concepto || "").trim() || "—";
    const importe = Math.round((Number(r.importe) || 0) * 100) / 100;
    if (!Number.isFinite(importe) || importe === 0) continue;
    out.push({
      folio_id: folioId,
      numero_folio,
      subcategoria,
      concepto,
      beneficiario,
      importe,
      mes_cargo,
      estatus,
    });
  }
  return out;
}

/**
 * @param {"GASTOS"|"INVERSIONES"} categoria
 * @param {Array<object>} rows
 * @param {{ mesDesde: string, mesHasta: string, plantaNombre?: string|null }} opts
 */
async function buildCategoriaRangoWorkbook(categoria, rows, opts) {
  const catLabel = String(categoria || "").toUpperCase() === "INVERSIONES" ? "INVERSIONES" : "GASTOS";
  const mesDesde = opts.mesDesde;
  const mesHasta = opts.mesHasta;
  const meses = monthsDescending(mesDesde, mesHasta);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dashboard Folios";
  wb.created = new Date();

  const list = expandCategoriaRows(rows).filter((r) => meses.includes(r.mes_cargo));

  // --- Resumen ---
  const wsR = wb.addWorksheet("Resumen", { views: [{ showGridLines: true }] });
  const subSet = new Set();
  const bySubMes = new Map();
  for (const r of list) {
    subSet.add(r.subcategoria);
    const key = `${r.subcategoria}|${r.mes_cargo}`;
    bySubMes.set(key, (bySubMes.get(key) || 0) + r.importe);
  }
  const subs = [...subSet].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const headerRow = 5;
  const firstData = 6;
  const nMes = meses.length;
  const totalColIdx = 2 + nMes;

  wsR.getCell("A1").value = `${catLabel} por subcategoría`;
  wsR.getCell("A1").font = { name: FONT, bold: true, size: 14, color: { argb: "FF0F172A" } };
  wsR.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsR.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  if (opts.plantaNombre) {
    wsR.getCell("A3").value = `Planta: ${opts.plantaNombre}`;
    wsR.getCell("A3").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  }
  wsR.getCell("A4").value = `Folios ${catLabel} no cancelados. Importe = f.importe o suma de detalle_lineas.`;
  wsR.getCell("A4").font = { name: FONT, size: 9, italic: true, color: { argb: "FF64748B" } };

  const headers = ["Subcategoría", ...meses.map(formatMesLabel), "Total"];
  headers.forEach((text, i) => {
    const cell = wsR.getCell(headerRow, i + 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });
  wsR.getRow(headerRow).height = 22;

  subs.forEach((sub, idx) => {
    const row = firstData + idx;
    const a = wsR.getCell(row, 1);
    a.value = sub;
    a.font = { name: FONT, size: 10 };
    a.border = borderAll;
    a.alignment = { horizontal: "left", wrapText: true };

    for (let mi = 0; mi < nMes; mi++) {
      const mes = meses[mi];
      const cell = wsR.getCell(row, 2 + mi);
      cell.value = bySubMes.get(`${sub}|${mes}`) || 0;
      cell.numFmt = NUM_FMT;
      cell.font = { name: FONT, size: 10 };
      cell.border = borderAll;
      cell.alignment = { horizontal: "right" };
    }

    const tot = wsR.getCell(row, totalColIdx);
    if (nMes > 0) {
      tot.value = { formula: `SUM(${colLetter(2)}${row}:${colLetter(1 + nMes)}${row})` };
    } else {
      tot.value = 0;
    }
    tot.numFmt = NUM_FMT;
    tot.font = { name: FONT, bold: true, size: 10 };
    tot.border = borderAll;
    tot.alignment = { horizontal: "right" };
  });

  const lastData = subs.length ? firstData + subs.length - 1 : firstData - 1;
  if (subs.length) {
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

  wsR.getColumn(1).width = 28;
  for (let c = 2; c <= totalColIdx; c++) wsR.getColumn(c).width = 14;

  if (!subs.length) {
    wsR.getCell("A6").value = `Sin folios de ${catLabel} en la ventana (no cancelados).`;
    wsR.getCell("A6").font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  }

  // --- Detalle por mes ---
  const usedNames = new Set(["Resumen", "Duplicados"]);
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
        const c = a.subcategoria.localeCompare(b.subcategoria, "es", { sensitivity: "base" });
        if (c !== 0) return c;
        return a.concepto.localeCompare(b.concepto, "es");
      });

    ws.getCell("A1").value = `Detalle ${catLabel} — ${formatMesLabel(mes)}`;
    ws.getCell("A1").font = { name: FONT, bold: true, size: 12 };
    if (opts.plantaNombre) {
      ws.getCell("A2").value = `Planta: ${opts.plantaNombre}`;
      ws.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
    }

    const hRow = 4;
    ["Subcategoría", "Beneficiario", "Concepto", "Importe", "Folio", "Estatus"].forEach((text, i) => {
      const cell = ws.getCell(hRow, i + 1);
      cell.value = text;
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderAll;
    });

    const d0 = hRow + 1;
    monthRows.forEach((r, i) => {
      const row = d0 + i;
      const vals = [r.subcategoria, r.beneficiario, r.concepto, r.importe, r.numero_folio || "", r.estatus || ""];
      vals.forEach((v, ci) => {
        const cell = ws.getCell(row, ci + 1);
        cell.value = v;
        cell.font = { name: FONT, size: ci === 2 ? 9 : 10 };
        cell.border = borderAll;
        if (ci === 3) {
          cell.numFmt = NUM_FMT;
          cell.alignment = { horizontal: "right" };
        } else if (ci === 2) {
          cell.alignment = { horizontal: "left", wrapText: true };
        } else {
          cell.alignment = { horizontal: "left" };
        }
      });
    });

    if (monthRows.length) {
      const sumRow = d0 + monthRows.length;
      ws.getCell(sumRow, 1).value = "SUMA";
      ws.getCell(sumRow, 1).font = { name: FONT, bold: true, size: 10 };
      ws.getCell(sumRow, 1).border = borderAll;
      for (let c = 2; c <= 3; c++) ws.getCell(sumRow, c).border = borderAll;
      const sImp = ws.getCell(sumRow, 4);
      sImp.value = { formula: `SUM(D${d0}:D${sumRow - 1})` };
      sImp.numFmt = NUM_FMT;
      sImp.font = { name: FONT, bold: true, size: 10 };
      sImp.border = borderAll;
      ws.getCell(sumRow, 5).border = borderAll;
      ws.getCell(sumRow, 6).border = borderAll;
    } else {
      ws.getCell(d0, 1).value = "Sin folios en este mes.";
      ws.getCell(d0, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
    }

    ws.getColumn(1).width = 24;
    ws.getColumn(2).width = 28;
    ws.getColumn(3).width = 48;
    ws.getColumn(4).width = 14;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 16;
  }

  // --- Duplicados ---
  const wsD = wb.addWorksheet("Duplicados", { views: [{ showGridLines: true }] });
  wsD.getCell("A1").value = "Posibles duplicados (mismo beneficiario + concepto + importe)";
  wsD.getCell("A1").font = { name: FONT, bold: true, size: 12 };
  wsD.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)} · ${catLabel}`;
  wsD.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };

  const byKey = new Map();
  for (const r of list) {
    const key = `${normalizeConceptoKey(r.beneficiario)}|${normalizeConceptoKey(r.concepto)}|${r.importe.toFixed(2)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }
  const dupGroups = [...byKey.values()]
    .filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length);

  const dh = 4;
  ["Grupo", "Beneficiario", "Concepto", "Importe", "Mes", "Subcategoría", "Folio", "Estatus", "Ocurrencias"].forEach(
    (text, i) => {
      const cell = wsD.getCell(dh, i + 1);
      cell.value = text;
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DUP_FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderAll;
    }
  );

  let dRow = dh + 1;
  if (!dupGroups.length) {
    wsD.getCell(dRow, 1).value = "No se detectaron duplicados exactos (beneficiario + concepto + importe).";
    wsD.getCell(dRow, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  } else {
    let grupo = 1;
    for (const g of dupGroups) {
      const sorted = [...g].sort(
        (a, b) =>
          String(a.mes_cargo).localeCompare(String(b.mes_cargo)) ||
          String(a.numero_folio).localeCompare(String(b.numero_folio))
      );
      for (const r of sorted) {
        const vals = [
          grupo,
          r.beneficiario,
          r.concepto,
          r.importe,
          formatMesLabel(r.mes_cargo),
          r.subcategoria,
          r.numero_folio || "",
          r.estatus || "",
          g.length,
        ];
        vals.forEach((v, i) => {
          const cell = wsD.getCell(dRow, i + 1);
          cell.value = v;
          cell.font = { name: FONT, size: 9 };
          cell.border = borderAll;
          if (i === 3) {
            cell.numFmt = NUM_FMT;
            cell.alignment = { horizontal: "right" };
          }
        });
        dRow += 1;
      }
      grupo += 1;
    }
  }

  wsD.getColumn(1).width = 10;
  wsD.getColumn(2).width = 28;
  wsD.getColumn(3).width = 48;
  wsD.getColumn(4).width = 12;
  wsD.getColumn(5).width = 12;
  wsD.getColumn(6).width = 22;
  wsD.getColumn(7).width = 14;
  wsD.getColumn(8).width = 16;
  wsD.getColumn(9).width = 12;

  return wb;
}

module.exports = {
  buildCategoriaRangoWorkbook,
  formatMesLabel,
  monthsDescending,
  expandCategoriaRows,
};
