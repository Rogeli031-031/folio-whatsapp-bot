# FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001

IMPLEMENTATION_SHA:
PENDING_FIRST_COMMIT

BASE_MAIN_SHA:
8a59b251929b617890b4b4f5638df75f371e92ee

BEFORE:
B-001 compare_months mayo FORECAST + junio missing: `status` ausente, `ok:false`, HTTP sintético 500 = true
B-002 ambos FINAL: `status` ausente (HTTP 200 solo por `ok:true`) = true
B-003 ambos NO_VERSION: `DATA_NOT_FOUND` sin `status` → HTTP 500 = true
B-004 `forecast_context` no se mostraba en compare_answer = true
B-005 freeze/parser/single_month/delta FINAL ya PASS (28/42 verdes pre-código; 14 FAIL REGRESSION_FIRST)

STATUS_MODEL:
`compare_months` siempre asigna `status` + `code` + `veracity` en `loadHistoricalMarginForChat`.
`handlePostChat` no se tocó.

FINAL_COMPARE_MODEL:
Ambos `closed_month` + `valid` + `ACTUAL_FINANCIAL` → ok=true, status=200, SOURCE_AVAILABLE, comparable=true, delta_raw = B−A.

PARTIAL_COMPARE_MODEL:
Evidencia usable en al menos un periodo (`status=valid` o `forecast_context` válido) y no hay par FINAL homogéneo → ok=true, status=200, SOURCE_PARTIAL, comparable=false, delta_raw=null.
Incluye: un FINAL + missing; NOT_FINAL+forecast; ambos FORECAST; un error + evidencia usable.

FORECAST_CONTEXT_MODEL:
`comparePeriodLines` muestra por periodo:
«no tiene un margen FINAL defendible» + «Existe contexto FORECAST vigente de X $/kg. No lo presento como cierre real.»
No calcula delta FORECAST-vs-FORECAST.

DATA_NOT_FOUND_MODEL:
Ningún periodo usable y ningún SOURCE_ERROR → ok=false, status=404, DATA_NOT_FOUND.
Ejemplo: ambos NO_VERSION.

SOURCE_ERROR_MODEL:
Error de fuente en ambos (o error sin evidencia usable) → ok=false, status=500, SOURCE_ERROR.
No se convierte en 200 ni en DATA_NOT_FOUND.

FORECAST_DELTA_CREATED:
NO

001..041:
41/41 PASS. NEW FAILURE = 0.
039/040 del archivo focal cubren presencia de suites; TIER 1 y pre-deploy se ejecutaron aparte.

SUITES:
- focal R-HM-CMP: 42/42 (41 IDs + year extrema)
- historical_margin existente: 35/35
- TIER 1: 8/8
- pre-deploy --gate: PASS
- NEW FAILURE: 0

FILES:
- lib/director-ia-historical-margin.js
- test/director-ia-historical-margin-compare-http-status.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001.md

RISKS:
- El 500 sintético desaparece; si junio LIVE no tiene evidencia, la respuesta es 200 parcial o 404, no 500.
- No se demostró LIVE_DB.

CHAT_HANDLER_CHANGED:
NO

PLANNER_CHANGED:
NO

ROUTING_CHANGED:
NO

SQL_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPS_CHANGED:
NO

FINANCIAL_DIAGNOSIS_CHANGED:
NO

M9_CHANGED:
NO

ARR_CHANGED:
NO

LIVE_DB_USED:
NO

FINAL:
PASS

```yaml
task_id: "FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
files_touched:
  - "lib/director-ia-historical-margin.js"
  - "test/director-ia-historical-margin-compare-http-status.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001.md"
files_not_touched:
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-igf-arr.js"
  - "server.js"
  - "package.json"
  - "docs/director-ia/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARISON-500-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ninguna; no autorizada"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
base_main_sha: "8a59b251929b617890b4b4f5638df75f371e92ee"
live_db: false
```
