# IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001

```yaml
task_id: IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001
outcome: DONE
mode: REGRESSION_FIRST
implementation: true
code_changes: true
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
origin_main: "63fc66f0d74863b0ee825f7444a95308d1e9ee3e"
branch: implementation/director-ia-month-close-financial-variables-composition-001
secrets_check: "none"
live_db: false
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "C2 'Dame el cierre financiero de agosto' caía en pre_meeting por isPreCloseQuestion (cierre + de). Ajuste mínimo en isFinalCloseCue (executive-cycle-composer), no en planner.js."
files_touched:
  - lib/director-ia-month-close-result.js
  - lib/director-ia-chat.js
  - lib/director-ia-executive-cycle-composer.js
  - test/director-ia-month-close-financial-variables-composition.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001.md
files_not_touched:
  - lib/director-ia-planner.js
  - lib/director-ia-historical-margin.js
  - lib/director-ia-tools.js
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar esta implementación."
  - "No merge. No push main. No deploy."
```

## Expected delivery

IMPLEMENTATION_SHA: (commit de este reporte)
BASE_MAIN_SHA: 63fc66f0d74863b0ee825f7444a95308d1e9ee3e

PRESENTATION_SHAPE: `assembled.financial.presentation` = `{ state, source, period, is_final, values }`
PRESENTATION_STATE_VALUES: FINAL | VISIBLE_NOT_FINAL | DATA_MISSING

FINAL_SOURCE: `financial.actual` stored FINAL (`util_oper_importe`, `resultado_final_importe`, tasas FINANCE_PROVIDED). Volumen CASA/COMISIONISTA/venta = ARR comercial, etiquetado aparte. No rellena operativos/corporativos/gasto importe desde mini.
VISIBLE_NOT_FINAL_SOURCE: latest IGF (`margen_kg`, `com_desc_kg`, `impuesto_kg`, `hg_pct`, `hg_kg`) + `computeIgfForecastMiniPayload` del mismo YYYY-MM (vía `loadIgfForecastMiniPayload`) + ARR venta/categoría.
DATA_MISSING_BEHAVIOR: fail-close financiero; conserva venta comercial si existe; dice «datos financieros no disponibles»; no inventa ceros.

HISTORICAL_MINI_FUNCTION: `opts.loadIgfForecastMiniPayload` → `computeIgfForecastMiniPayload` (server, in-process; sin HTTP). Match de fila: `findMiniRowForPlant`.
HISTORICAL_MINI_PERIOD_BINDING: se pide `year/month` del cierre (`resolveCloseMonth`). Si el payload trae otro YYYY-MM, se rechaza (no mini de septiembre para agosto).

C1_INTENT: month_close_result
C1_PERIOD: 2026-08
C1_PRESENTATION_STATE: VISIBLE_NOT_FINAL (fixture no FINAL + vista disponible)
C1_CURRENT_MONTH_MINI_BLOCKED: YES

VENTA_FIELD: `values.venta_ton` ← `sales.actual_ton` (ARR)
CASA_FIELD: `values.casa_ton` ← `channels.casa_ton`
COMISIONISTA_FIELD: `values.comisionista_ton` ← `channels.comisionista_ton`
MARGEN_FIELD: `values.margen_mxn_kg` ← IGF latest `margen_kg`
DESCUENTO_FIELD: `values.descuento_mxn_kg` ← `-abs(com_desc_kg)` (`dashboardDescSigned`)
IMPUESTOS_FIELD: `values.impuestos_mxn_kg` ← `impuesto_kg`
HG_FIELD: `values.hg_pct` ← `hg_pct * 100` (display %)
HG_DOLLAR_FIELD: `values.hg_mxn_kg` ← `abs(hg_kg / hg_pct)`
OPERATIVOS_FIELD: `values.operativos_mxn` ← mini.operativos
CORPORATIVOS_FIELD: `values.corporativos_mxn` ← mini.corporativos
GASTO_FIELD: `values.gasto_mxn` ← mini.gasto
OPERATING_PROFIT_FIELD: `values.rentabilidad_operativa_mxn` ← mini.utilOperImporte
FINAL_RESULT_FIELD: `values.resultado_final_mxn` ← mini.resultadoFinalImporte (RENTAB UI)

DISCOUNT_PRESENTATION_RULE: `-abs(com_desc_kg)` IGF; no sustituye `discount.per_kg` ARR
HG_PRESENTATION_RULE: `hg_pct * 100` con redondeo a 2 decimales de porcentaje
HG_DOLLAR_FORMULA: `abs(hg_kg / hg_pct)`; null si denominador 0/null; nunca NaN/Infinity
OPERATING_PROFIT_FORMULA: mini `ingreso - operativos` (identidad del builder; no se recalcula en month-close)
FINAL_RESULT_FORMULA: mini `utilOperImporte - corporativos`

NOT_FINAL_LABEL: `VISTA FINANCIERA DISPONIBLE — NO FINAL`
GENERIC_GAPS_SUPPRESSED: YES — respuesta determinista; no incluye fuentes/acciones/movimientos genéricos

C2_BEHAVIOR: month_close_result + A/B/C + etiqueta NO FINAL si B. `isFinalCloseCue` ahora reconoce `cierre financiero` + mes nombrado para no perderlo en PRE_CLOSE.
C3_UNCHANGED: YES (`igf_status` + `NEVER_CURRENT_MINI`)
C4_UNCHANGED: YES (`historical_margin`)
C5_MINI_FORECAST_PROY_UNCHANGED: YES (septiembre)
C6_PERIOD: 2026-07

001..097: PASS (98/98 en `test/director-ia-month-close-financial-variables-composition.test.js`)
SUITES:
- test/director-ia-month-close-result.test.js PASS
- test/director-ia-pre-close-steering.test.js PASS
- test/director-ia-historical-margin.test.js PASS
- test/director-ia-client-profile.test.js PASS
- test/director-ia-commercial-trend.test.js PASS
- current-month rentabilidad 001-047 funcionales PASS (el 061 de ese archivo es fence de git de otro slice)
FILES:
- lib/director-ia-month-close-result.js
- lib/director-ia-chat.js
- lib/director-ia-executive-cycle-composer.js
- test/director-ia-month-close-financial-variables-composition.test.js
RISKS:
- Vista B no es FINAL; un lector puede igual confundir «Resultado final de esta vista» con cierre contable si ignora la etiqueta.
- FINAL no tiene operativos/corporativos/gasto importe stored; se muestran n/d a propósito.
- `isFinalCloseCue` ampliado solo para `cierre financiero` + mes; PRE_CLOSE de junta/zona se preservó.

MONTH_CLOSE_CHANGED: YES
COMPOSER_CHANGED: YES
CHAT_CHANGED: YES (pasa `loadIgfForecastMiniPayload`; respuesta determinista si hay presentation)
PLANNER_CHANGED: NO
HISTORICAL_MARGIN_CHANGED: NO
CURRENT_MONTH_SOURCE_SELECTOR_CHANGED: NO
SQL_CHANGED: NO
SERVER_CHANGED: NO
FRONTEND_CHANGED: NO
SCHEMA_CHANGED: NO
TOOL_ADDED: NO
ENDPOINT_ADDED: NO
LIVE_DB_USED: NO
