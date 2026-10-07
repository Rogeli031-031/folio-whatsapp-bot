task_id: "IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068"

title: "Matriz diaria de folios en Depósito y Cierre o adelante por planta"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  En IGF Diario acumulado con Planta=Todas, eliminar la sección inferior
  actual de detalle IGF Forecast señalada por el usuario y sustituirla por
  una matriz mensual de folios que hayan alcanzado Depósito y Cierre o una
  etapa posterior válida, excluyendo cancelados.

  Las filas serán plantas y las columnas serán los días calendario del mes
  correspondiente a Fecha de carga (corte).

  Cada celda debe mostrar:
  importe total,
  número de folios,
  y una descripción corta del contenido.

  Debe incluir total mensual por planta, total diario de todas las plantas
  y total general del periodo.

base_sha: "c4f2db88784642433008b8b313ad2d60e17d896a"

branch: "implementation/igf-diario-folios-deposito-matrix-068"

ui_scope:
  show_when:
    igf_mode: "IGF Diario acumulado"
    plant_filter: "Todas"

  replace:
    description: >
      Sustituir la tabla inferior actual que contiene columnas como
      Presupuesto, Folios Aprob. Director ZP, Folios en carro,
      Depósito y cierre, HG, Bancos, Resultado, etc.

  keep:
    - "Tabla superior IGF Diario acumulado."
    - "Zona Provincia."
    - "Selector Planta."
    - "067 cuando se selecciona una planta específica."
    - "Forecast y sus tablas actuales."

  plant_selected_behavior:
    rule: >
      Si Planta != Todas, conservar el panel semanal vertical 067.
      No mostrar simultáneamente la matriz 068.

matrix_title:
  title: "Folios en Depósito y Cierre (o adelante)"
  subtitle: >
    Importe de folios por día y planta.
    Incluye folios que alcanzaron Depósito y Cierre o una etapa posterior.
    No incluye cancelados.

period_contract:
  source: "Fecha de carga (corte)"

  month:
    rule: >
      El año y mes de la matriz provienen del año/mes de la Fecha de carga
      seleccionada.

  examples:
    - "06/10/2026 => columnas 01 a 31 de octubre 2026."
    - "15/09/2026 => columnas 01 a 30 de septiembre 2026."

  event_limit:
    rule: >
      Nunca colocar en la matriz eventos posteriores a la Fecha de carga
      (corte). Los días posteriores al corte pueden permanecer visibles
      como días del mes, pero sin incorporar eventos futuros.

  version_as_of_corte:
    rule: >
      Respetar el comportamiento existente de Versión <= corte para
      determinar la versión/estado efectivo del folio cuando corresponda.

calendar_contract:
  - "Una columna por día calendario real del mes."
  - "Febrero usa 28/29 correctamente."
  - "Abril/junio/septiembre/noviembre usan 30."
  - "Resto usa 31."
  - "Encabezado compacto: 01, 02, 03 ... 31."
  - "No incluir días inexistentes."

plant_contract:
  rows:
    - "GT Puebla"
    - "Tehuacan"
    - "Acapulco"
    - "GTM Queretaro"
    - "GTM San Luis"
    - "Morelos"

  rule: >
    No hardcodear IDs. Reutilizar la identidad/equivalencias de plantas
    vigente en IGF Diario y 063-R1.

  order:
    rule: "Usar el mismo orden visual de plantas del IGF Diario acumulado."

folio_threshold_contract:
  visual_stage_order:
    - "PENDIENTE_APROB_PLANTA"
    - "APROB_DIRECTOR_ZP"
    - "CARRO_COMPRA"
    - "CUENTA_FONDOS"
    - "CHEQUE_GENERADO"
    - "DEPOSITO_CIERRE"
    - "COMPROBACIONES"
    - "EVIDENCIAS"
    - "CANCELADO"

  include:
    threshold: "DEPOSITO_CIERRE"
    stages:
      - "DEPOSITO_CIERRE"
      - "COMPROBACIONES"
      - "EVIDENCIAS"

  exclude:
    - "CANCELADO"

  critical_rule: >
    Reutilizar el mapeo canónico existente de estatus técnico a etapa visual.
    No crear una segunda interpretación independiente de PAGADO, CERRADO,
    COMPROBACIONES, EVIDENCIAS, etc.

  current_status_rule: >
    El folio debe tener como estado efectivo, según el corte/versionado,
    Depósito y Cierre o una etapa posterior válida.

  canceled_rule: >
    Si el estado efectivo del folio es CANCELADO, excluirlo completamente
    de importe, conteo, descripción y detalle.

entry_date_contract:
  definition: >
    El día de la matriz es la primera fecha autoritativa en que el folio
    alcanzó DEPOSITO_CIERRE o una etapa posterior válida.

  preferred_source: "public.folio_historial"

  rule:
    - "Buscar la primera transición/evento calificante del folio."
    - "Usar su fecha autoritativa de historial."
    - "No usar fecha de creación del folio como sustituto."
    - "No usar mes_cargo como fecha de entrada."
    - "No mover el folio de día cuando posteriormente avanza a Comprobaciones/Evidencias."
    - "Contar cada folio como máximo una vez."

  direct_jump:
    rule: >
      Si un folio pasó directamente a una etapa posterior sin evento explícito
      de DEPOSITO_CIERRE, usar la primera transición histórica que ya cumpla
      el umbral.

  missing_history:
    rule: >
      No inventar una fecha. Si la fecha de entrada no puede demostrarse
      con la información autoritativa existente, marcarla como dato no
      clasificable y reportarlo; no usar created_at silenciosamente.

  stop_condition: >
    Si el esquema real no permite determinar de forma fiable la primera
    transición al umbral, STOP antes de implementar un fallback inventado.

amount_contract:
  source: "public.folios.importe"

  meaning: "Monto total del folio."

  rules:
    - "Usar importe del folio, no monto comprobado."
    - "No usar suma de facturas."
    - "No usar presupuesto."
    - "No usar $/kg."
    - "No duplicar importe por múltiples eventos."
    - "0 explícito es un importe válido."

  missing_amount:
    rule: >
      Un folio calificante con importe NULL sigue contando como folio pero
      no aporta importe a la suma.

    ui:
      - "Mostrar cantidad de folios sin importe en detalle."
      - "No convertir NULL en $0."
      - "No ocultar silenciosamente el faltante."

cell_aggregation:
  key: "(planta efectiva, fecha de entrada)"

  total_amount:
    formula: >
      SUM(folio.importe)
      únicamente sobre importes numéricos de folios calificantes únicos.

  folio_count:
    formula: "COUNT(folios calificantes únicos)"

  missing_amount_count:
    formula: "COUNT(folios calificantes con importe NULL)"

cell_display:
  non_empty:
    lines:
      - "$ IMPORTE TOTAL"
      - "N folio / N folios"
      - "Descripción corta"

  empty:
    display: "—"
    rule: "No mostrar $0 para una celda sin folios."

  examples:
    single:
      amount: "$80,000"
      count: "1 folio"
      description: "Reparación compresor"

    multiple:
      amount: "$250,000"
      count: "4 folios"
      description: "Mantenimiento tanque +3"

description_contract:
  source_priority:
    - "descripcion_display si existe"
    - "concepto"
    - "Sin descripción"

  one_folio:
    rule: >
      Mostrar la descripción corta del folio.

  multiple_folios:
    rule: >
      Elegir de forma determinista la descripción del folio con mayor
      importe numérico y añadir +N para indicar los demás.

    example: "Mantenimiento tanque +3"

  tie_break:
    rule: >
      Si hay empate de importe, usar un orden estable por identificador
      del folio.

  display:
    - "Máximo aproximado 24-32 caracteres visibles."
    - "Usar ellipsis si excede."
    - "No alterar el texto almacenado."
    - "Tooltip/title puede mostrar la descripción completa."

monthly_totals:
  plant_total_column:
    title: "Total mes"

    display:
      - "importe total de la planta"
      - "número total de folios"
      - "número de folios sin importe si aplica"

    formula: >
      SUM de las celdas diarias de la planta sin duplicar folios.

daily_totals:
  row_title: "Total día"

  per_day:
    display:
      - "importe total de todas las plantas"
      - "número total de folios"

    formula: >
      SUM de importes del día de todas las plantas.

grand_total:
  position: "esquina inferior derecha"

  display:
    - "importe total del periodo"
    - "número total de folios"

  rule: >
    Debe coincidir tanto con la suma de Totales mes por planta como con
    la suma de Totales día.

detail_contract:
  trigger: "Click/tap sobre una celda no vacía."

  header:
    - "Planta"
    - "Fecha"
    - "Importe total"
    - "Número de folios"

  folio_columns:
    - "Folio"
    - "Estado efectivo/actual"
    - "Monto"
    - "Descripción"

  folio_detail:
    fields:
      - "folio_id / folio visible"
      - "estado"
      - "importe"
      - "descripcion_display/concepto"
      - "fecha_entrada_umbral"

  rules:
    - "Ordenar por importe descendente, luego folio."
    - "Mostrar NULL de importe como Sin importe."
    - "No permitir editar desde esta ventana."
    - "Si ya existe navegación segura al folio, puede ofrecer Abrir folio."

visual_contract:
  theme: "Mismo dark mode del dashboard."

  matrix:
    - "Planta fija a la izquierda."
    - "Días en horizontal."
    - "Total mes fijo a la derecha cuando sea práctico."
    - "Scroll horizontal para los días."
    - "No comprimir 31 días hasta volver ilegible la tabla."
    - "Mantener usable en móvil."

  colors:
    non_empty: "resaltado sutil azul/verde"
    selected: "borde cian"
    empty: "fondo neutro"
    total_month: "azul"
    total_day: "azul"

  note: >
    Puede aplicarse intensidad visual moderada por importe, pero no debe
    sustituir el número exacto.

security_contract:
  - "Usar dashboardAuthMiddleware."
  - "No ampliar acceso a folios que el usuario no pueda consultar."
  - "Respetar restricciones actuales de planta/rol."
  - "Respetar solo_zp_ad / privados si forman parte de la visibilidad actual."
  - "Reutilizar filtros/autorización de folios existentes cuando aplique."
  - "No devolver campos sensibles innecesarios."

backend_contract:
  recommended_module: "lib/igf-diario-folios-deposito-matrix.js"

  recommended_endpoint: "GET /api/dashboard/igf-diario-folios-deposito"

  params:
    - "year"
    - "month"
    - "upload_day"
    - "version_as_of_corte"

  response_shape:
    ok: true
    year: 2026
    month: 10
    corte_ymd: "2026-10-06"
    days: ["01", "02", "03", "..."]
    plants:
      - plant_code: "GT_PUEBLA"
        empresa: "GT Puebla"
        days:
          "2026-10-02":
            amount_total: 125000
            folio_count: 2
            missing_amount_count: 0
            description_short: "Mantenimiento tanque +1"
            folios:
              - id: 123
                folio: "F-1042"
                estado: "DEPOSITO_CIERRE"
                importe: 80000
                descripcion: "Mantenimiento tanque"
                threshold_date: "2026-10-02"
        total_month:
          amount_total: 125000
          folio_count: 2
          missing_amount_count: 0

    daily_totals:
      "2026-10-02":
        amount_total: 125000
        folio_count: 2
        missing_amount_count: 0

    grand_total:
      amount_total: 125000
      folio_count: 2
      missing_amount_count: 0

  note: >
    La forma exacta puede ajustarse por compatibilidad, pero debe conservar
    toda la semántica anterior.

backend_query_contract:
  requirements:
    - "Resolver todos los folios del periodo en lote."
    - "Resolver fecha de primera transición calificante en SQL/lote o memoria."
    - "No una consulta por planta."
    - "No una consulta por día."
    - "No una consulta por folio."
    - "No consultar detalle al pintar cada celda."
    - "Evitar N+1."

  preferred:
    - "1 consulta/CTE principal o un número pequeño y constante de lecturas."
    - "Agrupar en memoria después de obtener el conjunto mínimo necesario."

frontend_contract:
  recommended_component: "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"

  render_condition: >
    igfTableMode === "igf_diario"
    AND Planta === Todas

  behavior:
    - "Cargar una vez al cambiar mes/corte/version."
    - "No cargar si se selecciona planta individual."
    - "No cargar en Forecast."
    - "Loading independiente."
    - "Error de esta matriz no debe tumbar la tabla IGF superior."
    - "Click de celda abre detalle local/modal."

  replacement:
    rule: >
      El bloque inferior legacy marcado por el usuario ya no se renderiza
      en Todas + IGF Diario.

067_contract:
  - "Planta específica + IGF Diario sigue mostrando vista semanal 067."
  - "No modificar la lógica semanal."
  - "No modificar gráfica 067."
  - "No modificar semanas ISO."

forecast_contract:
  - "Forecast queda intacto."
  - "No remover la sección legacy si Forecast todavía la usa."
  - "No cambiar cálculos ARR/IGF Forecast."

066_contract:
  - "No modificar IGF Diario acumulado superior."
  - "No modificar Margen."
  - "No modificar Descuento."
  - "No modificar Operativos."
  - "No modificar Corporativos."
  - "No modificar Impuestos."
  - "No modificar HG."
  - "No modificar Resultado Final."

data_integrity_contract:
  - "Un folio aparece como máximo una vez en toda la matriz."
  - "Avanzar de Depósito a Comprobaciones no vuelve a sumarlo."
  - "Avanzar de Comprobaciones a Evidencias no vuelve a sumarlo."
  - "Cancelado se excluye."
  - "Importe NULL nunca se vuelve cero."
  - "Total planta = suma días."
  - "Total día = suma plantas."
  - "Total general coincide por ambas rutas."

mandatory_tests:
  - "Render solo en Todas + IGF Diario."
  - "No render en planta específica."
  - "067 sigue renderizando en planta específica."
  - "Forecast permanece igual."
  - "Mes proviene de Fecha de carga."
  - "Octubre tiene 31 columnas."
  - "Septiembre tiene 30."
  - "Febrero leap/non-leap correcto."
  - "Evento posterior al corte no entra."
  - "DEPOSITO_CIERRE entra."
  - "COMPROBACIONES entra."
  - "EVIDENCIAS entra."
  - "Etapas anteriores al umbral no entran."
  - "CANCELADO no entra."
  - "Folio que avanzó varias etapas se cuenta una vez."
  - "Fecha usada es primera transición calificante."
  - "No usa fecha de creación como sustituto."
  - "Salto directo a etapa posterior usa primera transición calificante."
  - "Importe viene de folio.importe."
  - "No suma facturas/comprobado."
  - "Importe NULL cuenta folio pero no suma importe."
  - "0 explícito suma como 0 válido."
  - "Celda agrega correctamente importe."
  - "Celda agrega correctamente count."
  - "Descripción 1 folio correcta."
  - "Descripción múltiples usa mayor importe +N."
  - "Tie-break descripción determinista."
  - "Total mes por planta correcto."
  - "Total día correcto."
  - "Grand total correcto."
  - "No duplicados."
  - "Detalle de celda lista exactamente sus folios."
  - "Detalle conserva estado/monto/descripción."
  - "No acceso extra a folios restringidos."
  - "Equivalencias de planta correctas."
  - "No hardcodear IDs de planta."
  - "No query por día."
  - "No query por planta."
  - "No query por folio."
  - "067 PASS."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "064-R1 PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-folios-deposito-matrix.js"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-folios-deposito-matrix-068.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068.md"

out_of_scope:
  - "Modificar folios."
  - "Mover folios de etapa."
  - "Cancelar folios."
  - "Editar importe."
  - "Cambiar historial."
  - "Crear tablas nuevas salvo evidencia técnica imprescindible."
  - "Cambiar ARR."
  - "Cambiar Pronóstico."
  - "Cambiar IGF mensual."
  - "Cambiar 067."
  - "Writes productivos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != c4f2db88784642433008b8b313ad2d60e17d896a, STOP."
  - "Si no se puede determinar de forma autoritativa la fecha de primera transición al umbral, STOP."
  - "Si se requiere usar created_at como aproximación, STOP."
  - "Si el cambio obliga a modificar estados de folio, STOP."
  - "Si la visibilidad requiere saltarse permisos existentes, STOP."
  - "Si aparece N+1 por planta/día/folio, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068.md"