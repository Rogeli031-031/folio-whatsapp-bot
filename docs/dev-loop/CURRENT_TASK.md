# CURRENT_TASK

```yaml
task_id: "FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035"
title: "CONTROL DE COMPRAS — mostrar el promedio el día del corte"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T12:10:04-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Proyectar las compras faltantes del día seleccionado como corte sin modificar los días anteriores ni el cálculo aprobado del promedio."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "a2cfac4a12b6200d306e97cd1fcc40287629e8fc"
integrated_main_sha: "095ba9586003a0d7282582228b68aa7641a8aab4"
branch: "fix/compras-include-cutoff-day-035"

in_scope:
  - "lib/compras-excel.js: elegibilidad de la proyección en el día del corte"
  - "lib/dashboard-arr-forecast.js: transmitir a CONTROL DE COMPRAS la fecha de corte ya recibida"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "otras pruebas directamente afectadas"
  - "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transición de status"

out_of_scope:
  - "frontend-dashboard/.next y cualquier otro cambio ajeno existente"
  - "cambiar la fórmula o el divisor del promedio aprobado en 032"
  - "cambiar el método de cálculo de HG EN KILOS"
  - "rellenar fechas anteriores al corte sin compras reales"
  - "frontend, PostgreSQL, hoja PRECIO y demás hojas"
  - "AGENTS.md, LOOP_PROTOCOL.md y contratos de Director IA"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main integrado en integrated_main_sha"
  - "El reporte BLOCKED de 034 permanece intacto; 035 es una tarea nueva."
  - "El promedio de proveedores usa compras reales anteriores al corte divididas entre todos los días calendario anteriores al corte."
  - "Los datos reales prevalecen sobre las estimaciones; HG EN KILOS conserva su método."

working_tree_exception:
  - "Se permite continuar únicamente si los cambios ajenos preexistentes son los ocho archivos frontend-dashboard/.next enumerados en el reporte 034, además del CURRENT_TASK que el humano acaba de autorizar."
  - "No editar, limpiar, descartar, ocultar, añadir al índice ni incluir en el commit esos archivos .next."
  - "Si existe cualquier otro cambio ajeno o no puede distinguirse su procedencia: BLOCKED y STOP."

acceptance_criteria:
  - "Con corte 2026-09-24, el 24 recibe la estimación en cada celda de kilos e importe de proveedor sin dato real; el 25 conserva su proyección."
  - "El promedio del 24 y del 25 conserva divisor 23 y excluye los datos del 24 de su numerador."
  - "PEMEX TUXPAN kg = 929020/23; TOMZA TEPEJI kg = 92750/23; TOMZA TEPEJI importe = 1045311.27/23, con el formato visual existente."
  - "Cada dato real del 24 prevalece en su celda; las demás celdas faltantes pueden estimarse."
  - "El 19 y cualquier día anterior al corte sin compras reales conservan vacías sus celdas correspondientes."
  - "HG EN KILOS puede estimarse el 24 si falta su dato real, con su método vigente y sin modificar su fórmula."
  - "La fecha seleccionada en IGF Forecast se aplica también a CONTROL DE COMPRAS, aunque difiera del día del servidor."
  - "Sin fecha seleccionada, la exportación independiente de Compras mantiene su corte predeterminado de hoy en Ciudad de México."
  - "Los consolidados incluyen las estimaciones aplicables sin errores de fórmula."

validation:
  - "Actualizar prueba 030: día 19 vacío donde no hay compra, día 24 proyectado y día 25 proyectado; dato real del 24 con prioridad."
  - "Comprobar divisor 23, ausencia de historial y comportamiento vigente de HG."
  - "Comprobar transmisión de la fecha seleccionada mediante la exportación IGF Forecast."
  - "Ejecutar pruebas 030, 020, 021, 022, 024, 026, 027, 028 y 029 y otras directamente afectadas."
  - "Ejecutar git diff --check y verificar que el commit contiene exclusivamente archivos in_scope."

allowed_actions:
  - "crear la rama 035 desde base_sha sin alterar los cambios locales ajenos"
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas"
  - "crear reporte 035"
  - "commit y push únicamente a la rama 035"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add . o incluir frontend-dashboard/.next en commits"
  - "alterar el reporte 034 o datos persistidos"
  - "abrir PR, fusionar a main o desplegar"
  - "poner status APPROVED o CLOSED"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035.md"
```