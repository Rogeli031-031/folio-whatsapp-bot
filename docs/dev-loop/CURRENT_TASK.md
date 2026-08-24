# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la capability matrix de Director IA con la implementación
  read-only de M18 — Presupuestos semanales — ya integrada en main,
  cambiando M18 de NO INTEGRADA a PARTIAL y recalculando el avance global
  de 9.5/20 = 47.5% a 10.0/20 = 50.0%, sin marcar COMPLETE y manteniendo
  fuera cheques, Twilio/WhatsApp y writes.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"

  module: "M18 — Presupuestos semanales"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_before:
    numerator: 9.5
    denominator: 20
    percentage: 47.5

  global_after:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  gain_pp: 2.5

implemented_slice:
  path: >
    budget_status -> get_budget_status -> loadPresupuestoSemanalForChat ->
    SELECT presupuestos_semanales + presupuesto_folios ->
    evidencia -> respuesta

  supported:
    - "presupuesto semanal por planta"
    - "semana explícita"
    - "esta semana cuando la regla existente lo permite"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "importe"
    - "prioridad/urgente físicamente soportado"
    - "estatus si existe"
    - "evidencia estructurada"

  formulas:
    asignado: "presupuestos_semanales.monto_asignado"
    seleccionado: "SUM(presupuesto_folios.importe)"
    disponible: "max(0, asignado - seleccionado)"
    urgente: "prioridad coincide /urgente/i"

  week_semantics:
    - "no inventar semana"
    - "getCurrentWeekMexico() solo para triggers soportados"
    - "clarificar si no hay semana ni trigger"
    - "no filtrar únicamente ABIERTO"

  authz:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "assertFolioStatusAccess o equivalente"
    - "GV = 403"
    - "GA dentro de planta autorizada"
    - "cross-planta = 403"
    - "fail-closed"

still_not_integrated:
  - "asignar presupuesto"
  - "seleccionar/quitar folios"
  - "enviar a cheque"
  - "crear cheque"
  - "modificar status"
  - "Twilio"
  - "WhatsApp"
  - "notificaciones"
  - "writes"
  - "propósito completo de M18"

canonical_rule: >
  M18 queda PARTIAL. La consulta read-only del carro semanal no satisface
  el propósito canónico completo porque las operaciones, cheques y canales
  asociados siguen fuera.

test_evidence:
  focal_m18: "24/24 pass"
  capabilities: "46 pass"
  planner: "40 pass"
  orchestrator: "24 pass"
  director_ia_suite: "599/599 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M18: NO INTEGRADA -> PARTIAL"
    - "query presupuesto semanal disponible"
    - "week semantics"
    - "asignado/seleccionado/disponible"
    - "folios"
    - "urgentes"
    - "authz"
    - "separación de cheques"
    - "separación Twilio/WhatsApp"
    - "separación writes"
    - "recalculo 9.5/20 -> 10.0/20"
    - "47.5% -> 50.0%"

  must_preserve:
    - "M18 != COMPLETE"
    - "cheques no integrados"
    - "Twilio/WhatsApp no integrados"
    - "writes no integrados"
    - "ningún otro módulo cambia sin evidencia"

  forbidden:
    - "marcar M18 COMPLETE"
    - "contar cheques como integrados"
    - "contar WhatsApp/Twilio como integrados"
    - "contar writes como integrados"
    - "subir global por encima de 50.0% por esta tarea"
    - "cambiar estados de otros módulos"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m18-presupuesto-semanal.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m18-presupuesto-semanal.test.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar schema"
  - "crear migration"
  - "modificar contratos"
  - "integrar cheques"
  - "integrar Twilio"
  - "integrar WhatsApp"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M18 verificada físicamente en main."
  - "M18 cambia documentalmente de NO INTEGRADA a PARTIAL."
  - "M18 no se marca COMPLETE."
  - "Week semantics quedan documentadas."
  - "Asignado queda documentado."
  - "Seleccionado queda documentado."
  - "Disponible queda documentado."
  - "Urgencia solo física queda documentada."
  - "Carros no ABIERTO consultables quedan documentados."
  - "Authz queda documentada."
  - "Cheques siguen fuera."
  - "Twilio/WhatsApp siguen fuera."
  - "Writes siguen fuera."
  - "Numerador pasa de 9.5 a 10.0."
  - "Denominador permanece 20."
  - "Porcentaje pasa de 47.5% a 50.0%."
  - "Ningún otro módulo cambia."
  - "No se modifica código/runtime/tests."
  - "Solo los tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004"

  rule: >
    Volver a priorizar globalmente desde el nuevo baseline 50.0%.
    No continuar M18 por inercia ni elegir M12 automáticamente por haber
    quedado segundo.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación M18 verificada"
    - "estado antes/después"
    - "week semantics"
    - "asignado"
    - "seleccionado"
    - "disponible"
    - "folios"
    - "urgentes"
    - "authz"
    - "cheques boundary"
    - "WhatsApp/Twilio boundary"
    - "write boundary"
    - "tests"
    - "recalculo 9.5/20 -> 10.0/20"
    - "47.5% -> 50.0%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz refleja M18 PARTIAL y el baseline
  10.0/20 = 50.0% sin marcar COMPLETE. STOPPED si la documentación vigente
  contradice la implementación física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md"