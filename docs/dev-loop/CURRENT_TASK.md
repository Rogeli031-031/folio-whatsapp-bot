# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-IES-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T08:43:20-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y registrar contractualmente los blockers físicos detectados por
  ARCH-IES-PHYSICAL-DECISIONS-001 que impiden abrir IMPL-IES-001:
  D5, la disponibilidad de query_context bajo la regla de entrada única
  Knowledge Snapshot; y D14, la canonicalización exacta requerida para
  integrity/content_fingerprint. Cerrar únicamente estas fronteras y las
  decisiones físicas estrictamente dependientes de ellas, sin implementar
  IES Builder, sin persistencia IES, sin firma digital y sin calibrar G8.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"

out_of_scope:
  - "implementar IES Builder"
  - "crear runtime IES"
  - "crear lib/director-ia-ies-builder.js"
  - "crear tests IES"
  - "crear fixtures IES"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 02-EVIDENCE-BUILDER.md"
  - "modificar 03A-OBSERVATION-PIPELINE.md"
  - "modificar 03B-END-TO-END-REFERENCE-FLOWS.md"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"

  - "modificar OP runtime"
  - "modificar Evidence Builder runtime"
  - "modificar EKS runtime"
  - "modificar helper OP-EB-EKS"
  - "modificar server.js"
  - "modificar package.json"

  - "crear persistencia física del IES"
  - "crear tablas IES"
  - "crear SQL o migraciones"
  - "definir repositorio IES"
  - "definir retention"
  - "definir política de expiración institucional"

  - "implementar IES ALTERNATIVE"
  - "resolver completamente política ALTERNATIVE"
  - "implementar lifecycle físico de IES"
  - "implementar supersesión física"

  - "implementar firma digital"
  - "elegir algoritmo de firma"
  - "declarar signature distinta de null"
  - "declarar signature_status distinto de NOT_IMPLEMENTED"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar ventanas R"
  - "calibrar severity"
  - "crear ruleset productivo de materiality"
  - "crear reglas causales"

  - "implementar Reasoning Engine"
  - "implementar Channel Projection"
  - "integrar chat/dashboard/WhatsApp/voz"
  - "usar LLM"
  - "consultar fuentes"
  - "ejecutar tools productivas"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-IES-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-001.md"
  implementation_status: "NO-GO"
  blockers:
    D5: >
      El Knowledge Snapshot vigente no contiene físicamente todo el
      query_context obligatorio de 04.
    D14: >
      04 exige canonical_representation y content_fingerprint pero declara
      pendiente la canonicalización exacta.
  confirmed_non_blocking:
    - "COV_* puede proyectarse fail-closed"
    - "status IES puede mapearse desde cobertura contractual"
    - "facts/evidence/diagnoses/conflicts pueden proyectarse"
    - "MATERIALITY_NOT_ASSESSED puede preservarse"
    - "signature = null"
    - "signature_status = NOT_IMPLEMENTED"
    - "NO_CONOZCO puede producir NO_KNOWLEDGE válido"

proposed_human_decisions:

  D5_query_context_snapshot_boundary:
    decision: "SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA"
    meaning: >
      La regla 'entrada única = Knowledge Snapshot' permanece intacta.
      El IES Builder no recibe una segunda entrada operacional para
      query_context. En cambio, el Knowledge Snapshot debe exponer dentro de
      su representación persistida/metadatos inmutables la metadata de consulta
      ejecutiva necesaria para proyectar query_context del IES.

    rationale: >
      Esto preserva la entrada única del IES Builder y evita que el Builder
      consulte Planner, request runtime, chat, usuario, permisos u otras capas
      fuera del Snapshot.

    minimum_query_context_metadata:
      - "executive_query_id"
      - "query_fingerprint (nullable/opcional)"
      - "trace_id"
      - "original_question"
      - "intent"
      - "requesting_user_id"
      - "requesting_role"
      - "channel"
      - "plant_or_scope cuando aplique"
      - "period cuando aplique"
      - "resolved_entities[]"
      - "permission_restrictions[]"
      - "knowledge_effective_date"

    ownership_rule: >
      La metadata se origina upstream conforme a sus propietarios contractuales,
      atraviesa EB sin reinterpretación y queda persistida por EKS como metadata
      inmutable del Snapshot. IES únicamente la proyecta.

    prohibitions:
      - "IES Builder no consulta Planner"
      - "IES Builder no consulta chat/request runtime"
      - "IES Builder no inventa usuario/rol/canal"
      - "IES Builder no re-resuelve entidades"
      - "IES Builder no recalcula permisos"
      - "EKS no reinterpreta query_context"

  D5_snapshot_contract_extension:
    decision: "MINIMAL_QUERY_METADATA_EXTENSION"
    meaning: >
      Registrar en 03 la extensión mínima necesaria del Knowledge Snapshot para
      transportar query_context_metadata como metadata persistida, sin cambiar
      el Bundle N1-N4 ni las decisiones append-only D1-D9.

    compatibility:
      - "Bundle permanece opaco"
      - "Snapshot sigue inmutable"
      - "append-only intacto"
      - "versionado EKS intacto"
      - "integrity EKS intacta"
      - "no se mezclan AcquisitionStatus dentro de observations"

  D14_canonicalization:
    decision: "JCS_LIKE_DETERMINISTIC_CANONICAL_JSON_V1"
    meaning: >
      Congelar para IES v1 una representación canónica JSON determinística con:
      claves de objeto ordenadas lexicográficamente, arrays preservando orden
      contractual, serialización JSON UTF-8 sin espacios insignificantes,
      null explícito cuando el contrato exige el campo, exclusión del propio
      content_fingerprint del material a hashear y exclusión de signature
      como fuente de circularidad.

    canonical_scope:
      include:
        - "todo el contenido semántico raíz del IES"
        - "audit"
        - "integrity.snapshot_reference"
        - "integrity.signature_status"
      exclude:
        - "integrity.content_fingerprint"
        - "integrity.canonical_representation"
        - "integrity.signature"

    canonical_representation_token:
      decision: "CANONICAL_JSON_V1"

    rules:
      - "objetos: claves lexicográficamente ordenadas"
      - "arrays: orden preservado; no se reordenan para canonicalizar"
      - "strings: serialización JSON estándar UTF-8"
      - "numbers: representación JSON finita; NaN/Infinity prohibidos"
      - "booleans: true/false"
      - "null: explícito cuando forma parte del contrato"
      - "undefined: prohibido"
      - "campos inexistentes no se inventan"
      - "no normalizar semánticamente strings"
      - "no convertir números a strings"
      - "no ordenar bancos por conveniencia dentro del canonicalizer"

  D14_content_fingerprint:
    decision: "DETERMINISTIC_DIGEST_IMPLEMENTATION_NOT_SIGNATURE"
    meaning: >
      content_fingerprint es digest criptográfico determinista de
      CANONICAL_JSON_V1. El contrato congela la representación canónica y la
      naturaleza digest, pero no debe presentar el digest como firma digital.

    algorithm_policy:
      decision: "ALGORITHM_IMPLEMENTATION_LEVEL"
      meaning: >
        El algoritmo concreto puede ser una decisión de implementación mientras
        mantenga propiedades criptográficas adecuadas y quede documentado en
        reporte/runtime. No se congela algoritmo de firma digital.

    invariant:
      - "signature = null"
      - "signature_status = NOT_IMPLEMENTED"
      - "content_fingerprint != firma digital"

  D14_integrity_verification:
    decision: "RECOMPUTABLE_FINGERPRINT"
    meaning: >
      El mismo IES semántico bajo CANONICAL_JSON_V1 debe producir la misma
      huella. Una mutación del contenido incluido debe cambiar la huella.
      El runtime futuro debe poder recomputarla para verificar integridad.

  D14_generated_fields:
    decision: "GENERATE_THEN_FINGERPRINT"
    meaning: >
      ies_id, ies_version, status, generated_at, valid_at y demás campos que
      formen parte del objeto final se determinan antes de calcular
      content_fingerprint. La huella corresponde al IES emitido final, no a un
      borrador BUILDING parcial.

  implementation_readiness_decisions:

    builder_interface:
      decision: "FACTORY_WITH_INJECTED_CLOCK_AND_ID_FACTORY"
      meaning: >
        Una futura IMPL-IES-001 puede realizar IES Builder mediante factory
        testeable con clock e idFactory inyectables, sin que esta tarea cree
        runtime.

    first_runtime_scope:
      decision: "OFFICIAL_IN_MEMORY_PROJECTION_FIRST"
      meaning: >
        La primera implementación puede limitarse a construir IES OFFICIAL en
        memoria desde un Snapshot, sin persistencia física IES y sin
        ALTERNATIVE, siempre que el contrato raíz se complete y valide.
        Persistencia/versionado durable de IES requerirá tarea separada.

    ies_version_initial:
      decision: "INITIAL_VERSION_1"
      meaning: >
        Para un IES nuevo sin persistencia/historial IES, la primera proyección
        OFFICIAL usa ies_version = 1. Cualquier regeneración/supersesión durable
        queda fuera hasta definir el almacén IES.

    expiration:
      decision: "EXPIRES_AT_NULL_UNTIL_POLICY"
      meaning: >
        Mientras no exista política institucional de expiración, expires_at
        permanece null, permitido por 04.

    alternative_context:
      decision: "OFFICIAL_ONLY_V1"
      meaning: >
        IMPL-IES-001 inicial puede soportar únicamente ies_type=OFFICIAL con
        alternative_context=null. ALTERNATIVE requiere una tarea posterior.

    summary:
      decision: "FAIL_CLOSED_CONTROLLED_REFERENCES"
      meaning: >
        La implementación inicial no inventa reglas de priorización. Solo emite
        executive_summary_facts cuando exista una regla contractual inequívoca
        para incluir una referencia, incluyendo límites bloqueantes y
        CONF_TYPE_E_GOVERNANCE obligatorio. Si no existe criterio suficiente,
        no inventa ranking narrativo.

    limitations:
      decision: "PROJECT_ONLY_EXPLICIT_LIMITATIONS"
      meaning: >
        IES Builder proyecta únicamente limitaciones explícitas presentes o
        derivables por mapeos contractuales exactos del Snapshot/source_health.
        No redacta limitaciones libres.

    executive_scope:
      decision: "PROJECT_FROM_QUERY_METADATA_AND_SNAPSHOT_SCOPE"
      meaning: >
        executive_scope se proyecta mecánicamente desde query_context_metadata
        y alcance explícito del Snapshot; no se consulta runtime externo.

human_approval_scope:
  approve_exactly:
    - "D5_query_context_snapshot_boundary"
    - "D5_snapshot_contract_extension"
    - "D14_canonicalization"
    - "D14_content_fingerprint"
    - "D14_integrity_verification"
    - "D14_generated_fields"
    - "implementation_readiness_decisions"

g2_contract_changes_authorized_if_approved:
  docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md:
    allowed:
      - "añadir query_context_metadata al Knowledge Snapshot"
      - "aclarar preservación inmutable de metadata ejecutiva"
      - "aclarar que EKS persiste pero no interpreta esa metadata"
    forbidden:
      - "cambiar Bundle N1-N4"
      - "cambiar D1-D9"
      - "cambiar append-only"
      - "cambiar semántica get/list/versioning"
      - "cambiar integrity EKS salvo referencia mínima necesaria"

  docs/director-ia/04-IES-STANDARD.md:
    allowed:
      - "congelar CANONICAL_JSON_V1"
      - "definir alcance exacto del content_fingerprint"
      - "aclarar digest != firma"
      - "registrar readiness física mínima para runtime OFFICIAL inicial"
      - "aclarar origen query_context desde Snapshot metadata"
    forbidden:
      - "cambiar esquema raíz v1.0"
      - "crear nuevos estados coverage"
      - "cambiar taxonomía de conflictos"
      - "cambiar materiality"
      - "implementar firma digital"
      - "cambiar Reasoning Engine"
      - "diseñar Channel Projection"

g8_reserved_and_unchanged:
  - "wi"
  - "k"
  - "Fs"
  - "ventanas R"
  - "severity productiva"
  - "materiality ruleset productivo"
  - "reglas causales"
  - "firma digital"

required_report:
  - "decisiones registradas"
  - "diff contractual exacto"
  - "confirmación de que schema raíz IES no cambió"
  - "confirmación de que Bundle/EKS D1-D9 no cambiaron"
  - "definición final de query_context_metadata"
  - "definición final CANONICAL_JSON_V1"
  - "alcance del fingerprint"
  - "materias aún diferidas"
  - "evaluación GO / NO-GO para IMPL-IES-001"
  - "cualquier contradicción encontrada"

acceptance_criteria:
  - "D5 queda resuelto sin segunda entrada operacional al IES Builder"
  - "Knowledge Snapshot queda capaz de transportar query_context_metadata"
  - "EKS no interpreta query_context_metadata"
  - "04 mantiene entrada única Knowledge Snapshot"
  - "canonicalización exacta queda congelada"
  - "content_fingerprint queda recomputable"
  - "digest no se presenta como firma"
  - "signature sigue null"
  - "signature_status sigue NOT_IMPLEMENTED"
  - "schema raíz IES v1.0 no cambia"
  - "coverage no cambia"
  - "conflictos no cambian"
  - "materiality no cambia"
  - "Bundle N1-N4 no cambia"
  - "EKS append-only/D1-D9 no cambian"
  - "sin runtime IES"
  - "sin persistencia IES"
  - "sin ALTERNATIVE runtime"
  - "sin G8"
  - "solo 03 y 04 pueden modificarse bajo G2"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"
  - "IMPL-IES-001 no se crea"

allowed_actions:
  - "leer contracts_in_force"
  - "leer ARCH-IES-PHYSICAL-DECISIONS-001.md"
  - "comparar decisiones propuestas con contratos"
  - "si G1+G2 son autorizados, modificar 03 únicamente dentro del scope permitido"
  - "si G1+G2 son autorizados, modificar 04 únicamente dentro del scope permitido"
  - "crear docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-002.md"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar contratos fuera de 03 y 04"
  - "reinterpretar decisiones aprobadas"
  - "introducir cambios epistemológicos"
  - "implementar IES"
  - "crear runtime"
  - "crear tests"
  - "crear fixtures"
  - "crear SQL"
  - "crear migraciones"
  - "crear persistencia IES"
  - "implementar ALTERNATIVE"
  - "implementar firma digital"
  - "calibrar G8"
  - "modificar OP/EB/EKS runtime"
  - "modificar server.js"
  - "modificar package.json"
  - "crear IMPL-IES-001"
  - "autoaprobar G1"
  - "autoaprobar G2"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si las decisiones humanas aprobadas pueden registrarse
  en 03 y 04 sin contradicción con Constitución ni contratos superiores.
  BLOCKED o STOPPED si alguna decisión propuesta exige alterar esquema raíz,
  epistemología, D1-D9 del EKS o una materia reservada a G8.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-IES-PHYSICAL-DECISIONS-002.md"
```