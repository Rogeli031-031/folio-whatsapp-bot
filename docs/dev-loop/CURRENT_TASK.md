task_id: "FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R2"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T17:34:54.0290798-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19"

integration_base_sha: "71aa5be0aca465671e1cd8220b13b29f15aed582"
starting_head_sha: "9925b877887dd899c33e58ee240b3c8220157ccf"
branch: "implementation/compras-excel-authoritative-import-088"
parent_task: "FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R1"

objective: "Evitar omitir filas con fecha ilegible durante una sustitución autoritativa y hacer atómica la migración 024."

decisions:
  D1_bad_date_in_target_month_blocks: true
  D2_migration_atomic_transaction: true

in_scope:
  - "lib/compras-dashboard.js"
  - "sql/024_compras_excel_import_088.sql"
  - "test/impl-compras-excel-authoritative-import-088.test.js"
  - "test/fix-compras-excel-authoritative-import-088-r1.test.js"
  - "test/fix-compras-excel-authoritative-import-088-r2.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-088-R2.json"
  - "docs/dev-loop/reports/FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R2.md"

out_of_scope:
  - "Cambiar contrato funcional de la 088"
  - "Frontend salvo que una prueba demuestre necesidad directa"
  - "Ejecutar migración productiva"
  - "DB writes productivos"
  - "Modificar arr.compras_hg"
  - "Clasificar legacy Acapulco"
  - "Borrar facturas"
  - "Cambiar fletes"
  - "PR"
  - "merge"
  - "deploy"

forbidden_actions:
  - "Ignorar BAD_DATE dentro de un mes objetivo"
  - "Inventar fechas"
  - "DDL productivo"
  - "Modificar G1-088 o G1-088-R1"
  - "Crear otra rama"
  - "PR, merge o deploy"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R2.md"
