# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "G3_CONTRACT_CREATION_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  index_sync: false
  eke_sync: false
  inventory_sync: false

objective: >
  Crear el contrato normativo v1.0
  FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md a partir de la arquitectura ya
  aprobada, subordinado a Constitución y EKE, compatible con 04/05 congelados,
  sin tocar runtime, schema, Index, EKE §7 ni inventario.

source_architecture:
  task: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
  result: "DONE_PENDING_REVIEW / READY_WITH_LIMITS"

g3_document:
  path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  version: "v1.0"
  index_order_future: "—"
  type: "domain evidence contract"
  pipeline_layer: false

authority:
  subordinate_to:
    - "DIRECTOR_IA_CONSTITUTION.md"
    - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"

  compatible_with:
    - "02-EVIDENCE-BUILDER.md"
    - "03A-OBSERVATION-PIPELINE.md"
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"

  must_not_reopen:
    - "DIRECTOR_IA_CONSTITUTION.md"
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"

normative_scope:
  governs:
    - "ACTUAL_FINANCIAL / FINANCIAL_ACTUAL evidence"
    - "FINANCE_PROVIDED field origin"
    - "ARR_ACTUAL field origin"
    - "RUNTIME_COMPUTED field origin"
    - "DERIVED field origin"
    - "FORECAST / FINAL / SUPERSEDED"
    - "provenance"
    - "finalization"
    - "correction/supersession"
    - "reconciliation"
    - "immutability of finalized evidence"
    - "authorization boundary"
    - "reasoning restrictions"

physical_source:
  owner: "FINANZAS"
  persistence:
    - "igf.versions"
    - "igf.compromiso_lines"

truth_classes:
  ACTUAL_COMMERCIAL:
    source: "ARR"

  TARGET_COMMITMENT:
    source: "igf_meta"

  FORECAST:
    source: "non-final IGF Finance version/current model"

  ACTUAL_FINANCIAL:
    source: >
      FINANCE_PROVIDED fields from the single authoritative FINAL,
      non-SUPERSEDED Finance version for the exact YYYY-MM and authorized
      company identity.

  DERIVED_MODEL:
    source: "forecast_mensual / derived models"

invariants:
  - "is_current != FINAL"
  - "latest != FINAL"
  - "month elapsed != FINAL"
  - "complete ARR != FINAL"
  - "FINAL must be explicit"
  - "FINAL does not convert RUNTIME_COMPUTED into FINANCE_PROVIDED"
  - "ACTUAL_COMMERCIAL != ACTUAL_FINANCIAL"
  - "TARGET_COMMITMENT != ACTUAL_FINANCIAL"
  - "FORECAST != ACTUAL_FINANCIAL"
  - "DERIVED_MODEL != ACTUAL_FINANCIAL"
  - "missing ACTUAL_FINANCIAL never falls back to FORECAST/TARGET"

field_origins:
  FINANCE_PROVIDED:
    definition: >
      Value physically present in the Finance-owned artifact and persisted for
      an identified version, period and company with provenance.

  ARR_ACTUAL:
    definition: "Canonical commercial actual from ARR."

  RUNTIME_COMPUTED:
    definition: >
      Value calculated, replaced, overlaid, aggregated or transformed after
      ingestion.

  DERIVED:
    definition: "Model/calculation output distinct from actual evidence."

state_machine:
  FORECAST:
    meaning: "Finance version not explicitly finalized."

  FINAL:
    meaning: >
      Explicit governed designation that this exact Finance version is the
      authoritative financial close evidence for the period.

  SUPERSEDED:
    meaning: >
      Historical previously FINAL version replaced by a later explicitly
      finalized correction.

  prohibited:
    - "FORECAST -> FINAL by time"
    - "FORECAST -> FINAL by is_current"
    - "FORECAST -> FINAL by latest"
    - "FORECAST -> FINAL by complete ARR"

correction:
  required:
    - "new version"
    - "new FINAL designation"
    - "prior FINAL -> SUPERSEDED"
    - "preserve historical evidence"
    - "no destructive overwrite"

mutation_protection:
  rule: >
    FINAL and SUPERSEDED FINANCE_PROVIDED evidence may not be silently mutated.

  known_risk:
    - "existing HG PATCH path"

  implementation: "OUT_OF_SCOPE"

provenance:
  mandatory:
    - "truth_class"
    - "source_owner"
    - "source artifact/type"
    - "canonical company/plant identity"
    - "YYYY-MM"
    - "version identity"
    - "finalization state"
    - "finalized_at when FINAL"
    - "finalization authority/process"
    - "field origin"

  optional_if_available:
    - "upload timestamp"
    - "filename/reference"
    - "hash"
    - "superseded version reference"

historical_semantics:
  allow:
    - "compare prior version vs FINAL"
    - "compare TARGET vs FORECAST vs FINAL with valid provenance"

  prohibit:
    - "created_at treated as business effective date without proof"

reconciliation:
  rule: >
    ARR remains canonical commercial actual. If a FINANCE_PROVIDED value such
    as sale conflicts with ARR for the same period, preserve both and emit
    FINANCIAL_ACTUAL_RECONCILIATION_GAP.

  prohibited:
    - "silent overwrite"
    - "GPT choosing which value to erase"

failure_semantics:
  include:
    - "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_NOT_FINAL"
    - "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
    - "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE"
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
    - "FINANCIAL_ACTUAL_UNAUTHORIZED"

authorization_boundary:
  status: "AUTHZ_DECISION_REQUIRED"

  invariant: >
    Access to IGF forecast does not automatically authorize ACTUAL financial/P&L.

  note: "Does not block G3 freeze; blocks runtime exposure."

reasoning_restrictions:
  - "Reasoning may synthesize supported evidence."
  - "Reasoning may compute explicit comparisons from supported values."
  - "Reasoning may not promote truth class."
  - "Reasoning may not infer FINAL."
  - "Reasoning may not hide reconciliation gaps."
  - "Reasoning may not infer causality from temporal coincidence."

ies_boundary:
  current: >
    ACTUAL_FINANCIAL does not yet feed the official IES runtime.

  requirement: >
    The contract defines the domain evidence semantics only. Future integration
    must obey Constitution/EKE/EB/IES.

freeze_status:
  target: "v1.0 APPROVED/FROZEN BY HUMAN G3"

  rule: >
    Cursor may prepare the document as v1.0 approved for human freeze, but must
    not claim autonomous human approval beyond this authorized G3 task.

g2_after_g3:
  order:
    - "DIRECTOR_IA_ARCHITECTURE_INDEX.md"
    - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md §7 Financiero"
    - "DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  not_in_this_task: true

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md"

  read_only:
    - "all other repository files"

out_of_scope:
  - "Index sync"
  - "EKE sync"
  - "CAPACIDADES_Y_FUENTES sync"
  - "runtime"
  - "code"
  - "tests"
  - "SQL"
  - "schema"
  - "VBA"
  - "permissions implementation"
  - "04 changes"
  - "05 changes"
  - "Constitution changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "G3 file created at exact approved path."
  - "Version v1.0."
  - "No 07 numbering invented."
  - "Normative definitions preserved."
  - "FINANCE_PROVIDED vs RUNTIME_COMPUTED preserved."
  - "FORECAST/FINAL/SUPERSEDED preserved."
  - "Correction and supersession preserved."
  - "Mutation protection requirement preserved."
  - "Provenance preserved."
  - "Reconciliation contract preserved."
  - "Historical timestamp limitation preserved."
  - "AUTHZ_DECISION_REQUIRED preserved."
  - "No runtime exposure authorized."
  - "No IES integration claimed."
  - "04/05/Constitution untouched."
  - "No Index/EKE/inventory sync performed."
  - "Baseline remains 52.5%."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_exactly_one: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-INDEX-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md