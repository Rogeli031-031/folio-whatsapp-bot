# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer slice read-only de M18 — Presupuestos semanales —
  para que Director IA pueda consultar in-process el carro presupuestal semanal
  de una planta, incluyendo asignado, seleccionado, disponible, folios y urgentes
  físicamente soportados, reutilizando getPresupuestoResumen y fuentes SELECT-only,
  sin cheques, sin Twilio/WhatsApp, sin writes y sin inventar semana.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"

  module: "M18 — Presupuestos semanales"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_percentage:
    before: 47.5
    before_numerator: 9.5
    denominator: 20
    after: 50.0
    after_numerator: 10.0
    gain_pp: 2.5

canonical_boundary:
  this_slice:
    - "query JSON read-only del carro semanal"

  complete_still_requires:
    - "writes"
    - "flujo hacia cheques"
    - "operación de presupuesto"
    - "WhatsApp/Twilio si forma parte del propósito completo"

  rule: >
    Después de este slice M18 debe quedar PARTIAL, nunca COMPLETE.

readiness_findings:
  helper:
    name: "getPresupuestoResumen"
    query_type: "SELECT-only"
    side_effects: false

  physical_formulas:
    asignado: "presupuestos_semanales.monto_asignado"
    seleccionado: "SUM(presupuesto_folios.importe)"
    disponible: "max(0, asignado - seleccionado)"
    urgentes: "prioridad coincide /urgente/i"
    semana: "semana_inicio + semana_fin"

  excluded_source:
    - "presupuesto_asignacion_detalle"

  excluded_reason: >
    Es mensual y no representa el carro presupuestal semanal de este slice.

architecture_pattern:
  required: >
    budget_status -> tool -> executor ->
    loadPresupuestoSemanalForChat(planta_id, semana) ->
    getPresupuestoResumen / SELECT helpers ->
    evidencia -> respuesta

  transport:
    internal_http: false

  writes:
    allowed: false

  cheques:
    enabled: false

  whatsapp_twilio:
    enabled: false

scope:
  included:
    - "presupuesto semanal por planta"
    - "semana explícita"
    - "esta semana cuando la frase/regla existente lo permite"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "folio_id"
    - "numero_folio"
    - "importe"
    - "prioridad/urgente físicamente observado"
    - "estatus físico si existe"
    - "evidencia estructurada"

  excluded:
    - "presupuesto_asignacion_detalle"
    - "seleccionar folio"
    - "quitar folio"
    - "asignar presupuesto"
    - "enviar a cheque"
    - "crear cheque"
    - "cambiar status"
    - "Twilio"
    - "WhatsApp"
    - "notificaciones"
    - "writes"
    - "inferir urgencia"
    - "inventar semana"

week_semantics:
  explicit:
    required_format: "usar representación física existente"

  current_week:
    allowed_when:
      - "pregunta explícitamente esta semana"
      - "pregunta #17 / semántica mi presupuesto equivalente físicamente verificada"

    resolver:
      - "getCurrentWeekMexico()"

  otherwise:
    rule: >
      Si no hay semana explícita ni frase que active la regla canónica de semana
      actual, pedir clarificación. No inventar semana silenciosamente.

  lookup_rule: >
    No filtrar exclusivamente por estado ABIERTO. Un carro ya enviado a cheques
    debe seguir siendo consultable si la fuente lo contiene.

budget_semantics:
  asignado:
    source: "monto_asignado"

  seleccionado:
    formula: "sum(presupuesto_folios.importe)"

  disponible:
    formula: "max(0, asignado - seleccionado)"

  urgente:
    source_rule: "prioridad coincide /urgente/i"
    infer: false

  invariants:
    - "seleccionado != pagado"
    - "presupuesto != cheque"
    - "asignado != aprobado"
    - "disponible != dinero pagado"
    - "urgente solo si la prioridad lo soporta"

authz:
  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "reuse assertFolioStatusAccess o modelo equivalente seguro"
    - "GV = 403"
    - "GA dentro de planta autorizada"
    - "cross-planta = 403"
    - "fail-closed"

planner_tools_capabilities:
  planner:
    - "habilitar budget_status para este slice"
    - "preservar otros intents"
    - "manejar semana ausente con clarificación"

  tools:
    - "habilitar tool budget_status con executor real"
    - "inputs planta_id + semana/contexto"
    - "sin inputs de cheque/WhatsApp/write"

  capabilities:
    - "habilitar read-only de presupuesto semanal"
    - "no marcar writes disponibles"

  unsupported_rules:
    - "levantar bloqueo solo para consulta soportada"
    - "mantener bloqueadas acciones de presupuesto/cheques"

  chat:
    - "wiring in-process"
    - "sin HTTP interno"
    - "sin Twilio"
    - "sin WhatsApp"
    - "sin writes"
    - "evidencia estructurada"

response_contract:
  include_if_supported:
    - "presupuesto_semana_id"
    - "planta_id"
    - "semana_inicio"
    - "semana_fin"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "folio_id"
    - "numero_folio"
    - "importe"
    - "prioridad"
    - "urgente"
    - "estatus"
    - "source"

  forbidden:
    - "pagado"
    - "cheque emitido"
    - "aprobado"
    - "causa"
    - "desviación"
    - "semana inventada"
    - "urgencia inferida"

tests_required:
  focal:
    - "presupuesto por planta"
    - "semana explícita"
    - "esta semana con getCurrentWeekMexico"
    - "semana ausente sin trigger -> clarificación"
    - "semana inválida"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "disponible nunca negativo"
    - "folios"
    - "folio importe"
    - "prioridad urgente"
    - "prioridad no urgente"
    - "no inferir urgencia"
    - "0 folios"
    - "0 asignado"
    - "nulls"
    - "carro ABIERTO consultable"
    - "carro no ABIERTO consultable"
    - "planta autorizada"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "cross-planta"
    - "GA"
    - "GV"
    - "intent budget_status"
    - "tool/executor"
    - "chat wiring"
    - "no presupuesto_asignacion_detalle"
    - "no cheques"
    - "no Twilio"
    - "no WhatsApp"
    - "no HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m18-presupuesto-semanal.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m18-presupuesto-semanal.test.js"
    - "server.js"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "modificar docs/director-ia/**"
  - "modificar capability matrix"
  - "modificar frontend"
  - "modificar SQL"
  - "crear migration"
  - "modificar schema"
  - "crear endpoint HTTP"
  - "cambiar contrato HTTP"
  - "asignar presupuesto"
  - "seleccionar/quitar folio"
  - "enviar a cheque"
  - "crear cheque"
  - "modificar status"
  - "Twilio"
  - "WhatsApp"
  - "writes"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Director IA consulta presupuesto semanal por planta."
  - "Semana se resuelve sin inventarla."
  - "Esta semana usa getCurrentWeekMexico solo cuando corresponde."
  - "Carros no ABIERTO siguen consultables."
  - "Asignado usa monto_asignado."
  - "Seleccionado usa suma de presupuesto_folios.importe."
  - "Disponible usa max(0, asignado-seleccionado)."
  - "Urgencia solo desde prioridad /urgente/i."
  - "No se usa presupuesto_asignacion_detalle."
  - "Authz preservada."
  - "No cross-planta."
  - "budget_status tiene executor real."
  - "Chat llega al executor."
  - "No cheques."
  - "No Twilio."
  - "No WhatsApp."
  - "No HTTP interno."
  - "No writes."
  - "M18 queda PARTIAL."
  - "M18 no queda COMPLETE."
  - "Futura sync lleva 9.5/20 -> 10.0/20 = 50.0%."
  - "Tests focales verdes."
  - "Regresión Director IA verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m18-presupuesto-semanal.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001"

  note: >
    La sync documental posterior debe cambiar M18 de NO INTEGRADA a PARTIAL
    y recalcular 9.5/20 -> 10.0/20 = 50.0%. No marcar COMPLETE.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "getPresupuestoResumen"
    - "physical formulas"
    - "week semantics"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "urgentes"
    - "authz"
    - "plant scope"
    - "planner"
    - "tools/executor"
    - "chat wiring"
    - "cheques boundary"
    - "WhatsApp/Twilio boundary"
    - "write boundary"
    - "no presupuesto_asignacion_detalle"
    - "tests"
    - "estado M18"
    - "porcentaje futuro"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si presupuesto semanal queda integrado SELECT-only,
  in-process, autorizado y separado completamente de cheques/Twilio/writes.
  STOPPED si aparece dependencia inseparable. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"