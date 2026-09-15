task_id: "IMPL-ARR-ANNUAL-PLANT-SHEETS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-15"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Extender el Excel anual de ARR agregando una hoja por planta con el detalle
  anual YTD de CASA y COMISIONISTA, conservando intactas las hojas consolidadas
  CASA ANUAL y COMISIONISTA ANUAL y sin modificar las hojas históricas CASA,
  COMISIONISTA ni EVALUACION.

new_plant_sheets:
  - "PUEBLA"
  - "TEHUACAN"
  - "ACAPULCO"
  - "QUERETARO"
  - "SAN LUIS"
  - "MORELOS"

sheet_contract:
  rule: >
    Cada hoja de planta debe contener primero la sección CASA y debajo la sección
    COMISIONISTA, utilizando exactamente el mismo periodo, clasificación,
    subcategorías, movimientos, deltas, contribuciones y comentarios ya
    implementados en el reporte anual.

period_contract:
  rule: >
    Reutilizar sin modificar el contrato YTD existente:
    enero hasta el mes seleccionado vs el mismo rango del año anterior.

section_casa:
  title: "CASA · ANÁLISIS ANUAL YTD"

  summary_columns:
    - "AUTOTANQUE Δ TON"
    - "PORTÁTIL Δ TON"
    - "CARBURACIÓN Δ TON"
    - "TOTAL Δ TON"

  client_sections:
    negative:
      title: "CLIENTES CASA CON IMPACTO NEGATIVO"
      movement_types:
        - "DISMINUYERON"
        - "DEJARON DE COMPRAR"

    positive:
      title: "CLIENTES CASA CON IMPACTO POSITIVO"
      movement_types:
        - "AUMENTARON"
        - "NUEVOS"

section_comisionista:
  title: "COMISIONISTA · ANÁLISIS ANUAL YTD"

  summary_columns:
    - "AUTOTANQUE Δ TON"
    - "PORTÁTIL Δ TON"
    - "CARBURACIÓN Δ TON"
    - "TOTAL Δ TON"

  client_sections:
    negative:
      title: "CLIENTES COMISIONISTA CON IMPACTO NEGATIVO"
      movement_types:
        - "DISMINUYERON"
        - "DEJARON DE COMPRAR"

    positive:
      title: "CLIENTES COMISIONISTA CON IMPACTO POSITIVO"
      movement_types:
        - "AUMENTARON"
        - "NUEVOS"

plant_client_columns:
  - "SUBCATEGORÍA"
  - "CLIENTE"
  - "VENTA YTD AÑO ANTERIOR (TON)"
  - "VENTA YTD AÑO ACTUAL (TON)"
  - "DELTA VENTA (TON)"
  - "TIPO DE MOVIMIENTO"
  - "CONTRIBUCIÓN AL MOVIMIENTO (%)"
  - "COMENTARIO / EVIDENCIA REGISTRADA"

column_rule: >
  No repetir la columna PLANTA dentro de las hojas individuales, porque la planta
  ya está determinada por el nombre de la hoja.

must_reuse:
  - "misma fuente arr.ventas_diarias_cliente"
  - "misma fuente arr.cliente_comentarios"
  - "misma clasificación CASA/COMISIONISTA"
  - "misma clasificación de subcategoría"
  - "misma lógica YTD"
  - "misma lógica de movimientos"
  - "misma lógica de contribución"
  - "misma política de comentarios"

must_preserve:
  - "CASA ANUAL"
  - "COMISIONISTA ANUAL"
  - "CASA"
  - "COMISIONISTA"
  - "EVALUACION"
  - "botón Exportar Excel"
  - "estructura contractual del workbook existente"

ordering:
  suggested:
    - "CASA"
    - "COMISIONISTA"
    - "EVALUACION"
    - "CASA ANUAL"
    - "COMISIONISTA ANUAL"
    - "PUEBLA"
    - "TEHUACAN"
    - "ACAPULCO"
    - "QUERETARO"
    - "SAN LUIS"
    - "MORELOS"

formatting:
  - "Mantener estilo visual consistente con CASA ANUAL y COMISIONISTA ANUAL."
  - "Diferenciar visualmente negativos y positivos."
  - "Mantener comentarios legibles."
  - "Aplicar anchos de columna razonables."
  - "Freeze panes cuando aporte legibilidad."
  - "Autofilter en tablas de clientes si ya está soportado."
  - "Evitar repetir datos innecesarios."

acceptance_criteria:
  - "Existen las seis hojas de planta."
  - "Cada hoja contiene CASA y COMISIONISTA."
  - "Los datos pertenecen únicamente a esa planta."
  - "No aparece columna PLANTA en detalle de cliente."
  - "Autotanque/Portátil/Carburación/Total coinciden con consolidado."
  - "Clientes negativos coinciden con la planta/categoría correctas."
  - "Clientes positivos coinciden con la planta/categoría correctas."
  - "Comentarios corresponden al cliente correcto."
  - "Sin comentario no inventa causa."
  - "CASA ANUAL y COMISIONISTA ANUAL siguen intactas."
  - "CASA, COMISIONISTA y EVALUACION siguen intactas."
  - "Workbook abre sin corrupción."

tests_required:
  - "PUEBLA existe."
  - "TEHUACAN existe."
  - "ACAPULCO existe."
  - "QUERETARO existe."
  - "SAN LUIS existe."
  - "MORELOS existe."
  - "cada hoja tiene sección CASA."
  - "cada hoja tiene sección COMISIONISTA."
  - "sin mezcla de clientes entre plantas."
  - "totales de planta coinciden con las filas equivalentes de CASA ANUAL."
  - "totales de planta coinciden con las filas equivalentes de COMISIONISTA ANUAL."
  - "columnas cliente no incluyen PLANTA."
  - "comentarios correctos."
  - "workbook válido."
  - "build frontend sigue pasando."

in_scope:
  - "generación de hojas por planta"
  - "reutilización de datos ya calculados"
  - "formato de hojas nuevas"
  - "tests"
  - "workbook de prueba"
  - "CURRENT_TASK"
  - "reporte de implementación"

out_of_scope:
  - "cambiar lógica YTD"
  - "cambiar clasificación de movimientos"
  - "inferir causas"
  - "modificar SQL/schema"
  - "modificar Director IA"
  - "cambiar EVALUACION"
  - "reemplazar hojas existentes"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/arr-annual-plant-sheets-001"
  - "modificar generador/exportador anual mínimo"
  - "agregar helpers de presentación reutilizando los datos existentes"
  - "agregar tests"
  - "generar workbook de prueba"
  - "commit/push solo a rama autorizada"

forbidden_actions:
  - "duplicar lógica de negocio YTD"
  - "crear nueva fuente de verdad"
  - "modificar SQL/schema"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-ARR-ANNUAL-PLANT-SHEETS-001.md"

final_state: "DONE_PENDING_REVIEW"