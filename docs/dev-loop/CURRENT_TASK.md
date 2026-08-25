# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "REAL_MEETING_EVALUATION_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false
  plaud_runtime_integration: false

objective: >
  Evaluar el pre_meeting_brief y las capacidades conversacionales actuales de
  Director IA contra preguntas, tensiones y decisiones observadas realmente en
  juntas históricas de cierre/resultados registradas en Plaud.

  No diseñar preguntas hipotéticas.
  No integrar Plaud al runtime.
  No implementar.

baseline:
  coverage: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"
  conversation: "CONVERSATION_BASE_READY_WITH_LIMITS"

capability_under_evaluation:
  intent: "pre_meeting_brief"

  current_first_slice:
    - "commercial"
    - "open-month IGF"
    - "actions"
    - "IGF reviewable supports"
    - "information gaps"

historical_source_packet:

  provenance: >
    Curated from the user's authorized Plaud recordings. The source packet is
    evaluation evidence, not Director IA runtime input.

  meetings:

    Puebla:
      plaud_id: "acb82204db845a58c88e77d13ad6c811"
      title: "07-02 Revisión Operativa y Estratégica de la Planta de Puebla"

      observed_topics:
        - "seguimiento de minuta anterior"
        - "venta y comportamiento del mes"
        - "rentabilidad"
        - "comisiones"
        - "clientes"
        - "venta por canal"
        - "venta directa vs comisionistas"
        - "competencia/huachicol"
        - "capacidad de suministro"
        - "infraestructura/manifold"
        - "cartera"
        - "acciones antes de siguiente junta"

      observed_question_patterns:
        - "¿Cómo salió la venta?"
        - "¿La autoridad seguirá afectando el mercado?"
        - "¿Esto debe repercutir en la venta?"
        - "¿La venta se puede disparar?"
        - "¿Cómo andamos de clientes?"
        - "¿Podemos soportar el crecimiento sin quedarnos sin suministro?"
        - "¿Qué quedó de la minuta anterior?"

    Acapulco:
      plaud_id: "8a4da12596cec82cf21ec66f0c85065a"
      title: "07-03 Revisión de Resultados de Planta Acapulco - Junio 2026"

      observed_topics:
        - "meta de venta vs resultado"
        - "tendencia decreciente"
        - "cliente perdido"
        - "nuevos clientes"
        - "venta casa"
        - "rentabilidad vs volumen"
        - "comisiones/descuento"
        - "cartera"
        - "gastos e inversiones"
        - "meta siguiente"
        - "acciones de recuperación"

      observed_question_intents:
        - "¿Por qué no se alcanzó la meta?"
        - "¿La caída es coyuntural o tendencia?"
        - "¿Qué clientes explican la pérdida?"
        - "¿Estamos sacrificando volumen por rentabilidad?"
        - "¿Por qué crecieron gastos/inversiones?"
        - "¿Qué acciones concretas recuperarán el volumen?"
        - "¿La meta del siguiente mes es defendible?"

    Morelos:
      plaud_id: "0580ae51fcdffbb124c3e5f69523c877"
      title: "07-03 Revisión de Resultados de Junio y Planificación para Julio de la Unidad de Morelos"

      observed_topics:
        - "venta superior a meta"
        - "comisiones superiores a objetivo"
        - "rentabilidad deteriorada"
        - "venta directa vs comisionistas"
        - "clientes nuevos/perdidos"
        - "cartera"
        - "CRM/prospectos"
        - "acciones"
        - "meta siguiente"

      observed_question_intents:
        - "Si vendimos más, ¿por qué cayó la rentabilidad?"
        - "¿Qué pasó con comisiones/descuentos?"
        - "¿Qué canal está erosionando margen?"
        - "¿Qué clientes ganamos y cuáles perdimos?"
        - "¿Cómo compensaremos la baja esperada de un cliente?"
        - "¿Qué debe corregirse antes de la siguiente junta?"

    Queretaro_San_Luis:
      plaud_id: "2a2cd8cb5ecc4cb5dd53764ef85c6811"
      title: "07-03 Análisis de Resultados y Planes de Acción para Querétaro y San Luis"

      observed_topics:
        - "más volumen pero pérdida operativa"
        - "mix CASA/comisionistas"
        - "descuento/comisión"
        - "margen"
        - "prospectos"
        - "punto de equilibrio"
        - "productividad por unidad"
        - "acciones"
        - "meta siguiente"

      observed_question_intents:
        - "¿Cómo podemos vender más y perder dinero?"
        - "¿Qué cambió en el mix de canales?"
        - "¿Qué efecto tuvieron descuentos/comisiones?"
        - "¿Qué clientes/prospectos pueden cerrar la brecha?"
        - "¿Qué necesitamos vender para llegar al equilibrio?"
        - "¿Qué compromisos deben cumplirse el siguiente mes?"

truth_boundary:

  meeting_statement: >
    A statement made in the meeting is a recorded declaration/context, not
    automatically a verified causal fact.

  meeting_question: >
    A question proves executive information demand; it does not prove that the
    answer available in the meeting was correct.

  hindsight: >
    Do not assume Director IA could know before the meeting information first
    introduced during the meeting.

evaluation_unit:
  definition: >
    One executive question/intent or one defensible information need observed
    in a historical meeting.

classification:

  ANTICIPATED:
    definition: >
      pre_meeting_brief could surface the required fact/risk before the meeting
      using currently available capabilities and evidence.

  GAP_DETECTED:
    definition: >
      It could not answer the issue, but could correctly identify that an
      explanation/context/update was missing before the meeting.

  FOLLOWUP_ANSWERABLE:
    definition: >
      It need not appear in the initial brief, but a natural follow-up can be
      answered by an existing canonical capability.

  PARTIALLY_ANSWERABLE:
    definition: >
      Some requested facts exist, but an important component is unavailable or
      semantically unsafe.

  MISSING_CAPABILITY:
    definition: >
      Physical data exists, but Director IA currently lacks the read
      model/orchestration/routing to answer.

  MISSING_DATA:
    definition: >
      Required physical data is not available in current sources.

  NOT_DEFENSIBLE_AS_OF:
    definition: >
      Current repository/data may know it now, but there is no defensible basis
      that the information was available before the historical meeting.

mandatory_evaluation_domains:

  sales_and_targets:
    examples:
      - "actual vs target"
      - "month trend"
      - "daily movement"
      - "channel mix"

  discount_and_margin:
    examples:
      - "discount/kg"
      - "commission pressure"
      - "rentability tension"

  clients:
    examples:
      - "largest movers"
      - "lost customers"
      - "new customers"
      - "longitudinal behavior"
      - "comments/context"

  financial:
    examples:
      - "IGF current projection"
      - "financial pressure"
      - "actual vs projection boundary"

  actions:
    examples:
      - "prior commitments"
      - "overdue actions"
      - "missing closure/result"

  supports:
    examples:
      - "reviewable Folios"
      - "operational cancelability"
      - "hypothetical IGF"

  operations:
    audit_only:
      - "supply capacity"
      - "route productivity"
      - "infrastructure"
      - "Taller Mayor"

  external_context:
    examples:
      - "competition"
      - "authority"
      - "tourism"
      - "market conditions"

    rule: >
      These may depend on declarations/current intelligence and must not be
      converted into causal facts automatically.

question_family_audit:

  family_1:
    intent: "WHAT_HAPPENED"
    examples:
      - "¿Cómo nos fue?"
      - "¿Cómo cerramos?"

  family_2:
    intent: "WHY"
    examples:
      - "¿Por qué cayó?"
      - "¿Por qué vendimos más pero ganamos menos?"

  family_3:
    intent: "WHO_MOVED_IT"
    examples:
      - "¿Qué cliente?"
      - "¿Qué canal?"

  family_4:
    intent: "WHAT_CHANGED"
    examples:
      - "¿Qué cambió en descuento/comisión/mix?"

  family_5:
    intent: "WHAT_IS_OPEN"
    examples:
      - "¿Qué quedó pendiente?"
      - "¿Qué acciones siguen abiertas?"

  family_6:
    intent: "WHAT_NEXT"
    examples:
      - "¿Qué vamos a hacer?"
      - "¿La siguiente meta es defendible?"

  family_7:
    intent: "WHAT_IS_MISSING"
    examples:
      - "¿Qué no podemos explicar todavía?"
      - "¿Qué comentario necesito antes de la junta?"

pre_meeting_coverage_audit:

  for_each_real_intent:
    determine:
      - "initial brief section that could surface it"
      - "existing canonical follow-up capability"
      - "physical evidence needed"
      - "whether available before meeting"
      - "classification"
      - "limitation"

  prohibit:
    - "crediting the initial brief for a capability only reachable after an unrelated manual investigation"
    - "crediting hindsight-only facts"

anticipation_metrics:

  audit_only: true

  calculate:
    total_real_intents: "N"

    anticipated_rate:
      formula: "ANTICIPATED / N"

    prepared_rate:
      formula: >
        (ANTICIPATED + GAP_DETECTED + FOLLOWUP_ANSWERABLE) / N

    unsupported_rate:
      formula: >
        (MISSING_CAPABILITY + MISSING_DATA + NOT_DEFENSIBLE_AS_OF) / N

  rule: >
    Report counts and percentages, but do not turn them into a permanent product
    KPI without separate authorization.

critical_test:
  question: >
    Would the current pre_meeting_brief have alerted the director to the main
    tensions actually discussed in these meetings before the meeting began?

  inspect:
    - "sales vs target"
    - "trend direction"
    - "CASA/comisionista mix"
    - "discount pressure"
    - "top client movers"
    - "open/vencida actions"
    - "IGF pressure"
    - "reviewable supports"
    - "missing explanations"

information_gap_quality:

  high_value_case: >
    If the real meeting later supplied an explanation that was not physically
    available before the meeting, give credit to Director IA only if it could
    have detected the missing explanation.

  example:
    before: "client volume dropped; no recent explanation"
    meeting: "manager says tourism caused the decline"

  correct_pre_meeting_output: >
    “El cliente/segmento cayó y no encuentro evidencia suficiente que explique
    la causa. Conviene obtener contexto antes de la junta.”

  incorrect:
    - "invent tourism as cause"
    - "use post-meeting statement as pre-meeting evidence"

action_continuity:

  audit:
    - "meeting discussed prior commitments"
    - "current Action Register paths"
    - "whether pre_meeting_brief surfaces overdue/open actions"
    - "whether result/closure absence becomes information gap"

monthly_close_limitations:

  mandatory:
    - "current pre_meeting first slice is open month"
    - "historical close reconstruction is not automatically valid"
    - "do not fail audit simply because historical as-of replay is impossible"

  evaluation_mode: >
    Capability coverage evaluation, not exact historical financial replay, unless
    repository contains defensible as-of data.

real_meeting_pattern_output:

  produce:
    - "recurring executive question families"
    - "recurring data demands"
    - "recurring missing-context demands"
    - "recurring action/commitment demands"

  purpose: >
    Establish what a real Director IA preparation must consistently cover.

single_bottleneck:
  exactly_one: true

  selection_rule: >
    Select the largest demonstrated gap between current pre_meeting preparation
    and real executive meeting demand.

  required:
    - "name"
    - "failure_class"
    - "real meeting evidence"
    - "affected question families"
    - "physical/runtime cause"
    - "what fixing it unlocks"
    - "what it does not solve"

  do_not_select:
    - "a gap only because it appears in one meeting"
    - "missing physical data as infrastructure"
    - "hindsight-only information"

conversation_readiness:
  preserve: "CONVERSATION_BASE_READY_WITH_LIMITS"

  question: >
    Do real meeting questions reveal a new structural conversation failure?

  if_no: >
    State explicitly that the remaining gap is executive/domain intelligence,
    not conversational substrate.

Plaud_boundary:
  runtime: false
  repository_integration: false

  this_task: >
    Plaud-derived source packet is evaluation evidence only.

  no:
    - "API integration"
    - "transcript storage"
    - "automatic import"
    - "meeting memory implementation"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests"
  - "Plaud runtime integration"
  - "database writes"
  - "SQL execution"
  - "schema"
  - "contracts"
  - "matrix changes"
  - "permanent meeting KPI"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Real-meeting source packet used."
  - "No invented hypothetical meeting questions used as primary evidence."
  - "Question families extracted."
  - "Current pre_meeting_brief mapped against real demand."
  - "ANTICIPATED/GAP_DETECTED/FOLLOWUP_ANSWERABLE/etc classifications applied."
  - "Hindsight leakage explicitly controlled."
  - "Prepared-rate audit calculated."
  - "Conversation-base status reassessed."
  - "Exactly one demonstrated bottleneck selected."
  - "Exactly one NEXT_TASK proposed."
  - "52.5% preserved."
  - "Only task + report changed."
  - "git diff --check clean."

next_task:
  exactly_one: true
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md