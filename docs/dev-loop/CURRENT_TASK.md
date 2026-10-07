task_id: "FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1"

title: "Corregir semana San Luis, agregar RESUMEN Excel y alinear gráfica 5D con semana actual"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Corregir tres discrepancias detectadas después de IMPL 069:

  1. Una planta con un día sin venta dentro de la semana no debe perder
     toda la información semanal. Caso visible: San Luis, semana
     04/10/2026–10/10/2026.

  2. El Excel descargado para una planta debe tener como primera hoja una
     hoja llamada RESUMEN con la misma tabla semanal del dashboard y una
     gráfica de esa semana.

  3. El rango 5D de la gráfica abierta desde IGF Diario semanal debe usar
     cinco días de la semana seleccionada domingo-sábado, no los últimos
     cinco días del mes.

base_sha: "f50e61356325b13be289beb4e6354b52634f5eee"

branch: "fix/igf-diario-weekly-coverage-resumen-5d-069-r1"

###############################################################################
# A. SAN LUIS / AGREGACIÓN SEMANAL
###############################################################################

observed_problem:
  plant: "San Luis"

  week:
    from: "2026-10-04"
    to: "2026-10-10"

  dashboard:
    all_plants:
      symptom: >
        San Luis muestra — en Venta, Precio, Ingreso, Costo, Flete, Margen,
        gastos y Resultado, aunque existe información diaria.

    individual:
      symptom: >
        La columna Semana aparece — para prácticamente todas las métricas,
        aunque lunes-sábado muestran datos.

  excel_evidence:
    sunday_2026_10_04:
      venta: null
      precio: "existe"
      costo: "existe"
      flete: "existe"

    following_days:
      rule: "Existen ventas y valores financieros."

root_cause:
  module: "lib/igf-diario-weekly-plant.js"

  functions:
    - "aggregateWeek"
    - "sumOf"
    - "weighted"
    - "weekDayRecords"

  explanation: >
    sumOf actualmente retorna null al encontrar cualquier día nulo.
    weighted también invalida la métrica si ventaKg es null en cualquier día.
    Por tanto, un domingo sin venta invalida todo el subtotal Domingo-Sábado.

san_luis_sanity_fixture:
  visible_sales:
    "2026-10-04": null
    "2026-10-05": 16585
    "2026-10-06": 19286
    "2026-10-07": 24210
    "2026-10-08": 30260
    "2026-10-09": 22960
    "2026-10-10": 29730

  expected_week_venta_kg: 143031

  rule: >
    El null del domingo NO se convierte a cero en los datos diarios.
    Simplemente no debe invalidar la agregación semanal.

weekly_aggregation_contract:
  principle: >
    Un día sin venta no invalida una semana que sí tiene días con venta.
    Pero una métrica faltante en un día que sí tiene venta positiva continúa
    siendo una falta real de cobertura.

  venta_kg:
    rule: >
      Sumar todos los valores numéricos conocidos de venta.
      Ignorar null para la suma.
      Si no existe ningún valor numérico de venta en toda la semana,
      resultado = null.

    important:
      - "No mutar null a 0 en el día."
      - "0 explícito continúa siendo 0 válido."

  positive_sale_day:
    definition: "ventaKg numérico y > 0"

  ingreso_mxn:
    rule: >
      Sumar ingreso de los días con venta positiva.
      Si un día con venta positiva no puede calcular ingreso por falta de
      precio, el ingreso semanal queda null.
      Un día sin venta no invalida el ingreso semanal.

  weighted_metrics:
    apply_to:
      - "precio_kg"
      - "costo_kg"
      - "flete_kg"
      - "margen_kg"
      - "com_desc_kg"

    rule: >
      Ponderar únicamente por días con venta positiva.
      Si un día con venta positiva carece de la métrica requerida,
      devolver null.
      Un día sin venta no participa en numerador ni denominador.

  expense_components:
    rule: >
      Mantener los importes diarios programados y su agregación existente.
      Los días inhábiles con importe 0 permanecen 0.
      No crear gasto a partir de null.

  hg_mxn:
    rule: >
      Sumar los importes HG numéricos del periodo, aunque el día no tenga
      venta, igual que la fila de importe HG del Excel.

  hg_kg:
    rule: >
      Para el valor por kg usar solamente días con venta positiva.
      Un HG de un día sin venta no genera por sí mismo un $/kg artificial.

  resultado_mxn:
    rule: >
      Sumar los resultados diarios calculables de los días con venta positiva.
      Días sin venta no invalidan la suma.
      Si un día con venta positiva no tiene Resultado calculable, Resultado
      semanal queda null.

  resultado_kg:
    authoritative_rule: >
      Cuando existen Resultado Importe semanal y Venta semanal > 0:
      Resultado $/kg = Resultado Importe / Venta.
      Esta identidad debe cumplirse con precisión completa.

null_semantics:
  - "No global null->0."
  - "No rellenar una venta faltante."
  - "No esconder una falta en un día con venta positiva."
  - "Un domingo sin venta no es equivalente a falta financiera de toda la semana."

###############################################################################
# B. MÉTRICAS DEL DÍA SIN VENTA
###############################################################################

daily_display_contract:
  problem: >
    weekDayRecords actualmente llama aggregateWeek([day]), por lo que un día
    sin venta elimina también Precio, Costo, Flete y Margen aunque esos datos
    sí existan en la fuente/Excel.

  new_rule: >
    Construir las métricas diarias desde los datos del propio día y no usar
    la agregación semanal como sustituto de una fila diaria.

  independent_metrics:
    - "precio_kg puede mostrarse aunque venta sea null."
    - "costo_kg puede mostrarse aunque venta sea null."
    - "flete_kg puede mostrarse aunque venta sea null."
    - "margen_kg = precio-costo-flete si los tres existen."

  sale_dependent_metrics:
    rule: >
      Ingreso, gastos por kg, HG por kg y Resultado que necesiten Venta
      permanecen null cuando Venta no existe o es 0, salvo un componente
      explícito de importe 0 cuya semántica diaria ya sea autoritativa.

  important:
    - "No inventar venta."
    - "No dividir entre cero."
    - "Mantener HG importe absoluto si existe."

###############################################################################
# C. EXCEL — HOJA RESUMEN
###############################################################################

excel_scope:
  endpoint: "GET /api/arr/dashboard-excel"

  applies_when:
    - "Existe plant_code / export individual de planta."

  does_not_change:
    - "Export Todas en esta corrección."
    - "Hojas existentes."
    - "Fórmulas existentes del IGF Diario."
    - "CONTROL DE COMPRAS."
    - "PRECIO."
    - "Pronóstico."
    - "IGF Forecast."

summary_sheet:
  name: "RESUMEN"
  position: 1

  critical_rule: >
    RESUMEN debe ser la primera hoja física del workbook.
    IGF Diario de la planta pasa a ser la segunda hoja.

  source: >
    Usar exactamente el mismo payload financiero que
    loadWeeklyPlant de 069-R1.
    No reconstruir fórmulas financieras por separado en Excel.

  selected_week:
    source_priority:
      - "week_anchor recibido desde la vista semanal."
      - "upload_day si no viene week_anchor."

    convention: "domingo-sábado"

  title:
    example: "IGF DIARIO SEMANAL · SAN LUIS"

  subtitle:
    example: "SEMANA 41 · 04/10/2026–10/10/2026"

summary_table:
  columns:
    - "Concepto"
    - "Semana"
    - "Dom dd/mm"
    - "Lun dd/mm"
    - "Mar dd/mm"
    - "Mié dd/mm"
    - "Jue dd/mm"
    - "Vie dd/mm"
    - "Sáb dd/mm"

  rows:
    - "Venta en Kilos"
    - "Precio de Venta al Público"
    - "Ingreso Generado"
    - "Costo del Gas LP"
    - "Flete Terrestre"
    - "Margen Bruto"
    - "Gasto Corporativo"
    - "Inversiones"
    - "Impuestos Federales"
    - "Margen Neto"
    - "Presupuesto Nómina/Gastos"
    - "Presupuesto IMSS/SUA"
    - "Extraordinarios"
    - "Provisiones de la Planta"
    - "Sobrante de Operación antes del HG"
    - "HG"
    - "Sobrante de Operación con el HG"
    - "Comisiones y Descuentos"
    - "RESULTADO ($/kg)"
    - "RESULTADO (Importe)"

  style:
    - "Misma jerarquía visual de 069."
    - "Separación entre bloques."
    - "Filas principales resaltadas."
    - "Negativos en rojo."
    - "Resultado positivo en verde."
    - "Formatos kg / $/kg / MXN correctos."
    - "Freeze panes si mejora navegación."

  values:
    rule: >
      Guardar números estáticos derivados del payload semanal exacto.
      No recalcular desde valores redondeados visibles.

###############################################################################
# D. GRÁFICA EN RESUMEN
###############################################################################

excel_chart:
  requirement: >
    La hoja RESUMEN debe incluir una gráfica de los siete días de la semana.

  default_metric: "resultado_mxn"

  selected_metric:
    rule: >
      Cuando el Excel se descarga desde la gráfica semanal de una fila,
      enviar summary_metric con la métrica seleccionada y graficar esa métrica.

  examples:
    - "resultado_mxn -> RESULTADO (Importe)"
    - "resultado_kg -> RESULTADO ($/kg)"
    - "venta_kg -> Venta en Kilos"
    - "margen_kg -> Margen Bruto"

  dates:
    - "Domingo"
    - "Lunes"
    - "Martes"
    - "Miércoles"
    - "Jueves"
    - "Viernes"
    - "Sábado"

  source:
    rule: "Usar exactamente weekly.days[].metrics[summary_metric]."

  implementation:
    preferred: >
      Generar una gráfica server-side como SVG y convertir a PNG usando
      `sharp`, que ya existe en package.json.
      Insertarla en RESUMEN mediante ExcelJS addImage/addImage positioning.

    no_new_dependency: true

  graph_contract:
    - "No screenshot del navegador."
    - "No servicio externo."
    - "No OCR."
    - "Gaps null permanecen gaps."
    - "Título identifica métrica y semana."
    - "La imagen se genera con valores sin redondear."
    - "El texto puede presentar redondeo visual."

  real_projected:
    preferred:
      - "Real en azul."
      - "Proyectado en ámbar/punteado."
    rule: "Conservar significado del corte."

###############################################################################
# E. PROPAGAR LA SEMANA AL EXCEL
###############################################################################

download_contract:
  current_behavior: >
    IgfDiarioGraficaModal abre excelUrl sin informar qué semana estaba
    seleccionada ni qué renglón/métrica originó la gráfica.

  new_params:
    week_anchor:
      type: "YYYY-MM-DD"
      source: "semana actualmente visible en IgfDiarioWeeklyPlantPanel"

    summary_metric:
      source: "seriesMetric"
      default: "resultado_mxn"

  frontend:
    - "IgfDiarioWeeklyPlantPanel pasa weekAnchor al modal."
    - "IgfDiarioGraficaModal agrega week_anchor y summary_metric al URL de descarga."
    - "No romper token/query existentes."
    - "Usar URL/URLSearchParams; no concatenación frágil."

  backend:
    - "Validar week_anchor."
    - "Validar summary_metric contra whitelist."
    - "Fallback week_anchor=upload_day."
    - "Fallback summary_metric=resultado_mxn."

###############################################################################
# F. 5D DE GRÁFICA
###############################################################################

five_day_problem:
  current_code:
    module: "lib/igf-diario-weekly-plant.js"
    function: "loadWeeklySeries"

  cause: >
    loadWeeklySeries define el fin de la ventana usando monthEnd(year, month).
    rangeWindow(..., 5d) termina tomando los últimos cinco días del mes.

  observed_bad_example:
    month: "Octubre 2026"
    displayed: "27/10–31/10"

five_day_contract:
  applies_to:
    - "Gráfica financiera abierta desde IGF Diario semanal."
    - "view=series."
    - "range=5d."

  selected_week:
    convention: "domingo-sábado"

  rule: >
    5D debe mostrar cinco días consecutivos pertenecientes a la semana
    seleccionada, empezando el domingo.

  example:
    selected_week: "04/10/2026–10/10/2026"
    expected_5d:
      from: "2026-10-04"
      to: "2026-10-08"

  previous_week_example:
    selected_week: "27/09/2026–03/10/2026"
    expected_5d:
      from: "2026-09-27"
      to: "2026-10-01"

  requirements:
    - "No usar monthEnd para 5D semanal."
    - "Puede cruzar mes."
    - "Respeta selected weekAnchor."
    - "Real/proyectado continúa dependiendo del corte."
    - "No cambiar 1M/3M/YTD/1A/5A/Todo en esta tarea."

  important: >
    Los cinco días pueden incluir días proyectados si están después del corte.
    Eso es correcto; lo incorrecto es saltar al cierre del mes.

###############################################################################
# G. CARGA DE DATOS PARA EXCEL
###############################################################################

weekly_excel_payload:
  backend_rule: >
    Reutilizar loadWeeklyPlant para construir RESUMEN.
    La tabla web y el Excel deben provenir de una sola semántica.

  plant: "resolvedPlant"

  cutoff: "uploadDay"

  week_anchor: "query week_anchor o uploadDay"

  projection:
    rule: >
      Reutilizar buildPronosticoProjectionContext y evitar crear una regla
      de proyección distinta para el Excel.

  price:
    - "Conservar 068-R1/R2."
    - "Último precio válido anterior al mes."
    - "No future backfill."

performance:
  - "No query por día."
  - "No query por concepto."
  - "No query por celda."
  - "Documentar query_count adicional del resumen."
  - "Reutilizar comprasCache dentro del load semanal."
  - "Si es viable, reutilizar projection ya resuelta por el export."

###############################################################################
# H. SEGURIDAD
###############################################################################

security_contract:
  - "dashboardAuthMiddleware permanece."
  - "assertPlantaPermitidaDashboard permanece."
  - "RESUMEN solo contiene la planta autorizada."
  - "No ampliar scope de datos."
  - "No write DB."
  - "No modificar permisos."

###############################################################################
# I. PRUEBAS
###############################################################################

mandatory_tests:
  san_luis:
    - "Domingo venta null no invalida semana."
    - "Fixture 04–10 suma Venta=143031."
    - "Precio semanal se pondera sobre días con venta."
    - "Costo semanal se pondera sobre días con venta."
    - "Flete semanal se pondera sobre días con venta."
    - "Ingreso semanal suma días con venta."
    - "Un día con venta positiva + precio faltante sí invalida ingreso/precio."
    - "Un día con venta positiva + costo faltante sí invalida costo."
    - "Un domingo sin venta conserva price/costo/flete diarios si existen."
    - "No sale null->0."
    - "Resultado Importe ignora día sin venta, no un día incompleto con venta."
    - "Resultado $/kg = Resultado Importe / Venta."

  all_plants:
    - "San Luis deja de aparecer completamente en —."
    - "Las demás plantas no cambian."
    - "HG importe absoluto sigue sumando según evidencia."

  five_day:
    - "Semana 04–10 + 5D => 04–08."
    - "No devuelve 27–31 octubre."
    - "Semana 27/09–03/10 + 5D => 27/09–01/10."
    - "week_anchor llega frontend->API->backend."
    - "Estado real/proyectado intacto."
    - "1M/3M/YTD/1A/5A/Todo no cambian."

  excel:
    - "Export individual crea RESUMEN."
    - "RESUMEN es worksheet #1."
    - "IGF Diario sigue existiendo."
    - "Tabla tiene Concepto/Semana/Dom...Sáb."
    - "Tabla contiene exactamente las métricas del payload semanal."
    - "San Luis muestra semana válida."
    - "summary_metric válido se grafica."
    - "summary_metric inválido usa resultado_mxn."
    - "week_anchor válido selecciona esa semana."
    - "Sin week_anchor usa upload_day."
    - "Gráfica PNG queda insertada."
    - "Workbook abre con ExcelJS después de escribirlo."
    - "Resto de hojas sigue presente."
    - "No nueva dependencia."

  regression:
    - "069 PASS actualizado."
    - "068-R2 PASS."
    - "068-R1 PASS."
    - "068 PASS."
    - "067 PASS."
    - "066-R1 PASS."
    - "065-R1 PASS."
    - "064-R1 PASS."
    - "frontend npm run build PASS."
    - "node --check server.js PASS."
    - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-weekly-plant.js"
  - "lib/igf-diario-weekly-excel.js"
  - "lib/dashboard-arr-forecast.js"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "test/igf-diario-weekly-sunsat-multiplant-069.test.js"
  - "test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md"

out_of_scope:
  - "Cambiar Forecast."
  - "Cambiar ARR."
  - "Cambiar matriz Folios 068."
  - "Cambiar FolioDrawer."
  - "Cambiar Precio 068-R1."
  - "Cambiar datos de compras."
  - "Cambiar DB."
  - "Modificar export Todas salvo regresión imprescindible."
  - "Cambiar otros rangos de gráfica."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != f50e61356325b13be289beb4e6354b52634f5eee, STOP."
  - "Si corregir San Luis exige convertir todos los null a cero, STOP."
  - "Si RESUMEN requiere duplicar fórmulas financieras, STOP."
  - "Si se necesita una dependencia nueva para la gráfica Excel, STOP."
  - "Si 5D sigue anclado a monthEnd, STOP."
  - "Si se cambia Forecast, STOP."
  - "Si se escribe DB, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md"