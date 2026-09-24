# CURRENT_TASK

```yaml
task_id: "FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032"
title: "CONTROL DE COMPRAS — promedio por todos los días transcurridos"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T11:06:34-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Corregir la proyección diaria de kilos e importes de cada proveedor: sumar sus compras reales del mes hasta ayer y dividir entre todos los días calendario transcurridos hasta ayer, incluidos los días sin compra."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "ccdeee53260b5166d32d77eec117c9703281ff60"
branch: "fix/compras-calendar-day-average-032"

in_scope:
  - "lib/compras-excel.js: únicamente el cálculo de proyecciones de kilos e importes de proveedores"
  - "test/compras-daily-average-fill-030.test.js"
  - "tests de regresión de CONTROL DE COMPRAS e IGFDiario estrictamente necesarios"
  - "docs/dev-loop/reports/FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transición de status"

out_of_scope:
  - "método de captura, arrastre, proyección y fórmulas de HG EN KILOS"
  - "cambios de base de datos o datos persistidos"
  - "frontend y otras hojas del Excel"
  - "modificar la regla 031 de proyectar únicamente fechas posteriores al corte"
  - "PR, merge a main y despliegue"
  - "AGENTS.md, LOOP_PROTOCOL.md y contratos de Director IA"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main en base_sha como referencia integrada"
  - "Compras e IGFDiario comparten appendComprasWorksheet"
  - "datos reales prevalecen; estimaciones no se persisten"
  - "días pasados y día de corte sin captura real permanecen vacíos"
  - "HG EN KILOS conserva exactamente su método vigente"

acceptance_criteria:
  - "Con corte 2026-09-24, el denominador de cada proveedor es 23: días calendario del 01/09 al 23/09, incluidos días sin compra y días ausentes del grid."
  - "El numerador de kg de cada proveedor es la suma de sus kg reales del 01/09 al 23/09; el numerador de importe es, independientemente, la suma de sus importes reales de esas mismas fechas."
  - "Para PEMEX TUXPAN, 929020 kg / 23 produce 40392.173913... kg, mostrados como 40392.2; no 42228.2."
  - "Para TOMZA TEPEJI, 92750 kg / 23 produce 4032.608695... kg, mostrados como 4032.6; no 46375."
  - "Para TOMZA TEPEJI, 1045311.27 de importe / 23 produce 45448.316086..., mostrados como 45448.32; no 522655.64."
  - "No contar como compras reales las estimaciones, ni usar días futuros o el día de corte parcialmente transcurrido para calcular el promedio."
  - "La proyección de todos los días futuros del mismo mes usa ese promedio basado en días ya completos; las capturas reales de una fecha futura siempre prevalecen en su propia celda."
  - "Un proveedor sin compras reales hasta ayer permanece sin proyección; no crear compras ficticias en fechas pasadas ni en la fecha de corte."
  - "No cambiar el cálculo, las capturas reales, el tratamiento de cero/negativos ni las proyecciones actuales de HG EN KILOS."
  - "Semana y TOTAL MES reflejan los nuevos valores de proveedores. Compras e IGFDiario generan resultados equivalentes para el mismo payload y corte."
  - "Mes histórico cerrado conserva su ausencia de proyecciones."

validation:
  - "Prueba fija de corte 2026-09-24 con días sin compra y grid incompleto; comprobar que el divisor es 23, no la cantidad de compras ni de filas."
  - "Probar kg e importe por separado, proveedor sin historial, dato real que prevalece y día actual excluido del promedio."
  - "Ejecutar regresiones Compras 030/031, 020/021/022/026 e IGFDiario 024/027/028/029."
  - "git diff --check y reporte con resultados y SHA final."

allowed_actions:
  - "editar únicamente archivos in_scope"
  - "crear reporte 032"
  - "ejecutar pruebas"
  - "commit y push únicamente a la rama 032"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "cambiar la lógica de HG EN KILOS"
  - "abrir PR, fusionar a main o desplegar"
  - "poner status APPROVED o CLOSED"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032.md"