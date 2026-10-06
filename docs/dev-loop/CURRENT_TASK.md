task_id: "IMPL-ARR-IGF-DIARIO-FINANCIAL-SOURCES-066"

title: "Unificar ARR, Pronóstico e IGF Diario con los cierres mensuales del IGF Diario desde octubre 2026"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Desde octubre 2026, hacer que las métricas financieras base del ARR
  provengan de la misma semántica mensual TOTAL MES del IGF Diario,
  incluyendo los valores efectivos/proyectados del mismo corte.
  Deben quedar alineados IGF Diario acumulado, ARR y Pronóstico para
  Margen, Descuento, Operativos, Corporativos, Impuestos, HG y HG$.
  Meses anteriores a octubre 2026 deben conservar exactamente el
  comportamiento legacy actual.

base_sha: "67e13b780c0301e31fa7f27c2ed0de1eb3f3df59"

branch: "implementation/arr-igf-diario-financial-sources-066"

effective_from:
  year: 2026
  month: 10

historical_gate:
  rule: >
    Aplicar el nuevo contrato únicamente a periodos >= 2026-10.
    2026-09 y anteriores permanecen exactamente con las fuentes y
    fórmulas anteriores del ARR, Pronóstico e IGF.
  requirements:
    - "No reescribir históricos."
    - "No alterar snapshots legacy."
    - "Comparar septiembre vs octubre debe permitir contratos distintos."

north_star:
  description: >
    Para una misma planta, mes y corte, desde octubre 2026 deben coincidir
    semánticamente Pronóstico, IGF Diario acumulado, ARR y Excel.
  example:
    - "Si AD TOTAL MES del Excel = -4.32, Pronóstico Desc. PROY = -4.32."
    - "IGF Diario acumulado Com. y Desc. = -4.32."
    - "ARR DESCUENTO = -4.32."
  forbidden:
    - "Dos cálculos mensuales paralelos para el mismo descuento."
    - "Hardcodear fila 48."
    - "Leer/parsing del archivo XLSX generado para obtener los valores."

semantic_total_month:
  rule: >
    No usar números de fila literales como H48, AD48, etc.
    Calcular el equivalente semántico de la fila TOTAL MES desde las
    mismas series diarias que alimentan el Excel.

  excel_mapping_october:
    B: "VENTA KG TOTAL MES"
    F: "COSTO KG TOTAL MES"
    G: "FLETE KG TOTAL MES"
    H: "MARGEN BRUTO TOTAL MES"
    J: "Gasto Corporativo TOTAL MES"
    K: "Inversiones TOTAL MES"
    L: "Impuestos Federales TOTAL MES"
    M: "J+K+L, solo referencia Excel"
    Q: "Presupuesto Nómina/Gastos TOTAL MES"
    R: "Presupuesto IMSS/SUA TOTAL MES"
    S: "Extraordinarios TOTAL MES"
    T: "Provisiones de la Planta TOTAL MES"
    U: "Q+R+S+T"
    Z: "HG $/KG TOTAL MES"
    AD: "C&D TOTAL MES"

  weighted_rule:
    description: >
      Las métricas $/kg mensuales deben usar la misma ponderación por
      Venta KG de writeDetailedTotal/weightedRows del Excel.
    formula: >
      SUM(valor_diario * venta_kg_diaria) /
      SUM(venta_kg_diaria)
    null_semantics:
      - "Solo incluir días con valor y Venta KG numéricos."
      - "No convertir null/vacío a 0."
      - "0 explícito sí es numérico."

new_monthly_financial_contract:
  venta:
    arr_field: "VENTA"
    source: "B TOTAL MES / 1000"
    note: >
      Mantener la misma venta proyectada del IGF Diario/Pronóstico que
      ya alimenta el mini-resumen.

  margen:
    arr_field: "MARGEN"
    mini_field: "margen"
    source: "H TOTAL MES"
    formula: >
      SUM(MargenBrutoDia * VentaKgDia) /
      SUM(VentaKgDia)
    requirements:
      - "Debe reflejar overrides C/F/G de 065-R1."
      - "No promedio simple."

  descuento:
    arr_field: "DESCUENTO"
    mini_field: "comDesc"
    pronostico_field: "proy_desc_kg"
    source: "AD TOTAL MES"
    formula: >
      SUM(C&D_diario_efectivo * VentaKgDia) /
      SUM(VentaKgDia)
    requirements:
      - "Preservar signo original."
      - "No usar abs()."
      - "No invertir el signo nuevamente."
      - "Pronóstico, mini y ARR deben devolver el mismo valor."
      - "El lookback/PROM sigue construyendo los días futuros."
      - >
        La diferencia es que el resumen mensual final se calcula una sola
        vez a granularidad diaria, exactamente como AD TOTAL MES.
      - "Eliminar redondeos intermedios que produzcan -4.28 vs -4.32."

  operativos:
    arr_field: "OPERATIVOS"
    mini_field: "operativos"
    source: "importe mensual efectivo de Operativos"
    formula: >
      Presupuesto Nómina/Gastos +
      Presupuesto IMSS/SUA +
      Extraordinarios +
      Provisiones de la Planta
    equivalent: "U3 / monto mensual efectivo del grupo"
    requirements:
      - "Usar overrides/desglose 064 y rebalanceo 064-R1."
      - "No tomar el valor legacy del compromiso para octubre+."

  corporativos:
    arr_field: "CORPORATIVOS"
    mini_field: "corporativos"
    source: "Gasto Corporativo + Inversiones"
    formula: >
      gasto_corporativo_mensual + inversiones_mensual
    excluded:
      - "Impuestos Federales"
    requirements:
      - "Impuestos Federales NO forma parte de CORPORATIVOS desde octubre."
      - "No volver a sumarlo indirectamente en CORPORATIVOS."
      - >
        Si no se puede separar Corporativos de Impuestos con evidencia
        suficiente, marcar fuente incompleta; no inventar distribución.

  gasto:
    arr_field: "GASTO"
    mini_field: "gasto"
    formula: "OPERATIVOS + CORPORATIVOS"
    requirements:
      - "Impuestos Federales queda fuera de GASTO."
      - "No doble-contabilizar Impuestos."

  impuestos:
    arr_field: "IMPUESTOS"
    mini_field: "impuestos"
    source: "Impuestos Federales mensual / Venta KG proyectada TOTAL MES"
    formula: >
      impuestos_federales_mensual / venta_kg_total_mes
    equivalent: "L TOTAL MES"
    requirements:
      - "Si venta kg <= 0, null."
      - "Preservar precisión del cálculo."
      - "No usar el impuesto legacy del compromiso para octubre+."

  hg_dollar:
    arr_field: "HG$"
    source: "F TOTAL MES + G TOTAL MES"
    formula: "costo_kg_total_mes + flete_kg_total_mes"
    requirements:
      - "No reconstruir HG$ como abs(HGkg/HGpct) desde octubre+."
      - "Usar directamente F+G."

  hg_kg:
    source: "Z TOTAL MES"
    mini_field: "hgKg"
    requirements:
      - "Conservar signo de Z."
      - "IGF Diario acumulado puede seguir mostrando Z como HG - $/Kg."

  hg_pct:
    arr_field: "HG"
    internal_unit: "ratio decimal"
    formula: >
      (Z_TOTAL_MES / (F_TOTAL_MES + G_TOTAL_MES)) * -1
    display_contract: >
      ARR actualmente presenta HG en puntos porcentuales, por lo que
      el frontend sigue mostrando hg_pct * 100.
    requirements:
      - "Si F+G es 0 o falta un componente, hg_pct = null."
      - "No usar el hg_pct legacy para octubre+."
      - "HG$ debe ser exactamente F+G."

downstream_calculation_contract:
  rule: >
    No rediseñar las fórmulas actuales de Rentabilidad,
    Rentabilidad Final - Importe, Utilidad, Resultado u otras métricas
    derivadas del ARR. Solo sustituir las fuentes base indicadas por 066.
  requirements:
    - "Mantener las fórmulas existentes."
    - "Permitir que se recalculen naturalmente con los nuevos inputs."
    - "No agregar ni quitar componentes de la fórmula final salvo el cambio explícito de fuentes."
    - "No restar Impuestos dos veces."
    - "No volver a incluir Impuestos dentro de Corporativos."

igf_diario_acumulado_contract:
  from_2026_10:
    venta: "B TOTAL MES / 1000"
    margen: "H TOTAL MES"
    comDesc: "AD TOTAL MES"
    operativos: "importe mensual U"
    corporativos: "Gasto Corporativo + Inversiones"
    impuestos: "Impuestos Federales mensual / B TOTAL MES"
    hgKg: "Z TOTAL MES"
    hgDollar: "F TOTAL MES + G TOTAL MES"
    hgPct: "(Z/(F+G))*-1"

  recalculation:
    - "INGRESO conserva la fórmula vigente."
    - "GASTO = OPERATIVOS + CORPORATIVOS."
    - "Util. Operación conserva la fórmula vigente."
    - "Resultado Final conserva la fórmula vigente."
    - "No doble contabilizar Impuestos."

  zona:
    - "Venta suma plantas."
    - "Margen ponderado por Venta KG."
    - "Com. y Desc. ponderado por Venta KG."
    - "Impuestos ponderado por Venta KG."
    - "HG - $/Kg ponderado según contrato existente."
    - "Importes suman plantas."
    - "No inventar datos faltantes."

arr_contract:
  october_plus:
    rule: >
      frontend-dashboard/app/arr/ArrClient.tsx debe usar la fuente
      IGF Diario mensual para las métricas de 066, no los campos
      legacy de forecastRow.

    fields:
      ventaTon: "mini/IGF Diario"
      margenKg: "H TOTAL MES"
      comDescKg: "AD TOTAL MES"
      operativos: "U mensual"
      corporativos: "J+K mensual"
      gastoImporte: "Operativos + Corporativos"
      impuestoKg: "L mensual / B TOTAL MES"
      hgKg: "Z TOTAL MES"
      hgPct: "(Z/(F+G))*-1"
      hgDollar: "F+G"
      rentabilidadImporte: "resultado derivado con fórmula actual"

    sign:
      discount: >
        Desde octubre usar el valor firmado de AD TOTAL MES directamente.
        No aplicar -Math.abs() al nuevo contrato.
      legacy: >
        Antes de octubre preservar exactamente el comportamiento de signo
        existente.

  comparison:
    - "Septiembre puede usar legacy."
    - "Octubre usa 066."
    - "La fila COMPARACIÓN sigue siendo Octubre - Septiembre."
    - "No normalizar septiembre con las reglas nuevas."

pronostico_contract:
  from_2026_10:
    field: "proy_desc_kg"
    source: "mismo cálculo mensual equivalente a AD TOTAL MES"
    requirements:
      - "Desc. PROY debe coincidir con IGF Diario acumulado Com. y Desc."
      - "Desc. PROY debe coincidir con ARR DESCUENTO."
      - "No quitar la selección de días del PROM."
      - "No quitar lookback."
      - "No quitar proyección por día de semana."
      - >
        Lookback/PROM siguen determinando el C&D de los días futuros;
        la salida mensual se pondera después a nivel diario con la Venta KG
        efectiva/proyectada.
      - "No usar un segundo algoritmo de resumen mensual."
      - "Guardar y actualizar mini-resumen debe conservar esta paridad."

  legacy:
    - "Antes de octubre conservar computePronosticoProyByPlant legacy."

shared_source_design:
  requirement: >
    Centralizar el cálculo semántico TOTAL MES en un helper reutilizable.
    No copiar fórmulas distintas entre Pronóstico, acumulado y ARR.

  recommended_module: "lib/igf-diario-monthly-financials.js"

  recommended_output:
    - "ventaKg"
    - "ventaTon"
    - "precioKg opcional para evidencia"
    - "costoKg"
    - "fleteKg"
    - "margenKg"
    - "comDescKg"
    - "hgKg"
    - "hgDollar"
    - "hgPct"
    - "operativosImporte"
    - "gastoCorporativoImporte"
    - "inversionesImporte"
    - "impuestosFederalesImporte"
    - "corporativosImporte"
    - "impuestoKg"
    - "gastoImporte"

  requirements:
    - "Consumir las mismas series diarias que IGF Diario."
    - "Consumir los overrides de 065-R1."
    - "Consumir el desglose mensual efectivo 064."
    - "No generar Excel para obtener los totales."
    - "No leer celdas físicas del XLSX."
    - "No hardcodear filas."

discount_daily_parity:
  closed_days:
    rule: >
      Para fecha < corte usar el C&D real actual de Provincia Comisiones.

  projected_days:
    rule: >
      Para fecha >= corte usar exactamente el C&D proyectado que hoy
      utiliza Provincia Comisiones/IGF Diario para esa fecha, derivado
      del PROM/lookback seleccionado.

  month_summary:
    rule: >
      Después de materializar cada día del mes, calcular una sola
      ponderación mensual AD-equivalente.
    forbidden:
      - "Redondear primero por DOW y luego volver a ponderar si cambia el resultado."
      - "Construir proy_desc_kg con un resumen diferente al usado por AD TOTAL MES."

expense_source_contract:
  detailed_group:
    corporate:
      components:
        - "gasto_corporativo"
        - "inversiones"
      taxes:
        - "impuestos_federales"

    operative:
      components:
        - "presupuesto_nomina_gastos"
        - "presupuesto_imss_sua"
        - "extraordinarios"
        - "provisiones_planta"

  fallback:
    rule: >
      No usar el agregado Corporativos 062 como si fuera J+K cuando
      Impuestos Federales no puede separarse.
    valid_cases:
      - "J y K explícitos disponibles."
      - >
        O bien agregado total corporativo e Impuestos Federales conocidos
        de forma independiente, de modo que J+K pueda derivarse sin inventar.
    invalid:
      - "No separar impuestos por estimación."
      - "No asumir Impuestos=0."

missing_data_contract:
  october_plus:
    - "Si una métrica 066 no puede derivarse, retornar null y evidencia de componente faltante."
    - "No caer silenciosamente al valor legacy para octubre+."
    - "No mezclar fuente legacy y TOTAL MES dentro de la misma métrica."
  ui:
    - "Mantener la aplicación estable."
    - "Mostrar/propagar faltante cuando aplique en vez de inventar valor."

plant_identity_contract:
  - "Preservar equivalencias 063-R1."
  - "Puebla ↔ GT Puebla."
  - "Tehuacan ↔ Tehuacán."
  - "Queretaro ↔ Querétaro ↔ GTM Queretaro."
  - "San Luis ↔ GTM San Luis."
  - "Acapulco."
  - "Morelos."
  - "No hardcodear lógica exclusiva de una planta."

api_contract:
  igf_diario_acumulado:
    path: "GET /api/dashboard/igf-diario-acumulado"
    extend_rows_with:
      - "com_desc"
      - "costo_kg_total"
      - "flete_kg_total"
      - "hg_kg_total"
      - "hg_dollar"
      - "hg_pct"
      - "operativos_importe"
      - "gasto_corporativo_importe"
      - "inversiones_importe"
      - "impuestos_federales_importe"
      - "corporativos_importe"
      - "impuesto_kg"
      - "venta_kg_total"
    note: >
      Nombres finales pueden variar si se conserva compatibilidad,
      pero el contrato semántico debe existir.

  mini:
    requirements:
      - >
        IgfForecastMiniRow debe transportar desde octubre los valores
        suficientes para que ARR no necesite volver a usar forecastRow
        para Margen/Descuento/HG/Impuestos.
      - "Agregar hgPct y hgDollar si es necesario."
      - "Preservar compatibilidad de clientes existentes."

  pronostico:
    path: "GET /api/dashboard/pronostico-detalle"
    requirements:
      - "proy_desc_kg usa cálculo AD-equivalente desde octubre."
      - "proy_venta_ton conserva su lógica salvo lo necesario para paridad."
      - "Respuesta mantiene forma compatible."

performance_contract:
  - "No generar una llamada HTTP adicional por planta desde ARR."
  - "No introducir N+1 para gastos/desglose."
  - "No introducir N+1 para C&D."
  - "No introducir N+1 para overrides 065-R1."
  - "Cargar datos mensuales compartidos en lote/cache cuando sea posible."
  - "IGF Diario acumulado debe seguir usando una sola petición frontend."
  - "Pronóstico de una planta puede usar su consulta puntual existente."

forecast_contract:
  - "No modificar lógica de venta PROY salvo necesidad técnica para compartir serie diaria."
  - "Días seleccionados del PROM siguen funcionando."
  - "Guardar selección sigue persistiendo."
  - "Recalcular venta forecast ARR sigue funcionando."
  - "Solo cambia el resumen mensual de descuento desde octubre."

065_r1_contract:
  - "Precio manual C sigue funcionando."
  - "Costo manual F sigue funcionando."
  - "Flete manual G sigue funcionando."
  - "Rangos independientes siguen funcionando."
  - "H sigue C-F-G."
  - "Los TOTAL MES F/G/H deben reflejar estos overrides."
  - "Estos cambios deben fluir automáticamente a ARR 066."

064_contract:
  - "Desglose mensual permanece."
  - "Distribución diaria permanece."
  - "Operativos 4 componentes permanecen."
  - "Corporativos 3 componentes permanecen en el Excel."
  - >
    Solo el concepto financiero ARR CORPORATIVOS excluye Impuestos Federales.
  - "No alterar J/K/L/M del Excel."
  - "No alterar Q/R/S/T/U del Excel."

excel_contract:
  rule: >
    No cambiar las fórmulas/layout del IGF Diario salvo que se necesite
    una corrección estrictamente para paridad. El Excel sigue siendo la
    referencia semántica.
  october:
    - "H TOTAL MES = Margen ARR."
    - "AD TOTAL MES = Descuento ARR/Pronóstico."
    - "U3 = Operativos importe."
    - "J3+K3 = Corporativos ARR."
    - "L3/B TOTAL MES = Impuestos ARR."
    - "F TOTAL MES + G TOTAL MES = HG$ ARR."
    - "(Z TOTAL MES/(F TOTAL MES+G TOTAL MES))*-1 = hg_pct ARR."
  forbidden:
    - "Hardcodear fila 48."
    - "Cambiar TOTAL MES a una posición fija."

acceptance_example_san_luis:
  period: "2026-10"
  expected_parity:
    - "Si AD TOTAL MES = -4.32 entonces Pronóstico Desc. PROY = -4.32."
    - "IGF Diario acumulado Com. y Desc. = -4.32."
    - "ARR DESCUENTO = -4.32."
  hg:
    formula: "(Z_TOTAL/(F_TOTAL+G_TOTAL))*-1"
    hg_dollar: "F_TOTAL+G_TOTAL"
  note: "No hardcodear -4.32 ni valores de San Luis."

mandatory_tests:
  - "066 gate: septiembre usa legacy."
  - "066 gate: octubre usa TOTAL MES."
  - "066 gate: noviembre usa TOTAL MES."
  - "Margen ARR = H TOTAL MES."
  - "Margen acumulado = H TOTAL MES."
  - "Descuento ARR = AD TOTAL MES."
  - "Com. y Desc. acumulado = AD TOTAL MES."
  - "Pronóstico proy_desc_kg = AD TOTAL MES."
  - "Pronóstico/mini/ARR descuento iguales para mismo corte."
  - "Descuento conserva signo negativo."
  - "Descuento positivo eventual conserva signo positivo."
  - "No -Math.abs para octubre+."
  - "Lookback/PROM sigue afectando días futuros."
  - "Cambiar selección PROM recalcula el mismo AD-equivalente."
  - "No redondeo DOW produce divergencia mensual."
  - "Operativos ARR = suma de cuatro conceptos / importe mensual U."
  - "Corporativos ARR = Gasto Corporativo + Inversiones."
  - "Impuestos Federales excluido de Corporativos."
  - "GASTO = Operativos + Corporativos."
  - "Impuestos ARR = impuestos federales / Venta KG TOTAL MES."
  - "Impuestos no se suman otra vez a Corporativos."
  - "HG$ = F TOTAL + G TOTAL."
  - "HG pct = (Z/(F+G))*-1."
  - "ARR display HG = hg_pct*100."
  - "Z conserva signo."
  - "F+G cero => hg_pct null."
  - "Overrides Precio 065-R1 cambian H TOTAL y ARR Margen."
  - "Overrides Costo 065-R1 cambian F/H/HG$ y ARR."
  - "Overrides Flete 065-R1 cambian G/H/HG$ y ARR."
  - "HG de 066 no usa hg_pct legacy."
  - "Rentabilidad usa fórmulas actuales con nuevos inputs."
  - "Rentabilidad Final - Importe conserva fórmula actual."
  - "No doble cuenta de Impuestos."
  - "Comparación Sep/Oct calcula Octubre - Septiembre."
  - "Septiembre no cambia visualmente."
  - "Zona Provincia pondera Margen/Desc/Impuestos."
  - "Zona Provincia suma importes."
  - "Tehuacan/Tehuacán paridad."
  - "GTM Queretaro/Querétaro paridad."
  - "San Luis/GTM San Luis paridad."
  - "No hardcode TOTAL MES row."
  - "No parsing del XLSX."
  - "No N+1 nuevo."
  - "Pronóstico de venta sigue funcionando."
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
  - "Excel 036-044 y regresiones relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-monthly-financials.js nuevo"
  - "lib/igf-diario-grafica.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-expense-excel.js solo si helper compartido lo requiere"
  - "lib/igf-diario-gastos-desglose.js"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/app/arr/ArrClient.tsx"
  - "test/arr-igf-diario-financial-sources-066.test.js"
  - "tests Pronostico afectados"
  - "tests acumulado afectados"
  - "tests ARR afectados"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-ARR-IGF-DIARIO-FINANCIAL-SOURCES-066.md"

out_of_scope:
  - "Cambiar fórmula de Venta."
  - "Eliminar lookback."
  - "Eliminar PROM."
  - "Rediseñar Rentabilidad."
  - "Modificar captura de Precio/Costo/Flete 065-R1."
  - "Modificar distribución de gastos 064-R1."
  - "Modificar meses anteriores a octubre 2026."
  - "Modificar CONTROL DE COMPRAS."
  - "Writes productivos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

forbidden_actions:
  - "git push origin main"
  - "merge a main"
  - "deploy"
  - "hardcodear AD48/H48/F48/G48/Z48"
  - "hardcodear -4.32"
  - "leer XLSX generado para obtener totales"
  - "usar fallback legacy silencioso en octubre+"
  - "volver a incluir Impuestos Federales dentro de Corporativos"
  - "doble contabilizar Impuestos"
  - "usar abs para el descuento nuevo"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-ARR-IGF-DIARIO-FINANCIAL-SOURCES-066.md"