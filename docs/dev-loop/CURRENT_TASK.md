task_id: AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-06T17:43:33-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - READ_ONLY CONVERSATIONAL DEPTH AUDIT ONLY; NO IMPLEMENTATION; NO REGEX PATCH; NO LIVE_DB; NO MERGE; NO DEPLOY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 8fd0600f5ab84bf9980e8faaaeb1c8a2d61c6f19

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001.md

objective: Localizar el primer boundary físico que rompe una conversación cuando el usuario profundiza un subtema del turno anterior, usando T1 rentabilidad → T2 gasto → T3 corporativos.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md

## Evidencia LIVE congelada

T1:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Resultado:
PASS.
Snapshot correcto de rentabilidad.

T2:

y gasto?

Resultado:
PASS.

Respuesta contextual:
- conserva Acapulco;
- conserva 2026-08 vs 2026-09;
- reconoce rama gasto;
- no inventa Delta Gastos;
- devuelve conversation_state.

T3:

y corporativos?

Resultado:
FAIL.

Director IA abandona la conversación financiera y responde con diagnóstico general de planta / Action Register:
- acciones abiertas;
- mantenimiento;
- clientes;
- responsables;
- riesgos operativos.

Eso NO corresponde al hilo activo.

## North Star

Una persona interpreta:

T1 rentabilidad
→ T2 gasto
→ T3 corporativos

como:

"de los gastos que acabamos de mencionar, háblame de los corporativos"

No debe exigir:

"háblame de los gastos corporativos dentro de la comparación de rentabilidad de Acapulco agosto vs septiembre"

## Pregunta única

¿Cuál es el PRIMER boundary físico que hace que:

y corporativos?

abandone el hilo:

rentabilidad → gasto

y termine en plant diagnosis / Action Register?

## No asumir

NO asumir de antemano que el único defecto es:

isProfitabilityExpenseFollowUp()

Aunque físicamente hoy reconoce solo gasto/gastos.

Demostrar la cadena completa.

## Traza obligatoria

T2 response
→ context_meta.conversation_state
→ frontend echo T3
→ sanitizeEchoedState
→ resolveConversationTurn("y corporativos?")
→ parent intent
→ subtopic disponible o inexistente
→ detectDirectorIaIntent
→ planner
→ CEL
→ specialized profitability route
→ generic route
→ plant diagnosis final

Para cada hop:

PRESERVED
TRANSFORMED
DROPPED
NO_SUBTOPIC_MODEL
LEXICAL_GATE_MISS
PLANNER_OVERRIDE
CEL_OVERRIDE
GENERIC_FALLTHROUGH
RUNTIME_REQUIRED

## Clasificación decisiva

Elegir exactamente un FIRST_BAD_BOUNDARY:

A. T3_STATE_NOT_TRANSPORTED

B. T3_PARENT_CONTEXT_LOST

C. ACTIVE_SUBTOPIC_NOT_REPRESENTED

El parent rentabilidad sobrevive, pero el sistema no representa que T2 dejó "gasto" como subtopic activo.

D. SUBTOPIC_LEXICAL_GATE_TOO_NARROW

Existe contexto suficiente pero el recognizer/routing solo acepta formas explícitas como "gasto".

E. PLANNER_OVERRIDES_VALID_CONTEXT

F. CEL_OVERRIDES_VALID_CONTEXT

G. GENERIC_FALLTHROUGH_AFTER_VALID_CONTEXT

H. RUNTIME_REQUIRED

## Auditoría arquitectónica secundaria

Determinar si la implementación actual modela conversación como:

1. ACTIVE_TOPIC + ACTIVE_SUBTOPIC estructurados

o como:

2. colección de recognizers específicos por frase.

No rediseñar aún.

## Variantes read-only

Sin convertirlas en nuevos requisitos funcionales, analizar estáticamente cómo caerían:

- y corporativos?
- y operativos?
- cuánto subieron?
- cuál pesa más?
- y los clientes?
- el primero?
- por qué?

Objetivo:
detectar si arreglar solo "corporativos" crearía whack-a-mole.

## Portabilidad

Clasificar:

GENERIC_CONVERSATION
- topic/subtopic continuity
- elliptical follow-up
- pronouns/references
- depth > 2 turns

FOLIOS_DOMAIN
- rentabilidad
- gasto
- corporativos
- operativos
- clientes

MIXED
si el routing combina ambos.

No extraer engine todavía.

## In scope

- lib/director-ia-conversation-state.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js
- lib/director-ia-conversational-executive-layer.js
- helper rentabilidad solo lectura
- frontend Director IA solo lectura si hace falta confirmar echo
- tests existentes solo lectura/probes existentes
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001.md

## Out of scope

- implementación
- tests nuevos
- modificar producto
- agregar "corporativos" al regex
- agregar "operativos" al regex
- Delta Gastos
- nueva fórmula
- DB/schema
- LIVE_DB
- frontend changes
- reusable engine extraction
- docs/director-ia/
- merge
- deploy
- next task

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: inspección read-only
  - tras G1: probes existentes read-only
  - tras G1: reporte
  - tras G1: DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - implementación
  - tests nuevos
  - parche regex
  - LIVE_DB
  - DB/schema
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Completion

DONE_PENDING_REVIEW.

Reporte: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001.md

STOP. Revisión humana. No implementación. No merge. No deploy. No next task.
