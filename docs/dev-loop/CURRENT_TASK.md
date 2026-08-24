# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001
  y autorizo G1 exclusivamente para readiness/auditoría.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

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
  Determinar la arquitectura mínima y segura para construir un perfil
  longitudinal reutilizable por cliente_key que componga, para una planta y
  periodo definidos, volumen mensual, descuento/kg mensual, ingreso mensual
  disponible, comentarios, DICF y Action Register; y que pueda ser invocado
  tanto desde una pregunta directa de cliente como desde el handoff de
  commercial_trend.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010"
  bottleneck: "no_reusable_longitudinal_client_read_model"
  failure_class: "MISSING_INFRASTRUCTURE"

north_star: >
  Director IA debe poder pasar de una tendencia agregada a un cliente concreto
  y sostener una conversación sobre su evolución en el tiempo sin perder
  identidad, periodo ni evidencia.

canonical_product_questions:
  - "¿Qué cliente de Puebla es el de mayor volumen?"
  - "¿Cuánto compró por mes en los últimos 3 meses?"
  - "¿Qué descuento/kg tuvo por mes?"
  - "¿Cuánto ingreso generó por mes?"
  - "¿Subió o bajó?"
  - "¿Qué sabemos de él?"
  - "¿Qué comentarios tenemos?"
  - "¿Tiene acciones pendientes?"
  - "¿Qué pasó con esas acciones?"

commercial_trend_handoff:
  sequence:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Quién está moviendo la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Tiene acciones?"

  current_behavior:
    - "commercial_trend works"
    - "mover selection works"
    - "active_entity works"
    - "pronoun/followup re-inherits commercial_trend"
    - "client profile/action query never becomes effective"

  desired_behavior: >
    Once a canonical client entity is active, a client-profile or action
    question must route to the relevant client read model instead of being
    swallowed by commercial_trend inheritance.

identity_invariant:
  canonical_key: "cliente_key"

  prohibited:
    - "join by cliente_nombre"
    - "fuzzy display-name joins"
    - "client identity inferred from comments text"
    - "silent merge of multiple clients"

  ambiguity:
    rule: >
      If one visible name maps to multiple canonical entities, clarify.

mandatory_source_audit:

  monthly_sales:
    determine:
      - "physical table/source"
      - "cliente_key availability"
      - "plant scope"
      - "month grain"
      - "kg aggregation"
      - "completed/current month behavior"

  monthly_discount:
    determine:
      - "physical table/source"
      - "canonical client identity path"
      - "monto"
      - "kg denominator"
      - "SUM(monto)/SUM(kg)"
      - "month grain"
      - "whether M9 can be reused safely"

  monthly_income:
    determine:
      - "what physically exists at client grain"
      - "whether it is actual closed income, ARR-derived, DICF-derived, or formula"
      - "whether same monthly grain is available"
      - "whether calling it 'ingreso' is semantically safe"

  comments:
    determine:
      - "cliente_key source"
      - "recency"
      - "plant scope"
      - "author/date if available"

  DICF:
    determine:
      - "client linkage"
      - "current/historical actions"
      - "status"
      - "responsible"
      - "outcomes if physically recorded"

  action_register:
    determine:
      - "canonical client linkage if any"
      - "responsible/person relation"
      - "open/closed actions"
      - "whether existing action-person path can be reused"

period_semantics:

  default_three_months:
    audit_question: >
      Does "últimos 3 meses" mean last 3 completed calendar months, current month
      plus prior 2, or another existing business convention?

  requirement:
    - "select exact semantics from existing data/product conventions"
    - "declare period explicitly in response"

  current_month:
    rule: >
      If current month is incomplete, do not silently compare it as equivalent to
      completed months without labeling partiality.

  explicit_period:
    examples:
      - "mayo, junio y julio"
      - "últimos 90 días"
    rule: >
      Do not conflate calendar months with trailing-day windows.

top_client_selection:

  metric: "volume"

  audit:
    - "homogeneous period"
    - "same plant"
    - "same channel if inherited"
    - "sum kg"
    - "ties"
    - "client key"

  rule: >
    Highest-volume client must be selected deterministically from the same
    comparison window.

profile_pack:

  target_shape:
    identity:
      - "cliente_key"
      - "display_name"
      - "plant"

    period:
      - "month list"
      - "partial/completed markers"

    monthly_rows:
      each:
        - "month"
        - "kg"
        - "discount_per_kg"
        - "income if semantically valid"
        - "null/absence markers"

    trends:
      - "kg direction"
      - "discount direction"
      - "income direction if valid"

    context:
      - "comments"
      - "DICF"
      - "actions"
      - "limitations"
      - "provenance"

  invariant: >
    Monthly metrics must align on the same month labels before GPT sees them.

trend_semantics:

  simple_monthly_comparison:
    allowed:
      - "month-over-month deltas"
      - "first vs last across exactly 3 monthly buckets"
      - "direction from monthly values"

  rule: >
    This is not the commercial_trend OLS engine. Monthly client profile has its
    own grain and must not pretend to be daily-trend OLS.

  prohibited:
    - "claiming causality from correlated discount/volume"
    - "using missing month as zero unless source proves zero"

income_semantics:

  critical: true

  question: >
    What does "ingreso por mes" physically mean for this client?

  candidates:
    A_actual_client_income:
      description: "actual recognized client income by month"

    B_ARR_or_forecast_derived:
      description: "derived commercial amount, not accounting actual"

    C_DICF_formula:
      description: "formula-derived value from commercial model"

    D_not_supported:
      description: "no defensible client monthly income"

  requirement:
    - "compare A/B/C/D based on physical source"
    - "choose one semantics or explicitly defer income"

  invariant: >
    Do not label a derived estimate as actual income.

source_composition_candidates:

  A_existing_packs_only:
    description: >
      Orchestrate existing loaders each turn without a reusable profile model.

  B_longitudinal_client_read_model:
    description: >
      Build one canonical loader/pack keyed by cliente_key and period.

  C_persisted_client_profile:
    description: >
      Persist a derived profile table/materialized view.

  D_LLM_composition_only:
    description: >
      Send raw independent sources to GPT and let it align periods.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "prefer read-only runtime composition"
    - "avoid persistence unless physically necessary"

routing_candidates:

  A_inherit_commercial_trend:
    description: "keep current behavior"

  B_client_profile_parent_intent:
    description: >
      Introduce/reuse canonical client_profile intent after active_entity exists.

  C_phrasebook_override:
    description: "special phrases like 'qué sabemos de él'"

  D_second_LLM_router:
    description: "LLM decides handoff"

  requirement:
    - "compare"
    - "avoid phrasebook"
    - "avoid second LLM router"

intent_audit:

  candidates:
    - "client_analysis"
    - "client_profile"
    - "longitudinal_client_profile"

  determine:
    - "whether existing client_analysis can be extended safely"
    - "whether new intent is necessary"
    - "whether period is slot, not separate intent"

  principle: >
    Prefer one client semantic parent over multiple metric-specific intents.

conversation_state:

  required_slots:
    - "active_entity cliente_key"
    - "plant"
    - "active_period_months"
    - "optional inherited channel context"

  rule: >
    State holds routing context, not historical evidence.

  handoff:
    from_commercial_trend:
      preserve:
        - "plant"
        - "selected client"
        - "relevant channel if needed"
      discard:
        - "trend evidence as client evidence"

  requery:
    mandatory: true

profile_followups:

  should_work:
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Coincidió con más volumen?"
    - "¿Y cuánto ingreso?"
    - "¿Qué sabemos de él?"
    - "¿Qué comentarios hay?"
    - "¿Tiene acciones pendientes?"

  principle: >
    These should reuse client identity/period, but each evidence domain is
    requeried as needed.

causality_boundary:

  safe:
    - "descuento subió y volumen también subió"
    - "ambos movimientos coinciden temporalmente"
    - "hay comentario registrado sobre competencia"

  unsafe:
    - "el descuento causó el volumen"
    - "la competencia causó la caída" unless separately proven
    - "la acción recuperó al cliente" without outcome evidence

information_gap:

  required_when_missing:
    - "what metric/source is absent"
    - "specific month/entity affected"
    - "whether data_not_found vs source unavailable"
    - "what question remains unanswered"

partial_data:
  required:
    - "sales exists, discount missing"
    - "discount exists, income unsupported"
    - "comments absent"
    - "actions absent"
    - "one month missing"

  rule: >
    Profile remains useful with explicit per-field limitations.

authz:
  preserve:
    - "same plant"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

reasoning_boundary:

  runtime_owns:
    - "identity"
    - "period"
    - "monthly alignment"
    - "kg math"
    - "discount math"
    - "income semantics"
    - "comments retrieval"
    - "DICF/action retrieval"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "executive synthesis"
    - "what stands out"
    - "correlation wording with caveats"
    - "what to investigate"
    - "follow-up"

mandatory_product_conversations:

  direct_top_client:
    turns:
      - "¿Qué cliente de Puebla es el de mayor volumen?"
      - "¿Cómo se ha comportado en los últimos 3 meses?"
      - "¿Qué descuento tuvo por mes?"
      - "¿Cuánto ingreso generó?"
      - "¿Qué sabemos de él?"
      - "¿Tiene acciones pendientes?"

  from_trend:
    turns:
      - "¿Cómo vamos en CASA los últimos 3 meses?"
      - "¿Quién está moviendo la caída?"
      - "Háblame del primero."
      - "¿Qué sabemos de él?"
      - "¿Tiene acciones?"
      - "¿Qué pasó con esas acciones?"

  comparison:
    turns:
      - "¿En qué mes tuvo más descuento?"
      - "¿Ese mes compró más?"
      - "¿Coincidió con mayor ingreso?"

tests_to_design_if_ready:

  identity:
    - "cliente_key only"
    - "ambiguous visible name"
    - "cross-plant denial"

  period:
    - "3-month semantics"
    - "partial current month"
    - "explicit months"

  math:
    - "kg/month"
    - "SUM(monto)/SUM(kg) discount/month"
    - "income semantics if supported"
    - "null != zero"

  routing:
    - "commercial_trend -> active client -> profile"
    - "profile -> actions"
    - "pronoun followups"
    - "no phrasebook"

  regression:
    - "commercial_trend"
    - "daily brief"
    - "action-person"
    - "topic return"
    - "persistent memory"
    - "full Director IA suite"

contract_audit:
  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"

  expectation: "runtime/read-model only unless evidence says otherwise"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "source composition A/B/C/D"
    - "routing strategy A/B/C/D"
    - "intent choice"
    - "cliente_key identity path"
    - "3-month semantics"
    - "monthly sales source"
    - "monthly discount source/formula"
    - "monthly income semantics"
    - "comments/DICF/actions integration"
    - "handoff from commercial_trend"
    - "partial-data behavior"
    - "G2/G3"
    - "percentage effect"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp unless module policy independently changes"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "schema"
  - "SQL execution"
  - "persisted profile"
  - "Taller Mayor"
  - "SEH"
  - "greeting"
  - "closed-month IGF"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Client identity path physically audited."
  - "Commercial trend handoff traced."
  - "Monthly sales source defined."
  - "Monthly discount formula/source defined."
  - "Monthly income semantics determined."
  - "3-month period semantics fixed."
  - "Comments/DICF/actions composition defined."
  - "A/B/C/D source strategy compared."
  - "Exactly one source strategy selected."
  - "A/B/C/D routing compared."
  - "Exactly one routing strategy selected."
  - "No phrasebook."
  - "Partial data behavior defined."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if one safe first slice exists.
  STOPPED if income/client semantics require human business decision.
  BLOCKED if canonical identity/data is insufficient.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md