# CURRENT_TASK

Tarea vigente del Loop v0.1.

```yaml
task_id: "IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T12:50:19-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el hardening operacional mínimo requerido para remover los
  blockers físicos identificados por
  ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001:
  timeout finito efectivo para ARR/ciclo, abort/cancelación segura del cliente,
  logger productivo a stdout para los eventos del endpoint, readiness ligera
  sin ejecutar el grid ARR completo y smoke/post-deploy validation. Mantener
  intacta la epistemología del Director IA, sin retries automáticos,
  persistencia, sesión, nuevas dependencias ni cambios contractuales.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001.md (solo lectura)"

  - "server.js"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "lib/director-ia-real-cycle.js (solo si hace falta propagar abort/timeout sin cambio semántico)"
  - "lib/director-ia-real-input-arr.js (solo si hace falta propagar abort/timeout sin cambio semántico)"
  - "existing ARR DB/source access runtime involved in computePronosticoProyByPlant/loadArrProyForPlant"
  - "existing health/readiness helpers"
  - "existing logger helpers"

  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.js"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"

  - "new/modified focused operational hardening tests"
  - "new smoke script/test if repository conventions permit without dependency changes"

  - "package.json (solo lectura)"
  - "frontend-dashboard/package.json (solo lectura)"
  - ".env references (solo lectura)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar N1-N5 semantics"
  - "modificar ARR business query meaning"
  - "agregar retry automático"
  - "agregar persistence/session"
  - "agregar queue/background jobs"
  - "agregar rate limiting"
  - "agregar metrics backend sofisticadas"
  - "agregar alerting provider"
  - "wire WhatsApp/Twilio/chat"
  - "agregar dependencia"
  - "modificar package.json"
  - "modificar contracts"
  - "usar G8"
  - "crear G2/G3"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"

baseline_in_force:
  endpoint:
    path: "POST /api/director-ia/cycle"
    auth: "existing dashboard JWT"
    authz: "existing planta/GA restrictions"
    observability_events:
      - "cycle_request_started"
      - "cycle_request_completed"
      - "cycle_request_failed"
    current_gap: "server.js does not inject productive logger"

  arr:
    current_gap: >
      computePronosticoProyByPlant / underlying query has no effective finite
      statement timeout. connectionTimeoutMillis only bounds connection
      acquisition, not query execution.

  client:
    current_gap: "no explicit AbortController/fetch timeout for cycle request"

  rollout:
    kill_switch: "ENABLE_DIRECTOR_IA"
    exposure: "JWT + dashboard + planta authorization"

  build_gate:
    frontend_command: "npm ci && npm run build"
    required_for_ui_changes: true

hardening_scope:

  backend_timeout:
    requirements:
      - "finite timeout for the ARR/source query"
      - "finite timeout for the complete Director IA HTTP cycle"
      - "timeout must not become retry"
      - "timeout must map to safe transport failure"
      - "DB/source client must be released/cleaned up"
      - "no indefinite pool client retention"

    preferred_behavior:
      arr_query_timeout: >
        Use existing PostgreSQL/session/query timeout mechanisms if physically
        available. Prefer a local statement_timeout scoped to this Director IA
        query/cycle over global DB semantic changes.
      http_cycle_timeout: >
        Use AbortSignal/Promise deadline or existing repository convention.
        Deadline must be finite and deterministic/configurable through existing
        config pattern without introducing a new architecture.

    prohibited:
      - "retry after timeout"
      - "turn timeout into ACQUIRED_EMPTY"
      - "turn timeout into business absence"
      - "kill global DB pool"

  cancellation:
    backend:
      - "propagate cancellation/abort where existing APIs support it"
      - "client disconnect must not mutate epistemic state"
      - "best-effort cancellation is acceptable if driver limitations are documented"
    frontend:
      - "use AbortController or existing authenticated request cancellation mechanism"
      - "abort in-flight cycle on unmount/replacement when safe"
      - "do not auto-retry aborted calls"

  productive_logger:
    requirements:
      - "server wiring injects a real logger to Director IA transport"
      - "logger writes structured safe events to stdout/stderr or existing production logger"
      - "start/completed/failed include trace_id when available"
      - "duration_ms preserved"
      - "no JWT/raw ARR/full IES/full RE/secrets"
      - "logger failure must not change cognitive output"

    preferred:
      - "reuse existing logger"
      - "if no logger abstraction exists, minimal console-based structured logger is allowed only if consistent with existing server conventions"

  readiness:
    requirements:
      - "lightweight readiness endpoint/check for Director IA dependencies"
      - "must not execute full ARR query/grid"
      - "must not create EKS snapshot"
      - "must not call RE/CP"
      - "must distinguish service enabled/disabled"
      - "must report unavailable dependency/config safely"
      - "must not expose credentials or DB internals"

    preferred_route: >
      Follow existing health/readiness naming conventions. If a general health
      route exists, extend minimally only if the scope remains Director IA-safe;
      otherwise add a dedicated lightweight readiness route.

  smoke:
    requirements:
      - "safe post-deploy smoke for authenticated/restricted environment"
      - "must verify endpoint reachable and fail-closed semantics"
      - "must not mutate persistent business state beyond existing append behavior unless current cycle is already known safe/read-only"
      - "must emit/capture trace_id for diagnosis"
      - "must document required env/input but not commit secrets"

    acceptable_forms:
      - "automated test harness"
      - "script using injected/stubbed dependencies for CI"
      - "documented production smoke command if real auth credentials cannot live in repo"

  build_gate:
    requirements:
      - "frontend production build passes"
      - "for any touched frontend file, run npm ci && npm run build in frontend-dashboard"
      - "record command and exit code in report"

failure_mapping:
  ARR_TIMEOUT:
    transport: 504
    semantic_rule: "technical timeout only; never absence/empty"

  CYCLE_TIMEOUT:
    transport: 504
    semantic_rule: "technical deadline exceeded"

  CLIENT_ABORT:
    transport: "no business conclusion"
    semantic_rule: "request cancelled by client/transport"

  TOOL_ERROR:
    transport: 502
    semantic_rule: "existing behavior preserved"

  UNEXPECTED:
    transport: 500
    semantic_rule: "generic product-safe failure"

  note: >
    If repository conventions require a different 5xx family for timeout,
    preserve semantic distinction and document the physically selected code.
    Do not change existing Director IA epistemic states.

timeout_configuration:
  rules:
    - "no hardcoded magic values if repository already has config convention"
    - "finite default allowed if consistent with existing codebase"
    - "invalid config must fail safe"
    - "do not require new package/dependency"
    - "document chosen timeout values and rationale in report"

required_tests:

  timeout:
    - "ARR/source timeout returns technical timeout, not empty"
    - "full cycle timeout returns safe 5xx"
    - "timed-out DB/source client is released or cleanup path verified"
    - "no retry after timeout"
    - "timeout does not fabricate N1-N5"

  cancellation:
    - "frontend request exposes abort/cancellation"
    - "aborted request does not retry"
    - "new request/unmount handling does not leak stale result"
    - "independent requests keep independent trace/request state"

  logger:
    - "server injects logger"
    - "started/completed/failed reach logger"
    - "trace_id/duration available where applicable"
    - "sensitive fields absent"
    - "logger throw/failure does not change successful cognitive result"

  readiness:
    - "readiness does not execute ARR business query"
    - "readiness does not call OP/EB/EKS/IES/RE/CP"
    - "disabled feature reported safely"
    - "missing required operational dependency/config reported safely"
    - "healthy state returned when minimally operable"

  endpoint_regression:
    - "existing 200/400/401/403/502/500 behavior preserved except explicit timeout mapping"
    - "legacy chat unchanged"
    - "auth/authz still precede cycle"
    - "one cycle invocation per authorized request"

  frontend:
    - "AbortController/request cancellation covered"
    - "existing UI internal-vs-transport semantics preserved"
    - "no timeout shown as business empty"
    - "no sensitive logging"

  smoke:
    - "smoke mechanism documented/tested"
    - "smoke fails nonzero or explicitly fails when endpoint/dependency unavailable"
    - "smoke captures trace_id where response provides it"

  regression:
    - "dashboard cycle client focused tests green"
    - "dashboard cycle endpoint focused tests green"
    - "real cycle tests green"
    - "ARR tests green"
    - "test/director-ia-*.test.js all green"
    - "frontend production build green"

acceptance_criteria:
  - "finite ARR timeout exists"
  - "finite full-cycle HTTP timeout exists"
  - "no automatic retry"
  - "timeouts remain technical failures"
  - "DB/source cleanup verified"
  - "client abort supported"
  - "productive logger injected"
  - "safe structured events observable"
  - "lightweight Director IA readiness exists"
  - "readiness avoids full cognitive/business execution"
  - "smoke/post-deploy procedure exists"
  - "ENABLE_DIRECTOR_IA kill switch preserved"
  - "auth/authz unchanged"
  - "frontend build gate passes"
  - "no cognitive semantics changed"
  - "no contract changes"
  - "no dependencies added"
  - "no G2/G3/G8"
  - "focused tests pass"
  - "full Director IA regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read operational audit"
  - "modify minimal backend timeout/cancellation plumbing"
  - "modify minimal frontend abort plumbing"
  - "wire logger in server"
  - "add lightweight readiness"
  - "add tests/smoke tooling"
  - "create report"
  - "update CURRENT_TASK through permitted transitions"
  - "run focused tests"
  - "run full Director IA regression"
  - "run frontend npm ci && npm run build"
  - "run git diff --check"

conditional_stop_conditions:
  - >
    If safe finite ARR timeout requires changing business query semantics or a
    new DB architecture, STOP.
  - >
    If cancellation requires new dependencies, STOP.
  - >
    If readiness requires executing actual business queries to be meaningful,
    STOP and report the gap.
  - >
    If production logging requires an external dependency/package addition,
    STOP unless an existing logger can be reused.
  - >
    If any change requires G2/G3/G8, STOP.

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify cognitive semantics"
  - "add retries"
  - "add persistence/session"
  - "add metrics provider"
  - "add alerting provider"
  - "add rate limiting"
  - "add dependency/package changes"
  - "wire WhatsApp/Twilio/chat"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW if the physical operational blockers are removed with
  finite timeout, safe cancellation, productive logging, lightweight readiness,
  smoke validation and all builds/tests green.

  BLOCKED or STOPPED if removing those blockers requires architectural,
  contractual or dependency changes outside this task.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001.md"