# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T13:55:52-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente el primer slice de M2 — Kanban / Folios — para habilitar
  consulta read-only segura de estatus/etapa de folios en Director IA mediante
  helpers SELECT-only e integración in-process, evitando expresamente rutas GET
  que hoy producen side effects, y determinar el delta exacto de implementación.

strategic_context:
  source_task: "ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001"
  source_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"

  winner: "M2 — Kanban / Folios"
  first_slice: "estatus/etapa read-only"
  expected_state_after_slice: "PARTIAL"
  percentage_effect_after_slice: 0.0

  baseline:
    current_m0_m20_percentage: 42.5
    numerator: 8.5
    denominator: 20

  rationale: >
    Director IA ya responde KPIs agregados, deltas comerciales y seguimiento
    de Action Register, pero no puede responder de forma segura y directa en
    qué etapa está un folio ni qué folios existen por etapa/planta.

primary_question: >
  ¿Puede implementarse un primer slice seguro de M2 que permita a Director IA
  consultar estatus/etapa de un folio y listados de folios por planta/etapa,
  usando únicamente helpers SELECT-only, sin llamar rutas GET con side effects,
  sin mutar folios y sin ampliar el alcance del módulo más allá de este slice?

known_risks:
  unsafe_http_surfaces:
    - "GET /kanban"
    - "GET /folios/:id"

  reason: >
    Estas superficies deben tratarse como potencialmente mutantes hasta verificar
    físicamente su call graph, incluyendo cualquier llamada a
    maybeAdvanceFolioToComprobaciones o equivalente.

candidate_safe_helpers:
  - "getFolioById"
  - "getManyFoliosStatus"
  - "otros helpers SELECT-only equivalentes físicamente verificados"

slice_scope:
  included:
    - "estatus actual de un folio"
    - "etapa actual de un folio"
    - "identificación básica del folio necesaria para desambiguar"
    - "listado de folios por planta"
    - "listado/filtrado por etapa si la fuente lo soporta"
    - "conteos simples solo si derivan directamente del listado real"
    - "evidencia estructurada trazable"

  excluded:
    - "timeline completo"
    - "historial completo"
    - "documentos"
    - "PDFs"
    - "cheques"
    - "pólizas"
    - "presupuestos"
    - "mutaciones de folio"
    - "avance automático de etapa"
    - "kanban mutante"
    - "edición"
    - "aprobación"
    - "cancelación"
    - "creación de folios"

canonical_state:
  current_module_state: "PARTIAL"

  expected_after_slice: "PARTIAL"

  rule: >
    Este slice no debe reinterpretarse como COMPLETE. M2 seguirá PARTIAL después
    de integrar estatus/etapa porque historial, documentos, superficies
    financieras y/o otras capacidades canónicas continúan fuera.

secondary_questions:
  - "¿Qué helpers SELECT-only existen realmente para folio individual?"
  - "¿Qué helpers SELECT-only existen para múltiples folios?"
  - "¿Qué tablas/vistas consultan?"
  - "¿Qué campos representan etapa/estatus?"
  - "¿Existen diferencias entre etapa, estatus, estado y columna Kanban?"
  - "¿Qué valores son canónicos y cuáles derivados?"
  - "¿Cómo se filtra por planta?"
  - "¿Qué authz se aplica hoy?"
  - "¿Cómo se preservan plantas_permitidas?"
  - "¿Qué ocurre con folio inexistente?"
  - "¿Qué ocurre con folio de otra planta?"
  - "¿Qué ocurre si el identificador es ambiguo?"
  - "¿Existe ya intent folio_status?"
  - "¿Existe tool get_folio_status o equivalente?"
  - "¿Tiene executor?"
  - "¿Qué early return / SOURCE_NOT_INTEGRATED bloquea hoy?"
  - "¿Existe ya capability folio_status?"
  - "¿Qué wiring falta en chat?"
  - "¿Puede reutilizarse patrón M3/M9 in-process?"
  - "¿Puede listarse por etapa sin usar GET /kanban?"
  - "¿Qué tests hacen falta para demostrar ausencia de side effects?"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"

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
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar capability matrix"
  - "modificar contratos"
  - "crear/editar/cancelar/aprobar folios"
  - "ejecutar rutas con side effects"
  - "usar GET /kanban como fuente si muta"
  - "usar GET /folios/:id como fuente si muta"
  - "timeline"
  - "documentos"
  - "cheques"
  - "pólizas"
  - "presupuestos"
  - "HTTP interno"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar NEXT_TASK"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer físicamente repositorio"
  - "trazar helpers de folio"
  - "trazar queries SELECT"
  - "trazar rutas GET y side effects"
  - "trazar intent/tool/capability"
  - "trazar authz"
  - "trazar scope planta"
  - "trazar semantics etapa/estatus"
  - "determinar loader/executor mínimo"
  - "determinar tests"
  - "determinar archivos probables de implementación"
  - "determinar gates"
  - "proponer exactamente una NEXT_TASK"
  - "escribir CURRENT_TASK y reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar código"
  - "modificar capability matrix"
  - "modificar arquitectura"
  - "inventar que GET es seguro sin revisar side effects"
  - "inventar etapa o estatus"
  - "usar Action Register como sustituto"
  - "usar M3 como sustituto del flujo de folios"
  - "ampliar plantas_permitidas"
  - "permitir cross-planta"
  - "ejecutar mutaciones"
  - "aprobar gates adicionales"
  - "ejecutar NEXT_TASK"
  - "commit"
  - "push"
  - "merge"

audit_workstreams:

  canonical_definition:
    required:
      - "leer ficha M2 completa"
      - "identificar qué cubre hoy"
      - "identificar qué falta"
      - "confirmar que estatus/etapa es un slice legítimo"
      - "confirmar que después sigue PARTIAL"

  folio_single_read:
    inspect:
      - "getFolioById"
      - "queries"
      - "source tables"
      - "campos etapa/estatus"
      - "planta"
      - "side effects"
    determine:
      - "si es SELECT-only"
      - "shape reutilizable"
      - "errores"
      - "not found"
      - "authz"

  folio_many_read:
    inspect:
      - "getManyFoliosStatus"
      - "queries"
      - "filtros"
      - "planta"
      - "etapa"
      - "side effects"
    determine:
      - "si soporta listado seguro"
      - "si puede filtrar por etapa"
      - "si puede responder qué hay en el tablero sin GET /kanban"

  unsafe_routes:
    inspect:
      - "GET /kanban"
      - "GET /folios/:id"
      - "maybeAdvanceFolioToComprobaciones"
      - "cualquier helper mutante en call graph"
    determine:
      - "qué side effects existen"
      - "por qué no deben reutilizarse"
      - "si existe forma SELECT-only equivalente"

  planner_tools_capabilities:
    inspect:
      - "folio_status"
      - "folio_history"
      - "folio_documents"
      - "get_folio_status"
      - "get_folio_history"
      - "get_folio_documents"
      - "capabilities relacionadas"
      - "executor actual"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "routing chat"
    determine:
      - "qué wiring ya existe"
      - "qué wiring falta"
      - "si planner requiere cambios"
      - "si tool requiere executor"
      - "si capability requiere cambio"

  authz:
    required:
      - "JWT"
      - "rol"
      - "GA/GV si aplica"
      - "planta_id"
      - "plantas_permitidas"
      - "folio de otra planta"
      - "fail-closed"
      - "no cross-planta"

  data_contract:
    required:
      - "definir folio_id"
      - "definir etapa"
      - "definir estatus"
      - "definir campos mínimos de identidad"
      - "definir planta"
      - "distinguir valores observados vs derivados"
      - "not found"
      - "null/unknown"
      - "freshness"
      - "no inventar valores"

  architecture_fit:
    required:
      - "verificar patrón in-process"
      - "sin HTTP interno"
      - "sin contrato nuevo"
      - "sin cycle"
      - "G2 sí/no"
      - "G3 sí/no"

  implementation_slice:
    required:
      - "describir loader/helper mínimo"
      - "describir executor"
      - "describir wiring"
      - "describir tests"
      - "describir archivos probables"
      - "confirmar que slice es seguro"
      - "confirmar que M2 seguirá PARTIAL"

semantic_invariants:
  - "Folio/Kanban ≠ Action Register."
  - "M2 ≠ M3 KPIs/Proyectos."
  - "Etapa ≠ historial."
  - "Estatus actual ≠ timeline."
  - "No inferir retraso si no existe dato."
  - "No auto-avanzar etapa."
  - "No mutar al consultar."
  - "No inventar etapa."
  - "No convertir not found en empty success."
  - "No exponer folios de otra planta."
  - "No usar GET mutante por comodidad."
  - "Toda respuesta debe ser trazable a SELECT real."

completion_test:
  question: >
    ¿Existe un path totalmente read-only e in-process para que Director IA
    responda estatus/etapa de un folio y listados por planta/etapa, preservando
    authz y sin tocar rutas mutantes?

  success_next_task:
    "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001"

  success_state_after_implementation:
    "M2 remains PARTIAL"

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "source"
    - "method"
    - "select_only"
    - "side_effects"
    - "authz"
    - "plant_scope"
    - "status_semantics"
    - "stage_semantics"
    - "existing_intent"
    - "existing_tool"
    - "executor"
    - "missing_delta"
    - "testability"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_slice"
    - "reusable_component"
    - "proposed_physical_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "estimated_complexity"
    - "blocking"

decision_rules:

  ready:
    all:
      - "helper folio individual SELECT-only"
      - "helper listado SELECT-only"
      - "semántica etapa/estatus clara"
      - "authz preservable"
      - "scope planta preservable"
      - "rutas mutantes evitables"
      - "sin HTTP interno"
      - "sin migration"
      - "sin contrato nuevo"
      - "tests determinísticos posibles"
      - "slice acotado"

    then:
      outcome: "DONE_PENDING_REVIEW"
      next_task: "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001"

  stopped:
    when:
      - "no existe helper SELECT-only suficiente"
      - "estatus/etapa depende inseparablemente de auto-mutación"
      - "authz no puede preservarse"
      - "definición etapa/estatus es ambigua"
      - "requiere contrato nuevo"

    then:
      outcome: "STOPPED"

gate_rules:
  G1:
    required: true

  G2:
    default: "N/A"
    required_if: "se necesita modificar contrato arquitectónico"

  G3:
    default: "N/A"
    required_if: "se necesita contrato nuevo"

  G4:
    state: "NOT_AUTHORIZED"

  G5:
    state: "NOT_AUTHORIZED"

  G6:
    state: "N/A"

  G7:
    state: "N/A unless ambiguity found"

  G8:
    state: "N/A"

required_output:
  - "resumen ejecutivo"
  - "baseline 42.5%"
  - "definición del slice"
  - "estado M2 antes/después"
  - "folio individual SELECT-only"
  - "listado SELECT-only"
  - "rutas mutantes excluidas"
  - "planner/tools/capabilities"
  - "authz"
  - "scope planta"
  - "semántica etapa/estatus"
  - "tabla evidencia"
  - "tabla gaps"
  - "riesgos"
  - "dependencias"
  - "fit arquitectónico"
  - "G2 sí/no"
  - "G3 sí/no"
  - "archivos probables"
  - "tests requeridos"
  - "NEXT_TASK única"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Se verificó helper folio individual."
  - "Se verificó helper de múltiples folios."
  - "Se verificaron queries SELECT."
  - "Se verificaron rutas mutantes."
  - "Se verificó maybeAdvanceFolioToComprobaciones o equivalente."
  - "Se verificó semántica etapa/estatus."
  - "Se verificó authz."
  - "Se verificó scope por planta."
  - "Se verificó planner."
  - "Se verificaron tools."
  - "Se verificaron capabilities."
  - "Se verificaron early returns."
  - "Se determinó wiring mínimo."
  - "Se determinaron tests."
  - "No se implementó."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "No se modificó runtime/backend/frontend/tests."
  - "Solo CURRENT_TASK y reporte modificados."
  - "M2 sigue PARTIAL después del slice."
  - "Porcentaje sigue 42.5%."
  - "Hay exactamente una NEXT_TASK si procede."
  - "NEXT_TASK no autorizada."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "slice definido"
    - "estado M2"
    - "folio individual"
    - "listado"
    - "rutas mutantes"
    - "planner/tools/capabilities"
    - "authz"
    - "scope planta"
    - "semántica etapa/estatus"
    - "tabla evidencia"
    - "tabla gaps"
    - "riesgos"
    - "dependencias"
    - "fit arquitectónico"
    - "gates"
    - "archivos probables"
    - "tests"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe path SELECT-only e in-process seguro para el
  slice. STOPPED si el estatus/etapa depende inseparablemente de mutación o
  requiere decisión contractual. BLOCKED si falta gate o dato humano.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"