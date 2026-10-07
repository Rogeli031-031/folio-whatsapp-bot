# FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1

status: DONE_PENDING_REVIEW

base_sha: f50e61356325b13be289beb4e6354b52634f5eee

product_sha: be14171adbe9fd1d55b59a5dee22eea3d1c616c5

branch: fix/igf-diario-weekly-coverage-resumen-5d-069-r1

## 1. Causa San Luis

`sumOf` devolvía null en cuanto un día traía null. `weighted` devolvía null si cualquier día no tenía venta. El domingo 04/10 con `ventaKg` null anulaba Venta, Precio, Costo, Flete, Margen, Ingreso y Resultado de toda la semana 41. Por eso Semana y la columna San Luis en Todas salían en —.

## 2. Venta del fixture

Días: 04 null, 05 16,585, 06 19,286, 07 24,210, 08 30,260, 09 22,960, 10 29,730.

Venta semanal = 143,031 kg. El domingo sigue null en la fila diaria. No se convierte en 0.

## 3. Semántica null / día sin venta

Día de venta positiva = `ventaKg` numérico mayor que 0. El 0 explícito entra en la suma de venta y no pondera. Los null se ignoran en la suma. Si no hay ningún valor numérico, la venta semanal queda null.

## 4. Cobertura de venta positiva

Precio, costo, flete, margen y comisiones se ponderan solo con días de venta positiva. Si uno de esos días no trae la métrica, la métrica semanal queda null. Un día sin venta que no trae la métrica no invalida el ponderado. El ingreso suma solo días con venta positiva; si uno de ellos no tiene precio, el ingreso semanal queda null. Un componente de gasto null en un día con venta positiva invalida ese componente. En un día sin venta se omite. Si cualquier día de la semana tiene `expenses == null`, los componentes J/K/L/Q/R/S/T siguen null.

## 5. Resultado Importe y Resultado $/kg

HG importe suma los importes numéricos de los siete días e ignora null. HG $/kg solo se divide entre la venta positiva. Resultado Importe suma los resultados calculables de los días con venta positiva. Un día sin venta no invalida la semana. Un día con venta positiva y resultado incompleto sí la deja null. Si existen Resultado Importe y venta semanal mayor que 0:

Resultado $/kg = Resultado Importe / Venta semanal

con precisión completa. El test comprueba que la diferencia de la identidad es menor que 1e-6.

## 6. Métricas diarias de un día sin venta

La fila diaria sale de `dayMetrics`, no de `aggregateWeek([day])`. Un día sin venta conserva precio, costo, flete y margen bruto si esas fuentes existen. El ingreso queda vacío. No hay división entre cero. Los componentes por kilo que dependen de la venta quedan vacíos. El HG importe absoluto se muestra si existe.

## 7. Causa del 5D en fin de mes

`loadWeeklySeries` tomaba `end = monthEnd(year, month)` y luego `rangeWindow(end, "5d")`. En octubre eso producía 27/10–31/10.

## 8. Ventana 5D nueva

Para `view=series` y `range=5d`, la ventana es el domingo de la semana seleccionada más cuatro días. Semana 04/10–10/10 → 04/10, 05/10, 06/10, 07/10, 08/10. Semana 27/09–03/10 → 27/09–01/10. Puede cruzar mes. 1M, 3M, YTD, 1A, 5A y Todo siguen usando el fin de mes.

## 9. Propagación de week_anchor

`IgfDiarioWeeklyPlantPanel` pasa `weekAnchor={anchor}` a `IgfDiarioGraficaModal`. El fetch de series envía `week_anchor`. El backend lo usa en `fiveDayWindow`. Si no viene, el fallback es `uploadDay`. Semana anterior y luego Gráfica conserva esa semana.

## 10. Hoja RESUMEN

Título: `IGF DIARIO SEMANAL · {PLANTA}`. Subtítulo: `SEMANA {N} · dd/mm/yyyy–dd/mm/yyyy`. Columnas: Concepto, Semana, Dom … Sáb. Los mismos conceptos y bloques de 069. Los números salen de `loadWeeklyPlant`, sin recalcular desde valores redondeados. Venta `#,##0`. $/kg `0.00`. MXN `#,##0.00`. Null se escribe como —.

## 11. Orden de hojas

En export individual, `wb.addWorksheet("RESUMEN")` ocurre antes de `reserveSheet` solo si existe `igfWeeklySummary`. Después queda IGF Diario {planta} y el resto de las hojas actuales. `orderIgfSheetsFirst` de Todas no se toca.

## 12. Gráfica PNG

`lib/igf-diario-weekly-excel.js` dibuja un SVG con los siete días, real en azul y proyectado en ámbar punteado. Un null abre un hueco y no se dibuja como cero. `sharp` convierte el SVG a PNG. `wb.addImage` lo coloca en RESUMEN. No hay dependencia nueva ni servicio externo.

## 13. summary_metric

El modal agrega `week_anchor` y `summary_metric` al URL de Excel con `URL` y `URLSearchParams`. Default `resultado_mxn`. Una métrica inválida vuelve a `resultado_mxn`. `week_anchor` inválido o ausente vuelve a `upload_day`.

## 14. query_count adicional

`GET /api/arr/dashboard-excel`, solo con planta individual y ancla válida, llama una vez a `loadWeeklyPlant` y guarda `forecastOpts.igfWeeklyQueryCount`. Ese contador es el `query_count` del bundle: las consultas de `loadMonthBundle` por cada mes que toca la semana. `loadPrecio` queda fuera. La proyección se construye una vez en la ruta y se reutiliza; el generador no la vuelve a pedir. No es por día, por concepto ni por celda. El cuerpo de la respuesta sigue siendo el xlsx.

## 15. Pruebas

93/93:

- test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js
- test/igf-diario-weekly-sunsat-multiplant-069.test.js
- test/fix-igf-diario-folio-drawer-role-guard-068-r2.test.js
- test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js
- test/igf-diario-folios-deposito-matrix-068.test.js
- test/igf-diario-weekly-plant-view-067.test.js
- test/arr-igf-diario-result-parity-066-r1.test.js
- test/arr-igf-diario-financial-sources-066.test.js
- test/igf-margen-vertical-precio-rangos-065-r1.test.js
- test/igf-diario-margen-diario-editable-065.test.js
- test/igf-diario-rebalanceo-diario-gastos-064-r1.test.js
- test/igf-diario-desglose-gastos-064.test.js

`node --check server.js` correcto. `npm run build` del frontend terminó con código 0. El enlace de standalone volvió a fallar con EPERM porque `node_modules` es una unión; `.next` no se conserva. `git diff --check` limpio.

067: un día con venta 0 ya no fabrica Resultado Importe, y Resultado $/kg se afirma por la identidad importe/venta. 069: la fila diaria usa `dayMetrics` y el precio del día.

## 16. Archivos

- lib/igf-diario-weekly-plant.js
- lib/igf-diario-weekly-excel.js
- lib/dashboard-arr-forecast.js
- server.js
- frontend-dashboard/components/IgfDiarioGraficaModal.tsx
- frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx
- test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js
- test/igf-diario-weekly-plant-view-067.test.js
- test/igf-diario-weekly-sunsat-multiplant-069.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md

## 17. SHA

Producto: be14171adbe9fd1d55b59a5dee22eea3d1c616c5

Base: f50e61356325b13be289beb4e6354b52634f5eee
