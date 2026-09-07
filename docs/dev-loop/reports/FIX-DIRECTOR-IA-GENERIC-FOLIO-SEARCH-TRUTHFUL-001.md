# FIX-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-TRUTHFUL-001

```yaml
task_id: "FIX-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-TRUTHFUL-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
igf_filter_reused: false
rejected_commit_reused: false
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
golden_tier1_expectations_changed: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No next task."
```

## 1. BEFORE (REGRESSION_FIRST)

En `093a8700` (main integrado):

- North Star `que apoyos/folios tenemos para septiembre de llantas?` → planner `unknown`.
- No existía `lib/director-ia-folio-search.js`.
- Suite R-FOLIO-TRUTH: rojo `Cannot find module '../lib/director-ia-folio-search'`.

No se reutilizó ni cherry-pickeó `7879bfc5a573f3a0ce7f1b1f685fce480215a71c` (REJECTED por `SOURCE_SCOPE_OVERCLAIM`).

## 2. AFTER

Intent `folio_search`. Scope por utterance:

| Texto | scope |
|---|---|
| folio/folios (con o sin apoyos) | `ALL_PUBLIC_FOLIOS` |
| apoyo/apoyos sin folio/folios | `SUPPORT_FAMILIES` |
| ambos (`apoyos/folios`) | `ALL_PUBLIC_FOLIOS` |

North Star:

- intent = `folio_search`
- scope = `ALL_PUBLIC_FOLIOS`
- `planta_id` = contexto UI
- `period_month` = septiembre del año de `deps.now`
- `concept_query` genérico
- no `category=GASTOS`
- no recorte silencioso a tres familias

## 3. Fuente

`ALL_PUBLIC_FOLIOS SOURCE`: `queryReviewableSupportFolios` exportada **sin alterar SQL**.

`FROM public.folios f` permanece exactamente una vez en `lib/director-ia-igf-reviewable-supports.js`.

El helper nuevo no contiene `SELECT`. No copia el SQL. Llama la función existente o `opts.queryPublicFolios`.

`SUPPORT_FAMILIES`: misma lectura ancha + filtro en memoria por `categoria` (TALLER / INVERSIONES / GASTOS). No tres SQL.

`IGF FILTER REUSED`: NO. No se llama `loadIgfReviewableSupportsForChat`, `categoryFeedsIgfSupportCalc` ni buckets reviewable.

Fixture DYO/COMISIONES: DYO aparece en ALL; no en SUPPORT. COMISIONES no coincide con el concepto North Star.

## 4. Wording

- ALL con resultados: `Encontré N folios...`
- ALL vacío (tras consultar el scope completo): `No encontré folios con esos filtros.`
- SUPPORT con resultados: declara `GASTOS, INVERSIONES y TALLER`
- SUPPORT vacío: `No encontré apoyos en GASTOS, INVERSIONES o TALLER con esos filtros.`

Sin mes: no inventa periodo; no dice empty “no encontré folios” si no consultó.

## 5. R-FOLIO-TRUTH-001..028

PASS (21 tests / 4 suites; cubren 001..028).

## 6. Suites

| Suite | Resultado |
|---|---|
| R-FOLIO-TRUTH | PASS |
| planner | 61/61 PASS |
| capabilities | 57/57 PASS |
| tool orchestrator | 27/28; 1 preexistente en `origin/main` (`dejaron de comprar` espera `get_commercial_state`; planner vigente es `commercial_trend`). NEW FAILURE = 0 |
| M2 / M4 / M5 / M6 / IGF / continuity | 132/132 PASS |
| TIER 1 | 8/8 PASS |
| PRE-DEPLOY `--gate` | PASS |
| HTTP 5xx | 0 |
| HARNESS | 0 |
| `git diff --check` | limpio |

## 7. Files

- `lib/director-ia-folio-search.js` (nuevo)
- `lib/director-ia-igf-reviewable-supports.js` (solo export)
- `lib/director-ia-planner.js`
- `lib/director-ia-capabilities.js`
- `lib/director-ia-tools.js`
- `lib/director-ia-chat.js`
- `test/director-ia-folio-search-truthful.test.js`
- `scripts/test-director-ia-planner.js` (casos + `;` → `,` preexistente que impedía parsear el array)
- `scripts/test-director-ia-capabilities.js`
- `scripts/test-director-ia-tool-orchestrator.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

No frontend. No LIVE_DB. No Action Register. No `docs/director-ia/`. No SQL nuevo.

## 8. Risks

- La query ancha exige un `mes_cargo` exacto. Sin mes no se consulta (fail-closed). Concept-only sin mes no cabe sin SQL nuevo.
- `folio_search` no es inheritable. Fuera de slice.
- `solo_zp_ad` se recorta por permiso de acceso existente, no por semántica IGF.
