# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el mecanismo mínimo y seguro para que follow-ups naturales y no
  enumerados puedan heredar un contexto conversacional válido y llegar a GPT,
  sin ampliar un phrasebook cerrado y sin relajar authz, resolución de entidad,
  cambio de planta, provenance ni requery.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
    bottleneck: "phrasebook cerrado de follow-ups"
    failure_class: "OVERPROGRAMMING"

product_principle: >
  El runtime debe proteger verdad, identidad, scope y evidencia.
  GPT debe interpretar lenguaje conversacional abierto cuando existe suficiente
  contexto seguro para hacerlo.

central_problem: >
  Frases no enumeradas como “¿Y eso?”, “¿Cómo así?”, “¿Qué más?” o
  “¿Entonces qué falta?” no llegan al modelo aunque exista parent_intent,
  evidencia fresca y un hilo válido.

anti_solution:
  forbidden:
    - "agregar más frases exactas al phrasebook"
    - "convertir cualquier unknown en follow-up"
    - "mandar history crudo como evidencia"
    - "heredar contexto después de un topic switch explícito"

primary_question: >
  ¿Qué condición general puede determinar que un turno corto/ambiguo es un
  follow-up del contexto activo y debe llegar a GPT con evidence fresca, en vez
  de terminar en clarificación o routing erróneo?

mandatory_runtime_audit:

  inspect:
    - "follow-up classifier actual"
    - "phrasebook/kinds enumerados"
    - "unknown handling"
    - "entity extraction"
    - "structured_conversation_state"
    - "parent_intent"
    - "active_entity"
    - "active_date"
    - "last_evidence_bundle_type"
    - "pending_information_gap"
    - "planner clarification"
    - "OpenAI invocation"

  determine:
    - "dónde se corta el turno"
    - "qué señales ya existen para herencia"
    - "qué señales indican topic switch"
    - "qué señales indican nueva entidad"
    - "qué señales indican un intent standalone"

inheritance_gate_hypothesis:
  audit_not_assume: true

  candidate_requirements:
    - "parent_intent válido"
    - "estado conversacional activo"
    - "último pack defendible"
    - "turno corto o semánticamente dependiente"
    - "sin intent standalone claro"
    - "sin cambio explícito de planta"
    - "sin nueva entidad inequívoca que cambie scope"
    - "sin topic switch"

  desired_behavior: >
    Si estas condiciones se cumplen, el turno puede heredar contexto y llegar a
    GPT con evidencia fresca aunque el planner aislado lo marque unknown.

  rule: >
    Unknown no significa automáticamente follow-up. Debe existir evidencia
    contextual suficiente.

followup_classes_to_audit:

  explanation:
    examples:
      - "¿Cómo así?"
      - "¿Por qué?"
      - "¿A qué te refieres?"
      - "Explícame eso."

  expansion:
    examples:
      - "¿Qué más?"
      - "¿Y los demás?"
      - "¿Algo más?"

  consequence:
    examples:
      - "¿Entonces?"
      - "¿Y eso qué implica?"
      - "¿Qué significa eso?"

  gap:
    examples:
      - "¿Entonces qué falta?"
      - "¿Qué necesitas?"
      - "¿Y para saberlo?"

  reference:
    examples:
      - "¿Y eso?"
      - "¿Y él?"
      - "¿Y ese cliente?"

  rule: >
    Estas clases sirven para auditar intención conversacional, no para crear un
    nuevo catálogo rígido de frases.

entity_safety:

  critical_case:
    phrase: "¿Y eso?"

  known_problem: >
    Hoy puede interpretarse como entidad/cliente.

  requirement: >
    Auditar cómo evitar que pronombres/demostrativos sin identidad física
    disparen resolución de entidad.

  rules:
    - "eso/esto/aquello no son cliente por defecto"
    - "él/ella solo pueden usar active_entity si ya existe y sigue válida"
    - "nueva entidad nombrada debe resolverse físicamente"
    - "ambigüedad => clarificación"

topic_switch:

  explicit_examples:
    - "Ahora dime Querétaro."
    - "Cambiando de tema..."
    - "¿Cómo va el presupuesto?"
    - "Hablemos de Taller."

  rule: >
    Un intent standalone claro o cambio explícito debe ganar sobre la herencia.

  required:
    - "invalidate incompatible conversational state"
    - "no drag old evidence into new topic"

plant_switch:

  required:
    - "request planta actual prevalece"
    - "active_entity incompatible se invalida"
    - "pending gap incompatible se invalida"
    - "no cross-plant leakage"

evidence_policy:

  strategy: "requery_every_turn"

  invariant:
    - "context inheritance != evidence reuse"

  required:
    - "heredar parent_intent/contexto"
    - "volver a cargar evidence"
    - "authz actual"
    - "SOURCE_RESTRICTED actual"
    - "provenance actual"

  rule: >
    El modelo puede heredar la conversación, nunca la verdad empresarial stale.

GPT_context:

  required_to_audit:
    - "structured HILO"
    - "parent_intent"
    - "active entity if valid"
    - "active date if applicable"
    - "pending gap"
    - "fresh pack"
    - "limitations"

  desired: >
    GPT debe poder interpretar libremente “¿Cómo así?” o “¿Qué más?” a partir
    del contexto, sin que el código determine la respuesta.

  prohibited:
    - "respuesta determinística para cada clase de follow-up"
    - "assistant previous prose promoted to evidence"

clarification_policy:

  clarify_when:
    - "no valid conversational state"
    - "multiple plausible parent contexts"
    - "entity ambiguous"
    - "new topic cannot be safely inferred"
    - "scope conflict"

  do_not_clarify_only_because:
    - "planner isolated intent = unknown"

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "authz"
    - "plant scope"
    - "entity identity"
    - "topic switch when explicit"
    - "standalone intent routing"
    - "requery"
    - "provenance"
    - "absence/error semantics"

  LET_GPT_REASON:
    - "interpretation of open follow-up"
    - "explanation"
    - "expansion"
    - "consequence"
    - "information gap wording"
    - "natural response"

  rule: >
    No crear un sistema experto de conversación.

master_tests:

  canonical_context:
    initial: "¿Cómo va Puebla?"

    free_followups_not_to_hardcode:
      - "¿Y eso?"
      - "¿Cómo así?"
      - "¿A qué te refieres?"
      - "¿Qué más?"
      - "¿Algo más?"
      - "¿Entonces?"
      - "¿Y eso qué implica?"
      - "¿Entonces qué falta?"
      - "¿Y para saberlo?"

  requirement: >
    La readiness debe demostrar que la solución propuesta generaliza a frases
    no enumeradas en producción, no únicamente a las del test.

generalization_test_design:

  required:
    - "hold-out follow-ups no presentes en implementation examples"
    - "paráfrasis"
    - "turnos cortos"
    - "turnos con signos/puntuación distintos"
    - "lenguaje coloquial"

  rule: >
    Si la solución necesita conocer cada frase por adelantado, NO está lista.

standalone_preservation:

  examples:
    - "¿Cómo va el presupuesto esta semana?"
    - "¿Qué tiene Taller AT-15?"
    - "¿Cómo va Querétaro?"
    - "¿Por qué bajó la venta ayer?"

  requirement: >
    Deben seguir tomando su intent propio aunque exista un parent_intent previo.

action_routing_boundary:

  known_issue:
    - "¿Qué pasó con la acción de Julio Pérez?"

  rule: >
    Auditar interacción, pero NO resolver aquí si requiere routing explícito de
    Action Register. Este slice es natural follow-up inheritance.

daily_discount_boundary:
  status: "deferred"
  rule: "No implementar ni diseñar en este readiness."

persistent_memory_boundary:
  status: "preserved"
  note: "SQL 017 environment activation sigue siendo asunto operativo separado."

solution_candidates:

  A_expand_phrasebook:
    expected: "reject unless evidence strongly contradicts"
    risk: "repite sobreprogramación"

  B_unknown_with_valid_state_to_GPT:
    description: >
      Si existe estado válido y no hay señales de standalone/topic switch,
      unknown puede heredar parent_intent.

  C_lightweight_followup_score:
    description: >
      Señales estructurales para determinar dependencia contextual sin listar
      frases exactas.

    warning: >
      No crear score arbitrario u opaco.

  D_LLM_followup_classifier:
    description: >
      Usar modelo para decidir continuidad antes del planner/runtime.

    risks:
      - "extra call"
      - "latency"
      - "nondeterministic routing"
      - "authz/scope concerns"

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "priorizar generalización + simplicidad + seguridad"

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

tests_to_design_if_ready:

  positive:
    - "free explanation follow-up"
    - "free expansion follow-up"
    - "free consequence follow-up"
    - "free gap follow-up"
    - "reference to active entity"

  holdout:
    - "phrases not present in implementation"
    - "colloquial variants"

  negative:
    - "standalone intent wins"
    - "topic switch"
    - "plant switch"
    - "entity ambiguity"
    - "unknown without state clarifies"
    - "smalltalk not inherited blindly"

  security:
    - "authz revalidated"
    - "no stale evidence"
    - "no cross-plant leakage"
    - "history not evidence"

  regression:
    - "daily_sales_deviation"
    - "plant_diagnosis"
    - "financial_diagnosis"
    - "persistent memory"
    - "M5/M6/M11/M12/M18"
    - "full suite"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected strategy A/B/C/D"
    - "inheritance gate"
    - "standalone precedence"
    - "topic-switch rules"
    - "entity rules"
    - "clarification rules"
    - "GPT context"
    - "requery behavior"
    - "generalization test"
    - "G2/G3"
    - "percentage effect"
    - "deferred gaps"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contracts changes"
  - "daily discount"
  - "Action Register Julio fix"
  - "SQL execution"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Phrasebook bottleneck traced."
  - "General inheritance principle audited."
  - "A/B/C/D compared."
  - "Exactly one strategy selected."
  - "Unknown != automatic clarification when context valid."
  - "Standalone/topic switch precedence defined."
  - "Entity safety defined."
  - "Requery preserved."
  - "GPT reasoning freedom preserved."
  - "Hold-out/generalization testing designed."
  - "No bigger phrasebook proposed as final solution."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS with one generalizable slice.
  STOPPED if a product/contract decision is required.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001.md