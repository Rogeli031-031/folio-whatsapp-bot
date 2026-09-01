# CURRENT_TASK

task_id: IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001

status: CLOSED

human_review: APPROVED

authorized_by: "Human Approver"

authorized_at: "2026-09-01T15:09:39-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01"

task_type: IMPLEMENTATION

branch: implementation/director-ia-compound-client-query-001

base_main_sha: d348ead3d66c8a02c0bf153f54438a971b1f12b6

audit_contract:
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001.md

objective: >
  Implementar de forma mínima, determinista, canonical-exact y fail-closed
  soporte para clientes explícitos dentro de preguntas compuestas de compras,
  kg y descuento, resolviendo separadamente la extracción de identidad embebida
  y el reconocimiento semántico de consultas sin periodo.

## Slices autorizados

### Slice A — embedded client identity

Corregir consultas que YA llegan a client_profile pero pierden o recortan
el nombre del cliente.

Debe cubrir:

- Y GRUPO MOVE embebido;
- TORTILLERIA ERICK embebido;
- GRUPO MOVE EMPRESARIAL;
- anchor cliente;
- nombres multi-token;
- periodo explícito;
- múltiples métricas.

La extracción puede producir candidatos.

La identidad final debe requerir evidencia canónica exacta.

NO fuzzy.
NO alias silencioso.
NO hardcode.

### Slice B — client query without explicit period

Después de estabilizar Slice A, permitir:

- Dame las compras de <CLIENTE>.
- Dame los kg comprados de <CLIENTE>.

como client_profile cuando exista señal explícita defendible de cliente.

NO convertir preguntas generales de compras/kg en client_profile.

Sin periodo explícito conservar:

period_source = default

y:

3 meses calendario.

## Acceptance obligatorio

Debe funcionar:

- Dame las compras de Y GRUPO MOVE.
- Dame los kg comprados de Y GRUPO MOVE.
- Dame las compras de TORTILLERIA ERICK.
- Dame los kg comprados de TORTILLERIA ERICK.
- Dame las compras de Y GRUPO MOVE desde enero a la fecha.
- Dame los kg comprados de Y GRUPO MOVE desde enero a la fecha.
- Dame los kg comprados y el descuento por cada mes de Y GRUPO MOVE desde enero a la fecha.
- Dame las compras de TORTILLERIA ERICK desde enero a la fecha.
- Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.
- Dame las compras del cliente Y GRUPO MOVE desde enero a la fecha.
- Dame las compras del cliente TORTILLERIA ERICK desde enero a la fecha.
- Dame los kg comprados de GRUPO MOVE EMPRESARIAL desde enero a la fecha.

Protecciones:

- ¿Qué sabemos de Y GRUPO MOVE? sigue funcionando.
- Y GRUPO MOVE leading-Y sigue funcionando.
- ¿Y Arturo? sigue siendo Arturo.
- ¿Qué sabemos de Y Arturo? puede resolver Y Arturo.
- periodo enero→fecha no cambia.
- default sin periodo sigue siendo 3 meses.
- explicit client > inherited client.
- explicit period > inherited/default.
- autorización por planta no cambia.
- discount/kg no cambia.
- DATA_NOT_FOUND no cambia.

## Fail closed

Sin exact canonical hit:

- no prefix matching;
- no substring matching;
- no fuzzy;
- no primer token;
- no cliente inventado.

Duplicados exactos deben seguir ambiguous cuando corresponda.

No convertir en cliente:

- Dame los kg comprados desde enero a la fecha.
- Dame las compras de la planta desde enero a la fecha.

## in_scope runtime

- lib/director-ia-client-profile.js
- lib/director-ia-conversation-state.js
- lib/director-ia-planner.js
- lib/director-ia-chat.js

Modificar solo los necesarios.

## in_scope tests/docs

- test/director-ia-compound-client-query.test.js
- tests Director IA estrictamente necesarios
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001.md

## out_of_scope

- server.js
- DB/schema/migrations
- producción
- Render
- Exit 137
- PG pool
- deploy
- docs/director-ia/*
- AGENTS.md
- LOOP_PROTOCOL.md
- TASK_TEMPLATE.md
- reports/README.md
- plant_switch
- Ahora dime lo mismo
- inherit=false de ese hallazgo
- reescribir leading-Y CLOSED
- cambiar parser enero a la fecha
- clientes nuevos
- aumentaron
- disminuyeron
- dejaron de comprar
- movimiento de clientes
- Golden Set general
- fuzzy resolver
- aliases generales
- LLM para identidad
- refactor general no necesario
- cambios oportunistas

## Validation

Crear:

test/director-ia-compound-client-query.test.js

Cubrir:

- B1-B4
- C1-C5
- D1-D2
- E1
- leading-Y
- Y Arturo collision
- no-period default 3M
- explicit period
- nonexistent client fail-closed
- exact duplicate ambiguity
- no-client controls
- no-hardcode con otro nombre multi-token

Ejecutar focalizados y después:

node --test test/director-ia-*.test.js

Baseline previo:

1354 pass / 0 fail

Suite final:

0 fail.

No eliminar tests.

## Report

Crear:

docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001.md

Documentar Slice A y Slice B por separado, mecanismo, canonical evidence,
fail-closed, before/after, regresiones, tests, riesgos y OUT_OF_SCOPE.

## allowed_actions

- AUTHORIZED → IN_PROGRESS cambiando únicamente status
- implementación in_scope
- tests
- reporte
- DONE_PENDING_REVIEW
- commit de esta rama
- push de esta rama

## forbidden_actions

- cambiar campos humanos G1
- escribir APPROVED
- escribir CLOSED
- merge a main
- push a main
- deploy
- siguiente tarea
- corregir OUT_OF_SCOPE

max_attempts: 1

result_report_path:
docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001.md

implementation_authorized: YES
merge_authorized: YES

closed_by_human: YES
deploy_authorized: NO

## Stop condition

CURRENT_TASK = DONE_PENDING_REVIEW
tests = green
report = complete
commit = created
branch = pushed
working tree = clean

STOP.

No merge.
No deploy.
No siguiente tarea.
