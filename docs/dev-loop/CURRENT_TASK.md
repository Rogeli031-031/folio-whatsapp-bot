task_id: FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T15:57:43-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 248997415d86c73bc5f9bf140901bbdc76c27c6b
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001.md

objective: "Dar continuidad determinista a una búsqueda previa de folios para que el follow-up 'puedes sumarlos y darme un total por mes?' reutilice la specification canónica del search anterior, reconsulte el universo completo y use el AGGREGATE existente por mes_cargo."

## Evidencia auditada

T1:

¿Qué folios de enero a agosto contienen la palabra aceite?

Resultado:

intent:
folio_search

scope:
ALL_PUBLIC_FOLIOS

period:
2026-01..2026-08

period_field:
mes_cargo

search term:
aceite

operation:
keyword_search

query pre-truncates:
NO

display limit:
40

match count:
antes del display limit

Problema:

T1 no escribe conversation_state utilizable.

T2 exacto:

puedes sumarlos y darme un total por mes?

Actualmente:

intent:
unknown

porque "los" no tiene antecedente estructurado.

## FIRST_DIVERGENCE

FOLIO_SEARCH_DOES_NOT_WRITE_CONVERSATION_STATE

## Principio

NO guardar filas como continuidad.

Guardar una specification canónica y saneada.

Luego:

follow-up aggregate
→ spec anterior
→ requery
→ AGGREGATE existente
→ SUM
→ MONTH
→ mes_cargo

No hacer matemáticas desde texto renderizado.

## Contrato de state

Agregar continuidad efímera para folio_search.

Puede llamarse:

active_folio_search

folio_search_spec

u otro nombre acorde a la convención física del módulo.

El nombre exacto debe reportarse.

Debe contener como máximo la specification necesaria:

version
planta_id
scope
period_mode
period_month
period_start
period_end
period_field
concept_mode
concept_query
concept_alternatives
operation

y únicamente filtros adicionales que físicamente afecten
el mismo result set.

NO guardar:

records
rows
importe totals
analysis
texto completo de respuesta
lista truncada de 40
evidence material

Esto es query state, no evidence cache.

## Sanitización obligatoria

La specification que regresa del cliente/UI NO es confiable.

Debe sanearse en:

director-ia-conversation-state

antes de reutilizarse.

Validar enum/shape de:

scope
period_mode
period YYYY-MM
concept_mode
operation
planta_id

concept_query / alternatives:
strings acotados y saneados.

No aceptar campos arbitrarios.

No aceptar SQL/predicados desde state.

## Plant binding

La specification pertenece a:

planta_id del T1.

Si request.planta_id != state.planta_id:

el spec se elimina.

CROSS_PLANT_REUSE:
NO

La requery del T2 debe volver a atravesar
la autorización normal de folio_search.

No reutilizar autorización vieja como evidencia.

## Parent intent

folio_search puede hacerse inheritable SOLO para este
contrato de continuidad defensible.

Agregarlo a INHERITABLE_INTENTS si la arquitectura lo requiere.

Eso NO autoriza heredar cualquier pregunta ambigua
como folio_search.

La herencia debe estar condicionada a:

spec válida
+
misma planta
+
follow-up agregado explícito.

## Follow-up autorizado

T2 canónico:

puedes sumarlos y darme un total por mes?

Debe reconocerse como:

folio_search aggregate follow-up

solo cuando exista specification válida.

Puede aceptar variaciones estrechas equivalentes como:

súmalos por mes
dame el total por mes
suma esos folios por mes

si el detector sigue exigiendo antecedente válido
y lenguaje de agregación inequívoco.

NO hacer un detector abierto de pronombres.

## Sin antecedente

Chat nuevo:

puedes sumarlos y darme un total por mes?

Debe permanecer:

unknown / clarification

No buscar todos los folios.

No inventar "aceite".

No usar history textual como evidencia.

## C4/C5 fuera de alcance

Después de T1:

¿cuántos fueron?

y:

¿y solo julio?

NO son objetivo de este FIX.

No hacer que funcionen incidentalmente mediante
una regla genérica demasiado amplia.

Si siguen unknown:
PASS para este slice.

## Requery

El T2 debe reejecutar la búsqueda completa.

Debe utilizar:

scope heredado
period heredado
period_field = mes_cargo
concept/keyword heredado
operation heredada

y modificar SOLO el modelo analítico:

analysis_mode:
AGGREGATE

aggregation:
SUM

group_by:
MONTH

cumulative:
NO

para el T2 canónico.

No reparsear "los" como concepto.

No sustituir search_term con palabras de T2.

## Parser vs direct spec

Preferir pasar filters/spec estructurados al loader
o un helper determinista equivalente.

NO construir una frase artificial y depender
de que el parser vuelva a inferir correctamente "aceite".

Si se necesita una entrada opcional como:

filtersOverride
inheritedFilters
searchSpec

debe estar saneada y probada.

No crear una segunda implementación del matcher.

## Universo completo

CRÍTICO:

No agregar:

payload.records

porque puede estar truncado a 40.

La requery debe ejecutar el matcher existente
sobre el universo completo recuperado por la fuente.

El aggregate existente debe trabajar antes del display slice
o con su actual full matched set.

## AGGREGATE existente

Reusar el comportamiento ya implementado.

No crear otro buildAggregate.

Preservar:

CANCELADO excluido del agregado principal.

Null importe:
UNKNOWN / incompleto conforme contrato actual.

PAGADO:
no prueba gasto contable.

Safe label:

importe registrado

## Salida esperada

Para T2, usar el answer existente de AGGREGATE.

Debe poder responder conceptualmente:

El importe total de los folios encontrados,
excluyendo CANCELADO, es ...

Enero: ...
Febrero: ...
...
Agosto: ...

con tratamiento existente de importes no registrados.

No pedir al LLM sumar.

openai_called:
false

si ese es el contrato actual de folio_search.

## No cambiar semántica del listado T1

T1 debe seguir:

listando CANCELADO;
mostrando hasta 40;
reportando count/match_count completo;
buscando en ALL_PUBLIC_FOLIOS;
usando keyword parity existente.

La única adición visible/estructural permitida es
conversation_state.

## State writer

Después de T1 exitoso,
el resultado final del chat debe devolver conversation_state
con la specification.

No basta con context_meta.

Demostrar que el panel puede ecoarla en T2
con el contrato ya existente.

NO frontend change.

## State reader

En T2:

sanitizeEchoedState
→ spec válida
→ follow-up detector
→ folio_search aggregate path

El planner puede continuar clasificando la frase aislada
como unknown internamente si el deterministic continuity layer
la resuelve antes/de forma autorizada.

Preferencia:
NO planner change si no es necesario.

Si Cursor concluye que planner.js es imprescindible:
STOP.
No ampliar alcance.

## Existing aggregation semantics

public.folios.importe:
importe registrado.

public.folios.mes_cargo:
YYYY-MM.

f.estatus:
CANCELADO excluido del main aggregate.

No SQL nuevo.

## No server

No server.js.

El audit determinó que todo puede resolverse
en libs existentes.

## Tests obligatorios

001 T1 exact question → folio_search
002 T1 scope ALL_PUBLIC_FOLIOS
003 T1 period_mode RANGE
004 T1 period_start 2026-01
005 T1 period_end 2026-08
006 T1 period field mes_cargo
007 T1 operation keyword_search
008 T1 concept/search term aceite

009 T1 writes conversation_state
010 T1 state parent_intent folio_search
011 T1 state contains canonical search spec
012 spec contains planta_id
013 spec contains scope
014 spec contains period
015 spec contains concept/search term
016 spec contains operation
017 spec contains no records
018 spec contains no rows
019 spec contains no analysis amounts
020 spec contains no rendered response text

021 echoed spec sanitized
022 arbitrary fields removed
023 malformed period rejected
024 malformed scope rejected
025 malformed operation rejected
026 empty/malformed concept fails closed
027 state plant mismatch drops folio spec

028 folio_search inheritable only with valid spec
029 parent_intent alone without spec is insufficient

030 T2 exact phrase recognized with valid spec
031 T2 does not invent concept from pronoun
032 T2 inherits planta_id
033 T2 inherits scope
034 T2 inherits period_start
035 T2 inherits period_end
036 T2 inherits keyword/concept
037 T2 inherits operation
038 T2 sets analysis_mode AGGREGATE
039 T2 sets aggregation SUM
040 T2 sets group_by MONTH
041 T2 cumulative NO

042 T2 requery executes source
043 T2 does not aggregate prior displayed records
044 T2 operates on full matched set
045 T2 survives >40 matched fixture
046 totals include matches beyond display row 40

047 T2 groups by mes_cargo
048 T2 does not group by creation date
049 T2 does not group by payment date

050 CANCELADO remains present in T1 list
051 CANCELADO excluded from T2 main aggregate
052 non-cancelled rows included
053 null importe treated by existing incomplete-total contract
054 zero importe remains known zero
055 PAGADO semantics unchanged

056 safe label is importe registrado
057 no claim of gasto pagado
058 no claim of gasto contable
059 no LLM math
060 no OpenAI call required

061 fresh chat T2 without state → unknown/clarification
062 fresh chat T2 does not execute folio requery
063 fresh chat T2 does not assume all folios

064 cross-plant echoed state dropped
065 cross-plant T2 not executed from old spec
066 authorization rechecked for current planta

067 T1 response/list behavior unchanged
068 T1 display limit remains 40
069 T1 match_count remains before display limit
070 keyword matcher unchanged
071 project join parity unchanged
072 resolvePlantCodes unrelated

073 C4 ¿cuántos fueron? remains outside this FIX
074 C5 ¿y solo julio? remains outside this FIX

075 existing explicit aggregate question still PASS:
"cuánto suman los folios de enero a agosto de aceite?"
076 explicit aggregate does not require conversation state
077 explicit aggregate and follow-up aggregate produce same result fixture

078 folio-search keyword range suite PASS
079 folio aggregate existing tests PASS
080 M2 folio status/history/documents PASS
081 IGF reviewable PASS
082 conversation-state existing suite PASS
083 Tier 1/applicable gate PASS

084 no new SQL
085 no schema
086 no migration
087 no new tool
088 no endpoint
089 no server.js
090 no frontend
091 no planner unless STOP
092 no LIVE_DB
093 diff --check PASS
094 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

STATE_FIELD_NAME:
STATE_WRITER:
STATE_SANITIZER:
STATE_READER:
FOLIO_SEARCH_INHERITABLE:

STATE_SPEC_SHAPE:
STATE_STORES_ROWS:
STATE_STORES_AMOUNTS:
STATE_PLANT_BOUND:

T1_INTENT:
T1_SEARCH_TERM:
T1_PERIOD:
T1_UNIVERSE:
T1_STATE_WRITTEN:

T2_EXACT_QUESTION:
T2_ROUTE:
T2_INHERITED_SPEC:
T2_ANALYSIS_MODE:
T2_AGGREGATION:
T2_GROUP_BY:
T2_REQUERY:
T2_FULL_MATCH_SET:
T2_DISPLAY_ROWS_USED_FOR_MATH:

CANCELLED_LIST_BEHAVIOR:
CANCELLED_AGGREGATE_BEHAVIOR:
AMOUNT_LABEL:
GROUP_MONTH_FIELD:

FRESH_CHAT_T2_BEHAVIOR:
CROSS_PLANT_BEHAVIOR:
AUTH_RECHECKED:

C4_COUNT_FOLLOWUP_CHANGED:
C5_MONTH_REFINEMENT_CHANGED:

EXPLICIT_AGGREGATE_REGRESSION:
FOLLOWUP_EQUALS_EXPLICIT_FIXTURE:

001..094:
SUITES:
FILES:
RISKS:

FOLIO_SEARCH_CHANGED:
CONVERSATION_STATE_CHANGED:
CHAT_CHANGED:
PLANNER_CHANGED:
SQL_CHANGED:
SERVER_CHANGED:
FRONTEND_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
OPENAI_MATH_USED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit implementación.

Crear reporte append-only:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-AGGREGATION-FOLLOWUP-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
closure_reason: "HUMAN REVIEW PASS. folio_search ahora persiste una specification canónica y saneada en conversation_state y el follow-up de agregación reconsulta determinísticamente el conjunto completo."

human_acceptance: "PASS 94/94. El segundo turno 'puedes sumarlos y darme un total por mes?' hereda planta, scope, rango, mes_cargo, keyword y operación del turno anterior y reutiliza el aggregate existente con SUM/MONTH."

human_truth_decision: "La continuidad no guarda filas, importes ni texto renderizado. El agregado se ejecuta sobre el full matched set y no sobre el display limit 40."

human_financial_semantics: "public.folios.importe se presenta como importe registrado. CANCELADO permanece visible en el listado T1 pero se excluye del agregado principal. PAGADO no se interpreta como gasto contable."

human_security_decision: "folio_search_spec está ligada a planta_id, se sanea al eco y se elimina ante cambio de planta. La reconsulta vuelve a pasar autorización."

scope_preserved: "No planner, SQL, server.js, frontend, schema, tool ni endpoint. ¿cuántos fueron? y ¿y solo julio? permanecen fuera de alcance."

live_validation_pending: "Validar en Acapulco una secuencia real T1→T2 en el mismo chat y confirmar que chat nuevo con T2 aislado sigue fail-close."
