# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010
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
  Auditar los pendientes de producción que siguen abiertos después de integrar
  daily_executive_brief y commercial_trend. Determinar exactamente un siguiente
  cuello de mayor valor entre perfil longitudinal de cliente, Taller Mayor por
  unidad, identidad/saludo, directorio SEH y semántica temporal IGF.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

north_star: >
  Director IA debe sostener conversaciones ejecutivas reales sobre clientes,
  unidades, responsables organizacionales e IGF temporal usando fuentes físicas,
  continuidad de contexto y límites honestos, sin exigir nombres de módulos ni
  wording específico.

regressions_not_to_reselect_if_working:

  daily_executive_brief:
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
      - "¿Quién está moviendo la caída?"
      - "Háblame del primero."

  IGF_reviewable_supports:
    conversation:
      - "¿Cómo proyectamos cerrar Puebla este mes?"
      - "¿Qué podemos recortar de apoyos?"
      - "¿Cuáles todavía podemos detener?"
      - "Si dejaran de entrar, ¿cómo quedaría el IGF?"

  action_person:
    conversation:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"

  rule: >
    Solo reabrir uno de estos cuellos si existe evidencia de regresión real.

production_case_1_longitudinal_client:

  canonical_question: >
    ¿Qué cliente de Puebla es el de mayor volumen, cuánto compró cada mes en los
    últimos 3 meses, qué descuento/kg tuvo por mes, cuánto ingreso generó por mes,
    subió o bajó y qué sabemos de él?

  followups:
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Coincidió con más volumen?"
    - "¿Cuánto ingreso generó?"
    - "¿Qué sabemos de él?"
    - "¿Qué comentarios tenemos?"
    - "¿Tiene acciones pendientes?"
    - "¿Qué pasó con esas acciones?"

  semantic_variants:
    - "Háblame de nuestro cliente más grande de Puebla."
    - "¿Cómo se ha comportado el principal cliente estos 3 meses?"
    - "¿Qué tendencia trae nuestro mayor cliente?"
    - "¿Qué tanto le hemos descontado últimamente?"

  mandatory_audit:
    - "top client selection"
    - "cliente_key canonical identity"
    - "three-month semantics"
    - "monthly sales source"
    - "monthly discount/kg source"
    - "monthly income source"
    - "period alignment"
    - "comments"
    - "DICF"
    - "Action Register"
    - "entity handoff from commercial_trend mover"
    - "null != zero"
    - "no joins by display name"

  key_questions:
    - "Can existing monthly packs be composed safely per cliente_key?"
    - "Is monthly income physically available at client grain?"
    - "Does one reusable longitudinal client read model exist?"
    - "Can the selected top mover from commercial_trend become active_entity?"

  truth_boundary:
    - "discount and volume correlation != causality"
    - "comment != cause"
    - "action != outcome"
    - "highest volume != highest margin"

production_case_2_taller_mayor_units:

  canonical_question: >
    ¿Qué unidades de Puebla tienen apoyos/Folios de Taller Mayor este mes?
    Dame detalles.

  followups:
    - "¿Cuál tiene el apoyo más alto?"
    - "¿Qué le están haciendo?"
    - "¿Qué folio es?"
    - "¿En qué estatus va?"
    - "¿Todavía se puede detener?"
    - "¿Cuánto hemos gastado en esa unidad?"
    - "¿Qué otros apoyos ha tenido?"

  semantic_variants:
    - "¿Qué carros de Puebla traen apoyos de taller mayor?"
    - "Enséñame las unidades con reparaciones fuertes este mes."
    - "¿Qué unidades tienen folios de Taller Mayor?"

  mandatory_audit:
    - "physical Taller Mayor definition"
    - "categoria/subcategoria"
    - "unidad/economico field"
    - "folio link"
    - "current month/mes_cargo"
    - "plant scope"
    - "amount"
    - "status"
    - "concept/details"
    - "reviewability"
    - "unit-level history"
    - "existing Taller modules/helpers"
    - "whether Director IA currently has any read path to this grain"

  key_question: >
    Is this primarily a routing/read-model gap over data that already exists?

production_case_3_authenticated_greeting:

  canonical_turn: "Hola"

  desired_behavior_if_supported: >
    Personalize greeting using the currently authenticated user identity.

  desired_example_only_if_data_supports: >
    “Hola, Ing. Zaragoza. ¿En qué le puedo ayudar hoy?”

  mandatory_audit:
    - "POST /chat auth/session payload"
    - "dashboard token identity"
    - "user id"
    - "name"
    - "role"
    - "title/salutation field"
    - "smalltalk path"
    - "whether identity is currently dropped before GPT"

  truth_boundary:
    - "name must be current authenticated identity"
    - "professional title only if physically stored/derived by explicit rule"
    - "no model memory identity"
    - "no hardcoded name"

  value_question: >
    Is the missing personalized greeting a narrow presentation gap or does user
    identity unlock broader person-aware conversation?

production_case_4_SEH_directory:

  canonical_question: >
    ¿Quién es el responsable de Seguridad e Higiene en Puebla?

  followups:
    - "¿Cuál es su teléfono?"
    - "¿Y su correo?"
    - "¿Tiene acciones pendientes?"
    - "¿Qué sabemos de él?"

  semantic_variants:
    - "¿Quién lleva SEH en Puebla?"
    - "Dame el contacto de Seguridad e Higiene Puebla."
    - "¿Quién es el encargado de SEH?"

  mandatory_audit:
    - "physical DB source"
    - "usuarios/personas tables"
    - "plant assignment"
    - "area/department/function field"
    - "SEH aliases"
    - "current/vigencia semantics"
    - "name"
    - "phone"
    - "email"
    - "authz/privacy"
    - "whether data exists but is unreachable"
    - "whether data does not exist at all"

  key_question: >
    Is this MISSING_INFRASTRUCTURE over existing organizational data or
    MISSING_DATA requiring a directory source?

production_case_5_closed_month_IGF:

  canonical_question: >
    ¿Cuál es la proyección final del IGF de Puebla de mayo pasado?

  expected_behavior:
    - "detect past closed month"
    - "do not silently label current/latest version as forecast"
    - "offer actual closed result if available"

  followups:
    - "¿Entonces cómo cerró mayo?"
    - "¿Qué proyectábamos durante mayo?"
    - "¿Qué tan cerca estuvimos?"
    - "Compáralo con junio."

  semantic_variants:
    - "¿Cómo cerramos mayo en IGF?"
    - "¿Cuál fue el resultado final de mayo?"
    - "¿Qué habíamos proyectado para mayo?"

  mandatory_audit:
    - "current date/month semantics"
    - "period resolver"
    - "igf_status routing"
    - "closed actual fields"
    - "version semantics"
    - "historical snapshot persistence"
    - "whether a forecast-as-of date is stored"
    - "whether actual and forecast can be distinguished physically"

  truth_boundary:
    - "past closed actual != current forecast"
    - "latest historical record != necessarily historical forecast"
    - "no reconstructed forecast from final actual"

production_case_6_regression_commercial_to_client:

  conversation:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Quién está moviendo la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Tiene alguna acción pendiente?"

  purpose: >
    Test whether commercial_trend handoff already unlocks part of the
    longitudinal-client conversation and identify the exact point where it stops.

trace_each_case:
  required:
    - "isolated planner intent"
    - "effective intent"
    - "coverage guard"
    - "parent_intent"
    - "previous_frame"
    - "active_entity"
    - "plant"
    - "period/range"
    - "physical sources"
    - "sources actually loaded"
    - "entity resolution"
    - "fresh requery"
    - "evidence sent to GPT"
    - "limitations"
    - "GPT invoked"
    - "deterministic early return"
    - "exact failure point"

physical_source_rule: >
  Search the entire repository for actual sources/helpers before classifying
  something as missing. Data that exists in dashboard/WhatsApp but not chat is
  MISSING_INFRASTRUCTURE, not MISSING_DATA.

answerability_classification:
  values:
    - "WORKS_NOW"
    - "PARTIALLY_WORKS"
    - "ROUTING_GAP"
    - "MISSING_READ_MODEL"
    - "MISSING_PHYSICAL_DATA"
    - "TEMPORAL_SEMANTICS_GAP"
    - "AUTHZ_LIMIT"
    - "REGRESSION"

failure_classes:
  - "MISSING_DATA"
  - "MISSING_INFRASTRUCTURE"
  - "MODEL_REASONING_LIMIT"
  - "OVERPROGRAMMING"
  - "DEPLOYMENT_GAP"
  - "CONTRACT_OR_AUTHZ_LIMIT"

production_value_selection:

  dimensions:
    frequency: "likelihood in real executive use"
    executive_value: "decision/awareness usefulness"
    transversal_unlock: "number of future conversations unlocked"
    data_readiness: "how much physical truth already exists"
    natural_conversation: "how much it improves human-like continuity"

  rule: >
    Use these dimensions to justify the single bottleneck, not to create a
    permanent automated roadmap score.

single_bottleneck:
  exactly_one: true

  required:
    - "name"
    - "failure_class"
    - "production cases affected"
    - "physical location/source"
    - "evidence"
    - "why it wins now"
    - "what fixing it unlocks"
    - "what it does not solve"

  prohibited:
    - "selecting multiple parallel features"
    - "selecting easiest implementation only"

information_gap_quality:

  when physical data is missing:
    desired_answer_behavior:
      - "what is known"
      - "what is not available"
      - "specific missing source/field"
      - "why it matters"
      - "what becomes answerable if added"

  principle: >
    Good handling of missing data is conversational capability, not necessarily
    a failure.

phrasebook_policy:
  invariant: >
    Canonical questions are semantic production tests, not strings for routing.

  mandatory:
    - "semantic variants"
    - "holdouts"
    - "inspect lib/ for exact phrase coding"

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "user identity"
    - "client identity"
    - "unit identity"
    - "plant"
    - "period"
    - "amount"
    - "monthly math"
    - "status"
    - "contact data"
    - "authz"
    - "provenance"
    - "absence/error"

  LET_GPT_REASON:
    - "executive synthesis"
    - "trend interpretation with caveats"
    - "what stands out"
    - "what to investigate"
    - "follow-up wording"

next_task:
  exactly_one: true
  authorize: false
  execute: false

  naming_rule: >
    NEXT_TASK must directly attack the selected physical bottleneck and should
    be ARCH-* when readiness is required before implementation.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "schema creation"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Longitudinal client audited end-to-end."
  - "Commercial trend -> client handoff audited."
  - "Taller Mayor by unit audited."
  - "Authenticated greeting audited."
  - "SEH directory/data availability audited."
  - "Closed-month IGF semantics audited."
  - "Prior major fixes regression-checked."
  - "Semantic variants used."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010.md