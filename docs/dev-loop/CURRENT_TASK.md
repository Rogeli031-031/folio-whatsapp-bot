# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice C aprobado para que Director IA pueda pasar desde
  IGF del mes actual a una lectura read-only de Folios/apoyos reviewable según
  reglas operativas reales de cancelación, listar qué sigue siendo cancelable y
  qué ya no lo es, y calcular un escenario IGF contrafactual usando exactamente
  la matemática vigente del dashboard, sin mutar datos, sin recomendar
  cancelaciones y sin afirmar ahorro/cash realizado.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

readiness:
  task: "ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
  determination: "READY_WITH_LIMITS"
  first_slice: "C — reviewable Folios read model + IGF counterfactual"

truth_model:

  operational_reviewable:
    meaning: >
      Folio que, bajo las reglas actuales del sistema, todavía puede llegar a
      CANCELADO.

  non_cancellable_states:
    - "PAGADO"
    - "CERRADO"
    - "COMPROBACIONES"
    - "EVIDENCIAS"

  cancelled:
    status: "CANCELADO"
    reviewable: false
    include_in_current_IGF: false

  critical_invariant: >
    cancelable operacional != materializado contable != ahorro realizado.

read_only_invariant:
  absolute: true

  prohibited:
    - "cancelar"
    - "solicitar cancelación"
    - "mover etapa"
    - "aprobar"
    - "editar Folio"
    - "actualizar IGF"
    - "persistir escenario"
    - "cualquier write"

  rule: >
    Director IA solo consulta y calcula escenarios hipotéticos en memoria.

reviewable_classification:

  classify_each_folio:
    required_fields:
      - "id"
      - "numero_folio / folio_codigo if available"
      - "planta_id"
      - "mes_cargo"
      - "importe"
      - "estatus"
      - "categoria"
      - "subcategoria"
      - "concepto/beneficiario if physically available"

  rules:
    cancelled:
      condition: "estatus = CANCELADO"
      group: "excluded"

    non_reviewable:
      condition:
        - "PAGADO"
        - "CERRADO"
        - "COMPROBACIONES"
        - "EVIDENCIAS"
      group: "not_cancellable"

    reviewable:
      condition: >
        Todo estado restante que la regla operacional real de cancelación
        permite cancelar bajo authz vigente.

  important: >
    No simplificar a “no depositado”.

authz:

  required:
    - "current role"
    - "current plant"
    - "plantas_permitidas"
    - "fail-closed"
    - "same plant as IGF context"

  note: >
    El rol determina quién puede actuar en el sistema, pero Director IA sigue
    read-only. La clasificación debe respetar la misma realidad operacional.

support_scope:

  determine_from_runtime:
    include_only:
      - "Folios del mismo periodo/mes_cargo"
      - "Folios de la misma planta"
      - "categorías que físicamente alimentan el cálculo IGF de apoyos"

  prohibited:
    - "incluir cualquier Folio solo porque existe"
    - "inventar que todo Folio es apoyo"

  preserve_categories:
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"
    - "otras solo si el cálculo live IGF las incluye físicamente"

IGF_live_math:

  preserve_exactly:
    - "folios_aprob_zp_kg"
    - "folios_carro_kg"
    - "deposito_cierre_kg"
    - "gasto_kg"
    - "recalcularUtilYResultado"

  rule: >
    Reutilizar la misma semántica de agrupación y matemática del GET/dashboard.
    No crear una fórmula paralela simplificada.

counterfactual:

  type: "read-only hypothetical"

  question:
    canonical: >
      Si canceláramos los apoyos que todavía se pueden detener,
      ¿cómo quedaría el IGF?

  algorithm:
    - "partir del mismo snapshot/contexto IGF vigente"
    - "identificar Folios reviewable físicamente incluidos"
    - "simular su exclusión SIN DB write"
    - "recalcular usando la misma matemática live"
    - "producir before / hypothetical-after / delta"

  required_output:
    - "igf_current"
    - "reviewable_folios_total"
    - "reviewable_folios_count"
    - "igf_counterfactual"
    - "delta_counterfactual"
    - "folios_included_in_scenario"
    - "limitations"

  labeling:
    mandatory:
      - "ESCENARIO HIPOTÉTICO"
      - "NO ahorro realizado"
      - "NO cambio real al IGF"
      - "NO recomendación automática"

  prohibited_claims:
    - "ahorrarías X"
    - "el resultado real mejorará X"
    - "cash aumenta X"
    - "contablemente se revierte X"
    - "debes cancelar estos folios"

  safe_language: >
    “Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas
    actuales, el escenario matemático del IGF sería X.”

cross_domain_routing:

  canonical_sequence:
    - "¿Cómo proyectamos cerrar el IGF de Puebla este mes?"
    - "¿Qué podemos recortar de apoyos?"

  desired_transition:
    - "igf_status/current IGF context"
    - "reviewable supports read model"
    - "same plant"
    - "same current/open period"
    - "fresh Folios query"

  rule: >
    IGF context aporta planta/periodo y propósito. Folios aporta evidencia de
    reviewability.

conversation_state:

  required:
    - "preserve/revalidate plant"
    - "preserve/revalidate current open month"
    - "switch parent/effective intent to reviewable supports path"
    - "fresh Folios evidence"
    - "previous IGF evidence not reused as Folios evidence"

new_runtime_capability:

  preferred_name: "igf_reviewable_supports"

  intent:
    decision: >
      Reutilizar intent existente si es defendible; introducir intent nuevo solo
      si la implementación necesita un parent canónico claro y la readiness/code
      demuestra que no puede representarse con los existentes.

  warning: >
    No crear arquitectura lateral innecesaria.

loaders:

  preferred:
    - "loadIgfReviewableSupportsForChat"
    - "buildIgfReviewableSupportsPack"

  may_reuse:
    - "existing Folio queries/helpers"
    - "existing IGF calculation helpers"

  prohibited:
    - "HTTP interno"
    - "duplicar lógica de cancelación"
    - "duplicar matemática IGF si puede extraerse/reutilizarse"

cheques_guard:

  issue: >
    “depósito/cierre” hoy puede caer en cheques coverage:none antes del planner.

  required:
    - "resolver solo la precedencia necesaria para esta conversación"
    - "no habilitar módulo cheques"
    - "no alterar unrelated cheques behavior"

conversation_examples:

  required_flow:
    - "¿Cómo proyectamos cerrar el IGF de Puebla este mes?"
    - "¿Qué podemos recortar de apoyos?"
    - "¿Cuáles todavía podemos detener?"
    - "¿Cuánto suman?"
    - "¿Cuáles ya no puedo cancelar?"
    - "¿Cuáles ya están depositados/cerrados?"
    - "Si canceláramos los reviewable, ¿cómo quedaría el IGF?"
    - "¿Cuáles revisarías primero?"
    - "¿Qué riesgo tendría cancelar esos?"

  expected_boundary:
    first_seven: >
      deben responder con evidencia física y escenario matemático si soportado.

    review_first:
      behavior: >
        Puede ordenar por materialidad objetiva/importe o etapa solo si se
        presenta como “para revisión”, no “recomiendo cancelar”.

    commercial_risk:
      behavior: >
        Si no existe vínculo físico suficiente con cliente/ventas/comentarios,
        debe decir qué información falta.

reasoning_boundary:

  runtime_owns:
    - "folio states"
    - "reviewable classification"
    - "amounts"
    - "plant"
    - "period"
    - "IGF grouping"
    - "counterfactual math"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT_owns:
    - "executive synthesis"
    - "explanation"
    - "what deserves review"
    - "limitations"
    - "what information is missing"
    - "follow-ups"

  prohibited:
    - "automatic business decision"
    - "automatic cancellation recommendation"
    - "invented commercial risk"

materialization_boundary:

  not_cancellable_label:
    preferred: "ya no cancelable bajo reglas actuales"

  avoid_unless_proven:
    - "materializado contablemente"
    - "ya gastado"
    - "ya pagado" for non-PAGADO states
    - "irreversible accounting expense"

  rule: >
    Operational status wording must remain separate from accounting claims.

absence_error_semantics:

  distinguish:
    - "no reviewable Folios"
    - "no Folios in period"
    - "source restricted"
    - "query/tool error"
    - "missing IGF denominator/context"

  rule: >
    No convertir ausencia/error en total cero sin evidencia.

preserve:
  - "IGF existing behavior"
  - "Folios existing workflow"
  - "daily sales"
  - "daily discount"
  - "cross-metric followup"
  - "topic return"
  - "action-person"
  - "persistent memory"
  - "M9"

deferred:
  - "closed-month IGF semantic fix"
  - "historical forecast comparison"
  - "client-level commercial risk"
  - "automatic ranking by ROI"
  - "folio mutation"
  - "approval/cancellation workflows from Director IA"

tests_required:

  reviewability:
    - "PAGADO not cancellable"
    - "CERRADO not cancellable"
    - "COMPROBACIONES not cancellable"
    - "EVIDENCIAS not cancellable"
    - "CANCELADO excluded"
    - "eligible states classified reviewable"
    - "role/plant authz respected"

  scope:
    - "same planta"
    - "same mes_cargo"
    - "support categories consistent with IGF"
    - "cancelled excluded"

  IGF:
    - "same live math"
    - "reviewable exclusion changes appropriate cube"
    - "recalculated result reconciles"
    - "no DB mutation"

  conversation:
    - "IGF -> apoyos"
    - "list reviewable"
    - "list non-cancellable"
    - "totals"
    - "counterfactual"
    - "commercial risk gap"

  guard:
    - "depósito/cierre wording does not fall to unrelated cheques coverage:none"

  regression:
    - "IGF"
    - "Folios"
    - "daily conversations"
    - "action-person"
    - "topic return"
    - "planner"
    - "capabilities"
    - "orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-igf-reviewable-supports.js"
    - "test/director-ia-igf-reviewable-supports.test.js"

  conditional_writable:
    - "server.js only if extracting a pure read/helper is strictly necessary and behavior stays unchanged"
    - "existing Director IA tests/scripts if legitimate regression assertions require updates"

  read_only:
    - "docs/director-ia/**"
    - "sql/**"
    - "frontend-dashboard/**"
    - "contracts"

out_of_scope:
  - "writes"
  - "cancel endpoint use"
  - "schema"
  - "new tables"
  - "SQL execution"
  - "automatic recommendation"
  - "commercial-risk engine"
  - "closed-month IGF fix"
  - "matrix changes"
  - "contract changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "First slice C implemented."
  - "Reviewable uses real cancellation rules."
  - "No 'undeposited = cancellable' shortcut."
  - "Non-cancellable states preserved."
  - "Cancelled excluded."
  - "Same plant/period enforced."
  - "IGF live math reused."
  - "Counterfactual read-only."
  - "No mutation."
  - "No savings/cash claim."
  - "Cross-domain conversation works."
  - "Cheques guard no longer blocks this path."
  - "Commercial-risk gap remains honest."
  - "52.5% preserved unless matrix policy independently proves otherwise."
  - "Tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md