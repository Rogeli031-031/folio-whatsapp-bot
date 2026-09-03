task_id: IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-02T20:26:11-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-02"
objective: Añadir la capa B de Golden in-process sobre askDirectorIa para que el gate pre-deploy detecte HTTP 500 y cambios de métrica/pack que TIER 1 no ve, sin corregir producto.

mode: TEST_INFRASTRUCTURE_ONLY

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

in_scope:

* test/fixtures/director-ia-golden-cases.js (añadir casos RUNTIME; no debilitar expectations TIER 1)
* test/helpers/director-ia-golden-harness.js (observación TIER 1 intacta; añadir runner Capa B o extraer helper hermano)
* test/helpers/director-ia-runtime-golden-harness.js (nuevo, si se separa Capa B)
* test/director-ia-golden-regression.test.js
* scripts/director-ia-golden-regression.js
* package.json (comando o extensión del comando Golden; no inventar otro runner de producto)
* docs/dev-loop/CURRENT_TASK.md
* docs/dev-loop/reports/IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001.md

out_of_scope:

* cualquier cambio de comportamiento en lib/ (planner, chat, conversation-state, tools, historical-margin, client-profile, evidence, orchestrator)
* server.js
* docs/director-ia/
* DB / schema / LIVE_DB / Render / tokens
* frontend
* arreglar el HTTP 500 de margen histórico ERICK
* arreglar inherit/runtime de descuento
* crear capacidad de descuento mensual de planta
* crear margen histórico por cliente
* debilitar G-METRIC-SWITCH-001 u otros TIER 1 para forzar PASS
* comparar prosa LLM / “se siente bien”
* merge o push a main
* deploy
* iniciar FIX de los casos RUNTIME

contracts_in_force:

* AGENTS.md
* docs/dev-loop/LOOP_PROTOCOL.md
* docs/dev-loop/TASK_TEMPLATE.md
* docs/dev-loop/reports/IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001.md
* docs/dev-loop/reports/FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001.md
* contratos vigentes de Director IA (lectura; no reescribir)

allowed_actions:

* inspección read-only inicial
* crear rama implementation/director-ia-predeploy-runtime-gate-001 desde main limpio y sincronizado
* ejecutar TIER 1 y suites existentes de solo lectura
* añadir harness/fixtures/comando de Capa B in-process
* llamar askDirectorIa / configureDirectorIaChat desde tests con stubs/fixtures (misma entrada que el chat)
* commit en la rama de tarea
* escribir reporte
* dejar DONE_PENDING_REVIEW

forbidden_actions:

* escribir AUTHORIZED_BY_HUMAN
* poner status AUTHORIZED
* crear, borrar o modificar authorized_by, authorized_at o human_authorization
* editar lib/ o server.js
* consultar LIVE_DB
* usar el backend Render o tokens de dashboard/WhatsApp
* corregir producto para poner RUNTIME en PASS
* cambiar expectations TIER 1 para forzar PASS
* match de prosa GPT como criterio de PASS
* merge a main
* push a main
* deploy
* encadenar la siguiente tarea (FIX de 500, FIX de descuento, etc.)

max_attempts: 1

result_report_path: docs/dev-loop/reports/IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001.md

## Por qué esta tarea (no es un FIX)

TIER 1 Golden observa planner / conversation-state / loaders. No ejecuta el runtime de chat.

Por eso coexisten:

* TIER 1 `G-METRIC-SWITCH-001` PASS (`plan.intent !== historical_margin`)
* chat real: HTTP 500, pack de materialidad/kg/DICF, o “no se pudo determinar intención”

Esta tarea construye el detector. No autoriza reparar lo detectado.

Los cuatro casos RUNTIME son fallos distintos. No unificarlos en un solo “arreglar descuento”.

## Capa A — TIER 1 (ya existe; no rehacer)

Comando actual: `npm run test:director-ia:golden`

Debe seguir existiendo y no perder casos. No cambiar producto. No debilitar fixtures TIER 1.

Capa A no es gate de deploy por sí sola.

## Capa B — PRE-DEPLOY RUNTIME (a construir)

Entrada: la misma que el chat (`askDirectorIa(req, plantaId, question)`), in-process.

Deps: `configureDirectorIaChat` con pool/loaders stub o fixture. `now` fijo (p. ej. 2026-09-01 America/Mexico_City), igual que TIER 1.

Prohibido: LIVE_DB, HTTP real a Render, OpenAI de producción. Si un caso exige modelo, stubear la llamada y afirmar pack/intent/status, no la prosa.

Asserts estructurales (PASS/FAIL de producto):

* no throw no capturado
* `status` no 5xx (en particular no 500)
* `intent` / tool / `last_evidence_bundle_type` / `parent_intent` del estado
* métrica del pack (margen vs descuento vs materialidad/kg/DICF)
* clarificación específica vs genérica de intención
* continuidad o cambio de contexto en el segundo turno

No es PASS “la respuesta se siente bien”.

Si el 500 de ERICK no se reproduce in-process: STOP y reportar. No fingir PASS. No ir a LIVE_DB. No “arreglarlo un poco” para que el harness corra.

## Casos RUNTIME obligatorios

Textos exactos. No parafrasear.

### R-RUNTIME-001 — margen histórico ERICK rango

Turnos:

1. `Dame el margen histórico de TORTILLERIA ERICK de enero a agosto.`

Hard FAIL:

* throw
* HTTP/status 5xx

Semantic FAIL:

* responde como descuento, kg de perfil, materialidad, DICF o brief ejecutivo

Esta tarea NO decide si debe existir margen histórico por cliente. NO implementar esa capacidad.

Si el runtime no 500 y entrega fail-closed o clarificación específica (margen histórico es de planta / no cubre cliente+rango), registrarlo en el reporte como observación. El caso sigue siendo PRODUCT FAIL respecto de “devuelve margen” hasta un FIX humano posterior. El éxito de ESTA tarea es detectar, no poner verde.

Expected AFTER de esta infra: el caso corre y, si el 500 existe, queda PRODUCT_GOLDEN_FAILURE con FIRST_BAD_BOUNDARY (no HARNESS_FAILURE).

### R-RUNTIME-002 — margen histórico → descuento de agosto

Turnos:

1. parent de margen histórico (el de R-RUNTIME-001, o `¿Cuál fue el margen en mayo?` si el parent 500 impide encadenar; documentar cuál se usó y por qué)
2. `¿descuento de agosto?`

Expected (contrato de observación, no de FIX):

* no 5xx
* no pack `historical_margin`
* pack/ruta de descuento, o clarificación específica de descuento+periodo+cliente
* no materialidad/kg/DICF como respuesta de descuento

TIER 1 `G-METRIC-SWITCH-001` PASS no basta. Capa B debe ver el resultado de `askDirectorIa`.

### R-RUNTIME-003 — como vamos → descuento de agosto

Turnos:

1. `como vamos?`
2. `descuento de agosto?`

Expected (observación):

* no 5xx
* no reutilizar pack de `daily_executive_brief` / CEL / `plant_diagnosis` / materialidad comercial / kg / DICF como si fuera descuento
* cambio a descuento, o clarificación específica de descuento

El FIX de inherit HM→descuento no cubre este padre. No “corregirlo” aquí.

### R-RUNTIME-004 — first-turn descuento

Turnos:

1. `¿descuento de agosto?` (chat nuevo, sin estado)

Esta tarea NO crea capacidad de descuento mensual de planta.

FAIL:

* mensaje genérico de “no se pudo determinar intención” (o equivalente) como outcome de éxito
* 5xx
* pack de materialidad/kg/DICF/margen

PASS (solo observación; no implementar):

* clarificación específica que pida cliente y/o alcance, o
* pack real de descuento si la infraestructura de test ya lo produce sin cambiar lib/

No inventar el contrato de producto más allá de: nunca genérico de intención; nunca 500; nunca otra métrica.

## Comando y letrero

Un comando único (extender `scripts/director-ia-golden-regression.js` o el npm script existente) debe imprimir conceptualmente:

```text
PRE-DEPLOY DIRECTOR IA

TIER 1
<n>/<n> PASS

RUNTIME
R-RUNTIME-001  Historical margin ERICK ........ PASS|FAIL  FIRST_BAD_BOUNDARY=...
R-RUNTIME-002  Margin → discount .............. PASS|FAIL  FIRST_BAD_BOUNDARY=...
R-RUNTIME-003  Plant/executive → discount ..... PASS|FAIL  FIRST_BAD_BOUNDARY=...
R-RUNTIME-004  First-turn discount ............ PASS|FAIL  FIRST_BAD_BOUNDARY=...
HTTP 5xx ...................................... <count>

PRE-DEPLOY GATE = PASS|FAIL
```

Reglas:

* REPORT (default): exit 0 salvo HARNESS_FAILURE
* GATE (`--gate`): exit 1 si TIER 1 PRODUCT FAIL o RUNTIME PRODUCT FAIL o HARNESS_FAILURE
* PRE-DEPLOY GATE = PASS solo si TIER 1 PASS completo y RUNTIME PASS completo y HTTP 5xx = 0 y HARNESS 0

En ESTA tarea, PRE-DEPLOY GATE = FAIL es el resultado esperado si se reproducen los bugs. Eso es éxito de la infra.

No cablear este gate a CI/GitHub Actions/watchers.

## Validación BEFORE

1. Confirmar rama ≠ `main` para implementar (solo tras G1).
2. `npm run test:director-ia:golden` — registrar TIER 1 actual (esperado: 8 PASS / 0 PRODUCT FAIL / HARNESS 0, salvo que main haya cambiado; si cambia, STOP y reportar).
3. No existe Capa B: los cuatro RUNTIME no están en el letrero pre-deploy.

Si TIER 1 no corre: STOP. No “arreglar producto” para poder escribir el harness.

## Implementación

1. Inventariar cómo `askDirectorIa` se stubee hoy en tests existentes. Reutilizar, no inventar framework.
2. Añadir fixtures RUNTIME con los textos exactos.
3. Harness Capa B: una entrada chat, frontiers al menos HTTP/STATUS, INTENT/ROUTE, EVIDENCE_BUNDLE, METRIC_PACK, USER_VISIBLE_OUTCOME.
4. Preservar TIER 1. Si un helper se comparte, no cambiar el significado de un PASS TIER 1.
5. Si falta un export de test-only y eso exige editar lib/: STOP. No “abrir un hueco” de producto.

## Validación AFTER (éxito de infra, no de producto)

* TIER 1: mismos 8 casos, mismas expectations, mismo veredicto que BEFORE (salvo HARNESS nuevo = STOP).
* Los 4 RUNTIME se ejecutan.
* Ningún RUNTIME FAIL se etiqueta HARNESS_FAILURE.
* Cada RUNTIME FAIL tiene FIRST_BAD_BOUNDARY.
* R-RUNTIME-001, si el 500 existe, es PRODUCT FAIL (status/throw), no “NOT_OBSERVABLE”.
* `PRE-DEPLOY GATE = FAIL` mientras exista algún RUNTIME FAIL.
* `--gate` exit 1 si PRE-DEPLOY GATE = FAIL.
* Suites del harness Golden existentes siguen pasando.
* `git diff` de lib/ y server.js vacío.

Si los 4 RUNTIME pasan sin tocar lib/: STOP. El harness no está observando el runtime real.

## Completion

status: CLOSED
Entregar:

* inventario de entrada chat / stubs reutilizados
* diseño Capa B (fronteras, asserts)
* TIER 1 BEFORE/AFTER
* RUNTIME resultado por caso + FIRST_BAD_BOUNDARY
* conteo HTTP 5xx
* letrero PRE-DEPLOY completo
* archivos tocados / no tocados
* prueba de que lib/ y server.js no cambiaron
* branch
* commit SHA
* git status --short

No merge.
No deploy.
No FIX de producto.
No next task.
STOP.

## Autorización (solo HUMAN_APPROVER)

Para ejecutar, el humano sustituye únicamente:

```yaml
status: AUTHORIZED
authorized_by: "<nombre>"
authorized_at: "<ISO-8601 con zona>"
human_authorization: "AUTHORIZED_BY_HUMAN: <nombre> <YYYY-MM-DD>"
implementation_authorized: YES
```

Sin esa línea `human_authorization` escrita por humano, esta propuesta no es ejecutable.
