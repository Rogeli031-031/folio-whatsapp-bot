# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007
  y autorizo G1 exclusivamente para auditoría read-only de producto.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "INTEGRATED_CONVERSATIONAL_PRODUCT_AUDIT"
  implementation: false
  code_changes: false
  runtime_changes: false
  tests_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Evaluar Director IA como una conversación ejecutiva integrada después de
  corregir los cuellos GAP-002 a GAP-006. Determinar exactamente un cuello de
  botella actual que todavía impida sentir que se conversa con alguien que
  conoce los datos de la empresa, sigue el hilo, cambia y retoma temas y, cuando
  no sabe algo, identifica de forma útil qué información necesita.

north_star: >
  El usuario debe poder hablar naturalmente con Director IA sin aprender
  comandos o frases especiales. Director IA debe recuperar la evidencia
  adecuada, sostener contexto, cambiar y retomar temas, distinguir observación
  de causalidad y responder qué sabe, qué no sabe y qué necesita investigar.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

fixed_bottlenecks_not_to_reselect:
  - "GAP-002: daily sales routed to monthly"
  - "GAP-003: closed follow-up phrasebook"
  - "GAP-004: Action Register person/action routing"
  - "GAP-005: daily discount/kg missing pack"
  - "GAP-006: intra-session topic return/context discard"

current_verified_capabilities:
  - "plant_diagnosis multi-source"
  - "financial_diagnosis multi-source"
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "action_status by responsible/action"
  - "natural follow-up inheritance strategy B"
  - "structured_conversation_state"
  - "exactly one previous_frame"
  - "pending_work_items_only in repository"
  - "fresh requery"
  - "commercial materiality/coverage"

product_method:
  sequence:
    - "ask naturally"
    - "observe"
    - "trace physical runtime"
    - "classify failure"
    - "select exactly one bottleneck"

  rule: >
    Do not infer the next task from the known backlog. The conversation must
    demonstrate the next bottleneck.

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

mandatory_executive_conversation:

  turns:
    - "¿Cómo va Puebla?"
    - "¿Qué te preocupa?"
    - "¿Y Arturo?"
    - "¿Qué sabes realmente de él?"
    - "¿Qué te falta saber?"
    - "¿Para qué necesitas ese dato?"
    - "¿Cómo estuvo la venta ayer?"
    - "¿Qué fue lo más importante?"
    - "¿Quién explica más la caída?"
    - "¿Sabemos por qué?"
    - "¿Y el descuento?"
    - "¿Quién lo movió más?"
    - "¿Tenemos explicación?"
    - "Volvamos a Arturo."
    - "¿Qué era lo que faltaba?"
    - "¿Tiene alguna acción?"
    - "¿Está vencida?"
    - "¿Por qué sigue abierta?"
    - "Retomemos la venta de ayer."
    - "¿Qué sigue sin explicación?"
    - "¿Quién podría aclararlo?"
    - "¿Para qué necesitamos preguntárselo?"
    - "Ahora dime el presupuesto."
    - "¿Qué te llama la atención?"
    - "Volvamos a Puebla."
    - "¿Qué revisarías primero?"

  purpose: >
    Evaluar si Director IA sostiene una conversación larga sin reiniciar
    contexto, mezclar dominios o requerir wording especial.

holdout_conversation:

  rule: >
    Usar además una conversación equivalente con formulaciones NO presentes en
    tests ni phrasebooks conocidos.

  example_variants_for_test_design_only:
    - "¿Qué ves raro?"
    - "¿Y él qué?"
    - "¿Qué me falta entender?"
    - "¿De dónde sale eso?"
    - "¿Qué otro foco ves?"
    - "Regresemos a lo anterior."
    - "¿Qué quedaba pendiente ahí?"
    - "¿Quién tendría que explicarnos eso?"
    - "¿Qué podríamos concluir si tuviéramos ese dato?"

  warning: >
    No convertir estos ejemplos en reglas de producción.

trace_each_turn:

  required:
    - "isolated planner intent"
    - "effective intent"
    - "parent_intent"
    - "previous_frame before/after"
    - "inherit yes/no"
    - "active entity"
    - "active date"
    - "plant scope"
    - "sources loaded"
    - "fresh requery yes/no"
    - "evidence supplied to GPT"
    - "limitations supplied"
    - "GPT invoked yes/no"
    - "deterministic response yes/no"
    - "failure point"
    - "whether answer can naturally support next turn"

conversation_quality_dimensions:

  continuity:
    - "does it know what we are still discussing?"
    - "does it survive topic changes?"
    - "does return work?"

  grounding:
    - "correct sources?"
    - "correct period?"
    - "correct entity?"
    - "fresh evidence?"

  executive_value:
    - "does answer say what matters?"
    - "does it distinguish magnitude from cause?"
    - "does it identify priorities without inventing?"

  information_gap:
    - "what is known?"
    - "what is not known?"
    - "what exact datum is missing?"
    - "why is it needed?"
    - "who can provide it only if physically linked?"
    - "what analysis/decision does it unlock?"

  conversational_naturalness:
    - "does user need canonical wording?"
    - "does answer feel reset?"
    - "does GPT get enough freedom?"

  truth:
    - "contribution != causality"
    - "comment != fact"
    - "responsible != culprit"
    - "memory != evidence"
    - "history != evidence"

information_gap_stress_test:

  mandatory_cases:
    - "sales contributor with no explanation"
    - "discount contributor with no explanation"
    - "overdue action with no delay reason"
    - "Arturo tradeoff missing client economics"

  target_behavior: >
    Director IA should not stop at “no hay información suficiente” if the
    current pack can identify the missing datum and why it matters.

  audit_question: >
    Is the remaining weakness lack of evidence structure, routing, or GPT
    reasoning quality?

tradeoff_case:

  conversation:
    - "Arturo dejó de comprar y dicen que la competencia le ofrece más."
    - "¿Conviene recuperarlo?"
    - "¿Y si igualar la condición nos destruye margen?"
    - "¿Qué necesitas para poder decidir?"
    - "¿Qué calcularías con ese dato?"

  rule: >
    Do not require Director IA to calculate an answer that current data cannot
    support. Evaluate whether it correctly identifies the missing economics.

persistent_memory_case:

  repository_state: "IMPLEMENTED"
  environment_SQL017: "UNCONFIRMED unless physical evidence exists"

  rule: >
    Do not confuse deployment with conversational architecture.

  audit:
    - "whether this materially blocks current target experience"
    - "whether repo behavior is otherwise sound"

one_previous_frame_limit:

  mandatory:
    - "test a return to immediate previous topic"
    - "test a return to a topic older than previous_frame"

  expected:
    immediate_previous: "may work"
    older_topic: "must not silently recover wrong context"

  question: >
    Is the one-frame limitation now a material real-world blocker, or is it an
    acceptable first-slice constraint?

reasoning_boundary_audit:

  inspect:
    - "remaining deterministic early returns"
    - "gap templates"
    - "topic-return guards"
    - "special routing"
    - "response shortcuts"

  classify:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"

  rule: >
    If GPT already has sufficient structured evidence and limitations, prefer
    not to add deterministic conversational reasoning.

regression_of_previous_fixes:

  must_verify:
    - "daily sales still daily"
    - "daily discount still daily"
    - "AR action/person still routes"
    - "follow-ups still generalize"
    - "topic return works"
    - "no blind AR fallback"
    - "memory not used as topic stack"

  rule: >
    If a previous fix regressed, identify regression; do not pretend it is a new
    product gap.

single_bottleneck:

  exactly_one: true

  required_fields:
    - "name"
    - "failure_class"
    - "physical_location"
    - "affected conversational turns"
    - "evidence"
    - "why this is now the largest blocker"
    - "what fixing it unlocks"
    - "what it does NOT solve"

  selection_rule: >
    Choose by impact on real executive conversation. Do not choose by module
    percentage, backlog order, ease or recency.

next_task:
  exactly_one: true
  authorize: false
  execute: false

  allowed_types:
    - "ARCH readiness"
    - "IMPL if fully proven"
    - "SIMPLIFICATION"
    - "DEPLOYMENT"
    - "DATA readiness"

  rule: >
    NEXT_TASK must directly attack the single demonstrated bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "new modules"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Integrated executive conversation traced."
  - "Hold-out language tested conceptually."
  - "Previous five bottlenecks verified as fixed or regression identified."
  - "Information-gap depth stress-tested."
  - "Tradeoff behavior audited."
  - "Persistent-memory deployment separated."
  - "One-previous-frame limitation evaluated."
  - "Reasoning boundary audited."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007.md