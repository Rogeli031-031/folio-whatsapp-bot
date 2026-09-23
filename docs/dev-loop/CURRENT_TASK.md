# CURRENT_TASK

```yaml
task_id: "IMPL-IGF-DIARIO-PRONOSTICO-FILL-028"
title: "IGFDiario — sincronizar Pronostico con setup de corte y rellenar días futuros en Venta/Comisiones"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-23T14:44:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Hacer que la hoja Pronostico del Excel IGFDiario use exactamente el mismo setup persistido de días seleccionados que el modal Pronóstico para la fecha de corte vigente, y reutilizar esos mismos promedios por día de semana para rellenar los días desde el corte hacia fin de mes en Provincia Venta Diaria y Provincia Comisiones, incluyendo CASA/COMISIONISTA."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "22f780d126e7488ef9ebbe5a741887d70162ff74"
branch: "implementation/igf-diario-pronostico-fill-028"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/dashboard-arr-forecast.js"
  - "server.js solo si hace falta pasar contexto explícito"
  - "tests 028"
  - "regresión 023/024/025/027"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRONOSTICO-FILL-028.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "schema DB"
  - "mutaciones nuevas"
  - "cambiar UI del modal Pronóstico"
  - "cambiar algoritmo del modal"
  - "VBA"
  - "PRECIO"
  - "CONTROL DE COMPRAS"
  - "Director IA"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "modal Pronóstico es fuente contractual del cálculo"
  - "arr.pronostico_dias_seleccion guarda inclusión/exclusión por planta/año/mes/corte"
  - "misma fecha de corte => mismo setup"
  - "días anteriores al corte son reales"
  - "día de corte y posteriores son proyectados"
  - "categoría desconocida NO se asigna a CASA"
  - "CASA/COMISIONISTA siguen contrato 023"
  - "no duplicar motor de pronóstico"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRONOSTICO-FILL-028.md"
```
