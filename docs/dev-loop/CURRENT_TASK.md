task_id: "G4-PREP-ARR-IGF-DIARIO-RESULT-PARITY-066-R1"

title: "Preparar PR de paridad Resultado Final ARR / IGF Diario / AG TOTAL MES 066-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Preparar el Pull Request de
  FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1
  hacia main. No modificar producto ni tests.
  El merge queda reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "1b7584683947d057ef49652d76399aa20a3bbafd"

branch: "fix/arr-igf-diario-result-parity-066-r1"

product_sha: "9b3bb1cac11a5efbba9d2de300c6e8ed4fc67669"

validated_source_sha: "c2320239adbd84c972f80ee25abc7f790834e7cd"

target_branch: "main"

validated_scope:
  - "Corrección aplica únicamente desde octubre 2026."
  - "Septiembre 2026 y anteriores permanecen legacy."
  - "Venta financiera octubre+ usa financials.ventaTon."
  - "financials.ventaTon equivale a B TOTAL MES / 1000."
  - "No fallback a row.ventaTon legacy en octubre+."
  - "La misma venta alimenta ingreso."
  - "La misma venta alimenta Impuestos $/kg."
  - "La misma venta llega a IGF Diario acumulado."
  - "La misma venta llega a ARR."
  - "Zona Provincia suma la Venta TOTAL MES de las plantas."
  - "Corporativos permanece J+K."
  - "Impuestos Federales L permanece fuera de Corporativos."
  - "Gasto visible permanece Operativos + Corporativos."
  - "Impuestos visible permanece L / B."
  - "Resultado Final resta Impuestos Federales exactamente una vez."
  - "Resultado Final = Ingreso - Operativos - Corporativos - Impuestos Federales."
  - "No se resta impuesto_kg además del importe mensual."
  - "Util. Operación permanece Ingreso - Operativos."
  - "ARR obtiene venta desde miniRow.ventaTon."
  - "ARR obtiene rentabilidad desde miniRow.resultadoFinalImporte."
  - "ArrClient.tsx no requirió modificación."
  - "applyDesgloseTotals conserva la resta de Impuestos Federales."
  - "El desglose posterior no revierte la corrección."
  - "Zona suma Resultado Final corregido."
  - "Un null de resultado no se convierte en 0 en zona."
  - "0 explícito de Impuestos Federales es válido."
  - "Impuesto faltante produce resultado null."
  - "Venta faltante produce resultado null."
  - "Operativos faltantes producen resultado null."
  - "Corporativos faltantes producen resultado null."
  - "Excel no fue modificado."
  - "No hay hardcode de Puebla."
  - "No hay hardcode de -201192."
  - "No hay hardcode de fila 48."
  - "No hay parsing XLSX."
  - "No hay query nueva ni N+1."

validated_formula:
  venta_october: "financials.ventaTon"

  ingreso: >
    (margenKg + comDescKg - hgKg) *
    ventaTon * 1000

  utilidad_operacion: >
    ingreso - operativos

  resultado_final: >
    utilidad_operacion
    - corporativos
    - impuestos_federales

  expanded: >
    ingreso
    - operativos
    - corporativos
    - impuestos_federales

excel_equivalence:
  daily_chain:
    - "M = J + K + L"
    - "O = H - M"
    - "W = O - U"
    - "AB = W - Z"
    - "AF = AB + AD"
    - "AG = AF * B"

  dashboard_classification:
    corporativos: "J + K"
    impuestos: "L / B"
    gasto_visible: "Operativos + Corporativos"

  result_rule: >
    Aunque L se presenta separado de Corporativos en el dashboard,
    Resultado Final debe cargar económicamente J+K+L una sola vez,
    igual que AG del Excel.

validated_files:
  product:
    - "frontend-dashboard/lib/igf-october-mini.js"
    - "frontend-dashboard/components/IgfForecastClient.tsx"

  tests:
    - "test/arr-igf-diario-result-parity-066-r1.test.js"
    - "test/arr-igf-diario-financial-sources-066.test.js"

  documentation:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1.md"

validated_tests:
  - "066-R1 PASS 5/5."
  - "066 PASS 10/10."
  - "059 PASS."
  - "059-R1 PASS."
  - "061 PASS."
  - "062 PASS."
  - "063 PASS."
  - "063-R1 PASS."
  - "064 PASS."
  - "064-R1 PASS."
  - "065 PASS."
  - "065-R1 PASS."
  - "Excel 036-044 PASS."
  - "100/100 regresiones reportadas."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

production_validation_required:
  same_cut:
    rule: >
      Comparar dashboard y Excel usando exactamente la misma planta,
      mes y fecha de corte.

  puebla:
    - "Excel B TOTAL MES / 1000 = Venta IGF Diario acumulado."
    - "Excel B TOTAL MES / 1000 = Venta ARR."
    - "Excel H TOTAL MES = Margen dashboard."
    - "Excel AD TOTAL MES = Com. y Desc. dashboard/ARR."
    - "Corporativos dashboard = J + K."
    - "Impuestos dashboard = L / B."
    - "Gasto dashboard = Operativos + Corporativos."
    - "Excel AG TOTAL MES = Resultado Final - Importe del acumulado."
    - "Excel AG TOTAL MES = Rentabilidad ARR sin simulación."

  current_evidence_reference:
    note: "Solo referencia de validación; no hardcode."
    previous_dashboard_result: 225470
    expected_excel_ag_approx: -201192
    previous_dashboard_venta_ton: 1166.76
    excel_b_total_ton_approx: 1164.953

  all_plants:
    - "GT Puebla"
    - "Tehuacan"
    - "Acapulco"
    - "GTM Queretaro"
    - "GTM San Luis"
    - "Morelos"

  historical:
    - "Abrir septiembre 2026."
    - "Confirmar Venta legacy intacta."
    - "Confirmar Rentabilidad legacy intacta."
    - "Confirmar comparación Octubre - Septiembre."

  regressions:
    - "Pronóstico permanece intacto."
    - "Desc. PROY permanece alineado con AD."
    - "Margen H permanece intacto."
    - "HG/HG$ permanecen intactos."
    - "065-R1 permanece intacto."
    - "064-R1 permanece intacto."

pr_contract:
  base: "main"
  head: "fix/arr-igf-diario-result-parity-066-r1"
  title: "FIX 066-R1: alinear Venta y Resultado Final con AG TOTAL MES"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

in_scope:
  - "Verificar origin/main."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA."
  - "Verificar source SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar fórmulas."
  - "Modificar Excel."
  - "Modificar DB."
  - "Merge."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 1b7584683947d057ef49652d76399aa20a3bbafd, STOP."
  - "Si la rama deja de estar basada exactamente en ese main, STOP."
  - "Si aparecen cambios nuevos de producto posteriores a c2320239adbd84c972f80ee25abc7f790834e7cd, STOP."
  - "Si el PR no es mergeable, STOP."
  - "No rebase."
  - "No merge."

acceptance_criteria:
  - "main exacto."
  - "ahead 2 / behind 0 antes del commit G4."
  - "Solo commit documental G4 adicional."
  - "PR abierto."
  - "PR base/head correctos."
  - "PR mergeable."
  - "No merge."
  - "No deploy."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-ARR-IGF-DIARIO-RESULT-PARITY-066-R1.md"