# FIX-IGF-FORECAST-HOOK-ORDER-OPEN-PRONOSTICO-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-FORECAST-HOOK-ORDER-OPEN-PRONOSTICO-001 |
| base SHA | 3fc1cf315726c8203d3fb82a60973f3921b957fd |
| branch | fix/igf-forecast-hook-order-open-pronostico-001 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Root cause (ya demostrada)

React #310: `Rendered more hooks than during the previous render.`

El `useEffect` de OPEN_PRONOSTICO estaba **después** de `if (unauthorized)` / `if (!token)`.

## Before / after hook order

**Antes:** hooks de auth/fetch → early returns → `useEffect(decideOpenPronosticoFromQuery)`.

**Después:** el mismo `useEffect` (lógica interna intacta) + `openPronosticoMiniRow` (no es hook) se declaran **antes** de cualquier `return` condicional.

Último hook: `useEffect` OPEN_PRONOSTICO. Luego `if (unauthorized)`.

No quedan `useState` / `useRef` / `useMemo` / `useEffect` bajo early returns.

## Files changed

- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-forecast-hook-order.test.js` (estructura de fuente; no hay RTL)
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

No se tocó `igf-open-pronostico.js`, auth, exceljs, Node, backend.

## Build

`npm ci` OK. `npm run build` OK.

webpack Compiled successfully. typecheck OK. prepare-standalone OK.

## Runtime

`npm run start` en `localhost:3000`.

| URL | React #310 | Resultado |
|---|---|---|
| `/igf-forecast` | no | Acceso no autorizado |
| `/igf-forecast?t=audit-not-a-jwt` | no | Shell IGF Forecast (API 500 por token inválido) |
| `/igf-forecast?t=audit-not-a-jwt&open_pronostico=1` | no | Shell IGF; modal no abre (sin datos). Esperado |

Ya no aparece `Application error` por hooks.

## Tests

`test/igf-open-pronostico.test.js` — 14/14.

`test/igf-forecast-hook-order.test.js` — el effect queda antes de `if (unauthorized)`. No hay infraestructura React para montar el componente.

## Regresiones

Semántica OPEN_PRONOSTICO (skip/wait/open, plantHint, single-open) sin cambio. Apertura manual y chat reutilizan la misma función.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

NO PR. NO merge. NO deploy. NO siguiente tarea.
