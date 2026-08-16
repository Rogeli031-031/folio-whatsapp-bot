# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A
objective: >
  Auditar la preparación física del Observation Pipeline (03A) para una futura
  implementación determinística y mínima, identificando las decisiones de
  realización necesarias entre Tool Execution Results, AcquisitionStatus,
  ObservationRecord y Evidence Builder, sin implementar runtime, sin modificar
  contratos y sin autoaprobar ninguna decisión arquitectónica.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"

  - "lib/director-ia-capabilities.js (solo lectura)"
  - "lib/director-ia-planner.js (solo lectura)"
  - "lib/director-ia-tools.js (solo lectura)"
  - "lib/director-ia-tool-orchestrator.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "server.js (solo lectura)"
  - "package.json (solo lectura)"

  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "fixtures/director-ia/evidence-builder/ (solo lectura)"
  - "fixtures/director-ia/eks/ (solo lectura)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar Evidence Builder"
  - "modificar EKS"
  - "modificar IES"

  - "crear runtime de Observation Pipeline"
  - "crear lib/director-ia-observation-pipeline.js"
  - "crear tests de implementación OP"
  - "crear fixtures nuevos de implementación OP"

  - "modificar server.js"
  - "modificar package.json"
  - "modificar Fase 1"
  - "modificar Planner"
  - "modificar Tool Orchestrator"
  - "modificar Evidence Builder runtime"
  - "modificar EKS runtime"

  - "implementar Tool Execution productivo"
  - "ejecutar tools productivas"
  - "leer datos productivos"
  - "integrar fuentes productivas"
  - "persistir Knowledge Bundles"
  - "llamar append_snapshot"

  - "integrar OP con chat"
  - "integrar OP con dashboard"
  - "integrar OP con server.js"
  - "integrar OP productivamente con EB"
  - "integrar OP productivamente con EKS"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severidad"
  - "crear ruleset productivo de materiality"
  - "crear reglas causales"
  - "crear contratos de tool que prueben inexistencia"

  - "añadir LLM"
  - "generar hipótesis"
  - "interpretar semánticamente resultados con IA"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-OP-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

known_runtime_state:
  capabilities: "soporte parcial existente"
  planner: "soporte parcial existente"
  tool_orchestrator: "plan declarativo existente; ejecución productiva no asumida"
  observation_pipeline: "runtime pendiente"
  evidence_builder: "runtime mínimo implementado; fail-closed"
  eks: "runtime implementado e integrado como servicio interno"
  ies: "runtime pendiente"
  reasoning_engine: "runtime pendiente"
  channel_projection: "runtime pendiente"

audit_principles:
  - "03A es propietario de ObservationRecord y AcquisitionStatus"
  - "AcquisitionStatus es técnico y no equivale a verdad empresarial"
  - "AcquisitionStatus nunca equivale por sí solo a ABSENCE_CONFIRMED"
  - "ObservationRecord y AcquisitionStatus permanecen separados"
  - "Evidence Builder consume ambas listas hermanas conforme a D2/E1"
  - "EB transforma ObservationRecords transportables en N1"
  - "OP no produce hechos N2"
  - "OP no produce evidencia N3"
  - "OP no produce diagnósticos N4"
  - "OP no produce hipótesis N5"
  - "OP no decide materiality"
  - "OP no decide coverage constitucional"
  - "OP no escribe EKS"
  - "OP no muta Knowledge Bundles"
  - "ningún LLM en OP"
  - "ninguna decisión debe rellenarse por conveniencia de implementación"

audit_questions:
  D1_runtime_interface:
    question: >
      ¿Cuál debe ser la interfaz física mínima del Observation Pipeline:
      función pura, factory inyectable, servicio interno u otra forma ya
      determinada por 03A?
    must_determine:
      - "inputs"
      - "outputs"
      - "dependencias inyectables"
      - "si existe estado interno permitido"
      - "frontera exacta con Tool Execution"

  D2_tool_execution_boundary:
    question: >
      ¿Cuál es la forma física exacta del objeto que OP recibe desde Tool
      Execution sin inventar un nuevo contrato?
    must_determine:
      - "qué existe hoy"
      - "qué define 03A"
      - "qué falta"
      - "si IMPL-OP puede usar fixtures antes de Tool Execution productivo"

  D3_acquisition_status_creation:
    question: >
      ¿Cómo se construye AcquisitionStatus determinísticamente a partir del
      resultado técnico de adquisición?
    must_determine:
      - "enum/status válidos"
      - "campos obligatorios"
      - "errores técnicos"
      - "vacíos"
      - "restricciones de fuente"
      - "entidad no resuelta"

  D4_observation_record_creation:
    question: >
      ¿Qué condiciones permiten crear un ObservationRecord y cuáles obligan a
      producir únicamente AcquisitionStatus sin observación?
    must_determine:
      - "resultado de negocio transportable"
      - "payload vacío"
      - "tool error"
      - "source restricted"
      - "entity unresolved"
      - "data not found"

  D5_status_record_cardinality:
    question: >
      ¿Cuál es la cardinalidad física entre ejecución/adquisición,
      AcquisitionStatus y ObservationRecord?
    must_determine:
      - "1:1"
      - "1:N"
      - "N:1 si estuviera permitido"
      - "cómo se preserva correlación"

  D6_identity_and_ids:
    question: >
      ¿Qué identificadores se preservan y cuáles puede generar OP sin congelar
      un algoritmo no autorizado?
    must_determine:
      - "trace_id"
      - "observation_id"
      - "source_instance_id"
      - "execution/tool identifiers"
      - "correlation identifiers"

  D7_provenance:
    question: >
      ¿Cómo se preservan físicamente source.system, source_family,
      source_instance_id, content_author_id, extracted_by, triggered_by y demás
      procedencia sin reinterpretación?
    must_determine:
      - "nulls"
      - "autor de contenido"
      - "extractor"
      - "actor disparador"
      - "fuente técnica"
      - "fuente de afirmación"

  D8_raw_and_normalized_payload:
    question: >
      ¿Qué puede normalizar OP y qué debe conservar como referencia al payload
      original?
    must_determine:
      - "raw_payload_reference"
      - "normalized_payload"
      - "mutación prohibida"
      - "pérdida de información"
      - "serialización determinística"

  D9_entity_resolution_boundary:
    question: >
      ¿Hasta dónde llega la resolución de entidades dentro de 03A y cuándo debe
      declararse ENTITY_UNRESOLVED sin inventar identidad canónica?
    must_determine:
      - "responsabilidad OP"
      - "dependencia externa si existe"
      - "fail-closed"
      - "trazabilidad de candidatos si el contrato la contempla"

  D10_error_and_empty_semantics:
    question: >
      ¿Cómo deben representarse TOOL_ERROR, ACQUIRED_EMPTY, DATA_NOT_FOUND,
      SOURCE_RESTRICTED y estados equivalentes sin convertirlos en afirmaciones
      empresariales?
    must_determine:
      - "status técnico"
      - "si existe ObservationRecord"
      - "qué llega al EB"
      - "qué jamás puede significar ABSENCE_CONFIRMED"

  D11_deduplication_and_retries:
    question: >
      ¿03A autoriza deduplicación, idempotencia o tratamiento de retries y, si
      lo hace, cuál es su realización física mínima?
    must_determine:
      - "duplicados técnicos"
      - "reintentos"
      - "misma observación recibida varias veces"
      - "si hace falta estado o registry"
      - "si la decisión está realmente cubierta por contrato"

  D12_ordering_and_determinism:
    question: >
      ¿Qué garantías de orden y determinismo necesita OP para que la misma
      entrada contractual produzca salida semánticamente equivalente?
    must_determine:
      - "orden de statuses"
      - "orden de records"
      - "timestamps"
      - "IDs"
      - "dependencia del reloj"
      - "mutación de inputs"

  D13_validation_boundary:
    question: >
      ¿Qué valida OP sobre entradas y salidas, y qué validación pertenece
      exclusivamente al EB?
    must_determine:
      - "estructura"
      - "procedencia"
      - "transportabilidad"
      - "semántica empresarial"
      - "ausencia"
      - "confidence"
      - "materiality"
      - "coverage"

  D14_fixture_and_test_strategy:
    question: >
      ¿Qué fixtures mínimos permiten implementar OP sin Tool Execution
      productivo y demostrar la frontera 03A -> EB?
    must_determine:
      - "resultado adquirido con negocio"
      - "ACQUIRED_EMPTY"
      - "TOOL_ERROR"
      - "SOURCE_RESTRICTED"
      - "ENTITY_UNRESOLVED"
      - "DATA_NOT_FOUND si contractualmente distinto"
      - "preservación de provenance"
      - "compatibilidad con fixtures EB existentes"

  D15_implementation_order_and_integration:
    question: >
      ¿Cuál debe ser el orden de implementación después de esta auditoría y qué
      debe permanecer desconectado?
    must_determine:
      - "IMPL-OP-001"
      - "fixtures primero"
      - "integración OP -> EB posterior o incluida solo si contrato la permite"
      - "Tool Execution productivo posterior"
      - "EKS no recibe OP directamente"
      - "server/chat/dashboard permanecen fuera hasta tarea autorizada"

required_audit_output:
  - "responder D1-D15 individualmente"
  - "citar contrato o evidencia de repo que soporte cada conclusión"
  - "separar CONTRACTUAL de RECOMMENDATION"
  - "marcar UNKNOWN cuando el repo no permita concluir"
  - "no convertir recomendaciones en decisiones APPROVED"
  - "identificar cualquier contradicción entre 03A, EB v2.1, EKS v1.3, 03B y runtime actual"
  - "identificar decisiones que requieran G2"
  - "identificar cualquier asunto reservado a G8"
  - "evaluar GO / NO-GO para preparar una futura IMPL-OP-001"
  - "no crear IMPL-OP-001"

required_repo_checks:
  - "confirmar rama distinta de main antes de editar"
  - "confirmar working tree inicial"
  - "leer AGENTS.md"
  - "leer LOOP_PROTOCOL.md"
  - "leer TASK_TEMPLATE.md"
  - "leer contratos en vigor relevantes"
  - "auditar código Fases 1-3 relacionado"
  - "auditar runtime EB existente"
  - "auditar frontera EKS solo cuando sea relevante"
  - "ejecutar git diff --check al finalizar"

acceptance_criteria:
  - "D1-D15 respondidas con evidencia"
  - "ninguna recomendación presentada como APPROVED"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "ningún test productivo modificado"
  - "ningún fixture productivo modificado"
  - "ningún asunto G8 calibrado"
  - "reporte obligatorio creado"
  - "git diff --check sin errores"
  - "CURRENT_TASK transicionado solo conforme LOOP_PROTOCOL"
  - "resultado termina en DONE_PENDING_REVIEW, BLOCKED o STOPPED"
  - "sin commit"
  - "sin push"
  - "sin merge"
  - "sin siguiente tarea"

allowed_actions:
  - "leer AGENTS.md"
  - "leer LOOP_PROTOCOL.md"
  - "leer TASK_TEMPLATE.md"
  - "leer contracts_in_force"
  - "leer código y tests declarados en in_scope"
  - "leer fixtures declarados en in_scope"
  - "comparar contrato con realidad del repo"
  - "formular recomendaciones D1-D15 no vinculantes"
  - "crear docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar git status"
  - "ejecutar git diff"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar lib/"
  - "modificar test/"
  - "modificar fixtures/"
  - "modificar server.js"
  - "modificar package.json"
  - "crear runtime OP"
  - "implementar Tool Execution"
  - "integrar OP con EB productivamente"
  - "integrar OP con EKS"
  - "usar DB"
  - "usar LLM"
  - "usar tools productivas"
  - "leer datos productivos"
  - "calibrar G8"
  - "autoaprobar D1-D15"
  - "autoaprobar G2"
  - "crear IMPL-OP-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría puede responder D1-D15 sin modificar
  contratos ni inventar decisiones. BLOCKED si una precondición del Loop impide
  realizar la auditoría. STOPPED si aparece una contradicción contractual que
  requiera intervención humana antes de continuar.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"
```