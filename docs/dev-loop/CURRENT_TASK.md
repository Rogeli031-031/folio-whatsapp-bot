# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T22:06:18-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T22:06:18-06:00.
  Apruebo ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002 y autorizo G1.

result:
  report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  baseline_percentage: 37.5
  winner: "M3"
  winner_state: "PARTIAL"
  target_state: "COMPLETE"
  potential_gain_pp: 2.5
  next_task_proposed: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001"
  next_task_authorized: false

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente módulo funcional de Director IA después de completar
  M16, usando evidencia física del repositorio y la capability matrix vigente.
  El objetivo es elegir exactamente un módulo que maximice avance funcional y
  probabilidad de COMPLETE, minimizando esfuerzo, dependencias, riesgo
  productivo y cambio arquitectónico.

baseline:
  current_m0_m20_percentage: 37.5
  numerator: 7.5
  denominator: 20
  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"
  completed_since_previous_prioritization:
    - "M16 — análisis de posibles duplicados de folios"
  note: >
    No volver a priorizar M16. La capability matrix ya lo registra COMPLETE.

scope_rule: >
  Evaluar únicamente módulos que todavía no estén COMPLETE en
  docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md. No asumir el estado
  por memoria; leer físicamente la matriz vigente.

primary_goal: >
  Identificar el siguiente candidato con mejor combinación de:
  1) ganancia potencial;
  2) probabilidad real de alcanzar COMPLETE;
  3) reutilización de infraestructura existente;
  4) bajo número de dependencias;
  5) bajo riesgo productivo;
  6) bajo riesgo semántico.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
  - "código, tests, endpoints, servicios, tablas y frontend relevantes de candidatos (solo lectura)"

out_of_scope:
  - "implementar"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar backend"
  - "modificar capability matrix"
  - "modificar contratos"
  - "crear migration"
  - "modificar SQL"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "abrir siguiente task automáticamente"

candidate_selection:
  rule: >
    Construir la lista de candidatos directamente desde la matriz vigente.
    Excluir módulos COMPLETE y N_A.
  include:
    - "PARTIAL"
    - "NOT_STARTED"
    - "BLOCKED, únicamente para valorar si el blocker ya desapareció"
  exclude:
    - "COMPLETE"
    - "N_A"

evaluation_dimensions:

  canonical_definition:
    question: >
      ¿Qué exige exactamente el módulo según la capability matrix?

  current_state:
    question: >
      ¿Está PARTIAL, NOT_STARTED o BLOCKED?

  potential_gain:
    question: >
      ¿Cuántos puntos porcentuales ganaría el indicador si alcanza COMPLETE?

  backend_readiness:
    question: >
      ¿Ya existen endpoints, handlers, services, queries o loaders reutilizables?

  frontend_readiness:
    question: >
      ¿Ya existe superficie/UI/patrón reutilizable o puede completarse sin UI nueva?

  tool_readiness:
    question: >
      ¿Existe intent/tool/capability declarada pero no integrada, como ocurrió en M16?

  data_source:
    question: >
      ¿La fuente real ya existe y es accesible con permisos conocidos?

  authz:
    question: >
      ¿El scope y los permisos están resueltos o existe riesgo de exposición cross-scope?

  dependencies:
    question: >
      ¿Cuántas tareas previas o dependencias humanas/externas requiere?

  db_migration:
    question: >
      ¿Requiere cambios de schema, backfill o migración productiva?

  external_services:
    question: >
      ¿Depende de S3, Twilio, WhatsApp, proveedores externos, archivos manuales u otros sistemas?

  implementation_effort:
    question: >
      ¿El gap es wiring pequeño, integración media o capacidad nueva grande?

  testability:
    question: >
      ¿Puede probarse determinísticamente con la infraestructura existente?

  semantic_risk:
    question: >
      ¿Existe riesgo de convertir correlación, heurística o fuente parcial en conclusión fuerte?

  production_risk:
    question: >
      ¿Requiere escritura, acciones clase C, secretos, permisos elevados o rollout delicado?

  completeness_feasibility:
    question: >
      ¿Puede alcanzar COMPLETE en un único slice razonable o solo PARTIAL?

mandatory_candidate_table:
  columns:
    - "module"
    - "canonical_purpose"
    - "current_state"
    - "potential_gain_pp"
    - "existing_backend"
    - "existing_frontend"
    - "existing_tool_or_intent"
    - "data_source"
    - "authz_ready"
    - "dependencies"
    - "db_or_migration"
    - "external_dependency"
    - "estimated_effort"
    - "semantic_risk"
    - "production_risk"
    - "can_reach_complete_in_one_slice"
    - "evidence"

ranking_rules:
  - "Rankear todos los candidatos evaluados."
  - "No elegir por número de módulo."
  - "No elegir por facilidad si solo puede llegar a PARTIAL."
  - "Preferir un +5 pp real frente a un +2.5 pp si esfuerzo/riesgo son comparables."
  - "Preferir read-only sobre mutaciones cuando el valor sea comparable."
  - "Preferir wiring de capacidades existentes sobre desarrollo de dominio desde cero."
  - "Penalizar dependencias externas."
  - "Penalizar clase C / acciones irreversibles."
  - "Penalizar ambigüedad de authz."
  - "Penalizar migrations si existe candidato igual de valioso sin ellas."
  - "No usar una puntuación arbitraria sin justificar componentes."

blocked_modules:
  rule: >
    Revalidar blockers anteriores en lugar de asumir que siguen vigentes.
    Si un blocker desapareció por trabajo reciente, el módulo vuelve a competir.
  note: >
    No ejecutar nada para remover blockers; solo diagnosticar.

partial_modules:
  rule: >
    Evaluar si llevar un PARTIAL a COMPLETE es más barato y seguro que llevar un
    NOT_STARTED a COMPLETE. No excluirlos automáticamente.
  gain_formula: >
    PARTIAL -> COMPLETE = +2.5 pp bajo la fórmula vigente.

not_started_modules:
  gain_formula: >
    NOT_STARTED -> COMPLETE = +5.0 pp bajo la fórmula vigente.

decision_target:
  required: "exactamente un ganador"
  winner_must:
    - "tener evidencia física suficiente"
    - "tener un path de implementación identificable"
    - "tener gates determinables"
    - "maximizar probabilidad de COMPLETE"
    - "no depender de una reinterpretación artificial de la matriz"

winner_analysis:
  must_include:
    - "por qué debe ir primero"
    - "ganancia potencial"
    - "delta físico faltante"
    - "dependencias"
    - "riesgos"
    - "si necesita readiness adicional"
    - "si puede ir directo a IMPL"
    - "gates"

next_task_policy:
  exactly_one: true
  rule:
    - >
      Si falta una auditoría específica del ganador:
      proponer ARCH-DIRECTOR-IA-<MODULO>-READINESS-001.
    - >
      Si el gap está completamente determinado y puede implementarse sin
      decisión adicional:
      proponer IMPL-DIRECTOR-IA-<MODULO>-001.
    - "No autorizar."
    - "No ejecutar."
    - "No proponer dos tareas alternativas."

gate_rules:
  G1: "requerido para cualquier NEXT_TASK"
  G2:
    - "N/A si cabe en arquitectura existente"
    - "REQUIRED si hay que redefinir arquitectura"
  G3:
    - "N/A si contratos existentes bastan"
    - "REQUIRED si hay que crear/modificar contrato arquitectónico"
  G8:
    - "N/A salvo evidencia material específica"
  note: "No activar gates preventivamente."

required_output:
  - "baseline formal 37.5%"
  - "lista de candidatos derivada de matriz vigente"
  - "tabla comparativa completa"
  - "ranking total"
  - "ganador único"
  - "ganancia potencial"
  - "evidencia física del ganador"
  - "por qué otros candidatos quedan detrás"
  - "blockers revalidados"
  - "NEXT_TASK único"
  - "gates del NEXT_TASK"

acceptance_criteria:
  - "Se leyó la capability matrix vigente."
  - "M16 no se vuelve a evaluar como candidato."
  - "Todos los módulos no COMPLETE/N_A relevantes fueron considerados."
  - "PARTIAL y NOT_STARTED fueron comparados bajo la fórmula correcta."
  - "Los blockers fueron revalidados."
  - "El ranking tiene evidencia física."
  - "Hay exactamente un ganador."
  - "Hay exactamente un NEXT_TASK."
  - "No se implementó nada."
  - "No se modificó la capability matrix."
  - "git diff --check limpio."
  - "Solo CURRENT_TASK y reporte modificados."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  must_include:
    - "resumen ejecutivo"
    - "baseline 37.5%"
    - "estado actual de módulos"
    - "tabla comparativa"
    - "ranking"
    - "ganador"
    - "ganancia potencial"
    - "evidencia física"
    - "dependencias"
    - "riesgos"
    - "blockers revalidados"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador claro y un siguiente slice
  implementable. BLOCKED/STOPPED si no puede elegirse un ganador sin una
  decisión arquitectónica previa.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
```