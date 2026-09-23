# CURRENT_TASK

```yaml
task_id: "IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029"
title: "IGFDiario — arrastrar último PRECIO válido a días sin dato"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-23T15:47:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "En la hoja PRECIO del Excel IGFDiario, rellenar cada día sin precio propio con el último PRECIO válido anterior del mismo mes. No recalcular ni persistir datos; solo aplicar carry-forward en la generación del Excel."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "fe1da1f81af672dc3d057ddda2d8423b3a4e572f"
branch: "implementation/igf-diario-precio-carry-forward-029"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/dashboard-arr-forecast.js"
  - "tests 029"
  - "regresión 027/028"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "arr.precio_diario"
  - "arr.precio_detalle"
  - "VBA"
  - "recalcular PRECIO"
  - "frontend"
  - "CONTROL DE COMPRAS"
  - "Pronostico"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "PRECIO fuente = arr.precio_diario"
  - "no recalcular formula"
  - "no persistir carry-forward"
  - "conservar valor numérico y precisión"
  - "hoja PRECIO sigue tercera"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029.md"
```
