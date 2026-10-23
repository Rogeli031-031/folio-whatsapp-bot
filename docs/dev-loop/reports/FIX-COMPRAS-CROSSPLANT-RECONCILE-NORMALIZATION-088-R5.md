# FIX-COMPRAS-CROSSPLANT-RECONCILE-NORMALIZATION-088-R5

STATUS: DONE_PENDING_REVIEW

BASE_SHA: f6d08998d1b1d0689d92b9bf8e62faee38849eb4
BRANCH: fix/compras-crossplant-reconcile-normalization-088-r5
PRODUCT_SHA: 89bf2bc8d822a03a1fbff270bbbd3b723f09227f
G1: AUTHORIZED_BY_HUMAN: Luir Rogelio Zaragoza alvarez 2026-10-23

## Alias y A1

`TEPEJI TOMZA` queda como `TOMZA TEPEJI`. Cualquier otro texto desconocido sigue en `UNKNOWN_ORIGIN`. `SAN LUIS POTOSI`, ya sin acento por el fold vigente, resuelve la planta San Luis sin `source_company`.

## Nota sin fecha

Una `NOTA DE CARGO` con G vacío hereda la fecha solo de la fila inmediata anterior de la misma hoja, si esa fila es una compra física con fecha válida del mes de la hoja. Si no se cumple, el preview queda bloqueado con `NOTE_DATE_AMBIGUOUS`. No se busca más arriba, no se encadena nota con nota y no se cruza de hoja. Los kilos siguen en 0 y el importe es el de J.

## Repair de proveedor

Si una fila física no tiene match por proveedor+fecha+kg, y existe exactamente una compra suelta de la misma planta con esa fecha y esos kilos, y ambos proveedores son físicos canónicos distintos, el preview la reporta en `provider_repairs`. El commit conserva el id y la factura, cambia solo `proveedor_id` y escribe la conciliación efectiva. Una segunda fila Excel con la misma fecha y kilos bloquea con `AMBIGUOUS_PROVIDER_REPAIR`. El rollback revierte el cambio de proveedor.

## Acapulco

Una compra legado con `source_company` vacío se clasifica a HIDROGAS o URIBE solo si el match es exacto, o si entra al repair exacto. El id y la factura se conservan. El legado sin match no se borra ni se adjudica, y el preview muestra `legacy_matched_to_source` y `legacy_remaining_unclassified`. Una importación de una empresa no borra ni reescribe filas ya clasificadas de la otra.

`DATE_SHEET_MISMATCH` bloquea solo cuando la fila de esa hoja y ese renglón cae dentro del rango. El preview muestra hoja, renglón y fecha. No se deduplica.

## UI

La frase de facturas sin contraparte se pinta una vez. Los demás errores del preview siguen visibles. Una recarga exitosa limpia el aviso global, igual que el cambio de planta, año o mes. El aviso se puede cerrar. `friendlyError` conserva los errores reales.

## Validación

R5, 088, R1, R2, R3, R4, R4-R1 y R4-R2 pasan. Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1 pasan. 016 falla en HEAD con la fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))` contra 200. `lib/compras-excel.js` y el test 016 no cambiaron desde `f6d08998`. La migración 025 no se modificó ni se ejecutó.

La carpeta `TOMZA_088_EXCEL` no estaba en esta máquina, así que Querétaro, San Luis, Morelos, HIDROGAS, URIBE y Tehuacán reales no se releyeron. Los casos sintéticos cubren alias, notas, repair, legado, aislamiento y el desfase por hoja y renglón.

`node --check`, `npx tsc --noEmit` y `npm run build` terminan en 0. El build avisa EPERM al crear el symlink de standalone. La pantalla viva no se abrió: exige sesión y base de datos.

NO DB WRITES PRODUCTIVOS. NO PR. NO MERGE. NO DEPLOY.
