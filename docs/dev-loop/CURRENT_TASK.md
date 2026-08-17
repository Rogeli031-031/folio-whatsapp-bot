# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T13:09:41-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y registrar contractualmente las decisiones físicas mínimas que
  bloquean IMPL-CHANNEL-PROJECTION-001: interfaz/factory del proyector,
  schema serializado del Projection Model, catálogo de semantic_type,
  reglas de priority, política física L0-L3, equivalencia crítica,
  progressive disclosure y políticas iniciales de canal para Chat, Voice,
  WhatsApp, Dashboard, Report y Presentation, sin implementar runtime ni
  introducir autoridad epistemológica.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "test/director-ia-reasoning-engine.test.js (solo lectura)"
  - "fixtures/director-ia/ies/ (solo lectura)"
  - "fixtures/director-ia/reasoning/ (solo lectura)"

out_of_scope:
  - "implementar Channel Projection"
  - "crear lib/director-ia-channel-projection.js"
  - "crear tests Channel Projection"
  - "crear fixtures Channel Projection"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar Architecture Index"

  - "modificar IES Builder"
  - "modificar Reasoning Engine"
  - "modificar OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"

  - "usar LLM de redacción"
  - "integrar proveedor real"
  - "usar networking"
  - "crear prompts productivos"
  - "crear widgets"
  - "crear SSML"
  - "crear templates WhatsApp productivos"

  - "crear memoria conversacional"
  - "crear WhoAmI"
  - "crear small talk"
  - "crear conversational orchestrator"

  - "recalcular coverage"
  - "recalcular materiality"
  - "recalcular confidence"
  - "crear hechos/evidencias/diagnósticos/hipótesis"
  - "resolver conflictos"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-CHANNEL-PROJECTION-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"
  implementation_status: "NO-GO"
  blockers:
    - "factory/runtime interface"
    - "Projection Model schema serializado"
    - "catálogo de semantic_type"
    - "reglas de priority"
    - "política física L0-L3"
    - "políticas implementables por canal"
    - "validación de equivalencia crítica"

proposed_human_decisions:

  D1_runtime_interface:
    decision: "CHANNEL_PROJECTION_FACTORY_V1"
    meaning: >
      Channel Projection se realiza como factory pura/testeable:
      createChannelProjection({ policyRegistry, clock? })
      y project({ ies, reasoningResult?, reasoningRunId?, channel, projectionDepth }).
      IES es la entrada epistemológica primaria; Reasoning Result es opcional y
      solo lectura.

  D2_projection_model_schema:
    decision: "SERIALIZED_PROJECTION_MODEL_V1"
    meaning: >
      El runtime construye primero un Projection Model neutral antes de render
      específico de canal.

    root_fields:
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

    item_fields:
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

  D3_semantic_type_catalog:
    decision: "SEMANTIC_TYPE_CATALOG_V1"
    enum:
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

    rule: >
      semantic_type describe el tipo ya existente en IES/RE. No crea nivel
      epistemológico ni nueva semántica.

  D4_content_class_mapping:
    decision: "DETERMINISTIC_CONTENT_CLASS_MAPPING_V1"
    mapping:
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

    rule: >
      Si un item cae en más de una categoría, prevalece la clase más estricta:
      IRRENUNCIABLE > OBLIGATORIO_RESUMIBLE > DIFERIBLE_BAJO_DEMANDA >
      ESPECIFICO_DE_CANAL.

  D5_priority:
    decision: "PRESENTATION_PRIORITY_V1"
    enum:
      - "P0_CRITICAL"
      - "P1_HIGH"
      - "P2_NORMAL"
      - "P3_DETAIL"

    rules:
      - "priority es solo de exposición"
      - "no equivale a materiality"
      - "no equivale a severity"
      - "no equivale a confidence"
      - "no equivale a hypothesis_strength"
      - "IRRENUNCIABLE -> P0_CRITICAL"
      - "OBLIGATORIO_RESUMIBLE -> P1_HIGH por defecto"
      - "DIFERIBLE_BAJO_DEMANDA -> P3_DETAIL por defecto"
      - "el runtime no inventa prioridad empresarial nueva"

  D6_projection_depth:
    decision: "PROJECTION_DEPTH_POLICY_V1"

    L0_FLASH:
      include:
        - "todo IRRENUNCIABLE"
        - "conclusión esencial disponible"
        - "máximo 1 recommendation si existe legítimamente"
      defer:
        - "detalle técnico"
        - "evidencia ampliada"
        - "audit trail"
      prohibition:
        - "no omitir IRRENUNCIABLE"

    L1_EXECUTIVE:
      include:
        - "todo IRRENUNCIABLE"
        - "OBLIGATORIO_RESUMIBLE"
        - "recommendations legítimas"
        - "abstentions relevantes"
      defer:
        - "detalle auditivo/técnico"

    L2_SUPPORT:
      include:
        - "todo L1"
        - "hechos/evidencia de soporte"
        - "open questions"
        - "source health relevante"

    L3_AUDIT:
      include:
        - "todo lo proyectable"
        - "references"
        - "audit"
        - "deferred_items"
        - "lineage disponible permitido"

  D7_critical_equivalence:
    decision: "CRITICAL_EQUIVALENCE_VALIDATION_V1"
    meaning: >
      Antes de emitir una proyección, el runtime compara IES/Reasoning Result
      con Projection Model y verifica que todos los elementos IRRENUNCIABLE
      estén presentes y semánticamente intactos.

    checks:
      - "NO_KNOWLEDGE preservado"
      - "Tipo E preservado"
      - "blocking limitations preservadas"
      - "critical contradictions preservadas"
      - "abstentions relevantes preservadas"
      - "recommendations no presentadas como decisiones ejecutadas"
      - "Decision Option conserva NOT_EXECUTED"

  D8_optional_reasoning:
    decision: "OPTIONAL_REASONING_NO_FILL_V1"
    meaning: >
      Si Reasoning Result no existe, 06 proyecta solo IES.
      Si RE se abstuvo, 06 puede proyectar abstention/limits, pero no fabrica N5.
      Ausencia de N5 nunca se interpreta como error de Projection.

  D9_progressive_disclosure:
    decision: "SAFE_PROGRESSIVE_DISCLOSURE_V1"
    meaning: >
      Solo DIFERIBLE_BAJO_DEMANDA puede ocultarse inicialmente.
      IRRENUNCIABLE nunca queda detrás de click, drill-down, 'dime más' o anexo.

  D10_channel_policy_registry:
    decision: "CHANNEL_POLICY_REGISTRY_V1"
    meaning: >
      Las seis superficies se implementan como políticas sobre el mismo
      Projection Model. No son pipelines independientes.

    channels:
      - "CHAT"
      - "VOICE"
      - "WHATSAPP"
      - "DASHBOARD"
      - "REPORT"
      - "PRESENTATION"

  D11_chat_policy:
    decision: "CHAT_POLICY_V1"
    rules:
      - "tono natural y directo"
      - "puede usar párrafos cortos"
      - "puede ofrecer profundización"
      - "no omite IRRENUNCIABLE"
      - "separación visible entre hecho/inferencia/límite"
      - "no finge emociones ni experiencias propias"

  D12_voice_policy:
    decision: "VOICE_POLICY_V1"
    rules:
      - "secuencia lineal"
      - "baja densidad"
      - "IRRENUNCIABLE primero"
      - "detalle diferible se resume y ofrece bajo demanda"
      - "si algo no puede expresarse fielmente, declarar limitación"

  D13_whatsapp_policy:
    decision: "WHATSAPP_POLICY_V1"
    rules:
      - "mensajes compactos"
      - "IRRENUNCIABLE visible en primer bloque"
      - "puede fragmentar en varios mensajes"
      - "detalle diferible se ofrece bajo demanda"
      - "no prometer acciones no ejecutadas"
      - "no ocultar abstention"

  D14_dashboard_policy:
    decision: "DASHBOARD_POLICY_V1"
    rules:
      - "alta densidad"
      - "IRRENUNCIABLE visible sin drill-down"
      - "detalle DIFERIBLE puede ir a drill-down"
      - "mismo ies_id/reasoning_run_id"
      - "visualización no altera semántica"

  D15_report_policy:
    decision: "REPORT_POLICY_V1"
    rules:
      - "representación persistente"
      - "incluye audit/reference suficiente"
      - "L2/L3 preferentes"
      - "no elimina contradicciones o límites"

  D16_presentation_policy:
    decision: "PRESENTATION_POLICY_V1"
    rules:
      - "secuencia guiada"
      - "IRRENUNCIABLE aparece antes de recomendación"
      - "Decision Option no se presenta como decisión tomada"
      - "puede resumir detalle técnico"

  D17_rendering_boundary:
    decision: "DETERMINISTIC_PROJECTION_FIRST_V1"
    meaning: >
      IMPL-CHANNEL-PROJECTION-001 inicial construye Projection Model y una
      representación neutral/determinística por canal sin LLM de redacción.
      Un renderer LLM conversacional puede evaluarse en tarea posterior,
      subordinado al Projection Model y sin autoridad epistemológica.

  D18_output_shape:
    decision: "CHANNEL_OUTPUT_ENVELOPE_V1"
    fields:
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

    rule: >
      content_blocks son representación de Projection Model. No contienen
      semántica nueva.

  D19_tone_boundary:
    decision: "TONE_IS_PRESENTATION_ONLY_V1"
    meaning: >
      Tono puede ser claro, cálido, conversacional o ejecutivo según canal,
      siempre que no cambie certeza, causalidad, límites, ausencia, conflictos,
      recommendations o estado de ejecución.

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

  D20_first_runtime_scope:
    decision: "PROJECTION_MODEL_PLUS_NEUTRAL_RENDER_V1"
    meaning: >
      Primera implementación puede ser totalmente in-memory y determinística,
      con policies puras y fixtures sintéticos, sin integración real de canal.

human_approval_scope:
  approve_exactly:
    - "D1_runtime_interface"
    - "D2_projection_model_schema"
    - "D3_semantic_type_catalog"
    - "D4_content_class_mapping"
    - "D5_priority"
    - "D6_projection_depth"
    - "D7_critical_equivalence"
    - "D8_optional_reasoning"
    - "D9_progressive_disclosure"
    - "D10_channel_policy_registry"
    - "D11_chat_policy"
    - "D12_voice_policy"
    - "D13_whatsapp_policy"
    - "D14_dashboard_policy"
    - "D15_report_policy"
    - "D16_presentation_policy"
    - "D17_rendering_boundary"
    - "D18_output_shape"
    - "D19_tone_boundary"
    - "D20_first_runtime_scope"

g2_contract_changes_authorized_if_approved:
  docs/director-ia/06-CHANNEL-PROJECTION.md:
    allowed:
      - "registrar realización física D1-D20"
      - "congelar Projection Model v1"
      - "congelar semantic_type catalog"
      - "congelar presentation priority"
      - "congelar L0-L3 physical policy"
      - "congelar channel policy registry"
      - "congelar critical equivalence validation"
      - "congelar neutral first-runtime scope"
      - "aclarar tone boundary"

    forbidden:
      - "modificar IES"
      - "modificar RE"
      - "crear N6"
      - "crear semántica nueva"
      - "autorizar LLM renderer productivo"
      - "crear memoria conversacional"
      - "cambiar coverage/materiality/conflicts"
      - "crear tool execution"

required_report:
  - "D1-D20 registradas"
  - "diff contractual exacto"
  - "confirmación N1-N5 intactos"
  - "confirmación IES/RE intactos"
  - "Projection Model final"
  - "semantic_type final"
  - "priority final"
  - "L0-L3 final"
  - "channel policies final"
  - "critical equivalence checks"
  - "tone boundary"
  - "gaps diferidos"
  - "GO/NO-GO para IMPL-CHANNEL-PROJECTION-001"

acceptance_criteria:
  - "Projection Model queda serializable"
  - "semantic_type queda cerrado"
  - "priority queda de presentación, no epistemológica"
  - "L0-L3 queda implementable"
  - "IRRENUNCIABLE nunca omitible"
  - "Reasoning opcional no se rellena"
  - "progressive disclosure seguro"
  - "seis políticas de canal definidas"
  - "tone boundary definido"
  - "first runtime determinístico sin LLM"
  - "06 es único contrato modificable"
  - "04/05 no se modifican"
  - "N1-N5 no cambian"
  - "sin runtime"
  - "sin tests/fixtures"
  - "sin memoria conversacional"
  - "sin G8"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"
  - "IMPL-CHANNEL-PROJECTION-001 no se crea"

allowed_actions:
  - "leer contracts_in_force"
  - "leer auditoría 001"
  - "comparar D1-D20 con contratos superiores"
  - "si G1+G2 autorizados, modificar únicamente 06-CHANNEL-PROJECTION.md"
  - "crear docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar contratos fuera de 06"
  - "implementar runtime"
  - "crear tests/fixtures"
  - "crear renderer LLM"
  - "crear memory/WhoAmI/small talk"
  - "modificar IES/RE/OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "autoaprobar G1/G2"
  - "crear IMPL-CHANNEL-PROJECTION-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si D1-D20 pueden registrarse en 06 sin contradicción
  constitucional ni creación de autoridad epistemológica nueva.
  BLOCKED o STOPPED si alguna decisión exige modificar 04/05/Constitución,
  crear N6, introducir semántica nueva o autorizar LLM renderer productivo.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002.md"