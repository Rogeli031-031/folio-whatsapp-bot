-- IMPL-COMPRAS-DASHBOARD-013
-- Tablas normalizadas de compras por planta. No persistir costo/kg ni agregados.
-- ensureComprasTables (lib/compras-dashboard.js) aplica el mismo DDL al arrancar.
-- NO ejecutar manualmente contra producción.

CREATE SCHEMA IF NOT EXISTS arr;

CREATE TABLE IF NOT EXISTS arr.compras_proveedores (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_proveedores_planta_nombre
  ON arr.compras_proveedores (planta_id, lower(btrim(nombre)));

CREATE INDEX IF NOT EXISTS idx_compras_proveedores_planta_activo_orden
  ON arr.compras_proveedores (planta_id, activo, orden);

CREATE TABLE IF NOT EXISTS arr.compras (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
  fecha DATE NOT NULL,
  kg NUMERIC(14,3) NOT NULL CHECK (kg > 0),
  importe NUMERIC(14,2) NOT NULL CHECK (importe >= 0),
  created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NO unique (planta_id, proveedor_id, fecha): se permiten múltiples compras el mismo día.

CREATE INDEX IF NOT EXISTS idx_compras_planta_fecha
  ON arr.compras (planta_id, fecha);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor_fecha
  ON arr.compras (proveedor_id, fecha);

CREATE TABLE IF NOT EXISTS arr.compras_documentos (
  id SERIAL PRIMARY KEY,
  compra_id INT NOT NULL REFERENCES arr.compras(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  storage_key TEXT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  data BYTEA NULL,
  uploaded_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_documentos_compra
  ON arr.compras_documentos (compra_id);
