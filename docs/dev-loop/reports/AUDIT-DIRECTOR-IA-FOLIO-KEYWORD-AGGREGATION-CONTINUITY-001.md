# AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001

```yaml
task_id: AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001
outcome: DONE
mode: READ_ONLY
implementation: false
code_changes: false
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
live_db: false
base_main_sha: "da57cc8c8162a4e189d6cbecf617716070cbe665"
head_at_start: "f9769e7c39e335e9700b429f97a7543a862e8d0f"
branch: audit/director-ia-folio-keyword-aggregation-continuity-001
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001.md
files_not_touched:
  - lib/
  - test/
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
  - sql/
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001"
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar esta auditoría."
  - "Si se acepta: autorizar un slice que persista la specification de folio_search (no las 40 filas) y trate T2 como follow-up AGGREGATE con requery. C4/C5 son diagnóstico; no ampliarlas automáticamente."
```

## Pregunta central

Tras T1 canónico (`¿Qué folios de enero a agosto contienen la palabra aceite?`), T2 (`puedes sumarlos y darme un total por mes?`) no puede operar sobre el mismo result set.

## FIRST_DIVERGENCE

`FOLIO_SEARCH_DOES_NOT_WRITE_CONVERSATION_STATE`

T1 entra a `folio_search` y `buildFolioSearchChatResult` deja filtros en `context_meta` / `folio_search`, pero **no escribe** `context_meta.conversation_state`.

El panel solo reenvía `res.context_meta.conversation_state`. Si no viene, conserva el estado previo o `null`. El antecedente de T1 no viaja a T2.

Efectos encadenados (no son la primera frontera):

1. `folio_search` no está en `INHERITABLE_INTENTS`. Aunque se forjara `parent_intent: folio_search`, `sanitizeEchoedState` lo anula.
2. Chat no hace `forceIntent` para folio_search.
3. `isFolioSearchQuestion(T2)` es false: exige `folios`/`apoyos` y periodo o concepto. T2 no los tiene.
4. Planner → `unknown` / `no_rule_matched` → clarificación.
5. Aunque T2 se forzara a `folio_search`, el loader reparsea solo T2 y falla: `Indica el mes (mes_cargo)`.

La agregación determinista **ya existe** para preguntas que restatan el spec (`cuánto suman los folios de enero a agosto de aceite?`): `analysis_mode=AGGREGATE`, grupo `mes_cargo`, excluye CANCELADO, usa el universo matched antes del slice 40.

## Continuidad: rows vs specification

El listado trunca a 40 **después** de matchear. `match_count`/`count` son el universo completo. Sumar `records` visibles sería incompleto.

Modelo correcto: **specification + requery** (mismo `queryReviewableSupportFolios` + matcher + `buildAggregate`). No guardar las 40 filas.

## AUDIT_RESULT

PREVIOUS_FOLIO_FIX_CONTRACT: FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002 — folio_search, ALL_PUBLIC_FOLIOS, mes_cargo Jan–Aug, keyword aceite, CANCELADO en listado, match_count antes de limit 40, sin OpenAI matching

C1_EXACT_QUESTION: ¿Qué folios de enero a agosto contienen la palabra aceite?
C1_INTENT: folio_search
C1_ROUTE: isFolioSearchQuestion → planner folio_search → loadFolioSearchForChat → buildFolioSearchChatResult (sin conversation_state)
C1_SEARCH_TERM: aceite
C1_UNIVERSE: ALL_PUBLIC_FOLIOS
C1_PERIOD: 2026-01..2026-08
C1_PERIOD_FIELD: mes_cargo
C1_MATCH_COUNT: FULL_MATCH_BEFORE_SLICE (no LIVE; count/match_count = |deduped|)
C1_DISPLAY_LIMIT: 40
C1_CONVERSATION_STATE_AFTER: ABSENT (context_meta no incluye conversation_state; client no actualiza)

C2_EXACT_QUESTION: puedes sumarlos y darme un total por mes?
C2_CURRENT_INTENT: unknown
C2_CURRENT_ROUTE: isFolioSearchQuestion=false → planner no_rule_matched → buildUnknownClarificationResult
C2_CURRENT_RESPONSE_CLASS: clarification / unknown (sin antecedente folio)
C2_INHERITS_FOLIO_DOMAIN: NO
C2_INHERITS_PLANT: NO (no hay parent folio; planta del request sí se revalida en T1)
C2_INHERITS_PERIOD: NO
C2_INHERITS_SEARCH_TERM: NO
C2_INHERITS_RESULT_SPEC: NO

STATE_WRITER_AFTER_T1: NONE (folio_search chat path no llama conversationStateForIntent)
STATE_SHAPE_AFTER_T1: conversation_state schema no tiene search_term/universe/match_mode; T1 solo deja context_meta suelto (period_*, concept_query, scope) y folio_search.filters
STATE_READER_ON_T2: resolveConversationTurn + sanitizeEchoedState sobre echoed conversation_state
FOLIO_SEARCH_STATE_PERSISTED: NO
FOLIO_RESULT_SET_REFERENCE_PERSISTED: NO

QUERY_PRE_TRUNCATES: NO
MATCH_COUNT_BEFORE_LIMIT: YES
DISPLAY_LIMIT: 40
AGGREGATION_MUST_USE_FULL_MATCH_SET: YES

RECOMMENDED_CONTINUITY_MODEL: SPECIFICATION_PLUS_REQUERY
WHY_ROWS_OR_SPEC: limit 40 es display; match_count puede ser mayor; conversation_state no debe cargar filas; requery reproduce matcher+planta
REQUERY_REQUIRED_FOR_COMPLETE_AGGREGATE: YES

AMOUNT_SOURCE: public.folios.importe (queryReviewableSupportFolios)
AMOUNT_FIELD: f.importe
AMOUNT_SEMANTIC: importe registrado en el folio; null/no finito = UNKNOWN; PAGADO no prueba gasto contable (copy existente)
SAFE_VISIBLE_LABEL: importe registrado

GROUP_MONTH_SOURCE: public.folios.mes_cargo (mismo campo del search)
GROUP_MONTH_FIELD: mes_cargo (projectRecord.periodo = row.mes_cargo)
GROUP_MONTH_FORMAT: YYYY-MM

STATUS_FIELD: f.estatus
CANCELLED_CANONICAL_VALUE: CANCELADO (uppercase trim)
CANCELLED_INCLUDED_IN_SEARCH_LIST: YES
CANCELLED_EXCLUDED_FROM_MAIN_AGGREGATE_RECOMMENDED: YES (ya implementado en AGGREGATE: eligible = !isCancelledStatus)
EXISTING_SYSTEM_PRECEDENT: loadFolioSearchForChat AGGREGATE; IGF reviewable mathRows filtra ESTADOS.CANCELADO

RECOMMENDED_AGGREGATION_SHAPE: reutilizar payload.analysis de buildAggregate (measure, known_total, aggregate_eligible_count, unknown_amount_count, months[].mes_cargo/known_subtotal/eligible_count). No inventar nombres.
RECOMMENDED_AGGREGATION_LAYER: folio_search follow-up mode (A) + requery helper ya existente (D). No intent nuevo. No tool nueva.
NEW_TOOL_REQUIRED: NO
NEW_SQL_REQUIRED: NO
LLM_MATH_ALLOWED: NO

C3_NO_ANTECEDENT_BEHAVIOR: unknown + clarificación. Correcto: no inventar spec.
C4_COUNT_FOLLOWUP_BEHAVIOR: también unknown (no folios/apoyos; match_count de T1 no persistido). Diagnóstico; no ampliar el FIX.
C5_MONTH_REFINEMENT_BEHAVIOR: unknown (no folios/apoyos). No hay spec que recortar a julio. Diagnóstico; no ampliar el FIX.

PLANT_BOUND_STATE: T1 filtra planta_id autorizada en query. Continuidad futura debe guardar planta_id en la spec.
AUTH_RECHECK_REQUIRED: YES (assertFolioStatusAccess en cada requery)
CROSS_PLANT_REUSE_ALLOWED: NO (sanitizeEchoedState ya limpia en plantMismatch)

FIRST_DIVERGENCE: FOLIO_SEARCH_DOES_NOT_WRITE_CONVERSATION_STATE

ROUTING_BUG: YES
CONTINUITY_BUG: YES
STATE_WRITE_BUG: YES
STATE_READ_BUG: YES (folio_search fuera de INHERITABLE_INTENTS y del forceIntent de chat)
RESULT_SET_BUG: NO
AGGREGATION_CAPABILITY_MISSING: NO_FOR_RESTATED_QUESTION; YES_FOR_PRONOUN_FOLLOWUP
DATA_BUG: NO
SQL_BUG: NO
PRESENTATION_BUG: NO

CAN_FIX_WITHOUT_NEW_SQL: YES
CAN_FIX_WITHOUT_NEW_TOOL: YES
CAN_FIX_WITHOUT_SERVER_CHANGE: YES
CAN_FIX_WITHOUT_FRONTEND_CHANGE: YES (el panel ya reenvía conversation_state)
CAN_FIX_WITHOUT_SCHEMA_CHANGE: YES

FILES_INSPECTED:
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md
- test/director-ia-folio-keyword-range-search-parity.test.js (Q.S1, Q.AGG)
- lib/director-ia-folio-search.js
- lib/director-ia-planner.js
- lib/director-ia-chat.js (folio_search dispatch, unknown, inherit whitelist)
- lib/director-ia-conversation-state.js (INHERITABLE_INTENTS, sanitizeEchoedState)
- lib/director-ia-igf-reviewable-supports.js (query + CANCELADO math)
- frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx

TESTS_RUN:
- inspección de código + contrato del FIX 002 (test 053/054 AGG + CANCELADO)
- no LIVE_DB
- sonda temporal no ejecutada / no commiteada

RISKS:
- Reparsear T2 como búsqueda nueva inventaría un concept_query basura y no tendría periodo.
- "por mes" no debe reinterpretarse como mes actual.
- Sumar records[0:40] mentiría si match_count > 40.
- Meter folio_search en INHERITABLE_INTENTS sin spec canónica heredaría un parent vacío.
- C4/C5 no deben colarse en el primer FIX.

RECOMMENDED_NEXT_SLICE: FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001 — persistir specification (planta, universe, mes_cargo range, search_term, match_mode, filtros), heredarla en T2, requery + buildAggregate. No tool. No SQL. No C4/C5. No autorizado.
