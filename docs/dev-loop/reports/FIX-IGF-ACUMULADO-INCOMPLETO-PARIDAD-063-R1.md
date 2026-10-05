# FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1

status: DONE_PENDING_REVIEW

base_sha: 59e88276159b5da089c39e50e9b53da64b416577

branch: fix/igf-acumulado-incompleto-paridad-063-r1

product_sha: c399a44acb323affede41bb91acd2f34ac05d64c

## Causa

El corte observado es 2026-10-05. El aviso `IGF Diario acumulado incompleto: Tehuacan, GTM Queretaro` sale porque el mini no encuentra Margen y HG finitos. No hubo `DATABASE_URL` en el entorno ni archivo dotenv en el worktree, así que no se contaron días productivos. La causa se demostró en el código y en un fixture que reproduce las dos identidades que el Excel ya trata como la misma planta.

1. Venta. `loadSalesRows` pedía `pm.prov_name = nombre`. El nombre preferido de Tehuacán lleva acento. La venta que el Excel agrega queda bajo el `prov_name` sin acento `Tehuacan`. `plantsEquivalent` las une; la igualdad exacta no. Sin kilos, H y Y salen null.
2. Precio. `loadPrecioDiario` solo abre el par `Queretaro`/`Querétaro` o `Tehuacan`/`Tehuacán`. `resolveArrClientesMesPlantCode` puede devolver el código más largo `GTM Queretaro`. Esa clave no leía el precio guardado como `Querétaro`, así que C falta y H queda null aunque B, F, G y X existan.

San Luis y Morelos no pasan por ese par de alias ni por un nombre acentuado distinto del `prov_name`, por eso no aparecían en el aviso.

## Corrección

- El acumulado carga la venta del mes una vez y la asigna con `plantsEquivalent` sobre nombre, canon, `provinciaPlantCode` y clave. Es la misma identidad que el Excel usa para la columna B.
- Si la clave de precio es `GTM Queretaro` o `GTM Querétaro`, también lee `Queretaro` y `Querétaro`. El par exacto de 033 no cambia. Si el código pedido tiene precio válido, sigue ganando.
- La respuesta incluye `canon`, `igf_label`, `missing` y `missing_components`. El mini indexa esas claves. `Tehuacán` llega a `Tehuacan` y `Querétaro` a `GTM Queretaro`.
- Si Margen o HG siguen null, el texto usa esos campos. Ejemplo de un caso realmente incompleto: `Puebla — falta MARGEN (PRECIO)`.
- Sigue habiendo una sola request `GET /api/dashboard/igf-diario-acumulado`. No se volvió a pedir la gráfica por planta. Si falta el acumulado, no se mezcla Forecast.

## Por qué coincide con Excel

H y Y siguen siendo la ponderación de `totalMesMarginAndHg`: suma(métrica × B) / suma(B) solo en días con ambos numéricos. `writeTotal` escribe la etiqueta `TOTAL MES` y arma H/Y con `weightedRows` sobre las filas de día, no sobre una fila fija. El cero numérico entra. El null no entra. El signo de HG es el de Y.

## Evidencia del fixture

Mismo corte de prueba 2026-10-05, un día con venta 1000 kg, costo 13 y flete 2 salvo Morelos. No son conteos de producción.

| Planta | B Venta | C Precio | F Costo | G Flete | X HG | H Margen | Y HG | causa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tehuacan | bajo `Tehuacan`, no bajo el nombre `Tehuacán` | par `Tehuacán` | 13 | 2 | numérico y negativo | 5 | negativo | la venta no coincidía con el nombre acentuado |
| GTM Queretaro | bajo `Querétaro` | solo en `Querétaro`; la clave pedida era `GTM Queretaro` | 13 | 2 | numérico y negativo | 3 | negativo | el precio no incluía el alias GTM |
| San Luis | 1000 kg en los días con margen | 23.2 | 13 | 2 | negativo | 8.20 | negativo | el null no diluye; la semántica vieja da ~0.91 |
| Morelos | 1000 kg | 10 | 4 | 1 | negativo | 5 | negativo | misma ponderación, sin valor fijo de producción |

Un caso incompleto de verdad, Puebla sin precio: `margen null`, `hg` negativo, `missing: ["MARGEN"]`, `missing_components.margen: ["PRECIO"]`, `hg: []`.

## Requests

| | HTTP |
| --- | --- |
| antes | 1 `GET /api/dashboard/igf-diario-acumulado` |
| después | 1 `GET /api/dashboard/igf-diario-acumulado` |

Por dentro, la venta del mes se consulta una vez para todas las plantas. No regresó `fetchIgfDiarioGrafica` ni `Promise.all` de requests por planta.

## Pruebas

- `test/igf-acumulado-incompleto-paridad-063-r1.test.js`: 6/6.
- 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y 033: 62/62.
- 054-R3 sigue registrando `arr.compras_hg does not exist` en un caso y pasa.
- `frontend npm run build`: PASS.
- `node --check server.js`: PASS.
- `git diff --check`: limpio.

## Intactos

- Forecast no se usa como fallback. Si falta el acumulado, la mini no se arma.
- 062: `manual != null`. El 0 manual se conserva. M3 sigue en la columna 13 fila 3 y T3 en la columna 20 fila 3.
- 061: `hg === y` y el signo negativo se conserva.
- 063: null no entra; 0 sí. El 8.20 vive en el fixture.
- Permisos del endpoint y ausencia de INSERT/UPDATE/DELETE en la ruta.

## Archivos

- `lib/igf-diario-grafica.js`
- `lib/dashboard-arr-forecast.js`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `frontend-dashboard/lib/api.ts`
- `test/igf-acumulado-incompleto-paridad-063-r1.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1.md`
