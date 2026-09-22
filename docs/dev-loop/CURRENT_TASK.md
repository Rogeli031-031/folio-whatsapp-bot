# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-HG-COSTO-IMPORTE-020"
title: "Compras — corregir layout, completar consolidado flete y agregar COSTO / IMPORTE a HG"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-22T10:19:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Corregir el layout de CONTROL DE COMPRAS eliminando columnas visuales sobrantes, completar los encabezados del CONSOLIDADO de VALOR DEL FLETE SEGÚN ORIGEN y transformar HG en un bloque COSTO | HG EN KILOS | IMPORTE, donde HG sigue siendo captura manual y COSTO/IMPORTE se derivan automáticamente."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "79154e9885303622a0c9a6712029f67759e10e2d"
branch: "implementation/compras-hg-costo-importe-020"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts si hace falta"
  - "lib/compras-dashboard.js si hace falta helper derivado"
  - "lib/compras-excel.js"
  - "tests Compras 020"
  - "regresión 013/014/016"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-COSTO-IMPORTE-020.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "persistencia nueva"
  - "arr.compras_hg salvo reutilizar hg_kilos existente"
  - "tarifas de flete existentes"
  - "compras existentes"
  - "Director IA"
  - "gráficas"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "HG EN KILOS sigue siendo el único dato manual del bloque HG"
  - "COSTO e IMPORTE HG son derivados"
  - "no duplicar datos derivados en DB"
  - "tarifa ausente != tarifa cero"
  - "no inventar costo cuando falta una de sus fuentes"

validation:
  - "tests 020"
  - "tests 013"
  - "tests 014"
  - "tests 016"
  - "cd frontend-dashboard && npm run build"
  - "NO commitear frontend-dashboard/.next"

result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-HG-COSTO-IMPORTE-020.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a implementation/compras-hg-costo-importe-020."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
