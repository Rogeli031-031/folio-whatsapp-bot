# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T17:28:37-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T17:28:37-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar exclusivamente M1 — Health dashboard — para definir qué significa
  completarlo en Director IA, qué señal de health/readiness ya existe,
  qué parte falta en el frontend, cómo debe mostrarse sin confundir readiness
  técnica con conclusión de negocio, y cuál es el slice mínimo correcto para
  pasar M1 de NOT_STARTED a COMPLETE.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "server.js (solo lectura)"
  - "lib/director-ia-dashboard-cycle-transport.js (solo lectura)"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx (solo lectura)"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx (solo lectura)"
  - "frontend-dashboard/modules/director-ia/lib/api.ts (solo lectura)"
  - "frontend-dashboard/lib/auth.ts (solo lectura)"
  - "tests Director IA relevantes (solo lectura)"

out_of_scope:
  - "implementar UI"
  - "modificar backend"
  - "modificar health endpoint"
  - "modificar contratos"
  - "modificar auth/authz"
  - "hacer smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "abrir siguiente implementación"

baseline_in_force:
  roadmap:
    module: "M1"
    declared_state: "NO INTEGRADA / NOT_STARTED"
    objective: "Health dashboard"
  backend:
    route: "GET /health-director-ia"
    known_result:
      status: 200
      enabled: true
      ready: true
  semantic_rule:
    - "readiness técnica no equivale a conclusión de negocio"
    - "HTTP 200 readiness no implica ACQUIRED_OK"
    - "UI no debe presentar health como KPI operativo"

audit_questions:
  D1_m1_definition:
    question: >
      ¿Qué exige exactamente M1 en la matriz canónica para poder considerarlo
      COMPLETE?

  D2_existing_backend:
    question: >
      ¿Qué devuelve hoy GET /health-director-ia y qué valida realmente?

  D3_existing_frontend:
    question: >
      ¿El frontend Director IA consume actualmente health/readiness?
      Si no, ¿dónde debería integrarse mínimamente?

  D4_auth:
    question: >
      ¿La readiness requiere JWT o es pública? ¿Debe el frontend reutilizar el
      mismo token del módulo?

  D5_transport:
    question: >
      ¿Debe reutilizar api.ts / fetch wrapper existente o crear una función
      específica?

  D6_ui_state:
    question: >
      Definir estados mínimos de UI:
      loading / ready / disabled / unavailable / transport_error
      sin convertirlos en estados cognitivos.

  D7_copy:
    question: >
      ¿Qué texto mínimo evita confundir "servicio listo" con "datos disponibles"
      o "negocio sano"?

  D8_refresh:
    question: >
      ¿Debe ser one-shot al cargar, manual refresh, o polling?
      Preferir no polling salvo requisito físico.

  D9_failure_semantics:
    question: >
      ¿Cómo representar 503/500/network error sin afectar el cycle panel?

  D10_scope:
    question: >
      ¿M1 puede completarse sin tocar backend, contratos ni auth?

  D11_tests:
    question: >
      ¿Qué tests mínimos hacen falta para considerar M1 COMPLETE?

  D12_gate:
    question: >
      Determinar si el siguiente IMPL necesita solo G1 o también G2/G3.

  D13_next_task:
    question: >
      Proponer exactamente un NEXT_TASK mínimo.

decision_rules:
  - "No polling automático salvo necesidad demostrada."
  - "No retry automático."
  - "No mezclar readiness técnica con estados ACQUIRED_* / ABSTAIN."
  - "No introducir nueva arquitectura."
  - "Preferir reutilizar fetch/auth existentes."
  - "No tocar backend si /health-director-ia ya es suficiente."
  - "No implementar en esta tarea."

required_output:
  - "definición operativa de M1 COMPLETE"
  - "gap exacto frontend/backend"
  - "estado auth"
  - "shape de respuesta health"
  - "estado UI mínimo"
  - "copy recomendado"
  - "estrategia refresh"
  - "tests mínimos"
  - "gates"
  - "exactamente un NEXT_TASK"

acceptance_criteria:
  - "M1 definido con evidencia"
  - "se identifica si backend ya basta"
  - "se identifica el mínimo cambio frontend"
  - "sin ambigüedad health vs business"
  - "sin implementación"
  - "gates definidos"
  - "exactamente un NEXT_TASK"
  - "git diff --check limpio"
  - "solo CURRENT_TASK y reporte modificados"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede definirse un slice mínimo para completar M1.
  BLOCKED/STOPPED si M1 requiere redefinición contractual o backend adicional.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001.md"

documented_result:
  outcome: "DONE_PENDING_REVIEW"
  backend_sufficient: true
  backend_change_required: false
  frontend_consumes_health_today: false
  indicator_location: "DirectorIaShell header, outside DirectorIaCyclePanel"
  auth_on_health_endpoint: false
  refresh: "one-shot_plus_manual"
  polling: false
  retry: false
  blocks_cycle_panel: false
  g2: N/A
  g3: N/A
  next_task_proposed: "IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001"
  next_task_authorized: false
```