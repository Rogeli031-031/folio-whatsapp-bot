-- Protect FINAL/SUPERSEDED history from governed DELETE paths.
-- Does not stop a superuser who disables triggers.
-- Idempotent. Requires igf.versions.financial_state (018).

DO $m$
BEGIN
  IF to_regclass('igf.versions') IS NULL THEN
    RAISE NOTICE 'igf.versions does not exist; skip 019_igf_financial_final_immutability';
    RETURN;
  END IF;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION igf.reject_delete_final_or_superseded_version()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      IF OLD.financial_state IN ('FINAL', 'SUPERSEDED') THEN
        RAISE EXCEPTION 'IGF_FINAL_HISTORY_IMMUTABLE: cannot DELETE igf.versions id=% state=%',
          OLD.id, OLD.financial_state
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
      RETURN OLD;
    END
    $fn$
  $sql$;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'igf_versions_reject_delete_final_superseded'
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER igf_versions_reject_delete_final_superseded
      BEFORE DELETE ON igf.versions
      FOR EACH ROW
      EXECUTE PROCEDURE igf.reject_delete_final_or_superseded_version()
    $sql$;
  END IF;

  IF to_regclass('igf.compromiso_lines') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION igf.reject_delete_final_or_superseded_lines()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      DECLARE
        st TEXT;
      BEGIN
        SELECT v.financial_state INTO st
          FROM igf.versions v
         WHERE v.id = OLD.version_id;
        IF st IN ('FINAL', 'SUPERSEDED') THEN
          RAISE EXCEPTION 'IGF_FINAL_HISTORY_IMMUTABLE: cannot DELETE igf.compromiso_lines version_id=% state=%',
            OLD.version_id, st
            USING ERRCODE = 'integrity_constraint_violation';
        END IF;
        RETURN OLD;
      END
      $fn$
    $sql$;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgname = 'igf_compromiso_lines_reject_delete_final_superseded'
    ) THEN
      EXECUTE $sql$
        CREATE TRIGGER igf_compromiso_lines_reject_delete_final_superseded
        BEFORE DELETE ON igf.compromiso_lines
        FOR EACH ROW
        EXECUTE PROCEDURE igf.reject_delete_final_or_superseded_lines()
      $sql$;
    END IF;
  END IF;
END
$m$;
