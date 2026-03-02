-- ============================================================
-- Rellena arr.provincia_plants desde public.plantas:
--   Primeras 6 plantas por id, excluyendo Corporativo.
--   Usa nombre (ej. Puebla, Acapulco) para coincidir con plant_code en arr.ventas_diarias_cliente.
-- Ejecutar una vez o cuando cambie la lista de plantas provincia.
-- ============================================================

DELETE FROM arr.provincia_plants;

INSERT INTO arr.provincia_plants (plant_code)
SELECT p.nombre
  FROM public.plantas p
  WHERE UPPER(TRIM(COALESCE(p.nombre, ''))) != 'CORPORATIVO'
    AND UPPER(TRIM(COALESCE(p.clave, ''))) != 'CORPORATIVO'
  ORDER BY p.id ASC
  LIMIT 6
ON CONFLICT (plant_code) DO NOTHING;
