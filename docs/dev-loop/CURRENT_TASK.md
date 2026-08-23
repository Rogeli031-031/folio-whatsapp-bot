# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un primer slice read-only de M18 — Presupuestos semanales —
  para que Director IA pueda consultar el carro semanal de presupuesto por planta
  y semana, incluyendo presupuesto asignado, seleccionado, disponible, folios
  asociados y urgentes cuando exista evidencia física suficiente, mediante path
  in-process y SELECT-only, sin Twilio, sin envío a cheques y sin writes.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"

  module: "M18 — Presupuestos semanales"
  current_state: "NO INTEGRADA"
  expected_state_after_future_slice: "PARTIAL"

  global_percentage:
    current: 47.5
    numerator: 9.5
    denominator: 20
    expected_after_future_slice: 50.0
    expected_numerator: 10.0
    expected_gain_pp: 2.5

canonical_boundary:
  first_slice: "query JSON read-only del carro semanal"

  complete_still_requires:
    - "writes"
    - "flujo hacia cheques"
    - "operación/acciones de presupuesto"
    - "WhatsApp/Twilio si forma parte del propósito canónico"

  rule: >
    Este slice, aun si es implementable, solo lleva M18 a PARTIAL.
    No reinterpretar COMPLETE.

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA responda el estado del carro presupuestal semanal de una
  planta y semana determinada — asignado, seleccionado, disponible, folios y
  urgentes — reutilizando fuentes reales y getPresupuestoResumen o equivalente,
  sin ejecutar writes, enviar WhatsApp/Twilio ni mover información a cheques?

known_baseline:
  candidate_sources:
    - "presupuestos_semanales"
    - "presupuesto_folios"
    - "presupuesto_asignacion_detalle"

  candidate_helper:
    - "getPresupuestoResumen"

  known_risks:
    - "parte del SQL está embebido en server.js"
    - "el producto mezcla lectura con acciones posteriores"
    - "semana no debe inventarse"
    - "urgente debe provenir de regla/campo real"
    - "presupuesto disponible debe derivarse únicamente de datos físicos"
    - "flujo de cheques y WhatsApp queda fuera"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M18 completa y vigente"
      - "confirmar propósito canónico"
      - "identificar qué cubre exactamente el carro semanal"
      - "confirmar que query-only = PARTIAL"
      - "confirmar efecto futuro 47.5 -> 50.0"

  physical_sources:
    inspect:
      - "presupuestos_semanales"
      - "presupuesto_folios"
      - "presupuesto_asignacion_detalle"
      - "tablas auxiliares reales"
      - "joins"
      - "server.js"
      - "getPresupuestoResumen"
      - "helpers equivalentes"

    determine:
      - "qué tabla define la semana"
      - "qué tabla define presupuesto asignado"
      - "qué tabla define folios seleccionados"
      - "qué tabla define/importa importe seleccionado"
      - "qué representa disponible"
      - "cómo se relaciona folio con presupuesto"
      - "qué representa urgente"
      - "qué campos son observados"
      - "qué campos son derivados"

  helper_audit:
    inspect:
      - "getPresupuestoResumen"
      - "queries llamadas"
      - "shape retornado"
      - "side effects"
      - "authz"
      - "plant scope"

    determine:
      - "SELECT-only sí/no"
      - "qué puede reutilizarse"
      - "qué SQL embebido debe extraerse o encapsularse"
      - "si puede existir loader Director IA sin HTTP interno"

  week_semantics:
    determine:
      - "identificador físico de semana"
      - "fecha_inicio"
      - "fecha_fin"
      - "year/week si aplica"
      - "cómo identifica el producto la semana"
      - "si existe semana activa"
      - "si existe default actual"
      - "qué ocurre si usuario no indica semana"

    rules:
      - "no inventar semana"
      - "no usar semana actual silenciosamente si no existe regla canónica"
      - "si hay varias semanas posibles, clarificar"
      - "preservar zona horaria/regla existente si aplica"

  budget_semantics:
    determine:
      - "asignado"
      - "seleccionado"
      - "disponible"
      - "importe de folios"
      - "conteo de folios"
      - "urgentes"
      - "estatus"
      - "qué es cálculo derivado"

    rules:
      - "disponible solo si fórmula física está verificada"
      - "no inventar saldo"
      - "no convertir seleccionado en pagado"
      - "no convertir presupuesto en cheque"
      - "no afirmar aprobado si el campo no lo soporta"
      - "no afirmar urgencia sin campo/regla física"

  folio_details:
    determine:
      - "folio_id"
      - "numero_folio"
      - "importe"
      - "estatus"
      - "tipo/categoría si existe"
      - "urgente si existe"
      - "planta"
      - "orden"

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "GA"
      - "GV"
      - "planta_id"
      - "plantas_permitidas"
      - "cross-planta"
      - "fail-closed"
      - "si el módulo actual permite scopes especiales"

  planner_tools:
    inspect:
      - "budget_status"
      - "intents relacionados"
      - "capability M18"
      - "tools existentes"
      - "executor"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "chat routing"

    determine:
      - "qué wiring ya existe"
      - "qué falta"
      - "si budget_status puede reutilizarse"
      - "qué inputs mínimos requiere"
      - "qué preguntas deben seguir bloqueadas"

  cheques_boundary:
    inspect:
      - "flujo de envío a cheques"
      - "writes"
      - "status transitions"
      - "tablas de cheques"
      - "acciones del producto"

    rule: >
      Ninguna operación hacia cheques puede ser necesaria para producir la
      consulta read-only del carro semanal.

  whatsapp_twilio_boundary:
    inspect:
      - "Twilio"
      - "WhatsApp"
      - "notificaciones"
      - "envíos"
      - "acciones que muten estado"

    rule: >
      Canal y envío quedan fuera. La query debe funcionar sin dependencia de
      WhatsApp/Twilio.

  write_boundary:
    inspect:
      - "INSERT"
      - "UPDATE"
      - "DELETE"
      - "seleccionar folio"
      - "quitar folio"
      - "asignar presupuesto"
      - "enviar a cheque"

    rule: >
      Confirmar que todo write puede separarse completamente del slice de lectura.

architecture_hypothesis:
  preferred_path: >
    budget_status -> tool -> executor ->
    loadPresupuestoSemanalForChat(planta_id, semana) ->
    SELECT helpers/fuentes -> resumen estructurado ->
    evidencia -> respuesta

  requirements:
    - "in-process"
    - "SELECT-only"
    - "sin HTTP interno"
    - "sin Twilio"
    - "sin WhatsApp"
    - "sin cheques"
    - "sin writes"
    - "sin contrato nuevo"

response_contract:
  include_if_physically_supported:
    - "presupuesto_semana_id"
    - "planta_id"
    - "semana"
    - "fecha_inicio"
    - "fecha_fin"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "folio_id"
    - "numero_folio"
    - "importe"
    - "urgente"
    - "status"
    - "source"

  forbidden:
    - "pagado"
    - "cheque emitido"
    - "aprobado"
    - "faltante presupuestal"
    - "desviación"
    - "causa"
    - "urgente inferido"
    - "semana inventada"

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "query_type"
    - "select_only"
    - "side_effects"
    - "week_semantics"
    - "budget_semantics"
    - "authz"
    - "plant_scope"
    - "safe_fields"
    - "external_dependency"
    - "reusable"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_query_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

tests_to_design_if_ready:
  - "presupuesto por planta"
  - "semana explícita"
  - "semana inválida"
  - "semana ausente"
  - "varias semanas / clarificación"
  - "asignado"
  - "seleccionado"
  - "disponible"
  - "folios"
  - "folio importe"
  - "urgentes"
  - "0 folios"
  - "0 asignado"
  - "nulls"
  - "planta autorizada"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "cross-planta"
  - "GA"
  - "GV"
  - "intent budget_status"
  - "tool/executor"
  - "chat wiring"
  - "no cheques"
  - "no Twilio"
  - "no WhatsApp"
  - "no HTTP interno"
  - "sin writes"
  - "M18 sigue PARTIAL"

decision_rules:

  ready:
    all:
      - "fuentes físicas claras"
      - "getPresupuestoResumen o equivalente SELECT-only reutilizable"
      - "semana resoluble sin inventar"
      - "asignado/seleccionado/disponible definidos"
      - "urgencia físicamente soportada o excluible"
      - "authz preservable"
      - "scope planta preservable"
      - "writes separables"
      - "cheques separables"
      - "WhatsApp/Twilio separables"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001"

  stopped:
    when:
      - "lectura depende inseparablemente de writes"
      - "semana no puede determinarse sin decisión humana"
      - "disponible no tiene semántica verificable"
      - "authz no puede preservarse"
      - "carro depende inseparablemente de cheques/WhatsApp"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m18_state: "PARTIAL"
    numerator: 10.0
    denominator: 20
    percentage: 50.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"

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
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar schema"
  - "crear migration"
  - "modificar capability matrix"
  - "modificar contratos"
  - "asignar presupuesto"
  - "seleccionar/quitar folios"
  - "enviar a cheque"
  - "crear cheque"
  - "usar Twilio"
  - "enviar WhatsApp"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M18."
  - "Se verificaron tablas presupuestales."
  - "Se verificó getPresupuestoResumen."
  - "Se verificó SELECT-only."
  - "Se verificó semántica de semana."
  - "Se verificó asignado."
  - "Se verificó seleccionado."
  - "Se verificó disponible."
  - "Se verificaron folios."
  - "Se verificó urgencia o se excluyó si no está soportada."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificó planner/tools."
  - "Se separaron writes."
  - "Se separó cheques."
  - "Se separó Twilio/WhatsApp."
  - "Se definió path mínimo."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M18 no cambia durante readiness."
  - "47.5% no cambia durante readiness."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M18"
    - "query-only PARTIAL"
    - "physical sources"
    - "getPresupuestoResumen"
    - "week semantics"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "urgentes"
    - "authz"
    - "plant scope"
    - "planner/tools"
    - "cheques boundary"
    - "WhatsApp/Twilio boundary"
    - "write boundary"
    - "evidence table"
    - "gap table"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "state after future slice"
    - "percentage after future slice"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe path read-only del carro semanal, in-process,
  autorizado y separado de cheques/Twilio/writes. STOPPED si la lectura depende
  inseparablemente de operaciones mutantes o la semana no puede resolverse.
  BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"