task_id: FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-09T16:43:02-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-09"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 6842f242e0916033c8b235f3cb47c5ccc5093696
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001.md

objective: "Hacer que preguntas actuales de rentabilidad del mes abierto usen el mismo mini forecast PROY vigente que la tabla IGF Forecast, preservando el snapshot stored para presupuesto/compromiso."

## North Star LIVE

Planta:
Acapulco

Fecha actual de pruebas:
2026-09-09

Pregunta:

¿Qué rentabilidad tenemos?

ANTES, incorrecto para estado actual:

Fuente:
igf.compromiso_lines

Venta:
1506.4 t

Utilidad operativa:
3373573 MXN

Resultado final:
955783 MXN

DASHBOARD VIGENTE observado:

Venta forecast PROY:
1466.01 t

Ingreso:
12860573 MXN

Operativos:
9938767 MXN

Corporativos:
2561700 MXN

Gasto:
12500467 MXN

Utilidad operativa:
2921806 MXN

Resultado final:
360106 MXN

Corte:
07/09/2026

## Decisión humana de fuente

Para MES ACTUAL ABIERTO y lenguaje actual:

¿Qué rentabilidad tenemos?
¿Cómo estamos de rentabilidad?
¿Qué utilidad operativa tenemos?
¿Cuál es el resultado final?
¿Qué rentabilidad proyectamos para cerrar septiembre?

usar:

computeIgfForecastMiniPayload
/
loadIgfForecastMiniPayload
/
readIgfForecastMiniAuthoritative

según la arquitectura física existente.

Debe ser la misma semántica de la tabla IGF Forecast mini.

NO usar compromiso stored como fuente principal en estos casos.

## Presupuesto / compromiso

Si el usuario pide explícitamente:

presupuesto
presupuestada
compromiso
comprometido
IGF original
plan original

usar:

loadIgfCommitSnapshot
igf.compromiso_lines

NO sustituirlo por mini PROY.

Ejemplo:

¿Cuál era la rentabilidad presupuestada de septiembre?

=> universo A, stored.

## Mes histórico

El mini forecast del MES ACTUAL no puede responder por un mes histórico.

Ejemplo:

¿Cómo cerramos agosto?

NO usar mini septiembre.

Preservar el path histórico/FINAL existente.

Si el path existente no entrega FINAL defendible:

DATA_NOT_FOUND / NOT_FINAL

No ampliar cierre histórico en este slice.

## Cutoff

Cuando se use mini forecast:

preservar y exponer el cutoff real del payload.

Para evidencia observada:

07/09/2026

No hardcodear esa fecha.

Debe provenir de metadata/campo físico del mini.

No usar fecha actual como sustituto del cutoff.

## Version

Preservar:

version_number del IGF seleccionado.

El recálculo PROY no crea una nueva versión.

No presentar cutoff como version.

## Venta

En el mini:

ventaTon
=
PROYECCIÓN DE VENTA DEL MES

No llamarla:

venta real
venta al corte
compromiso
meta

Wording:

Venta proyectada del mes

Preservar:

VENTA OBSERVADA AL CORTE
!= PROY VENTA DEL MES
!= COMPROMISO IGF

## Shape de rentabilidad actual

Respuesta esperada conceptualmente:

Acapulco — proyección vigente de septiembre 2026 al corte 07/09/2026.

Utilidad operativa proyectada:
$2,921,806

Se forma con:
- Ingreso proyectado: $12,860,573
- Gastos operativos proyectados: $9,938,767

Resultado final proyectado:
$360,106

Después de:
- Gastos corporativos proyectados: $2,561,700

Gasto total proyectado:
$12,500,467

Variables:
- Venta proyectada del mes: 1,466.01 t
- Margen: 7.12 MXN/kg
- Comisiones y descuentos: -0.16 MXN/kg
- Impuestos: 0.93 MXN/kg
- HG: -1.81 MXN/kg

Los valores deben provenir del payload real.
NO hardcodear cifras.

## Fórmulas autorizadas para mini forecast

La auditoría probó físicamente:

utilOperImporte = ingreso - operativos

resultadoFinalImporte = utilOperImporte - corporativos

Puede explicarse esa descomposición.

No generalizar estas fórmulas a otros universos sin evidencia.

## Source selection

Agregar una selección determinista de universo para igf_status.

Conceptualmente:

CURRENT_OPEN_MONTH_CURRENT_STATE
=> MINI_FORECAST_PROY

EXPLICIT_PROJECTION_CURRENT_MONTH
=> MINI_FORECAST_PROY

EXPLICIT_BUDGET_COMMITMENT
=> IGF_COMMIT_SNAPSHOT

PAST_MONTH
=> NEVER_CURRENT_MINI

No usar LLM para elegir la fuente.

## Tool

NO crear tool nueva.

El loader mini ya está disponible como dependencia del chat.

`get_igf_snapshot` puede seguir siendo metadata/capability existente;
no redefinir su contrato si no es necesario.

El handler puede usar el loader ya inyectado.

## SQL / servidor

NO SQL nuevo.
NO endpoint nuevo.
NO server.js.
NO frontend.

## Ausencia del mini

Si la pregunta requiere MINI_FORECAST_PROY y:

- mini no existe;
- planta no existe en mini;
- valor requerido es null;
- fuente falla;

NO hacer fallback silencioso al compromiso stored presentándolo como actual.

Responder de forma veraz:

DATA_NOT_FOUND / proyección vigente no disponible

Puede indicar que existe un compromiso IGF por separado,
pero debe etiquetarlo como compromiso si se muestra.

## Preserve

Preservar el FIX anterior:

rentabilidad
utilidad operativa
resultado final
=> igf_status

Preservar precedencia sobre CEL commercial trend.

Preservar ruptura de herencia commercial_trend.

Preservar preguntas explícitas de margen.

Preservar "¿Cómo vamos?" genérico.

Preservar CASA 30 días.

## North Star tests

S1:
¿Qué rentabilidad tenemos?

S2:
¿Cómo estamos de rentabilidad?

S3:
¿Qué utilidad operativa tenemos?

S4:
¿Cuál es el resultado final?

S5:
¿Qué rentabilidad proyectamos para cerrar septiembre?

S6:
¿Cuál era la rentabilidad presupuestada de septiembre?

S7:
¿Cómo cerramos agosto?

S8:
¿Qué margen tenemos?

## Regresiones obligatorias

001 S1 intent = igf_status
002 S1 source = MINI_FORECAST_PROY
003 S1 period = 2026-09
004 S1 uses mini authoritative loader
005 S1 does not use commit snapshot as current truth
006 S1 cutoff comes from mini metadata
007 S1 version preserved
008 S1 ventaTon labelled projected monthly sales
009 S1 does not label ventaTon observed
010 S1 does not label ventaTon commitment

011 S1 util_oper = utilOperImporte
012 S1 final = resultadoFinalImporte
013 S1 income = ingreso
014 S1 operating expense = operativos
015 S1 corporate expense = corporativos
016 S1 total expense = gasto

017 S1 formula util_oper = ingreso - operativos
018 S1 formula final = util_oper - corporativos
019 S1 values are projected wording
020 S1 no CASA
021 S1 no COMISIONISTA
022 S1 no OLS
023 S1 no trailing 30d

024 S2 source mini
025 S3 source mini
026 S4 source mini
027 S5 source mini
028 S5 projected-close wording

029 S6 source = IGF_COMMIT
030 S6 does not use mini as budget
031 S6 stored values labelled budget/commitment

032 S7 never uses current September mini
033 S7 preserves existing historical/final path
034 S7 no fabricated FINAL

035 S8 preserves margin semantics

036 mini missing => no silent stored-current fallback
037 plant missing mini => DATA_NOT_FOUND
038 utilOperImporte null => no invented value
039 resultadoFinalImporte null => no invented value

040 cutoff is not Date.now replacement
041 cutoff is not version
042 version is not modified by PROY
043 no arr.forecast_mensual claimed as mini P&L source

044 observed != projected invariant preserved
045 projected != commitment invariant preserved

046 source selector deterministic
047 no OpenAI source selection

048 no SQL
049 no new tool
050 no server.js
051 no frontend
052 no schema
053 no dependencies
054 no LIVE_DB

055 prior rentabilidad routing focal PASS
056 mini payload focal PASS
057 IGF focal PASS
058 CEL focal PASS
059 continuity/inheritance focal PASS
060 Tier1 + pre-deploy gate PASS
061 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

S1_INTENT:
S1_SOURCE_MODE:
S1_LOADER:
S1_PERIOD:
S1_CUTOFF:
S1_VERSION:

S1_PROJECTED_SALES_FIELD:
S1_PROJECTED_OPERATING_PROFIT_FIELD:
S1_PROJECTED_FINAL_RESULT_FIELD:

S1_INCOME_FIELD:
S1_OPERATING_EXPENSE_FIELD:
S1_CORPORATE_EXPENSE_FIELD:
S1_TOTAL_EXPENSE_FIELD:

S1_OPERATING_FORMULA:
S1_FINAL_FORMULA:

S5_SOURCE_MODE:
S6_SOURCE_MODE:
S7_CURRENT_MINI_BLOCKED:

MINI_MISSING_FALLBACK:
COMMIT_LABEL_IF_EXPOSED:

001..061:
SUITES:
FILES:
RISKS:

SOURCE_SELECTOR_ADDED:
CHAT_CHANGED:
PLANNER_CHANGED:
TOOL_ADDED:
SQL_CHANGED:
SERVER_CHANGED:
FRONTEND_CHANGED:
SCHEMA_CHANGED:
DEPS_CHANGED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW
commit implementación
reporte append-only

STOP.

No merge.
No push main.
No deploy.
No siguiente tarea.
