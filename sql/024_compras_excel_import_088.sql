-- IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088
-- Permite kg = 0 solo para NOTA DE CARGO importada y guarda la trazabilidad.
-- No modifica arr.compras_hg.
-- NO ejecutar en producción desde el loop. Aplicación humana posterior.

CREATE SCHEMA IF NOT EXISTS arr;

DO $$
DECLARE r record;
BEGIN
  IF to_regclass('arr.compras') IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'arr'
      AND rel.relname = 'compras'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%kg%'
  LOOP
    EXECUTE format('ALTER TABLE arr.compras DROP CONSTRAINT %I', r.conname);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'arr' AND rel.relname = 'compras' AND con.conname = 'compras_kg_nonnegative'
  ) THEN
    ALTER TABLE arr.compras ADD CONSTRAINT compras_kg_nonnegative CHECK (kg >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS arr.compras_importaciones (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  source_company TEXT NULL,
  file_name TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  range_from DATE NOT NULL,
  range_to DATE NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  actor_id INT NULL,
  row_count INT NOT NULL,
  total_kg NUMERIC(14,3) NOT NULL,
  total_importe NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_importaciones_planta_source_rango
  ON arr.compras_importaciones (planta_id, source_company, range_from, range_to);

CREATE TABLE IF NOT EXISTS arr.compras_import_meta (
  compra_id INT PRIMARY KEY REFERENCES arr.compras(id) ON DELETE CASCADE,
  importacion_id INT NOT NULL REFERENCES arr.compras_importaciones(id),
  source_company TEXT NULL,
  sheet_name TEXT NOT NULL,
  source_row INT NOT NULL,
  origin_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compras_import_meta_importacion
  ON arr.compras_import_meta (importacion_id);
