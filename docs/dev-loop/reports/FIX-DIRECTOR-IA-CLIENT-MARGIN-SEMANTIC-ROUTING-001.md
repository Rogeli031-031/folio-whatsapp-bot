# FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001

```yaml
task_id: "FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001 FAIL; R-RUNTIME-002..005 PASS"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..005 PASS"
predeploy_after: "PASS"
harness_fail: 0
como_vamos_after_client_margin: "NOT_IMPLEMENTED (out of scope)"
hardcoded_erick_agosto_093_732: false
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

`R-RUNTIME-001` ya no acepta anclar el cliente y rechazar margen de planta.

Antes (tarea CLOSED): `expected_metrics=["margen"]`, `forbidden_packs` incluía `descuento`, `must_return_client_margin` solo exigía mención de entidad y ausencia de compare de planta.

Ahora:

- `expected_metrics=["descuento"]`
- `forbidden_packs` incluye `historical_margin` y packs de planta/CEL
- `must_return_client_historical_discount`: pack `descuento` o `client_profile`, entidad participa (estado/identidad, no prosa LLM), no `requires_clarification` de rechazo, no compare de planta
- no se exige el literal 0.93

Alta `R-RUNTIME-005`:

- pregunta exacta `¿Cuál es el margen de agosto?`
- `expected_pack=historical_margin`
- `forbidden_packs` incluye `descuento` y `client_profile`
- no se exige el literal 7.32

Harness: familia descuento acepta `client_profile` (ruta ARR existente). Fixture ARR de identidad/ventas para que la ruta sea observable. TIER 1 (`CASES`, 8) sin cambio de expectation.

## 2. BEFORE (gate endurecido, producto aún no tocado)

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001  Historical margin ERICK  FAIL  FIRST_BAD_BOUNDARY=METRIC_PACK
R-RUNTIME-002  Margin → discount  PASS
R-RUNTIME-003  Plant/executive → discount  PASS
R-RUNTIME-004  First-turn discount  PASS
R-RUNTIME-005  Plant month margin  PASS

PRE-DEPLOY GATE = FAIL
```

Detalle 001: `http=200 pack=historical_margin` — `pack=historical_margin forbidden`.

## 3. FIRST_BAD_BOUNDARY de R-RUNTIME-001 (nueva expectativa)

`METRIC_PACK` en Capa B. Frontera causal primera: **PLANNER**.

`isHistoricalMarginQuestion` era verdadero y ganaba a `client_profile` aunque `explicitClientScopeSpan` ya extraía el cliente no-planta. Chat ejecutaba `buildHistoricalMarginClientScopeResult` (`parent_intent=historical_margin`, rechazo).

## 4. Frontera corregida

`lib/director-ia-planner.js` `detectDirectorIaIntent`:

- `isHistoricalMarginQuestion` + span de cliente no-planta → `client_profile` (descuento/kg histórico ARR)
- `isHistoricalMarginQuestion` sin cliente → `historical_margin` (IGF `margen_kg` de planta)

Regla general. No ERICK, agosto, 0.93 ni 7.32. Reutiliza `explicitClientScopeSpan` (excluye planta nombrada).

Chat: el loader `client_profile` existente. No se tocó `conversation-state` inherit. No se implementó `como vamos?` post-margen-cliente.

## 5. AFTER

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001  PASS  pack=client_profile
R-RUNTIME-002  PASS  pack=client_profile (último turno; padre ya no es HM)
R-RUNTIME-003  PASS  pack=descuento
R-RUNTIME-004  PASS  pack=descuento
R-RUNTIME-005  PASS  pack=historical_margin

HARNESS FAILURE = 0
PRE-DEPLOY GATE = PASS
--gate exit 0
```

Suites relacionadas: `director-ia-historical-margin`, `director-ia-client-profile`, `director-ia-golden-regression`, `director-ia-conversational-continuity`, `director-ia-daily-cross-metric-followup` — 97/97 PASS.

## 6. Fuera de alcance (confirmado)

No se implementó `margen de cliente → como vamos?`. El parent del Turno 1 de esa secuencia ahora sería `client_profile`, no `historical_margin`; re-evaluar después.

## 7. Hardcode

Producto: sin ERICK / agosto / 0.93 / 7.32. Esos tokens solo aparecen en fixtures/preguntas humanas del gate.

## 8. Archivos

Tocados:

- `lib/director-ia-planner.js`
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `test/director-ia-golden-regression.test.js`
- `test/director-ia-historical-margin.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001.md`

No tocados: `docs/director-ia/`, DB/schema, LIVE_DB, frontend, `conversation-state` inherit diario, merge/deploy.

## 9. Commit / status

implementation SHA: `13676cef71d8f066255a75f7b7551ac41059d11d`

Tras el stamp documental de este SHA, `git status --short` debe quedar limpio en la rama `fix/director-ia-client-margin-semantic-routing-001`. No push. No merge.
