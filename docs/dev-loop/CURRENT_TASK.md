# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un slice read-only de M2 — Kanban / Folios — para que
  Director IA pueda consultar únicamente metadata documental registrada de un
  folio desde la base de datos, de forma in-process, autorizada y trazable,
  excluyendo contenido PDF, S3, descarga de archivos, s3_key y cualquier
  inferencia sobre documentos faltantes.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"

  winner: "documents"
  scope: "metadata DB only"

  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"
  expected_state_after_slice: "PARTIAL"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20
    expected_effect: 0.0

  already_integrated:
    - "comentarios"
    - "folio_status"
    - "history read-only"

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA liste la metadata documental registrada de un folio,
  usando public.folio_archivos o fuente equivalente, sin acceder al contenido
  de los archivos, sin S3 y sin exponer identificadores internos sensibles
  como s3_key?

candidate_source:
  expected_table: "public.folio_archivos"
  expected_helpers:
    - "listFolioArchivos"
    - "listFolioArchivosByFolioId"
    - "equivalentes físicamente verificados"

metadata_scope:
  candidate_included:
    - "tipo de documento si existe"
    - "status si existe"
    - "nombre de archivo si existe"
    - "fecha/creado_en si existe"
    - "identificador documental solo si es seguro y útil"
    - "identidad mínima del folio"
    - "conteo de registros si deriva directamente del SELECT"
    - "evidencia trazable"

  excluded:
    - "s3_key"
    - "URL firmada"
    - "bucket"
    - "contenido PDF"
    - "texto extraído del documento"
    - "descarga"
    - "S3"
    - "filesystem"
    - "OCR"
    - "resumen del PDF"
    - "afirmar que un documento falta"
    - "afirmar que un documento es obligatorio"
    - "inferir cumplimiento documental"
    - "mutaciones"
    - "uploads"
    - "deletes"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M2 vigente"
      - "ubicar documents dentro del propósito canónico"
      - "distinguir metadata vs contenido"
      - "confirmar que este slice no lleva M2 a COMPLETE"
      - "confirmar efecto porcentual"

  physical_source:
    determine:
      - "tabla/vista real"
      - "columnas reales"
      - "folio_id foreign key"
      - "tipo"
      - "status"
      - "nombre"
      - "fecha"
      - "s3_key u otros identificadores internos"
      - "nullable fields"
      - "orden"
      - "índices visibles si aplica"

  helpers:
    inspect:
      - "listFolioArchivos"
      - "listFolioArchivosByFolioId"
      - "helpers equivalentes"

    determine:
      - "query real"
      - "SELECT-only"
      - "joins"
      - "side effects"
      - "shape"
      - "si expone s3_key"
      - "si puede proyectarse un shape seguro sin s3_key"

  routes:
    inspect:
      - "endpoints de archivos/documentos"
      - "metadata"
      - "descarga"
      - "S3"
      - "signed URLs"
      - "uploads"
      - "deletes"

    purpose: >
      Separar estrictamente la superficie metadata read-only del contenido y de
      cualquier integración externa o mutante.

  folio_resolution:
    determine:
      - "resolución por id"
      - "resolución por numero_folio"
      - "reutilización de folio_status"
      - "autorizar folio antes de consultar metadata"
      - "not found"
      - "cross-planta"

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

  semantics:
    determine:
      - "qué significa tipo"
      - "qué significa status"
      - "qué significa nombre"
      - "qué timestamp representa"
      - "qué campos son internos"
      - "qué campos son seguros para Director IA"
      - "qué NO puede afirmarse a partir de la metadata"

  planner_tools:
    inspect:
      - "intent folio_documents"
      - "capability folio_documents"
      - "tool existente"
      - "executor"
      - "UNSUPPORTED_RULES"
      - "SOURCE_NOT_INTEGRATED"
      - "chat routing"

    determine:
      - "qué ya existe"
      - "qué falta"
      - "si debe habilitarse un sub-slice metadata"
      - "si el intent actual es demasiado amplio y requiere guardrails"

  architecture_fit:
    determine:
      - "loader/helper metadata mínimo"
      - "reutilización de authz M2"
      - "path in-process"
      - "sin HTTP interno"
      - "sin S3"
      - "sin contrato nuevo"
      - "G2 sí/no"
      - "G3 sí/no"

required_safe_projection:
  allow_if_physically_present:
    - "folio_id"
    - "numero_folio"
    - "document_id"
    - "tipo"
    - "status"
    - "nombre_archivo"
    - "creado_en/fecha"
    - "source"

  explicitly_exclude:
    - "s3_key"
    - "bucket"
    - "signed_url"
    - "raw_path"
    - "internal_storage_identifier"
    - "file_content"

  rule: >
    Si el helper existente devuelve s3_key u otro identificador interno, el
    loader de Director IA debe proyectar solo campos seguros antes de producir
    evidencia.

semantic_invariants:
  - "Metadata ≠ contenido."
  - "Registro documental ≠ documento obligatorio."
  - "Ausencia de registro ≠ documento faltante."
  - "status documental ≠ cumplimiento global."
  - "nombre de archivo ≠ contenido verificado."
  - "No exponer s3_key."
  - "No construir URL."
  - "No descargar archivos."
  - "No acceder S3."
  - "No inferir falta."
  - "No cross-planta."
  - "Toda afirmación debe ser trazable al SELECT de metadata."

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_route"
    - "physical_source"
    - "select_only"
    - "side_effects"
    - "authz"
    - "plant_scope"
    - "safe_fields"
    - "unsafe_fields"
    - "external_dependency"
    - "reusable"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_metadata_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

implementation_hypothesis:
  expected_path: >
    intent folio_documents -> tool -> executor -> loadFolioDocumentsMetadataForChat
    -> resolver/autorizar folio -> SELECT public.folio_archivos ->
    safe projection without s3_key -> evidencia -> respuesta

  note: >
    Hipótesis a auditar. No autoriza implementación ni acceso al contenido.

tests_to_design_if_ready:
  - "metadata por folio id"
  - "metadata por numero_folio"
  - "múltiples documentos"
  - "sin documentos"
  - "tipo"
  - "status"
  - "nombre"
  - "fecha"
  - "nulls"
  - "s3_key nunca expuesto"
  - "folio inexistente"
  - "cross-planta"
  - "planta no autorizada"
  - "plantas_permitidas"
  - "GA"
  - "GV"
  - "intent/tool"
  - "SOURCE_NOT_INTEGRATED levantado solo para metadata soportada"
  - "contenido sigue bloqueado"
  - "S3 sigue fuera"
  - "no HTTP interno"
  - "sin writes"

decision_rules:

  ready:
    all:
      - "fuente metadata real"
      - "SELECT-only"
      - "safe projection posible"
      - "s3_key excluible"
      - "authz preservable"
      - "scope planta preservable"
      - "path in-process posible"
      - "sin S3"
      - "sin contrato nuevo"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001"

  stopped:
    when:
      - "metadata depende inseparablemente de S3"
      - "helper no puede proyectar sin exponer identificadores internos"
      - "authz no es preservable"
      - "scope planta no es preservable"
      - "semántica requiere contrato nuevo"

    outcome: "STOPPED"
    next_task: null

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"

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
  - "acceder S3"
  - "descargar PDF"
  - "OCR"
  - "procesar contenido"
  - "hacer uploads"
  - "hacer deletes"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó la fuente real de metadata."
  - "Se verificaron helpers."
  - "Se verificó SELECT-only."
  - "Se identificó s3_key y otros campos internos."
  - "Se definió safe projection."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificó planner/tools."
  - "Se verificó separación metadata/contenido."
  - "Se verificó separación DB/S3."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M2 seguiría PARTIAL."
  - "42.5% seguiría sin cambio."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001"

  if_stopped:
    propose: null

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "scope metadata only"
    - "physical source"
    - "helpers"
    - "safe fields"
    - "unsafe fields"
    - "s3_key exclusion"
    - "routes"
    - "S3 boundary"
    - "folio resolution"
    - "authz"
    - "plant scope"
    - "semantics"
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
  DONE_PENDING_REVIEW si existe path metadata-only SELECT-only, in-process,
  autorizado y sin exposición de storage internals. STOPPED si metadata depende
  inseparablemente de S3 o requiere decisión contractual. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"