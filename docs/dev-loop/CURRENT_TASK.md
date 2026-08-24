# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un slice read-only de M12 — Action Register — para que
  Director IA pueda consultar notas de revisión asociadas a revisiones reales
  del tablero, incluyendo qué se escribió, quién y cuándo, preservando la
  relación revision_id -> notes, con recorte de contexto, semántica explícita
  y separación estricta frente a Plaud, historial M2 y comentarios de folios.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"

  module: "M12 — Action Register"
  current_state: "PARTIAL"

  current_behavior:
    - "Director IA ya consulta Action Register"
    - "tablero/responsables/vencidas/temas ya existen"
    - "includeNotes actualmente false"
    - "board.notes no se consume en summarizers"

  global_percentage:
    current: 50.0
    numerator: 10.0
    denominator: 20

  expected_effect_of_future_slice:
    state: "PARTIAL"
    percentage_change_pp: 0.0

primary_question: >
  ¿Existe un path SELECT-only, in-process, autorizado y semánticamente claro
  para que Director IA responda preguntas sobre notas reales de revisiones del
  Action Register — qué se escribió, quién y cuándo — sin convertirlas en
  historial de ítems, sin mezclar Plaud/comentarios y sin exceder contexto?

candidate_source:
  expected_table: "arr.action_register_revision_notes"
  key_relation: "revision_id"

known_risks:
  - "las notas están asociadas a revisión, no a ítem"
  - "includeNotes hoy está desactivado"
  - "ningún summarizer actual consume board.notes"
  - "notas potencialmente largas"
  - "pueden existir múltiples notas por revisión"
  - "última revisión debe definirse físicamente"
  - "no binarios/documentos"
  - "no mezclar con Plaud"
  - "no mezclar con M2 history"
  - "no mezclar con comentarios"

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M12 completa y vigente"
      - "identificar alcance de notas"
      - "confirmar que el slice solo profundiza PARTIAL"
      - "confirmar efecto porcentual 0.0 pp"

  physical_source:
    inspect:
      - "arr.action_register_revision_notes"
      - "tabla/recurso de revisiones"
      - "relación revision_id"
      - "helpers de Action Register"
      - "loaders"
      - "queries"
      - "includeNotes"
      - "board.notes"

    determine:
      - "columnas reales"
      - "id de nota"
      - "revision_id"
      - "texto"
      - "autor/actor"
      - "timestamp"
      - "tipo si existe"
      - "orden"
      - "nulls"
      - "SELECT-only"
      - "side effects"

  revision_semantics:
    determine:
      - "qué es una revisión"
      - "cómo se identifica"
      - "cómo se ordena"
      - "qué significa última revisión"
      - "si existe revisión activa"
      - "si fecha de revisión es distinta de fecha de nota"
      - "si varias notas pertenecen a la misma revisión"

    rules:
      - "no inferir revisión desde nota suelta"
      - "no tratar nota como evento de ítem"
      - "no convertir nota en cambio de estatus"
      - "no inventar autor"
      - "no inventar timestamp"

  latest_review:
    required:
      - "definir físicamente cómo obtener última revisión"
      - "no usar 'última' por orden accidental"
      - "documentar tie-breaker si existe"
      - "si no existe semántica inequívoca, clarificar/usar revisión explícita"

  scope_semantics:
    distinguish:
      - "nota de revisión Action Register"
      - "comentario de acción"
      - "comentario de folio"
      - "historial M2"
      - "Plaud/reunión"
      - "documento/PDF"

    rule: >
      Director IA debe atribuir la nota a la revisión del Action Register y no
      reinterpretarla como otra fuente.

  content_policy:
    determine:
      - "máximo de notas por respuesta"
      - "máximo de caracteres/tokens por nota"
      - "orden"
      - "recorte"
      - "preservar texto sin inventar resumen"
      - "si summarizer debe recibir notas completas o extractos"

    rule: >
      La readiness debe definir una política de contexto acotada y determinista
      para evitar que notas extensas desplacen evidencia más importante.

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "planta_id"
      - "plantas_permitidas"
      - "scope de Action Register"
      - "cross-planta"
      - "GA/GV"
      - "fail-closed"

  planner_tools:
    inspect:
      - "intents actuales Action Register"
      - "action_status"
      - "overdue_actions"
      - "responsible_lookup"
      - "otros intents relacionados"
      - "tools actuales"
      - "executor"
      - "chat routing"
      - "buildFocusedActionRegisterContext"
      - "includeNotes"

    determine:
      - "si se necesita intent específico de revision_notes"
      - "si puede reutilizarse intent existente sin ambigüedad"
      - "tool/executor mínimo"
      - "qué preguntas nuevas habilitar"
      - "qué preguntas deben seguir fuera"

  summarizer_boundary:
    inspect:
      - "summarizers actuales"
      - "board.notes"
      - "cómo se construye contexto AR"

    determine:
      - "si se agrega bloque separado de notas"
      - "si notas deben mantenerse fuera de resumen de ítems"
      - "cómo evitar que una nota se atribuya a responsable/acción incorrecta"

  plaud_boundary:
    required:
      - "confirmar fuente Plaud separada"
      - "no usar grabaciones"
      - "no mezclar texto de reuniones"
      - "no inferir que una nota proviene de Plaud"

  binary_boundary:
    required:
      - "no archivos"
      - "no adjuntos"
      - "no PDFs"
      - "no S3"
      - "solo texto DB"

architecture_hypothesis:
  preferred_path: >
    intent revision_notes -> tool -> executor ->
    loadActionRegisterRevisionNotesForChat(planta_id, revision_id/latest) ->
    SELECT revision + notes ->
    contexto acotado ->
    evidencia -> respuesta

  alternative: >
    Reutilizar loader Action Register existente con includeNotes=true solo si
    puede preservarse separación semántica, authz y recorte sin contaminar
    board/summarizers.

  requirements:
    - "in-process"
    - "SELECT-only"
    - "sin HTTP interno"
    - "sin archivos"
    - "sin Plaud"
    - "sin writes"
    - "sin contrato nuevo"

response_contract:
  include_if_physically_supported:
    - "revision_id"
    - "revision_date"
    - "note_id"
    - "note_text"
    - "author"
    - "created_at"
    - "planta_id"
    - "source"

  forbidden:
    - "item_id salvo relación física explícita"
    - "estatus de acción inferido"
    - "responsable inferido"
    - "acuerdo formal inferido"
    - "minuta Plaud"
    - "comentario de folio"
    - "evento M2"

semantic_invariants:
  - "Revision note ≠ action item."
  - "Revision note ≠ status transition."
  - "Revision note ≠ M2 history."
  - "Revision note ≠ folio comment."
  - "Revision note ≠ Plaud transcript."
  - "Texto escrito ≠ acuerdo formal salvo semántica física."
  - "Autor null ≠ sistema."
  - "Última revisión requiere regla física."
  - "No inventar vínculo de nota con ítem."

mandatory_evidence_table:
  columns:
    - "surface"
    - "helper_or_query"
    - "physical_source"
    - "select_only"
    - "side_effects"
    - "revision_relation"
    - "author_semantics"
    - "timestamp_semantics"
    - "authz"
    - "plant_scope"
    - "context_limit"
    - "reusable"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

tests_to_design_if_ready:
  - "notas por revision_id"
  - "última revisión"
  - "múltiples notas"
  - "orden de notas"
  - "nota sin autor"
  - "nota sin timestamp si físicamente posible"
  - "texto largo / truncation"
  - "0 notas"
  - "revisión inexistente"
  - "planta autorizada"
  - "planta no autorizada"
  - "cross-planta"
  - "plantas_permitidas"
  - "GA/GV"
  - "intent"
  - "tool/executor"
  - "chat wiring"
  - "nota no atribuida a ítem"
  - "no M2 history"
  - "no folio comments"
  - "no Plaud"
  - "no binaries"
  - "no HTTP interno"
  - "sin writes"

decision_rules:

  ready:
    all:
      - "fuente notes SELECT-only"
      - "revision_id verificable"
      - "última revisión definible o clarificable"
      - "authz preservable"
      - "scope planta preservable"
      - "recorte de contexto determinista"
      - "separación semántica con M2/Plaud/comentarios"
      - "path in-process posible"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001"

  stopped:
    when:
      - "notas no pueden separarse de otro contexto"
      - "revision_id no puede resolverse de forma fiable"
      - "authz no puede preservarse"
      - "contexto no puede acotarse sin decisión contractual"
      - "última revisión es ambigua sin dato humano"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m12_state: "PARTIAL"
    global_numerator: 10.0
    denominator: 20
    global_percentage: 50.0
    gain_pp: 0.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"

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
  - "modificar capability matrix"
  - "modificar contratos"
  - "integrar Plaud"
  - "integrar archivos"
  - "integrar M2"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M12."
  - "Se verificó arr.action_register_revision_notes."
  - "Se verificó relación revision_id."
  - "Se verificó revisión."
  - "Se definió última revisión o regla de clarificación."
  - "Se verificó texto/autor/timestamp."
  - "Se verificó SELECT-only."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se definió recorte determinista."
  - "Se separó de ítems."
  - "Se separó de M2 history."
  - "Se separó de comentarios."
  - "Se separó de Plaud."
  - "Se separó de binarios."
  - "Se auditó planner/tools."
  - "Se definió path mínimo."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M12 sigue PARTIAL."
  - "50.0% sigue sin cambio."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M12"
    - "source revision_notes"
    - "revision semantics"
    - "latest revision"
    - "notes semantics"
    - "author/timestamp"
    - "context limit"
    - "authz"
    - "plant scope"
    - "planner/tools"
    - "summarizer boundary"
    - "M2 boundary"
    - "comments boundary"
    - "Plaud boundary"
    - "binary boundary"
    - "evidence table"
    - "gap table"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "state after future slice"
    - "percentage"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe path de notas SELECT-only, in-process, acotado
  y semánticamente separado. STOPPED si revisión/notas no pueden resolverse de
  forma segura. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"