# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice B aprobado para retorno de tema intra-sesión:
  corregir la precedencia para que un standalone intent válido sobreviva al
  lenguaje de retorno y mantener exactamente un previous_frame efímero que
  permita restaurar el tema inmediatamente anterior cuando el retorno no sea
  autocontenido, siempre con revalidación y requery de evidencia fresca.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
    determination: "READY_WITH_LIMITS"
    strategy: "B — one previous frame + standalone precedence"

product_principle: >
  Director IA debe poder cambiar de tema y volver al anterior dentro de la misma
  sesión sin perder contexto útil. El frame conserva únicamente contexto
  conversacional estructurado; nunca evidencia factual stale.

core_rules:

  standalone_precedence: >
    Si el turno actual tiene un standalone intent válido, ese intent gana aunque
    el texto incluya lenguaje como “volvamos”, “retomemos” o equivalente.

  one_previous_frame_only: >
    Mantener exactamente un previous_frame. No stack, no lista de temas,
    no profundidad configurable.

  requery: >
    Restaurar contexto nunca implica restaurar evidencia. Toda fuente debe
    reconsultarse con authz vigente.

state_extension:

  current_frame:
    existing: true

  previous_frame:
    ephemeral: true
    cross_session: false
    max_items: 1

    allowed_fields:
      - "parent_intent"
      - "active_entity reference/key if valid"
      - "active_date if applicable"
      - "last_evidence_bundle_type"
      - "pending_information_gap"
      - "plant scope reference"

    prohibited_fields:
      - "raw evidence payload"
      - "DB rows"
      - "assistant prose"
      - "user prose as fact"
      - "OpenAI response"
      - "authz snapshot"
      - "source data cache"
      - "topic stack"

frame_capture:

  when:
    - "current valid conversational frame exists"
    - "new standalone intent changes topic/domain"
    - "new frame is compatible with current authorized plant scope"

  behavior: >
    Before replacing the active conversational frame with a new standalone
    topic, copy only the minimal structured current frame into previous_frame.

  do_not_capture:
    - "invalid/empty state"
    - "smalltalk with no business context"
    - "raw history"
    - "evidence payload"

  rule: >
    Each new valid topic switch replaces previous_frame. Depth remains one.

standalone_return:

  canonical_example:
    text: "Volvamos a la venta de ayer."
    planner_intent: "daily_sales_deviation"

  required_behavior:
    - "planner standalone intent wins"
    - "do not route to out_of_slice_clarify"
    - "derive target date from current turn when self-contained"
    - "requery daily sales evidence"
    - "update current frame"
    - "capture previous current frame if appropriate"

  rule: >
    Self-contained return does not require previous_frame to be usable.

implicit_return:

  examples:
    - "Volvamos a Arturo."
    - "Retomemos la acción."
    - "Volvamos a Puebla."
    - "¿Dónde nos quedamos?"

  behavior: >
    If current turn alone does not provide a complete standalone context but
    previous_frame is compatible and sufficient, restore its structured context,
    revalidate it and requery.

  if_no_safe_previous_frame:
    behavior: "clarification"

  prohibited:
    - "guessing older-than-previous topic"
    - "searching arbitrary raw history for factual context"
    - "using persistent memory as fallback"

restore_policy:

  mandatory:
    - "current authz"
    - "current plant scope"
    - "entity revalidation if entity ref exists"
    - "date re-derivation/revalidation if applicable"
    - "fresh source requery"
    - "SOURCE_RESTRICTED current semantics"
    - "current evidence wins"

  restored_context_is:
    - "routing/context hint"

  restored_context_is_not:
    - "evidence"
    - "current fact"

plant_safety:

  rules:
    - "request/current authorized plant scope wins"
    - "previous_frame from incompatible plant cannot be restored silently"
    - "incompatible active_entity invalidated"
    - "pending gap tied to prior plant invalidated if scope incompatible"
    - "no cross-plant leakage"

entity_return:

  example:
    sequence:
      - "¿Cómo va Puebla?"
      - "¿Y Arturo?"
      - "¿Cómo estuvo la venta ayer?"
      - "Volvamos a Arturo."

  required:
    - "previous entity reference may guide resolution"
    - "entity must be physically revalidated"
    - "no restored business facts"
    - "ambiguous/not found -> clarification"

  rule: >
    Entity reference can return; entity facts cannot.

date_return:

  example:
    sequence:
      - "¿Por qué bajó la venta ayer?"
      - "Ahora dime el descuento/kg."
      - "Volvamos a la venta de ayer."

  required:
    - "current text's 'ayer' is sufficient"
    - "do not require previous frame"
    - "America/Mexico_City semantics preserved"
    - "requery"

action_return:

  example:
    sequence:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "Ahora dime Puebla."
      - "Retomemos la acción."

  required:
    - "restore action_status context only if previous_frame is sufficient"
    - "revalidate responsible/action context"
    - "0/1/N safety preserved"
    - "multiple actions -> no silent pick"

  rule: >
    previous_frame must not silently create active_action if action identity was
    never unique.

budget_switch:

  example:
    sequence:
      - "¿Cómo va Puebla?"
      - "Ahora dime el presupuesto."
      - "¿Y eso?"
      - "Volvamos a Puebla."

  required:
    - "budget standalone wins"
    - "natural follow-up after budget uses budget context if valid"
    - "return to Puebla can restore previous frame"
    - "fresh plant evidence required"

topic_return_detection:

  role: >
    Language such as “volvamos” or “retomemos” may signal navigation, but must
    never override a valid standalone planner classification.

  prohibited:
    - "out_of_slice_clarify before honoring valid standalone intent"
    - "phrasebook expansion"
    - "list of every return wording"
    - "second LLM router"

reconstructFromUserHistory:

  mandatory_change_if_needed: >
    Remove only the over-invalidation proven by readiness: history markers such
    as “ahora” / “volvamos” must not automatically destroy an otherwise valid
    current/previous structured frame.

  history_role:
    - "conversational signal only"

  history_not:
    - "evidence"
    - "truth store"
    - "raw context cache"

  rule: >
    Do not rebuild old business facts from user history.

natural_followup_strategy_B:

  preserve: true

  required: >
    After a topic is restored, subsequent planner=unknown turns with valid state
    must inherit normally and reach GPT with fresh evidence.

persistent_memory_boundary:

  pending_work_items_only:
    preserve: true

  use_for_topic_return: false

  invariant: >
    Persistent conversational memory handles cross-session pending work.
    previous_frame handles intra-session navigation.

frame_rotation:

  example:
    sequence:
      - "Puebla"
      - "Arturo"
      - "venta"
      - "descuento"
      - "volver Arturo"
      - "retomar venta"

  readiness_finding: >
    A one-frame model is sufficient for the approved first slice because
    discount may inherit from sales rather than create an additional standalone
    frame in the demonstrated sequence.

  implementation_rule: >
    Follow the exact one-frame semantics demonstrated by current routing.
    Do not opportunistically promote this to a multi-frame stack.

  if_case_requires_older_than_previous:
    behavior: "clarify / outside first slice"

GPT_boundary:

  runtime_owns:
    - "standalone precedence"
    - "frame capture"
    - "frame restore"
    - "scope"
    - "entity/date revalidation"
    - "authz"
    - "requery"
    - "provenance"

  GPT_owns:
    - "natural interpretation after restored context"
    - "explanation"
    - "synthesis"
    - "follow-up response"
    - "information gap wording"

  rule: >
    Do not create deterministic topic-specific response templates.

mandatory_product_conversations:

  self_contained_return:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "Ahora dime el descuento/kg."
      - "Volvamos a la venta de ayer."
      - "¿Quién explicó más?"

    required:
      - "daily_sales_deviation standalone survives return wording"
      - "fresh daily sales pack"
      - "follow-up inherits restored/current sales context"

  entity_return:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y Arturo?"
      - "¿Cómo estuvo la venta ayer?"
      - "Volvamos a Arturo."
      - "¿Qué faltaba saber?"

    required:
      - "previous frame restoration"
      - "entity revalidation"
      - "fresh commercial/plant evidence"
      - "pending gap if still valid"

  action_return:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "Ahora dime Puebla."
      - "Retomemos la acción."
      - "¿Por qué seguía abierta?"

    required:
      - "action_status context restored safely"
      - "AR requery"
      - "no invented reason"
      - "natural follow-up"

  budget_return:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora dime el presupuesto."
      - "¿Y eso?"
      - "Volvamos a Puebla."
      - "¿Qué más?"

    required:
      - "standalone budget works"
      - "return plant context"
      - "strategy B after return"

  one_frame_limit:
    required: >
      Add a test proving that a request requiring a topic older than
      previous_frame does NOT silently recover the wrong topic.

tests_required:

  precedence:
    - "valid standalone beats topic_return guard"
    - "daily_sales_deviation 0.92 path is not discarded"
    - "budget standalone preserved"
    - "daily_discount standalone preserved"
    - "action_status preserved"

  frame:
    - "capture current into previous on standalone switch"
    - "only one previous frame"
    - "previous frame replacement"
    - "no raw evidence in frame"
    - "restore compatible previous"
    - "no safe previous -> clarify"

  entity:
    - "entity revalidated on restore"
    - "ambiguous entity clarifies"
    - "plant incompatible frame blocked"

  action:
    - "0/1/N action behavior preserved"
    - "no silent action selection"

  date:
    - "self-contained yesterday return"
    - "active_date rebuilt/revalidated"

  followup:
    - "strategy B works after restore"

  memory:
    - "persistent memory not used for intra-session return"

  security:
    - "authz every restore"
    - "no cross-plant"
    - "history != evidence"

  regression:
    - "daily sales"
    - "daily discount"
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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-planner.js"
    - "test/director-ia-intra-session-topic-return.test.js"

  conditional_writable:
    - "existing Director IA tests if legitimate assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "topic stack"
  - "more than one previous frame"
  - "persistent topic memory"
  - "semantic memory"
  - "raw history evidence"
  - "second LLM router"
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
  - "Standalone intent survives return wording."
  - "Exactly one previous_frame implemented."
  - "No topic stack."
  - "No raw evidence stored in frame."
  - "Self-contained returns work without frame dependency."
  - "Implicit previous-topic return works safely."
  - "Entity revalidated."
  - "Date revalidated."
  - "Action ambiguity preserved."
  - "Requery every restored turn."
  - "Persistent memory not used as topic navigation."
  - "Natural follow-up strategy B works after return."
  - "Current evidence wins."
  - "Authz preserved."
  - "No cross-plant leakage."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md