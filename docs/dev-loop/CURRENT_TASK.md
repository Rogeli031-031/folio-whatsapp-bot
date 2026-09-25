# CURRENT_TASK

```yaml
task_id: "FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045"
title: "Proyectar importe con último costo real y dejar vacío IGF Diario futuro"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-25T09:39:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-25"
prior_task_review: "La 044 está integrada en main. Autorizo corregir la proyección de importes en CONTROL DE COMPRAS y dejar vacíos los días posteriores al corte en IGF Diario Puebla. Sin PR, merge ni despliegue."

objective: "Calcular cada importe de compra proyectado con los kilos del día y el último costo unitario real del mismo proveedor, y mostrar vacíos los datos diarios de IGF Diario Puebla posteriores al corte."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "5b2baf4eff486b20d13441e0bd32799cdabb763b"
branch: "fix/compras-last-real-cost-igf-future-blank-045"

in_scope:
  - "lib/compras-excel.js"
  - "lib/igf-diario-puebla.js"
  - "test/compras-daily-average-fill-030.test.js: ajustar solo expectativas incompatibles con el nuevo importe"
  - "test/igf-diario-puebla-039.test.js y test/igf-diario-puebla-040.test.js: ajustar solo expectativas incompatibles de fechas futuras, si resulta necesario"
  - "test/compras-last-real-cost-igf-future-blank-045.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "alterar la proyección de kilos, HG EN KILOS, otros libros o la fórmula de gastos M3/T3"
  - "modificar hojas de otras plantas o las proyecciones de Provincia Venta Diaria, PRECIO y CONTROL DE COMPRAS fuera del importe solicitado"
  - "docs/director-ia/, base de datos y frontend-dashboard/.next"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "CONTROL DE COMPRAS conserva el promedio de kilos por días calendario anteriores al corte; el día del corte se proyecta si no tiene dato real y los días históricos sin compra permanecen vacíos."
  - "El costo unitario procede de la última fecha anterior con kilos e importe reales positivos del mismo proveedor; se calcula como importe real dividido entre kilos reales, sin redondeo intermedio."
  - "Un importe real capturado prevalece. Si falta un costo unitario real válido, el importe estimado queda vacío; no se inventa cero ni se usa un importe proyectado como antecedente."
  - "En IGF Diario Puebla solo las fechas posteriores al corte quedan sin datos diarios; la fecha seleccionada conserva sus cálculos y el calendario completo conserva sus filas y formato."

acceptance_criteria:
  - "Con corte 2026-09-24, PEMEX TUXPAN el 25/09: kilos proyectados 38709.16666666667, último real del 23/09 de 19370 kg y $236938.17; importe proyectado = kilos proyectados × (236938.17 / 19370), mostrado como $473499.18."
  - "La regla se aplica por separado a todos los proveedores y a cada fecha proyectada, incluida la fecha de corte si falta importe real."
  - "El costo real más reciente puede actualizarse con una compra real completa del día del corte para días posteriores; no se toman estimaciones como antecedentes."
  - "Los kilos proyectados, compras históricas sin dato, compras reales, HG EN KILOS y consolidado mantienen sus reglas, salvo el efecto matemático del nuevo importe."
  - "IGF Diario Puebla con corte 2026-09-24: el 24/09 conserva fórmulas; del 25/09 al 30/09 la columna A conserva la fecha y B:AF no contiene valores ni fórmulas diarias."
  - "Los subtotales semanales y TOTAL MES de IGF Diario Puebla excluyen las fechas futuras vacías; una semana enteramente futura no muestra importes inventados. M3, T3, las 25 jornadas hábiles y el arrastre amarillo histórico permanecen."
  - "Las demás hojas y plantas conservan su comportamiento."

validation:
  - "Probar el ejemplo numérico con precisión completa, proveedores distintos, datos reales en el corte, ausencia de costo real y ausencia de compras históricas."
  - "Probar el libro IGF antes y después de guardar y reabrir XLSX: días 24, 25–30, semana 4, semana 5 y TOTAL MES."
  - "Ejecutar las pruebas afectadas de Compras 020–030 y de IGF Diario Puebla 036–044, además de 045; git diff --check."

allowed_actions:
  - "crear rama 045 desde base_sha en árbol aislado"
  - "editar solo in_scope; probar, documentar, commit y push solo a la rama 045"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; abrir PR; fusionar a main; desplegar; encadenar tareas"
  - "incorporar cambios de frontend-dashboard/.next o de la antigua rama 038"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045.md"
```