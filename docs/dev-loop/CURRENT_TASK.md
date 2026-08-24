# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: APPROVED
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice pending_work_items_only de memoria conversacional
  persistente para el chat legado de Director IA, de modo que un asunto pendiente
  pueda retomarse en una nueva sesión sin persistir history, respuestas del
  assistant, hipótesis ni evidencia mutable. Al recuperar memoria, authz,
  planta, entidad y evidencia empresarial deben revalidarse antes de afirmar
  el estado actual.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_readiness:
    determination: "READY_WITH_LIMITS"
    first_slice: "pending_work_items_only"

  contract_gate:
    determination: "ALLOWED"
    G5: "APPROVED"

product_principle: >
  MEMORY sirve para recordar qué trabajo quedó pendiente.
  CURRENT EVIDENCE sirve para decir qué es verdad hoy.

core_invariant: >
  Un pending work item nunca sustituye una consulta actual de las fuentes.

first_slice:
  name: "pending_work_items_only"

  purpose:
    - "recordar una investigación pendiente"
    - "recordar planta y entidad de trabajo"
    - "recordar qué información faltaba"
    - "permitir retomar el asunto en otra sesión"

  does_not_store:
    - "history completo"
    - "transcript"
    - "respuestas del assistant"
    - "claims del usuario como hechos"
    - "hipótesis del modelo"
    - "payloads completos de evidencia"
    - "SOURCE_RESTRICTED como dato factual"
    - "authz como permiso persistente"
    - "Recommendation N5"
    - "IES"
    - "Reasoning Run"

storage:

  owner: "chat legado operativo"
  schema: "arr"

  new_table_required: true

  table_name_preferred: "arr.director_ia_pending_work_items"

  rule: >
    Verificar convenciones físicas del repositorio antes de fijar nombre final.
    Si existe patrón equivalente, reutilizar naming consistente sin ampliar scope.

  minimal_fields_to_implement_if_physically_supported:
    - "id"
    - "user_scope_key"
    - "planta_id"
    - "entity_type"
    - "entity_key"
    - "parent_intent"
    - "pending_information_gap"
    - "status"
    - "created_at"
    - "updated_at"
    - "last_revalidated_at"

  optional_only_if_required_by_existing_patterns:
    - "source_type"
    - "source_ref"

  prohibited_fields:
    - "raw_history"
    - "assistant_answer"
    - "evidence_payload"
    - "llm_hypothesis"
    - "authorization_snapshot"
    - "full_context"

  status_values:
    - "active"
    - "resolved"
    - "superseded"
    - "stale"
    - "dismissed"

  rule: >
    El status describe el estado del WORK ITEM, no el estado factual del cliente,
    acción, venta u otro dato empresarial.

migration_policy:

  required:
    - "usar mecanismo SQL/migration ya vigente en el repositorio"
    - "CREATE TABLE idempotente si ése es el patrón actual"
    - "índices mínimos para recuperación por user/planta/entity/status"
    - "sin triggers"
    - "sin funciones SQL de negocio"
    - "sin duplicar tablas existentes"

  prohibited:
    - "nuevo framework de migraciones"
    - "schema adicional"
    - "EKS tables"
    - "chat transcript table"

creation_policy:

  automatic_allowed_only_when:
    all:
      - "pending_information_gap deriva de evidencia fresca"
      - "planta actual está autorizada"
      - "entidad está resuelta de forma única"
      - "parent_intent es soportado"
      - "gap es objetivo y útil para retomar"

  explicit_user_request:
    examples:
      - "recuérdame que estábamos revisando Arturo"
      - "guarda este pendiente"

    rule: >
      Debe persistirse usando el mismo shape estructurado; no guardar texto de
      conversación completo.

  forbidden_creation:
    - "por cada conversación"
    - "por cada unknown"
    - "por cada respuesta del assistant"
    - "por hipótesis"
    - "por simple mención de una entidad"
    - "por SOURCE_RESTRICTED"
    - "si entidad es ambigua"

deduplication:

  requirement: >
    Evitar crear múltiples work items activos equivalentes para el mismo
    user_scope + planta + entity + parent_intent + gap normalizado si ya existe
    uno activo.

  rule: >
    Reutilizar/updatear el pendiente existente cuando corresponda; no construir
    historial de duplicados innecesario.

retrieval_policy:

  trigger_examples:
    - "¿Qué pasó con Arturo?"
    - "¿En qué quedó lo de Arturo?"
    - "¿Seguimos con Arturo?"
    - "¿Qué quedó pendiente?"
    - "retomar una entidad explícita"

  do_not_retrieve:
    - "en cada mensaje"
    - "para smalltalk"
    - "sin scope actual autorizado"
    - "memorias resolved/dismissed salvo petición explícita"

  filters:
    - "usuario/scope actual"
    - "planta actual"
    - "entity_key si existe"
    - "parent_intent si ayuda"
    - "status = active"

  max_results: 3

  ordering:
    - "updated_at DESC"

  rule: >
    La memoria recuperada aporta contexto de trabajo, no evidencia factual.

revalidation_policy:

  mandatory_on_resume:
    - "authz actual"
    - "planta actual"
    - "entidad actual"
    - "requery de fuentes necesarias"
    - "SOURCE_RESTRICTED actual"
    - "estado actual de la evidencia"

  precedence:
    first: "current evidence"
    second: "persistent work-item context"

  expected_language:
    allowed: >
      “La última vez dejamos pendiente conocer el motivo documentado de Arturo.
      Voy a revisar si ya existe información nueva.”

    forbidden: >
      “Arturo sigue sin comprar.”

      solo porque la memoria antigua lo decía.

resume_behavior:

  required_flow: >
    nueva sesión
      → detectar referencia a trabajo anterior
      → recuperar pending work item
      → validar authz/planta/entity
      → requery evidencia actual
      → actualizar structured_conversation_state efímero
      → entregar HILO mínimo a GPT
      → responder con memoria + evidencia actual claramente diferenciadas

  principle: >
    Retomar conversación sin hacer de la memoria una base paralela de verdad.

integration_with_ephemeral_state:

  required:
    - "al recuperar un pendiente válido, hidratar parent_intent"
    - "hidratar planta solo desde request actual, no desde memory ciegamente"
    - "hidratar active_entity únicamente después de revalidación"
    - "hidratar pending_information_gap si sigue aplicando"
    - "last_evidence_bundle_type debe derivarse del requery actual"

  prohibited:
    - "copiar raw memory directamente a evidence bundle"
    - "omitir requery porque existe memory"

resolution_policy:

  resolve_when:
    - "la evidencia actual cierra objetivamente la brecha"
    - "usuario indica que el pendiente ya no debe seguir"
    - "otro work item lo supersede de forma clara"

  stale_when:
    - "entidad ya no puede resolverse"
    - "contexto ya no es aplicable"
    - "revalidación demuestra que el pendiente perdió vigencia"

  dismissed_when:
    - "usuario solicita descartarlo"

  rule: >
    No marcar resolved porque GPT “cree” que ya se resolvió. Debe existir
    evidencia actual o instrucción humana explícita.

authz_and_isolation:

  required:
    - "scope de usuario actual"
    - "planta actual"
    - "plantas_permitidas"
    - "rol actual"
    - "no cross-user leakage"
    - "no cross-plant leakage"

  invariant: >
    La memoria NO concede acceso. Si hoy el usuario ya no puede consultar la
    entidad/planta, la recuperación factual debe bloquearse según authz vigente.

privacy:

  persist_minimum: true

  prohibited:
    - "transcripts completos"
    - "mensajes innecesarios"
    - "system prompts"
    - "secretos"
    - "tokens"
    - "raw OpenAI messages"

truth_boundaries:

  memory_statement:
    example: "quedó pendiente conocer el motivo de Arturo"
    classification: "work context"

  current_fact:
    example: "Arturo sigue sin comprar"
    classification: "requires current evidence"

  rules:
    - "memory != evidence"
    - "memory != observation"
    - "memory != IES"
    - "memory != verified conclusion"
    - "assistant claim != factual memory"
    - "user claim != database fact"

mandatory_product_scenario:

  day_1:
    conversation:
      - "¿Por qué dejó de comprar Arturo?"
      - "No hay evidencia suficiente para determinar el motivo."
      - "¿Qué falta?"
    expected:
      - "se identifica brecha objetiva"
      - "se crea pending work item estructurado"

  session_closed: true

  day_2:
    new_conversation:
      - "¿Qué pasó con Arturo?"

    expected_flow:
      - "recuperar pending work item"
      - "revalidar authz"
      - "resolver Arturo nuevamente"
      - "requery comments/actions/commercial data necesarios"
      - "comparar pending gap con evidencia actual"

    acceptable_answer_if_no_new_information: >
      “La última vez dejamos pendiente conocer el motivo documentado de Arturo.
      Revisé nuevamente la información disponible y todavía no encuentro evidencia
      suficiente que explique el cambio. Sigue faltando X.”

    acceptable_answer_if_new_information_exists: >
      “La última vez dejamos pendiente conocer el motivo de Arturo. Ahora hay
      información nueva registrada [...].”

    prohibited_answer: >
      “Arturo sigue sin comprar porque la competencia...”
      si eso proviene solo de memoria o inferencia anterior.

mandatory_product_scenario_changed_data:

  memory:
    "acción estaba abierta"

  current_data:
    "acción ahora cerrada"

  expected: >
    Mostrar estado actual. El recuerdo antiguo no prevalece.

information_gap_requirement:

  desired:
    - "qué sabemos"
    - "qué falta"
    - "por qué hace falta"
    - "qué fuente/persona puede aportar información solo si existe vínculo físico"
    - "qué análisis desbloquea"

  rule: >
    GPT puede redactar esto a partir de evidencia fresca y work-item context.
    No implementar un sistema experto de preguntas.

conversation_principle: >
  Persistir continuidad, no programar razonamiento.

routing_preservation:
  must_preserve:
    - "structured_conversation_state efímero"
    - "plant_diagnosis"
    - "financial_diagnosis"
    - "expediente_comercial"
    - "standalone queries"
    - "existing authz"
    - "existing SOURCE_RESTRICTED semantics"

deferred:
  - "full conversation summaries"
  - "full history memory"
  - "persistent user preferences"
  - "validated conclusions memory"
  - "decision memory"
  - "topic stack cross-session"
  - "multiple simultaneous work items in active conversation"
  - "long-term semantic memory"
  - "EKS integration"
  - "IES/N5 integration"
  - "daily deviation explanation"
  - "notifications/automations"

tests_required:

  storage:
    - "create pending work item"
    - "dedupe active equivalent"
    - "retrieve max 3 active"
    - "resolve"
    - "supersede"
    - "stale"
    - "dismiss"

  memory_truth:
    - "memory != evidence"
    - "no raw history persisted"
    - "no assistant answer persisted as fact"
    - "no evidence payload persisted"
    - "current data supersedes memory"

  cross_session:
    - "day1 pending -> day2 resume"
    - "fresh requery on resume"
    - "active entity revalidated"
    - "pending gap restored only after validation"

  authz:
    - "cross-user blocked"
    - "cross-plant blocked"
    - "current authz rechecked"
    - "access revoked"
    - "SOURCE_RESTRICTED current wins"

  regression:
    - "ephemeral conversation continuity"
    - "plant_diagnosis"
    - "financial_diagnosis"
    - "commercial dossier"
    - "planner"
    - "tools"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-persistent-memory.js"
    - "server.js"
    - "sql/**"
    - "test/director-ia-persistent-memory.test.js"

  conditional_writable:
    - "existing Director IA tests if legitimate assertions must change"
    - "package scripts only if existing test registration requires it"

  read_only:
    - "docs/director-ia/**"
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"
    - "EKS/EKE docs"
    - "other unrelated code"

out_of_scope:
  - "capability matrix"
  - "contract changes"
  - "EKS changes"
  - "IES changes"
  - "Reasoning Engine changes"
  - "full history storage"
  - "conversation transcript storage"
  - "cross-session semantic memory"
  - "writes outside the dedicated memory store"
  - "Twilio"
  - "WhatsApp"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Nueva memoria pending_work_items_only implementada."
  - "Persistencia cross-session real."
  - "No raw history."
  - "No assistant claims persisted as facts."
  - "Memory != evidence."
  - "Dedicated arr operational store."
  - "Day 1 -> Day 2 scenario works."
  - "Current evidence is requeried."
  - "Current evidence supersedes memory."
  - "Authz is revalidated."
  - "No cross-user leakage."
  - "No cross-plant leakage."
  - "SOURCE_RESTRICTED current wins."
  - "Resolved/stale/dismissed lifecycle works."
  - "Ephemeral conversation state preserved."
  - "No EKS/IES/N5 changes."
  - "No new reasoning rules."
  - "52.5% preserved."
  - "Focal tests green."
  - "Full Director IA regression green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: >
  DONE_PENDING_REVIEW if persistent pending-work-item memory works end-to-end
  with revalidation and isolation. STOPPED if schema/runtime constraints
  contradict the readiness. BLOCKED if a required gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001.md