# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-DEVIATION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-DAILY-DEVIATION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice daily_sales_plus_business_evidence para que
  Director IA pueda responder de forma fundamentada preguntas como
  “¿por qué bajó la venta ayer?”, usando un pack diario específico con
  detección, referencia comparable, desviación matemática, contribución por
  cliente y canal, evidencia comercial relacionada y huecos explícitos de
  información, sin programar causalidad.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001"
    determination: "READY_WITH_LIMITS"
    selected_first_slice: "daily_sales_plus_business_evidence"

product_principle: >
  El runtime calcula hechos y matemáticas exactas.
  GPT conserva la explicación conversacional y determina, a partir de evidencia
  y límites explícitos, qué sabemos y qué falta saber.

new_intent:
  name: "daily_sales_deviation"

  must_not_reuse:
    - "financial_diagnosis"
    - "delta_sales"

  reason: >
    Los paths actuales son mensuales y no representan la granularidad solicitada
    por preguntas sobre ayer.

routing:

  required_examples:
    - "¿Por qué bajó la venta ayer?"
    - "¿Cómo estuvo la venta ayer?"
    - "¿Qué pasó ayer con la venta?"
    - "¿Por qué vendimos menos ayer?"
    - "¿Dónde cayó la venta ayer?"

  rules:
    - "daily language debe ganar sobre financial_diagnosis mensual"
    - "no degradar a M9 mensual"
    - "pregunta diaria sin planta autorizada debe usar scope vigente/clarificar según reglas actuales"
    - "standalone monthly intents preservados"

date_semantics:

  timezone: "America/Mexico_City"

  target_day:
    definition: "ayer calendario completo"

  rules:
    - "hoy no se usa como día completo"
    - "día sin filas != venta cero"
    - "fecha debe quedar explícita en evidence/context"
    - "no depender de timezone UTC del servidor"

reference:

  type: "same_weekday_recent_average"

  window_days: 14

  rule_source: >
    Misma regla temporal homologada por el forecast ARR verificado en readiness.

  requirements:
    - "mismo día de semana"
    - "solo días completos"
    - "misma planta"
    - "promedio sobre observaciones físicas válidas"
    - "número de observaciones explícito"
    - "si no hay base suficiente, limitation explícita"
    - "siempre decir contra qué se comparó"

  prohibited:
    - "día anterior como default"
    - "inventar ceros para días sin registros"
    - "promedio MTD si no fue solicitado"
    - "rolling distinto sin solicitud"

daily_sales_source:

  mandatory_before_code:
    - "confirmar tabla(s) físicas"
    - "confirmar campo fecha"
    - "confirmar planta_id"
    - "confirmar kg"
    - "confirmar cliente"
    - "confirmar canal"
    - "confirmar semántica de filas"

  rule: >
    Usar el path diario físico auditado en readiness. No reconstruir venta diaria
    desde una fuente mensual.

daily_detection:

  output:
    target_date: "YYYY-MM-DD"
    target_sales_kg: "kg observados"
    reference_type: "same_weekday_recent_average"
    reference_sales_kg: "promedio kg"
    reference_observation_count: "N"
    deviation_kg: "target - reference"
    deviation_pct: "(target-reference)/reference cuando reference != 0"

  null_rules:
    - "reference 0 requiere handling explícito"
    - "missing target != 0"
    - "missing reference != 0"
    - "null != 0"

mathematical_decomposition:

  customer:
    required: true

    purpose: >
      Determinar qué clientes contribuyen matemáticamente a la diferencia entre
      ayer y la referencia comparable.

    requirements:
      - "base comparable por cliente"
      - "same-weekday reference por cliente"
      - "contribution_kg"
      - "share_of_total_deviation cuando matemáticamente válido"
      - "top contributors determinísticos"
      - "cliente_key preservado"

  channel:
    required: true

    requirements:
      - "usar canal físico existente en venta"
      - "misma referencia comparable"
      - "contribution_kg"
      - "sumatoria consistente con total dentro de tolerancia explícita"

  critical_rule: >
    contributor != cause.

  prohibited:
    - "cliente con mayor venta = mayor contribuidor"
    - "cliente con mayor caída relativa = mayor impacto automáticamente"
    - "mezclar kg con pesos"
    - "score compuesto"

business_evidence:

  customer_join_key: "cliente_key"

  sources_allowed:
    - "DICF actions"
    - "commercial comments"

  requirements:
    - "join físico por cliente_key"
    - "no join por nombre"
    - "evidence relacionada con cliente"
    - "fecha del comentario/acción preservada"
    - "responsable solo si está físicamente ligado a acción"

  semantics:
    - "comment != external fact"
    - "action != cause"
    - "action != solution"
    - "responsible != responsible for sales decline"

  forbidden:
    - "bitácora por cliente sin join físico"
    - "inventar causa desde comentario"
    - "atribuir toda la caída a una evidencia parcial"

information_gap:

  objective: >
    Entregar a GPT cuáles contribuidores materiales permanecen sin evidencia
    suficiente para explicar el movimiento.

  for_each_relevant_contributor:
    derive:
      - "has_related_comment"
      - "has_related_action"
      - "has_recent_related_evidence if physically defensible"
      - "explanation_gap"

  rule: >
    explanation_gap significa que el pack no contiene evidencia suficiente;
    no significa que no exista una causa en el mundo real.

  GPT_should_be_able_to_say:
    - "no encuentro evidencia suficiente para explicar este movimiento"
    - "falta validar el motivo con el cliente"
    - "hay una acción asociada que requiere actualización"
    - "la persona se menciona solo si existe vínculo físico"

daily_pack:

  preferred_helper: "loadDailySalesDeviationForChat"

  preferred_assembler: "assembleDailySalesDeviationEvidence"

  required_sections:
    - "summary"
    - "reference"
    - "customer_contributors"
    - "channel_contributors"
    - "business_evidence"
    - "information_gaps"
    - "limitations"
    - "provenance"

  rule: >
    Los nombres exactos pueden adaptarse al patrón existente. No crear capas
    abstractas innecesarias.

conversation_integration:

  parent_intent: "daily_sales_deviation"

  required_followups:
    - "¿Contra qué la estás comparando?"
    - "¿Qué clientes explican más?"
    - "¿Y por canal?"
    - "¿Sabemos por qué?"
    - "¿Qué falta investigar?"
    - "¿Quién puede aclararlo?"

  structured_conversation_state:
    preserve: true

  date_context:
    requirement: >
      Determinar el mecanismo mínimo para que los follow-ups de la misma
      conversación sigan referidos al target_date diario sin introducir
      memoria persistente de periodos ni romper el slice aprobado.

    allowed: >
      Puede incluir fecha objetivo dentro del HILO/contexto derivado del bundle
      actual si no requiere ampliar persistent conversation state.

    prohibited:
      - "cross-session daily date memory"
      - "period stack"

openai:

  required:
    - "una sola llamada final"
    - "recibe daily pack + HILO"
    - "no recibe raw DB dump innecesario"
    - "no programar respuesta final determinísticamente"

  system_boundary:
    instruct:
      - "mathematical contribution != cause"
      - "comments are stored statements"
      - "state what is known"
      - "state what remains unknown"
      - "identify missing information when possible"

  forbidden:
    - "plantilla rígida que sustituya GPT"
    - "causalidad automática"

authz:

  required:
    - "rol actual"
    - "planta actual"
    - "plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"

  rule: >
    El daily pack no amplía permisos de fuentes existentes.

absence_error_semantics:

  distinguish:
    - "0 real"
    - "null"
    - "target day without rows"
    - "insufficient reference observations"
    - "DATA_NOT_FOUND"
    - "SOURCE_RESTRICTED"
    - "TOOL_ERROR"

  rules:
    - "día sin filas != venta cero"
    - "error != ausencia"
    - "restricted != missing"

daily_discount:

  implementation: false

  readiness_findings_to_preserve:
    formula: "SUM(monto) / SUM(kg)"
    average_of_averages: false
    channel_available: false

  deferred:
    - "daily discount/kg pack"
    - "weighted contributor decomposition"
    - "mix effect analysis"

  rule: >
    No añadir descuento/kg en este IMPL aunque comparta infraestructura.

memory_and_continuity:

  ephemeral_continuity:
    preserve: true

  persistent_pending_memory:
    preserve: true

  important:
    - "daily deviation no se guarda automáticamente como persistent memory"
    - "pending work item solo si surge gap conforme a reglas ya vigentes"
    - "memory != evidence"

deployment_note:

  persistent_memory_sql_017:
    status: "operationally pending unless separately applied"

  rule: >
    No hacer SQL 017 como parte de esta tarea.

truth_boundaries:

  deterministic_facts:
    - "fecha"
    - "kg"
    - "reference"
    - "delta"
    - "contribution"
    - "share"
    - "customer/channel identity"
    - "stored comments/actions"
    - "provenance"

  GPT_reasoning:
    - "síntesis"
    - "qué destaca"
    - "cómo explicar la distribución del movimiento"
    - "qué evidencia puede estar relacionada"
    - "qué sigue sin explicación"
    - "qué información falta"

  prohibited_claims:
    - "cliente X causó la caída"
    - "competencia causó la caída"
    - "acción vencida causó la caída"
    - "todo el delta está explicado si solo una parte tiene evidencia"

mandatory_product_test:

  conversation:
    - "¿Por qué bajó la venta ayer?"
    - "¿Contra qué la estás comparando?"
    - "¿Qué clientes explican más?"
    - "¿Y por canal?"
    - "¿Sabemos por qué?"
    - "¿Qué falta investigar?"
    - "¿Quién puede aclararlo?"

  expected:
    - "daily intent preserved"
    - "target day preserved within active conversation"
    - "same-weekday reference explicit"
    - "mathematical contributors available"
    - "business evidence available"
    - "unexplained portion visible"
    - "no causal invention"
    - "natural GPT follow-ups"

tests_required:

  routing:
    - "daily sales intent beats financial_diagnosis"
    - "monthly financial query unchanged"
    - "delta_sales monthly unchanged"

  date:
    - "yesterday CDMX"
    - "today excluded"
    - "no rows != zero"

  reference:
    - "same weekday"
    - "14 day window"
    - "observation count"
    - "missing reference"

  math:
    - "daily total"
    - "reference average"
    - "delta kg"
    - "delta pct"
    - "customer contributions"
    - "channel contributions"
    - "contributors reconcile"

  evidence:
    - "cliente_key join"
    - "comment not cause"
    - "action not cause"
    - "unexplained contributor"

  conversation:
    - "against what?"
    - "which clients?"
    - "by channel?"
    - "do we know why?"
    - "what is missing?"
    - "who can clarify?"

  security:
    - "authz"
    - "cross-plant"

  regression:
    - "conversational continuity"
    - "persistent memory"
    - "plant_diagnosis"
    - "financial_diagnosis"
    - "M9"
    - "capabilities"
    - "planner"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DEVIATION-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-daily-deviation.js"
    - "lib/director-ia-conversation-state.js"
    - "test/director-ia-daily-deviation.test.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

  conditional_writable:
    - "existing Director IA tests only if legitimate assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "daily discount/kg implementation"
  - "matrix changes"
  - "contract changes"
  - "IES changes"
  - "Reasoning Engine changes"
  - "schema changes"
  - "new tables"
  - "SQL execution"
  - "economic tradeoff"
  - "causal engine"
  - "notification workflow"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_sales_deviation implemented."
  - "Yesterday uses America/Mexico_City."
  - "Same-weekday 14-day reference implemented."
  - "Reference disclosed."
  - "Daily kg detection correct."
  - "Customer decomposition correct."
  - "Channel decomposition correct."
  - "DICF/comments joined only by cliente_key."
  - "Information gaps explicit."
  - "Contribution != causality preserved."
  - "One OpenAI call."
  - "Conversational follow-ups work."
  - "Monthly paths preserved."
  - "No daily discount implementation."
  - "Authz preserved."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DEVIATION-001.md