task_id: "IMPL-IGF-DIARIO-REBALANCEO-DIARIO-GASTOS-064-R1"

title: "Distribución diaria editable y rebalanceo de los 7 conceptos de gastos IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Extender IMPL-064 para permitir modificar el importe monetario asignado
  a días hábiles específicos de cualquiera de los siete conceptos de gasto.
  Cuando un día se fija manualmente por encima o por debajo del promedio,
  ese importe queda fijo y el saldo mensual restante se redistribuye
  automáticamente entre los días hábiles posteriores disponibles.
  Los días anteriores no deben cambiar. El importe mensual del concepto
  permanece fijo y la suma de las asignaciones del mes debe coincidir
  exactamente, a centavos, con ese importe mensual.

base_sha: "a3e546fccdf7e89b5e4c3b59b148079587106505"

branch: "implementation/igf-diario-rebalanceo-diario-gastos-064-r1"

effective_from:
  year: 2026
  month: 10
  rule: "Aplicar solamente cuando usesDetailedExpenseLayout(year, month) sea true."

frozen_contracts:
  - "064 permanece como base del desglose mensual."
  - "Septiembre 2026 y anteriores permanecen exactamente legacy."
  - "No cambiar las siete columnas/conceptos definidos en 064."
  - "No cambiar J/K/L/M ni Q/R/S/T/U."
  - "No cambiar el desplazamiento posterior a R."
  - "No cambiar Forecast."
  - "No cambiar Margen/HG."
  - "No cambiar Compras."
  - "No cambiar venta/pronóstico."
  - "No cambiar 063-R1."
  - "No reclasificar valores existentes."
  - "No inventar asignaciones manuales."
  - "El monto mensual de cada concepto sigue siendo la fuente de verdad."

concepts:
  corporate:
    - key: "gasto_corporativo"
      label: "Gasto Corporativo"
      excel_column: "J"
    - key: "inversiones"
      label: "Inversiones"
      excel_column: "K"
    - key: "impuestos_federales"
      label: "Impuestos Federales"
      excel_column: "L"
  operative:
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

core_semantics:
  monthly_amount:
    rule: "El importe mensual del concepto NO cambia por editar días."
  business_days:
    source: >
      Reutilizar exactamente monthBusinessDays(),
      federalRestDays() y cierresEmpresariales existentes.
  holiday:
    assigned_money: 0
    editable: false
  manual_day:
    definition: >
      Día hábil para el que el usuario especificó explícitamente
      un importe monetario.
    persistence: true
  automatic_day:
    definition: >
      Día hábil sin override. Su importe se obtiene del saldo pendiente
      en ese punto del calendario.

sequential_rebalance_contract:
  description: >
    Recorrer los días hábiles cronológicamente. Un override futuro nunca
    debe cambiar un día automático anterior. Cuando se alcanza un día
    manual, se usa exactamente el importe fijado. A partir de ahí el saldo
    restante se distribuye entre los días hábiles posteriores.

  algorithm: |
    remaining_cents = monthly_amount_cents
    remaining_business_days = total_business_days

    for each business_day in chronological order:
      if day has manual override:
        assigned_cents = manual_override_cents
      else:
        assigned_cents =
          rounded_share_of(
            remaining_cents,
            remaining_business_days
          )

      remaining_cents -= assigned_cents
      remaining_business_days -= 1

    final schedule must reconcile exactly to monthly_amount_cents

  critical_properties:
    - "Un día anterior no cambia por crear un override futuro."
    - "Un día manual nunca se recalcula automáticamente."
    - "Un día automático posterior sí cambia cuando cambia el saldo anterior."
    - "La distribución opera en centavos enteros."
    - "Nunca dejar residuos de floating point."
    - "El último día automático disponible absorbe el ajuste de redondeo necesario."
    - "La suma de todos los días hábiles debe ser exactamente igual al importe mensual."
    - "Las asignaciones automáticas no pueden ser negativas."

example_acceptance:
  monthly_amount: 953777.33
  business_days: 27
  initial_daily_average_rounded: 35325.09
  overrides:
    first_three_business_days:
      each: 37412.69
  manual_assigned: 112238.07
  remaining: 841539.26
  remaining_days: 24
  displayed_remaining_average: 35064.14
  requirements:
    - "Los tres días fijados permanecen en 37,412.69."
    - "Los días anteriores a un override posterior no se modifican."
    - "Los siguientes días automáticos quedan alrededor de 35,064.14."
    - >
      El último automático puede diferir algunos centavos para que la suma
      final sea exactamente 953,777.33.
    - "No hardcodear estos importes en producto."

persistence_contract:
  table: "arr.igf_diario_gastos_distribucion_manual"
  key:
    - "plant_code"
    - "year"
    - "month"
    - "concepto"
    - "fecha"
  columns:
    - "importe NUMERIC(18,2) NOT NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"
  requirements:
    - "CREATE TABLE IF NOT EXISTS."
    - "No insertar valores automáticos."
    - "Persistir únicamente overrides explícitos."
    - "0 es un override válido."
    - "Restaurar promedio elimina el override de ese día."
    - "No crear filas para días inhábiles."
    - "No crear filas antes de octubre 2026."
    - "No modificar arr.igf_diario_gastos_desglose."
    - "No modificar históricos."

concept_validation:
  allowed:
    - "gasto_corporativo"
    - "inversiones"
    - "impuestos_federales"
    - "presupuesto_nomina_gastos"
    - "presupuesto_imss_sua"
    - "extraordinarios"
    - "provisiones_planta"
  forbidden:
    - "Conceptos arbitrarios enviados por cliente."

schedule_validation:
  - "El concepto mensual debe existir dentro de un desglose activo."
  - "El día debe pertenecer al mismo year/month."
  - "El día debe ser hábil según el calendario IGF."
  - "importe >= 0."
  - "0 es válido."
  - "NaN/Infinity inválidos."
  - "Máximo dos decimales monetarios o normalización explícita a centavos."
  - >
    Después de aplicar el nuevo override, el schedule completo debe seguir
    pudiendo conciliar el monto mensual sin producir días negativos.
  - >
    Si no existe ningún día automático posterior capaz de absorber la
    diferencia, el override solo es válido si el schedule todavía cierra
    exactamente al monto mensual.

last_day_rule:
  example: >
    Si el último día hábil se fija y no existe ningún día automático
    posterior, ese importe debe ser exactamente el saldo pendiente.
  error: >
    "No hay días hábiles posteriores para redistribuir esta diferencia."

monthly_amount_change_contract:
  rule: >
    Si posteriormente se modifica el monto mensual de un concepto en el
    modal 064, conservar sus overrides diarios existentes y reconstruir
    automáticamente todos los días no fijados.
  validation:
    - >
      Antes de guardar el nuevo monto mensual, comprobar que sus overrides
      diarios siguen formando un schedule válido.
    - >
      Si los importes fijados hacen imposible distribuir el nuevo total
      sin valores negativos o sin residuo, rechazar el cambio y explicar
      que deben ajustarse/restaurarse días fijados.
  transaction:
    - >
      No guardar un nuevo monto mensual incompatible con la distribución
      diaria existente.

api_contract:
  get:
    method: "GET"
    path: "/api/dashboard/igf-diario-gastos-distribucion"
    params:
      - "year"
      - "month"
      - "plant_code"
      - "concepto"
    response:
      - "monthly_amount"
      - "business_days"
      - "manual_assigned"
      - "remaining_amount"
      - "remaining_business_days"
      - "remaining_average"
      - "days"
  day_response:
    fields:
      - "fecha"
      - "habil"
      - "importe_asignado"
      - "manual"
      - "editable"
  patch:
    method: "PATCH"
    path: "/api/dashboard/igf-diario-gastos-distribucion"
    body:
      - "year"
      - "month"
      - "plant_code"
      - "concepto"
      - "fecha"
      - "importe: número o null"
    semantics:
      - "Número incluyendo 0 = fijar ese día."
      - "null = Restaurar promedio, eliminando el override."
      - "Después del cambio devolver schedule recalculado completo."
  security:
    - "dashboardAuthMiddleware."
    - "dashboardBlockGAFinancialKpis."
    - "dashboardBlockGVForbidden."
    - "assertPlantaPermitidaDashboard en escritura."
    - "No ampliar permisos."

ui_contract:
  parent_modal:
    rule: >
      Conservar los modales 064 de Corporativos y Operativos para editar
      los importes mensuales.
    addition:
      - "Cada concepto tiene acción Distribución diaria."
      - "No volver a mostrar Manual/Auto en la tabla principal."
  daily_view:
    header:
      - "Nombre del concepto."
      - "Monto mensual."
      - "Promedio inicial del mes."
      - "Importe ya fijado/manual."
      - "Saldo pendiente."
      - "Días hábiles restantes/disponibles."
      - "Promedio restante actual."
    table:
      columns:
        - "Fecha"
        - "Importe asignado"
        - "Acción"
    behavior:
      - "Día inhábil muestra 0 y no se puede editar."
      - "Día automático muestra importe calculado."
      - "Día fijado muestra el importe capturado."
      - "Click/Editar permite escribir importe monetario del día."
      - "Guardar recalcula inmediatamente los días posteriores."
      - "Restaurar promedio elimina el override y recalcula días posteriores."
      - "No cambiar días anteriores como efecto de un override futuro."
      - "Mostrar errores de conciliación claramente."
      - "No necesita recargar toda la página."
  wording:
    preferred:
      - "Distribución diaria"
      - "Editar importe"
      - "Restaurar promedio"
      - "Promedio restante"
      - "Saldo pendiente"
    avoid:
      - "Manual/Auto debajo del total en la tabla principal."

excel_daily_contract:
  from_2026_10:
    source: "schedule diario calculado para cada concepto."
    formula_semantics: >
      componente_dia_$kg =
      importe_monetario_asignado_dia / Venta_KG_dia
    business_day_with_sales:
      result: "assigned_money / B"
    business_day_without_sales:
      result: "blank"
      note: >
        Aunque la celda $/kg quede blank, el importe monetario asignado
        al día sigue existiendo para semana/mes.
    holiday:
      result: 0
  columns:
    J: "Gasto Corporativo"
    K: "Inversiones"
    L: "Impuestos Federales"
    Q: "Presupuesto Nómina/Gastos"
    R: "Presupuesto IMSS/SUA"
    S: "Extraordinarios"
    T: "Provisiones de la Planta"

excel_weekly_contract:
  old_064_behavior: >
    (monto mensual / habiles mes) * habiles semana / B semana.
  new_064_r1_behavior: >
    suma(importes monetarios asignados a los días hábiles de esa semana)
    / Venta KG total de esa semana.
  rules:
    - "Usar schedule real incluyendo overrides."
    - "No promediar celdas $/kg."
    - "Un día hábil B=0 conserva su dinero en el numerador semanal."
    - "Un inhábil aporta 0."
    - "Si B semanal <= 0, blank."
    - "M semana = J+K+L."
    - "U semana = Q+R+S+T."

excel_month_contract:
  rule: >
    TOTAL MES por concepto sigue siendo importe mensual del concepto /
    Venta KG TOTAL MES.
  reason: >
    El monto mensual no cambia por su distribución diaria.
  totals:
    - "M TOTAL = J+K+L."
    - "U TOTAL = Q+R+S+T."

province_contract:
  daily:
    - >
      Provincia debe seguir agregando cada concepto desde las hojas planta
      ponderado por Venta KG.
  weekly:
    - >
      El valor semanal Provincia debe derivarse de los valores semanales
      de las hojas planta / sus kilos, para reflejar los schedules reales
      y sus overrides diarios.
    - "No reconstruir semana Provincia suponiendo reparto uniforme."
  monthly:
    - "TOTAL MES conserva agregación de importes mensuales por concepto."
  fallback:
    - "Plantas sin desglose siguen la regla 064 agregada."
    - "No inventar componentes faltantes."

all_download_contract:
  individual:
    - "Usar schedule de la planta."
  todas:
    - "Cada planta usa su propio schedule/overrides."
    - "Provincia refleja las hojas individuales."
  historical:
    - "Septiembre y anteriores continúan legacy sin ninguna distribución diaria editable."

rounding_contract:
  currency_storage: "centavos exactos"
  display: "2 decimales"
  requirements:
    - "No usar acumulación binaria de floating point."
    - "La suma de assigned_cents debe ser exactamente monthly_amount_cents."
    - "El último día automático puede absorber diferencia de centavos."
    - "No alterar un importe manual para cuadrar."

recommended_helpers:
  - "buildExpenseDailySchedule"
  - "validateExpenseDailySchedule"
  - "sumAssignedForWeek"
  - "findManualOverride"
  note: "Los nombres pueden variar, pero la lógica debe estar centralizada."

recommended_files:
  - "lib/igf-diario-gastos-distribucion.js nuevo"
  - "lib/igf-diario-gastos-desglose.js"
  - "lib/igf-diario-expense-excel.js"
  - "lib/igf-diario-puebla.js si integración lo requiere"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-rebalanceo-diario-gastos-064-r1.test.js"
  - "tests 064 existentes"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-REBALANCEO-DIARIO-GASTOS-064-R1.md"

mandatory_tests:
  - "Gate: septiembre no usa distribución diaria."
  - "Octubre sí usa distribución diaria."
  - "DDL idempotente y sin datos iniciales."
  - "Solo siete conceptos válidos."
  - "Inhábil no permite override."
  - "0 manual es válido."
  - "null elimina override."
  - "Día anterior automático no cambia por override futuro."
  - "Día manual conserva exactamente su importe."
  - "Override mayor reduce promedio de días posteriores."
  - "Override menor aumenta promedio de días posteriores."
  - "Ejemplo 953777.33 / 27."
  - "Tres días a 37412.69."
  - "Saldo 841539.26."
  - "Promedio restante visible aproximadamente 35064.14."
  - "Suma final exacta = 953777.33."
  - "Último automático absorbe ajuste de centavos."
  - "Ningún automático negativo."
  - "Override imposible se rechaza."
  - "Último día manual incompatible se rechaza."
  - "Restaurar promedio reconstruye schedule."
  - "Cambio de monto mensual conserva overrides válidos."
  - "Cambio mensual incompatible se rechaza."
  - "Daily Excel usa assigned_money/B."
  - "Hábil B=0 deja $/kg blank pero conserva dinero semanal."
  - "Semana = suma dinero asignado / B semanal."
  - "TOTAL MES = monto mensual/B total."
  - "M semana/mes = J+K+L."
  - "U semana/mes = Q+R+S+T."
  - "Provincia semanal refleja schedules de plantas."
  - "Todas usa overrides independientes."
  - "064 modales mensuales siguen funcionando."
  - "064 fallback sin desglose sigue funcionando."
  - "064 layout octubre sigue intacto."
  - "Septiembre layout legacy intacto."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

acceptance_criteria:
  - >
    Para Gasto Corporativo 953777.33 / 27, el promedio inicial mostrado es
    aproximadamente 35325.09.
  - >
    Si los primeros 3 hábiles se fijan en 37412.69, permanecen exactamente
    en ese valor.
  - "Saldo restante = 841539.26."
  - "Días restantes = 24."
  - "Promedio restante mostrado ≈ 35064.14."
  - "Los días posteriores se rebalancean."
  - "Los días anteriores no cambian."
  - "La suma mensual final es exactamente 953777.33."
  - "La misma lógica funciona independientemente para los siete conceptos."
  - "Excel refleja la distribución real."
  - "Semana refleja importes asignados reales."
  - "TOTAL MES conserva importe mensual."
  - "Forecast queda intacto."
  - "Septiembre y anteriores quedan intactos."

out_of_scope:
  - "Cambiar el monto mensual automáticamente por editar días."
  - "Crear pagos bancarios."
  - "Modificar Forecast."
  - "Modificar Margen/HG."
  - "Modificar ventas."
  - "Modificar Compras."
  - "Modificar históricos antes de octubre."
  - "Merge a main."
  - "Deploy."
  - "Writes productivos durante implementación."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

forbidden_actions:
  - "git push origin main"
  - "merge a main"
  - "deploy"
  - "hardcodear importes del ejemplo"
  - "hardcodear plantas"
  - "repartir diferencias hacia días anteriores"
  - "modificar importes manuales para cuadrar"
  - "usar floats sin control de centavos"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-REBALANCEO-DIARIO-GASTOS-064-R1.md"