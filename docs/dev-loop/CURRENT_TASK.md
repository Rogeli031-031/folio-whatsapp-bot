# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T12:40:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la capability matrix M0-M20 para reflejar el
  estado físico real de M9 — Delta Venta / Descuento / Ingreso — después de
  la integración read-only ya fusionada en main, verificando si satisface la
  definición canónica de COMPLETE y recalculando el avance global sin
  reinterpretar contratos ni ampliar M9 a mutaciones.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001"
  implementation_task: "IMPL-DIRECTOR-IA-M9-DELTAS-001"
  implementation_state: "integrated_in_main"
  main_merge_commit: "7b3e5a9801f17f1224bf594476e5dfecaa772ce1"

  module: "M9"
  module_name: "Delta Venta / Descuento / Ingreso"

  current_matrix_state: "INDIRECTA"
  expected_state_if_evidence_matches: "COMPLETE"

  current_m0_m20_percentage: 40.0
  current_numerator: 8.0
  denominator: 20

  potential_gain_pp: 2.5
  projected_numerator_if_complete: 8.5
  projected_percentage_if_complete: 42.5

canonical_families:

  delta_venta:
    intent: "delta_sales"
    tool: "get_delta_sales"
    executor: "loadDeltaVentaForChat"
    physical_source: "arr.ventas_diarias_cliente"
    unit: "kg"

  delta_descuento:
    intent: "delta_discount"
    tool: "get_delta_discount"
    executor: "loadDeltaDescuentoForChat"
    physical_source: "fuentes de descuento + kg"
    unit: "$/kg"

  delta_ingreso:
    intent: "delta_income"
    tool: "get_delta_income"
    executor: "loadDeltaIngresoForChat"
    physical_semantics: "kg × (margen − |descuento|)"
    mutation_forecast: "explicitly excluded"

implemented_behavior:
  mode: "read_only"

  wiring:
    - "intent -> tool -> executor -> helper/fuente -> respuesta"
    - "in-process"
    - "sin HTTP interno"

  authz:
    - "GA preservado"
    - "GV preservado"
    - "plantas_permitidas preservado"
    - "sin cross-planta"
    - "fail-closed"

  periods:
    - "A != B"
    - "defaults únicamente desde periodos YYYY-MM existentes"
    - "default = dos periodos más recientes disponibles"
    - "no se inventan periodos"

  null_semantics:
    - "null/unknown preservado"
    - "no convertir ausencia/error en cero"
    - "percentChangeOrUnknown no genera porcentaje cuando base = 0"

  exclusions:
    - "M19 Delta Ingreso AI test"
    - "forecast ingreso con DELETE/INSERT"
    - "IGF como sustituto"
    - "ARR snapshot general como sustituto"
    - "KPIs M3 como sustituto"
    - "mutaciones"

canonical_check:
  definition: >
    M9 es COMPLETE únicamente si Director IA consulta directamente y de forma
    consistente las tres familias canónicas — Delta Venta, Delta Descuento y
    Delta Ingreso — dentro del scope autorizado, usando sus fuentes reales,
    preservando periodos, authz y semántica, sin mutaciones ni sustituciones por
    otros dominios.

  required:
    - "Delta Venta integrada"
    - "Delta Descuento integrada"
    - "Delta Ingreso integrada"
    - "las tres tools tienen executor real"
    - "los tres intents llegan a la familia correcta"
    - "wiring chat real"
    - "fuentes reales"
    - "authz preservada"
    - "scope planta preservado"
    - "periodos preservados"
    - "null/division-by-zero preservados"
    - "M9 separado de M19"
    - "sin forecast mutante"
    - "sin HTTP interno"
    - "sin mutaciones"

semantic_invariants:
  - "Delta Venta ≠ Delta Descuento ≠ Delta Ingreso."
  - "M9 ≠ M19."
  - "No usar IGF como sustituto."
  - "No usar ARR snapshot general como sustituto."
  - "No usar KPIs M3 como sustituto."
  - "No afirmar causalidad a partir del delta."
  - "No afirmar mejora/deterioro sin métrica y signo."
  - "No inventar periodos."
  - "No producir porcentaje válido cuando la base es cero."
  - "No convertir null/unknown/error en cero."
  - "No ampliar plantas_permitidas."
  - "No ampliar GA/GV."
  - "No ejecutar forecast con DELETE/INSERT."
  - "M9 permanece read-only."

evidence_requirements:

  delta_venta:
    verify:
      - "intent delta_sales"
      - "tool get_delta_sales"
      - "executor loadDeltaVentaForChat"
      - "fuente real arr.ventas_diarias_cliente"
      - "wiring chat"
      - "periodos"
      - "authz"
      - "sin side effects"

  delta_descuento:
    verify:
      - "intent delta_discount"
      - "tool get_delta_discount"
      - "executor loadDeltaDescuentoForChat"
      - "fuente real de descuento y kg"
      - "wiring chat"
      - "periodos"
      - "authz"
      - "sin side effects"

  delta_ingreso:
    verify:
      - "intent delta_income"
      - "tool get_delta_income"
      - "executor loadDeltaIngresoForChat"
      - "semántica kg × (margen − |descuento|)"
      - "wiring chat"
      - "periodos"
      - "authz"
      - "sin forecast DELETE/INSERT"
      - "M19 fuera"

  tests:
    verify:
      - "23/23 focales M9"
      - "25/25 capabilities"
      - "30/30 planner"
      - "24/24 orchestrator"
      - "459/459 suite Director IA"
      - "git diff --check limpio en implementación"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
    - "lib/director-ia-m9-deltas.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-capabilities.js"
    - "server.js"
    - "test/director-ia-m9-deltas.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "docs/director-ia/**"

out_of_scope:
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar contratos arquitectónicos"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "modificar otros módulos salvo referencias matemáticas agregadas necesarias"
  - "integrar M19"
  - "ejecutar forecast ingreso"
  - "mutar ARR"
  - "mutar folios"
  - "mutar Action Register"
  - "cambiar authz"
  - "HTTP interno"
  - "cycle constitucional"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "abrir o ejecutar automáticamente la siguiente tarea"

matrix_update_policy:

  if_complete:
    required:
      - "cambiar M9 de INDIRECTA a COMPLETA/COMPLETE según terminología vigente"
      - "actualizar Cobertura actual de Director IA"
      - "actualizar Información exacta que sí consulta"
      - "actualizar Información que no consulta eliminando únicamente gaps ya cerrados"
      - "actualizar archivos actuales relacionados"
      - "actualizar endpoints/tools/helpers relevantes"
      - "actualizar capacidades de lectura"
      - "preservar cualquier capacidad de escritura como no integrada"
      - "actualizar permisos aplicables"
      - "actualizar observaciones verificadas"
      - "preservar explícitamente separación M9/M19"
      - "preservar exclusión del forecast mutante"
      - "actualizar Parte 9 o resúmenes M0-M20 matemáticamente afectados"
      - "recalcular numerador y porcentaje"

    forbidden:
      - "marcar M19 como integrado"
      - "marcar forecast con escritura como integrado"
      - "cambiar otros módulos funcionalmente"
      - "eliminar limitaciones reales"
      - "reescribir historia del documento"

  if_not_complete:
    required:
      - "no cambiar M9 a COMPLETE"
      - "documentar gap físico"
      - "STOPPED si requiere reinterpretación contractual"

percentage_check:
  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    INDIRECTA: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"

  expected_denominator: 20

  before:
    numerator: 8.0
    percentage: 40.0

  if_m9_complete:
    numerator: 8.5
    percentage: 42.5

  rule: >
    Recalcular desde la matriz vigente. No asumir 42.5% si otra etiqueta o el
    denominador cambió desde la última priorización.

allowed_actions:
  - "leer físicamente implementación y reportes"
  - "verificar wiring real M9"
  - "verificar resultados de tests"
  - "aplicar definición canónica de COMPLETE"
  - "actualizar únicamente ficha M9 y resúmenes matemáticos afectados"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "proponer exactamente una NEXT_TASK"
  - "no autorizar NEXT_TASK"

forbidden_actions:
  - "modificar código"
  - "modificar tests"
  - "modificar runtime"
  - "modificar arquitectura"
  - "crear contrato"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó físicamente M9 integrado en main."
  - "Se verificó Delta Venta."
  - "Se verificó Delta Descuento."
  - "Se verificó Delta Ingreso."
  - "Se verificaron intents, tools y executors."
  - "Se verificó wiring chat real."
  - "Se verificaron fuentes reales."
  - "Se verificó authz."
  - "Se verificó scope por planta."
  - "Se verificaron periodos."
  - "Se verificaron nulls y base cero."
  - "Se verificó separación M9/M19."
  - "Se verificó exclusión del forecast con escritura."
  - "Se verificó ausencia de mutaciones."
  - "Se verificó ausencia de HTTP interno."
  - "La definición vigente de COMPLETE se aplicó sin reinterpretación."
  - "M9 solo se marca COMPLETE si la evidencia lo sustenta."
  - "El porcentaje se recalcula desde la matriz vigente."
  - "Solo M9 y resúmenes matemáticos directamente afectados cambian."
  - "No se modifica código."
  - "No se modifican otros contratos."
  - "git diff --check limpio."
  - "Solo CURRENT_TASK, reporte y capability matrix modificados."
  - "Hay exactamente una NEXT_TASK si procede."
  - "NEXT_TASK permanece no autorizada."

next_task_policy:
  if_m9_complete:
    propose_exactly_one: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004"

  if_m9_not_complete:
    propose_exactly_one: "none until human review"

  note: "No autorizar ni ejecutar."

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "evidencia Delta Venta"
    - "evidencia Delta Descuento"
    - "evidencia Delta Ingreso"
    - "M9 vs M19"
    - "forecast con escritura excluido"
    - "authz"
    - "periodos"
    - "null/base cero"
    - "tests verificados"
    - "evaluación COMPLETE"
    - "cambios exactos en matriz"
    - "recalculo M0-M20"
    - "porcentaje antes/después"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK propuesta"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la evidencia integrada satisface COMPLETE y la matriz
  queda sincronizada sin ampliar alcance. STOPPED si la documentación requiere
  reinterpretación contractual. BLOCKED si falta gate o dato humano
  indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"