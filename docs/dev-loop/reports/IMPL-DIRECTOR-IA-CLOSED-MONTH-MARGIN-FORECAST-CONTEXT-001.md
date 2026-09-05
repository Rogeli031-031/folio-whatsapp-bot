# IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPL"
implementation: true
docs_director_ia_changed: false
live_db: false
base_origin_main: "908fd8ab2fccd2d02487f7ea7dd899a9d8373bd0"
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..005 PASS; R-RUNTIME-006 FAIL; R-RUNTIME-007 PASS"
predeploy_before: "FAIL"
first_bad_boundary_006_before: "USER_VISIBLE_OUTCOME"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS"
predeploy_after: "PASS"
harness_fail: 0
como_vamos_after_client_margin: "NOT_IMPLEMENTED (out of scope)"
hardcoded_acapulco_agosto_73165_84: false
forecast_relabeled_as_actual: false
golden_tier1_expectations_changed: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```

## 1. Diff del Runtime Gate

Alta **R-RUNTIME-006** (closed month + 0 FINAL + latest FORECAST válida):

- misma pregunta de planta `¿Cuál es el margen de agosto?`
- `expected_pack=historical_margin`
- `require_labeled_forecast_context`: ausencia de FINAL explícita; etiqueta FORECAST/proyección/vista vigente; `$/kg`; no `Fuente: cierre financiero FINAL`; no `ACTUAL_FINANCIAL`; no únicamente DATA_NOT_FOUND
- mapa IGF por caso: agosto solo FORECAST, latest `version_number=8`, margen genérico `6.4` (no 7.3165 / no version 84)

Alta **R-RUNTIME-007** (closed month + FINAL única + latest FORECAST distinta):

- `require_final_not_latest_forecast`: FINAL `8.20` + `Fuente: cierre financiero FINAL`; no sustituir por latest `6.40`
- mapa IGF por caso: FINAL v2 `8.2` y FORECAST v8 `6.4`

Harness: `queryHistoricalMarginLatestVersion` ahora elige `MAX(version_number)`, misma semántica que `defaultQueryLatestVersion` / IGF Forecast ARR. TIER 1 (`CASES`, 8) sin cambio de expectation. R-RUNTIME-001..005 no se debilitaron.

## 2. BEFORE (gate endurecido, producto aún no tocado)

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001  Historical margin ERICK  PASS
R-RUNTIME-002  Margin → discount  PASS
R-RUNTIME-003  Plant/executive → discount  PASS
R-RUNTIME-004  First-turn discount  PASS
R-RUNTIME-005  Plant month margin  PASS
R-RUNTIME-006  Closed month no FINAL + FORECAST  FAIL  FIRST_BAD_BOUNDARY=USER_VISIBLE_OUTCOME
R-RUNTIME-007  Closed month unique FINAL  PASS

PRE-DEPLOY GATE = FAIL
--gate exit 1
```

Detalle 006: `http=404 pack=historical_margin` — `expected labeled FORECAST context; final_absent=true labeled=false kg=false as_actual=false only_missing=true`. Copy: `No hay un margen histórico FINAL defendible para agosto 2026.`

## 3. FIRST_BAD_BOUNDARY de R-RUNTIME-006

`USER_VISIBLE_OUTCOME` en Capa B. Frontera causal: `loadClosedMonth` / `buildSingleAnswer` / `single_month` missing.

El loader de mes cerrado, con 0 FINAL, devolvía `NOT_FINAL` sin adjuntar latest FORECAST. El builder respondía solo fail-closed DATA_NOT_FOUND.

## 4. Frontera corregida

`lib/director-ia-historical-margin.js`:

- `closed_month` + unique valid FINAL → FINAL (`truth_class=ACTUAL_FINANCIAL`). No se adjunta latest FORECAST.
- `closed_month` + `reason=NOT_FINAL` + latest FORECAST válida (vía `deps.queryLatestVersion`, misma semántica `ORDER BY version_number DESC LIMIT 1`) → declara FINAL unavailable + `forecast_context` etiquetado. Payload: `SOURCE_PARTIAL`, `truth_class=null`, `presented_as_closed_actual=false`, `forecast_used=true`. No se copia el margen FORECAST a `margin_kg` primario.
- `closed_month` + sin evidencia usable → DATA_NOT_FOUND / fail-closed.
- `VERSION_AMBIGUOUS` / `PLANT_AMBIGUOUS` / otras anomalías: no se adjunta FORECAST.

Copy de contexto: FINAL unavailable + `proyección` / `FORECAST` / `vista vigente` + `$/kg` + `No lo presento como cierre real.`

## 5. AFTER

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001  PASS
R-RUNTIME-002  PASS
R-RUNTIME-003  PASS
R-RUNTIME-004  PASS
R-RUNTIME-005  PASS
R-RUNTIME-006  PASS  pack=historical_margin  http=200
R-RUNTIME-007  PASS  pack=historical_margin  http=200

HARNESS FAILURE = 0
PRE-DEPLOY GATE = PASS
--gate exit 0
```

Suites:

- `test/director-ia-historical-margin.test.js` PASS (incluye NOT_FINAL+FORECAST, FINAL gana, VERSION_AMBIGUOUS no oculto, planner/continuity/fail-closed existentes)
- `test/director-ia-golden-regression.test.js` PASS
- `test/director-ia-financial-actual.test.js` PASS (FINAL selection intacta)
- `test/director-ia-evidence-builder.test.js` PASS
- `test/director-ia-action-person-routing.test.js` PASS

Evidencia semántica:

- FINAL existente → sigue siendo FINAL
- FINAL inexistente + FORECAST → FORECAST visible y etiquetado; nunca `ACTUAL_FINANCIAL` ni `Fuente: cierre financiero FINAL`
- sin FINAL ni FORECAST defendible → fail-closed `DATA_NOT_FOUND`

## 6. Fuera de alcance (confirmado)

No se implementó `margen de ERICK → como vamos?`. No LIVE_DB. No DB/schema. No frontend. No contratos congelados. No merge. No deploy. No next task.

## 7. Hardcode

Producto: sin Acapulco / agosto / 7.3165 / version 84 como literales de negocio. `agosto` permanece solo en el diccionario de meses preexistente. Fixtures del harness usan `6.4` / `8.2` y `version_number` 8/2.

## 8. Archivos

Tocados:

- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `lib/director-ia-historical-margin.js`
- `test/director-ia-historical-margin.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001.md`

No tocados: `docs/director-ia/`, DB/schema, LIVE_DB, frontend, planner inherit diario, merge/deploy.

## 9. Commit / status

implementation SHA: pendiente de este commit.

Rama: `impl/director-ia-closed-month-margin-forecast-context-001`. No push. No merge.
