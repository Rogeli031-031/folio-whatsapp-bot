# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el agente no modifica el repositorio fuera de este task.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

---

```yaml
task_id: "ARCH-DIRECTOR-IA-POST-N4-READINESS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T22:27:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: PENDING_IF_REQUIRED

objective: >
  Auditar el estado físico y contractual del Director IA después de la
  implementación de Evidence N3 y Diagnosis N4, identificar los gaps reales
  restantes y determinar el siguiente hito de mayor valor. La tarea no
  implementa runtime ni congela arquitectura nueva. Debe separar explícitamente
  lo ya operativo, los gaps de integración/productización y las capacidades
  cognitivas todavía bloqueadas por decisiones contractuales o G8.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"

  - "AGENTS.md (solo lectura)"
  - "docs/dev-loop/LOOP_PROTOCOL.md (solo lectura)"

  - "docs/director-ia/ (solo lectura)"
  - "lib/director-ia-*.js (solo lectura)"
  - "test/director-ia-*.test.js (solo lectura)"
  - "fixtures/director-ia/ (solo lectura)"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"

audit_dimensions:
  - "N1/N2 Observation/Facts readiness"
  - "N3 Evidence readiness"
  - "N4 Diagnosis readiness"
  - "EKS persistence/validation readiness"
  - "IES projection readiness"
  - "Reasoning Engine readiness"
  - "Channel Projection readiness"
  - "Director IA E2E readiness"
  - "real source ingestion readiness"
  - "session/conversation continuity readiness"
  - "persistence/runtime state readiness"
  - "WhatsApp/channel integration readiness"
  - "observability and failure handling readiness"
  - "security/governance boundaries visible in runtime"
  - "remaining synthetic-only assumptions"
  - "remaining G2/G3/G8 dependencies"

required_analysis:
  - >
    Trace the physically executable path from incoming observation/input through
    OP -> EB N2 -> EB N3 -> EB N4 -> EKS -> IES -> RE -> CP -> E2E.
  - >
    For every stage classify it as PRODUCTIVE, STRUCTURALLY_READY,
    SYNTHETIC_ONLY, PARTIAL, BLOCKED, or NOT_PRESENT and cite concrete files,
    exports, tests and fixtures.
  - >
    Identify every point where production data, persistence, session state,
    transport/channel, external source integration or operational configuration
    is currently absent or simulated.
  - >
    Distinguish architectural/cognitive gaps from productization/integration
    gaps. Do not combine them into one generic blocker.
  - >
    Reassess the previously observed N4 downstream gaps, including IES handling
    of Diagnosis fields and the E2E type-e-conflict behavior, and classify each
    as blocker, debt, expected behavior, or follow-up candidate.
  - >
    Determine which next milestone gives the highest value without requiring
    speculative semantics.
  - >
    Compare at minimum these candidate directions:
    A) productization / real-input integration,
    B) N4 downstream normalization,
    C) conflict classifier B/C/D/E,
    D) G8 materiality/severity calibration,
    E) causal evidence/diagnosis,
    F) persistence/session/operational hardening.
  - >
    For each candidate identify prerequisites, gates required, files likely
    affected, risk, expected value and whether the current contracts are
    sufficient.
  - >
    Recommend exactly one NEXT_TASK and up to two deferred follow-ups.

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify lib/"
  - "modify test/"
  - "modify fixtures/"
  - "modify server.js"
  - "modify package.json"
  - "modify configuration"
  - "invent thresholds"
  - "invent materiality"
  - "invent severity"
  - "invent causal rules"
  - "invent classifier semantics"
  - "implement the recommended next task"
  - "use G2 without explicit human authorization"
  - "use G3 without explicit human authorization"
  - "use G8 without explicit human authorization"
  - "commit"
  - "push"
  - "merge"
  - "chain the next task"

deliverables:
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"
  - "updated docs/dev-loop/CURRENT_TASK.md"

report_required_sections:
  - "Executive verdict"
  - "Physical pipeline map"
  - "Stage-by-stage readiness matrix"
  - "What is genuinely productive today"
  - "What remains synthetic or structural only"
  - "N4 downstream gap reassessment"
  - "Productization gaps"
  - "Cognitive/contractual gaps"
  - "G2/G3/G8 dependency map"
  - "Candidate next milestones comparison"
  - "Recommended NEXT_TASK"
  - "Deferred follow-ups"
  - "Explicit non-goals"
  - "Files inspected"
  - "Validation evidence"

acceptance_criteria:
  - "No runtime or contract modified"
  - "Current executable pipeline traced physically"
  - "Claims grounded in repository evidence"
  - "Productization and cognitive gaps separated"
  - "N4 downstream observations reassessed"
  - "At least six candidate directions compared"
  - "Gate requirements identified per candidate"
  - "Exactly one NEXT_TASK recommended"
  - "No speculative semantics introduced"
  - "git diff --check clean"
  - "only CURRENT_TASK and report changed"

expected_terminal_state: >
  DONE_PENDING_REVIEW when the post-N4 readiness audit is complete and one
  evidence-backed next task has been recommended without implementing it.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md"