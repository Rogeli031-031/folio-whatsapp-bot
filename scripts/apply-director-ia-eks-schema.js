/**
 * Crea esquema eks y tabla eks.snapshots (EKS v1, M1).
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:DATABASE_URL="postgresql://..."
 *   node scripts/apply-director-ia-eks-schema.js
 *
 * No usa el Pool de server.js (D8: pool/cliente propio).
 * No lee tablas operacionales.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (misma URL que usa el bot / Render).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "sql", "015_director_ia_eks.sql");
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
      SELECT to_regclass('eks.snapshots') AS snapshots,
             to_regclass('eks.trace_locks') AS trace_locks
    `);
    console.log("OK — EKS:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
