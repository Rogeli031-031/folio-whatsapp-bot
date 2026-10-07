task_id: "IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069"

title: "IGF Diario semanal domingo-sábado, comparativo por plantas y detalle diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Rediseñar IGF Diario Semanal para que la semana operativa sea
  Domingo-Sábado, agregar una vista semanal comparativa cuando Planta=Todas,
  y ampliar la vista de una planta para mostrar primero el resultado semanal
  y después cada uno de los siete días.

  El formato visual debe seguir la referencia proporcionada por el usuario:
  secciones claramente separadas y filas financieras principales resaltadas.

base_sha: "8ceb0d4657256999746d09905ec1d43373c02faf"

branch: "implementation/igf-diario-weekly-sunsat-multiplant-069"

###############################################################################
# 1. CALENDARIO SEMANAL
###############################################################################

week_contract:
  first_day: "Sunday"
  last_day: "Saturday"

  critical_change: >
    Sustituir completamente la semántica actual ISO lunes-domingo dentro
    del módulo IGF Diario Semanal.

  example:
    anchor: "2026-10-06"
    expected_from: "2026-10-04"
    expected_to: "2026-10-10"

  navigation:
    previous:
      from: "2026-09-27"
      to: "2026-10-03"

    current:
      from: "2026-10-04"
      to: "2026-10-10"

    next:
      from: "2026-10-11"
      to: "2026-10-17"

  label:
    old: "SEMANA ISO 41"
    new: "SEMANA 41"

  rule: >
    No mostrar la palabra ISO porque ISO define semana lunes-domingo.

week_number_contract:
  convention: "Sunday-Saturday"

  definition: >
    La semana que contiene el 1 de enero es Semana 1.
    Cada siguiente domingo inicia la siguiente semana.

  example:
    range: "2026-10-04 / 2026-10-10"
    week_number: 41

  cross_year:
    rule: >
      La semana que contiene el 1 de enero pertenece al nuevo año.
      El rango de fechas mostrado es siempre la fuente autoritativa.

week_helpers:
  replace:
    - "mondayOfIsoWeekContainingDate"
    - "sundayOfIsoWeekContainingDate"
    - "isoWeek"
    - "isoWeekYear"

  preferred:
    - "sundayOfWeekContainingDate"
    - "saturdayOfWeekContainingDate"
    - "weekNumber"
    - "weekYear"

  note: >
    Si es necesario conservar aliases internos para compatibilidad,
    no deben conservar semántica ISO en la UI o en nuevos contratos.

week_cross_month:
  rule: >
    La semana nunca se parte al cambiar de mes.

  example:
    anchor: "2026-10-01"
    range: "2026-09-27 / 2026-10-03"

###############################################################################
# 2. PLANTA = TODAS
###############################################################################

all_plants_contract:
  condition:
    mode: "IGF Diario acumulado"
    planta: "Todas"

  existing_order:
    preserve:
      - "Tabla superior IGF Diario acumulado."
      - "Folios en Depósito y Cierre (o adelante)."

  new_order:
    - "Tabla superior IGF Diario acumulado."
    - "IGF Diario Semanal."
    - "Folios en Depósito y Cierre (o adelante)."

  new_panel_title: "IGF Diario semanal · Todas"

  columns:
    - "Concepto"
    - "GT Puebla"
    - "Tehuacán"
    - "Acapulco"
    - "GTM Querétaro"
    - "GTM San Luis"
    - "Morelos"

  plant_order_rule: >
    Reutilizar el mismo orden e identidad de plantas del IGF Diario.
    No hardcodear IDs de planta.

  values:
    rule: >
      Cada columna de planta muestra el resultado agregado de esa planta
      para la semana Domingo-Sábado actualmente seleccionada.

  not_requested:
    - "No agregar Zona Provincia como séptima planta."
    - "No agregar columnas diarias en modo Todas."

all_plants_navigation:
  - "Semana anterior."
  - "SEMANA N · dd/mm/yyyy–dd/mm/yyyy."
  - "Semana siguiente."

  anchor:
    default: "Fecha de carga/corte."

###############################################################################
# 3. PLANTA INDIVIDUAL
###############################################################################

single_plant_contract:
  title: "IGF Diario semanal · {planta}"

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

  critical_rule: >
    La primera columna numérica inmediatamente después de Concepto
    es SEMANA y contiene el resultado agregado Domingo-Sábado.

  daily_columns:
    rule: >
      Después de Semana mostrar exactamente los siete días que forman
      el periodo actual, en orden Domingo-Sábado.

  example:
    anchor: "2026-10-06"
    headers:
      - "Semana"
      - "Dom 04/10"
      - "Lun 05/10"
      - "Mar 06/10"
      - "Mié 07/10"
      - "Jue 08/10"
      - "Vie 09/10"
      - "Sáb 10/10"

  weekly_value:
    source: "aggregateWeek sobre los siete días."

  daily_value:
    source: >
      La misma semántica financiera de aggregateWeek aplicada al día
      correspondiente, sin introducir fórmulas alternativas.

daily_status:
  rule: >
    Conservar semántica actual de real/proyectado respecto al corte.

  optional_visual:
    - "Día real con fondo normal."
    - "Día proyectado con tono sutil distinto."

  null_rule:
    - "NULL se muestra —."
    - "No convertir faltante en cero."

###############################################################################
# 4. FILAS Y ORDEN
###############################################################################

rows:
  - key: "venta_kg"
    label: "Venta en Kilos"
    unit: "kg"
    highlight: true

  - key: "precio_kg"
    label: "Precio de Venta al Público"
    unit: "$/kg"
    highlight: true

  - key: "ingreso_mxn"
    label: "Ingreso Generado"
    unit: "MXN"
    highlight: true

  - separator: true

  - key: "costo_kg"
    label: "Costo del Gas LP"
    unit: "$/kg"

  - key: "flete_kg"
    label: "Flete Terrestre"
    unit: "$/kg"

  - key: "margen_kg"
    label: "Margen Bruto"
    unit: "$/kg"
    highlight: true

  - separator: true

  - key: "gasto_corporativo_kg"
    label: "Gasto Corporativo"
    unit: "$/kg"

  - key: "inversiones_kg"
    label: "Inversiones"
    unit: "$/kg"

  - key: "impuestos_federales_kg"
    label: "Impuestos Federales"
    unit: "$/kg"

  - key: "margen_neto_kg"
    label: "Margen Neto"
    unit: "$/kg"
    highlight: true

  - separator: true

  - key: "presupuesto_nomina_gastos_kg"
    label: "Presupuesto Nómina/Gastos"
    unit: "$/kg"

  - key: "presupuesto_imss_sua_kg"
    label: "Presupuesto IMSS/SUA"
    unit: "$/kg"

  - key: "extraordinarios_kg"
    label: "Extraordinarios"
    unit: "$/kg"

  - key: "provisiones_planta_kg"
    label: "Provisiones de la Planta"
    unit: "$/kg"

  - key: "sobrante_antes_hg_kg"
    label: "Sobrante de Operación antes del HG"
    unit: "$/kg"
    highlight: true

  - separator: true

  - key: "hg_mxn"
    label: "HG"
    unit: "MXN"

  - key: "sobrante_con_hg_kg"
    label: "Sobrante de Operación con el HG"
    unit: "$/kg"
    highlight: true

  - separator: true

  - key: "com_desc_kg"
    label: "Comisiones y Descuentos"
    unit: "$/kg"

  - key: "resultado_kg"
    label: "RESULTADO ($/kg)"
    unit: "$/kg"
    highlight: true

  - key: "resultado_mxn"
    label: "RESULTADO (Importe)"
    unit: "MXN"
    highlight: true
    strongest: true

###############################################################################
# 5. FORMATO VISUAL
###############################################################################

visual_contract:
  source_reference: "Imagen entregada por usuario."

  section_separation:
    rule: >
      Las secciones financieras deben tener espacio visual claramente mayor
      que el borde normal entre renglones.

    preferred:
      - "borde superior grueso"
      - "padding adicional"
      - "o pequeño spacer visual"

    avoid:
      - "Filas vacías que puedan confundirse con datos."
      - "Celdas falsas con valor 0."

  highlighted_rows:
    - "Venta en Kilos"
    - "Precio de Venta al Público"
    - "Ingreso Generado"
    - "Margen Bruto"
    - "Margen Neto"
    - "Sobrante de Operación antes del HG"
    - "Sobrante de Operación con el HG"
    - "RESULTADO ($/kg)"
    - "RESULTADO (Importe)"

  highlight_style:
    rule: >
      Mantener el dark mode actual pero usar un marcador amarillo/ámbar
      inspirado en la hoja de referencia.

    preferred:
      label: "fondo ámbar discreto + fuente resaltada"
      whole_row: "banda ámbar muy sutil"

  result_style:
    positive: "verde"
    negative: "rojo"
    zero: "neutral"

  numeric:
    - "tabular-nums"
    - "alineación derecha"
    - "Venta sin decimales."
    - "$/kg con 2 decimales."
    - "Importes con separador de miles y 2 decimales cuando aplique."

  responsive:
    - "Concepto sticky a la izquierda."
    - "Scroll horizontal."
    - "No comprimir columnas hasta volverlas ilegibles."
    - "Semana puede quedar sticky después de Concepto si es viable."
    - "Usable en móvil."

###############################################################################
# 6. GRÁFICA
###############################################################################

graph_contract:
  single_plant:
    - "Conservar botón Gráfica."
    - "Conservar selección de métrica por renglón."
    - "Conservar 1D, 5D, 1M, 3M, YTD, 1A, 5A, Todo."
    - "Conservar Real/Proyectado/Tendencia."
    - "Conservar unidades correctas."

  all_plants:
    rule: >
      No agregar una nueva gráfica multi-planta en 069.
      Fuera de alcance salvo que ya exista sin trabajo adicional.

###############################################################################
# 7. BACKEND / API
###############################################################################

backend_module:
  primary: "lib/igf-diario-weekly-plant.js"

existing_endpoint:
  path: "GET /api/dashboard/igf-diario-semanal"

endpoint_extension:
  single:
    param: "plant_code"
    response_add:
      days: true

  all:
    param: "todas=1"
    response_add:
      plants: true

  rule: >
    Un solo endpoint puede manejar ambos scopes.
    No hacer seis requests HTTP desde frontend cuando Planta=Todas.

single_response_shape:
  ok: true
  scope: "plant"
  week:
    week_year: 2026
    week_number: 41
    fecha_desde: "2026-10-04"
    fecha_hasta: "2026-10-10"
    estado: "parcial"
  metrics: "IgfDiarioSemanalMetrics"
  days:
    - fecha: "2026-10-04"
      weekday: "domingo"
      estado: "real"
      metrics: "IgfDiarioSemanalMetrics"

all_response_shape:
  ok: true
  scope: "all"
  week:
    week_year: 2026
    week_number: 41
    fecha_desde: "2026-10-04"
    fecha_hasta: "2026-10-10"
  plants:
    - plant_code: "GT Puebla"
      empresa: "GT Puebla"
      metrics: "IgfDiarioSemanalMetrics"
      complete: true
      missing_components: []

performance_contract:
  frontend:
    - "Planta=Todas usa una sola llamada HTTP semanal."

  backend:
    - "No query por métrica."
    - "No query por día."
    - "No ejecutar 20 conceptos × 7 días × plantas."
    - "Reutilizar loaders, caches y materialización existentes."
    - "Reportar query_count."

  preferred:
    rule: >
      Compartir caches/lecturas comunes entre plantas cuando sea posible.
      Si alguna lectura necesariamente es por planta, documentar el query_count
      y demostrar que no existe N+1 por día o concepto.

###############################################################################
# 8. SEGURIDAD / PLANTAS
###############################################################################

security_contract:
  - "dashboardAuthMiddleware permanece."
  - "No ampliar visibilidad de plantas."
  - "todas=1 respeta el alcance efectivo del usuario."
  - "Reutilizar misma identidad/catálogo de plantas del IGF Diario."
  - "No hardcodear IDs."

###############################################################################
# 9. SEMÁNTICA FINANCIERA
###############################################################################

financial_contract:
  unchanged:
    - "Venta semana = suma de Venta KG."
    - "Ingreso = suma ingreso diario."
    - "Precio = Ingreso / Venta."
    - "Costo/Flete ponderados por Venta."
    - "Margen Bruto = Precio - Costo - Flete."
    - "Gastos 064/064-R1."
    - "Overrides 065/065-R1."
    - "Precio inicial 068-R1/R2."
    - "HG."
    - "C&D con signo."
    - "Resultado $/kg."
    - "Resultado Importe."
    - "Legacy pre-octubre."
    - "Semana cruzando mes."

  critical:
    - "No recalcular desde valores visualmente redondeados."
    - "Usar precisión completa."
    - "NULL permanece NULL."

###############################################################################
# 10. FRONTEND
###############################################################################

recommended_frontend:
  - "frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx"
  - "frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"

shared_rows:
  recommendation: >
    Extraer la definición de filas/labels/unidades/highlight/separadores
    a un helper compartido para que Todas y Planta individual no diverjan.

placement_contract:
  all:
    after: "tabla IGF Diario acumulado"
    before: "IgfDiarioFoliosDepositoMatrix"

  single:
    replace: >
      El panel semanal actual de dos columnas Concepto/Valor semana
      por la nueva tabla Concepto/Semana/Dom...Sáb.

forecast_contract:
  - "Forecast permanece intacto."
  - "Comparación Forecast vs mes anterior permanece intacta."
  - "069 solo aplica a modo IGF Diario."

###############################################################################
# 11. TESTS
###############################################################################

mandatory_tests:
  calendar:
    - "06/10/2026 abre 04/10/2026–10/10/2026."
    - "Inicio siempre domingo."
    - "Fin siempre sábado."
    - "Anterior = 27/09–03/10."
    - "Siguiente = 11/10–17/10."
    - "Semana cruza mes sin partirse."
    - "No aparece SEMANA ISO."
    - "Semana 04/10–10/10 = número 41 bajo nueva convención."
    - "Cruce de año correcto."

  single_plant:
    - "Primera columna = Concepto."
    - "Segunda columna = Semana."
    - "Luego exactamente Dom/Lun/Mar/Mié/Jue/Vie/Sáb."
    - "Semana usa agregado de siete días."
    - "Día usa su propio valor."
    - "NULL muestra —."
    - "Real/proyectado conservado."
    - "Gráfica sigue funcionando."

  all_plants:
    - "Todas + IGF Diario muestra panel semanal."
    - "Panel aparece antes de Folios en Depósito y Cierre."
    - "Una columna por planta."
    - "Orden correcto."
    - "Cada celda es agregado semanal de esa planta."
    - "Una sola request frontend."
    - "No panel multi-planta en Forecast."

  visual:
    - "Margen se renombra Margen Bruto."
    - "Separadores entre bloques."
    - "Filas solicitadas resaltadas."
    - "RESULTADO Importe resaltado."
    - "Negativos rojos."
    - "Resultados positivos verdes."
    - "Sticky Concepto."
    - "Scroll horizontal."

  financial:
    - "067 fórmula semanal sigue equivalente."
    - "064-R1 mueve gasto diario/semanal."
    - "065-R1 mueve Precio/Costo/Flete."
    - "068-R1 precio inicial fluye a semana."
    - "Legacy pre-octubre no inventa gasto detallado."
    - "Resultado Importe conserva precisión."
    - "Resultado $/kg conserva identidad cuando existe evidencia."

  regression:
    - "068-R1/R2 PASS."
    - "068 PASS."
    - "067 PASS actualizado."
    - "066-R1 PASS."
    - "066 PASS."
    - "065-R1 PASS."
    - "064-R1 PASS."
    - "frontend npm run build PASS."
    - "node --check server.js PASS."
    - "git diff --check limpio."

recommended_tests:
  - "test/igf-diario-weekly-sunsat-multiplant-069.test.js"
  - "test/igf-diario-weekly-plant-view-067.test.js"

###############################################################################
# 12. OUT OF SCOPE
###############################################################################

out_of_scope:
  - "Cambiar fórmulas financieras."
  - "Cambiar IGF mensual."
  - "Cambiar Folios 068."
  - "Cambiar FolioDrawer."
  - "Cambiar Precio Morelos 068-R1."
  - "Cambiar Forecast."
  - "Cambiar ARR."
  - "Cambiar DB."
  - "Writes productivos."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 8ceb0d4657256999746d09905ec1d43373c02faf, STOP."
  - "Si se requiere inventar una fórmula financiera, STOP."
  - "Si Todas se implementa mediante una request HTTP por planta, STOP."
  - "Si se pierde la semántica NULL, STOP."
  - "Si 068-R1/R2 cambia, STOP."
  - "Si Forecast cambia, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md"