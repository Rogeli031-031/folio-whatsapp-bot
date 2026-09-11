# FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
sql_text_predicate_added: false
live_db: false
base_main_sha: "4807dc3416af90fc3d249ea542ce72c7fbfe2b03"
head_sha_at_start: "1bc90b93b9aff2325b6598fe0a62178a9e52b11d"
branch: "fix/director-ia-folio-keyword-tienen-palabra-parity-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No LIVE_DB. No siguiente tarea."
```

## Hallazgo implementado

`tienen la palabra X` era inequivalente a `contienen la palabra X`: el parser dejaba `tienen palabra aceite` y no activaba `keyword_search`. El span pierde `la` por tokens estructurales; el wrapper debe aceptar `(la )?palabra` y el hint exige `la palabra` en la pregunta completa.

No se tocó matcher, SQL, planner, chat, conversation-state, server ni frontend.

---

IMPLEMENTATION_SHA:
f527b112

BASE_MAIN_SHA:
4807dc3416af90fc3d249ea542ce72c7fbfe2b03

FIX_FILE:
lib/director-ia-folio-search.js

FIX_FUNCTIONS:
SEARCH_WRAPPER_RES, KEYWORD_HINT_RE, stripSearchWrappers, isKeywordSearchQuestion

PARSER_CHANGE:
YES (wrappers + hint only)

BEFORE_TIENEN_CONCEPT:
tienen palabra aceite

AFTER_TIENEN_CONCEPT:
aceite

CONTIENEN_OPERATION:
keyword_search

TIENEN_OPERATION:
keyword_search

FEBRUARY_CONTAINS_TERM:
aceite

FEBRUARY_HAS_TERM:
aceite

FEBRUARY_PERIOD_PARITY:
YES (SINGLE 2026-02)

FEBRUARY_RESULT_PARITY:
YES (mismo result set / count fixture)

JANUARY_MOTOR_CONTAINS_TERM:
motor

JANUARY_MOTOR_HAS_TERM:
motor

JANUARY_RESULT_PARITY:
YES

RANGE_CONTAINS_TERM:
aceite

RANGE_HAS_TERM:
aceite

RANGE_PERIOD_PARITY:
YES (RANGE 2026-01..2026-08)

RANGE_RESULT_PARITY:
YES

SUPPORTED_HAVE_VARIANTS:
tiene la palabra; tienen la palabra; que tiene la palabra; que tienen la palabra; que tenga la palabra; que tengan la palabra

NON_KEYWORD_HAVE_STATUS:
concept_sequence (tienen estatus PAGADO)

NON_KEYWORD_HAVE_RESPONSIBLE:
concept_sequence (tienen responsable)

MATCHER_CHANGED:
NO

SQL_CHANGED:
NO

PLANNER_CHANGED:
NO

CHAT_CHANGED:
NO

CONVERSATION_STATE_CHANGED:
NO

SERVER_CHANGED:
NO

FRONTEND_CHANGED:
NO

SCHEMA_CHANGED:
NO

TOOL_ADDED:
NO

ENDPOINT_ADDED:
NO

LIVE_DB_USED:
NO

AGGREGATION_FOLLOWUP_REGRESSION:
PASS

FOLIO_SEARCH_SPEC_REGRESSION:
PASS (T1 tienen → concept_query aceite + keyword_search; T2 hereda; fresh-chat fail-close; cross-plant DROP SPEC)

001..060:
PASS

SUITES:
- test/director-ia-folio-keyword-tienen-palabra-parity.test.js 60/60 PASS
- test/director-ia-folio-keyword-range-search-parity.test.js PASS
- test/director-ia-folio-search-aggregation-followup.test.js PASS
- test/director-ia-folio-search-truthful.test.js PASS
- test/director-ia-m2-folio-status.test.js PASS
- test/director-ia-m2-history.test.js PASS
- test/director-ia-m2-documents-metadata.test.js PASS
- test/director-ia-igf-reviewable-supports.test.js PASS
- test/director-ia-conversational-continuity.test.js PASS
- TIER 1 8/8 PASS
- pre-deploy --gate PASS
- NEW FAILURE = 0
- LIVE_DB: no

FILES:
- lib/director-ia-folio-search.js
- test/director-ia-folio-keyword-tienen-palabra-parity.test.js
- docs/dev-loop/CURRENT_TASK.md (solo status)
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001.md

RISKS:
El hint exige `la palabra` en la pregunta; no activa keyword por `tienen estatus/responsable/comprobaciones`. El wrapper acepta `palabra` opcionalmente precedida de `la` porque el extractor estructural descarta `la`. No se abrió detector de `tiene/tienen` suelto. Keyword substring sigue igual; no se cambió el matcher.

---

## No implementado (fuera de slice)

- Detector abierto de tiene/tienen
- Cambios de matcher, SQL, planner, chat, conversation-state, server, frontend
- Merge, push main, deploy, LIVE_DB, siguiente tarea
