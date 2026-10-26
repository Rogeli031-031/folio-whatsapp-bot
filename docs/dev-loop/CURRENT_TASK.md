task_id: "DIRECTOR-IA-013-R1"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis rogelio Zaragoza alvarez"
authorized_at: "2026-10-26T10:10:44.7583613-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-26"

base_sha: "9a6c9d36eff8ca3bb2a2ca12b6a0b7ad81564de2"
main_guard_sha: "677c201806bedc2dd08b1dcf85ce4e6b95e82474"
branch: "feature/director-ia-igf-diario-compras-hg-013"

objective: "Conectar DIRECTOR-IA-013 a fuentes autoritativas server-side y cerrar cobertura real de fechas, proveedores, periodos, NLU y regresiones antes de G4."

authorized_scope:
  server_side_snapshot_loader: true
  endpoint_e2e: true
  explicit_day_and_range_parser: true
  provider_filtering: true
  actual_vs_forecast_metric_parity: true
  hg_both_period_filter: true
  period_scoped_diagnosis: true
  purchase_clarification_fix: true
  natural_40_variants: true
  base_vs_head_regression_proof: true

protected:
  - "Compras R4/R5"
  - "migracion 025"
  - "IGF Diario calculations"
  - "Forecast semantics"
  - "client purchase semantics"
  - "DB productiva"

forbidden:
  - "DB writes productivos"
  - "schema migration"
  - "PR"
  - "merge"
  - "deploy"
  - "client-side authoritative snapshot"
  - "hardcodes por planta"
  - "silenciar regresiones"

result_report_path: "docs/dev-loop/reports/DIRECTOR-IA-013-R1.md"
