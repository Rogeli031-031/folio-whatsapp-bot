# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043"
title: "Pintar al exportar el costo y flete históricos arrastrados"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T17:49:22-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"
prior_task_review: "La 042 calcula correctamente el 19, pero Excel muestra F28/G28 blancas. Autorizo pintar el amarillo al generar cada exportación; acepto que una edición manual posterior del XLSX requiera exportarlo de nuevo para actualizar ese color. Sin integración ni despliegue."

objective: "Garantizar que el Excel descargado muestre amarillas F y G cuando se use un costo o flete histórico arrastrado."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "ece45315cfff0ddf683823a2093876a83fb12bd5"
branch: "fix/igf-diario-puebla-export-yellow-043"

in_scope:
  - "lib/igf-diario-puebla.js: determinar y aplicar el relleno visible al exportar"
  - "lib/dashboard-arr-forecast.js: solo si hace falta pasar los datos de compras necesarios"
  - "test/igf-diario-puebla-043.test.js"
  - "pruebas 039, 040, 041 y 042: ajustar solo aserciones incompatibles con el nuevo contrato visual"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cambiar valores o fórmulas de F/G/H/AF, gastos, calendario o datos de CONTROL DE COMPRAS"
  - "cambiar otras plantas, base de datos o frontend-dashboard/.next"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "El amarillo de F y G debe ser un relleno físico de la celda exportada cuando efectivamente exista un antecedente usado."
  - "Determinar el estado con los datos reales de compras del día y de sus antecedentes; no asumir que una fórmula ExcelJS sin result equivale a ausencia de compra."
  - "Costo y flete se evalúan por separado. El día del corte y las fechas futuras no reciben amarillo por arrastre."
  - "Las fórmulas y los importes correctos de la 042 permanecen intactos."

acceptance_criteria:
  - "Con corte 2026-09-24, F28 y G28 conservan 11.965423104349892 y 1.23, y ambas tienen fill.fgColor.argb=FFFFFF00 antes de guardar y después de reabrir el XLSX."
  - "F27/G27 con datos propios no tienen relleno amarillo; F35/G35, día del corte, tampoco lo reciben por arrastre."
  - "Si falta solo costo o solo flete, se pinta únicamente la variable que usa antecedente. Si falta antecedente válido, la celda queda vacía y sin amarillo."
  - "La clasificación funciona aunque las celdas calculadas de CONTROL DE COMPRAS sean fórmulas sin resultado almacenado."
  - "Conservar 32 hojas, AI/AJ ocultas, AH visible, C12 y las filas 45/47. Una nueva exportación con compra propia válida elimina el amarillo."

validation:
  - "Probar con datos sintéticos reales, ceros, vacíos y fórmulas fuente sin resultado almacenado."
  - "Guardar y reabrir un XLSX temporal; comprobar el fill físico de F28/G28 y ausencia de amarillo en días con dato propio."
  - "Ejecutar 043, 042, 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030; git diff --check."
allowed_actions:
  - "crear rama 043 desde base_sha en árbol aislado"
  - "editar solo in_scope; probar, reportar, commit y push solo a rama 043"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; abrir PR; fusionar a main; desplegar; encadenar tareas"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043.md"
```