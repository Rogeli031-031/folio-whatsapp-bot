# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer slice read-only de M4 — Clasificación de apoyos +
  COMPARAR — para que Director IA pueda consultar la matriz comparativa
  mes_a vs mes_b por planta y familia GASTOS / INVERSIONES / TALLER mediante
  integración in-process, reutilizando SELECT sobre public.folios +
  buildClasificacionMatrix, sin COMPARAR, sin Excel, sin writes y sin fallback
  global de plantas.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"

  module: "M4 — Clasificación de apoyos + COMPARAR"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_percentage:
    before: 45.0
    before_numerator: 9.0
    denominator: 20
    after: 47.5
    after_numerator: 9.5
    gain_pp: 2.5

canonical_boundary:
  complete_requires:
    - "COMPARAR"
    - "Excel/reconciliación"

  this_slice:
    - "query JSON read-only"
    - "mes_a vs mes_b"
    - "matriz comparativa"

  rule: >
    Después de este slice M4 debe quedar PARTIAL, nunca COMPLETE.

readiness_findings:
  source:
    base: "public.folios"
    matrix_builder: "buildClasificacionMatrix"

  categories:
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"

  periods:
    mes_a:
      required: true
      format: "YYYY-MM"
    mes_b:
      required: true
      format: "YYYY-MM"
    distinct:
      required: true

  product_fallback:
    endpoint_behavior: >
      Si planta_id falta o no pertenece a PLANTAS_COMPARATIVO, el producto puede
      caer a múltiples plantas.

    director_ia_rule: >
      NO copiar ese fallback. Director IA debe exigir planta autorizada,
      respetar plantas_permitidas y fail-closed o clarificar.

architecture_pattern:
  required: >
    intent clasificacion_apoyos_query -> tool -> executor ->
    loadClasificacionApoyosForChat(mes_a, mes_b, planta_id) ->
    SELECT public.folios -> buildClasificacionMatrix ->
    evidencia -> respuesta

  transport:
    internal_http: false

  comparar:
    enabled: false

  excel:
    enabled: false

  writes:
    allowed: false

scope:
  included:
    - "comparativo mes_a vs mes_b"
    - "planta autorizada"
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"
    - "valores mes_a"
    - "valores mes_b"
    - "delta absoluto si derivable"
    - "percent_change solo si semánticamente seguro"
    - "evidencia estructurada"

  excluded:
    - "COMPARAR"
    - "insertFolio"
    - "UPDATE mes_cargo"
    - "Excel"
    - "xlsx"
    - "reconciliación Excel"
    - "writes"
    - "causalidad"
    - "cumplimiento"
    - "desviación presupuestal"
    - "responsable"
    - "recomendación automática"

period_semantics:
  rules:
    - "mes_a obligatorio"
    - "mes_b obligatorio"
    - "formato YYYY-MM"
    - "mes_a != mes_b"
    - "no inventar meses"
    - "no usar defaults silenciosos"
    - "periodo inválido = validación/clarificación"

category_semantics:
  rules:
    - "GASTOS separado de INVERSIONES"
    - "GASTOS separado de TALLER"
    - "INVERSIONES separado de TALLER"
    - "no mezclar familias"
    - "preservar shape real de buildClasificacionMatrix"

comparison_semantics:
  allowed:
    - "valor observado en mes_a"
    - "valor observado en mes_b"
    - "diferencia absoluta"
    - "aumento/disminución factual"
    - "porcentaje solo con base válida"

  forbidden:
    - "causa"
    - "problema"
    - "mejora"
    - "cumplimiento"
    - "desviación presupuestal"
    - "prioridad"
    - "responsable"

  zero_base:
    rule: >
      No inventar porcentaje ante base cero. Usar unknown/null o semántica
      existente físicamente verificada.

plant_scope:
  required:
    - "planta_id explícita o resoluble de forma segura"
    - "planta autorizada"
    - "plantas_permitidas"
    - "cross-planta = 403/fail-closed"
    - "no fallback a 6 plantas"
    - "no scope global por omisión"

authz:
  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "GA según reglas físicas del dominio"
    - "GV 403 si aplica"
    - "priv_clave/solo_zp_ad preservado si corresponde"
    - "cross-planta bloqueado"
    - "fail-closed"

planner_tools_capabilities:
  planner:
    - "crear/habilitar intent específico de clasificación query si no existe"
    - "evitar colisiones con M6 GASTOS/INVERSIONES"
    - "preservar otros intents"

  tools:
    - "crear/habilitar tool específica"
    - "executor real"
    - "inputs mes_a, mes_b, planta_id"
    - "sin parámetros COMPARAR/Excel"

  capabilities:
    - "habilitar lectura de matriz query"
    - "no habilitar COMPARAR"
    - "no habilitar Excel"

  unsupported_rules:
    - "levantar bloqueo exclusivamente para consultas soportadas por M4 query"
    - "mantener bloqueadas preguntas de COMPARAR/Excel/write"

  chat:
    - "wiring in-process"
    - "sin HTTP interno"
    - "evidencia estructurada"
    - "no fallback global"

implementation_requirements:
  data_layer:
    - "reutilizar SELECT sobre public.folios"
    - "reutilizar buildClasificacionMatrix"
    - "no llamar endpoint HTTP interno"
    - "no llamar POSTs COMPARAR"
    - "no generar workbook"

  loader:
    preferred_name: "loadClasificacionApoyosForChat"

    inputs:
      - "req/context"
      - "planta_id"
      - "mes_a"
      - "mes_b"

    outputs:
      - "matrix"
      - "comparisons"
      - "source/evidence"

response_contract:
  include_if_supported:
    - "planta_id"
    - "planta_nombre/clave"
    - "mes_a"
    - "mes_b"
    - "categoria"
    - "valor_a"
    - "valor_b"
    - "delta"
    - "percent_change"
    - "source"

tests_required:
  focal:
    - "mes_a vs mes_b"
    - "mes_a ausente"
    - "mes_b ausente"
    - "mes_a inválido"
    - "mes_b inválido"
    - "mes_a == mes_b"
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"
    - "familias separadas"
    - "delta positivo"
    - "delta negativo"
    - "base cero"
    - "nulls/ausencia"
    - "planta autorizada"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "cross-planta"
    - "GA"
    - "GV"
    - "no fallback global"
    - "intent"
    - "tool/executor"
    - "chat wiring"
    - "no COMPARAR"
    - "no Excel"
    - "no build workbook"
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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m4-clasificacion-query.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m4-clasificacion-query.test.js"
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
  - "ejecutar COMPARAR"
  - "generar Excel/xlsx"
  - "modificar export"
  - "hacer writes"
  - "insertFolio"
  - "UPDATE mes_cargo"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Director IA compara mes_a vs mes_b."
  - "mes_a/mes_b validados como YYYY-MM."
  - "mes_a != mes_b."
  - "GASTOS/INVERSIONES/TALLER separados."
  - "buildClasificacionMatrix reutilizado."
  - "No fallback global."
  - "Authz preservada."
  - "No cross-planta."
  - "Intent/tool/executor reales."
  - "Chat llega al executor."
  - "COMPARAR sigue fuera."
  - "Excel sigue fuera."
  - "No HTTP interno."
  - "No writes."
  - "No cambia contrato HTTP."
  - "No cambia arquitectura."
  - "M4 queda PARTIAL."
  - "M4 no queda COMPLETE."
  - "Futura sync lleva 9.0/20 -> 9.5/20 = 47.5%."
  - "Tests focales verdes."
  - "Regresión Director IA verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m4-clasificacion-query.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001"

  note: >
    La sync documental debe cambiar M4 de NO INTEGRADA a PARTIAL y recalcular
    9.0/20 -> 9.5/20 = 47.5%. No marcar COMPLETE.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "source public.folios"
    - "buildClasificacionMatrix"
    - "mes_a/mes_b"
    - "families"
    - "comparison semantics"
    - "plant scope"
    - "authz"
    - "no fallback global"
    - "planner"
    - "tools/executor"
    - "chat wiring"
    - "COMPARAR boundary"
    - "Excel boundary"
    - "no side effects"
    - "tests"
    - "estado M4"
    - "porcentaje futuro"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si query M4 queda integrada SELECT-only, in-process,
  autorizada y sin fallback global, manteniendo COMPARAR/Excel fuera.
  STOPPED si aparece dependencia inseparable o authz insegura.
  BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"