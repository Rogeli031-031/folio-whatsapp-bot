# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

---

```yaml
task_id: "ARCH-EB-PHYSICAL-DECISIONS-003"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T20:58:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Formalizar contractualmente las decisiones físicas necesarias para habilitar
  una futura implementación determinística del Evidence Builder, utilizando
  como evidencia ARCH-EB-PHYSICAL-DECISIONS-002 y resolviendo explícitamente
  la frontera ObservationRecord 03A -> Observación N1 EB ->
  bundle.observations, sin implementar runtime, sin calibrar parámetros G8 y
  sin alterar la epistemología constitucional N1-N5.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-003.md"

  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md (solo lectura)"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

out_of_scope:
  - "implementar Evidence Builder"
  - "implementar Observation Pipeline"
  - "crear runtime JS/TS/SQL"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar lib/"
  - "modificar test/"
  - "modificar fixtures/"
  - "persistir Knowledge Bundles"
  - "integrar EB con EKS"
  - "integrar EB con chat o dashboard"
  - "implementar IES"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"

  - "modificar DIRECTOR_IA_CONSTITUTION.md"
  - "modificar DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "modificar 03A-OBSERVATION-PIPELINE.md"
  - "modificar 03B-END-TO-END-REFERENCE-FLOWS.md"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar 06-CHANNEL-PROJECTION.md"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"

  - "calibrar wi"
  - "calibrar k"
  - "definir Fs productivo"
  - "definir ventanas R"
  - "definir umbrales productivos de severidad"
  - "crear ruleset productivo de materiality"
  - "crear reglas causales"
  - "crear contratos de tool que prueben inexistencia"
  - "aprobar cualquier materia reservada a G8"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-EB-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"

proposed_human_decisions:
  D1_interface:
    decision: "I2"
    meaning: >
      Evidence Builder se realiza como módulo puro con etapas explícitas
      N1 -> N2 -> N3 -> N4 -> emitBundle, desacoplado de server.js y sin llamar
      append_snapshot.

  D2_input_and_bundle_observations:
    input_decision: "E1"
    meaning: >
      El input físico mantiene dos listas hermanas e independientes:
      acquisition_statuses[] y observation_records[]. AcquisitionStatus no se
      fusiona dentro del ObservationRecord.

    bundle_observations_decision: "N1_WRAPS_03A"
    meaning: >
      Cada ObservationRecord transportable de 03A es transformado
      determinísticamente por EB en una Observación N1. La Observación N1
      preserva identidad, procedencia, lineage y referencia al payload original
      del ObservationRecord fuente y añade únicamente semántica que pertenece
      contractualmente al EB. bundle.observations contiene estas Observaciones
      N1 del Evidence Builder, no AcquisitionStatus y no una reinterpretación
      libre del payload 03A.

    preservation_rule: >
      content_author_id, extracted_by, triggered_by, source.system,
      source_family, source_instance_id, trace_id, observation_id,
      raw_payload_reference y demás elementos de linaje/procedencia no pueden
      perderse, inventarse ni reinterpretarse durante 03A -> N1.

  D3_level_progression:
    decision: "SEQUENTIAL_BARRIERS"
    meaning: >
      N1 -> N2 -> N3 -> N4 se ejecuta con barreras explícitas. Ningún hecho sin
      observación; ninguna evidencia sin hechos; ningún diagnóstico sin regla y
      soporte. Listas vacías son válidas y no equivalen a salto de nivel.

  D4_rule_registry:
    decision: "R_MOD_EMPTY_GOVERNED_SETS"
    meaning: >
      Registry versionado en implementación, con conjuntos de reglas de
      elevación de ausencia, resolución, causalidad y materiality vacíos mientras
      no exista gobernanza/calibración autorizada. No se inventan reglas para
      completar tests.

  D5_ids_traceability:
    decision: "OPAQUE_TRACEABLE_IDS"
    meaning: >
      Se preservan trace_id y observation_id del OP. N2-N4, conflictos,
      preguntas y bundle_id utilizan identificadores opacos únicos y trazables.
      No se congela algoritmo UUID/hash como obligación arquitectónica.

  D6_lineage_cb:
    decision: "PRESERVE_FULL_03A_LINEAGE_NO_K"
    meaning: >
      Se preserva todo el lineage de 03A y los mínimos de 02. La independencia
      se determina por origen productivo/cadena de captura, no por repetición.
      No se aplica saturación k mientras siga pendiente G8.

  D7_confidence:
    decision: "DIMENSIONS_WITHOUT_FALSE_PRECISION"
    meaning: >
      Fs, R, Cb, Cs y Cb_ov se exponen como dimensiones conforme a contratos,
      sin producto numérico calibrado ni pesos wi inventados. NO_CONOZCO puede
      expresar 0.00 únicamente donde ya lo exija la autoridad contractual.

  D8_absence:
    decision: "FAIL_CLOSED"
    meaning: >
      DATA_NOT_FOUND/ACQUIRED_EMPTY no se elevan a ABSENCE_CONFIRMED mientras
      falte cualquiera de las condiciones de 02 §10.3, incluyendo contrato de
      tool y applied_absence_rule_id versionado.

  D9_conflict_resolution:
    decision: "LITERAL_STATE_MACHINE"
    meaning: >
      resolution_status aplica literalmente OPEN, UNDER_REVIEW, RESOLVED y
      SUPERSEDED. Sin ruleset de resolución no se emite RESOLVED.
      weight_assessment nunca cierra un conflicto.

  D10_materiality:
    decision: "NOT_ASSESSED_UNTIL_G8"
    meaning: >
      Sin ruleset calibrado, los objetos que declaran materiality emiten
      MATERIALITY_NOT_ASSESSED y applied_materiality_rule_id null. Nunca se
      degrada silenciosamente a MAT_LOW.

  D11_purity:
    decision: "PURE_NO_SIDE_EFFECTS"
    meaning: >
      EB no muta inputs, no hace I/O operacional, no usa LLM, no escribe EKS y
      no llama Reasoning Engine. Misma entrada + mismos rulesets versionados
      produce el mismo resultado determinístico.

  D12_eks_boundary:
    decision: "EB_SEMANTICS_PLUS_EKS_STRUCTURE"
    meaning: >
      EB posee validación semántica N1-N4 y el Bundle emitido debe además pasar
      validate_structure de EKS. Esta tarea no amplía ni redefine
      validate_structure.

  D13_fixtures:
    decision: "03B_PLUS_MINIMAL_03A_FAIL_CLOSED_CASES"
    meaning: >
      La implementación futura usará A/B de 03B como referencia ilustrativa y
      podrá crear entradas 03A mínimas para ACQUIRED_EMPTY, TOOL_ERROR,
      SOURCE_RESTRICTED, ENTITY_UNRESOLVED, conflicto OPEN y
      MATERIALITY_NOT_ASSESSED, sin inventar reglas productivas.

  D14_implementation_order:
    decision: "EB_FIXTURES_FIRST_OP_BEFORE_PRODUCTION"
    meaning: >
      EB puede implementarse y probarse primero contra fixtures contractuales
      03A/03B. Observation Pipeline runtime debe existir antes de producir
      Bundles de producción o alimentar EKS con conocimiento no-fixture.

  D15_contractual_registration:
    decision: "REGISTER_MINIMUM_PHYSICAL_BOUNDARY"
    meaning: >
      Registrar en 02 la realización física mínima D1-D14 y registrar en 03
      únicamente la aclaración necesaria de que bundle.observations contiene
      Observaciones N1 emitidas por Evidence Builder, derivadas de
      ObservationRecords 03A con preservación de procedencia y trazabilidad.
      No reabrir epistemología, coverage, EKS append-only ni otros contratos.

g8_reserved_and_unchanged:
  - "wi"
  - "k"
  - "Fs productivo por tool/dominio"
  - "ventanas de recencia R"
  - "umbrales productivos de severidad"
  - "ruleset productivo de materiality"
  - "reglas causales"
  - "contratos de tool que prueban inexistencia"

allowed_actions:
  - "leer contracts_in_force"
  - "leer ARCH-EB-PHYSICAL-DECISIONS-002.md"
  - "comparar proposed_human_decisions con contratos vigentes"
  - "modificar únicamente 02-EVIDENCE-BUILDER.md bajo G2"
  - "modificar 03-EXECUTIVE-KNOWLEDGE-STORE.md únicamente para aclarar bundle.observations bajo G2"
  - "crear docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-003.md"
  - "ejecutar git diff --check"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"

forbidden_actions:
  - "modificar contratos fuera de 02 y la aclaración mínima permitida en 03"
  - "reinterpretar D1-D15"
  - "introducir nuevas decisiones arquitectónicas"
  - "calibrar parámetros G8"
  - "crear reglas productivas"
  - "modificar código productivo"
  - "modificar tests"
  - "crear runtime"
  - "integrar EB"
  - "crear IMPL-EB-001"
  - "autoaprobar gates adicionales"
  - "commit"
  - "push"
  - "merge"
  - "encadenar otra tarea"

acceptance_criteria:
  - "solo 02 y la aclaración mínima de 03 pueden cambiar bajo G2"
  - "D1-D15 quedan registrados sin reinterpretación"
  - "bundle.observations queda inequívocamente definido"
  - "AcquisitionStatus permanece separado de N1"
  - "procedencia y lineage de 03A permanecen preservados"
  - "no se calibra ningún parámetro G8"
  - "no se crea runtime"
  - "no se modifica código"
  - "no se abre IMPL-EB-001"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la formalización puede realizarse sin contradicción
  contractual. BLOCKED o STOPPED si aparece una incompatibilidad que requiera
  una decisión humana adicional.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-003.md"