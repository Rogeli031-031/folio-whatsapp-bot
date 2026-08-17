# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-IES-001"
status: CLOSE

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T09:51:56-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el runtime mínimo, puro, determinístico y fail-closed del IES
  Builder conforme a docs/director-ia/04-IES-STANDARD.md v1.0 y a las decisiones
  físicas registradas por ARCH-IES-PHYSICAL-DECISIONS-002. La primera
  implementación soporta únicamente IES OFFICIAL en memoria desde un
  Knowledge Snapshot completo, sin persistencia física IES, sin ALTERNATIVE,
  sin Reasoning Engine y sin Channel Projection.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IES-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"

  - "lib/director-ia-ies-builder.js"
  - "test/director-ia-ies-builder.test.js"
  - "fixtures/director-ia/ies/"

  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"

  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "test/director-ia-observation-pipeline.test.js (solo lectura)"
  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar contratos"
  - "modificar EKS runtime"
  - "modificar EB runtime"
  - "modificar OP runtime"
  - "modificar integración OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"

  - "crear persistencia física IES"
  - "crear tablas IES"
  - "crear SQL/migraciones"
  - "implementar repositorio IES"
  - "implementar supersesión durable"
  - "implementar expiración institucional"

  - "implementar ies_type=ALTERNATIVE"
  - "implementar alternative_context productivo"
  - "implementar comparison_with_official"

  - "implementar Reasoning Engine"
  - "implementar Channel Projection"
  - "integrar chat"
  - "integrar dashboard"
  - "integrar WhatsApp"
  - "integrar voz"

  - "usar LLM"
  - "consultar fuentes"
  - "ejecutar tools productivas"
  - "leer datos productivos"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severity"
  - "crear materiality productiva"
  - "crear reglas causales"
  - "crear reglas de ausencia"

  - "implementar firma digital"
  - "cambiar signature=null"
  - "cambiar signature_status=NOT_IMPLEMENTED"
  - "congelar algoritmo de firma"

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
  input_boundary: "SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA"
  snapshot_extension: "MINIMAL_QUERY_METADATA_EXTENSION"
  canonicalization: "JCS_LIKE_DETERMINISTIC_CANONICAL_JSON_V1"
  canonical_token: "CANONICAL_JSON_V1"
  fingerprint: "DETERMINISTIC_DIGEST_IMPLEMENTATION_NOT_SIGNATURE"
  fingerprint_verification: "RECOMPUTABLE_FINGERPRINT"
  fingerprint_order: "GENERATE_THEN_FINGERPRINT"
  builder_interface: "FACTORY_WITH_INJECTED_CLOCK_AND_ID_FACTORY"
  first_runtime_scope: "OFFICIAL_IN_MEMORY_PROJECTION_FIRST"
  ies_version_initial: "INITIAL_VERSION_1"
  expiration: "EXPIRES_AT_NULL_UNTIL_POLICY"
  alternative: "OFFICIAL_ONLY_V1"
  summary: "FAIL_CLOSED_CONTROLLED_REFERENCES"
  limitations: "PROJECT_ONLY_EXPLICIT_LIMITATIONS"
  executive_scope: "PROJECT_FROM_QUERY_METADATA_AND_SNAPSHOT_SCOPE"

required_runtime_interface:
  factory: "createIesBuilder(options)"
  primary_operation: "build(snapshot)"
  optional_operation: "validate(ies)"
  output: "IES OFFICIAL v1.0 completo"

builder_dependencies:
  clock:
    required: true
    purpose: "generated_at / valid_at determinísticos y testeables"
  idFactory:
    required: true
    purpose: "ies_id opaco y testeable"
  digest:
    required: false
    rule: >
      Puede usar una implementación criptográfica adecuada disponible en runtime
      si no agrega dependencia nueva. El algoritmo concreto queda documentado
      en reporte y no se presenta como firma digital.

input_rules:
  - "entrada única = Knowledge Snapshot"
  - "snapshot debe contener bundle"
  - "snapshot debe contener snapshot_id"
  - "snapshot debe contener version"
  - "snapshot debe contener query_context_metadata"
  - "IES Builder no recibe Planner/chat/request runtime como segunda entrada"
  - "IES Builder no consulta EKS por sí solo"
  - "IES Builder no consulta OP/EB"
  - "IES Builder no consulta fuentes"
  - "IES Builder no muta Snapshot"

query_context_rules:
  - "proyectar únicamente desde snapshot.query_context_metadata"
  - "preservar executive_query_id"
  - "preservar query_fingerprint si existe"
  - "preservar trace_id"
  - "preservar original_question"
  - "preservar intent"
  - "preservar requesting_user_id"
  - "preservar requesting_role"
  - "preservar channel"
  - "preservar plant_or_scope cuando aplique"
  - "preservar period cuando aplique"
  - "preservar resolved_entities[]"
  - "preservar permission_restrictions[]"
  - "preservar knowledge_effective_date"
  - "no inventar campos faltantes obligatorios"
  - "no re-resolver entidades"
  - "no recalcular permisos"

root_contract_rules:
  ies_id:
    source: "idFactory"
  ies_type:
    value: "OFFICIAL"
  schema_version:
    value: "1.0"
  ies_version:
    value: 1
  status:
    source: "mapeo determinístico coverage -> lifecycle"
  generated_at:
    source: "clock"
  valid_at:
    source: "clock o knowledge_effective_date conforme implementación documentada"
  expires_at:
    value: null
  snapshot_reference:
    source: "snapshot.snapshot_id"
  knowledge_snapshot_version:
    source: "snapshot.version"
  query_context:
    source: "snapshot.query_context_metadata"
  executive_scope:
    source: "query_context_metadata + scope explícito del Snapshot/Bundle"
  knowledge_coverage:
    source: "Bundle/Snapshot"
  executive_summary_facts:
    source: "proyección fail-closed de referencias controladas"
  facts:
    source: "Bundle facts"
  evidence:
    source: "Bundle evidence"
  diagnoses:
    source: "Bundle diagnoses"
  conflicts:
    source: "Bundle conflicts"
  open_questions:
    source: "Bundle open_questions"
  source_health:
    source: "Bundle source_health"
  limitations:
    source: "limitaciones explícitas / mapeos contractuales exactos"
  audit:
    source: "IES Builder + Snapshot"
  integrity:
    source: "CANONICAL_JSON_V1 + digest"
  alternative_context:
    value: null

coverage_status_mapping:
  CONOZCO:
    coverage_token: "COV_FULL_KNOWLEDGE"
    status: "VALIDATED"
  CONOZCO_PARCIALMENTE:
    coverage_token: "COV_PARTIAL_KNOWLEDGE"
    status: "PARTIAL"
  EXISTE_CONFLICTO:
    coverage_token: "COV_DATA_CONFLICT"
    status: "CONFLICTED"
  NO_CONOZCO:
    coverage_token: "COV_NO_KNOWLEDGE"
    status: "NO_KNOWLEDGE"

coverage_rules:
  - "no crear quinto estado"
  - "no usar COV_TOTAL_IGNORANCE"
  - "coverage_score no se inventa"
  - "highest_materiality_detected = máximo determinista de MAT_* ya evaluados"
  - "ignorar MATERIALITY_NOT_ASSESSED al buscar máximo"
  - "si no hay MAT_* evaluados -> MATERIALITY_NOT_ASSESSED"
  - "NO_CONOZCO permite facts/evidence/diagnoses vacíos"

bank_projection_rules:
  facts:
    - "proyectar sin reinterpretación semántica"
    - "supporting_observation_ids deben preservarse"
    - "materiality solo se copia"
  evidence:
    - "supporting_fact_ids deben apuntar a facts existentes"
    - "causal_status solo se copia"
    - "IES no eleva causalidad"
  diagnoses:
    - "refs facts/evidence deben existir"
    - "IES no crea diagnóstico"
  conflicts:
    - "resolution_status solo se proyecta"
    - "IES no cambia OPEN/UNDER_REVIEW/RESOLVED/SUPERSEDED"
    - "CONF_TYPE_E_GOVERNANCE nunca se omite"
  open_questions:
    - "priority se preserva"
    - "no materiality inventada"

source_health_mapping:
  ACQUIRED_OK: "DATA_AVAILABLE"
  ACQUIRED_EMPTY: "DATA_NOT_FOUND"
  SOURCE_NOT_INTEGRATED: "SOURCE_NOT_INTEGRATED"
  SOURCE_RESTRICTED: "SOURCE_RESTRICTED"
  TOOL_ERROR: "TOOL_ERROR"
  QUERY_SCOPE_INCOMPLETE: "QUERY_SCOPE_INCOMPLETE"
  ENTITY_UNRESOLVED: "ENTITY_UNRESOLVED"

source_health_rules:
  - "no confundir DATA_NOT_FOUND con ABSENCE_CONFIRMED"
  - "no confundir TOOL_ERROR con vacío"
  - "no confundir SOURCE_NOT_INTEGRATED con inexistencia"
  - "no recalcular coverage"
  - "raw_payload_reference puede proyectarse; no incluir payload raw completo"

summary_rules:
  - "no prosa narrativa libre"
  - "no causalidad libre"
  - "no ranking inventado"
  - "solo statement_token + statement_reference + IDs soporte"
  - "incluir CONF_TYPE_E_GOVERNANCE si existe"
  - "incluir limitaciones bloqueantes cuando haya mapping contractual inequívoco"
  - "si no existe criterio contractual suficiente para otro resumen, no inventarlo"

limitations_rules:
  - "solo explícitas o derivables por mapping contractual exacto"
  - "sin redacción libre"
  - "SOURCE_NOT_INTEGRATED puede generar limitación tipificada"
  - "SOURCE_RESTRICTED puede generar limitación tipificada"
  - "TOOL_ERROR puede generar limitación tipificada"
  - "ENTITY_UNRESOLVED puede generar limitación tipificada"
  - "si no existe token/reference contractual suficiente, fail-closed"

canonical_json_v1:
  token: "CANONICAL_JSON_V1"
  rules:
    - "orden lexicográfico de claves de objeto"
    - "arrays preservan orden contractual"
    - "JSON UTF-8 determinístico"
    - "sin espacios insignificantes"
    - "null explícito cuando contrato lo exige"
    - "undefined prohibido"
    - "NaN/Infinity prohibidos"
    - "no convertir números a strings"
    - "no normalizar semánticamente strings"
    - "no ordenar bancos dentro del canonicalizer"

fingerprint_scope:
  include:
    - "todo el contenido semántico raíz del IES"
    - "audit"
    - "integrity.snapshot_reference"
    - "integrity.signature_status"
  exclude:
    - "integrity.content_fingerprint"
    - "integrity.canonical_representation"
    - "integrity.signature"

integrity_rules:
  - "canonical_representation = CANONICAL_JSON_V1"
  - "content_fingerprint = digest criptográfico determinista"
  - "signature = null"
  - "signature_status = NOT_IMPLEMENTED"
  - "digest != firma digital"
  - "misma semántica -> misma huella"
  - "mutación de contenido incluido -> huella distinta"
  - "generar campos finales antes de fingerprint"

audit_rules:
  generated_by: "ies_builder"
  source_snapshot_ids: "debe incluir snapshot.snapshot_id"
  previous_ies_id: null
  supersedes_ies_id: null
  engine_version:
    rule: >
      Usar una constante explícita de implementación no presentada como versión
      institucional si el contrato no la aporta.
  ruleset_version:
    rule: >
      Proyectar la versión disponible en Snapshot/Bundle cuando exista; no
      inventar ruleset productivo.

validation_rules:
  - "contrato raíz completo"
  - "schema_version = 1.0"
  - "ies_type = OFFICIAL"
  - "alternative_context = null"
  - "signature = null"
  - "signature_status = NOT_IMPLEMENTED"
  - "coverage_token/state mapping válido"
  - "status compatible con coverage"
  - "evidence refs -> facts existentes"
  - "diagnosis refs -> facts/evidence existentes"
  - "conflict facts_in_tension -> facts existentes"
  - "executive_summary references -> IDs existentes o limitaciones existentes"
  - "CONF_TYPE_E_GOVERNANCE visible si existe"
  - "snapshot_reference coincide entre raíz e integrity"
  - "content_fingerprint recomputable"

fixtures_required:
  - "official-no-knowledge.json"
  - "official-partial.json"
  - "official-conflicted-type-e.json"
  - "official-full-minimal.json"

fixture_rules:
  - "todos sintéticos / ilustrativos"
  - "sin datos institucionales reales"
  - "sin calibraciones G8"
  - "sin causalidad inventada"
  - "sin firma digital"
  - "Snapshot debe incluir query_context_metadata"

tests_required:
  - "factory expone build"
  - "build acepta únicamente Knowledge Snapshot"
  - "Snapshot sin query_context_metadata obligatorio falla controladamente"
  - "query_context se proyecta sin segunda entrada"
  - "OFFICIAL + alternative_context null"
  - "schema_version 1.0"
  - "ies_version 1"
  - "expires_at null"
  - "coverage CONOZCO -> VALIDATED"
  - "coverage CONOZCO_PARCIALMENTE -> PARTIAL"
  - "coverage EXISTE_CONFLICTO -> CONFLICTED"
  - "coverage NO_CONOZCO -> NO_KNOWLEDGE"
  - "NO_KNOWLEDGE permite bancos vacíos"
  - "source_health mapping exacto"
  - "DATA_NOT_FOUND no se convierte en ABSENCE_CONFIRMED"
  - "materiality no se recalcula"
  - "highest_materiality_detected fail-closed"
  - "Tipo E permanece visible"
  - "resolution_status no cambia"
  - "summary no inventa narrativa/ranking"
  - "limitaciones no inventan prosa"
  - "canonical JSON estable ante orden distinto de claves"
  - "arrays conservan orden"
  - "NaN/Infinity/undefined rechazados"
  - "fingerprint estable para misma semántica"
  - "fingerprint cambia al mutar contenido incluido"
  - "fingerprint ignora sus campos excluidos según contrato"
  - "signature null"
  - "signature_status NOT_IMPLEMENTED"
  - "digest no se etiqueta como firma"
  - "input Snapshot no se muta"
  - "tests existentes OP/EB/EKS/integración continúan pasando"

acceptance_criteria:
  - "lib/director-ia-ies-builder.js creado"
  - "test/director-ia-ies-builder.test.js creado"
  - "fixtures IES sintéticos creados"
  - "runtime únicamente OFFICIAL in-memory"
  - "entrada única Snapshot"
  - "query_context desde query_context_metadata"
  - "sin segunda entrada operacional"
  - "schema raíz completo"
  - "CANONICAL_JSON_V1 implementado"
  - "content_fingerprint recomputable"
  - "signature null"
  - "signature_status NOT_IMPLEMENTED"
  - "NO_KNOWLEDGE válido"
  - "Tipo E visible"
  - "sin ALTERNATIVE"
  - "sin persistencia IES"
  - "sin Reasoning Engine"
  - "sin Channel Projection"
  - "sin LLM"
  - "sin fuentes/tools"
  - "sin G8"
  - "ningún docs/director-ia modificado"
  - "server.js no modificado"
  - "package.json no modificado"
  - "tests IES pasan"
  - "tests OP/EB/EKS/integración existentes pasan"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtimes y tests existentes declarados in_scope"
  - "crear lib/director-ia-ies-builder.js"
  - "crear test/director-ia-ies-builder.test.js"
  - "crear fixtures/director-ia/ies/"
  - "crear docs/dev-loop/reports/IMPL-IES-001.md"
  - "ejecutar tests IES"
  - "ejecutar suites OP/EB/EKS/integración existentes"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar runtime OP/EB/EKS/integración"
  - "modificar server.js"
  - "modificar package.json"
  - "crear SQL/migraciones"
  - "usar DB"
  - "implementar persistencia IES"
  - "implementar ALTERNATIVE"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"
  - "usar LLM"
  - "usar tools productivas"
  - "leer datos productivos"
  - "calibrar G8"
  - "implementar firma digital"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"
  - "autoaprobar gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el IES Builder OFFICIAL in-memory puede implementarse
  completamente desde Knowledge Snapshot sin modificar contratos ni inventar
  metadata, reglas epistemológicas, persistencia o calibraciones. BLOCKED o
  STOPPED si completar el contrato raíz exige información no disponible en
  Snapshot o una nueva decisión arquitectónica.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IES-001.md"