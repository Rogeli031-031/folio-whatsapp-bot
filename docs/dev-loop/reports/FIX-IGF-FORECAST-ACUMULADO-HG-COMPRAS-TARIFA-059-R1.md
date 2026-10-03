# FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1

status: DONE_PENDING_REVIEW

base_sha: 48863b0f29ec983396c64ffb09e3b52805572f36

branch: fix/igf-forecast-acumulado-hg-compras-tarifa-059-r1

## Alcance

Se conservan los botones Forecast / IGF Diario acumulado, el Margen = H TOTAL MES ponderado por B, el HG = −Y TOTAL MES ponderado por B, el recálculo de Ingreso, Utilidad y Resultado, y el fallback histórico de TARIFA consolidada del día 1.

Esta R1 corrige estado obsoleto y cobertura incompleta. `lib/igf-diario-grafica.js` queda en el alcance: la respuesta existente sigue llevando `acumulado` y los puntos públicos no incluyen margen ni HG diarios. No hay ruta nueva ni escritura.

## Estado obsoleto

Al entrar el efecto de IGF Diario acumulado, y antes de `fetchIgfDiarioGrafica`, se ejecutan `setAcumuladoByPlant(null)`, `setAcumuladoMissing([])`, `setAcumuladoError(null)` y `setAcumuladoLoading(true)`.

El efecto depende de `uploadDay`, `igfForecast` (año y mes), `versionAsOfCorte` e `igfMini`. Mientras `acumuladoLoading` es true, o hay error, la tabla no se renderiza. Si la carga falla, el mapa queda en null y se muestra el error. No se restaura el acumulado anterior.

Forecast sigue usando el mini original en cuanto el modo vuelve a `forecast`.

## Cobertura incompleta

`acumuladoHit` exige `Number.isFinite` en margen y en HG. `null`, `undefined`, `NaN` e `Infinity` cuentan como faltantes.

Si falta cualquiera, `missingAcumuladoPlants` nombra esas plantas, el modo queda incompleto y `applyIgfDiarioAcumuladoMini` del cliente devuelve `null` antes de armar Zona Provincia. La pantalla muestra «IGF Diario acumulado incompleto» con los nombres y no dibuja la tabla. No hay fila Forecast de reemplazo dentro de ese modo.

El helper de `lib/dashboard-arr-forecast.js` no se modificó. El 059 lo usa para el caso sin mapa de acumulado, y la pantalla no lo llama: la copia del cliente es la que cierra el modo.

## Pruebas

059-R1: PASS (5).

059: PASS.

052: PASS.

036, 037, orden de hooks, 054, 054-R1, 054-R2, 054-R3 y 055: PASS.

`frontend-dashboard` `npm run build`: PASS.

`git diff --check`: limpio.

No merge. No PR. No deploy.
