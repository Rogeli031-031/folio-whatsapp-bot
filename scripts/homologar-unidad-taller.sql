-- =============================================================================
-- Homologar unidad (Taller) en pgAdmin
-- Canónico: AT-15, PT-69, S-83, C-33 (padding a 2 dígitos si num < 100)
-- Listas: se guardan como "AT-11, AT-12, AT-13" (el importe NO se parte en DB;
--         el reparto a sublíneas ocurre en reportes Excel).
-- =============================================================================

-- 1) Preview: valores actuales vs candidatos a multi-unidad
SELECT
  id,
  numero_folio,
  unidad AS unidad_actual,
  importe,
  mes_cargo,
  estatus
FROM public.folios
WHERE UPPER(TRIM(COALESCE(categoria, ''))) LIKE '%TALLER%'
  AND unidad IS NOT NULL
  AND TRIM(unidad) <> ''
  AND (
    unidad ~* '[,;]'
    OR unidad ~* '\s+Y\s+'
    OR unidad ~* '\.'
    OR unidad ~* '[0-9]+-[A-Z]*[0-9]+'
  )
ORDER BY id
LIMIT 200;

-- 2) Preview: unidades “sucias” (sin guión canónico AT-XX)
SELECT
  unidad,
  COUNT(*) AS folios
FROM public.folios
WHERE UPPER(TRIM(COALESCE(categoria, ''))) LIKE '%TALLER%'
  AND unidad IS NOT NULL
  AND TRIM(unidad) <> ''
GROUP BY unidad
ORDER BY COUNT(*) DESC, unidad
LIMIT 300;

-- =============================================================================
-- 3) Función PG: normaliza un token / lista (aprox. a lib/unidad-taller.js)
--    Prefijos: AT, PT, S, C (CIL→C, T→AT). Listas por coma / Y / punto / rango.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.homologar_unidad_taller(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text;
  chunk text;
  part text;
  out_arr text[] := ARRAY[]::text[];
  last_pref text := 'AT';
  pref text;
  n1 int;
  n2 int;
  i int;
  nums text[];
  tok text;
  u text;
BEGIN
  IF p_raw IS NULL OR btrim(p_raw) = '' THEN
    RETURN NULL;
  END IF;

  s := upper(btrim(p_raw));
  s := regexp_replace(s, '[\u2010-\u2015\u2212\uFF0D]', '-', 'g');
  s := regexp_replace(s, '\s+Y\s+', ',', 'gi');
  s := replace(s, ';', ',');

  FOREACH chunk IN ARRAY string_to_array(s, ',') LOOP
    chunk := btrim(chunk);
    IF chunk = '' THEN CONTINUE; END IF;

    -- Varias unidades separadas por espacio: "S-96 S-101"
    IF chunk ~ '^\S+\s+\S+' AND chunk !~ '-' AND chunk !~ '\.' THEN
      -- dejar como un solo token si no parecen unidades
      NULL;
    END IF;

    FOREACH part IN ARRAY regexp_split_to_array(btrim(chunk), '\s+') LOOP
      part := btrim(part);
      IF part = '' THEN CONTINUE; END IF;
      part := regexp_replace(part, '\s+', '', 'g');
      part := regexp_replace(part, '^CIL', 'C');

      -- Rango AT11-AT15 / AT11-15 / 11-15
      IF part ~ '^(AT|PT|S|C|T)?[0-9]{1,4}-(AT|PT|S|C|T)?[0-9]{1,4}$' THEN
        pref := coalesce(substring(part from '^(AT|PT|S|C|T)'), last_pref);
        IF pref = 'T' THEN pref := 'AT'; END IF;
        n1 := substring(part from '([0-9]{1,4})-')::int;
        n2 := substring(part from '-([A-Z]*)([0-9]{1,4})$')::int;
        -- n2: último bloque de dígitos
        n2 := (regexp_match(part, '([0-9]{1,4})$'))[1]::int;
        n1 := (regexp_match(part, '([0-9]{1,4})'))[1]::int;
        IF abs(n2 - n1) <= 40 THEN
          FOR i IN LEAST(n1, n2)..GREATEST(n1, n2) LOOP
            u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
            IF NOT (u = ANY (out_arr)) THEN
              out_arr := out_arr || u;
            END IF;
            last_pref := pref;
          END LOOP;
        END IF;
        CONTINUE;
      END IF;

      -- Puntos AT11.13.17
      IF part ~ '^(AT|PT|S|C|T)[0-9]{1,4}(\.[0-9]{1,4})+$' THEN
        pref := substring(part from '^(AT|PT|S|C|T)');
        IF pref = 'T' THEN pref := 'AT'; END IF;
        nums := regexp_split_to_array(regexp_replace(part, '^(AT|PT|S|C|T)', ''), '\.');
        FOREACH tok IN ARRAY nums LOOP
          IF tok ~ '^[0-9]+$' THEN
            i := tok::int;
            u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
            IF NOT (u = ANY (out_arr)) THEN
              out_arr := out_arr || u;
            END IF;
            last_pref := pref;
          END IF;
        END LOOP;
        CONTINUE;
      END IF;

      -- Solo dígitos → last_pref
      IF part ~ '^[0-9]{1,4}$' THEN
        i := part::int;
        u := last_pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
        IF NOT (u = ANY (out_arr)) THEN
          out_arr := out_arr || u;
        END IF;
        CONTINUE;
      END IF;

      -- Token AT15 / AT-15 / T15 / C-33
      IF part ~ '^(AT|PT|S|C|T)-?[0-9]{1,4}$' THEN
        pref := substring(part from '^(AT|PT|S|C|T)');
        IF pref = 'T' THEN pref := 'AT'; END IF;
        i := (regexp_match(part, '([0-9]{1,4})$'))[1]::int;
        u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
        IF NOT (u = ANY (out_arr)) THEN
          out_arr := out_arr || u;
        END IF;
        last_pref := pref;
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(out_arr, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN array_to_string(out_arr, ', ');
END;
$$;

-- 4) Preview del UPDATE (revisar antes de aplicar)
SELECT
  id,
  numero_folio,
  unidad AS antes,
  public.homologar_unidad_taller(unidad) AS despues,
  importe
FROM public.folios
WHERE UPPER(TRIM(COALESCE(categoria, ''))) LIKE '%TALLER%'
  AND unidad IS NOT NULL
  AND TRIM(unidad) <> ''
  AND public.homologar_unidad_taller(unidad) IS NOT NULL
  AND unidad IS DISTINCT FROM public.homologar_unidad_taller(unidad)
ORDER BY id
LIMIT 500;

-- 5) APPLY (descomenta para ejecutar)
/*
BEGIN;

UPDATE public.folios
SET unidad = public.homologar_unidad_taller(unidad)
WHERE UPPER(TRIM(COALESCE(categoria, ''))) LIKE '%TALLER%'
  AND unidad IS NOT NULL
  AND TRIM(unidad) <> ''
  AND public.homologar_unidad_taller(unidad) IS NOT NULL
  AND unidad IS DISTINCT FROM public.homologar_unidad_taller(unidad);

COMMIT;
-- ROLLBACK;
*/

-- 6) Ejemplo de reparto (solo consulta; no escribe en DB)
-- $2358 / 8 pipas = $294.75 c/u
SELECT
  u AS unidad,
  round(2358.00 / 8.0, 2) AS importe_parcial
FROM unnest(string_to_array(public.homologar_unidad_taller('11,12,13,14,15,16,17,24'), ', ')) AS u;
