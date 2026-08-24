# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "PRODUCT_IMPACT_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false

objective: >
  Medir cuánto mejoró realmente la experiencia conversacional de Director IA
  después de continuidad efímera, memoria pending_work_items_only,
  plant_diagnosis multi-source, commercial materiality y daily_sales_deviation;
  identificar exactamente un cuello de botella actual que todavía impida
  conversar naturalmente con una IA que conoce los datos y, cuando no tiene
  información suficiente, sabe qué necesita para continuar.

north_star: >
  Director IA debe permitir conversar naturalmente sobre la empresa con una IA
  que conoce los datos disponibles. La infraestructura entrega evidencia,
  permisos, memoria, identidad, periodos, cálculos y provenance. GPT conserva
  síntesis, explicación, preguntas de seguimiento y razonamiento conversacional.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

before_reference:
  audit: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"

  prior_bottleneck: >
    Preguntas diarias como “¿por qué bajó la venta ayer?” eran interceptadas
    o perdidas por paths mensuales.

new_capabilities_since_gap_002:
  - "daily_sales_deviation"
  - "ayer America/Mexico_City"
  - "same-weekday / 14-day reference"
  - "customer contribution"
  - "channel contribution"
  - "DICF/comments por cliente_key"
  - "information gaps"
  - "7-turn daily conversational inheritance"

primary_question: >
  Ahora que el cuello diario de venta fue corregido, ¿cuál es el ÚNICO mayor
  obstáculo restante para cumplir el north star?

candidate_gaps_to_evaluate_not_assume:

  daily_discount:
    examples:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Fue general o algunos clientes?"
      - "¿Quién movió el ponderado?"
    known:
      - "not implemented"
      - "formula audited = SUM(monto)/SUM(kg)"
      - "no channel in discount source"

  natural_followups:
    examples:
      - "¿Y eso?"
      - "¿Cómo así?"
      - "¿Qué más?"
      - "¿Entonces?"
      - "¿Y los demás?"
    question: >
      ¿El phrasebook/follow-up detector sigue siendo demasiado rígido aunque
      exista structured_conversation_state?

  action_routing:
    examples:
      - "¿Qué pasó con la acción de Julio?"
      - "¿Por qué no la cerró?"
      - "¿Ya respondió?"
    known_prior_issue: >
      “qué pasó con” podía entrar a memoria en vez de Action Register.

  information_gap_expression:
    examples:
      - "¿Qué te falta?"
      - "¿Quién puede conseguirlo?"
      - "¿Para qué lo necesitas?"
    question: >
      ¿GPT recibe suficiente evidence/limitations para formular naturalmente
      la brecha o sigue dependiendo de frases enlatadas?

  economic_tradeoff:
    example: >
      Arturo dejó de comprar y competencia ofrece mejor condición; ¿conviene
      recuperarlo si deteriora margen?

    known_prior_limit:
      - "no client-level structured offer"
      - "no reliable client-level margin calculation"

  persistent_memory_deployment:
    known:
      - "repo support implemented"
      - "SQL 017 may still be unapplied"

  overprogramming:
    question: >
      ¿Existen reglas recientes que reducen naturalidad y podrían sustituirse
      por evidence + state + GPT sin sacrificar verdad?

mandatory_before_after_tests:

  conversation_A_plant:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué te llama la atención?"
      - "¿Por qué?"
      - "¿Y Arturo?"
      - "¿Qué sabemos de él?"
      - "¿Tiene acción?"
      - "¿Qué falta saber?"
      - "¿Quién puede darnos esa información?"
      - "¿Para qué la necesitas?"

  conversation_B_daily_sales:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿Contra qué la comparas?"
      - "¿Qué clientes explican más?"
      - "¿Y por canal?"
      - "¿Sabemos por qué?"
      - "¿Qué falta investigar?"
      - "¿Quién puede aclararlo?"

  conversation_C_daily_discount:
    turns:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Fue general?"
      - "¿Quién movió más el promedio?"
      - "¿Sabemos por qué?"
      - "¿Qué falta?"

  conversation_D_action:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no la ha cerrado?"
      - "¿Lo sabemos?"
      - "¿Qué necesitas para saberlo?"

  conversation_E_memory:
    session_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué falta?"
    session_2:
      - "¿Qué pasó con Arturo?"
      - "¿Ya sabemos por qué?"

  conversation_F_free_followups:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y eso?"
      - "¿Cómo así?"
      - "¿Qué más?"
      - "¿Entonces qué falta?"
    purpose: >
      Medir si Director IA conversa o solo reconoce follow-ups enumerados.

trace_requirements_for_each_turn:
  - "intent"
  - "parent_intent"
  - "follow-up classification"
  - "active entity"
  - "active date if applicable"
  - "sources loaded"
  - "evidence supplied to GPT"
  - "limitations"
  - "whether answer is deterministic or GPT-generated"
  - "where failure occurs"

impact_comparison:

  compare_gap_002_vs_now:
    dimensions:
      - "naturalness"
      - "correct routing"
      - "daily awareness"
      - "data grounding"
      - "follow-up continuity"
      - "ability to identify unknowns"
      - "ability to say what information is needed"
      - "cross-session continuity"
      - "overprogramming"

  required_conclusion: >
    State explicitly what daily_sales_deviation fixed and what it did not fix.

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

reasoning_boundary_audit:

  classify:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"
    - "UNKNOWN"

  inspect:
    - "follow-up phrase matching"
    - "pending gap text"
    - "daily pack"
    - "commercial materiality"
    - "early returns"
    - "special prompts"

  required_question: >
    ¿Estamos todavía programando frases/conclusiones que GPT podría formular
    naturalmente si recibe state + evidence correctos?

information_gap_quality:

  target: >
    No basta con “no hay suficiente información”.

  evaluate:
    - "what is known"
    - "what is unknown"
    - "exact missing datum"
    - "why needed"
    - "possible source"
    - "physically-linked person only if valid"
    - "what decision/analysis it unlocks"

  determine:
    - "whether runtime supplies enough structure"
    - "whether GPT gets freedom to formulate it"
    - "whether phrasebook blocks natural variants"

daily_discount_audit:

  required:
    - "confirm source"
    - "daily date capability"
    - "weighted formula"
    - "customer decomposition feasibility"
    - "mix effect feasibility"
    - "business evidence join feasibility"
    - "what exactly is missing"

  rule: >
    Do not automatically make daily_discount the winner just because daily sales
    is now solved.

action_routing_audit:

  required:
    - "trace 'qué pasó con la acción de Julio'"
    - "trace 'por qué no la cerró'"
    - "determine whether existing AR/history data is sufficient"
    - "distinguish routing bug from missing data"

memory_deployment_audit:

  required:
    - "repo capability exists"
    - "do not claim environment active without SQL 017 confirmation"

  rule: >
    Deployment-only gap should win only if it is the main blocker of the north
    star in actual target environment.

single_bottleneck:

  exactly_one: true

  required_fields:
    - "name"
    - "failure_class"
    - "physical_location"
    - "evidence"
    - "why it is now the largest blocker"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Choose by impact on natural business conversation, not percentage, ease,
    recency, or previous ranking.

next_task_policy:
  exactly_one: true
  authorize: false
  execute: false

  rule: >
    NEXT_TASK must directly address the demonstrated single bottleneck.
    It may be readiness, implementation, simplification, routing fix, or
    deployment task depending on evidence.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Gap 002 vs now compared explicitly."
  - "Six conversations traced."
  - "Daily sales improvement measured."
  - "Daily discount audited."
  - "Action routing audited."
  - "Free-form follow-ups audited."
  - "Information-gap quality audited."
  - "Overprogramming audited."
  - "Memory deployment separated."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK."
  - "52.5% unchanged."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003.md