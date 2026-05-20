/**
 * Exportación Excel IGF META (igf_meta.versions + igf_meta.meta_lines).
 * Misma plantilla de hoja que Compromiso (encabezados filas 6–7, datos desde 9) para VBA Subir_IGF_META_Global.
 */

const XLSX = require("xlsx");

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

function buildSheetAoa(year, month, dataRows) {
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
  const aoa = buildSheetAoa(year, month, dataRows);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "META");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  schemaMetaExists,
  listMetaVersions,
  loadMetaLinesForVersion,
  buildIgfMetaExcelBuffer,
  META_RAW_COLS,
};
