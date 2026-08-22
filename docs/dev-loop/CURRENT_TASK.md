# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T20:25:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T20:25:00-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el slice mínimo de M1 — Health dashboard — consumiendo el
  endpoint existente GET /health-director-ia desde el frontend Director IA,
  mostrando readiness técnica en el header de DirectorIaShell, desacoplada
  completamente del ciclo constitucional y sin modificar backend, contratos,
  auth/authz ni semántica de Director IA.

architecture_decision:
  source_task: "ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001"
  backend_endpoint: "GET /health-director-ia"
  backend_change_required: false
  endpoint_auth_required: false
  placement: "header de DirectorIaShell"
  cycle_panel_dependency: false
  refresh_strategy: "one-shot al montar + refresh manual"
  polling: false
  automatic_retry: false

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001.md"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx"
  - "tests mínimos necesarios para M1 health dashboard"

out_of_scope:
  - "server.js"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "backend health/readiness"
  - "DirectorIaCyclePanel semantics"
  - "cycle-client-core"
  - "docs/director-ia/*"
  - "contratos D1-D9"
  - "auth/authz"
  - "Render config/env"
  - "package.json"
  - "lockfiles"
  - "polling"
  - "retry automático"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "implementar comentarios diarios"
  - "implementar conversación constitucional"

semantic_invariants:
  - "health/readiness técnica != estado de adquisición/ciclo"
  - "health/readiness técnica != conclusión de negocio"
  - "ready=true no significa datos disponibles"
  - "ready=true no significa operación saludable"
  - "health no puede producir ACQUIRED_OK, ACQUIRED_EMPTY, TOOL_ERROR o ABSTAIN"
  - "health no bloquea DirectorIaCyclePanel"

health_states:
  loading:
    copy: "Comprobando disponibilidad técnica…"
    blocks_cycle: false

  ready:
    condition: "HTTP 200 && enabled === true && ready === true"
    copy: "Servicio Director IA: listo (técnico)"
    blocks_cycle: false

  disabled:
    condition: "HTTP 200 && enabled === false"
    copy: "Director IA deshabilitado en el servidor"
    blocks_cycle: false

  unavailable:
    condition: "HTTP 503 && enabled === true && ready === false"
    copy: "Servicio Director IA no disponible (técnico)"
    blocks_cycle: false

  transport_error:
    condition: "network error, HTTP inesperado, HTTP 500 o body inválido"
    copy: "No se pudo consultar la disponibilidad técnica"
    blocks_cycle: false

implementation_requirements:
  api:
    - "crear fetchDirectorIaHealth o equivalente en modules/director-ia/lib/api.ts"
    - "usar la misma resolución de base URL que el ciclo"
    - "GET /health-director-ia"
    - "NO enviar Authorization"
    - "NO usar apiFetch de forma que HTTP 503 legítimo pierda su semántica"
    - "parsear explícitamente HTTP 200 y HTTP 503"
    - "otros fallos => transport_error"

  shell:
    - "integrar indicador en header de DirectorIaShell"
    - "ejecutar exactamente un GET automático al montar"
    - "añadir refresh manual"
    - "cada click manual puede ejecutar un nuevo GET"
    - "sin setInterval"
    - "sin polling"
    - "sin retry automático"
    - "no deshabilitar ni ocultar DirectorIaCyclePanel por estado health"

tests_required:
  - "ready=true => ready"
  - "enabled=false => disabled"
  - "ready=false con HTTP 503 => unavailable"
  - "network error => transport_error"
  - "HTTP 500/status inesperado => transport_error"
  - "loading visible mientras request está pendiente"
  - "GET no envía Authorization"
  - "URL health correcta con resolución existente"
  - "health no bloquea ni altera cycle panel"
  - "sin polling"
  - "sin retry automático"
  - "segundo GET solo mediante refresh manual"
  - "copy no usa ACQUIRED_OK/ABSTAIN como health"
  - "copy no afirma Todo está bien / Datos disponibles / Operación saludable"

acceptance_criteria:
  - "endpoint backend existente reutilizado sin modificación"
  - "indicador health visible en DirectorIaShell"
  - "cinco estados health implementados"
  - "one-shot al montar"
  - "refresh manual"
  - "sin polling"
  - "sin retry automático"
  - "sin Authorization en health"
  - "HTTP 503 readiness tratado como unavailable, no como error genérico"
  - "cycle panel permanece independiente"
  - "tests del slice en verde"
  - "suite Director IA relevante en verde"
  - "git diff --check limpio"
  - "scope respetado"

stop_conditions:
  - "si hace falta modificar backend, STOP"
  - "si hace falta modificar contrato D1-D9, STOP"
  - "si hace falta cambiar auth/authz, STOP"
  - "si aparece necesidad de G2/G3, STOP y pedir autorización"
  - "no ampliar M1 a /health, /health-db o /health-proyectos"
  - "no implementar NEXT_TASK adicional"

expected_terminal_state: >
  DONE_PENDING_REVIEW si M1 Health dashboard queda implementado y testeado
  exclusivamente como indicador frontend de readiness técnica sobre
  GET /health-director-ia, sin modificar backend ni contratos.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001.md"
```
