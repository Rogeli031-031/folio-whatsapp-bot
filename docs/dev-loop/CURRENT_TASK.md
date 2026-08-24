# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar un slice read-only de M12 — Action Register — para que Director IA
  pueda consultar notas reales de revisión del tablero, incluyendo qué se escribió,
  autor almacenado, fecha/hora y revisión, mediante un loader dedicado SELECT-only,
  con contexto acotado y separación estricta frente a ítems, Plaud, M2, comentarios
  y binarios.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"

  module: "M12 — Action Register"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_percentage:
    before: 50.0
    numerator: 10.0
    denominator: 20
    after: 50.0
    gain_pp: 0.0

readiness_findings:
  source: "arr.action_register_revision_notes"
  relation: "revision_id only"

  no_item_relation: true

  latest_revision:
    uniqueness: "UNIQUE(planta_id, revision_date)"
    ordering: "ORDER BY revision_date DESC"
    rule: >
      Última revisión es resoluble físicamente. Si no hay revision_id, fecha ni
      término equivalente a 'última', se debe clarificar.

  recommended_architecture:
    loader: "loadActionRegisterRevisionNotesForChat"
    includeNotes_existing_context: false

  context_limits:
    revisions: 1
    max_notes: 8
    max_chars_per_note: 500
    truncation: "explícito"

architecture_pattern:
  required: >
    revision_notes intent -> tool -> executor ->
    loadActionRegisterRevisionNotesForChat ->
    resolver revisión autorizada ->
    SELECT arr.action_register_revision_notes ->
    recorte determinista ->
    evidencia -> respuesta

  transport:
    internal_http: false

  writes:
    allowed: false

  binaries:
    allowed: false

scope:
  included:
    - "nota por revision_id"
    - "notas de última revisión"
    - "texto almacenado"
    - "autor almacenado"
    - "created_at"
    - "revision_id"
    - "revision_date si físicamente disponible"
    - "planta"
    - "evidencia estructurada"

  excluded:
    - "vínculo a action item no existente"
    - "status de ítem inferido"
    - "responsable inferido"
    - "acuerdo formal inferido"
    - "Plaud"
    - "M2 history"
    - "comentario de folio"
    - "documentos/PDF"
    - "S3"
    - "binarios"
    - "writes"

revision_semantics:
  rules:
    - "nota pertenece a una revisión"
    - "nota no pertenece automáticamente a un ítem"
    - "nota no es transición de estatus"
    - "nota no es comentario de folio"
    - "nota no es minuta Plaud"
    - "texto no equivale a acuerdo formal salvo evidencia explícita"

latest_revision_semantics:
  allowed_triggers:
    - "última revisión"
    - "revisión más reciente"
    - "equivalente semántico inequívoco"

  explicit_inputs:
    - "revision_id"
    - "revision_date"

  otherwise:
    rule: >
      Si el usuario pregunta por notas sin identificar revisión ni solicitar
      explícitamente la última revisión, clarificar.

context_policy:
  revision_limit: 1
  note_limit: 8
  chars_per_note: 500

  order:
    - "usar orden físico verificado"
    - "mantener determinismo"

  truncation:
    - "marcar cuando una nota fue truncada"
    - "no ocultar silenciosamente truncation"
    - "no completar texto faltante"

  overflow:
    - "no cargar revisiones adicionales automáticamente"
    - "no exceder límites para 'ser más útil'"

authz:
  model: "Action Register actual"

  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "scope de Action Register"
    - "cross-planta bloqueado"
    - "fail-closed"
    - "GA/GV según reglas vigentes de AR"

  forbidden:
    - "reusar authz M2 si semánticamente distinta"
    - "ampliar scope por conveniencia"

planner_tools_capabilities:
  planner:
    - "habilitar intent específico revision_notes si es el path más seguro"
    - "preservar action_status"
    - "preservar overdue_actions"
    - "preservar responsible_lookup"
    - "no convertir cualquier pregunta AR en revision_notes"

  tools:
    - "tool específica de notas"
    - "executor real"
    - "inputs revision_id/revision_date/latest + planta_id"
    - "sin item_id salvo relación física futura explícita"

  capabilities:
    - "habilitar lectura de notas de revisión"
    - "mantener M12 PARTIAL"

  chat:
    - "wiring in-process"
    - "loader dedicado"
    - "no includeNotes=true en board general"
    - "bloque de evidencia separado"

semantic_invariants:
  - "Revision note ≠ action item."
  - "Revision note ≠ action status."
  - "Revision note ≠ M2 history."
  - "Revision note ≠ folio comment."
  - "Revision note ≠ Plaud."
  - "Revision note ≠ binary/document."
  - "Autor null no se inventa."
  - "Última revisión usa revision_date DESC."
  - "No inventar vínculo con ítem."
  - "No inventar acuerdos."

response_contract:
  include_if_supported:
    - "revision_id"
    - "revision_date"
    - "note_id"
    - "note_text"
    - "author"
    - "created_at"
    - "planta_id"
    - "truncated"
    - "source"

  forbidden:
    - "item_id inventado"
    - "responsable inferido"
    - "status inferido"
    - "agreement_status"
    - "plaud_source"
    - "folio_id salvo relación física"

tests_required:
  focal:
    - "notas por revision_id"
    - "notas por revision_date"
    - "última revisión"
    - "última revisión usa revision_date DESC"
    - "sin revisión -> clarificación"
    - "múltiples notas"
    - "máximo 8 notas"
    - "nota <= 500 chars"
    - "nota > 500 chars truncada"
    - "truncation explícito"
    - "autor"
    - "autor null"
    - "created_at"
    - "0 notas"
    - "revisión inexistente"
    - "planta autorizada"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "cross-planta"
    - "GA/GV"
    - "intent revision_notes"
    - "tool/executor"
    - "chat wiring"
    - "no includeNotes=true en board general"
    - "no item attribution"
    - "no M2 history"
    - "no folio comments"
    - "no Plaud"
    - "no binaries"
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
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m12-revision-notes.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m12-revision-notes.test.js"
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
  - "cambiar contrato HTTP"
  - "integrar Plaud"
  - "integrar PDFs/S3"
  - "modificar M2"
  - "crear vínculo nota-item"
  - "hacer writes"
  - "cycle constitucional"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Director IA consulta notas por revisión."
  - "Director IA consulta última revisión."
  - "Última revisión usa revision_date DESC."
  - "Sin revisión identificable, clarifica."
  - "Loader dedicado utilizado."
  - "No includeNotes=true en board general."
  - "Máximo 1 revisión."
  - "Máximo 8 notas."
  - "Máximo 500 caracteres por nota."
  - "Truncation explícito."
  - "Texto preservado sin inventar."
  - "Autor preservado/null."
  - "Created_at preservado."
  - "No vínculo inventado a ítem."
  - "Authz AR preservada."
  - "No cross-planta."
  - "No Plaud."
  - "No M2."
  - "No comentarios de folio."
  - "No binarios."
  - "No HTTP interno."
  - "No writes."
  - "M12 sigue PARTIAL."
  - "50.0% no cambia."
  - "Tests focales verdes."
  - "Regresión Director IA verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m12-revision-notes.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001"

  note: >
    La sync posterior solo documenta mayor profundidad dentro de M12 PARTIAL.
    No modifica 10.0/20 = 50.0%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "source revision_notes"
    - "revision relation"
    - "latest revision"
    - "loader dedicado"
    - "context limits"
    - "truncation"
    - "author/timestamp"
    - "authz"
    - "planner"
    - "tool/executor"
    - "chat wiring"
    - "item boundary"
    - "M2 boundary"
    - "comments boundary"
    - "Plaud boundary"
    - "binary boundary"
    - "tests"
    - "estado M12"
    - "porcentaje"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si notas de revisión quedan integradas SELECT-only,
  in-process, acotadas y semánticamente separadas. STOPPED si aparece
  contradicción física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"