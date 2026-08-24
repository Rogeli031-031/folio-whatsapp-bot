# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001
  y autorizo G1 exclusivamente para auditoría read-only.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "AUDIT_ONLY"
  code_changes: false
  runtime_changes: false
  contract_changes: false
  matrix_changes: false
  implementation: false

objective: >
  Auditar si la arquitectura actual de Director IA preserva y mejora el
  objetivo original del producto: permitir una conversación natural sobre
  la empresa con una IA que conoce los datos disponibles, mantiene el
  contexto relevante, razona con ellos y, cuando la evidencia no es
  suficiente, identifica qué información necesita para continuar sin
  inventarla.

central_product_test: >
  La arquitectura es infraestructura para Director IA; no debe sustituir
  innecesariamente con reglas determinísticas capacidades de razonamiento
  que el modelo ya puede realizar correctamente cuando recibe evidencia
  suficiente y confiable.

baseline:
  functional_coverage: "10.5 / 20 = 52.5%"
  rule: >
    52.5% mide cobertura funcional de la matriz. No representa porcentaje
    de inteligencia, calidad conversacional ni mejora respecto al Director
    IA legado.

audit_questions:

  legacy_vs_current:
    - >
      Identificar qué razonamientos ya podía realizar OpenAI con el contexto
      legado antes de los slices recientes.
    - >
      Identificar qué capacidades actuales son realmente nuevas por acceso,
      adquisición, autorización, joins, provenance o nuevas fuentes.
    - >
      Identificar qué lógica reciente únicamente vuelve determinístico,
      reproducible o verificable algo que OpenAI ya podía razonar.
    - >
      Detectar si alguna restricción actual reduce innecesariamente capacidad
      conversacional o analítica que existía antes.

  deterministic_vs_llm:
    classify_current_behavior_into:
      deterministic_should_own:
        - "adquisición de datos"
        - "authz"
        - "identidad y joins"
        - "unidades"
        - "periodos"
        - "cálculos exactos cuando sean requeridos"
        - "provenance"
        - "absence/error/restricted semantics"

      llm_should_be_evaluated_for:
        - "síntesis"
        - "relación entre evidencias"
        - "explicación"
        - "formulación de hipótesis claramente etiquetadas"
        - "preguntas de seguimiento"
        - "identificación de información faltante"
        - "conversación natural"

    audit_rule: >
      No asumir que toda lógica debe moverse al LLM ni que toda lógica debe
      codificarse. Determinar la frontera mínima que preserve verdad y
      aproveche el razonamiento del modelo.

  insufficient_information:
    required_behavior: >
      Cuando Director IA no pueda contestar con fundamento, auditar si puede
      avanzar desde "no tengo información suficiente" hacia una descripción
      concreta de la brecha.

    desired_structure:
      - "qué sí sabe"
      - "qué no sabe"
      - "qué información específica falta"
      - "por qué esa información es necesaria"
      - "qué fuente podría contenerla, si existe evidencia física"
      - "qué persona podría aportarla solo si existe vínculo físico"
      - "qué análisis o decisión podría continuar una vez obtenida"

    prohibitions:
      - "inventar causa"
      - "inventar responsable"
      - "inventar fuente"
      - "confundir comentario con hecho"
      - "confundir ausencia con cero"
      - "confundir SOURCE_RESTRICTED con DATA_NOT_FOUND"

  conversation_continuity:
    audit:
      - "seguimiento de entidad entre turnos"
      - "seguimiento de planta"
      - "seguimiento de periodo"
      - "seguimiento del problema discutido"
      - "pronombres/referencias como 'él', 'ese cliente', 'esa acción'"
      - "preguntas elípticas como '¿y Arturo?'"
      - "preguntas como '¿y tiene acción?'"
      - "preguntas como '¿qué falta saber?'"
      - "cambio de tema"
      - "capacidad de volver al tema anterior"

    rule: >
      Determinar físicamente qué continuidad existe hoy. No asumir memoria
      conversacional si el runtime no la implementa.

master_conversations:

  conversation_1:
    purpose: "diagnóstico comercial natural"
    turns:
      - "¿Cómo va Puebla?"
      - "¿Qué es lo que más te llama la atención?"
      - "¿Por qué?"
      - "¿Y Arturo?"
      - "¿Qué sabemos de él?"
      - "¿Tiene alguna acción?"
      - "¿Qué falta saber?"

  conversation_2:
    purpose: "información insuficiente"
    turns:
      - "¿Por qué dejó de comprar Arturo?"
      - "¿Estás seguro?"
      - "¿Qué información te falta?"
      - "¿Quién puede darnos esa información?"
      - "¿Para qué la necesitas?"

  conversation_3:
    purpose: "desviación diaria futura"
    turns:
      - "¿Por qué bajó la venta ayer?"
      - "¿Contra qué la estás comparando?"
      - "¿Qué clientes explican la diferencia?"
      - "¿Sabemos por qué compraron menos?"
      - "¿Qué falta investigar?"

    audit_rule: >
      No exigir que hoy pueda resolver esta conversación si las fuentes o
      granularidad no existen. Determinar exactamente dónde se rompe y qué
      capacidad falta.

  conversation_4:
    purpose: "descuento diario futuro"
    turns:
      - "¿Por qué subió el descuento por kg ayer?"
      - "¿Fue general o fueron algunos clientes?"
      - "¿Quién movió más el promedio?"
      - "¿Tenemos explicación?"
      - "¿Qué información falta?"

    audit_rule: >
      Distinguir capacidad matemática, evidencia disponible y causalidad.
      No diseñar todavía el motor.

  conversation_5:
    purpose: "acción y seguimiento"
    turns:
      - "¿Qué pasó con la acción de Julio Pérez?"
      - "¿Está vencida?"
      - "¿Por qué no se ha cerrado?"
      - "¿Sabemos el motivo?"
      - "Si no, ¿qué necesitas?"

required_findings:

  produce:
    - "capacidades que ya existían en el Director IA legado/OpenAI"
    - "capacidades nuevas reales construidas por la arquitectura"
    - "capacidades antiguas que pudieran haberse restringido"
    - "razonamientos posiblemente sobreprogramados"
    - "gaps reales de datos"
    - "gaps reales de conversación"
    - "gaps reales de razonamiento"
    - "gaps de información insuficiente/evidence-gap handling"
    - "gaps de seguimiento multi-turn"
    - "qué NO debemos construir porque el LLM ya puede hacerlo"
    - "qué SÍ debe seguir siendo determinístico"
    - "qué evidencia debe entregarse al LLM para aprovecharlo mejor"

required_classification:

  for_each_relevant_capability:
    classify_as_one_of:
      - "ALREADY_EXISTED"
      - "NEW_DATA_CAPABILITY"
      - "NEW_TRUST_CAPABILITY"
      - "NEW_REASONING_CAPABILITY"
      - "DETERMINIZED_EXISTING_REASONING"
      - "CURRENTLY_MISSING"
      - "POTENTIALLY_REGRESSED"
      - "UNKNOWN_REQUIRES_RUNTIME_TEST"

  rule: >
    No inflar avances. Si OpenAI ya podía hacerlo con el contexto anterior,
    clasificarlo como ALREADY_EXISTED o DETERMINIZED_EXISTING_REASONING según
    corresponda.

architecture_review:

  inspect_read_only:
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tool-orchestrator.js"
    - "lib/director-ia-plant-diagnosis.js"
    - "lib/director-ia-commercial-dossier.js if present"
    - "relevant Director IA loaders"
    - "relevant tests"
    - "system prompts used by chat"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
    - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md if present"
    - "docs/director-ia/04-IES-STANDARD.md"
    - "docs/director-ia/05-REASONING-ENGINE.md"

  rule: >
    04/05 y contratos son READ-ONLY. La auditoría puede señalar tensiones,
    pero no modificarlas.

important_non_goal: >
  No diseñar todavía la solución. Primero determinar con evidencia qué
  funciona, qué ya existía, qué falta y dónde se encuentra realmente el
  cuello de botella.

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001.md"

  read_only:
    - "repository except the two writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "new architecture"
  - "schema changes"
  - "new prompts"
  - "new intents"
  - "new tools"
  - "writes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Objetivo original evaluado explícitamente."
  - "Legacy vs current separado."
  - "No atribuir al proyecto capacidades nativas de OpenAI."
  - "Frontera determinístico/LLM auditada."
  - "Información insuficiente auditada."
  - "Continuidad multi-turn auditada físicamente."
  - "Las cinco conversaciones maestras evaluadas."
  - "Gaps localizados en código/fuente/runtime cuando sea posible."
  - "Posibles regresiones identificadas."
  - "Sobreprogramación identificada."
  - "No se diseña solución prematuramente."
  - "52.5% preservado."
  - "git diff --check limpio."
  - "solo dos archivos autorizados cambian."

next_task:
  propose_based_on_findings: true
  authorize: false
  execute: false
  rule: >
    Proponer exactamente UNA siguiente tarea basada en el cuello de botella
    demostrado por la auditoría. No asumir explanation_of_deviations,
    evidence_gap_closure ni otro módulo antes de auditar.

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001.md