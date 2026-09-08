task_id: AUDIT-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-HISTORICAL-COMPARISON-001

task_type: AUDIT
mode: READ_ONLY

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-08T17:21:56-06:00"

human_authorization: "AUDIT ONLY. TRACE CLIENT LARGEST SALES LOSS MAY-VS-JUNE. NO IMPLEMENTATION. NO PRODUCT CODE. NO LIVE_DB. NO MERGE. NO DEPLOY."

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 22f505ea7907192e1efe7e820b4e532105e1e13a
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-HISTORICAL-COMPARISON-001.md

## Producción observada

Planta: Acapulco.

Pregunta:

que cliente tiene la perdida mayor de venta entre mayo vs junio?

Respuesta observada:

Director IA indicó que no podía determinarlo porque
ambos meses tenían cero observaciones en kg.

Eso NO está probado como verdad física.

## Objetivo único

Localizar físicamente por qué una pregunta ejecutiva de
ranking cliente-a-cliente entre dos meses históricos
termina afirmando cero observaciones.

No arreglar.

## Semántica ejecutiva esperada

Interpretación a probar, no asumir:

plant = Acapulco
metric = kg vendidos/comprados por cliente
period_a = 2026-05
period_b = 2026-06
operation = rank largest negative client movement

delta_cliente_kg = kg_b - kg_a

"mayor pérdida de venta" debería significar el cliente
con mayor deterioro de kg entre A y B.

Pero auditar si el runtime distingue:

- disminuyó pero siguió comprando
- dejó de comprar por completo

Determinar si un cliente que dejó de comprar debe participar
en el ranking de "mayor pérdida de venta" según la
implementación física actual.

NO decidir semántica nueva durante auditoría.

## Trazado obligatorio

POST /chat
→ handlePostChat
→ askDirectorIa
→ planner/routing
→ extracción de periodos
→ intent
→ tool/loader
→ consulta/fuente
→ payload
→ bucket/ranking
→ formatter/prompt
→ respuesta

## Preguntas de probe

S1:
que cliente tiene la perdida mayor de venta entre mayo vs junio?

S2:
que cliente perdió más venta entre mayo y junio?

S3:
que cliente disminuyó más sus compras entre mayo y junio?

S4:
que clientes disminuyeron entre mayo y junio?

S5:
que clientes dejaron de comprar entre mayo y junio?

S6:
que clientes aumentaron entre mayo y junio?

No LIVE_DB.

Usar fixtures/stubs/probes read-only.

## Periodos

Confirmar exactamente:

A = 2026-05
B = 2026-06

Ambos son meses cerrados en septiembre de 2026.

Determinar si:

- se interpretan correctamente
- se reemplazan por meses recientes
- se hereda otro periodo
- se usa default M9
- se pierde año
- se usa current month
- existe continuidad que altera A/B

## Fuente física

Trazar si la fuente esperada es:

arr.ventas_diarias_cliente

u otra.

Identificar:

QUERY_FUNCTION
SQL_OR_HELPER
PLANT_MAPPING
PERIOD_FILTER
CLIENT_KEY
KG_FIELD

No ejecutar LIVE_DB.

## "cero observaciones"

Localizar exactamente de dónde sale.

Responder si el cero proviene de:

- COUNT real = 0
- SUM real = 0
- arreglo vacío
- undefined/null convertido a 0
- missing payload convertido a 0
- periodo incorrecto
- planta incorrecta
- bucket vacío
- sample/truncation
- formatter/LLM
- source unavailable

Buscar todos los:

|| 0
?? 0
Number(...)
SUM/COALESCE
length
count

relevantes al camino.

## Missing != zero

Contrato:

DATA_NOT_FOUND != 0
SOURCE_ERROR != 0
period unavailable != 0
empty bucket != plant has zero observations

Probar si actualmente se viola.

## Ranking

Determinar si existe físicamente capacidad para:

largest negative client delta

sobre todo el universo.

Responder:

FULL_CLIENT_UNIVERSE_AVAILABLE
CLIENT_DELTA_KG_AVAILABLE
NEGATIVE_RANKING_AVAILABLE
TOP_LOSS_CLIENT_AVAILABLE

YES / NO / PARTIAL

Si la capacidad actual usa buckets:

- mas
- disminuyeron
- dejaron

determinar:

¿el ranking de disminuyeron incluye todo el universo
antes de truncar?

¿"dejaron" se mantiene separado?

¿80/20 o slice altera quién puede ser top 1?

No inventar unión entre buckets.

## Temporalidad

Mayo vs junio son dos meses cerrados.

Determinar si el M9 temporal safety gate de
financial_diagnosis es relevante a esta pregunta.

Esperado probable: NO, pero probarlo.

No tocar ese gate.

## Respuesta requerida

AUDIT_RESULT:

QUESTION_S1_INTENT:
QUESTION_S2_INTENT:
QUESTION_S3_INTENT:
QUESTION_S4_INTENT:
QUESTION_S5_INTENT:
QUESTION_S6_INTENT:

S1_ROUTE:
S1_PERIOD_OBJECT:
S1_PERIOD_A:
S1_PERIOD_B:

SOURCE_MODULE:
SOURCE_TABLE:
QUERY_FUNCTION:
PLANT_MAPPING:
KG_FIELD:

FULL_CLIENT_UNIVERSE_AVAILABLE:
YES / NO / PARTIAL

CLIENT_DELTA_KG_AVAILABLE:
YES / NO / PARTIAL

NEGATIVE_RANKING_AVAILABLE:
YES / NO / PARTIAL

TOP_LOSS_CLIENT_AVAILABLE:
YES / NO / PARTIAL

DECREASED_BUCKET_SEMANTICS:
STOPPED_BUYING_BUCKET_SEMANTICS:

TOP_LOSS_INCLUDES_STOPPED_BUYING:
YES / NO / NOT_DEFINED

BUCKET_TOTALS_BEFORE_TRUNCATION:
YES / NO / NOT_APPLICABLE

RANKING_BEFORE_TRUNCATION:
YES / NO / NOT_APPLICABLE

ZERO_OBSERVATIONS_ORIGIN:

ZERO_IS_PHYSICAL_COUNT:
YES / NO / NOT_PROVEN

ZERO_IS_PHYSICAL_SUM:
YES / NO / NOT_PROVEN

MISSING_COLLAPSES_TO_ZERO:
YES / NO

PERIOD_A_CORRECT:
YES / NO

PERIOD_B_CORRECT:
YES / NO

PLANT_CORRECT:
YES / NO / NOT_PROVEN

FIRST_DIVERGENCE:

FIRST_FALSE_ZERO_SITE:

OPENAI_CALLED:
YES / NO / NOT_PROVEN

M9_TEMPORAL_SAFETY_RELEVANT:
YES / NO

PARSER_BUG:
YES / NO

ROUTING_BUG:
YES / NO

PERIOD_BUG:
YES / NO

SOURCE_BUG:
YES / NO

PLANT_MAPPING_BUG:
YES / NO / NOT_PROVEN

NULL_ZERO_BUG:
YES / NO

RANKING_BUG:
YES / NO

PRESENTATION_BUG:
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
