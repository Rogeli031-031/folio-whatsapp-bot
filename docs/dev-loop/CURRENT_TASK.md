# CURRENT_TASK

task_id: IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"

authorized_at: "2026-09-01T16:17:32-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01"

task_type: IMPLEMENTATION

branch: implementation/director-ia-new-clients-purchase-discount-001

base_main_sha: 91fe8b8b4bea40bb51d5da7299946f6c397620c0

audit_contract:
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

objective: >
  Hacer que Director IA responda de forma determinista, trazable y fail-closed
  preguntas ejecutivas sobre clientes nuevos de un mes calendario cerrado,
  entregando la lista completa, compra real por cliente y descuento real por kg,
  sin confundir margen con descuento ni forecast DICF con resultado histórico real.

## Product question

Caso principal:

¿Qué clientes nuevos entraron en agosto?
¿Cuánto compraron y con qué descuento?

Planta:
- usar planta explícita cuando exista;
- en ausencia de planta explícita, usar la planta actual autorizada;
- nunca cruzar plantas ni saltar autorización.

Periodo:
- agosto 2026 es un mes cerrado;
- para un mes cerrado, usar semántica histórica REAL;
- no responder con forecast a cierre;
- no hardcodear agosto ni 2026 en runtime.

## Contractual decision: closed month

Para un mes calendario cerrado:

PURCHASE = compra real del mes solicitado.

DISCOUNT = descuento real por kg del mes solicitado.

No usar como respuesta:
- kg forecast;
- margen IGF por kg;
- delta ingreso como sustituto de compra;
- forecast observado en una captura anterior.

La observación:
66 clientes / aproximadamente 15.4-15.5 t / 108482 MXN
corresponde al DICF forecast observado con corte 2026-08-30.

NO obligar a que el resultado histórico final sea 66.

No hardcodear esos valores.

## Definition of New for this slice

Conservar la semántica comercial defendible de DICF, pero aplicada a periodos
históricos reales cerrados.

La implementación debe probar físicamente la fórmula actual de DICF antes de
codificarla.

Para periodo A = mes calendario anterior y periodo B = mes solicitado:

- ingreso A debe derivarse de datos reales de A;
- ingreso B debe derivarse de datos reales de B;
- sin forecast si B está cerrado;
- Nuevo cuando la misma condición comercial de DICF resulte verdadera usando
  los valores reales cerrados.

No cambiar la definición de DICF en lib/dicf.js.

Si reproducir exactamente la definición requiere margen histórico, reutilizar la
fuente existente de margen por periodo.

No sustituir la definición silenciosamente por "kgA = 0 y kgB > 0" salvo que
la inspección demuestre que es semánticamente equivalente para el contrato
existente.

## Required response

Para cada cliente nuevo:

- nombre canónico;
- canal/subcanal cuando esté disponible;
- compra real del mes:
  - kg;
  - toneladas;
- descuento real por kg;
- monto de descuento real si está defendiblemente disponible.

Además:

- número total de clientes nuevos;
- kg/toneladas reales totales;
- periodo;
- planta.

No sustituir descuento por margen.

No mostrar "COMPARACION MARGEN" como respuesta al descuento.

## Complete list

La respuesta debe poder transportar TODOS los clientes nuevos del periodo.

No usar el límite actual:
COMMERCIAL_STATE_CLIENT_LIMIT = 20

para esta capacidad histórica.

No aumentar globalmente ese límite para otras capacidades.

Preferir un builder determinista/estructurado específico para esta respuesta,
de modo que no dependa de que el LLM enumere 66 clientes correctamente.

Si la cantidad excede la capacidad razonable de una sola respuesta, el runtime
debe preservar el conjunto completo y usar un mecanismo determinista que no
afirme que la lista parcial es completa.

No inventar ni perder clientes por truncation silenciosa.

## Discount truthfulness

Rastrear descuentos desde:
arr.descuentos_diarios_cliente

Para periodo cerrado, calcular únicamente con evidencia real.

Verificar el contrato físico antes de decidir cómo interpretar ausencia de fila.

No afirmar:
descuento = 0

si ausencia de evidencia no demuestra realmente cero.

Cuando el contrato no permita distinguir:
- cero real;
- dato faltante;

usar DATA_NOT_FOUND/null/explicación equivalente fail-closed.

No transformar missing en zero silenciosamente.

## Routing acceptance

Estas sondas deben converger a ESTA capacidad histórica cuando el periodo sea
un mes cerrado:

P1:
¿Qué clientes nuevos entraron en agosto?

P2:
¿Qué clientes nuevos entraron en agosto? ¿Cuánto compraron y con qué descuento?

P3:
¿Qué clientes nuevos entraron en agosto en Acapulco? ¿Cuánto compraron y con qué descuento?

P4:
¿Cuántos clientes nuevos hubo en agosto en Acapulco?

P5:
Dime los clientes nuevos de agosto en Acapulco.

P6:
Dime los nuevos de agosto en Acapulco, sus toneladas y descuento por kg.

P6 no debe exigir necesariamente la palabra literal "clientes" si la construcción
"los nuevos" + periodo + métricas es inequívoca en este contexto.

No enviar:
P1/P4/P5 a commercial_trend trailing 30d.

No enviar:
P2/P6 a IGF por la palabra descuento.

No enviar:
P3 a client_profile por detectar Acapulco como entidad cliente.

## Period semantics

"agosto" debe significar mes calendario agosto, no trailing 30 days.

Resolver año de forma determinista con las utilidades temporales existentes.

Para la fecha actual 2026-09-01:
agosto sin año → agosto 2026.

No hardcodear esa fecha.

No reescribir globalmente todos los parsers temporales.

## Open/current month protection

Esta tarea está centrada en MES CERRADO.

Si la misma formulación apunta al mes actualmente abierto:

NO presentar forecast como compra real cerrada.

Puede:
- usar una aclaración semántica;
- o delegar al DICF forecast existente con etiqueta explícita;

solo si puede hacerse sin ampliar el slice.

No mezclar silenciosamente real-to-date con forecast.

## Architecture direction

Preferir una capacidad dedicada y testeable para:
historical_new_clients

o equivalente compatible con la arquitectura existente.

No es obligatorio ese nombre.

Evitar parches ad-hoc únicamente dentro del prompt LLM.

Preferir:

semantic detection
→ period/plant resolution
→ deterministic read-only loader
→ deterministic evidence pack
→ deterministic response builder

El LLM no debe inventar la lista.

## Potential source reuse

Inspeccionar y reutilizar cuando sea apropiado:

- lib/director-ia-m9-deltas.js
- getDeltaDescuentoClientes
- getMargenKgPorPeriodo
- arr.ventas_diarias_cliente
- arr.descuentos_diarios_cliente
- public.plantas / provincia mapping

No asumir que M9 completo puede reutilizarse tal cual.

Su definición de Nuevo no está autorizada automáticamente.

## in_scope runtime

- lib/director-ia-new-clients.js (nuevo, si es la opción mínima limpia)
- lib/director-ia-chat.js
- lib/director-ia-planner.js
- lib/director-ia-m9-deltas.js
- lib/director-ia-commercial-state.js
- lib/director-ia-tools.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-capabilities.js

Modificar solo los necesarios.

## in_scope tests/docs

- test/director-ia-new-clients-purchase-discount.test.js
- tests Director IA existentes estrictamente necesarios
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

## Protected behavior

No romper:

- DICF dashboard
- commercial_state actual para forecast
- Aumentaron
- Disminuyeron
- Dejaron de comprar
- compound client query CLOSED
- leading-Y CLOSED
- client_profile
- commercial_trend
- IGF financial KPI
- M9 delta descuento
- autorización por planta
- DATA_NOT_FOUND semantics

## Out of scope

- modificar lib/dicf.js salvo STOP y revisión humana si resultara absolutamente necesario
- modificar fórmula del dashboard DICF
- modificar UI
- modificar server.js
- DB/schema/migrations
- writes a DB
- Render
- Exit 137
- PG pool
- deploy
- Movimiento completo de clientes
- implementar Aumentaron
- implementar Disminuyeron
- implementar Dejaron
- plant_switch
- Ahora dime lo mismo
- Golden Set general
- fuzzy
- alias redesign
- meta-protocolo
- docs/director-ia/* salvo que un contrato existente exija una actualización
- cambios oportunistas

## Tests mínimos

Crear:
test/director-ia-new-clients-purchase-discount.test.js

Debe probar:

1. P1-P6 routing.
2. Agosto como mes calendario, no trailing 30d.
3. Planta explícita Acapulco tratada como planta, no cliente.
4. Planta actual cuando no se nombra planta.
5. Autorización de planta preservada.
6. Mes anterior correctamente calculado, incluyendo cambio de año:
   enero → diciembre del año anterior.
7. Clasificación Nuevo con fórmula comercial equivalente al DICF para datos cerrados.
8. Cliente con compra anterior no es Nuevo.
9. Cliente sin ingreso anterior y con ingreso real positivo en B sí es Nuevo.
10. Compra usa kg REAL B, no forecast.
11. Descuento/kg usa datos reales B.
12. Margen no aparece como sustituto de descuento.
13. Lista >20 no se trunca silenciosamente.
14. Fixture con al menos 66 clientes para demostrar transporte completo.
15. Totales = suma de filas crudas, no suma de valores formateados.
16. Missing discount no se convierte a cero sin evidencia contractual.
17. Respuesta contiene cliente + compra + descuento.
18. No-client-data → fail-closed / DATA_NOT_FOUND.
19. Current/open-month no se presenta falsamente como closed historical actual.
20. Regresión de commercial_state/DICF forecast.
21. Regresión M9.
22. Regresión commercial_trend.
23. Regresión client_profile.
24. Regresión compound client query.
25. No hardcodes de clientes o valores observacionales.

## Validation

Ejecutar focalizados nuevos y todos los tests afectados.

Después:

node --test test/director-ia-*.test.js

Baseline previo conocido:
1384 pass / 0 fail

La suite final debe tener:
0 fail

y no eliminar tests existentes.

Ejecutar:

git diff --check
git diff --stat
git status

Revisar diff completo.

## Report

Crear:

docs/dev-loop/reports/IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

Documentar:

- diseño elegido;
- routing before/after P1-P6;
- semántica calendario;
- definición exacta Nuevo histórica;
- source SQL;
- kg real;
- descuento real;
- missing-vs-zero;
- lista completa;
- no truncation;
- deterministic builder;
- actual vs forecast protection;
- margen vs descuento;
- autorización;
- tests;
- riesgos;
- OUT_OF_SCOPE.

Final fields:

IMPLEMENTATION_STATUS =
BASE_MAIN_SHA =
ROUTING_P1 =
ROUTING_P2 =
ROUTING_P3 =
ROUTING_P4 =
ROUTING_P5 =
ROUTING_P6 =
HISTORICAL_NEW_CLIENTS_CAPABILITY =
CALENDAR_MONTH_SEMANTICS =
PREVIOUS_MONTH_SEMANTICS =
NEW_CLASSIFICATION_FORMULA =
DICF_SEMANTICS_PRESERVED =
PURCHASE_USES_REAL_KG =
FORECAST_USED_FOR_CLOSED_MONTH = NO
DISCOUNT_USES_REAL_SOURCE =
MARGIN_USED_AS_DISCOUNT = NO
MISSING_DISCOUNT_FAIL_CLOSED =
ALL_CLIENTS_TRANSPORTED =
CONTEXT_LIMIT_20_BYPASSED_LOCALLY =
GLOBAL_COMMERCIAL_STATE_LIMIT_CHANGED = NO
DETERMINISTIC_LIST_BUILDER =
PLANT_AUTH_PRESERVED =
P3_ACAPULCO_NOT_CLIENT_PROFILE =
P2_NOT_HIJACKED_BY_IGF =
P1_P4_P5_NOT_TRAILING_TREND =
CURRENT_MONTH_PROTECTION =
HARDCODE_USED = NO
DB_SCHEMA_CHANGED = NO
DICF_FORMULA_CHANGED = NO
SERVER_CHANGED = NO
RENDER_CHANGED = NO
TESTS =
GIT_DIFF_CHECK =
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
OUT_OF_SCOPE_FINDINGS =

## Allowed actions

- AUTHORIZED → IN_PROGRESS cambiando solo status
- inspección
- implementación in_scope
- tests
- reporte
- DONE_PENDING_REVIEW
- commit de esta rama
- push de esta rama

## Forbidden actions

- modificar G1 humano
- escribir APPROVED
- escribir CLOSED
- merge a main
- push a main
- deploy
- siguiente tarea
- corregir OUT_OF_SCOPE
- writes DB
- migrations

max_attempts: 1

result_report_path:
docs/dev-loop/reports/IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

implementation_authorized: YES
merge_authorized: NO
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
