# CURRENT_TASK

```yaml
task_id: "IMPL-IGF-DIARIO-PRECIO-SHEET-027"
title: "IGFDiario — agregar hoja PRECIO desde arr.precio_diario"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-23T12:00:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar al Excel descargado desde IGFDiario una nueva tercera hoja llamada PRECIO, alimentada desde arr.precio_diario para la planta, año y mes seleccionados. Debe mostrar Fecha y PRECIO diario ya calculado en PostgreSQL. CONTROL DE COMPRAS pasa a ser la cuarta hoja."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "187a4b643300f695273205d1250c5bae318dbf5b"
branch: "implementation/igf-diario-precio-sheet-027"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "server.js"
  - "lib/dashboard-arr-forecast.js"
  - "tests 027"
  - "regresión 023/024/025"
  - "regresión CONTROL DE COMPRAS"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-SHEET-027.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "VBA"
  - "recalcular PRECIO"
  - "modificar arr.precio_detalle"
  - "modificar arr.precio_diario"
  - "frontend"
  - "Compras UI"
  - "Director IA"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "PRECIO ya viene calculado desde arr.precio_diario"
  - "NO recalcular fórmula en Excel"
  - "plant-scoped IGFDiario solamente"
  - "usar la misma planta autorizada de require_plant=1"
  - "no contaminar datos entre plantas"
  - "CONTROL DE COMPRAS conserva renderer existente"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-SHEET-027.md"
```
