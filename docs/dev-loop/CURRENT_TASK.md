task_id: AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001

task_type: AUDIT
mode: READ_ONLY_AUDIT

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-08T12:28:17-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - AUDIT FINANCIAL DIAGNOSIS CAUSALITY / M9 NARRATIVE / ALIGNMENT ONLY; NO IMPLEMENTATION; NO BEHAVIOR CHANGE; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: c554c2742a83d222c2c38dd1fb33347d16e26b8d

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001.md

## Objetivo único

Auditar físicamente por qué financial_diagnosis produce una
respuesta narrativa que contradice o reinterpreta la evidencia
estructurada que recibe.

No implementar.

No corregir.

No modificar comportamiento.

## Evidencia LIVE post Root 2

Pregunta:

¿Por qué cayó el ingreso?

Respuesta relevante:

BLOQUE M9:
"Delta venta, descuento e ingreso presentan cambios, pero no se
especifican cifras exactas debido a la ausencia de clientes en el
mes disponible."

Limitación declarada:

"No se puede establecer causalidad entre los bloques."

Conclusión posterior:

"La caída en el ingreso podría estar relacionada con la discrepancia
entre las ventas observadas y proyectadas, así como la ausencia de
clientes en el mes de comparación, pero no se puede afirmar una
causa directa."

También afirmó:

"Los periodos de IGF y ARR son comparables, pero el bloque M9 presenta
un periodo diferente (2026-08 vs 2026-09), lo que limita la comparación
directa."

## Hechos ya demostrados

Root 1 ARR está validado LIVE:

observed current
!=
projected current
!=
previous month
!=
IGF commitment

Root 2 M9 está validado en su objetivo primario:

MISSING != ZERO

No reabrir ni reinterpretar esos roots.

## Contratos existentes a verificar

En lib/director-ia-financial-diagnosis.js existe:

"null no es 0. Ausencia no es cero."

"Prohibido: causalidad"

"No formules hipótesis N5."

"No completes vacíos."

Y el contexto termina con equivalente a:

"No inventes cifras. No afirmes causa."

También existe buildAlignment() con status calculado
determinísticamente.

## Síntomas a auditar por separado

### S1 — causalidad / hipótesis

Determinar por qué el modelo puede emitir:

"podría estar relacionada con..."

aunque el system/context la prohíba.

Clasificar si la divergencia ocurre en:

A. evidence assembly
B. context formatter
C. prompt construction
D. OpenAI generation
E. post-generation validation
F. response formatting
G. otro punto físico

Determinar si existe o no un validador determinístico después
de la generación.

### S2 — M9 "presenta cambios"

Determinar qué texto exacto recibe el modelo para cada familia:

delta_venta
delta_descuento
delta_ingreso

y si frases como:

"dejaron/mas/disminuyeron presentes"

pueden ser interpretadas incorrectamente como:

"hubo cambios"

aunque:

- los buckets estén vacíos
- no haya cifras exactas
- la familia sea partial
- falten inputs
- no exista evidencia suficiente para esa conclusión

No asumir que este es el root.
Probarlo.

Distinguir:

BUCKET_EXISTS
BUCKET_NONEMPTY
NUMERIC_DELTA_AVAILABLE
EXACT_DELTA_AVAILABLE
SOURCE_PARTIAL
DATA_NOT_FOUND

No tratarlos como equivalentes.

### S3 — "ausencia de clientes"

Localizar de dónde salió la frase:

"ausencia de clientes en el mes disponible"

Determinar si:

- existe literalmente en contexto
- se deriva de source_coercion
- se deriva de buckets vacíos
- se inventa durante generación
- proviene de otra fuente

Reportar exacto.

### S4 — alignment

Auditar:

buildAlignment()

y la forma en que alignment.status / alignment.note
llegan al modelo.

Caso LIVE:

IGF = 2026-09
ARR = 2026-09
M9 = 2026-08 vs 2026-09

Determinar qué status produce físicamente la función.

Si produce comparable:

probar que el modelo recibió "comparable"
y aun así narró "periodo diferente".

Si produce mismatch:

explicar físicamente por qué.

No inferir.

### S5 — "tensión" IGF vs ARR

Auditar qué significa actualmente una tensión.

IGF venta:
1506.3507 ton

ARR proyectada:
1469.36 ton

La diferencia puede señalarse como diferencia entre objetos,
pero NO como causa de caída de ingreso.

Determinar si el prompt distingue correctamente:

DIFFERENCE
TENSION
CAUSE
DRIVER
HYPOTHESIS

y en qué frontera se pierde esa distinción.

## Cadena física obligatoria

Trazar completa:

pregunta
-> planner intent
-> financial_diagnosis route
-> loadFinancialDiagnosisForChat
-> loadIgfArrSourceBlocksForChat
-> M9 loaders
-> assembleFinancialDiagnosisEvidence
-> mapM9Family
-> aggregateM9
-> buildAlignment
-> formatFinancialDiagnosisContext
-> buildFinancialDiagnosisPrompt
-> llamada OpenAI
-> respuesta generada
-> cualquier post-procesamiento
-> respuesta HTTP/chat

Para cada hop:

FILE:
FUNCTION:
INPUT:
OUTPUT:
CAN_INTRODUCE_CAUSALITY:
CAN_OVERRIDE_ALIGNMENT:
CAN_INVENT_M9_CHANGE:
POST_VALIDATION_PRESENT:

## Reproducción sin LIVE_DB

No usar LIVE_DB.

Usar fixtures / unit tests / llamadas puras existentes.

Crear únicamente sondas read-only temporales si hace falta.
No commitear código de sonda.

Reproducir al menos:

### A — all M9 unavailable

venta DATA_NOT_FOUND
descuento DATA_NOT_FOUND
ingreso DATA_NOT_FOUND

Ver contexto exacto.

### B — venta/descuento available, ingreso partial

Reproducir contexto exacto.

### C — buckets existentes pero vacíos

Determinar qué texto ve el modelo.

### D — alignment comparable

IGF 2026-09
ARR 2026-09
M9 2026-08 -> 2026-09

Expected physical status:
probar, no asumir.

### E — alignment mismatch real

Construir un caso donde M9 no incluya 2026-09.

Comparar textos.

## Auditoría del prompt

Separar:

SYSTEM PROMPT
USER CONTENT
CONTEXT

Listar las instrucciones relevantes en orden real.

Determinar si existen instrucciones contradictorias o demasiado
blandas, por ejemplo:

"señala tensiones"
vs
"no causalidad"

"resume hechos"
vs
datos parciales

No recomendar todavía una solución hasta probar el root.

## Auditoría post-generation

Buscar físicamente si la respuesta generada se valida contra:

- causal language
- unsupported claims
- alignment.status
- source availability
- missing inputs

Si NO existe validator:

POST_GENERATION_GUARD_PRESENT: NO

Si existe:

identificar por qué no bloqueó la respuesta LIVE.

## Preguntas de auditoría obligatorias

Q1:
¿La causalidad apareció antes o después de OpenAI?

Q2:
¿El contexto entregado a OpenAI contenía alguna afirmación causal?

Q3:
¿"presentan cambios" está soportado por evidencia estructurada?

Q4:
¿"ausencia de clientes" está soportado por evidencia estructurada?

Q5:
¿Qué alignment.status produce físicamente el caso
2026-09 / 2026-09 / 2026-08→2026-09?

Q6:
¿El LLM puede contradecir alignment.status sin ser bloqueado?

Q7:
¿Existe post-generation validation?

Q8:
¿Cuál es el PRIMER punto físico de divergencia para cada síntoma?

Q9:
¿Los tres síntomas comparten un solo root o son roots distintos?

Q10:
¿Cuál es la frontera mínima de un futuro FIX?

## Root classification

Para cada síntoma usar una de:

EVIDENCE_WRONG
EVIDENCE_AMBIGUOUS
PROMPT_AMBIGUOUS
LLM_NONCOMPLIANCE
POST_VALIDATION_ABSENT
POST_VALIDATION_BUG
ALIGNMENT_BUG
FORMATTER_BUG
OTHER

Puede haber más de un root.

No forzar mega-fix.

## Posibles fronteras futuras

Auditar, NO implementar, si la corrección mínima debería vivir en:

1. evidence/context formatter
2. prompt contract
3. deterministic post-generation validator
4. deterministic answer builder para ciertos estados
5. combinación de fronteras

Evaluar tradeoff:

- seguridad semántica
- mínima superficie
- no volver respuestas robóticas
- no convertir LLM en fuente de verdad
- preservar lenguaje natural
- preservar bloques IGF/ARR/M9 separados

## Scope prohibido

NO modificar:

lib/director-ia-m9-deltas.js
lib/director-ia-igf-arr.js
planner
routing
server.js
DICF
commercial_state
schema
SQL
dependencies

NO implementar validator.

NO cambiar prompt.

NO cambiar formatter.

NO cambiar tests de producto.

NO LIVE_DB.

## Archivos permitidos

Solo:

docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001.md

Las sondas temporales read-only deben eliminarse antes de cerrar.

## Suites / probes

No se exige suite completa de implementación.

Ejecutar al menos:

financial diagnosis tests existentes
M9 tests existentes
ARR projection regression existente

Más fixtures/sondas puras necesarias para probar:

alignment
M9 status text
context
prompt

No alterar tests.

## Resultado requerido

El reporte debe iniciar:

AUDIT_RESULT:

BASE_MAIN_SHA:

LIVE_SYMPTOMS:

PHYSICAL_CHAIN:

S1_CAUSALITY:
FIRST_DIVERGENCE:
ROOT_CLASS:

S2_M9_CHANGE_CLAIM:
FIRST_DIVERGENCE:
ROOT_CLASS:

S3_ABSENCE_OF_CLIENTS:
SOURCE:
SUPPORTED:
ROOT_CLASS:

S4_ALIGNMENT:
PHYSICAL_STATUS:
CONTEXT_STATUS:
MODEL_STATEMENT:
FIRST_DIVERGENCE:
ROOT_CLASS:

S5_IGF_ARR_TENSION:
SUPPORTED_DIFFERENCE:
SUPPORTED_CAUSALITY:

POST_GENERATION_GUARD_PRESENT:

Q1:
Q2:
Q3:
Q4:
Q5:
Q6:
Q7:
Q8:
Q9:
Q10:

MINIMAL_FIX_BOUNDARY:

SPLIT_RECOMMENDATION:

FILES_INSPECTED:
FUNCTIONS_INSPECTED:
PROBES:
TESTS:

ARR_ROOT1_CHANGED: NO
M9_ROOT2_CHANGED: NO
PLANNER_CHANGED: NO
ROUTING_CHANGED: NO
SQL_CHANGED: NO
SCHEMA_CHANGED: NO
DEPENDENCY_CHANGED: NO
LIVE_DB_USED: NO

FINAL:
DONE_PENDING_REVIEW /
STOPPED

## Completion

Al terminar auditoría:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte.

Commit únicamente docs de auditoría.

STOP.

No implementation.
No merge.
No push main.
No deploy.
No next task.
closure_reason: "HUMAN REVIEW AUDIT_OK. Audit proved separate downstream roots: ambiguous M9 formatter semantics, prompt/LLM noncompliance with deterministic alignment and no-causality, and absence of post-generation validation. ARR Root 1 and M9 Root 2 remain correct and frozen. Future fixes must remain split."
