# CURRENT_TASK

```yaml
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T16:21:38-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T16:21:38-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A


objective: >
  Auditar exclusivamente el gap residual de query_context_metadata entre el
  snapshot EKS persistido y el ciclo real Director IA. Determinar qué exige el
  contrato vigente, dónde se construye y adjunta actualmente, qué se persiste
  realmente en PostgreSQL, qué compatibilidad existe con snapshots históricos
  y cuál es el slice mínimo correcto para cerrar el gap sin cambiar la
  epistemología ni inventar un contrato nuevo.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001.md"

  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-INTERPRETATION-EVIDENCE-SNAPSHOT.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-real-cycle.js (solo lectura)"
  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "sql/015_director_ia_eks.sql (solo lectura)"
  - "tests Director IA/EKS relevantes (solo lectura)"

out_of_scope:
  - "modificar código"
  - "modificar SQL"
  - "modificar PostgreSQL"
  - "modificar contratos"
  - "crear migration"
  - "hacer smoke"
  - "commit"
  - "push"
  - "merge"
  - "siguiente implementación"

audit_questions:
  D1_contract:
    question: >
      ¿Qué exige exactamente el contrato EKS/IES respecto a
      query_context_metadata?

  D2_current_creation:
    question: >
      ¿Dónde y con qué shape se crea query_context_metadata actualmente?

  D3_current_persistence:
    question: >
      ¿Qué parte exacta del bundle se persiste hoy en eks.snapshots.bundle?

  D4_loss_point:
    question: >
      ¿En qué punto exacto se pierde o queda fuera de persistencia?

  D5_runtime_dependency:
    question: >
      ¿IES depende de query_context_metadata para operar correctamente y cómo
      se satisface hoy esa dependencia?

  D6_storage_model:
    question: >
      ¿El contrato permite persistir query_context_metadata dentro del JSONB
      bundle existente o exige una nueva columna/estructura?

  D7_schema_change:
    question: >
      ¿Cerrar el gap requiere ALTER TABLE/migration o puede resolverse sin
      cambio de schema?

  D8_backward_compat:
    question: >
      ¿Qué ocurre con snapshots históricos que no contienen
      query_context_metadata?

  D9_replay:
    question: >
      ¿Persistir metadata cambia replay/list_versions/get_snapshot o solo hace
      el snapshot más completo?

  D10_integrity:
    question: >
      ¿La metadata debe participar en canonicalization/integrity hash?

  D11_security:
    question: >
      ¿query_context_metadata puede contener datos sensibles o inputs que no
      deban persistirse?

  D12_gates:
    question: >
      Determinar si el cierre requiere G2, G3, ambos o ninguno.

  D13_next_task:
    question: >
      Recomendar exactamente un NEXT_TASK mínimo y cerrado.

mandatory_findings:
  - "shape exacto actual de query_context_metadata"
  - "shape exacto persistido en eks.snapshots.bundle"
  - "punto exacto de divergencia"
  - "compatibilidad histórica"
  - "impacto en integrity/canonicalization"
  - "impacto en IES"
  - "gates necesarios"
  - "exactamente un siguiente task"

decision_rules:
  - "No asumir que hace falta columna nueva."
  - "Preferir reutilizar bundle JSONB si el contrato lo permite."
  - "No modificar D1-D9."
  - "No cambiar epistemología."
  - "No migrar snapshots históricos salvo necesidad contractual demostrada."
  - "No implementar en esta tarea."

acceptance_criteria:
  - "gap descrito con evidencia física"
  - "contrato exacto citado"
  - "punto de pérdida identificado"
  - "modelo de persistencia recomendado"
  - "compatibilidad histórica evaluada"
  - "gates definidos"
  - "exactamente un NEXT_TASK"
  - "sin implementación"
  - "git diff --check limpio"
  - "solo CURRENT_TASK y reporte modificados"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede definirse un slice mínimo para cerrar el gap.
  BLOCKED/STOPPED si el contrato es ambiguo o requiere decisión arquitectónica
  no autorizada.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001.md"

audit_result:
  outcome: DONE_PENDING_REVIEW
  gap: >
    query_context_metadata se crea en buildCycleInput, se pierde en
    eks.append_snapshot(bundle) y se reinyecta en memoria en
    createDirectorIaRealCycle.run para IES. eks.snapshots.bundle no la contiene.
  persistence_model: >
    No dentro del JSONB bundle (03 §8 / D7). Sibling de Snapshot: columna JSONB
    nullable en eks.snapshots o tabla EKS 1:1. No ALTER de tablas de producto.
    No backfill histórico.
  integrity: "No participa en digest D7 del Bundle."
  historical_compat: >
    Filas actuales sin metadata; IES sobre get_snapshot histórico fail-closed
    MISSING_QUERY_CONTEXT_METADATA. Aceptable sin migración.
  gates_for_next_task:
    G1: required
    G2: not_required_if_implementing_03_section_8
    G3: not_required
    G8: N/A
  next_task_proposed: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
  next_task_not_authorized: true