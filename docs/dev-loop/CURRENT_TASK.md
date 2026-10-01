task_id: "IMPL-IGF-GRAFICA-EJES-TENDENCIA-CIERRE-055"

title: "Ejes de referencia, tendencia semanal de clientes y cierre proyectado"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-29"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-29"

production_evidence: >
  La gráfica IGF Diario ya funciona en producción después de 054-R3.
  La línea de rentabilidad, real/proyectado, tendencia, semanas,
  Clientes Nuevos y Top 10 se visualizan.
  El usuario solicita mejorar legibilidad de ejes, agregar tendencia semanal
  de clientes nuevos y utilizar el espacio junto a Semana 5 para mostrar
  la rentabilidad proyectada al cierre del mes.

objective: >
  Mejorar la lectura ejecutiva de la gráfica IGF Diario agregando referencias
  visibles en ejes X/Y, una tendencia semanal de clientes nuevos y una tarjeta
  de cierre proyectado mensual que use exactamente AF y AE del mismo pipeline
  financiero del IGF Diario.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "8f8bbd79aaafed126449d3090338d1d5a8adf5eb"

branch: "impl/igf-grafica-ejes-tendencia-cierre-055"

in_scope:
  - "lib/igf-diario-grafica.js"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "tests 055"
  - "docs/dev-loop/reports/IMPL-IGF-GRAFICA-EJES-TENDENCIA-CIERRE-055.md"
  - "docs/dev-loop/CURRENT_TASK.md solo transición de status"

out_of_scope:
  - "cambiar AF/AE"
  - "cambiar forecast"
  - "cambiar Compras"
  - "cambiar definición de clientes nuevos"
  - "cambiar Top 10"
  - "cambiar seguridad"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

main_axis_contract:
  - "Agregar referencias visibles al eje Y."
  - "Agregar referencias visibles al eje X."
  - "No saturar la gráfica."
  - "Los puntos, líneas Real/Proyectado y tendencia existentes no cambian."

y_axis:
  tick_count_target: 5
  - "Generar aproximadamente 5 ticks legibles."
  - "Incluir siempre 0."
  - "Los ticks deben cubrir yMin/yMax sin cortar datos."
  - "Usar valores redondeados/nice, no decimales arbitrarios."
  - "Modo $: formato monetario compacto."
  - "Ejemplos: -$200k, -$100k, $0, $100k, $200k."
  - "Modo $/kg: 2 decimales."
  - "Ejemplos: -$2.00, $0.00, $2.00, $4.00."
  - "Dibujar línea horizontal tenue por tick."
  - "La línea de cero sigue siendo más visible que las demás."
  - "El label de Y cambia con toggle: Resultado $ / Resultado $/kg."

x_axis:
  max_labels: 7
  - "Incluir primera y última fecha visible."
  - "Distribuir las demás referencias uniformemente."
  - "Evitar labels duplicados."
  - "1D/5D/1M: dd/MM."
  - "3M: dd MMM."
  - "YTD/1A: MMM yy."
  - "5A/Todo: usar mes/año o año según densidad."
  - "No modificar el espaciado real de los puntos."
  - "Los ticks son solo etiquetas de referencia."

client_weekly_trend:
  source_of_truth: "new_clients_chart existente"
  metric: "cantidad de clientes nuevos"
  - "Mantener barras SEM -2, SEM -1 y días de semana actual."
  - "Agregar una línea visible llamada Tendencia semanal."
  - "Usar tres agregados:"
  - "SEM -2 = count del bucket SEM -2."
  - "SEM -1 = count del bucket SEM -1."
  - "SEM ACTUAL = suma de los buckets diarios de la semana actual."
  - "La semana actual debe marcarse como parcial."
  - "No proyectar días futuros."
  - "No convertir días futuros en cero."
  - "La línea debe representar clientes, no kilos."
  - "Tooltip de cada punto semanal muestra cantidad de clientes y kg captados."
  - "Agregar leyenda pequeña Tendencia semanal."
  - "No cambiar la definición 053BC de cliente nuevo."

month_close:
  response_field: "month_close"
  scope: "mes seleccionado del IGF"
  - "Calcular con los puntos completos del MES seleccionado, no con el range visual."
  - "Cambiar 1D/5D/3M no cambia el cierre proyectado de septiembre."
  - "Debe usar todas las fechas del mes seleccionado."

month_close_shape:
  label: "CIERRE PROYECTADO"
  year: "number"
  month: "number"
  resultado_mxn: "number|null"
  resultado_per_kg: "number|null"
  venta_kg: "number|null"
  real_mxn: "number|null"
  projected_mxn: "number|null"
  complete: "boolean"
  missing_components: "string[]"
  has_projection: "boolean"

month_close_math:
  - "resultado_mxn = suma de AF diario del mes: real antes del corte + proyectado desde el corte."
  - "resultado_per_kg = resultado_mxn / suma B del mes."
  - "NO promediar AE diarios."
  - "Debe coincidir con TOTAL MES AF/AE del Excel cuando la cobertura es completa."
  - "real_mxn = suma AF de puntos estado=real."
  - "projected_mxn = suma AF de puntos estado=proyectado."
  - "venta_kg = suma B real + proyectada."
  - "No extrapolar mediante línea de tendencia."
  - "No usar la tendencia gráfica para calcular el cierre."

month_close_coverage:
  - "Si todos los días relevantes tienen cobertura financiera, complete=true."
  - "Si un día con venta positiva no tiene AF/AE por falta de componente, complete=false."
  - "No inventar ese día como cero."
  - "Cuando complete=false, no presentar una proyección parcial como definitiva."
  - "La tarjeta debe mostrar Cobertura incompleta y los componentes faltantes."
  - "Cuando sea completa, mostrar normalmente la proyección."

month_close_label:
  - "Si existe al menos un día proyectado: CIERRE PROYECTADO."
  - "Si el mes está completamente cerrado y no hay puntos proyectados: CIERRE DEL MES."

month_close_ui:
  location: "inmediatamente después de las tarjetas Semana 1..Semana 5, en el espacio señalado por el usuario"
  - "Mismo lenguaje visual que las tarjetas semanales."
  - "Debe destacar más que una semana individual."
  - "Título superior."
  - "El número grande sigue el toggle actual."
  - "En modo $ mostrar resultado_mxn como valor principal."
  - "En modo $/kg mostrar resultado_per_kg como valor principal."
  - "Debajo mostrar el valor complementario."
  - "Mostrar Venta proyectada/acumulada en kg en texto pequeño."
  - "Mostrar Real + Proyectado cuando corresponda."
  - "No mover el Top 10."

month_close_example:
  mxn_mode: |
    CIERRE PROYECTADO
    $621,843
    $1.26/kg
    Venta: 493,527 kg
    Real + proyectado
  per_kg_mode: |
    CIERRE PROYECTADO
    $1.26/kg
    $621,843
    Venta: 493,527 kg

province_contract:
  - "Todas muestra cierre proyectado de Provincia."
  - "Usa exactamente los points de Provincia."
  - "No suma AE de plantas."
  - "AF Provincia = suma AF de plantas según contrato actual."
  - "AE Provincia = AF Provincia / B Provincia."
  - "Si Provincia está incompleta, la tarjeta también lo informa."

individual_contract:
  - "Tehuacán muestra exclusivamente su cierre."
  - "Puebla exclusivamente Puebla."
  - "Acapulco exclusivamente Acapulco."
  - "No mezclar plantas."

range_independence:
  - "month_close pertenece al mes seleccionado, no al range."
  - "1D, 5D, 1M, 3M, YTD, 1A, 5A y Todo deben mostrar el mismo cierre del mes seleccionado."
  - "El range solo cambia la gráfica principal."

acceptance_criteria:
  - "Eje Y muestra referencias numéricas."
  - "Eje Y incluye cero."
  - "Toggle $ cambia labels Y a moneda."
  - "Toggle $/kg cambia labels Y a $/kg."
  - "Eje X muestra máximo 7 fechas de referencia."
  - "La gráfica no se satura."
  - "Clientes Nuevos conserva las barras."
  - "Existe línea Tendencia semanal."
  - "SEM actual es la suma real de los días visibles de la semana actual."
  - "SEM actual está identificada como parcial."
  - "Días futuros no cuentan como cero."
  - "Tarjeta CIERRE PROYECTADO ocupa el área después de Semana 5."
  - "En $ usa AF mensual."
  - "En $/kg usa AF/B mensual."
  - "No usa promedio AE."
  - "Cierre coincide con TOTAL MES del Excel cuando complete=true."
  - "Cambiar range no cambia month_close."
  - "Cambiar toggle cambia solo presentación, no matemática."
  - "Provincia funciona."
  - "Planta individual funciona."
  - "054-R3 permanece intacta."
  - "No DB writes."
  - "No OpenAI."

validation:
  - "Mes con AF positivo."
  - "Mes con AF negativo."
  - "Mes con resultado $/kg negativo."
  - "Mes mixto real/proyectado."
  - "Mes totalmente real."
  - "Mes con componente faltante."
  - "Eje con todo positivo."
  - "Eje con todo negativo."
  - "Eje cruzando cero."
  - "1M con 30 puntos."
  - "5D."
  - "3M."
  - "YTD."
  - "Tendencia semanal clientes."
  - "Semana actual parcial."
  - "Provincia."
  - "Tehuacán."
  - "Paridad TOTAL MES Excel."
  - "Regresión 054/R1/R2/R3."
  - "git diff --check."

allowed_actions:
  - "crear rama 055 desde base_sha"
  - "agregar helpers puros de ticks"
  - "agregar cálculo month_close"
  - "agregar línea semanal clientes"
  - "ajustar TypeScript API"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama 055"

forbidden_actions:
  - "usar línea de tendencia para proyectar cierre"
  - "promediar AE diarios"
  - "rellenar días incompletos con cero"
  - "cambiar core financiero"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-GRAFICA-EJES-TENDENCIA-CIERRE-055.md"