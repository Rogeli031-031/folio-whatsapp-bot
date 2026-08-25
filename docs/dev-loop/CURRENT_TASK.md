# CURRENT_TASK

task_id: "AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

mode:
  type: "PHYSICAL_SOURCE_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Determinar si existe en el sistema una fuente física, canónica y defendible de
  resultado financiero ACTUAL de cierre mensual por planta.

  La auditoría debe distinguir estrictamente ACTUAL de TARGET_COMMITMENT,
  FORECAST y DERIVED_MODEL.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

prior_evidence:
  plaud_eval_002:
    remaining_bottleneck: "close_meeting_financial_actual_unsupported"
    frequency: "4/4 juntas"
    affected_real_intents: "5/26"
    conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"

known_truth_classes:

  ACTUAL:
    currently_supported:
      - "sales"
      - "channel mix"
      - "discount"
      - "client movement"
    source: "ARR actuals"

  TARGET_COMMITMENT:
    source: "igf_meta"
    meaning: "META/COMPROMISO gerencial firmado"

  FORECAST:
    source: "IGF compromiso/runtime"

  DERIVED_MODEL:
    source: "forecast_mensual / derived commercial models"

critical_question: >
  Is there a physically recorded monthly financial ACTUAL for each plant that
  Director IA simply does not consume yet?

canonical_real_questions:
  - "¿Cómo quedó la rentabilidad real del mes?"
  - "¿Cuál fue la utilidad operativa real?"
  - "¿Cuál fue el resultado final real?"
  - "¿Vendimos más pero ganamos menos?"
  - "¿Por qué tuvimos pérdida operativa?"
  - "¿Cómo quedamos realmente contra la meta de rentabilidad?"

physical_search_scope:

  repository_wide_terms:
    - "utilidad operativa"
    - "util_oper"
    - "utilidad final"
    - "resultado final"
    - "resultado_final"
    - "margen real"
    - "margen_kg"
    - "hg_kg"
    - "hg_pct"
    - "ingreso"
    - "gastos"
    - "bancos"
    - "inversiones"
    - "resultado"
    - "real"
    - "actual"
    - "cierre"
    - "contabilidad"
    - "estado de resultados"
    - "ER"
    - "IGF"
    - "ARR"
    - "forecast_mensual"

  inspect:
    - "server.js"
    - "lib/"
    - "sql/"
    - "frontend"
    - "dashboard routes"
    - "IGF loaders"
    - "ARR loaders"
    - "GASTOS"
    - "INVERSIONES"
    - "presupuestos"
    - "folios"
    - "uploaded Excel/VBA semantics already documented"
    - "docs"

source_candidates:

  A_existing_actual_financial_table:
    description: >
      A physical DB source containing monthly realized financial results.

  B_reconstructable_actual_from_existing_atomic_sources:
    description: >
      Actual financial result can be recomputed defensibly from physical actual
      sources already present.

  C_existing_IGF_or_forecast_misnamed:
    description: >
      Current apparent "financial result" sources are forecast/model values only.

  D_missing_physical_source:
    description: >
      No defensible monthly financial actual exists in the current system.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"

actual_financial_fields_to_find:

  desired:
    - "actual operating profit amount"
    - "actual operating profit $/kg"
    - "actual final result amount"
    - "actual final result $/kg"
    - "actual margin"
    - "actual expenses"
    - "actual investments"
    - "actual corporate supports"
    - "actual banks/financial charges where applicable"

  rule: >
    A field name is not sufficient. Determine semantics and provenance.

reconstruction_audit:

  if_candidate_B:
    mandatory:
      - "list every component"
      - "identify actual source for each component"
      - "prove same plant"
      - "prove same month"
      - "prove same accounting/business semantics"
      - "prove formula exists in governed product logic"
      - "prove no forecast component enters"

  prohibited:
    - "invent formula"
    - "reuse igf_meta target as actual component"
    - "reuse IGF forecast as actual component"
    - "mix actual and forecast"
    - "derive accounting actual from incomplete operational signals"

  readiness_rule: >
    If any material component is missing or forecast-derived, candidate B is not
    defensible as financial actual.

IGF_audit:

  determine:
    - "what compromiso_lines physically represent"
    - "whether any row is final actual or all are forecast/projection"
    - "version semantics"
    - "closed-month behavior"
    - "whether latest version after close becomes actual or remains forecast"
    - "whether dashboard wording distinguishes projection vs result"

  invariant: >
    Closed-month availability does not automatically convert forecast into actual.

igf_meta_audit:

  preserve:
    classification: "TARGET_COMMITMENT"

  invariant: >
    Never reinterpret igf_meta as actual.

forecast_mensual_audit:

  preserve:
    classification: "DERIVED_MODEL"

ARR_audit:

  determine:
    actual_financial_scope:
      - "does ARR contain only commercial actuals?"
      - "does it include monetary actuals sufficient for operating/final result?"
      - "are expenses/investments/corporate charges represented?"

  invariant: >
    Actual sales + discount alone are insufficient to call something operating
    or final profit.

gastos_inversiones_audit:

  determine:
    - "physical actual sources"
    - "month grain"
    - "plant grain"
    - "approved/paid/incurred semantics"
    - "whether they map to IGF buckets"
    - "whether all financial components exist"

  rule: >
    Do not assume Folio importe or paid amount equals accounting expense in the
    same month unless existing business logic explicitly establishes it.

accounting_boundary:

  critical: true

  distinguish:
    - "operational support/Folio amount"
    - "cash payment"
    - "accounting expense"
    - "forecast expense"
    - "target expense"

  prohibited:
    - "collapse these into one number"

monthly_close_model_impact:

  if_actual_source_exists:
    determine:
      - "how month_close_result should load it"
      - "what fields can move from UNSUPPORTED to ACTUAL"
      - "whether pre_meeting_brief can consume it"

  if_actual_source_missing:
    required_output: >
      Confirm FINANCIAL_ACTUAL_UNSUPPORTED as MISSING_PHYSICAL_DATA rather than
      missing infrastructure.

real_meeting_impact:

  affected_intents:
    - "A4"
    - "M1"
    - "M3"
    - "Q1"
    - "Q3"

  evaluate:
    - "which could become answerable if actual exists"
    - "which would remain causal/interpretive gaps"

truth_boundary:

  safe:
    - "actual operating result was X"
    - "actual final result was Y"
    - "target was A"
    - "forecast was B"

  unsafe:
    - "we lost money because commissions increased" unless evidence supports causality
    - "higher sales caused lower profit"
    - "forecast equals actual"

failure_class_output:

  if_source_exists_but_unwired:
    class: "MISSING_INFRASTRUCTURE"

  if_no_defensible_source:
    class: "MISSING_DATA"

  if_only_reconstruction_requires_new_business_logic:
    class: "MISSING_DATA_OR_NEW_ACCOUNTING_MODEL"

contract_audit:

  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "whether connecting actual financial source is runtime-only"
    - "G2/G3/G8"

readiness_output:

  must_determine:
    - "ACTUAL financial source exists: YES/NO"
    - "canonical source"
    - "grain"
    - "fields"
    - "semantics"
    - "source A/B/C/D"
    - "whether reconstruction is defensible"
    - "IGF remains forecast or not"
    - "month_close_result impact"
    - "pre_meeting impact"
    - "failure class"
    - "G2/G3/G8"
    - "percentage effect"

next_task_policy:

  if_actual_exists_and_is_unwired:
    propose_exactly_one: "ARCH-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001"

  if_actual_missing:
    propose_exactly_one: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001"

  rule: "Do not authorize or execute."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "SQL execution"
  - "schema"
  - "new accounting model"
  - "new financial formula"
  - "Plaud runtime"
  - "matrix"
  - "contracts modification"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Repository-wide financial actual source search completed."
  - "A/B/C/D classified."
  - "Actual vs target vs forecast vs derived preserved."
  - "IGF closed-month semantics audited."
  - "ARR financial sufficiency audited."
  - "Gastos/Inversiones actual semantics audited."
  - "Reconstruction defensibility explicitly decided."
  - "No invented accounting formula."
  - "Failure class assigned."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001.md