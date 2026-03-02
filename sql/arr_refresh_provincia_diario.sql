-- ============================================================
-- Refresca venta_toneladas_diarias_provincia y descuento_por_kilo_diario_provincia
-- Solo plantas en arr.provincia_plants. Ejecutar después de cargar ARR o cuando se necesite.
-- ============================================================

-- Mapeo provincia: convierte arr.provincia_plants a la "planta canonical" (public.plantas.nombre)
-- y permite matchear ventas/descuentos si plant_code viene como nombre o como clave.
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

-- 1) Venta en toneladas diarias (redondeado a 0)
INSERT INTO arr.venta_toneladas_diarias_provincia (plant_code, fecha, venta_ton)
SELECT pm.prov_name AS plant_code,
       v.fecha,
       ROUND(SUM(v.kg) / 1000.0, 0)::INTEGER AS venta_ton
  FROM arr.ventas_diarias_cliente v
  JOIN prov_map pm
    ON UPPER(TRIM(v.plant_code)) = pm.key_nombre
    OR (pm.key_clave <> '' AND UPPER(TRIM(v.plant_code)) = pm.key_clave)
  GROUP BY pm.prov_name, v.fecha
ON CONFLICT (plant_code, fecha) DO UPDATE SET venta_ton = EXCLUDED.venta_ton;

-- 2) Descuento por kilo diario $/kg (2 decimales): total descuento / total kg por planta y fecha
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
ON CONFLICT (plant_code, fecha) DO UPDATE SET descuento_por_kg = EXCLUDED.descuento_por_kg;

-- Opcional: borrar filas de plantas que ya no están en provincia_plants (mantener tablas alineadas)
DELETE FROM arr.venta_toneladas_diarias_provincia
 WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants);
DELETE FROM arr.descuento_por_kilo_diario_provincia
 WHERE plant_code NOT IN (SELECT plant_code FROM arr.provincia_plants);
