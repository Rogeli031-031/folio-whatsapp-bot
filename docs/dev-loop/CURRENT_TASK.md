# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001
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
  Determinar el mecanismo mínimo, seguro y generalizable para que Director IA
  pueda responder una petición abierta de panorama diario como “¿Cómo nos fue
  ayer?” sin exigir que el usuario nombre previamente venta, descuento u otra
  métrica, reutilizando evidencia diaria ya existente, detectando materialidad
  y dejando a GPT sintetizar qué merece atención.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008"
  bottleneck: "no_daily_executive_brief"
  failure_class: "MISSING_INFRASTRUCTURE"

north_star: >
  El director no debe conocer previamente el número que cambió. Puede pedir un
  panorama abierto del día y Director IA debe identificar qué métricas
  disponibles tuvieron movimientos materiales, explicar qué sabe y qué no sabe,
  y permitir follow-ups naturales.

canonical_question:
  text: "¿Cómo nos fue ayer?"

semantic_holdouts:
  test_only:
    - "¿Qué tal estuvo ayer?"
    - "Dame el resumen de ayer."
    - "¿Cómo cerramos el día?"
    - "¿Qué pasó ayer?"
    - "¿Algo importante de ayer?"
    - "¿Qué debo saber de ayer?"

  rule: >
    Estos textos sirven como hold-outs. No convertirlos en phrasebook.

current_failure:
  expected_trace_from_GAP008:
    isolated_planner: "unknown 0.35"
    effective: "clarification"
    GPT_invoked: false

  reason: >
    Los packs diarios actuales exigen que el usuario nombre explícitamente venta
    o descuento.

central_principle: >
  Panorama diario != métrica individual.
  El runtime debe reunir evidencia defendible; GPT decide cómo sintetizarla.

mandatory_runtime_audit:

  inspect:
    - "lib/director-ia-planner.js"
    - "daily_sales_deviation routing"
    - "daily_discount_deviation routing"
    - "lib/director-ia-daily-deviation.js"
    - "lib/director-ia-daily-discount.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "tool orchestrator"
    - "existing daily date semantics"
    - "available daily income or other metrics"

  determine:
    - "what daily packs are physically available"
    - "which share compatible date/reference semantics"
    - "whether they can be composed safely"
    - "which metrics belong in first slice"
    - "whether a new parent intent is needed"

date_semantics:

  default_target:
    canonical: "yesterday"
    timezone: "America/Mexico_City"

  rules:
    - "calendar-complete day"
    - "today is not silently treated as complete"
    - "day without rows != zero"
    - "explicit date from user wins"

  question: >
    Can brief use exactly the same date-resolution rules already used by the
    existing daily packs?

daily_metric_inventory:

  mandatory:
    sales:
      status: "existing"
      intent: "daily_sales_deviation"
      inspect:
        - "target kg"
        - "reference"
        - "delta kg/%"
        - "customer contribution"
        - "channel contribution"
        - "business evidence"
        - "information gaps"

    discount_per_kg:
      status: "existing"
      intent: "daily_discount_deviation"
      inspect:
        - "target ratio"
        - "reference"
        - "delta"
        - "customer contribution"
        - "business evidence"
        - "information gaps"

    income:
      status: "AUDIT"
      inspect:
        - "whether daily income exists physically"
        - "same grain/date"
        - "same plant scope"
        - "reference availability"

    other_metrics:
      status: "AUDIT_ONLY"
      rule: >
        Do not add to first slice merely because they exist.

first_slice_candidates:

  A_sales_only:
    description: >
      Brief abierto resuelto únicamente con venta diaria.

  B_sales_plus_discount:
    description: >
      Reutilizar los dos packs diarios ya implementados y compatibles.

  C_sales_discount_plus_income:
    description: >
      Añadir ingreso solo if physically ready with compatible daily semantics.

  D_generic_metric_registry:
    description: >
      Construir framework extensible de N métricas diarias.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "prefer smallest slice that produces a useful executive brief"
    - "do not build registry unless physically necessary"

new_intent_audit:

  candidate: "daily_executive_brief"

  determine:
    - "whether a new parent intent is cleaner than overloading plant_diagnosis"
    - "whether it can remain inheritable"
    - "whether cross-metric followups can branch naturally from it"

  rule: >
    Do not create new intent if existing architecture already has a defensible
    generic daily parent. Do not overload an unrelated monthly/plant intent.

brief_pack:

  if_ready:
    must_be_structured:
      - "target date"
      - "plant"
      - "metric blocks"
      - "reference for each metric"
      - "delta for each metric"
      - "materiality signal"
      - "top contributors"
      - "business evidence"
      - "information gaps"
      - "limitations"
      - "provenance"

  prohibited:
    - "single prewritten answer"
    - "hardcoded 'good/bad day'"
    - "causal inference"
    - "ranking metrics without a defined basis"

materiality:

  audit_question: >
    How should runtime decide which metric deserves attention without scripting
    the executive conclusion?

  candidates:
    A_show_all_supported:
      description: "always present every metric in first slice"

    B_relative_deviation:
      description: >
        expose deterministic deltas and let GPT decide what is salient.

    C_hard_thresholds:
      description: "runtime labels important/not important by thresholds"

    D_learned_score:
      description: "new materiality model"

  preferred_principle: >
    Runtime should expose comparable deltas and evidence; GPT should synthesize
    salience unless a safe deterministic materiality rule already exists.

  requirement:
    - "compare"
    - "avoid arbitrary thresholds"

executive_answer_boundary:

  runtime_owns:
    - "date"
    - "plant"
    - "metrics"
    - "reference"
    - "delta"
    - "contributions"
    - "joins"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "how the day looks overall"
    - "what stands out"
    - "what tension exists"
    - "what is explained"
    - "what remains unexplained"
    - "what to investigate next"

  examples_of_allowed_reasoning:
    - >
      “Vendimos más, pero también subió el descuento/kg; conviene revisar qué
      clientes explican ambos movimientos.”
    - >
      “Venta y descuento estuvieron cerca de referencia; no veo una desviación
      material en esas dos métricas.”

  prohibited:
    - "discount caused sales"
    - "higher sales means good day automatically"
    - "lower discount means good result automatically"

cross_metric_followup:

  required:
    sequence:
      - "¿Cómo nos fue ayer?"
      - "¿Y la venta?"
      - "¿Y el descuento?"
      - "¿Quién lo movió?"
      - "¿Sabemos por qué?"

  behavior:
    - "brief establishes active_date"
    - "metric followup selects target pack"
    - "same date preserved"
    - "cross-metric implementation already integrated must be reused"

  rule: >
    Daily brief should become a parent context from which existing daily
    cross-metric conversation can continue naturally.

same_brief_followup:

  examples:
    - "¿Qué te llama la atención?"
    - "¿Qué más ves?"
    - "¿Qué debería revisar?"
    - "¿Qué sigue sin explicación?"

  desired: >
    Reach GPT with the brief pack/state, not clarification or single-metric
    accidental inheritance.

conversation_state:

  mandatory_audit:
    - "parent_intent"
    - "active_date"
    - "last_evidence_bundle_type"
    - "pending_information_gap"
    - "previous_frame"

  determine:
    - "state shape for brief"
    - "whether metric selection replaces parent or nests under brief"
    - "how return to brief works"

  anti_scope:
    - "no topic stack"
    - "no persistent date memory"

evidence_composition:

  key_rule: >
    Combining sales + discount does not merge their causal claims.

  required:
    - "each metric retains provenance"
    - "each metric retains limitations"
    - "each metric retains its own gap"
    - "shared date/plant only where valid"

  question: >
    Should pending_information_gap support multiple metric gaps or should brief
    expose a structured limitation bundle without changing generic state?

  requirement: >
    Select the minimum safe representation. Do not redesign the entire
    conversation state unless necessary.

absence_error:

  distinguish:
    - "sales no rows"
    - "discount no rows"
    - "one metric available / another missing"
    - "source restricted"
    - "tool error"

  desired:
    - "partial brief can still be useful if one metric is valid"
    - "must disclose unavailable metric"
    - "no missing metric = zero"

holdout_generalization:

  requirement:
    - "use unseen wording in tests/audit"
    - "search production lib for phrase hardcoding"

  principle: >
    Detect semantic request for daily overview, not literal strings.

mandatory_product_conversations:

  conversation_1:
    turns:
      - "¿Cómo nos fue ayer?"
      - "¿Qué te llama la atención?"
      - "¿Y la venta?"
      - "¿Y el descuento?"
      - "¿Quién lo movió más?"
      - "¿Sabemos por qué?"
      - "¿Qué sigue sin explicación?"

  conversation_2_no_prior_metric:
    turns:
      - "Dame el resumen de ayer."
      - "¿Qué debería revisar primero?"

  conversation_3_neutral_day:
    setup: "metrics near reference"
    required: >
      Director IA must not manufacture a problem.

  conversation_4_mixed:
    setup:
      - "sales above reference"
      - "discount/kg above reference"
    required: >
      Explain tension without causal claim.

  conversation_5_partial_data:
    setup:
      - "sales available"
      - "discount unavailable"
    required:
      - "answer with sales"
      - "state discount limitation"

  conversation_6_explicit_metric:
    turns:
      - "¿Cómo estuvo la venta ayer?"
    required: >
      Existing daily_sales_deviation path must remain unchanged.

tests_to_design_if_ready:

  routing:
    - "daily overview semantic intent"
    - "holdout wording"
    - "explicit metric still wins"

  date:
    - "yesterday CDMX"
    - "explicit date"
    - "today incomplete semantics"
    - "no rows != zero"

  composition:
    - "sales + discount packs fresh"
    - "same plant/date"
    - "separate provenance/gaps"

  conversation:
    - "brief -> sales"
    - "brief -> discount"
    - "brief -> open followup"
    - "cross-metric after brief"

  partial:
    - "one metric absent"
    - "tool error"
    - "source restricted"

  regression:
    - "daily sales"
    - "daily discount"
    - "daily cross-metric"
    - "topic return"
    - "IGF reviewable supports"
    - "action-person"
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

  expectation: "runtime-only unless evidence says otherwise"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D first slice"
    - "whether new daily_executive_brief intent is required"
    - "daily metric composition"
    - "materiality strategy"
    - "date semantics"
    - "brief state shape"
    - "gap/limitation representation"
    - "partial-data behavior"
    - "GPT/runtime boundary"
    - "G2/G3"
    - "percentage effect"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp unless module policy independently changes"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "new arbitrary KPI registry"
  - "morning scheduled delivery"
  - "notifications"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Current production failure traced."
  - "Daily metrics physically inventoried."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "Phrasebook avoided."
  - "Date semantics reused."
  - "Materiality boundary defined."
  - "Brief pack/state defined."
  - "Partial-data behavior defined."
  - "Cross-metric followups preserved."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS.
  STOPPED if product/architecture choice needs HUMAN.
  BLOCKED if physical data is insufficient.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md