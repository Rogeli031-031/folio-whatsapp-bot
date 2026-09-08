task_id: FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001

task_type: FIX
mode: REGRESSION_FIRST_REPLACEMENT

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-08T14:05:20-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - REPLACEMENT FIX FOR M9 FORMATTER SEMANTICS + PRE-TRUNCATE PAYLOAD COUNT ONLY; PREVIOUS IMPLEMENTATION REJECTED; NO CHERRY-PICK WHOLE REJECTED IMPLEMENTATION; NO PROMPT REDESIGN; NO POST-GENERATION VALIDATOR; NO M9 LOADERS; NO ARR; NO PLANNER; NO ROUTING; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 7686c093724550da184ae3329a56b96a85a1c217

audit_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001.md
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001.md

rejected_reference_implementation: 3ef8579ac76e1372ee1a087be4604543e15e0775
rejected_reference_decision: 153c8edf

## Objetivo único

Implementar correctamente la semántica del formatter M9 para
financial_diagnosis sin introducir un conteo engañoso después del
truncate de contexto.

Este FIX reemplaza completamente la implementación rechazada:

3ef8579ac76e1372ee1a087be4604543e15e0775

Esa implementación NO está en main y NO debe mergearse.

Puede inspeccionarse únicamente como referencia.

NO hacer cherry-pick completo.

## Dos defects que este replacement debe cerrar juntos

### D1 — ambigüedad original

En main, formatM9Family() puede representar:

dejaron
mas
disminuyeron

como simplemente:

"presentes"

aunque los arrays estén vacíos.

Eso permite que BUCKET_EXISTS se interprete como:

"hubo cambios"

Debe corregirse.

### D2 — defecto introducido en implementación rechazada

La implementación rechazada intentó mostrar:

clientes=N

pero la cadena física fue:

mapM9Family
-> truncateM9Datos
-> clientes.slice(0, 3)
-> formatM9Bucket
-> bucket.clientes.length

Por tanto:

payload clientes = 17

podía terminar como:

clientes=3

Eso es falso como conteo del payload.

El test anterior usó exactamente 3 clientes y no detectó el defecto.

## Invariante crítica

PAYLOAD_CLIENT_COUNT
!=
CONTEXT_SAMPLE_COUNT
!=
UNIVERSE_CLIENT_COUNT

Este FIX solo puede conocer con certeza:

PAYLOAD_CLIENT_COUNT

antes de:

slice(0, 3)

y:

CONTEXT_SAMPLE_COUNT

después del truncate.

NO afirmar:

UNIVERSE_CLIENT_COUNT

porque aguas arriba M9 puede haber aplicado selección/corte propio.

## Modelo requerido

Antes de truncar cada bucket relevante preservar un metadata
equivalente a:

payload_client_count

Luego del truncate puede preservarse:

sample_client_count

y:

clientes_truncated

No es obligatorio usar exactamente esos nombres si existe una forma
más compatible con el shape actual, pero la semántica debe ser
inequívoca.

### Caso crítico obligatorio

Input al financial diagnosis:

clientes.length = 17

Después de truncate:

sample.length = 3

Contexto esperado equivalente a:

payload_client_count=17
sample_client_count=3
truncated=YES
state=NONEMPTY

NO:

clientes=3

como si fuera el conteo completo del payload.

NO:

total_clientes=17

porque no prueba universo total M9.

## Caso <=3

Input:

clientes.length=2

Esperado:

payload_client_count=2
sample_client_count=2
truncated=NO
state=NONEMPTY

## Caso vacío

Input:

clientes=[]

Esperado:

payload_client_count=0
sample_client_count=0
truncated=NO
state=EMPTY

BUCKET_EMPTY no significa:

sin cambio global

Solo significa:

ese bucket del payload está vacío.

## Caso bucket no existente

Si el bucket no existe físicamente:

exists=NO

payload_client_count debe ser:

UNAVAILABLE

o equivalente.

NO fabricar 0.

## Formatter requerido

Eliminar la ambigüedad:

"dejaron/mas/disminuyeron presentes"

Distinguir al menos:

exists
state EMPTY/NONEMPTY
payload_client_count
sample_client_count
truncated

cuando dichos valores estén físicamente disponibles.

## Totales numéricos

Mantener el modelo correcto de la implementación rechazada:

Delta Venta:
totalDeltaKg

Delta Descuento:
totalDeltaRatio

Delta Ingreso:
totalDeltaIngreso

Solo NUMERIC_AVAILABLE si:

value != null
y
Number.isFinite(Number(value))

0 real sigue siendo 0.

null no es 0.

No inventar total.

## source_coercion

Conservar la mejora semántica:

source_coercion debe estar etiquetado como:

CONVENCION_ESTRUCTURAL

y quedar claro que:

- describe reglas cliente-a-cliente / estructurales
- NO significa que el periodo no tenga clientes
- NO significa DATA_NOT_FOUND
- NO significa ausencia global de evidencia

No cambiar la semántica física del COALESCE.

## SOURCE_PARTIAL

Preservar Root 2:

NO DISPONIBLE exacto

missing_inputs

null no es 0

No degradar a SOURCE_AVAILABLE.

## DATA_NOT_FOUND / ERROR / RESTRICTED

Preservar verdad:

NO DISPONIBLE

No fabricar buckets.

No fabricar 0.

## No causalidad

El formatter no debe introducir:

causó
provocó
explica
afectó el ingreso
responsable de

Puede decir únicamente hechos estructurados.

## Prompt y OpenAI fuera de alcance

NO modificar:

FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM
buildFinancialDiagnosisPrompt
openaiDirectorIaChat
buildFinancialDiagnosisChatResult

No post-generation validator.

No retry OpenAI.

La desobediencia causal y alignment serán FIX posteriores.

## Alignment congelado

NO cambiar:

buildAlignment()

Fixture:

IGF 2026-09
ARR 2026-09
M9 2026-08 -> 2026-09

debe seguir:

comparable

## ARR Root 1 congelado

NO cambiar ARR.

observed
!=
projected
!=
previous month
!=
IGF commitment

## M9 Root 2 congelado

NO tocar:

lib/director-ia-m9-deltas.js

Preservar:

MISSING != ZERO

KNOWN_ZERO sigue siendo 0 donde ya está físicamente probado.

## BEFORE requerido

B-001:
base main todavía usa semántica "presentes" o equivalente ambigua.

B-002:
rejected implementation eliminó "presentes" pero contó después del
truncate.

B-003:
fixture 17 clientes en rejected implementation produciría count=3.

B-004:
el metadata de count original se pierde después de slice(0,3).

B-005:
PARTIAL sigue correcto en base.

B-006:
alignment comparable sigue correcto en base.

## Regresiones obligatorias

R-PRECOUNT-001 base ambiguity reproduced
002 rejected post-truncate count defect reproduced/reference-proved
003 17 payload clients -> payload_count=17
004 17 payload clients -> sample_count=3
005 17 payload clients -> truncated=YES
006 17 payload clients -> state=NONEMPTY
007 output never represents 3 as full payload count
008 output never calls 17 universe total
009 4 payload clients -> payload_count=4
010 4 payload clients -> sample_count=3
011 3 payload clients -> payload_count=3
012 3 payload clients -> sample_count=3
013 3 payload clients -> truncated=NO
014 2 payload clients -> 2/2
015 1 payload client -> 1/1
016 0 payload clients -> 0/0 EMPTY
017 missing bucket -> exists=NO
018 missing bucket -> payload count unavailable
019 bucket exists distinct from bucket nonempty
020 EMPTY does not claim global "sin cambios"
021 no literal ambiguous "presentes"
022 no literal "presentan cambios"
023 no literal "ausencia de clientes" from formatter
024 source_coercion labeled CONVENCION_ESTRUCTURAL
025 coercion explicitly not DATA_NOT_FOUND
026 coercion explicitly not period-without-clients
027 venta correct numeric total field
028 descuento correct numeric total field
029 ingreso correct numeric total field
030 numeric total 0 preserved
031 numeric total null not zero
032 SOURCE_PARTIAL preserved
033 partial missing_inputs preserved
034 DATA_NOT_FOUND preserved
035 SOURCE_ERROR preserved
036 SOURCE_RESTRICTED preserved
037 no invented clients
038 no invented totals
039 no causal wording
040 alignment comparable unchanged
041 alignment mismatch unchanged
042 ARR Root1 regression PASS
043 M9 Root2 missing-not-zero PASS
044 known structural zero PASS
045 planner unchanged
046 routing unchanged
047 server unchanged
048 SQL/schema/dependencies unchanged
049 no post-generation validator
050 no prompt redesign
051 existing financial diagnosis tests pass
052 existing M9 tests pass
053 existing ARR tests pass
054 focal >3 test cannot pass if count occurs post-truncate
055 NEW FAILURE = 0

## Test crítico obligatorio

Debe existir un fixture de EXACTAMENTE:

17 clientes

y comprobar simultáneamente:

payload count = 17
sample count = 3
truncated = YES

El test debe fallar si el formatter obtiene el payload count usando:

bucket.clientes.length

DESPUÉS de truncateM9Datos.

También agregar caso:

4 -> payload 4 / sample 3

para cubrir el borde inmediatamente superior al límite.

## Implementación permitida

Producto:

lib/director-ia-financial-diagnosis.js

Puede modificar:

truncateM9Datos
mapM9Family
formatM9Bucket
formatM9Family

solo dentro del mismo archivo si es necesario.

No mover lógica a loaders.

## Test focal

Preferentemente:

test/director-ia-financial-diagnosis-m9-pretruncate-count.test.js

## Gobernanza

docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001.md

## Prohibido

NO tocar:

lib/director-ia-m9-deltas.js
lib/director-ia-igf-arr.js
lib/director-ia-planner.js
lib/director-ia-chat.js
server.js
DICF
commercial_state
package.json
package-lock.json

NO SQL.
NO schema.
NO LIVE_DB.
NO nueva dependencia.

## Rejected branch usage

Se permite:

git show 3ef8579ac76e1372ee1a087be4604543e15e0775

para estudiar la implementación descartada.

NO:

git cherry-pick 3ef8579ac76e1372ee1a087be4604543e15e0775

NO basar la nueva rama en la rama rechazada.

NO merge de la rama rechazada.

Reimplementar limpio desde base_main_sha.

## Suites

Ejecutar:

test focal
financial diagnosis existentes
M9
ARR Root1
ARR
IGF
planner
capabilities
tool-orchestrator
commercial_state
continuity

Tier 1
pre-deploy --gate

NEW FAILURE=0.

Si existe fallo preexistente:

probar contra base_main_sha.

## STOP CONDITIONS

STOP si requiere:

- tocar loaders M9
- redefinir universo total de clientes
- cambiar 80/20 upstream
- SQL
- schema
- planner
- routing
- server
- ARR
- prompt redesign
- post-generation validator
- nueva llamada OpenAI
- LIVE_DB
- dependency
- mezclar FIX 2 o FIX 3 de la auditoría

## Reporte requerido

Debe iniciar:

IMPLEMENTATION_SHA:

BASE_MAIN_SHA:

REJECTED_REFERENCE:

BEFORE:

PRETRUNCATE_COUNT_MODEL:

PAYLOAD_CLIENT_COUNT_MODEL:

SAMPLE_CLIENT_COUNT_MODEL:

TRUNCATION_MODEL:

UNIVERSE_COUNT_CLAIMED:
YES / NO

FORMATTER_MODEL:

SOURCE_COERCION_MODEL:

PARTIAL_MODEL:

NUMERIC_TOTAL_MODEL:

17_CLIENT_FIXTURE:

4_CLIENT_FIXTURE:

001..055:

SUITES:

FILES:
RISKS:

REJECTED_IMPLEMENTATION_MERGED:
YES / NO

REJECTED_IMPLEMENTATION_CHERRYPICKED:
YES / NO

FORMATTER_AMBIGUITY_FIXED:
YES / NO

POST_TRUNCATE_FALSE_COUNT_FIXED:
YES / NO

PROMPT_REDESIGNED:
YES / NO

POST_GENERATION_VALIDATOR_ADDED:
YES / NO

M9_LOADERS_CHANGED:
YES / NO

ARR_CHANGED:
YES / NO

ALIGNMENT_CHANGED:
YES / NO

PLANNER_CHANGED:
YES / NO

ROUTING_CHANGED:
YES / NO

SERVER_CHANGED:
YES / NO

SQL_CHANGED:
YES / NO

SCHEMA_CHANGED:
YES / NO

DEPENDENCY_CHANGED:
YES / NO

LIVE_DB_USED:
YES / NO

FINAL:
PASS /
STOP_SCOPE /
STOP_OTHER

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Commit en nueva rama FIX.

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente task.

Si STOP:

CURRENT_TASK -> STOPPED

Documentar razón.

STOP.
