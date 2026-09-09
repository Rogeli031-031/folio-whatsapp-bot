# FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001

```yaml
task_id: "FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
live_db: false
base_main_sha: "0a42123768829df7543888d0f84a0b084cf8645f"
branch: "fix/director-ia-client-largest-sales-loss-route-to-calendar-compare-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
```

IMPLEMENTATION_SHA:
bbe664873d8c63d20482e00631550098d7bb2062

BASE_MAIN_SHA:
0a42123768829df7543888d0f84a0b084cf8645f

BEFORE_ROUTE:
client_profile (S1 en base_main: isCommercialMoversQuestion no reconoce pérdida/caída)

AFTER_ROUTE:
commercial_trend → calendar_compare

LOSS_SEMANTIC:
mayor pérdida / perdió más / mayor caída / cliente con mayor pérdida
sobre universo calendar_compare

LOSS_CANDIDATE_RULE:
delta_kg < 0 y tipo ∈ {disminucion, perdido}
excluye aumento, nuevo, sin_cambio

LOSS_RANK_RULE:
raw_delta_ascending
worst_delta = MIN(delta_kg)
winner = delta_kg === worst_delta
NO abs(delta)

STOPPED_BUYER_INCLUDED:
YES

DECREASED_BUYER_INCLUDED:
YES

ABS_RANK_USED:
NO

S1_INTENT:
commercial_trend

S1_PERIOD_KIND:
calendar_compare

S1_PERIOD_A:
2026-05 (2026-05-01..2026-05-31)

S1_PERIOD_B:
2026-06 (2026-06-01..2026-06-30)

S1_OPENAI_CALLED:
NO

S3_SEMANTIC_UNCHANGED:
YES (solo disminucion; no incluye perdido)

S5_SEMANTIC_UNCHANGED:
YES (solo perdido)

S6_SEMANTIC_UNCHANGED:
YES (solo aumento)

TIE_MODEL:
empate exacto: reportar todos los winners ordenados por nombre; first_mover=null; no elegir uno.

001..054:
55/55 PASS (001–054 + 033b). NEW FAILURE = 0.

SUITES:
- focal R-LOSS: 55/55
- commercial-trend existente: PASS
- client-profile existente: PASS
- commercial-movers-additive: PASS
- TIER 1: 8/8
- pre-deploy --gate: PASS
- NEW FAILURE: 0

FILES:
- lib/director-ia-commercial-trend.js
- lib/director-ia-conversation-state.js
- lib/director-ia-chat.js
- test/director-ia-client-largest-sales-loss-route.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001.md

RISKS:
- «mayor pérdida» sin «venta» y con «cliente» entra al ranking (lista humana). «margen» está excluido.
- first_mover de calendar_compare no-loss sigue ordenando por |delta|. No se usa para North Star.
- ZERO_OBSERVED de client_profile no se tocó.

PLANNER_CHANGED:
NO
El planner ya consume isCommercialTrendQuestion → isCommercialMoversQuestion.

CLIENT_PROFILE_CHANGED:
NO

SQL_CHANGED:
NO
defaultQueryCalendarClientKg idéntico a base_main (salvo CRLF de working copy).

SCHEMA_CHANGED:
NO

DEPS_CHANGED:
NO

SERVER_CHANGED:
NO

M9_CHANGED:
NO

FINANCIAL_DIAGNOSIS_CHANGED:
NO

HISTORICAL_MARGIN_CHANGED:
NO

LIVE_DB_USED:
NO

CONVERSATION_STATE_CHANGED:
YES (mínimo)
profileFollowUp no hereda client_profile si isCommercialTrendQuestion(question).
Necesario para 039: identidad heredada no roba S1.

CHAT_CHANGED:
YES (mínimo)
forceIntent=client_profile no se aplica si la pregunta ya es commercial_trend.
No altera handlePostChat HTTP. No toca server.js.

## Qué se hizo

1. `isLargestSalesLossQuestion` en el detector que ya usa el planner.
2. `selectLargestSalesLoss` sobre `all_calendar_movers` (universo existente).
3. Respuesta determinista: kg_a, kg_b, pérdida, dejó de comprar / disminuyó.
4. S3–S6 intactos vía `requestedMoverTipo` (la pregunta de pérdida no pide tipo de lista).

## Ejemplo obligatorio

Cliente A 20000→12000 (−8000, disminucion)
Cliente B 15000→0 (−15000, perdido)
Cliente UP 1000→51000 (+50000, aumento)

Ganador: Cliente B. OpenAI no selecciona.

STOP.
