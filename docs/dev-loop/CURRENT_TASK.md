# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la documentación con la estrategia B ya integrada
  para follow-ups naturales: unknown + contexto conversacional válido puede
  heredar parent_intent, hacer requery y llegar a GPT, sin ampliar phrasebook,
  sin reutilizar evidencia stale y sin modificar código, contratos o matriz.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "natural follow-up inheritance"
  strategy: "B — unknown + valid context -> inherit"

implemented_path: >
  turno actual
    → planner aislado
    → intent explícito reconocido? sí: standalone gana
    → no: unknown
    → structured_conversation_state válido?
    → parent_intent inheritable?
    → misma planta/scope?
    → sin topic/plant switch?
    → sin conflicto de entidad?
    → sí
    → heredar parent_intent
    → requery
    → HILO + evidencia fresca
    → GPT
    → respuesta natural

routing_rules:

  standalone_wins:
    - "presupuesto"
    - "Taller AT-15"
    - "planta nueva / Querétaro"
    - "venta ayer"
    - "IGF"
    - "acciones vencidas"
    - "otros intents standalone existentes"

  unknown_with_valid_context:
    behavior: "inherit_parent_intent"

  unknown_without_valid_context:
    behavior: "clarification"

  prohibited:
    - "fallback ciego a Action Register"
    - "fallback ciego a plant_diagnosis"

anti_phrasebook:

  document:
    - "no larger phrasebook"
    - "no synonym lists"
    - "no less-than-N-words heuristic"
    - "no anaphora score"
    - "no second LLM routing call"

  principle: >
    El follow-up funciona porque existe contexto válido, no porque su redacción
    exacta esté codificada.

entity_safety:

  demonstratives:
    examples:
      - "eso"
      - "esto"
      - "aquello"
    rule: "no son entidades comerciales"

  pronouns:
    rule: >
      él/ella/ese cliente solo pueden apoyarse en active_entity ya validada.

  named_entity:
    rule: >
      Nueva entidad nominal se resuelve físicamente en la planta actual.
      Única -> válida.
      Ambigua -> clarificación.
      Sin fuzzy silencioso.

  plant_switch:
    rule: >
      Cambio de planta invalida entidad y pending gap incompatibles.

evidence:

  strategy: "requery_every_turn"

  invariants:
    - "context inheritance != evidence reuse"
    - "history != evidence"
    - "assistant previous answer != fact"
    - "user previous statement != DB fact"
    - "authz actual"
    - "SOURCE_RESTRICTED actual"
    - "provenance actual"

GPT_boundary:

  runtime_provides:
    - "parent_intent"
    - "HILO"
    - "active_entity válida"
    - "active_date válida si aplica"
    - "pending_information_gap"
    - "fresh evidence"
    - "limitations"

  GPT_provides:
    - "interpretación del follow-up abierto"
    - "explicación"
    - "ampliación"
    - "consecuencia"
    - "qué más"
    - "wording de gaps"
    - "respuesta natural"

  principle: >
    El código protege contexto y verdad. GPT conserva el razonamiento
    conversacional.

generalization:

  documented_evidence:
    holdout_examples:
      - "No te seguí"
      - "¿En qué sentido?"
      - "¿O sea?"
      - "¿Me explicas mejor?"
      - "¿Qué otra cosa ves?"
      - "¿Y después?"

  rule: >
    Los hold-outs viven en tests y no forman parte del routing de producción.

  result: >
    La generalización depende del estado/contexto, no de conocer previamente
    la frase exacta.

conversation_examples:

  plant:
    - "¿Cómo va Puebla?"
    - "No te seguí"
    - "¿En qué sentido?"
    - "¿Qué otra cosa ves?"

  daily_sales:
    - "¿Por qué bajó la venta ayer?"
    - "¿O sea?"
    - "¿Qué otra cosa ves?"
    - "¿Y después?"

  expected:
    - "parent_intent preservado"
    - "requery"
    - "GPT invoked"
    - "sin respuesta enlatada"

preserved:
  - "plant_diagnosis"
  - "daily_sales_deviation"
  - "financial_diagnosis"
  - "commercial_state"
  - "expediente_comercial"
  - "M5"
  - "M6"
  - "M11"
  - "M12"
  - "M18"
  - "structured_conversation_state"
  - "pending_work_items_only"
  - "standalone intents"

deferred:
  - "Action Register / Julio Pérez routing"
  - "daily discount/kg"
  - "SQL 017 deployment in target environment"
  - "trade-off económico por cliente"
  - "cross-session period memory"
  - "topic stack"

deployment_note:
  persistent_memory_sql_017: >
    Repo implementado; activación en entorno sigue pendiente hasta confirmar
    aplicación operativa de SQL 017.

test_evidence:
  natural_followup: "pass"
  daily_deviation: "pass"
  conversational_continuity: "pass"
  persistent_memory: "pass"
  capabilities: "pass"
  planner: "pass"
  orchestrator: "pass"
  director_ia_suite: "795/795"
  git_diff_check: "clean"

module_state:
  changed_modules: "none"
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

product_principle_to_preserve: >
  La arquitectura proporciona a GPT datos, permisos, identidad, fechas,
  matemáticas, provenance, memoria y contexto confiables. No debe programar
  innecesariamente razonamientos o expresiones conversacionales que GPT ya
  puede resolver con ese contexto.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001.md"

  read_only:
    - "implementation already integrated"
    - "tests"
    - "contracts"
    - "sql"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL execution"
  - "daily discount implementation"
  - "Action Register Julio fix"
  - "matrix percentage changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy B documented."
  - "Unknown + valid context inheritance documented."
  - "Standalone precedence documented."
  - "Entity safety documented."
  - "Requery documented."
  - "GPT open interpretation documented."
  - "No larger phrasebook explicit."
  - "Hold-out generalization documented."
  - "No blind Action Register fallback documented."
  - "795/795 evidence recorded."
  - "No modules changed."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
  authorize: false
  execute: false

  rule: >
    Solo registrar NEXT_TASK. No abrir rama ni continuar después de esta sync.
    Este hito debe quedar disponible como checkpoint de descanso.

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001.md