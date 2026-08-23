# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T14:44:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer slice read-only seguro de M2 — Kanban / Folios —
  para que Director IA pueda consultar estatus/etapa de un folio y listados
  por planta/etapa mediante helpers SELECT-only e integración in-process,
  sin usar rutas HTTP con side effects, sin autoavance y sin mutaciones.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"

  module: "M2"
  current_state: "PARTIAL"
  state_after_slice: "PARTIAL"

  current_m0_m20_percentage: 42.5
  numerator: 8.5
  denominator: 20
  percentage_effect_this_slice: 0.0

readiness_findings:
  safe_helpers:
    - "getFolioById"
    - "getFolioByNumero"
    - "getManyFoliosStatus"
    - "SELECT delgado equivalente a kanban con buildDashboardWhere"
    - "etapaVisualToEstatusTecnicos para filtrar por etapa"

  semantics:
    estatus: "columna observada"
    etapa: "derivada mediante estatusToEtapaVisual"
    etapa_column_in_db: false

  unsafe_surfaces:
    - "GET /api/dashboard/kanban"
    - "GET /api/folios/:id"
    - "maybeAdvanceFolioToComprobaciones"

  unsafe_reason: >
    Los handlers HTTP pueden ejecutar autoavance mediante UPDATE + historial
    después del SELECT. El slice debe reutilizar únicamente superficies
    SELECT-only verificadas.

slice_scope:

  included:
    single_folio:
      - "consulta por id"
      - "consulta por numero_folio"
      - "estatus observado"
      - "etapa derivada"
      - "planta"
      - "identidad mínima del folio"

    multiple_folios:
      - "listado por planta autorizada"
      - "filtrado por etapa"
      - "filtrado por estatus cuando corresponda"
      - "listado por varios numeros de folio cuando aplique"
      - "conteos derivados exclusivamente del conjunto consultado"

    director_ia:
      - "intent folio_status"
      - "tool de folio status"
      - "executor real"
      - "wiring chat"
      - "evidencia estructurada"
      - "fail-closed"

  excluded:
    - "timeline"
    - "folio_history"
    - "documents"
    - "PDF"
    - "cheques"
    - "polizas"
    - "presupuestos"
    - "crear folio"
    - "editar folio"
    - "aprobar folio"
    - "cancelar folio"
    - "autoavance"
    - "cualquier UPDATE"
    - "cualquier INSERT"
    - "cualquier DELETE"

architecture_pattern:
  required: >
    intent -> tool -> executor -> helper/fuente SELECT-only -> evidencia ->
    respuesta

  transport:
    internal_http: false

  cycle:
    constitutional_cycle: false

  new_dispatcher: false

semantic_invariants:
  - "M2 Folios/Kanban ≠ M12 Action Register."
  - "M2 Folios/Kanban ≠ M3 KPIs/Proyectos."
  - "estatus observado ≠ etapa derivada."
  - "etapa actual ≠ historial."
  - "etapa actual ≠ timeline."
  - "No inferir retraso si no existe dato."
  - "No inventar estatus."
  - "No inventar etapa."
  - "No auto-avanzar folio al consultar."
  - "No convertir not found en empty success."
  - "No exponer folios fuera de plantas_permitidas."
  - "No usar ruta GET mutante como fuente."
  - "Toda respuesta debe ser trazable a SELECT real."

authz_requirements:
  - "preservar JWT/contexto de usuario"
  - "preservar rol"
  - "preservar GA/GV cuando aplique"
  - "preservar planta_id"
  - "preservar plantas_permitidas"
  - "fail-closed ante folio de otra planta"
  - "fail-closed ante planta no autorizada"
  - "no cross-planta"
  - "no ampliar acceso existente"

implementation_requirements:

  data_layer:
    - "reutilizar getFolioById"
    - "reutilizar getFolioByNumero"
    - "reutilizar getManyFoliosStatus"
    - "crear/exponer helper SELECT-only para listado por planta/etapa si hace falta"
    - "reutilizar buildDashboardWhere donde corresponda"
    - "reutilizar etapaVisualToEstatusTecnicos para filtro por etapa"
    - "no copiar lógica de handlers mutantes"
    - "no llamar HTTP interno"

  status_semantics:
    - "estatus debe provenir de columna real"
    - "etapa debe derivarse mediante estatusToEtapaVisual"
    - "si estatus no mapea, preservar unknown/null según semántica existente"
    - "no crear columna ficticia etapa"

  planner:
    - "conservar intent folio_status"
    - "evitar SOURCE_NOT_INTEGRATED para consultas soportadas por este slice"
    - "no habilitar folio_history ni folio_documents"

  tools:
    - "habilitar tool de folio_status con executor real"
    - "inputs mínimos para id/numero/planta/etapa"
    - "no habilitar tools fuera de este slice"

  chat:
    - "wiring real in-process"
    - "responder folio individual"
    - "responder listado por planta/etapa"
    - "desambiguar id vs numero cuando sea necesario"
    - "no caer a Action Register"
    - "no usar M3 como sustituto"
    - "preservar evidencia estructurada"

  evidence:
    required_fields_if_available:
      - "folio_id"
      - "numero_folio"
      - "estatus"
      - "etapa"
      - "planta_id"
      - "planta_nombre/clave"
      - "source"
      - "retrieved_at o freshness equivalente"

  no_side_effect_proof:
    required:
      - "tests no deben invocar maybeAdvanceFolioToComprobaciones"
      - "tests deben demostrar que loaders/executors solo ejecutan SELECT"
      - "no importar handler mutante como atajo"

tests_required:
  focal:
    - "folio por id"
    - "folio por numero_folio"
    - "varios folios"
    - "listado por planta"
    - "filtrado por etapa"
    - "estatus observado"
    - "etapa derivada"
    - "folio inexistente"
    - "planta no autorizada"
    - "folio de otra planta"
    - "plantas_permitidas"
    - "GA"
    - "GV"
    - "unknown/null"
    - "intent folio_status"
    - "tool con executor"
    - "chat wiring"
    - "no SOURCE_NOT_INTEGRATED en consultas soportadas"
    - "folio_history sigue no integrado"
    - "folio_documents sigue no integrado"
    - "no Action Register fallback"
    - "no M3 fallback"
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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m2-folio-status.js"
    - "server.js"
    - "test/director-ia-m2-folio-status.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

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
  - "usar GET /api/dashboard/kanban como fuente"
  - "usar GET /api/folios/:id como fuente"
  - "llamar maybeAdvanceFolioToComprobaciones"
  - "timeline"
  - "history"
  - "documents"
  - "PDF"
  - "cheques"
  - "polizas"
  - "presupuestos"
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
  - "crear helper/loader SELECT-only M2"
  - "reutilizar helpers existentes"
  - "cablear folio_status"
  - "añadir executor"
  - "ajustar routing"
  - "ajustar capability necesaria"
  - "crear tests focales"
  - "actualizar scripts afectados"
  - "ejecutar tests"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "escribir reporte"
  - "proponer exactamente una NEXT_TASK"

forbidden_actions:
  - "usar handler mutante"
  - "introducir side effects"
  - "ampliar authz"
  - "crear writes"
  - "integrar timeline"
  - "integrar documentos"
  - "integrar superficies financieras"
  - "hacer HTTP interno"
  - "crear nuevo contrato"
  - "modificar arquitectura congelada"
  - "cambiar estado documental de M2"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "encadenar NEXT_TASK"

acceptance_criteria:
  - "Director IA consulta folio por id."
  - "Director IA consulta folio por numero_folio."
  - "Director IA consulta/lista folios por planta."
  - "Director IA filtra por etapa sin usar kanban mutante."
  - "estatus proviene de dato observado."
  - "etapa se deriva con mapeo existente."
  - "folio_status tiene executor real."
  - "planner llega a folio_status."
  - "chat llega al executor correcto."
  - "SOURCE_NOT_INTEGRATED deja de ocurrir para este slice."
  - "folio_history sigue fuera."
  - "folio_documents sigue fuera."
  - "authz se preserva."
  - "plantas_permitidas se preserva."
  - "no cross-planta."
  - "not found se maneja correctamente."
  - "no hay autoavance."
  - "no se llama maybeAdvanceFolioToComprobaciones."
  - "no hay writes."
  - "no hay HTTP interno."
  - "no cambia contrato HTTP."
  - "no cambia arquitectura."
  - "M2 sigue PARTIAL."
  - "porcentaje sigue 42.5%."
  - "tests focales verdes."
  - "regresión Director IA verde."
  - "git diff --check limpio."
  - "solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m2-folio-status.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001"

  note: >
    La tarea documental posterior solo debe reflejar ampliación interna de M2
    dentro de PARTIAL. No debe marcar M2 COMPLETE ni cambiar el porcentaje.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "helper/loader SELECT-only"
    - "folio por id"
    - "folio por numero"
    - "listado por planta"
    - "filtro por etapa"
    - "estatus vs etapa"
    - "rutas mutantes excluidas"
    - "authz"
    - "scope planta"
    - "planner"
    - "tools/executor"
    - "chat wiring"
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
  DONE_PENDING_REVIEW si el slice queda integrado SELECT-only, in-process,
  autorizado y probado, manteniendo M2 PARTIAL y el porcentaje en 42.5%.
  STOPPED si aparece dependencia inseparable de mutación o contradicción
  contractual. BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"