# CURRENT_TASK

task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001

status: AUTHORIZED

authorized_by: "Human Approver"

authorized_at: "2026-09-01T16:42:31-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver autorizó continuar con el prompt grande para AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001."

task_type: AUDIT

branch: audit/director-ia-historical-margin-questions-001

base_main_sha: fc7767d02a41c6f2e53c30f21ce39d5e03d807db

implementation_authorized: NO

merge_authorized: NO

deploy_authorized: NO

max_attempts: 1

## Objective

Localizar físicamente por qué Director IA no responde correctamente preguntas
históricas y comparativas de MARGEN $/kg y determinar el contrato mínimo,
defendible y reutilizable necesario para responder:

P1:
¿Cuál fue el margen en mayo?

P2:
¿Cuál fue el margen de abril y el de mayo?

P3:
¿Cuál es el mejor margen del año?

P4:
¿Cuál fue el menor margen del año?

La auditoría debe distinguir:

- routing/intención;
- periodo calendario;
- planta/autorización;
- fuente física del margen;
- semántica histórica real vs forecast/compromiso;
- selección de versión IGF;
- cálculo por planta;
- comparación de meses;
- máximo/mínimo anual;
- mes cerrado vs mes abierto;
- DATA_NOT_FOUND vs SOURCE_ERROR;
- contexto enviado al LLM;
- continuidad conversacional;
- narrativa final.

NO implementar todavía.

## Human production evidence

Pregunta observada:

¿Cuál fue el margen en mayo?

Respuesta incorrecta observada:

"No tengo información sobre el margen en mayo. Sin embargo, puedo
proporcionarte datos sobre la tendencia comercial reciente en la planta
de Acapulco (ID 1) para el periodo de 30 días más reciente."

Después respondió con:

CASA
- Total de toneladas vendidas en 30 días: 801.2
- Pendiente OLS: -0.233

COMISIONISTA
- Total de toneladas vendidas en 30 días: 629.427
- Pendiente OLS: 0.070

Esto NO responde la pregunta solicitada.

No hardcodear esos valores.
Son evidencia observacional humana.

## Desired executive questions

P1:
¿Cuál fue el margen en mayo?

P2:
¿Cuál fue el margen de abril y el de mayo?

P3:
¿Cuál es el mejor margen del año?

P4:
¿Cuál fue el menor margen del año?

También auditar:

P5:
¿Cuál fue el margen de mayo 2025?

P6:
¿Cuál fue el margen de mayo de 2026 en Acapulco?

P7:
¿Cuál fue el mejor margen de 2026 en Acapulco?

P8:
¿Cuál fue el menor margen de 2026 en Acapulco?

P9:
¿Cuál es el margen de septiembre?

Con fecha de referencia humana 2026-09-01,
septiembre es mes abierto.

P10:
¿Cuál será el margen de octubre?

Debe demostrar protección de periodo futuro/no cerrado.

## Semantic target to audit, not yet implement

MARGEN significa MARGEN $/kg.

No confundir con:

- descuento $/kg;
- venta;
- toneladas;
- pendiente OLS;
- tendencia comercial 30/90;
- resultado final;
- utilidad;
- ingreso;
- Delta Ingreso;
- DICF.

Para meses cerrados, determinar físicamente cuál es la fuente histórica
canónica y si representa un hecho cerrado o un forecast/compromiso.

NO declarar de antemano que igf.compromiso_lines es suficiente.

Probarlo.

## Existing physical clues to verify

Existe actualmente getMargenKgPorPeriodo.

Auditar físicamente su contrato completo:

- qué tabla(s) consulta;
- cómo selecciona igf.versions;
- qué significa plant_code = GLOBAL;
- cómo elige version_number;
- qué columnas usa;
- qué representa margen_kg;
- qué representa venta_ton;
- fórmula exacta del promedio ponderado;
- cómo identifica la planta;
- cardinalidad de filas;
- comportamiento con múltiples coincidencias;
- comportamiento con null;
- comportamiento con 0;
- comportamiento con excepción SQL;
- si colapsa DATA_NOT_FOUND y SOURCE_ERROR;
- si una versión posterior puede modificar retrospectivamente un mes;
- si una versión de mes cerrado representa dato final real,
  compromiso, forecast u otra semántica.

Auditar también si existe OTRA fuente física de margen histórico
más apropiada.

No asumir que el helper actual es necesariamente el contrato final.

## Critical source question

Responder explícitamente:

HISTORICAL_MARGIN_CANONICAL_SOURCE =
PROVEN | PARTIAL | NOT_PROVEN

Y explicar exactamente por qué.

Si es PROVEN:
documentar fuente, fórmula, versión y semántica.

Si es PARTIAL:
documentar qué sí prueba y qué no.

Si es NOT_PROVEN:
no inventar una arquitectura final.

## Period semantics

Auditar resolución temporal.

Con fecha CDMX 2026-09-01:

"mayo"
→ candidato natural 2026-05.

"abril y mayo"
→ 2026-04 y 2026-05.

"mayo 2025"
→ 2025-05.

"mejor margen del año"
→ determinar físicamente qué debe significar "año":
  current calendar year vs otra semántica existente.

Para máximo/mínimo anual evaluar específicamente:

- meses cerrados;
- mes actual abierto;
- meses futuros;
- meses sin fuente;
- meses con null;
- meses con cero;
- años explícitos;
- cambio de año;
- empates.

No asumir que un mes ausente vale 0.

No usar 0 para ganar/perder un ranking cuando significa ausencia.

## Closed vs open month

Auditar si un mes cerrado puede responderse como histórico REAL.

Auditar qué significa el margen de un mes actualmente abierto.

NO presentar compromiso/forecast como "margen que fue".

Para P9 en septiembre 2026 abierto:

determinar qué fuente existe y qué etiqueta correcta tendría.

Ejemplos de semántica aceptable futura, solo si la fuente la respalda:

- margen comprometido;
- margen forecast;
- margen observado a corte;
- DATA_NOT_FOUND.

No decidir por redacción únicamente.

## Annual extrema

Para:

¿Cuál es el mejor margen del año?
¿Cuál fue el menor margen del año?

Determinar cómo construir un conjunto comparable de meses.

La auditoría debe responder:

- qué meses entran;
- qué meses se excluyen;
- por qué;
- si se excluye mes abierto;
- si se excluyen DATA_NOT_FOUND;
- si margen 0 es valor real o missing;
- cómo resolver empate;
- qué fuente/fórmula debe ser idéntica entre meses;
- si la comparación puede hacerse determinísticamente sin LLM.

No aceptar un ranking que compare peras con manzanas
(p. ej. meses cerrados reales contra forecast abierto).

## Plant semantics and authorization

Auditar:

- planta actual de sesión;
- planta nombrada explícitamente;
- resolución Acapulco;
- plantas_permitidas;
- GA;
- GV;
- GG;
- AD;
- no cross-plant.

Reusar controles existentes cuando corresponda,
pero NO modificar autorización.

Determinar si el helper actual identifica empresa/planta con ILIKE y si
eso puede producir cardinalidad ambigua o mezcla de empresas.

Si existe riesgo:
PROBARLO físicamente y documentarlo.

No corregirlo en esta auditoría.

## Routing audit

Para P1-P10 capturar cuando aplique:

- normalizeQuestion
- detectDirectorIaIntent
- planDirectorIaQuestion
- isPlantFinancialKpiQuestion
- shouldAttachIgfArrAnnex
- isCommercialTrendQuestion
- financial_diagnosis
- unknown
- tool plan
- handler seleccionado
- anexos
- conversation state
- inherited intent
- OpenAI called true/false
- sources/context_meta
- respuesta final

Especialmente explicar por qué P1 puede terminar respondiendo
commercial_trend / OLS aunque la pregunta diga "margen".

No asumir que la causa está únicamente en planner.

## Fresh-turn vs continuity probes

Ejecutar P1 en un turno/chat limpio.

Después simular cuando sea posible:

Turno A:
¿Cómo va la tendencia comercial de CASA y COMISIONISTA?

Turno B:
¿Cuál fue el margen en mayo?

Determinar si la continuidad hereda commercial_trend incorrectamente.

También:

Turno A:
¿Cuál fue el margen en abril?

Turno B:
¿Y en mayo?

Solo auditar si la infraestructura actual permite esa continuidad.
No implementar follow-up nuevo.

Etiquetar:

FIRST_TURN_ROUTE =
CONTINUITY_ROUTE =

## Current IGF annex audit

Inspeccionar físicamente:

IGF_ARR_ANNEX_SYSTEM_ADDENDUM

y cualquier bloque:

COMPARACION MARGEN $/kg

Determinar si actualmente fuerza:

mes solicitado vs mes anterior

o:

mes actual vs previo

y qué ocurre para:

- una sola fecha histórica;
- dos meses explícitos;
- máximo anual;
- mínimo anual.

Determinar si el LLM recibe suficiente evidencia para responder
P1-P4 sin inventar.

## Existing helper audit

Auditar getMargenKgPorPeriodo incluyendo:

SELECT de igf.versions

y cálculo equivalente a:

SUM(margen_kg * venta_ton) / SUM(venta_ton)

No asumir que esta fórmula es incorrecta.

No asumir que es correcta para la nueva capacidad.

Compararla contra la fuente/UI/contrato físico disponible.

## Data truth table required

El reporte debe incluir una tabla como mínimo:

CASE
SOURCE AVAILABLE?
PERIOD CLOSED?
MARGIN VALUE?
SEMANTIC LABEL
CAN ANSWER?
VERACITY

Casos:

closed + valid
closed + missing
closed + source error
open + valid commitment/forecast
open + missing
future
annual ranking with partial months

## Source error semantics

Auditar si los helpers actuales convierten excepción a null.

Determinar si hoy puede distinguirse:

DATA_NOT_FOUND

de:

SOURCE_ERROR

Esto es importante.

No implementar.

## Deterministic capability readiness

Evaluar si conviene una capacidad futura dedicada como:

historical_margin

o nombre equivalente.

No implementar.

La auditoría debe concluir si una capacidad determinista puede resolver:

single_month
month_compare
year_max
year_min

sin depender de que el LLM haga el ranking.

Debe recomendar arquitectura mínima,
pero NO escribir runtime.

## Regression boundaries

No romper ni modificar:

- historical_new_clients
- commercial_trend
- financial_diagnosis actual
- M9 delta descuento
- M9 delta venta
- DICF
- IGF dashboard
- Action Register
- client_profile
- compound client query
- leading-Y
- Folios
- Taller
- voice
- WhatsApp
- server.js
- DB/schema

## Control questions

C1:
¿Cómo va el margen de la planta?

Debe permanecer conceptualmente separado de una consulta histórica puntual.

C2:
¿Cómo cambió el descuento de abril a mayo?

No debe convertirse en margen.

C3:
¿Cómo va la tendencia de CASA los últimos 30 días?

Debe seguir siendo commercial_trend.

C4:
¿Qué clientes nuevos entraron en agosto?

Debe seguir siendo historical_new_clients.

C5:
¿Cuál fue la venta de mayo?

No usar esta auditoría para implementar venta histórica.

## Read-only DB probes

Permitidos únicamente si existe conexión ya configurada.

Reglas:

- SELECT solamente;
- no INSERT;
- no UPDATE;
- no DELETE;
- no DDL;
- no transacciones con writes;
- no imprimir secretos;
- no modificar DB;
- no crear tablas temporales persistentes.

Si no hay conexión:
marcar LIVE_DB = NOT_PROVEN.

No detener la auditoría por falta de DB.

## Writable in_scope

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md

## Read-only in_scope

Como mínimo:

- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/TASK_TEMPLATE.md
- docs/dev-loop/reports/README.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- lib/director-ia-planner.js
- lib/director-ia-chat.js
- lib/director-ia-igf-arr.js
- lib/director-ia-m9-deltas.js
- lib/director-ia-commercial-trend.js
- lib/director-ia-financial-diagnosis.js
- lib/director-ia-capabilities.js
- lib/director-ia-tools.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-conversation-state.js
- lib/director-ia-new-clients.js
- utilidades temporales usadas físicamente
- tests Director IA relevantes
- código productor/consumidor de igf.versions / igf.compromiso_lines
- frontend IGF únicamente si es necesario para probar semántica física
- git history estrictamente necesaria

Otros archivos pueden inspeccionarse read-only si aparecen en el call chain.
Documentar por qué.

## Out of scope

- modificar runtime
- modificar tests
- crear historical_margin
- corregir routing
- cambiar planner
- cambiar chat
- cambiar IGF
- cambiar fórmula margen
- cambiar getMargenKgPorPeriodo
- cambiar commercial_trend
- cambiar financial_diagnosis
- cambiar UI
- cambiar server.js
- cambiar DB/schema
- writes DB
- migraciones
- hardcodes de margen
- hardcode mayo
- hardcode 2026
- implementar mejor/menor margen
- implementar abril vs mayo
- implementar follow-ups
- implementar voz
- implementar Folios pendientes
- implementar AT-01
- implementar contractuales
- implementar llantas
- implementar movimiento de clientes
- Render
- deploy
- merge a main
- abrir siguiente tarea

## Required report conclusions

El reporte debe terminar con valores explícitos:

P1_CURRENT_ROUTE =
P2_CURRENT_ROUTE =
P3_CURRENT_ROUTE =
P4_CURRENT_ROUTE =

P1_FIRST_DIVERGENCE =
P2_FIRST_DIVERGENCE =
P3_FIRST_DIVERGENCE =
P4_FIRST_DIVERGENCE =

FIRST_TURN_MARGIN_ROUTE =
CONTINUITY_AFTER_COMMERCIAL_TREND_ROUTE =

HISTORICAL_MARGIN_CANONICAL_SOURCE =
MARGIN_SOURCE_TABLES =
MARGIN_SOURCE_FORMULA =
VERSION_SELECTION_SEMANTICS =
CLOSED_MONTH_SEMANTICS =
OPEN_MONTH_SEMANTICS =
FUTURE_MONTH_SEMANTICS =

MONTH_RESOLUTION_MAY_2026 =
TWO_MONTH_COMPARE_READINESS =
YEAR_MAX_READINESS =
YEAR_MIN_READINESS =
ANNUAL_COMPARABILITY_RULE =

PLANT_MATCH_CARDINALITY =
PLANT_AUTH_PRESERVED =

DATA_NOT_FOUND_VS_SOURCE_ERROR =
LLM_REQUIRED_FOR_VALUE =
LLM_REQUIRED_FOR_RANKING =

DEDICATED_CAPABILITY_RECOMMENDED =
MINIMAL_IMPLEMENTATION_SLICE =

RUNTIME_CHANGED = NO
TESTS_CHANGED = NO
DB_CHANGED = NO
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO

## Audit quality bar

No responder únicamente:

"routing incorrecto"

o:

"falta intent".

Debe demostrar físicamente:

pregunta
→ routing
→ periodo
→ planta
→ fuente
→ versión
→ cálculo
→ evidence/context
→ narrativa

para cada familia P1-P4.

Si distintas preguntas tienen causas diferentes,
mantenerlas separadas.

No inventar una causa global.

## Allowed actions

- leer archivos
- grep/search
- git log/show/diff read-only
- ejecutar Node/scripts existentes read-only
- ejecutar tests existentes
- ejecutar probes read-only
- SELECT DB si existe conexión
- editar únicamente CURRENT_TASK y el reporte
- commit del audit
- push de la rama audit

## Forbidden

- implementación
- runtime edits
- test edits
- main merge
- deploy
- nueva tarea

Al terminar:

status: DONE_PENDING_REVIEW

Commit sugerido:

docs(director-ia): audit historical margin questions

Push:

origin/audit/director-ia-historical-margin-questions-001

STOP.