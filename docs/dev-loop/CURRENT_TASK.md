# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T22:42:16-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21.
  Apruebo DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la capability matrix M0-M20 para reflejar el
  estado físico real de M3 — Plantas / KPIs / Proyectos — después de la
  integración read-only ya fusionada en main, determinando si satisface la
  definición canónica de COMPLETE sin redefinir arquitectura ni ampliar M3
  a mutaciones.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001"
  implementation_task: "IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001"
  implementation_state: "integrated_in_main"
  main_merge_commit: "b4761802c37a56fca939d7aa98d5f09a0f554508"
  current_matrix_state: "PARTIAL"
  expected_state_if_evidence_matches: "COMPLETE"
  current_m0_m20_percentage: 37.5
  target_m0_m20_percentage_if_complete: 40.0
  potential_gain_pp: 2.5

implemented_capability:
  mode: "read_only"

  plantas:
    state: "integrated"
    semantics:
      - "planta_id como scope obligatorio"
      - "nombre/clave de planta en evidencia"
      - "sin catálogo global"

  kpis:
    state: "integrated"
    tool: "get_dashboard_kpis"
    semantics:
      - "misma lógica de GET /api/dashboard/kpis"
      - "shape y nulls preservados"
      - "ventana y filtros del dashboard preservados"

  proyectos:
    state: "integrated"
    tool: "get_project_status"
    executor: "loadProyectosForChat"
    semantics:
      - "public.proyectos por planta"
      - "sin crear/editar/eliminar proyectos"
      - "sin inventar estatus retrasado"

  authz:
    - "planta_id obligatorio"
    - "no cross-planta"
    - "GA bloqueado en KPIs"
    - "GV bloqueado en KPIs"
    - "GV bloqueado en proyectos"

  architecture:
    internal_http: false
    cycle_integration: false
    new_contract: false
    contract_change: false
    mutations: false

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
    - "lib/director-ia-m3-plantas-kpis-proyectos.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "server.js"
    - "test/director-ia-m3-plantas-kpis-proyectos.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

out_of_scope:
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar otros contratos arquitectónicos"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "modificar M0-M2"
  - "modificar M4-M20"
  - "crear proyecto"
  - "editar proyecto"
  - "eliminar proyecto"
  - "mutar folios"
  - "mutar Action Register"
  - "catálogo global de plantas"
  - "HTTP interno"
  - "cycle constitucional"
  - "crear tools"
  - "crear intents"
  - "cambiar authz"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "abrir o ejecutar automáticamente la siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

canonical_check:
  question: >
    Verificar si la implementación integrada de M3 satisface físicamente la
    definición vigente de COMPLETE: Director IA consulta directamente la fuente
    y puede responder de forma consistente dentro del alcance de esa fuente.

  rules:
    - "Plantas debe considerarse cubierta solo dentro del scope autorizado del usuario."
    - "COMPLETE no exige catálogo global de plantas."
    - "KPIs debe consultar directamente la fuente real de dashboard, no IGF/ARR como sustituto."
    - "Proyectos debe consultar public.proyectos por planta y no Action Register."
    - "Crear/editar/eliminar proyecto no es requisito para COMPLETE de lectura."
    - "Si una de las tres familias canónicas no está realmente integrada, no marcar COMPLETE."
    - "No usar únicamente existencia de endpoints/tools como evidencia; debe existir wiring real accesible desde Director IA."

semantic_invariants:
  - "M3 permanece read-only."
  - "No confundir proyectos con Action Register."
  - "No confundir KPIs dashboard con IGF/ARR/commercial_state."
  - "No afirmar salud, desempeño o causalidad sin soporte."
  - "No afirmar retrasado como estatus almacenado."
  - "No ampliar plantas_permitidas."
  - "No convertir null/error/unknown en cero salvo semántica fuente explícita."
  - "No declarar COMPLETE por documentación si runtime no lo sustenta."
  - "No reinterpretar la matriz para facilitar el porcentaje."

evidence_requirements:
  plantas:
    verify:
      - "planta_id obligatorio"
      - "nombre/clave disponible"
      - "scope autorizado preservado"
      - "sin catálogo global necesario"

  kpis:
    verify:
      - "tool/path get_dashboard_kpis"
      - "loader/helper read-only"
      - "shape canónico"
      - "authz GA/GV"
      - "scope planta"
      - "wiring chat real"
      - "sin HTTP interno"

  proyectos:
    verify:
      - "get_project_status available_on_demand"
      - "executor loadProyectosForChat"
      - "public.proyectos"
      - "scope planta"
      - "GV bloqueado"
      - "UNSUPPORTED_RULES ya no corta consulta válida"
      - "clarificación AR vs Proyectos preservada"
      - "sin POST/mutaciones"

  tests:
    verify:
      - "20/20 focales M3"
      - "22/22 capabilities"
      - "30/30 planner"
      - "21/21 orchestrator"
      - "436/436 suite Director IA"
      - "git diff --check limpio en implementación"

matrix_update_policy:
  if_complete:
    required:
      - "cambiar exclusivamente M3 de PARCIAL a COMPLETA/COMPLETE según terminología vigente"
      - "actualizar Información exacta que sí consulta"
      - "actualizar Información que no consulta eliminando únicamente lo ya integrado"
      - "actualizar archivos actuales relacionados"
      - "actualizar endpoints/tools/helpers relevantes"
      - "actualizar capacidades de lectura"
      - "preservar capacidades de escritura como no integradas"
      - "preservar permisos y nivel de riesgo correctos"
      - "actualizar observaciones verificadas"
      - "actualizar cualquier resumen o Parte 9 de la misma matriz que compute estados M0-M20"
      - "actualizar porcentaje formal de 37.5% a 40.0% si la fórmula vigente lo confirma"

    forbidden:
      - "cambiar otros módulos salvo referencias matemáticas estrictamente necesarias"
      - "reescribir historia del documento"
      - "eliminar limitaciones reales"
      - "marcar creación de proyecto como integrada"

  if_not_complete:
    required:
      - "no cambiar M3 a COMPLETE"
      - "documentar el gap físico"
      - "STOPPED si requiere decisión arquitectónica o contractual"

percentage_check:
  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    NOT_STARTED: 0.0
    INDIRECTA: 0.5
    N_A: "excluido del denominador"

  denominator_expected: 20

  before:
    numerator: 7.5
    percentage: 37.5

  if_m3_complete:
    numerator: 8.0
    percentage: 40.0

  rule: >
    Recalcular desde la matriz vigente; no aceptar 40.0% si el estado real de
    otros módulos o el denominador cambió desde la priorización anterior.

allowed_actions:
  - "leer físicamente implementación y reportes"
  - "verificar wiring real de M3"
  - "verificar tests reportados"
  - "actualizar únicamente la ficha M3 y resúmenes matemáticos relacionados en la capability matrix"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "proponer exactamente una NEXT_TASK"
  - "no autorizar NEXT_TASK"

forbidden_actions:
  - "modificar código"
  - "modificar tests"
  - "modificar arquitectura"
  - "crear contrato"
  - "modificar runtime"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "encadenar siguiente tarea"

acceptance_criteria:
  - "Se verificó físicamente M3 integrado en main."
  - "Se verificaron Plantas, KPIs y Proyectos."
  - "Se verificó authz."
  - "Se verificó que no hay mutaciones."
  - "Se verificó que no hay HTTP interno."
  - "Se verificó que no entra al cycle."
  - "Se verificaron resultados de tests de implementación."
  - "La definición vigente de COMPLETE se aplicó sin reinterpretación."
  - "M3 solo se marca COMPLETE si la evidencia lo sustenta."
  - "Si M3 es COMPLETE, el porcentaje se recalcula correctamente."
  - "Solo M3 y los resúmenes matemáticos directamente afectados cambian en la matriz."
  - "No se modifica ningún otro contrato."
  - "No se modifica código."
  - "git diff --check limpio."
  - "Solo CURRENT_TASK, reporte y capability matrix modificados."
  - "Hay exactamente una NEXT_TASK propuesta si procede."
  - "NEXT_TASK permanece no autorizada."

next_task_policy:
  if_m3_complete:
    propose_exactly_one: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003"
  if_m3_not_complete:
    propose_exactly_one: "none until human review"
  note: "No autorizar ni ejecutar."

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "evidencia física Plantas"
    - "evidencia física KPIs"
    - "evidencia física Proyectos"
    - "authz"
    - "tests verificados"
    - "evaluación canónica COMPLETE"
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
  queda sincronizada sin ampliar alcance. STOPPED si la documentación no puede
  actualizarse sin reinterpretación contractual. BLOCKED si falta un gate o
  dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"
