task_id: AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T21:46:19-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001.md

objective: Determinar si el request real del chat de Director IA transporta el effective cut del Dashboard hasta askDirectorIa y el snapshot de rentabilidad, sin implementar.

in_scope:
  - superficie frontend de Director IA
  - DirectorIaChatPanel y componentes equivalentes
  - construcción del POST de chat
  - upload_day en props, URL, state o body
  - handler HTTP del chat
  - handlePostChat
  - askDirectorIa
  - entrada al snapshot de rentabilidad
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001.md
  - preparación de evidencia browser runtime ejecutada por humano si código no basta

out_of_scope:
  - implementación
  - tests
  - LIVE_DB
  - DB/schema
  - arr.upload_log
  - fórmula de rentabilidad
  - Delta Ingreso
  - Action Register
  - docs/director-ia/
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001.md

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: inspección read-only de código
  - tras G1: redactar reporte
  - tras G1: preparar evidencia browser runtime para ejecución humana si hace falta
  - tras G1: DONE_PENDING_REVIEW o BLOCKED_NEEDS_BROWSER_RUNTIME_EVIDENCE

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - implementación
  - escribir tests
  - consultar LIVE_DB
  - modificar DB/schema
  - modificar arr.upload_log
  - modificar Director IA
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Hechos ya demostrados

IGF Forecast ARR LIVE:

effective cut visible:
2026-09-05

request físico observado:

GET /api/dashboard/igf-forecast
year=2026
month=9
upload_day=2026-09-05
include_mini=1

Por tanto:

DASHBOARD_EFFECTIVE_CUT_SOURCE =
FRONTEND_EFFECTIVE_CUT_STATE

DASHBOARD_EFFECTIVE_CUT_VALUE =
2026-09-05

Director IA:

arr.upload_log LIVE = 0 filas
→ resolver = null
→ mini sin cut
→ septiembre MTD.

No reabrir:

DEPLOY_STALE
B_UPLOAD_DAY
UPLOAD_DAY_QUERY_RESULT
DASHBOARD_EFFECTIVE_CUT_SOURCE

## Pregunta única

Cuando se hace la pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

desde el contexto que tiene effective cut 2026-09-05:

¿el POST del chat de Director IA transporta upload_day=2026-09-05?

## Trazabilidad obligatoria

Auditar:

effective cut frontend
→ componente que abre/renderiza Director IA
→ props / URL / state
→ DirectorIaChatPanel o equivalente
→ body del POST
→ handler server
→ handlePostChat
→ askDirectorIa
→ snapshot de rentabilidad

Para cada hop marcar:

PRESERVED
TRANSFORMED
DROPPED
NOT_PRESENT
RUNTIME_REQUIRED

## Matriz obligatoria

HOP
| FIELD
| VALUE/SOURCE
| REACHES NEXT HOP?
| VERDICT

Como mínimo:

Dashboard effective cut
Director IA component
chat POST body
HTTP handler
handlePostChat
askDirectorIa
rentabilidad snapshot deps

## Resultado decisivo

Clasificar exactamente uno:

A.
CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED

El POST contiene upload_day=2026-09-05 pero el snapshot no lo consume.

B.
CHAT_CUT_NOT_TRANSPORTED

El POST no contiene el effective cut.

C.
CHAT_CUT_WRONG_SOURCE

El POST contiene upload_day pero es distinto del effective cut.

D.
RUNTIME_REQUIRED

Código no permite saber qué ocurrió en el request LIVE concreto.

## Browser evidence

Si resulta D:

BLOCKED_NEEDS_BROWSER_RUNTIME_EVIDENCE

Preparar instrucciones para que el Human Approver inspeccione únicamente
el Payload del POST de chat.

Pregunta exacta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Con el Dashboard usando corte:

2026-09-05

Registrar solamente:

endpoint
question
plant/planta si aparece
year si aparece
month si aparece
upload_day si aparece

NO registrar:

Authorization
Bearer
cookies
headers
tokens

## Prohibiciones

No implementar.
No tests.
No DB.
No crear tablas.
No modificar arr.upload_log.
No FIX.
No merge.
No deploy.
No next task.

## Completion

DRAFT.

Esperar G1 humano.

STOP.
