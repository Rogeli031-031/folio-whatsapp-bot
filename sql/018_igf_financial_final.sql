-- IGF financial finalization (slice B).
-- Adds FORECAST / FINAL / SUPERSEDED on igf.versions.
-- Idempotent. No igf.compromiso_lines changes. No is_final boolean.
-- No historical FINAL inference. Existing rows keep DEFAULT FORECAST.

DO $m$
BEGIN
  IF to_regclass('igf.versions') IS NULL THEN
    RAISE NOTICE 'igf.versions does not exist; skip 018_igf_financial_final';
    RETURN;
  END IF;

  ALTER TABLE igf.versions
    ADD COLUMN IF NOT EXISTS financial_state TEXT NOT NULL DEFAULT 'FORECAST';

  ALTER TABLE igf.versions
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ NULL;

  ALTER TABLE igf.versions
    ADD COLUMN IF NOT EXISTS finalized_by TEXT NULL;

  ALTER TABLE igf.versions
    ADD COLUMN IF NOT EXISTS superseded_by_version_id INT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'igf_versions_financial_state_chk'
  ) THEN
    ALTER TABLE igf.versions
      ADD CONSTRAINT igf_versions_financial_state_chk
      CHECK (financial_state IN ('FORECAST', 'FINAL', 'SUPERSEDED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'igf_versions_financial_state_shape_chk'
  ) THEN
    ALTER TABLE igf.versions
      ADD CONSTRAINT igf_versions_financial_state_shape_chk
      CHECK (
        (
          financial_state = 'FORECAST'
          AND finalized_at IS NULL
          AND finalized_by IS NULL
          AND superseded_by_version_id IS NULL
        )
        OR (
          financial_state = 'FINAL'
          AND finalized_at IS NOT NULL
          AND finalized_by IS NOT NULL
          AND superseded_by_version_id IS NULL
        )
        OR (
          financial_state = 'SUPERSEDED'
          AND finalized_at IS NOT NULL
          AND finalized_by IS NOT NULL
          AND superseded_by_version_id IS NOT NULL
          AND superseded_by_version_id <> id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'igf_versions_superseded_by_fk'
  ) THEN
    ALTER TABLE igf.versions
      ADD CONSTRAINT igf_versions_superseded_by_fk
      FOREIGN KEY (superseded_by_version_id) REFERENCES igf.versions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'i' AND c.relname = 'igf_versions_one_final_global_ym' AND n.nspname = 'igf'
  ) THEN
    EXECUTE $sql$
      CREATE UNIQUE INDEX igf_versions_one_final_global_ym
        ON igf.versions (year, month)
        WHERE plant_code = 'GLOBAL' AND financial_state = 'FINAL'
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'i' AND c.relname = 'igf_versions_financial_state_ym' AND n.nspname = 'igf'
  ) THEN
    EXECUTE $sql$
      CREATE INDEX igf_versions_financial_state_ym
        ON igf.versions (plant_code, year, month, financial_state)
    $sql$;
  END IF;
END
$m$;
