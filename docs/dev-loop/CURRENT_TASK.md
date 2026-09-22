# CURRENT_TASK

```yaml
task_id: "IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019"
title: "Gráfica cliente — superponer descuento $/kg sobre venta"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T22:10:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar a la gráfica histórica individual del cliente una segunda serie de Descuento ($/kg), usando exactamente las mismas fechas y ventanas que la venta, con escala independiente y mostrando el descuento en magnitud positiva únicamente para esta gráfica."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "cdda80f88bb0074d688a024adda42683b9bf6d89"
branch: "implementation/client-sales-discount-graph-019"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "frontend-dashboard/lib/api.ts solo si tipos requieren ajuste"
  - "lib/commercial-trend-engine.js solo si requiere exponer dato ya existente"
  - "tests 019"
  - "docs/dev-loop/reports/IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "Delta Ingreso / Ingreso A / Ingreso B"
  - "tabla mensual Venta y descuento por mes"
  - "signo físico de descuentos"
  - "ARR data"
  - "schema DB"
  - "Director IA"
  - "Compras/HG/Flete"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "reutilizar ArrVentaGraficaModal"
  - "no crear un segundo motor gráfico"
  - "no modificar datos físicos"
  - "ausencia de descuento != descuento cero"

validation:
  - "tests 019"
  - "tests 018"
  - "tests motor gráfico existente"
  - "cd frontend-dashboard && npm run build"
  - "NO commitear frontend-dashboard/.next"

result_report_path: "docs/dev-loop/reports/IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a implementation/client-sales-discount-graph-019."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
