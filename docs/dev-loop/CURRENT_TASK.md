# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001"
status: DRAFT

task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T08:53:17-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Exponer productivamente el ciclo real completo del Director IA mediante un
  endpoint interno/autenticado de dashboard, reutilizando
  createDirectorIaRealCycle sin introducir lógica cognitiva en server.js.
  Implementar una capa de transporte no epistémica que realice autenticación,
  autorización de planta, validación de request, mapping request -> cycle,
  mapping cycle -> HTTP, observabilidad mínima por trace_id y manejo explícito
  de errores. Preservar íntegramente los estados internos del Director IA.
  Sin persistencia, sesión, WhatsApp, retries automáticos ni cambios de
  contratos/runtimes cognitivos.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md (solo lectura)"

  - "docs/director-ia/** (solo lectura)"

  - "lib/director-ia-real-cycle.js (solo lectura)"
  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "lib/director-ia-*.js (solo lectura)"

  - "existing dashboard authentication middleware"
  - "existing dashboard planta authorization helpers"
  - "assertDashboardPlantaAccessForActionRegister"
  - "dashboardBlockGAFinancialKpis"

  - "new Director IA dashboard transport/service adapter"
  - "new Director IA dashboard route/controller if repository conventions require it"
  - "server.js only for minimal route registration/dependency composition"
  - "new focused endpoint/transport tests"
  - "new synthetic transport fixtures if required"

  - "package.json (solo lectura)"
  - ".env references (solo lectura)"
  - "existing logging/error helpers (reuse preferred)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar OP/EB/EKS/IES/RE/CP semantics"
  - "modificar Director IA epistemology"
  - "modificar ARR query semantics"

  - "usar POST /api/director-ia/chat"
  - "modificar askDirectorIa"
  - "usar anexo de chat como N1"
  - "wire WhatsApp"
  - "wire Twilio"
  - "wire chat legado"

  - "crear persistencia"
  - "crear sesión"
  - "crear memoria conversacional"
  - "crear WhoAmI"

  - "crear retry automático"
  - "crear queue"
  - "crear background jobs"
  - "crear idempotency storage"

  - "crear nuevas fuentes"
  - "crear nuevas métricas"
  - "crear nuevas reglas N3/N4/N5"
  - "crear causalidad"
  - "crear B/C/D/E"
  - "usar G8"

  - "agregar dependencias"
  - "modificar package.json"
  - "agregar secrets"
  - "modificar credenciales"

  - "commit"
  - "push"
  - "merge"
  - "chain next task"

baseline_in_force:
  real_cycle:
    factory: "createDirectorIaRealCycle"
    status: "IMPLEMENTED"
    path:
      - "validated ARR input"
      - "ARR"
      - "MINIMAL_EXECUTION_ENVELOPE"
      - "OP"
      - "EB"
      - "EKS"
      - "query_context_metadata"
      - "IES"
      - "RE"
      - "CP DASHBOARD"

  verified_regression:
    director_ia_total: 311
    failures: 0

  productization_audit:
    verdict: "CONDITIONAL-GO"
    selected_candidate: "A_DASHBOARD_ENDPOINT_WIRING"
    findings:
      - "no constitutional dashboard route exists yet"
      - "POST /api/director-ia/chat is legacy and prohibited for this slice"
      - "transport/service adapter required"
      - "JWT dashboard authentication already exists"
      - "planta authorization must run before Director IA cycle"
      - "assertDashboardPlantaAccessForActionRegister is reusable"
      - "dashboardBlockGAFinancialKpis is reusable"
      - "empty/unresolved/incomplete/ABSTAIN remain successful transport responses with internal detail"
      - "TOOL_ERROR maps to upstream/service failure family"
      - "INVALID_INPUT maps to client error family"
      - "automatic retry not authorized"
      - "persistence/session not prerequisites"
      - "OPENAI_API_KEY not required for this ARR slice"

target_transport_slice:
  request:
    transport: "HTTP dashboard"
    authentication: "existing dashboard JWT"
    authorization:
      - "assertDashboardPlantaAccessForActionRegister"
      - "dashboardBlockGAFinancialKpis"
    required_business_input:
      - "planta_id"
    optional_scope_input:
      - "year"
      - "month"

  processing:
    - "authenticate"
    - "authorize planta/action"
    - "validate request shape"
    - "map transport input to createDirectorIaRealCycle input"
    - "invoke Director IA cycle exactly once"
    - "emit minimum safe operational telemetry"
    - "map structured cycle result to HTTP response"

  response:
    source_of_truth: "existing CP DASHBOARD output + structured cycle status"
    prohibited:
      - "LLM rewriting"
      - "transport-level epistemic reinterpretation"
      - "business conclusion synthesis"
      - "dropping internal status semantics"

transport_adapter:
  preferred_name: "lib/director-ia-dashboard-cycle-transport.js"

  preferred_export: "createDirectorIaDashboardCycleTransport"

  expected_shape: >
    createDirectorIaDashboardCycleTransport({
      realCycle,
      logger,
      clock
    }).handle(input)

  responsibilities:
    - "validate transport-level input"
    - "map authorized dashboard request to realCycle.run input"
    - "invoke real cycle exactly once"
    - "map successful structured result to safe transport payload"
    - "map known execution errors to transport status family"
    - "preserve trace_id"
    - "emit minimal structured logs/telemetry"

  prohibited:
    - "create or modify N1-N5 artifacts"
    - "change CP output semantics"
    - "interpret ARR values"
    - "call ARR directly"
    - "bypass createDirectorIaRealCycle"
    - "call LLM"
    - "call chat"
    - "perform authorization itself if existing middleware/helper owns it"

route_boundary:
  preferred_route: >
    Use the repository's existing dashboard API naming conventions. Do not reuse
    /api/director-ia/chat. Choose a dedicated Director IA dashboard cycle route
    only if no equivalent route already exists.

  rules:
    - "route is dashboard-only"
    - "JWT authentication occurs before cycle execution"
    - "planta authorization occurs before cycle execution"
    - "GA financial KPI restriction occurs before cycle execution"
    - "route/controller contains no cognitive logic"
    - "route/controller delegates to transport/service adapter"
    - "server.js only registers/wires dependencies"

authorization_rules:
  - "caller cannot choose arbitrary plant_code"
  - "caller supplies planta_id only"
  - "plant_code/source mapping remains owned by existing source/access layer"
  - "unauthorized planta_id never invokes createDirectorIaRealCycle"
  - "blocked GA financial KPI access never invokes createDirectorIaRealCycle"
  - "authorization failure must not reveal ARR/source internals"

request_mapping:
  allowed_input:
    - "planta_id"
    - "year if supported by existing cycle input"
    - "month if supported by existing cycle input"
    - "existing authenticated user/context fields required by current helpers"

  prohibited:
    - "plant_code supplied by client"
    - "source.system supplied by client"
    - "trace_id supplied as authoritative cycle id unless existing infrastructure explicitly owns it"
    - "raw_payload_reference supplied by client"
    - "content_author_id supplied by client"
    - "arbitrary query_context_metadata supplied by client"
    - "internal IES/RE/CP fields supplied by client"

http_status_mapping:
  INVALID_INPUT:
    family: 400
    rule: "client request invalid before productive cycle"

  AUTHENTICATION_FAILURE:
    family: 401
    rule: "reuse existing auth behavior"

  AUTHORIZATION_FAILURE:
    family: 403
    rule: "reuse existing authz behavior"

  ACQUIRED_OK:
    family: 200
    preserve_internal_detail: true

  ACQUIRED_EMPTY:
    family: 200
    preserve_internal_detail: true
    prohibited:
      - "404"
      - "ABSENCE_CONFIRMED"
      - "venta_ton = 0"

  ENTITY_UNRESOLVED:
    family: 200
    preserve_internal_detail: true
    prohibited:
      - "404 solely because entity unresolved"

  QUERY_SCOPE_INCOMPLETE:
    family: 200
    preserve_internal_detail: true

  NO_KNOWLEDGE_ABSTAIN:
    family: 200
    preserve_internal_detail: true

  TOOL_ERROR:
    family: "502_or_503"
    rule: >
      Select between 502/503 according to existing repository transport/error
      conventions. Do not invent epistemic meaning from the HTTP code.

  unexpected_internal_error:
    family: 500
    rule: "safe generic error response; internal detail logged safely"

response_payload:
  required:
    - "trace_id"
    - "status or execution summary sufficient to preserve internal state"
    - "channel_output DASHBOARD"

  conditionally_safe:
    - "selected structured diagnostics/status metadata if already product-safe"

  prohibited:
    - "credentials"
    - "raw source payload"
    - "raw_payload_reference if considered internal/sensitive"
    - "internal stack trace"
    - "DB error details"
    - "JWT"
    - "authorization internals"

  rule: >
    Do not expose every internal artifact merely because realCycle returns it.
    Return the smallest product-safe representation that preserves Director IA
    outcome semantics.

observability_minimum:
  required_events:
    - "cycle_request_started"
    - "cycle_request_completed"
    - "cycle_request_failed"

  safe_fields:
    - "trace_id"
    - "duration_ms"
    - "final transport status"
    - "ARR/acquisition status at a coarse safe level"
    - "final CP/knowledge state if already non-sensitive"

  prohibited_log_fields:
    - "JWT"
    - "credentials"
    - "raw ARR payload"
    - "raw_payload_reference where sensitive"
    - "full IES"
    - "full Reasoning Result"
    - "full provenance when unnecessary"
    - "stack trace returned to client"

  rules:
    - "use existing logger if available"
    - "no new observability dependency"
    - "logging failure must not mutate cognitive result"
    - "trace_id correlates request to cycle"

timeout_retry_boundary:
  retry:
    automatic: false

  timeout:
    rule: >
      Reuse existing HTTP/source timeout behavior if already present. Do not
      invent a new retry policy. If no safe finite timeout exists and this
      makes route exposure operationally unsafe, report BLOCKED instead of
      silently adding architectural policy.

idempotency_concurrency:
  rules:
    - "no persistence/idempotency store introduced"
    - "prove endpoint invokes cycle once per request"
    - "prove repeated requests do not mutate shared Director IA state"
    - "dependencies should be reusable concurrently or instantiated according to existing server conventions"
    - "do not introduce global mutable cycle state"

server_boundary:
  allowed:
    - "import/register dedicated route/controller/service"
    - "inject existing dependencies"
    - "minimal boot wiring"

  prohibited:
    - "ARR execution logic in server.js"
    - "query_context_metadata construction in server.js"
    - "IES/RE/CP calls in server.js"
    - "HTTP status epistemic interpretation in server.js"
    - "Director IA business rules in server.js"

required_tests:

  transport_unit:
    - "valid request invokes real cycle once"
    - "planta_id mapped without client plant_code"
    - "input not mutated"
    - "trace_id preserved"
    - "CP DASHBOARD output preserved"
    - "transport does not synthesize N1-N5"
    - "transport does not import/call LLM or chat"

  authorization:
    - "missing/invalid JWT rejected before cycle"
    - "unauthorized planta rejected before cycle"
    - "GA KPI blocked access rejected before cycle"
    - "authorization failure does not leak source internals"

  status_mapping:
    - "ACQUIRED_OK -> 200"
    - "ACQUIRED_EMPTY -> 200 with internal empty/data-not-found meaning preserved"
    - "ENTITY_UNRESOLVED -> 200 with detail preserved"
    - "QUERY_SCOPE_INCOMPLETE -> 200 with detail preserved"
    - "ABSTAIN/NO_KNOWLEDGE -> 200"
    - "INVALID_INPUT -> 400"
    - "TOOL_ERROR -> chosen 502/503 convention"
    - "unexpected error -> safe 500"

  data_exposure:
    - "no credentials in response"
    - "no raw ARR payload in response"
    - "no JWT in logs/response"
    - "no internal stack returned"
    - "response is minimal product-safe projection"

  observability:
    - "start/completion/error events contain trace_id"
    - "duration recorded"
    - "sensitive artifacts not logged"
    - "logger failure does not alter epistemic output if existing conventions allow safe handling"

  concurrency_idempotency:
    - "one cycle invocation per request"
    - "parallel requests do not share trace_id"
    - "parallel requests do not mutate shared input/result"
    - "no global mutable request state"

  route_integration:
    - "dedicated route reachable under existing app/server test harness"
    - "legacy /api/director-ia/chat behavior unchanged"
    - "route uses existing JWT middleware"
    - "route uses existing planta authz helpers"
    - "server.js contains wiring only"

  regression:
    - "real cycle focused tests remain green"
    - "real ARR input tests remain green"
    - "all test/director-ia-*.test.js remain green"
    - "existing dashboard/auth tests remain green"
    - "existing legacy chat tests remain green"

acceptance_criteria:
  - "dedicated dashboard endpoint exists"
  - "legacy Director IA chat endpoint unchanged"
  - "JWT required"
  - "planta authz required before cycle"
  - "GA financial KPI restriction preserved"
  - "client cannot supply plant_code"
  - "createDirectorIaRealCycle invoked exactly once"
  - "transport remains non-epistemic"
  - "status semantics preserved"
  - "empty is not 404"
  - "TOOL_ERROR maps to safe upstream failure"
  - "ABSTAIN is valid 200 response"
  - "minimal product-safe payload returned"
  - "trace_id exposed safely"
  - "minimum observability present"
  - "no sensitive data logged/exposed"
  - "no retry automatic"
  - "no persistence"
  - "no session"
  - "no WhatsApp/Twilio/chat wiring"
  - "no cognitive runtime changes"
  - "no contract changes"
  - "no G2"
  - "no G3"
  - "no G8"
  - "no dependency/package changes"
  - "focused tests pass"
  - "full relevant regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read contracts/reports/runtimes"
  - "read existing server/routes/auth helpers"
  - "create dedicated dashboard transport/service"
  - "create dedicated route/controller according to repository conventions"
  - "modify server.js only for minimal route/dependency wiring"
  - "create focused endpoint/transport tests"
  - "create synthetic transport fixtures if required"
  - "create docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"
  - "update CURRENT_TASK through permitted transitions"
  - "run focused tests"
  - "run relevant server/dashboard/auth regression"
  - "run full Director IA regression"
  - "run git diff --check"

conditional_stop_conditions:
  - >
    If existing JWT/authz helpers cannot secure this route without changing
    their semantics, STOP.
  - >
    If exposing the route safely requires a new architectural contract, G2/G3,
    persistence, session, queue, retry architecture or package dependency, STOP.
  - >
    If createDirectorIaRealCycle requires cognitive modifications for HTTP
    transport, STOP.
  - >
    If server.js must contain cognitive logic to make the slice work, STOP.

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify OP/EB/EKS/IES/RE/CP semantics"
  - "modify ARR semantics"
  - "modify legacy chat epistemology"
  - "use /api/director-ia/chat for this slice"
  - "add persistence/session"
  - "add retry"
  - "add queue/background job"
  - "wire WhatsApp/Twilio"
  - "add dependency"
  - "modify package.json"
  - "add secrets"
  - "use G8"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW if a dedicated authenticated/authorized dashboard
  endpoint exposes createDirectorIaRealCycle with non-epistemic transport
  mapping, minimum safe observability and all regressions green.

  BLOCKED or STOPPED if safe exposure requires contract changes, auth semantic
  changes, persistence/session, server-side cognitive logic, new dependencies,
  G2/G3/G8 or modifications to Director IA cognition.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"