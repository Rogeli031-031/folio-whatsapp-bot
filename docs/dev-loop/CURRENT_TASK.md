# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-OP-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T22:29:09-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el runtime mínimo, puro, determinístico y fail-closed del
  Observation Pipeline conforme a 03A-OBSERVATION-PIPELINE.md v1.4,
  consumiendo fixtures sintéticos de MINIMAL_EXECUTION_ENVELOPE y produciendo
  las dos listas hermanas acquisition_statuses[] y observation_records[].
  Verificar estructuralmente la frontera OP -> Evidence Builder sin integrar
  todavía Tool Execution productivo, server.js, chat, dashboard, base de datos
  ni escritura en EKS.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-OP-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js"
  - "test/director-ia-observation-pipeline.test.js"
  - "fixtures/director-ia/observation-pipeline/"

  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "fixtures/director-ia/evidence-builder/ (solo lectura)"

  - "lib/director-ia-eks.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar contratos"
  - "modificar Evidence Builder runtime"
  - "modificar EKS runtime"
  - "modificar Fase 1"
  - "modificar Planner"
  - "modificar Tool Orchestrator"

  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"
  - "crear SQL"
  - "crear migraciones"
  - "usar PostgreSQL"

  - "implementar Tool Execution productivo"
  - "ejecutar tools productivas"
  - "leer fuentes productivas"
  - "leer datos empresariales productivos"

  - "integrar OP con server.js"
  - "integrar OP con chat"
  - "integrar OP con dashboard"
  - "integrar OP con EKS"
  - "llamar append_snapshot"

  - "convertir OP en productor de N2"
  - "convertir OP en productor de N3"
  - "convertir OP en productor de N4"
  - "convertir OP en productor de N5"
  - "decidir Knowledge Coverage"
  - "decidir confidence"
  - "decidir materiality"
  - "emitir ABSENCE_CONFIRMED"

  - "deduplicación semántica"
  - "deduplicación silenciosa"
  - "inventar entidad canónica"
  - "inventar autor de contenido"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severidad"
  - "crear materiality productiva"
  - "crear reglas causales"

  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"

approved_physical_decisions:
  D1_runtime_interface: "PURE_FACTORY"
  D2_tool_execution_result_envelope: "MINIMAL_EXECUTION_ENVELOPE"
  D3_acquisition_status_shape: "EXPLICIT_STATUS_OBJECT"
  D4_status_enum: "USE_03A_ENUM_ONLY"
  D5_status_record_cardinality: "ONE_STATUS_ZERO_TO_MANY_RECORDS"
  D6_observation_creation: "TRANSPORTABLE_BUSINESS_RESULT_ONLY"
  D7_empty_behavior: "ACQUIRED_EMPTY_FAIL_CLOSED"
  D8_identity_generation: "PRESERVE_UPSTREAM_GENERATE_OPAQUE_OBSERVATION_IDS"
  D9_provenance: "PRESERVE_WITHOUT_SUBSTITUTION"
  D10_raw_normalized_payload: "RAW_REFERENCE_PLUS_NORMALIZED_VIEW"
  D11_entity_resolution: "FAIL_CLOSED_ENTITY_RESOLUTION"
  D12_retries_and_deduplication: "NO_SILENT_DEDUP_V1"
  D13_ordering_and_time: "INPUT_ORDER_STABLE_AND_CLOCK_INJECTABLE"
  D14_validation_boundary: "STRUCTURAL_AND_TRANSPORT_VALIDATION_ONLY"
  D15_implementation_order: "FIXTURES_FIRST_THEN_OP_TO_EB"

required_runtime_interface:
  factory: "createObservationPipeline(options)"
  primary_operation: "process(execution_results)"
  output:
    acquisition_statuses: "array"
    observation_records: "array"

runtime_rules:
  - "runtime puro/factory inyectable"
  - "sin I/O operacional"
  - "sin DB"
  - "sin red"
  - "sin LLM"
  - "sin tools"
  - "sin escritura EKS"
  - "sin dependencia de server.js"
  - "no mutar inputs"
  - "reloj inyectable/testeable"
  - "generador observation_id inyectable/testeable"
  - "misma entrada + mismas dependencias inyectadas -> salida semánticamente equivalente"

minimal_execution_envelope:
  required_or_supported_fields:
    - "trace_id"
    - "tool_id"
    - "domain"
    - "status"
    - "execution_id o correlación equivalente"
    - "payload y/o raw_payload_reference cuando exista"
    - "timestamps técnicos disponibles"
    - "source metadata disponible"
    - "entity/scope metadata cuando corresponda"
  invariants:
    - "no es N1"
    - "no es ObservationRecord"
    - "no es hecho empresarial"
    - "no expresa confidence"
    - "no expresa materiality"
    - "no expresa Knowledge Coverage"
    - "no expresa ABSENCE_CONFIRMED"

allowed_statuses:
  - "ACQUIRED_OK"
  - "ACQUIRED_EMPTY"
  - "SOURCE_NOT_INTEGRATED"
  - "SOURCE_RESTRICTED"
  - "TOOL_ERROR"
  - "QUERY_SCOPE_INCOMPLETE"
  - "ENTITY_UNRESOLVED"

acquisition_status_rules:
  - "exactamente un AcquisitionStatus por intento/envelope procesado"
  - "preservar trace_id"
  - "preservar tool_id"
  - "preservar domain"
  - "preservar execution/correlation id"
  - "preservar status del enum 03A"
  - "scope_complete solo cuando corresponda"
  - "entity_resolution_state solo cuando corresponda"
  - "error metadata no sensible solo cuando exista"
  - "timestamps técnicos disponibles pueden preservarse"
  - "pipeline_received_at usa reloj inyectable"
  - "no contiene facts"
  - "no contiene confidence"
  - "no contiene materiality"
  - "no contiene coverage"
  - "no contiene ABSENCE_CONFIRMED"

observation_record_rules:
  - "solo resultado de negocio transportable produce ObservationRecord"
  - "ACQUIRED_OK puede producir cero, uno o múltiples ObservationRecords"
  - "ObservationRecord preserva trace_id y correlación upstream"
  - "observation_id es opaco y generado mediante dependencia inyectable"
  - "no congelar UUID/hash como algoritmo contractual"
  - "preservar source.system"
  - "preservar source.source_family"
  - "preservar source.source_instance_id"
  - "preservar source.content_author_id incluso null"
  - "preservar extracted_by"
  - "preservar triggered_by"
  - "preservar raw_payload_reference"
  - "normalized_payload es vista determinística de procesamiento"
  - "no eliminar referencia al payload original"
  - "no interpretar normalized_payload como hecho N2"
  - "no generar confidence"
  - "no generar materiality"
  - "no generar coverage"
  - "no generar hipótesis"

non_transport_rules:
  - "TOOL_ERROR -> AcquisitionStatus; cero ObservationRecords de negocio"
  - "SOURCE_RESTRICTED -> AcquisitionStatus; cero ObservationRecords de negocio"
  - "SOURCE_NOT_INTEGRATED -> AcquisitionStatus; cero ObservationRecords de negocio"
  - "QUERY_SCOPE_INCOMPLETE -> AcquisitionStatus; no afirmar cobertura completa"
  - "ENTITY_UNRESOLVED -> no inventar subject.entity_id canónico"
  - "ACQUIRED_EMPTY -> no emitir ABSENCE_CONFIRMED"
  - "DATA_NOT_FOUND si aparece dentro de payload no se eleva automáticamente a ausencia empresarial"

entity_resolution_rules:
  - "RESOLVED puede transportar entity_id canónico si upstream lo provee conforme a 03A"
  - "AMBIGUOUS no elige silenciosamente candidato"
  - "UNRESOLVED no inventa entity_id"
  - "preservar original_value cuando exista"
  - "preservar candidatos/regla aplicada cuando el contrato los contemple"
  - "extracted_by no sustituye content_author_id"
  - "triggered_by no sustituye content_author_id"

retry_and_dedup_rules:
  - "no silent dedup"
  - "cada envelope representa un intento auditable"
  - "retries conservan execution/correlation identifiers"
  - "dos inputs repetidos no se eliminan por conveniencia"
  - "OP no realiza deduplicación semántica"
  - "lineage de repetición debe preservarse"

ordering_and_time_rules:
  - "preservar orden estable del input salvo obligación contractual distinta"
  - "pipeline_received_at se obtiene de clock inyectable"
  - "pipeline_received_at no determina verdad ni semántica"
  - "extracted_at upstream se preserva cuando exista"
  - "tests deben poder fijar clock e id generator"

eb_boundary_rules:
  - "output OP conserva dos listas hermanas"
  - "acquisition_statuses[] se entrega separado"
  - "observation_records[] se entrega separado"
  - "no fusionar AcquisitionStatus dentro de ObservationRecord"
  - "output debe poder alimentar assemble() del EB mínimo existente"
  - "esta tarea puede verificar la frontera en tests"
  - "esta tarea no modifica EB"
  - "EB sigue siendo propietario de N1-N4"
  - "OP no llama EKS"

fixtures_required:
  - "acquired-ok-single.json"
  - "acquired-ok-multiple.json"
  - "acquired-empty.json"
  - "tool-error.json"
  - "source-restricted.json"
  - "source-not-integrated.json"
  - "query-scope-incomplete.json"
  - "entity-unresolved.json"
  - "entity-resolved.json"
  - "retry-pair.json"

fixture_rules:
  - "todos sintéticos"
  - "ninguno representa datos institucionales reales"
  - "ninguno prueba verdad empresarial"
  - "ninguno autoriza ABSENCE_CONFIRMED"
  - "ninguno calibra G8"

tests_required:
  - "factory expone process"
  - "process devuelve acquisition_statuses[] y observation_records[]"
  - "un envelope produce exactamente un AcquisitionStatus"
  - "solo enum 03A es aceptado"
  - "status desconocido falla estructuralmente"
  - "ACQUIRED_OK single produce ObservationRecord transportable"
  - "ACQUIRED_OK multiple puede producir múltiples ObservationRecords"
  - "ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED"
  - "TOOL_ERROR no produce ObservationRecord de negocio"
  - "SOURCE_RESTRICTED no produce ObservationRecord de negocio"
  - "SOURCE_NOT_INTEGRATED no produce ObservationRecord de negocio"
  - "QUERY_SCOPE_INCOMPLETE no afirma cobertura completa"
  - "ENTITY_UNRESOLVED no inventa entity_id"
  - "RESOLVED preserva entity_id upstream"
  - "content_author_id null permanece null"
  - "extracted_by no se convierte en autor"
  - "triggered_by no se convierte en autor"
  - "raw_payload_reference se preserva"
  - "normalized_payload no sustituye raw_payload_reference"
  - "input no se muta"
  - "clock es inyectable y determinístico"
  - "observation id generator es inyectable"
  - "retries no se deduplican silenciosamente"
  - "orden de salida es estable"
  - "OP no contiene append_snapshot"
  - "OP no importa ni usa EKS"
  - "output OP puede alimentar EB assemble sin modificar EB"
  - "frontera OP -> EB conserva listas hermanas"
  - "EB + EKS tests existentes continúan pasando"

acceptance_criteria:
  - "runtime OP mínimo implementado"
  - "fixtures sintéticos requeridos creados"
  - "tests OP pasan"
  - "tests EB existentes pasan"
  - "tests EKS existentes pasan"
  - "git diff --check sin errores"
  - "ningún docs/director-ia modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "EB runtime no modificado"
  - "EKS runtime no modificado"
  - "sin SQL ni migraciones"
  - "sin DB"
  - "sin Tool Execution productivo"
  - "sin datos productivos"
  - "sin ABSENCE_CONFIRMED producido por OP"
  - "sin N2-N5 producido por OP"
  - "sin deduplicación silenciosa"
  - "sin entidad canónica inventada"
  - "sin G8"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtime EB y tests EB"
  - "leer runtime EKS y tests EKS"
  - "crear lib/director-ia-observation-pipeline.js"
  - "crear test/director-ia-observation-pipeline.test.js"
  - "crear fixtures/director-ia/observation-pipeline/"
  - "crear docs/dev-loop/reports/IMPL-OP-001.md"
  - "ejecutar tests OP"
  - "ejecutar tests EB existentes"
  - "ejecutar tests EKS existentes"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar Evidence Builder"
  - "modificar EKS"
  - "modificar Planner"
  - "modificar Tool Orchestrator"
  - "crear SQL"
  - "crear migraciones"
  - "usar DB"
  - "usar red"
  - "usar LLM"
  - "ejecutar tools productivas"
  - "leer datos productivos"
  - "llamar append_snapshot"
  - "integrar server/chat/dashboard"
  - "emitir N2-N5"
  - "emitir ABSENCE_CONFIRMED"
  - "decidir coverage"
  - "decidir materiality"
  - "calibrar G8"
  - "deduplicar silenciosamente"
  - "inventar identidad canónica"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el runtime mínimo OP puede implementarse respetando
  03A v1.4 y las decisiones D1-D15 aprobadas. BLOCKED o STOPPED si completar
  el runtime exige modificar contratos, inventar semántica empresarial,
  ampliar autoridad epistemológica o realizar una decisión no autorizada.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-OP-001.md"
```