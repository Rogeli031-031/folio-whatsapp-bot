-- ============================================================
-- Refresca venta_toneladas_diarias_provincia y descuento_por_kilo_diario_provincia
-- Solo plantas en arr.provincia_plants. Ejecutar después de cargar ARR o cuando se necesite.
-- ============================================================

-- 1) Venta en toneladas diarias (redondeado a 0)
INSERT INTO arr.venta_toneladas_diarias_provincia (plant_code, fecha, venta_ton)
SELECT v.plant_code, v.fecha, ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
  FROM arr.ventas_diarias_cliente v
  WHERE v.plant_code IN (SELECT plant_code FROM arr.provincia_plants)
  GROUP BY v.plant_code, v.fecha
ON CONFLICT (plant_code, fecha) DO UPDATE SET venta_ton = EXCLUDED.venta_ton;

-- 2) Descuento por kilo diario $/kg (2 decimales): total descuento / total kg por planta y fecha
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
ON CONFLICT (plant_code, fecha) DO UPDATE SET descuento_por_kg = EXCLUDED.descuento_por_kg;

-- Opcional: borrar filas de plantas que ya no están en provincia_plants (mantener tablas alineadas)
DELETE FROM arr.venta_toneladas_diarias_provincia
 WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants);
DELETE FROM arr.descuento_por_kilo_diario_provincia
 WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants);
