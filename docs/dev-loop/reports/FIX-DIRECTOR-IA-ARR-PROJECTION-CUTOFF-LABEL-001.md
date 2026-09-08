# FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001

IMPLEMENTATION_SHA:
af9faa2fe0d1e1e585e70c9a465a740fac293ad1

BEFORE:
B-001 empty cutoff `fechaCorte: ""` = true
B-002 collapsed `{ venta_ton, desc_kg }` = true
B-003 label `proyección o real según corte` = true
B-004 observed 302 presentable as the only `venta` = true
B-005 delta `arrCurr.venta_ton - arrPrev.venta_ton` = true
IGF fallback `arrCurr.venta_ton ?? ventaIgf` = true

AFTER:
observed/projected/previous fields separated
delta = projected current − previous observed
empty intra-month cutoff removed
IGF 2000.x only as Compromiso venta IGF
R-ARR-PROJ-001..040 = 40/40 PASS

ROOT_FIXED:
Root 1 only. `loadArrProyForPlant` → `computePronosticoProyByPlant({ fechaCorte: "" })` collapsed TOTAL observado into a field labeled proyección.

ARR_DATA_SOURCE_REUSED:
`loadDashboardForecastParity` (`lib/director-ia-dashboard-forecast-adapter.js`)
observed = `actual_to_date.venta_ton` (`venta_sheet.total_mes_sum`)
projected = `forecast.venta_ton` / `forecast.desc_kg` (`dashboardDescSigned`)
No new projection formula. Adapter formula unchanged.

CUTOFF_SOURCE:
Same order as `resolveDirectorIaEffectiveCutoff`, without requiring `director-ia-chat.js`:
1. explicit `20xx-mm-dd` / `dd/mm/20xx` in the question
2. `req.body.upload_day` / `cutoff_date`
3. `deps.loadArrLastUploadDay` (wired in `server.js` with the existing plant-aware query)

EMPTY_CUTOFF_REMOVED:
YES. Open month without cutoff → `projected_* = null`, `CUTOFF_UNAVAILABLE`. Does not call the dashboard engine with `fechaCorte: ""`.

OBSERVED_SALE_FIELD:
`observed_venta_ton`

PROJECTED_SALE_FIELD:
`projected_venta_ton`

PREVIOUS_SALE_FIELD:
`observed_venta_ton` of previous month (`arrPrev`)

OBSERVED_DISCOUNT_FIELD:
`observed_desc_kg` (dashboard still does not export desc-to-date; stays null, not 0)

PROJECTED_DISCOUNT_FIELD:
`projected_desc_kg`

NORTH_STAR_CONTEXT:
Venta observada al corte: 302.00 ton
Proyección de cierre ARR: 1522.76 ton
Venta mes previo: 1176.00 ton
Proyección vs mes previo: +346.76 ton
Descuento proyectado ARR: -4.84 $/kg
Never “proyección = 302” / “Δ = -874”

DELTA_MODEL:
`ARR_PROJECTED_CURRENT − PREVIOUS_MONTH_OBSERVED`

IGF_SEPARATION:
`igf.compromiso_lines.venta_ton` printed only as `Compromiso venta IGF`.
Not used as ARR fallback.

HYBRID_INCOME_HANDLING:
Kept only when projected ARR sale + IGF margen + projected ARR desc + HG are all present.
Labeled `Ingreso aprox. cruzado (proyección ARR × margen/desc/HG IGF; no es ingreso ARR puro ni proyección ARR)`.
Omitted if any input is null. No new `|| 0`.

001..040:
40/40 PASS (`test/director-ia-arr-projection-cutoff-label.test.js`)

SUITES:
R-ARR-PROJECTION-SEMANTICS 40/40 PASS
planner 61/61 PASS
capabilities 57/57 PASS
tool-orchestrator 27/28; 1 preexistente vs `base_main_sha` `ad20fb8b` (`lib/director-ia-planner.js` + orchestrator unchanged; `¿Qué clientes dejaron de comprar?` planner=`commercial_trend`, script espera `get_commercial_state`)
IGF (M7 + igf-arr-routing) PASS
ARR existentes (`director-ia-real-input-arr`) 24/24 PASS
M9 existentes PASS
financial diagnosis PASS
commercial_state routing PASS
continuity PASS
TIER 1 8/8 PASS
PRE-DEPLOY `--gate` PASS
HTTP 5xx = 0
HARNESS FAILURE = 0
NEW FAILURE = 0

FILES:
- lib/director-ia-igf-arr.js
- lib/director-ia-financial-diagnosis.js (`mapArrBlock` / `formatArrPayload` only)
- server.js (inject existing `loadArrLastUploadDay` into IGF/ARR configure)
- test/director-ia-arr-projection-cutoff-label.test.js
- docs/dev-loop/CURRENT_TASK.md (status only)
- this report

Adapter not modified. Frontend not modified. `docs/director-ia/` not modified.

RISKS:
- Open month without cutoff/last-upload leaves projected ARR null (fail-closed; no empty-cutoff collapse).
- `venta_ton` / `desc_kg` remain aliases of projected (open) or observed (closed) for plant_diagnosis / legacy FD fixtures. Labels no longer treat them as the only ARR number.
- Closed month without conversation cutoff uses `postCloseCutoffYmd` only so the existing adapter can load full-month ACTUAL (out-of-month date → lookback off). Not a new forecast.
- Hybrid ingreso still exists, now labeled and omitted when incomplete.

M9_CHANGED: NO
PLANNER_CHANGED: NO
ROUTING_CHANGED: NO
SQL_CHANGED: NO
SCHEMA_CHANGED: NO
DEPENDENCY_CHANGED: NO
DASHBOARD_FORMULA_CHANGED: NO

```yaml
task_id: "FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
adapter_formula_changed: false
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: "FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001 / FIX-DIRECTOR-IA-ARR-PROJECTION-QUESTION-ROUTE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No LIVE_DB. No next task."
```
