task_id: "FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R1"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T17:19:02.2471813-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19"

integration_base_sha: "71aa5be0aca465671e1cd8220b13b29f15aed582"
starting_head_sha: "1f5e1a507872c6ccec4087c1bd708d4fdbca66e4"
branch: "implementation/compras-excel-authoritative-import-088"
parent_task: "IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088"

objective: "Corregir soporte de meses vacíos autoritativos y asegurar rollout seguro antes de aplicar la migración 024."

decisions:
  D1_empty_month_authoritative: true
  D2_validate_workbook_year: true
  D3_targeted_kg_constraint_migration: true
  D4_safe_pre_migration_rollout: true
  D5_schema_not_ready_503: true
  D6_preserve_088_business_contract: true

in_scope:
  - "lib/compras-dashboard.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/lib/compras-import.ts"
  - "sql/024_compras_excel_import_088.sql"
  - "test/impl-compras-excel-authoritative-import-088.test.js"
  - "test/fix-compras-excel-authoritative-import-088-r1.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-088-R1.json"
  - "docs/dev-loop/reports/FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R1.md"

out_of_scope:
  - "Ejecutar migración productiva"
  - "Escribir DB productiva"
  - "Modificar arr.compras_hg"
  - "Clasificar automáticamente compras legacy de Acapulco"
  - "Borrar facturas"
  - "Cambiar fletes"
  - "PR"
  - "merge"
  - "deploy"

forbidden_actions:
  - "DDL productivo"
  - "DB writes productivos"
  - "S3 deletes"
  - "Modificar G1-088 original"
  - "Crear otra rama"
  - "PR, merge o deploy"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088-R1.md"
