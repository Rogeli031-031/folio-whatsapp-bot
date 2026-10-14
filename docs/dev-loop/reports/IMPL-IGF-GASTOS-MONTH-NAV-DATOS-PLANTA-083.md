# IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083

## Identidad

```yaml
task_id: "IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083"
outcome: "DONE_PENDING_REVIEW"
product_sha: "0d5cfd0df2d2e15faf41540fd7403d8341076482"
base_sha: "61330e14e468b853fce12603a53f92f7a1ca12d3"
branch: "implementation/igf-gastos-month-navigation-datos-planta-083"
files_touched:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/igf-gastos-month-nav.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-datos-planta.js"
  - "test/impl-igf-gastos-month-navigation-datos-planta-083.test.js"
  - "test/impl-igf-diario-datos-planta-082.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083.md"
  - "docs/dev-loop/reports/evidence-083/"
files_not_touched:
  - "importador ARR"
  - "esquema y escrituras de la DB"
  - "cálculo de venta, HG, C&D y resultado"
  - "fallback 078-R2"
  - "semanas domingo-sábado 079"
  - "paridad 080"
  - "gráfica 081"
  - "hoja PRECIO y el resto de hojas, salvo las celdas autorizadas de DatosPlanta"
  - "TODAS / Provincia"
  - "server.js"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Capturar el HG real de Acapulco del 2026-10-12. Esta tarea no lo inserta."
schema_changes: false
migrations: false
production_db_writes: false
pull_request: false
merge: false
deploy: false
```

## Acapulco 2026-10-12

ACAPULCO HG: MISSING

La consulta de solo lectura ya hecha observó planta 1, fecha 2026-10-12, sin fila en `arr.compras_hg`, venta CASA 29436.48 kg, venta COMISIONISTA 25560.36 kg y 77 descuentos con total -11647.70. Esos valores son una observación, no constantes del código. El resultado semanal sigue exigiendo un HG numérico. No se copió un HG anterior, no se convirtió la ausencia en 0 y no se insertó ninguna fila. El usuario debe capturar el HG real. Esta tarea no afirma que esa captura ya ocurrió.

La prueba de 083 llama `dayMetrics` con `hgImporte: null` y obtiene `resultado_mxn` null. Con `hgImporte: 0` el resultado permanece numérico. No hubo escritura productiva.

## Navegación mensual

MONTH NAVIGATION: el modal OPERATIVOS y el modal CORPORATIVOS muestran mes anterior, el mes y año visibles, mes siguiente y la planta. Al abrir toman el año y mes del dashboard y conservan planta y grupo. Diciembre avanza a enero del año siguiente y enero retrocede a diciembre del año anterior. Cambiar de mes no llama `setUploadDay` y no guarda solo.

MONTH SAVE ISOLATION: leer y guardar el desglose usan el año y mes del modal. La caché del dashboard (`gastosDesglose` y `gastosManuales`) se actualiza solo si ese periodo coincide con el del dashboard. Una respuesta se aplica solo si coinciden requestId, planta, grupo, año y mes.

DAILY DISTRIBUTION PERIOD: abrir y guardar la distribución diaria usan el año y mes del modal padre. Una respuesta tardía de otro periodo no reemplaza el estado visible.

UNSAVED CHANGES: cambiar de mes o cerrar pide confirmación si el borrador difiere de la línea base. Cancelar no escribe. Guardar queda deshabilitado mientras carga, mientras guarda, si la lectura falló o si el mes conserva el contrato anterior. Un mes sin desglose deja los campos vacíos y no fabrica ceros. Septiembre 2026 sigue fuera del desglose detallado; octubre 2026 y enero 2027 siguen dentro.

## DatosPlanta

M PRICE PARITY: M es `PRECIO ($/kg)`. Cada fecha de DatosPlanta busca la misma fecha en PRECIO!A y escribe la fórmula `PRECIO!B{fila}` con el resultado ya almacenado en esa celda. La fila no es `filaDatosPlanta - 1`. Si la fecha no está en PRECIO, M queda vacía. El formato es `0.00000000`. PRECIO no se recalcula ni se modifica para llenar M. En el generador de prueba, el día sin precio propio apunta a la celda de PRECIO que ya trae el arrastre de esa hoja.

AF CASA MXN: AF es `Descuento CASA ($)`, importe en pesos del canal CASA.

AG COMISIONISTA MXN: AG es `Descuento COMISIONISTA ($)`, importe en pesos del canal COMISIONISTA. El encabezado agrupado es DESCUENTOS.

La fuente reutiliza `aggregateDescuentoDiarioPorCanal` y la consulta de `arr.descuentos_diarios_cliente` con `arr.cliente_categoria_mes`. No se multiplican tasas por ventas ni se reconstruye Contado/Crédito. El signo y la precisión del importe se conservan.

NULL/ZERO: un monto capturado 0 se escribe. Un monto null o una fecha sin registros queda vacío. El 0 inicial del agregador no cuenta como captura si `montoCaptured` es false.

UNCLASSIFIED AMOUNTS: un canal que no es CASA ni COMISIONISTA no se asigna a CASA. En el fixture de San Luis del 2026-10-04, Predio -99 queda fuera de AF y AG. AF + AG de ese día es -15.5, igual al total clasificado. Morelos no hereda los descuentos de San Luis.

N y R siguen vacías. Los separadores siguen vacíos. AF, AG y M salieron de la lista de columnas de datos vacías.

EXISTING SHEETS PARITY: el generador completo BASE `61330e14` y HEAD, con el mismo payload de fixture para San Luis (corte 2026-10-11) y Morelos (corte 2026-10-06), no agregó ni quitó hojas. Fuera de los encabezados y celdas autorizados de M, AF y AG, la comparación no reportó diferencias. No apareció `#REF!`. El orden sigue RESUMEN, DatosPlanta, IGF Diario {planta} y el resto. DatosPlanta no se agregó a TODAS.

## Pruebas

TESTS:
- `test/impl-igf-gastos-month-navigation-datos-planta-083.test.js`: 7/7.
- `test/impl-igf-diario-datos-planta-082.test.js`: 9/9.
- Regresión de gastos, distribución, 077, 078-R2, 079, 080 y 081: 120 pruebas, 118 en verde, 2 fallos.
- `test/forecast-excel-plant-compras-024.test.js` en la base separada `61330e14`: 26 pruebas, 24 en verde, 2 fallos.
- `tsc --noEmit`: exit 0.
- `npm run build` en frontend-dashboard: exit 0.
- `git diff --check`: sin hallazgos.
- `server.js`, `lib/arr-load.js`, `lib/igf-diario-weekly-plant.js` y `lib/igf-diario-puebla.js` sin diff contra la base.

REGRESSIONS: los dos fallos son los de 024 y ya existen en BASE. Buscan en `server.js` las plantillas `Dashboard_ARR_Forecast_${String(resolvedPlant.canon` y `Dashboard_ARR_Forecast_${year}_${month}.xlsx`. Esta tarea no modificó `server.js` y no desactivó esas pruebas. No apareció una regresión nueva.

FRONTEND BUILD: exit 0.

## Evidencia

XLSX / VISUAL EVIDENCE, fixture local, no producción y sin sesión autenticada:

- `docs/dev-loop/reports/evidence-083/san-luis-full.xlsx`
- `docs/dev-loop/reports/evidence-083/morelos-full.xlsx`
- `docs/dev-loop/reports/evidence-083/san-luis-discounts.xlsx`
- `docs/dev-loop/reports/evidence-083/modal-operativos-octubre.png`
- `docs/dev-loop/reports/evidence-083/modal-cambio-mes-y-columnas.png`
- `docs/dev-loop/reports/evidence-083/datosplanta-m-af-ag.png`

Las imágenes muestran el control de mes de OPERATIVOS en octubre 2026, CORPORATIVOS en noviembre 2026 y las columnas M, N, AF y AG releídas del libro de San Luis. M muestra 10.5, N vacía, AF -15.5 y AG 0 en la fecha con captura. No son una captura de la sesión autenticada del dashboard.

## Ajuste de guardado en curso

El primer producto quedó en `0d5cfd0df2d2e15faf41540fd7403d8341076482`. Este ajuste queda en `3c3557abcdda63fd641b05ab85c3f03b113327b5`.

Hallazgo: las flechas y Cancelar seguían activos durante `gastoSaving`, y los handlers no rechazaban esa interacción. Al resolverse el guardado, el modal se cerraba siempre y el error podía publicarse fuera de la sesión que lo originó. El payload ya usaba el periodo capturado al iniciar; el defecto estaba en los efectos tardíos sobre la interfaz y la caché. La comparación de caché usaba el forecast cerrado antes del `await`.

Corrección: un controlador síncrono bloquea el segundo envío antes del siguiente render. Mientras guarda, mes, Cancelar y Cerrar quedan deshabilitados y los handlers no avanzan. Se muestra «Guardando…». Después de la respuesta se exige la misma planta, año, mes, grupo e identificador de sesión. Una reapertura, aunque repita planta y mes, no recibe el cierre ni el error. La caché del dashboard se actualiza solo si el periodo actual, leído al llegar la respuesta, coincide. La distribución aplica la misma regla con planta, año, mes, concepto e identificador de apertura.

Excel sin cambios: M, AF, AG, N, R y el resto de hojas no se tocaron. El HG ausente de Acapulco sigue sin imputarse.

Pruebas de comportamiento en `test/impl-igf-gastos-save-inflight-083.test.js`: 7/7, con peticiones diferidas. 083 y 082, más las regresiones de gastos 062, desglose 064 y distribución 064-R1: 67/67 en la corrida conjunta. `tsc --noEmit` exit 0. `npm run build` exit 0. `git diff --check` limpio. Los dos fallos de 024 siguen siendo los ya documentados en BASE y HEAD; esta corrección no tocó `server.js` ni desactivó pruebas.

