# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009
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
  Auditar Director IA con una segunda batería de preguntas reales de producción
  después de integrar daily_executive_brief. Determinar exactamente un cuello
  actual de mayor impacto entre tendencia comercial 1M/3M, análisis longitudinal
  de cliente, Taller Mayor por unidad, identidad autenticada, directorio SEH y
  coherencia temporal IGF.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

north_star: >
  El usuario debe poder hablar como director, sin conocer nombres de módulos ni
  estructuras de datos. Director IA debe entender planta, periodo, canal,
  cliente, unidad o función organizacional y responder con evidencia física,
  contexto conversacional y límites explícitos.

recent_capability_to_regression_test:
  daily_executive_brief:
    conversation:
      - "¿Cómo nos fue ayer?"
      - "¿Qué te llama la atención?"
      - "¿Y la venta?"
      - "¿Y el descuento?"
    expected: "must remain functional"

production_case_1_commercial_trend_1m_3m:

  canonical_questions:
    - "¿Cómo vamos en el último mes?"
    - "¿Cómo vamos en los últimos 3 meses?"
    - "¿Cómo vamos en CASA en los últimos 3 meses?"
    - "¿Cómo van los COMISIONISTAS el último mes?"

  semantic_variants:
    - "¿Qué tendencia trae CASA?"
    - "¿Cómo se ha comportado COMISIONISTAS?"
    - "¿Venimos subiendo o bajando?"
    - "¿Qué pasó con CASA estos meses?"
    - "Compárame CASA contra COMISIONISTAS."

  expected_evidence_basis: >
    La respuesta debe basarse en la misma materia prima que alimenta las gráficas
    reales del dashboard: serie temporal, canal, tendencia, movimientos de
    clientes y comentarios/evidencia cuando existan.

  mandatory_audit:
    - "physical source used by the charts"
    - "date range generation"
    - "1 month semantics"
    - "3 month semantics"
    - "CASA channel"
    - "COMISIONISTA/COMISIONISTAS channel"
    - "daily series"
    - "trend line / regression if physically calculated"
    - "total/average where relevant"
    - "client contribution / delta"
    - "comments shown alongside graph"
    - "plant scope"
    - "whether chat already accesses this dataset"

  key_questions:
    - "Can Director IA reproduce the meaning of the graphs?"
    - "Can it separate CASA from COMISIONISTAS?"
    - "Can it say up/down from actual trend rather than first-vs-last only?"
    - "Can it identify clients explaining the movement?"
    - "Can comments be included without converting them into proven causes?"

  truth_boundary:
    - "trend != cause"
    - "comment != proven cause"
    - "one anomalous day != trend"
    - "client delta != causal explanation"

production_case_2_longitudinal_top_client:

  canonical_question: >
    ¿Qué cliente de Puebla es el de mayor volumen, cuánto compró cada mes en los
    últimos 3 meses, qué descuento/kg tuvo por mes, cuánto ingreso dejó por mes,
    subió o bajó y qué sabemos de él?

  followups:
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Coincidió con más volumen?"
    - "¿Cuánto ingreso generó?"
    - "¿Qué comentarios tenemos?"
    - "¿Tiene acciones pendientes?"

  mandatory_audit:
    - "top client by homogeneous volume"
    - "canonical cliente_key"
    - "last 3 month period semantics"
    - "monthly sales"
    - "monthly discount/kg"
    - "monthly income"
    - "period alignment"
    - "comments"
    - "DICF"
    - "actions"
    - "null != zero"
    - "no name-only joins"

  key_question: >
    Are the necessary facts already available but not composed into a
    longitudinal client read model?

production_case_3_taller_mayor_units:

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

  mandatory_audit:
    - "physical definition of Taller Mayor"
    - "folio categoria/subcategoria"
    - "unit id / unidad / economico linkage"
    - "same plant"
    - "same current month"
    - "amount"
    - "status"
    - "concept/detail"
    - "reviewability"
    - "history per unit if available"

  key_question: >
    Is unidad-level Folio evidence already physically available to chat?

production_case_4_authenticated_greeting:

  canonical_turn: "Hola"

  desired_example: >
    “Hola, Ing. Zaragoza. ¿En qué le puedo ayudar hoy?”

  mandatory_audit:
    - "authenticated user information reaching POST /chat"
    - "user id"
    - "name"
    - "role"
    - "title/salutation if physically stored"
    - "smalltalk handling"
    - "whether chat currently discards authenticated identity"

  rule: >
    Personalization must come from current authenticated identity, never model
    memory or hardcoded names.

  prohibited:
    - "inventing Ing./Lic./Dr."
    - "hardcoding user"
    - "cross-user identity"

production_case_5_SEH_directory:

  canonical_question: >
    ¿Quién es el responsable de Seguridad e Higiene en Puebla?

  followups:
    - "¿Cuál es su teléfono?"
    - "¿Y su correo?"
    - "¿Tiene acciones pendientes?"
    - "¿Qué sabemos de él?"

  semantic_aliases:
    - "SEH"
    - "Seguridad e Higiene"

  mandatory_audit:
    - "physical table/source"
    - "function/area field"
    - "plant"
    - "current responsible"
    - "name"
    - "phone"
    - "email"
    - "role/currentness"
    - "authz/privacy"
    - "person entity continuity"

  key_question: >
    Is there already an organizational directory in DB that Director IA simply
    cannot query, or is the physical data missing?

production_case_6_closed_month_IGF_semantics:

  canonical_question: >
    ¿Cuál es la proyección final del IGF de Puebla de mayo pasado?

  expected_behavior: >
    Detect that May is closed and distinguish actual closed result from a
    current open-month forecast.

  followups:
    - "¿Entonces cómo cerró mayo realmente?"
    - "¿Qué proyectábamos durante mayo?"
    - "Compáralo con lo que terminó pasando."

  mandatory_audit:
    - "period open/closed detection"
    - "current date semantics"
    - "actual closed IGF"
    - "latest version semantics"
    - "historical forecast snapshots"
    - "whether forecast history is physically stored"

  invariant: >
    Historical forecast must not be reconstructed from final actual data.

production_case_7_daily_brief_regression:

  conversation:
    - "¿Cómo nos fue ayer?"
    - "¿Qué te llama la atención?"
    - "¿Y la venta?"
    - "¿Y el descuento?"
    - "¿Qué sigue sin explicación?"

  expected:
    - "daily_executive_brief"
    - "fresh sales"
    - "fresh discount"
    - "same active_date"
    - "GPT synthesis"

  purpose: >
    Ensure the last product bottleneck remains fixed.

trace_each_case:

  required:
    - "isolated planner intent"
    - "effective intent"
    - "coverage guard"
    - "parent_intent"
    - "conversation state"
    - "plant"
    - "period/range"
    - "channel"
    - "entity/unit/person"
    - "physical sources"
    - "sources actually loaded"
    - "fresh requery"
    - "evidence delivered to GPT"
    - "limitations"
    - "GPT invoked"
    - "deterministic early return"
    - "exact failure point"

chart_parity_audit:

  applies_to: "production_case_1_commercial_trend_1m_3m"

  requirement: >
    Do not merely inspect chat code. Trace the backend/source powering the
    dashboard charts shown by the user and compare it with Director IA sources.

  determine:
    - "chart endpoint/helper"
    - "SQL/source tables"
    - "channel field"
    - "trend computation"
    - "top client delta computation"
    - "comments/evidence source"
    - "whether same logic can be reused without internal HTTP"

  principle: >
    If dashboard already computes the truth, prefer reuse of its engine/helpers
    over parallel calculations.

trend_semantics:

  mandatory:
    - "define exactly what 'subió/bajó' means"
    - "avoid first-point vs last-point shortcut if chart uses regression/trend"
    - "preserve range size"
    - "preserve channel filter"
    - "declare comparison/range"

  acceptable_outputs_if_physical:
    - "trend slope/direction"
    - "period total"
    - "period average"
    - "largest client movers"
    - "notable recovery/decline segments"

  prohibited:
    - "causal claim from trend"
    - "claiming trend based on visual appearance only"

production_value_selection:

  dimensions:
    - "frequency in real use"
    - "executive usefulness"
    - "transversal unlock"
    - "data readiness"
    - "conversational benefit"

  priority_rule: >
    Select exactly one bottleneck by real production impact, not implementation
    convenience.

known_deferred_not_to_assume_as_winner:
  - "1M/3M trend"
  - "longitudinal client"
  - "Taller Mayor"
  - "personalized greeting"
  - "SEH"
  - "closed-month IGF"

  rule: >
    All must compete. Do not select the newest user request automatically.

information_gap_standard:

  when_answer_unavailable:
    required:
      - "what is known"
      - "what is not known"
      - "specific missing data/read model"
      - "why it matters"
      - "physical source if found"
      - "what fixing it unlocks"

phrasebook_policy:
  invariant: >
    User production questions are canonical semantic tests, not phrases to add
    literally to routing.

  required:
    - "semantic variants"
    - "holdout wording"
    - "inspect production code for phrase hardcoding"

answerability_classification:
  values:
    - "WORKS_NOW"
    - "PARTIALLY_WORKS"
    - "ROUTING_GAP"
    - "MISSING_READ_MODEL"
    - "MISSING_PHYSICAL_DATA"
    - "OVERPROGRAMMING"
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
    - "production cases affected"
    - "physical location/source"
    - "evidence"
    - "why this is the largest next blocker"
    - "what fixing it unlocks"
    - "what it does not solve"

  selection_rule: >
    Choose a product bottleneck, not a list of missing features.

next_task:

  exactly_one: true
  authorize: false
  execute: false

  rule: >
    NEXT_TASK must directly investigate or solve the selected single bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:

  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "schema"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "1M/3M CASA/COMISIONISTA trend audited against real chart source."
  - "Longitudinal client case audited."
  - "Taller Mayor by unit audited."
  - "Authenticated greeting audited."
  - "SEH directory audited."
  - "Closed-month IGF semantics audited."
  - "Daily executive brief regression validated."
  - "Semantic holdouts considered."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009.md