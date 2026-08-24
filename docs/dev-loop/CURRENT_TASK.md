# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar la estrategia C aprobada para consultas naturales sobre acciones
  y responsables: fortalecer los intents existentes de Action Register,
  especialmente action_status, para que preguntas como “¿Qué pasó con la acción
  de Julio Pérez?” y “¿Qué acciones tiene Julio Pérez?” carguen evidencia real
  del board y puedan sostener follow-ups naturales, sin phrasebook nuevo,
  sin seleccionar acciones ambiguas en silencio y sin atribuir causalidad,
  culpa o motivo no documentado.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001"
    determination: "READY_WITH_LIMITS"
    strategy: "C — strengthen existing AR intents"
    canonical_parent_intent: "action_status"

product_principle: >
  Los datos de Action Register ya existen. La implementación debe llevar la
  pregunta a esa evidencia y dejar que GPT converse sobre ella. No crear un
  evaluador de desempeño de personas.

known_failure_to_fix:

  singular_action_token:
    current_problem: >
      Tras normalización “acción” -> “accion”, el regex actual no cubre
      correctamente singular/plural y deja consultas válidas en unknown.

  action_status_semantics:
    current_problem: >
      action_status exige señales adicionales como abiert/pendient/estado/tema/
      register, por lo que consultas naturales de acción + responsable pueden
      quedar unknown aunque sean inequívocamente Action Register.

  inheritance:
    current_problem: >
      action_status no está en INHERITABLE_INTENTS, por lo que follow-ups como
      “¿Está vencida?” o “¿Por qué no la cerró?” pierden el hilo.

routing:

  canonical_intent: "action_status"

  required_examples:
    - "¿Qué pasó con la acción de Julio Pérez?"
    - "¿Qué acciones tiene Julio Pérez?"
    - "¿Hay una acción de Julio Pérez?"
    - "¿Cómo va la acción de Julio Pérez?"
    - "¿Julio Pérez tiene algo vencido?"

  rules:
    - "semántica explícita de Action Register + responsable debe rutear a AR"
    - "planner debe resolver antes de que memory resume genérico intercepte"
    - "persistent memory no se desactiva globalmente"
    - "standalone AR query no requiere contexto previo"
    - "follow-up AR puede heredar action_status"

anti_phrasebook:

  prohibited:
    - "hardcode exacto de 'qué pasó con la acción de'"
    - "if contains Julio"
    - "lista de nombres de responsables"
    - "listas extensas de verbos"
    - "nuevo catálogo de expresiones"
    - "score arbitrario"

  required:
    - "corregir semántica estructural accion/acciones"
    - "usar resolución física de responsable"
    - "usar intents AR existentes"

planner_changes:

  mandatory:
    - "corregir detección accion/acciones"
    - "permitir action_status cuando exista semántica clara de acción + responsable"
    - "preservar responsible_lookup y overdue_actions"
    - "no crear intent nuevo salvo contradicción física inesperada"

  inheritance:
    add: "action_status"

  rule: >
    No convertir planner en parser de lenguaje natural por listas de frases.

responsible_resolution:

  source: "Action Register actual"

  requirements:
    - "resolver responsable dentro del scope/planta actual"
    - "sin fuzzy silencioso"
    - "nombre parcial solo si el mecanismo existente lo soporta de forma única"
    - "homónimo/ambigüedad -> clarificar"

  truth_boundary:
    - "responsable registrado de acción != responsable del problema"
    - "responsable registrado != culpable"
    - "acción vencida != negligencia"

action_selection:

  zero_actions:
    behavior: >
      Informar que no se encontraron acciones asociadas al responsable en el
      scope consultado, con las limitaciones/provenance correspondientes.

  one_action:
    behavior: >
      Puede cargarla directamente y continuar conversación.

  multiple_actions:
    behavior: >
      No seleccionar una arbitrariamente. Entregar lista acotada con identificador/
      título/tema/estado/fecha suficiente para que el usuario elija o clarifique.

  rule: >
    Nunca inferir “la acción” si existen varias plausibles.

evidence_pack:

  preferred_behavior: >
    Reutilizar el board/context/loaders actuales de Action Register y producir
    un bloque focal por responsable/acción sin duplicar la fuente.

  required_fields_if_physical:
    - "action id"
    - "title/topic"
    - "status"
    - "responsible"
    - "commit/due date"
    - "overdue derivation"
    - "last update"
    - "history/events when available"
    - "resultado_cierre when available"
    - "provenance"

  rule: >
    No fabricar historial o resultado si no existe.

DICF_boundary:

  allowed_only_if_existing_path_supports:
    - "resultado_cierre"
    - "historial physically linked to action"

  rule: >
    No mezclar DICF por nombre de persona ni inventar linkage.

conversation_state:

  parent_intent: "action_status"

  required_followups:
    - "¿Está vencida?"
    - "¿Por qué no la cerró?"
    - "¿Lo sabemos?"
    - "¿Qué información falta?"
    - "¿Qué necesitas de Julio?"
    - "¿Hay alguna actualización?"
    - "¿Y la otra?"

  inheritance:
    preserve_natural_followup_strategy_B: true

  required_state:
    - "active action only if uniquely resolved"
    - "active responsible if physically resolved"
    - "plant current"
    - "fresh evidence bundle"

  multiple_actions_rule: >
    No crear active_action hasta que exista una acción inequívoca.

information_gap:

  canonical_question: "¿Por qué no la cerró?"

  if_no_reason_evidence:
    runtime_should_supply:
      - "action status"
      - "due date"
      - "overdue yes/no"
      - "responsible"
      - "latest update if any"
      - "absence of recorded explanation"
      - "limitations"

    GPT_may_say_naturally:
      - "no encuentro una explicación registrada del retraso"
      - "necesito una actualización de la acción"
      - "necesito saber si existe un bloqueo"
      - "necesito un resultado parcial/final si ya ocurrió"
      - "si sigue abierta, falta una fecha/estado actualizado cuando corresponda"

  prohibited:
    - "Julio no la cerró porque no dio seguimiento"
    - "Julio incumplió"
    - "Julio causó el atraso"
    - "la acción falló"
    - "la acción no funcionó"

  person_rule: >
    Julio puede ser mencionado como fuente natural de actualización SOLO porque
    está físicamente registrado como responsable de esa acción.

GPT_boundary:

  runtime_owns:
    - "routing"
    - "responsible identity"
    - "action identity"
    - "status"
    - "dates"
    - "overdue math"
    - "history/result retrieval"
    - "authz"
    - "provenance"
    - "missing/error semantics"

  GPT_owns:
    - "explicación conversacional"
    - "síntesis"
    - "qué sabemos/no sabemos"
    - "qué información falta"
    - "cómo formular una pregunta de seguimiento"
    - "qué actualización solicitar"

  rule: >
    No programar respuestas finales rígidas salvo clarificación de ambigüedad.

memory_precedence:

  required:
    - "explicit AR semantics win over generic resume-memory trigger"
    - "persistent memory preserved for real resume cases"
    - "no disable 'qué pasó con' globally"

  example:
    question: "¿Qué pasó con la acción de Julio Pérez?"
    expected: "Action Register routing"

  contrasting_example:
    question: "¿Qué pasó con Arturo?"
    expected: >
      Persistent memory may still participate when no more specific business
      intent wins.

natural_followup_preservation:

  strategy_B: true

  rule: >
    Una vez dentro de action_status, unknown follow-ups con valid state heredan
    y llegan a GPT con requery, no mediante phrasebook.

holdout_generalization:

  mandatory: true

  examples_for_tests_only:
    - "¿Qué ocurrió con lo que trae Julio Pérez?"
    - "¿Cómo va lo pendiente de Julio?"
    - "¿Tiene algo fuera de fecha?"
    - "¿Hay novedades de esa acción?"
    - "¿Y la que sigue abierta?"

  rule: >
    No copiar estos textos a production routing. Deben funcionar por semántica
    existente/contexto.

authz:

  preserve_Action_Register_authz: true

  required:
    - "scope actual de planta"
    - "rol actual"
    - "no cross-plant"
    - "fail-closed"

  rule: >
    El nuevo routing no amplía visibilidad de Action Register.

absence_error_semantics:

  distinguish:
    - "responsable sin acciones"
    - "acción no encontrada"
    - "acción ambigua"
    - "sin historial"
    - "sin explicación registrada"
    - "SOURCE_RESTRICTED"
    - "DATA_NOT_FOUND"
    - "TOOL_ERROR"

  rule: >
    No convertir ausencia de actualización en evidencia de incumplimiento.

preserve:

  - "persistent conversational memory"
  - "natural follow-up strategy B"
  - "daily_sales_deviation"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "responsible_lookup"
  - "overdue_actions"
  - "existing Action Register queries"
  - "monthly paths"
  - "M5/M6/M11/M12/M18"

deferred:
  - "daily discount/kg"
  - "SQL 017 environment deployment"
  - "person performance scoring"
  - "client economic trade-off"
  - "before-action-after causality/effectiveness"

mandatory_product_conversations:

  conversation_1_single_action:
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no la cerró?"
      - "¿Lo sabemos?"
      - "¿Qué información falta?"
      - "¿Qué necesitas de Julio?"

    required:
      - "AR routing"
      - "responsible resolution"
      - "action evidence"
      - "action_status inheritance"
      - "requery"
      - "GPT"
      - "no blame"

  conversation_2_multiple_actions:
    turns:
      - "¿Qué acciones tiene Julio Pérez?"
      - "¿Cuál está vencida?"
      - "¿Y la otra?"
    required:
      - "no silent selection"
      - "safe narrowing"
      - "fresh evidence"

  conversation_3_memory_precedence:
    setup: "pending memory exists for Julio/entity"
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
    required:
      - "AR wins over generic memory resume"

  conversation_4_holdout:
    use_unlisted_phrases: true
    required:
      - "no production phrase hardcoding"

tests_required:

  planner:
    - "accion singular"
    - "acciones plural"
    - "action + responsible -> action_status"
    - "existing action_status preserved"
    - "responsible_lookup preserved"
    - "overdue_actions preserved"

  routing:
    - "AR wins over memory resume"
    - "standalone action-person query"
    - "action_status inheritable"

  responsible:
    - "unique responsible"
    - "ambiguous responsible"
    - "no responsible"

  actions:
    - "0 actions"
    - "1 action"
    - "N actions"
    - "no silent pick"

  conversation:
    - "is overdue?"
    - "why not closed?"
    - "do we know?"
    - "what is missing?"
    - "what do you need from responsible?"

  truth:
    - "responsible != culprit"
    - "overdue != negligence"
    - "absence explanation != cause"

  security:
    - "authz"
    - "cross-plant"

  regression:
    - "natural follow-up"
    - "persistent memory"
    - "daily deviation"
    - "plant diagnosis"
    - "financial diagnosis"
    - "capabilities"
    - "planner"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001.md"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "test/director-ia-action-person-routing.test.js"
    - "scripts/test-director-ia-planner.js"

  conditional_writable:
    - "existing Director IA tests only if legitimate assertions require update"
    - "Action Register helper file only if existing code organization requires a minimal focused helper"

  read_only:
    - "docs/director-ia/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"
    - "other unrelated code"

out_of_scope:
  - "new intent"
  - "larger phrasebook"
  - "daily discount/kg"
  - "SQL 017 execution"
  - "person scoring"
  - "matrix changes"
  - "contract changes"
  - "schema changes"
  - "new tables"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy C implemented."
  - "accion/acciones correctly routed."
  - "action + responsible reaches Action Register."
  - "action_status is inheritable."
  - "explicit AR beats generic memory resume."
  - "Responsible resolved physically."
  - "0/1/N action behavior safe."
  - "No silent action selection."
  - "Status/date/overdue evidence available."
  - "History/resultado only when physical."
  - "No invented delay reason."
  - "Responsible != culprit preserved."
  - "Natural follow-ups reach GPT."
  - "No phrasebook expansion."
  - "Hold-out generalization."
  - "Authz preserved."
  - "52.5% preserved."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001.md