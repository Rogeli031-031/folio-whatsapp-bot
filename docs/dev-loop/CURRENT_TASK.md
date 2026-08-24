# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M5-TALLER-AT-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M5-TALLER-AT-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer slice read-only de M5 — Taller por AT — para que
  Director IA pueda consultar registros TALLER por unidad homologada AT/PT,
  planta y periodo YYYY-MM mediante SELECT sobre public.folios e integración
  in-process, sin Excel, sin duplicados, sin Action Register, sin HTTP interno
  y sin writes.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"

  module: "M5 — Taller por AT"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_percentage:
    before: 50.0
    before_numerator: 10.0
    denominator: 20
    after: 52.5
    after_numerator: 10.5
    gain_pp: 2.5

canonical_boundary:
  this_slice:
    - "query JSON read-only de Taller por unidad"

  still_out:
    - "Excel/workbook"
    - "duplicados"
    - "writes"
    - "cualquier capacidad canónica no incluida"

  rule: >
    Después de este slice M5 debe quedar PARTIAL, nunca COMPLETE.

readiness_findings:
  source: "public.folios"

  unidad_semantics:
    field: "unidad"
    meaning: >
      Token homologado físico de unidad, por ejemplo AT-15, PT-..., según
      valores existentes en public.folios.unidad.

    no_catalog: true
    no_at_id: true

    rule: >
      No inventar at_id, catálogo ni entidad AT separada.

  period:
    required: true
    format: "YYYY-MM"
    missing: "clarification"

  source_before_excel: true

architecture:
  intent: "taller_at"
  tool: "get_taller_at"
  loader: "loadTallerAtForChat"

  path: >
    taller_at ->
    get_taller_at ->
    loadTallerAtForChat(planta_id, unidad, periodo) ->
    SELECT public.folios ->
    evidencia ->
    respuesta

  requirements:
    - "in-process"
    - "SELECT-only"
    - "sin HTTP interno"
    - "sin Excel"
    - "sin duplicados"
    - "sin Action Register"
    - "sin writes"

source_rules:
  taller:
    required:
      - "usar predicado físico de TALLER verificado en readiness"
      - "no mezclar GASTOS"
      - "no mezclar INVERSIONES"

  unidad:
    required:
      - "filtrar por public.folios.unidad"
      - "usar token real"
      - "normalización solo si existe helper físico actual"
      - "no fuzzy match silencioso"

  planta:
    required:
      - "planta_id autorizado"
      - "no ampliar scope"

  periodo:
    required:
      - "YYYY-MM"
      - "no inventar"
      - "no usar mes actual silenciosamente"

query_scope:
  include_if_supported:
    - "planta_id"
    - "unidad"
    - "folio_id"
    - "numero_folio"
    - "fecha/periodo"
    - "concepto"
    - "importe"
    - "estatus"
    - "count"
    - "total"
    - "source"

  zero_rows: >
    Respuesta válida: no se encontraron registros TALLER para esa planta,
    unidad y periodo. No reinterpretar como error ni inexistencia histórica.

semantic_boundaries:
  - "TALLER != GASTOS"
  - "TALLER != INVERSIONES"
  - "TALLER != Action Register"
  - "M5 detalle por unidad != M4 familia agregada"
  - "unidad AT/PT != responsable"
  - "estatus observado != atraso"
  - "importe != desviación"
  - "registro != causa"

planner:
  required:
    - "habilitar intent taller_at"
    - "detectar consultas explícitas de Taller por unidad"
    - "preservar expense_analysis"
    - "preservar investment_analysis"
    - "preservar clasificación M4"
    - "preservar intents de Action Register"

  positive_examples:
    - "¿Qué tiene Taller para AT-15 este mes?"
    - "Muéstrame Taller de AT-15 en 2026-08"
    - "¿Cuánto hay de Taller en PT-03 en julio?"

  negative_examples:
    - "¿Qué acciones tiene AT-15?"
    - "¿Qué gastos hay este mes?"
    - "¿Qué inversiones hay?"
    - "Compara Taller contra el mes pasado"

tools:
  required:
    - "get_taller_at executable"
    - "executor real"
    - "inputs planta_id, unidad, periodo"
    - "sin params de Excel/duplicados"

capabilities:
  required:
    - "habilitar lectura M5 query"
    - "mantener Excel no integrado"
    - "M5 runtime = PARTIAL"

authz:
  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "GA/GV según reglas reales de Taller/folios"
    - "cross-planta bloqueado"
    - "fail-closed"

  ordering:
    - "resolver planta"
    - "autorizar"
    - "consultar"

  rule: >
    No ejecutar SELECT de otra planta antes de autorización.

response_policy:
  allowed:
    - "registros observados"
    - "conteo"
    - "total si se deriva de importes reales"
    - "estatus físico"
    - "unidad física"

  forbidden_without_evidence:
    - "causa"
    - "responsable"
    - "atrasado"
    - "urgente"
    - "prioridad"
    - "desviación"
    - "problema"
    - "comparación temporal no solicitada"

excel_boundary:
  rules:
    - "no generar workbook"
    - "no usar Excel como transporte"
    - "no invocar builder de export"
    - "la fuente estructurada es public.folios"

duplicates_boundary:
  rules:
    - "duplicados fuera"
    - "no consultar/crear lógica de duplicados"

action_register_boundary:
  rules:
    - "no leer Action Register para este slice"
    - "no interpretar AT como Action Register"
    - "no absorber preguntas de acciones"

m4_m6_boundary:
  rules:
    - "M4 permanece dominio de comparativo agregado"
    - "M6 permanece GASTOS/INVERSIONES"
    - "M5 cubre detalle TALLER por unidad"

tests_required:
  focal:
    - "intent taller_at"
    - "tool executable"
    - "executor"
    - "consulta AT-15"
    - "consulta PT"
    - "unidad existente"
    - "unidad inexistente"
    - "periodo YYYY-MM válido"
    - "periodo ausente -> clarificación"
    - "periodo inválido"
    - "TALLER separado de GASTOS"
    - "TALLER separado de INVERSIONES"
    - "M4 preservado"
    - "Action Register preservado"
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
    - "sin Excel"
    - "sin workbook"
    - "sin duplicados"
    - "sin HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m5-taller-at.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m5-taller-at.test.js"

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
  - "docs/director-ia/**"
  - "capability matrix"
  - "server.js"
  - "frontend"
  - "SQL/schema/migrations"
  - "Excel/workbook"
  - "duplicados"
  - "Action Register"
  - "writes"
  - "HTTP interno"
  - "contratos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "NEXT_TASK"

acceptance_criteria:
  - "Existe intent taller_at."
  - "Existe get_taller_at executable."
  - "Existe loadTallerAtForChat."
  - "Consulta usa SELECT public.folios."
  - "Unidad usa token físico public.folios.unidad."
  - "No existe/inventa at_id."
  - "Periodo YYYY-MM obligatorio."
  - "Periodo ausente clarifica."
  - "TALLER separado de GASTOS/INVERSIONES."
  - "M4 preservado."
  - "Action Register preservado."
  - "Authz antes de SELECT."
  - "No cross-planta."
  - "No Excel."
  - "No workbook."
  - "No duplicados."
  - "No HTTP interno."
  - "No writes."
  - "M5 queda PARTIAL."
  - "M5 no COMPLETE."
  - "Futura sync lleva 10.0/20 -> 10.5/20 = 52.5%."
  - "Tests focales verdes."
  - "Regresión completa verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m5-taller-at.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001"

  rule: >
    La sync posterior debe cambiar M5 de NO INTEGRADA a PARTIAL y recalcular
    10.0/20 -> 10.5/20 = 52.5%. No marcar COMPLETE.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "path físico"
    - "public.folios"
    - "unidad semantics"
    - "Taller predicate"
    - "period semantics"
    - "plant scope"
    - "authz"
    - "planner"
    - "tool/executor"
    - "chat wiring"
    - "M4 boundary"
    - "M6 boundary"
    - "Action Register boundary"
    - "Excel boundary"
    - "duplicates boundary"
    - "tests"
    - "M5 state"
    - "percentage future"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si Taller/AT queda integrado SELECT-only, in-process,
  autorizado y separado de M4/M6/AR/Excel. STOPPED si aparece contradicción
  física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"