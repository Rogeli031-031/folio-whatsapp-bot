-- Presupuesto Puebla (E7): febrero y marzo 2026
-- Ejecutar en tu cliente PostgreSQL (psql, DBeaver, etc.) conectado a la misma BD del bot.

-- Opción 1: Montos por categoría y subcategoría, febrero y marzo en columnas
SELECT
  d.categoria,
  d.subcategoria,
  MAX(CASE WHEN d.periodo = '2026-02' THEN d.monto_aprobado END) AS feb_2026,
  MAX(CASE WHEN d.periodo = '2026-03' THEN d.monto_aprobado END) AS mar_2026,
  (MAX(CASE WHEN d.periodo = '2026-03' THEN d.monto_aprobado END) - MAX(CASE WHEN d.periodo = '2026-02' THEN d.monto_aprobado END)) AS diferencia
FROM public.presupuesto_asignacion_detalle d
JOIN public.plantas p ON p.id = d.planta_id AND p.nombre = 'E7'
WHERE d.periodo IN ('2026-02', '2026-03')
GROUP BY d.categoria, d.subcategoria
ORDER BY d.categoria, d.subcategoria;

-- Opción 2: Totales por categoría (febrero vs marzo)
SELECT
  d.categoria,
  SUM(CASE WHEN d.periodo = '2026-02' THEN d.monto_aprobado ELSE 0 END) AS feb_2026,
  SUM(CASE WHEN d.periodo = '2026-03' THEN d.monto_aprobado ELSE 0 END) AS mar_2026,
  SUM(CASE WHEN d.periodo = '2026-03' THEN d.monto_aprobado ELSE 0 END) - SUM(CASE WHEN d.periodo = '2026-02' THEN d.monto_aprobado ELSE 0 END) AS diferencia
FROM public.presupuesto_asignacion_detalle d
JOIN public.plantas p ON p.id = d.planta_id AND p.nombre = 'E7'
WHERE d.periodo IN ('2026-02', '2026-03')
GROUP BY d.categoria
ORDER BY d.categoria;

-- Opción 3: Total general por periodo
SELECT
  d.periodo,
  SUM(d.monto_aprobado) AS total
FROM public.presupuesto_asignacion_detalle d
JOIN public.plantas p ON p.id = d.planta_id AND p.nombre = 'E7'
WHERE d.periodo IN ('2026-02', '2026-03')
GROUP BY d.periodo
ORDER BY d.periodo;

-- Opción 4: Listado simple (periodo, categoría, subcategoría, monto)
SELECT
  d.periodo,
  d.categoria,
  d.subcategoria,
  d.monto_aprobado
FROM public.presupuesto_asignacion_detalle d
JOIN public.plantas p ON p.id = d.planta_id AND p.nombre = 'E7'
WHERE d.periodo IN ('2026-02', '2026-03')
ORDER BY d.periodo, d.categoria, d.subcategoria;
