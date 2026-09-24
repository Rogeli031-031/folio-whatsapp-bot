# CURRENT_TASK

```yaml
task_id: "FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031"
title: "CONTROL DE COMPRAS — proyección solo futura y corrección de fórmulas"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T09:20:10-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Dejar vacíos los días sin dato real hasta hoy inclusive, proyectar únicamente fechas futuras y corregir los errores #¡VALOR! del consolidado y HG EN KILOS."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "3bef0d76f846cbbba47d897b755ebf800497eded"
branch: "fix/compras-future-only-and-formulas-031"

in_scope:
  - "lib/compras-excel.js"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/compras-hg-cost-carry-forward-026.test.js"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transiciones de status"

out_of_scope:
  - "base de datos y datos persistidos"
  - "frontend, captura de compras y VBA"
  - "hoja Pronostico y lógica de ventas"
  - "Director IA y docs/director-ia/"
  - "AGENTS.md, LOOP_PROTOCOL.md y TASK_TEMPLATE.md"
  - "reporte cerrado de la tarea 030"
  - "PR, merge a main y deploy"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main como referencia integrada"
  - "Compras e IGFDiario comparten appendComprasWorksheet para CONTROL DE COMPRAS"
  - "los datos reales prevalecen y las estimaciones no se persisten"
  - "cada promedio usa solo datos reales anteriores del mismo mes y columna"
  - "conservar el comportamiento vigente de costo HG de las tareas 026 y 030"
  - "Semana y TOTAL MES agregan valores efectivos de sus días"

acceptance_criteria:
  - "El corte es la fecha calendario de America/Mexico_City al generar el Excel; las pruebas pueden inyectar un corte fijo."
  - "En fechas anteriores o iguales al corte, las columnas base sin dato real quedan vacías y no se pintan de azul."
  - "Solo en fechas posteriores al corte se estiman ausencias en B, D, F, H, J, L, S y T; un dato real siempre prevalece."
  - "Con corte 2026-09-24, PEMEX TUXPAN del 19/09 sin compra queda vacío; TOMZA TEPEJI queda vacío en días transcurridos sin compra; el 24/09 sin dato queda vacío; desde el 25/09 se puede estimar si hay historial real."
  - "Un día sin compra no genera kilos ni importes ficticios de compra o flete; otro proveedor con compra real en ese día conserva sus datos."
  - "HG EN KILOS conserva capturas reales, incluidos cero y negativos; ausencias históricas no se estiman."
  - "Las sumas del consolidado admiten celdas con fórmulas que devuelven texto vacío sin producir #¡VALOR!; si no hay números, muestran vacío."
  - "Los errores del flete consolidado no se propagan al COSTO ni al IMPORTE HG. R usa O+AJ cuando ambos son calculables y conserva el arrastre vigente cuando faltan insumos."
  - "Semana y TOTAL MES suman reales y estimaciones futuras, pero nunca compras inventadas en fechas pasadas o en el día de corte."
  - "Un mes histórico cerrado no contiene proyecciones. Compras e IGFDiario producen la misma hoja para el mismo payload y corte."

validation:
  - "Casos con corte fijo: pasado vacío, hoy vacío, futuro estimable, futuro sin historial y real que prevalece."
  - "Fórmulas sin #¡VALOR! con proveedores mezclados y con todos los proveedores vacíos."
  - "Pruebas 030 y regresiones Compras 020/021/022/026 e IGFDiario 024/027/028/029."
  - "git diff --check y git status; documentar cualquier comprobación real de recálculo del XLSX."

allowed_actions:
  - "editar solo archivos de in_scope"
  - "crear el reporte 031"
  - "ejecutar pruebas y verificaciones"
  - "hacer commit y push únicamente a la rama 031"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "poner status AUTHORIZED, CLOSED o APPROVED"
  - "aprobar gates o alterar archivos fuera de alcance"
  - "abrir PR, hacer merge o push a main"
  - "desplegar, guardar secretos o encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031.md"
```