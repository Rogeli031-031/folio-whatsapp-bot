# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "PRODUCT_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false

objective: >
  Evaluar Director IA contra el objetivo original de producto ahora que ya
  existen acceso confiable a múltiples fuentes, continuidad conversacional
  efímera y memoria persistente de pending work items. Identificar exactamente
  qué impide todavía sostener conversaciones naturales, útiles y fundamentadas
  sobre la empresa, separando falta de datos, falta de infraestructura,
  limitación real de razonamiento del modelo y sobreprogramación.

product_north_star: >
  Director IA debe permitir conversar naturalmente sobre la empresa con una IA
  que conoce los datos disponibles. Cuando tenga evidencia suficiente debe
  razonar sobre ella; cuando no la tenga, debe identificar qué información
  necesita para continuar sin inventarla.

critical_principle: >
  No atribuir como avance nuevo una capacidad que GPT ya puede realizar cuando
  recibe contexto suficiente. La arquitectura debe encargarse de adquisición,
  permisos, identidad, joins, unidades, periodos, provenance, memoria y verdad;
  no sustituir innecesariamente el razonamiento del modelo.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  repository_capabilities:
    - "plant_diagnosis multi-source"
    - "financial_diagnosis multi-source"
    - "commercial_materiality_and_coverage"
    - "structured_conversation_state efímero"
    - "pending_work_items_only cross-session"

  deployment_note: >
    persistent memory requires SQL 017 in the target environment. Do not assume
    environment activation merely because repository support exists.

primary_question: >
  ¿Cuál es el ÚNICO cuello de botella actual que más impide cumplir el objetivo
  conversacional del producto?

failure_classification:

  MISSING_DATA:
    definition: >
      La fuente o granularidad necesaria realmente no existe o no está integrada.

  MISSING_INFRASTRUCTURE:
    definition: >
      El dato existe, pero routing, tools, context assembly, state, memory o
      runtime no se lo entregan correctamente al modelo.

  MODEL_REASONING_LIMIT:
    definition: >
      GPT recibe evidencia suficiente, correcta y contextualizada, pero la
      respuesta sigue sin alcanzar el comportamiento esperado.

  OVERPROGRAMMING:
    definition: >
      El runtime está codificando reglas que duplican razonamiento que GPT ya
      podría realizar adecuadamente con evidencia confiable.

  DEPLOYMENT_GAP:
    definition: >
      La capacidad existe en repositorio pero no está activada físicamente en
      el entorno, por ejemplo SQL 017 pendiente.

  CONTRACT_OR_AUTHZ_LIMIT:
    definition: >
      El comportamiento deseado está limitado legítimamente por contratos,
      permisos o scope.

mandatory_product_conversations:

  conversation_1_general_plant:
    purpose: "conversación natural de planta"
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué te llama la atención?"
      - "¿Por qué?"
      - "¿Y Arturo?"
      - "¿Qué sabemos de él?"
      - "¿Tiene alguna acción?"
      - "¿Qué falta saber?"
      - "¿Quién puede darnos esa información?"
      - "¿Para qué la necesitas?"

    audit:
      - "routing"
      - "state continuity"
      - "entity continuity"
      - "fresh evidence"
      - "information gap behavior"
      - "quality of final answer"

  conversation_2_daily_sales:
    purpose: "explicación de desviación diaria"
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿Contra qué la estás comparando?"
      - "¿Dónde estuvo la caída?"
      - "¿Qué clientes explican más?"
      - "¿Sabemos por qué?"
      - "¿Qué falta investigar?"
      - "¿Quién puede aclararlo?"

    audit:
      - "daily sales source"
      - "granularity"
      - "reference/average"
      - "channel/customer decomposition"
      - "mathematical contribution"
      - "causal evidence"
      - "conversation continuity"

  conversation_3_daily_discount:
    purpose: "explicación de descuento/kg"
    turns:
      - "¿Por qué subió el descuento por kg ayer?"
      - "¿Fue general o fueron algunos clientes?"
      - "¿Quién movió más el promedio?"
      - "¿Tenemos explicación?"
      - "¿Qué falta saber?"

    audit:
      - "daily discount source"
      - "weighted denominator"
      - "client/channel decomposition"
      - "comparability"
      - "mathematical contribution"
      - "causal evidence"

  conversation_4_cross_session:
    prerequisite: >
      Evaluate repository behavior and separately note whether SQL 017 is active
      in environment if evidence exists.

    day_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué información falta?"

    day_2:
      - "¿Qué pasó con Arturo?"
      - "¿Ya sabemos por qué?"
      - "¿Qué sigue faltando?"

    audit:
      - "pending memory"
      - "revalidation"
      - "memory != evidence"
      - "environment activation"

  conversation_5_management_gap:
    purpose: "acción pendiente"
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no se ha cerrado?"
      - "¿Lo sabemos?"
      - "Si no, ¿qué información necesitas?"

  conversation_6_tradeoff:
    purpose: "caso competencia/margen"
    prompt: >
      Arturo dejó de comprar y dicen que la competencia le dio una condición
      mejor. Si igualarla nos hace perder dinero, ¿qué sabemos realmente y qué
      información hace falta para decidir?

    audit:
      - "what data exists"
      - "what is only stored commentary"
      - "whether client-level economic tradeoff is physically calculable"
      - "whether GPT can properly identify missing information"

required_trace_for_each_conversation:

  trace:
    - "intent at each turn"
    - "parent intent if inherited"
    - "active entity"
    - "plant"
    - "sources loaded"
    - "facts actually supplied to GPT"
    - "limitations supplied"
    - "memory/state supplied"
    - "what GPT is expected to infer"
    - "where conversation fails or succeeds"

  rule: >
    Do not judge from prompts or tests alone. Trace the actual runtime path.

insufficient_information_audit:

  target_behavior: >
    Cuando la evidencia no alcanza, Director IA no debe detenerse en una frase
    genérica de insuficiencia si puede identificar con seguridad la brecha.

  evaluate_whether_current_runtime_supports:
    - "qué sí sabe"
    - "qué no sabe"
    - "qué dato concreto falta"
    - "por qué ese dato importa"
    - "qué fuente actual podría contenerlo"
    - "qué persona está físicamente vinculada, solo si existe vínculo"
    - "qué análisis podría continuar al obtenerlo"

  important_rule: >
    Diferenciar qué debe venir estructurado del runtime y qué puede formular
    naturalmente GPT a partir de evidence + limitations.

reasoning_freedom_audit:

  inspect:
    - "system prompts"
    - "special intent prompts"
    - "deterministic summaries"
    - "top-N/materiality rules"
    - "source-specific early returns"
    - "response constraints"

  determine:
    - "qué restricciones son necesarias para truth/authz"
    - "qué restricciones posiblemente reducen análisis natural"
    - "qué cálculos deben seguir siendo determinísticos"
    - "qué razonamiento conviene devolver a GPT"

  required_output:
    - "KEEP_DETERMINISTIC"
    - "LET_GPT_REASON"
    - "MIXED"
    - "UNKNOWN"

daily_deviation_audit:

  required_question: >
    ¿Puede hoy el sistema contestar de forma fundamentada “por qué bajó la venta
    ayer?” y “por qué subió el descuento/kg ayer”?

  separate_layers:
    layer_1_detection:
      - "valor ayer"
      - "referencia comparable"
      - "delta"

    layer_2_mathematical_explanation:
      - "channel decomposition"
      - "customer contribution"
      - "concentration"

    layer_3_business_explanation:
      - "comments"
      - "actions"
      - "bitacora"
      - "other evidence"

    layer_4_information_gap:
      - "portion unexplained"
      - "what exact data is missing"

  rule: >
    Mathematical explanation != causal explanation.

persistent_memory_audit:

  required:
    - "repository capability"
    - "SQL 017 operational status if knowable from repository/config"
    - "no assumption about deployed environment"
    - "resume behavior"

  rule: >
    Deployment gap must not be mislabeled as architecture failure.

legacy_comparison:

  goal: >
    Recheck whether the current system is actually better than the earlier
    OpenAI-context approach for the master conversations.

  compare:
    - "naturalness"
    - "data access"
    - "truthfulness"
    - "context continuity"
    - "ability to say what is missing"
    - "actionability"

  rule: >
    If the old approach could reason naturally but lacked reliable data, say so.
    If current deterministic routing harms conversational quality, identify it.

required_capability_classification:

  labels:
    - "ALREADY_NATIVE_TO_GPT"
    - "NEW_DATA_ACCESS"
    - "NEW_TRUST_GUARANTEE"
    - "NEW_CONVERSATIONAL_INFRASTRUCTURE"
    - "NEW_PERSISTENT_CONTEXT"
    - "STILL_MISSING_DATA"
    - "STILL_MISSING_INFRASTRUCTURE"
    - "POSSIBLE_MODEL_LIMIT"
    - "OVERPROGRAMMED"
    - "DEPLOYMENT_PENDING"

mandatory_findings:

  must_answer:
    - "¿Qué sí mejoró realmente?"
    - "¿Qué todavía no mejoró?"
    - "¿Dónde seguimos sobreprogramando?"
    - "¿Qué está haciendo GPT que deberíamos dejarle hacer?"
    - "¿Qué debe seguir siendo determinístico?"
    - "¿Puede responder venta ayer?"
    - "¿Puede responder descuento/kg ayer?"
    - "¿Puede identificar qué información falta?"
    - "¿Puede mantener conversación multi-turn?"
    - "¿Puede retomar cross-session en repo?"
    - "¿Qué depende de SQL 017 en ambiente?"

single_bottleneck_requirement:

  exactly_one: true

  determine:
    - "name"
    - "failure_class"
    - "physical location"
    - "why it blocks product goal"
    - "what fixing it would unlock"
    - "what it would NOT solve"

  rule: >
    Do not propose several parallel initiatives.

next_task_policy:

  propose_exactly_one: true
  authorize: false
  execute: false

  candidate_types:
    - "ARCH readiness"
    - "IMPL if fully proven"
    - "DEPLOYMENT task"
    - "SIMPLIFICATION audit"

  rule: >
    The NEXT_TASK must directly address the single demonstrated bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "new architecture"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Product north star evaluated."
  - "All six conversations traced."
  - "Failure classes applied."
  - "Daily sales question audited."
  - "Daily discount/kg question audited."
  - "Information-gap behavior audited."
  - "Reasoning freedom audited."
  - "Legacy vs current compared honestly."
  - "Overprogramming identified if present."
  - "Persistent memory deployment status separated."
  - "Exactly one bottleneck identified."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only CURRENT_TASK and report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002.md