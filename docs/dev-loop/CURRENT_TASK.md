task_id: AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-06T17:07:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - READ_ONLY CONVERSATIONAL AUDIT ONLY; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 107977dabba7fe8f691fbc23997fd0612439d4c4

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001.md

objective: Localizar el primer boundary físico que impide o permite que Director IA continúe naturalmente una conversación ejecutiva cuando el usuario responde con un follow-up mínimo como "gasto", sin repetir planta, periodo ni tema.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md

## North Star conversacional

Director IA debe comportarse como una conversación y no como una secuencia de consultas aisladas.

Escenario canónico:

T1:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Contexto físico conocido:
- planta: Acapulco
- periodo A: agosto 2026 real
- periodo B: septiembre 2026 forecast
- effective cut: 2026-09-05

T2:
gasto

La intención humana de T2 es:

"continúa sobre el deterioro de rentabilidad que acabamos de discutir y profundiza en el gasto"

No debería requerir que el usuario vuelva a escribir:
- Acapulco
- agosto
- septiembre
- rentabilidad
- forecast
- upload_day

## Hechos físicos a verificar

En main actual:

- T1 entra por rentabilidad deterioration snapshot.
- askDirectorIa construye conversation_state.
- revisar si parent_intent profitability_deterioro_snapshot sobrevive al sanitize/echo del siguiente turno.
- revisar transporte frontend de conversation_state.
- revisar resolveConversationTurn.
- revisar planner/CEL routing de una utterance mínima "gasto".
- revisar si existe una capacidad física disponible para responder una comparación básica de gasto dentro del contexto heredado.

NO asumir que el defecto está únicamente en INHERITABLE_INTENTS.

## Pregunta única

Después de T1 exitoso, cuando el usuario dice únicamente:

gasto

¿cuál es el PRIMER boundary que impide resolverlo como follow-up del análisis activo de rentabilidad?

## Traza obligatoria

T1 response
→ context_meta.conversation_state
→ frontend conserva state
→ T2 POST conversation_state
→ sanitizeEchoedState
→ resolveConversationTurn
→ parent intent / previous frame
→ planner
→ CEL
→ tool/specialized route
→ respuesta o aclaración

Para cada hop registrar:

PRESERVED
TRANSFORMED
DROPPED
NOT_INHERITABLE
NOT_RECOGNIZED
CAPABILITY_MISSING
RUNTIME_REQUIRED

## Clasificación decisiva

Elegir exactamente una como FIRST_BAD_BOUNDARY:

A. FOLLOWUP_STATE_NOT_TRANSPORTED

El frontend/request no devuelve el state producido en T1.

B. FOLLOWUP_PARENT_NOT_INHERITABLE

El state llega, pero profitability_deterioro_snapshot no sobrevive como contexto activo/heredable.

C. FOLLOWUP_ROUTING_NOT_CONTEXTUAL

El contexto sobrevive, pero "gasto" se planifica/rutea sin usarlo.

D. FOLLOWUP_BRANCH_CAPABILITY_MISSING

El contexto y routing funcionan, pero no existe una capacidad física apropiada para desarrollar la rama gasto.

E. FOLLOWUP_ALREADY_SUPPORTED

La cadena ya resuelve correctamente el follow-up.

F. RUNTIME_REQUIRED

Código estático no permite determinar qué ocurrió en la sesión LIVE.

## Portabilidad secundaria

Sin rediseñar arquitectura, clasificar cada hop como:

GENERIC_CONVERSATION
FOLIOS_DOMAIN
MIXED

Objetivo:
identificar qué parte del mecanismo podría reutilizarse posteriormente en otro proyecto y cuál pertenece al conocimiento/herramientas de Director IA.

No proponer todavía extracción/refactor.

## Human-like acceptance conceptual

La auditoría NO implementa esta respuesta, pero debe evaluar si la arquitectura actual puede llegar a una interacción del tipo:

T1:
¿Qué está provocando el deterioro...?

T2:
gasto

Respuesta esperada semánticamente:
- conserva planta y periodos;
- entiende que "gasto" profundiza el tema anterior;
- no obliga a reformular la pregunta completa;
- no inventa causalidad;
- puede ofrecer el siguiente paso conversacional.

## Browser runtime

Si la estática no basta:

BLOCKED_NEEDS_BROWSER_RUNTIME_EVIDENCE

Preparar una prueba humana mínima con únicamente dos turnos:

T1:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

T2:
gasto

Si DevTools fuera necesario, registrar únicamente:
- endpoint
- question
- planta_id
- upload_day
- presencia/ausencia y campos estructurales de conversation_state

Nunca registrar:
- Authorization
- Bearer
- cookies
- tokens
- headers sensibles

## In scope

- frontend-dashboard/modules/director-ia/ solo lectura
- lib/director-ia-chat.js
- lib/director-ia-conversation-state.js
- lib/director-ia-conversational-executive-layer.js
- lib/director-ia-planner.js
- financial/gastos route únicamente para determinar capability física
- tests existentes solo para inspección/probes read-only
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001.md

## Out of scope

- implementación
- escribir tests nuevos
- modificar producto
- DB/schema
- LIVE_DB
- arr.upload_log
- rentabilidad formulas
- Delta Ingreso
- crear Delta Gastos
- nueva arquitectura
- extraer reusable engine
- modificar docs/director-ia/
- merge
- deploy
- next task

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: inspección read-only
  - tras G1: probes locales read-only existentes si son necesarios
  - tras G1: redactar reporte
  - tras G1: preparar browser evidence humana si fuera necesaria
  - tras G1: DONE_PENDING_REVIEW o BLOCKED_NEEDS_BROWSER_RUNTIME_EVIDENCE

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - implementación
  - tests nuevos
  - modificar producto
  - LIVE_DB
  - DB/schema
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Completion

DRAFT.

Esperar G1 humano.

STOP.
