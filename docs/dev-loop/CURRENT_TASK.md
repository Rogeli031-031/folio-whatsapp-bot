# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "G2_CAPABILITIES_SOURCES_SYNC_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  authz_changes: false

objective: >
  Sincronizar exclusivamente DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md con el
  contrato G3 FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md v1.0, el Architecture
  Index 1.9 y EKE §7 Financiero 1.1, registrando la semántica y fuente física
  existente de ACTUAL_FINANCIAL sin declarar una capability runtime que aún
  no existe.

authoritative_inputs:
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md v1.0"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md v1.9"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md v1.1"

target:
  path: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

established_truth_classes:
  ACTUAL_COMMERCIAL:
    source: "ARR"
    runtime_status: "existing where already documented"

  TARGET_COMMITMENT:
    source: "igf_meta"
    runtime_status: "existing where already documented"

  FORECAST:
    source: "IGF"
    runtime_status: "existing where already documented"

  ACTUAL_FINANCIAL:
    source: "FINANCE_PROVIDED fields from authoritative FINAL Finance version"
    physical_persistence:
      - "igf.versions"
      - "igf.compromiso_lines"
    contract_status: "DEFINED"
    runtime_status: "NOT_YET_SUPPORTED"

  DERIVED_MODEL:
    source: "forecast_mensual / derived models"

critical_inventory_rule: >
  Existence of source data and a frozen evidence contract does not equal a
  Director IA runtime capability.

do_not_claim:
  - "financial_actual capability implemented"
  - "P&L actual query supported"
  - "FINAL physical marker implemented"
  - "is_final exists"
  - "finalization workflow implemented"
  - "financial actual loader exists"
  - "financial actual tool exists"
  - "financial actual planner intent exists"
  - "ACTUAL_FINANCIAL feeds IES"
  - "AUTHZ resolved"

financial_actual_inventory_entry:
  contract: "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md v1.0"
  owner: "FINANZAS"
  source_status: "PHYSICAL_SOURCE_EXISTS"
  evidence_semantics: "DEFINED"
  finalization_runtime: "PENDING"
  Director_IA_runtime: "PENDING"
  IES_integration: "PENDING"
  authorization: "AUTHZ_DECISION_REQUIRED"

source_boundary:
  FINANCE_PROVIDED: >
    Finance-owned values physically supplied in the versioned financial
    artifact.

  ARR_ACTUAL: >
    Commercial actual; not interchangeable with ACTUAL_FINANCIAL.

  RUNTIME_COMPUTED: >
    Runtime calculation over evidence; must not be inventoried as
    FINANCE_PROVIDED.

  DERIVED: >
    Model output; not actual evidence.

invariants:
  - "source exists != capability exists"
  - "contract exists != runtime exists"
  - "is_current != FINAL"
  - "latest != FINAL"
  - "closed month != FINAL"
  - "complete ARR != FINAL"
  - "FINAL does not promote RUNTIME_COMPUTED to FINANCE_PROVIDED"
  - "missing financial actual != zero"
  - "missing financial actual != forecast"
  - "missing financial actual != target"

reconciliation:
  code: "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
  rule: >
    Preserve the documented boundary that ARR commercial actual and
    FINANCE_PROVIDED evidence may disagree and cannot be silently reconciled.

authorization:
  status: "AUTHZ_DECISION_REQUIRED"

  rule: >
    Do not document existing IGF forecast permission as sufficient for
    ACTUAL_FINANCIAL/P&L.

  effect: >
    Runtime exposure of financial actual remains blocked pending explicit
    authorization architecture/decision.

implementation_gate:
  G3_contract: "COMPLETE"
  architecture_index_sync: "COMPLETE"
  EKE_sync: "COMPLETE"
  capabilities_sources_sync: "CURRENT"
  authz_decision: "PENDING"
  physical_finalization: "PENDING"
  runtime_loader: "PENDING"
  IES_integration: "PENDING"

document_editing_rule: >
  Inspect the existing structure and terminology of
  DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md and make the minimum truthful sync.
  Do not invent a new table/format if an existing section can express the
  distinction.

matrix_policy:
  capability_matrix_change: false
  reason: >
    No runtime capability has been added in this documentation task.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

g2_sequence:
  completed:
    - "Architecture Index"
    - "EKE §7 Financiero"

  current:
    - "CAPACIDADES_Y_FUENTES"

  after_completion:
    status: "G2_DOCUMENTAL_SYNC_COMPLETE"

next_gate:
  type: "AUTHORIZATION_DECISION"
  requirement: >
    Resolve the explicit authorization boundary for viewing/consuming
    ACTUAL_FINANCIAL/P&L before runtime exposure is designed.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001.md"

  read_only:
    - "all other repository files"

out_of_scope:
  - "runtime"
  - "code"
  - "tests"
  - "SQL"
  - "schema"
  - "VBA"
  - "permissions changes"
  - "authorization decision"
  - "Index"
  - "EKE"
  - "G3 modification"
  - "IES"
  - "04"
  - "05"
  - "Constitution"
  - "capability matrix changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "ACTUAL_FINANCIAL source/contract is inventoried truthfully."
  - "Physical source existence is distinguished from runtime capability."
  - "FINANCE_PROVIDED vs RUNTIME_COMPUTED remains explicit."
  - "ARR remains ACTUAL_COMMERCIAL."
  - "No financial_actual runtime capability is claimed."
  - "No physical FINAL marker is claimed."
  - "No IES integration is claimed."
  - "AUTHZ_DECISION_REQUIRED remains explicit."
  - "Capability matrix remains unchanged."
  - "Baseline remains 52.5%."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_exactly_one:
    "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001.md