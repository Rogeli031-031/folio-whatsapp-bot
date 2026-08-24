# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G8_calibration_materiality_signature: N/A

objective: >
  Determinar el slice mínimo, físicamente soportado y contractualmente válido
  para que plant_diagnosis deje de limitarse a enumerar evidencia y pueda
  producir priorización ejecutiva accionable: qué requiere atención primero,
  por qué importa, qué evidencia lo soporta, qué está desatendido, qué siguiente
  paso conviene y qué incertidumbre permanece. Auditar además trade-offs
  económicos, reducción de incertidumbre, antes→acción→después, agenda del
  Director y seguimiento/repriorización, sin inventar causalidad, scoring,
  rentabilidad ni Recommendation N5.

baseline:
  global:
    numerator: 10.5
    denominator: 20
    percentage: 52.5

  current_runtime:
    intent: "plant_diagnosis"
    sources:
      - "action_register"
      - "dicf"
      - "bitacora"
      - "arr"
      - "igf"
      - "commercial_state"

    m9: false
    openai_calls: 1
    provenance: "separada por fuente"
    commercial_state: "SELECT-only arr.dicf_cliente_mes"

  known_gap: >
    El runtime puede reunir evidencia pero no tiene un paso explícito y
    verificable que convierta esa evidencia en materialidad, excepciones,
    prioridades y siguientes pasos ejecutivos.

contract_baseline:
  known:
    - "Constitución V.14 ya contempla Recommendation."
    - "05 §12 contempla Recommendation anclada a IES y condicionada."
    - "Reasoning Engine N5 consume IES válido."
    - "El chat legado no es N5 y no debe fingir objetos Recommendation N5."

  audit_required:
    - "verificar texto físico de Constitución/04/05"
    - "determinar exactamente qué puede hacer el chat legado"
    - "determinar si G2/G3 siguen N/A"
    - "no reabrir contratos por conveniencia"

central_principle: >
  Director IA no debe optimizar una métrica aislada. Una pérdida de volumen
  puede no justificar recuperación si la condición necesaria destruye margen
  o resultado. Priorizar atención no equivale a afirmar causalidad ni a
  autorizar una decisión comercial.

executive_chain:
  audit:
    - "evidence"
    - "finding"
    - "materiality"
    - "exception"
    - "trade_off"
    - "priority"
    - "recommended_next_step"
    - "human_decision"
    - "follow_up"
    - "observed_result"
    - "reprioritization"

capability_1_executive_compression:
  question: >
    ¿Puede separar lo material de lo secundario en vez de enumerar todo?

  examples:
    weak: >
      40 clientes disminuyeron.

    target: >
      40 clientes disminuyeron, pero los N principales concentran X% de la
      pérdida observable.

  audit:
    - "kg_mes_real"
    - "kg_mes_forecast"
    - "magnitudes comparables"
    - "sumas/participaciones físicamente válidas"
    - "top-N"
    - "concentración"

  rules:
    - "no mezclar unidades"
    - "no convertir forecast automáticamente en pérdida real"
    - "definir denominador"
    - "mostrar periodo"
    - "mostrar base de comparación"

capability_2_unattended_exception:
  question: >
    ¿Puede distinguir un problema observado de un problema sin cobertura
    de seguimiento?

  audit:
    - "cliente con caída + acción DICF"
    - "cliente con caída sin acción"
    - "acción abierta"
    - "acción vencida"
    - "acción cerrada"
    - "resultado_cierre"
    - "responsable almacenado"

  target_categories_hypothesis:
    - "material_without_action"
    - "material_with_open_action"
    - "material_with_overdue_action"
    - "material_with_closed_action"
    - "material_with_unknown_outcome"

  rule: >
    Estas categorías son hipótesis de runtime para auditar; no crear contrato
    ni taxonomía permanente sin evidencia.

capability_3_uncertainty_reduction:
  principle: >
    Cuando no se conozca la causa, Director IA debe poder recomendar el
    siguiente paso que reduzca incertidumbre, en lugar de inventar explicación.

  examples:
    - "validar motivo con cliente"
    - "confirmar condición de competencia"
    - "obtener dato faltante"
    - "pedir resultado de acción"
    - "revisar excepción"

  forbidden:
    - "inventar motivo"
    - "presentar comentario como causa"
    - "presentar hipótesis como hecho"

capability_4_economic_tradeoffs:
  question: >
    ¿Puede detectar que recuperar volumen puede destruir valor económico?

  mandatory_case: >
    Un cliente importante dejó de comprar. Existe evidencia almacenada que
    sugiere una oferta más agresiva de la competencia. Igualarla podría
    deteriorar el margen o volver económicamente inconveniente la recuperación.
    ¿Qué puede afirmar y qué debería recomendar Director IA?

  audit_physical_data:
    - "kg_mes_real"
    - "kg_mes_forecast"
    - "ingreso_forecast"
    - "ARR"
    - "IGF"
    - "discount/delta fields disponibles"
    - "condición comercial almacenada si existe"
    - "margen/contribución físicamente disponible si existe"
    - "comentarios/evidencia de oferta competidor"

  mandatory_determinations:
    - "si existe costo de recuperación físicamente calculable"
    - "si existe margen incremental físicamente calculable"
    - "si existe límite comercial almacenado"
    - "si puede compararse recuperar vs no recuperar"
    - "qué dato falta si no puede calcularse"
    - "qué unidad usa cada dato"

  forbidden:
    - "inventar oferta de competencia"
    - "inventar margen"
    - "inventar costo de recuperación"
    - "inventar umbral rentable"
    - "margen negativo => abandonar cliente automáticamente"
    - "volumen mayor => prioridad comercial automática"

  target_behavior: >
    Si la evidencia económica es insuficiente, la recomendación correcta puede
    ser obtener la condición comercial faltante y calcular la sostenibilidad
    antes de autorizar descuento.

capability_5_alternative_comparison:
  question: >
    ¿Puede comparar opciones sin convertirlas en mandato?

  target_shape_hypothesis:
    option_a:
      action: "recuperar/negociar"
      observable_benefit: "si físicamente calculable"
      observable_cost: "si físicamente calculable"
      uncertainty: "explícita"

    option_b:
      action: "no igualar todavía"
      observable_benefit: "si físicamente calculable"
      observable_cost: "si físicamente calculable"
      uncertainty: "explícita"

    option_c:
      action: "obtener evidencia adicional"
      information_gain: "qué incertidumbre reduce"

  rule: >
    No construir simulador financiero nuevo en este readiness.

capability_6_before_action_after:
  question: >
    ¿Puede reconstruir antes → acción → después sin afirmar causalidad?

  audit:
    - "commercial_state por periodos"
    - "dicf_actions timestamps"
    - "action_history"
    - "resultado_cierre"
    - "revision notes si aplican"
    - "M9 solo si físicamente necesario; no incorporarlo por inercia"

  target: >
    Mostrar cambio observado posterior a una intervención y describir asociación
    temporal, nunca eficacia causal no demostrada.

  forbidden:
    - "la acción causó la recuperación"
    - "la acción funcionó"
    - "atribución causal sin evidencia"

capability_7_director_agenda:
  question: >
    ¿Puede producir una agenda corta de asuntos que realmente requieren
    atención del Director?

  target:
    max_items_to_audit: 3
    each_item:
      - "finding"
      - "why_it_matters"
      - "materiality_basis"
      - "coverage/status"
      - "recommended_next_step"
      - "evidence"
      - "uncertainty"

  also_determine:
    - "qué puede suprimirse por baja materialidad"
    - "qué debe escalarse"
    - "qué requiere atención operativa pero no del Director"

  rule: >
    No fijar max_items=3 como contrato; auditarlo como UX ejecutiva.

capability_8_followup_reprioritization:
  question: >
    ¿Puede revisar posteriormente si el asunto ya obtuvo cobertura o cambió
    materialmente?

  target_example: >
    El lunes el cliente era una pérdida material sin acción. Hoy existe una
    acción abierta con responsable y vencimiento; el hallazgo conserva impacto
    comercial pero ya no está desatendido.

  audit:
    - "qué memoria/evidencia física permite seguimiento"
    - "si necesita persistir recomendaciones"
    - "si puede hacerlo sin persistencia nueva"
    - "si seguimiento pertenece a otro slice"

  important: >
    No implementar almacenamiento nuevo de recomendaciones en este slice.

materiality_model:
  principle: >
    Materialidad debe derivarse de hechos comparables y explicarse. No crear
    un número mágico que mezcle dimensiones incompatibles.

  candidate_dimensions:
    - "volumen"
    - "ingreso"
    - "margen/contribución si existe"
    - "concentración"
    - "desviación"
    - "vencimiento"
    - "ausencia de cobertura"
    - "urgencia almacenada"

  audit:
    for_each:
      - "physical_source"
      - "field"
      - "unit"
      - "period"
      - "denominator"
      - "null semantics"
      - "comparability"
      - "whether_safe_for_priority"

  prohibited:
    - "score 0-100 inventado"
    - "sumar kg + pesos + días"
    - "normalización arbitraria"
    - "peso subjetivo sin contrato/evidencia"

priority_logic:
  determine_minimal_safe_logic:
    - "orden por una magnitud homogénea"
    - "concentración dentro de misma magnitud"
    - "cobertura de acción como segunda dimensión explicable"
    - "vencimiento como estado separado"
    - "trade-off como restricción/contrapeso, no score oculto"

  rule: >
    Si dos dimensiones no son comparables, mostrarlas como razones separadas
    y no fabricar un ranking matemático combinado.

recommendation_boundary:
  legacy_chat:
    allowed_if_supported:
      - "sugerencia textual condicionada"
      - "revisar"
      - "validar"
      - "contactar"
      - "pedir resultado"
      - "obtener dato faltante"
      - "escalar para decisión"
      - "no autorizar automáticamente una concesión"

    prohibited:
      - "objeto Recommendation N5"
      - "MAT_*"
      - "fingir IES"
      - "write"
      - "asignación automática"
      - "cambio de descuento"
      - "envío WhatsApp/Twilio"
      - "decisión irreversible"

human_control:
  principle: >
    Director IA recomienda dónde mirar y cuál es el siguiente paso defendible.
    La decisión comercial, financiera u operativa permanece humana.

  explicitly_audit:
    - "descuentos"
    - "abandono/recuperación de clientes"
    - "asignación de responsables"
    - "escalamiento"
    - "cambios presupuestales"

truth_model:
  required_separation:
    - "fact"
    - "stored_statement/comment"
    - "relationship"
    - "hypothesis"
    - "calculation"
    - "suggested_next_step"
    - "unknown"

  rules:
    - "comentario != hecho externo"
    - "coincidencia != causalidad"
    - "posterioridad != eficacia"
    - "materialidad != causa"
    - "recomendación != mandato"

mandatory_runtime_audit:
  inspect:
    - "lib/director-ia-plant-diagnosis.js"
    - "lib/director-ia-chat.js"
    - "commercial dossier"
    - "DICF loaders/summarizers"
    - "commercial_state SELECT"
    - "ARR"
    - "IGF"
    - "Action Register"
    - "revision notes"
    - "bitácora"
    - "planner"
    - "tool orchestrator"

  determine:
    - "qué campos ya llegan"
    - "qué campos se descartan"
    - "qué joins físicos existen"
    - "qué cálculos son seguros"
    - "qué falta para el first slice"

first_slice_selection:
  requirement: >
    Readiness debe escoger el slice mínimo que produzca una mejora ejecutiva
    real. No intentar implementar las ocho capacidades de una vez.

  candidate_a:
    name: "commercial_materiality_and_coverage"
    behavior: >
      Dentro de plant_diagnosis, identificar clientes con mayor movimiento
      comercial observable, concentración y cobertura/ausencia de acción DICF,
      y sugerir qué revisar primero.

  candidate_b:
    name: "economic_recovery_tradeoff"
    behavior: >
      Evaluar recuperabilidad económica de clientes cuando existan datos físicos
      suficientes.

  candidate_c:
    name: "director_agenda"
    behavior: >
      Priorizar hasta N asuntos heterogéneos de la planta.

  candidate_d:
    name: "before_action_after"
    behavior: >
      Relacionar temporalmente cambio, intervención y resultado posterior.

  requirement_winner:
    - "exactamente un first slice"
    - "justificar por qué"
    - "definir qué queda después"
    - "no escoger por facilidad solamente"

mandatory_acceptance_scenarios:
  scenario_1:
    prompt: "¿Cómo va la planta y qué debo revisar primero?"
    expected_capability: >
      No enumerar seis fuentes; identificar asuntos materiales defendibles.

  scenario_2:
    prompt: >
      ¿Qué clientes que dejaron o redujeron compra requieren mi atención primero?
    expected_capability: >
      Concentración + cobertura de acción + siguiente paso, sin causa inventada.

  scenario_3:
    prompt: >
      Este cliente dejó de comprar porque aparentemente la competencia le dio
      más margen y recuperarlo podría hacernos perder dinero. ¿Qué recomiendas?
    expected_capability: >
      Separar hecho/evidencia/hipótesis, auditar sostenibilidad económica,
      mostrar trade-off o declarar datos faltantes, y mantener decisión humana.

  scenario_4:
    prompt: "¿Funcionó la acción que tomamos con este cliente?"
    expected_capability: >
      Antes→acción→después y asociación temporal; no causalidad inventada.

  scenario_5:
    prompt: "¿Qué necesita mi atención hoy?"
    expected_capability: >
      Determinar si una agenda transversal es físicamente posible o debe quedar
      para slice posterior.

readiness_output:
  must_determine:
    - "READY / NOT_READY / READY_WITH_LIMITS"
    - "first slice exacto"
    - "fuentes exactas"
    - "campos exactos"
    - "joins exactos"
    - "cálculos permitidos"
    - "materiality basis"
    - "recommendation wording boundary"
    - "authz"
    - "period semantics"
    - "provenance"
    - "truncation"
    - "failure semantics"
    - "G2"
    - "G3"
    - "percentage effect"
    - "deferred capabilities"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  implementation_effect_expected: "0.0 pp unless audit proves module-state change"
  rule: "No sumar cobertura por inteligencia transversal."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar"
  - "modificar código"
  - "modificar runtime"
  - "modificar matriz"
  - "modificar contratos"
  - "reabrir IES"
  - "reabrir Reasoning Engine"
  - "crear score"
  - "crear Recommendation N5"
  - "persistir recomendaciones"
  - "writes"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Baseline 52.5% preservado."
  - "Contratos auditados físicamente."
  - "Chat legado vs N5 delimitado."
  - "Materialidad auditada campo por campo."
  - "Concentración auditada."
  - "Cobertura/desatención auditada."
  - "Reducción de incertidumbre auditada."
  - "Trade-offs económicos auditados."
  - "Caso competencia/margen auditado."
  - "Antes→acción→después auditado."
  - "Agenda del Director auditada."
  - "Seguimiento/repriorización auditado."
  - "No score arbitrario."
  - "No causalidad inventada."
  - "Exactamente un first slice seleccionado."
  - "G2/G3 determinados."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

next_task_policy:
  if_ready:
    propose_exactly_one: >
      IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001

  if_not_ready:
    propose_exactly_one: >
      ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-GAP-001

  rule: "No autorizar ni ejecutar."

report_requirements:
  path: >
    docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001.md

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "contract audit"
    - "legacy chat vs N5"
    - "physical data inventory"
    - "materiality audit"
    - "concentration audit"
    - "coverage/unattended audit"
    - "uncertainty reduction"
    - "economic trade-off audit"
    - "competition/margin case"
    - "alternative comparison"
    - "before-action-after audit"
    - "director agenda audit"
    - "follow-up/reprioritization audit"
    - "truth boundaries"
    - "human control"
    - "candidate first slices"
    - "selected first slice"
    - "deferred capabilities"
    - "authz"
    - "period semantics"
    - "provenance"
    - "failure semantics"
    - "G2/G3"
    - "percentage effect"
    - "risks"
    - "dependencies"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si READY/READY_WITH_LIMITS y existe un first slice
  implementable sin decisión contractual nueva. STOPPED si se requiere
  decisión humana de arquitectura/contrato antes de implementar. BLOCKED
  si falta gate.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001.md