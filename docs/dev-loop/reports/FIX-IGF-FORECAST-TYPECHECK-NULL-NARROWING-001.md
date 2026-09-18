# FIX-IGF-FORECAST-TYPECHECK-NULL-NARROWING-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-FORECAST-TYPECHECK-NULL-NARROWING-001 |
| base SHA | dad5b3e43d212f230822de0898bce0318fa33b88 |
| branch | fix/igf-forecast-typecheck-null-narrowing-001 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |
| resultado | STOPPED — error original eliminado; `next build` falló en un segundo type error no autorizado |

## Error original

```
./components/IgfForecastClient.tsx:737:15
Type error: 'igfForecast' is possibly 'null'.
        year: igfForecast.year,
```

Fase: typecheck, después de webpack.

## Root cause (sistema de tipos)

`canOpenPronosticoMiniRow` es un helper JS (`igf-open-pronostico.js`). TypeScript no lo trata como type predicate. Tras `if (!canOpenPronosticoMiniRow(row, token, igfForecast)) return`, `igfForecast` y `token` siguen siendo `T | null`.

## Fix aplicado (mínimo)

En `openPronosticoMiniRow`:

```
const forecast = igfForecast;
const authToken = token;
if (!forecast || !authToken) return;
if (!canOpenPronosticoMiniRow(row, authToken, forecast)) return;
```

Payload usa `forecast.year`, `forecast.month`, `authToken`. Sin `!`. Semántica igual: token/forecast nulos no abren; `canOpenPronosticoMiniRow` sigue validando la fila.

## Files changed (autorizados)

- `frontend-dashboard/components/IgfForecastClient.tsx` (solo `openPronosticoMiniRow`)
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

No se tocó: `next.config.js`, `package.json`, exceljs, Node, auth, backend, DB, routing.

## npm ci

OK. 486 packages. Audit no ejecutado.

## npm run build

| Fase | Resultado |
|---|---|
| webpack | Compiled successfully |
| lint | skipped |
| typecheck error original :737 | **eliminado** |
| typecheck siguiente | **FAIL** (otro error) |
| next build OK | no |
| prepare-standalone | **no alcanzado** |

## Segundo error (no parcheado)

```
./components/IgfForecastClient.tsx:988:61
Type error: Parameter 'r' implicitly has an 'any' type.
{Array.from(new Set(forecastRows.map((r) => r.empresa?.trim()).filter(Boolean)))
```

`forecastRowsForRender` viene de JS sin tipos; `forecastRows` queda `any[]` y el callback `r` es implicit any bajo `noImplicitAny`.

Este error estaba oculto detrás del de :737. **STOP.** No se encadenó un segundo fix.

## Tests

`node --test test/igf-open-pronostico.test.js` — 14/14.

Semántica OPEN_PRONOSTICO no cambiada (espera, una ejecución, plantHint, query/token).

## Limitaciones

- Build completo no pasó.
- prepare-standalone no se ejecutó.
- El segundo type error requiere tarea humana nueva.

## Cierre

CURRENT_TASK → STOPPED.

NO PR. NO merge. NO deploy. NO siguiente tarea.
