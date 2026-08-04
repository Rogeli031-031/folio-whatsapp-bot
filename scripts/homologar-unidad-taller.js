/**
 * Homologa folios.unidad (categoría Taller) con la misma lógica que lib/unidad-taller.js.
 *
 * Uso:
 *   node scripts/homologar-unidad-taller.js           # dry-run
 *   node scripts/homologar-unidad-taller.js --apply   # escribe en DB
 *
 * Requiere DATABASE_URL (o PG* vars) como el server.
 */
require("dotenv").config();
const { Pool } = require("pg");
const unidadTaller = require("../lib/unidad-taller");

const APPLY = process.argv.includes("--apply");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT id, numero_folio, unidad, importe, categoria
         FROM public.folios
        WHERE UPPER(TRIM(COALESCE(categoria,''))) LIKE '%TALLER%'
          AND unidad IS NOT NULL
          AND TRIM(unidad) <> ''
        ORDER BY id`
    );
    let changes = 0;
    let multi = 0;
    const samples = [];
    for (const row of r.rows) {
      const resolved = unidadTaller.resolveUnidadTaller(row.unidad);
      if (!resolved.ok || !resolved.stored) continue;
      if (resolved.unidades.length > 1) multi += 1;
      if (resolved.stored === String(row.unidad).trim()) continue;
      changes += 1;
      if (samples.length < 25) {
        samples.push({
          id: row.id,
          folio: row.numero_folio,
          antes: row.unidad,
          despues: resolved.stored,
          unidades: resolved.unidades.length,
          importe: row.importe,
        });
      }
      if (APPLY) {
        await client.query(`UPDATE public.folios SET unidad = $1 WHERE id = $2`, [
          resolved.stored,
          row.id,
        ]);
      }
    }
    console.log(APPLY ? "APPLIED" : "DRY-RUN (pasa --apply para escribir)");
    console.log(`Folios Taller con unidad: ${r.rows.length}`);
    console.log(`A cambiar: ${changes}`);
    console.log(`Multi-unidad (lista): ${multi}`);
    console.log("Muestras:", JSON.stringify(samples, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
