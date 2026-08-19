# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-19T13:06:59-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-19"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar la composición mínima del primer ciclo cognitivo real completo
  del Director IA usando el vertical slice ARR ya integrado. Extender el ciclo
  físico existente ARR -> MINIMAL_EXECUTION_ENVELOPE -> OP -> EB -> EKS para
  continuar con IES -> Reasoning Engine -> Channel Projection DASHBOARD,
  reutilizando exclusivamente contratos y runtimes ya aprobados. La tarea es
  COMPOSITION_ONLY: no crea epistemología, persistencia, sesión, canal real,
  nuevas fuentes ni reglas.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md (solo lectura)"

  - "docs/director-ia/* (solo lectura)"

  - "lib/director-ia-real-input-arr.js"
  - "new Director IA full-cycle composition runtime"

  - "existing Observation Pipeline runtime (solo lectura)"
  - "existing Evidence Builder runtime (solo lectura)"
  - "existing EKS runtime (solo lectura)"
  - "existing IES Builder runtime (solo lectura)"
  - "existing Reasoning Engine runtime (solo lectura)"
  - "existing Channel Projection runtime (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura unless composition reuse requires no semantic change)"

  - "new full-cycle composition tests"
  - "new synthetic fixtures only if required for composition"

  - "test/director-ia-real-input-arr.test.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"
  - "test/director-ia-*.test.js (solo lectura for regression)"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"

out_of_scope:
  - "modificar contratos"
  - "modificar OP semantics"
  - "modificar EB semantics"
  - "modificar EKS semantics"
  - "modificar IES semantics"
  - "modificar RE semantics"
  - "modificar CP semantics"

  - "crear N1/N2/N3/N4/N5 rules"
  - "crear B/C/D/E classifier"
  - "crear Tipo E"
  - "crear causalidad"
  - "usar G8"

  - "crear persistencia durable"
  - "crear sesión"
  - "crear memoria conversacional"
  - "crear identidad conversacional"
  - "crear WhoAmI"

  - "wire WhatsApp"
  - "wire Twilio"
  - "wire chat legado"
  - "modificar server.js"
  - "crear endpoint"
  - "modificar package.json"
  - "agregar dependencies"

  - "crear nueva fuente"
  - "crear nueva métrica"
  - "cambiar ARR query semantics"
  - "crear secrets"
  - "modificar .env"

  - "commit"
  - "push"
  - "merge"
  - "chain next task"

baseline_in_force:
  source:
    runtime: "get_arr_snapshot / loadArrProyForPlant"
    metric: "venta_ton"

  implemented_real_path:
    - "validated planta_id"
    - "Director IA ARR facade"
    - "existing ARR source"
    - "MINIMAL_EXECUTION_ENVELOPE"
    - "Observation Pipeline"
    - "Evidence Builder N2/N3/N4"
    - "EKS"

  verified_previous_tests:
    focused_arr: 24
    director_ia_regression: 292
    failures: 0

  readiness_audit:
    verdict: "CONDITIONAL-GO"
    selected_candidate: "A_FULL_CYCLE_COMPOSITION"
    classification: "COMPOSITION_ONLY"
    findings:
      - "EKS -> IES is physically compatible"
      - "IES -> RE is physically compatible"
      - "RE -> CP is physically compatible"
      - "durable persistence is not required for one cycle"
      - "conversation session is not required for one cycle"
      - "WhatsApp/chat are not required"
      - "N4 IES projection debt is DEBT_NON_BLOCKING"
      - "ARR snapshot requires query_context_metadata before valid IES construction"

target_real_cycle:
  path:
    - "validated dashboard-style input"
    - "ARR facade"
    - "ARR source"
    - "MINIMAL_EXECUTION_ENVELOPE"
    - "OP"
    - "EB"
    - "EKS"
    - "query_context_metadata composition"
    - "IES"
    - "Reasoning Engine"
    - "Channel Projection DASHBOARD"
    - "structured caller result"

  explicitly_not_in_cycle:
    - "server HTTP route"
    - "WhatsApp"
    - "Twilio"
    - "legacy chat"
    - "durable persistence"
    - "conversation session"

composition_runtime:
  preferred_name: "lib/director-ia-real-cycle.js"

  preferred_export: "createDirectorIaRealCycle"

  expected_shape: >
    createDirectorIaRealCycle({
      arrInput,
      iesBuilder,
      reasoningEngine,
      channelProjection,
      clock,
      idFactory
    }).run(input)

  note: >
    Exact dependency names may follow physical repository conventions.
    Reuse existing factories rather than duplicate their internal logic.

  responsibilities:
    - "invoke existing ARR real-input cycle"
    - "receive resulting valid EKS snapshot/bundle boundary"
    - "construct only the query_context_metadata required by existing IES contract"
    - "invoke existing IES Builder"
    - "invoke existing Reasoning Engine with IES only"
    - "invoke existing Channel Projection with DASHBOARD destination"
    - "return structured full-cycle result"
    - "preserve trace_id across the complete cycle"

  prohibited:
    - "read raw ARR response after ARR facade boundary"
    - "create ObservationRecord"
    - "create Fact"
    - "create Evidence"
    - "create Diagnosis"
    - "create Hypothesis directly"
    - "create Recommendation directly"
    - "interpret business meaning outside existing runtimes"
    - "mutate intermediate artifacts"

query_context_metadata:
  requirement: >
    The prior readiness audit proved that a raw ARR EKS snapshot cannot enter
    IES without query_context_metadata and fails with
    MISSING_QUERY_CONTEXT_METADATA.

  rule: >
    Reuse the exact semantic shape already accepted by the existing E2E/IES
    contracts. Do not introduce new query metadata fields or meanings.

  ownership: "full-cycle composition layer"

  source:
    - "validated cycle input"
    - "existing ARR request scope"
    - "existing trace/query context"

  prohibited:
    - "invent user intent"
    - "invent requested domains"
    - "invent unavailable scope"
    - "derive business conclusions"
    - "copy secrets"

ies_boundary:
  rules:
    - "IES Builder receives supported EKS/Bundle artifact plus required query_context_metadata"
    - "no raw ARR payload enters IES"
    - "no credentials enter IES"
    - "existing IES fail-closed behavior remains intact"
    - "N4 projection debt is not fixed in this task"

reasoning_boundary:
  rules:
    - "Reasoning Engine receives IES only"
    - "no EKS direct bypass"
    - "no raw ARR direct bypass"
    - "no synthetic Evidence injected"
    - "no synthetic Diagnosis injected"
    - "RE may legitimately return zero hypotheses/recommendations"
    - "zero hypotheses is not a failure when gates are not satisfied"

channel_projection_boundary:
  destination: "DASHBOARD"

  rules:
    - "CP receives only existing supported semantic inputs"
    - "CP remains presentation, not truth"
    - "CP does not manufacture N5"
    - "NO_KNOWLEDGE/partial states remain visible when applicable"
    - "IRRENUNCIABLE behavior remains governed by existing CP runtime"

status_propagation:
  ACQUIRED_EMPTY:
    expected:
      - "remains technical/data availability state"
      - "may yield DATA_NOT_FOUND/PARTIAL according to existing contracts"
    forbidden:
      - "ABSENCE_CONFIRMED"
      - "venta_ton = 0"
      - "business absence"

  TOOL_ERROR:
    expected:
      - "technical failure remains visible downstream according to existing contracts"
    forbidden:
      - "empty business result"
      - "negative fact"

  ENTITY_UNRESOLVED:
    expected:
      - "unresolved entity remains explicit/fail-closed"
    forbidden:
      - "canonical entity invention"

  QUERY_SCOPE_INCOMPLETE:
    expected:
      - "partial/incomplete scope remains explicit"
    forbidden:
      - "full coverage claim"

traceability:
  rules:
    - "trace_id originates in ARR cycle facade"
    - "same trace_id survives ARR -> OP -> EB -> EKS -> IES -> RE -> CP"
    - "composition layer does not regenerate trace_id"
    - "all returned stage artifacts must be attributable to same execution cycle"

non_mutation:
  required:
    - "caller input not mutated"
    - "ARR cycle result not mutated"
    - "EKS/Bundle not mutated by composition"
    - "IES not mutated after construction"
    - "Reasoning Result not mutated by CP"
    - "dependency outputs remain independently inspectable in tests"

structured_result:
  minimum_fields:
    - "trace_id"
    - "arr_cycle"
    - "ies"
    - "reasoning_result"
    - "channel_output"

  rules:
    - "return artifacts for testability/auditability"
    - "do not expose secrets"
    - "do not require serialization to HTTP"
    - "do not require channel transport"

required_fixtures:
  preferred_directory: "fixtures/director-ia/real-cycle/"

  cases:
    - "arr-ok-full-cycle.json"
    - "arr-empty-full-cycle.json"
    - "arr-tool-error-full-cycle.json"
    - "arr-entity-unresolved-full-cycle.json"
    - "arr-scope-incomplete-full-cycle.json"

  rules:
    - "synthetic data only"
    - "reuse semantic shapes proven by ARR and E2E fixtures"
    - "no credentials"
    - "no WhatsApp payload"
    - "no fabricated hypotheses/evidence"

tests_required:

  factory:
    - "factory exposes run"
    - "dependencies are injected"
    - "no server/chat/Twilio dependency"
    - "input is not mutated"

  composition:
    - "existing ARR cycle invoked exactly once"
    - "ARR output is not reinterpreted"
    - "query_context_metadata is added using existing contract shape"
    - "IES Builder receives compatible EKS/Bundle input"
    - "RE receives IES only"
    - "CP receives existing RE/IES-compatible input"
    - "destination is DASHBOARD"

  happy_path:
    - "ARR ACQUIRED_OK completes through IES -> RE -> CP"
    - "structured result includes all required artifacts"
    - "trace_id is identical across stages"
    - "zero hypotheses remains valid when RE gates do not justify N5"
    - "Channel Projection produces valid DASHBOARD output"

  fail_closed:
    - "ARR empty completes without business absence invention"
    - "ARR tool error remains technical failure"
    - "entity unresolved remains explicit"
    - "query scope incomplete remains partial/incomplete"
    - "no failure path fabricates Evidence/Diagnosis/Hypothesis"

  boundaries:
    - "no raw ARR source response is passed directly to IES/RE/CP"
    - "RE never receives EKS directly"
    - "CP does not invoke RE"
    - "composition runtime does not create N1-N5 artifacts"
    - "N4 projection debt remains unchanged"

  non_mutation:
    - "input not mutated"
    - "ARR cycle output not mutated"
    - "IES output not mutated"
    - "Reasoning output not mutated"

  source_guards:
    - "no Twilio import"
    - "no WhatsApp/chat import"
    - "no LLM provider import in composition runtime"
    - "no DB query"
    - "no credentials"
    - "no server.js dependency"

  regression:
    - "real-input ARR focused tests remain green"
    - "OP tests remain green"
    - "EB tests remain green"
    - "EKS tests remain green"
    - "IES tests remain green"
    - "RE tests remain green"
    - "CP tests remain green"
    - "E2E tests remain green"
    - "full test/director-ia-*.test.js regression remains green"

acceptance_criteria:
  - "ARR real cycle reaches CP DASHBOARD"
  - "composition only; no semantic runtime duplicated"
  - "query_context_metadata supplied using existing approved shape"
  - "EKS -> IES compatible"
  - "IES -> RE compatible"
  - "RE -> CP compatible"
  - "RE consumes IES only"
  - "trace_id preserved end-to-end"
  - "fail-closed statuses preserved"
  - "zero hypotheses accepted when justified"
  - "no fabricated Evidence/Diagnosis/N5"
  - "no persistence requirement introduced"
  - "no session requirement introduced"
  - "no WhatsApp/chat coupling"
  - "no server.js modification"
  - "no package.json modification"
  - "no contract modification"
  - "no G2"
  - "no G3"
  - "no G8"
  - "no credentials"
  - "N4 projection debt not expanded/fixed"
  - "new focused tests pass"
  - "full Director IA regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read contracts and prior reports"
  - "read existing ARR/IES/RE/CP factories"
  - "modify lib/director-ia-real-input-arr.js only if composition hook is strictly necessary and semantics remain unchanged"
  - "create lib/director-ia-real-cycle.js"
  - "create test/director-ia-real-cycle.test.js"
  - "create fixtures/director-ia/real-cycle/"
  - "create docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md"
  - "update CURRENT_TASK through permitted transitions"
  - "run focused tests"
  - "run full Director IA regression"
  - "run git diff --check"

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify OP semantics"
  - "modify EB semantics"
  - "modify EKS semantics"
  - "modify IES semantics"
  - "modify RE semantics"
  - "modify CP semantics"
  - "modify server.js"
  - "modify package.json"
  - "modify chat/Twilio/WhatsApp"
  - "add persistence"
  - "add session"
  - "add endpoint"
  - "add dependencies"
  - "add secrets"
  - "add source/tool"
  - "add cognitive rules"
  - "use G8"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW if the existing ARR real-input slice can be composed
  through EKS -> IES -> RE -> CP DASHBOARD without contract changes,
  architectural changes or new cognitive semantics, with all focused and
  regression tests green.

  BLOCKED or STOPPED if completion requires modifying IES/RE/CP semantics,
  introducing persistence/session, changing contracts, server wiring, G2/G3,
  G8, new epistemology or a new source.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md"