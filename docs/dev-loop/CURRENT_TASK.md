# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001
  y autorizo G1 exclusivamente para sincronización documental.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "DOCUMENTATION_SYNC_ONLY"
  implementation: false
  code_changes: false
  test_changes: false
  runtime_changes: false
  contract_changes: false
  sql_execution: false
  plaud_integration: false

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  pre_meeting_brief, sin modificar comportamiento.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

conversation_readiness:
  status: "CONVERSATION_BASE_READY_WITH_LIMITS"

implemented_capability:
  intent: "pre_meeting_brief"
  architecture: "B — structured pre-meeting read model"
  first_slice: "B — core executive"
  scope: "one authorized plant + current/open CDMX month"
  synthesis: "one final GPT synthesis"

composition:
  includes:
    - "commercial"
    - "open-month IGF"
    - "actions"
    - "IGF reviewable supports"
    - "information gaps"

  excludes:
    - "Taller Mayor from the initial brief"
    - "Mejora Continua from the initial brief"
    - "Plaud"
    - "closed-month IGF"
    - "SEH"
    - "actual client income"

runtime_semantics:
  requirements:
    - "reuse existing loaders/helpers"
    - "fresh evidence"
    - "per-source isolation"
    - "per-source provenance"
    - "per-source limitations/gaps"
    - "partial brief allowed"
    - "missing != zero"
    - "source error != business finding"
    - "unsupported remains unsupported"
    - "read-only"

information_gaps:
  critical_output: true

  semantics: >
    A gap means explanatory/contextual evidence is absent from the loaded
    evidence. It is not itself an explanation or causal conclusion.

  safe_examples:
    - "No encuentro evidencia cargada que explique este movimiento."
    - "No hay resultado de cierre registrado."
    - "Conviene obtener contexto antes de la junta."

  prohibited:
    - "invent cause"
    - "invent result"
    - "invent responsible"
    - "convert comment into verified cause"

materiality:
  strategy: "existing deterministic signals + GPT"

  runtime_exposes:
    - "deviations"
    - "rankings"
    - "statuses"
    - "overdue signals"
    - "reviewability"
    - "information gaps"

  GPT:
    - "prioritizes"
    - "orders"
    - "synthesizes"
    - "suggests what should be clarified"

  prohibited:
    - "new arbitrary thresholds"
    - "learned meeting score"
    - "fixed checklist as truth"

question_anticipation:
  allowed: >
    State that a topic deserves preparation or lacks enough evidence.

  prohibited: >
    Claim certainty about what the Consejo/directivos will ask.

read_only:
  absolute: true

  no_writes:
    - "messages"
    - "comments"
    - "actions"
    - "Folios"
    - "IGF"
    - "meeting snapshots"

conversation_state:
  stores:
    - "plant"
    - "meeting_period"
    - "meeting_type"
    - "parent_intent=pre_meeting_brief"

  does_not_store:
    - "full pack as conversational truth"
    - "raw evidence"

  evidence_policy: "fresh requery"

followups:
  inherit_brief:
    - "¿Qué me preocupa más?"
    - "¿Qué falta explicar?"

  handoff_to_canonical_capability:
    actions: "action capability"
    reviewable_supports: "IGF reviewable supports"
    client: "client_profile"
    commercial: "commercial_trend"
    taller_mayor: "taller_mayor"

  invariant: >
    Detailed domain questions leave pre_meeting_brief and requery the canonical
    capability.

temporal:
  first_slice: "current/open CDMX month"
  closed_month: "not implemented by this capability"

Plaud:
  runtime_integration: false

  future_role: >
    Historical month-close meetings may be used as evaluation evidence to
    compare the pre-meeting brief against questions and issues that actually
    arose.

  truth_boundary: >
    Statements made in meetings are declarations, not automatically verified
    causal facts.

test_evidence:
  focal: "14/14"
  director_ia_suite: "978/978"
  planner: "58/58"
  capabilities: "56/56"
  orchestrator: "28/28"
  git_diff_check: "clean"

percentage:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

contracts:
  frozen_architecture: "unchanged"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "schema"
  - "matrix changes"
  - "Plaud ingestion"
  - "new production conversation GAP"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "pre_meeting_brief documented."
  - "Architecture B documented."
  - "First slice B documented."
  - "One-plant/open-month scope documented."
  - "Five composed sections documented."
  - "Information-gap semantics documented."
  - "Partial-source behavior documented."
  - "Materiality boundary documented."
  - "Read-only invariant documented."
  - "Follow-up handoffs documented."
  - "Fresh requery documented."
  - "Plaud explicitly excluded from runtime."
  - "CONVERSATION_BASE_READY_WITH_LIMITS preserved."
  - "14/14 and 978/978 evidence recorded."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_exactly_one_if_success:
    "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"
max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001.md