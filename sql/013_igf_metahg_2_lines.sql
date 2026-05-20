-- Paso 2/2: tabla lines + indices (ejecutar despues del paso 1)
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
