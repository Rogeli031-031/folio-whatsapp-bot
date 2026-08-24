# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un primer slice read-only de M5 — Taller por AT — para
  que Director IA pueda consultar datos estructurados por unidad AT mediante
  fuente SELECT-only e integración in-process, separando estrictamente Taller
  de GASTOS, INVERSIONES, clasificación M4, Action Register y Excel.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007.md"

  module: "M5 — Taller por AT"
  current_state: "NO INTEGRADA"
  expected_state_after_future_slice: "PARTIAL"

  global_percentage:
    current: 50.0
    numerator: 10.0
    denominator: 20
    expected_after_future_slice: 52.5
    expected_numerator: 10.5
    expected_gain_pp: 2.5

canonical_boundary:
  required:
    - "leer definición canónica exacta de M5"
    - "confirmar qué significa Taller por AT"
    - "confirmar qué exige COMPLETE"
    - "separar query JSON de Excel/export/duplicados"

  rule: >
    Un futuro slice query-only, si es válido, debe dejar M5 en PARTIAL.
    No marcar COMPLETE si faltan capacidades canónicas como Excel u operaciones
    adicionales.

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA consulte Taller por unidad AT, con campos y filtros
  físicamente soportados, sin Excel, sin writes, sin Action Register y sin
  confundir TALLER con las familias M4/M6?

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M5 vigente completa"
      - "identificar propósito exacto"
      - "identificar unidad AT"
      - "identificar qué cubre query"
      - "identificar qué queda para COMPLETE"
      - "confirmar PARTIAL tras primer slice"

  physical_sources:
    inspect:
      - "server.js"
      - "helpers Taller/AT"
      - "queries SQL reales"
      - "tablas/vistas involucradas"
      - "rutas GET"
      - "rutas Excel/export"
      - "duplicados relacionados si existen"

    determine:
      - "fuente primaria"
      - "SELECT-only"
      - "joins"
      - "campos AT"
      - "campos planta"
      - "campos folio"
      - "campos importe"
      - "campos estatus"
      - "campos fecha/periodo"
      - "campos concepto/partida"

  at_semantics:
    required:
      - "definir físicamente AT"
      - "id/clave/nombre"
      - "relación con planta"
      - "relación con folio"
      - "si una unidad puede repetirse"
      - "si hay nulls"
      - "si existe catálogo"

    rules:
      - "no inventar AT"
      - "no asumir AT = responsable"
      - "no asumir AT = Action Register"
      - "no inferir planta por texto libre si no hay clave física"

  taller_semantics:
    determine:
      - "qué registros pertenecen a TALLER"
      - "qué predicado SQL los identifica"
      - "qué campos son observados"
      - "qué campos son derivados"
      - "qué estados existen físicamente"
      - "qué significa abierto/cerrado si aplica"

    rules:
      - "TALLER != GASTOS"
      - "TALLER != INVERSIONES"
      - "TALLER != Action Register"
      - "TALLER en M4 como familia agregada != detalle M5 por AT"

  period_semantics:
    determine:
      - "mes"
      - "rango"
      - "fecha"
      - "defaults existentes"
      - "qué necesita el primer slice"
      - "qué ocurre sin periodo"

    rule: >
      No inventar periodo. Si el producto usa periodo obligatorio o default
      explícito, documentarlo; si no hay regla segura, clarificar.

  query_shape:
    determine:
      - "qué preguntas concretas puede responder"
      - "por AT"
      - "por planta"
      - "por periodo"
      - "por estatus si existe"
      - "por folio si existe"
      - "totales/conteos si son derivables"

  action_register_boundary:
    inspect:
      - "cualquier uso de 'AT' que choque con Action Register"
      - "routing actual"
      - "planner intents"
      - "DICF/AR si tienen vocabulario similar"

    rule: >
      Taller por AT no debe absorber preguntas de Action Register ni viceversa.

  m4_m6_boundary:
    required:
      - "M4 usa TALLER como familia agregada en comparativo"
      - "M6 cubre GASTOS/INVERSIONES, no TALLER"
      - "M5 debe aportar detalle nuevo por unidad AT"

  excel_boundary:
    inspect:
      - "endpoint/export Excel"
      - "workbook builders"
      - "si consumen la misma fuente"

    rule: >
      Excel puede reutilizar la misma fuente, pero no debe ser transporte ni
      dependencia del slice Director IA.

  duplicates_boundary:
    inspect:
      - "duplicados"
      - "si forman parte canónica de M5"
      - "si el slice query debe excluirlos"

    rule: >
      No ampliar el slice a duplicados salvo que la ficha canónica y la fuente
      lo exijan explícitamente.

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "planta_id"
      - "plantas_permitidas"
      - "GA/GV"
      - "cross-planta"
      - "fail-closed"
      - "authz vigente de Taller"

  planner_tools:
    inspect:
      - "expense_analysis"
      - "investment_analysis"
      - "folio-related intents"
      - "Action Register intents"
      - "capabilities"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "tools existentes"
      - "executor"
      - "chat routing"

    determine:
      - "si hace falta intent taller_at"
      - "qué frases lo activan"
      - "cómo evitar colisiones"
      - "tool/executor mínimo"

architecture_hypothesis:
  preferred_path: >
    taller_at ->
    get_taller_at ->
    loadTallerAtForChat(planta_id, at, periodo) ->
    SELECT/helper estructurado ->
    evidencia ->
    respuesta

  requirements:
    - "in-process"
    - "SELECT-only"
    - "sin HTTP interno"
    - "sin Excel"
    - "sin writes"
    - "sin Action Register"
    - "sin contrato nuevo"

response_contract:
  include_if_physically_supported:
    - "planta_id"
    - "at_id/clave"
    - "at_nombre"
    - "folio_id"
    - "numero_folio"
    - "periodo/fecha"
    - "concepto"
    - "importe"
    - "estatus"
    - "count"
    - "total"
    - "source"

  forbidden:
    - "causa"
    - "responsable inferido"
    - "atrasado"
    - "urgente"
    - "desviación"
    - "prioridad"
    - "comparación no solicitada"
    - "datos Action Register"

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "AT_field"
    - "plant_field"
    - "period_field"
    - "select_only"
    - "excel_dependency"
    - "side_effects"
    - "authz"
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
  - "consulta por AT"
  - "AT existente"
  - "AT inexistente"
  - "AT ambiguo si aplica"
  - "por planta"
  - "por periodo"
  - "sin periodo"
  - "TALLER separado de GASTOS"
  - "TALLER separado de INVERSIONES"
  - "TALLER separado de Action Register"
  - "folios"
  - "importe"
  - "estatus"
  - "0 registros"
  - "nulls"
  - "conteo"
  - "total"
  - "planta autorizada"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "cross-planta"
  - "GA/GV"
  - "intent"
  - "tool/executor"
  - "chat wiring"
  - "no Excel"
  - "no duplicados si fuera de slice"
  - "no HTTP interno"
  - "sin writes"

decision_rules:

  ready:
    all:
      - "fuente Taller físicamente clara"
      - "unidad AT físicamente definida"
      - "SELECT-only"
      - "scope planta preservable"
      - "authz preservable"
      - "period semantics segura"
      - "Taller separable de M4/M6/AR"
      - "Excel separable"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M5-TALLER-AT-001"

  stopped:
    when:
      - "AT no tiene identidad física utilizable"
      - "fuente Taller depende inseparablemente de Excel"
      - "routing Taller/AR no puede separarse"
      - "authz no puede preservarse"
      - "semántica requiere contrato nuevo"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m5_state: "PARTIAL"
    numerator: 10.5
    denominator: 20
    percentage: 52.5
    gain_pp: 2.5

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"

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
  - "modificar SQL"
  - "modificar capability matrix"
  - "modificar contratos"
  - "generar Excel"
  - "hacer writes"
  - "integrar Action Register"
  - "integrar duplicados"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Definición canónica M5 verificada."
  - "Fuente Taller identificada."
  - "AT definido físicamente."
  - "SELECT-only verificado."
  - "Semántica de periodo verificada."
  - "TALLER separado de GASTOS/INVERSIONES."
  - "TALLER separado de M4 agregado."
  - "TALLER separado de Action Register."
  - "Excel separado."
  - "Duplicados separados si no pertenecen al slice."
  - "Authz verificada."
  - "Planner/tools auditados."
  - "Path mínimo definido."
  - "Tests diseñados."
  - "G2/G3 determinados."
  - "M5 no cambia durante readiness."
  - "50.0% no cambia."
  - "Solo CURRENT_TASK y reporte cambian."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M5"
    - "physical source"
    - "AT semantics"
    - "Taller semantics"
    - "period semantics"
    - "query shape"
    - "M4 boundary"
    - "M6 boundary"
    - "Action Register boundary"
    - "Excel boundary"
    - "duplicates boundary"
    - "authz"
    - "planner/tools"
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
  DONE_PENDING_REVIEW si existe path Taller/AT SELECT-only, in-process y
  semánticamente separado. STOPPED si AT/fuente/authz no son seguros.
  BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"