task_id: FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-08T15:02:16-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-08 - FINANCIAL DIAGNOSIS PROMPT STATUS/ALIGNMENT CONTRACT ONLY; NO FORMATTER CHANGES; NO BUILDALIGNMENT CHANGE; NO M9/ARR LOADERS; NO POST-GENERATION VALIDATOR; NO OPENAI RETRY; NO PLANNER; NO ROUTING; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 952ba1b5a44e1c9410a15643d1c7d7feb30b4905

audit_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001.md
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001.md

## Objetivo único

Endurecer únicamente el contrato de prompt de financial_diagnosis
para que el LLM trate como hechos obligatorios los estados
deterministas ya calculados.

NO cambiar evidencia.
NO cambiar formatter.
NO cambiar buildAlignment().
NO implementar validator post-generation.

## Evidencia LIVE confirmada

Commit LIVE:

952ba1b5a44e1c9410a15643d1c7d7feb30b4905

Pregunta:

¿Por qué cayó el ingreso?

Respuesta LIVE incluyó:

1.
"El delta ingreso en M9 muestra una disminución significativa,
lo que puede estar relacionado con la disminución en la venta."

2.
"el bloque M9 se refiere a un periodo diferente
(2026-08 vs 2026-09)."

3.
"La caída en el ingreso puede estar relacionada con
la disminución en la venta"

Pero físicamente:

IGF = 2026-09
ARR = 2026-09
M9 = 2026-08 -> 2026-09

buildAlignment():

alignment.status = comparable

Por tanto el modelo contradijo un hecho determinista.

## Root físico

FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM actualmente dice:

"Si alignment.status es mismatch, no trates los cortes como el mismo mes."

Pero no contiene la regla inversa obligatoria:

Si alignment.status=comparable,
NO puedes declarar mismatch,
periodo diferente que limite alineación,
ni falta de comparabilidad.

buildFinancialDiagnosisPrompt() actualmente termina:

"Declara limitaciones y period mismatch si existen."

Eso permite al LLM decidir semánticamente si "existe",
aunque buildAlignment ya lo decidió.

## Invariantes

DETERMINISTIC_STATUS > LLM_INTERPRETATION

alignment.status=comparable
=> MUST describe comparable

alignment.status=comparable
=> MUST NOT claim:
   mismatch
   periodo diferente que limita comparación
   falta de alineación
   period mismatch

alignment.status=mismatch
=> MUST describe mismatch

SOURCE_AVAILABLE
=> MUST NOT be rewritten as missing/unavailable.

SOURCE_PARTIAL
=> exact result unavailable only according to missing_inputs.
=> MUST NOT invent reason outside missing_inputs.

CONVENCION_ESTRUCTURAL
=> MUST NOT become:
   "el periodo no tiene clientes"
   "ausencia de clientes"
   DATA_NOT_FOUND

NO_CAUSAL_EVIDENCE
=> MUST NOT claim:
   debido a
   causó
   provocó
   explica
   puede estar relacionado con
   podría indicar la causa
   sugiere que X ocasionó Y

Coexistencia/correlación descriptiva no prueba causalidad.

## North Star LIVE

Para los datos actuales:

IGF:
venta 1506.3507 ton
margen 7.1248 $/kg

ARR:
proyección 1469.36 ton

M9:
2026-08 -> 2026-09
delta ingreso disminuyeron 5906844.3468 MXN
delta venta disminuyeron 1059160.2600 kg

Permitido:

"M9 registra una disminución de Delta Ingreso y una disminución
de Delta Venta en el mismo par de periodos."

NO permitido:

"La caída del ingreso puede estar relacionada con la disminución
de la venta."

Permitido:

"IGF y ARR muestran cifras distintas para objetos distintos."

NO permitido:

"la diferencia podría indicar la causa del ingreso."

La conclusión debe reconocer:

"Con estas fuentes no puedo determinar por qué cayó el ingreso
ni atribuir causalidad a venta, descuento o clientes."

No exigir literal exacto si existe redacción equivalente.

## Prompt contract requerido

El prompt debe incluir un bloque determinista generado desde
assembled, equivalente conceptualmente a:

FINANCIAL_DIAGNOSIS_CONTROL

ALIGNMENT_STATUS=comparable

REQUIRED:
- tratar IGF 2026-09 / ARR 2026-09 /
  M9 2026-08->2026-09 como comparables
  según buildAlignment.

FORBIDDEN:
- decir que M9 tiene "periodo diferente" que limita comparación
- declarar period mismatch

CAUSAL_EVIDENCE=NONE

REQUIRED:
- si preguntan "por qué", declarar que las fuentes no prueban causa.

FORBIDDEN:
- inferir que Delta Venta causa Delta Ingreso
- inferir causalidad por simultaneidad.

Puede implementarse con helper local de prompt dentro de:

lib/director-ia-financial-diagnosis.js

No modificar evidencia ni context formatter.

## Status de fuentes

El contrato también debe anclar los estados de:

IGF
ARR
M9
M9 venta
M9 descuento
M9 ingreso

Ejemplo:

M9_DELTA_INGRESO_STATUS=SOURCE_AVAILABLE

No permitir que el modelo lo convierta en unavailable.

Para SOURCE_PARTIAL:

usar exclusivamente missing_inputs físicos.

No inventar "ausencia de clientes" si missing_inputs no lo dice.

## Tensión

"Tensión" solo puede significar:

diferencia descriptiva entre objetos/fuentes.

No puede transformarse en:

causa
driver
explicación
"podría indicar"
"puede estar relacionado"

## BEFORE requerido

B-001:
system prompt tiene regla mismatch negativa pero no comparable positiva.

B-002:
user prompt dice "period mismatch si existen" sin anclarlo
obligatoriamente a alignment.status.

B-003:
LIVE comparable produjo falso period mismatch.

B-004:
LIVE usó "puede estar relacionado" pese a no_causalidad.

B-005:
LIVE atribuyó posible relación Delta Venta -> Delta Ingreso.

B-006:
buildAlignment ya produce comparable correctamente y no debe cambiar.

## Regresiones obligatorias

R-PROMPT-001 comparable genera contrato REQUIRED comparable
002 comparable genera FORBIDDEN mismatch
003 comparable prohíbe "periodo diferente que limita"
004 mismatch genera REQUIRED mismatch
005 mismatch no genera REQUIRED comparable
006 alignment.status tratado como authoritative
007 IGF status incluido en contrato
008 ARR status incluido en contrato
009 M9 aggregate status incluido
010 delta_venta status incluido
011 delta_descuento status incluido
012 delta_ingreso status incluido
013 SOURCE_AVAILABLE no puede describirse como missing
014 SOURCE_PARTIAL usa missing_inputs
015 SOURCE_PARTIAL no inventa missing reason
016 structural convention no significa periodo sin clientes
017 structural convention no significa DATA_NOT_FOUND
018 no causal evidence queda explícito
019 "por qué" exige declaración de no causa probada
020 Delta Venta y Delta Ingreso pueden coexistir descriptivamente
021 coexistencia no autoriza causalidad
022 prohíbe "puede estar relacionado"
023 prohíbe "podría indicar la causa"
024 prohíbe "debido a" como atribución causal
025 tensión queda definida como diferencia descriptiva
026 tensión no es driver
027 no hipótesis N5
028 no responsable
029 no impacto causal inventado
030 formatter output unchanged
031 truncate/count semantics unchanged
032 buildAlignment unchanged
033 assemble evidence unchanged
034 M9 loaders unchanged
035 ARR loaders unchanged
036 Root1 ARR observed/projected PASS
037 Root2 M9 missing-not-zero PASS
038 17/3 pretruncate regression PASS
039 no post-generation validator
040 no retry OpenAI
041 no nueva llamada OpenAI
042 buildFinancialDiagnosisChatResult unchanged
043 planner unchanged
044 routing unchanged
045 server unchanged
046 SQL/schema/dependencies unchanged
047 existing FD tests pass
048 existing M9 formatter/pretruncate tests pass
049 existing M9 tests pass
050 existing ARR tests pass
051 Tier 1 PASS
052 pre-deploy --gate PASS
053 NEW FAILURE = 0

## Archivos de producto permitidos

lib/director-ia-financial-diagnosis.js

Dentro de ese archivo solo puede modificarse:

FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM
buildFinancialDiagnosisPrompt()

y un helper local nuevo usado exclusivamente para construir
el contrato del prompt.

## Congelado dentro del mismo archivo

NO modificar:

truncateM9Datos
mapM9Family
aggregateM9
buildAlignment
collectLimitations
assembleFinancialDiagnosisEvidence
loadFinancialDiagnosisForChat
formatIgfPayload
formatArrPayload
formatM9Bucket
formatM9StructuralConvention
formatM9Family
formatFinancialDiagnosisContext
buildFinancialDiagnosisChatResult
shouldAbortForAuthz

Si requiere cambiar alguno:

STOP.

## Test focal

Preferentemente:

test/director-ia-financial-diagnosis-prompt-status-alignment.test.js

## Gobernanza

docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001.md

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

NO validator post-generation.
NO scanner de respuesta.
NO rewrite de respuesta.
NO fallback determinista.
NO segundo llamado OpenAI.
NO retry.
NO SQL.
NO schema.
NO LIVE_DB.
NO dependencia nueva.

## Suites

Ejecutar:

test focal
financial diagnosis existentes
M9 formatter/pretruncate
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

## STOP CONDITIONS

STOP si requiere:

- modificar buildAlignment
- modificar formatter
- modificar loaders
- modificar evidencia
- validator post-generation
- retry OpenAI
- segunda llamada OpenAI
- planner
- routing
- server
- SQL
- schema
- LIVE_DB
- dependencies
- mezclar el siguiente validator FIX

## Reporte requerido

Debe iniciar:

IMPLEMENTATION_SHA:

BASE_MAIN_SHA:

BEFORE:

PROMPT_CONTROL_MODEL:

ALIGNMENT_AUTHORITY_MODEL:

COMPARABLE_MODEL:

MISMATCH_MODEL:

SOURCE_STATUS_MODEL:

PARTIAL_MODEL:

CAUSALITY_MODEL:

TENSION_MODEL:

LIVE_NORTH_STAR_MODEL:

001..053:

SUITES:

FILES:
RISKS:

FORMATTER_CHANGED:
YES / NO

BUILD_ALIGNMENT_CHANGED:
YES / NO

EVIDENCE_CHANGED:
YES / NO

POST_GENERATION_VALIDATOR_ADDED:
YES / NO

OPENAI_RETRY_ADDED:
YES / NO

M9_LOADERS_CHANGED:
YES / NO

ARR_CHANGED:
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

Commit en rama FIX.

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
