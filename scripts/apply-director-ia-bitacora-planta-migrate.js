/**
 * Normaliza planta_id en bitácoras con empresa escrita a mano (Sprint 2A.1).
 * Uso (PowerShell):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-director-ia-bitacora-planta-migrate.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "sql", "015_director_ia_bitacora_normalize_planta.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const before = await client.query(`
      SELECT id, planta_id, empresa
      FROM arr.director_ia_bitacora
      WHERE is_active = true
      ORDER BY id
    `);
    console.log("Antes:", before.rows);

    await client.query(sql);

    const after = await client.query(`
      SELECT id, planta_id, empresa,
             p.nombre AS planta_nombre
      FROM arr.director_ia_bitacora b
      LEFT JOIN public.plantas p ON p.id = b.planta_id
      WHERE b.is_active = true
      ORDER BY b.id
    `);
    console.log("Después:", after.rows);
    console.log("OK — migración 015 aplicada.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
