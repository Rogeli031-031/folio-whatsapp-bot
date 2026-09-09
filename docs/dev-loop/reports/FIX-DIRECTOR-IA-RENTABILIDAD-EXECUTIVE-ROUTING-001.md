# FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001

```yaml
task_id: "FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
live_db: false
base_main_sha: "ac055bd9945cce551851e2d608a4a91e7113fdbb"
branch: "fix/director-ia-rentabilidad-executive-routing-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. Sprint1 Q3 (descuento planta-mes) sigue en client_profile/discount_period; estaba fuera de este slice."
```

## Cambio

`isIgfStatusFinancialSnapshotQuestion` mapea a `igf_status` (antes de `commercial_trend`) las familias:

- rentabilidad (excepto deterioro)
- utilidad operativa
- resultado final

`askDirectorIa` ejecuta `loadIgfArrSourceBlocksForChat` y arma respuesta determinista desde `igf.compromiso_lines`. No OpenAI. No CEL TREND. No inherit `commercial_trend` (el intent ya no es unknown). El follow-up de magnitud forecast no secuestra `igf_status`.

Deterioro sigue en `financial_diagnosis`. Margen explícito sigue en `historical_margin`. `¿Cómo vamos?` sigue CEL. CASA 30d sigue `commercial_trend`.

---

IMPLEMENTATION_SHA:
98c5325a701d5188d8037f50f42ec4623d89637b

BASE_MAIN_SHA:
ac055bd9945cce551851e2d608a4a91e7113fdbb

S1_INTENT:
igf_status

S1_ROUTE:
askDirectorIa → detectDirectorIaIntent igf_status → skip CEL → skip magnitude follow-up → loadIgfArrSourceBlocksForChat → buildIgfStatusSnapshotChatResult

S1_TOOL:
get_igf_snapshot

S1_SOURCE:
igf.compromiso_lines

S1_PERIOD:
2026-09 (fallback currentYearMonthCdmx / resolveYearMonthFromQuestion)

S4_INTENT:
igf_status

S4_EXECUTIVE_STATUS_INTERCEPTED:
NO

COMMERCIAL_PARENT_PLUS_S1:
igf_status

COMMERCIAL_INHERIT_BLOCKED:
YES (detected intent is not unknown)

OPERATING_PROFIT_FIELD:
util_oper_importe / util_oper_kg

FINAL_RESULT_FIELD:
resultado_final_importe / resultado_final_kg

VARIABLES_PRESENTED:
venta_ton, margen_kg, com_desc_kg, impuesto_kg, hg_kg, gtos_apoyos_corp_kg

INCOME_RECONSTRUCTED:
NO

OPERATING_EXPENSE_RECONSTRUCTED:
NO

TOTAL_EXPENSE_RECONSTRUCTED:
NO

UNPROVABLE_FORMULA_STATED:
NO

CASA_PRESENT:
NO

COMISIONISTA_PRESENT:
NO

OLS_PRESENT:
NO

TRAILING_30D_PRESENT:
NO

001..061:
PASS (46 tests in test/director-ia-rentabilidad-executive-routing.test.js)

SUITES:
focal R-RENT-IGF 46/46 PASS
IGF composition (M7) PASS
R-RENT-CUT PASS
TIER1 8/8 PASS
pre-deploy --gate PASS
Sprint1 Q1/Q2/Q4 PASS; Q3 descuento preexistente (discount_period) no tocado

FILES:
lib/director-ia-planner.js
lib/director-ia-chat.js
test/director-ia-rentabilidad-executive-routing.test.js
test/director-ia-sprint1-core-conversational-recovery.test.js (Q2 routing only)
docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001.md

RISKS:
Preguntas solo con «utilidad» (sin operativa) no entran. «cómo va IGF» ahora usa el mismo handler determinista. Sprint1 Q3 descuento no se reabrió.

PLANNER_CHANGED:
YES

CHAT_CHANGED:
YES

CEL_PRECEDENCE_CHANGED:
YES (via planner intent no overridable + skip magnitude when igf_status). CEL module not edited.

INHERITANCE_CHANGED:
YES (implicit: non-unknown blocks commercial inherit). conversation-state.js not edited.

SQL_CHANGED:
NO

TOOL_ADDED:
NO

SERVER_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPS_CHANGED:
NO

LIVE_DB_USED:
NO
