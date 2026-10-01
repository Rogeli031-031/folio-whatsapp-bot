"use strict";

const dicfAccionesLib = require("./dicf-acciones");

/**
 * Traduce los plant_codes ya resueltos por el motor ARR a planta_id
 * de public.plantas, con alias y equivalentes canónicos.
 * Una consulta por request. No resuelve el literal "Provincia".
 */
async function resolveComentarioPlantaIds(client, plantCodes) {
  const aliases = dicfAccionesLib.ALIAS_PLANTA_NOMBRE || {};
  const labels = [];
  for (const raw of plantCodes || []) {
    const code = String(raw || "").trim();
    if (!code) continue;
    const alias = aliases[code.toLowerCase()] || code;
    labels.push(alias);
    if (alias.toLowerCase() !== code.toLowerCase()) labels.push(code);
  }
  const upper = [...new Set(labels.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  if (!upper.length) return [];
  const found = await client.query(
    `SELECT id
       FROM public.plantas
      WHERE UPPER(TRIM(COALESCE(nombre, ''))) = ANY($1::text[])
         OR UPPER(TRIM(COALESCE(clave, ''))) = ANY($1::text[])`,
    [upper]
  );
  const ids = new Set();
  for (const row of found.rows || []) {
    const rawId = Number(row.id);
    if (!Number.isFinite(rawId)) continue;
    const canon = dicfAccionesLib.getCanonicalPlantaId(rawId);
    for (const id of dicfAccionesLib.getPlantaIdsEquivalentes(canon)) {
      const n = Number(id);
      if (Number.isFinite(n)) ids.add(n);
    }
  }
  return [...ids];
}

module.exports = { resolveComentarioPlantaIds };
