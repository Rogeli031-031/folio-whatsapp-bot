# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M1-CAPABILITY-MATRIX-SYNC-001"
status: CLOSED

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
  Sincronizar exclusivamente el inventario/capability matrix M0–M20 para
  reflejar la implementación real de M1 Health dashboard ya integrada en main,
  sin ampliar su alcance a /health, /health-db o /health-proyectos y sin
  redefinir arquitectura, contratos constitucionales ni runtime.

baseline_in_force:
  source_audit: "ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001"
  implementation_task: "IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001"
  implementation_state: "integrated_in_main"
  backend_endpoint: "GET /health-director-ia"
  frontend_indicator_location: "DirectorIaShell header"
  refresh_strategy: "one-shot + refresh manual"
  polling: false
  retry: false
  auth_header_on_health: false

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M1-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

out_of_scope:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "otros contratos docs/director-ia/*"
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "lockfiles"
  - "Render config/env"
  - "cambiar M0/M2-M20"
  - "ampliar M1 a /health"
  - "ampliar M1 a /health-db"
  - "ampliar M1 a /health-proyectos"
  - "chat/LLM tool para health"
  - "commit"
  - "push"
  - "merge"
  - "siguiente tarea"

required_document_change:
  module: "M1"
  target_file: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  required_effect:
    - >
      Reflejar que M1 Health dashboard tiene integración operativa mediante
      GET /health-director-ia en el módulo Director IA.
    - >
      Mantener explícito que esto no equivale a integrar /health, /health-db
      ni /health-proyectos como fuentes conversacionales.
    - >
      No declarar que readiness técnica implica datos disponibles,
      operación saludable o conclusión de negocio.
    - >
      No alterar otros módulos ni recalcular estados no soportados por evidencia.

m1_complete_definition:
  - "indicador técnico visible en DirectorIaShell"
  - "consume GET /health-director-ia"
  - "sin Authorization"
  - "estados loading/ready/disabled/unavailable/transport_error"
  - "one-shot + refresh manual"
  - "sin polling"
  - "sin retry"
  - "cycle panel independiente"
  - "tests M1 verdes"

evidence_required:
  - "IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001 integrado en main"
  - "test/director-ia-dashboard-health-client.test.js"
  - "suite Director IA relevante verde según reporte del IMPL"
  - "sin backend nuevo"

decision_rule:
  - >
    Si cambiar la etiqueta/semántica de M1 en la matriz contradice su definición
    canónica original y requiere redefinir qué significa M1, STOP y solicitar G2.
  - >
    Si basta con actualizar el inventario para reflejar una integración ya
    existente sin redefinir arquitectura, G2 puede ser N/A.
  - "No tocar otros M."
  - "No inventar porcentaje nuevo fuera de la fórmula auditada."

acceptance_criteria:
  - "M1 queda alineado con la implementación real"
  - "no se afirma integración de endpoints no implementados"
  - "no se mezcla readiness técnica con negocio"
  - "M0/M2-M20 intactos"
  - "solo CURRENT_TASK, reporte y capability matrix pueden cambiar"
  - "git diff --check limpio"
  - "sin implementación"

expected_terminal_state: >
  DONE_PENDING_REVIEW si M1 puede sincronizarse documentalmente sin redefinir
  arquitectura. BLOCKED/STOPPED si hace falta G2.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M1-CAPABILITY-MATRIX-SYNC-001.md"

documented_result:
  outcome: "DONE_PENDING_REVIEW"
  g2_decision: "A"
  g2: N/A
  m1_coverage_before: "NO INTEGRADA"
  m1_coverage_after: "PARCIAL"
  m1_completa: false
  endpoint_integrated: "GET /health-director-ia"
  endpoints_not_integrated:
    - "/health"
    - "/health-db"
    - "/health-proyectos"
```
