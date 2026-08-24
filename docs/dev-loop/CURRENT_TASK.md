# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001
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
  Determinar el mecanismo mínimo, seguro y generalizable para que un follow-up
  dentro de un contexto diario pueda cambiar de métrica (por ejemplo venta ↔
  descuento/kg) conservando la fecha activa cuando ésta sigue siendo válida,
  sin repetir “ayer”, sin heredar erróneamente el pack de la métrica anterior,
  sin phrasebook y sin inventar fechas.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007"
    bottleneck: "daily_followup_keeps_prior_metric_pack"
    failure_class: "OVERPROGRAMMING"

north_star: >
  En una conversación ejecutiva, si ya se estableció una fecha diaria válida y
  el usuario cambia inequívocamente de métrica, Director IA debe conservar la
  fecha, cambiar al pack correcto y reconsultar evidencia fresca.

canonical_failure:

  sequence:
    - "¿Cómo estuvo la venta ayer?"
    - "¿Y el descuento?"
    - "¿Quién lo movió más?"
    - "¿Tenemos explicación?"

  physical_current_behavior:
    - "turno 1 -> daily_sales_deviation"
    - "active_date disponible"
    - "turno 2 planner aislado -> unknown"
    - "classifyTurnKind -> pronoun"
    - "strategy B hereda daily_sales_deviation"
    - "forceIntent = daily_sales_deviation"
    - "sales pack se recarga"
    - "daily discount pack NO se carga"

  desired_behavior: >
    El turno que cambia inequívocamente a descuento debe conservar active_date,
    cambiar a daily_discount_deviation, hacer requery y luego permitir que los
    siguientes follow-ups hereden descuento.

central_principle: >
  En contexto diario:
  conservar fecha != conservar métrica.

anti_solution:
  forbidden:
    - "hardcode exacto de '¿Y el descuento?'"
    - "hardcode exacto de '¿Y la venta?'"
    - "listas extensas de frases"
    - "phrasebook métrica por métrica"
    - "segunda llamada LLM para routing"
    - "usar previous_frame para resolver un cambio de métrica dentro del mismo día"
    - "inventar active_date cuando no existe"

mandatory_runtime_audit:

  inspect:
    - "lib/director-ia-planner.js"
    - "isDailySalesDeviationQuestion"
    - "isDailyDiscountDeviationQuestion"
    - "lib/director-ia-conversation-state.js"
    - "classifyTurnKind"
    - "inherit / resolveConversationTurn"
    - "active_date"
    - "parent_intent"
    - "lib/director-ia-chat.js"
    - "forceIntent"
    - "daily sales loader"
    - "daily discount loader"
    - "previous_frame interaction"

  trace_exactly:
    - "venta ayer -> ¿Y el descuento?"
    - "descuento ayer -> ¿Y la venta?"
    - "venta ayer -> ¿Y el descuento/kg?"
    - "descuento ayer -> ¿Y las ventas?"
    - "venta ayer -> ¿Y margen?"
    - "venta ayer -> ¿Y eso?"
    - "venta ayer -> ¿Y el presupuesto?"

metric_semantics:

  daily_metrics_in_scope:
    - "sales"
    - "discount_per_kg"

  required_mapping:
    sales:
      canonical_intent: "daily_sales_deviation"

    discount:
      canonical_intent: "daily_discount_deviation"

  rule: >
    Auditar cómo detectar la métrica nombrada en el turno sin exigir la fecha
    nuevamente.

metric_signal:

  question: >
    ¿Qué señal estructural ya existe para identificar que el usuario está
    nombrando una métrica distinta aunque el planner aislado no forme todavía
    un intent diario completo?

  candidates:
    A_planner_existing_semantics:
      description: >
        Reutilizar detectores/semántica existentes de ventas/descuento,
        separando métrica de fecha.

    B_post_planner_metric_switch:
      description: >
        Si planner=unknown, contexto actual es diario y el turno contiene una
        métrica diaria inequívoca distinta, cambiar intent conservando active_date.

    C_new_cross_metric_intent:
      description: >
        Crear intent específico para cambio de métrica diario.

    D_phrasebook:
      description: "listar frases como 'y el descuento'"

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente una estrategia"
    - "preferir reuse de semántica existente"
    - "no crear intent nuevo si no es necesario"

date_inheritance:

  allowed_only_if:
    - "current parent_intent is a daily metric intent"
    - "active_date exists"
    - "active_date remains valid under current timezone semantics"
    - "user does not explicitly provide another date"

  rule: >
    La fecha puede heredarse; la métrica debe venir del turno actual.

  explicit_date_precedence:
    examples:
      - "¿Y el descuento de hoy?"
      - "¿Y la venta del lunes?"
    rule: >
      Una fecha explícita nueva debe ganar sobre active_date heredada.

  no_date_context:
    example: "¿Y el descuento?"
    state: "no active daily date"
    expected: >
      No inventar ayer. Debe usar routing/clarification normal.

cross_metric_switch:

  desired:
    from_sales_to_discount:
      precondition:
        - "parent_intent = daily_sales_deviation"
        - "active_date valid"
        - "turn names discount metric"
      result:
        - "effective_intent = daily_discount_deviation"
        - "same active_date"
        - "requery discount pack"

    from_discount_to_sales:
      precondition:
        - "parent_intent = daily_discount_deviation"
        - "active_date valid"
        - "turn names sales metric"
      result:
        - "effective_intent = daily_sales_deviation"
        - "same active_date"
        - "requery sales pack"

  rule: >
    Cross-metric switch is symmetric unless physical evidence shows otherwise.

same_metric_followup:

  examples:
    - "venta ayer -> ¿Quién explicó más?"
    - "descuento ayer -> ¿Quién lo movió más?"
    - "venta ayer -> ¿Y eso?"
    - "descuento ayer -> ¿Qué más?"

  rule: >
    Strategy B inheritance remains valid when the current turn does NOT name a
    different metric.

metric_ambiguity:

  examples:
    - "¿Y eso?"
    - "¿Y cómo estuvo?"
    - "¿Y lo otro?"
    - "¿Y margen?"

  required:
    - "do not switch metric unless signal is sufficiently specific"
    - "unknown + valid state may continue parent intent"
    - "unsupported metric should not be forced into sales/discount"

  rule: >
    No adivinar una métrica diaria.

daily_vs_monthly_boundary:

  examples:
    - "¿Y el descuento?" inside daily context
    - "¿Cómo va el descuento este mes?"
    - "¿Y la venta mensual?"

  requirement: >
    Contexto diario puede aportar fecha solo al cambio diario. Una señal
    explícitamente mensual debe tomar su path mensual correspondiente.

previous_frame_boundary:

  rule: >
    previous_frame no se usa para el cambio de métrica dentro del mismo marco
    temporal diario.

  reason: >
    Esto no es “volver a un tema anterior”; es cambiar de métrica conservando
    fecha.

persistent_memory_boundary:
  use: false
  invariant: >
    Persistent memory no participa en cross-metric follow-up.

evidence_policy:

  required:
    - "requery every switch"
    - "fresh loader for target metric"
    - "authz current"
    - "provenance current"
    - "absence/error semantics current"

  invariant: >
    Shared date context != shared evidence.

conversation_state:

  audit:
    - "active_date should remain"
    - "parent_intent must change"
    - "last_evidence_bundle_type must change"
    - "pending gap from old metric should not silently survive if incompatible"
    - "entity compatibility if any"

  desired_after_switch:
    - "parent_intent = target metric"
    - "active_date = inherited/revalidated"
    - "bundle type = target metric"
    - "new limitations/gap derived from target pack"

gap_reset:

  mandatory_audit: >
    Determine whether pending_information_gap from prior metric must be replaced
    when switching metrics.

  principle: >
    Sales gap must not become discount gap merely because date is shared.

GPT_boundary:

  runtime_owns:
    - "metric recognition"
    - "date inheritance"
    - "intent switch"
    - "requery"
    - "authz"
    - "provenance"
    - "gap replacement"

  GPT_owns:
    - "interpretation"
    - "explanation"
    - "what matters"
    - "information-gap wording"
    - "follow-ups"

  rule: >
    Do not ask GPT to repair a wrong metric pack after the fact.

generalization:

  canonical_examples:
    - "¿Y el descuento?"
    - "¿Y las ventas?"

  holdout_examples_for_tests_only:
    - "¿Qué pasó con el descuento?"
    - "¿Y en descuento cómo quedó?"
    - "¿Qué tal las ventas?"
    - "¿Cómo salió la venta?"
    - "¿Y el descuento por kilo?"

  rule: >
    Hold-outs test semantic generalization. Do not copy phrases into production
    routing.

solution_candidates:

  A_refactor_daily_metric_detection:
    description: >
      Separar detección de métrica diaria de detección de fecha, reutilizando
      los detectores actuales.

  B_contextual_metric_switch_after_unknown:
    description: >
      Post-planner: unknown + active daily context + target metric signal
      -> switch intent and inherit date.

  C_new_cross_metric_intent:
    description: >
      Introducir una nueva intención dedicada al cambio de métrica.

  D_phrasebook:
    description: "enumerar frases"

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "priorizar mínima complejidad y generalización"

tests_to_design_if_ready:

  positive:
    - "sales yesterday -> discount"
    - "discount yesterday -> sales"
    - "discount/kg wording"
    - "sales wording without repeating date"
    - "same active_date preserved"

  explicit_date:
    - "new date overrides inherited date"
    - "today does not silently mean completed day if semantics prohibit it"

  negative:
    - "no active daily context -> no invented date"
    - "¿Y eso? stays same metric"
    - "unsupported metric does not switch"
    - "monthly wording takes monthly path"

  state:
    - "parent intent changes"
    - "bundle type changes"
    - "old metric gap replaced"
    - "requery target pack"

  regression:
    - "same-metric natural followup"
    - "topic return"
    - "daily sales"
    - "daily discount"
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

  expectation: "runtime-only"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D strategy"
    - "metric recognition rule"
    - "date inheritance rule"
    - "explicit date precedence"
    - "state transition"
    - "gap replacement"
    - "requery"
    - "ambiguity behavior"
    - "daily/monthly boundary"
    - "G2/G3"
    - "percentage effect"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "topic stack"
  - "new persistent memory"
  - "new metrics beyond sales/discount"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Current sticky-metric failure traced."
  - "Metric detection separated from date if physically valid."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "Sales ↔ discount symmetry audited."
  - "Date inheritance defined."
  - "Explicit date precedence defined."
  - "No-date behavior safe."
  - "State/gap transition defined."
  - "No phrasebook solution."
  - "Requery preserved."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS.
  STOPPED if a product/architecture decision is required.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md