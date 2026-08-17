# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EVIDENCE-N3-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T16:25:13-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar exclusivamente la primera franja Evidence N3 aprobada:
  registry ejecutable v1 + rule determinística no causal
  N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE versión 1.0 +
  schema EVIDENCE_N3_PHYSICAL_V1, modificando únicamente el Evidence Builder
  y sus tests/fixtures autorizados. La implementación debe permanecer
  determinística, fail-closed, sin G8, sin causalidad, sin thresholds, sin N4
  y sin clasificador B/C/D/E nuevo.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EVIDENCE-N3-001.md"

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
  - "fixtures/director-ia/evidence-n3/"

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

  - "crear N4"
  - "crear diagnostic rules"
  - "crear causal rules"
  - "crear trend rules"
  - "crear deviation rules"
  - "crear deterioration rules"
  - "crear co-occurrence rules"

  - "crear clasificador B/C/D/E"
  - "crear Tipo E"
  - "añadir secondary_types"
  - "activar governance_escalation"
  - "calcular severity"
  - "resolver conflictos"
  - "crear resolution rules"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar materiality"
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
  registry: "EVIDENCE_RULE_REGISTRY_V1"
  initial_scope: "NON_CAUSAL_CONTRADICTION_RULE_V1_ONLY"
  comparability: "FACT_COMPARABILITY_KEY_V1"
  condition: "DISTINCT_VALUE_CONTRADICTION_V1"
  evidence_schema: "EVIDENCE_N3_PHYSICAL_V1"
  statement_semantics: "NON_CAUSAL_CONTRADICTION_STATEMENT_V1"
  support: "TRACEABLE_FACT_SUPPORT_V1"
  rule_identity: "RULE_IDENTITY_STABLE_V1"
  determinism: "N3_DETERMINISTIC_OUTPUT_V1"
  conflict_boundary: "N3_CONTRADICTION_DOES_NOT_RETYPE_CONFLICT_V1"
  simple_conflict: "TYPE_A_DEFAULT_FOR_SIMPLE_VALUE_CONFLICT_V1"
  resolution_boundary: "NO_RESOLUTION_RULES_IN_N3_V1"
  g8_boundary: "N3_V1_G8_FREE_SUBSET"
  n4_boundary: "N4_REMAINS_OUT_OF_SCOPE_V1"
  reasoning_boundary: "N3_MAY_ENABLE_N5_WITHOUT_GUARANTEE_V1"
  implementation_scope: "IMPL_EVIDENCE_N3_CONTRADICTION_ONLY_V1"

rule_registry_v1:
  evidence_rules:
    - rule_id: "N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE"
      rule_version: "1.0"
      rule_category: "CONTRADICTION"
      causal: false
      status: "ACTIVE"
      input_contract: "FACT_COMPARABILITY_KEY_V1"
      output_contract: "EVIDENCE_N3_PHYSICAL_V1"

  absence_rules: []
  resolution_rules: []
  causal_rules: []
  materiality_rules: []

rule_execution:
  only_execute_if:
    - "rule status == ACTIVE"
    - "facts array has at least 2 candidate facts"
    - "facts satisfy FACT_COMPARABILITY_KEY_V1"

fact_comparability_key:
  required_equal:
    - "canonical entity identity, or same contractually valid entityless scope"
    - "metric_or_event"
    - "period"

  prohibited:
    - "different periods"
    - "different metrics/events"
    - "different canonical entities"
    - "UNRESOLVED entity resolution"
    - "AMBIGUOUS entity resolution"
    - "resolving ambiguity inside N3"

contradiction_condition:
  required:
    - "comparable fact count >= 2"
    - "distinct stable values >= 2"

  stable_value_rule: >
    Use the existing stable representation of fact.value. Do not introduce
    numeric tolerance, threshold, fuzzy comparison, statistical distance,
    semantic similarity or LLM comparison.

  prohibited:
    - "thresholds"
    - "probability"
    - "severity"
    - "causal interpretation"
    - "truth selection"
    - "source ranking"

evidence_n3_schema:
  required_fields:
    - "evidence_id"
    - "evidence_type"
    - "statement"
    - "supporting_fact_ids"
    - "applied_rule"
    - "materiality"
    - "causal_status"
    - "traceability"

  fixed_values:
    evidence_type: "CONTRADICTION"
    causal_status: "NON_CAUSAL"
    materiality: "MATERIALITY_NOT_ASSESSED"

  applied_rule:
    rule_id: "N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE"
    rule_version: "1.0"

  traceability_required:
    - "trace_id"
    - "rule_id"
    - "rule_version"

support_rules:
  - "supporting_fact_ids contains at least 2 ids"
  - "every supporting fact exists in same Bundle assembly cycle"
  - "supporting_fact_ids ordered deterministically"
  - "Evidence does not duplicate N1 ObservationRecord"
  - "Evidence does not rewrite N2 Fact"
  - "content_author_id remains owned by upstream provenance"
  - "extracted_by remains owned by upstream provenance"
  - "triggered_by remains owned by upstream provenance"

statement_rules:
  allowed_meaning:
    - "facts are incompatible within same comparison scope"
    - "facts report distinct values for same entity/metric/period"
    - "values are in contradiction"

  forbidden_meaning:
    - "X caused Y"
    - "X is probably wrong"
    - "source A is correct"
    - "the true value is X"
    - "fraud"
    - "human error"
    - "bad management"
    - "culpability"
    - "source priority"

determinism_rules:
  - "input fact order does not change logical Evidence output"
  - "supporting_fact_ids sorted stably"
  - "same facts + same rule version -> same logical result"
  - "evidence_id generated through existing/injected idFactory"
  - "no Date.now"
  - "no Math.random"
  - "no LLM"
  - "no IO"

conflict_boundary:
  - "N3 CONTRADICTION and compound Conflict are separate objects"
  - "Evidence does not change primary_type"
  - "simple conflict may remain Type A OPEN"
  - "no B/C/D/E classifier added"
  - "no Type E inferred"
  - "no secondary_types added"
  - "no governance_escalation change"
  - "no severity calculation"
  - "no resolution transition"

n4_boundary:
  - "to_n4 remains fail-closed unless an already-authorized diagnostic rule exists"
  - "this task must not create N4 output merely because N3 now exists"

reasoning_boundary:
  - "valid N3 may supply supporting_evidence_ids downstream"
  - "N3 never emits hypothesis"
  - "N3 never emits recommendation"
  - "N3 does not force Reasoning Engine to infer"
  - "Reasoning Engine retains all existing gates"

required_fixtures:
  - "contradiction-two-values.json"
  - "contradiction-three-facts.json"
  - "same-value-no-contradiction.json"
  - "different-period-no-contradiction.json"
  - "different-metric-no-contradiction.json"
  - "different-entity-no-contradiction.json"
  - "ambiguous-entity-no-contradiction.json"

fixture_rules:
  - "all synthetic"
  - "no institutional real data"
  - "no thresholds"
  - "no G8"
  - "no causal semantics"
  - "no Type E"
  - "no N4"

tests_required:

  registry:
    - "registry contains exactly one ACTIVE evidence rule"
    - "rule identity/version exact"
    - "causal=false"
    - "absence/resolution/causal/materiality registries remain empty"

  n3_creation:
    - "two comparable facts with distinct values -> exactly one CONTRADICTION Evidence"
    - "three comparable facts with distinct values -> deterministic Evidence support"
    - "same comparable value -> zero Evidence"
    - "less than 2 facts -> zero Evidence"

  comparability:
    - "different period -> zero CONTRADICTION"
    - "different metric -> zero CONTRADICTION"
    - "different entity -> zero CONTRADICTION"
    - "UNRESOLVED entity -> zero CONTRADICTION"
    - "AMBIGUOUS entity -> zero CONTRADICTION"

  schema:
    - "Evidence contains all required EVIDENCE_N3_PHYSICAL_V1 fields"
    - "evidence_type == CONTRADICTION"
    - "causal_status == NON_CAUSAL"
    - "materiality == MATERIALITY_NOT_ASSESSED"
    - "applied_rule id/version exact"
    - "supporting_fact_ids >= 2"
    - "traceability contains trace_id + rule identity"

  semantics:
    - "statement remains non-causal"
    - "Evidence does not select true value"
    - "Evidence does not rank sources"
    - "Evidence does not add severity/probability"

  determinism:
    - "reversing fact input order produces same logical Evidence"
    - "supporting_fact_ids order stable"
    - "input facts are not mutated"
    - "input observations are not mutated"

  conflict_boundary:
    - "simple conflict remains Type A OPEN where current classifier applies"
    - "N3 does not create Type E"
    - "N3 does not add secondary_types"
    - "N3 does not set governance_escalation=true"
    - "N3 does not resolve conflict"

  n4_boundary:
    - "N3 presence alone does not produce N4 diagnoses"

  integration:
    - "Knowledge Bundle with contradiction contains Evidence N3"
    - "EKS validate_structure accepts resulting Bundle"
    - "IES preserves Evidence N3"
    - "Reasoning can consume IES containing legitimate N3 without bypass"
    - "Reasoning still applies its own gates"
    - "Channel Projection preserves separation Fact/Evidence/Hypothesis"
    - "existing OP/EB/EKS/IES/RE/CP/E2E regression passes"

acceptance_criteria:
  - "Evidence Builder registry v1 executable"
  - "exactly one evidence rule ACTIVE"
  - "to_n3 produces CONTRADICTION only under approved comparability"
  - "Evidence schema exactly follows EVIDENCE_N3_PHYSICAL_V1"
  - "statement is non-causal"
  - "support is traceable"
  - "materiality remains MATERIALITY_NOT_ASSESSED"
  - "no thresholds"
  - "no G8"
  - "no B/C/D/E classifier new"
  - "no Type E fabrication"
  - "no severity"
  - "no resolution rules"
  - "no N4 creation"
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
  - "create fixtures/director-ia/evidence-n3/"
  - "create docs/dev-loop/reports/IMPL-EVIDENCE-N3-001.md"
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
  - "add B/C/D/E classifier"
  - "create Type E"
  - "add N4 rules/output"
  - "add resolution rules"
  - "use LLM/network/DB/tools"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW if the approved CONTRADICTION-only N3 subset is
  implemented deterministically without G8 or architectural changes and all
  regressions remain green.
  BLOCKED or STOPPED if implementation requires thresholds, causal semantics,
  new conflict types, N4, G8, contract changes or modification of another
  runtime.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EVIDENCE-N3-001.md"