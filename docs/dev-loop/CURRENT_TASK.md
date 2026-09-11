task_id: FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T14:44:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: ccee6a22b0df20aafb472afd45f78c729a502431
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001.md

objective: "Corregir el ownership del DB handle usado por month_close_result al cargar el mini histórico, evitando pasar un pg.Client ya adquirido a un wrapper que espera Pool y eliminando el falso DATA_MISSING causado por Client.connect()."

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

## Causa probada

Ruta actual:

loadMonthCloseResultForChat(pool, ...)
→ acquire()
→ db = pg.Client
→ opts.loadIgfForecastMiniPayload(db, ...)
→ loadIgfForecastMiniPayloadForDirectorIa(db,...)
→ wrapper trata db como Pool
→ db.connect()
→ pg.Client.connect()
→ throw
→ catch
→ historical_mini = null
→ DATA_MISSING

Dashboard correcto:

pool.connect()
→ pg.Client
→ computeIgfForecastMiniPayload(client,...)

## FIRST_PARITY_GAP

WRAPPER_CONNECT_HEURISTIC_THROWS_ON_CHECKED_OUT_CLIENT

## Decisión de implementación

Corregir el call-site/ownership.

El loader runtime:

loadIgfForecastMiniPayloadForDirectorIa

debe recibir el DB root/Pool que contractualmente espera,
NO el pg.Client ya adquirido por month_close.

El fix preferido es en:

lib/director-ia-month-close-result.js

sin modificar server.js.

No cambiar el contrato global del wrapper si no es necesario.

## Contrato

La función inyectada:

opts.loadIgfForecastMiniPayload

en runtime está configurada como:

loadIgfForecastMiniPayloadForDirectorIa

y espera un objeto capaz de adquirir su propio client.

Por lo tanto month_close no debe pasarle:

db = checked-out Client

cuando también dispone de:

pool = root Pool.

## Historical mini call

Antes:

opts.loadIgfForecastMiniPayload(db, {
  year,
  month,
  plantName,
  plantCode
})

Deseado conceptualmente:

opts.loadIgfForecastMiniPayload(pool, {
  year,
  month,
  plantName,
  plantCode
})

si ese es el contrato físico probado.

No inventar otra abstracción.

## Fixtures / injected dependencies

Preservar tests y dependencias inyectadas razonables.

`historicalMini` directo debe seguir funcionando.

Si un test inyecta loadIgfForecastMiniPayload:
debe probar el contrato correcto de ownership.

No añadir compatibilidad ambigua Client-or-Pool basada en heurísticas nuevas.

No detectar por nombre de constructor.

No hacer:

if (db.connect) ...

porque un pg.Client también tiene connect().

## No tocar wrapper

Preferencia fuerte:

NO modificar:

loadIgfForecastMiniPayloadForDirectorIa

si basta corregir el argumento en month_close.

La auditoría determinó:

CAN_FIX_WITHOUT_SERVER_CHANGE = YES.

Si Cursor concluye que server.js es imprescindible:
STOP.
No ampliar alcance.

## No tocar catch

El catch actual de historical mini queda fuera de alcance.

Este FIX elimina la excepción conocida aguas arriba.

No rediseñar errores/logging.

## Cutoff / upload_day

FUERA DE ALCANCE de este FIX.

Se sabe que:

ArrClient sí pasa upload_day.
month_close no.

Pero la auditoría demostró:

UPLOAD_DAY_REQUIRED_FOR_HISTORICAL_MINI = NO

y su ausencia no causa DATA_MISSING.

No agregar upload_day ahora.

Después de LIVE se validará paridad numérica.

## Periodo

C1 Agosto:
2026-08

C3 Julio:
2026-07

No cambiar resolveCloseMonth.

No current-month fallback.

## Plant match

No tocar findMiniRowForPlant.

La auditoría demostró que:

Acapulco
→ exact match 100

No es el bug.

## Presentation

No tocar:

financial.presentation
FINAL
VISIBLE_NOT_FINAL
DATA_MISSING

La composición A/B/C ya funciona.

Después de que historical mini cargue,
el estado existente debe poder seleccionar:

VISIBLE_NOT_FINAL

si hay valores defendibles.

## Septiembre actual

Pregunta:

¿Qué rentabilidad tenemos?

Debe permanecer:

igf_status
→ MINI_FORECAST_PROY
→ Septiembre 2026

No tocar selectIgfStatusSourceMode.

## North Star de regresión

Con fixture equivalente al runtime:

Pool
→ month_close acquires Client para sus queries
→ mini loader recibe Pool
→ wrapper adquiere su propio Client
→ compute mini
→ devuelve row Acapulco
→ financial.presentation = VISIBLE_NOT_FINAL

No Client.connect() sobre checked-out client.

## Tests obligatorios

001 C1 intent month_close_result
002 C1 period 2026-08
003 month_close acquires Client for normal queries
004 acquired Client remains used for sales/target/forecast/financial paths

005 mini loader receives Pool/root handle
006 mini loader does NOT receive acquired pg.Client
007 runtime wrapper can call pool.connect once
008 wrapper-acquired Client reaches compute mini
009 no second connect on month-close acquired Client
010 pg.Client.connect throw reproduced pre-fix fixture

011 pre-fix fixture yields DATA_MISSING
012 post-fix fixture yields mini row
013 post-fix presentation VISIBLE_NOT_FINAL
014 no mutation to financial_state
015 no promotion to FINAL

016 historicalMini direct override preserved
017 direct historicalMini does not call loader
018 injected loader called with root handle
019 injected loader receives year
020 injected loader receives month
021 injected loader receives plantName
022 injected loader receives plantCode

023 C1 mini requested 2026-08
024 C1 returned period 2026-08 accepted
025 C1 current September mini not used

026 C3 July requested 2026-07
027 C3 no August/September contamination

028 findMiniRowForPlant unchanged
029 Acapulco matcher regression PASS
030 codes shape fix regression PASS

031 financial.presentation FINAL behavior unchanged
032 VISIBLE_NOT_FINAL behavior unchanged
033 DATA_MISSING behavior unchanged when mini truly absent
034 defendable-values gate unchanged

035 composer unchanged
036 generic gaps behavior unchanged
037 copy unchanged

038 C2 cierre financiero agosto route unchanged
039 C2 receives same corrected historical mini path

040 C4 current-month route unchanged
041 C4 MINI_FORECAST_PROY September unchanged

042 no upload_day addition
043 no cutoff logic change
044 no version rule change

045 no server.js
046 no wrapper modification
047 no SQL
048 no schema
049 no migration
050 no new tool
051 no endpoint
052 no frontend

053 no planner change
054 no historical-margin change
055 no resolvePlantCodes change
056 no source-selector change

057 month-close existing suite PASS
058 financial composition suite PASS
059 current-month profitability suite PASS
060 historical-margin focal PASS
061 client-profile regression PASS
062 commercial-trend regression PASS

063 diff --check PASS
064 applicable gate PASS
065 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

ROOT_DB_HANDLE_TYPE:
MONTH_CLOSE_ACQUIRED_HANDLE_TYPE:
MINI_LOADER_HANDLE_BEFORE:
MINI_LOADER_HANDLE_AFTER:

FIX_FILE:
FIX_FUNCTION:
FIX_SIGNATURE_OR_LINE:

SERVER_CHANGED:
WRAPPER_CHANGED:
MONTH_CLOSE_CHANGED:

C1_PERIOD:
C1_MINI_REQUEST_PERIOD:
C1_MINI_ROW_FOUND:
C1_PRESENTATION_STATE:
C1_CLIENT_RECONNECT_ERROR_REMOVED:

C2_BEHAVIOR:
C3_PERIOD:
C4_CURRENT_MINI_UNCHANGED:

HISTORICAL_MINI_OVERRIDE_PRESERVED:
INJECTED_LOADER_CONTRACT:

UPLOAD_DAY_ADDED:
CUTOFF_CHANGED:
VERSION_RULE_CHANGED:

001..065:
SUITES:
FILES:
RISKS:

SQL_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
FRONTEND_CHANGED:
PLANNER_CHANGED:
COMPOSER_CHANGED:
SOURCE_SELECTOR_CHANGED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit implementación.

Crear reporte append-only:

docs/dev-loop/reports/FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
closure_reason: "HUMAN REVIEW PASS. month_close_result entrega el Pool/root al historical-mini loader en lugar del pg.Client ya adquirido, eliminando el Client.connect() inválido que provocaba falso DATA_MISSING."

human_acceptance: "PASS 65/65. El Client adquirido por month_close se conserva para sus queries normales; únicamente el historical-mini loader recibe el root Pool y adquiere su propio Client conforme a su contrato."

scope_preserved: "No server.js, wrapper, composer, planner, resolvePlantCodes, historical-margin, source selector, SQL, schema, tool, endpoint ni frontend."

cutoff_decision: "No se agregó upload_day. La ausencia de cutoff no causaba DATA_MISSING; la paridad numérica exacta con ArrClient se validará después del deploy."

live_validation_pending: "Validar en Acapulco que ¿Cómo cerramos agosto? y Dame el cierre financiero de agosto dejen DATA_MISSING y entren a VISIBLE_NOT_FINAL. Luego comparar cifra por cifra contra la fila Agosto 2026 del dashboard."
