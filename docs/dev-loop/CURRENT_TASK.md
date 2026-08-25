# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "ARCHITECTURE_READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  sql_execution: false

objective: >
  Diseñar el contrato mínimo para que la fuente financiera ya existente,
  propiedad de FINANZAS y persistida en igf.versions + igf.compromiso_lines,
  pueda convertirse de forma explícita, gobernada y auditable en
  ACTUAL_FINANCIAL para un mes cerrado, sin crear una segunda fuente,
  sin tratar is_current/latest como is_final y sin reconstruir P&L desde
  fuentes operativas.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

prior_readiness:
  task: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001"
  result: "READY_WITH_LIMITS"

established_truth:
  source_owner: "FINANZAS"
  official_artifact: "Excel financiero mensual/versionado"
  persistence:
    - "igf.versions"
    - "igf.compromiso_lines"

  target_commitment:
    source: "igf_meta"
    class: "TARGET_COMMITMENT"

  commercial_actual:
    source: "ARR"
    class: "ACTUAL_COMMERCIAL"

  derived_models:
    class: "DERIVED_MODEL"

  current_igf:
    class: "FORECAST / CURRENT FINANCIAL VIEW while open"

physical_findings:
  - "Finance updates the Excel repeatedly during the month."
  - "Each upload generates/versiona financial information."
  - "is_current means latest version, NOT final close."
  - "No proven is_final/source=FINANZAS/kind marker exists."
  - "On the last calendar day the existing GET still treats the period as PROY."
  - "Only after the month has elapsed can venta_ton resolve to complete ARR actual."
  - "Other financial variables remain sourced from the latest Finance upload."
  - "Displayed util_oper/resultado may include recalculation/overlay and cannot automatically be equated with raw Finance Excel."
  - "Calendar date alone does not make a version ACTUAL."
  - "Complete ARR alone does not make financial variables FINAL."
  - "Finalization currently exists as human/business procedure, not proven persisted state."

architecture_principle: >
  Do not create another financial source. Add the minimum governance/finality
  contract necessary to identify which existing Finance version is the
  authoritative financial close for exact plant + YYYY-MM.

canonical_truth_classes:
  ACTUAL_COMMERCIAL: "ARR"
  TARGET_COMMITMENT: "igf_meta"
  FORECAST: "IGF before financial finalization"
  ACTUAL_FINANCIAL: >
    Only an explicitly finalized Finance-owned version for a closed period,
    combined with the correct commercial actual where required.
  DERIVED_MODEL: "forecast_mensual and other derived models"

core_question: >
  What minimum physical finalization contract is required so Director IA can
  distinguish FORECAST, NOT_FINAL and ACTUAL_FINANCIAL without inference?

finalization_options:

  A_extend_existing_version:
    description: >
      Add explicit finalization/provenance semantics to the existing
      igf.versions record for exact YYYY-MM/version.

  B_separate_finalization_registry:
    description: >
      Keep igf.versions unchanged and create a governed registry/reference that
      identifies the authoritative finalized Finance version.

  C_latest_version_plus_closed_month:
    description: >
      Infer final from is_current/latest + elapsed calendar month.

  D_complete_arr_plus_latest_finance_version:
    description: >
      Infer final from complete ARR + latest Finance version.

selection_requirement:
  - "Compare A/B/C/D."
  - "Select exactly one."
  - "C and D must be rejected unless a persisted business guarantee proves them safe."
  - "Prefer the smallest explicit governance mechanism."
  - "Do not create duplicate financial values."

minimum_finalization_contract:
  identity:
    - "exact plant/company canonical identity"
    - "year"
    - "month"
    - "igf version id/version_number"

  required_semantics:
    - "financial truth class"
    - "finalization status"
    - "source owner = FINANZAS"
    - "finalized_at"
    - "finalized_by or approving process"
    - "provenance/reference to Finance upload"

  desirable:
    - "source file/hash/reference if available"
    - "superseded relationship if a final close is corrected"

state_model_candidates:
  preferred_minimum:
    - "FORECAST"
    - "FINAL"

  if_business_requires_revision:
    candidates:
      - "FORECAST"
      - "FINAL"
      - "SUPERSEDED"

  rule: >
    Do not introduce workflow states that the business does not need.
    Determine minimum defensible state machine.

finalization_invariants:
  - "is_current != is_final"
  - "latest != final"
  - "month elapsed != final"
  - "complete ARR != financial final"
  - "Finance version must be explicitly designated as authoritative close"
  - "one authoritative FINAL version per exact plant/month unless architecture explicitly supports correction/supersession"
  - "no carry-forward"
  - "no silent overwrite"

reopening_and_correction:
  audit_question: >
    What happens if Finance corrects July after July was already finalized?

  must_design:
    - "whether previous FINAL becomes SUPERSEDED"
    - "whether new final gets new version"
    - "whether history remains queryable"
    - "whether Director IA defaults to latest authoritative FINAL"
    - "how prior close versions remain auditable"

  prohibit:
    - "destructive overwrite of historical financial evidence"

raw_vs_computed_boundary:
  critical_question: >
    Which values constitute Finance-provided evidence and which values are
    subsequently recalculated/overlaid by IGF runtime?

  require_mapping_for:
    - "venta_ton"
    - "margen_kg"
    - "com_desc_kg"
    - "gasto_kg"
    - "impuesto_kg"
    - "hg_pct"
    - "hg_kg"
    - "bancos_planta_kg"
    - "provision_planta_kg"
    - "util_oper_kg"
    - "util_oper_importe"
    - "gtos_apoyos_corp_kg"
    - "bancos_corp_kg"
    - "otros_programas_kg"
    - "inversiones_kg"
    - "resultado_final_kg"
    - "resultado_final_importe"

  classify_each_as:
    - "FINANCE_PROVIDED"
    - "ARR_ACTUAL"
    - "RUNTIME_COMPUTED"
    - "DERIVED"
    - "UNKNOWN"

  invariant: >
    Finalizing a Finance version does not automatically turn a runtime-derived
    value into Finance-provided actual evidence.

actual_financial_definition: >
  ACTUAL_FINANCIAL must describe exactly which finalized values are official
  Finance evidence and which close outputs are computations over finalized
  evidence. Director IA must preserve that distinction in provenance.

ARR_reconciliation:
  requirements:
    - "ARR remains canonical ACTUAL_COMMERCIAL."
    - "Do not overwrite ARR with Excel venta."
    - "If finalized Finance/IGF sale differs from ARR actual, expose reconciliation gap."
    - "Do not let GPT silently choose one."

  candidate_code:
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"

month_close_result_future_contract:
  sales:
    actual: "ARR"
    target: "igf_meta"
    forecast: "historical/current IGF where appropriate"

  financial:
    actual: "explicit finalized Finance close"
    target: "igf_meta"
    forecast: "IGF forecast"

  output_requirements:
    - "truth_class"
    - "period"
    - "version"
    - "finalization"
    - "provenance"
    - "limitations"

pre_meeting_future_contract:
  open_month:
    compare:
      - "TARGET_COMMITMENT"
      - "FORECAST"
      - "ACTUAL_COMMERCIAL_TO_DATE"

  closed_final_month:
    compare:
      - "TARGET_COMMITMENT"
      - "ACTUAL_FINANCIAL"
      - "ACTUAL_COMMERCIAL"
      - "historical FORECAST only if requested/defensible"

  closed_not_final:
    behavior:
      - "state NOT_FINAL"
      - "do not present financial actual"

historical_versions:
  audit:
    - "confirm created_at/uploaded_at/version timestamps"
    - "determine whether versions can support point-in-time historical forecast"

  future_questions:
    - "¿Cómo proyectábamos cerrar el 15 de agosto?"
    - "¿Cuándo empezó a deteriorarse el resultado?"
    - "¿Qué forecast teníamos antes del cierre?"
    - "¿Cuánto cambió forecast vs cierre real?"

  rule: >
    Do not promise date-as-of queries unless version timestamps and effective
    semantics physically support them.

authorization:
  established: >
    Financial ACTUAL may be more sensitive than IGF forecast.

  audit:
    - "current roles/permissions for IGF"
    - "whether actual P&L requires a new explicit capability/permission"
    - "whether plant-scoped authorization remains sufficient"

  invariant:
    - "do not automatically inherit acceso_igf_forecast_kpis"
    - "fail closed"
    - "no cross-plant"

  output:
    - "AUTHZ_READY"
    - "AUTHZ_DECISION_REQUIRED"

evidence_contract:
  require:
    - "exact source"
    - "truth class"
    - "exact period"
    - "version"
    - "final status"
    - "source owner"
    - "provenance"
    - "computed-vs-provided distinction"

  no_fallback:
    - "FORECAST must never silently substitute ACTUAL_FINANCIAL"
    - "TARGET must never silently substitute ACTUAL_FINANCIAL"
    - "latest version must never silently substitute FINAL"

failure_semantics:
  assess:
    - "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_NOT_FINAL"
    - "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
    - "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE"
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
    - "FINANCIAL_ACTUAL_UNAUTHORIZED"

G2_G3_G8:
  prior:
    G2: "REQUIRED in this architecture"
    G3: "REQUIRED in this architecture"
    G8: "N/A previously"

  requirement: >
    Inspect Constitution/EKE/IES/Reasoning contracts and determine the exact
    minimum upstream contract changes required BEFORE implementation.

  rule:
    - "Do not modify contracts in this task."
    - "Identify exact sections/invariants affected."
    - "No implementation may precede required contract work."

implementation_boundary:
  do_not_implement:
    - "is_final column"
    - "registry table"
    - "SQL migration"
    - "upload change"
    - "VBA change"
    - "Director IA loader"
    - "month_close_result changes"
    - "permissions"
    - "UI"
    - "tests"

readiness_output:
  must_determine:
    - "A/B/C/D finalization architecture"
    - "minimum state machine"
    - "canonical final identity"
    - "correction/supersession semantics"
    - "raw Finance vs computed mapping"
    - "ACTUAL_FINANCIAL exact definition"
    - "ARR reconciliation"
    - "version history capability"
    - "authorization decision"
    - "failure semantics"
    - "G2/G3/G8 exact impact"
    - "implementation ordering"
    - "READY / READY_WITH_LIMITS / STOPPED / BLOCKED"

implementation_ordering:
  if_contract_changes_required:
    next_task_must_be_contract_first: true

  rule: >
    Do not propose implementation as NEXT_TASK if G2/G3 requires upstream
    contract work first.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "SQL execution"
  - "schema changes"
  - "VBA changes"
  - "permissions changes"
  - "runtime changes"
  - "matrix changes"
  - "contract modifications"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Existing Finance source remains canonical; no duplicate financial source invented."
  - "A/B/C/D compared and exactly one selected."
  - "is_current/latest explicitly separated from FINAL."
  - "Minimum finalization state machine determined."
  - "Corrections after finalization addressed."
  - "Finance-provided vs ARR vs runtime-computed fields mapped."
  - "ACTUAL_FINANCIAL definition is explicit."
  - "ARR reconciliation behavior defined."
  - "Historical version feasibility determined."
  - "Authz impact determined."
  - "Failure semantics determined."
  - "G2/G3/G8 exact impact determined."
  - "Correct next-task ordering enforced."
  - "Baseline remains 52.5%."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."

next_task_policy:
  rule: "Propose exactly one task. Do not authorize or execute."

  if_G2_G3_contract_work_required:
    preferred_class: "ARCH/CONTRACT task required by gate"

  if_no_contract_work_required_and_ready:
    preferred: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"

expected_terminal_state:
  - "DONE_PENDING_REVIEW if architecture is defensible."
  - "STOPPED if a new human business decision is required."
  - "BLOCKED if current physical model cannot support safe finalization."

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001.md