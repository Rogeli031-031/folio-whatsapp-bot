task_id: "FIX-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4-R2"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis rogelio Zaragoza alvarez"
authorized_at: "2026-10-20T13:53:53.6627200-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-20"

parent_task: "IMPL-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4"

main_base_sha: "07aca321a24b354e249fed28437fd8a77e994496"
base_sha: "b8428d72a0e27bd28a4bca51501d1de7e7b75194"
branch: "implementation/compras-excel-reconcile-effective-088-r4"

objective: "Usar valor efectivo en TOTAL DEL DIA del detalle y calcular discrepancia visual actual contra captura vigente, sin modificar la historia de importacion."

authorized_findings:
  modal_total_uses_effective: true
  modal_cost_uses_effective: true
  live_discrepancy_from_current_capture: true
  excel_only_never_false_yellow: true
  import_history_immutable: true

out_of_scope:
  - "Cambiar matching"
  - "Cambiar pairing 1:1"
  - "Cambiar provenance"
  - "Cambiar aliases"
  - "Cambiar migracion 025"
  - "Ejecutar migracion 025"
  - "Modificar HG kilos"
  - "DB writes productivos"
  - "PR"
  - "merge"
  - "deploy"

forbidden:
  - "Reescribir lineas historicas de importacion al editar una compra"
  - "Usar captura para calculos si existe effective"
  - "Pintar EXCEL_ONLY amarillo por redondeo compatibility"
  - "DB writes productivos"
  - "PR"
  - "merge"
  - "deploy"

result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4-R2.md"
