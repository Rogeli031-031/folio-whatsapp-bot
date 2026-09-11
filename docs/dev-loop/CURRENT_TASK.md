task_id: AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001

task_type: AUDIT
mode: READ_ONLY

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T14:24:16-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 3be41f59a88c417394431987fb3c4faa7b312bb9
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001.md

objective: "Determinar por qué ArrClient construye la fila Agosto 2026 y month_close_result cae en DATA_MISSING al intentar construir VISIBLE_NOT_FINAL para el mismo periodo."

## Evidencia LIVE

Planta:
Acapulco

Pregunta:

¿Cómo cerramos agosto?

Resultado actual:

Acapulco — Agosto 2026

Datos financieros no disponibles.

Venta comercial:
1,504.39 t

Meta/compromiso del periodo: no cargada.

También:

Dame el cierre financiero de agosto.

produce el mismo DATA_MISSING.

En cambio:

¿Qué rentabilidad tenemos?

responde correctamente con:

MINI_FORECAST_PROY
Septiembre 2026
corte 11/09/2026

Este comportamiento de septiembre es correcto.
NO tocarlo.

## North Star esperado

Para Agosto 2026, el dashboard ya demuestra que existe
una vista financiera histórica visible.

Por tanto, si month_close puede obtener
la misma vista defendible del MISMO periodo:

financial.presentation.state

debe poder ser:

VISIBLE_NOT_FINAL

y no:

DATA_MISSING.

NO convertirla en FINAL.

## Alcance único

Comparar físicamente:

DASHBOARD

ArrClient
→ fetchIgfForecast(include_mini)
→ GET /api/dashboard/igf-forecast
→ buildIgfForecastPayload
→ computeIgfForecastMiniPayload
→ mini.rows
→ fila Acapulco Agosto 2026

VERSUS

MONTH CLOSE

isMonthCloseQuestion
→ loadMonthCloseResultForChat
→ chatDeps.loadIgfForecastMiniPayload
→ loadIgfForecastMiniPayloadForDirectorIa
→ computeIgfForecastMiniPayload
→ findMiniRowForPlant
→ financial.presentation
→ VISIBLE_NOT_FINAL | DATA_MISSING

Encontrar FIRST_PARITY_GAP.

## No auditar nuevamente

Ya está probado:

- resolvePlantCodes shape FIX funciona;
- month_close llega a 2026-08;
- composer A/B/C existe;
- DATA_MISSING hace fail-close correctamente;
- septiembre current month usa MINI_FORECAST_PROY correctamente;
- dashboard histórico no implica FINAL.

No reabrir esos contratos.

## In scope

Solo lectura de:

frontend-dashboard/app/arr/ArrClient.tsx
frontend-dashboard/lib/api.ts
server.js
lib/director-ia-month-close-result.js
lib/director-ia-chat.js
lib/director-ia-dashboard-forecast-adapter.js

y helpers directamente llamados por esos paths.

Puede inspeccionar:

computeIgfForecastMiniPayload
loadIgfForecastMiniPayloadForDirectorIa
findMiniRowForPlant
resolveUploadDayForMonth
buildIgfForecastPayload

y dependencias estrictamente necesarias.

## Out of scope

NO cambios al composer.
NO cambios de copy A/B/C.
NO selectIgfStatusSourceMode.
NO MINI_FORECAST_PROY septiembre.
NO planner.
NO resolvePlantCodes.
NO historical-margin.
NO SQL nuevo.
NO schema.
NO migration.
NO tool nueva.
NO endpoint nuevo.
NO frontend change.
NO server change.
NO LIVE_DB.
NO deploy.
NO merge.
NO push main.

## Hipótesis a probar — no asumir

H1 DEPENDENCY/WIRING

¿chatDeps.loadIgfForecastMiniPayload existe realmente en runtime
y apunta al wrapper correcto?

Entregar:

CHAT_DEP_NAME:
CHAT_DEP_INJECTION_POINT:
CHAT_DEP_RUNTIME_TARGET:
CHAT_DEP_PRESENT:
CHAT_DEP_OPTIONAL_OR_REQUIRED:

## H2 ARGUMENT SHAPE

Comparar argumentos exactos.

Dashboard:

fetchIgfForecast(...)
→ year
→ month
→ include_mini
→ upload_day / corte si aplica

Month close:

loadIgfForecastMiniPayload(...)
→ ?

Entregar:

DASHBOARD_MINI_CALL_ARGS:
MONTH_CLOSE_MINI_CALL_ARGS:

ARG_YEAR_PARITY:
ARG_MONTH_PARITY:
ARG_PLANT_PARITY:
ARG_CUTOFF_PARITY:
ARG_VERSION_PARITY:

## H3 CUTOFF

Este punto es prioritario.

Trazar físicamente:

resolveUploadDayForMonth

y determinar:

- qué fecha usa ArrClient para Agosto 2026;
- si el backend recibe upload_day;
- si el mini cambia su construcción cuando upload_day está ausente;
- qué hace month_close al no pasar upload_day.

Entregar:

DASHBOARD_CUTOFF_SOURCE:
DASHBOARD_CUTOFF_VALUE_RULE:
MONTH_CLOSE_CUTOFF_SOURCE:
MONTH_CLOSE_PASSES_UPLOAD_DAY:

UPLOAD_DAY_REQUIRED_FOR_HISTORICAL_MINI:
UPLOAD_DAY_ABSENCE_EFFECT:

No inventar el valor concreto de agosto sin LIVE_DB.

## H4 PERIOD BINDING

Confirmar:

month_close resolveCloseMonth
→ 2026-08

y después comprobar que esa misma pareja:

year=2026
month=8

llega hasta:

computeIgfForecastMiniPayload

No basta con que month_close resuelva agosto correctamente;
debe comprobarse la llamada final.

Entregar:

RESOLVED_CLOSE_PERIOD:
MINI_REQUESTED_PERIOD:
MINI_RETURNED_PERIOD:

PERIOD_PARITY:

## H5 RETURN SHAPE

Determinar shape real de:

loadIgfForecastMiniPayloadForDirectorIa

¿Devuelve directamente?

{
  year,
  month,
  rows
}

¿o?

{
  ok,
  payload: {...}
}

¿o?

{
  mini: {...}
}

¿otro?

Entregar:

DASHBOARD_MINI_SHAPE:
DIRECTOR_WRAPPER_RETURN_SHAPE:
MONTH_CLOSE_EXPECTED_SHAPE:

SHAPE_PARITY:
SHAPE_FIRST_DIVERGENCE:

No arreglar shape.

## H6 PLANT MATCH

Auditar:

findMiniRowForPlant

y los campos reales presentes en mini.rows.

Para fixture/code-only determinar si compara:

nombre
planta_nombre
plant_code
provincia
clave
otro

Month close puede tener:

Acapulco
E3
ACA

Demostrar cuáles manda.

Entregar:

MINI_ROW_PLANT_FIELDS:
MONTH_CLOSE_PLANT_NAME:
MONTH_CLOSE_PLANT_CODE:
FIND_MINI_ROW_MATCH_RULE:

PLANT_MATCH_POSSIBLE:
PLANT_MATCH_FIRST_DIVERGENCE:

No asumir que E3 debe coincidir con label.

## H7 FINANCIAL-VALUE GATE

VISIBLE_NOT_FINAL requiere que la fila tenga al menos
un valor financiero defendible.

Trazar exactamente el predicate.

Entregar:

VISIBLE_NOT_FINAL_REQUIRED_FIELDS:
VISIBLE_NOT_FINAL_GATE_FUNCTION:

Si mini row existe pero queda DATA_MISSING:

demostrar qué campo/gate lo causa.

## H8 SWALLOWED ERROR

Auditar todos los:

try/catch
.catch(...)
optional dependency guards
fallbacks

entre:

loadIgfForecastMiniPayload
y
financial.presentation

Determinar si un error de loader/compute es convertido silenciosamente en:

historical_mini = null

o equivalente.

Entregar:

ERROR_SWALLOW_POINT:
ERROR_TYPE_VISIBLE_TO_CALLER:
DATA_MISSING_CAUSED_BY_SWALLOW_POSSIBLE:

No cambiar logging.

## Dashboard vs Director parity table

Entregar una tabla conceptual:

FIELD | DASHBOARD | MONTH_CLOSE | PARITY

para:

year
month
upload_day
plant identifier
version rule
compute function
return shape
row matcher
required financial fields

## Sondas READ_ONLY

Puede crear/ejecutar pruebas o sondas temporales READ_ONLY
sin cambiar producto.

Reproducir con fixtures:

S1
dashboard-style invocation August

S2
month-close-style invocation August

Usar el mismo fixture base.

La comparación debe revelar cuál condición hace que:

S1 → row available

y

S2 → DATA_MISSING

si puede reproducirse sin LIVE_DB.

Si no puede reproducirse:

marcar:

NOT_REPRODUCIBLE_WITHOUT_LIVE_DB

y explicar el dato faltante.

No activar LIVE_DB.

## Preguntas de control

C1:
¿Cómo cerramos agosto?

Esperado routing:
month_close_result

C2:
Dame el cierre financiero de agosto.

Esperado:
month_close_result

C3:
¿Cómo cerramos julio?

Misma auditoría de path histórico.

C4:
¿Qué rentabilidad tenemos?

Debe permanecer:

igf_status
MINI_FORECAST_PROY
current month

No tocar.

## FIRST_PARITY_GAP

Debe ser UNA frontera física concreta.

Ejemplos aceptables:

MONTH_CLOSE_DOES_NOT_PASS_UPLOAD_DAY

DIRECTOR_WRAPPER_RETURNS_DIFFERENT_SHAPE

FIND_MINI_ROW_PLANT_MATCH_FAILS

CHAT_DEP_NOT_INJECTED

HISTORICAL_MINI_COMPUTE_THROWS_AND_IS_SWALLOWED

otro demostrado.

No responder simplemente:

"month-close no encuentra mini".

## Clasificación

Determinar:

WIRING_BUG:
ARGUMENT_BUG:
CUTOFF_BUG:
PERIOD_BUG:
SHAPE_BUG:
PLANT_MATCH_BUG:
VALUE_GATE_BUG:
ERROR_SWALLOW_BUG:
DATA_BUG:
COMPOSER_BUG:
CURRENT_MONTH_SOURCE_BUG:

Composer bug esperado:
NO

Current-month source bug esperado:
NO

## Fixability

Entregar:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_NEW_ENDPOINT:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

No implementar.

## Entrega exacta

AUDIT_RESULT:

C1_INTENT:
C1_ROUTE:
C2_INTENT:
C2_ROUTE:
C3_ROUTE:
C4_CURRENT_MONTH_ROUTE:

DASHBOARD_PATH:
MONTH_CLOSE_PATH:

CHAT_DEP_NAME:
CHAT_DEP_INJECTION_POINT:
CHAT_DEP_RUNTIME_TARGET:
CHAT_DEP_PRESENT:
CHAT_DEP_OPTIONAL_OR_REQUIRED:

DASHBOARD_MINI_CALL_ARGS:
MONTH_CLOSE_MINI_CALL_ARGS:

ARG_YEAR_PARITY:
ARG_MONTH_PARITY:
ARG_PLANT_PARITY:
ARG_CUTOFF_PARITY:
ARG_VERSION_PARITY:

DASHBOARD_CUTOFF_SOURCE:
DASHBOARD_CUTOFF_VALUE_RULE:
MONTH_CLOSE_CUTOFF_SOURCE:
MONTH_CLOSE_PASSES_UPLOAD_DAY:
UPLOAD_DAY_REQUIRED_FOR_HISTORICAL_MINI:
UPLOAD_DAY_ABSENCE_EFFECT:

RESOLVED_CLOSE_PERIOD:
MINI_REQUESTED_PERIOD:
MINI_RETURNED_PERIOD:
PERIOD_PARITY:

DASHBOARD_MINI_SHAPE:
DIRECTOR_WRAPPER_RETURN_SHAPE:
MONTH_CLOSE_EXPECTED_SHAPE:
SHAPE_PARITY:
SHAPE_FIRST_DIVERGENCE:

MINI_ROW_PLANT_FIELDS:
MONTH_CLOSE_PLANT_NAME:
MONTH_CLOSE_PLANT_CODE:
FIND_MINI_ROW_MATCH_RULE:
PLANT_MATCH_POSSIBLE:
PLANT_MATCH_FIRST_DIVERGENCE:

VISIBLE_NOT_FINAL_REQUIRED_FIELDS:
VISIBLE_NOT_FINAL_GATE_FUNCTION:

ERROR_SWALLOW_POINT:
ERROR_TYPE_VISIBLE_TO_CALLER:
DATA_MISSING_CAUSED_BY_SWALLOW_POSSIBLE:

DASHBOARD_VS_MONTH_CLOSE_PARITY_TABLE:

S1_DASHBOARD_STYLE_RESULT:
S2_MONTH_CLOSE_STYLE_RESULT:
REPRODUCED_WITHOUT_LIVE_DB:

FIRST_PARITY_GAP:

WIRING_BUG:
ARGUMENT_BUG:
CUTOFF_BUG:
PERIOD_BUG:
SHAPE_BUG:
PLANT_MATCH_BUG:
VALUE_GATE_BUG:
ERROR_SWALLOW_BUG:
DATA_BUG:
COMPOSER_BUG:
CURRENT_MONTH_SOURCE_BUG:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_NEW_ENDPOINT:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte append-only:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001.md

Commit auditoría.

STOP.

No implementación.
No siguiente tarea.
No merge.
No push main.
No deploy.
No LIVE_DB.
closure_reason: "HUMAN REVIEW PASS. La primera divergencia física entre ArrClient y month_close histórico es WRAPPER_CONNECT_HEURISTIC_THROWS_ON_CHECKED_OUT_CLIENT."

human_root_cause: "loadMonthCloseResultForChat ya adquiere un pg.Client y lo entrega a loadIgfForecastMiniPayloadForDirectorIa. Ese wrapper espera un Pool/root DB owner y vuelve a ejecutar .connect(), provocando throw antes de computeIgfForecastMiniPayload."

human_fix_boundary: "El siguiente slice debe corregir únicamente el ownership/argumento del DB handle para la carga del mini histórico. No tocar composer, planner, MINI_FORECAST_PROY, resolvePlantCodes ni source selectors."

human_cutoff_decision: "La ausencia de upload_day NO explica DATA_MISSING: el compute puede producir filas sin ese argumento. La paridad exacta de cutoff queda fuera de este FIX y se validará después en LIVE."

human_swallow_decision: "El catch que convierte el error del mini histórico en historical_mini=null explica por qué LIVE falla cerrado como DATA_MISSING. No ampliar este slice a rediseñar logging/error policy."
