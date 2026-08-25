-- Borra la versión 5 del IGF para poder volver a subirla, SOLO si es FORECAST.
-- FINAL y SUPERSEDED son evidencia histórica: el DELETE falla (no es silent skip).
-- Ajusta year/month si solo quieres borrar la v.5 de un periodo concreto (ej. 2026/2).

DO $g$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM igf.versions
     WHERE plant_code = 'GLOBAL'
       AND version_number = 5
       -- AND year = 2026 AND month = 2
       AND financial_state IN ('FINAL', 'SUPERSEDED')
  ) THEN
    RAISE EXCEPTION 'IGF_FINAL_HISTORY_IMMUTABLE: no se puede borrar version_number=5 en estado FINAL/SUPERSEDED';
  END IF;
END
$g$;

-- 1) Líneas de compromiso de la versión 5 FORECAST
DELETE FROM igf.compromiso_lines
WHERE version_id IN (
  SELECT id FROM igf.versions
  WHERE plant_code = 'GLOBAL'
    AND version_number = 5
    AND financial_state = 'FORECAST'
    -- AND year = 2026 AND month = 2
);

-- 2) Versión 5 FORECAST
DELETE FROM igf.versions
WHERE plant_code = 'GLOBAL'
  AND version_number = 5
  AND financial_state = 'FORECAST'
  -- AND year = 2026 AND month = 2
;
