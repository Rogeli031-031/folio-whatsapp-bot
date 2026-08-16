# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-OP-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T21:59:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER — D1-D15 APPROVED; G1 + G2 AUTHORIZED"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y formalizar las decisiones físicas mínimas necesarias para una
  futura implementación del Observation Pipeline (03A), cerrando los UNKNOWN
  detectados por ARCH-OP-PHYSICAL-DECISIONS-001 sin implementar runtime,
  sin introducir epistemología nueva y sin modificar componentes fuera de
  los contratos expresamente autorizados por G2.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

out_of_scope:
  - "implementar Observation Pipeline"
  - "crear lib/director-ia-observation-pipeline.js"
  - "crear tests OP"
  - "crear fixtures OP"
  - "implementar Tool Execution"
  - "modificar Evidence Builder runtime"
  - "modificar EKS runtime"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar chat o dashboard"
  - "persistir Knowledge Bundles"
  - "integrar OP productivamente con EB"
  - "integrar OP con EKS"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 02-EVIDENCE-BUILDER.md"
  - "modificar 03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "modificar 03B-END-TO-END-REFERENCE-FLOWS.md"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar 06-CHANNEL-PROJECTION.md"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severidad"
  - "crear materiality productiva"
  - "crear reglas causales"
  - "crear contratos de tool que prueben inexistencia"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-OP-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"

proposed_human_decisions:

  D1_runtime_interface:
    decision: "PURE_FACTORY"
    meaning: >
      Observation Pipeline se realiza como módulo puro/factory inyectable,
      desacoplado de server.js y de cualquier fuente productiva. Recibe
      Tool Execution Results ya ejecutados y produce dos listas hermanas:
      acquisition_statuses[] y observation_records[].

  D2_tool_execution_result_envelope:
    decision: "MINIMAL_EXECUTION_ENVELOPE"
    meaning: >
      Mientras no exista runtime productivo de Tool Execution, OP consume un
      envelope mínimo de realización física que contiene identidad de ejecución,
      tool_id, domain, trace_id, estado técnico, payload o referencia al payload,
      timestamps de ejecución disponibles y metadatos de alcance/entidad.
      Este envelope no constituye N1 ni verdad empresarial.

  D3_acquisition_status_shape:
    decision: "EXPLICIT_STATUS_OBJECT"
    meaning: >
      AcquisitionStatus es un objeto técnico separado con, como mínimo:
      trace_id, tool_id, domain, status, execution_id o correlación equivalente,
      scope_complete cuando corresponda, entity_resolution_state cuando
      corresponda, error metadata no sensible cuando exista y timestamps
      técnicos disponibles. No contiene facts, confidence, materiality,
      coverage ni ABSENCE_CONFIRMED.

  D4_status_enum:
    decision: "USE_03A_ENUM_ONLY"
    meaning: >
      status solo puede usar los estados definidos por 03A:
      ACQUIRED_OK, ACQUIRED_EMPTY, SOURCE_NOT_INTEGRATED, SOURCE_RESTRICTED,
      TOOL_ERROR, QUERY_SCOPE_INCOMPLETE y ENTITY_UNRESOLVED.
      La implementación no crea estados nuevos silenciosamente.

  D5_status_record_cardinality:
    decision: "ONE_STATUS_ZERO_TO_MANY_RECORDS"
    meaning: >
      Cada intento de tool/dominio produce exactamente un AcquisitionStatus.
      Un ACQUIRED_OK puede producir cero, uno o múltiples ObservationRecords
      transportables. Los estados puramente técnicos normalmente producen cero
      ObservationRecords. La correlación se preserva mediante trace_id,
      tool_id y execution/correlation id.

  D6_observation_creation:
    decision: "TRANSPORTABLE_BUSINESS_RESULT_ONLY"
    meaning: >
      ObservationRecord se crea únicamente para resultado de negocio
      transportable conforme a 03A. TOOL_ERROR, SOURCE_RESTRICTED,
      SOURCE_NOT_INTEGRATED, QUERY_SCOPE_INCOMPLETE y ENTITY_UNRESOLVED no
      generan ObservationRecord de entidad canónica inventada.

  D7_empty_behavior:
    decision: "ACQUIRED_EMPTY_FAIL_CLOSED"
    meaning: >
      ACQUIRED_EMPTY produce AcquisitionStatus técnico. Puede producir un
      registro de transporte vacío solo cuando el contrato 03A lo permita y
      nunca implica ABSENCE_CONFIRMED. La decisión empresarial de ausencia
      pertenece exclusivamente al Evidence Builder.

  D8_identity_generation:
    decision: "PRESERVE_UPSTREAM_GENERATE_OPAQUE_OBSERVATION_IDS"
    meaning: >
      OP preserva trace_id, tool_id, execution/correlation identifiers y demás
      ids upstream. Observation_id puede generarse como identificador opaco
      único y testeable. No se congela UUID/hash como obligación contractual.

  D9_provenance:
    decision: "PRESERVE_WITHOUT_SUBSTITUTION"
    meaning: >
      source.system, source_family, source_instance_id, content_author_id,
      extracted_by y triggered_by se preservan como identidades distintas.
      content_author_id null permanece null. extracted_by y triggered_by nunca
      sustituyen autoría.

  D10_raw_normalized_payload:
    decision: "RAW_REFERENCE_PLUS_NORMALIZED_VIEW"
    meaning: >
      El payload original permanece inmutable y auditado mediante
      raw_payload_reference. normalized_payload es una vista de procesamiento
      determinística que no elimina la referencia al original ni inventa
      semántica empresarial.

  D11_entity_resolution:
    decision: "FAIL_CLOSED_ENTITY_RESOLUTION"
    meaning: >
      Solo RESOLVED permite emitir subject.entity_id canónico. AMBIGUOUS y
      UNRESOLVED preservan original_value, candidatos/regla si existen y no
      eligen silenciosamente una entidad. ENTITY_UNRESOLVED permanece status
      técnico cuando no existe sujeto transportable.

  D12_retries_and_deduplication:
    decision: "NO_SILENT_DEDUP_V1"
    meaning: >
      OP v1 no elimina silenciosamente ejecuciones o ObservationRecords
      repetidos. Retries deben conservar correlación y trazabilidad. La
      deduplicación semántica no pertenece a OP. Si una capa futura necesita
      idempotencia operacional, deberá definirse explícitamente sin destruir
      lineage ni evidencia de repetición.

  D13_ordering_and_time:
    decision: "INPUT_ORDER_STABLE_AND_CLOCK_INJECTABLE"
    meaning: >
      La salida preserva un orden determinístico derivado del input o de una
      clave técnica estable. pipeline_received_at se obtiene mediante reloj
      inyectable/testeable; no participa en decisiones semánticas. extracted_at
      se preserva desde upstream cuando exista.

  D14_validation_boundary:
    decision: "STRUCTURAL_AND_TRANSPORT_VALIDATION_ONLY"
    meaning: >
      OP valida estructura, procedencia mínima, transportabilidad, scope y
      resolución declarada. No valida verdad empresarial, confidence,
      materiality, Knowledge Coverage ni ABSENCE_CONFIRMED. Esas materias
      permanecen fuera del OP.

  D15_implementation_order:
    decision: "FIXTURES_FIRST_THEN_OP_TO_EB"
    meaning: >
      IMPL-OP-001 podrá implementarse primero contra fixtures sintéticos de
      Tool Execution Results. Una tarea posterior verificará OP -> EB. Tool
      Execution productivo, server.js, chat, dashboard y escritura EKS quedan
      fuera hasta autorización separada.

contractual_registration:
  target_document:
    - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  rule: >
    Registrar únicamente la realización física mínima D1-D15 que sea necesaria
    para eliminar UNKNOWN de implementación. No redefinir la separación
    AcquisitionStatus / ObservationRecord ni ninguna propiedad de EB/EKS.
  tool_execution_schema_rule: >
    El MINIMAL_EXECUTION_ENVELOPE se registra como frontera física de entrada
    del OP, no como nuevo nivel epistemológico ni como contrato de verdad
    empresarial.

g8_reserved_and_unchanged:
  - "wi"
  - "k"
  - "Fs"
  - "ventanas R"
  - "severidad"
  - "materiality productiva"
  - "reglas causales"
  - "contratos de tool que prueban inexistencia"

allowed_actions:
  - "leer contracts_in_force"
  - "leer ARCH-OP-PHYSICAL-DECISIONS-001.md"
  - "comparar proposed_human_decisions con 03A y contratos superiores"
  - "si G1 y G2 son autorizados, modificar únicamente 03A-OBSERVATION-PIPELINE.md"
  - "crear docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-002.md"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar contratos fuera de 03A"
  - "reinterpretar D1-D15"
  - "introducir nuevas decisiones arquitectónicas"
  - "calibrar G8"
  - "implementar Observation Pipeline"
  - "crear código"
  - "crear tests"
  - "crear fixtures"
  - "modificar server.js"
  - "modificar package.json"
  - "integrar componentes"
  - "crear IMPL-OP-001"
  - "autoaprobar G1"
  - "autoaprobar G2"
  - "escribir AUTHORIZED_BY_HUMAN"
  - "commit"
  - "push"
  - "merge"
  - "encadenar otra tarea"

acceptance_criteria:
  - "D1-D15 quedan registrados sin reinterpretación"
  - "los UNKNOWN de Tool Execution Results, AcquisitionStatus, retries y reloj quedan cerrados"
  - "AcquisitionStatus y ObservationRecord permanecen separados"
  - "OP sigue sin autoridad epistemológica N2-N5"
  - "ACQUIRED_EMPTY sigue sin equivaler a ABSENCE_CONFIRMED"
  - "content_author_id/extracted_by/triggered_by permanecen separados"
  - "no existe deduplicación silenciosa"
  - "pipeline_received_at no determina semántica"
  - "solo 03A puede modificarse bajo G2"
  - "no se crea runtime"
  - "no se modifica código"
  - "no se calibra G8"
  - "no se crea IMPL-OP-001"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

expected_terminal_state: >
  DONE_PENDING_REVIEW si HUMAN_APPROVER autoriza G1 + G2 y las decisiones pueden
  formalizarse sin contradicción contractual. BLOCKED o STOPPED si alguna
  decisión propuesta contradice los contratos superiores o requiere una nueva
  decisión humana.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-002.md"
```