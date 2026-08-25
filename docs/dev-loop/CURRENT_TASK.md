# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

mode:
  type: "READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Determinar la arquitectura mínima y segura para que Director IA pueda construir
  un resultado ejecutivo mensual de cierre por planta, con ventas, canal,
  descuento y rentabilidad/resultado financiero físicamente defendibles, y
  compararlo contra una meta SOLO si existe una fuente física canónica de meta.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
  bottleneck: "close_meeting_month_result_vs_target_not_composed"
  failure_class: "MISSING_INFRASTRUCTURE"

conversation_readiness:
  status: "CONVERSATION_BASE_READY_WITH_LIMITS"

north_star: >
  Ante preguntas reales de cierre como “¿cómo cerramos?”, “¿contra la meta?”,
  “¿por qué vendimos más pero ganamos menos?” o “¿qué cambió en el mix?”,
  Director IA debe responder con un marco mensual coherente y con fronteras
  explícitas entre actual, meta, forecast y rentabilidad.

canonical_questions:
  - "¿Cómo cerró Puebla el mes?"
  - "¿Cuánto vendimos contra la meta?"
  - "¿Qué canal explicó el resultado?"
  - "¿Qué pasó con el descuento?"
  - "¿Vendimos más pero ganamos menos?"
  - "¿Cómo quedó la rentabilidad?"
  - "¿Qué clientes se ganaron o perdieron?"
  - "¿Qué quedó pendiente del mes?"

semantic_policy:
  invariant: "tests semánticos, no phrasebook"

critical_physical_audit:

  monthly_actual_sales:
    determine:
      - "physical source"
      - "plant scope"
      - "calendar month semantics"
      - "kg/ton aggregation"
      - "channel split"
      - "closed-month stability"
      - "whether historical month is immutable or late-adjusted"

  target/meta:
    critical: true

    search_repository_wide:
      - "meta_venta"
      - "metas"
      - "objetivo"
      - "presupuesto"
      - "target"
      - "forecast"
      - "ARR"
      - "IGF"
      - "frontend"
      - "server.js"
      - "PostgreSQL queries"
      - "configuration"
      - "monthly planning"

    determine:
      - "whether canonical monthly sales target exists"
      - "grain: plant/month/channel?"
      - "source owner"
      - "version/currentness"
      - "whether target can change after month close"

    invariant: >
      If no canonical physical target exists, do not implement “vs meta” as if it
      were known.

  monthly_discount:
    determine:
      - "physical source"
      - "calendar month grain"
      - "SUM(monto)/SUM(kg)"
      - "channel split if available"
      - "actual vs forecast"

  monthly_channel_mix:
    determine:
      - "CASA"
      - "COMISIONISTA"
      - "total"
      - "kg/ton"
      - "share %"
      - "same month"

  monthly_clients:
    determine:
      - "new clients"
      - "lost clients"
      - "largest movers"
      - "client key"
      - "month-over-month comparison"
      - "whether DICF already has safe definitions"

  monthly_financial_result:
    critical: true

    search:
      - "IGF"
      - "utilidad operativa"
      - "utilidad final"
      - "margen"
      - "$/kg"
      - "resultado real"
      - "forecast"
      - "closed period"

    determine:
      - "what is actual"
      - "what is projection"
      - "what is formula-derived"
      - "what is accounting result"
      - "month close semantics"

    invariant: >
      Do not label an IGF projection as actual realized profit.

  prior_commitments:
    determine:
      - "Action Register"
      - "open/closed/vencidas"
      - "month relation"
      - "whether closure result exists"

truth_model:

  actual:
    definition: "physically observed/recorded result for the month"

  target:
    definition: "predefined business objective from canonical source"

  forecast:
    definition: "projection/estimate, not actual"

  derived_model:
    definition: "formula/model output, not accounting actual unless explicitly so"

  invariant: >
    These four categories must remain distinct in the read model and in GPT
    wording.

month_semantics:

  first_slice:
    preferred: "one explicit closed calendar month + one plant"

  closed_month:
    determine:
      - "how to know month is closed"
      - "whether current date alone is sufficient"
      - "whether data has close/final marker"

  current_open_month:
    rule: >
      Do not reuse closed-month semantics silently for the current month.

  explicit_month:
    examples:
      - "mayo 2026"
      - "mes pasado"
      - "junio"

  timezone: "America/Mexico_City"

architecture_candidates:

  A_prompt_compose_existing:
    description: >
      Compose existing monthly sources ad hoc in chat and let GPT reconcile.

  B_month_close_read_model:
    description: >
      Create a structured read-only month-close model that aligns month, plant,
      actual sales, channel mix, discount, clients, financial result, target if
      canonical, actions and gaps before GPT.

  C_persisted_close_snapshot:
    description: >
      Persist a derived monthly close summary.

  D_reuse_pre_meeting_pack_only:
    description: >
      Extend pre_meeting_brief without a dedicated monthly close object.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "prefer structured read-only composition"
    - "avoid persistence unless required"

intent_audit:

  candidates:
    - "month_close_result"
    - "monthly_result"
    - "close_result"

  determine:
    - "whether one canonical intent is enough"
    - "whether pre_meeting_brief should hand off to it"
    - "whether month/plant are slots"

  principle: >
    Do not overload IGF or commercial_trend with a mixed monthly close object.

read_model_candidate:

  identity:
    - "plant"
    - "month"
    - "closed/open marker"
    - "generated_at"

  sales:
    - "actual kg/ton"
    - "target if canonical"
    - "delta vs target if valid"
    - "prior-month comparison if valid"

  channels:
    - "CASA kg"
    - "COMISIONISTA kg"
    - "mix %"
    - "change vs prior month if valid"

  discount:
    - "monthly discount/kg"
    - "change vs prior month"
    - "channel breakdown if physically supported"

  clients:
    - "new"
    - "lost"
    - "top positive movers"
    - "top negative movers"

  financial:
    - "actual result if physically supported"
    - "projection separately if relevant"
    - "margin/$kg if physically supported"
    - "limitations"

  actions:
    - "open/closed/vencidas"
    - "missing closure/results"

  information_gaps:
    - "material movement without explanation"
    - "target unavailable"
    - "financial actual unavailable"
    - "causal context absent"

target_behavior:

  if_canonical_target_exists:
    allow:
      - "actual"
      - "target"
      - "delta"
      - "attainment %"

  if_target_missing:
    required: >
      State explicitly that there is no canonical monthly sales target in the
      currently available sources.

    prohibited:
      - "use forecast as target"
      - "use prior month as target"
      - "invent target from meeting transcript"
      - "use hardcoded target"

financial_behavior:

  if_actual_financial_result_exists:
    allow:
      - "actual operating/final result with exact semantics"

  if_only_IGF_projection_exists:
    required: >
      Keep it labeled projection/IGF and do not call it actual close result.

  if_derived_formula_only:
    required: "label as derived/model value"

  if_unsupported:
    required: "explicit limitation"

“vendimos_mas_pero_ganamos_menos”:

  required_analysis:
    possible_inputs:
      - "sales actual current vs prior month"
      - "channel mix"
      - "discount/kg"
      - "financial actual/margin if available"

  safe_output:
    - "These movements co-occurred."
    - "The channel mix shifted toward lower/higher margin if margin evidence exists."
    - "Discount increased/decreased."

  prohibited:
    - "causal claim without evidence"
    - "claiming margin erosion from commission if commission data unavailable"

client_movement_semantics:

  new/lost:
    audit:
      - "exact DICF definitions"
      - "comparison month"
      - "cliente_key"

  mover:
    rule: >
      Contributor/mover != cause.

pre_meeting_handoff:

  desired:
    - "Prepárame para cierre de Puebla"
    - "¿Cómo cerró el mes?"
    - "¿Contra la meta?"
    - "¿Qué cambió en canales?"
    - "¿Qué clientes explican el movimiento?"

  behavior: >
    pre_meeting_brief may hand off to month_close_result for monthly-close facts;
    detailed client questions hand off to client_profile.

historical_Plaud_boundary:

  role: "evaluation evidence only"

  prohibited:
    - "using meeting-stated target as current runtime source"
    - "using meeting-stated cause as business truth"
    - "Plaud runtime integration"

partial_data:

  cases:
    - "sales exists, target missing"
    - "sales/discount exists, financial actual missing"
    - "client movers available, new/lost unavailable"
    - "action source unavailable"

  rule: >
    Return a partial monthly close with explicit per-section limitations.

materiality:

  reuse:
    - "existing monthly deltas"
    - "rankings"
    - "statuses"
    - "information gaps"

  GPT:
    - "executive synthesis"
    - "what stands out"
    - "what needs explanation"

  prohibited:
    - "new arbitrary thresholds"

authz:

  preserve:
    - "one authorized plant"
    - "fail closed"
    - "no cross-plant"

contract_audit:

  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"
    - "G8 if relevant"

readiness_output:

  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "canonical sales target source or explicit absence"
    - "monthly actual sales source"
    - "channel mix source"
    - "monthly discount source"
    - "new/lost client source"
    - "actual financial result source/semantics"
    - "architecture A/B/C/D"
    - "intent choice"
    - "closed-month semantics"
    - "target fallback policy"
    - "financial fallback policy"
    - "pre_meeting handoff"
    - "partial-data behavior"
    - "G2/G3/G8"
    - "percentage effect"

first_slice_candidates:

  A_sales_only:
    includes:
      - "month sales"
      - "channel mix"
      - "discount"

  B_sales_plus_clients:
    includes:
      - "A"
      - "new/lost/movers"

  C_month_close_core:
    includes:
      - "B"
      - "target if canonical"
      - "financial result if actual and physically supported"
      - "actions"
      - "information gaps"

  D_everything:
    includes:
      - "all operational/financial modules"

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "do not force target/financial fields if physical truth is absent"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp unless matrix policy independently changes"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "SQL execution"
  - "schema"
  - "target creation"
  - "new accounting source"
  - "Plaud runtime integration"
  - "contracts modification"
  - "matrix changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Canonical monthly target searched repository-wide."
  - "Target existence/absence decided."
  - "Monthly actual sales source defined."
  - "Channel mix source defined."
  - "Monthly discount source defined."
  - "New/lost client semantics defined."
  - "Financial actual vs forecast semantics defined."
  - "Actual/target/forecast/derived distinction explicit."
  - "A/B/C/D architecture compared."
  - "Exactly one architecture selected."
  - "A/B/C/D first slice compared."
  - "Exactly one first slice selected."
  - "Intent selected."
  - "Closed-month semantics defined."
  - "Partial-data behavior defined."
  - "No Plaud truth leakage."
  - "G2/G3/G8 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if one safe first slice exists.
  STOPPED if monthly target/financial semantics require human decision.
  BLOCKED if physical data cannot support a defensible month-close object.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md