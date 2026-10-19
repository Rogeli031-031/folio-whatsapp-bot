# FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R2

STATUS: DONE_PENDING_REVIEW

INTEGRATION_BASE: 71aa5be0aca465671e1cd8220b13b29f15aed582
STARTING_HEAD: 9925b877887dd899c33e58ee240b3c8220157ccf
PREVIOUS_PRODUCT_SHA: a5475d1ee8c04d15568fb84add79b3cd751079a9
NEW_PRODUCT_SHA: 5900b1d03bfd22b27f4616d0e724b8a0f61ddace
FINAL_SHA: commit de documentación de esta corrección

## Fecha ilegible

Una fila con contenido y fecha ilegible ya no se omite antes de evaluar el error. Si la hoja de esa fila, junto con el único año del libro, cae en un mes del rango, el preview y el commit quedan bloqueados con `BAD_DATE`. No se inventa fecha, no se inserta la fila y no se borran las compras del rango.

Una fecha ilegible en otra hoja, fuera de los meses del rango, no bloquea por sí sola. `UNKNOWN_ORIGIN`, `BAD_KG` y `BAD_IMPORTE` siguen bloqueando solo cuando la fecha legible cae dentro del rango. `DATE_SHEET_MISMATCH` también: en HIDROGAS, 2026-10-07 dentro de SEPTIEMBRE bloquea únicamente si el rango incluye ese día.

Si el año no se puede determinar, siguen valiendo `YEAR_UNDETERMINED` y `MULTI_YEAR_WORKBOOK`.

## Migración

`sql/024_compras_excel_import_088.sql` abre `BEGIN` antes de cualquier DDL y cierra con `COMMIT`. El cambio del check de kilos, las tablas, la llave de `actor_id` y los índices van en esa misma transacción. No hay `SAVEPOINT`. El candidato de `kg > 0` sigue siendo único y `compras_importe_check` no entra en ningún `DROP`.

No se ejecutó.

## Pruebas

R2: 4/4, casos A–L, incluido HIDROGAS y Tehuacán reales. 088: 13/13. R1: 7/7. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1: 142/142. 016, Forecast 024 y 049 no se reabrieron.

`node --check`: correcto. `npx tsc --noEmit`: correcto. `npm run build`: correcto. El enlace de `standalone/node_modules` sigue en EPERM. El frontend no cambió en esta corrección.

## Fuera de esta entrega

No hubo migración productiva, escrituras productivas, PR, merge ni deploy. G1-088 y G1-088-R1 no se modificaron.
