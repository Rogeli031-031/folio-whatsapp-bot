# FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001

```yaml
task_id: "FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
live_db: false
base_main_sha: "6842f242e0916033c8b235f3cb47c5ccc5093696"
branch: "fix/director-ia-rentabilidad-current-month-forecast-source-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No siguiente tarea."
```

## Cambio

Selector determinista `selectIgfStatusSourceMode` en `askDirectorIa` / `igf_status`:

- mes abierto + lenguaje actual → `MINI_FORECAST_PROY` vía `loadIgfForecastMiniPayload` + `readIgfForecastMiniAuthoritative`
- presupuesto/compromiso/IGF original/plan original explícito → `IGF_COMMIT_SNAPSHOT` (`loadIgfCommitSnapshot` / `igf.compromiso_lines`), etiquetado compromiso
- mes resuelto anterior al mes CDMX vigente → `NEVER_CURRENT_MINI` (no mini de septiembre)

S1–S5 usan el mini PROY. S6 usa stored etiquetado. S7 sigue `month_close_result`. Mini ausente o fila/campo null → fail-closed `DATA_NOT_FOUND`; si hay compromiso se menciona solo como compromiso.

Planner: `igf_status` / deterioro se evalúan antes de `pre_close` para que S5 («rentabilidad proyectamos para cerrar») no caiga en `pre_meeting_brief`. Routing rentabilidad/utilidad operativa/resultado final → `igf_status` no se reabrió.

Cutoff verbal = `mini.upload_day`. `version_number` de `igf.versions` no se altera. No Date.now. No hardcoded Acapulco.

---

IMPLEMENTATION_SHA:
PENDING_COMMIT

BASE_MAIN_SHA:
6842f242e0916033c8b235f3cb47c5ccc5093696

S1_INTENT:
igf_status

S1_SOURCE_MODE:
MINI_FORECAST_PROY

S1_LOADER:
readIgfForecastMiniAuthoritative

S1_PERIOD:
2026-09

S1_CUTOFF:
2026-09-07 (mini.upload_day)

S1_VERSION:
2 (igf.versions; no alterada por PROY)

S1_PROJECTED_SALES_FIELD:
ventaTon

S1_PROJECTED_OPERATING_PROFIT_FIELD:
utilOperImporte

S1_PROJECTED_FINAL_RESULT_FIELD:
resultadoFinalImporte

S1_INCOME_FIELD:
ingreso

S1_OPERATING_EXPENSE_FIELD:
operativos

S1_CORPORATE_EXPENSE_FIELD:
corporativos

S1_TOTAL_EXPENSE_FIELD:
gasto

S1_OPERATING_FORMULA:
utilOperImporte = ingreso - operativos

S1_FINAL_FORMULA:
resultadoFinalImporte = utilOperImporte - corporativos

S5_SOURCE_MODE:
MINI_FORECAST_PROY

S6_SOURCE_MODE:
IGF_COMMIT_SNAPSHOT

S7_CURRENT_MINI_BLOCKED:
YES (month_close_result)

MINI_MISSING_FALLBACK:
DATA_NOT_FOUND (no stored-as-current)

COMMIT_LABEL_IF_EXPOSED:
compromiso

001..061:
PASS (61/61 en test/director-ia-rentabilidad-current-month-forecast-source.test.js)

SUITES:
R-RENT-CMFS 61/61 PASS
R-RENT-IGF routing 46/46 PASS
mini payload export PASS
IGF reviewable supports PASS
CEL conversational-executive-status PASS
PRE_CLOSE steering PASS
continuity PASS
TIER1 8/8 PASS
RUNTIME PASS
PRE-DEPLOY --gate PASS
forecast-magnitude 3 fails preexistentes en HEAD 005484a8 (Q3 CEL; A5 inherit plant_diagnosis; follow-up util/resultado ya no usaba pack de magnitud — en HEAD respondía "IGF/ARR chat no configurado"; este slice fail-closed DATA_NOT_FOUND). No reabiertos.

FILES:
lib/director-ia-chat.js
lib/director-ia-planner.js
test/director-ia-rentabilidad-current-month-forecast-source.test.js
test/director-ia-rentabilidad-executive-routing.test.js
docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001.md

RISKS:
Preguntas de utilidad operativa / resultado final en hilo forecast con corrida autoritativa siguen igf_status (FIX routing previo). Sin mini inyectado fallan cerrado. Fórmulas mini no se aplican a compromiso/FINAL.

SOURCE_SELECTOR_ADDED:
YES

CHAT_CHANGED:
YES

PLANNER_CHANGED:
YES (igf_status/deterioro antes de pre_close)

TOOL_ADDED:
NO

SQL_CHANGED:
NO

SERVER_CHANGED:
NO

FRONTEND_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPS_CHANGED:
NO

LIVE_DB_USED:
NO
