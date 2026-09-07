# FIX-DIRECTOR-IA-FOLIO-SEARCH-FRAME-MORPHOLOGY-001

IMPLEMENTATION_SHA: d4bd72569295d761d27a536ec899ca70ad1184d0

BEFORE: `qué apoyos de julio fueron de llantas?` → `concept_query=fueron de llantas`; fila `AT-36 (4) LLANTA 11R22.5 LINEAL` = 0.

AFTER: `concept_query=llantas`; `period_month=2026-07`; match por token `llantas`↔`llanta`.

FRAME_STRATEGY: prefijo cerrado una vez (`fueron|son|eran` + `de`, o `relacionad[oa]s?` + `con`). `de`/`con` no son stopwords.

TOKEN_STRATEGY: secuencia contigua de tokens sobre `row.concepto` y `row.subcategoria`. No bolsa. No substring.

MORPHOLOGY_STRATEGY: `tokenEquivalent` bidireccional: igualdad, vocal+s (singular ≥5), consonante+es (singular ≥5, no termina en s/z), z↔ces. No strip-final-s. No stems intermedios.

NORTH_STAR: PASS (julio + LLANTA AT-36).

PERIOD_UNCHANGED: YES

SCOPE_UNCHANGED: YES

SQL_NEW: NO

DEPENDENCY_NEW: NO

001..038: PASS

SUITES:
- R-FOLIO-LANG 18/18 PASS
- R-FOLIO-TRUTH 21/21 PASS
- planner 61/61 PASS
- capabilities 57/57 PASS
- orchestrator 27/28; 1 preexistente en `4ff25f14` (`dejaron de comprar` espera `get_commercial_state`; planner vigente `commercial_trend`). NEW FAILURE = 0
- M2/M4/M5/M6/IGF/continuity 132/132 PASS
- TIER 1 8/8 PASS
- PRE-DEPLOY `--gate` PASS
- HTTP 5xx = 0
- HARNESS = 0
- `git diff --check` limpio

FILES:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-frame-morphology.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

RISKS:
- Morfología española incompleta a propósito (precisión > recall).
- Palabras de 4 letras en vocal+s no forman par (`aire` exacto sí).
- Sin mes el loader sigue fail-closed (fuera de slice).

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-SEARCH-FRAME-MORPHOLOGY-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
period_changed: false
scope_changed: false
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-CONCEPT-MORPHOLOGY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```
