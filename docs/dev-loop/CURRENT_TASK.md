task_id: IMPL-IGF-DIARIO-DATOS-PLANTA-082
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

authorized_by: ""
authorized_at: ""
human_authorization: ""

base_sha: "9c9879490c752b55448782c7dcf230d89ef2fc96"
branch: "implementation/igf-diario-datos-planta-082"
product_sha: "e8211579b593a2318c3b5d0ba74b2ab2135898c3"

objective: "Agregar la hoja DatosPlanta al Excel IGF Diario de una planta, inmediatamente después de RESUMEN."

in_scope:
  - "lib/igf-diario-datos-planta.js"
  - "lib/dashboard-arr-forecast.js"
  - "test/impl-igf-diario-datos-planta-082.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-DATOS-PLANTA-082.md"
  - "docs/dev-loop/reports/evidence-082/"

out_of_scope:
  - "importación ARR"
  - "DB y migraciones"
  - "columnas M, N, R, AF y AG con datos"
  - "TODAS / Provincia"
  - "docs/director-ia/"
  - "PR, merge y deploy"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "auditoría 082"

allowed_actions:
  - "implementar la hoja"
  - "probar con fixtures"
  - "documentar"
  - "push de la rama autorizada"

forbidden_actions:
  - "escribir AUTHORIZED_BY_HUMAN"
  - "PR"
  - "merge"
  - "deploy"
  - "migrations"
  - "escrituras a DB"

pending_columns:
  - "M Precio Oficial"
  - "N Subsidio"
  - "R CIRCULAR"
  - "AF CONTADO"
  - "AG CRÉDITO"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-DATOS-PLANTA-082.md"

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

tests: "082 9/9. Regresiones 077, 078-R2, 079, 080, 069-R1, 027 y 036 verdes. 024 líneas 507 y 538 siguen fallando en server.js, sin cambio de esta tarea. git diff --check limpio."

g4:
  result: PASS
  product_unchanged_after: "e8211579b593a2318c3b5d0ba74b2ab2135898c3"
  full_generator: "San Luis y Morelos, mismas hojas previas; solo se agrega DatosPlanta"
  evidence:
    - "docs/dev-loop/reports/evidence-082/san-luis-full.xlsx"
    - "docs/dev-loop/reports/evidence-082/morelos-full.xlsx"
    - "docs/dev-loop/reports/evidence-082/san-luis-ak.png"
    - "docs/dev-loop/reports/evidence-082/san-luis-mx.png"
    - "docs/dev-loop/reports/evidence-082/san-luis-zag.png"
