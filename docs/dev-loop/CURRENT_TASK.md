# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011
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
  Auditar únicamente los principales pendientes reales de producción que siguen
  abiertos después de integrar daily_executive_brief, commercial_trend,
  client_profile e IGF reviewable supports. Seleccionar exactamente un siguiente
  cuello de mayor impacto entre Taller Mayor por unidad, semántica temporal IGF
  de periodos cerrados, identidad autenticada/saludo y directorio organizacional
  SEH.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

north_star: >
  Director IA debe poder conversar naturalmente sobre objetos físicos reales de
  la organización —unidades, periodos financieros cerrados y personas
  responsables— sin inventar datos ni requerir wording técnico.

regressions_not_to_reselect_if_working:

  daily_executive_brief:
    - "¿Cómo nos fue ayer?"
    - "¿Qué te llama la atención?"
    - "¿Y la venta?"
    - "¿Y el descuento?"

  commercial_trend:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Y COMISIONISTAS?"
    - "Compáralos."
    - "¿Quién mueve la caída?"

  client_profile:
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Cómo compró estos 3 meses?"
    - "¿Qué descuento tuvo?"
    - "¿Tiene acciones?"

  IGF_reviewable_supports:
    - "¿Qué podemos recortar de apoyos?"
    - "¿Cuáles todavía se pueden detener?"
    - "¿Cómo quedaría el escenario IGF?"

  action_person:
    - "¿Qué pasó con la acción de Julio Pérez?"

  rule: >
    Solo reabrir uno de estos si la auditoría demuestra una regresión física.

production_case_1_taller_mayor_units:

  canonical_question: >
    ¿Qué unidades de Puebla tienen apoyos/Folios de Taller Mayor este mes?
    Dame detalles.

  semantic_variants:
    - "¿Qué carros de Puebla traen apoyos de Taller Mayor?"
    - "Enséñame las unidades con reparaciones mayores este mes."
    - "¿Qué unidades tienen folios grandes de taller?"
    - "¿Qué unidades están en Taller Mayor y cuánto llevan?"

  followups:
    - "¿Cuál tiene el apoyo más alto?"
    - "¿Qué le están haciendo?"
    - "¿Qué folio es?"
    - "¿En qué estatus va?"
    - "¿Todavía se puede detener?"
    - "¿Cuánto hemos gastado en esa unidad?"
    - "¿Qué otros apoyos ha tenido?"
    - "¿Tiene historial de reparaciones anteriores?"

  mandatory_audit:
    - "physical definition of Taller Mayor"
    - "category/subcategory/folio classification"
    - "unidad/economico/placa/identifier fields"
    - "folio -> unidad relationship"
    - "same plant"
    - "current month / mes_cargo"
    - "importe"
    - "status"
    - "concept/details"
    - "reviewability"
    - "historical folios by same unit"
    - "existing Taller AT/GASTOS helpers"
    - "dashboard source"
    - "whether Director IA has any unit-level read path"

  key_questions:
    - "Are unit and Folio physically linked by a canonical key?"
    - "Can current-month Taller Mayor rows be grouped safely by unit?"
    - "Can reviewability reuse the already integrated Folio rules?"
    - "Can historical spending by unit be queried without name/text matching?"

  truth_boundary:
    - "high repair amount != bad unit decision"
    - "folio status != mechanical diagnosis"
    - "reviewable != recommended to cancel"

production_case_2_closed_month_IGF_semantics:

  canonical_question: >
    ¿Cuál es la proyección final del IGF de Puebla de mayo pasado?

  semantic_variants:
    - "¿Cómo proyectamos cerrar mayo?"
    - "¿Cuál fue la proyección de mayo?"
    - "¿Cómo cerró realmente mayo?"
    - "¿Qué habíamos estimado para mayo?"

  expected_behavior:
    - "recognize May as closed"
    - "distinguish actual closed result from forecast"
    - "offer actual result when forecast semantics do not apply"
    - "historical forecast only if physically persisted"

  followups:
    - "¿Entonces cómo cerró mayo realmente?"
    - "¿Qué proyectábamos durante mayo?"
    - "¿Qué tan cerca quedamos?"
    - "Compáralo con junio."

  mandatory_audit:
    - "period resolver"
    - "current date/month"
    - "open vs closed period semantics"
    - "IGF actual fields"
    - "latest version behavior"
    - "snapshot/version history"
    - "as-of timestamp"
    - "whether historical forecast can be reconstructed legitimately"
    - "whether frontend/dashboard already distinguishes actual vs forecast"

  truth_boundary:
    - "closed actual != forecast"
    - "latest historical row != necessarily historical projection"
    - "do not synthesize forecast from final actual"

  key_question: >
    Is this a narrow temporal routing/semantics gap over data already present,
    or is historical forecast physically unavailable?

production_case_3_authenticated_identity:

  canonical_turn: "Hola"

  desired_behavior_if_supported: >
    Personalize greeting using the current authenticated user's identity.

  examples:
    - "Hola"
    - "Buenos días"
    - "Qué tal"

  mandatory_audit:
    - "dashboard authenticated user payload"
    - "POST /director-ia/chat or equivalent"
    - "user id"
    - "nombre"
    - "role"
    - "plant permissions"
    - "professional title/salutation field"
    - "smalltalk path"
    - "system prompt context"
    - "whether identity is available but discarded"

  desired_safe_behavior:
    name_available: >
      “Hola, <nombre>. ¿En qué le puedo ayudar hoy?”

    title_available: >
      Use professional title only if physically stored or governed by explicit
      safe business rule.

  prohibited:
    - "hardcoded Zaragoza"
    - "memory as identity source"
    - "guessing Ing./Lic./Dr."
    - "identity leakage between users"

  broader_value_audit:
    determine: >
      Whether authenticated identity could also improve role-aware responses,
      not just greeting cosmetics.

production_case_4_SEH_directory:

  canonical_question: >
    ¿Quién es el responsable de Seguridad e Higiene en Puebla?

  semantic_variants:
    - "¿Quién lleva SEH en Puebla?"
    - "¿Quién es el encargado de Seguridad e Higiene?"
    - "Dame el contacto de SEH Puebla."

  followups:
    - "¿Cuál es su teléfono?"
    - "¿Y su correo?"
    - "¿Tiene acciones pendientes?"
    - "¿Qué sabemos de él?"

  mandatory_audit:
    - "usuarios"
    - "personas/contactos"
    - "role/cargo"
    - "area/departamento"
    - "plant assignment"
    - "SEH aliases"
    - "responsable currentness/vigencia"
    - "telefono"
    - "correo"
    - "directory-like sources in dashboard/WhatsApp"
    - "authz/privacy"

  classification_requirement:
    distinguish:
      - "MISSING_PHYSICAL_DATA"
      - "MISSING_INFRASTRUCTURE_OVER_EXISTING_DATA"

  rule: >
    Do not treat docs/equipos mentions as a responsible-person directory.

production_case_5_regression_chain:

  conversation:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Quién mueve la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"
    - "¿Cómo compró estos meses?"
    - "¿Tiene acciones?"

  expected: >
    commercial_trend -> client_profile handoff must still work.

production_value_selection:

  dimensions:
    frequency: "probabilidad de uso ejecutivo real"
    executive_value: "impacto en decisión/visibilidad"
    transversal_unlock: "cuántas conversaciones nuevas habilita"
    data_readiness: "qué tanto dato físico ya existe"
    naturalness: "qué tanto mejora la sensación de conversación"

  rule: >
    Use only to justify the next bottleneck. Do not persist a roadmap score.

trace_each_case:

  required:
    - "isolated planner"
    - "effective intent"
    - "coverage guard"
    - "parent intent"
    - "conversation state"
    - "active entity if any"
    - "plant"
    - "period"
    - "physical sources"
    - "sources actually loaded"
    - "authz"
    - "evidence to GPT"
    - "limitations"
    - "GPT invoked"
    - "deterministic early return"
    - "exact failure point"

physical_source_rule: >
  Search repository-wide before declaring data missing. If dashboard/WhatsApp
  already has the source, classify as missing infrastructure, not missing data.

phrasebook_policy:
  invariant: >
    User questions are semantic production tests, never strings to hardcode.

  required:
    - "semantic variants"
    - "holdouts"
    - "inspect production routing for literal phrase rules"

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

single_bottleneck:

  exactly_one: true

  required:
    - "name"
    - "failure_class"
    - "production case affected"
    - "physical location/source"
    - "evidence"
    - "why it wins now"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Pick the highest-value structural blocker among the remaining production
    cases, not the easiest cosmetic improvement.

next_task:

  exactly_one: true
  authorize: false
  execute: false

  naming: >
    Prefer ARCH-* if readiness/business semantics must be established before
    implementation.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "matrix changes"
  - "contracts"
  - "SQL execution"
  - "schema"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Taller Mayor by unit audited physically."
  - "Closed-month IGF semantics audited."
  - "Authenticated identity/greeting audited."
  - "SEH directory physically audited."
  - "Commercial trend -> client profile regression validated."
  - "Semantic variants used."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011.md