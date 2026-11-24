-- Draft only. No permission/grant statements, no migration applied.
BEGIN;
CREATE TABLE arr.igf_taller_operadores (
  plant_code text NOT NULL CHECK (plant_code = 'Acapulco'),
  usuario_id integer NOT NULL REFERENCES public.usuarios(id),
  PRIMARY KEY (plant_code,usuario_id)
);
-- Deliberadamente vacío: insertar sólo los IDs verificados de las dos cuentas como operador humano.

CREATE TABLE arr.igf_taller_reporte_revision (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_code text NOT NULL CHECK (plant_code = 'Acapulco'),
  company_code text NOT NULL CHECK (company_code IN ('E9','E10')),
  report_date date NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by integer NOT NULL REFERENCES public.usuarios(id),
  uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  source_layout text NOT NULL,
  row_count integer NOT NULL CHECK (row_count BETWEEN 0 AND 120),
  UNIQUE(plant_code,company_code,report_date,revision),
  UNIQUE(plant_code,company_code,report_date,sha256)
);
CREATE TABLE arr.igf_taller_reporte_unidad (
  revision_id bigint NOT NULL REFERENCES arr.igf_taller_reporte_revision(id),
  eco text NOT NULL CHECK (eco ~ '^AT-[0-9]{3}$'),
  section text NOT NULL CHECK (section IN ('Menor','Mayor')),
  observations jsonb NOT NULL CHECK (jsonb_typeof(observations)='object'),
  PRIMARY KEY (revision_id,eco)
);
COMMIT;

-- In the authorized service adapter, always parametrize and use a dedicated short transaction:
-- 1) SELECT pg_advisory_xact_lock(hashtextextended('igf-taller:' || $1 || ':' || $2 || ':' || ($3::date)::text, 0));
-- 2) SELECT by (plant_code, company_code, report_date, sha256); unchanged existing id => idempotent success.
-- 3) Otherwise INSERT revision using scoped max(revision)+1, then insert rows for its id in the same transaction.
-- 4) Verify count equals expected before commit; rollback on mismatch.
-- Readers pin a closed cut and independently retain E9/E10 identity; current data only from latest verified revision.
-- Deployment gate: authorize scope + apply this DDL as the human operator, grant minimum role, and verify backup plan.
