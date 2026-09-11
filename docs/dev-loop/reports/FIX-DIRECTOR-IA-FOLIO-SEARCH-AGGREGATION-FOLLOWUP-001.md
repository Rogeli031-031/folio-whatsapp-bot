# FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
sql_text_predicate_added: false
live_db: false
base_main_sha: "248997415d86c73bc5f9bf140901bbdc76c27c6b"
head_sha_at_start: "e639793e9a33840faf347799c6db3bc7a63d0112"
branch: "fix/director-ia-folio-search-aggregation-followup-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. C4/C5, OR conversacional y month-discovery quedan fuera."
```

## Hallazgo implementado

T1 (`¿Qué folios de enero a agosto contienen la palabra aceite?`) ahora escribe `conversation_state.folio_search_spec`: specification canónica saneada, sin filas ni totales.

T2 (`puedes sumarlos y darme un total por mes?`) se resuelve en la capa determinista de chat cuando hay `parent_intent=folio_search`, misma planta y spec válida. Reconsulta el universo completo con `inheritedFilters` + overlay `AGGREGATE/SUM/MONTH` y reutiliza `buildAggregate` existente. No reparsea T2. No suma las 40 filas visibles.

Sin antecedente, T2 permanece unknown/clarification.

---

IMPLEMENTATION_SHA:
PENDING_THIS_COMMIT

BASE_MAIN_SHA:
248997415d86c73bc5f9bf140901bbdc76c27c6b

STATE_FIELD_NAME:
folio_search_spec

STATE_WRITER:
buildFolioSearchChatResult → buildConversationState

STATE_SANITIZER:
sanitizeFolioSearchSpec / sanitizeEchoedState

STATE_READER:
askDirectorIa (follow-up detector) → loadFolioSearchForChat({ inheritedFilters, analysisOverride })

FOLIO_SEARCH_INHERITABLE:
YES (INHERITABLE_INTENTS). parent_intent solo NO hereda. Requiere spec válida + detector estrecho.

STATE_SPEC_SHAPE:
version, planta_id, scope, period_mode, period_month, period_start, period_end, period_field=mes_cargo, concept_mode, concept_query, concept_alternatives, operation

STATE_STORES_ROWS:
NO

STATE_STORES_AMOUNTS:
NO

STATE_PLANT_BOUND:
YES (mismatch DROP SPEC; no cross-plant)

T1_INTENT:
folio_search

T1_SEARCH_TERM:
aceite

T1_PERIOD:
RANGE 2026-01..2026-08

T1_UNIVERSE:
ALL_PUBLIC_FOLIOS

T1_STATE_WRITTEN:
YES

T2_EXACT_QUESTION:
puedes sumarlos y darme un total por mes?

T2_ROUTE:
deterministic chat follow-up (planner may still classify isolated T2 as unknown)

T2_INHERITED_SPEC:
YES (planta, scope, period, keyword, operation)

T2_ANALYSIS_MODE:
AGGREGATE

T2_AGGREGATION:
SUM

T2_GROUP_BY:
MONTH

T2_REQUERY:
YES (source re-executed; 8 mes_cargo)

T2_FULL_MATCH_SET:
YES

T2_DISPLAY_ROWS_USED_FOR_MATH:
NO

CANCELLED_LIST_BEHAVIOR:
present in T1 list

CANCELLED_AGGREGATE_BEHAVIOR:
excluded from T2 main aggregate

AMOUNT_LABEL:
importe registrado

GROUP_MONTH_FIELD:
mes_cargo

FRESH_CHAT_T2_BEHAVIOR:
unknown / clarification; no requery; no aceite inventado

CROSS_PLANT_BEHAVIOR:
spec dropped; T2 not executed

AUTH_RECHECKED:
YES (assertFolioStatusAccess on T2)

C4_COUNT_FOLLOWUP_CHANGED:
NO

C5_MONTH_REFINEMENT_CHANGED:
NO

EXPLICIT_AGGREGATE_REGRESSION:
PASS (cuánto suman los folios de enero a agosto de aceite?)

FOLLOWUP_EQUALS_EXPLICIT_FIXTURE:
PASS (same known_total / match_count / eligible / unknown on >40 fixture)

001..094:
PASS

SUITES:
- test/director-ia-folio-search-aggregation-followup.test.js 94/94 PASS
- test/director-ia-folio-keyword-range-search-parity.test.js PASS
- test/director-ia-folio-search-truthful.test.js PASS
- test/director-ia-folio-search-post-concept-analytic-tail.test.js PASS
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
- lib/director-ia-conversation-state.js
- lib/director-ia-folio-search.js
- lib/director-ia-chat.js
- test/director-ia-folio-search-aggregation-followup.test.js
- docs/dev-loop/CURRENT_TASK.md (solo status)
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001.md

RISKS:
El detector es estrecho (agregación explícita + «por mes» + spec). Otras anáforas (`súmalos` sin «por mes», `el total` suelto) no entran. Keyword substring sigue pudiendo coincidir fuera de concepto; no se cambió el matcher. `folio_search` está en INHERITABLE_INTENTS pero la herencia genérica unknown→parent está bloqueada para este intent.

FOLIO_SEARCH_CHANGED:
YES (inheritedFilters / analysisOverride / spec writer; mismo buildAggregate)

CONVERSATION_STATE_CHANGED:
YES

CHAT_CHANGED:
YES (T2 determinista; no inheritParentIntent=folio_search)

PLANNER_CHANGED:
NO

SQL_CHANGED:
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

OPENAI_MATH_USED:
NO

LIVE_DB_USED:
NO

---

## No implementado (fuera de slice)

- ¿cuántos fueron?
- ¿y solo julio?
- OR conversacional
- month discovery
- embeddings / sinónimos
