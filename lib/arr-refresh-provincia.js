/**
 * Refresca tablas de provincia: venta_toneladas_diarias_provincia y descuento_por_kilo_diario_provincia.
 * Sincroniza arr.provincia_plants desde ARR_ZONA_PROVINCIA (env) y luego recalcula las dos tablas.
 * Ejecutar después de cargar ARR o bajo demanda.
 */

"use strict";

function getProvinciaPlantCodes() {
  const env = (process.env.ARR_ZONA_PROVINCIA || "").trim();
  if (env) return env.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Sincroniza arr.provincia_plants:
 * - Si ARR_ZONA_PROVINCIA está definida, usa esa lista (clave/nombre separados por comas).
 * - Si no, rellena desde public.plantas: primeras 6 por id, excluyendo Corporativo (usa nombre como plant_code).
 * @param {object} client - pg client
 */
async function syncProvinciaPlants(client) {
  const codes = getProvinciaPlantCodes();
  await client.query("DELETE FROM arr.provincia_plants");
  if (codes.length > 0) {
    for (const code of codes) {
      await client.query(
        "INSERT INTO arr.provincia_plants (plant_code) VALUES ($1) ON CONFLICT (plant_code) DO NOTHING",
        [code]
      );
    }
    return;
  }
  // Sin env: mismas plantas que public.plantas, solo las primeras 6 (sin corporativo)
  await client.query(`
    INSERT INTO arr.provincia_plants (plant_code)
    SELECT p.nombre
      FROM public.plantas p
      WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
        AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
      ORDER BY p.id ASC
      LIMIT 6
    ON CONFLICT (plant_code) DO NOTHING
  `);
}

/**
 * Refresca venta_toneladas_diarias_provincia y descuento_por_kilo_diario_provincia
 * usando solo plantas en arr.provincia_plants.
 * @param {object} client - pg client
 * @returns {Promise<{ ventaRows: number, descuentoRows: number }>} aproximado de filas afectadas
 */
async function refreshProvinciaDiario(client) {
  await syncProvinciaPlants(client);

  const r1 = await client.query(`
    INSERT INTO arr.venta_toneladas_diarias_provincia (plant_code, fecha, venta_ton)
    WITH prov_map AS (
      SELECT DISTINCT
             p.nombre AS prov_name,
             UPPER(TRIM(p.nombre)) AS key_nombre,
             UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
        FROM public.plantas p
        JOIN arr.provincia_plants ap
          ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
          OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
       WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
         AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
    )
    SELECT pm.prov_name AS plant_code,
           v.fecha,
           ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
      FROM arr.ventas_diarias_cliente v
      JOIN prov_map pm
        ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
        OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
      GROUP BY pm.prov_name, v.fecha
    ON CONFLICT (plant_code, fecha) DO UPDATE SET venta_ton = EXCLUDED.venta_ton
  `);

  const r2 = await client.query(`
    INSERT INTO arr.descuento_por_kilo_diario_provincia (plant_code, fecha, descuento_por_kg)
    WITH prov_map AS (
      SELECT DISTINCT
             p.nombre AS prov_name,
             UPPER(TRIM(p.nombre)) AS key_nombre,
             UPPER(TRIM(COALESCE(p.clave, ''))) AS key_clave
        FROM public.plantas p
        JOIN arr.provincia_plants ap
          ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
          OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
       WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
         AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
    )
    SELECT k.plant_code, k.fecha,
           ROUND((d.total_monto / NULLIF(k.total_kg, 0))::numeric, 2) AS descuento_por_kg
      FROM (
        SELECT pm.prov_name AS plant_code, v.fecha, SUM(v.kg) AS total_kg
          FROM arr.ventas_diarias_cliente v
          JOIN prov_map pm
            ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
            OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
         GROUP BY pm.prov_name, v.fecha
      ) k
      JOIN (
        SELECT pm.prov_name AS plant_code, d.fecha, SUM(d.monto) AS total_monto
          FROM arr.descuentos_diarios_cliente d
          JOIN prov_map pm
            ON UPPER(TRIM(d.plant_code)) = pm.key_nombre
            OR (pm.key_clave <> '' AND UPPER(TRIM(d.plant_code)) = pm.key_clave)
         GROUP BY pm.prov_name, d.fecha
      ) d ON d.plant_code = k.plant_code AND d.fecha = k.fecha
    ON CONFLICT (plant_code, fecha) DO UPDATE SET descuento_por_kg = EXCLUDED.descuento_por_kg
  `);

  await client.query(`
    DELETE FROM arr.venta_toneladas_diarias_provincia
     WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants)
  `);
  await client.query(`
    DELETE FROM arr.descuento_por_kilo_diario_provincia
     WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants)
  `);

  return {
    ventaRows: (r1 && r1.rowCount) != null ? r1.rowCount : 0,
    descuentoRows: (r2 && r2.rowCount) != null ? r2.rowCount : 0,
  };
}

module.exports = {
  getProvinciaPlantCodes,
  syncProvinciaPlants,
  refreshProvinciaDiario,
};
