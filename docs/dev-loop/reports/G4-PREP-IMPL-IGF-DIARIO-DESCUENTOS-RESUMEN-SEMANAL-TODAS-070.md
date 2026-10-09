# G4-PREP-IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070

status: DONE_PENDING_REVIEW

## Base

origin/main: 9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd

merge-base: 9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd

ahead/behind: 2 / 0

product SHA: daa3123b663cdb6de04fb5518b0966dcc46e3022

implementation final SHA: 6bc33faa19100d6c4d68866cbfa90a6ecab93430

El producto es ancestro del HEAD. main es ancestro del HEAD. main no se movió.

## Commits incluidos

1. daa3123b663cdb6de04fb5518b0966dcc46e3022 — IMPL 070: columna DESCUENTOS y resumen semanal de Todas
2. 6bc33faa19100d6c4d68866cbfa90a6ecab93430 — docs: anota el SHA de IMPL 070

## Archivos funcionales

- lib/igf-diario-descuentos-columna.js
- lib/igf-diario-puebla.js
- lib/igf-diario-expense-excel.js
- lib/igf-diario-weekly-plant.js
- lib/dashboard-arr-forecast.js
- server.js
- frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx
- frontend-dashboard/lib/api.ts

## Archivos de tests

- test/impl-igf-diario-descuentos-resumen-semanal-todas-070.test.js
- test/igf-diario-comentario-ventas-053bc.test.js
- test/igf-diario-desglose-gastos-064.test.js
- test/igf-diario-puebla-042.test.js
- test/igf-diario-puebla-043.test.js

Los tests 042, 043, 053BC y 064 solo actualizan la letra del auxiliar desplazado. No relajan el arrastre.

## Archivos documentales

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md
- docs/dev-loop/reports/G4-PREP-IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md

## Auditoría product_sha..final_sha

El rango daa3123b..6bc33faa toca solo:

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md

No hay cambios en lib/, server.js, frontend-dashboard/ ni tests después del SHA producto.

## Fuente de DESCUENTOS

`SUM(arr.descuentos_diarios_cliente.monto) / SUM(arr.ventas_diarias_cliente.kg)` para el mismo cliente, la misma planta y la misma fecha. El cociente existe solo si kg > 0 y el monto es numérico. No se usa el C&D de planta ni la referencia de 14 días.

## Compra anterior

La compra real es la fecha con kg > 0. La anterior es la fecha previa más reciente del mismo cliente. La consulta no tiene fecha inicial y llega hasta el día elegible, así que cruza semana y mes. Sin compra anterior, sin monto o sin cambio a 3 decimales, el cliente no se lista.

## Rich text

JOSE ALBERTO LAYNES PEREZ: 5.185 → 4.907, delta −0.278. El texto dice "Bajó su comisión" y solo `-$0.278/kg` va en verde `FF15803D`. El alza usa "Subió su comisión" y solo el delta va en rojo `FFDC2626`. El nombre y el resto no llevan color.

## Mapa AH–AM

Septiembre: AH comentario, AI ventas, AJ costo oculto, AK DESCUENTOS, AL flete oculto.

Octubre: AI comentario, AJ ventas, AK DESCUENTOS, AL costo oculto, AM flete oculto.

## Auditoría de referencias AK/AL/AM

AK estaba ocupada. DESCUENTOS se insertó en la columna 37. El auxiliar de costo de octubre pasó de 37 a 38. El auxiliar de flete pasó de 38 a 39. En septiembre el flete pasó de 37 a 38. `markCarry` arma la fórmula con la dirección de la celda auxiliar, no con una letra fija. Las pruebas que antes exigían `AK28=1` ahora exigen `AL28=1`. No quedó una fórmula de producto apuntando a la columna vieja.

## Fórmula RESUMEN SEMANAL

`consolidateMetrics` alimenta la columna, cada día Dom–Sáb y la hoja RESUMEN. El orden visual es Concepto, RESUMEN SEMANAL, plantas.

## Conceptos SUM

Venta en Kilos, Ingreso Generado, HG y RESULTADO (Importe). Un null se omite y no se vuelve 0.

## Conceptos WEIGHTED

Precio, costo, flete, margen bruto, gasto corporativo, inversiones, impuestos federales, margen neto, presupuesto nómina/gastos, presupuesto IMSS/SUA, extraordinarios, provisiones, sobrante antes del HG, sobrante con el HG, comisiones y descuentos, y RESULTADO ($/kg).

La fórmula es `SUM(metrica_i * venta_i) / SUM(venta_i)` solo con venta numérica mayor que 0 y métrica numérica. 100,000 kg a 20 y 50,000 kg a 22 dan 20.666…, no 21.

## Null y cero

Una métrica null no entra al numerador ni al denominador de esa métrica. Venta 0 no entra al ponderado. Venta null tampoco.

## RESULTADO ($/kg)

Cuando cada planta incluida tiene `resultado_kg = resultado_mxn / venta`, el ponderado coincide con `SUM(RESULTADO Importe) / SUM(Venta kg)`. Si una planta tiene venta y resultado null, queda fuera del ponderado y su importe no se suma. Esa diferencia está documentada en el reporte de IMPL 070 y cubierta por la prueba. No hay una fórmula nueva.

## RESUMEN Excel Todas

La selección Todas escribe la hoja RESUMEN como TODAS CONSOLIDADO, primera hoja, sin reordenar las hojas IGF entre sí. La columna Semana consolida las métricas semanales. Dom–Sáb consolidan cada día. No se toma una planta arbitraria ni un promedio simple. La exportación individual sigue usando `igfWeeklySummary` solo cuando hay planta.

## Paridad tabla/gráfica

`fillResumen` pinta `summary.metrics` y `summary.days[].metrics` del mismo objeto que arma `loadWeeklyAll`. La gráfica lee esa misma serie de días. Se conservan etiquetas, verde positivo, rojo negativo, línea cero, real continuo, proyectado punteado, null como hueco y `summary_metric`.

## Pruebas

Evidencia ya validada en la implementación, sin volver a modificar tests:

- 123 pruebas PASS
- 070 PASS
- 053BC PASS
- 064–069-R2 PASS
- node --check server.js PASS
- frontend build PASS

`git diff --check origin/main...HEAD` limpio en esta preparación.

## Riesgos y hallazgos

Ningún hallazgo bloquea G4. El único caso en que RESULTADO ($/kg) no iguala importe/venta es el de una planta con venta y resultado null, y ya está documentado. El build del frontend repite el EPERM conocido al crear el enlace standalone sobre la unión de `node_modules`; el build cerró en 0.

## NO MERGE

Esta preparación no autoriza merge.

## NO DEPLOY

Esta preparación no autoriza deploy. Auto-merge queda deshabilitado. El merge, si procede, es Squash and merge y lo ejecuta solo el aprobador humano.
