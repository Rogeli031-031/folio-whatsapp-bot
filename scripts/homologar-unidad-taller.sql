-- =============================================================================
-- Homologar unidad (Taller) en pgAdmin
-- Canónico: AT-15, PT-69, S-83, C-33, U-56
-- Extras: A.T.10 → AT-10 | AT-P 12 → AT-12 | AT-144-142 → AT-144, AT-142
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
  lo int;
  hi int;
  nums text[];
  tok text;
  u text;
  m text[];
  rest text;
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

    FOREACH part IN ARRAY regexp_split_to_array(chunk, '\s+') LOOP
      part := btrim(part);
      IF part = '' THEN CONTINUE; END IF;
      part := regexp_replace(part, '\s+', '', 'g');

      -- A.T.10 → AT10
      IF part ~ '^(?:[A-Z]\.)+[A-Z0-9]' THEN
        part := replace(part, '.', '');
      END IF;

      part := regexp_replace(part, '^CIL', 'C');
      -- AT-P12 / ATP12
      part := regexp_replace(part, '^(AT|PT|S|C|U|T)-?P-?(?=[0-9])', '\1');

      -- Lista un prefijo: AT-144-142 → dos unidades (no rango 142..144)
      m := regexp_match(part, '^(AT|PT|S|C|U|T)-([0-9]{1,4}(?:-[0-9]{1,4})+)$');
      IF m IS NOT NULL THEN
        pref := m[1];
        IF pref = 'T' THEN pref := 'AT'; END IF;
        nums := string_to_array(m[2], '-');
        FOREACH tok IN ARRAY nums LOOP
          IF tok ~ '^[0-9]+$' THEN
            i := tok::int;
            u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
            IF NOT (u = ANY (out_arr)) THEN
              out_arr := array_append(out_arr, u);
            END IF;
          END IF;
        END LOOP;
        last_pref := pref;
        CONTINUE;
      END IF;

      -- Rango AT11-AT15 | AT11-15 | 11-15
      m := regexp_match(part, '^(AT|PT|S|C|U|T)?([0-9]{1,4})-(?:(AT|PT|S|C|U|T))?([0-9]{1,4})$');
      IF m IS NOT NULL THEN
        pref := coalesce(NULLIF(m[1], ''), NULLIF(m[3], ''), last_pref);
        IF pref = 'T' THEN pref := 'AT'; END IF;
        n1 := m[2]::int;
        n2 := m[4]::int;
        IF abs(n2 - n1) <= 40 THEN
          lo := LEAST(n1, n2);
          hi := GREATEST(n1, n2);
          FOR i IN lo..hi LOOP
            u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
            IF NOT (u = ANY (out_arr)) THEN
              out_arr := array_append(out_arr, u);
            END IF;
          END LOOP;
          last_pref := pref;
        END IF;
        CONTINUE;
      END IF;

      -- Puntos: AT11.13.17
      m := regexp_match(part, '^(AT|PT|S|C|U|T)([0-9]{1,4}(?:\.[0-9]{1,4})+)$');
      IF m IS NOT NULL THEN
        pref := m[1];
        IF pref = 'T' THEN pref := 'AT'; END IF;
        nums := string_to_array(m[2], '.');
        FOREACH tok IN ARRAY nums LOOP
          IF tok ~ '^[0-9]+$' THEN
            i := tok::int;
            u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
            IF NOT (u = ANY (out_arr)) THEN
              out_arr := array_append(out_arr, u);
            END IF;
          END IF;
        END LOOP;
        last_pref := pref;
        CONTINUE;
      END IF;

      -- Solo dígitos
      IF part ~ '^[0-9]{1,4}$' THEN
        i := part::int;
        u := last_pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
        IF NOT (u = ANY (out_arr)) THEN
          out_arr := array_append(out_arr, u);
        END IF;
        CONTINUE;
      END IF;

      -- Token AT15 / AT-15 / U56 / C-33
      m := regexp_match(part, '^(AT|PT|S|C|U|T)-?([0-9]{1,4})$');
      IF m IS NOT NULL THEN
        pref := m[1];
        IF pref = 'T' THEN pref := 'AT'; END IF;
        i := m[2]::int;
        u := pref || '-' || CASE WHEN i < 100 THEN lpad(i::text, 2, '0') ELSE i::text END;
        IF NOT (u = ANY (out_arr)) THEN
          out_arr := array_append(out_arr, u);
        END IF;
        last_pref := pref;
      END IF;
    END LOOP;
  END LOOP;

  IF coalesce(array_length(out_arr, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN array_to_string(out_arr, ', ');
END;
$$;

-- Pruebas rápidas
SELECT public.homologar_unidad_taller('A.T.10') AS a_t_10;          -- AT-10
SELECT public.homologar_unidad_taller('AT-10') AS at_10;             -- AT-10
SELECT public.homologar_unidad_taller('AT-144-142') AS dos;          -- AT-144, AT-142
SELECT public.homologar_unidad_taller('AT-P 12') AS at_p;            -- AT-12
SELECT public.homologar_unidad_taller('U-56') AS u56a;               -- U-56
SELECT public.homologar_unidad_taller('U56') AS u56b;                -- U-56
SELECT public.homologar_unidad_taller('11,12,13,14,15,16,17,24') AS lista;

-- Preview UPDATE
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

-- APPLY (descomenta)
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
*/
