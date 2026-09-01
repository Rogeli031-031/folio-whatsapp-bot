# CURRENT_TASK

previous_task_id: SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001
previous_task_status: DONE_PENDING_REVIEW
previous_task_note: "El humano autorizó en chat la implementación derivada de SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001. El reporte de auditoría no se reescribe."

task_id: IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001

status: DONE_PENDING_REVIEW

authorized_by: "Ing. Rogelio Zaragoza"

authorized_at: "2026-09-01T11:50:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Ing. Rogelio Zaragoza 2026-09-01"

task_type: IMPLEMENTATION

## 1. Objetivo

Implementar el cambio mínimo y seguro para que client_profile construya y propague periodos históricos explícitos (desde enero, enero a la fecha, todo el año, últimos N meses, mes individual, rangos y cross-year) sin alterar el default de 3 meses ni la precedencia de cliente explícito.

## 2. Contrato

docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md

## 3. in_scope

- lib/director-ia-client-profile.js
- test/director-ia-client-profile.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001.md
- docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md

## 4. out_of_scope

- Forecast / Period Start / Dashboard / schema
- loaders ajenos / autorización por planta / inherit global
- corrección GRUPO MOVE → GRUPO
- clientes nuevos / aumentaron / disminuyeron / dejaron de comprar
- docs/director-ia/
- merge a main

## 5. contracts_in_force

- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- origin/main
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md

## 6. allowed_actions

- editar in_scope
- tests locales
- suite Director IA
- escribir el reporte de esta tarea
- commit y push de la rama de implementación
- no merge a main

## 7. forbidden_actions

- escribir APPROVED
- autoautorizar gates
- tocar out_of_scope
- cambiar fórmula de descuento
- cambiar Forecast / Period Start / Dashboard / schema
- revertir explicit client > inherited client
- rellenar meses faltantes con cero
- encadenar otra tarea
- almacenar secretos
- merge o push a main

## 8. max_attempts

1

## 9. result_report_path

docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001.md

## 10. Estado final máximo

DONE_PENDING_REVIEW
