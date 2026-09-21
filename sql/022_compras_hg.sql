-- IMPL-COMPRAS-HG-KILOS-014
-- HG EN KILOS manual por planta/fecha. Independiente de arr.compras.
-- ensureComprasTables (lib/compras-dashboard.js) aplica el mismo DDL al arrancar.
-- NO ejecutar manualmente contra producción.

CREATE SCHEMA IF NOT EXISTS arr;

CREATE TABLE IF NOT EXISTS arr.compras_hg (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  fecha DATE NOT NULL,
  hg_kilos NUMERIC(14,3) NOT NULL,
  created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planta_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_compras_hg_planta_fecha
  ON arr.compras_hg (planta_id, fecha);
