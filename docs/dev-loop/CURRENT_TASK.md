# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente el slice history/timeline read-only de M2 — Kanban /
  Folios — para determinar si Director IA puede consultar de forma segura,
  in-process y trazable el historial real de un folio, incluyendo qué ocurrió,
  quién y cuándo, reutilizando public.folio_historial y helpers SELECT-only,
  sin autoavance, sin mutaciones y sin ampliar el alcance más allá de history.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"

  winner: "history"
  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"
  expected_state_after_history_slice: "PARTIAL"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20
    expected_effect: 0.0

  already_integrated:
    - "comentarios de folio"
    - "folio_status por id"
    - "folio_status por numero_folio"
    - "varios folios"
    - "listado por planta"
    - "filtro/listado por etapa"
    - "estatus observado"
    - "etapa derivada"

prioritization_findings:
  candidate_source: "public.folio_historial"
  candidate_helpers:
    - "getHistorialByFolioId"
    - "getHistorial"

  candidate_http_surface: "GET /timeline"

  known_safe_assumption_to_verify: >
    La priorización encontró que GET /timeline no autoavanza, pero esta readiness
    debe verificar físicamente su call graph y no convertir esa observación en
    supuesto contractual.

  excluded_unsafe_surfaces:
    - "GET /api/dashboard/kanban"
    - "GET /api/folios/:id"
    - "maybeAdvanceFolioToComprobaciones"

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA responda el historial real de un folio — qué ocurrió,
  quién y cuándo — preservando scope por planta y sin depender de handlers
  mutantes ni introducir inferencias no soportadas?

history_scope:
  candidate_included:
    - "eventos históricos reales asociados al folio"
    - "fecha/hora del evento si existe físicamente"
    - "usuario/actor si existe físicamente"
    - "acción/evento si existe físicamente"
    - "estatus anterior/nuevo si existe físicamente"
    - "cambio de etapa solo si puede derivarse fielmente de estados observados"
    - "detalle/nota/motivo solo si existe físicamente"
    - "orden cronológico"
    - "identidad mínima del folio"
    - "evidencia trazable"

  excluded:
    - "inventar eventos faltantes"
    - "reconstruir movimientos no registrados"
    - "inferir quién actuó si no existe actor"
    - "inferir retraso"
    - "inferir bloqueo"
    - "inferir causa"
    - "inferir responsabilidad"
    - "documentos/PDF"
    - "cheques"
    - "pólizas"
    - "presupuestos"
    - "mutaciones"
    - "autoavance"
    - "edición de historial"
    - "creación manual de eventos"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M2 vigente completa"
      - "verificar lugar de history/timeline en la definición canónica"
      - "determinar qué parte exacta cubriría este slice"
      - "confirmar que M2 seguiría PARTIAL después del slice"
      - "confirmar impacto porcentual real"

  table_schema:
    source: "public.folio_historial"
    determine:
      - "columnas reales"
      - "primary key si aplica"
      - "folio foreign key"
      - "timestamp(s)"
      - "actor/usuario"
      - "acción/tipo/evento"
      - "estatus anterior"
      - "estatus nuevo"
      - "detalle/nota/motivo"
      - "nullable fields"
      - "orden canónico"
      - "índices relevantes si son visibles"

  helpers:
    inspect:
      - "getHistorialByFolioId"
      - "getHistorial"
      - "helpers equivalentes encontrados"

    determine:
      - "firma"
      - "query real"
      - "SELECT-only"
      - "joins"
      - "orden"
      - "límites"
      - "filtros"
      - "side effects"
      - "shape retornado"
      - "manejo de ausencia"

  timeline_route:
    inspect:
      - "GET /timeline"
      - "call graph completo"
      - "helpers llamados"
      - "auth middleware"
      - "scope de planta"
      - "side effects"

    rule: >
      Aunque GET /timeline resulte SELECT-only, Director IA debe preferir
      integración in-process sobre HTTP interno.

  unsafe_routes:
    inspect:
      - "GET /api/dashboard/kanban"
      - "GET /api/folios/:id"
      - "maybeAdvanceFolioToComprobaciones"

    purpose: >
      Confirmar que history puede implementarse sin atravesar estas superficies.

  folio_resolution:
    determine:
      - "cómo resolver folio id"
      - "cómo resolver numero_folio"
      - "si puede reutilizarse M2 folio_status"
      - "cómo validar planta antes de devolver historial"
      - "qué ocurre con folio inexistente"
      - "qué ocurre con folio cross-planta"

  semantics:
    determine:
      - "qué significa cada evento"
      - "qué campos son observados"
      - "qué campos son derivados"
      - "si etapa puede derivarse desde estatus históricos"
      - "si hay eventos no relacionados con cambio de estatus"
      - "si existe actor humano/sistema distinguible"
      - "si timestamp representa creación, acción u otra cosa"
      - "qué no puede afirmarse"

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "GA"
      - "GV"
      - "planta_id"
      - "plantas_permitidas"
      - "cross-planta"
      - "fail-closed"
      - "si helper actual aplica authz o debe envolverlo loader Director IA"

  planner_tools:
    inspect:
      - "intent folio_history"
      - "capability folio_history"
      - "tool existente"
      - "executor"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "chat routing"

    determine:
      - "qué ya existe"
      - "qué falta"
      - "si planner necesita cambio"
      - "si tool solo necesita executor"
      - "qué bloqueo debe levantarse exclusivamente para history"

  architecture_fit:
    determine:
      - "loader/helper M2 history mínimo"
      - "reutilización de folio_status para resolución/authz"
      - "path in-process"
      - "sin HTTP interno"
      - "sin dispatcher nuevo"
      - "sin contrato nuevo"
      - "G2 requerido sí/no"
      - "G3 requerido sí/no"

required_data_contract:
  identify_if_physically_supported:
    - "folio_id"
    - "numero_folio"
    - "event_id"
    - "event_type/action"
    - "timestamp"
    - "actor"
    - "previous_status"
    - "new_status"
    - "previous_stage derived"
    - "new_stage derived"
    - "detail"
    - "source"

  rules:
    - "No inventar campos ausentes."
    - "No convertir null en hecho."
    - "No afirmar actor si no está registrado."
    - "No afirmar cambio de etapa si el evento no lo soporta."
    - "No transformar cualquier evento en cambio de estatus."
    - "Preservar hechos observados separados de derivados."

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "query_type"
    - "select_only"
    - "side_effects"
    - "authz"
    - "plant_scope"
    - "observed_fields"
    - "derived_fields"
    - "ordering"
    - "absence_behavior"
    - "reusable"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_history_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

semantic_invariants:
  - "History ≠ current status."
  - "History ≠ comments."
  - "History ≠ documents."
  - "History ≠ Action Register."
  - "Timestamp ≠ duration unless computed explicitly."
  - "Antigüedad ≠ retraso."
  - "Event ≠ status transition unless physically supported."
  - "Actor null ≠ system actor unless physically supported."
  - "No inventar missing events."
  - "No reconstruir timeline con suposiciones."
  - "No autoavanzar al consultar."
  - "No cross-planta."
  - "No HTTP interno."
  - "Toda afirmación debe ser trazable a public.folio_historial o fuente física verificada."

implementation_hypothesis:
  expected_path: >
    intent folio_history -> tool -> executor -> loadFolioHistoryForChat ->
    resolución/autorización de folio -> getHistorialByFolioId/getHistorial
    SELECT-only -> evidencia -> respuesta

  note: >
    Esta es una hipótesis a verificar, no autorización de implementación.

tests_to_design_if_ready:
  - "history por folio id"
  - "history por numero_folio"
  - "orden cronológico"
  - "múltiples eventos"
  - "sin eventos"
  - "folio inexistente"
  - "folio cross-planta"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "GA"
  - "GV"
  - "actor null"
  - "timestamp null si físicamente posible"
  - "estatus anterior/nuevo"
  - "derivación etapa solo cuando corresponda"
  - "eventos no-status"
  - "intent folio_history"
  - "tool/executor"
  - "SOURCE_NOT_INTEGRATED levantado solo para history"
  - "folio_documents continúa bloqueado"
  - "financial surfaces continúan bloqueadas"
  - "no autoavance"
  - "no writes"
  - "no HTTP interno"

decision_rules:

  ready:
    all:
      - "public.folio_historial es fuente suficiente"
      - "helper SELECT-only reutilizable"
      - "resolución de folio segura"
      - "authz preservable"
      - "scope planta preservable"
      - "semántica de eventos suficientemente clara"
      - "rutas mutantes evitables"
      - "path in-process posible"
      - "sin contrato nuevo"
      - "tests determinísticos posibles"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M2-HISTORY-001"

  stopped:
    when:
      - "history depende inseparablemente de mutación"
      - "no puede preservarse authz"
      - "no puede preservarse scope planta"
      - "public.folio_historial no permite identificar hechos mínimos"
      - "semántica exige decisión contractual nueva"

    outcome: "STOPPED"
    next_task: null

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"

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
  - "implementar history"
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
  - "integrar documents"
  - "integrar financial status"
  - "integrar kanban_flow"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "auditar repositorio"
  - "trazar public.folio_historial"
  - "trazar helpers"
  - "trazar GET /timeline"
  - "trazar authz"
  - "trazar scope planta"
  - "trazar planner/tools"
  - "diseñar delta mínimo"
  - "diseñar tests"
  - "determinar gates"
  - "proponer exactamente una NEXT_TASK si READY"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar código"
  - "modificar matriz"
  - "inventar schema"
  - "inventar eventos"
  - "reinterpretar historial"
  - "usar HTTP interno como implementación"
  - "usar rutas mutantes"
  - "ampliar authz"
  - "otorgar COMPLETE"
  - "mover 42.5%"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó físicamente public.folio_historial."
  - "Se verificó getHistorialByFolioId."
  - "Se verificó getHistorial."
  - "Se verificó GET /timeline."
  - "Se verificó ausencia/presencia de side effects."
  - "Se verificó resolución por id."
  - "Se verificó resolución por numero_folio."
  - "Se verificó authz."
  - "Se verificó plantas_permitidas."
  - "Se verificó cross-planta."
  - "Se verificó semántica de eventos."
  - "Se distinguieron campos observados y derivados."
  - "Se verificó planner folio_history."
  - "Se verificaron tools."
  - "Se verificaron bloqueos actuales."
  - "Se determinó path mínimo de implementación."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M2 seguiría PARTIAL."
  - "42.5% seguiría sin cambio."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "git diff --check limpio."

required_output:
  - "resumen ejecutivo"
  - "baseline"
  - "definición exacta del slice"
  - "schema físico observado"
  - "helpers"
  - "GET /timeline"
  - "rutas mutantes excluidas"
  - "resolución folio"
  - "semántica"
  - "authz"
  - "scope planta"
  - "planner/tools"
  - "tabla evidencia"
  - "tabla gaps"
  - "arquitectura propuesta"
  - "tests"
  - "G2/G3"
  - "estado M2 posterior"
  - "porcentaje posterior"
  - "riesgos"
  - "NEXT_TASK"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "scope history"
    - "public.folio_historial"
    - "helpers"
    - "timeline route"
    - "unsafe routes"
    - "folio resolution"
    - "semantics"
    - "authz"
    - "plant scope"
    - "planner/tools"
    - "evidence table"
    - "gap table"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "state after slice"
    - "percentage"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un path SELECT-only, in-process y autorizado
  para history. STOPPED si history depende de mutación, authz insegura o
  semántica contractual nueva. BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"