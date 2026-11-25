-- Puebla isolated from Acapulco. No accounts, grants or production execution here.
BEGIN;
CREATE TABLE arr.igf_puebla_taller_operador (
 usuario_id integer PRIMARY KEY REFERENCES public.usuarios(id)
);
CREATE TABLE arr.igf_puebla_taller_revision (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 report_date date NOT NULL,
 revision integer NOT NULL CHECK (revision > 0),
 source_layout text NOT NULL CHECK (source_layout = 'Puebla-v1'),
 sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 uploaded_by integer NOT NULL REFERENCES public.usuarios(id),
 uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 source_date date,
 tab_date date,
 row_count integer NOT NULL CHECK (row_count BETWEEN 0 AND 120),
 unit_count integer NOT NULL CHECK (unit_count BETWEEN 0 AND row_count),
 UNIQUE(report_date, revision),
 UNIQUE(report_date, sha256)
);
CREATE TABLE arr.igf_puebla_taller_detalle (
 revision_id bigint NOT NULL REFERENCES arr.igf_puebla_taller_revision(id),
 source_row integer NOT NULL CHECK (source_row BETWEEN 2 AND 160),
 kind text NOT NULL CHECK (kind IN ('Autotanque','Cilindrera','Utilitario')),
 unit_code text NOT NULL CHECK (length(unit_code) BETWEEN 1 AND 80),
 section text NOT NULL CHECK (section IN ('Mayor','Menor')),
 observations jsonb NOT NULL CHECK (jsonb_typeof(observations)='object'),
 PRIMARY KEY(revision_id, source_row)
);
COMMIT;
