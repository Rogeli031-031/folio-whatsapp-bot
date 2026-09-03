task_id: FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"

authorized_at: "2026-09-02T20:45:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-02"

objective: Corregir los cuatro PRODUCT RUNTIME FAIL actuales R-RUNTIME-001..004 detectados por el PRE-DEPLOY Runtime Gate, aplicando el cambio mínimo en las fronteras causales reales de routing/metric-pack sin debilitar tests ni alterar otras capacidades de Director IA.

in_scope:
- código productivo de Director IA estrictamente necesario para corregir R-RUNTIME-001..004
- planner/routing/conversation-state/metric-pack únicamente cuando sean causalmente demostrados
- tests existentes relacionados
- Golden Regression TIER 1
- PRE-DEPLOY Runtime Gate
- fixtures/helpers de tests solo para ampliar observabilidad, nunca para acomodar el producto
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001.md

out_of_scope:
- DB/schema/migrations
- LIVE_DB
- frontend
- Action Register behavior
- Folios
- arquitectura congelada
- nuevos contratos
- cambios generales de prompts no causales
- reparación del HTTP 500 observado en producción cuya paridad aún no está demostrada
- cambios para casos fuera de R-RUNTIME-001..004
- merge a main
- deploy
- siguiente tarea

contracts_in_force:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- contratos vigentes aplicables de Director IA

allowed_actions:
- crear rama fix/director-ia-runtime-metric-pack-routing-001 desde main limpio y sincronizado
- inspección física y tracing de R-RUNTIME-001..004
- ejecutar TIER 1 y PRE-DEPLOY Runtime Gate
- modificar la mínima frontera productiva causal
- añadir tests determinísticos necesarios
- commit en la rama de tarea
- reporte final
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- cambiar Golden/Runtime expectations para obtener PASS artificial
- hardcodear respuestas para TORTILLERIA ERICK
- hardcodear agosto
- hacer que mocks seleccionen artificialmente la ruta esperada
- convertir failures de producto en NOT_OBSERVABLE para obtener verde
- ocultar errores mediante respuesta final
- modificar DB/schema
- consultar LIVE_DB
- resolver el HTTP 500 de producción sin demostrar primero su causa
- merge/push a main
- deploy
- abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## BASE

Crear desde:

origin/main = efe055af9e20287bc2dd3a9530c87f2bb73d88b1

La rama requerida es:

fix/director-ia-runtime-metric-pack-routing-001

## Baseline obligatorio BEFORE

Ejecutar:

npm run test:director-ia:golden

y:

npm run test:director-ia:predeploy -- --gate

Debe reproducirse conceptualmente:

TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001 FAIL
R-RUNTIME-002 FAIL
R-RUNTIME-003 FAIL
R-RUNTIME-004 FAIL

PRE-DEPLOY GATE = FAIL

Si el baseline ya no coincide materialmente, STOP y reportar antes de modificar producto.

## Casos a corregir

### R-RUNTIME-001

Pregunta exacta:

Dame el margen histórico de TORTILLERIA ERICK de enero a agosto.

Actual:

el runtime alcanza un metric-pack de historical margin de planta y devuelve compare_months de planta, ignorando la entidad explícita TORTILLERIA ERICK.

Expected:

la entidad explícita de cliente debe participar en la selección de la ruta/pack correspondiente.

No hardcodear ERICK.

No convertir silenciosamente una pregunta de cliente en una comparación de planta.

### R-RUNTIME-002

Secuencia:

Turno 1:
Dame el margen histórico de TORTILLERIA ERICK de enero a agosto.

Turno 2:
¿descuento de agosto?

Actual:

el segundo turno no alcanza un pack correcto de descuento y termina en un fallthrough/contexto genérico, observado incluso como HTTP 403 en el harness.

Expected:

- conservar identidad/contexto compatible;
- reconocer cambio explícito a descuento;
- seleccionar ruta/pack correspondiente a descuento;
- no reutilizar historical_margin;
- no caer en Action Register/contexto genérico.

### R-RUNTIME-003

Secuencia:

Turno 1:
como vamos?

Turno 2:
descuento de agosto?

Actual:

el segundo turno permanece funcionalmente dentro de plant_diagnosis/CEL y produce materialidad/kg/DICF en vez de descuento.

Expected:

la métrica explícita del nuevo turno debe provocar una nueva selección de ruta/metric-pack compatible con descuento.

No reutilizar plant_diagnosis cuando el usuario cambió explícitamente de métrica.

### R-RUNTIME-004

Chat nuevo.

Pregunta:

¿descuento de agosto?

Actual:

unknown → conversation_clarification genérica:

“No se pudo determinar una intención clara…”

Expected:

el sistema debe reconocer que la pregunta pertenece al dominio/métrica descuento.

Si para responder necesita una entidad o alcance adicional, debe llegar a una aclaración específica del dominio de descuento.

NO se exige inventar cliente, planta, valor ni fuente.

NO se exige responder un descuento numérico si falta información necesaria.

Sí se exige evitar la aclaración genérica de “intención desconocida”.

## Hipótesis de entrada

El PRE-DEPLOY Runtime Gate reportó para los cuatro casos:

FIRST_BAD_BOUNDARY = METRIC_PACK

Esto es evidencia inicial, NO una orden para parchear una función por nombre.

Cursor debe verificar físicamente para cada caso:

INPUT
→ conversation state
→ planner
→ entity/metric/period resolution
→ route selection
→ metric-pack
→ tool/loaders
→ response

y localizar la primera decisión causal incorrecta.

## Regla principal

No arreglar la redacción final si la selección de ruta es incorrecta.

La corrección debe realizarse en la primera frontera causal demostrada.

Preferir reglas generales:

explicit current-turn signal
+
compatible inherited context
→ correct semantic route

sobre excepciones por frase, cliente o mes.

## Multiplicidad de causas

R-RUNTIME-001..004 están autorizados dentro de esta misma tarea porque pertenecen al mismo bloque observado de routing/metric-pack.

Si Cursor demuestra que existen varias causas independientes PERO todas permanecen dentro de planner/routing/conversation-state/metric-pack y dentro de estos cuatro casos, puede corregirlas en esta tarea con cambios mínimos y tests separados.

Si alguno requiere:
- nueva arquitectura;
- DB;
- contrato;
- herramienta nueva;
- fuente nueva;
- cambio fuera del dominio autorizado;

NO expandir alcance.

Dejar ese caso FAIL, documentar FIRST_BAD_BOUNDARY y continuar únicamente con los casos que sí estén dentro del alcance.

## HTTP 500

El HTTP 500 observado manualmente en producción con:

Dame el margen histórico de TORTILLERIA ERICK de enero a agosto.

NO se considera explicado todavía.

El harness demostró:
- con IGF FINAL disponible → HTTP 200;
- sin FINAL → puede producir 500 natural.

Pero no hay paridad demostrada con producción.

Por tanto:

NO arreglar el 500 de producción dentro de esta tarea salvo que resulte ser una consecuencia directa e inequívoca del mismo cambio autorizado y quede demostrada por el Runtime Gate.

En otro caso, dejarlo explícitamente como NOT_PROVEN / pendiente separado.

## Protección contra regresión

Durante la corrección:

TIER 1 debe permanecer:

8/8 PASS

No debilitar ninguno de los ocho casos existentes.

Ejecutar suites relacionadas de planner, conversation-state, routing, historical-margin, client-profile y tool/orchestrator según archivos físicamente afectados.

## Objetivo AFTER

El objetivo ideal es:

PRE-DEPLOY DIRECTOR IA

TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001 PASS
R-RUNTIME-002 PASS
R-RUNTIME-003 PASS
R-RUNTIME-004 PASS

HARNESS FAILURE = 0

PRE-DEPLOY GATE = PASS

Si solo una parte puede corregirse sin salir del alcance, NO falsear verde.

Reportar claramente:

PASS: N
FAIL: N

y las causas pendientes.

## Validación semántica

PASS no significa únicamente HTTP 200.

Cada caso Runtime debe comprobar que:

- se eligió la familia semántica correcta;
- no se reutilizó un pack incompatible;
- no se devolvió un bloque de materialidad/kg cuando se pidió descuento;
- no se ignoró una entidad explícita;
- no se produjo aclaración genérica cuando la métrica sí era reconocible.

No comparar prosa literal salvo fragmentos estructurales necesarios para detectar respuestas equivocadas.

## Evidencia final

Entregar:

1. causa raíz de cada R-RUNTIME-001..004;
2. si compartían o no causa;
3. FIRST_BAD_BOUNDARY definitivo de cada uno;
4. funciones modificadas;
5. diff conceptual;
6. PRE-DEPLOY BEFORE;
7. PRE-DEPLOY AFTER;
8. TIER 1 AFTER;
9. suites relacionadas;
10. archivos modificados;
11. commit SHA;
12. git status --short;
13. estado del HTTP 500: PROVEN / NOT_PROVEN;
14. confirmación de que no se cambiaron expectations para obtener verde.

## Completion

Si la implementación permitida termina:

status: DONE_PENDING_REVIEW

NO merge.
NO deploy.
NO next task.

STOP.