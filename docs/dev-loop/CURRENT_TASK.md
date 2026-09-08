task_id: AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-08T10:01:57-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - AUDIT ARR PROJECTION SEMANTICS ONLY; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO PUSH; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 3073bbb70fa38db925be3f337c6012572886e38e

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md

## Objetivo único

Localizar físicamente dónde Director IA pierde o mezcla la semántica
de los datos de ARR al responder preguntas ejecutivas como:

¿Cómo va ARR?
¿Cuánto proyectamos vender?
¿Cómo vamos a cerrar septiembre?
¿Cuál es la proyección de venta?
¿Por qué cayó el ingreso?

No implementar.

No asumir que el defecto está en computeDicf, el adapter, el planner,
el prompt, el formatter o el LLM. Probar cada frontera.

## Invariante ejecutiva

Mantener separados:

VENTA REAL / TOTAL MES AL CORTE
!=
PROYECCION ARR DE CIERRE DEL MES
!=
COMPROMISO / META / FORECAST IGF

Y mantener:

DATO AUSENTE
!=
CERO OBSERVADO

## Evidencia observada — Puebla septiembre 2026

Dashboard ARR mostró:

TOTAL MES AL CORTE:
302.00 ton

PROY VENTA:
1522.76 ton

Agosto:
aprox. 1176 ton

Desc. PROY septiembre:
-4.84 $/kg

Director IA respondió en la prueba observada de ARR:

venta esperada septiembre:
302.0 ton

comparación aproximada:
302 vs 1176
caída aproximada:
874 ton

descuento septiembre:
-4.92 $/kg

descuento agosto:
-4.55 $/kg

También presentó aproximadamente:

compromiso / forecast IGF:
2000.299 ton

margen:
6.52

ingreso aproximado:
744702

No asumir que todos esos números tienen la misma fuente ni semántica.

## Hecho de producto esperado

Para una pregunta de PROYECCION ARR:

"Al corte llevamos 302 ton"

puede ser contexto observado.

Pero:

"ARR proyecta cerrar septiembre en 1522.76 ton"

debe usar la métrica PROY física si está disponible y autorizada.

No llamar 302 "proyección" si físicamente representa el total al corte.

No llamar 2000.299 "proyección ARR" si físicamente pertenece a IGF.

## Problema adicional observado

En una respuesta relacionada con:

¿Por qué cayó el ingreso?

los Delta Venta / Delta Descuento / Delta Ingreso M9 ausentes
fueron tratados o expresados como si fueran 0 / sin cambios.

Contrato requerido:

ABSENT
MISSING
DATA_NOT_FOUND
null
campo inexistente

NO equivalen automáticamente a cero.

Solo un cero físicamente observado puede expresarse como cero.

## Auditoría física requerida

Trazar, con función + archivo + línea/rango:

1. ROUTING

¿Cómo va ARR?

- intent
- domains
- tools solicitadas
- tools realmente ejecutadas
- contexto final enviado al modelo

2. ARR DATA SOURCE

Localizar dónde se calculan o cargan:

- total al corte / real actual
- proyección cierre
- venta mes anterior
- descuento actual
- descuento proyectado
- margen
- ingreso
- periodo
- last_date / upload_day si aplica

3. DASHBOARD ARR

Localizar el código físico que alimenta los valores visuales:

TOTAL MES = 302
PROY = 1522.76
Desc. PROY = -4.84

Determinar los nombres de campo exactos.

No asumir que el label de UI coincide con el nombre interno.

4. DIRECTOR IA ARR ADAPTER / TOOL

Localizar qué campos expone hoy a Director IA.

Para cada métrica reportar:

SOURCE_FIELD:
SOURCE_FUNCTION:
SEMANTIC_LABEL:
VALUE_TYPE:
NULLABILITY:

5. 302

Responder físicamente:

¿De qué campo sale 302?

¿Es:
OBSERVED_TO_DATE /
CURRENT_TOTAL /
FORECAST /
OTHER?

¿En qué función cambia, si cambia, su etiqueta semántica?

6. 1522.76

Responder:

¿Existe físicamente en el objeto que usa Director IA?

Si YES:
¿por qué no se selecciona para una pregunta de proyección?

Si NO:
¿en qué capa se pierde respecto del dashboard?

7. DESCUENTO -4.92 vs -4.84

No asumir rounding.

Determinar si provienen de:

- campos diferentes
- periodos diferentes
- observado vs proyección
- weighted calculation diferente
- distinta fuente
- distinta ventana
- rounding
- stale snapshot
- OTHER

Si sin LIVE_DB no puede demostrarse la diferencia exacta:
marcar UNPROVEN_NO_LIVE_DB.

No inventar explicación.

8. IGF 2000.299

Trazar cómo llega a la misma respuesta.

Determinar:

ARR_PROJECTION:
<field>

IGF_COMMITMENT:
<field>

¿El formatter/model context los etiqueta inequívocamente?

¿Existe una frontera donde se vuelven intercambiables?

9. M9 / DELTAS AUSENTES

Localizar físicamente:

- Delta Venta
- Delta Descuento
- Delta Ingreso

Seguir desde tool result hasta respuesta/context.

Buscar patrones tales como:

value || 0
Number(value) || 0
?? 0
default 0
formatters que impriman ausente como 0
arrays vacíos interpretados como no-change
LLM prompt que omita availability/evidence status

No asumir cuál existe.

10. CAUSALIDAD

Auditar específicamente si:

¿Por qué cayó el ingreso?

puede hoy construir causalidad mezclando:

IGF commitment
ARR observed-to-date
ARR projection
M9 absent deltas

Determinar si existe una regla física que impida afirmar:

"cayó por X"

cuando las métricas no son homogéneas o las evidencias están ausentes.

## Fronteras a inspeccionar

Buscar físicamente, no asumir nombres:

planner
director-ia-chat
tool orchestrator
ARR snapshot tool
IGF snapshot tool
commercial_state
dicf.computeDicf
M9 delta tools
context builders
prompt / response assembly
dashboard ARR calculation
server handlers relacionados

El código actual conocido usa dicf.computeDicf para commercial_state,
pero eso NO demuestra que ¿Cómo va ARR? use exactamente el mismo path.

Probarlo.

## Probes read-only

Sin DB y sin modificar product code, construir probes/tests temporales
solo si pueden ejecutarse contra funciones puras o fixtures existentes.

No dejar archivos temporales al cerrar.

### Probe A

Question:
¿Cómo va ARR?

Reportar:

ROUTE_INTENT:
TOOLS:
ARR_CONTEXT_FIELDS:
IGF_CONTEXT_FIELDS:
M9_CONTEXT_FIELDS:

### Probe B

Question:
¿Cuánto proyectamos vender?

Determinar cuál field tendría prioridad hoy.

### Probe C

Question:
¿Cómo vamos a cerrar septiembre?

Igual.

### Probe D

Question:
¿Cuál es la proyección de venta?

Igual.

### Probe E

Question:
¿Por qué cayó el ingreso?

Determinar qué datos y availability flags recibe el modelo.

## Comparación semántica obligatoria

Crear tabla:

METRIC
PHYSICAL_SOURCE
FIELD
SEMANTIC_MEANING
DIRECTOR_IA_LABEL
DASHBOARD_LABEL
CAN_BE_NULL
ABSENCE_HANDLING

Filas mínimas:

ARR observed sale to date
ARR projected month sale
previous-month sale
ARR observed discount
ARR projected discount
IGF commitment/forecast
M9 Delta Venta
M9 Delta Descuento
M9 Delta Ingreso

## Preguntas que la auditoría debe resolver

ARR_SALES_FIRST_DIVERGENCE:
<función/línea>

ARR_PROJECTION_FIELD_EXISTS:
YES / NO / UNPROVEN

ARR_PROJECTION_REACHES_DIRECTOR_IA:
YES / NO / PARTIAL / UNPROVEN

OBSERVED_302_FIELD:
<exacto>

PROJECTED_1522_FIELD:
<exacto o UNPROVEN>

WHY_302_WAS_CALLED_PROJECTION:
<evidencia física>

DISCOUNT_FIRST_DIVERGENCE:
<función/línea/UNPROVEN>

DISCOUNT_492_SOURCE:
<exacto/UNPROVEN>

DISCOUNT_484_SOURCE:
<exacto/UNPROVEN>

DISCOUNT_DIFFERENCE_CLASS:
FIELD_MISMATCH /
PERIOD_MISMATCH /
OBSERVED_VS_PROJECTED /
CALCULATION_MISMATCH /
ROUNDING /
STALE_DATA /
UNPROVEN

IGF_2000_FIELD:
<exacto>

IGF_ARR_SEMANTIC_SEPARATION:
SAFE / AMBIGUOUS / BROKEN

M9_ABSENCE_FIRST_DIVERGENCE:
<función/línea>

M9_ABSENT_COLLAPSES_TO_ZERO:
YES / NO / PARTIAL

CAUSALITY_GATE_PRESENT:
YES / NO / PARTIAL

## No cambiar

No product code.

No planner.

No routing.

No SQL.

No schema.

No dependencies.

No prompts.

No adapters.

No tests permanentes.

No DB.

No Render.

## STOP CONDITIONS

STOP si la auditoría requiere LIVE_DB para continuar.

En ese caso documentar exactamente qué punto quedó UNPROVEN.

STOP si encuentras que los tres síntomas tienen roots independientes.
No diseñar un mega-fix.

Clasificarlos para tareas separadas.

## Reporte

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md

Debe contener:

AUDIT_BASE_SHA:

EXECUTIVE_SUMMARY:

ROUTE_TRACE:

ARR_DATA_FLOW:

DASHBOARD_DATA_FLOW:

SEMANTIC_MATRIX:

ARR_SALES_FIRST_DIVERGENCE:
ARR_PROJECTION_FIELD_EXISTS:
ARR_PROJECTION_REACHES_DIRECTOR_IA:
OBSERVED_302_FIELD:
PROJECTED_1522_FIELD:
WHY_302_WAS_CALLED_PROJECTION:

DISCOUNT_FIRST_DIVERGENCE:
DISCOUNT_492_SOURCE:
DISCOUNT_484_SOURCE:
DISCOUNT_DIFFERENCE_CLASS:

IGF_2000_FIELD:
IGF_ARR_SEMANTIC_SEPARATION:

M9_ABSENCE_FIRST_DIVERGENCE:
M9_ABSENT_COLLAPSES_TO_ZERO:

CAUSALITY_GATE_PRESENT:

PROBE_A:
PROBE_B:
PROBE_C:
PROBE_D:
PROBE_E:

REQUIRES_LIVE_DB:
YES / NO

REQUIRES_SQL_CHANGE:
YES / NO / UNPROVEN

REQUIRES_PLANNER_CHANGE:
YES / NO / UNPROVEN

REQUIRES_ROUTING_CHANGE:
YES / NO / UNPROVEN

ROOT_CAUSE_COUNT:
<number>

RECOMMENDED_TASK_SPLIT:
<lista si hay roots independientes>

MINIMAL_SAFE_FIX_BOUNDARY:
<por cada root demostrado>

FINAL_RECOMMENDATION:
FIX_SINGLE_ROOT /
FIX_SPLIT_ROOTS /
STOP_LIVE_DB_REQUIRED /
STOP_OTHER

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

Commit únicamente:

docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md

No product code.

STOP.

NO merge.
NO push.
NO deploy.
NO LIVE_DB.
NO next task.
closure_reason: "HUMAN REVIEW APPROVED. Audit demonstrated three independent roots: ARR projection cutoff/semantic labeling; M9 absence collapse to zero; ARR projection question routing. FINAL_RECOMMENDATION=FIX_SPLIT_ROOTS. No product code changed."
