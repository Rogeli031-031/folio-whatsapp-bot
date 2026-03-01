-- ============================================================
-- ARR Forecast: tablas para ventas/descuentos diarios y forecast
-- Schema: arr. No reemplaza arr.load_runs ni arr.raw_lines si existen.
-- Uso: plant_code en todas las tablas (una DB por planta o compartida).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS arr;

-- Ventas diarias por cliente (kg). Origen: Total + Categoria (Total kilos por Fecha/Cliente, canal/subcanal de Categoria).
CREATE TABLE IF NOT EXISTS arr.ventas_diarias_cliente (
    plant_code   VARCHAR(20) NOT NULL,
    fecha        DATE        NOT NULL,
    cliente_norm VARCHAR(200) NOT NULL,
    canal        VARCHAR(50) NOT NULL DEFAULT 'Casa',       -- Casa | Comisionista
    subcanal     VARCHAR(100),                              -- Autotanque, Portátil, Predios, etc.
    kg           NUMERIC(18,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (plant_code, fecha, cliente_norm, canal, COALESCE(subcanal, ''))
);

CREATE INDEX IF NOT EXISTS idx_ventas_diarias_plant_fecha
    ON arr.ventas_diarias_cliente (plant_code, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_plant_fecha_canal
    ON arr.ventas_diarias_cliente (plant_code, fecha, canal, subcanal);

-- Descuentos diarios unificados por cliente (siempre negativos). Origen: Total (contado), Notas, Factura*1.16, Comision Extra.
CREATE TABLE IF NOT EXISTS arr.descuentos_diarios_cliente (
    plant_code   VARCHAR(20) NOT NULL,
    fecha        DATE        NOT NULL,
    cliente_norm VARCHAR(200) NOT NULL,
    monto        NUMERIC(18,2) NOT NULL,   -- Siempre <= 0 (suma de todas las fuentes)
    PRIMARY KEY (plant_code, fecha, cliente_norm)
);

-- Para agregar por día: puede usarse vista o sum(monto) por (plant_code, fecha).
CREATE INDEX IF NOT EXISTS idx_descuentos_diarios_plant_fecha
    ON arr.descuentos_diarios_cliente (plant_code, fecha);

-- Catálogo cliente → canal/subcanal por mes (desde Categoria: Comisionista → canal, sub canal com → subcanal).
CREATE TABLE IF NOT EXISTS arr.cliente_categoria_mes (
    plant_code   VARCHAR(20) NOT NULL,
    year         SMALLINT    NOT NULL,
    month        SMALLINT    NOT NULL,
    cliente_norm VARCHAR(200) NOT NULL,
    canal        VARCHAR(50) NOT NULL DEFAULT 'Casa',
    subcanal     VARCHAR(100),
    PRIMARY KEY (plant_code, year, month, cliente_norm)
);

CREATE INDEX IF NOT EXISTS idx_cliente_categoria_mes_lookup
    ON arr.cliente_categoria_mes (plant_code, year, month);

-- %HG diario por planta (carga diaria independiente).
CREATE TABLE IF NOT EXISTS arr.hg_diario (
    plant_code   VARCHAR(20) NOT NULL,
    fecha        DATE        NOT NULL,
    hg_pct       NUMERIC(10,6) NOT NULL,   -- Ej. 0.085 para 8.5%
    PRIMARY KEY (plant_code, fecha)
);

CREATE INDEX IF NOT EXISTS idx_hg_diario_plant_fecha
    ON arr.hg_diario (plant_code, fecha);

-- Forecast mensual por planta/canal/subcanal (salida de calcular_forecast_mensual).
CREATE TABLE IF NOT EXISTS arr.forecast_mensual (
    plant_code       VARCHAR(20) NOT NULL,
    year             SMALLINT    NOT NULL,
    month            SMALLINT    NOT NULL,
    canal            VARCHAR(50) NOT NULL,
    subcanal         VARCHAR(100),
    kg_actual        NUMERIC(18,4) NOT NULL DEFAULT 0,
    kg_proyectado    NUMERIC(18,4) NOT NULL DEFAULT 0,
    kg_forecast      NUMERIC(18,4) NOT NULL DEFAULT 0,
    desc_actual      NUMERIC(18,2) NOT NULL DEFAULT 0,
    desc_proyectado  NUMERIC(18,2) NOT NULL DEFAULT 0,
    desc_forecast    NUMERIC(18,2) NOT NULL DEFAULT 0,
    desc_kg_forecast NUMERIC(18,6),         -- desc_forecast / kg_forecast cuando kg_forecast > 0
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (plant_code, year, month, canal, COALESCE(subcanal, ''))
);

CREATE INDEX IF NOT EXISTS idx_forecast_mensual_plant_ym
    ON arr.forecast_mensual (plant_code, year, month);
