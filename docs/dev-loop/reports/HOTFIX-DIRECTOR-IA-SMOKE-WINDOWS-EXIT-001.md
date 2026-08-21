# Reporte — HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001

```yaml
task_id: "HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "scripts/smoke-director-ia-operational.js"
  - "test/director-ia-operational-hardening.test.js"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001.md"
files_not_touched:
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "package.json"
  - "package-lock.json"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
  - "docs/director-ia/"
  - ".env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `hotfix/director-ia-smoke-windows-exit-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T13:35:54-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Causa física

`scripts/smoke-director-ia-operational.js` llamaba `process.exit(0|1)` al terminar. En Node v24.14.0 / Windows eso interrumpía el cleanup de `fetch`/undici y abortaba con `UV_HANDLE_CLOSING`, **después** de imprimir readiness verde.

## Cambio

Se eliminó `process.exit(...)`. Éxito: `return` (terminación natural, exit 0). Fallo: `process.exitCode = 1` y `return`. Rechazo de `main()`: `process.exitCode = 1`. Sin sleeps. Validaciones intactas. Sin retry.

## Códigos de salida (conservados)

| Caso | Exit |
|---|---|
| Falta `DIRECTOR_IA_SMOKE_BASE_URL` | nonzero |
| Readiness fallida / inalcanzable | nonzero |
| Readiness-only 200, sin token/planta | 0 limpio |
| Smoke autenticado 401/403 o ciclo inalcanzable | nonzero |
| Smoke autenticado HTTP finito no-authz | 0 |

Readiness-only **no** POST `/api/director-ia/cycle`. Con token+planta **sí** POST una vez (no bypass).

## Reproducción local (readiness-only)

```
DIRECTOR_IA_SMOKE_BASE_URL=https://folio-whatsapp-bot.onrender.com
node scripts/smoke-director-ia-operational.js
```

Resultado observado:

```json
{"step":"readiness","status":200,"enabled":true,"ready":true}
```

`EXIT_CODE=0`. Sin `UV_HANDLE_CLOSING` en stdout/stderr.

El POST autenticado de producción sigue siendo validación aparte y exige token/planta locales. No se copiaron secretos.

## Tests

| Suite | Pass | Fail |
|---|---|---|
| `test/director-ia-operational-hardening.test.js` | 26 | 0 |
| **`test/director-ia-*.test.js`** | **377** | **0** |

(Baseline previo 372; +5 tests de códigos de salida.)

## git

- `git diff --check`: limpio (exit 0).
- `server.js`, `lib/`, `frontend-dashboard/`, `package.json` y lockfiles: **sin cambios**.

### Modificados

- `docs/dev-loop/CURRENT_TASK.md`
- `scripts/smoke-director-ia-operational.js`
- `test/director-ia-operational-hardening.test.js`

### Creados

- `docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001.md`

## STOP

Sin commit, push, merge ni siguiente tarea.
