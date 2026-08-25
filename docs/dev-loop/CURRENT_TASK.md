# CURRENT_TASK

task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-25"

mode:
  type: "DOCS"
  implementation: false
  execute_now: false
  create_report_now: false

objective: >
  Sincronizar la documentación arquitectónica e inventario con el runtime
  físico FINAL/SUPERSEDED ya implementado, corregido y reaudited PASS,
  sin afirmar todavía una capability ACTUAL_FINANCIAL inexistente.

prior_chain:
  - "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  - "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  - "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  - "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  - "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"

prior_task:
  task_id: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  verdict: "PASS"
  status_when_authorized: "DONE_PENDING_REVIEW"

working_tree_must_remain_intact:
  - "IMPL uncommitted"
  - "reporte IMPL"
  - "reporte AUDIT"
  - "reporte FIX"
  - "reporte REAUDIT"

physical_facts_to_reflect:
  - "financial_state FORECAST / FINAL / SUPERSEDED on igf.versions"
  - "finalized_at / finalized_by / superseded_by_version_id"
  - "unique FINAL GLOBAL YYYY-MM"
  - "FINAL no se infiere de latest / is_current / fecha / mes cerrado / ARR completo"
  - "FINALIZE y SUPERSEDE: ZP + aliases documentados + AD"
  - "GG: VIEW según DECISION; no FINALIZE; no SUPERSEDE"
  - "resto: sin autoridad según DECISION AUTHZ"
  - "PATCH HG FORECAST permitido; FINAL/SUPERSEDED 409"
  - "TOCTOU: transacción + SELECT FOR UPDATE misma fila igf.versions"
  - "FINAL/SUPERSEDED protegidos contra DELETE gobernado; FORECAST sigue borrable"
  - "pgAdmin/superusuario fuera del boundary de inmutabilidad de producto"
  - "corrección: nueva FINAL; anterior FINAL -> SUPERSEDED; sin overwrite"
  - "ACTUAL_FINANCIAL TODAVÍA NO EXPOSED"

must_not_assert:
  - "Director IA ya consulta P&L actual"
  - "month_close_result ya tiene financial.actual"
  - "pre_meeting ya usa P&L actual"
  - "IES consume ACTUAL_FINANCIAL"
  - "Reasoning Engine consume ACTUAL_FINANCIAL"

distinction:
  - "SOURCE EXISTS != FINAL MARKER EXISTS != ACTUAL_FINANCIAL CAPABILITY EXISTS"
  - "ahora existe FINAL MARKER / FINALIZATION RUNTIME"
  - "sigue sin existir ACTUAL_FINANCIAL runtime capability"

docs_to_compare_first:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"

docs_sync_rule: >
  Primero comparar. No asumir que todos necesiten cambios.
  Modificar solo donde exista desfase real con la verdad física.
  Posible desfase: AUTHZ_DECISION_REQUIRED aunque la decisión ya existe.

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
  - "docs/dev-loop/reports/REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
  - "docs/dev-loop/reports/DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001.md"

in_scope:
  writable_when_later_executed:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001.md"
    - "docs/director-ia/ documents listed in docs_to_compare_first, only if real drift"
  writable_this_g1_transition:
    - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "server.js / lib / sql / test"
  - "ACTUAL_FINANCIAL runtime / loader / tool / intent"
  - "GET latest relabel"
  - "historical UI"
  - "month_close_result financial.actual"
  - "pre_meeting P&L actual"
  - "IES / Reasoning consumption"
  - "VBA"
  - "restore / reset / checkout / clean"
  - "commit"
  - "push"
  - "merge"
  - "crear el reporte DOCS en esta transición"
  - "modificar docs/director-ia/ en esta transición"

allowed_actions:
  - "esta transición G1: solo CURRENT_TASK.md"
  - "cuando se ejecute después: comparar docs y sync solo desfase real + reporte DOCS"

forbidden_actions:
  - "ejecutar el sync documental en esta transición"
  - "pasar a IN_PROGRESS en esta transición"
  - "crear el reporte DOCS ahora"
  - "modificar implementación, SQL o tests"
  - "modificar docs/director-ia/ ahora"
  - "tocar reportes IMPL / AUDIT / FIX / REAUDIT"
  - "afirmar capability ACTUAL_FINANCIAL"
  - "git restore / reset / clean / checkout --"
  - "commit"
  - "push"
  - "merge"
  - "almacenar secretos"

max_attempts: 1

g1_transition_only: true
execute_docs_sync: false
create_docs_report_now: false

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001.md

docs_sync_result:
  outcome: "DONE_PENDING_REVIEW"
  g3_touched: false
  index_touched: true
  eke_touched: true
  capabilities_touched: true
  financial_actual_exposed: false
  matrix: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"
  next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  next_task_authorized: false
  next_task_executed: false
