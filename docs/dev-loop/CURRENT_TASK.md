# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M9-DELTAS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T12:40:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M9-DELTAS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar M9 — Delta Venta / Descuento / Ingreso — como integración
  read-only real de Director IA, cableando las tres familias delta a sus
  helpers/fuentes existentes mediante ejecución in-process, preservando authz,
  semántica de periodos, nulls, separación M9/M19 y scope por planta, sin
  mutaciones, sin HTTP interno y sin modificar contratos arquitectónicos.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
  current_m0_m20_percentage: 40.0
  current_numerator: 8.0
  denominator: 20
  module: "M9"
  current_state: "INDIRECTA"
  target_state_after_implementation: "physically ready for COMPLETE"
  potential_gain_pp_after_docs_sync: 2.5
  projected_percentage_after_docs_sync: 42.5

canonical_families:

  delta_venta:
    intent: "delta_sales"
    tool: "get_delta_sales"
    required:
      - "executor read-only real"
      - "usar helper/fuente delta venta real"
      - "preservar periodos"
      - "preservar shape y null semantics"
      - "preservar authz"
      - "wiring chat real"

  delta_descuento:
    intent: "delta_discount"
    tool: "get_delta_discount"
    required:
      - "executor read-only real"
      - "usar helper/fuente delta descuento real"
      - "preservar periodos"
      - "preservar shape y null semantics"
      - "preservar authz"
      - "wiring chat real"

  delta_ingreso:
    intent: "delta_income"
    tool: "get_delta_income"
    required:
      - "executor read-only real"
      - "usar helper/fuente delta ingreso real"
      - "preservar periodos"
      - "preservar shape y null semantics"
      - "preservar authz"
      - "wiring chat real"
      - "mantener fuera cualquier forecast con DELETE/INSERT"

semantic_invariants:
  - "Delta Venta ≠ Delta Descuento ≠ Delta Ingreso."
  - "M9 ≠ M19."
  - "No usar IGF como sustituto de M9."
  - "No usar ARR snapshot general como sustituto de delta específico."
  - "No usar KPIs de M3 como sustituto de M9."
  - "No afirmar causalidad a partir de una diferencia."
  - "No afirmar mejora/deterioro sin definir métrica y signo."
  - "No inventar periodos."
  - "No convertir división por cero en porcentaje válido."
  - "No convertir null/unknown/error en cero."
  - "No ampliar plantas_permitidas."
  - "No saltarse GA/GV."
  - "No ejecutar forecast de ingreso que escriba."
  - "Toda respuesta debe mantener trazabilidad a la familia delta correcta."

authz_requirements:
  - "preservar restricciones existentes por planta"
  - "preservar GA"
  - "preservar GV"
  - "equivalente o más restrictivo que dashboard"
  - "no cross-planta"
  - "fail-closed ante planta no autorizada"
  - "fail-closed ante fuente no disponible"

implementation_requirements:

  loaders:
    - "crear o extraer loaders/helpers reutilizables read-only para las tres familias"
    - "reutilizar getDelta*Clientes o equivalentes reales"
    - "no duplicar lógica divergente del backend"
    - "no hacer HTTP interno"
    - "no introducir side effects"

  tools:
    - "get_delta_sales debe tener executor real"
    - "get_delta_discount debe tener executor real"
    - "get_delta_income debe tener executor real"
    - "cambiar estado de tools a available_on_demand o equivalente vigente"
    - "mantener inputs mínimos necesarios para planta y periodos"

  planner:
    - "conservar delta_sales"
    - "conservar delta_discount"
    - "conservar delta_income"
    - "no redirigir estos intents a IGF/ARR general"
    - "no introducir colisión con M19"

  chat:
    - "añadir wiring in-process intent -> tool/executor -> helper/fuente -> respuesta"
    - "evitar fallback erróneo a IGF/AR cuando la intención sea delta M9"
    - "preservar evidencia estructurada"
    - "preservar fail-closed"
    - "no integrar al cycle constitucional"

  ingreso:
    - "separar explícitamente consulta delta ingreso de cualquier forecast con DELETE/INSERT"
    - "no ejecutar ni importar ruta de mutación"
    - "no confundir M9 delta ingreso con M19 AI test"

  evidence:
    - "incluir familia"
    - "planta"
    - "periodo actual"
    - "periodo comparación"
    - "fuente"
    - "shape consultado"
    - "valores observados"
    - "derivados si aplican"
    - "null/unknown preservado"

  tests:
    - "happy path Delta Venta"
    - "happy path Delta Descuento"
    - "happy path Delta Ingreso"
    - "periodos válidos"
    - "periodos faltantes"
    - "periodos inválidos"
    - "planta_id ausente"
    - "planta no autorizada"
    - "GA"
    - "GV"
    - "cross-planta"
    - "null"
    - "cero"
    - "división por cero"
    - "fuente vacía"
    - "error de fuente"
    - "M9 no cae a IGF"
    - "M9 no cae a ARR snapshot general"
    - "M9 no cae a M19"
    - "tools con executor"
    - "intents preservados"
    - "sin side effects"
    - "sin forecast DELETE/INSERT"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-m9-deltas.js"
    - "server.js"
    - "test/director-ia-m9-deltas.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
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
  - "crear migrations"
  - "modificar schema"
  - "crear endpoint nuevo"
  - "cambiar contrato HTTP"
  - "cargar ARR"
  - "mutar ARR"
  - "mutar folios"
  - "mutar Action Register"
  - "ejecutar forecast de ingreso con DELETE/INSERT"
  - "integrar M19"
  - "reabrir M3"
  - "HTTP interno"
  - "dispatcher genérico"
  - "cycle constitucional"
  - "OP/EB/EKS/IES/Reasoning"
  - "smoke productivo"
  - "secretos/credenciales"
  - "commit"
  - "push"
  - "merge"
  - "sync documental M9 a COMPLETE"
  - "abrir o ejecutar automáticamente la siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/01-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"

allowed_actions:
  - "crear loaders/helpers read-only M9"
  - "cablear las tres tools M9"
  - "ajustar planner solo si hace falta para routing correcto"
  - "ajustar capabilities solo en lo necesario"
  - "ajustar chat para routing M9"
  - "extraer/reutilizar lógica desde server/lib sin cambiar contrato HTTP"
  - "crear tests focales M9"
  - "actualizar scripts afectados"
  - "ejecutar tests locales"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "escribir reporte"
  - "proponer exactamente una NEXT_TASK"

forbidden_actions:
  - "modificar arquitectura congelada"
  - "crear contrato arquitectónico"
  - "ampliar authz"
  - "introducir mutaciones"
  - "ejecutar forecast de ingreso con escritura"
  - "crear endpoint nuevo"
  - "hacer HTTP interno"
  - "integrar M19"
  - "integrar al cycle"
  - "tocar frontend"
  - "tocar SQL/migrations"
  - "commit"
  - "push"
  - "merge"
  - "encadenar NEXT_TASK"

acceptance_criteria:
  - "Delta Venta es consultable directamente por Director IA."
  - "Delta Descuento es consultable directamente por Director IA."
  - "Delta Ingreso es consultable directamente por Director IA."
  - "Cada familia usa su fuente/helper real."
  - "Las tres tools tienen executor real."
  - "Los tres intents llegan a la familia correcta."
  - "M9 no cae a IGF/ARR general."
  - "M9 permanece separado de M19."
  - "No se ejecuta forecast de ingreso con DELETE/INSERT."
  - "Authz GA/GV/planta se preserva."
  - "No hay cross-planta."
  - "Periodos se preservan."
  - "Null/unknown se preservan."
  - "División por cero no produce porcentaje falso."
  - "No hay mutaciones."
  - "No hay HTTP interno."
  - "No hay cambio de contrato HTTP."
  - "No hay cambio arquitectónico."
  - "No se modifica capability matrix."
  - "Tests focales M9 verdes."
  - "Scripts afectados verdes."
  - "Suite Director IA relevante verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."
  - "M9 queda físicamente listo para una tarea documental separada que lo marque COMPLETE."

required_validation:
  - "node --test test/director-ia-m9-deltas.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001"

  if_contract_or_architecture_conflict:
    outcome: "STOPPED"

  if_missing_human_gate_or_external_dependency:
    outcome: "BLOCKED"

  note: "No autorizar ni ejecutar NEXT_TASK."

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "Delta Venta"
    - "Delta Descuento"
    - "Delta Ingreso"
    - "M9 vs M19"
    - "authz"
    - "periodos"
    - "null/division by zero"
    - "wiring"
    - "tools/executors"
    - "tests"
    - "resultados completos"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK propuesta"

expected_terminal_state: >
  DONE_PENDING_REVIEW si las tres familias M9 quedan integradas read-only con
  authz, semántica, tests y separación M19 correctos, dejando M9 físicamente
  listo para COMPLETE. STOPPED ante contradicción contractual o necesidad de
  G2/G3. BLOCKED si falta gate humano o dependencia indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"