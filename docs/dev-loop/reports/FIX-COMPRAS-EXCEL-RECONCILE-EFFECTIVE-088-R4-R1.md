# FIX-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4-R1

STATUS: DONE_PENDING_REVIEW

BASE_SHA: c7c12b262b1135bc074c525ffb1a9aae29457aec
MAIN_BASE_SHA: 07aca321a24b354e249fed28437fd8a77e994496
BRANCH: implementation/compras-excel-reconcile-effective-088-r4
PRODUCT_SHA: f261b10e8dc2d13c6f671f4fa92e4a2279676683
G1: AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-20

## Provenance

`arr.compras_effective.provenance` y la línea distinguen `CAPTURED` de `EXCEL_ONLY`. Una fila creada por Excel guarda el centavo de compatibilidad en `arr.compras` y el valor exacto en el efectivo. Su línea queda `INSERTED`, sin importe capturado y sin discrepancia.

Al reimportarla se actualiza el efectivo, se agrega otra línea y sigue siendo `EXCEL_ONLY`. No se compara el redondeo de compatibilidad como si fuera una captura, así que la fecha no se pinta. La interfaz muestra solo `EXCEL — USADO PARA CALCULO`.

Una compra manual previa sigue en `MATCHED_PRESERVED`. Si el Excel difiere, la fecha queda amarilla y se ven captura y Excel. La nota creada por Excel se comporta igual que cualquier fila `EXCEL_ONLY`.

## Esquema

`comprasReconcileSchemaReady` exige las tablas, `total_importe numeric(18,6)` y el tipo de las columnas de línea y efectivo, incluida `provenance`. Si falta o cambia una, `reconcile_ready` queda en falso y preview/commit responden 503 `COMPRAS_RECONCILE_SCHEMA_NOT_READY` sin leer esas tablas ni escribir.

## Copy

`EXCEL_BLOCK_DOCS` y el aviso de pantalla dicen: `Hay compras con factura sin contraparte en el Excel. No se aplicará la conciliación.` Una factura ya reconciliada no dispara ese aviso.

## Validación

R4, R4-R1, 088, R1, R2 y R3 pasan. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1 pasan. Tehuacán 01/10–18/10, solo lectura: 20 físicas, 1 nota, 395220 kg, 4948668.148. 016 falla en HEAD con la misma fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))` contra 200; `lib/compras-excel.js` y el test no cambiaron desde la base de esta tarea.

`node --check`, `npx tsc --noEmit` y `npm run build` terminan en 0. El build avisa EPERM al crear el symlink de standalone. La pantalla viva no se abrió: exige sesión y base de datos. La migración 025 no se ejecutó.

NO DB WRITES PRODUCTIVOS. NO PR. NO MERGE. NO DEPLOY.
