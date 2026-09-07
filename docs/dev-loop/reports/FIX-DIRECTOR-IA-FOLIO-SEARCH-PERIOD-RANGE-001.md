# FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001

IMPLEMENTATION_SHA: (pendiente de commit)

BEFORE: `que apoyos de enero a agosto fueron de IMPRESORA?` → `period_month=2026-01`; `concept_query="a fueron de impresora"`; 1 llamada (`2026-01`); 0 hits contra IMPRESORA.

AFTER: `period_mode=RANGE`; `period_start=2026-01`; `period_end=2026-08`; `period_month=null`; `concept_query=impresora`; 8 llamadas cronológicas; wording `mes_cargo 2026-01 a 2026-08`.

PERIOD_MODEL:
SINGLE conserva `period_month`. RANGE usa `period_start`/`period_end` y deja `period_month=null`.

RANGE_PARSER:
Spans `desde X hasta Y`, `de X a Y`, `X-Y`, `X a Y`. Años por extremo o uno solo aplicable al rango. Sin año: `deps.now.year`. Sin rollover.

CONCEPT_STRATEGY:
Retira el span completo (y el año trailing del rango) y reusa STRUCTURAL + frame + tokens. No `"a"` en `STRUCTURAL_TOKENS`.

FETCH_STRATEGY:
`queryReviewableSupportFolios` una vez por mes, mismo client, orden cronológico. No SQL. No BETWEEN.

DEDUP_STRATEGY:
Identidad `id` físico, si no `folio_id`. No por concepto.

PARTIAL_FAILURE:
Cualquier mes que lance → fail-closed de todo el rango. Invertido y >12 meses: 400, 0 llamadas.

GLOBAL_LIMIT:
`RECORD_LIMIT=40` sobre el conjunto fusionado. `count` antes del corte. `truncated` si `count>40`.

NORTH_STAR: PASS

SINGLE_UNCHANGED: YES
FRAME_UNCHANGED: YES
MORPHOLOGY_UNCHANGED: YES
SCOPE_UNCHANGED: YES

SQL_NEW: NO
DEPENDENCY_NEW: NO

001..040: PASS

SUITES:
- R-FOLIO-RANGE 25/25 PASS
- R-FOLIO-LANG 18/18 PASS
- R-FOLIO-TRUTH 21/21 PASS
- planner 61/61 PASS
- capabilities 57/57 PASS
- orchestrator 27/28; 1 preexistente en `a73cf044` (`commercial_state` / `dejaron de comprar`). planner/orchestrator/capabilities no tocados. NEW FAILURE = 0
- M2/M4/M5/M6/IGF/continuity 178/178 PASS
- TIER 1 8/8 PASS
- PRE-DEPLOY `--gate` PASS
- HTTP 5xx = 0
- HARNESS = 0
- `git diff --check` limpio

FILES:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-period-range.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

RISKS:
- Spans no auditados (`entre X y Y`, `del X al Y`) no se detectan.
- Un solo año en un extremo se comparte; no se inventa cruce de año.
- Cap 12 inclusivos: enero→diciembre cabe; 13 meses fallan.

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
frame_changed: false
morphology_changed: false
scope_changed: false
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```
