task_id: "IMPL-IGF-DIARIO-GRAFICA-RENTABILIDAD-NUEVOS-054"

title: "Gráfica IGF Diario de rentabilidad y clientes nuevos"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "053BC está integrada en main fca7d35a47901d95f9bd2bcd6cb23d274ea8c259. IGF Diario ya contiene AH COMENTARIO DEL DIA y AI VENTAS/clientes nuevos tanto por planta como Provincia."

objective: "Cambiar el botón IGFDiario para que abra primero una ventana gráfica tipo Gráfica Toneladas de venta. La gráfica principal mostrará rentabilidad diaria con selector entre AF ($) y AE ($/kg), línea de tendencia, tooltip y resumen semanal. A la derecha mostrará adquisición de clientes nuevos de las dos semanas anteriores y la semana actual por día, más Top 10 de clientes nuevos por volumen. El Excel actual se descargará desde un botón dentro del modal."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "fca7d35a47901d95f9bd2bcd6cb23d274ea8c259"

branch: "impl/igf-diario-grafica-rentabilidad-nuevos-054"

in_scope:
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx nuevo"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "server.js"
  - "lib/igf-diario-daily-insights.js si se requiere exponer eventos estructurados"
  - "nuevo helper lib/igf-diario-grafica.js o equivalente"
  - "reutilización de loaders/cálculos IGF existentes"
  - "tests 054"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-GRAFICA-RENTABILIDAD-NUEVOS-054.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar fórmulas del Excel IGF Diario"
  - "cambiar definición de AF"
  - "cambiar definición de AE"
  - "cambiar clasificación de cliente nuevo de 053BC"
  - "cambiar columnas AH/AI/AJ/AK"
  - "cambiar Director IA"
  - "DB/schema/migrations"
  - "writes de BD"
  - "PR, merge o deploy"

source_of_truth:
  - "AF = RESULTADO absoluto MXN."
  - "AE = RESULTADO POR KG."
  - "La gráfica no puede crear una tercera definición de rentabilidad."
  - "Para los mismos inputs, los puntos JSON deben coincidir con AF y AE de IGF Diario."
  - "Provincia debe utilizar exactamente la semántica financiera de IGF Diario Provincia."
  - "Las hojas individuales deben coincidir con su serie gráfica individual."

button_contract:
  - "Hoy IGFDiario abre directamente el Excel."
  - "Después de 054, IGFDiario abre IgfDiarioGraficaModal."
  - "No descargar automáticamente el Excel."
  - "El modal incluye arriba a la derecha Descargar Excel y Cerrar."
  - "Descargar Excel usa getDashboardExcelDownloadUrl existente sin cambiar su contrato."
  - "Todas conserva el gate global ZP/AD/CF_CDMX."
  - "Una planta individual conserva assertPlantaPermitidaDashboard."

modal_header:
  title: "Gráfica · Rentabilidad IGF Diario"
  center_label: "nombre de planta o PROVINCIA"
  right_actions:
    - "Descargar Excel"
    - "Cerrar"

profitability_metric_toggle:
  default: "mxn"
  options:
    - id: "mxn"
      label: "$"
      source: "AF"
      unit: "MXN"
    - id: "per_kg"
      label: "$/kg"
      source: "AE"
      unit: "MXN/kg"

main_chart:
  x_axis: "fecha"
  y_axis_mxn: "AF RESULTADO"
  y_axis_per_kg: "AE RESULTADO POR KG"
  allow_negative_values: true
  zero_baseline: true
  hover_tooltip: true
  trend_line: true

main_chart_tooltip:
  - "Fecha."
  - "Resultado $."
  - "Resultado $/kg."
  - "Venta KG."
  - "Estado: Real o Proyectado."
  - "Cobertura: Completa o Incompleta."
  - "Si está incompleto, mostrar componentes/plantas faltantes."

real_projection_contract:
  - "Los días < corte son reales."
  - "Los días >= corte siguen el contrato proyectado vigente del IGF."
  - "La gráfica puede mostrar ambos."
  - "Diferenciar visualmente tramo real y tramo proyectado."
  - "El tramo proyectado debe ser reconocible, por ejemplo línea punteada."
  - "La línea de tendencia se calcula solo con días REALES, numéricos y completos."
  - "No permitir que el forecast altere la tendencia histórica real."

trend_contract:
  - "Regresión lineal equivalente a la usada visualmente en ArrVentaGraficaModal."
  - "Al seleccionar $, tendencia sobre AF."
  - "Al seleccionar $/kg, tendencia sobre AE."
  - "Excluir puntos incompletos."
  - "Excluir proyectados."

range_selector:
  visual_contract: "mismo patrón que ArrVentaGraficaModal"
  ranges:
    - "1D"
    - "5D"
    - "1M"
    - "3M"
    - "YTD"
    - "1A"
    - "5A"
    - "Todo"
  default: "1M"

range_data_contract:
  - "No inventar historia financiera."
  - "Cada mes histórico debe usar sus propios valores de venta, precio, compras, corporativos, operativos, HG y C&D."
  - "Nunca aplicar corporativo/operativo del mes actual a un mes histórico."
  - "Si una fecha no tiene cobertura financiera defendible, marcarla incompleta."
  - "Todo empieza en la primera fecha para la que las fuentes IGF necesarias tengan datos."
  - "No convertir faltantes en cero."
  - "El eje X sigue siendo temporal diario; solo las etiquetas pueden espaciarse para legibilidad."

weekly_summary:
  location: "dentro de la gráfica principal"
  - "Separar visualmente semanas."
  - "Mostrar Semana 1, Semana 2, etc. según calendario IGF vigente."
  - "En modo $ mostrar AF semanal."
  - "En modo $/kg mostrar AE semanal."
  - "AF semana debe coincidir con el resumen semanal del Excel."
  - "AE semana debe coincidir con el resumen semanal del Excel; no promediar AE diario."
  - "Si la semana mezcla real/proyectado, indicarlo."
  - "Si la semana tiene cobertura incompleta, indicarlo."

incomplete_contract:
  - "No ocultar un problema de cobertura financiera."
  - "Un punto puede conservar el AF/AE que produce el contrato actual pero debe llevar complete=false cuando faltan componentes requeridos."
  - "Un punto incompleto no entra a la tendencia."
  - "En Provincia devolver missing_plants/missing_components por fecha cuando sea posible."
  - "Ejemplo tooltip: Falta COSTO/FLETE: San Luis, Morelos."
  - "No presentar silenciosamente una cifra parcial como cobertura completa."

new_clients_panel:
  source_of_truth: "misma definición newClientEvents de 053BC"
  forecast: false
  anchor: "última fecha real elegible del IGF activo"

new_clients_small_chart:
  metric: "cantidad de clientes nuevos"
  categories:
    - "Semana -2: total de nuevos de la semana completa"
    - "Semana -1: total de nuevos de la semana completa"
    - "Semana actual: un punto/barra por día real transcurrido"
  tooltip:
    - "Número de clientes nuevos."
    - "KG captados por esos clientes."
  - "Semana inicia lunes y termina domingo."
  - "No incluir clientes proyectados."
  - "Días futuros de la semana actual no cuentan como cero real."

top_new_clients:
  limit: 10
  sort: "kg acumulados descendente"
  definition:
    - "Debe ser cliente nuevo según 053BC."
    - "El volumen TOP es la suma real de kg desde su primera compra del mes hasta la fecha real elegible."
    - "No ordenar por forecast."
    - "No ordenar solamente por kg del primer día."
  display:
    - "Posición."
    - "Cliente."
    - "Planta cuando scope=Provincia."
    - "Fecha de ingreso."
    - "KG acumulados."
    - "Descuento $/kg."
  discount_formula:
    - "SUM(descuento MXN real del cliente desde ingreso hasta fecha elegible) / SUM(kg real mismo periodo)."
    - "No promedio simple de descuentos diarios."
    - "Mostrar con la misma convención visual de descuento que la gráfica de ventas."
    - "Si no es calculable, mostrar —."

province_contract:
  - "Planta=Todas abre PROVINCIA."
  - "Solo ZP/AD/CF_CDMX."
  - "La serie principal usa IGF Diario Provincia."
  - "Clientes nuevos conservan identidad planta+cliente."
  - "Top 10 Provincia muestra la planta."
  - "Clientes homónimos en plantas distintas no se fusionan."

individual_contract:
  - "Planta=Puebla abre Puebla."
  - "Solo información de Puebla."
  - "AF/AE deben coincidir con IGF Diario Puebla."
  - "Top clientes nuevos solo Puebla."
  - "Mismos resultados al comparar Puebla individual con Puebla dentro de Todas."

api_contract:
  endpoint: "GET /api/dashboard/igf-diario-grafica"
  response_shape:
    scope: "string"
    range: "string"
    corte_ymd: "string|null"
    points:
      - fecha: "YYYY-MM-DD"
        resultado_mxn: "number|null"
        resultado_per_kg: "number|null"
        venta_kg: "number|null"
        estado: "real|proyectado"
        complete: "boolean"
        missing_components: "string[]"
        missing_plants: "string[]"
    weeks:
      - label: "Semana N"
        fecha_desde: "YYYY-MM-DD"
        fecha_hasta: "YYYY-MM-DD"
        resultado_mxn: "number|null"
        resultado_per_kg: "number|null"
        complete: "boolean"
        estado: "real|proyectado|mixto"
    new_clients_chart:
      - label: "string"
        tipo: "week|day"
        count: "number"
        kg: "number"
    new_clients_top:
      - planta: "string|null"
        cliente: "string"
        fecha_ingreso: "YYYY-MM-DD"
        kg: "number"
        descuento_per_kg: "number|null"

architecture_contract:
  - "No leer/parsing del archivo XLSX descargado para construir la gráfica."
  - "No generar un Excel temporal por cada request de gráfica."
  - "Reutilizar las mismas fuentes y reglas financieras."
  - "Extraer/helperizar cálculo compartido si es necesario."
  - "Evitar crear un motor paralelo sin tests de equivalencia."
  - "No SQL por día."
  - "Las consultas deben ser por rango/planta/mes según corresponda."
  - "Provincia debe reutilizar datasets ya cargados cuando sea posible."

security_contract:
  - "Aplicar middleware de dashboard existente."
  - "Todas: ejecutar gate global antes de consultar datos multi-planta."
  - "Individual: validar planta antes de cargar datos."
  - "No exponer clientes nuevos de otras plantas a usuarios locales."
  - "Manipulación manual del endpoint debe devolver 403 donde corresponda."

acceptance_criteria:
  - "IGFDiario ya no descarga Excel inmediatamente."
  - "IGFDiario abre modal."
  - "Modal inicia en métrica $."
  - "Cambiar a $/kg actualiza eje Y, serie, tendencia y resumen semanal."
  - "Punto $ coincide con AF del Excel."
  - "Punto $/kg coincide con AE del Excel."
  - "Tooltip muestra ambos valores."
  - "Escala soporta resultados negativos y positivos."
  - "Existe línea visual de cero."
  - "La tendencia cambia al cambiar métrica."
  - "La tendencia solo usa real+completo."
  - "Proyectados se distinguen visualmente."
  - "Resumen semanal $ coincide con AF semanal."
  - "Resumen semanal $/kg coincide con AE semanal."
  - "Mini gráfica muestra Semana -2, Semana -1 y semana actual por día."
  - "Top 10 ordena por kg reales acumulados."
  - "Descuento Top 10 es descuento total / kg total."
  - "Provincia muestra planta de cada cliente."
  - "Botón Descargar Excel produce exactamente el mismo Excel actual."
  - "Botón Cerrar funciona."
  - "053A/R1/R2/053BC no cambian."
  - "No DB writes."
  - "No OpenAI."

validation:
  - "Caso AF positivo."
  - "Caso AF negativo."
  - "Caso AE positivo."
  - "Caso AE negativo."
  - "Cambio $ -> $/kg."
  - "Tooltip."
  - "Tendencia."
  - "Real vs proyectado."
  - "Semana con solo reales."
  - "Semana mixta real/proyectado."
  - "Provincia con planta incompleta."
  - "Semana -2 y Semana -1 de clientes nuevos."
  - "Semana actual diaria."
  - "Top 10 por volumen."
  - "Descuento ponderado."
  - "Mismo cliente en dos plantas."
  - "Puebla individual vs Puebla de Todas."
  - "Gate Todas."
  - "Descargar Excel."
  - "Responsive escritorio y móvil."
  - "git diff --check."

allowed_actions:
  - "crear rama 054 desde base_sha"
  - "crear endpoint read-only"
  - "crear modal"
  - "extraer helpers financieros puros si es necesario"
  - "reutilizar newClientEvents"
  - "agregar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a rama 054"

forbidden_actions:
  - "cambiar matemáticas del Excel"
  - "usar OpenAI"
  - "crear writes/DDL"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-GRAFICA-RENTABILIDAD-NUEVOS-054.md"