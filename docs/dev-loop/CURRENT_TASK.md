task_id: "FIX-IGF-DIARIO-WEEKLY-CROSSMONTH-RESULT-KG-067-R2"

title: "Completar Resultado $/kg en semanas mixtas con evidencia directa"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Completar Resultado ($/kg) en semanas ISO que mezclan meses legacy y
  detallados, cuando Resultado Importe y Venta KG ya tienen evidencia
  completa. No inventar desglose histórico.

base_sha: "0dd2bb5847ed328fe5b73dec0d25297fb275f568"

branch: "fix/igf-diario-weekly-crossmonth-result-kg-067-r2"

source_product_sha: "c4c806b19683a4153d2724b772cf4ce68807f82c"

problem:
  example_week: "2026-09-28/2026-10-04"

  current:
    resultado_mxn: "calculable"
    resultado_kg: null

  cause: >
    resultado_kg depende actualmente de sobrante_con_hg + com_desc.
    En semana mixta, el desglose J/K/L/Q/R/S/T de septiembre queda
    correctamente null, por lo que sobrante_con_hg no puede calcularse.

contract:
  primary_formula:
    rule: >
      Cuando la cadena financiera detallada está completa,
      conservar resultado_kg = sobrante_con_hg_kg + com_desc_kg.

  direct_evidence_fallback:
    conditions:
      - "resultado_kg primario es null."
      - "resultado_mxn es numérico."
      - "venta_kg es numérico y distinto de 0."

    formula: >
      resultado_kg = resultado_mxn / venta_kg

    rationale: >
      Resultado monetario y Venta son evidencia directa suficiente.
      No se clasifican ni inventan gastos históricos.

  missing:
    - "Si resultado_mxn es null, resultado_kg permanece null."
    - "Si venta_kg es null o 0, resultado_kg permanece null."

cross_month_acceptance:
  week: "Semana ISO 40 · 28/09/2026–04/10/2026"

  expected:
    - "Resultado Importe suma días legacy + detallados."
    - "Resultado $/kg = Resultado Importe / Venta KG semanal."
    - "J/K/L de septiembre siguen null."
    - "Q/R/S/T de septiembre siguen null."
    - "Margen Neto y sobrantes detallados pueden seguir null."
    - "No inventar clasificación histórica."

daily_series:
  rule: >
    No modificar la serie diaria legacy ya corregida por 067-R1.
    resultado_kg diario pre-octubre sigue tomando resultado_per_kg directo
    cuando existe.

unchanged:
  - "067 panel vertical."
  - "067 semana ISO."
  - "067 navegación."
  - "067 gráfica."
  - "067-R1 Resultado histórico."
  - "067-R1 unidades de eje."
  - "064-R1."
  - "065-R1."
  - "066-R1."
  - "Excel."
  - "ARR."
  - "Pronóstico."

recommended_files:
  - "lib/igf-diario-weekly-plant.js"
  - "test/igf-diario-weekly-plant-view-067.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CROSSMONTH-RESULT-KG-067-R2.md"

mandatory_tests:
  - "Semana 40 conserva Resultado Importe."
  - "Semana 40 obtiene Resultado $/kg = Resultado Importe / Venta KG."
  - "La identidad resultado_kg * venta_kg = resultado_mxn se cumple."
  - "J/K/L septiembre permanecen null."
  - "Q/R/S/T septiembre permanecen null."
  - "resultado_mxn null => resultado_kg null."
  - "venta 0 => resultado_kg null."
  - "Semana octubre completa sigue usando la cadena detallada normal."
  - "Resultado diario legacy permanece."
  - "067-R1 PASS."
  - "067 PASS."
  - "066-R1 PASS."
  - "065-R1 PASS."
  - "064-R1 PASS."
  - "frontend build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

out_of_scope:
  - "Inventar desglose pre-octubre."
  - "Cambiar gráfica."
  - "Cambiar unidades."
  - "Cambiar Excel."
  - "Cambiar ARR."
  - "Cambiar Pronóstico."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CROSSMONTH-RESULT-KG-067-R2.md"