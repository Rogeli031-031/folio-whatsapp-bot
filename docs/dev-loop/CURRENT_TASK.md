# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-EKS-INDEX-RUNTIME-SYNC-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21.
  G1 autorizado. G2 autorizado exclusivamente para sincronizar el estado
  documental de implementación EKS en DIRECTOR_IA_ARCHITECTURE_INDEX.md y
  03-EXECUTIVE-KNOWLEDGE-STORE.md, sin redefinir D1-D9 ni modificar runtime,
  código o SQL.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED_LIMITED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la autoridad documental de EKS con la realidad
  física ya integrada y validada en producción. El índice arquitectónico y el
  contrato 03 deben dejar de afirmar que EKS no tiene runtime o que su
  implementación está pendiente, sin declarar COMPLETE constitucional,
  redefinir D1-D9 ni ocultar deuda residual.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-INDEX-RUNTIME-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"

evidence_in_force:
  runtime:
    - "lib/director-ia-eks.js existe"
    - "createEksRuntime está integrado"
    - "EKS participa en el ciclo real ARR -> OP -> EB -> EKS -> IES -> RE -> CP"
  schema:
    - "sql/015_director_ia_eks.sql existe en main"
    - "scripts/apply-director-ia-eks-schema.js existe"
    - "eks.snapshots existe en PostgreSQL productiva"
    - "eks.trace_locks existe en PostgreSQL productiva"
  production:
    - "ciclo autenticado productivo completó HTTP 200"
    - "acquisition_status=ACQUIRED_OK"
    - "ies_status=VALIDATED"
    - "reasoning_status=ABSTAIN"
    - "trace_id no nulo"
  residual_debt:
    - >
      query_context_metadata no está persistido como parte del snapshot PG EKS;
      no declarar por ello cumplimiento constitucional total de todos los
      requisitos del contrato.

required_changes:
  architecture_index:
    - "Eliminar o corregir afirmaciones EKS de 'runtime pendiente' / 'ninguno'."
    - "Reflejar que existe runtime mínimo integrado y validado."
    - "No generalizar el cambio a OP/EB/IES/RE/CP fuera de este scope."
  contract_03:
    - "Actualizar únicamente estado de implementación/runtime EKS."
    - "Preservar D1-D9."
    - "Preservar deuda residual relevante."
    - "No declarar COMPLETE constitucional si el contrato exige más de lo implementado."

out_of_scope:
  - "modificar lib/"
  - "modificar server.js"
  - "modificar frontend"
  - "modificar sql/"
  - "modificar scripts/"
  - "modificar PostgreSQL"
  - "modificar D1-D9"
  - "modificar 02/03A/04/05/06"
  - "modificar DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "crear contrato nuevo"
  - "hacer smoke"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

acceptance_criteria:
  - "El índice ya no afirma que EKS carece de runtime."
  - "03 ya no afirma Implementación PENDIENTE cuando existe runtime físico."
  - "No se altera D1-D9."
  - "No se declara EKS constitucionalmente COMPLETE sin soporte."
  - "La deuda query_context_metadata queda visible si aplica."
  - "No cambia código, SQL, runtime ni producción."
  - "G2 se usa solo para los dos documentos autorizados."
  - "git diff --check limpio."
  - "Solo CURRENT_TASK, reporte, índice y 03 pueden cambiar."

expected_terminal_state: >
  DONE_PENDING_REVIEW si la documentación queda alineada con la realidad física
  de EKS sin ampliar contratos ni ocultar deuda residual.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-INDEX-RUNTIME-SYNC-001.md"