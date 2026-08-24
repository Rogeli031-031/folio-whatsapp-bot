# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el mecanismo mínimo y generalizable para que preguntas naturales sobre
  una acción y/o su responsable, por ejemplo “¿Qué pasó con la acción de Julio
  Pérez?”, ruteen al Action Register y carguen evidencia real disponible, sin
  depender de un phrasebook cerrado, sin confundir responsable de acción con
  responsable del problema y sin inventar la razón de un vencimiento o falta de
  cierre.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
    bottleneck: >
      Action Register por persona/acción no se rutea aunque board, responsable
      y vencimiento ya existen.
    failure_class: "MISSING_INFRASTRUCTURE"

product_principle: >
  Si los datos ya existen, la infraestructura debe llevar la pregunta a la
  evidencia correcta. GPT conserva la explicación conversacional y reconoce
  lo que todavía no está documentado.

central_question: >
  ¿Cómo debe detectar Director IA que una pregunta trata sobre una acción
  registrada y/o una persona responsable, sin codificar expresiones exactas ni
  permitir que memoria u otro routing intercepte incorrectamente la consulta?

known_failure:
  example: "¿Qué pasó con la acción de Julio Pérez?"
  current_behavior:
    - "puede ser interceptado por persistent-memory 'qué pasó con'"
    - "planner aislado queda unknown"
    - "no carga Action Register"
    - "termina en clarificación"
  known_data:
    - "Action Register board"
    - "acciones"
    - "responsable"
    - "estado"
    - "fecha/vencimiento"
    - "historial disponible según path actual"

mandatory_runtime_audit:

  inspect:
    - "planner intents de Action Register"
    - "responsible_lookup"
    - "action_status"
    - "overdue_actions"
    - "persistent-memory resume detector"
    - "natural follow-up inheritance"
    - "Action Register focused context/loaders"
    - "responsible/entity resolution"
    - "history/resultado de acciones"
    - "askDirectorIa routing precedence"

  trace_exactly:
    - "¿Qué pasó con la acción de Julio Pérez?"
    - "¿Qué acciones tiene Julio Pérez?"
    - "¿Tiene alguna vencida?"
    - "¿Por qué no la cerró?"
    - "¿Qué falta saber?"
    - "¿Qué necesitas de Julio?"

routing_precedence_audit:

  question: >
    ¿Qué debe ganar cuando un mensaje contiene señales de retomar (“qué pasó con”)
    y a la vez señales estructurales de Action Register (“acción”, responsable)?

  determine:
    - "explicit Action Register semantics vs memory resume"
    - "named responsible resolution"
    - "current parent_intent"
    - "standalone AR query"
    - "follow-up AR query"

  principle: >
    Un intent explícito sobre acción/responsable debe ganar sobre un trigger
    genérico de memoria.

anti_phrasebook:

  prohibited:
    - "hardcode 'qué pasó con la acción de'"
    - "listas de verbos para Julio/acción"
    - "lista de nombres de responsables"
    - "if text contains Julio"
    - "score arbitrario de palabras"

  required:
    - "usar señales estructurales ya existentes"
    - "intent semántico de Action Register"
    - "resolución física de responsable"
    - "contexto conversacional cuando aplique"

responsible_resolution:

  audit:
    - "cómo se representa responsable en Action Register"
    - "si existe identificador o solo texto"
    - "cómo se resuelve Julio Pérez"
    - "qué pasa con nombres parciales"
    - "qué pasa con homónimos"
    - "scope de planta"

  rules:
    - "no fuzzy silencioso"
    - "ambiguous -> clarify"
    - "responsable de acción != responsable del problema"
    - "responsable registrado != culpable"

action_identity:

  audit:
    - "si pregunta puede apuntar a una acción específica"
    - "si hay varias acciones del responsable"
    - "cómo seleccionar sin adivinar"
    - "si debe listar y pedir clarificación"
    - "qué identificadores/títulos/temas existen"

  rule: >
    Si Julio tiene varias acciones plausibles, Director IA no debe seleccionar
    una silenciosamente.

action_evidence:

  must_determine_available_fields:
    - "acción/título/tema"
    - "status"
    - "responsable"
    - "fecha compromiso"
    - "vencida sí/no derivable"
    - "historial/eventos"
    - "resultado_cierre"
    - "revision notes si físicamente aplicables"
    - "última actualización"

  provenance:
    required: true

truth_boundaries:

  facts_allowed_if_physical:
    - "la acción está abierta"
    - "la acción venció en fecha X"
    - "la acción está asignada a Julio Pérez"
    - "existe/no existe actualización registrada"
    - "existe/no existe resultado de cierre"

  forbidden_without_evidence:
    - "Julio no la cerró por falta de seguimiento"
    - "Julio es responsable del problema"
    - "la acción falló"
    - "la acción no funcionó"

  principle: >
    Estado/vencimiento son hechos del registro. Motivo del vencimiento es otra
    pregunta y requiere evidencia adicional.

information_gap_behavior:

  canonical_case:
    question: "¿Por qué no la cerró?"

  expected_if_no_evidence: >
    Director IA debe poder distinguir que sabe que la acción está vencida/abierta
    pero no tiene evidencia suficiente para explicar el motivo.

  should_enable_GPT_to_say:
    - "no encuentro una explicación registrada del retraso"
    - "necesito una actualización de la acción"
    - "necesito saber si existe bloqueo, resultado parcial o nueva fecha"
    - "Julio puede ser mencionado únicamente porque es el responsable registrado de esa acción"

  rule: >
    No programar respuesta final rígida. Entregar evidence + limitations a GPT.

conversation_state:

  desired_parent_intent:
    candidates:
      - "action_status"
      - "responsible_lookup"
      - "overdue_actions"
      - "AR-focused intent existente"

  requirement: >
    Determinar cuál intent padre canónico permite sostener:
    acción de Julio -> vencida -> por qué no cerró -> qué falta.

  followups:
    - "¿Está vencida?"
    - "¿Por qué no la cerró?"
    - "¿Lo sabemos?"
    - "¿Qué falta?"
    - "¿Qué necesitas de Julio?"

  rule: >
    Follow-ups abiertos deben aprovechar la herencia natural ya integrada.

memory_interception:

  mandatory:
    - "identificar físicamente por qué 'qué pasó con' dispara resume memory"
    - "definir precedencia segura"
    - "no desactivar memoria globalmente"

  preferred_principle: >
    Una referencia explícita a acción/Action Register debe resolverse primero
    como consulta empresarial; persistent memory queda para retomar pendientes
    cuando no exista un intent empresarial más específico.

solution_candidates:

  A_phrasebook:
    description: "agregar frases de acción/persona"
    expected: "rechazar salvo evidencia excepcional"

  B_planner_new_intent:
    description: >
      Crear intent específico action_person_status/action_person_query.

  C_strengthen_existing_AR_intents:
    description: >
      Ampliar detección semántica/routing de intents AR existentes para combinar
      acción + responsable sin crear una taxonomía redundante.

  D_post_planner_business_signal_override:
    description: >
      Si planner queda unknown pero el turno contiene una entidad/responsable
      resoluble y semántica empresarial de acción, priorizar AR antes de memory/
      clarification.

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "preferir reuse de intents existentes si semánticamente correcto"
    - "no elegir por facilidad"

generalization:

  required_tests:
    examples:
      - "¿Qué ocurrió con la tarea que tiene Julio Pérez?"
      - "¿Cómo va lo que trae Julio?"
      - "¿Julio tiene algo vencido?"
      - "¿Qué pendiente tiene Julio?"
      - "¿Hay actualización de la acción de Julio?"

  rule: >
    Los ejemplos son para diseñar hold-outs. No deben convertirse en lista de
    producción.

  requirement: >
    La solución debe reconocer la estructura acción/responsable, no la frase exacta.

standalone_and_followup:

  standalone:
    example: "¿Qué acciones tiene Julio Pérez?"
    expected: "AR routing sin necesitar estado previo"

  followup:
    sequence:
      - "¿Qué acciones tiene Julio Pérez?"
      - "¿Cuál está vencida?"
      - "¿Por qué no la cerró?"
      - "¿Qué falta saber?"

    expected: >
      Estado conversacional + fresh AR evidence + GPT.

authz:

  required:
    - "scope de planta actual"
    - "roles actuales de Action Register"
    - "cross-plant blocked"
    - "fail-closed"

  rule: >
    Routing nuevo no amplía authz de AR.

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "routing empresarial"
    - "responsable identity"
    - "action identity"
    - "status"
    - "vencimiento"
    - "dates"
    - "authz"
    - "joins"
    - "provenance"
    - "absence/error"

  LET_GPT_REASON:
    - "explicación narrativa"
    - "qué significa el estado"
    - "qué información falta"
    - "qué preguntar al responsable"
    - "follow-up natural"

  rule: >
    No implementar un evaluador de desempeño de personas.

daily_discount_boundary:
  status: "deferred"

persistent_memory_boundary:
  preserve: true
  SQL017_execution: false

product_tests_if_ready:

  conversation_1:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no la cerró?"
      - "¿Lo sabemos?"
      - "¿Qué información falta?"
      - "¿Qué necesitas de Julio?"

  conversation_2_multiple_actions:
    setup: "responsable con múltiples acciones"
    expected: >
      listar/acotar o clarificar; no elegir una arbitrariamente.

  conversation_3_memory_precedence:
    setup: "existe pending memory sobre Julio"
    question: "¿Qué pasó con la acción de Julio?"
    expected: >
      Action Register explícito gana sobre resume memory.

  conversation_4_holdout:
    use_phrases_not_in_production_logic: true

contract_audit:
  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"

  expectation: "runtime-only"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D strategy"
    - "canonical parent intent"
    - "routing precedence"
    - "memory precedence"
    - "responsible resolution"
    - "multiple-action behavior"
    - "evidence fields"
    - "information-gap behavior"
    - "GPT boundary"
    - "authz"
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
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contracts changes"
  - "daily discount"
  - "SQL 017 execution"
  - "person performance scoring"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Current failure traced."
  - "Memory interception traced."
  - "AR/responsible data availability confirmed."
  - "A/B/C/D compared."
  - "Exactly one strategy selected."
  - "Canonical parent intent determined."
  - "Responsible resolution defined."
  - "Multiple-action ambiguity handled."
  - "Action vs problem responsibility boundary explicit."
  - "Information-gap behavior defined."
  - "Hold-out/generalization tests designed."
  - "No phrasebook solution."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS with one implementable slice.
  STOPPED if a product/contract decision is needed.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001.md