-- Entidades comerciales — capa de resolución de alias (Director IA Sprint 2C).
-- Persistencia + CRUD; sin integración al chat en este sprint.

CREATE TABLE IF NOT EXISTS arr.comercial_entidad (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  nombre_canonico VARCHAR(200) NOT NULL,
  notas TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_comercial_entidad_planta_active
  ON arr.comercial_entidad (planta_id, nombre_canonico)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS arr.comercial_entidad_alias (
  id SERIAL PRIMARY KEY,
  entidad_id INT NOT NULL REFERENCES arr.comercial_entidad(id) ON DELETE CASCADE,
  alias_nombre VARCHAR(200) NOT NULL,
  alias_tipo VARCHAR(32) NOT NULL,
  fuente VARCHAR(32) NOT NULL DEFAULT 'manual',
  verificado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT comercial_entidad_alias_tipo_chk CHECK (alias_tipo IN (
    'operativo', 'contacto', 'razon_social', 'apodo'
  )),
  CONSTRAINT comercial_entidad_alias_fuente_chk CHECK (fuente IN (
    'manual', 'bitacora', 'dicf', 'arr', 'ia_sugerido'
  ))
);

CREATE INDEX IF NOT EXISTS idx_comercial_entidad_alias_entidad
  ON arr.comercial_entidad_alias (entidad_id);

CREATE INDEX IF NOT EXISTS idx_comercial_entidad_alias_nombre
  ON arr.comercial_entidad_alias (alias_nombre);
