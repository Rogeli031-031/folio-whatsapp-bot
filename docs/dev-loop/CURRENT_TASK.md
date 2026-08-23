# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de capacidades de Director IA para reflejar
  el slice metadata documental read-only de M2 ya integrado en main,
  manteniendo M2 en PARTIAL y el porcentaje global en 42.5%, sin documentar
  acceso a contenido, S3, PDF ni inferencias sobre documentos faltantes.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001"
  module: "M2 — Kanban / Folios"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_percentage:
    before: 42.5
    after: 42.5
    numerator: 8.5
    denominator: 20
    effect: 0.0

implemented_slice:
  runtime_path: >
    folio_documents -> get_folio_documents ->
    loadFolioDocumentsMetadataForChat -> resolver/autorizar folio ->
    SELECT public.folio_archivos -> safe projection ->
    evidencia -> respuesta

  source: "public.folio_archivos"

  safe_fields:
    - "document_id"
    - "tipo"
    - "status"
    - "file_name"
    - "subido_en"
    - "identidad mínima segura del folio"

  forbidden_fields:
    - "s3_key"
    - "url"
    - "signed_url"
    - "bucket"
    - "raw_path"
    - "sha256"
    - "bytes"
    - "file_content"

  semantics:
    allowed: >
      Estos son los registros documentales que existen para este folio.

    zero_rows: >
      No hay registros documentales encontrados.

    forbidden:
      - "faltan documentos"
      - "debería tener documentos"
      - "documentación completa"
      - "documentación incompleta"
      - "cumplimiento documental"

  behavior:
    - "SELECT-only"
    - "safe projection"
    - "sin HTTP interno"
    - "sin S3"
    - "sin PDF"
    - "sin descarga"
    - "sin OCR"
    - "sin writes"

authz:
  - "resolver folio antes de consultar metadata"
  - "autorizar folio antes del SELECT"
  - "JWT/contexto preservado"
  - "rol preservado"
  - "planta_id preservado"
  - "plantas_permitidas preservado"
  - "GV = 403"
  - "GA solo dentro de planta autorizada"
  - "cross-planta = 403"
  - "not found = 404"
  - "fail-closed"

still_not_integrated:
  - "contenido PDF"
  - "S3"
  - "signed URLs"
  - "descarga de documentos"
  - "OCR"
  - "documentos faltantes"
  - "cumplimiento documental"
  - "kanban_flow"
  - "financial status"
  - "writes"

test_evidence:
  focal_documents_metadata: "24/24 pass"
  capabilities: "33/33 pass"
  planner: "36/36 pass"
  orchestrator: "24/24 pass"
  director_ia_suite: "533/533 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "cobertura M2 actual"
    - "folio_documents metadata-only"
    - "source public.folio_archivos"
    - "safe projection"
    - "s3_key excluido"
    - "semántica cero filas"
    - "guardrail de faltantes"
    - "authz"
    - "scope planta"
    - "limitaciones vigentes"

  must_preserve:
    - "M2 = PARTIAL"
    - "42.5%"
    - "8.5 / 20"
    - "contenido no integrado"
    - "S3 no integrado"
    - "faltantes no integrados"
    - "kanban_flow no integrado"
    - "financial status no integrado"
    - "writes no integrados"

  forbidden:
    - "marcar M2 COMPLETE"
    - "subir porcentaje"
    - "documentar acceso a PDF"
    - "documentar acceso a S3"
    - "documentar s3_key como evidencia"
    - "afirmar documentos faltantes"
    - "afirmar cumplimiento documental"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m2-documents-metadata.js"
    - "lib/director-ia-m2-folio-status.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m2-documents-metadata.test.js"
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
  - "marcar M2 COMPLETE"
  - "cambiar porcentaje"
  - "habilitar S3"
  - "habilitar PDF"
  - "habilitar OCR"
  - "habilitar faltantes"
  - "habilitar writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó físicamente el slice metadata integrado."
  - "Se documentó folio_documents metadata-only."
  - "Se documentó public.folio_archivos."
  - "Se documentaron campos seguros."
  - "Se documentó exclusión de s3_key."
  - "Se documentó cero filas sin inferir faltantes."
  - "Se documentó authz."
  - "Se documentó scope planta."
  - "Contenido sigue no integrado."
  - "S3 sigue no integrado."
  - "Faltantes siguen bloqueados."
  - "M2 sigue PARTIAL."
  - "42.5% no cambia."
  - "No se modificó código."
  - "No se modificaron tests."
  - "Solo CURRENT_TASK, reporte y capability matrix fueron modificados."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003"

  note: >
    La siguiente tarea debe priorizar el próximo slice M2 después de
    folio_status + history + documents metadata. No asumir kanban_flow ni
    financial status.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "slice integrado"
    - "source"
    - "safe fields"
    - "unsafe fields"
    - "s3_key exclusion"
    - "zero-row semantics"
    - "guardrail faltantes"
    - "authz"
    - "plant scope"
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
  DONE_PENDING_REVIEW si la documentación refleja fielmente metadata-only,
  conserva M2 PARTIAL y 42.5%, y no amplía semántica hacia S3, contenido o
  faltantes. STOPPED si requiere reinterpretación contractual. BLOCKED si
  falta gate o dato humano.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md"