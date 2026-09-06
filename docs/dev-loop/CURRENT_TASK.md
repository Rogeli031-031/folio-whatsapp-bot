task_id: FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-06T17:14:59-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - CONVERSATIONAL FIX IMPLEMENTATION AUTHORIZED; REGRESSION_FIRST; COMMIT ON FIX BRANCH AUTHORIZED; NO LIVE_DB; NO MERGE; NO PUSH MAIN; NO DEPLOY"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: f11c4ce947e001acdf8fabde3a3e0b7ba70af1b4

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md

objective: Hacer que un follow-up mínimo como "gasto" continúe el hilo activo de deterioro de rentabilidad sin obligar al usuario a repetir planta, periodos ni tema, sin crear Delta Gastos ni inventar nueva evidencia financiera.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001.md

## Hecho demostrado por auditoría

FIRST_BAD_BOUNDARY:

FOLLOWUP_PARENT_NOT_INHERITABLE

T1 construye:

parent_intent = profitability_deterioro_snapshot

pero buildConversationState lo anula porque ese parent no está registrado como heredable.

El frontend sí transporta conversation_state.

T2:

gasto

hoy termina como:
- detected unknown
- inherit false
- CEL no_need
- aclaración genérica.

## North Star

T1:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

T2:

gasto

T2 debe entenderse como:

"continúa sobre el análisis de rentabilidad activo y profundiza en gasto"

sin repetir:
- planta
- periodo A
- periodo B
- rentabilidad
- forecast
- effective cut

## Restricción crítica

NO asumir que agregar una entrada a INHERITABLE_INTENTS resuelve todo.

La regresión debe cruzar físicamente:

T1
→ state producido
→ T2 echoed state
→ sanitizeEchoedState
→ resolveConversationTurn
→ planner
→ chat route
→ respuesta

## Estado conversacional requerido

Después de T1 debe conservarse de forma segura al menos:

- parent_intent = profitability_deterioro_snapshot
- planta_id
- periodo_a
- periodo_b

Si la infraestructura existente permite representar esos periodos mediante active_period_months, reutilizarla.

No crear un segundo sistema de estado paralelo.

El effective cut debe continuar usando el mecanismo request/upload_day ya existente.

## Comportamiento mínimo T2 "gasto"

PASS si:

1. no genera aclaración genérica de tema;
2. reconoce que sigue dentro del deterioro de rentabilidad;
3. conserva planta y comparación temporal;
4. no vuelve a imprimir simplemente el reporte completo de T1;
5. responde de forma breve y conversacional;
6. no afirma que existe Delta Gastos;
7. no inventa atribución monetaria causal;
8. puede indicar que la comparación de gasto disponible es básica si esa capacidad está físicamente disponible;
9. si la rama detallada de gasto todavía no está físicamente disponible, lo dice dentro del contexto activo en vez de perder el hilo.

Ejemplo semántico permitido, NO hardcode:

"Sí, seguimos con el deterioro de rentabilidad. Sobre gasto, todavía no tengo un Delta Gastos reconciliado. Puedo revisar la comparación de gasto disponible sin atribuirle causalidad."

No copiar literalmente si los datos/capacidades físicas permiten una respuesta mejor.

## No objetivo

Este FIX NO tiene que construir todavía:

- Delta Gastos
- bridge reconciliado
- atribución por driver
- controlabilidad
- nueva fórmula financiera

El objetivo es continuidad conversacional.

## Regression first

Crear prueba end-to-end/in-process que cruce askDirectorIa.

Como mínimo:

R-CONV-PROFIT-001
T1 produce parent_intent heredable profitability_deterioro_snapshot.

R-CONV-PROFIT-002
T1 conserva planta.

R-CONV-PROFIT-003
T1 conserva periodo A/B usando estado estructurado existente.

R-CONV-PROFIT-004
T2 "gasto" con echoed state produce inherit=true.

R-CONV-PROFIT-005
T2 no termina en unknown clarification genérica.

R-CONV-PROFIT-006
T2 no repite íntegramente T1.

R-CONV-PROFIT-007
T2 no afirma Delta Gastos reconciliado.

R-CONV-PROFIT-008
plant mismatch sigue limpiando contexto y no cruza planta.

R-CONV-PROFIT-009
sin conversation_state, "gasto" aislado NO inventa hilo.

## Portabilidad

La solución debe distinguir:

GENERIC_CONVERSATION:
- conservar parent/frame
- heredar un follow-up corto
- invalidar por cambio de planta
- evitar inventar contexto cuando no existe

FOLIOS_DOMAIN:
- profitability_deterioro_snapshot
- significado de gasto/rentabilidad
- fuentes financieras

No extraer todavía un engine reusable.
No refactor masivo.

## In scope

- lib/director-ia-conversation-state.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js solo si físicamente necesario para continuidad
- helper de rentabilidad existente solo si es estrictamente necesario para respuesta contextual
- tests de continuidad
- fixtures/helpers mínimos
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md

## Out of scope

- frontend salvo contradicción física y STOP
- DB/schema
- LIVE_DB
- arr.upload_log
- Delta Gastos
- fórmula de rentabilidad
- nueva fuente de verdad
- hardcode Acapulco
- hardcode agosto/septiembre
- hardcode 2026-09-05
- persistencia cross-session
- reusable engine extraction
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
  - tras G1: commit en rama si autorizado
  - tras G1: DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - Delta Gastos
  - nueva fórmula
  - DB/schema
  - LIVE_DB
  - frontend sin STOP
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Completion

DONE_PENDING_REVIEW.

Reporte: docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md

STOP. Revisión humana. No merge. No push main. No deploy. No next task.
