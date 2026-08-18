# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T22:27:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer vertical slice productivo de entrada real del Director
  IA usando la fuente ARR existente: get_arr_snapshot / loadArrProyForPlant
  para venta_ton. Crear una fachada/adapter mínimo que reciba una petición
  autenticada con planta_id, ejecute la fuente ARR existente, produzca
  MINIMAL_EXECUTION_ENVELOPE conforme a 03A y encadene Observation Pipeline ->
  Evidence Builder -> EKS sin modificar contratos cognitivos ni runtimes
  N1-N5 existentes.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md (solo lectura)"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"

  - "existing ARR runtime that exports get_arr_snapshot/loadArrProyForPlant (modify only if strictly required by adapter compatibility and already authorized by task scope)"
  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-eks-integration.js (solo lectura, if present)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura, if present)"

  - "new Director IA ARR adapter/facade runtime"
  - "new tests for that adapter/facade"
  - "new synthetic fixtures for adapter mapping only"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar Observation Pipeline"
  - "modificar Evidence Builder"
  - "modificar EKS semantics"
  - "modificar IES"
  - "modificar Reasoning Engine"
  - "modificar Channel Projection"
  - "modificar E2E cognitive orchestrator"

  - "wire WhatsApp"
  - "wire Twilio"
  - "wire legacy chat"
  - "convert user text into N1/N2/N3/N4"

  - "create conversational memory"
  - "create session layer"
  - "create WhoAmI"
  - "create small talk"

  - "create new ARR query semantics"
  - "create new business metric"
  - "create new source capability"
  - "invent source identity"
  - "invent content_author_id"

  - "create N3/N4 rules"
  - "create B/C/D/E classifier"
  - "create Type E"
  - "use G8"
  - "create causal semantics"

  - "modify server.js"
  - "modify package.json"
  - "modify .env"
  - "add dependencies"

  - "commit"
  - "push"
  - "merge"
  - "chain next task"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"
  verdict: "CONDITIONAL-GO"
  confirmed_findings:
    - "existing real source: get_arr_snapshot / loadArrProyForPlant"
    - "real metric candidate: venta_ton"
    - "no productive MINIMAL_EXECUTION_ENVELOPE producer exists"
    - "Planner and Tool Orchestrator do not execute the source"
    - "legacy chat appendix is prose for LLM, not ObservationRecord"
    - "first entrypoint should be authenticated dashboard request with planta_id"
    - "new adapter should produce envelope; OP remains unchanged"
    - "trace_id should originate in cycle facade"
    - "server.js should invoke facade only in future wiring"
    - "chat/Twilio remain outside N1-N5"
    - "G2/G3 not required if contracts stay unchanged"

vertical_slice:
  trigger:
    type: "authenticated dashboard request"
    required_input:
      - "planta_id"

  real_source:
    tool: "get_arr_snapshot / loadArrProyForPlant"
    metric: "venta_ton"

  path:
    - "authenticated request"
    - "Director IA ARR facade"
    - "ARR source execution"
    - "MINIMAL_EXECUTION_ENVELOPE"
    - "Observation Pipeline"
    - "Evidence Builder N2/N3/N4"
    - "EKS append/persistence boundary"

  explicitly_not_in_slice:
    - "IES"
    - "Reasoning"
    - "Channel Projection"
    - "WhatsApp"
    - "chat"
    - "session"

new_runtime_responsibilities:

  facade:
    responsibilities:
      - "accept validated planta_id and execution context"
      - "create/inject trace_id for the cycle"
      - "invoke ARR adapter"
      - "pass produced MINIMAL_EXECUTION_ENVELOPE to OP"
      - "pass OP output to EB"
      - "pass valid Knowledge Bundle to EKS"
      - "return structured cycle result for caller/tests"
    prohibited:
      - "interpret ARR business meaning beyond approved mapping"
      - "create facts directly"
      - "create evidence directly"
      - "create diagnoses directly"
      - "call Reasoning Engine"
      - "render channel output"

  arr_adapter:
    responsibilities:
      - "invoke existing ARR source"
      - "translate technical execution outcome into MINIMAL_EXECUTION_ENVELOPE"
      - "preserve raw source identity"
      - "preserve raw payload reference"
      - "map technical states fail-closed"
    prohibited:
      - "emit ObservationRecord directly"
      - "emit Fact/Evidence/Diagnosis"
      - "infer business absence from empty response"
      - "rank sources"
      - "interpret user intent"

minimal_execution_envelope:
  must_conform_to: "03A MINIMAL_EXECUTION_ENVELOPE contract"

  required_semantic_content:
    - "trace_id"
    - "tool/source identity"
    - "source.system"
    - "source_instance_id when available"
    - "content_author_id nullable when not applicable/resolvable"
    - "extracted_by"
    - "triggered_by"
    - "entity/planta context"
    - "metric_or_event = venta_ton"
    - "period/query scope from real source response/request"
    - "raw_payload_reference"
    - "technical execution status"
    - "normalized payload only where existing 03A contract permits"

  provenance_rules:
    - "content_author_id is never fabricated"
    - "extracted_by is technical extractor, not author"
    - "triggered_by is trigger identity, not assertion source"
    - "source.system identifies ARR system/source"
    - "raw_payload_reference points to the real raw result/reference"
    - "trace_id is preserved unchanged downstream"

status_mapping:
  ACQUIRED_OK:
    condition: >
      ARR execution succeeds and returns transportable data that conforms to the
      requested planta/scope.
    prohibited_meaning:
      - "business completeness beyond queried scope"
      - "truth guarantee"

  ACQUIRED_EMPTY:
    condition: >
      ARR execution succeeds technically but returns no transportable records
      for the requested scope.
    prohibited_meaning:
      - "venta_ton is zero"
      - "business record does not exist"
      - "absence confirmed"

  TOOL_ERROR:
    condition: >
      ARR execution fails technically, throws, times out, or returns an
      unusable technical failure.
    prohibited_meaning:
      - "business data is empty"
      - "source has no records"

  SOURCE_RESTRICTED:
    condition: >
      Existing ARR source indicates access/permission restriction distinctly
      from technical failure, only if this condition is physically observable.
    fail_closed_rule: >
      If the source cannot distinguish restriction from technical failure,
      do not invent SOURCE_RESTRICTED.

  SOURCE_NOT_INTEGRATED:
    condition: >
      Only if the requested capability/source is known but not wired to this
      adapter. It must not be used for ARR when ARR integration exists.

  ENTITY_UNRESOLVED:
    condition: >
      planta/entity required for the query cannot be resolved to the required
      canonical source identifier without invention.

  QUERY_SCOPE_INCOMPLETE:
    condition: >
      Source returns data but the requested query scope is demonstrably not
      fully covered, only where this condition can be established from source
      metadata/response.
    fail_closed_rule: >
      Do not invent incompleteness when the source does not expose enough
      metadata to prove it.

entity_boundary:
  required_input: "planta_id"

  rules:
    - "adapter does not guess planta_id"
    - "invalid/missing planta_id fails before ARR execution"
    - "no fuzzy entity resolution"
    - "AMBIGUOUS/UNRESOLVED does not become canonical entity"
    - "existing source mapping is reused if already present"

traceability:
  trace_id_owner: "Director IA ARR facade"
  rules:
    - "one trace_id per Director IA execution cycle"
    - "same trace_id enters MINIMAL_EXECUTION_ENVELOPE"
    - "same trace_id propagates through OP/EB/EKS"
    - "no regeneration inside adapter/OP/EB"

security_boundary:
  - "credentials remain inside existing ARR/source access layer"
  - "adapter receives no secret material unless existing source API already requires internal config"
  - "credentials never enter envelope"
  - "credentials never enter ObservationRecord"
  - "credentials never enter Knowledge Bundle"
  - "no new secrets committed"

required_new_runtime:
  preferred_name: "lib/director-ia-real-input-arr.js"

  required_exports:
    - "createDirectorIaArrInput"

  expected_shape: >
    createDirectorIaArrInput({ arrSource, observationPipeline, evidenceBuilder,
    eks, idFactory, clock }).run(input)

  note: >
    Exact dependency names may follow existing repository factory conventions;
    do not change contract semantics to match this suggested naming.

required_fixtures:
  preferred_directory: "fixtures/director-ia/real-input-arr/"

  cases:
    - "arr-success-one-record.json"
    - "arr-success-multiple-records.json"
    - "arr-empty.json"
    - "arr-tool-error.json"
    - "arr-entity-unresolved.json"
    - "arr-scope-incomplete.json"

  fixture_rules:
    - "synthetic values only"
    - "shape modeled on real ARR runtime contract"
    - "no credentials"
    - "no institutional sensitive data"
    - "no fabricated source capabilities"

tests_required:

  facade:
    - "factory exposes run"
    - "dependencies are injected"
    - "missing planta_id fails before ARR source execution"
    - "trace_id is created/injected once per cycle"
    - "input is not mutated"

  adapter_success:
    - "real-source success maps to valid MINIMAL_EXECUTION_ENVELOPE"
    - "venta_ton remains the metric/event"
    - "planta identity is preserved"
    - "provenance fields are preserved"
    - "content_author_id remains null when not applicable"
    - "raw_payload_reference is preserved"
    - "ACQUIRED_OK reaches OP"

  adapter_fail_closed:
    - "empty technical result -> ACQUIRED_EMPTY, not ABSENCE_CONFIRMED"
    - "tool failure -> TOOL_ERROR, not empty business data"
    - "unresolved entity -> ENTITY_UNRESOLVED without invented entity"
    - "scope incomplete only when physically demonstrated"
    - "unsupported/unobservable statuses are not invented"

  op_boundary:
    - "adapter emits envelope, not ObservationRecord"
    - "OP remains the only component that emits AcquisitionStatus/ObservationRecord"
    - "AcquisitionStatus remains separate from ObservationRecord"

  eb_boundary:
    - "EB receives OP output only"
    - "EB never receives raw ARR source response directly"
    - "no direct Fact/Evidence/Diagnosis creation in adapter"

  eks_boundary:
    - "only valid Knowledge Bundle reaches EKS"
    - "EKS receives bundle without epistemic reinterpretation"
    - "trace_id survives to persisted/in-memory snapshot boundary"

  vertical_slice:
    - "ARR success -> envelope -> OP -> EB -> EKS works end-to-end"
    - "ARR empty remains fail-closed through EB"
    - "ARR tool error remains fail-closed through EB"
    - "real input path does not invoke RE/CP"
    - "chat/Twilio is not invoked"

  source_guards:
    - "new runtime does not import Twilio"
    - "new runtime does not import LLM/provider SDK"
    - "new runtime does not call WhatsApp/chat"
    - "new runtime does not contain DB query semantics beyond invoking existing ARR source abstraction"
    - "no credentials hardcoded"

  regression:
    - "existing Observation Pipeline tests pass"
    - "existing Evidence Builder tests pass"
    - "existing EKS tests pass"
    - "existing OP/EB/EKS integration tests pass"
    - "existing IES/RE/CP/E2E tests remain green"

acceptance_criteria:
  - "real ARR source is used through injected/existing abstraction"
  - "no new business source capability invented"
  - "MINIMAL_EXECUTION_ENVELOPE producer now exists"
  - "trace_id owned by facade"
  - "provenance preserved"
  - "status mapping fail-closed"
  - "ACQUIRED_EMPTY does not become absence"
  - "TOOL_ERROR does not become business empty"
  - "entity is not invented"
  - "OP remains owner of AcquisitionStatus/ObservationRecord"
  - "EB consumes OP output only"
  - "valid Bundle reaches EKS"
  - "no WhatsApp/chat coupling"
  - "no RE/CP invocation"
  - "no contract changes"
  - "no G2"
  - "no G3"
  - "no G8"
  - "no server.js changes"
  - "no package.json changes"
  - "no secrets"
  - "new tests pass"
  - "full Director IA regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read contracts and audit report"
  - "read existing ARR source/runtime"
  - "read OP/EB/EKS runtimes"
  - "create lib/director-ia-real-input-arr.js"
  - "create test/director-ia-real-input-arr.test.js"
  - "create fixtures/director-ia/real-input-arr/"
  - "create docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"
  - "update CURRENT_TASK via permitted transitions"
  - "run focused tests"
  - "run full Director IA regression"
  - "run git diff --check"

conditional_allowed_action:
  existing_arr_runtime: >
    Do not modify the existing ARR runtime unless the current physical export
    cannot be consumed through injection without a tiny compatibility change.
    If modification would alter business query semantics, authentication,
    source contract or returned data meaning, STOP instead.

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify OP"
  - "modify EB"
  - "modify EKS semantics"
  - "modify IES/RE/CP/E2E"
  - "modify chat/Twilio/WhatsApp"
  - "modify server.js"
  - "modify package.json"
  - "modify .env"
  - "add dependency"
  - "add source capability"
  - "invent ARR data"
  - "invent source identity"
  - "invent content_author_id"
  - "add direct DB query if existing ARR abstraction can be used"
  - "add credentials/secrets"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW if a real ARR execution can be converted into the
  existing 03A envelope and traverses OP -> EB -> EKS without contract/runtime
  changes outside the authorized adapter/facade scope.
  BLOCKED or STOPPED if the ARR source cannot be consumed safely without G2/G3,
  new source semantics, server changes, credentials committed, or changes to
  cognitive runtimes.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"