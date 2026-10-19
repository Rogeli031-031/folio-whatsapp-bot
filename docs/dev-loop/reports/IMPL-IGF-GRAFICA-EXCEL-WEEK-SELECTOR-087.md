# IMPL-IGF-GRAFICA-EXCEL-WEEK-SELECTOR-087

status: DONE_PENDING_REVIEW

base_sha: bc06a7cc2f2753f329ec6aba0ca2773cb92ae0b9
branch: implementation/igf-grafica-excel-week-selector-087
product_sha: 4cbfad297d929bf4196d4be66df0e6899a008fb1

## Qué cambió

El modal de la gráfica ofrece, a la izquierda de Descargar Excel, las semanas domingo–sábado que intersectan el mes. La opción usa el número real de semana, el rango y REAL, PARCIAL o PROYECTADA según el corte. La descarga sigue usando `excelDownloadHref` con el domingo elegido como `week_anchor`.

La carga de la gráfica, el rango y el ancla del panel no leen esa selección.

## Backend

`/api/arr/dashboard-excel` toma `week_anchor` si es una fecha y lo pasa a `loadWeeklyPlant` o `loadWeeklyAll`. El corte solo clasifica real y proyectado. `fillResumen` escribe `week.week_number`, el rango y los siete días de ese resumen. No se modificó el backend.

## Excel

Con corte `2026-10-19`, los libros generados por `fillResumen` muestran:

- semana 42, `11/10/2026–17/10/2026`, columnas Dom 11/10 a Sáb 17/10, venta del domingo 42000;
- semana 43, `18/10/2026–24/10/2026`, venta del domingo 43000;
- semana 44, `25/10/2026–31/10/2026`, venta del domingo 44000.

## Pruebas

087: 7/7. 067, 079, 080, 086 y las pruebas de gráfica 054, 055 y 056: 82/82. `npx tsc --noEmit` exit 0. `npm run build` exit 0.

069 sigue fallando en BASE y en HEAD por el botón «Gráfica» del panel TODAS. Ese archivo no cambió.

## Límites

No hay API nueva, cambio financiero, PR, merge, deploy ni escrituras a la base.

## Cierre humano para apertura de 088
CLOSED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19
