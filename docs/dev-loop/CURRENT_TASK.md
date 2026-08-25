# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001
  conforme a ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: REQUIRED
  G8_calibration_materiality_signature: N/A

mode:
  type: "IMPLEMENTATION"
  contract_change: false
  schema_change: false
  sql_execution: false
  mutations: false
  plaud_integration: false

objective: >
  Implementar pre_meeting_brief como un read model estructurado, read-only,
  para una planta y mes abierto CDMX, componiendo capacidades ya existentes
  sin duplicar su lógica de negocio.

  First slice:
  comercial + IGF abierto + acciones + apoyos reviewable + information gaps.

  Runtime alinea contexto y evidencia; GPT realiza una única síntesis ejecutiva.

baseline:
  global: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

architecture:
  selected: "B — structured pre-meeting read model"
  materiality: "B — existing deterministic signals + GPT"
  intent: "pre_meeting_brief"

scope:
  plant: "exactly one authorized plant"
  meeting_type: "executive/month-close preparation"
  period: "current open month CDMX"

first_slice:
  commercial:
    reuse_existing:
      - "daily_executive_brief"
      - "commercial_trend where required by architecture"

  financial:
    reuse_existing:
      - "current/open-month IGF"

  actions:
    reuse_existing:
      - "existing Action Register read paths"

  supports:
    reuse_existing:
      - "IGF reviewable supports"

  information_gaps:
    required: true

excluded_from_first_slice:
  - "Taller Mayor"
  - "Mejora Continua"
  - "Plaud"
  - "closed-month IGF"
  - "SEH directory"
  - "actual client income"
  - "automatic notifications"

composition:
  requirements:
    - "reuse existing loaders/helpers"
    - "no internal HTTP"
    - "no duplicated SQL/business formulas"
    - "fresh load per source"
    - "same authorized plant"
    - "preserve each source native grain"
    - "safeLoad/isolation per source"
    - "separate provenance"
    - "separate limitations/gaps"
    - "one final GPT synthesis"

  prohibited:
    - "raw database dump to GPT"
    - "silent reconciliation of conflicting sources"
    - "persisted meeting snapshot"
    - "giant stale context stored in conversation state"

read_model:
  identity:
    - "plant"
    - "meeting_period"
    - "meeting_type"
    - "generated_at"

  sections:
    commercial:
      includes:
        - "supported current performance signals"
        - "supported deviations"
        - "supported trend/movers where loaded"
        - "limitations"
        - "provenance"

    IGF:
      includes:
        - "open-month projection/status"
        - "supported financial pressure/buckets"
        - "limitations"
        - "provenance"

    actions:
      includes:
        - "open actions"
        - "overdue actions where physically supported"
        - "responsible/status"
        - "missing closure/result where applicable"
        - "limitations"
        - "provenance"

    reviewable_supports:
      includes:
        - "reviewable Folios"
        - "not-cancellable distinction where needed"
        - "counts/totals"
        - "limitations"
        - "provenance"

    information_gaps:
      includes:
        - "supported missing explanations"
        - "open commitments without recorded result"
        - "material movement lacking current contextual evidence"
        - "reviewable support lacking supported business context"

information_gap_semantics:
  rule: >
    A gap states that supporting/contextual evidence is absent from the loaded
    evidence. It does not infer the missing explanation.

  safe:
    - "No encuentro evidencia cargada que explique este movimiento."
    - "No hay resultado de cierre registrado en la evidencia disponible."
    - "Conviene obtener contexto antes de la junta."

  prohibited:
    - "invent cause"
    - "invent responsible"
    - "convert comment into verified cause"
    - "convert absence into negative fact"

materiality:
  runtime:
    may_expose:
      - "existing deviations"
      - "existing rankings"
      - "existing statuses"
      - "existing overdue signals"
      - "existing reviewability"
      - "information gaps"

  GPT:
    decides:
      - "what deserves executive emphasis"
      - "ordering of topics"
      - "concise synthesis"
      - "what should be clarified before meeting"

  prohibited:
    - "new arbitrary hardcoded materiality thresholds"
    - "learned meeting score"
    - "fixed checklist determining truth"

question_anticipation:
  allowed:
    - "Conviene estar preparado para explicar..."
    - "Este punto merece revisión antes de la junta."
    - "Falta evidencia para responder con seguridad a..."

  prohibited:
    - "El Consejo va a preguntar..."
    - "Sé que te preguntarán..."

proactive_boundary:
  allowed: >
    Recommend obtaining a comment/update/context before the meeting.

  prohibited:
    - "send message"
    - "write comment"
    - "create action"
    - "edit action"
    - "cancel Folio"
    - "notify external user"

read_only:
  absolute: true

partial_data:
  rule: >
    Failure/missing evidence in one source must not destroy supported sections.

  requirements:
    - "partial brief allowed"
    - "source error remains explicit"
    - "missing != zero"
    - "unsupported remains unsupported"
    - "source failure != business finding"

conversation_state:
  store_only:
    - "plant"
    - "meeting_period"
    - "meeting_type"
    - "parent_intent=pre_meeting_brief"

  do_not_store:
    - "full meeting pack as truth"
    - "raw evidence"

  evidence_policy: "fresh requery"

followup_handoffs:
  examples:
    "¿Qué me preocupa más?": "pre_meeting_brief synthesis"
    "¿Qué falta explicar?": "pre_meeting_brief gaps"
    "¿Qué acciones están vencidas?": "canonical action capability"
    "¿Qué apoyos puedo revisar?": "IGF reviewable supports"
    "Háblame del cliente X.": "client_profile"
    "¿Cómo vamos en CASA?": "commercial_trend"
    "¿Qué unidades tienen Taller Mayor?": "taller_mayor"

  invariant: >
    Detailed follow-ups use canonical domain capabilities and fresh evidence.

routing:
  intent: "pre_meeting_brief"

  requirements:
    - "semantic detection"
    - "no phrasebook"
    - "do not overload plant_diagnosis"
    - "explicit plant wins"
    - "authorized active plant may be reused where existing policy permits"

  examples_are_tests_not_rules:
    - "Prepárame para la junta de cierre."
    - "¿Qué debo llevar preparado para la junta?"
    - "Dame un pre-cierre ejecutivo."
    - "¿Qué debería revisar antes de entrar?"
    - "¿Qué huecos tenemos antes de la junta?"

temporal:
  first_slice: "current/open month CDMX"

  prohibited:
    - "silently answer closed-month request with open-month semantics"
    - "invent historical forecast"

  behavior_if_closed_month_requested: >
    Preserve existing truthful limitation/routing semantics; do not expand this
    implementation into the closed-month IGF gap.

authz:
  preserve:
    - "existing plant authorization"
    - "same-plant restrictions"
    - "fail closed"

Plaud:
  runtime_integration: false
  historical_evaluation: "future task only"

reasoning_boundary:
  runtime:
    - "plant"
    - "period"
    - "source loading"
    - "source isolation"
    - "existing calculations/signals"
    - "provenance"
    - "limitations"
    - "absence/error semantics"
    - "authz"

  GPT:
    - "executive synthesis"
    - "priority narrative"
    - "tensions"
    - "preparation suggestions"
    - "information-gap presentation"

  prohibited:
    - "inventing evidence"
    - "causal claims unsupported by evidence"
    - "turning reviewable into savings"
    - "turning projection into actual"
    - "turning comments into verified cause"

regressions:
  preserve:
    - "daily_executive_brief"
    - "daily_sales_deviation"
    - "daily_discount_deviation"
    - "commercial_trend"
    - "client_profile"
    - "action-person/action status"
    - "IGF"
    - "IGF reviewable supports"
    - "taller_mayor"
    - "topic return"
    - "persistent memory"
    - "folio_status"
    - "taller_at"

tests_required:
  focal:
    - "semantic pre-meeting routing"
    - "one plant"
    - "current open month"
    - "commercial section"
    - "IGF section"
    - "actions section"
    - "reviewable supports section"
    - "information gaps"
    - "partial source failure"
    - "missing != zero"
    - "source errors isolated"
    - "one final GPT synthesis"
    - "follow-up action handoff"
    - "follow-up supports handoff"
    - "follow-up client handoff"
    - "follow-up commercial trend handoff"
    - "follow-up Taller Mayor handoff"
    - "fresh requery"
    - "no phrasebook"
    - "no mutation"
    - "authz"

  mandatory:
    - "focal tests"
    - "planner"
    - "capabilities"
    - "tool orchestrator"
    - "full Director IA suite"
    - "git diff --check"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
    - "lib/** only where required"
    - "test/** only where required"

  read_only:
    - "architecture/contracts"
    - "database schema"

out_of_scope:
  - "Plaud integration"
  - "Plaud ingestion"
  - "Taller Mayor inside first brief"
  - "Mejora Continua inside first brief"
  - "closed-month IGF fix"
  - "SEH"
  - "actual client income"
  - "automatic messages"
  - "writes"
  - "new materiality thresholds"
  - "meeting snapshot persistence"
  - "schema"
  - "SQL execution"
  - "contracts"
  - "matrix changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "pre_meeting_brief implemented."
  - "Architecture B preserved."
  - "First slice B preserved."
  - "One plant enforced."
  - "Current open month semantics enforced."
  - "Existing loaders reused."
  - "No internal HTTP."
  - "No duplicated business truth."
  - "Commercial/IGF/actions/reviewable sections composed."
  - "Information gaps explicit."
  - "No invented explanations."
  - "Partial source failure supported."
  - "One final GPT synthesis."
  - "Follow-ups hand off to canonical capabilities."
  - "Fresh requery preserved."
  - "Read-only invariant preserved."
  - "No Plaud runtime integration."
  - "No phrasebook."
  - "Required regressions green."
  - "52.5% preserved."
  - "git diff --check clean."

next_task:
  propose_exactly_one_if_success:
    "DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001"

  rule: "Do not authorize or execute."

expected_terminal_state: "DONE_PENDING_REVIEW"
max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md