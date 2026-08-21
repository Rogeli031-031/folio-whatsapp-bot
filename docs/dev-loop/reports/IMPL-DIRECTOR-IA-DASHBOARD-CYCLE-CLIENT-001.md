# Reporte — IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.js"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx"
  - "test/director-ia-dashboard-cycle-client.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "lib/director-ia-real-cycle.js"
  - "lib/director-ia-chat.js"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx"
  - "package.json"
  - "frontend-dashboard/package.json"
  - ".env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK.md conserva una línea residual `status: DRAFT` encima del
    bloque G1. No se tocó. G1 vigente es authorized_at 2026-08-21T10:49:39-06:00.
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `implementation/director-ia-dashboard-cycle-client-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T10:49:39-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3/G8: `N/A`, no usados.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status` del bloque G1) → este reporte → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea.

No se requirió nueva arquitectura de auth, backend, CP, dependencia, persistencia ni G2/G3.

## 1. Arquitectura frontend reutilizada

Inspección física de `frontend-dashboard/`:

- JWT: `parseTokenFromQuery` / `sessionStorage` / `apiFetch` Bearer (existente).
- Planta, año y mes: selectores ya presentes en `DirectorIaShell`.
- 401: pantalla `unauthorized` existente; el panel llama `onUnauthorized` si `authFailure`.
- 403: mensaje del backend (`error`) como el resto del módulo.
- Doble submit: botón `disabled` mientras `loading`, igual que mejora continua.
- Chat legado (`DirectorIaChatPanel` / `fetchDirectorIaChat`) **no se usó ni se modificó**.

No hay suite de tests frontend previa (`frontend-dashboard/package.json` no define `test`). Los tests focales siguen la convención del repo: `node --test` en `test/*.test.js`.

## 2. Cliente

`fetchDirectorIaCycle` en `modules/director-ia/lib/api.ts` usa el mismo patrón de URL (`NEXT_PUBLIC_API_URL` / `/api-backend`) y `Authorization: Bearer`.

El body solo admite `planta_id` y, si la UI ya tiene año/mes válidos, `year`/`month`. Se ignoran `plant_code`, `trace_id`, `query_context_metadata`, source, provenance y N1–N5 aunque se inyecten en el objeto de entrada.

`POST /api/director-ia/chat` no se llama. Una sola petición; sin retry ni polling.

## 3. Dos dimensiones de estado

| transporte UI | resultado Director IA |
|---------------|------------------------|
| idle / loading / completed / transport_error | ACQUIRED_OK, ACQUIRED_EMPTY, ENTITY_UNRESOLVED, QUERY_SCOPE_INCOMPLETE, ABSTAIN/NO_KNOWLEDGE, TOOL_ERROR, INVALID_INPUT, … |

HTTP 200 con empty/unresolved/incomplete/ABSTAIN es **completed**, no error de red.

Copy empty: «Datos no encontrados para el alcance solicitado» — nunca «0 ventas», «sin ventas» ni ausencia confirmada.

`trace_id` se muestra como `ref …` en tipografía 10px; no es input.

CP DASHBOARD: se pintan `content_blocks.statement_or_reference` (+ `semantic_type` visible). No hay LLM ni reescritura.

## 4. Tests

| Suite | Comando | Resultado |
|-------|---------|-----------|
| Focal cliente/UI | `node --test test/director-ia-dashboard-cycle-client.test.js` | **16 pass / 0 fail** |
| Endpoint (regresión) | `node --test test/director-ia-dashboard-cycle-endpoint.test.js` | **24 pass / 0 fail** |
| Real cycle | `node --test test/director-ia-real-cycle.test.js` | **19 pass / 0 fail** |
| ARR | `node --test test/director-ia-real-input-arr.test.js` | **24 pass / 0 fail** |
| Director IA total | `node --test test/director-ia-*.test.js` | **351 pass / 0 fail** (16 nuevos + 335 baseline) |
| Frontend dashboard | no existía suite de tests | N/A (sin script `test` en frontend) |
| Whitespace | `git diff --check` | limpio |

## 5. Auditoría de archivos

Modificados:

- `CURRENT_TASK.md` (solo `status` del bloque G1)
- `frontend-dashboard/modules/director-ia/lib/api.ts` (alta de `fetchDirectorIaCycle`; chat intacto)
- `frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx` (montaje del panel; JWT/planta/año/mes reutilizados)

Creados:

- `frontend-dashboard/modules/director-ia/lib/cycle-client-core.js`
- `frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx`
- `test/director-ia-dashboard-cycle-client.test.js`
- este reporte

No tocados: endpoint, transporte, ciclo real, ARR, OP/EB/EKS/IES/RE/CP, chat, `package.json`, contratos.

## 6. STOP

Sin commit. Sin push. Sin merge. Sin siguiente tarea.
