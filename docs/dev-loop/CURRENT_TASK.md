# CURRENT_TASK

Tarea vigente del Loop v0.1.

```yaml
task_id: "HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T13:35:54-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Corregir exclusivamente la terminación del smoke operacional de Director IA
  para evitar el assert de Node/libuv observado en Windows cuando process.exit()
  interrumpe el cleanup de fetch/undici. Preservar exactamente la semántica,
  validaciones, códigos de éxito/fallo y alcance del smoke.

evidence:
  local_runtime: "Node v24.14.0 / Windows"
  production_base_url: "https://folio-whatsapp-bot.onrender.com"
  readiness_observed:
    status: 200
    enabled: true
    ready: true
  observed_failure: >
    Después de imprimir readiness verde, el proceso local aborta con
    UV_HANDLE_CLOSING durante terminación.
  suspected_physical_cause: >
    scripts/smoke-director-ia-operational.js usa process.exit() mientras
    fetch/undici todavía puede estar limpiando handles.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "scripts/smoke-director-ia-operational.js"
  - "test/director-ia-operational-hardening.test.js (solo si es el test focal existente adecuado)"
  - "new focused smoke-exit test only if physically necessary"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001.md"

out_of_scope:
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "Director IA cognitive semantics"
  - "ARR"
  - "endpoint behavior"
  - "readiness behavior"
  - "JWT/auth/authz"
  - "timeout values"
  - "retry"
  - "dependencies"
  - "package.json"
  - "lockfiles"
  - "Render configuration"
  - "commit"
  - "push"
  - "merge"
  - "next task"

required_change:
  - >
    Remove forced successful/expected termination through process.exit()
    where it can race fetch/undici cleanup.
  - >
    Prefer return / natural async completion and set process.exitCode only
    where a nonzero result must be communicated.
  - >
    main() rejection must still produce a deterministic nonzero exit.
  - "Do not hide real smoke failures."
  - "Do not add sleeps as the primary fix."
  - "Do not swallow exceptions."

required_behavior:
  readiness_only_success:
    condition: "readiness HTTP 200 and no token/planta supplied"
    result: "clean natural exit 0"

  readiness_failure:
    result: "nonzero exit"

  authenticated_smoke_success:
    result: "clean exit 0"

  authenticated_smoke_failure:
    result: "nonzero exit"

  missing_base_url:
    result: "nonzero exit"

acceptance_criteria:
  - "readiness-only run exits cleanly on Windows"
  - "no UV_HANDLE_CLOSING assertion in reproduced readiness-only run"
  - "readiness 200/enabled:true/ready:true remains unchanged"
  - "failure paths remain nonzero"
  - "authenticated cycle logic is not weakened or bypassed"
  - "no retry introduced"
  - "no production code changed"
  - "no dependencies/package/lockfile changes"
  - "focused tests green"
  - "test/director-ia-*.test.js green"
  - "git diff --check clean"
  - "report created"

production_revalidation_after_merge:
  - >
    Run readiness-only smoke against
    https://folio-whatsapp-bot.onrender.com and require clean exit without
    libuv assertion.
  - >
    Authenticated POST smoke remains a separate final production validation
    requiring locally supplied DIRECTOR_IA_SMOKE_TOKEN and
    DIRECTOR_IA_SMOKE_PLANTA_ID. Secrets must never be committed or copied
    into the report.

conditional_stop_conditions:
  - "If fixing this requires changing production endpoint/runtime behavior, STOP."
  - "If a dependency/package change is required, STOP."
  - "If G2/G3/G8 becomes necessary, STOP."

forbidden_actions:
  - "change production Director IA behavior"
  - "change readiness semantics"
  - "change timeout semantics"
  - "add dependency"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW when the smoke terminates naturally and preserves
  deterministic exit semantics, tests are green, and git diff --check is clean.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-SMOKE-WINDOWS-EXIT-001.md"