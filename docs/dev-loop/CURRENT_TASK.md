# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente el primer slice read-only de M4 — Clasificación de apoyos
  + COMPARAR — para habilitar en Director IA la consulta JSON comparativa entre
  mes_a y mes_b por planta y familia/categoría, reutilizando
  buildClasificacionMatrix y fuentes SELECT-only, sin Excel, sin COMPARAR writes,
  sin HTTP interno y sin reinterpretar el módulo como COMPLETE.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"

  module: "M4 — Clasificación de apoyos + COMPARAR"
  current_state: "NO INTEGRADA"
  expected_state_after_future_slice: "PARTIAL"

  global_percentage:
    current: 45.0
    numerator: 9.0
    denominator: 20
    expected_after_future_slice: 47.5
    expected_gain_pp: 2.5

canonical_boundary:
  complete_requires:
    - "COMPARAR"
    - "Excel/reconciliación"
    - "propósito completo vigente de M4"

  this_slice:
    - "query JSON read-only"
    - "mes_a vs mes_b"
    - "matriz comparativa"
    - "diffs observables"

  rule: >
    Aunque el slice sea implementable, M4 solo puede llegar a PARTIAL.
    No reinterpretar COMPLETE.

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA responda comparativos mensuales de Clasificación de apoyos
  entre mes_a y mes_b, por planta y familia GASTOS / INVERSIONES / TALLER,
  reutilizando buildClasificacionMatrix sin ejecutar COMPARAR, Excel ni writes?

known_baseline:
  expected_route: "GET /api/dashboard/clasificacion-apoyos"
  expected_helper: "buildClasificacionMatrix"

  expected_categories:
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"

  expected_period_rules:
    - "mes_a obligatorio"
    - "mes_b obligatorio"
    - "formato YYYY-MM"
    - "mes_a != mes_b"

  known_risks:
    - "planta_id opcional en producto puede caer a conjunto global"
    - "Director IA debe ser más restrictivo"
    - "COMPARAR POSTs escriben"
    - "Excel pertenece al propósito canónico pero queda fuera"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M4 completa y vigente"
      - "confirmar propósito canónico"
      - "confirmar PARTIAL_ONLY para query"
      - "confirmar que COMPARAR/Excel siguen siendo necesarios para COMPLETE"
      - "confirmar efecto futuro 45.0 -> 47.5"

  source_and_helper:
    inspect:
      - "GET /api/dashboard/clasificacion-apoyos"
      - "buildClasificacionMatrix"
      - "queries subyacentes"
      - "public.folios"
      - "helpers auxiliares"
      - "PLANTAS_COMPARATIVO si aplica"

    determine:
      - "SELECT-only"
      - "side effects"
      - "shape de matriz"
      - "campos observados"
      - "campos derivados"
      - "tratamiento de ausencia"
      - "orden"
      - "defaults/fallbacks"

  periods:
    determine:
      - "mes_a"
      - "mes_b"
      - "YYYY-MM"
      - "A != B"
      - "periodo inválido"
      - "mes ausente"
      - "si existen defaults"
      - "no inventar periodos"

  categories:
    required:
      - "GASTOS"
      - "INVERSIONES"
      - "TALLER"

    determine:
      - "cómo se identifican físicamente"
      - "si la matriz las mantiene separadas"
      - "qué métricas/diffs produce"
      - "qué puede afirmar Director IA"

  comparison_semantics:
    determine:
      - "valor mes_a"
      - "valor mes_b"
      - "delta absoluto"
      - "delta porcentual solo si físicamente definido"
      - "base cero"
      - "ausencia"
      - "nulos"
      - "qué significa aumento/disminución"
      - "qué NO significa causalidad"

    rules:
      - "comparación ≠ explicación causal"
      - "delta ≠ desviación presupuestal"
      - "aumento ≠ problema"
      - "disminución ≠ mejora"
      - "no inventar baseline distinto de mes_a/mes_b"

  plant_scope:
    determine:
      - "planta_id del endpoint"
      - "fallback actual"
      - "PLANTAS_COMPARATIVO"
      - "planta autorizada"
      - "plantas_permitidas"
      - "cross-planta"
      - "cómo debe restringir Director IA"

    rule: >
      Si el endpoint actual puede hacer fallback a múltiples plantas cuando
      planta_id no está permitido, Director IA no debe copiar ese comportamiento.
      Debe fail-closed o clarificar.

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "GA"
      - "GV"
      - "priv_clave/solo_zp_ad si aplica"
      - "planta_id"
      - "plantas_permitidas"
      - "cross-planta"

  planner_tools:
    inspect:
      - "si existe intent de clasificación"
      - "capability clasificacion_apoyos"
      - "tools actuales"
      - "executor"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "routing chat"

    determine:
      - "qué falta"
      - "si requiere nuevo intent"
      - "si puede usar intent existente sin colisión"
      - "tool/executor mínimo"
      - "guardrails"

  comparar_boundary:
    inspect:
      - "POSTs COMPARAR"
      - "lib/clasificacion-comparar.js"
      - "insertFolio"
      - "UPDATE mes_cargo"
      - "cualquier otra write"

    rule: >
      Confirmar que ninguna ruta/write de COMPARAR es necesaria para producir
      la query JSON.

  excel_boundary:
    inspect:
      - "clasificacion-apoyos-excel"
      - "workbook/export"
      - "si consume la misma matriz"

    rule: >
      Excel puede reutilizar la matriz, pero no es fuente primaria para Director IA
      y queda fuera del slice.

architecture_hypothesis:
  preferred_path: >
    intent clasificacion_apoyos_query -> tool -> executor ->
    loadClasificacionApoyosForChat(mes_a, mes_b, planta_id) ->
    SELECT/helper -> buildClasificacionMatrix ->
    evidencia -> respuesta

  requirements:
    - "in-process"
    - "sin HTTP interno"
    - "sin COMPARAR"
    - "sin Excel"
    - "sin writes"
    - "sin contrato nuevo"

response_contract:
  include_if_supported:
    - "planta_id"
    - "planta_nombre/clave"
    - "mes_a"
    - "mes_b"
    - "familia/categoria"
    - "valor_a"
    - "valor_b"
    - "delta"
    - "percent_change solo si semánticamente seguro"
    - "source"

  forbidden:
    - "causa"
    - "responsable"
    - "desviación presupuestal"
    - "cumplimiento"
    - "recomendación automática"
    - "afirmaciones de COMPARAR"
    - "afirmaciones de reconciliación Excel"

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "query_type"
    - "select_only"
    - "side_effects"
    - "period_rules"
    - "category_rules"
    - "authz"
    - "plant_scope"
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
  - "mes_a vs mes_b"
  - "YYYY-MM inválido"
  - "mes_a ausente"
  - "mes_b ausente"
  - "mes_a == mes_b"
  - "GASTOS"
  - "INVERSIONES"
  - "TALLER"
  - "separación de familias"
  - "delta positivo"
  - "delta negativo"
  - "base cero"
  - "ausencia"
  - "nulls"
  - "planta autorizada"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "cross-planta"
  - "GA"
  - "GV"
  - "intent"
  - "tool/executor"
  - "chat wiring"
  - "no COMPARAR"
  - "no Excel"
  - "no HTTP interno"
  - "sin writes"
  - "M4 sigue PARTIAL"

decision_rules:

  ready:
    all:
      - "buildClasificacionMatrix reutilizable"
      - "fuente SELECT-only"
      - "mes_a/mes_b claros"
      - "familias claras"
      - "scope planta preservable"
      - "authz preservable"
      - "fallback global evitable"
      - "COMPARAR separable"
      - "Excel separable"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001"

  stopped:
    when:
      - "matrix depende de writes"
      - "COMPARAR es inseparable"
      - "Excel es inseparable"
      - "scope planta no puede preservarse"
      - "semántica requiere contrato nuevo"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m4_state: "PARTIAL"
    numerator: 9.5
    denominator: 20
    percentage: 47.5

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"

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
  - "ejecutar COMPARAR"
  - "generar Excel"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M4."
  - "Se confirmó query-only = PARTIAL."
  - "Se verificó buildClasificacionMatrix."
  - "Se verificó SELECT-only."
  - "Se verificaron mes_a/mes_b."
  - "Se verificó A != B."
  - "Se verificaron GASTOS/INVERSIONES/TALLER."
  - "Se verificó semántica de comparación."
  - "Se verificó scope planta."
  - "Se verificó authz."
  - "Se verificó fallback global."
  - "Se verificó separación COMPARAR."
  - "Se verificó separación Excel."
  - "Se auditó planner/tools."
  - "Se definió path mínimo."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M4 no cambia durante readiness."
  - "45.0% no cambia durante readiness."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M4"
    - "query-only PARTIAL"
    - "source/buildClasificacionMatrix"
    - "period semantics"
    - "families"
    - "comparison semantics"
    - "plant scope"
    - "authz"
    - "fallback global"
    - "planner/tools"
    - "COMPARAR boundary"
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
  DONE_PENDING_REVIEW si existe path matrix-query SELECT-only, in-process y
  separado de COMPARAR/Excel. STOPPED si la matriz depende de writes o scope
  inseguro. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"