# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T15:02:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la documentación de capacidades de Director IA
  para reflejar el nuevo slice read-only de M2 — Kanban / Folios — ya integrado
  en main, manteniendo M2 en PARTIAL, sin modificar el porcentaje global de
  42.5%, sin reinterpretar COMPLETE y sin documentar capacidades todavía no
  implementadas.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  implementation_merge_commit: "e5bd3a05822dc81a79e5036b692dcf9a5b125e0c"

  module: "M2"
  module_name: "Kanban / Folios"

  state_before: "PARTIAL"
  state_after: "PARTIAL"

  current_m0_m20_percentage: 42.5
  current_numerator: 8.5
  denominator: 20
  percentage_effect: 0.0

implemented_slice:
  name: "folio_status read-only"

  supported:
    - "consulta por folio id"
    - "consulta por numero_folio"
    - "consulta de varios folios"
    - "listado por planta autorizada"
    - "filtrado/listado por etapa"
    - "estatus observado"
    - "etapa derivada"
    - "evidencia estructurada"

  runtime_path: >
    intent folio_status -> get_folio_status -> loadFolioStatusForChat ->
    helper SELECT-only -> evidencia -> respuesta

  semantics:
    estatus: "columna observada en DB"
    etapa: "derivada mediante estatusToEtapaVisual"
    etapa_db_column: false

  authz:
    - "JWT/contexto preservado"
    - "rol preservado"
    - "planta_id preservado"
    - "plantas_permitidas preservado"
    - "GV = 403"
    - "GA solo dentro de planta autorizada"
    - "folio cross-planta = 403"
    - "not found = 404"
    - "fail-closed"

  exclusions:
    - "GET /api/dashboard/kanban como fuente"
    - "GET /api/folios/:id como fuente"
    - "maybeAdvanceFolioToComprobaciones"
    - "autoavance"
    - "writes"
    - "HTTP interno"
    - "folio_history"
    - "folio_documents"
    - "timeline"
    - "PDF"
    - "cheques"
    - "polizas"
    - "presupuestos"
    - "crear/editar/aprobar/cancelar folios"

test_evidence:
  focal_m2: "28/28 pass"
  capabilities: "27/27 pass"
  planner: "32/32 pass"
  orchestrator: "24/24 pass"
  director_ia_suite: "487/487 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M2 current Director IA coverage"
    - "exact information now queryable"
    - "exact information still not queryable"
    - "sources/helpers/tools/intents for folio_status"
    - "read-only nature of the slice"
    - "authz and plant scope"
    - "known unsafe HTTP surfaces excluded"
    - "current limitations"

  must_preserve:
    - "M2 = PARTIAL"
    - "42.5% global"
    - "8.5 / 20 numerator"
    - "folio_history not integrated"
    - "folio_documents not integrated"
    - "financial surfaces not integrated"
    - "mutations not integrated"
    - "Kanban mutating routes not used by Director IA"

  forbidden_interpretations:
    - "M2 COMPLETE"
    - "M2 covers full Kanban"
    - "M2 covers timeline/history"
    - "M2 covers documents"
    - "M2 covers cheque/poliza/presupuesto"
    - "M2 can create/edit/approve/cancel"
    - "M2 can auto-advance"
    - "folio etapa is a DB column"
    - "percentage increased"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m2-folio-status.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m2-folio-status.test.js"
    - "test/director-ia-duplicados.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "server.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "crear migration"
  - "modificar schema"
  - "modificar contratos arquitectónicos"
  - "modificar otros módulos funcionalmente"
  - "marcar M2 COMPLETE"
  - "cambiar porcentaje"
  - "habilitar history"
  - "habilitar documents"
  - "habilitar financial surfaces"
  - "habilitar writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "leer implementación M2"
  - "leer reportes de readiness e implementación"
  - "verificar main"
  - "actualizar únicamente la ficha M2 y resúmenes directamente afectados si existen"
  - "preservar estado PARTIAL"
  - "preservar porcentaje 42.5%"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "proponer como máximo una NEXT_TASK"

forbidden_actions:
  - "modificar código"
  - "modificar tests"
  - "reinterpretar M2 como COMPLETE"
  - "sumar +2.5 pp"
  - "documentar capacidades no implementadas"
  - "eliminar limitaciones reales"
  - "reabrir módulos ajenos"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar tarea siguiente"

acceptance_criteria:
  - "Se verificó físicamente el slice M2 integrado en main."
  - "Se documentó folio por id."
  - "Se documentó folio por numero_folio."
  - "Se documentó listado por planta."
  - "Se documentó filtro por etapa."
  - "Se documentó estatus observado."
  - "Se documentó etapa derivada."
  - "Se documentó authz."
  - "Se documentó scope planta."
  - "Se documentaron rutas mutantes excluidas."
  - "Se preservó folio_history como no integrado."
  - "Se preservó folio_documents como no integrado."
  - "Se preservaron superficies financieras como no integradas."
  - "Se preservaron mutaciones como no integradas."
  - "M2 sigue PARTIAL."
  - "M0-M20 sigue 8.5/20."
  - "Porcentaje sigue 42.5%."
  - "No se modificó código."
  - "No se modificaron tests."
  - "Solo CURRENT_TASK, reporte y capability matrix fueron modificados."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001"

  note: >
    La siguiente tarea, si se propone, debe decidir cuál es el próximo slice de
    M2 por valor ejecutivo. No asumir automáticamente history o documents.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 42.5%"
    - "implementación verificada"
    - "cobertura M2 antes/después"
    - "estado PARTIAL"
    - "folio id"
    - "numero_folio"
    - "listado planta"
    - "filtro etapa"
    - "estatus vs etapa"
    - "authz"
    - "scope planta"
    - "rutas mutantes excluidas"
    - "capacidades aún no integradas"
    - "tests verificados"
    - "cambios exactos en matriz"
    - "porcentaje antes/después"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK propuesta"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la documentación refleja fielmente el slice integrado,
  mantiene M2 PARTIAL y conserva 42.5%. STOPPED si la matriz vigente impide
  documentar el slice sin reinterpretación contractual. BLOCKED si falta gate
  o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"