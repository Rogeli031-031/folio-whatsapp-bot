# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T12:45:23-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar la realizabilidad física de Channel Projection v1.0 definido por
  docs/director-ia/06-CHANNEL-PROJECTION.md contra los runtimes actuales de
  IES Builder y Reasoning Engine. Identificar qué decisiones de proyección ya
  están contractualmente definidas, cuáles siguen siendo PHYSICAL_UNKNOWN y
  qué decisiones humanas son necesarias antes de autorizar un futuro
  IMPL-CHANNEL-PROJECTION-001, sin implementar runtime ni modificar contratos.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"
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
  - "crear tests de implementación"
  - "crear fixtures de implementación"

  - "modificar docs/director-ia/"
  - "modificar IES Builder"
  - "modificar Reasoning Engine"
  - "modificar OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"

  - "crear rendering real WhatsApp"
  - "crear rendering real Chat"
  - "crear rendering real Voice"
  - "crear rendering real Dashboard"
  - "crear rendering real Report"
  - "crear rendering real Presentation"

  - "crear SSML"
  - "crear widgets"
  - "crear templates WhatsApp"
  - "usar LLM de redacción"
  - "usar networking"
  - "usar APIs externas"

  - "crear memoria conversacional"
  - "crear WhoAmI"
  - "crear small talk"
  - "crear conversational orchestrator"

  - "recalcular coverage"
  - "recalcular materiality"
  - "crear hechos/evidencia/diagnósticos/hipótesis"
  - "resolver conflictos"

  - "commit"
  - "push"
  - "merge"
  - "crear IMPL-CHANNEL-PROJECTION-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

current_runtime_state:
  ies_builder: "IMPLEMENTED"
  reasoning_engine: "IMPLEMENTED provider-neutral / fake adapter"
  channel_projection: "PENDING"

contractual_facts:
  - "06 transforma forma de exposición, no verdad"
  - "06 no tiene autoridad epistemológica"
  - "06 no crea N1-N5"
  - "06 no modifica IES ni Reasoning Result"
  - "entrada de conocimiento = IES emitido"
  - "Reasoning Result es entrada semántica opcional"
  - "projection_depth L0-L3 es presentación, no epistemología"
  - "mismo ies_id puede proyectarse a múltiples canales"
  - "cambio de canal no crea verdad nueva"
  - "IRRENUNCIABLE nunca se omite"
  - "OBLIGATORIO_RESUMIBLE puede comprimirse"
  - "DIFERIBLE_BAJO_DEMANDA puede diferirse"
  - "ESPECIFICO_DE_CANAL gobierna formato/tono/densidad/interactividad"
  - "NO_KNOWLEDGE nunca se suaviza"
  - "Tipo E nunca se oculta"
  - "ausencia legítima de N5 no se rellena"
  - "seis superficies = Chat, Voz, WhatsApp, Dashboard, Reporte, Presentación"
  - "Projection Model es conceptual; esquema serializado pendiente"
  - "runtime Channel Projection pendiente"

audit_questions:

  D1_projection_runtime_interface:
    question: >
      ¿Cuál debe ser la interfaz física mínima de Channel Projection para
      aceptar IES + Reasoning Result opcional + channel + projection_depth
      sin introducir estado epistemológico?

  D2_projection_model_schema:
    question: >
      ¿El contrato define suficientemente el Projection Model para serializarlo
      e implementarlo o faltan campos físicos obligatorios?

  D3_content_class_assignment:
    question: >
      ¿Cómo se asignan físicamente IRRENUNCIABLE,
      OBLIGATORIO_RESUMIBLE, DIFERIBLE_BAJO_DEMANDA y
      ESPECIFICO_DE_CANAL sin depender de interpretación libre del runtime?

  D4_semantic_type_mapping:
    question: >
      ¿Existe mapping determinístico suficiente desde objetos IES/RE hacia
      semantic_type del Projection Model?

  D5_priority:
    question: >
      ¿Cómo se determina prioridad de exposición sin inventar materiality,
      severity ni ranking semántico nuevo?

  D6_projection_depth:
    question: >
      ¿Qué contenido concreto debe sobrevivir o diferirse en L0/L1/L2/L3?
      ¿El contrato existente es suficiente para implementation directa?

  D7_irrenunciable_gate:
    question: >
      ¿Qué validación determinística garantiza que NO_KNOWLEDGE, Tipo E,
      limitaciones materiales y contradicciones críticas nunca se omitan?

  D8_optional_reasoning:
    question: >
      ¿Cómo debe comportarse físicamente 06 cuando no existe Reasoning Result,
      o cuando RE se abstuvo completamente?

  D9_chat_policy:
    question: >
      ¿Qué decisiones físicas faltan para Chat respecto a longitud,
      estructura, tono, revelación progresiva y continuidad?

  D10_voice_policy:
    question: >
      ¿Qué decisiones físicas faltan para Voz respecto a secuencia,
      densidad, marcadores verbales y contenido no representable?

  D11_whatsapp_policy:
    question: >
      ¿Qué decisiones físicas faltan para WhatsApp respecto a longitud,
      fragmentación, acciones, detalle diferido y preservación de verdad crítica?

  D12_dashboard_policy:
    question: >
      ¿Qué decisiones físicas faltan para Dashboard respecto a cards,
      drill-down, densidad y equivalencia crítica?

  D13_report_policy:
    question: >
      ¿Qué decisiones físicas faltan para Reporte respecto a representación
      persistente y auditabilidad?

  D14_presentation_policy:
    question: >
      ¿Qué decisiones físicas faltan para Presentación respecto a secuencia
      guiada y conducción de decisión sin crear semántica?

  D15_text_generation_boundary:
    question: >
      ¿La primera implementación debe ser estrictamente determinística/template
      based, puede usar un renderer LLM posterior subordinado, o el contrato
      todavía no autoriza esa elección?

  D16_tone_and_human_style:
    question: >
      ¿Qué parte del tono conversacional puede ser ESPECIFICO_DE_CANAL sin
      permitir que empatía, cortesía o naturalidad alteren hechos, límites,
      hipótesis o recomendaciones?

  D17_progressive_disclosure:
    question: >
      ¿Cómo se implementa DIFERIBLE_BAJO_DEMANDA en canales no interactivos
      o de baja capacidad sin esconder información crítica?

  D18_projection_validation:
    question: >
      ¿Qué validaciones determinísticas deben comparar Projection Model /
      salida de canal contra IES+RE para demostrar equivalencia crítica?

  D19_channel_output_shape:
    question: >
      ¿Conviene que runtime v1 emita primero una representación neutral de canal
      antes de render específico? ¿El contrato lo autoriza o requiere G2?

  D20_runtime_readiness:
    question: >
      Emitir GO/NO-GO para IMPL-CHANNEL-PROJECTION-001 y listar decisiones
      físicas que requieren G2.

mandatory_projection_matrix:
  columns:
    - "source object"
    - "semantic_type"
    - "default content_class"
    - "L0"
    - "L1"
    - "L2"
    - "L3"
    - "must preserve"
    - "may summarize"
    - "may defer"
    - "physical readiness"
    - "classification"

mandatory_channel_matrix:
  channels:
    - "CHAT"
    - "VOICE"
    - "WHATSAPP"
    - "DASHBOARD"
    - "REPORT"
    - "PRESENTATION"
  columns:
    - "channel"
    - "density"
    - "sequence"
    - "tone"
    - "progressive disclosure mechanism"
    - "mandatory critical content"
    - "unsupported content behavior"
    - "physical readiness"
    - "classification"

mandatory_runtime_gap_matrix:
  columns:
    - "gap_id"
    - "description"
    - "blocks_impl_channel_projection_001: YES|NO"
    - "requires_G2: YES|NO"
    - "requires_LLM_decision: YES|NO"
    - "authority_owner"
    - "recommended_resolution"

classification_rules:
  CONTRACTUAL: >
    Ya definido por 06 o contratos superiores.
  PHYSICAL_UNKNOWN: >
    Resultado requerido pero sin realización física suficiente.
  RECOMMENDATION: >
    Propuesta técnica no aprobada automáticamente.
  BLOCKER: >
    Impide implementación sin decisión humana/contractual.

audit_constraints:
  - "no convertir tono en autoridad epistemológica"
  - "no inventar templates productivos"
  - "no inventar límites de caracteres como norma"
  - "no elegir LLM vs templates por conveniencia"
  - "no suavizar NO_KNOWLEDGE"
  - "no omitir Tipo E"
  - "no ocultar limitaciones detrás de progressive disclosure"
  - "no crear contenido semántico nuevo"
  - "no transformar recommendation en acción ejecutada"
  - "no rellenar ausencia de Reasoning Result"
  - "no crear memoria conversacional"
  - "no implementar small talk"

required_report_sections:
  - "1. Executive result"
  - "2. Contracts/runtime inspected"
  - "3. Current physical reality"
  - "4. D1-D20 findings"
  - "5. Projection Model readiness"
  - "6. Projection depth matrix"
  - "7. Channel policy matrix"
  - "8. IRRENUNCIABLE validation"
  - "9. Optional Reasoning behavior"
  - "10. Tone / conversational style boundary"
  - "11. Progressive disclosure readiness"
  - "12. Deterministic equivalence validation"
  - "13. Physical unknowns"
  - "14. Recommendations requiring approval"
  - "15. Blockers"
  - "16. Gate assessment"
  - "17. GO/NO-GO for IMPL-CHANNEL-PROJECTION-001"
  - "18. STOP"

acceptance_criteria:
  - "D1-D20 auditados"
  - "Projection Model matrix completa"
  - "channel matrix completa"
  - "runtime gap matrix completa"
  - "IRRENUNCIABLE gate auditado"
  - "L0-L3 auditados"
  - "comportamiento sin Reasoning Result auditado"
  - "frontera de tono conversacional auditada"
  - "progressive disclosure auditado"
  - "equivalencia crítica auditada"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "sin LLM/rendering productivo"
  - "sin memoria conversacional"
  - "sin G8"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer IES Builder / Reasoning Engine / tests / fixtures"
  - "clasificar D1-D20"
  - "crear matrices obligatorias"
  - "crear docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar tests existentes solo para verificar realidad física"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "crear runtime Channel Projection"
  - "crear tests/fixtures Channel Projection"
  - "modificar IES/RE/OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "crear renderer LLM"
  - "crear templates productivos"
  - "crear small talk/memory/WhoAmI"
  - "autoaprobar decisiones"
  - "autoaprobar G2"
  - "crear IMPL-CHANNEL-PROJECTION-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría identifica completamente la frontera
  física IES/Reasoning Result -> Projection Model -> canal y separa decisiones
  contractuales, unknowns, recomendaciones y blockers sin modificar contratos.
  BLOCKED o STOPPED si continuar exige G2 u otra decisión humana no autorizada.

implementation_followup_rule: >
  IMPL-CHANNEL-PROJECTION-001 no puede crearse desde esta tarea.
  HUMAN_APPROVER debe revisar el reporte y resolver primero cualquier decisión
  física pendiente.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"