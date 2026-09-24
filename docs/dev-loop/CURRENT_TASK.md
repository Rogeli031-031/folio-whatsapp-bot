# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038"
title: "Corregir el descanso presidencial en meses históricos de IGF Diario Puebla"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T14:12:45-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

prior_task_review: "El humano acepta expresamente el cambio a test/igf-diario-puebla-036.test.js declarado en el reporte 037. La 037 se usa como base de esta corrección; todavía no se autoriza su integración."

objective: "Aplicar la fecha de descanso por transmisión presidencial correspondiente a cada periodo histórico en el calendario de IGF Diario Puebla."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "6d5b53100ee7828ab189f0ab41e1c5e8c5c05b33"
branch: "fix/igf-diario-puebla-historical-holidays-038"

in_scope:
  - "lib/igf-diario-puebla.js: únicamente la regla del descanso por transmisión presidencial"
  - "test/igf-diario-puebla-038.test.js: pruebas de años históricos y posteriores a 2024"
  - "pruebas existentes directamente afectadas, solo para ejecutarlas"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transiciones de status después de esta autorización humana"

out_of_scope:
  - "modificar test/igf-diario-puebla-036.test.js o el reporte 037; el humano ya aceptó el cambio existente"
  - "cambiar fórmulas, importes, distribución de gastos o subtotales de IGF Diario Puebla"
  - "cambiar calendarios de otros módulos o lib/feriados-mx.js"
  - "cambiar otras plantas, exportaciones globales o el cálculo del ARR mini"
  - "frontend, esquemas y datos de PostgreSQL"
  - "docs/director-ia/, AGENTS.md, LOOP_PROTOCOL.md y TASK_TEMPLATE.md"
  - "PR, merge a main y despliegue"
  - "archivos preexistentes de frontend-dashboard/.next"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La rama 038 parte exactamente de base_sha y conserva las correcciones de la 037."
  - "El descanso por transmisión presidencial corresponde al 1 de diciembre en 2018 y al 1 de octubre cada seis años desde 2024."
  - "Los domingos siguen siendo inhábiles por su propia regla; no confundir esa coincidencia con un descanso presidencial."

acceptance_criteria:
  - "En 2018, federalRestDays incluye 2018-12-01 y no incluye 2018-10-01."
  - "En 2018, el 1 de octubre es hábil según este calendario y el 1 de diciembre es inhábil."
  - "En 2024, 2030 y 2036, federalRestDays incluye el 1 de octubre y no agrega el 1 de diciembre por transmisión presidencial."
  - "En diciembre de 2036, el 1 de diciembre es hábil si no existe otro motivo explícito de cierre."
  - "Conservar los demás domingos y descansos; septiembre de 2026 sigue con 25 días hábiles e inhábiles 6, 13, 16, 20 y 27."
  - "No modificar las fórmulas ni el orden de hojas implementados en 036 y 037."

validation:
  - "Probar 2018-10-01 y 2018-12-01, además de 2024, 2030 y 2036."
  - "Ejecutar las pruebas 038, 037, 036, 024, 026, 027, 028, 029 y 030."
  - "Ejecutar git diff --check y registrar el resultado en el reporte."

allowed_actions:
  - "crear la rama 038 desde base_sha conservando la autorización humana ya pegada"
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas y crear el reporte 038"
  - "hacer commit y push únicamente a la rama 038"

forbidden_actions:
  - "modificar authorized_by, authorized_at, human_authorization o prior_task_review"
  - "editar, descartar, añadir al índice o commitear frontend-dashboard/.next"
  - "usar git add ."
  - "modificar reportes o pruebas de tareas anteriores"
  - "abrir PR, fusionar a main o desplegar"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038.md"
```