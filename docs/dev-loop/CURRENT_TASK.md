# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001
  y autorizo G1 exclusivamente para readiness/auditoría.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "READINESS_ONLY"
  implementation: false
  code_changes: false
  runtime_changes: false
  test_changes: false
  matrix_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Determinar el first slice mínimo y defendible para que Director IA pueda
  pasar desde IGF del mes actual a los Folios/apoyos de la misma planta y
  periodo, separando qué importes siguen siendo operacionalmente
  cancelables/revisables de aquellos que ya no pueden cancelarse según las
  reglas físicas actuales, y determinar si puede calcularse un escenario IGF
  contrafactual sin convertirlo en recomendación ni ahorro garantizado.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

prior_audit:
  task: "AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001"
  bottleneck: "no_igf_to_reviewable_apoyos_path"
  failure_class: "MISSING_INFRASTRUCTURE"

physical_findings_already_verified:

  folio_lifecycle:
    technical_states:
      - "GENERADO"
      - "PENDIENTE_APROB_PLANTA"
      - "APROB_PLANTA"
      - "PENDIENTE_APROB_ZP"
      - "APROBADO_ZP"
      - "LISTO_PARA_PROGRAMACION"
      - "SELECCIONADO_SEMANA"
      - "SOLICITANDO_PAGO"
      - "CUENTA_FONDOS"
      - "CHEQUE_GENERADO"
      - "PAGADO"
      - "CERRADO"
      - "COMPROBACIONES"
      - "EVIDENCIAS"
      - "CANCELACION_SOLICITADA"
      - "CANCELADO"

  visual_deposit_close:
    states:
      - "PAGADO"
      - "CERRADO"

  cancellation_rule_found:
    non_cancellable:
      - "PAGADO"
      - "CERRADO"
      - "COMPROBACIONES"
      - "EVIDENCIAS"

    important: >
      Existe runtime que rechaza cancelación en esos estados y permite llevar
      otros estados a CANCELADO, sujeto a authz/reglas del endpoint que esta
      readiness debe terminar de auditar.

  IGF_folio_components:
    observed:
      - "folios_aprob_zp_kg"
      - "folios_carro_kg"
      - "deposito_cierre_kg"

    gasto_formula_observed: >
      gasto_kg incorpora presupuesto_kg + folios_aprob_zp_kg +
      folios_carro_kg + deposito_cierre_kg antes de recalcular resultado.

  support_classification:
    categories_observed:
      - "GASTOS"
      - "INVERSIONES"
      - "TALLER"

    physical_fields:
      - "planta_id"
      - "categoria"
      - "importe"
      - "mes_cargo"

    warning: >
      Clasificación de apoyos no equivale por sí sola a reversibilidad.

north_star_conversation:
  turns:
    - "¿Cómo proyectamos cerrar el IGF de Puebla este mes?"
    - "¿Qué podemos recortar de apoyos?"
    - "¿Cuáles todavía podemos detener?"
    - "¿Cuánto suman?"
    - "¿Cuáles ya están depositados/cerrados?"
    - "¿Cuánto suman esos?"
    - "¿Qué folios conforman cada grupo?"
    - "Si canceláramos los que todavía se pueden detener, ¿cómo quedaría el IGF?"
    - "¿Cuáles revisarías primero?"
    - "¿Qué riesgo tendría cancelar cada uno?"

central_question: >
  ¿Las reglas físicas de cancelación actuales permiten definir una bolsa
  read-only REVIEWABLE/CANCELLABLE suficientemente defendible, y el cálculo
  actual de IGF permite producir un escenario contrafactual sin afirmar que
  cancelar $X sea automáticamente ahorro real $X?

mandatory_cancellation_audit:

  inspect:
    - "endpoint(s) de cancelación de folios"
    - "roles autorizados"
    - "plant scope"
    - "estatus permitidos"
    - "estatus bloqueados"
    - "CANCELACION_SOLICITADA semantics"
    - "direct CANCELADO semantics"
    - "historial generado al cancelar"
    - "any additional conditions beyond status"

  determine:
    - "si todos los estados no bloqueados son realmente cancelables"
    - "si algunos requieren solicitud/aprobación"
    - "si CHEQUE_GENERADO aún puede cancelarse"
    - "si CUENTA_FONDOS aún puede cancelarse"
    - "si SOLICITANDO_PAGO aún puede cancelarse"
    - "si cancelable depende de rol"

  rule: >
    No inferir REVIEWABLE únicamente de estatus hasta auditar las reglas
    completas de cancelación y authz.

reviewability_model_candidates:

  A_status_before_deposit:
    description: "todo lo anterior a PAGADO/CERRADO"

  B_runtime_cancellable:
    description: >
      exactamente estados para los que la operación de cancelación es válida
      bajo las reglas actuales.

  C_business_reviewable_subset:
    description: >
      subconjunto de B definido por reglas adicionales de negocio físicamente
      existentes.

  D_new_reviewable_flag:
    description: >
      introducir nuevo dato porque runtime actual no alcanza.

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente uno"
    - "preferir evidencia operacional existente si suficiente"

reviewable_output_if_supported:

  required_fields:
    - "folio id/código"
    - "concepto"
    - "categoria/subcategoria"
    - "importe"
    - "estatus técnico"
    - "etapa visual"
    - "mes_cargo"
    - "planta"
    - "cancelable_under_current_rules"
    - "reason/limitation"
    - "provenance"

  aggregates:
    - "count"
    - "total importe"

materialized_output:

  candidate_definition: >
    Estados donde cancelación ya está bloqueada por runtime, pero readiness debe
    determinar si todos ellos pueden llamarse financieramente materializados.

  important: >
    NON-CANCELLABLE != necesariamente contablemente materializado.

  required:
    - "separar operational cancellability de accounting materialization"

IGF_mapping_audit:

  mandatory:
    - "cómo se construye folios_aprob_zp_kg"
    - "qué estados entran en folios_carro_kg"
    - "qué estados entran en deposito_cierre_kg"
    - "qué pasa con CANCELADO"
    - "qué pasa con CANCELACION_SOLICITADA"
    - "mes_cargo"
    - "importe"
    - "venta_kg denominator"
    - "recalcularUtilYResultado"

  key_question: >
    Si un folio actualmente incluido en folios_aprob_zp/carrito se elimina por
    CANCELADO, ¿el cálculo existente del IGF deja físicamente de incluirlo al
    recalcular?

counterfactual_IGF:

  audit_not_assume: true

  candidate:
    description: >
      escenario hipotético read-only: excluir un conjunto de folios
      operacionalmente cancelables y reutilizar exactamente la matemática
      vigente de IGF.

  requirements:
    - "same plant"
    - "same mes_cargo"
    - "same forecast snapshot"
    - "same denominator/rules"
    - "no DB mutation"
    - "explicit hypothetical label"

  prohibited:
    - "modify actual IGF"
    - "call scenario a forecast oficial"
    - "claim realized savings"
    - "assume cash impact"
    - "assume one-for-one accounting effect unless existing IGF math proves it"

  desired_language_if_supported: >
    “Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas
    actuales, el escenario matemático del IGF sería X. Es un contrafactual, no
    una confirmación de ahorro realizado.”

cross_domain_routing:

  sequence:
    - "igf_status"
    - "¿Qué podemos recortar de apoyos?"

  audit:
    - "planner"
    - "coverage guard"
    - "folios capability"
    - "cheques blocker"
    - "conversation state"
    - "plant/period inheritance"

  desired:
    - "plant inherited/revalidated"
    - "current month inherited/revalidated"
    - "fresh Folios query"
    - "IGF evidence not reused as Folios evidence"

cheques_blocker:

  known_prior_finding: >
    Wording depósito/cierre puede caer en cheques coverage:none before planner.

  mandatory:
    - "trace this guard"
    - "determine minimal safe precedence"
    - "do not enable unrelated cheques capability"

support_scope:

  determine:
    - "whether 'apoyos' means all Folios categories or a specific subset"
    - "GASTOS vs INVERSIONES vs TALLER vs other Folio categories"
    - "which categories currently feed the IGF support calculation"

  rule: >
    Do not silently treat every Folio as apoyo if physical IGF semantics differ.

ranking_boundary:

  first_slice_must_not:
    - "recommend cancellation"
    - "rank by commercial ROI"
    - "claim risk"

  allowed:
    - "list largest reviewable amounts"
    - "list by status/category"
    - "say which deserve human review based on objective materiality only if clearly labeled"

commercial_risk:
  status: "DEFER unless physical links are sufficient"

  audit:
    - "folio -> client linkage"
    - "cliente_key"
    - "comments"
    - "actions"
    - "sales"

  rule: >
    Do not let this requirement block a safe first slice of reviewable supports
    if linkage is not physically ready.

temporal_IGF_boundary:

  preserve_prior_finding:
    - "current open month forecast"
    - "past closed month real"
    - "historical forecast only if stored"

  scope_for_this_slice: >
    Current open-month IGF -> reviewable supports.

  rule: >
    Do not expand implementation slice to fix closed-month semantics unless it
    is required for this path.

authz:

  mandatory:
    - "folio read authz"
    - "cancellation authz is evidence for reviewability but Director IA remains read-only"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

read_only_invariant:
  critical: >
    Director IA must NOT cancel, move, approve or mutate Folios.
    It only reports what current operational rules indicate could still be
    cancelled/reviewed.

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "folio identity"
    - "status"
    - "current cancellation eligibility"
    - "amount"
    - "plant"
    - "mes_cargo"
    - "IGF math"
    - "hypothetical recomputation if proven"
    - "authz"
    - "provenance"

  LET_GPT_REASON:
    - "executive explanation"
    - "summarization"
    - "what to review"
    - "limitations"
    - "follow-ups"

  PROHIBITED:
    - "automatic cancellation recommendation"
    - "claim savings realized"
    - "invent business risk"

solution_candidates:

  A_routing_only:
    description: >
      Expose existing folio stage aggregates to IGF conversation.

  B_reviewable_folios_read_model:
    description: >
      Build read-only model from physical cancellation rules and Folio rows.

  C_reviewable_plus_IGF_counterfactual:
    description: >
      B plus exact read-only IGF scenario if existing math supports it.

  D_new_business_flag:
    description: >
      Require persisted reviewable/reversible data before answering.

  requirement:
    - "compare A/B/C/D"
    - "select exactly one first slice"
    - "do not choose C unless counterfactual reconciles with existing IGF math"

tests_to_design_if_ready:

  lifecycle:
    - "each technical status classification"
    - "blocked cancellation states"
    - "allowed cancellation states"
    - "role/authz distinctions"

  query:
    - "same plant"
    - "same mes_cargo"
    - "cancelled excluded"
    - "amount totals"

  conversation:
    - "IGF -> qué apoyos puedo revisar"
    - "cuáles aún no se depositan"
    - "cuáles ya no puedo detener"
    - "cuánto suman"

  counterfactual_if_selected:
    - "remove eligible folio"
    - "reconcile resulting IGF math"
    - "no mutation"

  regression:
    - "IGF"
    - "Folios"
    - "budget"
    - "daily conversations"
    - "full Director IA suite"

contract_audit:
  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D"
    - "physical reviewability definition"
    - "role/authz implications"
    - "support category scope"
    - "IGF inclusion/exclusion semantics"
    - "counterfactual feasibility"
    - "routing fix"
    - "cheques guard handling"
    - "first slice exact boundary"
    - "G2/G3"
    - "percentage effect"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "to be determined only if module completeness changes"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "mutation"
  - "cancel Folio"
  - "schema"
  - "SQL execution"
  - "contracts modification"
  - "matrix modification"
  - "automatic recommendations"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Cancellation lifecycle physically audited."
  - "Reviewable != merely undeposited."
  - "Operational cancellability vs accounting materialization separated."
  - "IGF Folio components physically audited."
  - "Cancelled behavior audited."
  - "Cross-domain routing audited."
  - "Cheques guard audited."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "Counterfactual only if mathematically proven."
  - "Read-only invariant explicit."
  - "G2/G3 determined."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if one safe implementable slice exists.
  STOPPED if business semantics require human decision.
  BLOCKED if physical data is insufficient.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md