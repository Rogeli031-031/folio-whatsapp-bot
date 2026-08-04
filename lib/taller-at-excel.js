"use strict";

/**
 * Excel "Taller por AT": hoja Resumen (unidad × meses) + detalle por mes
 * (MAYOR / PASIVO / PREVENTIVO / OTROS) + hoja Duplicados.
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

const unidadTaller = require("./unidad-taller");

function normalizeAt(unidad) {
  const list = unidadTaller.parseUnidadesList(unidad);
  if (list.length === 1) return list[0];
  if (list.length > 1) return unidadTaller.formatUnidadesStored(list);
  const s = String(unidad || "").trim();
  return s || "SIN AT";
}

function normalizeConceptoKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Misma lógica que clasificacion-apoyos-excel matchTallerTipoCol. */
function matchTallerTipoCol(subcategoria) {
  const s = String(subcategoria || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!s) return "otros";
  if (/REPARACION/.test(s) && /MAYOR/.test(s)) return "mayor";
  if (/PASIVO|RECUPERACION/.test(s)) return "pasivo";
  if (/PREVENTIVO/.test(s)) return "preventivo";
  return "otros";
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

function parseDetalleLineas(raw) {
  if (raw == null) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Expande folios a filas de gasto:
 * - Homologa AT y, si hay varias unidades, reparte el importe en sublíneas.
 * - Fila grupo (importe 0) + sublíneas por pipa (importe parcial) para detalle.
 * - Resumen/agregados deben ignorar row_kind === "grupo".
 */
function expandTallerRows(rows) {
  const out = [];
  for (const r of rows || []) {
    const mes_cargo = String(r.mes_cargo || "").trim();
    const subcategoria = String(r.subcategoria || "").trim();
    const tipo = matchTallerTipoCol(subcategoria);
    const folioId = r.id != null ? Number(r.id) : null;
    const numero_folio = r.numero_folio != null ? String(r.numero_folio).trim() : "";
    const estatus = r.estatus != null ? String(r.estatus).trim() : "";
    const unidades = unidadTaller.parseUnidadesList(r.unidad);
    const unidadStored =
      unidades.length > 0 ? unidadTaller.formatUnidadesStored(unidades) : normalizeAt(r.unidad);

    const lineas = parseDetalleLineas(r.detalle_lineas);
    const usableLineas = (lineas || [])
      .map((L) => {
        if (!L || typeof L !== "object") return null;
        const concepto = String(L.concepto != null ? L.concepto : "").trim();
        const importe = L.importe != null ? Number(L.importe) : NaN;
        if (!concepto || !Number.isFinite(importe)) return null;
        return { concepto, importe: Math.round(importe * 100) / 100 };
      })
      .filter(Boolean);

    let conceptoBase =
      String(r.concepto || "").trim() ||
      String(r.descripcion || "").trim() ||
      "—";
    let totalImporte = Math.round((Number(r.importe) || 0) * 100) / 100;

    if (usableLineas.length > 0) {
      totalImporte = Math.round(usableLineas.reduce((s, L) => s + L.importe, 0) * 100) / 100;
      conceptoBase =
        usableLineas.length === 1
          ? usableLineas[0].concepto
          : `${usableLineas[0].concepto} (+${usableLineas.length - 1})`;
    }

    if (!Number.isFinite(totalImporte) || totalImporte === 0) continue;

    const pushRow = (unidad, importe, concepto, rowKind) => {
      out.push({
        folio_id: folioId,
        numero_folio,
        unidad,
        concepto,
        importe,
        tipo,
        subcategoria,
        mes_cargo,
        estatus,
        row_kind: rowKind,
      });
    };

    if (unidades.length <= 1) {
      // Una unidad: si hay detalle_lineas, una fila por línea (comportamiento previo).
      if (usableLineas.length > 1) {
        for (const L of usableLineas) {
          if (L.importe === 0) continue;
          pushRow(unidadStored, L.importe, L.concepto, "normal");
        }
      } else {
        pushRow(unidadStored, totalImporte, conceptoBase, "normal");
      }
      continue;
    }

    // Varias unidades: folio completo sin importe + sublínea por pipa con parcial.
    pushRow(unidadStored, 0, conceptoBase, "grupo");
    for (const p of unidadTaller.splitImportePorUnidades(totalImporte, unidades)) {
      pushRow(p.unidad, p.importe, `↳ ${conceptoBase}`, "parcial");
    }
  }
  return out;
}

function amtByTipo(tipo, importe) {
  return {
    mayor: tipo === "mayor" ? importe : 0,
    pasivo: tipo === "pasivo" ? importe : 0,
    preventivo: tipo === "preventivo" ? importe : 0,
    otros: tipo === "otros" ? importe : 0,
  };
}

/**
 * @param {Array<object>} rows - filas crudas de folios (importe, subcategoria, detalle_lineas, …)
 * @param {{ mesDesde: string, mesHasta: string, plantaNombre?: string|null }} opts
 */
async function buildTallerAtWorkbook(rows, opts) {
  const mesDesde = opts.mesDesde;
  const mesHasta = opts.mesHasta;
  const meses = monthsDescending(mesDesde, mesHasta);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dashboard Folios";
  wb.created = new Date();

  const listAll = expandTallerRows(rows).filter((r) => meses.includes(r.mes_cargo));
  // Resumen: solo importes reales (parciales / normales), no filas grupo.
  const listAgg = listAll.filter((r) => r.row_kind !== "grupo" && (Number(r.importe) || 0) !== 0);
  const list = listAll; // detalle muestra grupo + parciales

  // --- Resumen ---
  const wsR = wb.addWorksheet("Resumen", { views: [{ showGridLines: true }] });
  const atSet = new Set();
  const byAtMes = new Map();
  for (const r of listAgg) {
    atSet.add(r.unidad);
    const key = `${r.unidad}|${r.mes_cargo}`;
    byAtMes.set(key, (byAtMes.get(key) || 0) + r.importe);
  }
  const ats = [...atSet].sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

  const headerRow = 5;
  const firstData = 6;
  const nMes = meses.length;
  const totalColIdx = 2 + nMes;

  wsR.getCell("A1").value = "Gasto taller por unidad (AT)";
  wsR.getCell("A1").font = { name: FONT, bold: true, size: 14, color: { argb: "FF0F172A" } };
  wsR.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsR.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  if (opts.plantaNombre) {
    wsR.getCell("A3").value = `Planta: ${opts.plantaNombre}`;
    wsR.getCell("A3").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  }
  wsR.getCell("A4").value =
    "Importe = MAYOR + PASIVO/RECUPERACIÓN + PREVENTIVO + OTROS. Unidades homologadas (AT-15). Si un folio trae varias pipas, el importe se reparte en partes iguales.";
  wsR.getCell("A4").font = { name: FONT, size: 9, italic: true, color: { argb: "FF64748B" } };

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
    wsR.getCell("A6").value = "Sin folios de TALLER en la ventana (no cancelados).";
    wsR.getCell("A6").font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  }

  // --- Detalle por mes (columnas por categoría = mismo importe) ---
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
    const kindOrder = { grupo: 0, parcial: 1, normal: 2 };
    const monthRows = list
      .filter((r) => r.mes_cargo === mes)
      .sort((a, b) => {
        const fa = a.folio_id || 0;
        const fb = b.folio_id || 0;
        if (fa !== fb) return fa - fb;
        const oa = kindOrder[a.row_kind] != null ? kindOrder[a.row_kind] : 2;
        const ob = kindOrder[b.row_kind] != null ? kindOrder[b.row_kind] : 2;
        if (oa !== ob) return oa - ob;
        const c = String(a.unidad).localeCompare(String(b.unidad), "es", {
          numeric: true,
          sensitivity: "base",
        });
        if (c !== 0) return c;
        return String(a.concepto).localeCompare(String(b.concepto), "es");
      });

    ws.getCell("A1").value = `Detalle taller — ${formatMesLabel(mes)}`;
    ws.getCell("A1").font = { name: FONT, bold: true, size: 12 };
    if (opts.plantaNombre) {
      ws.getCell("A2").value = `Planta: ${opts.plantaNombre}`;
      ws.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
    }
    ws.getCell("A3").value =
      "Folio multi-unidad: fila con todas las AT (sin importe) + sublíneas ↳ por pipa con importe parcial. Homologación AT-XX.";
    ws.getCell("A3").font = { name: FONT, size: 9, italic: true, color: { argb: "FF64748B" } };

    const hRow = 5;
    const detHeaders = [
      "AT",
      "Concepto",
      "MAYOR",
      "PASIVO/RECUPERACIÓN",
      "PREVENTIVO",
      "OTROS",
      "Importe",
      "Total AT",
      "Folio",
    ];
    detHeaders.forEach((text, i) => {
      const cell = ws.getCell(hRow, i + 1);
      cell.value = text;
      cell.font = { name: FONT, bold: true, size: 9, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderAll;
    });

    const d0 = hRow + 1;
    monthRows.forEach((r, i) => {
      const row = d0 + i;
      const isGrupo = r.row_kind === "grupo";
      const amts = isGrupo ? { mayor: 0, pasivo: 0, preventivo: 0, otros: 0 } : amtByTipo(r.tipo, r.importe);

      const cAt = ws.getCell(row, 1);
      cAt.value = r.unidad;
      cAt.font = { name: FONT, size: isGrupo ? 9 : 10, bold: !!isGrupo };
      cAt.border = borderAll;
      cAt.alignment = { horizontal: isGrupo ? "left" : "center", wrapText: !!isGrupo };

      const cConc = ws.getCell(row, 2);
      cConc.value = r.concepto;
      cConc.font = { name: FONT, size: 9, italic: r.row_kind === "parcial" };
      cConc.border = borderAll;
      cConc.alignment = { horizontal: "left", wrapText: true };

      for (let col = 3; col <= 6; col++) {
        const keys = ["mayor", "pasivo", "preventivo", "otros"];
        const v = amts[keys[col - 3]];
        const cell = ws.getCell(row, col);
        cell.value = isGrupo || !v ? null : v;
        cell.numFmt = NUM_FMT;
        cell.font = { name: FONT, size: 10 };
        cell.border = borderAll;
        cell.alignment = { horizontal: "right" };
      }

      const cImp = ws.getCell(row, 7);
      cImp.value = isGrupo ? null : { formula: `SUM(C${row}:F${row})` };
      cImp.numFmt = NUM_FMT;
      cImp.font = { name: FONT, size: 10 };
      cImp.border = borderAll;
      cImp.alignment = { horizontal: "right" };

      const cTot = ws.getCell(row, 8);
      cTot.value = {
        formula: `SUMIF($A$${d0}:$A$${d0 + monthRows.length - 1},A${row},$G$${d0}:$G$${d0 + monthRows.length - 1})`,
      };
      cTot.numFmt = NUM_FMT;
      cTot.font = { name: FONT, size: 10 };
      cTot.border = borderAll;
      cTot.alignment = { horizontal: "right" };

      const cFol = ws.getCell(row, 9);
      cFol.value = r.numero_folio || "";
      cFol.font = { name: FONT, size: 9 };
      cFol.border = borderAll;
      cFol.alignment = { horizontal: "center" };
    });

    if (monthRows.length) {
      const sumRow = d0 + monthRows.length;
      ws.getCell(sumRow, 1).value = "SUMA";
      ws.getCell(sumRow, 1).font = { name: FONT, bold: true, size: 10 };
      ws.getCell(sumRow, 1).border = borderAll;
      ws.getCell(sumRow, 2).border = borderAll;
      for (let c = 3; c <= 7; c++) {
        const L = colLetter(c);
        const cell = ws.getCell(sumRow, c);
        cell.value = { formula: `SUM(${L}${d0}:${L}${sumRow - 1})` };
        cell.numFmt = NUM_FMT;
        cell.font = { name: FONT, bold: true, size: 10 };
        cell.border = borderAll;
      }
      ws.getCell(sumRow, 8).value = { formula: `G${sumRow}` };
      ws.getCell(sumRow, 8).numFmt = NUM_FMT;
      ws.getCell(sumRow, 8).font = { name: FONT, bold: true, size: 10 };
      ws.getCell(sumRow, 8).border = borderAll;
      ws.getCell(sumRow, 9).border = borderAll;
    } else {
      ws.getCell(d0, 1).value = "Sin folios en este mes.";
      ws.getCell(d0, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
    }

    ws.getColumn(1).width = 12;
    ws.getColumn(2).width = 48;
    for (let c = 3; c <= 8; c++) ws.getColumn(c).width = 14;
    ws.getColumn(9).width = 14;
  }

  // --- Duplicados: mismo AT + concepto + importe (en toda la ventana) ---
  const wsD = wb.addWorksheet("Duplicados", { views: [{ showGridLines: true }] });
  wsD.getCell("A1").value = "Posibles duplicados (mismo AT + concepto + importe)";
  wsD.getCell("A1").font = { name: FONT, bold: true, size: 12 };
  wsD.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsD.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };

  const byKey = new Map();
  for (const r of listAgg) {
    const key = `${String(r.unidad).toLowerCase()}|${normalizeConceptoKey(r.concepto)}|${Number(r.importe).toFixed(2)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }
  const dupGroups = [...byKey.values()]
    .filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length || a[0].unidad.localeCompare(b[0].unidad, "es"));

  const dh = 4;
  ["Grupo", "AT", "Concepto", "Importe", "Mes", "Folio", "Estatus", "Categoría", "Ocurrencias"].forEach((text, i) => {
    const cell = wsD.getCell(dh, i + 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DUP_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });

  let dRow = dh + 1;
  if (!dupGroups.length) {
    wsD.getCell(dRow, 1).value = "No se detectaron duplicados exactos (AT + concepto + importe).";
    wsD.getCell(dRow, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  } else {
    let grupo = 1;
    for (const g of dupGroups) {
      const sorted = [...g].sort((a, b) => String(a.mes_cargo).localeCompare(String(b.mes_cargo)) || String(a.numero_folio).localeCompare(String(b.numero_folio)));
      for (const r of sorted) {
        const vals = [
          grupo,
          r.unidad,
          r.concepto,
          r.importe,
          formatMesLabel(r.mes_cargo),
          r.numero_folio || "",
          r.estatus || "",
          r.subcategoria || r.tipo || "",
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
  wsD.getColumn(2).width = 12;
  wsD.getColumn(3).width = 50;
  wsD.getColumn(4).width = 12;
  wsD.getColumn(5).width = 12;
  wsD.getColumn(6).width = 14;
  wsD.getColumn(7).width = 18;
  wsD.getColumn(8).width = 18;
  wsD.getColumn(9).width = 12;

  return wb;
}

module.exports = {
  buildTallerAtWorkbook,
  monthsDescending,
  formatMesLabel,
  expandTallerRows,
  matchTallerTipoCol,
};
