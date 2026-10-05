# FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063

task_id: FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063

outcome: DONE

status: DONE_PENDING_REVIEW

base_sha: abf146ec62f7cfc791cd67eb2da523a46ed43743

branch: fix/igf-acumulado-default-perf-margen-063

sha: pendiente del commit de esta entrega

## Causa del 0.91

`finiteMetric` hacía `Number(value)`. En JavaScript `Number(null) === 0`, `Number("") === 0` y `Number("   ") === 0`. Esos ceros pasaban `Number.isFinite`.

`totalMesMarginAndHg` solo omite un valor cuando `finiteMetric` devuelve `null`. Un margen vacío llegaba como 0, con venta numérica, y ampliaba el denominador. El mismo mecanismo diluía Y/HG.

Excel TOTAL MES pondera H y Y con `ISNUMBER(métrica)` e `ISNUMBER(B)`. Una celda vacía no suma numerador ni denominador. Un 0 numérico sí entra. La fórmula está en `weighted` / `weightedRows` de `lib/igf-diario-puebla.js`.

El fixture de prueba usa 3 días con margen 8.2 y 24 días con venta y margen `null`. El cálculo corregido queda en 8.2. La semántica vieja `Number(null)` produce aproximadamente 0.911. El 8.2 vive solo en el test. No hay hardcode de San Luis ni de Morelos.

`return { margen, y, hg: y }` se mantiene. No hay `hg: -y` ni `Math.abs`.

## Endpoint

`GET /api/dashboard/igf-diario-acumulado`

Parámetros: `year`, `month`, `upload_day`, `version_as_of_corte`.

Respuesta: `plant_code`, `empresa`, `margen`, `hg`, más `corte_ymd` y `query_count`.

Auth: `dashboardAuthMiddleware`, `dashboardBlockGAFinancialKpis`, `dashboardBlockGVForbidden`. El alcance usa `overrideVisible` sobre `plantas_permitidas`. No se agregan roles.

Es read-only. No hay `INSERT`, `UPDATE` ni `DELETE`.

Reutiliza `materializePlantMonth` / `totalMesMarginAndHg` para Venta, Precio, COSTO, FLETE y HG. No calcula C&D, operativos, corporativos, comentarios, insights, clientes nuevos, panel semanal, `month_close` ni series de gráfica. La gráfica sigue en `GET /api/dashboard/igf-diario-grafica`.

`version_as_of_corte` se valida igual que en Forecast y forma parte de la clave de caché. H/Y no leen los gastos versionados del Forecast.

## Requests

Antes: el navegador hacía N llamadas, una `fetchIgfDiarioGrafica` por planta. Cada una reconstruía la gráfica: ventas y descuentos, índice C&D, Compras de la ventana, precio, payload de gastos del Forecast, clientes nuevos, semanas y cierre.

Después: 1 llamada `fetchIgfDiarioAcumulado` para todas las plantas visibles. Por planta el loader cuenta una consulta de ventas y, si hay precio, una más. Compras entra solo con `loadMonthReadOnly` del mes pedido cuando la planta tiene id. En el test con `plantaId` nulo, `query_count` es 2 y ninguna SQL toca `descuentos_diarios_cliente`. No hay tiempos en milisegundos.

La caché del cliente se invalida si cambian año, mes, corte o `version_as_of_corte`. Forecast no dispara esa carga. Volver a acumulado con la misma clave reutiliza la respuesta.

## Vista inicial

`igfTableMode` inicia en `igf_diario`. El botón Forecast sigue disponible y pinta `igfMini`.

## 062

`applyManualGastosToAcumulado` sigue después de Margen/HG. `0` manual sigue válido. `null` restaura el automático. M3/T3 no se modificaron.

## Pruebas

063 PASS (5, cubren los 20 casos pedidos).

059 PASS.

059-R1 PASS. El ancla del request pasó de `fetchIgfDiarioGrafica` a `fetchIgfDiarioAcumulado`; el resto del bloqueo de estado se conservó.

061 PASS.

062 PASS.

053A, 053A-R1, 053A-R2 y 054-R3 PASS.

56 pruebas PASS en el lote.

`frontend-dashboard` `npm run build` PASS.

`node --check server.js` PASS.

`git diff --check` limpio.

## Archivos

- `lib/igf-diario-puebla.js`
- `lib/igf-diario-grafica.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-acumulado-default-perf-margen-063.test.js`
- `test/igf-forecast-acumulado-hg-compras-tarifa-059-r1.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- este reporte

## Protocolo

No hay merge, deploy ni push a `main`.
