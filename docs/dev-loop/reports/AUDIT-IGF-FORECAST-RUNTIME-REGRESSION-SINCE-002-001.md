# AUDIT-IGF-FORECAST-RUNTIME-REGRESSION-SINCE-002-001

## Resultado

**ROOT_CAUSE_DEMONSTRATED**

La pantalla negra de `/igf-forecast?t=…` **sin** `open_pronostico=1` es React **#310**:

`Rendered more hooks than during the previous render.`

Causa: el `useEffect` de OPEN_PRONOSTICO introducido en **94280cf6** (task 002) se ejecuta **después** de los `return` de `unauthorized` / `!token`. El primer render no llama ese hook; el segundo (con token) sí.

No se implementó fix.

## Identidad

| Campo | Valor |
|---|---|
| task_id | AUDIT-IGF-FORECAST-RUNTIME-REGRESSION-SINCE-002-001 |
| known-good | 311638c2698552eedcf9fd5df0892fd3239ecb51 |
| before 002 | 0c5d9adc77cec2ea565ff21ee21cc9a4e997b9a8 |
| first relevant | 94280cf6 (merge 002 → b5a3e1c0) |
| origin/main auditado | 3fc1cf315726c8203d3fb82a60973f3921b957fd |
| branch | audit/igf-forecast-runtime-regression-since-002-001 |
| schema_changes | false |
| data_mutation | false |
| code_changes | false |
| merge | false |
| deploy | false |

## Known good

`git diff 311638c 0c5d9adc -- frontend-dashboard/components/IgfForecastClient.tsx` vacío.

En `0c5d9adc`, el último `useEffect` está **antes** de `if (unauthorized)` / `if (!token)`. No hay hooks después de esos returns.

## Primera excepción real (producción local)

Servidor: `frontend-dashboard` `npm ci && npm run build && npm run start` → `http://localhost:3000`.

| Caso | Resultado |
|---|---|
| `/igf-forecast` sin `t` | `Acceso no autorizado`. No crash. |
| `/igf-forecast?t=audit-not-a-jwt` (sin `open_pronostico`) | `Application error: a client-side exception has occurred` |

`t=audit-not-a-jwt` no es un JWT autorizado. Solo sirve para pasar `parseTokenFromQuery` (cualquier `t` no vacío) y entrar al path con token. **NOT_REPRODUCED_NO_AUTH_TOKEN** para datos IGF reales; el crash de hooks **sí** se reprodujo.

### Mensaje exacto (primera `console.error`)

```
Error: Minified React error #310; visit https://react.dev/errors/310 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

Texto completo de React #310: **`Rendered more hooks than during the previous render.`**

Fuente: https://es.react.dev/errors/310

### Stack (primera excepción)

```
at rF (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:41399)
at r2 (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:45997)
at Object.r4 [as useEffect] (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:46222)
at t.useEffect (http://localhost:3000/_next/static/chunks/117-98a343301f53a1de.js:2:31420)
at y (http://localhost:3000/_next/static/chunks/app/igf-forecast/page-edcb4e91d6116394.js:1:42160)
at rE (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:40341)
at l$ (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:59316)
at iZ (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:117923)
at ia (http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:95162)
at http://localhost:3000/_next/static/chunks/fd9d1056-c0bdeef3d4ad7b57.js:1:94984
```

| Campo | Valor |
|---|---|
| archivo/chunk | `app/igf-forecast/page-edcb4e91d6116394.js` (componente) + React `fd9d1056-c0bdeef3d4ad7b57.js` |
| consola location | `117-98a343301f53a1de.js` line 0, column 4043 (`t.useEffect`) |
| línea de llamada | `page-edcb4e91d6116394.js:1:42160` |
| función implicada | `useEffect` (React) llamado desde `y` = `IgfForecastContent` minificado |
| segundo console.error | `favicon.ico` 404 — irrelevante |

No hubo `pageerror` Playwright aparte; React/Next reporta el throw vía `console.error` y luego la página genérica.

## Relación con 0c5d9adc → 94280cf6

Diff 002 en `IgfForecastClient.tsx` (+38):

1. Helper inline `findPronosticoMiniRow` (no es hook).
2. `openedPronosticoFromQueryRef` — `useRef` **antes** de los early returns (seguro).
3. **`useEffect` OPEN_PRONOSTICO insertado después de `openPronosticoMiniRow`, es decir después de `if (unauthorized)` / `if (!token)`.**
4. `onOpenPronostico` en el modal (solo si el chat está abierto).

`DirectorIaChatPanel` / `api.ts`: no corren en el montaje normal de `/igf-forecast?t=`.

Secuencia que tumba la página **sin** `open_pronostico=1`:

1. Primer render: `token === null` → `return` “Cargando…”. El `useEffect` de 002 **no** se llama.
2. Effect de auth (`parseTokenFromQuery`) asigna token.
3. Segundo render: pasa los early returns → ejecuta el `useEffect` de 002.
4. React #310.

El cuerpo del effect hace `skip` si no hay `open_pronostico=1`. **El crash es llamar `useEffect` en un render y no en el anterior**, no abrir el modal.

## Path normal vs OPEN_PRONOSTICO

| Path | Qué corre sin `open_pronostico` | ¿Puede tirar #310? |
|---|---|---|
| imports | `igf-open-pronostico` (post-002 FIX) | no demostrado |
| state / effects de auth, fetch | sí | no |
| early return `!token` / unauthorized | sí | evita el hook extra |
| `useEffect` OPEN_PRONOSTICO | **sí, en todo render con token** | **sí** |
| `forecastRowsForRender` | solo tras pasar token | no se alcanzó; el #310 ocurre antes |
| modal Pronóstico | no | no |

## CommonJS / ESM (`igf-open-pronostico.js`)

Candidato **descartado** para este crash. El primer error es React #310 en `useEffect`, no `undefined is not a function`. El helper JS llega en 43f8f162, **después** de 002. 002 ya bastaba para romper `/igf-forecast?t=`.

## Clasificación de cambios

| Intervalo | Qué | Impacto |
|---|---|---|
| 0c5d9adc → 94280cf6 | `useEffect` después de early return | **normal-page-impact** — primera regresión |
| 94280cf6 → 43f8f162 | extrae helper JS + `forecastRowsForRender` en render autenticado | normal-page-impact latente (CJS); no es el throw capturado |
| 43f8f162 → 143b59cb | narrowing `forecast`/`authToken` | type-only / local |
| 143b59cb → ba43af82 / 3fc1cf31 | `forecastRows: IgfForecastRow[]` | type-only |

## Recomendación (NO implementada)

Mover el `useEffect` de OPEN_PRONOSTICO (y cualquier hook posterior) **arriba** de `if (unauthorized)` / `if (!token)`, junto al resto de hooks.

Condición `skip` puede quedarse **dentro** del effect.

No quitar OPEN_PRONOSTICO. No tocar exceljs/Node/auth/CJS en esa FIX.

## Limitaciones

- Source map del chunk `page-edcb4e91…` no se resolvió a número de línea TSX; la función minificada `y` + el diff 002 bastan.
- Sin JWT de producción no se probó fetch IGF real. El crash ocurre antes del fetch de filas.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

NO PR. NO merge. NO deploy. NO implementación.
