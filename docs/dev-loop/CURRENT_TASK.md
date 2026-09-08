task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARISON-500-001

task_type: AUDIT
mode: READ_ONLY

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-08T16:53:12-06:00"

human_authorization: "AUDIT ONLY. TRACE HISTORICAL MARGIN MAY-VS-JUNE HTTP 500. NO IMPLEMENTATION. NO PRODUCT CODE. NO LIVE_DB. NO MERGE MAIN. NO DEPLOY."

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: c78dd860ad7b7cebefc0e130c2b6c643fc111c61
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARISON-500-001.md

## Producción observada

Planta: Acapulco.

Caso A:

Pregunta:
cual fue el margen en mayo?

Resultado:
PASS.

Director IA devuelve margen mayo aproximadamente:

7.35 $/kg

y lo etiqueta como FORECAST / vista vigente,
NO como cierre FINAL.

Caso B:

Pregunta:
cual fue el cambio en el margen entre mayo y junio?

Resultado:
HTTP 500 reproducible.

## Objetivo único

Localizar físicamente la primera divergencia y,
si es reproducible sin LIVE_DB,
la primera excepción exacta que convierte una pregunta
válida de comparación histórica de margen en HTTP 500.

NO arreglar.

## Pregunta ejecutiva esperada

La pregunta representa conceptualmente:

plant = Acapulco
metric = margen de planta
period_a = 2026-05
period_b = 2026-06
operation = period_b - period_a

Pero NO asumir que el runtime la interpreta así.
Probarlo.

## Trazado obligatorio

Seguir físicamente:

POST /chat
→ handler
→ askDirectorIa
→ planner / routing
→ extracción de periodo(s)
→ selección de dominio/fuente
→ loaders
→ ensamblaje
→ cálculo/comparación
→ formatter/prompt
→ respuesta HTTP

Identificar el primer punto donde el caso comparativo
difiere del caso de un solo mes.

## Escenarios mínimos

S1:
cual fue el margen en mayo?

S2:
cual fue el margen en junio?

S3:
cual fue el cambio en el margen entre mayo y junio?

S4:
cual fue el cambio en el margen de mayo a junio?

S5:
compara el margen de mayo contra junio

No LIVE_DB.

Usar pruebas existentes, stubs, fixtures o probes
read-only cuando sea posible.

No agregar código de producto.

## Period parser

Auditar especialmente:

- "entre mayo y junio"
- "mayo y junio"
- "de mayo a junio"
- dos meses explícitos
- año implícito
- periodo único vs periodo doble
- estructuras RANGE si existen

Determinar exactamente qué objeto produce el parser/planner:

period
period_a
period_b
month
year
range
o cualquier equivalente físico.

## Margen

Determinar la fuente física que responde:

cual fue el margen en mayo?

y confirmar si junio individual usa la misma fuente.

No convertir FORECAST en FINAL.

No asumir cierre histórico.

Preservar la semántica ya vigente:

FORECAST != FINAL
margen = métrica de planta
descuento/kg = métrica cliente

## HTTP 500

Determinar:

¿El 500 proviene de excepción lanzada?

¿De Promise rejection?

¿De acceso a undefined/null?

¿De shape inesperado?

¿De parser de periodo?

¿De llamada a loader con argumentos inválidos?

¿De formatter?

¿De OpenAI?

¿De capa HTTP?

Si existe catch que transforma cualquier excepción en
HTTP 500, identificar:

THROW_SITE
CATCH_SITE
ERROR_MESSAGE / ERROR_TYPE

Si no puede obtenerse el mensaje sin producción,
marcarlo NOT_PROVEN.

No inventar stack trace.

## Comparación

Buscar si ya existe una capacidad física segura para:

margen B - margen A

o si el sistema solo soporta margen de un mes.

Responder:

SINGLE_PERIOD_MARGIN_SUPPORTED
TWO_PERIOD_MARGIN_SUPPORTED
MARGIN_DELTA_SUPPORTED

YES / NO / PARTIAL

No implementar capacidad faltante.

## Relación con Financial Diagnosis

Determinar si esta pregunta entra por:

financial_diagnosis
igf_status
arr_status
otro intent

No asumir que pertenece a Financial Diagnosis.

No modificar el temporal safety gate recién cerrado.

## Contrato de ausencia

Verificar que cualquier:

null
DATA_NOT_FOUND
SOURCE_PARTIAL
SOURCE_ERROR

no pueda convertirse accidentalmente en 0.

Especialmente junio.

## Resultado requerido

Entregar exactamente:

AUDIT_RESULT:

QUESTION_SINGLE_MAY_ROUTE:
QUESTION_SINGLE_JUNE_ROUTE:
QUESTION_COMPARE_ROUTE:

SINGLE_MAY_INTENT:
SINGLE_JUNE_INTENT:
COMPARE_INTENT:

SINGLE_MAY_PERIOD_OBJECT:
SINGLE_JUNE_PERIOD_OBJECT:
COMPARE_PERIOD_OBJECT:

SINGLE_PERIOD_MARGIN_SUPPORTED:
YES / NO

TWO_PERIOD_MARGIN_SUPPORTED:
YES / NO / PARTIAL

MARGIN_DELTA_SUPPORTED:
YES / NO / PARTIAL

MAY_MARGIN_SOURCE:

JUNE_MARGIN_SOURCE:

COMPARE_MARGIN_SOURCE:

FIRST_DIVERGENCE:

FIRST_THROW_SITE:

ERROR_TYPE:

ERROR_MESSAGE:

HTTP_500_CATCH_SITE:

OPENAI_CALLED_BEFORE_FAILURE:
YES / NO / NOT_PROVEN

DB_CALLED_BEFORE_FAILURE:
YES / NO / NOT_PROVEN

MAY_DATA_REQUIRED:
YES / NO

JUNE_DATA_REQUIRED:
YES / NO

JUNE_ABSENCE_COLLAPSES_TO_ZERO:
YES / NO / NOT_PROVEN

PARSER_BUG:
YES / NO

ROUTING_BUG:
YES / NO

PERIOD_MODEL_BUG:
YES / NO

LOADER_BUG:
YES / NO

NULL_HANDLING_BUG:
YES / NO

FORMATTER_BUG:
YES / NO

HTTP_ERROR_HANDLING_BUG:
YES / NO

DATA_BUG:
YES / NO / NOT_PROVEN

CAN_FIX_WITHOUT_NEW_SQL:
YES / NO / NOT_PROVEN

RECOMMENDED_NEXT_SLICE:

FILES_INSPECTED:

TESTS_RUN:

RISKS:

STOP.

No implementación.
No producto.
No LIVE_DB.
No merge.
No deploy.
closure_reason: "HUMAN REVIEW PASS. Root cause confirmed: compare_months can return ok:false without explicit HTTP status; handlePostChat then synthesizes HTTP 500. Parser, routing, loaders, null semantics and database are not the demonstrated root cause."
