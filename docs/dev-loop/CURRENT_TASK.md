# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un primer slice read-only de M6 — GASTOS / INVERSIONES —
  para que Director IA pueda consultar datos estructurados de folios por planta,
  mes, categoría y partida mediante integración in-process, reutilizando fuentes
  y helpers existentes, sin Excel, sin exportación, sin writes y sin confundir
  estos datos con IGF.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"

  winner: "M6 — GASTOS / INVERSIONES"
  first_slice: "query JSON read-only"
  current_state: "NO INTEGRADA"
  expected_state_after_slice: "PARTIAL"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20
    expected_after_slice: 45.0
    expected_gain_pp: 2.5

canonical_boundary:
  module_purpose: "GASTOS / INVERSIONES con Export"
  slice_scope: "consulta estructurada únicamente"

  rule: >
    El slice read-only NO satisface COMPLETE canónico de M6 porque Export/Excel
    permanece fuera. Si el path es implementable, M6 solo podrá pasar a PARTIAL.

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA responda consultas de GASTOS e INVERSIONES de folios por
  planta, periodo y partida, sin usar Excel, sin HTTP interno, sin writes y sin
  mezclar estas categorías con IGF?

known_baseline:
  intents:
    - "expense_analysis"
    - "investment_analysis"

  tools:
    status: "existentes pero históricamente con executor null"

  known_backend:
    - "categoria-rango-excel"
    - "expandCategoriaRows"
    - "fuentes de folios/categorías relacionadas"

  known_risk:
    - "la palabra gastos colisiona semánticamente con IGF"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M6 completa y vigente"
      - "confirmar propósito canónico"
      - "confirmar que Export forma parte de COMPLETE"
      - "confirmar que query-only sería PARTIAL"
      - "recalcular efecto 42.5 -> 45.0 solo como efecto futuro"

  backend_sources:
    inspect:
      - "categoria-rango-excel"
      - "expandCategoriaRows"
      - "queries subyacentes"
      - "helpers reutilizables"
      - "tablas/vistas reales"
      - "campos planta"
      - "campos mes/periodo"
      - "categoría"
      - "partida/concepto"
      - "importe"
      - "estatus"
      - "folio"

    determine:
      - "qué parte es SELECT-only"
      - "qué parte solo formatea Excel"
      - "qué fuente primaria existe antes del xlsx"
      - "si puede extraerse/usar helper estructurado sin depender del export"

  category_semantics:
    required:
      - "GASTOS"
      - "INVERSIONES"
      - "diferencia real entre ambas"
      - "qué valores/códigos físicos las representan"
      - "qué campos son observados"
      - "qué campos son derivados"
      - "qué puede agregarse con seguridad"

  period_semantics:
    determine:
      - "mes"
      - "rango"
      - "YYYY-MM si aplica"
      - "defaults existentes"
      - "periodo inválido"
      - "ausencia de datos"
      - "comparación entre periodos si la fuente la soporta"
      - "no inventar periodos"

  plant_scope:
    determine:
      - "planta_id"
      - "plantas_permitidas"
      - "fallbacks globales existentes"
      - "qué debe bloquear Director IA"
      - "cross-planta"
      - "fail-closed"

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "GA"
      - "GV"
      - "planta autorizada"
      - "cross-planta"
      - "si la superficie actual tiene restricciones distintas"

  planner_tools:
    inspect:
      - "expense_analysis"
      - "investment_analysis"
      - "tools existentes"
      - "executor"
      - "capability"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "chat routing"

    determine:
      - "qué ya existe"
      - "qué falta"
      - "si deben mantenerse intents separados"
      - "si se necesita un loader común con categoría explícita"
      - "qué bloqueo debe levantarse únicamente para este slice"

  igf_collision:
    required:
      - "trazar reglas actuales que mandan gastos a IGF"
      - "identificar frases ambiguas"
      - "separar gastos de folios vs gastos IGF"
      - "definir necesidad de clarificación si falta contexto"
      - "no cambiar semántica de IGF"
      - "no degradar M7"

  response_contract:
    determine_if_supported:
      - "folio_id/numero_folio"
      - "planta"
      - "periodo"
      - "categoria"
      - "partida/concepto"
      - "importe"
      - "estatus"
      - "total"
      - "conteo"
      - "source"

    rules:
      - "No inventar partidas."
      - "No inventar importes."
      - "No confundir gasto con inversión."
      - "No confundir gasto de folio con gasto IGF."
      - "No afirmar causalidad solo por importe."
      - "No afirmar desviación sin baseline."

  export_boundary:
    required:
      - "confirmar que XLSX queda fuera"
      - "confirmar que no se genera archivo"
      - "confirmar que no se usa Excel como fuente primaria si existe JSON/helper previo"
      - "confirmar que M6 sigue sin COMPLETE"

architecture_hypothesis:
  preferred_path: >
    expense_analysis / investment_analysis -> tool -> executor ->
    loadGastosInversionesForChat(category) -> helper/fuente SELECT-only ->
    evidencia -> respuesta

  requirements:
    - "in-process"
    - "sin HTTP interno"
    - "sin Excel"
    - "sin writes"
    - "sin dispatcher nuevo"
    - "sin contrato nuevo"

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "category"
    - "query_type"
    - "select_only"
    - "excel_dependency"
    - "side_effects"
    - "authz"
    - "plant_scope"
    - "period_semantics"
    - "safe_fields"
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
  - "gastos por planta"
  - "inversiones por planta"
  - "gastos por mes"
  - "inversiones por mes"
  - "filtro por partida"
  - "múltiples registros"
  - "sin registros"
  - "totales derivados"
  - "nulls"
  - "periodo inválido"
  - "planta no autorizada"
  - "cross-planta"
  - "plantas_permitidas"
  - "GA"
  - "GV"
  - "intent expense_analysis"
  - "intent investment_analysis"
  - "tools/executor"
  - "clarificación gastos IGF vs folios"
  - "no fallback incorrecto a IGF"
  - "no Excel"
  - "no HTTP interno"
  - "sin writes"
  - "M6 sigue PARTIAL"

decision_rules:

  ready:
    all:
      - "fuente estructurada previa al Excel existe"
      - "SELECT-only"
      - "GASTOS e INVERSIONES distinguibles"
      - "scope planta preservable"
      - "authz preservable"
      - "periodo claro"
      - "colisión con IGF resoluble sin contrato nuevo"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001"

  stopped:
    when:
      - "Excel es inseparable de la fuente"
      - "no existe fuente estructurada reutilizable"
      - "GASTOS/INVERSIONES no pueden distinguirse"
      - "authz no puede preservarse"
      - "colisión con IGF requiere decisión contractual nueva"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  if_future_impl_succeeds:
    m6_state: "PARTIAL"
    global_numerator: 9.0
    global_denominator: 20
    global_percentage: 45.0

  current_task:
    m6_state_change: false
    global_percentage_change: false

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md"

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
  - "generar Excel"
  - "modificar export"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M6."
  - "Se confirmó que query-only = PARTIAL."
  - "Se identificó fuente estructurada previa al Excel."
  - "Se verificó SELECT-only."
  - "Se distinguió GASTOS de INVERSIONES."
  - "Se verificó planta."
  - "Se verificó periodo."
  - "Se verificó authz."
  - "Se verificaron intents."
  - "Se verificaron tools."
  - "Se verificó executor actual."
  - "Se auditó colisión con IGF."
  - "Se definió path mínimo."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M6 no cambia durante readiness."
  - "42.5% no cambia durante readiness."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M6"
    - "query-only PARTIAL"
    - "backend/source"
    - "helpers"
    - "GASTOS"
    - "INVERSIONES"
    - "period semantics"
    - "plant scope"
    - "authz"
    - "planner/tools"
    - "IGF collision"
    - "Excel boundary"
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
  DONE_PENDING_REVIEW si existe path JSON/estructurado SELECT-only, in-process
  y semánticamente separado de IGF. STOPPED si Excel es inseparable o la
  colisión requiere decisión contractual. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001.md"