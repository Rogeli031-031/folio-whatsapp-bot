task_id: FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-06T18:00:48-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - ACTIVE_SUBTOPIC CONVERSATIONAL FIX AUTHORIZED; REGRESSION_FIRST; COMMIT ON FIX BRANCH AUTHORIZED; NO LIVE_DB; NO MERGE; NO PUSH MAIN; NO DEPLOY"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: e0e2bd60dbdf07ff02c8357ebbbf26b43db234fd

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001.md

objective: Introducir representación estructurada mínima de active_subtopic para que Director IA pueda profundizar una conversación más allá de dos turnos, comenzando con rentabilidad → gasto → corporativos, sin resolverlo mediante una lista creciente de regex independientes.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001.md

## Hecho demostrado

FIRST_BAD_BOUNDARY:

ACTIVE_SUBTOPIC_NOT_REPRESENTED

Después de T2:

parent_intent = profitability_deterioro_snapshot
planta = preservada
periodos = preservados

pero no existe representación estructurada equivalente a:

active_subtopic = gasto

T3 "y corporativos?" hereda correctamente el parent,
pero no puede resolver la referencia relativa al subtema anterior.

## North Star

T1:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

T2:
y gasto?

T3:
y corporativos?

La semántica humana de T3 es:

"de la rama gasto que acabamos de abrir dentro del análisis de rentabilidad,
háblame ahora de corporativos"

No debe convertirse en:
plant diagnosis
Action Register
diagnóstico general de operación.

## Objetivo arquitectónico mínimo

Introducir un slot conversacional estructurado reutilizable:

active_subtopic

La infraestructura genérica debe poder:

- sanitizarlo;
- transportarlo;
- conservarlo;
- limpiarlo por plant mismatch;
- incluirlo en snapshotCurrentFrame / previous_frame si corresponde;
- actualizarlo cuando un turno establece un subtema;
- reutilizarlo en el siguiente turno.

NO crear un segundo sistema paralelo de estado.

## Separación obligatoria

GENERIC_CONVERSATION:

- active_subtopic como estructura/slot
- persistencia intra-session
- sanitización
- invalidación por planta
- continuidad de referencias elípticas

FOLIOS_DOMAIN:

- profitability_deterioro_snapshot
- expense / gasto
- corporate expense / corporativos
- operating expense / operativos
- respuesta/limitaciones financieras

La capa genérica NO debe saber qué significa "corporativos".

## Primera jerarquía domain-specific permitida

La implementación puede modelar conceptualmente:

profitability_deterioro_snapshot
  → expense
      → corporate
      → operational

Los nombres físicos pueden diferir si existe una convención mejor.

No crear una taxonomía global completa.

## Regression first

La prueba debe cruzar askDirectorIa.

Como mínimo:

R-CONV-SUBTOPIC-001
T1 deja parent profitability_deterioro_snapshot.

R-CONV-SUBTOPIC-002
T2 "y gasto?" deja active_subtopic estructurado equivalente a expense.

R-CONV-SUBTOPIC-003
T2 conserva planta y A/B.

R-CONV-SUBTOPIC-004
T3 "y corporativos?" recibe parent + active_subtopic expense.

R-CONV-SUBTOPIC-005
T3 resuelve corporativos como child/focus de gasto, no como plant diagnosis.

R-CONV-SUBTOPIC-006
T3 no cae en generic Action Register / GPT.

R-CONV-SUBTOPIC-007
T3 conserva conversation_state para un T4 posterior.

R-CONV-SUBTOPIC-008
plant mismatch limpia parent/subtopic y no cruza contexto.

R-CONV-SUBTOPIC-009
"y corporativos?" sin hilo previo NO inventa que hablamos de gasto.

R-CONV-SUBTOPIC-010
un subtopic no reconocido dentro de un parent válido no debe producir datos no relacionados; debe responder contextual o aclarar dentro del hilo.

## T4 exploratorio de regresión

Agregar al menos una prueba que demuestre profundidad adicional sin exigir nueva capacidad financiera:

T4:
¿cuánto subieron?

Debe demostrar una de estas dos conductas seguras:

A. si existe evidencia física conectada al active_subtopic corporate, responde con ella;

o

B. conserva el hilo y explica que ese comparativo específico todavía no está conectado.

NO puede saltar a otro dominio.

El acceptance principal sigue siendo T1→T2→T3.

## Respuesta T3

Debe ser breve y conversacional.

Si la capacidad física para comparar gasto corporativo ya existe de forma explícita y segura, puede usarla.

Si NO existe conectada a esta ruta:

debe decirlo dentro del hilo.

Ejemplo semántico permitido:

"Sí, seguimos dentro de gasto. Corporativos es la siguiente rama. Todavía no tengo ese comparativo reconciliado conectado a este análisis, así que no voy a atribuirle una parte de la caída."

NO hardcodear ese texto si existe mejor evidencia física.

## Prohibición financiera

NO crear Delta Gastos.

NO derivar gasto corporativo mediante una fórmula nueva.

NO inferir:

corporativo = rentabilidad operativa - rentabilidad final

como nueva fuente física.

NO nueva fórmula financiera.

NO causalidad monetaria.

Si existe un campo físico de gasto corporativo ya disponible, puede reutilizarse únicamente si el routing actual puede accederlo sin ampliar el scope de forma sustancial.

Si para responder cifras se requiere nueva adquisición de datos:
NO hacerlo en este FIX.

La continuidad tiene prioridad sobre agregar capacidad.

## Anti whack-a-mole

NO resolver el task agregando únicamente regex independientes para:

corporativos
operativos
clientes
cuánto
por qué
primero
etc.

Puede existir reconocimiento lexical domain-specific,
pero debe resolverse CONTRA active_subtopic/parent estructurados.

El resultado debe demostrar:

"corporativos" significa algo diferente por el contexto activo,
no porque exista una ruta global hardcodeada que siempre lo capture.

## In scope

- lib/director-ia-conversation-state.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js solo si es estrictamente necesario
- helper conversacional/domain-specific mínimo para rentabilidad si físicamente conviene
- helper rentabilidad existente solo para composición contextual segura
- tests de continuidad/subtopic
- fixtures/helpers mínimos
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001.md

## Out of scope

- frontend salvo contradicción física y STOP
- DB/schema
- LIVE_DB
- Delta Gastos
- nueva fórmula
- nuevas consultas SQL
- arr.upload_log
- nueva adquisición financiera
- refactor masivo
- taxonomía global de todos los dominios
- reusable engine extraction
- persistencia cross-session
- docs/director-ia/
- merge
- push main
- deploy
- next task

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: regression-first
  - tras G1: implementación mínima
  - tras G1: tests relacionados
  - tras G1: reporte
  - tras G1: commit únicamente en rama si G1 lo autoriza
  - tras G1: DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - parche regex aislado
  - Delta Gastos
  - nueva fórmula financiera
  - DB/schema
  - LIVE_DB
  - nuevas queries
  - frontend sin STOP
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Completion

DONE_PENDING_REVIEW.

Reporte: docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001.md

STOP. Esperar revisión humana. No merge. No push main. No deploy. No next task.
