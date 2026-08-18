# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EVIDENCE-N4-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T18:05:50-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar exclusivamente la primera franja Diagnosis N4 aprobada:
  Diagnostic Rule Registry v1 + rule determinística no causal
  N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION versión 1.0 +
  schema DIAGNOSIS_N4_PHYSICAL_V1, modificando únicamente el Evidence Builder
  y sus tests/fixtures autorizados. La implementación debe permanecer
  determinística, fail-closed, sin G8, sin causalidad, sin nuevas categorías,
  sin retipificación de conflictos y sin autoridad de resolución.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EVIDENCE-N4-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-n4/"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "lib/director-ia-channel-projection.js (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura)"

  - "test/director-ia-op-eb-eks-integration.test.js (solo lectura)"
  - "test/director-ia-eks.test.js (solo lectura)"
  - "test/director-ia-eks-integration.test.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "test/director-ia-reasoning-engine.test.js (solo lectura)"
  - "test/director-ia-channel-projection.test.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar OP"
  - "modificar EKS"
  - "modificar IES Builder"
  - "modificar Reasoning Engine"
  - "modificar Channel Projection"
  - "modificar E2E orchestrator"
  - "modificar server.js"
  - "modificar package.json"
  - "modificar .env"

  - "crear otras diagnostic categories"
  - "crear causal rules"
  - "crear hypotheses"
  - "crear recommendations"

  - "crear clasificador B/C/D/E"
  - "crear Tipo E"
  - "retipificar Tipo A"
  - "crear secondary_types"
  - "activar governance_escalation"

  - "resolver conflictos"
  - "crear resolution rules"
  - "cambiar OPEN a RESOLVED"
  - "cambiar OPEN a SUPERSEDED"

  - "calibrar severity"
  - "calibrar impact"
  - "calibrar confidence"
  - "calibrar materiality"
  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "crear thresholds"
  - "usar G8"

  - "usar LLM"
  - "usar networking"
  - "usar DB"
  - "usar tools productivas"

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

approved_contract:
  registry: "DIAGNOSTIC_RULE_REGISTRY_V1"
  initial_scope: "UNRESOLVED_CONFLICT_DIAGNOSIS_V1_ONLY"
  input_contract: "N4_UNRESOLVED_CONFLICT_INPUT_V1"
  support_contract: "N4_TRACEABLE_SUPPORT_V1"
  criterion: "UNRESOLVED_CONFLICT_CRITERION_V1"
  diagnosis_schema: "DIAGNOSIS_N4_PHYSICAL_V1"
  unassessed_dimensions: "N4_UNASSESSED_DIMENSIONS_V1"
  causal_status: "N4_NON_CAUSAL_V1"
  statement_semantics: "UNRESOLVED_CONFLICT_STATEMENT_V1"
  rule_identity: "DIAGNOSTIC_RULE_IDENTITY_STABLE_V1"
  determinism: "N4_DETERMINISTIC_OUTPUT_V1"
  conflict_boundary: "N4_DOES_NOT_MUTATE_CONFLICT_V1"
  type_e_boundary: "N4_PRESERVES_TYPE_E_WITHOUT_CREATING_IT_V1"
  resolution_boundary: "N4_NO_RESOLUTION_AUTHORITY_V1"
  n5_boundary: "N4_INFORMS_N5_WITHOUT_BECOMING_N5_V1"
  g8_boundary: "N4_V1_G8_FREE_PLACEHOLDER_SUBSET"
  implementation_scope: "IMPL_EVIDENCE_N4_UNRESOLVED_CONFLICT_ONLY_V1"

diagnostic_rule_registry_v1:
  diagnostic_rules:
    - rule_id: "N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION"
      rule_version: "1.0"
      diagnostic_category: "UNRESOLVED_CONFLICT"
      causal: false
      status: "ACTIVE"
      input_contract: "N4_UNRESOLVED_CONFLICT_INPUT_V1"
      output_contract: "DIAGNOSIS_N4_PHYSICAL_V1"

rule_execution:
  only_execute_if:
    - "exists valid Evidence N3 CONTRADICTION"
    - "evidence.causal_status == NON_CAUSAL"
    - "exists associated compound Conflict"
    - "conflict.primary_type == A"
    - "conflict.resolution_status == OPEN"
    - "supporting facts exist"
    - "Evidence and Conflict belong to same Bundle/trace context"
    - "Evidence support matches the diagnostic fact support against facts_in_tension"

  prohibited:
    - "N3 alone"
    - "Conflict alone"
    - "RESOLVED conflict"
    - "SUPERSEDED conflict"
    - "Type E inference"
    - "source ranking"
    - "truth selection"

support_contract:
  required:
    - "supporting_fact_ids"
    - "supporting_evidence_ids"
    - "supporting_conflict_ids"

  rules:
    - "all referenced ids exist in same Bundle"
    - "supporting_fact_ids non-empty"
    - "supporting_evidence_ids non-empty"
    - "supporting_conflict_ids non-empty"
    - "all arrays ordered deterministically"
    - "Diagnosis does not duplicate N1/N2/N3 payload"
    - "Diagnosis does not mutate support objects"

classification_criterion:
  required:
    - "Evidence evidence_type == CONTRADICTION"
    - "Evidence causal_status == NON_CAUSAL"
    - "Conflict primary_type == A"
    - "Conflict resolution_status == OPEN"
    - "complete support relationship with conflict.facts_in_tension"

  semantics:
    - "classifies unresolved contradiction"
    - "does not select true fact"
    - "does not rank sources"
    - "does not infer cause"
    - "does not infer severity"
    - "does not resolve"

diagnosis_n4_schema:
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

  fixed_values:
    diagnostic_category: "UNRESOLVED_CONFLICT"
    severity: "SEVERITY_NOT_ASSESSED"
    impact: "IMPACT_NOT_ASSESSED"
    confidence: "CONFIDENCE_NOT_ASSESSED"
    materiality: "MATERIALITY_NOT_ASSESSED"
    causal_status: "NON_CAUSAL"

  applied_rule:
    rule_id: "N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION"
    rule_version: "1.0"

  traceability_required:
    - "trace_id"
    - "rule_id"
    - "rule_version"

unassessed_semantics:
  - "SEVERITY_NOT_ASSESSED != LOW"
  - "SEVERITY_NOT_ASSESSED != NONE"
  - "IMPACT_NOT_ASSESSED != LOW"
  - "IMPACT_NOT_ASSESSED != NONE"
  - "CONFIDENCE_NOT_ASSESSED != LOW"
  - "CONFIDENCE_NOT_ASSESSED != zero confidence"
  - "MATERIALITY_NOT_ASSESSED != immaterial"
  - "no scoring"
  - "no ordinal interpretation"

statement_rules:
  allowed_meaning:
    - "there is an unresolved contradiction among supported facts"
    - "facts remain incompatible under the contradiction rule"
    - "associated conflict remains OPEN"

  forbidden_meaning:
    - "probable cause"
    - "caused by"
    - "due to"
    - "root cause"
    - "source A is wrong"
    - "true value is..."
    - "fraud"
    - "noncompliance"
    - "deterioration"
    - "high risk"
    - "culpability"

determinism_rules:
  - "same Bundle semantics + same rule version -> same logical Diagnosis"
  - "support arrays sorted stably"
  - "diagnosis_id generated through existing/injected idFactory"
  - "no Date.now"
  - "no Math.random"
  - "no LLM"
  - "no IO"

conflict_boundary:
  - "Diagnosis and Conflict remain distinct objects"
  - "Diagnosis does not change primary_type"
  - "Diagnosis does not change resolution_status"
  - "Diagnosis does not add secondary_types"
  - "Diagnosis does not set governance_escalation"
  - "Diagnosis does not calculate conflict severity"
  - "Type A remains Type A OPEN"
  - "Diagnosis does not create Type E"

resolution_boundary:
  - "Diagnosis never sets RESOLVED"
  - "Diagnosis never sets SUPERSEDED"
  - "Diagnosis never closes OPEN"
  - "Diagnosis never resolves by weight_assessment"

n5_boundary:
  - "Diagnosis may be preserved into IES"
  - "Reasoning Engine may consume Diagnosis as structured support"
  - "N4 never emits hypothesis"
  - "N4 never emits recommendation"
  - "N4 never emits causal inference"
  - "RE retains all existing gates"

required_fixtures:
  - "unresolved-conflict-valid.json"
  - "n3-without-conflict-no-diagnosis.json"
  - "conflict-without-n3-no-diagnosis.json"
  - "resolved-conflict-no-diagnosis.json"
  - "mismatched-support-no-diagnosis.json"
  - "type-e-no-fabrication.json"
  - "different-conflict-type-no-diagnosis.json"

fixture_rules:
  - "all synthetic"
  - "no institutional real data"
  - "no G8"
  - "no causal semantics"
  - "no Type E fabrication"
  - "no resolution mutation"

tests_required:

  registry:
    - "registry contains exactly one ACTIVE diagnostic rule"
    - "rule identity/version exact"
    - "causal=false"
    - "diagnostic_category == UNRESOLVED_CONFLICT"

  n4_creation:
    - "valid N3 CONTRADICTION + Type A OPEN + matching facts -> exactly one Diagnosis"
    - "N3 without conflict -> zero Diagnosis"
    - "conflict without N3 -> zero Diagnosis"
    - "resolved conflict -> zero Diagnosis"
    - "superseeded conflict -> zero Diagnosis"
    - "mismatched support -> zero Diagnosis"
    - "different conflict type -> zero Diagnosis"

  schema:
    - "Diagnosis contains all DIAGNOSIS_N4_PHYSICAL_V1 required fields"
    - "diagnostic_category == UNRESOLVED_CONFLICT"
    - "severity == SEVERITY_NOT_ASSESSED"
    - "impact == IMPACT_NOT_ASSESSED"
    - "confidence == CONFIDENCE_NOT_ASSESSED"
    - "materiality == MATERIALITY_NOT_ASSESSED"
    - "causal_status == NON_CAUSAL"
    - "applied_rule id/version exact"
    - "traceability contains trace_id + rule identity"

  semantics:
    - "statement remains non-causal"
    - "Diagnosis does not select true value"
    - "Diagnosis does not rank sources"
    - "Diagnosis does not claim fraud/noncompliance/deterioration/risk"
    - "Diagnosis does not infer severity"

  support:
    - "supporting_fact_ids valid and stable"
    - "supporting_evidence_ids valid and stable"
    - "supporting_conflict_ids valid and stable"
    - "inputs not mutated"

  conflict_boundary:
    - "Type A remains A OPEN"
    - "Diagnosis does not create Type E"
    - "Diagnosis does not add secondary_types"
    - "Diagnosis does not set governance_escalation"
    - "Diagnosis does not resolve conflict"

  determinism:
    - "reordering semantically equivalent support does not change logical Diagnosis"
    - "support arrays stable"
    - "no Date.now"
    - "no Math.random"
    - "no network/LLM/IO"

  integration:
    - "Knowledge Bundle contains valid Diagnosis N4"
    - "EKS validate_structure accepts Bundle with N4"
    - "IES preserves Diagnosis N4"
    - "Reasoning consumes IES containing N4 without bypass"
    - "Reasoning still applies own evidence/hypothesis gates"
    - "Channel Projection distinguishes Diagnosis from Evidence/Hypothesis"
    - "existing OP/EB/EKS/IES/RE/CP/E2E regression remains green"

acceptance_criteria:
  - "Diagnostic Rule Registry v1 executable"
  - "exactly one ACTIVE diagnostic rule"
  - "to_n4 emits UNRESOLVED_CONFLICT only under approved criterion"
  - "N3 alone does not create N4"
  - "Conflict alone does not create N4"
  - "Diagnosis schema exactly follows DIAGNOSIS_N4_PHYSICAL_V1"
  - "all four NOT_ASSESSED placeholders preserved"
  - "causal_status NON_CAUSAL"
  - "statement non-causal"
  - "support traceable"
  - "Type A remains A OPEN"
  - "no Type E fabrication"
  - "no resolution authority"
  - "no G8"
  - "no thresholds"
  - "no new categories"
  - "no LLM/network/IO"
  - "inputs not mutated"
  - "downstream EKS/IES/RE/CP remain compatible"
  - "contracts unchanged"
  - "only authorized runtime/test/fixture/report files changed"
  - "new tests pass"
  - "full regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read contracts_in_force"
  - "modify lib/director-ia-evidence-builder.js"
  - "modify test/director-ia-evidence-builder.test.js"
  - "create fixtures/director-ia/evidence-n4/"
  - "create docs/dev-loop/reports/IMPL-EVIDENCE-N4-001.md"
  - "update CURRENT_TASK through permitted transitions"
  - "run Evidence Builder tests"
  - "run full Director IA regression"
  - "run git diff --check"

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify any runtime except lib/director-ia-evidence-builder.js"
  - "modify tests outside test/director-ia-evidence-builder.test.js"
  - "modify server.js"
  - "modify package.json"
  - "use G8"
  - "add thresholds"
  - "add causal rules"
  - "add diagnostic categories"
  - "add B/C/D/E classifier"
  - "create Type E"
  - "add resolution rules"
  - "mutate conflicts"
  - "use LLM/network/DB/tools"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW if the approved UNRESOLVED_CONFLICT-only N4 subset is
  implemented deterministically without G8 or architectural changes and all
  regressions remain green.
  BLOCKED or STOPPED if implementation requires calibrated severity/impact/
  confidence/materiality, causal semantics, new categories, new conflict types,
  resolution authority, G8, contract changes or modification of another runtime.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EVIDENCE-N4-001.md"