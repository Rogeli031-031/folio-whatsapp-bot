# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar la estrategia B aprobada para follow-ups naturales:
  cuando el planner aislado devuelve unknown, existe un parent_intent válido,
  el contexto conversacional sigue vigente, no hay intent standalone claro,
  no hay cambio de planta/topic y no hay conflicto de entidad, el turno hereda
  el parent_intent, hace requery y llega a GPT con HILO + evidencia fresca.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001"
    determination: "READY_WITH_LIMITS"
    strategy: "B — unknown + valid state -> inherit"

product_principle: >
  El usuario no debe aprender frases especiales para hablar con Director IA.
  El runtime protege identidad, scope, authz y evidencia; GPT interpreta
  lenguaje conversacional abierto.

core_rule: >
  UNKNOWN aislado no equivale automáticamente a “no entiendo”.
  Si hay contexto válido y no existe una señal más fuerte de intent nuevo o
  cambio de scope, el turno puede heredar el parent_intent.

routing_precedence:

  1_explicit_standalone_intent:
    rule: >
      Un intent reconocido explícitamente en el turno actual siempre gana sobre
      la herencia conversacional.

    preserve_examples:
      - "¿Cómo va el presupuesto esta semana?"
      - "¿Qué tiene Taller AT-15?"
      - "¿Cómo va Querétaro?"
      - "¿Por qué bajó la venta ayer?"
      - "¿Cómo va el IGF?"
      - "¿Qué acciones están vencidas?"

  2_scope_or_topic_change:
    rule: >
      Cambio explícito de planta, topic o entidad incompatible debe resolverse,
      invalidarse o clarificarse antes de heredar contexto.

  3_unknown_with_valid_context:
    rule: >
      Si el planner devuelve unknown y existe estado conversacional válido,
      heredar parent_intent y llegar a GPT.

  4_unknown_without_valid_context:
    rule: >
      Clarificar. No caer al Action Register ni inventar intent.

valid_context_requirements:

  required:
    - "parent_intent presente y soportado"
    - "planta actual autorizada"
    - "last_evidence_bundle_type defendible para ese intent"
    - "sin topic switch explícito"
    - "sin intent standalone reconocido"
    - "sin conflicto de entidad"
    - "estado no invalidado"

  rule: >
    No usar longitud de frase, número de palabras ni vocabulario cerrado como
    condición primaria de follow-up.

anti_phrasebook:

  prohibited:
    - "agregar listas extensas de frases"
    - "if text === '¿cómo así?'"
    - "if contains 'qué más'"
    - "listas de sinónimos para follow-up"
    - "score de anáforas"
    - "threshold opaco de palabras"
    - "clasificador manual de español coloquial"

  allowed:
    - "protecciones puntuales necesarias para distinguir entidad física"
    - "detección de intent standalone ya existente"
    - "topic/plant switch explícito ya soportado"

  critical_rule: >
    Los tests pueden contener frases de ejemplo. El código de producción no
    debe depender de reconocer esas frases específicas.

entity_safety:

  demonstratives:
    examples:
      - "eso"
      - "esto"
      - "aquello"

    rule: >
      No deben tratarse como nombres de cliente ni activar resolución comercial.

  pronouns:
    examples:
      - "él"
      - "ella"
      - "ese cliente"

    rule: >
      Solo pueden apoyarse en active_entity ya validada. No crear entidad nueva.

  named_entity:
    rule: >
      Si aparece una entidad nominal nueva, usar resolución física actual.
      Única -> puede actualizar active_entity.
      Ambigua -> clarificar.
      No encontrada -> no inventar.

  plant_switch:
    rule: >
      Cambio de planta invalida active_entity incompatible y pending gap ligado
      al scope anterior.

evidence_policy:

  strategy: "requery_every_turn"

  required:
    - "heredar contexto, no payload"
    - "authz actual"
    - "source availability actual"
    - "provenance actual"
    - "SOURCE_RESTRICTED actual"
    - "fresh data"

  invariant: >
    CONTEXT INHERITANCE != EVIDENCE REUSE.

GPT_path:

  required:
    - "parent_intent heredado"
    - "HILO estructurado"
    - "active_entity si válida"
    - "active_date si ya forma parte del intent activo"
    - "pending_information_gap si aplica"
    - "fresh evidence pack"
    - "limitations"

  model_role:
    - "interpretar el follow-up abierto"
    - "explicar"
    - "ampliar"
    - "responder consecuencias"
    - "formular el gap de información"
    - "mantener conversación natural"

  runtime_must_not:
    - "determinar el contenido final de la respuesta"
    - "programar 'qué más'"
    - "programar 'cómo así'"
    - "programar consecuencias"
    - "programar wording de gaps"

deterministic_gap_responses:

  objective: >
    Reducir dependencia de respuestas enlatadas cuando ya existe pack +
    limitations suficientes para que GPT formule la respuesta.

  mandatory_audit_during_impl:
    - "identificar early returns/enlatados que interceptan follow-ups heredados"
    - "desactivar SOLO los que bloqueen este slice y tengan evidence suficiente"
    - "preservar respuestas determinísticas necesarias por seguridad/clarificación"

  rule: >
    No hacer refactor general del chat. Cambios mínimos para permitir GPT donde
    la readiness ya demostró contexto suficiente.

holdout_generalization:

  mandatory: true

  implementation_examples_may_include:
    - "¿Y eso?"
    - "¿Cómo así?"
    - "¿Qué más?"
    - "¿Entonces?"

  holdout_tests_must_include_phrases_not_present_in_production_logic:
    examples:
      - "¿O sea?"
      - "No te seguí"
      - "¿En qué sentido?"
      - "¿Me explicas mejor?"
      - "¿Qué otra cosa ves?"
      - "¿Y después?"
      - "¿Qué quieres decir con eso?"

  rule: >
    Estos textos son tests de generalización. No copiarlos como reglas de
    producción.

  success_condition: >
    Las frases hold-out heredan por estado/contexto y no porque estén codificadas.

mandatory_conversations:

  plant:
    turns:
      - "¿Cómo va Puebla?"
      - "No te seguí"
      - "¿En qué sentido?"
      - "¿Qué otra cosa ves?"
      - "¿Y después?"
    required:
      - "parent_intent plant_diagnosis"
      - "requery"
      - "GPT"

  daily_sales:
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿O sea?"
      - "¿Qué otra cosa ves?"
      - "¿Y después?"
    required:
      - "daily_sales_deviation preserved"
      - "active_date preserved ephemerally"
      - "fresh daily pack"

  entity:
    turns:
      - "¿Y Arturo?"
      - "¿Y él?"
      - "No te seguí"
    required:
      - "active_entity remains safe"
      - "no new entity invented"

  standalone_switch:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué más?"
      - "¿Cómo va el presupuesto esta semana?"
      - "¿Y eso?"
    required:
      - "budget intent wins"
      - "follow-up after switch uses new parent context only if valid"

  plant_switch:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Y Arturo?"
      - "Ahora Querétaro."
      - "¿Y él?"
    required:
      - "no Arturo/Puebla leakage"
      - "clarify/re-resolve according to current scope"

unknown_policy:

  with_valid_state:
    result: "inherit_parent_intent"

  without_valid_state:
    result: "clarification"

  prohibited:
    - "fallback blindly to Action Register"
    - "fallback blindly to plant_diagnosis"
    - "invent generic intent"

planner_boundary:

  preserve:
    - "planner standalone classification"
    - "explicit clarification where current query itself is ambiguous"
    - "existing intent definitions"

  allowed_change:
    - "post-planner inheritance decision when isolated result = unknown"

  preferred_location: >
    Implement inheritance where conversational state is available, rather than
    teaching planner a catalog of follow-up utterances.

  rule: >
    Do not mutate planner into a conversational language model.

action_routing_boundary:

  known_issue: "¿Qué pasó con la acción de Julio Pérez?"
  implementation: false

  rule: >
    No fix Action Register person routing in this task. Preserve as deferred gap.

daily_discount:
  implementation: false

persistent_memory:
  preserve: true

  SQL017:
    execute: false

authz_and_security:

  required:
    - "authz every turn"
    - "plantas_permitidas"
    - "no cross-plant"
    - "history != evidence"
    - "assistant prior answer != fact"
    - "user prior statement != database fact"
    - "prompt injection in conversational text cannot alter system rules"

truth_boundary:

  code_owns:
    - "identity"
    - "authz"
    - "scope"
    - "dates"
    - "math"
    - "joins"
    - "fresh evidence"
    - "provenance"
    - "limitations"

  GPT_owns:
    - "interpretation of conversational continuation"
    - "natural explanation"
    - "synthesis"
    - "follow-up response"
    - "information-gap wording"

regression_requirements:

  preserve:
    - "plant_diagnosis"
    - "daily_sales_deviation"
    - "financial_diagnosis"
    - "commercial_state"
    - "expediente_comercial"
    - "M5"
    - "M6"
    - "M11"
    - "M12"
    - "M18"
    - "structured conversation state"
    - "persistent memory"
    - "standalone intents"

tests_required:

  focal:
    - "unknown with valid state inherits"
    - "unknown without state clarifies"
    - "standalone intent wins"
    - "topic switch wins"
    - "plant switch safe"
    - "demonstrative not entity"
    - "pronoun uses valid active entity only"
    - "named new entity resolves"
    - "ambiguous entity clarifies"
    - "requery each inherited turn"
    - "GPT invoked for inherited open follow-up"
    - "no Action Register fallback"

  holdout:
    - "No te seguí"
    - "¿En qué sentido?"
    - "¿Me explicas mejor?"
    - "¿Qué otra cosa ves?"
    - "¿Y después?"
    - "at least additional variants chosen by test author"

  critical_test_rule: >
    Before finalizing, grep/search production code and confirm hold-out texts are
    not present in follow-up routing logic.

  regression:
    - "daily deviation focal tests"
    - "conversational continuity"
    - "persistent memory"
    - "capabilities"
    - "planner"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-planner.js"
    - "test/director-ia-natural-followup.test.js"

  conditional_writable:
    - "existing Director IA tests if legitimate assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "larger phrasebook"
  - "Action Register Julio routing fix"
  - "daily discount/kg"
  - "SQL 017 execution"
  - "matrix changes"
  - "contract changes"
  - "schema changes"
  - "new tables"
  - "second LLM routing call"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy B implemented."
  - "Unknown + valid state can inherit."
  - "Unknown without state clarifies."
  - "Explicit standalone intents still win."
  - "Topic/plant switches are safe."
  - "Demonstratives do not become entities."
  - "Entity safety preserved."
  - "Evidence is requeried."
  - "GPT interprets open follow-ups."
  - "No larger phrasebook."
  - "Hold-out phrases generalize without production entries."
  - "No blind Action Register fallback."
  - "Daily sales conversation preserved."
  - "Persistent memory preserved."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001.md