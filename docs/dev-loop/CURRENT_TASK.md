task_id: FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-08T17:05:28-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN - HISTORICAL MARGIN compare_months HTTP STATUS ONLY. MAY SHOW EXISTING FORECAST CONTEXT TRUTHFULLY. NO FORECAST-TO-FORECAST DELTA. NO SQL. NO ROUTING. NO PLANNER. NO GENERIC HTTP HANDLER CHANGE. NO LIVE_DB. NO MERGE. NO DEPLOY."

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 8a59b251929b617890b4b4f5638df75f371e92ee
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001.md

## Problema demostrado

North Star Acapulco:

cual fue el margen en mayo?

PASS.

Mayo cerrado sin FINAL puede responder con contexto FORECAST
vigente, aproximadamente 7.35 $/kg, claramente NO presentado
como cierre real.

Pero:

cual fue el cambio en el margen entre mayo y junio?

produce HTTP 500.

Auditoría física:

- mismo intent: historical_margin
- parser correcto
- operation compare_months correcta
- no throw
- no Promise rejection
- DB/parser/routing no demostrados como bug

Root:

compare_months puede producir:

ok:false
code: DATA_NOT_FOUND
veracity: DATA_NOT_FOUND

pero SIN status.

handlePostChat usa:

result.status || (result.ok ? 200 : 500)

y sintetiza 500.

## Objetivo único

Eliminar el HTTP 500 sintético de compare_months
preservando la semántica histórica.

NO ampliar todavía la capacidad a delta
FORECAST-vs-FORECAST.

## Fuente del arreglo

Corregir en:

lib/director-ia-historical-margin.js

NO corregir globalmente en handlePostChat.

El productor de historical_margin debe entregar un status
HTTP explícito y coherente.

## Contrato compare_months

Todo resultado compare_months debe tener status explícito.

### Caso A — ambos periodos FINAL homogéneos

ok=true
status=200
SOURCE_AVAILABLE
comparable=true
delta_raw permitido

### Caso B — comparación atendible pero incompleta

Ejemplos:

- un periodo FINAL y otro no FINAL
- NOT_FINAL con forecast_context existente
- uno válido y otro missing
- contexto parcial defendible

Debe responder:

status=200
SOURCE_PARTIAL
comparable=false
delta_raw=null

Puede mostrar contexto existente FORECAST por periodo,
pero siempre etiquetado:

FORECAST
vista vigente
NO cierre FINAL

NO calcular delta entre forecasts.

### Caso C — ausencia real

Si ambos periodos carecen realmente de evidencia usable,
por ejemplo NO_VERSION sin forecast_context:

ok=false
status=404
DATA_NOT_FOUND

NO 500.

### Caso D — error real de fuente

SOURCE_ERROR real:

status=500

Preservar error real.

No convertir un SOURCE_ERROR en DATA_NOT_FOUND o 200.

## North Star esperado

Pregunta:

cual fue el cambio en el margen entre mayo y junio?

NO debe mostrar:

HTTP 500

Si mayo/junio no tienen FINAL homogéneo, respuesta equivalente:

"Mayo 2026 no tiene un margen FINAL defendible.
Existe contexto FORECAST vigente de 7.35 $/kg.

Junio 2026 [estado defendible].

No calculo variación histórica porque los dos periodos
no comparten semántica FINAL homogénea."

Si existe forecast de junio, puede mostrarse como FORECAST.

NO:

"el cambio fue X"

usando FORECAST-vs-FORECAST.

## Preservar

FORECAST != FINAL
ACTUAL_FINANCIAL != FORECAST
margen = planta
descuento/kg != margen
null != 0
DATA_NOT_FOUND != SOURCE_ERROR

single_month mayo
single_month junio
year_max
year_min
authorization
plant resolution

## No tocar

lib/director-ia-chat.js
handlePostChat
planner
routing
server.js
SQL
schema
dependencies
Financial Diagnosis
M9
ARR
temporal safety gate

## Regresiones obligatorias

001 reproduce before: compare no status -> synthetic 500
002 both FINAL -> status 200
003 both FINAL -> delta_raw correcto
004 both FINAL -> comparable true
005 NOT_FINAL + forecast context -> status 200
006 NOT_FINAL + forecast -> SOURCE_PARTIAL
007 NOT_FINAL + forecast -> comparable false
008 NOT_FINAL + forecast -> delta_raw null
009 forecast context explicitly FORECAST
010 forecast context not presented FINAL
011 no forecast-vs-forecast delta
012 both NO_VERSION -> status 404
013 both NO_VERSION -> DATA_NOT_FOUND
014 both NO_VERSION -> not 500
015 source error -> status 500
016 source error preserved
017 one FINAL + one missing -> status 200 partial
018 one FINAL + one missing -> no delta
019 one error + usable evidence preserves SOURCE_PARTIAL behavior
020 every compare_months result has explicit status
021 single mayo behavior unchanged
022 single junio behavior unchanged
023 single usable forecast remains 200
024 single true missing remains 404
025 single source error remains 500
026 parser "entre mayo y junio" unchanged
027 parser "de mayo a junio" unchanged
028 compare intent remains historical_margin
029 no OpenAI
030 no generic handlePostChat change
031 no planner change
032 no routing change
033 no SQL change
034 no schema
035 no dependencies
036 no LIVE_DB
037 historical margin focal tests pass
038 existing historical margin 35/35 preserved
039 Tier1 pass
040 pre-deploy gate PASS
041 NEW FAILURE=0

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW
commit implementation en rama FIX
reporte append-only
STOP

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente task.
closure_reason: "HUMAN REVIEW PASS. historical_margin compare_months now always returns an explicit HTTP status: 200 for comparable or partial usable evidence, 404 for true DATA_NOT_FOUND, and 500 only for real SOURCE_ERROR. FORECAST remains distinct from FINAL and no forecast-to-forecast delta was introduced."
