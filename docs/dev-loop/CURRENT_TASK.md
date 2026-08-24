# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un slice read-only de M11 — DICF / expediente comercial —
  para que Director IA pueda reunir en una sola consulta el estado comercial
  observable de un cliente, sus comentarios almacenados, acciones DICF,
  historial y resultado_cierre cuando existan, mediante la clave física
  planta_id + cliente_key, sin inventar causalidad, motivo, resultado o relación
  que no esté soportada por las fuentes.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"

  module: "M11 — DICF"
  current_state: "PARTIAL"

  current_coverage:
    - "estado comercial"
    - "comentarios de cliente"
    - "acciones DICF"
    - "consultas DICF ya existentes"
    - "acciones_abiertas por cliente"

  known_gap: >
    Las fuentes ya existen, pero el planner/chat las consulta separadamente.
    Falta una vista factual integrada por cliente.

  global_percentage:
    current: 50.0
    numerator: 10.0
    denominator: 20

  expected_effect_of_future_slice:
    m11_state: "PARTIAL"
    gain_pp: 0.0
    global_percentage: 50.0

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente seguro
  para que Director IA construya un expediente comercial observable por cliente
  enlazando únicamente mediante planta_id + cliente_key:
  estado comercial, comentarios almacenados, acciones DICF, historial y
  resultado_cierre, sin convertir comentarios en causa ni acciones en solución?

known_join_key:
  fields:
    - "planta_id"
    - "cliente_key"

  evidence:
    - "acciones_abiertas ya usa esta clave"

  rule: >
    La readiness debe verificar físicamente que esta clave es válida para cada
    fuente incluida. No asumir join en fuentes donde no exista.

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M11 completa y vigente"
      - "confirmar propósito canónico"
      - "confirmar estado actual PARTIAL"
      - "confirmar que este slice profundiza PARTIAL"
      - "confirmar efecto porcentual 0.0 pp"

  commercial_state:
    inspect:
      - "fuente física del estado comercial"
      - "loadCommercialStateForChat"
      - "computeDicf si aplica"
      - "cliente_key"
      - "planta_id"
      - "estado/categoría observada"
      - "periodo"
      - "campos derivados"

    determine:
      - "qué es hecho observado"
      - "qué es derivado"
      - "qué periodo representa"
      - "qué puede mostrarse en expediente"

  comments:
    inspect:
      - "fuente de comentarios comerciales"
      - "get_cliente_comentarios"
      - "loaders/helpers"
      - "cliente_key"
      - "planta_id"
      - "texto"
      - "autor si existe"
      - "timestamp"
      - "orden"
      - "nulls"

    rules:
      - "comentario almacenado != causa"
      - "comentario almacenado != diagnóstico validado"
      - "autor null no se inventa"

  dicf_actions:
    inspect:
      - "arr.dicf_acciones"
      - "helpers actuales"
      - "cliente_key"
      - "planta_id"
      - "responsable"
      - "acción"
      - "fecha"
      - "estatus"
      - "resultado_cierre"
      - "historial"
      - "acciones_abiertas"

    determine:
      - "campos reales"
      - "qué es observado"
      - "qué es derivado"
      - "qué historial existe"
      - "cómo se representa cierre"
      - "si resultado_cierre pertenece a acción"

  history_and_close:
    required:
      - "identificar fuente física de historial"
      - "identificar fuente física de resultado_cierre"
      - "confirmar relación con acción"
      - "confirmar orden temporal"
      - "confirmar SELECT-only"

    rules:
      - "historial != causa"
      - "resultado_cierre != efectividad salvo semántica física"
      - "cerrada != exitosa"
      - "no inferir causalidad post hoc"

  client_resolution:
    determine:
      - "cómo se resuelve cliente por nombre"
      - "resolve_entidades_comerciales"
      - "cliente_key"
      - "ambigüedad"
      - "duplicados"
      - "planta"
      - "qué ocurre si hay múltiples candidatos"

    rule: >
      No construir expediente hasta resolver cliente y planta de forma segura.

  join_integrity:
    for_each_source_verify:
      - "planta_id presente"
      - "cliente_key presente"
      - "normalización compatible"
      - "case/collation si aplica"
      - "null behavior"
      - "duplicados"
      - "cardinalidad"

    rule: >
      No inventar join por nombre libre si la fuente no comparte cliente_key.

  time_semantics:
    determine:
      - "periodo de estado comercial"
      - "fecha de comentarios"
      - "fecha de acciones"
      - "fecha de historial"
      - "fecha de cierre"

    rule: >
      Director IA puede mostrar una cronología factual, pero no afirmar que un
      evento causó otro solo por ocurrir antes/después.

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "planta_id"
      - "plantas_permitidas"
      - "GA/GV"
      - "cross-planta"
      - "fail-closed"
      - "authz actual DICF/commercial_state"

  planner_tools:
    inspect:
      - "client_analysis"
      - "dicf_focused"
      - "commercial_state"
      - "tools actuales"
      - "executor"
      - "chat routing"
      - "resolve_entidades_comerciales"
      - "get_dicf_context"
      - "get_cliente_comentarios"
      - "get_commercial_state"

    determine:
      - "si conviene intent específico expediente_comercial"
      - "si puede reutilizar client_analysis"
      - "tool/executor mínimo"
      - "cómo evitar consultas duplicadas"
      - "cómo conservar routing actual"

  context_policy:
    required:
      - "definir límites por fuente"
      - "máximo de comentarios"
      - "máximo de acciones"
      - "máximo de eventos de historial"
      - "orden"
      - "recorte determinista"
      - "prioridad de evidencia"

    rule: >
      Evitar que un expediente grande desplace evidencia crítica o exceda contexto.

  semantic_boundaries:
    required:
      - "estado comercial != causa"
      - "comentario != motivo probado"
      - "acción != solución"
      - "resultado_cierre != éxito automático"
      - "historial != causalidad"
      - "responsable de acción != responsable de caída comercial"

architecture_hypothesis:
  preferred_path: >
    intent expediente_comercial / client_analysis -> tool -> executor ->
    loadCommercialDossierForChat(planta_id, cliente_key) ->
    commercial_state + comentarios + dicf_acciones + historial/cierre ->
    expediente factual acotado ->
    evidencia -> respuesta

  requirements:
    - "in-process"
    - "SELECT-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin contrato nuevo"
    - "sin joins inventados"

response_contract:
  include_if_physically_supported:
    - "planta_id"
    - "cliente_key"
    - "cliente_nombre"
    - "estado_comercial"
    - "periodo_estado"
    - "comentarios"
    - "comentario_texto"
    - "comentario_autor"
    - "comentario_fecha"
    - "acciones"
    - "accion_id"
    - "accion"
    - "responsable"
    - "fecha"
    - "estatus"
    - "resultado_cierre"
    - "historial"
    - "source"

  forbidden:
    - "causa confirmada"
    - "motivo probado"
    - "responsable de la caída"
    - "acción efectiva"
    - "solución"
    - "impacto causal"
    - "relación entre fuentes no soportada"

semantic_invariants:
  - "Estado comercial es estado, no causa."
  - "Comentario es evidencia textual almacenada, no motivo validado."
  - "Acción DICF es acción registrada, no solución demostrada."
  - "Resultado de cierre no implica éxito salvo campo explícito."
  - "Responsable de acción no implica responsable del desempeño comercial."
  - "Cronología no implica causalidad."
  - "Join solo por clave física verificada."

mandatory_evidence_table:
  columns:
    - "component"
    - "source"
    - "helper"
    - "join_key"
    - "select_only"
    - "fields"
    - "time_semantics"
    - "authz"
    - "plant_scope"
    - "context_limit"
    - "reusable"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

tests_to_design_if_ready:
  - "expediente por cliente_key"
  - "resolución por nombre"
  - "cliente ambiguo -> clarificación"
  - "estado comercial"
  - "comentarios"
  - "acciones"
  - "acciones abiertas"
  - "historial"
  - "resultado_cierre"
  - "0 comentarios"
  - "0 acciones"
  - "0 historial"
  - "cliente sin estado comercial"
  - "nulls"
  - "orden temporal"
  - "no causalidad"
  - "no motivo inferido"
  - "no responsable inferido"
  - "planta autorizada"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "cross-planta"
  - "GA/GV"
  - "intent/tool/executor"
  - "chat wiring"
  - "no fallback incorrecto"
  - "sin HTTP interno"
  - "sin writes"

decision_rules:

  ready:
    all:
      - "join planta_id + cliente_key verificado en fuentes necesarias"
      - "fuentes SELECT-only"
      - "client resolution segura"
      - "historial/cierre físicamente verificables"
      - "authz preservable"
      - "scope planta preservable"
      - "contexto acotable"
      - "separación semántica defendible"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001"

  stopped:
    when:
      - "join físico no existe"
      - "cliente_key es incompatible entre fuentes"
      - "historial/cierre no puede relacionarse"
      - "authz no puede preservarse"
      - "expediente requiere inferir causalidad"
      - "contexto no puede acotarse"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m11_state: "PARTIAL"
    numerator: 10.0
    denominator: 20
    percentage: 50.0
    gain_pp: 0.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"

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
  - "modificar capability matrix"
  - "modificar contratos"
  - "inventar joins"
  - "inferir causalidad"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M11."
  - "Se verificó estado comercial."
  - "Se verificaron comentarios."
  - "Se verificaron acciones DICF."
  - "Se verificó historial."
  - "Se verificó resultado_cierre."
  - "Se verificó join planta_id + cliente_key."
  - "Se verificó resolución de cliente."
  - "Se verificó SELECT-only."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificó semántica temporal."
  - "Se definió política de contexto."
  - "Se separó correlación de causalidad."
  - "Se auditó planner/tools."
  - "Se definió path mínimo."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M11 sigue PARTIAL."
  - "50.0% sigue sin cambio."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M11"
    - "commercial state"
    - "comments"
    - "dicf actions"
    - "history"
    - "resultado_cierre"
    - "join key"
    - "client resolution"
    - "time semantics"
    - "authz"
    - "plant scope"
    - "planner/tools"
    - "context policy"
    - "semantic boundaries"
    - "evidence table"
    - "gap table"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "state after future slice"
    - "percentage"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el expediente comercial puede construirse con joins
  físicos, SELECT-only, authz y semántica segura. STOPPED si requiere inventar
  relaciones o causalidad. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"