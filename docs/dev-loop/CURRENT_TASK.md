task_id: "DIRECTOR-IA-013-R3"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis Rogelio Zaragoza alvarez"
authorized_at: "2026-10-26T12:14:38.1287071-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza alvarez 2026-10-26"

base_sha: "fe20da86a1717ae15c4659e084bf94d95361a8ec"
main_guard_sha: "677c201806bedc2dd08b1dcf85ce4e6b95e82474"
branch: "feature/director-ia-igf-diario-compras-hg-013"

objective: "Hacer DIRECTOR-IA-013 estrictamente read-only y recuperar paridad productiva del margen para día, semana y rango sin romper la paridad mensual de R2."

authorized_scope:
  strict_read_only: true
  desglose_read_only_loader: true
  margin_detail_live_loader: true
  day_margin_parity: true
  weekly_margin_parity: true
  range_margin_parity: true
  manual_margin_override_parity: true

protected:
  - "R2 acumulado mensual"
  - "R2 Forecast vivo"
  - "R2 Actual vs Forecast"
  - "R2 discrepancia R4"
  - "Compras R4/R5"
  - "migracion 025"
  - "DB productiva"

forbidden:
  - "CREATE desde Chat Director IA"
  - "INSERT"
  - "UPDATE"
  - "DELETE"
  - "schema migration"
  - "PR"
  - "merge"
  - "deploy"
  - "prorrateo inventado"
  - "formula paralela de margen"

result_report_path: "docs/dev-loop/reports/DIRECTOR-IA-013-R3.md"
