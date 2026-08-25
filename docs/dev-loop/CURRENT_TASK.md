# CURRENT_TASK

task_id: "IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "IMPLEMENTATION"
  architecture: "B"
  first_slice: "C"
  canonical_intent: "month_close_result"

objective: >
  Implementar el read model mensual ejecutivo aprobado para una planta y un
  mes calendario, alineando antes de GPT venta real, META/COMPROMISO, mix,
  descuento, clientes, forecast financiero, acciones e information gaps.

  Debe permitir responder preguntas reales de junta como:
  “¿Cómo cerramos?”,
  “¿Cómo quedamos contra la meta?”,
  “¿Qué cambió en CASA y COMISIONISTAS?”,
  “¿Qué pasó con el descuento?”,
  “¿Qué clientes ganamos/perdimos?”,
  sin mezclar ACTUAL, TARGET, FORECAST ni DERIVED_MODEL.

baseline:
  coverage: "10.5 / 20 = 52.5%"
  expected_delta: "0.0 pp"

readiness:
  determination: "READY_WITH_LIMITS"
  architecture: "B — structured month-close read model"
  first_slice: "C — month-close core"
  intent: "month_close_result"

truth_classes:

  ACTUAL:
    source: "ARR physical actuals"
    includes:
      - "monthly sales"
      - "channel mix"
      - "monthly discount/kg"
      - "monthly client movement"

  TARGET_COMMITMENT:
    source: "igf_meta"
    semantic_owner: "HUMAN_APPROVER"
    definition: >
      META/COMPROMISO gerencial firmado para el mes: variables que se deben
      lograr, incluyendo venta y objetivos de rentabilidad/resultado.

  FORECAST:
    source: "IGF compromiso/runtime"
    definition: "proyección, nunca actual"

  DERIVED_MODEL:
    source: "forecast_mensual / 14d×DOW or equivalent"
    definition: "modelo derivado, nunca actual ni target"

truth_invariants:
  - "ACTUAL != TARGET_COMMITMENT"
  - "TARGET_COMMITMENT != FORECAST"
  - "FORECAST != ACTUAL"
  - "DERIVED_MODEL != ACTUAL"
  - "DERIVED_MODEL != TARGET_COMMITMENT"
  - "No semantic relabeling for presentation convenience."

target_source:

  schema:
    versions: "igf_meta.versions"
    lines: "igf_meta.meta_lines"

  grain:
    version: "GLOBAL + year + month + version_number"
    line: "version + empresa"

  selection:
    - "exact requested year"
    - "exact requested month"
    - "is_current=true for that period"
    - "map empresa to authorized plant using existing canonical physical pattern"

  sales_target:
    field: "venta_ton"
    semantic: "monthly sales TARGET / COMMITMENT"

  financial_targets:
    candidate_fields:
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

    rule: >
      Preserve exact physical/business semantics. These are TARGET/COMMITMENT
      values, not actual results.

target_staleness:

  mandatory_rule: >
    Target must match the exact requested YYYY-MM.

  missing_code: "TARGET_MISSING_FOR_PERIOD"

  prohibited:
    - "carry forward previous month"
    - "latest available target from another month"
    - "forecast as target"
    - "prior actual as target"
    - "Plaud value as target"
    - "hardcoded target"

monthly_actual_sales:

  source: "arr.ventas_diarias_cliente"

  grain:
    - "authorized plant"
    - "calendar month"

  calculations:
    sales_kg: "SUM(kg)"
    sales_ton: "SUM(kg) / 1000"

  rule: >
    Use calendar-month actual rows only. Do not silently use 30/90 trailing
    commercial_trend semantics.

sales_target_comparison:

  if_actual_and_target:
    expose:
      - "actual_ton"
      - "target_ton"
      - "delta_ton"
      - "attainment_pct"

    formulas:
      delta_ton: "actual_ton - target_ton"
      attainment_pct: "actual_ton / target_ton * 100 when target_ton is valid and nonzero"

  if_target_missing:
    expose:
      limitation: "TARGET_MISSING_FOR_PERIOD"

  zero_policy:
    rule: "Do not divide by zero. Do not convert missing target to zero."

channel_mix:

  source: "same monthly ACTUAL sales source"

  canonical_classification:
    COMISIONISTA: "existing canonical LIKE '%comisionista%' semantics"
    CASA: "remaining canonical rows"

  expose:
    - "CASA kg/ton"
    - "COMISIONISTA kg/ton"
    - "share % when denominator valid"

  optional_prior_comparison:
    rule: >
      Include only if physically safe and already supported by the approved
      monthly comparison. Do not expand scope merely for presentation.

monthly_discount:

  source: "actual monthly ARR discount evidence"

  formula: "SUM(monto) / SUM(kg)"

  invariant: "Never average per-row/per-client discount averages."

  expose:
    - "monthly discount/kg"
    - "limitation if denominator/evidence unavailable"

clients:

  identity: "cliente_key where canonical identity is required"

  compare:
    current: "requested calendar month"
    previous: "immediately previous calendar month"

  expose:
    - "new clients"
    - "lost clients"
    - "top positive movers"
    - "top negative movers"

  rules:
    - "Use physically supported monthly kg movement."
    - "Mover != cause."
    - "No fuzzy identity."
    - "No join by cliente_nombre where canonical key is required."
    - "Do not substitute DICF forecast income for actual close."

financial:

  target:
    source: "igf_meta"
    truth_class: "TARGET_COMMITMENT"

  forecast:
    source: "existing IGF forecast/compromiso path"
    truth_class: "FORECAST"

  actual:
    status: "UNSUPPORTED_METRIC"

  mandatory_output_rule: >
    financial.target and financial.forecast may coexist but must remain
    separately labeled. financial.actual must remain unsupported unless a
    pre-existing physically defensible actual source is discovered within the
    already approved architecture; do not create one in this task.

  prohibited:
    - "forecast called actual"
    - "target called actual"
    - "target attainment claimed using forecast as actual"
    - "derived model called actual"

actions:

  reuse: "existing Action Register capability/loaders"

  expose_when_supported:
    - "open"
    - "overdue"
    - "closed/result status if physically available"

  rule: >
    Missing result/closure evidence may become an information gap. Do not infer
    action success from closed status alone unless existing semantics support it.

information_gaps:

  examples:
    - "TARGET_MISSING_FOR_PERIOD"
    - "FINANCIAL_ACTUAL_UNSUPPORTED"
    - "material client movement without explanatory evidence"
    - "action missing closure/result evidence"
    - "source unavailable"

  rule: >
    Gap means missing/insufficient evidence, not a causal explanation.

read_model:

  canonical_shape:
    - "plant"
    - "month"
    - "period_status"
    - "generated_at"
    - "sales"
    - "channels"
    - "discount"
    - "clients"
    - "financial"
    - "actions"
    - "information_gaps"
    - "provenance"
    - "limitations"

period_semantics:

  explicit_closed_month:
    preferred: true

  calendar_month:
    timezone: "America/Mexico_City"

  current_month:
    status: "PARTIAL"
    rule: >
      If current month is explicitly requested, label it PARTIAL. Do not call it
      closed.

  prior_month:
    status: >
      COMPLETE only to the extent physically defensible under existing data
      semantics. Do not invent an accounting close marker.

intent:

  canonical: "month_close_result"

  slots:
    - "plant"
    - "year"
    - "month"

  examples_semantic_only:
    - "¿Cómo cerramos?"
    - "¿Cómo cerró Puebla en julio?"
    - "¿Cómo quedamos contra la meta?"
    - "¿Cuánto nos faltó para la meta?"
    - "¿Qué porcentaje cumplimos?"
    - "¿Qué pasó con CASA y comisionistas?"
    - "¿Qué clientes ganamos y perdimos?"

  invariant: "No literal phrasebook."

routing:

  preserve:
    - "daily_executive_brief"
    - "commercial_trend"
    - "client_profile"
    - "IGF"
    - "IGF reviewable"
    - "taller_mayor"
    - "pre_meeting_brief"

  precedence:
    explicit_month_close: "month_close_result"

  pre_meeting_handoff:
    examples:
      - "Prepárame para la junta."
      - "¿Y cómo cerramos el mes?"
      - "¿Contra la meta?"
      - "¿Qué clientes movieron el resultado?"

    behavior: >
      pre_meeting_brief may hand off to month_close_result while preserving
      authorized plant and explicit/relevant meeting month, then requery fresh
      evidence.

conversation_state:

  store_routing_only:
    - "plant"
    - "month"
    - "parent_intent"
    - "active client/entity only when needed for canonical handoff"

  prohibit:
    - "persisting evidence snapshots as truth"
    - "stale target reuse"
    - "cross-plant entity carryover"

  followups:
    rule: "inherit identity/period only; requery evidence."

GPT:

  input: "structured aligned read model"

  role:
    - "executive synthesis"
    - "highlight tensions"
    - "state limitations"
    - "identify what needs explanation"

  prohibited:
    - "inventing target"
    - "inventing actual financial result"
    - "causal claims from co-movement"
    - "turning comments into verified causes"
    - "hiding missing data"

safe_language_examples:

  supported:
    - "La venta real fue X frente a una meta comprometida de Y."
    - "El cumplimiento de la meta de venta es Z%."
    - "El mix cambió hacia CASA/COMISIONISTA."
    - "El descuento/kg real del mes fue X."
    - "El IGF proyecta X frente a una meta financiera comprometida de Y."
    - "No dispongo de resultado financiero actual para afirmar el cumplimiento financiero."

  target_missing:
    - "No encuentro una META/COMPROMISO cargada para este periodo; no usaré la de otro mes."

  causality:
    - "Este cliente explica parte del movimiento en volumen."
    - "No tengo evidencia suficiente para afirmar la causa."

partial_data:

  required: true

  examples:
    - "actual sales exists + target missing"
    - "target exists + IGF unavailable"
    - "sales/discount exists + financial actual unsupported"
    - "clients partially unavailable"
    - "actions unavailable"

  rule: >
    One missing section must not erase independently valid sections.

authz:

  scope: "one authorized plant"

  rules:
    - "preserve existing plant authorization"
    - "fail closed"
    - "no cross-plant"
    - "target empresa mapping must not bypass authorization"

read_only:

  absolute: true

  prohibited:
    - "modify target"
    - "upload target"
    - "approve commitment"
    - "change IGF"
    - "modify action"
    - "cancel Folio"
    - "persist month-close result"

tests_required:

  truth_separation:
    - "ACTUAL/TARGET/FORECAST remain separate"
    - "financial.actual unsupported"

  target:
    - "exact month target"
    - "missing target"
    - "prior-month target cannot leak"
    - "is_current version selection"
    - "zero target safe"

  sales:
    - "calendar month aggregation"
    - "not trailing 30/90"

  channel:
    - "CASA"
    - "COMISIONISTA"

  discount:
    - "weighted SUM(monto)/SUM(kg)"

  clients:
    - "new"
    - "lost"
    - "positive/negative movers"
    - "mover != cause"

  routing:
    - "month_close_result standalone"
    - "pre_meeting -> month close"
    - "month close -> target follow-up"
    - "month close -> channel"
    - "month close -> client handoff"

  partial_data:
    - "target missing"
    - "IGF missing"
    - "actions missing"

  regression:
    - "daily brief"
    - "commercial trend"
    - "client profile"
    - "IGF reviewable"
    - "Taller Mayor"
    - "pre-meeting"
    - "topic return"
    - "persistent memory"

implementation_constraints:

  prefer:
    - "reuse existing loaders/helpers"
    - "shared truth"
    - "safeLoad/isolation where composition needs it"

  prohibit:
    - "HTTP calls to own server"
    - "duplicate dashboard truth"
    - "new SQL schema"
    - "new target persistence"
    - "new accounting model"
    - "Plaud runtime"
    - "second router"
    - "phrasebook"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "lib/** only as required by this implementation"
    - "test/** only as required"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md"

  read_only:
    - "all other repository files unless an existing shared helper requires the minimum safe edit"

out_of_scope:
  - "new schema"
  - "SQL migration"
  - "new meta upload flow"
  - "financial actual model"
  - "Plaud integration"
  - "matrix change"
  - "contract redesign"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "month_close_result implemented."
  - "Architecture B preserved."
  - "First slice C preserved."
  - "ACTUAL/TARGET/FORECAST/DERIVED_MODEL remain distinct."
  - "igf_meta used as TARGET/COMMITMENT."
  - "Exact YYYY-MM target selection."
  - "No carry-forward."
  - "TARGET_MISSING_FOR_PERIOD implemented."
  - "Actual monthly sales implemented."
  - "Actual CASA/COMISIONISTA mix implemented."
  - "Actual monthly discount/kg implemented."
  - "Monthly client movement implemented."
  - "financial.target separated from financial.forecast."
  - "financial.actual remains unsupported."
  - "Actions/gaps composed."
  - "Partial data survives."
  - "Pre-meeting handoff works."
  - "Canonical follow-ups work."
  - "No phrasebook."
  - "No causality invention."
  - "Read-only."
  - "Relevant focal tests pass."
  - "Full Director IA suite passes."
  - "git diff --check clean."
  - "52.5% preserved."

next_task:
  exactly_one: true
  proposed: "DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md