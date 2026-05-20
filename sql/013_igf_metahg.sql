-- IGF METAHG por planta (hoja METAHG del Excel Evaluacion)
-- pgAdmin: ejecutar TODO (Ctrl+A, F5). O en orden: 013_igf_metahg_1_versions.sql luego _2_lines.sql

CREATE SCHEMA IF NOT EXISTS igf_metahg;

CREATE TABLE IF NOT EXISTS igf_metahg.versions (
    id              SERIAL PRIMARY KEY,
    plant_code      VARCHAR(80) NOT NULL,
    empresa_label   VARCHAR(200) NOT NULL,
    year            SMALLINT NOT NULL,
    month           SMALLINT NOT NULL,
    version_number  INT NOT NULL,
    is_current      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plant_code, year, month, version_number)
);

CREATE INDEX IF NOT EXISTS idx_igf_metahg_versions_plant_year_month
    ON igf_metahg.versions (plant_code, year, month);

CREATE INDEX IF NOT EXISTS idx_igf_metahg_versions_current
    ON igf_metahg.versions (plant_code, year, month)
    WHERE is_current = true;

CREATE TABLE IF NOT EXISTS igf_metahg.lines (
    id              SERIAL PRIMARY KEY,
    version_id      INT NOT NULL REFERENCES igf_metahg.versions(id) ON DELETE CASCADE,
    line_key        VARCHAR(500) NOT NULL,
    categoria       VARCHAR(200) NOT NULL,
    prom            NUMERIC(18, 6),
    kilos           NUMERIC(18, 4),
    comision        NUMERIC(18, 4),
    total           NUMERIC(18, 4),
    pct             NUMERIC(10, 6),
    kilos_h         NUMERIC(18, 4),
    row_order       INT NOT NULL DEFAULT 0,
    is_total_row    BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (version_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_igf_metahg_lines_version
    ON igf_metahg.lines (version_id);

CREATE INDEX IF NOT EXISTS idx_igf_metahg_lines_categoria
    ON igf_metahg.lines (categoria);
