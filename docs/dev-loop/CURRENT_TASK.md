# CURRENT_TASK

```yaml
task_id: "IMPL-CLIENT-SALES-GRAPH-018"
title: "Delta Ingreso Cliente Forecast — gráfica histórica de ventas por cliente"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T21:45:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar al modal Delta Ingreso Cliente Forecast un botón GRAFICA que abra una vista histórica de ventas exclusivamente del cliente seleccionado, reutilizando la gráfica actual CASA/COMISIONISTA y sus mismas ventanas temporales."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "d3fa61b457ce730f256e2912f33af2f13d12b32e"
branch: "implementation/client-sales-graph-018"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/DeltaIngresoClienteForecastModal.tsx"
  - "componente actual de gráfica CASA/COMISIONISTA"
  - "helpers compartidos de gráfica/rangos/tendencia"
  - "frontend-dashboard/lib/api.ts si se requiere endpoint existente/nuevo de solo lectura"
  - "backend ARR de solo lectura si hace falta exponer historial por cliente"
  - "tests 018"
  - "docs/dev-loop/reports/IMPL-CLIENT-SALES-GRAPH-018.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "Director IA"
  - "cálculo Delta Ingreso"
  - "Ingreso A / Ingreso B"
  - "Compras/HG/Flete"
  - "schema DB"
  - "mutación de ARR"
  - "PR"
  - "merge"
  - "deploy"

validation:
  - "tests 018"
  - "tests de gráfica CASA/COMISIONISTA"
  - "tests Delta Ingreso Cliente Forecast"
  - "tests de comentarios/cliente afectados"
  - "cd frontend-dashboard && npm run build"
  - "NO commitear frontend-dashboard/.next"

result_report_path: "docs/dev-loop/reports/IMPL-CLIENT-SALES-GRAPH-018.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a implementation/client-sales-graph-018."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
