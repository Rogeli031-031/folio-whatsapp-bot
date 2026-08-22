# Reporte — IMPL-DIRECTOR-IA-M16-DUPLICADOS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M16-DUPLICADOS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
  - "lib/director-ia-duplicados.js"
  - "lib/folio-duplicados-load.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-chat.js"
  - "lib/folio-duplicados.js (no modificado; reutilizado)"
  - "server.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-duplicados.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-real-cycle.js"
  - "lib/folio-duplicados.js"
  - "sql/"
  - "frontend-dashboard/"
  - "package.json"
  - "package-lock.json"
  - "Render config/env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Elegible para sincronización documental posterior de la matriz M16. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix no se modifica en esta tarea."
```

## Resumen ejecutivo

M16 quedó integrado end-to-end como análisis **read-only** de **posibles** duplicados.

`pregunta` → `duplicate_folios` → `get_duplicate_folios` → `loadDuplicateFoliosForChat` → `loadFoliosParaDuplicados` → `findDuplicatePairs` → evidencia estructurada → respuesta Director IA (sin OpenAI).

No hay HTTP interno, no hay mutaciones, no hay cycle, no hay UI nueva, no hay endpoint nuevo, no hay cambio de matriz.

## Autorización y gates

- Rama: `implementation/director-ia-m16-duplicados-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T21:38:25-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M16 — Análisis duplicados de folios |
| Estado de matriz | NOT_STARTED (no modificado) |
| M0–M20 | 32.5% (no se declara 37.5% en la matriz) |
| Readiness | ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001, alternativa A |

## Arquitectura implementada

Alternativa A del readiness: loader in-process, no dispatcher genérico, no HTTP interno.

- `lib/folio-duplicados-load.js`: extrae la query read-only que usaba el handler de análisis.
- `lib/director-ia-duplicados.js`: authz (GV + `plantas_permitidas` GG/GA/AD), ventana de fechas (default 6 meses), `findDuplicatePairs` umbral 0.72, evidencia y respuesta determinística.
- `server.js`: el endpoint existente llama el loader extraído con `getPlantaIdsEquivalentesForPendientes` (contrato HTTP intacto).
- Catálogo runtime: dominio `duplicados` `canRead: true`, `on_demand`.
- Registry: `get_duplicate_folios` → `available_on_demand` + executor `loadDuplicateFoliosForChat`.
- Chat: si el planner detecta `duplicate_folios`, ejecuta el loader **antes** de OpenAI.

## Mapa end-to-end final

```text
pregunta ("¿Hay folios duplicados?")
  → POST /api/director-ia/chat (JWT + planta_id)
  → askDirectorIa
  → detectUnsupportedDirectorIaDomain  (duplicados ya no corta)
  → planDirectorIaQuestion → intent duplicate_folios
  → buildDirectorIaToolPlan → get_duplicate_folios executable
  → loadDuplicateFoliosForChat
       → assertDuplicateFoliosAccess (GV / plantas_permitidas)
       → loadFoliosParaDuplicados (public.folios, no CANCELADO, LIMIT 1500)
       → findDuplicatePairs(rows, { umbral: 0.72, maxPairs: 200 })
  → buildDuplicateFoliosChatResult
       semantic_class: possible_duplicate_heuristic
       openai_called: false
```

## Gap anterior

Tres cortes: `UNSUPPORTED_RULES.duplicados` → `SOURCE_NOT_INTEGRATED`; `executor: null`; orchestrator/chat sin invocación.

## Cambio realizado

1. Se eliminó **solo** la regla `duplicados` de `UNSUPPORTED_RULES`. Kanban, presupuesto y demás siguen bloqueados.
2. Tool y capability runtime alineados a lectura on-demand.
3. Executor real in-process.
4. Rama en `askDirectorIa` que invoca ese executor.

## Loader/service y findDuplicatePairs

| Pieza | Reutilización |
|---|---|
| `findDuplicatePairs` | `lib/folio-duplicados.js` — **sin cambios** |
| Umbral | 0.72 — **sin recalibrar** |
| Carga | query extraída, mismos filtros (equivalentes, no CANCELADO, fechas, LIMIT 1500) |
| Authz | mismo criterio que el handler (GV 403; GG/GA/AD + lista) |

## Scope / authz

- GV: 403, no consulta folios.
- GG/GA/AD con `plantas_permitidas` no vacía: no cruzan planta.
- Otros roles: mismo aislamiento que el endpoint (no se inventó org_id).
- Chat ya trae `planta_id` y `req.dashboardAuth`.

## Tool / executor

- id: `get_duplicate_folios`
- executor: `loadDuplicateFoliosForChat`
- readOnly: true
- requiredInputs: `["planta_id"]`
- Registry `validateDirectorIaToolRegistry` ok.

## Unsupported-domain gate

`¿Existen folios duplicados?` y `¿Hay folios duplicados?` ya no producen `SOURCE_NOT_INTEGRATED`.  
`¿En qué etapa está el folio 123?` y `¿Cómo va el presupuesto semanal?` siguen bloqueados.

## Evidencia estructurada

`duplicate_folios`: `semantic_class`, `criterio`, planta, `desde`/`hasta`, `umbral`, `scanned`, `pairs_count`, `truncated`, `pairs` (ids, folios, importe, concepto, score).

## Semántica

Lenguaje de **posible duplicidad** / candidatos heurísticos. No afirma confirmación, fraude ni cancelación. Empty: «no se encontraron candidatos bajo los criterios aplicados» + no demuestra imposibilidad. Error de fuente: abstención; no se presenta como empty.

## Happy / empty / error

Cubiertos en `test/director-ia-duplicados.test.js` y en el camino `askDirectorIa` (pool fake).

## Tests y resultados

| Comando | Totales | Pass | Fail |
|---|---|---|---|
| `node --test test/director-ia-duplicados.test.js` | 17 | 17 | 0 |
| `node scripts/test-director-ia-capabilities.js` | 20 | 20 | 0 |
| `node scripts/test-director-ia-planner.js` | 28 | 28 | 0 |
| `node scripts/test-director-ia-tool-orchestrator.js` | 19 | 19 | 0 |
| `node --test test/director-ia-*.test.js` | 416 | 416 | 0 |

Suite Director IA relevante: **416/416** (incluye cycle constitucional y los 17 focales M16).

## Regresiones verificadas

- Cycle: tests `director-ia-real-cycle`, EKS, IES, RE, CP, dashboard cycle: verdes.
- Tools ajenos: `get_folio_status` / `get_budget_status` siguen `declared_not_integrated`.
- Endpoint de análisis: solo extrae loader; misma query y mismos equivalentes.

## Confirmaciones

| Invariante | Estado |
|---|---|
| No HTTP interno | Sí |
| No mutaciones (INSERT/UPDATE/DELETE/cancelar) | Sí |
| No cycle | Sí |
| No UI | Sí |
| No endpoint nuevo | Sí |
| No matriz | Sí |
| No contratos `docs/director-ia/` | Sí |

## definition_of_complete (punto por punto)

| IFF | ¿Cumple? |
|---|---|
| `get_duplicate_folios` tiene executor real | Sí |
| `duplicate_folios` alcanza el tool integrado | Sí |
| `SOURCE_NOT_INTEGRATED` deja de aplicar a M16 | Sí |
| Otros dominios no integrados continúan bloqueados | Sí |
| Consulta fuente real | Sí (`public.folios` vía loader) |
| `findDuplicatePairs` reutilizado | Sí |
| Scope/authz se preserva | Sí |
| Evidencia estructurada | Sí |
| Happy / empty / error fail-safe | Sí |
| Heurística no se convierte en certeza | Sí |
| No afirma fraude | Sí |
| No realiza mutaciones | Sí |
| No HTTP interno | Sí |
| No UI nueva | Sí |
| No integración al cycle | Sí |
| Tests focales verdes | Sí 17/17 |
| Suite Director IA relevante verde | Sí 416/416 |

**M16 operativo = COMPLETE IFF satisfecho.** La matriz documental sigue NOT_STARTED hasta una tarea DOCS posterior. Esta IMPL no la marca.

## Riesgos residuales

- Chat no usa `dashboardBlockGVFoliosMiddleware`; el loader debe seguir aplicando el bloqueo GV (hoy lo hace).
- `LIMIT 1500` / `truncated` pueden ocultar pares fuera de ventana.
- Roles sin `plantas_permitidas` conservan el aislamiento (limitado) del backend actual.
- La respuesta es determinística; un cambio futuro que pase por OpenAI podría degradar la semántica.

## Acciones no realizadas

- No cancelar/editar/fusionar/marcar folios.
- No HTTP interno.
- No endpoint nuevo.
- No UI.
- No cycle.
- No migration/schema.
- No cambio de `findDuplicatePairs` ni umbral.
- No capability matrix.
- No contratos arquitectónicos.
- No commit / push / merge / siguiente tarea.

## git

`git diff --check`: limpio (sin output, exit 0).  
`git status`: ver cierre en `CURRENT_TASK.md`.
