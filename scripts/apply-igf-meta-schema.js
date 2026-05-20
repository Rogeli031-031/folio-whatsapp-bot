/**
 * Crea igf_meta.versions y igf_meta.meta_lines en PostgreSQL.
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-igf-meta-schema.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "sql", "012_igf_meta_global.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    const check = await client.query(`
      SELECT to_regclass('igf_meta.versions') AS versions,
             to_regclass('igf_meta.meta_lines') AS meta_lines
    `);
    console.log("OK — esquema igf_meta creado:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
