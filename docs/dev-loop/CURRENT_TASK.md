# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T22:23:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21.
  Apruebo ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente M3 — Plantas / KPIs / Proyectos — para determinar el
  delta exacto necesario para llevar su cobertura canónica de PARTIAL a
  COMPLETE dentro de Director IA, sin implementar todavía, sin redefinir
  arquitectura y sin ampliar artificialmente el alcance definido por la
  capability matrix vigente.

baseline:
  source_task: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002"
  source_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  current_m0_m20_percentage: 37.5
  module: "M3"
  module_name: "Plantas / KPIs / Proyectos"
  current_state: "PARTIAL"
  target_state: "COMPLETE"
  potential_gain_pp: 2.5
  projected_percentage_if_complete: 40.0

canonical_scope:
  source: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  business_purpose: >
    Catálogo de plantas, KPIs de dashboard y proyectos por planta.
  current_integrated_surface:
    - "planta_id obligatorio como scope/filtro"
    - "nombre/clave de planta en anexos IGF/ARR"
    - "nombre/clave de planta en commercial_state"
  currently_not_integrated:
    - "GET /api/dashboard/kpis"
    - "listado de proyectos por planta"
  explicitly_not_required_for_read_only_complete_candidate:
    - "POST /api/proyectos"
    - "crear proyecto desde Director IA"
    - "editar proyecto"
    - "eliminar proyecto"
    - "mutaciones de folios"
    - "mutaciones de Action Register"

primary_question: >
  ¿Puede M3 alcanzar legítimamente COMPLETE mediante un único slice read-only
  que permita a Director IA consultar de forma consistente y autorizada las
  tres familias canónicas del módulo — plantas, KPIs y proyectos — utilizando
  infraestructura existente y sin modificar contratos arquitectónicos?

secondary_questions:
  - >
    ¿Qué significa exactamente "catálogo de plantas" para COMPLETE: resolver la
    planta actual/autorizada o exponer un listado completo de plantas?
  - >
    ¿Qué campos y semántica devuelve realmente GET /api/dashboard/kpis?
  - >
    ¿Qué permisos y restricciones GA/GV/planta aplica actualmente esa ruta?
  - >
    ¿La lectura de KPIs puede reutilizarse directamente mediante helper/service
    o la lógica está acoplada al handler HTTP?
  - >
    ¿Qué campos y semántica devuelve realmente GET /api/proyectos?
  - >
    ¿Existen helpers reutilizables para proyectos por planta y totales?
  - >
    ¿Cuál es la relación semántica entre public.proyectos y Action Register?
  - >
    ¿El intent project_status y la tool get_project_status existentes
    corresponden al dominio canónico de M3 o existe una colisión semántica?
  - >
    ¿Puede el wiring nuevo reutilizar Planner + Tool Orchestrator sin crear un
    contrato arquitectónico nuevo?
  - >
    ¿Qué evidencia y tests serían suficientes para declarar M3 COMPLETE?

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
    - "docs/director-ia/CONSTITUTION.md"
    - "docs/director-ia/EXECUTIVE_KNOWLEDGE_ENGINE.md"
    - "docs/director-ia/01-OBSERVATION-PIPELINE.md"
    - "docs/director-ia/02-EVIDENCE-BUILDER.md"
    - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
    - "docs/director-ia/04-IES-STANDARD.md"
    - "docs/director-ia/05-REASONING-ENGINE.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-tool-orchestrator.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-commercial-state.js"
    - "lib/director-ia*.js"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"

out_of_scope:
  - "implementar M3"
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar capability matrix"
  - "modificar contratos de docs/director-ia"
  - "crear contratos arquitectónicos"
  - "crear tools"
  - "crear intents"
  - "cambiar permisos"
  - "crear endpoints"
  - "crear proyecto"
  - "editar proyecto"
  - "eliminar proyecto"
  - "mutar folios"
  - "mutar Action Register"
  - "smoke productivo"
  - "usar secretos o credenciales"
  - "commit"
  - "push"
  - "merge"
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
  - "leer físicamente archivos del repositorio"
  - "buscar referencias de plantas, KPIs y proyectos"
  - "trazar endpoints a handlers, helpers, queries y tablas"
  - "trazar Planner -> intent -> tool -> executor actual"
  - "examinar controles authz existentes"
  - "examinar tests existentes"
  - "determinar delta físico"
  - "clasificar riesgos"
  - "determinar gates necesarios para una eventual implementación"
  - "proponer exactamente una NEXT_TASK"
  - "escribir exclusivamente CURRENT_TASK y el reporte de esta auditoría"
  - "ejecutar validaciones read-only y git diff --check"

forbidden_actions:
  - "implementar código"
  - "modificar cualquier archivo fuera de los dos writable"
  - "reinterpretar COMPLETE para facilitar el resultado"
  - "declarar que crear proyecto forma parte de COMPLETE sin evidencia canónica"
  - "convertir project_status en M3 sin verificar semántica"
  - "bypassear authz existente"
  - "introducir acceso cross-planta"
  - "usar endpoint HTTP interno como sustituto automático de un helper reusable"
  - "crear dependencias externas"
  - "aprobar G2, G3, G4, G5, G6, G7 o G8"
  - "commit"
  - "push"
  - "merge"
  - "encadenar la implementación"

audit_workstreams:

  canonical_definition:
    required:
      - "confirmar definición exacta de M3 en capability matrix"
      - "separar CONSULTAR de CREAR/EDITAR"
      - "determinar condición mínima legítima de COMPLETE"
      - "identificar cualquier ambigüedad contractual"

  plantas:
    inspect:
      - "GET /api/dashboard/plantas"
      - "public.plantas"
      - "resolución planta_id"
      - "nombre y clave"
      - "assertPlantaAccess / assertPlantaPermitidaDashboard"
      - "scoping del JWT"
    determine:
      - "si Director IA ya satisface la porción plantas"
      - "si necesita catálogo adicional"
      - "si un listado completo sería seguro o cross-scope"
      - "contrato mínimo de evidencia necesario"

  kpis:
    inspect:
      - "GET /api/dashboard/kpis"
      - "handler y helpers llamados"
      - "queries/tablas fuente"
      - "campos JSON reales"
      - "permisos GA/GV"
      - "filtro planta"
      - "posibles efectos secundarios"
      - "frontend KPIHeader"
      - "tests asociados"
    determine:
      - "qué KPIs son canónicos de M3"
      - "si existe helper reusable fuera de HTTP"
      - "si debe extraerse lógica para un executor read-only"
      - "riesgo semántico de presentar agregados"
      - "riesgo de exposición financiera"

  proyectos:
    inspect:
      - "GET /api/proyectos"
      - "POST /api/proyectos solo como contexto; no implementar"
      - "public.proyectos"
      - "proyecto_*"
      - "listarProyectosPorPlantaOEquivalentes"
      - "listarProyectosPorPlantaConTotales"
      - "CrearProyectoModal"
      - "tests asociados"
    determine:
      - "campos de lectura existentes"
      - "scope por planta"
      - "si proyecto puede consultarse por nombre/id"
      - "si project_status corresponde realmente a este dominio"
      - "diferencia entre proyectos y Action Register"
      - "si el helper actual es seguro para reutilización"

  planner_and_tools:
    inspect:
      - "project_status intent"
      - "get_project_status tool"
      - "capability project_status"
      - "executor actual"
      - "clarification logic"
      - "evidence contract"
    determine:
      - "si el wiring existe pero está incompleto"
      - "si requiere una tool nueva o puede completar la existente"
      - "si KPIs necesitan tool propia"
      - "si plantas necesitan tool propia"
      - "si una tool agregadora M3 sería compatible con contratos existentes"

  authz:
    required:
      - "mapear autorización planta por planta"
      - "mapear permisos de KPIs"
      - "mapear permisos de proyectos"
      - "confirmar que ningún path propuesto amplíe visibilidad"
      - "identificar GA/GV y demás restricciones reales"
      - "identificar cualquier riesgo cross-scope"

  data_contract:
    required:
      - "identificar fuente primaria de cada dato"
      - "distinguir dato observado de dato derivado"
      - "preservar null/unknown"
      - "evitar convertir ausencia de proyecto/KPI en cero sin evidencia"
      - "determinar freshness disponible"
      - "determinar campos mínimos para evidencia estructurada"

  architecture_fit:
    required:
      - "determinar si M3 cabe en arquitectura existente"
      - "determinar si necesita G2"
      - "determinar si necesita G3"
      - "determinar si toca OP/EB/EKS/IES/Reasoning contracts"
      - "no solicitar gates preventivamente"

  implementation_slice:
    required:
      - "describir archivos probablemente afectados"
      - "describir wiring mínimo"
      - "describir executors/helpers necesarios"
      - "describir tests mínimos"
      - "determinar si el slice puede llevar M3 a COMPLETE"
      - "determinar si puede ser una única IMPL task"

completion_test:
  question: >
    Después de un eventual slice de implementación, ¿Director IA podría
    consultar directamente y responder consistentemente, dentro del scope
    autorizado del usuario, sobre plantas, KPIs del dashboard y proyectos por
    planta, sin depender de datos inventados, de UI scraping ni de mutaciones?

  required_answer: >
    YES con evidencia física para proponer IMPL directa; de lo contrario
    STOP/BLOCKED o readiness adicional.

mandatory_evidence_table:
  columns:
    - "surface"
    - "canonical_requirement"
    - "current_physical_state"
    - "endpoint_or_helper"
    - "source_table_or_view"
    - "authz"
    - "side_effects"
    - "existing_director_ia_wiring"
    - "missing_delta"
    - "testability"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "domain"
    - "missing_capability"
    - "required_for_complete"
    - "existing_reusable_component"
    - "proposed_physical_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "estimated_complexity"
    - "blocking"

semantic_invariants:
  - "M3 es lectura empresarial; no autoriza creación de proyectos."
  - "No confundir proyectos con Action Register."
  - "No confundir KPI dashboard con IGF, ARR o commercial_state salvo evidencia."
  - "No presentar datos financieros a roles que la ruta actual restringe."
  - "No ampliar acceso a plantas."
  - "No convertir null, ausencia o fallo de fuente en valor cero."
  - "No declarar COMPLETE si una de las tres familias canónicas queda sin consulta directa."
  - "No afirmar salud, desempeño o causalidad a partir de un KPI que no lo soporte."
  - "Toda conclusión debe conservar trazabilidad a fuente real."

decision_rules:
  complete_ready:
    all:
      - "plantas canónicas cubiertas o con delta explícito implementable"
      - "KPIs consultables read-only"
      - "proyectos consultables read-only"
      - "authz equivalente o más restrictiva que dashboard existente"
      - "sin mutaciones"
      - "sin dependencia externa nueva"
      - "sin migration"
      - "sin redefinición contractual"
      - "tests determinísticos posibles"
      - "un único slice razonable puede cerrar todos los gaps obligatorios"
    then:
      next_task: "IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001"

  architecture_decision_required:
    when:
      - "la definición de COMPLETE es ambigua"
      - "hay que modificar contrato arquitectónico"
      - "el modelo de authz no puede conservarse"
      - "project_status contradice semántica canónica"
      - "KPIs necesitan reinterpretación no documentada"
    then:
      outcome: "STOPPED o BLOCKED según corresponda"
      next_task: "ninguna implementación hasta decisión humana"

gate_rules:
  G1:
    required: true
    scope: "esta auditoría únicamente"

  G2:
    default: "N/A"
    required_if: "se concluye que un contrato arquitectónico existente debe modificarse"

  G3:
    default: "N/A"
    required_if: "se concluye que debe crearse un contrato arquitectónico nuevo"

  G4:
    state: "NOT_AUTHORIZED"
    note: "no commit/push/merge en esta auditoría"

  G5:
    state: "NOT_AUTHORIZED"
    note: "NEXT_TASK solo se propone"

  G6:
    state: "N/A"

  G7:
    state: "N/A unless ambiguity_or_contradiction_found"

  G8:
    state: "N/A unless materiality/calibration/signature becomes necessary"

required_output:
  - "resumen ejecutivo"
  - "definición canónica verificada de M3"
  - "estado físico de Plantas"
  - "estado físico de KPIs"
  - "estado físico de Proyectos"
  - "traza Planner / tool / executor"
  - "mapa authz"
  - "tabla de evidencia"
  - "tabla de gaps"
  - "riesgos semánticos"
  - "riesgos productivos"
  - "dependencias"
  - "arquitectura: G2 sí/no"
  - "contratos: G3 sí/no"
  - "determinación COMPLETE-feasibility"
  - "delta físico mínimo"
  - "archivos probables de implementación"
  - "tests requeridos"
  - "exactamente una NEXT_TASK o STOP/BLOCKED justificado"
  - "gates de NEXT_TASK"
  - "acciones expresamente no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Se verificó físicamente la definición canónica de M3."
  - "Se verificó físicamente la implementación actual de plantas."
  - "Se verificó físicamente GET /api/dashboard/kpis y su authz."
  - "Se verificó físicamente GET /api/proyectos y su authz."
  - "Se verificaron los helpers reutilizables de proyectos."
  - "Se verificó project_status/get_project_status."
  - "Se determinó si KPIs necesitan tool propia."
  - "Se determinó si plantas necesitan tool propia o ya están cubiertas."
  - "Se distinguieron proyectos de Action Register."
  - "No se amplió el scope de permisos."
  - "No se implementó nada."
  - "No se modificaron contratos."
  - "No se modificó capability matrix."
  - "No se modificó runtime/backend/frontend/tests."
  - "Solo CURRENT_TASK y el reporte fueron modificados."
  - "Hay una conclusión inequívoca sobre posibilidad de PARTIAL -> COMPLETE."
  - "Hay exactamente una NEXT_TASK si procede."
  - "NEXT_TASK permanece no autorizada."
  - "git diff --check está limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
  must_include:
    - "metadata del task"
    - "resumen ejecutivo"
    - "baseline 37.5%"
    - "ganancia potencial +2.5 pp"
    - "definición canónica"
    - "evidencia plantas"
    - "evidencia KPIs"
    - "evidencia proyectos"
    - "Planner/tools"
    - "authz"
    - "tabla de evidencia"
    - "tabla de gaps"
    - "riesgos"
    - "dependencias"
    - "fit arquitectónico"
    - "feasibility COMPLETE"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría determina con evidencia suficiente un
  path inequívoco y acotado para llevar M3 a COMPLETE. STOPPED si encuentra
  contradicción contractual o semántica que requiera decisión humana. BLOCKED
  si falta un gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"