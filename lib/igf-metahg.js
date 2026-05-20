/**
 * Lectura igf_metahg (hoja METAHG subida por planta).
 */

function normalizeEmpresa(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Misma clave que VBA MetaHgPlantCode / presupuestoGendKey. */
function plantCodeFromEmpresa(empresa) {
  const t = normalizeEmpresa(empresa);
  if (!t) return "";
  if (t.includes("puebla")) return "puebla";
  if (t.includes("tehuacan")) return "tehuacan";
  if (t.includes("acapulco")) return "acapulco";
  if (t.includes("queretaro")) return "queretaro";
  if (t.includes("san luis")) return "san luis";
  if (t.includes("morelos")) return "morelos";
  return t.replace(/[^a-z0-9]+/g, "_").slice(0, 80);
}

async function schemaMetahgExists(client) {
  const r = await client.query(`SELECT to_regclass('igf_metahg.versions') AS t`);
  return !!r.rows[0]?.t;
}

/**
 * Líneas METAHG vigentes para una planta y periodo.
 * @returns {Promise<{ ok: boolean, plant_code: string, empresa_label: string|null, year: number, month: number, version_number: number|null, lines: object[] }|null>}
 */
async function loadMetahgForEmpresa(client, empresa, year, month) {
  const plantCode = plantCodeFromEmpresa(empresa);
  if (!plantCode) return null;

  const ver = await client.query(
    `SELECT id, plant_code, empresa_label, version_number
     FROM igf_metahg.versions
     WHERE plant_code = $1 AND year = $2::int AND month = $3::int AND is_current = true
     LIMIT 1`,
    [plantCode, year, month]
  );
  if (!ver.rows?.length) {
    const byLabel = await client.query(
      `SELECT id, plant_code, empresa_label, version_number
       FROM igf_metahg.versions
       WHERE empresa_label ILIKE $1 AND year = $2::int AND month = $3::int AND is_current = true
       LIMIT 1`,
      [String(empresa || "").trim(), year, month]
    );
    if (!byLabel.rows?.length) {
      return {
        ok: false,
        plant_code: plantCode,
        empresa_label: null,
        year,
        month,
        version_number: null,
        lines: [],
      };
    }
    ver.rows[0] = byLabel.rows[0];
  }

  const versionId = Number(ver.rows[0].id);
  const lines = await client.query(
    `SELECT categoria, prom, kilos, comision, total, pct, kilos_h, row_order, is_total_row
     FROM igf_metahg.lines
     WHERE version_id = $1::int AND is_active = true
     ORDER BY row_order, id`,
    [versionId]
  );

  return {
    ok: true,
    plant_code: ver.rows[0].plant_code,
    empresa_label: ver.rows[0].empresa_label,
    year,
    month,
    version_number: Number(ver.rows[0].version_number),
    lines: (lines.rows || []).map((r) => ({
      categoria: r.categoria,
      prom: r.prom != null ? Number(r.prom) : null,
      kilos: r.kilos != null ? Number(r.kilos) : null,
      comision: r.comision != null ? Number(r.comision) : null,
      total: r.total != null ? Number(r.total) : null,
      pct: r.pct != null ? Number(r.pct) : null,
      kilos_h: r.kilos_h != null ? Number(r.kilos_h) : null,
      is_total_row: Boolean(r.is_total_row),
    })),
  };
}

module.exports = {
  plantCodeFromEmpresa,
  schemaMetahgExists,
  loadMetahgForEmpresa,
};
