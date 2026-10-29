task_id: "IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis Rogelio Zaragoza Alvarez"
authorized_at: "2026-10-29T12:52:33.3628518-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-10-29"

base_sha: "f9cf1e15d0ce47f7b70769c29ba59253d2dbfdee"
branch: "feature/compras-participacion-tuxpan-tepeji-089"

objective: "Agregar a CONTROL DE COMPRAS dos columnas resumen TUXPAN y TEPEJI con porcentaje grande y kilos debajo para cada semana y TOTAL MES."

rules:
  tuxpan: "PEMEX TUXPAN + TOMZA TUXPAN"
  tepeji: "TOMZA TEPEJI"
  denominator: "COMPRA KG consolidada física del mismo periodo"

protected:
  - "Compras R4/R5"
  - "conciliacion Excel"
  - "effective kg"
  - "importes"
  - "costos"
  - "fletes"
  - "HG"
  - "Nota de Cargo"
  - "backend y DB"

forbidden:
  - "DB writes"
  - "migration"
  - "backend change unless objectively indispensable"
  - "PR"
  - "merge"
  - "deploy"

result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089.md"
