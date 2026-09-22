# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-FLETE-COLLAPSE-021"
title: "Compras — separadores estándar y VALOR DEL FLETE desplegable"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T12:24:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "En CONTROL DE COMPRAS, reemplazar los gaps finos alrededor de HG por columnas separadoras vacías de ancho estándar y hacer que todo el bloque VALOR DEL FLETE SEGÚN ORIGEN pueda ocultarse o mostrarse, iniciando oculto."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "d3c2e13f0e62446afd7354331b39b8e7cb793fbc"
branch: "implementation/compras-flete-collapse-021"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "tests Compras 021"
  - "regresión 020/016"
  - "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-COLLAPSE-021.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "API"
  - "persistencia HG"
  - "persistencia tarifas"
  - "fórmulas COSTO/HG/IMPORTE"
  - "Excel"
  - "Director IA"
  - "ARR / IGF"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "no tocar cálculos de Compras/HG/Flete"
  - "no ocultar HG"
  - "no ocultar bloque principal de compras"
  - "solo UI/layout"
  - "flete inicia oculto"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-COLLAPSE-021.md"
```
