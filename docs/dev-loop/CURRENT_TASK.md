# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el slice read-only de metadata documental de M2 — Kanban /
  Folios — para que Director IA pueda listar registros documentales existentes
  de un folio desde public.folio_archivos, de forma in-process, autorizada y
  trazable, sin S3, sin PDF, sin descarga, sin exponer s3_key y sin inferir
  documentos faltantes.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"

  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"
  state_after_slice: "PARTIAL"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20
    effect_this_slice: 0.0

readiness_findings:
  source: "public.folio_archivos"

  safe_metadata_fields:
    - "id/document_id"
    - "tipo"
    - "status"
    - "file_name"
    - "subido_en"
    - "identidad mínima del folio"

  forbidden_storage_fields:
    - "s3_key"
    - "url"
    - "signed_url"
    - "bucket"
    - "sha256"
    - "raw_path"
    - "bytes"
    - "contenido"

  helpers:
    listFolioArchivos:
      behavior: "SELECT-only"
      s3_key_returned: false

    listFolioArchivosByFolioId:
      behavior: "SELECT-only"
      s3_key_returned: true
      rule: >
        Si se reutiliza, el loader de Director IA debe proyectar explícitamente
        solo campos seguros y nunca copiar s3_key a evidencia o respuesta.

  semantics:
    allowed: >
      Estos son los registros documentales que existen para este folio.

    forbidden:
      - "falta tal documento"
      - "debería tener tal documento"
      - "documentación completa"
      - "documentación incompleta"
      - "cumple requisitos documentales"

    reason: >
      No existe un set esperado canónico de documentos en este slice.

architecture_pattern:
  required: >
    intent folio_documents -> tool -> executor ->
    loadFolioDocumentsMetadataForChat -> resolver/autorizar folio ->
    SELECT public.folio_archivos -> safe projection ->
    evidencia -> respuesta

  transport:
    internal_http: false

  storage:
    s3_access: false

  cycle:
    constitutional_cycle: false

documents_scope:
  included:
    - "metadata por folio id"
    - "metadata por numero_folio"
    - "lista de registros documentales"
    - "document_id"
    - "tipo"
    - "status"
    - "file_name"
    - "subido_en"
    - "conteo de registros derivado del SELECT"
    - "evidencia estructurada"

  excluded:
    - "s3_key"
    - "PDF"
    - "contenido"
    - "descarga"
    - "URL firmada"
    - "S3"
    - "OCR"
    - "resumen documental"
    - "uploads"
    - "deletes"
    - "writes"
    - "inferencia de documentos faltantes"
    - "compliance documental"

folio_resolution_and_authz:
  required_order:
    - "resolver folio"
    - "autorizar folio"
    - "solo entonces consultar metadata"

  preserve:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "GV = 403"
    - "GA solo dentro de planta autorizada"
    - "cross-planta = 403"
    - "not found = 404"
    - "fail-closed"

  reuse:
    - "modelo seguro de folio_status/history"

planner_tools_capabilities:
  planner:
    - "habilitar folio_documents solo para consultas de metadata soportadas"
    - "conservar guardrail para preguntas de documentos faltantes"
    - "no habilitar lectura de contenido"

  unsupported_rules:
    - "conservar bloqueo asociado a falt/falta/faltan cuando aplique"
    - "levantar SOURCE_NOT_INTEGRATED solo para listar/tiene metadata soportada"

  tools:
    - "habilitar tool de folio_documents con executor real"
    - "inputs mínimos id/numero_folio"
    - "no agregar parámetros S3"

  chat:
    - "wiring in-process"
    - "no construir URLs"
    - "no acceder almacenamiento"
    - "no fallback a M3"
    - "no fallback a Action Register"
    - "no afirmar faltantes"

safe_projection:
  required:
    - "document_id"
    - "tipo"
    - "status"
    - "file_name"
    - "subido_en"

  optional_if_safe:
    - "folio_id"
    - "numero_folio"
    - "planta_id"
    - "source"

  must_never_include:
    - "s3_key"
    - "bucket"
    - "signed_url"
    - "raw_path"
    - "sha256"
    - "bytes"
    - "file_content"

semantic_invariants:
  - "Metadata ≠ contenido."
  - "Registro existente ≠ documento obligatorio."
  - "Cero registros ≠ documentos faltantes."
  - "status ≠ cumplimiento global."
  - "file_name ≠ contenido validado."
  - "No exponer s3_key."
  - "No construir URL."
  - "No acceder S3."
  - "No descargar."
  - "No hacer OCR."
  - "No cross-planta."
  - "Toda respuesta debe ser trazable al SELECT de metadata."

tests_required:
  focal:
    - "metadata por folio id"
    - "metadata por numero_folio"
    - "múltiples documentos"
    - "cero documentos"
    - "document_id"
    - "tipo"
    - "status"
    - "file_name"
    - "subido_en"
    - "nulls"
    - "s3_key nunca aparece"
    - "URL nunca aparece"
    - "folio inexistente"
    - "cross-planta"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "GA"
    - "GV"
    - "intent folio_documents"
    - "tool/executor"
    - "chat wiring"
    - "listar documentos soportado"
    - "pregunta tiene documentos soportada si semánticamente válida"
    - "pregunta faltan documentos sigue bloqueada"
    - "contenido/PDF sigue bloqueado"
    - "sin S3"
    - "sin HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m2-documents-metadata.js"
    - "lib/director-ia-m2-folio-status.js"
    - "test/director-ia-m2-documents-metadata.test.js"
    - "test/director-ia-m2-folio-status.test.js"
    - "test/director-ia-duplicados.test.js"
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
  - "acceder S3"
  - "generar signed URL"
  - "descargar archivos"
  - "leer PDFs"
  - "OCR"
  - "procesar contenido"
  - "uploads"
  - "deletes"
  - "writes"
  - "kanban_flow"
  - "financial status"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "crear loader metadata SELECT-only"
  - "reutilizar resolución/authz de M2"
  - "proyectar campos seguros"
  - "cablear folio_documents metadata-only"
  - "habilitar executor"
  - "ajustar planner/capability/tool solo para metadata"
  - "preservar guardrail faltan"
  - "crear tests focales"
  - "actualizar scripts afectados"
  - "ejecutar tests"
  - "ejecutar git diff --check"
  - "ejecutar git status"
  - "escribir reporte"
  - "proponer exactamente una NEXT_TASK"

forbidden_actions:
  - "exponer s3_key"
  - "construir URL"
  - "acceder S3"
  - "leer contenido"
  - "inferir faltantes"
  - "inferir cumplimiento"
  - "ampliar authz"
  - "hacer writes"
  - "hacer HTTP interno"
  - "modificar arquitectura"
  - "crear contrato nuevo"
  - "marcar M2 COMPLETE"
  - "cambiar 42.5%"
  - "commit"
  - "push"
  - "merge"
  - "encadenar NEXT_TASK"

acceptance_criteria:
  - "Director IA lista metadata documental por folio id."
  - "Director IA lista metadata por numero_folio."
  - "Safe projection omite s3_key."
  - "No se expone URL/bucket/path/sha256/bytes."
  - "Tipo se preserva."
  - "Status se preserva."
  - "File name se preserva."
  - "Subido_en se preserva."
  - "Cero filas se reporta como cero registros, no como faltantes."
  - "Authz se aplica antes del SELECT de metadata."
  - "No cross-planta."
  - "folio_documents tiene executor real para metadata soportada."
  - "Preguntas sobre faltantes siguen bloqueadas."
  - "Contenido/PDF sigue fuera."
  - "No S3."
  - "No HTTP interno."
  - "No writes."
  - "No cambia contrato HTTP."
  - "No cambia arquitectura."
  - "M2 sigue PARTIAL."
  - "42.5% no cambia."
  - "Tests focales verdes."
  - "Regresión Director IA verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m2-documents-metadata.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001"

  note: >
    La tarea documental posterior solo debe reflejar profundización dentro de
    PARTIAL. No marcar COMPLETE ni cambiar 42.5%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "source public.folio_archivos"
    - "safe projection"
    - "s3_key exclusion"
    - "metadata por id"
    - "metadata por numero_folio"
    - "authz"
    - "scope planta"
    - "planner"
    - "tool/executor"
    - "chat wiring"
    - "guardrail faltantes"
    - "S3 boundary"
    - "no side effects"
    - "tests"
    - "estado M2"
    - "porcentaje"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si metadata queda integrada SELECT-only, in-process,
  autorizada y sin exposición de storage internals, manteniendo M2 PARTIAL y
  42.5%. STOPPED si metadata no puede separarse de S3 o requiere contrato nuevo.
  BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"