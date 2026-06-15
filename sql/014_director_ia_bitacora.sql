-- Bitácora IA — contexto de campo para Director IA (Plaud, visitas, juntas).
-- Sprint 2A: persistencia únicamente; sin integración chat.

CREATE TABLE IF NOT EXISTS arr.director_ia_bitacora (
  id SERIAL PRIMARY KEY,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  empresa VARCHAR(120) NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(32) NOT NULL,
  titulo VARCHAR(255) NULL,
  fuente VARCHAR(32) NOT NULL DEFAULT 'texto_pegado',
  contenido TEXT NOT NULL,
  resumen_ia TEXT NULL,
  metadata JSONB NULL,
  created_by_usuario_id INT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT director_ia_bitacora_tipo_chk CHECK (tipo IN (
    'junta_consejo',
    'seguimiento_gerente',
    'visita_planta',
    'comercial',
    'operaciones',
    'cliente',
    'otro'
  )),
  CONSTRAINT director_ia_bitacora_fuente_chk CHECK (fuente IN (
    'plaud',
    'texto_pegado',
    'pdf',
    'word',
    'otro'
  ))
);

CREATE INDEX IF NOT EXISTS idx_director_ia_bitacora_planta_fecha
  ON arr.director_ia_bitacora (planta_id, fecha DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_director_ia_bitacora_planta_tipo
  ON arr.director_ia_bitacora (planta_id, tipo)
  WHERE is_active = true;
