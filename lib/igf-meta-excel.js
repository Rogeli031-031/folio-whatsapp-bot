/**
 * Exportación Excel IGF META (igf_meta.versions + igf_meta.meta_lines).
 * Hoja META: plantilla Compromiso (VBA Subir_IGF_META_Global).
 * Hoja EVALUACION: plantilla fija de puntuación (título dinámico por año/mes).
 */

const ExcelJS = require("exceljs");

const META_RAW_COLS = [
  "empresa",
  "venta_ton",
  "margen_kg",
  "com_desc_kg",
  "gasto_kg",
  "impuesto_kg",
  "hg_pct",
  "hg_kg",
  "bancos_planta_kg",
  "provision_planta_kg",
  "util_oper_kg",
  "util_oper_importe",
  "gtos_apoyos_corp_kg",
  "bancos_corp_kg",
  "otros_programas_kg",
  "inversiones_kg",
  "resultado_final_kg",
  "resultado_final_importe",
];

const HEADER_ROW7 = [
  "Empresa",
  "Venta",
  "Margen",
  "Com. y Desc.",
  "Gasto",
  "Impuestos",
  "HG - %",
  "HG - $/Kg",
  "Bancos Planta",
  "Provisión Planta",
  "Util. Operación - $/Kg",
  "Util. Operación - Importe",
  "Gtos, Apoyos y Prov",
  "Bancos Corp.",
  "Otros Programas",
  "Inversiones",
  "Resultado Final - $/Kg",
  "Resultado Final - Importe",
];

const HEADER_ROW6 = [
  "Empresa",
  "Venta y margen",
  "Venta y margen",
  "Venta y margen",
  "Gasto operativo",
  "Gasto operativo",
  "HG",
  "HG",
  "Planta",
  "Planta",
  "Utilidad operación",
  "Utilidad operación",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Corporativo",
  "Resultado",
  "Resultado",
];

const MESES_ES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const FILL_NAVY = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const FILL_VALOR_TOTAL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
const FILL_WHITE = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
const BORDER_GRID = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};
const FONT_HEADER = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const FONT_TITLE_RED = { bold: true, color: { argb: "FFFF0000" }, size: 12 };
const FONT_SECTION = { bold: true, size: 11 };
const FONT_BODY = { size: 11 };

/** Secciones fijas hoja EVALUACION (columna B = ítem, D = puntos VALOR). */
const EVALUACION_SECTIONS = [
  {
    title: "1. VENTA",
    total: 20,
    items: [
      ["ATS CASA", 10],
      ["ESTACIONES", 10],
      ["COMISIONISTAS Y PREDIOS", 4],
      ["VTA. AÑO ANTERIOR", 1],
      ["META", 10],
    ],
  },
  {
    title: "2. RENTABILIDAD",
    total: 20,
    items: [
      ["OPERATIVA", 10],
      ["FINAL (SIN INVERSIONES)", 10],
    ],
  },
  {
    title: "3. CARTERA",
    total: 8,
    items: [
      ["CUMPLIMIENTO EN %", 4],
      ["VENCIDOS", 6],
    ],
  },
  {
    title: "4. HG",
    total: 20,
    items: [
      ["6.0 - 7.0", 0],
      ["7.1 - 8.0", 2],
      ["8.1 - 9.0", 4],
      ["9.1 - 10.0", 6],
      ["MÁS DE 10.1", 8],
    ],
  },
  {
    title: "5. COMISIONES",
    total: 12,
    items: [
      ["DIF. MÁS DE 0.10 > 0.15", 1],
      ["DIF. MÁS DE 0.05 > 0.10", 4],
      ["CUMPLIO", 5],
    ],
  },
  {
    title: "6. PLAN MAESTRO",
    total: 20,
    items: [
      ["OFICINAS", 4],
      ["TALLER", 4],
      ["SISTEMA vs INCENDIO", 4],
      ["ERP", 4],
      ["IMAGEN CORPORATIVA", 4],
    ],
  },
];

function padRow(row, n) {
  const out = row.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildDataRows(dbRows) {
  const out = [];
  for (const row of dbRows) {
    const line = [];
    for (const key of META_RAW_COLS) {
      if (key === "empresa") {
        line.push(row.empresa != null ? String(row.empresa).trim() : "");
        continue;
      }
      const n = toNum(row[key]);
      if (n == null) {
        line.push("");
        continue;
      }
      if (key === "hg_pct") {
        line.push(Math.round(n * 100 * 1e6) / 1e6);
      } else {
        line.push(n);
      }
    }
    out.push(line);
  }
  return out;
}

function buildMetaSheetAoa(year, month, dataRows) {
  const n = HEADER_ROW7.length;
  const title = `${(MESES_ES[month] || "Mes").toUpperCase()}, ${year}`;
  const rows = [];
  rows.push(padRow([title], n));
  for (let i = 0; i < 4; i++) rows.push(padRow([], n));
  rows.push(padRow(HEADER_ROW6, n));
  rows.push(padRow(HEADER_ROW7, n));
  rows.push(padRow([], n));
  for (const line of dataRows) rows.push(padRow(line, n));
  return rows;
}

function setCell(ws, row, col, value, style = {}) {
  const c = ws.getCell(row, col);
  c.value = value;
  if (style.fill) c.fill = style.fill;
  if (style.font) c.font = style.font;
  if (style.alignment) c.alignment = style.alignment;
  if (style.border) c.border = style.border;
  if (style.numFmt) c.numFmt = style.numFmt;
  return c;
}

function applyHeaderCell(ws, row, col, text, mergeToCol = null) {
  if (mergeToCol != null && mergeToCol > col) {
    try {
      ws.mergeCells(row, col, row, mergeToCol);
    } catch {
      /* ya fusionado */
    }
  }
  for (let cc = col; cc <= (mergeToCol || col); cc++) {
    const cell = ws.getCell(row, cc);
    cell.value = cc === col ? text : null;
    cell.fill = FILL_NAVY;
    cell.font = FONT_HEADER;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER_GRID;
  }
}

/**
 * Hoja EVALUACION: layout y valores fijos; solo cambia «EVALUACIÓN: {MES} {AÑO}» en A2.
 */
function addEvaluacionSheet(wb, year, month) {
  const ws = wb.addWorksheet("EVALUACION", {
    views: [{ showGridLines: true }],
  });

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 4;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 10;

  const mesNombre = (MESES_ES[month] || "MES").toUpperCase();
  const tituloEval = `EVALUACIÓN: ${mesNombre} ${year}`;

  setCell(ws, 2, 1, tituloEval, { font: FONT_TITLE_RED, fill: FILL_WHITE, border: BORDER_GRID });
  setCell(ws, 2, 2, null, { fill: FILL_WHITE, border: BORDER_GRID });
  setCell(ws, 2, 3, null, { fill: FILL_WHITE, border: BORDER_GRID });

  try {
    ws.mergeCells(2, 4, 2, 5);
  } catch {
    /* ignore */
  }
  const vt = ws.getCell(2, 4);
  vt.value = "VALOR TOTAL";
  vt.fill = FILL_VALOR_TOTAL;
  vt.font = FONT_HEADER;
  vt.alignment = { vertical: "middle", horizontal: "center" };
  vt.border = BORDER_GRID;
  setCell(ws, 2, 5, null, { fill: FILL_VALOR_TOTAL, border: BORDER_GRID });

  setCell(ws, 2, 6, null, { fill: FILL_WHITE, border: BORDER_GRID });
  setCell(ws, 2, 7, null, { fill: FILL_WHITE, border: BORDER_GRID });

  try {
    ws.mergeCells(4, 1, 4, 2);
  } catch {
    /* ignore */
  }
  const pt = ws.getCell(4, 1);
  pt.value = "PUNTUACIÓN TOTAL";
  pt.fill = FILL_NAVY;
  pt.font = FONT_HEADER;
  pt.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  pt.border = BORDER_GRID;
  setCell(ws, 4, 2, null, { fill: FILL_NAVY, border: BORDER_GRID });

  applyHeaderCell(ws, 4, 4, "VALOR");
  applyHeaderCell(ws, 4, 5, "META");
  applyHeaderCell(ws, 4, 6, "RESULTADO");
  applyHeaderCell(ws, 4, 7, "PUNTOS");

  let row = 6;
  for (const sec of EVALUACION_SECTIONS) {
    setCell(ws, row, 1, sec.title, {
      font: FONT_SECTION,
      fill: FILL_WHITE,
      border: BORDER_GRID,
      alignment: { vertical: "middle", horizontal: "left" },
    });
    setCell(ws, row, 2, null, { fill: FILL_WHITE, border: BORDER_GRID });
    setCell(ws, row, 3, null, { fill: FILL_WHITE, border: BORDER_GRID });
    setCell(ws, row, 4, sec.total, {
      font: FONT_SECTION,
      fill: FILL_WHITE,
      border: BORDER_GRID,
      alignment: { vertical: "middle", horizontal: "center" },
      numFmt: "0",
    });
    for (let col = 5; col <= 7; col++) {
      setCell(ws, row, col, null, { fill: FILL_WHITE, border: BORDER_GRID });
    }
    row += 1;

    for (const [label, pts] of sec.items) {
      setCell(ws, row, 1, null, { fill: FILL_WHITE, border: BORDER_GRID });
      setCell(ws, row, 2, label, {
        font: FONT_BODY,
        fill: FILL_WHITE,
        border: BORDER_GRID,
        alignment: { vertical: "middle", horizontal: "left" },
      });
      setCell(ws, row, 3, null, { fill: FILL_WHITE, border: BORDER_GRID });
      setCell(ws, row, 4, pts, {
        font: FONT_BODY,
        fill: FILL_WHITE,
        border: BORDER_GRID,
        alignment: { vertical: "middle", horizontal: "center" },
        numFmt: "0",
      });
      for (let col = 5; col <= 7; col++) {
        setCell(ws, row, col, null, { fill: FILL_WHITE, border: BORDER_GRID });
      }
      row += 1;
    }
    row += 1;
  }

  return ws;
}

function addMetaSheet(wb, year, month, dataRows) {
  const aoa = buildMetaSheetAoa(year, month, dataRows);
  const ws = wb.addWorksheet("META", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: true }],
  });
  const nCols = HEADER_ROW7.length;
  for (let r = 0; r < aoa.length; r++) {
    const line = aoa[r];
    for (let c = 0; c < nCols; c++) {
      const v = line[c];
      const cell = ws.getCell(r + 1, c + 1);
      if (v === "" || v == null) continue;
      cell.value = v;
      if (r + 1 >= 6 && r + 1 <= 7) {
        cell.fill = FILL_NAVY;
        cell.font = FONT_HEADER;
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    }
  }
  ws.getColumn(1).width = 28;
  for (let c = 2; c <= nCols; c++) ws.getColumn(c).width = 14;
  return ws;
}

async function schemaMetaExists(client) {
  const r = await client.query(
    `SELECT to_regclass('igf_meta.versions') AS v, to_regclass('igf_meta.meta_lines') AS l`
  );
  const row = r.rows && r.rows[0];
  return Boolean(row && row.v && row.l);
}

async function listMetaVersions(client, year, month) {
  const r = await client.query(
    `SELECT id, version_number, is_current, created_at
     FROM igf_meta.versions
     WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
     ORDER BY version_number DESC`,
    [year, month]
  );
  return (r.rows || []).map((row) => ({
    id: Number(row.id),
    version_number: Number(row.version_number),
    is_current: Boolean(row.is_current),
    created_at: row.created_at,
  }));
}

async function loadMetaLinesForVersion(client, year, month, versionNumber) {
  const ver = await client.query(
    `SELECT id, version_number FROM igf_meta.versions
     WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int AND version_number = $3::int
     LIMIT 1`,
    [year, month, versionNumber]
  );
  if (!ver.rows || !ver.rows[0]) return null;
  const versionId = Number(ver.rows[0].id);
  const lines = await client.query(
    `SELECT * FROM igf_meta.meta_lines WHERE version_id = $1::int ORDER BY empresa`,
    [versionId]
  );
  return {
    version_id: versionId,
    version_number: Number(ver.rows[0].version_number),
    lines: lines.rows || [],
  };
}

/**
 * @returns {Promise<Buffer>}
 */
async function buildIgfMetaExcelBuffer(client, year, month, versionNumber) {
  const pack = await loadMetaLinesForVersion(client, year, month, versionNumber);
  if (!pack) {
    const err = new Error(
      `No hay versión META v${versionNumber} para ${year}-${String(month).padStart(2, "0")}`
    );
    err.statusCode = 404;
    throw err;
  }
  const dataRows = buildDataRows(pack.lines);
  const wb = new ExcelJS.Workbook();
  wb.creator = "folio-dashboard";
  addMetaSheet(wb, year, month, dataRows);
  addEvaluacionSheet(wb, year, month);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

module.exports = {
  schemaMetaExists,
  listMetaVersions,
  loadMetaLinesForVersion,
  buildIgfMetaExcelBuffer,
  META_RAW_COLS,
  EVALUACION_SECTIONS,
};
