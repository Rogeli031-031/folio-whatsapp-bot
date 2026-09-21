# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-FLETE-TARIFA-016"
title: "Compras — TARIFA de flete por origen y tabla VALOR DEL FLETE SEGÚN ORIGEN"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T15:00:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar una TARIFA de flete editable por origen/proveedor y mes, persistida por planta, y una tabla automática VALOR DEL FLETE SEGÚN ORIGEN a la derecha de CONTROL DE COMPRAS, sin modificar la lógica actual de compras ni HG."

implementation: true
code_changes: true

schema_changes: true
data_mutation: true

base_sha: "872bf076ac4f2d9f2119e2904d951062709ea725"
branch: "implementation/compras-flete-tarifa-016"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "persistencia de tarifa de flete"
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "sql/ nueva migración"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "frontend-dashboard/lib/api.ts"
  - "tests específicos 016"
  - "test/compras-dashboard-013.test.js solo si requiere regresión"
  - "test/compras-hg-kilos-014.test.js solo si requiere regresión"
  - "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-TARIFA-016.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "docs/director-ia/"
  - "COMPRA KG existente"
  - "COSTO KG existente"
  - "IMPORTE de compra existente"
  - "CONSOLIDADO de compras existente"
  - "HG EN KILOS"
  - "facturas"
  - "proveedores salvo leerlos para relacionar tarifa"
  - "main"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "dev-loop vigente"
  - "no modificar cálculos existentes de compras"
  - "no confundir TARIFA de flete con COSTO KG de compra"
  - "los valores derivados no se persisten si se pueden recalcular"

validation:
  - "node --test test/compras-flete-tarifa-016.test.js"
  - "node --test test/compras-dashboard-013.test.js"
  - "node --test test/compras-hg-kilos-014.test.js"
  - "cd frontend-dashboard && npm run build"
  - "NO commitear frontend-dashboard/.next"

result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-TARIFA-016.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a implementation/compras-flete-tarifa-016."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
