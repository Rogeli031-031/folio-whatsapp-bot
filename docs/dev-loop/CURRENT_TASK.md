task_id: FIX-DIRECTOR-IA-FOLIO-LOCATOR-ESTAN-PERIOD-BRIDGE-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-07T16:37:24-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - IMPLEMENT PERIOD-ADJACENT ESTAN CONTROL BRIDGE IN FOLIO LOCATOR; PRESERVE PROTECTED BUSINESS CONCEPTS; REIMPLEMENT FROZEN AGGREGATE/NULL CONTRACT FROM MAIN; NO PLANNER; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: e1d256b4f330931fcd349850f639e4a62df44f5c

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-LOCATOR-ESTAN-PERIOD-BRIDGE-001.md

objective: Corregir únicamente la frontera del locator para que 'estan/están' quede fuera del concept span cuando funciona sintácticamente como puente hacia un periodo, sin convertir 'estan' en stopword/trailing leftover global y sin mutilar BUSINESS DATA.

## Implementaciones rechazadas

NO cherry-pick:

805a4ce51029fda39bd4a0adb7836a2e7a75255a
51a6d775b656121a13911c3e0a0e8bc44f890b31
488a3faf85ea915aeec49bb98f8e0e8d27e4f7d2
fe1e263534d1e1510a757437f98919c88aac8154
623f4dca66bf078f4f74b3a8e6223be20bfa9952

Usarlas solo como evidencia histórica.

## Blocker demostrado

Actual:

que apoyos de llantas estan en septiembre?
→ concept_query="llantas estan"

que folios de llantas estan en agosto?
→ concept_query="llantas estan"

que apoyos de llantas estan para septiembre?
→ concept_query="llantas estan"

Correcto:

→ concept_query="llantas"

## Invariante

ESTAN NO ES STOPWORD GLOBAL.

ESTAN NO SE AGREGA COMO TRAILING LEFTOVER GENERICO.

Debe considerarse CONTROL únicamente cuando la sintaxis demuestra
que funciona como bridge hacia el periodo.

Ejemplos:

llantas estan en septiembre
llantas estan para septiembre

Concept:
llantas

Control:
estan en septiembre
estan para septiembre

## Business data protegido

Debe seguir siendo posible buscar conceptos que contengan ESTAN.

B1
que folios de agosto fueron de ESTAN?
→ LIST
→ concept_query="estan"

B2
dame los folios de agosto de ESTAN
→ LIST
→ concept_query="estan"

B3
cuanto suman los folios de agosto de ESTAN?
→ AGGREGATE
→ concept_query="estan"

B4
que folios de agosto fueron de SERVICIOS ESTAN?
→ LIST
→ concept_query="servicios estan"

No puede resolverse B1-B4 eliminando 'estan'.

## Period bridge obligatorio

P1
que apoyos de llantas estan en septiembre?
→ LIST
→ concept llantas
→ period 2026-09

P2
que folios de llantas estan en agosto?
→ LIST
→ concept llantas
→ period 2026-08

P3
que apoyos de llantas estan para septiembre?
→ LIST
→ concept llantas
→ period 2026-09

P4
que apoyos estan en septiembre?
→ LIST
→ concept null
→ period 2026-09

P5
que folios estan en agosto?
→ LIST
→ concept null
→ period 2026-08

## Controles ya congelados

C1
que apoyos de llantas tenemos en septiembre?
→ llantas

C2
que apoyos de llantas hay en septiembre?
→ llantas

C3
que apoyos de llantas existen en septiembre?
→ llantas

C4
que folios de agosto fueron de RENTA DEL MES?
→ renta del mes

C5
que folios de agosto fueron de CURSO?
→ curso

C6
dame los folios de agosto de TOTAL PLAY
→ LIST
→ total play

C7
cuanto suman los folios de agosto de TOTAL PLAY
→ AGGREGATE
→ total play

C8
cual es el importe total de los folios de agosto de IMPORTE TOTAL SEGUROS?
→ AGGREGATE
→ importe total seguros

C9
dame el total de los folios de agosto de POR MES SERVICIOS
→ AGGREGATE
→ por mes servicios

## North Star congelado

cuanto hemos gastado en apoyos en REMODELACION DE TALLER de enero a agosto? suma los montos en un acumulado por mes

Debe seguir:

scope=SUPPORT_FAMILIES
period_mode=RANGE
period_start=2026-01
period_end=2026-08
concept_query=remodelacion de taller

analysis_mode=AGGREGATE
aggregation=SUM
group_by=MONTH
cumulative=YES

## Lexical immutability congelada

Una vez localizado un HIGH-CONFIDENCE concept span:

PROTECTED_CONCEPT_IS_LEXICALLY_IMMUTABLE = YES

No STRUCTURAL_TOKENS.pop().

Conservar:

RENTA DEL MES
PAGO DEL MES
SALDO ACTUAL
MATERIAL PARA
CURSO
SERVICIO EN

## NULL semantics congelada

KNOWN_ZERO:
0 físico
→ conocido
→ suma 0

KNOWN_NONZERO:
finito
→ conocido

UNKNOWN:

null
undefined
blank
nonfinite

→ NO es cero
→ no suma
→ unknown_amount_count++
→ is_complete=false

Clasificar antes de Number().

## CANCELADO

AGGREGATE:
fuera de eligible
fuera de suma
fuera de unknown count

LIST:
sin cambio.

## PAGADO

No filtro implícito.
No prueba gasto contable.

## Full set

AGGREGATE:
todos los matched/deduped antes del cap.

LIST:
cap 40.

## MONTH / cumulative

Preservar exactamente contrato anterior:

mes_cargo
empty month complete zero
unknown month incomplete
running solo conocidos
running_is_complete propaga
known_total = último running cuando cumulative YES

## Preservar sin cambios semánticos

SINGLE
RANGE
ANY

inclusive range
max 12
inverted 0 calls
>12 0 calls
partial range fail-closed

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
SQL existente

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

No resolver:

cuanto tenemos de apoyos de enero a agosto de taller?
inversiones en cilindros
inversiones a clientes
mantenimiento ISUZU
acciones abiertas
folio exacto sin mes
ranking AT
ARR 302 vs 1522.76
LIST formatMoney(null)

## Regression first

Demostrar contra base_main_sha:

- no AGGREGATE
- comportamiento base de ESTAN
- no Option B
- no cherry-pick

## Tests mínimos

R-FOLIO-ESTAN-001 llantas estan en septiembre
002 llantas estan en agosto
003 llantas estan para septiembre
004 apoyos estan en septiembre no concept
005 folios estan en agosto no concept

006 ESTAN como concepto
007 dame ESTAN como concepto
008 aggregate ESTAN
009 SERVICIOS ESTAN

010 tenemos control
011 hay control
012 existen control

013 RENTA DEL MES
014 CURSO

015 TOTAL PLAY LIST
016 TOTAL PLAY AGG
017 IMPORTE TOTAL SEGUROS AGG
018 POR MES SERVICIOS AGG

019 North Star concept
020 North Star RANGE
021 North Star MONTH
022 North Star cumulative

023 NULL != 0
024 zero known
025 null unknown
026 undefined unknown
027 blank unknown
028 nonfinite unknown
029 unknown no suma
030 unknown count
031 complete false
032 complete true

033 CANCELADO null excluido
034 PAGADO null unknown

035 empty month complete zero
036 null month incomplete
037 running known
038 running completeness
039 known total

040 aggregate >40 full set
041 LIST cap40

042 ANY bonos|bono
043 gas != gasolina
044 O-RING
045 aceite de motor
046 MAYAN PALACE

047 partial range fail closed
048 inverted range 0 calls
049 >12 range 0 calls

050 planner unchanged
051 SQL unchanged
052 dependencies unchanged

## Suites

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

NEW FAILURE = 0.

Si una falla parece preexistente:
demostrar contra base_main_sha.

## STOP CONDITIONS

STOP si requiere:

agregar ESTAN como stopword/trailing leftover global

planner
routing
SQL
schema
dependency
LIVE_DB

cambiar RANGE
ANY
morphology
scope
authz

## Reporte

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-LOCATOR-ESTAN-PERIOD-BRIDGE-001.md

Debe iniciar:

IMPLEMENTATION_SHA:
BEFORE:
AFTER:

ESTAN_PERIOD_BRIDGE_MODEL:
ESTAN_GLOBAL_STOPWORD:
ESTAN_BUSINESS_DATA_PRESERVED:

LLANTAS_ESTAN_EN:
LLANTAS_ESTAN_PARA:
ESTAN_AS_CONCEPT:
SERVICIOS_ESTAN:

LOCATOR_BOUNDARY:
PROTECTED_SPAN_IMMUTABILITY:
ANALYTIC_MODEL:

NULL_MODEL:
FULL_SET:
MONTHLY:
CUMULATIVE:

NORTH_STAR:
001..052:
SUITES:
FILES:
RISKS:

PLANNER_CHANGED:
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
