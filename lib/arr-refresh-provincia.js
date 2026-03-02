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
 * Sincroniza arr.provincia_plants con la lista de ARR_ZONA_PROVINCIA.
 * @param {object} client - pg client
 */
async function syncProvinciaPlants(client) {
  const codes = getProvinciaPlantCodes();
  await client.query("DELETE FROM arr.provincia_plants");
  for (const code of codes) {
    await client.query(
      "INSERT INTO arr.provincia_plants (plant_code) VALUES ($1) ON CONFLICT (plant_code) DO NOTHING",
      [code]
    );
  }
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
    SELECT v.plant_code, v.fecha, ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
      FROM arr.ventas_diarias_cliente v
      WHERE v.plant_code IN (SELECT plant_code FROM arr.provincia_plants)
      GROUP BY v.plant_code, v.fecha
    ON CONFLICT (plant_code, fecha) DO UPDATE SET venta_ton = EXCLUDED.venta_ton
  `);

  const r2 = await client.query(`
    INSERT INTO arr.descuento_por_kilo_diario_provincia (plant_code, fecha, descuento_por_kg)
    SELECT k.plant_code, k.fecha,
           ROUND((d.total_monto / NULLIF(k.total_kg, 0))::numeric, 2) AS descuento_por_kg
      FROM (
        SELECT plant_code, fecha, SUM(kg) AS total_kg
        FROM arr.ventas_diarias_cliente
        WHERE plant_code IN (SELECT plant_code FROM arr.provincia_plants)
        GROUP BY plant_code, fecha
      ) k
      JOIN (
        SELECT plant_code, fecha, SUM(monto) AS total_monto
        FROM arr.descuentos_diarios_cliente
        WHERE plant_code IN (SELECT plant_code FROM arr.provincia_plants)
        GROUP BY plant_code, fecha
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
