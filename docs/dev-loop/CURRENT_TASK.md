task_id: "FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-15"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Corregir el build de Next/Render haciendo que el módulo compartido
  lib/arr-annual-category-analysis.js pueda resolver exceljs desde
  frontend-dashboard/node_modules, sin modificar la lógica funcional
  del reporte anual ARR.

known_failure:
  render_commit: "5a3be93cee74a4b2a5c09136b8c0fdebd845082e"
  error: "Module not found: Can't resolve 'exceljs'"
  source_file: "lib/arr-annual-category-analysis.js"

confirmed_facts:
  - >
    frontend-dashboard/package.json ya declara exceljs ^4.4.0.
  - >
    El import de arr-annual-category-analysis.js ya se resuelve correctamente.
  - >
    El nuevo fallo ocurre dentro del módulo compartido al ejecutar require("exceljs").
  - >
    El módulo compartido vive fuera de frontend-dashboard y Webpack no resuelve
    automáticamente frontend-dashboard/node_modules desde esa ubicación.

required_fix:
  file: "frontend-dashboard/next.config.js"
  rule: >
    Agregar resolución/alias explícito de exceljs hacia la instalación física
    disponible para el frontend, usando require.resolve o path seguro desde
    frontend-dashboard.

preferred_implementation: >
  Usar require.resolve("exceljs") desde next.config.js o equivalente robusto,
  evitando hardcodear una ruta interna específica del paquete si no es necesario.

acceptance_criteria:
  - "Next build resuelve exceljs."
  - "npm run build termina exit 0."
  - "No aparece Can't resolve 'exceljs'."
  - "Tests del reporte anual siguen pasando."
  - "No cambia lógica YTD."
  - "No cambia workbook."
  - "No cambia server.js."
  - "No cambia SQL/schema."

in_scope:
  - "frontend-dashboard/next.config.js"
  - "test mínimo de resolución/build"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001.md"

out_of_scope:
  - "lib/arr-annual-category-analysis.js lógica"
  - "package.json salvo que la evidencia demuestre que es estrictamente necesario"
  - "CASA ANUAL"
  - "COMISIONISTA ANUAL"
  - "ARR runtime"
  - "SQL/schema"
  - "Director IA"
  - "merge"
  - "deploy"

allowed_actions:
  - "crear rama fix/arr-annual-export-exceljs-resolution-001"
  - "modificar resolución webpack mínima"
  - "ejecutar tests"
  - "ejecutar npm run build"
  - "commit/push solo a rama autorizada"

forbidden_actions:
  - "modificar lógica del reporte"
  - "npm audit fix"
  - "npm audit fix --force"
  - "actualizar dependencias no relacionadas"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

final_state: "DONE_PENDING_REVIEW"
