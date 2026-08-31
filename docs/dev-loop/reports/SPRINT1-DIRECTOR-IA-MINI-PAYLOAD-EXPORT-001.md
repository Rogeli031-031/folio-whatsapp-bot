# SPRINT1-DIRECTOR-IA-MINI-PAYLOAD-EXPORT-001

task_id: SPRINT1-DIRECTOR-IA-MINI-PAYLOAD-EXPORT-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

## A. Cambio mínimo en la frontera Dashboard

Inyección read-only en `configureDirectorIaChat` (`server.js`):

`loadIgfForecastMiniPayload` → `buildIgfForecastPayload` + `return computeIgfForecastMiniPayload(...)`.

No se exportó el símbolo a un módulo nuevo. No se copió la función. El body de `computeIgfForecastMiniPayload` es idéntico a `origin/main`.

## B. Cálculo Dashboard no cambió

- `git diff origin/main -- server.js` solo añade el bloque de inyección (~26 líneas) en `configureDirectorIaChat`.
- Una sola definición: `async function computeIgfForecastMiniPayload`.
- Endpoint `GET /api/dashboard/igf-forecast-mini` sigue llamando la misma función.
- No hay ruta HTTP nueva.
- IGF tests (`test/igf-financial-final.test.js`) PASS.

## C. Ruta runtime Director IA

1. Forecast / util / resultado:
   `configureDirectorIaChat.loadIgfForecastMiniPayload`
   → `computeIgfForecastMiniPayload` (misma función del Dashboard)
   → `readIgfForecastMiniAuthoritative` (adaptador; lee `mini.rows[]`, no recalcula)
   → `forecastParity.mini` en CEL.

2. CASA / COMISIONISTA:
   `loadDashboardCasaComiMonth`
   → `dashboard-arr-forecast.computeClientesDescuentoMes`
   (misma fuente que `GET /arr-clientes-mes` / `toneladasCategoriaDesdeClientes`).

## D. Archivos modificados

- `server.js` (solo inyección en `configureDirectorIaChat`)
- `lib/director-ia-chat.js` (consume `chatDeps.loadIgfForecastMiniPayload`)
- `test/director-ia-mini-payload-export.test.js` (nuevo)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-MINI-PAYLOAD-EXPORT-001.md` (este reporte)

No tocados: body de `computeIgfForecastMiniPayload`, frontend, endpoints públicos, payload mini, SQL, `lib/dashboard-arr-forecast.js`, `docs/director-ia/`.

## E–H

E. Golden Set 16/16 (`test/director-ia-sprint1-core-conversational-recovery.test.js`)
F. suite Director IA 1177/1177 (`node --test test/director-ia-*.test.js`)
G. 1488.00 / -0.11 / 3169502 / 803537 / 839.36 / 648.64
H. DASHBOARD_BEHAVIOR_CHANGED = NO

## Contratos

Consultados: Constitución, contratos Director IA (índice), LOOP_PROTOCOL, CURRENT_TASK.
Modificados: ninguno (sin G2/G3).

## Desvíos

Ejecución sobre rama `main` (LOOP pide rama ≠ `main`). Sin commit / push / merge / deploy.

## next_task_proposed

Ninguna. Un DONE no autoriza la siguiente.

## secrets_check

OK. Sin secretos.

## human_decision_needed

Revisión G1→CLOSED o REJECTED. Sin G4 (push/merge).
