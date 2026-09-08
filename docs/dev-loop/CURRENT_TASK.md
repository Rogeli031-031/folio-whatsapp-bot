task_id: FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-08T10:18:38-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - FIX ARR PROJECTION CUTOFF AND SEMANTIC LABELS ONLY; PRESERVE DASHBOARD CALCULATION; NO M9; NO PLANNER; NO ROUTING; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: ad20fb8b65f0b1936dc7f46599df04e72ccad37a

audit_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001.md

## Objetivo único

Corregir Root 1 demostrado por:

AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001

Director IA debe preservar y etiquetar por separado:

1. venta ARR observada al corte
2. proyección ARR de cierre del mes
3. descuento ARR observado al corte
4. descuento ARR proyectado
5. venta real/final del mes previo cuando corresponda

No confundir ninguno con:

IGF compromiso / forecast.

No resolver M9.
No ampliar routing.

## Root físico congelado

La auditoría demostró:

ARR_SALES_FIRST_DIVERGENCE:

loadArrProyForPlant
lib/director-ia-igf-arr.js

Actual:

computePronosticoProyByPlant(client, year, month, {
  fechaCorte: ""
})

Con corte vacío se apaga el lookback/POR COMPRAR.

Resultado observado:

proy_venta_ton termina en la familia semántica del TOTAL mes
observado y luego Director IA lo llama proyección.

Además loadArrProyForPlant colapsa semántica a:

venta_ton
desc_kg

y el anexo presenta:

"ARR — VENTA / DESCUENTO (proyección o real según corte)"

Eso debe desaparecer como ambigüedad.

## Evidencia ejecutiva de referencia

Puebla septiembre 2026, observada manualmente:

TOTAL MES AL CORTE:
302.00 ton

PROY VENTA:
1522.76 ton

Agosto:
aprox. 1176 ton

Desc. PROY septiembre:
-4.84 $/kg

Director IA antes reportó:

venta esperada/proyectada:
302 ton

Δ vs agosto:
aprox. -874 ton

desc septiembre:
-4.92 $/kg

Estos valores LIVE sirven como evidencia de producto.

NO hardcodearlos.

NO requieren LIVE_DB para implementar.

Los tests deben usar fixtures deterministas equivalentes.

## Fuentes físicas demostradas

OBSERVED CURRENT SALE FAMILY:

venta_sheet.total_mes_sum

PROJECTED CURRENT SALE FAMILY:

proy_total_ton
proy_venta_ton cuando existe corte válido
arr.pronostico_mini_snapshot.proy_venta_ton

PROJECTED DISCOUNT:

pronosticoDetail.proy_desc_kg
/UI "Desc. PROY"

IGF COMMITMENT:

igf.compromiso_lines.venta_ton

## Regla principal

VENTA_REAL_AL_CORTE
!=
ARR_PROYECCION_CIERRE
!=
IGF_COMPROMISO

Y:

DESC_REAL_AL_CORTE
!=
ARR_DESC_PROYECTADO

aunque numéricamente alguna vez coincidan.

La identidad semántica NO se determina comparando valores.

## Reuso obligatorio

No crear una fórmula nueva de proyección.

Reusar la misma lógica física de Pronóstico ARR/dashboard
que ya produce:

TOTAL mes observado
PROY cierre
Desc. PROY

Investigar/reusar el adapter/pack existente señalado por la auditoría.

No duplicar matemática de dashboard.

No calcular manualmente:

proyección = observado + estimación inventada

No usar LLM para calcular.

## Cutoff

No volver a pasar:

fechaCorte: ""

para obtener una métrica etiquetada como proyección intra-mes.

El FIX debe obtener/preservar el corte que usa la lógica autorizada
del dashboard/adapter.

Debe ser determinista y testeable.

No usar new Date() disperso si ya existe un resolver/cutoff
del dashboard.

No hardcodear septiembre 2026.

## Shape semántico mínimo

El objeto interno ARR debe distinguir conceptualmente, con nombres
inequívocos o equivalente probado:

observed_venta_ton
projected_venta_ton

observed_desc_kg
projected_desc_kg

previous_month_venta_ton

No es obligatorio usar exactamente estos nombres si el adapter físico
ya tiene nombres canónicos mejores.

Pero NO conservar únicamente:

venta_ton
desc_kg

si eso vuelve a perder observed vs projected.

## Anexo Director IA

Para mes abierto, debe poder producir contexto equivalente a:

ARR — VENTA

- Venta observada al corte: 302.00 ton
- Proyección de cierre ARR: 1522.76 ton

ARR — DESCUENTO

- Descuento observado al corte: <valor si está disponible>
- Descuento proyectado ARR: -4.84 $/kg

MES PREVIO

- Venta mes previo: ~1176 ton

COMPARACION

- Proyección cierre actual vs venta mes previo:
  +346.76 ton aproximadamente

No exigir estas cifras reales en test.

Usar fixture.

## Regla de comparación

Cuando compare el mes abierto contra el mes anterior:

"proyección actual vs mes previo"

debe usar:

ARR_PROJECTED_CURRENT
-
PREVIOUS_MONTH_OBSERVED/FINAL

No:

CURRENT_OBSERVED_TO_DATE
-
PREVIOUS_MONTH

La etiqueta debe dejar claro que se compara proyección con mes previo.

## Mes cerrado / histórico

No convertir artificialmente un mes histórico cerrado en
"proyección futura".

Si el adapter distingue cerrado/final vs forecast, preservar esa
semántica.

No inventar cierre/final si la fuente no lo demuestra.

## Descuento

La auditoría clasificó:

DISCOUNT_DIFFERENCE_CLASS:
OBSERVED_VS_PROJECTED

El FIX debe impedir que un descuento observado/sin corte sea
etiquetado como "Desc. PROY".

Para una pregunta ARR de proyección, priorizar físicamente:

projected_desc_kg

cuando la fuente lo provea.

Si el observado también está disponible:
puede mostrarse por separado.

No sustituir NULL por cero.

## IGF

IGF 2000.x sigue siendo:

Compromiso venta IGF

Nunca:

ARR projection.

El bloque IGF puede seguir disponible, pero debe permanecer
claramente separado.

No usar compromiso IGF como fallback silencioso de proyección ARR.

## Ingreso híbrido

La auditoría detectó que el anexo puede combinar:

ARR venta
+
margen/desc/HG de IGF

para mostrar "Ingreso aprox."

En este FIX:

NO presentar ese cálculo como:
- ingreso ARR puro
- proyección ARR pura
- explicación causal

Si se conserva por compatibilidad debe estar etiquetado
inequívocamente como cálculo cruzado de fuentes y NO utilizarse
para redefinir ARR projection.

Si la solución mínima segura requiere retirarlo del bloque ARR
para evitar mezcla semántica, documentarlo en reporte.

NO rediseñar fórmula IGF.

## North Star

Pregunta ya ruteada:

¿Cómo va ARR?

Con fixture:

observed current = 302.00
projected current = 1522.76
previous observed = 1176.00
projected desc = -4.84

Debe entregar al modelo contexto inequívoco del tipo:

Venta observada al corte: 302.00 ton
Proyección de cierre ARR: 1522.76 ton
Venta mes previo: 1176.00 ton
Proyección vs mes previo: +346.76 ton
Descuento proyectado ARR: -4.84 $/kg

Y NO:

"venta proyectada 302"

NO:
"Δ venta -874"

## Preguntas dentro de alcance

Solo preguntas que YA llegan al path ARR en base_main_sha.

Ejemplos:

¿Cómo va ARR?

ARR septiembre

¿Cómo va el pronóstico de venta?

No ampliar señal ni planner para cubrir nuevas frases.

## Fuera de alcance explícito — Root 2

NO tocar:

lib/director-ia-m9-deltas.js

NO arreglar:

AUSENTE -> 0

Eso será:

FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001

## Fuera de alcance explícito — Root 3

NO agregar soporte ahora a:

¿Cuánto proyectamos vender?
¿Cómo vamos a cerrar septiembre?
¿Cuál es la proyección de venta?

si alguna no rutea actualmente.

Eso será:

FIX-DIRECTOR-IA-ARR-PROJECTION-QUESTION-ROUTE-001

No modificar planner para hacerlas funcionar.

No modificar ARR_SIGNAL_RE para ampliar routing.

## No cambiar

planner
routing
M9
DICF
commercial_state
SQL
schema
dependencies
authz
scope de planta
IGF stored data
dashboard UI
fórmula matemática del Pronóstico ARR

## Regresión requerida

Probar BEFORE contra base_main_sha:

B-001:
loadArrProyForPlant usa fechaCorte ""

B-002:
observed/projected colapsan a venta_ton

B-003:
anexo usa texto "proyección o real según corte"

B-004:
fixture current observed 302 puede quedar presentado
como proyección.

B-005:
delta usa current venta_ton - previous venta_ton.

Después del FIX:

R-ARR-PROJ-001 observed field separado
002 projected field separado
003 observed != projected soportado
004 projected sale usa proyección real del adapter
005 projected discount usa Desc PROY
006 no empty cutoff para proyección intra-mes
007 current observed label
008 current projected label
009 previous month label
010 projection-vs-prev delta usa projected current
011 fixture 1522.76 - 1176 = +346.76
012 no -874 con fixture
013 observed 302 preservado como observed
014 projected 1522.76 preservado como projected
015 projected desc -4.84 preservado
016 observed desc no se llama PROY
017 IGF commitment separado
018 IGF commitment no fallback ARR
019 anexo no dice "proyección o real según corte"
020 no NULL->0 nuevo
021 month resolution intacto
022 plant authz intacto
023 GA restriction intacta
024 GV restriction intacta
025 get_arr_snapshot path intacto
026 loadIgfArrAnnexForChat intacto funcionalmente
027 source blocks distinguen ARR/IGF
028 no M9 changes
029 no planner changes
030 no routing changes
031 no SQL changes
032 no schema changes
033 no dependency changes
034 commercial_state unchanged
035 DICF unchanged
036 historical/closed month no fake forecast
037 current-month cutoff determinista
038 adapter/dashboard formula reused
039 no duplicated projection math
040 no hardcoded Puebla values

## Suites

Agregar suite focal:

R-ARR-PROJECTION-SEMANTICS

Ejecutar además:

planner
capabilities
tool-orchestrator
IGF
ARR existentes
M9 existentes
financial diagnosis
commercial_state
continuity

Tier 1
pre-deploy --gate

NEW FAILURE = 0

Si orchestrator conserva fallo preexistente:
demostrar contra base_main_sha.

## STOP CONDITIONS

STOP si requiere:

planner
routing
M9
SQL
schema
new dependency
LIVE_DB
cambiar fórmula del dashboard
duplicar fórmula de proyección

STOP si no puede reutilizarse la fuente/cálculo autorizado
del dashboard y la única alternativa es inventar otra proyección.

STOP si observed y projected no pueden distinguirse físicamente
sin LIVE_DB.

## Archivos esperados

Preferentemente:

lib/director-ia-igf-arr.js

y test focal nuevo.

Puede tocar adapter ARR existente únicamente si es necesario
para EXPONER un campo ya calculado por el dashboard,
sin cambiar su fórmula.

Si toca adapter:
documentar exactamente por qué.

No tocar frontend.

## Reporte

docs/dev-loop/reports/FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001.md

Debe iniciar:

IMPLEMENTATION_SHA:

BEFORE:
AFTER:

ROOT_FIXED:
ARR_DATA_SOURCE_REUSED:
CUTOFF_SOURCE:
EMPTY_CUTOFF_REMOVED:

OBSERVED_SALE_FIELD:
PROJECTED_SALE_FIELD:
PREVIOUS_SALE_FIELD:

OBSERVED_DISCOUNT_FIELD:
PROJECTED_DISCOUNT_FIELD:

NORTH_STAR_CONTEXT:

DELTA_MODEL:
IGF_SEPARATION:
HYBRID_INCOME_HANDLING:

001..040:
SUITES:

FILES:
RISKS:

M9_CHANGED:
PLANNER_CHANGED:
ROUTING_CHANGED:
SQL_CHANGED:
SCHEMA_CHANGED:
DEPENDENCY_CHANGED:
DASHBOARD_FORMULA_CHANGED:

## Completion

CURRENT_TASK -> DONE_PENDING_REVIEW

Commit únicamente en rama FIX.

STOP.

NO merge.
NO push main.
NO deploy.
NO LIVE_DB.
NO next task.
