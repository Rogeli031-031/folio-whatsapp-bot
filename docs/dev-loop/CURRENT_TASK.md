# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001
  conforme a ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.

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

objective: >
  Implementar el read model y routing conversacional de Taller Mayor por unidad,
  usando la verdad física existente de public.folios, preservando planta,
  periodo, unidad y Folio activo durante follow-ups.

baseline:
  global: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

architecture_decisions:
  source: "B — reusable Taller Mayor unit read model"
  routing: "B — canonical taller_mayor parent"
  intent: "taller_mayor"

identity:
  canonical_unit: "(planta_id, canonical public.folios.unidad token)"
  restrictions:
    - "same plant mandatory"
    - "no fuzzy"
    - "no cross-plant unit merge"
    - "do not call unidad económico or placa"
    - "no invented unit master"

classification:
  field: "public.folios.subcategoria"
  value: "REPARACIÓN MAYOR"
  runtime_helper: "matchTallerTipoCol"
  prohibited:
    - "classification by importe"
    - "classification by concepto"

period:
  current_month: "current CDMX YYYY-MM"
  physical_field: "mes_cargo"

required_read_model:
  output:
    - "canonical unit token"
    - "plant"
    - "period"
    - "folio count"
    - "SUM(importe)"
    - "individual Folio references"
    - "individual importe"
    - "estatus"
    - "concepto"
    - "subcategoria"
    - "reviewability when applicable"
    - "provenance"
    - "limitations"

ranking:
  after_unit_list:
    "el más alto": "unit with greatest SUM(importe)"

  invariant: >
    If selected unit contains multiple matching Folios, do not silently select
    one Folio.

conversation_state:
  required:
    - "active_unit"
    - "active_folio when uniquely/explicitly selected"
    - "plant"
    - "active_period"
    - "parent_intent=taller_mayor"

  invariant: "routing identifiers only; no stale raw evidence"
  requery: true

required_conversation:
  - "¿Qué unidades de Puebla tienen apoyos de Taller Mayor este mes?"
  - "¿Cuál tiene el importe más alto?"
  - "Háblame de esa unidad."
  - "¿Qué reparación le están haciendo?"
  - "¿Qué Folio es?"
  - "¿En qué estatus está?"
  - "¿Todavía se puede detener?"
  - "¿Qué otros Folios ha tenido esa unidad?"
  - "¿Cuánto llevamos en reparaciones de esa unidad?"

folio_selection:
  rule: >
    A unique active Folio may be selected only when evidence/context uniquely
    identifies it or the user explicitly selects it.

  multiple_folios: >
    Preserve the set and ask/answer at unit level as appropriate. Do not silently
    choose one.

reviewability:
  helper: "classifyCancellationEligibility"

  precedence: >
    If active_folio exists, “¿Todavía se puede detener?” evaluates that selected
    Folio. It must not route to plant-wide IGF reviewable supports.

  invariants:
    - "reviewable != cancel"
    - "reviewable != recommendation"
    - "reviewable != savings"
    - "reviewable != accounting reversal"
    - "Director IA remains read-only"

history:
  same_identity: "(same planta_id, same canonical unidad token)"

  default_scope: >
    Preserve Taller Mayor thread semantics and active period unless explicit
    wording requests broader history.

  expansion:
    examples:
      - "histórico"
      - "todos sus folios"
      - "en total"

  rule: "expand only when explicitly requested"

cross_domain:
  hypothetical_igf:
    requirement: >
      If active_folio exists and user asks how IGF would change if it did not
      enter, preserve selected Folio/unit and reuse existing hypothetical IGF
      semantics where physically supported.

    restrictions:
      - "no mutation"
      - "no realized savings claim"
      - "do not replace selected Folio with plant-wide candidates"

reasoning_boundary:
  runtime:
    - "identity"
    - "classification"
    - "period"
    - "amount math"
    - "status"
    - "reviewability"
    - "history retrieval"
    - "authorization"
    - "provenance"
    - "absence/error"

  gpt:
    - "executive synthesis"
    - "summarization"
    - "what stands out"
    - "what to investigate"

  prohibited:
    - "mechanical diagnosis without evidence"
    - "causal inference from concepto"
    - "recommend cancellation because amount is high"
    - "savings claims from reviewability"

partial_data:
  rule: "return supported facts + limitations; missing != zero"

authz:
  preserve:
    - "existing plant authorization"
    - "same-plant restrictions"
    - "fail closed"

no_phrasebook:
  required: true

regressions:
  preserve:
    - "generic folio_status"
    - "taller_at"
    - "IGF reviewable plant-wide query"
    - "client_profile"
    - "commercial_trend"
    - "daily_executive_brief"
    - "daily_sales_deviation"
    - "daily_discount_deviation"
    - "topic return"
    - "persistent memory"

tests_required:
  focal:
    - "list units current month"
    - "ranking by SUM importe"
    - "unit selection"
    - "multiple Folios no silent pick"
    - "details"
    - "status"
    - "selected Folio reviewability"
    - "plant-wide IGF reviewable regression"
    - "history"
    - "period inheritance"
    - "same-plant identity"
    - "cross-plant fail closed"
    - "hold-out wording"
    - "missing data"
    - "no phrasebook"

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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
    - "lib/** only where required"
    - "test/** only where required"

  read_only:
    - "architecture/contracts"
    - "database schema"

out_of_scope:
  - "schema changes"
  - "SQL execution"
  - "unit master"
  - "predictive maintenance"
  - "mechanical diagnosis"
  - "Taller mutations"
  - "Folio cancellation"
  - "new accounting semantics"
  - "documentation sync"
  - "capability matrix changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "taller_mayor parent works semantically"
  - "same plant enforced"
  - "current CDMX YYYY-MM uses mes_cargo"
  - "REPARACIÓN MAYOR comes from canonical subcategoria"
  - "unit list grouped correctly"
  - "SUM importe ranking correct"
  - "multiple Folios never silently collapse"
  - "active_unit works"
  - "active_folio works when uniquely selected"
  - "selected-Folio reviewability works"
  - "reviewability does not jump to plant-wide IGF"
  - "history preserves identity"
  - "requery fresh evidence"
  - "no phrasebook"
  - "no invented identity"
  - "no savings claim"
  - "all required regressions green"
  - "52.5% preserved"
  - "git diff --check clean"

next_task:
  propose_exactly_one_if_success:
    "DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001"

  rule: "Do not authorize or execute."

expected_terminal_state: "DONE_PENDING_REVIEW"
max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md