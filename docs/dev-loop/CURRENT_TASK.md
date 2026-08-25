# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-INDEX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "G2_INDEX_SYNC_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  eke_sync: false
  inventory_sync: false

objective: >
  Sincronizar exclusivamente DIRECTOR_IA_ARCHITECTURE_INDEX.md para registrar
  FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md v1.0 como contrato de evidencia de
  dominio, orden documental “—”, subordinado a Constitución/EKE, sin presentarlo
  como nueva capa del pipeline y sin afirmar runtime/IES inexistente.

source_contract:
  path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  version: "v1.0"
  type: "domain evidence contract"
  pipeline_layer: false
  index_order: "—"

authority:
  subordinate_to:
    - "DIRECTOR_IA_CONSTITUTION.md"
    - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"

  does_not_reopen:
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"
    - "DIRECTOR_IA_CONSTITUTION.md"

index_sync_required:

  document_map:
    add_row:
      order: "—"
      document: "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
      owns: >
        Evidencia de dominio ACTUAL_FINANCIAL: FINANCE_PROVIDED,
        FORECAST/FINAL/SUPERSEDED, provenance, reconciliation,
        correction/supersession y frontera de autorización.
      state: "v1.0 — G3 congelado/aprobado por humano"

  contract_ownership:
    add:
      concept: >
        ACTUAL_FINANCIAL / FINANCE_PROVIDED / finalization of Finance evidence
      owner: "FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"

  runtime_table:
    requirement: >
      Do not imply that the contract has runtime implementation.

    state: >
      Contract exists; physical finalization/runtime exposure remains pending.

  invariant_section:
    preserve:
      - "pipeline remains Constitution → EKE → EB → IES → RE → Interfaces"
      - "financial contract is not N6/N7"
      - "ACTUAL_FINANCIAL does not yet feed official IES"
      - "chat/runtime support is not constitutional pipeline implementation"

truth_boundary:
  index_must_not_claim:
    - "FINANCIAL_ACTUAL runtime exists"
    - "is_final schema exists"
    - "P&L exposure exists"
    - "IES consumes ACTUAL_FINANCIAL"
    - "AUTHZ is resolved"
    - "04/05 changed"

authorization:
  status: "AUTHZ_DECISION_REQUIRED"
  index_note: >
    May be referenced as pending runtime exposure boundary, but role mapping
    must not be invented.

g2_sequence:
  current: "1 of 3"

  after_this:
    - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md §7 Financiero"
    - "DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  rule: "Do not perform later syncs in this task."

version_control:
  architecture_index:
    audit:
      - "current version number"
      - "control documental"

    rule: >
      If repository convention increments the index version for normative
      synchronization, increment minimally and record the exact change.
      Do not change unrelated dates/state.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-INDEX-SYNC-001.md"

  read_only:
    - "all other repository files"

out_of_scope:
  - "EKE"
  - "CAPACIDADES_Y_FUENTES"
  - "runtime"
  - "code"
  - "tests"
  - "SQL"
  - "schema"
  - "VBA"
  - "permissions implementation"
  - "04"
  - "05"
  - "Constitution"
  - "matrix"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Financial Actual contract appears in Index."
  - "Order is —, not 07."
  - "Not represented as pipeline layer."
  - "Contract ownership recorded."
  - "v1.0 G3 status recorded accurately."
  - "Runtime remains pending."
  - "ACTUAL_FINANCIAL still does not feed IES."
  - "AUTHZ remains unresolved."
  - "Pipeline order unchanged."
  - "No EKE/inventory sync performed."
  - "Baseline remains 52.5%."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_exactly_one:
    "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EKE-SYNC-001"

  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-INDEX-SYNC-001.md