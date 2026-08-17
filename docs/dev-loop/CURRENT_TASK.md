# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-REASONING-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T11:28:14-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y registrar las decisiones físicas mínimas que bloquean
  IMPL-REASONING-001, detectadas por
  ARCH-REASONING-PHYSICAL-DECISIONS-001: interfaz del Reasoning Engine,
  frontera/adaptador de proveedor LLM, envolvente física del Reasoning Result,
  validación determinística post-model y mecanismo fail-closed de
  hypothesis_strength. Registrar únicamente las decisiones humanas aprobadas,
  sin implementar runtime, sin integrar proveedor real y sin modificar N1-N4.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "fixtures/director-ia/ies/ (solo lectura)"

out_of_scope:
  - "implementar Reasoning Engine"
  - "crear lib/director-ia-reasoning-engine.js"
  - "crear adapter LLM"
  - "crear prompts productivos"
  - "llamar OpenAI u otro proveedor"
  - "crear tests RE"
  - "crear fixtures RE"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 06-CHANNEL-PROJECTION.md"
  - "modificar Architecture Index"

  - "modificar IES Builder"
  - "modificar OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"

  - "crear persistencia Reasoning Run"
  - "crear SQL/migraciones/tablas"
  - "definir retention"

  - "crear tools"
  - "permitir tool calls al modelo"
  - "consultar DB/fuentes operacionales"
  - "usar conocimiento externo del modelo como verdad empresarial"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar materiality"
  - "crear probability scoring"
  - "crear confidence scoring N5"
  - "crear causalidad N1-N4"

  - "implementar Channel Projection"
  - "integrar chat/voz/WhatsApp/dashboard"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-REASONING-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
  implementation_status: "NO-GO"
  blockers:
    - "interfaz física del Reasoning Engine"
    - "adapter/proveedor LLM"
    - "envolvente física del Reasoning Result"
    - "validación determinística post-model"
    - "mecanismo de hypothesis_strength"
  runtime_reality:
    - "IES Builder OFFICIAL in-memory existe"
    - "IES runtime actual produce estados consumibles por RE"
    - "EB actual mantiene evidence[] y diagnoses[] vacíos sin reglas autorizadas"
    - "sin supporting_evidence_ids no pueden emitirse hipótesis sustantivas"
    - "runtime inicial RE debe ser capaz de abstenerse completamente"

proposed_human_decisions:

  D1_runtime_interface:
    decision: "REASONING_ENGINE_FACTORY_V1"
    meaning: >
      Reasoning Engine se realiza como factory inyectable y testeable.
      Interfaz futura mínima:
      createReasoningEngine({ modelAdapter, clock, idFactory, policy })
      y reason(ies, session).
      El IES es la única entrada de conocimiento. session contiene únicamente
      parámetros no epistemológicos permitidos por 05.

    session_shape:
      fields:
        - "analysis_mode"
        - "canonical_reasoning_language"
        - "channel_hint"
        - "maximum_semantic_depth"
      rules:
        - "session no modifica el IES"
        - "session no transporta hechos empresariales"
        - "session no transporta fuentes/tools"
        - "canonical_reasoning_language default institucional = es-MX"

  D2_model_adapter:
    decision: "PROVIDER_NEUTRAL_MODEL_ADAPTER_V1"
    meaning: >
      El runtime RE depende de un modelAdapter inyectado y neutral respecto del
      proveedor. El contrato semántico RE no menciona OpenAI, Anthropic u otro
      proveedor concreto.

    interface:
      operation: "infer(request)"
      input:
        - "reasoning_context derivado exclusivamente del IES"
        - "session"
        - "output_schema_version"
      output:
        - "candidate_reasoning_result"
        - "provider_metadata"
      provider_metadata:
        - "provider"
        - "model"
        - "model_version si está disponible"
        - "request_id si está disponible"
      constraints:
        - "sin tool calls"
        - "sin DB"
        - "sin fuentes operacionales"
        - "sin mutación IES"
        - "respuesta del modelo es candidata, nunca verdad automáticamente"
        - "errores/timeout producen abstention/error controlado, no hechos"

  D3_reasoning_result_envelope:
    decision: "STRUCTURED_REASONING_RESULT_V1"
    meaning: >
      La salida del RE es un objeto estructurado conforme a 05, validable antes
      de exposición o materialización como Reasoning Run.

    root_fields:
      - "interpretation"
      - "hypotheses"
      - "recommendations"
      - "next_verifications"
      - "decision_options"
      - "abstentions"
      - "clarification_requests"
      - "reasoning_limits"
      - "references"

    rules:
      - "arrays siempre presentes aunque vacíos"
      - "references solo contiene IDs existentes del IES"
      - "ningún objeto de salida crea N1-N4"
      - "ningún objeto de salida modifica IES"
      - "sin campos probability/confidence/materiality N5 inventados"

  D4_interpretation_shape:
    decision: "THREE_PART_INTERPRETATION_V1"
    meaning: >
      INTERPRETATION se representa de manera estructurada, no como bloque
      narrativo sin frontera.

    fields:
      what_is_known:
        meaning: "referencias fieles a facts/evidence/diagnoses/conflicts del IES"
      what_can_be_inferred:
        meaning: "referencias a hypotheses[] emitidas por el mismo Result"
      what_cannot_be_concluded:
        meaning: "limitaciones, abstenciones y open questions ancladas al IES"

    constraints:
      - "no agrega hechos"
      - "no eleva materiality"
      - "no resuelve conflictos"
      - "no rellena NO_KNOWLEDGE"
      - "texto semántico permitido solo como explicación N5 claramente separada"

  D5_post_model_validation:
    decision: "DETERMINISTIC_POST_VALIDATION_REQUIRED"
    meaning: >
      Toda salida candidata del modelo debe pasar validación determinística
      antes de ser aceptada como Reasoning Result.

    validations:
      - "ies_id coincide con IES ancla donde aplique"
      - "ies_version coincide"
      - "todos supporting_fact_ids existen"
      - "todos supporting_evidence_ids existen"
      - "todos supporting_diagnosis_ids existen"
      - "todos conflict_ids existen"
      - "todos open_question_ids existen"
      - "references contiene únicamente IDs existentes"
      - "hypothesis_strength pertenece al enum autorizado"
      - "statement_language coincide con política/session"
      - "validity_scope no excede alcance IES"
      - "materiality no se crea ni modifica"
      - "resolution_status no se cambia"
      - "Tipo E no se omite cuando es relevante"
      - "NO_KNOWLEDGE no contiene hipótesis sustantivas"
      - "Recommendation no se acepta sin soporte"
      - "Decision Option no se presenta como decisión ejecutada"

    invalid_candidate_behavior:
      decision: "REJECT_OR_ABSTAIN"
      meaning: >
        Una salida candidata inválida no se corrige inventando soporte.
        Se rechaza o se convierte en resultado fail-closed de abstención
        controlada.

  D6_hypothesis_strength:
    decision: "MODEL_PROPOSES_VALIDATOR_BOUNDS_V1"
    meaning: >
      El modelo puede proponer WEAK/MODERATE/STRONG, pero el runtime
      determinístico solo valida límites y puede degradar o rechazar cuando
      condiciones contractuales objetivas impiden el nivel propuesto.
      No existe score numérico ni fórmula probability/confidence/materiality.

    enum:
      - "HYP_STRENGTH_WEAK"
      - "HYP_STRENGTH_MODERATE"
      - "HYP_STRENGTH_STRONG"

    hard_bounds:
      - "sin supporting_evidence_ids -> no hypothesis"
      - "sin supporting_fact_ids -> no hypothesis"
      - "conflicto adverso material al claim impide STRONG"
      - "limitación bloqueante impide STRONG"
      - "scope incompleto relevante impide STRONG"
      - "NO_KNOWLEDGE -> no hypothesis"
      - "strength nunca se transforma en porcentaje"
      - "strength nunca deriva de confidence/materiality/severity"

    no_ranking_rule:
      - "strength no ordena automáticamente hypotheses rivales"
      - "is_primary_candidate=false por defecto sin base contractual de orden"

  D7_rival_hypotheses:
    decision: "RIVAL_GROUP_WITHOUT_AUTORANK_V1"
    meaning: >
      Hipótesis rivales pueden compartir rival_group_id. El runtime no crea
      ranking automático ni selecciona primary candidate sin base explícita.

  D8_abstention:
    decision: "DETERMINISTIC_ABSTENTION_GATE_V1"
    meaning: >
      Antes de invocar modelo y después de validar su resultado existe gate
      determinístico de abstención.

    mandatory_abstention_conditions:
      - "IES status NO_KNOWLEDGE para hipótesis sustantivas"
      - "no supporting evidence disponible para claim"
      - "limitación bloqueante incompatible con claim"
      - "ENTITY_UNRESOLVED cuando claim requiere entidad canónica"
      - "QUERY_SCOPE_INCOMPLETE cuando claim requiere alcance faltante"
      - "candidate output inválido sin corrección segura"

    lifecycle_rejection:
      - "BUILDING"
      - "EXPIRED"
      - "SUPERSEDED"
      - "INVALID"

    lifecycle_consumable:
      - "VALIDATED"
      - "PARTIAL"
      - "CONFLICTED"
      - "NO_KNOWLEDGE"

  D9_recommendation:
    decision: "SUPPORTED_CONDITIONAL_RECOMMENDATION_V1"
    meaning: >
      Recommendation es acción de negocio condicionada, nunca hecho ni mandato
      automático. Debe citar soporte IES y las hipótesis/diagnósticos que la
      motivan cuando existan.

    minimum_fields:
      - "recommendation_id"
      - "statement"
      - "statement_language"
      - "supporting_fact_ids"
      - "supporting_evidence_ids"
      - "supporting_hypothesis_ids"
      - "conditions"
      - "limitations"
      - "ies_id"
      - "ies_version"

    fail_closed:
      - "sin evidence suficiente -> no recommendation sustantiva"
      - "NO_KNOWLEDGE -> no recommendation sustantiva"

  D10_next_verification:
    decision: "EPISTEMIC_ACTION_ONLY_V1"
    meaning: >
      Next Verification describe qué información debe verificarse después.
      RE no ejecuta la acción ni invoca tools.

    minimum_fields:
      - "verification_id"
      - "question_or_check"
      - "reason"
      - "required_data"
      - "expected_source_if_known"
      - "related_ies_ids"
      - "related_open_question_ids"
      - "priority"

  D11_decision_option:
    decision: "NON_EXECUTED_DECISION_OPTION_V1"
    meaning: >
      Decision Option es alternativa estructurada para decisión humana.
      Nunca indica que la decisión ya fue tomada.

    minimum_fields:
      - "decision_option_id"
      - "statement"
      - "conditions"
      - "expected_tradeoffs"
      - "supporting_references"
      - "limitations"
      - "execution_status"

    execution_status:
      value: "NOT_EXECUTED"

  D12_clarification_request:
    decision: "IES_ANCHORED_CLARIFICATION_V1"
    meaning: >
      Clarification Request solo pide resolver ambigüedad/alcanze que el IES
      declara. No inventa entidad ni hechos.

    minimum_fields:
      - "clarification_id"
      - "question"
      - "reason"
      - "related_open_question_ids"
      - "related_limitation_ids"
      - "related_unresolved_entities"

  D13_reasoning_run:
    decision: "IN_MEMORY_REASONING_RUN_FIRST"
    meaning: >
      IMPL-REASONING-001 puede producir Reasoning Run in-memory como artefacto
      de auditoría de la inferencia, sin persistencia durable.

    minimum_fields:
      - "run_id"
      - "ies_id"
      - "ies_version"
      - "started_at"
      - "completed_at"
      - "status"
      - "session"
      - "provider_metadata"
      - "reasoning_result"
      - "validation_result"
      - "audit"

    constraints:
      - "append-only conceptual"
      - "no escribe EKS"
      - "no escribe IES"
      - "persistencia durable requiere tarea separada"
      - "provider/model metadata es auditoría, no epistemología"

  D14_replay_auditability:
    decision: "AUDITABLE_NOT_BITWISE_REPLAY_V1"
    meaning: >
      El runtime registra suficiente metadata para auditar qué IES, sesión,
      adapter/proveedor y resultado participaron. No promete que una segunda
      llamada LLM produzca bytes idénticos.

    required_audit:
      - "ies_id/version"
      - "session"
      - "provider/model metadata"
      - "output schema version"
      - "timestamps"
      - "validation outcome"
      - "references utilizadas"

  D15_provider_failure:
    decision: "PROVIDER_FAILURE_FAIL_CLOSED_V1"
    meaning: >
      Timeout/error/malformed output del provider produce Reasoning Result o Run
      controlado con abstention/error metadata, sin hipótesis ni recommendations
      inventadas.

  D16_first_runtime_scope:
    decision: "ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1"
    meaning: >
      IMPL-REASONING-001 inicial debe funcionar completamente con adapter fake
      inyectado en tests y ser capaz de ejecutar gates/validación/abstención.
      No requiere proveedor real productivo.

    implementation_rule:
      - "fixtures IES existentes pueden alimentar tests"
      - "provider fake determinístico para tests"
      - "sin networking"
      - "sin API keys"
      - "sin package dependency nueva si no es necesaria"
      - "integration real con proveedor = tarea posterior"

important_current_runtime_constraint:
  statement: >
    Mientras el Evidence Builder real no produzca evidence[] con reglas
    autorizadas, IMPL-REASONING-001 debe demostrar correctamente que cero
    supporting_evidence implica cero hipótesis sustantivas y cero
    recommendations sustantivas.
  consequence: >
    Esto no bloquea implementar el runtime de gates, adapter, validación y
    abstention, pero bloquea demostrar razonamiento N5 sustantivo con el flujo
    productivo actual.

human_approval_scope:
  approve_exactly:
    - "D1_runtime_interface"
    - "D2_model_adapter"
    - "D3_reasoning_result_envelope"
    - "D4_interpretation_shape"
    - "D5_post_model_validation"
    - "D6_hypothesis_strength"
    - "D7_rival_hypotheses"
    - "D8_abstention"
    - "D9_recommendation"
    - "D10_next_verification"
    - "D11_decision_option"
    - "D12_clarification_request"
    - "D13_reasoning_run"
    - "D14_replay_auditability"
    - "D15_provider_failure"
    - "D16_first_runtime_scope"

g2_contract_changes_authorized_if_approved:
  docs/director-ia/05-REASONING-ENGINE.md:
    allowed:
      - "registrar realización física D1-D16"
      - "registrar interfaz futura del runtime"
      - "registrar adapter neutral de provider"
      - "registrar Reasoning Result envelope"
      - "registrar deterministic post-validation"
      - "registrar hypothesis_strength fail-closed"
      - "registrar abstention gate"
      - "registrar Reasoning Run in-memory readiness"
      - "registrar auditability sin prometer replay absoluto"

    forbidden:
      - "cambiar cinco niveles constitucionales"
      - "cambiar IES"
      - "crear N6"
      - "convertir hipótesis en hechos"
      - "permitir tools/DB/fuentes"
      - "crear materiality/confidence/probability nuevas"
      - "cambiar taxonomía de conflictos"
      - "cambiar coverage"
      - "diseñar Channel Projection"
      - "autorizar proveedor específico como norma"

g8_reserved_and_unchanged:
  - "wi"
  - "k"
  - "Fs"
  - "materiality ruleset"
  - "severity productiva"
  - "causal rules N1-N4"
  - "probability scoring"

required_report:
  - "decisiones D1-D16 registradas"
  - "diff contractual exacto"
  - "confirmación N1-N4 intactos"
  - "confirmación IES intacto"
  - "confirmación provider-neutral"
  - "post-validation final"
  - "abstention gates final"
  - "hypothesis_strength bounds final"
  - "Reasoning Run readiness"
  - "gaps aún diferidos"
  - "GO/NO-GO para IMPL-REASONING-001"

acceptance_criteria:
  - "interfaz RE queda físicamente definida"
  - "adapter provider-neutral queda definido"
  - "Reasoning Result queda físicamente definido"
  - "post-validation queda obligatoria"
  - "hypothesis_strength no usa scores/probabilities"
  - "NO_KNOWLEDGE no genera hipótesis"
  - "sin evidence no hay hypothesis sustantiva"
  - "sin evidence no hay recommendation sustantiva"
  - "rival hypotheses no se auto-rankean"
  - "Recommendation/Verification/Decision Option permanecen separados"
  - "Reasoning Run inicial puede ser in-memory"
  - "persistencia Run permanece diferida"
  - "provider failure es fail-closed"
  - "provider real permanece fuera"
  - "05 es el único contrato modificable"
  - "04 no se modifica"
  - "06 no se modifica"
  - "N1-N4 no cambian"
  - "sin G8"
  - "sin runtime RE"
  - "sin tests/fixtures RE"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"
  - "IMPL-REASONING-001 no se crea"

allowed_actions:
  - "leer contracts_in_force"
  - "leer ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
  - "comparar decisiones propuestas con contratos superiores"
  - "si G1+G2 autorizados, modificar únicamente 05-REASONING-ENGINE.md"
  - "crear docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-002.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar contratos fuera de 05"
  - "implementar runtime RE"
  - "crear adapter"
  - "crear prompts"
  - "crear tests/fixtures RE"
  - "integrar proveedor real"
  - "usar network/API"
  - "modificar IES Builder"
  - "modificar OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "crear SQL/migraciones"
  - "calibrar G8"
  - "autoaprobar G1/G2"
  - "crear IMPL-REASONING-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si las decisiones humanas D1-D16 pueden registrarse en
  05 sin contradicción constitucional ni ampliación de N1-N4.
  BLOCKED o STOPPED si alguna decisión exige cambiar Constitución, IES,
  cobertura, materiality o Channel Projection.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-002.md"