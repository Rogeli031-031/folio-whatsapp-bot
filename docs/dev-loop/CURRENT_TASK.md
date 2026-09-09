task_id: FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-09T11:01:03-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-09"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: c2b362877e70a6cfd3797cd755ff45ded1186a1e
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md

objective: "Implementar búsqueda textual de Folios por keyword dentro de un rango explícito de mes_cargo, con paridad funcional con el buscador existente del Kanban."

## Decisión humana G7

Se resuelve explícitamente el bloqueo del FIX 001.

AUTORIZADO:

Reutilizar EXACTAMENTE el LEFT JOIN a public.proyectos que ya existe
en el handler físico del Kanban.

El implementador debe:

1. localizar el JOIN existente del Kanban;
2. reutilizar exactamente su relación física;
3. reutilizar exactamente las columnas físicas que ya alimentan:
   proyecto_codigo
   proyecto_nombre

NO diseñar otro JOIN.

Si no puede demostrar paridad con el JOIN existente:

STOP.

## SQL autorizado — alcance estricto

En queryReviewableSupportFolios se permite únicamente:

- agregar numero_cheque desde public.folios;
- agregar proyecto_codigo;
- agregar proyecto_nombre;
- agregar UN LEFT JOIN a public.proyectos;
- ese LEFT JOIN debe ser equivalente al ya usado por Kanban.

NO se autoriza:

- ILIKE
- LIKE para keyword search
- predicado textual SQL
- otro JOIN
- CTE
- subquery nueva
- tabla nueva
- schema
- migración
- vista
- función SQL
- cambio de filtros de planta
- cambio de mes_cargo
- LIMIT previo al match

La búsqueda textual sigue ocurriendo EN MEMORIA.

## North Star

¿Qué folios de enero a agosto contienen la palabra aceite?

Debe resolver:

intent = folio_search
universe = ALL_PUBLIC_FOLIOS
period = 2026-01..2026-08 inclusive
period_field = mes_cargo
search_term = aceite
operation = keyword_search

## Extractor

ANTES:

concept_query = "contienen palabra aceite"

DESPUÉS:

search_term = "aceite"

Reconocer:

contienen la palabra XXXXX
contienen XXXXX
con XXXXX
que tengan XXXXX
donde aparezca XXXXX

sin incorporar el wrapper al search_term.

## Variantes

S1:
¿Qué folios de enero a agosto contienen la palabra aceite?

S2:
¿Qué folios de enero a agosto contienen aceite?

S3:
Busca los folios de enero a agosto con aceite.

S4:
¿Qué folios tenemos de aceite entre enero y agosto?

S5:
¿Qué folios de enero a hoy contienen aceite?

S6:
¿Qué folios de marzo contienen aceite?

S7:
¿Qué folios de enero a agosto contienen la palabra XXXXX?

## Periodos

de enero a agosto
=> 2026-01..2026-08 inclusive

entre enero y agosto
=> 2026-01..2026-08 inclusive

de enero a hoy
=> enero hasta MES ACTUAL inclusive

Con now=2026-09-09:

de enero a hoy
=> 2026-01..2026-09

Siempre usar:

mes_cargo

NO:

fecha_creacion
fecha_aprobacion
ventana reciente
trailing days

Máximo:
12 meses.

## Universo

"folios"
=> ALL_PUBLIC_FOLIOS

No heredar:
solo_activos=1

LIST:
CANCELADO puede aparecer si coincide.

AGGREGATE:
preservar exclusión actual de CANCELADO.

## Paridad textual

Normalización:

- Unicode NFD
- eliminar acentos
- lowercase
- puntuación a espacio
- colapsar whitespace
- trim

Stopwords:

a
al
con
de
del
en
para
por
y
e
o
el
la
los
las
un
una
que
su
se

Token significativo:
length > 1

MATCH:

1. substring normalizado

OR

2. si query y field tienen >= 2 tokens significativos:
   hits/query_tokens >= 0.85

Para una palabra:

aceite

usar substring normalizado.

NO:

ILIKE
embeddings
sinónimos
OpenAI
fuzzy LLM

## Campos de búsqueda

Aplicar matcher sobre:

numero_folio
folio_codigo
descripcion/concepto
beneficiario
categoria
subcategoria
proyecto_codigo
proyecto_nombre
planta_nombre
numero_cheque
importe

Importe:

formato equivalente a es-MX,
0 decimales,
solo para matching textual.

## Arquitectura

question
-> folio_search
-> parser keyword/range
-> query mensual completo por mes_cargo/planta
-> LEFT JOIN proyecto ya conocido
-> matcher textual en memoria
-> TOTAL_MATCHES
-> orden/proyección
-> LIST_SHOWN

Nunca:

LIMIT
-> matcher

## Truncación

TOTAL_MATCHES antes del límite.

Si:

TOTAL_MATCHES > LIST_SHOWN

declarar ambos.

Ejemplo:

Encontré 55 folios.
Muestro los primeros 40.

## Respuesta

Ejemplo defendible:

Encontré 7 folios de enero a agosto de 2026 que coinciden con "aceite" en Acapulco.

F-XXXX
Mes de cargo: enero 2026
Categoría: TALLER
Descripción: ACEITE DE MOTOR...
Beneficiario: ...
Importe registrado en el folio: 8,450 MXN
Estatus: ...

NO decir:

gastamos
gasto pagado
erogado
costo contable

## Ausencia

Si no hay coincidencias:

No encontré folios que coincidan con "XXXXX" en el rango indicado.

No inventar.

No reportar importe cero.

No Action Register.

## No implementar todavía

Fuera de este slice:

- "aceite de motor o filtros de aire" como OR conversacional
- follow-up "¿y filtros?"
- "¿en qué mes se apoyó?"
- month discovery
- continuidad conversacional
- embeddings
- sinónimos

## Preservar

- exact F-ID priority
- folio_status
- folio_history
- folio_documents
- support universe
- concept_mode ANY
- aggregates
- autorización por planta
- max 12 meses
- CANCELADO aggregate semantics
- otros intents

## Regresiones obligatorias

001 BEFORE S1 wrapper incorrecto
002 AFTER S1 search_term aceite
003 intent folio_search
004 ALL_PUBLIC_FOLIOS
005 Jan-Aug inclusive
006 mes_cargo
007 no fecha_creacion
008 no active-only
009 CANCELADO puede listarse
010 S2 keyword aceite
011 S3 keyword aceite
012 S4 entre Jan-Aug
013 S5 Jan-Sep con now
014 S6 marzo SINGLE
015 between range
016 to-today range
017 max 12 months

018 accent normalization
019 lowercase
020 punctuation
021 whitespace
022 substring
023 single-word substring
024 multi-token 85 percent
025 stopwords

026 numero_folio
027 folio_codigo
028 descripcion/concepto
029 beneficiario
030 categoria
031 subcategoria
032 proyecto_codigo
033 proyecto_nombre
034 planta_nombre
035 numero_cheque
036 importe

037 no ILIKE
038 no SQL text predicate
039 no embeddings
040 no synonyms
041 no OpenAI match
042 no pre-limit
043 total before truncation
044 list limit preserves total
045 total/shown wording
046 importe registrado wording
047 zero truthful
048 zero no monetary amount

049 plant auth
050 no cross-plant

051 exact F-ID PASS
052 support universe PASS
053 aggregate PASS
054 CANCELADO aggregate PASS
055 folio status PASS
056 previous range tests PASS
057 planner focal PASS
058 tool/orchestrator focal PASS
059 Tier1 PASS
060 pre-deploy --gate PASS
061 NEW FAILURE = 0

## Evidencia obligatoria del JOIN

Entregar:

KANBAN_PROJECT_JOIN_FILE:
KANBAN_PROJECT_JOIN_SIGNATURE:
FOLIO_SEARCH_PROJECT_JOIN_SIGNATURE:
JOIN_PARITY_CONFIRMED:
EXTRA_JOIN_ADDED:

JOIN_PARITY_CONFIRMED debe ser YES.

EXTRA_JOIN_ADDED debe ser NO.

## Flags

PARSER_CHANGED:
MATCHER_CHANGED:
FOLIO_QUERY_SELECT_CHANGED:
PROJECT_JOIN_ADDED:
PROJECT_JOIN_PARITY_WITH_KANBAN:
SQL_TEXT_PREDICATE_ADDED:
SCHEMA_CHANGED:
DEPS_CHANGED:
FRONTEND_CHANGED:
SERVER_CHANGED:
PLANNER_CHANGED:
OPENAI_MATCH_USED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Commit implementation.

Reporte append-only.

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
