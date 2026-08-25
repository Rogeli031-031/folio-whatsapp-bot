# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001
  y autorizo G1.

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

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  Taller Mayor por unidad: intent taller_mayor, identidad compuesta por planta
  + token canónico de public.folios.unidad, agrupación por unidad, ranking por
  SUM(importe), selección segura de Folio, reviewability del Folio activo e
  historial conversacional read-only.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "taller_mayor"
  source_strategy: "B — reusable Taller Mayor unit read model"
  routing_strategy: "B — canonical taller_mayor parent"

identity:
  canonical_unit: "(planta_id, canonical token de public.folios.unidad)"

  invariants:
    - "same plant mandatory"
    - "no fuzzy"
    - "no cross-plant merge"
    - "unidad no se documenta como económico"
    - "unidad no se documenta como placa"
    - "no existe unit master"

classification:
  source: "public.folios.subcategoria"
  value: "REPARACIÓN MAYOR"
  helper: "matchTallerTipoCol"

  prohibited:
    - "inferir por importe"
    - "inferir por concepto"

period:
  canonical: "este mes"
  semantics: "YYYY-MM actual CDMX"
  source_field: "mes_cargo"

read_model:
  grouped_by_unit:
    includes:
      - "unit token"
      - "plant"
      - "period"
      - "folio_count"
      - "SUM(importe)"
      - "folio refs"
      - "individual amounts"
      - "status"
      - "concept"
      - "subcategoria"
      - "reviewability when applicable"
      - "provenance"
      - "limitations"

ranking:
  question: "¿Cuál tiene el importe más alto?"
  semantics: "unidad con mayor SUM(importe)"

  multi_folio_rule: >
    Si la unidad tiene varios Folios, active_unit puede quedar seleccionado,
    pero active_folio no se elige en silencio.

conversation_state:
  stores:
    - "active_unit"
    - "active_folio when uniquely/explicitly selected"
    - "plant"
    - "active_period"
    - "parent_intent=taller_mayor"

  evidence_policy: "fresh requery"
  invariant: "state = routing identifiers, no raw evidence"

conversation:
  canonical:
    - "¿Qué unidades de Puebla tienen apoyos de Taller Mayor este mes?"
    - "¿Cuál tiene el importe más alto?"
    - "Háblame de esa unidad."
    - "¿Qué reparación le están haciendo?"
    - "¿Qué Folio es?"
    - "¿En qué estatus está?"
    - "¿Todavía se puede detener?"
    - "¿Qué otros Folios ha tenido esa unidad?"
    - "¿Cuánto llevamos en reparaciones de esa unidad?"

reviewability:
  helper: "classifyCancellationEligibility"

  selected_folio_behavior: >
    Con active_folio, “¿Todavía se puede detener?” evalúa ese Folio específico.

  regression_fixed: >
    No salta a IGF reviewable plant-wide cuando hay Folio activo.

  invariants:
    - "reviewable != cancelar"
    - "reviewable != recomendación"
    - "reviewable != ahorro"
    - "reviewable != reversión contable"
    - "Director IA permanece read-only"

history:
  identity: "(same planta_id, same canonical unidad token)"

  default_scope: >
    Conserva el contexto Taller Mayor y periodo activo.

  expansion_only_if_explicit:
    - "histórico"
    - "todos sus folios"
    - "en total"

cross_domain:
  selected_folio_IGF:
    rule: >
      Si existe active_folio y el usuario pregunta por impacto IGF, se conserva
      el Folio/unidad seleccionado y no se sustituye por una bolsa general de
      planta.

  invariants:
    - "no mutation"
    - "no realized savings claim"

reasoning_boundary:
  runtime:
    - "unit identity"
    - "folio identity"
    - "classification"
    - "period"
    - "amount"
    - "status"
    - "reviewability"
    - "history"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT:
    - "executive synthesis"
    - "summarization"
    - "what stands out"
    - "what to investigate"

  prohibited:
    - "mechanical diagnosis without evidence"
    - "causal inference from concepto"
    - "recommend cancellation because amount is high"
    - "savings claim"

partial_data:
  invariant: "missing != zero"
  behavior: "return supported facts + explicit limitations"

preserved:
  - "folio_status"
  - "taller_at"
  - "IGF reviewable plant-wide"
  - "client_profile"
  - "commercial_trend"
  - "daily_executive_brief"
  - "daily sales"
  - "daily discount"
  - "topic return"
  - "persistent memory"

test_evidence:
  focal_taller_mayor: "17/17"
  director_ia_suite: "964/964"
  git_diff_check: "clean"

module_state:
  M5: "PARTIAL"
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

contracts:
  Constitution: "unchanged"
  EKE: "unchanged"
  IES_04: "unchanged"
  Reasoning_Engine_05: "unchanged"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "matrix changes"
  - "unit master"
  - "predictive maintenance"
  - "Taller mutations"
  - "Folio cancellation"
  - "M5 COMPLETE"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "taller_mayor documented."
  - "Canonical unit identity documented."
  - "REPARACIÓN MAYOR classification documented."
  - "Current-month mes_cargo semantics documented."
  - "Unit grouping documented."
  - "SUM importe ranking documented."
  - "Multi-Folio no-silent-pick documented."
  - "active_unit / active_folio documented."
  - "Selected-Folio reviewability documented."
  - "Plant-wide IGF regression boundary documented."
  - "History semantics documented."
  - "Read-only invariant documented."
  - "No mechanical inference explicit."
  - "17/17 focal evidence recorded."
  - "964/964 suite evidence recorded."
  - "M5 remains PARTIAL."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001.md