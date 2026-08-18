# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T17:27:52-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y registrar contractualmente la primera realización física mínima
  de Diagnosis N4 que pueda implementarse sin G8, tomando como base la auditoría
  ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001. Congelar registry de diagnostic
  rules, schema físico de Diagnosis N4, identity/versionado, soporte,
  classification_criterion y una primera categoría diagnóstica no causal
  compatible con Evidence N3 CONTRADICTION + conflicto Tipo A OPEN, sin
  implementar runtime ni calibrar severity/materiality/confidence.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "lib/director-ia-channel-projection.js (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura)"

out_of_scope:
  - "implementar N4"
  - "modificar Evidence Builder runtime"
  - "crear tests N4"
  - "crear fixtures N4"

  - "crear causal rules"
  - "crear hypotheses"
  - "crear recommendations"
  - "resolver conflictos"

  - "calibrar severity"
  - "calibrar impact"
  - "calibrar confidence"
  - "calibrar materiality"
  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "definir thresholds"
  - "usar G8"

  - "crear clasificador B/C/D/E"
  - "crear Tipo E"
  - "retipificar Tipo A"
  - "crear secondary_types"
  - "activar governance_escalation"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 03A"
  - "modificar 03"
  - "modificar 04"
  - "modificar 05"
  - "modificar 06"

  - "modificar otros runtimes"
  - "modificar server.js"
  - "modificar package.json"

  - "commit"
  - "push"
  - "merge"
  - "crear IMPL-EVIDENCE-N4-001"
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

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"
  implementation_status: "NO-GO"
  confirmed_findings:
    - "to_n4() permanece vacío/fail-closed"
    - "N3 CONTRADICTION no autoriza N4 por sí sola"
    - "catálogo de nombres N4 existe contractualmente"
    - "classification_criterion físico no está congelado"
    - "severity/impact/confidence obligatorios downstream no tienen placeholder aprobado"
    - "no existe franja N4 implementable sin G2"
    - "G8 no debe mezclarse con G2"
    - "conflict Type A OPEN debe permanecer separado de Diagnosis N4"

proposed_human_decisions:

  D1_diagnostic_rule_registry:
    decision: "DIAGNOSTIC_RULE_REGISTRY_V1"
    meaning: >
      Evidence Builder mantiene un registry explícito, cerrado y versionado de
      diagnostic rules. Ningún Diagnosis N4 puede existir si no proviene de una
      rule ACTIVE registrada.

    minimum_rule_fields:
      - "rule_id"
      - "rule_version"
      - "diagnostic_category"
      - "causal"
      - "input_contract"
      - "output_contract"
      - "status"

    constraints:
      - "causal=false en esta versión"
      - "status=ACTIVE para ejecutarse"
      - "rule identity queda persistida en Diagnosis"
      - "sin rules dinámicas"
      - "sin LLM"

  D2_initial_diagnostic_scope:
    decision: "UNRESOLVED_CONFLICT_DIAGNOSIS_V1_ONLY"
    meaning: >
      La primera categoría diagnóstica implementable se limita a clasificar
      determinísticamente una contradicción no resuelta ya soportada por
      Evidence N3 CONTRADICTION y conflicto compuesto Tipo A OPEN.

    allowed_category:
      - "UNRESOLVED_CONFLICT"

    prohibited_in_this_version:
      - "DETERIORATION"
      - "NONCOMPLIANCE"
      - "RISK"
      - "FRAUD"
      - "ROOT_CAUSE"
      - "OPERATIONAL_FAILURE"
      - "SOURCE_FAILURE"
      - "any causal category"

  D3_input_contract:
    decision: "N4_UNRESOLVED_CONFLICT_INPUT_V1"
    required:
      - "at least one Evidence N3 CONTRADICTION"
      - "at least one compound Conflict Type A"
      - "resolution_status == OPEN"
      - "supporting facts exist"
      - "same trace/bundle context"

    prohibited:
      - "derive N4 from N3 alone without conflict object"
      - "derive N4 from conflict alone without supporting Evidence N3"
      - "derive from Type E inference"
      - "derive from CLOSED/RESOLVED conflict"

  D4_support_contract:
    decision: "N4_TRACEABLE_SUPPORT_V1"
    required_fields:
      - "supporting_fact_ids"
      - "supporting_evidence_ids"
      - "supporting_conflict_ids"

    rules:
      - "all references exist in same Bundle"
      - "no support rewriting"
      - "support arrays deterministically ordered"
      - "N4 never duplicates N1/N2/N3 payloads"

  D5_classification_criterion:
    decision: "UNRESOLVED_CONFLICT_CRITERION_V1"
    meaning: >
      Diagnosis se emite únicamente cuando existe una Evidence N3
      CONTRADICTION válida y un conflicto compuesto Type A OPEN asociado al
      mismo conjunto de facts en tensión.

    required_condition:
      - "evidence_type == CONTRADICTION"
      - "causal_status == NON_CAUSAL"
      - "conflict.primary_type == A"
      - "conflict.resolution_status == OPEN"
      - "intersection of evidence.supporting_fact_ids and conflict.facts_in_tension is complete for the diagnostic support set"

    rules:
      - "no truth selection"
      - "no source ranking"
      - "no root cause"
      - "no severity inference"
      - "no resolution inference"

  D6_diagnosis_schema:
    decision: "DIAGNOSIS_N4_PHYSICAL_V1"
    required_fields:
      - "diagnosis_id"
      - "diagnostic_category"
      - "statement"
      - "classification_criterion"
      - "supporting_fact_ids"
      - "supporting_evidence_ids"
      - "supporting_conflict_ids"
      - "severity"
      - "impact"
      - "confidence"
      - "materiality"
      - "causal_status"
      - "applied_rule"
      - "traceability"

  D7_required_unassessed_values:
    decision: "N4_UNASSESSED_DIMENSIONS_V1"
    meaning: >
      Para permitir una primera franja N4 sin G8, severity, impact y confidence
      permanecen presentes pero explícitamente no evaluadas.

    fixed_values:
      severity: "SEVERITY_NOT_ASSESSED"
      impact: "IMPACT_NOT_ASSESSED"
      confidence: "CONFIDENCE_NOT_ASSESSED"
      materiality: "MATERIALITY_NOT_ASSESSED"

    constraints:
      - "NOT_ASSESSED != LOW"
      - "NOT_ASSESSED != NONE"
      - "NOT_ASSESSED no implica ausencia de riesgo/impacto"
      - "no ordenamiento"
      - "no scoring"

  D8_causal_status:
    decision: "N4_NON_CAUSAL_V1"
    fixed_value: "NON_CAUSAL"

    forbidden:
      - "probable cause"
      - "caused by"
      - "due to"
      - "root cause"
      - "culpability"

  D9_statement_semantics:
    decision: "UNRESOLVED_CONFLICT_STATEMENT_V1"
    allowed_meaning:
      - "Existe una contradicción no resuelta entre facts soportados"
      - "Los facts permanecen incompatibles bajo la rule de contradicción"
      - "El conflicto asociado permanece OPEN"

    forbidden_meaning:
      - "la causa es..."
      - "la fuente A está equivocada"
      - "el valor verdadero es..."
      - "existe fraude"
      - "existe incumplimiento"
      - "hay deterioro"
      - "hay riesgo alto"
      - "el problema se debe a..."

  D10_rule_identity:
    decision: "DIAGNOSTIC_RULE_IDENTITY_STABLE_V1"
    initial_rule:
      rule_id: "N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION"
      rule_version: "1.0"
      diagnostic_category: "UNRESOLVED_CONFLICT"
      causal: false
      status: "ACTIVE"
      input_contract: "N4_UNRESOLVED_CONFLICT_INPUT_V1"
      output_contract: "DIAGNOSIS_N4_PHYSICAL_V1"

  D11_determinism:
    decision: "N4_DETERMINISTIC_OUTPUT_V1"
    rules:
      - "same Bundle semantic content + same rule version -> same logical Diagnosis"
      - "support ids ordered stably"
      - "no ambient clock"
      - "no random"
      - "no LLM"
      - "no IO"

  D12_conflict_boundary:
    decision: "N4_DOES_NOT_MUTATE_CONFLICT_V1"
    rules:
      - "Diagnosis does not change primary_type"
      - "Diagnosis does not change resolution_status"
      - "Diagnosis does not add secondary_types"
      - "Diagnosis does not set governance_escalation"
      - "Diagnosis does not calculate conflict severity"
      - "Type A remains Type A OPEN"

  D13_type_e_boundary:
    decision: "N4_PRESERVES_TYPE_E_WITHOUT_CREATING_IT_V1"
    meaning: >
      Si un Tipo E ya existe contractualmente upstream, N4 no lo oculta ni
      suaviza; esta primera rule N4 no se ejecuta para fabricar ni reinterpretar
      Tipo E.

  D14_resolution_boundary:
    decision: "N4_NO_RESOLUTION_AUTHORITY_V1"
    rules:
      - "Diagnosis never sets RESOLVED"
      - "Diagnosis never sets SUPERSEDED"
      - "Diagnosis never closes OPEN"
      - "Diagnosis never resolves by weight_assessment"

  D15_n5_boundary:
    decision: "N4_INFORMS_N5_WITHOUT_BECOMING_N5_V1"
    rules:
      - "Diagnosis may be included in IES"
      - "RE may consume Diagnosis as structured support"
      - "N4 does not emit hypothesis"
      - "N4 does not emit recommendation"
      - "N4 does not infer cause"
      - "RE keeps all gates"

  D16_g8_boundary:
    decision: "N4_V1_G8_FREE_PLACEHOLDER_SUBSET"
    meaning: >
      La primera franja N4 no evalúa severity, impact, confidence ni
      materiality; usa exclusivamente valores NOT_ASSESSED aprobados.

    g8_deferred:
      - "severity ordinal"
      - "impact ordinal"
      - "confidence scoring"
      - "materiality scoring"
      - "thresholds"
      - "wi"
      - "k"
      - "Fs"

  D17_first_implementation_scope:
    decision: "IMPL_EVIDENCE_N4_UNRESOLVED_CONFLICT_ONLY_V1"
    meaning: >
      Un futuro IMPL-EVIDENCE-N4-001 implementará únicamente registry +
      rule UNRESOLVED_CONFLICT + schema N4 + placeholders NOT_ASSESSED +
      tests/regresión.

    forbidden_in_impl:
      - "G8"
      - "causal diagnostics"
      - "additional diagnostic categories"
      - "B/C/D/E classifier"
      - "Type E creation"
      - "resolution rules"
      - "new sources"
      - "changes to OP/EKS/IES/RE/CP"

human_approval_scope:
  approve_exactly:
    - "D1_diagnostic_rule_registry"
    - "D2_initial_diagnostic_scope"
    - "D3_input_contract"
    - "D4_support_contract"
    - "D5_classification_criterion"
    - "D6_diagnosis_schema"
    - "D7_required_unassessed_values"
    - "D8_causal_status"
    - "D9_statement_semantics"
    - "D10_rule_identity"
    - "D11_determinism"
    - "D12_conflict_boundary"
    - "D13_type_e_boundary"
    - "D14_resolution_boundary"
    - "D15_n5_boundary"
    - "D16_g8_boundary"
    - "D17_first_implementation_scope"

g2_contract_changes_authorized_if_approved:
  docs/director-ia/02-EVIDENCE-BUILDER.md:
    allowed:
      - "registrar D1-D17"
      - "registrar Diagnostic Rule Registry v1"
      - "registrar rule identity N4"
      - "registrar schema físico Diagnosis N4"
      - "registrar UNRESOLVED_CONFLICT"
      - "registrar classification criterion"
      - "registrar placeholders NOT_ASSESSED"
      - "registrar frontera N4/conflict/N5"
      - "registrar futuro scope IMPL-EVIDENCE-N4-001"

    forbidden:
      - "calibrar G8"
      - "crear severity ordinal"
      - "crear impact ordinal"
      - "crear confidence scoring"
      - "crear materiality scoring"
      - "crear thresholds"
      - "crear causal rules"
      - "crear categorías adicionales"
      - "crear B/C/D/E classifier"
      - "crear Tipo E"
      - "crear resolution rules"
      - "modificar N1-N3"
      - "modificar IES/RE"

required_report:
  - "D1-D17 registradas"
  - "diff contractual exacto"
  - "registry final"
  - "identity/version final"
  - "schema N4 final"
  - "classification criterion final"
  - "support contract final"
  - "NOT_ASSESSED semantics"
  - "causal boundary"
  - "conflict boundary"
  - "Type E boundary"
  - "N4 -> N5 boundary"
  - "confirmación G8 no usado"
  - "GO/NO-GO para IMPL-EVIDENCE-N4-001"

acceptance_criteria:
  - "Diagnostic Rule Registry definido"
  - "solo UNRESOLVED_CONFLICT inicial"
  - "input exige N3 CONTRADICTION + Type A OPEN"
  - "support incluye facts/evidence/conflict"
  - "classification criterion determinístico"
  - "Diagnosis schema definido"
  - "severity/impact/confidence/materiality NOT_ASSESSED"
  - "NON_CAUSAL"
  - "rule identity estable"
  - "N4 no muta conflicto"
  - "N4 no crea Tipo E"
  - "N4 no resuelve"
  - "N4 no crea hypothesis/recommendation"
  - "G8 no usado"
  - "02 es único contrato modificable"
  - "ningún runtime modificado"
  - "sin tests/fixtures"
  - "git diff --check limpio"
  - "reporte obligatorio creado"
  - "IMPL-EVIDENCE-N4-001 no creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer auditoría N4 001"
  - "leer runtime/tests EB"
  - "comparar D1-D17 con contratos superiores"
  - "si G1+G2 autorizados, modificar únicamente 02-EVIDENCE-BUILDER.md"
  - "crear docs/dev-loop/reports/ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar contratos fuera de 02"
  - "implementar N4"
  - "modificar runtime EB"
  - "crear tests/fixtures"
  - "usar G8"
  - "crear calibraciones"
  - "crear causalidad"
  - "crear categorías adicionales"
  - "crear B/C/D/E"
  - "crear Tipo E"
  - "crear resolution"
  - "modificar OP/EKS/IES/RE/CP"
  - "modificar server.js"
  - "modificar package.json"
  - "autoaprobar gates"
  - "crear IMPL-EVIDENCE-N4-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si D1-D17 pueden registrarse en 02 sin contradicción
  constitucional y sin usar G8.
  BLOCKED o STOPPED si alguna decisión exige calibración G8, causalidad,
  modificación de otro contrato o semántica fuera del catálogo aprobado.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002.md"