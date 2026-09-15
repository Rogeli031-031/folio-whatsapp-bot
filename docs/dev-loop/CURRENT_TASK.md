task_id: "FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-15"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Corregir el fallo de build de Next/Render causado por la ruta incorrecta del import
  de arr-annual-category-analysis.js desde frontend-dashboard/lib/arr-export-excel.ts,
  sin modificar la lógica funcional del reporte anual ARR.

known_failure:
  file: "frontend-dashboard/lib/arr-export-excel.ts"
  current_import: "../../../lib/arr-annual-category-analysis.js"
  problem: >
    Desde frontend-dashboard/lib esa ruta sube tres niveles y sale del repositorio,
    por lo que Next/Webpack no puede resolver el módulo durante el build.

required_fix:
  import_change:
    file: "frontend-dashboard/lib/arr-export-excel.ts"
    from: "../../../lib/arr-annual-category-analysis.js"
    to: "../../lib/arr-annual-category-analysis.js"

  webpack_alias:
    file: "frontend-dashboard/next.config.js"
    requirement: >
      Agregar alias explícito para arr-annual-category-analysis.js siguiendo el
      patrón físico ya usado para módulos compartidos fuera de frontend-dashboard.

    aliases:
      - "../../../lib/arr-annual-category-analysis.js"
      - "../../lib/arr-annual-category-analysis.js"

    target: >
      path.join(__dirname, "..", "lib", "arr-annual-category-analysis.js")

scope:
  in:
    - "frontend-dashboard/lib/arr-export-excel.ts"
    - "frontend-dashboard/next.config.js"
    - "tests/build checks mínimos relacionados"
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001.md"

  out:
    - "lib/arr-annual-category-analysis.js lógica funcional"
    - "server.js"
    - "ARR calculations"
    - "CASA ANUAL / COMISIONISTA ANUAL contenido"
    - "SQL/schema"
    - "Director IA"
    - "frontend UX"
    - "main"
    - "deploy manual"

acceptance_criteria:
  - "Next/Webpack resuelve arr-annual-category-analysis.js."
  - "El build ya no falla por Module not found de ese archivo."
  - "No cambia lógica del reporte anual."
  - "No cambia estructura de CASA, COMISIONISTA ni EVALUACION."
  - "No cambia el workbook contractual."
  - "Tests previos del reporte anual siguen pasando."
  - "Build de frontend ejecutado y documentado si el entorno lo permite."

allowed_actions:
  - "crear rama fix/arr-annual-export-webpack-alias-001"
  - "cambiar únicamente import/alias necesarios"
  - "ejecutar build/tests"
  - "crear reporte"
  - "commit/push solo a la rama si el protocolo lo permite"

forbidden_actions:
  - "modificar lógica del reporte anual"
  - "modificar SQL/schema"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001.md"

final_state: "DONE_PENDING_REVIEW"
