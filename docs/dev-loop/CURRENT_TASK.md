# CURRENT_TASK

task_id: "AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "AUDIT / EVALUATION"
  implementation: false
  code_changes: false
  test_changes: false
  sql_changes: false
  architecture_changes: false
  docs_director_ia_changes: false
  matrix_changes: false

objective: >
  Evaluar el ciclo ejecutivo real que Director IA debe soportar
  (OPEN_MONTH → PRE_CLOSE → CLOSED_NOT_FINAL → CLOSED_FINAL →
  COUNCIL_FINAL → POST_CLOSE_FOLLOWUP) usando la junta Plaud
  2026-08-25 como muestra PRE_CLOSE, EVAL-001/EVAL-002 como
  evidencia CLOSE, y la visión humana de CONSEJO / FINAL +
  análisis posterior. No reducir Director IA a pre_meeting.

preserve:
  architecture_pending: "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
  architecture_execute: false
  architecture_modify: false
  restore: false
  discard: false

plaud_sample:
  date: "2026-08-25"
  title: "Reunión: Zona Provincia ajusta operaciones y proyecta cierre"
  role: "PRE_CLOSE / conducción del cierre"

historical_close_evidence:
  - "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
  - "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002"

cycle_to_study:
  - "OPEN_MONTH"
  - "PRE_CLOSE"
  - "CLOSED_NOT_FINAL"
  - "CLOSED_FINAL"
  - "COUNCIL_FINAL"
  - "POST_CLOSE_FOLLOWUP"

must_not_reduce_to: "pre_meeting"

must_not:
  - "execute this audit in the G1-only turn"
  - "create the AUDIT/EVAL-003 report before the audit is executed"
  - "change status to IN_PROGRESS during G1 application"
  - "execute or modify ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
  - "modify code, tests, SQL, architecture, normative docs, or matrix"
  - "commit"
  - "push"
  - "merge"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md"
  read_only:
    - "entire repository except writable files"
    - "Plaud meeting 2026-08-25 and EVAL-001 / EVAL-002 reports"

out_of_scope:
  - "code changes"
  - "test changes"
  - "SQL"
  - "architecture implementation"
  - "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001 execution"
  - "docs/director-ia/ normative edits"
  - "capability matrix"
  - "commit"
  - "push"
  - "merge"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"

allowed_actions:
  - "inspect Plaud packet + EVAL-001/002 and write the AUDIT report"
  - "update CURRENT_TASK status AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW"

forbidden_actions:
  - "execute or redesign ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
  - "modify lib/, test/, sql/, frontend-dashboard/, vba/, server.js"
  - "modify docs/director-ia/"
  - "commit"
  - "push"
  - "merge"
  - "write AUTHORIZED_BY_HUMAN"
  - "approve gates G2–G8"

max_attempts: 1

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

acceptance_criteria:
  - "G1 intact; audit executed in a later turn."
  - "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001 remains unexecuted."
  - "EVAL-003 report written with the required 25 sections."
  - "No code, tests, SQL, architecture, or matrix changes."
  - "EVAL-001/EVAL-002 N and rates not recomputed."
  - "Exactly one NEXT_TASK proposed, not authorized, not executed."

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md

execution_result:
  status: DONE_PENDING_REVIEW
  N_eval_003: 24
  anticipated_rate: "1/24 = 4.2%"
  prepared_rate: "3/24 = 12.5%"
  unsupported_rate: "11/24 = 45.8%"
  single_bottleneck: "pre_close_composition_missing"
  cycle_model: "SUPPORTED_WITH_ADJUSTMENTS"
  next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
  next_task_authorized: false
  next_task_executed: false
  architecture_pending_still_frozen: true
  matrix: "10.5 / 20 = 52.5%"
  matrix_delta: "0.0 pp"
