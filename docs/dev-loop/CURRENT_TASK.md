task_id: "IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065"

title: "Margen diario editable por Costo KG y Flete KG desde el corte"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  En IGF Diario acumulado, convertir el valor Margen de cada planta en
  una acción clickeable que abra el detalle diario del mes. La vista debe
  mostrar horizontalmente FECHA, COSTO KG, FLETE KG y MARGEN BRUTO.
  Las fechas anteriores al corte son solo lectura. La fecha de corte y
  todas las posteriores permiten editar COSTO KG y/o FLETE KG.
  MARGEN BRUTO nunca se captura: se calcula como PRECIO - COSTO KG - FLETE KG.
  Los valores efectivos deben utilizarse también en el cálculo del Margen
  acumulado y en el Excel IGF Diario de la planta correspondiente.

base_sha: "e14185996626b22cf170c40c5cbcd2010cd4e8bc"

branch: "implementation/igf-diario-margen-diario-editable-065"

effective_from:
  year: 2026
  month: 10
  rule: >
    La funcionalidad de captura manual aplica para octubre 2026 y posteriores.
    Meses anteriores permanecen sin edición manual.

frozen_contracts:
  - "Forecast no cambia."
  - "IGF Diario acumulado sigue siendo el modo default."
  - "063 y 063-R1 de Margen/HG permanecen vigentes."
  - "064 y 064-R1 de Corporativos/Operativos permanecen intactos."
  - "No modificar ventas."
  - "No modificar Precio."
  - "No modificar HG."
  - "No modificar C&D."
  - "No modificar CONTROL DE COMPRAS."
  - "No sobrescribir datos fuente de Compras."
  - "No modificar septiembre 2026 ni meses anteriores."
  - "Zona Provincia es cálculo, nunca captura manual."

ui_contract:
  scope:
    - "Solo IGF Diario acumulado."
    - "Margen de cada fila planta es clickeable."
    - "Margen de Zona Provincia NO es editable."
    - "Forecast no abre este modal."

  modal_title: "Margen diario — {planta}"

  table_orientation: "horizontal"

  rows:
    row_1:
      label: "FECHA"
      source: "Columna A del IGF Diario"
    row_2:
      label: "COSTO KG"
      source: "Columna F efectiva del IGF Diario"
    row_3:
      label: "FLETE KG"
      source: "Columna G efectiva del IGF Diario"
    row_4:
      label: "MARGEN BRUTO"
      source: "Columna H calculada"

  columns:
    - "Un día del mes por columna."
    - "Permitir scroll horizontal."
    - "Mantener primera columna de labels visible si es práctico."

  cutoff_rule:
    before_cutoff:
      editable: false
      behavior:
        - "COSTO KG solo lectura."
        - "FLETE KG solo lectura."
        - "MARGEN BRUTO solo lectura."
    at_or_after_cutoff:
      editable: true
      behavior:
        - "COSTO KG editable."
        - "FLETE KG editable."
        - "MARGEN BRUTO calculado, no editable."

  calculation_display:
    formula: "MARGEN BRUTO = PRECIO - COSTO KG - FLETE KG"
    requirements:
      - "Recalcular visualmente al modificar Costo o Flete."
      - "Si Precio/Costo/Flete no son numéricos, Margen Bruto queda sin valor."
      - "No agregar una fila PRECIO a la tabla solicitada."

  save_behavior:
    - "Permitir editar varios días antes de Guardar."
    - "Guardar cambios de forma atómica."
    - "Después de guardar, refrescar el Margen acumulado de la planta."
    - "Recalcular Zona Provincia."
    - "No requerir refresh completo de la página."

  restore:
    - "Permitir Restaurar el valor automático de COSTO KG individualmente."
    - "Permitir Restaurar el valor automático de FLETE KG individualmente."
    - "Restaurar significa eliminar el override, no copiar el automático a la tabla manual."

persistence_contract:
  table: "arr.igf_diario_margen_manual"

  primary_key:
    - "plant_code"
    - "year"
    - "month"
    - "fecha"

  columns:
    - "costo_kg NUMERIC(18,6) NULL"
    - "flete_kg NUMERIC(18,6) NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"

  requirements:
    - "CREATE TABLE IF NOT EXISTS."
    - "Sin migración."
    - "Sin seed."
    - "Persistir solamente overrides explícitos."
    - "costo_kg y flete_kg son independientes."
    - "0 es un valor manual válido."
    - "No usar truthiness para detectar override."
    - "Si costo_kg y flete_kg quedan ambos NULL, eliminar el registro."
    - "No insertar registros para meses anteriores a 2026-10."
    - "No escribir en CONTROL DE COMPRAS."

manual_semantics:
  omitted_field: "No modificar ese campo."
  numeric_field: "Crear/actualizar override, incluyendo 0."
  null_field: "Restaurar automático eliminando override de ese campo."

effective_value_contract:
  costo_kg:
    before_cutoff: >
      Usar exactamente el valor automático/real que ya utiliza IGF Diario.
      Ignorar cualquier override almacenado.
    at_or_after_cutoff: >
      Si existe costo_kg manual, usarlo. Si no, usar el valor automático
      actual que ya utiliza IGF Diario.

  flete_kg:
    before_cutoff: >
      Usar exactamente el valor automático/real que ya utiliza IGF Diario.
      Ignorar cualquier override almacenado.
    at_or_after_cutoff: >
      Si existe flete_kg manual, usarlo. Si no, usar el valor automático
      actual que ya utiliza IGF Diario.

  price:
    - "Siempre automático."
    - "Usar la misma resolución de Precio que actualmente usa IGF Diario."
    - "No permitir edición desde esta funcionalidad."

  margen_bruto:
    formula: "precio - costo_kg_efectivo - flete_kg_efectivo"
    null_semantics:
      - "Si falta Precio, Margen = null."
      - "Si falta Costo, Margen = null."
      - "Si falta Flete, Margen = null."
      - "Nunca convertir null/vacío a 0."

cutoff_change_contract:
  example:
    first_cutoff: "2026-10-05"
    later_cutoff: "2026-10-06"
  behavior:
    - >
      Un override del 05/10 puede existir físicamente en la tabla,
      pero con corte 06/10 ya no tiene efecto.
    - "Para fecha < corte manda la fuente real/automática."
    - "No borrar overrides históricos automáticamente."
    - "Nunca permitir que un override cambie retrospectivamente un día cerrado."

plant_identity_contract:
  - "Usar las mismas equivalencias de planta de 063-R1."
  - "Tehuacán/Tehuacan debe resolver correctamente."
  - "GTM Queretaro/Querétaro/Queretaro debe resolver correctamente."
  - "No hardcodear una planta específica."
  - "El plant_code persistido debe ser canónico/estable según los contratos existentes."

api_contract:
  detail:
    method: "GET"
    path: "/api/dashboard/igf-diario-margen-diario"
    params:
      - "year"
      - "month"
      - "plant_code"
      - "upload_day"
      - "version_as_of_corte cuando corresponda"

    response:
      - "year"
      - "month"
      - "plant_code"
      - "corte"
      - "days"

    day_fields:
      - "fecha"
      - "precio"
      - "costo_kg"
      - "flete_kg"
      - "margen_bruto"
      - "editable"
      - "costo_manual"
      - "flete_manual"

  patch:
    method: "PATCH"
    path: "/api/dashboard/igf-diario-margen-diario"

    body: |
      {
        year,
        month,
        plant_code,
        upload_day,
        changes: [
          {
            fecha,
            costo_kg?: number | null,
            flete_kg?: number | null
          }
        ]
      }

    requirements:
      - "Aceptar varios días en un solo Guardar."
      - "Validar todos los cambios antes de escribir."
      - "Ejecutar todas las escrituras en una sola transacción."
      - "Si una falla, ROLLBACK completo."
      - "Rechazar fechas < corte."
      - "Rechazar fechas fuera del mes."
      - "Rechazar periodos anteriores a 2026-10."
      - "Rechazar NaN/Infinity."
      - "Aceptar 0 como valor explícito."
      - "No exigir editar Costo y Flete juntos."

  security:
    - "dashboardAuthMiddleware."
    - "dashboardBlockGAFinancialKpis."
    - "dashboardBlockGVForbidden."
    - "assertPlantaPermitidaDashboard para escritura."
    - "No ampliar permisos."

recommended_backend_design:
  module: "lib/igf-diario-margen-manual.js"
  helpers:
    - "ensureTable"
    - "listMonthOverrides"
    - "overridesForPlant"
    - "applyMarginOverrides"
    - "parsePatch"
    - "patchMarginOverrides"
  performance:
    - >
      Para IGF Diario acumulado de Todas, cargar overrides del mes en una
      consulta y mapearlos por planta/fecha. No introducir una consulta
      adicional por planta.
    - >
      El detalle clickeable puede consultar únicamente la planta seleccionada.

accumulated_contract:
  current_formula: >
    Margen acumulado continúa siendo ponderado por Venta KG, igual que
    TOTAL MES del Excel.

  formula: |
    SUM(MARGEN_BRUTO_DIA * VENTA_KG_DIA)
    /
    SUM(VENTA_KG_DIA)

  requirements:
    - "Aplicar Costo/Flete efectivos antes de totalMesMarginAndHg."
    - "No hacer promedio simple de H."
    - "Mantener denominador solamente sobre días con Venta y Margen numéricos."
    - "Después de guardar, el Margen de la planta debe cambiar si corresponde."
    - "Zona Provincia debe recalcularse ponderadamente."
    - "Ingreso, Utilidad y Resultado derivados deben recalcularse usando el nuevo Margen."
    - "HG permanece intacto."

excel_contract:
  individual:
    - "Aplicar override solamente si fecha >= corte."
    - "F = costo_kg manual si existe; si no, comportamiento actual."
    - "G = flete_kg manual si existe; si no, comportamiento actual."
    - "H debe mantener fórmula, nunca valor hardcodeado."

  h_formula_semantics: >
    IF(
      AND(ISNUMBER(Cfila),ISNUMBER(Ffila),ISNUMBER(Gfila)),
      Cfila-Ffila-Gfila,
      ""
    )

  detailed_october_columns:
    F: "COSTO KG efectivo"
    G: "FLETE KG efectivo"
    H: "MARGEN BRUTO fórmula C-F-G"

  legacy_layout:
    - >
      La posición F/G/H no cambia en meses legacy, pero no se aplican
      overrides manuales antes de octubre 2026.

  todas:
    - "Cada hoja planta utiliza únicamente sus propios overrides."
    - "No cruzar overrides entre plantas."
    - "IGF Diario Provincia deriva de las hojas planta."
    - "F/G Provincia siguen ponderados desde las hojas planta."
    - "H Provincia conserva fórmula C-F-G."

  auditability:
    - "Cuando F o G sea manual, Excel debe contener ese valor efectivo."
    - "H siempre debe contener fórmula basada en C/F/G."
    - "No reemplazar H por el Margen calculado en Node."

source_parity_contract:
  rule: >
    La vista del modal, IGF Diario acumulado y Excel deben consumir
    la misma resolución efectiva de Precio/Costo/Flete.

  forbidden:
    - "Calcular una versión para UI y otra para Excel."
    - "Duplicar reglas de precedencia manual/automático."
    - "Modificar CONTROL DE COMPRAS para lograr la paridad."

modal_example:
  corte: "2026-10-05"
  behavior:
    "2026-10-01": "read-only"
    "2026-10-02": "read-only"
    "2026-10-03": "read-only"
    "2026-10-04": "read-only"
    "2026-10-05": "editable"
    "2026-10-06": "editable"
    "2026-10-07": "editable"

calculation_example:
  precio: 20.06
  costo_original: 12.29
  flete: 1.23
  margen_original: 6.54
  costo_manual: 12.60
  margen_resultante: 6.23
  formula: "20.06 - 12.60 - 1.23 = 6.23"
  note: "No hardcodear estos números."

historical_contract:
  - "Fechas < corte no editables."
  - "Overrides antiguos no tienen efecto detrás del corte."
  - "Meses < 2026-10 no tienen captura manual."
  - "No alterar Excel histórico."
  - "No alterar Compras histórica."

mandatory_tests:
  - "065: DDL idempotente."
  - "065: sin seed/migración."
  - "065: GET devuelve Fecha/Costo/Flete/Margen del mismo origen que Excel."
  - "065: fecha < corte read-only."
  - "065: fecha == corte editable."
  - "065: fecha > corte editable."
  - "065: PATCH fecha < corte rechazado."
  - "065: PATCH fuera del mes rechazado."
  - "065: septiembre 2026 rechazado para escritura."
  - "065: Costo manual tiene precedencia desde corte."
  - "065: Flete manual tiene precedencia desde corte."
  - "065: Costo y Flete son independientes."
  - "065: 0 Costo manual es explícito."
  - "065: 0 Flete manual es explícito."
  - "065: null restaura automático."
  - "065: omitido preserva valor previo."
  - "065: ambos null eliminan fila."
  - "065: lote multi-día es atómico."
  - "065: rollback completo ante error."
  - "065: override guardado deja de aplicar cuando fecha queda detrás de un nuevo corte."
  - "065: Margen = Precio-Costo-Flete."
  - "065: null no se convierte en 0."
  - "065: ejemplo 20.06-12.60-1.23 = 6.23."
  - "065: Margen acumulado sigue ponderación por Venta KG."
  - "065: editar día modifica acumulado de planta."
  - "065: Zona Provincia se recalcula."
  - "065: HG no cambia."
  - "065: Forecast no cambia."
  - "065: Excel individual F usa manual."
  - "065: Excel individual G usa manual."
  - "065: Excel H conserva fórmula C-F-G."
  - "065: Excel fecha < corte ignora manual."
  - "065: Excel Todas mantiene aislamiento por planta."
  - "065: Provincia deriva de hojas planta."
  - "065: Tehuacan/Tehuacán equivalentes."
  - "065: GTM Queretaro/Querétaro equivalentes."
  - "065: una carga de overrides de mes para acumulado, no N consultas adicionales."
  - "064-R1 PASS."
  - "064 PASS."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "Excel 036-041 y regresiones relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-margen-manual.js nuevo"
  - "lib/igf-diario-grafica.js"
  - "lib/igf-diario-expense-excel.js"
  - "lib/igf-diario-puebla.js solo si integración común lo requiere"
  - "lib/dashboard-arr-forecast.js solo si export necesita plumbing"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-margen-diario-editable-065.test.js"
  - "tests Excel relacionados"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065.md"

out_of_scope:
  - "Editar Precio."
  - "Editar Margen Bruto directamente."
  - "Editar fechas anteriores al corte."
  - "Cambiar CONTROL DE COMPRAS."
  - "Modificar lógica de Venta."
  - "Modificar HG."
  - "Modificar C&D."
  - "Modificar Corporativos/Operativos 064."
  - "Modificar rebalanceo 064-R1."
  - "Modificar Forecast."
  - "Writes productivos durante implementación."
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
  - "hardcodear plantas"
  - "hardcodear valores del ejemplo"
  - "reescribir CONTROL DE COMPRAS"
  - "guardar H directamente"
  - "permitir override detrás del corte"
  - "usar Number(null) como 0"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065.md"