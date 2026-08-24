# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "PRODUCT_EXPERIENCE_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Evaluar el producto conversacional actual de Director IA después de haber
  corregido continuidad, memoria persistente en repo, daily_sales_deviation
  y natural follow-up inheritance. Determinar exactamente un cuello de botella
  actual que todavía impida conversar naturalmente con una IA que conoce los
  datos disponibles y que, cuando no tiene suficiente evidencia, identifica
  qué información necesita para continuar.

north_star: >
  El usuario debe poder hablar de forma natural con Director IA sin aprender
  frases especiales. Director IA debe acceder a evidencia confiable, conservar
  el hilo, retomar pendientes, razonar con GPT y reconocer con precisión lo
  que no sabe.

product_principle: >
  La arquitectura proporciona datos, authz, identidad, joins, fechas,
  matemáticas, provenance, memoria y contexto. GPT conserva síntesis,
  explicación, preguntas, seguimiento y razonamiento conversacional.
  No programar manualmente lo que GPT ya puede hacer con evidencia suficiente.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

implemented_since_gap_003:
  - "natural follow-up inheritance strategy B"
  - "unknown + valid context -> inherit"
  - "standalone intent precedence"
  - "no blind Action Register fallback"
  - "no bigger phrasebook"
  - "hold-out generalization"
  - "requery every turn"

already_available:
  - "plant_diagnosis multi-source"
  - "financial_diagnosis multi-source"
  - "commercial materiality/coverage"
  - "structured conversational state"
  - "pending_work_items_only in repository"
  - "daily_sales_deviation"
  - "natural follow-up inheritance"

known_deferred_items:
  - "daily discount/kg"
  - "Action Register person/action routing e.g. Julio Pérez"
  - "SQL 017 target-environment activation"
  - "client-level economic tradeoff"
  - "cross-session period/topic memory"

primary_question: >
  Después de las últimas correcciones, ¿cuál es el ÚNICO mayor impedimento
  restante para cumplir el north star?

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

mandatory_conversations:

  A_free_plant_conversation:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y eso?"
      - "No te seguí."
      - "¿Qué otra cosa ves?"
      - "¿Entonces?"
      - "¿Qué falta?"
      - "¿Quién puede aclararlo?"
      - "¿Para qué?"

    purpose: >
      Verificar que natural follow-up inheritance realmente eliminó el
      phrasebook como cuello de botella.

  B_daily_sales:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿O sea?"
      - "¿Quién explica más?"
      - "¿Y por canal?"
      - "¿Sabemos por qué?"
      - "¿Qué falta?"
      - "¿Quién puede decirnos?"

    purpose: >
      Verificar conversación natural sobre el nuevo daily pack.

  C_action_person:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no la cerró?"
      - "¿Lo sabemos?"
      - "¿Qué información falta?"

    purpose: >
      Determinar si el conocido gap de routing AR/persona es ahora el mayor
      cuello real y si los datos ya existen.

  D_daily_discount:
    turns:
      - "¿Por qué subió el descuento/kg ayer?"
      - "¿Fue general?"
      - "¿Quién movió más el promedio?"
      - "¿Sabemos por qué?"
      - "¿Qué falta?"

    purpose: >
      Determinar impacto real del gap diario de descuento.

  E_cross_session_memory:
    session_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué falta?"
    session_2:
      - "¿Qué pasó con Arturo?"
      - "¿Ya sabemos por qué?"
      - "¿Qué sigue faltando?"

    requirement: >
      Separar repository capability de environment activation. No afirmar que
      cross-session funciona físicamente en el entorno sin evidencia de SQL 017.

  F_tradeoff:
    prompt: >
      Arturo dejó de comprar y hay un comentario que dice que la competencia
      le ofrece una condición mejor. Si igualarla pudiera hacernos perder
      dinero, ¿qué sabemos y qué información necesitamos para decidir?

    purpose: >
      Medir cuánto puede razonar GPT con datos actuales y dónde falta evidencia
      económica real.

  G_topic_switch:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué más?"
      - "Ahora dime el presupuesto."
      - "¿Y eso?"
      - "Volvamos a la venta de ayer."

    purpose: >
      Verificar qué tan natural es el cambio de tema y qué parte sigue fuera
      por no existir topic stack/period memory.

trace_each_turn:
  required:
    - "isolated planner intent"
    - "parent_intent"
    - "inherit yes/no"
    - "standalone precedence"
    - "active entity/date"
    - "sources loaded"
    - "requery"
    - "evidence supplied"
    - "limitations supplied"
    - "GPT invoked yes/no"
    - "deterministic response yes/no"
    - "failure point if any"

experience_dimensions:

  naturalness:
    questions:
      - "¿puede el usuario hablar libremente?"
      - "¿requiere conocer el wording esperado?"
      - "¿las respuestas suenan como continuidad o reinician análisis?"

  knowledge:
    questions:
      - "¿carga las fuentes correctas?"
      - "¿sabe qué datos tiene disponibles?"
      - "¿se va a fuente equivocada?"

  unknown_handling:
    questions:
      - "¿dice qué sabe?"
      - "¿dice qué no sabe?"
      - "¿identifica el dato faltante?"
      - "¿explica para qué hace falta?"
      - "¿nombra persona solo con vínculo físico?"

  reasoning:
    questions:
      - "¿GPT realmente recibe libertad suficiente?"
      - "¿hay respuestas enlatadas todavía?"
      - "¿hay early returns que evitan al modelo?"
      - "¿se está sobreprogramando?"

  truth:
    questions:
      - "¿contribución se distingue de causa?"
      - "¿comment se distingue de hecho?"
      - "¿memory se distingue de evidence?"
      - "¿restricted/missing/error siguen separados?"

before_after_requirement:

  compare:
    - "GAP-002"
    - "GAP-003"
    - "runtime actual"

  must_state:
    - "qué se corrigió desde GAP-002"
    - "qué se corrigió desde GAP-003"
    - "qué sigue roto"
    - "qué ya NO debe seguir tratándose como cuello"

natural_followup_validation:

  required:
    - "confirmar que hold-outs llegan a GPT"
    - "confirmar que no dependen del texto exacto"
    - "confirmar standalone wins"
    - "confirmar entity safety"

  rule: >
    Si esto ya está resuelto, no volver a elegir follow-up inheritance como gap.

action_routing_audit:

  mandatory:
    - "trace exacto de '¿Qué pasó con la acción de Julio Pérez?'"
    - "confirmar si AR/historial/responsable ya tienen datos suficientes"
    - "determinar si el fallo es routing"
    - "determinar qué conversación desbloquearía corregirlo"

daily_discount_audit:

  mandatory:
    - "fuente física"
    - "fecha disponible"
    - "SUM(monto)/SUM(kg)"
    - "cliente disponible"
    - "canal no disponible"
    - "contribución ponderada factible sí/no"
    - "business evidence join factible sí/no"

  selection_rule: >
    No elegir daily_discount solo porque sea parecido a daily_sales.

information_gap_audit:

  mandatory:
    - "identificar si el runtime todavía genera wording rígido"
    - "identificar si GPT recibe pack + limitations suficientes"
    - "determinar si falta infraestructura o solo routing al GPT"

tradeoff_audit:

  mandatory:
    - "identificar exactamente qué datos económicos faltan"
    - "no inventar client margin"
    - "no convertir comment de competencia en causa"
    - "determinar si es problema de datos, no de GPT"

memory_audit:

  repository:
    capability: "IMPLEMENTED"

  environment:
    SQL017_status: "UNKNOWN/UNCONFIRMED unless physical evidence exists"

  rule: >
    DEPLOYMENT_GAP no debe presentarse como fallo de memoria arquitectónica.

overprogramming_check:

  inspect:
    - "phrasebook leftovers"
    - "deterministic gap replies"
    - "special early returns"
    - "intent-specific response templates"

  classify_each:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"

single_bottleneck:

  exactly_one: true

  required:
    - "name"
    - "failure_class"
    - "physical_location"
    - "conversation(s) affected"
    - "why it is now the largest blocker"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Elegir por impacto real en la conversación empresarial cotidiana, no por
    porcentaje, facilidad, recencia o simetría con una mejora anterior.

next_task:

  exactly_one: true
  authorize: false
  execute: false

  rule: >
    La NEXT_TASK debe atacar directamente el cuello único demostrado.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004.md"

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
  - "North star evaluated against current runtime."
  - "All seven product conversations traced."
  - "GAP-002 -> GAP-003 -> now compared."
  - "Natural follow-up improvement verified."
  - "Action routing audited."
  - "Daily discount audited."
  - "Memory deployment separated."
  - "Tradeoff data gap audited."
  - "Unknown handling audited."
  - "Overprogramming audited."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004.md