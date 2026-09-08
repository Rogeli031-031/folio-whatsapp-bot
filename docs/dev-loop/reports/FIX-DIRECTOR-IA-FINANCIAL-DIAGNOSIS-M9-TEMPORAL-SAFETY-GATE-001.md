# FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001

IMPLEMENTATION_SHA:
PENDING_FIRST_COMMIT

BASE_MAIN_SHA:
a39f6b1bfd02ce2ce5c78b86cb79e30e10c830f5

BEFORE:
B-001 M9 B = mes actual sin `M9_CURRENT_PERIOD_MODE=OBSERVED_MTD` = true (base `a39f6b1b`)
B-002 sin `M9_CUTOFF_PARITY=NO` / `M9_TEMPORAL_COMPARABILITY=UNSAFE` en prompt = true
B-003 buckets LIVE `1059160.26` / `113087.4` / `3194.1` / `5906844.35` expuestos al contexto LLM = true
B-004 `alignment.status=comparable` no se redefinía como PERIOD_LABEL_ALIGNMENT vs TEMPORAL_WINDOW_ALIGNMENT = true
B-005 freeze gross/causal/ARR/pretruncate/buildAlignment ya PASS (34/50 verdes pre-código; 16/50 FAIL REGRESSION_FIRST)

TEMPORAL_SAFETY_MODEL:
Helper local `evaluateM9TemporalSafety(assembled, now)` en `lib/director-ia-financial-diagnosis.js`.
Si `m9_period_b` / `period_b` === YYYY-MM de `now` → `unsafe=true`.
No toca SQL, loaders, `buildAlignment`, ni el payload interno.

CURRENT_MONTH_MODEL:
`resolveFinancialDiagnosisNow(opts)` acepta `opts.now` (Date o parseable).
Si falta, `new Date()`.
`yyyyMmFromDate` usa calendario local.
Chat de producción llama `buildFinancialDiagnosisPrompt(assembled, q)` (reloj real).
Fixtures usan `NOW_OPEN=2026-09-08` y `NOW_LATER=2026-10-15`.

PERIOD_LABEL_ALIGNMENT_MODEL:
`PERIOD_LABEL_ALIGNMENT` copia `alignment.status` (`comparable` | `mismatch`).
`alignment.status=comparable` = overlap de etiquetas YYYY-MM (buildAlignment intacto).
No implica paridad de ventanas temporales.

TEMPORAL_ALIGNMENT_MODEL:
`TEMPORAL_WINDOW_ALIGNMENT=UNSAFE` cuando period B es el mes actual.
Si no: `NOT_CURRENT_MTD` y `M9_CURRENT_PERIOD_MODE=HISTORICAL`.
`M9_CUTOFF_PARITY=NO` siempre (M9 no tiene cutoff).
Prompt declara: comparable = PERIOD_LABEL_ALIGNMENT only, not temporal-window parity.

M9_CONTEXT_GATE_MODEL:
`applyM9TemporalContextGate` solo si `unsafe`.
Sustituye desde `BLOQUE M9` hasta `Fin de bloques` por `formatM9TemporalSafetyBlock`.
El bloque declara periodo, OBSERVED_MTD, cutoff NO, UNSAFE, CONTEXT_ONLY.
No entrega totales de buckets.
`formatM9Family` / `formatFinancialDiagnosisContext` / `formatM9Bucket` no se editaron.

INTERNAL_PAYLOAD_PRESERVED:
YES. `assembleFinancialDiagnosisEvidence` y `sources.m9.payload` siguen con
`disminuyeron=1059160.26`, `mas=3194.1`, `dejaron=113087.4`,
`totalDeltaIngreso=5906844.35` tras construir el prompt.

ARR_SEMANTICS:
Preservadas. `observed_venta_ton=302` ≠ `projected_venta_ton=1469.36`.
1469.36 no se etiqueta observed. IGF `1506.3507` distinto. No IGF-ARR=M9.

001..050:
50/50 PASS. NEW FAILURE = 0.
R-TEMP-048/049 del archivo focal cubren freeze de formatters y exposición histórica.
Task 048 Tier 1 y 049 pre-deploy se ejecutaron como suites aparte (abajo).

SUITES:
- focal R-TEMP: 50/50
- R-PROMPT + R-GROSS + R-TEMP: 143/143
- FD + pretruncate + M9 + M9-absent + ARR Root1 + ARR: 211/211
- TIER 1: 8/8
- pre-deploy --gate: PASS
- NEW FAILURE: 0

FILES:
- lib/director-ia-financial-diagnosis.js
- test/director-ia-financial-diagnosis-m9-temporal-safety-gate.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001.md

RISKS:
- El gate es de contexto/prompt. El LLM aún puede desobedecer el contrato. No hay validator post-generation ni retry.
- Chat de producción usa reloj real: en mes abierto, M9 B=mes actual queda gateado; un par histórico cerrado no.
- No se demostró LIVE_DB.

BUILD_ALIGNMENT_CHANGED:
NO

M9_CHANGED:
NO

M9_LOADERS_CHANGED:
NO

ARR_CHANGED:
NO

SQL_CHANGED:
NO

SERVER_CHANGED:
NO

PLANNER_CHANGED:
NO

ROUTING_CHANGED:
NO

POST_GENERATION_VALIDATOR_ADDED:
NO

OPENAI_RETRY_ADDED:
NO

LIVE_DB_USED:
NO

FINAL:
PASS

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
files_touched:
  - "lib/director-ia-financial-diagnosis.js"
  - "test/director-ia-financial-diagnosis-m9-temporal-safety-gate.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001.md"
files_not_touched:
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-dashboard-forecast-adapter.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "server.js"
  - "package.json"
  - "package-lock.json"
  - "docs/director-ia/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "formatM9Family, formatFinancialDiagnosisContext y buildAlignment no se editaron (freeze R-PROMPT-030 / R-TEMP-048). El gate vive después del formatter, en buildFinancialDiagnosisPrompt."
next_task_proposed: "ninguna; no autorizada"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
base_main_sha: "a39f6b1bfd02ce2ce5c78b86cb79e30e10c830f5"
live_db: false
```
