# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001"
status: DRAFT

task_id: "IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T10:49:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el primer cliente UI/dashboard que consuma el endpoint productivo
  POST /api/director-ia/cycle ya integrado en main. El cliente debe permitir
  ejecutar el ciclo para una planta autorizada, enviar únicamente los campos
  transportables permitidos, representar los estados internos sin colapsarlos
  ni reinterpretarlos y mostrar la salida CP DASHBOARD de forma segura.
  Sin cambios cognitivos, persistencia, sesión, WhatsApp, chat ni nuevas reglas.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"

  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md (solo lectura)"

  - "server.js (solo lectura salvo que el frontend existente se sirva desde wiring ya presente y no requiera cambio)"
  - "lib/director-ia-dashboard-cycle-transport.js (solo lectura)"
  - "lib/director-ia-real-cycle.js (solo lectura)"

  - "existing dashboard frontend/client files"
  - "existing dashboard API client/helpers"
  - "existing dashboard auth/session token handling"
  - "existing dashboard planta selector/state"
  - "existing UI component/test conventions"

  - "new Director IA dashboard cycle client/helper"
  - "new Director IA dashboard UI component/view/panel"
  - "new focused frontend/client tests"
  - "new synthetic UI fixtures/mocks if required"

  - "package.json (solo lectura)"

out_of_scope:
  - "modificar docs/director-ia/"
  - "modificar endpoint semantics"
  - "modificar transport adapter semantics"
  - "modificar OP/EB/EKS/IES/RE/CP"
  - "modificar ARR"

  - "crear endpoint nuevo"
  - "crear segunda ruta Director IA"
  - "usar /api/director-ia/chat"
  - "modificar askDirectorIa"
  - "wire WhatsApp/Twilio/chat"

  - "crear persistencia"
  - "crear sesión nueva"
  - "crear memoria conversacional"
  - "crear WhoAmI"

  - "crear retry automático"
  - "crear polling/background jobs"
  - "crear queue"

  - "crear nuevas fuentes"
  - "crear nuevas métricas"
  - "crear N3/N4/N5 rules"
  - "crear B/C/D/E"
  - "crear causalidad"
  - "usar G8"

  - "modificar package.json"
  - "agregar dependencias"
  - "agregar secrets"
  - "modificar .env"

  - "commit"
  - "push"
  - "merge"
  - "chain next task"

baseline_in_force:
  endpoint:
    method: "POST"
    path: "/api/director-ia/cycle"
    authentication: "existing dashboard JWT"
    authorization:
      - "assertDashboardPlantaAccessForActionRegister"
      - "dashboardBlockGAFinancialKpis"

  request_contract:
    allowed:
      - "planta_id"
      - "year"
      - "month"
    prohibited_client_control:
      - "plant_code"
      - "trace_id"
      - "source.system"
      - "raw_payload_reference"
      - "query_context_metadata"
      - "N1-N5 artifacts"

  response_contract:
    includes:
      - "trace_id"
      - "structured execution/outcome status"
      - "channel_output DASHBOARD"

  http_semantics:
    success_and_nonfatal:
      - "ACQUIRED_OK -> 200"
      - "ACQUIRED_EMPTY/DATA_NOT_FOUND -> 200"
      - "ENTITY_UNRESOLVED -> 200"
      - "QUERY_SCOPE_INCOMPLETE -> 200"
      - "NO_KNOWLEDGE/ABSTAIN -> 200"
    client_error:
      - "INVALID_INPUT -> 400"
    auth:
      - "401 existing"
      - "403 existing"
    upstream:
      - "TOOL_ERROR -> 502"
    internal:
      - "unexpected -> 500"

  verified_regression:
    endpoint_focused: 24
    real_cycle: 19
    arr: 24
    director_ia_total: 335
    failures: 0

ui_goal:
  target_user: "authenticated dashboard user"

  primary_action:
    - "select/retain authorized planta_id from existing dashboard context"
    - "optionally choose year/month if current UI conventions support them"
    - "execute Director IA cycle"
    - "render product-safe result"

  prohibited:
    - "free-text epistemic prompt"
    - "client-supplied plant_code"
    - "client-generated authoritative trace_id"
    - "client-generated query_context_metadata"
    - "display raw ARR payload"
    - "display JWT"
    - "display internal stack trace"
    - "display secret/provenance internals"

client_adapter:
  preferred_name: >
    Follow existing dashboard frontend conventions. If there is a dedicated API
    client module, add a Director IA cycle method there; otherwise create the
    smallest local helper consistent with the repository.

  responsibilities:
    - "POST to /api/director-ia/cycle using existing authenticated request mechanism"
    - "send only allowed request fields"
    - "parse JSON response safely"
    - "retain HTTP status and structured internal outcome separately"
    - "never reinterpret 200 as business success"
    - "return typed/structured result suitable for UI"

  forbidden:
    - "convert 200 ACQUIRED_EMPTY into no-sales/zero"
    - "convert ENTITY_UNRESOLVED into 404 semantics"
    - "convert ABSTAIN into error"
    - "call legacy chat endpoint"
    - "retry automatically"
    - "store raw Director IA artifacts in persistent browser storage"

ui_state_model:
  minimum:
    - "idle"
    - "loading"
    - "completed"
    - "transport_error"

  rule: >
    UI transport state and Director IA internal state are separate dimensions.
    completed may contain ACQUIRED_EMPTY, ENTITY_UNRESOLVED,
    QUERY_SCOPE_INCOMPLETE or ABSTAIN.

  prohibited:
    - "internal Director IA outcome == UI request error"
    - "HTTP 200 == validated business conclusion"

display_semantics:
  ACQUIRED_OK:
    ui: "render CP DASHBOARD output and structured outcome"

  ACQUIRED_EMPTY:
    ui: >
      render a neutral data-not-found/empty-for-requested-scope state. Never
      render '0 ventas', 'sin ventas' or confirmed absence unless CP itself
      explicitly and legitimately says so.

  ENTITY_UNRESOLVED:
    ui: "show that the requested plant/entity could not be resolved"

  QUERY_SCOPE_INCOMPLETE:
    ui: "show partial/incomplete scope indication"

  ABSTAIN_NO_KNOWLEDGE:
    ui: >
      show the CP DASHBOARD abstention/no-knowledge state as a valid completed
      result, not a transport failure.

  TOOL_ERROR:
    ui: "show upstream/service unavailable/error state without source internals"

  INVALID_INPUT:
    ui: "show request validation feedback"

  401:
    ui: "reuse existing authentication/session handling"

  403:
    ui: "reuse existing authorization feedback"

  unexpected_500:
    ui: "generic safe failure with trace_id if response safely provides it"

channel_output_boundary:
  rules:
    - "render the existing channel_output as product output"
    - "do not regenerate or rewrite CP semantics with LLM"
    - "do not infer hidden N1-N5 meaning"
    - "do not expose internal artifacts merely for debugging"
    - "preserve visible NO_KNOWLEDGE/ABSTAIN/partial states"

traceability:
  rules:
    - "display/capture trace_id in a low-prominence diagnostic/reference location"
    - "trace_id must not become editable input"
    - "trace_id can be copied for support if current UI conventions permit"
    - "do not expose provenance/raw refs alongside trace_id"

auth_boundary:
  rules:
    - "reuse current dashboard JWT mechanism"
    - "do not manually construct Authorization semantics if existing client helper owns it"
    - "401 behavior remains owned by existing dashboard auth flow"
    - "no JWT in visible UI/logging"

planta_boundary:
  rules:
    - "reuse existing authorized planta selection/context if present"
    - "client sends planta_id only"
    - "do not derive or expose ARR plant_code"
    - "do not allow arbitrary plant identifiers outside existing dashboard model"

year_month_boundary:
  rules:
    - "reuse existing year/month selection when physically present"
    - "do not invent calendar semantics"
    - "omit optional fields when not selected according to API contract"

observability_client:
  minimum:
    - "no console logging of JWT"
    - "no console logging of full Director IA response in production path"
    - "safe handling of trace_id"
    - "existing frontend error reporter may receive safe transport metadata only"

  prohibited:
    - "raw payload logging"
    - "full channel/internal artifact logging where unnecessary"

accessibility_usability:
  required:
    - "loading state visible"
    - "submit action disabled or guarded during current request if consistent with UI conventions"
    - "error state distinguishable from completed-abstain/partial"
    - "result area updates predictably"
    - "no misleading success/error colors solely from HTTP 200"

required_tests:

  api_client:
    - "calls POST /api/director-ia/cycle"
    - "uses existing authenticated request mechanism"
    - "sends planta_id"
    - "sends optional year/month only when applicable"
    - "does not send plant_code"
    - "does not send trace_id"
    - "does not send query_context_metadata"
    - "does not call /api/director-ia/chat"
    - "no automatic retry"

  ui_happy_path:
    - "authorized plant request enters loading then completed"
    - "CP DASHBOARD output is rendered"
    - "trace_id is available as reference"
    - "internal outcome remains visible"

  ui_fail_closed:
    - "ACQUIRED_EMPTY renders neutral empty/data-not-found state"
    - "ACQUIRED_EMPTY does not render zero/confirmed absence"
    - "ENTITY_UNRESOLVED renders completed unresolved state"
    - "QUERY_SCOPE_INCOMPLETE renders completed partial state"
    - "ABSTAIN/NO_KNOWLEDGE renders completed abstention state"
    - "none of these are treated as network error"

  transport_errors:
    - "400 renders validation feedback"
    - "401 follows existing auth handling"
    - "403 renders/reuses authorization handling"
    - "502 renders upstream/service failure"
    - "500 renders generic safe failure"
    - "no stack/source internals displayed"

  request_integrity:
    - "client cannot inject plant_code"
    - "client cannot inject trace_id"
    - "client cannot inject internal artifacts"
    - "selected planta_id is the only plant identity sent"

  concurrency:
    - "double-submit is prevented or safely handled according to existing UI convention"
    - "two independent mounted/request contexts do not share result/trace state"

  security:
    - "JWT not rendered"
    - "raw ARR payload not rendered"
    - "raw_payload_reference not rendered"
    - "full IES/RE artifacts not exposed"
    - "no sensitive console logs in tested path"

  regression:
    - "endpoint focused tests remain green"
    - "real-cycle tests remain green"
    - "ARR tests remain green"
    - "all test/director-ia-*.test.js remain green"
    - "existing dashboard frontend tests remain green"
    - "legacy chat behavior remains untouched"

acceptance_criteria:
  - "dashboard UI can invoke POST /api/director-ia/cycle"
  - "existing JWT flow reused"
  - "authorized planta_id reused"
  - "client sends no plant_code"
  - "client sends no internal artifacts"
  - "CP DASHBOARD result rendered"
  - "trace_id available safely"
  - "internal outcome preserved separately from transport state"
  - "ACQUIRED_EMPTY not interpreted as zero/absence"
  - "ENTITY_UNRESOLVED not treated as 404"
  - "ABSTAIN rendered as valid result"
  - "TOOL_ERROR rendered as upstream failure"
  - "no LLM/chat call"
  - "no persistence/session added"
  - "no automatic retry"
  - "no cognitive/runtime contract changes"
  - "no endpoint semantic changes"
  - "no package/dependency changes"
  - "focused tests pass"
  - "relevant dashboard regression passes"
  - "full Director IA regression passes"
  - "git diff --check clean"
  - "report created"

allowed_actions:
  - "read endpoint/productization reports"
  - "read existing dashboard frontend/client code"
  - "read existing auth/planta UI state"
  - "create/modify minimal dashboard API client helper"
  - "create/modify minimal dashboard Director IA UI component/view"
  - "create focused UI/client tests"
  - "create synthetic mocks/fixtures"
  - "create docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"
  - "update CURRENT_TASK through permitted transitions"
  - "run focused frontend/client tests"
  - "run dashboard regression"
  - "run Director IA regression"
  - "run git diff --check"

conditional_stop_conditions:
  - >
    If the dashboard has no reusable authenticated request mechanism and a new
    auth architecture is required, STOP.
  - >
    If planta authorization cannot be represented through the existing
    dashboard selection/context without changing backend contracts, STOP.
  - >
    If rendering CP DASHBOARD requires changing Channel Projection semantics,
    STOP.
  - >
    If implementing the UI requires a new dependency/package change, STOP
    unless already explicitly allowed by the current task, which it is not.
  - >
    If the existing frontend architecture requires G2/G3 to create the slice,
    STOP.

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify Director IA cognitive runtimes"
  - "modify server endpoint semantics"
  - "modify ARR"
  - "modify auth semantics"
  - "use legacy chat endpoint"
  - "wire WhatsApp/Twilio"
  - "add persistence/session"
  - "add retry/polling"
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
  DONE_PENDING_REVIEW if the existing dashboard can consume
  POST /api/director-ia/cycle and render CP DASHBOARD safely while preserving
  transport/internal-state separation, without backend cognitive changes,
  dependency additions or architecture changes.

  BLOCKED or STOPPED if the UI slice requires new auth architecture, backend
  contract changes, CP semantic changes, package dependencies, persistence,
  session, G2/G3/G8 or legacy chat coupling.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"