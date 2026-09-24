# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041"
title: "Corregir el amarillo condicional del costo y flete arrastrados"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T17:08:40-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"
prior_task_review: "La 040 corrigió el orden y pasó sus pruebas, pero su XLSX guarda el amarillo sólido como bgColor. Autorizo corregirlo en 041; no autorizo integración ni despliegue."

objective: "Hacer que el formato condicional pinte de amarillo F y G cuando se use un antecedente válido."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "13d72dc21d1cd4cdf39e2c1e5102865eed0a3364"
branch: "fix/igf-diario-puebla-conditional-yellow-041"

in_scope:
  - "lib/igf-diario-puebla.js: únicamente el relleno de la regla condicional de arrastre"
  - "test/igf-diario-puebla-041.test.js: verificar la regla y el XLSX guardado"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cambiar fórmulas, importes, calendario, dimensiones o colores ajenos a esta regla"
  - "modificar CONTROL DE COMPRAS, otras plantas, datos o frontend-dashboard/.next"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "Con corte 2026-09-24, F28 y G28 usan el 18/09 y deben aparecer amarillas. Si adquieren dato propio válido, deben dejar de aparecer amarillas."
  - "Para un patternFill solid en el XLSX, el amarillo debe guardarse como fgColor; la sola presencia de una regla no verifica el color visible."

acceptance_criteria:
  - "Guardar y reabrir un XLSX temporal confirma las reglas de F28 y G28."
  - "Inspeccionar xl/styles.xml confirma que el relleno sólido condicional contiene fgColor rgb=FFFFFF00 y no depende exclusivamente de bgColor."
  - "Conservar el arrastre O27/AJ27, C12, M3/T3, semana 5 fila 45, TOTAL MES fila 47 y el resto de los formatos de la 040."

validation:
  - "Ejecutar 041 y las pruebas 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030."
  - "Ejecutar git diff --check y documentar el resultado."
allowed_actions:
  - "crear rama 041 desde base_sha en árbol aislado"
  - "editar únicamente in_scope, probar, reportar, commit y push solo a rama 041"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; abrir PR; fusionar a main; desplegar; encadenar tareas"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041.md"
```