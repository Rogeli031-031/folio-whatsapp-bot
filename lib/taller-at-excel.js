"use strict";

/**
 * Excel "Taller por AT": hoja Resumen (unidad × meses) + detalle por mes
 * (MAYOR / PASIVO / PREVENTIVO / OTROS) + hoja Duplicados.
 * Todo agrupado por planta (lista de una planta seguida de la siguiente).
 */

const ExcelJS = require("exceljs");
const unidadTaller = require("./unidad-taller");
const folioDuplicados = require("./folio-duplicados");

const FONT = "Calibri";
const HDR_FILL = "FF1E293B";
const PLANTA_FILL = "FF334155";
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

/** Quita prefijo de sublínea multi-AT para comparar conceptos. */
function conceptoParaDup(s) {
  return String(s || "")
    .replace(/^↳\s*/u, "")
    .replace(/^\s*->\s*/, "")
    .trim();
}

/** Umbral de similitud de concepto (misma lógica que chequeo al crear folio). */
const DUP_CONCEPTO_UMBRAL = 0.72;

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

/** Clave de reporte (E9, E7…) — agrupa ids equivalentes de la misma planta. */
const PLANTAS_REPORTE = [
  { clave: "E7", order: 1, ids: [2, 14], names: ["PUEBLA"] },
  { clave: "E8", order: 2, ids: [3, 15], names: ["TEHUACAN", "TEHUACÁN"] },
  { clave: "E9", order: 3, ids: [1, 11, 12], names: ["ACAPULCO"] },
  { clave: "E12", order: 4, ids: [4, 16], names: ["QUERETARO", "QUERÉTARO"] },
  { clave: "E13", order: 5, ids: [5, 17, 18], names: ["SAN LUIS"] },
  { clave: "E15", order: 6, ids: [6, 13], names: ["MORELOS"] },
];

function normalizePlantaNameKey(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolvePlantaCfg(r) {
  const id = r && r.planta_id != null ? Number(r.planta_id) : NaN;
  if (Number.isFinite(id)) {
    const byId = PLANTAS_REPORTE.find((p) => p.ids.includes(id));
    if (byId) return byId;
  }
  const nameKey = normalizePlantaNameKey(r && r.planta_nombre);
  if (nameKey) {
    const byName = PLANTAS_REPORTE.find((p) =>
      p.names.some((n) => nameKey.includes(normalizePlantaNameKey(n)))
    );
    if (byName) return byName;
  }
  return null;
}

/** Etiqueta de bloque: E9, E7, … (no el nombre largo). */
function plantaLabel(r) {
  const cfg = resolvePlantaCfg(r);
  if (cfg) return cfg.clave;
  const name = String(r.planta_nombre || "").trim();
  if (name) return name;
  if (r.planta_id != null && Number.isFinite(Number(r.planta_id))) return `Planta #${r.planta_id}`;
  return "Sin planta";
}

function plantaKey(r) {
  const cfg = resolvePlantaCfg(r);
  if (cfg) return `clave:${cfg.clave}`;
  if (r.planta_id != null && Number.isFinite(Number(r.planta_id))) return `id:${Number(r.planta_id)}`;
  return `name:${plantaLabel(r)}`;
}

/** Agrupa por planta (clave E#) y ordena E7 → E8 → E9 → E12 → E13 → E15. */
function orderedPlantGroups(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const key = plantaKey(r);
    if (!map.has(key)) {
      const cfg = resolvePlantaCfg(r);
      map.set(key, {
        key,
        label: plantaLabel(r),
        order: cfg ? cfg.order : 999,
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  }
  return [...map.values()].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.label.localeCompare(b.label, "es", { sensitivity: "base", numeric: true });
  });
}

/**
 * Expande folios a filas de gasto (con planta).
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
    const planta_id = r.planta_id != null ? Number(r.planta_id) : null;
    const planta_nombre = String(r.planta_nombre || "").trim() || null;
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
        planta_id,
        planta_nombre,
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

/** Tolerancia para “importe cercano”: ±5% del mayor o diferencia ≤ $250. */
const DUP_IMPORTE_PCT = 0.05;
const DUP_IMPORTE_ABS = 250;

function importesCercanos(a, b) {
  const x = Math.abs(Number(a) || 0);
  const y = Math.abs(Number(b) || 0);
  const d = Math.abs(x - y);
  if (d < 0.005) return true;
  const m = Math.max(x, y, 0.01);
  return d <= DUP_IMPORTE_ABS || d / m <= DUP_IMPORTE_PCT;
}

/**
 * Posibles duplicados por planta:
 * mismo AT + importe igual/cercano + concepto igual o similar (≥0.72),
 * y al menos 2 folios distintos (evita emparejar sublíneas del mismo folio).
 * @param {Array<object>} rows
 * @returns {Array<object[]>}
 */
function findDuplicateClustersTaller(rows) {
  const byAt = new Map();
  for (const r of rows || []) {
    const at = String(r.unidad || "").trim().toLowerCase();
    if (!at || at.includes(",")) continue; // omitir filas grupo multi-AT
    if (!byAt.has(at)) byAt.set(at, []);
    byAt.get(at).push(r);
  }

  const out = [];
  for (const list of byAt.values()) {
    if (list.length < 2) continue;
    const n = list.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const unite = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = list[i];
        const b = list[j];
        const fa = String(a.numero_folio || a.folio_id || "");
        const fb = String(b.numero_folio || b.folio_id || "");
        if (fa && fb && fa === fb) continue;
        if (!importesCercanos(a.importe, b.importe)) continue;
        const ca = conceptoParaDup(a.concepto);
        const cb = conceptoParaDup(b.concepto);
        const exact = normalizeConceptoKey(ca) === normalizeConceptoKey(cb);
        const sim = exact ? 1 : folioDuplicados.conceptoSimilarity(ca, cb);
        if (sim >= DUP_CONCEPTO_UMBRAL) unite(i, j);
      }
    }

    const map = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(list[i]);
    }
    for (const cluster of map.values()) {
      const folios = new Set(
        cluster.map((r) => String(r.numero_folio || r.folio_id || "")).filter(Boolean)
      );
      if (folios.size >= 2) out.push(cluster);
    }
  }
  return out;
}

function criterioDuplicadoGrupo(rows) {
  const imps = (rows || []).map((r) => Math.round((Number(r.importe) || 0) * 100) / 100);
  const min = Math.min(...imps);
  const max = Math.max(...imps);
  const conceptos = (rows || []).map((r) => normalizeConceptoKey(conceptoParaDup(r.concepto)));
  const conceptoExacto = conceptos.every((c) => c === conceptos[0]);
  const parts = [];
  parts.push(Math.abs(max - min) < 0.005 ? "importe exacto" : "importe cercano");
  parts.push(conceptoExacto ? "concepto igual" : "concepto similar");
  return parts.join(" + ");
}

function stylePlantaBanner(ws, row, colCount, label) {
  ws.mergeCells(row, 1, row, colCount);
  const cell = ws.getCell(row, 1);
  cell.value = `PLANTA: ${label}`;
  cell.font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PLANTA_FILL } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(row, c).border = borderAll;
    ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PLANTA_FILL } };
  }
}

/**
 * @param {Array<object>} rows - filas crudas (con planta_id / planta_nombre)
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
  const listAgg = listAll.filter((r) => r.row_kind !== "grupo" && (Number(r.importe) || 0) !== 0);
  const list = listAll;
  const nMes = meses.length;
  const totalColIdx = 2 + nMes;

  // --- Resumen (por planta) ---
  const wsR = wb.addWorksheet("Resumen", { views: [{ showGridLines: true }] });
  wsR.getCell("A1").value = "Gasto taller por unidad (AT) — separado por planta";
  wsR.getCell("A1").font = { name: FONT, bold: true, size: 14, color: { argb: "FF0F172A" } };
  wsR.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsR.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  if (opts.plantaNombre) {
    wsR.getCell("A3").value = `Filtro planta: ${opts.plantaNombre}`;
    wsR.getCell("A3").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  }
  wsR.getCell("A4").value =
    "Cada bloque es una planta. Unidades homologadas. Si un folio trae varias pipas, el importe se reparte en partes iguales.";
  wsR.getCell("A4").font = { name: FONT, size: 9, italic: true, color: { argb: "FF64748B" } };

  const headerRow = 5;
  ["AT", ...meses.map(formatMesLabel), "Total"].forEach((text, i) => {
    const cell = wsR.getCell(headerRow, i + 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });
  wsR.getRow(headerRow).height = 22;

  const plantGroupsAgg = orderedPlantGroups(listAgg);
  let row = headerRow + 1;
  const allDataRows = [];

  if (!plantGroupsAgg.length) {
    wsR.getCell(row, 1).value = "Sin folios de TALLER en la ventana (no cancelados).";
    wsR.getCell(row, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  }

  for (const group of plantGroupsAgg) {
    stylePlantaBanner(wsR, row, totalColIdx, group.label);
    row += 1;

    const byAtMes = new Map();
    const atSet = new Set();
    for (const r of group.rows) {
      atSet.add(r.unidad);
      const key = `${r.unidad}|${r.mes_cargo}`;
      byAtMes.set(key, (byAtMes.get(key) || 0) + r.importe);
    }
    // Ordenar AT por Total descendente (mayor → menor).
    const ats = [...atSet]
      .map((at) => {
        let total = 0;
        for (const mes of meses) total += byAtMes.get(`${at}|${mes}`) || 0;
        return { at, total: Math.round(total * 100) / 100 };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.at.localeCompare(b.at, "es", { numeric: true, sensitivity: "base" });
      });
    const firstData = row;

    for (const { at, total } of ats) {
      const a = wsR.getCell(row, 1);
      a.value = at;
      a.font = { name: FONT, size: 10 };
      a.border = borderAll;
      a.alignment = { horizontal: "center" };

      for (let mi = 0; mi < nMes; mi++) {
        const mes = meses[mi];
        const cell = wsR.getCell(row, 2 + mi);
        cell.value = byAtMes.get(`${at}|${mes}`) || 0;
        cell.numFmt = NUM_FMT;
        cell.font = { name: FONT, size: 10 };
        cell.border = borderAll;
        cell.alignment = { horizontal: "right" };
      }

      const tot = wsR.getCell(row, totalColIdx);
      if (nMes > 0) {
        tot.value = {
          formula: `SUM(${colLetter(2)}${row}:${colLetter(1 + nMes)}${row})`,
        };
      } else {
        tot.value = total;
      }
      tot.numFmt = NUM_FMT;
      tot.font = { name: FONT, bold: true, size: 10 };
      tot.border = borderAll;
      tot.alignment = { horizontal: "right" };
      allDataRows.push(row);
      row += 1;
    }

    const lastData = row - 1;
    if (ats.length) {
      const sA = wsR.getCell(row, 1);
      sA.value = `SUMA ${group.label}`;
      sA.font = { name: FONT, bold: true, size: 10 };
      sA.border = borderAll;
      for (let c = 2; c <= totalColIdx; c++) {
        const cell = wsR.getCell(row, c);
        const L = colLetter(c);
        cell.value = { formula: `SUM(${L}${firstData}:${L}${lastData})` };
        cell.numFmt = NUM_FMT;
        cell.font = { name: FONT, bold: true, size: 10 };
        cell.border = borderAll;
        cell.alignment = { horizontal: "right" };
      }
      row += 1;
    }
    row += 1; // espacio entre plantas
  }

  if (allDataRows.length > 1) {
    const sA = wsR.getCell(row, 1);
    sA.value = "GRAN TOTAL";
    sA.font = { name: FONT, bold: true, size: 10 };
    sA.border = borderAll;
    for (let c = 2; c <= totalColIdx; c++) {
      const cell = wsR.getCell(row, c);
      const L = colLetter(c);
      cell.value = { formula: allDataRows.map((rn) => `${L}${rn}`).join("+") };
      cell.numFmt = NUM_FMT;
      cell.font = { name: FONT, bold: true, size: 10 };
      cell.border = borderAll;
      cell.alignment = { horizontal: "right" };
    }
  }

  wsR.getColumn(1).width = 22;
  for (let c = 2; c <= totalColIdx; c++) wsR.getColumn(c).width = 14;

  // --- Detalle por mes (por planta) ---
  const usedNames = new Set(["Resumen", "Duplicados"]);
  const kindOrder = { grupo: 0, parcial: 1, normal: 2 };

  for (const mes of meses) {
    let name = safeSheetName(formatMesLabel(mes));
    let n = 2;
    while (usedNames.has(name)) {
      name = safeSheetName(`${formatMesLabel(mes)} (${n})`);
      n += 1;
    }
    usedNames.add(name);

    const ws = wb.addWorksheet(name, { views: [{ showGridLines: true }] });
    ws.getCell("A1").value = `Detalle taller — ${formatMesLabel(mes)} (por planta)`;
    ws.getCell("A1").font = { name: FONT, bold: true, size: 12 };
    if (opts.plantaNombre) {
      ws.getCell("A2").value = `Filtro planta: ${opts.plantaNombre}`;
      ws.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
    }
    ws.getCell("A3").value =
      "Bloques por planta. Folio multi-unidad: fila sin importe + sublíneas ↳ con parcial.";
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

    const monthAll = list.filter((r) => r.mes_cargo === mes);
    const plantGroups = orderedPlantGroups(monthAll);
    let dRow = hRow + 1;
    const sumFormulaRows = [];

    if (!plantGroups.length) {
      ws.getCell(dRow, 1).value = "Sin folios en este mes.";
      ws.getCell(dRow, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
    }

    for (const group of plantGroups) {
      stylePlantaBanner(ws, dRow, 9, group.label);
      dRow += 1;

      const monthRows = [...group.rows].sort((a, b) => {
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

      const atTot = new Map();
      for (const r of monthRows) {
        if (r.row_kind === "grupo") continue;
        atTot.set(r.unidad, (atTot.get(r.unidad) || 0) + (Number(r.importe) || 0));
      }

      const firstPlantData = dRow;
      for (const r of monthRows) {
        const isGrupo = r.row_kind === "grupo";
        const amts = isGrupo
          ? { mayor: 0, pasivo: 0, preventivo: 0, otros: 0 }
          : amtByTipo(r.tipo, r.importe);

        const cAt = ws.getCell(dRow, 1);
        cAt.value = r.unidad;
        cAt.font = { name: FONT, size: isGrupo ? 9 : 10, bold: !!isGrupo };
        cAt.border = borderAll;
        cAt.alignment = { horizontal: isGrupo ? "left" : "center", wrapText: !!isGrupo };

        const cConc = ws.getCell(dRow, 2);
        cConc.value = r.concepto;
        cConc.font = { name: FONT, size: 9, italic: r.row_kind === "parcial" };
        cConc.border = borderAll;
        cConc.alignment = { horizontal: "left", wrapText: true };

        for (let col = 3; col <= 6; col++) {
          const keys = ["mayor", "pasivo", "preventivo", "otros"];
          const v = amts[keys[col - 3]];
          const cell = ws.getCell(dRow, col);
          cell.value = isGrupo || !v ? null : v;
          cell.numFmt = NUM_FMT;
          cell.font = { name: FONT, size: 10 };
          cell.border = borderAll;
          cell.alignment = { horizontal: "right" };
        }

        const cImp = ws.getCell(dRow, 7);
        cImp.value = isGrupo ? null : { formula: `SUM(C${dRow}:F${dRow})` };
        cImp.numFmt = NUM_FMT;
        cImp.font = { name: FONT, size: 10 };
        cImp.border = borderAll;
        cImp.alignment = { horizontal: "right" };
        if (!isGrupo) sumFormulaRows.push(dRow);

        const cTot = ws.getCell(dRow, 8);
        cTot.value = isGrupo ? null : atTot.get(r.unidad) || 0;
        cTot.numFmt = NUM_FMT;
        cTot.font = { name: FONT, size: 10 };
        cTot.border = borderAll;
        cTot.alignment = { horizontal: "right" };

        const cFol = ws.getCell(dRow, 9);
        cFol.value = r.numero_folio || "";
        cFol.font = { name: FONT, size: 9 };
        cFol.border = borderAll;
        cFol.alignment = { horizontal: "center" };

        dRow += 1;
      }

      if (monthRows.length) {
        const lastPlantData = dRow - 1;
        ws.getCell(dRow, 1).value = `SUMA ${group.label}`;
        ws.getCell(dRow, 1).font = { name: FONT, bold: true, size: 10 };
        ws.getCell(dRow, 1).border = borderAll;
        ws.getCell(dRow, 2).border = borderAll;
        for (let c = 3; c <= 7; c++) {
          const L = colLetter(c);
          const cell = ws.getCell(dRow, c);
          cell.value = { formula: `SUM(${L}${firstPlantData}:${L}${lastPlantData})` };
          cell.numFmt = NUM_FMT;
          cell.font = { name: FONT, bold: true, size: 10 };
          cell.border = borderAll;
        }
        ws.getCell(dRow, 8).value = { formula: `G${dRow}` };
        ws.getCell(dRow, 8).numFmt = NUM_FMT;
        ws.getCell(dRow, 8).font = { name: FONT, bold: true, size: 10 };
        ws.getCell(dRow, 8).border = borderAll;
        ws.getCell(dRow, 9).border = borderAll;
        dRow += 1;
      }
      dRow += 1;
    }

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 48;
    for (let c = 3; c <= 8; c++) ws.getColumn(c).width = 14;
    ws.getColumn(9).width = 14;
  }

  // --- Duplicados (por planta): mismo AT + importe cercano + concepto igual/similar ---
  const wsD = wb.addWorksheet("Duplicados", { views: [{ showGridLines: true }] });
  wsD.getCell("A1").value =
    "Posibles duplicados (mismo AT + importe igual/cercano + concepto igual o similar) — por planta";
  wsD.getCell("A1").font = { name: FONT, bold: true, size: 12 };
  wsD.getCell("A2").value = `Ventana: ${formatMesLabel(mesDesde)} → ${formatMesLabel(mesHasta)}`;
  wsD.getCell("A2").font = { name: FONT, size: 10, color: { argb: "FF64748B" } };
  wsD.getCell("A3").value =
    "Importe ±5% o ≤$250. Concepto similar (≥72%). Incluye sublíneas multi-AT (↳) de folios distintos.";
  wsD.getCell("A3").font = { name: FONT, size: 9, italic: true, color: { argb: "FF64748B" } };

  const dh = 4;
  [
    "Grupo",
    "Planta",
    "AT",
    "Concepto",
    "Importe",
    "Mes",
    "Folio",
    "Estatus",
    "Categoría",
    "Ocurrencias",
    "Criterio",
  ].forEach((text, i) => {
    const cell = wsD.getCell(dh, i + 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DUP_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });

  let dRow = dh + 1;
  const plantGroupsDup = orderedPlantGroups(listAgg);
  let anyDup = false;
  let grupo = 1;

  for (const group of plantGroupsDup) {
    const dupGroups = findDuplicateClustersTaller(group.rows).sort(
      (a, b) => b.length - a.length || String(a[0].unidad).localeCompare(String(b[0].unidad), "es")
    );

    if (!dupGroups.length) continue;
    anyDup = true;
    stylePlantaBanner(wsD, dRow, 11, group.label);
    dRow += 1;

    for (const g of dupGroups) {
      const criterio = criterioDuplicadoGrupo(g);
      const sorted = [...g].sort(
        (a, b) =>
          String(a.mes_cargo).localeCompare(String(b.mes_cargo)) ||
          String(a.numero_folio).localeCompare(String(b.numero_folio))
      );
      for (const r of sorted) {
        const vals = [
          grupo,
          group.label,
          r.unidad,
          r.concepto,
          r.importe,
          formatMesLabel(r.mes_cargo),
          r.numero_folio || "",
          r.estatus || "",
          r.subcategoria || r.tipo || "",
          g.length,
          criterio,
        ];
        vals.forEach((v, i) => {
          const cell = wsD.getCell(dRow, i + 1);
          cell.value = v;
          cell.font = { name: FONT, size: 9 };
          cell.border = borderAll;
          if (i === 4) {
            cell.numFmt = NUM_FMT;
            cell.alignment = { horizontal: "right" };
          }
        });
        dRow += 1;
      }
      grupo += 1;
    }
    dRow += 1;
  }

  if (!anyDup) {
    wsD.getCell(dRow, 1).value =
      "No se detectaron posibles duplicados (AT + importe cercano + concepto igual/similar) por planta.";
    wsD.getCell(dRow, 1).font = { name: FONT, size: 10, italic: true, color: { argb: "FF64748B" } };
  }

  wsD.getColumn(1).width = 10;
  wsD.getColumn(2).width = 16;
  wsD.getColumn(3).width = 12;
  wsD.getColumn(4).width = 48;
  wsD.getColumn(5).width = 12;
  wsD.getColumn(6).width = 12;
  wsD.getColumn(7).width = 14;
  wsD.getColumn(8).width = 16;
  wsD.getColumn(9).width = 18;
  wsD.getColumn(10).width = 12;
  wsD.getColumn(11).width = 16;

  return wb;
}

module.exports = {
  buildTallerAtWorkbook,
  monthsDescending,
  formatMesLabel,
  expandTallerRows,
  matchTallerTipoCol,
};
