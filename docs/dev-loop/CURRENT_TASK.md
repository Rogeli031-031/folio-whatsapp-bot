task_id: "IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T16:33:33.0989162-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19"

base_sha: "71aa5be0aca465671e1cd8220b13b29f15aed582"
branch: "implementation/compras-excel-authoritative-import-088"

objective: "Importar Excel de detalle de compras por rango de fechas, conservando cada fila como compra independiente, sustituyendo de forma autoritativa el alcance correspondiente y sin modificar HG en kilos."

in_scope:
  - "lib/compras-dashboard.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/lib/compras-import.ts"
  - "sql/024_compras_excel_import_088.sql"
  - "test/impl-compras-excel-authoritative-import-088.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-088.json"
  - "docs/dev-loop/reports/IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088.md"
  - "docs/dev-loop/reports/IMPL-IGF-GRAFICA-EXCEL-WEEK-SELECTOR-087.md"

out_of_scope:
  - "Modificar valores HG EN KILOS"
  - "Pronóstico"
  - "IGF financiero salvo efecto natural de las compras"
  - "Cambiar fletes"
  - "Importar facturas PDF desde el Excel"
  - "Borrar facturas existentes"
  - "Ejecutar migración productiva"
  - "PR, merge y deploy"

forbidden_actions:
  - "Inventar origen de compras legacy de Acapulco"
  - "Agregar/comprimir filas del Excel antes de guardarlas"
  - "Borrar HIDROGAS al importar URIBE o viceversa"
  - "Eliminar compras con documentos PDF"
  - "Modificar arr.compras_hg"
  - "Ejecutar SQL en producción"
  - "PR, merge o deploy"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088.md"
