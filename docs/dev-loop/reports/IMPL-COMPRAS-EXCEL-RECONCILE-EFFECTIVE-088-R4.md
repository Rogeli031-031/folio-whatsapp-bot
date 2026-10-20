# IMPL-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4

STATUS: DONE_PENDING_REVIEW

BASE_SHA: 07aca321a24b354e249fed28437fd8a77e994496
BRANCH: implementation/compras-excel-reconcile-effective-088-r4
PRODUCT_SHA: 0d4f518f81a41770e9353caf0d89d6902b608811
G1: AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-10-20

## Contrato aplicado

La compra que coincide en planta, proveedor canónico, fecha y kg a tres decimales se conserva con su id, su factura y sus valores capturados. El Excel se guarda exacto en `arr.compras_effective` y es el único valor de cálculo. No se suman captura y Excel.

El emparejamiento es uno a uno: primero `ROUND(excel_importe, 2)` igual al capturado; después la menor diferencia absoluta; el empate usa `compra_id` ascendente y `source_row` ascendente. No hay tolerancia ni fuzzy.

Una compra con factura sin contraparte Excel bloquea con `UNMATCHED_DOCUMENT_PURCHASE`. Una compra sin factura y sin contraparte puede eliminarse. La fila nueva guarda el importe redondeado a centavos en `arr.compras` y el importe exacto en el valor efectivo; no pinta la fecha.

La fecha se pinta de amarillo solo si una compra reconciliada `MATCHED_PRESERVED` difiere en kg o importe exacto. El criterio compara decimales, así `184637.55` y `184637.550000` coinciden. La nota nueva sin captura no pinta la fecha.

Alias exactos añadidos: `TEPEJI IMPOTADORA` → `TOMZA TEPEJI` y `TUXPAN IMPOTADORA` → `TOMZA TUXPAN`. Otro typo sigue en `UNKNOWN_ORIGIN`.

## Migración

`sql/025_compras_excel_effective_reconcile_088_r4.sql` abre con `BEGIN` y cierra con `COMMIT`. Crea `arr.compras_import_lineas` y `arr.compras_effective` con `NUMERIC(18,6)`. `compra_id` de la línea es `ON DELETE SET NULL`. El efectivo cae en cascada con la compra. Cambia `total_importe` a `NUMERIC(18,6)` solo si todavía no lo es. No rellena historia ni se ejecutó.

Antes de esa migración, `GET /api/compras` sigue respondiendo. `reconcile_ready` queda en falso y preview/commit responden 503 `COMPRAS_RECONCILE_SCHEMA_NOT_READY` sin leer las tablas nuevas.

## Tehuacán real

Lectura del archivo local, rango 2026-10-01 a 2026-10-18, sin escritura: 20 compras físicas, 1 nota de cargo, 395220 kg y 4948668.148 de importe. La nota del 07/10 conserva 0 kg y 38458.383.

## Pruebas

088, R1, R2, R3 y R4 pasan. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1 pasan. 016 falla en HEAD con la fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))` contra el valor 200. `lib/compras-excel.js` y el test 016 no cambiaron respecto de BASE, así que es el fallo previo.

`npx tsc --noEmit` y `npm run build` terminan en 0. El build avisa EPERM al crear el symlink de `standalone/node_modules`; `prepare-standalone` copia static y public. La pantalla de Compras no se abrió: exige sesión y base de datos.

NO DB WRITES PRODUCTIVOS. NO PR. NO MERGE. NO DEPLOY.
