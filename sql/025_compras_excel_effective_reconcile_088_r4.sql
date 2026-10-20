-- IMPL-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4
-- Valor efectivo de Excel con precisión NUMERIC(18,6).
-- No rellena compras históricas ni altera importaciones ya guardadas.
-- NO ejecutar en producción desde el loop.

BEGIN;

CREATE SCHEMA IF NOT EXISTS arr;

DO $$
DECLARE
  typ text;
BEGIN
  IF to_regclass('arr.compras_importaciones') IS NULL THEN
    RAISE EXCEPTION 'arr.compras_importaciones no existe';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO typ
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'arr'
    AND c.relname = 'compras_importaciones'
    AND a.attname = 'total_importe'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF typ IS DISTINCT FROM 'numeric(18,6)' THEN
    ALTER TABLE arr.compras_importaciones
      ALTER COLUMN total_importe TYPE NUMERIC(18,6);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS arr.compras_import_lineas (
  id BIGSERIAL PRIMARY KEY,
  importacion_id INT NOT NULL REFERENCES arr.compras_importaciones(id),
  compra_id INT NULL REFERENCES arr.compras(id) ON DELETE SET NULL,
  source_company TEXT NULL,
  sheet_name TEXT NOT NULL,
  source_row INT NOT NULL,
  origin_text TEXT NOT NULL,
  proveedor_nombre TEXT NOT NULL,
  fecha DATE NOT NULL,
  excel_kg NUMERIC(18,6) NOT NULL,
  excel_importe NUMERIC(18,6) NOT NULL,
  captured_kg NUMERIC(18,6) NULL,
  captured_importe NUMERIC(18,6) NULL,
  action TEXT NOT NULL CHECK (action IN ('MATCHED_PRESERVED', 'INSERTED')),
  discrepant BOOLEAN NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('CAPTURED', 'EXCEL_ONLY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (importacion_id, sheet_name, source_row)
);

CREATE TABLE IF NOT EXISTS arr.compras_effective (
  compra_id INT PRIMARY KEY REFERENCES arr.compras(id) ON DELETE CASCADE,
  import_linea_id BIGINT NOT NULL REFERENCES arr.compras_import_lineas(id),
  excel_kg NUMERIC(18,6) NOT NULL,
  excel_importe NUMERIC(18,6) NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('CAPTURED', 'EXCEL_ONLY')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
