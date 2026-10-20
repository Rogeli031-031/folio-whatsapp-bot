# FIX-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4-R2

STATUS: DONE_PENDING_REVIEW

BASE_SHA: b8428d72a0e27bd28a4bca51501d1de7e7b75194
MAIN_BASE_SHA: 07aca321a24b354e249fed28437fd8a77e994496
BRANCH: implementation/compras-excel-reconcile-effective-088-r4
PRODUCT_SHA: c1c708dabcaaba1c059bd60c4155240e3d4cfbf0
G1: AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-20

## Total del día

Si alguna compra del detalle tiene valor efectivo, el modal suma `effective_kg` y `effective_importe` y rotula `TOTAL DEL DIA — USADO PARA CALCULO`. El costo es ese importe dividido entre esos kilos. Sin efectivo se conserva `TOTAL DEL DÍA` y el formato anterior.

## Discrepancia viva

`mapPurchase.discrepant` se calcula en cada lectura. Para `CAPTURED` hay diferencia si los kilos no coinciden a 3 decimales o si el importe capturado no es igual a `ROUND(excel_importe, 2)`. `EXCEL_ONLY` queda siempre en falso. `fecha_discrepante` usa esa bandera actual.

La línea `arr.compras_import_lineas.discrepant` queda como `historical_discrepant`. Editar una compra sigue actualizando solo `arr.compras`. No se borra el efectivo, no cambia la procedencia y no se reescribe la línea.

## Validación

R4, R4-R1 y R4-R2 pasan, incluidos A–J. 088, R1, R2 y R3 pasan. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1 pasan. Tehuacán 01/10–18/10, solo lectura, cuadra en la suite R4. 016 falla en HEAD con la fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))` contra 200. `lib/compras-excel.js`, el test 016 y la migración 025 no cambiaron desde `b8428d72`.

`node --check`, `npx tsc --noEmit` y `npm run build` terminan en 0. El build avisa EPERM al crear el symlink de standalone. La pantalla viva no se abrió: exige sesión y base de datos. La migración 025 no se ejecutó.

NO DB WRITES PRODUCTIVOS. NO PR. NO MERGE. NO DEPLOY.
