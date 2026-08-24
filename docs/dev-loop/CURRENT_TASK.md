# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "EXECUTIVE_CONVERSATION_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Evaluar Director IA como producto conversacional integrado, no como suma de
  features aisladas, después de corregir venta diaria, descuento/kg diario,
  Action Register por responsable, follow-ups naturales, continuidad y memoria
  en repositorio. Identificar exactamente un cuello de botella actual que más
  impida sostener una conversación ejecutiva coherente sobre la empresa.

north_star: >
  El usuario debe poder conversar naturalmente con Director IA como con alguien
  que conoce la empresa, conserva el hilo, cambia de tema sin perder contexto,
  vuelve a temas previos, usa evidencia real y, cuando no sabe algo, identifica
  con precisión qué información necesita para continuar.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

fixed_bottlenecks_not_to_reselect:
  - "GAP-002: venta de ayer interceptada por mensual"
  - "GAP-003: phrasebook cerrado de follow-ups"
  - "GAP-004: Action Register por persona/acción"
  - "GAP-005: descuento/kg diario sin pack"

current_verified_capabilities:
  - "plant_diagnosis multi-source"
  - "financial_diagnosis multi-source"
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "action_status by responsible/action"
  - "natural follow-up inheritance strategy B"
  - "structured conversation state"
  - "pending_work_items_only in repository"
  - "commercial materiality/coverage"
  - "fresh requery per turn"

known_deferred_candidates_not_assume:
  - "topic return / topic stack"
  - "persistent memory deployment SQL 017"
  - "client-level economic tradeoff"
  - "cross-session period memory"
  - "validated decision memory"
  - "other unseen conversational gap"

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

mandatory_long_conversation:

  turns:
    - "¿Cómo va Puebla?"
    - "¿Qué te preocupa?"
    - "¿Y Arturo?"
    - "¿Sabemos por qué dejó de comprar?"
    - "¿Qué necesitarías para saberlo?"
    - "¿Cómo estuvo la venta ayer?"
    - "¿Qué fue lo que más la movió?"
    - "¿Y el descuento?"
    - "¿Quién lo movió más?"
    - "¿Tiene alguna acción?"
    - "¿Está vencida?"
    - "Bueno, volviendo a Arturo, ¿qué sabemos realmente?"
    - "¿Qué te falta para decirme si vale la pena recuperarlo?"
    - "Ahora dime el presupuesto."
    - "¿Y eso?"
    - "Volvamos a la venta de ayer."
    - "¿Quién explicó más?"
    - "¿Qué sigue sin explicación?"
    - "¿Quién podría aclararlo?"
    - "¿Para qué necesitamos esa información?"

  purpose: >
    Medir si Director IA puede sostener una conversación ejecutiva real con
    cambios de dominio, retorno a temas anteriores, entidades, fechas, acciones
    y gaps sin exigir wording especial ni perder contexto.

mandatory_secondary_conversations:

  A_cross_topic_return:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora presupuesto."
      - "Volvamos a Arturo."
      - "¿Qué faltaba saber?"

  B_cross_daily_return:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "Ahora dime el descuento/kg."
      - "Volvamos a la venta."
      - "¿Qué cliente explicaba más?"

  C_action_return:
    turns:
      - "¿Qué pasó con la acción de Julio?"
      - "Ahora dime Puebla."
      - "Volvamos a la acción."
      - "¿Por qué seguía abierta?"

  D_tradeoff:
    turns:
      - "Arturo dejó de comprar y competencia ofrece más."
      - "¿Conviene recuperarlo?"
      - "¿Qué dato económico falta?"
      - "Si tuvieras ese dato, ¿qué calcularías?"

  E_memory:
    session_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué falta?"
    session_2:
      - "¿Qué pasó con Arturo?"
      - "¿Qué quedó pendiente?"

trace_each_turn:
  required:
    - "isolated planner intent"
    - "parent_intent"
    - "inherit yes/no"
    - "active entity"
    - "active date"
    - "topic/domain"
    - "sources loaded"
    - "fresh requery"
    - "evidence supplied"
    - "limitations supplied"
    - "GPT invoked"
    - "deterministic reply"
    - "failure point"
    - "whether previous topic can be recovered"

topic_model_audit:

  mandatory:
    - "inspect current structured_conversation_state"
    - "determine whether only one active parent_intent exists"
    - "determine what is overwritten on standalone switch"
    - "determine if prior topic/entity/date can be recovered"
    - "determine if history contains enough signal but runtime discards it"
    - "determine whether a topic stack is actually required"

  key_questions:
    - "¿Qué pasa al cambiar plant_diagnosis -> budget -> volver?"
    - "¿Qué pasa daily_sales -> daily_discount -> volver?"
    - "¿Qué pasa action_status -> plant -> volver?"
    - "¿Se puede regresar sin guardar raw history?"
    - "¿Hace falta uno o varios prior contexts?"

  rule: >
    No asumir que topic stack es el ganador. Demostrarlo físicamente.

return_to_topic_audit:

  examples:
    - "Volvamos a Arturo."
    - "Volvamos a la venta de ayer."
    - "Retomemos la acción."
    - "¿Dónde nos quedamos?"

  determine:
    - "whether planner recognizes standalone/return semantics"
    - "whether previous context is recoverable"
    - "whether persistent memory helps or should not"
    - "whether ephemeral state is sufficient"
    - "whether safe structured prior-context buffer would solve it"

memory_boundary:

  persistent_work_items:
    purpose: "cross-session pending investigations"

  topic_return:
    purpose: "within-session conversational navigation"

  rule: >
    No abusar de persistent memory para resolver cambio/retorno de tema dentro
    de la misma sesión si el problema pertenece al estado efímero.

economic_tradeoff_audit:

  required:
    - "what data exists"
    - "what data is missing"
    - "whether GPT already identifies missing economic variables"
    - "whether this blocks natural conversation or only the final decision"

  rule: >
    Missing client economics should not win if Director IA can already explain
    exactly what is missing and continue the conversation coherently.

information_gap_quality:

  mandatory:
    - "what is known"
    - "what is unknown"
    - "specific missing datum"
    - "why needed"
    - "possible physical source"
    - "linked person if physically valid"
    - "what calculation/decision becomes possible"

  question: >
    Does Director IA now behave like someone who can continue investigating,
    or does it still terminate the conversation at “insufficient information”?

reasoning_boundary_audit:

  inspect:
    - "remaining deterministic early returns"
    - "gap templates"
    - "intent-specific templates"
    - "topic-switch logic"
    - "memory resume logic"

  classify:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"

deployment_gap:
  SQL017:
    repository: "IMPLEMENTED"
    environment: "UNCONFIRMED"

  rule: >
    Do not select deployment as bottleneck unless it blocks the main intended
    conversation more than other runtime gaps.

single_bottleneck:

  exactly_one: true

  required:
    - "name"
    - "failure_class"
    - "physical_location"
    - "affected turns/conversations"
    - "why it is now the biggest blocker"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Choose by impact on sustained executive conversation, not module coverage,
    ease, recency, or symmetry.

next_task:
  exactly_one: true
  authorize: false
  execute: false

  rule: >
    Propose only the task that directly addresses the demonstrated single
    bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006.md"

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
  - "Long executive conversation traced."
  - "Secondary return-to-topic conversations traced."
  - "Current state overwrite behavior physically audited."
  - "Topic-return gap audited."
  - "Persistent memory boundary respected."
  - "Tradeoff gap audited."
  - "Information-gap depth audited."
  - "Reasoning boundary audited."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006.md