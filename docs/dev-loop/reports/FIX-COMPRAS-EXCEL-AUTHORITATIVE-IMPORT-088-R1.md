# FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R1

STATUS: DONE_PENDING_REVIEW

INTEGRATION_BASE: 71aa5be0aca465671e1cd8220b13b29f15aed582
PREVIOUS_PRODUCT_SHA: 10420024dbe4988bb17afb6d8a064153a982b70d
STARTING_HEAD: 1f5e1a507872c6ccec4087c1bd708d4fdbca66e4
NEW_PRODUCT_SHA: a5475d1ee8c04d15568fb84add79b3cd751079a9
FINAL_SHA: commit de documentación de esta corrección

## Mes vacío

Si la hoja del mes existe y el workbook tiene un solo año, ese mes está presente aunque no tenga compras. El preview queda válido y el commit borra las compras del alcance sin insertar filas de kg 0.

El año sale de todas las fechas legibles del libro, también las que quedan fuera del rango. Un solo año se usa para las hojas vacías. Otro año produce `YEAR_MISMATCH`. Ninguna fecha produce `YEAR_UNDETERMINED`. Más de un año produce `MULTI_YEAR_WORKBOOK`. No se usa la fecha de hoy ni el nombre del archivo.

`DATE_SHEET_MISMATCH` se mantiene. En HIDROGAS, la fecha 2026-10-07 de la hoja SEPTIEMBRE bloquea solo si el rango la incluye.

## Migración

`sql/024_compras_excel_import_088.sql` elimina únicamente el check cuya definición normalizada es `kg > 0`. Si no hay un candidato, hay varios, o `compras_kg_nonnegative` ya existe con otra definición, hace `RAISE EXCEPTION`. Crea `compras_kg_nonnegative CHECK (kg >= 0)` y no vuelve a tocarlo si ya es correcto. `compras_importe_check` no se menciona en ningún `DROP`. `actor_id` referencia `public.usuarios(id)`.

No se ejecutó.

## Rollout

`comprasImportSchemaReady` solo lee `to_regclass` y la definición de `compras_kg_nonnegative`. No crea tablas ni altera el schema.

`GET /api/compras` sigue respondiendo y agrega `import_ready`. Sin la migración queda `false`. El botón Importar compras Excel permanece deshabilitado y muestra “Importación pendiente de habilitar”.

Preview y commit, si el schema no está listo, responden 503 `COMPRAS_IMPORT_SCHEMA_NOT_READY` antes de consultar las tablas laterales, sin transacción y sin escritura.

## Pruebas

R1: 7/7, casos A–Q y los cinco Excel reales. Siguen en 2026. Tehuacán octubre sigue bloqueado por las erratas. HIDROGAS bloquea el desfase solo dentro del rango.

088: 13/13. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1: 142/142. No se reabrieron 016, Forecast 024 ni 049.

`node --check`: correcto. `npx tsc --noEmit`: correcto. `npm run build`: correcto. El enlace de `standalone/node_modules` sigue en EPERM; `prepare-standalone` terminó. La pantalla viva no se recorrió: exige sesión y base de datos.

## Fuera de esta entrega

No hubo migración productiva, escrituras productivas, PR, merge ni deploy. G1-088 original no se modificó.
