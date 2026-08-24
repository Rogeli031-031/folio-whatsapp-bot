# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice B aprobado para cross-metric follow-up diario:
  cuando el planner aislado devuelve unknown, el contexto activo pertenece a una
  métrica diaria con active_date válida y el turno actual nombra inequívocamente
  la otra métrica diaria soportada, cambiar el intent efectivo conservando la
  fecha, hacer requery del pack correcto y reemplazar el gap del dominio previo,
  sin phrasebook, sin nuevo intent y sin inventar fechas.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
    determination: "READY_WITH_LIMITS"
    strategy: "B — contextual metric switch post-planner"

product_principle: >
  La fecha puede venir del contexto conversacional diario. La métrica debe venir
  del turno actual. Compartir fecha no significa compartir pack ni evidencia.

supported_daily_metrics:

  sales:
    intent: "daily_sales_deviation"

  discount:
    intent: "daily_discount_deviation"

  rule: >
    El first slice cubre únicamente sales <-> discount_per_kg.

core_switch_rule:

  preconditions:
    - "isolated planner intent = unknown"
    - "current parent_intent is a supported daily metric intent"
    - "active_date exists and is valid"
    - "current turn names the other supported daily metric unequivocally"
    - "current turn does not explicitly request a monthly period"
    - "current turn does not provide a conflicting explicit date"

  behavior:
    - "switch effective intent to target daily metric"
    - "preserve/revalidate active_date"
    - "requery target metric pack"
    - "replace last_evidence_bundle_type"
    - "derive new pending_information_gap from target pack"
    - "do not reuse prior metric evidence"

  invariant: >
    CONSERVAR FECHA != CONSERVAR MÉTRICA.

routing_examples:

  sales_to_discount:
    sequence:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento?"
    expected:
      - "turn 1 = daily_sales_deviation"
      - "turn 2 = daily_discount_deviation"
      - "same active_date"
      - "fresh discount pack"

  discount_to_sales:
    sequence:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Y la venta?"
    expected:
      - "turn 1 = daily_discount_deviation"
      - "turn 2 = daily_sales_deviation"
      - "same active_date"
      - "fresh sales pack"

metric_recognition:

  strategy: >
    Reutilizar las señales semánticas ya existentes de venta/ventas/vend* y
    descuento para reconocer la métrica objetivo dentro de un contexto diario.

  allowed:
    - "reuse existing normalized metric tokens/predicates"
    - "minimal helper that distinguishes supported metric signal"

  prohibited:
    - "phrasebook de frases completas"
    - "hardcode exacto de '¿Y el descuento?'"
    - "hardcode exacto de '¿Y la venta?'"
    - "listas de sinónimos extensas"
    - "nuevo cross_metric intent"
    - "segunda llamada LLM"

  rule: >
    Reconocer una métrica, no una frase.

same_metric_followup:

  examples:
    - "venta ayer -> ¿Quién explicó más?"
    - "venta ayer -> ¿Y eso?"
    - "descuento ayer -> ¿Quién lo movió más?"
    - "descuento ayer -> ¿Qué más?"

  behavior: >
    Si el turno no nombra inequívocamente la otra métrica, preservar natural
    follow-up strategy B y heredar el parent_intent actual.

  rule: >
    No convertir cualquier unknown en metric switch.

ambiguity:

  examples:
    - "¿Y eso?"
    - "¿Y lo otro?"
    - "¿Y margen?"
    - "¿Cómo estuvo?"

  rules:
    - "no infer unsupported metric"
    - "no force sales/discount"
    - "existing inheritance/clarification behavior remains"

date_policy:

  inherited_date:
    allowed_when:
      - "supported daily parent intent"
      - "active_date valid"
      - "no explicit replacement date"

  explicit_date:
    rule: >
      Una fecha explícita en el turno actual prevalece sobre active_date.

  no_active_date:
    rule: >
      Si no existe active_date diaria válida, el switch contextual NO puede
      inventar ayer. Dejar que planner/routing normal actúe o clarificar.

  timezone:
    preserve: "America/Mexico_City"

  day_completion:
    preserve: true

daily_monthly_boundary:

  examples:
    daily_contextual:
      - "venta ayer -> ¿Y el descuento?"
      - "descuento ayer -> ¿Y la venta?"

    monthly:
      - "¿Cómo va el descuento este mes?"
      - "¿Y la venta mensual?"

  rule: >
    Una señal explícita mensual debe tomar el path mensual correspondiente y no
    reutilizar active_date diaria.

state_transition:

  before:
    fields:
      - "parent_intent = source daily metric"
      - "active_date = current daily date"
      - "last_evidence_bundle_type = source metric"
      - "pending_information_gap = source pack gap"

  after_switch:
    fields:
      - "parent_intent = target daily metric"
      - "active_date = inherited/revalidated date"
      - "last_evidence_bundle_type = target metric"
      - "pending_information_gap = freshly derived from target pack"

  prohibited:
    - "carrying sales gap into discount"
    - "carrying discount gap into sales"
    - "carrying source evidence payload"

gap_replacement:

  mandatory: true

  rule: >
    El gap del dominio anterior se invalida/reemplaza al cambiar de métrica.
    Una fecha compartida no vuelve compatibles los gaps.

  example:
    - "sales missing customer explanation != discount missing explanation"

previous_frame_boundary:

  use_for_cross_metric_switch: false

  rule: >
    Este slice es cambio de métrica dentro de un contexto diario compartido, no
    retorno a un tema anterior.

  preserve_existing_previous_frame_semantics: true

persistent_memory_boundary:

  use_for_cross_metric_switch: false
  preserve_pending_work_items_only: true

evidence_policy:

  required:
    - "fresh target loader"
    - "current authz"
    - "current plant scope"
    - "current provenance"
    - "current absence/error semantics"

  invariant: >
    ACTIVE_DATE REUSE != EVIDENCE REUSE.

loaders:

  sales_target:
    use_existing: "loadDailySalesDeviationForChat"

  discount_target:
    use_existing: "loadDailyDiscountDeviationForChat"

  rule: >
    No duplicar loaders ni reconstruir packs.

GPT_boundary:

  runtime_owns:
    - "metric recognition"
    - "effective intent switch"
    - "date inheritance/revalidation"
    - "pack selection"
    - "requery"
    - "state transition"
    - "gap replacement"
    - "authz"
    - "provenance"

  GPT_owns:
    - "interpretation"
    - "explanation"
    - "synthesis"
    - "what matters"
    - "information-gap wording"
    - "follow-up conversation"

  rule: >
    GPT debe recibir el pack correcto. No pedirle que detecte o repare un pack
    equivocado después de cargarlo.

mandatory_product_conversations:

  conversation_1:
    turns:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento?"
      - "¿Quién lo movió más?"
      - "¿Tenemos explicación?"
    required:
      - "sales -> discount switch"
      - "active_date preserved"
      - "discount pack"
      - "followups inherit discount"

  conversation_2:
    turns:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Y la venta?"
      - "¿Quién explica más?"
      - "¿Sabemos por qué?"
    required:
      - "discount -> sales switch"
      - "sales pack"
      - "same date"

  conversation_3_same_metric:
    turns:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y eso?"
      - "¿Qué más?"
    required:
      - "no metric switch"
      - "sales inheritance"

  conversation_4_no_date:
    turns:
      - "¿Y el descuento?"
    setup: "no valid daily state"
    required:
      - "no invented yesterday"
      - "normal clarification/routing"

  conversation_5_monthly:
    turns:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento este mes?"
    required:
      - "monthly signal wins"
      - "no daily active_date forcing"

  conversation_6_topic_state:
    turns:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento?"
      - "Volvamos a Arturo."
    required:
      - "cross-metric switch must not corrupt previous_frame semantics"

holdout_generalization:

  examples_for_tests_only:
    - "¿Qué pasó con el descuento?"
    - "¿Y en descuento cómo quedó?"
    - "¿Qué tal las ventas?"
    - "¿Cómo salió la venta?"
    - "¿Y el descuento por kilo?"

  rule: >
    Los textos hold-out NO deben aparecer como reglas exactas en lib/.

  required_check: >
    Buscar en production routing y confirmar que los hold-outs no fueron
    hardcodeados como phrasebook.

authz_security:

  preserve:
    - "plantas_permitidas"
    - "current plant"
    - "no cross-plant"
    - "fail-closed"
    - "history != evidence"
    - "memory != evidence"

regressions_to_preserve:
  - "daily_sales_deviation standalone"
  - "daily_discount_deviation standalone"
  - "natural follow-up strategy B"
  - "intra-session previous_frame"
  - "action-person routing"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "persistent memory"
  - "M9 monthly"

tests_required:

  focal:
    - "sales daily -> discount metric switch"
    - "discount daily -> sales metric switch"
    - "same active_date"
    - "fresh target pack"
    - "parent_intent updated"
    - "bundle type updated"
    - "old gap replaced"
    - "same-metric followup preserved"
    - "no active_date -> no invented date"
    - "monthly signal does not use daily switch"
    - "unsupported metric does not switch"

  holdout:
    - "metric wording variants not in production phrasebook"

  regression:
    - "topic return"
    - "daily sales"
    - "daily discount"
    - "action-person"
    - "natural followup"
    - "persistent memory"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-planner.js"
    - "test/director-ia-daily-cross-metric-followup.test.js"

  conditional_writable:
    - "existing Director IA tests if legitimate regression assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "new intent"
  - "phrasebook"
  - "new daily metrics"
  - "topic stack"
  - "persistent topic memory"
  - "SQL 017 execution"
  - "IGF -> Folios executive reasoning"
  - "matrix changes"
  - "contract changes"
  - "schema changes"
  - "new tables"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy B implemented."
  - "Sales -> discount works without repeating date."
  - "Discount -> sales works without repeating date."
  - "Date inherited only from valid daily context."
  - "No date invented."
  - "Explicit period/date precedence preserved."
  - "Same-metric followups preserved."
  - "Target pack requeried."
  - "Parent intent and bundle type updated."
  - "Prior metric gap replaced."
  - "Previous_frame unaffected."
  - "Persistent memory not used."
  - "No phrasebook."
  - "Holdout generalization."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md