task_id: "FIX-IGF-DIARIO-WEEKLY-HISTORY-CHART-UNITS-067-R1"

title: "Corregir histórico de Resultado y unidades de gráfica semanal 067-R1"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Corregir dos defectos encontrados en la revisión de 067 antes de G4:
  1) preservar Resultado histórico legacy en semanas y gráficas anteriores
  a octubre 2026 cuando existe evidencia;
  2) formatear correctamente el eje Y de las gráficas por métrica usando
  kg, MXN o $/kg según seriesUnit.

base_sha: "940cc0907fc1aab6a23708cc49f192aa42f2b24a"

branch: "fix/igf-diario-weekly-history-chart-units-067-r1"

source_task: "IMPL-IGF-DIARIO-WEEKLY-PLANT-VIEW-067"

problem_1_history:
  evidence:
    file: "lib/igf-diario-weekly-plant.js"
    current_behavior: >
      loadMonthBundle asigna legacyResultadoMxn: null a todos los días.

  consequence:
    - "Resultado semanal pre-octubre queda null aunque exista resultado IGF legacy."
    - "Semana 28/09–04/10 pierde el Resultado correspondiente a septiembre."
    - "Gráfica Resultado en 1A/5A/Todo produce gaps artificiales pre-octubre."

  required:
    - >
      Reutilizar resultado_mxn diario ya materializado por la lógica legacy
      existente del IGF cuando esté disponible.
    - >
      Relacionar built.points/resultados legacy con financial_days por fecha
      sin reconstruir fórmulas nuevas.
    - "No inventar J/K/L/Q/R/S/T históricos."
    - >
      Que el desglose nuevo quede null no obliga a borrar Resultado histórico
      si existe evidencia directa del Resultado.
    - "Preservar null cuando realmente no exista evidencia."

cross_month_acceptance:
  week: "2026-09-28/2026-10-04"

  expected:
    - "La semana sigue siendo ISO 40."
    - "No se parte al 01/10."
    - "J/K/L/Q/R/S/T pueden quedar — por cobertura incompleta."
    - >
      Resultado (Importe) usa los resultados diarios disponibles de ambos
      lados cuando existe evidencia suficiente.
    - >
      No sustituir Resultado histórico por una clasificación inventada de gastos.

historical_chart:
  result_metric:
    rule: >
      resultado_mxn y resultado_kg deben conservar puntos históricos donde
      el IGF legacy ya tenía resultado calculable.

  detailed_metrics:
    rule: >
      Gasto Corporativo, Inversiones, Impuestos Federales y componentes
      operativos nuevos sí deben conservar gap antes de octubre cuando
      no exista clasificación.

  forbidden:
    - "Convertir todos los históricos en 0."
    - "Inventar componentes 064 antes de octubre."
    - "Borrar Resultado legacy solo porque no existe desglose 064."

problem_2_chart_units:
  file: "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"

  current_problem: >
    En modo seriesMetric, el tooltip utiliza seriesUnit pero el eje Y
    sigue usando metric, cuyo default es mxn.

  required_axis_unit:
    kg:
      metrics:
        - "venta_kg"
      format: "kg"

    mxn:
      metrics:
        - "ingreso_mxn"
        - "hg_mxn"
        - "resultado_mxn"
      format: "$"

    per_kg:
      metrics:
        - "precio_kg"
        - "costo_kg"
        - "flete_kg"
        - "margen_kg"
        - "gasto_corporativo_kg"
        - "inversiones_kg"
        - "impuestos_federales_kg"
        - "margen_neto_kg"
        - "presupuesto_nomina_gastos_kg"
        - "presupuesto_imss_sua_kg"
        - "extraordinarios_kg"
        - "provisiones_planta_kg"
        - "sobrante_antes_hg_kg"
        - "hg_kg"
        - "sobrante_con_hg_kg"
        - "com_desc_kg"
        - "resultado_kg"
      format: "$/kg"

  implementation:
    - >
      Derivar una unidad efectiva:
      seriesMetric ? seriesUnit : metric.
    - "Usar esa unidad efectiva en ticks del eje Y."
    - "Usar esa unidad efectiva donde el modal formatea la serie seleccionada."
    - "No romper el modo original de Rentabilidad IGF Diario."

chart_title:
  requirement: >
    Cuando seriesMetric está activo, el encabezado principal debe identificar
    claramente la métrica seleccionada y no generar una lectura contradictoria
    de 'Rentabilidad IGF Diario' frente a 'Gráfica · Margen'.
  acceptable:
    - "Gráfica · Margen"
    - "Gráfica · Venta en kilos"
  legacy:
    - "Sin seriesMetric conservar título actual."

unchanged:
  - "Panel vertical 067."
  - "ISO week."
  - "Prev/Next."
  - "REAL/PARCIAL/PROYECTADA."
  - "064-R1."
  - "065-R1."
  - "066-R1."
  - "Forecast comparison."
  - "No fetch de mes anterior en IGF Diario."
  - "ARR."
  - "Pronóstico."
  - "Excel."

recommended_files:
  - "lib/igf-diario-weekly-plant.js"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "test/igf-diario-weekly-plant-view-067.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-HISTORY-CHART-UNITS-067-R1.md"

mandatory_tests:
  - "Semana 40 sigue 28/09–04/10."
  - "Resultado legacy de septiembre se conserva cuando existe."
  - "Resultado cross-month suma evidencia disponible correctamente."
  - "J/K/L pre-octubre siguen null."
  - "Q/R/S/T pre-octubre siguen null."
  - "Resultado histórico no se vuelve 0."
  - "Resultado sin evidencia sigue null."
  - "Serie resultado_mxn pre-octubre contiene punto legacy."
  - "Serie componente 064 pre-octubre conserva gap."
  - "Venta usa eje kg."
  - "Ingreso usa eje $."
  - "HG importe usa eje $."
  - "Resultado importe usa eje $."
  - "Margen usa eje $/kg."
  - "C&D usa eje $/kg."
  - "Resultado $/kg usa eje $/kg."
  - "Modal legacy sin seriesMetric permanece igual."
  - "067 PASS."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "064-R1 PASS."
  - "Gráficas 054–055 PASS."
  - "frontend build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

out_of_scope:
  - "Cambiar diseño semanal."
  - "Cambiar fórmulas Excel."
  - "Inventar desglose histórico."
  - "Cambiar ARR."
  - "Cambiar Pronóstico."
  - "Writes productivos."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si la rama deja de contener exactamente 067 revisado, STOP."
  - "Si origin/main cambia, reportar antes de integrar."
  - "Si para recuperar Resultado legacy se requiere inventar gastos históricos, STOP."
  - "Si se necesita modificar Excel, STOP."

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-HISTORY-CHART-UNITS-067-R1.md"