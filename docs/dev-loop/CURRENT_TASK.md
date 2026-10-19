task_id: "IMPL-IGF-GRAFICA-EXCEL-WEEK-SELECTOR-087"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T14:34:49.3852055-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19"

base_sha: "bc06a7cc2f2753f329ec6aba0ca2773cb92ae0b9"
branch: "implementation/igf-grafica-excel-week-selector-087"

objective: "Permitir elegir qué semana domingo-sábado descargar en Excel desde la gráfica IGF Diario, incluyendo semanas reales, parciales y proyectadas."

in_scope:
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/lib/igf-diario-weekly-rows.ts"
  - "test/impl-igf-grafica-excel-week-selector-087.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-087.json"
  - "docs/dev-loop/reports/IMPL-IGF-GRAFICA-EXCEL-WEEK-SELECTOR-087.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-VENTA-PROM-PARITY-086.md"

out_of_scope:
  - "Cálculos financieros"
  - "lib/igf-diario-weekly-plant.js"
  - "Pronóstico"
  - "Excel financiero salvo selección de la semana"
  - "DB, migrations e importadores"
  - "APIs nuevas"
  - "PDF"
  - "PR, merge y deploy"

allowed_actions:
  - "Agregar selector local de semana en IgfDiarioGraficaModal"
  - "Reutilizar week_anchor existente"
  - "Crear helpers puros domingo-sábado si son necesarios"
  - "Validar por lectura que el backend existente consume week_anchor"
  - "Crear pruebas y build"
  - "Commit producto/tests y documentación"
  - "Push únicamente de la rama implementation/igf-grafica-excel-week-selector-087"

forbidden_actions:
  - "Cambiar cifras del Excel"
  - "Cambiar fórmulas financieras"
  - "Cambiar la gráfica al seleccionar semana para Excel"
  - "Crear una segunda definición de semana incompatible"
  - "Escribir DB productiva"
  - "PR, merge o deploy"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-GRAFICA-EXCEL-WEEK-SELECTOR-087.md"
