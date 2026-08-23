# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de capacidades de Director IA para reflejar
  el slice history read-only de M2 ya integrado en main, manteniendo M2 en
  PARTIAL y el porcentaje global en 42.5%, sin reinterpretar COMPLETE ni
  documentar capacidades todavía no integradas.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M2-HISTORY-001"
  module: "M2 — Kanban / Folios"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_percentage:
    before: 42.5
    after: 42.5
    numerator: 8.5
    denominator: 20
    effect: 0.0

implemented_history:
  runtime_path: >
    folio_history -> get_folio_history -> loadFolioHistoryForChat ->
    resolver/autorización de folio -> SELECT public.folio_historial ->
    evidencia -> respuesta

  source: "public.folio_historial"

  observed_fields:
    - "estatus"
    - "comentario"
    - "actor_telefono"
    - "actor_rol"
    - "creado_en"

  derived_fields:
    - "etapa derivada desde estatus cuando aplica"

  forbidden_fields:
    - "estatus_anterior"
    - "estatus_nuevo"
    - "event_type"
    - "actor sistema inferido"

  behavior:
    - "eventos no deduplicados"
    - "eventos repetidos de misma etapa preservados"
    - "actor null preservado"
    - "estatus null preservado"
    - "no autoavance"
    - "no writes"
    - "no HTTP interno"

unsafe_surfaces_excluded:
  - "GET /api/dashboard/kanban"
  - "GET /api/folios/:id"
  - "GET /api/folios/:id/timeline como transporte interno"
  - "maybeAdvanceFolioToComprobaciones"
  - "dedupeHistorialByStage"

authz:
  - "JWT/contexto preservado"
  - "rol preservado"
  - "planta_id preservado"
  - "plantas_permitidas preservado"
  - "GV = 403"
  - "GA solo dentro de planta autorizada"
  - "cross-planta = 403"
  - "not found = 404"
  - "fail-closed"
  - "historial se consulta después de resolver y autorizar folio"

still_not_integrated:
  - "folio_documents"
  - "PDFs"
  - "financial status"
  - "kanban_flow inferencial"
  - "cheques"
  - "pólizas"
  - "presupuestos"
  - "crear folio"
  - "editar folio"
  - "aprobar folio"
  - "cancelar folio"
  - "cualquier write"

test_evidence:
  focal_history: "22/22 pass"
  capabilities: "28/28 pass"
  planner: "33/33 pass"
  orchestrator: "24/24 pass"
  director_ia_suite: "509/509 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "cobertura actual de M2"
    - "history ahora consultable"
    - "source public.folio_historial"
    - "campos observados"
    - "etapa derivada"
    - "semántica de nulls"
    - "eventos no deduplicados"
    - "authz"
    - "rutas inseguras excluidas"
    - "capacidades aún no integradas"

  must_preserve:
    - "M2 = PARTIAL"
    - "42.5%"
    - "8.5 / 20"
    - "documents no integrado"
    - "financial status no integrado"
    - "kanban_flow no integrado"
    - "writes no integrados"

  forbidden:
    - "marcar M2 COMPLETE"
    - "subir porcentaje"
    - "inventar event_type"
    - "inventar previous/new status"
    - "afirmar actor sistema por null"
    - "documentar timeline deduplicado como fuente de Director IA"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m2-history.js"
    - "lib/director-ia-m2-folio-status.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m2-history.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar schema"
  - "crear migration"
  - "modificar contratos arquitectónicos"
  - "modificar otros módulos"
  - "marcar M2 COMPLETE"
  - "cambiar porcentaje"
  - "habilitar documents"
  - "habilitar financial status"
  - "habilitar kanban_flow"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó físicamente history integrado."
  - "Se documentó folio_history."
  - "Se documentó public.folio_historial."
  - "Se documentaron campos observados."
  - "Se documentó etapa derivada."
  - "Se documentó preservación de nulls."
  - "Se documentó que no hay dedupe."
  - "Se documentó authz."
  - "Se documentaron rutas inseguras excluidas."
  - "Documents sigue no integrado."
  - "Financial status sigue no integrado."
  - "Kanban flow sigue no integrado."
  - "M2 sigue PARTIAL."
  - "42.5% no cambia."
  - "No se modificó código."
  - "No se modificaron tests."
  - "Solo CURRENT_TASK, reporte y capability matrix fueron modificados."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002"

  note: >
    La siguiente tarea debe volver a priorizar el próximo slice M2 por valor
    ejecutivo después de folio_status + history. No asumir documents.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "history integrado"
    - "source"
    - "observed fields"
    - "derived fields"
    - "null semantics"
    - "no dedupe"
    - "authz"
    - "unsafe routes excluded"
    - "capacidades aún no integradas"
    - "tests"
    - "estado M2"
    - "porcentaje"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la documentación refleja fielmente el slice history
  integrado y conserva M2 PARTIAL y 42.5%. STOPPED si requiere reinterpretación
  contractual. BLOCKED si falta gate o dato humano.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"