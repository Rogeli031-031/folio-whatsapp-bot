"use strict";

/**
 * Excel "Clasificación de apoyos" — hoja COMPARATIVOS (dos meses por planta).
 */

const ExcelJS = require("exceljs");

const PLANTAS_COMPARATIVO = [
  { label: "Puebla", ids: [2, 14] },
  { label: "Tehuacán", ids: [3, 15] },
  { label: "Acapulco", ids: [1, 11, 12] },
  { label: "Querétaro", ids: [4, 16] },
  { label: "San Luis Potosí", ids: [5, 17, 18] },
  { label: "Morelos", ids: [6, 13] },
];

const MESES_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function mesLabelEs(yyyyMm) {
  const m = String(yyyyMm || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(yyyyMm || "");
  const idx = parseInt(m[2], 10) - 1;
  return `${MESES_ES[idx] || m[2]} ${m[1]}`;
}

function normalizeCat(cat) {
  const s = String(cat || "").trim().toUpperCase();
  if (!s) return null;
  if (s === "GASTOS" || s.includes("GASTO")) return "GASTOS";
  if (s === "INVERSIONES" || s.includes("INVERSION")) return "INVERSIONES";
  if (s === "TALLER") return "TALLER";
  return null;
}

function thinBorder() {
  const b = { style: "thin", color: { argb: "FFBFBFBF" } };
  return { top: b, left: b, bottom: b, right: b };
}

function applyFill(cell, argb) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function applyFont(cell, opts) {
  cell.font = { name: "Calibri", size: 11, ...(opts || {}) };
}

function safeMerge(ws, range) {
  try {
    ws.mergeCells(range);
  } catch (_) {
    /* already merged */
  }
}

/**
 * Matriz digital / misma lógica del Excel.
 * @returns {{ plantas: Array, totales: object, diffs: object, mes_a_label: string, mes_b_label: string }}
 */
function buildClasificacionMatrix(rows, mesA, mesB) {
  const byKey = new Map();
  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA && mes !== mesB) continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const cat = normalizeCat(r.categoria);
    if (!cat) continue;
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    const key = `${canon}|${mes}|${cat}`;
    byKey.set(key, (byKey.get(key) || 0) + imp);
  }

  function val(canonIdx, mes, cat) {
    return Math.round(byKey.get(`${canonIdx}|${mes}|${cat}`) || 0);
  }

  const plantas = PLANTAS_COMPARATIVO.map((p, i) => {
    const gastosA = val(i, mesA, "GASTOS");
    const invA = val(i, mesA, "INVERSIONES");
    const tallerA = val(i, mesA, "TALLER");
    const gastosB = val(i, mesB, "GASTOS");
    const invB = val(i, mesB, "INVERSIONES");
    const tallerB = val(i, mesB, "TALLER");
    const totalA = gastosA + invA + tallerA;
    const totalB = gastosB + invB + tallerB;
    return {
      key: p.label,
      label: p.label,
      ids: p.ids,
      a: { gastos: gastosA, inversiones: invA, taller: tallerA, total: totalA },
      b: { gastos: gastosB, inversiones: invB, taller: tallerB, total: totalB },
      diff: totalA - totalB,
    };
  });

  const sum = (picker) => plantas.reduce((s, p) => s + picker(p), 0);
  const totales = {
    a: {
      gastos: sum((p) => p.a.gastos),
      inversiones: sum((p) => p.a.inversiones),
      taller: sum((p) => p.a.taller),
      total: sum((p) => p.a.total),
    },
    b: {
      gastos: sum((p) => p.b.gastos),
      inversiones: sum((p) => p.b.inversiones),
      taller: sum((p) => p.b.taller),
      total: sum((p) => p.b.total),
    },
    diff: sum((p) => p.diff),
  };

  return {
    mes_a: mesA,
    mes_b: mesB,
    mes_a_label: mesLabelEs(mesA),
    mes_b_label: mesLabelEs(mesB),
    vs_label: `${mesLabelEs(mesA)} VS ${mesLabelEs(mesB)}`,
    plantas,
    totales,
    diffs_categoria: {
      gastos: totales.a.gastos - totales.b.gastos,
      inversiones: totales.a.inversiones - totales.b.inversiones,
      taller: totales.a.taller - totales.b.taller,
      total: totales.a.total - totales.b.total,
    },
  };
}

/**
 * @param {Array<{planta_id:number, categoria:string|null, importe:number|string|null, mes_cargo:string}>} rows
 * @param {string} mesA YYYY-MM (izquierda)
 * @param {string} mesB YYYY-MM (derecha)
 * @param {{ detalleGastosByPlanta?: Object<string, Array> }} [options]
 */
async function buildClasificacionApoyosWorkbook(rows, mesA, mesB, options) {
  options = options || {};
  const byKey = new Map();
  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA && mes !== mesB) continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const cat = normalizeCat(r.categoria);
    if (!cat) continue;
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    const key = `${canon}|${mes}|${cat}`;
    byKey.set(key, (byKey.get(key) || 0) + imp);
  }

  function val(canonIdx, mes, cat) {
    return byKey.get(`${canonIdx}|${mes}|${cat}`) || 0;
  }

  const labelA = mesLabelEs(mesA);
  const labelB = mesLabelEs(mesB);
  const vsLabel = `${labelA} VS ${labelB}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-whatsapp-bot";
  const ws = wb.addWorksheet("COMPARATIVOS", { views: [{ showGridLines: false }] });

  const widths = {
    A: 3, B: 18,
    C: 3, D: 12, E: 3, F: 12, G: 3, H: 12, I: 3, J: 14, K: 3, L: 3,
    M: 3, N: 12, O: 3, P: 12, Q: 3, R: 12, S: 3, T: 14, U: 3, V: 3, W: 3, X: 3,
    Y: 3, Z: 18,
  };
  Object.entries(widths).forEach(([col, w]) => {
    ws.getColumn(col).width = w;
  });

  safeMerge(ws, "D1:L1");
  safeMerge(ws, "D2:L2");
  safeMerge(ws, "D3:L3");
  [["D1", "ZONA PROVINCIA"], ["D2", "CLASIFICACION DE APOYOS"], ["D3", labelA]].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyFont(c, { bold: true, color: { argb: "FF548235" }, size: 12 });
  });

  safeMerge(ws, "N1:X1");
  safeMerge(ws, "N2:X2");
  safeMerge(ws, "N3:X3");
  [["N1", "ZONA PROVINCIA"], ["N2", "CLASIFICACION DE APOYOS"], ["N3", labelB]].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyFont(c, { bold: true, color: { argb: "FF000000" }, size: 12 });
  });

  const hPlan = ws.getCell("B5");
  hPlan.value = "PLANTA";
  applyFont(hPlan, { bold: true });
  hPlan.alignment = { horizontal: "center" };
  hPlan.border = thinBorder();

  function headerCat(col, text, fillArgb) {
    const c = ws.getCell(`${col}5`);
    c.value = text;
    applyFont(c, { bold: true, color: { argb: "FFFFFFFF" } });
    applyFill(c, fillArgb);
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder();
  }

  headerCat("D", "GASTOS", "FF1F4E79");
  headerCat("F", "INVERSIONES", "FFC00000");
  headerCat("H", "TALLER", "FFC65911");
  safeMerge(ws, "J5:L5");
  headerCat("J", `TOTAL ${labelA}`, "FF5B9BD5");

  headerCat("N", "GASTOS", "FF1F4E79");
  headerCat("P", "INVERSIONES", "FFC00000");
  headerCat("R", "TALLER", "FFC65911");
  safeMerge(ws, "T5:X5");
  headerCat("T", `TOTAL ${labelB}`, "FF5B9BD5");

  const hVs = ws.getCell("Z5");
  hVs.value = vsLabel;
  applyFont(hVs, { bold: true, color: { argb: "FF2F5496" } });
  hVs.alignment = { horizontal: "center", wrapText: true };
  hVs.border = thinBorder();

  const NUM_FMT = "#,##0";
  // Positivos en rojo, negativos en negro (formato ejemplo corporativo).
  const DIFF_FMT = '[Red]"$"#,##0;"$"#,##0';

  function putDollar(col, row, fontOpts) {
    const d = ws.getCell(`${col}${row}`);
    d.value = "$";
    d.alignment = { horizontal: "right" };
    if (fontOpts) applyFont(d, fontOpts);
  }

  function putAmount(col, row, amount, opts) {
    const v = ws.getCell(`${col}${row}`);
    v.value = Math.round(Number(amount) || 0);
    v.numFmt = NUM_FMT;
    v.alignment = { horizontal: "center" };
    v.border = thinBorder();
    if (opts && opts.font) applyFont(v, opts.font);
    if (opts && opts.fill) applyFill(v, opts.fill);
  }

  const plantRows = [7, 8, 9, 10, 11, 12];
  PLANTAS_COMPARATIVO.forEach((p, i) => {
    const row = plantRows[i];
    const cellB = ws.getCell(`B${row}`);
    cellB.value = p.label;
    cellB.border = thinBorder();

    putDollar("C", row);
    putAmount("D", row, val(i, mesA, "GASTOS"));
    putDollar("E", row);
    putAmount("F", row, val(i, mesA, "INVERSIONES"));
    putDollar("G", row);
    putAmount("H", row, val(i, mesA, "TALLER"));
    putDollar("I", row);
    const totA = ws.getCell(`J${row}`);
    totA.value = { formula: `D${row}+F${row}+H${row}` };
    totA.numFmt = NUM_FMT;
    totA.alignment = { horizontal: "center" };
    totA.border = thinBorder();
    safeMerge(ws, `J${row}:L${row}`);

    putDollar("M", row);
    putAmount("N", row, val(i, mesB, "GASTOS"));
    putDollar("O", row);
    putAmount("P", row, val(i, mesB, "INVERSIONES"));
    putDollar("Q", row);
    putAmount("R", row, val(i, mesB, "TALLER"));
    putDollar("S", row);
    const totB = ws.getCell(`T${row}`);
    totB.value = { formula: `N${row}+P${row}+R${row}` };
    totB.numFmt = NUM_FMT;
    totB.alignment = { horizontal: "center" };
    totB.border = thinBorder();
    safeMerge(ws, `T${row}:X${row}`);

    const z = ws.getCell(`Z${row}`);
    z.value = { formula: `J${row}-T${row}` };
    z.numFmt = DIFF_FMT;
    z.alignment = { horizontal: "center" };
    z.border = thinBorder();
  });

  // TOTAL PROVINCIA
  const totLabel = ws.getCell("B14");
  totLabel.value = "TOTAL PROVINCIA";
  applyFont(totLabel, { bold: true });
  applyFill(totLabel, "FFD9D9D9");
  totLabel.border = thinBorder();

  const greenBold = { bold: true, color: { argb: "FF548235" } };
  [["C", "D"], ["E", "F"], ["G", "H"]].forEach(([dc, vc]) => {
    putDollar(dc, 14, greenBold);
    const c = ws.getCell(`${vc}14`);
    c.value = { formula: `SUM(${vc}7:${vc}12)` };
    c.numFmt = NUM_FMT;
    applyFont(c, greenBold);
    applyFill(c, "FFD9D9D9");
    c.border = thinBorder();
    c.alignment = { horizontal: "center" };
  });
  putDollar("I", 14, greenBold);
  const j14 = ws.getCell("J14");
  j14.value = { formula: "SUM(J7:J12)" };
  j14.numFmt = NUM_FMT;
  applyFont(j14, greenBold);
  applyFill(j14, "FFD9D9D9");
  j14.border = thinBorder();
  j14.alignment = { horizontal: "center" };
  safeMerge(ws, "J14:L14");

  const blackBold = { bold: true };
  [["M", "N"], ["O", "P"], ["Q", "R"]].forEach(([dc, vc]) => {
    putDollar(dc, 14, blackBold);
    const c = ws.getCell(`${vc}14`);
    c.value = { formula: `SUM(${vc}7:${vc}12)` };
    c.numFmt = NUM_FMT;
    applyFont(c, blackBold);
    applyFill(c, "FFD9D9D9");
    c.border = thinBorder();
    c.alignment = { horizontal: "center" };
  });
  putDollar("S", 14, blackBold);
  const t14 = ws.getCell("T14");
  t14.value = { formula: "SUM(T7:T12)" };
  t14.numFmt = NUM_FMT;
  applyFont(t14, blackBold);
  applyFill(t14, "FFD9D9D9");
  t14.border = thinBorder();
  t14.alignment = { horizontal: "center" };
  safeMerge(ws, "T14:X14");

  const z14 = ws.getCell("Z14");
  z14.value = { formula: "J14-T14" };
  z14.numFmt = DIFF_FMT;
  applyFont(z14, { bold: true });
  applyFill(z14, "FFD9D9D9");
  z14.border = thinBorder();
  z14.alignment = { horizontal: "center" };

  // Diferencias por categoría
  const b17 = ws.getCell("B17");
  b17.value = vsLabel;
  applyFont(b17, { bold: true, color: { argb: "FF2F5496" } });

  [["D", "N"], ["F", "P"], ["H", "R"]].forEach(([a, b]) => {
    const c = ws.getCell(`${a}17`);
    c.value = { formula: `${a}14-${b}14` };
    c.numFmt = DIFF_FMT;
    c.border = thinBorder();
    c.alignment = { horizontal: "center" };
  });
  const j17 = ws.getCell("J17");
  j17.value = { formula: "J14-T14" };
  j17.numFmt = DIFF_FMT;
  j17.border = thinBorder();
  applyFill(j17, "FFD9D9D9");
  j17.alignment = { horizontal: "center" };
  safeMerge(ws, "J17:L17");

  addInversionesSheet(wb, rows, mesA);
  addGastosSheet(wb, rows, mesA);
  addTallerSheet(wb, rows, mesA);
  addResumenSheet(wb, rows, mesA);

  const detalleGastosByPlanta = (options && options.detalleGastosByPlanta) || {};
  const detalleInversionesByPlanta = (options && options.detalleInversionesByPlanta) || {};
  const detalleTallerByPlanta = (options && options.detalleTallerByPlanta) || {};
  for (const cfg of PLANTAS_DETALLE_SHEETS) {
    addPlantaDetalleSheet(wb, detalleGastosByPlanta[cfg.clave] || [], mesA, cfg, {
      sheetSuffix: "G",
      listadoLabel: "Listado de Gastos",
      totalLabelPrefix: "TOTAL GASTOS",
      emptyMsg: "GASTOS",
      sections: PLANTA_GASTO_SECTIONS,
      matchSubcat: matchGastoSubcat,
      tabColor: "FFFF0000", // rojo
    });
    addPlantaDetalleSheet(wb, detalleInversionesByPlanta[cfg.clave] || [], mesA, cfg, {
      sheetSuffix: "I",
      listadoLabel: "Listado de Inversiones",
      totalLabelPrefix: "TOTAL INVERSIONES",
      emptyMsg: "INVERSIONES",
      sections: PLANTA_INVERSION_SECTIONS,
      matchSubcat: matchInversionSubcat,
      tabColor: "FF437C2C", // verde
    });
    addPlantaTallerSheet(wb, detalleTallerByPlanta[cfg.clave] || [], mesA, cfg);
  }

  return wb;
}

/** Subcategorías fijas de INVERSIONES (misma orden que la plantilla corporativa). */
const INVERSION_SUBCATS = [
  { key: "equipo_planta", label: "EQUIPO PARA PLANTA", match: (s) => /EQUIPO/.test(s) && /PLANTA/.test(s) },
  { key: "instalaciones", label: "INSTALACIONES A CLIENTES", match: (s) => /INSTALACION/.test(s) },
  { key: "publicidad", label: "PUBLICIDAD", match: (s) => /PUBLICIDAD/.test(s) },
  { key: "tanques", label: "TANQUES Y CILINDROS", match: (s) => /TANQUE|CILINDRO/.test(s) },
  { key: "estaciones", label: "ESTACIONES", match: (s) => /ESTACION/.test(s) },
];

/** Columna catch-all: folios INVERSIONES sin subcategoría o con texto no catalogado. */
const INVERSION_OTROS = { key: "otros", label: "OTROS" };

function normalizeSubcatKey(sub) {
  return String(sub || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchInversionSubcat(subcategoria) {
  const s = normalizeSubcatKey(subcategoria);
  if (!s) return INVERSION_OTROS.key;
  for (const sc of INVERSION_SUBCATS) {
    if (sc.match(s)) return sc.key;
  }
  return INVERSION_OTROS.key;
}

/**
 * Segunda hoja INVERSIONES: subcategorías por planta del mes principal (mesA).
 * D–H = subcats catalogadas, I = OTROS (sin match / vacía), J = total renglón (= COMPARATIVOS).
 */
function addInversionesSheet(wb, rows, mesA) {
  const labelMes = mesLabelEs(mesA);
  const ws = wb.addWorksheet("INVERSIONES", { views: [{ showGridLines: false }] });

  const dataCols = ["D", "E", "F", "G", "H", "I"]; // 5 subcats + OTROS
  const totalCol = "J";
  const lastCol = totalCol;

  ws.getColumn("A").width = 3;
  ws.getColumn("B").width = 18;
  ws.getColumn("C").width = 3;
  [...dataCols, totalCol].forEach((col) => {
    ws.getColumn(col).width = 18;
  });

  safeMerge(ws, `D1:${lastCol}1`);
  safeMerge(ws, `D2:${lastCol}2`);
  safeMerge(ws, `D3:${lastCol}3`);
  [
    ["D1", "ZONA PROVINCIA"],
    ["D2", "CLASIFICACIÓN DE INVERSIONES"],
    ["D3", labelMes],
  ].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyFont(c, { bold: true, color: { argb: "FF548235" }, size: 12 });
  });

  const hPlan = ws.getCell("B5");
  hPlan.value = "PLANTA";
  applyFont(hPlan, { bold: true });
  hPlan.alignment = { horizontal: "center", vertical: "middle" };
  hPlan.border = thinBorder();
  applyFill(hPlan, "FFFFFFFF");
  safeMerge(ws, "B5:C5");

  INVERSION_SUBCATS.forEach((sc, i) => {
    const cell = ws.getCell(`${dataCols[i]}5`);
    cell.value = sc.label;
    applyFont(cell, { bold: true, color: { argb: "FFFFFFFF" }, size: 10 });
    applyFill(cell, "FFFF0000");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });

  const hOtros = ws.getCell("I5");
  hOtros.value = INVERSION_OTROS.label;
  applyFont(hOtros, { bold: true, color: { argb: "FFFFFFFF" }, size: 10 });
  applyFill(hOtros, "FFFF6600"); // naranja: montos no catalogados
  hOtros.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  hOtros.border = thinBorder();

  const hInv = ws.getCell(`${totalCol}5`);
  hInv.value = "INVERSION";
  applyFont(hInv, { bold: true, color: { argb: "FFFFFFFF" }, size: 10 });
  applyFill(hInv, "FFC00000");
  hInv.alignment = { horizontal: "center", vertical: "middle" };
  hInv.border = thinBorder();

  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  // key: `${canonIdx}|${subKey}` -> sum
  const byKey = new Map();
  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA) continue;
    if (normalizeCat(r.categoria) !== "INVERSIONES") continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const subText = r.subcategoria || r.unidad || "";
    const subKey = matchInversionSubcat(subText);
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    const key = `${canon}|${subKey}`;
    byKey.set(key, (byKey.get(key) || 0) + imp);
  }

  const allKeys = [...INVERSION_SUBCATS.map((s) => s.key), INVERSION_OTROS.key];
  const NUM_FMT = '$#,##0.00;-$#,##0.00;"-"';
  const plantRows = [7, 8, 9, 10, 11, 12];

  PLANTAS_COMPARATIVO.forEach((p, i) => {
    const row = plantRows[i];
    const cellB = ws.getCell(`B${row}`);
    cellB.value = p.label;
    applyFont(cellB, { bold: true });
    cellB.border = thinBorder();
    safeMerge(ws, `B${row}:C${row}`);

    allKeys.forEach((key, j) => {
      const col = dataCols[j];
      const amount = byKey.get(`${i}|${key}`) || 0;
      const cell = ws.getCell(`${col}${row}`);
      cell.value = Math.round(amount * 100) / 100;
      cell.numFmt = NUM_FMT;
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder();
    });

    const tot = ws.getCell(`${totalCol}${row}`);
    tot.value = { formula: `SUM(D${row}:I${row})` };
    tot.numFmt = NUM_FMT;
    tot.alignment = { horizontal: "center" };
    tot.border = thinBorder();
  });

  // TOTAL PROVINCIA
  const totLabel = ws.getCell("B14");
  totLabel.value = "TOTAL PROVINCIA";
  applyFont(totLabel, { bold: true });
  applyFill(totLabel, "FFD9D9D9");
  totLabel.border = thinBorder();
  safeMerge(ws, "B14:C14");
  applyFill(ws.getCell("C14"), "FFD9D9D9");
  ws.getCell("C14").border = thinBorder();

  dataCols.forEach((col) => {
    const c = ws.getCell(`${col}14`);
    c.value = { formula: `SUM(${col}7:${col}12)` };
    c.numFmt = NUM_FMT;
    applyFont(c, { bold: true });
    applyFill(c, "FFD9D9D9");
    c.border = thinBorder();
    c.alignment = { horizontal: "center" };
  });

  const j14 = ws.getCell(`${totalCol}14`);
  j14.value = { formula: `SUM(${totalCol}7:${totalCol}12)` };
  j14.numFmt = NUM_FMT;
  applyFont(j14, { bold: true });
  applyFill(j14, "FFD9D9D9");
  j14.border = thinBorder();
  j14.alignment = { horizontal: "center" };

  ws.getRow(5).height = 30;
}

/** Índices de columna Excel 1-based → letra (1=A …). */
function colLetter(n) {
  let s = "";
  let x = Number(n);
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/**
 * Subcategorías de GASTOS: plantilla corporativa + catálogo de la app.
 * (Foto: Jurídico, Liquidaciones, Pasivos, Permisos, Rentas, Bonos, Varios;
 *  app también: Contractuales, Equipo planta, Estaciones, Trámites, Viáticos.)
 */
const GASTO_SUBCATS = [
  { key: "juridicos", label: "JURÍDICO", match: (s) => /JURIDICO/.test(s) },
  { key: "liquidaciones", label: "LIQUIDACIONES LABORALES", match: (s) => /LIQUIDACION/.test(s) },
  { key: "pasivos", label: "PASIVOS MESES ANTERIORES", match: (s) => /PASIVO/.test(s) },
  { key: "permisos", label: "PERMISOS", match: (s) => /PERMISO/.test(s) },
  { key: "rentas", label: "RENTAS", match: (s) => /\bRENTAS?\b/.test(s) || s === "RENTA" || s === "RENTAS" },
  { key: "bonos", label: "BONOS POR VENTA", match: (s) => /BONO/.test(s) },
  { key: "contractuales", label: "CONTRACTUALES", match: (s) => /CONTRACTUAL/.test(s) },
  { key: "equipo_planta", label: "EQUIPO PLANTA", match: (s) => /EQUIPO/.test(s) },
  { key: "estaciones", label: "ESTACIONES", match: (s) => /ESTACION/.test(s) },
  { key: "tramites", label: "TRÁMITES VEHICULARES", match: (s) => /TRAMITE|VEHICULAR/.test(s) },
  { key: "viaticos", label: "VIÁTICOS", match: (s) => /VIATICO/.test(s) },
  { key: "varios", label: "VARIOS", match: (s) => /VARIO/.test(s) },
];

const GASTO_OTROS = { key: "otros", label: "OTROS" };

function matchGastoSubcat(subcategoria) {
  const s = normalizeSubcatKey(subcategoria);
  if (!s) return GASTO_OTROS.key;
  for (const sc of GASTO_SUBCATS) {
    if (sc.match(s)) return sc.key;
  }
  return GASTO_OTROS.key;
}

/**
 * Tercera hoja GASTOS: subcategorías por planta del mes principal (mesA).
 * Encabezados azul (foto), total GASTO en gris oscuro; OTROS para no catalogados.
 */
function addGastosSheet(wb, rows, mesA) {
  const labelMes = mesLabelEs(mesA);
  const ws = wb.addWorksheet("GASTOS", { views: [{ showGridLines: false }] });

  const allSubcats = [...GASTO_SUBCATS, GASTO_OTROS];
  // Foto: datos desde col G; B = PLANTA, C–F margen
  const firstDataCol = 7; // G
  const dataCols = allSubcats.map((_, i) => colLetter(firstDataCol + i));
  const totalCol = colLetter(firstDataCol + allSubcats.length);
  const lastCol = totalCol;
  const firstDataLetter = dataCols[0];
  const lastDataLetter = dataCols[dataCols.length - 1];

  ws.getColumn("A").width = 3;
  ws.getColumn("B").width = 18;
  ws.getColumn("C").width = 3;
  ws.getColumn("D").width = 3;
  ws.getColumn("E").width = 3;
  ws.getColumn("F").width = 3;
  [...dataCols, totalCol].forEach((col) => {
    ws.getColumn(col).width = 16;
  });

  safeMerge(ws, `${firstDataLetter}1:${lastCol}1`);
  safeMerge(ws, `${firstDataLetter}2:${lastCol}2`);
  safeMerge(ws, `${firstDataLetter}3:${lastCol}3`);
  [
    [`${firstDataLetter}1`, "ZONA PROVINCIA"],
    [`${firstDataLetter}2`, "CLASIFICACIÓN DE GASTOS"],
    [`${firstDataLetter}3`, labelMes],
  ].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyFont(c, { bold: true, color: { argb: "FF000000" }, size: 12 });
  });

  const thick = { style: "medium", color: { argb: "FF000000" } };
  const thickBorder = { top: thick, left: thick, bottom: thick, right: thick };

  const hPlan = ws.getCell("B5");
  hPlan.value = "PLANTA";
  applyFont(hPlan, { bold: true });
  hPlan.alignment = { horizontal: "center", vertical: "middle" };
  hPlan.border = thickBorder;
  applyFill(hPlan, "FFFFFFFF");

  allSubcats.forEach((sc, i) => {
    const cell = ws.getCell(`${dataCols[i]}5`);
    cell.value = sc.label;
    applyFont(cell, { bold: true, color: { argb: "FFFFFFFF" }, size: 9 });
    applyFill(cell, sc.key === "otros" ? "FFFF6600" : "FF5B9BD5"); // azul foto / naranja OTROS
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thickBorder;
  });

  const hGasto = ws.getCell(`${totalCol}5`);
  hGasto.value = "GASTO";
  applyFont(hGasto, { bold: true, color: { argb: "FFFFFFFF" }, size: 11 });
  applyFill(hGasto, "FF595959"); // gris oscuro foto
  hGasto.alignment = { horizontal: "center", vertical: "middle" };
  hGasto.border = thickBorder;

  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  const byKey = new Map();
  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA) continue;
    if (normalizeCat(r.categoria) !== "GASTOS") continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const subText = r.subcategoria || r.unidad || "";
    const subKey = matchGastoSubcat(subText);
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    const key = `${canon}|${subKey}`;
    byKey.set(key, (byKey.get(key) || 0) + imp);
  }

  const allKeys = allSubcats.map((s) => s.key);
  const NUM_FMT = '$#,##0.00;-$#,##0.00;"-"';
  const plantRows = [7, 8, 9, 10, 11, 12];

  PLANTAS_COMPARATIVO.forEach((p, i) => {
    const row = plantRows[i];
    const cellB = ws.getCell(`B${row}`);
    cellB.value = p.label;
    applyFont(cellB, { bold: true });
    cellB.border = thinBorder();

    allKeys.forEach((key, j) => {
      const col = dataCols[j];
      const amount = byKey.get(`${i}|${key}`) || 0;
      const cell = ws.getCell(`${col}${row}`);
      cell.value = Math.round(amount * 100) / 100;
      cell.numFmt = NUM_FMT;
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder();
    });

    const tot = ws.getCell(`${totalCol}${row}`);
    tot.value = { formula: `SUM(${firstDataLetter}${row}:${lastDataLetter}${row})` };
    tot.numFmt = NUM_FMT;
    tot.alignment = { horizontal: "center" };
    tot.border = thinBorder();
  });

  const totLabel = ws.getCell("B14");
  totLabel.value = "TOTAL PROVINCIA";
  applyFont(totLabel, { bold: true });
  applyFill(totLabel, "FFD9D9D9");
  totLabel.border = thickBorder;

  dataCols.forEach((col) => {
    const c = ws.getCell(`${col}14`);
    c.value = { formula: `SUM(${col}7:${col}12)` };
    c.numFmt = NUM_FMT;
    applyFont(c, { bold: true });
    applyFill(c, "FFD9D9D9");
    c.border = thickBorder;
    c.alignment = { horizontal: "center" };
  });

  const tot14 = ws.getCell(`${totalCol}14`);
  tot14.value = { formula: `SUM(${totalCol}7:${totalCol}12)` };
  tot14.numFmt = NUM_FMT;
  applyFont(tot14, { bold: true });
  applyFill(tot14, "FFD9D9D9");
  tot14.border = thickBorder;
  tot14.alignment = { horizontal: "center" };

  ws.getRow(5).height = 36;
}

/**
 * Cuarta hoja TALLER: rescate de taller por planta (mes principal).
 * Formato según plantilla: PLANTA | RESCATE DE TALLER; D14 = SUM(D7:D13).
 */
function addTallerSheet(wb, rows, mesA) {
  const labelMes = mesLabelEs(mesA);
  const ws = wb.addWorksheet("TALLER", { views: [{ showGridLines: false }] });

  ws.getColumn("A").width = 18;
  ws.getColumn("B").width = 4;
  ws.getColumn("C").width = 3;
  ws.getColumn("D").width = 5;
  ws.getColumn("E").width = 16;

  // Títulos (columna A, como la muestra)
  [
    ["A1", "ZONA PROVINCIA"],
    ["A2", "RESCATE"],
    ["A3", labelMes],
  ].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    applyFont(c, { bold: true, color: { argb: "FF000000" }, size: 14 });
    c.alignment = { horizontal: "left", vertical: "middle" };
  });

  const thick = { style: "medium", color: { argb: "FF000000" } };
  const thickBorder = { top: thick, left: thick, bottom: thick, right: thick };

  // PLANTA (A5:B6)
  safeMerge(ws, "A5:B6");
  const hPlan = ws.getCell("A5");
  hPlan.value = "PLANTA";
  applyFont(hPlan, { bold: true, size: 11 });
  hPlan.alignment = { horizontal: "center", vertical: "middle" };
  hPlan.border = thinBorder();
  applyFill(hPlan, "FFFFFFFF");
  ws.getCell("B5").border = thinBorder();
  ws.getCell("A6").border = thinBorder();
  ws.getCell("B6").border = thinBorder();

  // RESCATE DE TALLER (D5:E6) — lavanda
  safeMerge(ws, "D5:E6");
  const hRes = ws.getCell("D5");
  hRes.value = "RESCATE DE TALLER";
  applyFont(hRes, { bold: true, size: 11 });
  hRes.alignment = { horizontal: "center", vertical: "middle" };
  applyFill(hRes, "FFE1D5E7");
  hRes.border = thinBorder();
  ["D5", "E5", "D6", "E6"].forEach((addr) => {
    const c = ws.getCell(addr);
    applyFill(c, "FFE1D5E7");
    c.border = thinBorder();
  });

  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  const byPlant = new Array(PLANTAS_COMPARATIVO.length).fill(0);
  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA) continue;
    if (normalizeCat(r.categoria) !== "TALLER") continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    byPlant[canon] += imp;
  }

  const NUM_FMT = "#,##0.00";
  const plantRows = [7, 8, 9, 10, 11, 12];

  PLANTAS_COMPARATIVO.forEach((p, i) => {
    const row = plantRows[i];
    safeMerge(ws, `A${row}:B${row}`);
    const cellA = ws.getCell(`A${row}`);
    cellA.value = p.label;
    applyFont(cellA, { bold: false });
    cellA.alignment = { horizontal: "left", vertical: "middle" };
    cellA.border = thinBorder();
    ws.getCell(`B${row}`).border = thinBorder();

    // Columna D: símbolo $ (como la muestra); montos en E
    // Usuario pidió D14=SUM(D7:D13): los importes van en D y E muestra el mismo bloque visual
    const cellD = ws.getCell(`D${row}`);
    cellD.value = Math.round(byPlant[i] * 100) / 100;
    cellD.numFmt = '$#,##0.00;-$#,##0.00;"-"';
    cellD.alignment = { horizontal: "right", vertical: "middle" };
    cellD.border = thinBorder();

    const cellE = ws.getCell(`E${row}`);
    cellE.border = thinBorder();
    // Merge D:E para que se vea como un bloque de monto (foto D$+E valor)
    safeMerge(ws, `D${row}:E${row}`);
  });

  // TOTAL PROVINCIA
  safeMerge(ws, "A14:B14");
  const totLabel = ws.getCell("A14");
  totLabel.value = "TOTAL PROVINCIA";
  applyFont(totLabel, { bold: true });
  applyFill(totLabel, "FFD9D9D9");
  totLabel.border = thickBorder;
  totLabel.alignment = { horizontal: "left", vertical: "middle" };
  applyFill(ws.getCell("B14"), "FFD9D9D9");
  ws.getCell("B14").border = thickBorder;

  safeMerge(ws, "D14:E14");
  const d14 = ws.getCell("D14");
  d14.value = { formula: "SUM(D7:D13)" };
  d14.numFmt = '$#,##0.00;-$#,##0.00;"-"';
  applyFont(d14, { bold: true });
  applyFill(d14, "FFD9D9D9");
  applyFill(ws.getCell("E14"), "FFD9D9D9");
  d14.border = thickBorder;
  ws.getCell("E14").border = thickBorder;
  d14.alignment = { horizontal: "right", vertical: "middle" };

  ws.getRow(5).height = 18;
  ws.getRow(6).height = 18;
}

/**
 * Quinta hoja RESUMEN: bloque del mes principal (como la 1ª sección de COMPARATIVOS)
 * + líneas y nombres para firma/impresión.
 */
function addResumenSheet(wb, rows, mesA) {
  const labelMes = mesLabelEs(mesA);
  const ws = wb.addWorksheet("RESUMEN", { views: [{ showGridLines: false }] });

  const widths = {
    A: 3, B: 18,
    C: 3, D: 14, E: 3, F: 14, G: 3, H: 14, I: 3, J: 16, K: 3,
  };
  Object.entries(widths).forEach(([col, w]) => {
    ws.getColumn(col).width = w;
  });

  safeMerge(ws, "D1:K1");
  safeMerge(ws, "D2:K2");
  safeMerge(ws, "D3:K3");
  [
    ["D1", "ZONA PROVINCIA"],
    ["D2", "CLASIFICACIÓN DE APOYOS"],
    ["D3", labelMes],
  ].forEach(([addr, text]) => {
    const c = ws.getCell(addr);
    c.value = text;
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyFont(c, { bold: true, color: { argb: "FF548235" }, size: 12 });
  });

  const hPlan = ws.getCell("B5");
  hPlan.value = "PLANTA";
  applyFont(hPlan, { bold: true });
  hPlan.alignment = { horizontal: "center", vertical: "middle" };
  hPlan.border = thinBorder();
  applyFill(hPlan, "FFFFFFFF");

  function headerCat(col, text, fillArgb, mergeTo) {
    const c = ws.getCell(`${col}5`);
    c.value = text;
    applyFont(c, { bold: true, color: { argb: "FFFFFFFF" } });
    applyFill(c, fillArgb);
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder();
    if (mergeTo) {
      safeMerge(ws, `${col}5:${mergeTo}5`);
      const m = ws.getCell(`${mergeTo}5`);
      applyFill(m, fillArgb);
      m.border = thinBorder();
    }
  }

  headerCat("D", "GASTOS", "FF1F4E79");
  headerCat("F", "INVERSIONES", "FFC00000");
  headerCat("H", "TALLER", "FFC65911");
  headerCat("J", "TOTAL APOYOS", "FF5B9BD5", "K");

  const idToCanon = new Map();
  PLANTAS_COMPARATIVO.forEach((p, idx) => {
    p.ids.forEach((id) => idToCanon.set(id, idx));
  });

  const byKey = new Map();
  for (const r of rows || []) {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA) continue;
    const canon = idToCanon.get(Number(r.planta_id));
    if (canon == null) continue;
    const cat = normalizeCat(r.categoria);
    if (!cat) continue;
    const imp = Number(r.importe);
    if (!Number.isFinite(imp)) continue;
    const key = `${canon}|${cat}`;
    byKey.set(key, (byKey.get(key) || 0) + imp);
  }

  function catVal(canonIdx, cat) {
    return byKey.get(`${canonIdx}|${cat}`) || 0;
  }

  const NUM_FMT = "#,##0";
  const mint = { color: { argb: "FF70AD47" } };

  function putDollar(col, row, fontOpts) {
    const d = ws.getCell(`${col}${row}`);
    d.value = "$";
    d.alignment = { horizontal: "right" };
    if (fontOpts) applyFont(d, fontOpts);
  }

  function putAmount(col, row, amount, opts) {
    const v = ws.getCell(`${col}${row}`);
    v.value = Math.round(Number(amount) || 0);
    v.numFmt = NUM_FMT;
    v.alignment = { horizontal: "center" };
    v.border = thinBorder();
    if (opts && opts.font) applyFont(v, opts.font);
    if (opts && opts.fill) applyFill(v, opts.fill);
  }

  const plantRows = [7, 8, 9, 10, 11, 12];
  PLANTAS_COMPARATIVO.forEach((p, i) => {
    const row = plantRows[i];
    const cellB = ws.getCell(`B${row}`);
    cellB.value = p.label;
    cellB.border = thinBorder();

    putDollar("C", row, mint);
    putAmount("D", row, catVal(i, "GASTOS"), { font: mint });
    putDollar("E", row, mint);
    putAmount("F", row, catVal(i, "INVERSIONES"), { font: mint });
    putDollar("G", row, mint);
    putAmount("H", row, catVal(i, "TALLER"), { font: mint });
    putDollar("I", row, mint);
    const tot = ws.getCell(`J${row}`);
    tot.value = { formula: `D${row}+F${row}+H${row}` };
    tot.numFmt = NUM_FMT;
    tot.alignment = { horizontal: "center" };
    tot.border = thinBorder();
    applyFont(tot, { ...mint, bold: true, color: { argb: "FF00B050" } });
    safeMerge(ws, `J${row}:K${row}`);
  });

  const totLabel = ws.getCell("B14");
  totLabel.value = "TOTAL PROVINCIA";
  applyFont(totLabel, { bold: true });
  applyFill(totLabel, "FFD9D9D9");
  totLabel.border = thinBorder();

  const greenBold = { bold: true, color: { argb: "FF00B050" } };
  [["C", "D"], ["E", "F"], ["G", "H"]].forEach(([dc, vc]) => {
    putDollar(dc, 14, greenBold);
    const c = ws.getCell(`${vc}14`);
    c.value = { formula: `SUM(${vc}7:${vc}12)` };
    c.numFmt = NUM_FMT;
    applyFont(c, greenBold);
    applyFill(c, "FFD9D9D9");
    c.border = thinBorder();
    c.alignment = { horizontal: "center" };
  });
  putDollar("I", 14, greenBold);
  const j14 = ws.getCell("J14");
  j14.value = { formula: "SUM(J7:J12)" };
  j14.numFmt = NUM_FMT;
  applyFont(j14, greenBold);
  applyFill(j14, "FFD9D9D9");
  j14.border = thinBorder();
  j14.alignment = { horizontal: "center" };
  safeMerge(ws, "J14:K14");
  applyFill(ws.getCell("K14"), "FFD9D9D9");
  ws.getCell("K14").border = thinBorder();

  // Firmas para impresión
  const firmas = [
    { cols: "B18:D18", name: "ING. LUIS ROGELIO ZARAGOZA A.", title: "DIRECTOR ZONA PROVINCIA" },
    { cols: "E18:G18", name: "CP. DAMIAN DIAZ LOPEZ", title: "COORD. ADMON Y FINANZAS" },
    { cols: "H18:K18", name: "LIC. ALFREDO GONZALEZ RAMIREZ", title: "DIRECTOR ZONA CENTRO" },
  ];

  firmas.forEach(({ cols, name, title }) => {
    const [start, end] = cols.split(":");
    safeMerge(ws, cols);
    const lineCell = ws.getCell(start);
    lineCell.value = "";
    lineCell.border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
    // aplicar borde inferior en el rango merge
    const startCol = start.replace(/\d+/g, "");
    const endCol = end.replace(/\d+/g, "");
    const rowNum = parseInt(start.replace(/\D+/g, ""), 10);
    // borde en celda mergeada es suficiente vía lineCell

    const nameRow = rowNum + 1;
    const titleRow = rowNum + 2;
    safeMerge(ws, `${startCol}${nameRow}:${endCol}${nameRow}`);
    safeMerge(ws, `${startCol}${titleRow}:${endCol}${titleRow}`);
    const n = ws.getCell(`${startCol}${nameRow}`);
    n.value = name;
    applyFont(n, { bold: true, size: 9 });
    n.alignment = { horizontal: "center" };
    const t = ws.getCell(`${startCol}${titleRow}`);
    t.value = title;
    applyFont(t, { size: 8 });
    t.alignment = { horizontal: "center" };
  });
}

const MESES_ABREV = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/**
 * Hojas de listado por planta (E7 G / E7 I, …).
 * clave = código planta; prefijoFecha = columna FECHA (PL/JUL).
 */
const PLANTAS_DETALLE_SHEETS = [
  { clave: "E7", title: "PUEBLA", prefijoFecha: "PL", ids: [2, 14] },
  { clave: "E8", title: "TEHUACÁN", prefijoFecha: "PL", ids: [3, 15] },
  { clave: "E9", title: "ACAPULCO", prefijoFecha: "PL", ids: [1, 11, 12] },
  { clave: "E12", title: "QUERÉTARO", prefijoFecha: "PL", ids: [4, 16] },
  { clave: "E13", title: "SAN LUIS POTOSÍ", prefijoFecha: "PL", ids: [5, 17, 18] },
  { clave: "E15", title: "MORELOS", prefijoFecha: "PL", ids: [6, 13] },
];

/** Alias retrocompatible. */
const PLANTAS_GASTOS_SHEETS = PLANTAS_DETALLE_SHEETS;

/** Orden de secciones en listados de gastos por planta. */
const PLANTA_GASTO_SECTIONS = [
  { key: "equipo_planta", title: "Equipo planta:" },
  { key: "estaciones", title: "Estaciones:" },
  { key: "juridicos", title: "Juridicos:" },
  { key: "liquidaciones", title: "Liquidaciones laborales:" },
  { key: "pasivos", title: "Pasivos meses anteriores:" },
  { key: "contractuales", title: "Contractuales:" },
  { key: "rentas", title: "Rentas:" },
  { key: "tramites", title: "Trámites vehiculares:" },
  { key: "viaticos", title: "Viáticos:" },
  { key: "permisos", title: "Permisos:" },
  { key: "bonos", title: "Bonos por venta:" },
  { key: "varios", title: "Varios:" },
  { key: "otros", title: "Sin subcategoría / Otros:" },
];

/** Orden de secciones en listados de inversiones por planta. */
const PLANTA_INVERSION_SECTIONS = [
  { key: "equipo_planta", title: "Equipo para planta:" },
  { key: "instalaciones", title: "Instalaciones a clientes:" },
  { key: "publicidad", title: "Publicidad:" },
  { key: "tanques", title: "Tanques y cilindros:" },
  { key: "estaciones", title: "Estaciones:" },
  { key: "otros", title: "Sin subcategoría / Otros:" },
];

function mesAbrevFromYyyyMm(yyyyMm) {
  const m = String(yyyyMm || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const idx = parseInt(m[2], 10) - 1;
  return MESES_ABREV[idx] || m[2];
}

function formatFechaEnvioMx(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function expandDetalleLineasRows(detalleRows) {
  const out = [];
  for (const r of detalleRows || []) {
    let lineas = null;
    const raw = r.detalle_lineas;
    if (raw != null) {
      try {
        lineas = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (_) {
        lineas = null;
      }
    }
    if (Array.isArray(lineas) && lineas.length > 1) {
      for (const L of lineas) {
        const concepto = String((L && L.concepto) || "").trim();
        const importe = L && L.importe != null ? Number(L.importe) : NaN;
        if (!concepto || !Number.isFinite(importe)) continue;
        out.push({
          ...r,
          concepto,
          importe,
        });
      }
    } else {
      out.push(r);
    }
  }
  return out;
}

/**
 * Listado por planta (E7 G / E7 I, …): subcategorías, SUMA, TOTAL, firmas.
 * FECHA = PL/(mes); FECHA DE ENVÍO = Depósito y cierre; amarillo si ya depositó.
 */
function addPlantaDetalleSheet(wb, detalleRows, mesA, plantaCfg, opts) {
  opts = opts || {};
  const labelMes = mesLabelEs(mesA);
  const mesAbrev = mesAbrevFromYyyyMm(mesA);
  const prefijo = (plantaCfg && plantaCfg.prefijoFecha) || "PL";
  const sheetSuffix = opts.sheetSuffix || "G";
  const sheetName = `${plantaCfg.clave} ${sheetSuffix}`;
  const titleName = (plantaCfg && plantaCfg.title) || "PLANTA";
  const listadoLabel = opts.listadoLabel || "Listado";
  const totalLabelPrefix = opts.totalLabelPrefix || "TOTAL";
  const emptyMsg = opts.emptyMsg || "folios";
  const sections = opts.sections || PLANTA_GASTO_SECTIONS;
  const matchSubcat = opts.matchSubcat || matchGastoSubcat;
  const tabColor = opts.tabColor || null;
  const codigoFecha = mesAbrev ? `${prefijo}/${mesAbrev}` : prefijo;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
  if (tabColor) {
    try {
      ws.properties.tabColor = { argb: tabColor };
    } catch (_) { /* exceljs older */ }
  }

  const FONT = "Courier New";
  const NUM_FMT = '$#,##0.00;-$#,##0.00;"-"';
  const HDR_FILL = "FF8497B0";
  const SUMA_FILL = "FF767171";
  const TOTAL_FILL = "FFB20000";
  const YELLOW_FILL = "FFFFF2CC";
  const thinBlk = { style: "thin", color: { argb: "FF000000" } };
  const borderAll = { top: thinBlk, left: thinBlk, bottom: thinBlk, right: thinBlk };

  ws.getColumn("A").width = 3;
  ws.getColumn("B").width = 14;
  ws.getColumn("C").width = 14;
  ws.getColumn("D").width = 72;
  ws.getColumn("E").width = 16;

  const title = ws.getCell("B1");
  title.value = titleName;
  title.font = { name: FONT, bold: true, size: 18, color: { argb: "FF000000" } };

  const sub = ws.getCell("B2");
  sub.value = listadoLabel;
  sub.font = { name: FONT, bold: true, size: 12, color: { argb: "FF000000" } };

  const idSet = new Set((plantaCfg.ids || []).map(Number));
  const expanded = expandDetalleLineasRows(detalleRows).filter((r) => {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA || !Number.isFinite(Number(r.importe))) return false;
    if (idSet.size && r.planta_id != null && !idSet.has(Number(r.planta_id))) return false;
    return true;
  });

  const bySection = new Map();
  for (const sc of sections) bySection.set(sc.key, []);
  for (const r of expanded) {
    const key = matchSubcat(r.subcategoria);
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(r);
  }

  let row = 4;
  let grandTotal = 0;
  const sectionsWithData = sections.filter((sc) => (bySection.get(sc.key) || []).length > 0);

  if (!sectionsWithData.length) {
    ws.getCell(`B${row}`).value = `(Sin folios de ${emptyMsg} para ${titleName} en este mes)`;
    ws.getCell(`B${row}`).font = { name: FONT, size: 10, italic: true };
    return;
  }

  for (const sc of sectionsWithData) {
    const items = bySection.get(sc.key) || [];
    const tCell = ws.getCell(`B${row}`);
    tCell.value = sc.title;
    tCell.font = { name: FONT, bold: true, size: 11, color: { argb: "FF000000" } };
    row += 1;

    const headers = [
      ["B", "FECHA"],
      ["C", "IMPORTE"],
      ["D", "BREVE DESCRIPCIÓN"],
      ["E", "FECHA DE ENVÍO"],
    ];
    headers.forEach(([col, text]) => {
      const c = ws.getCell(`${col}${row}`);
      c.value = text;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = borderAll;
    });
    row += 1;

    let sectionSum = 0;
    const firstDataRow = row;
    for (const item of items) {
      const importe = Math.round(Number(item.importe) * 100) / 100;
      sectionSum += importe;
      grandTotal += importe;
      const fechaEnvio = formatFechaEnvioMx(item.fecha_envio);
      const markYellow = Boolean(fechaEnvio);

      const b = ws.getCell(`B${row}`);
      b.value = codigoFecha;
      b.font = { name: FONT, size: 10 };
      b.border = borderAll;
      b.alignment = { horizontal: "left" };

      const c = ws.getCell(`C${row}`);
      c.value = importe;
      c.numFmt = NUM_FMT;
      c.font = { name: FONT, size: 10 };
      c.border = borderAll;
      c.alignment = { horizontal: "right" };

      const d = ws.getCell(`D${row}`);
      d.value = String(item.concepto || "").trim() || "—";
      d.font = { name: FONT, size: 9 };
      d.border = borderAll;
      d.alignment = { horizontal: "left", wrapText: true, vertical: "top" };

      const e = ws.getCell(`E${row}`);
      e.value = fechaEnvio || "";
      e.font = { name: FONT, size: 10 };
      e.border = borderAll;
      e.alignment = { horizontal: "center" };

      if (markYellow) {
        [b, c, d, e].forEach((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW_FILL } };
        });
      }
      ws.getRow(row).height = Math.min(60, 15 + Math.ceil(String(item.concepto || "").length / 70) * 12);
      row += 1;
    }
    const lastDataRow = row - 1;

    const sumaLabel = ws.getCell(`B${row}`);
    sumaLabel.value = "SUMA";
    sumaLabel.font = { name: FONT, bold: true, size: 11, color: { argb: "FF000000" } };

    const sumaVal = ws.getCell(`C${row}`);
    if (lastDataRow >= firstDataRow) {
      sumaVal.value = { formula: `SUM(C${firstDataRow}:C${lastDataRow})` };
    } else {
      sumaVal.value = Math.round(sectionSum * 100) / 100;
    }
    sumaVal.numFmt = NUM_FMT;
    sumaVal.font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    sumaVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUMA_FILL } };
    sumaVal.alignment = { horizontal: "right" };
    sumaVal.border = borderAll;

    row += 2;
  }

  row += 1;
  const totAmt = ws.getCell(`B${row}`);
  safeMerge(ws, `B${row}:C${row}`);
  totAmt.value = Math.round(grandTotal * 100) / 100;
  totAmt.numFmt = NUM_FMT;
  totAmt.font = { name: FONT, bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  totAmt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
  totAmt.alignment = { horizontal: "right", vertical: "middle" };
  applyFill(ws.getCell(`C${row}`), TOTAL_FILL);
  ws.getCell(`C${row}`).border = borderAll;
  totAmt.border = borderAll;

  const totLabel = ws.getCell(`D${row}`);
  totLabel.value = `${totalLabelPrefix} ${labelMes}`;
  totLabel.font = { name: FONT, bold: true, size: 11, color: { argb: "FF000000" } };
  totLabel.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(row).height = 22;

  row += 6;
  ["B", "C", "E"].forEach((col) => {
    const c = ws.getCell(`${col}${row}`);
    c.border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
  });
  ws.getCell(`D${row}`).border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
  safeMerge(ws, `C${row}:D${row}`);

  const nameRow = row + 1;
  const titleRow = row + 2;
  const firmaBlocks = [
    { col: "B", name: "ING. LUIS ROGELIO ZARAGOZA A.", title: "DIRECTOR ZONA PROVINCIA", merge: null },
    { col: "C", name: "CF. DAMIAN DIAZ LOPEZ", title: "COORD. ADMON Y FINANZAS", merge: true },
    { col: "E", name: "LIC. ALFREDO GONZALEZ RAMIREZ", title: "DIRECTOR ZONA CENTRO", merge: null },
  ];
  firmaBlocks.forEach((f) => {
    if (f.merge) {
      safeMerge(ws, `C${nameRow}:D${nameRow}`);
      safeMerge(ws, `C${titleRow}:D${titleRow}`);
    }
    const n = ws.getCell(`${f.col}${nameRow}`);
    n.value = f.name;
    n.font = { name: FONT, bold: true, size: 8 };
    n.alignment = { horizontal: "center", wrapText: true };
    const t = ws.getCell(`${f.col}${titleRow}`);
    t.value = f.title;
    t.font = { name: FONT, size: 7 };
    t.alignment = { horizontal: "center", wrapText: true };
  });
}

/** Columna de tipo Taller según subcategoría (tipo de solicitud). */
function matchTallerTipoCol(subcategoria) {
  const s = normalizeSubcatKey(subcategoria);
  if (!s) return "otros";
  if (/REPARACION/.test(s) && /MAYOR/.test(s)) return "mayor";
  if (/PASIVO|RECUPERACION/.test(s)) return "pasivo";
  if (/PREVENTIVO/.test(s)) return "preventivo";
  return "otros";
}

/**
 * Hoja E7 T / E8 T …: listado Taller por planta.
 * AT | CONCEPTO | MAYOR | PASIVO/RECUPERACIÓN | PREVENTIVO | OTROS | FECHA DE ENVÍO
 * SUMA + fila de % (D11/C11 …).
 */
function addPlantaTallerSheet(wb, detalleRows, mesA, plantaCfg) {
  const titleName = (plantaCfg && plantaCfg.title) || "PLANTA";
  const sheetName = `${plantaCfg.clave} T`;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
  try {
    ws.properties.tabColor = { argb: "FF5B9BD5" }; // azul cielo
  } catch (_) { /* */ }

  const FONT = "Calibri";
  const NUM_FMT = '$#,##0.00;-$#,##0.00;"-"';
  const PCT_FMT = "0%";
  const HDR_FILL = "FF4F6272";
  const YELLOW_FILL = "FFFFF2CC";
  const PCT_COLOR = "FF0070C0";
  const thinBlk = { style: "thin", color: { argb: "FF000000" } };
  const borderAll = { top: thinBlk, left: thinBlk, bottom: thinBlk, right: thinBlk };

  ws.getColumn("A").width = 10;
  ws.getColumn("B").width = 18;
  ws.getColumn("C").width = 36;
  ws.getColumn("D").width = 14;
  ws.getColumn("E").width = 18;
  ws.getColumn("F").width = 14;
  ws.getColumn("G").width = 12;
  ws.getColumn("H").width = 16;

  const t1 = ws.getCell("A1");
  t1.value = titleName;
  t1.font = { name: FONT, bold: true, size: 18, color: { argb: "FF000000" } };

  const t2 = ws.getCell("A2");
  t2.value = "Listado de Taller";
  t2.font = { name: FONT, bold: true, size: 12, color: { argb: "FF000000" } };

  const idSet = new Set((plantaCfg.ids || []).map(Number));
  const expanded = expandDetalleLineasRows(detalleRows).filter((r) => {
    const mes = String(r.mes_cargo || "").trim();
    if (mes !== mesA || !Number.isFinite(Number(r.importe))) return false;
    if (idSet.size && r.planta_id != null && !idSet.has(Number(r.planta_id))) return false;
    return true;
  });

  if (!expanded.length) {
    ws.getCell("A4").value = `(Sin folios de TALLER para ${titleName} en este mes)`;
    ws.getCell("A4").font = { name: FONT, size: 10, italic: true };
    return;
  }

  const headerRow = 5;
  const headers = [
    ["A", "AT"],
    ["B", "CONCEPTO"],
    ["D", "MAYOR"],
    ["E", "PASIVO/RECUPERACIÓN"],
    ["F", "PREVENTIVO"],
    ["G", "OTROS"],
    ["H", "FECHA DE ENVÍO"],
  ];
  safeMerge(ws, `B${headerRow}:C${headerRow}`);
  headers.forEach(([col, text]) => {
    const c = ws.getCell(`${col}${headerRow}`);
    c.value = text;
    c.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = borderAll;
  });
  applyFill(ws.getCell(`C${headerRow}`), HDR_FILL);
  ws.getCell(`C${headerRow}`).border = borderAll;

  let row = 6;
  const firstDataRow = row;
  for (const item of expanded) {
    const importe = Math.round(Number(item.importe) * 100) / 100;
    const tipo = matchTallerTipoCol(item.subcategoria);
    const fechaEnvio = formatFechaEnvioMx(item.fecha_envio);
    const markYellow = Boolean(fechaEnvio);
    const unidad = String(item.unidad || "").trim() || "—";

    const a = ws.getCell(`A${row}`);
    a.value = unidad;
    a.font = { name: FONT, size: 10 };
    a.border = borderAll;
    a.alignment = { horizontal: "center" };

    safeMerge(ws, `B${row}:C${row}`);
    const b = ws.getCell(`B${row}`);
    b.value = String(item.concepto || "").trim() || "—";
    b.font = { name: FONT, size: 9 };
    b.border = borderAll;
    b.alignment = { horizontal: "left", wrapText: true, vertical: "top" };
    ws.getCell(`C${row}`).border = borderAll;

    ["D", "E", "F", "G"].forEach((col) => {
      const cell = ws.getCell(`${col}${row}`);
      cell.value = null;
      cell.numFmt = NUM_FMT;
      cell.font = { name: FONT, size: 10 };
      cell.border = borderAll;
      cell.alignment = { horizontal: "right" };
    });
    const colMap = { mayor: "D", pasivo: "E", preventivo: "F", otros: "G" };
    const amountCol = colMap[tipo] || "G";
    const amtCell = ws.getCell(`${amountCol}${row}`);
    amtCell.value = importe;

    const h = ws.getCell(`H${row}`);
    h.value = fechaEnvio || "";
    h.font = { name: FONT, size: 10 };
    h.border = borderAll;
    h.alignment = { horizontal: "center" };

    if (markYellow) {
      ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
        ws.getCell(`${col}${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW_FILL } };
      });
    }
    ws.getRow(row).height = Math.min(48, 15 + Math.ceil(String(item.concepto || "").length / 55) * 12);
    row += 1;
  }
  const lastDataRow = row - 1;
  const sumaRow = row;
  const pctRow = row + 1;

  // SUMA
  const sumaA = ws.getCell(`A${sumaRow}`);
  sumaA.value = "SUMA";
  sumaA.font = { name: FONT, bold: true, size: 11, color: { argb: "FF000000" } };
  sumaA.border = borderAll;

  // Total en B:C fusionado: Excel solo guarda el valor en B (celda maestra).
  // Las % deben dividir entre $B$, no $C$ (C queda vacío → #DIV/0!).
  safeMerge(ws, `B${sumaRow}:C${sumaRow}`);
  const sumaTotal = ws.getCell(`B${sumaRow}`);
  sumaTotal.value = { formula: `SUM(D${sumaRow}:G${sumaRow})` };
  sumaTotal.numFmt = NUM_FMT;
  sumaTotal.font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  sumaTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR_FILL } };
  sumaTotal.alignment = { horizontal: "right", vertical: "middle" };
  sumaTotal.border = borderAll;
  applyFill(ws.getCell(`C${sumaRow}`), HDR_FILL);
  ws.getCell(`C${sumaRow}`).border = borderAll;
  ws.getCell(`C${sumaRow}`).font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };

  ["D", "E", "F", "G"].forEach((col) => {
    const cell = ws.getCell(`${col}${sumaRow}`);
    cell.value = { formula: `SUM(${col}${firstDataRow}:${col}${lastDataRow})` };
    cell.numFmt = NUM_FMT;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: "FF000000" } };
    cell.border = borderAll;
    cell.alignment = { horizontal: "right" };
  });
  ws.getCell(`H${sumaRow}`).border = borderAll;

  // Porcentajes: IF evita #DIV/0! si el total es 0
  ["D", "E", "F", "G"].forEach((col) => {
    const cell = ws.getCell(`${col}${pctRow}`);
    cell.value = {
      formula: `IF($B$${sumaRow}=0,0,${col}${sumaRow}/$B$${sumaRow})`,
    };
    cell.numFmt = PCT_FMT;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: PCT_COLOR } };
    cell.border = borderAll;
    cell.alignment = { horizontal: "center" };
  });
  ["A", "B", "C", "H"].forEach((col) => {
    ws.getCell(`${col}${pctRow}`).border = borderAll;
  });
}

module.exports = {
  PLANTAS_COMPARATIVO,
  PLANTAS_GASTOS_SHEETS,
  PLANTAS_DETALLE_SHEETS,
  mesLabelEs,
  normalizeCat,
  buildClasificacionMatrix,
  buildClasificacionApoyosWorkbook,
  INVERSION_SUBCATS,
  GASTO_SUBCATS,
};
