-- IGF META GLOBAL (independiente de igf.compromiso_lines)
-- Ejecutar una vez en la base folios_u2o9 (Render) antes de Subir_IGF_META_Global

CREATE SCHEMA IF NOT EXISTS igf_meta;

CREATE TABLE IF NOT EXISTS igf_meta.versions (
    id              SERIAL PRIMARY KEY,
    plant_code      VARCHAR(20) NOT NULL,
    year            SMALLINT NOT NULL,
    month           SMALLINT NOT NULL,
    version_number  INT NOT NULL,
    is_current      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plant_code, year, month, version_number)
);

CREATE INDEX IF NOT EXISTS idx_igf_meta_versions_plant_year_month
    ON igf_meta.versions (plant_code, year, month);
CREATE INDEX IF NOT EXISTS idx_igf_meta_versions_current
    ON igf_meta.versions (plant_code, year, month) WHERE is_current = true;

CREATE TABLE IF NOT EXISTS igf_meta.meta_lines (
    id                      SERIAL PRIMARY KEY,
    version_id               INT NOT NULL REFERENCES igf_meta.versions(id) ON DELETE CASCADE,
    line_key                 VARCHAR(500) NOT NULL,
    empresa                  VARCHAR(200) NOT NULL,
    venta_ton                NUMERIC(18,4),
    margen_kg                 NUMERIC(18,4),
    com_desc_kg               NUMERIC(18,4),
    gasto_kg                  NUMERIC(18,4),
    impuesto_kg               NUMERIC(18,4),
    hg_pct                    NUMERIC(10,6),
    hg_kg                     NUMERIC(18,4),
    bancos_planta_kg          NUMERIC(18,4),
    provision_planta_kg       NUMERIC(18,4),
    util_oper_kg              NUMERIC(18,4),
    util_oper_importe          NUMERIC(18,4),
    gtos_apoyos_corp_kg       NUMERIC(18,4),
    bancos_corp_kg            NUMERIC(18,4),
    otros_programas_kg        NUMERIC(18,4),
    inversiones_kg            NUMERIC(18,4),
    resultado_final_kg        NUMERIC(18,4),
    resultado_final_importe   NUMERIC(18,4),
    is_active                 BOOLEAN NOT NULL DEFAULT true,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (version_id, empresa)
);

CREATE INDEX IF NOT EXISTS idx_igf_meta_lines_version
    ON igf_meta.meta_lines (version_id);
CREATE INDEX IF NOT EXISTS idx_igf_meta_lines_empresa
    ON igf_meta.meta_lines (empresa);
