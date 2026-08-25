# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "DOCS_SYNC"
  implementation: false
  code_changes: false
  test_changes: false
  sql_changes: false
  ies_changes: false

objective: >
  Sincronizar la documentación con la realidad ya probada por
  REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001 = PASS:
  ACTUAL_FINANCIAL runtime = SUPPORTED dentro de month_close_result
  SOLO cuando existe versión FINAL autorizada del YYYY-MM.
  No afirmar soporte general fuera de ese boundary.

preserve:
  impl: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  audit: "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  fix: "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  reaudit: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  restore: false
  discard: false

chain:
  - "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  - "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  - "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  - "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  - "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"

reaudit_verdict: "PASS"
architecture_source: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
authoritative_contract:
  path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  version: "v1.0"
  rewrite: false

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

runtime_boundary:
  supported: "month_close_result.financial.actual SUPPORTED iff authorized FINAL for YYYY-MM"
  still_unsupported:
    - "pre_meeting"
    - "IES"
    - "Reasoning Engine oficial"
    - "historical UI"
    - "independent financial_actual intent"

must_sync:
  - "ACTUAL_FINANCIAL runtime exists only inside month_close_result when FINAL"
  - "17 FINANCE_PROVIDED stored fields + provenance"
  - "ZP/AD ALL_PLANTS; GG ASSIGNED_PLANTS; rest DENY"
  - "SUPERSEDED ignored; cross-plant isolation; historical YYYY-MM"
  - "GPT context projects actual values; ACTUAL/TARGET/FORECAST separated"
  - "RECONCILIATION_GAP preserves Finance + ARR"
  - "utilidad real → month_close_result; cómo va IGF preserved; open month not forced"
  - "pre_meeting / IES / RE / historical UI / new intent remain unsupported"

must_not:
  - "restore or discard IMPL/AUDIT/FIX/REAUDIT working tree"
  - "modify implementation or tests or SQL"
  - "rewrite G3 v1.0 semantics"
  - "claim general ACTUAL_FINANCIAL support"
  - "claim pre_meeting or IES consume ACTUAL_FINANCIAL"
  - "change capability matrix percentage"
  - "commit"
  - "push"
  - "merge"
  - "authorize or execute a following task"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  read_only:
    - "entire repository except writable files"
    - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"

out_of_scope:
  - "code changes"
  - "test changes"
  - "SQL"
  - "schema"
  - "IES integration"
  - "pre_meeting integration"
  - "historical UI"
  - "new intent"
  - "G3 rewrite"
  - "matrix percentage"
  - "commit"
  - "push"
  - "merge"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"

allowed_actions:
  - "sync inventory docs listed in in_scope.writable to the proven runtime boundary"
  - "write the DOCS report"
  - "update CURRENT_TASK status AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW"

forbidden_actions:
  - "execute this sync in the G1-only turn"
  - "create the DOCS report before the sync task is executed"
  - "change status to IN_PROGRESS during G1 application"
  - "modify lib/, test/, sql/, frontend-dashboard/, vba/, server.js"
  - "restore, reset, or clean the working tree"
  - "commit"
  - "push"
  - "merge"
  - "write AUTHORIZED_BY_HUMAN"
  - "approve gates G2–G8"
  - "authorize or execute a following task"

max_attempts: 1

acceptance_criteria:
  - "IMPL, AUDIT, FIX and REAUDIT reports remain on disk."
  - "Docs state month_close_result SUPPORTED only with authorized FINAL."
  - "Docs keep pre_meeting / IES / RE / historical UI / new intent unsupported."
  - "G3 v1.0 semantics not rewritten."
  - "Baseline remains 52.5%."
  - "git diff --check clean."

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001.md
