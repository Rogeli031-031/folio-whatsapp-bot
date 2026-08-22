# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001"
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
  Priorizar el siguiente módulo funcional de Director IA que convenga implementar
  después de M1, usando evidencia física del repositorio y la matriz M0-M20.
  Comparar impacto, esfuerzo, dependencias, riesgo y capacidad real de mover un
  módulo de NOT_STARTED a COMPLETE con un slice acotado.

current_progress:
  m0_m20_percentage: 32.5
  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"
  note: >
    M1 ya está en PARCIAL. El objetivo de esta auditoría es encontrar el
    siguiente módulo que maximice avance funcional sin abrir arquitectura
    innecesaria.

candidates:
  - "M4 Clasificación"
  - "M5 Taller AT"
  - "M6 Excel GASTOS/INVERSIONES"
  - "M10 Weekly LD"
  - "M14 Usuarios admin"
  - "M15 Docs/media folio"
  - "M16 Duplicados"

excluded:
  M18:
    reason: "bloqueado por mapeo/definición de queries de presupuesto"
  M19:
    reason: "N_A / no integrar"
  partial_modules:
    reason: >
      No son candidatos principales en esta auditoría; primero evaluar si un
      NOT_STARTED puede aportar +5 puntos con menor esfuerzo.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
  - "código y tests de los candidatos (solo lectura)"

out_of_scope:
  - "implementar"
  - "modificar frontend/backend"
  - "modificar contratos"
  - "modificar matriz"
  - "crear migrations"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "abrir siguiente tarea automáticamente"

evaluation_dimensions:
  impact:
    question: >
      ¿Cuántos puntos M0-M20 ganaría si el módulo pasa realmente a COMPLETE?

  implementation_effort:
    question: >
      ¿Cuánto wiring/runtime nuevo exige según el código físico existente?

  dependency_count:
    question: >
      ¿Cuántos otros módulos, contratos, fuentes o permisos necesita antes?

  backend_readiness:
    question: >
      ¿Ya existe fuente/endpoint/helper reutilizable?

  frontend_readiness:
    question: >
      ¿Ya existe UI o patrón reutilizable?

  testability:
    question: >
      ¿Puede cubrirse con tests deterministas existentes o focales simples?

  production_risk:
    question: >
      ¿Requiere DB, migrations, permisos, secretos o cambios productivos
      delicados?

  semantic_risk:
    question: >
      ¿Puede inducir inferencias/causalidad no sustentada o mezclar funciones
      que no corresponden al Director IA?

  completeness_feasibility:
    question: >
      ¿Es realista llevarlo a COMPLETE en un solo slice o solo a PARTIAL?

mandatory_matrix:
  columns:
    - "module"
    - "current_state"
    - "potential_gain_points"
    - "existing_backend"
    - "existing_frontend"
    - "dependencies"
    - "estimated_effort"
    - "production_risk"
    - "can_reach_complete_in_one_slice"
    - "recommended_rank"

decision_rules:
  - "Priorizar capacidad de llegar a COMPLETE, no solo facilidad de hacer algo parcial."
  - "Preferir reutilización de código existente."
  - "Penalizar dependencias humanas o contractuales no resueltas."
  - "Penalizar migrations/DB si existe alternativa igual de valiosa sin ellas."
  - "No elegir un módulo solo porque el archivo ya existe."
  - "No asumir COMPLETE sin wiring + integration + tests."
  - "Elegir EXACTAMENTE un siguiente módulo."
  - "Proponer exactamente un NEXT_TASK."
  - "No implementarlo."

required_output:
  - "ranking completo de candidatos"
  - "ganancia potencial de porcentaje"
  - "evidencia física por candidato"
  - "por qué el ganador debe ir primero"
  - "qué riesgos quedan"
  - "exactamente un NEXT_TASK mínimo"
  - "gates del NEXT_TASK"

acceptance_criteria:
  - "todos los candidatos evaluados con evidencia física"
  - "ranking explícito"
  - "un solo ganador"
  - "ganancia porcentual estimada defendible"
  - "NEXT_TASK único"
  - "sin implementación"
  - "git diff --check limpio"
  - "solo CURRENT_TASK y reporte modificados"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador claro y un slice implementable.
  BLOCKED/STOPPED si ninguno puede llegar razonablemente a COMPLETE sin una
  tarea arquitectónica previa.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001.md"

documented_result:
  outcome: "DONE_PENDING_REVIEW"
  baseline_percentage: 32.5
  winner: "M16"
  winner_name: "Análisis duplicados de folios"
  potential_gain_if_complete_pp: 5.0
  next_task_proposed: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
  next_task_authorized: false
  g2: N/A
  g3: N/A
  g8: N/A
```