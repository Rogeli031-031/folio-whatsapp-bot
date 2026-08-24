# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el first slice aprobado de continuidad conversacional en el chat
  legado mediante structured_conversation_state efímero, para que follow-ups
  naturales puedan heredar de forma segura el intent padre, planta actual,
  una entidad activa resuelta y una brecha de información pendiente, mientras
  toda evidencia factual se vuelve a consultar en cada turno con authz vigente.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  readiness:
    task: "ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001"
    determination: "READY_WITH_LIMITS"
    selected_first_slice: "structured_conversation_state"

product_principle: >
  La arquitectura debe permitir que GPT sostenga una conversación natural sobre
  datos confiables. No debe sustituir innecesariamente el razonamiento del modelo
  con reglas determinísticas.

current_failure:
  facts:
    - "frontend envía history hasta 8 turnos"
    - "POST /chat no usa history para continuidad"
    - "planner reclasifica cada turno desde cero"
    - "OpenAI recibe solo system + user del turno actual"
    - "follow-ups naturales caen mayormente en unknown"

implementation_scope:

  structured_conversation_state:
    ephemeral: true
    persistent_db: false
    cross_session: false

    fields:
      parent_intent:
        required: true
        purpose: >
          Mantener el intent padre cuando el nuevo turno es un follow-up
          defendible y no contiene suficiente señal para reclasificarse solo.

      planta_id:
        required: true
        source: "request/context autorizado"
        rule: >
          Nunca derivar ni confiar ciegamente en planta mencionada en history.
          Debe corresponder al scope actual autorizado.

      active_entities:
        required: true
        max_items: 1
        rule: >
          Solo entidad resuelta de forma única dentro de la planta actual.
          Ambigüedad => clarificar.

      last_evidence_bundle_type:
        required: true
        purpose: >
          Recordar qué tipo de pack fue usado en el turno anterior, sin cachear
          ni reutilizar el payload factual.

      pending_information_gap:
        required: true
        source: "derivado del pack fresco"
        rule: >
          Nunca derivarlo de la prosa previa del assistant como si fuera verdad.

  explicitly_not_in_state:
    - "active_topic"
    - "period"
    - "period_a"
    - "period_b"
    - "folio_id"
    - "action_id"
    - "revision_id"
    - "raw evidence payload"
    - "evidence cache"
    - "topic stack"
    - "cross-session memory"

followup_detection:

  objective: >
    Detectar cuándo una frase corta depende claramente del contexto anterior y
    debe reutilizar parent_intent en vez de reclasificarse desde cero.

  positive_patterns_to_support:
    - "¿Qué te llama la atención?"
    - "¿Por qué?"
    - "¿Y Arturo?"
    - "¿Qué sabemos de él?"
    - "¿Tiene acción?"
    - "¿Qué falta saber?"
    - "¿Qué te falta?"
    - "¿Quién puede darnos esa información?"
    - "¿Para qué la necesitas?"

  rule: >
    No convertir cualquier unknown en continuación. Debe existir estado previo
    válido y compatibilidad semántica defendible.

planner_behavior:

  required:
    - "planner sigue siendo fuente del intent"
    - "si turno actual es standalone, clasificar normalmente"
    - "si turno actual es follow-up defendible, puede usar parent_intent"
    - "unknown no debe caer automáticamente al Action Register"
    - "clarification del planner debe respetarse"

  prohibited:
    - "forzar todo unknown al parent_intent"
    - "heredar intent después de un topic switch explícito"
    - "usar history como evidencia factual"

entity_continuity:

  required_behavior:
    - "una sola active_entity"
    - "identidad física resuelta"
    - "scope de planta actual"
    - "revalidar cuando haga falta"

  example:
    first_turn: "¿Cómo va Puebla?"
    followup: "¿Y Arturo?"
    expected: >
      Resolver Arturo dentro de la planta actual; si es único, queda active_entity.
      Si es ambiguo o no existe, clarificar.

  prohibited:
    - "fuzzy match silencioso"
    - "reutilizar Arturo de otra planta"
    - "entity carry-over después de plant switch"

plant_switch:

  required:
    - "planta_id viene del request autorizado"
    - "si cambia planta, invalidar active_entities"
    - "invalidar pending_information_gap ligado a planta anterior"
    - "no reutilizar evidence refs anteriores"

  example:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora Querétaro."
      - "¿Y Arturo?"
    expected: >
      Arturo debe resolverse nuevamente en Querétaro o clarificarse; nunca
      reutilizar Arturo/Puebla silenciosamente.

evidence_policy:

  strategy: "requery_every_turn"

  rules:
    - "no reutilizar raw evidence bundle"
    - "no cachear evidencia conversacional"
    - "authz se revalida cada turno"
    - "source availability se revalida"
    - "SOURCE_RESTRICTED se preserva"
    - "freshness se obtiene del loader actual"
    - "history != evidence"

  rationale: >
    Mantener conversación natural sin degradar veracidad ni freshness.

history_policy:

  use_raw_history_as_evidence: false
  send_full_raw_history_to_openai: false

  allowed_use:
    - "extraer señal mínima para continuidad si es seguro"
    - "no tratar claims previos del user/assistant como hechos"

  rule: >
    El first slice no implementa selective-history-to-LLM como estrategia D.

pending_information_gap:

  purpose: >
    Permitir follow-ups sobre una brecha ya identificada sin perder el hilo.

  desired_behavior:
    sequence:
      - "¿Por qué dejó de comprar Arturo?"
      - "No hay evidencia suficiente..."
      - "¿Qué te falta?"
      - "¿Quién puede darnos eso?"
      - "¿Para qué lo necesitas?"

  rules:
    - "gap derivado de evidencia fresca"
    - "no inventar persona"
    - "solo nombrar responsable si hay vínculo físico"
    - "explicar qué análisis o decisión desbloquea el dato faltante"

  first_slice_limit: >
    Puede mantener y reutilizar una brecha dentro de la conversación activa.
    No persiste preguntas pendientes ni crea workflow.

openai_behavior:

  required:
    - "OpenAI recibe contexto suficiente del estado conversacional"
    - "no necesita todo el raw history"
    - "evidence factual proviene de requery"
    - "una respuesta previa del assistant no se promueve a hecho"
    - "seguir usando el razonamiento natural del modelo"

  goal: >
    GPT debe poder responder follow-ups naturales basándose en estado conversacional
    y evidencia fresca, no en reglas que preprogramen la conclusión.

security:

  invariants:
    - "history != evidence"
    - "assistant prior claim != fact"
    - "user prior claim != database fact"
    - "authz revalidated every turn"
    - "plant scope revalidated"
    - "active entity invalidated on plant switch"
    - "SOURCE_RESTRICTED preserved"
    - "no cross-plant leakage"
    - "no prompt injection from history promoted to system instruction"

master_conversation_acceptance:

  primary:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué te llama la atención?"
      - "¿Por qué?"
      - "¿Y Arturo?"
      - "¿Qué sabemos de él?"
      - "¿Tiene alguna acción?"
      - "¿Qué falta saber?"

    required:
      - "no perder parent_intent"
      - "no caer a unknown -> Action Register fallback"
      - "resolver entidad de forma segura"
      - "requery evidence en cada turno"
      - "mantener pending_information_gap si aparece"
      - "responder naturalmente"

  information_gap:
    turns:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Qué información te falta?"
      - "¿Quién puede darnos esa información?"
      - "¿Para qué la necesitas?"

    required:
      - "continuidad de gap"
      - "no inventar responsable"
      - "explicar finalidad del dato"

deferred:

  conversation_features:
    - "period continuity"
    - "¿Y ayer?"
    - "¿Y la semana anterior?"
    - "topic stack"
    - "volver a tema anterior"
    - "multiple active entities"
    - "cross-session memory"
    - "persistent memory"
    - "selective raw history to OpenAI"
    - "long-term conversational state"

  analytics:
    - "daily deviation engine"
    - "¿por qué bajó la venta ayer?"
    - "daily discount/kg decomposition"
    - "before-action-after"
    - "economic recovery trade-off"
    - "director agenda"

routing_preservation:
  must_preserve:
    - "plant_diagnosis"
    - "financial_diagnosis"
    - "commercial_state"
    - "dicf_focused"
    - "bitacora_lookup"
    - "igf_status"
    - "arr_status"
    - "M5"
    - "M6"
    - "M11"
    - "M12"
    - "M18"
    - "standalone queries"

tests_required:

  focal:
    - "state creation after canonical turn"
    - "parent_intent continuation"
    - "¿Qué te llama la atención?"
    - "¿Por qué?"
    - "¿Y Arturo?"
    - "entity unique"
    - "entity ambiguous -> clarification"
    - "¿Qué sabemos de él?"
    - "¿Tiene acción?"
    - "¿Qué falta saber?"
    - "pending_information_gap"
    - "¿Quién puede darnos eso?"
    - "no responsible -> do not invent"
    - "linked responsible -> may mention"
    - "plant switch invalidates entity"
    - "plant switch invalidates gap"
    - "no cross-plant leakage"
    - "requery each turn"
    - "authz revalidated"
    - "history not evidence"
    - "assistant claim not fact"
    - "SOURCE_RESTRICTED preserved"
    - "standalone query unchanged"
    - "unknown without valid state remains clarification/unknown"
    - "financial_diagnosis preserved"
    - "plant_diagnosis preserved"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "full Director IA suite"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-conversation-state.js"
    - "test/director-ia-conversational-continuity.test.js"

  conditional_writable:
    - "existing Director IA tests only if legitimate regression assertions require update"

  read_only:
    - "docs/director-ia/**"
    - "other lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "sql/**"

out_of_scope:
  - "matrix changes"
  - "contract changes"
  - "04 IES changes"
  - "05 Reasoning Engine changes"
  - "new DB tables"
  - "persistent memory"
  - "cross-session memory"
  - "raw history dump to OpenAI"
  - "evidence cache"
  - "period continuity"
  - "topic stack"
  - "writes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "structured_conversation_state implemented."
  - "state is ephemeral."
  - "parent_intent works for defensible follow-ups."
  - "planta_id comes from authorized request context."
  - "single active entity is safely resolved."
  - "plant switch invalidates entity/gap."
  - "pending_information_gap is evidence-derived."
  - "evidence is requeried every turn."
  - "history is not evidence."
  - "raw history is not blindly sent to OpenAI."
  - "unknown follow-ups no longer fall blindly to Action Register."
  - "master conversation materially improves."
  - "authz preserved."
  - "SOURCE_RESTRICTED preserved."
  - "no cross-plant leakage."
  - "standalone intents preserved."
  - "52.5% preserved."
  - "tests green."
  - "git diff --check clean."

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

next_task:
  propose_only: "DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001.md