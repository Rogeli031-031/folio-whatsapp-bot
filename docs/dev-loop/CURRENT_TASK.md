# CURRENT_TASK

task_id: "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001"
status: DONE_PENDING_REVIEW

recorded_human_decisions:
  authz_decision: "RESOLVED"
  source: "HUMAN_APPROVER"
  recorded_at: "2026-08-25"
  close_task: false

  view_actual_financial:
    ZP: { view: "YES", scope: "ALL_PLANTS", includes_documented_aliases: true }
    AD: { view: "YES", scope: "ALL_PLANTS" }
    GG: { view: "YES", scope: "ASSIGNED_PLANTS" }
    rest: { view: "NO", scope: "NONE" }

  finalize_financial_version:
    ZP: { finalize: "YES", scope: "ALL_PLANTS", includes_documented_aliases: true }
    AD: { finalize: "YES", scope: "ALL_PLANTS" }
    rest: { finalize: "NO", scope: "NONE" }

  supersede_financial_version:
    ZP: { supersede: "YES", scope: "ALL_PLANTS", includes_documented_aliases: true }
    AD: { supersede: "YES", scope: "ALL_PLANTS" }
    rest: { supersede: "NO", scope: "NONE" }

  admin_function_usuarios:
    is_role: false
    financial_authority: "NONE"
    note: >
      ADMIN_FUNCTION via ACCESS_KEY. Not a role. The access key grants
      no VIEW/FINALIZE/SUPERSEDE.

  who_not_how: >
    ZP/AD authorization names WHO. It does not define HOW FINAL is
    physically materialized.

  physical_gaps:
    - code: "END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL"
      resolve_here: false
      not_proof_of_final: true
    - code: "HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE"
      resolve_here: false
      not_proof_of_final: true
      distinct_from: "END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL"
      keep_separate:
        - "PERIOD_NAVIGATION"
        - "PERIOD_COMPLETENESS"
        - "FINANCIAL_FINALITY"
      invariants:
        - "historical month != FINAL"
        - "month no longer visible in UI != data missing"
        - "DB version exists != authoritative FINAL"
      next_arch_must_audit: >
        Whether existing backend loaders can query an explicit historical
        YYYY-MM even if the IGF Forecast UI does not expose it.

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "HUMAN_AUTHZ_DECISION_PREPARATION"
  implementation: false
  code_changes: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  permission_changes: false
  contract_changes: false

objective: >
  Levantar exhaustivamente todos los roles reales existentes en el repositorio
  y preparar una matriz para que HUMAN_APPROVER decida explícitamente quién
  puede VER ACTUAL_FINANCIAL/P&L, con qué alcance, quién puede FINALIZAR una
  versión financiera y quién puede CORREGIR/SUPERSEDE un cierre ya finalizado.

critical_rule: >
  Cursor NO decide permisos. Cursor descubre roles, documenta el comportamiento
  físico actual y presenta opciones. La asignación final pertenece
  exclusivamente a HUMAN_APPROVER.

authoritative_context:
  evidence_contract:
    path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
    version: "v1.0"

  authz_status: "RESOLVED"

  invariant: >
    Existing IGF forecast access does not automatically grant ACTUAL_FINANCIAL
    access.

role_discovery:
  requirement: "EXHAUSTIVE"

  inspect_repository_for:
    - "role catalogs/enums/constants"
    - "usuarios roles"
    - "req.user / session role"
    - "authorization middleware"
    - "permission matrices"
    - "plant scoping"
    - "Director IA authorization"
    - "IGF authorization"
    - "GA/GG/GV/ZP or any other role tokens"
    - "admin/superadmin or equivalent"
    - "frontend role checks"
    - "backend role checks"
    - "database role values referenced in code/docs/tests"
    - "aliases or legacy role names"

  rule: >
    Do not use a remembered/example role list. Report every physically evidenced
    application role found in the repository.

role_normalization:
  for_each_role_capture:
    - "canonical token"
    - "aliases if any"
    - "human-readable meaning if physically documented"
    - "current plant scope"
    - "current IGF access"
    - "current Director IA access"
    - "relevant existing permission flags"
    - "source file/line evidence"

  prohibit:
    - "invent role descriptions"
    - "merge different roles without evidence"
    - "assume acronym meaning"
    - "infer privilege solely from role name"

three_independent_authorities:

  VIEW_ACTUAL_FINANCIAL:
    meaning: >
      Consultar evidencia ACTUAL_FINANCIAL/P&L finalizada mediante Director IA
      or future authorized interfaces.

  FINALIZE_FINANCIAL_VERSION:
    meaning: >
      Designar explícitamente una Finance version as authoritative FINAL for
      exact company/plant + YYYY-MM.

  SUPERSEDE_FINANCIAL_VERSION:
    meaning: >
      Autorizar una corrección posterior mediante nueva versión y sustituir
      formalmente el FINAL anterior without destructive overwrite.

  invariant: >
    These are independent authorities. Permission for one does not imply the
    others.

view_scope_options:
  - "NONE"
  - "OWN_PLANT"
  - "ASSIGNED_PLANTS"
  - "ALL_PLANTS"
  - "OTHER_EXPLICIT_SCOPE"

finalize_scope_options:
  - "NONE"
  - "OWN_PLANT"
  - "ASSIGNED_PLANTS"
  - "ALL_PLANTS"
  - "OTHER_EXPLICIT_SCOPE"

supersede_scope_options:
  - "NONE"
  - "OWN_PLANT"
  - "ASSIGNED_PLANTS"
  - "ALL_PLANTS"
  - "OTHER_EXPLICIT_SCOPE"

required_human_matrix:
  columns:
    - "ROL CANÓNICO"
    - "DESCRIPCIÓN FÍSICAMENTE SOPORTADA"
    - "ALCANCE ACTUAL"
    - "ACCESO IGF ACTUAL"
    - "VER ACTUAL_FINANCIAL"
    - "ALCANCE DE LECTURA"
    - "MARCAR FINAL"
    - "ALCANCE FINALIZACIÓN"
    - "CORREGIR / SUPERSEDE"
    - "ALCANCE SUPERSESSION"
    - "EVIDENCIA / NOTAS"

  decision_cells:
    VIEW:
      - "SÍ"
      - "NO"
      - "HUMAN_DECISION_REQUIRED"

    FINALIZE:
      - "SÍ"
      - "NO"
      - "HUMAN_DECISION_REQUIRED"

    SUPERSEDE:
      - "SÍ"
      - "NO"
      - "HUMAN_DECISION_REQUIRED"

initial_matrix_rule: >
  Before HUMAN_APPROVER answers, all new ACTUAL_FINANCIAL authorization cells
  must remain HUMAN_DECISION_REQUIRED. Do not preselect YES based on current IGF
  access.

special_questions_for_human:
  after_role_inventory:
    ask_exactly:
      - "Para cada rol: ¿puede VER ACTUAL_FINANCIAL?"
      - "Si puede verlo: ¿su planta, plantas asignadas o todas?"
      - "Para cada rol: ¿puede marcar una versión FINAL?"
      - "¿Con qué alcance?"
      - "Para cada rol: ¿puede CORREGIR/SUPERSEDE un FINAL?"
      - "¿Con qué alcance?"

  optional_decision_if_needed:
    - >
      Determine whether FINALIZE/SUPERSEDE should be role-based at all or
      restricted to a specific Finance/admin business process.

fail_closed:
  rule: >
    AUTHZ is RESOLVED on paper. Runtime exposure, FINAL marker, loader and
    IES remain unauthorized until a later authorized architecture/IMPL.
    latest / is_current / closed month / ARR complete != FINAL.

  recorded:
    VIEW_ACTUAL_FINANCIAL: "ZP+AD ALL_PLANTS; GG ASSIGNED_PLANTS; REST NO"
    FINALIZE_FINANCIAL_VERSION: "ZP+AD ALL_PLANTS; REST NO"
    SUPERSEDE_FINANCIAL_VERSION: "ZP+AD ALL_PLANTS; REST NO"

security_invariants:
  - "IGF forecast permission != ACTUAL_FINANCIAL permission"
  - "VIEW != FINALIZE"
  - "VIEW != SUPERSEDE"
  - "FINALIZE != SUPERSEDE"
  - "role != plant scope unless physically defined"
  - "no cross-plant access by inference"
  - "fail closed"
  - "no permission escalation from conversational context"
  - "GPT cannot grant authorization"

physical_audit:
  determine:
    - "where current authorization is enforced"
    - "whether enforcement is backend or frontend"
    - "whether plant scope is server-side"
    - "whether current role tokens are centralized or scattered"
    - "whether an existing permission mechanism can later represent these rights"
    - "whether new permission fields/capabilities will likely be required"

  important: >
    This is observation only. Do not design or implement the final permission
    mechanism yet.

decision_boundary:
  phase_1_this_run:
    - "discover roles"
    - "produce complete matrix"
    - "leave new permissions undecided"
    - "STOP for HUMAN_APPROVER"

  phase_2_after_human_reply:
    - "record exact human decisions"
    - "evaluate resulting authz architecture implications"
    - "close DECISION task"

  rule: >
    Do not proceed to implementation planning before HUMAN_APPROVER has filled
    or explicitly approved every applicable role decision.

baseline:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "permission implementation"
  - "role changes"
  - "database changes"
  - "schema"
  - "SQL"
  - "runtime"
  - "loader"
  - "FINAL marker"
  - "UI"
  - "VBA"
  - "EKE"
  - "Index"
  - "CAPACIDADES_Y_FUENTES"
  - "G3 modifications"
  - "04"
  - "05"
  - "Constitution"
  - "matrix capability changes"
  - "commit"
  - "push"
  - "merge"

phase_1_acceptance_criteria:
  - "All physically evidenced roles inventoried."
  - "Aliases/duplicates identified without guessing."
  - "Current role/plant/IGF authorization evidence cited."
  - "Complete human decision matrix produced."
  - "VIEW/FINALIZE/SUPERSEDE separated."
  - "All new permission cells remain HUMAN_DECISION_REQUIRED."
  - "No role omitted because it seems irrelevant."
  - "No permission inferred from acronym/name."
  - "Fail-closed preserved."
  - "No implementation performed."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."
  - "Task stops awaiting HUMAN_APPROVER."

phase_1_terminal_state: "WAITING_HUMAN_DECISION"

next_task:
  propose_exactly_one: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  authorize: false
  execute: false

result_report_path: >
  docs/dev-loop/reports/DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001.md