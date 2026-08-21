# Reporte — IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "test/director-ia-dashboard-cycle-endpoint.test.js"
  - "server.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-real-cycle.js"
  - "lib/director-ia-real-input-arr.js"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "lib/director-ia-chat.js"
  - "lib/dashboard-auth.js"
  - "package.json"
  - ".env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK.md conserva una línea residual `status: DRAFT` encima del
    bloque G1. No se tocó (el implementador solo cambia el status de ejecución).
    G1 vigente es el bloque con authorized_at 2026-08-21T08:53:17-06:00.
deviations_from_current_task:
  - >
    No se añadió timeout de request nuevo: CURRENT_TASK prohíbe inventar
    política de timeout. Se reutiliza connectionTimeoutMillis del pool (15s).
    Hang de statement ARR permanece deuda operativa, no bloqueó este slice.
next_task_proposed: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `implementation/director-ia-dashboard-cycle-endpoint-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T08:53:17-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3/G8: `N/A`, no usados.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status` del bloque G1) → este reporte → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea.

## 1. Slice implementado

`POST /api/director-ia/cycle` (dashboard-only, JWT `dashboardAuthMiddleware`).

Flujo: authenticate → `isDirectorIaEnabled` → validar `planta_id`/`year`/`month` → `dashboardBlockGAFinancialKpis` → `assertDashboardPlantaAccessForActionRegister` → resolver `plant_code` fail-closed → exactamente un `createDirectorIaRealCycle.run` → HTTP product-safe.

`POST /api/director-ia/chat` permanece registrado a `directorIaChat.handlePostChat`. No se modificó `lib/director-ia-chat.js`.

## 2. Transporte no epistémico

`lib/director-ia-dashboard-cycle-transport.js`:

- `createDirectorIaDashboardCycleTransport({ realCycle, logger, clock }).handle(input)`
- `handlePostDashboardCycle` (Express): authz con helpers inyectados; no interpreta ARR/IES/RE/CP
- `composeDirectorIaDashboardRealCycle` (boot): cablea factories existentes; adapter RE fail-closed (sin LLM)

`server.js` solo: require, wrapper `loadArrProyForDirectorIaDashboardCycle` (misma forma física que el `loadArrProyForPlant` privado de IGF/ARR, vía `dashboardArrForecast` ya usado), `configure`, registro de ruta. Sin `assemble` / `reason` / `project` / `query_context_metadata`.

El cliente envía `planta_id` (y opcionalmente `year`/`month`). Se ignoran `plant_code`, `trace_id`, `query_context_metadata`, `source`, provenance y artefactos N1–N5. Overlay de ciclo (`intent: arr_venta_ton`, `channel: dashboard`, `projectionDepth: L1_EXECUTIVE`) es policy de producto, no input del caller. `trace_id` lo sigue creando la fachada ARR.

`plant_code` se resuelve server-side y se verifica en `arr.provincia_plants`. Sin fila → se omite `plant_code` → `ENTITY_UNRESOLVED`. No se copia el fallback a nombre crudo de `getPlantCodeArrFromPlantaNombre`.

## 3. HTTP mapping (estados internos intactos)

| estado interno | HTTP | detalle preservado |
|----------------|------|--------------------|
| ACQUIRED_OK | 200 | `acquisition_status`, CP DASHBOARD |
| ACQUIRED_EMPTY / DATA_NOT_FOUND | 200 | empty + `source_health.execution_status`; nunca 404, `ABSENCE_CONFIRMED` ni `venta_ton=0` |
| ENTITY_UNRESOLVED | 200 | `unresolved_entities` |
| QUERY_SCOPE_INCOMPLETE | 200 | `incomplete_scopes` |
| NO_KNOWLEDGE / ABSTAIN | 200 | `ies_status` / `reasoning_status` |
| INVALID_INPUT | 400 | `code: INVALID_INPUT` |
| JWT inválido | 401 | comportamiento existente |
| planta / GA | 403 | mensajes existentes; sin internals ARR |
| TOOL_ERROR | **502** | `code: TOOL_ERROR` + detalle interno. 503 se reserva para servicio no configurado (convención repo: S3/unavailability) |
| error interno | 500 | `{ error: "Error interno" }` |

El status HTTP no borra el estado estructurado. Body mínimo: `trace_id`, statuses, `knowledge_coverage` acotada, `source_health` acotada, `channel_output`. Sin raw ARR, JWT, stack, `raw_payload_reference`, IES/RE completos.

## 4. Observabilidad / no-retry / no persistencia

Eventos: `cycle_request_started`, `cycle_request_completed`, `cycle_request_failed`. Campos: `request_id`, `trace_id`, `planta_id`, `duration_ms`, `http_status`, statuses gruesos. Sin JWT, raw ARR, IES/RE completos. Falla de logger no altera el outcome.

Sin retry automático. Sin persistencia/sesión/queue/jobs nuevas. EKS: se reutiliza `eksRuntime.eks` si ya arrancó; si no, `createEks()` in-memory existente. No es persistence-first.

Timeout: pool `connectionTimeoutMillis` 15s. No se inventó timeout de request.

## 5. Tests

| Suite | Comando | Resultado |
|-------|---------|-----------|
| Focal endpoint/transporte | `node --test test/director-ia-dashboard-cycle-endpoint.test.js` | **24 pass / 0 fail** |
| Real cycle | `node --test test/director-ia-real-cycle.test.js` | **19 pass / 0 fail** |
| ARR input | `node --test test/director-ia-real-input-arr.test.js` | **24 pass / 0 fail** |
| Regresión Director IA | `node --test test/director-ia-*.test.js` | **335 pass / 0 fail** (24 nuevos + 311 baseline) |
| Dashboard/auth | no existía suite dedicada previa | JWT middleware ejercitado en harness focal (401/403) |
| Whitespace | `git diff --check` | limpio |

Cobertura focal: auth/authz/GA antes del ciclo; un `run` por request; `plant_code` no controlable por cliente; `trace_id`; mapping de todos los estados pedidos; empty=200; TOOL_ERROR=502; payload mínimo; logs sin secretos; paralelo sin `trace_id` compartido; ruta dedicada + chat legado intacto; wiring de `server.js`.

## 6. Auditoría de archivos

| archivo | cambio |
|---------|--------|
| `lib/director-ia-dashboard-cycle-transport.js` | nuevo: factory de transporte, handler Express, composición de ciclo, resolver fail-closed |
| `test/director-ia-dashboard-cycle-endpoint.test.js` | nuevo: 24 tests |
| `server.js` | require + inyección `arrSource`/`assertPlantaAccess`/`dashboardBlockGAFinancialKpis`/`getPlantCodeArrFromPlantaNombre` + `POST /api/director-ia/cycle` |
| `CURRENT_TASK.md` | solo `status` del bloque G1 |
| reporte | este archivo |

No se modificaron contratos, OP/EB/EKS/IES/RE/CP/ARR, chat, `package.json` ni secretos.

## 7. NEXT_TASK (propuesta; no autorizada)

**`IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001`**

Scope cerrado: consumir `POST /api/director-ia/cycle` desde el dashboard (fetch autenticado, pintar `channel_output` + statuses). Sin cambiar semántica N1–N5, auth/authz, ARR, chat, WhatsApp, persistencia, retry ni contratos.

Gates: G1 humano futuro; **G2/G3/G8 N/A**.

Propuesta. **No autoriza** ejecución. **No encadena.**

## 8. STOP

Sin commit. Sin push. Sin merge. Sin siguiente tarea.
