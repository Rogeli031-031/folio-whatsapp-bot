task_id: FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-11T12:20:19-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 811ff252661e0a7641cadfbb8e3bb43173611221
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001.md

objective: "Corregir el consumo del contrato resolvePlantCodes dentro de loadMonthCloseResultForChat para eliminar el TypeError (codes || []).map is not a function sin cambiar routing, fuentes financieras ni semántica temporal."

## Evidencia LIVE

Planta:
Acapulco

Pregunta:

¿Cómo cerramos agosto?

Error actual:

(codes || []).map is not a function

## Causa auditada

Producer:

lib/commercial-trend-engine.js
resolvePlantCodes

Contrato real:

{
  not_found,
  uniqueCodes: string[],
  plantCode,
  matchedMeta
}

Ejemplo:

{
  not_found: false,
  uniqueCodes: ["E3", "ACA"],
  plantCode: "E3",
  matchedMeta: [...]
}

Consumer incorrecto:

lib/director-ia-month-close-result.js
loadMonthCloseResultForChat

Actualmente trata la resolución completa como Array:

(codes || []).map(...)

El objeto es truthy y no implementa .map.

## Decisión humana

Corregir únicamente la frontera:

resolvePlantCodes
→ loadMonthCloseResultForChat

Consumir:

resolution.uniqueCodes

y respetar:

resolution.not_found

Usar como referencia el patrón correcto ya existente en:

client-profile
y/o
commercial-trend

No copiar comportamiento que cambie semántica.

## Prohibición específica

NO implementar:

Array.isArray(codes) ? codes : []

sobre el objeto de resolución.

Eso convertiría una resolución válida con:

uniqueCodes: ["E3","ACA"]

en array vacío y perdería identidad de planta.

## Compatibilidad

Si loadMonthCloseResultForChat soporta overrides de test o de dependencia
que legítimamente ya entregan:

plantCodesUpper: string[]

preservar ese contrato existente.

La normalización debe diferenciar:

A) resolución real resolvePlantCodes:
   object → uniqueCodes

B) override que contractualmente ya es Array:
   preservar Array

No inventar formatos adicionales.

## not_found

Si resolvePlantCodes devuelve:

not_found: true

no continuar fingiendo codes=[] como planta válida.

Preservar/fail-close según la semántica existente del loader.

No inventar planta.

## Alcance temporal

Preservar exactamente:

¿Cómo cerramos agosto?
→ month_close_result
→ mes explícito agosto
→ NO MINI_FORECAST_PROY septiembre

No cambiar:

CURRENT_OPEN_MONTH_CURRENT_STATE
MINI_FORECAST_PROY
igf_status
historical FINAL selection
forecast historical selection

## Alcance de fuente

Este FIX NO decide si agosto tiene FINAL real.

Su objetivo es que la ejecución supere la resolución de códigos
y continúe hacia la fuente histórica correspondiente.

Sin LIVE_DB:

no afirmar dato FINAL de agosto.

## Casos obligatorios

C1:
¿Cómo cerramos agosto?

Esperado:
- intent month_close_result
- no TypeError
- codes provenientes de uniqueCodes
- continúa al siguiente stage histórico

C2:
¿Cuál fue el resultado final de agosto?

Esperado:
- ruta igf_status existente
- sin cambios

C3:
¿Qué rentabilidad tuvimos en agosto?

Esperado:
- ruta igf_status existente
- sin cambios

C4:
¿Cómo cerramos julio?

Esperado:
- month_close_result
- no TypeError

C5:
¿Qué rentabilidad tenemos?

Esperado:
- MINI_FORECAST_PROY actual
- sin cambios

## Tests contractuales

001 C1 intent month_close_result
002 C1 route loadMonthCloseResultForChat
003 resolvePlantCodes returns object contract
004 resolution.uniqueCodes consumed
005 not resolution object .map
006 uniqueCodes ["E3","ACA"] preserved
007 uppercase normalization if existing contract requires it
008 duplicate handling preserved from existing logic
009 plantCode metadata not mistaken for codes array
010 matchedMeta not mistaken for codes

011 truthy object no longer TypeError
012 `(codes || []).map` broken path removed/replaced
013 no blind Array.isArray(object) => []
014 real resolution with 2 codes remains 2 codes

015 not_found true fail-closes correctly
016 not_found does not fabricate codes
017 not_found does not fall through as valid plant

018 existing plantCodesUpper array override preserved
019 override with ["E3","ACA"] preserved
020 existing unit tests using plantCodesUpper remain PASS

021 C1 proceeds past code resolution
022 C1 reaches historical source stage in stub
023 C1 does not use September mini
024 C1 source selector unchanged
025 C1 month remains 2026-08

026 C4 no TypeError
027 C4 month remains 2026-07

028 C2 routing unchanged
029 C3 routing unchanged
030 C5 MINI_FORECAST_PROY unchanged

031 current-month rentabilidad 61/61 PASS
032 month-close existing suite PASS

033 no SQL
034 no schema
035 no migration
036 no tool new
037 no endpoint
038 no server.js
039 no frontend
040 no dependency

041 no changes to commercial-trend-engine contract unless strictly required
042 no planner change
043 no current-month source selector change
044 no historical source-selection redesign
045 no FINAL semantics change

046 error path does not leak raw TypeError
047 DATA_NOT_FOUND/not_found remains truthful
048 no invented plant identity

049 regression client-profile resolution PASS
050 regression commercial-trend resolution PASS

051 Tier1 applicable PASS
052 runtime/pre-deploy gate applicable PASS
053 diff --check PASS
054 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

C1_INTENT:
C1_ROUTE:
C1_CODES_SOURCE:
C1_CODES:
C1_TYPEERROR_REMOVED:
C1_REACHES_HISTORICAL_SOURCE_STAGE:

C4_TYPEERROR_REMOVED:

RESOLVE_PLANT_CODES_RETURN_TYPE:
RESOLVE_PLANT_CODES_CODES_FIELD:
NORMALIZATION_POINT:
NOT_FOUND_BEHAVIOR:
ARRAY_OVERRIDE_PRESERVED:

C2_UNCHANGED:
C3_UNCHANGED:
C5_MINI_FORECAST_PROY_UNCHANGED:

001..054:
SUITES:
FILES:
RISKS:

MONTH_CLOSE_CHANGED:
COMMERCIAL_TREND_ENGINE_CHANGED:
PLANNER_CHANGED:
CHAT_CHANGED:
CURRENT_MONTH_SOURCE_SELECTOR_CHANGED:
SQL_CHANGED:
SERVER_CHANGED:
FRONTEND_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
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
No LIVE_DB.
No siguiente tarea.
