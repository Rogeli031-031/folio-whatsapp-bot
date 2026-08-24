# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001
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
  contract_changes: false
  sql_execution: false

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  IGF -> Folios/apoyos reviewable: clasificación read-only según reglas reales
  de cancelación, listados/totales, escenario IGF contrafactual con matemática
  live y límites explícitos sobre ahorro, cash, materialización y recomendación.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "igf_reviewable_supports"
  first_slice: "C — reviewable Folios read model + IGF counterfactual"

implemented_flow: >
  IGF Puebla mes actual
    → “¿Qué podemos recortar de apoyos?”
    → same plant
    → same mes_cargo
    → fresh Folios query
    → clasificación según reglas reales de cancelación
    → reviewable / not_cancellable / excluded
    → counts + totals + detail
    → ESCENARIO HIPOTÉTICO IGF
    → HILO + fresh evidence
    → GPT

reviewable_semantics:
  reviewable: >
    Cancelable operacionalmente bajo las reglas actuales del sistema.

  not_cancellable_states:
    - "PAGADO"
    - "CERRADO"
    - "COMPROBACIONES"
    - "EVIDENCIAS"

  cancelled:
    state: "CANCELADO"
    behavior: "excluded"

  invariant: >
    REVIEWABLE != no depositado.

  critical_boundary: >
    cancelable operacional != materializado contable != ahorro realizado.

read_only:
  absolute: true

  Director_IA_does_not:
    - "cancelar Folios"
    - "solicitar cancelación"
    - "mover etapas"
    - "aprobar"
    - "editar"
    - "persistir escenarios"
    - "modificar IGF"

folio_pack:
  includes:
    - "id/código"
    - "importe"
    - "estatus"
    - "categoria/subcategoria"
    - "planta"
    - "mes_cargo"
    - "reviewable flag"
    - "limitations"
    - "provenance"

  aggregates:
    - "reviewable count"
    - "reviewable total"
    - "not cancellable count"
    - "not cancellable total"

IGF_counterfactual:
  type: "READ-ONLY HYPOTHETICAL"

  principle: >
    Usa la misma matemática vigente del overlay/IGF live y simula en memoria la
    exclusión de Folios reviewable. No hace DB writes.

  outputs:
    - "IGF actual"
    - "IGF hipotético"
    - "delta matemático"
    - "Folios incluidos en el escenario"

  mandatory_label: "ESCENARIO HIPOTÉTICO"

  prohibited_claims:
    - "ahorro realizado"
    - "cash generado"
    - "resultado real garantizado"
    - "reversión contable garantizada"
    - "recomendación de cancelar"

  safe_language: >
    “Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas
    actuales, el escenario matemático del IGF sería…”

cross_domain_routing:
  documented:
    - "IGF current month -> reviewable supports"
    - "same plant"
    - "same period"
    - "fresh Folios evidence"
    - "does not remain stuck in IGF"
    - "does not fall to unrelated cheques coverage:none"

conversation:
  canonical:
    - "¿Cómo proyectamos cerrar el IGF de Puebla este mes?"
    - "¿Qué podemos recortar de apoyos?"
    - "¿Cuáles todavía podemos detener?"
    - "¿Cuánto suman?"
    - "¿Cuáles ya no puedo cancelar?"
    - "¿Cuáles ya están depositados/cerrados?"
    - "Si canceláramos los reviewable, ¿cómo quedaría el IGF?"

  followup_boundary:
    review_first: >
      Puede ordenar por materialidad objetiva para revisión, sin convertirlo en
      recomendación de cancelación.

    commercial_risk: >
      Si no existe evidencia física suficiente, debe decir qué información falta.

materialization_boundary:
  rule: >
    No documentar todo lo no cancelable como “ya gastado” o “materializado
    contablemente”. Esa conclusión requiere evidencia contable adicional.

reasoning_boundary:
  runtime:
    - "folio identity"
    - "status"
    - "reviewability"
    - "amount"
    - "plant"
    - "period"
    - "IGF math"
    - "counterfactual"
    - "authz"
    - "provenance"

  GPT:
    - "executive synthesis"
    - "explanation"
    - "what deserves review"
    - "limitations"
    - "missing information"
    - "follow-ups"

preserved:
  - "IGF existing behavior"
  - "Folios operational workflow"
  - "daily sales"
  - "daily discount"
  - "daily cross-metric followup"
  - "topic return"
  - "action-person"
  - "persistent memory"
  - "M9"

deferred:
  - "closed-month IGF semantic fix"
  - "historical forecast comparison"
  - "client-level commercial-risk model"
  - "automatic ranking by ROI"
  - "Director IA Folio mutation"

test_evidence:
  focal_igf_reviewable_supports: "26/26"
  director_ia_suite: "897/897"
  git_diff_check: "clean"

module_state:
  changed_modules: "none"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "schema"
  - "matrix changes"
  - "closed-month IGF implementation"
  - "commercial-risk engine"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "IGF -> reviewable supports documented."
  - "Real cancellation rules documented."
  - "Reviewable != undeposited explicit."
  - "Read-only invariant documented."
  - "List/totals documented."
  - "Counterfactual IGF documented."
  - "ESCENARIO HIPOTÉTICO label explicit."
  - "No savings/cash claim explicit."
  - "Operational cancellability vs accounting materialization explicit."
  - "Cross-domain routing documented."
  - "Commercial-risk limitation documented."
  - "897/897 evidence recorded."
  - "No module coverage change."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001.md