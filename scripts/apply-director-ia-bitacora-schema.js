/**
 * Crea arr.director_ia_bitacora (Bitácora IA — Sprint 2A).
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-director-ia-bitacora-schema.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "sql", "014_director_ia_bitacora.sql");
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
      SELECT to_regclass('arr.director_ia_bitacora') AS director_ia_bitacora
    `);
    console.log("OK — tabla Bitácora IA:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
