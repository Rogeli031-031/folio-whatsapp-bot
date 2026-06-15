-- Sprint 2A.1: normalizar planta_id en bitácoras con empresa escrita a mano (ej. Tehuacán).
-- No borra registros; alinea planta_id y empresa al catálogo public.plantas.

WITH planta_match AS (
  SELECT
    b.id AS bitacora_id,
    p.id AS planta_id,
    p.nombre AS planta_nombre
  FROM arr.director_ia_bitacora b
  CROSS JOIN LATERAL (
    SELECT p2.id, p2.nombre
    FROM public.plantas p2
    WHERE lower(
      regexp_replace(
        translate(trim(coalesce(b.empresa, '')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
        '[^a-z0-9]',
        '',
        'g'
      )
    ) = lower(
      regexp_replace(
        translate(trim(p2.nombre), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
        '[^a-z0-9]',
        '',
        'g'
      )
    )
    OR lower(
      regexp_replace(
        translate(trim(coalesce(b.empresa, '')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
        '[^a-z0-9]',
        '',
        'g'
      )
    ) LIKE lower(
      regexp_replace(
        translate(trim(p2.nombre), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
        '[^a-z0-9]',
        '',
        'g'
      )
    ) || '%'
    ORDER BY length(p2.nombre) ASC
    LIMIT 1
  ) p
  WHERE b.is_active = true
    AND b.empresa IS NOT NULL
    AND trim(b.empresa) <> ''
)
UPDATE arr.director_ia_bitacora b
SET
  planta_id = pm.planta_id,
  empresa = pm.planta_nombre,
  updated_at = now()
FROM planta_match pm
WHERE b.id = pm.bitacora_id
  AND (
    b.planta_id IS DISTINCT FROM pm.planta_id
    OR b.empresa IS DISTINCT FROM pm.planta_nombre
  );

-- Caso explícito Tehuacán (variantes frecuentes).
WITH tehuacan AS (
  SELECT id, nombre
  FROM public.plantas
  WHERE lower(
    regexp_replace(
      translate(trim(nombre), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
      '[^a-z0-9]',
      '',
      'g'
    )
  ) = 'tehuacan'
  ORDER BY id
  LIMIT 1
)
UPDATE arr.director_ia_bitacora b
SET
  planta_id = t.id,
  empresa = t.nombre,
  updated_at = now()
FROM tehuacan t
WHERE b.is_active = true
  AND (
    lower(trim(b.empresa)) IN ('tehuacan', 'tehuacán')
    OR lower(trim(translate(b.empresa, 'áéíóúüñ', 'aeiouun'))) LIKE 'tehuacan%'
  )
  AND (
    b.planta_id IS DISTINCT FROM t.id
    OR b.empresa IS DISTINCT FROM t.nombre
  );
