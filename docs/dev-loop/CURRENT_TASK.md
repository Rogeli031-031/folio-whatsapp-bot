# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "ARCHITECTURE_CONTRACT_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false

objective: >
  Definir y congelar el contrato de evidencia para FINANCIAL_ACTUAL antes de
  cualquier implementación física. El contrato debe impedir que forecast,
  latest/is_current, mes transcurrido o valores recalculados por runtime sean
  promovidos silenciosamente a evidencia financiera ACTUAL.

upstream_decision:
  task: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"
  result: "READY_WITH_LIMITS"

established_architecture:
  finalization_architecture: "A"
  physical_source:
    - "igf.versions"
    - "igf.compromiso_lines"
  source_owner: "FINANZAS"

  states:
    - "FORECAST"
    - "FINAL"
    - "SUPERSEDED"

  actual_commercial:
    source: "ARR"

  target_commitment:
    source: "igf_meta"

  actual_financial_definition: >
    FINANCE_PROVIDED fields belonging to the unique authoritative FINAL
    Finance version for exact plant/company + YYYY-MM.

critical_boundary:
  FINANCE_PROVIDED: >
    A value physically supplied by the Finance-owned source artifact and
    preserved with source/version/period provenance.

  RUNTIME_COMPUTED: >
    A value calculated, substituted, overlaid, aggregated or otherwise
    transformed by runtime after source ingestion.

  invariant: >
    FINAL applies to the Finance evidence version. FINAL does not convert a
    RUNTIME_COMPUTED output into FINANCE_PROVIDED evidence.

truth_classes:
  - "ACTUAL_COMMERCIAL"
  - "TARGET_COMMITMENT"
  - "FORECAST"
  - "ACTUAL_FINANCIAL"
  - "DERIVED_MODEL"

truth_class_invariants:
  - "ACTUAL_COMMERCIAL != ACTUAL_FINANCIAL"
  - "TARGET_COMMITMENT != ACTUAL_FINANCIAL"
  - "FORECAST != ACTUAL_FINANCIAL"
  - "DERIVED_MODEL != ACTUAL_FINANCIAL"
  - "is_current != FINAL"
  - "latest != FINAL"
  - "month_elapsed != FINAL"
  - "complete_ARR != FINAL"
  - "FINAL must be explicit"
  - "No fallback from missing ACTUAL_FINANCIAL to FORECAST"
  - "No fallback from missing ACTUAL_FINANCIAL to TARGET_COMMITMENT"

canonical_identity:
  required:
    - "canonical plant/company identity"
    - "year"
    - "month"
    - "version identity"

  final_constraint: >
    At most one authoritative non-superseded FINAL financial version may exist
    for the exact canonical identity and period.

evidence_classes:

  FINANCE_PROVIDED:
    requirements:
      - "source_owner = FINANZAS"
      - "exact period"
      - "exact source version"
      - "source provenance"
      - "field/value physically present in Finance artifact"
      - "finalization status"

  ARR_ACTUAL:
    requirements:
      - "commercial actual provenance"
      - "exact plant"
      - "exact period/date grain"

  RUNTIME_COMPUTED:
    requirements:
      - "computation provenance"
      - "input evidence references where available"
      - "must not be represented as Finance-provided actual"

  DERIVED:
    requirements:
      - "model/calculation provenance"
      - "must remain distinguishable from actual evidence"

finalization_contract:

  FORECAST:
    meaning: >
      Finance version available for planning/current-view use but not approved
      as authoritative financial actual close.

  FINAL:
    meaning: >
      Explicit human/governed designation that this exact Finance-owned version
      is the authoritative financial close evidence for its exact period.

  SUPERSEDED:
    meaning: >
      Previously finalized version retained historically but replaced by a
      later explicitly finalized correction.

  prohibited_transitions:
    - "FORECAST -> FINAL by passage of time alone"
    - "FORECAST -> FINAL because is_current=true"
    - "FORECAST -> FINAL because ARR has last day"
    - "SUPERSEDED -> current authoritative actual without explicit new decision"

finalization_authority:
  requirement: >
    Contract must require an authorized human/business process to finalize.

  current_business_owner: "FINANZAS"

  unresolved_authz: >
    Exact application role/permission allowed to perform or consume financial
    finalization remains a separate authorization decision.

correction_contract:
  rule: >
    A correction after FINAL must create/use a distinct version. Historical
    FINAL evidence must not be destructively overwritten.

  transition:
    old: "FINAL -> SUPERSEDED"
    new: "FORECAST/new version -> FINAL"

  invariants:
    - "preserve old version"
    - "preserve provenance"
    - "preserve finalization history"
    - "no destructive overwrite"

mutation_protection:
  requirement: >
    Any existing mutation path, including HG PATCH or equivalent, must be
    forbidden from silently altering FINANCE_PROVIDED evidence of FINAL or
    SUPERSEDED versions.

  implementation: "OUT_OF_SCOPE"

provenance_contract:
  minimum:
    - "truth_class"
    - "source_owner"
    - "source artifact/type"
    - "canonical plant/company"
    - "YYYY-MM"
    - "version identity"
    - "finalization state"
    - "finalized_at when FINAL"
    - "finalization authority/process"
    - "field origin: FINANCE_PROVIDED / ARR_ACTUAL / RUNTIME_COMPUTED / DERIVED"

  optional_if_physically_available:
    - "upload timestamp"
    - "source filename/reference"
    - "source hash"
    - "superseded version reference"

provided_vs_computed_contract:
  requirement: >
    Define field-level origin. A response may combine evidence classes, but
    every material financial assertion must remain attributable to its origin.

  prohibited_example: >
    "Finanzas cerró con resultado X" when X is a runtime recomputation not
    physically provided by Finance.

  acceptable_semantic_pattern: >
    "Con los datos finales proporcionados por Finanzas y los datos comerciales
    reales de ARR, el sistema calculó X."

  rule: >
    Exact response wording is runtime responsibility, but the evidence contract
    must preserve enough provenance to support the distinction.

reconciliation_contract:
  case: >
    Finance-provided sale/value conflicts materially with canonical ARR actual.

  result: "FINANCIAL_ACTUAL_RECONCILIATION_GAP"

  behavior:
    - "preserve both values"
    - "preserve both provenance chains"
    - "do not silently overwrite"
    - "do not ask GPT to choose truth"
    - "surface limitation/gap"

missing_semantics:
  supported_codes:
    - "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_NOT_FINAL"
    - "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
    - "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE"
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
    - "FINANCIAL_ACTUAL_UNAUTHORIZED"

  invariant:
    missing: "!= 0"
    not_final: "!= forecast"
    unauthorized: "!= missing"

historical_contract:
  rule: >
    Historical versions are immutable evidence records.

  allow:
    - "compare prior version with authoritative FINAL"
    - "compare TARGET vs FORECAST version vs FINAL when provenance supports it"

  prohibit: >
    created_at/upload timestamp alone must not be represented as the business
    effective date of a forecast unless such semantics are explicitly proven.

reasoning_contract:
  requirements:
    - "Reasoning may synthesize across evidence classes."
    - "Reasoning may calculate explicit comparisons from supported values."
    - "Reasoning may not promote evidence truth class."
    - "Reasoning may not infer FINAL."
    - "Reasoning may not infer causality from reconciliation or temporal coincidence."
    - "Recommendation must preserve evidence/limitation provenance."

G3_contract:
  requirement: >
    Determine the new subordinate contract/document required to govern
    FINANCIAL_ACTUAL evidence without reopening frozen 04/05.

  audit:
    - "exact document location/name"
    - "authority relationship to Constitution/EKE/IES/Reasoning"
    - "version"
    - "freeze semantics"

  preferred_candidate:
    name: "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT"
    version: "v1.0"

  rule: >
    Use repository architecture conventions. Do not invent numbering until
    existing index/order is inspected.

G2_sync_order:
  after_G3_contract:
    - "DIRECTOR_IA_ARCHITECTURE_INDEX"
    - "EXECUTIVE_KNOWLEDGE_ENGINE §7 Financiero"
    - "DIRECTOR_IA_CAPACIDADES_Y_FUENTES"

  rule: >
    This task designs the contract and exact required sync. Do not perform
    unrelated architecture changes.

frozen_contracts:
  Constitution:
    modify: false

  IES_04:
    modify: false

  Reasoning_05:
    modify: false

  requirement: >
    Demonstrate that the new contract is subordinate and compatible rather
    than requiring frozen contracts to be reopened.

authorization_boundary:
  status: "AUTHZ_DECISION_REQUIRED"

  invariant: >
    Permission to view/use IGF forecast does not automatically grant permission
    to ACTUAL financial/P&L evidence.

  contract_requirement: >
    Evidence contract must carry authorization classification/boundary but must
    not invent the role mapping.

implementation_gate:
  closed_until:
    - "G3 evidence contract frozen"
    - "G2 architecture index synchronized"
    - "G2 EKE §7 synchronized"
    - "G2 capability/source inventory synchronized"
    - "AUTHZ decision resolved if required before runtime exposure"

  invariant: "No IMPL task before gates are satisfied."

contract_audit:
  inspect_read_only:
    - "Director IA Constitution"
    - "Executive Knowledge Engine"
    - "04 IES"
    - "05 Reasoning Engine"
    - "Architecture Index"
    - "Capabilities and Sources inventory"
    - "existing evidence/source contracts"

  determine:
    - "compatibility"
    - "subordination"
    - "exact G3 document placement"
    - "exact G2 sync targets"
    - "whether authz decision is pre-implementation blocker"

deliverable:
  report_must_include:
    - "contract scope"
    - "normative definitions"
    - "truth-class invariants"
    - "state machine"
    - "provenance requirements"
    - "provided-vs-computed rules"
    - "reconciliation rules"
    - "historical/version rules"
    - "mutation protection"
    - "reasoning constraints"
    - "authorization boundary"
    - "G3 document proposal"
    - "G2 sync plan"
    - "compatibility with frozen 04/05"
    - "implementation gate"
    - "readiness verdict"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "runtime"
  - "code"
  - "tests"
  - "schema"
  - "SQL"
  - "VBA"
  - "permissions implementation"
  - "matrix"
  - "04 modification"
  - "05 modification"
  - "Constitution modification"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "FINANCE_PROVIDED and RUNTIME_COMPUTED normatively separated."
  - "ACTUAL_FINANCIAL normatively defined."
  - "FORECAST/FINAL/SUPERSEDED state semantics defined."
  - "No inferred finalization allowed."
  - "Correction/supersession contract defined."
  - "Mutation protection requirement defined."
  - "Provenance contract defined."
  - "Reconciliation contract defined."
  - "Missing/error semantics defined."
  - "Historical evidence semantics defined."
  - "Reasoning restrictions defined."
  - "Authz boundary preserved without invented roles."
  - "G3 document placement determined."
  - "G2 sync sequence determined."
  - "Frozen 04/05 compatibility demonstrated."
  - "Implementation gate explicit."
  - "Baseline remains 52.5%."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."

next_task_policy:
  rule: >
    Propose exactly one NEXT_TASK corresponding to the first required gate.
    Do not authorize or execute it.

expected_terminal_state:
  - "DONE_PENDING_REVIEW if contract architecture is complete."
  - "STOPPED if a human contractual/authz decision is required before G3."
  - "BLOCKED if incompatible with frozen upstream contracts."

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md