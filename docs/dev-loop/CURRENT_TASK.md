# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-DAILY-AVERAGE-FILL-030"
title: "CONTROL DE COMPRAS — rellenar días sin dato con promedio histórico y recalcular derivados"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-23T16:30:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "En la hoja CONTROL DE COMPRAS, para cada fila de fecha sin información real, rellenar las columnas base B,D,F,H,J,L,S,T con el promedio de los días anteriores del mismo mes que sí tengan valor válido en esa misma columna; pintar esas celdas estimadas en azul; recalcular las columnas derivadas usando las fórmulas existentes; y mantener cierres semanales/mensuales como agregados de los días."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "114b662846d77225bc0515231754bfb7d38dbda6"
branch: "implementation/compras-daily-average-fill-030"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/compras-excel.js"
  - "tests 030"
  - "regresión Compras 020/021/022/026"
  - "regresión IGFDiario CONTROL DE COMPRAS 024/027/028/029"
  - "docs/dev-loop/reports/IMPL-COMPRAS-DAILY-AVERAGE-FILL-030.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "persistir estimaciones"
  - "UI web /compras"
  - "VBA"
  - "Pronostico"
  - "PRECIO"
  - "Director IA"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "CONTROL DE COMPRAS usa appendComprasWorksheet"
  - "mismo renderer para Excel Compras e IGFDiario"
  - "estimaciones no se persisten"
  - "filas Semana siguen agregadas"
  - "TOTAL MES sigue agregado"
  - "fórmulas existentes deben reutilizarse"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-DAILY-AVERAGE-FILL-030.md"
```
