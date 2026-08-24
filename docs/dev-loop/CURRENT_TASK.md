# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001
  y autorizo G1 exclusivamente para readiness/auditoría.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false

objective: >
  Determinar el mecanismo mínimo, seguro y generalizable para que Director IA
  pueda cambiar de tema y volver a un tema anterior dentro de la misma sesión,
  sin usar memoria persistente como parche, sin construir un topic stack
  innecesariamente complejo y sin descartar intents standalone que el planner
  ya resolvió correctamente.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006"
    bottleneck: >
      El retorno/cambio de tema intra-sesión descarta contexto recuperable.
    failure_class: "OVERPROGRAMMING"

north_star: >
  Director IA debe sostener una conversación ejecutiva larga: cambiar de tema,
  responder el nuevo tema y volver a uno anterior sin exigir repetir toda la
  pregunta ni perder entidad/fecha/contexto que todavía sea seguro recuperar.

central_findings_to_verify:
  - >
    "Volvamos a la venta de ayer" ya obtiene planner intent
    daily_sales_deviation con alta confianza, pero el runtime lo descarta.
  - >
    reconstructFromUserHistory borra contexto al encontrar señales como
    "ahora" / "volvamos".
  - >
    Un solo marco previo podría bastar para algunos retornos como Arturo/acción.
  - >
    Persistent pending memory no debe resolver navegación intra-sesión.

primary_question: >
  ¿Cuál es el first slice mínimo que permite cambio y retorno de tema sin
  perder un standalone intent válido ni requerir un topic stack general?

mandatory_runtime_audit:

  inspect:
    - "askDirectorIa routing precedence"
    - "planner result handling"
    - "topic_return detection"
    - "out_of_slice_clarify"
    - "structured_conversation_state"
    - "reconstructFromUserHistory"
    - "parent_intent"
    - "active_entity"
    - "active_date"
    - "pending_information_gap"
    - "last_evidence_bundle_type"
    - "natural follow-up inheritance"
    - "persistent memory resume"
    - "daily_sales_deviation"
    - "daily_discount_deviation"
    - "action_status"
    - "budget intent/path"

  trace_exactly:
    - "¿Cómo va Puebla?"
    - "Ahora dime el presupuesto."
    - "Volvamos a la venta de ayer."
    - "¿Quién explicó más?"
    - "¿Cómo va Puebla?"
    - "¿Y Arturo?"
    - "¿Cómo estuvo la venta ayer?"
    - "Bueno, volviendo a Arturo, ¿qué sabemos?"
    - "¿Qué pasó con la acción de Julio?"
    - "Ahora dime Puebla."
    - "Retomemos la acción."
    - "¿Por qué seguía abierta?"

first_principle:
  rule: >
    Si el turno actual tiene un standalone intent válido y seguro, ese intent
    debe ejecutarse aunque el texto contenga lenguaje de retorno como
    "volvamos", "retomemos" o equivalente.

  example:
    text: "Volvamos a la venta de ayer."
    planner: "daily_sales_deviation"
    desired: >
      Ejecutar daily_sales_deviation; no convertirlo en out_of_slice_clarify.

anti_solution:
  forbidden:
    - "topic stack arbitrario de profundidad N"
    - "guardar raw history como memoria factual"
    - "usar persistent memory para cada cambio de tema"
    - "phrasebook de 'volvamos/retomemos'"
    - "segunda llamada LLM solo para routing"
    - "copiar evidencia stale al restaurar tema"

standalone_return_precedence:

  mandatory_audit:
    - >
      Determinar si basta con permitir que planner standalone intent gane sobre
      topic_return guard.
    - >
      Determinar qué estado debe reconstruirse después de ejecutar el intent.
    - >
      Determinar si active_date/entity pueden venir del propio turno actual.
    - >
      Requery obligatorio.

  desired_rule: >
    "return wording" no debe invalidar una clasificación standalone válida.

prior_context_need:

  audit_cases:

    explicit_self_contained_return:
      examples:
        - "Volvamos a la venta de ayer."
        - "Retomemos la acción de Julio."
      question: >
        ¿El turno contiene por sí mismo suficiente información para reroute/requery?

    implicit_return:
      examples:
        - "Volvamos a Arturo."
        - "Retomemos lo anterior."
        - "¿Dónde nos quedamos?"
      question: >
        ¿Se requiere conservar exactamente un prior conversational frame?

  requirement: >
    Separar explicit self-contained return de implicit return.

minimal_prior_frame_hypothesis:
  audit_not_assume: true

  candidate_fields:
    - "parent_intent"
    - "active_entity"
    - "active_date"
    - "last_evidence_bundle_type"
    - "pending_information_gap"
    - "plant scope reference"

  rule: >
    Si hace falta un prior frame, seleccionar solo los campos mínimos.
    Nunca guardar raw evidence payload.

frame_depth:

  candidates:
    A_none:
      description: >
        Solo corregir precedence y dejar returns implícitos fuera.

    B_one_previous_frame:
      description: >
        Mantener exactamente un marco previo compatible para volver al tema
        inmediatamente anterior.

    C_small_stack:
      description: >
        Stack acotado de varios marcos.

    D_history_reconstruction:
      description: >
        Reconstruir continuamente desde history de usuario.

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "preferir la mínima complejidad que resuelva casos ejecutivos reales"

  warning: >
    GAP-006 indica que B podría bastar para algunos casos, pero no asumirlo.

context_switch_behavior:

  on_valid_standalone_switch:
    required:
      - "ejecutar nuevo intent"
      - "guardar/actualizar current frame de forma segura"
      - "no arrastrar evidence del tema anterior"
      - "requery"

  on_return:
    required:
      - "restaurar solo contexto estructurado necesario"
      - "revalidar planta/entidad/date"
      - "requery"
      - "current evidence wins"

plant_scope:

  rule: >
    Planta actual/autorizada debe prevalecer. Restaurar un frame no puede
    reintroducir scope de una planta ya incompatible.

  required:
    - "no cross-plant leakage"
    - "invalidate incompatible active_entity"
    - "authz each turn"

entity_return:

  example:
    sequence:
      - "¿Y Arturo?"
      - "¿Cómo estuvo la venta ayer?"
      - "Volvamos a Arturo."

  audit:
    - "cómo identificar Arturo de forma segura"
    - "si un prior frame con entity_key basta"
    - "si hay que re-resolver entity"
    - "qué pasa si scope/planta cambió"

  rule: >
    Restaurar referencia de entidad != restaurar hechos sobre la entidad.

date_return:

  example:
    sequence:
      - "¿Por qué bajó la venta ayer?"
      - "Ahora descuento/kg."
      - "Volvamos a la venta de ayer."

  audit:
    - "el turno ya contiene ayer"
    - "active_date puede reconstruirse sin stack"
    - "no persistent date memory"

action_return:

  example:
    sequence:
      - "¿Qué pasó con la acción de Julio?"
      - "Ahora dime Puebla."
      - "Retomemos la acción."

  audit:
    - "si prior frame necesita action identity"
    - "si action_status puede requery con responsable/action context"
    - "qué pasa con múltiples acciones"

  rule: >
    No seleccionar acción silenciosamente al restaurar.

reconstructFromUserHistory_audit:

  mandatory:
    - "identificar por qué 'ahora'/'volvamos' borran estado"
    - "separar invalidación correcta de sobreinvalidación"
    - "determinar si history debe servir solo como señal conversacional"
    - "history != evidence"

  anti_rule: >
    No reconstruir verdad empresarial desde prosa pasada.

natural_followup_interaction:

  preserve_strategy_B: true

  required:
    - >
      Después de volver a un tema, follow-ups unknown + valid state deben seguir
      heredando normalmente.
    - "No crear reglas especiales por tema."

persistent_memory_boundary:

  pending_work_items_only:
    purpose: "cross-session pending work"

  intra_session_return:
    purpose: "ephemeral navigation"

  invariant: >
    Persistent memory != topic navigation.

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "standalone intent precedence"
    - "frame capture/restore"
    - "plant scope"
    - "entity identity"
    - "date semantics"
    - "requery"
    - "authz"
    - "provenance"

  LET_GPT_REASON:
    - "interpretar qué quiere discutir del tema restaurado"
    - "explicación"
    - "follow-up"
    - "síntesis"

  rule: >
    No programar una respuesta distinta para cada frase de retorno.

mandatory_product_conversations:

  conversation_1_self_contained_return:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "Ahora dime el descuento/kg."
      - "Volvamos a la venta de ayer."
      - "¿Quién explicó más?"

  conversation_2_entity_return:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y Arturo?"
      - "¿Cómo estuvo la venta ayer?"
      - "Volvamos a Arturo."
      - "¿Qué faltaba saber?"

  conversation_3_action_return:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "Ahora dime Puebla."
      - "Retomemos la acción."
      - "¿Por qué seguía abierta?"

  conversation_4_budget_switch:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora dime el presupuesto."
      - "¿Y eso?"
      - "Volvamos a Puebla."

  conversation_5_multiple_switches:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y Arturo?"
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento?"
      - "Volvamos a Arturo."
      - "Retomemos la venta."
    purpose: >
      Determinar si first slice requiere solo one previous frame o más.

tests_to_design_if_ready:

  precedence:
    - "standalone return intent survives topic_return wording"
    - "daily_sales 0.92 is not discarded"
    - "budget standalone wins"

  frame:
    - "capture previous frame"
    - "restore one previous frame if selected"
    - "no raw evidence storage"
    - "requery after restore"

  entity:
    - "entity re-resolved/revalidated"
    - "plant switch invalidates incompatible entity"

  date:
    - "self-contained yesterday works without prior frame"

  action:
    - "multiple action ambiguity preserved"

  followup:
    - "natural followup works after return"

  security:
    - "authz"
    - "cross-plant"
    - "history not evidence"

  regression:
    - "daily sales"
    - "daily discount"
    - "action-person"
    - "persistent memory"
    - "plant diagnosis"
    - "financial diagnosis"
    - "full suite"

contract_audit:
  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"

  expectation: "runtime-only unless evidence says otherwise"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D"
    - "standalone return precedence"
    - "whether one previous frame is required"
    - "minimal frame fields"
    - "capture/restore rules"
    - "requery"
    - "entity/date/action behavior"
    - "history boundary"
    - "persistent memory boundary"
    - "G2/G3"
    - "percentage effect"
    - "deferred capabilities"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "persistent topic memory"
  - "semantic memory"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Current topic-return failure physically traced."
  - "Standalone intent discard audited."
  - "reconstructFromUserHistory behavior audited."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "Topic stack not assumed."
  - "Minimal frame determined if needed."
  - "Persistent memory kept separate."
  - "Requery/current evidence preserved."
  - "Entity/date/action safety defined."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS.
  STOPPED if a product/architecture decision is required.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md