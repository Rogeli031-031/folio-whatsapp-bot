# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012
  y autorizo G1 exclusivamente para auditoría read-only de producto.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Determinar dos cosas:
  1) cuál es el siguiente cuello real de producción después de integrar las
  principales capacidades conversacionales ya demostradas;
  2) si los fallos restantes siguen siendo estructurales de conversación o si
  Director IA ya posee una base conversacional madura y lo pendiente es
  principalmente ampliar datos/capacidades de negocio.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

conversation_maturity_question: >
  ¿Director IA ya puede sostener conversación natural sobre objetos conocidos
  —planta, fecha, canal, cliente, acción, Folio, unidad, IGF— y los fallos
  restantes provienen mayormente de conocimiento/datos faltantes?

known_working_regressions:

  daily_brief:
    conversation:
      - "¿Cómo nos fue ayer?"
      - "¿Qué te llama la atención?"
      - "¿Y la venta?"
      - "¿Y el descuento?"

  commercial_trend:
    conversation:
      - "¿Cómo vamos en CASA los últimos 3 meses?"
      - "¿Y COMISIONISTAS?"
      - "Compáralos."
      - "¿Quién mueve la caída?"

  client_profile:
    conversation:
      - "Háblame del primero."
      - "¿Qué sabemos de él?"
      - "¿Cómo compró estos meses?"
      - "¿Qué descuento tuvo?"
      - "¿Tiene acciones?"

  action_person:
    conversation:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"

  IGF_reviewable:
    conversation:
      - "¿Cómo proyectamos cerrar Puebla este mes?"
      - "¿Qué podemos recortar de apoyos?"
      - "¿Cuáles todavía puedo detener?"
      - "¿Cómo quedaría el escenario?"

  taller_mayor:
    conversation:
      - "¿Qué unidades tienen Taller Mayor este mes?"
      - "¿Cuál tiene el importe más alto?"
      - "Háblame de esa unidad."
      - "¿Qué Folio es?"
      - "¿Todavía se puede detener?"

  natural_followup:
    requirements:
      - "pronouns"
      - "same metric"
      - "cross metric"
      - "topic return"
      - "previous_frame"
      - "fresh requery"

  rule: >
    No reeligas una capability anterior salvo regresión demostrada.

remaining_known_cases:

  A_closed_month_IGF:
    canonical_questions:
      - "¿Cómo cerró mayo realmente?"
      - "¿Cuál era la proyección de mayo?"
      - "¿Qué tan cerca quedamos?"
    known_prior_finding: "TEMPORAL_SEMANTICS_GAP"

  B_authenticated_identity:
    canonical_questions:
      - "Hola"
      - "¿Quién soy?"
      - "¿Qué planta tengo autorizada?"
    known_prior_finding: "PARTIALLY_WORKS"

  C_SEH_directory:
    canonical_questions:
      - "¿Quién lleva SEH en Puebla?"
      - "¿Cuál es su teléfono?"
    known_prior_finding: "MISSING_PHYSICAL_DATA"

  D_actual_client_income:
    canonical_questions:
      - "¿Cuánto ingreso real generó este cliente por mes?"
    known_prior_finding: "UNSUPPORTED_METRIC"

  E_meeting_preparation:
    canonical_questions:
      - "¿Qué debo llevar preparado para la junta de cierre?"
      - "¿Qué preguntas probablemente nos harán?"
      - "¿Qué huecos de explicación tenemos?"
    status: "AUDIT_CANDIDATE_FROM_REAL_PLAUD_MEETINGS"

production_case_1_closed_month_IGF:

  goal: >
    Reauditar solo lo necesario para decidir si es un cuello conversacional
    transversal o una semántica temporal localizada.

  trace:
    - "planner"
    - "period resolver"
    - "IGF loader"
    - "closed/open month detection"
    - "actual vs forecast fields"
    - "historical snapshot existence"
    - "GPT behavior"

  classify:
    - "routing problem"
    - "read-model problem"
    - "missing historical data"
    - "localized temporal semantics"

production_case_2_authenticated_identity:

  goal: >
    Determinar si identidad autenticada es una capability estructural útil o
    solo mejora cosmética de saludo.

  trace:
    - "authenticated session/token"
    - "current user"
    - "name"
    - "role"
    - "plant permissions"
    - "chat payload"
    - "smalltalk"
    - "prompt"

  questions:
    - "Can current user identity improve authz-aware conversation?"
    - "Is name already physically available?"
    - "Does this unlock more than greeting?"

  prohibited:
    - "hardcoded names"
    - "professional title invention"

production_case_3_SEH_directory:

  goal: >
    Confirm whether this is genuinely missing physical data and therefore not a
    conversational engine blocker.

  audit:
    - "usuarios"
    - "personas"
    - "roles"
    - "areas"
    - "plant assignment"
    - "phone/email"

  expected_if_missing: >
    Director IA should eventually be able to answer honestly that the
    organizational directory is not available.

production_case_4_actual_client_income:

  goal: >
    Confirm whether lack of actual client income is a data/model issue rather
    than conversational failure.

  audit:
    - "commercial tables"
    - "ARR"
    - "DICF"
    - "accounting sources"
    - "client grain"

  invariant: >
    Formula/forecast != actual recognized income.

production_case_5_real_meeting_preparation:

  source_context: >
    Use repository evidence only in this task. Do not ingest Plaud recordings
    directly unless explicitly authorized in a separate task.

  audit_question: >
    Are current Director IA capabilities already sufficient to compose a
    pre-meeting executive brief from existing evidence, or would this require a
    genuinely new orchestration capability?

  candidate_components:
    - "daily executive brief"
    - "commercial trend"
    - "client profile"
    - "IGF current projection"
    - "reviewable Folios"
    - "actions/open gaps"
    - "Taller Mayor"
    - "missing explanations"

  determine:
    - "whether pieces exist"
    - "whether a meeting-prep orchestrator/read model is missing"
    - "whether this should be next architecture candidate"

conversation_readiness_score:

  purpose: >
    Produce an audit-only readiness assessment, not a permanent product metric.

  dimensions:

    semantic_routing:
      question: >
        Do unseen semantic variants route correctly without phrasebook?

    continuity:
      question: >
        Can 8-12 turn conversations preserve plant/date/entity/topic and return?

    cross_domain_handoff:
      question: >
        Can conversation move between metrics, client, actions, Folios, unit,
        IGF without stale evidence?

    truthfulness:
      question: >
        Does runtime distinguish missing, unsupported, forecast, actual,
        comment, cause, reviewability and savings?

    requery:
      question: >
        Is evidence refreshed instead of treated as stored conversational fact?

    graceful_unknown:
      question: >
        When data does not exist, can Director IA explain the limitation rather
        than collapse into routing failure?

  rating:
    values:
      - "NOT_READY"
      - "PARTIALLY_READY"
      - "CONVERSATION_BASE_READY_WITH_LIMITS"
      - "PRODUCTION_READY"

  rule: >
    Do not call PRODUCTION_READY merely because routing works.
    Security/authz, missing business data and deployment must still be considered.

structural_vs_domain_failure:

  structural_conversation_failure:
    examples:
      - "pronoun loses entity"
      - "standalone valid intent discarded"
      - "topic switch cannot return"
      - "one domain swallows another"
      - "fresh evidence not loaded"
      - "phrasebook dependence"

  domain_capability_gap:
    examples:
      - "SEH directory does not exist"
      - "actual client income not stored"
      - "historical forecast unavailable"
      - "new unit object not yet modeled"

  key_output: >
    Estimate whether remaining failures are predominantly structural or domain/data.

single_bottleneck:
  exactly_one: true

  selection_candidates:
    - "closed-month IGF semantics"
    - "authenticated identity"
    - "meeting preparation orchestration"
    - "other demonstrated structural failure"

  exclude_as_next_bottleneck_if_confirmed_missing_data:
    - "SEH directory"
    - "actual client income"

  required:
    - "name"
    - "failure class"
    - "evidence"
    - "what it unlocks"
    - "what it does not solve"

phrasebook_policy:
  invariant: "semantic tests, not literal routing"

mandatory_long_conversation_test:

  turns:
    - "¿Cómo nos fue ayer?"
    - "¿Qué te llama la atención?"
    - "¿Cómo vamos en CASA en los últimos 3 meses?"
    - "¿Y COMISIONISTAS?"
    - "¿Quién mueve la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Tiene acciones?"
    - "Volvamos a Puebla."
    - "¿Cómo proyectamos cerrar el IGF?"
    - "¿Qué apoyos todavía puedo revisar?"
    - "¿Qué unidades tienen Taller Mayor?"
    - "Háblame de la más costosa."

  audit:
    - "effective intent each turn"
    - "active plant"
    - "active date/range"
    - "active entity/unit/Folio"
    - "previous_frame"
    - "fresh requery"
    - "GPT invocation"
    - "limitations"

  purpose: >
    Stress-test whether the conversational substrate is now coherent across
    multiple domains.

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

readiness_output:

  must_report:
    - "Conversation readiness rating"
    - "Structural vs domain/data failure assessment"
    - "Long conversation result"
    - "Remaining known gaps"
    - "Exactly one next bottleneck"
    - "Exactly one NEXT_TASK"
    - "52.5% status"

  important: >
    If conversation base is now sufficiently mature, say so explicitly:
    “CONVERSATION_BASE_READY_WITH_LIMITS”.
    Do not keep inventing structural work merely to continue the loop.

next_task:
  exactly_one: true
  authorize: false
  execute: false

  preferred_naming:
    - "ARCH-DIRECTOR-IA-..."
    - "AUDIT-DIRECTOR-IA-..."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "Plaud ingestion"
  - "meeting recordings analysis"
  - "contracts"
  - "matrix"
  - "SQL execution"
  - "schema"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Long multi-domain conversation audited."
  - "Structural vs domain/data gap distinguished."
  - "Closed-month IGF reclassified."
  - "Authenticated identity value assessed."
  - "SEH missing-data status confirmed/revised."
  - "Actual client income status confirmed/revised."
  - "Meeting-preparation composition feasibility audited."
  - "Conversation readiness rating assigned."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "No phrasebook."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012.md