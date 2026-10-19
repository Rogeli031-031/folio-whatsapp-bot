-- IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088 / FIX 088-R1
-- Sustituye solo CHECK (kg > 0) por CHECK (kg >= 0).
-- No modifica compras_importe_check ni arr.compras_hg.
-- NO ejecutar en producción desde el loop.

CREATE SCHEMA IF NOT EXISTS arr;

DO $$
DECLARE
  candidate_name text;
  candidate_count int;
  nonnegative_def text;
  normalized text;
BEGIN
  IF to_regclass('arr.compras') IS NULL THEN
    RAISE EXCEPTION 'arr.compras no existe';
  END IF;

  SELECT pg_get_constraintdef(con.oid)
    INTO nonnegative_def
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'arr'
    AND rel.relname = 'compras'
    AND con.conname = 'compras_kg_nonnegative';

  IF FOUND THEN
    normalized := replace(regexp_replace(regexp_replace(lower(nonnegative_def), '::[a-z0-9_]+', '', 'g'), '\s+', '', 'g'), '(0)', '0');
    IF normalized NOT IN ('check((kg>=0))', 'check(kg>=0)') THEN
      RAISE EXCEPTION 'compras_kg_nonnegative no es CHECK (kg >= 0): %', nonnegative_def;
    END IF;
    SELECT count(*)
      INTO candidate_count
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'arr'
      AND rel.relname = 'compras'
      AND con.contype = 'c'
      AND replace(regexp_replace(regexp_replace(lower(pg_get_constraintdef(con.oid)), '::[a-z0-9_]+', '', 'g'), '\s+', '', 'g'), '(0)', '0')
          IN ('check((kg>0))', 'check(kg>0)');
    IF candidate_count <> 0 THEN
      RAISE EXCEPTION 'conviven CHECK (kg > 0) y compras_kg_nonnegative';
    END IF;
  ELSE
    SELECT count(*), min(con.conname)
      INTO candidate_count, candidate_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'arr'
      AND rel.relname = 'compras'
      AND con.contype = 'c'
      AND replace(regexp_replace(regexp_replace(lower(pg_get_constraintdef(con.oid)), '::[a-z0-9_]+', '', 'g'), '\s+', '', 'g'), '(0)', '0')
          IN ('check((kg>0))', 'check(kg>0)');

    IF candidate_count IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'el CHECK kg > 0 no es unívoco (candidatos: %)', candidate_count;
    END IF;

    IF candidate_name IS DISTINCT FROM 'compras_kg_check' THEN
      RAISE NOTICE 'CHECK kg > 0 encontrado con nombre %', candidate_name;
    END IF;

    EXECUTE format('ALTER TABLE arr.compras DROP CONSTRAINT %I', candidate_name);
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
  actor_id INT NULL REFERENCES public.usuarios(id),
  row_count INT NOT NULL,
  total_kg NUMERIC(14,3) NOT NULL,
  total_importe NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('arr.compras_importaciones') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'compras_importaciones_actor_id_fkey'
     ) THEN
    ALTER TABLE arr.compras_importaciones
      ADD CONSTRAINT compras_importaciones_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.usuarios(id);
  END IF;
END $$;

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
