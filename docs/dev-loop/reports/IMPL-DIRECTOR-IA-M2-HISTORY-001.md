# Reporte — IMPL-DIRECTOR-IA-M2-HISTORY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M2-HISTORY-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "lib/director-ia-m2-history.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-m2-history.test.js"
  - "test/director-ia-m2-folio-status.test.js"
  - "test/director-ia-duplicados.test.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "package-lock.json"
  - "capability matrix documental"
  - "lib/director-ia-real-cycle.js"
  - "lib/director-ia-duplicados.js"
  - "lib/director-ia-m3-plantas-kpis-proyectos.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"
  - "docs/director-ia/ (solo lectura; no modificado)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/director-ia-m2-folio-status.test.js y test/director-ia-duplicados.test.js no estaban en writable; se ajustaron solo aserciones del slice (history ya no SOURCE_NOT_INTEGRATED; get_folio_history ejecutable; documents/presupuesto siguen bloqueados) para que la suite Director IA requerida pasara."
next_task_proposed: "DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix documental no se modifica en esta tarea."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

Quedó integrado el slice **history read-only** de M2 para Director IA.

Path único in-process:

`intent folio_history` → `tool get_folio_history` → `executor loadFolioHistoryForChat` → resolver y autorizar folio → `SELECT` de `public.folio_historial` → evidencia → respuesta.

Director IA ahora puede consultar el historial real de un folio por **id** o por **`numero_folio`**.

**M2 sigue PARTIAL.** El porcentaje global **sigue 42.5%** (8.5/20). Este slice no marca COMPLETE. Efecto porcentual: **0.0 pp**.

Eventos no deduplicados. No autoavance. No writes. No HTTP interno.

## Autorización y gates

- Rama: `implementation/director-ia-m2-history-001` (≠ `main`).
- HEAD de arranque: `35a4a932 Merge branch 'architecture/director-ia-m2-history-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M2 — Kanban / Folios |
| Estado antes | PARTIAL |
| Estado después de este slice | PARTIAL |
| M0–M20 | 42.5% (8.5/20) |
| Efecto de este slice | 0.0 pp |
| Readiness | ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001, SAFE_SELECT_ONLY_PATH |

## Source `public.folio_historial`

Helper/loader SELECT-only en `lib/director-ia-m2-history.js` (no importa `server.js`):

| Superficie | Equivalente | Mutación |
|---|---|---|
| `listHistorialForFolio` | `SELECT id, folio_id, numero_folio, folio_codigo, estatus, comentario, actor_telefono, actor_rol, creado_en FROM public.folio_historial` con `folio_id = $1 OR numero_folio = $2` | no |
| Resolución de folio | `getFolioById` / `getFolioByNumero` de `folio_status` | no |
| Authz | `assertFolioStatusAccess`, `folioVisibleToAuth`, `folioInPlantScope` | no |

Orden: `creado_en ASC`, desempate por `id`. Límite 80 + `truncated`.

`server.js` no se tocó. No se usó GET `/timeline` como transporte.

## History por id / por `numero_folio`

| Caso | Lookup | Resultado |
|---|---|---|
| History por id | `folio 123` | eventos del folio resuelto |
| History por número | `F-YYYYMM-NNN` | eventos vía `numero_folio` |
| Folio autorizado + 0 eventos | lista vacía observada | **no** 404 |
| Folio inexistente | — | **404**, sin consultar historial |

## Observed fields

Del evento físico, sin invención:

- `estatus` (puede ser `null`)
- `comentario` (puede ser `null`)
- `actor_telefono` (puede ser `null`)
- `actor_rol` (puede ser `null`)
- `creado_en`

`event_id` solo si la fila trae `id` físico.

No se exponen `event_type`, `estatus_anterior`, `estatus_nuevo`, `previous_status` ni `new_status`.

`folios.estatus_anterior` no se usa.

## Derived fields

- `etapa` = `estatusToEtapaVisual` **solo** si el `estatus` del evento es no vacío y mapeable (`ESTADOS` conocidos o `RECHAZADO_ZP`).
- `etapa_derived: true` solo en ese caso.
- Estatus `null`/vacío o no mapeable → `etapa: null`, `etapa_derived: false`. El evento **no se oculta**.

## Null semantics

- Null se preserva.
- Actor null **no** significa sistema. La narrativa dice «actor no registrado» y aclara que la ausencia no se interpreta como sistema.
- Estatus null se reporta como «estatus no registrado»; el evento sigue presente.
- Folio autorizado + historial vacío = lista vacía, no invención.

## Event preservation / no dedupe

- Se preservan todos los eventos reales.
- Eventos repetidos de la misma etapa **no** se colapsan.
- **No** se usa `dedupeHistorialByStage`.
- No se reconstruyen eventos faltantes.
- No se convierte evento en transición.
- No se convierte comentario en causa ni rol en responsabilidad.
- No se convierte antigüedad en retraso.

## Authz y scope de planta

Orden obligatorio:

1. resolver folio;
2. verificar autorización/planta;
3. **solo entonces** consultar `public.folio_historial`.

Reutiliza el modelo de `folio_status` (no la authz más laxa de GET `/timeline`):

- JWT/contexto: `req.dashboardAuth`.
- Rol: GV **403**.
- GA **permitido** si la planta está en `plantas_permitidas`.
- GG/GA/AD + `plantas_permitidas`: fail-closed (planta no autorizada → 403, sin resolver folio ni historial).
- Folio de otra planta / fuera de equivalentes → **403**, sin consultar historial.
- Folio inexistente / no visible → **404**, sin consultar historial.

## Planner

- Intent `folio_history` habilitado: último movimiento / historial + folio / quién movió|aprobó|avanzó|cambió el folio.
- `folio_status` se preserva.
- `folio_documents`, financial surfaces y `kanban_flow` no se habilitaron.

## Tool / executor

| Tool | Status | Executor |
|---|---|---|
| `get_folio_history` | `available_on_demand` | `loadFolioHistoryForChat` |
| `get_folio_documents` | `declared_not_integrated` | `null` |
| `get_folio_financial_status` | `declared_not_integrated` | `null` |
| `get_budget_status` | `declared_not_integrated` | `null` |

- `readOnly: true`
- `requiredInputs`: `["planta_id", "question"]`
- `sourceFiles`: `lib/director-ia-m2-history.js`
- Registry `validateDirectorIaToolRegistry` ok.

## Chat wiring

En `askDirectorIa`, **antes** de OpenAI y junto a `folio_status`:

`if (directorIaPlan.intent === "folio_history")` → `loadFolioHistoryForChat` → `buildFolioHistoryChatResult`.

- `openai_called: false`
- No fallback a Action Register.
- No fallback a M3.
- No usa GET `/timeline` ni handlers HTTP.

## Unsafe routes excluded

**No** se usaron como fuente/transporte:

- `GET /api/dashboard/kanban`
- `GET /api/folios/:id`
- `GET /api/folios/:id/timeline`

**No** se llamó `maybeAdvanceFolioToComprobaciones`.

**No** se importó `dedupeHistorialByStage`.

**No** se importó `server.js`.

## No side effects

| Invariante | Estado |
|---|---|
| Eventos no deduplicados | Sí |
| No autoavance | Sí |
| No `maybeAdvanceFolioToComprobaciones` | Sí |
| No writes (INSERT/UPDATE/DELETE) | Sí |
| No HTTP interno | Sí |
| No GET `/kanban`, `/folios/:id`, `/timeline` | Sí |
| No cycle constitucional | Sí |
| No fallback Action Register | Sí |
| No fallback M3 | Sí |

## Tests

Focales en `test/director-ia-m2-history.test.js`: history por id; por `numero_folio`; múltiples eventos; orden ASC; misma etapa preservada; estatus presente; estatus null; etapa derivada; etapa no derivada; comentario; `actor_telefono`; `actor_rol`; actor null; `creado_en`; historial vacío; folio inexistente; cross-planta; planta no autorizada; `plantas_permitidas`; GA; GV; intent; tool/executor; chat wiring; `SOURCE_NOT_INTEGRATED` levantado solo para history; `folio_documents` bloqueado; financial bloqueadas; no AR; no M3; no dedupe; no autoavance; no HTTP interno; sin writes.

## Resultados completos

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-m2-history.test.js` | **22/22 pass**, 0 fail |
| `node scripts/test-director-ia-capabilities.js` | **28/28 pass** |
| `node scripts/test-director-ia-planner.js` | **33/33 pass** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24 pass** |
| `node --test test/director-ia-*.test.js` | **509/509 pass**, 0 fail |
| `git diff --check` | limpio (exit 0) |

## Estado M2 y porcentaje

- **M2 sigue PARTIAL.**
- **Porcentaje global sigue 42.5%** (8.5/20).
- No se marca COMPLETE.
- No se sincronizó la matriz documental.
- 42.5% **no cambia**.

## Acciones no realizadas

- No se habilitó `folio_documents`, PDFs, financial status, `kanban_flow` ni writes.
- No se usó `dedupeHistorialByStage`.
- No se inventaron `estatus_anterior`, `estatus_nuevo` ni `event_type`.
- No se modificó `docs/director-ia/**`, matriz, frontend, SQL, migrations, schema, contratos.
- No se tocó `server.js`.
- No commit, push, merge ni NEXT_TASK ejecutada.

## Gates

- G1: autorizado por humano; intacto.
- G2/G3/G8: N/A.
- G4/G5: no ejecutados.

## secrets_check

`none`. No se guardaron secretos, tokens ni credenciales.

## git diff --check

Limpio.

## git status

Al cierre (archivos de esta tarea):

```
 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-capabilities.js
 M lib/director-ia-chat.js
 M lib/director-ia-m2-folio-status.js
 M lib/director-ia-planner.js
 M lib/director-ia-tools.js
 M scripts/test-director-ia-capabilities.js
 M scripts/test-director-ia-planner.js
 M scripts/test-director-ia-tool-orchestrator.js
 M test/director-ia-duplicados.test.js
 M test/director-ia-m2-folio-status.test.js
?? lib/director-ia-m2-history.js
?? test/director-ia-m2-history.test.js
?? docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md
```

## NEXT_TASK

Propuesta (máximo una), **no autorizada**, **no ejecutada**:

`DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001`

Solo debe reflejar una profundización adicional de M2 **dentro de PARTIAL**. No debe marcar M2 COMPLETE ni cambiar el 42.5%.

Este reporte no es G1 ni G5.
