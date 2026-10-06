task_id: "IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1"

title: "Margen diario vertical con Precio editable y rangos independientes C/F/G"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Extender 065 para que el modal Margen diario use un listado vertical
  por fecha con las columnas FECHA, PRECIO, COSTO KG, FLETE KG y
  MARGEN BRUTO. Desde la fecha de corte, PRECIO (C), COSTO KG (F)
  y FLETE KG (G) podrán editarse individualmente. Además, cada una
  de esas tres variables tendrá su propio selector independiente
  Desde/Hasta/Valor para aplicar o restaurar el valor automático en
  un rango de fechas. MARGEN BRUTO (H) nunca será editable y seguirá
  calculándose como C-F-G. Dashboard, acumulado y Excel deberán usar
  exactamente los mismos valores efectivos.

base_sha: "7d102e95bd2aad2428800e0e0935bac5692ab81e"

branch: "implementation/igf-margen-vertical-precio-rangos-065-r1"

effective_from:
  year: 2026
  month: 10

frozen_contracts:
  - "IGF Diario acumulado sigue siendo default."
  - "Forecast permanece intacto."
  - "HG permanece intacto."
  - "CONTROL DE COMPRAS permanece intacto."
  - "064 y 064-R1 permanecen intactos."
  - "063 y 063-R1 permanecen intactos."
  - "Zona Provincia no es captura."
  - "Septiembre 2026 y anteriores permanecen sin overrides."
  - "Fecha anterior al corte permanece cerrada."
  - "H nunca se guarda manualmente."

vertical_ui_contract:
  title: "Margen diario — {planta}"

  orientation: "vertical"

  columns:
    - key: "fecha"
      label: "FECHA"
      excel_column: "A"
    - key: "precio"
      label: "PRECIO"
      excel_column: "C"
    - key: "costo_kg"
      label: "COSTO KG"
      excel_column: "F"
    - key: "flete_kg"
      label: "FLETE KG"
      excel_column: "G"
    - key: "margen_bruto"
      label: "MARGEN BRUTO"
      excel_column: "H"

  requirements:
    - "Una fecha por renglón."
    - "No usar el layout horizontal de 065."
    - "No requerir scroll horizontal en desktop normal."
    - "Permitir scroll vertical dentro del modal."
    - "Header de columnas visible/sticky si es práctico."
    - "Orden cronológico ascendente."
    - "MARGEN BRUTO solo lectura."

  cutoff:
    before:
      - "Precio solo lectura."
      - "Costo solo lectura."
      - "Flete solo lectura."
      - "Margen solo lectura."
    at_or_after:
      - "Precio editable."
      - "Costo editable."
      - "Flete editable."
      - "Margen calculado."

range_ui_contract:
  description: >
    PRECIO, COSTO KG y FLETE KG tienen controles de rango completamente
    independientes. Cambiar las fechas de una variable no debe modificar
    las fechas seleccionadas de las otras dos.

  precio:
    label: "PRECIO (C)"
    fields:
      - "Desde"
      - "Hasta"
      - "Valor"
    actions:
      - "Aplicar al rango"
      - "Restaurar automático en rango"

  costo:
    label: "COSTO KG (F)"
    fields:
      - "Desde"
      - "Hasta"
      - "Valor"
    actions:
      - "Aplicar al rango"
      - "Restaurar automático en rango"

  flete:
    label: "FLETE KG (G)"
    fields:
      - "Desde"
      - "Hasta"
      - "Valor"
    actions:
      - "Aplicar al rango"
      - "Restaurar automático en rango"

  independent_state:
    - "precioDesde/precioHasta son independientes."
    - "costoDesde/costoHasta son independientes."
    - "fleteDesde/fleteHasta son independientes."
    - "No compartir un solo rango entre C/F/G."

  stage_and_save:
    - >
      Aplicar al rango actualiza el borrador visible de todos los días
      incluidos, pero no escribe todavía la DB.
    - >
      Guardar cambios envía todos los cambios pendientes del modal en
      un solo PATCH atómico.
    - >
      Esto permite preparar Precio, Costo y Flete con rangos distintos
      y revisar el resultado antes de guardar.

range_dates_contract:
  includes:
    - "Todos los días calendario del rango presentes en el IGF."
    - "Incluye domingos/festivos si están dentro del rango."
  reason: >
    C/F/G y Margen Bruto existen por fecha calendario; este rango no usa
    la lógica de días hábiles de Corporativos/Operativos.

  validations:
    - "Desde <= Hasta."
    - "Desde y Hasta deben pertenecer al mes mostrado."
    - "Desde debe ser >= corte."
    - "Hasta debe ser >= corte."
    - "No recortar silenciosamente un rango que empiece antes del corte."
    - "Si el mes ya está totalmente detrás del corte, deshabilitar rangos."

range_application_contract:
  same_variable_overlap:
    rule: "La última acción aplicada en el borrador gana."
    example: >
      Costo 05-20 = 12.50 y luego Costo 10-12 = 12.80 produce
      05-09=12.50, 10-12=12.80, 13-20=12.50.

  cross_variable_overlap:
    rule: "No existe interferencia."
    example: >
      Precio 05-10, Costo 08-15 y Flete 05-31 pueden coexistir.

  individual_vs_range:
    - "Edición individual posterior al rango gana para ese día/campo."
    - "Rango aplicado posteriormente gana sobre edición individual del mismo campo/día."
    - "Nunca modificar los otros dos campos."

restore_range_contract:
  precio:
    behavior: >
      Marcar precio=null únicamente para las fechas del rango.
      Preservar Costo y Flete manuales.
  costo:
    behavior: >
      Marcar costo_kg=null únicamente para las fechas del rango.
      Preservar Precio y Flete manuales.
  flete:
    behavior: >
      Marcar flete_kg=null únicamente para las fechas del rango.
      Preservar Precio y Costo manuales.

  general:
    - "Restaurar significa eliminar el override, no guardar el automático como manual."
    - "El borrador debe mostrar inmediatamente el valor automático restaurado."

persistence_contract:
  table: "arr.igf_diario_margen_manual"

  existing_primary_key:
    - "plant_code"
    - "year"
    - "month"
    - "fecha"

  new_column:
    name: "precio"
    type: "NUMERIC(18,6) NULL"

  existing_columns:
    - "costo_kg NUMERIC(18,6) NULL"
    - "flete_kg NUMERIC(18,6) NULL"

  migration:
    - >
      CREATE TABLE IF NOT EXISTS debe incluir precio para instalaciones nuevas.
    - >
      Ejecutar ALTER TABLE arr.igf_diario_margen_manual
      ADD COLUMN IF NOT EXISTS precio NUMERIC(18,6) NULL
      para producción existente.
    - "DDL idempotente."
    - "No modificar filas actuales."
    - "No seed."
    - "No migrar automáticamente Precio desde otra tabla."

  delete_rule: >
    Eliminar la fila únicamente cuando precio, costo_kg y flete_kg
    sean los tres NULL.

manual_semantics:
  fields:
    - "precio"
    - "costo_kg"
    - "flete_kg"

  number:
    - "Override explícito."
    - "0 sigue siendo válido."

  null:
    - "Restaurar automático de ese campo."

  omitted:
    - "Preservar el valor existente de ese campo."

effective_value_contract:
  before_cutoff:
    precio: "Precio automático actual."
    costo: "Costo automático/real actual."
    flete: "Flete automático/real actual."
    manual: "Ignorar los tres overrides."

  at_or_after_cutoff:
    precio: "manual precio ?? precio automático"
    costo: "manual costo ?? costo automático"
    flete: "manual flete ?? flete automático"

  null_semantics:
    - "No usar truthiness."
    - "No usar Number(null) como 0."
    - "Vacío/no disponible sigue siendo null."

margin_contract:
  formula: "MARGEN BRUTO = PRECIO efectivo - COSTO efectivo - FLETE efectivo"

  excel_equivalent: >
    IF(
      AND(ISNUMBER(Cfila),ISNUMBER(Ffila),ISNUMBER(Gfila)),
      Cfila-Ffila-Gfila,
      ""
    )

  requirements:
    - "H no editable."
    - "H no persistido."
    - "H se recalcula en vivo en UI."
    - "Si C/F/G no son todos numéricos, H queda sin valor."

api_contract:
  get:
    method: "GET"
    path: "/api/dashboard/igf-diario-margen-diario"

    day_fields:
      - "fecha"
      - "precio"
      - "precio_automatico"
      - "precio_manual"
      - "costo_kg"
      - "costo_automatico"
      - "costo_manual"
      - "flete_kg"
      - "flete_automatico"
      - "flete_manual"
      - "margen_bruto"
      - "editable"

  patch:
    method: "PATCH"
    path: "/api/dashboard/igf-diario-margen-diario"

    change_shape: |
      {
        fecha,
        precio?: number | null,
        costo_kg?: number | null,
        flete_kg?: number | null
      }

    requirements:
      - "Al menos uno de los tres campos debe estar presente."
      - "Precio/Costo/Flete independientes."
      - "Bulk multi-día existente permanece."
      - "Validar lote completo antes de BEGIN."
      - "Guardar lote completo en una sola transacción."
      - "ROLLBACK completo ante error."
      - "No agregar endpoint separado solo para rangos."
      - >
        El frontend expande el rango en changes[]; backend mantiene una
        sola semántica de escritura por fecha.

security_contract:
  - "dashboardAuthMiddleware."
  - "dashboardBlockGAFinancialKpis."
  - "dashboardBlockGVForbidden."
  - "assertPlantaPermitidaDashboard."
  - "No ampliar permisos."

excel_contract:
  plant_sheet:
    A: "FECHA"
    C: "PRECIO efectivo"
    F: "COSTO KG efectivo"
    G: "FLETE KG efectivo"
    H: "fórmula C-F-G"

  price:
    manual: >
      Si fecha >= corte y existe precio manual, C contiene el número manual.
    automatic: >
      Si no existe manual o fecha < corte, C conserva su resolución
      automática/formula actual.

  cost:
    - "Preservar comportamiento 065."

  freight:
    - "Preservar comportamiento 065."

  margin:
    - "H siempre fórmula."
    - "Nunca copiar margen calculado de Node como valor fijo."

  todas:
    - "Cada hoja usa únicamente overrides de su planta."
    - "Precio manual tampoco puede contaminar otra planta."

  province:
    - "C Provincia deriva de las hojas planta."
    - "F Provincia deriva de las hojas planta."
    - "G Provincia deriva de las hojas planta."
    - "H Provincia permanece C-F-G."
    - "No existe override de Zona Provincia."

accumulated_contract:
  daily:
    - "Aplicar Precio/Costo/Flete efectivos antes de calcular Margen Bruto."

  monthly:
    formula: >
      SUM(MargenBrutoDia * VentaKgDia) /
      SUM(VentaKgDia)

  requirements:
    - "No promedio simple."
    - "Editar Precio debe cambiar Margen acumulado."
    - "Editar Costo debe cambiar Margen acumulado."
    - "Editar Flete debe cambiar Margen acumulado."
    - "Zona Provincia se recalcula."
    - "HG permanece intacto."
    - "Ingresos/resultados derivados se recalculan como en 065."

performance_contract:
  - "Mantener una sola carga mensual de overrides antes del loop de plantas."
  - "Agregar precio al mismo SELECT existente."
  - "No introducir otra consulta específica para precio."
  - "No N+1 por planta."
  - "El modal consulta solo la planta seleccionada como en 065."

format_contract:
  manual_storage_precision: 6
  ui:
    - "Mostrar mínimo 2 decimales."
    - "Permitir hasta 6 decimales sin truncar el valor."
    - "Evitar mostrar precisión basura superior a 6 decimales."
  excel:
    - "Conservar formato visual existente de C/F/G/H."

acceptance_example:
  cutoff: "2026-10-05"

  ranges:
    precio:
      desde: "2026-10-05"
      hasta: "2026-10-10"
      valor: 20.10
    costo:
      desde: "2026-10-08"
      hasta: "2026-10-15"
      valor: 12.55
    flete:
      desde: "2026-10-05"
      hasta: "2026-10-31"
      valor: 1.27

  expected:
    "2026-10-05": "C=20.10; F automático; G=1.27"
    "2026-10-08": "C=20.10; F=12.55; G=1.27"
    "2026-10-11": "C automático; F=12.55; G=1.27"

  margin_example: >
    Para 08/10: H = C - F - G = 20.10 - 12.55 - 1.27 = 6.28.

  note: "No hardcodear estos valores."

mandatory_tests:
  - "065-R1: schema existente agrega precio con ADD COLUMN IF NOT EXISTS."
  - "065-R1: instalación nueva crea precio."
  - "065-R1: DDL repetido es seguro."
  - "065-R1: filas antiguas de costo/flete permanecen intactas."
  - "065-R1: Precio manual desde corte."
  - "065-R1: Precio manual detrás del corte se ignora."
  - "065-R1: precio 0 es explícito."
  - "065-R1: precio null restaura automático."
  - "065-R1: campo precio omitido preserva previo."
  - "065-R1: fila se elimina solo cuando precio/costo/flete son todos NULL."
  - "065-R1: GET devuelve precio automático, efectivo y manual."
  - "065-R1: H usa Precio efectivo."
  - "065-R1: UI usa listado vertical."
  - "065-R1: columnas FECHA/PRECIO/COSTO/FLETE/MARGEN en ese orden."
  - "065-R1: tres controles Desde/Hasta independientes."
  - "065-R1: cambiar rango Precio no cambia rango Costo/Flete."
  - "065-R1: cambiar rango Costo no cambia Precio/Flete."
  - "065-R1: cambiar rango Flete no cambia Precio/Costo."
  - "065-R1: rango incluye todos los días calendario."
  - "065-R1: rango con inicio antes del corte se rechaza."
  - "065-R1: rango Desde > Hasta se rechaza."
  - "065-R1: rango fuera del mes se rechaza."
  - "065-R1: aplicar rango genera cambios para cada fecha correspondiente."
  - "065-R1: overlap misma variable usa última acción."
  - "065-R1: overlap entre variables coexiste."
  - "065-R1: individual después de rango gana."
  - "065-R1: rango después de individual gana."
  - "065-R1: restaurar rango Precio no toca F/G."
  - "065-R1: restaurar rango Costo no toca C/G."
  - "065-R1: restaurar rango Flete no toca C/F."
  - "065-R1: Guardar cambios es bulk atómico."
  - "065-R1: Excel C usa precio manual."
  - "065-R1: Excel F/G preservan 065."
  - "065-R1: Excel H sigue fórmula C-F-G."
  - "065-R1: Provincia C/F/G deriva de plantas."
  - "065-R1: acumulado ponderado cambia con Precio manual."
  - "065-R1: HG no cambia."
  - "065-R1: no N+1 nuevo."
  - "065 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "Excel/regresiones relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-margen-manual.js"
  - "lib/igf-diario-grafica.js"
  - "lib/igf-diario-expense-excel.js"
  - "lib/igf-diario-puebla.js si requiere plumbing de C"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-margen-vertical-precio-rangos-065-r1.test.js"
  - "test/igf-diario-margen-diario-editable-065.test.js"
  - "tests Excel/acumulado afectados"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1.md"

out_of_scope:
  - "Editar Margen Bruto directamente."
  - "Editar Zona Provincia."
  - "Modificar CONTROL DE COMPRAS."
  - "Modificar Forecast."
  - "Modificar HG."
  - "Modificar Corporativos/Operativos."
  - "Modificar distribución 064-R1."
  - "Aplicar rangos antes del corte."
  - "Modificar meses anteriores a octubre 2026."
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
  - "hardcodear plantas/importes/fechas del ejemplo"
  - "guardar H directamente"
  - "compartir un rango único para C/F/G"
  - "recortar silenciosamente rangos antes del corte"
  - "sobrescribir otro campo al aplicar/restaurar un rango"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1.md"