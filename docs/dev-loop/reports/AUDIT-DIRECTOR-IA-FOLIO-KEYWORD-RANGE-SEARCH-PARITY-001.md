# AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001"
outcome: "DONE"
mode: "READ_ONLY"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "4fe5ab54c8bd25fb518f3acc22357e59074cb964"
head_sha_at_start: "75e038ee4f5e48be99ecc05d73514b40a686f2bc"
branch: "audit/director-ia-folio-keyword-range-search-parity-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No implementación en esta tarea. El FIX propuesto no está autorizado. Decidir si paridad de cheque/proyecto exige SQL. Decidir si «enero a hoy» = mes_cargo 2026-01..mes actual inclusive. Confirmar que CANCELADO entra en LIST salvo que el usuario lo excluya."
```

## Hallazgo

La pregunta North Star **sí entra** a `folio_search` con universo `ALL_PUBLIC_FOLIOS` y rango `mes_cargo` 2026-01..2026-08. El query mensual existente **no trunca** antes del match.

El primer fallo funcional es el **extractor de concepto**: wrappers (`contienen la palabra`, `contienen`, `busca … con`) quedan dentro de `concept_query`. El matcher vigente exige **secuencia de tokens** solo en `concepto` y `subcategoria`. No es el buscador del dashboard.

El buscador visual es **100% cliente**. Filtra cards ya cargadas por `fetchKanban`. Esa ventana **no** es enero–agosto. No se puede copiar el dataset del Kanban para resolver S1.

TEXT_MATCH_PARITY y DATA_WINDOW son capas distintas. La ruta reutilizable es: query mensual existente + matcher en memoria. SQL nuevo no es necesario para el keyword en columnas ya seleccionadas.

---

AUDIT_RESULT:

DASHBOARD_SEARCH_IS_CLIENT_SIDE:
YES

DASHBOARD_SEARCH_DATASET:
Cards ya devueltas por GET /api/dashboard/kanban (estado local `kanban` en page.tsx). `searchTerm` no viaja al fetch. Default UI: `solo_activos=1`, `ventana=1`. Con now=2026-09 eso es mes_cargo agosto **o** ≥ septiembre **o** extras, **o** `creado_en` en esos meses. Enero–julio 2026 por `mes_cargo` no están en el dataset visual default.

DASHBOARD_SEARCH_FIELDS:
OR sobre: `numero_folio`, `folio_codigo`, `descripcion`, `beneficiario`, `categoria`, `subcategoria`, `proyecto_codigo`, `proyecto_nombre`, `planta_nombre`, `numero_cheque`, `importe` formateado `toLocaleString("es-MX", { maximumFractionDigits: 0 })`. KanbanBoard.matchesSearch L51–72. Misma función local en PlantaSection.tsx y PlantTable.tsx.

DASHBOARD_SEARCH_NORMALIZER:
`normalizeForSearch` (`frontend-dashboard/lib/texto-busqueda.ts`): NFD, quita diacríticos, lowercase, puntuación → espacio (`[^a-z0-9\\s]+`), colapsa whitespace. Stopwords: a al con de del en para por y e o el la los las un una que su se. Tokens significativos: length > 1 y no stopword.

DASHBOARD_SEARCH_MATCH_RULE:
`textMatchesSearch`: (1) haystack normalizado `includes` needle normalizado (substring); (2) si ambos tienen ≥2 tokens significativos: ≥85% de tokens del query presentes en el haystack (set, sin orden). Una sola palabra (`aceite`) usa solo (1). `aceitera` coincide por substring. No ILIKE. No embeddings. No sinónimos.

DASHBOARD_SEARCH_USES_SQL_SEARCH:
NO

FETCH_KANBAN_FUNCTION:
`fetchKanban` (`frontend-dashboard/lib/api.ts` ~1058)

FETCH_KANBAN_ENDPOINT:
GET /api/dashboard/kanban (`server.js` ~5400)

FETCH_KANBAN_WINDOW_FILTER:
`ventana=1` (default) → `buildDashboardWhere` (`lib/director-ia-m3-plantas-kpis-proyectos.js` ~250): mes_cargo = mes anterior OR mes_cargo ≥ mes actual OR meses_extra, OR `to_char(creado_en AT TIME ZONE America/Mexico_City,'YYYY-MM')` en {mesAnterior, mesActual, extras}. Mezcla mes_cargo y fecha_creacion. No es 2026-01..2026-08.

FETCH_KANBAN_MONTH_FILTER:
Opcional `filters.mes` (YYYY-MM) sustituye la ventana. El buscador no lo fija a Jan–Aug. `meses_extra` amplía, no cubre el rango North Star por default.

FETCH_KANBAN_PLANT_FILTER:
`filters.plantas` → `planta_id` query param → IDs equivalentes en `buildDashboardWhere`. Auth de rol/plantas_permitidas y `solo_zp_ad` también en el WHERE.

FETCH_KANBAN_ACTIVE_FILTER:
Default `solo_activos=1` → `estatus NOT IN ('CERRADO','CANCELADO')`. Es filtro de DATA_WINDOW, no del matcher de texto.

DIRECTOR_S1_INTENT:
folio_search
(reason folio_search, confidence 0.88)
isFolioSearchQuestion=true

DIRECTOR_S1_ROUTE:
POST /api/director-ia/chat
→ server.js handlePostChat
→ askDirectorIa
→ planDirectorIaQuestion intent=folio_search
→ loadFolioSearchForChat
→ queryReviewableSupportFolios × cada mes_cargo del rango
→ rowMatchesConcept / phraseMatchesRow
→ buildFolioSearchAnswer
Determinista. OpenAI no elige matches.

DIRECTOR_S1_PERIOD:
RANGE 2026-01..2026-08 (probe now=2026-09-09). period_field físico = mes_cargo. Año implícito = now.getFullYear().

DIRECTOR_S1_UNIVERSE:
ALL_PUBLIC_FOLIOS
No GASTOS/INVERSIONES/TALLER. No recorte IGF. SQL sin filtro de estatus.

DIRECTOR_S1_FIRST_DIVERGENCE:
PARSER de concepto en `extractFolioSearchFilters` / `extractConceptModel` (`lib/director-ia-folio-search.js`).
Tras retirar el span `de enero a agosto`, el remainder deja `concept_query="contienen palabra aceite"`.
A partir de ahí el match de secuencia no puede hallar un folio cuyo concepto sea `ACEITE MOTOR`.
Routing, rango Jan–Aug, universo y fetch mensual ya son correctos para S1.
Segundo gap (aunque el extractor se limpie): SEARCH_PARITY — matcher ≠ `textMatchesSearch` y no busca beneficiario/número/importe/categoría.

DIRECTOR_GENERIC_FOLIO_QUERY_FUNCTION:
`queryReviewableSupportFolios` (`lib/director-ia-igf-reviewable-supports.js` ~451)
Loader: `loadFolioSearchForChat` (`lib/director-ia-folio-search.js` ~850)

DIRECTOR_GENERIC_FOLIO_SOURCE:
public.folios f
LEFT JOIN public.plantas p
WHERE f.mes_cargo = $1 AND f.planta_id = ANY($2::int[])
ORDER BY f.importe DESC NULLS LAST, f.id
Sin LIMIT. Sin predicado de texto. Sin filtro de estatus.

DIRECTOR_GENERIC_FOLIO_FIELDS:
id, numero_folio, folio_codigo, planta_id, mes_cargo, importe, estatus, categoria, subcategoria,
concepto = COALESCE(NULLIF(TRIM(descripcion),''), NULLIF(TRIM(concepto),''), ''),
beneficiario, solo_zp_ad, planta_nombre
Faltan para paridad de card: numero_cheque, proyecto_codigo, proyecto_nombre.

DIRECTOR_RANGE_SUPPORT:
YES para `de X a Y` / `desde X hasta Y` / `X a Y` / `X-Y`. Cap 12 meses. Fail-closed invertido y range_too_long.
NO para `entre X y Y`. NO para `X a hoy`.

DIRECTOR_RANGE_MAX_MONTHS:
12 (`MAX_RANGE_MONTHS`)

DIRECTOR_QUERY_PRE_TRUNCATES:
NO

DIRECTOR_LIST_POST_TRUNCATES:
YES. RECORD_LIMIT=40 tras match+dedup. Answer muestra records.slice(0, 16). count/match_count = total pre-slice.

TEXT_MATCH_PARITY_REUSABLE:
PARTIAL
Algoritmo existe solo en TypeScript de frontend (`texto-busqueda.ts`). Node no lo importa. Se puede portar a memoria sobre columnas ya traídas. No es reutilizable como llamada al Kanban ni como SQL ILIKE.

FULL_RANGE_DATASET_AVAILABLE:
YES
`enumerateInclusiveMonths` + una query por mes. S1 ya pide 2026-01..2026-08. No hay cap SQL por mes.

ALL_REQUIRED_SEARCH_FIELDS_AVAILABLE:
NO
Presentes: numero_folio, folio_codigo, concepto/descripcion coalescida, beneficiario, categoria, subcategoria, planta_nombre, importe.
Ausentes en el SELECT de folio_search: numero_cheque, proyecto_codigo, proyecto_nombre.
Suficientes para el North Star `aceite` en descripción/concepto/beneficiario. Insuficientes para paridad total de card.

PLANT_AUTH_PRESERVED:
YES
`assertFolioStatusAccess` + IDs equivalentes + filtro `solo_zp_ad` según permiso. No cruce de planta. No se tocó autorización.

CAN_FIX_WITHOUT_NEW_SQL:
YES
para keyword sobre columnas ya seleccionadas (portar matcher + limpiar wrappers + completar conectores de rango).
NO si el humano exige paridad de cheque/proyecto (haría falta ampliar el SELECT/JOIN; hoy no escrito).

CAN_FIX_WITHOUT_SERVER_CHANGE:
NO
Extractor, matcher, loader y answer viven en `lib/director-ia-folio-search.js` (backend del chat).

CAN_FIX_WITHOUT_FRONTEND_CHANGE:
YES
No hace falta cambiar FiltersBar, Kanban ni `texto-busqueda.ts`. Copiar el algoritmo al loader, no invocarlo desde el dashboard.

RECOMMENDED_MATCH_LAYER:
In-memory, post-fetch, en `rowMatchesConcept` / `loadFolioSearchForChat`. Portar `normalizeForSearch` + `textMatchesSearch` sobre haystack concatenado o OR de campos ya presentes. No ILIKE. No embeddings. No catálogo de sinónimos.

RECOMMENDED_RANGE_LAYER:
Reusar `extractPeriodRange` + `enumerateInclusiveMonths` + query mensual existente.
Añadir conector `entre X y Y`. Decidir humanamente `enero a hoy` → 2026-01..mes_cargo actual inclusive (now). No fecha_creacion. No trailing days.

RECOMMENDED_OUTPUT_LAYER:
`buildFolioSearchAnswer` LIST vigente. Conservar count/match_count antes del slice 40/16. Ajustar wording al template deseado («coinciden con "aceite"», «importe registrado»). Ausencia: no inventar, no Action Register, no importe cero.

ACTIVE_ONLY_SHOULD_BE_INHERITED:
NO
«qué folios» = universo autorizado del rango. No heredar Solo activos de la UI.

CANCELLED_FOLIOS_SEMANTICS:
LIST actual **incluye** CANCELADO (probe: F-2 CANCELADO «CAMBIO DE ACEITE» entra). AGGREGATE excluye CANCELADO del importe. Decisión física necesaria: LIST debe incluir CANCELADO/CERRADO/PAGADO salvo que el usuario pida «activos» / «pendientes» / «cancelados». No copiar el checkbox del dashboard.

TOTAL_BEFORE_TRUNCATION_POSSIBLE:
YES
Match sobre el universo mensual completo; `count`/`match_count` = tamaño del match; `truncated` si count > 40; UI lista 16. No buscar después de recortar 10/20.

S1_SUPPORTED_TODAY:
NO
Ruta/rango/universo OK. concept_query=`contienen palabra aceite` → 0 matches (stub ACEITE MOTOR / CAMBIO DE ACEITE).

S2_SUPPORTED_TODAY:
NO
concept_query=`contienen aceite`

S3_SUPPORTED_TODAY:
NO
concept_query=`busca con aceite` (`busca` no está en REQUEST_WRAPPER_RE)

S4_SUPPORTED_TODAY:
NO
period_mode=SINGLE period_month=2026-01. concept_query=`aceite entre`. Conector `entre X y Y` no existe.

S5_SUPPORTED_TODAY:
NO
period_mode=SINGLE period_month=2026-01. concept_query=`a hoy contienen aceite`. `hoy` no es mes.

S6_SUPPORTED_TODAY:
NO
Periodo marzo 2026 OK. concept_query=`contienen aceite` → mismo fallo de wrapper. Una phrasing limpia (`folios de aceite de marzo`) sí matchearía hoy.

OR_QUERY_READY:
PARTIAL
`concept_mode=ANY` existe (`split(" o ")`). Una frase suelta sin `folios`+periodo no entra a folio_search (probe: intent=unknown, concept colapsa a `aire` por last `de`). No implementar OR conversacional en el próximo slice.

CONVERSATIONAL_REFINEMENT_READY:
NO

MONTH_DISCOVERY_READY:
NO
«¿En qué mes se apoyó para aceite?» → folio_search, scope=SUPPORT_FAMILIES, period_month=null, concept_query=`se aceite` → `missing_period`. No es el North Star.

PARSER_BUG:
YES
Wrappers de búsqueda y leftovers de conectores no temporales quedan en `concept_query`.

ROUTING_BUG:
NO
S1–S6 (y S7) van a folio_search / ALL_PUBLIC_FOLIOS.

RANGE_BUG:
YES
para S4 (`entre`) y S5 (`a hoy`). NO para S1–S3 (`de X a Y` ya resuelve 2026-01..2026-08).

SEARCH_PARITY_GAP:
YES
Matcher = secuencia de tokens + plural controlado en concepto/subcategoria. Dashboard = substring normalizado OR 85% tokens en 11 campos. Beneficiario «ACEITERA DEL SUR» no matchea en Director (probe F-3).

SOURCE_BUG:
NO
Fuente = public.folios por mes_cargo + planta. Sin LIMIT. ALL_PUBLIC_FOLIOS.

DATA_BUG:
NO
No LIVE_DB. El SELECT mensual es el universo correcto. El Kanban no es la fuente de Director IA.

PRESENTATION_BUG:
YES
Template deseado («N folios de enero a agosto de 2026 que coinciden con "aceite"», «Importe registrado») no es el texto actual (`Encontré N folios en {planta}. Filtros: …`). Ausencia actual: «No encontré folios con esos filtros.» Lista 16 de 40. Secundario al parser/matcher.

FILES_INSPECTED:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/CURRENT_TASK.md
- frontend-dashboard/app/dashboard/page.tsx
- frontend-dashboard/components/FiltersBar.tsx
- frontend-dashboard/components/KanbanBoard.tsx
- frontend-dashboard/components/PlantaSection.tsx
- frontend-dashboard/components/PlantTable.tsx
- frontend-dashboard/lib/texto-busqueda.ts
- frontend-dashboard/lib/api.ts
- server.js (GET /api/dashboard/kanban, cardFromFolioRow)
- lib/director-ia-m3-plantas-kpis-proyectos.js (buildDashboardWhere)
- lib/director-ia-folio-search.js
- lib/director-ia-igf-reviewable-supports.js (queryReviewableSupportFolios)
- lib/director-ia-planner.js
- lib/director-ia-chat.js (ramo folio_search)
- lib/director-ia-m2-folio-status.js (assertFolioStatusAccess)

TESTS_RUN:
- Probe planner+filters, now=2026-09-09, stubs only: S1–S7, MONTH, OR. Resultados en Hallazgo / AUDIT_RESULT.
- Probe loadFolioSearchForChat inyectando queryPublicFolios (sin pool, sin LIVE_DB):
  S1 literal → count=0, period 2026-01..2026-08, concept=`contienen palabra aceite`.
  «folios de aceite de enero a agosto» → count=2, ids F-1 (PENDIENTE, ACEITE MOTOR), F-2 (CANCELADO, CAMBIO DE ACEITE). F-3 beneficiario ACEITERA DEL SUR no entra.
- Suites de producto no ejecutadas (READ_ONLY; no cambio de comportamiento).
- LIVE_DB: no.

RISKS:
- Portar matcher sin strip de wrappers deja S1/S2/S3/S6 en cero.
- Copiar la ventana o Solo activos del dashboard oculta Jan–Aug y cancelados.
- Convertir a ILIKE SQL pierde 85%/stopwords y tienta a truncar en SQL.
- Exigir cheque/proyecto abre SQL/JOIN fuera del mínimo.
- Cap 40/16 es de presentación; no debe aplicarse antes del match.
- «enero a hoy» sin decisión humana puede inventar fecha_creacion o MTD.

RECOMMENDED_NEXT_SLICE:
FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001
(1) Retirar wrappers `contienen (la) palabra`, `contienen`, `busca … con` antes del match.
(2) Reconocer `entre X y Y`. Resolver `enero a hoy` solo si el humano fija mes_cargo 2026-01..mes actual.
(3) Aplicar matcher tipo `textMatchesSearch` en memoria sobre campos ya traídos.
(4) No heredar solo_activos. LIST incluye cancelados salvo pedido explícito.
(5) Conservar TOTAL_MATCHES antes de LIST_SHOWN. Sin SQL. Sin embeddings. Sin OR conversacional. Sin month-discovery.
Cheque/proyecto = decisión humana aparte si se exige paridad total de card.

---

## Trazas

### Dashboard TEXT_MATCH

FiltersBar `searchTerm` / `onSearchTermChange`
→ page.tsx estado local (no entra a `filters`)
→ KanbanBoard / PlantaSection / PlantTable
→ matchesSearch
→ textMatchesSearch

### Dashboard DATA_WINDOW

page.tsx `filters = { solo_activos: "1", ventana: "1" }`
→ fetchKanban (sin searchTerm)
→ GET /api/dashboard/kanban
→ parseDashboardFilters + buildDashboardWhere
→ public.folios (+ JOIN plantas, proyectos)
→ cardFromFolioRow

### Director IA

question
→ planDirectorIaQuestion (`isFolioSearchQuestion`)
→ loadFolioSearchForChat
→ extractFolioSearchFilters (periodo + concepto)
→ queryReviewableSupportFolios × mes
→ public.folios
→ rowMatchesConcept
→ buildFolioSearchAnswer

### Probe de periodo/concepto (now=2026-09-09)

| ID | period | concept_query |
|---|---|---|
| S1 de enero a agosto + palabra aceite | RANGE 2026-01..2026-08 | contienen palabra aceite |
| S2 contienen aceite | RANGE 2026-01..2026-08 | contienen aceite |
| S3 Busca … con aceite | RANGE 2026-01..2026-08 | busca con aceite |
| S4 entre enero y agosto | SINGLE 2026-01 | aceite entre |
| S5 enero a hoy | SINGLE 2026-01 | a hoy contienen aceite |
| S6 de marzo | SINGLE 2026-03 | contienen aceite |
| S7 XXXXX | RANGE 2026-01..2026-08 | contienen palabra xxxxx |
| ¿En qué mes se apoyó para aceite? | SINGLE null / missing_period | se aceite (SUPPORT_FAMILIES) |

---

## No tocado

SQL, server, planner, chat, folios, frontend, schema, dependencies, LIVE_DB, merge, push main, deploy, siguiente tarea.
Solo se creó este reporte y se cambió `status` de CURRENT_TASK a DONE_PENDING_REVIEW.
