"use strict";

/**
 * Carga read-only de folios para análisis de duplicados.
 * Extraída del handler HTTP de análisis de duplicados para reutilizar
 * la misma query y scope de planta sin transporte interno.
 */

const { getPlantaIdsEquivalentes } = require("./dicf-acciones");

/**
 * @param {import("pg").PoolClient} client
 * @param {number} plantaId
 * @param {string|null} desde YYYY-MM-DD
 * @param {string|null} hasta YYYY-MM-DD
 * @param {{ resolveEquivalentIds?: (plantaId: number) => number[] }} [opts]
 */
async function loadFoliosParaDuplicados(client, plantaId, desde, hasta, opts = {}) {
  const resolveIds =
    typeof opts.resolveEquivalentIds === "function"
      ? opts.resolveEquivalentIds
      : getPlantaIdsEquivalentes;
  const ids = resolveIds(plantaId);
  const plantaIds = ids.length ? ids : [plantaId];
  const params = [plantaIds];
  let where = `f.planta_id = ANY($1::int[]) AND UPPER(TRIM(COALESCE(f.estatus,''))) <> 'CANCELADO'`;
  if (desde) {
    params.push(desde);
    where += ` AND f.creado_en >= $${params.length}::date`;
  }
  if (hasta) {
    params.push(hasta);
    where += ` AND f.creado_en < ($${params.length}::date + INTERVAL '1 day')`;
  }
  const r = await client.query(
    `SELECT f.id, f.numero_folio, f.folio_codigo, f.importe, f.estatus, f.mes_cargo, f.creado_en,
            COALESCE(f.descripcion, f.concepto) AS concepto
     FROM public.folios f
     WHERE ${where}
     ORDER BY f.creado_en DESC NULLS LAST
     LIMIT 1500`,
    params
  );
  return r.rows;
}

module.exports = {
  loadFoliosParaDuplicados,
};
