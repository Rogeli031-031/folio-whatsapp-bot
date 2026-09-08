# FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001

IMPLEMENTATION_SHA:
17620e1df9e76dc5ad316cc715bec0135ec4d8f1

BASE_MAIN_SHA:
b99ca2f8fc1638a8763edcdd5058d5bb9168ab37

BEFORE:
B-001 `disminuyeron.totalDeltaKg=1059160.26` sin `GROSS_DECREASE_MAGNITUDE_KG` = true
B-002 bucket sin `NOT_PLANT_NET_DELTA` = true
B-003 prompt sin `M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE` = true
B-004 prompt sin FORBIDDEN «Delta Venta disminuyó X» / «planta cayó X» = true
B-005 alignment/causality/pretruncate/null≠0/SOURCE_PARTIAL ya PASS (26/40 verdes)

LABEL_MODEL:
`formatM9Bucket` (solo si `totalField=totalDeltaKg`) añade `semantics=` vía helper local `m9VentaBucketSemantics`. `formatM9Family` y `formatFinancialDiagnosisContext` no cambiaron (R-PROMPT-030 intacto).

DISMINUYERON_MODEL:
`GROSS_DECREASE_MAGNITUDE_KG` + `NOT_PLANT_NET_DELTA` + `NOT_IGF_ARR_GAP` + `M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE`. Número crudo intacto (`1059160.26`, sin signo inventado).

MAS_MODEL:
`GROSS_INCREASE_MAGNITUDE_KG`. Incluye nuevos según semántica física existente. No es net delta.

DEJARON_MODEL:
`GROSS_STOPPED_BUYING_MAGNITUDE_KG`. No es net delta.

PLANT_NET_MODEL:
`M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE` en contexto (buckets venta) y en `FINANCIAL_DIAGNOSIS_CONTROL`. No se reconstruye `mas - disminuyeron - dejaron`.

PROMPT_MODEL:
Control existente preservado (alignment + `CAUSAL_EVIDENCE=NONE`). Añade FORBIDDEN de «disminuyó X» / «planta cayó X» / gap IGF-ARR y REQUIRED de «reducción bruta acumulada» + compensación por otros buckets. IGF/ARR ≠ M9.

001..040:
40/40 PASS. NEW FAILURE = 0.

SUITES:
- focal R-GROSS: 40/40
- FD + pretruncate + prompt-status + M9 + ARR Root1/ARR: 264/264
- TIER 1: 8/8
- pre-deploy --gate: PASS
- NEW FAILURE: 0

FILES:
- lib/director-ia-financial-diagnosis.js
- test/director-ia-financial-diagnosis-m9-gross-bucket-labels.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001.md

RISKS:
- El contrato es formatter + prompt. El LLM aún puede desobedecerlo. No hay validator post-generation.
- Descuento/ingreso no reciben etiquetas kg (solo delta_venta).

FORMATTER_FAMILY_CHANGED:
NO

BUILD_ALIGNMENT_CHANGED:
NO

EVIDENCE_CHANGED:
NO

NET_DELTA_CREATED:
NO

POST_GENERATION_VALIDATOR_ADDED:
NO

M9_LOADERS_CHANGED:
NO

ARR_CHANGED:
NO

PLANNER_CHANGED:
NO

ROUTING_CHANGED:
NO

SERVER_CHANGED:
NO

SQL_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPENDENCY_CHANGED:
NO

LIVE_DB_USED:
NO

FINAL:
PASS

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
files_touched:
  - "lib/director-ia-financial-diagnosis.js"
  - "test/director-ia-financial-diagnosis-m9-gross-bucket-labels.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001.md"
files_not_touched:
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "server.js"
  - "package.json"
  - "docs/director-ia/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "formatM9Family no se editó para preservar R-PROMPT-030; las etiquetas viven en formatM9Bucket + prompt control."
next_task_proposed: "ninguna; no autorizada"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
base_main_sha: "b99ca2f8fc1638a8763edcdd5058d5bb9168ab37"
live_db: false
```
