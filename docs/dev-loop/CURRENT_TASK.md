# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar exclusivamente el first slice aprobado
  commercial_materiality_and_coverage dentro de plant_diagnosis:
  conservar magnitudes comerciales homogéneas en kg, calcular concentración
  explicable top-N, determinar cobertura DICF mediante cliente_key y producir
  evidencia estructurada suficiente para que el chat legado sugiera
  textualmente qué casos revisar primero, sin causalidad, scoring,
  Recommendation N5, trade-off económico ni writes.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    determination: "READY_WITH_LIMITS"
    first_slice: "commercial_materiality_and_coverage"

scope:
  intent: "plant_diagnosis"

  existing_sources:
    - "action_register"
    - "dicf"
    - "bitacora"
    - "arr"
    - "igf"
    - "commercial_state"

  executive_slice_sources:
    commercial_state: "arr.dicf_cliente_mes SELECT-only"
    dicf_actions: "existing DICF action source"

central_behavior: >
  plant_diagnosis debe poder distinguir qué movimientos comerciales observados
  merecen revisión primero usando únicamente magnitudes homogéneas y cobertura
  de acción físicamente demostrable.

commercial_materiality:

  source: "arr.dicf_cliente_mes"

  mandatory_audit_before_code:
    - "confirmar columnas físicas disponibles"
    - "confirmar semántica exacta de kg_mes_real"
    - "confirmar semántica exacta de kg_mes_forecast"
    - "confirmar cualquier campo de delta/estado ya derivado"
    - "confirmar periodo"
    - "confirmar null semantics"

  rule: >
    No asumir que forecast - real representa automáticamente pérdida,
    desviación causal o venta perdida. Utilizar únicamente una magnitud cuya
    semántica ya esté físicamente establecida por el runtime actual.

  units:
    materiality_dimension: "kg"
    homogeneous_only: true

  prohibited:
    - "mezclar kg con MXN"
    - "mezclar kg con días vencidos"
    - "mezclar kg con prioridad textual"
    - "score compuesto"
    - "normalización arbitraria"

concentration:

  objective: >
    Identificar cuánto de una magnitud comercial observable se concentra en
    los principales clientes.

  requirements:
    - "denominador explícito"
    - "periodo explícito"
    - "top-N determinístico"
    - "participación calculable"
    - "null no convertido silenciosamente a cero"
    - "empates determinísticos"

  preferred_shape:
    total_observed_magnitude: "<kg>"
    top_clients:
      - cliente_key
      - cliente_display_if_existing
      - observed_magnitude_kg
      - share_of_observed_magnitude
    top_n_share: "<ratio/percent>"

  rule: >
    Concentración matemática explica dónde se localiza una magnitud.
    No explica por qué ocurrió.

coverage:

  join_key: "cliente_key"

  mandatory:
    - "usar mismo patrón canónico M11/buildClienteKey"
    - "no join por nombre libre"
    - "no seleccionar silenciosamente cliente ambiguo"

  determine_for_each_material_client:
    - "has_dicf_action"
    - "open_action_count if physically available"
    - "overdue_action_count if physically available"
    - "latest relevant action/status if physically supportable"
    - "stored responsible only if physically linked"

  boundaries:
    - "responsable de acción != responsable de caída"
    - "acción abierta != problema resuelto"
    - "acción cerrada != éxito"
    - "sin acción != negligencia"

executive_categories:

  runtime_labels_allowed_only_if_derived:
    - "material_without_action"
    - "material_with_open_action"
    - "material_with_overdue_action"
    - "material_with_action"

  rule: >
    No convertir estas etiquetas en contrato arquitectónico ni persistirlas.
    Son clasificación derivada del runtime para presentar evidencia.

prioritization:

  principle: >
    Prioridad debe ser explicable por razones separadas, no por score oculto.

  safe_reasoning:
    - "mayor magnitud homogénea observable"
    - "concentración"
    - "ausencia de cobertura DICF"
    - "acción vencida como señal separada"

  forbidden:
    - "score 0-100"
    - "sumar magnitud + vencimiento"
    - "peso arbitrario"
    - "prioridad = causa"
    - "prioridad = culpabilidad"

  expected_output_behavior: >
    El modelo puede sugerir revisar primero un cliente porque concentra una
    magnitud comercial material y carece de acción, explicando ambas razones
    por separado.

evidence_gap_bridge:

  purpose: >
    Preparar el slice para el futuro cierre de brechas de evidencia sin
    ampliar esta implementación a workflow/persistencia.

  when_no_explanation:
    allowed_textual_behavior:
      - "declarar que no existe explicación suficiente en la evidencia cargada"
      - "identificar que hace falta validar el motivo"
      - "si existe responsable físicamente vinculado a una acción, pedir actualización de esa acción"
      - "si no existe responsable físico, no inventar quién debe responder"

  forbidden:
    - "crear tarea"
    - "crear comentario"
    - "asignar responsable"
    - "enviar mensaje"
    - "persistir pregunta pendiente"

  principle: >
    No sé debe transformarse, cuando sea posible, en qué información falta
    para continuar; nunca en una causa inventada.

truth_boundaries:

  required:
    - "observed commercial magnitude != cause"
    - "concentration != cause"
    - "comment != external fact"
    - "action != solution"
    - "responsible != culprit"
    - "overdue != negligence"
    - "absence of action != proof nobody is working on it"

  textual_language:
    prefer:
      - "observado"
      - "registrado"
      - "concentra"
      - "no encontré acción DICF asociada"
      - "conviene revisar"
      - "falta validar"
      - "la evidencia disponible no permite afirmar"

    avoid:
      - "causó"
      - "es responsable de"
      - "seguramente"
      - "hay que recuperar"
      - "funcionó"

future_compatibility:

  deviation_explanation:
    do_now:
      - "preservar magnitud"
      - "preservar periodo"
      - "preservar denominador"
      - "preservar cliente_key"
      - "preservar provenance"

    do_not_now:
      - "comparación diaria nueva"
      - "promedio diario"
      - "descomposición venta ayer"
      - "descomposición descuento/kg"
      - "atribución causal"

  evidence_gap_closure:
    do_now:
      - "representar explícitamente ausencia de explicación/cobertura cuando sea soportable"

    do_not_now:
      - "persistir preguntas"
      - "notificar personas"
      - "crear workflow"

mandatory_response_scenarios:

  scenario_1:
    question: "¿Cómo va la planta y qué debo revisar primero?"
    must_demonstrate: >
      No limitarse a enumerar fuentes. Debe señalar los casos comerciales
      materiales soportados y su cobertura DICF.

  scenario_2:
    question: "¿Qué clientes requieren mi atención primero?"
    must_demonstrate: >
      Magnitud/concentración y cobertura explicadas por separado.

  scenario_3:
    condition: >
      Cliente material sin acción y sin evidencia causal suficiente.
    must_demonstrate: >
      Recomendar revisar/validar motivo, sin inventar causa ni responsable.

  scenario_4:
    condition: >
      Cliente material con acción vencida asignada físicamente a Julio Pérez.
    must_demonstrate: >
      Puede sugerir obtener de Julio Pérez actualización/resultado de SU acción,
      pero no afirmar que Julio sea responsable del deterioro comercial.

  scenario_5:
    condition: >
      Cliente material con comentario que menciona competencia.
    must_demonstrate: >
      Presentar el comentario como declaración almacenada/evidencia relacionada,
      no como causa demostrada.

mandatory_tests:

  unit:
    - "magnitud homogénea"
    - "concentración"
    - "top-N"
    - "denominador"
    - "null semantics"
    - "cliente_key"
    - "con acción"
    - "sin acción"
    - "acción vencida"
    - "responsable de acción"
    - "no join por nombre"

  integration:
    - "plant_diagnosis conserva seis fuentes"
    - "no M9"
    - "commercial_state sigue SELECT-only"
    - "no computeDicf"
    - "una llamada OpenAI"
    - "provenance preservada"
    - "partial failure preservado"
    - "GA restrictions preservadas"
    - "financial_diagnosis preservado"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "director-ia suite"

authz:
  preserve_existing_plant_diagnosis: true
  no_scope_expansion: true

out_of_scope:
  - "economic recovery trade-off"
  - "margen por cliente"
  - "oferta estructurada de competencia"
  - "director agenda"
  - "before-action-after"
  - "persist recommendation"
  - "N5 Recommendation"
  - "MAT_*"
  - "IES runtime"
  - "Reasoning Engine runtime"
  - "M9"
  - "daily deviation engine"
  - "average daily sales"
  - "daily discount/kg decomposition"
  - "notifications"
  - "Twilio"
  - "WhatsApp"
  - "writes"
  - "schema changes"
  - "new tables"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001.md"
    - "lib/director-ia-plant-diagnosis.js"
    - "lib/director-ia-chat.js"
    - "test/director-ia-plant-diagnosis.test.js"

  conditional_writable:
    - "test/director-ia-*.test.js only if existing assertions legitimately require update due to this slice"

  read_only:
    - "docs/director-ia/**"
    - "other lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"

acceptance_criteria:
  - "commercial_materiality_and_coverage implementado."
  - "Magnitud físicamente validada antes de usar."
  - "Solo unidades homogéneas."
  - "Concentración explicable."
  - "Denominador explícito."
  - "Top-N determinístico."
  - "Cobertura DICF por cliente_key."
  - "No join por nombre."
  - "Ausencia de acción distinguible."
  - "Acción vencida distinguible si físicamente soportada."
  - "Responsable solo de la acción."
  - "No score."
  - "No causalidad."
  - "No trade-off económico."
  - "No Recommendation N5."
  - "No writes."
  - "Seis fuentes plant_diagnosis preservadas."
  - "Una llamada OpenAI preservada."
  - "Tests focales verdes."
  - "Suite Director IA verde."
  - "52.5% preservado."
  - "git diff --check limpio."

next_task:
  propose_only: "DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001.md