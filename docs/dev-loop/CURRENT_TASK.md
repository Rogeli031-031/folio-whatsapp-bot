task_id: IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084
status: G4_PASS
phase: G4

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
  status: G4_PASS
  tested_product_sha: "f67b910248637428e4cfee7321d497465e50254d"
  push_branch_only: false
  create_pr: true
  merge: true
  deploy: false

g4:
  result: PASS
  tested_product_sha: "f67b910248637428e4cfee7321d497465e50254d"
  standalone: "next start del build local, 127.0.0.1:3477"
  fonts: "NotoSans-Regular.ttf 27056 y NotoSans-Bold.ttf 27112, HTTP 200"
  font_failure: "Bold ausente en la copia standalone: alerta «No se pudo cargar la fuente del PDF», botón restaurado, semanas intactas"
  dependency_review: "lockfile fija jspdf 4.2.1 y svg2pdf.js 2.8.1; npm audit --omit=dev sin hallazgos en esas dependencias; sin npm audit fix"
  tests: "27/27"
  typecheck: 0
  build: 0
  production_download: "no validada; fixture local"
