# CURRENT_TASK

task_id: "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

mode:
  type: "REAL_MEETING_REEVALUATION_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false
  plaud_runtime_integration: false

objective: >
  Repetir exactamente la evaluación AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001
  contra las mismas 26 intenciones reales provenientes de las mismas juntas
  históricas de Plaud, después de integrar month_close_result.

  Medir el efecto real de la nueva capability sin cambiar muestra, criterios,
  categorías ni denominador.

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"
  conversation: "CONVERSATION_BASE_READY_WITH_LIMITS"

prior_eval:
  task: "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
  N: 26

  rates:
    anticipated: "4/26 = 15.4%"
    prepared: "9/26 = 34.6%"
    unsupported: "6/26 = 23.1%"
    partially_answerable: "11/26"

new_capability_since_eval_001:
  intent: "month_close_result"

  provides:
    - "monthly ACTUAL sales"
    - "TARGET_COMMITMENT from igf_meta"
    - "actual vs target delta"
    - "attainment %"
    - "CASA/COMISIONISTA monthly mix"
    - "monthly weighted discount/kg"
    - "new/lost/movers"
    - "financial.target"
    - "financial.forecast separately"
    - "financial.actual = UNSUPPORTED_METRIC"
    - "actions"
    - "information gaps"

  truth_classes:
    - "ACTUAL"
    - "TARGET_COMMITMENT"
    - "FORECAST"
    - "DERIVED_MODEL"

  target_rule:
    - "exact YYYY-MM"
    - "is_current"
    - "no carry-forward"
    - "TARGET_MISSING_FOR_PERIOD"

fixed_source_packet:
  invariant: >
    Use exactly the same 26 real intents from EVAL-001.
    Do not add, remove, merge, split or paraphrase them into a new sample.

  meetings:
    - "Puebla"
    - "Acapulco"
    - "Morelos"
    - "Querétaro/San Luis"

classification:
  values:
    - "ANTICIPATED"
    - "GAP_DETECTED"
    - "FOLLOWUP_ANSWERABLE"
    - "PARTIALLY_ANSWERABLE"
    - "MISSING_CAPABILITY"
    - "MISSING_DATA"
    - "NOT_DEFENSIBLE_AS_OF"

classification_invariant: >
  Use exactly the same definitions as EVAL-001.

hindsight_control:
  unchanged: true

  rule: >
    Information first introduced inside the historical meeting does not count as
    pre-meeting knowledge.

  correct_credit: >
    If Director IA could detect that an explanation was absent beforehand, score
    GAP_DETECTED rather than ANTICIPATED.

evaluation_method:

  for_each_of_26:
    record:
      - "meeting"
      - "real question/intent"
      - "EVAL-001 classification"
      - "EVAL-002 classification"
      - "changed? yes/no"
      - "capability responsible for change"
      - "physical/runtime evidence"
      - "limitation"

  required_change_labels:
    - "PARTIALLY_ANSWERABLE -> ANTICIPATED"
    - "PARTIALLY_ANSWERABLE -> FOLLOWUP_ANSWERABLE"
    - "MISSING_CAPABILITY -> ANTICIPATED"
    - "MISSING_CAPABILITY -> FOLLOWUP_ANSWERABLE"
    - "no change"
    - "other, with justification"

credit_policy:

  initial_brief_credit:
    rule: >
      ANTICIPATED only if pre_meeting_brief/month_close_result can surface the
      needed fact/risk without unrelated manual investigation.

  followup_credit:
    rule: >
      FOLLOWUP_ANSWERABLE if the issue is naturally reachable from the meeting
      context through an existing canonical capability.

  partial_credit:
    rule: >
      PARTIALLY_ANSWERABLE if only part of the executive demand is defensible.

  missing_target:
    rule: >
      If historical target for that exact period is not defensibly present,
      do not assume target availability merely because runtime now supports
      igf_meta.

  financial_actual:
    rule: >
      financial.actual remains unsupported. Do not upgrade profitability/actual
      income questions beyond what the physical sources support.

mandatory_focus:

  month_result_vs_target:
    questions:
      - "cómo salió la venta"
      - "meta vs resultado"
      - "cuánto faltó"
      - "cumplimiento %"

  mix_and_discount:
    questions:
      - "CASA vs comisionistas"
      - "qué cambió en mix"
      - "qué pasó con descuentos/comisiones"

  client_movement:
    questions:
      - "qué clientes explican"
      - "nuevos/perdidos"
      - "movers"

  profitability:
    questions:
      - "vendimos más pero ganamos menos"
      - "por qué cayó margen/rentabilidad"
      - "pérdida operativa"

    boundary: >
      month_close_result may improve the commercial side, but financial.actual
      remains unsupported unless physically available.

  actions:
    questions:
      - "qué quedó pendiente"
      - "qué compromisos siguen abiertos"

  next_month:
    questions:
      - "qué se hará"
      - "meta siguiente defendible"

    rule: >
      Do not credit current month target capability for next-month planning
      unless the exact source/capability supports it.

metrics:

  calculate_again:
    anticipated_rate:
      formula: "ANTICIPATED / 26"

    prepared_rate:
      formula: "(ANTICIPATED + GAP_DETECTED + FOLLOWUP_ANSWERABLE) / 26"

    unsupported_rate:
      formula: "(MISSING_CAPABILITY + MISSING_DATA + NOT_DEFENSIBLE_AS_OF) / 26"

    partially_answerable:
      report_count: true

  delta_vs_eval_001:
    required:
      - "anticipated_rate delta"
      - "prepared_rate delta"
      - "unsupported_rate delta"
      - "PARTIALLY_ANSWERABLE delta"

  important: >
    These remain audit-only measures, not permanent product KPIs.

causal_attribution:

  question: >
    How much of the improvement is specifically attributable to month_close_result?

  required:
    - "count intents upgraded because of month_close_result"
    - "list those intents"
    - "do not attribute unchanged intents to the new capability"

real_meeting_question_families:
  preserve:
    - "WHAT_HAPPENED"
    - "WHY"
    - "WHO_MOVED_IT"
    - "WHAT_CHANGED"
    - "WHAT_IS_OPEN"
    - "WHAT_NEXT"
    - "WHAT_IS_MISSING"

family_level_output:
  for_each_family:
    report:
      - "count"
      - "prepared count"
      - "remaining weakness"

critical_question:
  text: >
    After month_close_result, would Director IA now enter these same historical
    meetings materially better prepared?

  answer_required:
    - "YES / PARTIALLY / NO"
    - "with evidence"

conversation_readiness:
  current: "CONVERSATION_BASE_READY_WITH_LIMITS"

  reassess:
    rule: >
      Change only if real-meeting evidence reveals a structural conversation
      regression.

  likely_outcome_if_no_regression: >
    Preserve CONVERSATION_BASE_READY_WITH_LIMITS.

next_bottleneck:

  exactly_one: true

  selection_rule: >
    Select the largest remaining repeated gap across the same 26 real intents
    after month_close_result.

  candidates_may_include:
    - "actual profitability / operating result"
    - "portfolio/accounts receivable"
    - "supply capacity"
    - "next-month target/planning"
    - "external-context intelligence"
    - "other repeated demonstrated gap"

  do_not_select:
    - "a one-off issue"
    - "something already solved"
    - "missing data mislabeled as infrastructure"

  required:
    - "name"
    - "failure class"
    - "frequency across meetings"
    - "affected real intents"
    - "physical/runtime cause"
    - "what it unlocks"
    - "what it does not solve"

Plaud_boundary:
  runtime: false
  ingestion: false

  this_task: >
    Same curated historical source packet as EVAL-001 only.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "new sample"
  - "new Plaud meetings"
  - "Plaud runtime integration"
  - "SQL"
  - "schema"
  - "contracts"
  - "matrix changes"
  - "permanent KPI"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Exactly same N=26 sample used."
  - "Every EVAL-001 classification compared against EVAL-002."
  - "Change matrix produced."
  - "No hindsight leakage."
  - "New rates calculated."
  - "Rate deltas calculated."
  - "Improvements attributable to month_close_result identified."
  - "Family-level weaknesses reported."
  - "Conversation readiness reassessed."
  - "Exactly one remaining bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task:
  exactly_one: true
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002.md