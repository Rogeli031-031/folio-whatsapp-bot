# FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: true
sql_text_predicate_added: false
live_db: false
base_main_sha: "c2b362877e70a6cfd3797cd755ff45ded1186a1e"
head_sha_at_start: "831cb7efccb3208f1dfe744a88aec92845a14ff3"
branch: "fix/director-ia-folio-keyword-range-search-parity-002"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-KEYWORD-OR-AND-MONTH-DISCOVERY-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. OR conversacional, follow-up «¿y filtros?» y month-discovery quedan fuera."
```

## Hallazgo implementado

S1 extrae `search_term=aceite` (ya no `contienen palabra aceite`). El rango Jan–Aug por `mes_cargo` y `ALL_PUBLIC_FOLIOS` se conservan. El matcher de keyword reproduce `texto-busqueda.ts` en memoria. El JOIN de proyecto es el mismo del Kanban.

Las preguntas relacionales (`fueron de gas`) siguen usando secuencia de tokens; así se preserva `gas != gasolina`.

---

KANBAN_PROJECT_JOIN_FILE:
server.js (GET /api/dashboard/kanban)

KANBAN_PROJECT_JOIN_SIGNATURE:
LEFT JOIN public.proyectos pr ON pr.id = f.proyecto_id
+ pr.codigo AS proyecto_codigo, pr.nombre AS proyecto_nombre
+ f.numero_cheque

FOLIO_SEARCH_PROJECT_JOIN_SIGNATURE:
LEFT JOIN public.proyectos pr ON pr.id = f.proyecto_id
+ pr.codigo AS proyecto_codigo, pr.nombre AS proyecto_nombre
+ f.numero_cheque
(en queryReviewableSupportFolios)

JOIN_PARITY_CONFIRMED:
YES

EXTRA_JOIN_ADDED:
NO

IMPLEMENTATION_SHA:
(pending commit; ver git log de esta rama)

BASE_MAIN_SHA:
c2b362877e70a6cfd3797cd755ff45ded1186a1e

BEFORE_SEARCH_TERM:
contienen palabra aceite

AFTER_SEARCH_TERM:
aceite

S1_INTENT:
folio_search

S1_UNIVERSE:
ALL_PUBLIC_FOLIOS

S1_PERIOD:
RANGE 2026-01..2026-08

S1_PERIOD_FIELD:
mes_cargo

S1_TOTAL_MATCH_BEFORE_LIMIT:
YES (count/match_count antes de slice 40)

MATCH_NORMALIZATION:
NFD, sin acentos, lowercase, puntuación→espacio, whitespace colapsado, trim

MATCH_RULE:
substring normalizado OR (≥2 tokens significativos y hits/query_tokens ≥ 0.85)

SEARCH_FIELDS:
numero_folio, folio_codigo, descripcion/concepto, beneficiario, categoria, subcategoria, proyecto_codigo, proyecto_nombre, planta_nombre, numero_cheque, importe (es-MX, 0 decimales)

BETWEEN_RANGE_SUPPORTED:
YES

TO_TODAY_SUPPORTED:
YES (now=2026-09-09 → 2026-01..2026-09)

CANCELLED_LIST_INCLUDED:
YES

ACTIVE_ONLY_INHERITED:
NO

QUERY_PRE_TRUNCATES:
NO

TOTAL_BEFORE_TRUNCATION:
YES

LIST_LIMIT:
40

001..061:
PASS

SUITES:
- test/director-ia-folio-keyword-range-search-parity.test.js PASS
- folio-search period/truthful/morphology/compositional/tail/locator/estan PASS
- IGF reviewable PASS
- M2 folio_status / history / documents PASS
- TIER 1 8/8 PASS
- pre-deploy --gate PASS
- NEW FAILURE = 0
- LIVE_DB: no

FILES:
- lib/director-ia-folio-search.js
- lib/director-ia-igf-reviewable-supports.js (SELECT + JOIN Kanban)
- test/director-ia-folio-keyword-range-search-parity.test.js
- docs/dev-loop/CURRENT_TASK.md (solo status)
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-KEYWORD-RANGE-SEARCH-PARITY-002.md

RISKS:
Keyword substring puede coincidir en beneficiario/proyecto (`ACEITERA`, `Patio Aceites`) aunque el concepto no diga aceite. Es paridad del dashboard. Las frases `fueron de X` conservan secuencia. IGF reviewable ahora trae columnas extra; no cambia WHERE ni LIMIT.

PARSER_CHANGED:
YES

MATCHER_CHANGED:
YES

FOLIO_QUERY_SELECT_CHANGED:
YES

PROJECT_JOIN_ADDED:
YES

PROJECT_JOIN_PARITY_WITH_KANBAN:
YES

SQL_TEXT_PREDICATE_ADDED:
NO

SCHEMA_CHANGED:
NO

DEPS_CHANGED:
NO

FRONTEND_CHANGED:
NO

SERVER_CHANGED:
NO

PLANNER_CHANGED:
NO

OPENAI_MATCH_USED:
NO

LIVE_DB_USED:
NO

---

## No implementado (fuera de slice)

- «aceite de motor o filtros de aire» como OR conversacional
- follow-up «¿y filtros?»
- «¿En qué mes se apoyó para aceite?»
- month discovery
- embeddings / sinónimos
