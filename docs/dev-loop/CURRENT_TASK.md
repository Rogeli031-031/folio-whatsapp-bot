# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-DIRECTOR-IA-E2E-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T13:43:53-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar y demostrar un flujo end-to-end in-memory del Director IA:
  MINIMAL_EXECUTION_ENVELOPE -> Observation Pipeline -> Evidence Builder ->
  EKS -> IES Builder -> Reasoning Engine -> Channel Projection, usando
  fixtures sintéticos y adapters fake determinísticos, sin proveedor real,
  networking, tools productivas ni cambios contractuales.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-E2E-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"
  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "lib/director-ia-channel-projection.js (solo lectura)"

  - "lib/director-ia-e2e.js"
  - "test/director-ia-e2e.test.js"
  - "fixtures/director-ia/e2e/"

  - "test/director-ia-observation-pipeline.test.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "test/director-ia-reasoning-engine.test.js (solo lectura)"
  - "test/director-ia-channel-projection.test.js (solo lectura)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar runtimes existentes"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"

  - "integrar proveedor LLM real"
  - "usar networking"
  - "usar API keys"
  - "usar tools productivas"
  - "consultar DB operacional"
  - "consultar fuentes externas"

  - "crear persistencia IES"
  - "crear persistencia Reasoning Run"
  - "crear persistencia Channel Projection"
  - "crear SQL/migraciones"

  - "integrar WhatsApp real"
  - "integrar Chat real"
  - "integrar Voice real"
  - "integrar Dashboard real"
  - "integrar Report real"
  - "integrar Presentation real"

  - "crear memoria conversacional"
  - "crear WhoAmI"
  - "crear small talk"
  - "crear conversational orchestrator"

  - "crear N6"
  - "inventar N1-N5"
  - "recalcular materiality/confidence/severity"
  - "crear probability scoring"
  - "resolver conflictos"
  - "fabricar evidence N3"

  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

pipeline:
  steps:
    - "MINIMAL_EXECUTION_ENVELOPE"
    - "Observation Pipeline"
    - "acquisition_statuses[] + observation_records[]"
    - "Evidence Builder"
    - "Knowledge Bundle"
    - "EKS validate_structure"
    - "EKS append_snapshot"
    - "Knowledge Snapshot"
    - "IES Builder"
    - "IES OFFICIAL"
    - "Reasoning Engine"
    - "Reasoning Result + Reasoning Run"
    - "Channel Projection"
    - "Projection Model + Channel Output Envelope"

required_runtime_interface:
  factory: >
    createDirectorIaE2e({ op, eb, eks, iesBuilder, reasoningEngine,
    channelProjection, modelAdapter, clock, idFactory })
  primary_operation: >
    run({ executionEnvelope, queryContextMetadata, session, channel,
    projectionDepth })

integration_rules:
  - "helper/orchestrator no reimplementa semántica de capas"
  - "cada runtime existente conserva ownership"
  - "no mutar inputs"
  - "no bypass de EKS/IES"
  - "Reasoning consume IES, no Bundle/Snapshot"
  - "Channel Projection consume IES + Reasoning Result opcional"
  - "AcquisitionStatus nunca entra como fact"
  - "NO_KNOWLEDGE permanece visible hasta canal"
  - "Tipo E permanece visible hasta canal"
  - "sin evidence N3 productiva -> cero hypothesis y recommendation sustantiva"
  - "Channel Projection no rellena ausencia N5"

fake_adapter_rules:
  - "determinístico"
  - "sin networking"
  - "sin provider SDK"
  - "sin API keys"
  - "puede devolver candidato vacío válido"
  - "puede devolver candidato sintético válido solo con fixture que contenga evidence explícita"
  - "no declara que EB productivo ya produzca N3"

required_scenarios:
  - "happy-path-no-evidence"
  - "no-knowledge"
  - "source-not-integrated"
  - "tool-error"
  - "type-e-conflict"
  - "synthetic-reasoning-with-evidence"

scenario_expectations:

  happy-path-no-evidence:
    - "flujo completo termina en Channel Output"
    - "IES válido"
    - "Reasoning Result con cero hypotheses"
    - "Reasoning Result con cero recommendations"
    - "Projection Model válido"
    - "no se fabrica N3"

  no-knowledge:
    - "NO_KNOWLEDGE preservado"
    - "sin hipótesis sustantiva"
    - "sin recommendation sustantiva"
    - "Channel Projection lo clasifica IRRENUNCIABLE/P0"

  source-not-integrated:
    - "SOURCE_NOT_INTEGRATED no se convierte en inexistencia"
    - "NO_CONOZCO/fail-closed preservado"
    - "limitación visible en salida"

  tool-error:
    - "TOOL_ERROR no se convierte en vacío empresarial"
    - "sin facts inventados"
    - "limitación visible"

  type-e-conflict:
    - "Tipo E visible en IES"
    - "Tipo E visible en Reasoning"
    - "Tipo E IRRENUNCIABLE/P0 en Projection"

  synthetic-reasoning-with-evidence:
    - "fixture sintético puede demostrar hypothesis post-validation"
    - "supporting facts/evidence existen"
    - "no implica N3 productiva real"
    - "projection conserva separación fact/hypothesis/recommendation"

required_output:
  fields:
    - "trace_id"
    - "acquisition_statuses"
    - "observation_records"
    - "knowledge_bundle"
    - "knowledge_snapshot"
    - "ies"
    - "reasoning_result"
    - "reasoning_run"
    - "projection_model"
    - "channel_output"

traceability_requirements:
  - "trace_id preservado"
  - "snapshot_id preservado"
  - "ies_id preservado"
  - "ies_version preservado"
  - "reasoning run anclado a ies_id/version"
  - "projection anclada a ies_id/reasoning_run_id"
  - "procedencia N1 no mutada"
  - "content_author_id null permanece null"

fail_closed_requirements:
  - "ACQUIRED_EMPTY != ABSENCE_CONFIRMED"
  - "TOOL_ERROR != vacío de negocio"
  - "SOURCE_NOT_INTEGRATED != inexistencia"
  - "NO_KNOWLEDGE != permiso para completar"
  - "sin evidence -> cero hypothesis"
  - "sin evidence -> cero recommendation"
  - "provider failure -> abstention/reject"
  - "Channel Projection no rellena N5"
  - "IRRENUNCIABLE no se omite"

fixtures_required:
  - "happy-path-no-evidence.json"
  - "no-knowledge.json"
  - "source-not-integrated.json"
  - "tool-error.json"
  - "type-e-conflict.json"
  - "synthetic-reasoning-with-evidence.json"

fixture_rules:
  - "todos sintéticos"
  - "sin datos institucionales reales"
  - "sin G8"
  - "sin proveedor real"
  - "sin networking"
  - "sin nueva epistemología"

tests_required:
  - "factory expone run"
  - "flujo completo happy path llega a Channel Output"
  - "trace_id se preserva end-to-end"
  - "snapshot_id se preserva"
  - "ies_id/version se preservan"
  - "reasoning_run referencia IES exacto"
  - "projection referencia IES/run exactos"
  - "AcquisitionStatus no entra en facts"
  - "content_author_id null sobrevive hasta Snapshot/IES donde aplique"
  - "happy path real sin evidence -> cero hypotheses"
  - "happy path real sin evidence -> cero recommendations"
  - "NO_KNOWLEDGE llega IRRENUNCIABLE/P0"
  - "SOURCE_NOT_INTEGRATED no afirma inexistencia"
  - "TOOL_ERROR no afirma vacío"
  - "Tipo E llega IRRENUNCIABLE/P0"
  - "synthetic evidence permite validar hypothesis N5"
  - "hypothesis nunca entra a IES"
  - "Channel Projection distingue fact/hypothesis"
  - "provider fake no usa network"
  - "runtime e2e no contiene provider SDK/tool calls"
  - "inputs no se mutan"
  - "runtimes existentes no se modifican"
  - "tests OP/EB/EKS/IES/RE/CP continúan pasando"

acceptance_criteria:
  - "lib/director-ia-e2e.js creado"
  - "test/director-ia-e2e.test.js creado"
  - "fixtures e2e creados"
  - "flujo OP->EB->EKS->IES->RE->CP demostrado"
  - "helper solo orquesta"
  - "sin semántica duplicada"
  - "sin networking"
  - "sin provider real"
  - "sin integración canal real"
  - "fail-closed preservado"
  - "traceability end-to-end preservada"
  - "NO_KNOWLEDGE preservado"
  - "Tipo E preservado"
  - "sin evidence real -> cero hypothesis/recommendation"
  - "fixture sintético con evidence no se presenta como realidad productiva"
  - "ningún docs/director-ia modificado"
  - "ningún runtime existente modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "tests e2e pasan"
  - "regresión completa pasa"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtimes/tests/fixtures existentes"
  - "crear lib/director-ia-e2e.js"
  - "crear test/director-ia-e2e.test.js"
  - "crear fixtures/director-ia/e2e/"
  - "crear docs/dev-loop/reports/IMPL-DIRECTOR-IA-E2E-001.md"
  - "ejecutar tests e2e"
  - "ejecutar regresión completa"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar runtimes existentes"
  - "modificar server.js"
  - "modificar package.json"
  - "usar network"
  - "usar provider real"
  - "usar tools productivas"
  - "usar DB operacional"
  - "crear SQL/migraciones"
  - "integrar canales reales"
  - "crear memoria/WhoAmI/small talk"
  - "crear nueva semántica"
  - "calibrar G8"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el flujo completo puede demostrarse in-memory con
  fixtures sintéticos y fake adapter sin modificar contratos ni runtimes
  existentes.
  BLOCKED o STOPPED si completar el flujo exige cambio contractual, provider
  real, canal real o nueva semántica.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-E2E-001.md"