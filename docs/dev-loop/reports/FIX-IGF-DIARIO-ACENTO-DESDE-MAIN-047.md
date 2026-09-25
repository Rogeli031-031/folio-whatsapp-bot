# FIX-IGF-DIARIO-ACENTO-DESDE-MAIN-047

status: DONE_PENDING_REVIEW

## Qué cambió

La rama sale de `main` en `c055554c`. No incluye la 046.

`reserveSheet` sin nombre sigue creando `IGF Diario Puebla`. Reservar con `Queretaro` y volver a reservar con `Querétaro` devuelve la misma hoja. El nombre se compara sin acentos ni mayúsculas y no se crea otra pestaña. El nombre reservado no se reemplaza.

`fillIgfDiarioPuebla()` no lee el nombre de la planta. Sigue reservando `IGF Diario Puebla`, buscando encabezados de Puebla y escribiendo `PLANTA PUEBLA`.

## Verificación

- `reserveSheet(wb, "Queretaro")` y `reserveSheet(wb, "Querétaro")` devuelven el mismo worksheet. El nombre sigue siendo `IGF Diario Queretaro`. Al reabrir el XLSX hay una sola hoja.
- Puebla: `fillIgfDiarioPuebla()` deja una hoja `IGF Diario Puebla` y el rótulo `PLANTA PUEBLA`.
- 19/19: la prueba nueva y las de IGF Diario Puebla 036 a 044. `git diff --check` sin hallazgos.
- El diff contra `c055554c` no toca `lib/compras-excel.js` ni `server.js`.

## Límite

Esta rama no genera la hoja de Querétaro en la descarga. Solo evita que dos nombres equivalentes creen dos hojas. La 046 sigue fuera de `main`.
