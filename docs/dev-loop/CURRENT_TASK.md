task_id: FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T16:54:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - IMPLEMENTATION ONLY; NO MERGE; NO DEPLOY; NO LIVE_DB"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md

objective: Hacer que la pregunta «¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?» deje de caer en unknown y produzca un snapshot ejecutivo grounded con capacidades existentes, sin inventar bridge, Delta Gastos, atribución monetaria ni controlabilidad.

in_scope:
  - planner / routing mínimo para la pregunta exacta (preferir reutilizar financial_diagnosis si el contrato físico lo permite)
  - orquestación de snapshot (operativa, final, Delta Ingreso existente, comentarios existentes)
  - contrato determinístico de respuesta / fail-closed
  - R-RENT-SNAPSHOT-001..010 (solo tras G1; ANTES de producto)
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md

out_of_scope:
  - Delta Gastos
  - bridge financiero
  - Shapley
  - OAT
  - attribution monetaria
  - controlability contract
  - commitment fulfillment
  - last purchase
  - Action Register enrichment
  - alerts
  - notifications
  - DB/schema
  - migrations
  - frontend
  - LIVE_DB
  - merge
  - deploy
  - next task
  - docs/director-ia/

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001.md (CLOSED; no reabre fronteras)

allowed_actions:
  - (solo tras G1 humano) regression-first: crear R-RENT-SNAPSHOT-001..010 ANTES de producto
  - (solo tras G1 y BEFORE rojo) routing + snapshot orchestration + response contract fail-closed
  - ejecutar TIER1 / RUNTIME / MOVEMENT / DELTA-* / PRE-DEPLOY --gate
  - redactar el reporte en result_report_path
  - dejar DONE_PENDING_REVIEW, STOPPED o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar o escribir tests mientras status sea DRAFT
  - inventar Delta Gastos, bridge, atribución $ o controlabilidad
  - consultar Action Register a ciegas
  - consultar LIVE_DB
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

No implementar.
No escribir tests todavía.
No LIVE_DB.

## North Star

Habilitar de forma segura la pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

sin fingir capacidades que todavía no existen.

## Auditoría CLOSED de origen

AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001

Hallazgos contractuales:

ROUTING_FIRST_BAD_BOUNDARY:
PLANNER

DATA_FIRST_BAD_BOUNDARY:
DELTA_EXPENSE_SOURCE

ATTRIBUTION_FIRST_BAD_BOUNDARY:
DRIVER_ATTRIBUTION_METHOD

ACTIONABILITY_FIRST_BAD_BOUNDARY:
CONTROLABILITY_CONTRACT

Rentabilidad operativa:
util_oper_importe

Rentabilidad final:
resultado_final_importe

En ARR, “rentabilidad” refiere al resultado final.

NO existe bridge reconciliado de rentabilidad.

NO existe Delta Gastos reconciliado.

NO existe attribution method de kg/desc/margen/HG.

NO existe contrato de controlabilidad.

Por tanto este FIX NO debe inventar ninguno.

## Objetivo único

Hacer que la pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

sea reconocida y produzca un snapshot ejecutivo grounded con las capacidades existentes.

Debe responder únicamente con evidencia disponible y marcar explícitamente las fronteras aún desconocidas.

## Comportamiento futuro mínimo

La respuesta debe poder mostrar, cuando los datos estén disponibles:

1. Rentabilidad operativa A y B.
2. Delta rentabilidad operativa.
3. Rentabilidad final A y B.
4. Delta rentabilidad final.
5. Principales clientes con Delta Ingreso negativo.
6. Delta Ingreso de esos clientes.
7. Comentarios registrados.
8. Señalar qué hechos comerciales se observan:
   - kg bajó/subió;
   - descuento/kg cambió;
   cuando ya estén disponibles en la misma fuente.

Y debe decir explícitamente:

- no existe todavía un bridge reconciliado de rentabilidad;
- no puede atribuir $ exactos a volumen/descuento/margen/HG;
- no puede afirmar qué parte de la caída viene de gastos;
- no puede clasificar formalmente una variable como accionable si no existe contrato;
- comentarios son contexto registrado, no causa demostrada.

## Pregunta exacta

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Debe dejar de resolver:

unknown / clarification

cuando planta y periodo puedan resolverse de manera segura.

## Routing

Auditoría:

detectDirectorIaIntent no tiene regla.

isCauseQuestion exige “por que”.

CAUSE_EXPLANATION está fuera del slice actual.

El FIX debe encontrar la mínima ruta semántica segura.

Preferir reutilizar:

financial_diagnosis

si su contrato físico permite representar este snapshot sin mezclar semánticas.

No crear intent nuevo salvo que sea indispensable y quede demostrado.

## Rentabilidad

Usar fuentes existentes y autoritativas.

No crear fórmula nueva.

Distinguir siempre:

rentabilidad operativa
vs
rentabilidad final.

Si el usuario dice solamente:

rentabilidad

usar la semántica ARR demostrada:
resultado_final_importe

pero puede mostrar operativa como contexto separado.

No sustituir una por otra.

## Periodo

Para:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

usar la semántica temporal ya soportada si puede resolverse con seguridad.

Preferencia contractual a demostrar en regression:

mes actual forecast
vs
mes anterior real

cuando el mes actual está abierto y existe forecast válido.

No usar MAX(fecha) silenciosamente si cambia el periodo solicitado.

Si no puede resolverse:
clarification grounded.

## Delta Ingreso

Reutilizar la ruta ejecutiva aceptada:

computeDeltaIngresoClientesPorMes

con:

computeClientesDescuentoMes
ingresoClienteMarginal
effective PROY target

No crear otro cálculo.

## Top clientes

Usar Delta Ingreso negativo:

delta < 0
sort más negativo → menos negativo

Mostrar un Top N pequeño y ejecutivo.

Default propuesto:
Top 5

si la pregunta no especifica N.

No hardcodear clientes.

## Hechos observables

Para cada cliente, solo si físicamente ya están disponibles en el resultado:

kg A
kg B
delta kg
desc/kg A
desc/kg B
delta desc

Puede decir:

“el volumen bajó”

o

“el descuento/kg aumentó”

como HECHO.

NO convertir ese cambio en una atribución monetaria.

NO decir:

“$X se debe al volumen”

en este slice.

## Margen

Margen es plant-level.

Puede mostrarse si es relevante al snapshot general.

NO decir:

“margen del cliente”.

NO atribuirle $ del cliente en este slice.

## HG

Puede participar en la fórmula existente.

NO descomponer su contribución.

NO clasificarlo como accionable.

## Gastos

FAIL CLOSED.

No existe Delta Gastos reconciliado.

Este FIX NO debe consultar módulos de gastos y presentar una lista como si explicara la rentabilidad.

Puede decir de manera concisa:

“No tengo todavía un Delta Gastos reconciliado con esta rentabilidad, así que no atribuyo parte del deterioro a gastos.”

No navegar presupuesto/cheques/expense_analysis a ciegas.

## Actionability

FAIL CLOSED.

No existe CONTROLABILITY_CONTRACT.

La pregunta dice:

“sobre qué puedo actuar”.

La respuesta puede distinguir únicamente hechos que requieren revisión comercial, sin presentar una taxonomía contractual falsa.

Ejemplo permitido:

“Estos son los clientes y variables comerciales que conviene revisar primero.”

Ejemplo NO permitido:

“$X es directamente controlable.”

No usar labels DIRECTAMENTE_ACCIONABLE/etc. todavía.

## Comentarios

Usar el enrichment seguro ya existente.

Formato conceptual:

Comentario registrado:
"..."

No:

Causa:
"..."

## Action Register

NO consultarlo a ciegas.

No Action Register en este slice salvo relación física canónica ya demostrada y necesaria.

## No bridge

No afirmar:

Delta rentabilidad
=
Delta Ingreso
-
Delta Gastos

La auditoría demostró que no existe reconciliación.

La respuesta debe mantener separados:

A. Resultado de rentabilidad.
B. Presión observada en clientes / Delta Ingreso.
C. Limitaciones de atribución.

## Regression-first

Crear:

R-RENT-SNAPSHOT-001..010

antes de producto.

### 001 — exact routing

Pregunta exacta:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Expected:
no unknown.

Debe llegar a la ruta ejecutiva elegida.

### 002 — standalone period

Pregunta standalone resuelve periodo seguro cuando existe forecast actual.

### 003 — profitability distinction

Operativa y final no se mezclan.

### 004 — generic “rentabilidad”

Usa resultado_final_importe como KPI principal según semántica ARR.

### 005 — Delta Income Top clients

Usa computeDeltaIngresoClientesPorMes source-of-truth.

### 006 — fact vs attribution

Puede mostrar:
kg bajó.

No puede decir:
“$X fue causado por kg”.

### 007 — comments are context

Comentario registrado se muestra como contexto, no causa.

### 008 — expense fail-closed

No inventa Delta Gastos.

### 009 — actionability fail-closed

No inventa clasificación de controlabilidad.

### 010 — no fake bridge

No afirma que Delta Ingreso ± gastos reconcilia con Delta rentabilidad.

## BEFORE

Antes de producto:

TIER 1 PASS
R-RUNTIME PASS
R-MOVEMENT PASS
R-DELTA-INCOME PASS
R-DELTA-PARITY PASS
R-DELTA-CUT PASS

R-RENT-SNAPSHOT nuevos:
deben reproducir el defecto.

Como mínimo:

001 FAIL
002 según routing actual
005 no alcanzable por exact question
008/009/010 deben proteger fail-closed

PRE-DEPLOY FAIL.

Si 001 queda verde con producto actual:
STOP y revisar fixture.

## Product change

Cambiar únicamente:

- routing;
- snapshot orchestration;
- deterministic response contract necesario.

No crear:

- Delta Gastos;
- driver attribution;
- bridge;
- actionability policy;
- alerts;
- actions automation.

## Response semantics

La respuesta futura debe tender a:

Rentabilidad de Acapulco:
- Final ...
- Operativa ...

Presión comercial observada:
1. Cliente...
   Delta Ingreso...
   Volumen...
   Descuento...
   Comentario registrado...

Qué revisar:
- priorizar clientes con mayor presión;
- revisar cambios observables de volumen/descuento.

Límites:
- Delta Gastos no reconciliado;
- no atribuyo pesos por driver;
- no presento comentarios como causa.

No hardcodear texto exacto si existe formatter mejor.

## Protecciones

No romper:

- Delta Ingreso
- Clientes por mes
- IGF
- profitability existing paths
- financial_diagnosis
- commercial_trend
- movement
- M9
- client_profile
- comments
- DICF
- historical_margin
- Action Register

## Out of scope

- Delta Gastos
- bridge financiero
- Shapley
- OAT
- attribution monetaria
- controlability contract
- commitment fulfillment
- last purchase
- Action Register enrichment
- alerts
- notifications
- DB/schema
- migrations
- frontend
- LIVE_DB
- merge
- deploy
- next task

## LIVE_DB

NO.

Validación LIVE será post-deploy.

## AFTER

TIER 1 PASS
R-RUNTIME PASS
R-MOVEMENT PASS
R-DELTA-INCOME PASS
R-DELTA-PARITY PASS
R-DELTA-CUT PASS
R-RENT-SNAPSHOT-001..010 PASS

HTTP 5xx = 0
HARNESS FAILURE = 0

PRE-DEPLOY PASS

Ejecutar suites relacionadas con:

planner
financial_diagnosis
IGF
profitability
period
Delta Ingreso
comments
continuity
fail-closed

## Completion

DRAFT.

Esperar G1 humano.

No implementar.
No escribir tests todavía.
No LIVE_DB.
No merge.
No deploy.

STOP.
