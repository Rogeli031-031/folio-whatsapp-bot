task_id: "FIX-COMPRAS-CROSSPLANT-RECONCILE-NORMALIZATION-088-R5"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luir Rogelio Zaragoza alvarez"
authorized_at: "2026-10-23T09:11:35.8318363-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luir Rogelio Zaragoza alvarez 2026-10-23"

base_sha: "f6d08998d1b1d0689d92b9bf8e62faee38849eb4"
branch: "fix/compras-crossplant-reconcile-normalization-088-r5"

objective: "Corregir conciliacion Excel de Morelos, Queretaro, San Luis y bootstrap seguro de Acapulco, preservando Puebla y Tehuacan."

authorized_scope:
  morelos_exact_provider_repair: true
  queretaro_tepeji_tomza_alias: true
  san_luis_potosi_a1_alias: true
  san_luis_tepeji_tomza_alias: true
  nota_cargo_missing_date_previous_physical_row: true
  acapulco_legacy_source_bootstrap: true
  acapulco_date_sheet_mismatch_block: true
  duplicate_block_message_ui_fix: true
  stale_error_banner_ui_fix: true

protected:
  - "Puebla"
  - "Tehuacan"
  - "HG kilos"
  - "R4 effective-value semantics"
  - "facturas y IDs existentes"

forbidden:
  - "DB writes productivos"
  - "migraciones productivas"
  - "PR"
  - "merge"
  - "deploy"
  - "deduplicar silenciosamente Excel"
  - "fuzzy matching"
  - "borrar facturas"
  - "cambiar Puebla o Tehuacan"

result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-CROSSPLANT-RECONCILE-NORMALIZATION-088-R5.md"
