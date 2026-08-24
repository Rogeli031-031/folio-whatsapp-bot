# Reporte — IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
module: "M7 — IGF Forecast"
slice: "composición snapshot de una fila de igf.compromiso_lines; sin recálculo; sin overlay; sin deltas; sin causalidad"
m7_state_after_impl: "PARTIAL"
global_percentage: "10.0 / 20 = 50.0% (sin cambio)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-capabilities.js"
  - "scripts/test-director-ia-capabilities.js"
  - "test/director-ia-m7-igf-composition.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "server.js"
  - "igf-handler.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"
  - "lib/director-ia-igf-arr.js / planner / tools (lectura previa)"
  - "server.js recalcularUtilYResultado (referencia semántica; no ejecutada)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "No se modificó director-ia-chat.js: el annex ya entra al prompt vía loadIgfArrAnnexForChat."
next_task_proposed: "DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M7 sigue PARTIAL. 10.0/20 = 50.0% no cambia."
```

## Resumen ejecutivo

Director IA expone la **composición observada** de **una** fila de `igf.compromiso_lines` ya cargada por `loadIgfCommitSnapshot` (`SELECT *`). Path:

```text
igf_status / financial_diagnosis
  → get_igf_snapshot
  → loadIgfArrAnnexForChat
  → loadIgfCommitSnapshot
  → extractIgfComposition (1 fila)
  → bloque acotado
  → evidencia
```

No se ejecuta `recalcularUtilYResultado`. No hay overlay de folios. No se invierte `hg_kg`. Null ≠ 0. `*_kg` = **$/kg**. `gasto_kg` no entra a la fórmula. `ORDER_DELTAS` no se usa. Snapshot ≠ tendencia (M9 intacto).

M7 permanece **PARTIAL**. Global **10.0 / 20 = 50.0%** (0.0 pp).

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-m7-igf-composition-001` (≠ `main`).
- HEAD base: `713ea21b Merge branch 'architecture/director-ia-m7-igf-composition-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin matriz, frontend, SQL, contratos, commit, push, merge.

---

## compromiso_lines / snapshot

Fuente: `igf.compromiso_lines`. Loader existente: `SELECT *` + `findIgfRowForPlant` → **una** fila (planta + versión + mes). `extractIgfComposition` no combina filas.

Allowlist finita (`IGF_COMPOSITION_CATALOG`). Columnas ausentes o null se omiten.

---

## ORDER_DELTAS / recalcularUtilYResultado

`ORDER_DELTAS` **no** se importa ni se usa. Es presentación UI.

La fórmula de producto se usó **solo** como referencia de `formula_role` (`add` / `subtract` / `none` / stored). **No** se llama `recalcularUtilYResultado`. `util_oper_*` y `resultado_*` se emiten como **almacenados**.

---

## Unidades / signos / null / hg_kg / gasto_kg

| Regla | Cómo |
|---|---|
| `*_kg` | unit `$/kg`, no kg |
| ton / % / MXN | familias separadas; ranking solo intra `$/kg` de add/subtract |
| null | omitir; no cero |
| `hg_kg` | valor almacenado; no inversión |
| `gasto_kg` | `formula_role: none`; copy «no entra a la fórmula» |

---

## M9 / routing / authz / contexto

M9: `isIgfCompositionQuestion` excluye «cómo cambió venta/descuento/ingreso». Planner de deltas intacto.

Preservados: `igf_status`, `financial_diagnosis`, M6, M9. Tool `get_igf_snapshot` reutilizado.

Authz annex vigente: JWT, rol, planta, GA 403, GV, fail-closed. Sin HTTP interno. Sin writes.

Bloque: «COMPOSICIÓN IGF (snapshot, no tendencia)». Provenance por línea. Copy: composición ≠ causa; magnitud ≠ problema.

---

## Composition vs causality

Permitido: «aparece en el snapshot», «entra en la composición con +/−», «mayor magnitud dentro de $/kg».  
Prohibido: causa, problema, responsable, prioridad.

---

## Tests

| Suite | Resultado |
|---|---|
| `node --test test/director-ia-m7-igf-composition.test.js` | **13/13** |
| `node scripts/test-director-ia-capabilities.js` | **52/52** |
| `node scripts/test-director-ia-planner.js` | **46/46** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **26/26** |
| `node --test test/director-ia-*.test.js` | **657/657** |
| `git diff --check` | limpio |

---

## Estado M7 / porcentaje

| | Valor |
|---|---|
| M7 | **PARTIAL** (antes y después) |
| Global | **10.0 / 20 = 50.0%** |
| pp | **0.0** |

M7 ≠ COMPLETE.

---

## Acciones no realizadas

- No matriz / contratos / frontend / SQL / `server.js` / chat / planner / tools.
- No `recalcularUtilYResultado`, overlay, deltas IGF, causalidad.
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
On branch implementation/director-ia-m7-igf-composition-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   lib/director-ia-capabilities.js
  modified:   lib/director-ia-igf-arr.js
  modified:   scripts/test-director-ia-capabilities.js

Untracked files:
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md
  test/director-ia-m7-igf-composition.test.js
```

Solo archivos autorizados.

## NEXT_TASK

`DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001` (propuesta; no autoriza G1 ni encadena). Documenta profundidad dentro de M7 PARTIAL. No modifica 50.0%.

## STOP
