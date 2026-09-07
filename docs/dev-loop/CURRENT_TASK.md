task_id: AUDIT-DIRECTOR-IA-FOLIO-ANALYTIC-AGGREGATION-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T12:58:44-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY FOLIO ANALYTIC AGGREGATION AUDIT; NO IMPLEMENTATION; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 4eb775c3d73a30b6d09b7830c5b42a1990cf6b34

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-ANALYTIC-AGGREGATION-001.md

objective: Determinar el contrato mínimo y veraz para responder preguntas analíticas sobre folios/apoyos —SUM, agrupación mensual y acumulado— incluyendo routing natural cuando el usuario no dice explícitamente "folio" o "apoyo".

## Contratos ya LIVE — NO reabrir

- folio_search
- SINGLE month
- RANGE month
- concept SINGLE
- concept ANY
- scope phrases
- token sequence
- morphology controlada
- SUPPORT_FAMILIES
- ALL_PUBLIC_FOLIOS
- queryReviewableSupportFolios
- public.folios
- gas != gasolina
- SQL vigente

## North Star A — analítica explícita sobre apoyos

Pregunta LIVE:

¿Cuánto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes

Actual:

folio_search reconoce RANGE pero produce aproximadamente:

concept_query =
"cuanto hemos gastado remodelacion de taller suma montos acumulado por"

y devuelve cero.

Resultado conceptual deseado a auditar:

domain/scope = SUPPORT_FAMILIES
period = RANGE 2026-01..2026-08
concept = remodelacion de taller
aggregation = SUM
group_by = MONTH
cumulative = YES

Pero NO asumir todavía que la medida defendible se llama "gasto realizado".

## North Star B — routing natural sin folio/apoyo

Pregunta LIVE:

¿Cuánto llevamos acumulado en mantenimiento de ISUZU?

Actual:

unknown
→ "No se pudo determinar una intención clara..."

Resultado conceptual deseado a auditar:

reconocer solicitud analítica económica relacionada con folios
concept = mantenimiento de ISUZU
aggregation = SUM
period = MISSING salvo contrato físico distinto

NO asumir YTD solo por "llevamos acumulado".

Determinar si debe:

A. pedir periodo;
B. existir semántica ya establecida "acumulado = YTD";
C. otra resolución físicamente defendible.

## Problema central: qué significa "gastado"

NO implementar suma hasta clasificar esto.

public.folios contiene al menos:

- importe
- estatus
- categoria
- mes_cargo
- concepto/descripcion

y diferentes estados pueden representar momentos operativos distintos.

Auditar si existe una semántica física ya usada en producto para distinguir:

- solicitado
- aprobado
- comprometido
- cheque generado
- pagado
- comprobaciones
- evidencias
- cerrado
- cancelado

Pregunta obligatoria:

¿SUM(importe) de todos los matches puede llamarse "hemos gastado"?

Si NO:

definir el wording veraz mínimo.

Ejemplos posibles a evaluar:

- importe total de folios encontrados
- importe de folios pagados
- importe materializado
- gasto realizado

NO elegir por intuición.

Probarlo contra contratos existentes.

## Medida

Evaluar físicamente:

MEASURE_CLASSIFICATION:

A. ALL_MATCHED_FOLIO_AMOUNT
B. PAID_ONLY_AMOUNT
C. MATERIALIZED_STATUS_SUBSET
D. MULTIPLE_MEASURES_REQUIRED
E. CANNOT_DEFEND_SPEND_FROM_CURRENT_SOURCE
F. OTHER

Explicar exactamente qué estados/fuentes soportan cada interpretación.

## Aggregation model

Evaluar shape mínimo:

analysis_mode = LIST | AGGREGATE

aggregation = SUM | NONE

group_by = MONTH | NONE

cumulative = YES | NO

o equivalente.

No implementar todavía.

## Monthly semantics

Para RANGE:

agrupar por mes_cargo.

No por fecha de creación del folio.

Debe auditarse si mes_cargo es efectivamente la semántica vigente de periodo de folio_search.

## "por mes"

Pregunta:

¿Cuánto gastamos en llantas de enero a agosto por mes?

Debe distinguir:

monthly subtotal

de:

running cumulative total

## "acumulado por mes"

Para:

"Suma los montos en un acumulado por mes"

evaluar si la salida debe contener:

mes
subtotal_mes
acumulado_hasta_mes

Ejemplo conceptual:

Enero    subtotal X    acumulado X
Febrero  subtotal Y    acumulado X+Y

No implementar hasta confirmar.

## Total final

Determinar si además debe devolver:

TOTAL PERIODO

igual al último acumulado.

## Meses sin matches

Para RANGE mensual:

¿debe mostrar mes con 0?

Preferencia a auditar:

sí, si el usuario pidió "por mes" sobre un rango explícito,
para que el periodo sea completo.

No asumir.

## Routing sin palabras mágicas

Trazar físicamente:

¿Cuánto llevamos acumulado en mantenimiento de ISUZU?

Planner
→ intent
→ capabilities/domains
→ tools
→ chat

Determinar por qué cae en unknown.

Auditar colisiones con intents existentes, especialmente:

- expense_analysis
- investment_analysis
- folio_search
- igf
- proyectos
- Action Register

No secuestrar preguntas financieras generales.

## Regla candidata de routing

Solo evaluar, NO implementar:

consulta con lenguaje de agregación económica:

cuánto gastamos
cuánto hemos gastado
cuánto llevamos
total
suma
acumulado

+

concepto operativo explícito

puede pertenecer a folio analytics.

Pero debe definirse una frontera segura.

## Casos obligatorios

A.
¿Cuánto hemos gastado en apoyos en remodelación de taller de enero a agosto? Suma los montos en un acumulado por mes.

B.
¿Cuánto llevamos acumulado en mantenimiento de ISUZU?

C.
¿Cuánto gastamos en llantas de enero a agosto?

D.
¿Cuánto gastamos en llantas de enero a agosto por mes?

E.
¿Cuánto llevamos acumulado en llantas de enero a agosto?

F.
Suma los apoyos de impresoras de enero a agosto.

G.
¿Cuál es el total de apoyos de MAYAN PALACE de enero a agosto?

H.
¿Cuánto gastamos en apoyos de gas en julio?

I.
¿Cuánto gastamos en septiembre?

Guardrail:
sin concepto explícito, determinar si esto debe ir a folio analytics o al dominio financiero/expense existente.

J.
¿Cuánto gastamos en gastos operativos en septiembre?

Guardrail:
NO debe secuestrarse si pertenece al gasto operativo financiero/IGF.

K.
¿Cuánto invertimos en MAYAN PALACE de enero a agosto?

Determinar colisión con investment_analysis.

L.
¿Cuánto suman los folios de bonos de septiembre?

M.
¿Cuánto suman los folios de bonos o bono de septiembre?

Debe preservar concept ANY.

N.
Dame los folios de bonos de septiembre.

Debe seguir siendo LIST, no AGGREGATE.

## Extracción analítica

Auditar cómo retirar del concepto frases como:

cuanto hemos gastado
cuanto gastamos
cuanto llevamos acumulado
suma los montos
suma
total
por mes
acumulado por mes

sin convertirlas en stopwords globales destructivos.

No hardcode de:

remodelacion
isuzu
llantas
impresoras
mayan palace
bonos

Estas palabras solo pueden aparecer en tests.

## Fuente / reutilización

Preferencia si es veraz:

reutilizar el resultado estructurado de folio_search
ANTES del formatting textual.

No volver a consultar otra fuente si no hace falta.

Auditar:

- si loadFolioSearchForChat puede reutilizarse;
- si entrega todos los registros necesarios antes del RECORD_LIMIT;
- si para agregaciones
ecords actualmente podría estar truncado;
- si se puede sumar desde el conjunto completo interno;
- si count/matched completo está disponible;
- si el límite 40 debe afectar o NO una suma.

CRÍTICO:

Una agregación NO puede sumar solo los primeros 40 si existen más matches.

## RECORD_LIMIT

Determinar:

LIST:
sigue limitado a 40.

AGGREGATE:
debe calcular sobre TODOS los matches del scope/periodo,
aunque la lista detalle se trunque.

No implementar todavía.

## Status semantics / cancelled

Determinar expresamente qué ocurre con:

CANCELADO

y otros estados.

Si la pregunta dice:

"cuánto hemos gastado"

no incluir CANCELADO salvo evidencia contractual fuerte.

Pero NO asumir que PAGADO es el único estado válido.

Auditar físicamente.

## Authorization

Conservar:

planta
solo_zp_ad
scope
permisos

Agregación nunca puede sumar folios que el usuario no puede ver.

## No SQL

Auditar si todo puede resolverse en memoria sobre la lectura actual.

SQL_CHANGE_REQUIRED debe ser NO para autorizar un futuro slice.

Si resulta YES:
STOP y explicar.

## Reporte obligatorio

Crear:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-ANALYTIC-AGGREGATION-001.md

Debe comenzar exactamente:

ROUTING_CLASSIFICATION:
ROUTING_FIRST_BAD_BOUNDARY:

ANALYTIC_PARSE_CLASSIFICATION:
ANALYTIC_FIRST_BAD_BOUNDARY:

MEASURE_CLASSIFICATION:
MEASURE_SEMANTICS:

AGGREGATION_SOURCE_CLASSIFICATION:
AGGREGATION_FIRST_BAD_BOUNDARY:

EXISTING_ANALYTIC_HELPER_REUSABLE:
YES / NO

SAFE_ROUTING_STRATEGY:
...

SAFE_ANALYTIC_PARSE_STRATEGY:
...

SAFE_MEASURE_STRATEGY:
...

SAFE_AGGREGATION_STRATEGY:
...

MISSING_PERIOD_BEHAVIOR:
...

MONTHLY_GROUPING_FIELD:
...

MONTH_ZERO_FILL:
YES / NO

CUMULATIVE_SEMANTICS:
...

CANCELLED_BEHAVIOR:
...

RECORD_LIMIT_AFFECTS_AGGREGATE:
YES / NO

SQL_CHANGE_REQUIRED:
YES / NO

NORTH_STAR_A_EXPECTED:
...

NORTH_STAR_B_EXPECTED:
...

A-N MATRIX:
...

ONE_FIX_CAN_HANDLE_ANALYTICS:
YES / NO

FIX CONTRACT:
...

FILES FUTUROS:
...

## Prohibido

NO implementación.
NO SQL.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO dependencia nueva.
NO asumir acumulado=YTD.
NO sumar solo primeros 40.
NO llamar "gastado" a una métrica no defendible.
NO hardcode de conceptos.
NO parser NLP general.
NO cambiar RANGE.
NO cambiar morphology.
NO cambiar concept ANY.
NO cambiar scope.
NO merge.
NO deploy.
NO next task.

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.
