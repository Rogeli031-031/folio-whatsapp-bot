# FIX-IGF-FORECAST-TYPECHECK-FORECAST-ROWS-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-FORECAST-TYPECHECK-FORECAST-ROWS-001 |
| reference_branch | fix/igf-forecast-typecheck-null-narrowing-001 |
| reference_commit | 143b59cb1837fa8e46c63dd1cfc1c936f579a3d0 |
| branch | fix/igf-forecast-typecheck-forecast-rows-001 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |
| resultado | DONE_PENDING_REVIEW — `next build` completo OK |

## Error original

```
./components/IgfForecastClient.tsx:988:61
Type error: Parameter 'r' implicitly has an 'any' type.
forecastRows.map((r) => r.empresa?.trim())
```

## Root cause

`forecastRowsForRender` vive en `igf-open-pronostico.js`. TypeScript trata el retorno como `any`. `const forecastRows = forecastRowsForRender(...)` deja `forecastRows` como `any`, y el callback `r` queda implicit any.

## Typing aplicado

Colección anotada, sin convertir el helper a TS y sin `any`/`as any`:

```
const forecastRows: IgfForecastRow[] = forecastRowsForRender(igfForecast);
```

`IgfForecastRow` ya se importaba de `@/lib/api`. Semántica de `forecastRowsForRender` sin cambios.

## Files changed

- `frontend-dashboard/components/IgfForecastClient.tsx` (una anotación)
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

No se tocó el helper JS, `next.config.js`, `package.json`, exceljs, Node, auth, backend, OPEN_PRONOSTICO.

## Build

| Fase | Resultado |
|---|---|
| npm ci | OK (486 packages). Audit no ejecutado |
| webpack | Compiled successfully |
| typecheck 988 | eliminado |
| otro type error | no |
| next build | OK |
| prepare-standalone | OK — Copiados `.next/static` y `public` → `.next/standalone` |
| rutas | `/igf-forecast` 23.9 kB generado |

Siguiente error: ninguno.

## Tests

`node --test test/igf-open-pronostico.test.js` — 14/14.

## Regresiones

Sin cambio de comportamiento: filtrado, OPEN_PRONOSTICO, token, plantHint, modal.

## Limitaciones

El helper JS sigue sin JSDoc. El otro uso `forecastRowsForRender(igfMesAnterior)` no disparó typecheck en este build.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

NO PR. NO merge. NO deploy. NO siguiente tarea.
