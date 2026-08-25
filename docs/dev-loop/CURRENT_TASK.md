# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

mode:
  type: "DOCUMENTATION_SYNC_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  month_close_result, preservando la separación entre ACTUAL,
  TARGET_COMMITMENT, FORECAST y DERIVED_MODEL.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

conversation_readiness:
  status: "CONVERSATION_BASE_READY_WITH_LIMITS"

implemented_capability:
  intent: "month_close_result"
  architecture: "B — structured month-close read model"
  first_slice: "C — month-close core"
  scope: "one authorized plant + one calendar month CDMX"

truth_classes:

  ACTUAL:
    source: "ARR actual evidence"
    includes:
      - "monthly sales"
      - "CASA/COMISIONISTA mix"
      - "monthly weighted discount/kg"
      - "monthly client movement"

  TARGET_COMMITMENT:
    source: "igf_meta"
    definition: >
      META/COMPROMISO gerencial firmado para el mes: lo que se debe lograr,
      incluyendo venta y objetivos financieros.

  FORECAST:
    source: "IGF"
    definition: "projection, not actual"

  DERIVED_MODEL:
    source: "forecast_mensual / derived forecast models"
    definition: "derived model, not actual and not target"

invariants:
  - "ACTUAL != TARGET_COMMITMENT"
  - "TARGET_COMMITMENT != FORECAST"
  - "FORECAST != ACTUAL"
  - "DERIVED_MODEL != ACTUAL"
  - "DERIVED_MODEL != TARGET_COMMITMENT"

target:
  schemas:
    - "igf_meta.versions"
    - "igf_meta.meta_lines"

  selection:
    - "exact year"
    - "exact month"
    - "is_current=true"
    - "authorized plant/empresa mapping"

  sales_target:
    field: "venta_ton"

  missing:
    code: "TARGET_MISSING_FOR_PERIOD"

  prohibited:
    - "carry-forward"
    - "latest target from another month"
    - "forecast as target"
    - "prior actual as target"
    - "Plaud target"
    - "hardcode"

sales:
  actual:
    source: "arr.ventas_diarias_cliente"
    formula: "SUM(kg)"
    expose:
      - "actual_ton"

  comparison_if_target_exists:
    expose:
      - "target_ton"
      - "delta_ton"
      - "attainment_pct"

channels:
  actual:
    - "CASA"
    - "COMISIONISTA"

  expose:
    - "kg/ton"
    - "share % when valid"

discount:
  formula: "SUM(monto) / SUM(kg)"
  invariant: "no average-of-averages"

clients:
  comparison: "requested month vs immediately previous calendar month"
  expose:
    - "new"
    - "lost"
    - "positive movers"
    - "negative movers"

  truth_boundary:
    - "mover != cause"
    - "no fuzzy identity"
    - "no DICF forecast income as actual close"

financial:
  target:
    source: "igf_meta"
    truth_class: "TARGET_COMMITMENT"

  forecast:
    source: "IGF"
    truth_class: "FORECAST"

  actual:
    status: "UNSUPPORTED_METRIC"

  invariant: >
    Target and forecast may be compared as target vs projection, but that does
    not constitute actual financial attainment.

actions:
  reuse: "existing Action Register"

information_gaps:
  include:
    - "TARGET_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_UNSUPPORTED"
    - "material movement without explanatory evidence"
    - "action missing closure/result evidence"
    - "source unavailable"

  invariant: "gap != cause"

read_model:
  includes:
    - "plant"
    - "month"
    - "period_status"
    - "generated_at"
    - "sales"
    - "channels"
    - "discount"
    - "clients"
    - "financial"
    - "actions"
    - "information_gaps"
    - "provenance"
    - "limitations"

period:
  timezone: "America/Mexico_City"

  current_month:
    status: "PARTIAL"

  explicit_closed_month:
    supported: true

routing:
  canonical_intent: "month_close_result"

  pre_meeting_handoff:
    example: >
      pre_meeting_brief -> “¿Y cómo cerramos?” -> month_close_result

  evidence_policy: "fresh requery"

conversation_state:
  stores:
    - "plant"
    - "month"
    - "parent_intent"

  does_not_store:
    - "raw evidence"
    - "target snapshots as truth"

GPT:
  role:
    - "executive synthesis"
    - "highlight tensions"
    - "state limitations"
    - "identify missing explanation"

  prohibited:
    - "invent target"
    - "invent financial actual"
    - "invent cause"
    - "hide unsupported data"

read_only:
  absolute: true

preserved_regressions:
  - "daily_executive_brief"
  - "commercial_trend"
  - "client_profile"
  - "IGF"
  - "IGF reviewable"
  - "taller_mayor"
  - "pre_meeting_brief"
  - "topic return"
  - "persistent memory"

test_evidence:
  focal: "27/27"
  director_ia_suite: "1005/1005"
  planner: "58/58"
  capabilities: "56/56"
  orchestrator: "28/28"
  git_diff_check: "clean"

percentage:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "matrix"
  - "contracts"
  - "SQL"
  - "schema"
  - "financial actual model"
  - "target upload flow"
  - "Plaud runtime"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "month_close_result documented."
  - "ACTUAL/TARGET/FORECAST/DERIVED_MODEL separation documented."
  - "igf_meta documented as TARGET_COMMITMENT."
  - "Exact YYYY-MM target rule documented."
  - "TARGET_MISSING_FOR_PERIOD documented."
  - "Actual sales/mix/discount documented."
  - "Client movement documented."
  - "financial.target vs financial.forecast documented."
  - "financial.actual UNSUPPORTED documented."
  - "Pre-meeting handoff documented."
  - "Information-gap semantics documented."
  - "Read-only documented."
  - "27/27 and 1005/1005 evidence recorded."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_exactly_one:
    "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002"

  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001.md