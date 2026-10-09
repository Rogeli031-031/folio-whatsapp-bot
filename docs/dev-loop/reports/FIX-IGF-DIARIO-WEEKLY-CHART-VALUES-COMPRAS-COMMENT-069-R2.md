# FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2

status: DONE_PENDING_REVIEW

base_sha: ac8625cc8f3b81bd345c54a291219f7bf7b8e9ff

product_sha: 5827f2c709cf847c029fee8e83b251c8ca293ce9

branch: fix/igf-diario-weekly-chart-values-compras-comment-069-r2

## Causa

La gráfica de RESUMEN dibujaba la serie sin el importe de cada día y sin una referencia en cero, así que una semana con ganancia y pérdida no se leía sin volver a la tabla. COMENTARIO DEL DIA no decía cómo se movió el costo consolidado de CONTROL DE COMPRAS.

## Fórmula de referencia

Día válido = costo consolidado `importe / kg` con kg > 0, importe conocido y costo > 0. Esa es la misma regla de `listValidConsolidatedDays`, extraída de `latestConsolidatedCostFromHistory`. El 0 no cuenta como compra válida. El null no se convierte en cero.

referencia = promedio aritmético de los últimos dos días anteriores válidos.

variación = costo del día − referencia, mostrada a 3 decimales.

Si solo hay un día previo: ese día es la referencia y el texto dice "respecto al último día con compra". Si no hay ninguno: se informa el costo del día y no se afirma incremento ni disminución.

La búsqueda es por fecha, no por el renglón anterior del Excel. Puede cruzar semana y mes usando `costos_previos_validos`, que sale de la consulta que CONTROL DE COMPRAS ya hace antes del mes.

## Fuente de proveedores

`grid.days[].cells[proveedor].kg > 0` y el nombre del proveedor de la hoja. No se usa la tarifa. Un proveedor con kg vacío o 0 no se menciona. Varios se enumeran en el orden de la hoja: `Compras: A — X kg; B — Y kg`.

## Ejemplo Puebla 07/10

05/10 = 12.465, 06/10 = 12.465, 07/10 = 12.918.

referencia = 12.465. variación = +0.453.

`COMPRAS: Incrementó el costo de compra +0.453 $/kg, de una referencia promedio de 12.465 $/kg en los 2 días anteriores a 12.918 $/kg hoy. Compra: TOMZA TEPEJI — 20,220 kg.`

Después continúa el comentario de Venta/clientes.

## Rich text

Solo `+0.453 $/kg` va en rojo `FFDC2626`. Una disminución colorea solo el delta en verde `FF15803D`. Sin cambio usa `FF334155`. El resto de la celda AI no cambia de color. El wrap y la fila siguen usando el texto plano completo.

## Gráfica

Sigue consumiendo `days[].metrics[summary_metric]`. Cada punto no null muestra su valor: MXN redondeado solo en la etiqueta (`+$55,746`, `-$50,466`, `$0`), kilos enteros y $/kg a dos decimales. Positivo verde, negativo rojo, cero neutro. Línea horizontal `data-zero` en 0. Real continuo y proyectado punteado. Un null no se dibuja y no se trata como cero. PNG local con sharp, sin dependencia nueva.

## Pruebas

109/109, incluyendo 069-R2, 069-R1, 069, 068-R2, 068-R1, 068, 067, 066-R1, 066, 065-R1, 065, 064-R1, 064 y el comentario 053BC.

`node --check server.js` correcto. `npm run build` del frontend terminó con código 0. El enlace de standalone volvió a fallar con EPERM porque `node_modules` es una unión; `.next` no se conserva. `git diff --check` limpio.

## Archivos

- lib/igf-diario-compras-comment.js
- lib/igf-diario-weekly-excel.js
- lib/igf-diario-expense-excel.js
- lib/igf-diario-puebla.js
- lib/compras-dashboard.js
- server.js
- test/fix-igf-diario-weekly-chart-values-compras-comment-069-r2.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2.md

## SHA

Producto: 5827f2c709cf847c029fee8e83b251c8ca293ce9

Base: ac8625cc8f3b81bd345c54a291219f7bf7b8e9ff
