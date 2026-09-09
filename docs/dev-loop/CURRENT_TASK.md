task_id: AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001

task_type: AUDIT
mode: READ_ONLY

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-09T09:34:40-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN. Auditar físicamente cómo reutilizar la búsqueda textual existente del dashboard de Folios dentro de Director IA, agregando una ventana explícita de mes_cargo. SOLO AUDITORÍA. Sin implementación. Sin SQL nuevo. Sin LIVE_DB. Sin merge. Sin deploy."

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 4fe5ab54c8bd25fb518f3acc22357e59074cb964
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001.md

## Objetivo único

Determinar el slice mínimo y físicamente defendible para que Director IA pueda responder:

¿Qué folios de enero a agosto contienen la palabra aceite?

y su forma parametrizada:

¿Qué folios de enero a agosto contienen la palabra XXXXX?

Debe investigarse si la capacidad puede construirse reutilizando:

1. el universo/rango existente de Folios en Director IA;
2. la semántica de búsqueda textual existente del dashboard;
3. datos ya disponibles en public.folios;

sin crear SQL nuevo si físicamente no es necesario.

NO implementar.

## Semántica humana objetivo

Pregunta:

¿Qué folios de enero a agosto contienen la palabra aceite?

Interpretación deseada:

planta = planta seleccionada
universo = ALL_PUBLIC_FOLIOS
period_start = 2026-01
period_end = 2026-08
period_field = mes_cargo
search_term = aceite
operation = keyword_search
output = folios encontrados

## Regla de universo

Si el usuario dice:

"folios"

usar conceptualmente:

ALL_PUBLIC_FOLIOS

NO restringir automáticamente a:

GASTOS
INVERSIONES
TALLER
apoyos

salvo que la pregunta lo pida expresamente.

## Regla temporal

"enero a agosto"

significa:

mes_cargo >= 2026-01
mes_cargo <= 2026-08

inclusive.

NO usar:

fecha_creacion
fecha_aprobacion
ventana reciente
trailing days

como sustitutos.

No inventar mes para folios cuyo mes_cargo sea nulo.

## Regla textual

La intención es:

"como el buscador que ya existe en el dashboard"

Auditar exactamente la implementación física actual:

frontend-dashboard/app/dashboard/page.tsx
frontend-dashboard/components/FiltersBar.tsx
frontend-dashboard/components/KanbanBoard.tsx
frontend-dashboard/lib/texto-busqueda.ts

Determinar:

- campos buscados;
- normalización;
- acentos;
- mayúsculas/minúsculas;
- puntuación;
- substring;
- tokens;
- stopwords;
- umbral de coincidencia;
- importe;
- cheque;
- proyecto;
- categoría;
- subcategoría;
- beneficiario;
- descripción;
- número/código de folio.

NO asumir que "contiene palabra" = SQL ILIKE.

Probar la semántica real.

## Distinción obligatoria

Separar explícitamente:

A. TEXT_MATCH_PARITY
   Cómo decide el buscador si un folio coincide con XXXXX.

B. DATA_WINDOW
   Qué folios fueron cargados antes de aplicar esa búsqueda.

El buscador del frontend puede estar filtrando únicamente cards
ya devueltas por fetchKanban.

Probarlo.

NO confundir:

"mismo algoritmo de texto"

con:

"mismos filtros actuales de la UI".

## Solo activos

El dashboard visual puede tener:

Solo activos = checked

Eso NO significa automáticamente que Director IA deba excluir
folios cerrados, pagados o cancelados.

Auditar la semántica actual del universo genérico de Folios.

Objetivo deseado:

"qué folios..."
→ buscar todos los folios del universo autorizado en el rango

salvo que el usuario diga:

"activos"
"pendientes"
"cancelados"
etc.

Determinar si esto puede respetarse con la capacidad física actual.

## Rutas a inspeccionar

Trazar físicamente:

### Dashboard

FiltersBar
→ searchTerm
→ Dashboard page
→ KanbanBoard
→ matchesSearch
→ textMatchesSearch

y además:

fetchKanban
→ endpoint backend
→ filtros de ventana/mes/planta/activo
→ consulta física a public.folios

### Director IA

POST /api/director-ia/chat
→ askDirectorIa
→ planner/routing
→ folio intent
→ parser de rango mensual
→ tool/orchestrator
→ query/helper físico de Folios
→ public.folios
→ proyección de respuesta

Encontrar el primer punto donde hoy:

¿Qué folios de enero a agosto contienen la palabra aceite?

deja de poder resolverse.

## Capacidad Folios existente

Auditar reutilización de las capacidades ya implementadas para:

- generic folio search;
- concepto;
- rango SINGLE/RANGE;
- ALL_PUBLIC_FOLIOS;
- mes_cargo;
- agregación/listado;
- planta.

Determinar si ya existe una función que:

1. recupere el universo Jan–Aug;
2. traiga los campos necesarios para search parity;
3. permita aplicar el matcher en memoria;
4. preserve autorización por planta.

## SQL

Objetivo preferente:

CAN_FIX_WITHOUT_NEW_SQL = YES

pero NO asumirlo.

Probar físicamente si la consulta existente trae todos los campos
necesarios.

Si falta un campo:

documentar exactamente cuál.

NO escribir SQL.
NO modificar SQL.

## Search term

Para este slice:

"aceite"

significa buscar "aceite" usando la semántica textual auditada.

NO expandir automáticamente a:

lubricante
aceite de motor
aceite hidráulico
filtros
refacciones

No usar embeddings ni sinónimos inventados.

## Frases North Star

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

## No confundir con

"¿En qué mes se apoyó para aceite?"

Ese caso solicita descubrir el mes y queda como capacidad relacionada,
pero NO es el North Star de este slice.

"aceite de motor o filtros de aire"

requiere OR/refinamiento conversacional y NO debe implementarse
en esta auditoría.

Documentar readiness solamente.

## Resultado esperado futuro

Si hay coincidencias:

Encontré N folios de enero a agosto de 2026 que coinciden con "aceite"
en Acapulco.

F-XXXX
Mes de cargo: enero 2026
Categoría: TALLER
Descripción: ...
Beneficiario: ...
Importe registrado: $...

...

Semántica obligatoria del importe:

"importe registrado en el folio"

NO:

"gasto contable pagado"

salvo evidencia adicional.

## Truncación

Auditar:

- total real de matches antes del límite;
- límite actual de listado;
- si el query físico trunca antes del text match.

Esto es crítico.

No aceptar una implementación futura donde:

SQL/list cap
→ luego keyword search

si eso puede ocultar coincidencias.

Debe poder distinguir:

TOTAL_MATCHES
LIST_SHOWN

## Ausencia

Si no existe coincidencia:

"No encontré folios que coincidan con 'XXXXX' en el rango indicado."

NO inventar folios.
NO convertir ausencia en importe cero.
NO buscar Action Register.

## Autorización y planta

Probar:

- planta seleccionada;
- IDs equivalentes si aplican;
- roles/permisos actuales;
- no cruce de planta.

No modificar autorización.

## Evidencia de auditoría obligatoria

Entregar exactamente:

AUDIT_RESULT:

DASHBOARD_SEARCH_IS_CLIENT_SIDE:
DASHBOARD_SEARCH_DATASET:
DASHBOARD_SEARCH_FIELDS:
DASHBOARD_SEARCH_NORMALIZER:
DASHBOARD_SEARCH_MATCH_RULE:
DASHBOARD_SEARCH_USES_SQL_SEARCH:

FETCH_KANBAN_FUNCTION:
FETCH_KANBAN_ENDPOINT:
FETCH_KANBAN_WINDOW_FILTER:
FETCH_KANBAN_MONTH_FILTER:
FETCH_KANBAN_PLANT_FILTER:
FETCH_KANBAN_ACTIVE_FILTER:

DIRECTOR_S1_INTENT:
DIRECTOR_S1_ROUTE:
DIRECTOR_S1_PERIOD:
DIRECTOR_S1_UNIVERSE:
DIRECTOR_S1_FIRST_DIVERGENCE:

DIRECTOR_GENERIC_FOLIO_QUERY_FUNCTION:
DIRECTOR_GENERIC_FOLIO_SOURCE:
DIRECTOR_GENERIC_FOLIO_FIELDS:
DIRECTOR_RANGE_SUPPORT:
DIRECTOR_RANGE_MAX_MONTHS:
DIRECTOR_QUERY_PRE_TRUNCATES:
DIRECTOR_LIST_POST_TRUNCATES:

TEXT_MATCH_PARITY_REUSABLE:
FULL_RANGE_DATASET_AVAILABLE:
ALL_REQUIRED_SEARCH_FIELDS_AVAILABLE:
PLANT_AUTH_PRESERVED:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

RECOMMENDED_MATCH_LAYER:
RECOMMENDED_RANGE_LAYER:
RECOMMENDED_OUTPUT_LAYER:

ACTIVE_ONLY_SHOULD_BE_INHERITED:
CANCELLED_FOLIOS_SEMANTICS:

TOTAL_BEFORE_TRUNCATION_POSSIBLE:

S1_SUPPORTED_TODAY:
S2_SUPPORTED_TODAY:
S3_SUPPORTED_TODAY:
S4_SUPPORTED_TODAY:
S5_SUPPORTED_TODAY:
S6_SUPPORTED_TODAY:

OR_QUERY_READY:
CONVERSATIONAL_REFINEMENT_READY:
MONTH_DISCOVERY_READY:

PARSER_BUG:
ROUTING_BUG:
RANGE_BUG:
SEARCH_PARITY_GAP:
SOURCE_BUG:
DATA_BUG:
PRESENTATION_BUG:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Restricciones

SOLO READ-ONLY.

NO implementación.
NO cambios de comportamiento.
NO SQL.
NO migraciones.
NO schema.
NO dependencies.
NO LIVE_DB.
NO Render.
NO deploy.
NO merge.
NO push main.
NO siguiente tarea.

Puede ejecutar:

- tests existentes;
- probes con stubs/fixtures;
- inspección estática;
- git grep;
- lectura de handlers;
- trazas read-only sin DB live.

## Completion

Si la auditoría termina:

CURRENT_TASK -> DONE_PENDING_REVIEW

Cambiar únicamente status según protocolo.

Crear reporte append-only:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001.md

Crear commit de auditoría.

STOP.

No siguiente tarea.
