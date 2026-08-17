# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-REASONING-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T11:46:17-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el runtime mínimo, provider-neutral, testeable y fail-closed del
  Reasoning Engine Nivel 5 conforme a docs/director-ia/05-REASONING-ENGINE.md
  v1.0 y a las decisiones físicas D1-D16 registradas por
  ARCH-REASONING-PHYSICAL-DECISIONS-002. La primera implementación debe operar
  únicamente con IES in-memory, modelAdapter inyectable/fake en tests,
  post-validación determinística, abstention gates y Reasoning Run in-memory,
  sin proveedor real, networking, tools, DB ni persistencia durable.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-REASONING-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-reasoning-engine.js"
  - "test/director-ia-reasoning-engine.test.js"
  - "fixtures/director-ia/reasoning/"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "fixtures/director-ia/ies/ (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"

  - "test/director-ia-observation-pipeline.test.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar IES Builder"
  - "modificar OP"
  - "modificar EB"
  - "modificar EKS"
  - "modificar integración OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"

  - "integrar proveedor LLM real"
  - "hacer llamadas OpenAI/Anthropic/u otro proveedor"
  - "usar networking"
  - "usar API keys"
  - "crear prompts productivos específicos de proveedor"
  - "habilitar tool-calling"
  - "consultar DB"
  - "consultar fuentes operacionales"

  - "crear persistencia durable de Reasoning Run"
  - "crear SQL/migraciones/tablas"
  - "definir retention"

  - "implementar Channel Projection"
  - "integrar chat"
  - "integrar voz"
  - "integrar WhatsApp"
  - "integrar dashboard"

  - "crear o modificar N1-N4"
  - "recalcular coverage"
  - "recalcular confidence"
  - "recalcular materiality"
  - "resolver conflictos"
  - "inventar probability scoring"
  - "inventar ranking de hipótesis"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar severity"
  - "crear materiality ruleset"
  - "crear reglas causales N1-N4"

  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

approved_physical_decisions:
  runtime_interface: "REASONING_ENGINE_FACTORY_V1"
  model_adapter: "PROVIDER_NEUTRAL_MODEL_ADAPTER_V1"
  result_envelope: "STRUCTURED_REASONING_RESULT_V1"
  interpretation: "THREE_PART_INTERPRETATION_V1"
  post_validation: "DETERMINISTIC_POST_VALIDATION_REQUIRED"
  hypothesis_strength: "MODEL_PROPOSES_VALIDATOR_BOUNDS_V1"
  rivals: "RIVAL_GROUP_WITHOUT_AUTORANK_V1"
  abstention: "DETERMINISTIC_ABSTENTION_GATE_V1"
  recommendation: "SUPPORTED_CONDITIONAL_RECOMMENDATION_V1"
  next_verification: "EPISTEMIC_ACTION_ONLY_V1"
  decision_option: "NON_EXECUTED_DECISION_OPTION_V1"
  clarification: "IES_ANCHORED_CLARIFICATION_V1"
  reasoning_run: "IN_MEMORY_REASONING_RUN_FIRST"
  replay: "AUDITABLE_NOT_BITWISE_REPLAY_V1"
  provider_failure: "PROVIDER_FAILURE_FAIL_CLOSED_V1"
  first_runtime_scope: "ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1"

required_runtime_interface:
  factory: "createReasoningEngine({ modelAdapter, clock, idFactory, policy })"
  primary_operation: "reason(ies, session)"
  output:
    reasoning_result: "Structured Reasoning Result v1"
    reasoning_run: "Reasoning Run in-memory"

session_shape:
  fields:
    - "analysis_mode"
    - "canonical_reasoning_language"
    - "channel_hint"
    - "maximum_semantic_depth"
  defaults:
    canonical_reasoning_language: "es-MX"
  rules:
    - "session no altera IES"
    - "session no contiene hechos empresariales"
    - "session no contiene tools/fuentes"
    - "session no autoriza bypass del IES"

ies_gate:
  consumable:
    - "VALIDATED"
    - "PARTIAL"
    - "CONFLICTED"
    - "NO_KNOWLEDGE"
  reject:
    - "BUILDING"
    - "EXPIRED"
    - "SUPERSEDED"
    - "INVALID"

model_adapter_interface:
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
    - "model_version"
    - "request_id"
  constraints:
    - "sin tool calls"
    - "sin DB"
    - "sin fuentes operacionales"
    - "sin mutación IES"
    - "candidate output no es verdad automática"

reasoning_result_root:
  required_fields:
    - "interpretation"
    - "hypotheses"
    - "recommendations"
    - "next_verifications"
    - "decision_options"
    - "abstentions"
    - "clarification_requests"
    - "reasoning_limits"
    - "references"
  list_rules:
    - "hypotheses siempre array"
    - "recommendations siempre array"
    - "next_verifications siempre array"
    - "decision_options siempre array"
    - "abstentions siempre array"
    - "clarification_requests siempre array"

interpretation_shape:
  required_fields:
    - "what_is_known"
    - "what_can_be_inferred"
    - "what_cannot_be_concluded"
  rules:
    - "known solo referencia IES"
    - "inferred referencia hypotheses del mismo result"
    - "not_concluded referencia limits/abstentions/open questions"
    - "no crea N1-N4"
    - "no resuelve conflictos"
    - "no eleva materiality"

hypothesis_contract:
  required_fields:
    - "hypothesis_id"
    - "ies_id"
    - "ies_version"
    - "statement"
    - "statement_language"
    - "supporting_fact_ids"
    - "supporting_evidence_ids"
    - "limitations"
    - "validity_scope"
    - "hypothesis_strength"
  optional_fields:
    - "supporting_diagnosis_ids"
    - "conflict_ids"
    - "conflicting_evidence_ids"
    - "open_question_ids"
    - "rival_group_id"
    - "is_primary_candidate"

hypothesis_strength_enum:
  - "HYP_STRENGTH_WEAK"
  - "HYP_STRENGTH_MODERATE"
  - "HYP_STRENGTH_STRONG"

hypothesis_strength_rules:
  - "modelo puede proponer strength"
  - "runtime valida hard bounds"
  - "sin supporting_evidence_ids -> no hypothesis"
  - "sin supporting_fact_ids -> no hypothesis"
  - "NO_KNOWLEDGE -> no hypothesis"
  - "blocking limitation -> STRONG no permitido"
  - "adverse conflict -> STRONG no permitido"
  - "relevant incomplete scope -> STRONG no permitido"
  - "strength nunca porcentaje"
  - "strength no deriva de confidence/materiality/severity"
  - "strength no auto-rankea hipótesis rivales"
  - "is_primary_candidate false por defecto sin base de orden"

post_model_validation:
  required:
    - "ies_id/version exactos"
    - "supporting_fact_ids existen"
    - "supporting_evidence_ids existen"
    - "supporting_diagnosis_ids existen"
    - "conflict_ids existen"
    - "open_question_ids existen"
    - "references solo IDs existentes"
    - "hypothesis_strength enum válido"
    - "statement_language válido"
    - "validity_scope no excede IES"
    - "materiality no se crea/modifica"
    - "resolution_status no cambia"
    - "Tipo E no se omite cuando aplique"
    - "NO_KNOWLEDGE no contiene hipótesis"
    - "recommendations requieren soporte"
    - "decision options no aparecen ejecutadas"

invalid_candidate_behavior:
  - "REJECT"
  - "ABSTAIN"
  rule: "no corregir inventando soporte"

abstention_gate:
  pre_model:
    - "status no consumible -> reject sin model call"
    - "NO_KNOWLEDGE -> no hypothesis/recommendation sustantiva"
    - "sin evidence disponible -> no hypothesis/recommendation sustantiva"
  post_model:
    - "candidate inválido -> reject/abstain"
    - "claim con entity unresolved requerida -> abstain"
    - "claim con query scope faltante requerido -> abstain"
    - "claim bloqueado por limitation -> abstain"

recommendation_contract:
  required_fields:
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

next_verification_contract:
  required_fields:
    - "verification_id"
    - "question_or_check"
    - "reason"
    - "required_data"
    - "expected_source_if_known"
    - "related_ies_ids"
    - "related_open_question_ids"
    - "priority"
  rule: "RE describe verificación; no ejecuta tool"

decision_option_contract:
  required_fields:
    - "decision_option_id"
    - "statement"
    - "conditions"
    - "expected_tradeoffs"
    - "supporting_references"
    - "limitations"
    - "execution_status"
  execution_status: "NOT_EXECUTED"

clarification_contract:
  required_fields:
    - "clarification_id"
    - "question"
    - "reason"
    - "related_open_question_ids"
    - "related_limitation_ids"
    - "related_unresolved_entities"

reasoning_run_contract:
  required_fields:
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
    - "in-memory únicamente"
    - "no escribe EKS"
    - "no escribe IES"
    - "no persistencia durable"
    - "provider metadata = auditoría, no epistemología"

auditability_rules:
  - "registrar ies_id/version"
  - "registrar session"
  - "registrar provider/model metadata"
  - "registrar output schema version"
  - "registrar timestamps"
  - "registrar validation outcome"
  - "registrar references"
  - "no prometer replay bitwise"

provider_failure_rules:
  - "timeout -> fail-closed"
  - "exception -> fail-closed"
  - "malformed output -> fail-closed"
  - "sin hypotheses inventadas"
  - "sin recommendations inventadas"
  - "Run conserva metadata de error no sensible"

current_pipeline_constraint:
  statement: >
    Evidence Builder vigente no produce evidence[] N3 sustantiva porque no hay
    reglas N3 autorizadas/calibradas.
  required_behavior: >
    Con los IES físicos actuales, el runtime debe demostrar cero hypotheses y
    cero recommendations sustantivas cuando evidence[] está vacío.
  interpretation: >
    Esto no es un error; es la conducta fail-closed requerida.

fixtures_required:
  - "validated-no-evidence.json"
  - "partial-no-evidence.json"
  - "conflicted-no-evidence.json"
  - "no-knowledge.json"
  - "synthetic-with-evidence-for-validator.json"
  - "synthetic-type-e.json"

fixture_rules:
  - "todos sintéticos"
  - "sin datos institucionales reales"
  - "fixture con evidence es solo para validar estructura RE"
  - "fixture con evidence no declara que EB productivo ya produzca N3"
  - "sin probability"
  - "sin G8"
  - "sin provider real"

fake_adapter_required_behaviors:
  - "returns_valid_empty_result"
  - "returns_valid_hypothesis_candidate"
  - "returns_invalid_reference"
  - "returns_invalid_strength"
  - "throws_timeout"
  - "throws_error"
  - "returns_malformed_output"

tests_required:
  - "factory expone reason"
  - "session default canonical_reasoning_language es-MX"
  - "IES consumible pasa gate"
  - "IES BUILDING/EXPIRED/SUPERSEDED/INVALID se rechaza"
  - "NO_KNOWLEDGE no llama hipótesis sustantiva"
  - "evidence[] vacío produce cero hypotheses"
  - "evidence[] vacío produce cero recommendations"
  - "fake adapter no recibe DB/tools/raw sources"
  - "candidate result arrays siempre presentes"
  - "interpretation usa tres partes"
  - "hypothesis references deben existir"
  - "supporting_evidence_ids obligatorio"
  - "supporting_fact_ids obligatorio"
  - "strength enum validado"
  - "STRONG se rechaza/degrada bajo blocking limitation"
  - "STRONG se rechaza/degrada bajo adverse conflict"
  - "rivals no se auto-rankean"
  - "is_primary_candidate false por defecto"
  - "invalid refs -> reject/abstain"
  - "NO_KNOWLEDGE candidate con hypothesis -> reject/abstain"
  - "Recommendation requiere soporte"
  - "Next Verification no ejecuta tool"
  - "Decision Option execution_status NOT_EXECUTED"
  - "Clarification anclada al IES"
  - "provider timeout fail-closed"
  - "provider error fail-closed"
  - "malformed output fail-closed"
  - "Reasoning Run contiene auditoría"
  - "Reasoning Run no escribe EKS/IES"
  - "input IES no se muta"
  - "runtime no importa provider SDK específico"
  - "runtime no contiene tool calls"
  - "tests existentes IES/OP/EB/EKS/integración continúan pasando"

acceptance_criteria:
  - "lib/director-ia-reasoning-engine.js creado"
  - "test/director-ia-reasoning-engine.test.js creado"
  - "fixtures reasoning sintéticos creados"
  - "factory/provider-neutral implementada"
  - "fake adapter en tests"
  - "sin networking"
  - "sin provider real"
  - "Reasoning Result estructurado"
  - "post-validation determinística"
  - "abstention gate pre/post model"
  - "evidence vacío -> cero hypothesis"
  - "evidence vacío -> cero recommendation"
  - "NO_KNOWLEDGE fail-closed"
  - "strength sin scores/probabilities"
  - "rivals sin autoranking"
  - "Reasoning Run in-memory"
  - "provider failures fail-closed"
  - "N1-N4 intactos"
  - "IES no mutado"
  - "sin G8"
  - "sin Channel Projection"
  - "ningún docs/director-ia modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "tests RE pasan"
  - "tests existentes pasan"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer IES Builder y tests existentes"
  - "crear lib/director-ia-reasoning-engine.js"
  - "crear test/director-ia-reasoning-engine.test.js"
  - "crear fixtures/director-ia/reasoning/"
  - "crear docs/dev-loop/reports/IMPL-REASONING-001.md"
  - "ejecutar tests RE"
  - "ejecutar tests IES/OP/EB/EKS/integración existentes"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar IES Builder"
  - "modificar OP/EB/EKS/integración"
  - "modificar server.js"
  - "modificar package.json"
  - "usar network"
  - "usar provider real"
  - "agregar provider SDK"
  - "usar API keys"
  - "crear prompts productivos provider-specific"
  - "usar tools"
  - "usar DB"
  - "crear SQL/migraciones"
  - "persistir Reasoning Run"
  - "implementar Channel Projection"
  - "calibrar G8"
  - "crear probability scoring"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el runtime RE provider-neutral puede implementarse
  contra IES in-memory con fake adapter, gates, validación y abstención sin
  modificar contratos ni integrar proveedor real.
  BLOCKED o STOPPED si completar el runtime exige modificar contrato, inventar
  reglas N5 adicionales, integrar provider real o cambiar N1-N4.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-REASONING-001.md"