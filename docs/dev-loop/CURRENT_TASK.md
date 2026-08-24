# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice D daily_discount_deviation para que Director IA
  pueda responder preguntas como “¿por qué subió el descuento/kg ayer?” con
  cálculo diario ponderado correcto, referencia comparable, contribución
  reconciliada por cliente, evidencia comercial relacionada y huecos de
  información, sin programar causalidad y sin copiar la matemática mensual M9.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001"
    determination: "READY_WITH_LIMITS"
    selected_first_slice: "D"
    intent: "daily_discount_deviation"

product_principle: >
  El código debe resolver fecha, ratio ponderado, referencia, contribución,
  identidad, joins, authz y provenance. GPT conserva la explicación
  conversacional, la relación prudente con evidencia y la identificación de
  información faltante.

new_intent:
  name: "daily_discount_deviation"

  must_win_for:
    - "¿Por qué subió el descuento/kg ayer?"
    - "¿Cómo estuvo el descuento por kg ayer?"
    - "¿Qué pasó ayer con el descuento?"
    - "¿Quién movió más el descuento/kg ayer?"

  must_not_reuse:
    - "delta_discount mensual"
    - "financial_diagnosis mensual"

  rule: >
    Si la pregunta es explícitamente diaria, no degradar al path mensual.

source_model:

  discount_source:
    table: "arr.descuentos_diarios_cliente"
    physical_fields:
      - "fecha"
      - "plant_code"
      - "cliente_norm"
      - "monto"

    absent_fields:
      - "planta_id"
      - "cliente_key"
      - "kg"
      - "canal"

  kg_source:
    table: "arr.ventas_diarias_cliente"

    required:
      - "SUM(kg)"
      - "misma fecha"
      - "misma planta"
      - "mismo cliente"

  join_rule: >
    Join discount + kg al mismo grano cliente/día usando claves físicas
    compatibles verificadas. No inventar cliente_key si no puede derivarse con
    el patrón canónico existente.

  critical_prohibition: >
    No prorratear monto de descuento entre canales. La fuente de descuento no
    tiene canal.

date_semantics:

  timezone: "America/Mexico_City"
  target_date: "ayer calendario completo"

  rules:
    - "hoy no entra como día completo"
    - "día sin filas != descuento/kg 0"
    - "fecha explícita en pack"
    - "no usar UTC del servidor como calendario de negocio"

plant_ratio:

  formula:
    target_ratio: "SUM(monto_target) / SUM(kg_target)"
    reference_ratio: "SUM(monto_ref) / SUM(kg_ref)"

  unit: >
    Preservar unidad física vigente del producto para monto/kg.

  rules:
    - "NO AVG de ratios"
    - "NO promedio de promedios"
    - "kg_total = denominador"
    - "monto_total = numerador"
    - "kg=0 requiere handling explícito"
    - "null != 0"

reference:

  type: "same_weekday_14d_pooled"

  requirements:
    - "mismos días de semana"
    - "ventana 14 días"
    - "solo días completos"
    - "misma planta"
    - "pooled numerator/denominator"
    - "reference = SUM(monto_ref)/SUM(kg_ref)"
    - "N observaciones/días explícito"
    - "si referencia insuficiente -> limitation"

  prohibited:
    - "promediar ratios diarios"
    - "día anterior como default"
    - "copiar lógica mensual M9"

customer_contribution:

  exact_formula: >
    contrib_i =
      monto_i_target / K_target
      -
      monto_i_ref / K_ref

  where:
    K_target: "SUM(kg_target) planta"
    K_ref: "SUM(kg_ref) planta"

  reconciliation:
    required: true
    identity: >
      SUM(contrib_i) = target_ratio - reference_ratio
      dentro de tolerancia numérica explícita.

  rules:
    - "ratio alto != mayor mover"
    - "más kg puede aumentar impacto"
    - "cliente con mayor cambio relativo no necesariamente domina"
    - "no score compuesto"

  output:
    - "cliente"
    - "cliente_key si puede derivarse canónicamente"
    - "monto_target"
    - "kg_target"
    - "ratio_target"
    - "monto_ref"
    - "kg_ref"
    - "ratio_ref"
    - "contribution_to_plant_delta"
    - "share_of_delta cuando matemáticamente válido"

mix_effect:

  implementation: false

  rule: >
    No separar rate effect vs mix effect en este slice. La contribución
    reconciliada total por cliente sí entra.

business_evidence:

  allowed_sources:
    - "commercial comments"
    - "DICF actions"

  join_key: "cliente_key"

  requirement: >
    Derivar cliente_key únicamente con mecanismo canónico ya existente y solo
    si el join es físicamente defendible.

  prohibited:
    - "join por nombre libre"
    - "join por cliente_norm si no es canónicamente equivalente"
    - "inventar evidencia por semejanza textual"

  semantics:
    - "comment != cause"
    - "action != cause"
    - "responsible != responsible for discount increase"

information_gaps:

  objective: >
    Identificar contribuidores materiales para los que no existe evidencia
    suficiente que explique empresarialmente el movimiento.

  fields:
    - "has_related_comment"
    - "has_related_action"
    - "linked_responsible if physical"
    - "explanation_gap"
    - "limitations"

  rule: >
    explanation_gap significa ausencia de evidencia suficiente en el pack,
    no ausencia de causa real.

daily_pack:

  preferred_helper: "loadDailyDiscountDeviationForChat"
  preferred_assembler: "assembleDailyDiscountDeviationEvidence"

  required_sections:
    - "summary"
    - "reference"
    - "customer_contributors"
    - "business_evidence"
    - "information_gaps"
    - "limitations"
    - "provenance"

  no_channel_section: true

  rule: >
    No crear channel contribution porque la fuente de descuento no tiene canal.

conversation_state:

  parent_intent: "daily_discount_deviation"

  active_date:
    mode: "ephemeral"

  required_followups:
    - "¿Contra qué lo estás comparando?"
    - "¿Quién movió más el promedio?"
    - "¿Fue general?"
    - "¿Sabemos por qué?"
    - "¿Qué falta?"
    - "¿Quién puede aclararlo?"

  preserve_natural_followup_strategy_B: true
  requery_every_turn: true

  rule: >
    Follow-ups abiertos heredan el intent y reciben pack fresco; no memoria
    persistente de fecha.

GPT_boundary:

  runtime_owns:
    - "target_date"
    - "plant ratio"
    - "reference"
    - "weighted math"
    - "customer contribution"
    - "reconciliation"
    - "identity"
    - "joins"
    - "authz"
    - "provenance"
    - "missing/error"

  GPT_owns:
    - "síntesis"
    - "qué clientes destacan"
    - "qué evidencia podría estar relacionada"
    - "qué sigue sin explicación"
    - "qué información falta"
    - "follow-up conversational"

  critical_rule: >
    Contribución matemática != causa empresarial.

  prohibited:
    - "cliente X causó el aumento"
    - "responsable X causó el descuento"
    - "competencia causó el movimiento" sin evidencia suficiente

M9_boundary:

  preserve: true

  warning: >
    M9 mensual actualmente promedia ratios. Ese comportamiento NO se reutiliza
    como fórmula para daily_discount_deviation.

  rule: >
    No modificar M9 en esta tarea salvo que una regresión legítima exija una
    adaptación mínima no semántica. No corregir M9 por alcance lateral.

authz:

  required:
    - "planta/scope actual"
    - "rol actual"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

absence_error_semantics:

  distinguish:
    - "0 real"
    - "null"
    - "kg=0"
    - "día sin filas"
    - "referencia insuficiente"
    - "DATA_NOT_FOUND"
    - "SOURCE_RESTRICTED"
    - "TOOL_ERROR"

  rules:
    - "sin filas != ratio 0"
    - "restricted != missing"
    - "error != absence"

preserve:
  - "daily_sales_deviation"
  - "action-person routing"
  - "natural follow-up inheritance"
  - "structured conversation state"
  - "persistent pending memory"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "M9 monthly"
  - "M5/M6/M11/M12/M18"

deferred:
  - "mix/rate decomposition"
  - "channel analysis for discount"
  - "client economic tradeoff"
  - "structured competitor offer"
  - "SQL 017 environment activation"
  - "topic stack / return-to-topic"

mandatory_product_conversation:

  turns:
    - "¿Por qué subió el descuento/kg ayer?"
    - "¿Contra qué lo estás comparando?"
    - "¿Quién movió más el promedio?"
    - "¿Fue general?"
    - "¿Sabemos por qué?"
    - "¿Qué falta?"
    - "¿Quién puede aclararlo?"

  required:
    - "daily intent"
    - "target date"
    - "pooled same-weekday reference"
    - "reconciled customer contribution"
    - "business evidence"
    - "gaps"
    - "GPT"
    - "no causality"

tests_required:

  routing:
    - "daily discount beats monthly delta_discount"
    - "daily discount beats financial_diagnosis"
    - "monthly paths preserved"

  date:
    - "yesterday CDMX"
    - "today excluded"
    - "no rows != zero"

  formula:
    - "SUM(monto)/SUM(kg)"
    - "no average of averages"
    - "kg zero"
    - "null"

  reference:
    - "same weekday 14d pooled"
    - "observation count"
    - "insufficient reference"

  contribution:
    - "customer contribution exact"
    - "SUM(contrib_i) reconciles plant delta"
    - "highest ratio != biggest mover"

  evidence:
    - "cliente_key canonical"
    - "no name join"
    - "comment not cause"
    - "action not cause"
    - "gap"

  conversation:
    - "against what?"
    - "who moved most?"
    - "general?"
    - "do we know why?"
    - "what is missing?"
    - "who can clarify?"

  regression:
    - "daily sales"
    - "action-person"
    - "natural followup"
    - "persistent memory"
    - "plant diagnosis"
    - "financial diagnosis"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-daily-discount.js"
    - "test/director-ia-daily-discount.test.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

  conditional_writable:
    - "existing Director IA tests if legitimate assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "M9 formula correction"
  - "mix/rate decomposition"
  - "channel reconstruction"
  - "tradeoff implementation"
  - "SQL 017 execution"
  - "matrix changes"
  - "contract changes"
  - "schema changes"
  - "new tables"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_discount_deviation implemented."
  - "Daily routing beats monthly paths."
  - "Yesterday CDMX correct."
  - "SUM(monto)/SUM(kg) correct."
  - "Pooled same-weekday 14-day reference."
  - "No average-of-averages."
  - "Reconciled customer contribution."
  - "No channel fabrication."
  - "Business evidence by canonical cliente_key only."
  - "Information gaps explicit."
  - "Contribution != causality preserved."
  - "Natural conversation works."
  - "M9 preserved."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001.md