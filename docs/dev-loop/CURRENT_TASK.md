task_id: "IMPL-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis rogelio Zaragoza alvarez"
authorized_at: "2026-10-20T11:54:34.2458496-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-10-20"

base_sha: "07aca321a24b354e249fed28437fd8a77e994496"
branch: "implementation/compras-excel-reconcile-effective-088-r4"

objective: "Conservar captura/factura y aplicar el valor exacto del Excel como valor efectivo de calculo, con reconciliacion uno-a-uno y fecha amarilla ante discrepancia."

decisions:
  preserve_matching_purchase_and_documents: true
  excel_is_effective_value: true
  exact_match_key_date_provider_kg: true
  yellow_date_on_discrepancy: true
  preserve_excel_precision: true
  unmatched_purchase_with_document_blocks: true
  unmatched_purchase_without_document_may_delete: true
  exact_origin_aliases_only: true
  hg_kilos_immutable: true

forbidden:
  - "DB writes productivos"
  - "PR"
  - "merge"
  - "deploy"
  - "borrar factura de compra reconciliada"
  - "sumar captura + Excel"
  - "fuzzy matching"
  - "modificar HG kilos"

result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-EXCEL-RECONCILE-EFFECTIVE-088-R4.md"
