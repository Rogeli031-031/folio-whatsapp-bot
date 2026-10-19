# IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088

STATUS: DONE_PENDING_REVIEW

BASE: 71aa5be0aca465671e1cd8220b13b29f15aed582
PRODUCT_SHA: 10420024dbe4988bb17afb6d8a064153a982b70d
FINAL_SHA: commit de documentación de esta tarea

## Archivos reales

Leídos con ExcelJS desde `C:\Users\SUBDIRECCION\Desktop\TOMZA_088_EXCEL`. No se versionaron.

HIDROGAS y URIBE están en disco como `DETALLE%20DE%20COMPRAS%20HIDROGAS.xlsx` y `DETALLE%20DE%20COMPRAS%20URIBE.xlsx`. Puebla, Tehuacán y Morelos usan el nombre con espacios.

| Archivo | A1 | Hojas | Filas con datos | Fechas | G | Orígenes |
| --- | --- | --- | --- | --- | --- | --- |
| HIDROGAS | HIDROGAS | SEPTIEMBRE 6–17 (12), OCTUBRE 6–10 (5) | 17 | 2026-09-04..2026-10-17 | Date UTC | PEMEX TUXPAN, TUXPAN IMPORTADORA, TEPEJI IMPORTADORA |
| URIBE | URIBE | SEPTIEMBRE 6–58 (53), OCTUBRE 6–40 (35) | 88 | 2026-09-01..2026-10-18 | Date UTC | PEMEX TUXPAN, TUXPAN IMPORTADORA, TEPEJI IMPORTADORA, NOTA DE CARGO |
| PUEBLA | PUEBLA | SEPTIEMBRE 6–65 (60), OCTUBRE 6–26 (21) | 81 | 2026-09-01..2026-10-18 | Date UTC | PEMEX TUXPAN, TEPEJI-IMPORTADORA, TEPEJI IMPORTADORA |
| TEHUACAN | TEHUACAN | SEPTIEMBRE 6–56 (51), OCTUBRE 6–26 (21) | 72 | 2026-09-01..2026-10-18 | Date UTC | PEMEX TUXPAN, TUXPAN IMPORTADORA, TEPEJI IMPOTADORA, TUXPAN IMPOTADORA, NOTA DE CARGO |
| MORELOS | MORELOS | SEPTIEMBRE 6–41 (36), OCTUBRE 6–30 (25) | 61 | 2026-09-01..2026-10-18 | Date UTC | PEMEX TUXPAN, TEPEJI-IMPORTADORA, TEPEJI IMPORTADORA, TUXPAN IMPORTADORA |

A, E y J observados: texto en A; número en E y J. E vacío en la nota de Tehuacán octubre (1) y en las cuatro notas de Uribe octubre. No apareció G como serial ni como texto en estas filas. El parser también acepta serial Excel y texto `dd/mm/aaaa`.

Meses representados: septiembre y octubre de 2026.

Anomalías que el importador no corrige por aproximación:

- `TEPEJI-IMPORTADORA` se normaliza a `TEPEJI IMPORTADORA` porque el guion se trata como separador, y mapea a TOMZA TEPEJI.
- `TEPEJI IMPOTADORA` (6) y `TUXPAN IMPOTADORA` (2) en Tehuacán octubre quedan como origen desconocido y bloquean el preview si el rango las incluye.
- La hoja SEPTIEMBRE de HIDROGAS contiene la fecha 2026-10-07. Si el rango incluye ese día, el preview bloquea por fecha incoherente con la hoja.

## Contrato implementado

Cada fila válida desde la fila 6 es una compra. No se agrupan filas iguales. Dentro del rango, el Excel sustituye solo el alcance del archivo: planta completa, o solo HIDROGAS, o solo URIBE. Fuera del rango no se modifica nada. Un mes pedido sin hoja del mismo año-mes bloquea. Una planta distinta al A1 bloquea.

NOTA DE CARGO se guarda con kg 0 e importe de J. No suma kilos ni flete; sí suma importe. El alta manual sigue rechazando kg 0.

Acapulco sin `source_company` en el rango produce `LEGACY_ACAPULCO_UNCLASSIFIED` y el commit no escribe. Una compra del alcance con fila en `arr.compras_documentos` bloquea el commit. No hay borrado de documento, BYTEA ni S3.

`arr.compras_hg` solo se lee. El commit compara la foto de id, fecha y `hg_kilos` antes y después. Si difiere, hace rollback.

El preview no abre transacción. El commit reparsea el archivo, abre transacción, revalida, borra solo el alcance, inserta cada fila y su meta, y confirma. `request_id` repetido devuelve el resultado ya guardado.

## Migración

`sql/024_compras_excel_import_088.sql` crea `arr.compras_importaciones` y `arr.compras_import_meta`, y permite `kg >= 0` sin quitar el rechazo de kg negativo. No se ejecutó en producción ni contra una base local: este entorno no tiene una base de desarrollo separada identificada, y el arranque de Compras no aplica este DDL.

## Pruebas

`node --test test/impl-compras-excel-authoritative-import-088.test.js`: 13/13. Incluye la matriz A–T y la lectura de los cinco archivos reales cuando la carpeta está presente.

Regresiones de compras 013, 014, 020, 021, 022, 026 y 030 pasaron dentro del lote de 166 pruebas. Fallos previos, en archivos no tocados por esta tarea: 016 (el Excel de flete devuelve la fórmula en vez del valor 200), 024 Forecast (el nombre del archivo en `server.js` ya no coincide con el texto esperado) y 049 (fórmulas de corte IGF). 048, 052 y 059/059-R1 pasaron.

`node --check` del módulo de compras: correcto. `npx tsc --noEmit`: correcto. `npm run build` del frontend: correcto. El enlace simbólico de `standalone/node_modules` sigue fallando con EPERM, igual que en tareas anteriores; `prepare-standalone` copió static y public. La pantalla viva de Compras no se recorrió en el navegador: exige sesión y base de datos.

## Fuera de esta entrega

No hubo migración productiva, escrituras productivas, borrados S3, PR, merge ni deploy.
