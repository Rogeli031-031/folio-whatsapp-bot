# CURRENT_TASK

```yaml
task_id: "FIX-COMPRAS-INCLUDE-CUTOFF-DAY-034"
title: "CONTROL DE COMPRAS — proyectar el día seleccionado como corte"
status: "BLOCKED"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T12:00:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Aplicar al día seleccionado como corte la proyección de compras cuando falten datos reales, conservando vacíos los días anteriores sin compras."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "095ba9586003a0d7282582228b68aa7641a8aab4"
branch: "fix/compras-include-cutoff-day-034"

in_scope:
  - "lib/compras-excel.js: elegibilidad de la proyección desde el día de corte"
  - "lib/dashboard-arr-forecast.js: pasar la fecha de corte ya recibida a CONTROL DE COMPRAS"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "tests directamente afectados por el cambio"
  - "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-034.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transición de status"

out_of_scope:
  - "cambiar la fórmula o el divisor del promedio aprobado en 032"
  - "cambiar el método de cálculo de HG EN KILOS"
  - "rellenar días anteriores al corte que no tengan compras reales"
  - "frontend, PostgreSQL, hoja PRECIO y demás hojas del Excel"
  - "AGENTS.md, LOOP_PROTOCOL.md y contratos de Director IA"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main en base_sha"
  - "El promedio de proveedores de 032 suma compras reales anteriores al corte y divide entre todos los días calendario transcurridos anteriores al corte."
  - "Los datos reales prevalecen sobre cualquier estimación."
  - "HG EN KILOS conserva su método vigente de cálculo."

acceptance_criteria:
  - "Con corte 2026-09-24, el día 24 recibe el promedio estimado en los kilos e importes de cada proveedor que no tengan dato real; el día 25 conserva su proyección."
  - "El promedio usado el 24 y el 25 conserva el divisor 23; no incluye datos reales ni estimaciones del 24 en el numerador."
  - "Ejemplos: PEMEX TUXPAN kg = 929020/23; TOMZA TEPEJI kg = 92750/23; TOMZA TEPEJI importe = 1045311.27/23, con el formato visual existente."
  - "Si una celda del 24 contiene un dato real, conserva ese dato; únicamente se proyectan sus celdas faltantes."
  - "El 19 y cualquier otra fecha anterior al corte sin compras reales permanecen vacíos en las celdas correspondientes."
  - "HG EN KILOS puede estimarse el día del corte si falta el dato real, usando exactamente su cálculo vigente; sus datos reales y fórmulas conservan prioridad."
  - "La fecha seleccionada en la descarga IGF Forecast llega a CONTROL DE COMPRAS. Si no se proporciona fecha seleccionada, la exportación independiente de Compras conserva su corte predeterminado de hoy en Ciudad de México."
  - "Los consolidados y totales incluyen las estimaciones aplicables al 24 sin producir errores de fórmula."

validation:
  - "Actualizar la prueba que actualmente exige que el 24 esté vacío; comprobar 19 vacío, 24 proyectado y 25 proyectado."
  - "Comprobar divisor 23, dato real del 24 con prioridad, ausencia de historial y HG con su método existente."
  - "Comprobar que IGF Forecast transmite a CONTROL DE COMPRAS la fecha de corte seleccionada, incluso si difiere del día del servidor."
  - "Ejecutar pruebas 030, 020, 021, 022, 024, 026, 027, 028 y 029, y las adicionales directamente afectadas."
  - "Ejecutar git diff --check y registrar resultados y SHA en el reporte."

allowed_actions:
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas"
  - "crear reporte 034"
  - "commit y push únicamente a la rama 034"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "modificar datos persistidos"
  - "abrir PR, fusionar a main o desplegar"
  - "poner status APPROVED o CLOSED"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-034.md"
```