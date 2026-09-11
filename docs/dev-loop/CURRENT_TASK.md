task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001

task_type: AUDIT
mode: READ_ONLY

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T11:57:26-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 3cba82240905eff97dd7d87cab09535f801de4ba
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001.md

objective: "Localizar físicamente el TypeError (codes || []).map is not a function al responder preguntas históricas de cierre mensual y determinar el contrato correcto de codes, la ruta histórica y la fuente FINAL/NOT_FINAL sin implementar."

## Evidencia LIVE

Planta:
Acapulco

Pregunta:

¿Cómo cerramos agosto?

Resultado:

(codes || []).map is not a function

## Contexto inmediato

La pregunta:

¿Qué rentabilidad tenemos?

ya funciona correctamente para septiembre abierto usando:

MINI_FORECAST_PROY

No reabrir esa implementación.

Para agosto histórico, el FIX anterior bloqueó correctamente usar el mini de septiembre.

La auditoría debe comenzar después de esa selección temporal.

## Objetivo principal

Encontrar la expresión física equivalente a:

(codes || []).map(...)

y demostrar:

- quién produce codes;
- quién consume codes;
- tipo esperado;
- tipo real;
- shape real;
- primera frontera donde cambia el contrato;
- por qué `codes || []` no evita el TypeError.

No implementar.

## Trace obligatorio

Trazar:

¿Cómo cerramos agosto?
→ planner
→ intent
→ source selector
→ ruta histórica
→ handler
→ loader/helper/tool
→ resolución FINAL/FORECAST/NOT_FINAL
→ codes
→ consumer
→ .map
→ TypeError

Usar nombres físicos reales.

## Preguntas de control

C1:
¿Cómo cerramos agosto?

C2:
¿Cuál fue el resultado final de agosto?

C3:
¿Qué rentabilidad tuvimos en agosto?

C4:
¿Cómo cerramos julio?

C5:
¿Qué rentabilidad tenemos?

C5 debe continuar usando MINI_FORECAST_PROY del mes actual
y NO compartir el error.

Determinar qué preguntas históricas llegan a la misma ruta rota.

## `codes`

Buscar todas las definiciones y usos relevantes de `codes`
en esta ruta.

Para cada frontera documentar:

FUNCTION
INPUT_SHAPE
OUTPUT_SHAPE
CODES_TYPE
CODES_EXAMPLE

Determinar si es:

Array<string>
string
object
Set
Map
null
otro

No asumir.

## TypeError

Entregar:

TYPEERROR_FILE
TYPEERROR_FUNCTION
TYPEERROR_LINE_OR_SIGNATURE
TYPEERROR_EXPECTED_TYPE
TYPEERROR_ACTUAL_TYPE

Explicar físicamente por qué:

codes || []

solo protege null/undefined/falsy,
pero no protege un object/string truthy no-array.

## Ruta histórica

Determinar el intent y route reales.

No asumir que necesariamente es month_close_result.

Posibles nombres deben comprobarse físicamente:

month_close_result
igf_status
historical_margin
financial_diagnosis
otro

## Fuente histórica

Determinar qué intenta leer agosto:

- FINAL histórico;
- forecast histórico;
- compromiso stored;
- igf-financial-final;
- otra fuente.

Entregar:

HISTORICAL_SOURCE
HISTORICAL_STATE_FIELD
HISTORICAL_PERIOD_RULE
HISTORICAL_VERSION_RULE

## Estados

Auditar soporte real para:

FINAL
FORECAST
NOT_FINAL
DATA_NOT_FOUND

No inventar que agosto tiene FINAL si la auditoría sin LIVE_DB no puede demostrar el dato.

## Invariante temporal

Debe seguir siendo cierto:

¿Cómo cerramos agosto?
→ NO MINI_FORECAST_PROY de septiembre.

Entregar:

CURRENT_MINI_BLOCKED_FOR_AUGUST
SEPTEMBER_MINI_USED
SOURCE_SELECTION_REGRESSION

## Causalidad

Determinar si el error:

PREEXISTED_BEFORE_22E7E22D
INTRODUCED_BY_22E7E22D
EXPOSED_BY_22E7E22D

Comparar historia Git y ejecutar stubs/unit tests si es necesario.

Importante:

EXPOSED != INTRODUCED.

El FIX de rentabilidad pudo simplemente haber permitido llegar
a una ruta histórica que ya estaba rota.

## Reproducción

Reproducir sin LIVE_DB:

now determinista:
2026-09-10

planta:
Acapulco fixture/stub

pregunta:
¿Cómo cerramos agosto?

Capturar:

intent
route
source mode
función que falla
tipo real de codes
stack/error

No modificar producto para hacerlo pasar.

## Fix futuro

Solo auditar el punto correcto de normalización.

No recomendar automáticamente:

Array.isArray(codes) ? codes : []

si eso podría ocultar datos válidos.

Primero demostrar el contrato.

## No implementar

NO cambios de producto.
NO SQL.
NO schema.
NO migration.
NO tool nueva.
NO endpoint.
NO frontend.
NO server.js salvo lectura.
NO dependencies.
NO LIVE_DB.
NO Render.
NO deploy.
NO merge.
NO push main.

## Entrega exacta

AUDIT_RESULT:

C1_INTENT:
C1_ROUTE:
C1_TOOL_OR_LOADER:
C1_SOURCE:

TYPEERROR_FILE:
TYPEERROR_FUNCTION:
TYPEERROR_LINE_OR_SIGNATURE:

CODES_PRODUCER:
CODES_CONSUMER:
CODES_EXPECTED_TYPE:
CODES_ACTUAL_TYPE:
CODES_ACTUAL_SHAPE:
CODES_ACTUAL_EXAMPLE:

WHY_OR_EMPTY_ARRAY_GUARD_FAILS:

FIRST_DIVERGENCE:

HISTORICAL_SOURCE:
HISTORICAL_STATE_FIELD:
HISTORICAL_PERIOD_RULE:
HISTORICAL_VERSION_RULE:

FINAL_SUPPORTED:
FORECAST_SUPPORTED:
NOT_FINAL_SUPPORTED:
DATA_NOT_FOUND_SUPPORTED:

CURRENT_MINI_BLOCKED_FOR_AUGUST:
SEPTEMBER_MINI_USED:
SOURCE_SELECTION_REGRESSION:

C1_REPRODUCED:
C2_REPRODUCED:
C3_REPRODUCED:
C4_REPRODUCED:
C5_CURRENT_MONTH_STILL_PASS:

PREEXISTED_BEFORE_22E7E22D:
INTRODUCED_BY_22E7E22D:
EXPOSED_BY_22E7E22D:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

CORRECT_CONTRACT_FOR_CODES:
RECOMMENDED_NORMALIZATION_POINT:
RECOMMENDED_MINIMAL_FIX_SURFACE:

ROUTING_BUG:
SOURCE_BUG:
DATA_BUG:
TYPE_SHAPE_BUG:
PRESENTATION_BUG:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte append-only.

Commit auditoría.

STOP.

No implementación.
No siguiente tarea.
No merge.
No push main.
No deploy.
No LIVE_DB.
closure_reason: "HUMAN REVIEW PASS. El crash de ¿Cómo cerramos agosto? es un TYPE_SHAPE_BUG: resolvePlantCodes devuelve un objeto de resolución y loadMonthCloseResultForChat lo consume erróneamente como Array."

human_semantic_decision: "El contrato correcto de resolución de planta es objeto con not_found y uniqueCodes:Array<string>. month-close debe consumir uniqueCodes y respetar not_found. No usar Array.isArray sobre el objeto completo ni descartar silenciosamente códigos válidos."

human_scope_decision: "No reabrir routing, MINI_FORECAST_PROY, fuentes financieras ni cierre histórico. El siguiente slice corrige únicamente la frontera resolvePlantCodes -> loadMonthCloseResultForChat."

causality: "Bug preexistente antes de 22e7e22d; no fue introducido ni expuesto por el FIX de rentabilidad current-month."
