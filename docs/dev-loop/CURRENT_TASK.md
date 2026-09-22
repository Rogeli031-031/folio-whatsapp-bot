# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-PROVIDER-SEPARATORS-022"
title: "Compras — separadores visuales entre proveedores y bloques"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T12:40:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar separación visual uniforme entre cada bloque de proveedor en CONTROL DE COMPRAS y en VALOR DEL FLETE SEGÚN ORIGEN, manteniendo separadores grandes entre los bloques principales Compras/HG/Flete."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "ccbde39247369dfa39e79839dc56293bf95026e0"
branch: "implementation/compras-provider-separators-022"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "tests Compras 022"
  - "regresión 021/020/016"
  - "docs/dev-loop/reports/IMPL-COMPRAS-PROVIDER-SEPARATORS-022.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "API"
  - "DB/schema"
  - "persistencia"
  - "fórmulas"
  - "Excel"
  - "Director IA"
  - "ARR/IGF"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "solo UI/layout"
  - "no cambiar datos ni cálculos"
  - "flete sigue colapsable"
  - "HG siempre visible"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-PROVIDER-SEPARATORS-022.md"
```
