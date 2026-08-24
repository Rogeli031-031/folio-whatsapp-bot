-- Pending work items — memoria operativa del chat legado (Director IA).
-- No es EKS. No es historial de chat. No es evidencia de negocio.
-- CREATE idempotente. Sin triggers. Sin funciones de negocio.

CREATE TABLE IF NOT EXISTS arr.director_ia_pending_work_items (
  id SERIAL PRIMARY KEY,
  user_scope_key TEXT NOT NULL,
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  entity_type VARCHAR(32) NOT NULL DEFAULT 'client',
  entity_key TEXT NOT NULL,
  entity_display TEXT NOT NULL,
  parent_intent TEXT NOT NULL,
  pending_information_gap JSONB NOT NULL,
  gap_fingerprint TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_revalidated_at TIMESTAMPTZ NULL,

  CONSTRAINT director_ia_pwi_status_chk CHECK (status IN (
    'active', 'resolved', 'superseded', 'stale', 'dismissed'
  )),
  CONSTRAINT director_ia_pwi_intent_chk CHECK (parent_intent IN (
    'plant_diagnosis', 'expediente_comercial'
  )),
  CONSTRAINT director_ia_pwi_entity_type_chk CHECK (entity_type IN ('client'))
);

CREATE INDEX IF NOT EXISTS idx_director_ia_pwi_retrieve
  ON arr.director_ia_pending_work_items (user_scope_key, planta_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_director_ia_pwi_active_dedupe
  ON arr.director_ia_pending_work_items (
    user_scope_key, planta_id, entity_key, parent_intent, gap_fingerprint
  )
  WHERE status = 'active';
