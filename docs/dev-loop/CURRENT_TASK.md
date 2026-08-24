# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008
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
  test_changes: false
  runtime_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Auditar Director IA usando preguntas reales que se espera recibir en
  producción, formuladas por intención y no por wording exacto. Determinar
  exactamente un cuello de botella actual que más impida sentir que Director IA
  conoce los datos, entiende el contexto, conserva el hilo y responde
  honestamente qué sabe y qué falta.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

north_star: >
  El usuario puede preguntar como hablaría naturalmente con un director:
  “cómo nos fue”, “quién es el cliente más grande”, “qué sabemos de él”,
  “qué unidades tienen apoyos”, “quién lleva SEH”, etc. Director IA debe
  resolver intención, fuentes, periodo, planta y entidad sin requerir que el
  usuario conozca previamente los números ni los nombres de los módulos.

method:
  sequence:
    - "ask production question"
    - "trace runtime"
    - "verify physical source"
    - "verify answerability"
    - "identify failure"
    - "classify failure"
    - "select exactly one bottleneck"

  rule: >
    No elegir una tarea por backlog. La batería debe demostrar el cuello.

production_case_1_daily_executive_brief:

  canonical_question: "¿Cómo nos fue ayer?"

  semantic_variants:
    - "¿Qué tal nos fue ayer?"
    - "Dame el resumen de ayer."
    - "¿Qué pasó ayer?"
    - "¿Cómo cerramos ayer?"
    - "¿Algo importante de ayer?"

  intent_under_test: "daily executive brief"

  desired_behavior:
    - "infer plant from request/authz"
    - "resolve yesterday in America/Mexico_City"
    - "do not assume sales went down/up"
    - "inspect supported daily metrics"
    - "surface material deviations"
    - "sales direction"
    - "discount/kg direction"
    - "income if physically available daily"
    - "top contributors when defensible"
    - "what is explained vs unexplained"
    - "GPT executive synthesis"

  key_question: >
    Can Director IA discover what matters yesterday without the user first
    naming sales or discount?

  prohibited:
    - "hardcode exact phrase"
    - "always claim a problem"
    - "invent daily income if unavailable"
    - "merge contribution with causality"

production_case_2_longitudinal_top_client:

  canonical_question: >
    ¿Qué cliente de Puebla es el de mayor volumen, qué descuento tiene y tuvo
    en los meses pasados, cuánto nos compró por mes en los últimos 3 meses,
    qué descuento tenía, cuánto fue el ingreso por mes, subió o bajó y qué
    sabemos de él?

  semantic_intents:
    - "top client by volume"
    - "three-month longitudinal profile"
    - "volume by month"
    - "discount/kg by month"
    - "income by month"
    - "trend"
    - "comments/actions/DICF"
    - "what we know / do not know"

  mandatory_audit:
    - "canonical cliente_key"
    - "top client selection by homogeneous volume"
    - "last 3 completed/relevant months semantics"
    - "monthly sales source"
    - "monthly discount source"
    - "monthly income source"
    - "period alignment"
    - "comments"
    - "DICF/actions"
    - "avoid name joins"
    - "null != 0"

  key_question: >
    Does a longitudinal executive client pack already exist, can existing
    packs be safely composed, or is physical infrastructure missing?

  truth_boundary:
    - "discount up + volume up != discount caused volume growth"
    - "comments != proven cause"
    - "actions != outcome"

production_case_3_taller_mayor_units:

  canonical_question: >
    ¿Qué unidades de Puebla tienen apoyos (folios) para este mes de Taller Mayor
    y dame detalles?

  semantic_variants:
    - "¿Qué carros de Puebla traen apoyos de taller mayor este mes?"
    - "Enséñame las unidades con folios de reparación mayor."
    - "¿Qué unidades tienen gastos fuertes de taller?"

  mandatory_audit:
    - "what physically means Taller Mayor"
    - "folio category/subcategory"
    - "unidad linkage"
    - "same plant"
    - "same current month"
    - "folio status"
    - "amount"
    - "concept/details"
    - "reviewability if available"
    - "unit history if physically linked"

  key_question: >
    Can Director IA reach Folios grouped/details by unit without inventing the
    relationship between Taller, Folio and unit?

production_case_4_personalized_identity:

  canonical_turn: "Hola"

  desired_behavior: >
    Personalize greeting using the authenticated/current user identity from the
    system, e.g. “Hola, Ing. Zaragoza. ¿En qué le puedo ayudar hoy?”, only if
    name/title are physically available and authorized.

  audit:
    - "what user identity reaches POST /chat"
    - "dashboard token/session"
    - "usuario id/name/role"
    - "whether chat currently receives it"
    - "whether salutation/title exists physically"
    - "smalltalk path"

  prohibited:
    - "hardcoded user name"
    - "model memory as identity source"
    - "guess professional title"

production_case_5_SEH_directory:

  canonical_question: >
    ¿Quién es el responsable de Seguridad e Higiene en Puebla?

  followups:
    - "¿Cuál es su teléfono?"
    - "¿Y su correo?"
    - "¿Tiene acciones pendientes?"
    - "¿Qué sabemos de él?"

  semantic_variants:
    - "¿Quién lleva SEH en Puebla?"
    - "¿Quién es el responsable de Seguridad e Higiene?"
    - "Dame el contacto de SEH Puebla."

  mandatory_audit:
    - "source table/model for organizational responsibility"
    - "area/function semantics: SEH / Seguridad e Higiene"
    - "plant"
    - "active/current responsible"
    - "name"
    - "phone"
    - "email if available"
    - "authz/privacy"
    - "entity continuity for followups"

  key_question: >
    Does a physical organizational directory already exist, or is this data
    unavailable to Director IA?

production_case_6_temporal_IGF_coherence:

  canonical_question: >
    ¿Cuál es la proyección del estado de resultados IGF final de Puebla de mayo pasado?

  expected_reasoning: >
    If May is already closed, Director IA must not silently present a current
    forecast as if May were still open. It should distinguish closed-month
    actual from current-month projection.

  followups:
    - "¿Entonces cómo cerró mayo realmente?"
    - "¿Qué proyectábamos durante mayo?"

  mandatory_audit:
    - "current open month detection"
    - "past closed month detection"
    - "actual result availability"
    - "historical forecast storage availability"
    - "whether current igf_status differentiates semantics"

  prohibited:
    - "reconstruct historical forecast from final numbers"

production_case_7_IGF_reviewable_supports_regression:

  conversation:
    - "¿Cómo proyectamos cerrar Puebla este mes?"
    - "¿Qué podemos recortar de apoyos?"
    - "¿Cuáles todavía podemos detener?"
    - "Si esos dejaran de entrar, ¿cómo quedaría el IGF?"

  purpose: >
    Confirm the newly integrated IGF -> reviewable supports capability remains
    functional and is not selected again unless regression exists.

previous_fixes_to_verify:
  - "daily sales"
  - "daily discount"
  - "daily cross-metric followup"
  - "natural followup strategy B"
  - "intra-session previous_frame"
  - "action-person routing"
  - "IGF reviewable supports"
  - "persistent pending memory in repo"

trace_each_case:
  required:
    - "isolated planner intent"
    - "effective intent"
    - "coverage guard"
    - "parent intent"
    - "conversation state"
    - "plant"
    - "period"
    - "entity"
    - "sources available"
    - "sources actually loaded"
    - "fresh requery"
    - "evidence supplied to GPT"
    - "limitations"
    - "GPT invoked"
    - "deterministic early return"
    - "physical missing data"
    - "failure point"

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
    - "DEPLOYMENT_GAP"

production_value_scoring:

  dimensions:
    frequency: >
      How likely a real executive is to ask this naturally.

    executive_value: >
      Whether the answer materially improves awareness/decision-making.

    transversal_unlock: >
      Whether fixing it improves many future questions, not only one wording.

    data_readiness: >
      Whether physical data already exists.

  rule: >
    Use scoring only to justify bottleneck selection, not to create a permanent
    product metric or automatic roadmap.

information_gap_standard:

  desired_when_data_missing:
    - "what Director IA knows"
    - "what it cannot establish"
    - "specific missing datum"
    - "why it matters"
    - "physical source/person if known"
    - "what becomes answerable after obtaining it"

  rule: >
    Missing data can still produce a good conversational answer. Do not classify
    every unavailable conclusion as product failure.

phrasebook_policy:
  absolute: >
    Canonical production questions are TEST INTENTS, not production phrases.

  required:
    - "test semantic variants"
    - "holdout wording"
    - "inspect lib/ for accidental phrase hardcoding"

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "identity"
    - "plant"
    - "period"
    - "dates"
    - "metric math"
    - "entity keys"
    - "joins"
    - "authz"
    - "provenance"
    - "absence/error"

  LET_GPT_REASON:
    - "executive synthesis"
    - "what stands out"
    - "trend explanation with caveats"
    - "what is missing"
    - "follow-up wording"

  principle: >
    Build evidence structures, not scripted executive answers.

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
    - "production_case(s) affected"
    - "physical location/source gap"
    - "why largest now"
    - "what fixing unlocks"
    - "what it does not solve"

  selection_rule: >
    Select the next bottleneck by real production usefulness and transversal
    conversational impact, not by ease or module percentage.

next_task:
  exactly_one: true
  authorize: false
  execute: false

  rule: >
    Proposed NEXT_TASK must directly attack the demonstrated single bottleneck.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "new schemas"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "All seven production cases audited."
  - "Daily executive brief audited."
  - "Longitudinal client profile audited."
  - "Taller Mayor by unit audited."
  - "Authenticated greeting audited."
  - "SEH directory audited."
  - "Closed-month IGF semantics audited."
  - "IGF reviewable supports regression checked."
  - "Semantic variants/holdouts considered."
  - "Exactly one bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008.md