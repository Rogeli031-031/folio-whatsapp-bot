/**
 * Crea igf_metahg.versions y igf_metahg.lines en PostgreSQL.
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-igf-metahg-schema.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlDir = path.join(__dirname, "..", "sql");
const sqlFiles = ["013_igf_metahg_1_versions.sql", "013_igf_metahg_2_lines.sql"];

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const f of sqlFiles) {
      const sql = fs.readFileSync(path.join(sqlDir, f), "utf8");
      await client.query(sql);
    }
    const check = await client.query(`
      SELECT to_regclass('igf_metahg.versions') AS versions,
             to_regclass('igf_metahg.lines') AS lines
    `);
    console.log("OK — esquema igf_metahg creado:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
