# Reporte — IMPL-DIRECTOR-IA-M5-TALLER-AT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M5-TALLER-AT-001"
outcome: "DONE_PENDING_REVIEW"
module: "M5 — Taller por AT"
slice: "query JSON SELECT-only de TALLER por token de public.folios.unidad; in-process; sin Excel; sin duplicados; sin AR"
m5_state_after_impl: "PARTIAL"
m5_complete: false
global_during_impl: "10.0 / 20 = 50.0% (matriz no tocada)"
global_after_future_sync: "10.5 / 20 = 52.5%"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-chat.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m5-taller-at.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"
  - "lib/taller-at-excel.js / lib/unidad-taller.js (lectura; solo expandTallerRows + parse)"
  - "lib/director-ia-m6-gastos-inversiones.js (patrón)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M5 runtime = PARTIAL. COMPLETE sigue fuera (Excel/duplicados)."
  - "La matriz documental permanece en 50.0% hasta la sync (52.5%)."
```

## Resumen ejecutivo

Director IA consulta TALLER **por unidad** con SELECT sobre `public.folios`, in-process.

```text
taller_at
  → get_taller_at
  → loadTallerAtForChat
  → SELECT public.folios (categoria LIKE '%TALLER%')
  → expandTallerRows
  → evidencia
  → respuesta
```

Unidad = token físico de `public.folios.unidad` (p. ej. `AT-15`, `PT-03`). **No** hay `at_id` ni catálogo. Periodo `YYYY-MM` obligatorio; si falta, clarifica. Authz de folios **antes** del SELECT.

Excel, workbook, duplicados, HTTP interno, writes y Action Register **fuera**.

M5 queda **PARTIAL**. Esta IMPL **no** cambia la matriz (50.0%). La sync futura: **10.5 / 20 = 52.5%**.

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-m5-taller-at-001` (≠ `main`).
- HEAD base: `4eeaa5ca Merge branch 'architecture/director-ia-m5-taller-at-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin matriz, server.js, frontend, SQL, contratos, commit, push, merge.

---

## Path físico / public.folios

Predicado: `UPPER(TRIM(categoria)) LIKE '%TALLER%'`. `estatus <> 'CANCELADO'`. `mes_cargo` en rango. `planta_id = ANY(equivalentes)`.

`expandTallerRows` transforma filas; se omiten `row_kind = grupo`. No se llama `buildTallerAtWorkbook`.

---

## Unidad

Campo: `public.folios.unidad`. Homologación solo con `unidad-taller.parseUnidadesList` / `normalizeUnidadToken`. Sin fuzzy extra. Sin `at_id`. 0 filas ≠ «la unidad no existe en el catálogo».

---

## Periodo

`YYYY-MM` obligatorio (uno o dos). Sin default. «este mes» / «julio» sin `YYYY-MM` → clarificar.

---

## Authz / plant scope

`requirePlantaId` + `assertFolioStatusAccess` **antes** del SELECT. GV 403. GA en planta autorizada. GG/AD: `plantas_permitidas`. Cross-planta 403. Privados excluidos. Fail-closed.

---

## Planner / tool / chat

| Pieza | Hecho |
|---|---|
| Intent | `taller_at` |
| Tool | `get_taller_at` → `loadTallerAtForChat` |
| Stub Excel | `get_taller_at_analysis` sigue `declared_not_integrated` |
| Chat | rama in-process `intent === "taller_at"` |
| Unsupported | «taller por AT» desnudo y Excel/xlsx siguen bloqueados |

Preservados: `expense_analysis`, `investment_analysis`, M4, «cómo va Taller» → AR, «qué acciones tiene AT-15?» → `action_status`.

---

## Fronteras

| Frontera | Cómo |
|---|---|
| M4 | comparativo agregado; «compara taller» no es M5 |
| M6 | GASTOS/INVERSIONES; predicado TALLER distinto |
| AR | acciones/responsable/cómo va Taller |
| Excel | no workbook; no GET |
| Duplicados | no se importan detectores |

---

## Respuesta

Hechos: unidad, folio, periodo, concepto, importe, estatus, count, total, source. 0 filas: «No se encontraron registros TALLER para esa planta/unidad/periodo.» No causa/responsable/atraso/urgencia/desviación.

---

## Tests

| Suite | Resultado |
|---|---|
| Focales `test/director-ia-m5-taller-at.test.js` | 16/16 |
| Capabilities | 56/56 |
| Planner | 49/49 |
| Orchestrator | 26/26 |
| Suite `test/director-ia-*.test.js` | 673/673 |
| `git diff --check` | limpio |

---

## Estado M5 / porcentaje

| | Esta IMPL | Tras sync futura (si se autoriza) |
|---|---|---|
| M5 | **PARTIAL** (runtime) | PARTIAL documentado |
| COMPLETE | **no** | **no** |
| Matriz global | **50.0%** (no tocada) | **52.5%** (+2.5 pp) |

---

## Acciones no realizadas

- No matriz, contratos, server.js, frontend, SQL, Excel, duplicados, writes.
- No commit / push / merge.
- No se autorizó ni ejecutó `DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001`.

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
On branch implementation/director-ia-m5-taller-at-001
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
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md
  lib/director-ia-m5-taller-at.js
  test/director-ia-m5-taller-at.test.js
```

## Confirmación expresa

- Unidad física = `public.folios.unidad`
- No `at_id` inventado
- YYYY-MM obligatorio
- TALLER ≠ GASTOS ≠ INVERSIONES
- M4 preservado
- Action Register preservado
- No Excel / workbook / duplicados / HTTP interno / writes
- **M5 = PARTIAL** (no COMPLETE)
- Futura sync = **52.5%**

## NEXT_TASK

`DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001` (propuesta; no autoriza G1 ni encadena).

## STOP
