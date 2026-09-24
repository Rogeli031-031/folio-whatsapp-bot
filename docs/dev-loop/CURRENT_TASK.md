# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042"
title: "Mostrar en Excel el amarillo del costo y flete arrastrados"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T17:33:12-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"
prior_task_review: "La 041 calcula correctamente el 19, pero la captura abierta en Excel muestra F28 y G28 blancas. Autorizo corregir solo ese resaltado en 042; sin integración ni despliegue."

objective: "Mostrar amarillo en Excel únicamente cuando F o G usa un valor histórico arrastrado."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "836294a4e4a6908e21288fcd2ba57f26d711b8af"
branch: "fix/igf-diario-puebla-local-yellow-042"

in_scope:
  - "lib/igf-diario-puebla.js: regla visual y celdas auxiliares locales ocultas"
  - "test/igf-diario-puebla-042.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cambiar fórmulas o valores F/G/H/AF, gastos, fechas o importes"
  - "modificar CONTROL DE COMPRAS, otras plantas o frontend-dashboard/.next"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La 041 ya devuelve el costo y flete correctos; conservar exactamente ese cálculo."
  - "La regla de formato condicional debe depender solo de celdas de IGF Diario Puebla. Las referencias a CONTROL DE COMPRAS pueden estar en fórmulas auxiliares normales."
  - "Conservar AH visible como COMENTARIO DEL DIA; ocultar cualquier columna auxiliar posterior."

acceptance_criteria:
  - "En el Excel real con corte 2026-09-24, F28=11.97 y G28=1.23 aparecen amarillas; H28 sigue mostrando 6.34."
  - "F27/G27, con dato propio válido, no aparecen amarillas. El 24 y fechas futuras no adquieren amarillo por arrastre."
  - "Usar, si se necesitan, AI y AJ ocultas para determinar por separado cuándo F y G recurren a un antecedente; las reglas condicionales de F/G consultan solo celdas de esta misma hoja."
  - "El relleno condicional sólido conserva fgColor=FFFFFF00. Mantener las 32 hojas, dimensiones visibles, C12 y las filas semanales de la 041."
  - "Si cambia el dato propio de Compras y Excel recalcula, el amarillo se quita automáticamente."

validation:
  - "Guardar y reabrir XLSX temporal; inspeccionar que la condición de F28/G28 no contiene referencias directas a otras hojas y que AI/AJ están ocultas."
  - "Ejecutar 042 y las pruebas 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030; git diff --check."
allowed_actions:
  - "crear rama 042 desde base_sha en árbol aislado"
  - "editar solo in_scope; probar, reportar, commit y push solo a rama 042"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; abrir PR; fusionar a main; desplegar; encadenar tareas"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042.md"
```