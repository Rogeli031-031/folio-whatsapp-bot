task_id: "FIX-COMPRAS-NOTA-CARGO-VISIBLE-088-R3"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T18:16:10.4813798-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-10-19"

base_sha: "7779d1304624c6977999e1b024e795d1e885e565"
branch: "fix/compras-nota-cargo-visible-088-r3"
parent_task: "IMPL-COMPRAS-EXCEL-AUTHORITATIVE-IMPORT-088"

objective: "Mostrar NOTA DE CARGO como columna financiera fija de solo importe en Control de Compras y en su Excel, sin tratarla como proveedor físico."

decisions:
  D1_fixed_column: true
  D2_only_importe: true
  D3_consolidated_importe_not_kg: true
  D4_no_flete_no_projection: true
  D5_always_visible: true
  D6_excel_parity: true

in_scope:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "lib/compras-excel.js"
  - "lib/compras-dashboard.js solo si un helper puro es necesario"
  - "test/fix-compras-nota-cargo-visible-088-r3.test.js"
  - "tests de regresión directamente afectados"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-088-R3.json"
  - "docs/dev-loop/reports/FIX-COMPRAS-NOTA-CARGO-VISIBLE-088-R3.md"

out_of_scope:
  - "Modificar el importador 088 salvo adaptación estrictamente necesaria de presentación"
  - "Captura manual de NOTA DE CARGO"
  - "Nueva migración SQL"
  - "Modificar datos productivos"
  - "Modificar HG"
  - "Modificar fletes"
  - "PR"
  - "merge"
  - "deploy"

forbidden_actions:
  - "Tratar NOTA DE CARGO como compra física"
  - "Asignarle kilos"
  - "Asignarle costo/kg"
  - "Asignarle tarifa o flete"
  - "Proyectar NOTA DE CARGO"
  - "Duplicar NOTA DE CARGO como triple y columna fija"
  - "DB writes productivos"
  - "PR, merge o deploy"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-NOTA-CARGO-VISIBLE-088-R3.md"
