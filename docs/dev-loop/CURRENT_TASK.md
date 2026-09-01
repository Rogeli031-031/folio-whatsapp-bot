# CURRENT_TASK

task_id: AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001

status: CLOSED

human_review: APPROVED

authorized_by: "Human Approver"

authorized_at: "2026-09-01T15:48:59-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01"

task_type: AUDIT

branch: audit/director-ia-new-clients-purchase-discount-001

base_main_sha: 382003789e51f7aca5ace46cd29a4fa0d0c9d2df

objective: >
  Localizar físicamente las fronteras que impiden que Director IA responda de
  forma defendible la pregunta ejecutiva "¿Qué clientes nuevos entraron en
  agosto? ¿Cuánto compraron y con qué descuento?", distinguiendo clasificación
  Nuevos, listado individual, compra real/proyectada, descuento real/proyectado,
  agregado de categoría, contexto enviado al modelo y narrativa final.

## Evidencia humana de producción

Planta observada:
Acapulco

Pantalla:
Delta Ingreso Cliente Forecast

Corte visible:
datos hasta 2026-08-30

La UI muestra categoría:
Nuevos

Control visual de conteos por categoría:
42 + 20 + 0 + 2 + 2 = 66 clientes nuevos

Control visual de ingreso:
,482

Toneladas visibles por bloques:
13.2 + 1.4 + 0.0 + 0.4 + 0.5 = aproximadamente 15.5 t

Una respuesta de Director IA reportó:
66 clientes
15.4 t
,482

Por tanto:

NEW_CLIENT_COUNT_OBSERVED = 66
NEW_CLIENT_INCOME_OBSERVED = 108482
VISIBLE_BUCKET_TON_SUM = APPROX_15_5
DIRECTOR_REPORTED_TON = 15_4
RAW_CANONICAL_TON = NOT_PROVEN

No hardcodear ninguno de estos valores en runtime.

La captura es evidencia observacional humana, no reemplaza la fuente física.

## Respuestas problemáticas observadas

### Escenario A

Pregunta relacionada con nuevos en Acapulco.

Director IA afirmó:

"No se identificaron clientes nuevos en la planta de Acapulco"

y después respondió con clientes de:
- aumentaron
- disminuyeron

Esto contradice la pantalla DICF que sí muestra Nuevos.

### Escenario B

Pregunta exacta:

¿Qué clientes nuevos entraron en agosto? ¿Cuánto compraron y con qué descuento?

Director IA respondió aproximadamente:

- margen julio 2026: 7.11 $/kg
- margen agosto 2026: 7.32 $/kg
- comparación: +0.21 $/kg
- 66 clientes nuevos
- 15.4 toneladas
- ,482
- "no se especifica el descuento aplicado"

Problemas a auditar:

1. obtiene agregado pero no lista;
2. no entrega compra individual;
3. no entrega descuento individual;
4. introduce margen $/kg aunque se preguntó descuento;
5. otra ruta llegó a negar que existieran nuevos.

## Pregunta central

Rastrear físicamente:

pregunta
→ intent/routing
→ categoría comercial
→ motor DICF
→ clasificación Nuevos
→ filas individuales
→ kg real/proyectado
→ descuento real/proyectado
→ agregados
→ contexto Director IA
→ anexos
→ prompt/narrativa
→ respuesta

y localizar la PRIMERA divergencia para cada síntoma.

No asumir una sola causa global.

## Distinción semántica obligatoria

No confundir:

MARGEN $/kg
con
DESCUENTO $/kg

No confundir:

kgBReal
con
kgB proyectado

No confundir:

descuento real de agosto
con
descuento proyectado a cierre

No confundir:

clasificación DICF de forecast
con
comparación histórica mensual M9

La pregunta humana:

"¿Qué clientes nuevos entraron en agosto? ¿Cuánto compraron y con qué descuento?"

puede exigir semántica histórica real.

La auditoría debe determinar físicamente qué contrato usa hoy Director IA y si
existe una divergencia ACTUAL_VS_FORECAST.

No decidir implementación todavía.

## Writable in_scope

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

## Read-only in_scope

- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/TASK_TEMPLATE.md
- docs/dev-loop/reports/README.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- server.js
- frontend/dashboard files relacionados con Delta Ingreso Cliente Forecast
- lib/dicf.js
- lib/delta-ingreso-forecast.js
- lib/delta-ingreso-commands.js
- lib/delta-ingreso-ai.js
- lib/delta-ingreso-ai-db.js
- lib/director-ia-commercial-state.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js
- lib/director-ia-m9-deltas.js
- lib/director-ia-daily-discount.js
- lib/director-ia-tools.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-dashboard-forecast-adapter.js
- lib/director-ia-dashboard-cycle-transport.js
- lib/director-ia-authoritative-forecast-run-pack.js
- tests Director IA / DICF relevantes
- git history estrictamente necesaria

Otros archivos pueden inspeccionarse read-only si aparecen físicamente en el call
chain y se documenta por qué.

## Out of scope

- modificar código runtime
- modificar tests
- implementar clientes nuevos
- implementar descuento
- cambiar DICF
- cambiar fórmula forecast
- cambiar margen
- cambiar descuentos
- cambiar UI
- modificar server.js
- modificar DB/schema
- writes a DB
- hardcodear clientes de la captura
- hardcodear 66
- hardcodear ,482
- hardcodear 15.4 o 15.5
- arreglar aumentaron
- arreglar disminuyeron
- arreglar dejaron de comprar
- implementar Movimiento de clientes
- plant_switch
- Ahora dime lo mismo
- leading-Y
- compound client query ya CLOSED
- parser enero a la fecha
- Render
- Exit 137
- PG pool
- deploy
- merge a main
- Golden Set general
- meta-protocolo

## Probes obligatorios

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

Control C1:
¿Qué clientes aumentaron en agosto en Acapulco?

C1 es read-only y únicamente demuestra separación de categoría.

No corregir Aumentaron.

## Fronteras mínimas a probar

Para P1-P6 capturar cuando sea posible:

- detectDirectorIaIntent
- planDirectorIaQuestion
- resolveCommercialStateCategory
- isCommercialStateListQuestion
- tool plan / domain
- handler seleccionado
- source tags
- loadCommercialStateForChat
- dicf.computeDicf
- data.periodoMes
- data.last_date
- data.nuevos
- data.nuevos.clientes.length
- campos disponibles en cada cliente
- totalDeltaKg / totalDeltaIngreso físicos
- buildCommercialStateFocusedContext
- número de clientes transportados al contexto
- si existe límite/top
- si kg individual está en contexto
- si descuento individual está en contexto
- si margen entra al contexto por otro anexo
- respuesta determinista o prompt final relevante

No editar exports para poder observar.

Usar caller real cuando una función no esté exportada.

## Motor dashboard

Localizar físicamente:

UI
→ endpoint
→ server route
→ compute function

Probar si la pantalla actual usa:

dicf.computeDicf

o:

computeDeltaIngresoForecast

u otra ruta.

No asumir equivalencia por nombres similares.

Documentar:

DASHBOARD_ENGINE = <función exacta>

## Definición de NUEVO

Localizar la condición exacta en el motor que realmente usa el dashboard.

Capturar:

- criterio kg previo;
- criterio kg actual/proyectado;
- ventana temporal;
- uso o no de mes anterior;
- si basta kgA <= 0 y kgB > 0;
- si B es real o proyectado;
- si usa frecuencia/estado;
- cualquier filtro posterior.

No reinterpretar.

## Compra por cliente

Determinar qué variables físicas existen para un cliente Nuevo:

- kg real del mes;
- kg proyectado;
- toneladas mostradas;
- delta kg;
- cualquier otro campo.

Probar cuál de ellas alimenta la UI.

La pregunta "cuánto compraron" no debe asumirse equivalente a forecast.

Clasificar:

PURCHASE_METRIC_UI =
PURCHASE_METRIC_DIRECTOR =
PURCHASE_METRIC_HISTORICAL_REAL =

## Descuento por cliente

Rastrear:

arr.descuentos_diarios_cliente
→ suma monto
→ kg
→ descuento $/kg

Determinar qué campos ya existen en:

- dicf.js
- delta-ingreso-forecast.js
- M9 delta descuento

y si llegan o no a:

buildCommercialStateFocusedContext

No implementar el cruce.

Capturar:

DISCOUNT_SOURCE_FIELD =
DISCOUNT_CONTEXT_FIELD =
DISCOUNT_DROPPED_AT =

## Límite de clientes

Auditar explícitamente cualquier:

slice
limit
top N
COMMERCIAL_STATE_CLIENT_LIMIT

Determinar si una categoría con 66 clientes puede físicamente transportar los 66
al contexto actual.

No cambiar el límite.

## Falso cero

Para el escenario donde Director IA dijo:

"No se identificaron clientes nuevos"

localizar la primera frontera físicamente demostrable entre:

- category recognition
- selected handler
- plant
- period
- source payload
- filtering
- LLM narrative

Si la frase exacta no puede reproducirse localmente:

FALSE_ZERO_NEW_PATH = NOT_REPRODUCED

pero documentar qué rutas podrían producir lista vacía y qué evidencia falta.

No inventar causalidad.

## Margen vs descuento

Determinar por qué una respuesta a "con qué descuento" incluyó:

COMPARACION MARGEN $/kg

Inspeccionar:

- annex selection
- igf/arr annex
- prompt composition
- source prioritization
- deterministic builders

Clasificar:

MARGIN_INJECTION_PATH =
MARGIN_VS_DISCOUNT_CONFUSION_CAUSAL = YES / NO / NOT_PROVEN

No corregir.

## 15.4 vs 15.5

Rastrear valores crudos de:

- total kg Nuevos;
- toneladas por categoría;
- formato/rounding por bloque;
- formato del agregado;
- valor que llega a Director IA.

Determinar si:

15.4 vs 15.5

se explica por:
- redondeo individual;
- agregado antes de redondear;
- forecast distinto;
- otro motor;
- otro corte;
- o NOT_PROVEN.

No usar la suma visual como valor canónico.

## Producción / DB

NO escribir en producción.

Puede ejecutarse una consulta DB estrictamente read-only únicamente si:

- el entorno local ya tiene conexión autorizada;
- no se imprimen secretos;
- no requiere cambios;
- no se modifica ninguna tabla.

No es requisito.

Si no se ejecuta:

LIVE_DB_VALIDATION = NOT_RUN

La captura humana sigue siendo evidencia observacional.

## Tests

Ejecutar únicamente tests existentes relevantes.

No crear tests.

Buscar cobertura de:

- commercial_state
- nuevos
- dicf
- M9
- descuento
- chat routing
- annex selection

Registrar gaps de cobertura.

## Root cause classes permitidas

Usar las que la evidencia demuestre:

- CATEGORY_ROUTING_DIVERGENCE
- PERIOD_SEMANTIC_DIVERGENCE
- SOURCE_ENGINE_DIVERGENCE
- PAYLOAD_FIELD_OMISSION
- CONTEXT_FIELD_OMISSION
- CONTEXT_TRUNCATION
- ACTUAL_VS_FORECAST_SEMANTIC_GAP
- MARGIN_VS_DISCOUNT_CONFUSION
- LLM_NARRATIVE_DIVERGENCE
- AGGREGATE_ROUNDING_DIFFERENCE
- NO_DIVERGENCE
- NOT_PROVEN

Puede haber múltiples clases.

## Reporte

Crear:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

Debe incluir:

1. Executive result
2. Human production evidence
3. Physical dashboard call chain
4. Physical Director IA call chain
5. Probe matrix P1-P6
6. Definition of Nuevo
7. Actual vs Forecast semantics
8. Purchase metric trace
9. Discount metric trace
10. Aggregate trace
11. 15.4 vs 15.5 analysis
12. Client-list truncation analysis
13. False-zero analysis
14. Margin-vs-discount analysis
15. M9 relevance
16. Existing test coverage
17. Root cause classes
18. First divergence by symptom
19. Implementation readiness assessment WITHOUT implementing
20. OUT_OF_SCOPE
21. Final audit fields

## Final fields obligatorios

AUDIT_STATUS =
BASE_MAIN_SHA =
DASHBOARD_ENGINE =
DIRECTOR_COMMERCIAL_STATE_ENGINE =
SAME_ENGINE_DASHBOARD_DIRECTOR =
NEW_CLASSIFICATION_FORMULA =
NEW_CLIENT_COUNT_UI_CONTROL = 66_OBSERVATIONAL
NEW_CLIENT_INCOME_UI_CONTROL = 108482_OBSERVATIONAL
VISIBLE_BUCKET_TON_SUM = APPROX_15_5_OBSERVATIONAL
DIRECTOR_REPORTED_TON = 15_4_OBSERVATIONAL
RAW_CANONICAL_TON =
ACTUAL_VS_FORECAST_CONTRACT =
PURCHASE_METRIC_UI =
PURCHASE_METRIC_DIRECTOR =
KG_PER_CLIENT_AVAILABLE_IN_SOURCE =
CLIENT_LIST_AVAILABLE_IN_SOURCE =
CLIENT_LIST_CONTEXT_LIMIT =
ALL_66_CAN_REACH_CURRENT_CONTEXT =
DISCOUNT_PER_CLIENT_AVAILABLE_IN_SOURCE =
DISCOUNT_SOURCE_FIELD =
DISCOUNT_EXPOSED_TO_DIRECTOR_CONTEXT =
DISCOUNT_DROPPED_AT =
CATEGORY_ROUTING_P1 =
CATEGORY_ROUTING_P2 =
CATEGORY_ROUTING_P3 =
CATEGORY_ROUTING_P4 =
CATEGORY_ROUTING_P5 =
CATEGORY_ROUTING_P6 =
FALSE_ZERO_NEW_PATH =
FALSE_ZERO_NEW_FIRST_DIVERGENCE =
AGGREGATE_ONLY_PATH_FIRST_DIVERGENCE =
MARGIN_INJECTION_PATH =
MARGIN_VS_DISCOUNT_CONFUSION_CAUSAL =
M9_ACTUAL_DISCOUNT_RELEVANCE =
TONNAGE_15_4_VS_15_5_EXPLANATION =
ROOT_CAUSE_CLASSES =
CURRENT_TEST_COVERAGE =
LIVE_DB_VALIDATION =
INTRODUCING_COMMIT =
SOURCE_CODE_CHANGED = NO
TEST_CODE_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
OUT_OF_SCOPE_FINDINGS =

## Allowed actions

- AUTHORIZED → IN_PROGRESS cambiando únicamente status
- inspección read-only
- Node probes read-only
- tests existentes
- DB read-only solo bajo reglas anteriores
- escribir reporte
- IN_PROGRESS → DONE_PENDING_REVIEW
- git diff --check
- commit documental
- push únicamente de esta rama

## Forbidden actions

- editar runtime
- editar tests
- editar arquitectura
- editar server.js
- editar UI
- DB writes
- migrations
- implementar
- hardcodear evidencia
- merge
- push a main
- deploy
- abrir siguiente tarea
- escribir APPROVED
- escribir CLOSED
- modificar authorized_by
- modificar authorized_at
- modificar human_authorization

max_attempts: 1

result_report_path:
docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md

implementation_authorized: NO
merge_authorized: YES

closed_by_human: YES
deploy_authorized: NO

## Stop condition

Al terminar:

- reporte completo
- CURRENT_TASK = DONE_PENDING_REVIEW
- solo CURRENT_TASK + reporte modificados
- git diff --check limpio
- commit documental
- push de rama
- working tree clean

STOP.

No implementation.
No merge.
No deploy.
No siguiente tarea.
