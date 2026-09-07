# FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001

IMPLEMENTATION_SHA: 74c34edfe0e96256a944e878125ef6ad96d49481

BEFORE:
- `bonos o bono` → una secuencia; 0 hits
- `son de agosto de bonos` → `de bonos`
- `apoyos o inversiones ... MAYAN PALACE` → `o inversiones fueron de mayan palace`

AFTER:
- ANY `["bonos","bono"]`
- SINGLE `bonos`
- RANGE 2026-01..2026-08 SUPPORT; SINGLE `mayan palace`

SCOPE_PHRASE_STRATEGY:
Frases cerradas `apoyos o inversiones`, `apoyos o folios`, `folios o apoyos` se retiran antes del periodo/concepto. Scope se resuelve sobre la pregunta original.

BOUNDARY_STRATEGY:
Tras el frame, un `de`/`con` inicial residual. No medial. No STRUCTURAL.

CONCEPT_MODEL:
SINGLE: `concept_query` + `concept_alternatives=[]`. ANY: `concept_query=null` + frases.

ANY_STRATEGY:
Split solo en `" o "`. Match si alguna frase completa pega por secuencia vigente.

O_RING: SINGLE `o-ring` / `sello o-ring`

ACEITE_DE_MOTOR: ANY `aceite de motor` | `filtros de aire`; `aceite de motor` conserva `de`

MAYAN_PALACE: `mayan palace`; RANGE 2026-01..2026-08; SUPPORT_FAMILIES

RANGE_UNCHANGED: YES
MORPHOLOGY_UNCHANGED: YES
SCOPE_CONTRACT_UNCHANGED: YES

SQL_NEW: NO
DEPENDENCY_NEW: NO

001..040: PASS

SUITES:
- R-FOLIO-COMP 18/18 PASS
- R-FOLIO-RANGE 25/25 PASS
- R-FOLIO-LANG 18/18 PASS
- R-FOLIO-TRUTH 21/21 PASS
- planner 61/61 PASS
- capabilities 57/57 PASS
- orchestrator 27/28; 1 preexistente en `517f746e` (`commercial_state`). planner/orchestrator no tocados. NEW FAILURE = 0
- M2/M4/M5/M6/IGF/continuity 178/178 PASS
- TIER 1 8/8 PASS
- PRE-DEPLOY `--gate` PASS
- HTTP 5xx = 0
- HARNESS = 0
- `git diff --check` limpio

FILES:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-compositional-query-grammar.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

RISKS:
- Solo tres frases de sujeto. Otras coordinaciones (`apoyos e inversiones`) no se retiran.
- ANY solo con `" o "` espacial; `y`/`and` no son operadores.

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
range_changed: false
morphology_changed: false
scope_contract_changed: false
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```
