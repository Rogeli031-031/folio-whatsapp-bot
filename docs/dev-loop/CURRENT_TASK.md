# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Determinar el siguiente movimiento de mayor valor después de haber integrado
  en M2 folio_status + history + documents metadata. Auditar los huecos M2
  restantes y decidir si existe otro slice M2 con suficiente valor ejecutivo,
  seguridad y fidelidad contractual para implementarse ahora, o si conviene
  detener la profundización de M2 y regresar a priorización global entre módulos.

baseline:
  module: "M2 — Kanban / Folios"
  state: "PARTIAL"

  integrated:
    - "comentarios"
    - "folio_status"
    - "consulta por id"
    - "consulta por numero_folio"
    - "varios folios"
    - "listado por planta"
    - "filtro/listado por etapa"
    - "history read-only"
    - "documents metadata-only"

  explicitly_not_integrated:
    - "contenido PDF"
    - "S3"
    - "documentos faltantes"
    - "cumplimiento documental"
    - "kanban_flow adicional no cubierto"
    - "financial status"
    - "cheques"
    - "pólizas"
    - "presupuestos"
    - "writes"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20

primary_decision: >
  ¿Existe todavía dentro de M2 un slice incremental de suficiente valor
  ejecutivo para ser la siguiente inversión, o el siguiente movimiento correcto
  es volver a priorización global de módulos?

mandatory_candidates:
  - "kanban_flow"
  - "financial_status"
  - "documents_content_or_missing"
  - "otros huecos M2 encontrados en definición canónica"
  - "exit_M2_and_reprioritize_globally"

canonical_audit:
  required:
    - "leer definición M2 completa y vigente"
    - "enumerar capacidad ya cubierta"
    - "enumerar capacidad todavía faltante"
    - "identificar qué falta realmente para COMPLETE"
    - "no reinterpretar COMPLETE"
    - "no asumir que M2 debe terminarse antes de salir"

kanban_flow:
  audit:
    - "qué capacidad incremental queda después del listado por etapa"
    - "si existe distribución/conteo todavía no cubierto"
    - "si puede determinarse tiempo en etapa fielmente"
    - "si puede determinarse flujo sin inferencias"
    - "si existe SELECT-only seguro"
    - "si GET /kanban sigue teniendo side effects"
    - "si history aporta evidencia suficiente"

  invariants:
    - "timestamp de evento ≠ necesariamente entrada a etapa"
    - "antigüedad ≠ retraso"
    - "antigüedad ≠ atorado"
    - "no inventar SLA"
    - "no inventar event_type"
    - "no inventar transición"

financial_status:
  audit:
    - "cheques"
    - "pólizas"
    - "presupuestos"
    - "fuentes físicas"
    - "qué pertenece realmente a M2"
    - "qué pertenece a M18"
    - "si GET /finanzas sigue siendo stub"
    - "si existe un slice coherente o son capacidades independientes"

  invariants:
    - "cheque ≠ póliza"
    - "póliza ≠ presupuesto"
    - "presupuesto M18 no debe absorberse en M2"
    - "stub ≠ integración"
    - "archivo ≠ metadata financiera"

documents_remaining:
  audit:
    - "contenido PDF"
    - "S3"
    - "faltantes"
    - "cumplimiento documental"

  rule: >
    Evaluar valor y dependencias, pero no asumir que deben implementarse.
    Mantener frontera con M15 y con cualquier sistema de storage/document
    intelligence.

other_m2_gaps:
  required: >
    Revisar la ficha canónica para detectar cualquier hueco M2 restante no
    representado por los candidatos anteriores.

exit_option:
  candidate: "EXIT_M2"

  meaning: >
    No implementar otro slice M2 ahora. Conservar M2 PARTIAL con las
    capacidades ya ganadas y regresar a una priorización global por valor
    ejecutivo entre los módulos restantes.

  evaluate:
    - "rendimiento marginal de seguir profundizando M2"
    - "valor de cerrar otro módulo"
    - "dependencias/riesgo de los huecos M2 restantes"
    - "si las necesidades ejecutivas principales de M2 ya están suficientemente cubiertas"
    - "costo de oportunidad"

comparison_dimensions:
  score_0_to_5:
    - "executive_value"
    - "daily_frequency"
    - "incremental_value"
    - "source_clarity"
    - "read_only_safety"
    - "semantic_fidelity"
    - "authz_fit"
    - "implementation_reuse"
    - "testability"

  penalties_0_to_5:
    - "inference_risk"
    - "write_dependency"
    - "external_dependency"
    - "cross_module_dependency"
    - "contract_ambiguity"
    - "duplication"

mandatory_table:
  columns:
    - "candidate"
    - "remaining_gap"
    - "executive_value"
    - "incremental_value"
    - "physical_source"
    - "select_only"
    - "dependencies"
    - "inference_risk"
    - "state_effect"
    - "percentage_effect"
    - "recommendation"

decision_rules:
  - "Elegir exactamente un siguiente movimiento."
  - "Puede ser un slice M2."
  - "Puede ser EXIT_M2."
  - "No elegir por deseo de completar M2."
  - "No elegir por facilidad solamente."
  - "No ampliar contratos para fabricar un ganador."
  - "No contar nuevamente PARTIAL."

percentage_rules:
  - "Baseline = 8.5 / 20 = 42.5%."
  - "Esta tarea no cambia porcentaje."
  - "Otro slice dentro de PARTIAL normalmente produce 0.0 pp."
  - "No marcar COMPLETE salvo evidencia canónica suficiente."
  - "EXIT_M2 conserva 42.5%."

required_outcome:

  if_m2_slice_wins:
    next_task_pattern: "ARCH-DIRECTOR-IA-M2-<SLICE>-READINESS-001"

  if_exit_m2_wins:
    next_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizarla ni ejecutarla.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar"
  - "modificar código"
  - "modificar runtime"
  - "modificar matriz"
  - "modificar contratos"
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL"
  - "crear migrations"
  - "acceder S3"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se auditó la definición canónica completa de M2."
  - "Se verificó cobertura actual status + history + documents metadata."
  - "Se enumeraron huecos restantes."
  - "Se auditó kanban_flow."
  - "Se auditó financial_status."
  - "Se auditó documents restante."
  - "Se buscaron otros huecos M2."
  - "Se evaluó explícitamente EXIT_M2."
  - "Se comparó valor marginal."
  - "Se eligió exactamente un siguiente movimiento."
  - "M2 permanece PARTIAL durante esta tarea."
  - "42.5% permanece sin cambio."
  - "No se implementó nada."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M2"
    - "cobertura actual"
    - "huecos restantes"
    - "kanban_flow"
    - "financial_status"
    - "documents remaining"
    - "otros huecos"
    - "EXIT_M2"
    - "tabla comparativa"
    - "scoring"
    - "costo de oportunidad"
    - "ganador"
    - "razones"
    - "estado M2"
    - "efecto porcentual"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe una decisión defendible entre continuar M2
  o EXIT_M2. STOPPED si ninguna decisión puede justificarse sin nueva
  información contractual. BLOCKED si falta gate humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"