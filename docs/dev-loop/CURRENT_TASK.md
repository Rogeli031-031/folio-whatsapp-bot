# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-REVIEW-040"
title: "Corregir el arrastre real y el formato de IGF Diario Puebla"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T16:27:17-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"
prior_task_review: "Revisé 039: sus pruebas pasan, pero el Excel real demuestra arrastre desde el día más antiguo, falta de amarillo y diferencias visuales. Autorizo corregirlos en 040; no autorizo integración ni despliegue."

objective: "Elegir el último costo y flete válidos para días históricos sin compras y terminar el formato visual solicitado."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "fffdaecbd6e1eda674eadbc33895002a66de3433"
branch: "fix/igf-diario-puebla-review-040"

in_scope:
  - "lib/igf-diario-puebla.js: orden del arrastre y presentación de IGF Diario Puebla"
  - "test/igf-diario-puebla-040.test.js: pruebas nuevas con fuentes que son fórmulas"
  - "test/igf-diario-puebla-039.test.js: ajustar solo expectativas visuales afectadas"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-REVIEW-040.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "modificar CONTROL DE COMPRAS, otras plantas, ARR mini o PostgreSQL"
  - "modificar reportes anteriores, frontend-dashboard/.next o contratos"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "Con corte 2026-09-24, F28 y G28 deben usar por separado el último dato anterior, no el primero."
  - "F28 debe tomar O27=11.965423104349892; G28 debe tomar AJ27=1.23. O6=11.095423176409726 no es el costo correcto."
  - "Las fuentes de CONTROL DE COMPRAS son frecuentemente celdas con fórmula; no tratarlas como inválidas por ser objetos ExcelJS."
  - "El amarillo debe reflejar el uso efectivo del arrastre también después de recalcular en Excel."
  - "El 24 y las fechas futuras no reciben arrastre histórico."

acceptance_criteria:
  - "En el Excel real del mes, la búsqueda de F28 prueba O27 antes que O6; H28 calcula aproximadamente 6.33556606 y AF28 aproximadamente 31042.20."
  - "F28 y G28 aparecen amarillas cuando usan un antecedente, incluso si O27 y AJ27 son fórmulas. Un día con dato propio válido no se marca como arrastrado."
  - "Probar dos días seguidos sin compras y antecedentes diferentes para costo y flete; el resultado cambia correctamente si cambia el valor fuente."
  - "Todas las semanas tienen A negra con texto blanco y B:AF gris claro con texto oscuro; TOTAL MES conserva A negra y B:AF gris claro."
  - "Reproducir del ejemplo las uniones A1:D1, A4:A5, B4:D4, F4:H4, X4:Y4 y AE4:AF4, si no interfieren con las fórmulas; año, mes, M3 y T3 con tamaño, alineación y bordes visibles equivalentes. Conservar los importes correctos del ARR."
  - "Mantener C12 ponderado y mostrado como 18.91; semana 5 en fila 45 y TOTAL MES en fila 47. Las demás hojas conservan sus datos."

validation:
  - "No limitarse a buscar referencias en el texto: evaluar el orden efectivo de la fórmula con fuentes sintéticas que sean fórmulas ExcelJS con resultado."
  - "Verificar estilos y formato tras guardar y reabrir un XLSX temporal; no incluir datos reales en el commit."
  - "Ejecutar 040 y las pruebas 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030; git diff --check."

allowed_actions:
  - "crear rama 040 desde base_sha en árbol aislado"
  - "editar únicamente in_scope, ejecutar pruebas, reportar, commit y push solo a rama 040"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; tocar .next; abrir PR; fusionar o desplegar; encadenar tareas"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-REVIEW-040.md"
```