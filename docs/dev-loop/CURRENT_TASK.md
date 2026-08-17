# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-CHANNEL-PROJECTION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T13:23:41-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el runtime mínimo, determinístico, puro y fail-closed de
  Channel Projection conforme a docs/director-ia/06-CHANNEL-PROJECTION.md
  v1.0 y a las decisiones físicas D1-D20 registradas por
  ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002. La primera implementación
  debe construir un Projection Model serializado y una representación neutral
  por canal, completamente in-memory, sin LLM renderer, sin integración real
  de canal y sin autoridad epistemológica.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-CHANNEL-PROJECTION-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-channel-projection.js"
  - "test/director-ia-channel-projection.test.js"
  - "fixtures/director-ia/channel-projection/"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "test/director-ia-reasoning-engine.test.js (solo lectura)"
  - "fixtures/director-ia/ies/ (solo lectura)"
  - "fixtures/director-ia/reasoning/ (solo lectura)"

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
  - "modificar Reasoning Engine"
  - "modificar OP"
  - "modificar EB"
  - "modificar EKS"
  - "modificar integración OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"

  - "usar LLM renderer"
  - "integrar proveedor real"
  - "usar networking"
  - "crear prompts productivos"
  - "crear templates productivos"
  - "crear SSML"
  - "crear widgets"
  - "integrar WhatsApp real"
  - "integrar voz real"
  - "integrar chat real"
  - "integrar dashboard real"
  - "generar reportes/presentaciones reales"

  - "crear memoria conversacional"
  - "crear WhoAmI"
  - "crear small talk"
  - "crear conversational orchestrator"

  - "crear N6"
  - "crear semántica nueva"
  - "crear/modificar N1-N5"
  - "recalcular coverage"
  - "recalcular materiality"
  - "recalcular confidence"
  - "recalcular severity"
  - "recalcular hypothesis_strength"
  - "resolver conflictos"

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
  runtime_interface: "CHANNEL_PROJECTION_FACTORY_V1"
  projection_model: "SERIALIZED_PROJECTION_MODEL_V1"
  semantic_types: "SEMANTIC_TYPE_CATALOG_V1"
  content_class_mapping: "DETERMINISTIC_CONTENT_CLASS_MAPPING_V1"
  priority: "PRESENTATION_PRIORITY_V1"
  depth: "PROJECTION_DEPTH_POLICY_V1"
  critical_equivalence: "CRITICAL_EQUIVALENCE_VALIDATION_V1"
  optional_reasoning: "OPTIONAL_REASONING_NO_FILL_V1"
  progressive_disclosure: "SAFE_PROGRESSIVE_DISCLOSURE_V1"
  channel_registry: "CHANNEL_POLICY_REGISTRY_V1"
  chat: "CHAT_POLICY_V1"
  voice: "VOICE_POLICY_V1"
  whatsapp: "WHATSAPP_POLICY_V1"
  dashboard: "DASHBOARD_POLICY_V1"
  report: "REPORT_POLICY_V1"
  presentation: "PRESENTATION_POLICY_V1"
  rendering_boundary: "DETERMINISTIC_PROJECTION_FIRST_V1"
  output_shape: "CHANNEL_OUTPUT_ENVELOPE_V1"
  tone_boundary: "TONE_IS_PRESENTATION_ONLY_V1"
  first_runtime_scope: "PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1"

required_runtime_interface:
  factory: "createChannelProjection({ policyRegistry, clock, idFactory })"
  primary_operation: >
    project({ ies, reasoningResult?, reasoningRunId?, channel, projectionDepth })
  output:
    projection_model: "Serialized Projection Model v1"
    channel_output: "Channel Output Envelope v1"

dependencies:
  policyRegistry:
    required: true
    purpose: "políticas puras por canal"
  clock:
    required: true
    purpose: "audit timestamps determinísticos"
  idFactory:
    required: true
    purpose: "projection_id/item_id testeables"

input_rules:
  - "IES es obligatorio"
  - "Reasoning Result es opcional"
  - "reasoningRunId es opcional"
  - "channel es obligatorio"
  - "projectionDepth es obligatorio"
  - "no acepta Snapshot/Bundle/ObservationRecord como bypass"
  - "no consulta EKS/OP/EB"
  - "no ejecuta tools"
  - "no muta IES ni Reasoning Result"

supported_channels:
  - "CHAT"
  - "VOICE"
  - "WHATSAPP"
  - "DASHBOARD"
  - "REPORT"
  - "PRESENTATION"

supported_depths:
  - "L0_FLASH"
  - "L1_EXECUTIVE"
  - "L2_SUPPORT"
  - "L3_AUDIT"

semantic_type_enum:
  - "COVERAGE"
  - "FACT"
  - "EVIDENCE"
  - "DIAGNOSIS"
  - "CONFLICT"
  - "OPEN_QUESTION"
  - "SOURCE_HEALTH"
  - "LIMITATION"
  - "ABSTENTION"
  - "INTERPRETATION_KNOWN"
  - "INTERPRETATION_INFERRED"
  - "INTERPRETATION_NOT_CONCLUDED"
  - "HYPOTHESIS"
  - "RECOMMENDATION"
  - "NEXT_VERIFICATION"
  - "DECISION_OPTION"
  - "CLARIFICATION_REQUEST"
  - "AUDIT_REFERENCE"

content_class_enum:
  - "IRRENUNCIABLE"
  - "OBLIGATORIO_RESUMIBLE"
  - "DIFERIBLE_BAJO_DEMANDA"
  - "ESPECIFICO_DE_CANAL"

priority_enum:
  - "P0_CRITICAL"
  - "P1_HIGH"
  - "P2_NORMAL"
  - "P3_DETAIL"

content_class_precedence:
  - "IRRENUNCIABLE"
  - "OBLIGATORIO_RESUMIBLE"
  - "DIFERIBLE_BAJO_DEMANDA"
  - "ESPECIFICO_DE_CANAL"

projection_model_root:
  required_fields:
    - "projection_id"
    - "ies_id"
    - "ies_version"
    - "reasoning_run_id"
    - "channel"
    - "projection_depth"
    - "items"
    - "critical_invariants"
    - "deferred_items"
    - "limitations"
    - "audit"

projection_item:
  required_fields:
    - "item_id"
    - "source_type"
    - "source_id"
    - "semantic_type"
    - "content_class"
    - "priority"
    - "statement_or_reference"
    - "supporting_references"
    - "must_preserve"
    - "may_summarize"
    - "may_defer"

channel_output_root:
  required_fields:
    - "projection_id"
    - "channel"
    - "projection_depth"
    - "ies_id"
    - "reasoning_run_id"
    - "content_blocks"
    - "deferred_content"
    - "critical_invariants"
    - "limitations"
    - "audit"

deterministic_content_class_mapping:
  NO_KNOWLEDGE: "IRRENUNCIABLE"
  TYPE_E_CONFLICT: "IRRENUNCIABLE"
  BLOCKING_LIMITATION: "IRRENUNCIABLE"
  CRITICAL_CONTRADICTION: "IRRENUNCIABLE"
  DIAGNOSIS: "OBLIGATORIO_RESUMIBLE"
  PRIMARY_EVIDENCE: "OBLIGATORIO_RESUMIBLE"
  LEGITIMATE_HYPOTHESIS: "OBLIGATORIO_RESUMIBLE"
  RECOMMENDATION: "OBLIGATORIO_RESUMIBLE"
  FACT_DETAIL: "DIFERIBLE_BAJO_DEMANDA"
  EVIDENCE_DETAIL: "DIFERIBLE_BAJO_DEMANDA"
  AUDIT_REFERENCE: "DIFERIBLE_BAJO_DEMANDA"
  PRESENTATION_FORMAT: "ESPECIFICO_DE_CANAL"

priority_rules:
  - "IRRENUNCIABLE -> P0_CRITICAL"
  - "OBLIGATORIO_RESUMIBLE -> P1_HIGH por defecto"
  - "DIFERIBLE_BAJO_DEMANDA -> P3_DETAIL por defecto"
  - "priority es exposición, no materiality"
  - "priority no es severity"
  - "priority no es confidence"
  - "priority no es hypothesis_strength"
  - "no inventar ranking empresarial"

depth_policy:

  L0_FLASH:
    required:
      - "todo IRRENUNCIABLE"
      - "conclusión esencial disponible"
    conditional:
      - "máximo 1 recommendation legítima"
    defer:
      - "detalle técnico"
      - "evidencia ampliada"
      - "audit trail"

  L1_EXECUTIVE:
    required:
      - "todo IRRENUNCIABLE"
      - "OBLIGATORIO_RESUMIBLE"
      - "recommendations legítimas"
      - "abstentions relevantes"
    defer:
      - "detalle técnico/audit"

  L2_SUPPORT:
    required:
      - "todo L1"
      - "facts de soporte"
      - "evidence de soporte"
      - "open questions"
      - "source health relevante"

  L3_AUDIT:
    required:
      - "todo lo proyectable"
      - "references"
      - "audit"
      - "deferred_items"
      - "lineage permitido disponible"

critical_equivalence_checks:
  - "NO_KNOWLEDGE preservado"
  - "Tipo E preservado"
  - "blocking limitations preservadas"
  - "critical contradictions preservadas"
  - "abstentions relevantes preservadas"
  - "Recommendation no cambia a acción ejecutada"
  - "Decision Option conserva NOT_EXECUTED"
  - "IRRENUNCIABLE no puede quedar deferred"

optional_reasoning_rules:
  - "sin Reasoning Result -> proyectar únicamente IES"
  - "RE abstuvo -> proyectar abstention/limits si existen"
  - "no fabricar hypotheses/recommendations"
  - "ausencia de N5 no es error"

progressive_disclosure_rules:
  - "solo DIFERIBLE_BAJO_DEMANDA puede ocultarse inicialmente"
  - "IRRENUNCIABLE jamás detrás de drill-down/click/dime más/anexo"
  - "contenido diferido debe permanecer referenciado"
  - "canal sin mecanismo de disclosure declara limitación"

channel_policies:

  CHAT:
    - "tono natural y directo"
    - "párrafos cortos permitidos"
    - "puede ofrecer profundización"
    - "IRRENUNCIABLE visible"
    - "separación hecho/inferencia/límite"
    - "no finge emociones ni experiencias"

  VOICE:
    - "secuencia lineal"
    - "baja densidad"
    - "IRRENUNCIABLE primero"
    - "detalle diferible resumido"
    - "si no puede expresarse fielmente -> limitación"

  WHATSAPP:
    - "mensajes compactos"
    - "IRRENUNCIABLE en primer bloque"
    - "fragmentación permitida"
    - "detalle diferible bajo demanda"
    - "no prometer acciones no ejecutadas"
    - "no ocultar abstention"

  DASHBOARD:
    - "alta densidad"
    - "IRRENUNCIABLE visible sin drill-down"
    - "detalle diferible puede ir a drill-down"
    - "mismo ies_id/reasoning_run_id"
    - "visualización no altera semántica"

  REPORT:
    - "representación persistente"
    - "audit/reference suficiente"
    - "L2/L3 preferentes"
    - "no elimina contradicciones/límites"

  PRESENTATION:
    - "secuencia guiada"
    - "IRRENUNCIABLE antes de recommendation"
    - "Decision Option no se presenta como decisión tomada"
    - "detalle técnico resumible"

tone_rules:
  allowed:
    - "cortesía"
    - "claridad"
    - "naturalidad"
    - "transiciones conversacionales"
    - "preguntas de seguimiento"
  forbidden:
    - "simular certeza inexistente"
    - "prometer resultados no soportados"
    - "fingir emoción/experiencia propia"
    - "convertir hypothesis en fact"
    - "suavizar NO_KNOWLEDGE"
    - "reformular abstention como seguridad"

neutral_rendering_rules:
  - "sin LLM"
  - "sin templates provider-specific"
  - "representación determinística"
  - "content_blocks derivados de Projection Model"
  - "no semántica nueva"
  - "mismo input + misma policy -> misma estructura"

fixture_requirements:
  - "chat-no-knowledge.json"
  - "whatsapp-type-e.json"
  - "voice-abstention.json"
  - "dashboard-supported-reasoning.json"
  - "report-audit.json"
  - "presentation-decision-option.json"

fixture_rules:
  - "todos sintéticos"
  - "sin datos institucionales"
  - "sin LLM"
  - "sin networking"
  - "sin templates productivos"
  - "pueden reutilizar IES/Reasoning fixtures como source"
  - "no introducen N1-N5 nuevo"

tests_required:
  - "factory expone project"
  - "dependencias inyectadas obligatorias"
  - "channel inválido falla"
  - "projectionDepth inválido falla"
  - "IES obligatorio"
  - "Reasoning Result opcional"
  - "sin Reasoning Result no se fabrica N5"
  - "Projection Model root completo"
  - "Projection Item shape completo"
  - "semantic_type solo enum autorizado"
  - "content_class solo enum autorizado"
  - "priority solo enum autorizado"
  - "NO_KNOWLEDGE -> IRRENUNCIABLE/P0"
  - "Tipo E -> IRRENUNCIABLE/P0"
  - "blocking limitation -> IRRENUNCIABLE/P0"
  - "IRRENUNCIABLE prevalece sobre otras clases"
  - "L0 conserva todo IRRENUNCIABLE"
  - "L1 conserva OBLIGATORIO_RESUMIBLE"
  - "L2 añade soporte"
  - "L3 conserva audit/deferred"
  - "IRRENUNCIABLE nunca deferred"
  - "critical equivalence detecta omisión"
  - "abstention de RE permanece visible"
  - "Decision Option conserva NOT_EXECUTED"
  - "Recommendation no se marca ejecutada"
  - "CHAT policy determinística"
  - "VOICE policy determinística"
  - "WHATSAPP policy determinística"
  - "DASHBOARD policy determinística"
  - "REPORT policy determinística"
  - "PRESENTATION policy determinística"
  - "tone no altera statement/reference"
  - "input IES no mutado"
  - "input Reasoning Result no mutado"
  - "runtime no importa LLM/provider SDK"
  - "runtime no contiene networking/tool calls"
  - "mismo input/policy produce misma estructura salvo IDs/timestamps inyectados"
  - "tests IES/RE/OP/EB/EKS/integración continúan pasando"

acceptance_criteria:
  - "lib/director-ia-channel-projection.js creado"
  - "test/director-ia-channel-projection.test.js creado"
  - "fixtures channel projection creados"
  - "factory pura implementada"
  - "Projection Model serializado implementado"
  - "Channel Output Envelope implementado"
  - "semantic_type cerrado"
  - "content_class determinístico"
  - "priority exclusivamente presentación"
  - "L0-L3 implementados"
  - "critical equivalence fail-closed"
  - "Reasoning opcional sin relleno"
  - "progressive disclosure seguro"
  - "seis policies implementadas"
  - "neutral renderer determinístico"
  - "sin LLM"
  - "sin networking"
  - "sin integración real de canal"
  - "sin memoria/WhoAmI/small talk"
  - "N1-N5 intactos"
  - "IES/RE no mutados"
  - "ningún docs/director-ia modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "tests nuevos pasan"
  - "tests existentes pasan"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer IES/RE runtimes, tests y fixtures"
  - "crear lib/director-ia-channel-projection.js"
  - "crear test/director-ia-channel-projection.test.js"
  - "crear fixtures/director-ia/channel-projection/"
  - "crear docs/dev-loop/reports/IMPL-CHANNEL-PROJECTION-001.md"
  - "ejecutar tests nuevos"
  - "ejecutar regresión IES/RE/OP/EB/EKS/integración"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar IES/RE/OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "usar LLM"
  - "usar provider SDK"
  - "usar network"
  - "usar tools"
  - "crear templates/SSML/widgets productivos"
  - "integrar canales reales"
  - "crear memory/WhoAmI/small talk"
  - "crear N6"
  - "recalcular epistemología"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si Channel Projection v1 puede implementarse como
  Projection Model + neutral render determinístico, manteniendo equivalencia
  crítica y sin modificar contratos.
  BLOCKED o STOPPED si completar el runtime exige LLM renderer, integración
  real de canal, nueva semántica o cambio contractual.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-CHANNEL-PROJECTION-001.md"