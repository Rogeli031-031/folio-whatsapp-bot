task_id: FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001

status: CLOSED
authorized_by: Human Approver

authorized_at: 2026-09-02T17:35:55-06:00

human_authorization: AUTHORIZED_BY_HUMAN: Human Approver 2026-09-02

objective: Corregir exclusivamente G-METRIC-SWITCH-001 para que una métrica explícita del turno actual tenga prioridad sobre una métrica incompatible heredada, preservando la continuidad legítima.

in_scope:

* lib/director-ia-planner.js
* tests existentes relacionados con planner, conversation state, historical margin y metric switching
* Golden Regression tests/fixtures únicamente si se requiere añadir cobertura, sin cambiar expectations para forzar PASS
* docs/dev-loop/CURRENT_TASK.md
* docs/dev-loop/reports/FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001.md

out_of_scope:

* DB o schema
* LIVE_DB
* frontend
* resolución canónica de clientes
* clientes nuevos
* movimiento de clientes
* ARR/IGF salvo lectura necesaria para entender el routing
* Tool Orchestrator salvo pruebas de no regresión
* Evidence Builder
* cambios arquitectónicos
* contratos congelados
* deploy
* merge o push a main
* cualquier PRODUCT GOLDEN FAILURE distinto de G-METRIC-SWITCH-001

contracts_in_force:

* AGENTS.md
* docs/dev-loop/LOOP_PROTOCOL.md
* contratos vigentes de Director IA aplicables al planner y continuidad

allowed_actions:

* inspección read-only inicial
* crear rama fix/director-ia-metric-switch-explicit-overrides-inheritance-001 desde main limpio y sincronizado
* ejecutar tests
* modificar únicamente la frontera mínima físicamente demostrada que causa G-METRIC-SWITCH-001
* añadir o ajustar tests determinísticos sin debilitar expectations
* commit en la rama de tarea
* escribir reporte final
* dejar la tarea en DONE_PENDING_REVIEW

forbidden_actions:

* modificar CURRENT_TASK para crear o alterar authorized_by, authorized_at o human_authorization
* arreglar otros Golden FAIL
* desactivar inheritance globalmente
* modificar el output final para ocultar el error del planner
* cambiar DB/schema
* consultar LIVE_DB
* merge a main
* push a main
* deploy
* iniciar siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Evidencia reproducible

Golden actual:

* G-CLIENT-001 PASS
* G-CLIENT-002 PASS
* G-CLIENT-003 PASS
* G-NEW-CLIENTS-001 PASS
* G-MOVEMENT-UP-001 PASS
* G-MOVEMENT-DOWN-001 PASS
* G-MOVEMENT-STOPPED-001 PASS
* G-METRIC-SWITCH-001 FAIL

FIRST_BAD_BOUNDARY:

PLANNER

Comportamiento incorrecto:

* contexto previo: historical_margin
* turno actual: `¿descuento de agosto?`
* resultado actual: intent=historical_margin, inherit=true

## Regla objetivo

Una métrica explícita del turno actual debe prevalecer sobre una métrica incompatible heredada:

explicit_current_turn_metric > inherited_previous_metric

Esto NO autoriza eliminar continuidad.

Si el nuevo turno no introduce una métrica diferente y depende del contexto anterior, la continuidad debe mantenerse.

## Validación BEFORE

Ejecutar:

`npm run test:director-ia:golden`

Debe reproducir conceptualmente:

7 PASS
1 PRODUCT GOLDEN FAILURE
HARNESS FAILURE: 0

Si no reproduce el fallo esperado, STOP y reportar.

## Implementación

Localizar físicamente:

1. dónde PLANNER decide `inherit=true`;
2. dónde reconoce historical_margin;
3. dónde detecta una métrica explícita del turno actual;
4. el orden de precedencia entre current-turn signals y conversation state.

Corregir la primera frontera causal con el cambio mínimo.

No parchear PDFs, respuesta final, tool output ni evidencia si el defecto ocurre en PLANNER.

## Casos mínimos obligatorios

A. historical_margin → `¿descuento de agosto?`

Expected:

* descuento gana;
* historical_margin no sobrescribe la petición explícita;
* agosto se conserva.

B. historical_margin → seguimiento elíptico compatible sin métrica nueva

Expected:

* continuidad legítima permanece.

C. métrica explícita actual vs métrica incompatible heredada

Expected:

* gana la métrica explícita actual.

Si existen métricas soportadas como venta/kg con infraestructura de tests existente, validar el mismo principio sin ampliar capacidades.

## Validación AFTER

Ejecutar:

`npm run test:director-ia:golden`

Expected:

8 PASS
0 PRODUCT GOLDEN FAILURE
0 HARNESS FAILURE

Ejecutar además las suites existentes afectadas de planner/continuity/historical-margin/metric-switch.

Los siete Golden Cases previamente PASS deben seguir PASS.

## Completion

Si G-METRIC-SWITCH-001 pasa sin regresiones:

status: CLOSED
Entregar:

* causa raíz;
* función/frontera modificada;
* diff conceptual;
* Golden BEFORE/AFTER;
* suites adicionales;
* archivos modificados;
* branch;
* commit SHA;
* git status --short.

No merge.
No deploy.
No next task.
STOP.
