task_id: AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001

task_type: AUDIT
mode: READ_ONLY

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T15:41:34-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: da57cc8c8162a4e189d6cbecf617716070cbe665
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001.md

objective: "Determinar por qué Director IA pierde el contexto de una búsqueda de folios por keyword/rango cuando el siguiente turno pide sumar esos mismos resultados y agruparlos por mes, y definir la mínima continuidad determinista necesaria sin inventar folios ni reinterpretar importes."

## Antecedente físico ya cerrado

Existe el FIX:

FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002

Su contrato probado incluye:

- intent folio_search;
- universo ALL_PUBLIC_FOLIOS;
- rango histórico por mes_cargo;
- keyword search con paridad Kanban;
- CANCELADO incluido en el listado;
- query sin pre-truncar;
- match_count antes del límite visual;
- list limit 40;
- no OpenAI matching;
- no embeddings.

No reabrir ese FIX.

Leer obligatoriamente:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md

y sus tests relacionados.

## Escenario de continuidad

TURNO 1

Usar el escenario/regresión canónico ya existente del FIX anterior
para una búsqueda equivalente a:

¿Qué folios de enero a agosto contienen la palabra aceite?

No inventar un nuevo fixture si el test anterior conserva
la pregunta exacta. Preferir esa pregunta exacta.

Esperado T1:

intent:
folio_search

search_term:
aceite

universe:
ALL_PUBLIC_FOLIOS

period:
2026-01..2026-08

period_field:
mes_cargo

La respuesta lista los folios encontrados.

TURNO 2 exacto:

puedes sumarlos y darme un total por mes?

Problema observado:

Director IA pierde la referencia a "los"
y actualmente termina fuera de la búsqueda anterior / UNKNOWN.

## Objetivo conversacional

El segundo turno debe poder significar:

"Toma exactamente el mismo conjunto definido por mi búsqueda anterior
de folios y agrégalo monetariamente por mes."

NO significa:

- buscar todos los folios de la planta;
- inventar otro keyword;
- ampliar rango;
- cambiar ALL_PUBLIC_FOLIOS por apoyos activos;
- usar solo los 40 mostrados;
- consultar Action Register;
- usar IGF;
- inferir gasto pagado.

## Lo que debe heredarse conceptualmente

Auditar si existen físicamente y dónde pueden persistirse:

- dominio/intent de folios;
- planta;
- universe;
- period start;
- period end;
- period field = mes_cargo;
- search_term;
- keyword match mode/regla;
- cualquier filtro explícito aplicado en T1;
- match_count;
- identidad o specification del result set.

No implementar persistencia.

## Pregunta central 1 — routing

Trazar T1 y T2 por:

planner
→ chat
→ conversation_state
→ folio_search
→ composer/response

Entregar el primer punto en el que T2 deja de poder identificar
el antecedente "los".

Determinar si T2 cae en:

unknown
folio_search
folio_status
otro

y por qué.

## Pregunta central 2 — conversation state

Localizar todos los mecanismos actuales de continuidad relevantes:

conversation_state
active_* fields
last intent/domain
entity inheritance
period inheritance
client continuity
folio continuity si existe

Entregar:

STATE_WRITER_AFTER_T1:
STATE_SHAPE_AFTER_T1:
STATE_READER_ON_T2:
FOLIO_SEARCH_STATE_PERSISTED:
FOLIO_RESULT_SET_REFERENCE_PERSISTED:

No asumir que por existir conversation_state
folio_search lo usa.

## Pregunta central 3 — filas vs specification

Determinar la arquitectura mínima correcta para continuidad.

Comparar físicamente dos modelos:

A)
guardar todas las filas matched en conversation_state

B)
guardar una specification canónica y reconsultar determinísticamente

Ejemplo conceptual de specification, NO autorizado como contrato todavía:

{
  domain: "folios",
  intent: "folio_search",
  planta_id,
  universe: "ALL_PUBLIC_FOLIOS",
  period: {
    start: "2026-01",
    end: "2026-08",
    field: "mes_cargo"
  },
  search_term: "aceite",
  match_mode: "...",
  filters: {...}
}

Determinar cuál encaja con la arquitectura existente.

Considerar:

- list limit 40;
- match_count antes de truncado;
- tamaño de conversation_state;
- reproducibilidad;
- autorización por planta;
- cambios de datos entre turnos.

Entregar:

RECOMMENDED_CONTINUITY_MODEL:
WHY_ROWS_OR_SPEC:
REQUERY_REQUIRED_FOR_COMPLETE_AGGREGATE:

## Pregunta central 4 — universo completo

CRÍTICO.

El agregado NO puede sumar únicamente:

rows.slice(0, 40)

si hubo más matches.

Demostrar:

- dónde ocurre el límite visual;
- dónde existe el universo completo;
- si el query actual trae todo antes del slice;
- si un segundo turno puede reejecutar el mismo matcher sobre el universo completo.

Entregar:

QUERY_PRE_TRUNCATES:
MATCH_COUNT_BEFORE_LIMIT:
DISPLAY_LIMIT:
AGGREGATION_MUST_USE_FULL_MATCH_SET:

## Pregunta central 5 — campo monetario

Trazar físicamente el campo:

importe

en la búsqueda de folios.

Determinar:

- tabla/campo físico;
- nullability;
- tipo/unidad;
- si corresponde a importe registrado del folio;
- si existe otra cifra como pagado/ejercido/autorizado.

No reinterpretar.

La respuesta futura debe usar terminología defendible.

Preferencia humana:

"importe registrado"

NO:

"gasto pagado"
"gasto real"
"efectivo desembolsado"

salvo que el código demuestre otra semántica.

Entregar:

AMOUNT_SOURCE:
AMOUNT_FIELD:
AMOUNT_SEMANTIC:
SAFE_VISIBLE_LABEL:

## Pregunta central 6 — mes de agrupación

El grupo futuro debe usar:

mes_cargo

porque el search histórico ya está ligado a ese campo.

Demostrar:

GROUP_MONTH_SOURCE:
GROUP_MONTH_FIELD:
GROUP_MONTH_FORMAT:

No reagrupar por fecha_creacion/fecha_pago
salvo evidencia contraria.

## Pregunta central 7 — CANCELADO

El listado keyword actual incluye CANCELADO.

Para la suma monetaria deseada:

CANCELADO no debe contribuir al total agregado principal.

Auditar físicamente:

- campo de status;
- valores/status canónicos;
- cómo se identifica CANCELADO;
- si importe permanece registrado en un folio cancelado;
- cómo otros agregados del sistema manejan CANCELADO.

No implementar.

Contrato humano deseado para el siguiente FIX,
si el código no demuestra una contradicción:

MAIN_TOTAL:
excluir CANCELADO

LIST:
puede seguir mostrando CANCELADO

Idealmente el agregado futuro debe poder informar por separado,
si existe:

cancelados_count
cancelados_importe_registrado

pero no es requisito de este audit.

Entregar:

STATUS_FIELD:
CANCELLED_CANONICAL_VALUE:
CANCELLED_INCLUDED_IN_SEARCH_LIST:
CANCELLED_EXCLUDED_FROM_MAIN_AGGREGATE_RECOMMENDED:
EXISTING_SYSTEM_PRECEDENT:

## Pregunta central 8 — forma de agregado

Determinar la salida determinista mínima posible.

Shape conceptual:

{
  period_field: "mes_cargo",
  rows: [
    {
      month: "2026-01",
      folio_count,
      importe_registrado
    }
  ],
  total_folios,
  total_importe_registrado
}

Si cancelados se separan:

{
  ...
  cancelled_count,
  cancelled_importe_registrado
}

No implementar.

No inventar nombres si ya existe convención.

## Pregunta central 9 — dónde debe vivir la operación

Determinar si el agregado debe implementarse:

A) dentro de folio_search como follow-up mode

B) nuevo intent pero misma tool/source

C) composer sobre rows

D) requery helper determinista

E) otro

Evaluar autorización y verdad.

Preferencia:

No crear herramienta nueva si la fuente actual basta.

No hacer matemáticas por LLM sobre texto renderizado.

La suma debe ser determinista en código.

Entregar:

RECOMMENDED_AGGREGATION_LAYER:
NEW_TOOL_REQUIRED:
NEW_SQL_REQUIRED:
LLM_MATH_ALLOWED:

LLM_MATH_ALLOWED esperado:
NO

## Dos turnos obligatorios

C1 T1:
keyword + rango existente

Entregar:

C1_INTENT:
C1_SEARCH_TERM:
C1_UNIVERSE:
C1_PERIOD:
C1_PERIOD_FIELD:
C1_MATCH_COUNT:
C1_DISPLAY_COUNT:
C1_CONVERSATION_STATE_AFTER:

C2 T2 exacto:

puedes sumarlos y darme un total por mes?

Entregar:

C2_CURRENT_INTENT:
C2_CURRENT_ROUTE:
C2_CURRENT_CLARIFICATION:
C2_INHERITS_FOLIO_DOMAIN:
C2_INHERITS_PLANT:
C2_INHERITS_PERIOD:
C2_INHERITS_SEARCH_TERM:
C2_INHERITS_RESULT_SPEC:

## Controles de no contaminación

C3:
En chat nuevo:

puedes sumarlos y darme un total por mes?

Debe NO asumir un antecedente inexistente.

Auditar comportamiento correcto esperado:
clarificación o fail-close.

C4:
Después de T1, preguntar:

¿cuántos fueron?

Determinar si ya existe continuidad aplicable
o si también cae en unknown.

C5:
Después de T1, preguntar:

¿y solo julio?

Determinar si el sistema puede restringir la specification heredada
o si no existe continuidad.

C4/C5 son diagnóstico.
NO ampliar implementation recomendada automáticamente.

## Planta / autorización

La continuidad debe seguir ligada a la planta autorizada.

No permitir que una specification heredada
sobreviva a un cambio de planta sin revalidación.

Entregar:

PLANT_BOUND_STATE:
AUTH_RECHECK_REQUIRED:
CROSS_PLANT_REUSE_ALLOWED:

CROSS_PLANT_REUSE_ALLOWED esperado:
NO

## Temporalidad

El follow-up:

"por mes"

no cambia el rango.

Solo cambia la presentación/agregación.

No interpretar "por mes" como:

mes actual
último mes
month discovery

## No implementar

NO product code.
NO SQL nuevo.
NO schema.
NO migration.
NO tool nueva.
NO endpoint.
NO frontend.
NO server change.
NO LIVE_DB.
NO deploy.
NO merge.
NO push main.

Tests/sondas read-only con fixtures:
SÍ.

## FIRST_DIVERGENCE

La auditoría debe terminar con UNA frontera concreta.

Ejemplos:

FOLIO_SEARCH_DOES_NOT_WRITE_CONVERSATION_STATE

PLANNER_DOES_NOT_RESOLVE_AGGREGATION_FOLLOWUP

CHAT_DROPS_FOLIO_SEARCH_STATE

RESULT_SPEC_NOT_PERSISTED

AGGREGATION_MODE_MISSING

otro demostrado.

No responder simplemente:

"falta contexto".

## Clasificación

Determinar:

ROUTING_BUG:
CONTINUITY_BUG:
STATE_WRITE_BUG:
STATE_READ_BUG:
RESULT_SET_BUG:
AGGREGATION_CAPABILITY_MISSING:
DATA_BUG:
SQL_BUG:
PRESENTATION_BUG:

## Fixability

Entregar:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:
CAN_FIX_WITHOUT_SCHEMA_CHANGE:

## Expected delivery

AUDIT_RESULT:

PREVIOUS_FOLIO_FIX_CONTRACT:

C1_EXACT_QUESTION:
C1_INTENT:
C1_ROUTE:
C1_SEARCH_TERM:
C1_UNIVERSE:
C1_PERIOD:
C1_PERIOD_FIELD:
C1_MATCH_COUNT:
C1_DISPLAY_LIMIT:
C1_CONVERSATION_STATE_AFTER:

C2_EXACT_QUESTION:
C2_CURRENT_INTENT:
C2_CURRENT_ROUTE:
C2_CURRENT_RESPONSE_CLASS:
C2_INHERITS_FOLIO_DOMAIN:
C2_INHERITS_PLANT:
C2_INHERITS_PERIOD:
C2_INHERITS_SEARCH_TERM:
C2_INHERITS_RESULT_SPEC:

STATE_WRITER_AFTER_T1:
STATE_SHAPE_AFTER_T1:
STATE_READER_ON_T2:
FOLIO_SEARCH_STATE_PERSISTED:
FOLIO_RESULT_SET_REFERENCE_PERSISTED:

QUERY_PRE_TRUNCATES:
MATCH_COUNT_BEFORE_LIMIT:
DISPLAY_LIMIT:
AGGREGATION_MUST_USE_FULL_MATCH_SET:

RECOMMENDED_CONTINUITY_MODEL:
WHY_ROWS_OR_SPEC:
REQUERY_REQUIRED_FOR_COMPLETE_AGGREGATE:

AMOUNT_SOURCE:
AMOUNT_FIELD:
AMOUNT_SEMANTIC:
SAFE_VISIBLE_LABEL:

GROUP_MONTH_SOURCE:
GROUP_MONTH_FIELD:
GROUP_MONTH_FORMAT:

STATUS_FIELD:
CANCELLED_CANONICAL_VALUE:
CANCELLED_INCLUDED_IN_SEARCH_LIST:
CANCELLED_EXCLUDED_FROM_MAIN_AGGREGATE_RECOMMENDED:
EXISTING_SYSTEM_PRECEDENT:

RECOMMENDED_AGGREGATION_SHAPE:
RECOMMENDED_AGGREGATION_LAYER:
NEW_TOOL_REQUIRED:
NEW_SQL_REQUIRED:
LLM_MATH_ALLOWED:

C3_NO_ANTECEDENT_BEHAVIOR:
C4_COUNT_FOLLOWUP_BEHAVIOR:
C5_MONTH_REFINEMENT_BEHAVIOR:

PLANT_BOUND_STATE:
AUTH_RECHECK_REQUIRED:
CROSS_PLANT_REUSE_ALLOWED:

FIRST_DIVERGENCE:

ROUTING_BUG:
CONTINUITY_BUG:
STATE_WRITE_BUG:
STATE_READ_BUG:
RESULT_SET_BUG:
AGGREGATION_CAPABILITY_MISSING:
DATA_BUG:
SQL_BUG:
PRESENTATION_BUG:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:
CAN_FIX_WITHOUT_SCHEMA_CHANGE:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte append-only:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-AGGREGATION-CONTINUITY-001.md

Commit auditoría.

STOP.

No implementación.
No siguiente tarea.
No merge.
No push main.
No deploy.
No LIVE_DB.
closure_reason: "HUMAN REVIEW PASS. La primera divergencia es que folio_search no escribe una specification heredable en conversation_state; por ello el follow-up pronominal llega sin antecedente y el planner cae en unknown."

human_architecture_decision: "La continuidad debe persistir una specification canónica y mínima del search, no las filas renderizadas. El agregado del segundo turno debe reconsultar determinísticamente el universo completo."

human_aggregation_decision: "No se autoriza motor nuevo. folio_search ya soporta AGGREGATE/SUM/MONTH. El FIX debe reutilizar esa capacidad sobre el mismo scope, planta, periodo, mes_cargo, keyword/match mode y filtros del turno anterior."

human_truth_decision: "El agregado principal excluye CANCELADO y debe llamarse importe registrado. No afirmar gasto pagado, gasto real ni gasto contable."

human_scope_decision: "Este slice cubre únicamente el follow-up de agregación equivalente a 'puedes sumarlos y darme un total por mes?'. ¿cuántos fueron? y ¿y solo julio? permanecen fuera de alcance."

human_security_decision: "La specification debe estar ligada a planta_id, sanearse al eco y descartarse ante cambio de planta. La reconsulta vuelve a ejecutar autorización; no cross-plant reuse."
