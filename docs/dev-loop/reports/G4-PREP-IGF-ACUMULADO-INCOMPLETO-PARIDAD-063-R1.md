# G4-PREP-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1

status: DONE_PENDING_REVIEW

## Referencias

| Campo | Valor |
| --- | --- |
| main SHA | `59e88276159b5da089c39e50e9b53da64b416577` |
| product SHA | `c399a44acb323affede41bb91acd2f34ac05d64c` |
| source SHA | `2ec8fcbe58002cd904d2b4635d26a80ec9ad2265` |
| rama | `fix/igf-acumulado-incompleto-paridad-063-r1` |
| ahead / behind | 2 / 0 al verificar, antes de este preparativo |
| PR | [#104](https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/104) |

`origin/main` seguía en `59e88276159b5da089c39e50e9b53da64b416577` después de `git fetch origin`. No hubo rebase ni merge. `git diff --check` quedó limpio. Este preparativo no cambia `lib`, frontend, server, tests, DB, fórmulas ni aliases.

## Causa Tehuacan

El mini avisaba `IGF Diario acumulado incompleto: Tehuacan` porque H y Y salían null. `loadSalesRows` filtraba `pm.prov_name` con el nombre preferido acentuado `Tehuacán`. El Excel agrega los kilos bajo el `prov_name` sin acento `Tehuacan`. `plantsEquivalent` une nombre, canon, `provinciaPlantCode` y clave; la igualdad exacta no. Sin venta, Margen y HG quedaban null.

La venta del acumulado ahora carga el mes una vez y asigna cada planta con `plantsEquivalent`. Es la misma identidad que la columna B del Excel.

## Causa GTM Queretaro

`resolveArrClientesMesPlantCode` puede devolver la clave más larga `GTM Queretaro`. `loadPrecioDiario` solo abría el par `Queretaro`/`Querétaro` o `Tehuacan`/`Tehuacán`. La clave `GTM Queretaro` no leía el precio guardado como `Querétaro`, así que C faltaba y el margen quedaba null aunque hubiera venta, costo, flete y HG.

Si la clave de precio es `GTM Queretaro` o `GTM Querétaro`, también lee `Queretaro` y `Querétaro`. El par exacto de 033 no cambia. Si el código pedido tiene precio válido, ese precio sigue ganando.

## plantsEquivalent para venta

La venta del acumulado ya no exige `pm.prov_name = nombre`. `salesRowsForPlant` acepta la fila cuando `plantsEquivalent` coincide con nombre, canon, `provinciaPlantCode` o clave. `Tehuacán` y `Tehuacan` cuentan como la misma planta. La consulta del mes es una sola para todas las plantas.

## Aliases de precio

`precioLookupCodes` arma la familia del código pedido: el código exacto, su alias de precio, la clave canónica de Forecast y el alias de esa clave. Con uno o dos códigos se conserva el SQL anterior. Con más de dos se lee `plant_code = ANY($1::text[])` y `mergePrecioCodeRows` deja ganar al código exacto si su precio es válido. Así `GTM Queretaro` alcanza `Queretaro` y `Querétaro`.

## missing y missing_components

La fila del endpoint incluye `canon`, `igf_label`, `missing` y `missing_components`. `missing` lleva `MARGEN` y/o `HG` cuando esa métrica es null. `missing_components` sale de los huecos posteriores al arrastre: `VENTA` si no hay un día con venta mayor que 0; si hay venta, `PRECIO`, `COSTO`, `FLETE` o `HG` cuando un día con venta no trae ese campo. El hueco solo se reporta si la métrica es null.

El mini indexa `plant_code`, `empresa`, `canon` e `igf_label`. El texto usa esos campos, por ejemplo `Puebla — falta MARGEN (PRECIO)`. No hay un texto fijo de Tehuacan. El aviso sigue empezando por `IGF Diario acumulado incompleto` y une las plantas con `; `.

## Una sola request HTTP

Sigue siendo un solo `GET /api/dashboard/igf-diario-acumulado`. Antes y después hay una request. No volvió `fetchIgfDiarioGrafica` ni un `Promise.all` por planta.

## Forecast sin fallback

Si una planta no tiene Margen y HG finitos, la mini no se arma. No se rellena con Forecast.

## 063 null vs 0

`finiteMetric` sigue tratando null, undefined, vacío, espacios, NaN e Infinity como null. El 0 y `"0"` siguen siendo 0. `totalMesMarginAndHg` pondera solo días con métrica y venta numéricas. El null no diluye. En el fixture de San Luis, tres días con margen 8.2 y venta 1000 más días con venta y margen null dan 8.20; la semántica vieja que contaba el null como cero daba aproximadamente 0.911.

## 061 signo HG

`hg` sigue siendo `y`. El signo negativo del HG se conserva. En los fixtures de Tehuacan, GTM Queretaro, San Luis y Morelos el HG del acumulado es negativo, igual que Y.

## 062 intacto

El gasto manual con valor distinto de null sigue ganando, y el 0 manual es un override válido. El Excel sigue pintando corporativos en M3 (columna 13, fila 3) y operativos en T3 (columna 20, fila 3). `writeTotal` sigue etiquetando `TOTAL MES` y arma H/Y con `weightedRows` sobre las filas de día.

## Limitación

No hubo `DATABASE_URL` en el entorno ni archivo dotenv en el worktree. No se consultó producción y no se validó el corte productivo. Los números de la tabla son del fixture de prueba del corte 2026-10-05, no conteos de días reales. La validación productiva queda después del deploy humano: Tehuacan y GTM Queretaro dejan de verse incompletos si su Excel ya tiene H/Y; San Luis y Morelos coinciden con H TOTAL MES; el HG de cada planta coincide con Y TOTAL MES; Zona Provincia se construye; Forecast queda intacto; sigue habiendo una sola request.

## Pruebas

- `test/igf-acumulado-incompleto-paridad-063-r1.test.js`: 6/6.
- 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y 033: 62/62.
- `frontend npm run build`: PASS.
- `node --check server.js`: PASS.
- `git diff --check`: limpio en el árbol de producto, antes de este reporte.

## Pull request

- Número: 104
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/104
- Base: `main`
- Head: `fix/igf-acumulado-incompleto-paridad-063-r1`
- Título: FIX 063-R1: paridad de identidades en IGF Diario acumulado
- Estado al abrirlo: open, mergeable true, mergeable_state clean, head `2ec8fcbe58002cd904d2b4635d26a80ec9ad2265`

NO MERGE. NO DEPLOY. El merge queda reservado al HUMAN_APPROVER.
