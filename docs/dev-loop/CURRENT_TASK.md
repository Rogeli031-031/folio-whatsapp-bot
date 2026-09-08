task_id: FIX-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T18:03:45-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - FIX POST-CONCEPT ANALYTIC TAIL BOUNDARY IN FOLIO SEARCH; PRESERVE DEPLOYED ESTAN/LOCATOR/NULL/AGGREGATE CONTRACTS; NO PLANNER; NO ROUTING; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: d4291bc0d22cc367e597b41ce448810fc4bb2790

audit_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001.md
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001.md

## Objetivo único

Corregir el END boundary de POST_PERIOD_DE_TO_TEXT_END para que
una cola analítica posterior al concepto quede FUERA del protected
concept span y permanezca dentro de control-language.

No rediseñar el agregado.

## Hallazgo físico auditado

FIRST_DIVERGENCE:

locateConceptSpan
POST_PERIOD_DE_TO_TEXT_END

Actual:

boundConceptSpan(text, afterControl + 3, text.length)

Eso produce:

liquidaciones suma los montos en un acumulado por mes

como un único concept span.

ROOT_CAUSE_CLASS:

CONCEPT_END_BOUNDARY

## North Star de este FIX

Pregunta:

¿Cuánto suman los folios de enero a agosto de liquidaciones? suma los montos en un acumulado por mes

Debe producir:

period_mode=RANGE
period_start=2026-01
period_end=2026-08

concept_mode=SINGLE
concept_query=liquidaciones

analysis_mode=AGGREGATE
aggregation=SUM
group_by=MONTH
cumulative=YES

## Segunda forma LIVE obligatoria

Pregunta:

¿Cuánto suman los folios de enero a agosto de liquidaciones? dame el monto por mes y acumulado

Debe producir:

concept_query=liquidaciones

analysis_mode=AGGREGATE
aggregation=SUM
group_by=MONTH
cumulative=YES

## Regla estructural

Separar:

BUSINESS DATA | POST-CONCEPT ANALYTIC TAIL

La cola solo puede separarse si forma un SUFIJO COMPLETO
reconocido hasta EOF.

NO substring global.

NO stopwords globales.

NO borrar palabras dentro de protected concept span.

## Tails cerrados autorizados

Cuando formen un sufijo completo hasta EOF:

por mes

acumulado por mes

suma los montos

suma los montos por mes

suma los montos en un acumulado por mes

dame el monto por mes y acumulado

dame el monto por mes y el acumulado

Singular/plural equivalente de monto/montos es permitido
solo mediante gramática cerrada y tests.

## Casos auditados obligatorios

C:

¿Cuánto suman los folios de enero a agosto de liquidaciones?

→ concept=liquidaciones
→ AGGREGATE
→ group_by=NONE
→ cumulative=NO

D:

¿Cuánto suman los folios de enero a agosto de liquidaciones por mes?

→ concept=liquidaciones
→ AGGREGATE
→ MONTH
→ cumulative=NO

E:

¿Cuánto suman los folios de enero a agosto de liquidaciones? por mes

→ igual D

F:

¿Cuánto suman los folios de enero a agosto de liquidaciones? acumulado por mes

→ concept=liquidaciones
→ AGGREGATE
→ MONTH
→ cumulative=YES

G:

¿Cuánto suman los folios de enero a agosto de liquidaciones? suma los montos

→ concept=liquidaciones
→ AGGREGATE
→ SUM
→ group_by=NONE
→ cumulative=NO

## BUSINESS DATA que NO debe romperse

que folios de agosto fueron de POR MES SERVICIOS
→ LIST
→ concept="por mes servicios"

que folios de agosto fueron de SUMA LOS MONTOS SA
→ LIST
→ concept="suma los montos sa"

que folios de agosto fueron de IMPORTE TOTAL SEGUROS
→ LIST
→ concept="importe total seguros"

dame el total de los folios de agosto de POR MES SERVICIOS
→ AGGREGATE
→ concept="por mes servicios"

suma los montos de los folios de agosto de SUMA LOS MONTOS SA
→ AGGREGATE
→ concept="suma los montos sa"

## Contratos congelados — NO reabrir

ESTAN period bridge.

¿Qué apoyos de llantas están en septiembre?
→ concept=llantas
→ 2026-09

Protected lexical immutability:

RENTA DEL MES
PAGO DEL MES
SALDO ACTUAL
MATERIAL PARA
CURSO
SERVICIO EN

TOTAL PLAY LIST/AGGREGATE.

NULL != 0.

KNOWN_ZERO:
0 físico = conocido.

UNKNOWN:
null
undefined
blank
nonfinite

UNKNOWN:
no suma
unknown_amount_count++
is_complete=false

CANCELADO:
fuera del agregado.

PAGADO:
no es prueba contable.

Full-set:
AGGREGATE antes del cap 40.
LIST cap 40.

MONTH:
mes_cargo.

CUMULATIVE:
running solo conocidos.

## North Star anterior — regresión obligatoria

cuanto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes

Debe seguir:

SUPPORT_FAMILIES
RANGE 2026-01..2026-08
concept=remodelacion de taller
AGGREGATE
SUM
MONTH
cumulative=YES

## Preservar

SINGLE
RANGE
ANY

range max 12

inverted range:
0 calls

range >12:
0 calls

partial monthly failure:
fail closed

bonos o bono

gas != gasolina

O-RING
SELLO O-RING

aceite de motor

MAYAN PALACE

morphology
scope
authz

queryReviewableSupportFolios

## No cambiar

planner
routing
SQL
schema
dependencies
authz
scope semantics
RANGE semantics
ANY semantics
morphology semantics

## Fuera de alcance

NO resolver:

apoyos ... de taller como categoría

inversiones en cilindros

inversiones a clientes

mantenimiento ISUZU sin folio/apoyo

acciones abiertas

folio exacto sin mes

ranking autotanque

ARR forecast 302 vs 1522.76

LIST formatMoney(null)

## Regression first

Antes de implementar demostrar contra base_main_sha:

1. CASE A falla por concept tail.
2. CASE H falla por concept tail.
3. CASE C ya conserva liquidaciones.
4. North Star anterior ya funciona.
5. ESTAN ya funciona.

## Tests mínimos

R-FOLIO-TAIL-001 CASE A concept
002 CASE A aggregate
003 CASE A month
004 CASE A cumulative

005 CASE H concept
006 CASE H aggregate
007 CASE H month
008 CASE H cumulative

009 CASE C

010 CASE D concept
011 CASE D MONTH

012 CASE E

013 CASE F concept
014 CASE F cumulative

015 CASE G concept
016 CASE G aggregate

017 POR MES SERVICIOS LIST
018 POR MES SERVICIOS AGG

019 SUMA LOS MONTOS SA LIST
020 SUMA LOS MONTOS SA AGG

021 IMPORTE TOTAL SEGUROS

022 North Star concept
023 North Star RANGE
024 North Star MONTH
025 North Star cumulative

026 ESTAN regression
027 ESTAN business data

028 RENTA DEL MES
029 CURSO

030 TOTAL PLAY LIST
031 TOTAL PLAY AGG

032 NULL != 0
033 zero known
034 null unknown
035 blank unknown
036 nonfinite unknown
037 unknown no suma
038 unknown count
039 incomplete false/true semantics
040 complete true

041 CANCELADO excluded
042 PAGADO null unknown

043 empty month complete
044 null month incomplete
045 running known
046 running completeness

047 aggregate >40 full set
048 LIST cap40

049 ANY bonos|bono
050 gas != gasolina
051 O-RING
052 aceite de motor
053 MAYAN PALACE

054 partial range fail closed
055 inverted range 0 calls
056 range >12 0 calls

057 planner unchanged
058 routing unchanged
059 SQL/dependency unchanged

## Suites obligatorias

R-FOLIO-TAIL
R-FOLIO-ESTAN
R-FOLIO-LOCATOR
R-FOLIO-COMP
R-FOLIO-RANGE
R-FOLIO-LANG
R-FOLIO-TRUTH

planner
capabilities
orchestrator

M2
M4
M5
M6
IGF
continuity

Tier 1

pre-deploy --gate

NEW FAILURE = 0

Si falla algo aparentemente preexistente:
demostrar contra base_main_sha.

## Product files

Preferentemente:

lib/director-ia-folio-search.js

test/director-ia-folio-search-post-concept-analytic-tail.test.js

No planner.

## STOP CONDITIONS

STOP si requiere:

planner
routing
SQL
schema
dependency
LIVE_DB

cambiar ESTAN semantics
cambiar NULL model
cambiar RANGE
cambiar ANY
cambiar morphology
cambiar scope
cambiar authz

STOP si la solución propuesta depende de:

global stopwords
global analytic token stripping
mutar protected concept span

## Reporte

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001.md

Debe iniciar:

IMPLEMENTATION_SHA:
BEFORE:
AFTER:

FIRST_DIVERGENCE_FIXED:
POST_PERIOD_END_MODEL:
ANALYTIC_TAIL_GRAMMAR:
TAIL_MUST_REACH_EOF:
PROTECTED_BUSINESS_DATA:

CASE_A:
CASE_C:
CASE_D:
CASE_E:
CASE_F:
CASE_G:
CASE_H:

NORTH_STAR:
ESTAN_REGRESSION:
PROTECTED_SPAN_REGRESSION:

NULL_MODEL:
FULL_SET:
MONTHLY:
CUMULATIVE:

001..059:
SUITES:
FILES:
RISKS:

PLANNER_CHANGED:
ROUTING_CHANGED:
SQL_NEW:
DEPENDENCY_NEW:

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

Commit únicamente en rama FIX.

STOP.

NO merge.
NO push main.
NO deploy.
NO LIVE_DB.
NO next task.
closure_reason: "HUMAN REVIEW MERGE_OK. POST_PERIOD_DE_TO_TEXT_END now separates recognized post-concept analytic tails from BUSINESS DATA. CASE A-H, North Star, ESTAN, protected-span lexical immutability, Option B NULL semantics, full-set aggregation, CANCELADO, RANGE/ANY and required regressions pass. NEW FAILURE = 0. Declared full-span-tail collision is theoretical/non-blocking and not treated as a production acceptance case."
