# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EB-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T21:34:26-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el runtime mínimo, puro y determinístico del Evidence Builder
  conforme a 02-EVIDENCE-BUILDER.md v2.1, consumiendo fixtures contractuales
  compatibles con 03A, produciendo Knowledge Bundles compatibles con
  03-EXECUTIVE-KNOWLEDGE-STORE.md v1.3 y respetando estrictamente las
  decisiones físicas D1-D15 ya formalizadas, sin integrar todavía Observation
  Pipeline productivo, server.js, chat, dashboard ni persistencia automática
  en EKS.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EB-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-builder/"

  - "lib/director-ia-eks.js (solo lectura; validate_structure puede usarse desde tests para validar la frontera)"
  - "fixtures/director-ia/eks/case-a-03b.json (solo lectura)"
  - "fixtures/director-ia/eks/case-b-03b.json (solo lectura)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar Evidence Builder contract"
  - "modificar Observation Pipeline contract"
  - "modificar EKS contract"
  - "modificar IES contract"

  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env.example"
  - "crear SQL o migraciones"
  - "crear tablas"
  - "usar PostgreSQL"
  - "persistir Knowledge Bundles"
  - "llamar append_snapshot"
  - "integrar EB con createEksRuntime"

  - "implementar Observation Pipeline"
  - "implementar Tool Execution"
  - "integrar Fases 1-3 con EB"
  - "integrar chat"
  - "integrar dashboard"
  - "implementar IES"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"

  - "leer datos productivos"
  - "llamar tools"
  - "llamar LLM"
  - "generar hipótesis"
  - "crear lenguaje causal no autorizado"

  - "calibrar wi"
  - "calibrar k"
  - "fijar Fs productivo por tool/dominio"
  - "fijar ventanas R"
  - "fijar umbrales productivos de severidad"
  - "crear ruleset productivo de materiality"
  - "crear reglas causales"
  - "crear contratos de tool que prueben inexistencia"

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
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"

approved_physical_decisions:
  D1_interface: "I2"
  D2_input: "E1"
  D2_bundle_observations: "N1_WRAPS_03A"
  D3_level_progression: "SEQUENTIAL_BARRIERS"
  D4_rule_registry: "R_MOD_EMPTY_GOVERNED_SETS"
  D5_ids_traceability: "OPAQUE_TRACEABLE_IDS"
  D6_lineage_cb: "PRESERVE_FULL_03A_LINEAGE_NO_K"
  D7_confidence: "DIMENSIONS_WITHOUT_FALSE_PRECISION"
  D8_absence: "FAIL_CLOSED"
  D9_conflict_resolution: "LITERAL_STATE_MACHINE"
  D10_materiality: "NOT_ASSESSED_UNTIL_G8"
  D11_purity: "PURE_NO_SIDE_EFFECTS"
  D12_eks_boundary: "EB_SEMANTICS_PLUS_EKS_STRUCTURE"
  D13_fixtures: "03B_PLUS_MINIMAL_03A_FAIL_CLOSED_CASES"
  D14_order: "EB_FIXTURES_FIRST_OP_BEFORE_PRODUCTION"
  D15_registration: "REGISTER_MINIMUM_PHYSICAL_BOUNDARY"

g8_reserved_and_unavailable:
  - "wi"
  - "k"
  - "Fs productivo"
  - "ventanas R"
  - "umbrales productivos de severidad"
  - "ruleset productivo de materiality"
  - "reglas causales"
  - "contratos de tool que prueban inexistencia"

required_runtime_interfaces:
  - "to_n1(input)"
  - "to_n2(n1, context)"
  - "to_n3(n2, context)"
  - "to_n4(n3, context)"
  - "emit_bundle(stages, context)"
  - "assemble(input)"

required_input_shape:
  trace_id: "string no vacío"
  plan: "objeto o referencia trazable"
  tool_plan: "objeto o referencia trazable"
  acquisition_statuses: "array separado; nunca fusionado dentro de ObservationRecord"
  observation_records: "array de ObservationRecord 03A transportables"

n1_rules:
  - "cada ObservationRecord transportable produce como máximo una Observación N1 correspondiente"
  - "AcquisitionStatus nunca se convierte por sí solo en Observación N1"
  - "preservar observation_id y trace_id"
  - "preservar source.system"
  - "preservar source.content_author_id incluido null"
  - "preservar source.source_family"
  - "preservar source.source_instance_id"
  - "preservar extracted_by"
  - "preservar triggered_by"
  - "preservar raw_payload_reference"
  - "preservar lineage y procedencia sin reinterpretar"
  - "normalized_payload puede usarse para procesamiento pero no sustituye referencia al original"
  - "quality y absence_state solo pueden surgir conforme a reglas EB"
  - "no inventar content_author_id"
  - "no interpretar payload"
  - "no generar hipótesis"

n2_rules:
  - "ningún hecho sin Observación N1 soporte"
  - "DATA_NOT_FOUND no afirma ausencia"
  - "ACQUIRED_EMPTY se trata fail-closed"
  - "ABSENCE_CONFIRMED no puede emitirse sin cumplir las seis condiciones de 02 §10.3"
  - "mientras no existan contratos de tool + applied_absence_rule_id, no emitir ABSENCE_CONFIRMED"
  - "confidence pertenece al hecho"
  - "exponer dimensiones Fs, R, Cb, Cs, Cb_ov sin producto calibrado"
  - "no inventar wi"
  - "no inventar k"
  - "no inventar Fs ni ventanas R"
  - "MATERIALITY_NOT_ASSESSED mientras no exista ruleset G8"

n3_rules:
  - "ninguna evidencia sin hechos soporte"
  - "applied_rule obligatorio cuando exista evidencia"
  - "registry causal vacío"
  - "no producir causalidad informal"
  - "no usar probablemente, quizá o inferencia"
  - "sin reglas determinísticas autorizadas, evidence puede permanecer vacío"

n4_rules:
  - "ningún diagnóstico sin regla y soporte"
  - "classification_criterion obligatorio"
  - "sin reglas de diagnóstico autorizadas, diagnostics puede permanecer vacío"
  - "no inventar severidad productiva"
  - "no suavizar Tipo E"
  - "no generar hipótesis"

rule_registry_initial_state:
  evidence_rules: "vacío salvo reglas explícitamente existentes en contratos"
  absence_rules: "vacío"
  resolution_rules: "vacío"
  causal_rules: "vacío"
  materiality_rules: "vacío"
  ruleset_version: "evidence-builder-2.1-physical-v1"

conflict_rules:
  - "resolution_status enum exacto: OPEN | UNDER_REVIEW | RESOLVED | SUPERSEDED"
  - "weight_assessment nunca resuelve"
  - "sin applied_resolution_rule_id no emitir RESOLVED"
  - "SUPERSEDED no equivale a RESOLVED"
  - "Tipo E OPEN o UNDER_REVIEW nunca se oculta"
  - "sin ruleset de resolución, conflicto tipificado permanece OPEN cuando corresponda"

materiality_rules:
  - "sin ruleset calibrado: MATERIALITY_NOT_ASSESSED"
  - "applied_materiality_rule_id = null cuando no evaluado"
  - "no convertir MATERIALITY_NOT_ASSESSED en MAT_LOW"
  - "NO_CONOZCO con bancos vacíos no inventa materiality"

bundle_rules:
  - "producer debe ser evidence_builder"
  - "bundle.observations contiene Observaciones N1 emitidas por EB"
  - "bundle.observations nunca contiene AcquisitionStatus"
  - "facts contiene únicamente N2"
  - "evidence contiene únicamente N3"
  - "diagnostics contiene únicamente N4"
  - "conflicts preserva conflictos válidos"
  - "open_questions usa estructura contractual de 02"
  - "source_health deriva de AcquisitionStatus sin convertirlo en verdad empresarial"
  - "coverage debe respetar contrato vigente; EB no inventa quinto estado"
  - "Bundle debe pasar validate_structure de EKS"
  - "EB no llama append_snapshot"

purity_rules:
  - "misma entrada + mismo registry versionado -> mismo resultado semántico"
  - "no mutar input"
  - "no usar reloj ambiental para decisiones semánticas"
  - "no hacer I/O operacional"
  - "no usar DB"
  - "no usar red"
  - "no usar LLM"
  - "no usar tools"
  - "no escribir EKS"
  - "IDs pueden ser inyectables/testeables para preservar determinismo"

fixtures_required:
  - "case-a-input-03a.json"
  - "case-b-input-03a.json"
  - "acquired-empty.json"
  - "tool-error.json"
  - "source-restricted.json"
  - "entity-unresolved.json"
  - "conflict-open.json"

fixture_rules:
  - "todos los fixtures son sintéticos/ilustrativos"
  - "no representan cobertura institucional real"
  - "no inventar reglas productivas para hacerlos pasar"
  - "03B A/B son referencia de forma esperada, no datos productivos"

tests_required:
  - "assemble conserva separación acquisition_statuses / observation_records"
  - "03A ObservationRecord -> N1 preserva procedencia y lineage"
  - "content_author_id null permanece null"
  - "extracted_by nunca se convierte en autor"
  - "triggered_by nunca se convierte en fuente de afirmación"
  - "N1 no muta ObservationRecord de entrada"
  - "ningún N2 sin N1"
  - "ningún N3 sin N2"
  - "ningún N4 sin regla y soporte"
  - "ACQUIRED_EMPTY no produce ABSENCE_CONFIRMED"
  - "TOOL_ERROR no se convierte en vacío de negocio"
  - "SOURCE_RESTRICTED no produce hecho"
  - "ENTITY_UNRESOLVED no inventa entidad canónica"
  - "sin G8 se emite MATERIALITY_NOT_ASSESSED donde corresponda"
  - "sin reglas de resolución no se emite RESOLVED"
  - "Tipo E no se suaviza ni oculta"
  - "Bundle producer = evidence_builder"
  - "bundle.observations contiene N1 y no AcquisitionStatus"
  - "Bundle emitido pasa EKS validate_structure"
  - "EB no llama append_snapshot"
  - "input original permanece sin mutación"

acceptance_criteria:
  - "git diff --check sin errores"
  - "todos los tests de Evidence Builder pasan"
  - "tests existentes de EKS continúan pasando"
  - "ningún contrato en docs/director-ia/ modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "no hay SQL ni migraciones nuevas"
  - "no hay integración productiva"
  - "no se calibra G8"
  - "no existe ABSENCE_CONFIRMED inventado"
  - "no existe RESOLVED inventado"
  - "no existe MAT_* inventado"
  - "no existe causalidad no autorizada"
  - "Bundle producido es estructuralmente aceptado por EKS"
  - "reporte documenta cualquier gap que impida completar semántica N2-N4"

allowed_actions:
  - "leer contracts_in_force"
  - "crear lib/director-ia-evidence-builder.js"
  - "crear test/director-ia-evidence-builder.test.js"
  - "crear fixtures/director-ia/evidence-builder/"
  - "leer lib/director-ia-eks.js"
  - "leer fixtures EKS A/B"
  - "ejecutar tests EB"
  - "ejecutar tests EKS existentes"
  - "ejecutar git diff --check"
  - "crear docs/dev-loop/reports/IMPL-EB-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar EKS runtime"
  - "crear SQL"
  - "crear migraciones"
  - "usar base de datos"
  - "llamar append_snapshot"
  - "integrar OP"
  - "integrar chat/dashboard"
  - "calibrar G8"
  - "inventar reglas productivas"
  - "crear hipótesis"
  - "usar LLM"
  - "usar tools"
  - "leer datos productivos"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el runtime mínimo puede implementarse respetando
  contratos y modo fail-closed. BLOCKED o STOPPED si para completar el runtime
  mínimo resulta necesario inventar una regla, calibración G8 o modificar
  contratos.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EB-001.md"