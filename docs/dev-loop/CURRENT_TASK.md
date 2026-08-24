# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "IMPLEMENTATION"
  architecture: "B — shared backend engine"
  first_slice: "B — series + OLS + top-6 movers"

objective: >
  Extraer/reutilizar un motor comercial compartido para que el dashboard y
  Director IA consuman exactamente la misma verdad de tendencia de venta:
  serie diaria, rango 30/90 días, canal CASA/COMISIONISTA, pendiente OLS y
  top-6 movers. Exponer esa capacidad al chat mediante un intent canónico
  commercial_trend, sin internal HTTP, sin comments en este slice y sin
  causalidad inventada.

baseline:
  global: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

readiness:
  task: "ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
  determination: "READY_WITH_LIMITS"
  architecture: "B"
  first_slice: "B"

single_source_of_truth:
  mandatory: true

  desired_shape: >
    reusable lib engine
      -> dashboard GET /api/arr/venta-serie
      -> Director IA commercial_trend

  prohibited:
    - "chat-specific SQL reimplementation"
    - "copying linearTrend only into Director IA"
    - "internal HTTP from chat to /api/arr/venta-serie"
    - "leaving dashboard and chat with divergent trend math"

shared_engine:
  preferred_file: "lib/commercial-trend-engine.js"

  responsibilities:
    - "resolve plant scope"
    - "resolve range"
    - "load daily commercial series"
    - "apply channel split"
    - "compute/return top movers"
    - "compute OLS trend or call shared pure OLS helper"
    - "return provenance/limitations"

  requirement: >
    Extract existing backend logic rather than rewrite it unless extraction is
    physically impossible.

dashboard_parity:
  endpoint: "GET /api/arr/venta-serie"

  requirement: >
    Refactor endpoint to delegate to the shared engine while preserving its
    externally observable response/behavior unless a tiny compatibility adapter
    is required.

  invariant: >
    Existing dashboard must not change meaning.

frontend_trend:
  current_source: "ArrVentaGraficaModal.tsx linearTrend"

  implementation_goal: >
    Move/canonicalize OLS truth into shared backend/pure JS semantics so
    Director IA and dashboard can be verified against identical math.

  compatibility:
    rule: >
      Do not silently change displayed trend.

  preferred:
    - "shared pure linearTrend helper usable in tests"
    - "backend returns slope/trend metadata if needed"
    - "frontend may continue rendering from same points, but parity tests must
       prove same slope"

OLS_semantics:
  canonical:
    x: "index of already-filtered daily points"
    y: "venta_ton"
    n_lt_2: "null"

  required_output:
    - "slope"
    - "observation_count"
    - "direction derived from sign only when slope != null"

  direction:
    positive: "UP"
    negative: "DOWN"
    zero: "FLAT"
    insufficient: "INSUFFICIENT_DATA"

  prohibited:
    - "first vs last"
    - "visual guess"
    - "causal interpretation"

range_semantics:

  one_month:
    days: 30

  three_months:
    days: 90

  anchor: "MAX(fecha) in available sales data"

  inclusive:
    last_available_day: true

  invariant: >
    Range is trailing from latest available data day, not automatically today
    and not calendar month(s).

  explicit_range:
    rule: >
      Preserve if existing engine supports it; otherwise do not broaden first
      slice beyond 30/90.

channel_semantics:

  canonical:
    CASA:
      rule: "rows not matching COMISIONISTA rule"

    COMISIONISTA:
      rule: "physical existing LIKE '%comisionista%' semantics"

  aliases:
    - "COMISIONISTA"
    - "COMISIONISTAS"

  comparison:
    rule: >
      Comparing channels means load the same range independently for CASA and
      COMISIONISTA. Do not use 'ambos' aggregate as the comparison.

series:
  required_fields:
    - "date"
    - "venta_ton"

  preserve:
    - "point order"
    - "missing-day semantics from dashboard"
    - "aggregation grain"
    - "same plant-equivalence behavior"

top_movers:
  count: 6

  requirement: >
    Reuse the same delta definition and selection logic currently used by the
    dashboard endpoint.

  required_fields_when_available:
    - "cliente identity"
    - "delta"
    - "direction"

  invariant: >
    mover != cause.

comments:
  included_first_slice: false

  reason: >
    Existing chart comments-by-name join is not acceptable as canonical
    Director IA evidence.

  prohibited:
    - "copy comments join by cliente_nombre"
    - "pretend comment parity exists"

  deferred: >
    Comments may be added later only through canonical cliente_key evidence.

intent:
  name: "commercial_trend"

  slots:
    - "range_days"
    - "channel"
    - "plant"

  rule: >
    Do not create separate intents for CASA, COMISIONISTA, 30d or 90d.

routing:
  semantic_examples_test_only:
    - "¿Cómo vamos en el último mes?"
    - "¿Cómo vamos en los últimos 3 meses?"
    - "¿Cómo vamos en CASA?"
    - "¿Cómo van los COMISIONISTAS?"
    - "¿Qué tendencia trae CASA?"
    - "¿Cómo se ha comportado COMISIONISTAS?"

  prohibited:
    - "phrasebook"
    - "exact full-sentence rules"

  explicit_metric_precedence:
    rule: >
      Do not break daily_sales_deviation or daily_executive_brief.

commercial_trend_pack:
  required:
    - "plant"
    - "range_days"
    - "range_start"
    - "range_end/latest_available_date"
    - "channel"
    - "daily_series"
    - "period_total if physically existing/derived"
    - "OLS slope"
    - "OLS direction"
    - "observation_count"
    - "top movers"
    - "limitations"
    - "provenance"

GPT_boundary:
  runtime_owns:
    - "range"
    - "channel"
    - "series"
    - "OLS"
    - "movers"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "executive synthesis"
    - "what stands out"
    - "comparison wording"
    - "what to investigate"
    - "natural followups"

  prohibited:
    - "scripted explanation"
    - "trend cause"
    - "client mover treated as cause"

comparison_mode:
  canonical_question: "Compárame CASA contra COMISIONISTAS."

  behavior:
    - "same plant"
    - "same range"
    - "fresh CASA engine call"
    - "fresh COMISIONISTA engine call"
    - "two slopes"
    - "two totals if available"
    - "movers separated by channel"

  GPT:
    may_say: >
      Which channel has the more negative/positive comparable slope.

    must_not_say: >
      Why one channel moved unless evidence separately supports causality.

conversation_state:
  parent_intent: "commercial_trend"

  slots:
    - "active_range_days"
    - "active_channel"
    - "plant"

  rule: >
    State stores routing context only. Requery evidence every turn.

channel_switch:
  sequence:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Y COMISIONISTAS?"

  expected:
    - "range remains 90"
    - "channel changes"
    - "fresh engine query"

comparison_followup:
  sequence:
    - "CASA 90d"
    - "¿Y COMISIONISTAS?"
    - "Compáralos."

  expected: >
    Requery both or use only current-turn fresh evidence according to existing
    safety pattern; never treat old assistant answer as evidence.

mover_followup:
  sequence:
    - "¿Quién explica más la caída?"
    - "Háblame del primero."

  safe_semantics:
    first_turn: >
      Interpret as largest mathematical mover/contributor, not causal explainer.

    second_turn: >
      Active client may be handed off only through canonical entity resolution.

  wording_boundary: >
    GPT should correct causal wording where necessary:
    “X es el mayor contribuidor al movimiento; eso no demuestra la causa.”

client_handoff:
  first_slice_requirement: >
    If existing canonical client resolution can safely receive the selected
    mover, preserve/enable handoff without building the longitudinal profile.

  out_of_scope:
    - "3-month client longitudinal read model"

partial_data:
  cases:
    - "insufficient observations"
    - "CASA available / COMISIONISTA absent"
    - "no rows"
    - "source error"

  rules:
    - "answer partially when valid evidence exists"
    - "limitations explicit"
    - "missing != zero unless existing chart semantics explicitly use zero"

authz:
  preserve:
    - "current plant"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

parity_tests:
  mandatory: true

  fixed_fixture:
    compare:
      - "shared engine result"
      - "dashboard endpoint adapter result"
      - "Director IA pack result"

  must_match:
    - "range_start"
    - "range_end"
    - "daily dates"
    - "daily venta_ton"
    - "top-6 movers"
    - "OLS slope"
    - "observation count"

  tolerance:
    rule: >
      Match exact source values before display rounding. Define only a tiny
      floating-point tolerance for OLS if necessary.

regression_tests:
  mandatory:
    - "existing /api/arr/venta-serie behavior"
    - "dashboard expected shape"
    - "daily executive brief"
    - "daily sales"
    - "daily discount"
    - "commercial_state"
    - "natural followup"
    - "topic return"
    - "action-person"
    - "IGF reviewable supports"
    - "persistent memory"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

preferred_files:
  new:
    - "lib/commercial-trend-engine.js"
    - "lib/director-ia-commercial-trend.js"
    - "test/director-ia-commercial-trend.test.js"

  modified_if_required:
    - "server.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"

  frontend:
    conditional: >
      Modify ArrVentaGraficaModal.tsx only if required to consume canonical
      returned trend metadata without changing user-visible behavior.
      Avoid frontend change if parity can be proven while preserving renderer.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"
    - "lib/commercial-trend-engine.js"
    - "lib/director-ia-commercial-trend.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"
    - "server.js"
    - "test/director-ia-commercial-trend.test.js"

  conditional_writable:
    - "frontend-dashboard/src/components/ArrVentaGraficaModal.tsx"
    - "existing Director IA/planner/orchestrator tests/scripts only when required"

  read_only:
    - "contracts"
    - "sql/**"
    - "unrelated frontend"

out_of_scope:
  - "comments parity"
  - "cliente_nombre join"
  - "longitudinal client profile"
  - "Taller Mayor"
  - "SEH"
  - "personalized greeting"
  - "closed-month IGF"
  - "schema"
  - "SQL execution"
  - "matrix changes"
  - "contract changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Architecture B implemented."
  - "Dashboard and chat use shared engine."
  - "No internal HTTP."
  - "No duplicated chat SQL."
  - "30/90 semantics preserved."
  - "MAX(fecha) anchor preserved."
  - "CASA/COMISIONISTA semantics preserved."
  - "OLS parity proven."
  - "Top-6 mover parity proven."
  - "Comments excluded."
  - "commercial_trend intent works."
  - "Range/channel slots work."
  - "CASA -> COMISIONISTA followup works."
  - "Comparison works."
  - "Mover != cause."
  - "Existing dashboard behavior preserved."
  - "Regression suite green."
  - "git diff --check clean."
  - "52.5% preserved."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md