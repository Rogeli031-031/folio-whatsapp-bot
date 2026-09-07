task_id: FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-06T18:54:31-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - PROFITABILITY EXPENSE SUBTOPIC DATA FIX AUTHORIZED; REGRESSION_FIRST; COMMIT ON FIX BRANCH AUTHORIZED; NO LIVE_DB; NO MERGE; NO PUSH MAIN; NO DEPLOY"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 07ed179dc2a45ef4b86822da017de5f5c1ed1938

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

objective: Conectar a la conversación de rentabilidad los importes físicos OPERATIVOS, CORPORATIVOS y GASTO ya materializados en IGF Forecast Mini para responder comparaciones A/B dentro del active_subtopic, sin crear Delta Gastos ni nuevas fórmulas.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

## Diagnóstico congelado

CLASIFICACIÓN:

B. DATA_ALREADY_LOADED_BUT_DROPPED

FIRST_BAD_BOUNDARY:

readIgfForecastMiniAuthoritative

El mismo IGF Forecast Mini usado por el dashboard ya contiene:

rows[].operativos
rows[].corporativos
rows[].gasto

Director IA carga ese mini pero el adapter no conserva esos campos.

No crear otra fuente.

## Semántica obligatoria

rows[].operativos
= GASTO OPERATIVO

rows[].corporativos
= GASTO CORPORATIVO

rows[].gasto
= GASTO TOTAL

util_oper_importe
= RENTABILIDAD OPERATIVA

resultado_final_importe
= RENTABILIDAD FINAL

PROHIBIDO confundir gasto operativo con rentabilidad operativa.

## Evidencia visual LIVE de validación

Acapulco.

Agosto 2026:

OPERATIVOS:
9,664,071

CORPORATIVOS:
2,378,296

GASTO:
12,042,367

Septiembre 2026:

OPERATIVOS:
9,945,756

CORPORATIVOS:
2,561,700

GASTO:
12,507,456

Comparación B - A mostrada por el dashboard:

OPERATIVOS:
+281,685

CORPORATIVOS:
+183,404

GASTO:
+465,089

Estos valores son evidencia para validación humana.

NO hardcodearlos en código ni tests.

## North Star

T1:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

T2:
y gasto?

T3:
y corporativos?

T4:
¿cuánto subieron?

La continuidad conversacional ya funciona.

T4 debe volver a leer la fuente física para A/B y responder el comparativo correspondiente al active_subtopic.

## Regla de evidencia

conversation_state conserva contexto:

parent_intent
active_subtopic
active_period_months
planta

conversation_state NO almacena los importes financieros.

History NO es evidencia.

T4 debe volver a consultar la fuente autoritativa existente.

## Cambio mínimo esperado

1. lib/director-ia-dashboard-forecast-adapter.js

Preservar SIN RECALCULAR:

operativos
corporativos
gasto

2. lib/director-ia-rentabilidad-deterioro-snapshot.js

loadKpiForMonth debe conservar esos campos.

No modificar las métricas de rentabilidad existentes.

3. lib/director-ia-profitability-subtopic.js

Componer comparativo factual según active_subtopic:

expense.corporate -> corporativos
expense.operational -> operativos
expense / total -> gasto

4. lib/director-ia-chat.js

En probe cuantitativo contextual, volver a cargar A/B usando:

planta
active_period_months
active_subtopic

No guardar importes en state.

## Variación permitida

Solo:

B - A

sobre EL MISMO campo físico.

Nombrar:

variación de gasto corporativo
variación de gasto operativo
variación de gasto total

NO llamarlo Delta Gastos.

## Regression first

ANTES del cambio de producto demostrar rojo.

R-EXP-SUBTOPIC-001
adapter conserva rows[].operativos.

R-EXP-SUBTOPIC-002
adapter conserva rows[].corporativos.

R-EXP-SUBTOPIC-003
adapter conserva rows[].gasto.

R-EXP-SUBTOPIC-004
loadKpiForMonth conserva los tres campos.

R-EXP-SUBTOPIC-005
T1 conserva resultado_final_importe sin cambio.

R-EXP-SUBTOPIC-006
T1 conserva util_oper_importe como rentabilidad operativa y no lo sustituye por rows[].operativos.

R-EXP-SUBTOPIC-007
T3 conserva expense.corporate.

R-EXP-SUBTOPIC-008
T4 vuelve a consultar A/B.

R-EXP-SUBTOPIC-009
T4 corporate usa exclusivamente rows[].corporativos.

R-EXP-SUBTOPIC-010
T4 responde A, B y B-A correctamente.

R-EXP-SUBTOPIC-011
No llama Delta Gastos a B-A.

R-EXP-SUBTOPIC-012
No atribuye causalidad monetaria exacta.

R-EXP-SUBTOPIC-013
operativos usa exclusivamente rows[].operativos.

R-EXP-SUBTOPIC-014
gasto total usa exclusivamente rows[].gasto.

R-EXP-SUBTOPIC-015
sin conversation_state no inventa hilo financiero.

R-EXP-SUBTOPIC-016
plant mismatch no reutiliza contexto de otra planta.

R-EXP-SUBTOPIC-017
conversation_state no contiene importes de gasto.

R-EXP-SUBTOPIC-018
con evidencia disponible T4 no consulta Action Register ni OpenAI.

## Prohibido

NO Delta Gastos.
NO computeDeltaGastos.
NO delta_gastos.
NO deltaGastos.

NO util_oper_importe - resultado_final_importe.

NO reconstruir corporativos desde componentes.
NO reconstruir operativos desde componentes.
NO reconstruir gasto total.

NO usar gasto_kg como gasto total.

NO modificar fórmulas de server.js.

NO SQL nuevo.
NO DB/schema.
NO LIVE_DB.
NO nueva fuente.
NO hardcodes LIVE.
NO frontend.
NO planner salvo contradicción física y STOP.
NO docs/director-ia.
NO refactor masivo.
NO merge.
NO push main.
NO deploy.
NO next task.

## In scope

- lib/director-ia-dashboard-forecast-adapter.js
- lib/director-ia-rentabilidad-deterioro-snapshot.js
- lib/director-ia-profitability-subtopic.js
- lib/director-ia-chat.js
- tests/fixtures relacionados
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

## Validaciones

- R-EXP-SUBTOPIC-001..018
- active-subtopic 001..010
- T4 previo
- profitability followup
- rent-chat-cut
- rent-cut
- conversation-state
- continuity
- intra-session
- TIER 1
- PRE-DEPLOY --gate
- HTTP 5xx = 0
- HARNESS FAILURE = 0
- NEW FAILURE = 0
- git diff --check limpio

## Completion

DONE_PENDING_REVIEW.

Reporte: docs/dev-loop/reports/FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

STOP. Esperar revisión humana. No merge. No push main. No deploy. No next task.
