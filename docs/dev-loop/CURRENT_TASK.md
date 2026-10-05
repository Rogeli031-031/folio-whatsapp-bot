task_id: "IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064"

title: "Desglosar Corporativos y Operativos desde octubre 2026 en dashboard e IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Desde octubre de 2026 en adelante, reemplazar la edición agregada visual
  de CORPORATIVOS y OPERATIVOS por un desglose mensual por conceptos.
  El dashboard seguirá mostrando únicamente el total de CORPORATIVOS y
  OPERATIVOS por planta, pero el total será clickeable y abrirá un modal
  para editar sus componentes. El Excel IGF Diario deberá distribuir cada
  componente por día hábil y por Venta KG, calcular cierres semanales con
  importe monetario asignado / Venta KG semanal, incorporar una nueva
  columna R para el bloque operativo y desplazar correctamente todas las
  columnas posteriores. Septiembre 2026 y meses anteriores deben conservar
  exactamente el comportamiento/layout legacy actual.

base_sha: "7da3851c7bee0a629a2348478b3a1408985e5945"

branch: "implementation/igf-diario-desglose-gastos-064"

effective_from:
  year: 2026
  month: 10
  rule: "year > 2026 OR (year == 2026 AND month >= 10)"

historical_contract:
  before_2026_10:
    - "No aplicar desglose."
    - "No insertar la nueva columna R."
    - "Mantener M como Corporativos agregado."
    - "Mantener T como Operativos agregado."
    - "Mantener X/Y, AA, AC, AE/AF, AH/AI y carry columns en posiciones actuales."
    - "Mantener UI actual de 062 incluyendo edición agregada y Manual/Auto."
    - "Mantener fórmulas legacy actuales."
    - "Mantener Excel histórico compatible con ARR."
  from_2026_10:
    - "Activar nuevo layout y nuevo editor por conceptos."
    - "No mostrar etiquetas Manual ni Auto bajo CORPORATIVOS/OPERATIVOS."

corporativos_contract:
  concepts:
    - key: "gasto_corporativo"
      label: "Gasto Corporativo"
      excel_column: "J"
    - key: "inversiones"
      label: "Inversiones"
      excel_column: "K"
    - key: "impuestos_federales"
      label: "Impuestos Federales"
      excel_column: "L"
  total:
    label: "CORPORATIVOS"
    excel_column: "M"
    formula: "Gasto Corporativo + Inversiones + Impuestos Federales"
  warning:
    - >
      "Impuestos Federales" de este desglose NO reemplaza ni modifica la
      columna financiera existente "Impuestos" del mini IGF Forecast.
      Son conceptos distintos.

operativos_contract:
  concepts:
    - key: "presupuesto_nomina_gastos"
      label: "Presupuesto Nómina/Gastos"
      excel_column: "Q"
    - key: "presupuesto_imss_sua"
      label: "Presupuesto IMSS/SUA"
      excel_column: "R"
    - key: "extraordinarios"
      label: "Extraordinarios"
      excel_column: "S"
    - key: "provisiones_planta"
      label: "Provisiones de la Planta"
      excel_column: "T"
  total:
    label: "OPERATIVOS"
    excel_column: "U"
    formula: >
      Presupuesto Nómina/Gastos + Presupuesto IMSS/SUA +
      Extraordinarios + Provisiones de la Planta

dashboard_ui_contract:
  mode: "IGF Diario acumulado"
  from_2026_10:
    - "La tabla sigue mostrando una sola columna CORPORATIVOS y una sola OPERATIVOS."
    - "El importe total de cada planta es clickeable."
    - "Zona Provincia no es editable."
    - "Eliminar visualmente Manual y Auto para estos dos campos."
    - "No usar edición inline de agregado en octubre+."
  corporativos_modal:
    fields:
      - "Gasto Corporativo"
      - "Inversiones"
      - "Impuestos Federales"
    live_total: true
    actions:
      - "Guardar"
      - "Cancelar"
  operativos_modal:
    fields:
      - "Presupuesto Nómina/Gastos"
      - "Presupuesto IMSS/SUA"
      - "Extraordinarios"
      - "Provisiones de la Planta"
    live_total: true
    actions:
      - "Guardar"
      - "Cancelar"
  validation:
    - "Todos los campos del grupo deben ser numéricos al guardar."
    - "0 es un valor válido."
    - "No usar truthiness."
    - "No permitir NaN/Infinity."
    - "Máximo dos decimales monetarios o normalización explícita a centavos."
    - "Guardar el grupo completo de forma atómica."
  after_save:
    - "Actualizar el total inmediatamente."
    - "Recalcular GASTO."
    - "Recalcular Util. Operación - Importe."
    - "Recalcular Resultado Final - Importe."
    - "Recalcular Zona Provincia."
    - "INGRESO no cambia."
    - "Margen no cambia."
    - "HG no cambia."
    - "Com. y Desc. no cambia."
    - "Impuestos financiero existente no cambia."

legacy_fallback_contract:
  reason: >
    Octubre ya contiene valores agregados de 062 y no existe evidencia
    para repartirlos retroactivamente entre conceptos.
  rule:
    - >
      Si un grupo todavía no tiene desglose completo, usar el total agregado
      actual de 062 como total efectivo.
    - "No inventar clasificación."
    - "No repartir automáticamente el total entre conceptos."
    - "No copiar todo el total a un concepto."
  modal_when_no_breakdown:
    - "Mostrar el Total actual sin desglose."
    - "Los conceptos se capturan explícitamente por el usuario."
    - "Al guardar todos los conceptos, el desglose se vuelve la fuente del total."
  independence:
    - >
      CORPORATIVOS y OPERATIVOS son independientes: una planta puede tener
      Corporativos desglosados y Operativos aún en fallback agregado.

persistence_contract:
  preferred_design: >
    Crear una tabla separada para no alterar semántica histórica de
    arr.igf_diario_gastos_manual.
  table: "arr.igf_diario_gastos_desglose"
  key:
    - "plant_code"
    - "year"
    - "month"
  columns:
    - "gasto_corporativo NUMERIC(18,2) NULL"
    - "inversiones NUMERIC(18,2) NULL"
    - "impuestos_federales NUMERIC(18,2) NULL"
    - "presupuesto_nomina_gastos NUMERIC(18,2) NULL"
    - "presupuesto_imss_sua NUMERIC(18,2) NULL"
    - "extraordinarios NUMERIC(18,2) NULL"
    - "provisiones_planta NUMERIC(18,2) NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"
  requirements:
    - "CREATE TABLE IF NOT EXISTS / creación idempotente."
    - "No insertar datos iniciales."
    - "No migrar ni inventar desgloses."
    - "No crear registros para septiembre 2026 o anteriores."
  group_active:
    corporativos: >
      Activo únicamente si los 3 campos corporativos son numéricos
      incluyendo cero.
    operativos: >
      Activo únicamente si los 4 campos operativos son numéricos
      incluyendo cero.
  partial_write:
    - "No permitir guardar grupos parciales desde API/UI."
  aggregate_sync:
    required: true
    behavior: >
      Al guardar un desglose completo, sincronizar también el total del
      grupo correspondiente en arr.igf_diario_gastos_manual para mantener
      compatibilidad con consumidores existentes.
    corporate_total: >
      gasto_corporativo + inversiones + impuestos_federales
    operative_total: >
      presupuesto_nomina_gastos + presupuesto_imss_sua +
      extraordinarios + provisiones_planta
    transaction:
      - "Guardar desglose y sincronizar agregado en una misma transacción."
      - "Si falla una parte, rollback."
      - "Preservar el otro grupo no editado."

api_contract:
  recommended:
    get:
      method: "GET"
      path: "/api/dashboard/igf-diario-gastos-desglose"
      params:
        - "year"
        - "month"
    patch:
      method: "PATCH"
      path: "/api/dashboard/igf-diario-gastos-desglose"
  get_response:
    required:
      - "plant_code"
      - "year"
      - "month"
      - "componentes"
      - "corporativos_desglosados"
      - "operativos_desglosados"
      - "corporativos_total_desglose"
      - "operativos_total_desglose"
  patch_modes:
    - "group=corporativos con los 3 conceptos completos."
    - "group=operativos con los 4 conceptos completos."
  availability:
    - "PATCH rechaza periodos anteriores a 2026-10."
    - "UI no llama este endpoint para periodos legacy."
  security:
    - "dashboardAuthMiddleware."
    - "Mismos bloqueos financieros de IGF."
    - "assertPlantaPermitidaDashboard en escritura."
    - "No ampliar permisos."
  money:
    - "Sumar importes usando semántica estable de centavos/NUMERIC."
    - "Evitar errores de coma flotante visibles en totales."

effective_total_contract:
  from_2026_10:
    corporativos: >
      Si existe desglose corporativo completo, usar suma de sus 3 conceptos.
      Si no, usar effective corporativos de 062 (manual ?? automático).
    operativos: >
      Si existe desglose operativo completo, usar suma de sus 4 conceptos.
      Si no, usar effective operativos de 062 (manual ?? automático).
  before_2026_10:
    - "Usar exactamente 062 legacy."

excel_layout_from_2026_10:
  row3_monthly_amounts:
    J3: "Gasto Corporativo mensual si desglose activo; blank si no."
    K3: "Inversiones mensual si desglose activo; blank si no."
    L3: "Impuestos Federales mensual si desglose activo; blank si no."
    M3: "Total Corporativos efectivo."
    Q3: "Presupuesto Nómina/Gastos mensual si desglose activo; blank si no."
    R3: "Presupuesto IMSS/SUA mensual si desglose activo; blank si no."
    S3: "Extraordinarios mensual si desglose activo; blank si no."
    T3: "Provisiones de la Planta mensual si desglose activo; blank si no."
    U3: "Total Operativos efectivo."
  headers_row5:
    J5: "Gasto Corporativo"
    K5: "Inversiones"
    L5: "Impuestos Federales"
    M5: "IMPORTE"
    Q5: "Presupuesto Nómina/Gastos"
    R5: "Presupuesto IMSS/SUA"
    S5: "Extraordinarios"
    T5: "Provisiones de la Planta"
    U5: "IMPORTE"
  structural_rule:
    - "Insertar conceptualmente una nueva columna R para octubre+."
    - "Todo lo que actualmente está desde R hacia la derecha se desplaza una columna."
    - "No modificar físicamente layout legacy de meses anteriores."

excel_column_map_from_2026_10:
  A: "FECHA"
  B: "VENTA KG"
  C: "PRECIO"
  D: "INGRESO"
  E: "separador"
  F: "COSTO KG"
  G: "FLETE KG"
  H: "MARGEN BRUTO"
  I: "separador"
  J: "Gasto Corporativo $/kg"
  K: "Inversiones $/kg"
  L: "Impuestos Federales $/kg"
  M: "Total Corporativos $/kg"
  N: "separador"
  O: "MARGEN NETO"
  P: "separador"
  Q: "Presupuesto Nómina/Gastos $/kg"
  R: "Presupuesto IMSS/SUA $/kg"
  S: "Extraordinarios $/kg"
  T: "Provisiones de la Planta $/kg"
  U: "Total Operativos $/kg"
  V: "separador"
  W: "SOBRANTE OPERACIÓN"
  X: "separador"
  Y: "IMPORTE HG"
  Z: "IMPORTE HG POR KG"
  AA: "separador"
  AB: "SOBRANTE OPERACIÓN post-HG"
  AC: "separador"
  AD: "C&D"
  AE: "separador"
  AF: "RESULTADO POR KG"
  AG: "RESULTADO"
  AH: "separador"
  AI: "COMENTARIO DEL DIA"
  AJ: "VENTAS"
  AK: "carry costo hidden"
  AL: "carry flete hidden"

excel_core_formulas_from_2026_10:
  margin_net:
    column: "O"
    formula_semantics: "O = H - M"
  sobra_operacion:
    column: "W"
    formula_semantics: "W = O - U"
  post_hg:
    column: "AB"
    formula_semantics: "AB = W - Z"
  resultado_kg:
    column: "AF"
    formula_semantics: "AF = AB + AD"
  resultado_importe:
    column: "AG"
    formula_semantics: "AG = AF * B"
  requirements:
    - "Actualizar todas las referencias después del desplazamiento."
    - "Actualizar formatos, widths, headers, hidden carry columns e insights."
    - "AI/AJ sustituyen AH/AI para comentarios/ventas desde octubre+."
    - "AK/AL sustituyen AJ/AK para carry hidden desde octubre+."

business_day_contract:
  source: >
    Usar exclusivamente monthBusinessDays/federalRestDays/cierresEmpresariales
    existentes. No crear otro calendario.
  habiles: "Número de días hábiles calculado por el IGF Diario actual."
  inhabil:
    - "Domingo/festivo/cierre marcado inhabil por el calendario existente."
    - "Los 7 conceptos deben escribir número 0 explícito."
    - "No dejar blank en los conceptos para un inhabil."
  business_day_with_sales:
    component_formula: >
      (importe mensual del concepto / días hábiles del mes) / Venta KG del día.
  business_day_without_valid_sales:
    - >
      Si B no es numérico o B=0, la celda diaria $/kg queda blank para evitar
      división inválida.
    - >
      El importe monetario asignado a ese día hábil NO desaparece del cierre
      semanal/mensual.

daily_excel_contract:
  corporate_active:
    J: "($J$3 / habiles) / B"
    K: "($K$3 / habiles) / B"
    L: "($L$3 / habiles) / B"
    M: "SUM(J:L)"
  operative_active:
    Q: "($Q$3 / habiles) / B"
    R: "($R$3 / habiles) / B"
    S: "($S$3 / habiles) / B"
    T: "($T$3 / habiles) / B"
    U: "SUM(Q:T)"
  fallback_without_breakdown:
    corporate: >
      J/K/L quedan sin datos de desglose; M conserva la lógica agregada
      efectiva de 062 sin inventar conceptos.
    operative: >
      Q/R/S/T quedan sin datos de desglose; U conserva la lógica agregada
      efectiva de 062 sin inventar conceptos.

weekly_excel_contract:
  per_component_formula: >
    ((importe_mensual / habiles_mes) * cantidad_habiles_de_la_semana)
    / Venta_KG_total_semana
  requirements:
    - "Usar días hábiles reales de esa semana."
    - "No usar simple promedio de celdas diarias."
    - "No perder asignación por un día hábil que tenga B=0/blank."
    - "Si Venta KG semanal es 0/no numérica, resultado blank."
  totals:
    M: "J + K + L"
    U: "Q + R + S + T"

monthly_total_contract:
  per_component_formula: >
    importe_mensual_del_concepto / Venta_KG_TOTAL_MES
  requirements:
    - "No usar fila fija para TOTAL MES."
    - "TOTAL MES se localiza según layout dinámico existente."
    - "Si Venta KG TOTAL MES es 0/no numérica, resultado blank."
  totals:
    M: "J + K + L"
    U: "Q + R + S + T"

province_contract:
  from_2026_10:
    - "IGF Diario Provincia usa el mismo layout nuevo."
    - "J3/K3/L3 suman los componentes disponibles de las hojas planta."
    - "Q3/R3/S3/T3 suman los componentes disponibles de las hojas planta."
    - "M3 suma los totales Corporativos efectivos de todas las plantas."
    - "U3 suma los totales Operativos efectivos de todas las plantas."
    - >
      Los componentes diarios/semanales/mensuales de Provincia se ponderan
      por Venta KG de las hojas individuales.
    - "M y U Provincia incluyen también plantas todavía en fallback agregado."
    - >
      Durante transición puede ocurrir que J+K+L no explique todo M si
      existen plantas aún sin desglose; NO inventar la clasificación faltante.
    - >
      Durante transición puede ocurrir que Q+R+S+T no explique todo U si
      existen plantas aún sin desglose.
    - "Zona Provincia no se captura manualmente."
  before_2026_10:
    - "Layout Provincia legacy exacto."

download_contract:
  individual:
    - "Desde octubre, aplicar nuevo layout a IGF Diario {Planta}."
    - "Antes de octubre, layout legacy."
  todas:
    - "Desde octubre, cada hoja planta usa su propio desglose/fallback."
    - "IGF Diario Provincia usa el nuevo layout."
    - "Antes de octubre, Todas conserva layout legacy completo."
  no_hardcode:
    - "No hardcodear Puebla."
    - "No hardcodear importes."
    - "Aplicar a todas las plantas Provincia."

forecast_contract:
  - "Forecast queda intacto."
  - "No usar desglose para cambiar Margen/HG/Comisiones/Impuestos financieros."
  - "IGF Diario acumulado sigue siendo default."
  - "063/063-R1 permanecen intactos."

schema_safety:
  - "No borrar arr.igf_diario_gastos_manual."
  - "No migrar datos históricos."
  - "No cambiar PKs históricas."
  - "No writes productivos durante implementación."
  - "DDL nuevo debe ser idempotente."

mandatory_tests:
  - "064: tabla de desglose se crea idempotentemente."
  - "064: PATCH corporativos exige 3 campos completos."
  - "064: PATCH operativos exige 4 campos completos."
  - "064: 0 es valor válido en cualquier concepto."
  - "064: guardado sincroniza agregado corporativos en 062."
  - "064: guardado sincroniza agregado operativos en 062."
  - "064: guardado de un grupo no altera el otro."
  - "064: rollback atómico si falla sync."
  - "064: periodos < 2026-10 no usan desglose."
  - "064: septiembre 2026 conserva columnas legacy."
  - "064: septiembre conserva M/T."
  - "064: septiembre conserva X/Y, AA, AC, AE/AF, AH/AI."
  - "064: octubre usa J/K/L/M para corporativos."
  - "064: octubre usa Q/R/S/T/U para operativos."
  - "064: nueva R desplaza correctamente todas las columnas posteriores."
  - "064: día hábil divide componente/habiles/B."
  - "064: inhabil escribe 0 en los 7 conceptos."
  - "064: día hábil con B=0 queda blank en $/kg."
  - "064: cierre semanal conserva dinero asignado de todos los hábiles."
  - "064: cierre semanal divide dinero semanal / B semanal."
  - "064: TOTAL MES componente = monto mensual / B TOTAL MES."
  - "064: M = J+K+L cuando corporativos desglosados."
  - "064: U = Q+R+S+T cuando operativos desglosados."
  - "064: O = H-M."
  - "064: W = O-U."
  - "064: AB = W-Z."
  - "064: AF = AB+AD."
  - "064: AG = AF*B."
  - "064: comentarios están en AI y ventas en AJ desde octubre."
  - "064: carry hidden está en AK/AL desde octubre."
  - "064: fallback agregado no inventa componentes."
  - "064: modal corporativos muestra 3 conceptos."
  - "064: modal operativos muestra 4 conceptos."
  - "064: no aparecen Manual/Auto en octubre+."
  - "064: Manual/Auto legacy sigue disponible antes de octubre."
  - "064: dashboard total = suma de desglose."
  - "064: Zona Provincia recalcula."
  - "064: Provincia nuevo layout."
  - "064: descarga individual."
  - "064: descarga Todas."
  - "064: septiembre descarga histórica sin cambio."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "053A/053A-R1/053A-R2/054-R3 relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-gastos-desglose.js nuevo"
  - "lib/igf-diario-gastos-manuales.js"
  - "lib/igf-diario-puebla.js"
  - "lib/dashboard-arr-forecast.js solo donde sea necesario para export/resolución"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-desglose-gastos-064.test.js"
  - "tests Excel IGF Diario relevantes"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064.md"

out_of_scope:
  - "Modificar Forecast matemático."
  - "Modificar Margen/HG."
  - "Modificar venta/pronóstico."
  - "Modificar Compras."
  - "Modificar tarifa día 1."
  - "Modificar Action Register."
  - "Reclasificar automáticamente importes existentes."
  - "Modificar históricos anteriores a octubre 2026."
  - "Insertar datos de desglose productivos."
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
  - "writes de datos productivos"
  - "inventar distribución de gastos existentes"
  - "hardcodear plantas/importes"
  - "autoautorizar G4"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064.md"