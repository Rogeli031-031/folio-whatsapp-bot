# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer slice read-only de M6 — GASTOS / INVERSIONES — para
  que Director IA pueda consultar datos estructurados de folios por planta,
  periodo y categoría mediante integración in-process, reutilizando SELECT sobre
  public.folios + expandCategoriaRows, sin Excel, sin HTTP interno, sin writes
  y sin confundir GASTOS/INVERSIONES con IGF.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md"

  module: "M6 — GASTOS / INVERSIONES"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_percentage:
    before: 42.5
    before_numerator: 8.5
    denominator: 20
    after: 45.0
    after_numerator: 9.0
    gain_pp: 2.5

canonical_boundary:
  complete_requires:
    - "Export/xlsx"

  this_slice:
    - "consulta estructurada JSON/read-only"
    - "no Export"

  rule: >
    Después de esta implementación M6 debe quedar PARTIAL, nunca COMPLETE.

readiness_findings:
  source:
    base: "public.folios"
    expansion: "expandCategoriaRows"

  excel_boundary:
    workbook_builder: "buildCategoriaRangoWorkbook"
    role: "formateo xlsx únicamente"
    use_in_director_ia: false

  categories:
    - "GASTOS"
    - "INVERSIONES"

  semantic_rule: >
    GASTOS ≠ INVERSIONES ≠ IGF.

  period:
    required_format: "YYYY-MM"
    invent_default: false
    zero_rows: "respuesta válida sin registros"

  known_intents:
    - "expense_analysis"
    - "investment_analysis"

architecture_pattern:
  gastos: >
    expense_analysis -> tool -> executor ->
    loadGastosInversionesForChat("GASTOS") ->
    SELECT public.folios -> expandCategoriaRows ->
    evidencia -> respuesta

  inversiones: >
    investment_analysis -> tool -> executor ->
    loadGastosInversionesForChat("INVERSIONES") ->
    SELECT public.folios -> expandCategoriaRows ->
    evidencia -> respuesta

  transport:
    internal_http: false

  excel:
    generate: false

  writes:
    allowed: false

scope:
  included:
    - "GASTOS de folios"
    - "INVERSIONES de folios"
    - "consulta por planta autorizada"
    - "periodo YYYY-MM"
    - "partida/concepto"
    - "importe si existe físicamente"
    - "estatus si existe físicamente"
    - "folio"
    - "conteos/totales derivados del conjunto consultado"
    - "evidencia estructurada"

  excluded:
    - "Export xlsx"
    - "generación de archivo"
    - "descarga"
    - "HTTP interno"
    - "writes"
    - "comparaciones inventadas"
    - "causalidad inferida"
    - "IGF"
    - "forecast"
    - "cambios de categoría"

category_semantics:
  required:
    - "mantener GASTOS e INVERSIONES como familias distintas"
    - "usar predicados físicos distintos"
    - "no mezclar filas entre categorías"
    - "no cambiar categoría a partir del lenguaje del usuario"

period_semantics:
  required:
    - "YYYY-MM obligatorio"
    - "validar formato"
    - "no inventar periodo"
    - "no usar mes actual por default salvo que exista regla canónica explícita"
    - "0 filas = no hay registros para ese periodo"
    - "periodo inválido = error/clarificación, no query inventada"

igf_collision:
  requirements:
    - "preservar routing existente de IGF"
    - "no mandar toda pregunta con palabra gastos a M6"
    - "identificar contexto de folios/categoría/partida"
    - "si la intención es ambigua entre IGF y M6, pedir clarificación"
    - "no degradar M7"
    - "no usar IGF como fallback de M6"
    - "no usar M6 como fallback de IGF"

authz:
  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "GV = 403"
    - "GA dentro de planta autorizada"
    - "cross-planta = 403"
    - "fail-closed"
    - "no usar bloqueo GA específico de KPIs IGF"

response_contract:
  include_if_physically_present:
    - "folio_id"
    - "numero_folio"
    - "planta_id"
    - "planta_nombre/clave"
    - "periodo"
    - "categoria"
    - "partida/concepto"
    - "importe"
    - "estatus"
    - "source"

  derived_if_safe:
    - "conteo"
    - "total"

  forbidden:
    - "desviación sin baseline"
    - "causa por importe"
    - "clasificación inventada"
    - "comparación contra periodo no solicitado"
    - "mezcla con IGF"

planner_tools_capabilities:
  planner:
    - "conservar expense_analysis"
    - "conservar investment_analysis"
    - "asegurar routing separado"
    - "manejar ambigüedad con IGF"

  tools:
    - "habilitar executor real para gastos"
    - "habilitar executor real para inversiones"
    - "no agregar tool Excel"

  capabilities:
    - "actualizar M6 query/read-only"
    - "no marcar Export disponible"

  unsupported_rules:
    - "levantar SOURCE_NOT_INTEGRATED para queries M6 soportadas"
    - "preservar bloqueo de Export/xlsx"
    - "preservar dominios fuera del slice"

  chat:
    - "wiring in-process"
    - "no HTTP interno"
    - "no fallback incorrecto a IGF"
    - "evidencia estructurada"

implementation_requirements:
  data_layer:
    - "reutilizar query SELECT de public.folios"
    - "reutilizar expandCategoriaRows"
    - "extraer/reutilizar la parte estructurada previa al workbook"
    - "no invocar buildCategoriaRangoWorkbook"
    - "no generar xlsx"

  loader:
    preferred_name: "loadGastosInversionesForChat"

    inputs:
      - "req/context"
      - "planta_id"
      - "periodo YYYY-MM"
      - "category GASTOS|INVERSIONES"
      - "partida opcional si físicamente soportada"

    outputs:
      - "records"
      - "count"
      - "total si derivable"
      - "source/evidence"

tests_required:
  focal:
    - "GASTOS por planta"
    - "INVERSIONES por planta"
    - "GASTOS por YYYY-MM"
    - "INVERSIONES por YYYY-MM"
    - "categorías separadas"
    - "partida/concepto"
    - "importe"
    - "múltiples registros"
    - "0 registros"
    - "totales"
    - "nulls"
    - "periodo inválido"
    - "periodo ausente"
    - "planta no autorizada"
    - "cross-planta"
    - "plantas_permitidas"
    - "GA"
    - "GV"
    - "intent expense_analysis"
    - "intent investment_analysis"
    - "tool executor gastos"
    - "tool executor inversiones"
    - "chat wiring"
    - "pregunta gastos de folios -> M6"
    - "pregunta inversiones -> M6"
    - "pregunta gastos IGF -> IGF"
    - "ambigüedad IGF/M6 -> clarificación si corresponde"
    - "no Excel"
    - "no buildCategoriaRangoWorkbook"
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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m6-gastos-inversiones.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m6-gastos-inversiones.test.js"
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
  - "generar Excel"
  - "usar buildCategoriaRangoWorkbook como source"
  - "modificar export"
  - "hacer writes"
  - "integrar IGF"
  - "modificar semántica M7"
  - "forecast"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental M6"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Director IA consulta GASTOS por planta/periodo."
  - "Director IA consulta INVERSIONES por planta/periodo."
  - "GASTOS e INVERSIONES permanecen separados."
  - "Periodo YYYY-MM se valida."
  - "No se inventa periodo."
  - "0 registros se maneja correctamente."
  - "Expense intent tiene executor real."
  - "Investment intent tiene executor real."
  - "Chat llega al executor correcto."
  - "IGF routing se preserva."
  - "Ambigüedad se maneja sin mezclar dominios."
  - "Authz se preserva."
  - "No cross-planta."
  - "No Excel."
  - "No xlsx."
  - "No HTTP interno."
  - "No writes."
  - "No cambia contrato HTTP."
  - "No cambia arquitectura."
  - "M6 queda PARTIAL."
  - "M6 no queda COMPLETE."
  - "Global pasa a 9.0/20 = 45.0% después de sync documental."
  - "Tests focales verdes."
  - "Regresión Director IA verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m6-gastos-inversiones.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001"

  note: >
    La sync documental posterior debe cambiar M6 de NO INTEGRADA a PARTIAL
    y recalcular 8.5/20 -> 9.0/20 = 45.0%. No marcar COMPLETE.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "source public.folios"
    - "expandCategoriaRows"
    - "GASTOS"
    - "INVERSIONES"
    - "period semantics"
    - "plant scope"
    - "authz"
    - "planner"
    - "tools/executors"
    - "chat wiring"
    - "IGF collision"
    - "Excel boundary"
    - "no side effects"
    - "tests"
    - "estado M6"
    - "porcentaje futuro"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si query GASTOS/INVERSIONES queda integrada SELECT-only,
  in-process, separada de IGF y sin Excel/writes. STOPPED si aparece contradicción
  semántica o dependencia inseparable. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"