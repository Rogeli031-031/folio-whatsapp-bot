# FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001

```yaml
task_id: FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001
outcome: DONE
mode: REGRESSION_FIRST
implementation: true
code_changes: true
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
origin_main: "811ff252661e0a7641cadfbb8e3bb43173611221"
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
files_touched:
  - lib/director-ia-month-close-result.js
  - test/director-ia-month-close-resolve-plant-codes-shape.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001.md
files_not_touched:
  - lib/commercial-trend-engine.js
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - lib/director-ia-tools.js
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar. No merge. No push main. No deploy."
```

## Expected delivery

IMPLEMENTATION_SHA: (commit de este reporte en la rama fix)
BASE_MAIN_SHA: 811ff252661e0a7641cadfbb8e3bb43173611221

C1_INTENT: month_close_result
C1_ROUTE: loadMonthCloseResultForChat
C1_CODES_SOURCE: resolvePlantCodes.uniqueCodes
C1_CODES: ["E3","ACA"]
C1_TYPEERROR_REMOVED: YES
C1_REACHES_HISTORICAL_SOURCE_STAGE: YES (stub: loadTarget + loadForecast + loadFinancialActual)

C4_TYPEERROR_REMOVED: YES

RESOLVE_PLANT_CODES_RETURN_TYPE: object
RESOLVE_PLANT_CODES_CODES_FIELD: uniqueCodes
NORMALIZATION_POINT: codesUpperFromResolvePlantCodes after await resolveCodes in loadMonthCloseResultForChat
NOT_FOUND_BEHAVIOR: codesUpper=[] ; no query de venta; limitation sales_actual_unavailable; no códigos inventados
ARRAY_OVERRIDE_PRESERVED: YES (plantCodesUpper string[])

C2_UNCHANGED: YES (igf_status / NEVER_CURRENT_MINI)
C3_UNCHANGED: YES (igf_status / NEVER_CURRENT_MINI)
C5_MINI_FORECAST_PROY_UNCHANGED: YES (2026-09)

001..054: PASS (54/54)
SUITES:
- test/director-ia-month-close-resolve-plant-codes-shape.test.js 54 PASS
- test/director-ia-month-close-result.test.js PASS (via 032)
- test/director-ia-client-profile.test.js PASS (via 049)
- test/director-ia-commercial-trend.test.js PASS (via 050)
- rentabilidad funcional 001-047 PASS (S1 mini; S7 agosto NEVER_CURRENT_MINI). El 061 de esa suite es allowlist sucia de otro slice y no mide C5.

FILES:
- lib/director-ia-month-close-result.js
- test/director-ia-month-close-resolve-plant-codes-shape.test.js

RISKS:
- loadOnePlantBlock en executive-cycle-composer sigue con el mismo shape bug; fuera de este FIX (C1 no lo usa).
- not_found sigue la semántica previa del loader (limitation, pack parcial), no un 404 nuevo.

MONTH_CLOSE_CHANGED: YES
COMMERCIAL_TREND_ENGINE_CHANGED: NO
PLANNER_CHANGED: NO
CHAT_CHANGED: NO
CURRENT_MONTH_SOURCE_SELECTOR_CHANGED: NO
SQL_CHANGED: NO
SERVER_CHANGED: NO
FRONTEND_CHANGED: NO
SCHEMA_CHANGED: NO
TOOL_ADDED: NO
ENDPOINT_ADDED: NO
LIVE_DB_USED: NO

## Cambio

Se retiró `(codes || []).map`.

- Override `plantCodesUpper`: `string[]` intacto.
- Resolución real: `uniqueCodes` del object. `not_found === true` no usa uniqueCodes.
- Un array colado como resolution no se toma como códigos.

No se tocó planner, chat, mini PROY, FINAL, SQL, server ni frontend.
