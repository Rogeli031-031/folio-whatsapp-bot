# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "IMPLEMENTATION"
  source_strategy: "B — reusable longitudinal client read model"
  routing_strategy: "B — canonical client_profile parent"

objective: >
  Implementar un perfil longitudinal de cliente, read-only y reutilizable por
  cliente_key, que alinee por mes volumen y descuento/kg, integre contexto
  comercial disponible (comments/DICF) y permita handoff seguro desde
  commercial_trend hacia conversación de cliente sin reheredar erróneamente
  commercial_trend.

baseline:
  global: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

readiness:
  task: "ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
  determination: "READY_WITH_LIMITS"
  source_strategy: "B"
  routing_strategy: "B"

canonical_intent:
  name: "client_profile"

  meaning: >
    Consulta longitudinal y contextual sobre un cliente canónico ya resuelto o
    resoluble dentro de la planta actual.

identity:
  canonical_key: "cliente_key"

  required:
    - "all profile facts align to one cliente_key"
    - "plant scope preserved"
    - "channel/subchannel may be used only as source dimensions, not identity"

  prohibited:
    - "joins by cliente_nombre"
    - "fuzzy display-name joins"
    - "silent merge of homonyms"
    - "using assistant/history text as identity evidence"

period_semantics:

  default:
    months: 3
    meaning: "current calendar month in America/Mexico_City + previous 2 calendar months"

  current_month:
    marker: "PARTIAL"

  completed_prior_months:
    marker: "COMPLETE"

  invariant: >
    3 calendar months != 90 trailing days used by commercial_trend.

  explicit_period:
    rule: >
      If user names explicit months, preserve those months if supported.

monthly_sales:

  required_grain:
    - "cliente_key"
    - "month"

  calculation:
    metric: "kg"
    aggregate: "SUM(kg)"

  rules:
    - "same plant"
    - "same aligned month set"
    - "null/no data != zero unless physical source proves zero"

monthly_discount:

  formula: "SUM(monto) / SUM(kg)"

  grain:
    - "cliente_key"
    - "month"

  prohibited:
    - "AVG of client/day ratios"
    - "average-of-averages"

  rules:
    - "same months as sales"
    - "null when denominator absent/invalid"

monthly_income:

  first_slice: "NOT_SUPPORTED_AS_ACTUAL"

  physical_existing_value:
    type: "DICF formula-derived"
    formula: "kg_forecast × (margen − |descuento|)"

  invariant: >
    This is not actual recognized monthly client income.

  behavior_on_question:
    example: "¿Cuánto ingreso generó?"
    required_answer_boundary: >
      Director IA must state that actual monthly client income is not currently
      available in this profile. It may mention that a DICF-derived forecast/model
      value exists only if wording clearly distinguishes it from actual income.

  prohibited:
    - "label DICF formula as actual income"
    - "silently substitute forecast for actual"

profile_pack:

  preferred_file: "lib/director-ia-client-profile.js"

  required_shape:
    identity:
      - "cliente_key"
      - "display_name"
      - "plant"

    period:
      - "months"
      - "PARTIAL/COMPLETE markers"

    monthly:
      each:
        - "month"
        - "kg"
        - "discount_per_kg"
        - "income_actual = unsupported/null"
        - "limitations"

    trends:
      - "kg month-over-month"
      - "discount month-over-month"

    context:
      - "comments by cliente_key"
      - "DICF by cliente_key"
      - "client actions from physically supported client-linked source"
      - "limitations"
      - "provenance"

  invariant: >
    Runtime aligns all monthly rows before GPT sees the pack.

comments:

  source_rule: "cliente_key only"

  include_if_available:
    - "comment"
    - "date"
    - "author/source if physically available"

  truth_boundary:
    comment: "recorded declaration/context"
    not: "proven cause"

DICF:

  join: "cliente_key"

  include_if_available:
    - "current/historical commercial context"
    - "client-linked actions"
    - "status"
    - "responsible"
    - "recorded result/outcome only if physically present"

  truth_boundary:
    action: "recorded action"
    not: "proof of business outcome"

action_register_boundary:

  finding: >
    General Action Register does not have cliente_key.

  rule: >
    Do not invent client linkage to Action Register.

  allowed:
    - "client-linked DICF actions only if physically keyed"

top_client:

  supported_question: "¿Qué cliente de Puebla es el de mayor volumen?"

  calculation:
    metric: "SUM kg over requested/default aligned month window"

  required:
    - "same plant"
    - "same period"
    - "cliente_key"
    - "deterministic tie behavior"

  optional_channel:
    rule: >
      If the question inherits a valid commercial_trend channel context,
      preserve that channel only when the source supports safe filtering.

routing:

  parent_intent: "client_profile"

  direct:
    examples:
      - "¿Qué sabemos de Arturo?"
      - "¿Cómo se ha comportado Arturo estos 3 meses?"
      - "¿Qué descuento tuvo por mes?"
      - "¿En qué mes compró más?"

  handoff_from_commercial_trend:
    sequence:
      - "commercial_trend"
      - "mover selected"
      - "active_entity cliente_key"
      - "¿Qué sabemos de él?"

    required:
      - "client_profile becomes effective"
      - "commercial_trend must not swallow profile question"
      - "fresh profile requery"

  prohibited:
    - "phrasebook override"
    - "second LLM router"
    - "blind inheritance of commercial_trend once client-profile semantics are clear"

conversation_state:

  stores:
    - "active_entity cliente_key"
    - "plant"
    - "active_period_months"
    - "optional channel context"
    - "parent_intent client_profile"

  does_not_store:
    - "raw profile evidence"
    - "monthly values as conversation truth"

  requery:
    mandatory: true

profile_followups:

  must_work:
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Ese mes también compró más?"
    - "¿Qué sabemos de él?"
    - "¿Qué comentarios tenemos?"
    - "¿Tiene acciones?"
    - "¿Qué pasó con esas acciones?"
    - "¿Cuánto ingreso generó?"

  rules:
    - "reuse cliente_key"
    - "reuse period"
    - "requery relevant sources"
    - "do not fall back to commercial_trend when profile context is active"

monthly_trend_semantics:

  kg:
    allowed:
      - "month-over-month deltas"
      - "first vs last across aligned monthly buckets"
      - "simple up/down statement"

  discount:
    allowed:
      - "month-over-month deltas"
      - "first vs last across aligned monthly buckets"

  invariant: >
    This is monthly client behavior, not OLS commercial_trend.

correlation_boundary:

  allowed:
    - "the month with highest discount coincided with highest volume"
    - "discount increased while volume increased"

  prohibited:
    - "discount caused the higher volume"
    - "higher discount recovered the client"

partial_data:

  cases:
    - "one month sales missing"
    - "one month discount missing"
    - "comments missing"
    - "DICF missing"
    - "client action missing"
    - "actual income unsupported"

  behavior:
    - "return useful remaining profile"
    - "limitations per field/source"
    - "missing != zero"

absence_error_semantics:

  distinguish:
    - "DATA_NOT_FOUND"
    - "SOURCE_RESTRICTED"
    - "SOURCE_UNAVAILABLE"
    - "TOOL_ERROR"
    - "UNSUPPORTED_METRIC"

  rule: >
    Unsupported actual income must not be represented as zero or source error.

authz:

  preserve:
    - "current user plant permissions"
    - "same plant"
    - "no cross-plant"
    - "fail-closed"

GPT_boundary:

  runtime_owns:
    - "cliente_key"
    - "plant"
    - "months"
    - "kg/month"
    - "discount/month"
    - "partial markers"
    - "comments retrieval"
    - "DICF/actions retrieval"
    - "unsupported income flag"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "executive synthesis"
    - "what stands out"
    - "correlation wording with caveats"
    - "what remains unexplained"
    - "follow-up wording"

mandatory_conversation_1_direct:

  turns:
    - "¿Qué cliente de Puebla es el de mayor volumen?"
    - "¿Cómo se ha comportado en los últimos 3 meses?"
    - "¿Qué descuento tuvo por mes?"
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Ese mes también compró más?"
    - "¿Cuánto ingreso generó?"
    - "¿Qué sabemos de él?"
    - "¿Tiene acciones?"

  validate:
    - "same cliente_key"
    - "same aligned months"
    - "current month PARTIAL"
    - "actual income limitation"
    - "fresh evidence per turn"

mandatory_conversation_2_from_trend:

  turns:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Quién está moviendo la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Cómo ha comprado estos tres meses?"
    - "¿Qué descuento tuvo cada mes?"
    - "¿Tiene acciones?"
    - "¿Qué pasó con esas acciones?"

  validate:
    - "commercial_trend handoff"
    - "active_entity cliente_key"
    - "client_profile parent"
    - "trend evidence not reused"
    - "profile evidence fresh"

holdout_generalization:

  test_only:
    - "Cuéntame cómo viene este cliente."
    - "¿Cómo se ha movido en estos meses?"
    - "¿Qué historial comercial reciente tiene?"
    - "¿Qué sabemos realmente de este cliente?"

  rule: >
    Do not add exact holdout sentences to production routing.

implementation_strategy:

  source_model:
    selected: "B — reusable longitudinal client read model"

  routing:
    selected: "B — client_profile parent"

  persistence:
    use: false

  internal_HTTP:
    use: false

preferred_files:

  new:
    - "lib/director-ia-client-profile.js"
    - "test/director-ia-client-profile.test.js"

  modified_if_required:
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"

  conditional:
    - "existing shared monthly sales/discount helpers if extraction is required"
    - "existing tests/scripts for legitimate regression assertions"

preserve:
  - "commercial_trend"
  - "daily_executive_brief"
  - "daily sales"
  - "daily discount"
  - "cross-metric followup"
  - "action-person"
  - "topic return"
  - "IGF reviewable supports"
  - "persistent memory"

out_of_scope_features:
  - "actual monthly client income implementation"
  - "new accounting source"
  - "Taller Mayor"
  - "SEH directory"
  - "personalized greeting"
  - "closed-month IGF fix"
  - "schema"
  - "persisted client profile"

tests_required:

  focal:
    - "top client by kg"
    - "cliente_key identity"
    - "3-month calendar alignment"
    - "PARTIAL current month"
    - "kg/month"
    - "discount SUM(monto)/SUM(kg)"
    - "income unsupported"
    - "comments by cliente_key"
    - "DICF/actions by cliente_key"
    - "commercial_trend handoff"
    - "profile pronoun followups"
    - "no commercial_trend swallow"

  negative:
    - "ambiguous client"
    - "cross-plant"
    - "missing month"
    - "missing comments"
    - "no DICF"
    - "Action Register without cliente_key not falsely joined"

  regression:
    - "commercial_trend"
    - "daily executive brief"
    - "action-person"
    - "topic return"
    - "persistent memory"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

in_scope:

  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
    - "lib/director-ia-client-profile.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-client-profile.test.js"

  conditional_writable:
    - "existing Director IA tests/scripts if required by regression"
    - "existing pure monthly helper files if extraction/reuse is strictly necessary"

  read_only:
    - "server.js unless a pure helper extraction is proven necessary"
    - "frontend-dashboard/**"
    - "sql/**"
    - "contracts"

out_of_scope:
  - "DB writes"
  - "schema"
  - "SQL execution"
  - "persisted profile"
  - "actual-income data source creation"
  - "matrix changes"
  - "contract changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Reusable client_profile implemented."
  - "cliente_key mandatory."
  - "No name joins."
  - "Current + prior 2 calendar months."
  - "Current month PARTIAL."
  - "Monthly kg aligned."
  - "Monthly discount uses SUM(monto)/SUM(kg)."
  - "Actual monthly income not invented."
  - "Comments/DICF client-keyed."
  - "Action Register not falsely client-linked."
  - "commercial_trend handoff works."
  - "Profile followups no longer swallowed by trend."
  - "Fresh requery."
  - "Partial data honest."
  - "No phrasebook."
  - "Existing capabilities preserved."
  - "Full suite green."
  - "git diff --check clean."
  - "52.5% preserved."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md