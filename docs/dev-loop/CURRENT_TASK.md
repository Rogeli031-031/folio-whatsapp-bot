task_id: "IMPL-IGF-DIARIO-WEEKLY-PLANT-VIEW-067"

title: "Vista semanal vertical por planta en IGF Diario acumulado"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Cuando el usuario esté en IGF Diario acumulado y seleccione una planta,
  sustituir la sección horizontal
  "Comparación IGF Forecast vs última versión del mes anterior"
  por una vista financiera semanal vertical basada en la misma semántica
  del IGF Diario/Excel. Debe permitir navegar semana anterior/siguiente
  y abrir una gráfica de la métrica seleccionada con las mismas ventanas
  temporales existentes en las gráficas del dashboard.

base_sha: "d58216dd128c459df6ac9aff4a05a75f9505d8a6"

branch: "implementation/igf-diario-weekly-plant-view-067"

display_contract:
  when:
    planta_selected: true
    table_mode: "igf_diario"

  render:
    - "Mostrar tabla superior de IGF Diario acumulado para la planta seleccionada."
    - "Debajo mostrar nueva Vista semanal IGF Diario."
    - "No mostrar Comparación IGF Forecast vs última versión del mes anterior."

  forecast_mode:
    rule: >
      Si el usuario cambia a modo Forecast con una planta seleccionada,
      conservar el comportamiento existente de comparación contra el mes anterior.

  todas:
    rule: >
      Con Planta=Todas no mostrar la vista semanal individual.
      Mantener la vista actual de Zona Provincia.

old_comparison_contract:
  - >
    No eliminar necesariamente la lógica legacy si todavía la usa Forecast;
    solamente dejar de renderizarla/cargarla en
    planta seleccionada + IGF Diario acumulado.
  - >
    Evitar pedir igfMesAnterior cuando el usuario está en IGF Diario y la
    comparación no se va a mostrar.

weekly_calendar_contract:
  standard: "ISO-8601"

  week:
    start: "lunes"
    end: "domingo"

  numbering:
    - "Usar número ISO de semana del año."
    - "Incluir ISO week-year para semanas que crucen año."
    - "No usar Semana 1, Semana 2 relativas al mes."

  label_example: "Semana 41 · 05/10/2026–11/10/2026"

  cross_month:
    required: true
    example: "Semana 40 · 28/09/2026–04/10/2026"
    rule: >
      Una semana lunes-domingo no se corta el día 1 ni el último día del mes.

  selected_month_scope:
    rule: >
      La navegación semanal principal debe cubrir las semanas ISO que
      intersectan el mes IGF seleccionado. Para la primera/última semana,
      incluir días del mes adyacente cuando exista evidencia.
    future_adjacent_month:
      rule: >
        No inventar proyección del siguiente mes solo para completar una
        semana límite. Si el día adyacente no tiene datos/proyección válida,
        marcarlo incompleto.

default_week:
  source: "fecha de corte"
  rule: >
    Al seleccionar planta o cambiar mes/corte, abrir la semana ISO que
    contiene corte_ymd/uploadDay.

navigation:
  controls:
    - "◀ Semana anterior"
    - "Semana N · dd/mm–dd/mm/yyyy"
    - "Semana siguiente ▶"
    - "Gráfica"

  behavior:
    - "Mover exactamente 7 días."
    - "No cambiar la planta."
    - "No recargar toda la página."
    - "Conservar fecha de corte y Version <= corte."
    - "Deshabilitar navegación cuando no exista otra semana válida del contexto mensual."

week_status:
  REAL:
    rule: "Todos los días con información efectiva son anteriores al corte."

  PARCIAL:
    rule: "La semana contiene días reales y días proyectados."

  PROYECTADA:
    rule: "La semana disponible contiene únicamente días proyectados."

  INCOMPLETA:
    rule: >
      Puede combinarse visualmente con los estados anteriores cuando falta
      evidencia necesaria para una o más métricas.

vertical_layout:
  heading: "IGF Diario semanal"

  columns:
    - "Concepto"
    - "Valor semana"

  row_order:
    - key: "venta_kg"
      label: "Venta en kilos"
      excel_semantic: "B"

    - key: "precio_kg"
      label: "Precio de venta al público"
      excel_semantic: "C"

    - key: "ingreso_mxn"
      label: "Ingreso generado"
      excel_semantic: "D"

    - key: "costo_kg"
      label: "Costo del Gas LP"
      excel_semantic: "F"

    - key: "flete_kg"
      label: "Flete terrestre"
      excel_semantic: "G"

    - key: "margen_kg"
      label: "Margen"
      excel_semantic: "H"

    - key: "gasto_corporativo_kg"
      label: "Gasto Corporativo"
      excel_semantic: "J"

    - key: "inversiones_kg"
      label: "Inversiones"
      excel_semantic: "K"

    - key: "impuestos_federales_kg"
      label: "Impuestos Federales"
      excel_semantic: "L"

    - key: "margen_neto_kg"
      label: "Margen Neto"
      excel_semantic: "O"

    - key: "presupuesto_nomina_gastos_kg"
      label: "Presupuesto Nómina/Gastos"
      excel_semantic: "Q"

    - key: "presupuesto_imss_sua_kg"
      label: "Presupuesto IMSS/SUA"
      excel_semantic: "R"

    - key: "extraordinarios_kg"
      label: "Extraordinarios"
      excel_semantic: "S"

    - key: "provisiones_planta_kg"
      label: "Provisiones de la Planta"
      excel_semantic: "T"

    - key: "sobrante_antes_hg_kg"
      label: "Sobrante de Operación antes de HG"
      excel_semantic: "W"

    - key: "hg_mxn"
      label: "HG"
      excel_semantic: "Y"
      unit: "importe"

    - key: "sobrante_con_hg_kg"
      label: "Sobrante de Operación con HG"
      excel_semantic: "AB"

    - key: "com_desc_kg"
      label: "Comisiones y Descuentos"
      excel_semantic: "AD"

    - key: "resultado_kg"
      label: "RESULTADO ($/kg)"
      excel_semantic: "AF"

    - key: "resultado_mxn"
      label: "RESULTADO (Importe)"
      excel_semantic: "AG"

weekly_formula_contract:
  venta_kg:
    formula: "SUM(B_dia)"

  ingreso_mxn:
    formula: "SUM(D_dia)"

  precio_kg:
    formula: "SUM(D_dia) / SUM(B_dia)"

  costo_kg:
    formula: >
      ponderación semanal por Venta KG equivalente a la fila Semana del Excel

  flete_kg:
    formula: >
      ponderación semanal por Venta KG equivalente a la fila Semana del Excel

  margen_kg:
    formula: "precio_kg - costo_kg - flete_kg"

  expense_components:
    rule: >
      J/K/L/Q/R/S/T semanales deben usar exactamente el importe diario
      asignado por 064/064-R1 y dividir la suma semanal entre Venta KG semanal.

  gasto_corporativo_kg:
    formula: "SUM(gasto_corporativo_mxn_dia) / SUM(B_dia)"

  inversiones_kg:
    formula: "SUM(inversiones_mxn_dia) / SUM(B_dia)"

  impuestos_federales_kg:
    formula: "SUM(impuestos_federales_mxn_dia) / SUM(B_dia)"

  margen_neto_kg:
    formula: >
      margen_kg
      - gasto_corporativo_kg
      - inversiones_kg
      - impuestos_federales_kg

  presupuesto_nomina_gastos_kg:
    formula: "SUM(nomina_mxn_dia) / SUM(B_dia)"

  presupuesto_imss_sua_kg:
    formula: "SUM(imss_mxn_dia) / SUM(B_dia)"

  extraordinarios_kg:
    formula: "SUM(extraordinarios_mxn_dia) / SUM(B_dia)"

  provisiones_planta_kg:
    formula: "SUM(provisiones_mxn_dia) / SUM(B_dia)"

  sobrante_antes_hg_kg:
    formula: >
      margen_neto_kg
      - presupuesto_nomina_gastos_kg
      - presupuesto_imss_sua_kg
      - extraordinarios_kg
      - provisiones_planta_kg

  hg_mxn:
    formula: "SUM(Y_dia)"

  hg_kg:
    internal_formula: "hg_mxn / venta_kg"

  sobrante_con_hg_kg:
    formula: "sobrante_antes_hg_kg - hg_kg"

  com_desc_kg:
    formula: >
      misma ponderación semanal C&D por Venta KG usada por el IGF Diario

  resultado_kg:
    formula: "sobrante_con_hg_kg + com_desc_kg"

  resultado_mxn:
    formula: >
      SUM(AG_dia), usando precisión completa.
      Debe ser equivalente también a resultado_kg * venta_kg dentro del
      redondeo monetario normal.

precision_contract:
  - "Usar precisión interna completa."
  - "No reconstruir cálculos a partir de números visuales redondeados."
  - "Redondear únicamente para mostrar."
  - "$/kg normalmente 2 decimales."
  - "kg con separador de miles."
  - "Importes monetarios con separador de miles; conservar hasta 2 decimales cuando sea útil."
  - "Negativos visibles en rojo."
  - "Resultado positivo puede resaltarse en verde."
  - "Valores faltantes se muestran como —, nunca como 0 inventado."

expense_daily_source:
  from_october_2026:
    source:
      - "arr.igf_diario_gastos_desglose"
      - "arr.igf_diario_gastos_distribucion_manual"
      - "igf-diario-gastos-distribucion.buildExpenseDailySchedule"

    requirements:
      - "Usar los siete conceptos 064."
      - "Respetar overrides diarios 064-R1."
      - "0 manual es válido."
      - "Día inhábil conserva semántica actual."
      - "La suma diaria de cada concepto debe cerrar exactamente al monto mensual."

  pre_october:
    rule: >
      No inventar desglose J/K/L/Q/R/S/T donde no exista evidencia histórica.
      En semanas que incluyan días pre-octubre, las métricas detalladas que no
      puedan construirse de forma completa quedan null/—.
    allowed:
      - "Venta"
      - "Precio"
      - "Ingreso"
      - "Costo"
      - "Flete"
      - "Margen"
      - "HG"
      - "C&D"
      - "Resultado"
      - "otras métricas legacy únicamente si existe evidencia directa"
    forbidden:
      - "Distribuir gasto legacy arbitrariamente entre conceptos nuevos."

margin_contract:
  - "Precio/Costo/Flete deben usar los valores efectivos de 065-R1."
  - "Overrides manuales C/F/G deben verse en la semana."
  - "Rangos 065-R1 deben fluir al resumen semanal."
  - "No escribir ni modificar esos overrides desde la vista semanal."

discount_contract:
  - "C&D debe usar el mismo valor diario efectivo/proyectado del IGF Diario."
  - "Preservar signo."
  - "No abs()."
  - "Debe mantener paridad con AD del Excel."

hg_contract:
  - "HG importe corresponde semánticamente a Y."
  - "HG $/kg interno corresponde Y/B."
  - "Preservar signo."
  - "No reconstruir con HG% del ARR."

weekly_backend:
  recommended_module: "lib/igf-diario-weekly-plant.js"

  requirements:
    - "Centralizar ISO week helpers."
    - "Centralizar agregación semanal."
    - "No duplicar fórmulas distintas entre tabla semanal y gráfica."
    - "No leer XLSX."
    - "No generar XLSX para calcular."
    - "Reutilizar materialización diaria actual del IGF."
    - "Reutilizar distribución diaria de gastos 064-R1."

api_contract:
  recommended_endpoint: "GET /api/dashboard/igf-diario-semanal"

  query:
    - "year"
    - "month"
    - "plant_code"
    - "week_anchor=YYYY-MM-DD"
    - "upload_day/corte"
    - "version_as_of_corte"

  response:
    ok: true
    year: "selected IGF year"
    month: "selected IGF month"
    plant_code: "canonical/effective plant"
    empresa: "display name"
    corte_ymd: "corte"
    week:
      iso_week_year: "number"
      iso_week: "number"
      fecha_desde: "lunes YYYY-MM-DD"
      fecha_hasta: "domingo YYYY-MM-DD"
      estado: "real|parcial|proyectada"
      complete: "boolean"
      missing_components: "array"
    metrics:
      venta_kg: "number|null"
      precio_kg: "number|null"
      ingreso_mxn: "number|null"
      costo_kg: "number|null"
      flete_kg: "number|null"
      margen_kg: "number|null"
      gasto_corporativo_kg: "number|null"
      inversiones_kg: "number|null"
      impuestos_federales_kg: "number|null"
      margen_neto_kg: "number|null"
      presupuesto_nomina_gastos_kg: "number|null"
      presupuesto_imss_sua_kg: "number|null"
      extraordinarios_kg: "number|null"
      provisiones_planta_kg: "number|null"
      sobrante_antes_hg_kg: "number|null"
      hg_mxn: "number|null"
      hg_kg: "number|null"
      sobrante_con_hg_kg: "number|null"
      com_desc_kg: "number|null"
      resultado_kg: "number|null"
      resultado_mxn: "number|null"

  optional:
    days: >
      Puede devolver evidencia diaria de los 7 días si ayuda a gráfica/tests,
      sin exponer datos innecesarios.

chart_contract:
  trigger:
    - "Cada fila de la tabla vertical es seleccionable."
    - "La fila seleccionada queda visualmente resaltada."
    - "Selección inicial: RESULTADO (Importe)."
    - "Botón Gráfica abre la métrica seleccionada."

  modal:
    recommendation: >
      Reutilizar/extender IgfDiarioGraficaModal en lugar de crear una
      experiencia visual completamente distinta.

  existing_windows_must_remain:
    - "1D"
    - "5D"
    - "1M"
    - "3M"
    - "YTD"
    - "1A"
    - "5A"
    - "Todo"

  chart_metrics:
    - "Venta en kilos"
    - "Precio"
    - "Ingreso"
    - "Costo"
    - "Flete"
    - "Margen"
    - "Gasto Corporativo"
    - "Inversiones"
    - "Impuestos Federales"
    - "Margen Neto"
    - "Nómina/Gastos"
    - "IMSS/SUA"
    - "Extraordinarios"
    - "Provisiones"
    - "Sobrante antes HG"
    - "HG"
    - "Sobrante con HG"
    - "C&D"
    - "Resultado $/kg"
    - "Resultado Importe"

  units:
    kg: "Venta"
    mxn: "Ingreso, HG, Resultado Importe"
    per_kg: "resto de métricas financieras por kg"

  existing_chart_features:
    - "Real."
    - "Proyectado."
    - "Línea de tendencia real."
    - "Hover/selección con fecha y valor."
    - "Ventanas existentes."
    - "Cobertura/missing sin convertir null a 0."

  history:
    rule: >
      Para rangos históricos donde una métrica detallada no existía,
      dibujar huecos/null. No inventar serie.

frontend_component:
  recommended: "frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx"

  requirements:
    - "Carga únicamente cuando planta seleccionada + IGF Diario."
    - "Resetear a semana de corte al cambiar planta/mes/corte."
    - "Prev/Next cambia anchor 7 días."
    - "Mostrar loading/error sin ocultar tabla superior."
    - "Responsive escritorio y celular."
    - "Vista vertical; no crear tabla horizontal ancha."
    - "Concepto a la izquierda, valor a la derecha."
    - "Botones visibles sin scroll horizontal."

performance_contract:
  - "No query por día."
  - "No query por concepto."
  - "No 7 queries para los siete gastos."
  - "Cargar desglose una vez por mes involucrado."
  - "Cargar overrides de distribución una vez por planta/mes."
  - "Construir los siete schedules en memoria."
  - "Reutilizar cache/cargas existentes de ventas, compras y precio."
  - "Una llamada frontend por cambio de semana."
  - "La gráfica puede hacer una llamada por cambio de rango, como actualmente."
  - "No degradar el acumulado de Todas."
  - "No introducir N+1 por plantas."

plant_identity_contract:
  - "Puebla ↔ GT Puebla."
  - "Tehuacan ↔ Tehuacán."
  - "Queretaro ↔ Querétaro ↔ GTM Queretaro."
  - "San Luis ↔ GTM San Luis."
  - "Acapulco."
  - "Morelos."
  - "Reutilizar identidad canónica existente; no hardcodear lógica distinta por planta."

unchanged_contracts:
  - "066-R1 Venta/Resultado permanece."
  - "066 Margen/Descuento/Operativos/Corporativos/Impuestos/HG permanece."
  - "065-R1 Precio/Costo/Flete y rangos permanece."
  - "064-R1 distribución diaria permanece."
  - "064 desglose permanece."
  - "Pronóstico PROM/lookback permanece."
  - "ARR permanece."
  - "Excel permanece."
  - "No modificar CONTROL DE COMPRAS."

recommended_files:
  - "lib/igf-diario-weekly-plant.js"
  - "lib/igf-diario-grafica.js"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-weekly-plant-view-067.test.js"
  - "test/igf-diario-grafica-rentabilidad-nuevos-054.test.js"
  - "test/igf-diario-grafica-paridad-excel-054-r1.test.js"
  - "test/igf-diario-grafica-corte-cd-clientes-054-r2.test.js"
  - "test/igf-diario-grafica-produccion-coverage-054-r3.test.js"
  - "test/igf-diario-grafica-ejes-tendencia-cierre-055.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-PLANT-VIEW-067.md"

mandatory_tests:
  - "Planta + IGF Diario muestra panel semanal."
  - "Planta + IGF Diario no muestra comparación mes anterior."
  - "Planta + Forecast conserva comparación legacy."
  - "Todas no muestra panel semanal."
  - "Semana inicia lunes y termina domingo."
  - "Número de semana es ISO, no índice del mes."
  - "Semana 28/09–04/10 cruza mes sin partirse."
  - "Cambio Prev resta exactamente 7 días."
  - "Cambio Next suma exactamente 7 días."
  - "Cambio de planta resetea a semana del corte."
  - "Cambio de corte resetea a semana del corte."
  - "REAL/PARCIAL/PROYECTADA correcto."
  - "Venta semanal = suma B."
  - "Ingreso semanal = suma D."
  - "Precio semanal = D/B."
  - "Costo/Flete ponderados."
  - "Margen = C-F-G."
  - "J/K/L usan importes diarios 064-R1 / B semana."
  - "Q/R/S/T usan importes diarios 064-R1 / B semana."
  - "O, W, AB, AF respetan fórmulas Excel."
  - "Y/HG importe suma días."
  - "AD preserva signo."
  - "AG suma resultado diario con precisión completa."
  - "Resultado semanal tiene paridad con fila Semana equivalente del Excel."
  - "Override Precio 065-R1 cambia semana."
  - "Override Costo 065-R1 cambia semana."
  - "Override Flete 065-R1 cambia semana."
  - "Override gasto diario 064-R1 cambia semana."
  - "0 manual válido."
  - "null no se vuelve 0."
  - "Semana pre-octubre no inventa desglose."
  - "Seleccionar fila cambia métrica gráfica."
  - "Gráfica abre en métrica seleccionada."
  - "1D/5D/1M/3M/YTD/1A/5A/Todo permanecen."
  - "Gráfica mantiene real/proyectado/tendencia."
  - "Histórico sin componente crea gap."
  - "No hardcodear semanas, plantas o fechas."
  - "No parsing XLSX."
  - "No query por concepto."
  - "No query por día."
  - "066-R1 PASS."
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
  - "Grafica 054/054-R1/054-R2/054-R3/055 PASS."
  - "Excel 036-044 y regresiones relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

out_of_scope:
  - "Cambiar fórmulas del Excel."
  - "Editar valores desde la tabla semanal."
  - "Cambiar ARR."
  - "Cambiar Pronóstico."
  - "Cambiar cálculo mensual 066."
  - "Modificar gastos 064 desde esta vista."
  - "Modificar margen 065-R1 desde esta vista."
  - "Writes productivos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != d58216dd128c459df6ac9aff4a05a75f9505d8a6, STOP."
  - "Si requiere inventar desglose pre-octubre, STOP."
  - "Si la semana se tiene que partir al cambiar de mes, STOP y corregir diseño."
  - "Si para obtener valores se requiere abrir/parsing del XLSX, STOP."
  - "Si aparece N+1 por concepto/día, STOP."
  - "Si se rompe 066-R1, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-PLANT-VIEW-067.md"