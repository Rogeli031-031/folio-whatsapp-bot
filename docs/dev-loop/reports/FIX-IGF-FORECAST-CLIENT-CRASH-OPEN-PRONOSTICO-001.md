# FIX-IGF-FORECAST-CLIENT-CRASH-OPEN-PRONOSTICO-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-FORECAST-CLIENT-CRASH-OPEN-PRONOSTICO-001 |
| base SHA | 168c4f7fe3bb225258af26d3948c6b1609495f58 |
| branch | fix/igf-forecast-client-crash-open-pronostico-001 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Reproducción runtime

**NOT_REPRODUCED_NO_RUNTIME_ACCESS**

No hubo token válido, no se levantó el dashboard autenticado y no se capturó stack de consola. No se inventa archivo/línea de throw.

La pantalla negra reportada por el humano es el error genérico de Next.js («Application error: a client-side exception has occurred») en `/igf-forecast?t=…`. Sin consola no se demuestra si el throw fue `rows.map`, token, `open_pronostico` u otra ruta.

## Comparación histórica (002)

`IgfForecastClient.tsx` no cambió en 003. El diff `0c5d9adc` → `94280cf6` (task 002) añadió únicamente:

- `findPronosticoMiniRow` (fallback a `list[0]` aunque hubiera `plantHint`)
- `openedPronosticoFromQueryRef`
- `handleOpenPronosticoFromChat`
- `useEffect` de `open_pronostico=1`
- `onOpenPronostico` en el modal de chat

`DirectorIaChatPanel` reconstruía la URL con `t` + `open_pronostico` + `empresa` (conservaba token; descartaba otros params).

Main actual (`168c4f7f`) tenía esas mismas líneas.

## Traza OPEN_PRONOSTICO

1. Director IA → `extractOpenPronosticoSpec` / `ui_action.type = OPEN_PRONOSTICO` + `plant`
2. Chat → `DirectorIaChatPanel` callback o `buildOpenPronosticoHref`
3. `/igf-forecast?t=…&open_pronostico=1&empresa=…`
4. `decideOpenPronosticoFromQuery` espera token + forecast + `igfMini.rows` array no vacío
5. `findPronosticoMiniRow`
6. `openPronosticoMiniRow` / modal

Primer hop inseguro de 002 (estático, no stack):

- `findPronosticoMiniRow` con `plantHint` y sin match devolvía `list[0]`.
- `r.empresa` asumía filas no nulas.
- `igfForecast.rows.map/filter` en render no comprobaba `Array.isArray`.

## Root cause

**No demostrada en runtime.** Limitación: NOT_REPRODUCED_NO_RUNTIME_ACCESS.

Causa mínima corregida por auditoría estática del cambio 002 y de accesos de render que pueden tumbar la página:

1. Fallback silencioso a la primera fila cuando el usuario pidió planta explícita.
2. Apertura por query sin esperar token/periodo/mini, y sin consumir la query cuando la planta no existe.
3. `.map/.filter` sobre `igfForecast.rows` si el payload no trae arreglo.

Token: `parseTokenFromQuery` no lanza; no se tocó `auth.ts`. No hay evidencia de que el token causara el crash.

## Before / after

| Caso | Antes (002 en main) | Después |
|---|---|---|
| mini `undefined` / `[]` + `open_pronostico=1` | effect return; no crash demostrado | `wait`; no crash; no modal |
| `plantHint` sin match | abría `list[0]` | `consume_without_open`; no modal |
| sin `plantHint` | primera fila | primera fila |
| datos tardíos | esperaba `rows.length` | espera token+forecast+rows; abre una vez |
| rerender / refresh mini | ref ya abierta | `alreadyOpened` → skip |
| navegación chat | solo `t` + flags | copia query actual + `open_pronostico` + `empresa` |
| `igfForecast.rows` no array | `.map` podía tirar render | `forecastRowsForRender` → `[]` |

## Files changed

- `frontend-dashboard/lib/igf-open-pronostico.js` (nuevo)
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `test/igf-open-pronostico.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

## Tests

`node --test test/igf-open-pronostico.test.js` — 14/14.

Cubre: rows undefined/`[]`, match, no match, sin hint, query incompleta, datos tardíos, una apertura, no reapertura, token conservado, href, apertura manual inválida, `abre el pronóstico` vs `cuál es el pronóstico`.

Regresión 002 coverage: 10/10.

## Limitaciones

- Sin stack de producción no se afirma la primera línea que tiró la pantalla negra.
- No se ejecutó `/igf-forecast` autenticado en browser.
- El helper extraído es el contrato testeable del effect; no hay React Testing Library en el frontend.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.  
Push solo `fix/igf-forecast-client-crash-open-pronostico-001`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
