# CURRENT_TASK

task_id: "ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-25"

mode:
  type: "ARCHITECTURE_READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  schema_changes: false
  sql_changes: false
  ies_changes: false

objective: >
  Diseñar una composición ejecutiva canónica de PRE_CLOSE capaz de preparar
  al Director antes de una junta de conducción de cierre usando únicamente
  evidencia físicamente disponible antes de la reunión, preservando clases
  de verdad, provenance, gaps, riesgos y decisiones pendientes, sin inventar
  intervenciones, compromisos o escenarios que todavía no existen.

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

evidence_source:

  primary:
    report: "AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003"
    meeting: "2026-08-25 Zona Provincia"

  historical:
    - "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
    - "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002"

  verdict:
    executive_cycle: "SUPPORTED_WITH_ADJUSTMENTS"
    bottleneck: "pre_close_composition_missing"

frozen_previous_architecture:

  task: "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
  state: "FROZEN / NOT_EXECUTED"

  reason: >
    EVAL-003 demonstrated that adding ACTUAL_FINANCIAL to pre_meeting alone
    would solve the wrong bottleneck. The PRE_CLOSE ritual needs a broader
    composition of current state, forecast, targets, risks, gaps and decision
    needs.

executive_cycle:

  modes:
    - "OPEN_MONTH"
    - "PRE_CLOSE"
    - "CLOSED_NOT_FINAL"
    - "CLOSED_FINAL"
    - "COUNCIL_FINAL"
    - "POST_CLOSE_FOLLOWUP"

  invariant: >
    PRE_CLOSE architecture must not block future traceability across the
    complete executive cycle.

future_traceability_target:

  desired_chain:
    - "TARGET"
    - "BASE_FORECAST"
    - "INTERVENTION"
    - "COMMITMENT"
    - "CLOSING_SCENARIO"
    - "FINAL"
    - "LESSON"
    - "ACTION"

  rule: >
    This task may design compatibility with this chain but must not invent
    persistence for INTERVENTION/COMMITMENT/SCENARIO if physical sources do
    not yet exist.

meeting_mode:

  selected_scope: "PRE_CLOSE"

  canonical_question:
    - "¿Cómo vamos?"
    - "¿Dónde cerramos si seguimos así?"
    - "¿Qué plantas requieren intervención?"
    - "¿Qué variables están deteriorando el cierre?"
    - "¿Qué falta validar?"
    - "¿Qué decisiones necesito tomar en la junta?"
    - "¿Qué números no cuadran?"
    - "¿Qué riesgos pueden impedir el cierre?"

  not_this_mode:
    - "¿Cómo terminamos realmente?"
    - "¿Qué se cumplió contra lo comprometido?"
    - "¿Qué debe decidir el Consejo sobre el cierre final?"

  note: >
    Those belong to CLOSED_FINAL / COUNCIL_FINAL and must remain reachable
    later.

truth_semantics:

  physically_existing_now:

    ACTUAL_COMMERCIAL:
      source: "ARR / daily actual"

    TARGET_COMMITMENT:
      source: "igf_meta"

    FORECAST:
      source: "IGF current/latest operational projection"

    ACTUAL_FINANCIAL:
      source: "FINAL-only financial evidence"
      allowed_in_pre_close: false
      reason: >
        PRE_CLOSE normally operates before financial_state FINAL.

    ACTION:
      source: "Action Register"

    REVIEWABLE:
      source: "existing reviewable support"

    COMMERCIAL_STATE:
      source: "existing commercial state/trend"

  future_semantics_observed_but_not_yet_contractual:
    - "ACTUAL_TO_DATE"
    - "BASE_FORECAST"
    - "PROPOSED_INTERVENTION"
    - "CLOSING_SCENARIO"
    - "HUMAN_COMMITMENT"
    - "FINAL_ACTUAL"

  rule: >
    Determine whether PRE_CLOSE can safely represent these as section/state
    labels without creating new constitutional truth classes.

critical_invariants:
  - "meeting statement != physical truth"
  - "forecast != target"
  - "forecast != final"
  - "proposal != commitment"
  - "commitment != result"
  - "variance != cause"
  - "gap != cause"
  - "missing != zero"
  - "no GPT-created intervention presented as approved"
  - "no GPT-created commitment presented as human commitment"
  - "no what-if result presented as official forecast"
  - "one source failure must not destroy entire PRE_CLOSE brief"

current_pre_meeting_runtime:

  intent: "pre_meeting_brief"

  current_pack:
    - "commercial"
    - "IGF open"
    - "actions"
    - "reviewable"
    - "information gaps"

  current_behavior:
    - "one plant"
    - "open month CDMX"
    - "safeLoad"
    - "one GPT synthesis"
    - "requery"
    - "read-only"

architecture_question_1:

  question: >
    Should PRE_CLOSE be a specialized mode of pre_meeting_brief or a separate
    canonical executive composition?

  options:

    A:
      name: "pre_meeting_brief + meeting_mode=PRE_CLOSE"
      description: >
        Keep pre_meeting_brief as the canonical preparation intent and add a
        structured PRE_CLOSE mode.

    B:
      name: "shared executive-cycle composer"
      description: >
        Build a reusable executive composition object that pre_meeting invokes
        in PRE_CLOSE mode and later can also support COUNCIL_FINAL.

    C:
      name: "new pre_close intent with private composition"
      description: >
        Create a separate PRE_CLOSE intent and duplicate/privatize composition.

  requirement:
    - "compare A/B/C"
    - "select exactly one"
    - "prefer future Council compatibility"
    - "avoid duplicated truth"

architecture_question_2:

  question: >
    What should the PRE_CLOSE composition contain before the meeting begins?

  candidate_sections:
    - "current_state"
    - "target"
    - "base_forecast"
    - "commercial_risk"
    - "financial_risk"
    - "actions"
    - "reviewable"
    - "reconciliation_gaps"
    - "data_quality_gaps"
    - "information_gaps"
    - "decision_needed"
    - "provenance"

  requirement:
    - "audit physical support for every section"
    - "no section without a physical source"
    - "mark unsupported sections explicitly"

current_state:

  candidate:
    sales:
      source: "ARR actual-to-date"

    commercial_movers:
      source: "commercial state / trend"

    discounts:
      source: "ARR / existing monthly commercial data"

    actions:
      source: "Action Register"

    reviewable:
      source: "existing reviewable capability"

  question: >
    Determine exact current-state grain and date/cutoff semantics needed for
    PRE_CLOSE.

base_forecast:

  source_candidate:
    - "IGF current operational version"

  required_semantics:
    - "FORECAST"
    - "not FINAL"
    - "not commitment"
    - "not scenario created by Director IA"

  audit:
    - "which fields are raw vs runtime-computed"
    - "which are useful for PRE_CLOSE"
    - "whether latest operational version is acceptable as BASE_FORECAST"

  important: >
    Latest may be operationally appropriate for PRE_CLOSE even though it is
    prohibited for ACTUAL_FINANCIAL.

target:

  source: "igf_meta"

  semantics: "TARGET_COMMITMENT"

  rule:
    - "exact YYYY-MM"
    - "no carry-forward"
    - "TARGET_MISSING_FOR_PERIOD remains explicit"

risk_layer:

  question: >
    Can current physical data produce deterministic executive risk signals
    without creating causal claims?

  candidate_signals:
    - "forecast below target"
    - "financial result negative"
    - "commercial trend deterioration"
    - "lost high-volume clients"
    - "actions overdue"
    - "reviewable financial supports"
    - "missing target"
    - "source discrepancy"
    - "large dependence on remaining-days forecast"

  requirement:
    - "classify each as physically defensible or not"
    - "no causal inference"
    - "no hardcoded business recommendation"

decision_needed:

  purpose: >
    Identify questions the Director should resolve in the meeting even when
    Director IA cannot know the answer beforehand.

  candidate_examples:
    - "What volume improvement is actually defendable?"
    - "Which expense can still be removed?"
    - "Which commercial incentive is approved?"
    - "Which discrepancy must be reconciled?"
    - "Who owns the unresolved action?"

  rule: >
    These must be derived from GAPS / unresolved evidence, not invented as
    approved actions.

  options:
    A: "GPT synthesizes decision questions from typed gaps"
    B: "deterministic decision-question templates"
    C: "hybrid structured gaps + GPT wording"

  requirement:
    - "compare A/B/C"
    - "select exactly one"

data_quality:

  Acapulco_case:
    issue: "commercial channel classification discrepancy"

  question: >
    What existing sources can PRE_CLOSE compare today to detect potential
    reconciliation or data-quality issues?

  candidate:
    - "ARR vs financial sale"
    - "channel mix inconsistencies"
    - "duplicate/conflicting source values"

  requirement:
    - "distinguish existing reconciliation support from missing infrastructure"
    - "do not create new data-quality truth without evidence"

commitment_history:

  finding_from_eval003:
    likely_status: "MISSING_OR_PARTIAL"

  audit:
    - "Action Register"
    - "bitacora"
    - "Plaud"
    - "persistent memory"
    - "other stores"

  question: >
    Is there a physically defensible store for commitments such as
    'Puebla will close at 1,177' distinct from actions?

  outcomes:
    - "SUPPORTED"
    - "PARTIAL"
    - "MISSING_PHYSICAL_DATA"
    - "MISSING_INFRASTRUCTURE"

  invariant:
    - "do not equate Action Register with commitment history unless proven"

scenario_history:

  audit:
    - "IGF versions"
    - "created_at"
    - "version_number"
    - "financial_state"

  question: >
    Can Director IA reconstruct which forecast/scenario was the approved
    baseline at a given point in the month?

  reminder:
    - "created_at = upload timestamp"
    - "created_at != business effective time"

  outcomes:
    - "SUPPORTED"
    - "PARTIAL"
    - "NOT_DEFENSIBLE"

what_if:

  future_capability: "WHAT_IF / SCENARIO_ANALYSIS"

  this_task:
    implementation: false

  audit:
    - "existing formulas"
    - "IGF recalculation logic"
    - "inputs required"
    - "whether scenario can be computed in-process"
    - "whether official vs sandbox result can be separated"

  requirement:
    - "determine readiness only"
    - "do not make WHAT_IF part of first slice unless existing physical model is safely reusable"

pre_close_output_candidate:

  identity:
    - "plant"
    - "year"
    - "month"
    - "cutoff"

  sections:

    current:
      truth: "ACTUAL_COMMERCIAL"

    target:
      truth: "TARGET_COMMITMENT"

    base_forecast:
      truth: "FORECAST"

    risks:
      truth: "DERIVED_SIGNAL / typed evidence-based risk"

    gaps:
      truth: "INFORMATION_GAP"

    decisions_needed:
      truth: "EXECUTIVE_QUESTION / not approved action"

    actions:
      truth: "persisted actions"

    provenance:
      - "source-by-section"

    limitations:
      - "typed limitations"

  prohibit:
    - "intervention presented as fact"
    - "commitment presented as fact"
    - "closing scenario invented by GPT"

materiality:

  evidence:
    source: "EVAL-003"

  question: >
    Which fields/signals were repeatedly material in the actual PRE_CLOSE
    meeting?

  candidate:
    - "sales actual-to-date"
    - "sales target"
    - "sales trend/base forecast"
    - "commercial channel/mix"
    - "discount"
    - "margin"
    - "HG"
    - "expense"
    - "operating result forecast"
    - "final result forecast"
    - "open actions"
    - "unreconciled data"

  requirement:
    - "derive subset from meeting frequency"
    - "avoid dumping all available fields"

scope_grain:

  current_pre_meeting: "one plant"

  eval003:
    meeting_grain: "multi-plant / zone"

  critical_question: >
    Does PRE_CLOSE need a multi-plant executive mode to prepare a Zone
    Provincia meeting?

  options:
    A: "one plant only"
    B: "multi-plant portfolio composition"
    C: "zone aggregate + selected plants"
    D: "future-only"

  requirement:
    - "compare A/B/C/D"
    - "select exactly one first-slice approach"
    - "inspect current authz and plant scoping carefully"

zone_aggregation:

  question: >
    Can existing sources defensibly aggregate target/forecast/current across
    multiple plants without cross-plant authz leakage or semantic mismatch?

  audit:
    - "sales"
    - "target"
    - "forecast"
    - "actions"
    - "gaps"

  rule:
    - "do not invent regional financial aggregation if current model is not physically safe"

authz:

  principle: "intersection of section permissions"

  questions:
    - "how multi-plant access works for ZP/AD"
    - "what GG should see"
    - "whether PRE_CLOSE portfolio mode is allowed for GG"
    - "how one unauthorized section behaves"

  options_for_partial:
    A: "fail whole brief"
    B: "partial sections"
    C: "partial plants"

  requirement:
    - "select exact behavior"
    - "fail closed against leakage"

routing:

  examples:
    - "Prepárame para el cierre de Zona Provincia"
    - "¿Cómo vamos para cerrar agosto?"
    - "¿Qué plantas me preocupan para el cierre?"
    - "¿Qué debo resolver en la junta de hoy?"
    - "¿Dónde estamos peor contra la meta?"
    - "Prepárame para la junta de Puebla"

  requirement:
    - "audit current routing"
    - "decide if meeting_mode PRE_CLOSE is enough"
    - "avoid phrasebook"

followups:

  examples:
    - "¿Por qué Puebla está mal?"
    - "¿Qué cliente movió la venta?"
    - "¿Qué gasto puedo quitar?"
    - "¿Qué acción está vencida?"
    - "¿Y contra la meta?"
    - "¿Qué pasa si doy 10 centavos?"

  handoff_policy:
    causal:
      - "no answer without evidence"

    client:
      - "client_profile / commercial"

    action:
      - "action capability"

    what_if:
      - "unsupported until scenario capability exists"

    target:
      - "target source"

  rule:
    - "state routes; evidence requeries"

council_compatibility:

  non_negotiable: true

  future_council_questions:
    - "¿Cómo cerramos realmente?"
    - "¿Qué se proyectaba?"
    - "¿Qué se comprometió?"
    - "¿Qué se cumplió?"
    - "¿Qué no?"
    - "¿Qué decisiones funcionaron?"
    - "¿Qué sigue abierto?"
    - "¿Qué aprendemos?"

  architectural_requirement: >
    PRE_CLOSE composition must preserve enough identity, period, provenance and
    source boundaries so future COUNCIL composition can compare against it,
    but must not fake missing commitment/scenario history.

live_meeting_future:

  reserved_capability: "LIVE_MEETING_COPILOT"

  this_task:
    implementation: false

  compatibility_requirement: >
    PRE_CLOSE output should be structured enough that a future live meeting
    copilot could compare spoken statements against the pre-meeting evidence
    pack.

  examples:
    - "spoken number differs from ARR"
    - "speaker is quoting scenario, not actual"
    - "new commitment emerged during meeting"
    - "data-quality discrepancy detected"

  rule:
    - "do not design hardware/runtime now"

implementation_options:

  A:
    name: "single-plant PRE_CLOSE composition"
    includes:
      - "current"
      - "target"
      - "forecast"
      - "actions"
      - "gaps"
      - "decision questions"

  B:
    name: "multi-plant PRE_CLOSE composition"
    includes:
      - "A"
      - "portfolio/plant comparison"

  C:
    name: "B + commitment/scenario persistence"
    expected_gate: true

  D:
    name: "B + what-if"
    expected_gate: true

  requirement:
    - "compare A/B/C/D"
    - "select smallest first slice matching EVAL-003 materiality"

Plaud_impact:

  requirement:
    - "map EVAL-003 intents to proposed composition"
    - "estimate which become anticipated/prepared"
    - "do not alter EVAL metrics yet"
    - "do not alter matrix"

contract_gate:

  inspect:
    - "G3"
    - "Index"
    - "EKE"
    - "Capabilities"
    - "pre_meeting docs"

  determine:
    - "whether PRE_CLOSE composition can be implemented under existing contracts"
    - "whether new commitment/scenario persistence would require a new gate"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

readiness_output:

  must_determine:
    - "canonical composition architecture"
    - "single vs multi-plant first slice"
    - "current section shape"
    - "target section shape"
    - "base forecast section shape"
    - "risk layer"
    - "gap layer"
    - "decision-needed layer"
    - "data-quality behavior"
    - "commitment-history readiness"
    - "scenario-history readiness"
    - "what-if readiness"
    - "authz"
    - "routing"
    - "follow-ups"
    - "council compatibility"
    - "live-copilot compatibility"
    - "first implementation slice"
    - "contract gate"
    - "READY / READY_WITH_LIMITS / STOPPED / BLOCKED"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code"
  - "tests"
  - "SQL"
  - "schema"
  - "new commitment store"
  - "new scenario store"
  - "what-if implementation"
  - "Plaud runtime"
  - "live meeting runtime"
  - "UI"
  - "IES"
  - "04"
  - "05"
  - "Constitution"
  - "matrix changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "PRE_CLOSE separated from FINAL."
  - "No forecast-as-actual."
  - "No meeting-statement-as-truth."
  - "Current/target/base forecast composition defined."
  - "Risk/gap/decision-needed layers defined."
  - "Single-vs-multi-plant first slice resolved."
  - "Commitment history status proven."
  - "Scenario history status proven."
  - "What-if readiness bounded."
  - "Council compatibility preserved."
  - "Live-copilot compatibility reserved without implementation."
  - "One first implementation slice selected."
  - "Contract gate determined."
  - "Baseline unchanged."
  - "Only CURRENT_TASK + report changed."
  - "git diff --check clean."

next_task_policy:

  if_ready:
    propose_exactly_one:
      "IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"

  if_contract_required:
    propose_exactly_one:
      "exact contract task"

  if_decision_required:
    propose_exactly_one:
      "exact decision task"

  rule:
    - "do not authorize"
    - "do not execute"

expected_terminal_state:
  - "DONE_PENDING_REVIEW"
  - "STOPPED"
  - "BLOCKED"

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md

execution_result:
  status: DONE_PENDING_REVIEW
  determination: READY_WITH_LIMITS
  architecture: "B_shared_executive_cycle_composer"
  multi_plant: "B_multi_plant_portfolio"
  decision_needed: "C_structured_gaps_plus_gpt_wording"
  first_slice: "B_multi_plant_pre_close"
  commitment_history: MISSING_INFRASTRUCTURE
  scenario_history: NOT_DEFENSIBLE
  what_if: unsafe_as_official_forecast
  contract_gate: first_slice_under_existing_contracts
  next_task_proposed: "IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
  next_task_authorized: false
  next_task_executed: false
  architecture_pending_still_frozen: true
  matrix: "10.5 / 20 = 52.5%"
  matrix_delta: "0.0 pp"