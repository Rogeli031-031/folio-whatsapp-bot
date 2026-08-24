# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el mecanismo mínimo, seguro y compatible con la arquitectura vigente
  para que Director IA mantenga continuidad conversacional entre turnos:
  tema activo, intent padre, planta, periodo, entidades, evidencia/packs relevantes,
  preguntas pendientes y referencias elípticas, sin mandar indiscriminadamente
  todo el historial crudo al modelo, sin mezclar plantas/periodos y sin reutilizar
  evidencia obsoleta como si siguiera vigente.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001"
    finding: >
      24 de 26 turnos de las cinco conversaciones maestras caen en unknown;
      el frontend envía history, pero OpenAI recibe solo el mensaje actual.
      El planner reclasifica cada frase desde cero y los packs no se reutilizan.

central_problem: >
  Director IA conoce más datos, pero no conserva el hilo de la conversación.
  Preguntas como “¿Y Arturo?”, “¿Tiene acción?”, “¿Qué falta saber?” se tratan
  como preguntas aisladas y pierden el contexto del turno anterior.

primary_question: >
  ¿Qué estado conversacional mínimo debe conservarse y reutilizarse para que
  Director IA mantenga el hilo de una conversación natural sin sacrificar
  veracidad, authz, freshness, provenance ni control de contexto?

anti_solution:
  forbidden_shortcut: >
    No asumir que basta concatenar todo history y mandarlo a OpenAI.

  risks_to_audit:
    - "crecimiento descontrolado de tokens"
    - "instrucciones antiguas/contradictorias"
    - "contaminación entre plantas"
    - "contaminación entre periodos"
    - "reuso de evidencia obsoleta"
    - "entidades ambiguas heredadas"
    - "scope/authz antiguo reutilizado"
    - "prompt injection desde mensajes previos"
    - "confundir conversación con evidencia"

mandatory_runtime_audit:

  frontend:
    inspect:
      - "cómo se construye history"
      - "shape de history"
      - "cuántos turnos se envían"
      - "qué metadata acompaña"
      - "si se recorta"
      - "si existen ids de conversación"

  api_chat:
    inspect:
      - "qué recibe POST /chat"
      - "qué campos de history llegan"
      - "dónde se descartan"
      - "qué llega a askDirectorIa"

  askDirectorIa:
    inspect:
      - "routing"
      - "planner invocation"
      - "focused early returns"
      - "OpenAI messages"
      - "context_meta"
      - "plant/period/entity handling"

  planner:
    inspect:
      - "si acepta contexto previo"
      - "si puede resolver follow-up"
      - "unknown behavior"
      - "clarification behavior"
      - "entity references"
      - "intent inheritance"

  openai_call:
    inspect:
      - "messages actuales"
      - "system prompt"
      - "current user message"
      - "context injection"
      - "history omission"

conversation_state_hypothesis:
  audit_not_assume: true

  candidate_fields:
    - "active_topic"
    - "parent_intent"
    - "planta_id"
    - "period"
    - "period_a"
    - "period_b"
    - "active_entities"
    - "active_cliente_key"
    - "active_folio_id"
    - "active_action_id"
    - "active_revision_id"
    - "last_evidence_bundle_type"
    - "last_evidence_refs"
    - "last_known_limitations"
    - "pending_information_gap"
    - "pending_question"
    - "turn_id"
    - "timestamp"

  rule: >
    Determinar qué campos son realmente necesarios. No crear estado
    conversacional sobredimensionado.

continuity_types:
  audit:

    intent_continuation:
      examples:
        - "¿Qué te llama la atención?"
        - "¿Por qué?"
        - "¿Qué falta saber?"
      question: >
        ¿Debe heredar el intent padre cuando la frase aislada no es clasificable?

    entity_continuation:
      examples:
        - "¿Y Arturo?"
        - "¿Qué sabemos de él?"
        - "¿Tiene acción?"
      question: >
        ¿Cómo se hereda la entidad sin fuzzy match ni selección silenciosa?

    plant_continuation:
      examples:
        - "¿Cómo va Puebla?"
        - "¿Y ventas?"
      question: >
        ¿Cuándo puede heredarse planta_id y cuándo debe clarificarse?

    period_continuation:
      examples:
        - "¿Y ayer?"
        - "¿Comparado contra qué?"
      question: >
        ¿Cuándo heredar periodo y cuándo una expresión temporal cambia el scope?

    evidence_continuation:
      examples:
        - "¿Por qué?"
        - "¿Y qué dice la acción?"
      question: >
        ¿Se reutiliza evidencia anterior, se vuelve a consultar o se rehidrata
        bajo freshness/authz?

    topic_switch:
      examples:
        - "Ahora dime Querétaro"
        - "Cambiando de tema, ¿cómo va el presupuesto?"
      question: >
        ¿Cómo se invalida el estado anterior de forma explícita?

inheritance_rules_to_determine:

  must_not_inherit_blindly:
    - "planta"
    - "periodo"
    - "entidad"
    - "evidence payload"
    - "authz result"
    - "source availability"

  safe_inheritance_candidate:
    - "topic label"
    - "parent intent"
    - "entity identity if uniquely resolved and still in scope"
    - "pending question"
    - "last selected plant if explicitly established"

  rule: >
    La readiness debe definir qué hereda, bajo qué condición, cuánto dura y
    qué obliga a revalidar.

evidence_reuse:

  primary_question: >
    ¿Debe reutilizarse el pack anterior o reconstruirse en cada follow-up?

  audit:
    - "coste de loaders"
    - "freshness"
    - "side effects"
    - "authz"
    - "source volatility"
    - "planta/periodo"
    - "payload size"
    - "provenance"

  candidate_strategies:
    a_requery_every_turn:
      pros:
        - "freshness"
        - "authz rechecked"
      cons:
        - "coste"
        - "latencia"

    b_reuse_raw_bundle:
      risks:
        - "stale evidence"
        - "scope leak"

    c_reuse_references_and_rehydrate:
      hypothesis: >
        Conservar ids/contexto y volver a cargar solo lo necesario.

  requirement: >
    Seleccionar estrategia mínima defendible. No asumir cache conversacional.

history_policy:

  audit:
    - "raw history usefulness"
    - "turn limit"
    - "token budget"
    - "summarization"
    - "role preservation"
    - "sensitive data"
    - "system/user separation"

  desired_outcome: >
    Determinar si OpenAI debe recibir:
    a) history filtrado,
    b) estado conversacional estructurado,
    c) ambos,
    d) ninguno y resolver todo deterministicamente.

  rule: >
    Priorizar conversación natural sin permitir que history reemplace
    provenance/evidence.

information_gap_continuity:

  required_case:
    turns:
      - "¿Por qué dejó de comprar Arturo?"
      - "No hay evidencia suficiente."
      - "¿Qué te falta?"
      - "¿Quién puede darnos eso?"
      - "¿Para qué lo necesitas?"

  audit:
    - "cómo mantener pending_information_gap"
    - "cómo responder 'qué falta' sin recalcular desde cero"
    - "cómo nombrar persona solo si existe vínculo físico"
    - "cómo conservar por qué ese dato desbloquea el análisis"

master_conversations:

  conversation_1:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué te llama la atención?"
      - "¿Por qué?"
      - "¿Y Arturo?"
      - "¿Qué sabemos de él?"
      - "¿Tiene alguna acción?"
      - "¿Qué falta saber?"

  conversation_2:
    turns:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Estás seguro?"
      - "¿Qué información te falta?"
      - "¿Quién puede darnos esa información?"
      - "¿Para qué la necesitas?"

  conversation_3:
    turns:
      - "¿Cómo va Puebla?"
      - "Ahora Querétaro."
      - "¿Y Arturo?"
    required_finding: >
      Determinar si Arturo debe considerarse en Querétaro o si la entidad previa
      debe invalidarse/clarificarse.

  conversation_4:
    turns:
      - "¿Cómo va el presupuesto esta semana?"
      - "¿Y la anterior?"
      - "Volvamos a Puebla."
    required_finding: >
      Auditar herencia de periodo, topic switch y recuperación de tema.

  conversation_5:
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué falta saber?"
      - "Cambiando de tema, ¿qué tiene Taller AT-15?"
      - "Volviendo a lo anterior, ¿quién debe responder?"
    required_finding: >
      Determinar si soportar regreso a tema anterior requiere stack de temas o
      si debe quedar fuera del first slice.

security_and_truth:

  required:
    - "history != evidence"
    - "assistant prior claim != fact"
    - "user prior claim != database fact"
    - "authz revalidated"
    - "plant scope revalidated"
    - "entity identity revalidated when needed"
    - "source freshness preserved"
    - "prompt injection from history mitigated"
    - "no data from previous unauthorized plant"

  crucial_rule: >
    Un mensaje anterior puede proporcionar contexto conversacional, pero no
    debe convertirse automáticamente en evidencia factual.

first_slice_candidates:

  candidate_a:
    name: "parent_intent_plus_entity_continuity"
    includes:
      - "parent intent"
      - "planta"
      - "single active entity"
      - "follow-up routing"

  candidate_b:
    name: "filtered_history_to_llm"
    includes:
      - "últimos N turnos"
      - "sin estado estructurado"

  candidate_c:
    name: "structured_conversation_state"
    includes:
      - "topic"
      - "intent"
      - "plant"
      - "period"
      - "entities"
      - "pending gap"

  candidate_d:
    name: "conversation_state_plus_selective_history"
    includes:
      - "structured state"
      - "small filtered turn window"

  requirement:
    - "comparar al menos A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "justificar por conversación natural + seguridad + simplicidad"
    - "no elegir por facilidad sola"

contract_audit:
  inspect:
    - "Constitution"
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"
    - "EKE"
    - "chat legacy contracts"

  determine:
    - "si conversational state requiere G2"
    - "si requiere G3"
    - "si es runtime-only"
    - "si history afecta boundaries"

  rule: >
    No modificar contratos en readiness.

tests_to_design_if_ready:
  - "¿Cómo va Puebla? -> follow-up ¿Por qué?"
  - "¿Y Arturo?"
  - "¿Qué sabemos de él?"
  - "¿Tiene acción?"
  - "¿Qué falta saber?"
  - "pronoun resolution"
  - "entity ambiguity -> clarify"
  - "plant switch"
  - "period switch"
  - "topic switch"
  - "no cross-plant leakage"
  - "history is not evidence"
  - "prior assistant claim not fact"
  - "authz revalidated"
  - "SOURCE_RESTRICTED preserved"
  - "partial failure preserved"
  - "token limit"
  - "conversation reset"
  - "legacy standalone queries preserved"
  - "financial_diagnosis preserved"
  - "plant_diagnosis preserved"

readiness_output:
  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "exact first slice"
    - "state fields"
    - "inheritance rules"
    - "revalidation rules"
    - "history policy"
    - "evidence reuse strategy"
    - "topic switch behavior"
    - "entity switch behavior"
    - "information-gap continuity"
    - "security boundaries"
    - "G2"
    - "G3"
    - "percentage effect"
    - "deferred capabilities"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp"
  rule: "Conversational continuity is not module coverage."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "new DB tables"
  - "persistent long-term memory"
  - "cross-session memory"
  - "writes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "24/26 failure cause traced physically."
  - "Frontend history path audited."
  - "History discard point identified."
  - "Planner follow-up behavior audited."
  - "Minimum conversational state determined."
  - "Inheritance rules determined."
  - "Authz/freshness revalidation determined."
  - "History != evidence preserved."
  - "Information-gap continuity audited."
  - "Master conversations evaluated."
  - "A/B/C/D first slices compared."
  - "Exactly one first slice selected."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "No implementation."
  - "Only CURRENT_TASK and report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001"
  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-GAP-001"
  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS with one implementable slice.
  STOPPED if contract/architecture decision is required first.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001.md