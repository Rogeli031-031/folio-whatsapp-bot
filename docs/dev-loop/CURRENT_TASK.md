# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026"
title: "Compras — arrastre del último COSTO HG válido en días sin compras"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-23T10:07:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Hacer que el COSTO diario del bloque HG nunca caiga a cero o vacío por falta de compras: en un día sin compras debe usar el último COSTO HG válido anterior. El mismo costo efectivo debe usarse para calcular el IMPORTE HG diario y, por suma de días, los importes semanales y mensuales. Debe funcionar igual en UI, Excel de Compras y CONTROL DE COMPRAS embebido en IGFDiario."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "a18929aaedc3178dcec3b1cca557553d2b40d5a5"
branch: "implementation/compras-hg-cost-carry-forward-026"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/compras-dashboard.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "lib/compras-excel.js"
  - "tests 026"
  - "regresión Compras 014/016/020/021/022"
  - "regresión Forecast CONTROL DE COMPRAS"
  - "frontend build"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "persistir costo"
  - "cambiar captura HG"
  - "cambiar tarifas de flete"
  - "cambiar costo de compras por proveedor"
  - "cambiar consolidado de compras"
  - "cambiar COSTO semanal/mensual agregado"
  - "Director IA"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "COSTO HG diario base = costo consolidado compra + tarifa consolidada flete"
  - "IMPORTE HG diario = COSTO HG efectivo × HG kilos × -1"
  - "importe semanal/mensual = suma de importes diarios"
  - "no persistir valores derivados"
  - "UI y Excel deben usar la misma semántica"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026.md"
```
