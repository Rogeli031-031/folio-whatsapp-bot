task_id: "DIRECTOR-IA-013-R2"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis Rogelio Zaragoza alvarez"
authorized_at: "2026-10-26T11:50:52.9905812-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza alvarez 2026-10-26"

base_sha: "e79f29b0364a3a75995e516f821a598284b1e60a"
main_guard_sha: "677c201806bedc2dd08b1dcf85ce4e6b95e82474"
branch: "feature/director-ia-igf-diario-compras-hg-013"

objective: "Cerrar paridad real de DIRECTOR-IA-013 con IGF Diario Acumulado productivo, conectar Forecast vivo y reutilizar la discrepancia efectiva R4 para Compras."

authorized_scope:
  igf_acumulado_live_parity: true
  forecast_live_loader: true
  actual_vs_forecast_live: true
  r4_current_discrepant_parity: true
  source_audit_truth: true
  endpoint_parity_tests: true

protected:
  - "Compras R4/R5"
  - "migracion 025"
  - "IGF Diario productivo"
  - "Forecast productivo"
  - "client purchase semantics"
  - "DB productiva"

forbidden:
  - "DB writes productivos"
  - "schema migration"
  - "PR"
  - "merge"
  - "deploy"
  - "segunda formula paralela de IGF Diario"
  - "forecast de prueba en produccion"
  - "hardcodes por planta"

result_report_path: "docs/dev-loop/reports/DIRECTOR-IA-013-R2.md"
