# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T22:27:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar y definir la integración física mínima para que datos productivos
  reales puedan entrar al Director IA por la frontera oficial 03A, preservando
  MINIMAL_EXECUTION_ENVELOPE -> Observation Pipeline -> Evidence Builder y el
  pipeline cognitivo existente. Determinar qué productor real puede emitir el
  envelope, qué adapters/bridges hacen falta, cómo se preserva procedencia,
  fail-closed y trazabilidad, y si la integración puede implementarse sin
  modificar contratos cognitivos ni acoplar el Director IA al chat/Twilio
  legado.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"

  - "AGENTS.md (solo lectura)"
  - "docs/dev-loop/LOOP_PROTOCOL.md (solo lectura)"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura)"

  - "test/director-ia-observation-pipeline.test.js (solo lectura)"
  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"
  - "existing chat/whatsapp/twilio runtime files (solo lectura)"
  - "existing tool/planner/orchestrator runtime files if present (solo lectura)"

out_of_scope:
  - "implementar integración real"
  - "modificar server.js"
  - "modificar chat/Twilio/WhatsApp"
  - "modificar Observation Pipeline"
  - "modificar Evidence Builder"
  - "modificar EKS/IES/RE/CP"
  - "modificar E2E"
  - "crear provider real"
  - "crear source adapters productivos"

  - "crear tools nuevas"
  - "crear fuentes nuevas"
  - "crear DB queries productivas"
  - "crear credenciales"
  - "crear secrets"

  - "acoplar mensajes WhatsApp directamente a N1"
  - "convertir texto de usuario en fact"
  - "usar chat como evidencia"
  - "bypassear MINIMAL_EXECUTION_ENVELOPE"
  - "bypassear 03A"

  - "crear memoria conversacional"
  - "crear sesión conversacional"
  - "crear WhoAmI"
  - "crear small talk"

  - "usar G8"
  - "modificar N1-N5"
  - "inventar semántica de fuente"

  - "commit"
  - "push"
  - "merge"
  - "crear siguiente implementación"
  - "encadenar siguiente tarea"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"
  confirmed_findings:
    - "OP -> EB N2/N3/N4 -> EKS -> IES -> RE -> CP está estructuralmente listo in-memory"
    - "no existe cableado productivo hacia 03A"
    - "chat/Twilio legado no forma parte de N1-N5"
    - "no hay productor productivo confirmado de MINIMAL_EXECUTION_ENVELOPE"
    - "entrada productiva 03A es el cuello de botella actual"
    - "G8/B-C-D-E/causalidad no son el siguiente blocker"

audit_questions:

  D1_real_entrypoint:
    question: >
      ¿Cuál es el primer punto físico real del sistema desde el que debería
      originarse una ejecución del Director IA?

  D2_envelope_owner:
    question: >
      ¿Qué componente debe ser propietario de construir
      MINIMAL_EXECUTION_ENVELOPE sin mezclar adquisición, razonamiento ni canal?

  D3_existing_producer:
    question: >
      ¿Existe hoy algún Planner/Tool Orchestrator/runtime capaz de emitir el
      envelope contractual exacto? Si existe, determinar readiness. Si no,
      clasificar el gap.

  D4_input_trigger:
    question: >
      ¿Qué tipos de trigger reales pueden iniciar una ejecución: usuario,
      evento, scheduler, operación interna, webhook u otros ya presentes?

  D5_chat_boundary:
    question: >
      ¿Cómo debe relacionarse el chat/WhatsApp legado con el Director IA sin
      convertir texto conversacional en Observation N1 ni Evidence?

  D6_tool_execution_boundary:
    question: >
      ¿Dónde ocurre la ejecución de una tool/fuente real y qué output exacto
      debe transformarse en MINIMAL_EXECUTION_ENVELOPE?

  D7_adapter_boundary:
    question: >
      ¿Se necesita un adapter/bridge entre Tool Execution real y 03A?
      Determinar ownership y contrato mínimo, sin diseñar semántica nueva.

  D8_provenance:
    question: >
      ¿Qué identidades deben preservarse desde fuente real hasta Observation:
      source.system, source_instance_id, content_author_id, extracted_by,
      triggered_by, raw_payload_reference y trace_id?

  D9_status_mapping:
    question: >
      ¿Qué estados de ejecución real deben mapearse a los AcquisitionStatus
      contractuales y dónde debe ocurrir ese mapping?

  D10_raw_payload:
    question: >
      ¿Cómo debe conservarse raw_payload_reference sin introducir payload bruto
      dentro de Fact/Evidence/Diagnosis?

  D11_entity_resolution:
    question: >
      ¿Dónde debe resolverse entidad canónica en el camino productivo y qué
      ocurre cuando queda AMBIGUOUS/UNRESOLVED?

  D12_trace:
    question: >
      ¿Dónde nace trace_id y cómo debe preservarse hasta CP/E2E?

  D13_fail_closed:
    question: >
      Validar físicamente la ruta de SOURCE_NOT_INTEGRATED, SOURCE_RESTRICTED,
      TOOL_ERROR, ACQUIRED_EMPTY, ENTITY_UNRESOLVED y QUERY_SCOPE_INCOMPLETE
      desde ejecución real hasta 03A/EB.

  D14_runtime_composition:
    question: >
      ¿Qué factory/orchestrator existente debería componer el flujo productivo
      y cuál sería el mínimo runtime nuevo, si alguno?

  D15_server_boundary:
    question: >
      ¿Debe server.js conocer Director IA directamente o debería invocar una
      fachada/orchestrator productivo separado?

  D16_whatsapp_boundary:
    question: >
      ¿WhatsApp debe ser únicamente trigger + Channel Projection destination,
      o requiere otra responsabilidad en la arquitectura?

  D17_persistence_order:
    question: >
      ¿La integración real debe desbloquearse antes de sesión/persistencia
      adicional, conforme al post-N4 audit?

  D18_security:
    question: >
      ¿Qué credenciales/secrets/permisos son necesarios para integración real
      y cómo evitar que crucen el boundary cognitivo?

  D19_minimum_vertical_slice:
    question: >
      Definir el vertical slice productivo mínimo demostrable con una fuente
      real ya existente, sin inventar nueva source capability.

  D20_readiness:
    question: >
      Emitir GO/CONDITIONAL-GO/NO-GO para una futura implementación de real
      input integration e identificar exactamente los gates necesarios.

mandatory_runtime_map:
  stages:
    - "Real Trigger"
    - "Planner / Execution intent"
    - "Tool Execution"
    - "MINIMAL_EXECUTION_ENVELOPE producer"
    - "Observation Pipeline"
    - "Evidence Builder N2/N3/N4"
    - "EKS"
    - "IES"
    - "Reasoning"
    - "Channel Projection"
    - "real output destination"

  columns:
    - "stage"
    - "existing physical component"
    - "input"
    - "output"
    - "productive today"
    - "gap"
    - "owner"
    - "gate required"

mandatory_envelope_matrix:
  columns:
    - "envelope field"
    - "contract owner"
    - "real source candidate"
    - "producer"
    - "required"
    - "current availability"
    - "mapping required"
    - "notes"

mandatory_status_mapping_matrix:
  rows:
    - "ACQUIRED_OK"
    - "ACQUIRED_EMPTY"
    - "TOOL_ERROR"
    - "SOURCE_RESTRICTED"
    - "SOURCE_NOT_INTEGRATED"
    - "ENTITY_UNRESOLVED"
    - "QUERY_SCOPE_INCOMPLETE"

  columns:
    - "contract status"
    - "real execution condition"
    - "mapping owner"
    - "raw evidence required"
    - "business meaning prohibited"
    - "current readiness"

mandatory_candidate_source_matrix:
  columns:
    - "existing source/tool"
    - "current runtime"
    - "real data"
    - "auth required"
    - "can emit envelope today"
    - "adapter needed"
    - "risk"
    - "recommended for first vertical slice"

mandatory_gate_matrix:
  columns:
    - "gap/decision"
    - "blocks implementation"
    - "requires G2"
    - "requires G3"
    - "requires credentials/config"
    - "requires new source/tool"
    - "owner"
    - "recommended action"

classification_rules:
  CONTRACTUAL_READY: >
    El contrato ya define suficientemente el comportamiento físico.

  PHYSICALLY_READY: >
    Runtime existente puede participar sin modificación sustantiva.

  ADAPTER_REQUIRED: >
    Contratos son suficientes pero falta bridge/mapping físico.

  IMPLEMENTATION_REQUIRED: >
    Falta runtime físico con semántica ya definida.

  REQUIRES_G2: >
    Hace falta decisión arquitectónica humana.

  REQUIRES_G3: >
    Hace falta nuevo contrato arquitectónico.

  CONFIG_REQUIRED: >
    Falta configuración/credencial/secreto, no semántica.

  SOURCE_GAP: >
    No existe fuente/tool productiva adecuada.

  BLOCKER: >
    Impide un vertical slice real seguro.

architectural_invariants:
  - "real user text is not automatically N1 fact"
  - "WhatsApp is not an epistemic source merely because a message arrived"
  - "AcquisitionStatus remains separate from ObservationRecord"
  - "MINIMAL_EXECUTION_ENVELOPE remains the 03A input boundary"
  - "OP owns AcquisitionStatus/ObservationRecord mapping"
  - "EB consumes OP output, not raw tool responses"
  - "Reasoning consumes IES only"
  - "CP remains presentation, not truth"
  - "no source identity invention"
  - "no business absence inferred from technical empty"
  - "tool errors remain technical failures"
  - "no credentials inside IES/RE/CP"
  - "no channel-specific semantics inside N1-N5"

required_report_sections:
  - "1. Executive verdict"
  - "2. Contracts inspected"
  - "3. Existing runtime inspected"
  - "4. Current real-input gap"
  - "5. D1-D20 findings"
  - "6. Productive runtime map"
  - "7. MINIMAL_EXECUTION_ENVELOPE matrix"
  - "8. AcquisitionStatus mapping matrix"
  - "9. Existing source/tool candidates"
  - "10. Provenance and traceability"
  - "11. Entity-resolution boundary"
  - "12. Chat/WhatsApp boundary"
  - "13. Server/runtime composition boundary"
  - "14. Security/config boundary"
  - "15. Minimum real vertical slice"
  - "16. G2/G3 dependency map"
  - "17. Blockers"
  - "18. Recommended implementation scope"
  - "19. GO/CONDITIONAL-GO/NO-GO"
  - "20. STOP"

acceptance_criteria:
  - "D1-D20 audited"
  - "real runtime path mapped"
  - "envelope ownership identified"
  - "existing producer presence/absence proven"
  - "status mapping ownership identified"
  - "provenance path defined"
  - "trace_id ownership identified"
  - "chat/WhatsApp boundary preserved"
  - "server boundary analyzed"
  - "candidate real sources compared"
  - "minimum vertical slice identified"
  - "G2/G3/config/source gaps separated"
  - "no G8 introduced"
  - "no contracts modified"
  - "no runtimes modified"
  - "git diff --check clean"
  - "only CURRENT_TASK and report changed"
  - "exactly one recommended implementation scope"

allowed_actions:
  - "read contracts"
  - "read existing runtimes"
  - "read tests/fixtures"
  - "read server/package/config references"
  - "inspect existing tool/source integrations"
  - "classify physical readiness"
  - "create docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"
  - "update CURRENT_TASK through permitted transitions"
  - "run existing tests if needed"
  - "run git diff --check"

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify runtime"
  - "modify tests/fixtures"
  - "modify server/package/config"
  - "create adapters"
  - "create real tool execution"
  - "create secrets"
  - "wire WhatsApp"
  - "wire chat"
  - "create implementation task"
  - "commit"
  - "push"
  - "merge"
  - "autoapprove G2/G3"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría identifica un vertical slice productivo
  seguro y el alcance exacto de una futura implementación sin inventar
  epistemología. BLOCKED/STOPPED si no existe fuente/tool real utilizable o si
  se requiere nueva arquitectura no autorizada para siquiera definir el slice.

implementation_followup_rule: >
  Ninguna implementación de real input puede crearse desde esta tarea.
  HUMAN_APPROVER debe revisar primero el veredicto, gates y vertical slice.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"