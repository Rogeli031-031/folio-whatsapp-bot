-- EXECUTIVE_STEERING_CAPTURE first physical slice.
-- Domain store. Not Action Register, bitácora, IGF, EKS, or IES.
-- One row = one EXECUTIVE_STEERING_EVENT. attestation_state = RECORDED only.
-- Semantic content immutable. vigor is metadata updated only with SUPERSEDES.
-- Product path: no DELETE. Superuser DELETE is not guaranteed.

CREATE SCHEMA IF NOT EXISTS arr;

CREATE TABLE IF NOT EXISTS arr.executive_steering_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(32) NOT NULL,
  attestation_state VARCHAR(16) NOT NULL DEFAULT 'RECORDED',
  vigor VARCHAR(16) NOT NULL DEFAULT 'CURRENT',
  raw_text TEXT NOT NULL,
  decision_outcome VARCHAR(16) NULL,
  metric_key TEXT NULL,
  numeric_value NUMERIC NULL,
  unit TEXT NULL,
  value_mode VARCHAR(16) NULL,
  period_kind VARCHAR(16) NULL,
  period_year INT NULL,
  period_month INT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  scope_kind VARCHAR(16) NOT NULL,
  scope_label TEXT NULL,
  plant_id INT NULL REFERENCES public.plantas(id),
  declared_kind VARCHAR(24) NOT NULL,
  declared_user_id INT NULL REFERENCES public.usuarios(id),
  declared_role_key TEXT NULL,
  declared_display_name TEXT NULL,
  captured_by_usuario_id INT NOT NULL REFERENCES public.usuarios(id),
  extracted_by TEXT NULL,
  source_type VARCHAR(32) NOT NULL,
  source_id TEXT NULL,
  source_location TEXT NULL,
  meeting_ref TEXT NULL,
  baseline_ref TEXT NULL,
  baseline_value NUMERIC NULL,
  baseline_source TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  declared_at TIMESTAMPTZ NULL,
  CONSTRAINT esc_event_type_chk CHECK (event_type IN (
    'PROPOSAL', 'DECISION', 'COMMITMENT', 'HUMAN_DECLARED_CAUSE', 'CORRECTION'
  )),
  CONSTRAINT esc_attestation_chk CHECK (attestation_state IN ('RECORDED')),
  CONSTRAINT esc_vigor_chk CHECK (vigor IN ('CURRENT', 'SUPERSEDED')),
  CONSTRAINT esc_decision_outcome_chk CHECK (
    (event_type = 'DECISION' AND decision_outcome IN ('accepted', 'rejected', 'pending'))
    OR (event_type <> 'DECISION' AND decision_outcome IS NULL)
  ),
  CONSTRAINT esc_value_mode_chk CHECK (value_mode IS NULL OR value_mode IN ('ABSOLUTE', 'DELTA', 'UNKNOWN')),
  CONSTRAINT esc_period_kind_chk CHECK (period_kind IS NULL OR period_kind IN ('YYYY_MM', 'DATE', 'RANGE', 'UNKNOWN')),
  CONSTRAINT esc_scope_kind_chk CHECK (scope_kind IN ('PLANT', 'MULTI_PLANT', 'ZONE', 'OTHER_EXPLICIT', 'UNKNOWN')),
  CONSTRAINT esc_plant_scope_chk CHECK (
    (scope_kind = 'PLANT' AND plant_id IS NOT NULL)
    OR (scope_kind <> 'PLANT' AND plant_id IS NULL)
  ),
  CONSTRAINT esc_declared_kind_chk CHECK (declared_kind IN (
    'KNOWN_USER', 'KNOWN_ROLE', 'FREE_TEXT_SPEAKER', 'UNKNOWN'
  )),
  CONSTRAINT esc_source_type_chk CHECK (source_type IN (
    'MANUAL', 'DIRECTOR_IA_CONVERSATION', 'PLAUD_FUTURE', 'UPLOADED_NOTES', 'BITACORA', 'OTHER'
  )),
  CONSTRAINT esc_raw_text_chk CHECK (length(btrim(raw_text)) > 0)
);

CREATE TABLE IF NOT EXISTS arr.executive_steering_event_plants (
  event_id INT NOT NULL REFERENCES arr.executive_steering_events(id),
  planta_id INT NOT NULL REFERENCES public.plantas(id),
  PRIMARY KEY (event_id, planta_id)
);

CREATE TABLE IF NOT EXISTS arr.executive_steering_event_relations (
  id SERIAL PRIMARY KEY,
  from_event_id INT NOT NULL REFERENCES arr.executive_steering_events(id),
  to_event_id INT NOT NULL REFERENCES arr.executive_steering_events(id),
  relation_kind VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_usuario_id INT NOT NULL REFERENCES public.usuarios(id),
  CONSTRAINT esc_rel_kind_chk CHECK (relation_kind IN ('REFERS_PROPOSAL', 'CORRECTS', 'SUPERSEDES')),
  CONSTRAINT esc_rel_no_self_chk CHECK (from_event_id <> to_event_id)
);

CREATE INDEX IF NOT EXISTS idx_esc_events_type ON arr.executive_steering_events (event_type);
CREATE INDEX IF NOT EXISTS idx_esc_events_plant ON arr.executive_steering_events (plant_id);
CREATE INDEX IF NOT EXISTS idx_esc_events_meeting ON arr.executive_steering_events (meeting_ref);
CREATE INDEX IF NOT EXISTS idx_esc_event_plants_planta ON arr.executive_steering_event_plants (planta_id);
CREATE INDEX IF NOT EXISTS idx_esc_rels_from ON arr.executive_steering_event_relations (from_event_id);
CREATE INDEX IF NOT EXISTS idx_esc_rels_to ON arr.executive_steering_event_relations (to_event_id);
