/**
 * Crea arr.comercial_entidad y arr.comercial_entidad_alias (Sprint 2C).
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-comercial-entidad-schema.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "sql", "016_comercial_entidad.sql");
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
      SELECT to_regclass('arr.comercial_entidad') AS comercial_entidad,
             to_regclass('arr.comercial_entidad_alias') AS comercial_entidad_alias
    `);
    console.log("OK — tablas Entidades Comerciales:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
