# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "ARCHITECTURE_READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  schema_changes: false
  sql_execution: false
  test_changes: false
  ies_changes: false

objective: >
  Diseñar el read model canónico y reutilizable para consumir evidencia
  ACTUAL_FINANCIAL finalizada, preservando provenance y separación estricta
  entre FINANCE_PROVIDED, ARR ACTUAL_COMMERCIAL, TARGET_COMMITMENT, FORECAST
  y RUNTIME_COMPUTED.

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

upstream_state:

  financial_actual_contract:
    path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
    version: "v1.0"

  finalization_infrastructure:
    status: "IMPLEMENTED"
    physical_source:
      - "igf.versions"
      - "igf.compromiso_lines"

    states:
      - "FORECAST"
      - "FINAL"
      - "SUPERSEDED"

    grain: "GLOBAL version per YYYY-MM"

  authz:
    status: "RESOLVED"

    VIEW:
      ZP: "ALL_PLANTS"
      AD: "ALL_PLANTS"
      GG: "ASSIGNED_PLANTS"
      REST: "DENY"

  runtime:
    ACTUAL_FINANCIAL: "NOT_YET_SUPPORTED"

core_question: >
  How should Director IA retrieve and represent one finalized financial close
  for an exact plant/company + YYYY-MM without reusing latest/forecast/runtime
  calculations as financial actual evidence?

truth_classes:

  ACTUAL_FINANCIAL:
    source: >
      FINANCE_PROVIDED fields from the unique authoritative FINAL,
      non-SUPERSEDED Finance version for exact YYYY-MM.

  ACTUAL_COMMERCIAL:
    source: "ARR"

  TARGET_COMMITMENT:
    source: "igf_meta"

  FORECAST:
    source: "IGF non-final historical/current version"

  RUNTIME_COMPUTED:
    source: >
      Existing GET overlays/recalculations such as ARR substitution, Folios,
      gasto recalculation, util/resultado recalculation and PROY.

  DERIVED_MODEL:
    source: "forecast_mensual / other derived models"

invariants:
  - "ACTUAL_FINANCIAL != ACTUAL_COMMERCIAL"
  - "ACTUAL_FINANCIAL != TARGET_COMMITMENT"
  - "ACTUAL_FINANCIAL != FORECAST"
  - "ACTUAL_FINANCIAL != RUNTIME_COMPUTED"
  - "FINAL does not convert RUNTIME_COMPUTED to FINANCE_PROVIDED"
  - "latest != FINAL"
  - "is_current != FINAL"
  - "no fallback from ACTUAL_FINANCIAL to forecast"
  - "no fallback from ACTUAL_FINANCIAL to target"
  - "missing != zero"

canonical_period:
  required:
    - "year"
    - "month"

  timezone: "America/Mexico_City"

  rule: >
    Read model must accept explicit historical YYYY-MM independently of the
    currently visible dashboard month.

historical_support:
  backend: "SUPPORTED for explicit year/month"
  frontend: "historical navigation missing"
  implication: >
    Read model must not depend on frontend month selection.

canonical_identity:

  financial_version:
    grain:
      - "GLOBAL"
      - "year"
      - "month"
      - "version_id/version_number"

  financial_line:
    grain:
      - "FINAL version"
      - "empresa"

  plant_mapping:
    requirement: >
      Reuse the canonical existing empresa-to-plant mapping pattern. Do not
      invent name joins or fuzzy matching.

  authz:
    requirement: "validate authorized plant before returning financial line"

final_version_selection:

  required:
    - "exact year"
    - "exact month"
    - "financial_state = FINAL"
    - "not SUPERSEDED"
    - "unique authoritative FINAL"

  prohibit:
    - "MAX(version_number) as ACTUAL"
    - "is_current as ACTUAL"
    - "latest as ACTUAL"
    - "elapsed month as ACTUAL"
    - "ARR complete as ACTUAL"

  ambiguity:
    if_multiple_final_despite_constraint_or_corruption:
      code: "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
      behavior: "fail closed"

  no_final:
    if_versions_exist:
      code: "FINANCIAL_ACTUAL_NOT_FINAL"

    if_no_version:
      code: "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"

field_origin_mapping:

  requirement: >
    Define exactly which stored fields from compromiso_lines may be surfaced
    as FINANCE_PROVIDED ACTUAL_FINANCIAL.

  inspect_and_classify:
    - "venta_ton"
    - "margen_kg"
    - "com_desc_kg"
    - "gasto_kg"
    - "impuesto_kg"
    - "hg_pct"
    - "hg_kg"
    - "bancos_planta_kg"
    - "provision_planta_kg"
    - "util_oper_kg"
    - "util_oper_importe"
    - "gtos_apoyos_corp_kg"
    - "bancos_corp_kg"
    - "otros_programas_kg"
    - "inversiones_kg"
    - "resultado_final_kg"
    - "resultado_final_importe"

  classification_values:
    - "FINANCE_PROVIDED"
    - "NOT_FINANCE_PROVIDED"
    - "AMBIGUOUS"

  rule: >
    Use stored persisted line values, not GET-overlaid/recalculated values, when
    representing FINANCE_PROVIDED evidence.

stored_vs_get_boundary:

  critical: true

  audit:
    - "which endpoint/loaders currently read raw compromiso_lines"
    - "which GET fields are overwritten/recomputed"
    - "whether reusable raw loader already exists"

  preferred_architecture:
    B: >
      Shared raw financial evidence loader/read model in lib/ that reads the
      FINAL version directly, not through the presentation GET that overlays
      runtime calculations.

  compare:
    A: "reuse existing GET /api/dashboard/igf-forecast"
    B: "shared backend raw evidence loader"
    C: "duplicate SQL in Director IA"
    D: "materialized snapshot"

  selection_requirement:
    - "compare A/B/C/D"
    - "select exactly one"
    - "avoid internal HTTP"
    - "avoid duplicating truth"

provenance_contract:

  read_model_must_include:
    - "truth_class = ACTUAL_FINANCIAL"
    - "source_owner = FINANZAS"
    - "year"
    - "month"
    - "version_id"
    - "version_number"
    - "financial_state"
    - "finalized_at"
    - "finalized_by"
    - "empresa"
    - "plant identity"
    - "field origin"
    - "source persistence"

  optional:
    - "created_at/uploaded_at"
    - "superseded history reference"

  invariant:
    - "created_at != business effective/as-of date"

authorization_read:

  backend_required: true

  VIEW:
    ZP:
      scope: "ALL_PLANTS"

    AD:
      scope: "ALL_PLANTS"

    GG:
      scope: "ASSIGNED_PLANTS"

    REST:
      scope: "DENY"

  rule:
    - "fail closed"
    - "no frontend-only authz"
    - "no privilege from conversational state"
    - "no reuse of forecast access as financial actual access"

reconciliation_with_ARR:

  ACTUAL_COMMERCIAL:
    source: "ARR"

  financial_sale:
    source: "stored FINANCE_PROVIDED venta_ton if present"

  behavior:
    if_consistent:
      - "preserve both provenance paths if both exposed"

    if_conflict:
      code: "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
      requirements:
        - "preserve Finance value"
        - "preserve ARR value"
        - "do not overwrite"
        - "do not ask GPT to choose"

  audit:
    - "what tolerance/exact comparison is physically justified"
    - "if no governed tolerance exists, do not invent one"

financial_actual_read_model:

  candidate_shape:

    identity:
      - "plant"
      - "empresa"
      - "year"
      - "month"

    finalization:
      - "version_id"
      - "version_number"
      - "state"
      - "finalized_at"
      - "finalized_by"

    finance_provided:
      - "field/value map"
      - "raw financial values"

    commercial_actual:
      optional:
        - "ARR sales actual"
        - "ARR discount actual"

    target:
      optional:
        - "igf_meta target values"

    historical_forecast:
      optional:
        - "selected prior/non-final version only if explicitly requested"

    reconciliation:
      - "status"
      - "gaps"

    provenance:
      - "per section/source"

    limitations:
      - "typed limitations"

  rule: >
    Do not make the base ACTUAL_FINANCIAL loader depend on target/ARR/forecast
    if a smaller reusable financial-final loader is cleaner. Determine whether
    composition belongs in month_close_result rather than the raw loader.

composition_boundary:

  question: >
    Should the canonical read model itself compose Finance FINAL + ARR + target
    + forecast, or should it expose a focused financial-final evidence pack
    that month_close_result composes with existing sources?

  options:
    A: "monolithic financial close read model"
    B: "focused FINAL evidence loader + higher-level composition"
    C: "month_close-only private loader"

  requirement:
    - "compare A/B/C"
    - "select exactly one"
    - "prefer reusability and clear source ownership"

month_close_result_future:

  current:
    financial_actual: "UNSUPPORTED_METRIC"

  future_if_read_model_ready:
    financial:
      actual: "ACTUAL_FINANCIAL read model"
      target: "igf_meta"
      forecast: "IGF"

  preserve:
    - "actual vs target"
    - "actual vs forecast"
    - "truth labels"
    - "partial data"
    - "missing codes"

  prohibit:
    - "forecast masquerading as actual"

pre_meeting_future:

  closed_final_month:
    may_consume:
      - "ACTUAL_FINANCIAL"
      - "TARGET_COMMITMENT"
      - "ACTUAL_COMMERCIAL"

  open_month:
    preserve:
      - "FORECAST"
      - "TARGET"
      - "commercial actual to date"

  rule:
    - "do not use ACTUAL_FINANCIAL for open/non-final month"

runtime_computed_boundary:

  examples:
    - "GET util_oper recomputation"
    - "GET resultado recomputation"
    - "gasto overlay from budget/Folios"
    - "ARR replacement of venta_ton"
    - "PROY"

  rule: >
    These may be useful contextual/computed signals later, but must not be
    returned as FINANCE_PROVIDED ACTUAL_FINANCIAL.

safe_language_future:

  finance_provided:
    example: >
      “La versión FINAL de Finanzas registra un resultado final de X.”

  runtime_computed:
    example: >
      “Con los inputs finales de Finanzas y los datos operativos, el sistema
      calcula X.”

  reconciliation_gap:
    example: >
      “La venta registrada en el cierre financiero difiere del actual comercial
      de ARR; no los reconciliaré en silencio.”

failure_semantics:

  required:
    - "FINANCIAL_ACTUAL_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_NOT_FINAL"
    - "FINANCIAL_ACTUAL_VERSION_AMBIGUOUS"
    - "FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE"
    - "FINANCIAL_ACTUAL_RECONCILIATION_GAP"
    - "FINANCIAL_ACTUAL_UNAUTHORIZED"

  audit:
    - "which belong to raw loader"
    - "which belong to composed read model"

  invariant:
    - "unauthorized != missing"
    - "not_final != forecast"
    - "missing != zero"

historical_forecast_boundary:

  known:
    versions_exist: true
    created_at: "upload timestamp, not business as-of"

  future:
    allow:
      - "explicit version comparison"
      - "prior version vs FINAL"

    prohibit:
      - "as-of date query inferred solely from created_at"

intent_and_routing:

  question: >
    Does ACTUAL_FINANCIAL need a new canonical intent, or should
    month_close_result remain the canonical executive intent?

  options:
    A: "new financial_actual intent"
    B: "month_close_result consumes financial actual; no new user-level intent"
    C: "reuse IGF intent"

  requirement:
    - "compare A/B/C"
    - "select exactly one"
    - "do not overload IGF if it changes truth semantics"

  semantic_questions:
    - "¿Cuál fue la utilidad operativa real de julio?"
    - "¿Cuál fue el resultado final real?"
    - "¿Cómo quedamos realmente contra la meta?"
    - "¿Qué diferencia hubo entre forecast y cierre?"

followups:

  expected:
    - "¿Contra la meta?"
    - "¿Y el forecast?"
    - "¿Qué cambió?"
    - "¿Qué planta quedó peor?"
    - "¿Por qué?"

  rule:
    - "WHY still requires separate causal evidence"
    - "variance != cause"

IES_boundary:

  current:
    ACTUAL_FINANCIAL_feeds_IES: false

  this_architecture:
    design_legacy_runtime_read: true
    modify_IES_contract: false

  rule: >
    Read-model implementation may serve current Director IA legacy runtime
    without claiming official IES integration.

contract_gate_audit:

  inspect:
    - "G3 v1.0"
    - "Index 1.10"
    - "EKE current version"
    - "Capabilities inventory"
    - "AUTHZ decision"

  determine:
    - "whether read-model implementation needs any new G2/G3 contract work"
    - "whether current contracts already authorize the read path"

implementation_slice_options:

  A_raw_loader_only:
    includes:
      - "FINAL version loader"
      - "field origin/provenance"
      - "authz"
      - "failure semantics"

  B_loader_plus_month_close:
    includes:
      - "A"
      - "month_close_result financial.actual"
      - "actual/target/forecast composition"

  C_loader_plus_month_close_plus_pre_meeting:
    includes:
      - "B"
      - "pre_meeting closed-month P&L"

  D_everything:
    includes:
      - "C"
      - "historical UI"
      - "new dedicated intent"
      - "other presentation"

  requirement:
    - "compare A/B/C/D"
    - "select exactly one first implementation slice"
    - "prefer smallest slice that produces testable executive value without broadening scope unsafely"

tests_plan_future:

  raw_loader:
    - "exact FINAL YYYY-MM"
    - "no FINAL -> NOT_FINAL"
    - "no version -> MISSING"
    - "authz ZP"
    - "authz AD"
    - "authz GG assigned"
    - "GG other plant denied"
    - "rest denied"
    - "FINAL non-superseded only"
    - "field origin correctness"
    - "stored vs GET-computed distinction"

  reconciliation:
    - "Finance sale = ARR"
    - "Finance sale != ARR -> GAP"
    - "no silent overwrite"

  composition:
    - "actual vs target"
    - "actual vs forecast"
    - "partial missing target"
    - "partial missing forecast"

  routing:
    - "closed-month real-profit question"
    - "open-month question remains forecast"
    - "follow-up target"
    - "follow-up forecast"

  regression:
    - "IGF"
    - "ARR"
    - "month_close_result"
    - "pre_meeting"
    - "Director IA suite"

readiness_output:

  must_determine:
    - "A/B/C/D source architecture"
    - "A/B/C composition boundary"
    - "field-level FINANCE_PROVIDED catalog"
    - "canonical FINAL selection"
    - "plant/company mapping"
    - "authz enforcement"
    - "reconciliation design"
    - "failure semantics"
    - "intent/routing choice"
    - "first implementation slice"
    - "contract gate status"
    - "READY / READY_WITH_LIMITS / STOPPED / BLOCKED"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "SQL"
  - "schema"
  - "UI"
  - "VBA"
  - "IES changes"
  - "04"
  - "05"
  - "Constitution"
  - "matrix"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Raw FINAL evidence source identified."
  - "Stored vs runtime-computed boundary proven."
  - "Field-level FINANCE_PROVIDED catalog determined."
  - "FINAL selection semantics defined."
  - "Historical YYYY-MM independent of UI."
  - "Authz read semantics defined."
  - "ARR reconciliation defined."
  - "Failure codes assigned."
  - "Composition boundary selected."
  - "Intent/routing strategy selected."
  - "First implementation slice selected."
  - "Contract gate status determined."
  - "No runtime implementation performed."
  - "Baseline remains 52.5%."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"

  if_contract_gate_required:
    propose_exactly_one: "exact required gate task"

  if_human_decision_required:
    propose_exactly_one: "exact DECISION task"

  rule: "Do not authorize or execute."

expected_terminal_state:
  - "DONE_PENDING_REVIEW if implementation-ready."
  - "STOPPED if a human semantic decision is required."
  - "BLOCKED if current physical evidence cannot support safe read."

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md

result:
  verdict: "READY_WITH_LIMITS"
  source_architecture: "B"
  composition_architecture: "B"
  intent_routing: "B"
  first_slice: "B"
  contract_gate: "NO_NEW_G2_G3_REQUIRED_BEFORE_IMPL"
  next_task_proposed: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
  next_task_authorized: false
  next_task_executed: false
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"