# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "PHYSICAL_FINALIZATION_ARCHITECTURE_ONLY"
  implementation: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  ui_changes: false
  vba_changes: false

objective: >
  Diseñar la materialización física mínima y gobernada de FINANCIAL_FINAL
  sobre la fuente existente igf.versions + igf.compromiso_lines, respetando
  el contrato G3 v1.0, la decisión AUTHZ ya resuelta y el proceso real de
  Excel Finanzas + carga VBA por ZP/AD, sin inferir FINAL de latest,
  is_current, fecha calendario o ARR completo.

authoritative_contract:
  path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  version: "v1.0"

authz_decision:
  task: "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001"
  status: "RESOLVED"

  VIEW:
    ZP: "YES ALL_PLANTS"
    AD: "YES ALL_PLANTS"
    GG: "YES ASSIGNED_PLANTS"
    REST: "NO"

  FINALIZE:
    ZP: "YES ALL_PLANTS"
    AD: "YES ALL_PLANTS"
    REST: "NO"

  SUPERSEDE:
    ZP: "YES ALL_PLANTS"
    AD: "YES ALL_PLANTS"
    REST: "NO"

process_truth:
  owner: "FINANZAS"

  upload_actors:
    - "ZP"
    - "AD"

  current_upload:
    method: "VBA"
    persistence:
      - "igf.versions"
      - "igf.compromiso_lines"

  notes:
    - "multiple versions may be uploaded during the month"
    - "latest/current version is how we are going, not necessarily FINAL"
    - "ZP/AD control the upload process"
    - "ZP additionally has pgAdmin access"
    - "VBA possession is process evidence, not FINAL marker"

three_independent_dimensions:

  PERIOD_NAVIGATION:
    question: "Can an explicit historical YYYY-MM be queried?"
    known_gap: "HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE"

  PERIOD_COMPLETENESS:
    question: "Is ARR commercially complete for that calendar month?"
    invariant: "complete ARR != FINANCIAL_FINAL"

  FINANCIAL_FINALITY:
    question: "Which exact Finance version is authoritative FINAL?"
    invariant: "must be explicit and persisted"

critical_invariants:
  - "is_current != FINAL"
  - "latest != FINAL"
  - "month elapsed != FINAL"
  - "complete ARR != FINAL"
  - "historical month != FINAL"
  - "UI not showing month != data missing"
  - "version exists != authoritative FINAL"
  - "FINAL designation must be auditable"
  - "FINAL/SUPERSEDED must protect FINANCE_PROVIDED evidence from silent mutation"

physical_audit:

  igf_versions:
    determine:
      - "current schema"
      - "primary key"
      - "plant_code"
      - "year"
      - "month"
      - "version_number"
      - "is_current"
      - "created_at/upload timestamp"
      - "any existing metadata usable for finalization"
      - "whether GLOBAL version contains multiple empresas"

  runtime_reads:
    audit:
      - "GET /api/dashboard/igf-forecast"
      - "historical YYYY-MM support"
      - "month selection behavior"
      - "closed/open logic"
      - "ARR substitution logic"
      - "Excel download path"
      - "why UI may project while export totals actual sales"

  mutation_paths:
    audit:
      - "HG PATCH"
      - "any UPDATE against compromiso_lines"
      - "any UPDATE against versions"
      - "whether old versions can currently be modified"

  frontend:
    audit_only:
      - "why historical month is not selectable"
      - "whether backend limitation or UI-only limitation"

finalization_design_options:

  A_fields_on_igf_versions:
    description: >
      Extend existing igf.versions with explicit financial finalization metadata
      without duplicating financial lines.

    candidate_semantics:
      - "financial_state"
      - "finalized_at"
      - "finalized_by"
      - "superseded_by_version_id or equivalent"
      - "source_owner/provenance if required"

  B_separate_finalization_registry:
    description: >
      Separate table/registry referencing igf version IDs.

  C_repurpose_is_current:
    description: "Use is_current as FINAL."

  D_infer_from_date_and_arr:
    description: "Use elapsed month + complete ARR + latest version."

  requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "C/D prohibited unless they satisfy G3, expected rejection"
    - "prefer minimum physical mechanism"

state_model:
  required:
    - "FORECAST"
    - "FINAL"
    - "SUPERSEDED"

  audit:
    - "whether these belong directly on version or registry"
    - "whether a single state field or separate flags are safer"

  prohibit:
    - "is_final boolean if it cannot represent SUPERSEDED safely"
    - "multiple current authoritative FINAL versions for same period"

canonical_final_identity:
  determine:
    - "GLOBAL version or plant/company-level finalization?"
    - "exact YYYY-MM"
    - "version_id"
    - "empresa/grain implications"

  important: >
    Existing upload creates GLOBAL monthly version with one row per empresa.
    Do not silently design plant-level FINAL if physical version is global.

finalization_operation:
  design_only:
    actor:
      allowed:
        - "ZP"
        - "AD"

  determine:
    - "what operation marks version FINAL"
    - "whether finalization can occur only for elapsed/complete month"
    - "whether ARR completeness is validation vs finality source"
    - "whether version must be is_current before FINAL"
    - "whether a non-current historical version can be finalized"
    - "transactional behavior"

  invariant: >
    ARR/calendar conditions may be prerequisites/validation, never the authority
    that creates FINAL.

supersession_operation:
  design_only:
    determine:
      - "how new correction version becomes FINAL"
      - "how prior FINAL becomes SUPERSEDED"
      - "whether is_current must track corrected version"
      - "history preservation"
      - "atomicity"
      - "no destructive overwrite"

mutation_protection:
  mandatory:
    - "FINAL rows immutable to ordinary HG PATCH"
    - "SUPERSEDED rows immutable"
    - "correction requires new version"
    - "no UPDATE of FINANCE_PROVIDED evidence after FINAL"

  audit:
    - "what existing endpoints would need guardrails later"

period_completeness:
  question: >
    How can system defensibly determine that ARR has complete actual commercial
    data for exact YYYY-MM?

  inspect:
    - "MAX(fecha)"
    - "last calendar day"
    - "current local date/time CDMX"
    - "daily upload conventions"
    - "missing-day ambiguity"

  rule: >
    Calendar elapsed alone may establish that no future day remains, but does
    not prove data ingestion completeness if rows are missing.

  design_output:
    - "CALENDAR_ELAPSED"
    - "ARR_COMPLETE"
    - "ARR_INCOMPLETE_OR_UNCONFIRMED"
    or equivalent if physically justified

  prohibit:
    - "no rows = zero"
    - "MAX(fecha)=last day automatically proves all data completeness unless process evidence supports it"

end_of_month_behavior:
  observed_gap:
    current_label: "END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL"

  refine:
    determine:
      - "whether this is legitimate open-day projection"
      - "whether UI/export use different cutoffs"
      - "whether backend has separate calculation paths"

  rule: >
    Do not call bug unless physical audit proves inconsistent semantics for the
    same completed period/cutoff.

historical_navigation:
  observed_gap: "HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE"

  audit:
    backend:
      - "can endpoint accept explicit year/month?"
      - "can loaders query prior versions?"
      - "does backend force current month?"
      - "does export path support historical month?"

    frontend:
      - "is missing navigation UI-only?"

  output:
    classify:
      - "BACKEND_SUPPORTED_UI_MISSING"
      - "BACKEND_AND_UI_MISSING"
      - "ALREADY_SUPPORTED"
      - "OTHER"

  boundary: >
    Do not implement historical UI in this task.

actual_financial_read_contract:
  future_query:
    for exact YYYY-MM:
      if_FINAL:
        expose:
          - "FINANCE_PROVIDED fields from FINAL version"
          - "version provenance"
          - "ARR actual commercial separately"
          - "reconciliation gap if needed"

      if_versions_but_no_FINAL:
        result: "FINANCIAL_ACTUAL_NOT_FINAL"

      if_no_version:
        result: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"

authorization_enforcement:
  design_requirements:
    VIEW:
      - "ZP/AD ALL_PLANTS"
      - "GG ASSIGNED_PLANTS"
      - "rest deny"

    FINALIZE:
      - "ZP/AD only"

    SUPERSEDE:
      - "ZP/AD only"

  determine:
    - "backend enforcement point"
    - "permission representation"
    - "whether role checks vs explicit permission flags"
    - "how aliases normalize"

  invariant:
    - "frontend hiding not sufficient"
    - "backend fail closed"

  note: >
    This architecture may recommend the physical authz mechanism but must not
    implement it.

schema_migration_plan:
  design_only:
    determine:
      - "minimum columns/table"
      - "constraints"
      - "indexes"
      - "unique authoritative FINAL invariant"
      - "backfill/default for existing versions"
      - "migration safety"

  existing_history:
    important: >
      Existing historical versions currently lack FINAL metadata.

    decide:
      - "backfill all as FORECAST/UNCLASSIFIED"
      - "never auto-mark historical versions FINAL"
      - "whether human retrospective finalization is allowed"

  preferred_safety: >
    No historical version becomes FINAL automatically.

provenance:
  design:
    - "finalized_at"
    - "finalized_by authenticated actor"
    - "source owner FINANZAS"
    - "version ID"
    - "period"
    - "superseded relationship"

  audit:
    - "whether upload filename/hash exists today"
    - "whether absent provenance requires future enhancement"

implementation_slices:
  compare:
    A_finalization_schema_only:
      includes:
        - "migration"
        - "state/provenance"
        - "constraints"
        - "mutation guards"

    B_schema_plus_backend_finalization:
      includes:
        - "A"
        - "backend finalize/supersede operations"
        - "authz"

    C_schema_backend_read:
      includes:
        - "B"
        - "financial actual loader/read support"
        - "month_close_result integration"

    D_everything:
      includes:
        - "C"
        - "historical UI"
        - "export changes"
        - "other gaps"

  requirement:
    - "compare A/B/C/D"
    - "select exactly one safe first implementation slice"

contract_alignment:
  check:
    - "G3 v1.0"
    - "Index 1.9"
    - "EKE 1.1"
    - "CAPACIDADES_Y_FUENTES sync"
    - "AUTHZ decision"

  determine:
    - "whether any new G2/G3 work is needed before implementation"
    - "whether implementation may proceed directly after this architecture"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "schema changes"
  - "SQL execution"
  - "code changes"
  - "tests"
  - "UI changes"
  - "VBA changes"
  - "runtime"
  - "actual FINAL mutation"
  - "historical UI implementation"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "A/B/C/D physical finalization options compared."
  - "Exactly one selected."
  - "GLOBAL vs plant finalization grain resolved."
  - "FORECAST/FINAL/SUPERSEDED physical representation designed."
  - "Supersession atomicity designed."
  - "FINAL/SUPERSEDED mutation protection designed."
  - "ZP/AD finalization authz enforced conceptually."
  - "GG view-only preserved."
  - "Period navigation/completeness/finality remain separate."
  - "End-of-month behavior audited."
  - "Historical backend capability audited."
  - "Existing historical versions receive no inferred FINAL."
  - "Migration/backfill strategy defined."
  - "First implementation slice selected."
  - "No implementation performed."
  - "Baseline remains 52.5%."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"

  if_additional_contract_gate_required:
    propose_exactly_one: "exact required contract task"

  rule: "Do not authorize or execute."

expected_terminal_state:
  - "DONE_PENDING_REVIEW if physical design is implementation-ready."
  - "STOPPED if a new human business decision is required."
  - "BLOCKED if current physical structure cannot safely support contract."

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md

architecture_result:
  outcome: "DONE_PENDING_REVIEW"
  finalization_option: "A"
  rejected: ["B_separate_registry", "C_repurpose_is_current", "D_infer_date_arr"]
  grain: "GLOBAL_VERSION"
  first_slice: "B"
  historical_gap_class: "BACKEND_SUPPORTED_UI_MISSING"
  arr_predicates:
    CALENDAR_ELAPSED: "computable; not FINAL"
    ARR_COMPLETE: "not defensibly definable today"
    ARR_INCOMPLETE_OR_UNCONFIRMED: "honest default"
  contract_alignment: "IMPL_SLICE_B_READY"
  next_task_proposed: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
  next_task_authorized: false
  next_task_executed: false
  percentage:
    before: "10.5 / 20 = 52.5%"
    after: "10.5 / 20 = 52.5%"
    delta: "0.0 pp"