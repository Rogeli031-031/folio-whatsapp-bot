# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "IMPLEMENTATION"
  first_slice: "B — daily sales + daily discount/kg"

objective: >
  Implementar un brief ejecutivo diario para que Director IA pueda responder
  preguntas abiertas como “¿Cómo nos fue ayer?” sin exigir que el usuario
  nombre previamente venta o descuento. El runtime debe cargar evidencia fresca
  de venta diaria y descuento/kg para la misma planta/fecha y GPT debe sintetizar
  qué merece atención sin causalidad inventada ni respuestas programadas.

baseline:
  global: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

readiness:
  task: "ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
  determination: "READY_WITH_LIMITS"
  selected_slice: "B"

canonical_intent:
  name: "daily_executive_brief"

  meaning: >
    Solicitud semántica de panorama/resumen ejecutivo de un día sin especificar
    una métrica concreta.

  rule: >
    No implementar mediante phrasebook.

semantic_generalization:
  examples_test_only:
    - "¿Cómo nos fue ayer?"
    - "¿Qué tal estuvo ayer?"
    - "Dame el resumen de ayer."
    - "¿Cómo cerramos el día?"
    - "¿Qué pasó ayer?"
    - "¿Algo importante de ayer?"
    - "¿Qué debo saber de ayer?"

  requirement: >
    Debe generalizar a wording no listado.

  prohibited:
    - "switch por frases exactas"
    - "phrasebook"
    - "hardcode de respuesta"

standalone_precedence:
  rule: >
    Una pregunta explícita de venta o descuento conserva sus intents existentes.

  examples:
    sales: "¿Cómo estuvo la venta ayer?"
    expected_sales_intent: "daily_sales_deviation"

    discount: "¿Cómo estuvo el descuento/kg ayer?"
    expected_discount_intent: "daily_discount_deviation"

  brief_only_when: >
    El usuario pide panorama diario sin seleccionar una métrica específica.

date_semantics:
  timezone: "America/Mexico_City"

  rules:
    - "reutilizar resolución diaria existente"
    - "ayer = día calendario completo"
    - "fecha explícita gana"
    - "hoy no se trata silenciosamente como día cerrado"
    - "0 filas != 0"

plant_semantics:
  rules:
    - "usar planta explícita si existe y está autorizada"
    - "si existe contexto de planta válido, revalidarlo"
    - "respetar authz"
    - "no cruzar plantas"

metric_composition:

  sales:
    source: "existing daily_sales_deviation pack"
    required:
      - "target kg"
      - "reference"
      - "delta"
      - "contributors"
      - "evidence"
      - "information gaps"
      - "provenance"

  discount_per_kg:
    source: "existing daily_discount_deviation pack"
    required:
      - "target ratio"
      - "reference pooled same-weekday 14d"
      - "delta"
      - "contributors"
      - "evidence"
      - "information gaps"
      - "provenance"

  excluded_first_slice:
    - "daily income"
    - "generic KPI registry"
    - "monthly metrics"
    - "IGF"
    - "Folios"

brief_pack:
  preferred_name: "daily_executive_brief"

  required:
    - "plant"
    - "target_date"
    - "sales block"
    - "discount block"
    - "metric-specific limitations"
    - "metric-specific provenance"
    - "partial-data state"

  principle: >
    Componer evidencia; no componer conclusiones causales.

provenance:
  rule: >
    Venta y descuento conservan provenance independiente.

limitations:
  rule: >
    Venta y descuento conservan sus limitaciones/gaps independientes.

  prohibited:
    - "colapsar todos los gaps en una causa única"
    - "hacer que comentario de un cliente pruebe causalidad"

partial_data:

  required_behavior:
    sales_ok_discount_missing:
      - "responder con venta"
      - "indicar que descuento no pudo establecerse"

    discount_ok_sales_missing:
      - "responder con descuento"
      - "indicar que venta no pudo establecerse"

    both_missing:
      - "no inventar resumen"
      - "explicar ausencia/error correctamente"

  invariant: "missing != zero"

materiality_strategy:
  selected: "relative evidence + GPT synthesis"

  runtime:
    provides:
      - "values"
      - "references"
      - "deltas"
      - "contributors"
      - "evidence"
      - "limitations"

  GPT:
    decides:
      - "what stands out"
      - "whether picture is mixed"
      - "what deserves attention"
      - "what remains unexplained"

  prohibited:
    - "arbitrary hard thresholds"
    - "hardcoded good/bad classification"
    - "learned materiality model in this slice"

reasoning_boundary:

  deterministic_runtime:
    - "identity/authz"
    - "plant"
    - "date"
    - "metric math"
    - "references"
    - "deltas"
    - "contributors"
    - "provenance"
    - "absence/error"

  GPT:
    - "executive synthesis"
    - "salience"
    - "tension between metrics"
    - "explanation with caveats"
    - "follow-up suggestions"

causality_boundary:

  allowed:
    - >
      “La venta subió y también aumentó el descuento/kg.”
    - >
      “Conviene revisar qué clientes contribuyeron a ambos movimientos.”

  prohibited:
    - "el descuento provocó la venta"
    - "vendimos más gracias al descuento"
    - "comentario = causa demostrada"

conversation_state:

  parent_intent: "daily_executive_brief"

  required_state:
    - "active_date"
    - "plant"
    - "last_evidence_bundle_type"
    - "brief-compatible information gaps"

  preserve:
    - "previous_frame behavior"
    - "topic-return behavior"

  prohibited:
    - "topic stack"
    - "persistent memory as daily navigation"

cross_metric_followup:

  required:
    - >
      brief -> “¿Y la venta?” -> daily_sales_deviation using same active_date
    - >
      brief -> “¿Y el descuento?” -> daily_discount_deviation using same active_date

  rule: >
    Reutilizar daily cross-metric runtime ya integrado.

open_followup:

  examples:
    - "¿Qué te llama la atención?"
    - "¿Qué más ves?"
    - "¿Qué debería revisar?"
    - "¿Qué sigue sin explicación?"

  expected: >
    Mantener el brief como contexto efectivo y llegar a GPT con evidencia del
    brief, no aclarar innecesariamente ni degradar a una sola métrica.

mandatory_validation_conversation:

  turns:
    - "¿Cómo nos fue ayer?"
    - "¿Qué te llama la atención?"
    - "¿Y la venta?"
    - "¿Y el descuento?"
    - "¿Quién lo movió más?"
    - "¿Sabemos por qué?"
    - "¿Qué sigue sin explicación?"

  validate_each_turn:
    - "planner"
    - "effective intent"
    - "active_date"
    - "plant"
    - "loaded pack"
    - "fresh requery"
    - "GPT invocation"
    - "limitations"

holdout_validation:

  unseen_wording_required: true

  examples:
    - "Cuéntame cómo estuvo el día de ayer."
    - "¿Qué panorama tuvimos ayer?"
    - "¿Hay algo de ayer que deba revisar?"

  rule: >
    At least one holdout must not depend on literal wording present in routing
    implementation.

neutral_day_behavior:
  requirement: >
    Si ambas métricas están cerca de sus referencias, GPT puede indicarlo.
    No fabricar una anomalía para hacer la respuesta interesante.

mixed_day_behavior:
  setup:
    - "sales above reference"
    - "discount/kg above reference"

  requirement: >
    Presentar la tensión ejecutiva sin atribuir causalidad.

tooling:
  preferred:
    - "reuse existing sales loader"
    - "reuse existing discount loader"
    - "compose in one brief loader/tool"

  prohibited:
    - "internal HTTP"
    - "duplicate daily SQL unnecessarily"
    - "parallel divergent formulas"

new_files_if_needed:
  preferred:
    - "lib/director-ia-daily-executive-brief.js"
    - "test/director-ia-daily-executive-brief.test.js"

preserve:
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "daily cross-metric followup"
  - "strategy B natural followup"
  - "intra-session topic return"
  - "action-person routing"
  - "IGF reviewable supports"
  - "persistent memory"
  - "M9"

out_of_scope_features:
  - "last month / last 3 months trend analysis"
  - "CASA / COMISIONISTA graph analysis"
  - "daily income"
  - "generic metric registry"
  - "scheduled morning brief"
  - "notifications"
  - "closed-month IGF semantics"
  - "longitudinal client profile"
  - "Taller Mayor unit analysis"
  - "organizational directory / SEH"
  - "personalized greeting"

tests_required:

  planner:
    - "generic daily overview -> daily_executive_brief"
    - "explicit sales -> daily_sales_deviation"
    - "explicit discount -> daily_discount_deviation"
    - "semantic holdouts"

  pack:
    - "sales + discount same date"
    - "same plant"
    - "fresh evidence"
    - "separate provenance"
    - "separate limitations"

  date:
    - "yesterday CDMX"
    - "explicit date"
    - "today semantics"
    - "no rows != zero"

  partial:
    - "sales only available"
    - "discount only available"
    - "both unavailable"
    - "tool/source error"

  conversation:
    - "brief -> open followup"
    - "brief -> sales"
    - "brief -> discount"
    - "brief -> contributor"
    - "brief -> why"
    - "brief -> unresolved gap"

  reasoning:
    - "neutral day does not manufacture issue"
    - "mixed day does not manufacture causality"

  regression:
    - "daily sales"
    - "daily discount"
    - "daily cross-metric"
    - "topic return"
    - "action-person"
    - "IGF reviewable supports"
    - "persistent memory"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-daily-executive-brief.js"
    - "test/director-ia-daily-executive-brief.test.js"

  conditional_writable:
    - "existing Director IA test scripts only if legitimate regression assertions require it"

  read_only:
    - "docs/director-ia/**"
    - "sql/**"
    - "frontend-dashboard/**"
    - "contracts"

out_of_scope:
  - "database writes"
  - "schema"
  - "SQL execution"
  - "contract changes"
  - "matrix changes"
  - "monthly/trend feature"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_executive_brief implemented."
  - "First slice B only."
  - "Generic daily overview reaches GPT."
  - "Sales + discount packs composed."
  - "Same plant/date."
  - "No phrasebook."
  - "Explicit metric paths preserved."
  - "Separate provenance/gaps."
  - "Partial data works."
  - "Neutral day safe."
  - "Mixed day no causal claim."
  - "Open followups work."
  - "Cross-metric followups work."
  - "No daily income invented."
  - "Existing capabilities preserved."
  - "Full suite green."
  - "git diff --check clean."
  - "52.5% preserved."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md