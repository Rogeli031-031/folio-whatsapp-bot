-- ============================================================
-- Verificar que la información de Puebla (u otra planta) se cargó
-- Ajusta plant_code, year y month según lo que subiste (ej. Puebla, 2026, 2).
-- ============================================================

-- 1) Ventas diarias: cuántas filas y total kg por fecha (Puebla, feb 2026)
SELECT plant_code, fecha, COUNT(*) AS lineas, SUM(kg) AS total_kg
FROM arr.ventas_diarias_cliente
WHERE plant_code = 'Puebla'
  AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
GROUP BY plant_code, fecha
ORDER BY fecha;

-- 2) Resumen ventas: total del mes
SELECT plant_code, COUNT(*) AS lineas, SUM(kg) AS total_kg
FROM arr.ventas_diarias_cliente
WHERE plant_code = 'Puebla'
  AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
GROUP BY plant_code;

-- 2b) VERIFICAR KILOS TOTALES: este total_kg debe coincidir con el Excel (y con "VENTAS (kg total)" del MsgBox de la macro)
SELECT plant_code,
       COUNT(*) AS filas,
       ROUND(SUM(kg)::numeric, 2) AS total_kg
FROM arr.ventas_diarias_cliente
WHERE plant_code = 'Puebla'
  AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
GROUP BY plant_code;

-- 3) Descuentos diarios: cuántas filas y suma (Puebla, feb 2026)
SELECT plant_code, fecha, COUNT(*) AS lineas, SUM(monto) AS total_descuento
FROM arr.descuentos_diarios_cliente
WHERE plant_code = 'Puebla'
  AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
GROUP BY plant_code, fecha
ORDER BY fecha;

-- 3b) TOTAL DESCUENTOS (unificado): comparar con suma de Excel (Notas + Factura*1.16 + Comisión Extra + contado Total).
SELECT plant_code,
       COUNT(*) AS filas,
       ROUND(SUM(monto)::numeric, 2) AS total_descuentos
FROM arr.descuentos_diarios_cliente
WHERE plant_code = 'Puebla'
  AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
GROUP BY plant_code;

-- 3c) DESCUENTOS POR SEPARADO (comparar cada total con la hoja correspondiente del Excel)
SELECT 'Notas' AS origen,
       COUNT(*) AS filas,
       ROUND(SUM(monto)::numeric, 2) AS total
FROM arr.descuentos_notas
WHERE plant_code = 'Puebla' AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
UNION ALL
SELECT 'Factura',
       COUNT(*),
       ROUND(SUM(monto)::numeric, 2)
FROM arr.descuentos_factura
WHERE plant_code = 'Puebla' AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
UNION ALL
SELECT 'Comision Extra',
       COUNT(*),
       ROUND(SUM(monto)::numeric, 2)
FROM arr.descuentos_comision_extra
WHERE plant_code = 'Puebla' AND fecha >= '2026-02-01' AND fecha <= '2026-02-28'
ORDER BY origen;

-- 4) Catálogo cliente/canal/subcanal (Puebla, feb 2026)
SELECT plant_code, year, month, COUNT(*) AS clientes
FROM arr.cliente_categoria_mes
WHERE plant_code = 'Puebla' AND year = 2026 AND month = 2
GROUP BY plant_code, year, month;

-- 5) Forecast mensual (solo tiene datos si ya ejecutaste POST /api/arr/forecast)
SELECT plant_code, year, month, canal, subcanal, kg_actual, kg_proyectado
FROM arr.forecast_mensual
WHERE plant_code = 'Puebla' AND year = 2026 AND month = 2
ORDER BY canal, subcanal;
