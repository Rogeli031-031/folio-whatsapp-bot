# CURRENT_TASK

```yaml
task_id: "IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025"
title: "IGF Diario — botón junto a Planta, conservar tabla principal y quitar Tot Provincia en export por planta"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T21:31:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Mover y renombrar el botón de descarga del Forecast junto al selector Planta como IGFDiario, mantener visible la tabla principal IGF Forecast al seleccionar una planta mostrando únicamente esa planta, y eliminar Tot Provincia de la columna C en Provincia Venta Diaria cuando el Excel está filtrado a una sola planta."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "49db0dadb9c419edf1519652e850808ead8c6692"
branch: "implementation/igf-diario-ui-scoped-view-025"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "lib/dashboard-arr-forecast.js"
  - "tests 025"
  - "regresión 024/023"
  - "frontend build"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "persistencia"
  - "cálculos financieros"
  - "Compras renderer"
  - "Director IA"
  - "endpoint nuevo"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "reutilizar selector Planta existente"
  - "reutilizar descarga plant-scoped implementada en 024"
  - "no crear segundo selector"
  - "no crear segundo endpoint"
  - "CONTROL DE COMPRAS sigue siendo tercera hoja"
  - "CASA/COMISIONISTA mantienen su contrato de datos"
  - "categorías del Excel siguen comenzando en J"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025.md"
```
