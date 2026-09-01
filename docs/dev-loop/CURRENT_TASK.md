# CURRENT_TASK

task_id: AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"

authorized_at: "2026-09-01T14:49:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01"

task_type: AUDIT

branch: audit/director-ia-compound-client-entity-extraction-001

base_main_sha: b0e6c8880166e63e7fec0e4b680ed0658378749d

objective: >
  Localizar físicamente el primer punto de divergencia, por tipo de consulta,
  que impide preservar y resolver un cliente explícito cuando su nombre aparece
  dentro de una pregunta compuesta con métricas y/o periodo, sin asumir que la
  causa única sea planner, routing, extractEntityHint, leading-Y, periodo o resolver.

## Contexto contractual

La tarea anterior:

IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001

está CLOSED e integrada en main.

Su comportamiento aprobado NO se reabre:

- Y GRUPO MOVE como leading-Y multi-token usa evidencia canónica exacta.
- ¿Y GRUPO MOVE? puede resolver Y GRUPO MOVE con evidencia canónica.
- ¿Y Arturo? conserva semántica conversacional Arturo.
- ¿Qué sabemos de Y Arturo? permite identidad explícita Y Arturo.
- No fuzzy.
- Fail-closed preservado.

Hallazgo que quedó expresamente OUT_OF_SCOPE:

- Dame las compras de Y GRUPO MOVE. → extractEntityHint = null
- Dame los kg comprados de Y GRUPO MOVE. → extractEntityHint = null

Esta auditoría investiga ese frente independiente.

NO implementa su solución.

## Pregunta central

Determinar, para cada clase de pregunta compuesta:

raw question
→ semantic recognition
→ planner intent
→ conversation-state
→ entity extraction/candidates
→ client-profile slots
→ canonical resolution

y localizar la PRIMERA frontera en la que se pierde:

a) la intención correcta,
b) la identidad explícita del cliente,
c) o la capacidad de resolverla.

No forzar un FIRST_DIVERGENCE_POINT global si existen dos o más clases causales diferentes.

## Writable in_scope

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001.md

## Read-only in_scope

- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/TASK_TEMPLATE.md
- docs/dev-loop/reports/README.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001.md
- docs/dev-loop/reports/IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001.md
- lib/director-ia-conversation-state.js
- lib/director-ia-client-profile.js
- lib/director-ia-planner.js
- lib/director-ia-chat.js
- tests Director IA relevantes
- git history estrictamente necesaria

## Out of scope

- cualquier modificación de código runtime
- cualquier modificación de tests
- implementar extractor nuevo
- cambiar regex
- cambiar hasNamedClientToken
- cambiar isClientProfileQuestion
- cambiar detectDirectorIaIntent
- cambiar conversation-state
- cambiar canonical resolver
- cambiar prompts LLM
- cambiar aliases
- fuzzy matching
- corregir plant_switch
- corregir Ahora dime lo mismo…
- corregir inherit=false
- reabrir leading-Y ya CLOSED
- reabrir auditoría histórica de enero a la fecha
- cambiar parser temporal
- clientes nuevos
- aumentaron/disminuyeron/dejaron de comprar
- Golden Set
- Render
- Exit 137
- PG pool
- deploy
- merge a main
- docs/director-ia/*
- meta-protocolo

## Probes obligatorios

### Control conocido bueno

1. ¿Qué sabemos de Y GRUPO MOVE?
2. Y GRUPO MOVE
3. ¿Y Arturo?

### Compound sin periodo explícito

4. Dame las compras de Y GRUPO MOVE.
5. Dame los kg comprados de Y GRUPO MOVE.
6. Dame las compras de TORTILLERIA ERICK.
7. Dame los kg comprados de TORTILLERIA ERICK.

### Compound con periodo explícito

8. Dame las compras de Y GRUPO MOVE desde enero a la fecha.
9. Dame los kg comprados de Y GRUPO MOVE desde enero a la fecha.
10. Dame los kg comprados y el descuento por cada mes de Y GRUPO MOVE desde enero a la fecha.
11. Dame las compras de TORTILLERIA ERICK desde enero a la fecha.
12. Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.

### Control con anchor explícito "cliente"

13. Dame las compras del cliente Y GRUPO MOVE desde enero a la fecha.
14. Dame las compras del cliente TORTILLERIA ERICK desde enero a la fecha.

### Control multi-token sin Y inicial

15. Dame los kg comprados de GRUPO MOVE EMPRESARIAL desde enero a la fecha.

Los nombres utilizados en sondas estructurales no prueban existencia real en producción.
No consultar ni mutar producción para fabricar evidencia.

## Fronteras mínimas a medir

Para cada probe, capturar cuando sea físicamente posible:

- raw input
- isClientProfileQuestion
- detectDirectorIaIntent:
  - intent
  - confidence
  - requires_clarification
  - evidence
- classifyTurnKind o equivalente observable
- extractEntityHint
- extractLeadingYHintCandidates
- resolveConversationTurn:
  - inherit
  - entity_hint
  - entity_hint_candidates
  - leading_y_requires_canonical
  - invalidate_entity
- parseExplicitPeriod o resolveClientProfileSlots:
  - period_source
  - requested_range
  - query_start
  - query_end
- canonical resolver / loadClientProfileForChat mediante fixture o dependencia inyectada read-only cuando sea útil

No modificar exports únicamente para poder sondar.

Usar interfaces ya exportadas o call-sites existentes.

## Reglas de interpretación

No asumir:

- que una consulta sin periodo debe ser client_profile;
- que extractEntityHint es necesariamente la primera divergencia;
- que leading-Y es la causa;
- que el parser de periodo es la causa;
- que el resolver es la causa;
- que todas las preguntas compuestas comparten el mismo bug.

Separar como mínimo:

A. SEMANTIC_ROUTING_DIVERGENCE
B. ENTITY_EXTRACTION_DIVERGENCE
C. CANDIDATE_TRANSPORT_DIVERGENCE
D. CANONICAL_RESOLUTION_DIVERGENCE
E. NO_DIVERGENCE
F. CURRENT_CONTRACT_DOES_NOT_CLASSIFY_AS_CLIENT_PROFILE

Una consulta puede pertenecer a una clase distinta de otra.

## Control crítico

Para las consultas con periodo explícito:

"desde enero a la fecha"

verificar únicamente que el parser actual sigue construyendo el rango.

NO reabrir la auditoría histórica del parser.

Si el periodo es correcto y la identidad falla después:

PERIOD_PARSER_CAUSAL = NO para esa sonda.

## Resolver control

Si una pregunta pierde la identidad antes del resolver:

probar por separado, mediante fixture/inyección existente, si el resolver puede resolver correctamente cuando recibe el cliente completo.

Ejemplos estructurales:

- Y GRUPO MOVE
- TORTILLERIA ERICK
- GRUPO MOVE EMPRESARIAL

No modificar base de datos.

No insertar clientes.

No atribuir al resolver un problema causado upstream.

## Leading-Y control

La implementación CLOSED de leading-Y es una frontera protegida.

Determinar solamente:

- si extractLeadingYHintCandidates se ejecuta cuando Y aparece dentro de una oración;
- si está diseñado únicamente para Y/y al inicio;
- si el nuevo transporte de candidates participa o no en preguntas compuestas.

No modificar ese comportamiento.

## Tests

Localizar tests existentes de:

- client_profile
- conversation-state
- planner
- leading-Y
- natural follow-up
- explicit period
- client identity
- compound questions si existen

Determinar:

- qué está cubierto;
- qué no está cubierto;
- si existe algún test que codifique el comportamiento actual como correcto.

NO agregar tests.

GOLDEN_SET_IMPLEMENTED = NO

## Git history

Puede usarse:

- git log
- git show
- git blame
- git diff
- git grep / rg

solo para entender procedencia cuando sea material.

No gastar la auditoría intentando atribuir un commit si la causa física actual ya está demostrada.

Usar INTRODUCING_COMMIT = NOT_PROVEN cuando corresponda.

## Allowed actions

- pasar CURRENT_TASK de AUTHORIZED a IN_PROGRESS cambiando únicamente status
- inspección read-only
- sondas node read-only
- tests existentes
- fixtures/deps inyectadas solo en proceso, sin escribir repo
- git history read-only
- escribir el reporte
- pasar CURRENT_TASK a DONE_PENDING_REVIEW al terminar
- git diff --check
- commit de CURRENT_TASK + reporte
- push únicamente de esta rama de auditoría

## Forbidden actions

- source edits
- test edits
- architecture edits
- implementation
- refactor
- aliases
- fuzzy
- DB writes
- producción writes
- merge
- push a main
- deploy
- Render changes
- abrir siguiente tarea
- autoautorizar implementación
- escribir APPROVED
- escribir CLOSED
- cambiar authorized_by
- cambiar authorized_at
- cambiar human_authorization

max_attempts: 1

result_report_path:
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001.md

implementation_authorized: NO

merge_authorized: NO

## Stop condition

Después de:

- evidencia completa,
- reporte,
- CURRENT_TASK = DONE_PENDING_REVIEW,
- validaciones,
- commit,
- push de la rama,

STOP.

Esperar revisión humana.
