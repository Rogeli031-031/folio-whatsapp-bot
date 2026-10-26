task_id: "DIRECTOR-IA-013"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis rogelio Zaragoza alvarez"
authorized_at: "2026-10-26T08:37:14.2141374-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-26"

base_sha: "677c201806bedc2dd08b1dcf85ce4e6b95e82474"
branch: "feature/director-ia-igf-diario-compras-hg-013"

objective: "Convertir Chat Director IA en interfaz conversacional paritaria de IGF Diario Acumulado y CONTROL DE COMPRAS, con routing actual/forecast, Compras Gas LP, HG fisico, gastos y margen diarios, comparaciones y lenguaje natural robusto."

truth_precedence:
  financial_actual_from: "2026-10"
  financial_actual_source: "IGF_DIARIO_ACUMULADO"
  pre_contract_source: "FORECAST_HISTORICAL_EXISTING"
  explicit_forecast_source: "IGF_FORECAST"
  gas_purchases_source: "CONTROL_DE_COMPRAS"
  hg_physical_source: "arr.compras_hg"

protected:
  - "Compras R4/R5"
  - "migracion 025"
  - "HG kilos productivo"
  - "IGF Diario calculations"
  - "Forecast existing semantics"
  - "client-purchase Director IA semantics"

forbidden:
  - "DB writes productivos"
  - "schema migration"
  - "PR"
  - "merge"
  - "deploy"
  - "duplicar formulas del dashboard con formulas aproximadas"
  - "mostrar codigos internos al usuario"

result_report_path: "docs/dev-loop/reports/DIRECTOR-IA-013.md"
