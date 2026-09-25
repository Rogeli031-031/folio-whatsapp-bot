# FIX-IGF-DIARIO-ACENTO-DESDE-MAIN-047

status: DONE_PENDING_REVIEW

## Qué cambió

La rama sale de `main` en `c055554c`. No incluye la 046.

`reserveSheet` sin nombre sigue creando `IGF Diario Puebla`. Si se reserva `IGF Diario Queretaro` y después se llena con `Querétaro`, el nombre se compara sin acentos ni mayúsculas y se escribe en la hoja que ya existe. El nombre reservado no se reemplaza. No se crea una segunda hoja.

## Verificación

- Queretaro / Querétaro: una hoja, nombre `IGF Diario Queretaro`, con el encabezado escrito. Al reabrir el XLSX sigue habiendo una sola.
- Puebla: una hoja `IGF Diario Puebla` y el rótulo `PLANTA PUEBLA`.
- 19/19: la prueba nueva y las de IGF Diario Puebla 036 a 044. `git diff --check` sin hallazgos.
- El diff contra `c055554c` no toca `lib/compras-excel.js` ni `server.js`.

## Límite

Esta rama no genera la hoja de Querétaro en la descarga. Solo evita que dos nombres equivalentes creen dos hojas. La 046 sigue fuera de `main`.
