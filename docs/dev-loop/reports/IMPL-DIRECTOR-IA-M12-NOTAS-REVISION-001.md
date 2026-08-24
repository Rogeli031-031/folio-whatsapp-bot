# Reporte — IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001"
outcome: "DONE_PENDING_REVIEW"
module: "M12 — Action Register"
slice: "notas de revisión read-only (texto, autor almacenado, created_at, revisión)"
m12_state_after_impl: "PARTIAL"
global_percentage: "10.0 / 20 = 50.0% (sin cambio)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"
  - "lib/director-ia-m12-revision-notes.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m12-revision-notes.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-context.js"
  - "lib/action-register-board.js"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (lectura)"
  - "server.js ensureActionRegisterTables / GET notes / assertDashboardPlantaAccessForActionRegister (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M12 sigue PARTIAL. 10.0/20 = 50.0% no cambia."
  - "La sync documental solo registra profundidad dentro de PARTIAL; no suma porcentaje."
```

## Resumen ejecutivo

Director IA consulta **notas reales de revisión** del Action Register con un **loader dedicado** `loadActionRegisterRevisionNotesForChat`. Path:

```text
revision_notes
  → get_action_register_revision_notes
  → loadActionRegisterRevisionNotesForChat
  → resolver revisión
  → SELECT arr.action_register_revision_notes
  → recorte 1 revisión / 8 notas / 500 caracteres
  → evidencia separada
  → respuesta
```

`includeNotes` del context always-on **sigue en false**. No hay vínculo nota→ítem. Authz = Action Register vigente (no M2). Plaud, history M2, comentarios de folio y binarios fuera.

M12 permanece **PARTIAL**. Global **10.0 / 20 = 50.0%** (0.0 pp).

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-m12-notas-revision-001` (≠ `main`).
- HEAD base: `5b4a87b8`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status` en CURRENT_TASK.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin matriz, frontend, SQL, schema, contratos, commit, push, merge.

---

## Source / revision relation

Fuente: `arr.action_register_revision_notes`. Relación física: **`revision_id` only**. SELECT con JOIN a `arr.action_register_revisions` y `rv.planta_id`. Columnas leídas: `id`, `revision_id`, `body`, `author_name`, `created_at`. Sin `item_id`. Sin attachments.

---

## Latest revision

`UNIQUE(planta_id, revision_date)` + `ORDER BY revision_date DESC, id DESC LIMIT 1`.

| Entrada | Resolución |
|---|---|
| `revision_id` / `revisión N` | exacta por id + planta |
| fecha YYYY-MM-DD o DD/MM/AAAA | exacta por `revision_date` |
| «última revisión» / «revisión más reciente» | latest físico |
| notas sin revisión ni latest | **clarificar** (no default) |

---

## Loader dedicado / context limits / truncation

`lib/director-ia-m12-revision-notes.js`. No se activó `includeNotes=true` en `director-ia-context.js` (sigue `false`).

| Límite | Valor |
|---|---|
| Revisiones | 1 |
| Notas | 8; overflow = `notes_omitted` |
| Orden | `created_at ASC, id ASC` |
| Body | 500 caracteres; `truncated=true` + `original_length` |
| Truncation | explícito; no se completa el texto |

---

## Author / timestamp

`author_name` se expone tal cual (incluido `''`). No se inventa «sistema» ni se resuelve `created_by_usuario_id`. `created_at` se preserva. Texto ≠ acuerdo formal.

---

## Authz

`assertActionRegisterAccess` = regla de `assertDashboardPlantaAccessForActionRegister`: JWT/rol; ZP/AD/CF_CDMX globales; resto `plantas_permitidas`; GA/GV sin bypass de rol; cross-planta 403; fail-closed sin auth/`planta_id`. **No** `assertFolioStatusAccess`.

---

## Planner / tool / chat

- Intent nuevo `revision_notes` **antes** de overdue / responsible / action_status. Esos intents no se reescribieron.
- Tool `get_action_register_revision_notes`, executor real, on-demand, read-only.
- Capability `revision_notes` PARTIAL on-demand. `action_register` sigue PARTIAL; notas siguen fuera del context always-on.
- Chat: early-return in-process; `context_meta.mode = revision_notes`; `openai_called: false`; bloque `revision_notes` separado.

---

## Boundaries

| Frontera | Cómo |
|---|---|
| Ítem | sin `item_id`; respuesta no atribuye nota a una acción |
| M2 | no `folio_historial` |
| Comentarios folio | no `loadFolioComentarios*` |
| Plaud / bitácora | no se carga; planner excluye plaud/bitácora/transcrip |
| Binarios | no attachments / S3 / PDF |
| HTTP interno | no axios hacia `/api/action-register` |
| Writes | solo SELECT |

---

## Tests

| Suite | Resultado |
|---|---|
| `node --test test/director-ia-m12-revision-notes.test.js` | **26/26** |
| `node scripts/test-director-ia-capabilities.js` | **48/48** |
| `node scripts/test-director-ia-planner.js` | **42/42** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **25/25** |
| `node --test test/director-ia-*.test.js` | **625/625** |
| `git diff --check` | limpio |

---

## Estado M12 / porcentaje

| | Valor |
|---|---|
| M12 | **PARTIAL** (antes y después) |
| Global | **10.0 / 20 = 50.0%** |
| pp | **0.0** |

---

## Acciones no realizadas

- No matriz / contratos / frontend / SQL / schema.
- No `includeNotes=true` en board general.
- No Plaud, M2, comentarios, binarios, writes, HTTP interno.
- No commit / push / merge.
- No se autorizó ni ejecutó la NEXT_TASK.

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch implementation/director-ia-m12-notas-revision-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   lib/director-ia-capabilities.js
  modified:   lib/director-ia-chat.js
  modified:   lib/director-ia-planner.js
  modified:   lib/director-ia-tools.js
  modified:   scripts/test-director-ia-capabilities.js
  modified:   scripts/test-director-ia-planner.js
  modified:   scripts/test-director-ia-tool-orchestrator.js

Untracked files:
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md
  lib/director-ia-m12-revision-notes.js
  test/director-ia-m12-revision-notes.test.js
```

Solo archivos autorizados.

## NEXT_TASK

`DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001` (propuesta; no autoriza G1 ni encadena). Documenta profundidad dentro de M12 PARTIAL. No modifica 50.0%.

## STOP
