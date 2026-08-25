# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EKE-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "G2_EKE_SYNC_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  index_sync: false
  inventory_sync: false

objective: >
  Sincronizar exclusivamente el dominio Financiero del
  DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md con el contrato G3
  FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md v1.0, reconociendo
  ACTUAL_FINANCIAL como clase de evidencia distinta de
  ACTUAL_COMMERCIAL, TARGET_COMMITMENT, FORECAST y DERIVED_MODEL,
  sin afirmar soporte físico/runtime todavía inexistente.

source_contract:
  path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  version: "v1.0"
  status: "G3 frozen"

source_index:
  path: "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  version: "1.9"

target:
  path: "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  scope: "§7 Financiero only, plus minimum document-control references if required by repository convention"

authority:
  contract_relationship: >
    EKE recognizes and delegates FINANCIAL_ACTUAL evidence semantics to
    FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md.

  do_not_duplicate: >
    Do not copy the complete G3 contract into EKE. EKE owns executive-domain
    semantics; G3 owns detailed financial-actual evidence semantics.

financial_truth_classes:

  ACTUAL_COMMERCIAL:
    canonical_source: "ARR"
    meaning: "commercial actual"
    examples:
      - "venta real"
      - "mix real"
      - "descuento real where supported"

  TARGET_COMMITMENT:
    canonical_source: "igf_meta"
    meaning: "meta/compromiso gerencial del mes"

  FORECAST:
    canonical_source: "IGF non-final/current financial view"
    meaning: "proyección, no cierre financiero actual"

  ACTUAL_FINANCIAL:
    canonical_source: >
      FINANCE_PROVIDED fields from the unique authoritative FINAL,
      non-SUPERSEDED Finance version for the exact company/plant + YYYY-MM.
    detailed_contract: "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"

  DERIVED_MODEL:
    canonical_source: "forecast_mensual / derived models"
    meaning: "model output, not actual evidence"

mandatory_invariants:
  - "ACTUAL_COMMERCIAL != ACTUAL_FINANCIAL"
  - "TARGET_COMMITMENT != ACTUAL_FINANCIAL"
  - "FORECAST != ACTUAL_FINANCIAL"
  - "DERIVED_MODEL != ACTUAL_FINANCIAL"
  - "FINANCE_PROVIDED != RUNTIME_COMPUTED"
  - "FINAL must never be inferred by EKE/Reasoning/GPT"
  - "Missing ACTUAL_FINANCIAL must not fall back to FORECAST"
  - "Missing ACTUAL_FINANCIAL must not fall back to TARGET_COMMITMENT"
  - "missing != zero"

executive_semantics:

  open_month:
    allowed:
      - "ACTUAL_COMMERCIAL_TO_DATE"
      - "TARGET_COMMITMENT"
      - "FORECAST"
    prohibited:
      - "label financial forecast as financial actual"

  closed_but_not_final:
    financial_actual: "NOT_FINAL"
    rule: "Do not present P&L/financial result as ACTUAL_FINANCIAL."

  closed_and_final:
    financial_actual: >
      May be represented as ACTUAL_FINANCIAL only when the G3 finalization
      contract is physically satisfied and authorization permits exposure.

provided_vs_computed:
  rule: >
    EKE must preserve whether a material value was FINANCE_PROVIDED or
    RUNTIME_COMPUTED.

  prohibited_claim: >
    Attribute a runtime-computed result directly to Finanzas merely because its
    input version was FINAL.

  semantic_example: >
    If X is computed from final Finance inputs plus ARR, the executive statement
    must preserve that X is a system computation over final evidence, not a
    value physically provided by Finance.

reconciliation:
  code: "FINANCIAL_ACTUAL_RECONCILIATION_GAP"

  rule: >
    If FINANCE_PROVIDED evidence conflicts with canonical ARR commercial actual
    for the same period, preserve both sources and surface the gap.

  prohibited:
    - "silent source selection"
    - "silent overwrite"
    - "GPT reconciliation by preference"

historical_versions:
  rule: >
    Prior Finance versions may support forecast-vs-final comparison when their
    provenance supports it.

  limitation: >
    created_at/upload timestamp alone is not a business effective/as-of date.

causality:
  invariants:
    - "financial variance != cause"
    - "reconciliation gap != cause"
    - "temporal coincidence != cause"
    - "meeting statement != causal truth unless separately evidenced"

authorization:
  status: "AUTHZ_DECISION_REQUIRED"

  invariant: >
    Existing permission for IGF forecast must not automatically authorize
    ACTUAL_FINANCIAL/P&L evidence.

  runtime_effect: >
    ACTUAL_FINANCIAL exposure remains prohibited until the authorization
    decision is resolved.

ies_boundary:
  current: "ACTUAL_FINANCIAL does not yet feed official IES."

  rule: >
    EKE recognition of the semantic class does not mean physical IES/runtime
    integration exists.

runtime_status:
  contract: "EXISTS"
  physical_finalization: "PENDING"
  schema_final_marker: "PENDING"
  loader: "PENDING"
  runtime_exposure: "PENDING"
  authz: "DECISION_REQUIRED"
  IES_integration: "PENDING"

EKE_editing_rule:
  requirement: >
    Inspect the current EKE §7 structure and make the minimum normative sync.
    Preserve its existing terminology and architecture.

  prohibit:
    - "rewrite unrelated EKE sections"
    - "redesign EKE"
    - "invent runtime capability"
    - "copy full G3 verbatim"
    - "change frozen upstream contracts"

document_control:
  audit:
    - "current EKE version"
    - "existing versioning convention"

  rule: >
    If normative synchronization requires a version increment under existing
    convention, increment minimally and document it. Do not alter unrelated
    dates/status.

g2_sequence:
  completed:
    - "Architecture Index"

  current:
    - "EKE §7 Financiero"

  remaining:
    - "DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  rule: "Do not perform inventory sync in this task."

implementation_gate:
  remains_closed: true

  blockers:
    - "CAPACIDADES_Y_FUENTES sync pending"
    - "AUTHZ decision pending before runtime P&L exposure"
    - "physical finalization implementation not authorized"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EKE-SYNC-001.md"

  read_only:
    - "all other repository files"

out_of_scope:
  - "CAPACIDADES_Y_FUENTES"
  - "Architecture Index"
  - "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT modifications"
  - "runtime"
  - "code"
  - "tests"
  - "SQL"
  - "schema"
  - "VBA"
  - "permissions implementation"
  - "IES integration"
  - "04"
  - "05"
  - "Constitution"
  - "matrix"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "EKE financial domain recognizes ACTUAL_FINANCIAL."
  - "G3 remains owner of detailed evidence semantics."
  - "ACTUAL_COMMERCIAL/TARGET/FORECAST/ACTUAL_FINANCIAL/DERIVED remain distinct."
  - "FINANCE_PROVIDED vs RUNTIME_COMPUTED distinction preserved."
  - "Open/closed-not-final/closed-final semantics preserved."
  - "Reconciliation gap preserved."
  - "Historical as-of limitation preserved."
  - "No causal inference introduced."
  - "AUTHZ_DECISION_REQUIRED preserved."
  - "No runtime support claimed."
  - "No IES integration claimed."
  - "Only EKE + CURRENT_TASK + report changed."
  - "Baseline remains 52.5%."
  - "git diff --check clean."

next_task:
  propose_exactly_one:
    "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EKE-SYNC-001.md