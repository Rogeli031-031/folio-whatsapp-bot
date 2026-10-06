task_id: "FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1"

title: "Alinear Venta y Resultado Final de ARR/IGF acumulado con AG TOTAL MES"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Corregir 066 para que, desde octubre 2026, la Venta financiera y
  Resultado Final mostrados en IGF Diario acumulado y ARR provengan
  exactamente de la misma semántica TOTAL MES del IGF Diario.
  Resultado Final / Rentabilidad debe coincidir con AG TOTAL MES.
  Septiembre 2026 y anteriores permanecen sin cambios.

base_sha: "1b7584683947d057ef49652d76399aa20a3bbafd"

branch: "fix/arr-igf-diario-result-parity-066-r1"

effective_from:
  year: 2026
  month: 10

problem_evidence:
  production_example:
    plant: "GT Puebla"
    period: "2026-10"
    corte: "2026-10-06"

    current_dashboard:
      venta_ton: 1166.76
      resultado_final_importe: 225470
      arr_rentabilidad: 225470

    excel_total_mes:
      venta_kg_B: 1164953
      margen_H_display: 6.39
      gasto_corporativo_J: 953777.33
      inversiones_K: 144297.15
      impuestos_federales_L: 422193.00
      operativos_U: 1620506.29
      hg_Z_display: -0.41
      descuento_AD_display: -4.27
      resultado_AG: -201192

    note: >
      Los valores visibles están redondeados. La aceptación no debe
      reconstruir AG usando los valores visuales redondeados; debe usar
      la misma precisión diaria/mensual que alimenta el IGF Diario.

root_causes:
  - >
    frontend-dashboard/lib/igf-october-mini.js conserva row.ventaTon
    del mini/pronóstico anterior en vez de usar financials.ventaTon,
    aunque 066 ya calcula ventaTon equivalente a B TOTAL MES.
  - >
    Resultado Final actualmente calcula ingreso - operativos - corporativos,
    pero desde 066 Corporativos = J+K. Por lo tanto Impuestos Federales L
    quedaron correctamente fuera de Corporativos pero también quedaron
    fuera del Resultado Final.
  - >
    Excel mantiene los Impuestos Federales dentro del flujo que termina
    en AG, por lo que el Resultado Final de dashboard debe restarlos una
    sola vez como concepto independiente.

north_star:
  from_october_2026:
    - "IGF Diario acumulado Venta = B TOTAL MES / 1000."
    - "ARR Venta = B TOTAL MES / 1000."
    - "IGF Diario acumulado Resultado Final - Importe = AG TOTAL MES."
    - "ARR Rentabilidad = AG TOTAL MES cuando no existe simulación ARR que deba alterar la rentabilidad."
    - "No doble contabilización de Impuestos."
    - "Corporativos sigue siendo J+K."
    - "Gasto visible sigue siendo Operativos + Corporativos."
    - "Impuestos sigue visible en su propia columna como L/B."

historical_gate:
  rule: >
    Aplicar 066-R1 únicamente a periodos >= 2026-10.
    Septiembre 2026 y anteriores conservan exactamente la lógica legacy.

venta_contract:
  october_plus:
    source: "financials.ventaTon"
    semantic_source: "B TOTAL MES / 1000"
    requirements:
      - "No usar row.ventaTon como fuente financiera cuando exista contrato 066."
      - "No usar forecastRow.venta_ton para sustituir B TOTAL MES."
      - "No fallback silencioso a venta legacy en octubre+."
      - "Si financials.ventaTon falta, devolver null/incompleto."

  legacy:
    - "Antes de octubre conservar venta actual."

expense_contract:
  operativos:
    formula: >
      presupuesto_nomina_gastos +
      presupuesto_imss_sua +
      extraordinarios +
      provisiones_planta
    equivalent: "U mensual"

  corporativos:
    formula: >
      gasto_corporativo +
      inversiones
    equivalent: "J + K"
    excluded:
      - "impuestos_federales"

  impuestos:
    amount: "impuestos_federales"
    per_kg: "impuestos_federales / venta_kg_TOTAL_MES"
    equivalent: "L / B"

  gasto_visible:
    formula: "operativos + corporativos"
    requirements:
      - "No sumar impuestos dentro de GASTO."
      - "No cambiar lo solicitado en 066."

result_contract:
  october_plus:
    ingreso_importe: >
      (margenKg + comDescKg - hgKg) * ventaKg

    utilidad_operacion: >
      ingresoImporte - operativosImporte

    resultado_final_importe: >
      utilidadOperacion
      - corporativosImporte
      - impuestosFederalesImporte

    equivalent_expanded: >
      ingresoImporte
      - operativosImporte
      - corporativosImporte
      - impuestosFederalesImporte

    excel_equivalence: >
      Debe ser equivalente semánticamente al AG TOTAL MES del IGF Diario,
      usando los mismos componentes y la misma Venta TOTAL MES.

  requirements:
    - "Impuestos Federales se resta exactamente una vez."
    - "No volver a meter Impuestos dentro de Corporativos."
    - "No volver a meter Impuestos dentro de Gasto visible."
    - "No restar impuesto_kg además del importe mensual."
    - "No usar valores de pantalla redondeados para calcular resultado."
    - "Usar valores numéricos de precisión completa."

excel_formula_evidence:
  daily:
    - "M = J + K + L"
    - "O = H - M"
    - "W = O - U"
    - "AB = W - Z"
    - "AF = AB + AD"
    - "AG = AF * B"
  month:
    - "AG TOTAL MES suma el resultado monetario de semanas/días."
    - "AF TOTAL MES = AG TOTAL MES / B TOTAL MES."
  implication: >
    Si ARR presenta Corporativos como J+K e Impuestos en columna separada,
    para conservar equivalencia con AG debe restar L una vez en Resultado Final.

frontend_contract:
  file: "frontend-dashboard/lib/igf-october-mini.js"

  applyFinancialsToMiniRow:
    venta:
      before: "row.ventaTon"
      after: "financials.ventaTon para contrato octubre+"

    impuestos:
      denominator: "financials.ventaKg / financials.ventaTon"
      requirement: >
        El $/kg de Impuestos debe usar la misma Venta TOTAL MES,
        no la venta legacy del mini.

    ingreso:
      requirement: "Calcular con venta TOTAL MES."

    resultado:
      before: "utilOperImporte - corporativos"
      after: "utilOperImporte - corporativos - impuestosFederalesImporte"

  output:
    - "ventaTon"
    - "margen"
    - "comDesc"
    - "hgKg"
    - "hgPct"
    - "hgDollar"
    - "impuestos"
    - "ingreso"
    - "operativos"
    - "corporativos"
    - "gasto"
    - "utilOperImporte"
    - "resultadoFinalImporte"

arr_contract:
  file: "frontend-dashboard/app/arr/ArrClient.tsx"

  requirements:
    - >
      Desde octubre computeRowValues continúa leyendo la mini financiera,
      ahora corregida por 066-R1.
    - "ARR Venta debe ser la misma venta TOTAL MES."
    - "ARR Rentabilidad debe usar resultadoFinalImporte corregido."
    - >
      No rediseñar fórmulas de simulación ARR/ARR Plan que explícitamente
      modifican venta/clientes; solo corregir la base financiera sin simulación.
    - "Septiembre conserva lógica legacy."

igf_accumulated_contract:
  requirements:
    - "Venta de fila planta debe mostrar financials.ventaTon."
    - "Resultado Final - Importe debe usar resultadoFinalImporte corregido."
    - "Zona Provincia suma resultados corregidos por planta."
    - "Zona Venta suma las ventas TOTAL MES por planta."
    - "No modificar Margen/Descuento/HG/Operativos/Corporativos ya corregidos por 066."

unchanged_066_contract:
  - "Margen = H TOTAL MES."
  - "Com. y Desc. = AD TOTAL MES."
  - "Pronóstico Desc. PROY = AD TOTAL MES."
  - "Operativos = Q+R+S+T."
  - "Corporativos = J+K."
  - "Impuestos = L/B."
  - "HG$ = F+G."
  - "HG pct = (Z/(F+G))*-1."
  - "HG $/kg = Z."
  - "PROM/lookback intactos."
  - "065-R1 intacto."
  - "064-R1 intacto."
  - "Excel intacto."

missing_data_contract:
  - "Si venta TOTAL MES es null, resultado financiero queda null."
  - "Si operativos falta, resultado queda null."
  - "Si corporativos J/K falta, resultado queda null."
  - "Si impuestos federales L falta, resultado queda null."
  - "No asumir impuesto = 0."
  - "0 explícito sí es válido."
  - "No fallback legacy silencioso desde octubre."

precision_contract:
  - "No calcular usando 6.39, -4.27, -0.41 visuales si internamente existen más decimales."
  - "Usar valores completos provenientes del helper 066."
  - "Redondear solo en presentación/final según contrato existente."
  - "La comparación contra AG debe tolerar únicamente el redondeo monetario final esperado."

production_acceptance_puebla:
  period: "2026-10"
  cut_example: "2026-10-06"

  expected:
    - "Venta dashboard debe pasar de la fuente 1166.76 legacy a B TOTAL MES / 1000."
    - "En la evidencia actual B TOTAL MES es aproximadamente 1164.953 ton."
    - "Corporativos permanece aproximadamente 1,098,074 = J+K."
    - "Impuestos permanece aproximadamente 0.36 $/kg = L/B."
    - "Gasto visible permanece Operativos + Corporativos."
    - "Resultado Final ya no debe quedar positivo en 225,470 con esos datos."
    - "Resultado Final debe coincidir con AG TOTAL MES del Excel."
    - "En la captura actual AG TOTAL MES es aproximadamente -201,192."
    - "ARR Rentabilidad debe coincidir con ese mismo Resultado Final."
  note: "Ningún importe de este ejemplo puede hardcodearse."

production_acceptance_all_plants:
  for_each:
    - "GT Puebla"
    - "Tehuacan"
    - "Acapulco"
    - "GTM Queretaro"
    - "GTM San Luis"
    - "Morelos"

  validate:
    - "Venta = B TOTAL MES / 1000."
    - "Resultado Final mini = AG TOTAL MES."
    - "ARR Rentabilidad base = AG TOTAL MES."
    - "Corporativos = J+K."
    - "Impuestos no incluidos en Corporativos."
    - "Impuestos sí restados una vez del Resultado Final."

performance_contract:
  - "No nueva petición HTTP por planta."
  - "No nueva query DB por planta."
  - "No N+1."
  - "Usar financials ya incluido en 066."
  - "No leer Excel para calcular Resultado."
  - "No generar Excel internamente para obtener B/AG."

recommended_files:
  - "frontend-dashboard/lib/igf-october-mini.js"
  - "frontend-dashboard/app/arr/ArrClient.tsx solo si realmente es necesario"
  - "test/arr-igf-diario-result-parity-066-r1.test.js"
  - "test/arr-igf-diario-financial-sources-066.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1.md"

forbidden_product_changes:
  - "Modificar lib/igf-diario-expense-excel.js salvo prueba que demuestre defecto del Excel."
  - "Cambiar layout del Excel."
  - "Cambiar J/K/L/M."
  - "Cambiar Q/R/S/T/U."
  - "Cambiar AD."
  - "Cambiar Z."
  - "Cambiar Pronóstico."
  - "Cambiar Margen 065-R1."
  - "Cambiar distribución 064-R1."
  - "Reclasificar Impuestos dentro de Corporativos."
  - "Sumar Impuestos a Gasto visible."
  - "Hardcodear Puebla o -201192."
  - "Hardcodear fila 48."
  - "Parsing XLSX."

mandatory_tests:
  - "Octubre usa financials.ventaTon."
  - "Septiembre conserva venta legacy."
  - "Impuestos $/kg usa la venta TOTAL MES."
  - "Corporativos = J+K."
  - "Gasto visible = Operativos + Corporativos."
  - "Resultado Final = Ingreso - Operativos - Corporativos - Impuestos Federales."
  - "Impuestos se resta una sola vez."
  - "No impuesto doble."
  - "Impuesto 0 explícito funciona."
  - "Impuesto null produce resultado null."
  - "Venta null produce resultado null."
  - "Fixture con precisión completa coincide con AG equivalente."
  - "No usar valores visuales redondeados."
  - "Zona suma resultados corregidos."
  - "ARR obtiene resultadoFinalImporte de mini corregida."
  - "ARR sin simulación coincide con mini."
  - "Comparación Sep/Oct sigue correcta."
  - "066 PASS."
  - "065-R1 PASS."
  - "065 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "Excel 036-044 y relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

out_of_scope:
  - "Cambiar Pronóstico."
  - "Cambiar forecast de venta."
  - "Cambiar descuento."
  - "Cambiar margen."
  - "Cambiar HG."
  - "Cambiar gastos manuales."
  - "Writes productivos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 1b7584683947d057ef49652d76399aa20a3bbafd, STOP."
  - "Si para lograr paridad es necesario modificar fórmulas del Excel, STOP y reportar evidencia."
  - "Si el helper 066 no contiene Venta TOTAL MES suficiente, STOP antes de inventar otra fuente."
  - "Si se requiere fallback legacy para octubre, STOP."
  - "Si una corrección rompe septiembre, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1.md"