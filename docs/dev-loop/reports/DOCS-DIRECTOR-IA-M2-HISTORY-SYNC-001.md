# Reporte — DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "lib/director-ia-m2-history.js (lectura)"
  - "lib/director-ia-m2-folio-status.js (lectura)"
  - "lib/director-ia-chat.js (lectura)"
  - "lib/director-ia-tools.js (lectura)"
  - "lib/director-ia-planner.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M2; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con el slice `folio_history` ya integrado en `main`.

**M2 sigue PARTIAL.** Solo se documentó una profundización adicional (comentarios + `folio_status` + history read-only).

**El porcentaje global no cambia: 8.5 / 20 = 42.5%.** No se sumó nada. No se marcó COMPLETE.

History quedó documentado **sin ampliar semántica**: solo los hechos físicos de `public.folio_historial`.

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M2-HISTORY-001 |
| Merge en main | `368394f77067bd60ed1864df66f9f3348fc911c6` |
| Estado matriz M2 antes | PARTIAL (comentarios + `folio_status`) |
| Estado matriz M2 después | PARTIAL (comentarios + `folio_status` + `folio_history`) |
| M0–M20 antes | 8.5 / 20 = 42.5% |
| M0–M20 después | 8.5 / 20 = 42.5% |
| Efecto | 0.0 pp |

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0. M2 ya valía 0.5 y sigue valiendo 0.5.

## History integrado (path físico verificado)

- Rama de trabajo: `docs/director-ia-m2-history-sync-001` (≠ `main`).
- `368394f7` es ancestro de HEAD y está en `origin/main` (`Merge branch 'implementation/director-ia-m2-history-001'`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

Path físico verificado en main:

```text
intent folio_history
  → get_folio_history (available_on_demand, readOnly)
  → loadFolioHistoryForChat
  → resolver folio (getFolioById / getFolioByNumero)
  → autorización (assertFolioStatusAccess / folioVisibleToAuth / folioInPlantScope)
  → SELECT public.folio_historial (listHistorialForFolio)
  → evidencia
  → buildFolioHistoryChatResult
```

| Pieza | Evidencia |
|---|---|
| Intent | `lib/director-ia-planner.js` (`folio_history`; último movimiento / historial + folio / quién movió\|aprobó\|avanzó\|cambió) |
| Tool | `lib/director-ia-tools.js` `get_folio_history` executor `loadFolioHistoryForChat` |
| Chat | `lib/director-ia-chat.js` `intent === "folio_history"` antes de OpenAI |
| Helper | `lib/director-ia-m2-history.js` SELECT-only |
| Authz | Reutiliza `folio_status`; historial **después** de resolver y autorizar |
| Documents / financial | `get_folio_documents` / `get_folio_financial_status` / `get_budget_status` siguen `declared_not_integrated` |

## Source

`public.folio_historial`

SELECT verificado: `id`, `folio_id`, `numero_folio`, `folio_codigo`, `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`.

## Observed fields

Documentados como hechos del evento:

- `estatus`
- `comentario`
- `actor_telefono`
- `actor_rol`
- `creado_en`

`event_id` solo si existe `id` físico.

## Derived fields

- `etapa` derivada con `estatusToEtapaVisual` **solo** cuando el `estatus` del evento existe y mapea.
- Si `estatus` es null/vacío/no mapeable → sin etapa derivada; el evento no se oculta.

## Null semantics

- Null se preserva.
- Actor null **no** significa sistema.
- Estatus null no convierte el evento en transición.
- Folio autorizado + 0 eventos = lista vacía, no 404.

## No dedupe

Documentado expresamente:

- eventos no deduplicados;
- misma etapa repetida preservada;
- **no** `dedupeHistorialByStage`.

No se documentó el timeline HTTP deduplicado como fuente de Director IA.

## Authz

Documentado:

- JWT/contexto (`req.dashboardAuth`);
- rol;
- `planta_id`;
- `plantas_permitidas`;
- GV = 403;
- GA solo en planta autorizada;
- cross-planta = 403;
- not found = 404;
- fail-closed;
- historial se consulta **después** de resolver y autorizar el folio.

## Unsafe routes excluded

Documentado expresamente:

- **no** autoavance;
- **no** writes;
- **no** HTTP interno;
- **no** `GET /api/dashboard/kanban`;
- **no** `GET /api/folios/:id`;
- **no** `GET /api/folios/:id/timeline` como transporte interno;
- **no** `maybeAdvanceFolioToComprobaciones`;
- **no** `dedupeHistorialByStage`.

## Capacidades aún no integradas

Siguen NO integradas:

- `folio_documents` / PDFs;
- financial status;
- `kanban_flow` inferencial;
- cheques;
- pólizas;
- presupuestos;
- crear / editar / aprobar / cancelar;
- cualquier write.

Preguntas #12 y #13 de Parte 4 permanecen NO INTEGRADA.

## Tests

Reportados en IMPL y verificados contra ese reporte (esta tarea no reejecuta ni modifica tests):

| Evidencia | Resultado |
|---|---|
| history focal | **22/22** |
| capabilities | **28/28** |
| planner | **33/33** |
| orchestrator | **24/24** |
| suite Director IA | **509/509** |
| `git diff --check` en IMPL | limpio |
| `git diff --check` en este DOCS | limpio |

## Estado M2 y porcentaje

- **M2 sigue PARTIAL.**
- **42.5% no cambia** (8.5/20).
- No se marca COMPLETE.
- History documentado sin ampliar semántica: no `event_type`, no `estatus_anterior`/`estatus_nuevo` del evento, no actor sistema.

## Cambios exactos en matriz

Solo `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

1. Ficha **M2**: sigue **PARCIAL**; se documenta el slice `folio_history` (source, campos observados, etapa derivada, nulls, no dedupe, authz, rutas inseguras excluidas). Observaciones + merge `368394f7`. Scoring **sin cambio** 42.5%.
2. Parte 3 fuente **Historial de folios**: NO INTEGRADA → **PARCIAL** (SELECT-only; no GET `/timeline`).
3. Parte 4 #11: No/NO INTEGRADA → Sí/**PARCIAL** (eventos observados; no GET `/timeline`).
4. Parte 4 #19 (folios): No → Parcialmente (actor observado; null ≠ sistema).
5. Parte 9 §1, §3, §5, §6, §7 y apéndice: se añade el slice history; M2 permanece en PARCIAL; documents/financial/`kanban_flow`/GET `/timeline` siguen no integrados.

No se reescribió la ficha de M0–M1 ni M3–M20. No se tocó `DIRECTOR_IA_ARCHITECTURE_INDEX.md`.

## Porcentaje antes/después

| ID | Etiqueta | Puntos antes | Puntos después |
|---|---|---|---|
| M2 | PARCIAL → PARCIAL (cobertura más profunda) | 0.5 | 0.5 |
| M0–M20 resto | sin cambio | 8.0 | 8.0 |
| **Total** | | **8.5** | **8.5** |

**Antes: 8.5/20 = 42.5%.**  
**Después: 8.5/20 = 42.5%.**

No se sumó nada. COMPLETE de M2 no se reinterpretó.

## Acciones no realizadas

- No se modificó código, tests, scripts, runtime, frontend ni SQL.
- No se modificaron contratos arquitectónicos (EKE, 02–05, Constitución, índice).
- No se marcó M2 COMPLETE.
- No se cambió el porcentaje.
- No se documentaron documents/financial/`kanban_flow`/writes como integrados.
- No se inventó `event_type` ni previous/new status.
- No commit / push / merge.
- No NEXT_TASK ejecutada ni autorizada.

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (sync de inventario; el humano listó la matriz como writable).
- G5: pendiente humano.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

Al cierre (sin commit):

```text
On branch docs/director-ia-m2-history-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md
```

Solo archivos autorizados en `in_scope.writable`.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002`

Debe volver a priorizar el próximo slice M2 por valor ejecutivo **después** de `folio_status` + history. No asumir documents.

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

## STOP
