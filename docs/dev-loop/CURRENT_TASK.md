# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-IES-PHYSICAL-DECISIONS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-16T11:33:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-16"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar la realizabilidad física del IES Builder definido por
  docs/director-ia/04-IES-STANDARD.md v1.0 contra los contratos y runtimes
  actualmente existentes, identificar qué decisiones físicas ya están
  congeladas, cuáles permanecen UNKNOWN y cuáles requieren decisión humana
  antes de autorizar IMPL-IES-001, sin implementar runtime, sin modificar
  contratos y sin reinterpretar la epistemología vigente.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"

  - "test/director-ia-observation-pipeline.test.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"

  - "fixtures/director-ia/eks/ (solo lectura)"
  - "fixtures/director-ia/op-eb-eks-integration/ (solo lectura)"

out_of_scope:
  - "implementar IES Builder"
  - "crear lib/director-ia-ies*.js"
  - "crear runtime IES"
  - "crear fixtures IES productivos"
  - "crear tests de implementación IES"
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar contratos congelados"
  - "modificar OP"
  - "modificar Evidence Builder"
  - "modificar EKS"
  - "modificar helper OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"
  - "crear SQL"
  - "crear migraciones"
  - "crear tablas"
  - "persistir IES"
  - "integrar IES con server.js"
  - "integrar chat"
  - "integrar voz"
  - "integrar WhatsApp"
  - "integrar dashboard"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"
  - "generar hipótesis"
  - "usar LLM"
  - "consultar fuentes"
  - "ejecutar tools productivas"
  - "leer datos empresariales reales"
  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar materiality"
  - "crear reglas causales"
  - "implementar firma digital"
  - "congelar canonicalización por inferencia"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

known_runtime_chain:
  flow:
    - "MINIMAL_EXECUTION_ENVELOPE[]"
    - "Observation Pipeline"
    - "acquisition_statuses[] + observation_records[]"
    - "Evidence Builder"
    - "Knowledge Bundle"
    - "EKS validate_structure()"
    - "EKS append_snapshot()"
    - "Knowledge Snapshot"

  demonstrated:
    - "OP -> EB -> EKS integración end-to-end con fixtures sintéticos"
    - "procedencia preservada"
    - "fail-closed preservado"
    - "Knowledge Snapshot versionado"
    - "Snapshot inmutable"
    - "SOURCE_NOT_INTEGRATED puede terminar en NO_CONOZCO sin hechos"
    - "ACQUIRED_EMPTY no se convierte en ABSENCE_CONFIRMED"
    - "TOOL_ERROR no se convierte en hecho"
    - "sin G8 materiality permanece MATERIALITY_NOT_ASSESSED"

  missing:
    - "IES Builder runtime"
    - "Snapshot -> IES projection runtime"
    - "persistencia IES si contractualmente fuera requerida"
    - "Reasoning Engine"
    - "Channel Projection"

ies_contract_frozen_facts:
  - "IES v1.0 está APROBADO PARA CONGELAMIENTO"
  - "runtime IES está PENDIENTE"
  - "IES Builder es el productor"
  - "entrada única = Knowledge Snapshot"
  - "IES Builder no consulta fuentes"
  - "IES Builder no ejecuta tools"
  - "IES Builder no transforma Observaciones en Hechos"
  - "IES Builder no crea Evidencias"
  - "IES Builder no produce Hipótesis"
  - "IES Builder no contiene interpretación LLM"
  - "IES Builder no redacta explicaciones"
  - "IES no contiene hipótesis"
  - "IES es independiente del canal"
  - "canal no crea nueva versión"
  - "OFFICIAL y ALTERNATIVE son tipos distintos"
  - "IES emitido es inmutable"
  - "reproyección formal crea nueva versión / ies_id"
  - "COV_* se proyecta 1:1 a estados constitucionales"
  - "materiality solo se proyecta"
  - "MATERIALITY_NOT_ASSESSED no equivale a MAT_LOW"
  - "highest_materiality_detected solo usa MAT_* ya evaluados"
  - "correlación no se presenta como causalidad"
  - "ABSENCE_CONFIRMED es la única ausencia que permite hecho negativo"
  - "Tipo E nunca se suaviza ni se omite"
  - "resolution_status se proyecta; IES no lo muta"
  - "signature debe ser null en v1.0"
  - "signature_status debe ser NOT_IMPLEMENTED"
  - "digest no es firma digital"

audit_questions:
  D1_input_boundary:
    question: >
      ¿Cuál es la forma física exacta del Knowledge Snapshot que debe aceptar
      el IES Builder y qué parte del runtime EKS vigente constituye esa entrada?
    classify_as:
      - CONTRACTUAL
      - PHYSICAL_UNKNOWN
      - RECOMMENDATION

  D2_builder_interface:
    question: >
      ¿Existe contrato suficiente para fijar una interfaz física mínima del
      futuro IES Builder sin inventar arquitectura?
    candidate_shape_for_audit_only:
      - "createIesBuilder(dependencies)"
      - "build(snapshot, options)"
    rule: "la forma candidata no queda aprobada por esta auditoría"

  D3_snapshot_opacity:
    question: >
      ¿Debe IES Builder leer exclusivamente el Bundle contenido en el Snapshot
      y metadatos EKS explícitos, sin reinterpretar ni consultar capas previas?

  D4_root_mapping:
    question: >
      Para cada campo raíz obligatorio del IES §2, identificar su fuente física:
      Snapshot, Bundle, metadata EKS, dependencia inyectada, ruleset existente,
      o UNKNOWN.

  D5_query_context_mapping:
    question: >
      Determinar si executive_query_id, query_fingerprint, original_question,
      intent, requesting_user_id, requesting_role, channel, plant_or_scope,
      period, resolved_entities, permission_restrictions y
      knowledge_effective_date existen realmente en el Snapshot/Bundle vigente
      o requieren contrato/metadata adicional.

  D6_ies_identity:
    question: >
      Determinar origen físico de ies_id, ies_version, generated_at, valid_at
      y expires_at, incluyendo cuáles pueden ser dependencias inyectables y
      cuáles requieren política institucional.

  D7_status_projection:
    question: >
      Verificar si status puede derivarse determinísticamente del
      coverage_token existente sin decisión nueva:
      FULL->VALIDATED, PARTIAL->PARTIAL,
      DATA_CONFLICT->CONFLICTED, NO_KNOWLEDGE->NO_KNOWLEDGE.

  D8_summary_projection:
    question: >
      Determinar si executive_summary_facts puede construirse mecánicamente
      desde facts/evidence/diagnoses/conflicts/limitations existentes sin
      inventar reglas de prioridad, selección o materialidad.

  D9_source_health_projection:
    question: >
      Determinar si source_health del IES puede proyectarse completamente
      desde el Snapshot/Bundle actual y cómo mapear AcquisitionStatus:
      ACQUIRED_OK->DATA_AVAILABLE,
      ACQUIRED_EMPTY->DATA_NOT_FOUND,
      SOURCE_NOT_INTEGRATED->SOURCE_NOT_INTEGRATED,
      SOURCE_RESTRICTED->SOURCE_RESTRICTED,
      TOOL_ERROR->TOOL_ERROR,
      QUERY_SCOPE_INCOMPLETE->QUERY_SCOPE_INCOMPLETE,
      ENTITY_UNRESOLVED->ENTITY_UNRESOLVED.

  D10_internal_reference_validation:
    question: >
      Definir qué validaciones puramente estructurales puede realizar el
      IES Builder sobre references internas sin crear conocimiento:
      evidence->facts, diagnoses->facts/evidence, conflicts->facts,
      summary->IDs existentes y traceability.

  D11_materiality_projection:
    question: >
      Confirmar que IES Builder únicamente copia materiality existente y
      calcula highest_materiality_detected como máximo determinista de MAT_*
      ya evaluados; si no existen, MATERIALITY_NOT_ASSESSED.

  D12_conflict_visibility:
    question: >
      Determinar mecanismo físico para garantizar que CONF_TYPE_E_GOVERNANCE
      permanezca visible en conflicts y executive_summary_facts sin crear
      narrativa ni reinterpretación.

  D13_official_alternative:
    question: >
      Determinar qué metadata física se requiere para OFFICIAL y ALTERNATIVE,
      cómo se referencia alternative_of y qué parte no existe todavía en el
      Snapshot/runtime vigente.

  D14_integrity:
    question: >
      Separar claramente content_fingerprint, canonical_representation y
      firma. Determinar qué puede implementarse hoy sin inventar la
      canonicalización pendiente. signature=null y
      signature_status=NOT_IMPLEMENTED son obligatorios.

  D15_versioning_lifecycle_persistence:
    question: >
      Determinar si el contrato vigente autoriza solo construcción en memoria,
      exige persistencia/versionado físico de IES, o deja esa decisión abierta.
      No inferir tabla, DB ni repositorio si no están contractualmente definidos.

  D16_determinism:
    question: >
      Identificar todas las dependencias no deterministas que necesitarían ser
      inyectables para repetibilidad verificable: clock, idFactory, reglas,
      políticas de expiración u otras, sin aprobarlas automáticamente.

  D17_no_knowledge:
    question: >
      Verificar que un Snapshot NO_CONOZCO pueda producir un IES
      NO_KNOWLEDGE válido con facts/evidence/diagnoses vacíos y sin hipótesis.

  D18_runtime_gap:
    question: >
      Emitir una lista exhaustiva de gaps que deben cerrarse antes de
      IMPL-IES-001 y separar:
      CONTRACTUAL / PHYSICAL_UNKNOWN / RECOMMENDATION / BLOCKER.

mandatory_field_source_matrix:
  root_fields:
    - "ies_id"
    - "ies_type"
    - "schema_version"
    - "ies_version"
    - "status"
    - "generated_at"
    - "valid_at"
    - "expires_at"
    - "snapshot_reference"
    - "knowledge_snapshot_version"
    - "query_context"
    - "executive_scope"
    - "knowledge_coverage"
    - "executive_summary_facts"
    - "facts"
    - "evidence"
    - "diagnoses"
    - "conflicts"
    - "open_questions"
    - "source_health"
    - "limitations"
    - "audit"
    - "integrity"
    - "alternative_context"

  required_columns:
    - "field"
    - "contract_requirement"
    - "physical_source_today"
    - "available_today: YES|PARTIAL|NO"
    - "transformation_allowed"
    - "authority_owner"
    - "classification"
    - "notes"

mandatory_runtime_gap_matrix:
  required_columns:
    - "gap_id"
    - "description"
    - "blocks_impl_ies_001: YES|NO"
    - "requires_G2: YES|NO"
    - "requires_G8: YES|NO"
    - "recommended_resolution"
    - "authority_owner"

classification_rules:
  CONTRACTUAL: >
    Ya está definido por documentos vigentes y solo debe ser obedecido.
  PHYSICAL_UNKNOWN: >
    El contrato exige el resultado pero no existe una decisión física suficiente
    para implementarlo sin elegir arquitectura/política adicional.
  RECOMMENDATION: >
    Opción técnica propuesta por la auditoría. No queda aprobada por aparecer
    en el reporte.
  BLOCKER: >
    Falta que impide IMPL-IES-001 sin una decisión humana o contractual previa.

audit_constraints:
  - "no convertir recomendaciones en decisiones aprobadas"
  - "no escribir contrato nuevo"
  - "no modificar 04"
  - "no asumir que ejemplos ilustrativos son reglas productivas"
  - "no usar cifras ilustrativas como datos institucionales"
  - "no inventar prioridad de executive_summary_facts"
  - "no inventar canonicalización"
  - "no inventar persistencia IES"
  - "no inventar expiración"
  - "no inventar versionado físico"
  - "no inventar reglas ALTERNATIVE"
  - "no inventar materiality"
  - "no inventar causalidad"
  - "no inventar ausencia"
  - "no inventar resolución de conflictos"
  - "no generar hipótesis"
  - "no usar LLM"
  - "no consultar fuentes"

required_report_sections:
  - "1. Executive result"
  - "2. Documents and runtime inspected"
  - "3. Current physical reality"
  - "4. D1-D18 findings"
  - "5. Mandatory field-source matrix"
  - "6. Runtime gap matrix"
  - "7. Determinism and injected-dependency analysis"
  - "8. OFFICIAL / ALTERNATIVE physical readiness"
  - "9. Integrity / canonicalization readiness"
  - "10. Fail-closed and NO_KNOWLEDGE readiness"
  - "11. Contractual facts"
  - "12. Physical unknowns"
  - "13. Recommendations requiring approval"
  - "14. Blockers for IMPL-IES-001"
  - "15. Gate assessment"
  - "16. Proposed next task — informational only"
  - "17. STOP"

gate_rules:
  G1:
    current: PENDING
    rule: >
      Solo HUMAN_APPROVER puede cambiar esta tarea de DRAFT a AUTHORIZED.

  G2:
    current: PENDING_IF_REQUIRED
    rule: >
      Si cerrar un PHYSICAL_UNKNOWN exige modificar o ampliar
      docs/director-ia/04-IES-STANDARD.md u otro contrato propietario,
      la auditoría debe marcar G2 requerido y detenerse.
      Esta tarea no autoriza G2.

  G8:
    current: N/A
    rule: >
      Esta auditoría no calibra materiality, k, wi, Fs, severidad,
      reglas causales ni firma criptográfica.
      Si una implementación mínima dependiera de ello, se reporta como gap;
      no se calibra.

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtimes existentes indicados en in_scope"
  - "leer tests y fixtures existentes indicados en in_scope"
  - "comparar Snapshot real con contrato IES"
  - "clasificar D1-D18"
  - "construir matrices obligatorias"
  - "crear docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar tests existentes solo si ayudan a verificar realidad física"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "crear runtime IES"
  - "crear lib/director-ia-ies-builder.js"
  - "crear tests de implementación IES"
  - "crear fixtures de implementación IES"
  - "modificar OP"
  - "modificar EB"
  - "modificar EKS"
  - "modificar integración OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "crear SQL/migraciones/tablas"
  - "usar DB productiva"
  - "usar red"
  - "usar tools productivas"
  - "usar LLM"
  - "generar hipótesis"
  - "crear Reasoning Engine"
  - "crear Channel Projection"
  - "autoaprobar decisiones"
  - "autoaprobar gates"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

acceptance_criteria:
  - "D1-D18 auditados"
  - "cada hallazgo clasificado"
  - "matriz field-source completa"
  - "matriz de runtime gaps completa"
  - "realidad física del Knowledge Snapshot documentada"
  - "campos IES disponibles/no disponibles identificados"
  - "dependencias deterministas/no deterministas identificadas"
  - "OFFICIAL/ALTERNATIVE auditados"
  - "integrity/canonicalization auditados"
  - "NO_KNOWLEDGE auditado"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "ninguna recomendación autoaprobada"
  - "ninguna calibración G8 realizada"
  - "git diff --check sin errores"
  - "reporte termina en STOP"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría puede identificar de forma completa
  la frontera física Snapshot -> IES y separar decisiones contractuales,
  unknowns, recomendaciones y blockers sin modificar contratos.
  BLOCKED o STOPPED si la realidad física no puede determinarse con los
  contratos/runtimes disponibles o si continuar exige una decisión G2/G8.

implementation_followup_rule: >
  IMPL-IES-001 no puede crearse ni autorizarse desde esta tarea.
  Primero HUMAN_APPROVER debe revisar el reporte, resolver blockers y aprobar
  explícitamente cualquier decisión física necesaria.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"