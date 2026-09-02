# IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001

task_type: IMPLEMENTATION

mode: TEST_INFRASTRUCTURE_ONLY

status: DONE_PENDING_REVIEW

implementation_authorized: YES

merge_authorized: NO

deploy_authorized: NO

rollback_authorized: NO

docs_director_ia_changed: NO

runtime_changed: NO

backend_changed: NO

frontend_changed: NO

database_changed: NO

schema_changed: NO

max_attempts: 3

authorized_by: "Human Approver"

authorized_at: "2026-09-02T17:12:57-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver approved IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001 to build a deterministic Golden Regression harness from real Director IA executive questions so Cursor can reproduce and locate failures without relying on manual human chat testing. Test infrastructure only. No Director IA behavior changes, no production runtime changes, no DB/schema changes, no merge, no deploy, no next task."

## 0. Disposición humana de la tarea anterior

La tarea:

`DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001`

permanece:

`BLOCKED / NOT_EXECUTED`

El humano decide estacionarla y autoriza explícitamente continuar con una tarea independiente de Director IA.

No reinterpretar `BLOCKED` como deploy exitoso.

No borrar su CURRENT_TASK/report.

Preservar esa evidencia.

El humano NO está autorizando reintentar ese deploy dentro de esta tarea.

## 1. Objetivo único

Construir un sistema reproducible de regresión para Director IA que permita ejecutar automáticamente preguntas ejecutivas reales ya usadas por el humano y determinar:

`Pregunta → contexto → planner → entidades → métricas → periodo → herramientas → evidencia → resultado`

sin depender de que el humano tenga que descubrir manualmente las regresiones conversando con Director IA.

Esta tarea crea INFRAESTRUCTURA DE PRUEBAS.

NO corrige todavía ninguna de las respuestas que actualmente fallen.

## 2. North star

Después de esta tarea, Cursor debe poder ejecutar UN comando y entregar algo conceptualmente equivalente a:

DIRECTOR IA GOLDEN REGRESSION

Clientes
PASS / FAIL ...

Continuidad
PASS / FAIL ...

Movimiento de clientes
PASS / FAIL ...

Métricas
PASS / FAIL ...

TOTAL
PASS: N
FAIL: N

y para cada FAIL indicar la primera frontera observable que divergió.

Ejemplo conceptual:

Pregunta:
Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.

Entity extraction: PASS
Canonical resolution: FAIL
Planner: client_analysis
Metrics: kg + descuento
Period: enero→fecha
Tool execution: NOT_REACHED
Evidence: NOT_REACHED

FIRST_BAD_BOUNDARY:
<función/frontera físicamente demostrada>

Expected:
resolver cliente explícito sin pedir cliente_key

Actual:
cliente_key = null / clarification

No limitarse a decir:

`respuesta incorrecta`

## 3. Regla fundamental: NO comparar prosa literal

El Golden Set NO debe exigir una respuesta redactada palabra por palabra.

NO usar snapshots del texto completo del LLM como criterio principal.

Debe comprobar semántica observable.

Por ejemplo:

* intent correcto;
* dominio correcto;
* cliente explícito detectado;
* resolución canónica;
* métricas pedidas;
* periodo solicitado;
* continuidad correcta;
* herramienta/ruta correcta;
* ausencia/presencia correcta de clarification;
* evidencia requerida;
* fail-closed cuando corresponda.

La redacción final puede variar sin convertir el caso en FAIL.

## 4. Inventario obligatorio antes de crear nada

Antes de implementar:

localizar físicamente en el repositorio:

* suites existentes de Director IA;
* tests de planner;
* tests de client/profile;
* tests de compound client query;
* tests de conversation state;
* tests de continuity;
* tests de persistent memory;
* tests de metric switching;
* tests de historical margin;
* tests de tools/orchestrator;
* tests relacionados con ARR/IGF/clientes;
* helpers/fixtures reutilizables;
* scripts existentes para ejecutar las suites.

No asumir nombres de archivo por este CURRENT_TASK.

Registrar cuáles existen realmente.

Reutilizar infraestructura existente antes de crear otra.

NO introducir Jest/Vitest/Mocha u otro framework nuevo si el repo ya usa `node:test` u otra infraestructura funcional.

## 5. Golden cases iniciales obligatorios

Incorporar como casos reales, conservando literalmente las preguntas humanas cuando aquí están disponibles.

### G-CLIENT-001 — cliente explícito + consulta compuesta en primer turno

Chat NUEVO.

Pregunta exacta:

`Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.`

Expected semantic behavior:

* detectar `TORTILLERIA ERICK` como cliente explícito;
* intentar/resolver identidad canónica por la ruta existente;
* NO depender de continuidad previa;
* NO pedir `cliente_key` si la resolución canónica existente puede resolverlo;
* identificar ambas métricas:

  * kg comprados;
  * descuento;
* identificar granularidad mensual;
* identificar rango enero → fecha;
* alcanzar la ruta de datos correspondiente si la identidad se resuelve.

No hardcodear importes/kg reales salvo que una fixture existente y controlada los proporcione.

### G-CLIENT-002 — perfil simple en primer turno

Chat NUEVO.

Pregunta exacta:

`¿Qué sabemos de TORTILLERIA ERICK?`

Expected:

* cliente explícito detectado;
* resolución canónica;
* intent/ruta de perfil de cliente correspondiente;
* sin exigir identidad heredada de turno anterior.

### G-CLIENT-003 — continuidad después de resolver cliente

Turno 1:

`¿Qué sabemos de TORTILLERIA ERICK?`

Turno 2:

`Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.`

Expected:

* continuidad conserva/resuelve identidad;
* segundo turno no pierde el cliente;
* periodo y métricas correctos.

Este caso debe poder contrastarse con G-CLIENT-001.

La infraestructura debe permitir detectar explícitamente:

`funciona con continuidad pero falla first-turn`

si eso sigue ocurriendo.

## 6. Clientes nuevos

### G-NEW-CLIENTS-001

Pregunta exacta:

`¿Qué clientes nuevos entraron en el mes de agosto? ¿Cuánto compraron y con qué descuento?`

Expected semantic behavior:

* consulta AGREGADA de clientes;
* NO exigir un `cliente_key` específico;
* detectar periodo agosto;
* identificar clientes nuevos;
* solicitar/obtener compra;
* solicitar/obtener descuento;
* no inventar clientes.

Si Director IA todavía no posee físicamente la capacidad completa, el caso debe registrar FAIL y su FIRST_BAD_BOUNDARY.

NO cambiar runtime para hacerlo pasar en esta tarea.

## 7. Movimiento de clientes

Crear casos independientes para las tres capacidades:

### G-MOVEMENT-UP-001

Pregunta ejecutiva equivalente a:

`¿Qué clientes aumentaron sus compras en el periodo comparado?`

Expected:

* consulta agregada;
* categoría AUMENTARON;
* no exigir cliente individual.

### G-MOVEMENT-DOWN-001

`¿Qué clientes disminuyeron sus compras en el periodo comparado?`

Expected:

* categoría DISMINUYERON;
* no exigir cliente individual.

### G-MOVEMENT-STOPPED-001

`¿Qué clientes dejaron de comprar en el periodo comparado?`

Expected:

* categoría DEJARON DE COMPRAR;
* no exigir cliente individual.

Antes de congelar el wording de estos tres casos:

buscar en reportes/tests existentes si ya están registradas preguntas humanas exactas.

Si existen, usar las preguntas humanas existentes en lugar de inventar nuevas.

No inventar datos de clientes.

## 8. Continuidad y cambio de métrica

Localizar en reportes/tests existentes las regresiones ya documentadas relacionadas con:

* historical margin;
* cambio de margen → descuento;
* cambio de margen → venta;
* client profile;
* continuity;
* metric switch.

Si existen identificadores como:

* R-EXEC
* R-VENTA
* R-HM-PROFILE
* R-METRIC-SWITCH

reutilizar su definición física y sus prompts exactos.

No inventar su contenido si no existen físicamente.

El Golden Set debe demostrar al menos la regla:

Un contexto previo de `historical_margin` NO puede obligar a una pregunta posterior explícita de otra métrica a continuar usando margen.

Ejemplo de segundo turno relevante:

`¿descuento de agosto?`

Si el usuario pide explícitamente descuento:

Expected:

`metric = descuento`

NO:

`metric = historical_margin`

Usar el primer turno exacto de los tests/reportes existentes si está disponible.

## 9. Estructura de cada Golden Case

Crear una representación mantenible de casos.

Puede ser JS/JSON/fixture según las convenciones existentes.

Cada caso debe poder expresar, cuando aplique:

* `id`
* `category`
* `turns`
* `question`
* `expected_intent`
* `expected_domains`
* `expected_entity`
* `expected_metrics`
* `expected_period`
* `expected_granularity`
* `clarification_allowed`
* `expected_tool_or_route`
* `expected_evidence_behavior`
* `notes`

No es obligatorio usar exactamente esos nombres si existe una convención mejor en el repo.

Priorizar claridad y extensibilidad.

## 10. Diagnóstico FIRST_BAD_BOUNDARY

El runner debe intentar evaluar, cuando sean observables sin modificar runtime:

1. INPUT
2. CONTEXT / conversation state
3. PLANNER
4. ENTITY EXTRACTION
5. CANONICAL RESOLUTION
6. METRIC RESOLUTION
7. PERIOD RESOLUTION
8. TOOL / ORCHESTRATOR ROUTE
9. EVIDENCE
10. USER-VISIBLE OUTCOME

Para cada caso:

* PASS;
* FAIL;
* NOT_REACHED;
* NOT_OBSERVABLE;

según corresponda.

`NOT_OBSERVABLE` es válido si la arquitectura actual no expone esa frontera.

NO modificar producción solamente para hacer una frontera observable.

No falsificar precisión.

## 11. Tres niveles de prueba

Diseñar el harness para distinguir:

### TIER 1 — CONTRACT / DETERMINISTIC

* sin LIVE_DB;
* fixtures/mocks/helpers existentes;
* reproducible;
* apto para ejecución frecuente;
* este tier SÍ se ejecuta en esta tarea.

### TIER 2 — LIVE_DB_READ_ONLY

Reservar soporte conceptual/manifest para casos que necesiten datos reales.

Pero esta tarea:

`LIVE_DB_AUTHORIZED: NO`

NO consultar producción.

NO ejecutar SQL live.

NO fabricar acceso.

### TIER 3 — AUTHENTICATED E2E

Dashboard/chat real autenticado.

Esta tarea:

`AUTHENTICATED_E2E_AUTHORIZED: NO`

No fabricar token.

No iniciar sesión como usuario.

No usar credenciales.

Si no puede ejecutarse:

`NOT_PROVEN`

No es FAIL del harness.

## 12. Dos modos de ejecución

El sistema debe permitir conceptualmente:

### REPORT MODE

Ejecuta todos los Golden Cases y produce el baseline real.

Los fallos actuales de Director IA se reportan como FAIL, pero no se disfrazan.

Este modo sirve mientras estamos cerrando regresiones conocidas.

### GATE MODE

Debe existir una ruta para que, cuando los casos estén cerrados, cualquier regresión vuelva a producir exit code no-cero.

No conectar obligatoriamente GATE MODE al pipeline global en esta tarea si existen regresiones conocidas.

No dejar el repositorio con una suite global permanentemente roja por defectos ya conocidos.

El reporte debe distinguir:

`HARNESS FAILURE`

de:

`PRODUCT GOLDEN FAILURE`

## 13. Comando único

Después de implementar debe existir UN comando claro para que Cursor pueda ejecutar el Golden Regression Set.

Preferir una convención existente del repositorio.

Ejemplo conceptual, NO obligatorio:

`npm run test:director-ia:golden`

o:

`node --test ...`

El nombre final debe basarse en las convenciones físicas del repo.

Debe poder ejecutarse sin intervención humana turno por turno.

## 14. Baseline antes de modificar

Antes de crear el harness:

ejecutar las suites existentes relevantes de Director IA.

Registrar:

* comandos;
* pass;
* fail;
* total;
* errores preexistentes.

No corregirlos en esta tarea.

Esto será BASELINE BEFORE.

## 15. Baseline Golden después

Después de implementar:

ejecutar el Golden Set completo en REPORT MODE.

Entregar una matriz:

| ID           | Pregunta/Escenario | Resultado | FIRST_BAD_BOUNDARY |
| ------------ | ------------------ | --------- | ------------------ |
| G-CLIENT-001 | ...                | PASS/FAIL | ...                |
| ...          | ...                | ...       | ...                |

IMPORTANTE:

Esta tarea puede terminar correctamente en `DONE_PENDING_REVIEW` aunque algunos Golden Cases sean `FAIL`.

Eso NO significa que la tarea falló.

Significa:

`harness funciona y reprodujo defectos actuales`.

No alterar expectativas para convertir artificialmente FAIL en PASS.

## 16. No implementar fixes

Está expresamente prohibido modificar comportamiento de:

* planner;
* canonical client resolution;
* client profile;
* conversation state;
* persistent memory;
* historical margin;
* metric switching;
* ARR/IGF;
* tool orchestrator;
* evidence builder;
* server runtime;
* prompts de producción.

Si un Golden Case demuestra un bug:

registrar el FIRST_BAD_BOUNDARY.

NO arreglarlo.

Ese FAIL se convertirá después en un FIX independiente.

## 17. Protección de Director IA

Esta tarea puede:

* añadir tests;
* añadir fixtures;
* añadir test helpers;
* añadir script de test si es necesario;
* añadir reporte del dev-loop.

No debe cambiar código productivo para hacer pasar las pruebas.

Si físicamente no puede construirse el harness sin refactor productivo:

STOP.

Documentar la frontera exacta y la mínima necesidad.

No ampliar alcance.

## 18. Working tree / tarea BLOCKED anterior

Al inicio probablemente existen artefactos locales de:

`DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001`

incluyendo:

* `docs/dev-loop/CURRENT_TASK.md`
* su reporte BLOCKED.

No borrarlos.

No mezclarlos accidentalmente con el código/test de Director IA.

Preservarlos siguiendo `AGENTS.md` y `LOOP_PROTOCOL`.

Después crear la rama:

`implementation/director-ia-golden-regression-gate-001`

desde `origin/main` vigente.

Si el protocolo permite stash seguro de esos artefactos, puede utilizarse.

Si exige otra preservación, seguir el protocolo.

No pedir al humano comandos uno por uno.

Si no existe forma protocolaria de preservar el estado y llegar a una rama limpia:

STOP con UNA instrucción humana concreta.

## 19. Git

Rama requerida:

`implementation/director-ia-golden-regression-gate-001`

Antes de escribir tests:

* branch ≠ main;
* base sincronizada con `origin/main`;
* G1 presente;
* implementation_authorized = YES.

Commit de implementación al finalizar.

NO merge.

NO push a `main`.

El push de la rama está permitido solo si el protocolo actual lo permite dentro de G3; si no, dejarla local.

## 20. Validación obligatoria

Ejecutar:

1. suites Director IA existentes relevantes;
2. tests propios del harness;
3. Golden Set REPORT MODE;
4. comprobar que el runner identifica correctamente al menos un FIRST_BAD_BOUNDARY cuando exista un caso FAIL;
5. comprobar que un FAIL de producto no se etiqueta como error del harness.

No reducir/eliminar tests existentes para obtener verde.

## 21. Evidencia final

Entregar:

### A. Inventario

Suites/helpers existentes encontrados.

### B. Diseño

Cómo quedó representado un Golden Case.

### C. Casos sembrados

Lista de IDs y preguntas exactas.

### D. Baseline BEFORE

Resultado de tests existentes.

### E. Golden baseline

PASS / FAIL por caso.

### F. FIRST_BAD_BOUNDARY

Para cada FAIL, primera frontera demostrada.

### G. Ejecución

Comando único para repetir todo.

### H. Archivos

Archivos creados/modificados y propósito.

### I. Git

* base SHA;
* branch;
* commit SHA;
* `git status --short`.

### J. Scope

Confirmar:

* no runtime behavior changes;
* no planner changes;
* no tool changes;
* no DB;
* no LIVE_DB;
* no frontend;
* no Director IA production behavior changed;
* no merge;
* no deploy.

## 22. Completion

Si el harness funciona y el baseline queda reproducible:

`status: DONE_PENDING_REVIEW`

aunque existan PRODUCT GOLDEN FAILURES.

NO corregir esos failures en esta misma tarea.

NO abrir automáticamente un fix.

NO merge.

NO deploy.

STOP y esperar revisión humana.
