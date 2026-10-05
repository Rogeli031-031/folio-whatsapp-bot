task_id: "G4-PREP-IGF-DIARIO-REBALANCEO-GASTOS-064-R1"

title: "Preparar PR del rebalanceo diario de gastos IGF Diario 064-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de
  IMPL-IGF-DIARIO-REBALANCEO-DIARIO-GASTOS-064-R1
  hacia main. No modificar producto ni tests. El merge a main queda
  reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "a3e546fccdf7e89b5e4c3b59b148079587106505"

branch: "implementation/igf-diario-rebalanceo-diario-gastos-064-r1"

product_sha: "631d8cae393a509b378cc3a6e06a3165731c1cd4"

validated_source_sha: "0a94785e02745d31f39d76f99ec5e2085d74109f"

target_branch: "main"

validated_scope:
  - "Distribución diaria editable para los siete conceptos de 064."
  - "Aplica desde octubre 2026."
  - "Septiembre 2026 y anteriores permanecen legacy."
  - "El monto mensual permanece fijo al editar días."
  - "Solo se persisten overrides explícitos."
  - "0 es override válido."
  - "null elimina override y restaura promedio."
  - "Día inhábil no es editable."
  - "Los cálculos operan en centavos."
  - "Un override futuro no modifica automáticos anteriores."
  - "Un día manual conserva exactamente su importe."
  - "Los días automáticos posteriores absorben la diferencia."
  - "El último automático absorbe residuo de redondeo."
  - "La suma final mensual cierra exactamente al monto mensual."
  - "No se permiten automáticos negativos."
  - "Schedules imposibles se rechazan."
  - "Cambio de monto mensual conserva overrides compatibles."
  - "Cambio mensual incompatible se rechaza antes de escribir."
  - "Excel diario usa importe asignado / Venta KG."
  - "Semana usa suma monetaria asignada / Venta KG semanal."
  - "TOTAL MES sigue usando monto mensual / Venta KG mensual."
  - "Provincia semanal usa las celdas reales de cada planta."
  - "064 sigue intacto."
  - "063-R1 sigue intacto."
  - "Forecast sigue intacto."

schema:
  table: "arr.igf_diario_gastos_distribucion_manual"
  primary_key:
    - "plant_code"
    - "year"
    - "month"
    - "concepto"
    - "fecha"
  columns:
    - "importe NUMERIC(18,2) NOT NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"
  safety:
    - "CREATE TABLE IF NOT EXISTS."
    - "Solo almacena overrides."
    - "No almacena días automáticos."
    - "Sin migración."
    - "Sin datos iniciales."
    - "No modifica esquema de arr.igf_diario_gastos_desglose."

validated_algorithm:
  monthly_amount: "Permanece fijo."
  sequential: true
  cents: true
  previous_days_frozen: true
  manual_days_frozen: true
  later_auto_days_rebalanced: true
  exact_month_close: true
  negative_auto_forbidden: true

validated_fixture:
  monthly_amount: 953777.33
  business_days: 27
  initial_average: 35325.09
  first_three_manual_each: 37412.69
  manual_total: 112238.07
  remaining_amount: 841539.26
  remaining_days: 24
  remaining_average: 35064.14
  final_sum: 953777.33

validated_api:
  get: "GET /api/dashboard/igf-diario-gastos-distribucion"
  patch: "PATCH /api/dashboard/igf-diario-gastos-distribucion"
  patch_semantics:
    numeric: "Fija importe diario."
    zero: "Valor válido."
    null: "Elimina override y restaura promedio."

validated_excel:
  daily: "importe asignado del schedule / B"
  weekly: "suma de importes monetarios de la semana / B semanal"
  monthly: "monto mensual / B TOTAL MES"
  holidays: "0"
  b_zero_daily: >
    Celda $/kg blank, pero el importe monetario sigue participando
    en el cierre semanal.

validated_tests:
  - "064-R1 PASS 11/11."
  - "064 PASS 21/21."
  - "063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036-041 PASS 76/76."
  - "frontend npm run build terminó en 0."
  - "node --check server.js PASS."
  - "git diff --check limpio."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-rebalanceo-diario-gastos-064-r1"
  title: "IMPL 064-R1: rebalanceo diario de gastos IGF Diario"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

production_validation_required_after_deploy:
  - "Abrir Distribución diaria desde uno de los siete conceptos."
  - "Confirmar monto mensual y promedio inicial."
  - "Modificar un día hábil."
  - "Confirmar que ese día queda fijo."
  - "Confirmar que días anteriores no cambian."
  - "Confirmar que días posteriores se rebalancean."
  - "Confirmar Restaurar promedio."
  - "Confirmar rechazo de un schedule imposible."
  - "Descargar Excel octubre."
  - "Confirmar importe diario asignado / Venta KG."
  - "Confirmar cierre semanal con suma monetaria real."
  - "Confirmar TOTAL MES sin cambio."
  - "Confirmar descarga Todas y Provincia."
  - "Confirmar septiembre legacy."
  - "Confirmar Forecast intacto."

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA y delivery SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar DB productiva."
  - "Insertar overrides."
  - "Merge a main."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

acceptance_criteria:
  - "origin/main sigue exactamente en a3e546fccdf7e89b5e4c3b59b148079587106505."
  - "No existen cambios nuevos de producto ni tests."
  - "PR base main / head implementation/igf-diario-rebalanceo-diario-gastos-064-r1."
  - "PR queda abierto y mergeable."
  - "No merge."
  - "No deploy."
  - "Reporte contiene número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-REBALANCEO-GASTOS-064-R1.md"