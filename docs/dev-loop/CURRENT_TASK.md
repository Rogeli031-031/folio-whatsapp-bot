# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación/capability matrix de Director IA con el slice
  read-only de notas de revisión de M12 ya integrado en main, documentando
  la nueva profundidad funcional sin cambiar M12 de PARTIAL, sin modificar
  el numerador 10.0/20 ni el porcentaje global 50.0%.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"

  module: "M12 — Action Register"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_before:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  global_after:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  gain_pp: 0.0

implemented_slice:
  path: >
    revision_notes -> get_action_register_revision_notes ->
    loadActionRegisterRevisionNotesForChat ->
    resolver revisión -> SELECT ->
    recorte determinista -> evidencia separada -> respuesta

  source: "arr.action_register_revision_notes"
  relation: "revision_id"

  supported:
    - "notas por revisión"
    - "notas de última revisión"
    - "texto almacenado"
    - "autor almacenado"
    - "created_at"
    - "revision_id"
    - "revision_date"
    - "evidencia separada"

revision_semantics:
  latest:
    rule: "ORDER BY revision_date DESC"

  clarification:
    rule: >
      Si no existe revisión identificada ni el usuario solicita la última/más
      reciente, Director IA clarifica en lugar de seleccionar una revisión
      silenciosamente.

  invariants:
    - "nota de revisión != action item"
    - "nota de revisión != transición de estatus"
    - "nota de revisión != M2 history"
    - "nota de revisión != comentario de folio"
    - "nota de revisión != Plaud"
    - "texto almacenado != acuerdo formal inferido"

context_policy:
  revisions: 1
  max_notes: 8
  max_chars_per_note: 500
  truncation: "explícito"

  rules:
    - "no completar texto truncado"
    - "no cargar revisiones adicionales automáticamente"
    - "includeNotes del contexto general permanece false"

authz:
  model: "Action Register vigente"
  rules:
    - "no usar authz M2"
    - "preservar planta"
    - "preservar plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"
    - "GA/GV según reglas vigentes de Action Register"

boundaries:
  excluded:
    - "atribución de nota a action item"
    - "Plaud"
    - "M2 history"
    - "comentarios de folio"
    - "PDF"
    - "S3"
    - "binarios"
    - "HTTP interno"
    - "writes"

test_evidence:
  focal_revision_notes: "26/26 pass"
  capabilities: "48 pass"
  planner: "42 pass"
  orchestrator: "25 pass"
  director_ia_suite: "625/625 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M12 permanece PARTIAL"
    - "notas de revisión disponibles read-only"
    - "fuente arr.action_register_revision_notes"
    - "relación revision_id"
    - "latest por revision_date DESC"
    - "clarificación cuando revisión no está identificada"
    - "1 revisión"
    - "máximo 8 notas"
    - "500 caracteres por nota"
    - "truncation explícito"
    - "authz Action Register"
    - "separación de ítems"
    - "separación M2"
    - "separación comentarios"
    - "separación Plaud"
    - "separación binarios"
    - "10.0/20 = 50.0% sin cambio"

  must_preserve:
    - "M12 = PARTIAL"
    - "M12 != COMPLETE"
    - "10.0/20"
    - "50.0%"
    - "ningún otro módulo cambia"

  forbidden:
    - "marcar M12 COMPLETE"
    - "sumar 0.5 nuevamente por M12"
    - "subir porcentaje por profundización de un PARTIAL"
    - "atribuir notas a action items"
    - "declarar Plaud integrado"
    - "declarar M2 como fuente de notas"
    - "cambiar estado de otro módulo"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m12-revision-notes.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m12-revision-notes.test.js"

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
  - "integrar Plaud"
  - "integrar archivos"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M12 revision notes verificada físicamente en main."
  - "M12 permanece PARTIAL."
  - "M12 no se marca COMPLETE."
  - "Notas de revisión quedan documentadas."
  - "Fuente revision_notes queda documentada."
  - "revision_id queda documentado."
  - "Latest por revision_date DESC queda documentado."
  - "Clarificación queda documentada."
  - "Límites 1/8/500 quedan documentados."
  - "Truncation explícito queda documentado."
  - "includeNotes general sigue false."
  - "Authz AR queda documentada."
  - "No atribución a ítems."
  - "Plaud sigue separado."
  - "M2 sigue separado."
  - "Comentarios siguen separados."
  - "Binarios siguen separados."
  - "10.0/20 permanece."
  - "50.0% permanece."
  - "Ningún otro módulo cambia."
  - "No se modifica código/runtime/tests."
  - "Solo los tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005"

  rule: >
    Después de documentar la profundización de M12, volver a priorizar globalmente
    desde 50.0%. No continuar M12 por inercia y no asumir que M5 gana por haber
    quedado segundo.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación verificada"
    - "path físico"
    - "revision semantics"
    - "latest revision"
    - "context limits"
    - "truncation"
    - "authz"
    - "item boundary"
    - "M2 boundary"
    - "comments boundary"
    - "Plaud boundary"
    - "binary boundary"
    - "tests"
    - "M12 PARTIAL"
    - "10.0/20 = 50.0%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz documenta correctamente revision notes
  manteniendo M12 PARTIAL y 10.0/20 = 50.0%. STOPPED si la documentación
  contradice el runtime físico. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001.md"