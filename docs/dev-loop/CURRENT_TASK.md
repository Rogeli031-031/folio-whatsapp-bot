# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

mode:
  type: "ARCHITECTURE_GAP_READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Diseñar la fuente física mínima, gobernada y defendible de resultado
  financiero ACTUAL mensual por planta, necesaria para que Director IA pueda
  responder sobre utilidad operativa real, resultado final real, rentabilidad
  real y cumplimiento financiero contra TARGET_COMMITMENT sin usar forecast,
  Folios o reconstrucciones incompletas como sustitutos.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001"
  finding: "FINANCIAL ACTUAL SOURCE EXISTS: NO"
  selected_class: "C — apparent result sources are forecast/model"
  failure_class: "MISSING_DATA"
  reconstruction: "NOT_DEFENSIBLE"
  conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"

known_truth_classes:

  ACTUAL_COMMERCIAL:
    source: "ARR"
    includes:
      - "sales kg/ton"
      - "channel mix"
      - "discount"

  TARGET_COMMITMENT:
    source: "igf_meta"
    meaning: "monthly managerial signed commitment"

  FORECAST:
    source: "IGF"

  DERIVED_MODEL:
    source: "forecast_mensual / derived models"

  ACTUAL_FINANCIAL:
    status: "MISSING_PHYSICAL_DATA"

north_star: >
  For one plant and one closed month, Director IA must eventually be able to say:
  actual operating profit = X,
  actual final result = Y,
  target/commitment = A,
  forecast was B,
  attainment vs target = Z,
  with all truth classes kept separate and fully sourced.

canonical_questions_future:
  - "¿Cuál fue la utilidad operativa real de Puebla en julio?"
  - "¿Cuál fue el resultado final real?"
  - "¿Cómo quedamos contra la meta de rentabilidad?"
  - "¿Qué diferencia hubo entre la meta, el forecast y el cierre real?"
  - "Vendimos más, ¿pero realmente ganamos menos?"
  - "¿Dónde se explicó la desviación?"

architecture_question: >
  What should become the canonical physical source of ACTUAL_FINANCIAL?

source_options:

  A_existing_external_accounting_or_erp:
    description: >
      Integrate an authoritative accounting/ERP source that already owns the
      monthly actual financial close.

  B_controlled_monthly_actual_upload:
    description: >
      Create a governed monthly upload/import of the signed/approved actual
      financial close, analogous in discipline to IGF META but explicitly
      classified as ACTUAL.

  C_reconstruct_from_operational_sources:
    description: >
      Compute financial actual from ARR + Folios + operational sources.

  D_relabel_final_IGF_version:
    description: >
      Treat the final/latest IGF forecast version after month close as actual.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one preferred canonical strategy"
    - "reject C/D unless evidence proves them defensible"

preferred_principle: >
  Financial actual should come from the system/process that owns the official
  close, not from Director IA reconstruction.

source_discovery_audit:

  search_outside_current_director_runtime_conceptually:
    determine_if_business_has:
      - "ERP accounting close"
      - "monthly P&L"
      - "estado de resultados"
      - "contabilidad export"
      - "signed close workbook"
      - "official management close report"
      - "Power BI actual financial source"
      - "other authoritative monthly close artifact"

  output:
    - "known existing business source"
    - "unknown / needs human confirmation"
    - "not available"

  rule: >
    Do not invent existence of an external ERP/accounting source if repository
    evidence does not prove it. Mark human confirmation needed if necessary.

minimum_data_contract:

  identity:
    - "plant_id or canonical plant_code"
    - "year"
    - "month"
    - "version"
    - "is_current/final"
    - "source_owner"
    - "source_timestamp"
    - "approval/finalization status if available"

  actual_financial_core:
    preferred_fields:
      - "sales_ton_actual if source owns it"
      - "margin_kg_actual"
      - "com_desc_kg_actual"
      - "gasto_kg_actual"
      - "impuesto_kg_actual"
      - "hg_pct_actual"
      - "hg_kg_actual"
      - "bancos_planta_kg_actual"
      - "provision_planta_kg_actual"
      - "util_oper_kg_actual"
      - "util_oper_importe_actual"
      - "gtos_apoyos_corp_kg_actual"
      - "bancos_corp_kg_actual"
      - "otros_programas_kg_actual"
      - "inversiones_kg_actual"
      - "resultado_final_kg_actual"
      - "resultado_final_importe_actual"

  rule: >
    Field names may mirror IGF META/FORECAST only if business semantics are
    actually aligned. Do not force symmetry where actual accounting concepts
    differ.

semantic_contract:

  ACTUAL_FINANCIAL:
    definition: >
      Official realized monthly financial close approved by the owning business
      process/source.

  TARGET_COMMITMENT:
    source: "igf_meta"

  FORECAST:
    source: "IGF"

  invariant:
    - "actual != target"
    - "actual != forecast"
    - "final forecast != actual"
    - "paid Folio != accounting expense"
    - "reviewable support != savings"

finalization_semantics:

  determine:
    - "what makes a month financial close final"
    - "who owns approval"
    - "whether revisions after close are allowed"
    - "how versioning works"
    - "whether reopened months exist"

  required_state_candidate:
    - "DRAFT"
    - "FINAL"
    - "SUPERSEDED"

  note: >
    Use actual business states if they exist. Do not create states in this task
    unless selected architecture requires them conceptually.

versioning:

  requirement:
    - "exact plant"
    - "exact YYYY-MM"
    - "explicit current/final version"
    - "no carry-forward"
    - "no silent overwrite"

  audit:
    - "whether igf_meta-style versioning can be reused conceptually"
    - "whether actual close needs stricter approval metadata"

approval_and_provenance:

  required:
    - "source_owner"
    - "loaded_at / imported_at"
    - "period"
    - "version"
    - "finalization status"
    - "provenance/source reference"

  preferred:
    - "approved_by"
    - "approved_at"
    - "source document/hash if import-based"

  purpose: >
    Director IA must be able to say where the actual close came from.

reconciliation_with_ARR:

  rule: >
    If financial actual source includes sales, do not silently overwrite ARR
    commercial actual.

  audit:
    - "how to compare financial-close sales vs ARR sales"
    - "whether one is operational and one accounting"
    - "how differences should be surfaced"

  safe_behavior:
    - "show discrepancy"
    - "do not force reconciliation in GPT"

reconciliation_with_target_and_forecast:

  future_month_close_result:
    should_expose:
      - "sales.actual"
      - "sales.target"
      - "sales.forecast if relevant"
      - "financial.actual"
      - "financial.target"
      - "financial.forecast"

  calculations:
    if_actual_and_target:
      - "delta_actual_vs_target"
      - "attainment_actual_vs_target"

    if_actual_and_forecast:
      - "forecast_error / delta_actual_vs_forecast"

  invariant: >
    Label every comparison by truth class.

data_quality_and_missing:

  codes:
    - "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_NOT_FINAL"
    - "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE"
    - "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"

  rule: >
    Missing actual must never fall back to forecast.

security_authz:

  requirements:
    - "same plant authorization"
    - "financial data may require stricter roles"
    - "fail closed"
    - "no cross-plant"

  audit:
    - "whether GA/GG/AD/ZP or other role rules apply"
    - "whether actual financial result is more sensitive than existing IGF"

privacy_governance:
  rule: >
    Financial actual source should be treated as governed financial evidence,
    not ordinary conversational memory.

read_model_future_impact:

  month_close_result:
    future_upgrade:
      financial.actual: "SUPPORTED from canonical source"
      financial.target: "igf_meta"
      financial.forecast: "IGF"

  pre_meeting_brief:
    future_upgrade:
      - "actual profitability"
      - "actual operating result"
      - "actual final result"
      - "actual vs target"
      - "actual vs forecast"

  Plaud_eval:
    expected_unlock:
      - "A4"
      - "M1"
      - "M3"
      - "Q1"
      - "Q3"

  boundary: >
    Even with financial actual, causal WHY questions may still require context.

implementation_paths:

  if_A_external_source_selected:
    next_architecture_needed:
      - "connector/import contract"
      - "canonical mapping"
      - "read-only loader"

  if_B_upload_selected:
    next_architecture_needed:
      - "upload schema"
      - "version/finalization semantics"
      - "validation"
      - "source provenance"

  prohibit_now:
    - "implementation"
    - "schema creation"
    - "upload UI"
    - "ERP connector"

human_decision_points:

  determine_if_needed:
    - "What business process currently owns the official financial close?"
    - "Does an authoritative monthly file/report already exist?"
    - "Who signs/approves it?"
    - "Is actual close revised after approval?"

  rule: >
    If source ownership cannot be determined from repository evidence, return
    STOPPED with a precise human decision request rather than inventing source
    architecture.

contract_audit:

  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"
    - "G8"

  likely: >
    New physical evidence source may require architecture/data contract review
    even if runtime remains read-only.

readiness_output:

  must_determine:
    - "Preferred source strategy A/B/C/D"
    - "Whether official external source already exists"
    - "Source owner"
    - "Minimum data contract"
    - "Finalization/version semantics"
    - "Approval/provenance requirements"
    - "Authz requirements"
    - "Reconciliation rules"
    - "Missing/error codes"
    - "month_close_result future integration"
    - "pre_meeting future integration"
    - "Plaud real-question impact"
    - "G2/G3/G8"
    - "READY / READY_WITH_LIMITS / STOPPED / BLOCKED"

first_slice_candidate:

  preferred_if_source_owner_known:
    scope: >
      One plant + one closed month + official financial actual core fields +
      finalization/provenance + read-only retrieval.

  defer:
    - "automatic accounting reconciliation"
    - "causal analysis"
    - "multi-company consolidation"
    - "write-back to ERP"
    - "Plaud integration"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code"
  - "tests"
  - "SQL execution"
  - "schema creation"
  - "ERP integration"
  - "upload implementation"
  - "new accounting formula"
  - "Plaud runtime"
  - "matrix"
  - "contracts modification"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "A/B/C/D source strategies compared."
  - "C/D rejected or justified."
  - "Official source ownership investigated."
  - "Minimum financial actual contract defined."
  - "Actual/target/forecast separation preserved."
  - "Finalization semantics defined or identified as human gap."
  - "Version/provenance rules defined."
  - "Authz impact assessed."
  - "Reconciliation boundaries defined."
  - "Missing/error semantics defined."
  - "Plaud affected intents mapped."
  - "G2/G3/G8 determined."
  - "Exactly one next task proposed if READY."
  - "If source ownership unresolved, STOPPED with one precise human decision."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"

  if_source_owner_unknown:
    propose_exactly_one: "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-OWNER-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if canonical source strategy and owner are known.
  STOPPED if human business ownership/source decision is required.
  BLOCKED if no viable source path exists.

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001.md