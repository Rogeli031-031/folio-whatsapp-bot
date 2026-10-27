-- Excepciones de flete por planta, proveedor y fecha.
-- ensureComprasTables aplica el mismo DDL. No contiene datos iniciales.
-- No ejecutar manualmente contra producción.
CREATE TABLE IF NOT EXISTS arr.compras_flete_diario (
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  proveedor_id INT NOT NULL REFERENCES arr.compras_proveedores(id),
  fecha DATE NOT NULL,
  tarifa NUMERIC(14,6) NOT NULL CHECK (tarifa >= 0),
  updated_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (planta_id, proveedor_id, fecha)
);
