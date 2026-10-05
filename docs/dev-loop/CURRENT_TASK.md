task_id: "G4-PREP-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063"

title: "Preparar PR de default, performance y paridad Margen/HG IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063
  hacia main, sin modificar producto ni tests. El merge a main queda
  reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "abf146ec62f7cfc791cd67eb2da523a46ed43743"

branch: "fix/igf-acumulado-default-perf-margen-063"

product_sha: "fd956d15e5edfb10b75e70660336ebacf46f95c7"

validated_source_sha: "abffdb9d83e0e2b5bd243840979f2cb4bf93349f"

target_branch: "main"

validated_scope:
  - "IGF Diario acumulado abre por default."
  - "Forecast permanece disponible como botón alternativo."
  - "Forecast matemático no cambió."
  - "La tabla acumulada usa una sola request HTTP."
  - "Se eliminó el patrón N requests de gráfica por planta."
  - "Nuevo endpoint GET /api/dashboard/igf-diario-acumulado."
  - "Endpoint read-only."
  - "Endpoint respeta auth y alcance de plantas."
  - "Margen acumulado ignora null/vacío."
  - "HG acumulado ignora null/vacío."
  - "0 numérico sigue siendo válido."
  - "HG conserva signo natural de Y según FIX 061."
  - "Fixture San Luis queda 8.20 en vez de ~0.91."
  - "No hay hardcode San Luis/Morelos."
  - "062 gastos manuales permanece intacto."
  - "M3/T3 permanece intacto."

validated_tests:
  - "063 PASS."
  - "059 PASS."
  - "059-R1 PASS."
  - "061 PASS."
  - "062 PASS."
  - "053A PASS."
  - "053A-R1 PASS."
  - "053A-R2 PASS."
  - "054-R3 PASS."
  - "56 pruebas PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

performance_evidence:
  before: "N requests, una /igf-diario-grafica por planta."
  after: "1 request GET /api/dashboard/igf-diario-acumulado."
  endpoint_excludes:
    - "C&D"
    - "clientes nuevos"
    - "comentarios"
    - "insights"
    - "month_close"
    - "series gráfica"
    - "gastos operativos/corporativos"
    - "Excel"

pr_contract:
  base: "main"
  head: "fix/igf-acumulado-default-perf-margen-063"
  title: "FIX 063: IGF Diario acumulado default, rápido y margen correcto"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar ahead 2 / behind 0."
  - "Verificar product SHA y source SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar DB."
  - "Modificar datos."
  - "Push directo a main."
  - "Merge a main."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

acceptance_criteria:
  - "origin/main sigue exactamente en abf146ec62f7cfc791cd67eb2da523a46ed43743."
  - "Rama fuente contiene únicamente cambios ya validados de 063 y documentación."
  - "No se agregan cambios de producto ni tests."
  - "PR creado base main / head fix/igf-acumulado-default-perf-margen-063."
  - "PR queda abierto y sin merge."
  - "Reporte registra número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063.md"