# CURRENT_TASK

```yaml
task_id: "IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023"
title: "Forecast Excel — desglose diario CASA / COMISIONISTA por planta"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T13:30:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Ampliar las hojas Provincia Venta Diaria y Provincia Comisiones del Excel generado por Descargar Excel (Forecast), agregando desde la columna J el desglose diario por planta de CASA y COMISIONISTA, sin modificar las columnas A-H actuales."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "f7ccaeb03b0b0ff08afebb57ccee8936cc3d106c"
branch: "implementation/arr-forecast-excel-daily-category-023"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/dashboard-arr-forecast.js"
  - "tests específicos 023"
  - "tests dashboard ARR forecast/export"
  - "docs/dev-loop/reports/IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "frontend"
  - "DB/schema"
  - "persistencia"
  - "Director IA"
  - "Compras/HG/Flete"
  - "cálculo IGF"
  - "ARR Plan UI"
  - "otras hojas del Excel salvo regresión"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "A-H de Provincia Venta Diaria permanecen intactas"
  - "A-H actuales de Provincia Comisiones permanecen intactas"
  - "columna I queda como separación"
  - "nuevo bloque inicia en J"
  - "CASA / COMISIONISTA usan fuentes ARR existentes"
  - "descuento $/kg siempre ponderado por kg, nunca promedio simple"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023.md"
```
