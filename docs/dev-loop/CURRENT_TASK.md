# CURRENT_TASK

```yaml id="m2hist001"
task_id: "IMPL-DIRECTOR-IA-M2-HISTORY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M2-HISTORY-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el slice history/timeline read-only de M2 — Kanban / Folios —
  para que Director IA pueda consultar el historial real de un folio de forma
  in-process, autorizada y trazable, usando public.folio_historial mediante
  SELECT-only, sin HTTP interno, sin autoavance, sin mutaciones y sin inventar
  campos o eventos no presentes en la fuente física.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"

  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"
  state_after_slice: "PARTIAL"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20
    effect_this_slice: 0.0

readiness_findings:
  source: "public.folio_historial"

  safe_helpers:
    - "getHistorialByFolioId"
    - "getHistorial"

  helper_behavior:
    query_type: "SELECT-only"
    side_effects: false

  timeline_route:
    route: "GET /api/folios/:id/timeline"
    autoadvance: false
    use_as_director_ia_source: false
    reason: >
      Aunque la ruta no autoavanza, Director IA debe usar integración in-process.
      Además, dedupeHistorialByStage puede ocultar eventos y no debe formar parte
      de la semántica de history de Director IA.

  unsafe_surfaces:
    - "GET /api/dashboard/kanban"
    - "GET /api/folios/:id"
    - "maybeAdvanceFolioToComprobaciones"

  physical_semantics:
    observed_fields:
      - "estatus"
      - "comentario"
      - "actor_telefono"
      - "actor_rol"
      - "creado_en"

    absent_fields:
      - "estatus_anterior"
      - "estatus_nuevo"
      - "event_type"

    rules:
      - "estatus puede ser null"
      - "actor puede ser null"
      - "actor null no significa sistema"
      - "folios.estatus_anterior no es estatus anterior del evento histórico"
      - "etapa solo puede derivarse cuando el evento tiene estatus observado"
      - "no inventar eventos"

architecture_pattern:
  required: >
    intent folio_history -> tool -> executor -> loadFolioHistoryForChat ->
    resolver/autorización de folio -> SELECT public.folio_historial ->
    evidencia -> respuesta

  transport:
    internal_http: false

  cycle:
    constitutional_cycle: false

  dispatcher:
    new_dispatcher: false

history_scope:

  included:
    - "historial por folio id"
    - "historial por numero_folio"
    - "eventos reales registrados"
    - "estatus del evento cuando exista"
    - "etapa derivada cuando exista estatus mapeable"
    - "comentario del evento"
    - "actor_telefono cuando exista"
    - "actor_rol cuando exista"
    - "creado_en"
    - "orden cronológico definido"
    - "identidad mínima del folio"
    - "evidencia estructurada"

  excluded:
    - "estatus_anterior inventado"
    - "estatus_nuevo inventado"
    - "event_type inventado"
    - "actor sistema por default"
    - "reconstrucción de eventos faltantes"
    - "dedupeHistorialByStage"
    - "inferencia de retraso"
    - "inferencia de bloqueo"
    - "inferencia de causa"
    - "inferencia de responsabilidad"
    - "documents"
    - "PDFs"
    - "financial status"
    - "kanban_flow"
    - "mutaciones"
    - "autoavance"

folio_resolution_and_authz:
  required:
    - "resolver folio por id"
    - "resolver folio por numero_folio"
    - "reutilizar lógica segura de M2 folio_status cuando corresponda"
    - "autorizar folio antes de consultar historial"
    - "preservar JWT/contexto"
    - "preservar rol"
    - "preservar planta_id"
    - "preservar plantas_permitidas"
    - "GV = 403"
    - "GA solo dentro de planta autorizada"
    - "cross-planta = 403"
    - "not found = 404"
    - "fail-closed"

  order_rule: >
    No consultar public.folio_historial antes de resolver y autorizar el folio.

semantics:
  observed:
    - "estatus"
    - "comentario"
    - "actor_telefono"
    - "actor_rol"
    - "creado_en"

  derived:
    - "etapa derivada mediante estatusToEtapaVisual solo si estatus existe y mapea"

  forbidden_derivations:
    - "estatus anterior"
    - "estatus nuevo"
    - "tipo de evento"
    - "duración"
    - "retraso"
    - "bloqueo"
    - "causa"
    - "responsabilidad"
    - "actor sistema"

  null_policy:
    - "preservar null"
    - "no sustituir null por texto factual inventado"
    - "no convertir ausencia en cero"
    - "no ocultar evento por tener campos null"

  ordering:
    rule: >
      Preservar todos los eventos y aplicar únicamente el orden físico/canónico
      verificado en readiness. No deduplicar por etapa.

planner_tools_capabilities:

  planner:
    - "habilitar folio_history únicamente"
    - "preservar folio_status"
    - "no habilitar folio_documents"
    - "no habilitar financial surfaces"
    - "no habilitar kanban_flow inferencial"

  tools:
    - "habilitar tool de folio_history con executor real"
    - "inputs mínimos para id/numero_folio"
    - "no habilitar otras tools de M2"

  capabilities:
    - "actualizar únicamente lo necesario para que folio_history sea consultable"
    - "mantener documentos y demás superficies como no integradas"

  unsupported_rules:
    - "levantar bloqueo exclusivamente para preguntas soportadas por folio_history"
    - "preservar SOURCE_NOT_INTEGRATED para documentos/financial/otros slices"

  chat:
    - "wiring in-process"
    - "no fallback a Action Register"
    - "no fallback a M3"
    - "no usar GET /timeline"
    - "no usar handlers HTTP"
    - "preservar evidencia estructurada"

evidence_contract:
  required_if_available:
    - "folio_id"
    - "numero_folio"
    - "planta_id"
    - "event_index or event_id only if physically present"
    - "estatus"
    - "etapa_derived"
    - "comentario"
    - "actor_telefono"
    - "actor_rol"
    - "creado_en"
    - "source"

  forbidden:
    - "event_type unless physically present"
    - "previous_status"
    - "new_status"
    - "system_actor inference"

no_side_effect_requirements:
  - "no llamar maybeAdvanceFolioToComprobaciones"
  - "no ejecutar UPDATE"
  - "no ejecutar INSERT"
  - "no ejecutar DELETE"
  - "no usar GET /api/dashboard/kanban"
  - "no usar GET /api/folios/:id"
  - "no usar GET /api/folios/:id/timeline como transporte interno"
  - "no importar dedupeHistorialByStage como semántica"

tests_required:
  focal:
    - "history por folio id"
    - "history por numero_folio"
    - "múltiples eventos"
    - "orden de eventos"
    - "preservar eventos repetidos de misma etapa"
    - "evento con estatus"
    - "evento con estatus null"
    - "etapa derivada cuando estatus mapea"
    - "sin etapa derivada cuando estatus null/no mapea"
    - "comentario"
    - "actor_telefono"
    - "actor_rol"
    - "actor null"
    - "creado_en"
    - "historial vacío"
    - "folio inexistente"
    - "cross-planta"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "GA"
    - "GV"
    - "intent folio_history"
    - "tool con executor"
    - "chat wiring"
    - "SOURCE_NOT_INTEGRATED levantado solo para history"
    - "folio_documents sigue bloqueado"
    - "financial surfaces siguen bloqueadas"
    - "no fallback Action Register"
    - "no fallback M3"
    - "no dedupe"
    - "no autoavance"
    - "no HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m2-history.js"
    - "lib/director-ia-m2-folio-status.js"
    - "test/director-ia-m2-history.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "server.js"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
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
  - "crear migration"
  - "modificar schema"
  - "crear endpoint HTTP nuevo"
  - "cambiar contrato HTTP"
  - "usar GET /timeline como transporte"
  - "usar dedupeHistorialByStage"
  - "usar rutas mutantes"
  - "integrar documents"
  - "integrar financial status"
  - "integrar kanban_flow"
  - "mutaciones"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental M2"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "crear loader/helper history SELECT-only"
  - "reutilizar resolución/authz de folio_status"
  - "cablear folio_history"
  - "habilitar executor"
  - "ajustar planner/capability/tool solo para history"
  - "crear tests focales"
  - "actualizar scripts afectados"
  - "ejecutar tests"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "escribir reporte"
  - "proponer exactamente una NEXT_TASK"

forbidden_actions:
  - "deduplicar eventos"
  - "inventar event_type"
  - "inventar previous/new status"
  - "inventar actor"
  - "ocultar eventos por null"
  - "autoavanzar"
  - "hacer writes"
  - "hacer HTTP interno"
  - "ampliar authz"
  - "modificar arquitectura"
  - "crear contrato nuevo"
  - "marcar M2 COMPLETE"
  - "cambiar 42.5%"
  - "commit"
  - "push"
  - "merge"
  - "encadenar NEXT_TASK"

acceptance_criteria:
  - "Director IA consulta history por folio id."
  - "Director IA consulta history por numero_folio."
  - "Se preservan todos los eventos reales."
  - "No se aplica dedupeHistorialByStage."
  - "estatus se trata como observado."
  - "etapa se deriva solo cuando corresponde."
  - "comentario se preserva."
  - "actor_telefono se preserva."
  - "actor_rol se preserva."
  - "actor null se preserva como null/unknown."
  - "creado_en se preserva."
  - "No se inventa event_type."
  - "No se inventan previous/new status."
  - "Authz se aplica antes de consultar history."
  - "No cross-planta."
  - "folio_history tiene executor real."
  - "planner llega a folio_history."
  - "chat llega al executor correcto."
  - "folio_documents sigue fuera."
  - "financial surfaces siguen fuera."
  - "no hay autoavance."
  - "no hay writes."
  - "no hay HTTP interno."
  - "no cambia contrato HTTP."
  - "no cambia arquitectura."
  - "M2 sigue PARTIAL."
  - "42.5% no cambia."
  - "tests focales verdes."
  - "regresión Director IA verde."
  - "git diff --check limpio."
  - "solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m2-history.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001"

  note: >
    La tarea documental posterior debe reflejar una profundización adicional de
    M2 dentro de PARTIAL. No debe marcar COMPLETE ni cambiar el porcentaje.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "source public.folio_historial"
    - "history por id"
    - "history por numero_folio"
    - "observed fields"
    - "derived fields"
    - "null semantics"
    - "event preservation"
    - "no dedupe"
    - "authz"
    - "scope planta"
    - "planner"
    - "tool/executor"
    - "chat wiring"
    - "unsafe routes excluded"
    - "no side effects"
    - "tests"
    - "resultados completos"
    - "estado M2"
    - "porcentaje"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si history queda integrado SELECT-only, in-process,
  autorizado, sin dedupe y sin inferencias no soportadas, manteniendo M2 PARTIAL
  y 42.5%. STOPPED ante dependencia inseparable de mutación o contradicción
  semántica. BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"