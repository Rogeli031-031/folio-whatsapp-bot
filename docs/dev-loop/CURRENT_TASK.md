# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001"
status: DRAFT

task_id: "ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-19T13:33:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-19"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar la readiness de productización del Director IA después de integrar el
  primer ciclo real completo ARR -> OP -> EB -> EKS -> IES -> RE ->
  Channel Projection DASHBOARD. Determinar cuál es el siguiente incremento
  mínimo y seguro que permite consumir ese ciclo desde producto real,
  separando endpoint/API, autenticación/autorización, observabilidad,
  persistencia, idempotencia, concurrencia, timeouts y manejo operacional de
  errores. Recomendar exactamente un NEXT_TASK sin implementar nada.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md (solo lectura)"

  - "docs/director-ia/** (solo lectura)"
  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "lib/director-ia-real-cycle.js (solo lectura)"
  - "lib/director-ia-*.js (solo lectura)"
  - "test/director-ia-*.test.js (solo lectura)"
  - "fixtures/director-ia/** (solo lectura)"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"
  - "existing routes/controllers/middleware (solo lectura)"
  - "existing dashboard API wiring (solo lectura)"
  - "existing auth/authz middleware (solo lectura)"
  - "existing logging/telemetry/error-handling code (solo lectura)"
  - "existing persistence/session/storage code (solo lectura)"
  - "existing Twilio/WhatsApp/chat code (solo lectura)"

out_of_scope:
  - "implementar endpoint"
  - "modificar server.js"
  - "modificar routes/controllers"
  - "modificar auth"
  - "crear persistencia"
  - "crear sesión"
  - "crear observabilidad"
  - "crear retry policy"
  - "crear queue"
  - "crear background jobs"
  - "wire WhatsApp"
  - "wire Twilio"
  - "wire chat"

  - "modificar Director IA runtime"
  - "modificar OP/EB/EKS/IES/RE/CP"
  - "modificar contratos"
  - "crear nuevas fuentes/tools"
  - "modificar ARR"

  - "usar G8"
  - "crear causalidad"
  - "crear B/C/D/E"
  - "crear nuevas reglas N3/N4/N5"

  - "modificar package.json"
  - "agregar dependencias"
  - "modificar .env"
  - "crear secrets"

  - "commit"
  - "push"
  - "merge"
  - "crear siguiente implementación"
  - "encadenar siguiente tarea"

baseline_in_force:
  real_cycle:
    status: "IMPLEMENTED"
    path:
      - "validated dashboard-style ARR input"
      - "ARR facade"
      - "ARR source"
      - "MINIMAL_EXECUTION_ENVELOPE"
      - "OP"
      - "EB"
      - "EKS"
      - "query_context_metadata"
      - "IES"
      - "Reasoning Engine"
      - "Channel Projection DASHBOARD"

  current_runtime:
    entry: "in-memory factory invocation"
    output: "structured DASHBOARD projection"
    transport: "not yet product-wired"

  last_verified_regression:
    focused_real_cycle: 19
    director_ia_total: 311
    failures: 0

  known_non_blockers:
    - "durable persistence not required for one cognitive cycle"
    - "conversation session not required for one dashboard cycle"
    - "N4 IES projection debt remains DEBT_NON_BLOCKING"
    - "WhatsApp/chat not required for dashboard validation"

audit_questions:

  D1_product_entrypoint:
    question: >
      ¿Qué endpoint/route/controller existente es el candidato correcto para
      invocar Director IA desde dashboard sin mezclar lógica cognitiva en
      server.js?

  D2_facade_boundary:
    question: >
      ¿Debe una ruta invocar directamente createDirectorIaRealCycle o hace
      falta una service/facade productiva intermedia?

  D3_authentication:
    question: >
      ¿Existe autenticación productiva reutilizable para garantizar que la
      petición de dashboard está autenticada antes de ejecutar ARR?

  D4_authorization:
    question: >
      ¿Existe autorización suficiente para validar que el caller puede consultar
      el planta_id solicitado?

  D5_input_validation:
    question: >
      ¿Dónde debe validarse físicamente planta_id/year/month y qué validación ya
      existe?

  D6_request_to_cycle_mapping:
    question: >
      ¿Qué campos HTTP/product input deben mapearse al input exacto de
      createDirectorIaRealCycle sin inventar semántica?

  D7_cycle_to_http_mapping:
    question: >
      ¿Cómo debe transformarse el structured result del ciclo en una respuesta
      de producto sin reinterpretar CP?

  D8_http_status_mapping:
    question: >
      ¿Cómo deben mapearse INVALID_INPUT, ENTITY_UNRESOLVED,
      QUERY_SCOPE_INCOMPLETE, TOOL_ERROR y success a status HTTP/product sin
      colapsar estados epistemológicos?

  D9_timeout_boundary:
    question: >
      ¿Qué timeouts existen hoy para ARR/source execution y para request HTTP?
      ¿Falta policy física para evitar requests colgados?

  D10_retry_boundary:
    question: >
      ¿Puede haber retry automático sin riesgo de duplicación o semántica nueva?
      Si no está definido, clasificar como debt/blocker según impacto.

  D11_idempotency:
    question: >
      ¿Un request repetido produce efectos secundarios? Determinar si
      idempotency key o deduplicación es necesaria antes del primer wiring.

  D12_concurrency:
    question: >
      ¿El ciclo real y sus dependencies son seguros bajo requests concurrentes
      o dependen de state mutable/shared?

  D13_persistence:
    question: >
      ¿Persistir cycle results es requisito para el primer endpoint o follow-up?

  D14_session:
    question: >
      ¿Existe alguna razón física para introducir sesión antes de exponer el
      dashboard endpoint?

  D15_observability:
    question: >
      ¿Qué logging/telemetry mínimo necesita una primera ruta productiva:
      trace_id, duration, source status, final projection status, errors?

  D16_sensitive_data:
    question: >
      ¿Qué artefactos no deben loguearse ni exponerse en respuesta por contener
      provenance/raw refs/metadata interna?

  D17_error_boundary:
    question: >
      ¿Qué errores deben quedar internos y cuáles deben exponerse como errores
      estructurados al caller?

  D18_security:
    question: >
      ¿Existen riesgos de inyección, planta_id tampering, credential leakage o
      raw payload exposure en el wiring productivo?

  D19_server_composition:
    question: >
      ¿server.js puede limitarse a route registration + dependency injection y
      permanecer libre de lógica Director IA?

  D20_dashboard_contract:
    question: >
      ¿El output actual CP DASHBOARD ya es suficiente como payload productivo o
      requiere adapter de transporte no semántico?

  D21_operational_dependencies:
    question: >
      ¿Qué configuración/env/secrets existentes necesita el ciclo para
      ejecutarse desde server real?

  D22_health_readiness:
    question: >
      ¿Hace falta health/readiness check específico para dependencia ARR antes
      del primer rollout?

  D23_rollout_safety:
    question: >
      ¿Puede exponerse detrás de feature flag, auth allowlist o ruta interna sin
      modificar epistemología?

  D24_candidate_next_step:
    question: >
      Comparar obligatoriamente:
      A) dashboard endpoint wiring;
      B) observability hardening first;
      C) persistence first;
      D) session first;
      E) WhatsApp wiring first.

  D25_gate_requirements:
    question: >
      Determinar G1/G2/G3/config/security requirements de cada candidato.

  D26_next_task:
    question: >
      Recomendar exactamente un NEXT_TASK con alcance mínimo cerrado.

mandatory_productization_matrix:
  rows:
    - "HTTP/dashboard entry"
    - "authentication"
    - "authorization"
    - "validation"
    - "Director IA facade"
    - "ARR/source"
    - "timeout"
    - "retry"
    - "idempotency"
    - "concurrency"
    - "observability"
    - "error mapping"
    - "response mapping"
    - "persistence"
    - "session"
    - "feature flag/rollout"

  columns:
    - "capability"
    - "exists today"
    - "physically reusable"
    - "required for first release"
    - "gap"
    - "risk"
    - "gate"
    - "recommended action"

mandatory_status_transport_matrix:
  rows:
    - "SUCCESS/VALIDATED"
    - "ACQUIRED_EMPTY / DATA_NOT_FOUND"
    - "TOOL_ERROR"
    - "ENTITY_UNRESOLVED"
    - "QUERY_SCOPE_INCOMPLETE"
    - "INVALID_INPUT"
    - "NO_KNOWLEDGE / ABSTAIN"

  columns:
    - "internal state"
    - "safe product meaning"
    - "HTTP family candidate"
    - "must preserve detail"
    - "must not expose"
    - "requires G2"
    - "notes"

mandatory_candidate_matrix:
  rows:
    - "A_DASHBOARD_ENDPOINT_WIRING"
    - "B_OBSERVABILITY_FIRST"
    - "C_PERSISTENCE_FIRST"
    - "D_SESSION_FIRST"
    - "E_WHATSAPP_FIRST"

  columns:
    - "candidate"
    - "value unlocked"
    - "prerequisites"
    - "risk"
    - "G2"
    - "G3"
    - "config/security"
    - "recommended"

mandatory_gap_classification:
  allowed_values:
    - "READY"
    - "WIRING_ONLY"
    - "ADAPTER_REQUIRED"
    - "IMPLEMENTATION_REQUIRED"
    - "CONFIG_REQUIRED"
    - "SECURITY_REQUIRED"
    - "OBSERVABILITY_REQUIRED"
    - "DEBT_NON_BLOCKING"
    - "REQUIRES_G2"
    - "REQUIRES_G3"
    - "BLOCKER"

decision_rules:
  - "No recomendar persistencia first sin dependencia física demostrada."
  - "No recomendar sesión first sin dependencia física demostrada."
  - "No recomendar WhatsApp first; dashboard real ya es el slice elegido."
  - "Preferir wiring mínimo que exponga el ciclo existente sin duplicar lógica."
  - "server.js no debe contener lógica cognitiva."
  - "Transport mapping no puede reinterpretar estados epistemológicos."
  - "HTTP 200/4xx/5xx no sustituye AcquisitionStatus/IES/CP semantics."
  - "No loggear secrets ni raw sensitive payloads."
  - "trace_id debe ser visible para operación si es seguro."
  - "No añadir retry automático si idempotency/side effects no están probados."
  - "No introducir G8."
  - "No crear nueva epistemología para facilitar API design."

required_report_sections:
  - "1. Executive verdict"
  - "2. Baseline real cycle"
  - "3. Existing server/product runtime"
  - "4. D1-D26 findings"
  - "5. Productization readiness matrix"
  - "6. Request/input mapping"
  - "7. Status/transport mapping"
  - "8. Authentication and authorization"
  - "9. Timeout/retry/idempotency"
  - "10. Concurrency"
  - "11. Observability"
  - "12. Security/data exposure"
  - "13. Persistence/session dependency"
  - "14. server.js boundary"
  - "15. Dashboard response compatibility"
  - "16. Rollout strategy readiness"
  - "17. Candidate comparison"
  - "18. Gate map"
  - "19. Minimum productization slice"
  - "20. Exactly one NEXT_TASK"
  - "21. GO/CONDITIONAL-GO/NO-GO"
  - "22. STOP"

acceptance_criteria:
  - "D1-D26 answered"
  - "dashboard entrypoint candidate identified"
  - "auth/authz readiness proven"
  - "request -> cycle mapping proven"
  - "cycle -> response mapping proven"
  - "status transport boundary defined without epistemic collapse"
  - "timeout/retry/idempotency audited"
  - "concurrency audited"
  - "observability minimum identified"
  - "security exposure audited"
  - "persistence necessity proven/disproven"
  - "session necessity proven/disproven"
  - "five candidate directions compared"
  - "gates separated"
  - "exactly one NEXT_TASK recommended"
  - "no implementation"
  - "no runtime/contracts modified"
  - "git diff --check clean"
  - "only CURRENT_TASK and report changed"

allowed_actions:
  - "read contracts/reports"
  - "read server/routes/controllers/middleware"
  - "read Director IA runtime/tests"
  - "read auth/authz code"
  - "read logging/telemetry code"
  - "read persistence/session code"
  - "read package/config references"
  - "run existing tests if useful"
  - "create report"
  - "update CURRENT_TASK through permitted transitions"
  - "run git diff --check"

forbidden_actions:
  - "modify runtime"
  - "modify server.js"
  - "modify routes/controllers"
  - "modify auth/authz"
  - "modify tests"
  - "modify fixtures"
  - "modify contracts"
  - "modify package.json"
  - "modify env/config"
  - "create endpoint"
  - "create persistence"
  - "create session"
  - "wire WhatsApp/chat"
  - "create implementation task"
  - "commit"
  - "push"
  - "merge"
  - "autoapprove gates"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede definirse un primer slice de productización
  seguro y cerrado con exactamente un NEXT_TASK. BLOCKED/STOPPED si el producto
  no puede exponerse sin decisiones arquitectónicas o de seguridad que impidan
  siquiera cerrar el scope.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md"