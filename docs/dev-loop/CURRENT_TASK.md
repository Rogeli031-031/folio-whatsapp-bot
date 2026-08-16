# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-OP-EB-EKS-INTEGRATION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-16T11:05:51-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-16"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Integrar y validar de forma controlada el flujo técnico completo
  Observation Pipeline -> Evidence Builder -> Executive Knowledge Store,
  utilizando únicamente fixtures sintéticos y runtimes ya aprobados,
  demostrando que un MINIMAL_EXECUTION_ENVELOPE puede producir
  AcquisitionStatus + ObservationRecord, transformarse en Knowledge Bundle
  fail-closed y persistirse como Knowledge Snapshot sin pérdida de procedencia,
  sin bypass de capas y sin integrar todavía Tool Execution productivo,
  server.js, chat, dashboard ni fuentes reales.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-OP-EB-EKS-INTEGRATION-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"

  - "test/director-ia-observation-pipeline.test.js"
  - "test/director-ia-evidence-builder.test.js"
  - "test/director-ia-eks.test.js"
  - "test/director-ia-eks-integration.test.js"
  - "test/director-ia-op-eb-eks-integration.test.js"

  - "fixtures/director-ia/observation-pipeline/"
  - "fixtures/director-ia/evidence-builder/"
  - "fixtures/director-ia/eks/"
  - "fixtures/director-ia/op-eb-eks-integration/"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 03A"
  - "modificar 02"
  - "modificar 03"
  - "modificar 04"

  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"
  - "crear SQL"
  - "crear migraciones"
  - "crear tablas nuevas"

  - "implementar Tool Execution productivo"
  - "ejecutar tools productivas"
  - "leer fuentes productivas"
  - "leer datos empresariales reales"

  - "integrar chat"
  - "integrar dashboard"
  - "integrar WhatsApp"
  - "crear endpoints públicos"

  - "implementar IES runtime"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severidad"
  - "crear materiality productiva"
  - "crear reglas causales"
  - "crear reglas de ausencia productivas"

  - "generar hipótesis"
  - "añadir LLM"
  - "usar tools operacionales"

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
  - "docs/director-ia/04-IES-STANDARD.md"

existing_runtime_contract:
  observation_pipeline:
    entry: "MINIMAL_EXECUTION_ENVELOPE[]"
    output:
      - "acquisition_statuses[]"
      - "observation_records[]"
    constraints:
      - "no N2-N5"
      - "no ABSENCE_CONFIRMED"
      - "no silent dedup"
      - "no EKS"

  evidence_builder:
    entry:
      - "trace_id"
      - "plan"
      - "tool_plan"
      - "acquisition_statuses[]"
      - "observation_records[]"
    output: "Knowledge Bundle"
    constraints:
      - "fail-closed"
      - "N1 -> N2 -> N3 -> N4"
      - "sin G8"
      - "sin append_snapshot"

  eks:
    entry: "Knowledge Bundle"
    output: "Knowledge Snapshot"
    constraints:
      - "append-only"
      - "Bundle opaco"
      - "latest por trace_id"
      - "versionado monotónico"
      - "integrity digest"

integration_flow:
  - "MINIMAL_EXECUTION_ENVELOPE[]"
  - "Observation Pipeline process()"
  - "acquisition_statuses[] + observation_records[]"
  - "Evidence Builder assemble()"
  - "Knowledge Bundle"
  - "EKS validate_structure()"
  - "EKS append_snapshot()"
  - "Knowledge Snapshot"

integration_rules:
  - "ningún bypass de OP -> EB -> EKS"
  - "OP nunca llama EKS"
  - "EB no obtiene datos operacionales"
  - "EB no llama append_snapshot dentro de assemble"
  - "la capa de integración puede orquestar llamadas secuenciales"
  - "Bundle debe pasar validate_structure antes de persistirse"
  - "EKS no reinterpreta Bundle"
  - "procedencia de 03A debe sobrevivir hasta bundle.observations"
  - "content_author_id null debe sobrevivir hasta Snapshot"
  - "extracted_by y triggered_by no cambian de significado"
  - "AcquisitionStatus nunca debe aparecer dentro de bundle.observations"
  - "TOOL_ERROR no debe convertirse en hecho"
  - "SOURCE_RESTRICTED no debe convertirse en hecho"
  - "SOURCE_NOT_INTEGRATED debe poder terminar en NO_CONOZCO sin hechos"
  - "ACQUIRED_EMPTY no debe convertirse en ABSENCE_CONFIRMED"
  - "sin reglas G8, materiality sigue MATERIALITY_NOT_ASSESSED"
  - "sin reglas de resolución, no emitir RESOLVED"
  - "sin reglas N3/N4 autorizadas, evidence/diagnostics pueden permanecer vacíos"

integration_runtime:
  preferred_shape: "función/factory pura de orquestación para tests"
  required_interface:
    - "run_op_eb_eks(input, dependencies)"
  dependencies:
    - "observation_pipeline"
    - "evidence_builder"
    - "eks"
  constraints:
    - "dependencias inyectables"
    - "sin server.js"
    - "sin singleton global"
    - "sin DB productiva en tests"
    - "puede usar EKS in-memory/test implementation ya existente"
    - "sin networking"

required_scenarios:
  scenario_a:
    name: "ACQUIRED_OK transportable"
    expected:
      - "OP produce status + ObservationRecord"
      - "EB produce N1 y N2 permitido por runtime vigente"
      - "Bundle válido"
      - "EKS produce Snapshot v1"
      - "procedencia preservada"

  scenario_b:
    name: "SOURCE_NOT_INTEGRATED"
    expected:
      - "OP produce AcquisitionStatus"
      - "cero ObservationRecords de negocio"
      - "EB produce NO_CONOZCO"
      - "cero facts/evidence/diagnostics"
      - "Bundle válido"
      - "EKS persiste Snapshot válido"

  scenario_c:
    name: "ACQUIRED_EMPTY"
    expected:
      - "no ABSENCE_CONFIRMED"
      - "no hecho negativo inventado"
      - "Bundle fail-closed"
      - "Snapshot válido"

  scenario_d:
    name: "TOOL_ERROR"
    expected:
      - "no ObservationRecord empresarial"
      - "no facts inventados"
      - "source_health conserva fallo técnico"
      - "Snapshot válido cuando el Bundle contractual sea emitible"

  scenario_e:
    name: "versionado"
    expected:
      - "dos ejecuciones con mismo trace_id pueden producir Snapshot v1 y v2"
      - "v1 permanece inmutable"
      - "get_snapshot(trace_id) devuelve latest"
      - "list_versions conserva historial"

fixtures_required:
  - "happy-path.json"
  - "source-not-integrated.json"
  - "acquired-empty.json"
  - "tool-error.json"
  - "same-trace-v1.json"
  - "same-trace-v2.json"

fixture_rules:
  - "todos sintéticos"
  - "sin datos institucionales reales"
  - "sin cobertura institucional implícita"
  - "sin reglas G8 inventadas"
  - "sin causalidad"
  - "sin hipótesis"

tests_required:
  - "flujo OP -> EB -> EKS completo funciona con fixture happy-path"
  - "procedencia 03A permanece en bundle.observations"
  - "procedencia permanece después de persistencia EKS"
  - "content_author_id null permanece null end-to-end"
  - "AcquisitionStatus no aparece en bundle.observations"
  - "SOURCE_NOT_INTEGRATED produce NO_CONOZCO sin facts"
  - "TOOL_ERROR no produce facts"
  - "ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED"
  - "sin G8 no aparece MAT_LOW/MAT_MEDIUM/MAT_HIGH/MAT_CRITICAL inventado"
  - "sin ruleset no aparece RESOLVED inventado"
  - "Bundle pasa validate_structure"
  - "append_snapshot recibe exclusivamente Knowledge Bundle válido"
  - "Snapshot preserva Bundle sin reinterpretación"
  - "dos snapshots mismo trace_id incrementan version"
  - "snapshot v1 permanece inmutable después de v2"
  - "get_snapshot(trace_id) retorna latest"
  - "list_versions retorna historial ordenado"
  - "input original no se muta"
  - "OP tests existentes continúan pasando"
  - "EB tests existentes continúan pasando"
  - "EKS tests existentes continúan pasando"

acceptance_criteria:
  - "test de integración OP-EB-EKS creado"
  - "fixtures de integración sintéticos creados"
  - "flujo técnico completo demostrado"
  - "todos los tests OP pasan"
  - "todos los tests EB pasan"
  - "todos los tests EKS pasan"
  - "todos los tests de integración pasan"
  - "git diff --check sin errores"

  - "ningún docs/director-ia modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "sin Tool Execution productivo"
  - "sin DB productiva"
  - "sin LLM"
  - "sin chat/dashboard"
  - "sin IES/Reasoning/Projection"

  - "sin bypass OP -> EKS"
  - "sin AcquisitionStatus dentro de bundle.observations"
  - "sin ABSENCE_CONFIRMED inventado"
  - "sin RESOLVED inventado"
  - "sin materiality productiva inventada"
  - "sin hipótesis"

  - "reporte documenta frontera end-to-end y gaps restantes"

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtimes OP/EB/EKS existentes"
  - "crear test/director-ia-op-eb-eks-integration.test.js"
  - "crear fixtures/director-ia/op-eb-eks-integration/"
  - "crear un helper de integración solo si es estrictamente necesario dentro de un archivo nuevo explícitamente de integración"
  - "usar implementaciones in-memory/test ya existentes"
  - "ejecutar tests OP"
  - "ejecutar tests EB"
  - "ejecutar tests EKS"
  - "ejecutar tests integración"
  - "ejecutar git diff --check"
  - "crear docs/dev-loop/reports/IMPL-OP-EB-EKS-INTEGRATION-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar Planner"
  - "modificar Tool Orchestrator"
  - "implementar Tool Execution"
  - "leer datos productivos"
  - "usar DB productiva"
  - "usar red"
  - "usar LLM"
  - "usar tools productivas"
  - "integrar chat/dashboard"
  - "crear IES"
  - "crear Reasoning Engine"
  - "crear Channel Projection"
  - "calibrar G8"
  - "inventar reglas epistemológicas"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la integración técnica OP -> EB -> EKS puede demostrarse
  de extremo a extremo sin modificar contratos ni integrar fuentes productivas.
  BLOCKED o STOPPED si completar la integración exige redefinir contratos,
  introducir Tool Execution productivo, modificar server.js o inventar
  decisiones epistemológicas.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-OP-EB-EKS-INTEGRATION-001.md"
```