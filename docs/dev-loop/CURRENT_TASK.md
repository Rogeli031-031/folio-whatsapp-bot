# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "PRODUCT_GAP_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Evaluar el estado conversacional actual de Director IA después de corregir
  daily_sales_deviation, natural follow-up inheritance y Action Register por
  responsable/acción, para identificar exactamente un cuello de botella restante
  que más impida conversar naturalmente sobre la empresa con datos reales y,
  cuando falte evidencia, saber qué información se necesita para continuar.

north_star: >
  Director IA debe conversar naturalmente sobre la empresa sin exigir wording
  especial, consultar la evidencia correcta, conservar contexto y memoria, y
  distinguir con claridad hechos, inferencias y datos faltantes.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

fixed_bottlenecks_not_to_reselect:
  - "GAP-002: daily sales question routed to monthly pack"
  - "GAP-003: closed follow-up phrasebook"
  - "GAP-004: Action Register person/action routing"

current_verified_capabilities:
  - "daily_sales_deviation"
  - "same-weekday 14-day sales reference"
  - "customer/channel contribution"
  - "natural follow-up inheritance"
  - "structured conversation state"
  - "pending_work_items_only in repository"
  - "action_status by responsible/action"
  - "AR > generic memory resume"
  - "0/1/N action handling"
  - "plant_diagnosis multi-source"
  - "financial_diagnosis multi-source"

known_remaining_candidates_not_assume:

  daily_discount:
    examples:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Quién movió más el promedio?"
      - "¿Fue general o concentrado?"

    known:
      - "not implemented"
      - "formula = SUM(monto)/SUM(kg)"
      - "daily fecha exists"
      - "cliente exists"
      - "no canal físico"

  economic_tradeoff:
    example: >
      Arturo dejó de comprar y hay evidencia almacenada de que competencia
      ofreció mejor condición. ¿Conviene recuperarlo si igualar la oferta puede
      destruir margen?

    known:
      - "no structured competitor offer"
      - "no validated client-level margin calculation"

  persistent_memory_deployment:
    known:
      - "repo capability implemented"
      - "SQL 017 environment activation unconfirmed"

  information_gap_depth:
    question: >
      ¿Ya puede Director IA ir más allá de “falta información” y decir qué dato
      concreto necesita, por qué lo necesita y qué análisis desbloquea?

  cross_topic_return:
    example:
      - "¿Cómo va Puebla?"
      - "Ahora dime presupuesto."
      - "Volvamos a lo de la venta de ayer."

    known:
      - "topic stack / cross-session period memory deferred"

  other_unseen_gap:
    rule: >
      Auditoría puede elegir algo distinto si la evidencia demuestra mayor impacto.

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

mandatory_conversations:

  A_plant:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué más?"
      - "¿Qué te preocupa?"
      - "¿Qué falta saber?"
      - "¿Para qué necesitas ese dato?"

  B_daily_sales:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿Quién explica más?"
      - "¿Sabemos por qué?"
      - "¿Qué falta?"
      - "¿Quién podría aclararlo?"

  C_action_person:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no la cerró?"
      - "¿Qué información falta?"
      - "¿Qué necesitas de Julio?"

  D_daily_discount:
    turns:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Contra qué lo comparas?"
      - "¿Quién movió más el promedio?"
      - "¿Fue general?"
      - "¿Sabemos por qué?"
      - "¿Qué falta?"

  E_tradeoff:
    turns:
      - "Arturo dejó de comprar y dicen que la competencia le ofreció más."
      - "¿Conviene recuperarlo?"
      - "¿Y si igualar la oferta nos hace perder dinero?"
      - "¿Qué información necesitas para decidir?"

  F_cross_session_memory:
    session_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué falta?"
    session_2:
      - "¿Qué pasó con Arturo?"
      - "¿Ya sabemos por qué?"

  G_topic_return:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora dime el presupuesto."
      - "Volvamos a lo de la venta de ayer."
      - "¿Quién explicó más?"

trace_each_turn:
  required:
    - "planner intent"
    - "parent_intent"
    - "inherit yes/no"
    - "active entity/date"
    - "sources loaded"
    - "fresh requery yes/no"
    - "evidence supplied"
    - "limitations"
    - "GPT invoked yes/no"
    - "deterministic reply yes/no"
    - "failure point"

before_after_comparison:

  compare:
    - "GAP-002"
    - "GAP-003"
    - "GAP-004"
    - "runtime current"

  must_state:
    - "what is genuinely fixed"
    - "what is still broken"
    - "what no longer deserves priority"

daily_discount_audit:

  mandatory:
    - "exact daily source"
    - "date semantics"
    - "SUM(monto)/SUM(kg)"
    - "reference candidate"
    - "customer weighted contribution"
    - "mix effect feasibility"
    - "business evidence join feasibility"
    - "absence/error semantics"

  critical:
    - "no average-of-averages"
    - "highest ratio != biggest mover"

  rule: >
    Choose only if it is now the largest product blocker.

economic_tradeoff_audit:

  mandatory:
    - "what data GPT currently receives"
    - "what economic data physically exists"
    - "what client-level data is missing"
    - "whether decision is calculable"
    - "whether missing piece is data or infrastructure"

  truth:
    - "comment about competition != verified competitor offer"
    - "plant margin != client margin"
    - "do not infer recoverability"

information_gap_quality:

  evaluate:
    - "known facts"
    - "unknown facts"
    - "specific missing datum"
    - "why needed"
    - "possible physical source"
    - "physically linked person only if valid"
    - "what analysis/decision becomes possible"

  question: >
    Is this now mostly GPT reasoning, or is runtime still starving GPT of the
    right limitations/evidence?

memory_deployment:

  repository: "IMPLEMENTED"
  environment: "UNCONFIRMED unless SQL 017 physical evidence exists"

  rule: >
    Do not make deployment the winner unless it is actually the largest blocker
    in the intended current environment.

topic_return_audit:

  required:
    - "trace 'volvamos a lo de...'"
    - "determine whether current state supports return"
    - "distinguish topic stack gap from ordinary follow-up"
    - "assess real frequency/impact"

overprogramming_check:

  inspect:
    - "early returns"
    - "deterministic gap wording"
    - "special-case routes"
    - "response templates"

  classify:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"

  rule: >
    Do not create new deterministic reasoning if GPT already has sufficient
    evidence.

single_bottleneck:

  exactly_one: true

  required_fields:
    - "name"
    - "failure_class"
    - "physical_location"
    - "affected conversations"
    - "evidence"
    - "why it is now the biggest blocker"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Choose by impact on real executive conversation, not coverage percentage,
    recency, symmetry, ease, or previous ranking.

next_task:
  exactly_one: true
  authorize: false
  execute: false

  rule: >
    Propose only the task that directly addresses the single demonstrated bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Current north star audited."
  - "Previous three bottlenecks verified as fixed."
  - "Seven conversations traced."
  - "Daily discount audited from scratch."
  - "Tradeoff data audited."
  - "Information-gap depth audited."
  - "Memory deployment separated."
  - "Topic-return gap audited."
  - "Overprogramming checked."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005.md