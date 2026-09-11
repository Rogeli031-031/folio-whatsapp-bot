task_id: FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-11T17:43:35-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 4807dc3416af90fc3d249ea542ce72c7fbfe2b03
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001.md

objective: "Hacer equivalentes en folio_search las expresiones 'tienen la palabra X' y 'contienen la palabra X', sin cambiar matcher, SQL, continuidad, planner ni fuentes."

## Evidencia LIVE

FUNCIONA:

¿Qué folios de febrero de 2026 contienen la palabra aceite?

Resultado:
3 folios correctos.
concept_query esperado:
aceite

FALLA:

¿Qué folios de febrero de 2026 tienen la palabra aceite?

Resultado actual:
No encontré folios con esos filtros.
Filtros: mes_cargo 2026-02, concepto tienen palabra aceite.

También falla:

¿Qué folios de enero a agosto de 2026 tienen la palabra aceite?

El parser conserva incorrectamente:
tienen palabra aceite

en vez de:
aceite

## Causa focal

Archivo:

lib/director-ia-folio-search.js

La detección/wrappers actuales contemplan formas como:

contienen la palabra
contiene la palabra
contenga
contengan
que tengan
donde aparezca
busca

pero no normalizan correctamente:

tiene la palabra
tienen la palabra
que tiene la palabra
que tienen la palabra

## North Star

A:

¿Qué folios de febrero de 2026 contienen la palabra aceite?

B:

¿Qué folios de febrero de 2026 tienen la palabra aceite?

A y B deben producir exactamente:

intent:
folio_search

scope:
ALL_PUBLIC_FOLIOS

period_mode:
SINGLE

period_month:
2026-02

operation:
keyword_search

concept_mode:
SINGLE

concept_query:
aceite

Mismo result set.
Mismo count.

## Motor

También deben ser equivalentes:

¿Qué folios de enero de 2026 contienen la palabra motor?

¿Qué folios de enero de 2026 tienen la palabra motor?

Ambas:

concept_query:
motor

Nunca:

tienen palabra motor

## Rango

También deben ser equivalentes:

¿Qué folios de enero a agosto de 2026 contienen la palabra aceite?

¿Qué folios de enero a agosto de 2026 tienen la palabra aceite?

Ambas:

period_mode:
RANGE

period_start:
2026-01

period_end:
2026-08

operation:
keyword_search

concept_query:
aceite

## Variantes autorizadas

Soportar únicamente las variantes explícitas de keyword:

tiene la palabra X
tienen la palabra X
que tiene la palabra X
que tienen la palabra X
que tenga la palabra X
que tengan la palabra X

## Control negativo

NO convertir cualquier uso de "tiene/tienen" en keyword.

No activar por este FIX:

tienen estatus PAGADO
tienen responsable
tienen comprobaciones

La regla debe depender explícitamente de:

la palabra

o construcción keyword equivalente ya existente.

## Alcance técnico preferido

Modificar únicamente:

lib/director-ia-folio-search.js

y tests focales.

Se permite tocar:

SEARCH_WRAPPER_RES
KEYWORD_HINT_RE

y helpers del parser estrictamente necesarios.

## Prohibido cambiar

NO modificar matcher:

normalizeForSearch
textMatchesSearch
rowMatchesKeywordSearch
significantSearchTokens

NO cambiar:

lib/director-ia-chat.js
lib/director-ia-conversation-state.js
lib/director-ia-planner.js
server.js
frontend

NO SQL nuevo.
NO schema.
NO migration.
NO tool.
NO endpoint.
NO LIVE_DB.

Si Cursor determina que necesita alguno:
STOP.

## Semántica a preservar

period field:
mes_cargo

folios:
ALL_PUBLIC_FOLIOS

display limit:
40

match_count:
antes del display limit

CANCELADO:
permanece en listado

aggregate:
excluye CANCELADO

importe:
importe registrado

## Continuidad regresión

T1:

¿Qué folios de enero a agosto de 2026 tienen la palabra aceite?

Debe escribir folio_search_spec con:

concept_query:
aceite

operation:
keyword_search

Luego T2:

puedes sumarlos y darme un total por mes?

Debe continuar funcionando con el FIX anterior.

No modificar código de continuidad.

## Tests obligatorios

001 contiene aceite -> folio_search
002 contiene aceite -> keyword_search
003 contiene aceite -> concept_query aceite

004 tienen la palabra aceite -> folio_search
005 tienen la palabra aceite -> keyword_search
006 tienen la palabra aceite -> concept_query aceite
007 no conserva "tienen" en concept_query
008 no conserva "palabra" en concept_query

009 contiene vs tienen -> mismo scope
010 contiene vs tienen -> mismo periodo
011 contiene vs tienen -> misma operation
012 contiene vs tienen -> mismo concept_query
013 contiene vs tienen -> mismo result set fixture
014 contiene vs tienen -> mismo count fixture

015 enero contiene motor -> motor
016 enero tienen la palabra motor -> motor
017 motor result parity

018 rango contiene aceite -> 2026-01..2026-08
019 rango tienen palabra aceite -> 2026-01..2026-08
020 rango concept parity
021 rango result parity

022 tiene la palabra aceite soportado
023 tienen la palabra aceite soportado
024 que tiene la palabra aceite soportado
025 que tienen la palabra aceite soportado
026 que tenga la palabra aceite soportado
027 que tengan la palabra aceite sigue soportado

028 tienen estatus PAGADO no activa keyword por "tienen"
029 tienen responsable no activa keyword por "tienen"
030 no detector abierto de tener

031 matcher unchanged
032 ALL_PUBLIC_FOLIOS unchanged
033 mes_cargo unchanged
034 display limit unchanged
035 match_count-before-limit unchanged
036 CANCELADO list unchanged

037 aggregate explícito existente PASS
038 folio_search_spec con "tienen" guarda aceite
039 aggregation follow-up PASS
040 fresh-chat follow-up sigue fail-close
041 cross-plant continuity unchanged

042 keyword-range suite PASS
043 aggregation-followup suite PASS
044 truthful folio-search suite PASS
045 M2 folio status/history/documents PASS
046 IGF reviewable PASS
047 conversation-state PASS
048 Tier 1/applicable gate PASS

049 planner unchanged
050 chat unchanged
051 conversation-state code unchanged
052 server unchanged
053 frontend unchanged
054 SQL unchanged
055 schema unchanged
056 tool unchanged
057 endpoint unchanged
058 LIVE_DB NO

059 diff --check PASS
060 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

FIX_FILE:
FIX_FUNCTIONS:
PARSER_CHANGE:

BEFORE_TIENEN_CONCEPT:
AFTER_TIENEN_CONCEPT:

CONTIENEN_OPERATION:
TIENEN_OPERATION:

FEBRUARY_CONTAINS_TERM:
FEBRUARY_HAS_TERM:
FEBRUARY_PERIOD_PARITY:
FEBRUARY_RESULT_PARITY:

JANUARY_MOTOR_CONTAINS_TERM:
JANUARY_MOTOR_HAS_TERM:
JANUARY_RESULT_PARITY:

RANGE_CONTAINS_TERM:
RANGE_HAS_TERM:
RANGE_PERIOD_PARITY:
RANGE_RESULT_PARITY:

SUPPORTED_HAVE_VARIANTS:

NON_KEYWORD_HAVE_STATUS:
NON_KEYWORD_HAVE_RESPONSIBLE:

MATCHER_CHANGED:
SQL_CHANGED:
PLANNER_CHANGED:
CHAT_CHANGED:
CONVERSATION_STATE_CHANGED:
SERVER_CHANGED:
FRONTEND_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
LIVE_DB_USED:

AGGREGATION_FOLLOWUP_REGRESSION:
FOLIO_SEARCH_SPEC_REGRESSION:

001..060:
SUITES:
FILES:
RISKS:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit implementación.

Crear reporte append-only:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-TIENEN-PALABRA-PARITY-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
