# CURRENT_TASK

Tarea vigente del Loop v0.1.

```yaml
task_id: "ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T11:54:47-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar la readiness operacional del Director IA ya expuesto en producción
  vía dashboard, después del deploy live del hotfix de tipos. Determinar el
  conjunto mínimo de hardening necesario antes de declarar el sistema
  production-ready, separando health/readiness, timeouts, observabilidad,
  seguridad, manejo de fallos ARR, rollout, smoke tests, configuración y
  dependencias operacionales. Recomendar exactamente un NEXT_TASK sin
  implementar nada.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md (solo lectura)"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001.md (solo lectura)"

  - "server.js (solo lectura)"
  - "lib/director-ia-dashboard-cycle-transport.js (solo lectura)"
  - "lib/director-ia-real-cycle.js (solo lectura)"
  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "frontend-dashboard/modules/director-ia/** (solo lectura)"
  - "test/director-ia-*.test.js (solo lectura)"

  - "existing health/readiness endpoints (solo lectura)"
  - "existing logger/telemetry/error helpers (solo lectura)"
  - "existing timeout config (solo lectura)"
  - "existing auth/authz middleware (solo lectura)"
  - "existing feature flags/rollout controls (solo lectura)"
  - "existing Render/deploy config references (solo lectura)"
  - "package.json / frontend-dashboard/package.json (solo lectura)"

out_of_scope:
  - "implementar health endpoint"
  - "implementar timeout"
  - "implementar retries"
  - "crear observabilidad"
  - "crear feature flags"
  - "modificar auth"
  - "modificar endpoint"
  - "modificar UI"
  - "modificar Director IA cognition"
  - "crear persistencia"
  - "crear sesión"
  - "wire WhatsApp/Twilio"
  - "modificar package.json"
  - "agregar dependencias"
  - "modificar .env"
  - "commit"
  - "push"
  - "merge"
  - "crear siguiente implementación"
  - "encadenar siguiente tarea"

baseline_in_force:
  production_state:
    backend_endpoint: "POST /api/director-ia/cycle"
    ui_client: "integrated in /director-ia"
    auth: "JWT dashboard"
    authz:
      - "assertDashboardPlantaAccessForActionRegister"
      - "dashboardBlockGAFinancialKpis"
    deploy:
      commit: "5230146a"
      render_status: "LIVE"
    build:
      command: "npm ci && npm run build"
      result: "PASS"
    director_ia_regression:
      tests: 351
      failures: 0

  cognitive_path:
    - "dashboard UI"
    - "POST /api/director-ia/cycle"
    - "ARR"
    - "OP"
    - "EB"
    - "EKS"
    - "IES"
    - "RE"
    - "CP DASHBOARD"
    - "UI"

audit_questions:

  D1_health:
    question: >
      ¿Existe health/readiness suficiente para saber si el servicio y la
      dependencia ARR están operables antes de atender tráfico?

  D2_dependency_readiness:
    question: >
      ¿Puede detectarse una degradación de ARR/source sin ejecutar un ciclo
      completo de usuario?

  D3_timeout:
    question: >
      ¿Existe un timeout finito y efectivo para la llamada ARR y para el ciclo
      HTTP completo? Si no existe, clasificar riesgo y blocker.

  D4_abort:
    question: >
      ¿Qué ocurre si el cliente desconecta o expira el request mientras ARR o
      el ciclo siguen ejecutándose?

  D5_retry:
    question: >
      Confirmar que no existe retry automático y evaluar si eso es correcto para
      el primer release.

  D6_logging:
    question: >
      ¿Los eventos start/completion/failure realmente llegan a logs productivos
      con trace_id y duración?

  D7_error_visibility:
    question: >
      ¿TOOL_ERROR, 500 y fallos auth quedan suficientemente visibles para
      operación sin filtrar secretos?

  D8_metrics:
    question: >
      ¿Existen métricas mínimas sobre volumen, latencia, éxito/fallo y estados
      Director IA, o solo logs?

  D9_alerting:
    question: >
      ¿Existe alerting para fallos de deploy, 5xx sostenidos o degradación ARR?

  D10_trace:
    question: >
      ¿trace_id puede correlacionarse desde UI/request hasta logs backend y
      source failure?

  D11_sensitive_logging:
    question: >
      Auditar que JWT, raw ARR payload, raw_payload_reference, IES/RE completos y
      stack traces no se registren de forma insegura.

  D12_authz_operational:
    question: >
      ¿Los rechazos 401/403 son distinguibles operacionalmente de fallos del
      Director IA?

  D13_rate_limiting:
    question: >
      ¿Existe rate limiting o protección equivalente para evitar abuso del
      endpoint? Determinar si es prerequisite o follow-up.

  D14_concurrency:
    question: >
      ¿El endpoint puede operar bajo requests concurrentes sin state compartido
      peligroso ni agotamiento obvio?

  D15_resource_limits:
    question: >
      ¿Existen riesgos de CPU/memoria/connection exhaustion en el ciclo actual?

  D16_rollout:
    question: >
      ¿Existe una forma segura de rollout gradual: feature flag, allowlist,
      internal-only, role gate o despliegue controlado?

  D17_kill_switch:
    question: >
      ¿Existe mecanismo para deshabilitar el endpoint/feature sin revertir todo
      el deploy?

  D18_smoke_test:
    question: >
      Definir un smoke test productivo seguro de extremo a extremo que no
      invente datos ni altere estado.

  D19_post_deploy_validation:
    question: >
      ¿Qué chequeos deben ejecutarse después de cada deploy antes de considerar
      Director IA healthy?

  D20_frontend_observability:
    question: >
      ¿El cliente captura de forma segura trace_id y errores sin exponer datos
      internos ni depender de console logs?

  D21_build_gate:
    question: >
      ¿El build real del frontend debería convertirse en gate obligatorio del
      loop para cualquier cambio UI futuro?

  D22_ci_gate:
    question: >
      ¿Existe CI suficiente para ejecutar build + tests antes de merge o solo
      validación manual/local?

  D23_security_headers:
    question: >
      ¿La superficie HTTP nueva hereda headers/CORS/CSRF/cookie policies
      suficientes del server existente?

  D24_input_abuse:
    question: >
      ¿planta_id/year/month tienen límites y validación suficientes para evitar
      inputs abusivos o costosos?

  D25_operational_config:
    question: >
      ¿Qué env/config existentes son necesarios para operar el ciclo y cuáles
      deben documentarse/readiness-checkearse?

  D26_arr_failure_modes:
    question: >
      ¿Qué fallos reales de ARR no están cubiertos todavía por tests o mapping?

  D27_supportability:
    question: >
      ¿Con trace_id + logs actuales un operador puede diagnosticar un fallo sin
      acceder a artifacts sensibles?

  D28_slo_candidate:
    question: >
      Proponer, sin congelar contractualmente, candidatos operativos para
      disponibilidad/latencia/error-rate que sirvan de referencia.

  D29_candidate_next_step:
    question: >
      Comparar obligatoriamente:
      A) health/readiness + timeout + smoke hardening;
      B) observability/metrics/alerts first;
      C) rollout/kill-switch first;
      D) rate limiting/security hardening first;
      E) persistence/session first.

  D30_next_task:
    question: >
      Recomendar exactamente un NEXT_TASK mínimo para llegar a production-ready.

mandatory_operational_matrix:
  rows:
    - "health/readiness"
    - "ARR dependency readiness"
    - "timeout"
    - "abort/cancellation"
    - "retry"
    - "logging"
    - "metrics"
    - "alerting"
    - "trace correlation"
    - "rate limiting"
    - "concurrency"
    - "resource limits"
    - "rollout"
    - "kill switch"
    - "smoke test"
    - "post-deploy validation"
    - "frontend build gate"
    - "CI"
    - "security headers"
    - "input abuse"
    - "supportability"

  columns:
    - "capability"
    - "exists"
    - "required before production-ready"
    - "gap"
    - "risk"
    - "gate required"
    - "recommended action"

mandatory_failure_matrix:
  rows:
    - "ARR timeout"
    - "ARR throw"
    - "ARR empty"
    - "entity unresolved"
    - "scope incomplete"
    - "auth 401"
    - "authz 403"
    - "unexpected 500"
    - "frontend network failure"
    - "frontend build failure"

  columns:
    - "failure"
    - "current behavior"
    - "observable"
    - "safe for production"
    - "gap"
    - "action"

mandatory_candidate_matrix:
  rows:
    - "A_HEALTH_TIMEOUT_SMOKE"
    - "B_OBSERVABILITY_METRICS_ALERTS"
    - "C_ROLLOUT_KILL_SWITCH"
    - "D_RATE_LIMIT_SECURITY"
    - "E_PERSISTENCE_SESSION"

  columns:
    - "candidate"
    - "value unlocked"
    - "production risk reduced"
    - "prerequisites"
    - "G2"
    - "G3"
    - "config"
    - "recommended"

gap_classification:
  allowed:
    - "READY"
    - "REQUIRED_HARDENING"
    - "DEBT_NON_BLOCKING"
    - "CONFIG_REQUIRED"
    - "SECURITY_REQUIRED"
    - "OBSERVABILITY_REQUIRED"
    - "REQUIRES_G2"
    - "REQUIRES_G3"
    - "BLOCKER"

decision_rules:
  - "No recomendar persistence/session first sin dependencia física."
  - "No introducir retry automático sin idempotencia demostrada."
  - "Health/readiness y timeout pesan más que métricas sofisticadas si el servicio puede colgarse."
  - "Build frontend real debe considerarse gate si ya falló una vez en Render."
  - "Un rollout sin kill switch puede ser aceptable solo si el endpoint está suficientemente restringido."
  - "No inventar SLOs como contrato; solo proponer candidatos."
  - "No introducir nueva epistemología."
  - "No usar WhatsApp como validación operativa."

required_report_sections:
  - "1. Executive verdict"
  - "2. Production baseline"
  - "3. D1-D30 findings"
  - "4. Operational readiness matrix"
  - "5. Failure-mode matrix"
  - "6. Health/readiness"
  - "7. Timeout/abort/retry"
  - "8. Logging/metrics/alerts"
  - "9. Trace/supportability"
  - "10. Security/rate limiting/input abuse"
  - "11. Rollout/kill-switch"
  - "12. Smoke/post-deploy validation"
  - "13. Frontend build/CI gate"
  - "14. Candidate comparison"
  - "15. Gate requirements"
  - "16. Minimum production-ready slice"
  - "17. Exactly one NEXT_TASK"
  - "18. GO/CONDITIONAL-GO/NO-GO"
  - "19. STOP"

acceptance_criteria:
  - "D1-D30 answered"
  - "all operational risks classified"
  - "ARR timeout readiness proven"
  - "health/readiness proven"
  - "observability level proven"
  - "rollout safety proven"
  - "build gate recommendation explicit"
  - "smoke test defined"
  - "exactly one NEXT_TASK recommended"
  - "no implementation"
  - "no runtime/contracts modified"
  - "git diff --check clean"
  - "only CURRENT_TASK and report changed"

allowed_actions:
  - "read reports/runtime/server/frontend/config"
  - "read deploy/build config"
  - "read auth/logging/health code"
  - "run existing tests/build if useful"
  - "create report"
  - "update CURRENT_TASK through permitted transitions"
  - "run git diff --check"

forbidden_actions:
  - "modify runtime"
  - "modify server/frontend"
  - "modify contracts"
  - "add health endpoint"
  - "add timeout"
  - "add metrics/alerts"
  - "add rate limiting"
  - "add rollout controls"
  - "modify package.json"
  - "modify config/env"
  - "commit"
  - "push"
  - "merge"
  - "create implementation task"
  - "autoapprove gates"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede definirse un último hardening slice cerrado y
  seguro antes de declarar production-ready. BLOCKED/STOPPED si existen gaps
  operacionales severos que requieren decisiones arquitectónicas no autorizadas.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001.md"