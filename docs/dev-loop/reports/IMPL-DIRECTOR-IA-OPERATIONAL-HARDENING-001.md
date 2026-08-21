# Reporte — IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001

```yaml
task_id: "IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001.md"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "lib/director-ia-real-input-arr.js"
  - "server.js"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.js"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"
  - "test/director-ia-dashboard-cycle-endpoint.test.js"
  - "test/director-ia-operational-hardening.test.js"
  - "scripts/smoke-director-ia-operational.js"
files_not_touched:
  - "docs/director-ia/"
  - "package.json"
  - "package-lock.json"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
  - ".env"
  - ".env.example"
  - "lib/director-ia-chat.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/director-ia-real-cycle.js"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001.md"
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

- Rama: `implementation/director-ia-operational-hardening-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T12:50:19-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3/G8: `N/A`. No se modificó `docs/director-ia/`. No se usó calibración. No se añadieron dependencias.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Qué se implementó

### 1. Timeout ARR/source

Sobre el cliente PostgreSQL prestado al ciclo (`pool.connect()`), se aplica `SET statement_timeout TO <ms>` **antes** de `resolvePlant` y de la query ARR (`computePronosticoProyByPlant` usa ese mismo `client`). En `finally`: `RESET statement_timeout` y `client.release()`.

Default: `DIRECTOR_IA_ARR_STATEMENT_TIMEOUT_MS` = **55000**. Config inválida (NaN, ≤0) cae al default finito.

PostgreSQL `57014` / `query canceled` / `statement timeout` se rethrowa desde `adaptArr` como `ARR_TIMEOUT` **antes** de OP/EB/EKS/IES/RE/CP. Transporte: **HTTP 504**, `code: ARR_TIMEOUT`. Nunca `ACQUIRED_EMPTY`, `DATA_NOT_FOUND`, `venta_ton: 0` ni ausencia confirmada.

El throw legado `code: TIMEOUT` del fixture ARR sigue siendo envelope `TOOL_ERROR` → **502** (sin cambio epistémico).

### 2. Deadline HTTP del ciclo

`Promise.race` finito alrededor de `realCycle.run` y también alrededor de `resolvePlant + handle` en `handlePostDashboardCycle`. Default: `DIRECTOR_IA_CYCLE_TIMEOUT_MS` = **60000**. Sin retry. Mapeo: **HTTP 504**, `code: CYCLE_TIMEOUT`.

### 3. Abort / cancelación

Frontend: `AbortController` en `executeDirectorIaCycleRequest` (signal compuesto + timeout de fetch 65000 ms para que el 504 de servidor pueda ganar). Panel aborta en unmount e `invalidate()` para que una respuesta vieja no pise estado nuevo. Abort → `CLIENT_ABORT`, no conclusión de negocio, no retry.

Backend: cancelación **best-effort**. `SET statement_timeout` cancela SQL. Si el deadline HTTP gana, se intenta `pg_cancel_backend(pid)` desde otra conexión del pool cuando existe `processID`. Limitación: node-pg no aborta un `query` in-flight en el mismo cliente; `Promise.race` no detiene el perdedor JS. Disconnect del cliente HTTP no muta epistemología.

### 4. Logger productivo

`server.js` inyecta `directorIaCycleStdoutLogger` → `console.log(JSON.stringify(payload))`. Eventos `cycle_request_started|completed|failed` con `trace_id` cuando existe y `duration_ms`. Sin JWT, raw ARR, `raw_payload_reference`, IES/RE completos, secretos ni stack. Fallo del logger no altera el resultado (`try/catch` en `emitLog`).

### 5. Readiness ligera

`GET /health-director-ia` (convención `/health`, `/health-db`). Comprueba flag `ENABLE_DIRECTOR_IA`, transporte configurado y `pool.connect`. **No** ejecuta grid ARR, OP, EB, EKS, IES, RE ni CP. **No** hace `SELECT 1` (evita colgar el probe).

| Estado | HTTP | Cuerpo |
|---|---|---|
| disabled | 200 | `{ ok: true, enabled: false, ready: false }` |
| enabled, falta pool/transporte | 503 | `{ ok: false, enabled: true, ready: false }` |
| operable mínimo | 200 | `{ ok: true, enabled: true, ready: true }` |

Sin credenciales ni internos de DB.

### 6. Smoke / post-deploy

`node scripts/smoke-director-ia-operational.js`

Env (no se versionan secretos):

- Obligatorio: `DIRECTOR_IA_SMOKE_BASE_URL`
- Opcional ciclo: `DIRECTOR_IA_SMOKE_TOKEN`, `DIRECTOR_IA_SMOKE_PLANTA_ID`, `DIRECTOR_IA_SMOKE_YEAR`, `DIRECTOR_IA_SMOKE_MONTH`
- Timeout: `DIRECTOR_IA_SMOKE_TIMEOUT_MS` (default 20000)

Comportamiento: GET readiness; si enabled+not ready → exit 1; si inalcanzable → exit 1. Si hay token+planta, POST ciclo y emite `trace_id` cuando la respuesta lo trae. No imprime el token. 401/403 del ciclo → exit 1.

El POST opcional usa el ciclo ya existente (`append_snapshot` EKS si el ciclo corre de verdad). El smoke de CI usa servidor stub y no muta negocio.

### 7. Build gate frontend

Cwd: `frontend-dashboard`.

El comando exigido es `npm ci && npm run build`. Se ejecutó en dos pasos equivalentes (el combinado supera el timeout de una sola invocación):

| Paso | Exit code |
|---|---|
| `npm ci` | 0 |
| `npm run build` (`next build && node scripts/prepare-standalone.js`) | 0 |

`Checking validity of types ...` completó sin Type error; el build siguió a `Collecting page data` y `Generating static pages (12/12)`. Next.js 14.2.18.

Artefactos `.next` restaurados con `git restore` (fuera de `in_scope`).

## Timeouts elegidos

| Nombre | Default | Rationale |
|---|---|---|
| `DIRECTOR_IA_ARR_STATEMENT_TIMEOUT_MS` | 55000 | Cota de la query ARR; menor que el deadline HTTP para que el SQL muera primero |
| `DIRECTOR_IA_CYCLE_TIMEOUT_MS` | 60000 | Deadline del POST completo; patrón env existente (`PG_CONNECTION_TIMEOUT_MS`) |
| `CLIENT_FETCH_TIMEOUT_MS` | 65000 | Cliente espera un poco más para preferir 504 de servidor sobre abort local |

Invalid config → default finito. No se tocó `.env.example` (`in_scope`: solo lectura).

## Mapeo HTTP

| Caso | HTTP | Notas |
|---|---|---|
| ARR statement timeout (57014) | 504 `ARR_TIMEOUT` | Técnico; no empty |
| Deadline de ciclo | 504 `CYCLE_TIMEOUT` | Técnico; no empty |
| TOOL_ERROR existente | 502 | Conservado |
| INVALID_INPUT | 400 | Conservado |
| empty / unresolved / incomplete / ABSTAIN | 200 | Conservado |
| JWT / planta / GA | 401 / 403 | Antes del ciclo |
| enabled false | 200 `{enabled:false}` | Conservado |
| Abort cliente | sin conclusión de negocio | `CLIENT_ABORT` en UI |

504 es compatible: el repo no tenía 504; CURRENT_TASK lo exige para timeout. TOOL_ERROR 502 intacto.

## Pruebas

### Focales

| Suite | Pass | Fail |
|---|---|---|
| `test/director-ia-operational-hardening.test.js` | 21 | 0 |
| `test/director-ia-dashboard-cycle-client.test.js` | 16 | 0 |
| `test/director-ia-dashboard-cycle-endpoint.test.js` | 24 | 0 |
| `test/director-ia-real-cycle.test.js` | 19 | 0 |
| `test/director-ia-real-input-arr.test.js` | 24 | 0 |

### `node --test test/director-ia-*.test.js`

**372 pass / 0 fail / 0 skipped** (baseline previo 351 + 21 de esta tarea).

Cubierto: timeout ARR 504≠empty; deadline 504 sin retry; cleanup SET/RESET+release; logger start/completed/failed + no leakage + throw no muta; readiness sin cognición; abort frontend; stale-result; smoke fail-closed + `trace_id`; 200 empty/unresolved/incomplete; 502 TOOL_ERROR; 401/403; chat legado.

## git

- `git diff --check`: limpio (exit 0) sobre fuentes de esta tarea.
- `package.json` / lockfiles: **sin cambios**.

### Archivos modificados

- `docs/dev-loop/CURRENT_TASK.md`
- `lib/director-ia-dashboard-cycle-transport.js`
- `lib/director-ia-real-input-arr.js`
- `server.js`
- `frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx`
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/lib/cycle-client-core.js`
- `frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts`
- `test/director-ia-dashboard-cycle-endpoint.test.js`

### Archivos creados

- `test/director-ia-operational-hardening.test.js`
- `scripts/smoke-director-ia-operational.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001.md`

## Intactos

`ENABLE_DIRECTOR_IA`, JWT, `plantas_permitidas`, bloqueo GA, path ARR → OP → EB → EKS → IES → RE → CP, chat/WhatsApp. Sin retries, persistencia nueva, sesión, rate limiting, métricas, alerting ni dependencias.

## STOP

Sin commit, push, merge ni siguiente tarea.
