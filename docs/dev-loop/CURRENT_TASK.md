task_id: IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

authorized_by: ""
authorized_at: ""
human_authorization: ""

base_sha: "15983459a28c5d4327746f612a570977013dd514"
branch: "implementation/igf-diario-weekly-executive-pdf-084"

objective: "Descargar la gráfica ejecutiva semanal como PDF vectorial, sin cambiar los cálculos financieros."

in_scope:
  - "frontend-dashboard/components/IgfDiarioWeeklyExecutiveModal.tsx"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-chart.js"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-chart.d.ts"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-pdf.js"
  - "frontend-dashboard/public/fonts/"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
  - "test/impl-igf-diario-weekly-executive-pdf-084.test.js"
  - "test/impl-igf-diario-weekly-executive-chart-081.test.js"
  - "test/fix-igf-diario-weekly-executive-grid-081-r1.test.js"
  - "test/fix-igf-diario-weekly-executive-ux-081-r2.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084.md"
  - "docs/dev-loop/reports/evidence-084/"

out_of_scope:
  - "APIs, importadores y base de datos"
  - "Excel y DatosPlanta"
  - "navegación mensual de gastos 083"
  - "cálculos de acumulados, cobertura, deltas y color"
  - "otras descargas PNG"
  - "envío por WhatsApp"
  - "PR, merge y deploy"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "gráfica ejecutiva 081 y sus revisiones"

allowed_actions:
  - "sustituir la descarga PNG de este botón por PDF vectorial"
  - "agregar jsPDF y svg2pdf.js si no existen"
  - "probar en un navegador headless"
  - "documentar y publicar la rama"

forbidden_actions:
  - "escribir AUTHORIZED_BY_HUMAN"
  - "PR"
  - "merge"
  - "deploy"
  - "migrations"
  - "escrituras a la DB productiva"
  - "npm audit fix"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084.md"

product_sha: "f67b910248637428e4cfee7321d497465e50254d"

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false
