-- Paso 1/2: esquema + tabla versions (ejecutar completo en pgAdmin)
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
