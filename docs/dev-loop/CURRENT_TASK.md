# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001
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
  Determinar la arquitectura mínima para que Director IA pueda responder
  preguntas de tendencia comercial de 30/90 días por CASA y COMISIONISTAS con
  paridad matemática y semántica respecto a la gráfica real del dashboard,
  reutilizando una fuente/motor común y evitando duplicar lógica en frontend,
  server y chat.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009"
  bottleneck: "dashboard_venta_serie_engine_unreachable_from_chat"
  failure_class: "MISSING_INFRASTRUCTURE"

physical_findings_from_prior_audit:
  dashboard_endpoint: "GET /api/arr/venta-serie"
  trend_function_location: "frontend ArrVentaGraficaModal.tsx / linearTrend"
  chart_behavior:
    - "daily series"
    - "30-day range"
    - "90-day range"
    - "channel split"
    - "CASA"
    - "COMISIONISTA/COMISIONISTAS"
    - "top-6 clients by delta"
    - "OLS trend slope"
    - "comments shown as contextual evidence"
  chat_gap: >
    No existe motor equivalente/reutilizable en lib/ y las preguntas caen a
    unknown -> clarification.

north_star: >
  Cuando el usuario pregunte “¿Cómo vamos en CASA los últimos 3 meses?”,
  Director IA debe hablar exactamente del mismo objeto matemático que muestra
  la gráfica del dashboard: mismo rango, misma serie, mismo canal, misma
  tendencia y mismos movers, con evidencia fresca y sin causalidad inventada.

canonical_product_questions:
  - "¿Cómo vamos en el último mes?"
  - "¿Cómo vamos en los últimos 3 meses?"
  - "¿Cómo vamos en CASA?"
  - "¿Cómo van los COMISIONISTAS?"
  - "Compárame CASA contra COMISIONISTAS."
  - "¿Venimos subiendo o bajando?"
  - "¿Quién explica más la caída?"
  - "¿Qué sabemos de esos clientes?"

semantic_holdouts:
  test_only:
    - "¿Qué tendencia trae CASA?"
    - "¿Cómo se ha comportado COMISIONISTAS?"
    - "¿Qué pasó con CASA estos meses?"
    - "¿Cuál de los dos viene peor?"
    - "¿Desde cuándo se ve la caída?"

  rule: >
    Son tests de intención; no phrasebook.

mandatory_chart_engine_audit:

  inspect_backend:
    - "GET /api/arr/venta-serie"
    - "query/source tables"
    - "date filtering"
    - "plant filtering"
    - "channel filtering"
    - "client aggregation"
    - "top movers computation"
    - "comments source"

  inspect_frontend:
    - "ArrVentaGraficaModal.tsx"
    - "linearTrend"
    - "range semantics"
    - "30/90 selector"
    - "CASA/COMISIONISTA selection"
    - "graph data transformations"
    - "any sorting/filtering done only in frontend"

  determine:
    - "what is data truth from backend"
    - "what is derived truth in frontend"
    - "what must move to reusable lib/"
    - "what dashboard can continue consuming unchanged"

single_source_of_truth:

  central_principle: >
    Dashboard and Director IA must consume the same commercial trend engine.

  prohibited:
    - "copying linearTrend into Director IA only"
    - "reimplementing SQL separately in chat"
    - "frontend-only truth for production reasoning"
    - "internal HTTP from chat to dashboard endpoint if helper reuse is possible"

  preferred:
    - "extract/reuse pure shared lib helper(s)"
    - "server endpoint delegates to shared engine"
    - "Director IA loader delegates to same engine"

architecture_candidates:

  A_chat_reimplements:
    description: >
      Director IA recreates query + OLS separately.

  B_shared_backend_engine:
    description: >
      Extract chart query/aggregation/trend semantics into reusable lib;
      dashboard endpoint and chat both call it.

  C_call_existing_HTTP:
    description: >
      Director IA calls GET /api/arr/venta-serie internally.

  D_frontend_formula_copy:
    description: >
      Copy linearTrend from React into chat runtime.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "prefer single source of truth"
    - "avoid internal HTTP"

range_semantics:

  mandatory:
    one_month:
      determine: >
        Exact physical meaning used by dashboard: 30 trailing calendar days,
        current partial day inclusion/exclusion, or other.

    three_months:
      determine: >
        Exact physical meaning: 90 trailing days vs calendar months.

  rule: >
    Director IA must declare the same period definition used by the chart.

  explicit_period_precedence:
    examples:
      - "últimos 30 días"
      - "últimos 90 días"
      - "del 1 de junio al 31 de agosto"

  requirement: >
    Explicit range wins if supported.

channel_semantics:

  mandatory:
    - "CASA"
    - "COMISIONISTA"
    - "COMISIONISTAS alias"
    - "all channels / unspecified"

  determine:
    - "physical channel field"
    - "normalization"
    - "whether CASA and COMISIONISTA are mutually exclusive"
    - "how null/other channels are treated"

  rule: >
    Do not silently map unsupported channel names.

trend_math:

  canonical: "OLS linear trend"

  audit:
    - "x-axis definition"
    - "y-axis definition"
    - "slope"
    - "units"
    - "minimum observations"
    - "zero/missing day handling"
    - "whether gaps are filled with zero or omitted"
    - "whether outliers are kept"

  output_semantics:
    required:
      - "slope"
      - "direction"
      - "range"
      - "observation count"

  rule: >
    “Subiendo/bajando” must derive from the same OLS math as dashboard.

  prohibited:
    - "first vs last shortcut"
    - "visual guess"
    - "causal language"

series_semantics:

  audit:
    - "daily kg"
    - "aggregation grain"
    - "missing dates"
    - "same-day multi-client aggregation"
    - "plant equivalents if any"

  rule: >
    Missing day semantics must match the chart.

top_movers:

  audit:
    - "exact delta definition"
    - "reference/comparison window"
    - "top-6 selection"
    - "positive/negative sorting"
    - "client identity/key"
    - "channel filter interaction"

  desired_output:
    - "client"
    - "delta"
    - "direction"
    - "material contribution"

  truth_boundary: >
    Mover != cause.

comments_evidence:

  audit:
    - "physical source"
    - "join key"
    - "recency"
    - "whether comments are client-specific"
    - "how graph chooses displayed comments"

  Director_IA_rule: >
    Comments may contextualize a mover but remain declarations/notes, not proven
    causal evidence.

comparison_mode:

  required_question: "Compárame CASA contra COMISIONISTAS."

  determine:
    - "whether both can be loaded for same range"
    - "how to compare slopes"
    - "period totals"
    - "whether one common reference is needed"
    - "whether comparison can be done without inventing a new score"

  preferred_output:
    - "CASA direction/slope"
    - "COMISIONISTA direction/slope"
    - "which is deteriorating/improving more by comparable slope if units equal"
    - "largest movers by channel"

  prohibited:
    - "declare one 'worse' from raw totals alone if question is trend"

new_intent_audit:

  candidates:
    - "commercial_trend"
    - "commercial_channel_trend"

  determine:
    - "whether one canonical intent is sufficient"
    - "whether existing commercial_state can safely represent this"
    - "whether channel/range belong as slots/state, not intents"

  rule: >
    Avoid multiple intents for CASA vs COMISIONISTA vs 1M vs 3M.

conversation_state:

  desired_slots:
    - "plant"
    - "range"
    - "channel"
    - "active commercial trend context"

  followups:
    sequence:
      - "¿Cómo vamos en CASA los últimos 3 meses?"
      - "¿Y COMISIONISTAS?"
      - "Compáralos."
      - "¿Quién explica la caída?"
      - "Háblame del primero."
      - "¿Qué sabemos de él?"
      - "¿Tiene alguna acción pendiente?"

  audit:
    - "range inheritance"
    - "channel switch"
    - "comparison state"
    - "active client resolution"
    - "handoff to existing client/action contexts"

  rule: >
    Requery each turn. State retains routing context, not evidence.

materiality_and_reasoning:

  runtime_owns:
    - "range"
    - "channel"
    - "series"
    - "OLS slope"
    - "totals"
    - "movers"
    - "comments retrieval"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "executive summary"
    - "what stands out"
    - "comparison wording"
    - "what requires investigation"
    - "follow-up"

  prohibited:
    - "scripted conclusion"
    - "cause from correlation"
    - "good/bad hardcode"

partial_data:

  cases:
    - "series exists, comments unavailable"
    - "CASA exists, COMISIONISTA absent"
    - "insufficient observations for trend"
    - "source error"
    - "no rows"

  required:
    - "partial answer when possible"
    - "explicit limitation"
    - "no missing = zero unless chart semantics prove it"

parity_acceptance:

  mandatory: >
    For a fixed fixture/range/channel, dashboard engine and Director IA engine
    must produce the same:
    - dates
    - daily values
    - slope
    - top movers
    - totals if exposed

  tolerance:
    numeric: >
      Determine exact/rounding tolerance based on existing frontend behavior.

first_slice_candidates:

  A_series_plus_slope:
    description: "trend direction only"

  B_series_slope_plus_movers:
    description: >
      trend + top client movers, no comments.

  C_chart_parity_full:
    description: >
      series + slope + movers + contextual comments using same graph engine.

  D_generic_commercial_analytics_framework:
    description: "build extensible analytics engine"

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "prefer enough parity to answer user's real question"
    - "avoid generic framework"

existing_capabilities_to_preserve:
  - "daily_executive_brief"
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "daily cross-metric"
  - "commercial_state"
  - "client analysis"
  - "action-person"
  - "topic return"
  - "IGF reviewable supports"
  - "persistent memory"

G2_G3_audit:
  determine:
    - "G2"
    - "G3"

  expectation: >
    Likely runtime/refactor only, but if moving frontend-derived truth into a
    shared backend engine materially changes architecture, report it rather than
    assuming N/A.

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected architecture A/B/C/D"
    - "selected first slice A/B/C/D"
    - "shared engine boundary"
    - "range semantics"
    - "channel semantics"
    - "OLS semantics"
    - "movers semantics"
    - "comments semantics"
    - "comparison behavior"
    - "intent/state shape"
    - "partial-data behavior"
    - "G2/G3"
    - "percentage effect"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp unless module matrix policy independently changes"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contracts modification"
  - "SQL execution"
  - "longitudinal client implementation"
  - "Taller Mayor"
  - "SEH"
  - "greeting"
  - "closed-month IGF"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Dashboard chart engine physically traced."
  - "Backend vs frontend truth separated."
  - "A/B/C/D architecture compared."
  - "Exactly one architecture selected."
  - "A/B/C/D first slice compared."
  - "Exactly one first slice selected."
  - "30/90 day semantics defined."
  - "CASA/COMISIONISTA semantics defined."
  - "OLS trend semantics defined."
  - "Top mover semantics defined."
  - "Comments semantics defined."
  - "Parity test design defined."
  - "Conversation state/followups defined."
  - "No phrasebook."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS.
  STOPPED if a material architectural decision requires HUMAN.
  BLOCKED if chart truth cannot be extracted safely.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md