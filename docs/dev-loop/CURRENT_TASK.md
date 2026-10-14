task_id: IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

authorized_by: ""
authorized_at: ""
human_authorization: ""

base_sha: "61330e14e468b853fce12603a53f92f7a1ca12d3"
branch: "implementation/igf-gastos-month-navigation-datos-planta-083"

objective: "Navegar el mes dentro de los modales de gastos, llenar precio y descuentos por canal en DatosPlanta, y aislar el guardado en curso de respuestas tardías."

in_scope:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/igf-gastos-month-nav.js"
  - "lib/igf-diario-datos-planta.js"
  - "lib/dashboard-arr-forecast.js"
  - "test/impl-igf-gastos-month-navigation-datos-planta-083.test.js"
  - "test/impl-igf-gastos-save-inflight-083.test.js"
  - "test/impl-igf-diario-datos-planta-082.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083.md"
  - "docs/dev-loop/reports/evidence-083/"

out_of_scope:
  - "importación ARR"
  - "DB, migraciones y escrituras productivas"
  - "imputar el HG ausente de Acapulco"
  - "TODAS / Provincia"
  - "cálculos de venta, HG, C&D o resultado"
  - "docs/director-ia/"
  - "PR, merge y deploy"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "decisión 083 del usuario sobre AF, AG y M"

allowed_actions:
  - "implementar la navegación y las columnas"
  - "probar con fixtures"
  - "documentar"
  - "push de la rama autorizada"

forbidden_actions:
  - "escribir AUTHORIZED_BY_HUMAN"
  - "PR"
  - "merge"
  - "deploy"
  - "migrations"
  - "escrituras a la DB productiva"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-GASTOS-MONTH-NAV-DATOS-PLANTA-083.md"

completion:
  status: DONE_PENDING_REVIEW
  product_sha: "3c3557abcdda63fd641b05ab85c3f03b113327b5"
  prior_product_sha: "0d5cfd0df2d2e15faf41540fd7403d8341076482"
  save_inflight_fix: "Durante el guardado se bloquean mes y cierre, el doble clic no repite la petición, y una respuesta tardía no cierra, no muestra error ni actualiza la caché si la sesión o el periodo actual del dashboard ya no coinciden."
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false
