# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044"
title: "Pintar el arrastre al leer fórmulas compartidas de CONTROL DE COMPRAS"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T18:05:39-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"
prior_task_review: "Revisé la 043: pasa 72 pruebas, pero sobre el archivo real F28/G28 siguen sin relleno. Autorizo corregir la lectura de fórmulas compartidas en la 044. Sin PR, merge ni despliegue."

objective: "Hacer que el archivo real de Puebla exporte F28 y G28 físicamente amarillas cuando arrastran costo y flete."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "a5ae3d9dd49c6b5e7515f019d13ea913a73dc9ac"
branch: "fix/igf-diario-puebla-shared-formulas-044"

in_scope:
  - "lib/igf-diario-puebla.js: resolver valores numéricos y ausencias en fórmulas compartidas de CONTROL DE COMPRAS"
  - "test/igf-diario-puebla-044.test.js: reproducir fórmulas compartidas con y sin resultado guardado"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "alterar fórmulas o importes de IGF Diario Puebla y CONTROL DE COMPRAS"
  - "modificar otras plantas, base de datos o frontend-dashboard/.next"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La 043 conserva las fórmulas y pinta físicamente de amarillo solo el costo o flete histórico efectivamente arrastrado."
  - "Un valor numérico válido en una fórmula compartida cuenta como dato propio o antecedente, aunque la celda no tenga la propiedad formula."
  - "Una fórmula sin resultado guardado se resuelve desde sus entradas cuando sea posible; una ausencia indeterminada no debe inventar compras ni amarillo."

acceptance_criteria:
  - "Sobre el archivo real de Puebla de septiembre 2026, con corte 2026-09-24, F28 y G28 tienen fill.fgColor.argb=FFFFFF00 después de guardar y reabrir el XLSX."
  - "F28/G28 siguen refiriéndose al costo 11.965423104349892 y al flete 1.23 de la fila 27; sus fórmulas no cambian."
  - "F27/G27 con datos propios no están amarillas; F35/G35 del día del corte tampoco."
  - "Si solo una variable necesita antecedente, únicamente esa variable se pinta."
  - "Un antecedente válido representado mediante sharedFormula con result numérico se reconoce; uno sin dato válido no produce un falso amarillo."
  - "Se conservan las 32 hojas, las columnas AI/AJ ocultas y las filas 45/47."

validation:
  - "Añadir una prueba con fórmulas compartidas de ExcelJS, incluida una celda con sharedFormula y result numérico, y verificar el XLSX reabierto."
  - "Revisar de forma local el archivo real 01-Dashboard_ARR_Forecast_Puebla_2026_9-15-.xlsx si está disponible, sin incorporarlo al commit."
  - "Ejecutar 044, 043, 042, 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030; git diff --check."

allowed_actions:
  - "crear rama 044 desde base_sha en árbol aislado"
  - "editar solo in_scope; probar, reportar, commit y push solo a rama 044"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; abrir PR; fusionar a main; desplegar; encadenar tareas"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044.md"
```