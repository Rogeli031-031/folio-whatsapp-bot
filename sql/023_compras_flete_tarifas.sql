-- IMPL-COMPRAS-FLETE-TARIFA-016
-- TARIFA de flete por planta + proveedor + año + mes.
-- Independiente de arr.compras y arr.compras_hg.
-- ensureComprasTables (lib/compras-dashboard.js) aplica el mismo DDL al arrancar.
-- NO ejecutar manualmente contra producción.

CREATE SCHEMA IF NOT EXISTS arr;

CREATE TABLE IF NOT EXISTS arr.compras_flete_tarifas (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
  year INT NOT NULL,
  month INT NOT NULL,
  tarifa NUMERIC(14,6) NOT NULL CHECK (tarifa >= 0),
  created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planta_id, proveedor_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_compras_flete_tarifas_planta_periodo
  ON arr.compras_flete_tarifas (planta_id, year, month);
