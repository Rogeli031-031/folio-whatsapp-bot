# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T22:42:16-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21.
  Apruebo IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el slice read-only de M3 — Plantas / KPIs / Proyectos —
  determinado por ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001,
  de modo que Director IA pueda consultar directamente y responder de forma
  consistente sobre las tres familias canónicas del módulo, preservando authz,
  semántica y scope por planta, sin mutaciones, sin HTTP interno y sin tocar
  contratos arquitectónicos ni el cycle constitucional.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
  current_m0_m20_percentage: 37.5
  module: "M3"
  current_state: "PARTIAL"
  target_state_after_implementation: "physically ready for COMPLETE"
  potential_gain_pp_after_docs_sync: 2.5
  projected_percentage_after_docs_sync: 40.0

canonical_families:
  plantas:
    state: "already_integrated"
    required_change: "none unless needed to expose existing scoped identity to M3 evidence"
    required_evidence:
      - "planta_id"
      - "nombre"
      - "clave"
    forbidden:
      - "catálogo global de plantas"
      - "ampliar plantas_permitidas"

  kpis:
    state: "endpoint_exists_not_integrated"
    physical_source: "GET /api/dashboard/kpis"
    tables:
      - "public.folios"
      - "public.plantas"
    required:
      - "extraer/reutilizar lógica fuera del handler HTTP"
      - "consulta read-only in-process"
      - "preservar filtros y ventana del dashboard"
      - "reaplicar restricciones GA/GV/planta"
      - "evidencia estructurada"
    canonical_fields:
      - "total_activos"
      - "total_mxn"
      - "pendientes_zp"
      - "avg_aging"
      - "oldest"
      - "top_planta"
      - "top_categoria"

  proyectos:
    state: "dashboard_read_exists_not_integrated"
    physical_source: "GET /api/dashboard/proyectos + helpers de public.proyectos"
    required:
      - "extraer/reutilizar helpers read-only"
      - "completar get_project_status"
      - "rama in-process en Director IA"
      - "quitar/ajustar bloqueo UNSUPPORTED_RULES.proyectos"
      - "marcar capability proyectos como readable"
      - "reaplicar GV y scope por planta"
    forbidden:
      - "crear proyecto"
      - "editar proyecto"
      - "eliminar proyecto"
      - "inventar estatus retrasado"

semantic_invariants:
  - "No confundir proyectos con Action Register."
  - "Conservar clarificación del planner entre project_status y Action Register."
  - "No confundir KPIs dashboard con IGF, ARR o commercial_state."
  - "No afirmar salud, desempeño o causalidad a partir de KPIs de folios."
  - "No presentar 'retrasado' como estatus almacenado."
  - "Si se deriva retraso desde fecha_cierre_estimada, declararlo explícitamente como derivado."
  - "Preservar null/unknown."
  - "No convertir errores o ausencia de fuente en cero."
  - "Conservar únicamente los COALESCE que ya existen en la semántica fuente."
  - "No ampliar acceso cross-planta."
  - "GA no puede consultar KPIs financieros."
  - "GV no puede consultar KPIs ni proyectos."
  - "Toda respuesta debe mantener trazabilidad a fuente real."

authz_requirements:
  - "JWT dashboard vigente"
  - "planta_id obligatorio"
  - "equivalente o más restrictivo que las rutas dashboard existentes"
  - "reaplicar plantas_permitidas"
  - "GA bloqueado para KPIs"
  - "GV bloqueado para KPIs y proyectos"
  - "no aprovechar gaps preexistentes de GET /api/dashboard/proyectos para ampliar acceso"

implementation_requirements:

  kpis:
    - "extraer la lógica reutilizable de parseDashboardFilters/buildDashboardWhere y consultas necesarias, o un helper equivalente sin HTTP interno"
    - "evitar duplicar lógica divergente entre endpoint y Director IA"
    - "crear loader/executor read-only para KPIs"
    - "añadir tool/intento/rama mínima necesaria para consultar KPIs dashboard"
    - "conservar shape y semántica de GET /api/dashboard/kpis"
    - "documentar/transportar la ventana/filtros aplicados en evidencia"

  proyectos:
    - "extraer/reutilizar listarProyectosPorPlanta / listarProyectosPorPlantaOEquivalentes"
    - "usar campos reales de public.proyectos necesarios para respuesta"
    - "completar executor de get_project_status"
    - "cambiar estado de tool desde declared_not_integrated a available_on_demand"
    - "habilitar capability read-only de proyectos"
    - "quitar/ajustar UNSUPPORTED_RULES.proyectos para preguntas válidas de M3"
    - "mantener clarificación de planner para colisión con Action Register"

  chat:
    - "integración in-process, patrón M16"
    - "no HTTP interno"
    - "no dispatcher genérico nuevo"
    - "no integración al cycle constitucional"
    - "respuesta fail-closed ante authz/error/fuente no disponible"

  tests:
    - "happy path KPIs"
    - "happy path proyectos"
    - "empty KPIs según semántica fuente"
    - "proyectos vacíos"
    - "error de carga"
    - "planta_id ausente"
    - "cross-planta bloqueado"
    - "GA bloqueado en KPIs"
    - "GV bloqueado en KPIs"
    - "GV bloqueado en proyectos"
    - "null avg_aging/oldest/top_* preservados"
    - "project_status ya no devuelve SOURCE_NOT_INTEGRATED en consulta válida"
    - "clarificación Action Register vs Proyectos preservada"
    - "KPIs dashboard no se resuelven mediante IGF/ARR"
    - "get_project_status disponible con executor"
    - "capability proyectos canRead"
    - "ausencia de POST/mutaciones"
    - "scripts existentes actualizados si todavía esperan blocked/not_integrated"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
    - "lib/director-ia-m3-plantas-kpis-proyectos.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-planner.js"
    - "server.js"
    - "test/director-ia-m3-plantas-kpis-proyectos.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
    - "docs/director-ia/**"
    - "frontend-dashboard/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"
    - "test/**"
    - "lib/**"

out_of_scope:
  - "modificar docs/director-ia/**"
  - "modificar capability matrix"
  - "frontend"
  - "SQL/DDL"
  - "migrations"
  - "schema changes"
  - "crear endpoint GET /api/proyectos"
  - "crear proyecto"
  - "editar proyecto"
  - "eliminar proyecto"
  - "mutaciones de folios"
  - "mutaciones de Action Register"
  - "catálogo global de plantas"
  - "UI nueva"
  - "HTTP interno"
  - "dispatcher genérico"
  - "cycle constitucional"
  - "OP/EB/EKS/IES/Reasoning"
  - "G8"
  - "smoke productivo"
  - "secretos/credenciales"
  - "commit"
  - "push"
  - "merge"
  - "sync documental M3 a COMPLETE"
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
  - "crear/extraer helpers read-only de M3"
  - "modificar wiring de Director IA para KPIs y proyectos"
  - "modificar registry/capability/planner solo en lo necesario para M3"
  - "modificar server.js solo para extraer/reutilizar lógica sin cambiar contrato HTTP"
  - "crear tests focales M3"
  - "actualizar scripts de capabilities/planner/orchestrator"
  - "ejecutar tests locales"
  - "ejecutar git diff --check"
  - "escribir reporte"
  - "proponer siguiente tarea, sin autorizarla"

forbidden_actions:
  - "modificar arquitectura congelada"
  - "crear contrato nuevo"
  - "ampliar authz"
  - "cambiar semántica de endpoints existentes"
  - "introducir mutaciones"
  - "crear endpoint nuevo"
  - "hacer HTTP interno"
  - "integrar al cycle"
  - "tocar frontend"
  - "tocar SQL o migrations"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

acceptance_criteria:
  - "Plantas conserva scope actual sin catálogo global."
  - "KPIs son consultables directamente por Director IA."
  - "KPIs conservan shape, ventana, filtros y nulls de la fuente."
  - "GA queda bloqueado para KPIs."
  - "GV queda bloqueado para KPIs y proyectos."
  - "No hay acceso cross-planta."
  - "Proyectos son consultables directamente por Director IA."
  - "get_project_status tiene executor read-only."
  - "capability proyectos queda readable."
  - "UNSUPPORTED_RULES.proyectos deja pasar consultas válidas."
  - "La clarificación AR vs Proyectos permanece."
  - "No hay POST ni mutaciones."
  - "No hay HTTP interno."
  - "No hay cambio de contrato HTTP."
  - "No hay cambio arquitectónico."
  - "No hay cambio de capability matrix."
  - "Tests focales M3 verdes."
  - "Scripts afectados verdes."
  - "Suite Director IA relevante verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."
  - "M3 queda físicamente listo para una tarea documental separada que lo marque COMPLETE."

required_validation:
  - "node --test test/director-ia-m3-plantas-kpis-proyectos.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001"
  if_contract_or_architecture_conflict:
    outcome: "STOPPED"
  if_missing_human_gate_or_external_dependency:
    outcome: "BLOCKED"
  note: "No autorizar ni ejecutar NEXT_TASK."

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "implementación KPIs"
    - "implementación Proyectos"
    - "Plantas sin cambio o cambio mínimo"
    - "authz"
    - "semántica"
    - "wiring"
    - "tests"
    - "resultados completos"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK propuesta"

expected_terminal_state: >
  DONE_PENDING_REVIEW si KPIs y Proyectos quedan integrados read-only con authz,
  tests y semántica correctos y M3 queda físicamente listo para COMPLETE.
  STOPPED ante contradicción contractual o necesidad de G2/G3.
  BLOCKED si falta un gate humano o dependencia indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"