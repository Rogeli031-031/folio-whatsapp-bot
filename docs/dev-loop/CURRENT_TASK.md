task_id: FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-08T11:47:32-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - FIX M9 ABSENT NOT ZERO ONLY; PRESERVE LEGITIMATE STRUCTURAL ZEROS; NO ARR ROOT1 CHANGES; NO PLANNER; NO ROUTING; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: b3e1b0311597604ce75a5962d3b0d809518b22c1

audit_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001.md

## Objetivo único

Corregir Root 2 demostrado por:

AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001

M9 no debe transformar ausencia/no disponibilidad de evidencia en
un cero observado.

Contrato:

ABSENT
DATA_NOT_FOUND
SOURCE_PARTIAL
SOURCE_ERROR
null
undefined
input matemáticamente insuficiente

!=

KNOWN_ZERO

Un 0 físicamente conocido sigue siendo 0.

## North Star

Cuando una pregunta como:

¿Por qué cayó el ingreso?

obtenga M9 sin Delta Venta, Delta Descuento o Delta Ingreso
disponible para la comparación, Director IA debe recibir evidencia
inequívoca equivalente a:

Delta Venta: NO DISPONIBLE
Delta Descuento: NO DISPONIBLE
Delta Ingreso: NO DISPONIBLE

y NO:

Delta Venta: 0
Delta Descuento: 0
Delta Ingreso:
sin cambios
no hubo impacto

La ausencia M9 no autoriza causalidad.

## Root físico demostrado

Archivo principal:

lib/director-ia-m9-deltas.js

La auditoría encontró colapsos de ausencia a cero, incluyendo:

- COALESCE de kg / monto a 0
- CASE de ratio indefinido a 0
- row.null -> 0
- margenA / margenB con ?? 0
- invalid input retornando margen 0
- fmtKg(null) -> "0.0"
- fmtDescKg(null) -> "0.00 $/kg"
- fmtMxn(null) -> ""
- fmtTon(null) -> "0.0 ton"

Además:

lib/director-ia-financial-diagnosis.js

ya contiene el contrato:

"null no es 0. Ausencia no es cero."

y modela:

SOURCE_AVAILABLE
SOURCE_PARTIAL
DATA_NOT_FOUND
SOURCE_ERROR
SOURCE_RESTRICTED

Por tanto, arreglar primero la evidencia M9 aguas arriba.
No hacer que el prompt compense datos falsamente convertidos a 0.

## PRECAUCIÓN CRÍTICA — dos tipos de ausencia

NO eliminar COALESCE a ciegas.

Antes de cambiar cada coerción, clasificarla físicamente como:

A. KNOWN_ZERO / STRUCTURAL_ZERO

Ejemplo posible:

el periodo mensual existe y está disponible,
pero un cliente concreto no tiene ventas registradas en ese mes
dentro de una fuente que representa únicamente transacciones.

Si el contrato físico existente demuestra que eso significa
0 kg comprados:

PRESERVAR 0.

Esto es necesario para conceptos como:

- dejó de comprar
- cliente nuevo
- pasó de X kg a 0
- pasó de 0 a X kg

B. MISSING / UNKNOWN

Ejemplos:

- periodo fuente no disponible
- margen IGF no disponible
- familia M9 no disponible
- error de fuente
- ratio matemáticamente no determinable
- input requerido null
- payload parcial

Eso NO puede convertirse en cero.

## Regla de clasificación

Cada coerción auditada debe aparecer en el reporte con:

LOCATION:
CURRENT_BEHAVIOR:
CLASSIFICATION:
KNOWN_ZERO /
MISSING_SOURCE /
MISSING_INPUT /
UNDEFINED_RATIO /
LEGACY_FORMATTING

ACTION:
PRESERVE_ZERO /
PRESERVE_NULL /
PROPAGATE_PARTIAL /
PROPAGATE_NOT_FOUND /
STOP_UNPROVEN

EVIDENCE:

Si no puede demostrar si una coerción representa
KNOWN_ZERO o MISSING:

STOP.

No adivinar semántica empresarial.

## Delta Venta

Preservar:

un cero legítimo de compras para un cliente dentro de
periodos cuya fuente está disponible.

No preservar como cero:

un periodo/fuente que no existe.

No fabricar:

deltaKg = 0

si uno de los lados es realmente UNKNOWN.

## Delta Descuento

Distinguir:

sin descuento conocido = 0 monto

de:

descuento no disponible

y de:

ratio $/kg matemáticamente indefinido.

No asumir automáticamente que denominador 0 implica
"descuento observado = 0 $/kg" si eso no está probado por
el contrato físico existente.

Si cambiar esa semántica rompería deliberadamente la paridad
del dashboard y no hay evidencia suficiente:

STOP y documentar.

No rediseñar M9.

## Delta Ingreso

Este es crítico.

Fórmula existente:

kg × (margen_$/kg − |desc_$/kg|)

Requiere inputs conocidos.

Si:

margenA = null
o
margenB = null

NO usar:

margen ?? 0

NO calcular un ingreso exacto.

NO calcular deltaIngreso exacto.

Debe propagarse ausencia/partial.

Igual si un input requerido para ingreso es UNKNOWN.

Un cero físicamente observado sigue siendo válido.

## Formatters

NULL no debe renderizarse como cero.

Ejemplos requeridos:

fmtKg(null)       != "0.0"
fmtDescKg(null)   != "0.00 $/kg"
fmtMxn(null)      != ""
fmtTon(null)      != "0.0 ton"

Puede usarse:

"n/d"
"no disponible"

o un mecanismo equivalente ya existente.

Pero:

fmtKg(0)
fmtMxn(0)
etc.

sí deben seguir representando 0.

## Status / availability

Una familia con inputs esenciales ausentes no debe terminar
marcada como SOURCE_AVAILABLE con valores numéricos fabricados.

Usar el modelo de veracidad ya existente cuando sea suficiente:

SOURCE_AVAILABLE
SOURCE_PARTIAL
DATA_NOT_FOUND
SOURCE_ERROR
SOURCE_RESTRICTED

No crear un segundo sistema de veracidad si no hace falta.

Cuando una familia sea parcial:

identificar qué input falta.

Ejemplo conceptual:

availability:
{
  margenA: DATA_NOT_FOUND,
  margenB: SOURCE_AVAILABLE
}

No es obligatorio este shape exacto si existe un equivalente más
simple y compatible.

## Financial diagnosis

ssembleFinancialDiagnosisEvidence ya separa IGF / ARR / M9.

Preservar esa arquitectura.

Para M9 ausente/parcial, el contexto final debe expresar
claramente ausencia.

No imprimir:

0

0.00 $/kg

como sustituto de missing.

Y mantener la regla:

NO CAUSALIDAD.

Si M9 no está disponible:

no concluir "el ingreso cayó por..."
basándose en un cero inventado.

## Caso A — missing completo

Fixture:

Delta Venta = DATA_NOT_FOUND
Delta Descuento = DATA_NOT_FOUND
Delta Ingreso = DATA_NOT_FOUND

Esperado:

M9 status = DATA_NOT_FOUND

y ninguna cifra:

0 kg
0.00 $/kg


como representación de ausencia.

## Caso B — margen faltante

Fixture:

kgA conocido
kgB conocido
descA conocido
descB conocido

margenA = null
margenB = 7.12

Esperado:

Delta Ingreso exacto = UNKNOWN
familia != SOURCE_AVAILABLE exacta
no ingresoA con margen 0
no delta exacto

## Caso C — cero conocido

Fixture:

periodo A disponible
periodo B disponible

cliente:
kgA = 1000
kgB = 0 conocido/estructural

Esperado:

kgB = 0
deltaKg = -1000

si el contrato físico existente demuestra
cliente ausente = cero dentro de un periodo disponible.

No romper dejó de comprar.

## Caso D — cliente nuevo

kgA = 0 conocido/estructural
kgB = 2000

Esperado:

nuevo cliente sigue clasificable.

## Caso E — formatter

null -> n/d/no disponible
0 -> cero formateado

## Caso F — error

SOURCE_ERROR nunca debe convertirse en 0.

## Caso G — restricted

SOURCE_RESTRICTED nunca debe convertirse en 0.

## Caso H — partial

Si una de las tres familias M9 es partial/not-found y otras available:

aggregate M9 = SOURCE_PARTIAL

y conservar status individual de cada familia.

## BEFORE requerido

B-001:
margen null -> 0 mediante ?? 0

B-002:
row kg null -> 0 en mapper donde aplique

B-003:
row desc null -> 0 donde aplique

B-004:
formatters null -> strings de cero

B-005:
financial diagnosis declara null != zero,
pero upstream puede haberlo colapsado antes

B-006:
clasificar físicamente COALESCE cliente-ausente.

No modificar ese COALESCE hasta clasificarlo.

## Regresiones requeridas

R-M9-ABSENCE-001 missing margin preserved
002 missing margin not numeric zero
003 no exact ingreso with missing margin
004 no exact deltaIngreso with missing margin
005 formatter kg null != zero
006 formatter desc null != zero
007 formatter mxn null != zero
008 formatter ton null != zero
009 physical zero kg remains zero
010 physical zero desc remains zero where semantically defined
011 physical zero mxn remains zero
012 period DATA_NOT_FOUND remains DATA_NOT_FOUND
013 SOURCE_ERROR remains error
014 SOURCE_RESTRICTED remains restricted
015 SOURCE_PARTIAL remains partial
016 family availability preserved
017 aggregate M9 partial when one family partial
018 aggregate M9 not available when all not-found
019 no "sin cambios" from missing
020 no numeric M9 zero from missing family
021 Delta Venta legitimate dejaron semantics intact
022 Delta Venta legitimate nuevos semantics intact
023 Delta Descuento existing known cases intact
024 Delta Ingreso known-input calculation intact
025 known-input margin 0 if physically real remains 0
026 missing margin distinct from margin 0
027 invalid period not represented as margin 0
028 no Number(null)-style zero
029 no || 0 for UNKNOWN essential inputs
030 no ?? 0 for UNKNOWN essential inputs
031 financial evidence null_is_not_zero intact
032 causality prohibition intact
033 ARR Root1 semantics intact
034 ARR projected/observed fields intact
035 IGF commitment separation intact
036 planner unchanged
037 routing unchanged
038 DICF unchanged
039 commercial_state unchanged
040 authz unchanged
041 plant scope unchanged
042 no schema change
043 no dependency change
044 no LIVE_DB required
045 no hardcoded plant/period values
046 no new source invented
047 dashboard formulas not redesigned
048 existing M9 known-data tests pass

## SQL boundary

SQL expression changes dentro de:

lib/director-ia-m9-deltas.js

están autorizados SOLO si son necesarios para preservar
NULL vs KNOWN_ZERO dentro de las queries M9 existentes.

NO:

new tables
new columns
DDL
migration
new DB source
new query family
schema change

Si necesita cualquiera de esos:

STOP.

Reportar:

SQL_EXPRESSION_CHANGED:
YES / NO

Si YES:

exact query expression
before
after
why
and prove no schema/query-source change.

## Archivos permitidos

Preferentemente:

lib/director-ia-m9-deltas.js
lib/director-ia-financial-diagnosis.js

test focal nuevo
CURRENT_TASK
reporte

Puede tocar test/helpers M9 existentes si es estrictamente necesario.

NO tocar:

lib/director-ia-igf-arr.js
server.js
planner
routing
commercial_state
DICF

## Root 1 congelado

No cambiar el FIX ARR ya validado LIVE:

observed current
!=
projected current
!=
previous month
!=
IGF commitment

Prueba regresión.

## Root 3 fuera de alcance

NO arreglar todavía:

¿Cuánto proyectamos vender?
¿Cómo vamos a cerrar septiembre?
¿Cuál es la proyección de venta?

si el routing actual no las resuelve.

Eso será otra tarea.

## Natural Folio/Taller fuera de alcance

NO arreglar todavía:

¿Cuánto gasté en taller en enero?
¿Cuánto gasté en taller en mayo?
¿Cuánto gasté en inversiones en agosto?

Eso será el siguiente bloque funcional después de los roots ARR/M9.

## Suites

Agregar focal:

R-M9-ABSENT-NOT-ZERO

Ejecutar:

M9 existentes
financial diagnosis
ARR
IGF
planner
capabilities
tool-orchestrator
commercial_state
continuity

Tier 1
pre-deploy --gate

NEW FAILURE = 0

Si existe fallo preexistente:
demostrar contra base_main_sha.

## STOP CONDITIONS

STOP si:

- no puede distinguir KNOWN_ZERO de MISSING
- requiere decisión empresarial no demostrada
- requiere LIVE_DB
- requiere schema
- requiere nueva fuente
- requiere planner
- requiere routing
- requiere alterar ARR Root1
- requiere cambiar DICF
- requiere cambiar commercial_state
- requiere mega-rediseño de M9

No sustituir incertidumbre por una implementación agresiva.

## Reporte

docs/dev-loop/reports/FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001.md

Debe iniciar:

IMPLEMENTATION_SHA:

BEFORE:

COERCION_CLASSIFICATION:

M9_ABSENCE_MODEL:

KNOWN_ZERO_MODEL:

MISSING_MARGIN_HANDLING:

DELTA_VENTA_HANDLING:
DELTA_DESCUENTO_HANDLING:
DELTA_INGRESO_HANDLING:

FORMATTER_NULL_HANDLING:

FINANCIAL_DIAGNOSIS_CONTEXT:

NORTH_STAR_MISSING_CONTEXT:

001..048:

SUITES:

FILES:
RISKS:

STRUCTURAL_ZERO_PRESERVED:
YES / NO

MISSING_COLLAPSES_TO_ZERO:
YES / NO

SQL_EXPRESSION_CHANGED:
YES / NO

SCHEMA_CHANGED:
YES / NO

PLANNER_CHANGED:
YES / NO

ROUTING_CHANGED:
YES / NO

ARR_ROOT1_CHANGED:
YES / NO

DICF_CHANGED:
YES / NO

COMMERCIAL_STATE_CHANGED:
YES / NO

DEPENDENCY_CHANGED:
YES / NO

LIVE_DB_USED:
YES / NO

FINAL:
PASS /
STOP_UNPROVEN_SEMANTICS /
STOP_OTHER

## Completion

Si implementación segura:

CURRENT_TASK -> DONE_PENDING_REVIEW

Commit en rama FIX.

STOP.

Si debe detenerse por semántica no demostrada:

CURRENT_TASK -> STOPPED

Crear reporte con evidencia exacta.

Commit docs únicamente si protocolo lo permite.

STOP.

NO merge.
NO push main.
NO deploy.
NO LIVE_DB.
NO next task.
