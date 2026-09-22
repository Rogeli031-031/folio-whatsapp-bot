# CURRENT_TASK

```yaml
task_id: "IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024"
title: "Forecast Excel — filtro por planta seleccionada, CONTROL DE COMPRAS y venta con 3 decimales"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T14:28:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Hacer que Descargar Excel (Forecast) use la planta seleccionada en IGF Forecast para filtrar todo el workbook a esa planta, agregar como tercera hoja CONTROL DE COMPRAS reutilizando exactamente el generador del módulo Compras y mostrar la venta de Provincia Venta Diaria con 3 decimales."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "ae321d5e98daff1b03f7b843630e76f8db43b55b"
branch: "implementation/forecast-excel-plant-compras-024"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "server.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/compras-excel.js solo para reutilización/extracción mínima si es necesario"
  - "lib/compras-dashboard.js solo lectura/reutilización necesaria"
  - "tests 024"
  - "regresión 023/Compras Excel"
  - "docs/dev-loop/reports/IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "mutaciones"
  - "cambiar fórmulas de Compras"
  - "Director IA"
  - "cambiar cálculo físico ARR/IGF"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "usar selector existente plantaFilter; NO crear segundo selector"
  - "una descarga = una planta"
  - "Todas no es planta válida para exportar"
  - "no permitir cross-plant leakage en el workbook"
  - "CONTROL DE COMPRAS debe reutilizar buildComprasWorkbook"
  - "no reconstruir manualmente la hoja de Compras"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024.md"
```
