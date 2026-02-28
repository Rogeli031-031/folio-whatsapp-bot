-- Borra la versión 5 del IGF para poder volver a subirla.
-- Ajusta year/month si solo quieres borrar la v.5 de un periodo concreto (ej. 2026/2).

-- 1) Borrar líneas de compromiso que pertenecen a la versión 5
DELETE FROM igf.compromiso_lines
WHERE version_id IN (
  SELECT id FROM igf.versions
  WHERE plant_code = 'GLOBAL'
    AND version_number = 5
    -- AND year = 2026 AND month = 2   -- descomenta para limitar a 2026/feb
);

-- 2) Borrar el registro de la versión en igf.versions
DELETE FROM igf.versions
WHERE plant_code = 'GLOBAL'
  AND version_number = 5
  -- AND year = 2026 AND month = 2     -- descomenta para limitar a 2026/feb
;
