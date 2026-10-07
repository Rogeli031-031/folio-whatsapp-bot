# IMPL-IGF-DIARIO-WEEKLY-PLANT-VIEW-067

Producto: `d04c01ebdcb3779da1eccfb4b5642568c392e509`
Base: `d58216dd128c459df6ac9aff4a05a75f9505d8a6`
Rama: `implementation/igf-diario-weekly-plant-view-067`

## Render

Con planta seleccionada y modo IGF Diario acumulado, la tabla superior permanece y debajo aparece `IGF Diario semanal · {planta}`. La comparación contra el mes anterior no se pinta y tampoco se pide. En modo Forecast, con planta, esa comparación sigue. Con Planta = Todas no aparece ninguno de los dos paneles.

## Semana ISO

La semana va de lunes a domingo y usa el número ISO del año. La semana del 28/09/2026 al 04/10/2026 es la 40 y no se corta el 01/10. El corte 06/10/2026 abre la semana del 05/10/2026 al 11/10/2026. Anterior y siguiente mueven exactamente 7 días, sin cambiar planta ni corte. Al cambiar planta, mes o corte se vuelve a la semana del corte. La navegación se detiene en la semana que ya no intersecta el mes.

## Tabla

La tabla es vertical: concepto a la izquierda y valor de la semana a la derecha. El estado es REAL, PARCIAL o PROYECTADA según el corte. Si falta un componente se muestra INCOMPLETA y el valor queda en —, no en cero. Cero explícito sí cuenta.

## Semántica

Venta es la suma de B. Ingreso es la suma de D. Precio es ingreso / venta. Costo y flete se ponderan por venta. Margen es precio − costo − flete. J, K, L, Q, R, S y T son el importe diario de 064-R1 dividido entre la venta de la semana. O, W, AB y AF siguen la cadena del Excel. HG importe es la suma de Y. C&D conserva el signo. El resultado en pesos es la suma del resultado diario con precisión completa, y coincide con resultado por kilo × venta.

## Gastos, margen e histórico

Los siete conceptos salen de `buildExpenseDailySchedule`, con el monto mensual y los overrides diarios, construidos en memoria. Un override de 064-R1 cambia el importe de esa semana. Precio, costo y flete efectivos pasan por 065-R1, incluidos los rangos que ya aplican en el día. En una semana que cruza septiembre, J/K/L/Q/R/S/T no se inventan. Venta, precio, ingreso, costo, flete, margen, HG, C&D y el resultado diario que sí tenga evidencia se conservan.

## Gráfica

Cada renglón se selecciona. El inicial es RESULTADO (Importe). Gráfica abre esa métrica en el modal existente, con título `Gráfica · {métrica}` y las ventanas 1D, 5D, 1M, 3M, YTD, 1A, 5A y Todo. Siguen real, proyectado, tendencia, hover y cobertura. Si la métrica no existía, el punto queda vacío.

## Performance

No hay consulta por concepto ni por día. Por cada mes que toca la semana hay una carga de ventas, C&D, compras, precio y overrides de margen. Desde octubre se añade una lectura del desglose y una de la distribución. Los siete schedules se arman en memoria. La respuesta incluye `query_count`. La gráfica pide una serie por cambio de rango. La vista Todas no usa este endpoint.

## Pruebas

`test/igf-diario-weekly-plant-view-067.test.js`: 6/6. Regresión 066-R1, 066, 065-R1, 065, 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, gráficas 054 a 055 y Excel 036-044: 170/170 junto con 067. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` sin errores de contenido.

## Archivos

- `lib/igf-diario-weekly-plant.js`
- `lib/igf-diario-grafica.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx`
- `frontend-dashboard/components/IgfDiarioGraficaModal.tsx`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-weekly-plant-view-067.test.js`
